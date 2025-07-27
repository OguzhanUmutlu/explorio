import DefinitiveCommand from "@/command/DefinitiveCommand";
import CommandDefinition from "@/command/CommandDefinition";
import {accessPathSafely, anyToNumber, formatDataForChat, operatePathSafely, splitPathSafely} from "@/utils/Utils";
import CommandError from "@/command/CommandError";
import NumberArgument from "@/command/arguments/NumberArgument";
import TextArgument from "@/command/arguments/TextArgument";
import ArrayArgument from "@/command/arguments/ArrayArgument";
import ObjectArgument from "@/command/arguments/ObjectArgument";

export function dataAccess(data: unknown, path: string, scale: number) {
    try {
        data = path ? accessPathSafely(data, splitPathSafely(path)) : data;
    } catch (e) {
        throw new CommandError("Path error: " + e.message);
    }

    if (scale) {
        if (typeof data !== "number") throw new CommandError("Scale argument is only allowed when the data holds a number.");
        (<number>data) *= scale;
    }

    return data;
}

export function dataOperate(data: unknown, path: string, operator: string, value: unknown) {
    try {
        operatePathSafely(data, path, operator, value);
    } catch (e) {
        throw new CommandError("Path error: " + e.message);
    }
}

export default class DataCommand extends DefinitiveCommand {
    constructor() {
        super("data", "Allows get, merge, modify, operation, remove on blocks, entities or storages.", [], "command.data");
    };

    definitions = [
        new CommandDefinition()
            .addLabelArgument("get")
            .addLabelArgument("entity")
            .addEntityArgument("entity")
            .addTextArgument("path", o => o.setOptional())
            .addNumberArgument("scale", o => o.setOptional())
            .then((sender, _, __, entity, path, scale) => {
                const data = dataAccess(entity.data, path, scale);
                sender.sendMessage("Entity §a" + entity.name + "§r's data" + (path ? " for §a" + path + " §ris" : "") + ":\n" + formatDataForChat(data));
                return anyToNumber(data);
            }),
        new CommandDefinition()
            .addLabelArgument("get")
            .addLabelArgument("storage")
            .addTextArgument("path", o => o.setOptional())
            .addNumberArgument("scale", o => o.setOptional())
            .then((sender, _, __, path, scale) => {
                const data = dataAccess(sender.server.storage, path, scale);
                sender.sendMessage("Storage's data" + (path ? " for §a" + path + " §ris" : "") + ":\n" + formatDataForChat(data));
                return anyToNumber(data);
            }),
        new CommandDefinition()
            .addLabelArgument("set")
            .addLabelArgument("storage")
            .addTextArgument("path")
            .addOneOfArgument("value", o => o.setArgs([
                new NumberArgument(""),
                new TextArgument(""),
                new ArrayArgument(""),
                new ObjectArgument("")
            ] as const))
            .then((sender, _, __, path, value) => {
                dataOperate(sender.server.storage, path, "=", value);
                sender.sendMessage("Storage's data" + " for §a" + path + " §ris set to" + ": " + formatDataForChat(value));
            }),
        new CommandDefinition()
            .addLabelArgument("operate")
            .addLabelArgument("storage")
            .addTextArgument("path1")
            .addTextArgument("op", o => o.addChoices(["+", "-", "*", "/", "**", "%", ">>", "<<", "&", "|", "^", "&&", "||"]))
            .addTextArgument("path2")
            .then((sender, _, __, path1, op, path2) => {
                const value = dataAccess(sender.server.storage, path2, null);
                dataOperate(sender.server.storage, path1, op, value);
                sender.sendMessage("Storage's data" + " for §a" + path1 + " §ris set to" + ": " + formatDataForChat(value));
                return anyToNumber(value);
            }),
        new CommandDefinition()
            .addLabelArgument("append")
            .addLabelArgument("storage")
            .addTextArgument("path1")
            .addTextArgument("path2")
            .then((sender, _, __, path1, path2) => {
                const value = dataAccess(sender.server.storage, path2, null);
                dataOperate(sender.server.storage, path1, "append", value);
                sender.sendMessage("Storage's data" + " for §a" + path1 + " §ris set to" + ": " + formatDataForChat(value));
                return anyToNumber(value);
            })
    ];
}