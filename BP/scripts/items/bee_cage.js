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
    }
};

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
    const loc = {
        x: block.x + 0.5,
        y: block.y + 1,
        z: block.z + 0.5
    };

    system.run(() => {
        try {
            block.dimension.spawnEntity(spawnId, loc);
        } catch (err) {
            console.warn(`[Project Bee] Release failed: ${err}`);
        }
    });

    const reusable = beeCageType.reusable[cageType.index];
    const emptyId = beeCageType.emptyCageIds[cageType.index];

    if (reusable && emptyId) {
        consumeOrSplit(slot, cage, () => {
            if (cage.amount > 1) {
                player.dimension.spawnItem(new ItemStack(emptyId, 1), player.location);
            } else {
                slot.setItem(new ItemStack(emptyId, 1));
            }
        });
    } else {
        if (cage.amount > 1) {
            cage.amount--;
            slot.setItem(cage);
        } else {
            slot.setItem(undefined);
        }
    }

    return true;
}

function convertBee(player, bee, heldItem, slot) {
    const conv = BEE_CONVERSIONS[bee.typeId];
    if (!conv) return false;

    if (heldItem?.typeId !== conv.itemId) return false;

    const now = system.currentTick;
    const key = `conv_${player.id}`;
    if ((lastUseTick.get(key) ?? 0) + CAGE_USE_COOLDOWN > now) return true;

    lastUseTick.set(key, now);

    system.run(() => {
        try {
            if (heldItem?.typeId === conv.itemId) {
                if (heldItem.amount > 1) {
                    heldItem.amount--;
                    slot.setItem(heldItem);
                } else {
                    slot.setItem(undefined);
                }
            }

            if (bee.isValid()) bee.remove();
            const { location: loc, dimension: dim } = bee;
            dim.spawnEntity(conv.result, loc);
            player.sendMessage(`§aConversion successful! §e${conv.result.split(":")[1].replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}§a spawned.`);
        } catch (err) {
            console.warn(`[Project Bee] Bee conversion error: ${err}`);
        }
    });

    return true;
}

// ── Cage item component ────────────────────────────────────────
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
            return;
        }
    }
});

// ── Catch bee by right-clicking the bee entity with empty cage ─
world.beforeEvents.playerInteractWithEntity.subscribe(e => {
    const { player, target: bee } = e;
    if (!player || !bee) return;
    if (!beesIds.includes(bee.typeId)) return;

    const inv = player.getComponent("inventory")?.container;
    if (!inv) return;

    const held = inv.getItem(player.selectedSlotIndex);
    if (!held) return;

    const slot = inv.getSlot(player.selectedSlotIndex);

    // 1) Empty cage captures bee
    if (captureBeeWithEmptyCage(player, bee, held, slot)) {
        e.cancel = true;
        return;
    }

    // 2) Catalyst converts bee
    if (convertBee(player, bee, held, slot)) {
        e.cancel = true;
    }
});

// ── Optional: hit the bee with an empty cage to catch it ─
world.afterEvents.entityHitEntity.subscribe(e => {
    const { damagingEntity: player, hitEntity: bee } = e;
    if (!player || player.typeId !== "minecraft:player") return;
    if (!beesIds.includes(bee.typeId)) return;

    const inv = player.getComponent("inventory")?.container;
    if (!inv) return;

    const held = inv.getItem(player.selectedSlotIndex);
    if (!held) return;

    const slot = inv.getSlot(player.selectedSlotIndex);
    if (captureBeeWithEmptyCage(player, bee, held, slot)) {
        return;
    }
});