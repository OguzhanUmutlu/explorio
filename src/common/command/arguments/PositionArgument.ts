import {CommandArgument} from "../CommandArgument";
import {Vector2} from "../../utils/Vector2";

export class PositionArgument extends CommandArgument<Vector2> {
    read(as, at, args, index) {
        const argX = args[index].rawText;
        const argY = args[index + 1].rawText;

        if (!argY) return null;

        let x = argX * 1;
        let y = argY * 1;

        if (argX[0] === "~") x = at.x + argX.substring(1) * 1;
        else if (argX[0] === "^") x = at.x + argX.substring(1) * 1; // todo

        if (argY[0] === "~") y = at.y + argY.substring(1) * 1;
        else if (argY[0] === "^") y = at.y + argY.substring(1) * 1; // todo

        return {value: new Vector2(x, y), index: index + 2};
    };

    blindCheck(args, index) {
        const argX = args[index].rawText;
        const argY = args[index + 1].rawText;

        return {
            pass: argY
                && (!isNaN(argX * 1) || !["~", "^"].includes(argX[0]) || !isNaN(argX.substring(1) * 1))
                && (!isNaN(argY * 1) || !["~", "^"].includes(argY[0]) || !isNaN(argY.substring(1) * 1)),
            index: index + 2
        };
    };

    toString() {
        return "position";
    };
}