import {Bin, BufferIndex} from "stramp";
import {ChunkBlockAmount} from "@/meta/WorldConstants";
import {f2name, name2f} from "@/item/ItemFactory";
import {FullIds} from "@/meta/ItemIds";

function getPalette(value: Uint16Array) {
    const palette: string[] = [];
    palette.push("air");
    for (let i = 0; i < value.length; i++) {
        const block = value[i];
        const identifier = f2name(block);
        if (!palette.includes(identifier)) palette.push(identifier);
    }
    return palette;
}

export default new class ChunkBlocksBin extends Bin<Uint16Array> {
    isOptional = false as const;
    name = "Chunk";

    unsafeWrite(bind: BufferIndex, value: Uint16Array) {
        const palette = getPalette(value);
        for (let i = 0; i < palette.length; i++) {
            const name = palette[i];
            if (name.length === 0) throw new Error(`Empty block name at index ${i} in palette`);
            bind.write(name);
            bind.push(0);
        }
        bind.push(0);
        for (let i = 0; i < value.length; i++) {
            const blockId = value[i];
            const name = f2name(blockId);
            const index = palette.indexOf(name);
            bind.writeUInt16(index);
        }
    };

    read(bind: BufferIndex): Uint16Array {
        const blocks = new Uint16Array(ChunkBlockAmount);
        const palette: string[] = [];
        let byte: number;
        while ((byte = bind.incGet())) {
            let name = "";
            while (byte) {
                name += String.fromCharCode(byte);
                byte = bind.incGet();
            }
            palette.push(name);
        }
        for (let i = 0; i < ChunkBlockAmount; i++) {
            const blockId = bind.readUInt16();
            if (blockId >= palette.length) throw new Error(`Invalid block ID ${blockId} at index ${i}`);
            const name = palette[blockId];
            if (name2f(name) === void 0) printer.warn(`Unknown block name: ${name}`);
            blocks[i] = name2f(name) || FullIds.AIR;
        }
        return blocks;
    };

    unsafeSize(value: Uint16Array): number {
        const palette: string[] = [];
        let size = 1; // the palette terminator
        for (let i = 0; i < value.length; i++) {
            const block = value[i];
            const name = f2name(block);
            if (!palette.includes(name)) {
                size += name.length + 1;
                palette.push(name);
            }
        }
        return size + value.length * 2;
    };

    findProblem(value: Uint16Array, _?: boolean) {
        if (!(value instanceof Uint16Array)) return this.makeProblem("Expected a Uint16Array");
    };

    get sample(): Uint16Array {
        return new Uint16Array(ChunkBlockAmount);
    };
}