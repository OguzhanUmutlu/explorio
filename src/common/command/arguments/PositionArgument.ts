import CommandArgument from "@/command/CommandArgument";
import Vector2 from "@/utils/Vector2";
import {CommandAs} from "@/command/CommandSender";
import Location from "@/utils/Location";
import {AnyToken} from "@/command/CommandProcessor";

export default class PositionArgument extends CommandArgument<Vector2> {
    default = new Vector2(0, 0);

    read(_: CommandAs, at: Location, args: AnyToken[], index: number) {
        const argX = args[index].rawText;
        const argY = args[index + 1].rawText;

        if (!argY) return null;

        let x = +argX;
        let y = +argY;

        if (argX[0] === "~") x = at.x + +argX.substring(1);
        else if (argX[0] === "^") x = at.x + +argX.substring(1); // todo

        if (argY[0] === "~") y = at.y + +argY.substring(1);
        else if (argY[0] === "^") y = at.y + +argY.substring(1); // todo

        return new Vector2(x, y);
    };

    blindCheck(args: AnyToken[], index: number) {
        if (!args[index] || !args[index + 1]) return {pass: false, index: index + 2};

        const argX = args[index].rawText;
        const argY = args[index + 1].rawText;

        return {
            pass: argY
                && (!isNaN(+argX) || !["~", "^"].includes(argX[0]) || !isNaN(+argX.substring(1)))
                && (!isNaN(+argY) || !["~", "^"].includes(argY[0]) || !isNaN(+argY.substring(1))),
            index: index + 2
        };
    };

    toString() {
        return "position";
    };
}