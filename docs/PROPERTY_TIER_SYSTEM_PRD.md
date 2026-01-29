# Property Tier System - Product Requirements Document

## Overview
The Property Tier System gamifies property listing completion by creating a clear progression path that encourages users to add increasingly rich data about their properties. The system rewards incremental improvements with tier upgrades, making the listing process more engaging and motivating.

## Goals
1. **Encourage data-rich listings** - Motivate sellers to provide comprehensive property information
2. **Easy entry point** - Make "Verified" tier achievable without document uploads
3. **Clear progression** - Provide visible milestones and achievements
4. **Document requirements** - Introduce document uploads gradually, starting at Enhanced tier
5. **Gamification** - Create a sense of achievement and progress

## Tier Structure

### Tier 1: Basic
**Badge:** ⚪ Basic  
**Color:** Gray  
**Purpose:** Minimal viable listing - just enough to get started

**Requirements:**
- ✅ Address (street, city, state, zip)
- ✅ Property type selected
- ✅ Price set
- ✅ At least 1 photo uploaded
- ✅ Basic description (50+ characters)

**User Input:**
- Address selection/entry
- Property type dropdown
- Price input
- Photo upload (minimum 1)
- Description textarea

**Progression to Complete:**
- Add bedrooms/bathrooms
- Add square feet or lot size
- Add 2 more photos (total 3+)
- Expand description to 100+ characters
- Select at least 2 features

---

### Tier 2: Complete
**Badge:** 📋 Complete  
**Color:** Blue  
**Purpose:** Full basic information - complete property details

**Requirements:**
- ✅ Everything in Basic
- ✅ Bedrooms specified
- ✅ Bathrooms specified
- ✅ Square feet OR lot size
- ✅ 3+ photos
- ✅ Description (100+ characters)
- ✅ At least 2 features selected

**User Input:**
- Bedrooms number input
- Bathrooms number input
- Square feet OR lot size input
- Additional photo uploads (total 3+)
- Expanded description
- Feature checkboxes (select 2+)

**Progression to Verified:**
- Add year built
- Add both square feet AND lot size
- Add 2 more photos (total 5+)
- Expand description to 200+ characters
- Select 5+ features
- Add HOA fee (if applicable) or confirm no HOA

---

### Tier 3: Verified ⭐ (Easy Lift - No Documents)
**Badge:** ✓ Verified  
**Color:** Green  
**Purpose:** Rich data without document requirements - easy achievement milestone

**Requirements:**
- ✅ Everything in Complete
- ✅ 5+ photos uploaded
- ✅ Year built specified
- ✅ Square feet AND lot size (both)
- ✅ Description (200+ characters)
- ✅ 5+ features selected
- ✅ HOA fee specified (if applicable) OR confirmed no HOA

**User Input:**
- Year built input
- Additional photo uploads (total 5+)
- Lot size input (if not already provided)
- Expanded description (200+ chars)
- Additional feature selections (total 5+)
- HOA fee input OR "No HOA" confirmation

**Key Feature:** No document uploads required - purely data completion

**Progression to Enhanced:**
- Upload deed (ownership confirmation)
- Upload property tax record
- Upload HOA documents (if applicable)
- Add estimated worth OR make me move price
- Add at least 1 verified comparable

---

### Tier 4: Enhanced
**Badge:** 🔒 Enhanced  
**Color:** Teal/Blue-Green  
**Purpose:** Ownership verified with pricing context

**Requirements:**
- ✅ Everything in Verified
- ✅ Deed uploaded (deedUrl)
- ✅ Property tax record uploaded (propertyTaxRecordUrl)
- ✅ HOA documents uploaded (if applicable) OR confirmed no HOA
- ✅ Estimated worth OR make me move price specified
- ✅ At least 1 verified comparable added

**User Input:**
- Deed document upload
- Property tax record document upload
- HOA documents upload (if HOA exists)
- Estimated worth input OR make me move price input
- Verified comparables selection (map-based, at least 1)

**Document Requirements Begin:** This is where document uploads start

**Progression to Premium:**
- Mark professional photos OR upload 10+ photos
- Upload at least ONE advanced asset:
  - Inspection report
  - Floor plan
  - Matterport tour
  - Valuation/CMA document
- Upload disclosure forms
- Expand description to 300+ characters

---

### Tier 5: Premium
**Badge:** ⭐ Premium  
**Color:** Gold/Blue gradient  
**Purpose:** Professional presentation with advanced assets

**Requirements:**
- ✅ Everything in Enhanced
- ✅ Professional photos confirmed (professionalPhotos flag) OR 10+ photos
- ✅ At least ONE advanced asset:
  - Inspection report (inspectionReportUrl)
  - Floor plan (floorPlanUrl)
  - Matterport tour (matterportTourUrl)
  - Valuation/CMA document (valuationDocUrl)
- ✅ Disclosure forms uploaded (disclosureFormsUrl)
- ✅ Description (300+ characters)

**User Input:**
- Professional photos checkbox OR additional photo uploads (total 10+)
- Advanced asset upload (choose at least 1)
- Disclosure forms upload
- Expanded description (300+ chars)

**Progression to Elite:**
- Upload at least 3 advanced assets total
- Confirm professional photos
- Add video tour OR drone footage
- Complete all disclosure forms
- Add 3+ verified comparables with closing values
- Upload mortgage/payoff docs (if applicable)

---

### Tier 6: Elite
**Badge:** 👑 Elite  
**Color:** Purple/Gold gradient  
**Purpose:** Maximum data richness - ultimate listing quality

**Requirements:**
- ✅ Everything in Premium
- ✅ At least 3 advanced assets uploaded:
  - Inspection report
  - Floor plan
  - Matterport tour
  - Valuation/CMA document
  - Comp report (compReportUrl)
- ✅ Professional photos confirmed (professionalPhotos = true)
- ✅ Video tour OR drone footage uploaded
- ✅ All disclosure forms complete
- ✅ Verified comparables (3+ comps with closing values)
- ✅ Mortgage/payoff documents (if applicable)

**User Input:**
- Additional advanced asset uploads (total 3+)
- Professional photos confirmation
- Video/drone upload
- Additional disclosure forms
- Additional verified comparables (total 3+)
- Mortgage/payoff document uploads (if applicable)

**Maximum Tier:** This is the highest achievable tier

---

## Technical Implementation

### Tier Calculation Logic
```javascript
getPropertyTier(property) {
  // Check from highest to lowest tier
  if (meetsEliteRequirements(property)) return 'elite';
  if (meetsPremiumRequirements(property)) return 'premium';
  if (meetsEnhancedRequirements(property)) return 'enhanced';
  if (meetsVerifiedRequirements(property)) return 'verified';
  if (meetsCompleteRequirements(property)) return 'complete';
  return 'basic';
}
```

### Progress Calculation
For each tier, calculate progress toward the next tier:
- Identify missing requirements
- Calculate percentage complete
- Show specific missing items

### UI Components

1. **Tier Badge Display**
   - Show current tier with gamified badge
   - Include icon and color coding
   - Animate tier upgrades

2. **Progress Indicator**
   - Progress bar showing % to next tier
   - List of missing requirements
   - "Advance to next tier" button/link

3. **Timeline Visualization**
   - Visual timeline showing: Basic → Complete → Verified → Enhanced → Premium → Elite
   - Highlight current tier
   - Show completed tiers (green)
   - Show upcoming tiers (gray)

4. **Tier Benefits Display** (optional)
   - Show what each tier unlocks
   - Highlight benefits of upgrading

## User Experience Flow

1. **User adds property** → Starts at Basic tier
2. **User fills out basic info** → Progresses to Complete
3. **User adds more details** → Progresses to Verified (easy milestone!)
4. **User uploads documents** → Progresses to Enhanced
5. **User adds advanced assets** → Progresses to Premium
6. **User maximizes content** → Achieves Elite

## Edge Cases

1. **Property already verified** (`verified === true`)
   - Automatically qualifies for at least Verified tier
   - Can still progress to Enhanced/Premium/Elite based on content

2. **Missing optional fields**
   - HOA: If property has no HOA, "confirm no HOA" satisfies requirement
   - Mortgage: If no mortgage, skip mortgage document requirement

3. **Partial document uploads**
   - Track which documents are uploaded
   - Show specific missing documents in progress

4. **Tier downgrade**
   - If user removes content (e.g., deletes photos), tier may downgrade
   - Show warning when actions would cause tier downgrade

## Success Metrics

- **Tier distribution**: Track % of properties at each tier
- **Progression rate**: Average time to reach Verified tier
- **Completion rate**: % of properties that reach Enhanced+
- **User engagement**: Increase in data-rich listings

## Future Enhancements

1. **Tier-specific benefits**
   - Premium/Elite listings get priority placement
   - Enhanced+ listings get "Verified" badge in search
   - Tier-based search filters

2. **Achievement badges**
   - Unlock achievements for tier milestones
   - Share achievements

3. **Tier recommendations**
   - Suggest specific actions to reach next tier
   - Show impact of each action on tier progress

4. **Analytics dashboard**
   - Show tier distribution across platform
   - Track tier progression over time

---

## Implementation Checklist

- [ ] Update `verificationScores.js` with new tier logic
- [ ] Create tier requirement check functions
- [ ] Update `getListingTier()` function
- [ ] Update `getListingTierProgress()` function
- [ ] Update `getListingTierLabel()` function
- [ ] Add new tier badges (Complete, Enhanced, Elite)
- [ ] Update PropertyDetail.jsx tier display
- [ ] Update PropertyCard.jsx tier badges
- [ ] Update timeline to show all 6 tiers
- [ ] Add tier-specific CSS styling
- [ ] Test tier progression logic
- [ ] Test tier downgrade scenarios
- [ ] Update documentation

---

**Document Version:** 1.0  
**Last Updated:** 2026-01-28  
**Status:** Ready for Implementation
