import { defineMiddleware } from "astro:middleware";
import { publicPaths } from "./lib/seo-pages";
import { publicRedirect } from "../scripts/server/urls.mjs";
import { getCollection } from "astro:content";

export const onRequest = defineMiddleware(async (context, next) => {
  const paths = context.url.pathname.startsWith("/blog/")
    ? new Set([...publicPaths, ...(await getCollection("blog")).map((post) => `/blog/${post.slug}/`)])
    : publicPaths;
  const destination = publicRedirect(context.url, context.request.method, paths);
  return destination ? context.redirect(destination, 301) : next();
});
