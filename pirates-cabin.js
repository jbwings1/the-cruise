(() => {
  const stage = document.getElementById("cabin-stage");
  const world = document.getElementById("cabin-world");
  if (!stage || !world) return;

  // Standing in front of the door, facing the stern.
  // yaw 0 = stern; +yaw looks toward starboard; -yaw toward port.
  let yaw = 0;
  let pitch = 0;
  let targetYaw = 0;
  let targetPitch = 0;

  const MAX_PITCH = 28;
  const DRAG_SENS = 0.18;
  const KEY_STEP = 2.4;
  const LERP = 0.18;

  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let activePointer = null;
  const keys = new Set();

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function applyLook() {
    world.style.transform =
      "translateZ(var(--cabin-cam-z)) rotateX(" +
      pitch.toFixed(3) +
      "deg) rotateY(" +
      (-yaw).toFixed(3) +
      "deg)";
  }

  function tick() {
    if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A")) {
      targetYaw -= KEY_STEP;
    }
    if (keys.has("ArrowRight") || keys.has("d") || keys.has("D")) {
      targetYaw += KEY_STEP;
    }
    if (keys.has("ArrowUp") || keys.has("w") || keys.has("W")) {
      targetPitch = clamp(targetPitch + KEY_STEP * 0.65, -MAX_PITCH, MAX_PITCH);
    }
    if (keys.has("ArrowDown") || keys.has("s") || keys.has("S")) {
      targetPitch = clamp(targetPitch - KEY_STEP * 0.65, -MAX_PITCH, MAX_PITCH);
    }

    yaw += (targetYaw - yaw) * LERP;
    pitch += (targetPitch - pitch) * LERP;
    // Keep yaw from growing forever
    if (yaw > 360 || yaw < -360) {
      yaw %= 360;
      targetYaw %= 360;
    }
    applyLook();
    requestAnimationFrame(tick);
  }

  function onPointerDown(e) {
    if (e.target.closest("a, button")) return;
    dragging = true;
    activePointer = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    stage.classList.add("is-dragging");
    try {
      stage.setPointerCapture(e.pointerId);
    } catch (_) {
      /* ignore */
    }
  }

  function onPointerMove(e) {
    if (!dragging || e.pointerId !== activePointer) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    targetYaw += dx * DRAG_SENS;
    targetPitch = clamp(targetPitch - dy * DRAG_SENS, -MAX_PITCH, MAX_PITCH);
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
    if (
      e.key === "ArrowLeft" ||
      e.key === "ArrowRight" ||
      e.key === "ArrowUp" ||
      e.key === "ArrowDown" ||
      e.key === "a" ||
      e.key === "A" ||
      e.key === "d" ||
      e.key === "D" ||
      e.key === "w" ||
      e.key === "W" ||
      e.key === "s" ||
      e.key === "S"
    ) {
      keys.add(e.key);
      e.preventDefault();
    }
  });

  window.addEventListener("keyup", (e) => {
    keys.delete(e.key);
  });

  // Prevent image drag ghosts
  stage.querySelectorAll("img").forEach((img) => {
    img.addEventListener("dragstart", (e) => e.preventDefault());
  });

  applyLook();
  requestAnimationFrame(tick);

  // Test / debug helper
  window.__setCabinLook = (y = 0, p = 0) => {
    yaw = targetYaw = y;
    pitch = targetPitch = clamp(p, -MAX_PITCH, MAX_PITCH);
    applyLook();
  };
})();
