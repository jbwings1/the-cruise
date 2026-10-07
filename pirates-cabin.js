(() => {
  const stage = document.getElementById("cabin-stage");
  const world = document.getElementById("cabin-world");
  if (!stage || !world) return;

  // Standing at the door (centered L/R), facing the stern.
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
  let calibrateTarget = "desk"; // "desk" | "rum"

  function applyLook() {
    // Pure yaw at room center — equal distance to all walls, no slide/orbit.
    world.style.transform =
      "translateZ(var(--cabin-cam-z)) rotateY(" +
      (-yaw).toFixed(3) +
      "deg) translate3d(" +
      "calc(var(--cabin-half-w) * var(--cabin-stand-x) * -1), 0, " +
      "calc(var(--cabin-stand-z) * -1))";
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
    if (
      e.target.closest(
        "a, button, .cabin-calibrate, .cabin-prop-desk, .cabin-prop-rum, .cabin-prop-dagger"
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

  /* ——— Desk / rum / dagger pose calibrator ——— */
  const PROP_NAMES = ["desk", "rum", "dagger"];
  const PROPS = {
    desk: {
      el: document.getElementById("cabin-desk"),
      storageKey: "cruise-cabin-desk-pose-v2",
      cssPrefix: "desk",
      label: "desk",
      help: "Drag the desk to slide it. Alt-drag to tilt feet to the floor.",
      defaultPose: {
        x: 0.02,
        y: 1.035,
        z: -0.375,
        rx: 7.5,
        rz: 0,
        scale: 0.34,
      },
      clamp: {
        x: [-0.45, 0.45],
        y: [0.55, 1.25],
        z: [-0.98, -0.1],
        rx: [-25, 35],
        rz: [-20, 20],
        scale: [0.14, 0.55],
      },
    },
    rum: {
      el: document.getElementById("cabin-rum"),
      storageKey: "cruise-cabin-rum-pose-v2",
      cssPrefix: "rum",
      label: "rum",
      help: "Drag the bottle onto the desk. Alt-drag to tilt.",
      defaultPose: {
        x: 0.244,
        y: 0.41,
        z: -0.43,
        rx: 7.5,
        rz: 0,
        scale: 0.027,
      },
      clamp: {
        x: [-0.45, 0.45],
        y: [0.35, 1.15],
        z: [-0.98, -0.1],
        rx: [-25, 35],
        rz: [-25, 25],
        scale: [0.02, 0.18],
      },
    },
    dagger: {
      el: document.getElementById("cabin-dagger"),
      storageKey: "cruise-cabin-dagger-pose-v2",
      cssPrefix: "dagger",
      label: "dagger",
      help: "Stab the tip into the desk. Alt-drag to tilt the blade.",
      defaultPose: {
        x: -0.06,
        y: 0.51,
        z: -0.415,
        rx: 18,
        rz: -12,
        scale: 0.021,
      },
      clamp: {
        x: [-0.45, 0.45],
        y: [0.25, 1.15],
        z: [-0.98, -0.1],
        rx: [-35, 45],
        rz: [-45, 45],
        scale: [0.015, 0.16],
      },
    },
  };

  const poses = {
    desk: { ...PROPS.desk.defaultPose },
    rum: { ...PROPS.rum.defaultPose },
    dagger: { ...PROPS.dagger.defaultPose },
  };

  const calibratePanel = document.getElementById("cabin-calibrate");
  const calibrateTitle = document.getElementById("cabin-calibrate-title");
  const calibrateHelp = document.getElementById("cabin-calibrate-help");
  const calibrateCoords = document.getElementById("cabin-calibrate-coords");
  const calibrateCopyBtn = document.getElementById("cabin-calibrate-copy");
  const calibrateCloseBtn = document.getElementById("cabin-calibrate-close");
  const moveDeskBtn = document.getElementById("cabin-move-desk");
  const moveRumBtn = document.getElementById("cabin-move-rum");
  const moveDaggerBtn = document.getElementById("cabin-move-dagger");

  function syncCalibrateBodyClass() {
    PROP_NAMES.forEach((name) => {
      document.body.classList.toggle(
        "is-calibrating-" + name,
        calibrating && calibrateTarget === name
      );
    });
  }

  let propDrag = null;

  function loadPose(name) {
    const meta = PROPS[name];
    try {
      const raw = localStorage.getItem(meta.storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object") return;
      const d = meta.defaultPose;
      poses[name] = {
        x: Number.isFinite(parsed.x) ? parsed.x : d.x,
        y: Number.isFinite(parsed.y) ? parsed.y : d.y,
        z: Number.isFinite(parsed.z) ? parsed.z : d.z,
        rx: Number.isFinite(parsed.rx) ? parsed.rx : d.rx,
        rz: Number.isFinite(parsed.rz) ? parsed.rz : d.rz,
        scale: Number.isFinite(parsed.scale) ? parsed.scale : d.scale,
      };
    } catch {
      /* ignore */
    }
  }

  function savePose(name) {
    try {
      localStorage.setItem(PROPS[name].storageKey, JSON.stringify(poses[name]));
    } catch {
      /* ignore */
    }
  }

  function clampPose(name) {
    const pose = poses[name];
    const c = PROPS[name].clamp;
    pose.x = Math.max(c.x[0], Math.min(c.x[1], pose.x));
    pose.y = Math.max(c.y[0], Math.min(c.y[1], pose.y));
    pose.z = Math.max(c.z[0], Math.min(c.z[1], pose.z));
    pose.rx = Math.max(c.rx[0], Math.min(c.rx[1], pose.rx));
    pose.rz = Math.max(c.rz[0], Math.min(c.rz[1], pose.rz));
    pose.scale = Math.max(c.scale[0], Math.min(c.scale[1], pose.scale));
  }

  function applyPropPose(name) {
    const meta = PROPS[name];
    const el = meta.el;
    const pose = poses[name];
    if (!el) return;
    const p = meta.cssPrefix;
    el.style.setProperty(`--${p}-x`, String(pose.x));
    el.style.setProperty(`--${p}-y`, String(pose.y));
    el.style.setProperty(`--${p}-z`, String(pose.z));
    el.style.setProperty(`--${p}-rx`, pose.rx.toFixed(2) + "deg");
    el.style.setProperty(`--${p}-rz`, pose.rz.toFixed(2) + "deg");
    el.style.setProperty(`--${p}-scale`, String(pose.scale));
    if (calibrating && name === calibrateTarget && calibrateCoords) {
      calibrateCoords.textContent =
        `${name}  x: ${pose.x.toFixed(3)}  y: ${pose.y.toFixed(3)}  z: ${pose.z.toFixed(3)}\n` +
        `tilt(rx): ${pose.rx.toFixed(1)}°  twist(rz): ${pose.rz.toFixed(1)}°  scale: ${pose.scale.toFixed(3)}`;
    }
  }

  function applyAllPoses() {
    PROP_NAMES.forEach(applyPropPose);
  }

  function nudge(axis, dir, fine) {
    const pose = poses[calibrateTarget];
    const small = calibrateTarget === "rum" || calibrateTarget === "dagger";
    const step = {
      x: fine ? 0.002 : 0.012,
      y: fine ? 0.002 : 0.01,
      z: fine ? 0.003 : 0.015,
      rx: fine ? 0.25 : 1.5,
      rz: fine ? 0.25 : 1.5,
      scale: fine ? (small ? 0.001 : 0.002) : small ? 0.004 : 0.01,
    }[axis];
    if (!step) return;
    pose[axis] += dir * step;
    clampPose(calibrateTarget);
    savePose(calibrateTarget);
    applyPropPose(calibrateTarget);
  }

  function syncTargetButtons() {
    if (!calibratePanel) return;
    calibratePanel.querySelectorAll("[data-target]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.target === calibrateTarget);
    });
    const meta = PROPS[calibrateTarget];
    if (calibrateTitle) {
      calibrateTitle.textContent = "Move " + (meta ? meta.label : calibrateTarget);
    }
    if (calibrateHelp) {
      calibrateHelp.textContent = meta
        ? meta.help
        : "Drag to slide. Alt-drag to tilt.";
    }
  }

  function setCalibrating(on, target) {
    if (target) calibrateTarget = target;
    calibrating = on;
    syncCalibrateBodyClass();
    if (calibratePanel) calibratePanel.hidden = !on;
    if (on) {
      yaw = targetYaw = 0;
      applyLook();
      syncTargetButtons();
      applyPropPose(calibrateTarget);
    }
  }

  function switchTarget(target) {
    if (!PROPS[target]) return;
    calibrateTarget = target;
    syncCalibrateBodyClass();
    syncTargetButtons();
    applyPropPose(calibrateTarget);
  }

  PROP_NAMES.forEach(loadPose);
  applyAllPoses();

  const params = new URLSearchParams(window.location.search);
  if (params.has("calibrate") || window.location.hash === "#calibrate") {
    const t = params.get("calibrate");
    setCalibrating(true, PROPS[t] ? t : "desk");
  }

  if (moveDeskBtn) {
    moveDeskBtn.addEventListener("click", (e) => {
      e.preventDefault();
      setCalibrating(true, "desk");
    });
  }
  if (moveRumBtn) {
    moveRumBtn.addEventListener("click", (e) => {
      e.preventDefault();
      setCalibrating(true, "rum");
    });
  }
  if (moveDaggerBtn) {
    moveDaggerBtn.addEventListener("click", (e) => {
      e.preventDefault();
      setCalibrating(true, "dagger");
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
    calibratePanel.querySelectorAll("[data-target]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        if (!calibrating) setCalibrating(true, btn.dataset.target);
        else switchTarget(btn.dataset.target);
      });
    });
  }

  if (calibrateCopyBtn) {
    calibrateCopyBtn.addEventListener("click", async () => {
      const pose = poses[calibrateTarget];
      const text =
        `${calibrateTarget}\n` +
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

  function bindPropDrag(name) {
    const el = PROPS[name].el;
    if (!el) return;

    el.addEventListener("pointerdown", (e) => {
      if (!calibrating || calibrateTarget !== name) return;
      e.preventDefault();
      e.stopPropagation();
      propDrag = {
        name,
        id: e.pointerId,
        lastX: e.clientX,
        lastY: e.clientY,
        alt: e.altKey,
      };
      el.classList.add("is-dragging-prop");
      try {
        el.setPointerCapture(e.pointerId);
      } catch (_) {
        /* ignore */
      }
    });

    el.addEventListener("pointermove", (e) => {
      if (!propDrag || propDrag.name !== name || e.pointerId !== propDrag.id) {
        return;
      }
      const dx = e.clientX - propDrag.lastX;
      const dy = e.clientY - propDrag.lastY;
      propDrag.lastX = e.clientX;
      propDrag.lastY = e.clientY;
      const pose = poses[name];
      if (propDrag.alt || e.altKey) {
        pose.rx += dy * 0.08;
        pose.rz += dx * 0.05;
      } else {
        pose.x += dx * 0.0009;
        pose.y += dy * 0.0009;
      }
      clampPose(name);
      savePose(name);
      applyPropPose(name);
    });

    const endDrag = (e) => {
      if (!propDrag || propDrag.name !== name || e.pointerId !== propDrag.id) {
        return;
      }
      propDrag = null;
      el.classList.remove("is-dragging-prop");
    };
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
  }

  PROP_NAMES.forEach(bindPropDrag);

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
    } else if (e.key === "1") {
      switchTarget("desk");
      e.preventDefault();
    } else if (e.key === "2") {
      switchTarget("rum");
      e.preventDefault();
    } else if (e.key === "3") {
      switchTarget("dagger");
      e.preventDefault();
    } else if (e.key === "Escape") {
      setCalibrating(false);
      e.preventDefault();
    }
  });

  window.__getDeskPose = () => ({ ...poses.desk });
  window.__getRumPose = () => ({ ...poses.rum });
  window.__getDaggerPose = () => ({ ...poses.dagger });
  window.__setDeskPose = (next = {}) => {
    poses.desk = { ...poses.desk, ...next };
    clampPose("desk");
    savePose("desk");
    applyPropPose("desk");
  };
  window.__setRumPose = (next = {}) => {
    poses.rum = { ...poses.rum, ...next };
    clampPose("rum");
    savePose("rum");
    applyPropPose("rum");
  };
  window.__setDaggerPose = (next = {}) => {
    poses.dagger = { ...poses.dagger, ...next };
    clampPose("dagger");
    savePose("dagger");
    applyPropPose("dagger");
  };
})();
