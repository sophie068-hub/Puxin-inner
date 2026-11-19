/* 觀音神諭卡與擲筊共用同一次提問；全部狀態只存在頁面記憶體。 */
(function () {
  'use strict';
  const root = document.getElementById('puxin-jiaobei');
  if (!root) return;
  const get = id => document.getElementById(id);
  const state = { card: null, result: null, resultCardId: null, preserveNextDraw: false };

  function renderContext() {
    get('jiaobei-card-context').hidden = !state.card;
    get('jiaobei-card-title').textContent = state.card ? state.card.id + '｜' + state.card.title : '';
    const drawnAfterCast = state.result && state.card && state.resultCardId !== state.card.id;
    get('jiaobei-card-context-label').textContent = drawnAfterCast ? '擲筊後抽到的觀音卡' : '本次觀音卡';
    get('jiaobei-card-prompt').textContent = drawnAfterCast ? '這張卡是在本次擲筊後抽到的，可以先回看卡片的提醒。' : '可以針對這張卡的提醒，整理成一個想請示的問題。';
    get('jiaobei-draw-guanyin').hidden = !state.result;
    const summary = get('guanyin-jiaobei-summary');
    summary.hidden = !state.result;
    get('guanyin-jiaobei-label').textContent = state.result ? '本次擲筊：' + state.result.title : '';
    get('guanyin-jiaobei-question').textContent = state.result && state.result.question ? '本次提問：' + state.result.question : '';
    get('guanyin-jiaobei-question').hidden = !state.result || !state.result.question;
    document.querySelectorAll('[data-jiaobei-card-id]').forEach(button => {
      button.textContent = state.result && state.resultCardId === button.dataset.jiaobeiCardId ? '回看這張卡的擲筊結果' : '接著擲筊';
    });
  }

  function noteCard(card) {
    if (!card) return;
    if (!state.preserveNextDraw) {
      state.result = null;
      state.resultCardId = null;
      root.dispatchEvent(new CustomEvent('puxin:jiaobei-clear', { detail: { clearQuestion: false } }));
    }
    state.preserveNextDraw = false;
    state.card = { id: card.id, title: card.title };
    renderContext();
  }

  function openForCard(card) {
    if (!state.card || state.card.id !== card.id) noteCard(card);
    if (state.result && state.resultCardId !== card.id) {
      state.result = null;
      state.resultCardId = null;
      root.dispatchEvent(new CustomEvent('puxin:jiaobei-clear', { detail: { clearQuestion: false } }));
      renderContext();
    }
    switchPage('jiaobei');
  }

  root.addEventListener('puxin:jiaobei-result', event => {
    state.result = { ...event.detail };
    state.resultCardId = state.card ? state.card.id : null;
    renderContext();
  });
  root.addEventListener('puxin:jiaobei-reset', () => {
    state.result = null;
    state.resultCardId = null;
    state.card = null;
    get('guanyin-result').replaceChildren();
    renderContext();
  });
  get('jiaobei-draw-guanyin').addEventListener('click', () => {
    state.preserveNextDraw = true;
    try {
      drawGuanyin();
    } finally {
      state.preserveNextDraw = false;
    }
    switchPage('guanyin');
  });
  get('jiaobei-view-card').addEventListener('click', () => switchPage('guanyin'));
  get('guanyin-view-jiaobei').addEventListener('click', () => switchPage('jiaobei'));
  window.PuxinJiaobeiFlow = Object.freeze({ noteCard, openForCard });
  renderContext();
})();
