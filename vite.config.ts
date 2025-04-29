import {defineConfig} from "vite";
import path from "path";
import {copy} from "vite-plugin-copy";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
    root: path.resolve(__dirname, "src/client"),
    base: "./",
    server: {
        // host: "127.0.0.1",
        port: 1923
    },
    build: {
        target: "ES2022",
        assetsDir: ".",
        outDir: path.resolve(__dirname, "dist/client"),
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
        tsconfigPaths(),
        copy([
            {
                src: path.resolve(__dirname, "src/client/assets/*").replaceAll("\\", "/"),
                dest: path.resolve(__dirname, "dist/client/assets").replaceAll("\\", "/")
            }
        ], {
            hook: "writeBundle"
        }),
        react({
            babel: {
                parserOpts: {
                    plugins: ["decorators-legacy", "classProperties"]
                }
            }
        })
    ]
});
