/**
 * Project Bee — Advanced Beehive Comb Recipes
 *
 * Each bee has a 99% chance to produce 3 combs.
 *
 * IMPROVEMENT: Recipes are derived from the BEES registry in data.js
 * rather than being maintained as a parallel hand-written list.
 * Adding a new bee to data.js automatically gives it a comb recipe —
 * no need to touch this file. Exceptions (vanilla bee → honeycomb,
 * utilitycraft:bee storage alias) are handled explicitly below.
 */

import { BEES } from "../../data/data.js";

// Bees whose output diverges from the standard "<namespace>:<name>_comb" pattern.
const OVERRIDES = {
    "minecraft:bee":      "minecraft:honeycomb",
    "utilitycraft:bee":   "minecraft:honeycomb", // internal storage alias for vanilla bee
};

// Bees intentionally excluded from comb production in the advance beehive.
const EXCLUDED = new Set([]);

function combIdForBee(beeId) {
    if (OVERRIDES[beeId]) return OVERRIDES[beeId];
    // "utilitycraft:iron_bee" → "utilitycraft:iron_comb"
    return beeId.replace(/_bee$/, "_comb");
}

export const advancedBeehive = BEES
    .filter(({ id }) => !EXCLUDED.has(id))
    .map(({ id }) => ({
        input:  { itemId: id },
        output: { itemId: combIdForBee(id), count: 3, chance: 99 },
    }));

export default advancedBeehive;

// Compatibility: other modules that imported these still compile.
export const advanceBeehiveRecipes = [];
export function getAdvanceBeehiveRecipes() { return advanceBeehiveRecipes; }
