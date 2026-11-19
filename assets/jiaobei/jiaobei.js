/* 璞心線上擲筊：平／凸各以一個隨機位元模擬，不宣稱實體筊杯機率。 */
(function (scope) {
  'use strict';

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

  const api = Object.freeze({ interpretFaces, castFaces, mount });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else scope.PuxinJiaobei = api;
  if (typeof document !== 'undefined') mount(document.getElementById('puxin-jiaobei'));
})(globalThis);
