// ============================================================
// Project Bee — Breeding Chamber
// ============================================================

import { world, system, ItemStack } from "@minecraft/server";
import * as DoriosLib from "DoriosLib/index.js";
import * as Utils from "DoriosCore/utils/entity.js";
import { InterfaceManager } from "DoriosCore/interfaces/index.js";
import { breedingRecipes } from "../config/recipes/breeding_chamber.js";
import { beesIds, beeCageType , BEE_BABY_PROP, applyBeeCageLore } from "../data/data.js";

const BLOCK_ID   = "projectbee:breeding_chamber";
const UI_TITLE   = "projectbee.breeding_chamber.ui";
const BEE_PROP   = "utilitycraft:beeData";

const HEART_PREFIX = "projectbee:heart_bar_";
const HEART_FRAMES = 10;



function heartItemId(frame) {
    return HEART_PREFIX + Math.max(0, Math.min(9, frame));
}

const PROGRESS_SLOT = 2;
const CAGE_SLOT_1   = 3;
const CAGE_SLOT_2   = 4;
const FLOWER_SLOT_1 = 5;
const FLOWER_SLOT_2 = 6;
const OUTPUT_SLOTS      = [7, 8];
const EMPTY_CAGE_SLOT   = 9;

const BASE_TICKS = 200;

const machineState = new Map();

function stateKey(entity) {
    const { x, y, z } = entity.location;
    return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
}

function getState(key) {
    if (!machineState.has(key)) machineState.set(key, { tick: 0 });
    return machineState.get(key);
}

function getBlockEntity(block) {
    return block.dimension
        .getEntitiesAtBlockLocation(block.location)
        .find(e =>
            e.typeId !== "utilitycraft:machine_area_outline" &&
            e.typeId !== "minecraft:player"
        );
}

function getInventory(entity) {
    return entity?.getComponent("minecraft:inventory")?.container;
}

function setProgressHeart(inv, tick, interval) {
    const frame  = Math.min(9, Math.floor((tick / Math.max(1, interval)) * HEART_FRAMES));
    const itemId = heartItemId(frame);
    const cur    = inv.getItem(PROGRESS_SLOT);
    if (cur?.typeId === itemId) return;
    inv.getSlot(PROGRESS_SLOT).setItem(new ItemStack(itemId, 1));
}

function getBeeIdFromCage(inv, slot) {
    const item = inv.getItem(slot);
    if (!item) return null;
    if (!beeCageType.filledCageIds.includes(item.typeId)) return null;
    const beeId = item.getDynamicProperty(BEE_PROP);
    return typeof beeId === "string" ? beeId : null;
}

function hasEmptyCageReady(inv) {
    const item = inv.getItem(EMPTY_CAGE_SLOT);
    return !!item && beeCageType.emptyCageIds.includes(item.typeId);
}

function canFitOutput(inv) {
    return OUTPUT_SLOTS.some(i => !inv.getItem(i));
}

function canProduce(inv) {
    return hasEmptyCageReady(inv) && canFitOutput(inv);
}

function insertFilledCage(inv, beeId) {
    // Consume the empty cage from slot 9 and determine filled variant
    const emptyCage = inv.getItem(EMPTY_CAGE_SLOT);
    if (!emptyCage) return false;

    const emptyIdx = beeCageType.emptyCageIds.indexOf(emptyCage.typeId);
    if (emptyIdx === -1) return false;
    const filledId = beeCageType.filledCageIds[emptyIdx];

    // Build the filled baby cage
    const cage = new ItemStack(filledId, 1);
    cage.setDynamicProperty(BEE_PROP, beeId);
    cage.setDynamicProperty(BEE_BABY_PROP, true);
    applyBeeCageLore(cage, beeId, true);

    // Find a free output slot
    const target = OUTPUT_SLOTS.find(i => !inv.getItem(i));
    if (target === undefined) return false;

    consumeOne(inv, EMPTY_CAGE_SLOT);
    inv.getSlot(target).setItem(cage);
    return true;
}

function consumeOne(inv, slot) {
    const item = inv.getItem(slot);
    if (!item) return;
    if (item.amount > 1) {
        item.amount--;
        inv.setItem(slot, item);
    } else {
        inv.setItem(slot, undefined);
    }
}

function rollBabyBee(parent1, parent2) {
    const recipe = breedingRecipes.find(r =>
        (r.parent1 === parent1 && r.parent2 === parent2) ||
        (r.parent1 === parent2 && r.parent2 === parent1)
    );
    if (!recipe) return parent1;

    if (Array.isArray(recipe.outputs)) {
        const total = recipe.outputs.reduce((s, o) => s + o.weight, 0);
        let roll    = Math.random() * total;
        for (const o of recipe.outputs) {
            roll -= o.weight;
            if (roll <= 0) return o.beeId;
        }
        return recipe.outputs[0].beeId;
    }
    return recipe.output;
}

class BreedingChamber {
    constructor(block) {
        this.block  = block;
        this.entity = getBlockEntity(block);
    }

    get inv() { return getInventory(this.entity); }

    onTick() {
        if (!this.entity?.isValid) return;
        const inv = this.inv;
        if (!inv) return;

        const key   = stateKey(this.entity);
        const state = getState(key);

        const bee1 = getBeeIdFromCage(inv, CAGE_SLOT_1);
        const bee2 = getBeeIdFromCage(inv, CAGE_SLOT_2);
        const f1   = inv.getItem(FLOWER_SLOT_1);
        const f2   = inv.getItem(FLOWER_SLOT_2);

        const ready = bee1 && bee2 && f1 && f2;

        // ── Not ready — reset ─────────────────────────────────
        if (!ready) {
            if (state.tick !== 0) {
                state.tick = 0;
                setProgressHeart(inv, 0, BASE_TICKS);
            }
            return;
        }

        // ── Cycle complete — hold heart_bar_9 until empty cage is available ──
        if (state.tick >= BASE_TICKS) {
            setProgressHeart(inv, BASE_TICKS, BASE_TICKS);
            if (system.currentTick % 20 === 0) this.transferToHopper();
            if (canProduce(inv)) this.breed(inv, bee1, bee2, state);
            return;
        }

        // ── Advance tick ──────────────────────────────────────
        state.tick++;
        setProgressHeart(inv, state.tick, BASE_TICKS);

        if (state.tick >= BASE_TICKS) {
            setProgressHeart(inv, BASE_TICKS, BASE_TICKS);
        }

        if (system.currentTick % 20 === 0) this.transferToHopper();
    }

    breed(inv, bee1, bee2, state) {
        const cage1Item = inv.getItem(CAGE_SLOT_1);
        const cageTypeId = cage1Item
            ? beeCageType.filledCageIds.includes(cage1Item.typeId)
                ? beeCageType.emptyCageIds[beeCageType.filledCageIds.indexOf(cage1Item.typeId)]
                : beeCageType.emptyCageIds[0]
            : beeCageType.emptyCageIds[0];

        const babyBeeId = rollBabyBee(bee1, bee2);

        insertFilledCage(inv, babyBeeId);

        consumeOne(inv, FLOWER_SLOT_1);
        consumeOne(inv, FLOWER_SLOT_2);

        state.tick = 0;
        setProgressHeart(inv, 0, BASE_TICKS);
    }

    transferToHopper() {
        try {
            const { x, y, z } = this.block.location;
            const hopper = this.block.dimension.getBlock({ x, y: y - 1, z });
            if (hopper?.typeId !== "minecraft:hopper") return;
            const src  = this.inv;
            const dest = hopper.getComponent("inventory")?.container;
            if (!src || !dest) return;
            for (const i of OUTPUT_SLOTS) {
                const item = src.getItem(i);
                if (!item) continue;
                const remainder = dest.addItem(item);
                if (!remainder)                            src.setItem(i, undefined);
                else if (remainder.amount !== item.amount) src.setItem(i, remainder);
            }
        } catch { }
    }
}

DoriosLib.registry.blockComponent(BLOCK_ID, {
    onPlace(event, { params: settings }) {
        const block = event.block;
        if (!block?.isValid) return;
        system.run(() => {
            try {
                const entity = Utils.spawnEntity(block, {
                    entity: {
                        type: "container",
                        inventory_size: settings?.entity?.inventory_size ?? 15
                    }
                });
                if (!entity?.isValid) {
                    console.warn("[Project Bee] Breeding chamber entity spawn failed.");
                    return;
                }
                entity.nameTag = UI_TITLE;
                const inv = getInventory(entity);
                if (inv) inv.getSlot(PROGRESS_SLOT).setItem(new ItemStack(heartItemId(0), 1));
                system.run(() => {
                    if (!entity?.isValid) return;
                    try { InterfaceManager.ensureEntityInterfaces(entity); } catch { }
                });
            } catch (err) {
                console.warn(`[Project Bee] Breeding chamber onPlace error: ${err}`);
            }
        });
    },

    onTick(event) {
        const block = event.block;
        if (!block?.isValid) return;
        try {
            new BreedingChamber(block).onTick();
        } catch (err) {
            console.warn(`[Project Bee] Breeding chamber onTick error: ${err}`);
        }
    }
});

world.beforeEvents.playerBreakBlock.subscribe(e => {
    if (e.block.typeId !== BLOCK_ID) return;
    const entity = getBlockEntity(e.block);
    if (!entity?.isValid) return;
    const inv = getInventory(entity);
    if (!inv) return;

    const drops = [];
    for (let i = 0; i < inv.size; i++) {
        const item = inv.getItem(i);
        if (!item) continue;
        if (i === PROGRESS_SLOT) continue;
        if (item.hasTag?.("utilitycraft:ui_element")) continue;
        if (item.hasTag?.("utilitycraft:ui.element")) continue;
        if (item.typeId.startsWith(HEART_PREFIX)) continue;
        drops.push(item);
    }

    system.run(() => {
        for (const item of drops) {
            e.block.dimension.spawnItem(item, e.block.location);
        }
    });
});