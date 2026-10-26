/* ==========================================================================
   ASCI ON THE OFFICE - Juego 1: ZUDOKU (Sudoku Corporativo 9x9 en ASCII)
   ========================================================================== */

window.GameSudoku = (function () {
  let containerEl = null;
  let exitCallback = null;
  let timerInterval = null;

  let difficulty = 'easy'; // easy (32), medium (44), hard (53)
  let solution = [];
  let board = [];
  let fixed = [];
  let notes = []; // 9x9 array of Sets
  let history = [];

  let selR = 0;
  let selC = 0;
  let noteMode = false;
  let mistakes = 0;
  let hintsUsed = 0;
  let seconds = 0;
  let won = false;

  const DIFF_CONFIG = {
    easy: { name: 'BECARIO (Fácil)', blanks: 32 },
    medium: { name: 'ANALISTA (Medio)', blanks: 44 },
    hard: { name: 'AUDITOR (Difícil)', blanks: 53 }
  };

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function isValidPlacement(grid, r, c, val) {
    for (let i = 0; i < 9; i++) {
      if (grid[r][i] === val || grid[i][c] === val) return false;
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        if (grid[br + dr][bc + dc] === val) return false;
      }
    }
    return true;
  }

  function fillGrid(grid) {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] === 0) {
          const nums = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
          for (const n of nums) {
            if (isValidPlacement(grid, r, c, n)) {
              grid[r][c] = n;
              if (fillGrid(grid)) return true;
              grid[r][c] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  function generatePuzzle(diffKey) {
    difficulty = diffKey || difficulty;
    const grid = Array.from({ length: 9 }, () => Array(9).fill(0));
    fillGrid(grid);
    solution = grid.map(row => row.slice());
    board = grid.map(row => row.slice());
    fixed = Array.from({ length: 9 }, () => Array(9).fill(true));
    notes = Array.from({ length: 9 }, () => Array.from({ length: 9 }, () => new Set()));
    history = [];

    const positions = shuffle(Array.from({ length: 81 }, (_, i) => [Math.floor(i / 9), i % 9]));
    const blanks = DIFF_CONFIG[difficulty].blanks;
    for (let i = 0; i < blanks; i++) {
      const [r, c] = positions[i];
      board[r][c] = 0;
      fixed[r][c] = false;
    }

    selR = 4;
    selC = 4;
    mistakes = 0;
    hintsUsed = 0;
    seconds = 0;
    won = false;

    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      if (!won && !window.BossKey.isActive()) {
        seconds++;
        const timeEl = document.getElementById('sudoku-timer');
        if (timeEl) timeEl.textContent = formatTime(seconds);
      }
    }, 1000);

    render();
  }

  function formatTime(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function hasConflict(r, c) {
    const val = board[r][c];
    if (!val) return false;
    for (let i = 0; i < 9; i++) {
      if (i !== c && board[r][i] === val) return true;
      if (i !== r && board[i][c] === val) return true;
    }
    const br = Math.floor(r / 3) * 3;
    const bc = Math.floor(c / 3) * 3;
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) {
        const nr = br + dr;
        const nc = bc + dc;
        if ((nr !== r || nc !== c) && board[nr][nc] === val) return true;
      }
    }
    return false;
  }

  function checkVictory() {
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] !== solution[r][c]) return false;
      }
    }
    return true;
  }

  function inputNumber(num) {
    if (won || fixed[selR][selC]) return;

    if (num === 0) {
      if (board[selR][selC] !== 0 || notes[selR][selC].size > 0) {
        history.push({
          r: selR,
          c: selC,
          prevVal: board[selR][selC],
          prevNotes: new Set(notes[selR][selC])
        });
        board[selR][selC] = 0;
        notes[selR][selC].clear();
        window.AsciiAudio.click();
        render();
      }
      return;
    }

    if (noteMode) {
      if (board[selR][selC] !== 0) return;
      if (notes[selR][selC].has(num)) notes[selR][selC].delete(num);
      else notes[selR][selC].add(num);
      window.AsciiAudio.click();
      render();
      return;
    }

    if (board[selR][selC] === num) return;

    history.push({
      r: selR,
      c: selC,
      prevVal: board[selR][selC],
      prevNotes: new Set(notes[selR][selC])
    });

    board[selR][selC] = num;
    notes[selR][selC].clear();

    if (num !== solution[selR][selC] || hasConflict(selR, selC)) {
      mistakes++;
      window.AsciiAudio.error();
    } else {
      window.AsciiAudio.click();
      // Limpiar esa nota en la misma fila, columna y bloque
      for (let i = 0; i < 9; i++) {
        notes[selR][i].delete(num);
        notes[i][selC].delete(num);
      }
      const br = Math.floor(selR / 3) * 3;
      const bc = Math.floor(selC / 3) * 3;
      for (let dr = 0; dr < 3; dr++) {
        for (let dc = 0; dc < 3; dc++) {
          notes[br + dr][bc + dc].delete(num);
        }
      }
    }

    if (checkVictory()) {
      won = true;
      window.AsciiAudio.win();
      if (window.OfficeStats) {
        window.OfficeStats.recordGameWin('sudoku', Math.max(100, 1500 - seconds * 2 - mistakes * 50));
      }
    }
    render();
  }

  function giveHint() {
    if (won) return;
    let targetR = selR;
    let targetC = selC;
    if (fixed[targetR][targetC] || board[targetR][targetC] === solution[targetR][targetC]) {
      const empties = [];
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (board[r][c] !== solution[r][c]) empties.push([r, c]);
        }
      }
      if (empties.length === 0) return;
      [targetR, targetC] = empties[Math.floor(Math.random() * empties.length)];
    }
    selR = targetR;
    selC = targetC;
    board[targetR][targetC] = solution[targetR][targetC];
    fixed[targetR][targetC] = true;
    notes[targetR][targetC].clear();
    hintsUsed++;
    window.AsciiAudio.score();
    if (checkVictory()) {
      won = true;
      window.AsciiAudio.win();
      if (window.OfficeStats) {
        window.OfficeStats.recordGameWin('sudoku', Math.max(100, 1200 - seconds * 2));
      }
    }
    render();
  }

  function undoMove() {
    if (won || history.length === 0) return;
    const last = history.pop();
    board[last.r][last.c] = last.prevVal;
    notes[last.r][last.c] = last.prevNotes;
    selR = last.r;
    selC = last.c;
    window.AsciiAudio.move();
    render();
  }

  function buildBoardHtml() {
    const selectedVal = board[selR][selC];
    const lines = [];

    lines.push('    C1  C2  C3   C4  C5  C6   C7  C8  C9');
    lines.push('  ╔═══╤═══╤═══╦═══╤═══╤═══╦═══╤═══╤═══╗');

    for (let r = 0; r < 9; r++) {
      let rowStr = `F${r + 1}║`;
      for (let c = 0; c < 9; c++) {
        const val = board[r][c];
        const isSel = r === selR && c === selC;
        const isSame = selectedVal !== 0 && val === selectedVal && !isSel;
        const isErr = val !== 0 && (val !== solution[r][c] || hasConflict(r, c));

        let cls = 'ascii-cell';
        if (isSel) cls += ' selected';
        else if (isSame) cls += ' same-num';
        if (isErr) cls += ' error-cell';
        else if (fixed[r][c]) cls += ' fixed-cell';
        else if (val !== 0) cls += ' user-cell';

        let text = ' · ';
        if (val !== 0) {
          text = ` ${val} `;
        } else if (notes[r][c].size > 0) {
          text = `*${notes[r][c].size}*`;
        }

        rowStr += `<span class="${cls}" data-r="${r}" data-c="${c}">${text}</span>`;
        if (c === 2 || c === 5) rowStr += '║';
        else if (c < 8) rowStr += '│';
      }
      rowStr += '║';
      lines.push(rowStr);

      if (r === 2 || r === 5) {
        lines.push('  ╠═══╪═══╪═══╬═══╪═══╪═══╬═══╪═══╪═══╣');
      } else if (r < 8) {
        lines.push('  ╟───┼───┼───╫───┼───┼───╫───┼───┼───╢');
      }
    }

    lines.push('  ╚═══╧═══╧═══╩═══╧═══╧═══╩═══╧═══╧═══╝');
    return lines.join('\n');
  }

  function render() {
    if (!containerEl) return;

    const currentNotes = Array.from(notes[selR][selC]).sort().join(', ') || 'Ninguna';
    const remainingCounts = Array(10).fill(9);
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (board[r][c] >= 1 && board[r][c] <= 9 && board[r][c] === solution[r][c]) {
          remainingCounts[board[r][c]]--;
        }
      }
    }

    let numButtonsHtml = '';
    for (let n = 1; n <= 9; n++) {
      const rem = Math.max(0, remainingCounts[n]);
      numButtonsHtml += `<button class="ascii-btn" data-num="${n}">[ ${n} (${rem}) ]</button>`;
      if (n % 3 === 0) numButtonsHtml += '\n';
    }

    const winBanner = won
      ? `\n<span class="ascii-warn">╔══════════════════════════════════════════╗
║   ¡AUDITORÍA CONTABLE COMPLETADA!        ║
║   Tiempo: ${formatTime(seconds).padEnd(8)}  Errores: ${String(mistakes).padEnd(8)}   ║
╚══════════════════════════════════════════╝</span>\n`
      : '';

    containerEl.innerHTML = `
      <div class="game-shell">
        <pre class="ascii-art ascii-bright">
┌──────────────────────────────────────────────────────────────────────────────────┐
│  [01] ZUDOKU CORPORATIVO - "Cuadrando el Balance Trimestral 9x9"                 │
└──────────────────────────────────────────────────────────────────────────────────┘</pre>

        <div class="bar-controls">
          <div class="bar-group">
            <button class="ascii-btn ${difficulty === 'easy' ? 'active' : ''}" data-diff="easy">[Fácil]</button>
            <button class="ascii-btn ${difficulty === 'medium' ? 'active' : ''}" data-diff="medium">[Medio]</button>
            <button class="ascii-btn ${difficulty === 'hard' ? 'active' : ''}" data-diff="hard">[Difícil]</button>
            <button class="ascii-btn" id="sudoku-new">[Nuevo Balance]</button>
          </div>
          <div class="bar-group">
            <button class="ascii-btn ${noteMode ? 'active' : ''}" id="sudoku-note">[N] Lápiz: ${noteMode ? 'SÍ' : 'NO'}</button>
            <button class="ascii-btn" id="sudoku-hint">[H] Pista (${hintsUsed})</button>
            <button class="ascii-btn" id="sudoku-undo">[Z] Deshacer</button>
            <button class="ascii-btn danger-btn" id="sudoku-exit">[ESC] Menú</button>
          </div>
        </div>

        <div class="game-workspace">
          <div class="ascii-panel" id="sudoku-grid-wrap">${buildBoardHtml()}${winBanner}</div>

          <div class="ascii-panel">
┌──────────────────────────────┐
│ ESTADO DEL EXPEDIENTE        │
├──────────────────────────────┤
│ Nivel  : ${DIFF_CONFIG[difficulty].name.padEnd(19)} │
│ Tiempo : <span id="sudoku-timer">${formatTime(seconds)}</span>              │
│ Errores: ${String(mistakes).padEnd(19)} │
│ Celda  : F${selR + 1}:C${selC + 1} (${fixed[selR][selC] ? 'FIJA' : 'EDITABLE'})     │
│ Notas  : ${currentNotes.padEnd(19)} │
├──────────────────────────────┤
│ TECLADO NUMÉRICO (Restantes) │
├──────────────────────────────┤
${numButtonsHtml}
<button class="ascii-btn" data-num="0">[ 0 / BORRAR CELDA ]</button>
├──────────────────────────────┤
│ CONTROLES DE OFICINA         │
│ • Flechas / WASD : Mover     │
│ • 1-9            : Anotar    │
│ • N              : Modo Lápiz│
│ • H              : Pista     │
│ • Z              : Deshacer  │
│ • Del / 0        : Borrar    │
└──────────────────────────────┘</div>
        </div>
      </div>
    `;

    // Eventos de celda
    containerEl.querySelectorAll('.ascii-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        selR = parseInt(cell.getAttribute('data-r'), 10);
        selC = parseInt(cell.getAttribute('data-c'), 10);
        window.AsciiAudio.move();
        render();
      });
    });

    // Eventos de teclado numérico en pantalla
    containerEl.querySelectorAll('[data-num]').forEach(btn => {
      btn.addEventListener('click', () => {
        inputNumber(parseInt(btn.getAttribute('data-num'), 10));
      });
    });

    // Dificultades
    containerEl.querySelectorAll('[data-diff]').forEach(btn => {
      btn.addEventListener('click', () => {
        window.AsciiAudio.click();
        generatePuzzle(btn.getAttribute('data-diff'));
      });
    });

    document.getElementById('sudoku-new')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      generatePuzzle(difficulty);
    });
    document.getElementById('sudoku-note')?.addEventListener('click', () => {
      noteMode = !noteMode;
      window.AsciiAudio.click();
      render();
    });
    document.getElementById('sudoku-hint')?.addEventListener('click', () => giveHint());
    document.getElementById('sudoku-undo')?.addEventListener('click', () => undoMove());
    document.getElementById('sudoku-exit')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      if (exitCallback) exitCallback();
    });
  }

  return {
    init(container, onExit) {
      containerEl = container;
      exitCallback = onExit;
      generatePuzzle('easy');
    },
    destroy() {
      if (timerInterval) clearInterval(timerInterval);
      timerInterval = null;
      containerEl = null;
    },
    handleKey(e) {
      if (!containerEl) return;
      const key = e.key;
      if (key === 'ArrowUp' || key === 'w' || key === 'W') {
        e.preventDefault();
        selR = (selR + 8) % 9;
        window.AsciiAudio.move();
        render();
      } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
        e.preventDefault();
        selR = (selR + 1) % 9;
        window.AsciiAudio.move();
        render();
      } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        e.preventDefault();
        selC = (selC + 8) % 9;
        window.AsciiAudio.move();
        render();
      } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        e.preventDefault();
        selC = (selC + 1) % 9;
        window.AsciiAudio.move();
        render();
      } else if (key >= '1' && key <= '9') {
        e.preventDefault();
        inputNumber(parseInt(key, 10));
      } else if (key === '0' || key === 'Backspace' || key === 'Delete') {
        e.preventDefault();
        inputNumber(0);
      } else if (key === 'n' || key === 'N') {
        e.preventDefault();
        noteMode = !noteMode;
        window.AsciiAudio.click();
        render();
      } else if (key === 'h' || key === 'H') {
        e.preventDefault();
        giveHint();
      } else if (key === 'z' || key === 'Z') {
        e.preventDefault();
        undoMove();
      }
    }
  };
})();
