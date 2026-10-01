const Game = (() => {
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

  const listeners = new Map();
  const modes = new Map();
  const cells = Array.from(document.querySelectorAll(".game-cell"));
  const grid = document.querySelector(".game-grid");
  const container = document.querySelector(".container");

  const state = {
    board: Array(9).fill(null),
    moves: [],
    turn: "X",
    first: "X",
    active: false,
    modeId: null,
    options: {},
    result: null,
    session: 0,
  };

  const other = (player) => (player === "X" ? "O" : "X");

  const on = (event, fn) => {
    if (!listeners.has(event)) listeners.set(event, new Set());
    listeners.get(event).add(fn);
    return () => listeners.get(event).delete(fn);
  };

  const emit = (event, payload = {}) => {
    for (const fn of listeners.get(event) || []) {
      try {
        fn(payload, state);
      } catch (err) {
        console.error(`[Game] "${event}" listener failed`, err);
      }
    }
  };

  const mode = () => modes.get(state.modeId) || null;

  const findLine = (board) =>
    LINES.find(([a, b, c]) => board[a] && board[a] === board[b] && board[a] === board[c]) || null;

  const isLocal = (player) => {
    const m = mode();
    if (!m) return false;
    return m.isLocal ? m.isLocal(player, state) : true;
  };

  const isLocalTurn = () => state.active && isLocal(state.turn);

  const perspective = () => {
    const m = mode();
    return m && m.perspective ? m.perspective(state) : null;
  };

  const names = () => {
    const m = mode();
    const fallback = { X: "X", O: "O" };
    return m && m.names ? { ...fallback, ...m.names(state) } : fallback;
  };

  const later = (ms, fn) => {
    const session = state.session;
    return setTimeout(() => {
      if (session === state.session && state.active) fn();
    }, ms);
  };

  const turnText = (player) => {
    const m = mode();
    if (m && m.turnText) return m.turnText(player, state);
    return isLocal(player) ? "Your turn" : `${names()[player]} is thinking…`;
  };

  const endText = (result) => {
    const m = mode();
    if (m && m.endText) return m.endText(result, state);
    if (result.outcome === "win") return "You win! 🎉";
    if (result.outcome === "loss") return "You lose 😔";
    if (!result.winner) return "It's a draw";
    return `${names()[result.winner]} wins!`;
  };

  const clearBoard = () => {
    cells.forEach((cell) => cell.classList.remove("x", "o", "win-line", "win-x", "win-o", "draw", "shake"));
  };

  const flip = () => {
    container.classList.remove("reset-animation");
    void container.offsetWidth;
    container.classList.add("reset-animation");
    setTimeout(() => container.classList.remove("reset-animation"), 600);
  };

  const shake = (cell) => {
    cell.classList.remove("shake");
    void cell.offsetWidth;
    cell.classList.add("shake");
    setTimeout(() => cell.classList.remove("shake"), 450);
  };

  const beginTurn = () => {
    grid.dataset.turn = state.turn;
    grid.dataset.local = String(isLocal(state.turn));
    UI.status(turnText(state.turn));
    emit("turn", { player: state.turn, local: isLocal(state.turn), moveNumber: state.moves.length });
    const m = mode();
    if (m && m.onTurn) m.onTurn(state.turn, api);
  };

  const start = (modeId, options = {}) => {
    if (!modes.has(modeId)) throw new Error(`Unknown mode "${modeId}"`);
    const previous = mode();
    if (previous && previous.teardown) previous.teardown(api, { next: modeId });
    state.session += 1;
    state.board = Array(9).fill(null);
    state.moves = [];
    state.modeId = modeId;
    state.options = options;
    state.first = options.first || "X";
    state.turn = state.first;
    state.active = true;
    state.result = null;
    clearBoard();
    flip();
    const m = mode();
    if (m.setup) m.setup(api, options);
    emit("start", { modeId, options, first: state.first, names: names(), perspective: perspective() });
    beginTurn();
  };

  const finish = (winner, line) => {
    state.active = false;
    const session = state.session;
    const me = perspective();
    const outcome = me ? (winner ? (winner === me ? "win" : "loss") : "draw") : null;
    state.result = {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
      at: Date.now(),
      modeId: state.modeId,
      options: state.options,
      first: state.first,
      moves: state.moves.map(({ index, player }) => ({ index, player })),
      winner,
      line,
      outcome,
      perspective: me,
      names: names(),
    };
    grid.dataset.local = "false";
    delete grid.dataset.turn;
    if (line) {
      line.forEach((i, k) =>
        setTimeout(() => {
          if (session === state.session) cells[i].classList.add("win-line", `win-${winner.toLowerCase()}`);
        }, k * 120)
      );
    } else {
      cells.forEach((cell) => cell.classList.add("draw"));
    }
    UI.status(endText(state.result));
    emit("end", state.result);
  };

  const play = (index, player = state.turn, source = "local") => {
    if (!state.active || player !== state.turn) return false;
    if (!Number.isInteger(index) || index < 0 || index > 8 || state.board[index]) return false;
    state.board[index] = player;
    state.moves.push({ index, player });
    cells[index].classList.add(player.toLowerCase());
    emit("move", { index, player, source, board: state.board.slice(), moveNumber: state.moves.length });
    const line = findLine(state.board);
    if (line || state.moves.length === 9) {
      finish(line ? player : null, line);
    } else {
      state.turn = other(player);
      beginTurn();
    }
    return true;
  };

  const abort = (reason = "Game ended") => {
    if (!state.active) return;
    state.active = false;
    state.session += 1;
    grid.dataset.local = "false";
    delete grid.dataset.turn;
    UI.status(reason);
    emit("abort", { reason });
  };

  const registerMode = (definition) => {
    if (!definition || !definition.id) throw new Error("Mode needs an id");
    modes.set(definition.id, definition);
    emit("modes", { modes: listModes() });
  };

  const listModes = () => [...modes.values()].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));

  cells.forEach((cell, i) =>
    cell.addEventListener("click", () => {
      if (state.board[i]) {
        shake(cell);
        return;
      }
      if (!isLocalTurn()) return;
      play(i, state.turn, "local");
    })
  );

  const api = {
    LINES,
    state,
    on,
    emit,
    start,
    play,
    abort,
    later,
    other,
    findLine,
    isLocal,
    isLocalTurn,
    perspective,
    names,
    mode,
    modes: listModes,
    registerMode,
  };

  return api;
})();
