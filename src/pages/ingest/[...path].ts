import type { APIRoute } from "astro";
import { proxyAnalytics } from "../../lib/seo-proxy.mjs";

const handler: APIRoute = ({ params, request }) => proxyAnalytics(request, params.path || "");

export const GET = handler;
export const POST = handler;
export const HEAD = handler;
export const OPTIONS = handler;
