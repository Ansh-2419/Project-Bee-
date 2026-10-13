export const BLOCK_ENTITY_ID = "utilitycraft:energy_fluid_slot";

export const beesIds = [
    "utilitycraft:iron_bee",
    "utilitycraft:diamond_bee",
    "utilitycraft:gold_bee",
    "utilitycraft:netherite_bee",
    "utilitycraft:copper_bee",
    "minecraft:bee",
    "utilitycraft:lapis_bee",
    "utilitycraft:redstone_bee",
    "utilitycraft:mining_bee",
    "utilitycraft:quartz_bee",
    "utilitycraft:blue_banded_bee",
    "utilitycraft:leaf_cutter_bee",
    "utilitycraft:ender_bee",
    "utilitycraft:coal_bee",
    "utilitycraft:emerald_bee",
    "utilitycraft:glowing_bee",
    "utilitycraft:blue_mason_bee",
    "utilitycraft:magmatic_bee",
    "utilitycraft:bumble_bee",
    "utilitycraft:amethyst_bee",
    "utilitycraft:dirt_bee",
    "utilitycraft:echo_bee",
    "utilitycraft:biomass_bee",
    "utilitycraft:slime_bee",
    "utilitycraft:obsidian_bee",
    "utilitycraft:bone_bee",
];

export const combIds = [
    "minecraft:honeycomb",
    "utilitycraft:iron_comb",
    "utilitycraft:gold_comb",
    "utilitycraft:diamond_comb",
    "utilitycraft:netherite_comb",
    "utilitycraft:copper_comb",
    "utilitycraft:redstone_comb",
    "utilitycraft:lapis_comb",
    "utilitycraft:quartz_comb",
    "utilitycraft:ender_comb",
    "utilitycraft:emerald_comb",
    "utilitycraft:coal_comb",
    "utilitycraft:glowing_comb",
    "utilitycraft:magmatic_comb",
    "utilitycraft:echo_comb",
    "utilitycraft:amethyst_comb",
    "utilitycraft:biomass_comb",
    "utilitycraft:slime_comb",
    "utilitycraft:obsidian_comb",
    "utilitycraft:bone_comb",
];

export const beeCageType = {
    emptyCageIds:  ["utilitycraft:bee_cage", "utilitycraft:sturdy_bee_cage"],
    filledCageIds: ["utilitycraft:bee_cage_filled", "utilitycraft:sturdy_bee_cage_filled"],
};

export const beeGuideData = [
    {
        beeId: "utilitycraft:echo_bee",
        message: `§6=== Echo BEE GUIDE ===§r

§eHow To Obtain:§r
• Breed §bDiamond Bee + Diamond Bee§r using §dEcho Shard§r

§eFeeder Blocks:§r
• Echo Shard
• Sculk
• Sculk Catalyst
• Sculk Sensor

§eBeehive Output:§r
• Echo Comb

§eCentrifuge (Echo Comb):§r
• Echo Shard
`,
    },
    {
        beeId: "utilitycraft:amethyst_bee",
        message: `§6=== Amethyst BEE GUIDE ===§r

§eHow To Obtain:§r
• Breed §bQuartz Bee + Glowing Bee§r

§eFeeder Blocks:§r
• Amethyst Block
• Budding Amethyst

§eBeehive Output:§r
• Amethyst Comb

§eCentrifuge (Amethyst Comb):§r
• Amethyst Shard
`,
    },
    {
        beeId: "utilitycraft:iron_bee",
        message: `§6=== IRON BEE GUIDE ===§r

§eHow To Obtain:§r
• Breed §bMining Bee + Quartz Bee§r

§ePossible Baby Result:§r
• §aIron Bee§r
• §aCopper Bee§r

§eFeeder Blocks:§r
• Iron Block / Ore / Deepslate Iron Ore / Raw Iron Block / Iron Ingot

§eAdvanced Beehive Output:§r
• Iron Comb x3 (99%)

§eCentrifuge (Iron Comb):§r
• Raw Iron x1 (50%)
• Wax x1 (99%)
`,
    },
    {
        beeId: "utilitycraft:biomass_bee",
        message: `§6=== Biomass BEE GUIDE ===§r

§eHow To Obtain:§r
• Spawns in all §bWood Nests§r except §cOak Nest§r

§eFeeder Blocks:§r
• All Types of Flowers

§eBeehive Output:§r
• Biomass Comb

§eCentrifuge (Biomass Comb):§r
• Bio Fragment
`,
    },
    {
        beeId: "utilitycraft:slime_bee",
        message: `§6=== SLIME BEE GUIDE ===§r

§eHow To Obtain:§r
• Spawns in areas where §aSlimes§r naturally spawn

§eFeeder Blocks:§r
• All Types of Flowers

§eBeehive Output:§r
• Slime Comb

§eCentrifuge (Slime Comb):§r
• Slime Ball
`,
    },
    {
        beeId: "utilitycraft:copper_bee",
        message: `§6=== COPPER BEE GUIDE ===§r

§eHow To Obtain:§r
• Breed §bMining Bee + Quartz Bee§r

§ePossible Baby Result:§r
• §aIron Bee§r
• §aCopper Bee§r

§eFeeder Blocks:§r
• Copper Block / Ore / Deepslate Copper Ore / Raw Copper Block / Copper Ingot

§eAdvanced Beehive Output:§r
• Copper Comb x3 (99%)

§eCentrifuge (Copper Comb):§r
• Raw Copper x1 (50%)
• Wax x1 (99%)
`,
    },
    {
        beeId: "utilitycraft:gold_bee",
        message: `§6=== GOLD BEE GUIDE ===§r

§eHow To Obtain:§r
• Breed §bBlue Mason Bee + Quartz Bee§r

§eFeeder Blocks:§r
• Gold Block / Ore / Ingot / Deepslate Gold Ore / Raw Gold Block

§eAdvanced Beehive Output:§r
• Gold Comb x3 (99%)

§eCentrifuge (Gold Comb):§r
• Raw Gold x1 (50%)
• Wax x1 (99%)
`,
    },
    {
        beeId: "utilitycraft:redstone_bee",
        message: `§6=== REDSTONE BEE GUIDE ===§r

§eHow To Obtain:§r
• Breed §bMining Bee + Glowing Bee§r

§eFeeder Blocks:§r
• Redstone Block / Ore / Deepslate Redstone Ore

§eAdvanced Beehive Output:§r
• Redstone Comb x3 (99%)

§eCentrifuge (Redstone Comb):§r
• Redstone x5 (50%)
• Wax x1 (99%)
`,
    },
    {
        beeId: "utilitycraft:lapis_bee",
        message: `§6=== LAPIS BEE GUIDE ===§r

§eHow To Obtain:§r
• Breed §bRedstone Bee + Blue Banded Bee§r

§eFeeder Blocks:§r
• Lapis Block / Ore / Deepslate Lapis Ore

§eAdvanced Beehive Output:§r
• Lapis Comb x3 (99%)

§eCentrifuge (Lapis Comb):§r
• Lapis Lazuli x3 (50%)
• Wax x1 (99%)
`,
    },
    {
        beeId: "utilitycraft:diamond_bee",
        message: `§6=== DIAMOND BEE GUIDE ===§r

§eHow To Obtain:§r
• Breed §bEnder Bee + Lapis Bee§r

§eFeeder Blocks:§r
• Diamond Block / Ore / Deepslate Diamond Ore

§eAdvanced Beehive Output:§r
• Diamond Comb x3 (99%)

§eCentrifuge (Diamond Comb):§r
• Diamond x1 (50%)
• Wax x1 (99%)

§eSpecial Conversion:§r
• Use Netherite Block → Converts to §6Netherite Bee§r
`,
    },
    {
        beeId: "utilitycraft:emerald_bee",
        message: `§6=== EMERALD BEE GUIDE ===§r

§eHow To Obtain:§r
• Breed §bDiamond Bee + Mining Bee§r

§eFeeder Blocks:§r
• Emerald Block / Ore / Deepslate Emerald Ore

§eAdvanced Beehive Output:§r
• Emerald Comb x3 (99%)

§eCentrifuge (Emerald Comb):§r
• Emerald x1 (50%)
• Wax x1 (99%)
`,
    },
    {
        beeId: "utilitycraft:coal_bee",
        message: `§6=== COAL BEE GUIDE ===§r

§eHow To Obtain:§r
• Breed §bMagnetic Bee + Leaf Cutter Bee§r

§eFeeder Blocks:§r
• Coal Block / Ore / Deepslate Coal Ore

§eAdvanced Beehive Output:§r
• Coal Comb x3 (99%)

§eCentrifuge (Coal Comb):§r
• Coal x3 (50%)
• Wax x1 (99%)
`,
    },
    {
        beeId: "utilitycraft:quartz_bee",
        message: `§6=== QUARTZ BEE GUIDE ===§r

§eSpawn Location:§r
• Spawns in Nether Quartz Ore Nest

§eFeeder Blocks:§r
• Quartz Block / Nether Quartz Ore

§eAdvanced Beehive Output:§r
• Quartz Comb x3 (99%)

§eCentrifuge (Quartz Comb):§r
• Quartz x2 (50%)
• Wax x1 (99%)
`,
    },
    {
        beeId: "utilitycraft:glowing_bee",
        message: `§6=== GLOWING BEE GUIDE ===§r

§eSpawn Location:§r
• Spawns in Glowstone Nest (Nether)

§eFeeder Blocks:§r
• Glowstone

§eAdvanced Beehive Output:§r
• Glowing Comb x3 (99%)
`,
    },
    {
        beeId: "utilitycraft:ender_bee",
        message: `§6=== ENDER BEE GUIDE ===§r

§eSpawn Location:§r
• Spawns in Endstone Nest (The End)

§eFeeder Blocks:§r
• End Stone / End Stone Bricks

§eAdvanced Beehive Output:§r
• Ender Comb x3 (99%)

§eCentrifuge (Ender Comb):§r
• Ender Pearl x1 (50%)
• Wax x1 (99%)
`,
    },
    {
        beeId: "utilitycraft:netherite_bee",
        message: `§6=== NETHERITE BEE GUIDE ===§r

§eHow To Obtain:§r
• Convert Diamond Bee using Netherite Block

§eFeeder Blocks:§r
• Netherite Block / Ancient Debris

§eAdvanced Beehive Output:§r
• Netherite Comb x3 (99%)

§eCentrifuge (Netherite Comb):§r
• Netherite Scrap x1 (50%)
• Wax x1 (99%)
`,
    },
    {
        beeId: "utilitycraft:magmatic_bee",
        message: `§6=== MAGMATIC BEE GUIDE ===§r

§eSpawn Location:§r
• Spawns in Nether Brick Nest (Nether)

§eAdvanced Beehive Output:§r
• Magmatic Comb x3 (99%)

§eCentrifuge (Magmatic Comb):§r
• Magma Cream x1 (30%)
• Wax x1 (99%)
`,
    },
];

// ── Bee cage lore helpers ─────────────────────────────────────

export const BEE_BABY_PROP = "utilitycraft:beeIsBaby";

export const BEE_DISPLAY_NAMES = {
    "minecraft:bee":                "Bee",
    "utilitycraft:iron_bee":        "Iron Bee",
    "utilitycraft:bone_bee":        "Bone Bee",
    "utilitycraft:obsidian_bee":    "Obsidian Bee",
    "utilitycraft:slime_bee":       "Slime Bee",
    "utilitycraft:diamond_bee":     "Diamond Bee",
    "utilitycraft:gold_bee":        "Gold Bee",
    "utilitycraft:copper_bee":      "Copper Bee",
    "utilitycraft:netherite_bee":   "Netherite Bee",
    "utilitycraft:lapis_bee":       "Lapis Bee",
    "utilitycraft:redstone_bee":    "Redstone Bee",
    "utilitycraft:quartz_bee":      "Quartz Bee",
    "utilitycraft:glowing_bee":     "Glowing Bee",
    "utilitycraft:ender_bee":       "Ender Bee",
    "utilitycraft:coal_bee":        "Coal Bee",
    "utilitycraft:emerald_bee":     "Emerald Bee",
    "utilitycraft:magmatic_bee":    "Magmatic Bee",
    "utilitycraft:echo_bee":        "Echo Bee",
    "utilitycraft:amethyst_bee":    "Amethyst Bee",
    "utilitycraft:biomass_bee":     "Biomass Bee",
    "utilitycraft:magnetic_bee":    "Magnetic Bee",
    "utilitycraft:leaf_cutter_bee": "Leaf Cutter Bee",
    "utilitycraft:dirt_bee":        "Dirt Bee",
    "utilitycraft:bumble_bee":      "Bumble Bee",
    "utilitycraft:blue_mason_bee":  "Blue Mason Bee",
    "utilitycraft:mining_bee":      "Mining Bee",
    "utilitycraft:blue_banded_bee": "Blue Banded Bee",
};

/**
 * Applies Type + Stage lore to a filled bee cage ItemStack.
 * @param {ItemStack} item
 * @param {string} beeId
 * @param {boolean} isBaby
 */
export function applyBeeCageLore(item, beeId, isBaby) {
    const name  = BEE_DISPLAY_NAMES[beeId] ?? beeId;
    const stage = isBaby
        ? "§cBaby §7(Cannot release)"
        : "§aAdult";
    item.setLore([
        `§7Type: §e${name}`,
        `§7Stage: ${stage}`,
    ]);
}