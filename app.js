/* ════════════════════════════════════════════════════════════════════
   Правда или Действие — логика приложения
   ════════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const STATE = {
    level: null,
    mode:  'truth',
    deck:  [],
    drawn: [],
    current: null,
    players: ['Игрок 1', 'Игрок 2'],
    currentPlayerIdx: 0,
  };

  const STORE_KEY = 'tod_players_v1';

  const $  = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const TYPE_LABEL = {
    truth: 'Правда',
    dare:  'Действие',
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

  /* ─── колода ─── */

  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const buildDeck = () => {
    const set = DATA[STATE.level];
    if (!set) return [];
    const truths = set.truth.map((t) => ({ type: 'truth', text: t }));
    const dares  = set.dare .map((t) => ({ type: 'dare',  text: t }));
    if (STATE.mode === 'truth') return shuffle(truths);
    if (STATE.mode === 'dare')  return shuffle(dares);
    return shuffle([...truths, ...dares]);
  };

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
    $('#counter-now').textContent = STATE.drawn.length;
    $('#counter-tot').textContent = STATE.drawn.length + STATE.deck.length;
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

  /* ─── игровая логика ─── */

  const startLevel = (level) => {
    STATE.level   = level;
    STATE.drawn   = [];
    STATE.current = null;
    STATE.deck    = buildDeck();
    STATE.currentPlayerIdx = 0;
    setView('play');
    renderHead();
    renderPlayerTurn();
    drawNext({ first: true });
  };

  const drawNext = (opts = {}) => {
    if (STATE.deck.length === 0) {
      setView('end');
      return;
    }
    // ротация игроков: сдвигаем на каждом draw, кроме самого первого
    if (!opts.first && STATE.drawn.length > 0) {
      STATE.currentPlayerIdx = (STATE.currentPlayerIdx + 1) % STATE.players.length;
    }
    const card = STATE.deck.shift();
    STATE.current = card;
    STATE.drawn.push(card);
    renderCard(card);
    renderHead();
    renderPlayerTurn();
  };

  const skipCard = () => drawNext();

  const switchMode = (mode) => {
    if (mode === STATE.mode) return;
    STATE.mode = mode;
    const used = new Set(STATE.drawn.map((c) => c.text));
    STATE.deck = buildDeck().filter((c) => !used.has(c.text));
    $$('.mode').forEach((b) => {
      const active = b.dataset.mode === mode;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    renderHead();
    drawNext();
  };

  const restart = () => {
    if (!STATE.level) { setView('intro'); return; }
    startLevel(STATE.level);
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
        const cur = collectNames(); // сохраняем то, что уже введено
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
    $('#btn-draw').addEventListener('click', () => drawNext());
    $('#btn-skip').addEventListener('click', () => skipCard());

    $$('.mode').forEach((b) => {
      b.addEventListener('click', () => switchMode(b.dataset.mode));
    });

    $('#btn-restart').addEventListener('click', () => restart());
    $('#btn-change-level').addEventListener('click', () => setView('intro'));

    // клик по карте = следующая
    $('#card').addEventListener('click', () => {
      if (STATE.drawn.length > 0) drawNext();
    });

    // клавиатура
    document.addEventListener('keydown', (e) => {
      if (!$('#view-play').hidden) {
        if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          drawNext();
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
