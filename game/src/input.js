// INKLIGHT — input: keyboard and mouse, read by the game every frame.
// The canvas is scaled by CSS to fit the window, so mouse coordinates are
// converted back into the 1280x720 logical playfield here, in one place.

import { VIEW_W, VIEW_H } from './config.js';

export function createInput(canvas) {
  const keys = new Set();
  const mouse = { x: VIEW_W / 2, y: VIEW_H / 2, down: false, clicked: false };
  let anyKey = false;

  function toLogical(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * VIEW_W,
      y: ((clientY - r.top) / r.height) * VIEW_H,
    };
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    keys.add(e.key.toLowerCase());
    anyKey = true;
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (e) => {
    const p = toLogical(e.clientX, e.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    const p = toLogical(e.clientX, e.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.down = true;
    mouse.clicked = true;
  });
  window.addEventListener('mouseup', (e) => {
    if (e.button === 0) mouse.down = false;
  });
  // Keep the brush on the canvas when the pointer leaves and comes back.
  canvas.addEventListener('mouseleave', () => {
    mouse.down = false;
  });

  return {
    // Held keys: WASD and the arrow keys both steer the painter.
    axis() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      if (keys.has('w') || keys.has('arrowup')) y -= 1;
      if (keys.has('s') || keys.has('arrowdown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.hypot(x, y);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    dashPressed() {
      return keys.has(' ');
    },
    mutePressed() {
      return keys.has('m');
    },
    pausePressed() {
      return keys.has('p');
    },
    restartPressed() {
      return keys.has('r');
    },
    // True once after any key or click, then cleared by the game.
    consumeAnyKey() {
      const v = anyKey || mouse.clicked;
      anyKey = false;
      mouse.clicked = false;
      return v;
    },
    consumeClick() {
      const v = mouse.clicked;
      mouse.clicked = false;
      return v;
    },
    mouse,
    keys,
  };
}
