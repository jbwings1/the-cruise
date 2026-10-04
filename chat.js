(() => {
  const NAME_KEY = "cruiseChatDisplayName";
  const LAST_VISIT_KEY = "cruiseChatLastVisit";
  const { url, anonKey } = window.CRUISE_SUPABASE || {};

  const statusEl = document.getElementById("chat-status");
  const tipsEl = document.getElementById("tips-log");
  const tipsCountEl = document.getElementById("tips-count");
  const tipsDetailsEl = document.getElementById("tips-details");
  const logEl = document.getElementById("chat-log");
  const formEl = document.getElementById("chat-form");
  const nameInput = document.getElementById("display-name");
  const bodyInput = document.getElementById("message-body");
  const adminToggle = document.getElementById("host-anchor");
  const adminPanel = document.getElementById("admin-panel");
  const adminLock = document.getElementById("admin-lock");
  const adminTools = document.getElementById("admin-tools");
  const adminPin = document.getElementById("admin-pin");
  const adminUnlock = document.getElementById("admin-unlock");
  const adminCancel = document.getElementById("admin-cancel");
  const adminLockBtn = document.getElementById("admin-lock-btn");
  const searchText = document.getElementById("admin-search-text");
  const searchDate = document.getElementById("admin-search-date");
  const TIPS_OPEN_KEY = "cruiseChatTipsOpen";

  // Host unlock lasts only while this page is open — leaving chat clears it.
  let adminUnlocked = false;
  let adminPinValue = "";
  const messages = new Map();
  const likesByMessage = new Map();

  function markChatVisited() {
    localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
  }

  markChatVisited();
  window.addEventListener("beforeunload", markChatVisited);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") markChatVisited();
  });

  if (!url || !anonKey || !window.supabase) {
    statusEl.textContent =
      "Chat is not configured yet. Check config.js and try again.";
    return;
  }

  const supabase = window.supabase.createClient(url, anonKey);

  const savedName = localStorage.getItem(NAME_KEY);
  if (savedName) nameInput.value = savedName;

  function currentName() {
    return nameInput.value.trim();
  }

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

  function formatTime(iso) {
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
  }

  function syncAdminUi() {
    adminLock.hidden = adminUnlocked;
    adminTools.hidden = !adminUnlocked;
    document.body.classList.toggle("is-admin", adminUnlocked);
    if (adminUnlocked) {
      adminPanel.hidden = false;
    }
    renderAll();
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

  function getLikes(messageId) {
    return likesByMessage.get(messageId) || [];
  }

  function matchesAdminFilter(message) {
    if (!adminUnlocked) return true;
    const text = (searchText.value || "").trim().toLowerCase();
    const date = searchDate.value;
    if (text && !message.body.toLowerCase().includes(text)) return false;
    if (date) {
      const day = new Date(message.created_at).toISOString().slice(0, 10);
      if (day !== date) return false;
    }
    return true;
  }

  function renderTips() {
    const tips = [...messages.values()]
      .filter((m) => m.is_tip)
      .map((m) => ({
        ...m,
        likes: getLikes(m.id),
      }))
      .sort((a, b) => {
        if (b.likes.length !== a.likes.length) {
          return b.likes.length - a.likes.length;
        }
        return new Date(b.created_at) - new Date(a.created_at);
      });

    if (tipsCountEl) {
      tipsCountEl.textContent = tips.length
        ? `(${tips.length})`
        : "(none yet)";
    }

    if (!tips.length) {
      tipsEl.innerHTML =
        '<p class="tips-empty">No tips yet. Hosts can pin helpful chat messages here.</p>';
      return;
    }

    const name = currentName();
    tipsEl.innerHTML = tips
      .map((tip) => {
        const liked = name
          ? tip.likes.some((l) => l.display_name === name)
          : false;
        const likers = tip.likes.map((l) => l.display_name).join(", ");
        return `
          <article class="chat-message tip-message" data-id="${tip.id}">
            <header class="chat-message-meta">
              <strong>${escapeHtml(tip.display_name)}</strong>
              <time datetime="${escapeHtml(tip.created_at)}">${escapeHtml(
                formatTime(tip.created_at)
              )}</time>
            </header>
            <p>${escapeHtml(tip.body)}</p>
            <div class="message-actions">
              <button
                type="button"
                class="like-btn${liked ? " is-liked" : ""}"
                data-action="like"
                data-id="${tip.id}"
                ${name ? "" : "disabled"}
                aria-pressed="${liked ? "true" : "false"}"
                title="${name ? "Thumbs up" : "Enter your name to like tips"}"
              >
                <span aria-hidden="true">👍</span>
                <span>${tip.likes.length}</span>
              </button>
              ${
                adminUnlocked
                  ? `<button type="button" class="admin-btn" data-action="unpin" data-id="${tip.id}">Unpin</button>
                     <button type="button" class="admin-btn danger" data-action="delete" data-id="${tip.id}">Delete</button>
                     <details class="likers-details">
                       <summary>Who liked (${tip.likes.length})</summary>
                       <p>${
                         likers
                           ? escapeHtml(likers)
                           : "No likes yet."
                       }</p>
                     </details>`
                  : ""
              }
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderChat() {
    const chats = [...messages.values()]
      .filter((m) => !m.is_tip)
      .filter(matchesAdminFilter)
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    if (!chats.length) {
      logEl.innerHTML = '<p class="tips-empty">No chat messages yet.</p>';
      return;
    }

    logEl.innerHTML = chats
      .map(
        (message) => `
          <article class="chat-message" data-id="${message.id}">
            <header class="chat-message-meta">
              <strong>${escapeHtml(message.display_name)}</strong>
              <time datetime="${escapeHtml(message.created_at)}">${escapeHtml(
                formatTime(message.created_at)
              )}</time>
            </header>
            <p>${escapeHtml(message.body)}</p>
            ${
              adminUnlocked
                ? `<div class="message-actions">
                    <button type="button" class="admin-btn" data-action="pin" data-id="${message.id}">Pin to Tips</button>
                    <button type="button" class="admin-btn danger" data-action="delete" data-id="${message.id}">Delete</button>
                  </div>`
                : ""
            }
          </article>
        `
      )
      .join("");

    logEl.scrollTop = logEl.scrollHeight;
  }

  function renderAll() {
    renderTips();
    renderChat();
  }

  function upsertMessage(message) {
    if (!message?.id) return;
    messages.set(message.id, {
      id: message.id,
      display_name: message.display_name,
      body: message.body,
      created_at: message.created_at,
      is_tip: !!message.is_tip,
    });
  }

  async function loadLikes() {
    const { data, error } = await supabase
      .from("tip_likes")
      .select("id, message_id, display_name, created_at");

    if (error) {
      console.error(error);
      return;
    }

    likesByMessage.clear();
    (data || []).forEach((like) => {
      const list = likesByMessage.get(like.message_id) || [];
      list.push(like);
      likesByMessage.set(like.message_id, list);
    });
  }

  async function loadMessages() {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, display_name, body, created_at, is_tip")
      .order("created_at", { ascending: true })
      .limit(300);

    if (error) {
      setStatus("Could not load chat. Please refresh.", true);
      console.error(error);
      return;
    }

    messages.clear();
    (data || []).forEach(upsertMessage);
    await loadLikes();
    renderAll();
    setStatus("Live — messages appear for everyone.");
  }

  function subscribe() {
    supabase
      .channel("cruise-chat")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_messages" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            messages.delete(payload.old.id);
            likesByMessage.delete(payload.old.id);
          } else {
            upsertMessage(payload.new);
          }
          renderAll();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tip_likes" },
        () => {
          loadLikes().then(renderTips);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setStatus("Live — messages appear for everyone.");
        }
        if (status === "CHANNEL_ERROR") {
          setStatus(
            "Live updates paused. Refresh if messages stop appearing.",
            true
          );
        }
      });
  }

  async function requireAdminPin() {
    if (adminPinValue) return adminPinValue;
    const pin = window.prompt("Enter host PIN");
    if (!pin) return null;
    const { data, error } = await supabase.rpc("is_moderation_pin", { pin });
    if (error || !data) {
      setStatus("Incorrect PIN.", true);
      return null;
    }
    adminPinValue = pin;
    adminUnlocked = true;
    syncAdminUi();
    return pin;
  }

  async function pinTip(messageId) {
    const pin = await requireAdminPin();
    if (!pin) return;
    const { error } = await supabase.rpc("pin_chat_tip", {
      message_id: messageId,
      pin,
    });
    if (error) {
      setStatus("Could not pin tip.", true);
      console.error(error);
      return;
    }
    const msg = messages.get(messageId);
    if (msg) {
      msg.is_tip = true;
      renderAll();
    }
    setStatus("Pinned to Tips.");
  }

  async function unpinTip(messageId) {
    const pin = await requireAdminPin();
    if (!pin) return;
    const { error } = await supabase.rpc("unpin_chat_tip", {
      message_id: messageId,
      pin,
    });
    if (error) {
      setStatus("Could not unpin tip.", true);
      console.error(error);
      return;
    }
    const msg = messages.get(messageId);
    if (msg) {
      msg.is_tip = false;
      renderAll();
    }
    setStatus("Tip moved back to Chat.");
  }

  async function deleteMessage(messageId) {
    const pin = await requireAdminPin();
    if (!pin) return;
    if (!window.confirm("Remove this message for everyone?")) return;
    const { error } = await supabase.rpc("delete_chat_message", {
      message_id: messageId,
      pin,
    });
    if (error) {
      setStatus("Could not delete message.", true);
      console.error(error);
      return;
    }
    messages.delete(messageId);
    likesByMessage.delete(messageId);
    renderAll();
  }

  async function toggleLike(messageId) {
    const name = currentName();
    if (!name) {
      setStatus("Enter your display name before liking a tip.", true);
      nameInput.focus();
      return;
    }
    localStorage.setItem(NAME_KEY, name);

    const likes = getLikes(messageId);
    const existing = likes.find((l) => l.display_name === name);

    if (existing) {
      const { error } = await supabase
        .from("tip_likes")
        .delete()
        .eq("id", existing.id);
      if (error) {
        setStatus("Could not update like.", true);
        console.error(error);
        return;
      }
    } else {
      const { error } = await supabase.from("tip_likes").insert({
        message_id: messageId,
        display_name: name,
      });
      if (error) {
        setStatus("Could not like tip. Enter your name first.", true);
        console.error(error);
        return;
      }
    }

    await loadLikes();
    renderTips();
  }

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
    setStatus("Logged out of host tools.");
  });

  searchText.addEventListener("input", renderChat);
  searchDate.addEventListener("change", renderChat);
  nameInput.addEventListener("input", () => {
    localStorage.setItem(NAME_KEY, currentName());
    renderTips();
  });
  nameInput.addEventListener("change", () => {
    localStorage.setItem(NAME_KEY, currentName());
    renderTips();
  });

  if (tipsDetailsEl) {
    const savedOpen = localStorage.getItem(TIPS_OPEN_KEY);
    if (savedOpen === "0") tipsDetailsEl.open = false;
    if (savedOpen === "1") tipsDetailsEl.open = true;
    tipsDetailsEl.addEventListener("toggle", () => {
      localStorage.setItem(TIPS_OPEN_KEY, tipsDetailsEl.open ? "1" : "0");
    });
  }

  document.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-action]");
    if (!btn) return;
    const id = btn.dataset.id;
    const action = btn.dataset.action;
    if (action === "pin") pinTip(id);
    if (action === "unpin") unpinTip(id);
    if (action === "delete") deleteMessage(id);
    if (action === "like") toggleLike(id);
  });

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();

    const displayName = currentName();
    const body = bodyInput.value.trim();
    if (!displayName || !body) return;

    localStorage.setItem(NAME_KEY, displayName);
    const sendButton = formEl.querySelector(".chat-send");
    sendButton.disabled = true;

    const { error } = await supabase.from("chat_messages").insert({
      display_name: displayName,
      body,
    });

    sendButton.disabled = false;

    if (error) {
      setStatus("Message not sent. Try again.", true);
      console.error(error);
      return;
    }

    bodyInput.value = "";
    bodyInput.focus();
  });

  bodyInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      formEl.requestSubmit();
    }
  });

  syncAdminUi();
  loadMessages().then(subscribe);
})();
