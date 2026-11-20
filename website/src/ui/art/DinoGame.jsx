import { useEffect, useRef, useState } from "react";

/* ==========================================================================
   DinoGame 3D: the "no internet" dinosaur runner, rebuilt as a low-poly 3D scene.

   - No libraries besides React. A tiny perspective engine (camera, near-plane clipping,
     back-face culling, depth sorting, flat shading and distance fog) draws onto a 2D canvas.
   - Jump over cacti, duck under the birds. The speed keeps rising.
   - Keys: Space / Arrow Up / W = jump (also starts and restarts), Arrow Down / S = duck.
   - Mouse / touch: tap the game to jump. On touch screens Jump and Duck buttons appear.
   - Colours come from your theme variables (light and dark both work, it redraws when the
     theme changes). All geometry is built from boxes in code, no image or model files.
   - Runs only while on screen and while the tab is visible. Best score is kept in
     localStorage under "dino-404-hi". Honors prefers-reduced-motion (no camera sway or shake).
   - Fills the width of its parent. Height follows the width (240px to 400px).

   Tweak the numbers in CFG to change how the game feels. World units are roughly metres.
   ========================================================================== */

/* ---------- SETTINGS ---------- */
const CFG = {
  gravity: 38, // units / s²
  jumpV: 13.5, // jump strength, apex = jumpV² / (2 × gravity)
  fastFall: 3, // gravity multiplier while ducking in the air
  startSpeed: 16, // units / s
  maxSpeed: 38,
  accel: 0.37, // units / s gained every second
  scorePerUnit: 0.75,
  birdFromScore: 250,
  spawnZ: 110, // how far ahead obstacles appear
  roadHalf: 4.2,
  fogNear: 20,
  fogFar: 115,
  near: 0.25, // camera near plane
  hiKey: "dino-404-hi",
};

/* ---------- THEME COLOURS (CSS variable names) ---------- */
const COLOR_VARS = {
  bg: "--bg",
  surfaceAlt: "--surface-alt",
  border: "--border",
  text: "--text",
  muted: "--text-muted",
  accent: "--accent",
  accentHover: "--accent-hover",
  success: "--success",
  warning: "--warning",
  thread: "--thread",
  brown: "--brown",
};
const FALLBACK = {
  bg: [250, 250, 250],
  surfaceAlt: [238, 238, 240],
  border: [214, 214, 220],
  text: [30, 30, 36],
  muted: [110, 110, 120],
  accent: [79, 70, 229],
  accentHover: [67, 56, 202],
  success: [34, 150, 90],
  warning: [230, 150, 30],
  thread: [200, 160, 90],
  brown: [120, 80, 50],
};

/* ---------- SMALL MATH HELPERS ---------- */
const WHITE = [255, 255, 255];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c, a = 1) =>
  a >= 1 ? `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})` : `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
const shade = (c, k) => (k >= 1 ? mix(c, WHITE, k - 1) : [c[0] * k, c[1] * k, c[2] * k]);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const pad = (n) => String(n).padStart(5, "0");

/* ---------- BOX FACES (outward winding) with a fixed light, k = brightness ---------- */
const FACES = [
  { k: 0.74, v: [[1, -1, -1], [1, 1, -1], [1, 1, 1], [1, -1, 1]] }, // +x
  { k: 0.9, v: [[-1, -1, 1], [-1, 1, 1], [-1, 1, -1], [-1, -1, -1]] }, // -x
  { k: 1.14, v: [[-1, 1, -1], [-1, 1, 1], [1, 1, 1], [1, 1, -1]] }, // top
  { k: 0.5, v: [[-1, -1, 1], [-1, -1, -1], [1, -1, -1], [1, -1, 1]] }, // bottom
  { k: 0.82, v: [[1, -1, 1], [1, 1, 1], [-1, 1, 1], [-1, -1, 1]] }, // +z (far side)
  { k: 0.97, v: [[-1, -1, -1], [-1, 1, -1], [1, 1, -1], [1, -1, -1]] }, // -z (faces camera)
].map((f) => ({ k: f.k, i: f.v.map(([x, y, z]) => (x > 0 ? 1 : 0) + (y > 0 ? 2 : 0) + (z > 0 ? 4 : 0)) }));

function clipNear(pts) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const ain = a[2] >= CFG.near;
    const bin = b[2] >= CFG.near;
    if (ain) out.push(a);
    if (ain !== bin) {
      const t = (CFG.near - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, CFG.near]);
    }
  }
  return out;
}

function loadHi() {
  try {
    return Number(localStorage.getItem(CFG.hiKey)) || 0;
  } catch {
    return 0;
  }
}
function saveHi(n) {
  try {
    localStorage.setItem(CFG.hiKey, String(n));
  } catch {
    /* storage can be blocked, the game still works */
  }
}

const ArrowIcon = ({ down }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {down ? <path d="M12 5v14M6 13l6 6 6-6" /> : <path d="M12 19V5M6 11l6-6 6 6" />}
  </svg>
);

export default function DinoGame({ className = "" }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const probeRef = useRef(null);
  const scoreRef = useRef(null);
  const hiRef = useRef(null);
  const apiRef = useRef({});
  const [status, setStatus] = useState("idle"); // idle | running | over
  const [finalScore, setFinalScore] = useState(0);
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [coarse, setCoarse] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const onChange = () => setCoarse(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    const probe = probeRef.current;
    const scoreEl = scoreRef.current;
    const hiEl = hiRef.current;
    const ctx = canvas.getContext("2d");
    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");

    /* ----- theme colours as [r,g,b] (any CSS colour format works) ----- */
    const scratch = document.createElement("canvas");
    scratch.width = 1;
    scratch.height = 1;
    const sctx = scratch.getContext("2d", { willReadFrequently: true });
    const toRGB = (value, fallback) => {
      if (!value) return fallback;
      sctx.clearRect(0, 0, 1, 1);
      sctx.fillStyle = "#000";
      sctx.fillStyle = value;
      sctx.fillRect(0, 0, 1, 1);
      const d = sctx.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2]];
    };
    const readColors = () => {
      const out = {};
      for (const [key, name] of Object.entries(COLOR_VARS)) {
        probe.style.color = "";
        probe.style.color = `var(${name})`;
        out[key] = toRGB(getComputedStyle(probe).color, FALLBACK[key]);
      }
      probe.style.color = "";
      return out;
    };
    let colors = readColors();
    let font = getComputedStyle(canvas).fontFamily || "sans-serif";

    let raf = 0;
    let last = 0;
    let inView = true;
    let tabVisible = !document.hidden;
    let flashTimer = 0;

    /* ----- game state ----- */
    const g = {
      state: "idle",
      W: 600,
      H: 260,
      clock: 0,
      time: 0,
      dist: 0,
      score: 0,
      shown: -1,
      milestone: 0,
      hi: loadHi(),
      speed: CFG.startSpeed,
      nextGap: 0,
      overAt: 0,
      shake: 0,
      roll: 0,
      dustT: 0,
      obstacles: [],
      clouds: [],
      props: [],
      particles: [],
      ridges: [],
      dino: { y: 0, vy: 0, duck: false, ft: 0, air: false },
    };
    hiEl.textContent = pad(g.hi);

    /* ----- world seeding ----- */
    const spawnProp = (p, z) => {
      const side = Math.random() < 0.5 ? -1 : 1;
      p.x = side * (5.8 + Math.random() * Math.random() * 28);
      p.z = z;
      const r = Math.random();
      p.kind = r < 0.42 ? "rock" : r < 0.78 ? "cactus" : "bush";
      p.s = 0.6 + Math.random() * 1.0;
      return p;
    };
    const seedWorld = () => {
      if (!g.props.length) g.props = Array.from({ length: 36 }, () => spawnProp({}, -6 + Math.random() * 130));
      if (!g.clouds.length) {
        g.clouds = Array.from({ length: 7 }, () => ({
          x: (Math.random() - 0.5) * 120,
          y: 16 + Math.random() * 14,
          z: 30 + Math.random() * 150,
          s: 3 + Math.random() * 3,
        }));
      }
      if (!g.ridges.length) {
        g.ridges = [0, 1].map(() => Array.from({ length: 22 }, () => 0.2 + Math.random() * 0.8));
      }
    };

    /* ----- obstacles ----- */
    const spawn = (z = CFG.spawnZ) => {
      const bird = g.score >= CFG.birdFromScore && Math.random() < 0.28;
      if (bird) {
        const level = [0.2, 1.55, 2.6][Math.floor(Math.random() * 3)];
        g.obstacles.push({ kind: "bird", z, len: 1.1, level, y0: level, y1: level + 0.6, t: 0 });
      } else {
        const large = Math.random() < 0.4;
        const s = large ? 1.4 : 1;
        const count = 1 + Math.floor(Math.random() * (large ? 2 : 3));
        const unit = 0.85 * s;
        g.obstacles.push({ kind: "cactus", z, s, count, unit, len: (count - 1) * unit + 0.5 * s, y0: 0, y1: 1.5 * s });
      }
      g.nextGap = g.speed * (0.95 + Math.random() * 0.9) + (bird ? 6 : 0);
    };

    const dinoBox = () => {
      const d = g.dino;
      if (d.duck && d.y === 0) return { z0: -0.9, z1: 0.9, y0: 0, y1: 1.35 };
      return { z0: -0.55, z1: 0.75, y0: d.y + 0.05, y1: d.y + 2.0 };
    };

    /* ----- particles ----- */
    const puff = (n, spread, up) => {
      for (let i = 0; i < n; i++) {
        const life = 0.35 + Math.random() * 0.25;
        g.particles.push({
          x: (Math.random() - 0.5) * 0.5,
          y: 0.05,
          z: -0.5 - Math.random() * 0.3,
          vx: (Math.random() - 0.5) * spread,
          vy: up * (0.5 + Math.random()),
          vz: -g.speed * 0.85,
          life,
          max: life,
          size: 0.1 + Math.random() * 0.12,
        });
      }
    };

    /* ----- flow control ----- */
    const gameOver = () => {
      const isBest = g.score > g.hi && g.score > 0;
      if (isBest) {
        g.hi = g.score;
        saveHi(g.hi);
        hiEl.textContent = pad(g.hi);
      }
      g.state = "over";
      g.overAt = performance.now();
      g.shake = 0.45;
      g.dino.duck = false;
      puff(14, 6, 4);
      setFinalScore(g.score);
      setBest(g.hi);
      setNewBest(isBest);
      setStatus("over");
    };

    const needsFrames = () => g.state !== "over" || performance.now() - g.overAt < 1100;

    /* ----- one simulation step ----- */
    const play = (dt) => {
      g.time += dt;
      g.speed = Math.min(CFG.maxSpeed, CFG.startSpeed + CFG.accel * g.time);
      const d = g.dino;

      if (d.y > 0 || d.vy > 0) {
        d.air = true;
        d.vy -= CFG.gravity * (d.duck && d.vy < 0 ? CFG.fastFall : 1) * dt;
        d.y += d.vy * dt;
        if (d.y <= 0) {
          d.y = 0;
          d.vy = 0;
          d.air = false;
          puff(7, 4, 2.5);
        }
      }
      d.ft += dt * g.speed * 0.55;

      g.dist += g.speed * dt;
      g.score = Math.floor(g.dist * CFG.scorePerUnit);
      if (g.score !== g.shown) {
        g.shown = g.score;
        scoreEl.textContent = pad(g.score);
        const m = Math.floor(g.score / 100);
        if (m > g.milestone) {
          g.milestone = m;
          scoreEl.classList.add("animate-pulse");
          clearTimeout(flashTimer);
          flashTimer = setTimeout(() => scoreEl.classList.remove("animate-pulse"), 700);
        }
      }

      for (const p of g.props) {
        p.z -= g.speed * dt;
        if (p.z < -9) spawnProp(p, CFG.spawnZ + Math.random() * 25);
      }

      for (const o of g.obstacles) {
        o.z -= g.speed * dt;
        if (o.kind === "bird") o.t += dt;
      }
      g.obstacles = g.obstacles.filter((o) => o.z + o.len > -9);
      const lastObs = g.obstacles[g.obstacles.length - 1];
      if (!lastObs || lastObs.z + lastObs.len + g.nextGap < CFG.spawnZ) spawn();

      g.dustT -= dt;
      if (g.dustT <= 0 && !d.air && !d.duck) {
        puff(1, 1.2, 1.4);
        g.dustT = 0.07;
      }

      const me = dinoBox();
      for (const o of g.obstacles) {
        const z0 = o.z + 0.08;
        const z1 = o.z + o.len - 0.08;
        const y0 = o.y0 + 0.05;
        const y1 = o.y1 - 0.05;
        if (z0 < me.z1 && z1 > me.z0 && y0 < me.y1 && y1 > me.y0) {
          gameOver();
          return;
        }
      }
    };

    const step = (dt) => {
      g.clock += dt;
      if (g.state === "running") play(dt);

      // ambient motion, runs in every state
      const drift = g.state === "running" ? g.speed : 1.2;
      for (const c of g.clouds) {
        c.z -= drift * 0.1 * dt;
        if (c.z < 14) {
          c.z = 150 + Math.random() * 40;
          c.x = (Math.random() - 0.5) * 120;
          c.y = 16 + Math.random() * 14;
        }
      }
      for (const p of g.particles) {
        p.life -= dt;
        p.vy -= 6 * dt;
        p.x += p.vx * dt;
        p.y = Math.max(0.02, p.y + p.vy * dt);
        p.z += p.vz * dt;
      }
      g.particles = g.particles.filter((p) => p.life > 0);
      g.shake = Math.max(0, g.shake - dt * 1.2);
      const target = g.state === "over" ? Math.PI / 2 : 0;
      g.roll += (target - g.roll) * Math.min(1, dt * 9);
    };

    /* ======================================================================
       RENDERING
       ====================================================================== */
    let cam = null;
    let fogRGB = [255, 255, 255];

    const makeCamera = () => {
      const t = clamp((g.speed - CFG.startSpeed) / (CFG.maxSpeed - CFG.startSpeed), 0, 1);
      const calm = reduceMq.matches;
      const sway = calm ? 0 : Math.sin(g.clock * 0.4) * (g.state === "running" ? 0.12 : 0.4);
      const sh = calm ? 0 : g.shake;
      const pos = [
        1.6 + sway + (Math.random() - 0.5) * sh,
        2.5 + g.dino.y * 0.22 + (Math.random() - 0.5) * sh,
        -5.6 - t * 0.9,
      ];
      const tgt = [0.1, 1.5 + g.dino.y * 0.4, 8];
      const f = norm([tgt[0] - pos[0], tgt[1] - pos[1], tgt[2] - pos[2]]);
      const r = norm(cross([0, 1, 0], f));
      const u = cross(f, r);
      return { pos, f, r, u, focal: g.H * (0.95 - 0.1 * t), cx: g.W * 0.5, cy: g.H * 0.5 };
    };

    const toCam = (p) => {
      const rel = [p[0] - cam.pos[0], p[1] - cam.pos[1], p[2] - cam.pos[2]];
      return [dot(rel, cam.r), dot(rel, cam.u), dot(rel, cam.f)];
    };
    const proj = (c) => [cam.cx + (cam.focal * c[0]) / c[2], cam.cy - (cam.focal * c[1]) / c[2]];

    const fogged = (rgb, depth) => {
      let t = clamp((depth - CFG.fogNear) / (CFG.fogFar - CFG.fogNear), 0, 1);
      t = t * t * (3 - 2 * t) * 0.97;
      return mix(rgb, fogRGB, t);
    };

    const fillPoly = (pts, style, stroke) => {
      const q = clipNear(pts);
      if (q.length < 3) return;
      ctx.beginPath();
      for (let i = 0; i < q.length; i++) {
        const [x, y] = proj(q[i]);
        if (i) ctx.lineTo(x, y);
        else ctx.moveTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = style;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = style;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
    };

    // flat quad lying on the ground (world coords), shaded by distance
    const groundQuad = (x0, x1, z0, z1, rgb, y = 0, alpha = 1) => {
      const mid = (z0 + z1) / 2 - cam.pos[2];
      const pts = [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]].map(toCam);
      ctx.globalAlpha = alpha;
      fillPoly(pts, css(fogged(rgb, mid)), true);
      ctx.globalAlpha = 1;
    };

    function draw() {
      const C = colors;
      const { W, H } = g;
      cam = makeCamera();

      const skyH = mix(C.bg, C.accent, 0.1);
      fogRGB = skyH;
      const ground = C.surfaceAlt;
      const road = mix(C.surfaceAlt, C.text, 0.12);
      const hy = clamp(cam.cy - (cam.focal * cam.u[2]) / cam.f[2], 0, H);

      /* ----- sky ----- */
      const sky = ctx.createLinearGradient(0, 0, 0, hy);
      sky.addColorStop(0, css(C.bg));
      sky.addColorStop(1, css(skyH));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, hy + 1);

      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = css(C.border);
      ctx.font = `800 ${Math.round(H * 0.4)}px ${font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("404", W / 2, hy * 0.5);
      ctx.restore();

      // sun with a soft halo
      const sx = W * 0.8;
      const sy = hy - H * 0.2;
      ctx.fillStyle = css(C.warning, 0.14);
      ctx.beginPath();
      ctx.arc(sx, sy, H * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = css(mix(skyH, C.warning, 0.55), 0.9);
      ctx.beginPath();
      ctx.arc(sx, sy, H * 0.085, 0, Math.PI * 2);
      ctx.fill();

      // mountain ridges
      const ridge = (pts, amp, color) => {
        ctx.fillStyle = css(color);
        ctx.beginPath();
        ctx.moveTo(0, hy + 1);
        pts.forEach((h, i) => ctx.lineTo((i / (pts.length - 1)) * W, hy - h * amp));
        ctx.lineTo(W, hy + 1);
        ctx.closePath();
        ctx.fill();
      };
      ridge(g.ridges[0], H * 0.17, mix(skyH, C.border, 0.4));
      ridge(g.ridges[1], H * 0.1, mix(skyH, C.border, 0.7));

      // clouds
      for (const c of g.clouds) {
        const cc = toCam([c.x, c.y, c.z]);
        if (cc[2] < 8) continue;
        const [px, py] = proj(cc);
        const r = (cam.focal * c.s) / cc[2];
        ctx.fillStyle = css(mix(skyH, C.text, 0.1), 0.75);
        ctx.beginPath();
        ctx.arc(px - r * 1.1, py, r * 0.8, 0, Math.PI * 2);
        ctx.arc(px, py - r * 0.35, r, 0, Math.PI * 2);
        ctx.arc(px + r * 1.15, py, r * 0.75, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillRect(px - r * 1.1, py, r * 2.25, r * 0.75);
      }

      /* ----- ground ----- */
      const gg = ctx.createLinearGradient(0, hy, 0, hy + (H - hy) * 0.4);
      gg.addColorStop(0, css(skyH));
      gg.addColorStop(1, css(ground));
      ctx.fillStyle = gg;
      ctx.fillRect(0, hy, W, H - hy);

      // alternating bands on the sand give a strong sense of speed
      const bandLen = 12;
      const off = g.dist % bandLen;
      const bandIdx = Math.floor(g.dist / bandLen);
      const bandColor = mix(ground, C.text, 0.045);
      for (let k = -2; k < 11; k++) {
        if ((k + bandIdx) % 2 !== 0) continue;
        const z0 = k * bandLen - off;
        groundQuad(CFG.roadHalf + 0.4, 130, z0, z0 + bandLen, bandColor);
        groundQuad(-130, -CFG.roadHalf - 0.4, z0, z0 + bandLen, bandColor);
      }

      // road, kerbs and lane dashes (cut into depth slices so the fog stays smooth)
      const slices = [-14, 0, 6, 14, 26, 42, 64, 92, 130, 180];
      const kerb = mix(road, C.text, 0.35);
      for (let i = 0; i < slices.length - 1; i++) {
        const z0 = slices[i];
        const z1 = slices[i + 1];
        groundQuad(-CFG.roadHalf, CFG.roadHalf, z0, z1, road);
        groundQuad(CFG.roadHalf, CFG.roadHalf + 0.4, z0, z1, kerb);
        groundQuad(-CFG.roadHalf - 0.4, -CFG.roadHalf, z0, z1, kerb);
      }
      const dashPeriod = 7;
      const dashOff = g.dist % dashPeriod;
      const dashColor = mix(road, C.text, 0.4);
      for (let k = -2; k < 17; k++) {
        const z0 = k * dashPeriod - dashOff;
        groundQuad(-0.09, 0.09, z0, z0 + 2.6, dashColor, 0.01);
      }

      // soft contact shadow under the dino
      {
        const d = g.dino;
        const duck = d.duck && d.y === 0 && g.state === "running";
        const s = 1 / (1 + d.y * 0.45);
        const hz = (duck ? 1.05 : 0.85) * s;
        const hx = 0.55 * s;
        const pts = [[-hx, 0.02, -hz], [hx, 0.02, -hz], [hx, 0.02, hz], [-hx, 0.02, hz]].map(toCam);
        ctx.globalAlpha = 0.3 * s;
        fillPoly(pts, "rgb(0,0,0)", true);
        ctx.globalAlpha = 1;
      }

      /* ----- 3D objects ----- */
      const queue = [];
      const add = (cx, y0, cz, w, h, d, rgb, xf, bias = 0) => {
        const hx = w / 2;
        const hh = h / 2;
        const hz = d / 2;
        const cy = y0 + hh;
        const cs = [];
        for (let i = 0; i < 8; i++) {
          let p = [cx + (i & 1 ? hx : -hx), cy + (i & 2 ? hh : -hh), cz + (i & 4 ? hz : -hz)];
          if (xf) p = xf(p);
          cs.push(toCam(p));
        }
        let c = [cx, cy, cz];
        if (xf) c = xf(c);
        const depth = toCam(c)[2];
        if (depth > CFG.fogFar + 10) return;
        if (cs.every((p) => p[2] < CFG.near)) return;
        const faces = [];
        for (const F of FACES) {
          const a = cs[F.i[0]];
          const b = cs[F.i[1]];
          const c2 = cs[F.i[2]];
          const n = cross([b[0] - a[0], b[1] - a[1], b[2] - a[2]], [c2[0] - a[0], c2[1] - a[1], c2[2] - a[2]]);
          if (dot(n, a) >= 0) continue;
          faces.push({ pts: F.i.map((i) => cs[i]), k: F.k });
        }
        if (faces.length) queue.push({ d: depth - bias, rgb, faces });
      };

      const addCactus = (cx, z, s, rgb) => {
        add(cx, 0, z, 0.5 * s, 1.5 * s, 0.5 * s, rgb);
        add(cx - 0.35 * s, 0.6 * s, z, 0.4 * s, 0.22 * s, 0.22 * s, rgb);
        add(cx - 0.44 * s, 0.6 * s, z, 0.22 * s, 0.6 * s, 0.22 * s, rgb);
        add(cx + 0.35 * s, 0.85 * s, z, 0.4 * s, 0.22 * s, 0.22 * s, rgb);
        add(cx + 0.44 * s, 0.85 * s, z, 0.22 * s, 0.45 * s, 0.22 * s, rgb);
      };

      // roadside posts
      const postOff = g.dist % 10;
      for (let k = -1; k < 12; k++) {
        const z = k * 10 - postOff;
        for (const side of [-1, 1]) {
          const x = side * (CFG.roadHalf + 0.75);
          add(x, 0, z, 0.16, 1.1, 0.16, C.muted);
          add(x, 1.1, z, 0.22, 0.1, 0.22, C.accent, null, 0.3);
        }
      }

      // scenery
      const rockColor = mix(C.border, C.muted, 0.45);
      const bushColor = mix(C.success, ground, 0.45);
      for (const p of g.props) {
        if (p.kind === "rock") {
          add(p.x, 0, p.z, 1.3 * p.s, 0.6 * p.s, 1.0 * p.s, rockColor);
          add(p.x + 0.15 * p.s, 0.6 * p.s, p.z, 0.8 * p.s, 0.4 * p.s, 0.6 * p.s, rockColor, null, 0.2);
        } else if (p.kind === "bush") {
          add(p.x, 0, p.z, 1.1 * p.s, 0.5 * p.s, 1.1 * p.s, bushColor);
          add(p.x, 0.5 * p.s, p.z, 0.7 * p.s, 0.35 * p.s, 0.7 * p.s, bushColor, null, 0.2);
        } else {
          addCactus(p.x, p.z, p.s * 1.1, C.success);
        }
      }

      // obstacles
      for (const o of g.obstacles) {
        if (o.kind === "cactus") {
          for (let i = 0; i < o.count; i++) addCactus(0, o.z + 0.25 * o.s + i * o.unit, o.s, C.success);
        } else {
          const y = o.level + Math.sin(o.t * 6) * 0.08;
          const zc = o.z + o.len / 2;
          const flap = Math.sin(o.t * 16) * 0.7;
          const beak = mix(C.warning, C.text, 0.4);
          add(0, y + 0.15, zc, 0.5, 0.4, 1.1, C.warning);
          add(0, y + 0.3, zc - 0.7, 0.34, 0.34, 0.45, C.warning, null, 0.3);
          add(0, y + 0.32, zc - 1.0, 0.14, 0.1, 0.35, beak, null, 0.6);
          add(0, y + 0.3, zc + 0.7, 0.3, 0.1, 0.45, shade(C.warning, 0.85));
          for (const s of [-1, 1]) {
            add(s * 0.2, y + 0.42, zc - 0.82, 0.05, 0.09, 0.09, C.bg, null, 1.2);
            const px = s * 0.25;
            const py = y + 0.35;
            const th = s * flap;
            const cs = Math.cos(th);
            const sn = Math.sin(th);
            const xf = (p) => {
              const dx = p[0] - px;
              const dy = p[1] - py;
              return [px + dx * cs - dy * sn, py + dx * sn + dy * cs, p[2]];
            };
            add(s * 0.75, py - 0.035, zc, 1.0, 0.07, 0.6, shade(C.warning, 0.92), xf, 0.4);
          }
        }
      }

      // the dino
      {
        const d = g.dino;
        const dead = g.state === "over";
        const duck = d.duck && d.y === 0 && !dead;
        const tilt = dead ? 0 : d.y > 0 || d.vy > 0 ? clamp(-d.vy * 0.022, -0.35, 0.35) : 0;
        const cp = Math.cos(tilt);
        const sp = Math.sin(tilt);
        const cr = Math.cos(g.roll);
        const sr = Math.sin(g.roll);
        const oy = d.y - 0.55 * (g.roll / (Math.PI / 2));
        const xf = (p) => {
          const y = p[1] - 1;
          const z = p[2];
          const y2 = y * cp - z * sp;
          const z2 = y * sp + z * cp;
          const x3 = p[0] * cr - y2 * sr;
          const y3 = p[0] * sr + y2 * cr;
          return [x3, y3 + 1 + oy, z2];
        };
        const A = (cx, y0, cz, w, h, dd, rgb, bias = 0) => add(cx, y0, cz, w, h, dd, rgb, xf, bias);
        const body = C.accent;
        const dark = C.accentHover;
        const air = d.air;
        const running = g.state === "running";
        const wag = running && !air ? Math.sin(d.ft * 0.5) * 0.05 : 0;

        for (const s of [-1, 1]) {
          const phi = d.ft + (s > 0 ? 0 : Math.PI);
          let swing = 0;
          let lift = 0;
          if (air) {
            swing = s * 0.22;
            lift = 0.1;
          } else if (running) {
            swing = Math.sin(phi) * 0.3;
            lift = Math.max(0, Math.cos(phi)) * 0.25;
          }
          const legC = s > 0 ? body : dark;
          if (duck) {
            A(s * 0.2, lift * 0.5, swing * 0.7, 0.26, 0.4, 0.3, legC);
            A(s * 0.2, lift * 0.5, swing * 0.7 + 0.1, 0.26, 0.12, 0.5, legC);
          } else {
            A(s * 0.2, lift, swing, 0.26, 0.7, 0.3, legC);
            A(s * 0.2, lift, swing + 0.1, 0.26, 0.12, 0.5, legC);
          }
        }

        if (duck) {
          A(0, 0.4, 0, 0.78, 0.6, 1.5, body);
          for (const z of [-0.4, 0.1, 0.6]) A(0, 0.98, z, 0.14, 0.18, 0.2, dark, 0.6);
          A(wag, 0.55, -1.15, 0.44, 0.34, 0.8, body);
          A(wag * 2, 0.5, -1.65, 0.28, 0.24, 0.5, body);
          A(0, 0.5, 0.95, 0.62, 0.55, 0.9, body);
          for (const s of [-1, 1]) {
            A(s * 0.32, 0.82, 1.12, 0.05, 0.2, 0.2, C.bg, 1);
            if (dead) A(s * 0.345, 0.82, 1.14, 0.03, 0.04, 0.22, C.text, 1.2);
            else A(s * 0.345, 0.82, 1.18, 0.03, 0.1, 0.1, C.text, 1.2);
          }
          A(0, 1.05, 0.95, 0.86, 0.05, 0.86, C.thread, 0.5);
          A(0, 1.09, 0.95, 0.5, 0.26, 0.5, C.brown, 0.6);
        } else {
          A(0, 0.62, 0, 0.78, 0.95, 1.1, body);
          for (const z of [-0.35, 0, 0.35]) A(0, 1.55, z, 0.14, 0.2, 0.2, dark, 0.6);
          A(wag, 0.72, -0.85, 0.46, 0.42, 0.7, body);
          A(wag * 2, 0.7, -1.35, 0.28, 0.28, 0.5, body);
          A(0, 1.25, 0.4, 0.5, 0.55, 0.5, body);
          A(0, 1.42, 0.6, 0.62, 0.55, 0.95, body);
          for (const s of [-1, 1]) {
            A(s * 0.42, 1.0, 0.45, 0.12, 0.14, 0.34, body, 0.5);
            A(s * 0.32, 1.72, 0.78, 0.05, 0.2, 0.2, C.bg, 1);
            if (dead) A(s * 0.345, 1.72, 0.8, 0.03, 0.04, 0.22, C.text, 1.2);
            else A(s * 0.345, 1.72, 0.84, 0.03, 0.1, 0.1, C.text, 1.2);
          }
          A(0, 1.96, 0.5, 0.86, 0.05, 0.86, C.thread, 0.5);
          A(0, 2.0, 0.5, 0.5, 0.28, 0.5, C.brown, 0.6);
        }
      }

      queue.sort((a, b) => b.d - a.d);
      for (const e of queue) {
        for (const f of e.faces) {
          const depth = (f.pts[0][2] + f.pts[1][2] + f.pts[2][2] + f.pts[3][2]) / 4;
          fillPoly(f.pts, css(fogged(shade(e.rgb, f.k), depth)), true);
        }
      }

      /* ----- particles ----- */
      const dust = mix(C.muted, C.bg, 0.3);
      for (const p of g.particles) {
        const pc = toCam([p.x, p.y, p.z]);
        if (pc[2] < CFG.near) continue;
        const [px, py] = proj(pc);
        const k = p.life / p.max;
        const r = ((cam.focal * p.size) / pc[2]) * (0.6 + k * 0.6);
        ctx.globalAlpha = 0.55 * k;
        ctx.fillStyle = css(dust);
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // crash flash
      if (g.state === "over") {
        const k = clamp(1 - (performance.now() - g.overAt) / 250, 0, 1);
        if (k > 0) {
          ctx.fillStyle = css(C.text, 0.18 * k);
          ctx.fillRect(0, 0, W, H);
        }
      }
    }

    /* ----- loop ----- */
    const loop = (now) => {
      raf = 0;
      if (!inView || !tabVisible) {
        last = 0;
        return;
      }
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      step(dt);
      draw();
      if (needsFrames()) raf = requestAnimationFrame(loop);
      else last = 0;
    };
    const startLoop = () => {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(loop);
    };

    /* ----- controls ----- */
    const begin = () => {
      g.state = "running";
      g.time = 0;
      g.dist = 0;
      g.score = 0;
      g.shown = -1;
      g.milestone = 0;
      g.speed = CFG.startSpeed;
      g.obstacles = [];
      g.particles = [];
      g.roll = 0;
      g.shake = 0;
      g.dustT = 0;
      g.dino.y = 0;
      g.dino.vy = 0;
      g.dino.ft = 0;
      g.dino.air = false;
      spawn(46);
      setStatus("running");
      startLoop();
    };

    const jump = () => {
      if (g.state === "idle") {
        begin();
        g.dino.vy = CFG.jumpV;
      } else if (g.state === "over") {
        if (performance.now() - g.overAt > 450) begin();
      } else if (g.dino.y === 0) {
        g.dino.vy = CFG.jumpV;
        puff(5, 3, 2);
      }
    };
    const setDuck = (v) => {
      g.dino.duck = v;
    };
    const restart = () => {
      if (g.state === "over") begin();
    };
    apiRef.current = { jump, setDuck, restart };

    const isTyping = (t) =>
      t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable);

    const onKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target) || !inView) return;
      if (e.code === "Space" || e.code === "ArrowUp" || e.code === "KeyW") {
        if (e.code === "Space" && e.target.closest?.("a,button")) return;
        e.preventDefault();
        if (!e.repeat || g.state === "running") jump();
      } else if (e.code === "ArrowDown" || e.code === "KeyS") {
        if (g.state === "running") e.preventDefault();
        setDuck(true);
      }
    };
    const onKeyUp = (e) => {
      if (e.code === "ArrowDown" || e.code === "KeyS") setDuck(false);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    /* ----- size, theme, visibility ----- */
    const resize = () => {
      const w = Math.max(260, Math.floor(wrap.clientWidth));
      const h = clamp(Math.round(w * 0.42), 240, 400);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      g.W = w;
      g.H = h;
      canvas.style.height = `${h}px`;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedWorld();
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const themeObserver = new MutationObserver(() => {
      colors = readColors();
      font = getComputedStyle(canvas).fontFamily || "sans-serif";
      draw();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });

    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView && needsFrames()) startLoop();
    });
    io.observe(wrap);

    const onVisibility = () => {
      tabVisible = !document.hidden;
      if (tabVisible && needsFrames()) startLoop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    seedWorld();
    resize();
    startLoop(); // gentle idle animation until the player starts

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(flashTimer);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("visibilitychange", onVisibility);
      ro.disconnect();
      io.disconnect();
      themeObserver.disconnect();
    };
  }, []);

  const btn =
    "inline-flex select-none touch-none items-center gap-2 rounded-full border border-border bg-surface px-6 py-3 font-heading text-base font-semibold text-text transition active:border-accent active:text-accent";

  return (
    <div className={`w-full ${className}`}>
      <div ref={wrapRef} className="relative w-full overflow-hidden rounded-2xl border border-border bg-bg">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="3D dinosaur runner mini game. Press space or tap to jump over cacti, press down to duck under birds."
          className="block w-full touch-none select-none font-heading"
          style={{ height: 260 }}
          onPointerDown={(e) => {
            e.preventDefault();
            apiRef.current.jump?.();
          }}
        />
        <span ref={probeRef} aria-hidden="true" style={{ display: "none" }} />

        {/* HUD */}
        <div className="pointer-events-none absolute right-4 top-3 flex gap-4 font-heading text-sm font-bold tabular-nums tracking-wider">
          <span className="text-muted">
            HI <span ref={hiRef}>00000</span>
          </span>
          <span ref={scoreRef} className="text-text">
            00000
          </span>
        </div>

        {/* Start hint */}
        {status === "idle" ? (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
            <span className="rounded-full border border-border bg-surface/80 px-4 py-1.5 font-heading text-sm font-semibold text-muted backdrop-blur">
              {coarse ? "Tap to start" : "Press Space or tap to start"}
            </span>
          </div>
        ) : null}

        {/* Game over card */}
        {status === "over" ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4">
            <div className="rounded-2xl border border-border bg-surface/90 px-8 py-5 text-center shadow-lg backdrop-blur">
              <p className="font-heading text-xs font-semibold uppercase tracking-[0.2em] text-muted">Game over</p>
              <p className="mt-1 font-heading text-4xl font-extrabold tabular-nums text-text">{pad(finalScore)}</p>
              <p className="mt-1 text-sm text-muted">{newBest ? "New personal best!" : `Best ${pad(best)}`}</p>
              <button
                type="button"
                onClick={() => apiRef.current.restart?.()}
                className="pointer-events-auto mt-4 inline-flex items-center rounded-full bg-accent px-5 py-2 font-heading text-sm font-semibold text-white transition hover:bg-accent-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                Play again
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">
        {status === "over" ? `Game over. Your score is ${finalScore}.` : ""}
      </p>

      {coarse ? (
        <div className="mt-3 flex items-center justify-center gap-3">
          <button
            type="button"
            className={btn}
            onPointerDown={(e) => {
              e.preventDefault();
              apiRef.current.jump?.();
            }}
          >
            <ArrowIcon />
            Jump
          </button>
          <button
            type="button"
            className={btn}
            onPointerDown={(e) => {
              e.preventDefault();
              apiRef.current.setDuck?.(true);
            }}
            onPointerUp={() => apiRef.current.setDuck?.(false)}
            onPointerLeave={() => apiRef.current.setDuck?.(false)}
            onPointerCancel={() => apiRef.current.setDuck?.(false)}
          >
            <ArrowIcon down />
            Duck
          </button>
        </div>
      ) : null}

      <p className="mt-3 text-xs text-muted sm:text-sm">
        {coarse
          ? "Tap the game to jump. Hold Duck to slip under the birds."
          : "Space or ↑ to jump, ↓ to duck under the birds."}
      </p>
    </div>
  );
}