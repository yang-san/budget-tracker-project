/**
 * charts.js – Chart.js 圖表渲染
 *
 * 提供：
 *   renderPieChart(data)     → 分類圓餅圖（甜甜圈型）
 *   renderMonthlyChart(data) → 每月收支長條圖
 *   CHART_COLORS             → 圖表配色陣列（供 app.js 讀取）
 */

var CHART_COLORS = [
  '#1a73e8', '#ea4335', '#fbbc04', '#34a853',
  '#ff6d00', '#46bdc6', '#7c4dff', '#f06292',
  '#8bc34a', '#ff9800', '#00acc1', '#ab47bc',
];

var _pieChart     = null;
var _monthlyChart = null;

/* --------------------------------------------------
   分類圓餅圖
   data: [{ category: '餐飲食品', amount: 1200 }, ...]
   若 data 為空則只銷毀舊圖表
   -------------------------------------------------- */
function renderPieChart(data) {
  var canvas = document.getElementById('pie-chart');
  if (!canvas) return;

  // 銷毀先前的圖表實例以避免 canvas 重用警告
  if (_pieChart) {
    _pieChart.destroy();
    _pieChart = null;
  }

  if (!data || data.length === 0) return;

  var labels = data.map(function (d) { return d.category; });
  var values = data.map(function (d) { return d.amount; });
  var colors = CHART_COLORS.slice(0, labels.length);

  _pieChart = new Chart(canvas, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data:            values,
        backgroundColor: colors,
        borderColor:     '#fff',
        borderWidth:     3,
        hoverOffset:     6,
      }],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      cutout:              '62%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              return '  ' + ctx.label + '：NT$ ' + ctx.parsed.toLocaleString();
            },
          },
        },
      },
    },
  });
}

/* --------------------------------------------------
   每月收支長條圖
   data: [{ month: '2026-01', income: 55000, expense: 15000 }, ...]
   -------------------------------------------------- */
function renderMonthlyChart(data) {
  var canvas = document.getElementById('monthly-chart');
  if (!canvas) return;

  if (_monthlyChart) {
    _monthlyChart.destroy();
    _monthlyChart = null;
  }

  if (!data || data.length === 0) return;

  var labels   = data.map(function (d) { return d.month; });
  var incomes  = data.map(function (d) { return d.income; });
  var expenses = data.map(function (d) { return d.expense; });

  _monthlyChart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label:           '收入',
          data:            incomes,
          backgroundColor: 'rgb(104, 135, 243)',
          borderColor:     '#6887f3',
          borderWidth:     1,
          borderRadius:    4,
        },
        {
          label:           '支出',
          data:            expenses,
          backgroundColor: 'rgba(234, 67, 53, 0.75)',
          borderColor:     '#ea4335',
          borderWidth:     1,
          borderRadius:    4,
        },
      ],
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: function (ctx) {
              return '  ' + ctx.dataset.label + '：NT$ ' + ctx.parsed.y.toLocaleString();
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (val) {
              return 'NT$ ' + val.toLocaleString();
            },
          },
          grid: { color: '#f0f2f5' },
        },
        x: {
          grid: { display: false },
        },
      },
    },
  });
}
