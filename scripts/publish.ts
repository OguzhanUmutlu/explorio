import fs from "fs";
import {Versions} from "@/Versions";
import {execSync} from "node:child_process";

fs.rmSync("./dist-npm", {recursive: true, force: true});
fs.cpSync("./src/client/assets/sounds", "./dist-npm/client/assets/sounds", {recursive: true});
fs.cpSync("./src/common", "./dist-npm/src/common", {recursive: true});
fs.cpSync("./src/server", "./dist-npm/src/server", {recursive: true});
fs.cpSync("./README.md", "./dist-npm/README.md", {recursive: true});
fs.cpSync("./LICENSE", "./dist-npm/LICENSE", {recursive: true});
fs.cpSync("./tsconfig.server.json", "./dist-npm/tsconfig.json", {recursive: true});

const pkg: Record<string, unknown> = JSON.parse(fs.readFileSync("./package.json", "utf-8"));

delete pkg.scripts;
delete pkg.devDependencies;
pkg.version = Versions.at(-1);
pkg.main = "main.js";
pkg.bin = {explorio: "main.js"};

fs.writeFileSync("./dist-npm/main.js", `#!/usr/bin/env node
import {spawn} from "child_process";
import path from "node:path";
const tsProcess = spawn(\`npx tsx \${path.join(import.meta.dirname, "src/server/Main.ts")}\`, {
  stdio: ["pipe", "pipe", "pipe"],
  shell: true
});

process.stdin.pipe(tsProcess.stdin);
tsProcess.stdout.pipe(process.stdout);
tsProcess.stderr.pipe(process.stderr);`);

fs.writeFileSync("./dist-npm/package.json", JSON.stringify(pkg, null, 2));

execSync("cd dist-npm && npm publish", {stdio: "inherit"});

fs.rmSync("./dist-npm", {recursive: true, force: true});

console.log("Publish complete. Ignore the error below.");
process.exit(1); // prevent publishing to npm accidentally
