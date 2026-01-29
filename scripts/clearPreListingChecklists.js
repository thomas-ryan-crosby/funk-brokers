/**
 * ONE-TIME SCRIPT: Delete all documents in the preListingChecklists Firestore collection.
 * Run only when explicitly instructed. Do not run as part of normal app flow.
 *
 * Run from project root: node scripts/clearPreListingChecklists.js
 * Requires: firebase/serviceAccountKey.json
 */
const admin = require('firebase-admin');
const path = require('path');

const serviceAccount = require(path.join(__dirname, '../firebase/serviceAccountKey.json'));
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

const COLLECTION = 'preListingChecklists';
const BATCH_SIZE = 500;

async function deleteCollection() {
  const col = db.collection(COLLECTION);
  let totalDeleted = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await col.limit(BATCH_SIZE).get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    totalDeleted += snap.size;
    console.log(`Deleted ${snap.size} docs (total so far: ${totalDeleted})`);
  }

  return totalDeleted;
}

async function run() {
  console.log(`Clearing all documents in "${COLLECTION}"...`);
  const total = await deleteCollection();
  console.log(`Done. Total documents deleted: ${total}`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
