// Starlight Salvage — every pixel the game draws.
// The renderer only reads world state; it never changes it.
import { PALETTE, SHIP, WAVES, UPGRADE_POOL } from './config.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(ctx, world) {
  const grad = ctx.createLinearGradient(0, 0, 0, 800);
  grad.addColorStop(0, PALETTE.spaceTop);
  grad.addColorStop(1, PALETTE.spaceBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1280, 800);
  for (const n of world.nebulae) {
    const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    g.addColorStop(0, n.color + '55');
    g.addColorStop(1, n.color + '00');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const s of world.stars) {
    const a = 0.35 + 0.65 * Math.abs(Math.sin(world.time * s.sp + s.tw));
    ctx.globalAlpha = a;
    ctx.fillStyle = PALETTE.star;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawShip(ctx, world) {
  const ship = world.ship;
  if (world.state === 'defeat') return;
  if (ship.invuln > 0 && Math.floor(world.time * 12) % 2 === 0) return;
  ctx.save();
  ctx.translate(ship.x, ship.y);
  ctx.rotate(ship.angle);
  if (ship.thrust > 0) {
    ctx.fillStyle = PALETTE.shipTrim;
    ctx.beginPath();
    ctx.moveTo(-14, 7);
    ctx.lineTo(-26 - Math.random() * 8, 0);
    ctx.lineTo(-14, -7);
    ctx.closePath();
    ctx.fill();
  }
  ctx.shadowColor = PALETTE.shipGlow;
  ctx.shadowBlur = 14;
  ctx.fillStyle = PALETTE.shipBody;
  ctx.beginPath();
  ctx.moveTo(22, 0);
  ctx.lineTo(-12, 12);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-12, -12);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = PALETTE.shipTrim;
  ctx.beginPath();
  ctx.arc(4, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawRock(ctx, rock) {
  ctx.save();
  ctx.translate(rock.x, rock.y);
  ctx.rotate(rock.rot);
  ctx.fillStyle = rock.small ? PALETTE.rockDark : PALETTE.rock;
  ctx.strokeStyle = '#b8a894';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < rock.verts.length; i++) {
    const a = (i / rock.verts.length) * Math.PI * 2;
    const r = rock.r * rock.verts[i];
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.beginPath();
  ctx.arc(-rock.r * 0.25, -rock.r * 0.2, rock.r * 0.28, 0, Math.PI * 2);
  ctx.arc(rock.r * 0.3, rock.r * 0.25, rock.r * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDarter(ctx, d) {
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.rotate(Math.atan2(d.vy, d.vx));
  ctx.shadowColor = PALETTE.darter;
  ctx.shadowBlur = 12;
  ctx.fillStyle = PALETTE.darter;
  ctx.beginPath();
  ctx.moveTo(18, 0);
  ctx.lineTo(-12, 10);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-12, -10);
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(4, 0, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawMine(ctx, m, time) {
  const pulse = 0.6 + 0.4 * Math.sin(time * 6 + m.fuse);
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.shadowColor = PALETTE.mine;
  ctx.shadowBlur = 14 * pulse;
  ctx.fillStyle = PALETTE.mine;
  ctx.beginPath();
  ctx.arc(0, 0, m.r, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * m.r, Math.sin(a) * m.r);
    ctx.lineTo(Math.cos(a) * (m.r + 8), Math.sin(a) * (m.r + 8));
    ctx.stroke();
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(0, 0, 4 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawPickup(ctx, p) {
  const bob = Math.sin(p.bob) * 3;
  ctx.save();
  ctx.translate(p.x, p.y + bob);
  ctx.rotate(Math.PI / 4);
  ctx.shadowColor = p.kind === 'repair' ? PALETTE.repair : PALETTE.shard;
  ctx.shadowBlur = 10;
  ctx.fillStyle = p.kind === 'repair' ? PALETTE.repair : PALETTE.shard;
  const s = p.kind === 'repair' ? 9 : 7;
  ctx.fillRect(-s / 2, -s / 2, s, s);
  ctx.restore();
  if (p.kind === 'repair') {
    ctx.fillStyle = '#0a1026';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', p.x, p.y + bob);
  }
}

function drawHud(ctx, world) {
  const ship = world.ship;
  ctx.textBaseline = 'alphabetic';
  // Top-left: score and salvage.
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(`SCORE ${world.score.toLocaleString('en-US')}`, 24, 44);
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = PALETTE.shard;
  ctx.fillText(`◆ SALVAGE ${world.salvage}`, 24, 72);
  ctx.fillStyle = PALETTE.textDim;
  ctx.fillText(`WAVE ${Math.max(1, world.wave)} / ${WAVES.total}`, 24, 98);

  // Top-right: hull bar.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText(`HULL ${Math.ceil(ship.hull)} / ${ship.maxHull}`, 1256, 40);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  roundRect(ctx, 1056, 50, 200, 16, 8);
  ctx.fill();
  const hullFrac = Math.max(0, ship.hull / ship.maxHull);
  ctx.fillStyle = hullFrac > 0.5 ? PALETTE.shard : hullFrac > 0.25 ? PALETTE.gold : PALETTE.danger;
  roundRect(ctx, 1056, 50, 200 * hullFrac, 16, 8);
  ctx.fill();

  // Combo badge.
  if (world.combo > 1.01) {
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText(`COMBO x${world.combo.toFixed(2)}`, 640, 44);
  }

  // Wave banner.
  if (world.messageTimer > 0) {
    ctx.globalAlpha = Math.min(1, world.messageTimer);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(world.message, 640, 180);
    ctx.globalAlpha = 1;
  }

  // Bottom hint.
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.textDim;
  ctx.font = '15px sans-serif';
  ctx.fillText('WASD / arrows to fly  ·  mouse to aim  ·  click or SPACE to fire  ·  P pause  ·  M mute', 640, 782);
}

function drawEntities(ctx, world) {
  for (const p of world.pickups) drawPickup(ctx, p);
  for (const m of world.mines) drawMine(ctx, m, world.time);
  for (const r of world.rocks) drawRock(ctx, r);
  for (const d of world.darters) drawDarter(ctx, d);
  for (const b of world.bullets) {
    ctx.fillStyle = PALETTE.bullet;
    ctx.shadowColor = PALETTE.bullet;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
  drawShip(ctx, world);
  for (const p of world.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.font = 'bold 16px sans-serif';
  for (const f of world.floats) {
    ctx.globalAlpha = Math.min(1, f.life);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}

function dimScreen(ctx) {
  ctx.fillStyle = 'rgba(4, 7, 18, 0.72)';
  ctx.fillRect(0, 0, 1280, 800);
}

function titleText(ctx, text, y, size, color, font) {
  ctx.textAlign = 'center';
  ctx.font = `${font || 'bold'} ${size}px sans-serif`;
  ctx.fillStyle = color;
  ctx.fillText(text, 640, y);
}

function menuPanel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelLine;
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 18);
  ctx.stroke();
}

function drawTitle(ctx, world) {
  dimScreen(ctx);
  // A decorative ship flying in from the right of the title.
  ctx.save();
  ctx.translate(1065, 235);
  ctx.rotate(-Math.PI / 2 + 0.5);
  ctx.scale(0.75, 0.75);
  ctx.fillStyle = PALETTE.shipBody;
  ctx.shadowColor = PALETTE.shipGlow;
  ctx.shadowBlur = 24;
  ctx.beginPath();
  ctx.moveTo(44, 0);
  ctx.lineTo(-24, 24);
  ctx.lineTo(-12, 0);
  ctx.lineTo(-24, -24);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  titleText(ctx, 'STARLIGHT', 200, 84, PALETTE.text);
  titleText(ctx, 'SALVAGE', 285, 84, PALETTE.gold);
  titleText(ctx, 'Blast the debris field. Grab the salvage. Survive 10 waves.', 350, 24, PALETTE.textDim, 'normal');
  menuPanel(ctx, 390, 400, 500, 220);
  titleText(ctx, 'HOW TO PLAY', 440, 22, PALETTE.shipGlow);
  titleText(ctx, 'WASD / arrows — fly your skiff', 478, 20, PALETTE.text, 'normal');
  titleText(ctx, 'Mouse — aim   ·   Click / SPACE — fire', 508, 20, PALETTE.text, 'normal');
  titleText(ctx, 'Clear each wave, pick 1 of 3 upgrades', 538, 20, PALETTE.text, 'normal');
  titleText(ctx, 'Rocks split. Darters chase. Mines explode.', 568, 20, PALETTE.text, 'normal');
  titleText(ctx, 'PRESS ENTER OR CLICK TO LAUNCH', 680, 26, PALETTE.gold);
  titleText(ctx, 'P pause  ·  M mute  ·  R restart', 720, 16, PALETTE.textDim, 'normal');
}

function drawUpgrade(ctx, world) {
  dimScreen(ctx);
  titleText(ctx, `WAVE ${world.wave} CLEARED`, 130, 52, PALETTE.gold);
  titleText(ctx, 'Choose one upgrade to take into the next wave', 175, 22, PALETTE.textDim, 'normal');
  const w = 340;
  const gap = 30;
  const total = w * 3 + gap * 2;
  const x0 = (1280 - total) / 2;
  world.choices.forEach((c, i) => {
    const x = x0 + i * (w + gap);
    const y = 240;
    const hot = world.choiceIndex === i;
    ctx.fillStyle = hot ? 'rgba(255, 207, 92, 0.16)' : PALETTE.panel;
    roundRect(ctx, x, y, w, 260, 16);
    ctx.fill();
    ctx.strokeStyle = hot ? PALETTE.gold : PALETTE.panelLine;
    ctx.lineWidth = hot ? 3 : 2;
    roundRect(ctx, x, y, w, 260, 16);
    ctx.stroke();
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText(`${i + 1}`, x + w / 2, y + 48);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 24px sans-serif';
    const name = c.name;
    ctx.fillText(name, x + w / 2, y + 92);
    ctx.fillStyle = PALETTE.textDim;
    ctx.font = '18px sans-serif';
    const words = c.desc.split(' ');
    let line = '';
    let ly = y + 130;
    for (const word of words) {
      if ((line + ' ' + word).trim().length > 26) {
        ctx.fillText(line.trim(), x + w / 2, ly);
        line = word;
        ly += 26;
      } else {
        line += ' ' + word;
      }
    }
    if (line.trim()) ctx.fillText(line.trim(), x + w / 2, ly);
    const lvl = world.levels[c.id] || 0;
    ctx.fillStyle = PALETTE.shipGlow;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`OWNED ${lvl} / ${c.max}`, x + w / 2, y + 220);
  });
  titleText(ctx, 'Press 1, 2 or 3 — or click a card', 580, 22, PALETTE.text);
  titleText(ctx, `SCORE ${world.score.toLocaleString('en-US')}  ·  SALVAGE ${world.salvage}`, 620, 20, PALETTE.textDim, 'normal');
}

function drawEnd(ctx, world, won) {
  dimScreen(ctx);
  titleText(ctx, won ? 'FIELD CLEARED!' : 'SKIFF DESTROYED', 240, 72, won ? PALETTE.gold : PALETTE.danger);
  titleText(
    ctx,
    won
      ? 'Ten waves of debris, and you are still flying. The salvage is yours.'
      : 'The debris field claims another skiff. The salvage drifts on.',
    300,
    22,
    PALETTE.textDim,
    'normal',
  );
  menuPanel(ctx, 440, 360, 400, 200);
  titleText(ctx, `FINAL SCORE  ${world.score.toLocaleString('en-US')}`, 420, 30, PALETTE.text);
  titleText(ctx, `SALVAGE COLLECTED  ${world.salvage}`, 465, 20, PALETTE.shard, 'normal');
  titleText(ctx, `ROCKS DESTROYED  ${world.kills}`, 495, 20, PALETTE.textDim, 'normal');
  titleText(ctx, `WAVES CLEARED  ${won ? WAVES.total : Math.max(0, world.wave - 1)} / ${WAVES.total}`, 525, 20, PALETTE.textDim, 'normal');
  titleText(ctx, 'PRESS R OR ENTER TO FLY AGAIN', 640, 26, PALETTE.gold);
}

function drawPaused(ctx) {
  dimScreen(ctx);
  titleText(ctx, 'PAUSED', 380, 64, PALETTE.text);
  titleText(ctx, 'Press P to keep flying', 440, 22, PALETTE.textDim, 'normal');
}

export function render(ctx, world) {
  ctx.save();
  if (world.shake > 0) {
    ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
  }
  drawBackground(ctx, world);
  if (world.state !== 'title') {
    drawEntities(ctx, world);
  }
  if (world.state === 'play' || world.state === 'paused' || world.state === 'upgrade') {
    drawHud(ctx, world);
  }
  if (world.state === 'title') drawTitle(ctx, world);
  if (world.state === 'upgrade') drawUpgrade(ctx, world);
  if (world.state === 'victory') drawEnd(ctx, world, true);
  if (world.state === 'defeat') drawEnd(ctx, world, false);
  if (world.state === 'paused') drawPaused(ctx);
  ctx.restore();
}

// Where an upgrade card sits, for click handling in main.js.
export function upgradeCardAt(x, y) {
  const w = 340;
  const gap = 30;
  const total = w * 3 + gap * 2;
  const x0 = (1280 - total) / 2;
  if (y < 240 || y > 500) return -1;
  for (let i = 0; i < 3; i++) {
    const cx = x0 + i * (w + gap);
    if (x >= cx && x <= cx + w) return i;
  }
  return -1;
}
