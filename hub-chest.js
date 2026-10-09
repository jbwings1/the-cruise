(() => {
  const root = document.getElementById("hub-chest");
  if (!root) return;

  const FRAME_COUNT = 10;
  const FRAME_MS = 220;
  // Start the page fade when the lid is about halfway open
  const FADE_AT_FRAME = Math.floor((FRAME_COUNT - 1) / 2);
  const stage = root.querySelector(".hub-chest-stage");
  const glow = root.querySelector(".hub-chest-glow");
  const veil = document.getElementById("hub-chest-veil");
  const imgs = [];
  let frame = 0;
  let playing = false;
  let timer = 0;
  let fadeStarted = false;

  for (let i = 0; i < FRAME_COUNT; i += 1) {
    const img = document.createElement("img");
    img.src = `images/hub-chest-open/frame-${String(i).padStart(2, "0")}.png?v=2`;
    img.alt = "";
    img.draggable = false;
    img.className = "hub-chest-frame";
    if (i === 0) img.classList.add("is-active");
    stage.appendChild(img);
    imgs.push(img);
  }

  function show(i) {
    frame = Math.max(0, Math.min(FRAME_COUNT - 1, i));
    imgs.forEach((img, idx) => {
      img.classList.toggle("is-active", idx === frame);
    });
    const t = frame / (FRAME_COUNT - 1);
    if (glow) {
      // Local chest glow ramps with the open
      const glowT = Math.min(1, Math.max(0, t / 0.55));
      const ease = Math.sqrt(glowT);
      glow.style.opacity = String(ease * 0.95);
      glow.style.transform =
        "translateX(-50%) scale(" + (0.65 + ease * 1.35).toFixed(3) + ")";
    }
  }

  function startFade() {
    if (fadeStarted || !veil) return;
    fadeStarted = true;
    veil.hidden = false;
    // force reflow so transition runs
    void veil.offsetWidth;
    veil.classList.add("is-on");
  }

  function goToCabin() {
    window.location.href = "pirates-cabin.html";
  }

  function playOpen() {
    if (playing || root.classList.contains("is-opening")) return;
    root.classList.add("is-opening");
    playing = true;
    fadeStarted = false;
    show(0);
    const step = () => {
      if (!playing) return;
      if (frame >= FADE_AT_FRAME) startFade();
      if (frame >= FRAME_COUNT - 1) {
        playing = false;
        startFade();
        window.setTimeout(goToCabin, 450);
        return;
      }
      timer = window.setTimeout(() => {
        show(frame + 1);
        step();
      }, FRAME_MS);
    };
    step();
  }

  root.addEventListener("click", (e) => {
    e.preventDefault();
    playOpen();
  });

  root.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      playOpen();
    }
  });

  show(0);
  if (glow) {
    glow.style.opacity = "0";
    glow.style.transform = "translateX(-50%) scale(0.65)";
  }
})();
