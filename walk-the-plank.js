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

  // Feet anchors on the locked 1280×720 scene (images/plank-ship-scene.jpg).
  // Mapped through object-fit:cover so the pirate stays on the painted plank.
  const SCENE_W = 1280;
  const SCENE_H = 720;
  // ~10% taller again from prior in-game scale (205 → 226)
  const PIRATE_SPRITE_H = 226; // px at scene native size
  const PIRATE_SPRITE_W = Math.round((PIRATE_SPRITE_H * 560) / 960);
  const FEET_IN_SPRITE = 942 / 960; // sole row in guy/gal PNGs
  // Feet on top walking surface (scene pixels on 1280×720 art).
  const PLANK_FEET_DEFAULT = [
    { x: 386, y: 446 }, // start — on plank by the ship
    { x: 510, y: 466 }, // 1 miss — halfway out
    { x: 649, y: 490 }, // 2 misses — near tip
  ];
  const PLANK_FEET = PLANK_FEET_DEFAULT.map((p) => ({ ...p }));
  const SPLASH_AT = { x: 720, y: 630 };
  // 8-frame fall: tip → forward flip → head-first into the water.
  const FALL_FRAME_MS = 150;
  const FALL_SPLASH_INDEX = 6; // 0-based (frame 7 of 8)
  const FALL_ROTS = [0, 28, 58, 95, 130, 165, 195, 220];
  const FEET_STORAGE_KEY = "plankFeetOverride.v1";
  const calibratePanel = document.getElementById("plank-calibrate");
  const calibrateCoords = document.getElementById("plank-calibrate-coords");
  const calibrateCopyBtn = document.getElementById("plank-calibrate-copy");
  const calibrateFallBtn = document.getElementById("plank-calibrate-fall");
  const calibrateCloseBtn = document.getElementById("plank-calibrate-close");
  const movePirateBtn = document.getElementById("move-pirate-btn");
  const calibrateMode =
    new URLSearchParams(window.location.search).has("calibrate") ||
    window.location.hash === "#calibrate";
  let calibrateStep = 2;
  let calibrateOpen = false;

  function loadFeetOverride() {
    try {
      const raw = localStorage.getItem(FEET_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length < 3) return;
      parsed.slice(0, 3).forEach((p, i) => {
        if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
          PLANK_FEET[i] = { x: Math.round(p.x), y: Math.round(p.y) };
        }
      });
    } catch {
      /* ignore bad local overrides */
    }
  }

  function saveFeetOverride() {
    try {
      localStorage.setItem(FEET_STORAGE_KEY, JSON.stringify(PLANK_FEET));
    } catch {
      /* ignore quota / private mode */
    }
  }

  function refreshCalibrateUi() {
    if (!calibratePanel || !calibrateCoords) return;
    const feet = PLANK_FEET[calibrateStep];
    calibrateCoords.textContent = `step ${calibrateStep}:  x: ${feet.x},  y: ${feet.y}`;
    calibratePanel.querySelectorAll("[data-cal-step]").forEach((btn) => {
      btn.classList.toggle(
        "is-active",
        Number(btn.dataset.calStep) === calibrateStep
      );
    });
  }

  function applyCalibrateStep() {
    playerPirate.hidden = false;
    playerPirate.classList.add("is-calibrating");
    playerPirate.classList.remove("is-falling");
    playerPirate.dataset.step = String(calibrateStep);
    placeAtFeet(PLANK_FEET[calibrateStep]);
    placeSplash();
    refreshCalibrateUi();
  }

  function nudgeFeet(dx, dy) {
    const feet = PLANK_FEET[calibrateStep];
    feet.x = Math.max(0, Math.min(SCENE_W, feet.x + dx));
    feet.y = Math.max(0, Math.min(SCENE_H, feet.y + dy));
    saveFeetOverride();
    placeAtFeet(feet);
    refreshCalibrateUi();
  }

  loadFeetOverride();

  function coverLayout() {
    const scene = playerPirate.parentElement;
    const img = scene.querySelector(".game-scene-art");
    const rect = scene.getBoundingClientRect();
    const nw = img?.naturalWidth || SCENE_W;
    const nh = img?.naturalHeight || SCENE_H;
    const scale = Math.max(rect.width / nw, rect.height / nh);
    const dw = nw * scale;
    const dh = nh * scale;
    return {
      scale,
      ox: (rect.width - dw) / 2,
      oy: (rect.height - dh) / 2,
    };
  }

  function placeAtFeet(feet) {
    if (!playerPirate || playerPirate.hidden) return;
    const { scale, ox, oy } = coverLayout();
    const w = PIRATE_SPRITE_W * scale;
    const h = PIRATE_SPRITE_H * scale;
    const left = ox + feet.x * scale;
    const top = oy + feet.y * scale - h * FEET_IN_SPRITE;
    playerPirate.style.width = `${w}px`;
    playerPirate.style.height = `${h}px`;
    playerPirate.style.left = `${left}px`;
    playerPirate.style.top = `${top}px`;
    playerPirate.style.transform = "translateX(-50%)";
    playerPirate.style.opacity = "1";
  }

  function buildFallFrames() {
    const tip = PLANK_FEET[2];
    const startCx = tip.x;
    const startCy = tip.y - PIRATE_SPRITE_H * (FEET_IN_SPRITE - 0.5);
    const endCx = tip.x + 86;
    const endCy = tip.y + 165;
    return FALL_ROTS.map((rot, i) => {
      const t = i / (FALL_ROTS.length - 1);
      const e = t ** 1.55;
      return {
        cx: startCx + (endCx - startCx) * e + Math.sin(t * Math.PI) * 18,
        cy: startCy + (endCy - startCy) * e,
        rot,
        opacity: i === FALL_ROTS.length - 1 ? 0.35 : 1,
      };
    });
  }

  function placeFallFrame(frame) {
    if (!playerPirate) return;
    const { scale, ox, oy } = coverLayout();
    const w = PIRATE_SPRITE_W * scale;
    const h = PIRATE_SPRITE_H * scale;
    playerPirate.style.width = `${w}px`;
    playerPirate.style.height = `${h}px`;
    playerPirate.style.left = `${ox + frame.cx * scale}px`;
    playerPirate.style.top = `${oy + frame.cy * scale}px`;
    playerPirate.style.transform = `translate(-50%, -50%) rotate(${frame.rot}deg)`;
    playerPirate.style.opacity = String(frame.opacity ?? 1);
  }

  async function playFallAnimation() {
    const frames = buildFallFrames();
    playerPirate.hidden = false;
    playerPirate.classList.add("is-falling");
    playerPirate.classList.remove("is-calibrating");
    placeSplash();
    for (let i = 0; i < frames.length; i += 1) {
      placeFallFrame(frames[i]);
      if (i === FALL_SPLASH_INDEX) {
        splashEl.classList.add("is-active");
        try {
          playSplash();
        } catch {
          /* ignore */
        }
      }
      await wait(FALL_FRAME_MS);
    }
    await wait(450);
    playerPirate.style.opacity = "0";
  }

  function placeSplash() {
    if (!splashEl) return;
    const { scale, ox, oy } = coverLayout();
    splashEl.style.left = `${ox + SPLASH_AT.x * scale}px`;
    splashEl.style.top = `${oy + SPLASH_AT.y * scale}px`;
    splashEl.style.transform = "translate(-50%, -50%)";
  }

  function syncPiratePlacement() {
    if (playerPirate.classList.contains("is-falling")) return;
    const step = Number(playerPirate.dataset.step || 0);
    placeAtFeet(PLANK_FEET[Math.min(step, 2)]);
    placeSplash();
  }

  // Plank positions:
  // 0 = start on plank by the ship
  // 1 = first miss, halfway out
  // 2 = second miss, end of the plank
  // third miss triggers fall/splash (is-falling)
  function setStep(misses) {
    const step = Math.min(misses, 2);
    playerPirate.dataset.step = String(step);
    // Standing positions only; 3rd miss falls from the tip via onSplash.
    placeAtFeet(PLANK_FEET[step]);
    placeSplash();
  }

  window.addEventListener("resize", syncPiratePlacement);
  const sceneArt = document.querySelector(".game-scene-art");
  if (sceneArt) {
    if (sceneArt.complete) syncPiratePlacement();
    else sceneArt.addEventListener("load", syncPiratePlacement);
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
    feedbackEl.classList.remove("is-reveal");
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
    try {
      ensureAudio();
    } catch {
      /* ignore audio unlock failures */
    }

    const correct = isCorrect(question, value);
    if (correct) {
      btn.classList.add("is-correct");
      feedbackEl.textContent = "Safe!";
      feedbackEl.classList.add("is-reveal");
      try {
        playYay();
      } catch {
        /* ignore */
      }
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

    const correctLabel =
      question.type === "tf"
        ? question.answer
          ? "True"
          : "False"
        : question.answer;

    // Replace choices with a full reveal so the teaching beat can't be missed.
    answerGrid.innerHTML = `
      <div class="reveal-card">
        <p class="reveal-wrong">Not quite.</p>
        <p class="reveal-correct">Correct answer: <strong>${escapeHtml(
          String(correctLabel)
        )}</strong></p>
      </div>
    `;
    feedbackEl.textContent = "";
    feedbackEl.classList.remove("is-reveal");
    state.misses += 1;
    try {
      playCreak();
    } catch {
      /* ignore */
    }
    setStep(state.misses);
    await wait(2000);

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
    // 8-frame fall from miss-2 tip into the water, head first.
    placeAtFeet(PLANK_FEET[2]);
    await wait(280);
    await playFallAnimation();
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
    playerPirate.classList.remove("is-falling");
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
  updatePlayEnabled();
  refreshLeaderboard();

  let panelBeforeCalibrate = "start";

  function openCalibrate() {
    if (!calibratePanel) return;
    calibrateOpen = true;
    calibratePanel.hidden = false;
    if (movePirateBtn) movePirateBtn.setAttribute("aria-pressed", "true");
    // Clear the center game panels so the plank positions are visible.
    if (!startPanel.hidden) panelBeforeCalibrate = "start";
    else if (!questionPanel.hidden) panelBeforeCalibrate = "question";
    else if (!endPanel.hidden) panelBeforeCalibrate = "end";
    else panelBeforeCalibrate = "start";
    startPanel.hidden = true;
    questionPanel.hidden = true;
    endPanel.hidden = true;
    if (progressChip) progressChip.hidden = true;
    paintPlayer();
    applyCalibrateStep();
  }

  function closeCalibrate() {
    if (!calibratePanel) return;
    calibrateOpen = false;
    calibratePanel.hidden = true;
    playerPirate.classList.remove("is-calibrating");
    if (movePirateBtn) movePirateBtn.setAttribute("aria-pressed", "false");
    if (panelBeforeCalibrate === "question") {
      showPanel(questionPanel);
      syncPiratePlacement();
    } else if (panelBeforeCalibrate === "end") {
      showPanel(endPanel);
      playerPirate.hidden = true;
    } else {
      showPanel(startPanel);
      playerPirate.hidden = true;
    }
  }

  if (calibratePanel) {
    movePirateBtn?.addEventListener("click", () => {
      if (calibrateOpen) closeCalibrate();
      else openCalibrate();
    });
    calibrateCloseBtn?.addEventListener("click", closeCalibrate);

    calibratePanel.addEventListener("click", (event) => {
      const stepBtn = event.target.closest("[data-cal-step]");
      if (stepBtn) {
        calibrateStep = Number(stepBtn.dataset.calStep);
        applyCalibrateStep();
        return;
      }
      const nudgeBtn = event.target.closest("[data-nudge]");
      if (nudgeBtn) {
        const [dx, dy] = nudgeBtn.dataset.nudge.split(",").map(Number);
        const step = event.shiftKey ? 1 : 4;
        nudgeFeet(dx * step, dy * step);
      }
    });

    calibrateCopyBtn?.addEventListener("click", async () => {
      const text = PLANK_FEET.map(
        (p, i) => `  { x: ${p.x}, y: ${p.y} }, // step ${i}`
      ).join("\n");
      try {
        await navigator.clipboard.writeText(text);
        calibrateCopyBtn.textContent = "Copied!";
        setTimeout(() => {
          calibrateCopyBtn.textContent = "Copy coordinates";
        }, 1200);
      } catch {
        calibrateCoords.textContent = text.replaceAll("\n", "  ");
      }
    });

    calibrateFallBtn?.addEventListener("click", async () => {
      if (calibrateFallBtn.disabled) return;
      calibrateFallBtn.disabled = true;
      calibrateStep = 2;
      applyCalibrateStep();
      await wait(200);
      await playFallAnimation();
      splashEl.classList.remove("is-active");
      playerPirate.classList.remove("is-falling");
      applyCalibrateStep();
      calibrateFallBtn.disabled = false;
    });

    window.addEventListener("keydown", (event) => {
      if (!calibrateOpen) return;
      const map = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      const delta = map[event.key];
      if (!delta) return;
      event.preventDefault();
      const step = event.shiftKey ? 1 : 4;
      nudgeFeet(delta[0] * step, delta[1] * step);
    });

    if (calibrateMode) openCalibrate();
  }
})();
