(() => {
  const ROUND_SIZE = 10;
  const MAX_MISSES = 3;
  const NAME_MAX = 8;
  const GEM_COLORS = ["emerald", "ruby", "gold"];
  const YAY_LINES = ["Yay!", "Arr!", "Aye!", "Yo ho!"];
  const GEM_LINES = [
    "Arrr, here's yer gem!",
    "A fine gem for ye!",
    "Treasure earned, matey!",
  ];

  const startPanel = document.getElementById("start-panel");
  const questionPanel = document.getElementById("question-panel");
  const endPanel = document.getElementById("end-panel");
  const nameInput = document.getElementById("pirate-name");
  const playBtn = document.getElementById("play-btn");
  const playAgainBtn = document.getElementById("play-again-btn");
  const quitBtn = document.getElementById("quit-btn");
  const endQuitBtn = document.getElementById("end-quit-btn");
  const piratePicker = document.getElementById("pirate-picker");
  const playerPirate = document.getElementById("player-pirate");
  const bridePirate = document.getElementById("bride-pirate");
  const groomPirate = document.getElementById("groom-pirate");
  const questionText = document.getElementById("question-text");
  const answerGrid = document.getElementById("answer-grid");
  const feedbackEl = document.getElementById("feedback");
  const progressChip = document.getElementById("progress-chip");
  const gemCountEl = document.getElementById("gem-count");
  const gemPips = Array.from(document.querySelectorAll("#gem-pips .gem-pip"));
  const splashEl = document.getElementById("splash");
  const endTitle = document.getElementById("end-title");
  const endMessage = document.getElementById("end-message");
  const leaderboardList = document.getElementById("leaderboard-list");
  const leaderboardEmpty = document.getElementById("leaderboard-empty");
  const leaderboard = document.getElementById("leaderboard");
  const lbTab = document.getElementById("lb-tab");

  const state = {
    name: "",
    pirateId: window.PLANK_DEFAULT_PIRATE || "guy1",
    gems: 0,
    gemColors: [],
    misses: 0,
    roundIndex: 0,
    roundQuestions: [],
    pool: [],
    answeringLocked: false,
    audioCtx: null,
  };

  function ensureAudio() {
    if (!state.audioCtx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) state.audioCtx = new Ctx();
    }
    if (state.audioCtx && state.audioCtx.state === "suspended") {
      state.audioCtx.resume();
    }
    return state.audioCtx;
  }

  function beep(freq, duration, type = "square", gainValue = 0.04) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = gainValue;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(gainValue, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.start(now);
    osc.stop(now + duration);
  }

  function noiseBurst(duration, filterFreq) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = filterFreq;
    const gain = ctx.createGain();
    gain.gain.value = 0.12;
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  }

  function playCreak() {
    noiseBurst(0.35, 420);
    beep(120, 0.18, "sawtooth", 0.03);
  }

  function playSplash() {
    noiseBurst(0.7, 700);
    beep(80, 0.35, "sine", 0.05);
  }

  function speak(line, pitch = 0.7, rate = 1) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(line);
    utter.pitch = pitch;
    utter.rate = rate;
    utter.volume = 1;
    window.speechSynthesis.speak(utter);
  }

  function playYay() {
    const line = YAY_LINES[Math.floor(Math.random() * YAY_LINES.length)];
    speak(line, 0.6 + Math.random() * 0.4, 1.05);
    beep(440, 0.08, "triangle", 0.03);
    setTimeout(() => beep(660, 0.1, "triangle", 0.03), 80);
  }

  function playGemLine() {
    const line = GEM_LINES[Math.floor(Math.random() * GEM_LINES.length)];
    speak(line, 0.55, 0.95);
    beep(520, 0.1, "triangle", 0.04);
    setTimeout(() => beep(780, 0.14, "triangle", 0.04), 100);
  }

  function sanitizeName(raw) {
    return String(raw || "")
      .replace(/[^a-zA-Z]/g, "")
      .slice(0, NAME_MAX);
  }

  function shuffle(list) {
    const arr = list.slice();
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function setGems(count) {
    state.gems = count;
    gemCountEl.textContent = String(count);
    gemPips.forEach((pip, index) => {
      const color = state.gemColors[index];
      if (color && index < Math.min(3, count)) {
        pip.classList.add("is-filled");
        pip.dataset.color = color;
      } else {
        pip.classList.remove("is-filled");
        delete pip.dataset.color;
      }
    });
  }

  function addGem() {
    const color = GEM_COLORS[Math.floor(Math.random() * GEM_COLORS.length)];
    if (state.gemColors.length < 3) state.gemColors.push(color);
    setGems(state.gems + 1);
    playGemLine();
  }

  function resetVisitGems() {
    state.gemColors = [];
    setGems(0);
  }

  function updatePlayEnabled() {
    playBtn.disabled = sanitizeName(nameInput.value).length < 1;
  }

  function buildPiratePicker() {
    const ids = Object.keys(window.PLANK_PIRATES);
    piratePicker.innerHTML = ids
      .map((id) => {
        const p = window.PLANK_PIRATES[id];
        const selected = id === state.pirateId ? " is-selected" : "";
        return `
          <button type="button" class="pirate-option${selected}" data-pirate="${id}" aria-pressed="${
          id === state.pirateId
        }">
            <div class="pirate-thumb">${window.renderPirateSvg(id)}</div>
            ${p.label}
          </button>
        `;
      })
      .join("");
  }

  function paintCouple() {
    bridePirate.innerHTML = window.renderPirateSvg("gal2", {
      title: "Bride pirate",
    });
    groomPirate.innerHTML = window.renderPirateSvg("guy2", {
      title: "Groom pirate",
    });
  }

  function paintPlayer() {
    playerPirate.innerHTML = window.renderPirateSvg(state.pirateId, {
      title: state.name || "Player pirate",
    });
    playerPirate.hidden = false;
    playerPirate.classList.remove("is-falling");
    playerPirate.dataset.step = "0";
  }

  function showPanel(panel) {
    startPanel.hidden = panel !== startPanel;
    questionPanel.hidden = panel !== questionPanel;
    endPanel.hidden = panel !== endPanel;
  }

  async function refreshLeaderboard() {
    const scores = await window.PlankLeaderboard.fetchTopScores(10);
    leaderboardList.innerHTML = "";
    if (!scores.length) {
      leaderboardEmpty.hidden = false;
      return;
    }
    leaderboardEmpty.hidden = true;
    scores.forEach((row, index) => {
      const li = document.createElement("li");
      li.innerHTML = `
        <span>${index + 1}</span>
        <span>${escapeHtml(row.display_name)}</span>
        <span>${row.gems}</span>
      `;
      leaderboardList.appendChild(li);
    });
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function rebuildPool() {
    const bank = window.WALK_THE_PLANK_QUESTIONS || [];
    state.pool = bank.map((q, index) => ({ ...q, _id: index }));
  }

  function drawRound() {
    if (state.pool.length === 0) return false;
    const take = Math.min(ROUND_SIZE, state.pool.length);
    state.roundQuestions = shuffle(state.pool).slice(0, take);
    state.roundIndex = 0;
    state.misses = 0;
    return state.roundQuestions.length > 0;
  }

  function removeCorrectFromPool(question) {
    state.pool = state.pool.filter((q) => q._id !== question._id);
  }

  function setStep(misses) {
    playerPirate.dataset.step = String(Math.min(misses, 2));
  }

  function renderQuestion() {
    const q = state.roundQuestions[state.roundIndex];
    if (!q) return;
    progressChip.hidden = false;
    progressChip.textContent = `${state.roundIndex + 1} / ${
      state.roundQuestions.length
    }`;
    questionText.textContent = q.prompt;
    feedbackEl.textContent = "";
    state.answeringLocked = false;

    let choices;
    if (q.type === "tf") {
      choices = [
        { label: "True", value: true },
        { label: "False", value: false },
      ];
    } else {
      choices = shuffle(q.choices).map((label) => ({ label, value: label }));
    }

    answerGrid.innerHTML = "";
    choices.forEach((choice) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "answer-btn";
      btn.textContent = choice.label;
      btn.addEventListener("click", () => onAnswer(choice.value, btn, q));
      answerGrid.appendChild(btn);
    });
  }

  function lockAnswers() {
    state.answeringLocked = true;
    answerGrid.querySelectorAll("button").forEach((btn) => {
      btn.disabled = true;
    });
  }

  function isCorrect(question, value) {
    if (question.type === "tf") return value === question.answer;
    return value === question.answer;
  }

  async function onAnswer(value, btn, question) {
    if (state.answeringLocked) return;
    lockAnswers();
    ensureAudio();

    const correct = isCorrect(question, value);
    if (correct) {
      btn.classList.add("is-correct");
      feedbackEl.textContent = "Safe!";
      playYay();
      removeCorrectFromPool(question);
      await wait(700);
      state.roundIndex += 1;
      if (state.roundIndex >= state.roundQuestions.length) {
        await onRoundWin();
      } else {
        renderQuestion();
      }
      return;
    }

    btn.classList.add("is-wrong");
    const correctLabel =
      question.type === "tf"
        ? question.answer
          ? "True"
          : "False"
        : question.answer;
    feedbackEl.textContent = `Correct: ${correctLabel}`;
    state.misses += 1;
    playCreak();
    setStep(state.misses);
    await wait(1100);

    if (state.misses >= MAX_MISSES) {
      await onSplash();
      return;
    }

    state.roundIndex += 1;
    if (state.roundIndex >= state.roundQuestions.length) {
      await onRoundWin();
    } else {
      renderQuestion();
    }
  }

  async function onRoundWin() {
    showPanel(endPanel);
    progressChip.hidden = true;
    endTitle.textContent = "You survived!";
    endMessage.textContent = "A gem drops into your treasure.";
    addGem();
    await window.PlankLeaderboard.submitScore(
      state.name,
      state.pirateId,
      state.gems
    );
    await refreshLeaderboard();

    if (state.pool.length === 0) {
      playAgainBtn.hidden = true;
      endMessage.textContent =
        "No more questions — come back later. Your gems are on the board if you made the top 10.";
    } else {
      playAgainBtn.hidden = false;
    }
  }

  async function onSplash() {
    questionPanel.hidden = true;
    progressChip.hidden = true;
    playerPirate.classList.add("is-falling");
    await wait(450);
    splashEl.classList.add("is-active");
    playSplash();
    await wait(1400);
    splashEl.classList.remove("is-active");
    resetVisitGems();
    showPanel(endPanel);
    endTitle.textContent = "Walked the plank!";
    endMessage.textContent =
      "Splash! Your gems for this visit are gone — but your best board score stays.";
    playAgainBtn.hidden = state.pool.length === 0;
    if (state.pool.length === 0) {
      endMessage.textContent =
        "Splash! No more questions — come back later.";
    }
    paintPlayer();
  }

  function startRound() {
    splashEl.classList.remove("is-active");
    paintPlayer();
    setStep(0);
    if (!drawRound()) {
      showPanel(endPanel);
      endTitle.textContent = "No more questions";
      endMessage.textContent = "No more questions — come back later";
      playAgainBtn.hidden = true;
      return;
    }
    showPanel(questionPanel);
    renderQuestion();
  }

  function beginGame() {
    ensureAudio();
    state.name = sanitizeName(nameInput.value);
    if (!state.name) {
      updatePlayEnabled();
      return;
    }
    rebuildPool();
    resetVisitGems();
    startRound();
  }

  function quitToCabin() {
    window.location.href = "pirates-cabin.html";
  }

  nameInput.addEventListener("input", () => {
    const cleaned = sanitizeName(nameInput.value);
    if (nameInput.value !== cleaned) nameInput.value = cleaned;
    updatePlayEnabled();
  });

  piratePicker.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-pirate]");
    if (!btn) return;
    state.pirateId = btn.dataset.pirate;
    buildPiratePicker();
  });

  playBtn.addEventListener("click", beginGame);
  playAgainBtn.addEventListener("click", () => {
    ensureAudio();
    startRound();
  });
  quitBtn.addEventListener("click", quitToCabin);
  endQuitBtn.addEventListener("click", quitToCabin);

  lbTab.addEventListener("click", () => {
    const open = leaderboard.classList.toggle("is-open");
    lbTab.setAttribute("aria-expanded", open ? "true" : "false");
  });

  buildPiratePicker();
  paintCouple();
  updatePlayEnabled();
  refreshLeaderboard();
})();
