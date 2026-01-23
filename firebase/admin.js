// Firebase Admin SDK Initialization
// This is used for server-side operations (Cloud Functions, etc.)
const admin = require("firebase-admin");
const path = require("path");
const serviceAccount = require(path.join(__dirname, "serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const storage = admin.storage();

module.exports = {
  admin,
  db,
  storage
};
