import { DurableObject } from "cloudflare:workers";

const PNG_1X1_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";

type Env = {
  APP_EVENTS: DurableObjectNamespace<AppEvents>;
  IMAGES: ImagesBinding;
  IMAGES_BUCKET: R2Bucket;
  IMAGES_PROBE: DurableObjectNamespace<ImagesProbe>;
};

const base64ToReadableStream = (base64: string) => {
  const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));

  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
};

const arrayBufferToReadableStream = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);

  return new ReadableStream({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
};

export class AppEvents extends DurableObject {
  private sockets = new Map<string, WebSocket>();

  publish(message: string) {
    for (const [connectionId, socket] of this.sockets.entries()) {
      try {
        socket.send(message);
      } catch {
        this.sockets.delete(connectionId);
      }
    }

    return this.sockets.size;
  }

  fetch(request: Request): Response {
    if (request.headers.get("Upgrade") !== "websocket") {
      return Response.json(
        {
          connection: request.headers.get("Connection"),
          upgrade: request.headers.get("Upgrade"),
        },
        { status: 400 },
      );
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const connectionId = crypto.randomUUID();
    server.accept();
    this.sockets.set(connectionId, server);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  webSocketClose(socket: WebSocket) {
    for (const [connectionId, storedSocket] of this.sockets.entries()) {
      if (storedSocket === socket) {
        this.sockets.delete(connectionId);
        break;
      }
    }
  }
}

export class ImagesProbe extends DurableObject<Env> {
  async processFetchedDraw(): Promise<{ bytes: number; steps: string[] }> {
    const steps: string[] = ["start"];
    const watermark = await fetch(
      "https://imagedelivery.net/JtlBZH8N7kG9oj5ITyCFvw/72e9bcce-000a-4d84-2db6-d2c955eb8d00/public",
    );
    steps.push("watermark-fetch");
    const watermarkedResponse = await this.env.IMAGES.input(base64ToReadableStream(PNG_1X1_BASE64))
      .draw(watermark.body as ReadableStream<Uint8Array>, {
        bottom: 5,
        opacity: 0,
        right: 5,
      })
      .output({ format: "image/png" });
    steps.push("images-output");

    const imageBuffer = await watermarkedResponse.response().arrayBuffer();
    steps.push("images-array-buffer");
    const imageInfo = await this.env.IMAGES.info(arrayBufferToReadableStream(imageBuffer));
    steps.push("images-info");

    await this.env.IMAGES_BUCKET.put("generated.png", imageBuffer, {
      httpMetadata: {
        contentType: imageInfo.format === "image/png" ? imageInfo.format : "image/png",
      },
    });
    steps.push("r2-put");

    this.ctx.waitUntil(
      (async () => {
        const cacheResponse = (
          await this.env.IMAGES.input(arrayBufferToReadableStream(imageBuffer))
            .transform({ fit: "scale-down", width: 1024 })
            .output({ format: "image/png" })
        ).response();

        await caches.default.put("https://example.com/generated.png", cacheResponse);
      })(),
    );
    steps.push("cache-wait-until");

    return { bytes: imageBuffer.byteLength, steps };
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const image = this.env.IMAGES.input(base64ToReadableStream(PNG_1X1_BASE64));
    const result =
      url.pathname === "/images-do-draw-fetched"
        ? await image
            .draw(
              (
                await fetch(
                  "https://imagedelivery.net/JtlBZH8N7kG9oj5ITyCFvw/72e9bcce-000a-4d84-2db6-d2c955eb8d00/public",
                )
              ).body as ReadableStream<Uint8Array>,
              {
                bottom: 0,
                opacity: 0,
                right: 0,
              },
            )
            .output({ format: "image/png" })
        : await image.transform({ height: 1, width: 1 }).output({ format: "image/png" });

    return new Response(String((await result.response().arrayBuffer()).byteLength));
  }
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    if (url.pathname === "/app-events/subscribe") {
      const stub = env.APP_EVENTS.get(env.APP_EVENTS.idFromName("test-user"));
      return stub.fetch(request);
    }

    if (url.pathname === "/app-events/publish") {
      const stub = env.APP_EVENTS.get(env.APP_EVENTS.idFromName("test-user"));
      const sockets = await stub.publish(url.searchParams.get("message") ?? "fixture-event");
      return Response.json({ sockets });
    }

    if (url.pathname.startsWith("/images-do-")) {
      const stub = env.IMAGES_PROBE.get(env.IMAGES_PROBE.idFromName("images-probe"));
      return stub.fetch(request);
    }

    if (url.pathname === "/images-rpc-full") {
      const stub = env.IMAGES_PROBE.get(env.IMAGES_PROBE.idFromName("images-probe"));
      const result = await stub.processFetchedDraw();
      return Response.json(result);
    }

    if (url.pathname === "/images-transform") {
      const result = await env.IMAGES.input(base64ToReadableStream(PNG_1X1_BASE64))
        .transform({ height: 1, width: 1 })
        .output({ format: "image/png" });

      return new Response(String((await result.response().arrayBuffer()).byteLength));
    }

    if (url.pathname === "/images-draw-inline") {
      const result = await env.IMAGES.input(base64ToReadableStream(PNG_1X1_BASE64))
        .draw(base64ToReadableStream(PNG_1X1_BASE64), {
          bottom: 0,
          opacity: 0,
          right: 0,
        })
        .output({ format: "image/png" });

      return new Response(String((await result.response().arrayBuffer()).byteLength));
    }

    if (url.pathname === "/images-draw-fetched") {
      const watermark = await fetch(
        "https://imagedelivery.net/JtlBZH8N7kG9oj5ITyCFvw/72e9bcce-000a-4d84-2db6-d2c955eb8d00/public",
      );
      const result = await env.IMAGES.input(base64ToReadableStream(PNG_1X1_BASE64))
        .draw(watermark.body as ReadableStream<Uint8Array>, {
          bottom: 0,
          opacity: 0,
          right: 0,
        })
        .output({ format: "image/png" });

      return new Response(String((await result.response().arrayBuffer()).byteLength));
    }

    if (url.pathname === "/external-example") {
      const response = await fetch("https://example.com");
      return new Response(`external:${response.status}:${response.body ? "body" : "no-body"}`);
    }

    if (url.pathname === "/headers") {
      return Response.json({
        authorization: request.headers.get("authorization"),
        fixture: request.headers.get("x-fixture"),
      });
    }

    return new Response("cloudflare-ok");
  },
};
