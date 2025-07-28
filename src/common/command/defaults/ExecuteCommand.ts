import Command from "@/command/Command";
import CommandError from "@/command/CommandError";
import {skipWhitespace, splitParameters} from "@/command/CommandProcessor";
import SelectorToken from "@/command/token/SelectorToken";
import PositionArgument from "@/command/arguments/PositionArgument";
import CommandSender, {CommandAs} from "@/command/CommandSender";
import Position from "@/utils/Position";
import {dataOperate} from "@/command/defaults/DataCommand";

type StoreStorage = string; // just path
type StoreEntity = { selector: SelectorToken, path: string };

export default class ExecuteCommand extends Command {
    posArg = new PositionArgument("position");

    constructor() {
        super("execute", "Executes a given command.", "", [], "command.execute");
    };

    execute(sender: CommandSender, as: CommandAs, at: Position, __: string[], label: string) {
        const tokens = splitParameters(label.split(" ").slice(1).join(" "));

        if (tokens.length === 0) throw new CommandError("No instruction to execute. Try:\n" +
            "§c/execute run <...command>\n" +
            "§c/execute as <selector>\n" +
            "§c/execute at <position>\n" +
            "§c/execute align x|y|xy\n" +
            "§c/execute anchored feet|eyes\n" +
            "§c/execute facing <selector>\n" +
            "§c/execute facing <position>\n" +
            "§c/execute in <world>\n" +
            "§c/execute rotated <selector>\n" +
            "§c/execute rotated <degrees>\n" +
            "§c/execute store result storage <path>\n" +
            "§c/execute store result entity <entity> <path>\n" +
            "§c/execute store success storage <path>\n" +
            "§c/execute store success entity <entity> <path>\n" +
            "§c/execute if|unless block <position> <block>\n" +
            "§c/execute if|unless blocks <start: position> <end: position> <target: position>\n" +
            "§c/execute if|unless entity <selector>\n" +
            "§c/execute if|unless loaded <chunkX>\n" +
            "§c/execute if|unless world <world>");

        const store = {
            result: {
                storage: [] as StoreStorage[],
                entity: [] as StoreEntity[]
            },
            success: {
                storage: [] as StoreStorage[],
                entity: [] as StoreEntity[]
            }
        };
        let entities: CommandAs[] = [as];
        let positions: Record<number, Position> = {};
        positions[as.id] = at.copyPosition();

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i++];
            if (token.rawText === "run") {
                if (entities.length === 0) return;

                let last: number;

                for (const entity of entities) {
                    const response = sender.server.executeCommandLabel(sender, entity, positions[entity.id], token.originalText.substring(skipWhitespace(token.originalText, token.end)));
                    if (response instanceof CommandError) {
                        for (const {selector, path} of store.success.entity) {
                            // todo: entity data operate
                        }
                        for (const path of store.success.storage) {
                            dataOperate(sender.server.storage, path, "=", 0);
                        }

                        if (last !== undefined) {
                            for (const {selector, path} of store.result.entity) {
                                // todo: entity data operate
                            }
                            for (const path of store.result.storage) {
                                dataOperate(sender.server.storage, path, "=", last);
                            }
                        }

                        throw response;
                    }
                    last = response;
                }

                for (const {selector, path} of store.success.entity) {
                    // todo: entity data operate
                }
                for (const path of store.success.storage) {
                    dataOperate(sender.server.storage, path, "=", 1);
                }
                for (const {selector, path} of store.result.entity) {
                    // todo: entity data operate
                }
                for (const path of store.result.storage) {
                    dataOperate(sender.server.storage, path, "=", last);
                }

                return;
            } else if (token.rawText === "as") {
                const selector = tokens[i];
                if (!(selector instanceof SelectorToken)) throw new CommandError("Expected a selector after the 'as' keyword.");
                const oldEntities = entities;
                const oldLocations = positions;
                entities = [];
                positions = {};

                for (const entity of oldEntities) {
                    for (const ent of sender.server.executeSelector(entity, positions[entity.id], selector)) {
                        if (!entities.includes(ent)) {
                            entities.push(ent);
                            positions[ent.id] ??= oldLocations[ent.id] || ent.copyPosition();
                        }
                    }
                }
            } else if (token.rawText === "at") {
                const token = tokens[i];
                if (token instanceof SelectorToken) {
                    for (const entity of entities) {
                        const loc = positions[entity.id];
                        const val = sender.server.executeSelector(entity, loc, token)[0];
                        loc.setPositionFrom(val);
                    }
                } else {
                    if (this.posArg.blindCheck(tokens, i).error) {
                        throw new CommandError("Expected a position after the 'at' keyword.");
                    }

                    for (const entity of entities) {
                        const loc = positions[entity.id];
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

                for (const id in positions) {
                    const loc = positions[id];
                    if (got.includes("x")) loc.x = Math.round(loc.x);
                    if (got.includes("y")) loc.y = Math.round(loc.y);
                }
            } else if (token.rawText === "anchored") {
                const val = tokens[i].rawText;

                if (val !== "feet" && val !== "eyes") {
                    throw new CommandError("Expected 'feet' or 'eyes' after the 'anchored' keyword.");
                }

                for (const entity of entities) {
                    const loc = positions[entity.id];
                    loc.x = entity.x;
                    loc.y = entity.y + (val === "feet" || !("eyeHeight" in entity) ? 0 : entity.eyeHeight);
                }
            } else if (token.rawText === "facing") {
                const token = tokens[i];
                for (const entity of entities) {
                    const loc = positions[entity.id];
                    const pos = token instanceof SelectorToken
                        ? sender.server.executeSelector(entity, loc, token)[0]
                        : this.posArg.read(entity, loc, tokens, i);
                    loc.rotation = "bb" in entity
                        ? loc.getRotationTowards(pos.x, pos.y, entity.bb.width, entity.bb.height)
                        : loc.getRotationTowards(pos.x, pos.y);
                }
            } else if (token.rawText === "in") {
                const folder = tokens[i].rawText;

                if (!(folder in sender.server.worlds)) {
                    throw new CommandError(`World '${folder}' does not exist.`);
                }

                for (const entity of entities) {
                    const loc = positions[entity.id];
                    loc.world = sender.server.worlds[folder];
                }
            } else if (token.rawText === "rotated") {
                const token = tokens[i];
                if (token instanceof SelectorToken) {
                    for (const entity of entities) {
                        const loc = positions[entity.id];
                        const val = sender.server.executeSelector(entity, loc, token)[0];
                        loc.rotation = val.rotation;
                    }
                } else if (token.type === "number") {
                    for (const entity of entities) {
                        const loc = positions[entity.id];
                        loc.rotation = <number>token.value;
                    }
                }
            } else if (token.rawText === "summon") {
                const nameToken = tokens[i];

                if (!nameToken) {
                    throw new CommandError("Expected an entity name after the 'summon' keyword.");
                }

                const name = nameToken.rawText;

                if (!(name in sender.server.entityNameToId)) {
                    throw new CommandError(`Entity '${name}' does not exist.`);
                }

                const oldEntities = entities;
                const oldLocations = positions;
                entities = [];
                positions = {};

                for (const entity of oldEntities) {
                    const loc = oldLocations[entity.id];
                    const newEntity = loc.world.summonEntity(sender.server.entityNameToId[name], loc.x, loc.y);
                    entities.push(newEntity);
                    positions[newEntity.id] = newEntity.copyPosition();
                }
            } else if (token.rawText === "if" || token.rawText === "unless") {
                const b = 1 - +(token.rawText === "if");

                if (!tokens[i]) {
                    throw new CommandError(`Expected a condition type after the '${token.rawText}' keyword.`);
                }

                const comparator = tokens[i].rawText;
                i++;
                if (comparator === "block") {
                    if (this.posArg.blindCheck(tokens, i).error) {
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
                        const loc = positions[entity.id];
                        const blockPos = this.posArg.read(entity, loc, tokens, posIndex);
                        const block = entity.world.getBlock(blockPos.x, blockPos.y);
                        if (b - +(block.getIdentifier() === blockName)) {
                            entities.push(entity);
                            positions[entity.id] ??= loc.copyPosition();
                        } else delete positions[entity.id];
                    }
                } else if (comparator === "blocks") {
                    if (this.posArg.blindCheck(tokens, i)) {
                        throw new CommandError("Expected a position after the 'if blocks' subcommand.");
                    }

                    const pos1Index = i;
                    i += 2;

                    if (this.posArg.blindCheck(tokens, i)) {
                        throw new CommandError("Expected a destination for the 2nd argument of the 'if blocks' subcommand.");
                    }

                    const pos2Index = i;
                    i += 2;

                    if (this.posArg.blindCheck(tokens, i)) {
                        throw new CommandError("Expected a destination for the 3rd argument of the 'if blocks' subcommand.");
                    }

                    const pos3Index = i;
                    i += 2;
                    const oldEntities = entities;
                    entities = [];
                    for (const entity of oldEntities) {
                        const loc = positions[entity.id];
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
                                if (b - +(block !== target)) {
                                    fail = true;
                                    break;
                                }
                            }
                            if (fail) break;
                        }
                        if (fail) {
                            delete positions[entity.id];
                        } else {
                            entities.push(entity);
                            positions[entity.id] ??= loc.copyPosition();
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
                        const loc = positions[entity.id];
                        const hasMatch = !!sender.server.executeSelector(entity, loc, selector)[0];
                        if (b - +hasMatch) {
                            entities.push(entity);
                            positions[entity.id] ??= loc.copyPosition();
                        } else {
                            delete positions[entity.id];
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
                        const loc = positions[entity.id];
                        if (b + +!loc.world.chunks[x]) {
                            entities.push(entity);
                            positions[entity.id] ??= loc.copyPosition();
                        } else delete positions[entity.id];
                    }
                } else if (comparator === "world") {
                    const folderToken = tokens[i];

                    if (!folderToken) {
                        throw new CommandError("Expected a world name after the 'if world' subcommand.");
                    }

                    const folder = folderToken.rawText;

                    const oldEntities = entities;
                    entities = [];
                    for (const entity of oldEntities) {
                        const loc = positions[entity.id];
                        if (b - +(loc.world.folder === folder)) {
                            entities.push(entity);
                            positions[entity.id] ??= loc.copyPosition();
                        } else delete positions[entity.id];
                    }
                } else {
                    throw new CommandError(`Unknown condition type 'if ${comparator}'.`);
                }
            } else if (token.rawText === "store") {
                const type = tokens[i++].rawText;
                if (type !== "result" && type !== "success") {
                    throw new CommandError(`Unknown store type '${type}'.`);
                }

                const storageType = tokens[i++].rawText;
                if (storageType !== "storage" && storageType !== "entity") {
                    throw new CommandError(`Unknown storage type '${storageType}'.`);
                }

                if (storageType === "storage") {
                    if (this.posArg.blindCheck(tokens, i).error) {
                        throw new CommandError("Expected a storage path after the 'store' keyword.");
                    }
                    const path = tokens[i++].rawText;
                    store[type].storage.push(path);
                } else {
                    const selector = tokens[i];
                    if (!(selector instanceof SelectorToken)) {
                        throw new CommandError("Expected a selector after the 'store entity' keyword.");
                    }
                    i++;
                    if (this.posArg.blindCheck(tokens, i).error) {
                        throw new CommandError("Expected a storage path after the 'store entity' keyword.");
                    }
                    const path = tokens[i++].rawText;
                    store[type].entity.push({selector, path});
                }
            } else {
                throw new CommandError(`Unknown subcommand '${token.rawText}'.`);
            }
        }

        return entities.length;
    };
}