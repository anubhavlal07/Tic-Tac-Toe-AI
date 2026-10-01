(() => {
  const KEY = "tictactoe_history";
  const BEST_KEY = "tictactoe_history_best";
  const LIMIT = 100;
  const ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 2.64-6.36"/><polyline points="3 4 3 9 8 9"/><polyline points="12 7 12 12 15.5 14"/></svg>';

  const isRecord = (r) => r && typeof r === "object" && typeof r.id === "string" && Array.isArray(r.moves);

  const read = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (err) {
      return fallback;
    }
  };

  const write = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (err) {
      console.warn("Could not save history", err);
      return false;
    }
  };

  const remove = (key) => {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.warn("Could not clear history", err);
    }
  };

  const loaded = read(KEY, []);
  let records = Array.isArray(loaded) ? loaded.filter(isRecord).slice(0, LIMIT) : [];
  let storedBest = Number(read(BEST_KEY, 0)) || 0;

  const clone = (r) => JSON.parse(JSON.stringify(r));

  const list = () => records.map(clone);

  const get = (id) => {
    const found = records.find((r) => r.id === id);
    return found ? clone(found) : null;
  };

  const stats = () => {
    const byMode = {};
    for (const r of records) {
      const m = byMode[r.modeId] || (byMode[r.modeId] = { games: 0, wins: 0, draws: 0, losses: 0 });
      m.games += 1;
      if (r.outcome === "win") m.wins += 1;
      else if (r.outcome === "draw") m.draws += 1;
      else if (r.outcome === "loss") m.losses += 1;
    }
    const aiGames = records.filter((r) => r.modeId === "ai");
    let currentStreak = 0;
    for (const r of aiGames) {
      if (r.outcome === "loss") break;
      currentStreak += 1;
    }
    let bestStreak = 0;
    let run = 0;
    for (let i = aiGames.length - 1; i >= 0; i--) {
      run = aiGames[i].outcome === "loss" ? 0 : run + 1;
      bestStreak = Math.max(bestStreak, run);
    }
    bestStreak = Math.max(bestStreak, storedBest);
    return { total: records.length, byMode, ai: { currentStreak, bestStreak } };
  };

  const changed = () => {
    updateBadge();
    Game.emit("history:change", { list: list() });
  };

  const save = (result) => {
    if (!isRecord(result)) return;
    const before = stats().ai;
    records = [clone(result), ...records.filter((r) => r.id !== result.id)].slice(0, LIMIT);
    const after = stats().ai;
    if (after.bestStreak > storedBest) {
      storedBest = after.bestStreak;
      write(BEST_KEY, storedBest);
    }
    write(KEY, records);
    changed();
    if (result.modeId !== "ai") return;
    if (result.outcome === "loss") {
      if (before.currentStreak >= 3) UI.toast(`Streak of ${before.currentStreak} ended`, 2600);
    } else if (after.currentStreak >= 3 && after.currentStreak > before.bestStreak) {
      UI.toast(`New best: ${after.currentStreak} games unbeaten 🔥`, 2600);
    }
  };

  const clear = () => {
    records = [];
    storedBest = 0;
    remove(KEY);
    remove(BEST_KEY);
    changed();
  };

  const modeLabel = (modeId) => {
    const m = Game.modes().find((mode) => mode.id === modeId);
    return (m && m.label) || modeId || "Game";
  };

  const relativeTime = (at) => {
    const now = new Date();
    const then = new Date(at);
    const diff = Math.max(0, now - then);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    if (then.getTime() >= startOfToday) {
      const hours = Math.floor(minutes / 60);
      return `${hours} h ago`;
    }
    if (then.getTime() >= startOfToday - 86400000) return "Yesterday";
    const opts = { month: "short", day: "numeric" };
    if (then.getFullYear() !== now.getFullYear()) opts.year = "numeric";
    return then.toLocaleDateString(undefined, opts);
  };

  const boardFrom = (moves) => {
    const board = Array(9).fill(null);
    for (const { index, player } of moves) {
      if (index >= 0 && index < 9) board[index] = player;
    }
    return board;
  };

  const chipFor = (r) => {
    const names = r.names || { X: "X", O: "O" };
    if (r.outcome === "win") return { text: "Win", tone: "win" };
    if (r.outcome === "loss") return { text: "Loss", tone: "loss" };
    if (r.outcome === "draw" || !r.winner) return { text: "Draw", tone: "draw" };
    return { text: `${names[r.winner] || r.winner} won`, tone: r.winner === "X" ? "x" : "o" };
  };

  const statTile = (label, value, tone, extra) =>
    UI.el(
      "div",
      { class: `history-stat${tone ? ` history-stat-${tone}` : ""}` },
      UI.el("span", { class: "history-stat-label" }, label),
      UI.el("span", { class: "history-stat-value" }, value),
      extra ? UI.el("span", { class: "history-stat-extra" }, extra) : null
    );

  const renderStats = (s) => {
    const ai = s.byMode.ai || { games: 0, wins: 0, draws: 0, losses: 0 };
    const wdl = UI.el(
      "span",
      { class: "history-wdl" },
      UI.el("span", { class: "history-wdl-w" }, String(ai.wins)),
      UI.el("span", { class: "history-wdl-sep" }, "·"),
      UI.el("span", { class: "history-wdl-d" }, String(ai.draws)),
      UI.el("span", { class: "history-wdl-sep" }, "·"),
      UI.el("span", { class: "history-wdl-l" }, String(ai.losses))
    );
    return UI.el(
      "div",
      { class: "history-stats" },
      statTile("Unbeaten", String(s.ai.currentStreak), "streak", "vs AI now"),
      statTile("Best streak", String(s.ai.bestStreak), "best", "vs AI ever"),
      statTile("Games", String(s.total), null, "all modes"),
      statTile("W · D · L", wdl, null, "vs AI")
    );
  };

  const renderEntry = (r) => {
    const chip = chipFor(r);
    const label = modeLabel(r.modeId);
    const moves = r.moves.length;
    const replay =
      window.Replay && typeof window.Replay.open === "function"
        ? UI.el(
            "button",
            { type: "button", class: "btn btn-ghost history-replay", onclick: () => window.Replay.open(clone(r)) },
            "Replay"
          )
        : null;
    return UI.el(
      "li",
      { class: "history-entry" },
      UI.miniBoard(boardFrom(r.moves), { line: r.line, size: 72, label: `${chip.text}, final position` }),
      UI.el(
        "div",
        { class: "history-info" },
        UI.el("span", { class: `history-chip history-chip-${chip.tone}` }, chip.text),
        UI.el("span", { class: "history-mode" }, label),
        UI.el(
          "span",
          { class: "history-meta" },
          UI.el("time", { datetime: new Date(r.at).toISOString() }, relativeTime(r.at)),
          UI.el("span", { "aria-hidden": "true" }, "·"),
          UI.el("span", {}, `${moves} move${moves === 1 ? "" : "s"}`)
        )
      ),
      replay ? UI.el("div", { class: "history-actions" }, replay) : null
    );
  };

  let sheet = null;
  let body = null;

  const subtitle = () => {
    const s = stats();
    if (!s.total) return "Your finished games appear here.";
    return `${s.total} game${s.total === 1 ? "" : "s"} saved on this device.`;
  };

  const render = () => {
    if (!body) return;
    const s = stats();
    const parts = [renderStats(s)];
    if (!records.length) {
      parts.push(
        UI.el(
          "div",
          { class: "history-empty" },
          UI.el("span", { class: "history-empty-icon", html: ICON }),
          UI.el("h3", {}, "No games yet"),
          UI.el("p", {}, "Finish a game and it will show up here with its final board.")
        )
      );
    } else {
      parts.push(UI.el("ol", { class: "history-list" }, records.map(renderEntry)));
      let armed = false;
      let timer = null;
      const clearBtn = UI.el("button", { type: "button", class: "btn btn-ghost history-clear" }, "Clear history");
      clearBtn.addEventListener("click", () => {
        if (armed) {
          clearTimeout(timer);
          clear();
          return;
        }
        armed = true;
        clearBtn.textContent = "Tap again to clear";
        clearBtn.classList.add("history-clear-armed");
        timer = setTimeout(() => {
          armed = false;
          clearBtn.textContent = "Clear history";
          clearBtn.classList.remove("history-clear-armed");
        }, 3000);
      });
      parts.push(UI.el("div", { class: "history-footer" }, clearBtn));
    }
    body.replaceChildren(...parts);
    if (sheet) sheet.setTitle("History", subtitle());
  };

  const open = () => {
    body = UI.el("div", { class: "history" });
    sheet = UI.openSheet({
      title: "History",
      subtitle: subtitle(),
      wide: true,
      content: body,
      onClose: () => {
        sheet = null;
        body = null;
      },
    });
    render();
  };

  const button = UI.addToolbarButton({ id: "historyBtn", label: "History and streaks", icon: ICON, order: 20, onClick: open });
  const badge = UI.el("span", { class: "tool-badge", "aria-hidden": "true", hidden: true });
  button.append(badge);

  function updateBadge() {
    const streak = stats().ai.currentStreak;
    const show = streak >= 2;
    badge.hidden = !show;
    badge.textContent = show ? String(streak) : "";
    button.setAttribute("aria-label", show ? `History and streaks, ${streak} unbeaten` : "History and streaks");
  }

  Game.on("end", save);
  Game.on("history:change", render);
  updateBadge();

  window.GameHistory = { list, get, stats, clear };
})();
