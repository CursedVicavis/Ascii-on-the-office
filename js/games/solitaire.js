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
  let gameOver = false;
  let viewingBoard = false;
  let history = [];

  // Sistema de sugerencias y auto-movimiento
  let activeHint = null;
  let hintIndex = -1;
  let statusMessage = '';

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
    activeHint = null;
    hintIndex = -1;
    gameOver = false;
    viewingBoard = false;
    statusMessage = 'Jugada deshecha [Z].';
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
    gameOver = false;
    viewingBoard = false;
    activeHint = null;
    hintIndex = -1;
    statusMessage = '';
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
    if (won || (gameOver && !viewingBoard)) return;
    saveHistory();
    selected = null;
    activeHint = null;
    hintIndex = -1;
    statusMessage = '';
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
    if (!checkGameOver()) {
      render();
    }
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

  function flipTopIfNeeded(colIdx, pointMult = 1.0) {
    const col = tableau[colIdx];
    if (col.length > 0 && !col[col.length - 1].faceUp) {
      col[col.length - 1].faceUp = true;
      const pts = Math.max(1, Math.floor(5 * pointMult));
      score += pts;
      return pts;
    }
    return 0;
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

  function executeMove(src, destType, destIdx, isAuto = false) {
    const pointMult = isAuto ? 0.5 : 1.0;
    let earnedPts = 0;

    if (src.source === 'waste') {
      const card = waste[waste.length - 1];
      if (!card) return false;
      if (destType === 'found' && canMoveToFoundation(card, destIdx)) {
        saveHistory();
        waste.pop();
        foundations[destIdx].push(card);
        const pts = Math.max(1, Math.floor(15 * pointMult));
        score += pts;
        earnedPts += pts;
        moves++;
        window.AsciiAudio.score();
        checkVictory();
        return { success: true, earnedPts };
      }
      if (destType === 'tab' && canMoveToTableau(card, destIdx)) {
        saveHistory();
        waste.pop();
        tableau[destIdx].push(card);
        const pts = Math.max(1, Math.floor(5 * pointMult));
        score += pts;
        earnedPts += pts;
        moves++;
        window.AsciiAudio.click();
        return { success: true, earnedPts };
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
        const flipPts = flipTopIfNeeded(src.colIdx, pointMult);
        const pts = Math.max(1, Math.floor(15 * pointMult));
        score += pts;
        earnedPts += pts + flipPts;
        moves++;
        window.AsciiAudio.score();
        checkVictory();
        return { success: true, earnedPts };
      }
      if (destType === 'tab' && src.colIdx !== destIdx && canMoveToTableau(leadCard, destIdx)) {
        saveHistory();
        tableau[src.colIdx] = col.slice(0, src.cardIdx);
        tableau[destIdx].push(...movingCards);
        const flipPts = flipTopIfNeeded(src.colIdx, pointMult);
        const pts = Math.max(1, Math.floor(5 * pointMult));
        score += pts;
        earnedPts += pts + flipPts;
        moves++;
        window.AsciiAudio.click();
        return { success: true, earnedPts };
      }
    }
    return false;
  }

  // Intenta mover automáticamente una carta a su fundación o a una columna válida (manual: puntos completos)
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
      const res = executeMove(src, 'found', leadCard.suit, false);
      if (res) {
        activeHint = null;
        hintIndex = -1;
        statusMessage = '';
        if (!won) checkGameOver();
        return true;
      }
    }
    for (let c = 0; c < 7; c++) {
      if (src.source === 'tab' && src.colIdx === c) continue;
      if (canMoveToTableau(leadCard, c)) {
        const res = executeMove(src, 'tab', c, false);
        if (res) {
          activeHint = null;
          hintIndex = -1;
          statusMessage = '';
          if (!won) checkGameOver();
          return true;
        }
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
          executeMove({ source: 'waste' }, 'found', wCard.suit, false);
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
            executeMove({ source: 'tab', colIdx: c, cardIdx: col.length - 1 }, 'found', top.suit, false);
            keepGoing = true;
            movedAny = true;
            break;
          }
        }
      }
    }
    selected = null;
    activeHint = null;
    hintIndex = -1;
    if (!movedAny) {
      window.AsciiAudio.error();
    } else {
      if (!won) checkGameOver();
    }
    render();
  }

  // -------------------------------------------------------------
  // Detección de Sugerencias (Hints) y Estado Stuck (Game Over)
  // -------------------------------------------------------------
  function findAllAvailableMoves() {
    const list = [];

    // 1. Descarte a Fundaciones
    if (waste.length > 0) {
      const wCard = waste[waste.length - 1];
      if (canMoveToFoundation(wCard, wCard.suit)) {
        list.push({
          type: 'waste-to-found',
          src: { source: 'waste' },
          destType: 'found',
          destIdx: wCard.suit,
          card: wCard,
          targetCard: foundations[wCard.suit].length > 0 ? foundations[wCard.suit][foundations[wCard.suit].length - 1] : null,
          desc: `Mover ${wCard.rankStr}${wCard.sym} (Descarte) a Fundación ${SUITS[wCard.suit].name}`,
          priority: 85,
          revealsCard: false
        });
      }
    }

    // 2. Tableau a Fundaciones
    for (let c = 0; c < 7; c++) {
      const col = tableau[c];
      if (col.length > 0) {
        const top = col[col.length - 1];
        if (top.faceUp && canMoveToFoundation(top, top.suit)) {
          const uncoversHidden = col.length > 1 && !col[col.length - 2].faceUp;
          list.push({
            type: 'tab-to-found',
            src: { source: 'tab', colIdx: c, cardIdx: col.length - 1 },
            destType: 'found',
            destIdx: top.suit,
            card: top,
            targetCard: foundations[top.suit].length > 0 ? foundations[top.suit][foundations[top.suit].length - 1] : null,
            desc: `Mover ${top.rankStr}${top.sym} (Col ${c + 1}) a Fundación ${SUITS[top.suit].name}`,
            priority: uncoversHidden ? 100 : (top.rank <= 2 ? 95 : 70),
            revealsCard: uncoversHidden
          });
        }
      }
    }

    // 3. Descarte a Tableau
    if (waste.length > 0) {
      const wCard = waste[waste.length - 1];
      for (let c = 0; c < 7; c++) {
        if (canMoveToTableau(wCard, c)) {
          const isEmptyCol = tableau[c].length === 0;
          const target = isEmptyCol ? null : tableau[c][tableau[c].length - 1];
          list.push({
            type: 'waste-to-tab',
            src: { source: 'waste' },
            destType: 'tab',
            destIdx: c,
            card: wCard,
            targetCard: target,
            desc: isEmptyCol
              ? `Mover ${wCard.rankStr}${wCard.sym} (Descarte) a Columna ${c + 1} (Vacía)`
              : `Mover ${wCard.rankStr}${wCard.sym} (Descarte) a ${target.rankStr}${target.sym} (Col ${c + 1})`,
            priority: isEmptyCol ? 65 : 80,
            revealsCard: false
          });
        }
      }
    }

    // 4. Tableau a Tableau
    for (let sCol = 0; sCol < 7; sCol++) {
      const col = tableau[sCol];
      for (let r = 0; r < col.length; r++) {
        const card = col[r];
        if (!card.faceUp) continue;

        for (let dCol = 0; dCol < 7; dCol++) {
          if (sCol === dCol) continue;
          if (!canMoveToTableau(card, dCol)) continue;

          const isDestEmpty = tableau[dCol].length === 0;
          const destTop = isDestEmpty ? null : tableau[dCol][tableau[dCol].length - 1];

          // Evitar bucle absurdo: Rey de columna vacía a otra columna vacía
          if (card.rank === 13 && r === 0 && isDestEmpty) {
            continue;
          }

          // Evitar bucle absurdo: mover carta entre dos padres del mismo valor sin destapar nada
          if (r > 0 && col[r - 1].faceUp && destTop && destTop.rank === col[r - 1].rank) {
            continue;
          }

          const uncoversHidden = r > 0 && !col[r - 1].faceUp;
          const emptiesCol = r === 0;

          let prio = 40;
          if (uncoversHidden) prio = 90;
          else if (emptiesCol && card.rank !== 13) prio = 60;
          else if (isDestEmpty && card.rank === 13) prio = 55;

          list.push({
            type: 'tab-to-tab',
            src: { source: 'tab', colIdx: sCol, cardIdx: r },
            destType: 'tab',
            destIdx: dCol,
            card: card,
            targetCard: destTop,
            desc: isDestEmpty
              ? `Mover ${card.rankStr}${card.sym} (Col ${sCol + 1}) a Columna ${dCol + 1} (Vacía)`
              : `Mover ${card.rankStr}${card.sym} (Col ${sCol + 1}) a ${destTop.rankStr}${destTop.sym} (Col ${dCol + 1})`,
            priority: prio,
            revealsCard: uncoversHidden
          });
        }
      }
    }

    list.sort((a, b) => b.priority - a.priority);
    return list;
  }

  // Comprueba si alguna carta del mazo o descarte puede llegar a entrar al tablero
  function canStockOrWasteHelp() {
    if (stock.length === 0 && waste.length === 0) return false;
    const all = [...stock, ...waste];
    for (const c of all) {
      if (canMoveToFoundation(c, c.suit)) return true;
      for (let colIdx = 0; colIdx < 7; colIdx++) {
        if (canMoveToTableau(c, colIdx)) return true;
      }
    }
    return false;
  }

  function isGameStuck() {
    if (won) return false;
    const movesList = findAllAvailableMoves();
    if (movesList.length > 0) return false;
    if (canStockOrWasteHelp()) return false;
    return true;
  }

  function checkGameOver() {
    if (won) return false;
    if (isGameStuck()) {
      gameOver = true;
      viewingBoard = false;
      activeHint = null;
      hintIndex = -1;
      window.AsciiAudio.error();
      render();
      return true;
    }
    return false;
  }

  function triggerHint() {
    if (won || (gameOver && !viewingBoard)) return;
    const movesList = findAllAvailableMoves();
    if (movesList.length > 0) {
      hintIndex = (hintIndex + 1) % movesList.length;
      activeHint = movesList[hintIndex];
      statusMessage = `💡 SUGERENCIA [${hintIndex + 1}/${movesList.length}]: ${activeHint.desc} │ Pulsa [M] para Auto-Mover (½ Pts)`;
      window.AsciiAudio.move();
      render();
    } else if (canStockOrWasteHelp()) {
      activeHint = { type: 'stock-draw' };
      statusMessage = '💡 SUGERENCIA: No hay jugadas en el tablero. Roba cartas del Mazo [D] para continuar.';
      window.AsciiAudio.move();
      render();
    } else {
      checkGameOver();
    }
  }

  function triggerAutoMove() {
    if (won || (gameOver && !viewingBoard)) return;
    const movesList = findAllAvailableMoves();
    if (movesList.length > 0) {
      let move = movesList[0];
      if (activeHint && activeHint.src) {
        const found = movesList.find(m =>
          m.src.source === activeHint.src.source &&
          m.src.colIdx === activeHint.src.colIdx &&
          m.src.cardIdx === activeHint.src.cardIdx &&
          m.destType === activeHint.destType &&
          m.destIdx === activeHint.destIdx
        );
        if (found) move = found;
      }

      const res = executeMove(move.src, move.destType, move.destIdx, true);
      if (res && res.success) {
        activeHint = null;
        hintIndex = -1;
        statusMessage = `⚡ AUTO-JUGADA: ${move.desc} (+${res.earnedPts} pts [50% penalización])`;
        if (!won) checkGameOver();
        render();
      }
    } else if (canStockOrWasteHelp()) {
      drawStock();
      statusMessage = '⚡ AUTO-ROBO: Carta robada del mazo al no haber jugadas directas en el tablero.';
      activeHint = null;
      hintIndex = -1;
      render();
    } else {
      checkGameOver();
    }
  }

  function formatCardLabel(card) {
    const label = (card.rankStr + card.sym).padEnd(3, ' ');
    const cls = card.color === 'red' ? 'ascii-danger' : 'ascii-bright';
    return `<span class="${cls}">${label}</span>`;
  }

  function renderTopBarHtml() {
    const isStockHint = activeHint && activeHint.type === 'stock-draw';
    const stockTxt = stock.length > 0 ? `[###] (${String(stock.length).padStart(2, '0')})` : `[ ↺ ] (00)`;
    const isWasteSel = selected && selected.source === 'waste';
    const isWasteHintSrc = activeHint && activeHint.src && activeHint.src.source === 'waste';

    let wasteCls = 'ascii-cell';
    if (isWasteSel) wasteCls += ' selected';
    if (isWasteHintSrc) wasteCls += ' hint-source';

    let stockCls = 'ascii-cell';
    if (isStockHint) stockCls += ' hint-target';

    let wasteTxt = '[ Vacío ]';
    if (waste.length > 0) {
      const topW = waste[waste.length - 1];
      wasteTxt = `[ ${formatCardLabel(topW)} ]`;
    }

    const foundHtml = foundations.map((pile, idx) => {
      const suitSym = SUITS[idx].sym;
      const cls = SUITS[idx].color === 'red' ? 'ascii-danger' : 'ascii-bright';
      const isFoundHint = activeHint && activeHint.destType === 'found' && activeHint.destIdx === idx;
      const hintCls = isFoundHint ? ' hint-target' : '';

      if (pile.length === 0) {
        return `<span class="ascii-cell${hintCls}" data-action="found" data-f="${idx}">[ <span class="${cls}">_${suitSym}_</span> ]</span>`;
      }
      const top = pile[pile.length - 1];
      return `<span class="ascii-cell${hintCls}" data-action="found" data-f="${idx}">[ ${formatCardLabel(top)} ]</span>`;
    }).join('  ');

    return `╔══════════════════════════════════════════════════════════════════════════════════════╗
║ MAZO (D): <span class="${stockCls}" id="sol-stock">${stockTxt}</span>   DESCARTE (W): <span class="${wasteCls}" id="sol-waste">${wasteTxt}</span>    │  FUNDACIONES: ${foundHtml} ║
╚══════════════════════════════════════════════════════════════════════════════════════╝`;
  }

  function renderTableauHtml() {
    const maxLen = Math.max(1, ...tableau.map(c => c.length));
    const lines = [];

    // Cabeceras de columna clicables
    const headers = [0, 1, 2, 3, 4, 5, 6].map(c => {
      const isTargetEmpty = activeHint && activeHint.destType === 'tab' && activeHint.destIdx === c && tableau[c].length === 0;
      const hintCls = isTargetEmpty ? ' hint-target' : '';
      return `<span class="ascii-cell${hintCls}" data-action="col-empty" data-col="${c}">  [Col ${c + 1}]  </span>`;
    }).join(' ');
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
            const isHintTgt = activeHint && activeHint.destType === 'tab' && activeHint.destIdx === c;
            const hintCls = isHintTgt ? ' hint-target' : '';
            rowTop.push('┌─────────┐');
            rowMid.push(`<span class="ascii-cell ascii-dim${hintCls}" data-action="col-empty" data-col="${c}">│ (Vacía) │</span>`);
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
            const isHintSrc = activeHint && activeHint.src && activeHint.src.source === 'tab' && activeHint.src.colIdx === c && r >= activeHint.src.cardIdx;
            const isHintTgt = activeHint && activeHint.destType === 'tab' && activeHint.destIdx === c && isLast;

            let selCls = '';
            if (isSel) selCls = ' selected';
            else if (isHintSrc) selCls = ' hint-source';
            else if (isHintTgt) selCls = ' hint-target';

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
      if (rowBot.some(b => b.trim() !== '')) {
        lines.push(' ' + rowBot.join(' '));
      }
    }

    return lines.join('\n');
  }

  function renderGameOverScreen() {
    return `
      <div class="game-shell">
        <pre class="ascii-art ascii-bright">
┌──────────────────────────────────────────────────────────────────────────────────┐
│  [07] SOLITARIO KLONDIKE - "El Clásico Inmortal de Horas de Oficina"             │
└──────────────────────────────────────────────────────────────────────────────────┘</pre>

        <div class="bar-controls">
          <div class="bar-group">
            <button class="ascii-btn active" id="sol-go-new">[R] Nueva Partida</button>
            ${history.length > 0 ? `<button class="ascii-btn" id="sol-go-undo">[Z] Deshacer Jugada (${history.length})</button>` : ''}
            <button class="ascii-btn" id="sol-go-view">[V] Inspeccionar Tablero</button>
          </div>
          <div class="bar-group">
            <span>Movs: <b>${moves}</b> | Puntos: <b class="ascii-warn">${score}</b></span>
            <button class="ascii-btn danger-btn" id="sol-go-exit">[ESC] Menú</button>
          </div>
        </div>

        <div class="ascii-panel" style="text-align: center; padding: 18px 12px;">
<pre class="ascii-art ascii-danger">
  ██████╗  █████╗ ███╗   ███╗███████╗     ██████╗ ██╗   ██╗███████╗██████╗  
 ██╔════╝ ██╔══██╗████╗ ████║██╔════╝    ██╔═══██╗██║   ██║██╔════╝██╔══██╗ 
 ██║  ███╗███████║██╔████╔██║█████╗      ██║   ██║██║   ██║█████╗  ██████╔╝ 
 ██║   ██║██╔══██║██║╚██╔╝██║██╔══╝      ██║   ██║╚██╗ ██╔╝██╔══╝  ██╔══██╗ 
 ╚██████╔╝██║  ██║██║ ╚═╝ ██║███████╗    ╚██████╔╝ ╚████╔╝ ███████╗██║  ██║ 
  ╚═════╝ ╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝     ╚═════╝   ╚═══╝  ╚══════╝╚═╝  ╚═╝ 
</pre>
          <div class="ascii-danger" style="margin: 16px auto; font-size: 14px; font-weight: bold; max-width: 680px; white-space: pre;">
╔══════════════════════════════════════════════════════════════════════════╗
║                     ¡TE HAS QUEDADO SIN MOVIMIENTOS!                     ║
║                                                                          ║
║  No quedan jugadas disponibles en el tablero ni cartas en el mazo que    ║
║  puedan desbloquear la partida. Has quedado completamente bloqueado.     ║
╚══════════════════════════════════════════════════════════════════════════╝</div>

          <div style="margin: 14px 0; font-size: 14px;">
            <span>Movimientos realizados: <b class="ascii-bright">${moves}</b></span>
            &nbsp;&nbsp;│&nbsp;&nbsp;
            <span>Puntuación conseguida: <b class="ascii-warn">${score}</b></span>
          </div>

          <div style="margin-top: 18px; display: flex; justify-content: center; gap: 10px; flex-wrap: wrap;">
            <button class="ascii-btn active" id="sol-go-btn-new" style="padding: 6px 14px; font-size: 13px;">[R] Comenzar Nueva Partida</button>
            ${history.length > 0 ? `<button class="ascii-btn" id="sol-go-btn-undo" style="padding: 6px 14px; font-size: 13px;">[Z] Deshacer Última Jugada</button>` : ''}
            <button class="ascii-btn" id="sol-go-btn-view" style="padding: 6px 14px; font-size: 13px;">[V] Inspeccionar Tablero</button>
            <button class="ascii-btn danger-btn" id="sol-go-btn-exit" style="padding: 6px 14px; font-size: 13px;">[ESC] Salir al Menú</button>
          </div>
        </div>
      </div>
    `;
  }

  function render() {
    if (!containerEl) return;

    if (gameOver && !viewingBoard) {
      containerEl.innerHTML = renderGameOverScreen();

      document.getElementById('sol-go-new')?.addEventListener('click', () => {
        window.AsciiAudio.click();
        startNewGame();
      });
      document.getElementById('sol-go-btn-new')?.addEventListener('click', () => {
        window.AsciiAudio.click();
        startNewGame();
      });
      document.getElementById('sol-go-undo')?.addEventListener('click', () => undo());
      document.getElementById('sol-go-btn-undo')?.addEventListener('click', () => undo());
      document.getElementById('sol-go-view')?.addEventListener('click', () => {
        window.AsciiAudio.click();
        viewingBoard = true;
        render();
      });
      document.getElementById('sol-go-btn-view')?.addEventListener('click', () => {
        window.AsciiAudio.click();
        viewingBoard = true;
        render();
      });
      document.getElementById('sol-go-exit')?.addEventListener('click', () => {
        window.AsciiAudio.click();
        if (exitCallback) exitCallback();
      });
      document.getElementById('sol-go-btn-exit')?.addEventListener('click', () => {
        window.AsciiAudio.click();
        if (exitCallback) exitCallback();
      });
      return;
    }

    const winBanner = won
      ? `\n<span class="ascii-warn">╔══════════════════════════════════════════════════════════════════════╗
║ ¡SOLITARIO COMPLETADO! Has sobrevivido a la jornada laboral.         ║
╚══════════════════════════════════════════════════════════════════════╝</span>`
      : '';

    let alertBanner = '';
    if (gameOver && viewingBoard) {
      alertBanner = `<div class="sol-msg-banner ascii-danger">⚠ ¡PARTIDA BLOQUEADA! Sin movimientos posibles. Pulsa [V] para volver a Pantalla Game Over, [Z] para Deshacer o [R] para Nueva Partida.</div>`;
    } else if (statusMessage) {
      alertBanner = `<div class="sol-msg-banner ascii-bright">${statusMessage}</div>`;
    }

    containerEl.innerHTML = `
      <div class="game-shell">
        <pre class="ascii-art ascii-bright">
┌──────────────────────────────────────────────────────────────────────────────────┐
│  [07] SOLITARIO KLONDIKE - "El Clásico Inmortal de Horas de Oficina"             │
└──────────────────────────────────────────────────────────────────────────────────┘</pre>

        <div class="bar-controls">
          <div class="bar-group">
            <button class="ascii-btn" id="sol-new">[R] Nueva</button>
            <button class="ascii-btn" id="sol-draw">[D] Robar Mazo</button>
            <button class="ascii-btn active" id="sol-hint">[H] Pista</button>
            <button class="ascii-btn" id="sol-automove">[M] Auto-Mover (½ Pts)</button>
            <button class="ascii-btn" id="sol-auto">[A] Auto-Subir</button>
            <button class="ascii-btn" id="sol-undo">[Z] Deshacer (${history.length})</button>
            ${gameOver && viewingBoard ? `<button class="ascii-btn danger-btn" id="sol-view-go">[V] Game Over</button>` : ''}
          </div>
          <div class="bar-group">
            <span>Movs: <b>${moves}</b> | Puntos: <b class="ascii-warn">${score}</b></span>
            <button class="ascii-btn danger-btn" id="sol-exit">[ESC] Menú</button>
          </div>
        </div>

        <div class="ascii-panel">
${renderTopBarHtml()}
${alertBanner}
${renderTableauHtml()}${winBanner}
──────────────────────────────────────────────────────────────────────────────────────
• <b>1 Clic</b>: Seleccionar carta y clic en destino  |  <b>Doble Clic</b>: Movimiento Rápido Automático
• Teclas: <b>[H]</b> Pista Sugerida  |  <b>[M]</b> Auto-Mover (½ Pts)  |  <b>[D/ESPACIO]</b> Robar  |  <b>[A]</b> Subir  |  <b>[Z]</b> Deshacer
        </div>
      </div>
    `;

    document.getElementById('sol-new')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      startNewGame();
    });
    document.getElementById('sol-draw')?.addEventListener('click', () => drawStock());
    document.getElementById('sol-stock')?.addEventListener('click', () => drawStock());
    document.getElementById('sol-hint')?.addEventListener('click', () => triggerHint());
    document.getElementById('sol-automove')?.addEventListener('click', () => triggerAutoMove());
    document.getElementById('sol-auto')?.addEventListener('click', () => autoMoveAllToFoundations());
    document.getElementById('sol-undo')?.addEventListener('click', () => undo());
    document.getElementById('sol-view-go')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      viewingBoard = false;
      render();
    });
    document.getElementById('sol-exit')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      if (exitCallback) exitCallback();
    });

    // Clic y Doble Clic en Descarte
    const wasteEl = document.getElementById('sol-waste');
    if (wasteEl) {
      wasteEl.addEventListener('click', () => {
        if (waste.length === 0) return;
        activeHint = null;
        statusMessage = '';
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
        activeHint = null;
        statusMessage = '';
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
          activeHint = null;
          statusMessage = '';
          const moved = executeMove(selected, 'found', fIdx, false);
          selected = null;
          if (moved && !won) checkGameOver();
          render();
        }
      });
    });

    // Clic en Columnas Vacías / Cabeceras
    containerEl.querySelectorAll('[data-action="col-empty"]').forEach(el => {
      el.addEventListener('click', () => {
        const colIdx = parseInt(el.getAttribute('data-col'), 10);
        if (selected) {
          activeHint = null;
          statusMessage = '';
          const moved = executeMove(selected, 'tab', colIdx, false);
          selected = null;
          if (moved && !won) checkGameOver();
          render();
        }
      });
    });

    // Clic y Doble Clic en Cartas del Tableau
    containerEl.querySelectorAll('[data-action="tab-card"]').forEach(el => {
      const colIdx = parseInt(el.getAttribute('data-col'), 10);
      const cardIdx = parseInt(el.getAttribute('data-idx'), 10);

      el.addEventListener('click', () => {
        activeHint = null;
        statusMessage = '';
        if (selected) {
          if (selected.source === 'tab' && selected.colIdx === colIdx && selected.cardIdx === cardIdx) {
            // Segundo clic sobre la misma carta intenta movimiento inteligente
            smartAutoMove(selected);
            selected = null;
          } else {
            const moved = executeMove(selected, 'tab', colIdx, false);
            if (!moved) {
              selected = { source: 'tab', colIdx, cardIdx };
              window.AsciiAudio.move();
            } else {
              selected = null;
              if (!won) checkGameOver();
            }
          }
        } else {
          selected = { source: 'tab', colIdx, cardIdx };
          window.AsciiAudio.move();
        }
        render();
      });

      el.addEventListener('dblclick', () => {
        activeHint = null;
        statusMessage = '';
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

      if (gameOver && !viewingBoard) {
        if (k === 'r' || k === 'R') {
          e.preventDefault();
          window.AsciiAudio.click();
          startNewGame();
        } else if (k === 'z' || k === 'Z') {
          e.preventDefault();
          undo();
        } else if (k === 'v' || k === 'V') {
          e.preventDefault();
          viewingBoard = true;
          window.AsciiAudio.click();
          render();
        }
        return;
      }

      if (k === 'd' || k === 'D' || k === ' ') {
        e.preventDefault();
        drawStock();
      } else if (k === 'h' || k === 'H') {
        e.preventDefault();
        triggerHint();
      } else if (k === 'm' || k === 'M') {
        e.preventDefault();
        triggerAutoMove();
      } else if (k === 'a' || k === 'A') {
        e.preventDefault();
        autoMoveAllToFoundations();
      } else if (k === 'z' || k === 'Z') {
        e.preventDefault();
        undo();
      } else if (k === 'r' || k === 'R') {
        e.preventDefault();
        window.AsciiAudio.click();
        startNewGame();
      } else if (k === 'v' || k === 'V') {
        if (gameOver) {
          e.preventDefault();
          viewingBoard = !viewingBoard;
          window.AsciiAudio.click();
          render();
        }
      }
    }
  };
})();
