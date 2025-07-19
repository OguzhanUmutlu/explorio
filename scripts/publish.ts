import fs from "fs";
import {Versions} from "@/Versions";
import {execSync} from "node:child_process";

fs.rmSync("./dist", {recursive: true, force: true});
fs.cpSync("./src/client/assets/sounds", "./dist/client/assets/sounds", {recursive: true});
fs.cpSync("./src/common", "./dist/src/common", {recursive: true});
fs.cpSync("./src/server", "./dist/src/server", {recursive: true});
fs.cpSync("./README.md", "./dist/README.md", {recursive: true});
fs.cpSync("./LICENSE", "./dist/LICENSE", {recursive: true});
fs.cpSync("./tsconfig.server.json", "./dist/tsconfig.json", {recursive: true});

const pkg: Record<string, unknown> = JSON.parse(fs.readFileSync("./package.json", "utf-8"));

delete pkg.scripts;
delete pkg.devDependencies;
pkg.version = Versions.at(-1);
pkg.main = "main.js";
pkg.bin = {explorio: "main.js"};

fs.writeFileSync("./dist/main.js", `#!/usr/bin/env node
import {spawn} from "child_process";
import path from "node:path";
const tsProcess = spawn(\`npx tsx \${path.join(import.meta.dirname, "src/server/Main.ts")}\`, {
  stdio: ["pipe", "pipe", "pipe"],
  shell: true
});

process.stdin.pipe(tsProcess.stdin);
tsProcess.stdout.pipe(process.stdout);
tsProcess.stderr.pipe(process.stderr);`);

fs.writeFileSync("./dist/package.json", JSON.stringify(pkg, null, 2));

execSync("cd dist && npm publish", {stdio: "inherit"});

console.log("Build complete. The dist folder is ready for publishing. Ignore the error below.");
process.exit(1); // prevent publishing to npm accidentally
