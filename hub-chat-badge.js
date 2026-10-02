(() => {
  const LAST_VISIT_KEY = "cruiseChatLastVisit";
  const badgeEl = document.getElementById("chat-new-badge");
  const { url, anonKey } = window.CRUISE_SUPABASE || {};

  if (!badgeEl || !url || !anonKey || !window.supabase) return;

  const lastVisit = localStorage.getItem(LAST_VISIT_KEY);
  // First-time visitors: no badge until they've opened chat once.
  if (!lastVisit) return;

  const supabase = window.supabase.createClient(url, anonKey);

  async function updateBadge() {
    const { count, error } = await supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .gt("created_at", lastVisit);

    if (error) {
      console.error(error);
      return;
    }

    if (!count) {
      badgeEl.hidden = true;
      badgeEl.textContent = "";
      return;
    }

    badgeEl.hidden = false;
    badgeEl.textContent = count > 99 ? "99+" : String(count);
    badgeEl.setAttribute(
      "aria-label",
      count === 1 ? "1 new message" : `${count} new messages`
    );
  }

  updateBadge();
})();
