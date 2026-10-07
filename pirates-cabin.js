(() => {
  const imageEl = document.getElementById("cabin-wall-image");
  const noteEl = document.getElementById("cabin-note");
  const buttons = Array.from(document.querySelectorAll(".cabin-wall-btn"));
  if (!imageEl || !buttons.length) return;

  const walls = {
    stern: {
      src: "images/cabin-stern-wall.jpg?v=4",
      alt: "Empty stern wall with three sunrise ocean windows",
      note: "Stern wall · approved · sunrise in the windows",
    },
    port: {
      src: "images/cabin-port-wall-v8.jpg?v=1",
      alt: "Empty port wall with continuous stern-matched wood planks and no window",
      note: "Port wall · empty wood · same plank width · no tile repeat",
    },
  };

  function showWall(name) {
    const wall = walls[name];
    if (!wall) return;
    imageEl.src = wall.src;
    imageEl.alt = wall.alt;
    if (noteEl) noteEl.textContent = wall.note;
    buttons.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.wall === name);
    });
  }

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => showWall(btn.dataset.wall));
  });
})();
