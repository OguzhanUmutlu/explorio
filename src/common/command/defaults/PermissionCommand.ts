import {DefinitiveCommand} from "../DefinitiveCommand";
import {CommandDefinition} from "../CommandDefinition";
import {Player} from "../../entity/types/Player";
import {CommandError} from "../Command";

export class PermissionCommand extends DefinitiveCommand {
    constructor() {
        super("permission", "Grants/revokes/checks the given permission of the given player.", [], "command.permission");
    };

    definitions = [
        new CommandDefinition()
            .addLabelArgument("grant")
            .addEntityArgument("player", o => o.setFilter(i => i instanceof Player))
            .addTextArgument("permission")
            .then((sender, _, __, player: Player, permission) => {
                if (!sender.hasPermission(permission)) {
                    throw new CommandError("You can't grant someone with a permission you don't have!");
                }

                // Not using .hasPermission here because the player might have "x.y.*" permission and if you want to add
                // specifically "x.y.z" permission again, hasPermission would say you already have it.
                if (player.permissions.has(permission)) {
                    throw new CommandError("This player already has this permission!");
                }

                player.permissions.add(permission);

                sender.sendMessage("§aThe player " + player.name + " has been granted the permission '" + permission + "'!");
            }),
        new CommandDefinition()
            .addLabelArgument("revoke")
            .addEntityArgument("player", o => o.setFilter(i => i instanceof Player))
            .addTextArgument("permission")
            .then((sender, _, __, player: Player, permission) => {
                if (!sender.hasPermission(permission)) {
                    throw new CommandError("You can't revoke someone with a permission you don't have!");
                }

                if (!player.permissions.has(permission)) {
                    throw new CommandError("This player already doesn't have this permission!");
                }

                player.permissions.delete(permission);

                sender.sendMessage("§aThe player " + player.name + " has been revoked the permission '" + permission + "'!");
            }),
        new CommandDefinition()
            .addLabelArgument("check")
            .addEntityArgument("player", o => o.setFilter(i => i instanceof Player))
            .addTextArgument("permission")
            .then((sender, _, __, player: Player, permission) => {
                if (player.permissions.has(permission)) {
                    sender.sendMessage("§aThe player " + player.name + " has the permission '" + permission + "'!");
                } else {
                    sender.sendMessage("§cThe player " + player.name + " doesn't have the permission '" + permission + "'!");
                }
            })
    ];
}