# TOEIC 題庫管理與測驗系統

本專案是一個功能完整的多益模擬測驗系統，分為兩個獨立應用程式，並包含多項進階功能：

1.  **管理後台 (`/admin`)**: 一個安全的後台系統，供管理員使用：
    *   使用專屬的管理員帳號登入。
    *   建立、檢視、**編輯**與刪除測驗題目。
    *   設定全域的測驗總時間。
    *   檢視所有使用者的作答紀錄，並可**列印**詳細報告或**刪除**單筆紀錄。
2.  **使用者測驗應用 (`/`)**: 一個簡潔的前台介面，供測驗者使用：
    *   使用自己的使用者帳號登入。
    *   根據管理員設定的題目與時間進行測驗。
    *   檢視個人的**測驗歷史紀錄**。
    *   查看個人的**最佳成績紀錄**與**全站排行榜**。
    *   測驗結束後，可回顧包含詳解的答案。

---

## 專案結構

-   `/index.html`: 使用者測驗應用程式。
-   `/app.js`: 使用者測驗應用程式的邏輯。
-   `/admin/index.html`: 管理員的管理後台。
-   `/admin/app.js`: 管理後台的邏輯。
-   `/firebase-config.js`: 共用的 Firebase 初始化腳本。
-   `/firebase-credentials.js`: **(您需要手動建立)** 存放您 Firebase 金鑰的設定檔。
-   `/.gitignore`: **(您需要手動建立)** 防止金鑰被上傳到 GitHub 的設定檔。

---

## 首次設定指南 (Deployment Guide)

請依照以下步驟完成設定，讓系統能連接至您的 Firebase 後端。

### 步驟一：建立 `firebase-credentials.js` 設定檔 (CRITICAL STEP - 關鍵步驟)

這是整個設定流程中最重要的一步。您需要手動建立一個檔案來存放您的 Firebase 專案金鑰。

1.  在您專案的**根目錄** (與 `index.html` 同一層)，手動建立一個名為 `firebase-credentials.js` 的新檔案。
2.  前往您的 [Firebase 控制台](https://console.firebase.google.com/)，點擊左上角的齒輪圖示，進入「專案設定」。
3.  在「一般」分頁下方，找到您的 Web App，然後點擊「設定」區塊的 **"設定物件" (Config)**。
4.  複製整個 `firebaseConfig` 物件。
5.  回到您建立的 `firebase-credentials.js` 檔案，並貼上以下內容，將 `...` 部分替換為您剛剛複製的設定物件：

```javascript
// firebase-credentials.js

export const firebaseConfig = {
  // 在此貼上您從 Firebase 控制台複製的設定物件
  // 例如:
  // apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXX",
  // authDomain: "your-project-id.firebaseapp.com",
  // ...
};
```

### 步驟二：建立 `.gitignore` 檔案以保護金鑰

為了防止您不小心將含有敏感金鑰的 `firebase-credentials.js` 檔案上傳到公開的 GitHub 儲存庫，您必須建立一個 `.gitignore` 檔案。

1.  在您專案的**根目錄**，手動建立一個名為 `.gitignore` 的新檔案。
2.  將以下內容貼到 `.gitignore` 檔案中並儲存：

```
# Firebase credentials
firebase-credentials.js
```

### 步驟三：建立 Firebase 專案

1.  前往 [Firebase 控制台](https://console.firebase.google.com/)。
2.  點擊 **"新增專案"** 並依照畫面上的指示完成設定。

### 步驟四：設定 Firebase Authentication (驗證)

1.  在 Firebase 控制台中，前往 **Authentication** 區塊。
2.  點擊 **"Sign-in method"** (登入方式) 標籤。
3.  選擇 **"電子郵件/密碼"** 並啟用它。
4.  前往 **"Users"** (使用者) 標籤並點擊 **"Add user"** (新增使用者)：
    *   **建立管理員帳號：** 為您自己建立一組 Email 和密碼。**請務必記下此帳號的 User UID** (它是一長串由字母和數字組成的字串)。
    *   **建立使用者帳號：** 為您的測驗者建立一個或多個帳號。

### 步驟五：設定 Cloud Firestore (資料庫)

1.  在 Firebase 控制台中，前往 **Cloud Firestore** 區塊。
2.  點擊 **"建立資料庫"** 並以 **"正式版模式"** (Production mode) 開始。
3.  前往 **"規則"** (Rules) 標籤，並貼上下方的規則。
    <br>
    <div style="background-color: #fffbe6; border: 1px solid #ffe58f; border-radius: 4px; padding: 15px;">
        <strong style="color: #d46b08;">⚠️ 極度重要：</strong> 請務必刪除您現有的所有規則，並將下方<strong>完整的程式碼區塊</strong>複製貼上。任何的遺漏都可能導致權限錯誤。
    </div>

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAdmin() {
      return exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    match /settings/{docId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }

    match /toeic_questions/{docId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }

    match /quiz_attempts/{attemptId} {
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      allow read: if (request.auth != null && request.auth.uid == resource.data.userId) || isAdmin();
      allow update: if false;
      allow delete: if isAdmin();
    }
    
    match /leaderboard_scores/{scoreId} {
      // Allow a user to create a score entry for themselves
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      // Allow any authenticated user to read the leaderboard
      allow read: if request.auth != null;
      // Disallow updates or deletes from the client-side for security
      allow update, delete: if false;
    }

    match /admins/{adminId} {
      allow get: if request.auth != null;
      allow list, create, update, delete: if false;
    }
  }
}
```
4.  點擊 **"發佈"** (Publish) 來儲存規則。

### 步驟六：建立 Admins 集合

1.  在 Firestore 的「資料」(Data) 標籤頁，點擊 **"開始建立集合"** (Start collection)。
2.  將集合 ID 設為 `admins`。
3.  在「文件 ID」(Document ID) 欄位，貼上您在 **步驟四** 記下的**管理員帳號的 User UID**。
    <br>
    <div style="background-color: #fff1f0; border: 1px solid #ffccc7; border-radius: 4px; padding: 15px;">
        <strong style="color: #cf1322;">🚨 警告：</strong> 文件 ID <strong>必須</strong>使用您在「Authentication」中複製的 <strong>User UID</strong>，<strong>絕不能</strong>使用電子郵件地址。
    </div>
4.  為此文件新增一個欄位：
    *   **欄位名稱 (Field name):** `role`
    *   **欄位類型 (Field type):** `string`
    *   **欄位值 (Field value):** `admin`
5.  點擊 **"儲存"** (Save)。您現在已成功將該使用者指定為管理員。

### 步驟七：建立 Firestore 索引 (排行榜功能)

為了讓排行榜功能正常運作，您需要為 `leaderboard_scores` 集合手動建立一個索引。Firebase 會在您第一次嘗試讀取排行榜時，於瀏覽器的開發者工具中提供一個自動建立索引的連結。

1.  完成所有設定後，使用一個**一般使用者帳號**登入測驗前端 (`index.html`)。
2.  在主畫面上，排行榜區塊會顯示一則關於缺少索引的錯誤訊息。
3.  打開您瀏覽器的**開發者工具** (通常是按 F12)，並切換到「主控台」(Console) 標籤頁。
4.  您會看到一條來自 Firebase 的錯誤訊息，其中包含一個**長網址 (URL)**。
5.  **點擊該網址**。它會將您導向 Firebase 控制台，並自動填好所有索引設定。
6.  點擊 **"建立索引" (Create Index)** 按鈕。索引建立需要幾分鐘時間。
7.  建立完成後，重新整理測驗頁面，排行榜即可正常顯示。

**設定完成！現在您可以將專案部署到任何地方，它都能正常運作。**