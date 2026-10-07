(() => {
  const stage = document.getElementById("cabin-stage");
  const world = document.getElementById("cabin-world");
  if (!stage || !world) return;

  // Standing near the door, facing the stern.
  // yaw 0 = stern; +yaw looks toward starboard; -yaw toward port.
  // Rotate only — no pitch. Pivot is --cabin-stand-x / --cabin-stand-z.
  let yaw = 0;
  let targetYaw = 0;

  const DRAG_SENS = 0.18;
  const KEY_STEP = 2.4;
  const LERP = 0.18;

  let dragging = false;
  let lastX = 0;
  let activePointer = null;
  const keys = new Set();
  let holdDir = 0; // -1 left, +1 right from bottom buttons
  let calibrating = false;

  function applyLook() {
    world.style.transform =
      "translateZ(var(--cabin-cam-z)) rotateY(" +
      (-yaw).toFixed(3) +
      "deg) translate3d(" +
      "calc(var(--cabin-half-w) * var(--cabin-stand-x) * -1), 0, " +
      "calc(var(--cabin-stand-z) * -1))";
  }

  function tick() {
    // Inverted so ‹ / left turns the view the way the chevrons read.
    if (!calibrating) {
      if (
        keys.has("ArrowLeft") ||
        keys.has("a") ||
        keys.has("A") ||
        holdDir < 0
      ) {
        targetYaw += KEY_STEP;
      }
      if (
        keys.has("ArrowRight") ||
        keys.has("d") ||
        keys.has("D") ||
        holdDir > 0
      ) {
        targetYaw -= KEY_STEP;
      }
    }

    yaw += (targetYaw - yaw) * LERP;
    if (yaw > 360 || yaw < -360) {
      yaw %= 360;
      targetYaw %= 360;
    }
    applyLook();
    requestAnimationFrame(tick);
  }

  function onPointerDown(e) {
    if (e.target.closest("a, button, .cabin-calibrate, .cabin-chest-prop")) {
      return;
    }
    dragging = true;
    activePointer = e.pointerId;
    lastX = e.clientX;
    stage.classList.add("is-dragging");
    try {
      stage.setPointerCapture(e.pointerId);
    } catch (_) {
      /* ignore */
    }
  }

  function bindHoldButton(btn, dir) {
    if (!btn) return;
    const start = (e) => {
      e.preventDefault();
      e.stopPropagation();
      holdDir = dir;
      btn.classList.add("is-held");
    };
    const stop = (e) => {
      if (e) e.preventDefault();
      if (holdDir === dir) holdDir = 0;
      btn.classList.remove("is-held");
    };
    btn.addEventListener("pointerdown", start);
    btn.addEventListener("pointerup", stop);
    btn.addEventListener("pointerleave", stop);
    btn.addEventListener("pointercancel", stop);
    btn.addEventListener("lostpointercapture", stop);
  }

  bindHoldButton(document.getElementById("cabin-turn-left"), -1);
  bindHoldButton(document.getElementById("cabin-turn-right"), 1);

  function onPointerMove(e) {
    if (!dragging || e.pointerId !== activePointer) return;
    const dx = e.clientX - lastX;
    lastX = e.clientX;
    targetYaw -= dx * DRAG_SENS;
  }

  function onPointerUp(e) {
    if (e.pointerId !== activePointer) return;
    dragging = false;
    activePointer = null;
    stage.classList.remove("is-dragging");
  }

  stage.addEventListener("pointerdown", onPointerDown);
  stage.addEventListener("pointermove", onPointerMove);
  stage.addEventListener("pointerup", onPointerUp);
  stage.addEventListener("pointercancel", onPointerUp);
  stage.addEventListener("lostpointercapture", onPointerUp);

  window.addEventListener("keydown", (e) => {
    if (calibrating) return;
    if (
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "a" ||
      e.key === "A" ||
      e.key === "d" ||
      e.key === "D"
    ) {
      keys.add(e.key);
      e.preventDefault();
    }
  });

  window.addEventListener("keyup", (e) => {
    keys.delete(e.key);
  });

  stage.querySelectorAll("img").forEach((img) => {
    img.addEventListener("dragstart", (e) => e.preventDefault());
  });

  applyLook();
  requestAnimationFrame(tick);

  window.__setCabinLook = (y = 0) => {
    yaw = targetYaw = y;
    applyLook();
  };

  const doorExit = document.querySelector(".cabin-door-exit");
  if (doorExit) {
    doorExit.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const href = doorExit.getAttribute("data-href") || "index.html";
      window.location.href = href;
    });
  }

  /* ——— Side-wall lantern toggles ——— */
  const LANTERN_ON = "images/cabin-lantern-on.png?v=1";
  const LANTERN_OFF = "images/cabin-lantern-off.png?v=1";

  function syncLanternRoomLight() {
    const port = document.getElementById("cabin-lantern-port");
    const starboard = document.getElementById("cabin-lantern-starboard");
    document.body.classList.toggle(
      "cabin-lit-port",
      !!(port && port.classList.contains("is-on"))
    );
    document.body.classList.toggle(
      "cabin-lit-starboard",
      !!(starboard && starboard.classList.contains("is-on"))
    );
  }

  function setLantern(btn, on) {
    if (!btn) return;
    const img = btn.querySelector(".cabin-lantern-img");
    const side = btn.id === "cabin-lantern-port" ? "Port" : "Starboard";
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute(
      "aria-label",
      side + " lantern — click to turn " + (on ? "off" : "on")
    );
    if (img) img.src = on ? LANTERN_ON : LANTERN_OFF;
    syncLanternRoomLight();
  }

  document.querySelectorAll(".cabin-lantern").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      setLantern(btn, !btn.classList.contains("is-on"));
    });
    // keep click from starting a look-drag
    btn.addEventListener("pointerdown", (e) => e.stopPropagation());
  });

  syncLanternRoomLight();

  /* ——— Starboard chest pose calibrator ——— */
  const chestEl = document.getElementById("cabin-chest");
  const calibratePanel = document.getElementById("cabin-calibrate");
  const calibrateCoords = document.getElementById("cabin-calibrate-coords");
  const calibrateCopyBtn = document.getElementById("cabin-calibrate-copy");
  const calibrateCloseBtn = document.getElementById("cabin-calibrate-close");
  const moveChestBtn = document.getElementById("cabin-move-chest");
  const CHEST_STORAGE = "cruise-cabin-chest-pose-v1";
  const chestDefault = { left: 15, bottom: 0.5, w: 24, h: 30 };
  const chestClamp = {
    left: [-5, 70],
    bottom: [-5, 40],
    w: [10, 55],
    h: [12, 55],
  };
  let chestPose = { ...chestDefault };
  let chestDrag = null;

  function loadChestPose() {
    try {
      const raw = localStorage.getItem(CHEST_STORAGE);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      chestPose = {
        left: Number.isFinite(parsed.left) ? parsed.left : chestDefault.left,
        bottom: Number.isFinite(parsed.bottom)
          ? parsed.bottom
          : chestDefault.bottom,
        w: Number.isFinite(parsed.w) ? parsed.w : chestDefault.w,
        h: Number.isFinite(parsed.h) ? parsed.h : chestDefault.h,
      };
    } catch {
      /* ignore */
    }
  }

  function saveChestPose() {
    try {
      localStorage.setItem(CHEST_STORAGE, JSON.stringify(chestPose));
    } catch {
      /* ignore */
    }
  }

  function clampChestPose() {
    Object.keys(chestClamp).forEach((k) => {
      const [lo, hi] = chestClamp[k];
      chestPose[k] = Math.max(lo, Math.min(hi, chestPose[k]));
    });
  }

  function applyChestPose() {
    if (!chestEl) return;
    chestEl.style.setProperty("--chest-left", String(chestPose.left));
    chestEl.style.setProperty("--chest-bottom", String(chestPose.bottom));
    chestEl.style.setProperty("--chest-w", String(chestPose.w));
    chestEl.style.setProperty("--chest-h", String(chestPose.h));
    if (calibrating && calibrateCoords) {
      calibrateCoords.textContent =
        `chest  left: ${chestPose.left.toFixed(1)}  bottom: ${chestPose.bottom.toFixed(1)}\n` +
        `w: ${chestPose.w.toFixed(1)}  h: ${chestPose.h.toFixed(1)}`;
    }
  }

  function nudgeChest(axis, dir, fine) {
    const step = {
      left: fine ? 0.2 : 1.2,
      bottom: fine ? 0.2 : 1.2,
      w: fine ? 0.2 : 1.2,
      h: fine ? 0.2 : 1.2,
    }[axis];
    if (!step) return;
    chestPose[axis] += dir * step;
    clampChestPose();
    saveChestPose();
    applyChestPose();
  }

  function setCalibrating(on) {
    calibrating = on;
    document.body.classList.toggle("is-calibrating-chest", on);
    if (calibratePanel) calibratePanel.hidden = !on;
    if (on) {
      yaw = targetYaw = 90;
      applyLook();
      applyChestPose();
    }
  }

  loadChestPose();
  clampChestPose();
  applyChestPose();

  const params = new URLSearchParams(window.location.search);
  if (params.has("calibrate") || window.location.hash === "#calibrate") {
    setCalibrating(true);
  }

  if (moveChestBtn) {
    moveChestBtn.addEventListener("click", (e) => {
      e.preventDefault();
      setCalibrating(true);
    });
  }
  if (calibrateCloseBtn) {
    calibrateCloseBtn.addEventListener("click", (e) => {
      e.preventDefault();
      setCalibrating(false);
    });
  }
  if (calibratePanel) {
    calibratePanel.addEventListener("pointerdown", (e) => e.stopPropagation());
    calibratePanel.querySelectorAll("[data-nudge]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const [axis, dirStr] = btn.dataset.nudge.split(",");
        nudgeChest(axis, Number(dirStr), e.shiftKey);
      });
    });
  }

  if (calibrateCopyBtn) {
    calibrateCopyBtn.addEventListener("click", async () => {
      const text =
        `chest\n` +
        `left: ${chestPose.left.toFixed(2)}\n` +
        `bottom: ${chestPose.bottom.toFixed(2)}\n` +
        `w: ${chestPose.w.toFixed(2)}\n` +
        `h: ${chestPose.h.toFixed(2)}`;
      try {
        await navigator.clipboard.writeText(text);
        calibrateCopyBtn.textContent = "Copied!";
        setTimeout(() => {
          calibrateCopyBtn.textContent = "Copy pose values";
        }, 1200);
      } catch {
        calibrateCopyBtn.textContent = "Copy failed";
        setTimeout(() => {
          calibrateCopyBtn.textContent = "Copy pose values";
        }, 1200);
      }
    });
  }

  if (chestEl) {
    chestEl.addEventListener("pointerdown", (e) => {
      if (!calibrating) return;
      e.preventDefault();
      e.stopPropagation();
      chestDrag = {
        id: e.pointerId,
        lastX: e.clientX,
        lastY: e.clientY,
      };
      chestEl.classList.add("is-dragging-prop");
      try {
        chestEl.setPointerCapture(e.pointerId);
      } catch (_) {
        /* ignore */
      }
    });

    chestEl.addEventListener("pointermove", (e) => {
      if (!chestDrag || e.pointerId !== chestDrag.id) return;
      const dx = e.clientX - chestDrag.lastX;
      const dy = e.clientY - chestDrag.lastY;
      chestDrag.lastX = e.clientX;
      chestDrag.lastY = e.clientY;
      const face = chestEl.parentElement;
      const rect = face
        ? face.getBoundingClientRect()
        : { width: 400, height: 400 };
      const fw = Math.max(120, rect.width);
      const fh = Math.max(120, rect.height);
      chestPose.left += (dx / fw) * 100;
      chestPose.bottom -= (dy / fh) * 100;
      clampChestPose();
      saveChestPose();
      applyChestPose();
    });

    const endChestDrag = (e) => {
      if (!chestDrag || e.pointerId !== chestDrag.id) return;
      chestDrag = null;
      chestEl.classList.remove("is-dragging-prop");
    };
    chestEl.addEventListener("pointerup", endChestDrag);
    chestEl.addEventListener("pointercancel", endChestDrag);
  }

  window.addEventListener("keydown", (e) => {
    if (!calibrating) return;
    const fine = e.shiftKey;
    if (e.key === "ArrowLeft") {
      nudgeChest("left", -1, fine);
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      nudgeChest("left", 1, fine);
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      nudgeChest("bottom", 1, fine);
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      nudgeChest("bottom", -1, fine);
      e.preventDefault();
    } else if (e.key === "-" || e.key === "_") {
      nudgeChest("w", -1, fine);
      e.preventDefault();
    } else if (e.key === "=" || e.key === "+") {
      nudgeChest("w", 1, fine);
      e.preventDefault();
    } else if (e.key === "[") {
      nudgeChest("h", -1, fine);
      e.preventDefault();
    } else if (e.key === "]") {
      nudgeChest("h", 1, fine);
      e.preventDefault();
    } else if (e.key === "Escape") {
      setCalibrating(false);
      e.preventDefault();
    }
  });

  window.__getChestPose = () => ({ ...chestPose });
  window.__setChestPose = (next = {}) => {
    chestPose = { ...chestPose, ...next };
    clampChestPose();
    saveChestPose();
    applyChestPose();
  };
})();
