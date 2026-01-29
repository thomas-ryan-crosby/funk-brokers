/**
 * ONE-TIME SCRIPT: Delete all pre-listing checklists and set all properties to not listed.
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

const CHECKLISTS_COLLECTION = 'preListingChecklists';
const PROPERTIES_COLLECTION = 'properties';
const BATCH_SIZE = 500;

const NOT_LISTED_UPDATE = {
  availableForSale: false,
  status: 'not_listed',
  updatedAt: new Date(),
};

async function deleteChecklists() {
  const col = db.collection(CHECKLISTS_COLLECTION);
  let totalDeleted = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await col.limit(BATCH_SIZE).get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    totalDeleted += snap.size;
    console.log(`  Deleted ${snap.size} checklist docs (total: ${totalDeleted})`);
  }

  return totalDeleted;
}

async function setAllPropertiesNotListed() {
  const col = db.collection(PROPERTIES_COLLECTION);
  let totalUpdated = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const snap = await col.limit(BATCH_SIZE).get();
    if (snap.empty) break;

    const batch = db.batch();
    snap.docs.forEach((d) => {
      batch.update(d.ref, { ...NOT_LISTED_UPDATE, updatedAt: new Date() });
    });
    await batch.commit();
    totalUpdated += snap.size;
    console.log(`  Set ${snap.size} properties to not listed (total: ${totalUpdated})`);
  }

  return totalUpdated;
}

async function run() {
  console.log('Clearing pre-listing checklists...');
  const deleted = await deleteChecklists();
  console.log(`Checklists cleared: ${deleted} documents deleted.\n`);

  console.log('Setting all properties to not listed...');
  const updated = await setAllPropertiesNotListed();
  console.log(`Properties updated: ${updated} set to not listed.\n`);

  console.log('Done.');
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
