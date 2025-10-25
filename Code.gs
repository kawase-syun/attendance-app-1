// ============================================
// 出退勤打刻アプリ - Google Apps Script
// ============================================

// ============================================
// 設定セクション - ここを編集してください
// ============================================
const CONFIG = {
  // LINE Notify トークン（LINE Notifyで取得したトークンを設定）
  // 取得方法: https://notify-bot.line.me/ → マイページ → トークンを発行する
  LINE_NOTIFY_TOKEN: 'YOUR_LINE_NOTIFY_TOKEN_HERE',

  // スプレッドシートのシート名
  SHEET_NAME: '出退勤記録',

  // タイムゾーン
  TIMEZONE: 'Asia/Tokyo',

  // 日付フォーマット
  DATE_FORMAT: 'yyyy/MM/dd HH:mm:ss'
};

// ============================================
// ユーザーマッピング
// ============================================
const USER_MAP = {
  'user01': '川瀬隼',
  // 他のユーザーを追加する場合はここに記述
  // 'user02': '山田太郎',
  // 'user03': '佐藤花子',
};

// ============================================
// メイン処理 - GETリクエスト処理
// ============================================
function doGet(e) {
  try {
    const params = e.parameter;
    const action = params.action;
    const userId = params.userId;
    const timestamp = new Date(params.timestamp);

    let result;

    switch(action) {
      case 'checkin':
        result = handleCheckIn(userId, timestamp);
        break;
      case 'checkout':
        result = handleCheckOut(userId, timestamp);
        break;
      case 'complete':
        result = handleComplete(userId, params.appUrl, timestamp);
        break;
      default:
        result = {success: false, message: 'Invalid action'};
    }

    // JSONP形式でレスポンスを返す（CORS対策）
    const callback = params.callback || 'callback';
    const jsonp = callback + '(' + JSON.stringify(result) + ')';

    return ContentService
      .createTextOutput(jsonp)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);

  } catch (error) {
    Logger.log('doGet Error: ' + error);
    const callback = e.parameter.callback || 'callback';
    const errorResponse = callback + '(' + JSON.stringify({
      success: false,
      message: 'エラー: ' + error.message
    }) + ')';

    return ContentService
      .createTextOutput(errorResponse)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
}

// ============================================
// 出勤処理
// ============================================
function handleCheckIn(userId, timestamp) {
  try {
    const sheet = getOrCreateSheet();
    const timeStr = Utilities.formatDate(timestamp, CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);
    const userName = getUserName(userId);

    // スプレッドシートに記録
    sheet.appendRow([
      timeStr,
      userName,
      userId,
      '出勤',
      '',  // 退勤時刻（空欄）
      ''   // 勤務時間（空欄）
    ]);

    // LINE通知
    const message = `🌅 出勤打刻\n\n👤 ${userName} (${userId})\n🕐 ${timeStr}\n\n出勤を記録しました。`;
    sendLineNotification(message);

    return {
      success: true,
      message: '出勤を記録しました\nLINEに通知しました'
    };
  } catch (error) {
    Logger.log('CheckIn Error: ' + error);
    return {
      success: false,
      message: 'エラー: ' + error.message
    };
  }
}

// ============================================
// 退勤処理
// ============================================
function handleCheckOut(userId, timestamp) {
  try {
    const sheet = getOrCreateSheet();
    const timeStr = Utilities.formatDate(timestamp, CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);
    const userName = getUserName(userId);

    // 最新の出勤記録を取得
    const data = sheet.getDataRange().getValues();
    let checkInRow = null;
    let checkInTime = null;

    // 最後の行から検索（最新の出勤を見つける）
    for (let i = data.length - 1; i >= 1; i--) {  // ヘッダーをスキップ
      if (data[i][2] === userId && data[i][3] === '出勤' && !data[i][4]) {
        checkInRow = i + 1;  // スプレッドシートは1から始まる
        checkInTime = new Date(data[i][0]);
        break;
      }
    }

    let message = `🌆 退勤打刻\n\n👤 ${userName} (${userId})\n🕐 ${timeStr}\n\n`;
    let workHours = '';

    if (checkInTime) {
      // 勤務時間を計算
      const workMillis = timestamp - checkInTime;
      const hours = Math.floor(workMillis / (1000 * 60 * 60));
      const minutes = Math.floor((workMillis % (1000 * 60 * 60)) / (1000 * 60));
      workHours = `${hours}時間${minutes}分`;

      // 既存の出勤行を更新
      sheet.getRange(checkInRow, 5).setValue(timeStr);  // 退勤時刻
      sheet.getRange(checkInRow, 6).setValue(workHours);  // 勤務時間

      message += `⏱️ 勤務時間: ${workHours}\n`;
      message += `✅ お疲れ様でした！`;
    } else {
      // 出勤記録がない場合は新規行として追加
      sheet.appendRow([
        timeStr,
        userName,
        userId,
        '退勤',
        '',
        ''
      ]);
      message += '⚠️ 出勤記録が見つかりません\n退勤のみ記録しました';
    }

    // LINE通知
    sendLineNotification(message);

    return {
      success: true,
      message: workHours ? `退勤を記録しました\n勤務時間: ${workHours}` : '退勤を記録しました'
    };
  } catch (error) {
    Logger.log('CheckOut Error: ' + error);
    return {
      success: false,
      message: 'エラー: ' + error.message
    };
  }
}

// ============================================
// 課題完了報告処理
// ============================================
function handleComplete(userId, appUrl, timestamp) {
  try {
    const timeStr = Utilities.formatDate(timestamp, CONFIG.TIMEZONE, CONFIG.DATE_FORMAT);
    const userName = getUserName(userId);

    // LINE通知（管理者向け）
    const message = `🎉 課題完了報告\n\n👤 ${userName} (${userId})\n🕐 ${timeStr}\n\n✨ 課題が完了しました！\n\n📱 アプリURL:\n${appUrl || 'https://syun1077.github.io/attendance-app/'}`;
    sendLineNotification(message);

    return {
      success: true,
      message: '課題完了を報告しました\nLINEに通知しました'
    };
  } catch (error) {
    Logger.log('Complete Error: ' + error);
    return {
      success: false,
      message: 'エラー: ' + error.message
    };
  }
}

// ============================================
// LINE通知送信
// ============================================
function sendLineNotification(message) {
  const token = CONFIG.LINE_NOTIFY_TOKEN;

  // トークンが設定されていない場合はスキップ
  if (!token || token === 'YOUR_LINE_NOTIFY_TOKEN_HERE') {
    Logger.log('LINE通知スキップ: トークン未設定');
    Logger.log('送信予定メッセージ: ' + message);
    return;
  }

  const options = {
    method: 'post',
    headers: {
      'Authorization': 'Bearer ' + token
    },
    payload: {
      message: message
    },
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch('https://notify-api.line.me/api/notify', options);
    const responseCode = response.getResponseCode();

    if (responseCode === 200) {
      Logger.log('LINE通知成功');
    } else {
      Logger.log('LINE通知エラー: ' + responseCode);
      Logger.log('レスポンス: ' + response.getContentText());
    }
  } catch (error) {
    Logger.log('LINE通知例外: ' + error);
  }
}

// ============================================
// シート取得・作成
// ============================================
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  // シートが存在しない場合は作成
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);

    // ヘッダー行を作成
    const headers = ['日時', '名前', 'ユーザーID', '種別', '退勤時刻', '勤務時間'];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

    // ヘッダーのスタイル設定
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#4CAF50');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');

    // 列幅の調整
    sheet.setColumnWidth(1, 150);  // 日時
    sheet.setColumnWidth(2, 120);  // 名前
    sheet.setColumnWidth(3, 100);  // ユーザーID
    sheet.setColumnWidth(4, 80);   // 種別
    sheet.setColumnWidth(5, 150);  // 退勤時刻
    sheet.setColumnWidth(6, 120);  // 勤務時間

    // シートを固定
    sheet.setFrozenRows(1);
  }

  return sheet;
}

// ============================================
// ユーザー名取得
// ============================================
function getUserName(userId) {
  return USER_MAP[userId] || userId;
}

// ============================================
// テスト関数
// ============================================
function testCheckIn() {
  const result = handleCheckIn('user01', new Date());
  Logger.log(result);
}

function testCheckOut() {
  const result = handleCheckOut('user01', new Date());
  Logger.log(result);
}

function testComplete() {
  const result = handleComplete('user01', 'https://syun1077.github.io/attendance-app/', new Date());
  Logger.log(result);
}

function testLineNotify() {
  sendLineNotification('テスト通知\n\nこのメッセージが表示されればLINE通知は正常に動作しています。');
}
