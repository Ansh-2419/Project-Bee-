/**
 * Project Bee — Advanced Beehive Comb Recipes
 *
 * Each bee has a 99% chance to produce 3 combs.
 */

export const advancedBeehive = [
    {
        input: { itemId: "utilitycraft:iron_bee" },
        output: { itemId: "utilitycraft:iron_comb", count: 3, chance: 99 }
    },
    {
        input: { itemId: "utilitycraft:bone_bee" },
        output: { itemId: "utilitycraft:bone_comb", count: 3, chance: 99 }
    },
    {
        input: { itemId: "utilitycraft:obsidian_bee" },
        output: { itemId: "utilitycraft:obsidian_comb", count: 3, chance: 99 }
    },
    {
        input: { itemId: "utilitycraft:slime_bee" },
        output: { itemId: "utilitycraft:slime_comb", count: 3, chance: 99 }
    },
    {
        input: { itemId: "utilitycraft:diamond_bee" },
        output: { itemId: "utilitycraft:diamond_comb", count: 3, chance: 99 }
    },
    {
        input: { itemId: "utilitycraft:gold_bee" },
        output: { itemId: "utilitycraft:gold_comb", count: 3, chance: 99 }
    },
    {
        input: { itemId: "utilitycraft:copper_bee" },
        output: { itemId: "utilitycraft:copper_comb", count: 3, chance: 99 }
    },
    {
        input: { itemId: "utilitycraft:netherite_bee" },
        output: { itemId: "utilitycraft:netherite_comb", count: 3, chance: 99 }
    },
    {
        input: { itemId: "utilitycraft:lapis_bee" },
        output: { itemId: "utilitycraft:lapis_comb", count: 3, chance: 99 }
    },
    {
        input: { itemId: "utilitycraft:redstone_bee" },
        output: { itemId: "utilitycraft:redstone_comb", count: 3, chance: 99 }
    },
    {
        input: { itemId: "utilitycraft:bee" },
        output: { itemId: "minecraft:honeycomb", count: 3, chance: 99 }
    },
    {
        input: { itemId: "utilitycraft:quartz_bee" },
        output: { itemId: "utilitycraft:quartz_comb", count: 3, chance: 99 }
    },
    {
        input: { itemId: "utilitycraft:glowing_bee" },
        output: { itemId: "utilitycraft:glowing_comb", count: 3, chance: 99 }
    },
    {
        input: { itemId: "utilitycraft:ender_bee" },
        output: { itemId: "utilitycraft:ender_comb", count: 3, chance: 99 }
    },
    {
        input: { itemId: "utilitycraft:coal_bee" },
        output: { itemId: "utilitycraft:coal_comb", count: 3, chance: 99 }
    },
    {
        input: { itemId: "utilitycraft:emerald_bee" },
        output: { itemId: "utilitycraft:emerald_comb", count: 3, chance: 99 }
    },
    {
        input: { itemId: "utilitycraft:magmatic_bee" },
        output: { itemId: "utilitycraft:magmatic_comb", count: 3, chance: 99 }
    },
    {
        input: { itemId: "utilitycraft:echo_bee" },
        output: { itemId: "utilitycraft:echo_comb", count: 3, chance: 99 }
    },
    {
        input: { itemId: "utilitycraft:amethyst_bee" },
        output: { itemId: "utilitycraft:amethyst_comb", count: 3, chance: 99 }
    },
    {
        input: { itemId: "utilitycraft:biomass_bee" },
        output: { itemId: "utilitycraft:biomass_comb", count: 3, chance: 99 }
    }
];

export default advancedBeehive;
// Compatibility fix: prevents imports from failing.
// Empty array disables the old machine-processing recipes.
export const advanceBeehiveRecipes = [];

export function getAdvanceBeehiveRecipes() {
    return advanceBeehiveRecipes;
}