import { world, system, ItemStack } from "@minecraft/server";
import {
    beesIds,
    beeCageType,
    BEE_DATA_PROP,
    BEE_BABY_PROP,
    applyBeeCageLore
} from "../data/data.js";
import { registry } from "DoriosLib/index.js";

const CAGE_USE_COOLDOWN = 10;
const lastUseTick = new Map();

const BEE_CONVERSIONS = {
    "utilitycraft:diamond_bee": {
        itemId: "minecraft:netherite_block",
        result: "utilitycraft:netherite_bee",
    },
    "utilitycraft:duranium_bee": {
        itemId: "utilitycraft:voltanium_block",
        result: "utilitycraft:voltanium_bee",
    },
    "utilitycraft:voltanium_bee": {
        itemId: "utilitycraft:adamant_block",
        result: "utilitycraft:adamant_bee",
    },
};

// ── Helpers ────────────────────────────────────────────────────

function getCageType(typeId) {
    const filledIdx = beeCageType.filledCageIds.indexOf(typeId);
    if (filledIdx !== -1) return { kind: "filled", index: filledIdx };
    const emptyIdx = beeCageType.emptyCageIds.indexOf(typeId);
    if (emptyIdx !== -1) return { kind: "empty", index: emptyIdx };
    return null;
}

function fillCage(beeEntity, filledId) {
    const isBaby = beeEntity.hasComponent("minecraft:is_baby");
    const filled = new ItemStack(filledId, 1);
    filled.setDynamicProperty(BEE_DATA_PROP, beeEntity.typeId);
    filled.setDynamicProperty(BEE_BABY_PROP, isBaby);
    applyBeeCageLore(filled, beeEntity.typeId, isBaby);
    return filled;
}

function consumeOrSplit(slot, stack, spawn) {
    if (stack.amount > 1) {
        stack.amount--;
        slot.setItem(stack);
        spawn();
    } else {
        spawn();
        slot.setItem(undefined);
    }
}

// ── Bee conversion ─────────────────────────────────────────────
// Returns true if the held item matched a conversion recipe
// (whether or not the cooldown allowed the conversion to fire).
// Capture loc + dim BEFORE system.run so they are valid even if
// the bee dies from the hit before the next tick.

function convertBee(player, bee, heldItem, slot) {
    const conv = BEE_CONVERSIONS[bee.typeId];
    if (!conv) return false;
    if (heldItem?.typeId !== conv.itemId) return false;

    const now = system.currentTick;
    const key = `conv_${player.id}`;
    if ((lastUseTick.get(key) ?? 0) + CAGE_USE_COOLDOWN > now) return true;
    lastUseTick.set(key, now);

    // Capture location and dimension now — before system.run and before
    // any remove() call, so they stay valid inside the deferred callback.
    const loc = { ...bee.location };
    const dim = bee.dimension;

    system.run(() => {
        try {
            // Consume one conversion item
            const current = slot.getItem();
            if (current?.typeId === conv.itemId) {
                if (current.amount > 1) {
                    current.amount--;
                    slot.setItem(current);
                } else {
                    slot.setItem(undefined);
                }
            }

            // Remove the bee (might already be dead from the hit — that is fine)
            if (bee.isValid()) bee.remove();

            // Spawn the converted bee at the captured location
            dim.spawnEntity(conv.result, loc);

            const name = conv.result.split(":")[1]
                .replace(/_/g, " ")
                .replace(/\b\w/g, c => c.toUpperCase());
            player.sendMessage(`§aConverted to §e${name}§a!`);
        } catch (err) {
            console.warn(`[Project Bee] Conversion error: ${err}`);
        }
    });

    return true;
}

// ── Cage release ───────────────────────────────────────────────

function releaseBeeFromCage(player, block, cage, slot) {
    const cageType = getCageType(cage.typeId);
    if (!cageType || cageType.kind !== "filled") return false;

    const isBaby = cage.getDynamicProperty(BEE_BABY_PROP);
    if (isBaby) {
        player.sendMessage("§cThis bee is too young to be released!");
        return true;
    }

    const beeId = cage.getDynamicProperty(BEE_DATA_PROP);
    if (typeof beeId !== "string") return false;

    const spawnId = beeId === "utilitycraft:bee" ? "minecraft:bee" : beeId;
    const loc = { x: block.x + 0.5, y: block.y + 1, z: block.z + 0.5 };

    system.run(() => {
        try { block.dimension.spawnEntity(spawnId, loc); }
        catch (err) { console.warn(`[Project Bee] Release failed: ${err}`); }
    });

    const reusable = beeCageType.reusable[cageType.index];
    const emptyId  = beeCageType.emptyCageIds[cageType.index];

    if (reusable && emptyId) {
        consumeOrSplit(slot, cage, () => {
            if (cage.amount > 1) player.dimension.spawnItem(new ItemStack(emptyId, 1), player.location);
            else slot.setItem(new ItemStack(emptyId, 1));
        });
    } else {
        if (cage.amount > 1) { cage.amount--; slot.setItem(cage); }
        else slot.setItem(undefined);
    }

    return true;
}

// ── Cage capture ───────────────────────────────────────────────

function captureBeeWithEmptyCage(player, bee, heldItem, slot) {
    const cageType = getCageType(heldItem.typeId);
    if (!cageType || cageType.kind !== "empty") return false;

    const filled = fillCage(bee, beeCageType.filledCageIds[cageType.index]);
    bee.remove();

    if (heldItem.amount > 1) {
        heldItem.amount--;
        slot.setItem(heldItem);
        player.dimension.spawnItem(filled, player.location);
    } else {
        slot.setItem(filled);
    }

    return true;
}

// ── Cage item component (right-click on block to release) ──────

registry.itemComponent("utilitycraft:bee_cage", {
    onUseOn(e) {
        const { source: player, itemStack: cage, block } = e;
        if (!player || !cage || !block) return;

        const now = system.currentTick;
        const key = player.id;
        if ((lastUseTick.get(key) ?? 0) + CAGE_USE_COOLDOWN > now) return;
        lastUseTick.set(key, now);

        const inv = player.getComponent("inventory")?.container;
        if (!inv) return;
        const slot = inv.getSlot(player.selectedSlotIndex);
        if (!slot) return;

        if (getCageType(cage.typeId)?.kind === "filled") {
            releaseBeeFromCage(player, block, cage, slot);
        }
    },
});

// ── Hit a bee to convert or catch it (works on Android) ───────
// Order: conversion check first, then cage catch.
// playerInteractWithEntity is NOT used because bee entities have
// no minecraft:interact component — the interact button never
// appears on mobile, so that event is unreachable on Android.

world.afterEvents.entityHitEntity.subscribe(e => {
    const { damagingEntity: player, hitEntity: bee } = e;
    if (!player || player.typeId !== "minecraft:player") return;
    if (!beesIds.includes(bee.typeId)) return;

    const inv = player.getComponent("inventory")?.container;
    if (!inv) return;
    const held = inv.getItem(player.selectedSlotIndex);
    if (!held) return;
    const slot = inv.getSlot(player.selectedSlotIndex);

    // 1. Try conversion first (conversion item takes priority over cage)
    if (convertBee(player, bee, held, slot)) return;

    // 2. Try capturing with an empty cage
    captureBeeWithEmptyCage(player, bee, held, slot);
});