import X from "stramp";
import {ChunkLength, WorldHeight} from "./Utils";

function findSmallPatterns(array, max = 255) {
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

function blocksToBuffer(blocks) {
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

export const ChunkBlocksBin = X.makeBin({
    name: "chunk",
    write(buffer, index, value) {
        const buf = Buffer.from(blocksToBuffer(value));
        buf.copy(buffer, index[0]);
        index[0] += buf.length;
        buffer[index[0]++] = 0xff;
    },
    read(buffer, index) {
        const blocks = new Uint16Array(ChunkLength * WorldHeight);
        let i = 0;
        for (; i < blocks.length; i++) {
            if (buffer[index[0]] === 0xff) {
                index[0]++;
                break;
            }
            if (buffer[index[0]] === 0xfe) {
                index[0]++;
                const count = buffer[index[0]++];
                const val = buffer.readUInt16LE(index[0]);
                index[0] += 2;
                for (let j = 0; j < count; j++) {
                    blocks[i++] = val;
                }
                i--;
                continue;
            }
            const val = buffer.readUInt16LE(index[0]);
            index[0] += 2;
            blocks[i] = val;
        }
        return blocks;
    },
    size: value => blocksToBuffer(value).length + 1,
    validate: X.u16array.validate,
    sample: () => new Uint16Array(ChunkLength * WorldHeight)
});