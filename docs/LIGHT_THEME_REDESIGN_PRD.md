# Light Theme Redesign PRD

## Overview
The current dark navy UI reads as cold and less approachable. This PRD defines a light, warm redesign using creme and neutral tones that feel calm, welcoming, and premium while preserving OpenTo’s brand accents (pink/purple gradients).

## Goals
- Make the site feel more approachable and modern.
- Increase perceived trust and comfort in early-stage conversations.
- Preserve brand personality through accents, not heavy backgrounds.

## Non-Goals
- Full redesign of IA or navigation.
- Rewriting page copy or adding new features.

## Target Users
- Homeowners exploring early interest.
- Buyers browsing quietly.
- Real estate enthusiasts seeking information without pressure.

## Design Direction
**Tone:** calm, warm, minimal, trustworthy.

### Palette (Proposed)
- **Primary background:** `#F9F4EE` (warm creme)
- **Secondary background:** `#F2EADF` (soft sand)
- **Card background:** `#FFFFFF` or `#FFFBF7`
- **Borders:** `#E4D9CC`
- **Primary text:** `#1C1B19`
- **Secondary text:** `#5A554E`
- **Accent (brand):** keep gradient `#ff3ea5 → #7c3aed`

### Usage Guidelines
- Large surfaces should be creme/sand, not gradients.
- Gradient should be reserved for buttons, icons, and small highlights.
- Shadows should be lighter and softer than current.

## UI Changes by Area

### Global
- Swap `--color-bg-primary`, `--color-bg-secondary`, `--color-bg-dark` to light palette equivalents.
- Update text colors to charcoal and warm gray.
- Reduce contrast on borders and shadows to feel softer.

### Hero
- Replace full gradient background with creme.
- Keep gradient only for headline highlights and primary CTAs.
- Increase spacing for readability.

### Cards (Property, Feature, Pillars)
- Light background with subtle border.
- Increase padding and reduce heavy shadows.
- Maintain rounded corners.

### Buttons
- Primary: gradient remains.
- Secondary/Outline: light background with brand colored text.
- Hover states: soft tint or inverse with pink text.

### Navigation + Footer
- Light background, subtle border under nav.
- Ensure logo and active states read clearly on light background.

## Accessibility
- Maintain contrast ratios (AA for body text).
- Clear focus states on light backgrounds.

## Risks
- Brand may feel less bold if gradient is removed too widely.
- Contrast issues on sections with photos or imagery.

## Success Criteria
- User feedback indicates the UI feels more “approachable.”
- No regression in readability or CTA visibility.

---

## Implementation Plan

### Phase 1: Global Tokens (Low Risk)
1. Update global CSS variables in `src/styles/theme.css`.
2. Verify background and text color across base layout.
3. Adjust base shadow variables if used.

**Files likely touched**
- `src/styles/theme.css`
- `src/index.css`

### Phase 2: Key Pages
1. Landing page: convert hero + features + pillars to light sections.
2. Browse/Home: cards on light background, keep maps readable.
3. Property detail: panels on off-white, clearer text hierarchy.
4. Dashboard and Messages: reduce dark surfaces, keep contrast.

**Files likely touched**
- `src/pages/Landing.css`
- `src/pages/Home.css`
- `src/pages/PropertyDetail.css`
- `src/pages/Dashboard.css`
- `src/pages/Messages.css`

### Phase 3: Components
1. Property cards, modals, and buttons.
2. Update shared cards in `src/components/*`.
3. Verify hover and focus states on light backgrounds.

**Files likely touched**
- `src/components/*.css`
- `src/pages/PillarPages.css`

### Phase 4: QA + Polish
1. Contrast check for headings/body/CTA.
2. Hover + focus states on all button types.
3. Visual pass on spacing and shadows.

---

## Rollout Strategy
- Apply Phase 1 and Landing first.
- Get stakeholder feedback on tone.
- Roll remaining pages in 2–3 follow-up commits.

## Open Questions
- Do we want to keep the hero gradient as a top banner strip?
- Should the pink/purple gradient be reserved only for CTAs?
- Preference for creme vs. neutral gray as primary background?
