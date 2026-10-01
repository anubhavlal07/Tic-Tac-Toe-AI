(() => {
  const CELL_NAMES = ["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"];
  const STEP_MS = 750;
  const svg = (paths) =>
    `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths}</svg>`;
  const ICONS = {
    first: svg('<path d="M6 5v14"/><path d="M18 6l-7 6 7 6"/>'),
    prev: svg('<path d="M15 6l-6 6 6 6"/>'),
    play: svg('<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>'),
    pause: svg('<path d="M9 5.5v13"/><path d="M15 5.5v13"/>'),
    next: svg('<path d="M9 6l6 6-6 6"/>'),
    last: svg('<path d="M18 5v14"/><path d="M6 6l7 6-7 6"/>'),
    replay: svg('<path d="M8 5.5v13l10.5-6.5z" fill="currentColor"/>'),
  };

  const reducedMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const cellName = (i) => CELL_NAMES[i] || `cell ${i + 1}`;

  const cleanMoves = (moves) => {
    const board = Array(9).fill(null);
    const out = [];
    for (const move of Array.isArray(moves) ? moves : []) {
      if (!move || !Number.isInteger(move.index) || move.index < 0 || move.index > 8 || board[move.index]) break;
      if (move.player !== "X" && move.player !== "O") break;
      board[move.index] = move.player;
      out.push({ index: move.index, player: move.player });
    }
    return out;
  };

  const namesOf = (record) => ({ X: "X", O: "O", ...(record && record.names ? record.names : {}) });

  const resultText = (record, names) => {
    if (record.outcome === "win") return "Win";
    if (record.outcome === "loss") return "Loss";
    if (record.outcome === "draw") return "Draw";
    if (record.winner) return `${names[record.winner]} wins`;
    return "Draw";
  };

  const subtitleFor = (record, count) => {
    const names = namesOf(record);
    const me = record.perspective === "X" || record.perspective === "O" ? record.perspective : null;
    const pair = me ? `${names[me]} vs ${names[me === "X" ? "O" : "X"]}` : `${names.X} vs ${names.O}`;
    return `${pair} · ${resultText(record, names)} · ${count} ${count === 1 ? "move" : "moves"}`;
  };

  const markNode = (player, extra) =>
    UI.el("span", { class: `replay-mark replay-mark-${player.toLowerCase()}${extra ? ` ${extra}` : ""}`, "aria-hidden": "true" });

  const open = (input) => {
    const record = input && typeof input === "object" ? input : {};
    const moves = cleanMoves(record.moves);
    const total = moves.length;
    const names = namesOf(record);
    const line = Array.isArray(record.line) && record.line.length === 3 && record.winner ? record.line : null;
    const winner = record.winner === "X" || record.winner === "O" ? record.winner : null;

    let step = 0;
    let timer = null;
    let alive = true;

    const cells = Array.from({ length: 9 }, (_, i) =>
      UI.el("div", { class: "replay-cell", role: "gridcell", "aria-label": cellName(i) })
    );
    const board = UI.el("div", { class: "replay-board", role: "grid", "aria-label": "Replay board" }, cells);

    const iconButton = (name, label, onClick, extra) =>
      UI.el("button", {
        type: "button",
        class: `replay-btn replay-${name}${extra ? ` ${extra}` : ""}`,
        "aria-label": label,
        title: label,
        html: ICONS[name],
        onclick: onClick,
      });

    const firstBtn = iconButton("first", "First move", () => jump(0));
    const prevBtn = iconButton("prev", "Previous move", () => jump(step - 1));
    const playBtn = iconButton("play", "Play", () => toggle(), "replay-play");
    const nextBtn = iconButton("next", "Next move", () => jump(step + 1));
    const lastBtn = iconButton("last", "Last move", () => jump(total));

    const slider = UI.el("input", {
      type: "range",
      class: "replay-slider",
      min: "0",
      max: String(total),
      step: "1",
      value: "0",
      "aria-label": "Replay position",
    });
    slider.addEventListener("input", () => jump(Number(slider.value)));

    const label = UI.el("span", { class: "replay-label", "aria-live": "polite" });

    const rows = moves.map((move, k) =>
      UI.el(
        "li",
        {},
        UI.el(
          "button",
          {
            type: "button",
            class: `replay-move replay-move-${move.player.toLowerCase()}`,
            "aria-label": `Move ${k + 1}: ${names[move.player]}, ${cellName(move.index)}`,
            onclick: () => jump(k + 1),
          },
          UI.el("span", { class: "replay-move-num" }, `${k + 1}.`),
          markNode(move.player, "replay-move-mark"),
          UI.el("span", { class: "replay-move-name" }, names[move.player]),
          UI.el("span", { class: "replay-move-arrow", "aria-hidden": "true" }, "→"),
          UI.el("span", { class: "replay-move-cell" }, cellName(move.index))
        )
      )
    );
    const list = UI.el("ol", { class: "replay-list", "aria-label": "Moves" }, rows);
    const listWrap = UI.el(
      "div",
      { class: "replay-moves" },
      total ? list : UI.el("p", { class: "replay-empty" }, "No moves were played.")
    );

    const stage = UI.el(
      "div",
      { class: "replay-stage" },
      board,
      UI.el("div", { class: "replay-controls" }, firstBtn, prevBtn, playBtn, nextBtn, lastBtn),
      UI.el("div", { class: "replay-scrub" }, slider, label)
    );
    const content = UI.el("div", { class: "replay" }, stage, listWrap);

    const scrollRow = (row) => {
      if (!row) return;
      const top = row.offsetTop;
      const bottom = top + row.offsetHeight;
      if (top < list.scrollTop) list.scrollTop = top - 4;
      else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight + 4;
    };

    const render = () => {
      const shown = moves.slice(0, step);
      const final = step === total && total > 0;
      const pop = !reducedMotion();
      board.classList.toggle("has-win", final && !!line);
      board.classList.toggle("is-draw", final && !winner && total === 9);
      cells.forEach((cell, i) => {
        cell.className = "replay-cell";
        cell.replaceChildren();
        cell.setAttribute("aria-label", cellName(i));
      });
      shown.forEach((move, k) => {
        const cell = cells[move.index];
        const latest = k === step - 1;
        cell.classList.add(`has-${move.player.toLowerCase()}`);
        cell.append(markNode(move.player, latest && pop ? "replay-pop" : ""));
        if (latest) {
          cell.classList.add("is-latest");
          cell.append(UI.el("span", { class: "replay-tag", "aria-hidden": "true" }, String(k + 1)));
        }
        cell.setAttribute("aria-label", `${cellName(move.index)}, ${names[move.player]}, move ${k + 1}`);
      });
      if (final && line && winner) {
        line.forEach((i) => cells[i] && cells[i].classList.add("is-win", `win-${winner.toLowerCase()}`));
      }
      slider.value = String(step);
      slider.style.setProperty("--fill", total ? `${(step / total) * 100}%` : "0%");
      label.textContent = `Move ${step} of ${total}`;
      firstBtn.disabled = step === 0;
      prevBtn.disabled = step === 0;
      nextBtn.disabled = step === total;
      lastBtn.disabled = step === total;
      const playing = timer !== null;
      playBtn.innerHTML = playing ? ICONS.pause : ICONS.play;
      playBtn.setAttribute("aria-label", playing ? "Pause" : step === total ? "Replay from start" : "Play");
      playBtn.title = playBtn.getAttribute("aria-label");
      playBtn.setAttribute("aria-pressed", String(playing));
      playBtn.disabled = total === 0;
      rows.forEach((row, k) => {
        const active = k === step - 1;
        const btn = row.firstChild;
        btn.classList.toggle("is-current", active);
        if (active) btn.setAttribute("aria-current", "step");
        else btn.removeAttribute("aria-current");
      });
      scrollRow(rows[step - 1]);
    };

    const stopTimer = () => {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    };

    const tick = () => {
      if (!alive) return;
      if (step >= total) {
        stopTimer();
        render();
        return;
      }
      step += 1;
      timer = step >= total ? null : setTimeout(tick, STEP_MS);
      render();
    };

    const play = () => {
      if (!total) return;
      stopTimer();
      if (step >= total) step = 0;
      timer = setTimeout(tick, STEP_MS);
      render();
    };

    const pause = () => {
      stopTimer();
      render();
    };

    const toggle = () => (timer !== null ? pause() : play());

    const jump = (n) => {
      stopTimer();
      step = Math.max(0, Math.min(total, Number.isFinite(n) ? Math.round(n) : 0));
      render();
    };

    const onKey = (e) => {
      if (!alive || e.altKey || e.ctrlKey || e.metaKey) return;
      const target = e.target;
      const tag = target && target.tagName;
      if (e.key === " " || e.key === "Spacebar") {
        if (tag === "BUTTON" || tag === "TEXTAREA" || (tag === "INPUT" && target !== slider)) return;
        e.preventDefault();
        toggle();
        return;
      }
      if (tag === "TEXTAREA" || (tag === "INPUT" && target !== slider)) return;
      const actions = {
        ArrowLeft: () => jump(step - 1),
        ArrowRight: () => jump(step + 1),
        Home: () => jump(0),
        End: () => jump(total),
      };
      const action = actions[e.key];
      if (!action) return;
      e.preventDefault();
      action();
    };

    const cleanup = () => {
      alive = false;
      stopTimer();
      document.removeEventListener("keydown", onKey);
    };

    UI.openSheet({
      title: "Replay",
      subtitle: subtitleFor(record, total),
      wide: true,
      content,
      onClose: cleanup,
    });
    document.addEventListener("keydown", onKey);
    render();
    if (total) play();
  };

  let lastRecord = null;

  const removeCard = () => {
    const slot = UI.slot("insights");
    if (slot) slot.querySelectorAll(".replay-card").forEach((node) => node.remove());
  };

  const addCard = (result) => {
    removeCard();
    const slot = UI.slot("insights");
    if (!slot || !result || !Array.isArray(result.moves) || !result.moves.length) return;
    lastRecord = JSON.parse(JSON.stringify(result));
    const card = UI.el(
      "div",
      { class: "insight-card replay-card" },
      UI.el("span", { class: "replay-card-icon", html: ICONS.replay, "aria-hidden": "true" }),
      UI.el("p", { class: "replay-card-text" }, "Watch the game back"),
      UI.el(
        "button",
        { type: "button", class: "btn btn-ghost replay-card-btn", onclick: () => lastRecord && open(JSON.parse(JSON.stringify(lastRecord))) },
        "Replay"
      )
    );
    slot.append(card);
  };

  Game.on("end", (result) => {
    try {
      addCard(result);
    } catch (err) {
      console.warn("Replay card could not be shown", err);
    }
  });
  Game.on("start", () => {
    lastRecord = null;
    removeCard();
  });
  Game.on("abort", () => {
    lastRecord = null;
    removeCard();
  });
  if (window.GameHistory) {
    Game.on("history:change", () => {
      const slot = UI.slot("insights");
      if (!lastRecord || !slot) return;
      if (!slot.querySelector(".replay-card")) lastRecord = null;
    });
  }

  window.Replay = { open };
})();
