(() => {
  const NAME_KEY = "cruiseChatDisplayName";
  const LAST_VISIT_KEY = "cruiseChatLastVisit";
  const { url, anonKey } = window.CRUISE_SUPABASE || {};
  const statusEl = document.getElementById("chat-status");
  const logEl = document.getElementById("chat-log");
  const formEl = document.getElementById("chat-form");
  const nameInput = document.getElementById("display-name");
  const bodyInput = document.getElementById("message-body");

  function markChatVisited() {
    localStorage.setItem(LAST_VISIT_KEY, new Date().toISOString());
  }

  // Visiting the chat clears the "new" badge on the main page.
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
  const seenIds = new Set();

  const savedName = localStorage.getItem(NAME_KEY);
  if (savedName) nameInput.value = savedName;

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

  function appendMessage(message) {
    if (!message?.id || seenIds.has(message.id)) return;
    seenIds.add(message.id);

    const item = document.createElement("article");
    item.className = "chat-message";
    item.dataset.id = message.id;
    item.innerHTML = `
      <header class="chat-message-meta">
        <strong>${escapeHtml(message.display_name)}</strong>
        <time datetime="${escapeHtml(message.created_at)}">${escapeHtml(
          formatTime(message.created_at)
        )}</time>
      </header>
      <p>${escapeHtml(message.body)}</p>
    `;
    logEl.appendChild(item);
    logEl.scrollTop = logEl.scrollHeight;
  }

  async function loadMessages() {
    const { data, error } = await supabase
      .from("chat_messages")
      .select("id, display_name, body, created_at")
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) {
      setStatus("Could not load chat. Please refresh.", true);
      console.error(error);
      return;
    }

    logEl.innerHTML = "";
    seenIds.clear();
    (data || []).forEach(appendMessage);
    setStatus("Live — messages appear for everyone.");
  }

  function subscribe() {
    supabase
      .channel("cruise-chat")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        (payload) => appendMessage(payload.new)
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setStatus("Live — messages appear for everyone.");
        }
        if (status === "CHANNEL_ERROR") {
          setStatus("Live updates paused. Refresh if messages stop appearing.", true);
        }
      });
  }

  formEl.addEventListener("submit", async (event) => {
    event.preventDefault();

    const displayName = nameInput.value.trim();
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

  loadMessages().then(subscribe);
})();
