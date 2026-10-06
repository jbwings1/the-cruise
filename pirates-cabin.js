(() => {
  const statueEl = document.getElementById("champion-statue");
  const figureEl = document.getElementById("champion-figure");
  const nameEl = document.getElementById("champion-name");
  const gemsEl = document.getElementById("champion-gems");

  async function loadChampion() {
    if (!window.PlankLeaderboard || !figureEl || !statueEl) return;
    const scores = await window.PlankLeaderboard.fetchTopScores(1);
    const top = scores[0];
    if (!top) {
      statueEl.classList.add("is-empty");
      figureEl.innerHTML = "";
      figureEl.setAttribute("aria-hidden", "true");
      nameEl.textContent = "No champion yet";
      gemsEl.textContent = "Walk the plank to claim the pedestal";
      return;
    }
    statueEl.classList.remove("is-empty");
    figureEl.innerHTML = window.renderPirateSvg(top.pirate_id, {
      title: `${top.display_name} champion statue`,
    });
    figureEl.removeAttribute("aria-hidden");
    nameEl.textContent = top.display_name;
    gemsEl.textContent = `${top.gems} gem${top.gems === 1 ? "" : "s"}`;
  }

  loadChampion();
})();
