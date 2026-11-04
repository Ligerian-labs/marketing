import { readFileSync } from "node:fs";
import http from "node:http";
import https from "node:https";
import { publicRedirect, SITE } from "./urls.mjs";

// Import the native static + SSR handler without opening a second listener.
process.env.ASTRO_NODE_AUTOSTART = "disabled";
const { handler, options } = await import("../../dist/server/entry.mjs");
const xml = readFileSync(new URL("../../dist/client/sitemap.xml", import.meta.url), "utf8");
const publicPaths = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].flatMap((match) => {
  const url = new URL(match[1]);
  return url.origin === SITE ? [url.pathname] : [];
}));

const listener = (req, res) => {
  let destination;
  try {
    destination = publicRedirect(new URL(req.url || "/", "http://localhost"), req.method || "GET", publicPaths);
  } catch {
    res.writeHead(400).end("Bad request.");
    return;
  }
  if (destination) {
    res.writeHead(301, { Location: destination }).end();
    return;
  }
  return handler(req, res);
};

const host = process.env.HOST ?? (options.host === true ? "0.0.0.0" : options.host || "localhost");
const port = Number(process.env.PORT ?? options.port ?? 8080);
const server = process.env.SERVER_CERT_PATH && process.env.SERVER_KEY_PATH
  ? https.createServer({ cert: readFileSync(process.env.SERVER_CERT_PATH), key: readFileSync(process.env.SERVER_KEY_PATH) }, listener)
  : http.createServer(listener);
server.listen(port, host);
