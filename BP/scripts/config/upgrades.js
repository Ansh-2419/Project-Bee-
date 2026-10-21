// ============================================================
// Project Bee — Upgrade Definitions
//
// speedUpgrades: array ordered tier 1→5.
//   itemId       — the item identifier placed in the upgrade slot
//   tickReduction— how many ticks faster per upgrade installed
//                  (stacks: 4 slots × tickReduction)
//   label        — display name used in UI/lore
//
// simulatorUpgrade: the simulator upgrade item ID.
//
// Usage in advance_beehive:
//   import { speedUpgrades, simulatorUpgrade } from "../config/upgrades.js";
//   const speedBonus = getTotalSpeedBonus(upgrades);
//   const isSim      = hasSimulator(upgrades);
// ============================================================

export const speedUpgrades = [
    {
        tier:          1,
        itemId:        "projectbee:speed_upgrade_1",
        tickReduction: 5,      // −5 ticks per upgrade (base 100t → 80t with 4×)
        label:         "Speed Upgrade I",
    },
    {
        tier:          2,
        itemId:        "projectbee:speed_upgrade_2",
        tickReduction: 10,     // −10 ticks per upgrade (→ 60t with 4×)
        label:         "Speed Upgrade II",
    },
    {
        tier:          3,
        itemId:        "projectbee:speed_upgrade_3",
        tickReduction: 15,     // −15 ticks per upgrade (→ 40t with 4×)
        label:         "Speed Upgrade III",
    },
    {
        tier:          4,
        itemId:        "projectbee:speed_upgrade_4",
        tickReduction: 20,     // −20 ticks per upgrade (→ 20t with 4×)
        label:         "Speed Upgrade IV",
    },
    {
        tier:          5,
        itemId:        "projectbee:speed_upgrade_5",
        tickReduction: 25,     // −25 ticks per upgrade (→ 0t capped at 10t with 4×)
        label:         "Speed Upgrade V",
    },
];

export const simulatorUpgrade = {
    itemId: "utilitycraft:simulator_upgrade",
    label:  "Simulator Upgrade",
};

// ── Helpers ───────────────────────────────────────────────────

/**
 * Returns total tick reduction from all speed upgrades in the given slot items.
 * @param {(ItemStack|undefined)[]} slotItems — items from upgrade slots
 * @returns {number} total tick reduction
 */
export function getTotalSpeedBonus(slotItems) {
    let bonus = 0;
    for (const item of slotItems) {
        if (!item) continue;
        const def = speedUpgrades.find(u => u.itemId === item.typeId);
        if (def) bonus += def.tickReduction;
        // Also support the original UC speed upgrade
        if (item.typeId === "utilitycraft:speed_upgrade") bonus += 15;
    }
    return bonus;
}

/**
 * Returns true if any upgrade slot contains a simulator upgrade.
 * @param {(ItemStack|undefined)[]} slotItems
 * @returns {boolean}
 */
export function hasSimulator(slotItems) {
    return slotItems.some(item => item?.typeId === simulatorUpgrade.itemId);
}
