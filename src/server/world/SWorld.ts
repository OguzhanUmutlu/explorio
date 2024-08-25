import {World} from "../../common/world/World";
import * as fs from "fs";
import {SEntity} from "../entity/SEntity";
import {SServer} from "../SServer";

export class SWorld extends World<SEntity, SServer> {
    playSound(path: string, x: number, y: number): void {
    };

    getChunkBuffer(x: number): Buffer | null {
        const path = this.path + "/chunks/" + x + ".dat";
        if (!fs.existsSync(path)) return null;
        return fs.readFileSync(path);
    };

    setChunkBuffer(x: number, buffer: Buffer) {
        fs.mkdirSync(this.path + "/chunks", {recursive: true, mode: 0o777});
        fs.writeFileSync(this.path + "/chunks/" + x + ".dat", buffer);
    };
}