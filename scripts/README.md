# Scripts

## Populate Dummy Data

This script populates your Firestore database with 10 sample properties for testing and visualization.

### Prerequisites

1. Make sure you have `firebase-admin` installed:
```bash
npm install firebase-admin
```

2. Ensure your Firebase service account key is in place:
   - File should be at: `firebase/serviceAccountKey.json`
   - This is the same key you set up during initial project configuration

3. Make sure Firestore is enabled in your Firebase Console

### Running the Script

```bash
npm run populate-data
```

### What It Does

The script will:
- Add 10 diverse sample properties to your Firestore `properties` collection
- Properties include various types (single-family, condo, townhouse, multi-family)
- Properties are in different cities across the US
- Price ranges from $425,000 to $1,250,000
- Each property has realistic details (bedrooms, bathrooms, square feet, etc.)
- Properties include sample photos (using Unsplash URLs)

### Sample Properties Added

1. San Francisco, CA - $1,250,000 - Single Family
2. Los Angeles, CA - $850,000 - Condo
3. Seattle, WA - $675,000 - Townhouse
4. Austin, TX - $950,000 - Single Family
5. Portland, OR - $550,000 - Single Family
6. Denver, CO - $425,000 - Condo
7. Chicago, IL - $750,000 - Multi-Family
8. Miami, FL - $1,200,000 - Condo
9. Boston, MA - $1,100,000 - Townhouse
10. Nashville, TN - $475,000 - Single Family

### Troubleshooting

**Error: Cannot find module 'firebase-admin'**
- Run: `npm install firebase-admin`

**Error: Service account key not found**
- Make sure `firebase/serviceAccountKey.json` exists
- Check that the file path is correct

**Error: Permission denied**
- Make sure your service account has Firestore write permissions
- Check Firebase Console → IAM & Admin → Service Accounts

**Error: Firestore not initialized**
- Go to Firebase Console → Firestore Database
- Create database if it doesn't exist
- Make sure it's in production mode (or update security rules)

---

## Clear All Data

⚠️ **DESTRUCTIVE OPERATION** - This script permanently deletes all application data from Firestore and optionally Firebase Storage.

### ⚠️ WARNING

**This action CANNOT BE UNDONE.** Always review the documentation before running.

### Prerequisites

1. Ensure you have `firebase-admin` installed:
   ```bash
   cd functions
   npm install firebase-admin
   ```

2. Ensure `firebase/serviceAccountKey.json` exists and is valid

### Documentation

**READ THIS FIRST:** `scripts/CLEAR_ALL_DATA_README.md`

The documentation explains:
- What collections will be deleted
- What data will be removed
- Safety features and confirmation prompts
- Recovery options (there are none!)

### Running the Script

```bash
node scripts/clearAllData.js
```

### What Gets Deleted

- All properties
- All sale profiles
- All purchase profiles (buying power info)
- All saved searches
- All vendors
- All messages
- All offers
- All transactions
- All favorites
- All pre-listing checklists
- All listing progress

**Note:** User profiles (`users` collection) are preserved and will NOT be deleted.

### Configuration

Edit the script to configure:
- `DELETE_STORAGE_FILES`: Set to `true` to also delete Storage files (default: `false`)
- `BATCH_SIZE`: Number of documents to delete per batch (default: 500)

### Safety Features

- Requires typing "DELETE ALL DATA" to confirm
- Shows detailed progress for each collection
- Provides summary report at the end
- Continues even if one collection fails

---

## Backfill Property Coordinates

Adds `latitude` and `longitude` to existing properties that have an address but no coordinates, using the Google Geocoding API. Used for map search.

### Prerequisites

- `firebase/serviceAccountKey.json` (same as populate-data)
- **Google Geocoding API** enabled in Google Cloud (same project as Maps/Places)
- API key with Geocoding allowed. Set `GOOGLE_MAPS_API_KEY` or `VITE_GOOGLE_MAPS_API_KEY`

### Run

```bash
GOOGLE_MAPS_API_KEY=your_key npm run backfill-coordinates
```

Or (Windows PowerShell):

```powershell
$env:GOOGLE_MAPS_API_KEY="your_key"; npm run backfill-coordinates
```

### Behavior

- Reads all documents in the `properties` collection
- Skips properties that already have `latitude` and `longitude`
- For others: builds an address from `address`, `city`, `state`, `zipCode`; if empty, skips
- Calls Geocoding API, then writes `latitude`, `longitude`, and `updatedAt`
- Waits ~250ms between requests to reduce rate-limit risk
