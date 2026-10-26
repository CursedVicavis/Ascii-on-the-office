/* ==========================================================================
   ASCI ON THE OFFICE - Juego 8: AVALANCHA CAÓTICA (Bola de Nieve en Montaña)
   - Alta densidad caótica de objetos (Pinos, Rocas, Cabañas, Esquiadores en
     movimiento lateral, Rampas de Salto y Nieve Polvo) validados por DP para
     que siempre exista al menos un hueco esquivable.
   - Aceleración progresiva: cada 500 puntos aumenta el nivel de velocidad y
     la intensidad de objetos.
   - Cada 1,000 puntos = +1 Punto de Gane para la Tienda del Tycoon.
   ========================================================================== */

window.GameSnowball = (function () {
  let containerEl = null;
  let exitCallback = null;
  let loopInterval = null;

  const WIDTH = 114;
  const HEIGHT = 22;
  const PLAYER_ROW = 3;
  const PLAYER_STEP = 6;
  const SPEED_UP_EVERY_PTS = 500; // Acelera el paso cada 500 puntos

  const SIZES = [
    { level: 1, name: 'Bola Pequeña', art: '(o)', radius: 2, mult: 1, ptsPerTick: 14 },
    { level: 2, name: 'Bola Mediana', art: '(███)', radius: 3, mult: 2, ptsPerTick: 28 },
    { level: 3, name: 'Bola Grande', art: '(█████)', radius: 4, mult: 4, ptsPerTick: 50 },
    { level: 4, name: 'Bola Gigante', art: '((███████))', radius: 6, mult: 7, ptsPerTick: 85 },
    { level: 5, name: '¡AVALANCHA!', art: '(((███████████)))', radius: 8, mult: 12, ptsPerTick: 140 }
  ];

  let ballX = Math.floor(WIDTH / 2);
  let snowMass = 0;
  let score = 0;
  let bestScore = 0;
  let distance = 0;
  let speedLevel = 1;
  let currentTickMs = 95;
  let airborneTicks = 0; // Cuando salta en una rampa [^^^], vuela sobre obstáculos
  let milestonesAwarded = 0;
  let obstaclesDodged = 0;
  let paused = false;
  let gameOver = false;
  let crashReason = '';

  let safeCorridorX = Math.floor(WIDTH / 2);
  let safeCorridorDir = 1;

  // Entidades: { x, y, vx, type, radius, art, cls }
  let entities = [];

  function getSizeConfig() {
    const idx = Math.min(SIZES.length - 1, Math.floor(snowMass / 22));
    return SIZES[idx];
  }

  function computeTickMsForLevel(lvl) {
    // Empieza en 95ms y baja progresivamente hasta 34ms en niveles altos
    return Math.max(34, Math.round(95 * Math.pow(0.89, lvl - 1)));
  }

  function updateSpeedByScore() {
    const newSpeedLvl = 1 + Math.floor(score / SPEED_UP_EVERY_PTS);
    if (newSpeedLvl > speedLevel) {
      speedLevel = newSpeedLvl;
      const newMs = computeTickMsForLevel(speedLevel);
      if (newMs !== currentTickMs) {
        currentTickMs = newMs;
        if (loopInterval) clearInterval(loopInterval);
        loopInterval = setInterval(tick, currentTickMs);
      }
    }
  }

  function checkMilestones() {
    const m = Math.floor(score / 1000);
    if (m > milestonesAwarded) {
      const gained = m - milestonesAwarded;
      milestonesAwarded = m;
      window.AsciiAudio.clearLine();
      if (window.OfficeStats && window.OfficeStats.awardTycoonWinPoints) {
        window.OfficeStats.awardTycoonWinPoints(gained, 'Bola de Nieve (1000 pts)');
      }
    }
    updateSpeedByScore();
  }

  // =========================================================================
  // ALGORITMO DP PARA PERMITIR CAOS DENSO PERO SIEMPRE 100% ESQUIVABLE
  // =========================================================================
  function isCandidateObstacleSkippable(candX, candRadius) {
    const sz = getSizeConfig();
    const effectiveBallRadius = Math.min(8, sz.radius + 1);
    const minX = effectiveBallRadius + 2;
    const maxX = WIDTH - 3 - effectiveBallRadius;

    // 1. Mantener libre un canal zigzagueante ajustado para garantizar paso
    const corridorHalfWidth = effectiveBallRadius + 5;
    if (Math.abs(candX - safeCorridorX) < corridorHalfWidth + candRadius) {
      return false;
    }

    // 2. Evitar solapamiento directo con otro objeto ya puesto en la misma fila
    for (const ent of entities) {
      if (ent.y === HEIGHT - 1) {
        if (Math.abs(ent.x - candX) <= ent.radius + candRadius + 2) {
          return false;
        }
      }
    }

    // 3. Simulación DP de alcanzabilidad desde la fila del jugador hasta el fondo
    let reachable = new Array(WIDTH).fill(false);
    for (let x = Math.max(minX, ballX - PLAYER_STEP); x <= Math.min(maxX, ballX + PLAYER_STEP); x++) {
      reachable[x] = true;
    }

    for (let row = PLAYER_ROW + 1; row < HEIGHT; row++) {
      const nextReachable = new Array(WIDTH).fill(false);

      const rowObstacles = entities.filter(
        e => e.y === row && e.type !== 'snow' && e.type !== 'ramp' && !(sz.level >= 4 && e.type === 'tree')
      );
      if (row === HEIGHT - 1) {
        rowObstacles.push({ x: candX, radius: candRadius });
      }

      for (let x = minX; x <= maxX; x++) {
        let canReachFromPrev = false;
        for (let px = Math.max(minX, x - PLAYER_STEP); px <= Math.min(maxX, x + PLAYER_STEP); px++) {
          if (reachable[px]) {
            canReachFromPrev = true;
            break;
          }
        }
        if (!canReachFromPrev) continue;

        let blocked = false;
        for (const obs of rowObstacles) {
          if (Math.abs(x - obs.x) <= effectiveBallRadius + obs.radius + 1) {
            blocked = true;
            break;
          }
        }
        if (!blocked) {
          nextReachable[x] = true;
        }
      }

      reachable = nextReachable;
    }

    let safeCount = 0;
    for (let x = minX; x <= maxX; x++) {
      if (reachable[x]) safeCount++;
    }

    return safeCount >= 14;
  }

  function advanceSafeCorridor() {
    const margin = 16;
    if (Math.random() < 0.35) {
      safeCorridorDir = -safeCorridorDir;
    }
    const shift = 4 + Math.floor(Math.random() * 4);
    safeCorridorX += safeCorridorDir * shift;
    if (safeCorridorX < margin) {
      safeCorridorX = margin;
      safeCorridorDir = 1;
    } else if (safeCorridorX > WIDTH - margin) {
      safeCorridorX = WIDTH - margin;
      safeCorridorDir = -1;
    }
  }

  function spawnRowEntities() {
    const y = HEIGHT - 1;
    advanceSafeCorridor();

    // 1. Nieve polvo (*❄*) y Rampas de salto ([^^^])
    const bonusCount = Math.random() < 0.75 ? 2 : 1;
    for (let b = 0; b < bonusCount; b++) {
      const bx = 5 + Math.floor(Math.random() * (WIDTH - 10));
      if (Math.random() < 0.22) {
        entities.push({
          x: bx,
          y,
          vx: 0,
          type: 'ramp',
          radius: 2,
          art: '[^^^]',
          cls: 'ascii-warn'
        });
      } else {
        entities.push({
          x: bx,
          y,
          vx: 0,
          type: 'snow',
          radius: 1,
          art: '*❄*',
          cls: 'ascii-info'
        });
      }
    }

    // 2. Alta densidad caótica de obstáculos (de 3 a 7 por fila según el nivel de velocidad)
    const targetObstacles = Math.min(8, 3 + Math.floor(speedLevel / 2) + (Math.random() < 0.6 ? 1 : 0));

    for (let i = 0; i < targetObstacles; i++) {
      const kindRoll = Math.random();
      let type = 'tree';
      let radius = 2;
      let art = '▲▲▲▲▲';
      let cls = 'ascii-bright';
      let vx = 0;

      if (kindRoll < 0.36) {
        type = 'tree';
        radius = 2;
        art = '▲▲▲▲▲';
        cls = 'ascii-bright';
      } else if (kindRoll < 0.66) {
        type = 'rock';
        radius = 2;
        art = '▓▓▓▓▓';
        cls = 'ascii-danger';
      } else if (kindRoll < 0.84) {
        type = 'skier';
        radius = 1;
        vx = Math.random() < 0.5 ? -1 : 1;
        art = vx < 0 ? '◄\\o/' : '\\o/►';
        cls = 'ascii-info';
      } else {
        type = 'cabin';
        radius = 3;
        art = '[#####]';
        cls = 'ascii-warn';
      }

      for (let attempt = 0; attempt < 10; attempt++) {
        const candX = 5 + Math.floor(Math.random() * (WIDTH - 10));
        if (isCandidateObstacleSkippable(candX, radius)) {
          entities.push({ x: candX, y, vx, type, radius, art, cls });
          break;
        }
      }
    }
  }

  function startNewGame() {
    ballX = Math.floor(WIDTH / 2);
    safeCorridorX = ballX;
    snowMass = 0;
    score = 0;
    distance = 0;
    speedLevel = 1;
    currentTickMs = computeTickMsForLevel(1);
    airborneTicks = 0;
    milestonesAwarded = 0;
    obstaclesDodged = 0;
    paused = false;
    gameOver = false;
    crashReason = '';
    entities = [];

    if (window.OfficeStats) {
      bestScore = window.OfficeStats.getHighScore('snowball');
    }

    // Pre-poblar algunas filas iniciales para que la montaña empiece con acción inmediata
    for (let r = HEIGHT - 10; r < HEIGHT - 1; r += 2) {
      for (let k = 0; k < 3; k++) {
        const rx = 6 + Math.floor(Math.random() * (WIDTH - 12));
        if (Math.abs(rx - ballX) > 16) {
          entities.push({
            x: rx,
            y: r,
            vx: 0,
            type: Math.random() < 0.5 ? 'tree' : 'rock',
            radius: 2,
            art: Math.random() < 0.5 ? '▲▲▲▲▲' : '▓▓▓▓▓',
            cls: 'ascii-bright'
          });
        }
      }
    }

    if (loopInterval) clearInterval(loopInterval);
    loopInterval = setInterval(tick, currentTickMs);
    render();
  }

  function moveBall(dx) {
    if (paused || gameOver) return;
    const sz = getSizeConfig();
    const minX = sz.radius + 2;
    const maxX = WIDTH - 3 - sz.radius;
    ballX = Math.max(minX, Math.min(maxX, ballX + dx));
    updateSlopeDom();
  }

  function tick() {
    if (paused || gameOver || window.BossKey.isActive()) return;

    distance++;
    snowMass = Math.min(100, snowMass + 0.65);
    if (airborneTicks > 0) airborneTicks--;

    const sz = getSizeConfig();
    score += sz.ptsPerTick + (speedLevel - 1) * 5;

    for (const ent of entities) {
      ent.y -= 1;
      // Movimiento lateral de los esquiadores en pánico
      if (ent.vx !== 0 && ent.y > PLAYER_ROW + 2) {
        const nextX = ent.x + ent.vx;
        if (nextX <= 4 || nextX >= WIDTH - 5) {
          ent.vx = -ent.vx;
        } else {
          ent.x = nextX;
        }
      }
    }

    const remaining = [];
    for (const ent of entities) {
      if (ent.y < 0) {
        if (ent.type !== 'snow' && ent.type !== 'ramp') obstaclesDodged++;
        continue;
      }

      if (ent.y === PLAYER_ROW) {
        const dist = Math.abs(ent.x - ballX);
        const hitDist = sz.radius + ent.radius;
        if (dist <= hitDist) {
          if (ent.type === 'snow') {
            snowMass = Math.min(100, snowMass + 12);
            score += 120 * sz.mult;
            window.AsciiAudio.score();
            continue;
          } else if (ent.type === 'ramp') {
            airborneTicks = 5;
            score += 200 * sz.mult;
            window.AsciiAudio.clearLine();
            continue;
          } else if (airborneTicks > 0) {
            // Si está saltando por el aire gracias a una rampa, pasa por encima sin chocar
            score += 80 * sz.mult;
          } else if (ent.type === 'tree' || ent.type === 'skier') {
            if (sz.level >= 4) {
              score += 160 * sz.mult;
              snowMass = Math.max(45, snowMass - 14);
              window.AsciiAudio.score();
              continue;
            } else {
              triggerCrash(
                ent.type === 'skier'
                  ? '¡Arrollaste a un Esquiador (\\o/) siendo demasiado pequeño!'
                  : '¡Chocaste contra un Pino Alpino (▲▲▲▲▲)!'
              );
              return;
            }
          } else if (ent.type === 'rock') {
            triggerCrash('¡Chocaste contra una Roca Granítica (▓▓▓▓▓)!');
            return;
          } else if (ent.type === 'cabin') {
            triggerCrash('¡Impactaste contra una Cabaña ([#####])!');
            return;
          }
        }
      }
      remaining.push(ent);
    }
    entities = remaining;

    spawnRowEntities();
    checkMilestones();

    if (score > bestScore) {
      bestScore = score;
      if (window.OfficeStats) window.OfficeStats.recordGameWin('snowball', score);
    }

    updateSlopeDom();
  }

  function triggerCrash(reason) {
    gameOver = true;
    crashReason = reason;
    window.AsciiAudio.explosion();
    if (window.OfficeStats && score > 0) {
      window.OfficeStats.recordGameWin('snowball', score);
    }
    updateSlopeDom();
  }

  function buildSlopeHtml() {
    const grid = Array.from({ length: HEIGHT }, (_, r) =>
      Array.from({ length: WIDTH }, (_, c) => {
        if (c === 0 || c === WIDTH - 1) return '║';
        return (r * 7 + c * 3 + distance) % 23 === 0 ? '·' : ' ';
      })
    );

    for (const ent of entities) {
      if (ent.y >= 0 && ent.y < HEIGHT) {
        const startX = Math.max(1, ent.x - Math.floor(ent.art.length / 2));
        for (let i = 0; i < ent.art.length; i++) {
          const cx = startX + i;
          if (cx > 0 && cx < WIDTH - 1) {
            grid[ent.y][cx] = `<span class="${ent.cls}">${ent.art[i]}</span>`;
          }
        }
      }
    }

    const sz = getSizeConfig();
    for (let trailY = 0; trailY < PLAYER_ROW; trailY++) {
      const leftTrail = Math.max(1, ballX - sz.radius);
      const rightTrail = Math.min(WIDTH - 2, ballX + sz.radius);
      grid[trailY][leftTrail] = '<span class="ascii-dim">░</span>';
      grid[trailY][rightTrail] = '<span class="ascii-dim">░</span>';
    }

    const ballArt = airborneTicks > 0 ? `^${sz.art}^` : sz.art;
    const startBallX = Math.max(1, ballX - Math.floor(ballArt.length / 2));
    const cls = gameOver
      ? 'ascii-danger'
      : airborneTicks > 0
      ? 'ascii-info'
      : sz.level >= 4
      ? 'ascii-warn'
      : 'ascii-bright';

    if (sz.level >= 3 && PLAYER_ROW > 1) {
      const capArt = '▄'.repeat(Math.max(3, sz.art.length - 4));
      const startCapX = Math.max(1, ballX - Math.floor(capArt.length / 2));
      for (let i = 0; i < capArt.length; i++) {
        const cx = startCapX + i;
        if (cx > 0 && cx < WIDTH - 1) grid[PLAYER_ROW - 1][cx] = `<span class="${cls}">${capArt[i]}</span>`;
      }
    }

    for (let i = 0; i < ballArt.length; i++) {
      const cx = startBallX + i;
      if (cx > 0 && cx < WIDTH - 1) {
        grid[PLAYER_ROW][cx] = `<span class="${cls}">${ballArt[i]}</span>`;
      }
    }

    const topBorder = '╔' + '═'.repeat(WIDTH - 2) + '╗';
    const botBorder = '╚' + '═'.repeat(WIDTH - 2) + '╝';
    const rows = grid.map(r => r.join(''));

    let banner = '';
    if (gameOver) {
      banner = `\n<span class="ascii-danger">╔══════════════════════════════════════════════════════════════════════════╗
║ ${crashReason.padEnd(72, ' ')} ║
║ Puntos: ${String(score).padEnd(9)} │ Velocidad: Niv ${String(speedLevel).padEnd(3)} │ Pts Gane Tycoon: +${String(milestonesAwarded).padEnd(11)} ║
║ Presiona [ESPACIO] o [R] para lanzar otra bola de nieve                  ║
╚══════════════════════════════════════════════════════════════════════════╝</span>`;
    }

    return [topBorder, ...rows, botBorder].join('\n') + banner;
  }

  function buildTopTelemetryHtml() {
    const sz = getSizeConfig();
    const airTxt = airborneTicks > 0 ? ' <span class="ascii-info">[¡SALTANDO!]</span>' : '';
    return `PUNTOS: <span class="ascii-warn">${String(score).padStart(7, '0')}</span> │ VELOCIDAD: <span class="ascii-danger">⚡Niv ${speedLevel}</span> (c/500 pts) │ TAMAÑO: <span class="ascii-bright">${sz.name} (x${sz.mult})</span>${airTxt} │ GANE: <span class="ascii-warn">+${milestonesAwarded}</span>`;
  }

  function updateSlopeDom() {
    const slopeEl = document.getElementById('snowball-slope');
    const telemEl = document.getElementById('snowball-telemetry');
    if (slopeEl) slopeEl.innerHTML = buildSlopeHtml();
    if (telemEl) telemEl.innerHTML = buildTopTelemetryHtml();
  }

  function render() {
    if (!containerEl) return;

    containerEl.innerHTML = `
      <div class="game-shell">
        <div class="bar-controls" style="width:100%;">
          <div class="bar-group">
            <button class="ascii-btn" id="snow-new">[R] Reiniciar</button>
            <button class="ascii-btn" id="snow-pause">[P] Pausa</button>
            <button class="ascii-btn" id="snow-left">[◄◄ Izquierda (A)]</button>
            <button class="ascii-btn" id="snow-right">[Derecha (D) ►►]</button>
          </div>
          <div class="bar-group">
            <span id="snowball-telemetry">${buildTopTelemetryHtml()}</span>
            <button class="ascii-btn danger-btn" id="snow-exit">[ESC] Menú</button>
          </div>
        </div>

        <div class="ascii-panel" id="snowball-slope" style="cursor: ew-resize;">${buildSlopeHtml()}</div>

        <div class="bar-controls" style="width:100%;">
          <span>CAOS EN MONTAÑA: <span class="ascii-info">*❄*</span> Crecer │ <span class="ascii-warn">[^^^]</span> Rampa de Salto │ <span class="ascii-info">\\o/►</span> Esquiador Móvil │ <span class="ascii-bright">▲▲▲▲▲</span> Pino (Niv 4+ aplasta) │ <span class="ascii-danger">▓▓▓▓▓</span> Roca │ <span class="ascii-warn">[#####]</span> Cabaña</span>
        </div>
      </div>
    `;

    document.getElementById('snow-new')?.addEventListener('click', () => startNewGame());
    document.getElementById('snow-pause')?.addEventListener('click', () => {
      paused = !paused;
      updateSlopeDom();
    });
    document.getElementById('snow-left')?.addEventListener('click', () => moveBall(-PLAYER_STEP));
    document.getElementById('snow-right')?.addEventListener('click', () => moveBall(PLAYER_STEP));
    document.getElementById('snow-exit')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      if (exitCallback) exitCallback();
    });

    const slopeEl = document.getElementById('snowball-slope');
    if (slopeEl) {
      slopeEl.addEventListener('mousemove', (e) => {
        if (paused || gameOver) return;
        const rect = slopeEl.getBoundingClientRect();
        const relX = (e.clientX - rect.left) / Math.max(1, rect.width);
        const targetCol = Math.round(relX * (WIDTH - 1));
        const sz = getSizeConfig();
        ballX = Math.max(sz.radius + 2, Math.min(WIDTH - 3 - sz.radius, targetCol));
      });
    }
  }

  return {
    init(container, onExit) {
      containerEl = container;
      exitCallback = onExit;
      startNewGame();
    },
    destroy() {
      if (loopInterval) clearInterval(loopInterval);
      loopInterval = null;
      containerEl = null;
    },
    handleKey(e) {
      if (!containerEl) return;
      const k = e.key;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') {
        e.preventDefault();
        moveBall(-PLAYER_STEP);
      } else if (k === 'ArrowRight' || k === 'd' || k === 'D') {
        e.preventDefault();
        moveBall(PLAYER_STEP);
      } else if (k === 'p' || k === 'P') {
        e.preventDefault();
        paused = !paused;
        updateSlopeDom();
      } else if (k === 'r' || k === 'R' || (gameOver && k === ' ')) {
        e.preventDefault();
        startNewGame();
      }
    }
  };
})();
