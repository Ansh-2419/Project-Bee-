/**
 * Project Bee — Breeding Chamber Recipes
 *
 * parent1 + parent2 (order-independent) + both flower slots
 * containing a valid flowerType → produces one of the baby bee IDs.
 *
 * outputs: array of { beeId, weight } — higher weight = more likely.
 * If only one output, weight is ignored.
 *
 * flowerTypes: items accepted in the two flower input slots.
 * Both flower slots must have a valid flower from this list.
 *
 * Use ALL_FLOWERS when any flower should be accepted.
 */

// ── All usable flowers ─────────────────────────────────────────
export const ALL_FLOWERS = [
    "minecraft:dandelion",
    "minecraft:poppy",
    "minecraft:blue_orchid",
    "minecraft:allium",
    "minecraft:azure_bluet",
    "minecraft:red_tulip",
    "minecraft:orange_tulip",
    "minecraft:white_tulip",
    "minecraft:pink_tulip",
    "minecraft:oxeye_daisy",
    "minecraft:cornflower",
    "minecraft:lily_of_the_valley",
    "minecraft:yellow_flower",
    "minecraft:wither_rose",
    "minecraft:sunflower",
    "minecraft:lilac",
    "minecraft:rose_bush",
    "minecraft:peony",
    "minecraft:flowering_azalea",
    "minecraft:azalea_leaves_flowered",
    "minecraft:mangrove_propagule",
    "minecraft:pitcher_plant",
    "minecraft:torchflower",
    "minecraft:cherry_leaves",
    "minecraft:pink_petals",
];

export const breedingRecipes = [
    // ── Natural bee crosses ───────────────────────────────────
    {
        parent1: "minecraft:bee",
        parent2: "minecraft:bee",
        flowerTypes: ALL_FLOWERS,
        outputs: [
            { beeId: "utilitycraft:bumble_bee",      weight: 30 },
            { beeId: "utilitycraft:blue_mason_bee",  weight: 20 },
            { beeId: "utilitycraft:leaf_cutter_bee", weight: 20 },
            { beeId: "utilitycraft:blue_banded_bee", weight: 15 },
            { beeId: "utilitycraft:dirt_bee",        weight: 15 },
        ]
    },

    // ── Raw material bees ─────────────────────────────────────
    {
        parent1: "utilitycraft:iron_bee",
        parent2: "utilitycraft:copper_bee",
        flowerTypes: ALL_FLOWERS,
        outputs: [
            { beeId: "utilitycraft:gold_bee", weight: 50 },
            { beeId: "utilitycraft:coal_bee", weight: 50 },
        ]
    },
    {
        parent1: "utilitycraft:iron_bee",
        parent2: "utilitycraft:gold_bee",
        flowerTypes: ALL_FLOWERS,
        outputs: [
            { beeId: "utilitycraft:diamond_bee", weight: 40 },
            { beeId: "utilitycraft:copper_bee",  weight: 60 },
        ]
    },
    {
        parent1: "utilitycraft:gold_bee",
        parent2: "utilitycraft:diamond_bee",
        flowerTypes: ALL_FLOWERS,
        outputs: [
            { beeId: "utilitycraft:netherite_bee", weight: 30 },
            { beeId: "utilitycraft:lapis_bee",     weight: 70 },
        ]
    },

    // ── Gem bees ──────────────────────────────────────────────
    {
        parent1: "utilitycraft:diamond_bee",
        parent2: "utilitycraft:emerald_bee",
        flowerTypes: [ "minecraft:allium", "minecraft:pink_tulip" ],
        outputs: [
            { beeId: "utilitycraft:amethyst_bee", weight: 50 },
            { beeId: "utilitycraft:quartz_bee",   weight: 50 },
        ]
    },
    {
        parent1: "utilitycraft:redstone_bee",
        parent2: "utilitycraft:glowing_bee",
        flowerTypes: [ "minecraft:poppy", "minecraft:red_tulip" ],
        outputs: [
            { beeId: "utilitycraft:magmatic_bee", weight: 60 },
            { beeId: "utilitycraft:echo_bee",     weight: 40 },
        ]
    },

    // ── Special bees ──────────────────────────────────────────
    {
        parent1: "utilitycraft:ender_bee",
        parent2: "utilitycraft:echo_bee",
        flowerTypes: [ "minecraft:lily_of_the_valley", "minecraft:azure_bluet" ],
        outputs: [
            { beeId: "utilitycraft:obsidian_bee", weight: 60 },
            { beeId: "utilitycraft:slime_bee",    weight: 40 },
        ]
    },
    {
        parent1: "utilitycraft:bone_bee",
        parent2: "utilitycraft:slime_bee",
        flowerTypes: [ "minecraft:oxeye_daisy", "minecraft:white_tulip" ],
        outputs: [
            { beeId: "utilitycraft:biomass_bee", weight: 70 },
            { beeId: "utilitycraft:dirt_bee",    weight: 30 },
        ]
    },
    {
        parent1: "utilitycraft:bumble_bee",
        parent2: "utilitycraft:leaf_cutter_bee",
        flowerTypes: [ "minecraft:sunflower", "minecraft:lilac" ],
        outputs: [
            { beeId: "utilitycraft:mining_bee",   weight: 50 },
            { beeId: "utilitycraft:magnetic_bee", weight: 50 },
        ]
    },

    // ── Alloy bees ────────────────────────────────────────────
    // Iron Bee + Coal Bee → 45 % Steel Bee, 55 % Coal Bee
    {
        parent1: "utilitycraft:iron_bee",
        parent2: "utilitycraft:coal_bee",
        flowerTypes: [ "minecraft:poppy", "minecraft:red_tulip" ],
        outputs: [
            { beeId: "utilitycraft:steel_bee", weight: 45 },
            { beeId: "utilitycraft:coal_bee",  weight: 55 },
        ]
    },
    // Steel Bee + Quartz Bee → 45 % Duranium Bee, 55 % Steel Bee
    {
        parent1: "utilitycraft:steel_bee",
        parent2: "utilitycraft:quartz_bee",
        flowerTypes: ALL_FLOWERS,
        outputs: [
            { beeId: "utilitycraft:duranium_bee", weight: 45 },
            { beeId: "utilitycraft:steel_bee",    weight: 55 },
        ]
    },
    // Iron Bee + Redstone Bee → Energized Iron Bee (any flower)
    {
        parent1: "utilitycraft:iron_bee",
        parent2: "utilitycraft:redstone_bee",
        flowerTypes: ALL_FLOWERS,
        outputs: [
            { beeId: "utilitycraft:energized_iron_bee", weight: 100 },
        ]
    },
];