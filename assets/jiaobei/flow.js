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


// Connect the ten day-master cards through the existing application loader.
(function () {
  function initBaziCards() {
    var result=document.getElementById('bazi-result');
    if (!result || document.getElementById('bazi-master-select')) return;
    var box=document.createElement('div');
    box.innerHTML="<details class=\"card bazi-catalog\">\n      <summary>查閱十日主人格圖卡</summary>\n      <div class=\"form-group\"><label class=\"form-label\" for=\"bazi-master-select\">選擇日主</label><select id=\"bazi-master-select\" class=\"form-select\"></select></div>\n      <button type=\"button\" class=\"btn-outline\" onclick=\"PuxinBazi.showSelected()\">查看這張圖卡</button>\n    </details>";
    result.parentNode.insertBefore(box.firstElementChild,result);
    result.setAttribute('aria-live','polite');
    var button=document.querySelector('.bazi-catalog button');
    button.disabled=true;
    var css=document.createElement('link');
    css.rel='stylesheet';
    css.href='assets/cards/bazi/bazi.css?v=20261119-water02';
    document.head.appendChild(css);
    var script=document.createElement('script');
    script.src='assets/cards/bazi/bazi.js?v=20261119-water02';
    script.onload=function () {
      button.disabled=false;
    window.calcBazi = function calcBazi() {
    const y = document.getElementById('bz-year').value;
    const m = document.getElementById('bz-month').value;
    const d = document.getElementById('bz-day').value;
    const hourIdx = parseInt(document.getElementById('bz-hour').value, 10);
    const result = document.getElementById('bazi-result');
    if (!validGregorianDate(+y, +m, +d)) {
      result.textContent = '這個日期不存在，請重新選擇。'; return;
    }
    if (!window.iztro?.astro) {
      result.textContent = '排盤程式尚未載入，請確認網路連線後再試。'; return;
    }
    if (!window.PuxinBazi) {
      result.textContent = '圖卡資料尚未載入，請稍後再試。'; return;
    }
    try {
      const astrolabe = iztro.astro.bySolar(y + '-' + m + '-' + d, hourIdx, '女', true, 'zh-TW');
      const pillars = String(astrolabe.chineseDate).match(/[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]/g);
      if (!pillars || pillars.length !== 4) throw new Error('無法取得完整四柱');
      window.PuxinBazi.showReading(pillars);
    } catch (err) {
      console.error('八字排盤失敗：', err);
      result.innerHTML = '<div class="result-box" style="color:#8C4A4A">日期格式有誤，請重新確認出生年月日後再試一次。</div>';
    }
  };
      document.documentElement.setAttribute('data-bazi-version','20261119-bazi10-water02');
    };
    script.onerror=function () { button.textContent='圖卡資料尚未載入，請稍後再試'; };
    document.head.appendChild(script);
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',initBaziCards,{once:true}); else initBaziCards();
})();
