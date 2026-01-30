/**
 * Clear All Application Data Script
 * 
 * ⚠️ WARNING: This script permanently deletes all data from Firestore collections
 * and optionally Firebase Storage. This action CANNOT BE UNDONE.
 * 
 * READ THE DOCUMENTATION FIRST: scripts/CLEAR_ALL_DATA_README.md
 */

const admin = require('firebase-admin');
const path = require('path');
const readline = require('readline');

// Configuration
const CONFIG = {
  DELETE_STORAGE_FILES: false,  // Set to true to also delete Storage files
  BATCH_SIZE: 500,               // Number of documents to delete per batch
};

// Collections to clear
const COLLECTIONS_TO_CLEAR = [
  'properties',
  'saleProfiles',
  'purchaseProfiles',
  'savedSearches',
  'vendors',
  'messages',
  'offers',
  'transactions',
  'favorites',
  'preListingChecklists',
  'listingProgress',
  // Note: 'users' collection is NOT deleted - user accounts are preserved
];

// Initialize Firebase Admin
let db, storage;
try {
  const serviceAccountPath = path.join(__dirname, '..', 'firebase', 'serviceAccountKey.json');
  const serviceAccount = require(serviceAccountPath);
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  
  db = admin.firestore();
  storage = admin.storage();
  
  console.log('✓ Firebase Admin initialized');
} catch (error) {
  console.error('✗ Error initializing Firebase Admin:', error.message);
  console.error('\nMake sure firebase/serviceAccountKey.json exists and is valid.');
  process.exit(1);
}

/**
 * Delete all documents from a collection
 */
async function deleteCollection(collectionName) {
  console.log(`\n📁 Processing collection: ${collectionName}`);
  
  try {
    const collectionRef = db.collection(collectionName);
    let deletedCount = 0;
    let batchCount = 0;
    
    // Get all documents
    const snapshot = await collectionRef.get();
    const totalDocs = snapshot.size;
    
    if (totalDocs === 0) {
      console.log(`   ✓ No documents found in ${collectionName}`);
      return { collection: collectionName, deleted: 0, errors: [] };
    }
    
    console.log(`   Found ${totalDocs} document(s)`);
    
    // Delete in batches
    const batches = [];
    let currentBatch = db.batch();
    let batchDocCount = 0;
    
    snapshot.forEach((doc) => {
      currentBatch.delete(doc.ref);
      batchDocCount++;
      deletedCount++;
      
      if (batchDocCount >= CONFIG.BATCH_SIZE) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        batchDocCount = 0;
        batchCount++;
      }
    });
    
    // Add remaining batch
    if (batchDocCount > 0) {
      batches.push(currentBatch);
      batchCount++;
    }
    
    // Execute batches
    console.log(`   Deleting ${batches.length} batch(es)...`);
    for (let i = 0; i < batches.length; i++) {
      await batches[i].commit();
      const progress = Math.round(((i + 1) / batches.length) * 100);
      process.stdout.write(`   Progress: ${progress}% (${i + 1}/${batches.length} batches)\r`);
    }
    console.log(`   ✓ Deleted ${deletedCount} document(s) from ${collectionName}`);
    
    return { collection: collectionName, deleted: deletedCount, errors: [] };
  } catch (error) {
    console.error(`   ✗ Error deleting ${collectionName}:`, error.message);
    return { collection: collectionName, deleted: 0, errors: [error.message] };
  }
}

/**
 * Delete all files from Firebase Storage
 */
async function deleteStorageFiles() {
  if (!CONFIG.DELETE_STORAGE_FILES) {
    return { deleted: 0, errors: [] };
  }
  
  console.log('\n🗂️  Processing Firebase Storage...');
  
  try {
    const bucket = storage.bucket();
    let deletedCount = 0;
    const errors = [];
    
    // List all files
    const [files] = await bucket.getFiles();
    console.log(`   Found ${files.length} file(s)`);
    
    if (files.length === 0) {
      console.log('   ✓ No files found in Storage');
      return { deleted: 0, errors: [] };
    }
    
    // Delete files in batches
    const deletePromises = files.map(async (file) => {
      try {
        await file.delete();
        deletedCount++;
        return null;
      } catch (error) {
        errors.push(`Failed to delete ${file.name}: ${error.message}`);
        return error;
      }
    });
    
    await Promise.all(deletePromises);
    
    console.log(`   ✓ Deleted ${deletedCount} file(s) from Storage`);
    if (errors.length > 0) {
      console.log(`   ⚠️  ${errors.length} error(s) occurred`);
    }
    
    return { deleted: deletedCount, errors };
  } catch (error) {
    console.error('   ✗ Error deleting Storage files:', error.message);
    return { deleted: 0, errors: [error.message] };
  }
}

/**
 * Prompt user for confirmation
 */
function promptConfirmation() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    
    console.log('\n========================================');
    console.log('  CLEAR ALL APPLICATION DATA');
    console.log('========================================\n');
    
    console.log('This will delete ALL data from:');
    COLLECTIONS_TO_CLEAR.forEach((col) => {
      console.log(`- ${col}`);
    });
    
    if (CONFIG.DELETE_STORAGE_FILES) {
      console.log('\n⚠️  Storage files: WILL BE DELETED');
    } else {
      console.log('\nStorage files: NOT DELETED (set DELETE_STORAGE_FILES=true to enable)');
    }
    
    console.log('\n⚠️  WARNING: This action CANNOT BE UNDONE!\n');
    
    rl.question('Type "DELETE ALL DATA" to confirm: ', (answer) => {
      rl.close();
      resolve(answer.trim() === 'DELETE ALL DATA');
    });
  });
}

/**
 * Main execution
 */
async function main() {
  try {
    // Confirm deletion
    const confirmed = await promptConfirmation();
    
    if (!confirmed) {
      console.log('\n❌ Deletion cancelled. No data was deleted.');
      process.exit(0);
    }
    
    console.log('\n🚀 Starting deletion process...\n');
    
    const results = [];
    const startTime = Date.now();
    
    // Delete all collections
    for (const collectionName of COLLECTIONS_TO_CLEAR) {
      const result = await deleteCollection(collectionName);
      results.push(result);
    }
    
    // Delete storage files if enabled
    if (CONFIG.DELETE_STORAGE_FILES) {
      const storageResult = await deleteStorageFiles();
      results.push({ collection: 'Storage', deleted: storageResult.deleted, errors: storageResult.errors });
    }
    
    // Summary
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n========================================');
    console.log('  DELETION SUMMARY');
    console.log('========================================\n');
    
    let totalDeleted = 0;
    let totalErrors = 0;
    
    results.forEach((result) => {
      totalDeleted += result.deleted;
      totalErrors += result.errors.length;
      
      if (result.deleted > 0) {
        console.log(`✓ ${result.collection}: ${result.deleted} document(s) deleted`);
      } else if (result.errors.length === 0) {
        console.log(`○ ${result.collection}: No documents found`);
      }
      
      if (result.errors.length > 0) {
        console.log(`  ⚠️  Errors: ${result.errors.length}`);
        result.errors.forEach((err) => {
          console.log(`    - ${err}`);
        });
      }
    });
    
    console.log(`\nTotal documents deleted: ${totalDeleted}`);
    if (CONFIG.DELETE_STORAGE_FILES) {
      const storageResult = results.find((r) => r.collection === 'Storage');
      if (storageResult) {
        console.log(`Total files deleted: ${storageResult.deleted}`);
      }
    }
    console.log(`Total errors: ${totalErrors}`);
    console.log(`Duration: ${duration} seconds`);
    
    if (totalErrors === 0) {
      console.log('\n✅ All data cleared successfully!');
    } else {
      console.log('\n⚠️  Deletion completed with some errors. Review the summary above.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
main();
