# 使用前設定

## config.js 設定

只需填入兩個變數：

```javascript
CLIENT_ID:      'YOUR_GOOGLE_OAUTH_CLIENT_ID',  // OAuth 用戶端 ID
SPREADSHEET_ID: 'YOUR_SPREADSHEET_ID',          // 試算表 ID
```

## 如何取得 CLIENT_ID

1. 前往 Google Cloud Console
2. 建立專案 → API 和服務 → 憑證
3. 啟用 Google Sheets API（在「程式庫」搜尋）
4. 建立 OAuth 2.0 用戶端 ID → 類型選「網路應用程式」
5. 授權的 JavaScript 來源填入開啟頁面的網域（本機開發用 `http://localhost`）
6. 複製「用戶端 ID」填入 config.js

## 如何取得 SPREADSHEET_ID

試算表網址：`https://docs.google.com/spreadsheets/d/【這段就是 ID】/edit`

## 功能說明

| 分頁 | 功能 |
|------|------|
| 新增記帳 | 填寫日期、類型、分類、金額、描述、付款方式後送出 |
| 帳務紀錄 | 依月份/類型篩選；顯示收入/支出/結餘摘要 + 明細表 |
| 分類分析 | 甜甜圈圖 + 依金額排序的分類清單及佔比 |
| 每月報表 | 月份長條圖（收入 vs 支出）+ 月份摘要表 |

## 注意事項

> ⚠️ 因為是純前端應用，必須透過 Web Server 開啟（不能直接開啟），本機可用 VS Code 的 Live Server 擴充功能，或執行 `npx serve .`
