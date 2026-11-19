/* 璞心線上擲筊：平／凸各以一個隨機位元模擬，不宣稱實體筊杯機率。 */
(function (scope) {
  'use strict';
  const scriptUrl = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : '';

  const readings = Object.freeze({
    yes: Object.freeze({ title: '聖筊', faces: '一個平面朝上，一個凸面朝上', meaning: '傳統解讀：同意、可以。', reflection: '此刻的你，有沒有一點安心？把這份感受收好，再想一個自己願意踏出的小步驟。' }),
    laugh: Object.freeze({ title: '笑筊', faces: '兩個平面朝上', meaning: '傳統解讀：尚未明確答覆。', reflection: '先不急著再問。看看這個問題裡，是不是同時藏著好幾件事？試著留下一件最想釐清的。' }),
    no: Object.freeze({ title: '陰筊', faces: '兩個凸面朝上', meaning: '傳統解讀：不同意、不宜。', reflection: '先停一下，留意自己對這個結果的感受。你可以重新看看眼前的條件，也可以給自己多一點時間。' })
  });

  function interpretFaces(faces) {
    if (!Array.isArray(faces) || faces.length !== 2 || faces.some(face => face !== 'flat' && face !== 'round')) {
      throw new TypeError('需要兩個有效的筊杯朝向。');
    }
    const kind = faces[0] !== faces[1] ? 'yes' : faces[0] === 'flat' ? 'laugh' : 'no';
    return { kind, ...readings[kind] };
  }

  function castFaces(randomSource = scope.crypto) {
    if (!randomSource || typeof randomSource.getRandomValues !== 'function') {
      throw new Error('目前的瀏覽器無法產生隨機結果，請換個瀏覽器再試。');
    }
    const bytes = randomSource.getRandomValues(new Uint8Array(2));
    return Array.from(bytes, value => (value & 1) === 0 ? 'flat' : 'round');
  }

  function createImpactAudio({ button, hint, src, isActive = () => true, env = scope }) {
    if (!button || !hint) return { play() {}, stop() {} }; // 相容仍開著舊版頁面的訪客。
    const Context = env.AudioContext || env.webkitAudioContext;
    const storageKey = 'puxin-jiaobei-sound-muted';
    const sources = new Set();
    let enabled = true;
    let generation = 0;
    let context = null;
    let decoded = null;
    const clock = () => env.performance ? env.performance.now() : Date.now();
    try { enabled = env.localStorage.getItem(storageKey) !== '1'; } catch (_) {}

    function render() {
      button.textContent = '落地音效：' + (enabled ? '開啟' : '靜音');
      button.setAttribute('aria-pressed', String(enabled));
      hint.textContent = enabled ? '擲筊時播放木筊落地聲' : '音效已靜音';
    }
    function stop() {
      generation += 1;
      for (const source of sources) {
        try { source.stop(); } catch (_) {}
      }
      sources.clear();
    }
    if (!Context) {
      button.disabled = true;
      button.textContent = '落地音效：暫不支援';
      button.setAttribute('aria-pressed', 'false');
      hint.textContent = '仍可正常擲筊與抽卡';
      return { play() {}, stop };
    }

    // 僅預載小型音檔；音訊裝置在使用者點擊後才啟用。
    const sample = env.fetch(src).then(response => {
      if (!response.ok) throw new Error('Audio unavailable');
      return response.arrayBuffer();
    }).catch(() => null);
    render();
    button.addEventListener('click', () => {
      enabled = !enabled;
      stop();
      try { env.localStorage.setItem(storageKey, enabled ? '0' : '1'); } catch (_) {}
      render();
    });

    function play(reducedMotion) {
      stop();
      if (!enabled || !isActive()) return;
      const token = generation;
      const started = clock();
      try {
        if (!context) context = new Context();
        // resume 必須在這次點擊內直接呼叫，讓手機瀏覽器取得播放手勢。
        const resumed = context.state === 'running' ? Promise.resolve() : context.resume();
        if (!decoded) decoded = sample.then(bytes => bytes ? context.decodeAudioData(bytes.slice(0)) : null);
        Promise.all([resumed, decoded]).then(([, buffer]) => {
          if (token !== generation || !enabled || !isActive()) return;
          if (!buffer || context.state !== 'running') {
            hint.textContent = '目前無法播放音效，仍可繼續擲筊';
            return;
          }
          const elapsed = (clock() - started) / 1000;
          // 對齊左右筊杯第一次碰地（57%／62%）與較輕的回彈落定。
          const hits = reducedMotion ? [[0.04, 0.4, 1]] : [[0.7695, 0.46, 1], [0.837, 0.38, 0.94], [1.26, 0.19, 1.08], [1.33, 0.13, 1.02]];
          for (const [at, volume, rate] of hits) {
            if (at < elapsed - 0.05) continue; // 載入太慢時不補播已錯過的碰地聲。
            const source = context.createBufferSource();
            const gain = context.createGain();
            source.buffer = buffer;
            source.playbackRate.value = rate;
            gain.gain.value = volume;
            source.connect(gain);
            gain.connect(context.destination);
            sources.add(source);
            source.onended = () => { sources.delete(source); source.disconnect(); gain.disconnect(); };
            source.start(context.currentTime + Math.max(0, at - elapsed));
          }
        }).catch(() => {
          if (token === generation && enabled) hint.textContent = '目前無法播放音效，仍可繼續擲筊';
        });
      } catch (_) {
        hint.textContent = '目前無法播放音效，仍可繼續擲筊';
      }
    }
    return { play, stop };
  }

  function mount(root) {
    if (!root || root.dataset.mounted === 'true') return;
    root.dataset.mounted = 'true';
    const get = id => root.querySelector('#' + id);
    const stage = get('stage');
    const question = get('question');
    const cast = get('cast');
    const reset = get('reset');
    const status = get('status');
    const result = get('result');
    const blocks = Array.from(root.querySelectorAll('.block'));
    const labels = [get('face-a'), get('face-b')];
    const page = typeof root.closest === 'function' ? root.closest('.page') : null;
    const sound = createImpactAudio({
      button: get('sound-toggle'), hint: get('sound-hint'),
      src: scriptUrl ? new URL('wood-impact-v1.wav', scriptUrl).href : 'wood-impact-v1.wav',
      isActive: () => !document.hidden && (!page || page.classList.contains('active'))
    });
    if (typeof document.addEventListener === 'function') document.addEventListener('visibilitychange', () => { if (document.hidden) sound.stop(); });
    if (page && scope.MutationObserver) new scope.MutationObserver(() => {
      if (!page.classList.contains('active')) sound.stop();
    }).observe(page, { attributes: true, attributeFilter: ['class'] });
    let busy = false;
    let hasResult = false;
    let generation = 0;
    function updatePrayer() {
      get('prayer-question').textContent = question.value.trim() || '在心裡說清楚，最想請示的一件事。';
    }
    question.addEventListener('input', updatePrayer);
    updatePrayer();

    cast.addEventListener('click', async () => {
      if (busy || hasResult) return;
      const castGeneration = ++generation;
      busy = true;
      cast.disabled = true;
      question.readOnly = true;
      result.hidden = true;
      reset.hidden = true;
      let faces;
      try {
        faces = castFaces();
      } catch (error) {
        status.textContent = error.message;
        busy = false;
        cast.disabled = false;
        question.readOnly = false;
        return;
      }
      stage.classList.add('is-tossing');
      stage.setAttribute('aria-label', '筊杯正在翻動');
      labels.forEach(label => { label.textContent = '翻動中'; });
      status.textContent = '慢慢呼吸，等待筊杯落定。';
      cast.textContent = '筊杯翻動中…';

      const reducedMotion = scope.matchMedia && scope.matchMedia('(prefers-reduced-motion: reduce)').matches;
      sound.play(reducedMotion);
      await new Promise(resolve => scope.setTimeout(resolve, reducedMotion ? 120 : 1350));
      if (castGeneration !== generation) return;
      stage.classList.remove('is-tossing');
      const reading = interpretFaces(faces);
      blocks.forEach((block, i) => {
        block.dataset.face = faces[i];
        labels[i].textContent = faces[i] === 'flat' ? '平面朝上' : '凸面朝上';
      });
      stage.setAttribute('aria-label', reading.title + '，' + reading.faces);
      result.dataset.kind = reading.kind;
      get('result-title').textContent = reading.title;
      get('result-faces').textContent = reading.faces;
      get('result-meaning').textContent = reading.meaning;
      get('result-reflection').textContent = reading.reflection;
      result.hidden = false;
      status.textContent = '本次結果：' + reading.title + '。' + reading.meaning;
      cast.hidden = true;
      reset.hidden = false;
      busy = false;
      hasResult = true;
      root.dispatchEvent(new CustomEvent('puxin:jiaobei-result', { detail: { faces, ...reading, question: question.value.trim() } }));
    });

    function clearState(clearQuestion) {
      generation += 1;
      sound.stop();
      busy = false;
      stage.classList.remove('is-tossing');
      hasResult = false;
      if (clearQuestion) question.value = '';
      updatePrayer();
      question.readOnly = false;
      result.hidden = true;
      reset.hidden = true;
      cast.hidden = false;
      cast.disabled = false;
      cast.textContent = '靜心，擲筊';
      blocks[0].dataset.face = 'flat';
      blocks[1].dataset.face = 'round';
      labels.forEach(label => { label.textContent = '筊杯'; });
      stage.setAttribute('aria-label', '一對紅色筊杯，尚未擲筊');
      status.textContent = '準備好後，輕按下方按鈕。';
    }

    root.addEventListener('puxin:jiaobei-clear', event => {
      clearState(!event.detail || event.detail.clearQuestion !== false);
    });
    reset.addEventListener('click', () => {
      clearState(true);
      root.dispatchEvent(new CustomEvent('puxin:jiaobei-reset'));
      question.focus();
    });
  }

  const api = Object.freeze({ interpretFaces, castFaces, mount, createImpactAudio });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else scope.PuxinJiaobei = api;
  if (typeof document !== 'undefined') mount(document.getElementById('puxin-jiaobei'));
})(globalThis);
