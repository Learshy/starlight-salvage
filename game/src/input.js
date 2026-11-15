// Starlight Salvage — keyboard and mouse input.
// The game reads this one object; nothing else touches the DOM events.
export function createInput(canvas) {
  const input = {
    keys: new Set(),
    mouseX: 640,
    mouseY: 400,
    mouseDown: false,
    // Edge-triggered presses, consumed once per frame by the game loop.
    pressed: new Set(),
    anyKey: false,
  };

  const keyName = (e) => {
    if (e.key === ' ') return 'Space';
    if (e.key.length === 1) return e.key.toLowerCase();
    return e.key;
  };

  window.addEventListener('keydown', (e) => {
    const k = keyName(e);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
      e.preventDefault();
    }
    if (!e.repeat) {
      input.pressed.add(k);
      input.anyKey = true;
    }
    input.keys.add(k);
  });
  window.addEventListener('keyup', (e) => {
    input.keys.delete(keyName(e));
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.mouseDown = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    input.mouseX = ((e.clientX - r.left) / r.width) * canvas.width;
    input.mouseY = ((e.clientY - r.top) / r.height) * canvas.height;
  });
  canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    input.mouseDown = true;
    input.anyKey = true;
  });
  window.addEventListener('mouseup', () => {
    input.mouseDown = false;
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  input.down = (k) => input.keys.has(k);
  input.wasPressed = (k) => input.pressed.has(k);
  input.endFrame = () => {
    input.pressed.clear();
    input.anyKey = false;
  };
  return input;
}
