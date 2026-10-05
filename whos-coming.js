(() => {
  const { url, anonKey } = window.CRUISE_SUPABASE || {};

  const statusEl = document.getElementById("coming-status");
  const countEl = document.getElementById("coming-count");
  const listEl = document.getElementById("coming-list");
  const formEl = document.getElementById("coming-form");
  const partySizeEl = document.getElementById("party-size");
  const guestFieldsEl = document.getElementById("guest-fields");
  const submitBtn = document.getElementById("coming-submit");
  const pendingEl = document.getElementById("pending-list");
  const adminToggle = document.getElementById("host-anchor");
  const adminPanel = document.getElementById("admin-panel");
  const adminLock = document.getElementById("admin-lock");
  const adminTools = document.getElementById("admin-tools");
  const adminPin = document.getElementById("admin-pin");
  const adminUnlock = document.getElementById("admin-unlock");
  const adminCancel = document.getElementById("admin-cancel");
  const adminLockBtn = document.getElementById("admin-lock-btn");

  let adminUnlocked = false;
  let adminPinValue = "";
  /** @type {Map<string, {id: string, party_size: number, booked_through: string, created_at: string, approved_at: string|null, guests: Array<{first_name: string, last_name: string, sort_order: number}>}>} */
  const parties = new Map();

  const BOOKED_LABELS = {
    julia: "Julia (travel agent)",
    royal: "Royal Caribbean direct",
    other: "Other",
  };

  if (!url || !anonKey || !window.supabase) {
    statusEl.textContent =
      "Guest list is not configured yet. Check config.js and try again.";
    statusEl.classList.add("is-error");
    return;
  }

  const supabase = window.supabase.createClient(url, anonKey);

  function setStatus(text, isError = false) {
    statusEl.textContent = text;
    statusEl.classList.toggle("is-error", isError);
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function guestFullName(guest) {
    return `${guest.first_name} ${guest.last_name}`.trim();
  }

  function syncAdminUi() {
    adminLock.hidden = adminUnlocked;
    adminTools.hidden = !adminUnlocked;
    document.body.classList.toggle("is-admin", adminUnlocked);
    if (adminUnlocked) {
      adminPanel.hidden = false;
    }
    renderApproved();
  }

  function openHostAccess() {
    adminPanel.hidden = false;
    if (adminUnlocked) {
      adminLock.hidden = true;
      adminTools.hidden = false;
      return;
    }
    adminLock.hidden = false;
    adminTools.hidden = true;
    adminPin.focus();
  }

  function closeHostPanelIfLocked() {
    if (!adminUnlocked) {
      adminPanel.hidden = true;
      adminPin.value = "";
    }
  }

  function renderGuestFields() {
    const size = Number(partySizeEl.value) || 1;
    const previous = [...guestFieldsEl.querySelectorAll(".guest-row")].map(
      (row) => ({
        first: row.querySelector('[name="firstName"]')?.value || "",
        last: row.querySelector('[name="lastName"]')?.value || "",
      })
    );

    guestFieldsEl.innerHTML = Array.from({ length: size }, (_, index) => {
      const prior = previous[index] || { first: "", last: "" };
      return `
        <div class="guest-row">
          <p class="guest-row-label">Person ${index + 1}</p>
          <div class="guest-name-grid">
            <label class="chat-field">
              <span>First name</span>
              <input
                name="firstName"
                type="text"
                maxlength="40"
                autocomplete="given-name"
                value="${escapeHtml(prior.first)}"
                required
              />
            </label>
            <label class="chat-field">
              <span>Last name</span>
              <input
                name="lastName"
                type="text"
                maxlength="40"
                autocomplete="family-name"
                value="${escapeHtml(prior.last)}"
                required
              />
            </label>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderApproved() {
    const approved = [...parties.values()].sort((a, b) => {
      const aName = guestFullName(a.guests[0] || { first_name: "", last_name: "" });
      const bName = guestFullName(b.guests[0] || { first_name: "", last_name: "" });
      return aName.localeCompare(bName, undefined, { sensitivity: "base" });
    });

    const totalPeople = approved.reduce(
      (sum, party) => sum + (party.guests?.length || party.party_size || 0),
      0
    );
    countEl.textContent =
      totalPeople === 1 ? "1 person" : `${totalPeople} people`;

    if (!approved.length) {
      listEl.innerHTML =
        '<p class="tips-empty">No one on the list yet. Add your party below after you book.</p>';
      return;
    }

    listEl.innerHTML = approved
      .map((party) => {
        const names = (party.guests || [])
          .slice()
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((g) => escapeHtml(guestFullName(g)))
          .join(", ");
        const booked = BOOKED_LABELS[party.booked_through] || party.booked_through;
        return `
          <article class="coming-party" data-id="${party.id}">
            <p class="coming-party-names">${names}</p>
            ${
              adminUnlocked
                ? `<div class="message-actions">
                    <span class="coming-booked-tag">${escapeHtml(booked)}</span>
                    <button type="button" class="admin-btn danger" data-action="delete" data-id="${party.id}">Remove</button>
                  </div>`
                : ""
            }
          </article>
        `;
      })
      .join("");
  }

  function renderPending(pending) {
    if (!adminUnlocked) {
      pendingEl.innerHTML = "";
      return;
    }

    if (!pending.length) {
      pendingEl.innerHTML =
        '<p class="tips-empty">No pending parties right now.</p>';
      return;
    }

    pendingEl.innerHTML = pending
      .map((party) => {
        const names = (party.guests || [])
          .map((g) => escapeHtml(guestFullName(g)))
          .join(", ");
        const booked = BOOKED_LABELS[party.booked_through] || party.booked_through;
        return `
          <article class="coming-party coming-party-pending" data-id="${party.id}">
            <p class="coming-party-names">${names}</p>
            <p class="coming-party-meta">
              ${party.party_size} ${party.party_size === 1 ? "person" : "people"}
              · ${escapeHtml(booked)}
            </p>
            <div class="message-actions">
              <button type="button" class="admin-btn" data-action="approve" data-id="${party.id}">Approve</button>
              <button type="button" class="admin-btn danger" data-action="delete" data-id="${party.id}">Remove</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  async function loadApproved() {
    const { data: partyRows, error: partyError } = await supabase
      .from("cruise_parties")
      .select("id, party_size, booked_through, created_at, approved_at")
      .eq("status", "approved")
      .order("created_at", { ascending: true });

    if (partyError) {
      setStatus("Could not load the guest list. Please refresh.", true);
      console.error(partyError);
      return;
    }

    const ids = (partyRows || []).map((p) => p.id);
    let guestRows = [];
    if (ids.length) {
      const { data, error } = await supabase
        .from("cruise_guests")
        .select("id, party_id, first_name, last_name, sort_order")
        .in("party_id", ids)
        .order("sort_order", { ascending: true });
      if (error) {
        setStatus("Could not load guest names. Please refresh.", true);
        console.error(error);
        return;
      }
      guestRows = data || [];
    }

    parties.clear();
    (partyRows || []).forEach((party) => {
      parties.set(party.id, {
        ...party,
        guests: guestRows
          .filter((g) => g.party_id === party.id)
          .map((g) => ({
            first_name: g.first_name,
            last_name: g.last_name,
            sort_order: g.sort_order,
          })),
      });
    });

    renderApproved();
    setStatus("Live list — approved parties appear here for everyone.");
  }

  async function loadPending() {
    if (!adminUnlocked || !adminPinValue) {
      renderPending([]);
      return;
    }

    const { data, error } = await supabase.rpc("list_pending_cruise_parties", {
      pin: adminPinValue,
    });

    if (error) {
      setStatus("Could not load pending parties.", true);
      console.error(error);
      return;
    }

    renderPending(data || []);
  }

  function subscribe() {
    supabase
      .channel("whos-coming")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cruise_parties" },
        () => {
          loadApproved();
          if (adminUnlocked) loadPending();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "cruise_guests" },
        () => {
          loadApproved();
        }
      )
      .subscribe();
  }

  async function approveParty(partyId) {
    if (!adminPinValue) return;
    const { error } = await supabase.rpc("approve_cruise_party", {
      party_id: partyId,
      pin: adminPinValue,
    });
    if (error) {
      setStatus("Could not approve party.", true);
      console.error(error);
      return;
    }
    setStatus("Party approved.");
    await Promise.all([loadApproved(), loadPending()]);
  }

  async function deleteParty(partyId) {
    if (!adminPinValue) return;
    if (!window.confirm("Remove this party from Who's Coming?")) return;
    const { error } = await supabase.rpc("delete_cruise_party", {
      party_id: partyId,
      pin: adminPinValue,
    });
    if (error) {
      setStatus("Could not remove party.", true);
      console.error(error);
      return;
    }
    parties.delete(partyId);
    setStatus("Party removed.");
    await Promise.all([loadApproved(), loadPending()]);
  }

  partySizeEl.addEventListener("change", renderGuestFields);
  renderGuestFields();

  adminToggle.addEventListener("click", () => {
    if (!adminPanel.hidden && !adminUnlocked) {
      closeHostPanelIfLocked();
      return;
    }
    openHostAccess();
  });

  adminCancel.addEventListener("click", closeHostPanelIfLocked);

  adminUnlock.addEventListener("click", async () => {
    const pin = adminPin.value.trim();
    if (!pin) return;
    const { data, error } = await supabase.rpc("is_moderation_pin", { pin });
    if (error || !data) {
      setStatus("Incorrect PIN.", true);
      return;
    }
    adminPinValue = pin;
    adminUnlocked = true;
    adminPin.value = "";
    setStatus("Host tools unlocked.");
    syncAdminUi();
    await loadPending();
  });

  adminPin.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      adminUnlock.click();
    }
  });

  adminLockBtn.addEventListener("click", () => {
    adminUnlocked = false;
    adminPinValue = "";
    adminPanel.hidden = true;
    syncAdminUi();
    renderPending([]);
    setStatus("Logged out of host tools.");
  });

  document.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    if (action === "approve") approveParty(id);
    if (action === "delete") deleteParty(id);
  });

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();

    const partySize = Number(partySizeEl.value);
    const booked = formEl.querySelector(
      'input[name="bookedThrough"]:checked'
    )?.value;
    const rows = [...guestFieldsEl.querySelectorAll(".guest-row")];
    const guests = rows.map((row) => ({
      first_name: row.querySelector('[name="firstName"]').value.trim(),
      last_name: row.querySelector('[name="lastName"]').value.trim(),
    }));

    if (!booked) {
      setStatus("Choose who you booked through.", true);
      return;
    }

    if (
      guests.some(
        (g) =>
          !g.first_name ||
          !g.last_name ||
          g.first_name.length > 40 ||
          g.last_name.length > 40
      )
    ) {
      setStatus("Enter a first and last name for each person.", true);
      return;
    }

    submitBtn.disabled = true;
    const { error } = await supabase.rpc("submit_cruise_party", {
      p_party_size: partySize,
      p_booked_through: booked,
      p_guests: guests,
    });
    submitBtn.disabled = false;

    if (error) {
      setStatus("Could not submit your party. Please try again.", true);
      console.error(error);
      return;
    }

    formEl.reset();
    partySizeEl.value = "2";
    renderGuestFields();
    setStatus(
      "Submitted — a host will approve it before it appears on the list."
    );
    if (adminUnlocked) await loadPending();
  });

  syncAdminUi();
  loadApproved().then(subscribe);
})();
