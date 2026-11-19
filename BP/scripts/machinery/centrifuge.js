import { ItemStack } from "@minecraft/server";
import { Machine, registerIOInterface } from "DoriosCore/index.js";
import * as DoriosLib from "DoriosLib/index.js";
import { centrifugeRecipes } from "../config/recipes/energy/centrifuge.js";
import { canFitAllOutputs, insertOutputs } from "../core/recipes.js";

const PROGRESS_SLOT = 2;
const INPUT_SLOT    = 3;
const OUTPUT_SLOTS  = [4, 5, 6, 7, 8, 9, 10, 11, 12];

const MACHINE_ID     = "projectbee:powered_centrifuge";
const DEFAULT_ENERGY = 2000;

registerIOInterface(MACHINE_ID, {
    items: {
        buttonSlots: [13, 18],
        anyInputSlots:  [INPUT_SLOT],
        anyOutputSlots: OUTPUT_SLOTS,
        modes: [
            { id: "disabled" },
            { id: "input_1",  inputSlots:  [INPUT_SLOT]   },
            { id: "output_1", outputSlots: OUTPUT_SLOTS   },
        ],
    },
});

DoriosLib.registry.blockComponent(MACHINE_ID, {
    beforeOnPlayerPlace(event, { params: settings }) {
        if (!event.player) return;
        Machine.spawnEntity(event, settings, () => {
            const machine = new Machine(event.block, { ...settings, ignoreTick: true });
            if (!machine.valid) return;
            machine.setEnergyCost(settings.machine?.energy_cost ?? DEFAULT_ENERGY);
            machine.blockSlots([PROGRESS_SLOT]);
            machine.displayEnergy();
            machine.displayProgress();
        });
    },

    onTick({ block }, { params: settings }) {
        if (!globalThis.worldLoaded) return;

        const machine = new Machine(block, settings);
        if (!machine.valid) return;

        machine.processIO();

        const inv       = machine.container;
        const inputItem = inv.getItem(INPUT_SLOT);

        if (!inputItem) {
            machine.showWarning("No Input");
            return;
        }

        const recipe = centrifugeRecipes.find(r => r.input.itemId === inputItem.typeId);
        if (!recipe) {
            machine.showWarning("Invalid Input");
            return;
        }

        // BUG FIX: Pre-roll the full output list, then preflight ALL of them
        // before consuming input. Old code checked only "any slot has space",
        // so the second output could silently vanish when there was room for
        // only one item.
        const rolledOutputs = rollOutputs(recipe);

        if (!canFitAllOutputs(inv, OUTPUT_SLOTS, rolledOutputs)) {
            // BUG FIX: Preserve progress while output is full (don't reset).
            machine.showWarning("Output Full", { resetProgress: false });
            return;
        }

        const energyCost = settings.machine?.energy_cost ?? DEFAULT_ENERGY;
        machine.setEnergyCost(energyCost);

        if (machine.energy.get() <= 0) {
            machine.showWarning("No Energy", { resetProgress: false });
            return;
        }

        const consumption = machine.boosts.consumption;
        let   progress    = machine.getProgress();

        // ── Cycle complete ─────────────────────────────────────
        if (progress >= energyCost) {
            consumeInput(inv, INPUT_SLOT);
            insertOutputs(inv, OUTPUT_SLOTS, rolledOutputs);
            machine.setProgress(0, { display: true });
            machine.on();
            machine.displayEnergy();
            machine.showStatus("Running");
            return;
        }

        // ── Advance progress ───────────────────────────────────
        const progressCapacity = Math.max(0, energyCost - progress);
        const energyToConsume  = Math.min(machine.energy.get(), machine.rate, progressCapacity * consumption);

        if (energyToConsume > 0) {
            machine.energy.consume(energyToConsume);
            progress += energyToConsume / consumption;
            machine.setProgress(progress, { display: false });
        }

        machine.on();
        machine.displayEnergy();
        machine.displayProgress();
        machine.showStatus("Running");
    },

    onPlayerBreak(event) {
        Machine.onDestroy(event);
    },
});

// ── Helpers ────────────────────────────────────────────────────

/**
 * Rolls the probabilistic outputs for a recipe and returns only
 * the items that passed their chance check.
 * @returns {Array<{ typeId: string, count: number }>}
 */
function rollOutputs(recipe) {
    const result = [];
    for (const out of recipe.output.items) {
        if (Math.random() * 100 < out.chance) {
            result.push({ typeId: out.itemId, count: out.count });
        }
    }
    return result;
}

function consumeInput(inv, slot) {
    const item = inv.getItem(slot);
    if (!item) return;
    if (item.amount > 1) {
        item.amount--;
        inv.setItem(slot, item);
    } else {
        inv.setItem(slot, undefined);
    }
}
