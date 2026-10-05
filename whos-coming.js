(() => {
  const { url, anonKey } = window.CRUISE_SUPABASE || {};

  const statusEl = document.getElementById("coming-status");
  const countEl = document.getElementById("coming-count");
  const brideListEl = document.getElementById("bride-list");
  const groomListEl = document.getElementById("groom-list");
  const formEl = document.getElementById("coming-form");
  const formSection = document.getElementById("coming-form-section");
  const addGroupToggle = document.getElementById("add-group-toggle");
  const addGroupClose = document.getElementById("add-group-close");
  const groupNameEl = document.getElementById("group-name");
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
  const editModal = document.getElementById("edit-modal");
  const editForm = document.getElementById("edit-form");
  const editGroupName = document.getElementById("edit-group-name");
  const editPartySize = document.getElementById("edit-party-size");
  const editGuestFields = document.getElementById("edit-guest-fields");
  const editCancel = document.getElementById("edit-cancel");

  let adminUnlocked = false;
  let adminPinValue = "";
  let editingPartyId = null;
  /** @type {Map<string, any>} */
  const parties = new Map();

  const BOOKED_LABELS = {
    julia: "Julia (travel agent)",
    royal: "Royal Caribbean direct",
    other: "Other",
  };

  const SIDE_LABELS = {
    bride: "Bride",
    groom: "Groom",
  };

  function setAddFormOpen(open) {
    formSection.hidden = !open;
    addGroupToggle.setAttribute("aria-expanded", open ? "true" : "false");
    addGroupToggle.textContent = open ? "Hide add form" : "Add your group";
    if (open) {
      formSection.scrollIntoView({ behavior: "smooth", block: "nearest" });
      groupNameEl.focus({ preventScroll: true });
    }
  }

  function toggleAddForm() {
    setAddFormOpen(formSection.hidden);
  }

  addGroupToggle.addEventListener("click", toggleAddForm);
  addGroupClose.addEventListener("click", () => setAddFormOpen(false));

  if (window.location.hash === "#add") {
    setAddFormOpen(true);
  }

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
    if (adminUnlocked) adminPanel.hidden = false;
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

  function renderNameFields(container, size, previous = []) {
    container.innerHTML = Array.from({ length: size }, (_, index) => {
      const prior = previous[index] || { first_name: "", last_name: "" };
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
                value="${escapeHtml(prior.first_name || "")}"
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
                value="${escapeHtml(prior.last_name || "")}"
                required
              />
            </label>
          </div>
        </div>
      `;
    }).join("");
  }

  function readGuestsFrom(container) {
    return [...container.querySelectorAll(".guest-row")].map((row) => ({
      first_name: row.querySelector('[name="firstName"]').value.trim(),
      last_name: row.querySelector('[name="lastName"]').value.trim(),
    }));
  }

  function collectCurrentGuestValues(container) {
    return [...container.querySelectorAll(".guest-row")].map((row) => ({
      first_name: row.querySelector('[name="firstName"]')?.value || "",
      last_name: row.querySelector('[name="lastName"]')?.value || "",
    }));
  }

  function renderGuestFields() {
    const size = Number(partySizeEl.value) || 1;
    renderNameFields(
      guestFieldsEl,
      size,
      collectCurrentGuestValues(guestFieldsEl)
    );
  }

  function renderEditGuestFields(previous = []) {
    const size = Number(editPartySize.value) || 1;
    renderNameFields(editGuestFields, size, previous);
  }

  function partyCardHtml(party, { pending = false } = {}) {
    const names = (party.guests || [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((g) => escapeHtml(guestFullName(g)))
      .join(", ");
    const booked = BOOKED_LABELS[party.booked_through] || party.booked_through;
    const side = SIDE_LABELS[party.side] || party.side;

    let actions = "";
    if (adminUnlocked) {
      if (pending) {
        actions = `
          <div class="message-actions">
            <span class="coming-booked-tag">${escapeHtml(side)} · ${escapeHtml(booked)}</span>
            <button type="button" class="admin-btn" data-action="approve" data-id="${party.id}">Approve</button>
            <button type="button" class="admin-btn" data-action="edit" data-id="${party.id}">Edit</button>
            <button type="button" class="admin-btn danger" data-action="delete" data-id="${party.id}">Remove</button>
          </div>`;
      } else {
        actions = `
          <div class="message-actions">
            <span class="coming-booked-tag">${escapeHtml(booked)}</span>
            <button type="button" class="admin-btn" data-action="edit" data-id="${party.id}">Edit</button>
            <button type="button" class="admin-btn" data-action="pending" data-id="${party.id}">Move to pending</button>
            <button type="button" class="admin-btn danger" data-action="delete" data-id="${party.id}">Remove</button>
          </div>`;
      }
    }

    return `
      <article class="coming-party${pending ? " coming-party-pending" : ""}" data-id="${party.id}">
        <h4 class="coming-group-name">${escapeHtml(party.group_name)}</h4>
        <p class="coming-party-names">${names}</p>
        ${
          pending
            ? `<p class="coming-party-meta">${party.party_size} ${
                party.party_size === 1 ? "person" : "people"
              }</p>`
            : ""
        }
        ${actions}
      </article>
    `;
  }

  function renderSideList(side, container) {
    const list = [...parties.values()]
      .filter((p) => p.side === side)
      .sort((a, b) =>
        a.group_name.localeCompare(b.group_name, undefined, {
          sensitivity: "base",
        })
      );

    if (!list.length) {
      container.innerHTML =
        '<p class="tips-empty">No groups on this side yet.</p>';
      return;
    }

    container.innerHTML = list.map((party) => partyCardHtml(party)).join("");
  }

  function renderApproved() {
    const approved = [...parties.values()];
    const totalPeople = approved.reduce(
      (sum, party) => sum + (party.guests?.length || party.party_size || 0),
      0
    );
    countEl.textContent =
      totalPeople === 1 ? "1 person" : `${totalPeople} people`;

    renderSideList("bride", brideListEl);
    renderSideList("groom", groomListEl);
  }

  function renderPending(pending) {
    if (!adminUnlocked) {
      pendingEl.innerHTML = "";
      return;
    }

    if (!pending.length) {
      pendingEl.innerHTML =
        '<p class="tips-empty">No pending groups right now.</p>';
      return;
    }

    pendingEl.innerHTML = pending
      .map((party) => partyCardHtml(party, { pending: true }))
      .join("");
  }

  async function loadApproved() {
    const { data: partyRows, error: partyError } = await supabase
      .from("cruise_parties")
      .select("id, side, group_name, party_size, booked_through, created_at, approved_at")
      .eq("status", "approved")
      .order("group_name", { ascending: true });

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
    setStatus("Live list — approved groups appear here for everyone.");
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
      setStatus("Could not load pending groups.", true);
      console.error(error);
      return;
    }

    renderPending(
      (data || []).map((party) => ({
        ...party,
        guests: (party.guests || []).map((g, index) => ({
          first_name: g.first_name,
          last_name: g.last_name,
          sort_order: g.sort_order ?? index,
        })),
      }))
    );
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
      setStatus("Could not approve group.", true);
      console.error(error);
      return;
    }
    setStatus("Group approved.");
    await Promise.all([loadApproved(), loadPending()]);
  }

  async function moveToPending(partyId) {
    if (!adminPinValue) return;
    const { error } = await supabase.rpc("set_cruise_party_pending", {
      party_id: partyId,
      pin: adminPinValue,
    });
    if (error) {
      setStatus("Could not move group to pending.", true);
      console.error(error);
      return;
    }
    parties.delete(partyId);
    setStatus("Group moved back to pending.");
    await Promise.all([loadApproved(), loadPending()]);
  }

  async function deleteParty(partyId) {
    if (!adminPinValue) return;
    if (!window.confirm("Remove this group from Who's Coming?")) return;
    const { error } = await supabase.rpc("delete_cruise_party", {
      party_id: partyId,
      pin: adminPinValue,
    });
    if (error) {
      setStatus("Could not remove group.", true);
      console.error(error);
      return;
    }
    parties.delete(partyId);
    setStatus("Group removed.");
    await Promise.all([loadApproved(), loadPending()]);
  }

  async function openEditModal(partyId) {
    let party = parties.get(partyId);
    if (!party && adminPinValue) {
      const { data, error } = await supabase.rpc("list_pending_cruise_parties", {
        pin: adminPinValue,
      });
      if (error) {
        setStatus("Could not load group to edit.", true);
        console.error(error);
        return;
      }
      party = (data || []).find((p) => p.id === partyId);
    }
    if (!party) {
      setStatus("Could not find that group.", true);
      return;
    }

    editingPartyId = partyId;
    editGroupName.value = party.group_name || "";
    editPartySize.value = String(party.party_size || party.guests?.length || 1);
    const sideInput = editForm.querySelector(
      `input[name="editSide"][value="${party.side}"]`
    );
    if (sideInput) sideInput.checked = true;
    const bookedInput = editForm.querySelector(
      `input[name="editBooked"][value="${party.booked_through}"]`
    );
    if (bookedInput) bookedInput.checked = true;
    renderEditGuestFields(party.guests || []);
    editModal.hidden = false;
  }

  function closeEditModal() {
    editingPartyId = null;
    editModal.hidden = true;
    editForm.reset();
    editGuestFields.innerHTML = "";
  }

  partySizeEl.addEventListener("change", renderGuestFields);
  renderGuestFields();

  editPartySize.addEventListener("change", () => {
    renderEditGuestFields(collectCurrentGuestValues(editGuestFields));
  });

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
    closeEditModal();
    syncAdminUi();
    renderPending([]);
    setStatus("Logged out of host tools.");
  });

  editCancel.addEventListener("click", closeEditModal);
  editModal.addEventListener("click", (event) => {
    if (event.target === editModal) closeEditModal();
  });

  document.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    if (action === "approve") approveParty(id);
    if (action === "delete") deleteParty(id);
    if (action === "pending") moveToPending(id);
    if (action === "edit") openEditModal(id);
  });

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();

    const side = formEl.querySelector('input[name="side"]:checked')?.value;
    const booked = formEl.querySelector(
      'input[name="bookedThrough"]:checked'
    )?.value;
    const groupName = groupNameEl.value.trim();
    const partySize = Number(partySizeEl.value);
    const guests = readGuestsFrom(guestFieldsEl);

    if (!side) {
      setStatus("Choose Bride or Groom.", true);
      return;
    }
    if (!groupName) {
      setStatus("Enter a group name.", true);
      return;
    }
    if (!booked) {
      setStatus("Choose how you booked.", true);
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
      p_side: side,
      p_group_name: groupName,
      p_party_size: partySize,
      p_booked_through: booked,
      p_guests: guests,
    });
    submitBtn.disabled = false;

    if (error) {
      setStatus("Could not submit your group. Please try again.", true);
      console.error(error);
      return;
    }

    formEl.reset();
    partySizeEl.value = "2";
    renderGuestFields();
    setAddFormOpen(false);
    setStatus(
      "Submitted — a host will approve it before it appears on the list."
    );
    if (adminUnlocked) await loadPending();
  });

  editForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!editingPartyId || !adminPinValue) return;

    const side = editForm.querySelector('input[name="editSide"]:checked')?.value;
    const booked = editForm.querySelector(
      'input[name="editBooked"]:checked'
    )?.value;
    const groupName = editGroupName.value.trim();
    const partySize = Number(editPartySize.value);
    const guests = readGuestsFrom(editGuestFields);

    if (!side || !booked || !groupName) {
      setStatus("Fill in all edit fields.", true);
      return;
    }
    if (guests.some((g) => !g.first_name || !g.last_name)) {
      setStatus("Enter a first and last name for each person.", true);
      return;
    }

    const { error } = await supabase.rpc("update_cruise_party", {
      party_id: editingPartyId,
      pin: adminPinValue,
      p_side: side,
      p_group_name: groupName,
      p_party_size: partySize,
      p_booked_through: booked,
      p_guests: guests,
    });

    if (error) {
      setStatus("Could not save changes.", true);
      console.error(error);
      return;
    }

    closeEditModal();
    setStatus("Group updated.");
    await Promise.all([loadApproved(), loadPending()]);
  });

  syncAdminUi();
  loadApproved().then(subscribe);
})();
