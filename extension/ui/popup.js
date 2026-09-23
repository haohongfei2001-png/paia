import {captureHealthText} from './common.js';
import { request, enabledLabel, diagnosticText, dateLabel, statusLabel } from './common.js';
import { briefStructure } from './structure-diagnostics.js';
import { normalizeUXPreferences, resolveAppearance } from './ux-r1-state.js';

const $ = (id) => document.getElementById(id);
const UPDATE_STATE_KEY = 'paia-consumer-update:v1';
let state;
let busy = false;
let uxPreferences = normalizeUXPreferences();
const appearanceMedia = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
function applyAppearance(value) {
  uxPreferences = normalizeUXPreferences(value);
  document.documentElement.dataset.paiaTheme = resolveAppearance(uxPreferences.appearance, appearanceMedia?.matches);
}
appearanceMedia?.addEventListener?.('change', () => { if (uxPreferences.appearance === 'system') applyAppearance(uxPreferences); });

async function refresh() {
  try {
    state = await request('GET_PAGE',{page:{view:'settings'}});
    applyAppearance(state.preferences);
    $('error').hidden = true;
    const consented = state.settings.consentVersion === 1;
    $('enabled-state').textContent = enabledLabel(state.settings);
    $('status-dot').classList.toggle('active', consented && state.settings.enabled);
    $('record-count').textContent = state.stats.total.toLocaleString('zh-CN');
    $('first-use').hidden = consented;
    $('open-archive').textContent = consented ? '回到 PAIA ↗' : '阅读说明并启用 ↗';
    $('toggle-capture').hidden = !consented;
    $('toggle-capture').disabled = busy;
    $('toggle-capture').textContent = state.settings.enabled ? '暂停捕获' : '恢复捕获';
    $('resume-note').hidden = !consented || state.settings.enabled;
    $('diagnostic-status').textContent = diagnosticText(state);
    $('diagnostic-capture-health').textContent = captureHealthText(state.diagnostics);
    $('diagnostic-time').textContent = `最近扫描：${dateLabel(state.diagnostics.lastScanAt)}`;
    $('diagnostic-version').textContent = `适配器版本：${state.adapterVersion}`;
    $('diagnostic-structure').textContent = briefStructure(state.diagnostics.structure, state.diagnostics.structureAt);
    const lastError = state.diagnostics.lastError;
    $('diagnostic-error').textContent = lastError ? `最近错误：${statusLabel(lastError.code)} · ${dateLabel(lastError.at)}` : '最近错误：无';
  } catch (error) {
    state = undefined;
    $('error').textContent = error.message;
    $('error').hidden = false;
    $('toggle-capture').disabled = true;
  }
}

async function refreshUpdate() {
  const version = chrome.runtime.getManifest().version;
  try {
    const update = (await chrome.storage.local.get(UPDATE_STATE_KEY))[UPDATE_STATE_KEY];
    if (update?.state === 'available' && update.fromVersion === version && update.toVersion !== version) {
      $('update-message').textContent = `当前版本 ${version}；${update.toVersion} 已准备好。请先保存正在编辑的内容，再关闭并重新打开 PAIA 页面。现有资料仍保存在本机。`;
    } else if (update?.state === 'installed' && update.toVersion === version) {
      $('update-message').textContent = state
        ? `已安装 ${version}，本机档案已读取。打开 PAIA 核对资料；如果 ChatGPT 页面显示连接过期，请刷新该页面。`
        : `已安装 ${version}，暂时无法确认本机档案状态。请重新打开 PAIA；如果仍无法读取，请保留现有安装和资料。`;
    } else {
      $('update-message').textContent = `当前版本 ${version}。安装来源决定后续更新方式；这里不会强制重启或删除资料。`;
    }
  } catch {
    $('update-message').textContent = `当前版本 ${version}；暂时无法读取更新状态。现有资料仍可在 PAIA 中查看。`;
  }
}

$('check-update').addEventListener('click', async () => {
  const button = $('check-update');
  button.disabled = true;
  $('update-message').textContent = '正在检查此安装的更新…';
  try {
    if (!chrome.runtime.requestUpdateCheck) throw new Error('unavailable');
    const result = await new Promise((resolve, reject) => chrome.runtime.requestUpdateCheck((status, details) => {
      if (chrome.runtime.lastError) reject(new Error('unavailable'));
      else resolve({status, version: details?.version});
    }));
    if (result.status === 'update_available' && result.version) {
      await chrome.storage.local.set({[UPDATE_STATE_KEY]:{
        state:'available',fromVersion:chrome.runtime.getManifest().version,toVersion:result.version,at:Date.now(),
      }});
      await refreshUpdate();
    } else if (result.status === 'no_update') {
      $('update-message').textContent = `此安装目前没有待安装更新（当前 ${chrome.runtime.getManifest().version}）。这不验证其他安装来源是否有新版本。`;
    } else {
      $('update-message').textContent = '此安装暂时无法检查更新。资料仍保存在本机，请稍后重试。';
    }
  } catch {
    $('update-message').textContent = '此安装暂时无法检查更新。资料仍保存在本机，请稍后重试。';
  } finally {
    button.disabled = false;
  }
});

$('open-archive').addEventListener('click', async () => {
  try {
    await chrome.tabs.create({ url: chrome.runtime.getURL('ui/archive.html') });
    window.close();
  } catch {
    $('error').textContent = statusLabel('UNAVAILABLE');
    $('error').hidden = false;
  }
});

$('toggle-capture').addEventListener('click', async () => {
  if (!state || busy) return;
  busy = true;
  $('toggle-capture').disabled = true;
  try {
    await request('SET_ENABLED', { enabled: !state.settings.enabled });
    await refresh();
  } catch (error) {
    $('error').textContent = error.message;
    $('error').hidden = false;
  } finally {
    busy = false;
    $('toggle-capture').disabled = false;
  }
});

chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local') { refresh(); if (changes[UPDATE_STATE_KEY]) void refreshUpdate(); } });
await refresh();
await refreshUpdate();
setInterval(refresh, 15_000);
