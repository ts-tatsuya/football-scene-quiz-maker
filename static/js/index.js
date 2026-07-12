// Render the quiz list from localStorage onto the page
function loadQuizzes() {
    const list = document.getElementById('quizList');
    const index = JSON.parse(localStorage.getItem('quiz_index') || '[]');
    if (index.length === 0) {
        list.innerHTML = '<div class="empty">No quizzes yet. Create one or import a .fsq file!</div>';
        return;
    }
    list.innerHTML = index.map(q => `
        <div class="quiz-card">
            <div>
                <h3>${q.title}</h3>
                <div class="meta">${q.question_count} question(s) &middot; imported ${q.import_date}</div>
            </div>
            <div class="card-actions">
                <button class="btn-small-outline" onclick="exportQuiz('${q.id}')">Export</button>
                <button class="btn-small" onclick="removeQuiz('${q.id}')">Remove</button>
                <a href="/play/${q.id}" class="btn">Play</a>
            </div>
        </div>
    `).join('');
}

// Remove a quiz from localStorage by id
function removeQuiz(id) {
    if (!confirm('Remove this quiz from local storage?')) return;
    localStorage.removeItem('quiz_' + id);
    const index = JSON.parse(localStorage.getItem('quiz_index') || '[]');
    const filtered = index.filter(q => q.id !== id);
    localStorage.setItem('quiz_index', JSON.stringify(filtered));
    loadQuizzes();
}

// Export a quiz from localStorage as a .fsq file download
async function exportQuiz(id) {
    const stored = localStorage.getItem('quiz_' + id);
    if (!stored) return;
    const quizData = JSON.parse(stored);
    const zip = new JSZip();

    const exportData = {
        id: quizData.id,
        title: quizData.title,
        questions: quizData.questions.map(q => ({
            image: q.image,
            human_mask: q.human_mask,
            ball_mask: q.ball_mask,
            fields: q.fields
        }))
    };
    zip.file('quiz.json', JSON.stringify(exportData, null, 2));

    for (const q of quizData.questions) {
        for (const key of ['image', 'human_mask', 'ball_mask']) {
            const dataURL = q[key + '_data'];
            const fname = q[key];
            if (dataURL && fname) {
                zip.file(fname, dataURLToBlob(dataURL));
            }
        }
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = quizData.title.replace(/[^a-zA-Z0-9_]/g, '_') + '.fsq';
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

// Read a .fsq file, extract quiz data and images, save to localStorage
async function importQuiz(input) {
    const file = input.files[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.fsq')) {
        alert('Only .fsq files are allowed.');
        input.value = '';
        return;
    }
    try {
        const arrayBuffer = await file.arrayBuffer();
        const zip = await JSZip.loadAsync(arrayBuffer);
        const quizFile = zip.file('quiz.json');
        if (!quizFile) { alert('Invalid .fsq file: missing quiz.json'); return; }
        const quizData = JSON.parse(await quizFile.async('string'));

        for (const q of quizData.questions) {
            for (const key of ['image', 'human_mask', 'ball_mask']) {
                const fname = q[key];
                if (fname) {
                    const entry = zip.file(fname);
                    if (entry) {
                        const blob = await entry.async('blob');
                        q[key + '_data'] = await blobToDataURL(blob);
                    }
                }
            }
        }

        const id = quizData.id || Math.random().toString(36).slice(2, 14);
        quizData.id = id;
        try {
            localStorage.setItem('quiz_' + id, JSON.stringify(quizData));
        } catch (e) {
            alert('Storage full! Please remove some quizzes before importing.');
            return;
        }
        const index = JSON.parse(localStorage.getItem('quiz_index') || '[]');
        if (!index.find(q => q.id === id)) {
            index.push({
                id: id,
                title: quizData.title,
                question_count: quizData.questions.length,
                import_date: new Date().toLocaleDateString()
            });
            localStorage.setItem('quiz_index', JSON.stringify(index));
        }
        loadQuizzes();
        alert(`Imported "${quizData.title}"!`);
    } catch (e) {
        alert('Failed to import .fsq file: ' + e.message);
    }
    input.value = '';
}

// Convert a Blob to a base64 data URL string
function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

document.addEventListener('DOMContentLoaded', loadQuizzes);
