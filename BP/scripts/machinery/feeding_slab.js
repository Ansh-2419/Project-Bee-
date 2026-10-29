import { getBlockEntity, getEntityBlock } from "./containerEntity.js";
// ============================================================
// Project Bee — Feeding Slab
//
// SLOT MAP
//   Single: slots 0-2  (3 slots, 1 row)
//   Double: slots 0-5  (6 slots, 2 rows)
//
// Right-clicking a single slab with another feeding slab
// in hand upgrades it to double:
//   – existing items are preserved
//   – entity is respawned with 6-slot inventory
//   – block state projectbee:double → true
//   – UI switches to the double layout
//
// The advance_beehive reads this slab's inventory to
// determine which bees are allowed to produce combs.
// ============================================================

import { world, system, ItemStack } from "@minecraft/server";
import * as DoriosLib from "DoriosLib/index.js";
import * as Utils from "DoriosCore/utils/entity.js";
import { InterfaceManager } from "DoriosCore/interfaces/index.js";

const BLOCK_ID     = "projectbee:feeding_slab";
const NORMAL_TITLE = "projectbee.feeding_slab.ui";
const DOUBLE_TITLE = "projectbee.feeding_slab_double.ui";
const DOUBLE_STATE = "projectbee:double";

const SINGLE_SIZE  = 3;
const DOUBLE_SIZE  = 6;

// ── Helpers ───────────────────────────────────────────────────


function getInventory(entity) {
    return entity?.getComponent("minecraft:inventory")?.container;
}

function isDouble(block) {
    try { return block.permutation.getState(DOUBLE_STATE) === true; }
    catch { return false; }
}

// ── Block component ───────────────────────────────────────────

DoriosLib.registry.blockComponent(BLOCK_ID, {

    onPlace(event, { params: settings }) {
        const block = event.block;
        if (!block?.isValid) return;

        system.run(() => {
            try {
                const double  = isDouble(block);
                const invSize = double ? DOUBLE_SIZE : SINGLE_SIZE;

                const entity = Utils.spawnEntity(block, {
                    entity: { type: "container", inventory_size: invSize }
                });

                if (!entity?.isValid) {
                    console.warn("[Project Bee] Feeding Slab entity spawn failed.");
                    return;
                }

                entity.nameTag = double ? DOUBLE_TITLE : NORMAL_TITLE;

                system.run(() => {
                    if (!entity?.isValid) return;
                    try { InterfaceManager.ensureEntityInterfaces(entity); } catch { }
                });
            } catch (err) {
                console.warn(`[Project Bee] Feeding Slab onPlace error: ${err}`);
            }
        });
    },

    onPlayerInteract(event) {
        upgradeFeedingSlab(event.block, event.player);
    },

    onTick(event) {
        // Intentionally minimal — just keep nameTag in sync
        // (entity may have been respawned without the right nameTag)
        const block = event.block;
        if (!block?.isValid) return;
        try {
            const entity = getBlockEntity(block);
            if (!entity?.isValid) return;
            const expected = isDouble(block) ? DOUBLE_TITLE : NORMAL_TITLE;
            if (entity.nameTag !== expected) entity.nameTag = expected;
        } catch { }
    }
});

// ── Block break — drop all content ────────────────────────────

world.beforeEvents.playerBreakBlock.subscribe(e => {
    if (e.block.typeId !== BLOCK_ID) return;

    const entity = getBlockEntity(e.block);
    if (!entity?.isValid) return;
    const inv = getInventory(entity);
    if (!inv) return;

    const drops = [];
    for (let i = 0; i < inv.size; i++) {
        const item = inv.getItem(i);
        if (item) drops.push(item);
    }

    // Return the second slab if it was doubled
    if (isDouble(e.block)) {
        drops.push(new ItemStack(BLOCK_ID, 1));
    }

    system.run(() => {
        for (const item of drops) {
            e.block.dimension.spawnItem(item, e.block.location);
        }
        try { entity.kill(); } catch { }
    });
});
// Share the existing conversion between block and inventory-entity interaction.
function upgradeFeedingSlab(block, player) {
    if (!block?.isValid || block.typeId !== BLOCK_ID || !player?.isValid) return;

    // Already double — open normally, nothing to upgrade
    if (isDouble(block)) return;

    // Player must be holding another feeding slab
    const playerInv = player.getComponent("minecraft:inventory")?.container;
    if (!playerInv) return;
    const handItem = playerInv.getItem(player.selectedSlotIndex);
    if (!handItem || handItem.typeId !== BLOCK_ID) return;

    // Snapshot existing items from the single inventory
    const oldEntity = getBlockEntity(block);
    const savedItems = [];
    if (oldEntity?.isValid) {
        const inv = getInventory(oldEntity);
        if (inv) {
            for (let i = 0; i < SINGLE_SIZE; i++) {
                savedItems[i] = inv.getItem(i) ?? null;
            }
        }
        // Kill old entity — will be replaced with a 6-slot one
        try { oldEntity.kill(); } catch { }
    }

    // Consume one slab from hand
    if (handItem.amount > 1) {
        handItem.amount--;
        playerInv.getSlot(player.selectedSlotIndex).setItem(handItem);
    } else {
        playerInv.getSlot(player.selectedSlotIndex).setItem(undefined);
    }

    // Set block state to double
    block.setPermutation(block.permutation.withState(DOUBLE_STATE, true));

    // Spawn new 6-slot entity and restore items
    system.run(() => {
        try {
            const entity = Utils.spawnEntity(block, {
                entity: { type: "container", inventory_size: DOUBLE_SIZE }
            });

            if (!entity?.isValid) {
                console.warn("[Project Bee] Feeding Slab double entity spawn failed.");
                return;
            }

            entity.nameTag = DOUBLE_TITLE;

            // Restore saved items into the new inventory
            const inv = getInventory(entity);
            if (inv) {
                for (let i = 0; i < savedItems.length; i++) {
                    if (savedItems[i]) inv.getSlot(i).setItem(savedItems[i]);
                }
            }

            system.run(() => {
                if (!entity?.isValid) return;
                try { InterfaceManager.ensureEntityInterfaces(entity); } catch { }
            });
        } catch (err) {
            console.warn(`[Project Bee] Feeding Slab double upgrade error: ${err}`);
        }
    });
}

world.beforeEvents.playerInteractWithEntity.subscribe(event => {
    const { player, target, itemStack } = event;
    if (itemStack?.typeId !== BLOCK_ID) return;
    const block = getEntityBlock(target);
    if (block?.typeId !== BLOCK_ID || isDouble(block)) return;
    event.cancel = true;
    system.run(() => {
        if (!player.isValid || !target.isValid) return;
        // Re-read both the block and held item after leaving the read-only event.
        upgradeFeedingSlab(getEntityBlock(target), player);
    });
});
