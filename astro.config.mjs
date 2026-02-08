import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import node from "@astrojs/node";

export default defineConfig({
  site: "https://ligerianlabs.fr",
  output: "hybrid",
  adapter: node({ mode: "standalone" }),
  integrations: [mdx()],
  vite: {
    plugins: [tailwindcss()],
  },
});
