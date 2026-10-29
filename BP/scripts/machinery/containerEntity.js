import { DEFAULT_ENTITY_ID } from "DoriosCore/index.js";

/** Resolve the owning cell of a shared UC inventory, excluding outlines and bees. */
export function getEntityBlock(entity) {
    if (!entity?.isValid || entity.typeId !== DEFAULT_ENTITY_ID) return undefined;
    const { x, y, z } = entity.location;
    const location = { x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) };
    if (!entity.dimension.isChunkLoaded(location)) return undefined;
    return entity.dimension.getBlock(location);
}

/** The exact type and owning cell prevent nearby entities from becoming the inventory. */
export function getBlockEntity(block) {
    if (!block?.isValid || !block.dimension.isChunkLoaded(block.location)) return undefined;
    const { x, y, z } = block.location;
    return block.dimension.getEntitiesAtBlockLocation(block.location).find(entity => {
        if (!entity.isValid || entity.typeId !== DEFAULT_ENTITY_ID) return false;
        const location = entity.location;
        return Math.floor(location.x) === x && Math.floor(location.y) === y && Math.floor(location.z) === z;
    });
}
