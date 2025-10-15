
const CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzk23W61A8KrKb8KxJP_E61jFC3QTcKiNjnKE31wTKdQkWYTjhHKznGrrtrM7Dw-KLANA/exec',
  APP_URL: window.location.href
};

const elements = {
  clockInBtn: document.getElementById('clockInBtn'),
  clockOutBtn: document.getElementById('clockOutBtn'),
  completeBtn: document.getElementById('completeBtn'),
  currentTime: document.getElementById('currentTime'),
  currentDate: document.getElementById('currentDate'),
  status: document.getElementById('status'),
  loading: document.getElementById('loading'),
  modal: document.getElementById('modal'),
  modalTitle: document.getElementById('modalTitle'),
  modalMessage: document.getElementById('modalMessage'),
  modalCancel: document.getElementById('modalCancel'),
  modalOk: document.getElementById('modalOk')
};

document.addEventListener('DOMContentLoaded', () => {
  updateClock();
  setInterval(updateClock, 1000);
  
  elements.clockInBtn.addEventListener('click', handleClockIn);
  elements.clockOutBtn.addEventListener('click', handleClockOut);
  elements.completeBtn.addEventListener('click', handleComplete);
  
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
      .then(reg => console.log('Service Worker登録成功', reg))
      .catch(err => console.log('Service Worker登録失敗', err));
  }
});

function updateClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit', second: '2-digit'});
  const dateStr = now.toLocaleDateString('ja-JP', {year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short'});
  elements.currentTime.textContent = timeStr;
  elements.currentDate.textContent = dateStr;
}

async function handleClockIn() {
  const confirmed = await showConfirmModal('出勤打刻', '出勤打刻を行いますか？\nLINEグループに通知されます。');
  if (!confirmed) return;
  showLoading(true);
  try {
    const response = await fetch(CONFIG.GAS_URL, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'clockIn'})});
    const result = await response.json();
    if (result.success) {
      showStatus('success', result.message);
    } else {
      showStatus('error', result.message);
    }
  } catch (error) {
    console.error('Error:', error);
    showStatus('error', '通信エラーが発生しました');
  } finally {
    showLoading(false);
  }
}

async function handleClockOut() {
  const confirmed = await showConfirmModal('退勤打刻', '退勤打刻を行いますか？\n勤務時間が計算され、LINEグループに通知されます。');
  if (!confirmed) return;
  showLoading(true);
  try {
    const response = await fetch(CONFIG.GAS_URL, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'clockOut'})});
    const result = await response.json();
    if (result.success) {
      showStatus('success', result.message);
    } else {
      showStatus('error', result.message);
    }
  } catch (error) {
    console.error('Error:', error);
    showStatus('error', '通信エラーが発生しました');
  } finally {
    showLoading(false);
  }
}

async function handleComplete() {
  const confirmed = await showConfirmModal('🎉 課題完了報告', '課題完了報告を送信しますか？\n管理者のLINEに通知が届きます。');
  if (!confirmed) return;
  showLoading(true);
  try {
    const response = await fetch(CONFIG.GAS_URL, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({action: 'complete', appUrl: CONFIG.APP_URL})});
    const result = await response.json();
    if (result.success) {
      showStatus('success', result.message);
    } else {
      showStatus('error', result.message);
    }
  } catch (error) {
    console.error('Error:', error);
    showStatus('error', '通信エラーが発生しました');
  } finally {
    showLoading(false);
  }
}

function showStatus(type, message) {
  elements.status.className = `status show ${type}`;
  elements.status.textContent = message;
  setTimeout(() => {elements.status.classList.remove('show');}, 5000);
}

function showLoading(show) {
  if (show) {
    elements.loading.classList.add('show');
  } else {
    elements.loading.classList.remove('show');
  }
}

function showConfirmModal(title, message) {
  return new Promise((resolve) => {
    elements.modalTitle.textContent = title;
    elements.modalMessage.textContent = message;
    elements.modal.classList.add('show');
    const handleOk = () => {
      elements.modal.classList.remove('show');
      cleanup();
      resolve(true);
    };
    const handleCancel = () => {
      elements.modal.classList.remove('show');
      cleanup();
      resolve(false);
    };
    const cleanup = () => {
      elements.modalOk.removeEventListener('click', handleOk);
      elements.modalCancel.removeEventListener('click', handleCancel);
    };
    elements.modalOk.addEventListener('click', handleOk);
    elements.modalCancel.addEventListener('click', handleCancel);
  });
}