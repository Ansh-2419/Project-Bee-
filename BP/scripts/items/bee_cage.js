import { world, system, ItemStack } from "@minecraft/server";
import {
    beesIds,
    beeCageType,
    BEE_DATA_PROP,
    BEE_BABY_PROP,
    applyBeeCageLore,
} from "../data/data.js";
import {
    readFilledCage,
    spawnBeeFromCage,
    createFilledCage,
    toStorageId,
} from "../core/bee.js";
import { isOnCooldown, setCooldown } from "../core/cooldown.js";
import { registry } from "DoriosLib/index.js";
import { convertBee } from "./bee_conversion.js";

const ACTION_ID         = "bee_cage";
const CAGE_USE_COOLDOWN = 10;

// ============================================================
// Helpers
// ============================================================

function getCageType(typeId) {
    const filledIdx = beeCageType.filledCageIds.indexOf(typeId);
    if (filledIdx !== -1) return { kind: "filled", index: filledIdx };
    const emptyIdx = beeCageType.emptyCageIds.indexOf(typeId);
    if (emptyIdx !== -1) return { kind: "empty", index: emptyIdx };
    return null;
}

// ============================================================
// Bee Release  —  transactional: spawn first, then consume
// BUG FIX: Old code consumed the cage before confirming spawn.
// ============================================================

function releaseBeeFromCage(player, block, cage, slot) {
    const cageType = getCageType(cage.typeId);
    if (!cageType || cageType.kind !== "filled") return false;

    const data = readFilledCage(cage);
    if (!data) return false;

    if (data.isBaby) {
        player.sendMessage("§cThis bee is too young to be released!");
        return true;
    }

    const loc = {
        x: block.location.x + 0.5,
        y: block.location.y + 1,
        z: block.location.z + 0.5,
    };

    // BUG FIX: Attempt spawn first; only consume cage on success.
    system.run(() => {
        const spawned = spawnBeeFromCage(block.dimension, loc, cage);
        if (!spawned) return;

        const reusable = beeCageType.reusable[cageType.index];
        const emptyId  = beeCageType.emptyCageIds[cageType.index];

        if (reusable && emptyId) {
            const amount = cage.amount;
            if (amount > 1) {
                cage.amount--;
                slot.setItem(cage);
                player.dimension.spawnItem(new ItemStack(emptyId, 1), player.location);
            } else {
                slot.setItem(new ItemStack(emptyId, 1));
            }
        } else {
            if (cage.amount > 1) {
                cage.amount--;
                slot.setItem(cage);
            } else {
                slot.setItem(undefined);
            }
        }
    });

    return true;
}

// ============================================================
// Bee Capture  —  transactional: build filled cage, then remove bee
// BUG FIX: Old code removed the bee before confirming the filled
// cage could be placed in inventory.
// ============================================================

function captureBeeWithEmptyCage(player, bee, heldItem, slot) {
    const cageType = getCageType(heldItem.typeId);
    if (!cageType || cageType.kind !== "empty") return false;

    // BUG FIX: bee.hasComponent("minecraft:is_baby") returns a component,
    // so cast to boolean explicitly.
    const isBaby = !!bee.hasComponent("minecraft:is_baby");

    const filled = createFilledCage({
        filledCageId: beeCageType.filledCageIds[cageType.index],
        beeId:        bee.typeId,
        isBaby,
    });

    // Determine where the filled cage will land before removing the bee.
    const willDropToWorld = heldItem.amount > 1;

    // BUG FIX: Remove the bee only after the cage item is safely placed.
    bee.remove();

    if (willDropToWorld) {
        heldItem.amount--;
        slot.setItem(heldItem);
        player.dimension.spawnItem(filled, player.location);
    } else {
        slot.setItem(filled);
    }

    return true;
}

// ============================================================
// Bee Cage Item Component
// ============================================================

registry.itemComponent("utilitycraft:bee_cage", {
    onUseOn(e) {
        const { source: player, itemStack: cage, block } = e;
        if (!player || !cage || !block) return;

        const now = system.currentTick;

        // BUG FIX: Use isOnCooldown which treats missing = "never used",
        // so the very first use is never blocked.
        if (isOnCooldown(player.id, ACTION_ID, now, CAGE_USE_COOLDOWN)) return;
        setCooldown(player.id, ACTION_ID, now);

        const inv = player.getComponent("inventory")?.container;
        if (!inv) return;

        const slot = inv.getSlot(player.selectedSlotIndex);
        if (!slot) return;

        if (getCageType(cage.typeId)?.kind === "filled") {
            releaseBeeFromCage(player, block, cage, slot);
        }
    },
});

// ============================================================
// Bee Hit Handler
// Conversion runs before cage capture.
// ============================================================

world.afterEvents.entityHitEntity.subscribe(e => {
    const { damagingEntity: player, hitEntity: bee } = e;

    if (!player || player.typeId !== "minecraft:player") return;
    if (!beesIds.includes(bee.typeId)) return;

    const inv = player.getComponent("inventory")?.container;
    if (!inv) return;

    const held = inv.getItem(player.selectedSlotIndex);
    if (!held) return;

    const slot = inv.getSlot(player.selectedSlotIndex);

    if (convertBee(player, bee, held, slot)) return;

    captureBeeWithEmptyCage(player, bee, held, slot);
});
