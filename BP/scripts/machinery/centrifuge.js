import { ItemStack } from "@minecraft/server";
import { Machine, registerIOInterface } from "DoriosCore/index.js";
import * as DoriosLib from "DoriosLib/index.js";
import { centrifugeRecipes } from "../config/recipes/energy/centrifuge.js";

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
            { id: "input_1",  inputSlots:  [INPUT_SLOT] },
            { id: "output_1", outputSlots: OUTPUT_SLOTS },
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

        if (!hasOutputRoom(inv)) {
            machine.showWarning("Output Full");
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

        // ── Cycle complete ────────────────────────────────────
        if (progress >= energyCost) {
            consumeInput(inv, INPUT_SLOT);
            rollOutputs(inv, recipe);
            machine.setProgress(0, { display: true });
            machine.on();
            machine.displayEnergy();
            machine.showStatus("Running");
            return; // start fresh next tick — prevents immediate re-fire
        }

        // ── Advance progress ──────────────────────────────────
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

function hasOutputRoom(inv) {
    return OUTPUT_SLOTS.some(i => {
        const item = inv.getItem(i);
        return !item || (item.maxAmount ?? 64) - item.amount > 0;
    });
}

function rollOutputs(inv, recipe) {
    for (const out of recipe.output.items) {
        if (Math.random() * 100 < out.chance) {
            insertOutput(inv, out.itemId, out.count);
        }
    }
}

function insertOutput(inv, typeId, count) {
    for (const i of OUTPUT_SLOTS) {
        const item = inv.getItem(i);
        if (!item) {
            inv.setItem(i, new ItemStack(typeId, count));
            return;
        }
        if (item.typeId === typeId) {
            const space = (item.maxAmount ?? 64) - item.amount;
            if (space >= count) {
                item.amount += count;
                inv.setItem(i, item);
                return;
            }
        }
    }
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