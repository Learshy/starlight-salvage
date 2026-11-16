// Input intents. The game never reads keys directly; it reads intents
// (move axis, aim angle, flare, relight, pause, mute, restart), so the
// core-loop verb is one mapping, testable without a keyboard.

export function createInput(canvas) {
  const keys = new Set();
  const justPressed = new Set();
  let mouseX = 640;
  let mouseY = 300;
  let mouseDown = false;
  let mouseClicked = false;

  function toCanvas(e) {
    const r = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * 1280,
      y: ((e.clientY - r.top) / r.height) * 720,
    };
  }

  window.addEventListener('keydown', (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    if (!e.repeat) justPressed.add(e.key.toLowerCase());
    keys.add(e.key.toLowerCase());
  });
  window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousemove', (e) => {
    const p = toCanvas(e);
    mouseX = p.x;
    mouseY = p.y;
  });
  canvas.addEventListener('mousedown', (e) => {
    const p = toCanvas(e);
    mouseX = p.x;
    mouseY = p.y;
    mouseDown = true;
    mouseClicked = true;
  });
  window.addEventListener('mouseup', () => {
    mouseDown = false;
  });

  return {
    axisX() {
      let x = 0;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      return x;
    },
    axisY() {
      let y = 0;
      if (keys.has('w') || keys.has('arrowup')) y -= 1;
      if (keys.has('s') || keys.has('arrowdown')) y += 1;
      return y;
    },
    aimAngle(fromX, fromY) {
      return Math.atan2(mouseY - fromY, mouseX - fromX);
    },
    mouse() {
      return { x: mouseX, y: mouseY };
    },
    // Edge-triggered, consumed once per frame by the game loop.
    flarePressed() {
      return mouseClicked || justPressed.has(' ') || mouseDown;
    },
    relightPressed() {
      return justPressed.has('e');
    },
    pausePressed() {
      return justPressed.has('p') || justPressed.has('escape');
    },
    mutePressed() {
      return justPressed.has('m');
    },
    restartPressed() {
      return justPressed.has('r');
    },
    confirmPressed() {
      return justPressed.has('enter') || mouseClicked;
    },
    anyKey() {
      return justPressed.size > 0 || mouseClicked;
    },
    // Called at the end of each frame: edge flags live exactly one frame.
    endFrame() {
      justPressed.clear();
      mouseClicked = false;
    },
  };
}
