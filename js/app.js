/* ==========================================================================
   ASCI ON THE OFFICE - Main Hub, Stats & Section Router
   (Minijuegos separados de la Granja Tycoon y de la Pantalla de Tienda)
   ========================================================================== */

window.OfficeStats = (function () {
  const STORAGE_KEY = 'asci_on_the_office_stats_v2';
  let data = {
    highScores: {
      sudoku: 0,
      minesweeper: 0,
      snake: 0,
      tetris: 0,
      '2048': 0,
      wordoffice: 0,
      solitaire: 0,
      snowball: 0,
      shepherd: 0,
      farmer: 0
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

  function showRewardToast(text) {
    const toastEl = document.getElementById('farm-reward-toast');
    if (!toastEl) return;
    toastEl.textContent = `[🌱 ${text} | Juegos: ${data.gamesPlayed}]`;
    toastEl.style.display = 'inline-block';
    clearTimeout(toastEl._hideTimer);
    toastEl._hideTimer = setTimeout(() => {
      toastEl.style.display = 'none';
    }, 4500);
  }

  load();

  return {
    getHighScore(gameKey) {
      return data.highScores[gameKey] || 0;
    },
    getGamesPlayed() {
      return data.gamesPlayed || 0;
    },
    recordGameWin(gameKey, pts) {
      if (pts > (data.highScores[gameKey] || 0)) {
        data.highScores[gameKey] = pts;
      }
      // Solo los juegos por partida completada (Sudoku, Buscaminas, Wordle, Solitario)
      // dan recompensa al terminar; los de puntuación continua premian cada 1,000 pts.
      const puzzleGames = ['sudoku', 'minesweeper', 'wordoffice', 'solitaire'];
      if (puzzleGames.includes(gameKey) && window.GameFarmer) {
        data.gamesPlayed++;
        const rewardMsg = window.GameFarmer.grantMinigameReward('victoria');
        if (rewardMsg) showRewardToast(`🏆 +1 Gane | ${rewardMsg}`);
      }
      save();
    },
    incrementGamesPlayed() {
      // Abrir un juego ya no regala semillas ni puntos de gane gratis
    },
    awardTycoonWinPoints(count, sourceLabel = '1000 pts') {
      const pts = Math.max(1, Number(count) || 1);
      data.gamesPlayed += pts;
      let extraMsg = '';
      if (window.GameFarmer && window.GameFarmer.grantWinPointBonus) {
        extraMsg = ' | ' + window.GameFarmer.grantWinPointBonus(pts);
      }
      showRewardToast(`🏆 +${pts} Punto(s) de Gane (${sourceLabel})${extraMsg}`);
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
      if (total >= 8000) return 'CEO DEL ESCAQUEO';
      if (total >= 5000) return 'VP DE PROCRASTINACIÓN';
      if (total >= 3000) return 'GERENTE DE TIEMPO LIBRE';
      if (total >= 1500) return 'ANALISTA DEL CAFÉ';
      if (total >= 500) return 'ESPECIALISTA ALT+TAB';
      return 'BECARIO DE OFICINA';
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
    { id: 'green', label: 'Verde' },
    { id: 'amber', label: 'Ámbar' },
    { id: 'dos', label: 'DOS Azul' },
    { id: 'paper', label: 'Papel' },
    { id: 'cyber', label: 'Matrix' }
  ];

  // Los 7 minijuegos de oficina (separados del Tycoon)
  const GAMES = [
    {
      id: 'sudoku',
      num: '1',
      title: 'ZUDOKU 9x9',
      subtitle: 'Balance Contable',
      module: () => window.GameSudoku,
      icon: '╔══╦══╗\n║5 ║9 ║\n╠══╬══╣\n║  ║7 ║\n╚══╩══╝'
    },
    {
      id: 'minesweeper',
      num: '2',
      title: 'BUSCAMINAS',
      subtitle: 'Auditoría de Minas',
      module: () => window.GameMinesweeper,
      icon: '┌──┬──┐\n│1 │⚑ │\n├──┼──┤\n│2 │░░│\n└──┴──┘'
    },
    {
      id: 'snake',
      num: '3',
      title: 'SNAKE RED',
      subtitle: 'Culebrita Ethernet',
      module: () => window.GameSnake,
      icon: '╔═════╗\n║░█@@ ║\n║   ☕ ║\n║ $$  ║\n╚═════╝'
    },
    {
      id: 'tetris',
      num: '4',
      title: 'TETRIS ASCII',
      subtitle: 'Archivador Rápido',
      module: () => window.GameTetris,
      icon: '║  ▒▒ ║\n║▒▒▒▒ ║\n║  ██ ║\n║▓▓██ ║\n╚═════╝'
    },
    {
      id: '2048',
      num: '5',
      title: '2048 CAPITAL',
      subtitle: 'Fusión Financiera',
      module: () => window.Game2048,
      icon: '╔═════╗\n║ 512 ║\n╠═════╣\n║2048!║\n╚═════╝'
    },
    {
      id: 'wordoffice',
      num: '6',
      title: 'WORDLE & AHORCADO',
      subtitle: 'Palabras de Oficina',
      module: () => window.GameWordOffice,
      icon: '╔═╤═╤═╗\n║F│I│N║\n╚═╧═╧═╝\n (o_o) \n /│█│\\ '
    },
    {
      id: 'solitaire',
      num: '7',
      title: 'SOLITARIO',
      subtitle: 'Klondike Clásico',
      module: () => window.GameSolitaire,
      icon: '┌─────┐\n│A♠ K♥│\n│  ♠  │\n│   ♠A│\n└─────┘'
    },
    {
      id: 'snowball',
      num: '8',
      title: 'BOLA DE NIEVE',
      subtitle: 'Avalancha (1G c/1000)',
      module: () => window.GameSnowball,
      icon: '║ ░░░ ║\n║(███)║\n║     ║\n║▲▲ ▓▓║\n╚═════╝'
    },
    {
      id: 'shepherd',
      num: '9',
      title: 'FUGA DE OVEJAS',
      subtitle: 'Pastoreo con Mouse',
      module: () => window.GameShepherd,
      icon: ' 🐕    \n  🐑🐇 \n╔═⚑·⚑═╗\n║ 🐑🦙║\n╚═════╝'
    }
  ];

  let activeSection = 'minigames'; // 'minigames' | 'playing_game' | 'farm' | 'shop'
  let activeGame = null;

  function updateNavHighlight() {
    const btnMini = document.getElementById('nav-minigames');
    const btnFarm = document.getElementById('nav-farm');
    const btnShop = document.getElementById('nav-shop');
    if (btnMini) btnMini.classList.toggle('active', activeSection === 'minigames' || activeSection === 'playing_game');
    if (btnFarm) btnFarm.classList.toggle('active', activeSection === 'farm');
    if (btnShop) btnShop.classList.toggle('active', activeSection === 'shop');
  }

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
    if (themeBtn) themeBtn.textContent = `[T] Tema: ${curTheme.label}`;
    if (crtBtn) crtBtn.textContent = `[L] CRT: ${window.OfficeStats.getCrt() ? 'ON' : 'OFF'}`;
    if (audioBtn) audioBtn.textContent = `[Audio: ${window.AsciiAudio.isEnabled() ? 'ON' : 'OFF'}]`;
  }

  function cleanupActiveModule() {
    if (activeGame && activeGame.destroy) {
      activeGame.destroy();
    }
    if (window.GameFarmer) {
      window.GameFarmer.destroy();
    }
    activeGame = null;
  }

  function launchGame(gameId) {
    const cfg = GAMES.find(g => g.id === gameId);
    if (!cfg) return;
    cleanupActiveModule();
    window.OfficeStats.incrementGamesPlayed(gameId);
    activeSection = 'playing_game';
    updateNavHighlight();

    activeGame = cfg.module();
    const viewport = document.getElementById('main-viewport');
    activeGame.init(viewport, () => {
      showMainMenu();
    });
  }

  function openFarm() {
    cleanupActiveModule();
    activeSection = 'farm';
    updateNavHighlight();
    const viewport = document.getElementById('main-viewport');
    if (viewport && window.GameFarmer) {
      window.GameFarmer.initFarm(viewport);
    }
  }

  function openShop() {
    cleanupActiveModule();
    activeSection = 'shop';
    updateNavHighlight();
    const viewport = document.getElementById('main-viewport');
    if (viewport && window.GameFarmer) {
      window.GameFarmer.initShop(viewport);
    }
  }

  function showMainMenu() {
    cleanupActiveModule();
    activeSection = 'minigames';
    updateNavHighlight();

    const viewport = document.getElementById('main-viewport');
    if (!viewport) return;

    const farmSum = window.GameFarmer
      ? window.GameFarmer.getSummary()
      : { cash: 0, unlocked: 4, totalSeeds: 0, fertilizer: 0 };

    const cardsHtml = GAMES.map(g => {
      const hi = window.OfficeStats.getHighScore(g.id);
      const iconLines = g.icon.split('\n');
      return `<div class="game-card-ascii" data-game="${g.id}">┌──────────────────────────────┐
│ <span class="ascii-warn">[${g.num}]</span> <span class="ascii-bright">${g.title.padEnd(24, ' ')}</span> │
├─────────┬────────────────────┤
│ ${iconLines[0].padEnd(7, ' ')} │ ${g.subtitle.padEnd(18, ' ')} │
│ ${iconLines[1].padEnd(7, ' ')} │ Récord: <span class="ascii-info">${String(hi).padStart(8, ' ')}</span>   │
│ ${iconLines[2].padEnd(7, ' ')} │                    │
│ ${iconLines[3].padEnd(7, ' ')} │ <span class="ascii-bright"> >> JUGAR AHORA << </span>│
│ ${iconLines[4].padEnd(7, ' ')} │                    │
└─────────┴────────────────────┘</div>`;
    }).join('');

    viewport.innerHTML = `
      <div class="menu-container">
        <pre class="ascii-art ascii-bright">
╔══════════════════════════════════════════════════════════════════════════════════╗
║                        A S C I   O N   T H E   O F F I C E                       ║
╠══════════════════════════════════════════════════════════════════════════════════╣
║  Rango: <span class="ascii-warn">${window.OfficeStats.getRankTitle().padEnd(22, ' ')}</span> │ Partidas: <span class="ascii-info">${String(window.OfficeStats.getGamesPlayed()).padEnd(4, ' ')}</span> │ Semillas Ganadas: <span class="ascii-bright">${String(farmSum.totalSeeds).padEnd(4, ' ')}</span> ║
╚══════════════════════════════════════════════════════════════════════════════════╝</pre>

        <div class="bar-controls" style="width:100%;">
          <span>SALA DE MINIJUEGOS (Teclas 1-9)</span>
          <div class="bar-group">
            <button class="ascii-btn active" id="banner-goto-farm">[🌱 IR A MI GRANJA (${farmSum.unlocked}/16 Tierras)]</button>
            <button class="ascii-btn boss-btn" id="banner-goto-shop">[🏪 ABRIR TIENDA ($${farmSum.cash})]</button>
          </div>
        </div>

        <div class="games-grid">
          ${cardsHtml}
        </div>
      </div>
    `;

    document.getElementById('banner-goto-farm')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      openFarm();
    });
    document.getElementById('banner-goto-shop')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      openShop();
    });

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

    document.getElementById('nav-minigames')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      showMainMenu();
    });
    document.getElementById('nav-farm')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      openFarm();
    });
    document.getElementById('nav-shop')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      openShop();
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

    // Reloj y crecimiento de plantas en segundo plano
    setInterval(() => {
      if (!window.BossKey.isActive()) {
        window.OfficeStats.tickSecond();
        if (window.GameFarmer) {
          window.GameFarmer.backgroundTick();
        }
      }
      const clockEl = document.getElementById('office-clock');
      if (clockEl) {
        clockEl.textContent = new Date().toTimeString().slice(0, 8);
      }
    }, 1000);

    // Enrutador global de teclado
    window.addEventListener('keydown', (e) => {
      if (window.BossKey.isActive()) {
        window.BossKey.handleKey(e);
        return;
      }

      if (e.key === 'F9' || e.key === 'Tab') {
        e.preventDefault();
        window.BossKey.toggle();
        return;
      }

      if (e.key === 'Escape' && activeSection !== 'minigames') {
        e.preventDefault();
        window.AsciiAudio.click();
        showMainMenu();
        return;
      }

      if (activeSection === 'minigames') {
        if (e.key >= '1' && e.key <= '9') {
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

      if (activeSection === 'farm' && window.GameFarmer) {
        window.GameFarmer.handleKey(e);
        return;
      }

      if (activeSection === 'playing_game' && activeGame && activeGame.handleKey) {
        activeGame.handleKey(e);
      }
    });
  }

  return { init, showMainMenu, launchGame, openFarm, openShop };
})();

window.addEventListener('DOMContentLoaded', () => {
  window.AsciiOfficeApp.init();
});
