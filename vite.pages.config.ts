import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const projectRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: `${projectRoot}/pages-static`,
  publicDir: `${projectRoot}/public`,
  base: "./",
  plugins: [react()],
  build: {
    outDir: `${projectRoot}/dist-pages`,
    emptyOutDir: true,
  },
});
