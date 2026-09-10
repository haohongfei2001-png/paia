import { request, enabledLabel, diagnosticText, dateLabel, statusLabel } from './common.js';
import { briefStructure } from './structure-diagnostics.js';

const $ = (id) => document.getElementById(id);
let state;
let busy = false;

async function refresh() {
  try {
    state = await request('GET_PAGE',{page:{view:'settings'}});
    $('error').hidden = true;
    const consented = state.settings.consentVersion === 1;
    $('enabled-state').textContent = enabledLabel(state.settings);
    $('status-dot').classList.toggle('active', consented && state.settings.enabled);
    $('record-count').textContent = state.stats.total.toLocaleString('zh-CN');
    $('first-use').hidden = consented;
    $('open-archive').textContent = consented ? '打开档案 ↗' : '阅读说明并启用 ↗';
    $('toggle-capture').hidden = !consented;
    $('toggle-capture').disabled = busy;
    $('toggle-capture').textContent = state.settings.enabled ? '暂停捕获' : '恢复捕获';
    $('resume-note').hidden = !consented || state.settings.enabled;
    $('diagnostic-status').textContent = diagnosticText(state);
    $('diagnostic-time').textContent = `最近扫描：${dateLabel(state.diagnostics.lastScanAt)}`;
    $('diagnostic-version').textContent = `适配器版本：${state.adapterVersion}`;
    $('diagnostic-structure').textContent = briefStructure(state.diagnostics.structure, state.diagnostics.structureAt);
    const lastError = state.diagnostics.lastError;
    $('diagnostic-error').textContent = lastError ? `最近错误：${statusLabel(lastError.code)} · ${dateLabel(lastError.at)}` : '最近错误：无';
  } catch (error) {
    $('error').textContent = error.message;
    $('error').hidden = false;
    $('toggle-capture').disabled = true;
  }
}

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

chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local') refresh(); });
await refresh();
setInterval(refresh, 15_000);
