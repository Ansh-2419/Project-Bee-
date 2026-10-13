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
        { itemId: "utilitycraft:wax", count: 1, chance: 99 }
      ]
    },
    energyCost: 8000,
    seconds: 4
  }
];

export function getCentrifugeRecipes() {
  return centrifugeRecipes;
}