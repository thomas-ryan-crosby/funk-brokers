# PRD: Map View Property Card Scroll

## Problem
In map view, the right-hand panel shows property cards for listings in the current map bounds. Cards were resizing to fit within the panel’s bounding box instead of keeping the same size and layout as the list view. The bottom of cards could be truncated, and the layout felt inconsistent with the main property list.

## Goal
- **Same size and layout as list view:** Cards in the map panel must be identical in dimensions, grid, and internal layout to the cards in the main property list section.
- **Vertical scroll only:** The panel is a fixed-height viewport. Users scroll vertically inside the panel to see all cards. Cards do not shrink or grow to fill the viewport; they keep their natural size.
- **No “fit N cards” requirement:** We do not target showing exactly N cards at a time. We show as many full-size cards as fit in the viewport; the rest are revealed by scrolling.

## Requirements

1. **Reuse list view layout**
   - Use the same grid and spacing as the main property list (e.g. `properties-grid`: same columns, gap, and behavior).
   - Do not apply map-specific grid or card sizing that would change card dimensions.

2. **Scroll viewport**
   - The map panel’s list area is a scroll container with a fixed height (e.g. 50% of the split or 65vh).
   - The scroll container has `overflow-y: auto` (and `min-height: 0` if it’s a flex child) so it scrolls instead of growing or clipping unpredictably.
   - Content inside the scroll container is the same grid used in list view; its height is determined only by its content (cards), not by the viewport.

3. **Card consistency**
   - Property cards in map view use the same component and props as in list view (no `compact` or other map-only variants that change size).
   - No CSS that would stretch, shrink, or clip cards to fit the panel (e.g. no `height: 100%` on the grid or card wrapper in a way that ties them to the viewport height).

## Out of scope
- Changing list view card design or grid.
- Horizontal scrolling of cards.
- Changing how “properties in view” are computed from map bounds.

## Success criteria
- Card size and layout in map view match list view.
- Users can scroll vertically in the map panel to see all in-view cards at full size with no truncation.
