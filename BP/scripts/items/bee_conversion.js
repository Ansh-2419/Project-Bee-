import { system } from "@minecraft/server";
import { isOnCooldown, setCooldown } from "../core/cooldown.js";
import { isBee, toSpawnId } from "../core/bee.js";

// ============================================================
// Project Bee — Bee Conversion System
// ============================================================

const ACTION_ID = "bee_conversion";
const CONVERSION_COOLDOWN = 10;

const BEE_CONVERSIONS = {
    "utilitycraft:diamond_bee":  { itemId: "minecraft:netherite_block",    result: "utilitycraft:netherite_bee"  },
    "utilitycraft:duranium_bee": { itemId: "utilitycraft:voltanium_block", result: "utilitycraft:voltanium_bee"  },
    "utilitycraft:voltanium_bee":{ itemId: "utilitycraft:adamant_block",   result: "utilitycraft:adamant_bee"    },
};

// ============================================================
// Conversion Handler
// ============================================================

export function convertBee(player, bee, heldItem, slot) {
    const recipe = BEE_CONVERSIONS[bee.typeId];
    if (!recipe) return false;
    if (heldItem?.typeId !== recipe.itemId) return false;

    const now = system.currentTick;

    // BUG FIX: isOnCooldown treats missing timestamp as "never used",
    // so the first conversion in a session is never wrongly blocked.
    if (isOnCooldown(player.id, ACTION_ID, now, CONVERSION_COOLDOWN)) {
        return true; // signal handled, but skip this tick
    }

    const location  = { ...bee.location };
    const dimension = bee.dimension;

    try {
        // BUG FIX: Spawn replacement BEFORE removing the original.
        // If spawnEntity throws, the original bee is preserved.
        dimension.spawnEntity(recipe.result, location);

        // BUG FIX: bee.isValid is a property, not a method.
        if (bee.isValid) {
            bee.remove();
        }

        // BUG FIX: Re-read the held slot immediately before consuming,
        // so a stale reference can't consume a different item.
        const currentItem = slot.getItem();
        if (currentItem?.typeId === recipe.itemId) {
            if (currentItem.amount > 1) {
                currentItem.amount--;
                slot.setItem(currentItem);
            } else {
                slot.setItem(undefined);
            }
        }

        // BUG FIX: Set cooldown AFTER successful conversion only.
        setCooldown(player.id, ACTION_ID, now);

        const beeName = recipe.result
            .split(":")[1]
            .replace(/_/g, " ")
            .replace(/\b\w/g, c => c.toUpperCase());

        player.sendMessage(`§aBee converted into §e${beeName}§a!`);

    } catch (error) {
        console.warn(`[Project Bee] Bee conversion error: ${error}`);
    }

    return true;
}
