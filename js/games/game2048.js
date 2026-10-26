/* ==========================================================================
   ASCI ON THE OFFICE - Juego 5: 2048 (Fusión de Presupuestos Corporativos)
   ========================================================================== */

window.Game2048 = (function () {
  let containerEl = null;
  let exitCallback = null;

  let grid = [];
  let score = 0;
  let bestScore = 0;
  let history = [];
  let won2048 = false;
  let gameOver = false;

  const LABELS = {
    0: '          ',
    2: '   CAFE   ',
    4: '   MEMO   ',
    8: '  TICKET  ',
    16: ' INFORME  ',
    32: ' FACTURA  ',
    64: '  NOMINA  ',
    128: '   BONO   ',
    256: ' GERENCIA ',
    512: 'DIRECCION ',
    1024: ' HOLDING  ',
    2048: '¡JUBILADO!',
    4096: 'MAGNATE ++'
  };

  function startNewGame() {
    grid = Array.from({ length: 4 }, () => Array(4).fill(0));
    score = 0;
    history = [];
    won2048 = false;
    gameOver = false;
    if (window.OfficeStats) {
      bestScore = window.OfficeStats.getHighScore('2048');
    }
    spawnTile();
    spawnTile();
    render();
  }

  function spawnTile() {
    const empties = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (grid[r][c] === 0) empties.push([r, c]);
      }
    }
    if (empties.length === 0) return;
    const [r, c] = empties[Math.floor(Math.random() * empties.length)];
    grid[r][c] = Math.random() < 0.9 ? 2 : 4;
  }

  function slideAndMergeLine(line) {
    const nonZero = line.filter(v => v !== 0);
    const merged = [];
    let gained = 0;
    let i = 0;
    while (i < nonZero.length) {
      if (i + 1 < nonZero.length && nonZero[i] === nonZero[i + 1]) {
        const val = nonZero[i] * 2;
        merged.push(val);
        gained += val;
        if (val === 2048) won2048 = true;
        i += 2;
      } else {
        merged.push(nonZero[i]);
        i += 1;
      }
    }
    while (merged.length < 4) merged.push(0);
    return { line: merged, gained };
  }

  function move(dir) {
    if (gameOver) return;
    const prevGrid = grid.map(r => r.slice());
    const prevScore = score;
    let totalGained = 0;

    if (dir === 'left' || dir === 'right') {
      for (let r = 0; r < 4; r++) {
        let row = grid[r].slice();
        if (dir === 'right') row.reverse();
        const res = slideAndMergeLine(row);
        if (dir === 'right') res.line.reverse();
        grid[r] = res.line;
        totalGained += res.gained;
      }
    } else {
      for (let c = 0; c < 4; c++) {
        let col = [grid[0][c], grid[1][c], grid[2][c], grid[3][c]];
        if (dir === 'down') col.reverse();
        const res = slideAndMergeLine(col);
        if (dir === 'down') res.line.reverse();
        for (let r = 0; r < 4; r++) grid[r][c] = res.line[r];
        totalGained += res.gained;
      }
    }

    let changed = false;
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (grid[r][c] !== prevGrid[r][c]) changed = true;
      }
    }

    if (!changed) return;

    history.push({ grid: prevGrid, score: prevScore });
    if (history.length > 20) history.shift();

    score += totalGained;
    if (score > bestScore) {
      bestScore = score;
      if (window.OfficeStats) window.OfficeStats.recordGameWin('2048', score);
    }

    spawnTile();
    if (totalGained >= 128) window.AsciiAudio.clearLine();
    else if (totalGained > 0) window.AsciiAudio.score();
    else window.AsciiAudio.move();

    if (!canMove()) {
      gameOver = true;
      window.AsciiAudio.error();
      if (window.OfficeStats && score > 0) {
        window.OfficeStats.recordGameWin('2048', score);
      }
    }
    render();
  }

  function canMove() {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (grid[r][c] === 0) return true;
        if (c < 3 && grid[r][c] === grid[r][c + 1]) return true;
        if (r < 3 && grid[r][c] === grid[r + 1][c]) return true;
      }
    }
    return false;
  }

  function undo() {
    if (history.length === 0) return;
    const prev = history.pop();
    grid = prev.grid;
    score = prev.score;
    gameOver = false;
    window.AsciiAudio.move();
    render();
  }

  function formatTileLines(val) {
    if (val === 0) {
      return [
        '┌──────────┐',
        '│          │',
        '│    ··    │',
        '│          │',
        '└──────────┘'
      ];
    }
    const numStr = String(val).padStart(6, ' ').padEnd(10, ' ');
    const label = LABELS[val] || ' IMPERIO  ';
    let cls = 'ascii-bright';
    if (val >= 512) cls = 'ascii-warn';
    else if (val >= 64) cls = 'ascii-info';

    return [
      `╔══════════╗`,
      `║<span class="${cls}">${numStr}</span>║`,
      `║──────────║`,
      `║<span class="${cls}">${label}</span>║`,
      `╚══════════╝`
    ];
  }

  function buildBoardHtml() {
    const out = [];
    out.push('╔══════════════════════════════════════════════════════╗');
    for (let r = 0; r < 4; r++) {
      const rowTiles = [0, 1, 2, 3].map(c => formatTileLines(grid[r][c]));
      for (let lineIdx = 0; lineIdx < 5; lineIdx++) {
        out.push('║ ' + rowTiles.map(t => t[lineIdx]).join(' ') + ' ║');
      }
    }
    out.push('╚══════════════════════════════════════════════════════╝');
    return out.join('\n');
  }

  function render() {
    if (!containerEl) return;

    let banner = '';
    if (gameOver) {
      banner = `\n<span class="ascii-danger">╔══════════════════════════════════════════════════════╗
║ ¡SIN LIQUIDEZ! No quedan fusiones posibles. [Z] Undo ║
╚══════════════════════════════════════════════════════╝</span>`;
    } else if (won2048) {
      banner = `\n<span class="ascii-warn">╔══════════════════════════════════════════════════════╗
║ ¡META 2048 ALCANZADA! Ya puedes jubilarte o seguir.  ║
╚══════════════════════════════════════════════════════╝</span>`;
    }

    containerEl.innerHTML = `
      <div class="game-shell">
        <pre class="ascii-art ascii-bright">
┌──────────────────────────────────────────────────────────────────────────────────┐
│  [05] 2048 EJECUTIVO - "Fusionando Presupuestos hasta la Jubilación"             │
└──────────────────────────────────────────────────────────────────────────────────┘</pre>

        <div class="bar-controls">
          <div class="bar-group">
            <button class="ascii-btn" id="g2048-new">[R] Nueva Fusión</button>
            <button class="ascii-btn" id="g2048-undo">[Z] Deshacer (${history.length})</button>
          </div>
          <div class="bar-group">
            <button class="ascii-btn" data-dir="up">[▲ Arriba]</button>
            <button class="ascii-btn" data-dir="left">[◄ Izq]</button>
            <button class="ascii-btn" data-dir="down">[▼ Abajo]</button>
            <button class="ascii-btn" data-dir="right">[Der ►]</button>
            <button class="ascii-btn danger-btn" id="g2048-exit">[ESC] Menú</button>
          </div>
        </div>

        <div class="game-workspace">
          <div class="ascii-panel">${buildBoardHtml()}${banner}</div>

          <div class="ascii-panel">
┌──────────────────────────────┐
│ BALANCE DE FUSIÓN            │
├──────────────────────────────┤
│ Capital : <span class="ascii-warn">$ ${String(score).padStart(9, ' ')}</span>        │
│ Récord  : <span class="ascii-info">$ ${String(bestScore).padStart(9, ' ')}</span>        │
├──────────────────────────────┤
│ ESCALAFÓN CORPORATIVO        │
│    2 = Café     128 = Bono   │
│    4 = Memo     256 = Gerente│
│    8 = Ticket   512 = Direc. │
│   16 = Informe 1024 = Holding│
│   32 = Factura 2048 = JUBIL. │
│   64 = Nómina                │
├──────────────────────────────┤
│ CONTROLES                    │
│ • Flechas / WASD : Deslizar  │
│ • Z              : Deshacer  │
│ • R              : Reiniciar │
└──────────────────────────────┘</div>
        </div>
      </div>
    `;

    document.getElementById('g2048-new')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      startNewGame();
    });
    document.getElementById('g2048-undo')?.addEventListener('click', () => undo());
    document.getElementById('g2048-exit')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      if (exitCallback) exitCallback();
    });
    containerEl.querySelectorAll('[data-dir]').forEach(btn => {
      btn.addEventListener('click', () => move(btn.getAttribute('data-dir')));
    });
  }

  return {
    init(container, onExit) {
      containerEl = container;
      exitCallback = onExit;
      startNewGame();
    },
    destroy() {
      containerEl = null;
    },
    handleKey(e) {
      if (!containerEl) return;
      const k = e.key;
      if (k === 'ArrowUp' || k === 'w' || k === 'W') {
        e.preventDefault();
        move('up');
      } else if (k === 'ArrowDown' || k === 's' || k === 'S') {
        e.preventDefault();
        move('down');
      } else if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
        e.preventDefault();
        move('left');
      } else if (k === 'ArrowRight' || k === 'd' || k === 'D') {
        e.preventDefault();
        move('right');
      } else if (k === 'z' || k === 'Z') {
        e.preventDefault();
        undo();
      } else if (k === 'r' || k === 'R') {
        e.preventDefault();
        startNewGame();
      }
    }
  };
})();
