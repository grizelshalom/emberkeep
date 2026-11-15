// Emberkeep — keyboard and mouse input.
// One job: turn browser events into a tidy state the game loop reads.

export function createInput(canvas) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 0, y: 0, clicked: false, clickX: 0, clickY: 0 };
  let anyKey = false;

  function keyName(event) {
    // Lowercase everything: 'Enter' -> 'enter', 'ArrowUp' -> 'arrowup',
    // single letters already arrive lowercased by the browser for keydown.
    return event.key.toLowerCase();
  }

  window.addEventListener('keydown', (event) => {
    const name = keyName(event);
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(name)) {
      event.preventDefault();
    }
    if (!keys.has(name)) pressed.add(name);
    keys.add(name);
    anyKey = true;
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(keyName(event));
  });
  window.addEventListener('blur', () => {
    keys.clear();
  });

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (canvas.width / rect.width),
      y: (event.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  canvas.addEventListener('mousemove', (event) => {
    const p = canvasPoint(event);
    mouse.x = p.x;
    mouse.y = p.y;
  });
  canvas.addEventListener('mousedown', (event) => {
    const p = canvasPoint(event);
    mouse.x = p.x;
    mouse.y = p.y;
    mouse.clicked = true;
    mouse.clickX = p.x;
    mouse.clickY = p.y;
    anyKey = true;
  });

  return {
    // Held keys: 'w','a','s','d' and 'arrowup' etc.
    get up() { return keys.has('w') || keys.has('arrowup'); },
    get down() { return keys.has('s') || keys.has('arrowdown'); },
    get left() { return keys.has('a') || keys.has('arrowleft'); },
    get right() { return keys.has('d') || keys.has('arrowright'); },
    mouse,
    // True once for the frame after the key went down.
    wasPressed(name) { return pressed.has(name); },
    // True once after any key or click, then clears.
    takeAnyKey() {
      const hit = anyKey;
      anyKey = false;
      return hit;
    },
    // True once after a click, then clears.
    takeClick() {
      const hit = mouse.clicked;
      mouse.clicked = false;
      return hit;
    },
    // Call at the end of each frame: one-frame presses expire.
    endFrame() {
      pressed.clear();
    },
  };
}
