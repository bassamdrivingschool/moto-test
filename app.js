// app.js — Random 30 questions + confirm answer + end results review (Arabic UI)

let QUESTIONS = [];
let quiz = {
  list: [],
  index: 0,
  score: 0,
  selected: null,     // selected index (original index in q.choices)
  locked: false,
  answers: []         // { id, chosenIndex, correctIndex }
};

const TAKE_COUNT = 30; // always random 30 questions

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function loadQuestions() {
  const res = await fetch("questions.json");
  if (!res.ok) throw new Error("Could not load questions.json");
  return await res.json();
}

function setProgress() {
  // progress should represent current question position (1..N)
  const pct = ((quiz.index) / quiz.list.length) * 100;
  const progressEl = document.getElementById("progress");
  if (progressEl) progressEl.style.setProperty("--p", `${pct}%`);

  const counterEl = document.getElementById("qCounterTop");
  if (counterEl) {
    counterEl.textContent = `السؤال ${quiz.index + 1} من ${quiz.list.length}`;
  }
}

function renderQuestion() {
  const q = quiz.list[quiz.index];

  const qTextEl = document.getElementById("qText");
  const qImgEl  = document.getElementById("qImg");

  // Reset state
  quiz.selected = null;
  quiz.locked = false;

  // Disable buttons until selection + confirm
  const confirmBtn = document.getElementById("confirmBtn");
  const nextBtn = document.getElementById("nextBtn");
  if (confirmBtn) confirmBtn.disabled = true;
  if (nextBtn) nextBtn.disabled = true;

  // Hide feedback completely (you said you don't want it)
  const fb = document.getElementById("feedback");
  if (fb) {
    fb.className = "feedback hidden";
    fb.textContent = "";
  }

  // Question image/text handling
  const hasImg = q.image && String(q.image).trim() !== "";
  if (hasImg) {
    qImgEl.src = q.image;
    qImgEl.classList.remove("hidden");

    const t = (q.question ?? "").trim();
    if (t === "") {
      qTextEl.textContent = "";
      qTextEl.classList.add("hidden");
    } else {
      qTextEl.textContent = t;
      qTextEl.classList.remove("hidden");
    }
  } else {
    qImgEl.removeAttribute("src");
    qImgEl.classList.add("hidden");

    qTextEl.textContent = q.question ?? "";
    qTextEl.classList.remove("hidden");
  }

  // Render choices
  const box = document.getElementById("choices");
  box.innerHTML = "";

  // IMPORTANT: keep mapping correctIndex/chosenIndex aligned with original indexes.
  // So we will NOT change indexes — we will just not render empty strings.
  q.choices.forEach((text, idx) => {
    if (String(text ?? "").trim() === "") return;

    const btn = document.createElement("button");
    btn.className = "choice";
    btn.type = "button";
    btn.innerHTML = `<span>${text}</span>`;
    btn.dataset.index = String(idx); // original index

    btn.addEventListener("click", () => {
      if (quiz.locked) return;

      // remove previous selection
      [...box.querySelectorAll(".choice")].forEach(b => b.classList.remove("selected"));

      btn.classList.add("selected");
      quiz.selected = idx; // original index
      if (confirmBtn) confirmBtn.disabled = false;
    });

    box.appendChild(btn);
  });

  setProgress();
}

function revealAnswer() {
  const q = quiz.list[quiz.index];
  const chosen = quiz.selected;
  if (chosen === null) return;

  quiz.locked = true;

  const box = document.getElementById("choices");
  const buttons = [...box.querySelectorAll(".choice")];

  const correct = q.correctIndex;

  // Save answer even if correctIndex missing
  quiz.answers[quiz.index] = { id: q.id, chosenIndex: chosen, correctIndex: correct };

  // If correctIndex is missing, just unlock next (no colors)
  if (typeof correct !== "number") {
    const nextBtn = document.getElementById("nextBtn");
    const confirmBtn = document.getElementById("confirmBtn");
    if (nextBtn) nextBtn.disabled = false;
    if (confirmBtn) confirmBtn.disabled = true;
    return;
  }

  // Mark correct green + wrong selected red (NO FEEDBACK MESSAGE)
  buttons.forEach(btn => {
    const idx = Number(btn.dataset.index);
    if (idx === correct) btn.classList.add("correct");
    if (idx === chosen && chosen !== correct) btn.classList.add("wrong");

    // lock clicks
    btn.style.pointerEvents = "none";
  });

  // Score
  if (chosen === correct) quiz.score += 1;

  // Enable next, disable confirm
  const nextBtn = document.getElementById("nextBtn");
  const confirmBtn = document.getElementById("confirmBtn");
  if (nextBtn) nextBtn.disabled = false;
  if (confirmBtn) confirmBtn.disabled = true;
}

function nextQuestion() {
  if (quiz.index < quiz.list.length - 1) {
    quiz.index += 1;
    renderQuestion();
  } else {
    showResults();
  }
}

function showResults() {
  document.getElementById("quizView").classList.add("hidden");
  document.getElementById("resultsView").classList.remove("hidden");

  const phone = localStorage.getItem("quiz_phone") || "03836482 - 03720630";
  document.getElementById("resultUser").textContent = `مدرسة بسام هاشم — ${phone}`;

 const passed = quiz.score >= 24;

document.getElementById("scoreBox").innerHTML = `
  <div class="score-title">علامتك</div>
  <div class="score-value">${quiz.score} / ${quiz.list.length}</div>
  <div class="result-status ${passed ? "pass" : "fail"}">
    النتيجة: ${passed ? "ناجح" : "راسب"}
  </div>
`;

  const review = document.getElementById("reviewList");
  review.innerHTML = "";

  quiz.list.forEach((q, i) => {
    const a = quiz.answers[i] || { chosenIndex: null, correctIndex: q.correctIndex };

    const chosenText =
      (a.chosenIndex !== null && q.choices[a.chosenIndex] !== undefined)
        ? q.choices[a.chosenIndex]
        : "لم تُجب";

    const correctText =
      (typeof a.correctIndex === "number" && q.choices[a.correctIndex] !== undefined)
        ? q.choices[a.correctIndex]
        : "غير متوفر";

    const isCorrect =
      (typeof a.correctIndex === "number") && (a.chosenIndex === a.correctIndex);

    const qText = (q.question ?? "").trim();
    const hasImg = q.image && String(q.image).trim() !== "";

    const item = document.createElement("div");
    item.className = "review-item";

    item.innerHTML = `
      <div class="review-q">
        <div class="review-num">سؤال ${i + 1}</div>
        ${hasImg ? `<img class="qimg" src="${q.image}" alt="question image">` : ""}
        ${qText ? `<div class="review-text">${qText}</div>` : ""}
      </div>

      <div class="review-answers">
        <div class="ans-row ${isCorrect ? "ans-ok" : "ans-bad"}">
          <span class="ans-label">إجابتك:</span>
          <span class="ans-value">${chosenText}</span>
        </div>

        <div class="ans-row ans-ok">
          <span class="ans-label">الصحيح:</span>
          <span class="ans-value">${correctText}</span>
        </div>
      </div>
    `;

    review.appendChild(item);
  });
}

function startNewExam() {
  quiz.index = 0;
  quiz.score = 0;
  quiz.selected = null;
  quiz.locked = false;
  quiz.answers = [];

  quiz.list = shuffle(QUESTIONS).slice(0, Math.min(TAKE_COUNT, QUESTIONS.length));

  document.getElementById("resultsView").classList.add("hidden");
  document.getElementById("quizView").classList.remove("hidden");

  renderQuestion();
}

async function init() {
  // Always show school name + phone in quiz header
  const phone = localStorage.getItem("quiz_phone") || "03836482 - 03720630";

  document.getElementById("userName").textContent = "مدرسة بسام هاشم";
  document.getElementById("userPhone").textContent = phone;

  QUESTIONS = await loadQuestions();

  quiz.list = shuffle(QUESTIONS).slice(0, Math.min(TAKE_COUNT, QUESTIONS.length));
  quiz.index = 0;
  quiz.score = 0;
  quiz.answers = [];

  document.getElementById("confirmBtn").addEventListener("click", revealAnswer);
  document.getElementById("nextBtn").addEventListener("click", nextQuestion);

  document.getElementById("retryBtn").addEventListener("click", startNewExam);

  document.getElementById("homeBtn").addEventListener("click", () => {
    window.location.href = "index.html";
  });

  renderQuestion();
}

init().catch(err => alert("Error: " + err.message));
