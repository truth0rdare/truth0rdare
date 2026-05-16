/* ════════════════════════════════════════════════════════════════════
   Правда или Действие — логика приложения
   ════════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const STATE = {
    level: null,           // 'I' | 'II' | 'III'
    mode:  'truth',        // 'truth' | 'dare' | 'mixed'
    deck:  [],
    drawn: [],
    current: null,
  };

  const $  = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  const TYPE_LABEL = {
    truth: 'Правда',
    dare:  'Действие',
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

  /* ─── рендер ─── */

  const setView = (name) => {
    ['intro', 'play', 'end'].forEach((v) => {
      $('#view-' + v).hidden = (v !== name);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
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

  const renderCard = (card) => {
    const cardEl = $('#card');
    cardEl.dataset.lvl = STATE.level;

    if (!card) {
      $('#card-no').textContent     = '—';
      $('#card-type').textContent   = '—';
      $('#card-text').textContent   = 'Колода завершена.';
      return;
    }

    cardEl.classList.remove('is-flipping');
    void cardEl.offsetWidth;
    cardEl.classList.add('is-flipping');

    // обновляем содержимое на середине переворота
    setTimeout(() => {
      $('#card-no').textContent             = '№ ' + STATE.drawn.length;
      $('#card-type').textContent           = TYPE_LABEL[card.type] || '—';
      $('#card-type').dataset.type          = card.type;
      $('#card-text').textContent           = card.text;
    }, 320);
  };

  /* ─── игровая логика ─── */

  const startLevel = (level) => {
    STATE.level   = level;
    STATE.drawn   = [];
    STATE.current = null;
    STATE.deck    = buildDeck();
    setView('play');
    renderHead();
    drawNext();
  };

  const drawNext = () => {
    if (STATE.deck.length === 0) {
      setView('end');
      return;
    }
    const card = STATE.deck.shift();
    STATE.current = card;
    STATE.drawn.push(card);
    renderCard(card);
    renderHead();
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

  /* ─── события ─── */

  const wire = () => {
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

    $('#btn-back').addEventListener('click', () => setView('intro'));
    $('#btn-draw').addEventListener('click', () => drawNext());
    $('#btn-skip').addEventListener('click', () => skipCard());

    $$('.mode').forEach((b) => {
      b.addEventListener('click', () => switchMode(b.dataset.mode));
    });

    $('#btn-restart').addEventListener('click', () => restart());
    $('#btn-change-level').addEventListener('click', () => setView('intro'));

    // клик по карте = следующая (если есть вытянутая)
    $('#card').addEventListener('click', () => {
      if (STATE.drawn.length > 0) drawNext();
    });

    // клавиатура
    document.addEventListener('keydown', (e) => {
      if ($('#view-play').hidden) return;
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        drawNext();
      } else if (e.key === 'Escape') {
        setView('intro');
      }
    });
  };

  /* ─── init ─── */

  document.addEventListener('DOMContentLoaded', wire);
})();
