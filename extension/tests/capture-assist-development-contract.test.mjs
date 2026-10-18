// Static and original-owner lifecycle guards for the development script. Never runs Chrome.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInThisContext,runInNewContext} from 'node:vm';
import {isDeepStrictEqual} from 'node:util';
import {AssistPromptCommands} from '../background/prompt-assist.js';
import {ASSIST_AUTH_KEY} from '../background/assist-consent.js';
import {PromptAssistState} from '../ui/prompt-assist-state.js';
import {SettingsAssistState} from '../ui/settings-assist-state.js';
const source=await readFile(new URL('../scripts/capture-assist-development.mjs',import.meta.url),'utf8');

test('Assist development entry uses the original isolated cloud harness and bounded waits',()=>{
 assert.match(source,/process\.env\.GITHUB_ACTIONS,'true'/);
 assert.match(source,/refs\/heads\/evidence\/assist-development-20261018/);
 assert.match(source,/FakeChatGPT\.start\(\{extensionPath:root,headless:true,launchThroughPort:true\}\)/);
 assert.match(source,/routeComposer\(h\.context,root\)/);
 assert.match(source,/eventually\(fn,label,8000\)/);
 assert.match(source,/setDefaultTimeout\(8000\)/);
 assert.doesNotMatch(source,/force\s*:\s*true|waitForTimeout|\bsetTimeout\s*\(|connectOverCDP|launchPersistentContext|userDataDir\s*:/);
 assert.match(source,/the visible original button owns its native center hit/);
 assert.match(source,/fixedEntryAcrossMoreUnavailableInsertion:true/);
});

test('Assist development action leaves genuine default-off service and authorizations intact',()=>{
 assert.match(source,/readAssistServiceConfiguration\(\),null/);
 assert.match(source,/#surface-more/);assert.match(source,/#prompt-assist-open/);
 assert.match(source,/AI suggestions are unavailable\. Saved prompts remain available\./);
 for(const id of ['settings-assist-replyAccess','settings-assist-remoteProcessing'])assert.ok(source.includes('#'+id));
 assert.match(source,/opening Settings cannot grant or rotate permissions/);
 assert.match(source,/const authorizationBefore=await authorizationStorage\(h\.archive\)/);
 assert.equal([...source.matchAll(/assertAuthorizationUnchanged\(await authorizationStorage\([^)]*\),authorizationBefore\)/g)].length,2);
 assert.match(source,/sessionRecordCreatedByActions:false,sessionRecordUnchanged:true,localRecordPresent:false/);
 assert.doesNotMatch(source,/PAIA_PROMPT_ASSIST_CONFIGURE|PAIA_PROMPT_NEXT_CONFIGURE|\.storage\.(?:local|session)\.(?:set|remove|clear)\s*\(/);
 assert.doesNotMatch(source,/\bnew\s+\w*Store\s*\(|\bimport\s*\(|serviceWorkers\s*\(|chrome\.runtime\.sendMessage\s*=/);
});

test('Assist development receipt binds two real screenshots and runtime hashes without body dumps',()=>{
 assert.match(source,/work\/assist-development/);
 assert.match(source,/sha,tree,runId:process\.env\.GITHUB_RUN_ID/);
 assert.match(source,/runtimeSha256\[file\]=hash\(await readFile/);
 assert.match(source,/sha256:hash\(await readFile\(join\(out,filename\)\)\)/);
 const screenshots=[...source.matchAll(/await screenshot\([^,]+,'([^']+)'/g)].map(match=>match[1]);
 assert.deepEqual(screenshots,['source-more-assist-unavailable.png','source-settings-assist-consents.png']);
 assert.match(source,/bodyFreeReceipt:true/);
 assert.doesNotMatch(source,/exactText:|\.content\s*\(|\.innerHTML|storage\.(?:local|session)\.get\(null\)/);
 for(const gate of ['fullCertification','releaseParity','realSite','liveProvider','humanVisualAcceptance','animationAcceptance'])assert.ok(source.includes(gate+":'NOT_RUN'"));
});

test('Assist development passes only after actual insertion and zero-network assertions',()=>{
 assert.match(source,/fixture\.text\(\)===text/);
 assert.match(source,/source:'SAVED_LOCAL_PROMPT'/);
 assert.match(source,/sendCount:0,enterCount:0/);
 assert.match(source,/external:0,provider:0,extension:0,history:0/);
 assert.match(source,/assert\.deepEqual\(h\.errors,\[\]\);assertZeroNetwork\(h\);receipt\.network=network\(h\)/);
 assert.ok(source.indexOf("receipt.native='PASS'")>source.indexOf("phase='final-original-boundaries'"));
 assert.match(source,/receipt\.native='FAIL';receipt\.failure=\{phase,name:error\.name\}/);
});

// Exercise the exact pure script guard, without importing its native entry.
const guardStart=source.indexOf('function inspectAssistAuthorizationStorage('),guardEnd=source.indexOf('\nconst authorizationStorage=',guardStart);
assert.ok(guardStart>=0&&guardEnd>guardStart);
const inspect=runInThisContext('('+source.slice(guardStart,guardEnd)+')');
const compareSource=source.split('\n').find(line=>line.startsWith('const assertAuthorizationUnchanged='));assert.ok(compareSource);
const unchanged=runInNewContext(compareSource+'\nassertAuthorizationUnchanged;', {assert,isDeepStrictEqual});
const disabled={version:1,replyAccess:false,remoteProcessing:false,generation:'00000000-0000-4000-8000-000000000001'};
// This saved script certifies the historical v1 manual checkpoint only.
const LEGACY_ASSIST_AUTH_KEY='promptAssistAuthorizationV1';
const snapshot=(record=disabled,local={})=>({session:{[LEGACY_ASSIST_AUTH_KEY]:record},local});

test('storage guard accepts genuinely absent or strictly disabled session state',()=>{
 assert.deepEqual(inspect({session:{},local:{}}),{sessionPresent:false,localPresent:false,record:null});
 assert.deepEqual(inspect(snapshot()),{sessionPresent:true,localPresent:false,record:disabled});
 assert.notEqual(inspect(snapshot()).record,disabled,'baseline is detached from mutable input');
});

test('storage guard rejects either permission, malformed records and any durable local record',()=>{
 let getterCalls=0;
 const invalid=[undefined,null,[],true,{...disabled,replyAccess:true},{...disabled,remoteProcessing:true},{...disabled,replyAccess:'false'},{...disabled,remoteProcessing:0},{...disabled,version:2},{...disabled,generation:'bad'},{...disabled,generation:'-'.repeat(36)},{...disabled,generation:4},{...disabled,extra:undefined},{...disabled,[Symbol('extra')]:false},Object.fromEntries(Object.entries(disabled).filter(([key])=>key!=='version')),Object.defineProperty({...disabled},'replyAccess',{enumerable:true,get(){getterCalls++;return false;}}),Object.defineProperty({...disabled},'generation',{enumerable:false}),Object.assign(Object.create({inherited:true}),disabled)];
 for(const record of invalid)assert.throws(()=>inspect({session:{[LEGACY_ASSIST_AUTH_KEY]:record},local:{}}),{message:'INVALID_ASSIST_AUTHORIZATION_STORAGE'});
 for(const value of [undefined,null,false,disabled])assert.throws(()=>inspect(snapshot(disabled,{[LEGACY_ASSIST_AUTH_KEY]:value})),{message:'INVALID_ASSIST_AUTHORIZATION_STORAGE'});
 assert.throws(()=>inspect({session:Object.defineProperty({},LEGACY_ASSIST_AUTH_KEY,{enumerable:true,get(){getterCalls++;return disabled;}}),local:{}}),{message:'INVALID_ASSIST_AUTHORIZATION_STORAGE'});
 assert.equal(getterCalls,0,'malformed accessors never execute');
});

test('historical capture guard rejects every current v2 storage record without acquiring permission fields',()=>{
 let touches=0;const enabled={version:2,trigger:'eligible-reply',replyAccess:true,remoteProcessing:true,generation:disabled.generation};
 for(const row of [enabled,{...enabled,replyAccess:false,remoteProcessing:false},undefined,null,false,{},Object.defineProperty({},'replyAccess',{get(){touches++;return false;}})])for(const area of ['local','session']){
  const value={session:{},local:{}};value[area][ASSIST_AUTH_KEY]=row;assert.throws(()=>inspect(value),{message:'INVALID_ASSIST_AUTHORIZATION_STORAGE'});
 }
 for(const area of ['local','session']){const value={session:{},local:{}};Object.defineProperty(value[area],ASSIST_AUTH_KEY,{enumerable:true,get(){touches++;return enabled;}});assert.throws(()=>inspect(value),{message:'INVALID_ASSIST_AUTHORIZATION_STORAGE'});}
 assert.equal(touches,0);
 assert.match(source,/const keys=\['promptAssistAuthorizationV1','promptAssistAutomaticPreferenceV2'\]/);
 assert.match(source,/session:await chrome\.storage\.session\.get\(keys\),local:await chrome\.storage\.local\.get\(keys\)/);
});

test('exact baseline comparison rejects generation rotation, creation and removal while still disabled',()=>{
 const absent=inspect({session:{},local:{}}),before=inspect(snapshot()),rotated=inspect(snapshot({...disabled,generation:'00000000-0000-4000-8000-000000000002'}));
 for(const [actual,baseline]of [[rotated,before],[absent,before],[before,absent]])assert.throws(()=>unchanged(actual,baseline),{code:'ERR_ASSERTION'});
 assert.doesNotThrow(()=>unchanged(inspect(snapshot()),before));
});

test('actual update callback preserves default-off automatic preference and original view reads never grant',async()=>{
 const worker=await readFile(new URL('../background/service-worker.js',import.meta.url),'utf8');
 const start=worker.indexOf('chrome.runtime.onInstalled?.addListener(details=>{'),end=worker.indexOf('\n});',start)+4;
 assert.ok(start>=0&&end>start);const registration=worker.slice(start,end);
 const local={},listeners=new Set(),state={consented:true,writes:0};
 const api={runtime:{id:'synthetic-extension',getURL:path=>'chrome-extension://synthetic-extension/'+path,getManifest:()=>({version:'0.55.0'}),sendMessage:async()=>{}},tabs:{query:async()=>[]},storage:{onChanged:{addListener:fn=>listeners.add(fn),removeListener:fn=>listeners.delete(fn)},local:{get:async key=>Object.hasOwn(local,key)?{[key]:structuredClone(local[key])}:{},set:async changes=>{state.writes++;Object.assign(local,structuredClone(changes));}}}};
 const owner=new AssistPromptCommands({status:async()=>({consented:state.consented})},api);let installed;
 try{
  runInNewContext(registration,{chrome:{...api,runtime:{...api.runtime,onInstalled:{addListener:fn=>{installed=fn;}}}},ready:Promise.resolve(),UPDATE_STATE_KEY:'paia-consumer-update:v1'});
  installed({reason:'update',previousVersion:'0.54.0'});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(state.writes,1);assert.equal(local['paia-consumer-update:v1'].state,'installed');assert.equal(Object.hasOwn(local,ASSIST_AUTH_KEY),false,'upgrade cannot create an automatic authorization');
  const settingsSender={id:api.runtime.id,url:api.runtime.getURL('ui/archive.html')},before=await owner.handle({type:'PAIA_PROMPT_ASSIST_STATUS'},settingsSender);
  assert.equal(before.serviceAvailable,false);assert.equal(before.replyAccess,false);assert.equal(before.remoteProcessing,false);
  const assist=new PromptAssistState({send:command=>{assert.equal(command.type,'suggestion_current');return owner.card({type:'assist_current'},{id:1,url:'https://chatgpt.com/c/synthetic'},{identity:'synthetic',assertCurrent:async()=>{}});}});
  assert.equal(await assist.refresh(),false);assert.equal(await assist.activate(),false);assert.equal(assist.result,null);
  const settings=new SettingsAssistState({send:(type,fields={})=>owner.handle({type,...fields},settingsSender)});
  assert.equal(await settings.load(),true);assert.equal(settings.value.replyAccess,false);assert.equal(settings.value.remoteProcessing,false);
  assert.deepEqual(await owner.handle({type:'PAIA_PROMPT_ASSIST_STATUS'},settingsSender),before);assert.equal(state.writes,1,'view and Settings reads never create, change or rotate authorization');assert.equal(Object.hasOwn(local,ASSIST_AUTH_KEY),false);
 }finally{owner.dispose();}
});
