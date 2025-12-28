// app.js (ES5) — Works on old Samsung Internet + blocks Next unless confirmed

var QUESTIONS = [];
var quiz = {
  list: [],
  index: 0,
  score: 0,
  selected: null,
  locked: false,
  answers: [],
  lastNextAt: 0
};

var TAKE_COUNT = 30;

function shuffle(arr) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = a[i]; a[i] = a[j]; a[j] = tmp;
  }
  return a;
}

function setButtonEnabled(id, enabled) {
  var btn = document.getElementById(id);
  if (!btn) return;
  btn.disabled = !enabled;
  btn.style.pointerEvents = enabled ? "auto" : "none"; // hard block taps
}

function bindTap(el, handler) {
  if (!el) return;

  // safest for old browsers: use click + touchend
  el.addEventListener("touchend", function (e) {
    if (el.disabled) return;
    if (e && e.preventDefault) e.preventDefault();
    handler(e);
  }, false);

  el.addEventListener("click", function (e) {
    if (el.disabled) return;
    handler(e);
  }, false);
}

function preloadImages(list) {
  for (var i = 0; i < list.length; i++) {
    var q = list[i];
    if (q && q.image) {
      var src = String(q.image);
      if (src.replace(/\s/g, "") !== "") {
        var img = new Image();
        img.src = src;
      }
    }
  }
}

function loadQuestions(cb) {
  var url = "questions.json?v=" + Date.now();
  fetch(url, { cache: "no-store" })
    .then(function (res) {
      if (!res.ok) throw new Error("Could not load questions.json");
      return res.json();
    })
    .then(function (data) { cb(null, data); })
    .catch(function (err) { cb(err); });
}

function setProgress() {
  var counterEl = document.getElementById("qCounterTop");
  if (counterEl) counterEl.textContent = "السؤال " + (quiz.index + 1) + " من " + quiz.list.length;
}

function renderQuestion() {
  var q = quiz.list[quiz.index];

  quiz.selected = null;
  quiz.locked = false;

  setButtonEnabled("confirmBtn", false);
  setButtonEnabled("nextBtn", false);

  var qTextEl = document.getElementById("qText");
  var qImgEl = document.getElementById("qImg");

  var hasImg = (q && q.image && String(q.image).replace(/\s/g, "") !== "");
  if (hasImg) {
    qImgEl.src = q.image;
    qImgEl.classList.remove("hidden");

    var t = (q.question || "");
    t = String(t).replace(/^\s+|\s+$/g, "");
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
    qTextEl.textContent = q && q.question ? q.question : "";
    qTextEl.classList.remove("hidden");
  }

  var box = document.getElementById("choices");
  box.innerHTML = "";

  var choices = q.choices || [];
  for (var idx = 0; idx < choices.length; idx++) {
    var text = choices[idx];
    if (String(text || "").replace(/\s/g, "") === "") continue;

    var btn = document.createElement("button");
    btn.className = "choice";
    btn.type = "button";
    btn.innerHTML = "<span>" + text + "</span>";
    btn.setAttribute("data-index", String(idx));

    bindTap(btn, (function (chosenIndex) {
      return function () {
        if (quiz.locked) return;

        var all = box.querySelectorAll(".choice");
        for (var k = 0; k < all.length; k++) all[k].classList.remove("selected");

        btn.classList.add("selected");
        quiz.selected = chosenIndex;

        setButtonEnabled("confirmBtn", true);
      };
    })(idx));

    box.appendChild(btn);
  }

  setProgress();
}

function revealAnswer() {
  if (quiz.selected === null) return;

  quiz.locked = true;

  var q = quiz.list[quiz.index];
  var chosen = quiz.selected;
  var correct = q.correctIndex;

  quiz.answers[quiz.index] = { id: q.id, chosenIndex: chosen, correctIndex: correct };

  var box = document.getElementById("choices");
  var buttons = box.querySelectorAll(".choice");

  if (typeof correct === "number") {
    for (var i = 0; i < buttons.length; i++) {
      var b = buttons[i];
      var bi = Number(b.getAttribute("data-index"));
      if (bi === correct) b.classList.add("correct");
      if (bi === chosen && chosen !== correct) b.classList.add("wrong");
      b.style.pointerEvents = "none";
    }
    if (chosen === correct) quiz.score += 1;
  } else {
    for (var j = 0; j < buttons.length; j++) buttons[j].style.pointerEvents = "none";
  }

  setButtonEnabled("confirmBtn", false);
  setButtonEnabled("nextBtn", true);
}

function nextQuestion() {
  // ✅ cannot go next unless confirmed
  if (!quiz.locked) return;

  // ✅ prevent ghost double tap
  var now = Date.now();
  if (now - quiz.lastNextAt < 300) return;
  quiz.lastNextAt = now;

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

  var phone = localStorage.getItem("quiz_phone") || "036836482 - 03720630";
  document.getElementById("resultUser").textContent = "مدرسة بسام هاشم — " + phone;

  var passed = quiz.score >= 24;
  document.getElementById("scoreBox").innerHTML =
    '<div class="score-title">علامتك</div>' +
    '<div class="score-value">' + quiz.score + " / " + quiz.list.length + "</div>" +
    '<div class="result-status ' + (passed ? "pass" : "fail") + '">' +
    "النتيجة: " + (passed ? "ناجح" : "راسب") +
    "</div>";
}

function startNewExam() {
  quiz.index = 0;
  quiz.score = 0;
  quiz.selected = null;
  quiz.locked = false;
  quiz.answers = [];
  quiz.lastNextAt = 0;

  quiz.list = shuffle(QUESTIONS).slice(0, Math.min(TAKE_COUNT, QUESTIONS.length));
  preloadImages(quiz.list);

  document.getElementById("resultsView").classList.add("hidden");
  document.getElementById("quizView").classList.remove("hidden");

  renderQuestion();
}

function init() {
  var phone = localStorage.getItem("quiz_phone") || "036836482 - 03720630";
  document.getElementById("userName").textContent = "مدرسة بسام هاشم";
  document.getElementById("userPhone").textContent = phone;

  bindTap(document.getElementById("confirmBtn"), revealAnswer);
  bindTap(document.getElementById("nextBtn"), nextQuestion);
  bindTap(document.getElementById("retryBtn"), startNewExam);
  bindTap(document.getElementById("homeBtn"), function () { window.location.href = "index.html"; });

  loadQuestions(function (err, data) {
    if (err) { alert("Error: " + err.message); return; }
    QUESTIONS = data;

    quiz.list = shuffle(QUESTIONS).slice(0, Math.min(TAKE_COUNT, QUESTIONS.length));
    preloadImages(quiz.list);

    renderQuestion();
  });
}

init();
