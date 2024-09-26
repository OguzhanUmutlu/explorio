import {World} from "../../../common/world/World";
import {Sound} from "../../../common/utils/Sound";
import {clientPlayer, isOnline} from "../Client";
import {CEntity} from "../entity/CEntity";
import {CServer} from "../CServer";
import {CPlayer} from "../entity/types/CPlayer";

export class CWorld extends World<CEntity, CServer> {
    // TODO: render sub chunks once and use them instead of rendering every single block separately
    playSound(src: string, x: number, y: number): void {
        const distance = clientPlayer.distance(x, y);
        if (distance > 20) return;
        const volume = 1 / distance;
        Sound.play(src, volume);
    };

    getChunkBuffer(x: number): Buffer | null {
        if (isOnline) return null;
        const path = `singleplayer/${this.server.uuid}/worlds/${this.path}/chunks/${x}.dat`;
        if (!bfs.existsSync(path)) return null;
        const buf = bfs.readFileSync(path);
        return Buffer.from(buf);
    };

    setChunkBuffer(x: number, buffer: Buffer): void {
        if (isOnline) return;
        bfs.writeFileSync(`singleplayer/${this.server.uuid}/worlds/${this.path}/chunks/${x}.dat`, Buffer.from(buffer));
    };

    removeChunkBuffer(x: number) {
        if (isOnline) return;
        bfs.unlinkSync(`singleplayer/${this.server.uuid}/worlds/${this.path}/chunks/${x}.dat`);
    };

    getPlayers() {
        return <CPlayer[]>Object.values(this.entities).filter(i => i instanceof CPlayer);
    };
}