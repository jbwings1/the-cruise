// Shared pirate figure SVGs for cabin + Walk the Plank.
window.PLANK_PIRATES = {
  guy1: { id: "guy1", label: "Guy 1", gender: "guy" },
  guy2: { id: "guy2", label: "Guy 2", gender: "guy" },
  guy3: { id: "guy3", label: "Guy 3", gender: "guy" },
  gal1: { id: "gal1", label: "Gal 1", gender: "gal" },
  gal2: { id: "gal2", label: "Gal 2", gender: "gal" },
  gal3: { id: "gal3", label: "Gal 3", gender: "gal" },
};

window.PLANK_DEFAULT_PIRATE = "guy1";

window.renderPirateSvg = function renderPirateSvg(pirateId, options = {}) {
  const meta = window.PLANK_PIRATES[pirateId] || window.PLANK_PIRATES.guy1;
  const title = options.title || meta.label;
  const isGal = meta.gender === "gal";
  const coats = {
    guy1: "#2f5a3a",
    guy2: "#2f4a6b",
    guy3: "#6b2f2f",
    gal1: "#6b2f4a",
    gal2: "#3d5a2f",
    gal3: "#4a2f6b",
  };
  const hairs = {
    guy1: "#2a1810",
    guy2: "#3a2a14",
    guy3: "#1a120c",
    gal1: "#4a2a14",
    gal2: "#2a1810",
    gal3: "#5a3a20",
  };
  const coat = coats[meta.id] || "#2f5a3a";
  const hair = hairs[meta.id] || "#2a1810";
  const skin = isGal ? "#e6b89a" : "#d8a888";

  const body = isGal
    ? `<path d="M22 46 Q32 42 42 46 L46 78 Q32 88 18 78 Z" fill="${coat}" />
       <path d="M24 58 Q32 74 40 58" fill="rgba(255,255,255,0.12)" />`
    : `<path d="M20 48 Q32 42 44 48 L46 78 Q32 84 18 78 Z" fill="${coat}" />
       <path d="M22 50 L18 78" stroke="#e6c15a" stroke-width="2" fill="none" />`;

  const headwear = isGal
    ? `<path d="M16 30 Q12 48 18 58 Q24 48 20 32" fill="${hair}" />
       <path d="M48 30 Q52 48 46 58 Q40 48 44 32" fill="${hair}" />
       <path d="M18 14 Q32 4 46 14 Q40 22 32 20 Q24 22 18 14 Z" fill="#f0d78a" />
       <circle cx="32" cy="12" r="3.2" fill="#e6c15a" />`
    : `<rect x="14" y="18" width="36" height="6" rx="2" fill="#1a120c" />
       <path d="M16 22 L12 18 L52 18 L48 22" fill="#1a120c" />
       <rect x="24" y="26" width="16" height="6" rx="2" fill="#1a120c" opacity="0.85" />`;

  return `
    <svg class="pirate-svg" viewBox="0 0 64 88" role="img" aria-label="${title}">
      <title>${title}</title>
      <ellipse cx="32" cy="84" rx="16" ry="3" fill="rgba(0,0,0,0.25)" />
      ${body}
      <circle cx="32" cy="28" r="14" fill="${skin}" />
      <path d="M18 24 Q32 8 46 24 L44 30 Q32 18 20 30 Z" fill="${hair}" />
      ${headwear}
      <circle cx="26" cy="30" r="1.4" fill="#f4e8d4" />
      <circle cx="38" cy="30" r="1.4" fill="#f4e8d4" />
      <path d="M28 36 Q32 39 36 36" stroke="#8a4a32" stroke-width="1.4" fill="none" />
      <path d="M24 78 L22 86 L28 86 L28 78" fill="#2a1810" />
      <path d="M36 78 L36 86 L42 86 L40 78" fill="#2a1810" />
      <circle cx="48" cy="58" r="4" fill="#c23b3b" />
    </svg>
  `;
};
