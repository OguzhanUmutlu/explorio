import CommandArgument from "@/command/CommandArgument";
import Vector2 from "@/utils/Vector2";
import {CommandAs} from "@/command/CommandSender";
import Position from "@/utils/Position";
import {AnyToken} from "@/command/CommandProcessor";

export default class PositionArgument extends CommandArgument<Vector2> {
    default = new Vector2(0, 0);

    read(_: CommandAs, at: Position, args: AnyToken[], index: number) {
        const argX = args[index].rawText;
        const argY = args[index + 1].rawText;

        if (!argY) return null;

        let x = +argX;
        let y = +argY;

        if (argX[0] === "~") x = at.x + +argX.substring(1);
        else if (argX[0] === "^") x = at.x + +argX.substring(1) * Math.cos(at.rotation / 180 * Math.PI);

        if (argY[0] === "~") y = at.y + +argY.substring(1);
        else if (argY[0] === "^") y = at.y - +argY.substring(1) * Math.sin(at.rotation / 180 * Math.PI);

        return new Vector2(x, y);
    };

    blindCheck(args: AnyToken[], index: number) {
        const arg0 = args[index];
        const arg1 = args[index + 1];

        if (!arg0 || !arg1) return {
            error: {
                token: null,
                message: "Expected two numbers representing the position"
            }, index: index + 2
        };

        const argX = arg0.rawText;
        const argY = arg1.rawText;

        return {
            error: argY
            && (!isNaN(+argX) || !["~", "^"].includes(argX[0]) || !isNaN(+argX.substring(1)))
            && (!isNaN(+argY) || !["~", "^"].includes(argY[0]) || !isNaN(+argY.substring(1))) ? null : {
                token: arg1,
                message: "Expected two numbers representing the position"
            },
            index: index + 2
        };
    };

    toString() {
        return "position";
    };
}