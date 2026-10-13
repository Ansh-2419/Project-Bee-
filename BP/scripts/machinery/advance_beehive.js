// ============================================================
// Project Bee — Advanced Beehive
//
// SLOT MAP  (collection_index == inventory slot index)
//
// NORMAL UI  (inventory_size = 29)
//   0   – text label         (UI only, never written)
//   1   – (uc reserved)
//   2   – progress arrow     ← utilitycraft:progress_right_big_bar_00…_22
//   3   – bee INPUT slot     ← player drops bee here; script moves it to storage
//   4-8 – bee storage slots  (5 slots)
//   9   – bottle / catalyst input
//   10-18 – 3×3 output grid
//   19-22 – upgrade slots (4)
//   23-28 – IO config slots  (DoriosLib — never touch)
//
// EXPANDED UI  (inventory_size = 32)
//   0    – text label        (UI only)
//   1    – (uc reserved)
//   2    – progress arrow
//   3    – bee INPUT slot
//   4-10 – bee storage slots (7 slots)
//   11   – bottle / catalyst input
//   12-20 – 3×3 output grid
//   21-24 – upgrade slots (4)
//   25-30 – IO config slots  (DoriosLib — never touch)
//
// FEEDER SLAB DETECTION (always active, not just simulator mode)
//   The beehive checks the block directly in front-and-below itself.
//   • If it is a projectbee:feeding_slab → reads its inventory for
//     food items and only produces combs for matching bees.
//   • If it is any other block → matches it directly as a food block.
//   • If nothing is found → production is BLOCKED entirely.
//     Bees must always have a feeder to produce.
//
// SIMULATOR UPGRADE
//   When installed, bees don't need to be real entities flying in.
//   Items already in the bee storage slots act as permanent virtual
//   bees — they are never consumed. The feeder check still applies.
// ============================================================

import { world, system, ItemStack } from "@minecraft/server";
import * as DoriosLib from "DoriosLib/index.js";
import * as Utils from "DoriosCore/utils/entity.js";
import { InterfaceManager } from "DoriosCore/interfaces/index.js";
import { feederBlocks } from "../config/recipes/feeder_recipe.js";
import { advancedBeehive as combRecipes } from "../config/recipes/advance_beehive.js";
import { beesIds, beeCageType , BEE_BABY_PROP, applyBeeCageLore } from "../data/data.js";





// ── IDs ──────────────────────────────────────────────────────
const BLOCK_ID         = "projectbee:advance_beehive";
const EXTENSION_BOX_ID = "utilitycraft:extension_box";
const FEEDING_SLAB_ID  = "projectbee:feeding_slab";
const NORMAL_TITLE     = "projectbee.advance_beehive.ui";
const EXPANDED_TITLE   = "projectbee.advance_beehive_expanded.ui";
const EXPANDED_TAG     = "projectbee:expanded_beehive";
const SPEED_UPGRADE_ID = "utilitycraft:speed_upgrade";
const SIM_UPGRADE_ID   = "utilitycraft:simulator_upgrade";

// ── Progress bar ──────────────────────────────────────────────
const PROGRESS_PREFIX  = "utilitycraft:progress_right_big_bar_";
const PROGRESS_FRAMES  = 23;

function progressItemId(frame) {
    return PROGRESS_PREFIX + String(Math.max(0, Math.min(22, frame))).padStart(2, "0");
}

// ── Slot constants — NORMAL ───────────────────────────────────
const N_PROGRESS_SLOT  = 2;
const N_BEE_INPUT_SLOT = 3;
const N_BEE_SLOTS      = [4, 5, 6, 7, 8];
const N_BOTTLE_SLOT    = 9;
const N_OUTPUT_SLOTS   = [10, 11, 12, 13, 14, 15, 16, 17, 18];
const N_UPGRADE_SLOTS  = [19, 20, 21, 22];

// ── Slot constants — EXPANDED ────────────────────────────────
const E_PROGRESS_SLOT  = 2;
const E_BEE_INPUT_SLOT = 3;
const E_BEE_SLOTS      = [4, 5, 6, 7, 8, 9, 10];
const E_BOTTLE_SLOT    = 11;
const E_OUTPUT_SLOTS   = [12, 13, 14, 15, 16, 17, 18, 19, 20];
const E_UPGRADE_SLOTS  = [21, 22, 23, 24];

// ── Timing ────────────────────────────────────────────────────
const BASE_RECIPE_TICKS = 100;
const SPEED_TICK_BONUS  = 15;
const HONEY_FILLS_AT    = 5;
const RELEASE_CHANCE    = 50;

// ── Cardinal direction offsets ────────────────────────────────
const CARDINAL_OFFSETS = {
    north: { dx:  0, dz: -1 },
    south: { dx:  0, dz:  1 },
    east:  { dx:  1, dz:  0 },
    west:  { dx: -1, dz:  0 },
};

// ── Per-beehive state ─────────────────────────────────────────
const beehiveState = new Map();

function stateKey(entity, dimension) {
    const { x, y, z } = entity.location;
    return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)},${dimension.id}`;
}

function getState(key) {
    if (!beehiveState.has(key)) {
        beehiveState.set(key, { productionTick: 0, honeyPartial: 0, honeyCharges: 1 });
    }
    return beehiveState.get(key);
}

// ── Helpers ───────────────────────────────────────────────────

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

function dropItems(items, location, dimension) {
    for (const item of items) {
        if (!item) continue;
        if (item.hasTag?.("utilitycraft:ui_element")) continue;
        if (item.hasTag?.("utilitycraft:ui.element")) continue;
        dimension.spawnItem(item, location);
    }
}

// ── Feeder slab detection ─────────────────────────────────────
// Returns an array of beeIds whose food is present in the feeder,
// or an empty array if the feeder exists but has no matching food,
// or null if no feeder block is found at all.
//
// Production is only allowed when this returns a non-empty array.
// A bee in storage only produces if its beeId is in the returned list.

function getFeederAllowedBees(block) {
    try {
        const { x, y, z } = block.location;
        const dim     = block.dimension;
        const cardinal = block.permutation.getState("minecraft:cardinal_direction") ?? "north";
        const { dx, dz } = CARDINAL_OFFSETS[cardinal] ?? CARDINAL_OFFSETS.north;

        // Check the block directly in front at the same Y, and one below
        const candidates = [
            dim.getBlock({ x: x + dx, y,     z: z + dz }),
            dim.getBlock({ x: x + dx, y: y - 1, z: z + dz }),
            dim.getBlock({ x,         y: y - 1, z         }),
        ];

        for (const feederBlock of candidates) {
            if (!feederBlock || feederBlock.typeId === "minecraft:air") continue;

            const allowed = [];

            if (feederBlock.typeId === FEEDING_SLAB_ID) {
                // Read food items stored inside the feeding slab's container entity
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
                        if (foods.includes(item.typeId) && !allowed.includes(beeId)) {
                            allowed.push(beeId);
                        }
                    }
                }
            } else {
                // Plain block — match directly
                for (const { beeId, feederBlocks: foods } of feederBlocks) {
                    if (foods.includes(feederBlock.typeId) && !allowed.includes(beeId)) {
                        allowed.push(beeId);
                    }
                }
            }

            if (allowed.length > 0) return allowed;
        }

        // No feeder found around the beehive — block production
        return null;

    } catch { return null; }
}

// ── Beehive class ─────────────────────────────────────────────

class AdvancedBeehive {
    constructor(block) {
        this.block      = block;
        this.dimension  = block.dimension;
        this.entity     = getBlockEntity(block);
        this.isExpanded = this.entity?.hasTag(EXPANDED_TAG) ?? false;

        this.progressSlot = this.isExpanded ? E_PROGRESS_SLOT  : N_PROGRESS_SLOT;
        this.beeInputSlot = this.isExpanded ? E_BEE_INPUT_SLOT : N_BEE_INPUT_SLOT;
        this.beeSlots     = this.isExpanded ? E_BEE_SLOTS      : N_BEE_SLOTS;
        this.bottleSlot   = this.isExpanded ? E_BOTTLE_SLOT    : N_BOTTLE_SLOT;
        this.outputSlots  = this.isExpanded ? E_OUTPUT_SLOTS   : N_OUTPUT_SLOTS;
        this.upgradeSlots = this.isExpanded ? E_UPGRADE_SLOTS  : N_UPGRADE_SLOTS;
    }

    get inv() { return getInventory(this.entity); }

    // ── Main tick ─────────────────────────────────────────────

    onTick() {
        if (!this.entity?.isValid) return;

        // Always accept bees dropped into the input slot
        this.drainBeeInputSlot();

        const isSim    = this.hasUpgrade(SIM_UPGRADE_ID);
        const speed    = this.getUpgradeCount(SPEED_UPGRADE_ID);
        const interval = Math.max(1, BASE_RECIPE_TICKS - speed * SPEED_TICK_BONUS);
        const hasBees  = this.getOccupiedBeeSlots() > 0;
        const key      = stateKey(this.entity, this.dimension);
        const state    = getState(key);

        // Collect nearby bees — always, regardless of simulator
        if (system.currentTick % 10 === 0) {
            this.collectNearbyBees();
        }

        // ── Feeder check — always required for production ─────
        const allowedBees = hasBees ? getFeederAllowedBees(this.block) : null;
        const canProduce  = hasBees && Array.isArray(allowedBees) && allowedBees.length > 0;

        if (canProduce) {
            state.productionTick++;
            this.updateProgressArrow(state.productionTick, interval);

            if (state.productionTick >= interval) {
                this.produceComb(state, allowedBees);
                state.productionTick = 0;
                this.updateProgressArrow(0, interval);
            }
        } else {
            if (state.productionTick !== 0) {
                state.productionTick = 0;
                this.updateProgressArrow(0, interval);
            }
        }

        if (system.currentTick % 10 === 0) {
            this.flushHoneyBottle(key, state);
        }

        if (system.currentTick % 20 === 0) {
            this.transferToHopper();
        }

        // Simulator upgrade prevents random bee escape
        if (system.currentTick % 200 === 0 && !isSim) {
            this.releaseRandomBee(RELEASE_CHANCE);
        }

        this.syncExtensionBox();
    }

    // ── Progress arrow ────────────────────────────────────────

    updateProgressArrow(tick, interval) {
        const inv = this.inv;
        if (!inv) return;
        const frame  = Math.min(22, Math.floor((tick / Math.max(1, interval)) * PROGRESS_FRAMES));
        const itemId = progressItemId(frame);
        const cur    = inv.getItem(this.progressSlot);
        if (cur?.typeId !== itemId) {
            inv.getSlot(this.progressSlot).setItem(new ItemStack(itemId, 1));
        }
    }

    // ── Bee input slot drain ──────────────────────────────────

    drainBeeInputSlot() {
        const inv = this.inv;
        if (!inv) return;
        const inputItem = inv.getItem(this.beeInputSlot);
        if (!inputItem) return;

        // ── Case 1: FILLED cage in input → extract bee into storage ──
        const filledIndex = beeCageType.filledCageIds.indexOf(inputItem.typeId);
        if (filledIndex !== -1) {
            let beeId = inputItem.getDynamicProperty("utilitycraft:beeData")
                     ?? inputItem.getDynamicProperty("um:beeData");

            // Remap vanilla minecraft:bee → utilitycraft:bee so it's recognised
            if (beeId === "minecraft:bee") beeId = "utilitycraft:bee";

            if (typeof beeId !== "string" || !beesIds.includes(beeId)) return;

            // Baby bee — cannot enter storage, pass cage straight to output
            const isBabyFlag = inputItem.getDynamicProperty(BEE_BABY_PROP) ?? false;
            if (isBabyFlag) {
                if (!this.canFitOutputItem()) return;
                this.insertOutputItem(inputItem);
                this.consumeInputOne(inputItem);
                return;
            }

            // Bee storage full — stall
            const target = this.beeSlots.find(i => !inv.getItem(i));
            if (target === undefined) return;

            // Place bee in storage — just the item, no dynamic property needed
            inv.getSlot(target).setItem(new ItemStack(beeId, 1));

            // Clear the cage from input
            inv.getSlot(this.beeInputSlot).setItem(undefined);

            // Send the empty cage to the output grid
            const emptyCageId = beeCageType.emptyCageIds[filledIndex];
            if (emptyCageId) {
                this.insertOutput(emptyCageId, 1);
            }
            return;
        }

        // ── Case 2: EMPTY cage in input → take bee from storage → output filled cage ──
        const emptyIndex = beeCageType.emptyCageIds.indexOf(inputItem.typeId);
        if (emptyIndex !== -1) {
            // Find the first occupied bee storage slot
            const beeSlotIdx = this.beeSlots.find(i => !!inv.getItem(i));
            if (beeSlotIdx === undefined) return;                   // no bees to cage
            const beeItem = inv.getItem(beeSlotIdx);
            if (!beeItem || !beesIds.includes(beeItem.typeId)) return;

            const filledCageId = beeCageType.filledCageIds[emptyIndex];
            if (!this.canFitOutput(filledCageId, 1)) return;       // output full

            // Build the filled cage with the bee's typeId stored as a dynamic property
            const filledCage = new ItemStack(filledCageId, 1);
            filledCage.setDynamicProperty("utilitycraft:beeData", beeItem.typeId);
            applyBeeCageLore(filledCage, beeItem.typeId, false);

            // Remove the bee from storage
            inv.getSlot(beeSlotIdx).setItem(undefined);

            // Output the filled cage
            this.insertOutputItem(filledCage);

            // Consume one empty cage from input
            this.consumeInputOne(inputItem);
            return;
        }

        // ── Case 3: RAW bee item in input → move into storage ──
        if (!beesIds.includes(inputItem.typeId)) return;
        const target = this.beeSlots.find(i => !inv.getItem(i));
        if (target === undefined) return;                           // bee storage full
        inv.getSlot(target).setItem(new ItemStack(inputItem.typeId, 1));
        this.consumeInputOne(inputItem);
    }

    consumeInputOne(inputItem) {
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
    // allowedBees is always a non-empty array when this is called.
    // Only bees whose typeId is in allowedBees produce this cycle.

    produceComb(state, allowedBees) {
        const inv = this.inv;
        if (!inv) return;
        const roll = Math.floor(Math.random() * 100);

        for (const i of this.beeSlots) {
            const bee = inv.getItem(i);
            if (!bee) continue;

            // Skip this bee if feeder doesn't have its food
            if (!allowedBees.includes(bee.typeId)) continue;

            for (const { input, output } of combRecipes) {
                if (bee.typeId !== input.itemId) continue;
                if (roll < output.chance) {
                    this.insertOutput(output.itemId, output.count);
                }
                break;
            }
        }

        // Advance honey bar
        state.honeyPartial++;
        if (state.honeyPartial >= HONEY_FILLS_AT && state.honeyCharges < 6) {
            state.honeyCharges++;
            state.honeyPartial = 0;
        }
    }

    // ── Honey bottle flush ────────────────────────────────────

    flushHoneyBottle(key, state) {
        const inv = this.inv;
        if (!inv) return;
        if (state.honeyCharges < 6) return;
        const bottle = inv.getItem(this.bottleSlot);
        if (bottle?.typeId !== "minecraft:glass_bottle") return;
        if (!this.canFitOutput("minecraft:honey_bottle", 1)) return;

        if (bottle.amount > 1) {
            bottle.amount--;
            inv.setItem(this.bottleSlot, bottle);
        } else {
            inv.setItem(this.bottleSlot, undefined);
        }
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

    // For pre-built ItemStack objects (e.g. filled cages with dynamic properties)
    insertOutputItem(itemStack) {
        const inv = this.inv;
        if (!inv) return;
        for (const i of this.outputSlots) {
            const slot = inv.getSlot(i);
            const item = slot.getItem();
            if (!item) { slot.setItem(itemStack); return; }
            // Filled cages are max_stack_size 1 — never merge, just find next empty slot
        }
    }

    // ── Nearby bee collection ─────────────────────────────────

    collectNearbyBees() {
        if (!this.entity?.isValid) return;
        if (this.getEmptyBeeSlots() === 0) return;
        const nearby = this.dimension.getEntities({
            maxDistance: 2,
            location:    this.block.location,
            families:    ["bee"],
        });
        for (const bee of nearby) {
            if (!beesIds.includes(bee.typeId)) continue;
            if (bee.getComponent("minecraft:is_baby")) continue;    // skip baby bees
            if (this.getEmptyBeeSlots() === 0) break;
            this.addBeeToSlot(bee.typeId === "minecraft:bee" ? "utilitycraft:bee" : bee.typeId);
            bee.remove();
        }
    }

    addBeeToSlot(beeId) {
        const inv = this.inv;
        if (!inv) return;
        for (const i of this.beeSlots) {
            if (inv.getItem(i)) continue;
            inv.getSlot(i).setItem(new ItemStack(beeId, 1));
            break;
        }
    }

    getEmptyBeeSlots() {
        const inv = this.inv;
        if (!inv) return 0;
        return this.beeSlots.filter(i => !inv.getItem(i)).length;
    }

    getOccupiedBeeSlots() {
        const inv = this.inv;
        if (!inv) return 0;
        return this.beeSlots.filter(i => !!inv.getItem(i)).length;
    }

    // ── Upgrade helpers ───────────────────────────────────────

    getUpgradeCount(upgradeId) {
        const inv = this.inv;
        if (!inv) return 0;
        return this.upgradeSlots.reduce(
            (n, i) => n + (inv.getItem(i)?.typeId === upgradeId ? 1 : 0), 0
        );
    }

    hasUpgrade(id) {
        const inv = this.inv;
        if (!inv) return false;
        return this.upgradeSlots.some(i => inv.getItem(i)?.typeId === id);
    }

    // ── Hopper export ─────────────────────────────────────────

    transferToHopper() {
        try {
            const { x, y, z } = this.block.location;
            const hopperBlock  = this.dimension.getBlock({ x, y: y - 1, z });
            if (hopperBlock?.typeId !== "minecraft:hopper") return;
            const src  = this.inv;
            const dest = hopperBlock.getComponent("inventory")?.container;
            if (!src || !dest) return;
            for (const i of this.outputSlots) {
                const item = src.getItem(i);
                if (!item) continue;
                const remainder = dest.addItem(item);
                if (!remainder) {
                    src.setItem(i, undefined);
                } else if (remainder.amount !== item.amount) {
                    src.setItem(i, remainder);
                }
            }
        } catch { }
    }

    // ── Random bee release ────────────────────────────────────

    releaseRandomBee(chance) {
        if (!this.entity || Math.random() * 100 > chance) return;
        const inv = this.inv;
        if (!inv) return;
        const occupied = this.beeSlots.filter(i => inv.getItem(i));
        if (!occupied.length) return;
        const slot = occupied[Math.floor(Math.random() * occupied.length)];
        this.dropAndClearSlots([slot]);
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
            this.dropAndClearSlots([9, 10, 23, 24]);
        }
    }

    // ── Drop + clear ──────────────────────────────────────────

    dropAndClearSlots(slots) {
        const inv = this.inv;
        if (!inv) return;
        const drops = [];
        for (const i of slots) {
            const item = inv.getItem(i);
            if (!item) continue;
            if (beesIds.includes(item.typeId)) {
                const spawnId = item.typeId === "utilitycraft:bee" ? "minecraft:bee" : item.typeId;
                try { this.dimension.spawnEntity(spawnId, this.block.location); } catch { }
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
                if (!entity?.isValid) {
                    console.warn("[Project Bee] Beehive entity spawn failed.");
                    return;
                }

                entity.nameTag = expanded ? EXPANDED_TITLE : NORMAL_TITLE;
                if (expanded) entity.addTag(EXPANDED_TAG);

                const inv      = getInventory(entity);
                const progSlot = expanded ? E_PROGRESS_SLOT : N_PROGRESS_SLOT;
                if (inv) inv.getSlot(progSlot).setItem(new ItemStack(progressItemId(0), 1));

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
        const block = event.block;
        if (!block?.isValid) return;
        try {
            new AdvancedBeehive(block).onTick();
        } catch (err) {
            console.warn(`[Project Bee] Beehive onTick error: ${err}`);
        }
    },
});

// ── Extension Box ─────────────────────────────────────────────

DoriosLib.registry.blockComponent(EXTENSION_BOX_ID, {
    onPlace(event) {
        const block = event.block;
        if (!block?.isValid) return;
        try {
            const { x, y, z } = block.location;
            const dim = block.dimension;
            for (const offset of [1, -1]) {
                const neighbour = dim.getBlock({ x, y: y + offset, z });
                if (neighbour?.typeId !== BLOCK_ID) continue;
                const entity = getBlockEntity(neighbour);
                if (!entity?.isValid) continue;
                const expand = hasExtensionBox(neighbour);
                entity.nameTag = expand ? EXPANDED_TITLE : NORMAL_TITLE;
                if (expand && !entity.hasTag(EXPANDED_TAG)) entity.addTag(EXPANDED_TAG);
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

    const isExpanded   = entity.hasTag(EXPANDED_TAG);
    const beeSlots     = new Set(isExpanded ? E_BEE_SLOTS : N_BEE_SLOTS);
    const progressSlot = isExpanded ? E_PROGRESS_SLOT : N_PROGRESS_SLOT;
    const drops        = [];

    for (let i = 0; i < inv.size; i++) {
        const item = inv.getItem(i);
        if (!item) continue;
        if (i === progressSlot) continue;
        if (item.hasTag?.("utilitycraft:ui_element")) continue;
        if (item.hasTag?.("utilitycraft:ui.element")) continue;
        if (item.typeId.startsWith(PROGRESS_PREFIX)) continue;

        if (beeSlots.has(i) && beesIds.includes(item.typeId)) {
            const spawnId = item.typeId === "utilitycraft:bee" ? "minecraft:bee" : item.typeId;
            try { e.block.dimension.spawnEntity(spawnId, e.block.location); } catch { }
        } else {
            drops.push(item);
        }
    }

    system.run(() => dropItems(drops, e.block.location, e.block.dimension));
});
