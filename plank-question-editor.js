(() => {
  const STORAGE_KEY = "plank-questions-bank-v1";
  const BANK_URL = "plank-questions-bank.json";

  const listEl = document.getElementById("qe-list");
  const statusEl = document.getElementById("qe-status");
  const countsEl = document.getElementById("qe-counts");
  const filterStatus = document.getElementById("qe-filter-status");
  const filterSource = document.getElementById("qe-filter-source");
  const searchEl = document.getElementById("qe-search");
  const dialog = document.getElementById("qe-dialog");
  const form = document.getElementById("qe-form");
  const dialogTitle = document.getElementById("qe-dialog-title");

  let bank = { version: 1, source: "", notes: "", questions: [] };
  let originalBank = null;

  function setStatus(msg) {
    statusEl.textContent = msg || "";
  }

  function uid() {
    return "q-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function normalizeQuestion(q) {
    const out = {
      id: q.id || uid(),
      status: q.status || "draft",
      source: (q.source || "Custom").trim(),
      type: q.type === "mc" ? "mc" : "tf",
      prompt: String(q.prompt || "").trim(),
    };
    if (out.type === "tf") {
      out.answer = q.answer === true || q.answer === "true";
    } else {
      const choices = Array.isArray(q.choices)
        ? q.choices.map((c) => String(c || "").trim()).slice(0, 3)
        : ["", "", ""];
      while (choices.length < 3) choices.push("");
      out.choices = choices;
      out.answer = String(q.answer || choices[0] || "").trim();
    }
    return out;
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bank));
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !Array.isArray(parsed.questions)) return null;
      parsed.questions = parsed.questions.map(normalizeQuestion);
      return parsed;
    } catch {
      return null;
    }
  }

  async function loadBank() {
    const res = await fetch(BANK_URL + "?v=" + Date.now());
    if (!res.ok) throw new Error("Could not load " + BANK_URL);
    const data = await res.json();
    data.questions = (data.questions || []).map(normalizeQuestion);
    return data;
  }

  function fillSourceFilter() {
    const sources = [...new Set(bank.questions.map((q) => q.source))].sort();
    const current = filterSource.value || "all";
    filterSource.innerHTML = '<option value="all">All</option>';
    for (const s of sources) {
      const opt = document.createElement("option");
      opt.value = s;
      opt.textContent = s;
      filterSource.appendChild(opt);
    }
    filterSource.value = sources.includes(current) ? current : "all";
  }

  function filteredQuestions() {
    const st = filterStatus.value;
    const src = filterSource.value;
    const needle = searchEl.value.trim().toLowerCase();
    return bank.questions.filter((q) => {
      if (st !== "all" && q.status !== st) return false;
      if (src !== "all" && q.source !== src) return false;
      if (!needle) return true;
      const hay = [
        q.prompt,
        q.source,
        q.type,
        q.status,
        q.type === "mc" ? (q.choices || []).join(" ") : String(q.answer),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }

  function answerLabel(q) {
    if (q.type === "tf") return q.answer ? "True" : "False";
    return q.answer;
  }

  function updateCounts() {
    const all = bank.questions.length;
    const keep = bank.questions.filter((q) => q.status === "keep").length;
    const draft = bank.questions.filter((q) => q.status === "draft").length;
    const cut = bank.questions.filter((q) => q.status === "cut").length;
    const shown = filteredQuestions().length;
    countsEl.textContent = `Showing ${shown} · Total ${all} · Keep ${keep} · Draft ${draft} · Cut ${cut}`;
  }

  function render() {
    fillSourceFilter();
    updateCounts();
    const items = filteredQuestions();
    listEl.innerHTML = "";
    if (!items.length) {
      listEl.innerHTML =
        '<p class="qe-empty">No questions match. Try another filter, or add a new question.</p>';
      return;
    }
    for (const q of items) {
      const card = document.createElement("article");
      card.className = "qe-card";
      card.dataset.status = q.status;
      card.dataset.id = q.id;

      const top = document.createElement("div");
      top.className = "qe-card-top";

      const meta = document.createElement("div");
      meta.className = "qe-meta";
      meta.innerHTML = `
        <span class="qe-pill">${escapeHtml(q.source)}</span>
        <span class="qe-pill qe-pill-type">${q.type === "tf" ? "T/F" : "Multiple choice"}</span>
        <span class="qe-pill qe-pill-${q.status}">${q.status}</span>
      `;

      const actions = document.createElement("div");
      actions.className = "qe-card-actions";
      actions.append(
        btn("Keep", () => setStatusQuick(q.id, "keep"), "qe-btn"),
        btn("Draft", () => setStatusQuick(q.id, "draft"), "qe-btn"),
        btn("Cut", () => setStatusQuick(q.id, "cut"), "qe-btn"),
        btn("Edit", () => openEditor(q.id), "qe-btn"),
        btn("Delete", () => deleteQuestion(q.id), "qe-btn qe-btn-danger")
      );

      top.append(meta, actions);

      const prompt = document.createElement("p");
      prompt.className = "qe-prompt";
      prompt.textContent = q.prompt;

      const answer = document.createElement("p");
      answer.className = "qe-answer";
      if (q.type === "mc") {
        answer.textContent =
          "Choices: " +
          (q.choices || []).join(" · ") +
          " — Correct: " +
          answerLabel(q);
      } else {
        answer.textContent = "Answer: " + answerLabel(q);
      }

      card.append(top, prompt, answer);
      listEl.appendChild(card);
    }
  }

  function btn(label, onClick, className) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = className;
    b.textContent = label;
    b.addEventListener("click", onClick);
    return b;
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setStatusQuick(id, status) {
    const q = bank.questions.find((x) => x.id === id);
    if (!q) return;
    q.status = status;
    persist();
    setStatus(`Marked “${status}”. Progress saved in this browser.`);
    render();
  }

  function deleteQuestion(id) {
    const q = bank.questions.find((x) => x.id === id);
    if (!q) return;
    if (!confirm("Delete this question permanently from your draft bank?")) return;
    bank.questions = bank.questions.filter((x) => x.id !== id);
    persist();
    setStatus("Deleted. Progress saved in this browser.");
    render();
  }

  function syncTypeFields() {
    const type = document.getElementById("qe-edit-type").value;
    document.getElementById("qe-tf-fields").hidden = type !== "tf";
    document.getElementById("qe-mc-fields").hidden = type !== "mc";
    const mcInputs = ["qe-edit-c0", "qe-edit-c1", "qe-edit-c2"].map((id) =>
      document.getElementById(id)
    );
    for (const input of mcInputs) input.required = type === "mc";
  }

  function openEditor(id) {
    const isNew = !id;
    const q = isNew
      ? {
          id: uid(),
          status: "draft",
          source: "Custom",
          type: "tf",
          prompt: "",
          answer: true,
        }
      : bank.questions.find((x) => x.id === id);
    if (!q) return;

    dialogTitle.textContent = isNew ? "New question" : "Edit question";
    document.getElementById("qe-edit-id").value = q.id;
    document.getElementById("qe-edit-status").value = q.status || "draft";
    document.getElementById("qe-edit-source").value = q.source || "Custom";
    document.getElementById("qe-edit-type").value = q.type || "tf";
    document.getElementById("qe-edit-prompt").value = q.prompt || "";

    const tfTrue = form.querySelector('input[name="qe-tf-answer"][value="true"]');
    const tfFalse = form.querySelector('input[name="qe-tf-answer"][value="false"]');
    if (q.type === "tf") {
      (q.answer ? tfTrue : tfFalse).checked = true;
      document.getElementById("qe-edit-c0").value = "";
      document.getElementById("qe-edit-c1").value = "";
      document.getElementById("qe-edit-c2").value = "";
      form.querySelector('input[name="qe-mc-correct"][value="0"]').checked = true;
    } else {
      const choices = q.choices || ["", "", ""];
      document.getElementById("qe-edit-c0").value = choices[0] || "";
      document.getElementById("qe-edit-c1").value = choices[1] || "";
      document.getElementById("qe-edit-c2").value = choices[2] || "";
      let idx = choices.indexOf(q.answer);
      if (idx < 0) idx = 0;
      form.querySelector(`input[name="qe-mc-correct"][value="${idx}"]`).checked = true;
      tfTrue.checked = true;
    }

    syncTypeFields();
    if (!dialog.open) dialog.showModal();
  }

  function readFormQuestion() {
    const id = document.getElementById("qe-edit-id").value || uid();
    const type = document.getElementById("qe-edit-type").value;
    const base = {
      id,
      status: document.getElementById("qe-edit-status").value,
      source: document.getElementById("qe-edit-source").value.trim() || "Custom",
      type,
      prompt: document.getElementById("qe-edit-prompt").value.trim(),
    };
    if (!base.prompt) throw new Error("Question text is required.");
    if (type === "tf") {
      const val = form.querySelector('input[name="qe-tf-answer"]:checked').value;
      base.answer = val === "true";
    } else {
      const choices = [0, 1, 2].map((i) =>
        document.getElementById("qe-edit-c" + i).value.trim()
      );
      if (choices.some((c) => !c)) throw new Error("All three choices are required.");
      const correctIdx = Number(
        form.querySelector('input[name="qe-mc-correct"]:checked').value
      );
      base.choices = choices;
      base.answer = choices[correctIdx];
    }
    return normalizeQuestion(base);
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function toGameJs(questions) {
    const gameQs = questions.map((q) => {
      if (q.type === "tf") {
        return {
          type: "tf",
          prompt: q.prompt,
          answer: !!q.answer,
        };
      }
      return {
        type: "mc",
        prompt: q.prompt,
        choices: q.choices.slice(0, 3),
        answer: q.answer,
      };
    });
    return (
      "// Generated from plank-question-editor.html\n" +
      "// type: \"tf\" | \"mc\"\n" +
      "// answer: tf => true/false; mc => correct choice string\n" +
      "// choices: mc only — exactly 3 strings (shuffled in-game)\n" +
      "window.WALK_THE_PLANK_QUESTIONS = " +
      JSON.stringify(gameQs, null, 2) +
      ";\n"
    );
  }

  document.getElementById("qe-edit-type").addEventListener("change", syncTypeFields);

  form.addEventListener("submit", (e) => {
    const submitter = e.submitter;
    if (submitter && submitter.value === "cancel") return;
    e.preventDefault();
    try {
      const q = readFormQuestion();
      const idx = bank.questions.findIndex((x) => x.id === q.id);
      if (idx >= 0) bank.questions[idx] = q;
      else bank.questions.unshift(q);
      persist();
      dialog.close();
      setStatus("Question saved. Progress kept in this browser.");
      render();
    } catch (err) {
      alert(err.message || String(err));
    }
  });

  document.getElementById("qe-new").addEventListener("click", () => openEditor(null));
  document.getElementById("qe-save-draft").addEventListener("click", () => {
    persist();
    downloadText("plank-questions-bank.json", JSON.stringify(bank, null, 2) + "\n");
    setStatus("Progress saved in this browser and downloaded as JSON.");
  });

  document.getElementById("qe-export-bank").addEventListener("click", () => {
    downloadText("plank-questions-bank.json", JSON.stringify(bank, null, 2) + "\n");
    setStatus("Downloaded full bank JSON.");
  });

  document.getElementById("qe-save-game").addEventListener("click", () => {
    const keep = bank.questions.filter((q) => q.status === "keep");
    if (!keep.length) {
      alert(
        "Mark at least one question as Keep before saving to the game file.\n\nTip: use Keep on cards you want in Walk the Plank."
      );
      return;
    }
    downloadText("walk-the-plank-questions.js", toGameJs(keep));
    setStatus(
      `Downloaded walk-the-plank-questions.js with ${keep.length} Keep question(s). Replace that file in the repo to ship them.`
    );
  });

  document.getElementById("qe-reset").addEventListener("click", async () => {
    if (
      !confirm(
        "Reset to the original bank file? This clears your browser edits for this editor."
      )
    ) {
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    bank = clone(originalBank || (await loadBank()));
    persist();
    setStatus("Reset to original bank.");
    render();
  });

  for (const el of [filterStatus, filterSource, searchEl]) {
    el.addEventListener("input", render);
    el.addEventListener("change", render);
  }

  (async () => {
    try {
      originalBank = await loadBank();
      const stored = loadFromStorage();
      bank = stored || clone(originalBank);
      if (!stored) persist();
      setStatus(
        stored
          ? "Loaded your saved progress from this browser."
          : `Loaded ${bank.questions.length} draft questions from The Knot + cruise hub.`
      );
      render();
    } catch (err) {
      setStatus("Failed to load question bank: " + err.message);
      listEl.innerHTML =
        '<p class="qe-empty">Could not load plank-questions-bank.json</p>';
    }
  })();
})();
