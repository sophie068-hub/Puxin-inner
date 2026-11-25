(() => {
  const button = document.getElementById('install-button');
  const help = document.getElementById('install-help');
  if (window.matchMedia('(display-mode: standalone)').matches || navigator.standalone) return;

  let installPrompt;
  button.hidden = false;

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    installPrompt = event;
  });

  function hideInstallButton() {
    button.hidden = true;
    help.hidden = true;
    button.setAttribute('aria-expanded', 'false');
  }

  window.addEventListener('appinstalled', hideInstallButton);

  button.addEventListener('click', async () => {
    if (installPrompt) {
      const prompt = installPrompt;
      installPrompt = null;
      button.disabled = true;
      try {
        await prompt.prompt();
        const { outcome } = await prompt.userChoice;
        if (outcome === 'accepted') hideInstallButton();
        return;
      } catch {
        // Use the browser menu instructions if the install prompt is unavailable.
      } finally {
        button.disabled = false;
      }
    }

    const agent = navigator.userAgent;
    const isAppleMobile = /iPhone|iPad|iPod/.test(agent) ||
      (/Macintosh/.test(agent) && navigator.maxTouchPoints > 1);

    if (/Line\//i.test(agent)) {
      help.textContent = '請先從 LINE 選單用外部瀏覽器開啟網頁，再點一次這個按鈕。';
    } else if (isAppleMobile) {
      help.textContent = '在 Safari 開啟此頁，點「分享」→「加入主畫面」→「加入」。';
    } else if (/Android/.test(agent)) {
      help.textContent = '在 Chrome 點右上角「⋮」→「加到主畫面」，再依畫面提示完成。';
    } else {
      help.textContent = '開啟瀏覽器選單，選擇「安裝」或「建立捷徑」。Mac Safari 可從「檔案」選擇「加入 Dock」。';
    }
    help.hidden = !help.hidden;
    button.setAttribute('aria-expanded', String(!help.hidden));
  });
})();
