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

  /* Coming-soon / interactive props: don't start a look-drag */
  document
    .querySelectorAll(
      ".cabin-coming-hotspot, .cabin-desk-hotspot, .cabin-wall-hotspot, .cabin-sword-hotspot, .cabin-hat-hotspot"
    )
    .forEach((btn) => {
      btn.addEventListener("pointerdown", (e) => e.stopPropagation());
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const href = btn.getAttribute("href");
        if (href) {
          // Ensure stealth coat/hat link navigates even if drag handlers interfere
          e.preventDefault();
          window.location.href = href;
          return;
        }
        e.preventDefault();
      });
    });

  /* Desk map → cruise itinerary lightbox (zoom + pan) */
  const deskMapBtn = document.getElementById("cabin-desk-map");
  const deskMapLightbox = document.getElementById("cabin-desk-map-lightbox");
  if (deskMapBtn && deskMapLightbox) {
    const viewport = document.getElementById("cabin-desk-map-viewport");
    const mapImg = document.getElementById("cabin-desk-map-img");
    const MIN_ZOOM = 1;
    const MAX_ZOOM = 4;
    const ZOOM_STEP = 0.25;
    let scale = 1;
    let tx = 0;
    let ty = 0;
    let dragging = false;
    let dragX = 0;
    let dragY = 0;
    let pointers = new Map();
    let pinchStartDist = 0;
    let pinchStartScale = 1;

    const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

    function applyTransform() {
      if (!mapImg || !viewport) return;
      mapImg.style.transform =
        "translate(" + tx.toFixed(2) + "px," + ty.toFixed(2) + "px) scale(" +
        scale.toFixed(3) + ")";
      viewport.classList.toggle("is-zoomed", scale > 1.01);
    }

    function resetZoom() {
      scale = 1;
      tx = 0;
      ty = 0;
      applyTransform();
    }

    function zoomAt(nextScale, originX, originY) {
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const ox = originX - rect.left;
      const oy = originY - rect.top;
      const prev = scale;
      scale = clamp(nextScale, MIN_ZOOM, MAX_ZOOM);
      if (scale === prev) return;
      // Keep the point under the cursor stable while zooming
      tx = ox - ((ox - tx) * scale) / prev;
      ty = oy - ((oy - ty) * scale) / prev;
      if (scale <= 1.01) {
        scale = 1;
        tx = 0;
        ty = 0;
      }
      applyTransform();
    }

    function bumpZoom(dir, clientX, clientY) {
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const cx = clientX == null ? rect.left + rect.width / 2 : clientX;
      const cy = clientY == null ? rect.top + rect.height / 2 : clientY;
      zoomAt(scale + dir * ZOOM_STEP, cx, cy);
    }

    const closeDeskMapLightbox = () => {
      if (deskMapLightbox.open) deskMapLightbox.close();
    };

    deskMapBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      resetZoom();
      if (typeof deskMapLightbox.showModal === "function") {
        deskMapLightbox.showModal();
      }
    });

    deskMapLightbox.addEventListener("close", resetZoom);

    const closeBtn = deskMapLightbox.querySelector(".cabin-lightbox-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", (e) => {
        e.preventDefault();
        closeDeskMapLightbox();
      });
    }

    deskMapLightbox.addEventListener("click", (e) => {
      if (e.target === deskMapLightbox) closeDeskMapLightbox();
    });

    deskMapLightbox.querySelectorAll("[data-zoom]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const mode = btn.getAttribute("data-zoom");
        if (mode === "in") bumpZoom(1);
        else if (mode === "out") bumpZoom(-1);
        else resetZoom();
      });
    });

    if (viewport) {
      viewport.addEventListener(
        "wheel",
        (e) => {
          e.preventDefault();
          const dir = e.deltaY < 0 ? 1 : -1;
          bumpZoom(dir, e.clientX, e.clientY);
        },
        { passive: false }
      );

      viewport.addEventListener("dblclick", (e) => {
        e.preventDefault();
        if (scale > 1.01) resetZoom();
        else zoomAt(2, e.clientX, e.clientY);
      });

      viewport.addEventListener("pointerdown", (e) => {
        viewport.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 1) {
          dragging = true;
          dragX = e.clientX - tx;
          dragY = e.clientY - ty;
          viewport.classList.add("is-dragging");
        } else if (pointers.size === 2) {
          dragging = false;
          const pts = [...pointers.values()];
          const dx = pts[0].x - pts[1].x;
          const dy = pts[0].y - pts[1].y;
          pinchStartDist = Math.hypot(dx, dy) || 1;
          pinchStartScale = scale;
        }
      });

      viewport.addEventListener("pointermove", (e) => {
        if (!pointers.has(e.pointerId)) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 2) {
          const pts = [...pointers.values()];
          const dx = pts[0].x - pts[1].x;
          const dy = pts[0].y - pts[1].y;
          const dist = Math.hypot(dx, dy) || 1;
          const midX = (pts[0].x + pts[1].x) / 2;
          const midY = (pts[0].y + pts[1].y) / 2;
          zoomAt(pinchStartScale * (dist / pinchStartDist), midX, midY);
          return;
        }
        if (!dragging || scale <= 1.01) return;
        tx = e.clientX - dragX;
        ty = e.clientY - dragY;
        applyTransform();
      });

      const endPointer = (e) => {
        pointers.delete(e.pointerId);
        if (pointers.size < 2) {
          pinchStartDist = 0;
        }
        if (pointers.size === 0) {
          dragging = false;
          viewport.classList.remove("is-dragging");
        } else if (pointers.size === 1) {
          const only = [...pointers.values()][0];
          dragging = true;
          dragX = only.x - tx;
          dragY = only.y - ty;
        }
      };
      viewport.addEventListener("pointerup", endPointer);
      viewport.addEventListener("pointercancel", endPointer);
      viewport.addEventListener("lostpointercapture", endPointer);
    }
  }

  syncLanternRoomLight();
})();
