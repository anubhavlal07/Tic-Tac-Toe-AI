const UI = (() => {
  const statusEl = document.querySelector(".status");
  const toastEl = document.getElementById("infoToast");
  const toastMsg = document.getElementById("infoMessage");
  const sheetEl = document.getElementById("sheet");
  const sheetTitle = document.getElementById("sheetTitle");
  const sheetSubtitle = document.getElementById("sheetSubtitle");
  const sheetBody = document.getElementById("sheetBody");
  const sheetClose = document.getElementById("sheetClose");
  const resetBtn = document.querySelector(".reset");
  const themeToggle = document.getElementById("themeToggle");
  const legendNames = { X: document.getElementById("legendX"), O: document.getElementById("legendO") };
  const legendNote = document.getElementById("legendNote");

  const slots = {
    toolbar: document.getElementById("toolbar"),
    insights: document.getElementById("insights"),
    overlay: document.getElementById("boardOverlay"),
    "status-extra": document.getElementById("statusExtra"),
  };

  const el = (tag, attrs = {}, ...children) => {
    const node = document.createElement(tag);
    for (const [key, value] of Object.entries(attrs)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === "class") node.className = value;
      else if (key === "html") node.innerHTML = value;
      else if (key.startsWith("on") && typeof value === "function") node.addEventListener(key.slice(2), value);
      else node.setAttribute(key, value === true ? "" : value);
    }
    node.append(...children.flat().filter((c) => c !== null && c !== undefined && c !== false));
    return node;
  };

  const markEl = (player, size) => {
    const node = el("span", { class: `mark mark-${String(player).toLowerCase()}` });
    if (size) node.style.setProperty("--size", `${size}px`);
    return node;
  };

  const status = (text) => {
    statusEl.replaceChildren(el("span", {}, text));
  };

  let toastTimer;
  const toast = (message, ms = 2000) => {
    toastMsg.textContent = message;
    toastEl.classList.add("active");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("active"), ms);
  };

  let sheetState = null;
  const closeSheet = () => {
    if (!sheetState) return;
    const { onClose } = sheetState;
    sheetState = null;
    sheetEl.classList.remove("active");
    if (onClose) onClose();
  };

  const openSheet = ({ title = "", subtitle = "", content, dismissible = true, onClose, wide = false } = {}) => {
    if (sheetState) {
      const previous = sheetState.onClose;
      sheetState = null;
      if (previous) previous();
    }
    sheetTitle.textContent = title;
    sheetSubtitle.textContent = subtitle;
    sheetSubtitle.hidden = !subtitle;
    sheetBody.replaceChildren(...(content ? [content] : []));
    sheetClose.hidden = !dismissible;
    sheetEl.classList.toggle("sheet-wide", wide);
    sheetState = { dismissible, onClose };
    sheetEl.classList.add("active");
    const handle = {
      body: sheetBody,
      close: () => {
        if (sheetState && sheetState.handle === handle) closeSheet();
      },
      setTitle: (t, s) => {
        sheetTitle.textContent = t;
        if (s !== undefined) {
          sheetSubtitle.textContent = s;
          sheetSubtitle.hidden = !s;
        }
      },
    };
    sheetState.handle = handle;
    return handle;
  };

  sheetClose.addEventListener("click", closeSheet);
  sheetEl.addEventListener("click", (e) => {
    if (e.target === sheetEl && sheetState && sheetState.dismissible) closeSheet();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && sheetState && sheetState.dismissible) closeSheet();
  });

  const addToolbarButton = ({ id, label, icon, onClick, pressed, order = 50 }) => {
    const button = el(
      "button",
      { type: "button", class: "tool-btn", id, "aria-label": label, title: label, html: icon },
    );
    button.style.order = order;
    if (pressed !== undefined) button.setAttribute("aria-pressed", String(!!pressed));
    if (onClick) button.addEventListener("click", (e) => onClick(e, button));
    slots.toolbar.append(button);
    return button;
  };

  const slot = (name) => slots[name] || null;

  const miniBoard = (board, { marks = {}, line = null, size = 132, label } = {}) => {
    const wrap = el("div", { class: "mini-board", role: "img", "aria-label": label || "Board position" });
    wrap.style.setProperty("--mini", `${size}px`);
    for (let i = 0; i < 9; i++) {
      const cell = el("div", { class: "mini-cell" });
      if (marks[i]) cell.classList.add(`mini-${marks[i]}`);
      if (line && line.includes(i)) cell.classList.add("mini-line");
      if (board[i]) cell.append(markEl(board[i], Math.round(size / 3 * 0.42)));
      wrap.append(cell);
    }
    return wrap;
  };

  const scoreEls = {
    win: document.getElementById("wins"),
    draw: document.getElementById("ties"),
    loss: document.getElementById("losses"),
  };
  let scores = { wins: 0, ties: 0, losses: 0 };
  const scoreKey = { win: "wins", draw: "ties", loss: "losses" };

  const renderScores = () => {
    scoreEls.win.textContent = scores.wins;
    scoreEls.draw.textContent = scores.ties;
    scoreEls.loss.textContent = scores.losses;
  };

  const loadScores = () => {
    try {
      const saved = JSON.parse(localStorage.getItem("tictactoe_scores"));
      if (saved) scores = { ...scores, ...saved };
    } catch (err) {
      console.warn("Could not read scores", err);
    }
    renderScores();
  };

  const recordScore = (outcome) => {
    const key = scoreKey[outcome];
    if (!key) return;
    scores[key] += 1;
    renderScores();
    try {
      localStorage.setItem("tictactoe_scores", JSON.stringify(scores));
    } catch (err) {
      console.warn("Could not save scores", err);
    }
  };

  const applyTheme = (isDark) => {
    document.body.classList.toggle("dark-mode", isDark);
    themeToggle.setAttribute("aria-pressed", String(isDark));
  };

  const loadTheme = () => {
    let saved = null;
    try {
      saved = localStorage.getItem("tictactoe_theme");
    } catch (err) {
      saved = null;
    }
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    applyTheme(saved ? saved === "dark" : prefersDark);
  };

  themeToggle.addEventListener("click", () => {
    const isDark = !document.body.classList.contains("dark-mode");
    applyTheme(isDark);
    try {
      localStorage.setItem("tictactoe_theme", isDark ? "dark" : "light");
    } catch (err) {
      console.warn("Could not save theme", err);
    }
  });

  const modeIcon = (icon) => {
    if (icon === "x" || icon === "o") return markEl(icon, 26);
    if (icon === "xo") return el("span", { class: "mark-pair" }, markEl("x", 18), markEl("o", 18));
    return el("span", { class: "mode-svg", html: icon || "" });
  };

  const choiceCard = ({ label, hint, icon, tone, onClick }) =>
    el(
      "button",
      { type: "button", class: `player-card${tone ? ` tone-${tone}` : ""}`, onclick: onClick },
      el("span", { class: "player-icon" }, modeIcon(icon)),
      el("span", { class: "player-text" }, el("span", { class: "player-name" }, label), hint ? el("span", { class: "player-hint" }, hint) : null)
    );

  let lastModeId = null;
  let hasPlayed = false;

  const openNewGame = ({ modeId } = {}) => {
    const modes = Game.modes();
    const body = el("div", { class: "new-game" });
    const sheet = openSheet({ title: "New game", content: body, dismissible: hasPlayed });

    const begin = (mode, options) => {
      sheet.close();
      lastModeId = mode.id;
      hasPlayed = true;
      Game.start(mode.id, options || {});
    };

    const showModes = () => {
      sheet.setTitle("Choose a mode", "Pick who you want to play against.");
      body.replaceChildren(
        el(
          "div",
          { class: "player-selection mode-list" },
          modes.map((mode) =>
            choiceCard({ label: mode.label, hint: mode.hint, icon: mode.icon, tone: mode.tone, onClick: () => showOptions(mode) })
          )
        )
      );
    };

    const showOptions = (mode) => {
      sheet.setTitle(mode.label, mode.hint || "");
      const back = modes.length > 1 ? el("button", { type: "button", class: "link-btn", onclick: showModes }, "← All modes") : null;
      if (mode.renderOptions) {
        const area = el("div", { class: "mode-options" });
        body.replaceChildren(area, back || "");
        mode.renderOptions(area, (options) => begin(mode, options), { back: showModes, sheet });
        return;
      }
      const options = mode.options || [];
      if (!options.length) {
        begin(mode, {});
        return;
      }
      body.replaceChildren(
        el("div", { class: "player-selection" }, options.map((opt) => choiceCard({ ...opt, onClick: () => begin(mode, opt.value) }))),
        back || ""
      );
    };

    const target = modes.find((m) => m.id === (modeId || lastModeId));
    if (target) showOptions(target);
    else if (modes.length === 1) showOptions(modes[0]);
    else showModes();
    return sheet;
  };

  resetBtn.addEventListener("click", () => openNewGame());

  const boot = () => {
    loadScores();
    Game.on("start", ({ names, modeId }) => {
      legendNames.X.textContent = names.X;
      legendNames.O.textContent = names.O;
      const mode = Game.mode();
      legendNote.textContent = (mode && mode.note) || "";
      document.body.dataset.mode = modeId;
    });
    Game.on("end", (result) => {
      if (result.modeId === "ai") recordScore(result.outcome);
    });
    openNewGame();
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js").catch((err) => console.warn("Service worker registration failed", err));
    }
  };

  loadTheme();
  window.addEventListener("load", boot);

  return { el, markEl, status, toast, openSheet, closeSheet, addToolbarButton, slot, miniBoard, openNewGame };
})();
