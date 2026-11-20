import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";

/* ==========================================================================
   DinoGame: the "no internet" dinosaur runner, drawn on a canvas and themed.
   - Jump over cacti, duck under the flying birds. The speed keeps rising.
   - Keys: Space / Arrow Up / W = jump (also starts and restarts), Arrow Down / S = duck.
   - Mouse / touch: tap the game to jump. On touch screens two buttons appear (Jump, Duck).
   - Colours are read from your theme variables, so light and dark both work (it redraws when
     the theme changes). Sprites are plain rectangles, no image files.
   - The game only runs while it is on screen and the tab is visible. Best score is kept in
     localStorage under "dino-404-hi".
   - It fills the width of its parent. The drawing is 200px tall, sprites keep the same pixel size
     on every screen.
   Tweak the numbers in the SETTINGS block to change how the game feels.
   ========================================================================== */

/* ---------- SETTINGS ---------- */
const H = 200; // game height in px
const GROUND = 40; // space under the ground line
const GRAVITY = 2600; // px / s²
const JUMP_V = 700; // jump strength (apex = JUMP_V² / (2 × GRAVITY))
const FAST_FALL = 3; // gravity multiplier while ducking in the air
const START_SPEED = 300; // px / s
const MAX_SPEED = 720;
const ACCEL = 7; // px / s gained every second
const SCORE_PER_PX = 0.04;
const DINO_X = 36;
const BIRD_LEVELS = [14, 40, 66]; // bird height above the ground: low (jump), mid (duck), high (walk under)
const BIRD_FROM_SCORE = 250;
const HI_KEY = "dino-404-hi";
const TAU = Math.PI * 2;

/* ---------- THEME COLOURS (resolved to real colours so the canvas can use them) ---------- */
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

function readColors(probe) {
  const out = {};
  for (const [key, name] of Object.entries(COLOR_VARS)) {
    probe.style.color = "";
    probe.style.color = `var(${name})`;
    out[key] = getComputedStyle(probe).color;
  }
  probe.style.color = "";
  return out;
}

/* ---------- SPRITES: lists of [x, y, w, h] ---------- */
const STAND_BODY = [
  [22, 8, 18, 2], [20, 10, 22, 12], [22, 22, 16, 4], [18, 22, 6, 12], [10, 30, 18, 16],
  [6, 32, 6, 12], [2, 36, 6, 6], [0, 40, 4, 4], [28, 36, 8, 3], [34, 36, 3, 6],
];
// [rear leg, front leg] for: run step 0, run step 1, in the air
const STAND_LEGS = [
  [[[12, 46, 6, 9], [12, 53, 10, 2]], [[20, 46, 6, 5], [20, 49, 8, 2]]],
  [[[12, 46, 6, 5], [12, 49, 8, 2]], [[20, 46, 6, 9], [20, 53, 10, 2]]],
  [[[12, 46, 6, 9], [12, 53, 10, 2]], [[20, 46, 6, 9], [20, 53, 10, 2]]],
];
const DUCK_BODY = [[8, 12, 30, 14], [4, 14, 6, 8], [0, 18, 4, 4], [30, 12, 8, 10], [34, 8, 22, 12], [36, 20, 16, 3]];
const DUCK_LEGS = [
  [[[14, 26, 5, 6], [14, 30, 8, 2]], [[26, 26, 5, 3], [26, 28, 7, 2]]],
  [[[14, 26, 5, 3], [14, 28, 7, 2]], [[26, 26, 5, 6], [26, 30, 8, 2]]],
];
const CACTUS_PARTS = [[4, 0, 6, 34], [0, 14, 5, 3], [0, 8, 3, 9], [9, 18, 5, 3], [11, 10, 3, 11]];
const BIRD_BODY = [[0, 12, 10, 4], [8, 10, 24, 8], [30, 8, 10, 8], [38, 11, 6, 2]];
const BIRD_WING = [[[12, 2, 12, 8]], [[12, 18, 12, 8]]];

const fill = (ctx, color, rects, ox, oy) => {
  ctx.fillStyle = color;
  for (const [x, y, w, h] of rects) ctx.fillRect(Math.round(ox + x), Math.round(oy + y), w, h);
};

function drawDino(ctx, C, x, top, duck, step, dead) {
  if (duck) {
    const [rear, front] = DUCK_LEGS[step % 2];
    fill(ctx, C.accentHover, rear, x, top);
    fill(ctx, C.accent, front, x, top);
    fill(ctx, C.accent, DUCK_BODY, x, top);
    fill(ctx, C.bg, [[44, 10, 4, 4], [44, 17, 12, 1]], x, top);
    if (dead) drawDeadEye(ctx, C, x + 44, top + 10);
    else fill(ctx, C.text, [[46, 11, 2, 2]], x, top);
    fill(ctx, C.brown, [[38, 2, 12, 5]], x, top);
    fill(ctx, C.thread, [[34, 6, 22, 3], [43, 0, 4, 3]], x, top);
    return;
  }
  const [rear, front] = STAND_LEGS[step];
  fill(ctx, C.accentHover, rear, x, top);
  fill(ctx, C.accent, front, x, top);
  fill(ctx, C.accent, STAND_BODY, x, top);
  fill(ctx, C.bg, [[30, 12, 5, 5], [30, 19, 12, 1]], x, top);
  if (dead) drawDeadEye(ctx, C, x + 30, top + 12);
  else fill(ctx, C.text, [[33, 14, 2, 2]], x, top);
  fill(ctx, C.brown, [[25, 3, 14, 7]], x, top);
  fill(ctx, C.thread, [[21, 8, 21, 3], [29, 0, 5, 4]], x, top);
}

function drawDeadEye(ctx, C, x, y) {
  ctx.strokeStyle = C.text;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + 4, y + 4);
  ctx.moveTo(x + 4, y);
  ctx.lineTo(x, y + 4);
  ctx.stroke();
}

function drawCactus(ctx, C, o, gy) {
  ctx.fillStyle = C.success;
  for (let i = 0; i < o.count; i++) {
    const ox = o.x + i * (o.unit + 3);
    for (const [x, y, w, h] of CACTUS_PARTS) {
      ctx.fillRect(
        Math.round(ox + x * o.scale),
        Math.round(gy - 34 * o.scale + y * o.scale),
        Math.max(1, Math.round(w * o.scale)),
        Math.round(h * o.scale)
      );
    }
  }
}

function drawBird(ctx, C, o, gy) {
  const top = gy - o.level - o.h;
  fill(ctx, C.warning, BIRD_BODY, o.x, top);
  fill(ctx, C.warning, BIRD_WING[Math.floor(o.t * 8) % 2], o.x, top);
  fill(ctx, C.bg, [[34, 10, 2, 2]], o.x, top);
}

function drawCloud(ctx, C, c) {
  ctx.fillStyle = C.border;
  ctx.beginPath();
  ctx.arc(c.x + 12, c.y + 14, 10, 0, TAU);
  ctx.arc(c.x + 28, c.y + 9, 13, 0, TAU);
  ctx.arc(c.x + 46, c.y + 14, 9, 0, TAU);
  ctx.fill();
  ctx.fillRect(c.x + 12, c.y + 14, 34, 10);
}

const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const pad = (n) => String(n).padStart(5, "0");

function loadHi() {
  try {
    return Number(localStorage.getItem(HI_KEY)) || 0;
  } catch {
    return 0;
  }
}
function saveHi(n) {
  try {
    localStorage.setItem(HI_KEY, String(n));
  } catch {
    /* storage can be blocked, the game still works */
  }
}

export default function DinoGame({ className = "" }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const probeRef = useRef(null);
  const apiRef = useRef({});
  const [status, setStatus] = useState("idle"); // idle | running | over
  const [finalScore, setFinalScore] = useState(0);
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
    const ctx = canvas.getContext("2d");

    let colors = readColors(probe);
    let font = getComputedStyle(canvas).fontFamily || "sans-serif";
    let raf = 0;
    let last = 0;
    let inView = true;
    let tabVisible = !document.hidden;

    const g = {
      state: "idle",
      W: 600,
      time: 0,
      dist: 0,
      score: 0,
      hi: loadHi(),
      speed: START_SPEED,
      nextGap: 0,
      overAt: 0,
      obstacles: [],
      clouds: [],
      specks: [],
      dino: { y: 0, vy: 0, duck: false, ft: 0 },
    };
    const gy = H - GROUND;

    /* ----- world ----- */
    const seedWorld = () => {
      g.specks = Array.from({ length: Math.ceil(g.W / 28) }, () => ({
        x: Math.random() * g.W,
        y: 8 + Math.random() * 22,
        w: 2 + Math.random() * 6,
      }));
      if (!g.clouds.length) {
        g.clouds = [
          { x: g.W * 0.3, y: 30 },
          { x: g.W * 0.7, y: 62 },
        ];
      }
    };

    const spawn = () => {
      const bird = g.score >= BIRD_FROM_SCORE && Math.random() < 0.28;
      if (bird) {
        g.obstacles.push({
          kind: "bird",
          x: g.W + 10,
          w: 44,
          h: 28,
          level: BIRD_LEVELS[Math.floor(Math.random() * BIRD_LEVELS.length)],
          t: 0,
        });
      } else {
        const large = Math.random() < 0.4;
        const scale = large ? 1.4 : 1;
        const count = 1 + Math.floor(Math.random() * (large ? 2 : 3));
        const unit = 14 * scale;
        g.obstacles.push({
          kind: "cactus",
          x: g.W + 10,
          w: count * unit + (count - 1) * 3,
          h: 34 * scale,
          unit,
          scale,
          count,
        });
      }
      g.nextGap = g.speed * 0.7 + Math.random() * g.speed * 0.8 + (bird ? 90 : 0);
    };

    const hitBoxes = () => {
      const d = g.dino;
      const duck = d.duck && d.y === 0;
      return duck
        ? { x: DINO_X + 6, y: gy - 30, w: 46, h: 28 }
        : { x: DINO_X + 10, y: gy - d.y - 53, w: 26, h: 50 };
    };

    const gameOver = () => {
      g.state = "over";
      g.overAt = performance.now();
      if (g.score > g.hi) {
        g.hi = g.score;
        saveHi(g.hi);
      }
      draw();
      setFinalScore(g.score);
      setStatus("over");
    };

    /* ----- update one frame ----- */
    const update = (dt) => {
      g.time += dt;
      g.speed = Math.min(MAX_SPEED, START_SPEED + ACCEL * g.time);
      const d = g.dino;

      if (d.y > 0 || d.vy > 0) {
        d.vy -= GRAVITY * (d.duck && d.vy < 0 ? FAST_FALL : 1) * dt;
        d.y += d.vy * dt;
        if (d.y <= 0) {
          d.y = 0;
          d.vy = 0;
        }
      }
      d.ft += dt * (g.speed / START_SPEED) * 9;

      g.dist += g.speed * dt;
      g.score = Math.floor(g.dist * SCORE_PER_PX);

      for (const s of g.specks) {
        s.x -= g.speed * dt;
        if (s.x + s.w < 0) {
          s.x += g.W + Math.random() * 80;
          s.y = 8 + Math.random() * 22;
        }
      }

      for (const c of g.clouds) c.x -= g.speed * 0.15 * dt;
      g.clouds = g.clouds.filter((c) => c.x > -70);
      const lastCloud = g.clouds[g.clouds.length - 1];
      if (g.clouds.length < 3 && (!lastCloud || lastCloud.x < g.W - 180) && Math.random() < dt * 0.8) {
        g.clouds.push({ x: g.W + 20, y: 16 + Math.random() * 70 });
      }

      for (const o of g.obstacles) {
        o.x -= g.speed * dt;
        if (o.kind === "bird") o.t += dt;
      }
      g.obstacles = g.obstacles.filter((o) => o.x + o.w > -10);
      const lastObs = g.obstacles[g.obstacles.length - 1];
      if (!lastObs || lastObs.x + lastObs.w + g.nextGap < g.W) spawn();

      const me = hitBoxes();
      for (const o of g.obstacles) {
        const box =
          o.kind === "bird"
            ? { x: o.x + 4, y: gy - o.level - o.h + 4, w: o.w - 8, h: o.h - 8 }
            : { x: o.x + 2, y: gy - o.h + 2, w: o.w - 4, h: o.h - 2 };
        if (overlap(me, box)) {
          gameOver();
          return;
        }
      }
    };

    /* ----- draw ----- */
    function draw() {
      const C = colors;
      const { W } = g;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = C.bg;
      ctx.fillRect(0, 0, W, H);

      // big faint 404 in the sky
      ctx.save();
      ctx.globalAlpha = 0.6;
      ctx.fillStyle = C.border;
      ctx.font = `800 110px ${font}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("404", W / 2, 80);
      ctx.restore();

      for (const c of g.clouds) drawCloud(ctx, C, c);

      // ground
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = C.surfaceAlt;
      ctx.fillRect(0, gy + 1, W, H - gy - 1);
      ctx.restore();
      ctx.fillStyle = C.muted;
      for (const s of g.specks) ctx.fillRect(Math.round(s.x), Math.round(gy + s.y), Math.round(s.w), 2);
      ctx.fillStyle = C.text;
      ctx.fillRect(0, gy, W, 2);

      for (const o of g.obstacles) (o.kind === "bird" ? drawBird : drawCactus)(ctx, C, o, gy);

      // dino
      const d = g.dino;
      const dead = g.state === "over";
      const duck = d.duck && d.y === 0 && !dead;
      const step = d.y > 0 || g.state !== "running" ? 2 : Math.floor(d.ft) % 2;
      const top = duck ? gy - 32 : gy - d.y - 55;
      drawDino(ctx, C, DINO_X, top, duck, duck ? step % 2 : step, dead);

      // score
      ctx.font = `700 16px ${font}`;
      ctx.textBaseline = "alphabetic";
      ctx.textAlign = "right";
      const scoreText = pad(g.score);
      ctx.fillStyle = C.text;
      ctx.fillText(scoreText, W - 14, 24);
      if (g.hi > 0) {
        ctx.fillStyle = C.muted;
        ctx.fillText(`HI ${pad(g.hi)}`, W - 14 - ctx.measureText(scoreText).width - 16, 24);
      }

      // messages
      ctx.textAlign = "center";
      if (g.state === "idle") {
        ctx.fillStyle = C.muted;
        ctx.font = `600 15px ${font}`;
        ctx.fillText("Press Space or tap to start", W / 2, gy + 26);
      } else if (g.state === "over") {
        ctx.fillStyle = C.text;
        ctx.font = `700 26px ${font}`;
        ctx.fillText("GAME OVER", W / 2, 70);
        const cx = W / 2;
        const cy = 100;
        const a = Math.PI * 1.8;
        ctx.strokeStyle = C.text;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(cx, cy, 11, Math.PI * 0.2, a);
        ctx.stroke();
        const ex = cx + 11 * Math.cos(a);
        const ey = cy + 11 * Math.sin(a);
        const tx = -Math.sin(a);
        const ty = Math.cos(a);
        const nx = Math.cos(a);
        const ny = Math.sin(a);
        ctx.fillStyle = C.text;
        ctx.beginPath();
        ctx.moveTo(ex + tx * 8, ey + ty * 8);
        ctx.lineTo(ex + nx * 6, ey + ny * 6);
        ctx.lineTo(ex - nx * 6, ey - ny * 6);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = C.muted;
        ctx.font = `600 15px ${font}`;
        ctx.fillText("Press Space or tap to try again", W / 2, gy + 26);
      }
    }

    /* ----- loop ----- */
    const loop = (now) => {
      raf = 0;
      if (g.state !== "running" || !inView || !tabVisible) return;
      const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
      last = now;
      update(dt);
      if (g.state === "running") {
        draw();
        raf = requestAnimationFrame(loop);
      }
    };
    const startLoop = () => {
      if (raf || g.state !== "running" || !inView || !tabVisible) return;
      last = 0;
      raf = requestAnimationFrame(loop);
    };

    /* ----- controls ----- */
    const begin = () => {
      g.state = "running";
      g.time = 0;
      g.dist = 0;
      g.score = 0;
      g.speed = START_SPEED;
      g.obstacles = [];
      g.nextGap = 0;
      g.dino.y = 0;
      g.dino.vy = 0;
      g.dino.ft = 0;
      setStatus("running");
      startLoop();
    };

    const jump = () => {
      if (g.state === "idle") {
        begin();
        g.dino.vy = JUMP_V;
      } else if (g.state === "over") {
        if (performance.now() - g.overAt > 450) begin();
      } else if (g.dino.y === 0) {
        g.dino.vy = JUMP_V;
      }
    };
    const setDuck = (v) => {
      g.dino.duck = v;
    };
    apiRef.current = { jump, setDuck };

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
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      g.W = w;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seedWorld();
      draw();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    const themeObserver = new MutationObserver(() => {
      colors = readColors(probe);
      font = getComputedStyle(canvas).fontFamily || "sans-serif";
      draw();
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "data-theme"] });

    const io = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      if (inView) startLoop();
    });
    io.observe(wrap);

    const onVisibility = () => {
      tabVisible = !document.hidden;
      if (tabVisible) startLoop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    resize();

    return () => {
      cancelAnimationFrame(raf);
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
          aria-label="Dinosaur runner mini game. Press space or tap to jump over cacti, press down to duck under birds."
          className="block w-full touch-none select-none font-heading"
          style={{ height: H }}
          onPointerDown={(e) => {
            e.preventDefault();
            apiRef.current.jump?.();
          }}
        />
        <span ref={probeRef} aria-hidden="true" style={{ display: "none" }} />
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
            <ArrowUp size={18} aria-hidden="true" />
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
            <ArrowDown size={18} aria-hidden="true" />
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