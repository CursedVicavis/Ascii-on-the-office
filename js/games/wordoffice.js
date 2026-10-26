/* ==========================================================================
   ASCI ON THE OFFICE - Juego 6: WORDLE & AHORCADO DE OFICINA
   ========================================================================== */

window.GameWordOffice = (function () {
  let containerEl = null;
  let exitCallback = null;

  let subMode = 'wordle'; // 'wordle' | 'hangman'
  let streak = 0;
  let score = 0;

  // --- Datos Wordle (5 letras) ---
  const WORDLE_LIST = [
    { word: 'FIRMA', hint: 'Rúbrica al final de un contrato' },
    { word: 'CARGO', hint: 'Puesto dentro del organigrama' },
    { word: 'DATOS', hint: 'Materia prima de la base SQL' },
    { word: 'BONOS', hint: 'Incentivos financieros anuales' },
    { word: 'JUNTA', hint: 'Reunión interminable de directivos' },
    { word: 'CLAVE', hint: 'Contraseña de acceso al sistema' },
    { word: 'REDES', hint: 'Infraestructura LAN y Wi-Fi' },
    { word: 'PLAZO', hint: 'Fecha límite de entrega (Deadline)' },
    { word: 'COSTE', hint: 'Gasto operativo en el balance' },
    { word: 'VENTA', hint: 'Objetivo principal del área comercial' },
    { word: 'ACTAS', hint: 'Documentos que resumen la reunión' },
    { word: 'PAGOS', hint: 'Transferencias de tesorería' },
    { word: 'SALDO', hint: 'Diferencia entre el debe y el haber' },
    { word: 'PAPEL', hint: 'Lo que siempre se atasca en la impresora' },
    { word: 'SELLO', hint: 'Estampa oficial de tinta en documentos' },
    { word: 'TURNO', hint: 'Horario asignado de trabajo' },
    { word: 'METAS', hint: 'Objetivos trimestrales (KPIs)' },
    { word: 'CABLE', hint: 'Conexión física Ethernet o corriente' },
    { word: 'TECLA', hint: 'Cada botón de tu periférico de escritura' },
    { word: 'FICHA', hint: 'Registro de entrada o cliente' },
    { word: 'EXITO', hint: 'Resultado positivo del proyecto' },
    { word: 'VALOR', hint: 'Precio o mérito de un activo' },
    { word: 'CAJAS', hint: 'Donde se guardan los archivos muertos' },
    { word: 'LIBRO', hint: 'Registro contable mayor o diario' },
    { word: 'CORTE', hint: 'Cierre de caja al final del día' }
  ];

  // --- Datos Ahorcado ---
  const HANGMAN_LIST = [
    { word: 'FOTOCOPIADORA', cat: 'Hardware de Oficina', hint: 'Huele a tóner y detecta el miedo del usuario' },
    { word: 'PRESUPUESTO', cat: 'Finanzas', hint: 'Hoja de cálculo que nunca alcanza para todo el año' },
    { word: 'VACACIONES', cat: 'Recursos Humanos', hint: 'Los días más esperados por todo empleado' },
    { word: 'AUDITORIA', cat: 'Contabilidad', hint: 'Inspección minuciosa de todas las facturas' },
    { word: 'SERVIDOR', cat: 'Sistemas IT', hint: 'Se cae justo el viernes a las 4:55 PM' },
    { word: 'PROYECTO', cat: 'Gestión', hint: 'Conjunto de tareas con fecha de entrega imposible' },
    { word: 'CAFETERIA', cat: 'Supervivencia', hint: 'Centro neurálgico de los rumores de pasillo' },
    { word: 'AGUINALDO', cat: 'Nómina', hint: 'Pago extra de fin de año' },
    { word: 'REUNION', cat: 'Agenda', hint: 'Evento de 2 horas que pudo haber sido un correo' },
    { word: 'CONTRATO', cat: 'Legal', hint: 'Documento lleno de cláusulas en letra pequeña' },
    { word: 'IMPRESORA', cat: 'Periféricos', hint: 'Dice que no tiene papel aunque la bandeja esté llena' },
    { word: 'QUINCENA', cat: 'Nómina', hint: 'Día sagrado en que depositan el sueldo' },
    { word: 'INFORME', cat: 'Burocracia', hint: 'Reporte ejecutivo que nadie lee completo' },
    { word: 'TECLADO', cat: 'Escritorio', hint: 'Herramienta principal para fingir que escribes mucho' },
    { word: 'ASCENSO', cat: 'Carrera', hint: 'Promoción de puesto con más responsabilidades' }
  ];

  // Estado Wordle
  let wTarget = '';
  let wHint = '';
  let wGuesses = []; // Array de strings
  let wCurrent = '';
  let wShowHint = false;
  let wFinished = false;
  let wWon = false;

  // Estado Hangman
  let hItem = null;
  let hGuessed = new Set();
  let hMistakes = 0;
  const MAX_MISTAKES = 6;
  let hFinished = false;
  let hWon = false;

  const GALLOWS_ASCII = [
`  ╔═══════╤═══╗
  ║       │   ║
  ║           ║
  ║           ║
  ║           ║
  ║           ║
══╩═══════════╩══`,
`  ╔═══════╤═══╗
  ║       │   ║
  ║      (o_o)║
  ║           ║
  ║           ║
  ║           ║
══╩═══════════╩══`,
`  ╔═══════╤═══╗
  ║       │   ║
  ║      (o_o)║
  ║       │█│ ║
  ║           ║
  ║           ║
══╩═══════════╩══`,
`  ╔═══════╤═══╗
  ║       │   ║
  ║      (o_o)║
  ║      /│█│ ║
  ║           ║
  ║           ║
══╩═══════════╩══`,
`  ╔═══════╤═══╗
  ║       │   ║
  ║      (o_o)║
  ║      /│█│\\║
  ║           ║
  ║           ║
══╩═══════════╩══`,
`  ╔═══════╤═══╗
  ║       │   ║
  ║      (o_o)║
  ║      /│█│\\║
  ║       /   ║
  ║           ║
══╩═══════════╩══`,
`  ╔═══════╤═══╗
  ║       │   ║
  ║      (X_X)║
  ║      /│█│\\║
  ║       / \\ ║
  ║  ¡DESPEDIDO!
══╩═══════════╩══`
  ];

  function startRound() {
    if (subMode === 'wordle') {
      const pick = WORDLE_LIST[Math.floor(Math.random() * WORDLE_LIST.length)];
      wTarget = pick.word;
      wHint = pick.hint;
      wGuesses = [];
      wCurrent = '';
      wShowHint = false;
      wFinished = false;
      wWon = false;
    } else {
      hItem = HANGMAN_LIST[Math.floor(Math.random() * HANGMAN_LIST.length)];
      hGuessed = new Set();
      hMistakes = 0;
      hFinished = false;
      hWon = false;
    }
    render();
  }

  // Evaluación exacta de Wordle con manejo de letras repetidas
  function evaluateWordleGuess(guess, target) {
    const res = Array(5).fill('absent'); // 'exact' | 'present' | 'absent'
    const targetArr = target.split('');
    const used = Array(5).fill(false);

    for (let i = 0; i < 5; i++) {
      if (guess[i] === targetArr[i]) {
        res[i] = 'exact';
        used[i] = true;
      }
    }
    for (let i = 0; i < 5; i++) {
      if (res[i] === 'exact') continue;
      for (let j = 0; j < 5; j++) {
        if (!used[j] && guess[i] === targetArr[j]) {
          res[i] = 'present';
          used[j] = true;
          break;
        }
      }
    }
    return res;
  }

  function submitWordle() {
    if (wFinished || wCurrent.length !== 5) {
      window.AsciiAudio.error();
      return;
    }
    wGuesses.push(wCurrent);
    if (wCurrent === wTarget) {
      wFinished = true;
      wWon = true;
      streak++;
      const pts = (7 - wGuesses.length) * 150 + (wShowHint ? 0 : 100);
      score += pts;
      window.AsciiAudio.win();
      if (window.OfficeStats) window.OfficeStats.recordGameWin('wordoffice', score);
    } else if (wGuesses.length >= 6) {
      wFinished = true;
      wWon = false;
      streak = 0;
      window.AsciiAudio.explosion();
    } else {
      window.AsciiAudio.click();
    }
    wCurrent = '';
    render();
  }

  function pressLetter(letter) {
    const ch = letter.toUpperCase();
    if (subMode === 'wordle') {
      if (wFinished) return;
      if (wCurrent.length < 5) {
        wCurrent += ch;
        window.AsciiAudio.move();
        render();
      }
    } else {
      if (hFinished || hGuessed.has(ch)) return;
      hGuessed.add(ch);
      if (hItem.word.includes(ch)) {
        window.AsciiAudio.score();
        const allFound = hItem.word.split('').every(c => hGuessed.has(c));
        if (allFound) {
          hFinished = true;
          hWon = true;
          streak++;
          score += (MAX_MISTAKES - hMistakes) * 120 + 200;
          window.AsciiAudio.win();
          if (window.OfficeStats) window.OfficeStats.recordGameWin('wordoffice', score);
        }
      } else {
        hMistakes++;
        window.AsciiAudio.error();
        if (hMistakes >= MAX_MISTAKES) {
          hFinished = true;
          hWon = false;
          streak = 0;
          window.AsciiAudio.explosion();
        }
      }
      render();
    }
  }

  function buildKeyboardHtml(letterStatusMap) {
    const rows = [
      ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
      ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
      ['Z', 'X', 'C', 'V', 'B', 'N', 'M']
    ];
    return rows.map(row => {
      return row.map(ch => {
        const st = letterStatusMap[ch];
        let label = `[${ch}]`;
        let cls = 'ascii-btn';
        if (st === 'exact') {
          cls += ' active';
          label = `[#${ch}#]`;
        } else if (st === 'present') {
          cls += ' boss-btn';
          label = `(${ch})`;
        } else if (st === 'absent') {
          cls += ' ascii-dim';
          label = ` ·${ch}· `;
        }
        return `<button class="${cls}" data-letter="${ch}">${label}</button>`;
      }).join(' ');
    }).join('\n');
  }

  function renderWordleView() {
    const letterStatus = {};
    const rowsHtml = [];

    rowsHtml.push('╔═══════╤═══════╤═══════╤═══════╤═══════╗');
    for (let r = 0; r < 6; r++) {
      let rowCells = [];
      if (r < wGuesses.length) {
        const g = wGuesses[r];
        const ev = evaluateWordleGuess(g, wTarget);
        for (let c = 0; c < 5; c++) {
          const ch = g[c];
          const st = ev[c];
          if (st === 'exact') {
            letterStatus[ch] = 'exact';
            rowCells.push(`<span class="ascii-bright">[#${ch}#]</span>`);
          } else if (st === 'present') {
            if (letterStatus[ch] !== 'exact') letterStatus[ch] = 'present';
            rowCells.push(`<span class="ascii-warn">(${ch}?)</span> `);
          } else {
            if (!letterStatus[ch]) letterStatus[ch] = 'absent';
            rowCells.push(`<span class="ascii-dim"> ·${ch}· </span>`);
          }
        }
      } else if (r === wGuesses.length && !wFinished) {
        for (let c = 0; c < 5; c++) {
          const ch = wCurrent[c] || '_';
          rowCells.push(`<span class="ascii-info">  ${ch}  </span>`);
        }
      } else {
        for (let c = 0; c < 5; c++) {
          rowCells.push('     ');
        }
      }
      rowsHtml.push('║ ' + rowCells.join(' │ ') + ' ║');
      if (r < 5) rowsHtml.push('╟───────┼───────┼───────┼───────┼───────╢');
    }
    rowsHtml.push('╚═══════╧═══════╧═══════╧═══════╧═══════╝');

    let statusBanner = '';
    if (wFinished) {
      if (wWon) {
        statusBanner = `\n<span class="ascii-warn">╔═══════════════════════════════════════════╗
║ ¡MEMORÁNDUM DESCIFRADO!: "${wTarget}"          ║
║ Presiona [ESPACIO] para el siguiente reto ║
╚═══════════════════════════════════════════╝</span>`;
      } else {
        statusBanner = `\n<span class="ascii-danger">╔═══════════════════════════════════════════╗
║ EXPEDIENTE ARCHIVADO. Palabra: "${wTarget}"    ║
║ Presiona [ESPACIO] para reintentar        ║
╚═══════════════════════════════════════════╝</span>`;
      }
    }

    return `
      <div class="game-workspace">
        <div class="ascii-panel">
${rowsHtml.join('\n')}${statusBanner}

Leyenda: <span class="ascii-bright">[#A#] Exacta</span>  |  <span class="ascii-warn">(A?) Otra posición</span>  |  <span class="ascii-dim">·A· No está</span>
${wShowHint ? `\n<span class="ascii-info">PISTA DE OFICINA: ${wHint}</span>` : ''}
        </div>

        <div class="ascii-panel">
┌───────────────────────────────────────────┐
│ TECLADO MECÁNICO DE OFICINA               │
├───────────────────────────────────────────┤
${buildKeyboardHtml(letterStatus)}

<button class="ascii-btn" id="wo-back">[ ◄ BORRAR ]</button>  <button class="ascii-btn active" id="wo-enter">[ ENTER: ENVIAR PALABRA ]</button>
<button class="ascii-btn" id="wo-hint">[ ? VER PISTA DE SIGNIFICADO ]</button>
├───────────────────────────────────────────┤
│ Puntos: <span class="ascii-warn">${String(score).padStart(6, '0')}</span>   │   Racha: <span class="ascii-info">${streak}</span> seguidas   │
└───────────────────────────────────────────┘
        </div>
      </div>
    `;
  }

  function renderHangmanView() {
    const letterStatus = {};
    for (const ch of hGuessed) {
      letterStatus[ch] = hItem.word.includes(ch) ? 'exact' : 'absent';
    }

    const maskedWord = hItem.word
      .split('')
      .map(ch => (hGuessed.has(ch) || hFinished ? `[ ${ch} ]` : '[ _ ]'))
      .join(' ');

    let statusBanner = '';
    if (hFinished) {
      if (hWon) {
        statusBanner = `\n<span class="ascii-warn">╔══════════════════════════════════════════════════╗
║ ¡CONTRATO SALVADO! Palabra: ${hItem.word.padEnd(18)} ║
║ Presiona [ESPACIO] para la siguiente palabra     ║
╚══════════════════════════════════════════════════╝</span>`;
      } else {
        statusBanner = `\n<span class="ascii-danger">╔══════════════════════════════════════════════════╗
║ ¡DESPEDIDO POR RECURSOS HUMANOS!                 ║
║ La palabra era: ${hItem.word.padEnd(28)} ║
╚══════════════════════════════════════════════════╝</span>`;
      }
    }

    return `
      <div class="game-workspace">
        <div class="ascii-panel">
╔══════════════════════════════════════════════════════╗
║ CATEGORÍA: <span class="ascii-info">${hItem.cat.padEnd(41)}</span> ║
╚══════════════════════════════════════════════════════╝
${GALLOWS_ASCII[hMistakes]}

  PALABRA CORPORATIVA:
  <span class="ascii-bright">${maskedWord}</span>

  PISTA: <span class="ascii-warn">${hItem.hint}</span>
  Intentos restantes: ${MAX_MISTAKES - hMistakes} / ${MAX_MISTAKES}${statusBanner}
        </div>

        <div class="ascii-panel">
┌───────────────────────────────────────────┐
│ SELECCIONA UNA LETRA                      │
├───────────────────────────────────────────┤
${buildKeyboardHtml(letterStatus)}
├───────────────────────────────────────────┤
│ Puntos: <span class="ascii-warn">${String(score).padStart(6, '0')}</span>   │   Racha: <span class="ascii-info">${streak}</span> seguidas   │
└───────────────────────────────────────────┘
        </div>
      </div>
    `;
  }

  function render() {
    if (!containerEl) return;

    containerEl.innerHTML = `
      <div class="game-shell">
        <pre class="ascii-art ascii-bright">
┌──────────────────────────────────────────────────────────────────────────────────┐
│  [06] PALABRAS DE OFICINA - "Wordle Corporativo & Ahorcado de Recursos Humanos" │
└──────────────────────────────────────────────────────────────────────────────────┘</pre>

        <div class="bar-controls">
          <div class="bar-group">
            <button class="ascii-btn ${subMode === 'wordle' ? 'active' : ''}" id="mode-wordle">[1] Wordle (5 Letras)</button>
            <button class="ascii-btn ${subMode === 'hangman' ? 'active' : ''}" id="mode-hangman">[2] Ahorcado de Oficina</button>
            <button class="ascii-btn" id="wo-new">[Nueva Palabra]</button>
          </div>
          <div class="bar-group">
            <button class="ascii-btn danger-btn" id="wo-exit">[ESC] Menú</button>
          </div>
        </div>

        ${subMode === 'wordle' ? renderWordleView() : renderHangmanView()}
      </div>
    `;

    document.getElementById('mode-wordle')?.addEventListener('click', () => {
      subMode = 'wordle';
      window.AsciiAudio.click();
      startRound();
    });
    document.getElementById('mode-hangman')?.addEventListener('click', () => {
      subMode = 'hangman';
      window.AsciiAudio.click();
      startRound();
    });
    document.getElementById('wo-new')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      startRound();
    });
    document.getElementById('wo-exit')?.addEventListener('click', () => {
      window.AsciiAudio.click();
      if (exitCallback) exitCallback();
    });

    document.getElementById('wo-back')?.addEventListener('click', () => {
      if (wCurrent.length > 0 && !wFinished) {
        wCurrent = wCurrent.slice(0, -1);
        window.AsciiAudio.move();
        render();
      }
    });
    document.getElementById('wo-enter')?.addEventListener('click', () => submitWordle());
    document.getElementById('wo-hint')?.addEventListener('click', () => {
      wShowHint = true;
      window.AsciiAudio.click();
      render();
    });

    containerEl.querySelectorAll('[data-letter]').forEach(btn => {
      btn.addEventListener('click', () => {
        pressLetter(btn.getAttribute('data-letter'));
      });
    });
  }

  return {
    init(container, onExit) {
      containerEl = container;
      exitCallback = onExit;
      startRound();
    },
    destroy() {
      containerEl = null;
    },
    handleKey(e) {
      if (!containerEl) return;
      const k = e.key;
      if (k === 'Backspace' && subMode === 'wordle' && !wFinished) {
        e.preventDefault();
        if (wCurrent.length > 0) {
          wCurrent = wCurrent.slice(0, -1);
          window.AsciiAudio.move();
          render();
        }
      } else if (k === 'Enter' && subMode === 'wordle' && !wFinished) {
        e.preventDefault();
        submitWordle();
      } else if (k === ' ' && ((subMode === 'wordle' && wFinished) || (subMode === 'hangman' && hFinished))) {
        e.preventDefault();
        startRound();
      } else if (/^[a-zA-ZñÑ]$/.test(k)) {
        e.preventDefault();
        pressLetter(k.toUpperCase());
      }
    }
  };
})();
