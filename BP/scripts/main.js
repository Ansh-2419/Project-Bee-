// ============================================================
// Project Bee — Main Entry Point
// ============================================================
import "DoriosCore/index.js";
import * as DoriosLib from "DoriosLib/index.js";
import "./config/main.js";
import "./machinery/main.js";
import "./items/main.js";
import "./data/main.js";

DoriosLib.registry.install();
DoriosLib.container.initialize();
