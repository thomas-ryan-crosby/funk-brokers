# Property Tier System - Product Requirements Document

## Overview
The Property Tier System gamifies property listing completion by creating a clear progression path that encourages users to add increasingly rich data about their properties. The system rewards incremental improvements with tier upgrades, making the listing process more engaging and motivating.

## Goals
1. **Encourage data-rich listings** - Motivate sellers to provide comprehensive property information
2. **Easy entry point** - Make "Claimed" tier achievable with minimal effort
3. **Clear progression** - Provide visible milestones and achievements with structured 3-screen flows
4. **Document requirements** - Introduce document uploads gradually, starting at Enhanced tier
5. **Gamification** - Create a sense of achievement and progress

## Tier Structure

### Tier 1: Basic - "Claimed"
**Badge:** ⚪ Claimed  
**Color:** Gray  
**Purpose:** Minimal entry point - user has claimed/created the property listing

**Requirements:**
- ✅ Address (street, city, state, zip)
- ✅ Property type selected
- ✅ At least 1 photo uploaded

**User Input:**
- Address selection/entry
- Property type dropdown
- Photo upload (minimum 1)

**Progression to Complete:**
- Complete 3-screen flow:
  - Screen 1: Property Basics (type, beds, baths, sqft, lot, year, tax, HOA, insurance, features)
  - Screen 2: Pricing (estimated worth, make me move price)
  - Screen 3: Photos (at least 1)

---

### Tier 2: Complete
**Badge:** 📋 Complete  
**Color:** Blue  
**Purpose:** Full basic information - complete property details

**Requirements:**
- ✅ Everything in Basic
- ✅ Property Type specified
- ✅ Bedrooms specified
- ✅ Bathrooms specified *
- ✅ Square Feet specified
- ✅ Lot Size (sq ft) specified
- ✅ Year Built specified
- ✅ Property Tax ($/year) specified
- ✅ HOA? * (Yes/No selection)
- ✅ HOA Fee ($/month) * (if HOA = Yes)
- ✅ Insurance? * (Yes/No selection)
- ✅ Approximate Insurance Amount ($/year) * (if Insurance = Yes)
- ✅ Features selected
- ✅ Estimated Property Worth ($) *
- ✅ Make Me Move Price ($) *
- ✅ At least 1 photo uploaded

**User Input Flow (3 Screens):**

**Screen 1: Property Basics**
- Property Type dropdown
- Bedrooms number input
- Bathrooms number input *
- Square Feet number input
- Lot Size (sq ft) number input
- Year Built number input
- Property Tax ($/year) number input
- HOA? * (Yes/No dropdown)
- HOA Fee ($/month) * (conditional - shown if HOA = Yes)
- Insurance? * (Yes/No dropdown)
- Approximate Insurance Amount ($/year) * (conditional - shown if Insurance = Yes)
- Features checkboxes (select multiple)

**Screen 2: Initial Pricing**
- Estimated Property Worth ($) * number input
- Make Me Move Price ($) * number input

**Screen 3: Photos**
- Photo upload (minimum 1 required)

**Progression to Verified:**
- Complete 3-screen flow:
  - Screen 1: Property Description (200+ characters)
  - Screen 2: No additional pricing info required
  - Screen 3: Add more photos (total 5+ required)

---

### Tier 3: Verified ⭐ (Easy Lift - No Documents)
**Badge:** ✓ Verified  
**Color:** Green  
**Purpose:** Rich data without document requirements - easy achievement milestone

**Requirements:**
- ✅ Everything in Complete
- ✅ Property Description (200+ characters)
- ✅ At least 5 photos uploaded

**User Input Flow (3 Screens):**

**Screen 1: Property Information (Detailed)**
- Property Description textarea (200+ characters required)

**Screen 2: Pricing**
- No additional pricing information required at this step
- (User can see existing pricing info but doesn't need to add more)

**Screen 3: Photos**
- Photo upload (minimum 5 total required)
- Display existing photos count
- Add additional photos to reach 5+ total

**Key Feature:** No document uploads required - purely data completion

**Progression to Enhanced:**
- Complete 3-screen flow:
  - Screen 1: Upload documents (Deed, HOA docs if applicable)
  - Screen 2: Verified pricing info (via comparable analysis tool or uploaded appraisal report)
  - Screen 3: Professional photos (15+), Floor plan, Video

---

### Tier 4: Enhanced
**Badge:** 🔒 Enhanced  
**Color:** Teal/Blue-Green  
**Purpose:** Ownership verified with pricing context and professional presentation

**Requirements:**
- ✅ Everything in Verified
- ✅ Deed uploaded (deedUrl)
- ✅ HOA documents uploaded (if applicable) OR confirmed no HOA
- ✅ Verified pricing info (via comparable analysis tool OR uploaded appraisal report)
- ✅ Professional photos checkbox confirmed
- ✅ At least 30 high quality photos
- ✅ Floor plan uploaded (floorPlanUrl) **required**
- ✅ Video uploaded (videoTourUrl or videoFiles) **required**

**User Input Flow (3 Screens):**

**Screen 1: Property Information (Detailed)**
- Upload Deed document (required)
- Upload HOA Documents (if applicable) - conditional based on HOA status

**Screen 2: Verified Pricing**
- Verified pricing information via:
  - Comparable analysis tool (at least 1 verified comparable) OR
  - Uploaded appraisal report (valuationDocUrl or compReportUrl)

**Screen 3: Professional Assets**
- Professional photos checkbox (certifies photos were shot by a professional)
- Upload at least 30 high quality photos
- Upload Floor plan (floorPlanUrl) **required**
- Upload Video (videoTourUrl or videoFiles) **required**

**Document Requirements Begin:** This is where document uploads start

**Progression to Premium:**
- Complete 3-screen flow:
  - Screen 1: Upload disclosure forms
  - Screen 2: No additional information needed
  - Screen 3: Add Matterport link (if not already added)

---

### Tier 5: Premium
**Badge:** ⭐ Premium  
**Color:** Gold/Blue gradient  
**Purpose:** Professional presentation with advanced assets and disclosures

**Requirements:**
- ✅ Everything in Enhanced
- ✅ Disclosure forms uploaded (disclosureFormsUrl)
- ✅ Professional photos checkbox confirmed
- ✅ At least 30 high quality photos
- ✅ Floor plan uploaded (floorPlanUrl) **required**
- ✅ Video uploaded (videoTourUrl or videoFiles) **required**
- ✅ Matterport link (matterportTourUrl) **URL**

**User Input Flow (3 Screens):**

**Screen 1: Property Information (Detailed)**
- Upload Disclosure forms (disclosureFormsUrl) *

**Screen 2: Additional Information**
- No additional information needed at this step
- (User can see existing info but doesn't need to add more)

**Screen 3: Professional Assets**
- Confirm professional photos checkbox
- Confirm at least 30 high quality photos
- Confirm Floor plan uploaded
- Confirm Video uploaded
- Add Matterport link (matterportTourUrl) **URL**

**Progression to Elite:**
- Complete 3-screen flow:
  - Screen 1: Upload mortgage/payoff docs (if applicable), inspection report, insurance claims report
  - Screen 2: Confirm 3rd party review of property value
  - Screen 3: Confirm all professional assets (photos, floor plan, video, Matterport)

---

### Tier 6: Elite
**Badge:** 👑 Elite  
**Color:** Purple/Gold gradient  
**Purpose:** Maximum data richness - ultimate listing quality with comprehensive documentation

**Requirements:**
- ✅ Everything in Premium
- ✅ Mortgage/payoff documents uploaded (if applicable) OR confirmed no mortgage
- ✅ Proactive inspection report uploaded (inspectionReportUrl)
- ✅ Insurance claims in last 5 years:
  - Yes/No selector
  - If Yes: description required + document upload (insuranceClaimsReportUrl)
- ✅ Confirmed 3rd party review of property value:
  - Checkbox certifying a certified vendor reviewed
  - Vendor must be linked
  - OR document upload (appraisal report)
- ✅ Professional photos checkbox confirmed
- ✅ At least 30 high quality photos
- ✅ Floor plan uploaded (floorPlanUrl) **required**
- ✅ Video uploaded (videoTourUrl or videoFiles) **required**
- ✅ Matterport link (matterportTourUrl) **URL**

**User Input Flow (3 Screens):**

**Screen 1: Property Information (Detailed)**
- Upload Mortgage/payoff documents (if applicable) - conditional based on mortgage status
- Upload Proactive inspection report (inspectionReportUrl) *
- Insurance claims in last 5 years:
  - Yes/No selector
  - If Yes: description required + upload document (insuranceClaimsReportUrl)

**Screen 2: Verified Pricing**
- Confirmed 3rd party review of property value:
  - Checkbox certifying a certified vendor reviewed (vendor linked) OR
  - Professional appraisal document uploaded

**Screen 3: Professional Assets**
- Confirm professional photos checkbox
- Confirm at least 30 high quality photos
- Confirm Floor plan uploaded
- Confirm Video uploaded
- Confirm Matterport link added

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
  return 'basic'; // "Claimed"
}
```

### Progress Calculation
For each tier, calculate progress toward the next tier:
- Identify missing requirements
- Calculate percentage complete
- Show specific missing items
- Guide user through 3-screen flow

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
   - Visual timeline showing: Claimed → Complete → Verified → Enhanced → Premium → Elite
   - Highlight current tier
   - Show completed tiers (green)
   - Show upcoming tiers (gray)

4. **3-Screen Flow Navigation**
   - Step indicator showing current screen (1/3, 2/3, 3/3)
   - Next/Back buttons for multi-screen flows
   - Progress saved between screens

5. **Tier Benefits Display** (optional)
   - Show what each tier unlocks
   - Highlight benefits of upgrading

## User Experience Flow

1. **User claims property** → Starts at "Claimed" (Basic) tier
2. **User completes 3-screen flow** → Progresses to Complete
   - Screen 1: Property Basics
   - Screen 2: Initial Pricing
   - Screen 3: Photos (1+)
3. **User completes 3-screen flow** → Progresses to Verified
   - Screen 1: Property Description
   - Screen 2: (No action needed)
   - Screen 3: More Photos (5+)
4. **User completes 3-screen flow** → Progresses to Enhanced
   - Screen 1: Documents (Deed, HOA)
   - Screen 2: Verified Pricing
   - Screen 3: Professional Assets (15+ photos, floor plan, video)
5. **User completes 3-screen flow** → Progresses to Premium
   - Screen 1: Disclosure Forms
   - Screen 2: (No action needed)
   - Screen 3: Matterport Link
6. **User completes 3-screen flow** → Achieves Elite
   - Screen 1: Additional Documents (mortgage, inspection, insurance claims)
   - Screen 2: 3rd Party Value Review
   - Screen 3: Confirm All Assets

## Edge Cases

1. **Property already verified** (`verified === true`)
   - Automatically qualifies for at least Verified tier
   - Can still progress to Enhanced/Premium/Elite based on content

2. **Missing optional fields**
   - HOA: If property has no HOA, "No HOA" selection satisfies requirement
   - Insurance: If property has no insurance, "No Insurance" selection satisfies requirement
   - Mortgage: If no mortgage, skip mortgage document requirement

3. **Partial document uploads**
   - Track which documents are uploaded
   - Show specific missing documents in progress
   - Allow saving progress between screens

4. **Tier downgrade**
   - If user removes content (e.g., deletes photos), tier may downgrade
   - Show warning when actions would cause tier downgrade

5. **Screen navigation**
   - Save progress when moving between screens
   - Allow users to go back and edit previous screens
   - Validate required fields before allowing progression

## Success Metrics

- **Tier distribution**: Track % of properties at each tier
- **Progression rate**: Average time to reach Verified tier
- **Completion rate**: % of properties that reach Enhanced+
- **User engagement**: Increase in data-rich listings
- **Screen completion rate**: Track completion rate for each screen in 3-screen flows

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
   - Highlight which screen needs attention

4. **Analytics dashboard**
   - Show tier distribution across platform
   - Track tier progression over time
   - Screen-by-screen completion analytics

5. **Conditional field display**
   - Show/hide fields based on previous selections (e.g., HOA fee only if HOA = Yes)
   - Smart defaults based on property type

---

## Implementation Checklist

- [ ] Update `verificationScores.js` with new tier logic
- [ ] Create tier requirement check functions for each tier
- [ ] Update `getListingTier()` function
- [ ] Update `getListingTierProgress()` function
- [ ] Update `getListingTierLabel()` function (change "Basic" to "Claimed")
- [ ] Add new tier badges (Complete, Enhanced, Elite)
- [ ] Update PropertyDetail.jsx tier display
- [ ] Update PropertyCard.jsx tier badges
- [ ] Update timeline to show all 6 tiers
- [ ] Add tier-specific CSS styling
- [ ] Implement 3-screen flow navigation component
- [ ] Add screen progress indicators
- [ ] Update EditProperty.jsx for Complete tier 3-screen flow
- [ ] Update GetVerified.jsx for Verified/Enhanced/Premium/Elite tier flows
- [ ] Add conditional field display logic (HOA fee, Insurance amount)
- [ ] Add insurance claims question (5 years) with Yes/No
- [ ] If Yes: require description + document upload (insuranceClaimsReportUrl)
- [ ] Add Matterport link URL field
- [ ] Update photo requirements (1 for Complete, 5 for Verified, 15+ for Enhanced+)
- [ ] Add floor plan upload field (required for Enhanced+)
- [ ] Add video upload field (required for Enhanced+)
- [ ] Add professional photos checkbox (Enhanced+)
- [ ] Add 3rd party value review checkbox with vendor link
- [ ] Test tier progression logic
- [ ] Test tier downgrade scenarios
- [ ] Test 3-screen flow navigation
- [ ] Test conditional field display
- [ ] Update documentation

---

## Notes

### Required vs Optional Fields
- Fields marked with * are required for that tier
- Conditional fields (like HOA Fee) are required only if parent field is selected (e.g., HOA Fee required if HOA = Yes)

### Photo Requirements
- Basic (Claimed): 1+ photo
- Complete: 1+ photo
- Verified: 5+ photos
- Enhanced: 15+ high quality professional photos
- Premium: 15+ high quality professional photos
- Elite: 15+ high quality professional photos

### Document Requirements
- Documents start at Enhanced tier
- HOA documents are conditional (only if HOA = Yes)
- Mortgage documents are conditional (only if mortgage exists)
- Insurance claims report is conditional (only if claims in last 5 years = Yes)

### Pricing Requirements
- Complete: Estimated Worth + Make Me Move Price
- Verified: No additional pricing required (uses Complete tier pricing)
- Enhanced: Verified pricing via comparables OR appraisal report
- Premium: No additional pricing required
- Elite: Confirmed 3rd party review of value (vendor-linked checkbox OR appraisal upload)

---

**Document Version:** 2.0  
**Last Updated:** 2026-01-28  
**Status:** Ready for Implementation
