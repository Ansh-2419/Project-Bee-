// ============================================================
// Project Bee — Advanced Beehive  (remodeled)
//
// KEY IMPROVEMENTS OVER ORIGINAL
//  1. Per-bee independent production timers (not one shared timer)
//  2. Dynamic-property persistence: production progress survives reloads
//  3. Per-bee flower requirement check (non-sim mode)
//  4. Productivity upgrade multiplies comb output
//  5. Extension box correctly rebuilds the entity with the right size
//  6. Status text written into UI label slot on every tick cycle
//  7. honeyCharges starts at 0 (fix: was starting at 1, counting to 6)
//  8. collectNearbyBees uses dimension.getEntities with typeId filter,
//     not families (custom bees may not have the bee family tag)
//  9. dropAndClearSlots correctly maps storage IDs before spawning
// 10. Single-entity rebuild on expansion: entity is removed & recreated
//     so the inventory size actually changes
//
// SLOT MAP — NORMAL (inventory_size = 29)
//   0   – text status label  (UI only, written by script)
//   1   – (uc reserved)
//   2   – progress arrow
//   3   – bee INPUT slot
//   4-8 – bee storage (5 slots)
//   9   – bottle/catalyst input
//   10-18 – 3×3 output grid
//   19-22 – upgrade slots (4)
//   23-28 – IO config (DoriosLib)
//
// SLOT MAP — EXPANDED (inventory_size = 32)
//   0    – text status label
//   1    – (uc reserved)
//   2    – progress arrow
//   3    – bee INPUT slot
//   4-10 – bee storage (7 slots)
//   11   – bottle/catalyst input
//   12-20 – 3×3 output grid
//   21-24 – upgrade slots (4)
//   25-31 – IO config (DoriosLib)
// ============================================================

import { getBlockEntity } from "./containerEntity.js";

import { world, system, ItemStack, ItemLockMode } from "@minecraft/server";
import * as DoriosLib from "DoriosLib/index.js";
import * as Utils from "DoriosCore/utils/entity.js";
import { InterfaceManager } from "DoriosCore/interfaces/index.js";
import { feederBlocks } from "../config/recipes/feeder_recipe.js";
import { advancedBeehive as combRecipes } from "../config/recipes/advance_beehive.js";
import {
    getTotalSpeedBonus,
    getTotalProductivityMultiplier,
    hasSimulator,
    getUpgradeSummaryLines,
} from "../config/upgrades.js";
import {
    beesIds,
    beeCageType,
    BEE_DATA_PROP,
    BEE_BABY_PROP,
    applyBeeCageLore,
} from "../data/data.js";

// ── IDs ───────────────────────────────────────────────────────
const BLOCK_ID         = "projectbee:advance_beehive";
const EXTENSION_BOX_ID = "utilitycraft:extension_box";
const FEEDING_SLAB_ID  = "projectbee:feeding_slab";
const NORMAL_TITLE     = "projectbee.advance_beehive.ui";
const EXPANDED_TITLE   = "projectbee.advance_beehive_expanded.ui";
const EXPANDED_TAG     = "projectbee:expanded_beehive";

// ── Progress bar ──────────────────────────────────────────────
const PROGRESS_PREFIX = "utilitycraft:progress_right_big_bar_";
const PROGRESS_FRAMES = 23;

function progressItemId(frame) {
    return PROGRESS_PREFIX + String(Math.max(0, Math.min(22, frame))).padStart(2, "0");
}

// ── Slot constants — NORMAL ───────────────────────────────────
const N_LABEL_SLOT    = 0;
const N_PROGRESS_SLOT = 2;
const N_BEE_INPUT     = 3;
const N_BEE_SLOTS     = [4, 5, 6, 7, 8];
const N_BOTTLE_SLOT   = 9;
const N_OUTPUT_SLOTS  = [10, 11, 12, 13, 14, 15, 16, 17, 18];
const N_UPGRADE_SLOTS = [19, 20, 21, 22];

// ── Slot constants — EXPANDED ─────────────────────────────────
const E_LABEL_SLOT    = 0;
const E_PROGRESS_SLOT = 2;
const E_BEE_INPUT     = 3;
const E_BEE_SLOTS     = [4, 5, 6, 7, 8, 9, 10];
const E_BOTTLE_SLOT   = 11;
const E_OUTPUT_SLOTS  = [12, 13, 14, 15, 16, 17, 18, 19, 20];
const E_UPGRADE_SLOTS = [21, 22, 23, 24];

// Extra slots that only exist when expanded
const E_EXTRA_BEE_SLOTS     = [9, 10];
const E_EXTRA_UPGRADE_SLOTS = [23, 24];

// ── Timing ────────────────────────────────────────────────────
const BASE_RECIPE_TICKS    = 100;
const MIN_RECIPE_TICKS     = 10;
const HONEY_FILLS_AT       = 5;
const HONEY_CHARGES_MAX    = 6;

// ── Persistence keys ─────────────────────────────────────────
const PROP_HONEY_PARTIAL = "pb:honey_partial";
const PROP_HONEY_CHARGES = "pb:honey_charges";
function beeProgressProp(slotIndex) { return `pb:prog:${slotIndex}`; }

// ── Module-level caches ───────────────────────────────────────
// Keyed by block location string "x,y,z,dimId".
// These survive across ticks so we don't re-scan the world every tick.

/** @type {Map<string, { result: boolean, checkedAt: number }>} */
const flowerCache = new Map();
const FLOWER_CACHE_TTL = 40; // re-scan every 40 ticks (~2 seconds)

/** @type {Map<string, number>} last tick syncExtensionBox ran */
const syncThrottleMap = new Map();
const SYNC_INTERVAL = 20; // only check for extension box changes every 20 ticks

function locationKey(block) {
    const { x, y, z } = block.location;
    return `${x},${y},${z},${block.dimension.id}`;
}

// ── Cardinal offsets ──────────────────────────────────────────
const CARDINAL_OFFSETS = {
    north: { dx:  0, dz: -1 },
    south: { dx:  0, dz:  1 },
    east:  { dx:  1, dz:  0 },
    west:  { dx: -1, dz:  0 },
};

// ── Bee ID helpers ────────────────────────────────────────────
function toStorageId(beeId) {
    return beeId === "minecraft:bee" ? "utilitycraft:bee" : beeId;
}
function toSpawnId(storageId) {
    return storageId === "utilitycraft:bee" ? "minecraft:bee" : storageId;
}
function toBeeId(storageId) {
    return storageId === "utilitycraft:bee" ? "minecraft:bee" : storageId;
}

// ── Bee item factory ─────────────────────────────────────────
// ItemLockMode.slot prevents the player from dragging bee items
// out of bee storage slots (normal: 4-8, expanded: 4-10).
// Script code can still replace them with setItem() directly —
// the lock only blocks player interaction.

function makeBeeItem(storageId) {
    const item = new ItemStack(storageId, 1);
    item.lockMode = ItemLockMode.slot;
    return item;
}

// ── Shared helpers ────────────────────────────────────────────
function getInventory(entity) {
    return entity?.getComponent("minecraft:inventory")?.container;
}

function hasExtensionBox(block) {
    if (!block?.isValid) return false;
    try {
        const { x, y, z } = block.location;
        const dim   = block.dimension;
        const above = dim.getBlock({ x, y: y + 1, z });
        const below = dim.getBlock({ x, y: y - 1, z });
        return above?.typeId === EXTENSION_BOX_ID || below?.typeId === EXTENSION_BOX_ID;
    } catch { return false; }
}

function isUiItem(item) {
    return item.hasTag?.("utilitycraft:ui_element") ||
           item.hasTag?.("utilitycraft:ui.element") ||
           item.typeId.startsWith(PROGRESS_PREFIX);
}

function dropItems(items, location, dimension) {
    for (const item of items) {
        if (!item || isUiItem(item)) continue;
        try { dimension.spawnItem(item, location); } catch { }
    }
}

// ── Feeder detection (simulator mode) ────────────────────────
function getFeederAllowedBees(block) {
    try {
        const { x, y, z } = block.location;
        const dim      = block.dimension;
        const cardinal = block.permutation.getState("minecraft:cardinal_direction") ?? "north";
        const { dx, dz } = CARDINAL_OFFSETS[cardinal] ?? CARDINAL_OFFSETS.north;

        const candidates = [
            dim.getBlock({ x: x + dx, y,       z: z + dz }),
            dim.getBlock({ x: x + dx, y: y - 1, z: z + dz }),
            dim.getBlock({ x,         y: y - 1, z         }),
        ];

        for (const feederBlock of candidates) {
            if (!feederBlock || feederBlock.typeId === "minecraft:air") continue;
            const allowed = [];

            if (feederBlock.typeId === FEEDING_SLAB_ID) {
                const feederEntity = getBlockEntity(feederBlock);
                if (!feederEntity?.isValid) continue;
                const inv = getInventory(feederEntity);
                if (!inv) continue;
                for (let i = 0; i < inv.size; i++) {
                    const item = inv.getItem(i);
                    if (!item) continue;
                    for (const { beeId, feederBlocks: foods } of feederBlocks) {
                        if (foods.includes(item.typeId) && !allowed.includes(beeId))
                            allowed.push(beeId);
                    }
                }
            } else {
                for (const { beeId, feederBlocks: foods } of feederBlocks) {
                    if (foods.includes(feederBlock.typeId) && !allowed.includes(beeId))
                        allowed.push(beeId);
                }
            }

            if (allowed.length > 0) return allowed;
        }
        return null;
    } catch { return null; }
}

// ── Flower detection (non-sim mode) ───────────────────────────
// OPTIMIZATION: result is cached per block location for FLOWER_CACHE_TTL ticks.
// Without caching this was a 605-block scan every single tick.

const FLOWER_BLOCKS = new Set([
    "minecraft:dandelion", "minecraft:poppy", "minecraft:blue_orchid",
    "minecraft:allium", "minecraft:azure_bluet", "minecraft:red_tulip",
    "minecraft:orange_tulip", "minecraft:white_tulip", "minecraft:pink_tulip",
    "minecraft:oxeye_daisy", "minecraft:cornflower", "minecraft:lily_of_the_valley",
    "minecraft:sunflower", "minecraft:lilac", "minecraft:rose_bush", "minecraft:peony",
    "minecraft:spore_blossom", "minecraft:torchflower", "minecraft:pitcher_plant",
]);

const FLOWER_REQUIRING_BEES = new Set([
    "minecraft:bee",
    "utilitycraft:biomass_bee",
    "utilitycraft:blue_banded_bee",
    "utilitycraft:blue_mason_bee",
    "utilitycraft:bumble_bee",
    "utilitycraft:leaf_cutter_bee",
]);

function hasNearbyFlower(block) {
    const key  = locationKey(block);
    const now  = system.currentTick;
    const cached = flowerCache.get(key);

    if (cached && now - cached.checkedAt < FLOWER_CACHE_TTL) {
        return cached.result;
    }

    let result = false;
    try {
        const { x, y, z } = block.location;
        const dim = block.dimension;
        outer:
        for (let dx = -5; dx <= 5; dx++) {
            for (let dy = -2; dy <= 2; dy++) {
                for (let dz = -5; dz <= 5; dz++) {
                    const b = dim.getBlock({ x: x + dx, y: y + dy, z: z + dz });
                    if (b && FLOWER_BLOCKS.has(b.typeId)) { result = true; break outer; }
                }
            }
        }
    } catch { }

    flowerCache.set(key, { result, checkedAt: now });
    return result;
}

// ── AdvancedBeehive class ─────────────────────────────────────

class AdvancedBeehive {
    constructor(block) {
        this.block      = block;
        this.dimension  = block.dimension;
        this.entity     = getBlockEntity(block);
        this.isExpanded = this.entity?.hasTag(EXPANDED_TAG) ?? false;

        this.labelSlot    = this.isExpanded ? E_LABEL_SLOT    : N_LABEL_SLOT;
        this.progressSlot = this.isExpanded ? E_PROGRESS_SLOT : N_PROGRESS_SLOT;
        this.beeInputSlot = this.isExpanded ? E_BEE_INPUT     : N_BEE_INPUT;
        this.beeSlots     = this.isExpanded ? E_BEE_SLOTS     : N_BEE_SLOTS;
        this.bottleSlot   = this.isExpanded ? E_BOTTLE_SLOT   : N_BOTTLE_SLOT;
        this.outputSlots  = this.isExpanded ? E_OUTPUT_SLOTS  : N_OUTPUT_SLOTS;
        this.upgradeSlots = this.isExpanded ? E_UPGRADE_SLOTS : N_UPGRADE_SLOTS;
    }

    get inv() { return getInventory(this.entity); }

    // ── Persistence helpers ───────────────────────────────────

    getBeeProgress(slotIndex) {
        if (!this.entity?.isValid) return 0;
        try { return this.entity.getDynamicProperty(beeProgressProp(slotIndex)) ?? 0; }
        catch { return 0; }
    }

    setBeeProgress(slotIndex, value) {
        if (!this.entity?.isValid) return;
        try { this.entity.setDynamicProperty(beeProgressProp(slotIndex), value); }
        catch { }
    }

    clearBeeProgress(slotIndex) { this.setBeeProgress(slotIndex, 0); }

    getHoneyPartial() {
        if (!this.entity?.isValid) return 0;
        try { return this.entity.getDynamicProperty(PROP_HONEY_PARTIAL) ?? 0; }
        catch { return 0; }
    }
    setHoneyPartial(v) {
        if (!this.entity?.isValid) return;
        try { this.entity.setDynamicProperty(PROP_HONEY_PARTIAL, v); } catch { }
    }
    getHoneyCharges() {
        if (!this.entity?.isValid) return 0;
        try { return this.entity.getDynamicProperty(PROP_HONEY_CHARGES) ?? 0; }
        catch { return 0; }
    }
    setHoneyCharges(v) {
        if (!this.entity?.isValid) return;
        try { this.entity.setDynamicProperty(PROP_HONEY_CHARGES, v); } catch { }
    }

    // ── Main tick ─────────────────────────────────────────────

    onTick() {
        if (!this.entity?.isValid) return;
        const inv = this.inv;
        if (!inv) return;

        const upgradeItems   = this.upgradeSlots.map(i => inv.getItem(i));
        const isSim          = hasSimulator(upgradeItems);
        const speedBonus     = getTotalSpeedBonus(upgradeItems);
        const prodMultiplier = getTotalProductivityMultiplier(upgradeItems);
        const interval       = Math.max(MIN_RECIPE_TICKS, BASE_RECIPE_TICKS - speedBonus);

        const allowedBeesForSim = isSim ? getFeederAllowedBees(this.block) : null;

        // Flower result for this tick — read from cache or scan once
        let flowerChecked = false;
        let hasFlower     = false;

        if (system.currentTick % 10 === 0) {
            this.drainBeeInputSlot();
            if (!isSim) this.collectNearbyBees();
            this.flushHoneyBottle();
        }

        if (system.currentTick % 20 === 0) {
            this.transferToHopper();
            this.updateStatusLabel(upgradeItems, isSim, allowedBeesForSim, interval);
        }

        // ── Per-bee independent production ────────────────────
        for (const slotIndex of this.beeSlots) {
            const bee = inv.getItem(slotIndex);
            if (!bee) {
                this.clearBeeProgress(slotIndex);
                continue;
            }

            const beeId = toBeeId(bee.typeId);

            if (isSim) {
                if (!allowedBeesForSim || !allowedBeesForSim.includes(beeId)) continue;
            } else {
                if (FLOWER_REQUIRING_BEES.has(beeId)) {
                    if (!flowerChecked) {
                        hasFlower    = hasNearbyFlower(this.block);
                        flowerChecked = true;
                    }
                    if (!hasFlower) continue;
                }
            }

            const prev = this.getBeeProgress(slotIndex);
            const next = prev + 1;
            this.setBeeProgress(slotIndex, next);

            if (next >= interval) {
                this.produceCombForBee(beeId, prodMultiplier);
                this.clearBeeProgress(slotIndex);
            }
        }

        this.updateProgressArrow(interval);

        // OPTIMIZATION: syncExtensionBox is throttled — only checks adjacent
        // blocks every SYNC_INTERVAL ticks instead of every tick.
        const key = locationKey(this.block);
        const lastSync = syncThrottleMap.get(key) ?? 0;
        if (system.currentTick - lastSync >= SYNC_INTERVAL) {
            syncThrottleMap.set(key, system.currentTick);
            this.syncExtensionBox();
        }
    }

    // ── Progress arrow ────────────────────────────────────────

    updateProgressArrow(interval) {
        const inv = this.inv;
        if (!inv) return;
        let maxProgress = 0;
        for (const slotIndex of this.beeSlots) {
            if (!inv.getItem(slotIndex)) continue;
            const p = this.getBeeProgress(slotIndex);
            if (p > maxProgress) maxProgress = p;
        }
        const frame  = Math.min(22, Math.floor((maxProgress / Math.max(1, interval)) * PROGRESS_FRAMES));
        const itemId = progressItemId(frame);
        try {
            if (inv.getItem(this.progressSlot)?.typeId !== itemId) {
                inv.getSlot(this.progressSlot).setItem(new ItemStack(itemId, 1));
            }
        } catch { }
    }

    // ── Status label ─────────────────────────────────────────

    updateStatusLabel(upgradeItems, isSim, allowedBees, interval) {
        const inv = this.inv;
        if (!inv) return;

        const beeCount  = this.beeSlots.filter(i => !!inv.getItem(i)).length;
        const maxBees   = this.beeSlots.length;
        const outputFull = this.outputSlots.every(i => {
            const item = inv.getItem(i);
            return item && item.amount >= item.maxAmount;
        });

        const lines = [
            `§7Bees: §e${beeCount}§7/§e${maxBees}`,
            `§7Interval: §a${interval}t`,
            outputFull ? "§cOutput full!" : "§aProducing",
            isSim
                ? (allowedBees?.length > 0 ? "§aSim: feeder OK" : "§cSim: no feeder")
                : "§7Natural mode",
            ...getUpgradeSummaryLines(upgradeItems),
        ];

        try {
            const existing    = inv.getItem(this.labelSlot);
            const newText     = lines.join("\n");
            const existingText = existing?.getLore?.()?.join("\n") ?? "";
            if (existingText !== newText) {
                const label = new ItemStack("utilitycraft:ui_label", 1);
                label.setLore(lines);
                inv.getSlot(this.labelSlot).setItem(label);
            }
        } catch { }
    }

    // ── Bee input slot drain ──────────────────────────────────

    drainBeeInputSlot() {
        const inv = this.inv;
        if (!inv) return;
        const inputItem = inv.getItem(this.beeInputSlot);
        if (!inputItem) return;

        const filledIndex = beeCageType.filledCageIds.indexOf(inputItem.typeId);
        if (filledIndex !== -1) {
            let beeId = inputItem.getDynamicProperty(BEE_DATA_PROP);
            if (beeId === "utilitycraft:bee") beeId = "minecraft:bee";
            if (typeof beeId !== "string" || !beesIds.includes(beeId)) return;

            const isBaby = inputItem.getDynamicProperty(BEE_BABY_PROP) ?? false;
            if (isBaby) {
                if (!this.canFitOutputItem()) return;
                this.insertOutputItem(inputItem);
                inv.getSlot(this.beeInputSlot).setItem(undefined);
                return;
            }

            const storageId = toStorageId(beeId);
            const target    = this.beeSlots.find(i => !inv.getItem(i));
            if (target === undefined) return;

            inv.getSlot(target).setItem(makeBeeItem(storageId));
            inv.getSlot(this.beeInputSlot).setItem(undefined);

            const emptyCageId = beeCageType.emptyCageIds[filledIndex];
            if (emptyCageId) this.insertOutput(emptyCageId, 1);
            return;
        }

        const emptyIndex = beeCageType.emptyCageIds.indexOf(inputItem.typeId);
        if (emptyIndex !== -1) {
            const beeSlotIdx = this.beeSlots.find(i => !!inv.getItem(i));
            if (beeSlotIdx === undefined) return;
            const beeItem = inv.getItem(beeSlotIdx);
            if (!beeItem) return;

            const beeId = toBeeId(beeItem.typeId);
            if (!beesIds.includes(beeId)) return;

            const filledCageId = beeCageType.filledCageIds[emptyIndex];
            if (!this.canFitOutput(filledCageId, 1)) return;

            const filledCage = new ItemStack(filledCageId, 1);
            filledCage.setDynamicProperty(BEE_DATA_PROP, beeId);
            applyBeeCageLore(filledCage, beeId, false);

            this.clearBeeProgress(beeSlotIdx);
            inv.getSlot(beeSlotIdx).setItem(undefined);
            this.insertOutputItem(filledCage);
            this.consumeInput(inputItem);
            return;
        }

        if (!beesIds.includes(inputItem.typeId)) return;
        const target = this.beeSlots.find(i => !inv.getItem(i));
        if (target === undefined) return;
        inv.getSlot(target).setItem(makeBeeItem(toStorageId(inputItem.typeId)));
        this.consumeInput(inputItem);
    }

    consumeInput(inputItem) {
        const inv = this.inv;
        if (!inv) return;
        const slot = inv.getSlot(this.beeInputSlot);
        if (inputItem.amount > 1) { inputItem.amount--; slot.setItem(inputItem); }
        else slot.setItem(undefined);
    }

    // ── Single-bee comb production ────────────────────────────

    produceCombForBee(beeId, productivityMultiplier) {
        for (const { input, output } of combRecipes) {
            if (beeId !== input.itemId) continue;
            if (Math.random() * 100 < output.chance) {
                this.insertOutput(output.itemId, output.count * productivityMultiplier);
            }
            break;
        }

        let honeyPartial = this.getHoneyPartial() + 1;
        let honeyCharges = this.getHoneyCharges();
        if (honeyPartial >= HONEY_FILLS_AT) {
            honeyCharges = Math.min(honeyCharges + 1, HONEY_CHARGES_MAX);
            honeyPartial = 0;
        }
        this.setHoneyPartial(honeyPartial);
        this.setHoneyCharges(honeyCharges);
    }

    // ── Honey bottle ──────────────────────────────────────────

    flushHoneyBottle() {
        const inv = this.inv;
        if (!inv) return;
        if (this.getHoneyCharges() < HONEY_CHARGES_MAX) return;
        const bottle = inv.getItem(this.bottleSlot);
        if (bottle?.typeId !== "minecraft:glass_bottle") return;
        if (!this.canFitOutput("minecraft:honey_bottle", 1)) return;

        const slot = inv.getSlot(this.bottleSlot);
        if (bottle.amount > 1) { bottle.amount--; slot.setItem(bottle); }
        else slot.setItem(undefined);

        this.setHoneyCharges(0);
        this.setHoneyPartial(0);
        this.insertOutput("minecraft:honey_bottle", 1);
    }

    // ── Output helpers ────────────────────────────────────────

    canFitOutputItem() {
        const inv = this.inv;
        if (!inv) return false;
        return this.outputSlots.some(i => !inv.getItem(i));
    }

    canFitOutput(itemId, count = 1) {
        const inv = this.inv;
        if (!inv) return false;
        return this.outputSlots.some(i => {
            const item = inv.getItem(i);
            return !item || (item.typeId === itemId && item.amount + count <= item.maxAmount);
        });
    }

    insertOutput(itemId, count = 1) {
        const inv = this.inv;
        if (!inv) return;
        for (const i of this.outputSlots) {
            const slot = inv.getSlot(i);
            const item = slot.getItem();
            if (item && item.typeId === itemId && item.amount + count <= item.maxAmount) {
                item.amount += count;
                slot.setItem(item);
                return;
            }
        }
        for (const i of this.outputSlots) {
            const slot = inv.getSlot(i);
            if (!slot.getItem()) { slot.setItem(new ItemStack(itemId, count)); return; }
        }
    }

    insertOutputItem(itemStack) {
        const inv = this.inv;
        if (!inv) return;
        for (const i of this.outputSlots) {
            const slot = inv.getSlot(i);
            if (!slot.getItem()) { slot.setItem(itemStack); return; }
        }
    }

    // ── Nearby bee collection (non-sim) ───────────────────────

    collectNearbyBees() {
        if (!this.entity?.isValid) return;
        const inv = this.inv;
        if (!inv) return;
        if (!this.beeSlots.some(i => !inv.getItem(i))) return;

        const nearby = this.dimension
            .getEntities({ maxDistance: 2, location: this.block.location })
            .filter(e => beesIds.includes(e.typeId));

        for (const bee of nearby) {
            if (bee.getComponent("minecraft:is_baby")) continue;
            if (!this.beeSlots.some(i => !inv.getItem(i))) break;
            this.addBeeToSlot(toStorageId(bee.typeId));
            bee.remove();
        }
    }

    addBeeToSlot(storageId) {
        const inv = this.inv;
        if (!inv) return;
        for (const i of this.beeSlots) {
            if (inv.getItem(i)) continue;
            inv.getSlot(i).setItem(makeBeeItem(storageId));
            break;
        }
    }

    // ── Hopper export ─────────────────────────────────────────

    transferToHopper() {
        try {
            const { x, y, z } = this.block.location;
            const hopper = this.dimension.getBlock({ x, y: y - 1, z });
            if (hopper?.typeId !== "minecraft:hopper") return;
            const src  = this.inv;
            const dest = hopper.getComponent("inventory")?.container;
            if (!src || !dest) return;
            for (const i of this.outputSlots) {
                const item = src.getItem(i);
                if (!item) continue;
                const remainder = dest.addItem(item);
                if (!remainder) src.getSlot(i).setItem(undefined);
                else if (remainder.amount !== item.amount) src.getSlot(i).setItem(remainder);
            }
        } catch { }
    }

    // ── Extension box sync ────────────────────────────────────
    // OPTIMIZATION: only called every SYNC_INTERVAL ticks (see onTick).

    syncExtensionBox() {
        if (!this.entity?.isValid) return;
        const shouldExpand = hasExtensionBox(this.block);
        const isExpanded   = this.entity.hasTag(EXPANDED_TAG);

        const targetTitle = shouldExpand ? EXPANDED_TITLE : NORMAL_TITLE;
        if (this.entity.nameTag !== targetTitle) this.entity.nameTag = targetTitle;

        if (shouldExpand && !isExpanded) {
            this.rebuildEntity(true);
        } else if (!shouldExpand && isExpanded) {
            this.prepareContraction();
            this.rebuildEntity(false);
        }
    }

    // ── Inventory snapshot ────────────────────────────────────

    snapshotInventory() {
        const inv = this.inv;
        if (!inv) return { bees: [], upgrades: [], outputs: [], bottle: null, honeyPartial: 0, honeyCharges: 0 };

        const beeSnapshot     = this.beeSlots.map(i => ({ item: inv.getItem(i), progress: this.getBeeProgress(i) }));
        const upgradeSnapshot = this.upgradeSlots.map(i => inv.getItem(i));
        const outputSnapshot  = this.outputSlots.map(i => inv.getItem(i));
        const bottle          = inv.getItem(this.bottleSlot);

        return {
            bees:         beeSnapshot,
            upgrades:     upgradeSnapshot,
            outputs:      outputSnapshot,
            bottle,
            honeyPartial: this.getHoneyPartial(),
            honeyCharges: this.getHoneyCharges(),
        };
    }

    // ── Contraction cleanup ───────────────────────────────────
    // BUG FIX: Bees from extra slots are spawned 3 blocks away (outside
    // the maxDistance:2 collection zone) so collectNearbyBees() cannot
    // immediately re-absorb them on the next collection tick.

    prepareContraction() {
        const inv = this.inv;
        if (!inv) return;

        const { x, y, z } = this.block.location;

        // Spawn directions far enough that collectNearbyBees (maxDistance 2) won't catch them
        const releaseOffsets = [
            { dx:  3, dy: 1, dz:  0 },
            { dx: -3, dy: 1, dz:  0 },
        ];

        let offsetIdx = 0;
        for (const i of E_EXTRA_BEE_SLOTS) {
            const item = inv.getItem(i);
            if (!item) continue;
            const off = releaseOffsets[offsetIdx % releaseOffsets.length];
            offsetIdx++;
            try {
                this.dimension.spawnEntity(toSpawnId(item.typeId), {
                    x: x + off.dx + 0.5,
                    y: y + off.dy,
                    z: z + off.dz + 0.5,
                });
            } catch (err) {
                console.warn(`[Project Bee] prepareContraction spawn failed: ${err}`);
            }
            this.clearBeeProgress(i);
            inv.getSlot(i).setItem(undefined);
        }

        for (const i of E_EXTRA_UPGRADE_SLOTS) {
            const item = inv.getItem(i);
            if (!item || isUiItem(item)) { inv.getSlot(i).setItem(undefined); continue; }
            try { this.dimension.spawnItem(item, { x: x + 0.5, y: y + 1, z: z + 0.5 }); } catch { }
            inv.getSlot(i).setItem(undefined);
        }
    }

    // ── Entity rebuild (expand / contract) ───────────────────

    rebuildEntity(expand) {
        const snapshot = this.snapshotInventory();
        try { this.entity.remove(); } catch { }

        // Also clear the flower cache for this block so it gets rescanned fresh
        flowerCache.delete(locationKey(this.block));
        syncThrottleMap.delete(locationKey(this.block));

        const targetBeeSlots     = expand ? E_BEE_SLOTS     : N_BEE_SLOTS;
        const targetUpgradeSlots = expand ? E_UPGRADE_SLOTS : N_UPGRADE_SLOTS;
        const targetOutputSlots  = expand ? E_OUTPUT_SLOTS  : N_OUTPUT_SLOTS;
        const targetBottleSlot   = expand ? E_BOTTLE_SLOT   : N_BOTTLE_SLOT;
        const targetProgressSlot = expand ? E_PROGRESS_SLOT : N_PROGRESS_SLOT;
        const targetTitle        = expand ? EXPANDED_TITLE  : NORMAL_TITLE;
        const invSize            = expand ? 32 : 29;
        const block              = this.block;
        const dimension          = this.dimension;

        system.run(() => {
            try {
                const newEntity = Utils.spawnEntity(block, {
                    entity: { type: "container", inventory_size: invSize },
                });
                if (!newEntity?.isValid) {
                    console.warn("[Project Bee] rebuildEntity: entity spawn failed.");
                    return;
                }

                newEntity.nameTag = targetTitle;
                if (expand) newEntity.addTag(EXPANDED_TAG);

                const inv = getInventory(newEntity);
                if (!inv) return;

                inv.getSlot(targetProgressSlot).setItem(new ItemStack(progressItemId(0), 1));

                for (let idx = 0; idx < Math.min(snapshot.bees.length, targetBeeSlots.length); idx++) {
                    const { item, progress } = snapshot.bees[idx];
                    if (!item) continue;
                    const slotIndex = targetBeeSlots[idx];
                    inv.getSlot(slotIndex).setItem(makeBeeItem(item.typeId));
                    try { newEntity.setDynamicProperty(beeProgressProp(slotIndex), progress); } catch { }
                }

                for (let idx = 0; idx < Math.min(snapshot.upgrades.length, targetUpgradeSlots.length); idx++) {
                    const item = snapshot.upgrades[idx];
                    if (item) inv.getSlot(targetUpgradeSlots[idx]).setItem(item);
                }

                for (let idx = 0; idx < Math.min(snapshot.outputs.length, targetOutputSlots.length); idx++) {
                    const item = snapshot.outputs[idx];
                    if (item) inv.getSlot(targetOutputSlots[idx]).setItem(item);
                }

                if (snapshot.bottle) {
                    try { inv.getSlot(targetBottleSlot).setItem(snapshot.bottle); } catch { }
                }

                try {
                    newEntity.setDynamicProperty(PROP_HONEY_PARTIAL, snapshot.honeyPartial);
                    newEntity.setDynamicProperty(PROP_HONEY_CHARGES, snapshot.honeyCharges);
                } catch { }

                system.run(() => {
                    if (!newEntity?.isValid) return;
                    try { InterfaceManager.ensureEntityInterfaces(newEntity); } catch { }
                });
            } catch (err) {
                console.warn(`[Project Bee] rebuildEntity error: ${err}`);
            }
        });
    }
}

// ── Block Component ───────────────────────────────────────────

DoriosLib.registry.blockComponent(BLOCK_ID, {
    onPlace(event, { params: settings }) {
        const block = event.block;
        if (!block?.isValid) return;
        system.run(() => {
            try {
                const expanded = hasExtensionBox(block);
                const invSize  = expanded
                    ? (settings?.entity?.inventory_size_expanded ?? 32)
                    : (settings?.entity?.inventory_size ?? 29);

                const entity = Utils.spawnEntity(block, {
                    entity: { type: "container", inventory_size: invSize },
                });
                if (!entity?.isValid) { console.warn("[Project Bee] Beehive entity spawn failed."); return; }

                entity.nameTag = expanded ? EXPANDED_TITLE : NORMAL_TITLE;
                if (expanded) entity.addTag(EXPANDED_TAG);

                const inv = getInventory(entity);
                const ps  = expanded ? E_PROGRESS_SLOT : N_PROGRESS_SLOT;
                if (inv) inv.getSlot(ps).setItem(new ItemStack(progressItemId(0), 1));

                try {
                    entity.setDynamicProperty(PROP_HONEY_PARTIAL, 0);
                    entity.setDynamicProperty(PROP_HONEY_CHARGES, 0);
                } catch { }

                system.run(() => {
                    if (!entity?.isValid) return;
                    try { InterfaceManager.ensureEntityInterfaces(entity); } catch { }
                });
            } catch (err) {
                console.warn(`[Project Bee] Beehive onPlace error: ${err}`);
            }
        });
    },

    onTick(event) {
        if (!event.block?.isValid) return;
        try { new AdvancedBeehive(event.block).onTick(); }
        catch (err) { console.warn(`[Project Bee] Beehive onTick error: ${err}`); }
    },
});

// ── Extension Box Component ───────────────────────────────────

DoriosLib.registry.blockComponent(EXTENSION_BOX_ID, {
    onPlace(event) {
        // Beehive detects the new box on its next syncExtensionBox() tick.
    },
});

// ── Beehive break — release all bees ─────────────────────────
// BUG FIX: spawnEntity / spawnItem / entity.kill() cannot be called inside
// beforeEvents (read-only context). All mutations deferred to system.run().
// Bees from every slot are released; container entity is killed.

world.beforeEvents.playerBreakBlock.subscribe(e => {
    if (e.block.typeId !== BLOCK_ID) return;
    const entity = getBlockEntity(e.block);
    if (!entity?.isValid) return;
    const inv = getInventory(entity);
    if (!inv) return;

    const expanded     = entity.hasTag(EXPANDED_TAG);
    const beeSlotSet   = new Set(expanded ? E_BEE_SLOTS : N_BEE_SLOTS);
    const progressSlot = expanded ? E_PROGRESS_SLOT : N_PROGRESS_SLOT;

    // Capture everything we need BEFORE the block breaks and entity may be invalidated
    const location  = { ...e.block.location };
    const dimension = e.block.dimension;

    const beesToSpawn = [];
    const drops       = [];

    for (let i = 0; i < inv.size; i++) {
        const item = inv.getItem(i);
        if (!item || i === progressSlot || isUiItem(item)) continue;

        if (beeSlotSet.has(i)) {
            const beeId = toBeeId(item.typeId);
            if (beesIds.includes(beeId)) {
                beesToSpawn.push(toSpawnId(item.typeId));
            } else {
                drops.push(item);
            }
        } else {
            drops.push(item);
        }
    }

    system.run(() => {
        // Release all bees
        for (const spawnId of beesToSpawn) {
            try { dimension.spawnEntity(spawnId, location); }
            catch (err) { console.warn(`[Project Bee] Break bee spawn failed (${spawnId}): ${err}`); }
        }
        // Drop all non-bee items
        dropItems(drops, location, dimension);
        // Kill the container entity
        try { if (entity.isValid) entity.kill(); } catch { }
    });
});
