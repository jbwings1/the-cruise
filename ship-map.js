(() => {
  const NOTICE_KEY = "cruiseShipMapExternalNoticeSeen";
  const modal = document.getElementById("leave-modal");
  const continueBtn = document.getElementById("leave-modal-continue");
  const cancelBtn = document.getElementById("leave-modal-cancel");
  const externalLinks = document.querySelectorAll(
    'a[href*="cruisedeckplans.com"]'
  );

  let pendingHref = null;

  function openExternal(href) {
    window.open(href, "_blank", "noopener,noreferrer");
  }

  function showModal(href) {
    pendingHref = href;
    modal.hidden = false;
    continueBtn.focus();
  }

  function hideModal() {
    pendingHref = null;
    modal.hidden = true;
  }

  externalLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      const href = link.href;

      if (localStorage.getItem(NOTICE_KEY) === "1") {
        openExternal(href);
        return;
      }

      showModal(href);
    });
  });

  continueBtn.addEventListener("click", () => {
    const href = pendingHref;
    localStorage.setItem(NOTICE_KEY, "1");
    hideModal();
    if (href) openExternal(href);
  });

  cancelBtn.addEventListener("click", hideModal);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) hideModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.hidden) hideModal();
  });
})();
