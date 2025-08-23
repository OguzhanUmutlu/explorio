import SServer from "@s/SServer";

export const s_server = new SServer(process.argv[2] || ".");

await s_server.start();