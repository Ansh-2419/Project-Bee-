// ============================================================
// Project Bee — Bee Registry
//
// Add a new bee by appending one entry to BEES.
// beesIds and BEE_DISPLAY_NAMES are derived automatically.
// ============================================================

export const BEES = [
    { id: "minecraft:bee",                 displayName: "Bee"               },
    { id: "utilitycraft:iron_bee",         displayName: "Iron Bee"          },
    { id: "utilitycraft:diamond_bee",      displayName: "Diamond Bee"       },
    { id: "utilitycraft:gold_bee",         displayName: "Gold Bee"          },
    { id: "utilitycraft:netherite_bee",    displayName: "Netherite Bee"     },
    { id: "utilitycraft:copper_bee",       displayName: "Copper Bee"        },
    { id: "utilitycraft:lapis_bee",        displayName: "Lapis Bee"         },
    { id: "utilitycraft:redstone_bee",     displayName: "Redstone Bee"      },
    { id: "utilitycraft:mining_bee",       displayName: "Mining Bee"        },
    { id: "utilitycraft:quartz_bee",       displayName: "Quartz Bee"        },
    { id: "utilitycraft:blue_banded_bee",  displayName: "Blue Banded Bee"   },
    { id: "utilitycraft:leaf_cutter_bee",  displayName: "Leaf Cutter Bee"   },
    { id: "utilitycraft:ender_bee",        displayName: "Ender Bee"         },
    { id: "utilitycraft:coal_bee",         displayName: "Coal Bee"          },
    { id: "utilitycraft:emerald_bee",      displayName: "Emerald Bee"       },
    { id: "utilitycraft:glowing_bee",      displayName: "Glowing Bee"       },
    { id: "utilitycraft:blue_mason_bee",   displayName: "Blue Mason Bee"    },
    { id: "utilitycraft:magmatic_bee",     displayName: "Magmatic Bee"      },
    { id: "utilitycraft:bumble_bee",       displayName: "Bumble Bee"        },
    { id: "utilitycraft:amethyst_bee",     displayName: "Amethyst Bee"      },
    { id: "utilitycraft:dirt_bee",         displayName: "Dirt Bee"          },
    { id: "utilitycraft:echo_bee",         displayName: "Echo Bee"          },
    { id: "utilitycraft:biomass_bee",      displayName: "Biomass Bee"       },
    { id: "utilitycraft:slime_bee",        displayName: "Slime Bee"         },
    { id: "utilitycraft:obsidian_bee",     displayName: "Obsidian Bee"      },
    { id: "utilitycraft:bone_bee",         displayName: "Bone Bee"          },
    { id: "utilitycraft:magnetic_bee",     displayName: "Magnetic Bee"      },
    // ── UC Alloy Bees ─────────────────────────────────────────
    { id: "utilitycraft:steel_bee",          displayName: "Steel Bee"         },
    { id: "utilitycraft:energized_iron_bee", displayName: "Energized Iron Bee"},
    { id: "utilitycraft:duranium_bee",       displayName: "Duranium Bee"      },
    { id: "utilitycraft:voltanium_bee",      displayName: "Voltanium Bee"     },
    { id: "utilitycraft:adamant_bee",        displayName: "Adamant Bee"       },
];

export const beesIds           = BEES.map(b => b.id);
export const BEE_DISPLAY_NAMES = Object.fromEntries(BEES.map(b => [b.id, b.displayName]));

// ── Cage types ────────────────────────────────────────────────
// reusable[i]: true = release returns the empty cage back to the player

export const beeCageType = {
    emptyCageIds:  ["utilitycraft:bee_cage",        "utilitycraft:sturdy_bee_cage"       ],
    filledCageIds: ["utilitycraft:bee_cage_filled", "utilitycraft:sturdy_bee_cage_filled"],
    reusable:      [false,                          true                                  ],
};

// ── Dynamic property keys ─────────────────────────────────────

export const BEE_DATA_PROP = "utilitycraft:beeData";
export const BEE_BABY_PROP = "utilitycraft:beeIsBaby";

// ── Cage lore ─────────────────────────────────────────────────

/**
 * Writes Type + Stage lore onto a filled bee cage ItemStack.
 * @param {import("@minecraft/server").ItemStack} item
 * @param {string} beeId
 * @param {boolean} isBaby
 */
export function applyBeeCageLore(item, beeId, isBaby) {
    const name  = BEE_DISPLAY_NAMES[beeId] ?? beeId;
    const stage = isBaby ? "§cBaby §7(Cannot release)" : "§aAdult";
    item.setLore([
        `§7Type: §e${name}`,
        `§7Stage: ${stage}`,
    ]);
}