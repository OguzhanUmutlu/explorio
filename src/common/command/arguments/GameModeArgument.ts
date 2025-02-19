import CommandArgument from "@/command/CommandArgument";
import {CommandAs} from "@/command/CommandSender";
import Location from "@/utils/Location";
import {AnyToken} from "@/command/CommandProcessor";
import X from "stramp";

export enum GameMode {
    Survival,
    Creative,
    Adventure,
    Spectator
}

export const GameModeNames = ["survival", "creative", "adventure", "spectator"];
const GameModeValues = [GameMode.Survival, GameMode.Creative, GameMode.Adventure, GameMode.Spectator];

export const GameModeStruct = X.any.ofValues(...GameModeValues);

export default class GameModeArgument extends CommandArgument<GameMode> {
    default = GameMode.Survival;

    read(_: CommandAs, __: Location, args: AnyToken[], index: number) {
        const arg = args[index];
        const raw = arg.rawText;

        if (GameModeNames.includes(raw)) {
            return GameModeValues[raw];
        }

        return +raw;
    };

    blindCheck(args: AnyToken[], index: number) {
        const arg = args[index];

        if (!arg) return {
            error: {
                token: null,
                message: "Expected a game mode"
            }, index: index + 1
        };
        const raw = arg.rawText;
        const num = +raw;

        return {
            error: GameModeNames.includes(raw) || !isNaN(num) && num >= 0 && num <= 3 ? null : {
                token: arg,
                message: "Expected a valid game mode"
            }, index: index + 1
        };
    };

    toString() {
        return "gamemode";
    };
}