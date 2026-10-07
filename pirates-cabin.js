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
    if (keys.has("ArrowLeft") || keys.has("a") || keys.has("A") || holdDir < 0) {
      targetYaw += KEY_STEP;
    }
    if (keys.has("ArrowRight") || keys.has("d") || keys.has("D") || holdDir > 0) {
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
    if (e.target.closest("a, button")) return;
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
})();
