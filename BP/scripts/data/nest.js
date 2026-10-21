// ============================================================
// Project Bee — Bee Nests
//
// Each bee type in a nest has its own independent countdown
// timer. All timers run simultaneously — multiple bees can
// spawn at different rates from the same nest.
//
// Right-clicking with a Honey Treat reduces every bee's
// remaining timer by 30% and consumes one treat.
//
// The action bar shows remaining ticks for each bee on
// interact so the player knows when to expect a spawn.
// ============================================================

import * as DoriosLib from "DoriosLib/index.js";

const HONEY_TREAT_ID  = "utilitycraft:honey_treat";
const TREAT_REDUCTION = 0.30;

// ── Nest spawn data ───────────────────────────────────────────
// nestId = custom component key registered in block JSON
// timer  = ticks between spawns for that bee type

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
            { beeId: "utilitycraft:biomass_bee",    timer: 300 },
            { beeId: "utilitycraft:blue_mason_bee", timer: 600 },
        ],
    },
    {
        nestId: "projectbee:acacia_nest",
        beeTypes: [
            { beeId: "utilitycraft:biomass_bee", timer: 300 },
            { beeId: "utilitycraft:bumble_bee",  timer: 600 },
        ],
    },
    {
        nestId: "projectbee:dark_oak_nest",
        beeTypes: [
            { beeId: "utilitycraft:biomass_bee",  timer: 300 },
            { beeId: "utilitycraft:magnetic_bee", timer: 600 },
        ],
    },
    // ── Stone / overworld ─────────────────────────────────────
    {
        nestId: "projectbee:stone_nest",
        beeTypes: [
            { beeId: "utilitycraft:mining_bee", timer: 400 },
            { beeId: "utilitycraft:dirt_bee",   timer: 400 },
        ],
    },
    {
        nestId: "projectbee:coarse_dirt_nest",
        beeTypes: [
            { beeId: "utilitycraft:dirt_bee",    timer: 300 },
            { beeId: "utilitycraft:biomass_bee", timer: 400 },
        ],
    },
    // ── Nether nests ──────────────────────────────────────────
    {
        nestId: "projectbee:nether_brick_nest",
        beeTypes: [
            { beeId: "utilitycraft:magmatic_bee", timer: 500 },
        ],
    },
    {
        nestId: "projectbee:nether_quartz_ore_nest",
        beeTypes: [
            { beeId: "utilitycraft:quartz_bee", timer: 500 },
        ],
    },
    {
        nestId: "projectbee:nether_gold_ore_nest",
        beeTypes: [
            { beeId: "utilitycraft:gold_bee", timer: 600 },
        ],
    },
    {
        nestId: "projectbee:glowstone_nest",
        beeTypes: [
            { beeId: "utilitycraft:glowing_bee", timer: 500 },
        ],
    },
    // ── End nest ──────────────────────────────────────────────
    {
        nestId: "projectbee:endstone_nest",
        beeTypes: [
            { beeId: "utilitycraft:ender_bee", timer: 700 },
        ],
    },
];

// ── Timer state ───────────────────────────────────────────────
// Map<nestKey, Map<beeId, ticksRemaining>>

const nestTimers = new Map();

function nestKey(block) {
    const { x, y, z } = block.location;
    return `${x},${y},${z},${block.dimension.id}`;
}

function initTimers(key, data) {
    if (nestTimers.has(key)) return;
    const map = new Map();
    for (const { beeId, timer } of data.beeTypes) map.set(beeId, timer);
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

// ── Register all nests ────────────────────────────────────────

for (const nestData of nestSpawnData) {
    DoriosLib.registry.blockComponent(nestData.nestId, {

        onPlace(event) {
            const key = nestKey(event.block);
            nestTimers.delete(key);
            initTimers(key, nestData);
        },

        onTick(event) {
            const block = event.block;
            if (!block?.isValid) return;

            const key = nestKey(block);
            initTimers(key, nestData);

            const timers   = nestTimers.get(key);
            const spawnLoc = getSpawnLoc(block);

            for (const { beeId, timer } of nestData.beeTypes) {
                const current = timers.get(beeId) ?? timer;
                if (current <= 0) {
                    try { block.dimension.spawnEntity(beeId, spawnLoc); }
                    catch (err) { console.warn(`[Project Bee] Nest spawn failed (${beeId}): ${err}`); }
                    timers.set(beeId, timer);
                } else {
                    timers.set(beeId, current - 1);
                }
            }
        },

        onPlayerInteract(event) {
            const block  = event.block;
            const player = event.player;
            if (!block?.isValid || !player?.isValid) return;

            const key = nestKey(block);
            initTimers(key, nestData);
            const timers = nestTimers.get(key);

            // Honey treat — reduce all timers by 30%
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

            // Action bar — remaining ticks per bee
            try {
                const lines = nestData.beeTypes.map(({ beeId, timer }) => {
                    const name    = beeId.split(":")[1].replace(/_/g, " ");
                    const current = timers.get(beeId) ?? timer;
                    return `§e${name}§r: §a${current}§7t`;
                });
                player.onScreenDisplay.setActionBar(lines.join("  |  "));
            } catch { }
        },

        onPlayerDestroy(event) {
            nestTimers.delete(nestKey(event.block));
        },
    });
}