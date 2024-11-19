import X, {Bin, BufferIndex} from "stramp";
import {World} from "../world/World";
import {getServer} from "../utils/Utils";

export default new class WorldStruct extends Bin<World> {
    name = "World";

    unsafeWrite(bind: BufferIndex, value: any): void {
        X.string8.write(bind, value.folder);
    };

    read(bind: BufferIndex) {
        return getServer().worlds[X.string8.read(bind)];
    };

    unsafeSize(value: any): number {
        return X.string8.getSize(value.folder);
    };

    findProblem(value: any, strict?: boolean): void | undefined | string {
        return X.string8.findProblem(value.folder, strict);
    };

    get sample(): any {
        return getServer().defaultWorld;
    };
}