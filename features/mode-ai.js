(() => {
  const AI = "X";
  const HUMAN = "O";
  const solver = TrapAI.createSolver(AI, HUMAN);

  Game.registerMode({
    id: "ai",
    order: 1,
    label: "Vs Trap AI",
    hint: "It never loses. One slip and it wins.",
    icon: "x",
    tone: "x",
    note: "Draws are the best a perfect player can get. One mistake and the AI wins.",
    options: [
      { label: "You start", hint: "You play O", icon: "o", tone: "o", value: { first: HUMAN } },
      { label: "AI starts", hint: "AI plays X", icon: "x", tone: "x", value: { first: AI } },
    ],
    names: () => ({ X: "AI", O: "You" }),
    isLocal: (player) => player === HUMAN,
    perspective: () => HUMAN,
    turnText: (player) => (player === HUMAN ? "Your turn" : "AI is thinking…"),
    onTurn(player, game) {
      if (player !== AI) return;
      game.later(game.state.moves.length === 0 ? 900 : 650, () => {
        game.play(solver.bestMove(game.state.board), AI, "ai");
      });
    },
  });

  window.TrapSolver = solver;
})();
