import {Server} from "@/Server";

export class CServer extends Server {
    constructor() {
        super(null, {close: () => void 0});
    };
}