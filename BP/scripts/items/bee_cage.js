import { world, system, ItemStack } from "@minecraft/server";
import { beesIds, beeCageType, BEE_DATA_PROP, BEE_BABY_PROP, applyBeeCageLore } from "../data/data.js";
import { registry } from "DoriosLib/index.js";

const CAGE_USE_COOLDOWN = 10;
const lastUseTick        = new Map();

// ── Bee conversion recipes ─────────────────────────────────────
// Right-click a live bee entity with the catalyst item to convert it.
// Add new conversions here: { [beeId]: { itemId, result } }

const BEE_CONVERSIONS = {
    "utilitycraft:diamond_bee": {
        itemId: "minecraft:netherite_block",
        result: "utilitycraft:netherite_bee",
    },
    // Duranium Bee + Voltanium Block → Voltanium Bee
    "utilitycraft:duranium_bee": {
        itemId: "utilitycraft:voltanium_block",
        result: "utilitycraft:voltanium_bee",
    },
    // Voltanium Bee + Adamant Block → Adamant Bee
    "utilitycraft:voltanium_bee": {
        itemId: "utilitycraft:adamant_block",
        result: "utilitycraft:adamant_bee",
    },
};

// ── Helpers ────────────────────────────────────────────────────

function getCageType(typeId) {
    const filledIdx = beeCageType.filledCageIds.indexOf(typeId);
    if (filledIdx !== -1) return { kind: "filled", index: filledIdx };
    const emptyIdx  = beeCageType.emptyCageIds.indexOf(typeId);
    if (emptyIdx  !== -1) return { kind: "empty",  index: emptyIdx  };
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

// ── Cage item component ────────────────────────────────────────
// All four cage item JSONs share the "utilitycraft:bee_cage" component,
// so this single handler covers every variant.

registry.itemComponent("utilitycraft:bee_cage", {
    onUseOn(e) {
        const { source: player, itemStack: cage } = e;
        if (!cage || !player) return;

        const now = system.currentTick;
        const key = player.id;
        if ((lastUseTick.get(key) ?? 0) + CAGE_USE_COOLDOWN > now) return;
        lastUseTick.set(key, now);

        const cageType = getCageType(cage.typeId);
        if (!cageType) return;

        const inv  = player.getComponent("inventory")?.container;
        if (!inv)  return;
        const slot = inv.getSlot(player.selectedSlotIndex);

        if (cageType.kind === "empty") {
            // Catch a bee standing on the targeted block
            const target = e.block.dimension
                .getEntitiesAtBlockLocation(e.block.location)
                .find(en => beesIds.includes(en.typeId));
            if (!target) return;

            const filled = fillCage(target, beeCageType.filledCageIds[cageType.index]);
            target.remove();
            consumeOrSplit(slot, cage, () => {
                if (cage.amount > 1) player.dimension.spawnItem(filled, player.location);
                else slot.setItem(filled);
            });
        } else {
            // Release the bee
            const isBaby = cage.getDynamicProperty(BEE_BABY_PROP);
            if (isBaby) {
                player.sendMessage("§cThis bee is too young to be released!");
                return;
            }

            const beeId = cage.getDynamicProperty(BEE_DATA_PROP);
            if (typeof beeId !== "string") return;

            const spawnId = beeId === "utilitycraft:bee" ? "minecraft:bee" : beeId;
            const loc     = { x: e.block.x + 0.5, y: e.block.y + 1, z: e.block.z + 0.5 };
            system.run(() => e.block.dimension.spawnEntity(spawnId, loc));

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
        }
    },
});

// ── Swing-hit catch ────────────────────────────────────────────
// Hitting a bee entity with an empty cage catches it.

world.afterEvents.entityHitEntity.subscribe(e => {
    const { damagingEntity: player, hitEntity: bee } = e;
    if (!player || player.typeId !== "minecraft:player") return;
    if (!beesIds.includes(bee.typeId)) return;

    const inv  = player.getComponent("inventory")?.container;
    if (!inv)  return;
    const held = inv.getItem(player.selectedSlotIndex);
    if (!held) return;

    const cageType = getCageType(held.typeId);
    if (!cageType || cageType.kind !== "empty") return;

    const now = system.currentTick;
    const key = `hit_${player.id}`;
    if ((lastUseTick.get(key) ?? 0) + CAGE_USE_COOLDOWN > now) return;
    lastUseTick.set(key, now);

    const filled = fillCage(bee, beeCageType.filledCageIds[cageType.index]);
    bee.remove();

    const slot = inv.getSlot(player.selectedSlotIndex);
    if (held.amount > 1) {
        held.amount--;
        slot.setItem(held);
        player.dimension.spawnItem(filled, player.location);
    } else {
        slot.setItem(filled);
    }
});

// ── Bee conversion ─────────────────────────────────────────────
// Right-click a live bee entity with the catalyst item to convert it.
// Uses beforeEvents so the interaction is caught reliably before
// any other handler can consume the click.

world.beforeEvents.playerInteractWithEntity.subscribe(e => {
    const { player, target: bee } = e;
    if (!player || !bee) return;
    if (!beesIds.includes(bee.typeId)) return;

    const conv = BEE_CONVERSIONS[bee.typeId];
    if (!conv) return;

    const inv  = player.getComponent("inventory")?.container;
    if (!inv)  return;
    const held = inv.getItem(player.selectedSlotIndex);
    if (held?.typeId !== conv.itemId) return;

    // Prevent any default interaction
    e.cancel = true;

    const now = system.currentTick;
    const key = `conv_${player.id}`;
    if ((lastUseTick.get(key) ?? 0) + CAGE_USE_COOLDOWN > now) return;
    lastUseTick.set(key, now);

    const slot = inv.getSlot(player.selectedSlotIndex);

    const { location: loc, dimension: dim } = bee;
    system.run(() => {
        try {
            // Consume item
            const currentItem = slot.getItem();
            if (currentItem?.typeId === conv.itemId) {
                if (currentItem.amount > 1) { currentItem.amount--; slot.setItem(currentItem); }
                else slot.setItem(undefined);
            }
            // Remove bee and spawn result
            if (bee.isValid()) bee.remove();
            dim.spawnEntity(conv.result, loc);
            player.sendMessage(`§aConversion successful! §e${conv.result.split(":")[1].replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}§a spawned.`);
        } catch (err) {
            console.warn(`[Project Bee] Bee conversion error: ${err}`);
        }
    });
});
