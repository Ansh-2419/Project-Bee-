import { system } from "@minecraft/server";
import * as DoriosLib from "DoriosLib/index.js";

DoriosLib.registry.blockComponent("utilitycraft:bee_block", {
beforeOnPlayerPlace(event) {
const block = event.block;
if (!block?.isValid) return;

    // Prevent the normal block placement.
    event.cancel = true;

    system.run(() => {
        try {
            if (!block.isValid) return;

            const entityId =
                block.typeId === "utilitycraft:bee"
                    ? "minecraft:bee"
                    : block.typeId;

            block.dimension.spawnEntity(entityId, block.location);
            block.setType("minecraft:air");
        } catch (error) {
            console.warn(
                `[Project Bee] Bee block placement failed: ${error}`
            );
        }
    });
}

});