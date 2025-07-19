import SServer from "@s/SServer";
import fs from "fs";

const server = new SServer(fs, process.argv[2] || ".");

await server.start();