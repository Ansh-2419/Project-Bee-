// ============================================================
// Project Bee — Bee Block → Entity Spawner
//
// Any block carrying the "utilitycraft:bee_block" custom
// component converts itself into the matching bee entity when
// placed. Placement is cancelled and the entity is spawned in
// the same tick via system.run so the block never renders.
//
// The BEE_BLOCK_ENTITY_MAP handles cases where the block/item
// ID differs from the entity ID (e.g. vanilla bee).
// ============================================================

import { system } from "@minecraft/server";
import * as DoriosLib from "DoriosLib/index.js";

// Maps block typeId → entity typeId when they differ.
// Any block not listed here uses its own typeId as the entity.
const BEE_BLOCK_ENTITY_MAP = {
    "utilitycraft:bee": "minecraft:bee",
};

DoriosLib.registry.blockComponent("utilitycraft:bee_block", {
    beforeOnPlayerPlace(event) {
        const block = event.block;
        if (!block?.isValid) return;

        event.cancel = true;

        system.run(() => {
            try {
                if (!block.isValid) return;
                const entityId = BEE_BLOCK_ENTITY_MAP[block.typeId] ?? block.typeId;
                block.dimension.spawnEntity(entityId, block.location);
                block.setType("minecraft:air");
            } catch (err) {
                console.warn(`[Project Bee] Bee block placement failed: ${err}`);
            }
        });
    },
});