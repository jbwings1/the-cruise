(() => {
  const ROUND_SIZE = 5;
  const MAX_MISSES = 3;
  const NAME_MAX = 8;
  /* Real pirate voice clips live in sounds/plank/ (CC BY 4.0 — see preview page). */
  const SFX = {
    splashVoice: "sounds/plank/splash.mp3",
    waterSplash: "sounds/plank/water-splash.mp3",
    walkThePlank: "sounds/plank/walk-the-plank-voice.mp3",
    arrMatey: "sounds/plank/arr-matey.mp3",
    yaargh: "sounds/plank/yaargh.mp3",
    scallywag: "sounds/plank/scallywag.mp3",
  };
  const WRONG_VOICES = [SFX.yaargh, SFX.scallywag];

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
    misses: 0,
    corrects: 0,
    currentQuestion: null,
    pool: [],
    answeringLocked: false,
    audioCtx: null,
    wrongVoiceIndex: 0,
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

  function beep(freq, duration, type = "square", gainValue = 0.1) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    const peak = Math.max(0.0001, gainValue);
    // Hold most of the note, then ease out so it is easy to hear.
    const hold = Math.max(0.05, duration * 0.72);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.02);
    gain.gain.setValueAtTime(peak, now + hold);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  function noiseBurst(duration, filterFreq, gainValue = 0.22) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
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
    filter.Q.value = 0.9;
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    const peak = Math.max(0.0001, gainValue);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    src.start(now);
    src.stop(now + duration + 0.02);
  }

  function playSfx(url, volume = 1) {
    return new Promise((resolve) => {
      try {
        ensureAudio();
        const audio = new Audio(url);
        audio.volume = Math.max(0, Math.min(1, volume));
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          resolve();
        };
        audio.addEventListener("ended", finish);
        audio.addEventListener("error", finish);
        audio.play().then(null, finish);
        setTimeout(finish, 6000);
      } catch {
        resolve();
      }
    });
  }

  async function playCreak() {
    // Alternate wrong-answer voices: "YAARGH" / "SCALLYWAG"
    const url = WRONG_VOICES[state.wrongVoiceIndex % WRONG_VOICES.length];
    state.wrongVoiceIndex += 1;
    await playSfx(url, 1);
  }

  async function playSplash() {
    // Water splash + Shiver me timbers when they fall off the plank
    playSfx(SFX.waterSplash, 1);
    await playSfx(SFX.splashVoice, 1);
  }

  function playWalkThePlankVoice() {
    return playSfx(SFX.walkThePlank, 1);
  }

  async function playYay() {
    // Pirate sailor voice: "ARR MATEY"
    await playSfx(SFX.arrMatey, 1);
  }

  async function playGemLine() {
    // Placeholder tones until we have more pirate voice clips
    beep(520, 0.28, "triangle", 0.1);
    setTimeout(() => beep(660, 0.3, "triangle", 0.1), 200);
    setTimeout(() => beep(880, 0.42, "triangle", 0.11), 420);
    await wait(750);
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
  }

  async function addGem() {
    setGems(state.gems + 1);
    await playGemLine();
  }

  function resetVisitGems() {
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

  function resetRoundCounters() {
    state.corrects = 0;
    state.misses = 0;
    state.currentQuestion = null;
  }

  /** Pick the next unanswered question from the pool. */
  function drawNextQuestion() {
    if (state.pool.length === 0) {
      state.currentQuestion = null;
      return false;
    }
    state.currentQuestion = shuffle(state.pool)[0];
    return true;
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
  const PLANK_FEET = [
    { x: 386, y: 446 }, // start — on plank by the ship
    { x: 510, y: 466 }, // 1 miss — halfway out
    { x: 649, y: 490 }, // 2 misses — near tip
  ];
  const SPLASH_AT = { x: 720, y: 630 };
  // Center the phone frame near the pirate on the plank; tip stays in view.
  const SCENE_FOCUS = {
    x: PLANK_FEET[0].x * 0.85 + PLANK_FEET[1].x * 0.15,
    y: (PLANK_FEET[0].y + PLANK_FEET[1].y) / 2,
  };
  // On phones: show about this much of the art width (higher = more zoomed out).
  // Old tight crop showed ~26%; ~0.5 reads ship + plank without a tiny letterbox strip.
  const PORTRAIT_SCENE_VISIBLE_FRAC = 0.5;
  // Fill this fraction of scene height so the art isn’t a thin band above the card.
  const PORTRAIT_STAGE_HEIGHT_FRAC = 0.58;
  // Vertical anchor for the plank within the phone frame.
  const PORTRAIT_PLANK_STAGE_Y = 0.38;
  // 8-frame fall: tip → forward flip → head-first into the water.
  const FALL_FRAME_MS = 150;
  const FALL_SPLASH_INDEX = 6; // 0-based (frame 7 of 8)
  const FALL_ROTS = [0, 28, 58, 95, 130, 165, 195, 220];

  function coverLayout() {
    const scene = document.querySelector(".game-scene");
    const img = scene?.querySelector(".game-scene-art");
    const rect = scene.getBoundingClientRect();
    const nw = img?.naturalWidth || SCENE_W;
    const nh = img?.naturalHeight || SCENE_H;
    const cw = rect.width;
    const ch = rect.height;
    const portrait = ch > cw * 1.05;

    let scale;
    let ox;
    let oy;
    if (portrait) {
      // Zoom out from the old plank-tight crop, but still fill the play stage
      // above the question card so the scene isn’t a thin letterboxed strip.
      const scaleByWidth = cw / (nw * PORTRAIT_SCENE_VISIBLE_FRAC);
      const scaleByStage = (ch * PORTRAIT_STAGE_HEIGHT_FRAC) / nh;
      scale = Math.max(scaleByWidth, scaleByStage);
      const dw = nw * scale;
      const dh = nh * scale;
      ox = cw / 2 - SCENE_FOCUS.x * scale;
      oy = ch * PORTRAIT_PLANK_STAGE_Y - SCENE_FOCUS.y * scale;
      if (dw <= cw) ox = (cw - dw) / 2;
      else ox = Math.min(0, Math.max(cw - dw, ox));
      if (dh <= ch) {
        const staged = ch * PORTRAIT_PLANK_STAGE_Y - SCENE_FOCUS.y * scale;
        oy = Math.max(0, Math.min(ch - dh, staged));
      } else {
        oy = Math.min(0, Math.max(ch - dh, oy));
      }
      return { scale, ox, oy, dw, dh };
    }

    scale = Math.max(cw / nw, ch / nh);
    ox = cw / 2 - SCENE_FOCUS.x * scale;
    oy = ch / 2 - SCENE_FOCUS.y * scale;
    ox = Math.min(0, Math.max(cw - nw * scale, ox));
    oy = Math.min(0, Math.max(ch - nh * scale, oy));

    return {
      scale,
      ox,
      oy,
      dw: nw * scale,
      dh: nh * scale,
    };
  }

  function applySceneArtLayout() {
    const scene = document.querySelector(".game-scene");
    const img = scene?.querySelector(".game-scene-art");
    if (!scene || !img) return;
    const { ox, oy, dw, dh } = coverLayout();
    img.style.width = `${dw}px`;
    img.style.height = `${dh}px`;
    img.style.left = `${ox}px`;
    img.style.top = `${oy}px`;
    img.style.right = "auto";
    img.style.bottom = "auto";
    img.style.maxWidth = "none";
    img.style.objectFit = "fill";
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
    placeSplash();
    for (let i = 0; i < frames.length; i += 1) {
      placeFallFrame(frames[i]);
      if (i === FALL_SPLASH_INDEX) {
        splashEl.classList.add("is-active");
        try {
          // Fire-and-forget so the fall frames keep moving while the voice plays
          playSplash();
        } catch {
          /* ignore */
        }
      }
      await wait(FALL_FRAME_MS);
    }
    await wait(900);
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
    applySceneArtLayout();
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
    applySceneArtLayout();
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
  applySceneArtLayout();

  function updateProgressChip() {
    progressChip.hidden = false;
    progressChip.textContent = `${state.corrects} / ${ROUND_SIZE} correct`;
  }

  function renderQuestion() {
    const q = state.currentQuestion;
    if (!q) return;
    updateProgressChip();
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

  async function advanceAfterAnswer() {
    if (!drawNextQuestion()) {
      // Pool empty before 5 correct — treat as end of available questions.
      progressChip.hidden = true;
      showPanel(endPanel);
      endTitle.textContent = "No more questions";
      endMessage.textContent =
        state.corrects > 0
          ? `No more questions — you had ${state.corrects} correct. Come back later.`
          : "No more questions — come back later";
      playAgainBtn.hidden = true;
      return;
    }
    renderQuestion();
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
        await playYay();
      } catch {
        /* ignore */
      }
      removeCorrectFromPool(question);
      state.corrects += 1;
      updateProgressChip();
      await wait(250);
      if (state.corrects >= ROUND_SIZE) {
        await onRoundWin();
      } else {
        await advanceAfterAnswer();
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
      await playCreak();
    } catch {
      /* ignore */
    }
    setStep(state.misses);
    await wait(900);

    if (state.misses >= MAX_MISSES) {
      await onSplash();
      return;
    }

    // Wrong answers do not count toward the gem — keep asking until 5 correct.
    await advanceAfterAnswer();
  }

  async function onRoundWin() {
    progressChip.hidden = true;
    showPanel(endPanel);
    endTitle.textContent = "You survived!";
    endMessage.textContent = "A gem drops into your treasure.";
    playAgainBtn.hidden = true;
    await addGem();
    await window.PlankLeaderboard.submitScore(
      state.name,
      state.pirateId,
      state.gems
    );
    await refreshLeaderboard();

    if (state.pool.length === 0) {
      endMessage.textContent =
        "No more questions — come back later. Your gems are on the board if you made the top 10.";
      return;
    }

    // Gem earned — back to the start of the plank with 3 misses again.
    endMessage.textContent =
      "A gem drops into your treasure. Back to the start — 3 more chances!";
    await wait(1400);
    startRound();
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
    resetRoundCounters();
    setStep(0);
    if (!drawNextQuestion()) {
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
    // Start-of-game pirate call
    playWalkThePlankVoice();
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

  // Lead-in / transition screen: play once on first interaction (autoplay blocked otherwise)
  let leadInVoicePlayed = false;
  function playLeadInVoiceOnce(event) {
    if (leadInVoicePlayed || startPanel.hidden) return;
    // Play button has its own start-of-game cue in beginGame
    if (event.target.closest("#play-btn")) return;
    leadInVoicePlayed = true;
    ensureAudio();
    playWalkThePlankVoice();
  }
  startPanel.addEventListener("pointerdown", playLeadInVoiceOnce);

  buildPiratePicker();
  updatePlayEnabled();
  refreshLeaderboard();
})();
