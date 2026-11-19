// ============================================================
// Project Bee — Upgrade Definitions  (remodeled)
//
// UPGRADE TYPES
//   Speed      — reduces production interval (stackable per slot)
//   Productivity — multiplies comb output count (stackable, capped)
//   Capacity   — not applied here; consumed by expansion logic
//   Breeding   — not applied here; reserved for breeding chamber
//   Simulator  — switches hive to simulator mode (feeder required)
//
// HELPERS (exported for advance_beehive.js)
//   getTotalSpeedBonus(slotItems)        → tick reduction number
//   getTotalProductivityMultiplier(...)  → output multiplier (≥1)
//   hasSimulator(slotItems)              → boolean
// ============================================================

// ── Speed Upgrades ────────────────────────────────────────────
export const speedUpgrades = [
    { tier: 1, itemId: "projectbee:speed_upgrade_1", tickReduction:  5, label: "Speed Upgrade I"   },
    { tier: 2, itemId: "projectbee:speed_upgrade_2", tickReduction: 10, label: "Speed Upgrade II"  },
    { tier: 3, itemId: "projectbee:speed_upgrade_3", tickReduction: 15, label: "Speed Upgrade III" },
    { tier: 4, itemId: "projectbee:speed_upgrade_4", tickReduction: 20, label: "Speed Upgrade IV"  },
    { tier: 5, itemId: "projectbee:speed_upgrade_5", tickReduction: 25, label: "Speed Upgrade V"   },
];

// ── Productivity Upgrades ─────────────────────────────────────
// Each installed productivity upgrade adds +1 to the output count multiplier.
// Maximum multiplier is capped at MAX_PRODUCTIVITY_MULTIPLIER to prevent runaway output.
export const productivityUpgrades = [
    { itemId: "projectbee:productivity_upgrade", outputBonus: 1, label: "Productivity Upgrade" },
];
export const MAX_PRODUCTIVITY_MULTIPLIER = 4; // base 1× + up to 3 upgrades → 4×

// ── Simulator Upgrade ─────────────────────────────────────────
export const simulatorUpgrade = {
    itemId: "utilitycraft:simulator_upgrade",
    label:  "Simulator Upgrade",
};

// ── Helpers ───────────────────────────────────────────────────

/**
 * Returns total tick reduction from all speed upgrades in the given slot items.
 * Also supports the legacy UtilityCraft generic speed upgrade.
 * @param {(import("@minecraft/server").ItemStack|undefined)[]} slotItems
 * @returns {number}
 */
export function getTotalSpeedBonus(slotItems) {
    let bonus = 0;
    for (const item of slotItems) {
        if (!item) continue;
        const def = speedUpgrades.find(u => u.itemId === item.typeId);
        if (def) bonus += def.tickReduction;
        // Legacy UC speed upgrade support
        if (item.typeId === "utilitycraft:speed_upgrade") bonus += 15;
    }
    return bonus;
}

/**
 * Returns output multiplier (integer ≥ 1) from all productivity upgrades.
 * @param {(import("@minecraft/server").ItemStack|undefined)[]} slotItems
 * @returns {number}
 */
export function getTotalProductivityMultiplier(slotItems) {
    let multiplier = 1;
    for (const item of slotItems) {
        if (!item) continue;
        const def = productivityUpgrades.find(u => u.itemId === item.typeId);
        if (def) multiplier += def.outputBonus;
    }
    return Math.min(multiplier, MAX_PRODUCTIVITY_MULTIPLIER);
}

/**
 * Returns true if any upgrade slot contains a simulator upgrade.
 * @param {(import("@minecraft/server").ItemStack|undefined)[]} slotItems
 * @returns {boolean}
 */
export function hasSimulator(slotItems) {
    return slotItems.some(item => item?.typeId === simulatorUpgrade.itemId);
}

/**
 * Returns a human-readable summary of active upgrades for UI display.
 * @param {(import("@minecraft/server").ItemStack|undefined)[]} slotItems
 * @returns {string[]}  Lines to show in UI
 */
export function getUpgradeSummaryLines(slotItems) {
    const lines = [];
    const speedBonus = getTotalSpeedBonus(slotItems);
    if (speedBonus > 0) lines.push(`§7Speed: §a-${speedBonus}t`);
    const prodMult = getTotalProductivityMultiplier(slotItems);
    if (prodMult > 1) lines.push(`§7Productivity: §ax${prodMult}`);
    if (hasSimulator(slotItems)) lines.push("§7Simulator: §aON");
    return lines;
}
