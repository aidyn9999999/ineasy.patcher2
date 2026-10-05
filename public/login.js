const tgBtn = document.getElementById('tgBtn');
const retryBtn = document.getElementById('retryBtn');
const cancelBtn = document.getElementById('cancelBtn');

const stageLogin = document.getElementById('stage-login');
const stageWaiting = document.getElementById('stage-waiting');
const stageSubscription = document.getElementById('stage-subscription');
const stageError = document.getElementById('stage-error');
const checkSubscriptionBtn = document.getElementById('checkSubscriptionBtn');
const telegramFallbackLink = document.getElementById('telegramFallbackLink');

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
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) pollSessionOnce();
});
window.addEventListener('focus', pollSessionOnce);
