// Google Apps Script - 出退勤打刻アプリ バックエンド

// スクリプトプロパティから取得（事前に設定が必要）
const LINE_CHANNEL_ACCESS_TOKEN = PropertiesService.getScriptProperties().getProperty('LINE_CHANNEL_ACCESS_TOKEN');
const LINE_GROUP_ID = PropertiesService.getScriptProperties().getProperty('LINE_GROUP_ID');

// スプレッドシート取得
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

// 各シート取得
function getSheets() {
  const ss = getSpreadsheet();
  return {
    master: ss.getSheetByName('研修生マスタ'),
    records: ss.getSheetByName('打刻記録'),
    complete: ss.getSheetByName('課題完了記録')
  };
}

// GETリクエスト処理
function doGet(e) {
  try {
    const action = e.parameter.action;
    const userId = e.parameter.userId;

    if (action === 'getTodayRecord') {
      return getTodayRecord(userId);
    }

    return createResponse(false, '無効なアクションです');
  } catch (error) {
    Logger.log('Error in doGet: ' + error.toString());
    return createResponse(false, 'エラーが発生しました: ' + error.toString());
  }
}

// POSTリクエスト処理
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    switch (action) {
      case 'clockIn':
        return clockIn(data.userId, data.userName);
      case 'clockOut':
        return clockOut(data.userId, data.userName);
      case 'reportComplete':
        return reportComplete(data.userId, data.userName, data.appUrl);
      default:
        return createResponse(false, '無効なアクションです');
    }
  } catch (error) {
    Logger.log('Error in doPost: ' + error.toString());
    return createResponse(false, 'エラーが発生しました: ' + error.toString());
  }
}

// 今日の記録を取得
function getTodayRecord(userId) {
  try {
    const sheets = getSheets();
    const recordsSheet = sheets.records;
    const today = Utilities.formatDate(new Date(), 'JST', 'yyyy/MM/dd');

    const data = recordsSheet.getDataRange().getValues();

    // ヘッダー行をスキップして検索
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0] === today && row[1] === userId) {
        // 該当レコードが見つかった
        return createResponse(true, '記録を取得しました', {
          record: {
            date: row[0],
            userId: row[1],
            userName: row[2],
            clockIn: row[3] ? formatTime(row[3]) : null,
            clockOut: row[4] ? formatTime(row[4]) : null,
            workHours: row[5] || null
          }
        });
      }
    }

    // 今日の記録がない
    return createResponse(true, '今日の記録はありません', {
      record: null
    });
  } catch (error) {
    Logger.log('Error in getTodayRecord: ' + error.toString());
    return createResponse(false, 'エラーが発生しました: ' + error.toString());
  }
}

// 出勤打刻
function clockIn(userId, userName) {
  try {
    const sheets = getSheets();
    const recordsSheet = sheets.records;
    const now = new Date();
    const today = Utilities.formatDate(now, 'JST', 'yyyy/MM/dd');
    const clockInTime = Utilities.formatDate(now, 'JST', 'HH:mm');

    // 今日の記録が既に存在するかチェック
    const data = recordsSheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === today && data[i][1] === userId) {
        return createResponse(false, '本日は既に出勤打刻済みです');
      }
    }

    // 新しい行を追加
    recordsSheet.appendRow([
      today,
      userId,
      userName,
      clockInTime,
      '', // 退勤時刻（未入力）
      ''  // 勤務時間（未計算）
    ]);

    // LINE通知
    sendLineMessage(`【出勤】\n${userName}\n${today} ${clockInTime}`);

    return createResponse(true, '出勤打刻が完了しました', {
      clockInTime: clockInTime
    });
  } catch (error) {
    Logger.log('Error in clockIn: ' + error.toString());
    return createResponse(false, 'エラーが発生しました: ' + error.toString());
  }
}

// 退勤打刻
function clockOut(userId, userName) {
  try {
    const sheets = getSheets();
    const recordsSheet = sheets.records;
    const now = new Date();
    const today = Utilities.formatDate(now, 'JST', 'yyyy/MM/dd');
    const clockOutTime = Utilities.formatDate(now, 'JST', 'HH:mm');

    const data = recordsSheet.getDataRange().getValues();

    // 今日の出勤記録を検索
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row[0] === today && row[1] === userId) {
        // 既に退勤済みかチェック
        if (row[4]) {
          return createResponse(false, '本日は既に退勤打刻済みです');
        }

        const clockInTime = row[3];

        // 勤務時間を計算
        const workHours = calculateWorkHours(clockInTime, clockOutTime);

        // 退勤時刻と勤務時間を更新
        recordsSheet.getRange(i + 1, 5).setValue(clockOutTime); // 退勤時刻
        recordsSheet.getRange(i + 1, 6).setValue(workHours);    // 勤務時間

        // LINE通知
        const message = `【退勤】\n${userName}\n出勤:${formatTime(clockInTime)}\n退勤:${clockOutTime}\n勤務:${workHours}`;
        sendLineMessage(message);

        return createResponse(true, '退勤打刻が完了しました', {
          clockInTime: formatTime(clockInTime),
          clockOutTime: clockOutTime,
          workHours: workHours
        });
      }
    }

    return createResponse(false, '本日の出勤記録が見つかりません');
  } catch (error) {
    Logger.log('Error in clockOut: ' + error.toString());
    return createResponse(false, 'エラーが発生しました: ' + error.toString());
  }
}

// 課題完了報告
function reportComplete(userId, userName, appUrl) {
  try {
    const sheets = getSheets();
    const completeSheet = sheets.complete;
    const now = new Date();
    const completeDateTime = Utilities.formatDate(now, 'JST', 'yyyy/MM/dd HH:mm');

    // 完了記録を追加
    completeSheet.appendRow([
      completeDateTime,
      userId,
      userName,
      appUrl,
      '' // 判定（管理者が入力）
    ]);

    // LINE通知
    const message = `【🎉課題完了報告🎉】\n研修生:${userName}(${userId})\n完了:${completeDateTime}\n\nアプリURL:\n${appUrl}\n\n確認をお願いします!`;
    sendLineMessage(message);

    return createResponse(true, '課題完了報告を送信しました');
  } catch (error) {
    Logger.log('Error in reportComplete: ' + error.toString());
    return createResponse(false, 'エラーが発生しました: ' + error.toString());
  }
}

// LINE通知送信
function sendLineMessage(message) {
  try {
    const url = 'https://api.line.me/v2/bot/message/push';

    const payload = {
      to: LINE_GROUP_ID,
      messages: [{
        type: 'text',
        text: message
      }]
    };

    const options = {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + LINE_CHANNEL_ACCESS_TOKEN
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();

    if (responseCode !== 200) {
      Logger.log('LINE API Error: ' + response.getContentText());
      throw new Error('LINE通知の送信に失敗しました');
    }

    Logger.log('LINE notification sent successfully');
  } catch (error) {
    Logger.log('Error in sendLineMessage: ' + error.toString());
    throw error;
  }
}

// 勤務時間計算
function calculateWorkHours(clockIn, clockOut) {
  // 時刻を分単位に変換
  const clockInParts = clockIn.toString().split(':');
  const clockOutParts = clockOut.toString().split(':');

  const clockInMinutes = parseInt(clockInParts[0]) * 60 + parseInt(clockInParts[1]);
  const clockOutMinutes = parseInt(clockOutParts[0]) * 60 + parseInt(clockOutParts[1]);

  const totalMinutes = clockOutMinutes - clockInMinutes;

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${hours}時間${minutes}分`;
}

// 時刻フォーマット
function formatTime(time) {
  if (!time) return '';
  if (typeof time === 'string') return time;

  // Date型の場合
  return Utilities.formatDate(time, 'JST', 'HH:mm');
}

// レスポンス作成
function createResponse(success, message, data = {}) {
  const response = {
    success: success,
    message: message,
    ...data
  };

  return ContentService
    .createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// 初期セットアップ用関数（手動実行）
function setupSheets() {
  const ss = getSpreadsheet();

  // シート1: 研修生マスタ
  let masterSheet = ss.getSheetByName('研修生マスタ');
  if (!masterSheet) {
    masterSheet = ss.insertSheet('研修生マスタ');
    masterSheet.appendRow(['研修生ID', '氏名', 'ステータス']);
    masterSheet.appendRow(['user01', 'あなたの名前', '進行中']);
  }

  // シート2: 打刻記録
  let recordsSheet = ss.getSheetByName('打刻記録');
  if (!recordsSheet) {
    recordsSheet = ss.insertSheet('打刻記録');
    recordsSheet.appendRow(['日付', '研修生ID', '氏名', '出勤時刻', '退勤時刻', '勤務時間']);
  }

  // シート3: 課題完了記録
  let completeSheet = ss.getSheetByName('課題完了記録');
  if (!completeSheet) {
    completeSheet = ss.insertSheet('課題完了記録');
    completeSheet.appendRow(['完了日時', '研修生ID', '氏名', 'アプリURL', '判定']);
  }

  Logger.log('シートのセットアップが完了しました');
}

// テスト用関数
function testSendLineMessage() {
  sendLineMessage('テストメッセージです');
}
