import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  root: path.resolve(__dirname, "src/client"),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src/client"),
      "@common": path.resolve(__dirname, "src/common"),
    }
  },
  server: {
    port: 1923
  },
  build: {
    rollupOptions: {
      input: path.resolve(__dirname, "src/client/index.html")
    }
  }
});