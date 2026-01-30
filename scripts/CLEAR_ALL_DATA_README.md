# Clear All Application Data - Script Documentation

## ⚠️ WARNING: DESTRUCTIVE OPERATION

This script will **permanently delete** all data from your Firebase Firestore database and optionally Firebase Storage. This action **CANNOT BE UNDONE**.

## What This Script Does

### Firestore Collections That Will Be Cleared:

1. **`properties`** - All property listings
   - Includes all property data, photos metadata, documents metadata
   - Does NOT delete actual files from Storage (see Storage section below)

2. **`saleProfiles`** - All seller profiles
   - User selling information and preferences

3. **`purchaseProfiles`** - All buyer profiles (buying power info)
   - Buyer verification documents metadata
   - Pre-approval information
   - Proof of funds information
   - Government ID metadata
   - Does NOT delete actual files from Storage

4. **`savedSearches`** - All saved property searches
   - User search criteria and filters

5. **`vendors`** - All vendor/contact information
   - Title companies
   - Inspection companies
   - Mortgage services
   - Other vendors

6. **`messages`** - All internal messages
   - All conversations between users
   - Property-related messages

7. **`offers`** - All property offers
   - Offer details, amounts, terms
   - Counter-offers

8. **`transactions`** - All transaction records
   - Post-acceptance deal steps
   - Transaction status and progress

9. **`favorites`** - All user favorites
   - Saved favorite properties

10. **`preListingChecklists`** - All pre-listing checklists
    - 7-step checklist data for each property

### Collections That Are NOT Deleted

- **`users`** - User profiles are preserved
  - User account information remains intact
  - Display names, phone numbers, roles are kept
  - Firebase Authentication accounts are also preserved

### Firebase Storage (Optional)

If you choose to delete Storage files, the script will delete:
- All files in the `properties/` folder (property photos, documents)
- All files in the `users/` folder (verification documents, profile photos)
- All other uploaded files

**Default:** Storage files are NOT deleted (only Firestore documents)

### What Is NOT Deleted

- **`users` collection** - User profiles are preserved (user account information, display names, phone numbers, roles)
- **Firebase Authentication accounts** - User login accounts remain intact
- **Firestore Security Rules** - Database rules remain unchanged
- **Firebase Storage files** - Unless explicitly enabled (see script options)

## How to Use

### Prerequisites

1. Ensure you have `firebase-admin` installed:
   ```bash
   cd functions
   npm install firebase-admin
   ```

2. Ensure `firebase/serviceAccountKey.json` exists (copy from `serviceAccountKey.json.example` and fill in your credentials)

### Running the Script

1. **Review this documentation** to understand what will be deleted

2. **Open the script** (`scripts/clearAllData.js`) and review the configuration at the top:
   ```javascript
   const CONFIG = {
     DELETE_STORAGE_FILES: false,  // Set to true to also delete Storage files
     BATCH_SIZE: 500,               // Number of documents to delete per batch
   };
   ```

3. **Run the script**:
   ```bash
   node scripts/clearAllData.js
   ```

4. **Confirm deletion** when prompted (type "DELETE ALL DATA" to confirm)

### Safety Features

- **Confirmation prompt** - Requires typing "DELETE ALL DATA" to proceed
- **Dry-run mode** - Shows what would be deleted without actually deleting (first run)
- **Progress logging** - Shows detailed progress for each collection
- **Error handling** - Continues even if one collection fails
- **Summary report** - Shows what was deleted at the end

## Example Output

```
========================================
  CLEAR ALL APPLICATION DATA
========================================

This will delete ALL data from:
- properties
- saleProfiles
- purchaseProfiles
- savedSearches
- vendors
- messages
- offers
- transactions
- favorites
- preListingChecklists
- listingProgress

**Note:** User profiles (`users` collection) are preserved and will NOT be deleted.

Storage files: NOT DELETED (set DELETE_STORAGE_FILES=true to enable)

Type "DELETE ALL DATA" to confirm: [waiting for input]
...
```

## Recovery

**There is NO recovery.** Once data is deleted, it cannot be restored unless you have:
- A Firestore backup
- A manual export of your data
- Database snapshots

## Recommendations

1. **Export your data first** using Firebase Console → Firestore → Export
2. **Test on a development/staging environment** first
3. **Verify your service account** has the correct permissions
4. **Double-check** the collections list matches your expectations

## Support

If you encounter errors:
1. Check Firebase Console for any permission issues
2. Verify `serviceAccountKey.json` is valid
3. Ensure you have admin access to the Firebase project
4. Check the script logs for specific error messages

---

**Last Updated:** 2026-01-28  
**Script Version:** 1.0
