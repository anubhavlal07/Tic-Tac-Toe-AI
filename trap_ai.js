const TrapAI = (() => {
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
  const EPSILON = 1e-9;

  const winner = (board) => {
    for (const [a, b, c] of LINES) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  };

  const emptyCells = (board) => {
    const cells = [];
    for (let i = 0; i < 9; i++) {
      if (!board[i]) cells.push(i);
    }
    return cells;
  };

  const keyOf = (board, turn) => board.map((c) => c || "-").join("") + turn;

  const winningCells = (board, player) =>
    emptyCells(board).filter((i) => {
      board[i] = player;
      const won = winner(board) === player;
      board[i] = null;
      return won;
    });

  const createSolver = (ai, human) => {
    const scoreMemo = new Map();
    const chanceMemo = new Map();
    const other = (p) => (p === ai ? human : ai);

    const score = (board, turn) => {
      const key = keyOf(board, turn);
      if (scoreMemo.has(key)) return scoreMemo.get(key);

      const w = winner(board);
      const empties = emptyCells(board);
      let result;
      if (w === ai) result = 10 + empties.length;
      else if (w === human) result = -10 - empties.length;
      else if (empties.length === 0) result = 0;
      else {
        result = turn === ai ? -Infinity : Infinity;
        for (const i of empties) {
          board[i] = turn;
          const s = score(board, other(turn));
          board[i] = null;
          result = turn === ai ? Math.max(result, s) : Math.min(result, s);
        }
      }
      scoreMemo.set(key, result);
      return result;
    };

    const safeMoves = (board) => {
      const scored = emptyCells(board).map((i) => {
        board[i] = ai;
        const s = score(board, human);
        board[i] = null;
        return { index: i, score: s };
      });
      const best = Math.max(...scored.map((m) => m.score));
      return scored.filter((m) => m.score === best).map((m) => m.index);
    };

    const humanReplies = (board) => {
      const wins = winningCells(board, human);
      if (wins.length) return wins;
      const blocks = winningCells(board, ai);
      if (blocks.length) return blocks;
      return emptyCells(board);
    };

    const chance = (board, turn, model) => {
      const key = keyOf(board, turn) + model;
      if (chanceMemo.has(key)) return chanceMemo.get(key);

      const w = winner(board);
      let result;
      if (w === ai) result = 1;
      else if (w === human || emptyCells(board).length === 0) result = 0;
      else if (turn === ai) {
        result = 0;
        for (const i of safeMoves(board)) {
          board[i] = ai;
          result = Math.max(result, chance(board, human, model));
          board[i] = null;
        }
      } else {
        const replies = model === "smart" ? humanReplies(board) : emptyCells(board);
        result = 0;
        for (const i of replies) {
          board[i] = human;
          result += chance(board, ai, model);
          board[i] = null;
        }
        result /= replies.length;
      }
      chanceMemo.set(key, result);
      return result;
    };

    const rank = (board, i) => {
      board[i] = ai;
      const r = {
        index: i,
        smart: chance(board, human, "smart"),
        naive: chance(board, human, "naive"),
      };
      board[i] = null;
      return r;
    };

    const better = (a, b) => {
      if (Math.abs(a.smart - b.smart) > EPSILON) return a.smart > b.smart ? 1 : -1;
      if (Math.abs(a.naive - b.naive) > EPSILON) return a.naive > b.naive ? 1 : -1;
      return 0;
    };

    const bestMove = (input, random = Math.random) => {
      const board = input.map((c) => (c === ai || c === human ? c : null));
      const ranked = safeMoves(board).map((i) => rank(board, i));
      let top = [ranked[0]];
      for (const r of ranked.slice(1)) {
        const cmp = better(r, top[0]);
        if (cmp > 0) top = [r];
        else if (cmp === 0) top.push(r);
      }
      return top[Math.floor(random() * top.length)].index;
    };

    return { bestMove, score, chance };
  };

  return { createSolver, winner, emptyCells };
})();

if (typeof module !== "undefined") module.exports = TrapAI;
