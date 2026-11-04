const UPSTREAM = "https://eu.i.posthog.com";
const ASSET_UPSTREAM = "https://eu-assets.i.posthog.com";
const allowedOrigins = new Set([UPSTREAM, ASSET_UPSTREAM]);
const requestHeaders = ["accept", "content-type", "content-encoding", "if-none-match", "if-modified-since", "range"];
const responseHeaders = ["content-type", "cache-control", "etag", "last-modified", "expires", "vary", "content-range", "accept-ranges", "retry-after"];

/** Native fetch decodes compressed bodies. Never forward their old length or
 * encoding, upstream cookies, or caller identity/credentials in either direction. */
export async function proxyAnalytics(request, path, fetchUpstream = fetch) {
  const cors = { "Access-Control-Allow-Origin": "*" };
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: {
      ...cors,
      "Access-Control-Allow-Methods": "GET, POST, HEAD, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Content-Encoding",
    } });
  }
  if (!["GET", "POST", "HEAD"].includes(request.method)) return new Response(null, { status: 405, headers: { ...cors, Allow: "GET, POST, HEAD, OPTIONS" } });
  const target = new URL(UPSTREAM);
  target.pathname = "/" + path.replace(/^\/+/, "");
  if (/^\/(?:static|array)\//.test(target.pathname)) target.hostname = new URL(ASSET_UPSTREAM).hostname;
  target.search = new URL(request.url).search;
  const headers = new Headers();
  for (const name of requestHeaders) {
    const value = request.headers.get(name);
    if (value !== null) headers.set(name, value);
  }
  headers.set("accept-encoding", "identity");
  try {
    const upstream = await fetchUpstream(target, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.arrayBuffer(),
      redirect: "manual",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(10_000)]),
    });
    const output = new Headers(cors);
    for (const name of responseHeaders) {
      const value = upstream.headers.get(name);
      if (value !== null) output.set(name, value);
    }
    // Redirects must stay on the approved EU event/asset origins; rewrite through
    // this proxy rather than following a new host with the request body.
    const location = upstream.headers.get("location");
    if (location && upstream.status >= 300 && upstream.status < 400) {
      const destination = new URL(location, target);
      if (!allowedOrigins.has(destination.origin)) return new Response("Proxy redirect rejected", { status: 502, headers: cors });
      output.set("location", `/ingest${destination.pathname}${destination.search}`);
    }
    return new Response(request.method === "HEAD" || [204, 205, 304].includes(upstream.status) ? null : upstream.body, { status: upstream.status, headers: output });
  } catch {
    return new Response("Proxy error", { status: 502, headers: cors });
  }
}
