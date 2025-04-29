import Server from "@/Server";

export default class CServer extends Server {
    constructor() {
        super(null, "", {close: () => void 0});
    };
}