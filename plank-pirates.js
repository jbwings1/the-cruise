// Shared pirate portraits for cabin + Walk the Plank.
// Painted roster matches bride/groom ornate coat style.
window.PLANK_PIRATES = {
  guy1: {
    id: "guy1",
    label: "Guy 1",
    gender: "guy",
    src: "images/pirates/guy1.jpg",
  },
  guy2: {
    id: "guy2",
    label: "Guy 2",
    gender: "guy",
    src: "images/pirates/guy2.jpg",
  },
  guy3: {
    id: "guy3",
    label: "Guy 3",
    gender: "guy",
    src: "images/pirates/guy3.jpg",
  },
  gal1: {
    id: "gal1",
    label: "Gal 1",
    gender: "gal",
    src: "images/pirates/gal1.jpg",
  },
  gal2: {
    id: "gal2",
    label: "Gal 2",
    gender: "gal",
    src: "images/pirates/gal2.jpg",
  },
  gal3: {
    id: "gal3",
    label: "Gal 3",
    gender: "gal",
    src: "images/pirates/gal3.jpg",
  },
};

window.PLANK_DEFAULT_PIRATE = "guy1";

window.renderPirateSvg = function renderPirateSvg(pirateId, options = {}) {
  const meta = window.PLANK_PIRATES[pirateId] || window.PLANK_PIRATES.guy1;
  const title = options.title || meta.label;
  const src = meta.src || "images/pirates/guy1.jpg";
  return `
    <img
      class="pirate-portrait"
      src="${src}"
      alt="${title}"
      title="${title}"
      width="384"
      height="512"
      decoding="async"
    />
  `;
};
