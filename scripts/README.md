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
