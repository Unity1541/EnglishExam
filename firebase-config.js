// --- Central Firebase Configuration & Initialization ---
// This is the ONLY file where you need to paste your Firebase config.

const firebaseConfig = {
  apiKey: "AIzaSyDaY_YKD7mYjYYbyJpaBPqhIAABxW4gDlg",
  authDomain: "englishexam-4d060.firebaseapp.com",
  projectId: "englishexam-4d060",
  storageBucket: "englishexam-4d060.firebasestorage.app",
  messagingSenderId: "925981308715",
  appId: "1:925981308715:web:d4b3daffd4b9e28493f76e",
};

// --- Firebase Initialization ---
// The following code initializes Firebase. It is designed to run once.
// The check for firebase.apps.length is a safety measure to avoid re-initializing the app.
try {
  if (typeof firebase !== "undefined" && !firebase.apps.length) {
    // Check if the config has been filled out
    if (firebaseConfig.apiKey && !firebaseConfig.apiKey.startsWith("請在此")) {
      firebase.initializeApp(firebaseConfig);
    } else {
      // Do not initialize, the page scripts will detect this and show a user-friendly error.
      console.error(
        "Firebase config is missing or a placeholder. Please edit firebase-config.js"
      );
    }
  }
} catch (e) {
  // Log the error for developers. The user will see a message on the page itself.
  console.error(e);
}
