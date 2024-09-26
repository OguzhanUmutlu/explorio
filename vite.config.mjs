import {defineConfig} from "vite";
import path from "path";
import {copy} from 'vite-plugin-copy';

export default defineConfig({
    root: path.resolve(__dirname, "src/client"),
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "src/client"),
            "@common": path.resolve(__dirname, "src/common"),
        }
    },
    server: {
        host: "127.0.0.1",
        port: 1923
    },
    build: {
        target: "ES2022",
        assetsDir: ".",
        rollupOptions: {
            input: {
                index: path.resolve(__dirname, "src/client/index.html"),
                client: path.resolve(__dirname, "src/client/client.html"),
            },
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
        })
    ]
});