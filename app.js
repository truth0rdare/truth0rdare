/* ════════════════════════════════════════════════════════════════════
   Verità o Sfida — приложение
   Состояние храним в памяти + lightly в localStorage (последняя сессия).
   ════════════════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const STATE = {
    level: null,           // 'I' | 'II' | 'III'
    mode:  'truth',        // 'truth' | 'dare' | 'mixed'
    deck:  [],             // массив { type, text }
    drawn: [],             // вытянутые
    current: null,         // текущая карта
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  /* ─── римские числа ─── */
  const toRoman = (n) => {
    if (n <= 0) return '0';
    const map = [
      [1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],
      [100,'C'],[90,'XC'],[50,'L'],[40,'XL'],
      [10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I'],
    ];
    let s = '';
    for (const [v, sym] of map) {
      while (n >= v) { s += sym; n -= v; }
    }
    return s;
  };

  /* ─── фейерверк искр ─── */
  const embersHost = $('#embers');
  const spawnEmber = () => {
    const e = document.createElement('span');
    e.className = 'ember';
    const left = Math.random() * 100;
    const dur  = 8 + Math.random() * 10;
    const size = 1 + Math.random() * 2.2;
    const drift = (Math.random() - 0.5) * 30;
    e.style.left = left + '%';
    e.style.bottom = '-10px';
    e.style.width = e.style.height = size + 'px';
    e.style.animationDuration = dur + 's';
    e.style.setProperty('--drift', drift + 'px');
    e.style.opacity = 0;
    embersHost.appendChild(e);
    setTimeout(() => e.remove(), dur * 1000 + 200);
  };
  // спавним искру каждые 700-1500 мс
  const startEmbers = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const tick = () => {
      spawnEmber();
      setTimeout(tick, 700 + Math.random() * 800);
    };
    tick();
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
    ['intro','play','end'].forEach((v) => {
      $('#view-' + v).hidden = (v !== name);
    });
    if (name === 'play') {
      document.body.scrollTo?.({ top: 0, behavior: 'smooth' });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderHead = () => {
    const set = DATA[STATE.level];
    $('#level-numeral').textContent = STATE.level;
    $('#level-label').textContent = set.label;
    $('#counter-now').textContent  = toRoman(STATE.drawn.length);
    $('#counter-tot').textContent  = toRoman(STATE.deck.length + STATE.drawn.length);
  };

  const TYPE_LABEL = {
    truth: '— Verità —',
    dare:  '— Sfida —',
  };

  const renderCard = (card) => {
    const cardEl = $('#card');
    const inner  = $('#card-inner');

    if (!card) {
      $('#card-no').textContent   = 'Carta —';
      $('#card-type').textContent = '— —';
      $('#card-text').textContent = 'Колода завершена.';
      return;
    }

    cardEl.classList.remove('is-flipping');
    // форсируем reflow для перезапуска анимации
    void cardEl.offsetWidth;
    cardEl.classList.add('is-flipping');

    // обновляем содержимое на середине анимации
    setTimeout(() => {
      $('#card-no').textContent   = 'Carta ' + toRoman(STATE.drawn.length);
      $('#card-type').textContent = TYPE_LABEL[card.type] || '—';
      $('#card-text').textContent = card.text;
    }, 380);
  };

  /* ─── игровая логика ─── */
  const startLevel = (level) => {
    STATE.level = level;
    STATE.drawn = [];
    STATE.current = null;
    STATE.deck = buildDeck();
    setView('play');
    renderHead();
    // первая карта — сразу
    drawNext({ initial: true });
  };

  const drawNext = (opts = {}) => {
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

  const skipCard = () => {
    // пропустить = переходим к следующей, текущую считаем «использованной»
    drawNext();
  };

  const switchMode = (mode) => {
    if (mode === STATE.mode) return;
    STATE.mode = mode;
    // перестраиваем колоду из непросмотренных
    const used = new Set(STATE.drawn.map((c) => c.text));
    STATE.deck = buildDeck().filter((c) => !used.has(c.text));
    // обновляем подсветку
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
        // лёгкая обратная связь
        btn.style.transform = 'translateY(-2px) scale(0.985)';
        setTimeout(() => { btn.style.transform = ''; }, 180);
        // запускаем уровень с дефолтным режимом «правда»
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

    // карту можно «вытянуть» кликом по самой карте
    $('#card').addEventListener('click', (e) => {
      // только если уже что-то отображалось
      if (STATE.drawn.length > 0) drawNext();
    });

    // keyboard
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
  document.addEventListener('DOMContentLoaded', () => {
    wire();
    startEmbers();
  });
})();
