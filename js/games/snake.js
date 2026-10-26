/* ==========================================================================
   ASCI ON THE OFFICE - Juego 3: SNAKE (Culebrita del Cable Ethernet)
   ========================================================================== */

window.GameSnake = (function () {
  let containerEl = null;
  let exitCallback = null;
  let loopInterval = null;

  const WIDTH = 26;
  const HEIGHT = 18;

  let snake = [];
  let dir = { x: 1, y: 0 };
  let nextDir = { x: 1, y: 0 };
  let food = { x: 10, y: 10 };
  let bonus = null; // { x, y, ttl }
  let obstacles = [];
  let score = 0;
  let bestScore = 0;
  let paused = false;
  let gameOver = false;
  let wrapWalls = false;
  let cubicleMode = false;
  let speedMs = 115;

  function buildObstacles() {
    obstacles = [];
    if (!cubicleMode) return;
    for (let x = 5; x <= 9; x++) {
      obstacles.push({ x, y: 4 });
      obstacles.push({ x, y: HEIGHT - 5 });
    }
    for (let x = WIDTH - 10; x <= WIDTH - 6; x++) {
      obstacles.push({ x, y: 4 });
      obstacles.push({ x, y: HEIGHT - 5 });
    }
    for (let y = 7; y <= 10; y++) {
      obstacles.push({ x: Math.floor(WIDTH / 2), y });
    }
  }

  function isOccupied(x, y) {
    if (snake.some(s => s.x === x && s.y === y)) return true;
    if (obstacles.some(o => o.x === x && o.y === y)) return true;
    return false;
  }

  function spawnFood() {
    const free = [];
    for (let y = 0; y < HEIGHT; y++) {
      for (let x = 0; x < WIDTH; x++) {
        if (!isOccupied(x, y)) free.push({ x, y });
      }
    }
    if (free.length > 0) {
      food = free[Math.floor(Math.random() * free.length)];
    }
    if (!bonus && Math.random() < 0.28 && free.length > 2) {
      const b = free[Math.floor(Math.random() * free.length)];
      if (b.x !== food.x || b.y !== food.y) {
        bonus = { x: b.x, y: b.y, ttl: 42 };
      }
    }
  }

  function startGame() {
    const midY = Math.floor(HEIGHT / 2);
    snake = [
      { x: 6, y: midY },
      { x: 5, y: midY },
      { x: 4, y: midY },
      { x: 3, y: midY }
    ];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    score = 0;
    paused = false;
    gameOver = false;
    bonus = null;
    if (window.OfficeStats) {
      bestScore = window.OfficeStats.getHighScore('snake');
    }
    buildObstacles();
    spawnFood();
    restartLoop();
    render();
  }

  function restartLoop() {
    if (loopInterval) clearInterval(loopInterval);
    loopInterval = setInterval(tick, speedMs);
  }

  function tick() {
    if (paused || gameOver || window.BossKey.isActive()) return;

    dir = { ...nextDir };
    let nx = snake[0].x + dir.x;
    let ny = snake[0].y + dir.y;

    if (wrapWalls) {
      nx = (nx + WIDTH) % WIDTH;
      ny = (ny + HEIGHT) % HEIGHT;
    } else {
      if (nx < 0 || nx >= WIDTH || ny < 0 || ny >= HEIGHT) {
        triggerGameOver();
        return;
      }
    }

    if (obstacles.some(o => o.x === nx && o.y === ny) || snake.some(s => s.x === nx && s.y === ny)) {
      triggerGameOver();
      return;
    }

    snake.unshift({ x: nx, y: ny });

    if (nx === food.x && ny === food.y) {
      score += 10;
      window.AsciiAudio.score();
      spawnFood();
    } else if (bonus && nx === bonus.x && ny === bonus.y) {
      score += 50;
      bonus = null;
      window.AsciiAudio.clearLine();
    } else {
      snake.pop();
    }

    if (bonus) {
      bonus.ttl--;
      if (bonus.ttl <= 0) bonus = null;
    }

    if (score > bestScore) {
      bestScore = score;
      if (window.OfficeStats) window.OfficeStats.recordGameWin('snake', score);
    }

    updateBoardDom();
  }

  function triggerGameOver() {
    gameOver = true;
    window.AsciiAudio.explosion();
    if (window.OfficeStats && score > 0) {
      window.OfficeStats.recordGameWin('snake', score);
    }
    updateBoardDom();
  }

  function buildBoardString() {
    const grid = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(' ·'));

    for (const o of obstacles) {
      grid[o.y][o.x] = '▒▒';
    }

    grid[food.y][food.x] = '<span class="ascii-warn">☕</span>';
    if (bonus) {
      grid[bonus.y][bonus.x] = '<span class="ascii-info">$$</span>';
    }

    for (let i = snake.length - 1; i >= 0; i--) {
      const s = snake[i];
      if (i === 0) {
        grid[s.y][s.x] = '<span class="ascii-bright">@@</span>';
      } else if (i === snake.length - 1) {
        grid[s.y][s.x] = '░░';
      } else {
        grid[s.y][s.x] = '██';
      }
    }

    const borderTop = '╔' + '══'.repeat(WIDTH) + '╗';
    const borderBot = '╚' + '══'.repeat(WIDTH) + '╝';
    const rows = grid.map(r => '║' + r.join('') + '║');

    let overlay = '';
    if (gameOver) {
      overlay = `\n<span class="ascii-danger">╔════════════════════════════════════════════════════╗
║ ¡CABLE DESCONECTADO! Chocaste en el servidor.      ║
║ Presiona [R] o [ESPACIO] para reconectar la red.   ║
╚════════════════════════════════════════════════════╝</span>`;
    } else if (paused) {
      overlay = `\n<span class="ascii-warn">╔════════════════════════════════════════════════════╗
║ PAUSA PARA EL CAFÉ - Presiona [P] para continuar   ║
╚════════════════════════════════════════════════════╝</span>`;
    }

    return [borderTop, ...rows, borderBot].join('\n') + overlay;
  }

  function updateBoardDom() {
    const boardEl = document.getElementById('snake-board');
    const scoreEl = document.getElementById('snake-score');
    const bestEl = document.getElementById('snake-best');
    const lenEl = document.getElementById('snake-len');
    if (boardEl) boardEl.innerHTML = buildBoardString();
    if (scoreEl) scoreEl.textContent = String(score).padStart(5, '0');
    if (bestEl) bestEl.textContent = String(bestScore).padStart(5, '0');
    if (lenEl) lenEl.textContent = String(snake.length);
  }

  function setDirection(dx, dy) {
    if (dx !== 0 && dir.x !== 0) return;
    if (dy !== 0 && dir.y !== 0) return;
    nextDir = { x: dx, y: dy };
  }

  function render() {
    if (!containerEl) return;

    containerEl.innerHTML = `
      <div class="game-shell">
        <pre class="ascii-art ascii-bright">
┌──────────────────────────────────────────────────────────────────────────────────┐
│  [03] SNAKE ETHERNET - "Cableando la Oficina a base de Café"                     │
└──────────────────────────────────────────────────────────────────────────────────┘</pre>

        <div class="bar-controls">
          <div class="bar-group">
            <button class="ascii-btn" id="snake-restart">[R] Reiniciar</button>
            <button class="ascii-btn ${paused ? 'active' : ''}" id="snake-pause">[P] Pausa</button>
            <button class="ascii-btn ${wrapWalls ? 'active' : ''}" id="snake-wrap">[B] Bordes: ${wrapWalls ? 'PORTAL' : 'MURO'}</button>
            <button class="ascii-btn ${cubicleMode ? 'active' : ''}" id="snake-cubicles">[C] Cubículos: ${cubicleMode ? 'SÍ' : 'NO'}</button>
          </div>
          <div class="bar-group">
            <button class="ascii-btn ${speedMs === 145 ? 'active' : ''}" data-spd="145">[Lento]</button>
            <button class="ascii-btn ${speedMs === 115 ? 'active' : ''}" data-spd="115">[Normal]</button>
            <button class="ascii-btn ${speedMs === 75 ? 'active' : ''}" data-spd="75">[Turbo Fibra]</button>
            <button class="ascii-btn danger-btn" id="snake-exit">[ESC] Menú</button>
          </div>
        </div>

        <div class="game-workspace">
          <div class="ascii-panel" id="snake-board">${buildBoardString()}</div>

          <div class="ascii-panel">
┌──────────────────────────────┐
│ TELEMETRÍA DE RED            │
├──────────────────────────────┤
│ Puntos : <span id="snake-score" class="ascii-warn">${String(score).padStart(5, '0')}</span>               │
│ Récord : <span id="snake-best" class="ascii-info">${String(bestScore).padStart(5, '0')}</span>               │
│ Metros : <span id="snake-len">${snake.length}</span>m de cable Cat6     │
├──────────────────────────────┤
│ LEYENDA DE OFICINA           │
│  @@ ██ ░░ = Cable Ethernet   │
│  ☕       = Café (+10 pts)   │
│  $$       = Bono (+50 pts)   │
│  ▒▒       = Muro de Cubículo │
├──────────────────────────────┤
│ PAD DIRECCIONAL              │
│         <button class="ascii-btn" id="sn-up">[ ▲ W ]</button>          │
│  <button class="ascii-btn" id="sn-left">[◄ A]</button>  <button class="ascii-btn" id="sn-down">[ ▼ S ]</button>  <button class="ascii-btn" id="sn-right">[D ►]</button>   │
└──────────────────────────────┘</div>
        </div>
      </div>
    `;

    document.getElementById('snake-restart')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      startGame();
    });
    document.getElementById('snake-pause')?.addEventListener('click', () => {
      paused = !paused;
      window.AsciiAudio.click();
      render();
    });
    document.getElementById('snake-wrap')?.addEventListener('click', () => {
      wrapWalls = !wrapWalls;
      window.AsciiAudio.click();
      render();
    });
    document.getElementById('snake-cubicles')?.addEventListener('click', () => {
      cubicleMode = !cubicleMode;
      window.AsciiAudio.click();
      startGame();
    });
    containerEl.querySelectorAll('[data-spd]').forEach(btn => {
      btn.addEventListener('click', () => {
        speedMs = parseInt(btn.getAttribute('data-spd'), 10);
        window.AsciiAudio.click();
        restartLoop();
        render();
      });
    });
    document.getElementById('snake-exit')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      if (exitCallback) exitCallback();
    });

    document.getElementById('sn-up')?.addEventListener('click', () => setDirection(0, -1));
    document.getElementById('sn-down')?.addEventListener('click', () => setDirection(0, 1));
    document.getElementById('sn-left')?.addEventListener('click', () => setDirection(-1, 0));
    document.getElementById('sn-right')?.addEventListener('click', () => setDirection(1, 0));
  }

  return {
    init(container, onExit) {
      containerEl = container;
      exitCallback = onExit;
      startGame();
    },
    destroy() {
      if (loopInterval) clearInterval(loopInterval);
      loopInterval = null;
      containerEl = null;
    },
    handleKey(e) {
      if (!containerEl) return;
      const k = e.key;
      if (k === 'ArrowUp' || k === 'w' || k === 'W') {
        e.preventDefault();
        setDirection(0, -1);
      } else if (k === 'ArrowDown' || k === 's' || k === 'S') {
        e.preventDefault();
        setDirection(0, 1);
      } else if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
        e.preventDefault();
        setDirection(-1, 0);
      } else if (k === 'ArrowRight' || k === 'd' || k === 'D') {
        e.preventDefault();
        setDirection(1, 0);
      } else if (k === 'p' || k === 'P') {
        e.preventDefault();
        paused = !paused;
        render();
      } else if (k === 'r' || k === 'R' || (gameOver && k === ' ')) {
        e.preventDefault();
        startGame();
      }
    }
  };
})();
