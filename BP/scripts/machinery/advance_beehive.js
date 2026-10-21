// ============================================================
// Project Bee — Advanced Beehive
//
// SLOT MAP — NORMAL (inventory_size = 29)
//   0   – text label         (UI only)
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
//   0    – text label
//   1    – (uc reserved)
//   2    – progress arrow
//   3    – bee INPUT slot
//   4-10 – bee storage (7 slots)
//   11   – bottle/catalyst input
//   12-20 – 3×3 output grid
//   21-24 – upgrade slots (4)
//   25-31 – IO config (DoriosLib)
// ============================================================

import { world, system, ItemStack } from "@minecraft/server";
import * as DoriosLib from "DoriosLib/index.js";
import * as Utils from "DoriosCore/utils/entity.js";
import { InterfaceManager } from "DoriosCore/interfaces/index.js";
import { feederBlocks } from "../config/recipes/feeder_recipe.js";
import { advancedBeehive as combRecipes } from "../config/recipes/advance_beehive.js";
import { getTotalSpeedBonus, hasSimulator } from "../config/upgrades.js";
import { beesIds, beeCageType, BEE_DATA_PROP, BEE_BABY_PROP, applyBeeCageLore } from "../data/data.js";

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
const N_PROGRESS_SLOT = 2;
const N_BEE_INPUT     = 3;
const N_BEE_SLOTS     = [4, 5, 6, 7, 8];
const N_BOTTLE_SLOT   = 9;
const N_OUTPUT_SLOTS  = [10, 11, 12, 13, 14, 15, 16, 17, 18];
const N_UPGRADE_SLOTS = [19, 20, 21, 22];

// ── Slot constants — EXPANDED ─────────────────────────────────
const E_PROGRESS_SLOT = 2;
const E_BEE_INPUT     = 3;
const E_BEE_SLOTS     = [4, 5, 6, 7, 8, 9, 10];
const E_BOTTLE_SLOT   = 11;
const E_OUTPUT_SLOTS  = [12, 13, 14, 15, 16, 17, 18, 19, 20];
const E_UPGRADE_SLOTS = [21, 22, 23, 24];

// Slots to clear + drop when extension box is removed
const E_EXTRA_SLOTS = [9, 10, 23, 24];

// ── Timing ────────────────────────────────────────────────────
const BASE_RECIPE_TICKS = 100;
const MIN_RECIPE_TICKS  = 10;
const HONEY_FILLS_AT    = 5;
const RELEASE_CHANCE    = 50;

// ── Cardinal offsets ──────────────────────────────────────────
const CARDINAL_OFFSETS = {
    north: { dx:  0, dz: -1 },
    south: { dx:  0, dz:  1 },
    east:  { dx:  1, dz:  0 },
    west:  { dx: -1, dz:  0 },
};

// ── Bee ID helpers ────────────────────────────────────────────
// Vanilla bee is stored internally as "utilitycraft:bee" because the
// beehive entity inventory can only hold items, not entities. When
// spawning or checking against beesIds we map back to "minecraft:bee".

function toStorageId(beeId) {
    return beeId === "minecraft:bee" ? "utilitycraft:bee" : beeId;
}

function toSpawnId(storageId) {
    return storageId === "utilitycraft:bee" ? "minecraft:bee" : storageId;
}

function toBeeId(storageId) {
    return storageId === "utilitycraft:bee" ? "minecraft:bee" : storageId;
}

// ── State ─────────────────────────────────────────────────────
const beehiveState = new Map();

function stateKey(entity) {
    const { x, y, z } = entity.location;
    return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)},${entity.dimension.id}`;
}

function getState(key) {
    if (!beehiveState.has(key)) {
        beehiveState.set(key, { productionTick: 0, honeyPartial: 0, honeyCharges: 1 });
    }
    return beehiveState.get(key);
}

// ── Shared helpers ────────────────────────────────────────────

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
        dimension.spawnItem(item, location);
    }
}

// ── Feeder detection (simulator mode only) ────────────────────
// Returns array of allowed beeIds when a feeder is found with matching food.
// Returns null → no feeder / no matching food → blocks sim production.

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
                const feederEntity = feederBlock.dimension
                    .getEntitiesAtBlockLocation(feederBlock.location)
                    .find(e =>
                        e.typeId !== "utilitycraft:machine_area_outline" &&
                        e.typeId !== "minecraft:player"
                    );
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

// ── AdvancedBeehive class ─────────────────────────────────────

class AdvancedBeehive {
    constructor(block) {
        this.block      = block;
        this.dimension  = block.dimension;
        this.entity     = getBlockEntity(block);
        this.isExpanded = this.entity?.hasTag(EXPANDED_TAG) ?? false;

        this.progressSlot = this.isExpanded ? E_PROGRESS_SLOT : N_PROGRESS_SLOT;
        this.beeInputSlot = this.isExpanded ? E_BEE_INPUT     : N_BEE_INPUT;
        this.beeSlots     = this.isExpanded ? E_BEE_SLOTS     : N_BEE_SLOTS;
        this.bottleSlot   = this.isExpanded ? E_BOTTLE_SLOT   : N_BOTTLE_SLOT;
        this.outputSlots  = this.isExpanded ? E_OUTPUT_SLOTS  : N_OUTPUT_SLOTS;
        this.upgradeSlots = this.isExpanded ? E_UPGRADE_SLOTS : N_UPGRADE_SLOTS;
    }

    get inv() { return getInventory(this.entity); }

    // ── Main tick ─────────────────────────────────────────────

    onTick() {
        if (!this.entity?.isValid) return;

        const inv = this.inv;
        if (!inv) return;

        const upgradeItems = this.upgradeSlots.map(i => inv.getItem(i));
        const isSim        = hasSimulator(upgradeItems);
        const key          = stateKey(this.entity);
        const state        = getState(key);
        const hasBees      = this.beeSlots.some(i => !!inv.getItem(i));

        if (system.currentTick % 10 === 0) {
            this.drainBeeInputSlot();
            if (!isSim) this.collectNearbyBees();
            this.flushHoneyBottle(state);
        }

        if (system.currentTick % 20 === 0) {
            this.transferToHopper();
        }

        if (hasBees) {
            const speedBonus = getTotalSpeedBonus(upgradeItems);
            const interval   = Math.max(MIN_RECIPE_TICKS, BASE_RECIPE_TICKS - speedBonus);

            if (isSim) {
                const allowedBees = getFeederAllowedBees(this.block);
                if (allowedBees?.length > 0) {
                    state.productionTick++;
                    this.updateProgressArrow(state.productionTick, interval);
                    if (state.productionTick >= interval) {
                        this.produceComb(allowedBees);
                        state.productionTick = 0;
                        this.updateProgressArrow(0, interval);
                    }
                } else {
                    this.resetProgress(state, interval);
                }
            } else {
                state.productionTick++;
                this.updateProgressArrow(state.productionTick, interval);
                if (state.productionTick >= interval) {
                    this.produceComb(null);
                    state.productionTick = 0;
                    this.updateProgressArrow(0, interval);
                }
            }
        } else {
            this.resetProgress(state, BASE_RECIPE_TICKS);
        }

        if (system.currentTick % 2000 === 0 && !isSim) {
            this.releaseRandomBee(RELEASE_CHANCE);
        }

        this.syncExtensionBox();
    }

    resetProgress(state, interval) {
        if (state.productionTick !== 0) {
            state.productionTick = 0;
            this.updateProgressArrow(0, interval);
        }
    }

    // ── Progress arrow ────────────────────────────────────────

    updateProgressArrow(tick, interval) {
        const inv = this.inv;
        if (!inv) return;
        const frame  = Math.min(22, Math.floor((tick / Math.max(1, interval)) * PROGRESS_FRAMES));
        const itemId = progressItemId(frame);
        if (inv.getItem(this.progressSlot)?.typeId !== itemId) {
            inv.getSlot(this.progressSlot).setItem(new ItemStack(itemId, 1));
        }
    }

    // ── Bee input slot drain ──────────────────────────────────

    drainBeeInputSlot() {
        const inv = this.inv;
        if (!inv) return;
        const inputItem = inv.getItem(this.beeInputSlot);
        if (!inputItem) return;

        // Case 1: FILLED cage → extract bee into storage ──────
        const filledIndex = beeCageType.filledCageIds.indexOf(inputItem.typeId);
        if (filledIndex !== -1) {
            // Normalise legacy storage id: old code wrote "utilitycraft:bee" on vanilla bee cages.
            let beeId = inputItem.getDynamicProperty(BEE_DATA_PROP);
            if (beeId === "utilitycraft:bee") beeId = "minecraft:bee";
            if (typeof beeId !== "string" || !beesIds.includes(beeId)) return;

            const isBaby = inputItem.getDynamicProperty(BEE_BABY_PROP) ?? false;
            if (isBaby) {
                // Baby cages pass straight through to output
                if (!this.canFitOutputItem()) return;
                this.insertOutputItem(inputItem);
                inv.getSlot(this.beeInputSlot).setItem(undefined);
                return;
            }

            const storageId = toStorageId(beeId);
            const target    = this.beeSlots.find(i => !inv.getItem(i));
            if (target === undefined) return; // bee storage full

            inv.getSlot(target).setItem(new ItemStack(storageId, 1));
            inv.getSlot(this.beeInputSlot).setItem(undefined);

            // Return the empty cage to the output grid
            const emptyCageId = beeCageType.emptyCageIds[filledIndex];
            if (emptyCageId) this.insertOutput(emptyCageId, 1);
            return;
        }

        // Case 2: EMPTY cage → cage a stored bee → output ─────
        const emptyIndex = beeCageType.emptyCageIds.indexOf(inputItem.typeId);
        if (emptyIndex !== -1) {
            const beeSlotIdx = this.beeSlots.find(i => !!inv.getItem(i));
            if (beeSlotIdx === undefined) return;
            const beeItem = inv.getItem(beeSlotIdx);
            if (!beeItem) return;

            const beeId = toBeeId(beeItem.typeId); // maps "utilitycraft:bee" → "minecraft:bee"
            if (!beesIds.includes(beeId)) return;

            const filledCageId = beeCageType.filledCageIds[emptyIndex];
            if (!this.canFitOutput(filledCageId, 1)) return;

            const filledCage = new ItemStack(filledCageId, 1);
            filledCage.setDynamicProperty(BEE_DATA_PROP, beeId);
            applyBeeCageLore(filledCage, beeId, false);

            inv.getSlot(beeSlotIdx).setItem(undefined);
            this.insertOutputItem(filledCage);
            this.consumeInput(inputItem);
            return;
        }

        // Case 3: Raw bee entity item → move directly into storage
        if (!beesIds.includes(inputItem.typeId)) return;
        const target = this.beeSlots.find(i => !inv.getItem(i));
        if (target === undefined) return;
        inv.getSlot(target).setItem(new ItemStack(toStorageId(inputItem.typeId), 1));
        this.consumeInput(inputItem);
    }

    consumeInput(inputItem) {
        const inv = this.inv;
        if (!inv) return;
        const slot = inv.getSlot(this.beeInputSlot);
        if (inputItem.amount > 1) {
            inputItem.amount--;
            slot.setItem(inputItem);
        } else {
            slot.setItem(undefined);
        }
    }

    // ── Comb production ───────────────────────────────────────
    // allowedBees = beeIds allowed by feeder (sim mode), or null (normal mode)

    produceComb(allowedBees) {
        const inv = this.inv;
        if (!inv) return;

        for (const i of this.beeSlots) {
            const bee = inv.getItem(i);
            if (!bee) continue;
            const beeId = toBeeId(bee.typeId);
            if (allowedBees && !allowedBees.includes(beeId)) continue;

            for (const { input, output } of combRecipes) {
                if (beeId !== input.itemId) continue;
                if (Math.random() * 100 < output.chance) {
                    this.insertOutput(output.itemId, output.count);
                }
                break;
            }
        }

        const state = getState(stateKey(this.entity));
        state.honeyPartial++;
        if (state.honeyPartial >= HONEY_FILLS_AT && state.honeyCharges < 6) {
            state.honeyCharges++;
            state.honeyPartial = 0;
        }
    }

    // ── Honey bottle ──────────────────────────────────────────

    flushHoneyBottle(state) {
        const inv = this.inv;
        if (!inv) return;
        if (state.honeyCharges < 6) return;
        const bottle = inv.getItem(this.bottleSlot);
        if (bottle?.typeId !== "minecraft:glass_bottle") return;
        if (!this.canFitOutput("minecraft:honey_bottle", 1)) return;

        const slot = inv.getSlot(this.bottleSlot);
        if (bottle.amount > 1) { bottle.amount--; slot.setItem(bottle); }
        else slot.setItem(undefined);

        state.honeyCharges = 1;
        state.honeyPartial = 0;
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
            if (!item) { slot.setItem(new ItemStack(itemId, count)); return; }
            if (item.typeId === itemId && item.amount + count <= item.maxAmount) {
                item.amount += count;
                slot.setItem(item);
                return;
            }
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

    // ── Nearby bee collection ─────────────────────────────────

    collectNearbyBees() {
        if (!this.entity?.isValid) return;
        const inv = this.inv;
        if (!inv) return;
        if (!this.beeSlots.some(i => !inv.getItem(i))) return;

        const nearby = this.dimension.getEntities({
            maxDistance: 2,
            location:    this.block.location,
            families:    ["bee"],
        });

        for (const bee of nearby) {
            if (!beesIds.includes(bee.typeId)) continue;
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
            inv.getSlot(i).setItem(new ItemStack(storageId, 1));
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

    // ── Random bee release ────────────────────────────────────

    releaseRandomBee(chance) {
        if (Math.random() * 100 > chance) return;
        const inv = this.inv;
        if (!inv) return;
        const occupied = this.beeSlots.filter(i => inv.getItem(i));
        if (!occupied.length) return;
        const idx = occupied[Math.floor(Math.random() * occupied.length)];
        const bee = inv.getItem(idx);
        if (!bee) return;
        try { this.dimension.spawnEntity(toSpawnId(bee.typeId), this.block.location); } catch { }
        inv.getSlot(idx).setItem(undefined);
    }

    // ── Extension box sync ────────────────────────────────────

    syncExtensionBox() {
        if (!this.entity?.isValid) return;
        const shouldExpand = hasExtensionBox(this.block);
        const isExpanded   = this.entity.hasTag(EXPANDED_TAG);
        const targetTitle  = shouldExpand ? EXPANDED_TITLE : NORMAL_TITLE;

        if (this.entity.nameTag !== targetTitle) this.entity.nameTag = targetTitle;

        if (shouldExpand && !isExpanded) {
            this.entity.addTag(EXPANDED_TAG);
        } else if (!shouldExpand && isExpanded) {
            this.entity.removeTag(EXPANDED_TAG);
            this.dropAndClearSlots(E_EXTRA_SLOTS);
        }
    }

    dropAndClearSlots(slots) {
        const inv = this.inv;
        if (!inv) return;
        const drops = [];
        for (const i of slots) {
            const item = inv.getItem(i);
            if (!item) continue;
            if (beesIds.includes(toBeeId(item.typeId))) {
                try { this.dimension.spawnEntity(toSpawnId(item.typeId), this.block.location); } catch { }
            } else {
                drops.push(item);
            }
            inv.getSlot(i).setItem(undefined);
        }
        dropItems(drops, this.block.location, this.dimension);
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

// ── Extension Box ─────────────────────────────────────────────

DoriosLib.registry.blockComponent(EXTENSION_BOX_ID, {
    onPlace(event) {
        const block = event.block;
        if (!block?.isValid) return;
        try {
            const { x, y, z } = block.location;
            for (const offset of [1, -1]) {
                const neighbour = block.dimension.getBlock({ x, y: y + offset, z });
                if (neighbour?.typeId !== BLOCK_ID) continue;
                const entity = getBlockEntity(neighbour);
                if (!entity?.isValid) continue;
                entity.nameTag = EXPANDED_TITLE;
                if (!entity.hasTag(EXPANDED_TAG)) entity.addTag(EXPANDED_TAG);
            }
        } catch (err) {
            console.warn(`[Project Bee] ExtensionBox onPlace error: ${err}`);
        }
    },
});

// ── Block break ───────────────────────────────────────────────

world.beforeEvents.playerBreakBlock.subscribe(e => {
    if (e.block.typeId !== BLOCK_ID) return;
    const entity = getBlockEntity(e.block);
    if (!entity?.isValid) return;
    const inv = getInventory(entity);
    if (!inv) return;

    const expanded     = entity.hasTag(EXPANDED_TAG);
    const beeSlotSet   = new Set(expanded ? E_BEE_SLOTS : N_BEE_SLOTS);
    const progressSlot = expanded ? E_PROGRESS_SLOT : N_PROGRESS_SLOT;
    const drops        = [];

    for (let i = 0; i < inv.size; i++) {
        const item = inv.getItem(i);
        if (!item || i === progressSlot || isUiItem(item)) continue;

        if (beeSlotSet.has(i) && beesIds.includes(toBeeId(item.typeId))) {
            try { e.block.dimension.spawnEntity(toSpawnId(item.typeId), e.block.location); } catch { }
        } else {
            drops.push(item);
        }
    }

    system.run(() => dropItems(drops, e.block.location, e.block.dimension));
});
