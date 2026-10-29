This update improves machine interaction with UtilityCraft's shared selection system. Requires UtilityCraft 3.6.1 or newer.

## UI/UX

- **Advanced Beehive**
    - Fixed the progress indicator in both normal and expanded interfaces, centered between the input slots and output grid at its native texture size without hover interaction.
    - Fixed missing upgrade and information tab settings in both interfaces.
- **Breeding Chamber**
    - Fixed the heart progress indicator at its native texture size without hover interaction.
    - Fixed the missing information tab setting.
- Advanced Beehive, Bee Incubator, Breeding Chamber, Powered Centrifuge, and Feeding Slab now hide block selection while targeting their inventories and restore it while sneaking to mine.
- Feeding Slab can be upgraded to a double slab through either block or inventory-entity interaction, preserving the existing contents.

## BUG FIXES

- Machine and feeder inventory lookups now exclude outlines, bees, and entities owned by neighboring blocks.
