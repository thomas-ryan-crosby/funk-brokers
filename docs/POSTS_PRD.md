# Posts Feature PRD

## Overview
Introduce a lightweight, highly intuitive post composer for OpenTo. The flow should feel familiar to modern social platforms while staying aligned with OpenTo’s calm, early‑stage tone. Users can create general posts or posts tied to a specific property, optionally including media, tags, and hashtags.

## Goals
- Enable quick, low‑friction post creation.
- Support three post styles: **Post**, **Tweet**, **Poll**.
- Allow attaching a property address or posting generally.
- Provide intuitive media upload (drag + drop or picker).
- Enable hashtags and user tags.

## Non‑Goals (Phase 1)
- Advanced feed algorithms or ranking.
- Reactions, comments, or reposts.
- Direct notifications to tagged users (can be Phase 2).

## Target Users
- Homeowners sharing updates, questions, or project progress.
- Buyers posting general inquiries or seeking advice.
- Users exploring property‑specific guidance from the community.

---

## UX Principles
1. **Create Post** is the primary entry point.
2. **One screen, minimal steps**.
3. **Familiar patterns** from Instagram/Twitter.
4. **Clear distinction** between general vs. property‑linked posts.

---

## Core User Flow
1. User clicks **Create Post**.
2. Composer opens with:
   - Text area
   - Post type selector (wheel)
   - Optional address link
   - Media upload area
   - Tags + hashtags input
3. User posts. Post appears in activity feed.

---

## Composer UI Requirements

### Header
- Title: **Create Post**
- Subtitle (optional): “Share an update or ask a question.”

### Post Type Selector (Wheel)
- A horizontal wheel selector with 3 options:
  - **Post** (default)
  - **Tweet**
  - **Poll**
- Snapping selection with clear active state.
- Keyboard accessible.

### Body Text
- Placeholder varies by type:
  - Post: “Share an update or ask a question…”
  - Tweet: “Share a quick thought…”
  - Poll: “Ask a question and add options…”
- Character limits (Phase 1):
  - Post: 1000
  - Tweet: 280
  - Poll: 200 + options

### Media Upload
- Drag & drop + click upload
- Supports images (JPG/PNG/WEBP)
- Preview thumbnail and remove action
- If Poll selected, media optional but allowed

### Address / Property Link
- Input field: “Add address (optional)”
- If filled, post is property‑linked
- If empty, post is general

### Tags & Hashtags
- Input supports:
  - `#hashtags`
  - `@user` tags
- Tokenized display with remove option
- No auto‑complete in Phase 1 (Phase 2 enhancement)

### Poll (if selected)
- Minimum 2 options, max 6
- “Add option” button
- Optional “Allow multiple selections” toggle (Phase 2)

### Actions
- Primary: **Post**
- Secondary: **Cancel**
- Disabled state until:
  - Body is non‑empty
  - Poll has minimum options

---

## Activity Feed Display
- Show post type icon (Post/Tweet/Poll)
- Show author + timestamp
- Show property address if linked
- Show media if attached
- Display tags/hashtags inline

---

## Data Model (Phase 1)
**Collection:** `posts`

**Fields**
- `id`
- `authorId`
- `authorName`
- `body`
- `type` (`post` | `tweet` | `poll`)
- `propertyId` (nullable)
- `propertyAddress` (nullable)
- `imageUrl` (nullable)
- `hashtags` (array)
- `userTags` (array of userIds or strings)
- `pollOptions` (array)
- `createdAt`
- `updatedAt`

---

## Success Criteria
- Users can create each post type in under 30 seconds.
- 0 errors in upload or posting for valid input.
- Feed reflects the correct post type and property link state.

---

## Implementation Plan
### Phase 1
1. Create `Create Post` modal/section in Dashboard activity.
2. Add wheel selector component.
3. Add drag‑drop upload with preview.
4. Add address field and hashtags/user tags parsing.
5. Store posts in Firestore.
6. Render posts in activity feed.

### Phase 2
- User tag autocomplete
- Poll voting + results
- Comments and reactions

---

## Open Questions
- Should posts be public or only visible to connected users? **Public for now.**
- Should property‑linked posts be visible on the property page feed? **Yes, at the bottom of the property page.**
