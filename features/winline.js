(() => {
  const NS = "http://www.w3.org/2000/svg";
  const overlay = UI.slot("overlay");
  if (!overlay) return;

  let current = null;
  let frame = null;
  let settle = null;

  const svgEl = (tag, attrs) => {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    return node;
  };

  const round = (n) => Math.round(n * 100) / 100;

  const clear = () => {
    cancelAnimationFrame(frame);
    clearTimeout(settle);
    frame = null;
    settle = null;
    if (current) current.svg.remove();
    current = null;
  };

  const layout = () => {
    if (!current) return;
    const box = overlay.getBoundingClientRect();
    const first = document.getElementById(String(current.line[0]));
    const last = document.getElementById(String(current.line[current.line.length - 1]));
    if (!first || !last || !box.width || !box.height) return;
    const center = (cell) => {
      const r = cell.getBoundingClientRect();
      return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top };
    };
    const a = center(first);
    const b = center(last);
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const ux = (b.x - a.x) / length;
    const uy = (b.y - a.y) / length;
    const extend = (Math.min(first.offsetWidth, first.offsetHeight) || box.width / 3) * 0.3;
    const { svg, stroke } = current;
    svg.setAttribute("viewBox", `0 0 ${round(box.width)} ${round(box.height)}`);
    stroke.setAttribute("x1", round(a.x - ux * extend));
    stroke.setAttribute("y1", round(a.y - uy * extend));
    stroke.setAttribute("x2", round(b.x + ux * extend));
    stroke.setAttribute("y2", round(b.y + uy * extend));
    stroke.setAttribute("stroke-width", round(Math.min(box.width, box.height) * 0.07));
  };

  const draw = (result, session) => {
    if (session !== Game.state.session) return;
    const tone = result.winner === "O" ? "o" : "x";
    const svg = svgEl("svg", { class: `winline winline-${tone}`, "aria-hidden": "true", focusable: "false" });
    const stroke = svgEl("line", { class: "winline-stroke", pathLength: "1" });
    svg.append(stroke);
    current = { svg, stroke, line: result.line.slice(), session };
    overlay.append(svg);
    layout();
  };

  const relayout = () => {
    if (!current) return;
    const session = current.session;
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = null;
      if (current && current.session === session && session === Game.state.session) layout();
    });
  };

  Game.on("end", (result) => {
    clear();
    if (!result || !Array.isArray(result.line) || result.line.length < 2) return;
    const session = Game.state.session;
    frame = requestAnimationFrame(() => {
      frame = null;
      draw(result, session);
    });
  });

  Game.on("start", clear);
  Game.on("abort", clear);

  window.addEventListener("resize", relayout);
  window.addEventListener("orientationchange", () => {
    relayout();
    clearTimeout(settle);
    settle = setTimeout(relayout, 300);
  });
  if ("ResizeObserver" in window) new ResizeObserver(relayout).observe(overlay);
})();
