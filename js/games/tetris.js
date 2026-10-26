/* ==========================================================================
   ASCI ON THE OFFICE - Juego 4: TETRIS ASCII (Archivador de Expedientes)
   ========================================================================== */

window.GameTetris = (function () {
  let containerEl = null;
  let exitCallback = null;
  let dropInterval = null;

  const COLS = 10;
  const ROWS = 20;

  const SHAPES = {
    I: {
      token: '██',
      cls: 'ascii-info',
      matrix: [
        [0, 0, 0, 0],
        [1, 1, 1, 1],
        [0, 0, 0, 0],
        [0, 0, 0, 0]
      ]
    },
    O: {
      token: '▓▓',
      cls: 'ascii-warn',
      matrix: [
        [1, 1],
        [1, 1]
      ]
    },
    T: {
      token: '▒▒',
      cls: 'ascii-bright',
      matrix: [
        [0, 1, 0],
        [1, 1, 1],
        [0, 0, 0]
      ]
    },
    S: {
      token: '##',
      cls: '',
      matrix: [
        [0, 1, 1],
        [1, 1, 0],
        [0, 0, 0]
      ]
    },
    Z: {
      token: '@@',
      cls: 'ascii-danger',
      matrix: [
        [1, 1, 0],
        [0, 1, 1],
        [0, 0, 0]
      ]
    },
    J: {
      token: '[]',
      cls: 'ascii-info',
      matrix: [
        [1, 0, 0],
        [1, 1, 1],
        [0, 0, 0]
      ]
    },
    L: {
      token: '%%',
      cls: 'ascii-warn',
      matrix: [
        [0, 0, 1],
        [1, 1, 1],
        [0, 0, 0]
      ]
    }
  };

  let board = [];
  let bag = [];
  let current = null; // { type, matrix, x, y }
  let nextType = null;
  let holdType = null;
  let canHold = true;

  let score = 0;
  let bestScore = 0;
  let lines = 0;
  let level = 1;
  let paused = false;
  let gameOver = false;

  function refillBag() {
    const keys = Object.keys(SHAPES);
    for (let i = keys.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [keys[i], keys[j]] = [keys[j], keys[i]];
    }
    bag.push(...keys);
  }

  function pullFromBag() {
    if (bag.length < 2) refillBag();
    return bag.shift();
  }

  function cloneMatrix(m) {
    return m.map(r => r.slice());
  }

  function spawnPiece(typeKey) {
    const type = typeKey || nextType || pullFromBag();
    if (!typeKey) {
      nextType = pullFromBag();
    }
    const mat = cloneMatrix(SHAPES[type].matrix);
    current = {
      type,
      matrix: mat,
      x: Math.floor((COLS - mat[0].length) / 2),
      y: 0
    };
    canHold = true;

    if (collides(current.matrix, current.x, current.y)) {
      gameOver = true;
      window.AsciiAudio.explosion();
      if (window.OfficeStats && score > 0) {
        window.OfficeStats.recordGameWin('tetris', score);
      }
    }
  }

  function collides(matrix, offsetX, offsetY) {
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (!matrix[r][c]) continue;
        const nx = offsetX + c;
        const ny = offsetY + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx] !== null) return true;
      }
    }
    return false;
  }

  function rotateMatrix(matrix) {
    const N = matrix.length;
    const res = Array.from({ length: N }, () => Array(N).fill(0));
    for (let r = 0; r < N; r++) {
      for (let c = 0; c < N; c++) {
        res[c][N - 1 - r] = matrix[r][c];
      }
    }
    return res;
  }

  function rotateCurrent() {
    if (paused || gameOver || !current) return;
    const rotated = rotateMatrix(current.matrix);
    const kicks = [0, -1, 1, -2, 2];
    for (const dx of kicks) {
      if (!collides(rotated, current.x + dx, current.y)) {
        current.matrix = rotated;
        current.x += dx;
        window.AsciiAudio.move();
        updateView();
        return;
      }
    }
  }

  function moveHorizontal(dir) {
    if (paused || gameOver || !current) return;
    if (!collides(current.matrix, current.x + dir, current.y)) {
      current.x += dir;
      window.AsciiAudio.move();
      updateView();
    }
  }

  function getGhostY() {
    if (!current) return 0;
    let gy = current.y;
    while (!collides(current.matrix, current.x, gy + 1)) {
      gy++;
    }
    return gy;
  }

  function lockPiece() {
    for (let r = 0; r < current.matrix.length; r++) {
      for (let c = 0; c < current.matrix[r].length; c++) {
        if (current.matrix[r][c]) {
          const by = current.y + r;
          const bx = current.x + c;
          if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
            board[by][bx] = current.type;
          }
        }
      }
    }

    // Revisar filas completas
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every(cell => cell !== null)) {
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(null));
        cleared++;
        r++;
      }
    }

    if (cleared > 0) {
      const pts = [0, 100, 300, 500, 800][cleared] * level;
      score += pts;
      lines += cleared;
      const newLevel = Math.floor(lines / 10) + 1;
      if (newLevel !== level) {
        level = newLevel;
        restartTimer();
      }
      window.AsciiAudio.clearLine();
    } else {
      window.AsciiAudio.click();
    }

    if (score > bestScore) {
      bestScore = score;
      if (window.OfficeStats) window.OfficeStats.recordGameWin('tetris', score);
    }

    spawnPiece();
    updateView();
  }

  function softDrop() {
    if (paused || gameOver || !current) return;
    if (!collides(current.matrix, current.x, current.y + 1)) {
      current.y++;
      score += 1;
      updateView();
    } else {
      lockPiece();
    }
  }

  function hardDrop() {
    if (paused || gameOver || !current) return;
    let dropped = 0;
    while (!collides(current.matrix, current.x, current.y + 1)) {
      current.y++;
      dropped++;
    }
    score += dropped * 2;
    lockPiece();
  }

  function holdPiece() {
    if (paused || gameOver || !current || !canHold) return;
    const prevHold = holdType;
    holdType = current.type;
    if (prevHold) {
      spawnPiece(prevHold);
    } else {
      spawnPiece();
    }
    canHold = false;
    window.AsciiAudio.move();
    updateView();
  }

  function restartTimer() {
    if (dropInterval) clearInterval(dropInterval);
    const ms = Math.max(110, 680 - (level - 1) * 55);
    dropInterval = setInterval(() => {
      if (!paused && !gameOver && !window.BossKey.isActive()) {
        softDrop();
      }
    }, ms);
  }

  function startNewGame() {
    board = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    bag = [];
    refillBag();
    nextType = pullFromBag();
    holdType = null;
    canHold = true;
    score = 0;
    lines = 0;
    level = 1;
    paused = false;
    gameOver = false;
    if (window.OfficeStats) {
      bestScore = window.OfficeStats.getHighScore('tetris');
    }
    spawnPiece();
    restartTimer();
    render();
  }

  function formatCell(type) {
    if (!type) return ' ·';
    const cfg = SHAPES[type];
    return cfg.cls ? `<span class="${cfg.cls}">${cfg.token}</span>` : cfg.token;
  }

  function renderMiniPreview(type) {
    const grid = Array.from({ length: 4 }, () => Array(4).fill('  '));
    if (type) {
      const m = SHAPES[type].matrix;
      for (let r = 0; r < m.length; r++) {
        for (let c = 0; c < m[r].length; c++) {
          if (m[r][c]) grid[r][c] = formatCell(type);
        }
      }
    }
    return grid.map(r => '│ ' + r.join('') + ' │').join('\n');
  }

  function buildWellHtml() {
    const temp = board.map(row => row.map(cell => (cell ? formatCell(cell) : ' ·')));

    if (current && !gameOver) {
      const gy = getGhostY();
      for (let r = 0; r < current.matrix.length; r++) {
        for (let c = 0; c < current.matrix[r].length; c++) {
          if (current.matrix[r][c]) {
            const py = gy + r;
            const px = current.x + c;
            if (py >= 0 && py < ROWS && px >= 0 && px < COLS && !board[py][px]) {
              temp[py][px] = '<span class="ascii-dim">::</span>';
            }
          }
        }
      }

      for (let r = 0; r < current.matrix.length; r++) {
        for (let c = 0; c < current.matrix[r].length; c++) {
          if (current.matrix[r][c]) {
            const py = current.y + r;
            const px = current.x + c;
            if (py >= 0 && py < ROWS && px >= 0 && px < COLS) {
              temp[py][px] = formatCell(current.type);
            }
          }
        }
      }
    }

    const linesArr = [];
    linesArr.push('╔' + '══'.repeat(COLS) + '╗');
    for (let r = 0; r < ROWS; r++) {
      linesArr.push('║' + temp[r].join('') + '║');
    }
    linesArr.push('╚' + '══'.repeat(COLS) + '╝');

    if (gameOver) {
      linesArr.push(`<span class="ascii-danger">╔════════════════════╗
║ ¡ARCHIVO SATURADO! ║
║ [R] Nuevo Archivo  ║
╚════════════════════╝</span>`);
    } else if (paused) {
      linesArr.push(`<span class="ascii-warn">╔════════════════════╗
║  PAUSA EJECUTIVA   ║
╚════════════════════╝</span>`);
    }

    return linesArr.join('\n');
  }

  function updateView() {
    const wellEl = document.getElementById('tetris-well');
    const sideEl = document.getElementById('tetris-side');
    if (wellEl) wellEl.innerHTML = buildWellHtml();
    if (sideEl) sideEl.innerHTML = buildSideHtml();
  }

  function buildSideHtml() {
    return `┌────────────┐
│ SIGUIENTE  │
├────────────┤
${renderMiniPreview(nextType)}
├────────────┤
│ RESERVA(C) │
├────────────┤
${renderMiniPreview(holdType)}
├────────────┤
│ ESTADÍSTICA│
├────────────┤
│ Puntos:    │
│  <span class="ascii-warn">${String(score).padStart(8, '0')}</span>  │
│ Récord:    │
│  <span class="ascii-info">${String(bestScore).padStart(8, '0')}</span>  │
│ Líneas: ${String(lines).padStart(3, ' ')}│
│ Nivel : ${String(level).padStart(3, ' ')}│
└────────────┘`;
  }

  function render() {
    if (!containerEl) return;

    containerEl.innerHTML = `
      <div class="game-shell">
        <pre class="ascii-art ascii-bright">
┌──────────────────────────────────────────────────────────────────────────────────┐
│  [04] TETRIS ASCII - "Archivando Expedientes antes de las 5:00 PM"               │
└──────────────────────────────────────────────────────────────────────────────────┘</pre>

        <div class="bar-controls">
          <div class="bar-group">
            <button class="ascii-btn" id="tet-new">[R] Reiniciar</button>
            <button class="ascii-btn" id="tet-pause">[P] Pausa</button>
            <button class="ascii-btn" id="tet-hold">[C] Guardar Pieza</button>
          </div>
          <div class="bar-group">
            <button class="ascii-btn" id="tet-left">[◄ Izq]</button>
            <button class="ascii-btn" id="tet-rot">[▲ Rotar]</button>
            <button class="ascii-btn" id="tet-down">[▼ Bajar]</button>
            <button class="ascii-btn" id="tet-right">[Der ►]</button>
            <button class="ascii-btn" id="tet-drop">[ESPACIO: Caída]</button>
            <button class="ascii-btn danger-btn" id="tet-exit">[ESC] Menú</button>
          </div>
        </div>

        <div class="game-workspace">
          <div class="ascii-panel" id="tetris-well">${buildWellHtml()}</div>
          <div class="ascii-panel" id="tetris-side">${buildSideHtml()}</div>
          <div class="ascii-panel">
┌────────────────────────────┐
│ MANUAL DEL ARCHIVADOR      │
├────────────────────────────┤
│ • ◄ / ► (A/D) : Mover      │
│ • ▲ / W       : Rotar      │
│ • ▼ / S       : Bajar suave│
│ • ESPACIO     : Caída total│
│ • C           : Reserva    │
│ • P           : Pausa      │
│ • R           : Reiniciar  │
└────────────────────────────┘</div>
        </div>
      </div>
    `;

    document.getElementById('tet-new')?.addEventListener('click', () => startNewGame());
    document.getElementById('tet-pause')?.addEventListener('click', () => {
      paused = !paused;
      updateView();
    });
    document.getElementById('tet-hold')?.addEventListener('click', () => holdPiece());
    document.getElementById('tet-left')?.addEventListener('click', () => moveHorizontal(-1));
    document.getElementById('tet-right')?.addEventListener('click', () => moveHorizontal(1));
    document.getElementById('tet-rot')?.addEventListener('click', () => rotateCurrent());
    document.getElementById('tet-down')?.addEventListener('click', () => softDrop());
    document.getElementById('tet-drop')?.addEventListener('click', () => hardDrop());
    document.getElementById('tet-exit')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      if (exitCallback) exitCallback();
    });
  }

  return {
    init(container, onExit) {
      containerEl = container;
      exitCallback = onExit;
      startNewGame();
    },
    destroy() {
      if (dropInterval) clearInterval(dropInterval);
      dropInterval = null;
      containerEl = null;
    },
    handleKey(e) {
      if (!containerEl) return;
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
        e.preventDefault();
        moveHorizontal(-1);
      } else if (k === 'ArrowRight' || k === 'd' || k === 'D') {
        e.preventDefault();
        moveHorizontal(1);
      } else if (k === 'ArrowUp' || k === 'w' || k === 'W' || k === 'x' || k === 'X') {
        e.preventDefault();
        rotateCurrent();
      } else if (k === 'ArrowDown' || k === 's' || k === 'S') {
        e.preventDefault();
        softDrop();
      } else if (k === ' ') {
        e.preventDefault();
        if (gameOver) startNewGame();
        else hardDrop();
      } else if (k === 'c' || k === 'C') {
        e.preventDefault();
        holdPiece();
      } else if (k === 'p' || k === 'P') {
        e.preventDefault();
        paused = !paused;
        updateView();
      } else if (k === 'r' || k === 'R') {
        e.preventDefault();
        startNewGame();
      }
    }
  };
})();
