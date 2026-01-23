# Firestore Index Setup

## Current Issue

The application is querying properties with a `where` clause on `status` and `orderBy` on `createdAt`. Firestore requires a composite index for this type of query.

## Quick Fix (Already Applied)

I've updated the code to fetch properties without the `orderBy` and sort them client-side. This works for now but may be slower with many properties.

## Proper Solution: Create Firestore Index

For better performance, especially as your database grows, you should create the composite index:

### Option 1: Click the Link in the Error

When you see the error in the browser console, it provides a direct link to create the index:
```
https://console.firebase.google.com/v1/r/project/funk-brokers-production/firestore/indexes?create_composite=...
```

Just click that link and Firebase will create the index automatically.

### Option 2: Manual Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **funk-brokers-production**
3. Go to **Firestore Database** → **Indexes** tab
4. Click **Create Index**
5. Configure:
   - **Collection ID**: `properties`
   - **Fields to index**:
     - Field: `status`, Order: Ascending
     - Field: `createdAt`, Order: Descending
   - **Query scope**: Collection
6. Click **Create**

### Option 3: Using firebase.json (Recommended for Production)

Create a `firestore.indexes.json` file:

```json
{
  "indexes": [
    {
      "collectionGroup": "properties",
      "queryScope": "COLLECTION",
      "fields": [
        {
          "fieldPath": "status",
          "order": "ASCENDING"
        },
        {
          "fieldPath": "createdAt",
          "order": "DESCENDING"
        }
      ]
    }
  ],
  "fieldOverrides": []
}
```

Then deploy:
```bash
firebase deploy --only firestore:indexes
```

## Index Creation Time

Firestore indexes typically take a few minutes to build. You'll see a status indicator in the Firebase Console.

## Other Indexes You May Need

As you add more complex queries, you may need additional indexes:

1. **Search by price range + status**:
   - Collection: `properties`
   - Fields: `status` (ASC), `price` (ASC)

2. **Search by property type + status**:
   - Collection: `properties`
   - Fields: `status` (ASC), `propertyType` (ASC), `createdAt` (DESC)

3. **Offers by property**:
   - Collection: `offers`
   - Fields: `propertyId` (ASC), `createdAt` (DESC)

## Current Status

✅ Code updated to work without index (client-side sorting)  
⏳ Index creation recommended for better performance

The application will work now, but creating the index will improve query performance.
