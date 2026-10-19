import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {OrganizerStore} from '../core/organizer/store.js';
import {STORAGE_KEY,ArchiveError} from '../core/constants.js';
import {setup} from './harness/thought-m1.mjs';
const native=await readFile(new URL('./cpv1-topic-05-5-section-actions-chrome-e2e.test.mjs',import.meta.url),'utf8');
const worker=await readFile(new URL('../background/service-worker.js',import.meta.url),'utf8');
const start=native.indexOf('const seedSections='),end=native.indexOf("for(const variant of ['source','release'])");
assert.ok(start>0&&end>start);
const seedSource=native.slice(start,end);
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const eventually=async fn=>{for(let i=0;i<20;i++){if(await fn())return;await new Promise(r=>setImmediate(r));}assert.fail('original consent acknowledgement did not settle');};
const makeSeed=rpc=>new Function('rpc','eventually','assert','crypto',seedSource+';return seedSections;')(rpc,eventually,assert,crypto);
const writes=new Set(['CREATE_LIBRARY_TOPIC','CREATE_LIBRARY_SECTION','CONTINUE_THINKING']);
function route(s,trace,hook=()=>{}){return async(_p,type,fields={})=>{trace.push({type,...structuredClone(fields)});await hook(type,fields);switch(type){case 'GET_STATUS':return s.status();case 'GET_LIBRARY_FOUNDATION_STATUS':return s.libraryStatus();case 'CREATE_LIBRARY_TOPIC':return s.createTopic(fields.topic);case 'CREATE_LIBRARY_SECTION':return s.createSection(fields.section);case 'GET_LIBRARY_TOPIC':return s.topic(fields.id);case 'CONTINUE_THINKING':return s.continueThinking(fields.thought);default:throw new Error('unexpected route '+type);}};}
async function fixture(){const f=await setup(OrganizerStore);await f.s.finishFoundation();return f;}
test('original competing Store rejects a genuine publication change before its operation callback',{timeout:10000},async()=>{
 const {s,storage,indexedDB}=await fixture();let hold=null;
 const local={async get(key){const gate=hold;if(gate&&key===STORAGE_KEY){hold=null;gate.entered.resolve();await gate.release.promise;}return storage.get(key);},set:v=>storage.set(v)};
 const second=new OrganizerStore(local,{indexedDB});await second.finishFoundation();
 const gate={entered:deferred(),release:deferred()};hold=gate;let entered=0;
 const old=second.run(()=>{entered++;return 'unexpected';});const observed=old.then(value=>({value}),error=>({error}));
 try{
  await Promise.race([gate.entered.promise,observed.then(()=>assert.fail('old read ended before exact storage seam'))]);
  const before=(await storage.get(STORAGE_KEY))[STORAGE_KEY].controlPublication.revision;
  await s.updatePreferences({language:'en'});
  const after=(await storage.get(STORAGE_KEY))[STORAGE_KEY].controlPublication.revision;assert.ok(after>before);
  gate.release.resolve();const result=await observed;assert.equal(result.error?.code,'CONTROL_PUBLICATION_CHANGED');assert.equal(entered,0);
  assert.equal((await s.status()).enabled,true);
 }finally{gate.release.resolve();await observed;await s.tail;await second.tail;s.repository.db.close();second.repository.db.close();}
});
test('native seed uses original worker method routes, one operation per write and exact real default Section ACK',{timeout:10000},async()=>{
 const {s}=await fixture(),trace=[];const seed=makeSeed(route(s,trace));
 try{
  // Both operations use the original owner tail, unlike a separate page Store.
  const publication=s.updatePreferences({language:'en'}),seeded=seed({});const [_,f]=await Promise.all([publication,seeded]);
  assert.ok(f.defaultId);assert.equal(new Set([f.defaultId,...f.ids]).size,3);
  const t=await s.topic(f.topic),e=await s.entry(f.entry);assert.equal(t.defaultSectionId,f.defaultId);assert.equal(e.body,'SYNTHETIC protected prose\n\n中文 paragraph');
  const calls=trace.filter(x=>writes.has(x.type));assert.deepEqual(calls.map(x=>x.type),['CREATE_LIBRARY_TOPIC','CREATE_LIBRARY_SECTION','CREATE_LIBRARY_SECTION','CONTINUE_THINKING']);
  assert.equal(new Set(calls.map(x=>(x.topic||x.section||x.thought).operationId)).size,4);
  assert.deepEqual(trace.slice(0,2).map(x=>x.type),['GET_STATUS','GET_LIBRARY_FOUNDATION_STATUS']);
  for(const [type,method,arg]of [['CREATE_LIBRARY_TOPIC','createTopic','topic'],['CREATE_LIBRARY_SECTION','createSection','section'],['CONTINUE_THINKING','continueThinking','thought']])assert.ok(worker.includes(`case '${type}': return store.${method}(request.${arg});`));
  assert.ok(worker.includes("case 'GET_LIBRARY_TOPIC': return recoverySnapshot(()=>store.topic(request.id));"));
  assert.ok(!seedSource.includes('new OrganizerStore'));assert.ok(!seedSource.includes('catch'));
 }finally{await s.tail;s.repository.db.close();}
});
for(const code of ['CONTROL_PUBLICATION_CHANGED','STORAGE_FAILED'])test('seed preserves original '+code+' refusal without replaying a write',{timeout:10000},async()=>{
 const {s}=await fixture(),trace=[];const seed=makeSeed(route(s,trace,type=>{if(type==='CREATE_LIBRARY_SECTION')throw new ArchiveError(code);}));
 try{await assert.rejects(seed({}),e=>e.code===code);assert.deepEqual(trace.filter(x=>writes.has(x.type)).map(x=>x.type),['CREATE_LIBRARY_TOPIC','CREATE_LIBRARY_SECTION']);}finally{await s.tail;s.repository.db.close();}
});
test('seed waits for real consent acknowledgement and does not write while paused',{timeout:10000},async()=>{
 const {s}=await fixture(),trace=[];await s.setEnabled(false);const seed=makeSeed(route(s,trace));
 try{await assert.rejects(seed({}),/consent acknowledgement/);assert.equal(trace.filter(x=>writes.has(x.type)).length,0);assert.ok(trace.every(x=>x.type==='GET_STATUS'));}finally{await s.tail;s.repository.db.close();}
});
