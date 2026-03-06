import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: "frontend",
  build: {
    outDir: resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    proxy: {
      "/ws": {
        target: "ws://localhost:8787",
        ws: true,
      },
    },
  },
});
