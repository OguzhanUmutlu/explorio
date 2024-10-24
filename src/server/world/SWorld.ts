import {World} from "../../common/world/World";
import * as fs from "fs";
import {SEntity} from "../entity/SEntity";
import {SServer} from "../SServer";
import {Packet} from "../../common/packet/Packet";
import {SPlayer} from "../entity/SPlayer";
import {SChunkPacket} from "../../common/packet/server/SChunkPacket";
import {SPlaySoundPacket} from "../../common/packet/server/SPlaySoundPacket";
import {CHUNK_LENGTH_BITS} from "../../common/utils/Utils";

export class SWorld extends World<SEntity, SServer> {
    path = "./worlds/" + this.folder;

    playSound(path: string, x: number, y: number): void {
        this.broadcastPacketAt(x, y, new SPlaySoundPacket({path, x, y}));
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

    removeChunkBuffer(x: number) {
        fs.unlinkSync(this.path + "/chunks/" + x + ".dat");
    };

    getChunkViewers(chunkX: number) {
        const players: SPlayer[] = [];
        for (let cx = chunkX - 2; cx <= chunkX + 2; cx++) {
            const entities = this.chunkEntities[cx] ??= [];
            for (const entity of entities) {
                if (entity instanceof SPlayer) players.push(entity);
            }
        }
        return players;
    };

    broadcastPacketAt(x: number, y: number, pk: Packet<any>, exclude: SPlayer[] = [], immediate = false) {
        const chunkX = x >> CHUNK_LENGTH_BITS;
        for (const player of this.getChunkViewers(chunkX)) {
            if (!exclude.includes(player)) player.network.sendPacket(pk, immediate);
        }
    };

    broadcastBlockAt(x: number, y: number, fullId = null, exclude: SPlayer[] = [], immediate = false) {
        const chunkX = x >> CHUNK_LENGTH_BITS;
        fullId ??= this.getBlockAt(x, y);
        for (const player of this.getChunkViewers(chunkX)) {
            if (!exclude.includes(player)) player.network.sendBlock(x, y, fullId, immediate);
        }
    };

    sendChunk(player: SPlayer, chunkX: number) {
        this.ensureChunk(chunkX);
        const chunk = this.chunks[chunkX];
        const entities = this.chunkEntities[chunkX].filter(i => i !== player).map(i => ({
            entityId: i.id, typeId: i.typeId, props: i.getSpawnData()
        }));
        player.network.sendPacket(new SChunkPacket({
            x: chunkX, data: chunk, entities, resetEntities: true
        }), true);
    };
}