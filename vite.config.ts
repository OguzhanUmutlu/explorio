import {defineConfig} from "vite";
import path from "path";
import {copy} from "vite-plugin-copy";
import react from "@vitejs/plugin-react";

export default defineConfig({
    root: path.resolve(__dirname, "src/client"),
    base: "/explorio/",
    server: {
        host: true,
        port: 1923
    },
    build: {
        target: "ES2022",
        assetsDir: ".",
        outDir: path.resolve(__dirname, "client-dist"),
        emptyOutDir: true,
        rollupOptions: {
            input: path.resolve(__dirname, "src/client/index.html"),
            external: ["src/server/**"],
            output: {
                entryFileNames: "[name].js",
                chunkFileNames: "[name].js",
                assetFileNames: "[name].[ext]",
                format: "es"
            },
            onwarn(warning, warn) {
                if (warning.code !== "EVAL") warn(warning);
            }
        },
        chunkSizeWarningLimit: 4096
    },
    worker: {
        format: "es"
    },
    plugins: [
        copy([
            {
                src: path.resolve(__dirname, "src/client/assets/*").replaceAll("\\", "/"),
                dest: path.resolve(__dirname, "client-dist/assets").replaceAll("\\", "/")
            }
        ], {
            hook: "writeBundle"
        }),
        react()
    ]
});
