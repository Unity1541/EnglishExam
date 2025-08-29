/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeFirebase, getFirebaseInstances } from '../firebase-config.js';

// --- State Management ---
let currentUser = null;
let isFirebaseMode = false;

// --- Mock Data for Demo Mode ---
const mockDatabase = {
    settings: {
        testTimeMinutes: 120,
    },
    toeic_questions: {
        "vocab_demo_001": { id: "vocab_demo_001", questionType: "vocabulary", level: "intermediate", question: "The company's new policy will _______ all employees starting next month.", options: ["effect", "affect", "infect", "defect"], correct: 1, explanation: "Affect is a verb meaning 'to influence', while effect is a noun meaning 'result'." },
        "grammar_demo_001": { id: "grammar_demo_001", questionType: "grammar", level: "intermediate", question: "The report _______ by the marketing team yesterday.", options: ["completed", "was completed", "has completed", "completes"], correct: 1, explanation: "Passive voice in past tense: was/were + past participle." }
    },
    quiz_attempts: {
        "attempt_demo_001": { id: "attempt_demo_001", userEmail: 'student@demo.com', score: 1, totalQuestions: 2, timestamp: new Date(), questions: [/*...full questions*/], userAnswers: [1, 0] }
    }
};

// --- DOM Elements ---
const DOM = {
    loginPanel: document.getElementById('loginPanel'),
    loginBtn: document.getElementById('loginBtn'),
    adminEmail: document.getElementById('adminEmail'),
    adminPassword: document.getElementById('adminPassword'),
    loginError: document.getElementById('loginError'),
    mainContent: document.getElementById('mainContent'),
    authInfo: document.getElementById('authInfo'),
    userEmail: document.getElementById('userEmail'),
    logoutBtn: document.getElementById('logoutBtn'),
    modeIndicator: document.getElementById('mode-indicator'),
    tabsContainer: document.getElementById('tabs-container'),
    tabContents: document.querySelectorAll('.tab-content'),
    questionsList: document.getElementById('questionsList'),
    recordsList: document.getElementById('records-list'),
    recordsFeedback: document.getElementById('records-feedback'),
    saveFirebaseConfigBtn: document.getElementById('saveFirebaseConfig'),
    configFeedback: document.getElementById('config-feedback'),
    testTimeInput: document.getElementById('testTime'),
    saveTestTimeBtn: document.getElementById('saveTestTimeBtn'),
    settingsFeedback: document.getElementById('settings-feedback'),
    questionTypeSelect: document.getElementById('question-type-select'),
    jsonInputArea: document.getElementById('json-input-area'),
    submitQuestionBtn: document.getElementById('submit-question-btn'),
    addQuestionFeedback: document.getElementById('add-question-feedback'),
    // Firebase config form inputs
    apiKey: document.getElementById('apiKey'),
    authDomain: document.getElementById('authDomain'),
    projectId: document.getElementById('projectId'),
    storageBucket: document.getElementById('storageBucket'),
    messagingSenderId: document.getElementById('messagingSenderId'),
    appId: document.getElementById('appId'),
    // Edit Modal
    editModal: document.getElementById('edit-question-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    editJsonArea: document.getElementById('edit-json-area'),
    saveEditBtn: document.getElementById('save-edit-btn'),
    editingQuestionId: document.getElementById('editing-question-id'),
    editFeedback: document.getElementById('edit-feedback'),
};

// --- Main App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Event Listeners
    DOM.loginBtn.addEventListener('click', handleLogin);
    DOM.logoutBtn.addEventListener('click', handleLogout);
    DOM.saveTestTimeBtn.addEventListener('click', saveTestTime);
    DOM.submitQuestionBtn.addEventListener('click', handleAddQuestion);
    DOM.saveFirebaseConfigBtn.addEventListener('click', saveFirebaseConfig);
    DOM.closeModalBtn.addEventListener('click', () => DOM.editModal.classList.add('hidden'));
    DOM.saveEditBtn.addEventListener('click', handleSaveEdit);
    DOM.recordsList.addEventListener('click', handleRecordAction);
    DOM.questionsList.addEventListener('click', handleQuestionAction); // Refactored for event delegation

    DOM.tabsContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('tab')) {
            switchTab(e.target.dataset.tab);
        }
    });

    document.querySelectorAll('.btn-copy').forEach(btn => {
        btn.addEventListener('click', () => {
            const preId = btn.dataset.example;
            const textToCopy = document.getElementById(preId).innerText;
            navigator.clipboard.writeText(textToCopy).then(() => {
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.textContent = '複製範例'; }, 2000);
            });
        });
    });
    
    // Initial state setup
    const savedConfig = localStorage.getItem('firebaseConfig');
    if (savedConfig) {
        const config = JSON.parse(savedConfig);
        const result = initializeFirebase(config);
        if (result.success) {
            updateUIMode(true);
            listenForAuthState();
        } else {
            updateUIMode(false);
        }
    } else {
        updateUIMode(false); // Default to Demo Mode
    }
});

function listenForAuthState() {
    const { auth } = getFirebaseInstances();
    auth.onAuthStateChanged(user => {
        if (user) {
            onLoginSuccess({ email: user.email });
        } else {
            // This will keep the user on the login page if they are not logged in
            handleLogout();
        }
    });
}

// --- Authentication & Mode ---
function updateUIMode(isFirebase) {
    isFirebaseMode = isFirebase;
    const indicator = DOM.modeIndicator;
    if (isFirebase) {
        indicator.textContent = 'Firebase Mode';
        indicator.className = 'firebase-mode';
        document.getElementById('demo-info').classList.add('hidden');
        document.getElementById('demo-mode-info-panel').classList.add('hidden');
    } else {
        indicator.textContent = 'Demo Mode';
        indicator.className = 'demo-mode';
        document.getElementById('demo-info').classList.remove('hidden');
        document.getElementById('demo-mode-info-panel').classList.remove('hidden');
    }
}

async function handleLogin() {
    const email = DOM.adminEmail.value;
    const password = DOM.adminPassword.value;
    DOM.loginError.classList.add('hidden');

    if (isFirebaseMode) {
        const { auth } = getFirebaseInstances();
        try {
            await auth.signInWithEmailAndPassword(email, password);
            // onAuthStateChanged will handle UI update
        } catch (error) {
            DOM.loginError.textContent = `Firebase 登入失敗: ${error.message}`;
            DOM.loginError.classList.remove('hidden');
        }
    } else {
        if (email === 'admin@demo.com' && password === 'demo123') {
            onLoginSuccess({ email });
        } else {
            DOM.loginError.textContent = '登入失敗，請檢查帳號密碼';
            DOM.loginError.classList.remove('hidden');
        }
    }
}

function onLoginSuccess(user) {
    currentUser = user;
    DOM.loginPanel.classList.add('hidden');
    DOM.mainContent.classList.remove('hidden');
    DOM.authInfo.style.display = 'flex';
    DOM.userEmail.textContent = user.email;
    switchTab('examples'); // Default to a safe tab
}

async function handleLogout() {
    if (isFirebaseMode) {
        const { auth, isConfigured } = getFirebaseInstances();
        if (isConfigured) {
            try {
                await auth.signOut();
            } catch (error) {
                console.error("Logout failed:", error);
            }
        }
    }
    currentUser = null;
    DOM.mainContent.classList.add('hidden');
    DOM.authInfo.style.display = 'none';
    DOM.loginPanel.classList.remove('hidden');
}


// --- Tab Management ---
function switchTab(tabId) {
    DOM.tabsContainer.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabId);
    });
    DOM.tabContents.forEach(content => {
        content.classList.toggle('hidden', content.id !== `${tabId}-tab`);
    });

    // Load data for specific tabs when they are opened
    if (tabId === 'settings') loadTestTime();
    if (tabId === 'manage') loadAllQuestions();
    if (tabId === 'user-records') {
        showFeedback(DOM.recordsFeedback, '', 'hidden');
        loadUserRecords();
    }
    if (tabId === 'add-question') {
        showFeedback(DOM.addQuestionFeedback, '', 'hidden');
        DOM.jsonInputArea.value = '';
        DOM.questionTypeSelect.value = '';
    }
}


// --- General UI Feedback ---
function showFeedback(element, message, type) {
    element.innerHTML = message; // Use innerHTML to support <br> tags
    element.className = '';
    if (type === 'hidden') {
        element.classList.add('hidden');
    } else {
        element.classList.add('alert', `alert-${type}`);
        element.classList.remove('hidden');
    }
}

// --- Add Question ---
async function handleAddQuestion() {
    const selectedType = DOM.questionTypeSelect.value;
    const jsonString = DOM.jsonInputArea.value.trim();

    if (!selectedType) {
        showFeedback(DOM.addQuestionFeedback, '請先選擇題目類型', 'error');
        return;
    }

    if (!jsonString) {
        showFeedback(DOM.addQuestionFeedback, 'JSON 內容不能為空', 'error');
        return;
    }

    let questionData;
    try {
        questionData = JSON.parse(jsonString);
    } catch (error) {
        showFeedback(DOM.addQuestionFeedback, 'JSON 格式錯誤，請檢查您的輸入', 'error');
        return;
    }

    if (!questionData.id || !questionData.questionType) {
        showFeedback(DOM.addQuestionFeedback, 'JSON 缺少必要的欄位: id 和 questionType', 'error');
        return;
    }
    
    if (questionData.questionType !== selectedType) {
        showFeedback(DOM.addQuestionFeedback, `JSON 內的 "questionType" ("${questionData.questionType}") 與您選擇的類型 ("${selectedType}") 不符。`, 'error');
        return;
    }

    try {
        if (isFirebaseMode) {
            const { db } = getFirebaseInstances();
            await db.collection('toeic_questions').doc(questionData.id).set(questionData);
        } else {
            mockDatabase.toeic_questions[questionData.id] = questionData;
        }
        showFeedback(DOM.addQuestionFeedback, `題目 (ID: ${questionData.id}) 已成功新增！`, 'success');
        DOM.jsonInputArea.value = '';
        DOM.questionTypeSelect.value = '';
    } catch (error) {
        console.error("Error adding question:", error);
        let errorMsg = `新增失敗: ${error.message}`;
        if (error.code === 'permission-denied') {
            errorMsg += "<br><strong>提示：</strong>請確認您的管理員權限 (admins 集合) 已正確設定。";
        }
        showFeedback(DOM.addQuestionFeedback, errorMsg, 'error');
    }
}

// --- Test Time Settings ---
async function loadTestTime() {
    showFeedback(DOM.settingsFeedback, '', 'hidden');
    try {
        let time = 120; // Default
        if (isFirebaseMode) {
            const { db } = getFirebaseInstances();
            const docRef = db.collection('settings').doc('config');
            const docSnap = await docRef.get();
            if (docSnap.exists) {
                time = docSnap.data().testTimeMinutes;
            }
        } else {
            time = mockDatabase.settings.testTimeMinutes;
        }
        DOM.testTimeInput.value = time;
    } catch (error) {
        showFeedback(DOM.settingsFeedback, '無法載入設定', 'error');
    }
}

async function saveTestTime() {
    const time = parseInt(DOM.testTimeInput.value, 10);
    if (isNaN(time) || time <= 0) {
        showFeedback(DOM.settingsFeedback, '請輸入有效的時間（正整數）', 'error');
        return;
    }

    try {
        if (isFirebaseMode) {
            const { db } = getFirebaseInstances();
            await db.collection('settings').doc('config').set({ testTimeMinutes: time });
        } else {
            mockDatabase.settings.testTimeMinutes = time;
        }
        showFeedback(DOM.settingsFeedback, '設定已成功儲存！', 'success');
    } catch (error) {
        showFeedback(DOM.settingsFeedback, `儲存失敗: ${error.message}`, 'error');
    }
}

// --- Firebase Configuration ---
function saveFirebaseConfig() {
    const config = {
        apiKey: DOM.apiKey.value.trim(),
        authDomain: DOM.authDomain.value.trim(),
        projectId: DOM.projectId.value.trim(),
        storageBucket: DOM.storageBucket.value.trim(),
        messagingSenderId: DOM.messagingSenderId.value.trim(),
        appId: DOM.appId.value.trim(),
    };

    if (Object.values(config).some(v => v === '')) {
        showFeedback(DOM.configFeedback, '所有欄位均為必填', 'error');
        return;
    }

    const result = initializeFirebase(config);
    if (result.success) {
        localStorage.setItem('firebaseConfig', JSON.stringify(config));
        showFeedback(DOM.configFeedback, 'Firebase 設定已儲存！頁面將在3秒後重新載入...', 'success');
        setTimeout(() => window.location.reload(), 3000);
    } else {
        showFeedback(DOM.configFeedback, `設定失敗: ${result.error}`, 'error');
    }
}

// --- Manage Questions ---
async function loadAllQuestions() {
    DOM.questionsList.innerHTML = '<p>正在載入題目...</p>';
    try {
        let allQuestions = [];
        if (isFirebaseMode) {
            const { db } = getFirebaseInstances();
            const querySnapshot = await db.collection('toeic_questions').get();
            querySnapshot.forEach(doc => allQuestions.push({docId: doc.id, ...doc.data()}));
        } else {
            allQuestions = Object.values(mockDatabase.toeic_questions);
        }
        renderQuestions(allQuestions);
    } catch (error) {
        DOM.questionsList.innerHTML = `<div class="alert alert-error">無法載入題目: ${error.message}</div>`;
    }
}

function renderQuestions(questions) {
    DOM.questionsList.innerHTML = '';
    if (!questions || questions.length === 0) {
        DOM.questionsList.innerHTML = '<p>資料庫中沒有題目。</p>';
        return;
    }
    
    // Group questions by type for rendering
    const grouped = questions.reduce((acc, q) => {
        (acc[q.questionType] = acc[q.questionType] || []).push(q);
        return acc;
    }, {});
    
    for (const type in grouped) {
        const typeContainer = document.createElement('div');
        typeContainer.innerHTML = `<h3 style="margin-top: 20px; margin-bottom: 10px; border-bottom: 2px solid #667eea; padding-bottom: 5px;">${type.charAt(0).toUpperCase() + type.slice(1)}</h3>`;
        
        grouped[type].forEach(question => {
            const card = document.createElement('div');
            card.style.cssText = "background: #f8f9fa; border-radius: 8px; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;";
            card.innerHTML = `
                <div style="flex-grow: 1;">
                    <strong>ID: ${question.id}</strong>
                    <p style="margin: 5px 0;">${question.question || 'Passage-based question'}</p>
                </div>
                <div>
                    <button class="btn btn-warning btn-edit-question" data-id="${question.id}" style="padding: 5px 10px; font-size: 0.8em; margin-right: 5px;">編輯</button>
                    <button class="btn btn-danger btn-delete-question" data-id="${question.id}" style="padding: 5px 10px; font-size: 0.8em;">刪除</button>
                </div>
            `;
            typeContainer.appendChild(card);
        });
        DOM.questionsList.appendChild(typeContainer);
    }
}

async function deleteQuestion(id) {
    if (!confirm(`確定要刪除題目 ID: ${id} 嗎？此操作無法復原。`)) return;

    try {
        if (isFirebaseMode) {
            const { db } = getFirebaseInstances();
            await db.collection('toeic_questions').doc(id).delete();
        } else {
            delete mockDatabase.toeic_questions[id];
        }
        alert('刪除成功！');
        loadAllQuestions(); // Refresh list
    } catch (error) {
        alert(`刪除失敗: ${error.message}`);
    }
}

async function handleQuestionAction(e) {
    const editBtn = e.target.closest('.btn-edit-question');
    const deleteBtn = e.target.closest('.btn-delete-question');

    if (editBtn) {
        openEditModal(editBtn.dataset.id);
    }

    if (deleteBtn) {
        deleteQuestion(deleteBtn.dataset.id);
    }
}


// --- Question Editing ---
async function openEditModal(id) {
    showFeedback(DOM.editFeedback, '', 'hidden');
    let questionData;
    try {
        if (isFirebaseMode) {
            const { db } = getFirebaseInstances();
            const docSnap = await db.collection('toeic_questions').doc(id).get();
            if (!docSnap.exists) {
                alert('找不到該題目！');
                return;
            }
            questionData = docSnap.data();
        } else {
            questionData = mockDatabase.toeic_questions[id];
            if (!questionData) {
                 alert('找不到該題目！');
                 return;
            }
        }

        DOM.editingQuestionId.value = id;
        DOM.editJsonArea.value = JSON.stringify(questionData, null, 2); // Pretty print
        DOM.editModal.classList.remove('hidden');
    } catch (error) {
        alert(`Error opening edit modal: ${error.message}`);
    }
}

async function handleSaveEdit() {
    const id = DOM.editingQuestionId.value;
    const jsonString = DOM.editJsonArea.value;

    let updatedData;
    try {
        updatedData = JSON.parse(jsonString);
    } catch (e) {
        showFeedback(DOM.editFeedback, 'JSON 格式錯誤！', 'error');
        return;
    }
    
    if (updatedData.id !== id) {
        showFeedback(DOM.editFeedback, '無法變更題目 ID！請還原 ID 後再儲存。', 'error');
        return;
    }

    try {
        if (isFirebaseMode) {
            const { db } = getFirebaseInstances();
            await db.collection('toeic_questions').doc(id).set(updatedData);
        } else {
            mockDatabase.toeic_questions[id] = updatedData;
        }
        showFeedback(DOM.editFeedback, '儲存成功！', 'success');
        setTimeout(() => {
            DOM.editModal.classList.add('hidden');
            loadAllQuestions();
        }, 1500);
    } catch(error) {
        showFeedback(DOM.editFeedback, `儲存失敗: ${error.message}`, 'error');
    }
}

// --- User Records ---
async function loadUserRecords() {
    DOM.recordsList.innerHTML = '<p>正在載入使用者作答紀錄...</p>';
    try {
        let attempts = [];
        if (isFirebaseMode) {
            const { db } = getFirebaseInstances();
            const querySnapshot = await db.collection('quiz_attempts').orderBy('timestamp', 'desc').get();
            querySnapshot.forEach(doc => attempts.push({ id: doc.id, ...doc.data() }));
        } else {
            attempts = Object.entries(mockDatabase.quiz_attempts).map(([id, data]) => ({ id, ...data }));
        }
        renderUserRecords(attempts);
    } catch (error) {
        console.error("Error loading user records:", error);
        let errorMsg = `無法載入作答紀錄: ${error.message}`;
        if (error.code === 'permission-denied') {
            errorMsg = `無法載入作答紀錄: 權限不足。<br><strong>提示：</strong>請確認您已依照 README.md 的指示，在 Firebase 中正確設定了 'admins' 集合與您的管理員 UID。`;
        }
        DOM.recordsList.innerHTML = `<div class="alert alert-error">${errorMsg}</div>`;
    }
}

function renderUserRecords(attempts) {
    if (attempts.length === 0) {
        DOM.recordsList.innerHTML = '<p>尚無任何使用者作答紀錄。</p>';
        return;
    }

    let tableHTML = `
        <table class="records-table">
            <thead>
                <tr>
                    <th>測驗時間</th>
                    <th>使用者</th>
                    <th>分數</th>
                    <th>操作</th>
                </tr>
            </thead>
            <tbody>
    `;

    attempts.forEach(attempt => {
        const date = attempt.timestamp && attempt.timestamp.toDate ? attempt.timestamp.toDate().toLocaleString('zh-TW') : new Date(attempt.timestamp).toLocaleString('zh-TW');
        const score = `${attempt.score} / ${attempt.totalQuestions} (${((attempt.score / attempt.totalQuestions) * 100).toFixed(1)}%)`;
        tableHTML += `
            <tr>
                <td>${date}</td>
                <td>${attempt.userEmail}</td>
                <td>${score}</td>
                <td>
                    <button class="btn btn-secondary btn-print-record" data-id="${attempt.id}" style="padding: 5px 10px; font-size: 0.8em;">列印</button>
                    <button class="btn btn-danger btn-delete-record" data-id="${attempt.id}" style="padding: 5px 10px; font-size: 0.8em; margin-left: 5px;">刪除</button>
                </td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    DOM.recordsList.innerHTML = tableHTML;
}

async function handleRecordAction(e) {
    const printBtn = e.target.closest('.btn-print-record');
    const deleteBtn = e.target.closest('.btn-delete-record');

    if (printBtn) {
        const attemptId = printBtn.dataset.id;
        await printRecord(attemptId);
    }

    if (deleteBtn) {
        const attemptId = deleteBtn.dataset.id;
        if (confirm(`確定要刪除這筆作答紀錄 (${attemptId}) 嗎？此操作無法復原。`)) {
            try {
                if (isFirebaseMode) {
                    const { db } = getFirebaseInstances();
                    await db.collection('quiz_attempts').doc(attemptId).delete();
                } else {
                    delete mockDatabase.quiz_attempts[attemptId];
                }
                showFeedback(DOM.recordsFeedback, '紀錄刪除成功！', 'success');
                loadUserRecords(); // Refresh the list
            } catch (error) {
                let errorMsg = `刪除失敗: ${error.message}`;
                if (error.code === 'permission-denied') {
                    errorMsg = `刪除失敗: 權限不足。<br><strong>提示：</strong>請再次確認您已發佈最新的安全規則，並且 'admins' 集合設定正確。`;
                }
                showFeedback(DOM.recordsFeedback, errorMsg, 'error');
                console.error("Delete record failed:", error);
            }
        }
    }
}

async function printRecord(attemptId) {
    let attempt;
    try {
        if (isFirebaseMode) {
            const { db } = getFirebaseInstances();
            const docSnap = await db.collection('quiz_attempts').doc(attemptId).get();
            if (!docSnap.exists) {
                alert('找不到該筆紀錄');
                return;
            }
            attempt = docSnap.data();
        } else {
            attempt = mockDatabase.quiz_attempts[attemptId];
        }
        
        const date = attempt.timestamp && attempt.timestamp.toDate ? attempt.timestamp.toDate().toLocaleString('zh-TW') : new Date(attempt.timestamp).toLocaleString('zh-TW');
        const score = `${attempt.score} / ${attempt.totalQuestions} (${((attempt.score / attempt.totalQuestions) * 100).toFixed(1)}%)`;

        let reportHTML = `
            <html>
            <head>
                <title>測驗報告 - ${attempt.userEmail}</title>
                <style>
                    body { font-family: 'Arial', 'Microsoft JhengHei', sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 800px; margin: 20px auto; }
                    h1, h2 { border-bottom: 2px solid #ccc; padding-bottom: 5px; color: #2c3e50; }
                    .question-block { page-break-inside: avoid; margin-bottom: 20px; padding: 15px; border: 1px solid #eee; border-radius: 8px; }
                    .correct { background-color: #e8f5e9; border-left: 5px solid #4CAF50; }
                    .incorrect { background-color: #ffebee; border-left: 5px solid #f44336; }
                    .explanation { font-style: italic; background-color: #f5f5f5; padding: 10px; margin-top: 10px; border-radius: 5px; }
                    .passage { white-space: pre-wrap; background:#fafafa; padding: 10px; border-radius: 5px; margin-bottom: 10px; }
                    ul { list-style-type: none; padding-left: 0; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>TOEIC 測驗報告</h1>
                    <h2>測驗資訊</h2>
                    <p><strong>使用者:</strong> ${attempt.userEmail}</p>
                    <p><strong>測驗時間:</strong> ${date}</p>
                    <p><strong>最終分數:</strong> ${score}</p>
                    <hr>
                    <h2>答案詳解</h2>
        `;

        (attempt.questions || []).forEach((q, index) => {
            const userAnswerIndex = attempt.userAnswers[index];
            const isCorrect = userAnswerIndex === q.correct;
            const resultClass = isCorrect ? 'correct' : 'incorrect';
            
            reportHTML += `
                <div class="question-block ${resultClass}">
                    <p><strong>Q${index + 1}: ${q.displayQuestion || q.question}</strong></p>
                    ${q.passage ? `<div class="passage">${q.passage}</div>` : ''}
                    <ul>
                        ${q.options.map((opt, i) => `<li>${String.fromCharCode(65 + i)}. ${opt}</li>`).join('')}
                    </ul>
                    <p>您的答案: <strong>${userAnswerIndex > -1 ? String.fromCharCode(65 + userAnswerIndex) : '未作答'}</strong></p>
                    <p>正確答案: <strong>${String.fromCharCode(65 + q.correct)}</strong></p>
                    ${q.explanation ? `<div class="explanation"><strong>詳解:</strong> ${q.explanation}</div>` : ''}
                </div>
            `;
        });

        reportHTML += '</div></body></html>';
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(reportHTML);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.close();
        }, 500);

    } catch (error) {
        alert(`無法生成報告: ${error.message}`);
        console.error("Print record failed:", error);
    }
}