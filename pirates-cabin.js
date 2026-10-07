(() => {
  const stage = document.getElementById("cabin-stage");
  const world = document.getElementById("cabin-world");
  if (!stage || !world) return;

  // Standing near the door, facing the stern.
  // yaw 0 = stern; +yaw looks toward starboard; -yaw toward port.
  // Rotate only — no pitch. Pivot is shifted toward the door via --cabin-stand-z.
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
    // translateZ(-stand) first (room space) so the yaw pivot sits closer to the door
    world.style.transform =
      "translateZ(var(--cabin-cam-z)) rotateY(" +
      (-yaw).toFixed(3) +
      "deg) translateZ(calc(var(--cabin-stand-z) * -1))";
  }

  function tick() {
    // Inverted so ‹ / left turns the view the way the chevrons read.
    if (
      !calibrating &&
      (keys.has("ArrowLeft") || keys.has("a") || keys.has("A") || holdDir < 0)
    ) {
      targetYaw += KEY_STEP;
    }
    if (
      !calibrating &&
      (keys.has("ArrowRight") || keys.has("d") || keys.has("D") || holdDir > 0)
    ) {
      targetYaw -= KEY_STEP;
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
    if (e.target.closest("a, button, .cabin-calibrate, .cabin-prop-chair")) return;
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

  /* ——— Chair pose calibrator (like Walk the Plank pirate mover) ——— */
  const CHAIR_STORAGE_KEY = "cruise-cabin-chair-pose-v1";
  const DEFAULT_POSE = {
    x: 0,
    y: 0.995,
    z: -0.82,
    rx: 0,
    rz: 0,
    scale: 0.22,
  };

  const chairEl = document.getElementById("cabin-chair");
  const calibratePanel = document.getElementById("cabin-calibrate");
  const calibrateCoords = document.getElementById("cabin-calibrate-coords");
  const calibrateCopyBtn = document.getElementById("cabin-calibrate-copy");
  const moveChairBtn = document.getElementById("cabin-move-chair");
  const calibrateCloseBtn = document.getElementById("cabin-calibrate-close");

  let pose = { ...DEFAULT_POSE };
  let calibrating = false;
  let chairDrag = null;

  function loadPose() {
    try {
      const raw = localStorage.getItem(CHAIR_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      pose = {
        x: Number.isFinite(parsed.x) ? parsed.x : DEFAULT_POSE.x,
        y: Number.isFinite(parsed.y) ? parsed.y : DEFAULT_POSE.y,
        z: Number.isFinite(parsed.z) ? parsed.z : DEFAULT_POSE.z,
        rx: Number.isFinite(parsed.rx) ? parsed.rx : DEFAULT_POSE.rx,
        rz: Number.isFinite(parsed.rz) ? parsed.rz : DEFAULT_POSE.rz,
        scale: Number.isFinite(parsed.scale) ? parsed.scale : DEFAULT_POSE.scale,
      };
    } catch {
      /* ignore */
    }
  }

  function savePose() {
    try {
      localStorage.setItem(CHAIR_STORAGE_KEY, JSON.stringify(pose));
    } catch {
      /* ignore */
    }
  }

  function applyChairPose() {
    if (!chairEl) return;
    chairEl.style.setProperty("--chair-x", String(pose.x));
    chairEl.style.setProperty("--chair-y", String(pose.y));
    chairEl.style.setProperty("--chair-z", String(pose.z));
    chairEl.style.setProperty("--chair-rx", pose.rx.toFixed(2) + "deg");
    chairEl.style.setProperty("--chair-rz", pose.rz.toFixed(2) + "deg");
    chairEl.style.setProperty("--chair-scale", String(pose.scale));
    if (calibrateCoords) {
      calibrateCoords.textContent =
        `x: ${pose.x.toFixed(3)}  y: ${pose.y.toFixed(3)}  z: ${pose.z.toFixed(3)}\n` +
        `tilt(rx): ${pose.rx.toFixed(1)}°  twist(rz): ${pose.rz.toFixed(1)}°  scale: ${pose.scale.toFixed(3)}`;
    }
  }

  function clampPose() {
    pose.x = Math.max(-0.45, Math.min(0.45, pose.x));
    pose.y = Math.max(0.55, Math.min(1.25, pose.y));
    pose.z = Math.max(-0.98, Math.min(-0.15, pose.z));
    pose.rx = Math.max(-25, Math.min(35, pose.rx));
    pose.rz = Math.max(-20, Math.min(20, pose.rz));
    pose.scale = Math.max(0.12, Math.min(0.4, pose.scale));
  }

  function nudge(axis, dir, fine) {
    const step = {
      x: fine ? 0.002 : 0.012,
      y: fine ? 0.002 : 0.01,
      z: fine ? 0.003 : 0.015,
      rx: fine ? 0.25 : 1.5,
      rz: fine ? 0.25 : 1.5,
      scale: fine ? 0.002 : 0.01,
    }[axis];
    if (!step) return;
    pose[axis] += dir * step;
    clampPose();
    savePose();
    applyChairPose();
  }

  function setCalibrating(on) {
    calibrating = on;
    document.body.classList.toggle("is-calibrating-chair", on);
    if (calibratePanel) calibratePanel.hidden = !on;
    if (on) {
      yaw = targetYaw = 0;
      applyLook();
      applyChairPose();
    }
  }

  loadPose();
  applyChairPose();

  if (
    new URLSearchParams(window.location.search).has("calibrate") ||
    window.location.hash === "#calibrate"
  ) {
    setCalibrating(true);
  }

  if (moveChairBtn) {
    moveChairBtn.addEventListener("click", (e) => {
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
        nudge(axis, Number(dirStr), e.shiftKey);
      });
    });
  }

  if (calibrateCopyBtn) {
    calibrateCopyBtn.addEventListener("click", async () => {
      const text =
        `x: ${pose.x.toFixed(4)}\n` +
        `y: ${pose.y.toFixed(4)}\n` +
        `z: ${pose.z.toFixed(4)}\n` +
        `rx: ${pose.rx.toFixed(2)}\n` +
        `rz: ${pose.rz.toFixed(2)}\n` +
        `scale: ${pose.scale.toFixed(4)}`;
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

  if (chairEl) {
    chairEl.addEventListener("pointerdown", (e) => {
      if (!calibrating) return;
      e.preventDefault();
      e.stopPropagation();
      chairDrag = {
        id: e.pointerId,
        lastX: e.clientX,
        lastY: e.clientY,
        alt: e.altKey,
      };
      chairEl.classList.add("is-dragging-chair");
      try {
        chairEl.setPointerCapture(e.pointerId);
      } catch (_) {
        /* ignore */
      }
    });

    chairEl.addEventListener("pointermove", (e) => {
      if (!chairDrag || e.pointerId !== chairDrag.id) return;
      const dx = e.clientX - chairDrag.lastX;
      const dy = e.clientY - chairDrag.lastY;
      chairDrag.lastX = e.clientX;
      chairDrag.lastY = e.clientY;
      if (chairDrag.alt || e.altKey) {
        pose.rx += dy * 0.08;
        pose.rz += dx * 0.05;
      } else {
        pose.x += dx * 0.0009;
        pose.y += dy * 0.0009;
      }
      clampPose();
      savePose();
      applyChairPose();
    });

    const endChairDrag = (e) => {
      if (!chairDrag || e.pointerId !== chairDrag.id) return;
      chairDrag = null;
      chairEl.classList.remove("is-dragging-chair");
    };
    chairEl.addEventListener("pointerup", endChairDrag);
    chairEl.addEventListener("pointercancel", endChairDrag);
  }

  window.addEventListener("keydown", (e) => {
    if (!calibrating) return;
    const fine = e.shiftKey;
    if (e.key === "ArrowLeft") {
      nudge("x", -1, fine);
      e.preventDefault();
    } else if (e.key === "ArrowRight") {
      nudge("x", 1, fine);
      e.preventDefault();
    } else if (e.key === "ArrowUp") {
      nudge("y", -1, fine);
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      nudge("y", 1, fine);
      e.preventDefault();
    } else if (e.key === "[") {
      nudge("z", -1, fine);
      e.preventDefault();
    } else if (e.key === "]") {
      nudge("z", 1, fine);
      e.preventDefault();
    } else if (e.key === ",") {
      nudge("rx", -1, fine);
      e.preventDefault();
    } else if (e.key === ".") {
      nudge("rx", 1, fine);
      e.preventDefault();
    } else if (e.key === "-" || e.key === "_") {
      nudge("scale", -1, fine);
      e.preventDefault();
    } else if (e.key === "=" || e.key === "+") {
      nudge("scale", 1, fine);
      e.preventDefault();
    } else if (e.key === "Escape") {
      setCalibrating(false);
      e.preventDefault();
    }
  });

  window.__getChairPose = () => ({ ...pose });
  window.__setChairPose = (next = {}) => {
    pose = { ...pose, ...next };
    clampPose();
    savePose();
    applyChairPose();
  };
})();
