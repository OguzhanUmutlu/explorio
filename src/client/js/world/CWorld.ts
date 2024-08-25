import {World} from "../../../common/world/World";
import {Sound} from "../Sound";
import {clientPlayer} from "../Client";
import {CEntity} from "../entity/CEntity";
import {Buffer, BufferType} from "../../../common/compound/Tag";
import {CServer} from "../CServer";

export class CWorld extends World<CEntity, CServer> {

    // TODO: render sub chunks once and use them instead of rendering every single block separately
    playSound(src: string, x: number, y: number): void {
        const distance = clientPlayer.distance(x, y);
        if (distance > 20) return;
        const volume = 1 / distance;
        Sound.play(src, volume);
    };

    getChunkBuffer(x: number): BufferType | null {
        const str = localStorage.getItem(`explorio.${this.server.uuid}.${this.path}.chunks.${x}`);
        if (str === null) return null;
        return Buffer.from(str);
    };

    setChunkBuffer(x: number, buffer: BufferType): void {
        localStorage.setItem(`explorio.${this.server.uuid}.${this.path}.chunks.${x}`, buffer.toString());
    };
}