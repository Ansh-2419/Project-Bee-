// bee_cage.js already imports bee_conversion.js for internal use.
// Importing it here a second time as a side-effect module is redundant
// and loads it through two entry paths. Only bee_cage.js is needed.
//
// BUG FIX: Removed the duplicate "import ./bee_conversion.js" line.
import "./bee_cage.js";
import "./simulator_upgrade.js";
