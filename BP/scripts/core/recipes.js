// ============================================================
// Project Bee — core/recipes.js
//
// Output-preflight and transactional insertion helpers for
// Centrifuge, Advance Beehive, and Bee Incubator.
// DoriosLib and DoriosCore have no equivalent helpers for
// probabilistic multi-output recipes.
// ============================================================

import { ItemStack } from "@minecraft/server";

/**
 * Checks whether every item in `outputs` can fit into the container's
 * output slots without committing any changes.
 *
 * BUG FIX: The old code used `OUTPUT_SLOTS.some(i => item || space > 0)`,
 * which only verified that at least one slot had any space — it did not
 * check whether ALL outputs would fit. This caused silently lost items
 * when multiple outputs competed for the last open slot.
 *
 * @param {import("@minecraft/server").Container} container
 * @param {number[]} outputSlots
 * @param {Array<{ typeId: string, count: number }>} outputs
 * @returns {boolean}
 */
export function canFitAllOutputs(container, outputSlots, outputs) {
    if (!container?.isValid) return false;

    // Snapshot only the relevant output slots so we simulate
    // packing without touching the full container.
    const snapshot = outputSlots.map(i => {
        const item = container.getItem(i);
        return item
            ? { typeId: item.typeId, amount: item.amount, max: item.maxAmount ?? 64 }
            : null;
    });

    for (const out of outputs) {
        let remaining = out.count;

        // Try to stack onto existing matching items first.
        for (const slot of snapshot) {
            if (!slot || slot.typeId !== out.typeId) continue;
            const space = slot.max - slot.amount;
            if (space <= 0) continue;
            const take = Math.min(space, remaining);
            slot.amount += take;
            remaining -= take;
            if (remaining <= 0) break;
        }

        // Then use empty slots.
        if (remaining > 0) {
            for (let i = 0; i < snapshot.length; i++) {
                if (snapshot[i] !== null) continue;
                snapshot[i] = { typeId: out.typeId, amount: remaining, max: 64 };
                remaining = 0;
                break;
            }
        }

        if (remaining > 0) return false;
    }

    return true;
}

/**
 * Inserts a list of outputs into the container's output slots.
 * Each item is inserted independently so a single full slot does
 * not prevent other outputs from being placed.
 *
 * BUG FIX: Old `insertOutput` only tried stacking then the first empty
 * slot — it did not split across partial stacks, so a 32-stack would
 * silently vanish when a slot already had 33 of the same item.
 *
 * @param {import("@minecraft/server").Container} container
 * @param {number[]} outputSlots
 * @param {Array<{ typeId: string, count: number }>} outputs
 */
export function insertOutputs(container, outputSlots, outputs) {
    if (!container?.isValid) return;

    for (const out of outputs) {
        let remaining = out.count;

        // Pass 1: stack onto existing matching items.
        for (const i of outputSlots) {
            if (remaining <= 0) break;
            const item = container.getItem(i);
            if (!item || item.typeId !== out.typeId) continue;
            const space = (item.maxAmount ?? 64) - item.amount;
            if (space <= 0) continue;
            const take = Math.min(space, remaining);
            item.amount += take;
            container.setItem(i, item);
            remaining -= take;
        }

        // Pass 2: fill empty slots.
        for (const i of outputSlots) {
            if (remaining <= 0) break;
            if (container.getItem(i)) continue;
            const place = Math.min(remaining, 64);
            container.setItem(i, new ItemStack(out.typeId, place));
            remaining -= place;
        }

        if (remaining > 0) {
            console.warn(`[Project Bee] insertOutputs: could not place ${remaining}x ${out.typeId}`);
        }
    }
}

/**
 * Rolls a weighted output array and returns the chosen entry's value.
 *
 * @template T
 * @param {Array<T & { weight: number }>} outputs
 * @returns {T | undefined}
 */
export function rollWeightedOutput(outputs) {
    if (!outputs?.length) return undefined;
    const total = outputs.reduce((s, o) => s + o.weight, 0);
    if (total <= 0) return outputs[0];
    let roll = Math.random() * total;
    for (const o of outputs) {
        roll -= o.weight;
        if (roll <= 0) return o;
    }
    return outputs[outputs.length - 1];
}
