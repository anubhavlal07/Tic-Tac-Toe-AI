(() => {
  const ID = "local";
  const STORAGE_KEY = "tictactoe_local_names";
  const MAX_NAME = 16;
  const DEFAULTS = { X: "Player X", O: "Player O" };
  const TURN_CLASSES = ["local-turn-x", "local-turn-o"];
  const tallies = new Map();

  const load = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved && typeof saved === "object" ? saved : {};
    } catch (err) {
      return {};
    }
  };

  const save = (data) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...load(), ...data }));
    } catch (err) {
      console.warn("Could not save player names", err);
    }
  };

  const clean = (value) => String(value || "").trim().slice(0, MAX_NAME);

  const namesOf = (state) => {
    const given = (state && state.options && state.options.names) || {};
    return { X: clean(given.X) || DEFAULTS.X, O: clean(given.O) || DEFAULTS.O };
  };

  const clearTurn = () => document.body.classList.remove(...TURN_CLASSES);

  const showTurn = (player) => {
    clearTurn();
    void document.body.offsetWidth;
    document.body.classList.add(`local-turn-${player.toLowerCase()}`);
  };

  const removeTally = () => {
    const slot = UI.slot("insights");
    if (slot) slot.querySelectorAll(".local-tally").forEach((node) => node.remove());
  };

  const tallyKey = (names) => JSON.stringify([names.X, names.O].sort());

  const record = (result) => {
    const names = result.names || DEFAULTS;
    const key = tallyKey(names);
    const tally = tallies.get(key) || { wins: {}, draws: 0 };
    if (result.winner) {
      const name = names[result.winner];
      tally.wins[name] = (tally.wins[name] || 0) + 1;
    } else {
      tally.draws += 1;
    }
    tallies.set(key, tally);
    return tally;
  };

  const renderTally = (names, tally) => {
    const slot = UI.slot("insights");
    if (!slot) return;
    removeTally();
    const draws = tally.draws;
    const count = (player) => UI.el("span", { class: "local-tally-count" }, String(tally.wins[names[player]] || 0));
    const side = (player) => {
      const parts = [UI.markEl(player, 14), UI.el("span", { class: "local-tally-name" }, names[player])];
      if (player === "X") parts.push(count(player));
      else parts.unshift(count(player));
      return UI.el("span", { class: `local-tally-side local-tally-${player.toLowerCase()}` }, parts);
    };
    const card = UI.el(
      "div",
      {
        class: "insight-card local-tally",
        role: "status",
        "aria-label": `${names.X} ${tally.wins[names.X] || 0}, ${names.O} ${tally.wins[names.O] || 0}, ${draws} ${draws === 1 ? "draw" : "draws"}`,
      },
      UI.el(
        "div",
        { class: "local-tally-head" },
        UI.el("span", { class: "local-tally-label" }, "This session"),
        UI.el("span", { class: "local-tally-draws" }, `${draws} ${draws === 1 ? "draw" : "draws"}`)
      ),
      UI.el(
        "div",
        { class: "local-tally-row" },
        side("X"),
        UI.el("span", { class: "local-tally-sep", "aria-hidden": "true" }, "·"),
        side("O")
      )
    );
    slot.append(card);
  };

  const renderOptions = (container, start) => {
    const saved = load();
    let first = saved.lastFirst === "X" ? "O" : "X";

    const field = (player) => {
      const id = `localName${player}`;
      const input = UI.el("input", {
        id,
        class: "local-input",
        type: "text",
        maxlength: String(MAX_NAME),
        placeholder: DEFAULTS[player],
        autocomplete: "off",
        spellcheck: "false",
        enterkeyhint: "go",
        "aria-label": `Name for ${player}`,
      });
      input.value = clean(saved[player]);
      const label = UI.el(
        "label",
        { class: `local-field local-field-${player.toLowerCase()}`, for: id },
        UI.el("span", { class: "local-field-mark" }, UI.markEl(player, 16)),
        input
      );
      return { label, input };
    };

    const fx = field("X");
    const fo = field("O");

    const seg = (player) =>
      UI.el(
        "button",
        {
          type: "button",
          class: `local-seg local-seg-${player.toLowerCase()}`,
          "aria-pressed": String(first === player),
          onclick: () => {
            first = player;
            segs.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.player === first)));
          },
          "data-player": player,
        },
        UI.markEl(player, 14),
        UI.el("span", {}, player)
      );

    const segs = [seg("X"), seg("O")];

    const submit = (e) => {
      e.preventDefault();
      const names = { X: clean(fx.input.value) || DEFAULTS.X, O: clean(fo.input.value) || DEFAULTS.O };
      save({ X: clean(fx.input.value), O: clean(fo.input.value), lastFirst: first });
      start({ first, names });
    };

    container.replaceChildren(
      UI.el(
        "form",
        { class: "local-form", onsubmit: submit, novalidate: true },
        UI.el("div", { class: "local-fields" }, fx.label, fo.label),
        UI.el(
          "div",
          { class: "local-starter" },
          UI.el("span", { class: "local-starter-label", id: "localStarterLabel" }, "Who starts?"),
          UI.el("div", { class: "local-segmented", role: "group", "aria-labelledby": "localStarterLabel" }, segs)
        ),
        UI.el("button", { type: "submit", class: "btn local-start" }, "Start game")
      )
    );
  };

  Game.registerMode({
    id: ID,
    order: 2,
    label: "Two players",
    hint: "Pass the device between turns.",
    icon: "xo",
    tone: "xo",
    note: "Take turns on this device. X and O alternate who starts each rematch.",
    renderOptions,
    names: (state) => namesOf(state),
    isLocal: () => true,
    perspective: () => null,
    turnText: (player, state) => `${namesOf(state)[player]}'s turn`,
    endText: (result, state) => (result.winner ? `${namesOf(state)[result.winner]} wins! 🎉` : "It's a draw"),
  });

  Game.on("start", ({ modeId }) => {
    clearTurn();
    if (modeId !== ID) removeTally();
  });

  Game.on("turn", ({ player }, state) => {
    if (state.modeId === ID && document.body.dataset.mode === ID) showTurn(player);
    else clearTurn();
  });

  Game.on("abort", clearTurn);

  Game.on("end", (result) => {
    clearTurn();
    if (!result || result.modeId !== ID) return;
    renderTally(result.names || DEFAULTS, record(result));
  });
})();
