// ============================================================
// Project Bee — core/cooldown.js
//
// Tick-based per-player cooldown tracking.
// DoriosLib and DoriosCore have no equivalent helper.
//
// BUG FIX: A missing previous-use timestamp now means "not on
// cooldown", not "last used at tick 0". In the old code,
// (undefined ?? 0) + DURATION > now evaluated to true for
// the first ~10 ticks of a world session, blocking the first
// use entirely.
// ============================================================

/** @type {Map<string, number>} composite key → last-used tick */
const cooldowns = new Map();

/**
 * @param {string} playerId
 * @param {string} actionId
 * @returns {string}
 */
function makeKey(playerId, actionId) {
    return `${playerId}:${actionId}`;
}

/**
 * Returns true when the action is still cooling down.
 * A missing timestamp is treated as "never used" (not on cooldown).
 *
 * @param {string} playerId
 * @param {string} actionId
 * @param {number} currentTick
 * @param {number} duration  ticks the cooldown lasts
 * @returns {boolean}
 */
export function isOnCooldown(playerId, actionId, currentTick, duration) {
    const lastUsed = cooldowns.get(makeKey(playerId, actionId));
    if (lastUsed === undefined) return false;          // never used → not cooling down
    return currentTick - lastUsed < duration;
}

/**
 * Records a cooldown after the action has succeeded.
 * Call this AFTER the operation completes, not before.
 *
 * @param {string} playerId
 * @param {string} actionId
 * @param {number} currentTick
 */
export function setCooldown(playerId, actionId, currentTick) {
    cooldowns.set(makeKey(playerId, actionId), currentTick);
}

/**
 * Explicitly clears a cooldown (e.g. when an action is cancelled).
 *
 * @param {string} playerId
 * @param {string} actionId
 */
export function clearCooldown(playerId, actionId) {
    cooldowns.delete(makeKey(playerId, actionId));
}
