// 設定
const CONFIG = {
    // Google Apps ScriptのWebアプリURL
    GAS_URL: 'https://script.google.com/macros/s/AKfycbyuvTR82YO1GrQKU-JRbsm5kCblaPAZvLQmgfmGlmXndGOXjvEv--8Tz9rpxEFeLTMiHQ/exec',
    // 研修生ID
    USER_ID: 'user01',
    // 研修生名（実際の名前に変更してください）
    USER_NAME: '川瀬隼'
};

// グローバル変数
let todayRecord = null;

// DOM要素
const elements = {
    clockInBtn: document.getElementById('clock-in-btn'),
    clockOutBtn: document.getElementById('clock-out-btn'),
    completeBtn: document.getElementById('complete-btn'),
    currentDate: document.getElementById('current-date'),
    currentTime: document.getElementById('current-time'),
    statusText: document.getElementById('status-text'),
    userName: document.getElementById('user-name'),
    todayRecordDiv: document.getElementById('today-record'),
    loadingOverlay: document.getElementById('loading-overlay'),
    messageOverlay: document.getElementById('message-overlay'),
    messageText: document.getElementById('message-text'),
    messageClose: document.getElementById('message-close')
};

// 初期化
document.addEventListener('DOMContentLoaded', () => {
    init();
});

function init() {
    // ユーザー名表示
    elements.userName.textContent = `${CONFIG.USER_NAME} (${CONFIG.USER_ID})`;

    // 現在時刻の更新
    updateCurrentTime();
    setInterval(updateCurrentTime, 1000);

    // イベントリスナー設定
    elements.clockInBtn.addEventListener('click', handleClockIn);
    elements.clockOutBtn.addEventListener('click', handleClockOut);
    elements.completeBtn.addEventListener('click', handleComplete);
    elements.messageClose.addEventListener('click', hideMessage);

    // 今日の記録を取得
    loadTodayRecord();
}

// 現在時刻の更新
function updateCurrentTime() {
    const now = new Date();
    const days = ['日', '月', '火', '水', '木', '金', '土'];

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const day = days[now.getDay()];

    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    elements.currentDate.textContent = `${year}/${month}/${date} (${day})`;
    elements.currentTime.textContent = `${hours}:${minutes}:${seconds}`;
}

// 今日の記録を取得
async function loadTodayRecord() {
    try {
        showLoading();

        const response = await fetch(`${CONFIG.GAS_URL}?action=getTodayRecord&userId=${CONFIG.USER_ID}`);
        const data = await response.json();

        if (data.success) {
            todayRecord = data.record;
            updateUI();
        } else {
            throw new Error(data.message || '記録の取得に失敗しました');
        }
    } catch (error) {
        console.error('Error loading today record:', error);
        showMessage('記録の取得に失敗しました。\n' + error.message);
        // エラーでも基本的なUIは有効化
        updateUI();
    } finally {
        hideLoading();
    }
}

// UI更新
function updateUI() {
    if (!todayRecord || !todayRecord.clockIn) {
        // 未出勤
        elements.statusText.textContent = '📋 本日はまだ出勤していません';
        elements.clockInBtn.disabled = false;
        elements.clockOutBtn.disabled = true;
        elements.todayRecordDiv.innerHTML = '<p>まだ記録がありません</p>';
    } else if (todayRecord.clockIn && !todayRecord.clockOut) {
        // 出勤済み、未退勤
        elements.statusText.textContent = '✅ 出勤済み（勤務中）';
        elements.clockInBtn.disabled = true;
        elements.clockOutBtn.disabled = false;

        elements.todayRecordDiv.innerHTML = `
            <div class="record-item">
                <span class="record-label">出勤時刻</span>
                <span class="record-value">${todayRecord.clockIn}</span>
            </div>
        `;
    } else {
        // 出退勤完了
        elements.statusText.textContent = '🎉 本日の勤務は完了しています';
        elements.clockInBtn.disabled = true;
        elements.clockOutBtn.disabled = true;

        elements.todayRecordDiv.innerHTML = `
            <div class="record-item">
                <span class="record-label">出勤時刻</span>
                <span class="record-value">${todayRecord.clockIn}</span>
            </div>
            <div class="record-item">
                <span class="record-label">退勤時刻</span>
                <span class="record-value">${todayRecord.clockOut}</span>
            </div>
            <div class="record-item">
                <span class="record-label">勤務時間</span>
                <span class="record-value highlight">${todayRecord.workHours}</span>
            </div>
        `;
    }
}

// 出勤打刻
async function handleClockIn() {
    if (!confirm('出勤打刻を行いますか？')) return;

    try {
        showLoading();

        const response = await fetch(CONFIG.GAS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'clockIn',
                userId: CONFIG.USER_ID,
                userName: CONFIG.USER_NAME
            })
        });

        const data = await response.json();

        if (data.success) {
            showMessage('✅ 出勤打刻が完了しました！\n\nLINEに通知を送信しました。');
            await loadTodayRecord();
        } else {
            throw new Error(data.message || '出勤打刻に失敗しました');
        }
    } catch (error) {
        console.error('Error clock in:', error);
        showMessage('❌ 出勤打刻に失敗しました。\n\n' + error.message);
    } finally {
        hideLoading();
    }
}

// 退勤打刻
async function handleClockOut() {
    if (!confirm('退勤打刻を行いますか？')) return;

    try {
        showLoading();

        const response = await fetch(CONFIG.GAS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'clockOut',
                userId: CONFIG.USER_ID,
                userName: CONFIG.USER_NAME
            })
        });

        const data = await response.json();

        if (data.success) {
            showMessage('✅ 退勤打刻が完了しました！\n\n勤務お疲れ様でした。\nLINEに通知を送信しました。');
            await loadTodayRecord();
        } else {
            throw new Error(data.message || '退勤打刻に失敗しました');
        }
    } catch (error) {
        console.error('Error clock out:', error);
        showMessage('❌ 退勤打刻に失敗しました。\n\n' + error.message);
    } finally {
        hideLoading();
    }
}

// 課題完了報告
async function handleComplete() {
    const appUrl = window.location.href;
    const confirmMsg = `課題完了報告を送信しますか？\n\n以下の情報が管理者に送信されます：\n・研修生ID: ${CONFIG.USER_ID}\n・氏名: ${CONFIG.USER_NAME}\n・アプリURL: ${appUrl}`;

    if (!confirm(confirmMsg)) return;

    try {
        showLoading();

        const response = await fetch(CONFIG.GAS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'reportComplete',
                userId: CONFIG.USER_ID,
                userName: CONFIG.USER_NAME,
                appUrl: appUrl
            })
        });

        const data = await response.json();

        if (data.success) {
            showMessage('🎉 課題完了報告を送信しました！\n\n管理者が確認後、合格判定を行います。\nお疲れ様でした！');
        } else {
            throw new Error(data.message || '完了報告の送信に失敗しました');
        }
    } catch (error) {
        console.error('Error report complete:', error);
        showMessage('❌ 完了報告の送信に失敗しました。\n\n' + error.message);
    } finally {
        hideLoading();
    }
}

// ローディング表示
function showLoading() {
    elements.loadingOverlay.classList.add('show');
}

function hideLoading() {
    elements.loadingOverlay.classList.remove('show');
}

// メッセージ表示
function showMessage(message) {
    elements.messageText.textContent = message;
    elements.messageOverlay.classList.add('show');
}

function hideMessage() {
    elements.messageOverlay.classList.remove('show');
}

// 時刻フォーマット
function formatTime(hours, minutes) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

// 勤務時間計算
function calculateWorkHours(clockIn, clockOut) {
    const [inHour, inMin] = clockIn.split(':').map(Number);
    const [outHour, outMin] = clockOut.split(':').map(Number);

    let totalMinutes = (outHour * 60 + outMin) - (inHour * 60 + inMin);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;

    return `${hours}時間${minutes}分`;
}
