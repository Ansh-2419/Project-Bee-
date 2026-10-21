// ============================================================
// Project Bee — Bee Nests
//
// Each bee in a nest has its own independent countdown timer.
// All timers run simultaneously — multiple bees can spawn
// from the same nest at different rates.
//
// Player right-clicks with honey_treat → reduces ALL bee timers
// by 30% of their current remaining value, consumes one treat.
//
// Action bar shows each bee's remaining ticks on interact.
// ============================================================

import { world } from "@minecraft/server";
import * as DoriosLib from "DoriosLib/index.js";

const HONEY_TREAT_ID  = "utilitycraft:honey_treat";
const TREAT_REDUCTION = 0.30;

// ── Nest spawn data ───────────────────────────────────────────
// nestId must match the block identifier exactly.
// timer = ticks between spawns for that specific bee.

const nestSpawnData = [
    // ── Wood nests ────────────────────────────────────────────
    {
        nestId: "utilitycraft:oak_nest",
        beeTypes: [
            { beeId: "minecraft:bee",               timer: 200 },
            { beeId: "utilitycraft:biomass_bee",     timer: 300 },
        ],
    },
    {
        nestId: "utilitycraft:birch_nest",
        beeTypes: [
            { beeId: "minecraft:bee",               timer: 200 },
            { beeId: "utilitycraft:biomass_bee",     timer: 300 },
            { beeId: "utilitycraft:blue_banded_bee", timer: 600 },
        ],
    },
    {
        nestId: "utilitycraft:spruce_nest",
        beeTypes: [
            { beeId: "minecraft:bee",               timer: 200 },
            { beeId: "utilitycraft:biomass_bee",     timer: 300 },
            { beeId: "utilitycraft:leaf_cutter_bee", timer: 600 },
        ],
    },
    {
        nestId: "utilitycraft:jungle_nest",
        beeTypes: [
            { beeId: "utilitycraft:biomass_bee",     timer: 300 },
            { beeId: "utilitycraft:blue_mason_bee",  timer: 600 },
        ],
    },
    {
        nestId: "utilitycraft:acacia_nest",
        beeTypes: [
            { beeId: "utilitycraft:biomass_bee",     timer: 300 },
            { beeId: "utilitycraft:bumble_bee",      timer: 600 },
        ],
    },
    {
        nestId: "utilitycraft:dark_oak_nest",
        beeTypes: [
            { beeId: "utilitycraft:biomass_bee",     timer: 300 },
            { beeId: "utilitycraft:magnetic_bee",    timer: 600 },
        ],
    },
    // ── Stone / overworld ─────────────────────────────────────
    {
        nestId: "utilitycraft:stone_nest",
        beeTypes: [
            { beeId: "utilitycraft:mining_bee",      timer: 400 },
            { beeId: "utilitycraft:dirt_bee",        timer: 400 },
        ],
    },
    {
        nestId: "utilitycraft:coarse_dirt_nest",
        beeTypes: [
            { beeId: "utilitycraft:dirt_bee",        timer: 300 },
            { beeId: "utilitycraft:biomass_bee",     timer: 400 },
        ],
    },
    // ── Nether nests ──────────────────────────────────────────
    {
        nestId: "utilitycraft:nether_brick_nest",
        beeTypes: [
            { beeId: "utilitycraft:magmatic_bee",    timer: 500 },
        ],
    },
    {
        nestId: "utilitycraft:nether_quartz_ore_nest",
        beeTypes: [
            { beeId: "utilitycraft:quartz_bee",      timer: 500 },
        ],
    },
    {
        nestId: "utilitycraft:nether_gold_ore_nest",
        beeTypes: [
            { beeId: "utilitycraft:gold_bee",        timer: 600 },
        ],
    },
    {
        nestId: "utilitycraft:glowstone_nest",
        beeTypes: [
            { beeId: "utilitycraft:glowing_bee",     timer: 500 },
        ],
    },
    // ── End nest ──────────────────────────────────────────────
    {
        nestId: "utilitycraft:endstone_nest",
        beeTypes: [
            { beeId: "utilitycraft:ender_bee",       timer: 700 },
        ],
    },
];

// ── Per-nest timer state ──────────────────────────────────────
// Map<nestKey, Map<beeId, ticksRemaining>>

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

// ── Spawn location ────────────────────────────────────────────

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
                try {
                    this.dimension.spawnEntity(beeId, spawnLoc);
                } catch (err) {
                    console.warn(`[Project Bee] Nest spawn failed (${beeId}): ${err}`);
                }
                timers.set(beeId, timer);
            } else {
                timers.set(beeId, current - 1);
            }
        }
    }

    onInteract(player) {
        if (!player?.isValid || !this.data) return;
        initTimers(this.key, this.data);

        const timers = nestTimers.get(this.key);

        try {
            const inv      = player.getComponent("minecraft:inventory")?.container;
            const slot     = inv?.getSlot(player.selectedSlotIndex);
            const handItem = slot?.getItem();

            if (handItem?.typeId === HONEY_TREAT_ID) {
                for (const [beeId, current] of timers) {
                    timers.set(beeId, Math.max(0, current - Math.floor(current * TREAT_REDUCTION)));
                }
                if (handItem.amount > 1) { handItem.amount--; slot.setItem(handItem); }
                else slot.setItem(undefined);
            }
        } catch { }

        // Show timers on action bar
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

// ── Register all nest block components ────────────────────────

for (const nestData of nestSpawnData) {
    DoriosLib.registry.blockComponent(nestData.nestId, {
        onPlace(event) {
            const key = nestKey(event.block);
            nestTimers.delete(key);
            initTimers(key, nestData);
        },

        onTick(event) {
            if (!event.block?.isValid) return;
            try {
                new NestBlock(event.block).onTick();
            } catch (err) {
                console.warn(`[Project Bee] Nest tick error (${nestData.nestId}): ${err}`);
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
