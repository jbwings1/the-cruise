(() => {
  const root = document.getElementById("hub-chest");
  if (!root) return;

  const FRAME_COUNT = 10;
  const FRAME_MS = 220;
  const stage = root.querySelector(".hub-chest-stage");
  const glow = root.querySelector(".hub-chest-glow");
  const veil = document.getElementById("hub-chest-veil");
  const imgs = [];
  let frame = 0;
  let playing = false;
  let timer = 0;

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
      // Glow ramps with the open from the first frame
      const glowT = Math.min(1, Math.max(0, t / 0.55));
      const ease = Math.sqrt(glowT);
      glow.style.opacity = String(0.35 + ease * 0.65);
      glow.style.transform =
        "translateX(-50%) scale(" + (0.85 + ease * 1.25).toFixed(3) + ")";
    }
  }

  function stop() {
    playing = false;
    if (timer) {
      clearTimeout(timer);
      timer = 0;
    }
  }

  function startGlowAndFade() {
    if (glow) {
      glow.style.opacity = "0.45";
      glow.style.transform = "translateX(-50%) scale(1.05)";
    }
    if (veil) {
      veil.hidden = false;
      // force reflow so transition runs
      void veil.offsetWidth;
      veil.classList.add("is-on");
    }
  }

  function goToCabin() {
    window.location.href = "pirates-cabin.html";
  }

  function playOpen() {
    if (playing || root.classList.contains("is-opening")) return;
    root.classList.add("is-opening");
    playing = true;
    // Glow + page fade begin with the open, not after it finishes
    startGlowAndFade();
    show(0);
    const step = () => {
      if (!playing) return;
      if (frame >= FRAME_COUNT - 1) {
        playing = false;
        // Short beat after last frame while the veil finishes filling
        window.setTimeout(goToCabin, 350);
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
  // Idle closed frame should not hold a residual glow
  if (glow) {
    glow.style.opacity = "0";
    glow.style.transform = "translateX(-50%) scale(0.65)";
  }
})();
