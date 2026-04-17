/**
 * config.js – 請在此填入您的 Google 設定
 *
 * 如何取得 CLIENT_ID：
 *   1. 前往 https://console.cloud.google.com/
 *   2. 建立專案 → API 和服務 → 憑證
 *   3. 建立「OAuth 2.0 用戶端 ID」→ 類型選「網路應用程式」
 *   4. 授權的 JavaScript 來源填入你開啟此頁面的網域（例如 http://localhost 或 https://你的網域）
 *   5. 複製「用戶端 ID」填入下方
 *
 * 如何取得 SPREADSHEET_ID：
 *   Google 試算表網址格式：
 *   https://docs.google.com/spreadsheets/d/【SPREADSHEET_ID】/edit
 *   複製中間那段字串填入下方
 */
const CONFIG = {
  // ✏️ 請填入您的 Google OAuth 2.0 用戶端 ID
  CLIENT_ID: '530578850177-0tjl1cg7a8tmhbe468fkft1331fded92.apps.googleusercontent.com',

  // ✏️ 請填入您的 Google 試算表 ID（網址列 /d/ 後面那段）
  SPREADSHEET_ID: '1r4z9xOiePH46as-JJBYm6R5Lkog1eK4xnLxvGyryitg',

  // Google Sheets API 所需的授權範圍（不須修改）
  SCOPES: 'https://www.googleapis.com/auth/spreadsheets openid profile email',

  // 工作表名稱（若您的工作表名稱不同，請於此修改）
  SHEET_RECORDS: '記帳紀錄',
  SHEET_FIELDS:  '欄位表',
};
