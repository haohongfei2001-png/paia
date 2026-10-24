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
 let value=state();const f=fixture(t,async({type})=>{if(type==='PAIA_SYNC_RESUME')value=state({state:'active'});if(type==='PAIA_SYNC_PAUSE')value=state({state:'paused'});if(type==='PAIA_SYNC_DISCONNECT')value=state({state:'disconnected',resumeAvailable:false});return {ok:true,data:value};});await f.open();assert.match(f.content.textContent,/整库已备份/);assert.equal(f.button('NOW').hidden,true);await f.click('RESUME');assert.match(f.detail.row.textContent,/仅局部验证/);assert.equal(f.button('NOW').hidden,false);await f.click('PAUSE');assert.equal(f.button('NOW').hidden,true);await f.click('DISCONNECT');assert.equal(f.button('RESUME').hidden,true);assert.equal(f.button('NOW').hidden,true);f.language('en');assert.match(f.content.textContent,/creates a recoverable checkpoint/);assert.match(f.content.textContent,/not deleted/);assert.deepEqual(f.calls.map(x=>x.type),['PAIA_SYNC_STATUS','PAIA_SYNC_RESUME','PAIA_SYNC_PAUSE','PAIA_SYNC_DISCONNECT']);assert.ok(f.calls.every(x=>Object.keys(x).length===1));
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

test('configured Prompt/preferences checkpoint keeps explicit enrollment and unknown original task semantics',async t=>{let next=state({state:'active',scope:'source-working-prompt',portablePreferences:false,needsPreferenceEnrollment:true});const f=fixture(t,async({type})=>{if(type==='PAIA_SYNC_RESUME')next=state({state:'active',scope:'source-working-prompt',portablePreferences:true,needsPreferenceEnrollment:false,task:{kind:'checkpoint',phase:'unknown'}});return {ok:true,data:next};});await f.open();assert.equal(f.button('RESUME').hidden,false);assert.match(f.content.textContent,/便携显示和筛选偏好/);await f.click('RESUME');assert.equal(f.button('RESUME').hidden,true);assert.equal(f.button('RESTORE').hidden,true);assert.match(f.button('NOW').textContent,/核对原发布任务/);f.language('en');assert.match(f.content.textContent,/not a whole-archive backup/);assert.match(f.content.textContent,/nonportable settings/);assert.equal(f.calls.filter(x=>x.type==='PAIA_SYNC_NOW').length,0);});
const selectionState=(state,extra={})=>({version:1,state,productionActivation:false,canPrepare:state==='not-prepared',reloadRequired:state==='selected',busy:false,...extra});
test('all selection states keep activation, continued switching and restart unavailable without an original cross-page editor guard',async t=>{
 let selection=selectionState('review-ready');const f=fixture(t,async()=>({ok:true,data:state({state:'active',applicationSelection:selection})}));await f.open();
 for(const value of ['review-ready','prepared','outcome-unknown','finishing','selected']){selection=selectionState(value);await f.click('STATUS');for(const command of ['GENERATION_ACTIVATE','GENERATION_CONTINUE','GENERATION_RESTART']){assert.equal(f.button(command).hidden,true);f.button(command).listeners.get('click')();}assert.match(f.content.textContent,/不能激活、继续切换或重启/);}
 assert.ok(f.calls.every(x=>x.type==='PAIA_SYNC_STATUS'));f.language('en');assert.match(f.content.textContent,/keep unsubmitted edits and do not restart/);assert.match(f.content.textContent,/Protection for unsaved edits across pages/);
});
test('safe cancellation retains double-click and unknown-response guards without automatic replay',async t=>{
 let release;const f=fixture(t,async({type})=>type==='PAIA_GENERATION_CANCEL'?new Promise(r=>release=r):({ok:true,data:{...unavailable,applicationSelection:selectionState('review-ready')}}));await f.open();const b=f.button('GENERATION_CANCEL');b.listeners.get('click')();b.listeners.get('click')();assert.equal(f.calls.filter(x=>x.type==='PAIA_GENERATION_CANCEL').length,1);assert.equal(b.disabled,true);release({ok:false,error:'MESSAGE_CHANNEL_INTERRUPTED'});await tick();assert.equal(f.button('GENERATION_CANCEL').hidden,true);assert.equal(f.button('GENERATION_RESTART').hidden,true);assert.equal(f.calls.length,2);assert.match(f.content.textContent,/没有自动重试/);
});
test('late cancellation reply after leaving Settings is ignored',async t=>{
 let release;const f=fixture(t,async({type})=>type==='PAIA_GENERATION_CANCEL'?new Promise(r=>release=r):({ok:true,data:state({applicationSelection:selectionState('review-ready')})}));await f.open();f.button('GENERATION_CANCEL').listeners.get('click')();f.panel.hidden=true;release({ok:true,data:selectionState('not-prepared',{priorLibraryRetained:true})});await tick();assert.doesNotMatch(f.content.textContent,/原选择已取消/);assert.equal(f.calls.length,2);
});

test('malformed selection restart entitlement exposes no selection action',async t=>{const f=fixture(t,async()=>({ok:true,data:{...unavailable,applicationSelection:selectionState('outcome-unknown',{reloadRequired:true})}}));await f.open();assert.equal(f.buttons().length,0);assert.equal(f.calls.length,1);});


test('active but unenrolled Context honestly gates NOW until explicit Resume and never dispatches the hidden action',async t=>{
 let value=state({state:'active',contextCommands:true,needsContextEnrollment:true});const f=fixture(t,async({type})=>{if(type==='PAIA_SYNC_RESUME')value={...value,needsContextEnrollment:false};return {ok:true,data:value};});await f.open();assert.equal(f.button('RESUME').hidden,false);assert.equal(f.button('NOW').hidden,true);assert.match(f.content.textContent,/Context 显式登记/);f.button('NOW').listeners.get('click')();assert.equal(f.calls.filter(x=>x.type==='PAIA_SYNC_NOW').length,0);
 f.language('en');assert.match(f.content.textContent,/explicitly enroll Context before saving a checkpoint/);await f.click('RESUME');assert.equal(f.button('RESUME').hidden,true);assert.equal(f.button('NOW').hidden,false);assert.equal(f.calls.filter(x=>x.type==='PAIA_SYNC_RESUME').length,1);
});

const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
for(const operation of ['NOW','RESTORE','STATUS'])for(const stop of ['PAUSE','DISCONNECT'])test(`mounted ${stop} stays available during held ${operation} and fences its late ACK`,async t=>{
 const old=deferred(),stopped=stop==='PAUSE'?'paused':'disconnected';let held=false;
 const f=fixture(t,async({type})=>type==='PAIA_SYNC_'+operation&&held?old.promise:({ok:true,data:state({state:type==='PAIA_SYNC_'+stop?stopped:'active',resumeAvailable:stopped!=='disconnected'})}));
 await f.open();held=true;await f.click(operation);
 for(const command of ['NOW','RESTORE','RESUME','CONTINUE','GENERATION_PREPARE']){f.button(command).listeners.get('click')();}
 assert.equal(f.calls.length,2,'only the original ordinary action dispatches');
 await f.click(stop);assert.equal(f.content.dataset.syncState,stopped);assert.match(f.content.textContent,stop==='PAUSE'?/传输已暂停/:/本机连接已断开/);
 old.resolve({ok:true,data:state({state:'active'})});await tick();assert.equal(f.content.dataset.syncState,stopped);assert.equal(f.button('NOW').hidden,true);assert.equal(f.calls.length,3);
});
for(const stop of ['PAUSE','DISCONNECT'])test(`reopened busy worker permits only STATUS and ${stop}, not transfer or enrollment`,async t=>{
 const stopped=stop==='PAUSE'?'paused':'disconnected';let current=state({state:'active',busy:true,resumeAvailable:false,task:{kind:'restore',phase:'running'}});
 const f=fixture(t,async({type})=>{if(type==='PAIA_SYNC_'+stop)current={...current,state:stopped};return {ok:true,data:current};});await f.open();
 assert.equal(f.button('NOW').hidden,true);assert.equal(f.button('RESTORE').hidden,true);assert.equal(f.button('RESUME').hidden,true);await f.click(stop);assert.equal(f.content.dataset.syncState,stopped);assert.equal(f.button('RESUME').hidden,true,'stop ACK does not claim old worker is idle');
});
for(const outcome of ['error','invalid'])test(`late ${outcome} from superseded transfer cannot overwrite confirmed pause or clear a newer status flight`,async t=>{
 const old=deferred(),status=deferred();let reads=0;const f=fixture(t,async({type})=>type==='PAIA_SYNC_NOW'?old.promise:type==='PAIA_SYNC_PAUSE'?{ok:true,data:state({state:'paused'})}:++reads===1?{ok:true,data:state({state:'active'})}:status.promise);
 await f.open();await f.click('NOW');await f.click('PAUSE');await f.click('STATUS');
 old.resolve(outcome==='error'?{ok:false,error:'SYNTHETIC_LATE_ERROR'}:{ok:true,data:{state:'active'}});await tick();assert.equal(f.content.dataset.syncState,'paused');assert.equal(f.button('STATUS').disabled,true,'old finally cannot clear newer busy');assert.doesNotMatch(f.content.textContent,/先核对状态/);
 status.resolve({ok:true,data:state({state:'paused'})});await tick();assert.match(f.content.textContent,/传输已暂停/);assert.equal(f.button('STATUS').disabled,false);
});
test('pending stop rejects duplicate and contrary stop clicks; failed stop remains uncertain until status',async t=>{
 const old=deferred(),stop=deferred();let reads=0;const f=fixture(t,async({type})=>type==='PAIA_SYNC_NOW'?old.promise:type==='PAIA_SYNC_PAUSE'?stop.promise:{ok:true,data:state({state:++reads===1?'active':'paused'})});
 await f.open();await f.click('NOW');await f.click('PAUSE');for(const command of ['PAUSE','DISCONNECT','NOW','RESTORE','RESUME','STATUS'])f.button(command).listeners.get('click')();assert.equal(f.calls.length,3);
 stop.resolve({ok:false,error:'SYNTHETIC_STOP_UNKNOWN'});await tick();assert.match(f.content.textContent,/先核对状态/);assert.equal(f.button('NOW').hidden,true);old.resolve({ok:true,data:state({state:'active'})});await tick();assert.match(f.content.textContent,/先核对状态/);await f.click('STATUS');assert.match(f.content.textContent,/传输已暂停/);assert.equal(f.calls.length,4);
});
test('stop remains available after an uncertain ordinary operation without allowing a replay',async t=>{
 const f=fixture(t,async({type})=>type==='PAIA_SYNC_NOW'?{ok:false,error:'SYNTHETIC_UNKNOWN'}:{ok:true,data:state({state:type==='PAIA_SYNC_PAUSE'?'paused':'active'})});await f.open();await f.click('NOW');assert.equal(f.button('NOW').hidden,true);await f.click('PAUSE');assert.match(f.content.textContent,/传输已暂停/);assert.equal(f.calls.filter(x=>x.type==='PAIA_SYNC_NOW').length,1);
});
test('selection holds do not become a stop-command concurrency bypass',async t=>{
 let choice=selectionState('not-prepared',{busy:true});const f=fixture(t,async()=>({ok:true,data:state({state:'active',busy:true,applicationSelection:choice})}));await f.open();
 for(const value of [choice,...['prepared','outcome-unknown','finishing','selected','restart-requested'].map(x=>selectionState(x))]){choice=value;await f.click('STATUS');for(const stop of ['PAUSE','DISCONNECT']){assert.equal(f.button(stop).hidden,true);f.button(stop).listeners.get('click')();}}
 assert.ok(f.calls.every(x=>x.type==='PAIA_SYNC_STATUS'));
});
test('close and reopen after a stop fences all earlier responses',async t=>{
 const old=deferred(),stop=deferred();let reads=0;const f=fixture(t,async({type})=>type==='PAIA_SYNC_NOW'?old.promise:type==='PAIA_SYNC_PAUSE'?stop.promise:{ok:true,data:++reads===1?state({state:'active'}):state({state:'disconnected',resumeAvailable:false})});await f.open();await f.click('NOW');await f.click('PAUSE');f.detail.dialog.close();await f.open();old.resolve({ok:true,data:state({state:'active'})});stop.resolve({ok:true,data:state({state:'paused'})});await tick();assert.equal(f.content.dataset.syncState,'disconnected');assert.equal(f.button('NOW').hidden,true);assert.equal(f.calls.length,4);
});
for(const stop of ['PAUSE','DISCONNECT'])test(`active enrollment Resume remains stoppable by ${stop} without adopting its late ACK`,async t=>{
 const old=deferred();const f=fixture(t,async({type})=>type==='PAIA_SYNC_RESUME'?old.promise:{ok:true,data:state({state:type==='PAIA_SYNC_'+stop?(stop==='PAUSE'?'paused':'disconnected'):'active',needsContextEnrollment:true})});await f.open();await f.click('RESUME');await f.click(stop);old.resolve({ok:true,data:state({state:'active',needsContextEnrollment:false})});await tick();assert.equal(f.content.dataset.syncState,stop==='PAUSE'?'paused':'disconnected');assert.equal(f.button('NOW').hidden,true);assert.equal(f.calls.length,3);
});
test('not-started enrollment can be disconnected without broadening active-only pause availability',async t=>{
 const old=deferred();const f=fixture(t,async({type})=>type==='PAIA_SYNC_RESUME'?old.promise:{ok:true,data:state(type==='PAIA_SYNC_DISCONNECT'?{state:'disconnected',resumeAvailable:false}:{})});await f.open();await f.click('RESUME');assert.equal(f.button('PAUSE').hidden,true);await f.click('DISCONNECT');old.resolve({ok:true,data:state({state:'active'})});await tick();assert.equal(f.content.dataset.syncState,'disconnected');assert.equal(f.button('RESUME').hidden,true);
});
test('superseded transfer finally cannot unlock a newly authorized Resume flight',async t=>{
 const old=deferred(),resume=deferred();const f=fixture(t,async({type})=>type==='PAIA_SYNC_NOW'?old.promise:type==='PAIA_SYNC_RESUME'?resume.promise:{ok:true,data:state({state:type==='PAIA_SYNC_PAUSE'?'paused':'active'})});await f.open();await f.click('NOW');await f.click('PAUSE');await f.click('RESUME');old.resolve({ok:true,data:state({state:'active'})});await tick();assert.equal(f.button('RESUME').disabled,true);assert.equal(f.button('NOW').hidden,true);assert.equal(f.content.dataset.syncState,'paused');resume.resolve({ok:true,data:state({state:'active'})});await tick();assert.equal(f.button('NOW').disabled,false);assert.equal(f.button('NOW').hidden,false);
});
test('generation preparation remains single-flight rather than accepting concurrent Sync stop commands',async t=>{
 const prepared=deferred();const f=fixture(t,async({type})=>type==='PAIA_GENERATION_PREPARE'?prepared.promise:{ok:true,data:state({state:'active',applicationSelection:selectionState('not-prepared')})});await f.open();await f.click('GENERATION_PREPARE');for(const name of ['PAUSE','DISCONNECT']){assert.equal(f.button(name).disabled,true);f.button(name).listeners.get('click')();}assert.equal(f.calls.length,2);prepared.resolve({ok:true,data:selectionState('review-ready')});await tick();assert.equal(f.button('PAUSE').disabled,false);
});
