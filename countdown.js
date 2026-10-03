(() => {
  const root = document.getElementById("cruise-countdown");
  if (!root) return;

  const sailAt = new Date(root.dataset.sail).getTime();
  const daysEl = root.querySelector('[data-unit="days"]');
  const hoursEl = root.querySelector('[data-unit="hours"]');
  const minutesEl = root.querySelector('[data-unit="minutes"]');
  const secondsEl = root.querySelector('[data-unit="seconds"]');
  const labelEl = root.querySelector(".hub-countdown-label");

  function tick() {
    const diff = sailAt - Date.now();

    if (diff <= 0) {
      daysEl.textContent = "0";
      hoursEl.textContent = "0";
      minutesEl.textContent = "0";
      secondsEl.textContent = "0";
      if (labelEl) labelEl.textContent = "Bon voyage — sail day is here!";
      return;
    }

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    daysEl.textContent = String(days);
    hoursEl.textContent = String(hours).padStart(2, "0");
    minutesEl.textContent = String(minutes).padStart(2, "0");
    secondsEl.textContent = String(seconds).padStart(2, "0");
  }

  tick();
  setInterval(tick, 1000);
})();
