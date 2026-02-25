import type { APIRoute } from "astro";

const POSTHOG_HOST = "https://eu.i.posthog.com";

const handler: APIRoute = async ({ params, request }) => {
  const path = params.path || "";
  const url = new URL(request.url);
  const targetUrl = `${POSTHOG_HOST}/${path}${url.search}`;

  const headers = new Headers();
  for (const [key, value] of request.headers.entries()) {
    if (
      key.toLowerCase() !== "host" &&
      key.toLowerCase() !== "connection" &&
      !key.toLowerCase().startsWith("cf-")
    ) {
      headers.set(key, value);
    }
  }

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method)
        ? undefined
        : await request.arrayBuffer(),
    });

    const responseHeaders = new Headers();
    for (const [key, value] of response.headers.entries()) {
      if (key.toLowerCase() !== "transfer-encoding") {
        responseHeaders.set(key, value);
      }
    }
    responseHeaders.set("Access-Control-Allow-Origin", "*");

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (e) {
    return new Response("Proxy error", { status: 502 });
  }
};

export const GET = handler;
export const POST = handler;
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};
