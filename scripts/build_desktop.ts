import fs from "fs";
import {execSync} from "node:child_process";

fs.rmSync("./dist-client", {recursive: true, force: true});

execSync("npm run build:client", {stdio: "inherit"});

fs.cpSync("./dist-client", "./src/desktop/dist", {recursive: true, force: true});
fs.rmSync("./dist-client", {recursive: true, force: true});
