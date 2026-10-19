import { request, enabledLabel, statusLabel } from './common.js';
import { normalizeUXPreferences, resolveAppearance } from './ux-r1-state.js';
import { recoveryGuidance } from './recovery-guidance.js';
import { setIconLabel } from './icons.js';
import { SettingsNextState } from './settings-next-state.js';

// Native action views need intrinsic width before Chrome chooses their viewport.
// An explicitly opened document tab can instead reflow at a narrower viewport.
if (!chrome.extension.getViews({type: 'popup'}).includes(window)) document.documentElement.dataset.popupView = 'document';

const $ = (id) => document.getElementById(id);
setIconLabel($('open-archive'), 'external-link', $('open-archive').textContent, {side:'end'});
for (const summary of document.querySelectorAll('details > summary')) setIconLabel(summary, 'chevron-right', summary.textContent, {side:'end',iconClass:'popup-disclosure-icon'});
const UPDATE_STATE_KEY = 'paia-consumer-update:v1';
let state;
let busy = false;
let uxPreferences = normalizeUXPreferences();
let updateCheckFailed = false;
let archiveReadFailed = false;
const appearanceMedia = globalThis.matchMedia?.('(prefers-color-scheme: dark)');
function applyAppearance(value) {
  uxPreferences = normalizeUXPreferences(value);
  document.documentElement.dataset.paiaTheme = resolveAppearance(uxPreferences.appearance, appearanceMedia?.matches);
}
appearanceMedia?.addEventListener?.('change', () => { if (uxPreferences.appearance === 'system') applyAppearance(uxPreferences); });

function showRecovery() {
  const diagnostic = state?.diagnostics;
  const recentError = diagnostic?.lastError;
  const errorAge = Date.now() - Date.parse(recentError?.at || '');
  const code = recoveryGuidance(diagnostic?.status) ? diagnostic.status
    : errorAge >= 0 && errorAge <= 120_000 ? recentError?.code : undefined;
  const guidance = recoveryGuidance(code) || (archiveReadFailed ? recoveryGuidance('ARCHIVE_READ_FAILED') : null) || (updateCheckFailed ? recoveryGuidance('UPDATE_CHECK_FAILED') : null);
  const card = $('recovery-card');
  card.hidden = !guidance;
  if (!guidance) return;
  card.dataset.kind = guidance.kind;
  $('recovery-title').textContent = guidance.title;
  $('recovery-detail').textContent = guidance.detail;
  $('recovery-action').textContent = guidance.label;
  $('recovery-action').dataset.action = guidance.action;
}

async function openArchive() {
  await chrome.tabs.create({ url: chrome.runtime.getURL('ui/archive.html') });
  window.close();
}

async function refresh() {
  try {
    state = await request('GET_PAGE',{page:{view:'settings'}});
    archiveReadFailed = false;
    applyAppearance(state.preferences);
    $('error').hidden = true;
    const consented = state.settings.consentVersion === 1;
    $('enabled-state').textContent = enabledLabel(state.settings);
    $('status-dot').classList.toggle('active', consented && state.settings.enabled);
    $('record-count').textContent = state.stats.total.toLocaleString('zh-CN');
    $('first-use').hidden = consented;
    setIconLabel($('open-archive'), 'external-link', consented ? '打开 PAIA' : '阅读说明并启用', {side:'end'});
    $('toggle-capture').hidden = !consented;
    $('toggle-capture').disabled = busy;
    $('toggle-capture').textContent = state.settings.enabled ? '暂停收录' : '恢复收录';
    $('resume-note').hidden = !consented || state.settings.enabled;
    showRecovery();

  } catch {
    state = undefined;
    archiveReadFailed = true;
    $('error').textContent = '暂时无法读取本机档案状态。请保留当前安装和资料。';
    $('error').hidden = false;
    $('toggle-capture').disabled = true;
    showRecovery();
  }
}

function setUpdateMessage(message) {
  $('update-message').textContent = message;
  $('update-message').hidden = !message;
}

async function refreshUpdate() {
  const version = chrome.runtime.getManifest().version;
  $('update-version').textContent = `版本 ${version}`;
  try {
    const update = (await chrome.storage.local.get(UPDATE_STATE_KEY))[UPDATE_STATE_KEY];
    if (update?.state === 'available' && update.fromVersion === version && update.toVersion !== version) {
      setUpdateMessage(`${update.toVersion} 已准备好。请先保存正在编辑的内容，再关闭并重新打开 PAIA 页面。`);
    } else if (update?.state === 'installed' && update.toVersion === version) {
      setUpdateMessage(state
        ? `已安装 ${version}。如果 ChatGPT 页面显示连接过期，请刷新该页面。`
        : `已安装 ${version}，暂时无法确认档案状态。请重新打开 PAIA；仍无法读取时，请保留现有安装和资料。`);
    } else {
      setUpdateMessage('');
    }
    showRecovery();
  } catch {
    setUpdateMessage('暂时无法读取更新状态，请稍后重试。');
    updateCheckFailed = true;
    showRecovery();
  }
}

$('check-update').addEventListener('click', async () => {
  const button = $('check-update');
  button.disabled = true;
  setUpdateMessage('正在检查此安装的更新…');
  try {
    if (!chrome.runtime.requestUpdateCheck) throw new Error('unavailable');
    const result = await new Promise((resolve, reject) => chrome.runtime.requestUpdateCheck((status, details) => {
      if (chrome.runtime.lastError) reject(new Error('unavailable'));
      else resolve({status, version: details?.version});
    }));
    if (result.status === 'update_available' && result.version) {
      updateCheckFailed = false;
      await chrome.storage.local.set({[UPDATE_STATE_KEY]:{
        state:'available',fromVersion:chrome.runtime.getManifest().version,toVersion:result.version,at:Date.now(),
      }});
      await refreshUpdate();
    } else if (result.status === 'no_update') {
      updateCheckFailed = false;
      setUpdateMessage('此安装来源目前没有待安装更新。');
    } else {
      updateCheckFailed = true;
      setUpdateMessage('此安装暂时无法检查更新，请稍后重试。');
    }
  } catch {
    updateCheckFailed = true;
    setUpdateMessage('此安装暂时无法检查更新，请稍后重试。');
  } finally {
    button.disabled = false;
    showRecovery();
  }
});

$('open-archive').addEventListener('click', async () => {
  try {
    await openArchive();
  } catch {
    $('error').textContent = statusLabel('UNAVAILABLE');
    $('error').hidden = false;
  }
});

$('recovery-action').addEventListener('click', async () => {
  const action = $('recovery-action').dataset.action;
  if (action === 'return_to_chat') { window.close(); return; }
  if (action === 'retry_read') { await refresh(); return; }
  if (action === 'retry_update') { $('check-update').click(); return; }
  if (action === 'open_archive') {
    try { await openArchive(); }
    catch { $('error').textContent = statusLabel('UNAVAILABLE'); $('error').hidden = false; }
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

// The popup and Settings share the acknowledged persistent Next preference.
// Reuse the original presentation state so a late read cannot restore an older
// value, and notifications received during a write are reconciled after its ACK.
const nextControl=$('next-enabled'),nextStatus=$('next-state');
const nextState=new SettingsNextState({send:request,changed:()=>syncNext()});
function syncNext(){
 nextControl.checked=nextState.value?.enabled===true;nextControl.disabled=!nextState.editable;
 const messages={'saving':'正在保存…','read-error':'暂时无法读取建议设置，请重新打开后重试。','save-error':'保存未获确认，已重新核对状态。','save-unknown':'结果无法确认，请重新打开核对后再试。'};
 nextStatus.textContent=messages[nextState.feedback]||(nextState.value?(nextState.value.enabled?'只分析开启后新完成的当前回复。可随时关闭。':'已关闭，临时建议已清除。'):'正在读取…');
}
nextControl.addEventListener('change',async e=>{const enabled=e.target.checked;syncNext();if(!e.isTrusted||!nextState.editable)return;await nextState.configure(enabled);});
chrome.storage.onChanged.addListener((changes,area)=>{if(area==='local'&&changes.promptNextAutomaticPreferenceV2)void nextState.load();});
chrome.runtime.onMessage.addListener(message=>{if(message?.type==='PAIA_PROMPT_NEXT_CHANGED')void nextState.load();});
syncNext();await nextState.load();
