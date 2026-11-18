// INKLIGHT — render: everything the player sees, drawn on one canvas.
// The palette is the game: near-black indigo, warm gold paint, violet gloom.
// The HUD, the title, the dawn and the end screens are all drawn here, so a
// screenshot always shows the whole game, never a bare canvas.

import { VIEW_W, VIEW_H, COLORS, INK, PAINTER, NIGHTS } from './config.js';
import { clamp, formatTime } from './util.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, g) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, COLORS.bgTop);
  grad.addColorStop(1, COLORS.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);

  // Faint stars, fixed by the game's seed.
  ctx.fillStyle = '#cdd6ff';
  for (const s of g.stars) {
    ctx.globalAlpha = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(g.now * 0.7 + s.tw));
    ctx.fillRect(s.x, s.y, s.r, s.r);
  }
  ctx.globalAlpha = 1;

  // The Gloom breathing at the edges: a slow violet pulse in the corners.
  const pulse = 0.05 + 0.02 * Math.sin(g.now * 0.9);
  const vg = ctx.createRadialGradient(
    VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.42,
    VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.95,
  );
  vg.addColorStop(0, 'rgba(20,8,40,0)');
  vg.addColorStop(1, `rgba(26,10,52,${pulse + 0.08})`);
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function drawStrokes(ctx, g) {
  const now = g.now;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'lighter';
  for (const s of g.paint.strokes) {
    const b = Math.max(0, 1 - (now - s.born) / INK.strokeLifetime);
    if (b <= 0.02 || s.pts.length < 2) continue;
    // Glow pass: wide, soft, gold.
    ctx.globalAlpha = 0.28 * b;
    ctx.strokeStyle = COLORS.paintGold;
    ctx.lineWidth = INK.brushWidth * 2.1;
    ctx.shadowColor = COLORS.paintGold;
    ctx.shadowBlur = 22;
    ctx.beginPath();
    ctx.moveTo(s.pts[0].x, s.pts[0].y);
    for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i].x, s.pts[i].y);
    ctx.stroke();
    // Core pass: narrow, near-white, bright.
    ctx.globalAlpha = 0.95 * b;
    ctx.strokeStyle = COLORS.paintCore;
    ctx.lineWidth = INK.brushWidth * 0.5;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(s.pts[0].x, s.pts[0].y);
    for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i].x, s.pts[i].y);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function drawEmbers(ctx, g) {
  ctx.globalCompositeOperation = 'lighter';
  for (const e of g.embers) {
    const pulse = 0.7 + 0.3 * Math.sin(g.now * 5 + e.phase);
    ctx.globalAlpha = 0.9 * pulse;
    ctx.fillStyle = COLORS.ember;
    ctx.shadowColor = COLORS.ember;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(e.x, e.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#fff8dc';
    ctx.beginPath();
    ctx.arc(e.x, e.y, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
}

function drawShade(ctx, s, now) {
  const fadeIn = clamp(s.born / 0.5, 0, 1);
  ctx.save();
  ctx.globalAlpha = fadeIn;
  ctx.translate(s.x, s.y);
  // Body: a dark violet blob, darker at the rim.
  const body = ctx.createRadialGradient(-s.radius * 0.3, -s.radius * 0.3, 2, 0, 0, s.radius);
  body.addColorStop(0, '#3d2466');
  body.addColorStop(0.6, '#221240');
  body.addColorStop(1, '#0e0722');
  ctx.fillStyle = body;
  ctx.beginPath();
  if (s.type === 'skitter') {
    // Skitters are angular: a small darting shard.
    ctx.moveTo(s.radius, 0);
    ctx.lineTo(-s.radius * 0.7, s.radius * 0.8);
    ctx.lineTo(-s.radius * 0.4, 0);
    ctx.lineTo(-s.radius * 0.7, -s.radius * 0.8);
    ctx.closePath();
  } else if (s.type === 'herald') {
    // The Herald wears a crown of spikes.
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
      const x1 = Math.cos(a) * s.radius * 0.85;
      const y1 = Math.sin(a) * s.radius * 0.85;
      const x2 = Math.cos(a + 0.22) * (s.radius + 14);
      const y2 = Math.sin(a + 0.22) * (s.radius + 14);
      const x3 = Math.cos(a + 0.44) * s.radius * 0.85;
      const y3 = Math.sin(a + 0.44) * s.radius * 0.85;
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
    }
    ctx.arc(0, 0, s.radius, 0, Math.PI * 2);
  } else {
    ctx.arc(0, 0, s.radius, 0, Math.PI * 2);
  }
  ctx.fill();
  // A splitter shows the seam it will burst along.
  if (s.type === 'splitter') {
    ctx.strokeStyle = 'rgba(199,125,255,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-s.radius * 0.6, -s.radius * 0.6);
    ctx.lineTo(s.radius * 0.6, s.radius * 0.6);
    ctx.stroke();
  }
  // Eyes: two glowing dots that track the painter.
  const eyeY = -s.radius * 0.18;
  const eyeDX = s.radius * 0.38;
  const eyeR = s.type === 'herald' ? 5 : 3.4;
  ctx.fillStyle = s.type === 'herald' ? COLORS.shadeEye2 : COLORS.shadeEye;
  ctx.shadowColor = ctx.fillStyle;
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(-eyeDX, eyeY, eyeR, 0, Math.PI * 2);
  ctx.arc(eyeDX, eyeY, eyeR, 0, Math.PI * 2);
  ctx.fill();
  if (s.type === 'herald') {
    ctx.beginPath();
    ctx.arc(0, eyeY + s.radius * 0.35, eyeR, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.shadowBlur = 0;
  // Burning: the light is eating it — an orange rim.
  if (s.burnFx > 0) {
    ctx.strokeStyle = `rgba(255,159,28,${clamp(s.burnFx * 6, 0, 0.9)})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, s.radius + 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  // A hurt shade, and the Herald always, shows its health.
  if (s.maxHp > 60 || s.hp < s.maxHp) {
    const w = s.radius * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(-w / 2, -s.radius - 12, w, 5);
    ctx.fillStyle = '#ff4d6d';
    ctx.fillRect(-w / 2, -s.radius - 12, w * clamp(s.hp / s.maxHp, 0, 1), 5);
  }
  ctx.restore();
}

function drawShades(ctx, g) {
  for (const s of g.shades.shades) drawShade(ctx, s, g.now);
  // Gloom globs: small violet orbs with a dark heart.
  for (const gl of g.shades.globs) {
    ctx.fillStyle = '#7b2fbe';
    ctx.shadowColor = '#7b2fbe';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(gl.x, gl.y, gl.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#2a0a4a';
    ctx.beginPath();
    ctx.arc(gl.x, gl.y, gl.radius * 0.45, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPainter(ctx, g) {
  const p = g.painter;
  // Blinking while invulnerable: the painter flickers.
  if (p.invulnTimer > 0 && Math.floor(g.now * 12) % 2 === 0) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.globalCompositeOperation = 'lighter';
  const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, 46);
  halo.addColorStop(0, 'rgba(255,220,120,0.55)');
  halo.addColorStop(1, 'rgba(255,220,120,0)');
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(0, 0, 46, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  // The wisp: a bright core with a warm rim.
  const body = ctx.createRadialGradient(-4, -5, 1, 0, 0, PAINTER.radius);
  body.addColorStop(0, '#fffdf4');
  body.addColorStop(0.55, '#ffe9a8');
  body.addColorStop(1, '#f5b942');
  ctx.fillStyle = body;
  ctx.shadowColor = '#ffd166';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(0, 0, PAINTER.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // The brush: a short handle pointing at the mouse, with a gold tip.
  const dx = p.aimX - p.x;
  const dy = p.aimY - p.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  ctx.strokeStyle = '#8a6d3b';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(ux * 8, uy * 8);
  ctx.lineTo(ux * 26, uy * 26);
  ctx.stroke();
  ctx.fillStyle = COLORS.paintGold;
  ctx.beginPath();
  ctx.arc(ux * 28, uy * 28, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHUD(ctx, g) {
  const p = g.painter;
  ctx.save();
  // Top strip.
  ctx.fillStyle = 'rgba(4,4,16,0.62)';
  ctx.fillRect(0, 0, VIEW_W, 46);
  ctx.fillStyle = 'rgba(255,201,77,0.35)';
  ctx.fillRect(0, 46, VIEW_W, 2);
  ctx.fillStyle = COLORS.hudText;
  ctx.textBaseline = 'middle';
  // Left: the night.
  ctx.textAlign = 'left';
  ctx.font = '700 21px Georgia, serif';
  ctx.fillText(`NIGHT ${g.night + 1} / ${g.nights.totalNights}`, 18, 17);
  ctx.font = '13px Georgia, serif';
  ctx.fillStyle = COLORS.hudDim;
  ctx.fillText(NIGHTS[g.night].name, 18, 37);
  // Centre: shades still standing.
  const remaining = g.nights.queueLeft + g.shades.aliveCount;
  ctx.fillStyle = COLORS.hudText;
  ctx.textAlign = 'center';
  ctx.font = '700 20px Georgia, serif';
  ctx.fillText(`SHADES  ${remaining}`, VIEW_W / 2, 17);
  ctx.font = '13px Georgia, serif';
  ctx.fillStyle = COLORS.hudDim;
  ctx.fillText('banish them all before dawn', VIEW_W / 2, 37);
  // Right: score and time.
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '700 20px Georgia, serif';
  ctx.fillText(`SCORE  ${g.score.toLocaleString('en-US')}`, VIEW_W - 18, 17);
  ctx.font = '13px Georgia, serif';
  ctx.fillStyle = COLORS.hudDim;
  ctx.fillText(formatTime(g.time), VIEW_W - 18, 37);
  // Bottom left: hearts.
  ctx.textAlign = 'left';
  ctx.font = '26px Georgia, serif';
  for (let i = 0; i < PAINTER.maxHp; i++) {
    ctx.fillStyle = i < p.hp ? '#ff5d73' : 'rgba(255,93,115,0.22)';
    ctx.fillText('♥', 18 + i * 30, VIEW_H - 24);
  }
  // Bottom right: the ink bar.
  const bw = 220;
  const bx = VIEW_W - 18 - bw;
  const by = VIEW_H - 30;
  ctx.fillStyle = 'rgba(4,4,16,0.62)';
  roundRect(ctx, bx - 8, by - 8, bw + 16, 26, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,201,77,0.25)';
  roundRect(ctx, bx, by, bw, 10, 5);
  ctx.fill();
  ctx.fillStyle = COLORS.paintGold;
  roundRect(ctx, bx, by, bw * clamp(p.ink / INK.max, 0, 1), 10, 5);
  ctx.fill();
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '12px Georgia, serif';
  ctx.textAlign = 'right';
  ctx.fillText('INK', bx - 12, by + 5);
  // First-night hint, while the player is still learning the brush.
  if (g.night === 0 && g.time < 9 && g.mode === 'playing') {
    ctx.textAlign = 'center';
    ctx.font = '15px Georgia, serif';
    ctx.fillStyle = 'rgba(245,238,218,0.85)';
    ctx.fillText('WASD move  ·  hold mouse to paint light  ·  Space dash  ·  M mute', VIEW_W / 2, VIEW_H - 52);
  }
  ctx.restore();
}

function drawBanner(ctx, g) {
  if (!g.banner || g.now > g.banner.until) return;
  const a = clamp((g.banner.until - g.now) / 0.6, 0, 1);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.dawn;
  ctx.shadowColor = COLORS.paintGold;
  ctx.shadowBlur = 26;
  ctx.font = '700 54px Georgia, serif';
  ctx.fillText(g.banner.title, VIEW_W / 2, VIEW_H / 2 - 90);
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.hudText;
  ctx.font = '22px Georgia, serif';
  ctx.fillText(g.banner.sub, VIEW_W / 2, VIEW_H / 2 - 44);
  ctx.restore();
}

function overlay(ctx, rgba) {
  ctx.fillStyle = rgba;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
}

function centerText(ctx, lines) {
  // lines: [{text, font, color, y, blur}]
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const l of lines) {
    ctx.font = l.font;
    ctx.fillStyle = l.color;
    ctx.shadowColor = l.blurColor || 'transparent';
    ctx.shadowBlur = l.blur || 0;
    ctx.fillText(l.text, VIEW_W / 2, l.y);
  }
  ctx.restore();
}

function drawTitle(ctx, g) {
  overlay(ctx, 'rgba(3,3,12,0.55)');
  centerText(ctx, [
    { text: 'INKLIGHT', font: '700 92px Georgia, serif', color: COLORS.paintGold, y: 218, blur: 34, blurColor: COLORS.paintGold },
    { text: 'Paint the light back.', font: 'italic 30px Georgia, serif', color: COLORS.hudText, y: 288 },
    { text: 'The Gloom eats the world, one night at a time. You are the last', font: '18px Georgia, serif', color: COLORS.hudDim, y: 352 },
    { text: 'Lumen Painter. Your brush is the only weapon the dark fears.', font: '18px Georgia, serif', color: COLORS.hudDim, y: 378 },
    { text: 'WASD / arrows — move      Mouse — paint light      Space — dash', font: '17px Georgia, serif', color: COLORS.hudText, y: 442 },
    { text: 'Light burns the shades. Ink buys the light. Embers refill the ink.', font: '17px Georgia, serif', color: COLORS.hudText, y: 470 },
    { text: 'Survive seven nights, and the sun returns.', font: '700 19px Georgia, serif', color: COLORS.dawn, y: 512 },
  ]);
  // The call to begin, pulsing.
  const pulse = 0.65 + 0.35 * Math.sin(g.now * 3);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.textAlign = 'center';
  ctx.font = '700 24px Georgia, serif';
  ctx.fillStyle = COLORS.paintCore;
  ctx.fillText('—  Click or press any key to begin  —', VIEW_W / 2, 588);
  ctx.restore();
}

function drawNightClear(ctx, g) {
  // Dawn light washing down from the top of the frame.
  const dawn = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  dawn.addColorStop(0, 'rgba(255,214,120,0.34)');
  dawn.addColorStop(0.5, 'rgba(255,214,120,0.10)');
  dawn.addColorStop(1, 'rgba(3,3,12,0.55)');
  ctx.fillStyle = dawn;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  centerText(ctx, [
    { text: 'DAWN BREAKS', font: '700 64px Georgia, serif', color: COLORS.dawn, y: 250, blur: 30, blurColor: COLORS.paintGold },
    { text: `Night ${g.night + 1} is cleared  ·  +${g.lastBonus} bonus`, font: '22px Georgia, serif', color: COLORS.hudText, y: 322 },
    { text: 'Your wounds close. Your inkwell refills.', font: '18px Georgia, serif', color: COLORS.hudDim, y: 356 },
    { text: g.night + 1 < g.nights.totalNights ? `Night ${g.night + 2} waits in the dark.` : 'The sun is coming.', font: '700 20px Georgia, serif', color: COLORS.dawn, y: 408 },
  ]);
  const pulse = 0.65 + 0.35 * Math.sin(g.now * 3);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.textAlign = 'center';
  ctx.font = '700 22px Georgia, serif';
  ctx.fillStyle = COLORS.paintCore;
  ctx.fillText('—  Click or press any key for the next night  —', VIEW_W / 2, 500);
  ctx.restore();
}

function drawGameOver(ctx, g) {
  overlay(ctx, 'rgba(8,2,18,0.72)');
  centerText(ctx, [
    { text: 'THE GLOOM TAKES YOU', font: '700 58px Georgia, serif', color: '#c77dff', y: 240, blur: 26, blurColor: '#7b2fbe' },
    { text: 'The brush falls silent. The dark keeps the canvas.', font: '20px Georgia, serif', color: COLORS.hudDim, y: 306 },
    { text: `SCORE  ${g.score.toLocaleString('en-US')}`, font: '700 30px Georgia, serif', color: COLORS.hudText, y: 372 },
    { text: `Nights survived: ${g.stats.nightsCleared}  ·  Shades banished: ${g.stats.banished}  ·  Embers: ${g.stats.embers}`, font: '18px Georgia, serif', color: COLORS.hudDim, y: 412 },
  ]);
  const pulse = 0.65 + 0.35 * Math.sin(g.now * 3);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.textAlign = 'center';
  ctx.font = '700 22px Georgia, serif';
  ctx.fillStyle = COLORS.paintCore;
  ctx.fillText('—  Press R or click to paint again  —', VIEW_W / 2, 500);
  ctx.restore();
}

function drawWin(ctx, g) {
  const dawn = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  dawn.addColorStop(0, 'rgba(255,220,130,0.5)');
  dawn.addColorStop(0.6, 'rgba(255,190,90,0.18)');
  dawn.addColorStop(1, 'rgba(3,3,12,0.6)');
  ctx.fillStyle = dawn;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  centerText(ctx, [
    { text: 'THE SUN RETURNS', font: '700 66px Georgia, serif', color: COLORS.dawn, y: 240, blur: 32, blurColor: COLORS.paintGold },
    { text: 'Seven nights painted back. The Gloom is gone, and the world', font: '20px Georgia, serif', color: COLORS.hudText, y: 310 },
    { text: 'is bright again — because you never stopped painting.', font: '20px Georgia, serif', color: COLORS.hudText, y: 338 },
    { text: `FINAL SCORE  ${g.score.toLocaleString('en-US')}`, font: '700 32px Georgia, serif', color: COLORS.paintCore, y: 404 },
    { text: `Shades banished: ${g.stats.banished}  ·  Embers: ${g.stats.embers}  ·  Time: ${formatTime(g.time)}`, font: '18px Georgia, serif', color: COLORS.hudDim, y: 444 },
  ]);
  const pulse = 0.65 + 0.35 * Math.sin(g.now * 3);
  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.textAlign = 'center';
  ctx.font = '700 22px Georgia, serif';
  ctx.fillStyle = COLORS.paintCore;
  ctx.fillText('—  Press R or click to paint again  —', VIEW_W / 2, 520);
  ctx.restore();
}

export function draw(ctx, g) {
  drawBackground(ctx, g);
  drawStrokes(ctx, g);
  drawEmbers(ctx, g);
  drawShades(ctx, g);
  // The painter is gone once the Gloom takes them.
  if (g.painter.alive) drawPainter(ctx, g);
  g.particles.draw(ctx);
  if (g.mode === 'playing' || g.mode === 'paused' || g.mode === 'nightclear') drawHUD(ctx, g);
  drawBanner(ctx, g);
  if (g.mode === 'title') drawTitle(ctx, g);
  if (g.mode === 'nightclear') drawNightClear(ctx, g);
  if (g.mode === 'gameover') drawGameOver(ctx, g);
  if (g.mode === 'win') drawWin(ctx, g);
  if (g.mode === 'paused') {
    overlay(ctx, 'rgba(3,3,12,0.6)');
    centerText(ctx, [
      { text: 'PAUSED', font: '700 56px Georgia, serif', color: COLORS.hudText, y: VIEW_H / 2 - 20 },
      { text: 'Press P to keep painting.', font: '20px Georgia, serif', color: COLORS.hudDim, y: VIEW_H / 2 + 30 },
    ]);
  }
  // The self-test prints its verdict on the canvas for the screenshot.
  if (g.selftestResult) {
    ctx.save();
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '700 20px monospace';
    ctx.fillStyle = g.selftestResult.ok ? '#7dffa8' : '#ff5d73';
    ctx.fillText(g.selftestResult.ok ? 'SELFTEST_OK' : 'SELFTEST_FAIL', 14, VIEW_H - 34);
    ctx.font = '14px monospace';
    ctx.fillStyle = COLORS.hudDim;
    ctx.fillText(`${g.selftestResult.passed}/${g.selftestResult.total} checks`, 150, VIEW_H - 32);
    ctx.restore();
  }
}
