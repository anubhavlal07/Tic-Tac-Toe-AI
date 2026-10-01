(() => {
  const KEY = "tictactoe_timer";
  const CHOICES = [0, 3, 5, 10];
  const RADIUS = 15;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  const ICON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="14" r="8"/><path d="M12 14V10.5"/><path d="M10 2h4"/><path d="M12 2v4"/><path d="M19 7l1.5-1.5"/></svg>';

  const load = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      const seconds = saved ? Number(saved.seconds) : 0;
      return CHOICES.includes(seconds) ? seconds : 0;
    } catch (err) {
      return 0;
    }
  };

  const save = (value) => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ seconds: value }));
    } catch (err) {
      console.warn("Could not save timer setting", err);
    }
  };

  let seconds = load();
  let run = null;
  let button = null;

  const valid = (r) =>
    r && r === run && Game.state.session === r.session && Game.state.active && Game.state.turn === r.player;

  const renderRing = () => {
    const ring = UI.el(
      "div",
      { class: "turn-timer", "aria-hidden": "true" },
      UI.el("span", {
        class: "turn-timer-ring",
        html: `<svg viewBox="0 0 36 36"><circle class="turn-timer-track" cx="18" cy="18" r="${RADIUS}"/><circle class="turn-timer-progress" cx="18" cy="18" r="${RADIUS}" stroke-dasharray="${CIRCUMFERENCE}" stroke-dashoffset="0"/></svg>`,
      }),
      UI.el("span", { class: "turn-timer-value" }, "")
    );
    const extra = UI.slot("status-extra");
    if (extra) extra.prepend(ring);
    return ring;
  };

  const stop = () => {
    if (!run) return;
    clearTimeout(run.timeoutId);
    cancelAnimationFrame(run.rafId);
    if (run.ring) run.ring.remove();
    run = null;
  };

  const expire = (r) => {
    if (!valid(r)) return;
    const player = r.player;
    stop();
    const empty = Game.state.board.map((v, i) => (v ? -1 : i)).filter((i) => i >= 0);
    if (!empty.length) return;
    const index = empty[Math.floor(Math.random() * empty.length)];
    Game.emit("timer:expire", { player, index });
    if (Game.play(index, player, "timeout")) UI.toast("Time's up! A random move was played.");
  };

  const tick = (r, remaining) => {
    if (!valid(r)) return;
    r.value.textContent = String(remaining);
    const warn = remaining <= 2 && !r.warned;
    if (warn) {
      r.warned = true;
      r.ring.classList.add("is-warning");
    }
    Game.emit("timer:tick", { remaining, total: r.total, player: r.player });
    if (warn && valid(r)) Game.emit("timer:warning", { remaining });
  };

  const schedule = (r, step) => {
    const due = r.startAt + step * 1000;
    r.timeoutId = setTimeout(() => {
      if (!valid(r)) return;
      if (step >= r.total) {
        expire(r);
        return;
      }
      tick(r, r.total - step);
      schedule(r, step + 1);
    }, Math.max(0, due - performance.now()));
  };

  const draw = (r) => {
    if (!valid(r)) return;
    const elapsed = (performance.now() - r.startAt) / 1000;
    const fraction = Math.min(1, Math.max(0, elapsed / r.total));
    r.progress.setAttribute("stroke-dashoffset", String(CIRCUMFERENCE * fraction));
    if (fraction < 1) r.rafId = requestAnimationFrame(() => draw(r));
  };

  const begin = (player) => {
    stop();
    if (!seconds || !Game.state.active || Game.state.turn !== player) return;
    const ring = renderRing();
    const r = {
      player,
      session: Game.state.session,
      total: seconds,
      startAt: performance.now(),
      ring,
      value: ring.querySelector(".turn-timer-value"),
      progress: ring.querySelector(".turn-timer-progress"),
      warned: false,
      timeoutId: 0,
      rafId: 0,
    };
    run = r;
    tick(r, r.total);
    schedule(r, 1);
    r.rafId = requestAnimationFrame(() => draw(r));
  };

  const syncButton = () => {
    if (!button) return;
    button.setAttribute("aria-pressed", String(seconds > 0));
    const label = seconds > 0 ? `Timed turns: ${seconds} seconds` : "Timed turns";
    button.setAttribute("aria-label", label);
    button.title = label;
    let badge = button.querySelector(".tool-badge");
    if (seconds > 0) {
      if (!badge) {
        badge = UI.el("span", { class: "tool-badge", "aria-hidden": "true" });
        button.append(badge);
      }
      badge.textContent = String(seconds);
    } else if (badge) {
      badge.remove();
    }
  };

  const apply = (value) => {
    seconds = value;
    save(value);
    syncButton();
    if (seconds > 0 && Game.isLocalTurn()) begin(Game.state.turn);
    else stop();
  };

  const openSettings = () => {
    let sheet = null;
    const card = (value) => {
      const selected = value === seconds;
      return UI.el(
        "button",
        {
          type: "button",
          class: `player-card timer-option${selected ? " is-selected" : ""}`,
          "aria-pressed": String(selected),
          onclick: () => {
            if (sheet) sheet.close();
            apply(value);
          },
        },
        UI.el("span", { class: "player-icon timer-option-icon" }, value ? String(value) : "Off"),
        UI.el(
          "span",
          { class: "player-text" },
          UI.el("span", { class: "player-name" }, value ? `${value} s` : "Off"),
          UI.el("span", { class: "player-hint" }, value ? `${value} seconds per move` : "Take your time")
        )
      );
    };
    const content = UI.el("div", { class: "player-selection timer-options" }, CHOICES.map(card));
    sheet = UI.openSheet({
      title: "Timed turns",
      subtitle: "Move before the clock runs out or a random move is played for you.",
      content,
    });
  };

  const init = () => {
    button = UI.addToolbarButton({
      id: "timerBtn",
      label: "Timed turns",
      icon: ICON,
      order: 30,
      pressed: seconds > 0,
      onClick: openSettings,
    });
    syncButton();
  };

  Game.on("turn", ({ player, local }) => {
    if (seconds > 0 && local) begin(player);
    else stop();
  });
  Game.on("move", stop);
  Game.on("end", stop);
  Game.on("abort", stop);
  Game.on("start", stop);

  init();
})();
