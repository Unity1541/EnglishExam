/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

let app;
let auth;
let db; // This will now be a Firestore instance
let isConfigured = false;

// Function to initialize Firebase
export function initializeFirebase(config) {
    try {
        // If an app is already initialized, delete it to reconfigure
        if (firebase.apps.length) {
            firebase.app().delete().then(() => {
                app = firebase.initializeApp(config);
                _initializeServices();
            });
        } else {
            app = firebase.initializeApp(config);
            _initializeServices();
        }
        
        console.log("Firebase initialized successfully with Firestore.");
        return { success: true };
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        isConfigured = false;
        auth = null;
        db = null;
        return { success: false, error: error.message };
    }
}

function _initializeServices() {
    auth = firebase.auth();
    db = firebase.firestore(); // Use Firestore
    isConfigured = true;
}

// Function to get the initialized Firebase instances
export function getFirebaseInstances() {
    return { auth, db, isConfigured };
}