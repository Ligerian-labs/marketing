import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import node from "@astrojs/node";
import rehypeTables from "./src/lib/rehype-tables.mjs";

export default defineConfig({
  site: "https://ligerianlabs.fr",
  // The production entry enforces public-page canonicals. "always" also
  // redirects API/Stripe endpoints before middleware in @astrojs/node.
  trailingSlash: "ignore",
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [mdx()],
  markdown: { rehypePlugins: [rehypeTables] },
  vite: {
    plugins: [tailwindcss()],
  },
});
