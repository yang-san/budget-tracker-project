/**
 * sheets.js – Google Sheets API 操作
 *
 * 提供三個函數：
 *   fetchFieldOptions() → 從 [欄位表] 讀取分類、付款方式等選項
 *   fetchRecords()      → 從 [記帳紀錄] 讀取所有記帳資料
 *   appendRecord(data)  → 新增一筆記帳至 [記帳紀錄]
 */

/* --------------------------------------------------
   讀取 [欄位表] 的選項
   回傳：{ types: [], categories: [], payments: [] }
   -------------------------------------------------- */
async function fetchFieldOptions() {
  var response = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.SPREADSHEET_ID,
    range:         CONFIG.SHEET_FIELDS + '!A:C',
  });

  var rows       = (response.result.values) || [];
  var options    = { types: [], categories: [], payments: [] };

  // 第 0 列為標題列，從第 1 列開始
  for (var i = 1; i < rows.length; i++) {
    var type     = (rows[i][0] || '').trim();
    var category = (rows[i][1] || '').trim();
    var payment  = (rows[i][2] || '').trim();

    if (type     && !options.types.includes(type))         options.types.push(type);
    if (category && !options.categories.includes(category)) options.categories.push(category);
    if (payment  && !options.payments.includes(payment))    options.payments.push(payment);
  }

  return options;
}

/* --------------------------------------------------
   讀取 [記帳紀錄] 的所有資料
   回傳：陣列，每個元素為 { id, date, type, category, amount, description, payment }
   -------------------------------------------------- */
async function fetchRecords() {
  var response = await gapi.client.sheets.spreadsheets.values.get({
    spreadsheetId: CONFIG.SPREADSHEET_ID,
    range:         CONFIG.SHEET_RECORDS + '!A:G',
  });

  var rows = (response.result.values) || [];

  // 第 0 列為標題列
  if (rows.length <= 1) return [];

  return rows.slice(1).map(function (row) {
    return {
      id:          (row[0] || '').toString(),
      date:        (row[1] || ''),
      type:        (row[2] || ''),
      category:    (row[3] || ''),
      amount:      parseFloat(row[4]) || 0,
      description: (row[5] || ''),
      payment:     (row[6] || ''),
    };
  });
}

/* --------------------------------------------------
   新增一筆記帳至 [記帳紀錄]
   data: { date, type, category, amount, description, payment }
   回傳：包含產生的 id 的完整記錄物件
   -------------------------------------------------- */
async function appendRecord(data) {
  var id  = Date.now().toString();   // 以 timestamp 作為唯一 ID
  var row = [
    id,
    data.date,
    data.type,
    data.category,
    data.amount,
    data.description,
    data.payment,
  ];

  await gapi.client.sheets.spreadsheets.values.append({
    spreadsheetId:   CONFIG.SPREADSHEET_ID,
    range:           CONFIG.SHEET_RECORDS + '!A:G',
    valueInputOption: 'USER_ENTERED',
    resource:        { values: [row] },
  });

  return Object.assign({ id: id }, data);
}
