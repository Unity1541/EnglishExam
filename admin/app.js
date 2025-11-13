/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getFirebaseInstances } from '../firebase-config.js';

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
    testTimeInput: document.getElementById('testTime'),
    saveTestTimeBtn: document.getElementById('saveTestTimeBtn'),
    settingsFeedback: document.getElementById('settings-feedback'),
    questionTypeSelector: document.getElementById('question-type-selector'),
    jsonInputArea: document.getElementById('json-input-area'),
    submitQuestionBtn: document.getElementById('submit-question-btn'),
    addQuestionFeedback: document.getElementById('add-question-feedback'),
    firebaseModeInfoPanel: document.getElementById('firebase-mode-info-panel'),
    manageActions: document.getElementById('manage-actions'),
    deleteSelectedBtn: document.getElementById('delete-selected-btn'),
    selectAllCheckbox: document.getElementById('select-all-checkbox'),
    // Edit Modal
    editModal: document.getElementById('edit-question-modal'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    editJsonArea: document.getElementById('edit-json-area'),
    saveEditBtn: document.getElementById('save-edit-btn'),
    editingQuestionId: document.getElementById('editing-question-id'),
    editFeedback: document.getElementById('edit-feedback'),
    formatSupBtn: document.getElementById('format-sup-btn'),
    formatSubBtn: document.getElementById('format-sub-btn'),
};

// --- Main App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Event Listeners
    DOM.loginBtn.addEventListener('click', handleLogin);
    DOM.logoutBtn.addEventListener('click', handleLogout);
    DOM.saveTestTimeBtn.addEventListener('click', saveTestTime);
    DOM.submitQuestionBtn.addEventListener('click', handleAddQuestion);
    DOM.questionTypeSelector.addEventListener('change', handleTemplateSelection);
    DOM.closeModalBtn.addEventListener('click', () => DOM.editModal.classList.add('hidden'));
    DOM.saveEditBtn.addEventListener('click', handleSaveEdit);
    DOM.recordsList.addEventListener('click', handleRecordAction);
    DOM.questionsList.addEventListener('click', handleQuestionAction);
    DOM.deleteSelectedBtn.addEventListener('click', handleDeleteSelected);
    DOM.selectAllCheckbox.addEventListener('change', handleSelectAll);
    DOM.formatSupBtn.addEventListener('click', () => formatTextInTextarea(DOM.editJsonArea, 'sup'));
    DOM.formatSubBtn.addEventListener('click', () => formatTextInTextarea(DOM.editJsonArea, 'sub'));

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
    
    // Initial state setup based on successful Firebase initialization
    const { isConfigured } = getFirebaseInstances();
    if (isConfigured) {
        updateUIMode(true);
        listenForAuthState();
    } else {
        updateUIMode(false); // Default to Demo Mode
        console.warn("Firebase not configured. Running in Demo Mode. Please check firebase-credentials.js");
    }
});

function listenForAuthState() {
    const { auth } = getFirebaseInstances();
    auth.onAuthStateChanged(user => {
        if (user) {
            onLoginSuccess(user); // Pass the full user object
        } else {
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
        DOM.firebaseModeInfoPanel.classList.remove('hidden');
    } else {
        indicator.textContent = 'Demo Mode';
        indicator.className = 'demo-mode';
        document.getElementById('demo-info').classList.remove('hidden');
        document.getElementById('demo-mode-info-panel').classList.remove('hidden');
        DOM.firebaseModeInfoPanel.classList.add('hidden');
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
        if (isConfigured && auth.currentUser) {
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
        DOM.questionTypeSelector.value = '';
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

// --- Text Formatting ---
function formatTextInTextarea(textarea, tag) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    if (selectedText) {
        const newText = `<${tag}>${selectedText}</${tag}>`;
        textarea.value = textarea.value.substring(0, start) + newText + textarea.value.substring(end);
        
        // Adjust selection to be after the inserted text
        textarea.selectionStart = start + newText.length;
        textarea.selectionEnd = start + newText.length;
        textarea.focus();
    }
}

// --- Add Question ---
function handleTemplateSelection() {
    const selectedType = DOM.questionTypeSelector.value;
    if (!selectedType) {
        DOM.jsonInputArea.value = '';
        DOM.jsonInputArea.placeholder = '選擇類型後，範本將顯示於此。可貼上單一物件或物件陣列...';
        return;
    }

    // Map selector value to the <pre> element ID
    const exampleId = {
        vocabulary: 'vocab-example',
        grammar: 'grammar-example',
        cloze: 'cloze-example',
        reading: 'reading-example'
    }[selectedType];

    const exampleText = document.getElementById(exampleId)?.innerText || '';
    DOM.jsonInputArea.value = exampleText;
    DOM.jsonInputArea.focus();
}

async function handleAddQuestion() {
    const jsonString = DOM.jsonInputArea.value.trim();
    showFeedback(DOM.addQuestionFeedback, '', 'hidden');

    if (!jsonString) {
        showFeedback(DOM.addQuestionFeedback, 'JSON 內容不能為空', 'error');
        return;
    }

    let parsedData;
    try {
        parsedData = JSON.parse(jsonString);
    } catch (error) {
        showFeedback(DOM.addQuestionFeedback, `JSON 格式錯誤，請檢查您的輸入: ${error.message}`, 'error');
        return;
    }
    
    let questionsToAdd;
    if (Array.isArray(parsedData)) {
        questionsToAdd = parsedData;
    } else if (typeof parsedData === 'object' && parsedData !== null) {
        // Allow single object but wrap it in an array for consistent handling
        questionsToAdd = [parsedData]; 
    } else {
        showFeedback(DOM.addQuestionFeedback, '無效的 JSON 格式。請提供一個 JSON 物件或物件陣列。', 'error');
        return;
    }

    if (questionsToAdd.length === 0) {
        showFeedback(DOM.addQuestionFeedback, '提交的資料為空陣列，未新增任何題目。', 'error');
        return;
    }

    // Validate all questions before batching
    for (const q of questionsToAdd) {
        if (!q.id || !q.questionType) {
            showFeedback(DOM.addQuestionFeedback, `JSON 資料格式錯誤：其中一筆題目缺少 'id' 或 'questionType' 欄位。問題資料: ${JSON.stringify(q)}`, 'error');
            return;
        }
    }

    try {
        if (isFirebaseMode) {
            const { db } = getFirebaseInstances();
            const batch = db.batch();
            questionsToAdd.forEach(question => {
                const docRef = db.collection('toeic_questions').doc(question.id);
                batch.set(docRef, question);
            });
            await batch.commit();
        } else {
            // Demo mode
            questionsToAdd.forEach(question => {
                mockDatabase.toeic_questions[question.id] = question;
            });
        }
        showFeedback(DOM.addQuestionFeedback, `題目 (${questionsToAdd.length} 筆) 已成功新增！`, 'success');
        DOM.jsonInputArea.value = '';
        DOM.questionTypeSelector.value = '';
    } catch (error) {
        console.error("Error adding question(s):", error);
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
        DOM.manageActions.classList.add('hidden');
        return;
    }
    
    DOM.manageActions.classList.remove('hidden');
    DOM.selectAllCheckbox.checked = false;

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
                <div style="display: flex; align-items: center; gap: 15px; flex-grow: 1;">
                    <input type="checkbox" class="question-checkbox" data-id="${question.id}" style="transform: scale(1.5); flex-shrink: 0;">
                    <div style="flex-grow: 1;">
                        <strong>ID: ${question.id}</strong>
                        <p style="margin: 5px 0;">${question.question || 'Passage-based question'}</p>
                    </div>
                </div>
                <div style="flex-shrink: 0;">
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

function handleSelectAll(e) {
    const isChecked = e.target.checked;
    DOM.questionsList.querySelectorAll('.question-checkbox').forEach(checkbox => {
        checkbox.checked = isChecked;
    });
}

async function handleDeleteSelected() {
    const selectedCheckboxes = DOM.questionsList.querySelectorAll('.question-checkbox:checked');
    const idsToDelete = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);

    if (idsToDelete.length === 0) {
        alert('請先選取要刪除的題目。');
        return;
    }

    if (!confirm(`確定要刪除選取的 ${idsToDelete.length} 筆題目嗎？此操作無法復原。`)) return;

    try {
        if (isFirebaseMode) {
            const { db } = getFirebaseInstances();
            const batch = db.batch();
            idsToDelete.forEach(id => {
                const docRef = db.collection('toeic_questions').doc(id);
                batch.delete(docRef);
            });
            await batch.commit();
        } else {
            idsToDelete.forEach(id => {
                delete mockDatabase.toeic_questions[id];
            });
        }
        alert('選取的題目已成功刪除！');
        loadAllQuestions(); // Refresh list
    } catch (error) {
        alert(`刪除失敗: ${error.message}`);
        console.error("Batch delete failed:", error);
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
            const adminUID = currentUser ? currentUser.uid : '無法取得，請重新登入';
            const adminEmail = currentUser ? currentUser.email : 'N/A';
            errorMsg = `
                <div style="text-align: left;">
                    <strong style="color: #c0392b; font-size: 1.2em;">❌ 權限不足 (Permission Denied)</strong>
                    <p style="margin-top: 10px;">您目前登入的帳號 <strong>(${adminEmail})</strong> 未被授權為管理員，因此無法檢視使用者紀錄。</p>
                    <p>請依照以下步驟，在您的 Firebase 專案中將此帳號設為管理員：</p>
                    <ol style="margin-top: 15px; padding-left: 20px; line-height: 1.8;">
                        <li>前往您的 <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer">Firebase 控制台</a>，並進入 Cloud Firestore 資料庫。</li>
                        <li>確認您有一個名為 <code>admins</code> 的集合 (collection)。如果沒有，請建立它。</li>
                        <li>在 <code>admins</code> 集合中，點擊「新增文件」(Add document)。</li>
                        <li>在「文件 ID」(Document ID) 欄位中，貼上您目前帳號的 User UID：
                            <div style="background: #f4f4f4; padding: 8px; border-radius: 4px; margin: 8px 0; font-family: monospace; user-select: all; word-break: break-all;">${adminUID}</div>
                        </li>
                        <li>為此文件新增一個欄位 (field)：
                            <ul style="list-style-type: none; padding-left: 15px; margin-top: 5px;">
                                <li><strong>欄位名稱 (Field name):</strong> <code>role</code></li>
                                <li><strong>欄位類型 (Field type):</strong> <code>string</code></li>
                                <li><strong>欄位值 (Field value):</strong> <code>admin</code></li>
                            </ul>
                        </li>
                        <li>點擊「儲存」(Save)。</li>
                    </ol>
                    <p style="margin-top: 15px;">完成上述設定後，請<strong>重新整理此頁面</strong>。</p>
                </div>
            `;
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