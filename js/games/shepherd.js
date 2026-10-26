/* ==========================================================================
   ASCI ON THE OFFICE - Juego 9: FUGA DE OVEJAS (Cuadros Específicos 24x16)
   - Cuadrícula de 24x16 cuadros específicos y persistentes en el DOM.
   - Sin burbuja visual alrededor del cursor.
   - Avance automático al siguiente nivel en cuanto metes los animales al corral.
   ========================================================================== */

window.GameShepherd = (function () {
  let containerEl = null;
  let exitCallback = null;
  let physicsInterval = null;
  let nextLevelTimeout = null;

  const ROWS = 16;
  const COLS = 24;

  // Tipos de cuadro específicos
  const TILE_GRASS = 0;
  const TILE_ESCAPE = 1;
  const TILE_WALL = 2;
  const TILE_GATE = 3;
  const TILE_INSIDE = 4;

  // Coordenadas del Corral en la cuadrícula 24x16
  const CORRAL = {
    top: 10,
    bottom: 14,
    left: 7,
    right: 16,
    gateLeft: 9,
    gateRight: 14
  };

  const ANIMAL_SPECIES = {
    sheep: {
      id: 'sheep',
      name: 'Oveja Blanca',
      emoji: '🐑',
      maxSpeed: 0.34,
      senseRadius: 4.5,
      points: 150
    },
    ram: {
      id: 'ram',
      name: 'Carnero',
      emoji: '🐏',
      maxSpeed: 0.42,
      senseRadius: 5.2,
      points: 220
    },
    pig: {
      id: 'pig',
      name: 'Cerdito',
      emoji: '🐖',
      maxSpeed: 0.50,
      senseRadius: 5.8,
      points: 300
    },
    llama: {
      id: 'llama',
      name: 'Llama Veloz',
      emoji: '🦙',
      maxSpeed: 0.60,
      senseRadius: 6.5,
      points: 420
    },
    rabbit: {
      id: 'rabbit',
      name: 'Conejo Turbo',
      emoji: '🐇',
      maxSpeed: 0.72,
      senseRadius: 7.4,
      points: 600
    }
  };

  const BASE_LEVELS = [
    { name: 'Nivel 1: Rebaño Básico', list: ['sheep', 'sheep', 'sheep', 'sheep'] },
    { name: 'Nivel 2: Carneros Inquietos', list: ['sheep', 'sheep', 'sheep', 'ram', 'ram'] },
    { name: 'Nivel 3: Granja Revuelta', list: ['sheep', 'sheep', 'ram', 'ram', 'pig', 'pig'] },
    { name: 'Nivel 4: Llamas en Fuga', list: ['sheep', 'ram', 'pig', 'pig', 'llama', 'llama'] },
    { name: 'Nivel 5: Fiebre de Conejos', list: ['sheep', 'ram', 'pig', 'llama', 'llama', 'rabbit', 'rabbit'] }
  ];

  let tileMap = [];
  let cellEls = [];
  let levelIdx = 0;
  let animals = [];
  let mouseR = -10;
  let mouseC = -10;
  let score = 0;
  let bestScore = 0;
  let milestonesAwarded = 0;
  let timeLeft = 60.0;
  let roundOver = false;
  let statusBannerText = 'Lleva a todos los animales al corral antes de que se acabe el tiempo.';

  function getLevelConfig(idx) {
    if (idx < BASE_LEVELS.length) return BASE_LEVELS[idx];
    const pool = ['sheep', 'ram', 'pig', 'llama', 'rabbit'];
    const count = Math.min(12, 6 + Math.floor((idx - 4) / 2));
    const list = [];
    for (let i = 0; i < count; i++) {
      list.push(pool[Math.min(pool.length - 1, Math.floor(Math.random() * pool.length))]);
    }
    return { name: `Nivel ${idx + 1}: Rebaño Experto`, list };
  }

  function buildTileMap() {
    tileMap = Array.from({ length: ROWS }, () => Array(COLS).fill(TILE_GRASS));

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (r === 0 || r === ROWS - 1 || c === 0 || c === COLS - 1) {
          tileMap[r][c] = TILE_ESCAPE;
        }
      }
    }

    for (let r = CORRAL.top; r <= CORRAL.bottom; r++) {
      for (let c = CORRAL.left; c <= CORRAL.right; c++) {
        if (r === CORRAL.top) {
          if (c >= CORRAL.gateLeft && c <= CORRAL.gateRight) {
            tileMap[r][c] = TILE_GATE;
          } else {
            tileMap[r][c] = TILE_WALL;
          }
        } else if (r === CORRAL.bottom || c === CORRAL.left || c === CORRAL.right) {
          tileMap[r][c] = TILE_WALL;
        } else {
          tileMap[r][c] = TILE_INSIDE;
        }
      }
    }
  }

  function getBaseTileSymbol(r, c) {
    const t = tileMap[r][c];
    if (t === TILE_ESCAPE) return '×';
    if (t === TILE_GATE) return '▼';
    if (t === TILE_INSIDE) return '·';
    if (t === TILE_WALL) {
      if (r === CORRAL.top && c === CORRAL.left) return '╔═';
      if (r === CORRAL.top && c === CORRAL.right) return '═╗';
      if (r === CORRAL.bottom && c === CORRAL.left) return '╚═';
      if (r === CORRAL.bottom && c === CORRAL.right) return '═╝';
      if (r === CORRAL.top || r === CORRAL.bottom) return '══';
      return '║';
    }
    return (r + c) % 4 === 0 ? ',' : '';
  }

  function getBaseTileClass(r, c) {
    const t = tileMap[r][c];
    if (t === TILE_ESCAPE) return 'corral-cell cell-escape';
    if (t === TILE_WALL) return 'corral-cell cell-wall';
    if (t === TILE_GATE) return 'corral-cell cell-gate';
    if (t === TILE_INSIDE) return 'corral-cell cell-inside';
    return 'corral-cell';
  }

  function checkMilestones() {
    const m = Math.floor(score / 1000);
    if (m > milestonesAwarded) {
      const gained = m - milestonesAwarded;
      milestonesAwarded = m;
      if (window.OfficeStats && window.OfficeStats.awardTycoonWinPoints) {
        window.OfficeStats.awardTycoonWinPoints(gained, 'Fuga de Ovejas (1000 pts)');
      }
    }
  }

  function startLevel(idx) {
    if (nextLevelTimeout) {
      clearTimeout(nextLevelTimeout);
      nextLevelTimeout = null;
    }
    buildTileMap();
    levelIdx = idx;
    const cfg = getLevelConfig(levelIdx);
    animals = [];
    timeLeft = 60.0;
    roundOver = false;
    statusBannerText = `${cfg.name} en curso...`;

    if (window.OfficeStats) {
      bestScore = window.OfficeStats.getHighScore('shepherd');
    }

    for (let i = 0; i < cfg.list.length; i++) {
      const spKey = cfg.list[i];
      const sp = ANIMAL_SPECIES[spKey];
      const ar = 3.5 + (i % 3) * 1.4 + Math.random() * 0.6;
      const ac = 5.5 + ((i * 3) % 12) + Math.random() * 0.8;
      animals.push({
        id: i,
        type: spKey,
        name: sp.name,
        emoji: sp.emoji,
        maxSpeed: sp.maxSpeed,
        senseRadius: sp.senseRadius,
        points: sp.points,
        r: ar,
        c: ac,
        vr: 0,
        vc: 0,
        penned: false,
        escaped: false
      });
    }

    if (!cellEls.length) {
      renderShellOnce();
    }
    paintGridState();

    if (physicsInterval) clearInterval(physicsInterval);
    physicsInterval = setInterval(stepPhysics, 55);
  }

  function lockAnimalInCorral(a) {
    if (a.penned) return;
    a.penned = true;
    a.r = Math.max(CORRAL.top + 1.2, Math.min(CORRAL.bottom - 1.2, a.r < CORRAL.top + 1 ? CORRAL.top + 1.4 : a.r));
    a.c = Math.max(CORRAL.left + 1.2, Math.min(CORRAL.right - 1.2, a.c));
    a.vr = 0.08;
    a.vc = (Math.random() - 0.5) * 0.1;

    score += a.points;
    checkMilestones();
    if (score > bestScore) {
      bestScore = score;
      if (window.OfficeStats) window.OfficeStats.recordGameWin('shepherd', score);
    }
    window.AsciiAudio.score();
    statusBannerText = `¡${a.emoji} ${a.name} entró al Corral! (+${a.points} pts)`;
  }

  function moveAndValidateAnimal(a) {
    const steps = 4;
    const stepR = a.vr / steps;
    const stepC = a.vc / steps;

    for (let s = 0; s < steps; s++) {
      const candR = a.r + stepR;
      const candC = a.c + stepC;
      const gridR = Math.max(0, Math.min(ROWS - 1, Math.round(candR)));
      const gridC = Math.max(0, Math.min(COLS - 1, Math.round(candC)));
      const tile = tileMap[gridR][gridC];

      if (a.penned) {
        if (tile === TILE_INSIDE) {
          a.r = candR;
          a.c = candC;
        } else {
          a.vr = -a.vr * 0.7;
          a.vc = -a.vc * 0.7;
          a.r = Math.max(CORRAL.top + 1.1, Math.min(CORRAL.bottom - 1.1, a.r));
          a.c = Math.max(CORRAL.left + 1.1, Math.min(CORRAL.right - 1.1, a.c));
          break;
        }
        continue;
      }

      if (tile === TILE_GATE || tile === TILE_INSIDE) {
        a.r = candR;
        a.c = candC;
        lockAnimalInCorral(a);
        return;
      }

      if (tile === TILE_WALL) {
        const prevGridR = Math.round(a.r);
        const prevGridC = Math.round(a.c);
        if (prevGridR !== gridR) a.vr = -a.vr * 0.75;
        if (prevGridC !== gridC) a.vc = -a.vc * 0.75;
        if (gridR === CORRAL.top && gridC >= CORRAL.left && gridC <= CORRAL.right) {
          const gateCenterC = (CORRAL.gateLeft + CORRAL.gateRight) / 2;
          a.vc += (gateCenterC > a.c ? 0.12 : -0.12);
        }
        break;
      }

      if (tile === TILE_ESCAPE) {
        a.r = candR;
        a.c = candC;
        a.escaped = true;
        window.AsciiAudio.error();
        statusBannerText = `¡Se escapó un ${a.emoji} ${a.name} por el borde exterior!`;
        return;
      }

      a.r = candR;
      a.c = candC;
    }
  }

  function stepPhysics() {
    if (roundOver || window.BossKey.isActive()) return;

    timeLeft = Math.max(0, timeLeft - 0.055);
    if (timeLeft <= 0) {
      roundOver = true;
      statusBannerText = '¡Se agotó el tiempo! Presiona [R] para reintentar.';
      paintGridState();
      return;
    }

    const gateCenterR = CORRAL.top + 0.5;
    const gateCenterC = (CORRAL.gateLeft + CORRAL.gateRight) / 2;

    for (const a of animals) {
      if (a.escaped) continue;

      if (a.penned) {
        a.vr = a.vr * 0.9 + (Math.random() - 0.5) * 0.04;
        a.vc = a.vc * 0.9 + (Math.random() - 0.5) * 0.04;
        moveAndValidateAnimal(a);
        continue;
      }

      const dr = a.r - mouseR;
      const dc = a.c - mouseC;
      const dist = Math.sqrt(dr * dr + dc * dc);

      if (dist <= a.senseRadius && dist > 0.01) {
        const strength = (1 - dist / a.senseRadius) * a.maxSpeed * 0.55;
        let pushR = (dr / dist) * strength;
        let pushC = (dc / dist) * strength;

        const distToGate = Math.hypot(a.r - gateCenterR, a.c - gateCenterC);
        if (distToGate < 4.2 && pushR > 0) {
          pushC += ((gateCenterC - a.c) / Math.max(1, distToGate)) * 0.08;
        }

        a.vr = a.vr * 0.72 + pushR;
        a.vc = a.vc * 0.72 + pushC;
      } else {
        a.vr *= 0.85;
        a.vc *= 0.85;
      }

      const spd = Math.hypot(a.vr, a.vc);
      if (spd > a.maxSpeed) {
        a.vr = (a.vr / spd) * a.maxSpeed;
        a.vc = (a.vc / spd) * a.maxSpeed;
      }

      moveAndValidateAnimal(a);
    }

    const remainingFree = animals.filter(a => !a.penned && !a.escaped).length;
    if (remainingFree === 0) {
      const pennedCount = animals.filter(a => a.penned).length;
      const escapedCount = animals.filter(a => a.escaped).length;
      roundOver = true;

      if (pennedCount > 0) {
        const timeBonus = Math.round(timeLeft * 15);
        const perfectBonus = escapedCount === 0 ? 500 : 0;
        score += timeBonus + perfectBonus;
        checkMilestones();
        if (score > bestScore) {
          bestScore = score;
          if (window.OfficeStats) window.OfficeStats.recordGameWin('shepherd', score);
        }
        window.AsciiAudio.win();
        statusBannerText = `¡Nivel ${levelIdx + 1} superado! (+${timeBonus} Bono Tiempo${perfectBonus ? ' +500 Perfecto' : ''}) — Cargando Nivel ${levelIdx + 2}...`;
        paintGridState();

        // Avanzar automáticamente al siguiente nivel
        nextLevelTimeout = setTimeout(() => {
          if (containerEl) {
            startLevel(levelIdx + 1);
          }
        }, 750);
      } else {
        statusBannerText = '¡Se escaparon todos los animales! Presiona [R] para reintentar.';
        paintGridState();
      }
      return;
    }

    paintGridState();
  }

  function paintGridState() {
    if (!cellEls.length) return;

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const el = cellEls[r][c];
        el.className = getBaseTileClass(r, c);
        el.textContent = getBaseTileSymbol(r, c);
      }
    }

    for (const a of animals) {
      if (a.escaped) continue;
      const ar = Math.max(0, Math.min(ROWS - 1, Math.round(a.r)));
      const ac = Math.max(0, Math.min(COLS - 1, Math.round(a.c)));
      const el = cellEls[ar][ac];
      if (el) {
        el.textContent = a.emoji;
      }
    }

    const pennedCount = animals.filter(a => a.penned).length;
    const escapedCount = animals.filter(a => a.escaped).length;
    const freeCount = animals.length - pennedCount - escapedCount;

    const statsEl = document.getElementById('shep-live-stats');
    if (statsEl) {
      statsEl.innerHTML = `NIVEL: <span class="ascii-bright">${levelIdx + 1}</span> │ CORRAL: <span class="ascii-bright">${pennedCount}/${animals.length}</span> │ LIBRES: <span class="ascii-info">${freeCount}</span> │ FUGAS: <span class="ascii-danger">${escapedCount}</span> │ TIEMPO: <span class="ascii-warn">${timeLeft.toFixed(1)}s</span> │ PUNTOS: <span class="ascii-warn">${score}</span> (Gane: +${milestonesAwarded})`;
    }

    const logEl = document.getElementById('shep-status-log');
    if (logEl) {
      logEl.textContent = statusBannerText;
    }
  }

  function renderShellOnce() {
    if (!containerEl) return;

    let gridCellsHtml = '';
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        gridCellsHtml += `<div class="${getBaseTileClass(r, c)}" data-r="${r}" data-c="${c}">${getBaseTileSymbol(r, c)}</div>`;
      }
    }

    containerEl.innerHTML = `
      <div class="game-shell">
        <div class="bar-controls" style="width:100%; max-width:980px;">
          <div class="bar-group">
            <button class="ascii-btn" id="shep-retry">[R] Reiniciar Nivel</button>
          </div>
          <div class="bar-group">
            <span id="shep-live-stats"></span>
            <button class="ascii-btn danger-btn" id="shep-exit">[ESC] Menú</button>
          </div>
        </div>

        <div class="game-workspace">
          <div class="corral-grid" id="shepherd-grid">${gridCellsHtml}</div>

          <div class="ascii-panel">
┌─────────────────────────────┐
│ PUNTOS POR ANIMAL           │
├─────────────────────────────┤
│ 🐑 Oveja   : +150 pts       │
│ 🐏 Carnero : +220 pts       │
│ 🐖 Cerdito : +300 pts       │
│ 🦙 Llama   : +420 pts       │
│ 🐇 Conejo  : +600 pts       │
├─────────────────────────────┤
│ Cada 1,000 pts = +1 Punto   │
│ de Gane en Tienda Tycoon.   │
└─────────────────────────────┘
          </div>
        </div>

        <div class="bar-controls" style="width:100%; max-width:980px;">
          <span>ESTADO: <b class="ascii-warn" id="shep-status-log">${statusBannerText}</b></span>
        </div>
      </div>
    `;

    cellEls = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    const gridEl = document.getElementById('shepherd-grid');
    if (gridEl) {
      gridEl.querySelectorAll('.corral-cell').forEach(el => {
        const r = parseInt(el.getAttribute('data-r'), 10);
        const c = parseInt(el.getAttribute('data-c'), 10);
        cellEls[r][c] = el;
      });

      gridEl.addEventListener('mousemove', (e) => {
        const target = e.target.closest('.corral-cell');
        if (target) {
          mouseR = parseInt(target.getAttribute('data-r'), 10);
          mouseC = parseInt(target.getAttribute('data-c'), 10);
        } else {
          const rect = gridEl.getBoundingClientRect();
          const relC = Math.floor(((e.clientX - rect.left) / Math.max(1, rect.width)) * COLS);
          const relR = Math.floor(((e.clientY - rect.top) / Math.max(1, rect.height)) * ROWS);
          mouseC = Math.max(1, Math.min(COLS - 2, relC));
          mouseR = Math.max(1, Math.min(ROWS - 2, relR));
        }
      });

      gridEl.addEventListener('mouseleave', () => {
        mouseR = -10;
        mouseC = -10;
      });
    }

    document.getElementById('shep-retry')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      startLevel(levelIdx);
    });
    document.getElementById('shep-exit')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      if (exitCallback) exitCallback();
    });
  }

  return {
    init(container, onExit) {
      containerEl = container;
      exitCallback = onExit;
      cellEls = [];
      score = 0;
      milestonesAwarded = 0;
      startLevel(0);
    },
    destroy() {
      if (physicsInterval) clearInterval(physicsInterval);
      if (nextLevelTimeout) clearTimeout(nextLevelTimeout);
      physicsInterval = null;
      nextLevelTimeout = null;
      cellEls = [];
      containerEl = null;
    },
    handleKey(e) {
      if (!containerEl) return;
      const k = e.key;
      if (k === 'r' || k === 'R') {
        e.preventDefault();
        startLevel(levelIdx);
      }
    }
  };
})();
