import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {OrganizerStore} from '../core/organizer/store.js';
import {OnboardingUI} from '../ui/onboarding.js';
import {OnboardingService} from '../core/onboarding.js';
import {CONTROL_PUBLICATION_REVISION} from '../core/local-control-publication.js';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {awaitContentFixtureConsent} from './harness/content-fixture-consent.mjs';

globalThis.IDBKeyRange=IDBKeyRange;
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
async function fixture(t){
 const data={},indexedDB=new IDBFactory(),name='SYNTHETIC-content-consent-'+crypto.randomUUID(),others=[];
 let hold=null;
 const local={get:async key=>({[key]:structuredClone(data[key])}),set:async rows=>{if(hold)await hold(rows);Object.assign(data,structuredClone(rows));}};
 const store=new OrganizerStore(local,{indexedDB,name}),onboarding=new OnboardingService(store);await onboarding.status();await store.finishFoundation();
 t.after(()=>{store.repository.db?.close();for(const other of others)other.repository.db?.close();});
 return {store,onboarding,hold:fn=>{hold=fn;},async reader({initialized=true}={}){const other=new OrganizerStore(local,{indexedDB,name});if(initialized)await other.finishFoundation();others.push(other);return other;}};
}
async function uiFixture(t,f,{lostReply=false,reconcile=true}={}){
 const previous=globalThis.document,nodes=new Map(),hidden=deferred();
 for(const id of ['enable-consent','decline-consent','consent-panel','onboarding-error'])nodes.set(id,{hidden:false,disabled:false,textContent:'',addEventListener(){}});
 const panel=nodes.get('consent-panel');let isHidden=false;Object.defineProperty(panel,'hidden',{get:()=>isHidden,set:value=>{isHidden=value;if(value)hidden.resolve();}});
 globalThis.document={getElementById:id=>nodes.get(id),documentElement:{lang:'en'}};
 t.after(()=>{globalThis.document=previous;});
 const ui=new OnboardingUI();ui.state={step:'consent'};const page={settings:{consentVersion:0,enabled:false},preferences:{}};ui.paint(page);
 let calls=0,statusReads=0;
 ui.capture.send=async type=>{if(type==='CONSENT'){calls++;const result=await f.store.consent(true);if(lostReply)throw Error('SYNTHETIC lost acknowledgement');return result;}
  assert.equal(type,'GET_PAGE');if(!reconcile)throw Error('SYNTHETIC unavailable reconciliation');const status=await f.store.status();return {settings:{consentVersion:status.consented?1:0,enabled:status.enabled},preferences:{}};};
 ui.load=async()=>{ui.state=await f.onboarding.status();};ui.refresh=async()=>{};
 return {ui,panel,calls:()=>calls,statusReads:()=>statusReads,page:{locator:selector=>{assert.equal(selector,'#consent-panel');return {waitFor:async options=>{assert.deepEqual(options,{state:'hidden'});if(!panel.hidden)await hidden.promise;}};},evaluate:async fn=>{assert.match(fn.toString(),/GET_STATUS/);statusReads++;return {ok:true,data:await f.store.status()};}}};
}

for(const initialized of [false,true])test('old unacknowledged setup acquisition straddles real consent before callback; initialized='+initialized,async t=>{
 const f=await fixture(t),reader=await f.reader({initialized}),original=reader.repository.transaction.bind(reader.repository);let fenceReads=0,entered=0;
 reader.repository.transaction=async(write,fn,stores)=>{let fence=false;const result=await original(write,async tx=>{const get=tx.get.bind(tx);tx.get=(name,key)=>{if(key===CONTROL_PUBLICATION_REVISION)fence=true;return get(name,key);};return fn(tx);},stores);
  if(fence&&++fenceReads===1)await f.store.consent(true);return result;};
 await assert.rejects(reader.run(()=>{entered++;}),{code:'CONTROL_PUBLICATION_CHANGED'});assert.equal(entered,0);assert.equal(fenceReads,2);
 reader.repository.transaction=original;assert.equal((await f.store.status()).consented,true);await reader.run(()=>{entered++;});assert.equal(entered,1);
});

test('held original consent keeps the actual UI barrier closed and seeds once only after settled publication',async t=>{
 const f=await fixture(t),reader=await f.reader(),u=await uiFixture(t,f),entered=deferred(),release=deferred();f.hold(async()=>{entered.resolve();await release.promise;});
 const accept=u.ui.accept();await entered.promise;let seeds=0;
 const seed=awaitContentFixtureConsent(u.page).then(()=>reader.run(()=>{seeds++;}));await new Promise(resolve=>setImmediate(resolve));
 assert.equal(u.panel.hidden,false);assert.equal(u.ui.capture.busy,true);assert.equal(seeds,0);assert.equal(u.statusReads(),0);assert.equal(u.calls(),1);
 release.resolve();await accept;await seed;assert.equal(u.panel.hidden,true);assert.equal(seeds,1);assert.equal(u.statusReads(),1);assert.equal(u.calls(),1);
});

test('a reconciled lost acknowledgement admits the already settled grant without a second consent',async t=>{
 const f=await fixture(t),u=await uiFixture(t,f,{lostReply:true});await u.ui.accept();assert.equal(u.ui.capture.feedback,'save-error');await awaitContentFixtureConsent(u.page);assert.equal(u.calls(),1);assert.equal(u.statusReads(),1);
});

test('unresolved lost acknowledgement leaves the UI barrier closed without status or seed dispatch',async t=>{
 const f=await fixture(t),u=await uiFixture(t,f,{lostReply:true,reconcile:false});await u.ui.accept();let seeds=0;void awaitContentFixtureConsent(u.page).then(()=>{seeds++;});await new Promise(resolve=>setImmediate(resolve));assert.equal(u.panel.hidden,false);assert.equal(u.ui.capture.captureUnknown,true);assert.equal(u.statusReads(),0);assert.equal(u.calls(),1);assert.equal(seeds,0);
});

for(const data of [{consented:false,enabled:true},{consented:true,enabled:false}])test('hidden presentation alone cannot grant fixture consent '+JSON.stringify(data),async()=>{
 let calls=0;await assert.rejects(awaitContentFixtureConsent({locator:()=>({waitFor:async()=>{}}),evaluate:async()=>{calls++;return {ok:true,data};}}),{code:'ERR_ASSERTION'});assert.equal(calls,1);
});
test('unsettled presentation propagates its original timeout before status or seed',async()=>{let calls=0;const timeout=Error('SYNTHETIC original locator timeout');await assert.rejects(awaitContentFixtureConsent({locator:()=>({waitFor:async()=>{throw timeout;}}),evaluate:async()=>{calls++;}}),error=>error===timeout);assert.equal(calls,0);});

test('status error after hidden presentation propagates without retry',async()=>{let calls=0;await assert.rejects(awaitContentFixtureConsent({locator:()=>({waitFor:async()=>{}}),evaluate:async()=>{calls++;return {ok:false,error:'SYNTHETIC'};}}),{code:'ERR_ASSERTION'});assert.equal(calls,1);});

test('later real independent publication still fails the unchanged acquisition fence',async t=>{
 const f=await fixture(t),u=await uiFixture(t,f);await u.ui.accept();await awaitContentFixtureConsent(u.page);const reader=await f.reader(),original=reader.repository.transaction.bind(reader.repository);let once=false,entered=0;
 reader.repository.transaction=async(write,fn,stores)=>{let fence=false;const result=await original(write,async tx=>{const get=tx.get.bind(tx);tx.get=(name,key)=>{if(key===CONTROL_PUBLICATION_REVISION)fence=true;return get(name,key);};return fn(tx);},stores);if(fence&&!once){once=true;await f.store.updatePreferences({appearance:'dark'});}return result;};
 await assert.rejects(reader.run(()=>{entered++;}),{code:'CONTROL_PUBLICATION_CHANGED'});assert.equal(entered,0);
});

test('both original Content fixtures wait before independent Store creation, retaining counts, clocks and bounds',async()=>{
 const source=await readFile(new URL('./cpv1-02-dvn-topic-content-chrome-e2e.test.mjs',import.meta.url),'utf8');
 assert.equal((source.match(/await awaitContentFixtureConsent\(p\)/g)||[]).length,2);
 for(const title of ['D2 Section durable order','D5 Content paired reading roles']){const start=source.indexOf('test(`'+title),end=source.indexOf('const seed=await p.evaluate',start),block=source.slice(start,end);assert.ok(block.includes('await awaitContentFixtureConsent(p)'));}
 assert.equal((source.match(/i<220/g)||[]).length,2);assert.equal((source.match(/timeout:180000/g)||[]).length,2);assert.equal((source.match(/s\.clock=\(\)=>at/g)||[]).length,4);
});
