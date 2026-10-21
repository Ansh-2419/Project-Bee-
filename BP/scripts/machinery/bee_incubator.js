// ============================================================
// Project Bee — Bee Incubator
//
// SLOT MAP (inventory_size = 12)
//   0  – text label       (uc reserved / Machine)
//   1  – energy bar       (Machine.displayEnergy)
//   2  – progress bar     (Machine.displayProgress)
//   3  – bee cage input   ← baby-filled cage
//   4  – output slot      ← adult-filled cage result
//   5  – honey treat slot ← consumed per cycle
//   6-11 – IO config (DoriosLib)
// ============================================================

import { ItemStack } from "@minecraft/server";
import { Machine, registerIOInterface } from "DoriosCore/index.js";
import * as DoriosLib from "DoriosLib/index.js";
import { beeCageType, BEE_DATA_PROP, BEE_BABY_PROP, applyBeeCageLore } from "../data/data.js";
import { incubateCost } from "../config/recipes/energy/bee_incubator.js";

const BLOCK_ID = "projectbee:bee_incubator";
const UI_TITLE = "projectbee.bee_incubator.ui";

const PROGRESS_SLOT    = 2;
const INPUT_SLOT       = 3;
const OUTPUT_SLOT      = 4;
const HONEY_TREAT_SLOT = 5;

const DEFAULT_ENERGY_COST = 8_000;

// ── IO interface ──────────────────────────────────────────────

registerIOInterface(BLOCK_ID, {
    items: {
        buttonSlots: [6, 11],
        anyInputSlots:  [INPUT_SLOT, HONEY_TREAT_SLOT],
        anyOutputSlots: [OUTPUT_SLOT],
        modes: [
            { id: "disabled" },
            { id: "input_1",  inputSlots:  [INPUT_SLOT, HONEY_TREAT_SLOT] },
            { id: "output_1", outputSlots: [OUTPUT_SLOT] },
        ],
    },
});

// ── Block component ───────────────────────────────────────────

DoriosLib.registry.blockComponent(BLOCK_ID, {

    beforeOnPlayerPlace(event, { params: settings }) {
        if (!event.player) return;
        Machine.spawnEntity(event, settings, () => {
            const machine = new Machine(event.block, { ...settings, ignoreTick: true });
            if (!machine.valid) return;
            machine.entity.nameTag = UI_TITLE;
            machine.setEnergyCost(settings.machine?.energy_cost ?? DEFAULT_ENERGY_COST);
            machine.blockSlots([PROGRESS_SLOT]);
            machine.displayEnergy();
            machine.displayProgress();
        });
    },

    onTick({ block }, { params: settings }) {
        if (!globalThis.worldLoaded) return;

        const machine = new Machine(block, settings);
        if (!machine.valid) return;

        // Re-apply every tick — spawnEntity resets nameTag after a world reload
        if (machine.entity.nameTag !== UI_TITLE) machine.entity.nameTag = UI_TITLE;

        machine.processIO();

        const inv        = machine.container;
        const inputItem  = inv.getItem(INPUT_SLOT);
        const outputItem = inv.getItem(OUTPUT_SLOT);
        const treatItem  = inv.getItem(HONEY_TREAT_SLOT);

        // ── Validate input ────────────────────────────────────

        if (!inputItem || !beeCageType.filledCageIds.includes(inputItem.typeId)) {
            machine.showWarning("No Input");
            return;
        }

        const beeId = inputItem.getDynamicProperty(BEE_DATA_PROP);
        if (typeof beeId !== "string") {
            machine.showWarning("Invalid Cage");
            return;
        }

        if (!(inputItem.getDynamicProperty(BEE_BABY_PROP) ?? false)) {
            machine.showWarning("Not a Baby");
            return;
        }

        if (outputItem) {
            machine.showWarning("Output Full");
            return;
        }

        const cost   = incubateCost[beeId] ?? 3;
        const treats = treatItem?.typeId === "utilitycraft:honey_treat" ? treatItem.amount : 0;
        if (treats < cost) {
            machine.showWarning("Need Honey Treat");
            return;
        }

        // ── Energy ────────────────────────────────────────────

        const energyCost = settings.machine?.energy_cost ?? DEFAULT_ENERGY_COST;
        machine.setEnergyCost(energyCost);

        if (machine.energy.get() <= 0) {
            machine.showWarning("No Energy", { resetProgress: false });
            return;
        }

        // ── Advance progress ──────────────────────────────────

        const consumption     = machine.boosts.consumption;
        let   progress        = machine.getProgress();
        const progressCap     = Math.max(0, energyCost - progress);
        const energyToConsume = Math.min(machine.energy.get(), machine.rate, progressCap * consumption);

        if (energyToConsume > 0) {
            machine.energy.consume(energyToConsume);
            progress += energyToConsume / consumption;
            machine.setProgress(progress, { display: false });
        }

        // ── Cycle complete ────────────────────────────────────

        if (progress >= energyCost) {
            const treatSlot = inv.getSlot(HONEY_TREAT_SLOT);
            if (treatItem.amount > cost) { treatItem.amount -= cost; treatSlot.setItem(treatItem); }
            else treatSlot.setItem(undefined);

            inv.getSlot(INPUT_SLOT).setItem(undefined);

            const adultCage = new ItemStack(inputItem.typeId, 1);
            adultCage.setDynamicProperty(BEE_DATA_PROP, beeId);
            adultCage.setDynamicProperty(BEE_BABY_PROP, false);
            applyBeeCageLore(adultCage, beeId, false);
            inv.getSlot(OUTPUT_SLOT).setItem(adultCage);

            machine.setProgress(0, { display: true });
            machine.on();
            machine.displayEnergy();
            machine.showStatus("Done");
            return;
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