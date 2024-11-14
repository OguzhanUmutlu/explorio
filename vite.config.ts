import {defineConfig} from "vite";
import path from "path";
import {copy} from "vite-plugin-copy";
import react from "@vitejs/plugin-react";

export default defineConfig({
    root: path.resolve(__dirname, "src/client"),
    base: "/explorio/",
    server: {
        host: "127.0.0.1",
        port: 1923
    },
    build: {
        target: "ES2022",
        assetsDir: ".",
        rollupOptions: {
            input: path.resolve(__dirname, "src/client/main.tsx"),
            external: ["src/server/**"],
            output: {
                entryFileNames: "[name].js",
                chunkFileNames: "[name].js",
                assetFileNames: "[name].[ext]"
            }
        },
        chunkSizeWarningLimit: 2000
    },
    plugins: [
        copy([
            {
                src: path.resolve(__dirname, "src/client/assets/*").replaceAll("\\", "/"),
                dest: path.resolve(__dirname, "src/client/dist/assets").replaceAll("\\", "/")
            }
        ], {
            hook: "writeBundle"
        }),
        react()
    ]
});
