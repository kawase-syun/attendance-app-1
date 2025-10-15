const CONFIG = {
  GAS_URL: 'https://script.google.com/macros/s/AKfycbzk23W61A8KrKb8KxJP_E61jFC3QTcKiNjnKE31wTKdQkWYTjhHKznGrrtrM7Dw-KLANA/exec',
  APP_URL: window.location.href
};
```

⚠️ **注意点:**
- URLは `'` (シングルクォート) で囲む
- 最後にカンマ `,` を忘れずに
- URLの前後にスペースを入れない

### ④ 保存

1. 「ファイル」→「名前を付けて保存」
2. 保存場所: `attendance-app` フォルダ
3. ファイル名: `app.js`
4. ファイルの種類: **すべてのファイル**
5. エンコード: **UTF-8**
6. 「保存」

---

## 📱 Step 5: manifest.json の保存

### ① コピー＆保存
```
manifest.json - PWA設定
```

1. アーティファクトからコピー
2. 新規ファイルに貼り付け
3. ファイル名: `manifest.json`
4. `attendance-app` フォルダに保存

---

## ⚙️ Step 6: service-worker.js の保存

### ① コピー＆保存
```
service-worker.js - Service Worker
```

1. アーティファクトからコピー
2. 新規ファイルに貼り付け
3. ファイル名: `service-worker.js`
4. `attendance-app` フォルダに保存

---

## 🖼️ Step 7: アイコン画像の準備

### 方法A: 簡単！絵文字から作成

#### 1. Emoji to PNGにアクセス
https://emoji-to-png.com/

#### 2. 絵文字を選択
- 📋（クリップボード）
- ⏰（時計）
- 📱（スマホ）

など好きなものを選択

#### 3. 192x192pxをダウンロード
1. Size: **192** を入力
2. 「Download PNG」をクリック
3. ダウンロードされたファイルを `icon-192.png` にリネーム
4. `attendance-app` フォルダに移動

#### 4. 512x512pxをダウンロード
1. Size: **512** を入力
2. 「Download PNG」をクリック
3. ダウンロードされたファイルを `icon-512.png` にリネーム
4. `attendance-app` フォルダに移動

### 方法B: シンプルな色付き画像を自作

**Windows ペイント3Dの場合:**
1. ペイント3Dを開く
2. 「新規作成」
3. キャンバス設定: 192 x 192 ピクセル
4. 背景色を選択（例: 緑）
5. テキストツールで「出退勤」と入力
6. 「名前を付けて保存」→ `icon-192.png`
7. 同様に 512 x 512 で `icon-512.png` を作成

---

## ✅ 完成確認

### フォルダの中身をチェック

`attendance-app` フォルダを開いて、以下のファイルがあるか確認：
```
attendance-app/
├── index.html       ✅
├── style.css        ✅
├── app.js           ✅ (GAS_URLを設定済み)
├── manifest.json    ✅
├── service-worker.js ✅
├── icon-192.png     ✅
└── icon-512.png     ✅