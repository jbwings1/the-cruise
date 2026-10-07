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
      src: "images/cabin-port-wall-v10.jpg?v=1",
      alt: "Port wall with one stern-style window showing a daytime ocean view on the right",
      note: "Port wall · daytime ocean in the window",
    },
    starboard: {
      src: "images/cabin-starboard-wall-v3.jpg?v=1",
      alt: "Starboard wall with one stern-style window showing a daytime ocean view on the left",
      note: "Starboard wall · daytime ocean in the window",
    },
    back: {
      src: "images/cabin-back-wall-v2.jpg?v=1",
      alt: "Empty back wall made from the stern wood with the windows removed",
      note: "Back wall · stern wood without windows",
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
