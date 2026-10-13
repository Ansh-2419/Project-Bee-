import { world, system, ItemStack } from "@minecraft/server";
import { beesIds, beeCageType , BEE_BABY_PROP, applyBeeCageLore } from "../data/data.js";
import { registry } from "DoriosLib/index.js";

const BEE_CAGE_PROP     = "utilitycraft:beeData";
const CAGE_USE_COOLDOWN = 10;
const lastUseTick        = new Map();


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
    filled.setDynamicProperty(BEE_CAGE_PROP, beeEntity.typeId);
    filled.setDynamicProperty(BEE_BABY_PROP, isBaby);
    applyBeeCageLore(filled, beeEntity.typeId, isBaby);
    return filled;
}

registry.itemComponent("utilitycraft:bee_cage", {
    onUseOn: (e) => {
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
            const beeAtBlock = e.block.dimension
                .getEntitiesAtBlockLocation(e.block.location)
                .find(en => beesIds.includes(en.typeId));
            if (!beeAtBlock) return;

            const filled = fillCage(beeAtBlock, beeCageType.filledCageIds[cageType.index]);
            beeAtBlock.remove();

            if (cage.amount > 1) {
                cage.amount--;
                slot.setItem(cage);
                player.dimension.spawnItem(filled, player.location);
            } else {
                slot.setItem(filled);
            }
        } else {
            const isBaby = cage.getDynamicProperty(BEE_BABY_PROP);
            if (isBaby) {
                player.sendMessage("§cThis bee is too young to be released!");
                return;
            }

            const beeId = cage.getDynamicProperty(BEE_CAGE_PROP);
            if (typeof beeId !== "string") return;

            const spawnId = beeId === "utilitycraft:bee" ? "minecraft:bee" : beeId;
            const loc = { x: e.block.x + 0.5, y: e.block.y + 1, z: e.block.z + 0.5 };
            system.run(() => e.block.dimension.spawnEntity(spawnId, loc));

            const emptyId = beeCageType.emptyCageIds[cageType.index];
            if (cage.typeId !== "utilitycraft:bee_cage_filled" && emptyId) {
                if (cage.amount > 1) {
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
        }
    },
});

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