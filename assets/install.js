(() => {
  const button = document.getElementById('install-button');
  const help = document.getElementById('install-help');
  if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) return;

  const agent = navigator.userAgent;
  const isAndroid = /Android/i.test(agent);
  const isAppleMobile = /iPhone|iPad|iPod/.test(agent) ||
    (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1);
  const isInApp = /Line\/|FBAN|FBAV|Instagram/i.test(agent) ||
    (isAndroid && /; wv\)/i.test(agent));
  let installPrompt;
  button.hidden = false;

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    if (!isInApp) installPrompt = event;
  });

  function hideInstallButton() {
    button.hidden = true;
    help.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  }

  window.addEventListener('appinstalled', hideInstallButton);

  function showHelp(visible) {
    help.hidden = !visible;
    button.setAttribute('aria-expanded', String(visible));
  }

  button.addEventListener('click', async () => {
    const showFallback = Boolean(installPrompt) || help.hidden;
    if (installPrompt && !isInApp) {
      const prompt = installPrompt;
      installPrompt = null;
      button.disabled = true;
      try {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === 'accepted') {
          hideInstallButton();
          return;
        }
        if (!isAndroid || button.hidden) return;
      } catch {
        // Use the browser menu instructions if the install prompt is unavailable.
      } finally {
        button.disabled = false;
      }
    }

    if (isInApp) {
      help.textContent = isAndroid
        ? '請點右上角「⋮」並選擇「在瀏覽器中開啟」。用 Chrome 開啟璞心後，再點一次「點我加到桌面」。'
        : '請從 App 選單用 Safari 開啟，再點一次「點我加到桌面」。';
    } else if (isAppleMobile) {
      help.textContent = '在 Safari 開啟此頁，點「分享」→「加入主畫面」→「加入」。';
    } else if (isAndroid && /SamsungBrowser/i.test(agent)) {
      help.textContent = '點 Samsung Internet 的「☰」選單 →「新增頁面至」→「主螢幕」。';
    } else if (isAndroid) {
      help.textContent = '點 Chrome 網址列旁的「⋮」→「加入主畫面」或「安裝與建立捷徑」→「安裝」或「建立捷徑」。看到「新增」時，點一下就能完成。';
    } else {
      help.textContent = '開啟瀏覽器選單，選擇「安裝」或「建立捷徑」。Mac Safari 可從「檔案」選擇「加入 Dock」。';
    }
    showHelp(showFallback);
  });
})();
