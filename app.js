/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getFirebaseInstances } from './firebase-config.js';

// --- State Management ---
let quizState = {
    questions: [],
    currentQuestionIndex: 0,
    userAnswers: [],
    score: 0,
    timer: null,
    timeRemaining: 0,
    testDuration: 120, // Default
    currentUser: null,
    currentAttemptId: null, // To store the ID of the quiz attempt being reviewed
};

// --- DOM Elements ---
const DOM = {
    appContainer: document.getElementById('app-container'),
    loginScreen: document.getElementById('login-screen'),
    loginBtn: document.getElementById('login-btn'),
    emailInput: document.getElementById('email'),
    passwordInput: document.getElementById('password'),
    loginError: document.getElementById('login-error'),
    userInfo: document.getElementById('user-info'),
    userEmail: document.getElementById('user-email'),
    logoutBtn: document.getElementById('logout-btn'),
    startScreen: document.getElementById('start-screen'),
    loadingMessage: document.getElementById('loading-message'),
    errorMessage: document.getElementById('error-message'),
    startContent: document.getElementById('start-content'),
    startBtn: document.getElementById('start-btn'),
    restartBtn: document.getElementById('restart-btn'),
    testDurationSpan: document.getElementById('test-duration'),
    totalQuestionsSpan: document.getElementById('total-questions'),
    historyList: document.getElementById('history-list'),
    personalBestList: document.getElementById('personal-best-list'),
    quizScreen: document.getElementById('quiz-screen'),
    questionCounter: document.getElementById('question-counter'),
    timerDisplay: document.getElementById('timer'),
    questionPassage: document.getElementById('question-passage'),
    questionText: document.getElementById('question-text'),
    optionsList: document.getElementById('options-list'),
    nextBtn: document.getElementById('next-btn'),
    resultsScreen: document.getElementById('results-screen'),
    scoreDisplay: document.getElementById('score'),
    scoreDetails: document.getElementById('score-details'),
    reviewBtn: document.getElementById('review-btn'),
    reviewScreen: document.getElementById('review-screen'),
    reviewContent: document.getElementById('review-content'),
    backToStartBtn: document.getElementById('back-to-start-btn'),
};

// --- Main App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Event Listeners
    DOM.loginBtn.addEventListener('click', handleLogin);
    DOM.logoutBtn.addEventListener('click', handleLogout);
    DOM.startBtn.addEventListener('click', startQuiz);
    DOM.nextBtn.addEventListener('click', handleNextQuestion);
    DOM.reviewBtn.addEventListener('click', showReviewScreen);
    DOM.restartBtn.addEventListener('click', resetToStartScreen);
    DOM.backToStartBtn.addEventListener('click', resetToStartScreen);

    const { isConfigured } = getFirebaseInstances();
    if (isConfigured) {
        listenForAuthState();
    } else {
        // Show login screen but with a persistent error
        DOM.loginScreen.classList.remove('hidden');
        showLoginError('Firebase尚未由管理員設定，或設定檔(firebase-credentials.js)錯誤，無法啟動測驗。');
        DOM.loginBtn.disabled = true;
    }
});

function listenForAuthState() {
    const { auth } = getFirebaseInstances();
    if (!auth) {
        showLoginError('Firebase Auth 服務初始化失敗。');
        return;
    }
    auth.onAuthStateChanged(user => {
        if (user) {
            quizState.currentUser = user;
            onLoginSuccess();
        } else {
            quizState.currentUser = null;
            onLogout();
        }
    });
}

// --- Authentication Flow ---
async function handleLogin() {
    const email = DOM.emailInput.value;
    const password = DOM.passwordInput.value;
    const { auth } = getFirebaseInstances();
    DOM.loginError.classList.add('hidden');
    try {
        await auth.signInWithEmailAndPassword(email, password);
        // onAuthStateChanged will handle the UI update
    } catch (error) {
        showLoginError('登入失敗，請檢查您的帳號或密碼。');
        console.error("Login failed:", error);
    }
}

function showLoginError(message) {
    DOM.loginError.textContent = message;
    DOM.loginError.classList.remove('hidden');
}

async function handleLogout() {
    const { auth } = getFirebaseInstances();
    await auth.signOut();
}

function onLoginSuccess() {
    DOM.loginScreen.classList.add('hidden');
    DOM.startScreen.classList.remove('hidden');
    DOM.userInfo.classList.remove('hidden');
    DOM.userEmail.textContent = quizState.currentUser.email;
    loadInitialData();
}

function onLogout() {
    // Clear timer if it's running
    if (quizState.timer) clearInterval(quizState.timer);
    
    // Reset UI to login state
    DOM.startScreen.classList.add('hidden');
    DOM.quizScreen.classList.add('hidden');
    DOM.resultsScreen.classList.add('hidden');
    DOM.reviewScreen.classList.add('hidden');
    DOM.userInfo.classList.add('hidden');
    DOM.loginScreen.classList.remove('hidden');
    
    // Clear form fields
    DOM.emailInput.value = '';
    DOM.passwordInput.value = '';
    DOM.loginError.classList.add('hidden');
}

async function loadInitialData() {
    const { db, isConfigured } = getFirebaseInstances();
    if (!isConfigured || !db) {
        showError('Firebase 連接失敗，請檢查管理後台的設定是否正確。');
        return;
    }

    DOM.startContent.classList.add('hidden');
    DOM.loadingMessage.classList.remove('hidden');
    DOM.errorMessage.classList.add('hidden');
    
    try {
        // Fetch test time
        const settingsDocRef = db.collection('settings').doc('config');
        const settingsDoc = await settingsDocRef.get();

        if (settingsDoc.exists) {
            quizState.testDuration = settingsDoc.data().testTimeMinutes;
            quizState.timeRemaining = quizState.testDuration * 60;
        } else {
             console.warn("Test settings not found. Using defaults.");
        }

        // Fetch all questions
        const questionsSnapshot = await db.collection('toeic_questions').get();
        if (questionsSnapshot.empty) {
            showError('題庫中沒有題目。請管理員先到後台新增題目。');
            return;
        }
        
        let allQuestions = [];
        questionsSnapshot.forEach(doc => allQuestions.push({ docId: doc.id, ...doc.data() }));

        quizState.questions = processQuestions(allQuestions);

        if (quizState.questions.length > 0) {
            await Promise.all([loadQuizHistory(), loadPersonalBests()]);
            showStartScreen();
        } else {
             showError('雖然找到題庫，但處理後沒有可用的題目。');
        }

    } catch (error) {
        console.error("Error loading initial data from Firestore:", error);
        showError(`載入資料時發生權限或網路錯誤: ${error.message}`);
    }
}

function processQuestions(rawQuestions) {
    // This function flattens reading/cloze questions into individual items
    let processed = [];
    rawQuestions.forEach(q => {
        if (q.questions && Array.isArray(q.questions)) {
            q.questions.forEach((subQ, index) => {
                processed.push({
                    ...subQ,
                    passage: q.passage,
                    mainId: q.id,
                    type: q.questionType,
                    displayQuestion: `${index + 1}. ${subQ.question}`
                });
            });
        } else {
            processed.push(q);
        }
    });
    return processed;
}

function showError(message) {
    DOM.loadingMessage.classList.add('hidden');
    DOM.errorMessage.classList.remove('hidden');
    DOM.errorMessage.querySelectorAll('p')[1].textContent = message;
}

function showStartScreen() {
    DOM.loadingMessage.classList.add('hidden');
    DOM.testDurationSpan.textContent = quizState.testDuration;
    DOM.totalQuestionsSpan.textContent = quizState.questions.length;
    DOM.startContent.classList.remove('hidden');
}

// --- Quiz History & Personal Bests ---
async function loadQuizHistory() {
    const { db } = getFirebaseInstances();
    DOM.historyList.innerHTML = '<li>正在載入紀錄...</li>';
    try {
        // Fetch all attempts for the user; sorting will be done client-side.
        const querySnapshot = await db.collection('quiz_attempts')
            .where('userId', '==', quizState.currentUser.uid)
            .get();

        if (querySnapshot.empty) {
            DOM.historyList.innerHTML = '<li>尚無測驗紀錄。</li>';
            return;
        }
        
        // Process results on the client side
        const attempts = [];
        querySnapshot.forEach(doc => attempts.push({ id: doc.id, ...doc.data() }));
        
        // Sort by timestamp descending
        attempts.sort((a, b) => {
            const dateA = a.timestamp ? a.timestamp.toDate() : new Date(0);
            const dateB = b.timestamp ? b.timestamp.toDate() : new Date(0);
            return dateB - dateA;
        });

        const latestAttempts = attempts.slice(0, 10);

        DOM.historyList.innerHTML = '';
        latestAttempts.forEach(attempt => {
            const li = document.createElement('li');
            const date = attempt.timestamp.toDate().toLocaleString('zh-TW');
            
            li.innerHTML = `
                <span>${date} - <strong>${attempt.scorePercentage.toFixed(1)}%</strong> (${attempt.score}/${attempt.totalQuestions})</span>
                <button class="btn-secondary" style="font-size: 0.8em; padding: 5px 10px;">回顧</button>
            `;
            li.querySelector('button').addEventListener('click', () => {
                quizState.currentAttemptId = attempt.id;
                showReviewScreen();
            });
            DOM.historyList.appendChild(li);
        });
    } catch (error) {
        console.error("Error loading quiz history:", error);
        DOM.historyList.innerHTML = `<li>無法載入作答紀錄。資料庫索引尚未設定，請聯繫管理員。</li>`;
    }
}

async function loadPersonalBests() {
    const { db } = getFirebaseInstances();
    DOM.personalBestList.innerHTML = '<li>正在載入最佳紀錄...</li>';
    try {
        // Fetch all attempts for the user; sorting will be done client-side.
        const querySnapshot = await db.collection('quiz_attempts')
            .where('userId', '==', quizState.currentUser.uid)
            .get();

        if (querySnapshot.empty) {
            DOM.personalBestList.innerHTML = '<li>尚無個人紀錄。</li>';
            return;
        }

        // Process results on the client side
        const attempts = [];
        querySnapshot.forEach(doc => attempts.push(doc.data()));

        // Sort by score percentage descending
        attempts.sort((a, b) => b.scorePercentage - a.scorePercentage);

        const bestAttempts = attempts.slice(0, 5);

        DOM.personalBestList.innerHTML = '';
        bestAttempts.forEach(attempt => {
            const li = document.createElement('li');
            const date = attempt.timestamp.toDate().toLocaleDateString('zh-TW');
            li.innerHTML = `
                <span>${date}</span>
                <strong>${attempt.scorePercentage.toFixed(1)}%</strong>
            `;
            DOM.personalBestList.appendChild(li);
        });
    } catch (error) {
        console.error("Error loading personal bests:", error);
        DOM.personalBestList.innerHTML = `<li>無法載入最佳紀錄。資料庫索引尚未設定，請聯繫管理員。</li>`;
    }
}


// --- Quiz Flow ---

function startQuiz() {
    // Reset state for a new quiz
    quizState.currentQuestionIndex = 0;
    quizState.userAnswers = [];
    quizState.score = 0;
    quizState.timeRemaining = quizState.testDuration * 60;
    quizState.currentAttemptId = null;

    DOM.startScreen.classList.add('hidden');
    DOM.quizScreen.classList.remove('hidden');
    startTimer();
    displayQuestion();
}

function startTimer() {
    if (quizState.timer) clearInterval(quizState.timer);
    updateTimerDisplay();
    quizState.timer = setInterval(() => {
        quizState.timeRemaining--;
        updateTimerDisplay();
        if (quizState.timeRemaining <= 0) {
            clearInterval(quizState.timer);
            finishQuiz();
        }
    }, 1000);
}

function updateTimerDisplay() {
    const minutes = Math.floor(quizState.timeRemaining / 60);
    const seconds = quizState.timeRemaining % 60;
    DOM.timerDisplay.textContent = `Time: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function displayQuestion() {
    const question = quizState.questions[quizState.currentQuestionIndex];
    
    DOM.questionCounter.textContent = `Question ${quizState.currentQuestionIndex + 1} / ${quizState.questions.length}`;

    if (question.passage) {
        DOM.questionPassage.textContent = question.passage;
        DOM.questionPassage.classList.remove('hidden');
    } else {
        DOM.questionPassage.classList.add('hidden');
    }
    
    DOM.questionText.textContent = question.displayQuestion || question.question;

    DOM.optionsList.innerHTML = '';
    question.options.forEach((option, index) => {
        const li = document.createElement('li');
        li.innerHTML = `
            <input type="radio" name="option" id="option${index}" value="${index}">
            <label for="option${index}">${option}</label>
        `;
        DOM.optionsList.appendChild(li);
    });

    DOM.nextBtn.textContent = (quizState.currentQuestionIndex === quizState.questions.length - 1) ? '完成測驗' : '下一題';
}

function handleNextQuestion() {
    const selectedOption = document.querySelector('input[name="option"]:checked');
    const answer = selectedOption ? parseInt(selectedOption.value) : -1;
    quizState.userAnswers.push(answer);

    if (quizState.currentQuestionIndex < quizState.questions.length - 1) {
        quizState.currentQuestionIndex++;
        displayQuestion();
    } else {
        finishQuiz();
    }
}

async function finishQuiz() {
    clearInterval(quizState.timer);
    calculateScore();
    await saveQuizAttempt();
    showResults();
}

function calculateScore() {
    let correctAnswers = 0;
    quizState.questions.forEach((question, index) => {
        if (quizState.userAnswers[index] === question.correct) {
            correctAnswers++;
        }
    });
    quizState.score = correctAnswers;
}

async function saveQuizAttempt() {
    if (!quizState.currentUser) return; // Don't save if not logged in
    const { db } = getFirebaseInstances();
    const attempt = {
        userId: quizState.currentUser.uid,
        userEmail: quizState.currentUser.email,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        score: quizState.score,
        totalQuestions: quizState.questions.length,
        scorePercentage: (quizState.score / quizState.questions.length) * 100,
        userAnswers: quizState.userAnswers,
        questions: quizState.questions, // Store a snapshot of the questions
    };

    try {
        const docRef = await db.collection('quiz_attempts').add(attempt);
        quizState.currentAttemptId = docRef.id; // Save ID for immediate review
        console.log("Quiz attempt saved with ID:", docRef.id);
    } catch (error) {
        console.error("Error saving quiz attempt:", error);
    }
}

function showResults() {
    DOM.quizScreen.classList.add('hidden');
    DOM.resultsScreen.classList.remove('hidden');

    const percentage = (quizState.score / quizState.questions.length) * 100;
    DOM.scoreDisplay.textContent = `${percentage.toFixed(1)}%`;
    DOM.scoreDetails.textContent = `您答對了 ${quizState.score} 題，共 ${quizState.questions.length} 題。`;
}

// --- Review Screen ---
async function showReviewScreen() {
    if (!quizState.currentAttemptId) return;
    
    const { db } = getFirebaseInstances();
    DOM.reviewContent.innerHTML = '<p>正在載入答案詳解...</p>';

    try {
        const attemptDoc = await db.collection('quiz_attempts').doc(quizState.currentAttemptId).get();
        if (!attemptDoc.exists) {
            DOM.reviewContent.innerHTML = '<p>找不到此測驗紀錄。</p>';
            return;
        }
        
        const attemptData = attemptDoc.data();
        renderReview(attemptData);
        
        // Hide other screens
        DOM.startScreen.classList.add('hidden');
        DOM.resultsScreen.classList.add('hidden');
        DOM.reviewScreen.classList.remove('hidden');

    } catch (error) {
        console.error("Error fetching attempt for review:", error);
        DOM.reviewContent.innerHTML = '<p>載入詳解失敗。</p>';
    }
}

function renderReview(attempt) {
    DOM.reviewContent.innerHTML = '';
    attempt.questions.forEach((q, index) => {
        const userAnswerIndex = attempt.userAnswers[index];
        const isCorrect = userAnswerIndex === q.correct;

        const reviewDiv = document.createElement('div');
        reviewDiv.className = `review-question ${isCorrect ? 'correct' : 'incorrect'}`;
        
        let optionsHtml = q.options.map((opt, i) => {
            let style = '';
            if (i === q.correct) style = 'font-weight: bold; color: var(--success);';
            if (i === userAnswerIndex && !isCorrect) style = 'text-decoration: line-through; color: var(--danger);';
            return `<li style="${style}">${String.fromCharCode(65 + i)}. ${opt}</li>`;
        }).join('');

        reviewDiv.innerHTML = `
            <h4>Q${index + 1}: ${q.displayQuestion || q.question}</h4>
            ${q.passage ? `<div class="passage" style="white-space: pre-wrap;">${q.passage}</div>` : ''}
            <ul style="list-style: none; padding-left: 10px;">${optionsHtml}</ul>
            <p>您的答案: <strong>${userAnswerIndex > -1 ? String.fromCharCode(65 + userAnswerIndex) : '未作答'}</strong> | 正確答案: <strong>${String.fromCharCode(65 + q.correct)}</strong></p>
            ${q.explanation ? `<div class="explanation"><strong>詳解:</strong> ${q.explanation}</div>` : ''}
        `;
        DOM.reviewContent.appendChild(reviewDiv);
    });
}

function resetToStartScreen() {
    DOM.resultsScreen.classList.add('hidden');
    DOM.reviewScreen.classList.add('hidden');
    DOM.startScreen.classList.remove('hidden');
    // Reload history and personal bests to show the latest attempt
    loadQuizHistory();
    loadPersonalBests();
}