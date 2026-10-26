/* ==========================================================================
   ASCI ON THE OFFICE - AGRO-OFFICE TYCOON & TIENDA CON NPC "STEVE EJECUTIVO"
   - Economía rebalanceada: recompensas escasas y valiosas.
   - NPC en la tienda: Steve de Minecraft con traje, corbata y maletín que
     comenta al entrar según la hora del día, los días que llevas jugando,
     tu cantidad de semillas y el progreso de tu jardín.
   ========================================================================== */

window.GameFarmer = (function () {
  const STORAGE_KEY = 'asci_office_farmer_save_v2';
  let containerEl = null;
  let currentView = 'farm'; // 'farm' | 'shop'
  let shopCategory = 'lands'; // 'lands' | 'supplies' | 'upgrades' | 'lab'
  let currentNpcSpeech = '';

  // Catálogo de 10 especies con economía ajustada y balanceada
  const PLANTS = {
    cactus: {
      id: 'cactus',
      name: 'Cactus Monitor',
      tier: 1,
      growTime: 28,
      waterRate: 2.0,
      cashYield: 8,
      seedYield: 1,
      shopPrice: 18,
      asciiStages: ['  ·.·  ', '  \\|/  ', '  \\Ψ/  ', ' 🌵\\Ψ/🌵'],
      desc: 'Resistente a la sequía. Da $8 y 1 semilla.'
    },
    cafe: {
      id: 'cafe',
      name: 'Cafeto Express',
      tier: 1,
      growTime: 34,
      waterRate: 2.8,
      cashYield: 12,
      seedYield: 1,
      shopPrice: 24,
      asciiStages: ['  ·o·  ', '  {y}  ', ' {☕}  ', '☕{☕}☕'],
      desc: 'Grano energético. Da $12 y 1 semilla.'
    },
    bambu: {
      id: 'bambu',
      name: 'Bambú Feng-Shui',
      tier: 1,
      growTime: 40,
      waterRate: 3.0,
      cashYield: 15,
      seedYield: 1,
      shopPrice: 30,
      asciiStages: ['  │·│  ', '  │╫│  ', ' ║╫║╫║ ', '🎋║╫║🎋'],
      desc: 'Planta de recepción. Da $15 y 1 semilla.'
    },
    suculenta: {
      id: 'suculenta',
      name: 'Suculenta USB',
      tier: 1,
      growTime: 30,
      waterRate: 2.2,
      cashYield: 10,
      seedYield: 1,
      shopPrice: 22,
      asciiStages: ['  (·)  ', '  (*)  ', ' (❀*❀) ', '💠(❀)💠'],
      desc: 'Brote compacto. Da $10 y 1 semilla.'
    },
    // --- TIER 2: HÍBRIDOS (Los cruces permiten multiplicar semillas: dan 2 semillas) ---
    bonsai: {
      id: 'bonsai',
      name: 'Bonsái Ejecutivo',
      tier: 2,
      growTime: 48,
      waterRate: 2.8,
      cashYield: 28,
      seedYield: 2,
      asciiStages: ['  ,.,  ', '  (♣)  ', ' (♣♣♣) ', '🌳♣♣♣🌳'],
      desc: 'Híbrido (Cactus + Bambú). Genera $28 y 2 semillas.'
    },
    espresso: {
      id: 'espresso',
      name: 'Árbol Espresso',
      tier: 2,
      growTime: 52,
      waterRate: 3.2,
      cashYield: 34,
      seedYield: 2,
      asciiStages: ['  ~o~  ', '  {♨}  ', ' ♨{☕}♨ ', '⚡☕☕☕⚡'],
      desc: 'Híbrido (Cafeto + Bambú). Genera $34 y 2 semillas.'
    },
    cibercactus: {
      id: 'cibercactus',
      name: 'Ciber-Cactus',
      tier: 2,
      growTime: 46,
      waterRate: 2.0,
      cashYield: 30,
      seedYield: 2,
      asciiStages: ['  [·]  ', ' [\\Ψ/] ', '⚡[\\Ψ/]⚡', '🛰️\\Ψ/🛰️'],
      desc: 'Híbrido (Cactus + Suculenta). Genera $30 y 2 semillas.'
    },
    helecho_crt: {
      id: 'helecho_crt',
      name: 'Helecho Neón',
      tier: 2,
      growTime: 50,
      waterRate: 3.0,
      cashYield: 36,
      seedYield: 2,
      asciiStages: ['  *·*  ', '  ❈❇❈  ', ' ❇❈❇❈❇ ', '✨❈❇❈✨'],
      desc: 'Híbrido (Cafeto + Suculenta). Genera $36 y 2 semillas.'
    },
    // --- TIER 3: MEGA-HÍBRIDOS ---
    arbol_bonos: {
      id: 'arbol_bonos',
      name: 'Árbol Dividendos',
      tier: 3,
      growTime: 65,
      waterRate: 3.2,
      cashYield: 75,
      seedYield: 2,
      asciiStages: ['  $·$  ', '  [$]  ', ' $[¥]$ ', '💰$¥$💰'],
      desc: 'Mega-Híbrido (Bonsái + Espresso). Da $75 y 2 semillas.'
    },
    servidor_gaia: {
      id: 'servidor_gaia',
      name: 'Bio-Servidor Gaia',
      tier: 3,
      growTime: 70,
      waterRate: 2.8,
      cashYield: 95,
      seedYield: 3,
      asciiStages: ['  <❀>  ', ' ╔═❀═╗ ', ' ♛╔❀╗♛ ', '👑♛❀♛👑'],
      desc: 'Mega-Híbrido (Ciber-Cactus + Helecho). Da $95 y 3 semillas.'
    }
  };

  const CROSS_RECIPES = [
    { a: 'cactus', b: 'bambu', result: 'bonsai', bonusSeeds: 1 },
    { a: 'cafe', b: 'bambu', result: 'espresso', bonusSeeds: 1 },
    { a: 'cactus', b: 'suculenta', result: 'cibercactus', bonusSeeds: 1 },
    { a: 'cafe', b: 'suculenta', result: 'helecho_crt', bonusSeeds: 1 },
    { a: 'bonsai', b: 'espresso', result: 'arbol_bonos', bonusSeeds: 1 },
    { a: 'cibercactus', b: 'helecho_crt', result: 'servidor_gaia', bonusSeeds: 1 }
  ];

  // Costos de desbloqueo de las 16 parcelas en Puntos de Gane (empieza solo con 2 parcelas)
  const PLOT_UNLOCK_REQS = [
    0, 0, 1, 2,
    4, 6, 9, 12,
    16, 20, 25, 30,
    36, 42, 50, 60
  ];

  const todayStr = new Date().toISOString().slice(0, 10);

  let state = {
    cash: 20,
    waterTank: 100,
    maxWaterTank: 100,
    fertilizer: 1,
    totalHarvests: 0,
    totalCrosses: 0,
    sprinklerLevel: 0,
    composterLevel: 0,
    compostProgress: 0,
    firstPlayDate: todayStr,
    visitedDates: [todayStr],
    shopVisits: 0,
    seeds: {
      cactus: 1,
      cafe: 1,
      bambu: 0,
      suculenta: 0,
      bonsai: 0,
      espresso: 0,
      cibercactus: 0,
      helecho_crt: 0,
      arbol_bonos: 0,
      servidor_gaia: 0
    },
    discovered: ['cactus', 'cafe', 'bambu', 'suculenta'],
    plots: Array.from({ length: 16 }, (_, idx) => ({
      id: idx,
      unlocked: idx < 2, // Solo 2 parcelas iniciales desbloqueadas
      plantId: null,
      growth: 0,
      water: 80,
      fertilized: false,
      hasSprinkler: false
    }))
  };

  let selectedPlotIdx = 0;
  let currentTool = 'plant';
  let selectedSeedId = 'cactus';
  let crossFirstPlotIdx = null;
  let statusLog = 'Selecciona una parcela para plantar, regar, abonar o cruzar.';

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        state = {
          ...state,
          ...parsed,
          seeds: { ...state.seeds, ...(parsed.seeds || {}) }
        };
        if (!Array.isArray(state.visitedDates)) {
          state.visitedDates = [todayStr];
        }
        if (!state.visitedDates.includes(todayStr)) {
          state.visitedDates.push(todayStr);
        }
        if (Array.isArray(parsed.plots) && parsed.plots.length === 16) {
          state.plots = parsed.plots.map((p, i) => ({
            id: i,
            unlocked: i < 2 ? true : !!p.unlocked,
            plantId: p.plantId || null,
            growth: Number(p.growth) || 0,
            water: Number(p.water ?? 80),
            fertilized: !!p.fertilized,
            hasSprinkler: !!p.hasSprinkler
          }));
        }
      }
    } catch (_) {}
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function getDaysPlayingCount() {
    const uniqueDays = Array.isArray(state.visitedDates) ? state.visitedDates.length : 1;
    if (state.firstPlayDate) {
      const diffMs = Date.now() - new Date(state.firstPlayDate).getTime();
      const calDays = Math.max(1, Math.floor(diffMs / 86400000) + 1);
      return Math.max(uniqueDays, calDays);
    }
    return Math.max(1, uniqueDays);
  }

  // =========================================================================
  // GENERADOR DE FRASES DINÁMICAS DE "STEVE EJECUTIVO" AL ENTRAR A LA TIENDA
  // Reacciona a: Hora del día, Días jugando, Cantidad de semillas y Progreso
  // =========================================================================
  function generateSteveGreeting() {
    const hour = new Date().getHours();
    const days = getDaysPlayingCount();
    const totalSeeds = Object.values(state.seeds).reduce((a, b) => a + b, 0);
    const unlockedPlots = state.plots.filter(p => p.unlocked).length;
    const plantedPlots = state.plots.filter(p => p.unlocked && p.plantId).length;
    const dryPlots = state.plots.filter(p => p.unlocked && p.plantId && p.water <= 15).length;
    const hybridsUnlocked = state.discovered.length - 4;

    // 1. Comentario según la HORA DEL DÍA
    let timePhrase = '';
    if (hour >= 0 && hour < 6) {
      timePhrase = `¿Son las ${hour}:00 de la madrugada y sigues en la oficina? Cuidado con los Phantoms al salir.`;
    } else if (hour >= 6 && hour < 12) {
      timePhrase = `Buenos días, socio. Corbata planchada, maletín cuadrado listo y el mercado abriendo.`;
    } else if (hour >= 12 && hour < 15) {
      timePhrase = `Hora del almuerzo. Yo traje una chuleta cocinada en mi maletín, ¿tú qué vas a llevar?`;
    } else if (hour >= 15 && hour < 19) {
      timePhrase = `Media tarde en la oficina... La mejor hora para cerrar tratos agrícolas sin que el jefe mire.`;
    } else {
      timePhrase = `Buenas noches. Ya casi apagan las antorchas del piso, hagamos esta transacción rápido.`;
    }

    // 2. Comentario según los DÍAS QUE LLEVAS JUGANDO
    let daysPhrase = '';
    if (days <= 1) {
      daysPhrase = `Veo que es tu Día #1 por aquí. Antes picaba bloques de diamante, ahora dirijo este puesto ejecutivo.`;
    } else if (days <= 3) {
      daysPhrase = `Ya llevas ${days} días operando conmigo. Se nota que te gusta el contrabando botánico.`;
    } else if (days <= 7) {
      daysPhrase = `${days} días en el negocio... Ya eres cliente VIP de mi maletín corporativo.`;
    } else {
      daysPhrase = `¡${days} días traficado semillas juntos! Ya somos socios mayoritarios de esta azotea.`;
    }

    // 3. Comentario según tu CANTIDAD DE SEMILLAS y DINERO
    let seedPhrase = '';
    if (totalSeeds === 0) {
      seedPhrase = `Traes el inventario con 0 semillas, más vacío que cofre saqueado. Gana minijuegos si quieres materia prima.`;
    } else if (totalSeeds <= 2) {
      seedPhrase = `Solo tienes ${totalSeeds} semilla(s) en reserva. Adminístralas con cabeza cuadrada, están escasas.`;
    } else if (totalSeeds <= 6) {
      seedPhrase = `Veo que guardas ${totalSeeds} semillas en el almacén. Buen colchón de activos.`;
    } else {
      seedPhrase = `¡Tienes ${totalSeeds} semillas acumuladas! Pareces aldeano granjero en plena cosecha.`;
    }

    // 4. Comentario según el PROGRESO DEL JARDÍN
    let gardenPhrase = '';
    if (dryPlots > 0) {
      gardenPhrase = `Por cierto: tienes ${dryPlots} planta(s) secándose allá afuera. Échales un cubo de agua antes de que paren.`;
    } else if (plantedPlots === 0) {
      gardenPhrase = `Tu jardín tiene 0 plantas sembradas ahora mismo. La tierra vacía no genera esmeraldas, amigo.`;
    } else if (hybridsUnlocked > 0) {
      gardenPhrase = `Me impresionan tus ${hybridsUnlocked} especie(s) híbrida(s) descubiertas y tus ${unlockedPlots}/16 tierras activas.`;
    } else if (unlockedPlots <= 2) {
      gardenPhrase = `Apenas tienes ${unlockedPlots}/16 parcelas abiertas (con ${plantedPlots} sembrada(s)). Juega más para expandir el chunk.`;
    } else {
      gardenPhrase = `Tu huerta va tomando forma: ${unlockedPlots}/16 tierras desbloqueadas y ${ state.totalHarvests } cosechas cerradas.`;
    }

    return {
      timePhrase,
      daysPhrase,
      seedPhrase,
      gardenPhrase
    };
  }

  function setLog(msg) {
    statusLog = msg;
    const logEl = document.getElementById('farmer-log');
    if (logEl) logEl.textContent = msg;
  }

  function getNeighbors(idx) {
    const r = Math.floor(idx / 4);
    const c = idx % 4;
    const res = [];
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < 4 && nc >= 0 && nc < 4) res.push(nr * 4 + nc);
    }
    return res;
  }

  function findCrossRecipe(plantA, plantB) {
    if (!plantA || !plantB) return null;
    return CROSS_RECIPES.find(
      r => (r.a === plantA && r.b === plantB) || (r.a === plantB && r.b === plantA)
    ) || null;
  }

  function getAvailableCrossForPlot(idx) {
    const p = state.plots[idx];
    if (!p.unlocked || !p.plantId || p.growth < 60) return null;
    for (const nIdx of getNeighbors(idx)) {
      const np = state.plots[nIdx];
      if (np.unlocked && np.plantId && np.growth >= 60) {
        const rec = findCrossRecipe(p.plantId, np.plantId);
        if (rec) return { neighborIdx: nIdx, recipe: rec };
      }
    }
    return null;
  }

  function discoverPlant(plantId) {
    if (!state.discovered.includes(plantId)) {
      state.discovered.push(plantId);
    }
  }

  function backgroundTick() {
    let changed = false;

    if (state.composterLevel > 0) {
      state.compostProgress += state.composterLevel * 1.5;
      if (state.compostProgress >= 100) {
        state.compostProgress = 0;
        state.fertilizer += 1;
        changed = true;
      }
    }

    for (let i = 0; i < 16; i++) {
      const plot = state.plots[i];
      if (!plot.unlocked) continue;

      if (plot.hasSprinkler || state.sprinklerLevel >= 2) {
        if (plot.water < 100) {
          plot.water = Math.min(100, plot.water + 15);
          changed = true;
        }
      } else if (state.sprinklerLevel === 1) {
        if (plot.water < 100) {
          plot.water = Math.min(100, plot.water + 4);
          changed = true;
        }
      }

      if (!plot.plantId) continue;
      const spec = PLANTS[plot.plantId];
      if (!spec) continue;

      if (plot.growth < 100 && plot.water > 0) {
        plot.water = Math.max(0, plot.water - spec.waterRate * 0.45);
        let baseRate = 100 / spec.growTime;
        if (plot.water >= 70) baseRate *= 1.2;
        if (plot.fertilized) baseRate *= 2.2;
        if (getNeighbors(i).some(n => state.plots[n].plantId === 'servidor_gaia')) {
          baseRate *= 1.35;
        }
        plot.growth = Math.min(100, plot.growth + baseRate);
        changed = true;
      }
    }

    if (changed) {
      saveState();
      if (containerEl && currentView === 'farm') {
        const gridEl = document.getElementById('farmer-grid-panel');
        if (gridEl) {
          gridEl.innerHTML = buildFarmGridHtml();
          bindGridPlotEvents();
        }
        const topStats = document.getElementById('farmer-top-stats');
        if (topStats) topStats.innerHTML = buildTopStatsText();
      }
    }
  }

  // Recompensa muy reducida: solo al ganar una partida (1 sola semilla base)
  function grantMinigameReward(reason = 'victoria') {
    if (reason !== 'victoria') return '';
    const tier1Keys = ['cactus', 'cafe', 'bambu', 'suculenta'];
    const pick = tier1Keys[Math.floor(Math.random() * tier1Keys.length)];
    state.seeds[pick] = (state.seeds[pick] || 0) + 1;
    let msg = `+1 Semilla ${PLANTS[pick].name}`;
    if (Math.random() < 0.35) {
      state.fertilizer += 1;
      msg += `, +1 Abono`;
    }
    saveState();
    return msg;
  }

  // Bono moderado cada 1,000 puntos (1 semilla y $6 por hito)
  function grantWinPointBonus(count = 1) {
    const tier1Keys = ['cactus', 'cafe', 'bambu', 'suculenta'];
    const pick = tier1Keys[Math.floor(Math.random() * tier1Keys.length)];
    const cashAdded = 6 * count;
    state.cash += cashAdded;
    state.seeds[pick] = (state.seeds[pick] || 0) + 1;
    saveState();
    return `+$${cashAdded}, +1 Semilla ${PLANTS[pick].name}`;
  }

  function unlockPlot(idx) {
    const plot = state.plots[idx];
    if (plot.unlocked) return;
    const reqGames = PLOT_UNLOCK_REQS[idx];
    const played = window.OfficeStats ? window.OfficeStats.getGamesPlayed() : 0;

    if (played >= reqGames) {
      plot.unlocked = true;
      plot.water = 85;
      window.AsciiAudio.win();
      setLog(`¡Parcela #${idx + 1} desbloqueada gracias a tus ${played} Puntos de Gane!`);
      saveState();
      render();
      return;
    }

    const buyoutCash = reqGames * 45;
    if (state.cash >= buyoutCash) {
      state.cash -= buyoutCash;
      plot.unlocked = true;
      plot.water = 85;
      window.AsciiAudio.win();
      setLog(`¡Parcela #${idx + 1} comprada por $${buyoutCash}!`);
      saveState();
      render();
      return;
    }

    window.AsciiAudio.error();
    setLog(`Parcela #${idx + 1}: Requiere ${reqGames} Puntos de Gane (tienes ${played}) o $${buyoutCash}.`);
  }

  function plantSeedOnPlot(idx, seedId) {
    const plot = state.plots[idx];
    if (!plot.unlocked) {
      unlockPlot(idx);
      return;
    }
    if (plot.plantId) {
      setLog(`La Parcela #${idx + 1} ya está ocupada.`);
      return;
    }
    if ((state.seeds[seedId] || 0) <= 0) {
      window.AsciiAudio.error();
      setLog(`No tienes semillas de ${PLANTS[seedId].name}. Gana minijuegos o compra en la Tienda.`);
      return;
    }
    state.seeds[seedId]--;
    plot.plantId = seedId;
    plot.growth = 0;
    plot.fertilized = false;
    window.AsciiAudio.click();
    setLog(`Plantaste ${PLANTS[seedId].name} en la Parcela #${idx + 1}.`);
    saveState();
    render();
  }

  function waterPlot(idx) {
    const plot = state.plots[idx];
    if (!plot.unlocked) return;
    plot.water = 100;
    window.AsciiAudio.move();
    setLog(`Parcela #${idx + 1} regada al 100%.`);
    saveState();
    render();
  }

  function waterAllPlots() {
    let count = 0;
    for (const p of state.plots) {
      if (p.unlocked && p.water < 100) {
        p.water = 100;
        count++;
      }
    }
    window.AsciiAudio.score();
    setLog(`Riego completado: ${count} parcelas hidratadas.`);
    saveState();
    render();
  }

  function fertilizePlot(idx) {
    const plot = state.plots[idx];
    if (!plot.unlocked || !plot.plantId) {
      setLog(`Elige una parcela con planta para abonar.`);
      return;
    }
    if (state.fertilizer <= 0) {
      window.AsciiAudio.error();
      setLog(`Sin abono disponible. Visita a Steve en la Tienda.`);
      return;
    }
    state.fertilizer--;
    plot.fertilized = true;
    plot.growth = Math.min(100, plot.growth + 30);
    window.AsciiAudio.score();
    setLog(`¡Parcela #${idx + 1} abonada! +30% crecimiento y velocidad x2.2.`);
    saveState();
    render();
  }

  function fertilizeAllPlots() {
    let applied = 0;
    for (const p of state.plots) {
      if (p.unlocked && p.plantId && (!p.fertilized || p.growth < 100) && state.fertilizer > 0) {
        state.fertilizer--;
        p.fertilized = true;
        p.growth = Math.min(100, p.growth + 30);
        applied++;
      }
    }
    if (applied > 0) {
      window.AsciiAudio.clearLine();
      setLog(`Abonaste ${applied} parcelas.`);
    } else {
      window.AsciiAudio.error();
      setLog(`No hay plantas por abonar o no tienes sacos de abono.`);
    }
    saveState();
    render();
  }

  function crossPlots(idxA, idxB) {
    const pA = state.plots[idxA];
    const pB = state.plots[idxB];
    if (!pA.unlocked || !pB.unlocked || !pA.plantId || !pB.plantId) {
      window.AsciiAudio.error();
      setLog(`Ambas parcelas deben tener plantas para cruzar.`);
      return;
    }
    if (pA.growth < 60 || pB.growth < 60) {
      window.AsciiAudio.error();
      setLog(`Ambas plantas necesitan al menos 60% de crecimiento para cruzar.`);
      return;
    }

    const recipe = findCrossRecipe(pA.plantId, pB.plantId);
    if (!recipe) {
      if (pA.plantId === pB.plantId) {
        state.seeds[pA.plantId] = (state.seeds[pA.plantId] || 0) + 1;
        pA.growth = Math.max(20, pA.growth - 40);
        pB.growth = Math.max(20, pB.growth - 40);
        state.totalCrosses++;
        window.AsciiAudio.score();
        setLog(`Polinización simple: +1 semilla de ${PLANTS[pA.plantId].name}.`);
        saveState();
        render();
        return;
      }
      window.AsciiAudio.error();
      setLog(`Especies incompatibles. Consulta las recetas en la Tienda.`);
      return;
    }

    const hybridId = recipe.result;
    const hybridSpec = PLANTS[hybridId];
    const gainedSeeds = recipe.bonusSeeds;
    state.seeds[hybridId] = (state.seeds[hybridId] || 0) + gainedSeeds;
    discoverPlant(hybridId);
    state.totalCrosses++;

    pA.growth = Math.max(20, pA.growth - 35);
    pB.growth = Math.max(20, pB.growth - 35);

    window.AsciiAudio.win();
    setLog(`¡Cruce genético exitoso! Obtuviste +${gainedSeeds} semilla de ${hybridSpec.name}.`);
    saveState();
    render();
  }

  function harvestPlot(idx) {
    const plot = state.plots[idx];
    if (!plot.unlocked || !plot.plantId) return;
    const spec = PLANTS[plot.plantId];
    if (plot.growth < 100) {
      window.AsciiAudio.error();
      setLog(`${spec.name} está al ${Math.floor(plot.growth)}%. Riega o abona para terminar.`);
      return;
    }

    const bonusSeeds = plot.fertilized && Math.random() < 0.5 ? 1 : 0;
    const totalSeedsGained = spec.seedYield + bonusSeeds;
    const cashGained = spec.cashYield + (plot.fertilized ? Math.ceil(spec.cashYield * 0.25) : 0);

    state.cash += cashGained;
    state.seeds[plot.plantId] = (state.seeds[plot.plantId] || 0) + totalSeedsGained;
    state.totalHarvests++;

    plot.plantId = null;
    plot.growth = 0;
    plot.fertilized = false;

    window.AsciiAudio.win();
    setLog(`¡Cosecha! +$${cashGained} y +${totalSeedsGained} semilla(s) de ${spec.name}.`);
    saveState();
    render();
  }

  function harvestAllReady() {
    let count = 0;
    for (let i = 0; i < 16; i++) {
      if (state.plots[i].unlocked && state.plots[i].plantId && state.plots[i].growth >= 100) {
        harvestPlot(i);
        count++;
      }
    }
    if (count === 0) setLog(`No hay plantas al 100% listas para cosechar.`);
  }

  function handlePlotClick(idx) {
    selectedPlotIdx = idx;
    const plot = state.plots[idx];

    if (!plot.unlocked) {
      unlockPlot(idx);
      return;
    }

    if (currentTool === 'water') {
      waterPlot(idx);
    } else if (currentTool === 'fertilize') {
      fertilizePlot(idx);
    } else if (currentTool === 'shovel') {
      if (plot.plantId) {
        plot.plantId = null;
        plot.growth = 0;
        plot.fertilized = false;
        window.AsciiAudio.click();
        setLog(`Parcela #${idx + 1} despejada.`);
        saveState();
        render();
      }
    } else if (currentTool === 'cross') {
      if (crossFirstPlotIdx === null) {
        if (!plot.plantId) {
          setLog(`Selecciona una parcela con planta (>=60%).`);
          return;
        }
        crossFirstPlotIdx = idx;
        window.AsciiAudio.move();
        setLog(`1ª planta elegida (#${idx + 1}). Haz clic en la 2ª planta para cruzar.`);
        render();
      } else if (crossFirstPlotIdx === idx) {
        const autoCross = getAvailableCrossForPlot(idx);
        if (autoCross) {
          const first = crossFirstPlotIdx;
          crossFirstPlotIdx = null;
          crossPlots(first, autoCross.neighborIdx);
        } else {
          crossFirstPlotIdx = null;
          render();
        }
      } else {
        const first = crossFirstPlotIdx;
        crossFirstPlotIdx = null;
        crossPlots(first, idx);
      }
    } else {
      if (plot.plantId) {
        if (plot.growth >= 100) harvestPlot(idx);
        else render();
      } else {
        plantSeedOnPlot(idx, selectedSeedId);
      }
    }
  }

  function makeAsciiBar(pct, width = 5, fillChar = '█', emptyChar = '░') {
    const clamped = Math.max(0, Math.min(100, pct));
    const filled = Math.round((clamped / 100) * width);
    return fillChar.repeat(filled) + emptyChar.repeat(width - filled);
  }

  function renderSinglePlotLines(idx) {
    const plot = state.plots[idx];
    const isSel = selectedPlotIdx === idx;
    const isCrossSrc = crossFirstPlotIdx === idx;
    const played = window.OfficeStats ? window.OfficeStats.getGamesPlayed() : 0;

    const topBorder = isSel ? '╔════════════════╗' : '┌────────────────┐';
    const botBorder = isSel ? '╚════════════════╝' : '└────────────────┘';
    const s = isSel ? '║' : '│';

    if (!plot.unlocked) {
      const req = PLOT_UNLOCK_REQS[idx];
      const canUnlock = played >= req;
      return [
        topBorder,
        `${s}<span class="${canUnlock ? 'ascii-warn' : 'ascii-dim'}">  TIERRA #${String(idx + 1).padStart(2, '0')}    </span>${s}`,
        `${s}<span class="ascii-dim">  Req: ${String(req).padStart(2, ' ')} Gane  </span>${s}`,
        `${s}<span class="${canUnlock ? 'ascii-bright' : 'ascii-dim'}"> ${canUnlock ? '[DESBLOQUEAR!]' : ' [BLOQUEADA]  '} </span>${s}`,
        botBorder
      ];
    }

    const fertIcon = plot.fertilized ? '★' : ' ';
    const header = `#${String(idx + 1).padStart(2, '0')}${fertIcon}`;

    if (!plot.plantId) {
      return [
        topBorder,
        `${s} ${header}  [VACÍA]  ${s}`,
        `${s}<span class="ascii-dim">    . · . ·     </span>${s}`,
        `${s}<span class="ascii-info"> [Clic:Plantar] </span>${s}`,
        botBorder
      ];
    }

    const spec = PLANTS[plot.plantId];
    const stageIdx = plot.growth >= 100 ? 3 : plot.growth >= 66 ? 2 : plot.growth >= 33 ? 1 : 0;
    const art = spec.asciiStages[stageIdx].padStart(8, ' ').padEnd(10, ' ');
    const gBar = makeAsciiBar(plot.growth, 5, '█', '░');
    const wBar = makeAsciiBar(plot.water, 5, '▓', '·');
    const crossReady = getAvailableCrossForPlot(idx);

    let foot = '';
    if (isCrossSrc) foot = `<span class="ascii-warn"> [CRUZANDO...]  </span>`;
    else if (plot.growth >= 100) foot = `<span class="ascii-warn"> [¡COSECHAR $!] </span>`;
    else if (plot.water <= 0) foot = `<span class="ascii-danger"> [¡REGAR AGUA!] </span>`;
    else if (crossReady) foot = `<span class="ascii-info"> [♥CRUCE LISTO] </span>`;
    else foot = ` C:[${gBar}] A:[${wBar}]`;

    const artCls = plot.growth >= 100 ? 'ascii-warn' : spec.tier === 3 ? 'ascii-info' : 'ascii-bright';

    return [
      topBorder,
      `${s} ${header} ${spec.name.slice(0, 9).padEnd(9, ' ')} ${s}`,
      `${s}   <span class="${artCls}">${art}</span>   ${s}`,
      `${s}${foot}${s}`,
      botBorder
    ];
  }

  function buildFarmGridHtml() {
    const out = [];
    for (let row = 0; row < 4; row++) {
      const indices = [row * 4, row * 4 + 1, row * 4 + 2, row * 4 + 3];
      const blocks = indices.map(i => renderSinglePlotLines(i));
      for (let lineIdx = 0; lineIdx < 5; lineIdx++) {
        const rowSegments = indices.map((plotIdx, colIdx) => {
          return `<span class="ascii-cell" data-plot="${plotIdx}">${blocks[colIdx][lineIdx]}</span>`;
        });
        out.push(rowSegments.join(' '));
      }
    }
    return out.join('\n');
  }

  function bindGridPlotEvents() {
    if (!containerEl) return;
    containerEl.querySelectorAll('[data-plot]').forEach(el => {
      el.addEventListener('click', () => {
        handlePlotClick(parseInt(el.getAttribute('data-plot'), 10));
      });
    });
  }

  function buildTopStatsText() {
    const played = window.OfficeStats ? window.OfficeStats.getGamesPlayed() : 0;
    const unlockedCount = state.plots.filter(p => p.unlocked).length;
    return `CAPITAL: <span class="ascii-warn">$${state.cash}</span> │ PTS DE GANE: <span class="ascii-info">${played}</span> │ TIERRAS: <span class="ascii-bright">${unlockedCount}/16</span> │ ABONO: <span class="ascii-warn">${state.fertilizer}</span>`;
  }

  // =========================================================================
  // VISTA 1: CAMPO DE CULTIVO (GRANJA)
  // =========================================================================
  function renderFarmScreen() {
    const seedButtonsHtml = Object.values(PLANTS).map(p => {
      const count = state.seeds[p.id] || 0;
      if (!state.discovered.includes(p.id) && count === 0) return '';
      const activeCls = selectedSeedId === p.id && currentTool === 'plant' ? 'active' : '';
      return `<button class="ascii-btn ${activeCls}" data-seed="${p.id}">• ${p.name.padEnd(15)} (x${count})</button>`;
    }).filter(Boolean).join('\n');

    containerEl.innerHTML = `
      <div class="game-shell">
        <div class="bar-controls" style="width:100%; max-width:940px;">
          <span id="farmer-top-stats">${buildTopStatsText()}</span>
          <button class="ascii-btn boss-btn" id="goto-shop-btn">[🏪 VISITAR TIENDA DE STEVE]</button>
        </div>

        <div class="bar-controls" style="width:100%; max-width:940px;">
          <div class="bar-group">
            <button class="ascii-btn ${currentTool === 'plant' ? 'active' : ''}" data-tool="plant">[P] Plantar/Cosechar</button>
            <button class="ascii-btn ${currentTool === 'water' ? 'active' : ''}" data-tool="water">[W] Regar</button>
            <button class="ascii-btn ${currentTool === 'fertilize' ? 'active' : ''}" data-tool="fertilize">[A] Abonar</button>
            <button class="ascii-btn ${currentTool === 'cross' ? 'active' : ''}" data-tool="cross">[X] Cruzar Plantas</button>
            <button class="ascii-btn ${currentTool === 'shovel' ? 'active' : ''}" data-tool="shovel">[B] Limpiar</button>
          </div>
          <div class="bar-group">
            <button class="ascii-btn" id="btn-water-all">[💧 Regar Todo]</button>
            <button class="ascii-btn" id="btn-fert-all">[★ Abonar Todo]</button>
            <button class="ascii-btn active" id="btn-harvest-all">[🌾 Cosechar Todo]</button>
          </div>
        </div>

        <div class="game-workspace">
          <div class="ascii-panel" id="farmer-grid-panel">${buildFarmGridHtml()}</div>

          <div class="ascii-panel">
┌─────────────────────────────┐
│ MIS SEMILLAS                │
├─────────────────────────────┤
${seedButtonsHtml}
├─────────────────────────────┤
│ <button class="ascii-btn boss-btn" id="side-shop-btn">[🏪 Ir a Tienda de Steve]</button>  │
└─────────────────────────────┘
          </div>
        </div>

        <div class="bar-controls" style="width:100%; max-width:940px;">
          <span>AVISO: <b class="ascii-info" id="farmer-log">${statusLog}</b></span>
        </div>
      </div>
    `;

    document.getElementById('goto-shop-btn')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      if (window.AsciiOfficeApp) window.AsciiOfficeApp.openShop();
    });
    document.getElementById('side-shop-btn')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      if (window.AsciiOfficeApp) window.AsciiOfficeApp.openShop();
    });

    containerEl.querySelectorAll('[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTool = btn.getAttribute('data-tool');
        crossFirstPlotIdx = null;
        window.AsciiAudio.click();
        render();
      });
    });

    containerEl.querySelectorAll('[data-seed]').forEach(btn => {
      btn.addEventListener('click', () => {
        selectedSeedId = btn.getAttribute('data-seed');
        currentTool = 'plant';
        window.AsciiAudio.click();
        setLog(`Semilla activa: ${PLANTS[selectedSeedId].name}. Haz clic en una parcela vacía.`);
        render();
      });
    });

    document.getElementById('btn-water-all')?.addEventListener('click', () => waterAllPlots());
    document.getElementById('btn-fert-all')?.addEventListener('click', () => fertilizeAllPlots());
    document.getElementById('btn-harvest-all')?.addEventListener('click', () => harvestAllReady());

    bindGridPlotEvents();
  }

  // =========================================================================
  // VISTA 2: PANTALLA DE TIENDA CON EL NPC "STEVE DE MINECRAFT CON TRAJE"
  // =========================================================================
  function buildSteveNpcBannerHtml() {
    const speech = currentNpcSpeech || generateSteveGreeting();
    const wrapLine = (txt, len = 58) => txt.slice(0, len).padEnd(len, ' ');

    return `┌─────────────────────────┬────────────────────────────────────────────────────────────────┐
│   <span class="ascii-bright">▄▄███████████████▄▄</span>   │ <span class="ascii-warn">STEVE EJECUTIVO (Gerente de Bloques y Suministros)</span>             │
│   <span class="ascii-bright">██░░░░░░░░░░░░░░░██</span>   │ ────────────────────────────────────────────────────────────── │
│   <span class="ascii-bright">██░░</span><span class="ascii-info">[▪]</span><span class="ascii-bright">░░░░░</span><span class="ascii-info">[▪]</span><span class="ascii-bright">░░██</span>   │ 💬 "${wrapLine(speech.timePhrase)}" │
│   <span class="ascii-bright">██░░░░░░</span><span class="ascii-secondary">███</span><span class="ascii-bright">░░░░░░██</span>   │                                                                │
│   <span class="ascii-bright">██░░░░</span><span class="ascii-secondary">▀▀███▀▀</span><span class="ascii-bright">░░░░██</span>   │ 💬 "${wrapLine(speech.daysPhrase)}" │
│   <span class="ascii-bright">▀▀███████████████▀▀</span>   │                                                                │
│  <span class="ascii-secondary">╔════╲</span>  <span class="ascii-bright">│</span><span class="ascii-danger">▼</span><span class="ascii-bright">│</span>  <span class="ascii-secondary">╱════╗</span>    │ 💬 "${wrapLine(speech.seedPhrase)}" │
│  <span class="ascii-secondary">║ ██ ║╲</span> <span class="ascii-bright">│</span><span class="ascii-danger">█</span><span class="ascii-bright">│</span> <span class="ascii-secondary">╱║ ██ ║</span>    │                                                                │
│  <span class="ascii-secondary">║ ██ ║</span> <span class="ascii-bright">╲│</span><span class="ascii-danger">█</span><span class="ascii-bright">│╱</span> <span class="ascii-secondary">║ ██ ║</span><span class="ascii-warn">┌─[::]─┐</span> 💬 "${wrapLine(speech.gardenPhrase)}" │
│  <span class="ascii-secondary">╚════╩══╧═╧══╩════╝</span><span class="ascii-warn">│$CORP │</span>                                                             │
│                     <span class="ascii-warn">└──────┘</span>                                                             │
└─────────────────────────┴────────────────────────────────────────────────────────────────┘`;
  }

  function renderShopScreen() {
    const played = window.OfficeStats ? window.OfficeStats.getGamesPlayed() : 0;

    let tabContentHtml = '';

    if (shopCategory === 'lands') {
      const lockedList = state.plots.filter(p => !p.unlocked).slice(0, 5);
      const rows = lockedList.map(p => {
        const req = PLOT_UNLOCK_REQS[p.id];
        const buyout = req * 45;
        const ready = played >= req;
        return `│ Parcela #${String(p.id + 1).padStart(2, '0')} │ Requiere: <span class="${ready ? 'ascii-bright' : 'ascii-warn'}">${String(req).padStart(2, ' ')} Pts de Gane</span> (Tienes ${played}) │ <button class="ascii-btn ${ready ? 'active' : ''}" data-unlock-plot="${p.id}">[Adquirir por Gane o $${buyout}]</button> │`;
      }).join('\n');

      tabContentHtml = `
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 1. ESCRITURAS DE TIERRAS (Se desbloquean ganando Puntos de Gane en Minijuegos)   │
├──────────────────────────────────────────────────────────────────────────────────┤
${rows || '│ ¡Felicidades! Ya eres dueño de las 16 parcelas de la azotea.                     │'}
└──────────────────────────────────────────────────────────────────────────────────┘`;
    } else if (shopCategory === 'supplies') {
      tabContentHtml = `
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 2. SEMILLAS INDIVIDUALES Y SACOS DE ABONO                                        │
├──────────────────────────────────────────────────────────────────────────────────┤
│ • 1x Semilla Cactus Monitor   (Tienes: ${String(state.seeds.cactus).padStart(2, '0')})    ──► <button class="ascii-btn" data-buyseed="cactus">[Comprar 1x por $18]</button>        │
│ • 1x Semilla Suculenta USB    (Tienes: ${String(state.seeds.suculenta).padStart(2, '0')})    ──► <button class="ascii-btn" data-buyseed="suculenta">[Comprar 1x por $22]</button>        │
│ • 1x Semilla Cafeto Express   (Tienes: ${String(state.seeds.cafe).padStart(2, '0')})    ──► <button class="ascii-btn" data-buyseed="cafe">[Comprar 1x por $24]</button>        │
│ • 1x Semilla Bambú Feng-Shui  (Tienes: ${String(state.seeds.bambu).padStart(2, '0')})    ──► <button class="ascii-btn" data-buyseed="bambu">[Comprar 1x por $30]</button>        │
├──────────────────────────────────────────────────────────────────────────────────┤
│ • 1x SACO DE ABONO ACELERADOR (Tienes: <span class="ascii-warn">${String(state.fertilizer).padStart(2, '0')}</span>)    ──► <button class="ascii-btn active" id="shop-buy-fert">[Comprar 1x Abono por $15]</button>  │
└──────────────────────────────────────────────────────────────────────────────────┘`;
    } else if (shopCategory === 'upgrades') {
      tabContentHtml = `
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 3. AUTOMATIZACIÓN DE RIEGO Y COMPOSTAJE                                          │
├──────────────────────────────────────────────────────────────────────────────────┤
│ • SISTEMA DE RIEGO AUTOMÁTICO (Actual: <span class="ascii-info">${state.sprinklerLevel === 0 ? 'Manual' : state.sprinklerLevel === 1 ? 'Goteo Básico' : 'Hidropónico Total'}</span>)                     │
│   ├─ Nivel 1: Riego por Goteo (+Agua constante)    <button class="ascii-btn" id="shop-sprinkler-1">[Instalar por $95]</button>         │
│   └─ Nivel 2: Red Hidropónica (100% Agua siempre)  <button class="ascii-btn" id="shop-sprinkler-2">[Instalar por $240]</button>        │
├──────────────────────────────────────────────────────────────────────────────────┤
│ • COMPOSTADOR DE OFICINA (Actual: <span class="ascii-warn">Nivel ${state.composterLevel}</span>)         <button class="ascii-btn" id="shop-upgrade-compost">[Mejorar Nivel por $110]</button>   │
└──────────────────────────────────────────────────────────────────────────────────┘`;
    } else {
      const recipeLines = CROSS_RECIPES.map((r, i) => {
        const pA = PLANTS[r.a];
        const pB = PLANTS[r.b];
        const res = PLANTS[r.result];
        const hA = state.seeds[r.a] || 0;
        const hB = state.seeds[r.b] || 0;
        const ok = hA >= 1 && hB >= 1 && state.fertilizer >= 1;
        return `│ ${pA.name.padEnd(14)}(${hA}) + ${pB.name.padEnd(14)}(${hB}) + 1 Abono ═► <span class="ascii-warn">${res.name.padEnd(15)}</span> <button class="ascii-btn ${ok ? 'active' : ''}" data-splice="${i}">[Cruzar (+1 Sem)]</button> │`;
      }).join('\n');

      tabContentHtml = `
┌──────────────────────────────────────────────────────────────────────────────────┐
│ 4. MALETÍN DE CRUCES GENÉTICOS (Las plantas híbridas dan 2 semillas al cosechar) │
├──────────────────────────────────────────────────────────────────────────────────┤
${recipeLines}
└──────────────────────────────────────────────────────────────────────────────────┘`;
    }

    containerEl.innerHTML = `
      <div class="game-shell">
        <div class="bar-controls" style="width:100%; max-width:920px;">
          <span>${buildTopStatsText()}</span>
          <button class="ascii-btn active" id="back-to-farm-btn">[🌱 VOLVER AL CAMPO DE CULTIVO]</button>
        </div>

        <div class="ascii-panel" style="max-width:920px;">
${buildSteveNpcBannerHtml()}
        </div>

        <div class="bar-controls" style="width:100%; max-width:920px;">
          <div class="bar-group">
            <button class="ascii-btn ${shopCategory === 'lands' ? 'active' : ''}" data-scat="lands">[1. Comprar Tierras]</button>
            <button class="ascii-btn ${shopCategory === 'supplies' ? 'active' : ''}" data-scat="supplies">[2. Semillas y Abono]</button>
            <button class="ascii-btn ${shopCategory === 'upgrades' ? 'active' : ''}" data-scat="upgrades">[3. Riego Automático]</button>
            <button class="ascii-btn ${shopCategory === 'lab' ? 'active' : ''}" data-scat="lab">[4. Cruzar Semillas]</button>
          </div>
        </div>

        <div class="ascii-panel">
${tabContentHtml}
        </div>

        <div class="bar-controls" style="width:100%; max-width:920px;">
          <span>TIENDA: <b class="ascii-info" id="farmer-log">${statusLog}</b></span>
        </div>
      </div>
    `;

    document.getElementById('back-to-farm-btn')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      if (window.AsciiOfficeApp) window.AsciiOfficeApp.openFarm();
    });

    containerEl.querySelectorAll('[data-scat]').forEach(btn => {
      btn.addEventListener('click', () => {
        shopCategory = btn.getAttribute('data-scat');
        window.AsciiAudio.click();
        render();
      });
    });

    containerEl.querySelectorAll('[data-unlock-plot]').forEach(btn => {
      btn.addEventListener('click', () => {
        unlockPlot(parseInt(btn.getAttribute('data-unlock-plot'), 10));
      });
    });

    containerEl.querySelectorAll('[data-buyseed]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sId = btn.getAttribute('data-buyseed');
        const cost = PLANTS[sId].shopPrice || 20;
        if (state.cash < cost) {
          window.AsciiAudio.error();
          setLog(`Steve: "No te alcanza el efectivo. Necesitas $${cost} para esa semilla."`);
          return;
        }
        state.cash -= cost;
        state.seeds[sId] = (state.seeds[sId] || 0) + 1;
        currentNpcSpeech = generateSteveGreeting();
        window.AsciiAudio.score();
        setLog(`Compraste +1 semilla de ${PLANTS[sId].name} por $${cost}.`);
        saveState();
        render();
      });
    });

    document.getElementById('shop-buy-fert')?.addEventListener('click', () => {
      if (state.cash < 15) {
        window.AsciiAudio.error();
        setLog(`Steve: "Necesitas $15 para llevarte un Saco de Abono."`);
        return;
      }
      state.cash -= 15;
      state.fertilizer += 1;
      window.AsciiAudio.score();
      setLog(`Compraste +1 Saco de Abono por $15.`);
      saveState();
      render();
    });

    document.getElementById('shop-sprinkler-1')?.addEventListener('click', () => {
      if (state.sprinklerLevel >= 1) {
        setLog(`Ya tienes este sistema instalado.`);
        return;
      }
      if (state.cash < 95) {
        window.AsciiAudio.error();
        setLog(`Necesitas $95.`);
        return;
      }
      state.cash -= 95;
      state.sprinklerLevel = 1;
      window.AsciiAudio.win();
      setLog(`¡Riego por Goteo instalado!`);
      saveState();
      render();
    });

    document.getElementById('shop-sprinkler-2')?.addEventListener('click', () => {
      if (state.sprinklerLevel >= 2) {
        setLog(`Ya tienes la Red Hidropónica Total.`);
        return;
      }
      if (state.cash < 240) {
        window.AsciiAudio.error();
        setLog(`Necesitas $240.`);
        return;
      }
      state.cash -= 240;
      state.sprinklerLevel = 2;
      window.AsciiAudio.win();
      setLog(`¡Red Hidropónica Total instalada!`);
      saveState();
      render();
    });

    document.getElementById('shop-upgrade-compost')?.addEventListener('click', () => {
      if (state.cash < 110) {
        window.AsciiAudio.error();
        setLog(`Necesitas $110.`);
        return;
      }
      state.cash -= 110;
      state.composterLevel++;
      window.AsciiAudio.win();
      setLog(`¡Compostador mejorado a Nivel ${state.composterLevel}!`);
      saveState();
      render();
    });

    containerEl.querySelectorAll('[data-splice]').forEach(btn => {
      btn.addEventListener('click', () => {
        const rec = CROSS_RECIPES[parseInt(btn.getAttribute('data-splice'), 10)];
        if (!rec) return;
        if ((state.seeds[rec.a] || 0) < 1 || (state.seeds[rec.b] || 0) < 1 || state.fertilizer < 1) {
          window.AsciiAudio.error();
          setLog(`Necesitas 1 semilla de ${PLANTS[rec.a].name}, 1 de ${PLANTS[rec.b].name} y 1 Abono.`);
          return;
        }
        state.seeds[rec.a]--;
        state.seeds[rec.b]--;
        state.fertilizer--;
        state.seeds[rec.result] = (state.seeds[rec.result] || 0) + 1;
        discoverPlant(rec.result);
        state.totalCrosses++;
        currentNpcSpeech = generateSteveGreeting();
        window.AsciiAudio.win();
        setLog(`¡Cruce creado en el maletín de Steve! +1 Semilla de ${PLANTS[rec.result].name}.`);
        saveState();
        render();
      });
    });
  }

  function render() {
    if (!containerEl) return;
    if (currentView === 'shop') renderShopScreen();
    else renderFarmScreen();
  }

  loadState();

  return {
    initFarm(container) {
      containerEl = container;
      currentView = 'farm';
      loadState();
      render();
    },
    initShop(container) {
      containerEl = container;
      currentView = 'shop';
      loadState();
      state.shopVisits = (state.shopVisits || 0) + 1;
      currentNpcSpeech = generateSteveGreeting();
      saveState();
      render();
    },
    destroy() {
      containerEl = null;
    },
    backgroundTick,
    grantMinigameReward,
    grantWinPointBonus,
    getSummary() {
      const unlocked = state.plots.filter(p => p.unlocked).length;
      const totalSeeds = Object.values(state.seeds).reduce((a, b) => a + b, 0);
      return {
        cash: state.cash,
        unlocked,
        totalSeeds,
        fertilizer: state.fertilizer
      };
    },
    handleKey(e) {
      if (!containerEl || currentView !== 'farm') return;
      const k = e.key;
      if (k === 'ArrowRight' || k === 'd' || k === 'D') {
        e.preventDefault();
        selectedPlotIdx = (selectedPlotIdx + 1) % 16;
        render();
      } else if (k === 'ArrowLeft') {
        e.preventDefault();
        selectedPlotIdx = (selectedPlotIdx + 15) % 16;
        render();
      } else if (k === 'ArrowDown' || k === 's' || k === 'S') {
        e.preventDefault();
        selectedPlotIdx = (selectedPlotIdx + 4) % 16;
        render();
      } else if (k === 'ArrowUp') {
        e.preventDefault();
        selectedPlotIdx = (selectedPlotIdx + 12) % 16;
        render();
      } else if (k === ' ' || k === 'Enter') {
        e.preventDefault();
        handlePlotClick(selectedPlotIdx);
      } else if (k === 'p' || k === 'P') {
        e.preventDefault();
        currentTool = 'plant';
        render();
      } else if (k === 'w' || k === 'W') {
        e.preventDefault();
        currentTool = 'water';
        waterPlot(selectedPlotIdx);
      } else if (k === 'a' || k === 'A') {
        e.preventDefault();
        currentTool = 'fertilize';
        fertilizePlot(selectedPlotIdx);
      } else if (k === 'x' || k === 'X') {
        e.preventDefault();
        currentTool = 'cross';
        handlePlotClick(selectedPlotIdx);
      } else if (k === 'c' || k === 'C') {
        e.preventDefault();
        harvestAllReady();
      }
    }
  };
})();
