import {CommandArgument} from "../CommandArgument";

export enum GameMode {
    Survival,
    Creative,
    Adventure,
    Spectator
}

const GameModeNames = ["survival", "creative", "adventure", "spectator"];
const GameModeValues = [GameMode.Survival, GameMode.Creative, GameMode.Adventure, GameMode.Spectator];

export class GameModeArgument extends CommandArgument<GameMode> {
    read(as, at, args, index) {
        const arg = args[index];
        const raw = arg.rawText;

        if (GameModeNames.includes(raw)) {
            return {value: <GameMode>GameModeValues[raw], index: index + 1};
        }

        return {value: <GameMode>raw * 1, index: index + 1};
    };

    blindCheck(args, index) {
        const arg = args[index];
        const raw = arg.rawText;
        const num = raw * 1;

        return {pass: GameModeNames.includes(raw) || !isNaN(num) && num >= 0 && num <= 3, index: index + 1};
    };

    toString() {
        return "gamemode";
    };
}