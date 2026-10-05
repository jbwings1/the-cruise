(() => {
  function getClient() {
    const { url, anonKey } = window.CRUISE_SUPABASE || {};
    if (!url || !anonKey || !window.supabase) return null;
    return window.supabase.createClient(url, anonKey);
  }

  async function fetchTopScores(limit = 10) {
    const client = getClient();
    if (!client) return [];
    const { data, error } = await client
      .from("plank_scores")
      .select("display_name, pirate_id, gems, updated_at")
      .order("gems", { ascending: false })
      .order("updated_at", { ascending: true })
      .limit(limit);
    if (error) {
      console.warn("plank leaderboard fetch failed", error);
      return [];
    }
    return data || [];
  }

  async function submitScore(displayName, pirateId, gems) {
    const client = getClient();
    if (!client || gems < 1) return null;
    const { data, error } = await client.rpc("submit_plank_score", {
      p_display_name: displayName,
      p_pirate_id: pirateId,
      p_gems: gems,
    });
    if (error) {
      console.warn("plank score submit failed", error);
      return null;
    }
    return data;
  }

  window.PlankLeaderboard = {
    fetchTopScores,
    submitScore,
  };
})();
