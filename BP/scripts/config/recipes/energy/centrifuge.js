/**
 * Powered Centrifuge recipes
 *
 * Each recipe:
 * {
 *   input: { itemId: "...", amount: 1 },
 *   output: {
 *     items: [
 *       { itemId: "...", count: 1, chance: 99 },
 *       { itemId: "...", count: 1, chance: 50 }
 *     ]
 *   },
 *   energyCost: 8000,
 *   seconds: 4
 * }
 *
 * chance is a 0-100 percentage roll per output item per craft.
 */

export const centrifugeRecipes = [
  {
    input: { itemId: "minecraft:honeycomb", amount: 1 },
    output: {
      items: [
        { itemId: "utilitycraft:wax", count: 1, chance: 99 }
      ]
    },
    energyCost: 8000,
    seconds: 4
  },

  {
    input: { itemId: "utilitycraft:iron_comb", amount: 1 },
    output: {
      items: [
        { itemId: "minecraft:raw_iron", count: 1, chance: 50 },
        { itemId: "utilitycraft:wax", count: 1, chance: 99 }
      ]
    },
    energyCost: 8000,
    seconds: 4
  },

  {
    input: { itemId: "utilitycraft:copper_comb", amount: 1 },
    output: {
      items: [
        { itemId: "minecraft:raw_copper", count: 1, chance: 50 },
        { itemId: "utilitycraft:wax", count: 1, chance: 99 }
      ]
    },
    energyCost: 8000,
    seconds: 4
  },

  {
    input: { itemId: "utilitycraft:gold_comb", amount: 1 },
    output: {
      items: [
        { itemId: "minecraft:raw_gold", count: 1, chance: 50 },
        { itemId: "utilitycraft:wax", count: 1, chance: 99 }
      ]
    },
    energyCost: 8000,
    seconds: 4
  },

  {
    input: { itemId: "utilitycraft:netherite_comb", amount: 1 },
    output: {
      items: [
        { itemId: "minecraft:netherite_scrap", count: 1, chance: 50 },
        { itemId: "utilitycraft:wax", count: 1, chance: 99 }
      ]
    },
    energyCost: 8000,
    seconds: 4
  },

  {
    input: { itemId: "utilitycraft:coal_comb", amount: 1 },
    output: {
      items: [
        { itemId: "minecraft:coal", count: 3, chance: 50 },
        { itemId: "utilitycraft:wax", count: 1, chance: 99 }
      ]
    },
    energyCost: 8000,
    seconds: 4
  },

  {
    input: { itemId: "utilitycraft:diamond_comb", amount: 1 },
    output: {
      items: [
        { itemId: "minecraft:diamond", count: 1, chance: 50 },
        { itemId: "utilitycraft:wax", count: 1, chance: 99 }
      ]
    },
    energyCost: 8000,
    seconds: 4
  },

  {
    input: { itemId: "utilitycraft:emerald_comb", amount: 1 },
    output: {
      items: [
        { itemId: "minecraft:emerald", count: 1, chance: 50 },
        { itemId: "utilitycraft:wax", count: 1, chance: 99 }
      ]
    },
    energyCost: 8000,
    seconds: 4
  },

  {
    input: { itemId: "utilitycraft:lapis_comb", amount: 1 },
    output: {
      items: [
        { itemId: "minecraft:lapis_lazuli", count: 3, chance: 50 },
        { itemId: "utilitycraft:wax", count: 1, chance: 99 }
      ]
    },
    energyCost: 8000,
    seconds: 4
  },

  {
    input: { itemId: "utilitycraft:redstone_comb", amount: 1 },
    output: {
      items: [
        { itemId: "minecraft:redstone", count: 5, chance: 50 },
        { itemId: "utilitycraft:wax", count: 1, chance: 99 }
      ]
    },
    energyCost: 8000,
    seconds: 4
  },

  {
    input: { itemId: "utilitycraft:quartz_comb", amount: 1 },
    output: {
      items: [
        { itemId: "minecraft:quartz", count: 2, chance: 50 },
        { itemId: "utilitycraft:wax", count: 1, chance: 99 }
      ]
    },
    energyCost: 8000,
    seconds: 4
  },

  {
    input: { itemId: "utilitycraft:amethyst_comb", amount: 1 },
    output: {
      items: [
        { itemId: "minecraft:amethyst_shard", count: 1, chance: 50 },
        { itemId: "utilitycraft:wax", count: 1, chance: 99 }
      ]
    },
    energyCost: 8000,
    seconds: 4
  },

  {
    input: { itemId: "utilitycraft:echo_comb", amount: 1 },
    output: {
      items: [
        { itemId: "minecraft:echo_shard", count: 1, chance: 50 },
        { itemId: "utilitycraft:wax", count: 1, chance: 99 }
      ]
    },
    energyCost: 8000,
    seconds: 4
  },

  {
    input: { itemId: "utilitycraft:ender_comb", amount: 1 },
    output: {
      items: [
        { itemId: "minecraft:ender_pearl", count: 1, chance: 50 },
        { itemId: "utilitycraft:wax", count: 1, chance: 99 }
      ]
    },
    energyCost: 8000,
    seconds: 4
  },

  {
    input: { itemId: "utilitycraft:obsidian_comb", amount: 1 },
    output: {
      items: [
        { itemId: "minecraft:obsidian", count: 1, chance: 50 },
        { itemId: "utilitycraft:wax", count: 1, chance: 99 }
      ]
    },
    energyCost: 8000,
    seconds: 4
  },

  {
    input: { itemId: "utilitycraft:slime_comb", amount: 1 },
    output: {
      items: [
        { itemId: "minecraft:slime_ball", count: 1, chance: 50 },
        { itemId: "utilitycraft:wax", count: 1, chance: 99 }
      ]
    },
    energyCost: 8000,
    seconds: 4
  },

  {
    input: { itemId: "utilitycraft:bone_comb", amount: 1 },
    output: {
      items: [
        { itemId: "minecraft:bone", count: 1, chance: 50 },
        { itemId: "utilitycraft:wax", count: 1, chance: 99 }
      ]
    },
    energyCost: 8000,
    seconds: 4
  },

  {
    input: { itemId: "utilitycraft:magmatic_comb", amount: 1 },
    output: {
      items: [
        { itemId: "minecraft:magma_cream", count: 1, chance: 30 },
        { itemId: "utilitycraft:wax", count: 1, chance: 99 }
      ]
    },
    energyCost: 8000,
    seconds: 4
  },

  {
    input: { itemId: "utilitycraft:biomass_comb", amount: 1 },
    output: {
      items: [
        { itemId: "utilitycraft:bio_fragment", count: 5, chance: 70 },
        { itemId: "utilitycraft:wax", count: 1, chance: 99 }
      ]
    },
    energyCost: 8000,
    seconds: 4
  },

  {
    input: { itemId: "utilitycraft:glowing_comb", amount: 1 },
    output: {
      items: [
        { itemId: "utilitycraft:wax", count: 1, chance: 99 },
        { itemId: "minecraft:glowstone_dust", count: 4, chance: 40 }
      ]
    },
    energyCost: 8000,
    seconds: 4
  },

  {
    input: { itemId: "utilitycraft:mining_comb", amount: 1 },
    output: {
      items: [
            {
                "itemId": "minecraft:cobblestone",
                "count": 4,
                "chance": 60
            },
            {
                "itemId": "utilitycraft:wax",
                "count": 1,
                "chance": 99
            }
        ]
    },
    energyCost: 8000,
    seconds: 4
  },

  {
    input: { itemId: "utilitycraft:leaf_cutter_comb", amount: 1 },
    output: {
      items: [
            {
                "itemId": "minecraft:oak_leaves",
                "count": 2,
                "chance": 60
            },
            {
                "itemId": "minecraft:oak_log",
                "count": 2,
                "chance": 40
            },
            {
                "itemId": "utilitycraft:wax",
                "count": 1,
                "chance": 99
            }
        ]
    },
    energyCost: 8000,
    seconds: 4
  },

  {
    input: { itemId: "utilitycraft:dirt_comb", amount: 1 },
    output: {
      items: [
            {
                "itemId": "minecraft:dirt",
                "count": 4,
                "chance": 70
            },
            {
                "itemId": "minecraft:gravel",
                "count": 2,
                "chance": 40
            },
            {
                "itemId": "utilitycraft:wax",
                "count": 1,
                "chance": 99
            }
        ]
    },
    energyCost: 8000,
    seconds: 4
  },

  {
    input: { itemId: "utilitycraft:steel_comb", amount: 1 },
    output: {
      items: [
        { itemId: "utilitycraft:steel_ingot",  count: 1, chance: 50 },
        { itemId: "utilitycraft:wax",          count: 1, chance: 99 }
      ]
    },
    energyCost: 10000,
    seconds: 6
  },

  {
    input: { itemId: "utilitycraft:energized_iron_comb", amount: 1 },
    output: {
      items: [
        { itemId: "utilitycraft:energized_iron_ingot", count: 1, chance: 50 },
        { itemId: "utilitycraft:wax",                  count: 1, chance: 99 }
      ]
    },
    energyCost: 12000,
    seconds: 6
  },

  {
    input: { itemId: "utilitycraft:duranium_comb", amount: 1 },
    output: {
      items: [
        { itemId: "utilitycraft:duranium_ingot", count: 1, chance: 50 },
        { itemId: "utilitycraft:wax",            count: 1, chance: 99 }
      ]
    },
    energyCost: 16000,
    seconds: 8
  },

  {
    input: { itemId: "utilitycraft:voltanium_comb", amount: 1 },
    output: {
      items: [
        { itemId: "utilitycraft:voltanium_ingot", count: 1, chance: 50 },
        { itemId: "utilitycraft:wax",             count: 1, chance: 99 }
      ]
    },
    energyCost: 20000,
    seconds: 10
  },

  {
    input: { itemId: "utilitycraft:adamant_comb", amount: 1 },
    output: {
      items: [
        { itemId: "utilitycraft:adamant_ingot", count: 1, chance: 50 },
        { itemId: "utilitycraft:wax",           count: 1, chance: 99 }
      ]
    },
    energyCost: 24000,
    seconds: 12
  },
];

export function getCentrifugeRecipes() {
  return centrifugeRecipes;
}