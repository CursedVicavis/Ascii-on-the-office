/* ==========================================================================
   ASCI ON THE OFFICE - Main Hub, Stats & Terminal OS Controller
   ========================================================================== */

window.OfficeStats = (function () {
  const STORAGE_KEY = 'asci_on_the_office_stats_v1';
  let data = {
    highScores: {
      sudoku: 0,
      minesweeper: 0,
      snake: 0,
      tetris: 0,
      '2048': 0,
      wordoffice: 0,
      solitaire: 0
    },
    gamesPlayed: 0,
    secondsSlacked: 0,
    theme: 'green',
    crt: true
  };

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        data = {
          ...data,
          ...parsed,
          highScores: { ...data.highScores, ...(parsed.highScores || {}) }
        };
      }
    } catch (_) {}
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (_) {}
  }

  load();

  return {
    getHighScore(gameKey) {
      return data.highScores[gameKey] || 0;
    },
    recordGameWin(gameKey, pts) {
      if (pts > (data.highScores[gameKey] || 0)) {
        data.highScores[gameKey] = pts;
      }
      save();
    },
    incrementGamesPlayed() {
      data.gamesPlayed++;
      save();
    },
    tickSecond() {
      data.secondsSlacked++;
      if (data.secondsSlacked % 10 === 0) save();
    },
    getTotalScore() {
      return Object.values(data.highScores).reduce((a, b) => a + b, 0);
    },
    getRankTitle() {
      const total = this.getTotalScore();
      if (total >= 8000) return 'CEO DEL ESCAQUEO SUPREMO';
      if (total >= 5000) return 'VP DE PROCRASTINACIÓN';
      if (total >= 3000) return 'GERENTE DE TIEMPO LIBRE';
      if (total >= 1500) return 'ANALISTA SENIOR DEL CAFÉ';
      if (total >= 500) return 'ESPECIALISTA EN ALT+TAB';
      return 'BECARIO DE FOTOCOPIAS';
    },
    getSlackedFormatted() {
      const s = data.secondsSlacked;
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      return `${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
    },
    getTheme() {
      return data.theme;
    },
    setTheme(t) {
      data.theme = t;
      save();
    },
    getCrt() {
      return data.crt;
    },
    setCrt(val) {
      data.crt = val;
      save();
    }
  };
})();

window.AsciiOfficeApp = (function () {
  const THEMES = [
    { id: 'green', label: 'Fósforo Verde' },
    { id: 'amber', label: 'Ámbar Ejecutivo' },
    { id: 'dos', label: 'IBM DOS Azul' },
    { id: 'paper', label: 'Papel Contable' },
    { id: 'cyber', label: 'Matrix Nocturno' }
  ];

  const GAMES = [
    {
      id: 'sudoku',
      num: '1',
      title: 'ZUDOKU CORPORATIVO',
      subtitle: 'Balance Contable 9x9',
      module: () => window.GameSudoku,
      art: [
        '╔═══╦═══╦═══╗',
        '║ 5 ║ · ║ 9 ║',
        '╠═══╬═══╬═══╣',
        '║ · ║ 7 ║ · ║',
        '╚═══╩═══╩═══╝'
      ],
      desc: 'Sudoku completo con 3 niveles, modo lápiz, pistas y validación.'
    },
    {
      id: 'minesweeper',
      num: '2',
      title: 'BUSCAMINAS AUDITOR',
      subtitle: 'Detección de Marrones',
      module: () => window.GameMinesweeper,
      art: [
        '┌───┬───┬───┐',
        '│ 1 │ ⚑ │░░░│',
        '├───┼───┼───┤',
        '│ 2 │ * │░░░│',
        '└───┴───┴───┘'
      ],
      desc: '3 tamaños de oficina, primer clic seguro, banderas y despeje rápido.'
    },
    {
      id: 'snake',
      num: '3',
      title: 'SNAKE ETHERNET',
      subtitle: 'Culebrita del Servidor',
      module: () => window.GameSnake,
      art: [
        '╔═══════════╗',
        '║  ░░██@@ ☕ ║',
        '║           ║',
        '║    $$     ║',
        '╚═══════════╝'
      ],
      desc: 'Recoge cafés y bonos esquivando los muros de los cubículos.'
    },
    {
      id: 'tetris',
      num: '4',
      title: 'TETRIS ARCHIVADOR',
      subtitle: 'Expedientes en Caída',
      module: () => window.GameTetris,
      art: [
        '║    ▒▒     ║',
        '║  ▒▒▒▒▒▒   ║',
        '║  ::  ██   ║',
        '║▓▓▓▓██████ ║',
        '╚═══════════╝'
      ],
      desc: 'Piezas fantasma, reserva (Hold), niveles de velocidad y récords.'
    },
    {
      id: '2048',
      num: '5',
      title: '2048 PRESUPUESTOS',
      subtitle: 'Fusión de Capitales',
      module: () => window.Game2048,
      art: [
        '╔═════╗╔═════╗',
        '║ 512 ║║1024 ║',
        '╚═════╝╚═════╝',
        '╔═════╗╔═════╗',
        '║  ·  ║║2048!║'
      ],
      desc: 'Fusiona desde un simple Café (2) hasta la Jubilación Dorada (2048).'
    },
    {
      id: 'wordoffice',
      num: '6',
      title: 'WORDLE & AHORCADO',
      subtitle: 'Jerga de Oficina',
      module: () => window.GameWordOffice,
      art: [
        '╔═══╤═══╤═══╗',
        '║[F]│(I)│ · ║',
        '╚═══╧═══╧═══╝',
        '  ║  (o_o)   ',
        '══╩══/│█│\\═══'
      ],
      desc: 'Incluye 2 juegos: Wordle de 5 letras y el Ahorcado de Recursos Humanos.'
    },
    {
      id: 'solitaire',
      num: '7',
      title: 'SOLITARIO KLONDIKE',
      subtitle: 'Paciencia Ejecutiva',
      module: () => window.GameSolitaire,
      art: [
        '┌─────┐ ┌─────┐',
        '│A♠   │ │K♥   │',
        '│  ♠  │ │  ♥  │',
        '│   ♠A│ │   ♥K│',
        '└─────┘ └─────┘'
      ],
      desc: 'El clásico de oficina en cartas ASCII con Auto-Subida inteligente.'
    }
  ];

  let activeGame = null;
  let activeGameId = null;

  function applyThemeAndCrt() {
    const t = window.OfficeStats.getTheme();
    if (t === 'green') document.body.removeAttribute('data-theme');
    else document.body.setAttribute('data-theme', t);

    if (window.OfficeStats.getCrt()) {
      document.body.classList.add('crt-enabled');
    } else {
      document.body.classList.remove('crt-enabled');
    }
    updateTopControlsText();
  }

  function cycleTheme() {
    const cur = window.OfficeStats.getTheme();
    const idx = THEMES.findIndex(t => t.id === cur);
    const next = THEMES[(idx + 1) % THEMES.length];
    window.OfficeStats.setTheme(next.id);
    window.AsciiAudio.click();
    applyThemeAndCrt();
  }

  function toggleCrt() {
    window.OfficeStats.setCrt(!window.OfficeStats.getCrt());
    window.AsciiAudio.click();
    applyThemeAndCrt();
  }

  function updateTopControlsText() {
    const curTheme = THEMES.find(t => t.id === window.OfficeStats.getTheme()) || THEMES[0];
    const themeBtn = document.getElementById('btn-theme');
    const crtBtn = document.getElementById('btn-crt');
    const audioBtn = document.getElementById('btn-audio');
    if (themeBtn) themeBtn.textContent = `[T] Monitor: ${curTheme.label}`;
    if (crtBtn) crtBtn.textContent = `[L] CRT: ${window.OfficeStats.getCrt() ? 'ON' : 'OFF'}`;
    if (audioBtn) audioBtn.textContent = `[Sonido: ${window.AsciiAudio.isEnabled() ? 'ON ♪' : 'MUTE'}]`;
  }

  function launchGame(gameId) {
    const cfg = GAMES.find(g => g.id === gameId);
    if (!cfg) return;
    if (activeGame && activeGame.destroy) {
      activeGame.destroy();
    }
    window.OfficeStats.incrementGamesPlayed();
    activeGameId = gameId;
    activeGame = cfg.module();
    const viewport = document.getElementById('main-viewport');
    activeGame.init(viewport, () => {
      showMainMenu();
    });
  }

  function showMainMenu() {
    if (activeGame && activeGame.destroy) {
      activeGame.destroy();
    }
    activeGame = null;
    activeGameId = null;

    const viewport = document.getElementById('main-viewport');
    if (!viewport) return;

    const cardsHtml = GAMES.map(g => {
      const hi = window.OfficeStats.getHighScore(g.id);
      const artBlock = g.art.map(line => '│  ' + line.padEnd(16, ' ') + '│').join('\n');
      return `<div class="game-card-ascii" data-game="${g.id}">╔══════════════════════════════════════╗
║ <span class="ascii-warn">[TECLA ${g.num}]</span> <span class="ascii-bright">${g.title.padEnd(26, ' ')}</span> ║
║ <span class="ascii-info">${g.subtitle.padEnd(36, ' ')}</span> ║
╟──────────────────┬───────────────────╢
${artBlock.split('\n').map((l, idx) => {
  const rightLines = [
    ` Récord: ${String(hi).padStart(7, ' ')} `,
    ` Estado: [LISTO] `,
    `                 `,
    `  >> EJECUTAR << `,
    `                 `
  ];
  return l + rightLines[idx] + '║';
}).join('\n')}
╟──────────────────┴───────────────────╢
║ ${g.desc.slice(0, 36).padEnd(36, ' ')} ║
║ ${g.desc.slice(36, 72).padEnd(36, ' ')} ║
╚══════════════════════════════════════╝</div>`;
    }).join('');

    viewport.innerHTML = `
      <div class="menu-container">
        <pre class="ascii-art ascii-bright">
 ╔══════════════════════════════════════════════════════════════════════════════════════════════╗
 ║     █████╗ ███████╗ ██████╗██╗     ██████╗ ███╗   ██╗    ████████╗██╗  ██╗███████╗           ║
 ║    ██╔══██╗██╔════╝██╔════╝██║    ██╔═══██╗████╗  ██║    ╚══██╔══╝██║  ██║██╔════╝           ║
 ║    ███████║███████╗██║     ██║    ██║   ██║██╔██╗ ██║       ██║   ███████║█████╗             ║
 ║    ██╔══██║╚════██║██║     ██║    ██║   ██║██║╚██╗██║       ██║   ██╔══██║██╔══╝             ║
 ║    ██║  ██║███████║╚██████╗██║    ╚██████╔╝██║ ╚████║       ██║   ██║  ██║███████╗           ║
 ║    ╚═╝  ╚═╝╚══════╝ ╚═════╝╚═╝     ╚═════╝ ╚═╝  ╚═══╝       ╚═╝   ╚═╝  ╚═╝╚══════╝           ║
 ║                     ██████╗ ███████╗███████╗██╗ ██████╗███████╗                              ║
 ║                    ██╔═══██╗██╔════╝██╔════╝██║██╔════╝██╔════╝                              ║
 ║                    ██║   ██║█████╗  █████╗  ██║██║     █████╗                                ║
 ║                    ██║   ██║██╔══╝  ██╔══╝  ██║██║     ██╔══╝                                ║
 ║                    ╚██████╔╝██║     ██║     ██║╚██████╗███████╗                              ║
 ║                     ╚═════╝ ╚═╝     ╚═╝     ╚═╝ ╚═════╝╚══════╝                              ║
 ╠══════════════════════════════════════════════════════════════════════════════════════════════╣
 ║  SUITE EJECUTIVA DE ENTRETENIMIENTO EN TEXTO PURO  │  Rango: <span class="ascii-warn">${window.OfficeStats.getRankTitle().padEnd(30, ' ')}</span> ║
 ║  Tiempo escaqueado hoy: <span id="slack-timer" class="ascii-info">${window.OfficeStats.getSlackedFormatted()}</span>            │  Puntos Totales: <span class="ascii-bright">${String(window.OfficeStats.getTotalScore()).padStart(8, '0')}</span>             ║
 ╚══════════════════════════════════════════════════════════════════════════════════════════════╝</pre>

        <div class="games-grid">
          ${cardsHtml}
        </div>

        <pre class="ascii-art ascii-secondary">
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│  ATAJOS GLOBALES: [1-7] Abrir Juego │ [F9 / TAB] ¡JEFE CERCA! (Pantalla Excel/Logs/SQL)      │
│                   [T] Cambiar Color │ [L] Filtro CRT          │ [ESC] Volver al Menú         │
└──────────────────────────────────────────────────────────────────────────────────────────────┘</pre>
      </div>
    `;

    viewport.querySelectorAll('.game-card-ascii').forEach(card => {
      card.addEventListener('click', () => {
        window.AsciiAudio.click();
        launchGame(card.getAttribute('data-game'));
      });
    });
  }

  function init() {
    applyThemeAndCrt();
    showMainMenu();

    document.getElementById('btn-home')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      showMainMenu();
    });
    document.getElementById('btn-theme')?.addEventListener('click', () => cycleTheme());
    document.getElementById('btn-crt')?.addEventListener('click', () => toggleCrt());
    document.getElementById('btn-audio')?.addEventListener('click', () => {
      window.AsciiAudio.toggle();
      updateTopControlsText();
    });
    document.getElementById('btn-boss')?.addEventListener('click', () => {
      window.BossKey.toggle();
    });

    // Reloj y contador de procrastinación
    setInterval(() => {
      if (!window.BossKey.isActive()) {
        window.OfficeStats.tickSecond();
        const slackEl = document.getElementById('slack-timer');
        if (slackEl) slackEl.textContent = window.OfficeStats.getSlackedFormatted();
      }
      const clockEl = document.getElementById('office-clock');
      if (clockEl) {
        const now = new Date();
        clockEl.textContent = now.toTimeString().slice(0, 8);
      }
    }, 1000);

    // Enrutador global de teclado
    window.addEventListener('keydown', (e) => {
      // Si el modo Boss Key está activo, intercepta todo
      if (window.BossKey.isActive()) {
        window.BossKey.handleKey(e);
        return;
      }

      // Activación rápida de Boss Key con F9 o Tab
      if (e.key === 'F9' || e.key === 'Tab') {
        e.preventDefault();
        window.BossKey.toggle();
        return;
      }

      // Volver al menú principal con Escape si estamos dentro de un juego
      if (e.key === 'Escape' && activeGame) {
        e.preventDefault();
        window.AsciiAudio.click();
        showMainMenu();
        return;
      }

      // Si estamos en el menú principal
      if (!activeGame) {
        if (e.key >= '1' && e.key <= '7') {
          e.preventDefault();
          const idx = parseInt(e.key, 10) - 1;
          if (GAMES[idx]) {
            window.AsciiAudio.click();
            launchGame(GAMES[idx].id);
          }
        } else if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          cycleTheme();
        } else if (e.key === 'l' || e.key === 'L') {
          e.preventDefault();
          toggleCrt();
        }
        return;
      }

      // Delegar al juego activo
      if (activeGame && activeGame.handleKey) {
        activeGame.handleKey(e);
      }
    });
  }

  return { init, showMainMenu, launchGame };
})();

window.addEventListener('DOMContentLoaded', () => {
  window.AsciiOfficeApp.init();
});
