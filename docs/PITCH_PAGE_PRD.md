## Pitch Page PRD

### Goal
Create a clean, investor-ready document-style page at `/pitch` that reads like a memo or deck narrative, matching the existing app theme. It should feel premium, credible, and easy to scan without “widget-y” cards or dark-on-dark UI.

### Audience
Investors, advisors, and strategic partners evaluating the business.

### Success Criteria
- Page reads like a polished investment memo.
- High contrast, light background, and consistent typography with the app.
- Pink accent used sparingly for emphasis.
- No heavy card UI; minimal dividers and structured text.
- Content is scannable with strong hierarchy.

### Content Structure
1. **Header**
   - Brand label: OpenTo
   - H1: A Radically Different Real Estate Platform
   - Subtitle: What We’re Building
   - Lead paragraph
   - Two short callouts: “In short” and “Core principles”
2. **The Problem**
   - Intro sentence
   - Bullet list of constraints
3. **The Result**
   - Two concise statements
4. **The Insight**
   - Short lead + bullet list + closing paragraph
5. **The Solution**
   - Intro sentence
   - Bullet list of solution points
6. **How It Works**
   - Four-step ordered list
   - Footer line on optional representation
7. **What Makes OpenTo Different**
   - Three-line comparison
   - Closing sentence
8. **Why Now**
   - Bullet list
9. **Market Opportunity**
   - 3 stats in a simple row
   - Supporting paragraph
10. **Business Model**
    - Phases 1–3 with bullets
11. **Traction Metrics**
    - Single-line chips
12. **Our Vision**
    - Three short statements
    - Closing paragraph
13. **Team**
    - Two bios in a simple two-column layout
14. **Our Ask**
    - Short ask + note

### Visual Design
- **Layout:** centered sheet with max width, generous whitespace.
- **Typography:** strong hierarchy (H1, H2, lead, body), readable line length.
- **Colors:** light background, dark text, subtle dividers; pink accent used in callouts or section markers only.
- **Components:** lists, dividers, callout blocks, stat row, chips.

### Interaction
No interactive elements; page is static and scrollable.

### Accessibility
- Maintain contrast ratio (dark text on light background).
- Use semantic HTML headings and lists.
- Avoid all-caps for body text.

### Implementation Notes
- Update `src/pages/Pitch.jsx` structure to document style.
- Replace `src/pages/Pitch.css` with minimal, editorial styling.
- Keep existing content copy intact.
