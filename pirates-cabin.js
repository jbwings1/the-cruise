(() => {
  const lookEl = document.getElementById("cabin-look");
  const worldEl = document.getElementById("cabin-world");
  const sceneEl = document.getElementById("cabin-scene");
  const panoEl = document.getElementById("cabin-pano");
  const leftBtn = document.getElementById("cabin-turn-left");
  const rightBtn = document.getElementById("cabin-turn-right");
  const hotspot = document.getElementById("plank-hotspot");
  if (!lookEl || !worldEl || !panoEl) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let look = 0.68; // start facing the cutlass wall
  let maxOffset = 0;
  let dragging = false;
  let dragMoved = false;
  let dragStartX = 0;
  let dragStartLook = 0;
  let pointerId = null;

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function measure() {
    const viewW = lookEl.clientWidth;
    const sceneW =
      (sceneEl && sceneEl.getBoundingClientRect().width) ||
      panoEl.getBoundingClientRect().width ||
      panoEl.naturalWidth;
    worldEl.style.width = `${sceneW}px`;
    maxOffset = Math.max(0, sceneW - viewW);
    apply();
  }

  function apply() {
    look = clamp(look, 0, 1);
    const x = -look * maxOffset;
    worldEl.style.transform = `translate3d(${x}px, 0, 0)`;
    if (leftBtn) leftBtn.disabled = look <= 0.001;
    if (rightBtn) rightBtn.disabled = look >= 0.999;
  }

  function nudge(delta) {
    look += delta;
    apply();
  }

  panoEl.addEventListener("load", measure);
  if (panoEl.complete) measure();
  window.addEventListener("resize", measure);

  lookEl.addEventListener("pointerdown", (e) => {
    if (e.target.closest("a, button")) return;
    dragging = true;
    dragMoved = false;
    pointerId = e.pointerId;
    dragStartX = e.clientX;
    dragStartLook = look;
    lookEl.classList.add("is-dragging");
    lookEl.setPointerCapture?.(pointerId);
  });

  lookEl.addEventListener("pointermove", (e) => {
    if (!dragging || e.pointerId !== pointerId) return;
    const dx = e.clientX - dragStartX;
    if (Math.abs(dx) > 3) dragMoved = true;
    const span = maxOffset || lookEl.clientWidth;
    look = dragStartLook - dx / span;
    apply();
  });

  function endDrag(e) {
    if (!dragging || (e && e.pointerId !== pointerId)) return;
    dragging = false;
    pointerId = null;
    lookEl.classList.remove("is-dragging");
  }

  lookEl.addEventListener("pointerup", endDrag);
  lookEl.addEventListener("pointercancel", endDrag);
  lookEl.addEventListener("lostpointercapture", endDrag);

  lookEl.addEventListener(
    "wheel",
    (e) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY) && Math.abs(e.deltaY) < 2) return;
      e.preventDefault();
      const delta = (e.deltaX || e.deltaY) / (maxOffset || lookEl.clientWidth);
      nudge(delta * (reduceMotion ? 0.35 : 0.55));
    },
    { passive: false }
  );

  window.addEventListener("keydown", (e) => {
    const step = reduceMotion ? 0.06 : 0.1;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      nudge(-step);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      nudge(step);
    }
  });

  leftBtn?.addEventListener("click", () => nudge(reduceMotion ? -0.1 : -0.16));
  rightBtn?.addEventListener("click", () => nudge(reduceMotion ? 0.1 : 0.16));

  // Ensure sword click always navigates even if a parent gesture interferes.
  hotspot?.addEventListener("click", (e) => {
    e.stopPropagation();
    if (dragMoved) return;
  });
})();
