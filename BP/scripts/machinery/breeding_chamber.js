import { getBlockEntity } from "./containerEntity.js";
// ============================================================
// Project Bee — Breeding Chamber
//
// SLOT MAP (inventory_size = 15)
//   0    – text label  (UI only)
//   1    – (uc reserved)
//   2    – heart progress bar
//   3    – bee cage input 1
//   4    – bee cage input 2
//   5    – flower slot 1
//   6    – flower slot 2
//   7-8  – output slots (baby bee cages)
//   9    – empty cage input
//   10-14 – IO config (DoriosLib)
// ============================================================

import { world, system, ItemStack } from "@minecraft/server";
import * as DoriosLib from "DoriosLib/index.js";
import * as Utils from "DoriosCore/utils/entity.js";
import { InterfaceManager } from "DoriosCore/interfaces/index.js";
import { breedingRecipes } from "../config/recipes/breeding_chamber.js";
import { beeCageType, BEE_DATA_PROP, BEE_BABY_PROP, applyBeeCageLore } from "../data/data.js";

const BLOCK_ID = "projectbee:breeding_chamber";
const UI_TITLE = "projectbee.breeding_chamber.ui";

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
const OUTPUT_SLOTS  = [7, 8];
const EMPTY_CAGE_SLOT = 9;

const BASE_TICKS = 200;

// ── State ─────────────────────────────────────────────────────

const machineState = new Map();

function stateKey(entity) {
    const { x, y, z } = entity.location;
    return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
}

function getState(key) {
    if (!machineState.has(key)) machineState.set(key, { tick: 0 });
    return machineState.get(key);
}

// ── Helpers ───────────────────────────────────────────────────


function getInventory(entity) {
    return entity?.getComponent("minecraft:inventory")?.container;
}

function setProgressHeart(inv, tick, interval) {
    const frame  = Math.min(9, Math.floor((tick / Math.max(1, interval)) * HEART_FRAMES));
    const itemId = heartItemId(frame);
    if (inv.getItem(PROGRESS_SLOT)?.typeId !== itemId) {
        inv.getSlot(PROGRESS_SLOT).setItem(new ItemStack(itemId, 1));
    }
}

function getBeeIdFromCage(inv, slot) {
    const item = inv.getItem(slot);
    if (!item || !beeCageType.filledCageIds.includes(item.typeId)) return null;
    const beeId = item.getDynamicProperty(BEE_DATA_PROP);
    return typeof beeId === "string" ? beeId : null;
}

function canFitOutput(inv) {
    return OUTPUT_SLOTS.some(i => !inv.getItem(i));
}

function canProduce(inv) {
    const cage = inv.getItem(EMPTY_CAGE_SLOT);
    return !!cage && beeCageType.emptyCageIds.includes(cage.typeId) && canFitOutput(inv);
}

function consumeOne(inv, slot) {
    const item = inv.getItem(slot);
    if (!item) return;
    if (item.amount > 1) { item.amount--; inv.setItem(slot, item); }
    else inv.setItem(slot, undefined);
}

function insertFilledCage(inv, beeId) {
    const emptyCage = inv.getItem(EMPTY_CAGE_SLOT);
    if (!emptyCage) return false;

    const emptyIdx = beeCageType.emptyCageIds.indexOf(emptyCage.typeId);
    if (emptyIdx === -1) return false;

    const target = OUTPUT_SLOTS.find(i => !inv.getItem(i));
    if (target === undefined) return false;

    const cage = new ItemStack(beeCageType.filledCageIds[emptyIdx], 1);
    cage.setDynamicProperty(BEE_DATA_PROP, beeId);
    cage.setDynamicProperty(BEE_BABY_PROP, true);
    applyBeeCageLore(cage, beeId, true);

    consumeOne(inv, EMPTY_CAGE_SLOT);
    inv.getSlot(target).setItem(cage);
    return true;
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
    return recipe.output ?? parent1;
}

// ── BreedingChamber class ─────────────────────────────────────

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

        if (!bee1 || !bee2 || !f1 || !f2) {
            if (state.tick !== 0) {
                state.tick = 0;
                setProgressHeart(inv, 0, BASE_TICKS);
            }
            return;
        }

        // Cycle complete — hold full heart until cage + output slot are ready
        if (state.tick >= BASE_TICKS) {
            setProgressHeart(inv, BASE_TICKS, BASE_TICKS);
            if (system.currentTick % 20 === 0) this.transferToHopper();
            if (canProduce(inv)) this.breed(inv, bee1, bee2, state);
            return;
        }

        state.tick++;
        setProgressHeart(inv, state.tick, BASE_TICKS);

        if (system.currentTick % 20 === 0) this.transferToHopper();
    }

    breed(inv, bee1, bee2, state) {
        insertFilledCage(inv, rollBabyBee(bee1, bee2));
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
                if (!remainder) src.setItem(i, undefined);
                else if (remainder.amount !== item.amount) src.setItem(i, remainder);
            }
        } catch { }
    }
}

// ── Block Component ───────────────────────────────────────────

DoriosLib.registry.blockComponent(BLOCK_ID, {
    onPlace(event, { params: settings }) {
        const block = event.block;
        if (!block?.isValid) return;
        system.run(() => {
            try {
                const entity = Utils.spawnEntity(block, {
                    entity: {
                        type: "container",
                        inventory_size: settings?.entity?.inventory_size ?? 15,
                    },
                });
                if (!entity?.isValid) { console.warn("[Project Bee] Breeding chamber entity spawn failed."); return; }
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
        if (!event.block?.isValid) return;
        try { new BreedingChamber(event.block).onTick(); }
        catch (err) { console.warn(`[Project Bee] Breeding chamber onTick error: ${err}`); }
    },
});

// ── Block break ───────────────────────────────────────────────

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
        for (const item of drops) e.block.dimension.spawnItem(item, e.block.location);
    });
});