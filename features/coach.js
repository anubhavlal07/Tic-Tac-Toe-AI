(() => {
  const CELL_NAMES = ["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"];
  const LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6],
  ];
  const PREFERENCE = [4, 0, 2, 6, 8, 1, 3, 5, 7];

  let sources = [];

  const cap = (text) => text.charAt(0).toUpperCase() + text.slice(1);
  const cellName = (i) => CELL_NAMES[i] || `cell ${i + 1}`;
  const other = (p) => (p === "X" ? "O" : "X");

  const listNames = (indexes) => {
    const names = indexes.map(cellName);
    if (names.length <= 1) return names.join("");
    return `${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}`;
  };

  const getSolver = () => {
    if (window.TrapSolver && typeof window.TrapSolver.score === "function") return window.TrapSolver;
    if (window.TrapAI && typeof window.TrapAI.createSolver === "function") {
      window.TrapSolver = window.TrapAI.createSolver("X", "O");
      return window.TrapSolver;
    }
    return null;
  };

  const threats = (board, player) =>
    LINES.filter((line) => {
      const own = line.filter((i) => board[i] === player).length;
      const empty = line.filter((i) => !board[i]).length;
      return own === 2 && empty === 1;
    }).length;

  const winsLine = (board) =>
    LINES.find(([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c]) || null;

  const analyze = (result, solver) => {
    const human = result.perspective || "O";
    const ai = other(human);
    const edge = (s) => (ai === "X" ? s : -s);
    const evaluate = (board, turn) => {
      if (!solver) return 0;
      const s = solver.score(board.slice(), turn);
      return Number.isFinite(s) ? edge(s) : 0;
    };

    const board = Array(9).fill(null);
    const steps = [];
    for (const [k, move] of (result.moves || []).entries()) {
      if (!move || !Number.isInteger(move.index) || move.index < 0 || move.index > 8 || board[move.index]) break;
      const before = board.slice();
      const scoreBefore = evaluate(before, move.player);
      board[move.index] = move.player;
      const after = board.slice();
      const scoreAfter = evaluate(after, other(move.player));
      steps.push({
        number: k + 1,
        index: move.index,
        player: move.player,
        human: move.player === human,
        source: sources[k] || null,
        before,
        after,
        scoreBefore,
        scoreAfter,
        threats: threats(after, move.player),
        wins: !!winsLine(after),
      });
    }

    let mistake = steps.findIndex((s) => s.human && s.scoreBefore <= 0 && s.scoreAfter > 0);
    if (mistake < 0) mistake = steps.findIndex((s) => s.scoreBefore <= 0 && s.scoreAfter > 0);

    let better = [];
    let primary = null;
    if (mistake >= 0 && solver) {
      const step = steps[mistake];
      const options = [];
      step.before.forEach((cell, i) => {
        if (cell || i === step.index) return;
        const next = step.before.slice();
        next[i] = step.player;
        const s = evaluate(next, other(step.player));
        if (s <= 0) options.push({ index: i, score: s });
      });
      options.sort((a, b) => a.score - b.score || PREFERENCE.indexOf(a.index) - PREFERENCE.indexOf(b.index));
      better = options.map((o) => o.index);
      primary = options.length ? options[0].index : null;
    }

    const follow = mistake >= 0 ? steps[mistake + 1] || null : null;
    const reply = follow && follow.player === ai ? follow : null;

    return { human, ai, steps, mistake, better, primary, reply };
  };

  const clear = () => {
    const slot = UI.slot("insights");
    if (!slot) return;
    slot.querySelectorAll(".coach-card").forEach((node) => node.remove());
  };

  const ghost = (wrap, index, player, size, kind) => {
    const cell = wrap.children[index];
    if (!cell) return;
    const mark = UI.markEl(player, Math.round((size / 3) * 0.42));
    mark.classList.add("coach-ghost", `coach-ghost-${kind}`);
    cell.append(mark);
  };

  const verdictOf = (analysis, step, k) => {
    if (step.human) {
      if (k === analysis.mistake) return { text: "Mistake", tone: "bad" };
      if (step.scoreAfter <= 0) return { text: "Safe", tone: "good" };
      return { text: "Already lost", tone: "muted" };
    }
    if (step.wins) return { text: "AI wins", tone: "ai" };
    if (step.threats >= 2) return { text: "AI sets a fork", tone: "ai" };
    if (k === analysis.mistake) return { text: "Turning point", tone: "bad" };
    return { text: "AI", tone: "ai" };
  };

  const describeMove = (analysis, step) => {
    if (!step.human) return `AI played ${cellName(step.index)}.`;
    if (step.source === "timeout") return `Time ran out, so ${cellName(step.index)} was played for you.`;
    return `You played ${cellName(step.index)}.`;
  };

  const openReview = (analysis, result) => {
    const list = UI.el(
      "ol",
      { class: "coach-review" },
      analysis.steps.map((step, k) => {
        const verdict = verdictOf(analysis, step, k);
        const marks = { [step.index]: verdict.tone === "bad" ? "bad" : verdict.tone === "good" ? "good" : "focus" };
        const line = k === analysis.steps.length - 1 && result.line ? result.line : null;
        const board = UI.miniBoard(step.after, {
          marks,
          line,
          size: 76,
          label: `Board after move ${step.number}`,
        });
        return UI.el(
          "li",
          { class: `coach-step coach-step-${verdict.tone}` },
          board,
          UI.el(
            "div",
            { class: "coach-step-text" },
            UI.el(
              "div",
              { class: "coach-step-head" },
              UI.el("span", { class: "coach-step-num" }, `Move ${step.number}`),
              UI.el("span", { class: `coach-badge coach-badge-${verdict.tone}` }, verdict.text)
            ),
            UI.el("p", {}, describeMove(analysis, step))
          )
        );
      })
    );
    UI.openSheet({
      title: "Move review",
      subtitle: "Every move in order, with the board after it.",
      wide: true,
      content: UI.el("div", { class: "coach-review-wrap" }, list),
    });
  };

  const explainReply = (analysis) => {
    const reply = analysis.reply;
    if (reply && reply.wins) return "That left a line open, and the AI finished it.";
    if (reply && reply.threats >= 2) return "That let the AI set up a fork — two threats at once, so you could only block one.";
    return "From there the AI could force a win.";
  };

  const lossCard = (result) => {
    const analysis = analyze(result, getSolver());
    const card = UI.el("div", { class: "insight-card coach-card coach-loss" });
    card.append(UI.el("h3", {}, "Where it slipped"));

    if (analysis.mistake < 0) {
      card.append(UI.el("p", {}, "The AI found a winning line this time. Review the moves to see how it got there."));
    } else {
      const step = analysis.steps[analysis.mistake];
      const size = 112;
      const marks = { [step.index]: "bad" };
      analysis.better.forEach((i) => {
        marks[i] = "good";
      });
      const board = UI.miniBoard(step.before, {
        marks,
        size,
        label: `Position before move ${step.number}. Your move ${cellName(step.index)} is marked red, safer cells green.`,
      });
      ghost(board, step.index, step.player, size, "bad");
      if (analysis.primary !== null) ghost(board, analysis.primary, step.player, size, "good");

      const who = step.human
        ? step.source === "timeout"
          ? `time ran out and ${cellName(step.index)} was played for you`
          : `you played ${cellName(step.index)}`
        : `the AI played ${cellName(step.index)}`;
      const lines = [UI.el("p", { class: "coach-lead" }, `Move ${step.number}: ${who}.`)];
      if (analysis.primary !== null) {
        const others = analysis.better.filter((i) => i !== analysis.primary);
        let text = `${cap(cellName(analysis.primary))} would have kept the draw.`;
        if (others.length) text += ` So would ${listNames(others)}.`;
        lines.push(UI.el("p", { class: "coach-better" }, text));
      }
      lines.push(UI.el("p", {}, explainReply(analysis)));

      const legend = UI.el(
        "div",
        { class: "coach-legend" },
        UI.el("span", { class: "coach-key coach-key-bad" }, "Your move"),
        analysis.primary !== null ? UI.el("span", { class: "coach-key coach-key-good" }, "Kept the draw") : null
      );

      card.append(UI.el("div", { class: "coach-body" }, board, UI.el("div", { class: "coach-copy" }, lines, legend)));
    }

    if (analysis.steps.length) {
      card.append(
        UI.el(
          "button",
          { type: "button", class: "link-btn coach-review-btn", onclick: () => openReview(analysis, result) },
          "Review every move →"
        )
      );
    }
    return card;
  };

  const drawCard = () =>
    UI.el(
      "div",
      { class: "insight-card coach-card coach-draw" },
      UI.el("h3", {}, "Perfect defence"),
      UI.el("p", {}, "You never gave the AI a chance. A draw is the best result against perfect play.")
    );

  Game.on("start", () => {
    sources = [];
    clear();
  });

  Game.on("abort", () => {
    clear();
  });

  Game.on("move", ({ source, moveNumber }) => {
    if (Number.isInteger(moveNumber) && moveNumber > 0) sources[moveNumber - 1] = source || null;
  });

  Game.on("end", (result) => {
    try {
      clear();
      if (!result || result.modeId !== "ai") return;
      const slot = UI.slot("insights");
      if (!slot) return;
      const human = result.perspective || "O";
      let card = null;
      if (!result.winner) card = drawCard();
      else if (result.winner !== human) card = lossCard(result);
      if (card) slot.prepend(card);
    } catch (err) {
      console.warn("Coach could not explain this game", err);
    }
  });
})();
