let questionCount = 0;

// Add a new empty question card to the form
function addQuestion() {
    const container = document.getElementById('questionsContainer');
    const idx = questionCount++;
    const div = document.createElement('div');
    div.className = 'question-card';
    div.id = `question-${idx}`;
    div.innerHTML = `
        <button class="remove-question" onclick="removeQuestion(${idx})">Remove</button>
        <h3>Question ${idx + 1}</h3>
        <div class="upload-area" id="upload-${idx}" onclick="document.getElementById('file-${idx}').click()">
            <input type="file" id="file-${idx}" accept="image/*" onchange="uploadImage(${idx}, this)">
            <div class="hint" id="hint-${idx}">Click to upload image</div>
            <img class="preview" id="preview-${idx}">
        </div>
        <input type="text" class="question-text" placeholder="Question text (e.g. Who scored the goal?)">
        <div id="fields-${idx}">
            <div class="field-row">
                <input type="text" placeholder="Label (e.g. Team A)" class="field-label">
                <input type="text" placeholder="Correct answer" class="field-answer">
                <button class="remove" onclick="this.parentElement.remove()">X</button>
            </div>
        </div>
        <button class="btn-secondary" onclick="addField(${idx})">+ Add Answer Field</button>
    `;
    container.appendChild(div);
}

// Add an answer field row to a specific question
function addField(qIdx) {
    const container = document.getElementById(`fields-${qIdx}`);
    const row = document.createElement('div');
    row.className = 'field-row';
    row.innerHTML = `
        <input type="text" placeholder="Label (e.g. Team A)" class="field-label">
        <input type="text" placeholder="Correct answer" class="field-answer">
        <button class="remove" onclick="this.parentElement.remove()">X</button>
    `;
    container.appendChild(row);
}

// Remove a question card from the form by its index
function removeQuestion(idx) {
    const el = document.getElementById(`question-${idx}`);
    if (el) el.remove();
}

// Upload the selected image to the server and store the returned data URLs on the card
function uploadImage(idx, input) {
    if (!input.files.length) return;
    const file = input.files[0];
    const formData = new FormData();
    formData.append('file', file);

    const preview = document.getElementById(`preview-${idx}`);
    const hint = document.getElementById(`hint-${idx}`);
    const card = document.getElementById(`question-${idx}`);

    const reader = new FileReader();
    reader.onload = (e) => {
        preview.src = e.target.result;
        preview.classList.add('visible');
        hint.textContent = 'Uploading...';
    };
    reader.readAsDataURL(file);

    fetch('/api/upload-image', { method: 'POST', body: formData })
        .then(r => r.json())
        .then(data => {
            card.dataset.imageData = data.image_data;
            card.dataset.humanMaskData = data.human_mask_data;
            card.dataset.ballMaskData = data.ball_mask_data;
            hint.textContent = 'Image uploaded';
        });
}

// Collect and validate all form data (title, questions, images, answers) into an object
function collectQuizData() {
    const title = document.getElementById('quizTitle').value.trim();
    if (!title) { alert('Enter a quiz title'); return null; }

    const cards = document.querySelectorAll('.question-card');
    const questions = [];
    let valid = true;

    cards.forEach(card => {
        const questionText = card.querySelector('.question-text').value.trim();

        const imageData = card.dataset.imageData;
        const humanMaskData = card.dataset.humanMaskData;
        const ballMaskData = card.dataset.ballMaskData;
        if (!imageData) { valid = false; return; }

        const fields = [];
        const labels = card.querySelectorAll('.field-label');
        const answers = card.querySelectorAll('.field-answer');
        labels.forEach((l, i) => {
            if (l.value.trim() && answers[i].value.trim()) {
                fields.push({ label: l.value.trim(), correct_answer: answers[i].value.trim() });
            }
        });
        if (fields.length === 0) { valid = false; return; }

        questions.push({
            question_text: questionText,
            fields,
            image_data: imageData,
            human_mask_data: humanMaskData,
            ball_mask_data: ballMaskData
        });
    });

    if (!valid) { alert('Each question needs text, an image, and at least one answer field.'); return null; }
    if (questions.length === 0) { alert('Add at least one question.'); return null; }

    return { title, questions };
}

// Save the quiz to localStorage with all image data URLs embedded
function saveQuiz() {
    const data = collectQuizData();
    if (!data) return;

    const id = Math.random().toString(36).slice(2, 14);
    const quizData = {
        id,
        title: data.title,
        questions: data.questions.map((q, i) => ({
            question_text: q.question_text,
            image: `img_${i}.jpg`,
            human_mask: `human_${i}.png`,
            ball_mask: `ball_${i}.png`,
            fields: q.fields,
            image_data: q.image_data,
            human_mask_data: q.human_mask_data,
            ball_mask_data: q.ball_mask_data
        }))
    };

    try {
        localStorage.setItem('quiz_' + id, JSON.stringify(quizData));
    } catch (e) {
        alert('Storage full! Please remove some quizzes before saving.');
        return;
    }

    const index = JSON.parse(localStorage.getItem('quiz_index') || '[]');
    index.push({ id, title: quizData.title, question_count: quizData.questions.length, import_date: new Date().toLocaleDateString() });
    localStorage.setItem('quiz_index', JSON.stringify(index));

    window.location.href = '/';
}

// Export the quiz as a .fsq file download using client-side JSZip
async function exportQuiz() {
    const data = collectQuizData();
    if (!data) return;

    const zip = new JSZip();
    const id = Math.random().toString(36).slice(2, 14);

    const questions = data.questions.map((q, i) => ({
        question_text: q.question_text,
        image: `img_${i}.jpg`,
        human_mask: `human_${i}.png`,
        ball_mask: `ball_${i}.png`,
        fields: q.fields
    }));

    zip.file('quiz.json', JSON.stringify({ id, title: data.title, questions }, null, 2));

    data.questions.forEach((q, i) => {
        zip.file(`img_${i}.jpg`, dataURLToBlob(q.image_data));
        zip.file(`human_${i}.png`, dataURLToBlob(q.human_mask_data));
        zip.file(`ball_${i}.png`, dataURLToBlob(q.ball_mask_data));
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = data.title.replace(/[^a-zA-Z0-9_]/g, '_') + '.fsq';
    a.click();
    URL.revokeObjectURL(url);
}

// Convert a base64 data URL string to a Blob object
function dataURLToBlob(dataURL) {
    const parts = dataURL.split(',');
    const mime = parts[0].match(/:(.*?);/)[1];
    const bstr = atob(parts[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
        u8arr[i] = bstr.charCodeAt(i);
    }
    return new Blob([u8arr], { type: mime });
}
