/**
 * Project Bee — Feeder Slab recipes
 *
 * Maps bee IDs to the block/item types that count as food for them.
 * Used by advance_beehive.js when a simulator upgrade is installed:
 * the beehive looks at the feeder slab in front-and-below and only
 * produces combs for bees whose food item is present there.
 */
export const feederBlocks = [
    {
        beeId: "utilitycraft:iron_bee",
        feederBlocks: [
            "minecraft:iron_block",
            "minecraft:iron_ore",
            "minecraft:deepslate_iron_ore",
            "minecraft:raw_iron_block"
        ]
    },
    {
        beeId: "utilitycraft:copper_bee",
        feederBlocks: [
            "minecraft:copper_block",
            "minecraft:copper_ore",
            "minecraft:deepslate_copper_ore",
            "minecraft:raw_copper_block"
        ]
    },
    {
        beeId: "utilitycraft:gold_bee",
        feederBlocks: [
            "minecraft:gold_block",
            "minecraft:gold_ore",
            "minecraft:deepslate_gold_ore",
            "minecraft:raw_gold_block"
        ]
    },
    {
        beeId: "utilitycraft:netherite_bee",
        feederBlocks: [
            "minecraft:netherite_block",
            "minecraft:ancient_debris"
        ]
    },
    {
        beeId: "utilitycraft:diamond_bee",
        feederBlocks: [
            "minecraft:diamond_block",
            "minecraft:diamond_ore",
            "minecraft:deepslate_diamond_ore"
        ]
    },
    {
        beeId: "utilitycraft:emerald_bee",
        feederBlocks: [
            "minecraft:emerald_block",
            "minecraft:emerald_ore",
            "minecraft:deepslate_emerald_ore"
        ]
    },
    {
        beeId: "utilitycraft:redstone_bee",
        feederBlocks: [
            "minecraft:redstone_block",
            "minecraft:redstone_ore",
            "minecraft:deepslate_redstone_ore"
        ]
    },
    {
        beeId: "utilitycraft:lapis_bee",
        feederBlocks: [
            "minecraft:lapis_block",
            "minecraft:lapis_ore",
            "minecraft:deepslate_lapis_ore"
        ]
    },
    {
        beeId: "utilitycraft:coal_bee",
        feederBlocks: [
            "minecraft:coal_block",
            "minecraft:coal_ore",
            "minecraft:deepslate_coal_ore"
        ]
    },
    {
        beeId: "utilitycraft:quartz_bee",
        feederBlocks: [
            "minecraft:quartz_block",
            "minecraft:nether_quartz_ore"
        ]
    },
    {
        beeId: "utilitycraft:glowing_bee",
        feederBlocks: [
            "minecraft:glowstone"
        ]
    },
    {
        beeId: "utilitycraft:amethyst_bee",
        feederBlocks: [
            "minecraft:amethyst_block",
            "minecraft:budding_amethyst"
        ]
    },
    {
        beeId: "utilitycraft:echo_bee",
        feederBlocks: [
            "minecraft:echo_shard",
            "minecraft:sculk",
            "minecraft:sculk_catalyst",
            "minecraft:sculk_sensor"
        ]
    },
    {
        beeId: "utilitycraft:ender_bee",
        feederBlocks: [
            "minecraft:end_stone",
            "minecraft:end_stone_bricks"
        ]
    },
    {
        beeId: "utilitycraft:obsidian_bee",
        feederBlocks: [
            "minecraft:obsidian",
            "minecraft:crying_obsidian"
        ]
    },
    {
        beeId: "utilitycraft:slime_bee",
        feederBlocks: [
            "minecraft:slime"
        ]
    },
    {
        beeId: "utilitycraft:bone_bee",
        feederBlocks: [
            "minecraft:bone_block"
        ]
    },
    {
        beeId: "utilitycraft:magmatic_bee",
        feederBlocks: [
            "minecraft:magma"
        ]
    },
    {
        beeId: "utilitycraft:biomass_bee",
        feederBlocks: [
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
            "minecraft:sunflower",
            "minecraft:lilac",
            "minecraft:rose_bush",
            "minecraft:peony"
        ]
    },
];
