const tgBtn = document.getElementById('tgBtn');
const retryBtn = document.getElementById('retryBtn');
const cancelBtn = document.getElementById('cancelBtn');

const stageLogin = document.getElementById('stage-login');
const stageWaiting = document.getElementById('stage-waiting');
const stageSubscription = document.getElementById('stage-subscription');
const stageError = document.getElementById('stage-error');
const checkSubscriptionBtn = document.getElementById('checkSubscriptionBtn');

let pollTimer = null;
let currentSessionId = null;
let currentBotLink = null;
let activeStage = null;

function showStage(stage) {
  if (activeStage === stage) return;
  [stageLogin, stageWaiting, stageSubscription, stageError].forEach(s => s.classList.add('hidden'));
  stage.classList.remove('hidden');
  activeStage = stage;
}

async function startLogin() {
  try {
    const res = await fetch('/api/session', { method: 'POST' });
    const data = await res.json();
    currentSessionId = data.sessionId;
    currentBotLink = data.botLink;

    // Открываем бота в новой вкладке
    window.open(currentBotLink, '_blank');

    showStage(stageWaiting);
    pollSession();
  } catch (e) {
    showStage(stageError);
  }
}

function pollSession() {
  clearInterval(pollTimer);
  pollTimer = setInterval(async () => {
    if (!currentSessionId) return;
    try {
      const res = await fetch(`/api/session/${currentSessionId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.authorized) {
        clearInterval(pollTimer);
        localStorage.setItem('tg_id', data.telegramId);
        localStorage.setItem('tg_auth_token', data.authToken);
        localStorage.setItem('tg_username', data.username || '');
        localStorage.setItem('tg_first_name', data.firstName || '');
        window.location.href = '/app.html';
      } else if (data.subscriptionRequired) {
        showStage(stageSubscription);
      }
    } catch (e) {
      // Молча пробуем на следующем тике
    }
  }, 2000);
}

function stopLogin() {
  clearInterval(pollTimer);
  currentSessionId = null;
  currentBotLink = null;
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
