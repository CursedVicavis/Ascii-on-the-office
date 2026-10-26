/* ==========================================================================
   ASCI ON THE OFFICE - Juego 7: SOLITARIO KLONDIKE (Paciencia de Windows 95)
   ========================================================================== */

window.GameSolitaire = (function () {
  let containerEl = null;
  let exitCallback = null;

  const SUITS = [
    { sym: '♠', color: 'black', name: 'Picas' },
    { sym: '♥', color: 'red', name: 'Corazones' },
    { sym: '♦', color: 'red', name: 'Diamantes' },
    { sym: '♣', color: 'black', name: 'Tréboles' }
  ];
  const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  let stock = [];
  let waste = [];
  let foundations = [[], [], [], []]; // 0:♠, 1:♥, 2:♦, 3:♣
  let tableau = [[], [], [], [], [], [], []];
  let selected = null; // { source: 'waste' | 'tab' | 'found', colIdx, cardIdx }
  let moves = 0;
  let score = 0;
  let won = false;
  let history = [];

  function createDeck() {
    const deck = [];
    for (let s = 0; s < 4; s++) {
      for (let r = 1; r <= 13; r++) {
        deck.push({
          suit: s,
          sym: SUITS[s].sym,
          color: SUITS[s].color,
          rank: r,
          rankStr: RANKS[r],
          faceUp: false
        });
      }
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function cloneState() {
    return JSON.stringify({
      stock,
      waste,
      foundations,
      tableau,
      moves,
      score
    });
  }

  function saveHistory() {
    history.push(cloneState());
    if (history.length > 25) history.shift();
  }

  function undo() {
    if (history.length === 0) return;
    const prev = JSON.parse(history.pop());
    stock = prev.stock;
    waste = prev.waste;
    foundations = prev.foundations;
    tableau = prev.tableau;
    moves = prev.moves;
    score = prev.score;
    selected = null;
    window.AsciiAudio.move();
    render();
  }

  function startNewGame() {
    const deck = createDeck();
    stock = [];
    waste = [];
    foundations = [[], [], [], []];
    tableau = [[], [], [], [], [], [], []];
    selected = null;
    moves = 0;
    score = 0;
    won = false;
    history = [];

    for (let col = 0; col < 7; col++) {
      for (let row = 0; row <= col; row++) {
        const card = deck.pop();
        card.faceUp = row === col;
        tableau[col].push(card);
      }
    }
    while (deck.length > 0) {
      const c = deck.pop();
      c.faceUp = false;
      stock.push(c);
    }
    render();
  }

  function drawStock() {
    if (won) return;
    saveHistory();
    selected = null;
    if (stock.length > 0) {
      const card = stock.pop();
      card.faceUp = true;
      waste.push(card);
      moves++;
      window.AsciiAudio.move();
    } else if (waste.length > 0) {
      while (waste.length > 0) {
        const c = waste.pop();
        c.faceUp = false;
        stock.push(c);
      }
      moves++;
      window.AsciiAudio.click();
    }
    render();
  }

  function canMoveToFoundation(card, fIdx) {
    if (card.suit !== fIdx) return false;
    const pile = foundations[fIdx];
    if (pile.length === 0) return card.rank === 1;
    return pile[pile.length - 1].rank === card.rank - 1;
  }

  function canMoveToTableau(card, destColIdx) {
    const col = tableau[destColIdx];
    if (col.length === 0) return card.rank === 13; // Solo Reyes en columna vacía
    const top = col[col.length - 1];
    if (!top.faceUp) return false;
    return top.color !== card.color && top.rank === card.rank + 1;
  }

  function flipTopIfNeeded(colIdx) {
    const col = tableau[colIdx];
    if (col.length > 0 && !col[col.length - 1].faceUp) {
      col[col.length - 1].faceUp = true;
      score += 5;
    }
  }

  function checkVictory() {
    if (foundations.every(f => f.length === 13)) {
      won = true;
      score += 500;
      window.AsciiAudio.win();
      if (window.OfficeStats) {
        window.OfficeStats.recordGameWin('solitaire', score);
      }
    }
  }

  function executeMove(src, destType, destIdx) {
    if (src.source === 'waste') {
      const card = waste[waste.length - 1];
      if (!card) return false;
      if (destType === 'found' && canMoveToFoundation(card, destIdx)) {
        saveHistory();
        waste.pop();
        foundations[destIdx].push(card);
        score += 15;
        moves++;
        window.AsciiAudio.score();
        checkVictory();
        return true;
      }
      if (destType === 'tab' && canMoveToTableau(card, destIdx)) {
        saveHistory();
        waste.pop();
        tableau[destIdx].push(card);
        score += 5;
        moves++;
        window.AsciiAudio.click();
        return true;
      }
    } else if (src.source === 'tab') {
      const col = tableau[src.colIdx];
      const movingCards = col.slice(src.cardIdx);
      if (movingCards.length === 0) return false;
      const leadCard = movingCards[0];

      if (destType === 'found' && movingCards.length === 1 && canMoveToFoundation(leadCard, destIdx)) {
        saveHistory();
        col.pop();
        foundations[destIdx].push(leadCard);
        flipTopIfNeeded(src.colIdx);
        score += 15;
        moves++;
        window.AsciiAudio.score();
        checkVictory();
        return true;
      }
      if (destType === 'tab' && src.colIdx !== destIdx && canMoveToTableau(leadCard, destIdx)) {
        saveHistory();
        tableau[src.colIdx] = col.slice(0, src.cardIdx);
        tableau[destIdx].push(...movingCards);
        flipTopIfNeeded(src.colIdx);
        score += 5;
        moves++;
        window.AsciiAudio.click();
        return true;
      }
    }
    return false;
  }

  // Intenta mover automáticamente una carta a su fundación o a una columna válida
  function smartAutoMove(src) {
    let leadCard = null;
    let isSingle = true;
    if (src.source === 'waste') {
      leadCard = waste[waste.length - 1];
    } else if (src.source === 'tab') {
      const col = tableau[src.colIdx];
      leadCard = col[src.cardIdx];
      isSingle = src.cardIdx === col.length - 1;
    }
    if (!leadCard) return false;

    if (isSingle && canMoveToFoundation(leadCard, leadCard.suit)) {
      return executeMove(src, 'found', leadCard.suit);
    }
    for (let c = 0; c < 7; c++) {
      if (src.source === 'tab' && src.colIdx === c) continue;
      if (canMoveToTableau(leadCard, c)) {
        return executeMove(src, 'tab', c);
      }
    }
    return false;
  }

  function autoMoveAllToFoundations() {
    let movedAny = false;
    let keepGoing = true;
    while (keepGoing) {
      keepGoing = false;
      if (waste.length > 0) {
        const wCard = waste[waste.length - 1];
        if (canMoveToFoundation(wCard, wCard.suit)) {
          executeMove({ source: 'waste' }, 'found', wCard.suit);
          keepGoing = true;
          movedAny = true;
          continue;
        }
      }
      for (let c = 0; c < 7; c++) {
        const col = tableau[c];
        if (col.length > 0) {
          const top = col[col.length - 1];
          if (top.faceUp && canMoveToFoundation(top, top.suit)) {
            executeMove({ source: 'tab', colIdx: c, cardIdx: col.length - 1 }, 'found', top.suit);
            keepGoing = true;
            movedAny = true;
            break;
          }
        }
      }
    }
    selected = null;
    if (!movedAny) window.AsciiAudio.error();
    render();
  }

  function formatCardLabel(card) {
    const label = (card.rankStr + card.sym).padEnd(3, ' ');
    const cls = card.color === 'red' ? 'ascii-danger' : 'ascii-bright';
    return `<span class="${cls}">${label}</span>`;
  }

  function renderTopBarHtml() {
    const stockTxt = stock.length > 0 ? `[###] (${String(stock.length).padStart(2, '0')})` : `[ ↺ ] (00)`;
    const isWasteSel = selected && selected.source === 'waste';
    let wasteTxt = '[ Vacío ]';
    if (waste.length > 0) {
      const topW = waste[waste.length - 1];
      wasteTxt = `[ ${formatCardLabel(topW)} ]`;
    }

    const foundHtml = foundations.map((pile, idx) => {
      const suitSym = SUITS[idx].sym;
      const cls = SUITS[idx].color === 'red' ? 'ascii-danger' : 'ascii-bright';
      if (pile.length === 0) {
        return `<span class="ascii-cell" data-action="found" data-f="${idx}">[ <span class="${cls}">_${suitSym}_</span> ]</span>`;
      }
      const top = pile[pile.length - 1];
      return `<span class="ascii-cell" data-action="found" data-f="${idx}">[ ${formatCardLabel(top)} ]</span>`;
    }).join('  ');

    return `╔══════════════════════════════════════════════════════════════════════════════════════╗
║ MAZO (D): <span class="ascii-cell" id="sol-stock">${stockTxt}</span>   DESCARTE (W): <span class="ascii-cell ${isWasteSel ? 'selected' : ''}" id="sol-waste">${wasteTxt}</span>    │  FUNDACIONES: ${foundHtml} ║
╚══════════════════════════════════════════════════════════════════════════════════════╝`;
  }

  function renderTableauHtml() {
    // Renderizamos las 7 columnas en paralelo como tarjetas ASCII
    const maxLen = Math.max(1, ...tableau.map(c => c.length));
    const lines = [];

    // Cabeceras de columna clicables (para mover Reyes a columnas vacías o seleccionar destino)
    const headers = [0, 1, 2, 3, 4, 5, 6].map(c =>
      `<span class="ascii-cell" data-action="col-empty" data-col="${c}">  [Col ${c + 1}]  </span>`
    ).join(' ');
    lines.push(' ' + headers);
    lines.push(' ─────────── ─────────── ─────────── ─────────── ─────────── ─────────── ───────────');

    for (let r = 0; r < maxLen; r++) {
      const rowTop = [];
      const rowMid = [];
      const rowBot = [];

      for (let c = 0; c < 7; c++) {
        const col = tableau[c];
        if (r >= col.length) {
          if (r === 0 && col.length === 0) {
            rowTop.push('┌─────────┐');
            rowMid.push(`<span class="ascii-cell ascii-dim" data-action="col-empty" data-col="${c}">│ (Vacía) │</span>`);
            rowBot.push('└─────────┘');
          } else {
            rowTop.push('           ');
            rowMid.push('           ');
            rowBot.push('           ');
          }
        } else {
          const card = col[r];
          const isLast = r === col.length - 1;
          const isSel = selected && selected.source === 'tab' && selected.colIdx === c && r >= selected.cardIdx;

          if (!card.faceUp) {
            rowTop.push('┌─────────┐');
            rowMid.push('│░░░░░░░░░│');
            rowBot.push(isLast ? '└─────────┘' : '           ');
          } else {
            const selCls = isSel ? ' selected' : '';
            const cardInner = `│ ${formatCardLabel(card)}     │`;
            rowTop.push('┌─────────┐');
            rowMid.push(`<span class="ascii-cell${selCls}" data-action="tab-card" data-col="${c}" data-idx="${r}">${cardInner}</span>`);
            if (isLast) {
              rowBot.push('└─────────┘');
            } else {
              rowBot.push('           ');
            }
          }
        }
      }

      lines.push(' ' + rowTop.join(' '));
      lines.push(' ' + rowMid.join(' '));
      // Imprimir borde inferior si alguna columna termina en esta fila
      if (rowBot.some(b => b.trim() !== '')) {
        lines.push(' ' + rowBot.join(' '));
      }
    }

    return lines.join('\n');
  }

  function render() {
    if (!containerEl) return;

    const winBanner = won
      ? `\n<span class="ascii-warn">╔══════════════════════════════════════════════════════════════════════╗
║ ¡SOLITARIO COMPLETADO! Has sobrevivido a la jornada laboral.         ║
╚══════════════════════════════════════════════════════════════════════╝</span>`
      : '';

    containerEl.innerHTML = `
      <div class="game-shell">
        <pre class="ascii-art ascii-bright">
┌──────────────────────────────────────────────────────────────────────────────────┐
│  [07] SOLITARIO KLONDIKE - "El Clásico Inmortal de Horas de Oficina"             │
└──────────────────────────────────────────────────────────────────────────────────┘</pre>

        <div class="bar-controls">
          <div class="bar-group">
            <button class="ascii-btn" id="sol-new">[R] Nueva Partida</button>
            <button class="ascii-btn" id="sol-draw">[D / ESPACIO] Robar Mazo</button>
            <button class="ascii-btn active" id="sol-auto">[A] Auto-Subir Cartas</button>
            <button class="ascii-btn" id="sol-undo">[Z] Deshacer (${history.length})</button>
          </div>
          <div class="bar-group">
            <span>Movs: <b>${moves}</b> | Puntos: <b class="ascii-warn">${score}</b></span>
            <button class="ascii-btn danger-btn" id="sol-exit">[ESC] Menú</button>
          </div>
        </div>

        <div class="ascii-panel">
${renderTopBarHtml()}

${renderTableauHtml()}${winBanner}
──────────────────────────────────────────────────────────────────────────────────────
• <b>1 Clic</b>: Seleccionar carta y luego clic en destino  |  <b>Doble Clic</b> en carta: Movimiento Rápido Automático
• Teclas: <b>[ESPACIO / D]</b> Robar del Mazo  |  <b>[A]</b> Auto-Subir a Fundaciones  |  <b>[Z]</b> Deshacer
        </div>
      </div>
    `;

    document.getElementById('sol-new')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      startNewGame();
    });
    document.getElementById('sol-draw')?.addEventListener('click', () => drawStock());
    document.getElementById('sol-stock')?.addEventListener('click', () => drawStock());
    document.getElementById('sol-auto')?.addEventListener('click', () => autoMoveAllToFoundations());
    document.getElementById('sol-undo')?.addEventListener('click', () => undo());
    document.getElementById('sol-exit')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      if (exitCallback) exitCallback();
    });

    // Clic y Doble Clic en Descarte
    const wasteEl = document.getElementById('sol-waste');
    if (wasteEl) {
      wasteEl.addEventListener('click', () => {
        if (waste.length === 0) return;
        if (selected && selected.source === 'waste') {
          smartAutoMove(selected);
          selected = null;
        } else {
          selected = { source: 'waste' };
          window.AsciiAudio.move();
        }
        render();
      });
      wasteEl.addEventListener('dblclick', () => {
        if (waste.length === 0) return;
        smartAutoMove({ source: 'waste' });
        selected = null;
        render();
      });
    }

    // Clic en Fundaciones
    containerEl.querySelectorAll('[data-action="found"]').forEach(el => {
      el.addEventListener('click', () => {
        const fIdx = parseInt(el.getAttribute('data-f'), 10);
        if (selected) {
          executeMove(selected, 'found', fIdx);
          selected = null;
          render();
        }
      });
    });

    // Clic en Columnas Vacías / Cabeceras
    containerEl.querySelectorAll('[data-action="col-empty"]').forEach(el => {
      el.addEventListener('click', () => {
        const colIdx = parseInt(el.getAttribute('data-col'), 10);
        if (selected) {
          executeMove(selected, 'tab', colIdx);
          selected = null;
          render();
        }
      });
    });

    // Clic y Doble Clic en Cartas del Tableau
    containerEl.querySelectorAll('[data-action="tab-card"]').forEach(el => {
      const colIdx = parseInt(el.getAttribute('data-col'), 10);
      const cardIdx = parseInt(el.getAttribute('data-idx'), 10);

      el.addEventListener('click', () => {
        if (selected) {
          if (selected.source === 'tab' && selected.colIdx === colIdx && selected.cardIdx === cardIdx) {
            // Segundo clic sobre la misma carta intenta movimiento inteligente
            smartAutoMove(selected);
            selected = null;
          } else {
            const moved = executeMove(selected, 'tab', colIdx);
            if (!moved) {
              selected = { source: 'tab', colIdx, cardIdx };
              window.AsciiAudio.move();
            } else {
              selected = null;
            }
          }
        } else {
          selected = { source: 'tab', colIdx, cardIdx };
          window.AsciiAudio.move();
        }
        render();
      });

      el.addEventListener('dblclick', () => {
        smartAutoMove({ source: 'tab', colIdx, cardIdx });
        selected = null;
        render();
      });
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
      if (k === 'd' || k === 'D' || k === ' ') {
        e.preventDefault();
        drawStock();
      } else if (k === 'a' || k === 'A') {
        e.preventDefault();
        autoMoveAllToFoundations();
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
