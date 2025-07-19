
# Firebase 設定指南 - English Reading Hub

本指南將協助您設定 Firebase 以使用 English Reading Hub 的完整功能。

> ⚠️ **無法登入？99% 的問題都出在這裡！**
> 如果您無法登入，最可能的原因是 `firebase-config.js` 檔案**沒有**被正確地修改。請直接跳到【第七步：疑難排解】並逐一檢查，這能解決絕大部分的登入問題。

## 🚀 第一步：建立 Firebase 專案

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 點擊「建立專案」
3. 輸入專案名稱：`english-reading-hub`
4. 啟用 Google Analytics (可選)
5. 完成專案建立

## 🔧 第二步：設定 Web 應用程式

1. 在 Firebase 專案概覽中，點擊「Web」圖示 (`</>`)
2. 註冊應用程式名稱：`English Reading Hub`
3. **不要**勾選 "同時為此應用程式設定 Firebase Hosting"
4. 註冊應用程式後，複製產生的 `firebaseConfig` 物件。

> ⚠️ **重要警告：**
> 下方的 `firebaseConfig` 物件中的值**皆為範例**。您**必須**將其替換為您自己 Firebase 專案中的真實金鑰。若使用範例金鑰，包含登入在內的所有功能都將會失敗！

```javascript
// 這是您會從 Firebase 複製的範例
const firebaseConfig = {
  apiKey: "your-api-key-here",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

## 📝 第三步：更新程式碼配置 (最重要的一步)

在您的專案根目錄中，找到 `firebase-config.js` 檔案，並將您從第二步複製的 `firebaseConfig` 物件**完整貼上**，取代檔案中原有的所有範例值。

## 📊 第四步：設定 Firestore 資料庫

1. 在左側選單點擊「Firestore Database」
2. 點擊「建立資料庫」
3. 選擇「以**正式**模式啟動」（我們將使用自訂規則）
4. 選擇資料庫位置（建議選擇離您較近的位置）

## 🔒 第五步：設定安全規則

在 Firestore Database > 規則 中，使用以下規則：
**（這組是最新且正確的規則，請完整複製並取代您現有的規則）**

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // --- Helper Functions ---
    // Checks if the user is an admin by checking their email against a list.
    function isAdmin() {
      return request.auth != null && request.auth.token.email in ['admin@englishhub.com'];
    }

    // Checks if a user is authenticated (including anonymous users).
    function isSignedIn() {
      return request.auth != null;
    }

    // Checks if the requesting user is the owner of the document.
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    // --- Collection Rules ---

    // Articles & Questions: Publicly readable. Only admins can modify.
    match /articles/{articleId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    match /questions/{questionId} {
      allow read: if true;
      allow write: if isAdmin();
    }

    // Test Sessions: Publicly readable. Users can only create their own session.
    // Admins can create sessions for seeding and delete records. Modification is disallowed to protect data integrity.
    match /test-sessions/{sessionId} {
      allow create: if (isSignedIn() && request.resource.data.userId == request.auth.uid) || isAdmin();
      allow read: if true;
      allow update: if false; // Updates are disallowed to protect integrity
      allow delete: if isAdmin(); // Admins can delete records
    }

    // Leaderboard: Publicly readable. Users can only create/update their own entry.
    // Admins can manage any entry, which is required for seeding sample data.
    match /leaderboard/{userId} {
      allow read: if true;
      allow create, update: if isOwner(userId) || isAdmin();
      allow delete: if isAdmin();
    }
  }
}
```

## 🔐 第六步：設定驗證 (Authentication)

1. 在左側選單點擊「Authentication」
2. 點擊「開始使用」
3. 在「Sign-in method」標籤中：
   - **啟用「匿名」登入**（供訪客使用，這是**必要**步驟）
   - **啟用「電子郵件/密碼」**（供管理員使用）

### 建立管理員帳號

在 Authentication > Users 中：
1. 點擊「新增使用者」
2. 輸入管理員電子郵件：`admin@englishhub.com`
3. 輸入密碼：`Admin@123456` (或您自己的安全密碼)
4. 建立後，您的管理員帳號就完成了。

## 🤔 第七步：疑難排解 - 無法登入？

如果您點擊登入按鈕後遇到問題（例如看到錯誤訊息、被跳轉回來或按鈕沒反應），請**務必**像對照清單一樣，逐一檢查以下四點：

---

#### ✅ **檢查點 1：`firebase-config.js` 是否已替換為真實金鑰？**

這是**最常見**的錯誤。打開您專案中的 `firebase-config.js` 檔案。

**錯誤的範例 (無法運作):**
```javascript
// 這是預設的檔案，所有值都是預留位置，會導致登入失敗！
const firebaseConfig = {
  apiKey: "請在此貼上您的 API 金鑰",
  authDomain: "您的專案ID.firebaseapp.com",
  projectId: "您的專案ID",
  storageBucket: "您的專案ID.appspot.com",
  messagingSenderId: "您的傳訊傳送者 ID",
  appId: "您的應用程式 ID"
};
```

**正確的範例 (可以運作):**
```javascript
// 這是從您自己的 Firebase 專案複製貼上的真實金鑰
const firebaseConfig = {
  apiKey: "AIzaSyC...xxxxxxxxxxxx", // 這是以 "AIza" 開頭的真實金鑰
  authDomain: "english-reading-hub.firebaseapp.com",
  projectId: "english-reading-hub",
  storageBucket: "english-reading-hub.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:xxxxxxxxxxxxxx"
};
```
**➡️ 解決方案：** 回到【第二步】，從您的 Firebase 控制台複製 **您自己的** `firebaseConfig` 物件，並用它**完整替換**掉 `firebase-config.js` 中的所有內容。

---

#### ✅ **檢查點 2：驗證方式是否已啟用？**

1.  在 Firebase 控制台，前往「Authentication」。
2.  點擊「Sign-in method」分頁。
3.  確認「電子郵件/密碼」這一項的狀態是**已啟用**。如果不是，請啟用它。

---

#### ✅ **檢查點 3：管理員帳號是否已建立？**

1.  在 Firebase 控制台，前往「Authentication」。
2.  點擊「Users」分頁。
3.  確認您看到一個使用者，其「使用者 UID」欄位下方的電子郵件**完全是** `admin@englishhub.com`。一個字母都不能錯。

---

#### ✅ **檢查點 4：密碼是否正確？**

1.  您在登入頁面輸入的密碼，是否和您在建立使用者時設定的密碼**完全相同**？
2.  密碼是區分大小寫的。
3.  如果您忘記了，可以回到 Authentication > Users 頁面，點擊該使用者右側的三個點，然後選擇「重設密碼」。

---

## 🤖 第八步：(可選) 設定 AI 輔助功能

管理員後台整合了 Google Gemini AI，可根據您貼上的文章內容，自動生成標題、摘要與測驗題目。

### 如何啟用

1.  **取得 API 金鑰：** 您需要一個 Google AI Studio 的 API 金鑰。您可以從 [Google AI Studio](https://aistudio.google.com/app/apikey) 免費取得。

2.  **設定環境變數：** 此應用程式透過一個名為 `API_KEY` 的環境變數來讀取您的金鑰。您必須在您運行此應用的環境中設定這個變數。

### ⚠️ 重要：執行環境的限制

此應用程式目前的設計是靜態的 HTML 檔案。如果您只是在本地端用瀏覽器直接打開 `fixed_admin_dashboard.html` 檔案 (`file:///...`)，瀏覽器**沒有**辦法讀取環境變數，因此 AI 功能將會顯示錯誤且**無法運作**。

**要讓 AI 功能正常運作，您有以下選擇：**

*   **使用開發伺服器：** 使用一個簡單的本地開發伺服器 (例如 Node.js 的 `serve` 套件、Vite 或 VS Code 的 `Live Server` 擴充功能)，並配合能夠設定環境變數的機制。
*   **部署到託管平台：** 將您的專案部署到支援設定環境變數的託管服務上 (例如 Netlify, Vercel, Firebase Hosting 搭配 Cloud Functions 等)。

這是前端開發中常見的限制，將敏感的金鑰保留在安全的環境變數中，是保護帳戶安全的最佳實踐。

## 🎉 完成！

恭喜！您已成功設定 English Reading Hub 的 Firebase 後端。現在您的應用程式已準備就緒，可以正常運作了！打開 `index.html` 開始使用，或打開 `admin_login.html` 登入後台。
