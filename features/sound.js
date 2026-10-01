(() => {
  const KEY = "tictactoe_sound";
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const SVG = (body) =>
    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5z"/>${body}</svg>`;
  const ICON_ON = SVG('<path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/>');
  const ICON_OFF = SVG('<path d="m23 9-6 6"/><path d="m17 9 6 6"/>');
  const LABEL = "Sound and vibration";

  const load = () => {
    try {
      return localStorage.getItem(KEY) !== "off";
    } catch (err) {
      return true;
    }
  };

  const save = (on) => {
    try {
      localStorage.setItem(KEY, on ? "on" : "off");
    } catch (err) {
      return;
    }
  };

  let on = load();
  let ctx = null;
  let master = null;
  let noiseBuffer = null;
  const lastPlayed = new Map();

  const unlock = () => {
    document.removeEventListener("pointerdown", unlock, true);
    document.removeEventListener("keydown", unlock, true);
    if (!Ctx || ctx) return;
    try {
      ctx = new Ctx();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.knee.value = 12;
      comp.ratio.value = 4;
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(comp);
      comp.connect(ctx.destination);
    } catch (err) {
      ctx = null;
      master = null;
      return;
    }
    resume();
  };

  const resume = () => {
    if (ctx && ctx.state === "suspended" && !document.hidden) ctx.resume().catch(() => {});
  };

  document.addEventListener("pointerdown", unlock, true);
  document.addEventListener("keydown", unlock, true);
  document.addEventListener("visibilitychange", () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else resume();
  });

  const noise = () => {
    if (noiseBuffer) return noiseBuffer;
    const length = Math.floor(ctx.sampleRate * 0.4);
    noiseBuffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuffer;
  };

  const envelope = (node, at, peak, attack, dur) => {
    node.gain.setValueAtTime(0.0001, at);
    node.gain.exponentialRampToValueAtTime(peak, at + attack);
    node.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  };

  const tone = (t0, { freq, to, type = "sine", at = 0, dur = 0.12, gain = 0.18, attack = 0.006, filter }) => {
    const start = t0 + at;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, start + dur);
    envelope(amp, start, gain, attack, dur);
    if (filter) {
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = filter;
      osc.connect(lp);
      lp.connect(amp);
    } else {
      osc.connect(amp);
    }
    amp.connect(master);
    osc.start(start);
    osc.stop(start + dur + 0.03);
  };

  const hiss = (t0, { at = 0, dur = 0.25, gain = 0.06, from = 500, to = 2400, q = 1.2, type = "bandpass" }) => {
    const start = t0 + at;
    const src = ctx.createBufferSource();
    src.buffer = noise();
    const bp = ctx.createBiquadFilter();
    bp.type = type;
    bp.Q.value = q;
    bp.frequency.setValueAtTime(from, start);
    bp.frequency.exponentialRampToValueAtTime(to, start + dur);
    const amp = ctx.createGain();
    envelope(amp, start, gain, dur * 0.4, dur);
    src.connect(bp);
    bp.connect(amp);
    amp.connect(master);
    src.start(start);
    src.stop(start + dur + 0.03);
  };

  const SOUNDS = {
    x: (t) => {
      tone(t, { freq: 320, to: 240, type: "triangle", dur: 0.11, gain: 0.22 });
      hiss(t, { dur: 0.03, gain: 0.03, from: 1800, to: 1200, q: 2 });
    },
    o: (t) => {
      tone(t, { freq: 720, to: 680, dur: 0.1, gain: 0.17 });
      tone(t, { freq: 1440, dur: 0.05, gain: 0.04 });
    },
    timeout: (t) => {
      tone(t, { freq: 150, to: 80, dur: 0.2, gain: 0.22, attack: 0.004 });
      hiss(t, { dur: 0.08, gain: 0.05, from: 400, to: 180, type: "lowpass", q: 0.7 });
    },
    win: (t) => {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, k) =>
        tone(t, { freq, type: "triangle", at: k * 0.09, dur: k === 3 ? 0.45 : 0.22, gain: 0.17 })
      );
      tone(t, { freq: 2093, at: 0.27, dur: 0.35, gain: 0.03 });
    },
    loss: (t) => {
      [392, 311.13, 261.63].forEach((freq, k) =>
        tone(t, { freq, at: k * 0.17, dur: k === 2 ? 0.5 : 0.28, gain: 0.15, attack: 0.02 })
      );
    },
    draw: (t) => {
      tone(t, { freq: 493.88, type: "triangle", dur: 0.18, gain: 0.15, attack: 0.01 });
      tone(t, { freq: 440, type: "triangle", at: 0.16, dur: 0.3, gain: 0.15, attack: 0.01 });
    },
    start: (t) => {
      hiss(t, { dur: 0.28, gain: 0.05, from: 500, to: 2600 });
      tone(t, { freq: 880, at: 0.12, dur: 0.35, gain: 0.08, attack: 0.01 });
      tone(t, { freq: 1318.5, at: 0.18, dur: 0.35, gain: 0.05, attack: 0.01 });
    },
    abort: (t) => {
      tone(t, { freq: 196, to: 174.6, dur: 0.18, gain: 0.16, attack: 0.01 });
    },
    tick: (t) => {
      tone(t, { freq: 1900, dur: 0.025, gain: 0.05, attack: 0.002 });
    },
    buzz: (t) => {
      tone(t, { freq: 110, type: "sawtooth", dur: 0.24, gain: 0.13, attack: 0.008, filter: 900 });
      tone(t, { freq: 116, type: "sawtooth", dur: 0.24, gain: 0.08, attack: 0.008, filter: 700 });
    },
    blip: (t) => {
      tone(t, { freq: 880, to: 1175, dur: 0.08, gain: 0.12 });
    },
  };

  const play = (name, delay = 0) => {
    if (!on || !ctx || !master || document.hidden || !SOUNDS[name]) return false;
    const now = ctx.currentTime;
    const at = now + 0.005 + delay;
    const last = lastPlayed.get(name);
    if (last !== undefined && Math.abs(at - last) < 0.035) return false;
    lastPlayed.set(name, at);
    resume();
    try {
      SOUNDS[name](at);
    } catch (err) {
      return false;
    }
    return true;
  };

  const vibrate = (pattern) => {
    if (!on || document.hidden || typeof navigator.vibrate !== "function") return;
    try {
      navigator.vibrate(pattern);
    } catch (err) {
      return;
    }
  };

  const button = UI.addToolbarButton({
    id: "soundBtn",
    label: LABEL,
    icon: on ? ICON_ON : ICON_OFF,
    order: 40,
    pressed: on,
    onClick: (e, btn) => {
      on = !on;
      save(on);
      render(btn);
      UI.toast(on ? "Sound on" : "Sound off");
      if (on) {
        unlock();
        play("blip");
      }
    },
  });

  const render = (btn = button) => {
    btn.innerHTML = on ? ICON_ON : ICON_OFF;
    btn.setAttribute("aria-pressed", String(on));
    btn.setAttribute("aria-label", LABEL);
    btn.title = `${LABEL}: ${on ? "on" : "off"}`;
  };

  render();

  Game.on("start", () => play("start"));

  Game.on("move", ({ player, source }) => {
    if (source === "timeout") {
      play("timeout");
      return;
    }
    play(player === "X" ? "x" : "o");
    if (source === "ai" || source === "remote") return;
    if (source === "local" || Game.isLocal(player)) vibrate(12);
  });

  Game.on("end", (result) => {
    const delay = 0.14;
    if (result.outcome === "win" || (result.outcome === null && result.winner)) {
      play("win", delay);
      vibrate([30, 40, 30]);
    } else if (result.outcome === "loss") {
      play("loss", delay);
      vibrate([80]);
    } else {
      play("draw", delay);
    }
  });

  Game.on("abort", () => play("abort"));

  Game.on("timer:tick", ({ remaining }) => {
    if (typeof remaining === "number" && remaining > 0 && remaining <= 3) play("tick");
  });

  Game.on("timer:expire", () => {
    play("buzz");
    vibrate([20, 30, 20]);
  });

  window.Sound = {
    play: (name) => play(name),
    enabled: () => on,
  };
})();
