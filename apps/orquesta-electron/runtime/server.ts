import { existsSync } from "node:fs";
import { createServer as createHttpServer } from "node:http";
import type { RequestListener } from "node:http";

const handlerUrl = new URL("../build/handler.js", import.meta.url);

type StartSvelteKitServerOptions = {
  host?: string;
  port?: string | number;
};

export type StartedSvelteKitServer = {
  host: string;
  port: number;
  url: string;
  close: () => Promise<void>;
};

export async function startSvelteKitServer(
  options: StartSvelteKitServerOptions = {},
): Promise<StartedSvelteKitServer> {
  const host = options.host ?? process.env.HOST ?? "127.0.0.1";
  const port = await resolvePort(host, Number(options.port ?? process.env.PORT ?? 0));
  process.env.ORIGIN ??= `http://${originHost(host)}:${port}`;

  if (!existsSync(handlerUrl)) {
    throw new Error("Missing build/handler.js. Run `pnpm run build` before starting the server.");
  }

  const { handler } = (await import(/* @vite-ignore */ handlerUrl.href)) as {
    handler: RequestListener;
  };
  const server = createHttpServer(handler);

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve(undefined);
    });
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected a TCP server address");
  }

  const url = `http://${host}:${address.port}`;
  process.env.ORIGIN ??= url;

  return {
    host,
    port: address.port,
    url,
    close: () =>
      new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve(undefined))),
      ),
  };
}

async function resolvePort(host: string, port: number): Promise<number> {
  if (port !== 0) return port;

  const server = createHttpServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, host, () => {
      server.off("error", reject);
      resolve(undefined);
    });
  });

  const address = server.address();
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve(undefined))),
  );

  if (!address || typeof address === "string") {
    throw new Error("Expected a TCP server address");
  }

  return address.port;
}

function originHost(host: string): string {
  return host === "0.0.0.0" || host === "::" ? "127.0.0.1" : host;
}
