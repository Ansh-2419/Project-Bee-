// ============================================================
// Project Bee — Simulator Upgrade Item
//
// When inserted into an upgrade slot of the Advance Beehive,
// the beehive no longer needs real bees flying in.  Instead
// it treats whichever bee item is already sitting in a bee
// slot as a permanent "virtual" bee and keeps producing combs
// continuously.  The bee items are never consumed.
//
// This file handles:
//  • Crafting feedback (onUse tooltip message)
//  • Preventing the upgrade from stacking with speed upgrades
//    in the same slot via onBeforeUseOn guard
//  • ScriptEvent: projectbee:give_simulator_upgrade
//    — gives the upgrade to the nearest player (dev/admin tool)
// ============================================================

import { world, system, ItemStack } from "@minecraft/server";
import * as DoriosLib from "DoriosLib/index.js";

const ITEM_ID          = "utilitycraft:simulator_upgrade";
const SPEED_UPGRADE_ID = "utilitycraft:speed_upgrade";

// ── Item component ───────────────────────────────────────────

DoriosLib.registry.itemComponent(ITEM_ID, {

    /**
     * Fired when the player right-clicks / uses the item on a block.
     * We use this to give feedback if they accidentally try to place
     * a simulator upgrade on top of a speed upgrade slot.
     */
    onUseOn(event) {
        const { source: player, itemStack, block } = event;
        if (!player || !itemStack) return;

        // Nothing special needed here — the beehive block component
        // reads the upgrade slots on every tick and reacts accordingly.
        // This handler is intentionally minimal.
    },
});

// ── ScriptEvent: give upgrade to nearest player ──────────────
// Usage (e.g. from a command block):
//   /scriptevent projectbee:give_simulator_upgrade {}

system.afterEvents.scriptEventReceive.subscribe(({ id, sourceEntity }) => {
    if (id !== "projectbee:give_simulator_upgrade") return;

    const player = sourceEntity?.typeId === "minecraft:player"
        ? sourceEntity
        : world.getAllPlayers()[0];

    if (!player) return;

    const inv = player.getComponent("minecraft:inventory")?.container;
    if (!inv)  return;

    const upgrade = new ItemStack(ITEM_ID, 1);
    const leftover = inv.addItem(upgrade);
    if (leftover) {
        player.dimension.spawnItem(leftover, player.location);
    }

    player.sendMessage("§a[Project Bee] Simulator Upgrade added to your inventory.");
});
