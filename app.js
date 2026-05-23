/* ════════════════════════════════════════════════════════════════════
   Правда или Действие — логика приложения
   ════════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const STATE = {
    level: null,
    mode:  'truth',
    deck:  [],          // оставшиеся карты (общие на всех)
    used:  new Set(),   // тексты карт, уже выпавших в этой игре — больше не повторяются
    drawn: [],
    current: null,
    players: ['Игрок 1', 'Игрок 2'],
    currentPlayerIdx: 0,
    scores: {},
  };

  const STORE_KEY = 'tod_players_v1';

  const $  = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const TYPE_LABEL = {
    truth: 'Правда',
    dare:  'Действие',
  };

  // Сколько очков карты даёт игроку в каждую категорию (по уровню × типу)
  const SCORING = {
    I:   { truth: { open: 1 },                         dare: { brave: 1 } },
    II:  { truth: { open: 2, romance: 1, lewd: 1 },    dare: { brave: 2, romance: 2, lewd: 1 } },
    III: { truth: { open: 3, lewd: 3, romance: 1 },    dare: { brave: 3, lewd: 3, romance: 2 } },
  };

  // Категории для инфографики
  const CATEGORIES = [
    { key: 'lewd',    label: 'Развратность',  sub: 'кто не стесняется тела',  cls: 'coral', icon: 'lips',    titles: ['Король разврата', 'Дикая натура', 'Без комплексов'] },
    { key: 'brave',   label: 'Смелость',      sub: 'кто шёл на действия',     cls: 'sun',   icon: 'flame',   titles: ['Самый смелый', 'Без тормозов', 'Берёт всё'] },
    { key: 'open',    label: 'Откровенность', sub: 'кто отвечал правдой',     cls: 'mint',  icon: 'speech',  titles: ['Душа нараспашку', 'Самый честный', 'Без секретов'] },
    { key: 'romance', label: 'Романтика',     sub: 'кто на чувствах',         cls: 'peach', icon: 'heart',   titles: ['Главный романтик', 'Сердцеед(ка)', 'Тёплая душа'] },
  ];

  const ICON_SVG = {
    lips:   `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M16 12 C 12 7, 5 9, 5 14 C 5 18, 11 23, 16 23 C 21 23, 27 18, 27 14 C 27 9, 20 7, 16 12 Z" fill="#EE7783" stroke="#2D1B3D" stroke-width="2" stroke-linejoin="round"/><path d="M5 14 C 9 16, 23 16, 27 14" stroke="#2D1B3D" stroke-width="1.5" fill="none"/></svg>`,
    flame:  `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M16 4 C 19 9, 23 11, 23 17 C 23 23, 19 28, 16 28 C 13 28, 9 23, 9 17 C 9 13, 14 12, 16 4 Z" fill="#F5BC2E" stroke="#2D1B3D" stroke-width="2" stroke-linejoin="round"/><path d="M16 16 C 18 19, 19 22, 19 24 C 19 26, 18 27, 16 27 C 14 27, 13 25, 14 22 C 14 20, 15 18, 16 16 Z" fill="#FFE5A0"/></svg>`,
    speech: `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M6 8 L 26 8 C 28 8, 29 9, 29 11 L 29 19 C 29 21, 28 22, 26 22 L 14 22 L 8 28 L 8 22 L 6 22 C 4 22, 3 21, 3 19 L 3 11 C 3 9, 4 8, 6 8 Z" fill="#5FBA94" stroke="#2D1B3D" stroke-width="2" stroke-linejoin="round"/><circle cx="11" cy="15" r="1.6" fill="#2D1B3D"/><circle cx="16" cy="15" r="1.6" fill="#2D1B3D"/><circle cx="21" cy="15" r="1.6" fill="#2D1B3D"/></svg>`,
    heart:  `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M16 27 C 16 27, 4 19, 4 11 C 4 7, 8 5, 11 7 C 13 8, 15 11, 16 11 C 17 11, 19 8, 21 7 C 24 5, 28 7, 28 11 C 28 19, 16 27, 16 27 Z" fill="#FFB0B6" stroke="#2D1B3D" stroke-width="2" stroke-linejoin="round"/></svg>`,
    crown:  `<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg"><path d="M4 22 L 6 9 L 12 15 L 16 6 L 20 15 L 26 9 L 28 22 Z" fill="#FFD66B" stroke="#2D1B3D" stroke-width="2" stroke-linejoin="round"/><rect x="4" y="22" width="24" height="4" rx="1" fill="#FFD66B" stroke="#2D1B3D" stroke-width="2"/><circle cx="6" cy="9" r="1.5" fill="#EE7783" stroke="#2D1B3D" stroke-width="1"/><circle cx="16" cy="6" r="1.5" fill="#EE7783" stroke="#2D1B3D" stroke-width="1"/><circle cx="26" cy="9" r="1.5" fill="#EE7783" stroke="#2D1B3D" stroke-width="1"/></svg>`,
  };

  /* ─── persist ─── */

  const loadPlayers = () => {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return null;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr) || arr.length < 2 || arr.length > 6) return null;
      return arr.map((s) => String(s).slice(0, 24));
    } catch { return null; }
  };

  const savePlayers = (players) => {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(players)); } catch {}
  };

  /* ─── колода: общая, без повторов ─── */

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  // полный пул карт для текущего уровня + режима
  const buildPool = () => {
    const set = DATA[STATE.level];
    if (!set) return [];
    const truths = set.truth.map((t) => ({ type: 'truth', text: t }));
    const dares  = set.dare.map((t)  => ({ type: 'dare',  text: t }));
    if (STATE.mode === 'truth') return truths;
    if (STATE.mode === 'dare')  return dares;
    return [...truths, ...dares];
  };

  // собрать колоду из пула, исключив уже выпавшие карты, и перемешать
  const buildDeck = () => shuffle(buildPool().filter((c) => !STATE.used.has(c.text)));

  /* ─── views ─── */

  const setView = (name) => {
    ['setup', 'intro', 'play', 'end'].forEach((v) => {
      const el = $('#view-' + v);
      if (el) el.hidden = (v !== name);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  /* ─── рендеры ─── */

  const renderPlayersDisplay = () => {
    const txt = STATE.players.join('  ·  ');
    $('#players-display').textContent = 'играют:  ' + txt;
  };

  const renderHead = () => {
    const set = DATA[STATE.level];
    if (!set) return;
    $('#level-name').textContent = set.label;
    $('#level-age').textContent  = set.age;
    $('#level-chip').dataset.lvl = STATE.level;
    const drawn = STATE.drawn.length;
    $('#counter-now').textContent = drawn;
    $('#counter-tot').textContent = drawn + STATE.deck.length;
  };

  const renderPlayerTurn = () => {
    const banner = $('#player-turn');
    const cur = STATE.players[STATE.currentPlayerIdx];
    $('#current-player').textContent = cur;

    if (STATE.players.length >= 3) {
      const nextIdx = (STATE.currentPlayerIdx + 1) % STATE.players.length;
      $('#partner-player').textContent = STATE.players[nextIdx];
      banner.classList.add('has-partner');
    } else {
      banner.classList.remove('has-partner');
    }
  };

  const renderCard = (card) => {
    const cardEl = $('#card');
    cardEl.dataset.lvl = STATE.level;

    if (!card) {
      $('#card-no').textContent   = '—';
      $('#card-type').textContent = '—';
      $('#card-text').textContent = 'Колода завершена.';
      return;
    }

    cardEl.classList.remove('is-flipping');
    void cardEl.offsetWidth;
    cardEl.classList.add('is-flipping');

    setTimeout(() => {
      $('#card-no').textContent    = '№ ' + STATE.drawn.length;
      $('#card-type').textContent  = TYPE_LABEL[card.type] || '—';
      $('#card-type').dataset.type = card.type;
      $('#card-text').textContent  = card.text;
    }, 320);
  };

  /* ─── скоринг ─── */

  const initScores = () => {
    STATE.scores = {};
    STATE.players.forEach((name) => {
      STATE.scores[name] = { lewd:0, brave:0, open:0, romance:0, done:0, skipped:0 };
    });
  };

  const scoreCard = (card, playerName) => {
    const rule = SCORING[STATE.level] && SCORING[STATE.level][card.type];
    const p = STATE.scores[playerName];
    if (!rule || !p) return;
    for (const k in rule) p[k] = (p[k] || 0) + rule[k];
    p.done += 1;
  };

  const recordSkip = (playerName) => {
    const p = STATE.scores[playerName];
    if (p) p.skipped += 1;
  };

  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[c]);

  /* ─── инфографика ─── */

  const setEndMode = (mode) => {
    if (mode === 'milestone') {
      $('#end-badge').textContent = 'промежуточный счёт';
      $('#end-title-1').textContent = 'А что';
      $('#end-title-or').textContent = 'у вас';
      $('#end-title-2').textContent = 'выходит?';
      $('#end-actions-final').hidden = true;
      $('#end-actions-milestone').hidden = false;
    } else {
      $('#end-badge').textContent = 'а вот и итоги!';
      $('#end-title-1').textContent = 'Кто';
      $('#end-title-or').textContent = 'из вас';
      $('#end-title-2').textContent = 'король?';
      $('#end-actions-final').hidden = false;
      $('#end-actions-milestone').hidden = true;
    }
  };

  const renderStats = () => {
    const host = $('#stats-host');
    host.innerHTML = '';

    const totalDone = STATE.players.reduce((s, p) => s + (STATE.scores[p]?.done || 0), 0);
    const totalSkip = STATE.players.reduce((s, p) => s + (STATE.scores[p]?.skipped || 0), 0);
    $('#end-tagline').textContent = `Сыграно ${totalDone} карт · пропущено ${totalSkip}`;

    CATEGORIES.forEach((cat) => {
      const ranked = STATE.players
        .map((p) => ({ name: p, score: STATE.scores[p]?.[cat.key] || 0 }))
        .sort((a, b) => b.score - a.score);
      const max = Math.max(1, ranked[0]?.score || 0);
      const leader = ranked[0];
      const title = cat.titles[Math.floor(Math.random() * cat.titles.length)];

      const block = document.createElement('div');
      block.className = `stat-card stat-card--${cat.cls}`;

      const leaderChip = leader && leader.score > 0
        ? `<span class="stat-card__leader">${ICON_SVG.crown} ${escapeHtml(title)}: ${escapeHtml(leader.name)}</span>`
        : '';

      block.innerHTML = `
        <div class="stat-card__head">
          <span class="stat-card__icon">${ICON_SVG[cat.icon]}</span>
          <div class="stat-card__title">
            <div class="stat-card__label">${escapeHtml(cat.label)}</div>
            <div class="stat-card__sub">${escapeHtml(cat.sub)}</div>
          </div>
          ${leaderChip}
        </div>
        <div class="stat-card__list">
          ${ranked.map((p, i) => `
            <div class="rank-row ${i === 0 && p.score > 0 ? 'is-top' : ''}">
              <span class="rank-row__crown">${i === 0 && p.score > 0 ? ICON_SVG.crown : ''}</span>
              <span class="rank-row__name">${escapeHtml(p.name)}</span>
              <div class="rank-row__bar"><div class="rank-row__fill" style="--target: ${(p.score / max * 100).toFixed(1)}%"></div></div>
              <span class="rank-row__score">${p.score}</span>
            </div>
          `).join('')}
        </div>
      `;
      block.querySelectorAll('.stat-card__leader svg').forEach((sv) => {
        sv.setAttribute('width', '16');
        sv.setAttribute('height', '16');
      });
      host.appendChild(block);
    });

    // блок активности
    const totalsBlock = document.createElement('div');
    totalsBlock.className = 'stat-card stat-card--totals';
    totalsBlock.innerHTML = `
      <div class="stat-card__head">
        <div class="stat-card__title">
          <div class="stat-card__label">Активность</div>
          <div class="stat-card__sub">сделано / пропущено</div>
        </div>
      </div>
      <div class="totals-grid">
        ${STATE.players.map((p) => {
          const s = STATE.scores[p] || { done:0, skipped:0 };
          return `
            <div class="total-cell">
              <div class="total-cell__name">${escapeHtml(p)}</div>
              <div class="total-cell__nums">
                <span class="total-cell__done">✓ ${s.done}</span>
                <span class="total-cell__skipped">✗ ${s.skipped}</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    host.appendChild(totalsBlock);
  };

  const showMilestone = () => {
    renderStats();
    setEndMode('milestone');
    setView('end');
  };

  const showFinal = () => {
    renderStats();
    setEndMode('final');
    setView('end');
  };

  /* ─── игровая логика ─── */

  const startLevel = (level) => {
    STATE.level   = level;
    STATE.drawn   = [];
    STATE.current = null;
    STATE.currentPlayerIdx = 0;
    STATE.used    = new Set();
    initScores();
    STATE.deck    = buildDeck();
    setView('play');
    renderHead();
    renderPlayerTurn();
    drawNext({ first: true });
  };

  const drawNext = (opts = {}) => {
    // 1) зачёт предыдущей карты (если есть)
    if (!opts.fromMilestone && !opts.noScore && STATE.current && !opts.first) {
      const cur = STATE.players[STATE.currentPlayerIdx];
      if (opts.completed) scoreCard(STATE.current, cur);
      else if (opts.skipped) recordSkip(cur);
    }

    // 2) проверка milestone: каждые (players × 5) пройденных карт
    const drawn = STATE.drawn.length;
    const interval = STATE.players.length * 5;
    if (!opts.fromMilestone && drawn > 0 && drawn % interval === 0) {
      showMilestone();
      return;
    }

    // 3) карты кончились — финал
    if (STATE.deck.length === 0) {
      showFinal();
      return;
    }

    // 4) ротация: следующий игрок (кроме самой первой карты и переключения режима)
    if (!opts.first && !opts.noAdvance && STATE.drawn.length > 0) {
      STATE.currentPlayerIdx = (STATE.currentPlayerIdx + 1) % STATE.players.length;
    }

    // 5) берём верхнюю карту из общей колоды — больше она не выпадет
    const card = STATE.deck.shift();
    STATE.used.add(card.text);
    STATE.current = card;
    STATE.drawn.push(card);
    renderCard(card);
    renderHead();
    renderPlayerTurn();
  };

  const switchMode = (mode) => {
    if (mode === STATE.mode) return;
    STATE.mode = mode;
    $$('.mode').forEach((b) => {
      const active = b.dataset.mode === mode;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    // пересобираем колоду под новый режим, исключая уже выпавшее
    STATE.deck = buildDeck();
    renderHead();
    // меняем карту без зачёта и без сдвига игрока
    drawNext({ noAdvance: true, noScore: true });
  };

  const restart = () => {
    if (!STATE.level) { setView('intro'); return; }
    startLevel(STATE.level);
  };

  const finishGame = () => {
    showFinal();
  };

  /* ─── setup ─── */

  const renderNameInputs = (count, existing = []) => {
    const host = $('#names-list');
    host.innerHTML = '';
    for (let i = 0; i < count; i++) {
      const row = document.createElement('div');
      row.className = 'name-row';

      const num = document.createElement('span');
      num.className = 'name-row__num';
      num.textContent = i + 1;

      const inp = document.createElement('input');
      inp.className   = 'name-input';
      inp.type        = 'text';
      inp.maxLength   = 24;
      inp.placeholder = 'Игрок ' + (i + 1);
      inp.value       = (existing[i] && existing[i].trim() && !/^Игрок \d+$/.test(existing[i])) ? existing[i] : '';
      inp.dataset.idx = i;
      inp.autocomplete = 'off';
      inp.spellcheck  = false;

      row.appendChild(num);
      row.appendChild(inp);
      host.appendChild(row);
    }
  };

  const collectNames = () => {
    return $$('.name-input').map((el, i) => {
      const v = el.value.trim();
      return v || ('Игрок ' + (i + 1));
    });
  };

  const setActiveCount = (count) => {
    $$('.pc__pill').forEach((p) => {
      const active = +p.dataset.count === count;
      p.classList.toggle('is-active', active);
      p.setAttribute('aria-checked', active ? 'true' : 'false');
    });
  };

  /* ─── события ─── */

  const wire = () => {
    // выбор количества игроков
    $$('.pc__pill').forEach((p) => {
      p.addEventListener('click', () => {
        const cnt = +p.dataset.count;
        setActiveCount(cnt);
        const cur = collectNames();
        renderNameInputs(cnt, cur);
      });
    });

    // продолжить → выбор уровня
    $('#btn-continue').addEventListener('click', () => {
      const names = collectNames();
      STATE.players = names;
      savePlayers(names);
      renderPlayersDisplay();
      setView('intro');
    });

    // вернуться к настройке игроков
    $('#btn-back-to-setup').addEventListener('click', () => {
      setActiveCount(STATE.players.length);
      renderNameInputs(STATE.players.length, STATE.players);
      setView('setup');
    });

    // выбор уровня
    $$('.level').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lvl = btn.dataset.level;
        STATE.mode = 'truth';
        $$('.mode').forEach((b) => {
          const active = b.dataset.mode === 'truth';
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        startLevel(lvl);
      });
    });

    // в игре
    $('#btn-back').addEventListener('click', () => setView('intro'));
    $('#btn-draw').addEventListener('click', () => drawNext({ completed: true }));
    $('#btn-skip').addEventListener('click', () => drawNext({ skipped: true }));
    $('#btn-finish').addEventListener('click', () => finishGame());

    $$('.mode').forEach((b) => {
      b.addEventListener('click', () => switchMode(b.dataset.mode));
    });

    // на view-end
    $('#btn-restart').addEventListener('click', () => restart());
    $('#btn-change-level').addEventListener('click', () => setView('intro'));
    $('#btn-continue-game').addEventListener('click', () => {
      setView('play');
      drawNext({ fromMilestone: true });
    });
    $('#btn-end-now').addEventListener('click', () => {
      setEndMode('final');
    });

    // клик по карте = «сделал(а)» и дальше
    $('#card').addEventListener('click', () => {
      if (STATE.drawn.length > 0) drawNext({ completed: true });
    });

    // клавиатура
    document.addEventListener('keydown', (e) => {
      if (!$('#view-play').hidden) {
        if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          drawNext({ completed: true });
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          drawNext({ skipped: true });
        } else if (e.key === 'Escape') {
          setView('intro');
        }
      } else if (!$('#view-setup').hidden) {
        if (e.key === 'Enter') {
          e.preventDefault();
          $('#btn-continue').click();
        }
      }
    });
  };

  /* ─── init ─── */

  const init = () => {
    wire();
    const saved = loadPlayers();
    if (saved) {
      STATE.players = saved;
      setActiveCount(saved.length);
      renderNameInputs(saved.length, saved);
      renderPlayersDisplay();
      setView('intro');
    } else {
      renderNameInputs(2);
      setView('setup');
    }
  };

  document.addEventListener('DOMContentLoaded', init);
})();
