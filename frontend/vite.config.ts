import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Injected via ENV in the Docker frontend-builder stage (from the git tag).
// Falls back to "dev" for local development builds.
const APP_VERSION = process.env.VERSION ?? "dev";

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
  },
});
