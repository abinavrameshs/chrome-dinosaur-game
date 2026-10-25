'use strict';
// Original implementation. The speed rule was identified by inspecting Chromium's
// offline dino game with REA (see ../reference/ and ../docs/findings.md).

const FPS = 60;
const STEP = 1000 / FPS;           // fixed 60 Hz simulation step
const GROUND = 160, GRAVITY = 0.6, JUMP_V = -10.5;

const cfg = { start: 6, accel: 0.001, max: 13 };
const $ = (id) => document.getElementById(id);
const cv = $('game'), ctx = cv.getContext('2d');
const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();

const s = { running: false, over: false, speed: cfg.start, distance: 0, frames: 0,
            dino: { y: GROUND, vy: 0 }, cacti: [], nextIn: 0 };

function reset() {
  Object.assign(s, { running: true, over: false, speed: cfg.start, distance: 0, frames: 0,
                     dino: { y: GROUND, vy: 0 }, cacti: [], nextIn: 300 });
}

function jump() {
  if (!s.running) { reset(); return; }
  if (s.dino.y >= GROUND) s.dino.vy = JUMP_V;
}

// THE SPEED RULE (same shape as Chromium's): once per frame, if below max, add acceleration.
function step() {
  const d = s.dino;
  d.vy += GRAVITY; d.y = Math.min(GROUND, d.y + d.vy);
  if (d.y >= GROUND) d.vy = 0;

  for (const c of s.cacti) c.x -= s.speed;
  s.cacti = s.cacti.filter((c) => c.x + c.w > 0);

  s.nextIn -= s.speed;
  if (s.nextIn <= 0) {
    const w = 14 + Math.floor(Math.random() * 3) * 8, h = 28 + Math.floor(Math.random() * 20);
    s.cacti.push({ x: cv.width, w, h });
    // Gaps widen with speed, like Chromium: minGap = width * speed + base.
    const min = w * s.speed + 120, max = min * 1.5;
    s.nextIn = min + Math.random() * (max - min);
  }

  // Dino box: x 60..86, top d.y, bottom d.y+30. Cactus bottom is the ground line (GROUND+30).
  for (const c of s.cacti) {
    const overlapX = 60 + 26 > c.x + 2 && 60 < c.x + c.w - 2;
    const overlapY = d.y + 30 > GROUND + 30 - c.h + 2;
    if (overlapX && overlapY) { s.running = false; s.over = true; }
  }

  s.distance += s.speed;
  s.frames++;
  if (s.speed < cfg.max) s.speed = Math.min(cfg.max, s.speed + cfg.accel);
}

function draw() {
  ctx.clearRect(0, 0, cv.width, cv.height);
  const fg = css('--fg'), dim = css('--dim'), accent = css('--accent');
  ctx.fillStyle = dim; ctx.fillRect(0, GROUND + 30, cv.width, 2);
  ctx.fillStyle = accent; ctx.fillRect(60, s.dino.y, 26, 30);        // dino
  ctx.fillRect(76, s.dino.y - 8, 16, 12);
  ctx.fillStyle = dim;
  for (const c of s.cacti) ctx.fillRect(c.x, GROUND + 30 - c.h, c.w, c.h);
  ctx.fillStyle = fg; ctx.font = '14px ui-monospace, monospace'; ctx.textAlign = 'right';
  ctx.fillText('Distance ' + String(Math.floor(s.distance / 10)).padStart(5, '0'), cv.width - 16, 24);
  if (!s.running) {
    ctx.textAlign = 'center'; ctx.font = '18px system-ui, sans-serif';
    ctx.fillText(s.over ? 'Game over — Space to restart' : 'Space or Jump ↑ to start', cv.width / 2, 90);
  }
  $('readout').textContent = `speed ${s.speed.toFixed(2)} · frame ${s.frames}`;
}

let last = performance.now(), acc = 0;
function loop(now) {
  acc += Math.min(now - last, 250); last = now;
  while (acc >= STEP) { if (s.running) step(); acc -= STEP; }
  draw(); requestAnimationFrame(loop);
}

function bind(id, key, fmt) {
  const el = $(id), out = $('o-' + id);
  const apply = () => {
    cfg[key] = parseFloat(el.value);
    if (cfg.start > cfg.max) { cfg.max = cfg.start; $('max').value = cfg.max; $('o-max').textContent = cfg.max; }
    out.textContent = fmt(cfg[key]);
    if (!s.running) s.speed = cfg.start;
  };
  el.addEventListener('input', apply); apply();
}
bind('start', 'start', (v) => v.toFixed(1));
bind('accel', 'accel', (v) => v.toFixed(4));
bind('max', 'max', (v) => v.toFixed(1));

$('reset-defaults').onclick = () => {
  for (const [id, v] of [['start', 6], ['accel', 0.001], ['max', 13]]) {
    $(id).value = v; $(id).dispatchEvent(new Event('input'));
  }
};
$('play').onclick = reset; $('jump').onclick = jump;
addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'ArrowUp') { e.preventDefault(); jump(); }
});
requestAnimationFrame(loop);
