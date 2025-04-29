import X, {Bin, BufferIndex} from "stramp";
import {ChunkBlockAmount} from "@/meta/WorldConstants";
import {copyBuffer} from "@/utils/Utils";

function findSmallPatterns(array: Uint16Array, max = 255) {
    const result = [];
    for (let i = 0; i < array.length; i++) {
        let count = 1;
        while (count < max && array[i] === array[i + 1]) {
            count++;
            i++;
        }
        result.push([array[i], count]);
    }
    return result;
}

function blocksToBuffer(blocks: Uint16Array) {
    let zeroEnd = 0;
    for (let i = blocks.length - 1; i >= 0; i--) {
        if (blocks[i] !== 0) {
            zeroEnd = i;
            break;
        }
    }
    const buf = [];
    const spl = findSmallPatterns(blocks.slice(0, zeroEnd + 1));
    for (let i = 0; i < spl.length; i++) {
        const sp = spl[i];
        if (sp[1] > 1) {
            buf.push(0xfe);
            buf.push(sp[1]);
        }
        buf.push(sp[0] & 0xff);
        buf.push((sp[0] >> 8) & 0xff);
    }
    return buf;
}

const baseBlocks = X.u16array.sized(ChunkBlockAmount);

export default new class ChunkBlocksBin extends Bin<Uint16Array> {
    name = "Chunk";

    unsafeWrite(bind: BufferIndex, value: Uint16Array) {
        const buf = copyBuffer(blocksToBuffer(value));
        buf.copy(bind.buffer, bind.index);
        bind.index += buf.length;
        bind.push(0xff);
    };

    read(bind: BufferIndex): Uint16Array {
        const blocks = new Uint16Array(ChunkBlockAmount);
        let i = 0;
        for (; i < blocks.length; i++) {
            if (bind.current === 0xff) {
                bind.index++;
                break;
            }

            if (bind.current === 0xfe) {
                bind.index++;
                const count = bind.incGet();
                const val = bind.readUInt16();
                for (let j = 0; j < count; j++) {
                    blocks[i++] = val;
                }
                i--;
                continue;
            }

            blocks[i] = bind.readUInt16();
        }
        return blocks;
    };

    unsafeSize(value: Uint16Array): number {
        return blocksToBuffer(value).length + 1
    };

    findProblem(value: Uint16Array, strict?: boolean) {
        return baseBlocks.findProblem(value, strict);
    };

    get sample(): Uint16Array {
        return new Uint16Array(ChunkBlockAmount);
    };
}