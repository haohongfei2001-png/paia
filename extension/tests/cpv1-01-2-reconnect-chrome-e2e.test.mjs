import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { FakeChatGPT, conversation, eventually } from './harness/fake-chatgpt.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));

test('CPV1-01.2: a newly opened tab after a version update retains the same archive', { timeout: 120000 }, async t => {
  const release = await mkdtemp(join(tmpdir(), 'paia-cpv1-updated-release-'));
  const profile = await mkdtemp(join(tmpdir(), 'paia-cpv1-update-profile-'));
  let h,stage='build fixture release';const started=Date.now();
  const mark=value=>{stage=value;console.error('UPDATE_LIFECYCLE_STAGE',JSON.stringify({stage,elapsedMs:Date.now()-started}));};
  const aborted=()=>{let state;try{state={connected:h?.context?.browser()?.isConnected()??false,archiveClosed:h?.archive?.isClosed()??true};}catch{state={observationUnavailable:true};}console.error('UPDATE_LIFECYCLE_ABORT',JSON.stringify({stage,elapsedMs:Date.now()-started,...state}));};
  t.signal.addEventListener('abort',aborted,{once:true});
  mark(stage);
  execFileSync('python3', ['scripts/build_current_release.py', release], { cwd: root, stdio: 'pipe' });
  mark('start initial browser');
  try {
    h = await FakeChatGPT.start({ extensionPath: release, headless: true, userDataDir: profile });
    mark('wait for initial consent control');
    await eventually(async () => !await h.archive.locator('#enable-consent').isDisabled());
    mark('enable initial consent');
    await h.archive.locator('#enable-consent').click();
    mark('confirm initial consent');
    await eventually(async () => (await h.archive.evaluate(() => chrome.runtime.sendMessage({ type: 'GET_STATUS' }))).data?.consented === true);
    mark('open initial conversation');
    const first = await h.open(conversation('cpv1-before-update'));
    mark('wait for initial capture bridge');
    await h.ready(first);
    mark('confirm initial three records');
    await eventually(async () => (await h.state()).records.length === 3);
    const extensionId = h.extensionId;
    mark('close initial browser');
    await h.close(); h = undefined;

    mark('change fixture version');
    const manifestPath = join(release, 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    manifest.version = '0.12.1';
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    mark('open updated browser');
    h = await FakeChatGPT.start({ extensionPath: release, headless: true, userDataDir: profile, onboarding: true });
    mark('verify retained identity and archive');
    assert.equal(h.extensionId, extensionId, 'version update preserves extension identity');
    assert.equal((await h.state()).records.length, 3, 'the existing archive remains after update');
    mark('open updated conversation');
    const fresh = await h.open(conversation('cpv1-after-update'));
    mark('wait for updated capture bridge');
    await h.ready(fresh);
    mark('confirm six records after update');
    await eventually(async () => (await h.state()).records.length === 6, 'new tab captures after update');
    mark('verify no reconnect notice');
    assert.equal(await fresh.locator('#paia-reconnect-notice').count(), 0);
  } catch (error) {
    const state = { connected: h?.context?.browser()?.isConnected() ?? false, archiveClosed: h?.archive?.isClosed() ?? true };
    let timer;
    try {
      if (!state.archiveClosed) Object.assign(state, await Promise.race([
        h.archive.evaluate(async () => {
          const [status, snapshot] = await Promise.all([
            chrome.runtime.sendMessage({ type: 'GET_STATUS' }), chrome.runtime.sendMessage({ type: 'GET_STATE' }),
          ]);
          return { statusOK: status?.ok === true, consented: status?.data?.consented === true,
            recordCount: Array.isArray(snapshot?.data?.records) ? snapshot.data.records.length : null,
            consentDisabled: document.querySelector('#enable-consent')?.disabled ?? null };
        }),
        new Promise(resolve => { timer = setTimeout(() => resolve({ snapshotTimedOut: true }), 2500); }),
      ]));
    } catch { state.snapshotUnavailable = true; }
    finally { clearTimeout(timer); }
    throw new Error(`new-tab update lifecycle failed at ${stage}; state=${JSON.stringify(state)}`, { cause: error });
  } finally {
    mark('final cleanup');t.signal.removeEventListener('abort',aborted);
    await h?.close();
    await rm(release, { recursive: true, force: true });
    await rm(profile, { recursive: true, force: true });
  }
});

test('CPV1-01.2: a discarded and restored ChatGPT tab resumes capture without duplicate records', { timeout: 120000 }, async () => {
  const release = await mkdtemp(join(tmpdir(), 'paia-cpv1-discard-'));
  execFileSync('python3', ['scripts/build_current_release.py', release], { cwd: root, stdio: 'pipe' });
  let h;
  let stage = 'start browser';
  try {
    // Chrome's Linux headless discard path can crash the browser process.
    // CI has an isolated Xvfb display; exercise the same real tabs API there.
    h = await FakeChatGPT.start({ extensionPath: release, headless: !process.env.CI, launchThroughPort: true, nativeTabVisibility: true });
    console.log('DISCARD_BROWSER_ENV',JSON.stringify({browserVersion:h.context.browser().version(),chromePath:process.env.CHROME_PATH||'platform-default',ci:process.env.CI||null,headless:process.env.PAIA_HEADLESS==='1'}));
    stage = 'enable consent';
    await eventually(async () => !await h.archive.locator('#enable-consent').isDisabled());
    await h.archive.locator('#enable-consent').click();
    await eventually(async () => (await h.archive.evaluate(() => chrome.runtime.sendMessage({ type: 'GET_STATUS' }))).data?.consented === true);
    const restoredConversation = conversation('cpv1-discarded-tab');
    stage = 'open conversation in archive window';
    // A persistent Playwright context may open context.newPage() in another
    // Chrome window. Discarding that window's only tab can terminate Chrome,
    // so create the background conversation in the archive's own window.
    h.pages.set(restoredConversation.id, { c: restoredConversation, arrival: 'metadata-first' });
    const opened = h.context.waitForEvent('page');
    const created = await h.archive.evaluate(async () => {
      const current = await chrome.tabs.getCurrent();
      const target = await chrome.tabs.create({ url: 'about:blank', active: false, windowId: current.windowId });
      return { targetId: target.id, archiveWindowId: current.windowId };
    });
    const tab = await opened;
    tab.on('pageerror', error => h.errors.push(error.message));
    // Establish a genuinely viewed conversation before testing background discard.
    // CDP focus emulation is disabled; Chrome activation owns visibility.
    stage = 'activate initial conversation';
    assert.equal((await h.archive.evaluate(id => chrome.tabs.update(id, { active: true }), created.targetId)).active, true);
    stage = 'navigate active conversation';
    await tab.goto(`https://chatgpt.com/c/${restoredConversation.id}`);
    console.log('DISCARD_CAPTURE_INITIAL',JSON.stringify(await tab.evaluate(()=>({visibility:document.visibilityState,ready:document.readyState,bridge:window.historyGateActive===true,messages:document.querySelectorAll('#messages [data-message-id]').length}))));
    await eventually(async () => await tab.evaluate(() => document.visibilityState === 'visible'), 'initial conversation is natively visible');
    stage = 'wait for active capture bridge';
    await h.ready(tab);
    stage = 'confirm viewed initial three records';
    await eventually(async () => (await h.state()).records.length === 3);

    stage = 'close unrelated tabs';
    for (const other of h.context.pages()) {
      if (other !== h.archive && other !== tab) await other.close();
    }
    await h.archive.bringToFront();
    stage = 'identify target tab';
    const targetId = created.targetId;
    const tabIdentity = await h.archive.evaluate(async id => {
      const current = await chrome.tabs.getCurrent();
      const target = await chrome.tabs.get(id);
      return { archiveWindowId: current.windowId, targetWindowId: target.windowId, targetId: target.id };
    }, targetId);
    assert.equal(tabIdentity.archiveWindowId, created.archiveWindowId);
    assert.equal(tabIdentity.targetWindowId, created.archiveWindowId, 'discard target shares the archive window');
    assert.equal(tabIdentity.targetId, targetId);
    // Keep the archive tab active while Chrome completes the real discard.
    // Re-activating inside the same extension call races the tab teardown on
    // Linux Chrome and can terminate the browser before it reports a result.
    await h.archive.bringToFront();
    stage = 'activate archive tab';
    await h.archive.evaluate(async () => {
      const current = await chrome.tabs.getCurrent();
      await chrome.tabs.update(current.id, { active: true });
    });
    stage = 'confirm archive tab active';
    await eventually(async () => h.archive.evaluate(async id => {
      const current = await chrome.tabs.getCurrent();
      const target = await chrome.tabs.get(id);
      return (await chrome.tabs.get(current.id)).active === true && target.active === false;
    }, targetId), 'archive tab is active before conversation discard');
    await eventually(async () => await tab.evaluate(() => document.visibilityState === 'hidden'), 'inactive discard target is natively hidden');
    assert.equal(new URL(tab.url()).pathname, '/c/cpv1-discarded-tab');
    stage = 'read target slot';
    const targetSlot = await h.archive.evaluate(async id => {
      const target = await chrome.tabs.get(id);
      return { windowId: target.windowId, index: target.index };
    }, targetId);
    console.log('CPV1-01.2 discard: invoking Chrome tabs.discard');
    stage = 'discard target tab';
    const discarded = await h.archive.evaluate(id => chrome.tabs.discard(id), targetId);
    console.log('CPV1-01.2 discard: Chrome returned a discarded tab');
    assert.equal(discarded?.discarded, true, 'Chrome discarded the conversation tab');
    assert.equal(discarded?.windowId, targetSlot.windowId);
    assert.equal(discarded?.index, targetSlot.index);
    // Chrome may replace a tab ID during discard. Verify the same window slot
    // contains exactly the returned discarded tab before re-activating it.
    stage = 'confirm discarded tab';
    await eventually(async () => h.archive.evaluate(async ({ id, windowId, index }) => {
      const tabs = await chrome.tabs.query({ windowId });
      return tabs.filter(tab => tab.index === index).length === 1
        && tabs.some(tab => tab.id === id && tab.index === index && tab.discarded === true);
    }, { id: discarded.id, ...targetSlot }), 'one discarded conversation tab remains');
    console.log('CPV1-01.2 discard: replacement slot confirmed');
    stage = 'reactivate discarded tab';
    const restored = await h.archive.evaluate(id => chrome.tabs.update(id, { active: true }), discarded.id);
    console.log('CPV1-01.2 discard: Chrome activated the restored tab');
    assert.equal(restored?.active, true);
    stage = 'wait for restored tab';
    await eventually(async () => h.archive.evaluate(async id => (await chrome.tabs.get(id)).status === 'complete', restored.id), 'discarded tab finishes loading');
    console.log('CPV1-01.2 discard: restored tab completed loading');
    stage = 'check stored records';
    assert.equal((await h.state()).records.length, 3, 'discard does not change stored records');
    console.log('CPV1-01.2 discard: archive readback preserved records');

    await eventually(async () => h.context.pages().some((page) => page.url().includes('/c/cpv1-discarded-tab')));
    const resumedTab = h.context.pages().find((page) => page.url().includes('/c/cpv1-discarded-tab'));
    await resumedTab.waitForLoadState('load');
    await eventually(async () => await resumedTab.evaluate(() => document.visibilityState === 'visible'), 'restored active conversation is natively visible');
    await h.ready(resumedTab);
    await eventually(async () => (await h.state()).records.length === 3);
    assert.equal(await resumedTab.locator('#paia-reconnect-notice').count(), 0);
    await eventually(async () => (await resumedTab.locator('#messages [data-message-id]').count()) === 3, 'restored conversation renders before new input');
    await h.send(resumedTab, { id: 'cpv1-discarded-message-004', text: '恢复后的新消息' });
    await eventually(async () => (await h.state()).records.length === 4, 'restored tab captures new content once');
  } catch (error) {
    let browserState = 'unavailable';
    let captureDiagnostic={diagnosticUnavailable:true};
    let diagnosticTimer;
    try {
      const page=h?.context?.pages().find(p=>p.url().includes('/c/cpv1-discarded-tab'));
      const snapshot={errors:h.errors};
      const diagnostic=Promise.allSettled([
        (page? page.evaluate(()=>({visibility:document.visibilityState,ready:document.readyState,bridge:window.historyGateActive===true,messages:document.querySelectorAll('#messages [data-message-id]').length})):Promise.resolve(null)).then(state=>snapshot.state=state),
        h.archive.evaluate(async()=>{
          const status=await chrome.runtime.sendMessage({type:'GET_STATUS'}),value=status?.ok===true?status.data:null;
          return {statusOK:status?.ok===true,enabled:value?.enabled===true,consented:value?.consented===true,
            adapterVersion:typeof value?.adapterVersion==='string'?value.adapterVersion:null,
            runtimeVersion:chrome.runtime.getManifest().version,runtimeVersionSource:'extension-manifest',
            statusReadiness:status?.ok===true?'responded':'rejected',epoch:Number.isSafeInteger(value?.epoch)?value.epoch:null};
        }).then(status=>snapshot.status=status),
        h.archive.evaluate(async()=>{const result=await chrome.runtime.sendMessage({type:'GET_STATE'}),d=result?.data?.diagnostics;return {records:Array.isArray(result?.data?.records)?result.data.records.length:null,diagnostics:d?{status:d.status,scanned:d.scanned,lastScanAt:d.lastScanAt,lastErrorCode:d.lastError?.code,structure:d.structure}:null};}).then(state=>snapshot.archive=state),
        h.archive.evaluate(async()=>{
          const tabs=await chrome.tabs.query({url:'https://chatgpt.com/c/cpv1-discarded-tab'});
          if(tabs.length!==1)return {targetCount:tabs.length};
          const tab=tabs[0],rows=await chrome.scripting.executeScript({target:{tabId:tab.id},world:'ISOLATED',func:()=>{
            const lifecycle=globalThis.PAIACaptureLifecycle,controller=globalThis.PAIACaptureController;
            const result={lifecyclePresent:!!lifecycle,lifecycleActive:lifecycle?.active===true,lifecycleReady:lifecycle?.ready===true,controllerPresent:!!controller,adapterPresent:typeof globalThis.ChatGPTAdapter==='function',contentVersion:lifecycle?.version||null,firstIndependentScan:true};
            if(result.adapterPresent){const adapter=new globalThis.ChatGPTAdapter();try{const scan=adapter.collect();result.scan={code:scan.code,scanned:scan.scanned,messageCount:scan.messages?.length||0,structure:globalThis.ArchiveDiagnostics?.sanitizeStructure(scan.structure)||null};}finally{adapter.stopWatching();}}
            return result;
          }});
          return {active:tab.active,discarded:tab.discarded,status:tab.status,isolated:rows.filter(row=>row.frameId===0).map(row=>row.result)};
        }).then(isolated=>snapshot.capture=isolated),
      ]).then(results=>({...snapshot,diagnosticRejected:results.some(x=>x.status==='rejected')}));
      const result=await Promise.race([diagnostic,new Promise(resolve=>{diagnosticTimer=setTimeout(()=>resolve({...snapshot,diagnosticTimedOut:true}),2500);})]);
      captureDiagnostic=result;console.error('DISCARD_CAPTURE_FAILURE',JSON.stringify(result));
    }catch{console.error('DISCARD_CAPTURE_FAILURE',JSON.stringify({diagnosticUnavailable:true}));}
    finally{clearTimeout(diagnosticTimer);}
    try {
      browserState = JSON.stringify({
        connected: h?.context?.browser()?.isConnected() ?? false,
        archiveClosed: h?.archive?.isClosed() ?? true,
        pages: h?.context?.pages().map(page => ({
          closed: page.isClosed(), pathname: (() => {
            try { return new URL(page.url()).pathname; } catch { return ''; }
          })(),
        })) ?? [],
      });
    } catch { /* Preserve the original failure stage. */ }
    throw new Error(`discard lifecycle failed at ${stage}: ${error}; browser=${browserState}; DISCARD_CAPTURE_FAILURE=${JSON.stringify(captureDiagnostic)}`, { cause: error });
  } finally {
    await h?.close();
    await rm(release, { recursive: true, force: true });
  }
});


// Same-document update/reload and pending-status recovery are now exercised by
// cpv1-01-capture-recovery-chrome-e2e.test.mjs, including an unmodified old-main upgrade.
