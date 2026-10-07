(() => {
  const lookEl = document.getElementById("cabin-look");
  const roomEl = document.getElementById("cabin-room");
  const leftBtn = document.getElementById("cabin-turn-left");
  const rightBtn = document.getElementById("cabin-turn-right");
  const hotspot = document.getElementById("plank-hotspot");
  if (!lookEl || !roomEl) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const MIN_YAW = -88; // look right (sword wall)
  const MAX_YAW = 88; // look left (porthole wall)
  const SWORD_VISIBLE_YAW = -55; // show screen-space sword CTA when facing right enough
  let yaw = 0;
  let dragging = false;
  let dragMoved = false;
  let dragStartX = 0;
  let dragStartYaw = 0;
  let pointerId = null;

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function measure() {
    const w = lookEl.clientWidth;
    const h = lookEl.clientHeight;
    const wallW = Math.max(w, Math.ceil(h * (16 / 9)));
    const wallH = h;
    const wallZ = wallW / 2;
    lookEl.style.setProperty("--cabin-wall-w", `${wallW}px`);
    lookEl.style.setProperty("--cabin-wall-h", `${wallH}px`);
    lookEl.style.setProperty("--cabin-wall-z", `${wallZ}px`);
    apply();
  }

  function apply() {
    yaw = clamp(yaw, MIN_YAW, MAX_YAW);
    roomEl.style.transform = `translateZ(0) rotateY(${yaw}deg)`;
    if (leftBtn) leftBtn.disabled = yaw >= MAX_YAW - 0.5;
    if (rightBtn) rightBtn.disabled = yaw <= MIN_YAW + 0.5;
    if (hotspot) {
      const showSword = yaw <= SWORD_VISIBLE_YAW;
      hotspot.classList.toggle("is-hidden", !showSword);
    }
  }

  function nudge(deltaDeg) {
    yaw += deltaDeg;
    apply();
  }

  measure();
  window.addEventListener("resize", measure);

  lookEl.addEventListener("pointerdown", (e) => {
    if (e.target.closest("a, button")) return;
    dragging = true;
    dragMoved = false;
    pointerId = e.pointerId;
    dragStartX = e.clientX;
    dragStartYaw = yaw;
    lookEl.classList.add("is-dragging");
    lookEl.setPointerCapture?.(pointerId);
  });

  lookEl.addEventListener("pointermove", (e) => {
    if (!dragging || e.pointerId !== pointerId) return;
    const dx = e.clientX - dragStartX;
    if (Math.abs(dx) > 3) dragMoved = true;
    yaw = dragStartYaw + (dx / lookEl.clientWidth) * 120;
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
      const delta = e.deltaX || e.deltaY;
      nudge((delta / lookEl.clientWidth) * 90 * (reduceMotion ? 0.5 : 0.85));
    },
    { passive: false }
  );

  window.addEventListener("keydown", (e) => {
    const step = reduceMotion ? 8 : 14;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      nudge(step);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      nudge(-step);
    }
  });

  leftBtn?.addEventListener("click", () => nudge(reduceMotion ? 18 : 30));
  rightBtn?.addEventListener("click", () => nudge(reduceMotion ? -18 : -30));
})();
