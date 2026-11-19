// ============================================================
// Project Bee — Simulator Upgrade Item
//
// When inserted into an upgrade slot of the Advance Beehive,
// the beehive no longer needs real bees flying in. Instead it
// treats whichever bee item is already sitting in a bee slot
// as a permanent "virtual" bee and keeps producing combs
// continuously. The bee items are never consumed.
//
// ScriptEvent: projectbee:give_simulator_upgrade
//   — gives the upgrade to the nearest player (dev/admin tool)
// ============================================================

import { world, system, ItemStack } from "@minecraft/server";
import * as DoriosLib from "DoriosLib/index.js";

const ITEM_ID = "utilitycraft:simulator_upgrade";

// ── Item component ─────────────────────────────────────────────
// BUG FIX: Removed the empty onUseOn handler — registering a custom
// component with no behaviour has no gameplay effect and adds noise.

DoriosLib.registry.itemComponent(ITEM_ID, {
    // No item-level handlers needed; the beehive block component reads
    // upgrade slots on every tick and reacts accordingly.
});

// ── ScriptEvent: give upgrade to nearest player ────────────────
// Usage: /scriptevent projectbee:give_simulator_upgrade {}
//
// BUG FIX: "world.getAllPlayers()[0]" is the first player returned by
// the engine, not necessarily the nearest one. When sourceEntity is a
// player this is now used directly. For command-block invocations a
// true nearest-player search is performed instead of relying on
// array position.

system.afterEvents.scriptEventReceive.subscribe(({ id, sourceEntity }) => {
    if (id !== "projectbee:give_simulator_upgrade") return;

    let player;

    if (sourceEntity?.typeId === "minecraft:player") {
        player = sourceEntity;
    } else {
        // Find the nearest player to the source entity, or any player.
        const allPlayers = world.getAllPlayers();
        if (!allPlayers.length) return;

        if (sourceEntity) {
            const loc = sourceEntity.location;
            player = allPlayers.reduce((nearest, p) => {
                const dx = p.location.x - loc.x;
                const dy = p.location.y - loc.y;
                const dz = p.location.z - loc.z;
                const dist = dx * dx + dy * dy + dz * dz;
                const ndx  = nearest.location.x - loc.x;
                const ndy  = nearest.location.y - loc.y;
                const ndz  = nearest.location.z - loc.z;
                const ndist = ndx * ndx + ndy * ndy + ndz * ndz;
                return dist < ndist ? p : nearest;
            });
        } else {
            player = allPlayers[0];
        }
    }

    if (!player) return;

    const inv = player.getComponent("minecraft:inventory")?.container;
    if (!inv) return;

    const upgrade  = new ItemStack(ITEM_ID, 1);
    const leftover = inv.addItem(upgrade);
    if (leftover) {
        player.dimension.spawnItem(leftover, player.location);
    }

    player.sendMessage("§a[Project Bee] Simulator Upgrade added to your inventory.");
});
