import { describe, expect, test } from "bun:test";
import path from "node:path";
import { Api, FetchRequestBackend } from "api-def";
import { Request as UndiciRequest } from "undici";
import { createTestHarness } from "wrangler";

const timeout = (message: string, ms = 1_000) =>
  new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(message)), ms);
  });

const waitForWebSocketMessage = (socket: WebSocket, ms = 2_000) =>
  Promise.race([
    new Promise<MessageEvent>((resolve, reject) => {
      socket.addEventListener("message", resolve, { once: true });
      socket.addEventListener("error", () => reject(new Error("websocket errored")), {
        once: true,
      });
    }),
    timeout("websocket message timed out", ms),
  ]);

describe("Cloudflare worker fetch", () => {
  test("npm undici accepts the active Request global", () => {
    const request = new Request("https://example.com/cloudflare-request-repro");
    const clonedRequest = new UndiciRequest(request);

    expect(clonedRequest.url).toBe("https://example.com/cloudflare-request-repro");
  });

  test("unstable_startWorker dispatches requests to the local worker", async () => {
    // Wrangler's unstable_startWorker currently deadlocks Bun's event loop after
    // returning the worker object. The API works under Node, so keep this smoke
    // test in a Node subprocess while the Bun fixture covers createTestHarness.
    const result = Bun.spawnSync({
      cmd: [
        "node",
        "--input-type=module",
        "--eval",
        `
          import path from "node:path";
          import { unstable_startWorker } from "wrangler";

          const worker = await unstable_startWorker({
            config: path.join(process.cwd(), "wrangler.toml"),
            dev: {
              inspector: false,
              remote: false,
              server: { hostname: "127.0.0.1", port: 0 },
            },
          });

          try {
            await worker.ready;
            const response = await worker.fetch("https://example.com/cloudflare-worker-fetch");
            if (response.status !== 200) throw new Error(\`Unexpected status \${response.status}\`);
            const body = await response.text();
            if (body !== "cloudflare-ok") throw new Error(\`Unexpected body \${body}\`);
          } finally {
            await worker.dispose();
          }
        `,
      ],
      cwd: import.meta.dir,
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode, result.stderr.toString()).toBe(0);
  }, 15_000);

  test("createTestHarness response body can be read", async () => {
    const server = createTestHarness({
      workers: [{ configPath: path.join(import.meta.dir, "wrangler.toml") }],
    });

    try {
      await server.listen();
      const worker = server.getWorker("cloudflare-worker-fetch-fixture");
      const response = await worker.fetch("https://example.com/cloudflare-worker-fetch");

      expect(response.status).toBe(200);
      expect(await Promise.race([response.text(), timeout("response body timed out")])).toBe("cloudflare-ok");
    } finally {
      await server.close();
    }
  }, 10_000);

  test("createTestHarness getWorker fetch preserves custom request headers", async () => {
    const server = createTestHarness({
      workers: [{ configPath: path.join(import.meta.dir, "wrangler.toml") }],
    });

    try {
      await server.listen();
      const worker = server.getWorker("cloudflare-worker-fetch-fixture");
      const response = await worker.fetch("https://example.com/headers", {
        headers: {
          authorization: "Bearer fixture-token",
          "x-fixture": "get-worker-header",
        },
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        authorization: "Bearer fixture-token",
        fixture: "get-worker-header",
      });
    } finally {
      await server.close();
    }
  }, 10_000);

  test("createTestHarness getWorker fetch still routes after Expo Winter installs globals", async () => {
    await import("expo/src/winter");

    const server = createTestHarness({
      workers: [{ configPath: path.join(import.meta.dir, "wrangler.toml") }],
    });

    try {
      await server.listen();
      const worker = server.getWorker("cloudflare-worker-fetch-fixture");
      const response = await worker.fetch("https://example.com/headers", {
        headers: {
          "x-fixture": "expo-winter-route-override",
        },
      });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({
        authorization: null,
        fixture: "expo-winter-route-override",
      });
    } finally {
      await server.close();
    }
  }, 10_000);

  test("createTestHarness outbound fetch reaches the worker runtime", async () => {
    const server = createTestHarness({
      workers: [{ configPath: path.join(import.meta.dir, "wrangler.toml") }],
    });

    try {
      await server.listen();
      const worker = server.getWorker("cloudflare-worker-fetch-fixture");

      const response = await Promise.race([
        worker.fetch("https://example.com/external-example"),
        timeout("/external-example response timed out", 5_000),
      ]);

      expect(response.status).toBe(200);
      expect(await response.text()).toMatch(/^external:\d+:body$/);
    } finally {
      await server.close();
    }
  }, 10_000);

  test("createTestHarness reads Images transform and inline draw response bodies", async () => {
    const server = createTestHarness({
      workers: [{ configPath: path.join(import.meta.dir, "wrangler.toml") }],
    });

    try {
      await server.listen();
      const worker = server.getWorker("cloudflare-worker-fetch-fixture");

      for (const pathname of ["/images-transform", "/images-draw-inline"]) {
        const response = await Promise.race([
          worker.fetch(`https://example.com${pathname}`),
          timeout(`${pathname} response timed out`, 5_000),
        ]);

        expect(response.status).toBe(200);
        expect(Number(await response.text())).toBeGreaterThan(0);
      }
    } finally {
      await server.close();
    }
  }, 10_000);

  test("createTestHarness reads Images draw output from a fetched body in a Durable Object", async () => {
    const server = createTestHarness({
      workers: [{ configPath: path.join(import.meta.dir, "wrangler.toml") }],
    });

    try {
      await server.listen();
      const worker = server.getWorker("cloudflare-worker-fetch-fixture");

      const response = await Promise.race([
        worker.fetch("https://example.com/images-do-draw-fetched"),
        timeout("/images-do-draw-fetched response timed out", 2_000),
      ]);

      expect(response.status).toBe(200);
      expect(Number(await response.text())).toBeGreaterThan(0);
    } finally {
      await server.close();
    }
  }, 10_000);

  test("createTestHarness reads Images output after Durable Object RPC processing", async () => {
    const server = createTestHarness({
      workers: [{ configPath: path.join(import.meta.dir, "wrangler.toml") }],
    });

    try {
      await server.listen();
      const worker = server.getWorker("cloudflare-worker-fetch-fixture");

      const response = await Promise.race([
        worker.fetch("https://example.com/images-rpc-full"),
        timeout("/images-rpc-full response timed out", 5_000),
      ]);

      expect(response.status).toBe(200);
      const result = await response.json();
      expect(result.bytes).toBeGreaterThan(0);
      expect(result.steps).toContain("cache-wait-until");
    } finally {
      await server.close();
    }
  }, 10_000);

  test("createTestHarness accepts websocket connections through Cloudflare", async () => {
    // Bun's ws compatibility layer does not implement the upgrade events
    // Miniflare uses for host-side websocket clients. Keep the Cloudflare
    // websocket smoke in Node while the Bun fixture covers HTTP fetch paths.
    const result = Bun.spawnSync({
      cmd: [
        "node",
        "--input-type=module",
        "--eval",
        `
          import path from "node:path";
          import WebSocket from "ws";
          import { createTestHarness } from "wrangler";

          const server = createTestHarness({
            workers: [{ configPath: path.join(process.cwd(), "wrangler.toml") }],
          });
          let socket;

          try {
            const { url } = await server.listen();
            const websocketUrl = new URL("/app-events/subscribe", url);
            websocketUrl.protocol = websocketUrl.protocol === "https:" ? "wss:" : "ws:";
            socket = new WebSocket(websocketUrl);
            await Promise.race([
              new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject(new Error("timeout")), 5_000);
                timeout.unref?.();
                socket.once("open", () => {
                  clearTimeout(timeout);
                  resolve();
                });
                socket.once("error", (error) => {
                  clearTimeout(timeout);
                  reject(error);
                });
              }),
            ]);
          } finally {
            socket?.close();
            await server.close();
          }
        `,
      ],
      cwd: import.meta.dir,
      stderr: "pipe",
      stdout: "pipe",
    });

    expect(result.exitCode, result.stderr.toString()).toBe(0);
  }, 10_000);

  test("createTestHarness listener websocket survives a later worker publish request", async () => {
    const server = createTestHarness({
      workers: [{ configPath: path.join(import.meta.dir, "wrangler.toml") }],
    });
    let socket: WebSocket | undefined;

    try {
      const { url } = await server.listen();
      const worker = server.getWorker("cloudflare-worker-fetch-fixture");
      const websocketUrl = new URL("/app-events/subscribe", url);
      websocketUrl.protocol = websocketUrl.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(websocketUrl);

      await Promise.race([
        new Promise<void>((resolve, reject) => {
          socket?.addEventListener("open", () => resolve(), { once: true });
          socket?.addEventListener("error", () => reject(new Error("websocket errored")), {
            once: true,
          });
        }),
        timeout("websocket open timed out", 2_000),
      ]);

      const messagePromise = waitForWebSocketMessage(socket);
      const publishResponse = await Promise.race([
        worker.fetch("https://example.com/app-events/publish?message=fixture-event"),
        timeout("websocket publish response timed out", 2_000),
      ]);

      expect(publishResponse.status).toBe(200);
      expect(await publishResponse.json()).toEqual({ sockets: 1 });
      expect((await messagePromise).data).toBe("fixture-event");
    } finally {
      socket?.close();
      await server.close();
    }
  }, 10_000);

  test("api-def websocket response receives a publish after submit returns", async () => {
    const server = createTestHarness({
      workers: [{ configPath: path.join(import.meta.dir, "wrangler.toml") }],
    });
    let socket: WebSocket | undefined;

    try {
      const { url } = await server.listen();
      const worker = server.getWorker("cloudflare-worker-fetch-fixture");
      const api = new Api({
        baseUrl: url.toString(),
        name: "Cloudflare Fixture API",
        requestBackend: new FetchRequestBackend(),
      });
      const subscribe = api.endpoint().build({
        id: "subscribeAppEvents",
        method: "get",
        path: "/app-events/subscribe",
        responseType: "websocket",
      });

      const response = await subscribe.submit();
      socket = response.data as WebSocket;

      const messagePromise = waitForWebSocketMessage(socket);
      const publishResponse = await Promise.race([
        worker.fetch("https://example.com/app-events/publish?message=api-def-fixture-event"),
        timeout("api-def websocket publish response timed out", 2_000),
      ]);

      expect(publishResponse.status).toBe(200);
      expect(await publishResponse.json()).toEqual({ sockets: 1 });
      expect((await messagePromise).data).toBe("api-def-fixture-event");
    } finally {
      socket?.close();
      await server.close();
    }
  }, 10_000);
});
