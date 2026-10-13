/**
 * Powered Centrifuge — single-block machine implemented like Relic Synthesizer
 *
 * Uses the same UI layout / slot mapping / IO registration style as
 * Advanced Chemistry's relic_synthesizer for a familiar player experience.
 *
 * Slots:
 *  - PROGRESS_SLOT = 2   (uc.progress_display)
 *  - INPUT_SLOT    = 3   (single input)
 *  - OUTPUT_SLOTS  = 4..12 (3x3 grid)
 *  - IO_SLOTS      = [15, 20]
 *
 * Machine ID: "projectbee:powered_centrifuge"
 */

import { ItemStack } from "@minecraft/server";
import { Machine, registerIOInterface, EnergyStorage } from "DoriosCore/index.js";
import * as DoriosLib from "DoriosLib/index.js";
import { displayMachine, processMachine, stopMachine, addItemToSlot } from "./machine_helpers.js";
import { getCentrifugeRecipes } from "../../config/recipes/machinery/centrifuge.js";

const PROGRESS_SLOT = 2;
const INPUT_SLOT    = 3;
const OUTPUT_SLOTS  = [4, 5, 6, 7, 8, 9, 10, 11, 12];
const IO_SLOTS      = [15, 20];

const MACHINE_ID    = "projectbee:powered_centrifuge";
const DEFAULT_ENERGY = 8_000;
const DEFAULT_SECONDS = 4;

registerIOInterface(MACHINE_ID, {
    items: {
        buttonSlots: IO_SLOTS,
        anyInputSlots:  [INPUT_SLOT],
        anyOutputSlots: OUTPUT_SLOTS,
        modes: [
            { id: "disabled" },
            { id: "input_1",  inputSlots:  [INPUT_SLOT] },
            { id: "output_1", outputSlots: OUTPUT_SLOTS },
        ],
    },
});

DoriosLib.registry.blockComponent(MACHINE_ID, {
    beforeOnPlayerPlace(event, { params: settings }) {
        if (!event.player) return;
        const placementEvent = /** @type {import("DoriosCore/index.js").PlacementEventLike} */ (event);
        Machine.spawnEntity(placementEvent, settings, () => {
            const machine = new Machine(event.block, { ...settings, ignoreTick: true });
            if (!machine.valid) return;
            machine.setEnergyCost(settings.machine?.energy_cost ?? DEFAULT_ENERGY);
            machine.blockSlots([PROGRESS_SLOT]);
            displayMachine(machine);
        });
    },

    onTick({ block }, { params: settings }) {
        if (!globalThis.worldLoaded) return;

        const machine = new Machine(block, settings);
        if (!machine.valid) return;

        machine.processIO();

        const inputItem = machine.container.getItem(INPUT_SLOT);
        if (!inputItem) return stopMachine(machine, "No Input");

        const recipes = getCentrifugeRecipes();
        if (!recipes || recipes.length === 0) return stopMachine(machine, "No Recipes");

        // Find recipe matching the input item type
        const recipe = recipes.find(r =>
            (r.input?.itemId === inputItem.typeId) || (r.input?.id === inputItem.typeId)
        );
        if (!recipe) return stopMachine(machine, "Wrong Input");

        const required = Math.max(1, recipe.input?.amount ?? 1);
        if (inputItem.amount < required) return stopMachine(machine, `Need ×${required}`);

        // Compute craft limit by available input
        const maxRunsByInput = Math.floor(inputItem.amount / required);
        if (maxRunsByInput <= 0) return stopMachine(machine, "Need Items");

        // Check output space (ensure there is at least one free slot for potential outputs)
        if (!hasOutputSpace(machine.container)) return stopMachine(machine, "Output Full");

        const energyCost = Math.max(1, Math.floor(recipe.energyCost ?? settings.machine?.energy_cost ?? DEFAULT_ENERGY));
        const seconds = recipe.seconds ?? DEFAULT_SECONDS;

        if (machine.energy.get() <= 0 && machine.getProgress() < energyCost) {
            return stopMachine(machine, "No Energy", { resetProgress: false });
        }

        processMachine(machine, {
            energyCost,
            seconds,
            maxRuns: Math.max(1, maxRunsByInput),
            craft: (runs) => {
                // remove inputs
                const cur = machine.container.getItem(INPUT_SLOT);
                if (cur) {
                    const remaining = cur.amount - runs * required;
                    if (remaining > 0) {
                        cur.amount = remaining;
                        machine.container.setItem(INPUT_SLOT, cur);
                    } else {
                        machine.container.setItem(INPUT_SLOT, undefined);
                    }
                }

                // Roll outputs for each run and place into the 3x3 output grid
                for (let r = 0; r < runs; r++) {
                    for (const out of (recipe.output?.items ?? [])) {
                        const chance = Math.max(0, Math.min(100, out.chance ?? 100));
                        if (Math.random() * 100 < chance) {
                            addToOutputGrid(machine.container, out.itemId ?? out.id, Math.max(1, out.count ?? out.amount ?? 1));
                        }
                    }
                }
            },
        });

        // HUD / label
        const inputName = (inputItem.typeId.split(":")[1] ?? inputItem.typeId).replace(/_/g, " ");
        machine.setLabel([
            `§r§6Powered Centrifuge`,
            `§r§bInput:  §f${inputName} ×${machine.container.getItem(INPUT_SLOT)?.amount ?? 0}`,
            `§r§aOutputs: §f3×3 grid`,
            `§r§cCost:   §f${EnergyStorage.formatEnergyToText(machine.getEnergyCost())}`,
            `§r§7Time:   §f${seconds}s`,
        ], 1);

        displayMachine(machine);
        machine.on();
    },

    onPlayerBreak(event) {
        Machine.onDestroy(event);
    },
});

// ── Helpers ───────────────────────────────────────────────────────────────────

function hasOutputSpace(container) {
    // True if any output slot is empty or has room
    for (const slot of OUTPUT_SLOTS) {
        const s = container.getItem(slot);
        if (!s) return true;
        if ((s.maxAmount ?? 64) - s.amount > 0) return true;
    }
    return false;
}

/**
 * Adds items into the 3x3 output grid. Tries to stack into existing stacks first,
 * otherwise places into the first empty slot. Returns number actually inserted.
 */
function addToOutputGrid(container, typeId, amount) {
    if (!typeId || amount <= 0) return 0;

    // First try stacking into existing stacks of the same type
    for (const slot of OUTPUT_SLOTS) {
        const existing = container.getItem(slot);
        if (existing && existing.typeId === typeId) {
            const space = (existing.maxAmount ?? 64) - existing.amount;
            if (space <= 0) continue;
            const toAdd = Math.min(space, amount);
            existing.amount += toAdd;
            container.setItem(slot, existing);
            amount -= toAdd;
            if (amount <= 0) return 1;
        }
    }

    // Then put into the first empty slot(s)
    for (const slot of OUTPUT_SLOTS) {
        if (amount <= 0) break;
        const existing = container.getItem(slot);
        if (!existing) {
            const put = Math.min(64, amount);
            container.setItem(slot, new ItemStack(typeId, put));
            amount -= put;
            // we return once at least 1 item placed; processMachine assumes outputs were added
            return 1;
        }
    }

    // If we couldn't place everything, we still placed some if we passed earlier checks.
    return 0;
}