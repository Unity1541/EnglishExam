/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// 從您手動建立的設定檔中導入 Firebase 設定物件
import { firebaseConfig } from './firebase-credentials.js';

let app;
let auth;
let db; // This will now be a Firestore instance
let isConfigured = false;

// 這是一個立即執行的函式，在腳本載入時自動初始化 Firebase。
(function initialize() {
    // 簡單檢查，確保使用者已將預留位置值替換掉。
    if (!firebaseConfig || !firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("AIzaSyXXX")) {
        console.warn("Firebase config in firebase-credentials.js 似乎尚未使用真實值，或檔案遺失。Firebase 將不會初始化。");
        return; // 不進行初始化以避免錯誤。
    }

    try {
        // 確保只初始化一次
        if (!firebase.apps.length) {
            app = firebase.initializeApp(firebaseConfig);
            auth = firebase.auth();
            db = firebase.firestore();
            isConfigured = true;
            console.log("Firebase initialized successfully with Firestore.");
        }
    } catch (error) {
        console.error("Firebase initialization failed:", error);
        isConfigured = false;
    }
})();

// 匯出一個函式，讓其他腳本可以取得已初始化的 Firebase 服務實例。
export function getFirebaseInstances() {
    return { auth, db, isConfigured };
}