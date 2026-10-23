import test from 'node:test';import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
import {PresentationNode} from './harness/presentation-dom.mjs';
import {mountSettingsDetail} from '../ui/settings-details.js';
import {mountSettingsSync} from '../ui/settings-sync.js';
import {syncAvailability} from '../core/browser-native-sync/availability.js';
const tick=()=>new Promise(r=>setImmediate(r));
const unavailable={version:1,state:'unavailable',reason:'provider-not-configured',productionActivation:false};
const state=(extra={})=>({version:1,state:'not-started',scope:'source-working-only',wholeArchiveComplete:false,purgeProtection:'original-journal-fail-closed',resumeAvailable:true,busy:false,task:null,error:null,productionActivation:false,...extra});
function fixture(t,send=async()=>({ok:true,data:unavailable})){
 const previous={document:globalThis.document,chrome:globalThis.chrome},body=new PresentationNode('body');let language='zh-CN';const panel={hidden:false},calls=[];
 const make=tag=>{const n=new PresentationNode(tag);if(tag==='dialog'){n.showModal=()=>n.open=true;n.close=()=>{n.open=false;n.listeners.get('close')?.();};}return n;};globalThis.document={body,documentElement:{lang:language},getElementById:id=>id==='settings-panel'?panel:null,createElement:make,createElementNS:(_ns,tag)=>make(tag)};globalThis.chrome={runtime:{sendMessage:async message=>{calls.push(message);return send(message);}}};
 t.after(()=>{globalThis.document=previous.document;globalThis.chrome=previous.chrome;});const detail=mountSettingsSync({mountDetail:mountSettingsDetail,language:()=>language});body.append(detail.row);
 const content=detail.dialog.children[1],buttons=()=>content.children.flatMap(x=>x.children??[]).filter(x=>x.tagName==='BUTTON'),button=command=>buttons().find(x=>x.dataset.syncCommand===command);
 return {detail,calls,panel,content,button,buttons,open:async()=>{detail.row.listeners.get('click')();await tick();},click:async command=>{const b=button(command);assert.ok(b&&!b.hidden&&!b.disabled,command+' is actionable');b.listeners.get('click')();await tick();},language:next=>{language=next;detail.sync();}};
}
test('Sync default is a bilingual unavailable Settings destination; opening performs one read-only status on original modal',async t=>{
 const f=fixture(t);assert.equal(f.detail.row.id,'settings-sync');assert.equal(f.detail.row.getAttribute('aria-controls'),'settings-sync-dialog');assert.equal(f.calls.length,0);await f.open();assert.equal(f.detail.dialog.open,true);assert.match(f.detail.dialog.textContent,/此版本尚未提供云端同步/);assert.equal(f.content.children.length,2,'no fake connect/delete controls');assert.deepEqual(f.calls,[{type:'PAIA_SYNC_STATUS'}]);f.language('en');assert.match(f.detail.dialog.textContent,/does not sign in, upload content or change existing data/);assert.equal(syncAvailability().canEnable,false);f.detail.dialog.firstElementChild.children[1].listeners.get('click')();assert.equal(f.detail.dialog.open,false);
});
test('qualified local facade renders explicit partial scope and user-only zero-argument transitions',async t=>{
 let value=state();const f=fixture(t,async({type})=>{if(type==='PAIA_SYNC_RESUME')value=state({state:'active'});if(type==='PAIA_SYNC_PAUSE')value=state({state:'paused'});if(type==='PAIA_SYNC_DISCONNECT')value=state({state:'disconnected',resumeAvailable:false});return {ok:true,data:value};});await f.open();assert.match(f.content.textContent,/整库已备份/);assert.equal(f.button('NOW').hidden,true);await f.click('RESUME');assert.match(f.detail.row.textContent,/仅局部验证/);assert.equal(f.button('NOW').hidden,false);await f.click('PAUSE');assert.equal(f.button('NOW').hidden,true);await f.click('DISCONNECT');assert.equal(f.button('RESUME').hidden,true);assert.equal(f.button('NOW').hidden,true);f.language('en');assert.match(f.content.textContent,/does not create a recovery point/);assert.match(f.content.textContent,/not deleted/);assert.deepEqual(f.calls.map(x=>x.type),['PAIA_SYNC_STATUS','PAIA_SYNC_RESUME','PAIA_SYNC_PAUSE','PAIA_SYNC_DISCONNECT']);assert.ok(f.calls.every(x=>Object.keys(x).length===1));
});
test('one explicit publish survives double click; unknown result exposes status only and no automatic replay',async t=>{
 let release;const f=fixture(t,async({type})=>type==='PAIA_SYNC_NOW'?new Promise(r=>release=r):({ok:true,data:state({state:'active',task:{kind:'publication',phase:'unknown'}})}));await f.open();assert.match(f.button('NOW').textContent,/核对原发布任务/);const button=f.button('NOW');button.listeners.get('click')();button.listeners.get('click')();assert.equal(button.disabled,true);assert.equal(f.calls.filter(x=>x.type==='PAIA_SYNC_NOW').length,1);release({ok:false,error:'MESSAGE_CHANNEL_INTERRUPTED'});await tick();assert.match(f.content.textContent,/先核对状态/);assert.equal(f.button('NOW').hidden,true);await f.click('STATUS');assert.equal(f.button('NOW').hidden,false);assert.equal(f.calls.filter(x=>x.type==='PAIA_SYNC_NOW').length,1);assert.equal(f.button('RESTORE').hidden,true);
});
test('restore continuation is only the original task and completion never says whole archive synchronized',async t=>{
 const f=fixture(t,async({type})=>({ok:true,data:state({state:'active',task:{kind:'restore',phase:type==='PAIA_SYNC_CONTINUE'?'confirmed':'unknown'}})}));await f.open();assert.equal(f.button('NOW').hidden,true);assert.equal(f.button('RESTORE').hidden,true);await f.click('CONTINUE');assert.match(f.content.textContent,/整库同步尚未完成/);assert.equal(f.calls.filter(x=>x.type==='PAIA_SYNC_CONTINUE').length,1);
});
test('close/reopen fences late status; malformed or fake full-sync state cannot expose actions',async t=>{
 let release,reads=0;const f=fixture(t,()=>++reads===1?new Promise(r=>release=r):Promise.resolve({ok:true,data:unavailable}));await f.open();f.detail.dialog.close();await f.open();release({ok:true,data:state({state:'active'})});await tick();assert.equal(f.content.children.length,2);assert.match(f.content.textContent,/尚未提供/);assert.equal(f.calls.length,2);
});
test('invalid configured result and hidden Settings cannot be used as permission or overwrite late UI',async t=>{
 const f=fixture(t,async()=>({ok:true,data:state({wholeArchiveComplete:true})}));await f.open();assert.equal(f.buttons().length,0);assert.match(f.content.textContent,/暂时无法核对/);
});
test('original Data group placement and fixed worker request retain a single owner',async()=>{const source=await readFile(new URL('../ui/settings-details.js',import.meta.url),'utf8');assert.match(source,/dataGroup\.insertBefore\(syncDetail\.row,importDetail\.row\)/);assert.match(source,/\[syncDetail,storageDetail,siteDetail,importDetail/);const ui=await readFile(new URL('../ui/settings-sync.js',import.meta.url),'utf8');assert.doesNotMatch(ui,/fetch\(|chrome\.|LocalSyncRecoverySession|putImmutable|binding:/);assert.match(ui,/await request\('PAIA_SYNC_'\+command\)/);});

test('leaving Settings during an outstanding status never renders that late configuration',async t=>{
 let release;const f=fixture(t,()=>new Promise(r=>release=r));await f.open();f.panel.hidden=true;release({ok:true,data:state({state:'active'})});await tick();assert.equal(f.content.children.length,2);assert.equal(f.buttons().length,0);assert.equal(f.calls.length,1);
});
