import test from 'node:test';
import assert from 'node:assert/strict';
import {SettingsLocalState,changePreferenceControl,timeDisplayValue,withSettingsControlFocus} from '../ui/settings-local-state.js';
const page=(preferences={},settings={})=>({preferences,settings:{consentVersion:1,enabled:true,...settings}});
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};

test('all persisted font/width choices and legacy date-only survive reading without a write',async()=>{
 for(const fontSize of ['small','standard','large','xlarge'])for(const readingWidth of ['narrow','standard','wide']){const calls=[],state=new SettingsLocalState({send:async(...args)=>{calls.push(args);return page({fontSize,readingWidth,timeDisplay:'date_only'});}});await state.load();assert.equal(state.preferences.fontSize,fontSize);assert.equal(state.preferences.readingWidth,readingWidth);assert.equal(state.preferences.timeDisplay,'date_only');assert.equal(timeDisplayValue(state.preferences.timeDisplay),'date_and_time');assert.deepEqual(calls.map(x=>x[0]),['GET_PAGE']);}
});
test('focused initiating select receives confirmed value only after acknowledgement',async()=>{
 const pending=deferred(),state=new SettingsLocalState({send:async type=>type==='GET_PAGE'?page():pending.promise});await state.load();const document={activeElement:null,body:{},documentElement:{}},control={value:'large',ownerDocument:document,isConnected:true,getClientRects:()=>[{}],focus(){document.activeElement=this;}};document.activeElement=control;
 const saving=changePreferenceControl(state,'fontSize','large',control);assert.equal(control.value,'standard');assert.equal(state.preferences.fontSize,'standard');assert.equal(state.busy,true);pending.resolve({ok:true});assert.equal(await saving,true);assert.equal(control.value,'large');assert.equal(document.activeElement,control);
});
test('failed preference write reconciles real state and keeps visible failure feedback',async()=>{
 let reads=0;const state=new SettingsLocalState({send:async type=>{if(type==='GET_PAGE')return page({fontSize:++reads===1?'small':'large'});throw Error('lost acknowledgement');}});await state.load();assert.equal(await state.setPreference('fontSize','large'),false);assert.equal(state.preferences.fontSize,'large');assert.equal(state.feedback,'save-error');assert.equal(state.busy,false);
});
test('failed write and failed reconciliation retain previously confirmed choice',async()=>{
 let reads=0;const state=new SettingsLocalState({send:async type=>{if(type==='GET_PAGE'&&++reads===1)return page({readingWidth:'wide'});throw Error('offline');}});await state.load();await state.setPreference('readingWidth','narrow');assert.equal(state.preferences.readingWidth,'wide');assert.equal(state.feedback,'save-error');
});
test('read before a write cannot overwrite its newer acknowledged value',async()=>{
 const old=deferred();let reads=0;const state=new SettingsLocalState({send:async type=>type==='GET_PAGE'?(++reads===1?page():old.promise):{ok:true}});await state.load();const pending=state.load();await state.setPreference('appearance','dark');old.resolve(page({appearance:'light'}));await pending;assert.equal(state.preferences.appearance,'dark');
});
test('cross-tab refresh during write is deferred then reads canonical preferences',async()=>{
 const ack=deferred();let reads=0;const state=new SettingsLocalState({send:async type=>type==='GET_PAGE'?page({fontSize:++reads===1?'small':'xlarge'}):ack.promise});await state.load();const saving=state.setPreference('fontSize','large');await state.load();assert.equal(reads,1);ack.resolve({ok:true});await saving;assert.equal(reads,2);assert.equal(state.preferences.fontSize,'xlarge');
});
test('capture requires consent and exact command acknowledgement',async()=>{
 const sent=[],state=new SettingsLocalState({send:async(type,payload)=>{sent.push([type,payload]);return type==='GET_PAGE'?page({}, {consentVersion:0,enabled:false}):{enabled:false};}});await state.load();assert.equal(await state.setCapture(true),false);assert.equal(sent.length,1);state.apply(page());assert.equal(await state.setCapture(false),true);assert.deepEqual(sent.at(-1),['SET_ENABLED',{enabled:false}]);assert.equal(state.capture.enabled,false);assert.equal(state.preferences.fontSize,'standard');
});
test('malformed acknowledgement cannot optimistically apply a preference',async()=>{
 const state=new SettingsLocalState({send:async type=>type==='GET_PAGE'?page():{}});await state.load();assert.equal(await state.setPreference('language','en'),false);assert.equal(state.preferences.language,'system');assert.equal(state.feedback,'save-error');
});
test('read failure is distinct from a confirmed off value',async()=>{
 const state=new SettingsLocalState({send:async()=>{throw Error('unreadable');}});await state.load();assert.equal(state.loaded,false);assert.equal(state.capture,null);assert.equal(state.feedback,'read-error');assert.equal(await state.setCapture(false),false);
});
test('only the five local preference keys can be changed',async()=>{
 const calls=[],state=new SettingsLocalState({send:async(type,payload)=>{calls.push(type);return page();}});await state.load();for(const [key,value] of [['grant',true],['fontSize','16'],['timeDisplay','date_only']])assert.equal(await state.setPreference(key,value),false);assert.deepEqual(calls,['GET_PAGE']);
});
test('disable-induced focus is repaired but newer user focus wins',async()=>{
 const document={body:{},documentElement:{},activeElement:null},control={ownerDocument:document,isConnected:true,getClientRects:()=>[{}],focus(){document.activeElement=this;}};document.activeElement=control;await withSettingsControlFocus(control,async()=>{document.activeElement=document.body;});assert.equal(document.activeElement,control);const newer={};await withSettingsControlFocus(control,async()=>{document.activeElement=newer;});assert.equal(document.activeElement,newer);
});


test('Settings history summary follows the resolved locale for empty, completed, partial and failed reads',async()=>{
 const {historyLatestText}=await import('../ui/history-completion.js');
 assert.match(historyLatestText(null,'en'),/^No history has been imported/);
 assert.match(historyLatestText(null,'zh-CN'),/^尚未补全历史输入/);
 const record={completedAt:'2026-10-08T12:00:00Z',adapterId:'chatgpt-mapping-v1',counts:{added:3,duplicates:2,timeEnriched:1,issues:4},phase:'partial'};
 const english=historyLatestText(record,'en'),chinese=historyLatestText(record,'zh-CN');
 assert.match(english,/ChatGPT official export · Added 3 · Already saved 2 · Times completed 1 · Issues 4 · Some inputs need review/);
 assert.doesNotMatch(english,/[\u3400-\u9fff]/);assert.match(chinese,/新增 3 · 已存在 2 · 补全时间 1 · 异常 4 · 部分输入待确认/);
 assert.doesNotMatch(historyLatestText({...record,phase:'completed'},'en'),/need review/);
 assert.match(historyLatestText(record,'en',true),/^The last import record could not be loaded/);
 assert.match(historyLatestText(record,'zh-CN',true),/^上次补全记录未能载入/);
 assert.deepEqual(record.counts,{added:3,duplicates:2,timeEnriched:1,issues:4});
});

test('Settings latest-import owner contains malformed summary failures and keeps locale changes local',async()=>{
 const {initHistoryCompletion}=await import('../ui/history-completion.js');
 const prior=new Map(['document','window','chrome'].map(key=>[key,globalThis[key]])),nodes=new Map(),listeners=new Map();let requests=0;
 const node=id=>{if(!nodes.has(id))nodes.set(id,{textContent:'',addEventListener(){},querySelectorAll:()=>[]});return nodes.get(id);};
 globalThis.document={documentElement:{lang:'en'},getElementById:node,addEventListener:(name,fn)=>listeners.set(name,fn)};
 globalThis.window={addEventListener(){}};
 globalThis.chrome={runtime:{sendMessage:async()=>{requests++;return {ok:true,data:{lastImport:{adapterId:'claude-conversations-v1',completedAt:'2026-01-01',counts:null}}};}}};
 try{const owner=initHistoryCompletion();await assert.doesNotReject(owner.latest());assert.match(node('history-latest').textContent,/could not be loaded/);document.documentElement.lang='zh-CN';listeners.get('paia:preferences-applied')();assert.match(node('history-latest').textContent,/未能载入/);assert.equal(requests,1);}
 finally{for(const [key,value]of prior)if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
});

test('Settings locale and reopen leave History labels with their existing owner',async()=>{
 const {readFile}=await import('node:fs/promises'),{runInNewContext}=await import('node:vm'),{refreshHistoryCopy}=await import('../ui/history-copy.js');
 const source=await readFile(new URL('../ui/settings-preferences.js',import.meta.url),'utf8'),start=source.indexOf('function syncSettingsLocale(){'),end=source.indexOf('\nexport function installSettingsPreferences',start);assert.ok(start>=0&&end>start);
 const previous=globalThis.document;let writes=0,rpcs=0;
 const read={dataset:{historyCopy:'阅读 Input Archive'},value:'',get textContent(){return this.value;},set textContent(value){writes++;this.value=value;}},editor={value:'SYNTHETIC é 👩🏽‍💻 draft'};
 const host={querySelectorAll:selector=>selector==='[data-history-copy]'?[read]:[]},doc={documentElement:{lang:'zh-CN'},activeElement:editor,querySelector:()=>null};globalThis.document=doc;
 try{for(const language of ['zh-CN','en','zh-CN']){doc.documentElement.lang=language;refreshHistoryCopy(host);const expected=language==='zh-CN'?'阅读 Input Archive':'Read Input Archive';assert.equal(read.textContent,expected);const before=writes;
  const context={document:doc,syncSettingsCopy(){},style:null,promptPosition:null,promptNext:null,about:null,settingsDetails:null,$:id=>id==='history-read'?read:null,copy:(zh,en)=>language==='zh-CN'?zh:en,setIconLabel(){},request(){rpcs++;throw Error('unexpected RPC');}};
  // Group changes/reopen invoke this actual production function without always
  // dispatching another History preferences event. History alone owns its copy.
  runInNewContext(source.slice(start,end)+';syncSettingsLocale();syncSettingsLocale();',context);
  assert.equal(read.textContent,expected);assert.equal(writes,before,'Settings cannot overwrite History-owned nodes');assert.equal(doc.activeElement,editor);assert.equal(editor.value,'SYNTHETIC é 👩🏽‍💻 draft');assert.equal(rpcs,0);
 }}finally{globalThis.document=previous;}
});
