// ============================================================
// Project Bee — Bee Nests
//
// Each bee in a nest has its OWN timer.
// The nest tracks a separate countdown per bee type.
// When a bee's timer hits 0 it spawns, its timer resets.
// All bee timers run simultaneously — multiple bees from
// one nest can be active at once.
//
// Player right-clicks with honey_treat → reduces ALL timers
// in the nest by 30% of their current value.
// ============================================================

import { world } from "@minecraft/server";
import * as DoriosLib from "DoriosLib/index.js";

const HONEY_TREAT_ID  = "utilitycraft:honey_treat";
const TREAT_REDUCTION = 0.30;

// ── Nest spawn data ───────────────────────────────────────────
// timer: ticks between spawns for THIS bee in THIS nest

const nestSpawnData = [
    // ── Wood nests ────────────────────────────────────────────
    {
        nestId: "projectbee:oak_nest",
        beeTypes: [
            { beeId: "minecraft:bee",               timer: 200 },
            { beeId: "utilitycraft:biomass_bee",     timer: 300 },
        ],
    },
    {
        nestId: "projectbee:birch_nest",
        beeTypes: [
            { beeId: "minecraft:bee",               timer: 200 },
            { beeId: "utilitycraft:biomass_bee",     timer: 300 },
            { beeId: "utilitycraft:blue_banded_bee", timer: 600 },
        ],
    },
    {
        nestId: "projectbee:spruce_nest",
        beeTypes: [
            { beeId: "minecraft:bee",               timer: 200 },
            { beeId: "utilitycraft:biomass_bee",     timer: 300 },
            { beeId: "utilitycraft:leaf_cutter_bee", timer: 600 },
        ],
    },
    {
        nestId: "projectbee:jungle_nest",
        beeTypes: [
            { beeId: "utilitycraft:biomass_bee",     timer: 300 },
            { beeId: "utilitycraft:blue_mason_bee",  timer: 600 },
        ],
    },
    {
        nestId: "projectbee:acacia_nest",
        beeTypes: [
            { beeId: "utilitycraft:biomass_bee",     timer: 300 },
            { beeId: "utilitycraft:bumble_bee",      timer: 600 },
        ],
    },
    {
        nestId: "projectbee:dark_oak_nest",
        beeTypes: [
            { beeId: "utilitycraft:biomass_bee",     timer: 300 },
            { beeId: "utilitycraft:magnetic_bee",    timer: 600 },
        ],
    },

    // ── Stone / overworld ─────────────────────────────────────
    {
        nestId: "projectbee:stone_nest",
        beeTypes: [
            { beeId: "utilitycraft:mining_bee",      timer: 400 },
            { beeId: "utilitycraft:dirt_bee",        timer: 400 },
        ],
    },
    {
        nestId: "projectbee:coarse_dirt_nest",
        beeTypes: [
            { beeId: "utilitycraft:dirt_bee",        timer: 300 },
            { beeId: "utilitycraft:biomass_bee",     timer: 400 },
        ],
    },

    // ── Nether nests ──────────────────────────────────────────
    {
        nestId: "projectbee:nether_brick_nest",
        beeTypes: [
            { beeId: "utilitycraft:magmatic_bee",    timer: 500 },
        ],
    },
    {
        nestId: "projectbee:nether_quartz_ore_nest",
        beeTypes: [
            { beeId: "utilitycraft:quartz_bee",      timer: 500 },
        ],
    },
    {
        nestId: "projectbee:nether_gold_ore_nest",
        beeTypes: [
            { beeId: "utilitycraft:gold_bee",        timer: 600 },
        ],
    },
    {
        nestId: "projectbee:glowstone_nest",
        beeTypes: [
            { beeId: "utilitycraft:glowing_bee",     timer: 500 },
        ],
    },

    // ── End nest ──────────────────────────────────────────────
    {
        nestId: "projectbee:endstone_nest",
        beeTypes: [
            { beeId: "utilitycraft:ender_bee",       timer: 700 },
        ],
    },
];

// ── Per-nest timer state ──────────────────────────────────────
// Map<nestKey, Map<beeId, currentTick>>

const nestTimers = new Map();

function nestKey(block) {
    const { x, y, z } = block.location;
    return `${x},${y},${z},${block.dimension.id}`;
}

function initTimers(key, data) {
    if (nestTimers.has(key)) return;
    const map = new Map();
    for (const { beeId, timer } of data.beeTypes) {
        map.set(beeId, timer);
    }
    nestTimers.set(key, map);
}

// ── Cardinal direction spawn offset ──────────────────────────

const OFFSETS = {
    north: { dx:  0, dz: -1 },
    south: { dx:  0, dz:  1 },
    east:  { dx:  1, dz:  0 },
    west:  { dx: -1, dz:  0 },
};

function getSpawnLoc(block) {
    const cardinal = block.permutation.getState("minecraft:cardinal_direction") ?? "north";
    const { dx, dz } = OFFSETS[cardinal] ?? OFFSETS.north;
    const { x, y, z } = block.location;
    return { x: x + dx + 0.5, y: y + 0.5, z: z + dz + 0.5 };
}

// ── NestBlock class ───────────────────────────────────────────

class NestBlock {
    constructor(block) {
        this.block     = block;
        this.dimension = block.dimension;
        this.key       = nestKey(block);
        this.data      = nestSpawnData.find(d => d.nestId === block.typeId);
    }

    onTick() {
        if (!this.data) return;

        initTimers(this.key, this.data);
        const timers   = nestTimers.get(this.key);
        const spawnLoc = getSpawnLoc(this.block);

        for (const { beeId, timer } of this.data.beeTypes) {
            const current = timers.get(beeId) ?? timer;

            if (current <= 0) {
                // Spawn this bee
                try {
                    this.dimension.spawnEntity(beeId, spawnLoc);
                } catch (err) {
                    console.warn(`[Project Bee] Nest spawn failed (${beeId}): ${err}`);
                }
                timers.set(beeId, timer); // reset to full timer
            } else {
                timers.set(beeId, current - 1);
            }
        }
    }

    onInteract(player) {
        if (!player?.isValid || !this.data) return;

        initTimers(this.key, this.data);
        const timers = nestTimers.get(this.key);

        // Honey treat — reduce ALL bee timers by 30%
        try {
            const inv      = player.getComponent("minecraft:inventory")?.container;
            const slot     = inv?.getSlot(player.selectedSlotIndex);
            const handItem = slot?.getItem();

            if (handItem?.typeId === HONEY_TREAT_ID) {
                for (const [beeId, current] of timers) {
                    const reduction = Math.floor(current * TREAT_REDUCTION);
                    timers.set(beeId, Math.max(0, current - reduction));
                }

                if (handItem.amount > 1) { handItem.amount--; slot.setItem(handItem); }
                else slot.setItem(undefined);
            }
        } catch { }

        // Show all bee timers on action bar
        try {
            const lines = this.data.beeTypes.map(({ beeId, timer }) => {
                const name    = beeId.split(":")[1].replace(/_/g, " ");
                const current = timers.get(beeId) ?? timer;
                return `§e${name}§r: §a${current}§7t`;
            });
            player.onScreenDisplay.setActionBar(lines.join("  |  "));
        } catch { }
    }

    onBreak() {
        nestTimers.delete(this.key);
    }
}

// ── Register component for all nest IDs ───────────────────────

for (const nestData of nestSpawnData) {
    DoriosLib.registry.blockComponent(nestData.nestId, {
        onPlace(event) {
            const key = nestKey(event.block);
            nestTimers.delete(key); // fresh timers on placement
            initTimers(key, nestData);
        },

        onTick(event) {
            if (!event.block?.isValid) return;
            try {
                new NestBlock(event.block).onTick();
            } catch (err) {
                console.warn(`[Project Bee] Nest tick error: ${err}`);
            }
        },

        onPlayerInteract(event) {
            if (!event.block?.isValid) return;
            try {
                new NestBlock(event.block).onInteract(event.player);
            } catch (err) {
                console.warn(`[Project Bee] Nest interact error: ${err}`);
            }
        },

        onPlayerDestroy(event) {
            try {
                new NestBlock(event.block).onBreak();
            } catch { }
        },
    });
}