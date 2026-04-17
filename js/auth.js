/**
 * auth.js – Google OAuth 2.0 認證
 *
 * 使用 Google Identity Services (GIS) 進行 Token flow 登入，
 * 搭配 gapi.client 呼叫 Google Sheets API。
 */

let tokenClient = null;
let gapiReady    = false;
let gsiReady     = false;

/* --------------------------------------------------
   gapi 載入完成後的回呼（index.html 中 onload="gapiLoaded()"）
   -------------------------------------------------- */
function gapiLoaded() {
  gapi.load('client', initGapiClient);
}

async function initGapiClient() {
  try {
    await gapi.client.init({
      discoveryDocs: ['https://sheets.googleapis.com/$discovery/rest?version=v4'],
    });
    gapiReady = true;
    checkAuthReady();
  } catch (err) {
    console.error('gapi.client.init 失敗：', err);
    onApiLoadError('Google Sheets API');
  }
}

/* --------------------------------------------------
   Google Identity Services 載入完成後的回呼
   （index.html 中 onload="gsiLoaded()"）
   -------------------------------------------------- */
function gsiLoaded() {
  try {
    tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.CLIENT_ID,
      scope:     CONFIG.SCOPES,
      callback:  onTokenResponse,
    });
    gsiReady = true;
    checkAuthReady();
  } catch (err) {
    console.error('GIS initTokenClient 失敗：', err);
    onApiLoadError('Google 登入服務');
  }
}

/* --------------------------------------------------
   API 載入失敗
   -------------------------------------------------- */
function onApiLoadError(name) {
  console.error(name + ' 載入失敗');
  // 顯示錯誤（showToast 定義於 app.js，但此時 DOM 已就緒）
  try {
    showToast(name + ' 載入失敗，請重新整理頁面', 'error');
  } catch (_) {}

  const btn = document.getElementById('login-btn');
  if (btn) {
    btn.disabled = true;
    const span = document.getElementById('login-btn-text');
    if (span) span.textContent = '載入失敗，請重新整理';
  }
}

/* --------------------------------------------------
   兩套 API 皆就緒後才啟用登入按鈕
   -------------------------------------------------- */
function checkAuthReady() {
  if (!gapiReady || !gsiReady) return;

  const btn  = document.getElementById('login-btn');
  const span = document.getElementById('login-btn-text');
  if (btn)  btn.disabled = false;
  if (span) span.textContent = '使用 Google 帳號登入';
}

/* --------------------------------------------------
   取得 Access Token 後的回呼
   -------------------------------------------------- */
function onTokenResponse(response) {
  if (response.error) {
    showToast('登入失敗：' + response.error, 'error');
    return;
  }

  // 將 token 交給 gapi.client，後續 API 呼叫皆自動帶入
  gapi.client.setToken(response);

  // 非同步取得使用者姓名（選用，失敗不影響功能）
  fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: 'Bearer ' + response.access_token },
  })
    .then(function (r) { return r.json(); })
    .then(function (info) {
      var el = document.getElementById('user-name');
      if (el) el.textContent = info.name || info.email || '';
    })
    .catch(function () {});

  // 切換至主畫面並載入資料
  showAppScreen();
  onLoginSuccess();
}

/* --------------------------------------------------
   登入 / 登出
   -------------------------------------------------- */
function signIn() {
  if (!tokenClient) return;
  // prompt: '' → 若已授權過則靜默取得 token；否則顯示帳號選擇器
  tokenClient.requestAccessToken({ prompt: '' });
}

function signOut() {
  var token = gapi.client.getToken();
  if (token) {
    google.accounts.oauth2.revoke(token.access_token, function () {
      gapi.client.setToken(null);
      showLoginScreen();
    });
  } else {
    showLoginScreen();
  }
}
