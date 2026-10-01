(() => {
  const PEER_SRC = "https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js";
  const PREFIX = "tttai-";
  const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const CODE_LENGTH = 6;
  const JOIN_TIMEOUT = 12000;
  const VERSION = 1;
  const ICE_GRACE = 8000;
  const ICON =
    '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18"/><path d="M12 3a14 14 0 0 0 0 18"/></svg>';

  const room = {
    phase: "choose",
    role: null,
    code: "",
    peer: null,
    conn: null,
    connected: false,
    games: 0,
    played: false,
    rematchAsked: false,
    rematchSent: false,
    error: "",
    joinCode: "",
    timer: 0,
    attempts: 0,
    iceTimer: 0,
  };

  let view = null;
  let pendingJoin = null;
  let loader = null;
  let chip = null;

  const sheetEl = document.getElementById("sheet");

  const loadPeer = () => {
    if (window.Peer) return Promise.resolve(window.Peer);
    if (loader) return loader;
    loader = new Promise((resolve, reject) => {
      if (navigator.onLine === false) {
        reject(new Error("offline"));
        return;
      }
      const script = document.createElement("script");
      script.src = PEER_SRC;
      script.async = true;
      script.onload = () => (window.Peer ? resolve(window.Peer) : reject(new Error("missing")));
      script.onerror = () => {
        script.remove();
        reject(new Error("load"));
      };
      document.head.append(script);
    }).catch((err) => {
      loader = null;
      throw err;
    });
    return loader;
  };

  const randomCode = () => {
    const bytes = new Uint8Array(CODE_LENGTH);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
  };

  const cleanCode = (text) => {
    const raw = String(text || "");
    const match = raw.match(/[?&]room=([^&#\s]+)/i);
    const source = match ? match[1] : raw;
    return source
      .toUpperCase()
      .split("")
      .filter((c) => ALPHABET.includes(c))
      .join("")
      .slice(0, CODE_LENGTH);
  };

  const inviteLink = (code) => `${location.origin}${location.pathname}?room=${code}`;

  const mySymbol = () => (room.role === "host" ? "X" : "O");

  const inOnlineGame = () => Game.state.active && Game.state.modeId === "online";

  const visible = () => !!(view && view.container.isConnected && sheetEl.classList.contains("active"));

  const send = (type, payload = {}) => {
    if (!room.conn || !room.connected) return false;
    try {
      room.conn.send({ v: VERSION, type, ...payload });
      return true;
    } catch (err) {
      console.warn("[online] send failed", err);
      return false;
    }
  };

  const clearJoinTimer = () => {
    clearTimeout(room.timer);
    room.timer = 0;
  };

  const stopIceWatch = () => {
    clearTimeout(room.iceTimer);
    room.iceTimer = 0;
  };

  const destroyPeer = () => {
    clearJoinTimer();
    stopIceWatch();
    const { conn, peer } = room;
    room.conn = null;
    room.peer = null;
    room.connected = false;
    if (conn) {
      try {
        conn.close();
      } catch (err) {
        console.warn("[online] close failed", err);
      }
    }
    if (peer) {
      try {
        peer.destroy();
      } catch (err) {
        console.warn("[online] destroy failed", err);
      }
    }
  };

  const resetRoom = (error = "") => {
    destroyPeer();
    room.phase = "choose";
    room.role = null;
    room.code = "";
    room.games = 0;
    room.played = false;
    room.rematchAsked = false;
    room.rematchSent = false;
    room.attempts = 0;
    room.error = error;
    renderChip();
  };

  const leaveRoom = () => {
    if (room.connected) send("leave");
    resetRoom();
  };

  const networkError = (err) => {
    if (err && err.message === "offline") return "Online play needs an internet connection.";
    if (err && (err.message === "load" || err.message === "missing")) return "Online play needs an internet connection.";
    if (err && ["network", "server-error", "socket-error", "socket-closed", "browser-incompatible"].includes(err.type)) {
      return err.type === "browser-incompatible"
        ? "This browser doesn't support online play."
        : "Couldn't reach the online service. Check your connection.";
    }
    return "Something went wrong. Please try again.";
  };

  const lostFriend = () => {
    const wasPlaying = inOnlineGame();
    const wasConnected = room.connected;
    resetRoom(wasConnected ? "Your friend left the room." : "");
    if (wasPlaying) Game.abort("Your friend left");
    if (wasConnected) UI.toast("Your friend left the room", 2600);
    refresh();
  };

  const outOfSync = () => {
    UI.toast("Out of sync — ending game", 2600);
    Game.abort("Connection out of sync");
  };

  const startGame = (first, gameId) => {
    const me = mySymbol();
    const options = { first, me, gameId, room: room.code };
    room.rematchAsked = false;
    room.rematchSent = false;
    if (view && view.container.isConnected && view.start) {
      view.start(options);
      return;
    }
    UI.closeSheet();
    Game.start("online", options);
  };

  const hostStart = () => {
    if (room.role !== "host" || !room.connected) return;
    const first = room.games % 2 === 0 ? "X" : "O";
    const gameId = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    room.games += 1;
    if (!send("start", { first, hostSymbol: "X", gameId })) {
      lostFriend();
      return;
    }
    startGame(first, gameId);
  };

  const onMessage = (data) => {
    if (!data || data.v !== VERSION || typeof data.type !== "string") return;
    if (data.type === "hello") return;
    if (data.type === "leave") {
      lostFriend();
      return;
    }
    if (data.type === "start") {
      if (room.role !== "guest") return;
      if (data.first !== "X" && data.first !== "O") return;
      startGame(data.first, String(data.gameId || ""));
      return;
    }
    if (data.type === "rematch-request") {
      if (room.role !== "host" || inOnlineGame()) return;
      room.rematchAsked = true;
      UI.toast("Your friend wants a rematch", 2600);
      if (visible()) render();
      else if (!Game.state.active) UI.openNewGame({ modeId: "online" });
      return;
    }
    if (data.type === "move") {
      if (!inOnlineGame()) return;
      const { options, moves } = Game.state;
      const them = Game.other(options.me);
      if (data.gameId !== options.gameId || data.player !== them || data.n !== moves.length + 1) {
        outOfSync();
        return;
      }
      if (!Game.play(data.index, data.player, "remote")) outOfSync();
    }
  };

  const onConnected = () => {
    clearJoinTimer();
    room.connected = true;
    room.phase = "connected";
    room.error = "";
    watchIce(room.conn);
    send("hello", {});
    renderChip();
    if (visible()) render();
    else if (!Game.state.active) UI.openNewGame({ modeId: "online" });
    else UI.toast("Your friend joined");
  };

  const watchIce = (conn) => {
    const pc = conn && conn.peerConnection;
    if (!pc) return;
    pc.addEventListener("iceconnectionstatechange", () => {
      if (room.conn !== conn) return;
      const state = pc.iceConnectionState;
      if (state === "failed" || state === "closed") {
        lostFriend();
      } else if (state === "disconnected") {
        stopIceWatch();
        room.iceTimer = setTimeout(() => {
          if (room.conn === conn && pc.iceConnectionState === "disconnected") lostFriend();
        }, ICE_GRACE);
      } else {
        stopIceWatch();
      }
    });
  };

  const wireConnection = (conn) => {
    room.conn = conn;
    conn.on("open", () => {
      if (room.conn === conn) onConnected();
    });
    conn.on("data", (data) => {
      if (room.conn === conn) onMessage(data);
    });
    conn.on("close", () => {
      if (room.conn === conn) lostFriend();
    });
    conn.on("error", (err) => {
      console.warn("[online] connection error", err);
      if (room.conn === conn) lostFriend();
    });
  };

  const fail = (message) => {
    const phase = room.phase;
    const joinCode = room.joinCode;
    resetRoom(message);
    if (phase === "joining" || phase === "join") {
      room.phase = "join";
      room.joinCode = joinCode;
    }
    refresh();
  };

  const createRoom = () => {
    room.phase = "loading";
    room.role = "host";
    room.error = "";
    render();
    loadPeer()
      .then((Peer) => {
        if (room.role !== "host" || room.peer) return;
        const code = randomCode();
        const peer = new Peer(PREFIX + code);
        room.peer = peer;
        room.code = code;
        peer.on("open", () => {
          if (room.peer !== peer) return;
          room.phase = "waiting";
          room.attempts = 0;
          refresh();
        });
        peer.on("connection", (conn) => {
          if (room.peer !== peer || room.conn) {
            conn.on("open", () => conn.close());
            return;
          }
          wireConnection(conn);
        });
        peer.on("error", (err) => {
          if (room.peer !== peer) return;
          if (err.type === "unavailable-id" && room.attempts < 5) {
            room.attempts += 1;
            room.peer = null;
            peer.destroy();
            createRoom();
            return;
          }
          if (room.connected && ["network", "server-error", "socket-error", "socket-closed", "disconnected"].includes(err.type)) {
            console.warn("[online] signalling lost", err);
            return;
          }
          console.warn("[online] peer error", err);
          fail(networkError(err));
        });
      })
      .catch((err) => {
        if (room.role === "host") fail(networkError(err));
      });
  };

  const joinRoom = (code) => {
    const clean = cleanCode(code);
    if (clean.length !== CODE_LENGTH) {
      room.error = "Room codes have 6 letters or numbers.";
      render();
      return;
    }
    destroyPeer();
    room.phase = "joining";
    room.role = "guest";
    room.code = clean;
    room.joinCode = clean;
    room.error = "";
    render();
    room.timer = setTimeout(() => {
      if (room.phase === "joining") fail("Couldn't reach that room. Check the code and try again.");
    }, JOIN_TIMEOUT);
    loadPeer()
      .then((Peer) => {
        if (room.phase !== "joining" || room.peer) return;
        const peer = new Peer();
        room.peer = peer;
        peer.on("open", () => {
          if (room.peer !== peer) return;
          wireConnection(peer.connect(PREFIX + clean, { reliable: true, serialization: "json" }));
        });
        peer.on("error", (err) => {
          if (room.peer !== peer) return;
          if (err.type === "peer-unavailable") {
            fail("No room with that code.");
            return;
          }
          if (room.connected && ["network", "server-error", "socket-error", "socket-closed", "disconnected"].includes(err.type)) {
            console.warn("[online] signalling lost", err);
            return;
          }
          console.warn("[online] peer error", err);
          fail(networkError(err));
        });
      })
      .catch((err) => {
        if (room.phase === "joining") fail(networkError(err));
      });
  };

  const copyText = (text) => {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise((resolve, reject) => {
      const area = UI.el("textarea", { class: "online-copy-buffer", readonly: true, "aria-hidden": "true" });
      area.value = text;
      document.body.append(area);
      area.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (err) {
        ok = false;
      }
      area.remove();
      if (ok) resolve();
      else reject(new Error("copy"));
    });
  };

  const copyInvite = () => {
    const link = inviteLink(room.code);
    copyText(link)
      .then(() => UI.toast("Invite link copied"))
      .catch(() => UI.toast(`Couldn't copy. Your code is ${room.code}`, 3000));
  };

  const shareInvite = () => {
    const url = inviteLink(room.code);
    navigator
      .share({ title: "Tic Tac Toe", text: `Play Tic Tac Toe with me! Room code: ${room.code}`, url })
      .catch((err) => {
        if (err && err.name !== "AbortError") copyInvite();
      });
  };

  const errorLine = () => (room.error ? UI.el("p", { class: "online-error", role: "alert" }, room.error) : null);

  const waiting = (text) =>
    UI.el(
      "div",
      { class: "online-waiting", role: "status" },
      UI.el("span", { class: "online-dots", "aria-hidden": "true" }, UI.el("span"), UI.el("span"), UI.el("span")),
      UI.el("span", {}, text)
    );

  const card = ({ label, hint, tone, html, onClick }) =>
    UI.el(
      "button",
      { type: "button", class: `player-card tone-${tone}`, onclick: onClick },
      UI.el("span", { class: "player-icon" }, UI.el("span", { class: "mode-svg", html })),
      UI.el("span", { class: "player-text" }, UI.el("span", { class: "player-name" }, label), UI.el("span", { class: "player-hint" }, hint))
    );

  const CREATE_ICON =
    '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  const JOIN_ICON =
    '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/></svg>';

  const renderChoose = () => [
    errorLine(),
    UI.el(
      "div",
      { class: "player-selection online-choices" },
      card({ label: "Create room", hint: "Get a code to share", tone: "x", html: CREATE_ICON, onClick: createRoom }),
      card({
        label: "Join room",
        hint: "Enter a friend's code",
        tone: "o",
        html: JOIN_ICON,
        onClick: () => {
          room.phase = "join";
          room.error = "";
          render();
        },
      })
    ),
  ];

  const cancelLink = (label = "Cancel") =>
    UI.el(
      "button",
      {
        type: "button",
        class: "link-btn online-cancel",
        onclick: () => {
          leaveRoom();
          render();
        },
      },
      label
    );

  const renderLoading = () => [waiting("Opening a room…"), cancelLink()];

  const codeDisplay = (code) =>
    UI.el(
      "div",
      { class: "online-code", "aria-label": `Room code ${code.split("").join(" ")}` },
      code.split("").map((c) => UI.el("span", { class: "online-code-char", "aria-hidden": "true" }, c))
    );

  const renderWaiting = () => [
    UI.el("p", { class: "online-label" }, "Your room code"),
    codeDisplay(room.code),
    UI.el(
      "div",
      { class: "online-actions" },
      UI.el("button", { type: "button", class: "btn", onclick: copyInvite }, "Copy invite link"),
      navigator.share ? UI.el("button", { type: "button", class: "btn btn-ghost", onclick: shareInvite }, "Share") : null
    ),
    waiting("Waiting for your friend…"),
    cancelLink(),
  ];

  const renderJoin = () => {
    const input = UI.el("input", {
      class: "online-input",
      type: "text",
      inputmode: "text",
      autocomplete: "off",
      autocapitalize: "characters",
      spellcheck: "false",
      maxlength: "64",
      placeholder: "ABC234",
      "aria-label": "Room code",
    });
    input.value = room.joinCode;
    const button = UI.el("button", { type: "submit", class: "btn online-join-btn" }, "Join");
    const sync = () => {
      const clean = cleanCode(input.value);
      if (input.value !== clean) input.value = clean;
      room.joinCode = clean;
      button.disabled = clean.length !== CODE_LENGTH;
    };
    input.addEventListener("input", sync);
    input.addEventListener("paste", (e) => {
      const text = e.clipboardData ? e.clipboardData.getData("text") : "";
      if (!text) return;
      e.preventDefault();
      input.value = cleanCode(text);
      sync();
      if (room.joinCode.length === CODE_LENGTH) joinRoom(room.joinCode);
    });
    sync();
    const form = UI.el(
      "form",
      {
        class: "online-join",
        onsubmit: (e) => {
          e.preventDefault();
          joinRoom(input.value);
        },
      },
      input,
      button
    );
    setTimeout(() => {
      if (input.isConnected && matchMedia("(pointer: fine)").matches) input.focus();
    }, 50);
    return [
      UI.el("p", { class: "online-label" }, "Enter your friend's room code"),
      form,
      errorLine(),
      UI.el(
        "button",
        {
          type: "button",
          class: "link-btn online-cancel",
          onclick: () => {
            resetRoom();
            render();
          },
        },
        "Cancel"
      ),
    ];
  };

  const renderJoining = () => [
    UI.el("p", { class: "online-label" }, "Joining room"),
    codeDisplay(room.code),
    waiting("Connecting to your friend…"),
    cancelLink(),
  ];

  const renderConnected = () => {
    const host = room.role === "host";
    const nodes = [
      UI.el(
        "div",
        { class: "online-connected" },
        UI.el("span", { class: "online-dot is-on", "aria-hidden": "true" }),
        UI.el("span", {}, "Connected to your friend")
      ),
      UI.el("p", { class: "online-meta" }, `Room ${room.code} · You play ${mySymbol()}`),
    ];
    if (inOnlineGame()) {
      nodes.push(
        UI.el("p", { class: "online-note" }, "A game is in progress."),
        UI.el(
          "div",
          { class: "online-actions" },
          UI.el("button", { type: "button", class: "btn", onclick: () => view && view.sheet.close() }, "Back to game")
        )
      );
    } else if (host) {
      if (room.rematchAsked) nodes.push(UI.el("p", { class: "online-note is-highlight" }, "Your friend wants a rematch."));
      nodes.push(
        UI.el(
          "div",
          { class: "online-actions" },
          UI.el("button", { type: "button", class: "btn online-start", onclick: hostStart }, room.played ? "Rematch" : "Start game")
        )
      );
    } else if (room.played) {
      nodes.push(
        UI.el(
          "div",
          { class: "online-actions" },
          UI.el(
            "button",
            {
              type: "button",
              class: "btn online-rematch",
              disabled: room.rematchSent,
              onclick: () => {
                if (send("rematch-request")) {
                  room.rematchSent = true;
                  render();
                }
              },
            },
            room.rematchSent ? "Rematch requested" : "Ask for rematch"
          )
        ),
        room.rematchSent ? waiting("Waiting for host to start…") : null
      );
    } else {
      nodes.push(waiting("Waiting for host to start…"));
    }
    nodes.push(
      UI.el(
        "button",
        {
          type: "button",
          class: "link-btn online-cancel",
          onclick: () => {
            const playing = inOnlineGame();
            leaveRoom();
            if (playing) Game.abort("You left the room");
            render();
          },
        },
        "Leave room"
      )
    );
    return nodes;
  };

  const renderers = {
    choose: renderChoose,
    loading: renderLoading,
    waiting: renderWaiting,
    join: renderJoin,
    joining: renderJoining,
    connected: renderConnected,
  };

  const render = () => {
    if (!view || !view.container.isConnected) return;
    const nodes = (renderers[room.phase] || renderChoose)();
    view.container.replaceChildren(UI.el("div", { class: `online-panel online-phase-${room.phase}` }, nodes));
  };

  const refresh = () => {
    if (visible()) render();
  };

  const renderChip = () => {
    const show = Game.state.modeId === "online" && (room.connected || Game.state.options.room);
    if (!show) {
      if (chip) chip.remove();
      chip = null;
      return;
    }
    const slot = UI.slot("status-extra");
    if (!slot) return;
    if (!chip) chip = UI.el("span", { class: "online-chip", role: "img" }, UI.el("span", { class: "online-dot" }));
    const label = room.connected ? "Connected" : "Disconnected";
    chip.title = label;
    chip.setAttribute("aria-label", label);
    chip.classList.toggle("is-off", !room.connected);
    if (!chip.isConnected) slot.append(chip);
  };

  Game.registerMode({
    id: "online",
    order: 3,
    label: "Play online",
    hint: "Share a code with a friend.",
    icon: ICON,
    tone: "o",
    note: "Peer-to-peer over WebRTC. Moves go straight to your friend.",
    renderOptions(container, start, { back, sheet }) {
      view = { container, start, back, sheet };
      if (pendingJoin) {
        const code = pendingJoin;
        pendingJoin = null;
        if (room.connected) {
          render();
          return;
        }
        resetRoom();
        room.joinCode = code;
        joinRoom(code);
        return;
      }
      render();
    },
    names: (state) => {
      const me = state.options.me || "X";
      return { [me]: "You", [Game.other(me)]: "Friend" };
    },
    isLocal: (player, state) => player === state.options.me,
    perspective: (state) => state.options.me || null,
    turnText: (player, state) => (player === state.options.me ? "Your turn" : "Friend's turn…"),
    endText: (result) => {
      if (result.outcome === "win") return "You win! 🎉";
      if (result.outcome === "loss") return "Friend wins";
      return "It's a draw";
    },
    teardown(game, { next } = {}) {
      if (next === "online") return;
      leaveRoom();
    },
  });

  Game.on("start", ({ modeId }) => {
    if (modeId !== "online" && (room.peer || room.conn)) leaveRoom();
    renderChip();
  });

  Game.on("end", (result) => {
    if (result.modeId === "online") room.played = true;
  });

  Game.on("abort", () => {
    if (Game.state.modeId === "online" && room.connected) room.played = true;
  });

  Game.on("move", (m) => {
    if (Game.state.modeId !== "online" || m.source === "remote") return;
    send("move", { gameId: Game.state.options.gameId, index: m.index, player: m.player, n: m.moveNumber });
  });

  window.addEventListener("pagehide", () => {
    if (room.connected) send("leave");
  });

  window.addEventListener("load", () => {
    const params = new URLSearchParams(location.search);
    if (!params.has("room")) return;
    const code = cleanCode(params.get("room"));
    params.delete("room");
    const query = params.toString();
    history.replaceState(history.state, "", `${location.pathname}${query ? `?${query}` : ""}${location.hash}`);
    if (code.length !== CODE_LENGTH) return;
    pendingJoin = code;
    UI.openNewGame({ modeId: "online" });
  });
})();
