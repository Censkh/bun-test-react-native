import { mock } from "bun:test";

const workerThreads = require("node:worker_threads");

// Undici 8 uses Node's worker_threads.markAsUncloneable when constructing its
// Web API classes. Bun does not expose that helper, but tests only need the
// objects to exist in-process, so a no-op keeps npm Undici loadable under Bun.
workerThreads.markAsUncloneable ??= () => {};

const realUndici = require("undici/index.js");

type FetchInit = RequestInit & { dispatcher?: unknown };

const isRequestLike = (input: RequestInfo | URL): input is Request =>
  typeof input === "object" && input !== null && "headers" in input && "url" in input;

class RequestCompat extends realUndici.Request {
  constructor(input: RequestInfo | URL, init?: FetchInit) {
    if (isRequestLike(input) && !(input instanceof realUndici.Request) && !(input instanceof URL)) {
      const source = input as Request;
      super(source.url, {
        body: init?.body ?? (source.method === "GET" || source.method === "HEAD" ? undefined : source.body),
        cache: init?.cache ?? source.cache,
        credentials: init?.credentials ?? source.credentials,
        duplex: "half",
        headers: init?.headers ?? source.headers,
        integrity: init?.integrity ?? source.integrity,
        keepalive: init?.keepalive ?? source.keepalive,
        method: init?.method ?? source.method,
        mode: init?.mode ?? source.mode,
        redirect: init?.redirect ?? source.redirect,
        referrer: init?.referrer ?? source.referrer,
        referrerPolicy: init?.referrerPolicy ?? source.referrerPolicy,
        signal: init?.signal ?? source.signal,
        ...init,
      });
      return;
    }

    super(input, init);
  }
}

const fetch = (async (input: RequestInfo | URL, init?: FetchInit) => {
  // Miniflare relies on npm Undici's `dispatcher` option to inject internal
  // `MF-*` headers into requests sent to workerd. Bun's native `undici` shim
  // exposes the dispatcher-shaped API but does not run that dispatch path, so
  // Wrangler's local proxy never receives `request.cf.hostMetadata`. We also
  // avoid npm `undici.fetch()` for HTTP(S) because its web response stream can
  // stall under Bun while workerd has pending `ctx.waitUntil()` work. The lower
  // level `undici.request()` honours dispatchers and its Node stream completes,
  // so this wrapper buffers that stream back into an Undici `Response`.
  const headers = new realUndici.Headers(init?.headers ?? (isRequestLike(input) ? input.headers : undefined));
  if (!headers.has("accept-encoding")) {
    headers.set("accept-encoding", "identity");
  }

  const requestInput =
    isRequestLike(input) && !(input instanceof realUndici.Request)
      ? new RequestCompat(input, { ...init, headers })
      : input;

  const request: {
    body?: BodyInit | null;
    method: string;
    signal?: AbortSignal | null;
    url: string;
  } = (
    requestInput instanceof realUndici.Request
      ? requestInput
      : new RequestCompat(requestInput as RequestInfo | URL, { ...init, headers })
  ) as {
    body?: BodyInit | null;
    method: string;
    signal?: AbortSignal | null;
    url: string;
  };
  const protocol = new URL(request.url).protocol;
  if (protocol !== "http:" && protocol !== "https:") {
    return realUndici.fetch(request as RequestInfo, {
      ...init,
      headers,
    });
  }

  const response = await realUndici.request(request.url, {
    body: request.body,
    dispatcher: init?.dispatcher,
    headers: Object.fromEntries(headers.entries()),
    method: request.method,
    signal: request.signal,
  });
  const chunks: Uint8Array[] = [];
  for await (const chunk of response.body) {
    chunks.push(chunk);
  }

  return new realUndici.Response(Buffer.concat(chunks), {
    headers: response.headers,
    status: response.statusCode,
    statusText: response.statusText,
  });
}) as unknown as typeof globalThis.fetch;

const undici = {
  ...realUndici,
  fetch,
  Request: RequestCompat,
};

// Bun resolves bare `undici` to its native compatibility module. Miniflare's
// local proxy depends on npm Undici's `dispatcher` option to forward internal
// Cloudflare metadata such as `request.cf.hostMetadata` into workerd.
mock.module("undici", () => undici);

globalThis.fetch = fetch;
globalThis.Headers = realUndici.Headers;
globalThis.Request = RequestCompat as typeof globalThis.Request;
globalThis.Response = realUndici.Response;
globalThis.FormData = realUndici.FormData;
