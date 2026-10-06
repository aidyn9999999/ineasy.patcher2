const tgBtn = document.getElementById('tgBtn');
const retryBtn = document.getElementById('retryBtn');
const cancelBtn = document.getElementById('cancelBtn');

const stageLogin = document.getElementById('stage-login');
const stageWaiting = document.getElementById('stage-waiting');
const stageSubscription = document.getElementById('stage-subscription');
const stageError = document.getElementById('stage-error');
const checkSubscriptionBtn = document.getElementById('checkSubscriptionBtn');
const telegramFallbackLink = document.getElementById('telegramFallbackLink');
const loginTranslations = {
  ru: {
    title: 'Патчите своё видео прямо сейчас.',
    lede: 'Публикуйте в высоком качестве.',
    login: 'Войти через Telegram',
    botHint: 'Откроется бот @ineasybot — нажмите «Запустить» в чате.',
    browserWarning: 'Если вход не проходит, откройте сайт в Chrome или другом браузере. Safari и встроенный браузер Telegram могут не завершить подтверждение.',
    waiting: 'Ждём подтверждение в Telegram…',
    openTelegram: 'Открыть Telegram',
    cancel: 'Отменить',
    subscription: '✕ Сначала подпишитесь на канал новостей, чтобы продолжить.',
    subscribe: 'Подписаться на канал',
    subscriptionHint: 'После подписки вернитесь сюда и подтвердите её в Telegram.',
    subscribed: 'Я подписался',
    loginError: 'Не получилось подтвердить вход. Проверьте соединение и попробуйте ещё раз.',
    retry: 'Попробовать снова',
  },
  en: {
    title: 'Patch your video now.',
    lede: 'Publish in high quality.',
    login: 'Sign in with Telegram',
    botHint: 'Telegram will open @ineasybot. Tap “Start” in the chat.',
    browserWarning: 'If sign-in fails, open this site in Chrome or another browser. Safari and Telegram’s built-in browser may not complete sign-in.',
    waiting: 'Waiting for Telegram confirmation…',
    openTelegram: 'Open Telegram',
    cancel: 'Cancel',
    subscription: '✕ Subscribe to the news channel to continue.',
    subscribe: 'Subscribe to the channel',
    subscriptionHint: 'After subscribing, return here and confirm in Telegram.',
    subscribed: 'I subscribed',
    loginError: 'Could not confirm sign-in. Check your connection and try again.',
    retry: 'Try again',
  },
  kk: {
    title: 'Бейнеңізді қазір патчтаңыз.',
    lede: 'Жоғары сапада жариялаңыз.',
    login: 'Telegram арқылы кіру',
    botHint: '@ineasybot ашылады. Чаттағы «Бастау» түймесін басыңыз.',
    browserWarning: 'Кіру орындалмаса, сайтты Chrome немесе басқа браузерде ашыңыз. Safari және Telegram ішкі браузері авторизацияны аяқтамауы мүмкін.',
    waiting: 'Telegram растауын күтіп жатырмыз…',
    openTelegram: 'Telegram ашу',
    cancel: 'Болдырмау',
    subscription: '✕ Жалғастыру үшін жаңалықтар арнасына жазылыңыз.',
    subscribe: 'Арнаға жазылу',
    subscriptionHint: 'Жазылған соң осында оралып, Telegram ішінде растаңыз.',
    subscribed: 'Жазылдым',
    loginError: 'Кіру расталмады. Байланысты тексеріп, қайта көріңіз.',
    retry: 'Қайталап көру',
  },
};

function applyLoginLanguage(language) {
  const selected = loginTranslations[language] ? language : 'ru';
  const text = loginTranslations[selected];
  document.documentElement.lang = selected;
  try { localStorage.setItem('ineasy-language', selected); } catch (error) {
    try { sessionStorage.setItem('ineasy-language', selected); } catch (storageError) {}
  }
  document.getElementById('loginTitle').textContent = text.title;
  document.getElementById('loginLede').textContent = text.lede;
  document.getElementById('loginButtonLabel').textContent = text.login;
  document.getElementById('loginBotHint').textContent = text.botHint;
  document.getElementById('browserWarning').textContent = text.browserWarning;
  document.getElementById('waitingText').textContent = text.waiting;
  document.getElementById('telegramFallbackLink').textContent = text.openTelegram;
  cancelBtn.textContent = text.cancel;
  document.getElementById('subscriptionText').textContent = text.subscription;
  document.getElementById('subscriptionLink').textContent = text.subscribe;
  document.getElementById('subscriptionHint').textContent = text.subscriptionHint;
  checkSubscriptionBtn.textContent = text.subscribed;
  document.getElementById('loginErrorText').textContent = text.loginError;
  retryBtn.textContent = text.retry;
  document.querySelectorAll('[data-login-lang]').forEach((button) => {
    button.classList.toggle('active', button.dataset.loginLang === selected);
  });
}

let pollTimer = null;
let currentSessionId = null;
let currentBotLink = null;
let activeStage = null;
let pollInFlight = false;

function showStage(stage) {
  if (activeStage === stage) return;
  [stageLogin, stageWaiting, stageSubscription, stageError].forEach(s => s.classList.add('hidden'));
  stage.classList.remove('hidden');
  activeStage = stage;
}

async function startLogin() {
  const telegramWindow = window.open('about:blank', '_blank');
  tgBtn.disabled = true;
  showStage(stageWaiting);
  try {
    const res = await fetch('/api/session', { method: 'POST' });
    if (!res.ok) throw new Error('Could not start Telegram login.');
    const data = await res.json();
    currentSessionId = data.sessionId;
    currentBotLink = data.botLink;
    if (telegramFallbackLink) {
      telegramFallbackLink.href = currentBotLink;
      telegramFallbackLink.classList.remove('hidden');
    }
    if (telegramWindow && !telegramWindow.closed) telegramWindow.location.href = currentBotLink;
    pollSession();
  } catch (e) {
    telegramWindow?.close();
    tgBtn.disabled = false;
    showStage(stageError);
  }
}

function storeLoginValue(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch (storageError) {
      return false;
    }
  }
}

async function pollSessionOnce() {
  if (!currentSessionId || pollInFlight) return;
  pollInFlight = true;
  try {
    const res = await fetch(`/api/session/${encodeURIComponent(currentSessionId)}`, { cache: 'no-store' });
    if (res.status === 404) {
      clearInterval(pollTimer);
      showStage(stageError);
      return;
    }
    if (!res.ok) return;
    const data = await res.json();
    if (data.authorized) {
      clearInterval(pollTimer);
      const saved = [
        storeLoginValue('tg_id', data.telegramId),
        storeLoginValue('tg_auth_token', data.authToken),
        storeLoginValue('tg_username', data.username || ''),
        storeLoginValue('tg_first_name', data.firstName || ''),
      ].every(Boolean);
      if (!saved) {
        showStage(stageError);
        return;
      }
      window.location.replace('/app.html');
    } else if (data.subscriptionRequired) {
      showStage(stageSubscription);
    }
  } catch (e) {
    // Retry when the page is visible or at the next interval.
  } finally {
    pollInFlight = false;
  }
}

function pollSession() {
  clearInterval(pollTimer);
  pollTimer = setInterval(pollSessionOnce, 2000);
  pollSessionOnce();
}

function stopLogin() {
  clearInterval(pollTimer);
  currentSessionId = null;
  currentBotLink = null;
  telegramFallbackLink?.classList.add('hidden');
  tgBtn.disabled = false;
  showStage(stageLogin);
}

function recheckSubscription() {
  if (currentBotLink) window.open(currentBotLink, '_blank');
  showStage(stageWaiting);
}

tgBtn.addEventListener('click', startLogin);
retryBtn.addEventListener('click', startLogin);
cancelBtn.addEventListener('click', stopLogin);
checkSubscriptionBtn.addEventListener('click', recheckSubscription);
document.querySelectorAll('[data-login-lang]').forEach((button) => {
  button.addEventListener('click', () => applyLoginLanguage(button.dataset.loginLang));
});
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) pollSessionOnce();
});
window.addEventListener('focus', pollSessionOnce);
let savedLoginLanguage = 'ru';
try { savedLoginLanguage = localStorage.getItem('ineasy-language') || 'ru'; } catch (error) {
  try { savedLoginLanguage = sessionStorage.getItem('ineasy-language') || 'ru'; } catch (storageError) {}
}
applyLoginLanguage(savedLoginLanguage);
