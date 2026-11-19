// ============================================================
// Project Bee — core/bee.js
//
// Shared bee identity helpers and filled-cage construction.
// None of this overlaps with DoriosLib or DoriosCore.
// ============================================================

import { ItemStack } from "@minecraft/server";
import {
    beesIds,
    BEE_DISPLAY_NAMES,
    beeCageType,
    BEE_DATA_PROP,
    BEE_BABY_PROP,
    applyBeeCageLore,
} from "../data/data.js";

/**
 * Returns true when the given type ID belongs to a supported bee.
 * @param {string} typeId
 * @returns {boolean}
 */
export function isBee(typeId) {
    return beesIds.includes(typeId);
}

/**
 * Returns the display name for a bee type ID, or the raw ID as fallback.
 * @param {string} typeId
 * @returns {string}
 */
export function getBeeName(typeId) {
    return BEE_DISPLAY_NAMES[typeId] ?? typeId;
}

/**
 * Maps a live entity ID to the internal storage ID used in item slots.
 * Vanilla "minecraft:bee" is stored as "utilitycraft:bee" because item
 * slots cannot hold entity IDs directly.
 * @param {string} entityTypeId
 * @returns {string}
 */
export function toStorageId(entityTypeId) {
    return entityTypeId === "minecraft:bee" ? "utilitycraft:bee" : entityTypeId;
}

/**
 * Maps a storage item ID back to the entity type ID used for spawning.
 * @param {string} storageId
 * @returns {string}
 */
export function toSpawnId(storageId) {
    return storageId === "utilitycraft:bee" ? "minecraft:bee" : storageId;
}

/**
 * Builds a filled-cage ItemStack with bee data embedded.
 *
 * @param {{
 *   filledCageId: string,
 *   beeId: string,
 *   isBaby: boolean
 * }} opts
 * @returns {ItemStack}
 */
export function createFilledCage({ filledCageId, beeId, isBaby }) {
    const cage = new ItemStack(filledCageId, 1);
    cage.setDynamicProperty(BEE_DATA_PROP, beeId);
    cage.setDynamicProperty(BEE_BABY_PROP, isBaby);
    applyBeeCageLore(cage, beeId, isBaby);
    return cage;
}

/**
 * Reads and validates bee data from a filled cage ItemStack.
 * Returns null when the item is not a valid filled cage.
 *
 * @param {import("@minecraft/server").ItemStack | undefined} itemStack
 * @returns {{ beeId: string, isBaby: boolean, filledCageIndex: number } | null}
 */
export function readFilledCage(itemStack) {
    if (!itemStack) return null;
    const idx = beeCageType.filledCageIds.indexOf(itemStack.typeId);
    if (idx === -1) return null;
    const beeId = itemStack.getDynamicProperty(BEE_DATA_PROP);
    if (typeof beeId !== "string") return null;
    const isBaby = itemStack.getDynamicProperty(BEE_BABY_PROP) ?? false;
    return { beeId, isBaby: !!isBaby, filledCageIndex: idx };
}

/**
 * Attempts to spawn a bee from a filled cage at the given location.
 * Does NOT consume the cage — the caller is responsible for that.
 *
 * BUG FIX: Cage should only be consumed after a confirmed successful spawn.
 *
 * @param {import("@minecraft/server").Dimension} dimension
 * @param {import("@minecraft/server").Vector3} location
 * @param {import("@minecraft/server").ItemStack} itemStack
 * @returns {boolean} true if the entity was spawned successfully
 */
export function spawnBeeFromCage(dimension, location, itemStack) {
    const data = readFilledCage(itemStack);
    if (!data) return false;
    if (data.isBaby) return false; // Baby bees cannot be released
    const spawnId = toSpawnId(data.beeId);
    try {
        dimension.spawnEntity(spawnId, location);
        return true;
    } catch (err) {
        console.warn(`[Project Bee] spawnBeeFromCage failed: ${err}`);
        return false;
    }
}
