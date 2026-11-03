import { defineMiddleware } from "astro:middleware";
import { publicPaths } from "./lib/seo-pages";
import { publicRedirect } from "../scripts/server/urls.mjs";

export const onRequest = defineMiddleware((context, next) => {
  const destination = publicRedirect(context.url, context.request.method, publicPaths);
  return destination ? context.redirect(destination, 301) : next();
});
