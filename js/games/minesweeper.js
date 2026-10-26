/* ==========================================================================
   ASCI ON THE OFFICE - Juego 2: BUSCAMINAS (Auditoría de Riesgos Laborales)
   ========================================================================== */

window.GameMinesweeper = (function () {
  let containerEl = null;
  let exitCallback = null;
  let timerInterval = null;

  const DIFFS = {
    easy: { name: 'BECARIO (9x9 - 10 minas)', rows: 9, cols: 9, mines: 10 },
    medium: { name: 'JEFE DE ÁREA (16x16 - 40 minas)', rows: 16, cols: 16, mines: 40 },
    hard: { name: 'DIRECTOR (22x14 - 55 minas)', rows: 14, cols: 22, mines: 55 }
  };

  let currentDiff = 'easy';
  let rows = 9;
  let cols = 9;
  let totalMines = 10;

  let grid = []; // { mine, revealed, flagged, count, boom }
  let firstMove = true;
  let gameOver = false;
  let won = false;
  let flagsPlaced = 0;
  let seconds = 0;
  let curR = 0;
  let curC = 0;
  let flagMode = false;

  function initBoard(diffKey) {
    currentDiff = diffKey || currentDiff;
    const cfg = DIFFS[currentDiff];
    rows = cfg.rows;
    cols = cfg.cols;
    totalMines = cfg.mines;

    grid = Array.from({ length: rows }, () =>
      Array.from({ length: cols }, () => ({
        mine: false,
        revealed: false,
        flagged: false,
        count: 0,
        boom: false
      }))
    );

    firstMove = true;
    gameOver = false;
    won = false;
    flagsPlaced = 0;
    seconds = 0;
    curR = Math.floor(rows / 2);
    curC = Math.floor(cols / 2);

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!firstMove && !gameOver && !won && !window.BossKey.isActive()) {
        seconds++;
        const el = document.getElementById('mines-timer');
        if (el) el.textContent = String(Math.min(999, seconds)).padStart(3, '0');
      }
    }, 1000);

    render();
  }

  function neighbors(r, c) {
    const res = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
          res.push([nr, nc]);
        }
      }
    }
    return res;
  }

  function placeMines(safeR, safeC) {
    const candidates = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (Math.abs(r - safeR) <= 1 && Math.abs(c - safeC) <= 1) continue;
        candidates.push([r, c]);
      }
    }
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    for (let i = 0; i < totalMines && i < candidates.length; i++) {
      const [mr, mc] = candidates[i];
      grid[mr][mc].mine = true;
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c].mine) continue;
        let count = 0;
        for (const [nr, nc] of neighbors(r, c)) {
          if (grid[nr][nc].mine) count++;
        }
        grid[r][c].count = count;
      }
    }
  }

  function floodReveal(startR, startC) {
    const queue = [[startR, startC]];
    while (queue.length > 0) {
      const [r, c] = queue.shift();
      const cell = grid[r][c];
      if (cell.revealed || cell.flagged) continue;
      cell.revealed = true;
      if (cell.count === 0 && !cell.mine) {
        for (const [nr, nc] of neighbors(r, c)) {
          if (!grid[nr][nc].revealed && !grid[nr][nc].flagged) {
            queue.push([nr, nc]);
          }
        }
      }
    }
  }

  function checkWin() {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cell = grid[r][c];
        if (!cell.mine && !cell.revealed) return false;
      }
    }
    return true;
  }

  function triggerWin() {
    won = true;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c].mine && !grid[r][c].flagged) {
          grid[r][c].flagged = true;
        }
      }
    }
    flagsPlaced = totalMines;
    window.AsciiAudio.win();
    if (window.OfficeStats) {
      const base = currentDiff === 'hard' ? 1800 : currentDiff === 'medium' ? 1000 : 500;
      window.OfficeStats.recordGameWin('minesweeper', Math.max(100, base - seconds * 3));
    }
  }

  function revealCell(r, c) {
    if (gameOver || won) return;
    const cell = grid[r][c];
    if (cell.flagged) return;

    if (firstMove) {
      firstMove = false;
      placeMines(r, c);
    }

    // Si ya está revelada y tiene número > 0, permitir Chord (revelar vecinas si banderas coinciden)
    if (cell.revealed && cell.count > 0) {
      const nbs = neighbors(r, c);
      const flagsAround = nbs.filter(([nr, nc]) => grid[nr][nc].flagged).length;
      if (flagsAround === cell.count) {
        let hitMine = false;
        for (const [nr, nc] of nbs) {
          if (!grid[nr][nc].flagged && !grid[nr][nc].revealed) {
            if (grid[nr][nc].mine) {
              grid[nr][nc].revealed = true;
              grid[nr][nc].boom = true;
              hitMine = true;
            } else {
              floodReveal(nr, nc);
            }
          }
        }
        if (hitMine) {
          gameOver = true;
          revealAllMines();
          window.AsciiAudio.explosion();
        } else {
          window.AsciiAudio.click();
          if (checkWin()) triggerWin();
        }
        render();
      }
      return;
    }

    if (cell.revealed) return;

    if (cell.mine) {
      cell.revealed = true;
      cell.boom = true;
      gameOver = true;
      revealAllMines();
      window.AsciiAudio.explosion();
      render();
      return;
    }

    floodReveal(r, c);
    window.AsciiAudio.click();
    if (checkWin()) {
      triggerWin();
    }
    render();
  }

  function revealAllMines() {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c].mine) grid[r][c].revealed = true;
      }
    }
  }

  function toggleFlag(r, c) {
    if (gameOver || won) return;
    const cell = grid[r][c];
    if (cell.revealed) return;
    cell.flagged = !cell.flagged;
    flagsPlaced += cell.flagged ? 1 : -1;
    window.AsciiAudio.move();
    render();
  }

  function buildBoardHtml() {
    const lines = [];
    const topBorder = '  ╔' + '═══╤'.repeat(cols - 1) + '═══╗';
    const midBorder = '  ╟' + '───┼'.repeat(cols - 1) + '───╢';
    const botBorder = '  ╚' + '═══╧'.repeat(cols - 1) + '═══╝';

    lines.push(topBorder);
    for (let r = 0; r < rows; r++) {
      let rowStr = String(r + 1).padStart(2, ' ') + '║';
      for (let c = 0; c < cols; c++) {
        const cell = grid[r][c];
        const isCur = r === curR && c === curC;
        let cls = 'ascii-cell';
        if (isCur) cls += ' selected';

        let txt = '░░░';
        if (cell.flagged && !gameOver) {
          txt = ' ⚑ ';
          if (!isCur) cls += ' mine-flag';
        } else if (cell.flagged && gameOver && !cell.mine) {
          txt = ' X ';
          if (!isCur) cls += ' error-cell';
        } else if (cell.revealed) {
          if (cell.mine) {
            txt = cell.boom ? '[*]' : ' * ';
            if (!isCur) cls += cell.boom ? ' mine-boom' : ' error-cell';
          } else if (cell.count === 0) {
            txt = '   ';
          } else {
            txt = ` ${cell.count} `;
            if (!isCur) cls += ` mine-${cell.count}`;
          }
        }

        rowStr += `<span class="${cls}" data-r="${r}" data-c="${c}">${txt}</span>`;
        rowStr += c < cols - 1 ? '│' : '║';
      }
      lines.push(rowStr);
      if (r < rows - 1) lines.push(midBorder);
    }
    lines.push(botBorder);
    return lines.join('\n');
  }

  function render() {
    if (!containerEl) return;
    const face = won ? '[ B-) ¡ASCENSO! ]' : gameOver ? '[ X_X DESPEDIDO ]' : '[ ^_^ AUDITANDO ]';
    const minesLeft = String(Math.max(-99, totalMines - flagsPlaced)).padStart(3, '0');
    const timeStr = String(Math.min(999, seconds)).padStart(3, '0');

    let statusMsg = '';
    if (won) {
      statusMsg = `\n<span class="ascii-warn">╔════════════════════════════════════════════════════════╗
║ ¡AUDITORÍA IMPECABLE! Todas las minas neutralizadas.  ║
╚════════════════════════════════════════════════════════╝</span>`;
    } else if (gameOver) {
      statusMsg = `\n<span class="ascii-danger">╔════════════════════════════════════════════════════════╗
║ ¡BOOM! Pisaste un recorte presupuestario explosivo.    ║
╚════════════════════════════════════════════════════════╝</span>`;
    }

    containerEl.innerHTML = `
      <div class="game-shell">
        <pre class="ascii-art ascii-bright">
┌──────────────────────────────────────────────────────────────────────────────────┐
│  [02] BUSCAMINAS DE OFICINA - "esquivando Marrones y Recortes"                   │
└──────────────────────────────────────────────────────────────────────────────────┘</pre>

        <div class="bar-controls">
          <div class="bar-group">
            <button class="ascii-btn ${currentDiff === 'easy' ? 'active' : ''}" data-diff="easy">[9x9 Becario]</button>
            <button class="ascii-btn ${currentDiff === 'medium' ? 'active' : ''}" data-diff="medium">[16x16 Jefe]</button>
            <button class="ascii-btn ${currentDiff === 'hard' ? 'active' : ''}" data-diff="hard">[22x14 Director]</button>
          </div>
          <div class="bar-group">
            <button class="ascii-btn" id="mines-reset">${face}</button>
            <button class="ascii-btn ${flagMode ? 'active' : ''}" id="mines-flagmode">[M] Modo Clic: ${flagMode ? '⚑ BANDERA' : '⛏ CAVAR'}</button>
            <button class="ascii-btn danger-btn" id="mines-exit">[ESC] Menú</button>
          </div>
        </div>

        <div class="game-workspace">
          <div class="ascii-panel">
╔══════════════════════════════════════════════════════╗
║ MINAS: <span class="ascii-warn">${minesLeft}</span>   │   ESTADO: ${face}   │  TIEMPO: <span id="mines-timer" class="ascii-info">${timeStr}</span> ║
╚══════════════════════════════════════════════════════╝
${buildBoardHtml()}${statusMsg}
          </div>

          <div class="ascii-panel">
┌──────────────────────────────┐
│ MANUAL DEL AUDITOR           │
├──────────────────────────────┤
│ • Clic Izq / ESPACIO : Cavar │
│ • Clic Der / F : Bandera (⚑) │
│ • Flechas / WASD : Cursor    │
│ • Clic en Número revelado:   │
│   Despeja alrededor si las   │
│   banderas ya coinciden.     │
│ • R : Reiniciar partida      │
├──────────────────────────────┤
│ LEYENDA ASCII                │
│   ░░░  = Cubículo sin abrir  │
│    ⚑   = Riesgo marcado      │
│   [*]  = Explosión laboral   │
│   1-8  = Minas adyacentes    │
└──────────────────────────────┘</div>
        </div>
      </div>
    `;

    containerEl.querySelectorAll('.ascii-cell').forEach(cell => {
      const r = parseInt(cell.getAttribute('data-r'), 10);
      const c = parseInt(cell.getAttribute('data-c'), 10);

      cell.addEventListener('click', (e) => {
        e.preventDefault();
        curR = r;
        curC = c;
        if (flagMode && !grid[r][c].revealed) {
          toggleFlag(r, c);
        } else {
          revealCell(r, c);
        }
      });

      cell.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        curR = r;
        curC = c;
        toggleFlag(r, c);
      });
    });

    containerEl.querySelectorAll('[data-diff]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.AsciiAudio.click();
        initBoard(btn.getAttribute('data-diff'));
      });
    });

    document.getElementById('mines-reset')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      initBoard(currentDiff);
    });

    document.getElementById('mines-flagmode')?.addEventListener('click', () => {
      flagMode = !flagMode;
      window.AsciiAudio.click();
      render();
    });

    document.getElementById('mines-exit')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      if (exitCallback) exitCallback();
    });
  }

  return {
    init(container, onExit) {
      containerEl = container;
      exitCallback = onExit;
      initBoard('easy');
    },
    destroy() {
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = null;
      containerEl = null;
    },
    handleKey(e) {
      if (!containerEl) return;
      const k = e.key;
      if (k === 'ArrowUp' || k === 'w' || k === 'W') {
        e.preventDefault();
        curR = (curR + rows - 1) % rows;
        render();
      } else if (k === 'ArrowDown' || k === 's' || k === 'S') {
        e.preventDefault();
        curR = (curR + 1) % rows;
        render();
      } else if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
        e.preventDefault();
        curC = (curC + cols - 1) % cols;
        render();
      } else if (k === 'ArrowRight' || k === 'd' || k === 'D') {
        e.preventDefault();
        curC = (curC + 1) % cols;
        render();
      } else if (k === ' ' || k === 'Enter') {
        e.preventDefault();
        revealCell(curR, curC);
      } else if (k === 'f' || k === 'F') {
        e.preventDefault();
        toggleFlag(curR, curC);
      } else if (k === 'm' || k === 'M') {
        e.preventDefault();
        flagMode = !flagMode;
        render();
      } else if (k === 'r' || k === 'R') {
        e.preventDefault();
        initBoard(currentDiff);
      }
    }
  };
})();
