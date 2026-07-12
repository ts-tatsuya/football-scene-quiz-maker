let currentIdx = 0;
let originalImg = null;
let humanMaskImg = null;
let ballMaskImg = null;
let silhouettesOn = true;
let quizData = null;
let answeredResults = [];

const AUDIO_BASE = '/static/audio/';

function playSound(name) {
    const a = new Audio(AUDIO_BASE + name);
    a.volume = 0.5;
    a.play().catch(() => {});
}

const canvas = document.getElementById('quizCanvas');
const ctx = canvas.getContext('2d');

// Read mask colors and opacity from CSS custom properties
const HUMAN_MASK_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--human-mask-color').trim() || '#ff4444';
const BALL_MASK_COLOR = getComputedStyle(document.documentElement).getPropertyValue('--ball-mask-color').trim() || '#00ffff';
const MASK_OPACITY = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mask-opacity')) || 0.6;

// Load a question by index: render image + masks, build answer fields
function loadQuestion(idx) {
    const q = quizData.questions[idx];
    document.getElementById('progress').textContent = `Question ${idx + 1} of ${quizData.questions.length}`;
    document.getElementById('questionText').textContent = q.question_text || '';
    document.getElementById('fieldsContainer').innerHTML = '';
    document.getElementById('confirmBtn').disabled = false;
    document.getElementById('confirmBtn').style.display = '';
    document.getElementById('nextBtn').style.display = 'none';
    document.getElementById('seeResultBtn').style.display = 'none';
    silhouettesOn = true;
    playSound('question.mp3');

    originalImg = new Image();
    humanMaskImg = new Image();
    ballMaskImg = new Image();

    Promise.all([
        new Promise(r => { originalImg.onload = r; originalImg.src = q.image_data; }),
        new Promise(r => { humanMaskImg.onload = r; humanMaskImg.src = q.human_mask_data; }),
        new Promise(r => { ballMaskImg.onload = r; ballMaskImg.src = q.ball_mask_data; })
    ]).then(() => renderComposite());

    q.fields.forEach((f, i) => {
        const row = document.createElement('div');
        row.className = 'field-row';
        row.innerHTML = `
            <label>${f.label}</label>
            <input type="text" id="answer-${i}" placeholder="Your answer">
            <span class="result" id="result-${i}"></span>
        `;
        document.getElementById('fieldsContainer').appendChild(row);
    });
}

// Draw the original image with silhouette overlays onto the canvas
function renderComposite() {
    if (!originalImg || !humanMaskImg || !ballMaskImg) return;
    canvas.width = originalImg.naturalWidth;
    canvas.height = originalImg.naturalHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImg, 0, 0);

    if (silhouettesOn) {
        drawTintedMask(humanMaskImg, HUMAN_MASK_COLOR, MASK_OPACITY);
        drawTintedMask(ballMaskImg, BALL_MASK_COLOR, MASK_OPACITY);
    }
}

// Draw a white mask image tinted with a specific color and transparency
function drawTintedMask(maskImg, color, alpha) {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
    tempCtx.globalCompositeOperation = 'source-in';
    tempCtx.fillStyle = color;
    tempCtx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalAlpha = alpha;
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.globalAlpha = 1.0;
}

// Check the user's answers against correct answers, show results, reveal next/see-result button
function confirmAnswer() {
    const q = quizData.questions[currentIdx];
    const answers = [];
    q.fields.forEach((f, i) => {
        const input = document.getElementById(`answer-${i}`);
        answers.push(input ? input.value : '');
    });

    const results = q.fields.map((f, i) => {
        const userAns = (answers[i] || '').trim().toLowerCase();
        const correctAns = f.correct_answer.trim().toLowerCase();
        return {
            label: f.label,
            user_answer: answers[i] || '',
            correct: userAns === correctAns,
            correct_answer: f.correct_answer
        };
    });

    answeredResults[currentIdx] = results;

    const allCorrect = results.every(r => r.correct);
    playSound(allCorrect ? 'correct.mp3' : 'fail.mp3');

    silhouettesOn = false;
    renderComposite();
    document.getElementById('confirmBtn').disabled = true;

    results.forEach((r, i) => {
        const el = document.getElementById(`result-${i}`);
        el.textContent = r.correct ? 'Correct' : `Wrong (${r.correct_answer})`;
        el.className = 'result ' + (r.correct ? 'correct' : 'wrong');
    });

    if (currentIdx < quizData.questions.length - 1) {
        document.getElementById('nextBtn').style.display = '';
    } else {
        document.getElementById('seeResultBtn').style.display = '';
    }
}

// Advance to the next question
function nextQuestion() {
    if (currentIdx < quizData.questions.length - 1) {
        currentIdx++;
        loadQuestion(currentIdx);
    }
}

// Hide the quiz interface and render the results summary with scoring
function showResults() {
    document.getElementById('quizContainer').style.display = 'none';
    const rc = document.getElementById('resultContainer');
    rc.style.display = '';

    let totalPoints = 0;
    const qCount = quizData.questions.length;

    // Calculate points for a single question: 1 all correct, 0.5 partial, 0.25 answer exists but wrong field, 0 nothing
    function questionPoints(qr) {
        const correctCount = qr.filter(r => r.correct).length;
        if (correctCount === qr.length) return 1;
        if (correctCount > 0) return 0.5;
        const userAnswers = qr.map(r => r.user_answer.trim().toLowerCase()).filter(Boolean);
        const correctAnswers = qr.map(r => r.correct_answer.trim().toLowerCase());
        const exists = userAnswers.some(ua => correctAnswers.includes(ua));
        return exists ? 0.25 : 0;
    }

    answeredResults.forEach(qr => { totalPoints += questionPoints(qr); });

    const pct = qCount > 0 ? Math.round(totalPoints / qCount * 100) : 0;

    let html = `
        <a href="/" class="back">&larr; Back</a>
        <h1>${quizData.title}</h1>
        <div class="score">${pct}%</div>
        <div class="result-list">
    `;

    quizData.questions.forEach((q, qi) => {
        const qr = answeredResults[qi] || [];
        html += `
            <div class="result-question">
                <h3>Question ${qi + 1}</h3>
                <p class="result-question-text">${q.question_text || ''}</p>
        `;
        qr.forEach(r => {
            html += `
                <div class="field-row">
                    <label>${r.label}</label>
                    <span>Your answer: ${r.user_answer || '(empty)'}</span>
                    <span class="result ${r.correct ? 'correct' : 'wrong'}">${r.correct ? 'Correct' : 'Wrong'}</span>
                </div>
            `;
        });
        html += '</div>';
    });

    html += '</div><br><a href="/" class="btn">Back to Home</a>';
    rc.innerHTML = html;
}

// On page load: load quiz data from localStorage and start at question 0
document.addEventListener('DOMContentLoaded', () => {
    const quizId = document.getElementById('playScript').dataset.quizId;
    const stored = localStorage.getItem('quiz_' + quizId);
    if (!stored) {
        document.querySelector('#quizContainer').innerHTML = '<div class="not-found"><h2>Quiz not found</h2><p>Please import it from the home page first.</p><br><a href="/" class="btn">Back to Home</a></div>';
        return;
    }
    quizData = JSON.parse(stored);
    document.getElementById('quizTitle').textContent = quizData.title;
    document.title = quizData.title;
    loadQuestion(0);
});
