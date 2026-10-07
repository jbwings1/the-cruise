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
    if (
      e.target.closest(
        "a, button, .cabin-calibrate, .cabin-bookshelf"
      )
    ) {
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

  let calibrating = false;

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

  /* ——— Port bookshelf pose calibrator ——— */
  const shelfEl = document.getElementById("cabin-bookshelf");
  const calibratePanel = document.getElementById("cabin-calibrate");
  const calibrateCoords = document.getElementById("cabin-calibrate-coords");
  const calibrateCopyBtn = document.getElementById("cabin-calibrate-copy");
  const calibrateCloseBtn = document.getElementById("cabin-calibrate-close");
  const moveShelfBtn = document.getElementById("cabin-move-shelf");
  const SHELF_STORAGE = "cruise-cabin-bookshelf-pose-v1";
  const shelfDefault = { left: 50, top: 10, w: 36, h: 88, rot: 0 };
  const shelfClamp = {
    left: [-5, 90],
    top: [-5, 70],
    w: [12, 70],
    h: [30, 100],
    rot: [-15, 15],
  };
  let shelfPose = { ...shelfDefault };
  let shelfDrag = null;

  function loadShelfPose() {
    try {
      const raw = localStorage.getItem(SHELF_STORAGE);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      shelfPose = {
        left: Number.isFinite(parsed.left) ? parsed.left : shelfDefault.left,
        top: Number.isFinite(parsed.top) ? parsed.top : shelfDefault.top,
        w: Number.isFinite(parsed.w) ? parsed.w : shelfDefault.w,
        h: Number.isFinite(parsed.h) ? parsed.h : shelfDefault.h,
        rot: Number.isFinite(parsed.rot) ? parsed.rot : shelfDefault.rot,
      };
    } catch {
      /* ignore */
    }
  }

  function saveShelfPose() {
    try {
      localStorage.setItem(SHELF_STORAGE, JSON.stringify(shelfPose));
    } catch {
      /* ignore */
    }
  }

  function clampShelfPose() {
    Object.keys(shelfClamp).forEach((k) => {
      const [lo, hi] = shelfClamp[k];
      shelfPose[k] = Math.max(lo, Math.min(hi, shelfPose[k]));
    });
  }

  function applyShelfPose() {
    if (!shelfEl) return;
    shelfEl.style.setProperty("--shelf-left", String(shelfPose.left));
    shelfEl.style.setProperty("--shelf-top", String(shelfPose.top));
    shelfEl.style.setProperty("--shelf-w", String(shelfPose.w));
    shelfEl.style.setProperty("--shelf-h", String(shelfPose.h));
    shelfEl.style.setProperty("--shelf-rot", shelfPose.rot.toFixed(2) + "deg");
    if (calibrating && calibrateCoords) {
      calibrateCoords.textContent =
        `bookshelf  left: ${shelfPose.left.toFixed(1)}  top: ${shelfPose.top.toFixed(1)}\n` +
        `w: ${shelfPose.w.toFixed(1)}  h: ${shelfPose.h.toFixed(1)}  rot: ${shelfPose.rot.toFixed(1)}°`;
    }
  }

  function nudgeShelf(axis, dir, fine) {
    const step = {
      left: fine ? 0.2 : 1.2,
      top: fine ? 0.2 : 1.2,
      w: fine ? 0.2 : 1.2,
      h: fine ? 0.2 : 1.2,
      rot: fine ? 0.25 : 1.5,
    }[axis];
    if (!step) return;
    shelfPose[axis] += dir * step;
    clampShelfPose();
    saveShelfPose();
    applyShelfPose();
  }

  function setCalibrating(on) {
    calibrating = on;
    document.body.classList.toggle("is-calibrating-shelf", on);
    if (calibratePanel) calibratePanel.hidden = !on;
    if (on) {
      // Face the port wall while placing the shelf
      yaw = targetYaw = -90;
      applyLook();
      applyShelfPose();
    }
  }

  loadShelfPose();
  clampShelfPose();
  applyShelfPose();

  const params = new URLSearchParams(window.location.search);
  if (params.has("calibrate") || window.location.hash === "#calibrate") {
    setCalibrating(true);
  }

  if (moveShelfBtn) {
    moveShelfBtn.addEventListener("click", (e) => {
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
        nudgeShelf(axis, Number(dirStr), e.shiftKey);
      });
    });
  }

  if (calibrateCopyBtn) {
    calibrateCopyBtn.addEventListener("click", async () => {
      const text =
        `bookshelf\n` +
        `left: ${shelfPose.left.toFixed(2)}\n` +
        `top: ${shelfPose.top.toFixed(2)}\n` +
        `w: ${shelfPose.w.toFixed(2)}\n` +
        `h: ${shelfPose.h.toFixed(2)}\n` +
        `rot: ${shelfPose.rot.toFixed(2)}`;
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

  if (shelfEl) {
    shelfEl.addEventListener("pointerdown", (e) => {
      if (!calibrating) return;
      e.preventDefault();
      e.stopPropagation();
      shelfDrag = {
        id: e.pointerId,
        lastX: e.clientX,
        lastY: e.clientY,
      };
      shelfEl.classList.add("is-dragging-prop");
      try {
        shelfEl.setPointerCapture(e.pointerId);
      } catch (_) {
        /* ignore */
      }
    });

    shelfEl.addEventListener("pointermove", (e) => {
      if (!shelfDrag || e.pointerId !== shelfDrag.id) return;
      const dx = e.clientX - shelfDrag.lastX;
      const dy = e.clientY - shelfDrag.lastY;
      shelfDrag.lastX = e.clientX;
      shelfDrag.lastY = e.clientY;
      // Port wall faces left; drag mapping in wall % of viewport
      const face = shelfEl.parentElement;
      const rect = face ? face.getBoundingClientRect() : { width: 400, height: 400 };
      const w = Math.max(120, rect.width);
      const h = Math.max(120, rect.height);
      shelfPose.left += (dx / w) * 100;
      shelfPose.top += (dy / h) * 100;
      clampShelfPose();
      saveShelfPose();
      applyShelfPose();
    });

    const endShelfDrag = (e) => {
      if (!shelfDrag || e.pointerId !== shelfDrag.id) return;
      shelfDrag = null;
      shelfEl.classList.remove("is-dragging-prop");
    };
    shelfEl.addEventListener("pointerup", endShelfDrag);
    shelfEl.addEventListener("pointercancel", endShelfDrag);
  }

  window.addEventListener("keydown", (e) => {
    if (!calibrating) return;
    const fine = e.shiftKey;
    if (e.key === "ArrowLeft") {
      nudgeShelf("left", -1, fine);
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      nudgeShelf("left", 1, fine);
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      nudgeShelf("top", -1, fine);
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      nudgeShelf("top", 1, fine);
      e.preventDefault();
    } else if (e.key === "-" || e.key === "_") {
      nudgeShelf("w", -1, fine);
      e.preventDefault();
    } else if (e.key === "=" || e.key === "+") {
      nudgeShelf("w", 1, fine);
      e.preventDefault();
    } else if (e.key === "[") {
      nudgeShelf("h", -1, fine);
      e.preventDefault();
    } else if (e.key === "]") {
      nudgeShelf("h", 1, fine);
      e.preventDefault();
    } else if (e.key === ",") {
      nudgeShelf("rot", -1, fine);
      e.preventDefault();
    } else if (e.key === ".") {
      nudgeShelf("rot", 1, fine);
      e.preventDefault();
    } else if (e.key === "Escape") {
      setCalibrating(false);
      e.preventDefault();
    }
  });

  window.__getShelfPose = () => ({ ...shelfPose });
  window.__setShelfPose = (next = {}) => {
    shelfPose = { ...shelfPose, ...next };
    clampShelfPose();
    saveShelfPose();
    applyShelfPose();
  };
})();
