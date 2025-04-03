// const admin = require("firebase-admin");

// // Initialize Firebase Admin SDK
// admin.initializeApp({
//   credential: admin.credential.cert(require("./servicesAccountkey")),
// });

// module.exports = admin;
const admin = require("firebase-admin");
const serviceAccount = require("./servicesAccountkey"); // Ensure correct path

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
