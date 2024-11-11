import {Command, CommandError} from "../Command";
import {SelectorToken, skipWhitespace, splitParameters} from "../CommandProcessor";
import {PositionArgument} from "../arguments/PositionArgument";
import {CommandAs} from "../CommandSender";
import {Location} from "../../utils/Location";

export class ExecuteCommand extends Command {
    posArg = new PositionArgument("position");

    constructor() {
        super("execute", "Executes a given command.", "", [], "command.execute");
    };

    execute(sender, as, at, _, label) {
        const tokens = splitParameters(label.split(" ").slice(1).join(" "));
        let entities: CommandAs<any>[] = [as];
        let locations: Record<number, Location> = {};
        for (const a of as) locations[a.id] = a.location.copy();

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            i++;
            if (token.rawText === "run") {
                let last;
                for (const entity of entities) {
                    last = sender.server.executeCommandLabel(sender, entity, locations[entity.id], token.text.substring(skipWhitespace(token.text, token.end)));
                }
                return last;
            } else if (token.rawText === "as") {
                const selector = tokens[i];
                if (!(selector instanceof SelectorToken)) throw new CommandError("Expected a selector after the 'as' keyword.");
                const oldEntities = entities;
                const oldLocations = locations;
                entities = [];
                locations = {};
                for (const entity of oldEntities) {
                    for (const ent of sender.server.executeSelector(entity, locations[entity.id], selector)) {
                        if (!entities.includes(ent)) {
                            entities.push(ent);
                            locations[ent.id] ??= oldLocations[ent.id] || ent.location.copy();
                        }
                    }
                }
            } else if (token.rawText === "at") {
                const token = tokens[i];
                if (token instanceof SelectorToken) {
                    for (const entity of entities) {
                        const loc = locations[entity.id];
                        const val = sender.server.executeSelector(entity, loc, token)[0];
                        loc.copyFrom(val.location);
                    }
                } else {
                    if (!this.posArg.blindCheck(tokens, i).pass) {
                        throw new CommandError("Expected a position after the 'at' keyword.");
                    }
                    for (const entity of entities) {
                        const loc = locations[entity.id];
                        const val = this.posArg.read(entity, loc, tokens, i);
                        loc.x = val.x;
                        loc.y = val.y;
                    }
                }
            } else if (token.rawText === "align") {
                const got = tokens[i].rawText.split("");
                const unique = Array.from(new Set(got));
                if (got.length !== unique.length) {
                    throw new CommandError(`Cannot align the position with duplicate positions: ${got}`);
                }
                if (got.some(i => i !== "x" && i !== "y")) {
                    throw new CommandError(`Cannot align the position with positions other than 'x' and 'y': ${got}`);
                }

                for (const id in locations) {
                    const loc = locations[id];
                    if (got.includes("x")) loc.x = Math.round(loc.x);
                    if (got.includes("y")) loc.y = Math.round(loc.y);
                }
            } else if (token.rawText === "anchored") {
                const val = tokens[i].rawText;
                for (const entity of entities) {
                    const loc = locations[entity.id];
                    loc.x = entity.x;
                    loc.y = entity.y + (val === "feet" || !("eyeHeight" in entity) ? 0 : entity.eyeHeight);
                }
            } else if (token.rawText === "facing") {
                const token = tokens[i];
                for (const entity of entities) {
                    const loc = locations[entity.id];
                    const pos = token instanceof SelectorToken
                        ? sender.server.executeSelector(entity, loc, token)[0].location
                        : this.posArg.read(entity, loc, tokens, i);
                    loc.rotation = "bb" in entity
                        ? loc.getRotationTowards(pos.x, pos.y, entity.bb.width, entity.bb.height)
                        : loc.getRotationTowards(pos.x, pos.y);
                }
            } else if (token.rawText === "in") {
                const folder = tokens[i].rawText;
                for (const entity of entities) {
                    const loc = locations[entity.id];
                    loc.world = <any>sender.server.worlds[folder];
                }
            } else if (token.rawText === "rotated") {
                const token = tokens[i];
                if (token instanceof SelectorToken) {
                    for (const entity of entities) {
                        const loc = locations[entity.id];
                        const val = sender.server.executeSelector(entity, loc, token)[0];
                        loc.rotation = val.rotation;
                    }
                } else if (token.type === "number") {
                    for (const entity of entities) {
                        const loc = locations[entity.id];
                        loc.rotation = <number>token.value;
                    }
                }
            } else if (token.rawText === "summon") {
                const nameToken = tokens[i];
                if (!nameToken) {
                    throw new CommandError("Expected an entity name after the 'summon' keyword.");
                }
                const name = nameToken.rawText; // todo: validate this
                const oldEntities = entities;
                const oldLocations = locations;
                entities = [];
                locations = {};
                for (const entity of oldEntities) {
                    const loc = oldLocations[entity.id];
                    const newEntity = sender.server.spawnEntityByName(loc, name); // todo: implement this
                    entities.push(newEntity);
                    locations[newEntity.id] = newEntity.location.copy();
                }
            } else if (token.rawText === "if" || token.rawText === "unless") {
                const b = 1 - (token.rawText === "if");
                if (!tokens[i]) {
                    throw new CommandError(`Expected a condition type after the '${token.rawText}' keyword.`);
                }
                const comparator = tokens[i].rawText;
                i++;
                if (comparator === "block") {
                    if (!this.posArg.blindCheck(tokens, i).pass) {
                        throw new CommandError("Expected a position after the 'if block' subcommand.");
                    }
                    const posIndex = i;
                    i += 2;
                    if (!tokens[i]) {
                        throw new CommandError("Expected a block name after the 'if block <pos>' subcommand.");
                    }
                    const blockName = tokens[i].rawText;
                    const oldEntities = entities;
                    entities = [];
                    for (const entity of oldEntities) {
                        const loc = locations[entity.id];
                        const blockPos = this.posArg.read(entity, loc, tokens, posIndex);
                        const block = entity.world.getBlock(blockPos.x, blockPos.y);
                        if (b - (block.getIdentifier() === blockName)) {
                            entities.push(entity);
                            locations[entity.id] ??= loc.copy();
                        } else delete locations[entity.id];
                    }
                } else if (comparator === "blocks") {
                    if (!this.posArg.blindCheck(tokens, i).pass) {
                        throw new CommandError("Expected a position after the 'if blocks' subcommand.");
                    }
                    const pos1Index = i;
                    i += 2;
                    if (!this.posArg.blindCheck(tokens, i).pass) {
                        throw new CommandError("Expected a destination for the 2nd argument of the 'if blocks' subcommand.");
                    }
                    const pos2Index = i;
                    i += 2;
                    if (!this.posArg.blindCheck(tokens, i).pass) {
                        throw new CommandError("Expected a destination for the 3rd argument of the 'if blocks' subcommand.");
                    }
                    const pos3Index = i;
                    i += 2;
                    const oldEntities = entities;
                    entities = [];
                    for (const entity of oldEntities) {
                        const loc = locations[entity.id];
                        const pos1 = this.posArg.read(entity, loc, tokens, pos1Index);
                        const pos2 = this.posArg.read(entity, loc, tokens, pos2Index);
                        const minX = Math.min(pos1.x, pos2.x);
                        const maxX = Math.max(pos1.x, pos2.x);
                        const minY = Math.min(pos1.y, pos2.y);
                        const maxY = Math.max(pos1.y, pos2.y);

                        const pos3 = this.posArg.read(entity, loc, tokens, pos3Index);
                        let fail = false;
                        for (let x = minX; x <= maxX; x++) {
                            for (let y = minY; y <= maxY; y++) {
                                const block = entity.world.getBlock(x, y);
                                const target = entity.world.getBlock(pos3.x + x - minX, pos3.y + y - minY);
                                if (b - (block !== target)) {
                                    fail = true;
                                    break;
                                }
                            }
                            if (fail) break;
                        }
                        if (fail) {
                            delete locations[entity.id];
                        } else {
                            entities.push(entity);
                            locations[entity.id] ??= loc.copy();
                        }
                    }
                } else if (comparator === "entity") {
                    const selector = tokens[i];
                    if (!(selector instanceof SelectorToken)) {
                        throw new CommandError("Expected a selector after the 'if entity' subcommand.");
                    }
                    i += 1;
                    const oldEntities = entities;
                    entities = [];
                    for (const entity of oldEntities) {
                        const loc = locations[entity.id];
                        const hasMatch = !!sender.server.executeSelector(entity, loc, selector)[0];
                        if (b - hasMatch) {
                            entities.push(entity);
                            locations[entity.id] ??= loc.copy();
                        } else {
                            delete locations[entity.id];
                        }
                    }
                } else if (comparator === "loaded") {
                    const xToken = tokens[i];
                    if (!xToken || xToken.type !== "number") {
                        throw new CommandError("Expected a chunk X after the 'if loaded' subcommand.");
                    }
                    const x = <number>xToken.value;
                    const oldEntities = entities;
                    entities = [];
                    for (const entity of oldEntities) {
                        const loc = locations[entity.id];
                        if (b - !!loc.world.chunks[x]) {
                            entities.push(entity);
                            locations[entity.id] ??= loc.copy();
                        } else delete locations[entity.id];
                    }
                } else if (comparator === "dimension") {
                    const folderToken = tokens[i];
                    if (!folderToken) {
                        throw new CommandError("Expected a world name after the 'if dimension' subcommand.");
                    }
                    const folder = folderToken.rawText;

                    const oldEntities = entities;
                    entities = [];
                    for (const entity of oldEntities) {
                        const loc = locations[entity.id];
                        if (b - (loc.world.folder === folder)) {
                            entities.push(entity);
                            locations[entity.id] ??= loc.copy();
                        } else delete locations[entity.id];
                    }
                } else {
                    throw new CommandError(`Unknown condition type 'if ${comparator}'.`);
                }
            } else if (token.rawText === "store") {
                // todo: /execute store
            } else {
                throw new CommandError(`Unknown subcommand '${token.rawText}'.`);
            }
        }

        return entities.length;
    };
}