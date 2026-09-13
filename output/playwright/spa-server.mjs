import { createServer } from "node:http";
import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, resolve } from "node:path";

const root = resolve(process.argv[2]);
const port = Number(process.argv[3] ?? 8084);
const apiTarget = process.argv[4]?.replace(/\/$/, "");
const types = { ".css": "text/css", ".ico": "image/x-icon", ".js": "text/javascript", ".jpg": "image/jpeg", ".png": "image/png", ".ttf": "font/ttf", ".webp": "image/webp" };

createServer(async (request, response) => {
  const pathname = decodeURIComponent(new URL(request.url ?? "/", "http://localhost").pathname);
  if (apiTarget && pathname.startsWith("/api/")) {
    const body = request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await new Promise((resolveBody) => {
          const chunks = [];
          request.on("data", (chunk) => chunks.push(chunk));
          request.on("end", () => resolveBody(Buffer.concat(chunks)));
        });
    const upstream = await fetch(`${apiTarget}${request.url}`, {
      method: request.method,
      headers: { "content-type": request.headers["content-type"] ?? "application/json" },
      body,
    });
    const headers = Object.fromEntries(upstream.headers);
    delete headers["content-encoding"];
    delete headers["content-length"];
    delete headers["transfer-encoding"];
    response.writeHead(upstream.status, headers);
    response.end(Buffer.from(await upstream.arrayBuffer()));
    return;
  }
  const requested = join(root, pathname);
  const file = existsSync(requested) && statSync(requested).isFile() ? requested : join(root, "index.html");
  response.setHeader("Content-Type", types[extname(file)] ?? "text/html; charset=utf-8");
  createReadStream(file).pipe(response);
}).listen(port, "127.0.0.1");
