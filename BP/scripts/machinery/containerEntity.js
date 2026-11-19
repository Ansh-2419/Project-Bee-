import { DEFAULT_ENTITY_ID } from "DoriosCore/index.js";

/**
 * Resolve the owning block of a shared UC inventory entity.
 * Returns undefined when the entity is invalid, the wrong type,
 * or its chunk is not loaded.
 *
 * @param {import("@minecraft/server").Entity} entity
 * @returns {import("@minecraft/server").Block | undefined}
 */
export function getEntityBlock(entity) {
    if (!entity?.isValid || entity.typeId !== DEFAULT_ENTITY_ID) return undefined;
    const { x, y, z } = entity.location;
    const location = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) };
    if (!entity.dimension.isChunkLoaded(location)) return undefined;
    return entity.dimension.getBlock(location);
}

/**
 * Find the helper entity associated with a block.
 * Uses exact type and floored-coordinate matching to avoid
 * accidentally returning a nearby entity.
 *
 * IMPROVEMENT: Added an early isChunkLoaded guard on the block side
 * (not just the entity side) so callers don't need to guard separately.
 *
 * @param {import("@minecraft/server").Block} block
 * @returns {import("@minecraft/server").Entity | undefined}
 */
export function getBlockEntity(block) {
    if (!block?.isValid) return undefined;
    if (!block.dimension.isChunkLoaded(block.location)) return undefined;
    const { x, y, z } = block.location;
    return block.dimension
        .getEntitiesAtBlockLocation(block.location)
        .find(entity => {
            if (!entity.isValid || entity.typeId !== DEFAULT_ENTITY_ID) return false;
            const loc = entity.location;
            return (
                Math.floor(loc.x) === x &&
                Math.floor(loc.y) === y &&
                Math.floor(loc.z) === z
            );
        });
}
