# TOEIC 題庫管理與測驗系統

本專案是一個功能完整的多益模擬測驗系統，分為兩個獨立應用程式，並包含多項進階功能：

1.  **管理後台 (`/admin`)**: 一個安全的後台系統，供管理員使用：
    *   使用專屬的管理員帳號登入。
    *   建立、檢視、**編輯**與刪除測驗題目。
    *   設定全域的測驗總時間。
    *   檢視所有使用者的作答紀錄，並可**列印**詳細報告或**刪除**單筆紀錄。
    *   設定與 Firebase 的連接。
2.  **使用者測驗應用 (`/`)**: 一個簡潔的前台介面，供測驗者使用：
    *   使用自己的使用者帳號登入。
    *   根據管理員設定的題目與時間進行測驗。
    *   檢視個人的**測驗歷史紀錄**。
    *   查看個人的**最佳成績紀錄**。
    *   測驗結束後，可回顧包含詳解的答案。

---

## 專案結構

-   `/index.html`: 使用者測驗應用程式 (需要登入)。
-   `/app.js`: 使用者測驗應用程式的 JavaScript 邏輯。
-   `/admin/index.html`: 管理員的管理後台。
-   `/admin/app.js`: 管理後台的 JavaScript 邏輯。
-   `/firebase-config.js`: 共用的 Firebase 初始化腳本。

---

## 管理後台設定指南

若要使用 Firebase 模式，您必須先設定**管理後台**。完成此設定後，它將自動應用於使用者測驗應用。

### 步驟一：建立 Firebase 專案

1.  前往 [Firebase 控制台](https://console.firebase.google.com/)。
2.  點擊 **"新增專案"** 並依照畫面上的指示完成設定。

### 步驟二：設定 Firebase Authentication (驗證)

您需要啟用「電子郵件/密碼」的登入方式，並為管理員與測驗者建立帳號。

1.  在 Firebase 控制台中，前往 **Authentication** 區塊。
2.  點擊 **"Sign-in method"** (登入方式) 標籤。
3.  選擇 **"電子郵件/密碼"** 並啟用它。
4.  前往 **"Users"** (使用者) 標籤並點擊 **"Add user"** (新增使用者)：
    *   **建立管理員帳號：** 為您自己建立一組 Email 和密碼 (例如：`admin@you.com`)。這將用來登入管理後台。**請務必記下此帳號的 User UID** (它是一長串由字母和數字組成的字串)。
    *   **建立使用者帳號：** 為您的測驗者建立一個或多個帳號 (例如：`student1@test.com`)。他們將使用這些帳號登入測驗應用。

### 步驟三：設定 Cloud Firestore (資料庫)

您的所有題目、設定、以及使用者作答紀錄都將儲存在這裡。

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
    
    // 函式：檢查使用者是否為管理員 (透過其 UID 是否存在於 'admins' 集合中)
    function isAdmin() {
      return exists(/databases/$(database)/documents/admins/$(request.auth.uid));
    }

    // 「設定」可被任何已登入的使用者讀取，但只能由管理員寫入。
    match /settings/{docId} {
      allow read: if request.auth != null;
      allow write: if isAdmin();
    }

    // 「題目」可被任何已登入的使用者讀取，但只能由管理員寫入(建立、更新、刪除)。
    match /toeic_questions/{docId} {
      allow read: if request.auth != null;
      allow write: if isAdmin(); // 'write' includes create, update, and delete
    }

    // 「作答紀錄」的規則
    match /quiz_attempts/{attemptId} {
      // 使用者可以為自己建立一筆作答紀錄。
      allow create: if request.auth != null && request.auth.uid == request.resource.data.userId;
      
      // 使用者可以讀取自己的紀錄。管理員可以讀取所有人的紀錄。
      allow read: if (request.auth != null && request.auth.uid == resource.data.userId) || isAdmin();
      
      // 禁止使用者更新紀錄，但允許管理員刪除。
      allow update: if false;
      allow delete: if isAdmin();
    }

    // 「管理員」集合的規則
    match /admins/{adminId} {
      // 允許已登入的使用者 'get' (檢查文件是否存在)，這是 isAdmin() 函式運作的基礎。
      // 這是安全的，因為使用者無法 'list' (列出) 所有管理員。
      allow get: if request.auth != null;
      allow list, create, update, delete: if false;
    }
  }
}
```

4.  點擊 **"發佈"** (Publish) 來儲存規則。

### 步驟四：建立 Admins 集合 (CRITICAL STEP - 關鍵步驟)

新的安全規則需要一個名為 `admins` 的集合來識別誰是系統管理員。如果此步驟設定錯誤，您將會在管理後台看到「權限不足」的錯誤。

1.  在 Firestore 的「資料」(Data) 標籤頁，點擊 **"開始建立集合"** (Start collection)。
2.  將集合 ID 設為 `admins`。
3.  在「文件 ID」(Document ID) 欄位，貼上您在 **步驟二** 記下的**管理員帳號的 User UID**。
    <br>
    <div style="background-color: #fff1f0; border: 1px solid #ffccc7; border-radius: 4px; padding: 15px;">
        <strong style="color: #cf1322;">🚨 警告：</strong> 文件 ID <strong>必須</strong>使用您在「Authentication」中複製的 <strong>User UID</strong> (例如：`aBcDeFg12345...`)，<strong>絕不能</strong>使用電子郵件地址。如果設定錯誤，您將無法在管理後台執行任何操作。
    </div>
4.  為此文件新增一個欄位：
    *   **欄位名稱 (Field name):** `role`
    *   **欄位類型 (Field type):** `string`
    *   **欄位值 (Field value):** `admin`
5.  點擊 **"儲存"** (Save)。您現在已成功將該使用者指定為管理員。

### 步驟五 & 六：取得並輸入您的 Firebase 設定

依照原先的步驟，從您的 Firebase 專案中取得 Web App 的設定物件，並將其輸入到管理後台的「Firebase 設定」分頁中。儲存後，系統將會正式啟用。

---

## 如何使用本系統

### 管理員

1.  開啟 `admin/index.html`。
2.  使用您的 **Firebase 管理員帳號**登入。
3.  使用各個分頁來：
    *   **新增/管理題目：** 新增題目，或編輯/刪除現有題目。
    *   **作答紀錄：** 查看所有使用者的作答紀錄，並可列印詳細報告。
    *   **測驗設定：** 設定測驗的總時間。

### 使用者

1.  開啟根目錄的 `index.html`。
2.  使用由管理員建立的**使用者帳號**登入。
3.  在主畫面，您可以查看個人最佳成績、開始新測驗，或從歷史紀錄中回顧過去的測驗。
4.  完成測驗後，您可以看到分數，並可選擇查看詳盡的答案解析。