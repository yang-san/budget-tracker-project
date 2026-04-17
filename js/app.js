/**
 * app.js – 主應用程式邏輯
 *
 * 負責：畫面切換、分頁管理、表單、帳務紀錄、分類分析、每月報表。
 * 依賴：config.js → auth.js → sheets.js → charts.js（皆先於此檔載入）
 */

/* ===================================================
   應用程式狀態
   =================================================== */
var state = {
  loaded:       false,    // 是否已從試算表載入資料
  records:      [],       // 所有記帳紀錄
  fieldOptions: {
    types:      [],
    categories: [],
    payments:   [],
  },
};

/* ===================================================
   畫面管理
   =================================================== */
function showLoginScreen() {
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('app-screen').classList.add('hidden');
  state.loaded  = false;
  state.records = [];
}

function showAppScreen() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
}

/* ===================================================
   Toast 通知
   =================================================== */
var _toastTimer = null;

function showToast(message, type) {
  var toast = document.getElementById('toast');
  if (!toast) return;

  clearTimeout(_toastTimer);

  toast.textContent = message;
  toast.className   = 'toast' +
    (type === 'success' ? ' toast-success' :
     type === 'error'   ? ' toast-error'   : '');

  // 強制 reflow 以確保動畫重新觸發
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');

  _toastTimer = setTimeout(function () {
    toast.classList.remove('show');
  }, 3500);
}

/* ===================================================
   分頁管理
   =================================================== */
function initTabs() {
  document.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var tab = btn.dataset.tab;

      // 切換 active 狀態
      document.querySelectorAll('.tab-btn').forEach(function (b) {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
      });
      document.querySelectorAll('.tab-content').forEach(function (s) {
        s.classList.toggle('active', s.id === 'tab-' + tab);
      });

      // 切換時重新渲染對應的視圖
      if (tab === 'history')  renderHistory();
      if (tab === 'analysis') renderAnalysis();
      if (tab === 'monthly')  renderMonthly();
    });
  });
}

/* ===================================================
   登入成功後：載入試算表資料
   =================================================== */
async function onLoginSuccess() {
  showToast('登入成功！正在載入試算表資料…', 'success');

  try {
    var results = await Promise.all([fetchFieldOptions(), fetchRecords()]);
    state.fieldOptions = results[0];
    state.records      = results[1];
    state.loaded       = true;

    populateFormDropdowns();
    populateMonthFilters();
  } catch (err) {
    console.error('載入試算表失敗：', err);
    var msg = '載入失敗';
    if (err && err.result && err.result.error) {
      msg += '：' + err.result.error.message;
    } else {
      msg += '，請確認試算表 ID 及工作表名稱是否正確';
    }
    showToast(msg, 'error');
  }
}

/* ===================================================
   新增記帳表單
   =================================================== */
function initForm() {
  // 預設為今天的日期
  var today = new Date();
  var yyyy  = today.getFullYear();
  var mm    = String(today.getMonth() + 1).padStart(2, '0');
  var dd    = String(today.getDate()).padStart(2, '0');
  document.getElementById('input-date').value = yyyy + '-' + mm + '-' + dd;

  document.getElementById('add-form').addEventListener('submit', function (e) {
    e.preventDefault();
    handleFormSubmit();
  });
}

function populateFormDropdowns() {
  var categories = state.fieldOptions.categories;
  var payments   = state.fieldOptions.payments;

  var catSel = document.getElementById('input-category');
  catSel.innerHTML = '<option value="">請選擇分類</option>';
  categories.forEach(function (c) {
    catSel.innerHTML += '<option value="' + escHtml(c) + '">' + escHtml(c) + '</option>';
  });

  var paySel = document.getElementById('input-payment');
  paySel.innerHTML = '<option value="">請選擇付款方式</option>';
  payments.forEach(function (p) {
    paySel.innerHTML += '<option value="' + escHtml(p) + '">' + escHtml(p) + '</option>';
  });
}

async function handleFormSubmit() {
  var data = {
    date:        document.getElementById('input-date').value,
    type:        document.getElementById('input-type').value,
    category:    document.getElementById('input-category').value,
    amount:      parseFloat(document.getElementById('input-amount').value),
    description: document.getElementById('input-description').value.trim(),
    payment:     document.getElementById('input-payment').value,
  };

  // 基本驗證
  if (!data.date || !data.type || !data.category || !data.amount || !data.payment) {
    setFormMessage('請填寫所有必填欄位', 'error');
    return;
  }
  if (isNaN(data.amount) || data.amount <= 0) {
    setFormMessage('請輸入有效的金額（須大於 0）', 'error');
    return;
  }

  var submitBtn = document.getElementById('submit-btn');
  submitBtn.disabled    = true;
  submitBtn.textContent = '儲存中…';
  setFormMessage('', '');

  try {
    var newRecord = await appendRecord(data);
    state.records.push(newRecord);
    populateMonthFilters();

    setFormMessage('✓ 記帳成功！', 'success');
    showToast('新增記帳成功', 'success');

    // 清空表單（保留日期）
    document.getElementById('input-type').value        = '';
    document.getElementById('input-category').value    = '';
    document.getElementById('input-amount').value      = '';
    document.getElementById('input-description').value = '';
    document.getElementById('input-payment').value     = '';
  } catch (err) {
    console.error('appendRecord 失敗：', err);
    setFormMessage('儲存失敗，請稍後再試', 'error');
    showToast('儲存失敗', 'error');
  } finally {
    submitBtn.disabled    = false;
    submitBtn.textContent = '新增記帳';
  }
}

function setFormMessage(text, type) {
  var el = document.getElementById('form-message');
  el.textContent = text;
  el.className   = 'form-message' + (type ? ' ' + type : '');
}

/* ===================================================
   月份篩選器（帳務紀錄 & 分類分析共用）
   =================================================== */
function populateMonthFilters() {
  // 從記錄中提取所有月份，倒序排列
  var monthSet = {};
  state.records.forEach(function (r) {
    var m = (r.date || '').substring(0, 7);
    if (m) monthSet[m] = true;
  });
  var months = Object.keys(monthSet).sort().reverse();

  ['filter-month', 'analysis-month'].forEach(function (id) {
    var sel = document.getElementById(id);
    if (!sel) return;
    var current = sel.value;
    sel.innerHTML = '<option value="">全部月份</option>';
    months.forEach(function (m) {
      sel.innerHTML += '<option value="' + m + '"' + (m === current ? ' selected' : '') + '>' + m + '</option>';
    });
  });
}

/* ===================================================
   帳務紀錄
   =================================================== */
function renderHistory() {
  var container = document.getElementById('records-container');
  if (!container) return;

  if (!state.loaded) {
    container.innerHTML = '<div class="state-message">登入後即可查看帳務紀錄</div>';
    return;
  }

  var month = document.getElementById('filter-month').value;
  var type  = document.getElementById('filter-type').value;

  var filtered = state.records.filter(function (r) {
    if (month && !r.date.startsWith(month)) return false;
    if (type  && r.type !== type)           return false;
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div class="state-message">此篩選條件下沒有記錄</div>';
    return;
  }

  // 計算摘要
  var income  = 0, expense = 0;
  filtered.forEach(function (r) {
    if (r.type === '收入') income  += r.amount;
    if (r.type === '支出') expense += r.amount;
  });
  var balance = income - expense;

  // 按日期倒序
  var sorted = filtered.slice().sort(function (a, b) {
    return b.date.localeCompare(a.date) || b.id.localeCompare(a.id);
  });

  var balColor = balance >= 0 ? 'amount-income' : 'amount-expense';
  var balSign  = balance >= 0 ? '' : '-';

  var rows = sorted.map(function (r) {
    var isIncome  = r.type === '收入';
    var amtClass  = isIncome ? 'amount-income' : 'amount-expense';
    var amtSign   = isIncome ? '+' : '-';
    var badge     = isIncome ? 'badge-income' : 'badge-expense';
    return '<tr>' +
      '<td>' + escHtml(r.date) + '</td>' +
      '<td><span class="type-badge ' + badge + '">' + escHtml(r.type) + '</span></td>' +
      '<td>' + escHtml(r.category) + '</td>' +
      '<td class="' + amtClass + '">' + amtSign + 'NT$ ' + r.amount.toLocaleString() + '</td>' +
      '<td>' + escHtml(r.description) + '</td>' +
      '<td style="font-size:12px;color:#888;">' + escHtml(r.payment) + '</td>' +
      '</tr>';
  }).join('');

  container.innerHTML =
    '<div class="summary-cards">' +
      summaryCard('收入', 'NT$ ' + income.toLocaleString(), 'amount-income') +
      summaryCard('支出', 'NT$ ' + expense.toLocaleString(), 'amount-expense') +
      summaryCard('結餘', (balSign ? balSign : '') + 'NT$ ' + Math.abs(balance).toLocaleString(), balColor) +
    '</div>' +
    '<div class="records-scroll">' +
      '<table class="records-table">' +
        '<thead><tr>' +
          '<th>日期</th><th>類型</th><th>分類</th><th>金額</th><th>描述</th><th>付款方式</th>' +
        '</tr></thead>' +
        '<tbody>' + rows + '</tbody>' +
      '</table>' +
    '</div>';
}

function summaryCard(label, value, valueClass) {
  return '<div class="summary-card">' +
    '<div class="s-label">' + escHtml(label) + '</div>' +
    '<div class="s-value ' + valueClass + '">' + value + '</div>' +
    '</div>';
}

/* ===================================================
   分類分析
   =================================================== */
function renderAnalysis() {
  if (!state.loaded) return;

  var month = document.getElementById('analysis-month').value;
  var type  = document.getElementById('analysis-type').value;

  var filtered = state.records.filter(function (r) {
    if (month && !r.date.startsWith(month)) return false;
    return r.type === type;
  });

  // 依分類加總
  var catMap = {};
  filtered.forEach(function (r) {
    catMap[r.category] = (catMap[r.category] || 0) + r.amount;
  });

  var data = Object.keys(catMap)
    .map(function (cat) { return { category: cat, amount: catMap[cat] }; })
    .sort(function (a, b) { return b.amount - a.amount; });

  var total = data.reduce(function (s, d) { return s + d.amount; }, 0);

  var breakdownEl = document.getElementById('category-breakdown');

  if (data.length === 0) {
    renderPieChart([]);
    if (breakdownEl) breakdownEl.innerHTML = '<div class="state-message">此篩選條件下沒有資料</div>';
    return;
  }

  renderPieChart(data);

  if (breakdownEl) {
    breakdownEl.innerHTML = data.map(function (d, i) {
      var color = CHART_COLORS[i % CHART_COLORS.length];
      var pct   = total > 0 ? Math.round(d.amount / total * 100) : 0;
      return '<div class="category-item">' +
        '<div class="cat-left">' +
          '<div class="color-dot" style="background:' + color + '"></div>' +
          '<span class="cat-name">' + escHtml(d.category) + '</span>' +
        '</div>' +
        '<div class="cat-right">' +
          '<span class="cat-amount">NT$ ' + d.amount.toLocaleString() + '</span>' +
          '<span class="cat-pct">' + pct + '%</span>' +
        '</div>' +
        '</div>';
    }).join('');
  }
}

/* ===================================================
   每月報表
   =================================================== */
function renderMonthly() {
  if (!state.loaded) return;

  // 依月份分組
  var monthMap = {};
  state.records.forEach(function (r) {
    var m = (r.date || '').substring(0, 7);
    if (!m) return;
    if (!monthMap[m]) monthMap[m] = { income: 0, expense: 0 };
    if (r.type === '收入') monthMap[m].income  += r.amount;
    if (r.type === '支出') monthMap[m].expense += r.amount;
  });

  var data = Object.keys(monthMap)
    .sort()
    .map(function (m) {
      return {
        month:   m,
        income:  monthMap[m].income,
        expense: monthMap[m].expense,
        balance: monthMap[m].income - monthMap[m].expense,
      };
    });

  // 長條圖（時間由舊到新）
  renderMonthlyChart(data);

  // 表格（由新到舊）
  var container = document.getElementById('monthly-table-container');
  if (!container) return;

  if (data.length === 0) {
    container.innerHTML = '<div class="state-message">沒有資料</div>';
    return;
  }

  var rows = data.slice().reverse().map(function (d) {
    var balClass = d.balance >= 0 ? 'balance-positive' : 'balance-negative';
    var balSign  = d.balance >= 0 ? '' : '-';
    return '<tr>' +
      '<td>' + escHtml(d.month) + '</td>' +
      '<td class="amount-income">NT$ ' + d.income.toLocaleString() + '</td>' +
      '<td class="amount-expense">NT$ ' + d.expense.toLocaleString() + '</td>' +
      '<td class="' + balClass + '">' + balSign + 'NT$ ' + Math.abs(d.balance).toLocaleString() + '</td>' +
      '</tr>';
  }).join('');

  container.innerHTML =
    '<table class="monthly-table">' +
      '<thead><tr>' +
        '<th>月份</th><th>收入</th><th>支出</th><th>結餘</th>' +
      '</tr></thead>' +
      '<tbody>' + rows + '</tbody>' +
    '</table>';
}

/* ===================================================
   工具函數
   =================================================== */

// XSS 防護：對插入 HTML 的文字進行跳脫
function escHtml(str) {
  return String(str)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#039;');
}

/* ===================================================
   初始化
   =================================================== */
document.addEventListener('DOMContentLoaded', function () {
  initTabs();
  initForm();

  // 登入 / 登出按鈕
  document.getElementById('login-btn').addEventListener('click', signIn);
  document.getElementById('logout-btn').addEventListener('click', signOut);

  // 帳務紀錄篩選器
  document.getElementById('filter-month').addEventListener('change', renderHistory);
  document.getElementById('filter-type').addEventListener('change', renderHistory);

  // 分類分析篩選器
  document.getElementById('analysis-month').addEventListener('change', renderAnalysis);
  document.getElementById('analysis-type').addEventListener('change', renderAnalysis);
});
