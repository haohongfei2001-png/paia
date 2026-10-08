import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from './vendor/fake-indexeddb/build/esm/index.js';
import {setup,local,capture,derived,inputEdit} from './harness/thought-m1.mjs';
import {STORAGE_KEY} from '../core/constants.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {OrganizerRunner} from '../core/organizer/runner.js';
import {DeterministicFixtureProvider} from './fixtures/organizer/provider.mjs';
import {ThoughtLibraryReadModel} from '../core/thought-library-read-model.js';
import {ThoughtSectionReading} from '../core/thought-section-reading.js';
import {ContinuousTopicReader} from '../ui/continuous-topic-reader.js';

const op=()=>crypto.randomUUID();
const bytes=value=>new TextEncoder().encode(JSON.stringify(value)).length;
const raw=(s,table,id)=>s.repository.transaction(false,t=>t.get(table,id));
const rows=(s,table)=>s.repository.transaction(false,t=>t.all(table));
const topic=(s,name='SYNTHETIC Personal Topic')=>s.createTopic({name,operationId:op()});
async function section(s,a,title,rank){return s.createSection({topicId:a.id,expectedTopicRevision:(await s.topic(a.id)).organizationRevision,title,...(rank?{rank}:{}),operationId:op()});}
async function place(s,e,a,extra={}){const current=await s.entry(e.id),owner=await s.topic(a.id),old=await s.libraryPlacement(a.id,e.id);return s.placeEntry({entryId:e.id,topicId:a.id,expectedEntryRevision:current.revision,expectedTopicRevision:owner.organizationRevision,...(old?{expectedPlacementRevision:old.revision}:{}),...Object.fromEntries(Object.entries(extra).filter(([,v])=>v!==undefined)),operationId:op()});}
async function entry(s,a,{sectionId,body='SYNTHETIC exact prose\n\n第二段 👩🏽‍💻 é\n\n```js\nconst x = 1;\n```',rank}={}){const e=await s.createEntry({actor:'user',operationId:op(),body,type:'idea',formation:'explicit',evidence:[]});await place(s,e,a,{sectionId,rank});return e;}
async function fixture(){const f=await setup(OrganizerStore);await f.s.finishFoundation();const m=new ThoughtLibraryReadModel(f.s);return {...f,m,r:new ThoughtSectionReading(m)};}
async function generatedFixture(){const f=await fixture(),input=(await f.s.snapshot()).library.blocks[0];await f.s.enqueueOrganizer({operationId:op(),specs:[{inputId:input.id,role:'primary',selectedFields:['body']}]});await new OrganizerRunner(f.s,{providers:[new DeterministicFixtureProvider()]}).step();return {...f,input,a:(await rows(f.s,'topics'))[0],e:(await rows(f.s,'thoughts'))[0]};}
async function collect(r,options={}){const out=[],sections=new Map(),pages=[];let cursor=null;for(let n=0;n<2000;n++){const page=await r.page({...options,cursor});assert.equal(page.cursorInvalid,undefined);assert.equal(page.unavailable,undefined);assert.ok(page.items.length<=40);assert.ok(bytes(page)<=256*1024);out.push(...page.items);for(const row of page.sections)sections.set(row.sectionId,row);pages.push(page);if(!page.nextCursor){assert.equal(page.complete,true);return {items:out,sections:[...sections.values()],pages};}assert.equal(page.complete,false);cursor=page.nextCursor;}throw Error('reader never reached real end');}
async function persisted(s){return s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(s.repository.stores.map(async name=>[name,await t.all(name)]))));}

test('TOPIC-05.4 refuses foundation initialization and unsupported modes without body reads',async()=>{
 const s=new OrganizerStore(local(),{indexedDB:new IDBFactory()}),r=new ThoughtSectionReading(new ThoughtLibraryReadModel(s));
 assert.equal((await r.page({topicId:'synthetic'})).reason,'foundation_not_ready');assert.equal(s.repository.db,undefined);
 const f=await fixture(),a=await topic(f.s);await entry(f.s,a);f.s.readingEntry=()=>assert.fail('unsupported mode cannot hydrate prose');
 for(const mode of [{query:'unmounted lexical word',view:'ai'},{sort:'desc'},{timeEdge:'earliest'},{view:'ai'}]){const page=await f.r.page({topicId:a.id,...mode});assert.equal(page.unsupported,true);assert.equal(page.complete,false);assert.deepEqual(page.items,[]);}
 for(const options of [{limit:41},{limit:0},{sectionCursor:'unrelated'},{cursor:{}},{direction:'sideways'},{providerKey:' invalid provider '}])await assert.rejects(async()=>f.r.page({topicId:a.id,...options}),{code:'INVALID_REQUEST'});
 });

test('TOPIC-05.4 no named Sections means exact continuous prose and no invented default heading',async()=>{
 const {s,r}=await fixture(),a=await topic(s),one=await entry(s,a),two=await s.continueThinking({operationId:op(),topicId:a.id,body:'SYNTHETIC committed expression\n\nwith two paragraphs'});
 const page=await r.page({topicId:a.id});assert.deepEqual(page.items.map(x=>x.entry.id),[one.id,two.id]);assert.equal(page.complete,true);assert.equal(page.previousCursor,null);assert.equal(page.sections.length,1);
 assert.equal(page.sections[0].sectionId,a.sectionId);assert.equal(Object.hasOwn(page.sections[0],'id'),false);assert.equal(page.sections[0].isDefault,true);assert.equal(page.sections[0].title,'');assert.equal(page.sections[0].named,false);
 for(const {entry:e}of page.items){const canonical=await s.readingEntry(e.id);for(const [key,value]of Object.entries(canonical))assert.deepEqual(e[key],value);}
 assert.deepEqual(page.items[0].entry.expressionTime,{at:null,year:null,basis:'unknown'});assert.equal(page.items[0].entry.effectiveTime,null);assert.equal(page.items[1].entry.expressionTime.basis,'independent_creation');
 assert.equal(Object.hasOwn(page.topic,'summary'),false);assert.equal(Object.hasOwn(page.topic,'visibleEntryCount'),false);
});

test('TOPIC-05.4 durable Section order, empty named Sections and same-name identities survive forward/backward paging',async()=>{
 const {s,r}=await fixture(),a=await topic(s),early=await section(s,a,'SYNTHETIC shared name','100000000000'),empty=await section(s,a,'中文 empty 👩🏽‍💻','200000000000'),late=await section(s,a,'SYNTHETIC shared name','800000000000'),tail=await section(s,a,'SYNTHETIC empty tail','900000000000');
 const def=await entry(s,a),last=await entry(s,a,{sectionId:late.sectionId}),first=await entry(s,a,{sectionId:early.sectionId}),second=await entry(s,a,{sectionId:early.sectionId});
 const all=await collect(r,{topicId:a.id,limit:1});assert.deepEqual(all.items.map(x=>x.entry.id),[first.id,second.id,def.id,last.id]);assert.deepEqual(all.sections.map(x=>x.sectionId),[early.sectionId,empty.sectionId,a.sectionId,late.sectionId,tail.sectionId]);
 let page=await r.page({topicId:a.id,anchorId:last.id,limit:1}),back=[];assert.equal(page.items[0].entry.id,last.id);assert.ok(page.previousCursor);
 while(page.previousCursor){page=await r.page({topicId:a.id,cursor:page.previousCursor,direction:'prev',limit:1});back.unshift(...page.items.map(x=>x.entry.id));}
 assert.deepEqual(back,[first.id,second.id,def.id]);assert.equal(page.coverage.start,true);
 const emptyAnchor=await r.page({topicId:a.id,sectionId:empty.sectionId,limit:1});assert.equal(emptyAnchor.sections[0].sectionId,empty.sectionId);assert.equal(emptyAnchor.items[0].entry.id,def.id);
 const tailAnchor=await r.page({topicId:a.id,sectionId:tail.sectionId});assert.deepEqual(tailAnchor.items,[]);assert.deepEqual(tailAnchor.sections.map(x=>x.sectionId),[tail.sectionId]);assert.equal(tailAnchor.complete,true);assert.ok(tailAnchor.previousCursor);
});

test('TOPIC-05.4 hundreds of empty Sections continue honestly without synthesized bodies',async()=>{
 const {s,r}=await fixture(),a=await topic(s),expected=[a.sectionId];for(let n=0;n<205;n++)expected.push((await section(s,a,`SYNTHETIC empty ${n} ${'中文 '.repeat(30)}`)).sectionId);
 let reads=0;const original=s.readingEntry;s.readingEntry=function(...args){reads++;return original.apply(this,args);};
 const all=await collect(r,{topicId:a.id});assert.deepEqual(all.sections.map(x=>x.sectionId),expected);assert.deepEqual(all.items,[]);assert.equal(reads,0);assert.equal(all.pages.length,3);assert.ok(all.pages.slice(0,-1).every(p=>p.complete===false&&p.nextCursor));assert.ok(all.pages.every(p=>p.operations.sectionStarts<=100));
});

test('TOPIC-05.4 shared placement uses one body owner and current whole-Input binding with safe independent detach',async()=>{
 const {s,r}=await fixture(),a=await topic(s),b=await topic(s),input=(await s.snapshot()).library.blocks[0],added=await s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:input.revision,topicIds:[a.id,b.id]});
 let pa=await r.page({topicId:a.id,trackedEntryIds:[added.id]}),pb=await r.page({topicId:b.id});assert.deepEqual(pa.items[0].entry,pb.items[0].entry);assert.equal(pa.items[0].entry.bodyBinding,'input');assert.equal(pa.items[0].entry.workingInputId,input.id);assert.equal(pa.tracked[0].currentInputRevision,pa.items[0].entry.currentInputRevision);
 await inputEdit(s,input.id,{libraryText:'SYNTHETIC newly edited whole Input\n\nexact remaining text'});
 pa=await r.page({topicId:a.id});assert.deepEqual(pa.items[0].entry.body,(await s.readingEntry(added.id)).body);assert.equal(pa.items[0].entry.bodyBinding,'input');assert.equal(pa.items[0].entry.bindingRevision,(await raw(s,'inputStates',input.id)).contentRevision);
 const current=await s.entry(added.id);await s.editEntry({id:added.id,operationId:op(),expectedRevision:current.revision,expectedInputRevision:current.currentInputRevision,changes:{body:'SYNTHETIC independent human Thought'}});
 pa=await r.page({topicId:a.id});pb=await r.page({topicId:b.id});assert.equal(pa.items[0].entry.bodyBinding,'thought');assert.equal(pb.items[0].entry.body,'SYNTHETIC independent human Thought');assert.equal((await s.input(input.id)).libraryText,'SYNTHETIC newly edited whole Input\n\nexact remaining text');assert.equal((await rows(s,'thoughts')).length,1);
});

test('TOPIC-05.4 stale dependency revisions and excluded supporting Inputs use canonical local-body semantics',async()=>{
 const {s,r}=await fixture(),a=await topic(s);await s.capture(capture((await s.status()).epoch,'synthetic-second','SYNTHETIC second Input'));
 const [first,second]=(await s.snapshot()).library.blocks,evidence=await s.evidenceFor([{inputId:first.id,role:'primary',selectedFields:['body']},{inputId:second.id,role:'supporting',selectedFields:['body']}]),e=await derived(s,[first.id,second.id],{evidence});await place(s,e,a);
 await inputEdit(s,first.id,{libraryText:'SYNTHETIC changed evidence'});await s.excludeLibrary(second.id,true);
 const canonical=await s.readingEntry(e.id),page=await r.page({topicId:a.id});assert.equal(canonical.freshness,'stale');assert.equal(canonical.integrity,'partial');assert.equal(page.items[0].entry.freshness,canonical.freshness);assert.equal(page.items[0].entry.integrity,canonical.integrity);assert.equal(page.items[0].entry.body,canonical.body);
 await s.excludeLibrary(first.id,true);const detached=await s.readingEntry(e.id),after=await r.page({topicId:a.id});assert.equal(detached.lifecycle,'active','explicit human placement retains existing work');assert.equal(after.items[0].entry.body,detached.body);assert.equal(after.items[0].entry.integrity,'detached');
});

test('TOPIC-05.4 generated labels and untouched AI bodies fail closed after exclusion or purge',async()=>{
 for(const removal of ['exclude','purge']){
  const {s,r,a,e,input}=await generatedFixture(),oldName=a.name,oldSections=(await r.page({topicId:a.id})).sections.map(x=>x.title).filter(Boolean);
  const generation=(await r.page({topicId:a.id})).coverage.activeGeneration;
  if(removal==='exclude')await s.excludeLibrary(input.id,true);else await s.permanentDelete(input.sourceRecordId);
  assert.equal((await r.page({topicId:a.id,anchorId:e.id,expectedReadGeneration:generation})).cursorInvalid,true);
  const page=await r.page({topicId:a.id,trackedEntryIds:[e.id]});assert.deepEqual(page.items,[]);assert.ok(!JSON.stringify(page).includes(oldName));for(const title of oldSections)assert.ok(!JSON.stringify(page).includes(title));assert.equal(page.topic.sourceUnavailable,true);assert.equal(page.tracked[0].lifecycle,'invalidated');
 }
});

test('TOPIC-05.4 excluded backing Inputs cannot leak generated Section titles through a protected human Topic',async()=>{
 const {s,r}=await fixture(),a=await topic(s,'SYNTHETIC protected Topic'),input=(await s.snapshot()).library.blocks[0],generated=await section(s,a,'SYNTHETIC PRIVATE GENERATED LABEL'),human=await section(s,a,'SYNTHETIC protected Section'),independent=await entry(s,a);
 await s.foundationWrite(async t=>{for(const item of [generated,human]){const row=await t.get('sections',JSON.stringify([a.id,1,item.sectionId]));row.sourceRecordIds=[input.sourceRecordId];if(item===generated)row.protections.title.locked=false;await t.put('sections',row);}});
 await s.excludeLibrary(input.id,true);const page=await r.page({topicId:a.id});assert.deepEqual(page.items.map(x=>x.entry.id),[independent.id]);assert.ok(!JSON.stringify(page).includes('PRIVATE GENERATED LABEL'));assert.equal(page.topic.name,'SYNTHETIC protected Topic');assert.equal(page.sections.find(x=>x.sectionId===human.sectionId).title,'SYNTHETIC protected Section');assert.equal(page.sections.find(x=>x.sectionId===generated.sectionId).sourceUnavailable,true);assert.equal((await raw(s,'sections',JSON.stringify([a.id,1,generated.sectionId]))).title,'SYNTHETIC PRIVATE GENERATED LABEL');
});

test('TOPIC-05.4 Smart Filter qualifies generated labels without redefining persisted local Thought readability or grants',async()=>{
 const {s,r}=await fixture(),a=await topic(s),request=capture((await s.status()).epoch,'synthetic-filtered','继续');request.messages[0].presence={version:1,attachment:'absent',reference:'absent',confidence:'verified'};await s.capture(request);
 const block=(await s.snapshot()).library.blocks.at(-1),e=await derived(s,[block.id]),named=await section(s,a,'SYNTHETIC FILTERED GENERATED TITLE');await place(s,e,a,{sectionId:named.sectionId});
 await s.foundationWrite(async t=>{const row=await t.get('sections',JSON.stringify([a.id,1,named.sectionId]));row.sourceRecordIds=[block.sourceRecordId];row.protections.title.locked=false;await t.put('sections',row);});
 await s.evaluateFilters();assert.equal((await s.inputEligibility(block.id)).eligible,false);
 const canonical=await s.readingEntry(e.id),page=await r.page({topicId:a.id});assert.equal(canonical.lifecycle,'active');assert.equal(page.items[0].entry.body,canonical.body);assert.equal(page.sections.find(x=>x.sectionId===named.sectionId).title,'');assert.equal(page.sections.find(x=>x.sectionId===named.sectionId).sourceUnavailable,true);
 assert.equal(Object.hasOwn(page,'processingAllowed'),false);assert.equal(Object.hasOwn(page,'externalAccess'),false);
});

test('TOPIC-05.4 provider scopes reuse direct current provenance and cannot widen cursor or anchor scope',async()=>{
 const {s,r}=await fixture(),a=await topic(s),input=(await s.snapshot()).library.blocks[0],added=await s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:input.revision,topicIds:[a.id]}),independent=await entry(s,a);
 const all=await collect(r,{topicId:a.id,providerKey:'chatgpt',limit:1});assert.deepEqual(all.items.map(x=>x.entry.id),[added.id]);assert.equal((await r.page({topicId:a.id,providerKey:'chatgpt',anchorId:independent.id})).anchorUnavailable,true);
 const page=await r.page({topicId:a.id,limit:1});assert.equal((await r.page({topicId:a.id,cursor:page.nextCursor,providerKey:'chatgpt'})).cursorInvalid,true);
});

test('TOPIC-05.4 opaque cursor generations reject edits, restore, removed Topics and layout changes',async()=>{
 for(const change of ['edit','restore','remove','layout','filter']){
  const {s,r}=await fixture(),a=await topic(s),one=await entry(s,a);await entry(s,a);const first=await r.page({topicId:a.id,limit:1});assert.match(first.nextCursor,/^[a-f0-9-]{36}$/);
  if(change==='edit')await s.editEntry({id:one.id,expectedRevision:(await s.entry(one.id)).revision,operationId:op(),changes:{body:'SYNTHETIC new revision'}});
  else if(change==='restore')await s.foundationWrite(t=>t.put('meta',{id:'recovery-restore-epoch',value:op()}));
  else if(change==='remove')await s.removeTopic({id:a.id,expectedRevision:(await s.topic(a.id)).revision,operationId:op()});
  else if(change==='filter')await s.setFilterMode('off');
  else await s.foundationWrite(async t=>{const row=await t.get('topics',a.id);row.activeLayoutGeneration++;await t.put('topics',row);});
  const stale=await r.page({topicId:a.id,cursor:first.nextCursor});assert.equal(stale.cursorInvalid,true);assert.deepEqual(stale.items,[]);assert.equal(stale.complete,false);
  assert.equal((await r.page({topicId:a.id,anchorId:one.id,expectedReadGeneration:first.coverage.activeGeneration})).cursorInvalid,true);
 }
});

test('TOPIC-05.4 final consent/authority fences reject concurrent edits and purge after body resolution',async()=>{
 for(const change of ['edit','purge']){
  const {s,r,a,e,input}=await generatedFixture(),get=s.local.get.bind(s.local);let reads=0;
  s.local.get=async key=>{if(key===STORAGE_KEY&&++reads===2){if(change==='purge')await s.permanentDelete(input.sourceRecordId);else await s.editEntry({id:e.id,expectedRevision:(await s.entry(e.id)).revision,operationId:op(),changes:{body:'SYNTHETIC newer human body'}});}return get(key);};
  try{const page=await r.page({topicId:a.id});assert.equal(page.cursorInvalid,true);assert.deepEqual(page.items,[]);assert.equal(page.complete,false);}finally{s.local.get=get;}
 }
});

test('TOPIC-05.4 large bodies use existing explicit large placeholder and byte-limited pages never lose prose',async()=>{
 const {s,r}=await fixture(),a=await topic(s),expected=[];for(let n=0;n<7;n++)expected.push((await entry(s,a,{body:'中文'.repeat(n===3?28000:12000)})).id);
 const all=await collect(r,{topicId:a.id});assert.deepEqual(all.items.map(x=>x.entry.id),expected);assert.ok(all.pages.length>1);assert.equal(all.items[3].entry.large,true);assert.equal(Object.hasOwn(all.items[3].entry,'body'),false);assert.ok(all.items[3].entry.bodyBytes>128*1024);
 for(const {entry:e}of all.items)if(!e.large)assert.equal(e.body,'中文'.repeat(12000));
 let page=await r.page({topicId:a.id,direction:'prev'}),reverse=[...page.items];while(page.previousCursor){page=await r.page({topicId:a.id,cursor:page.previousCursor,direction:'prev'});reverse.unshift(...page.items);}assert.deepEqual(reverse.map(x=>x.entry.id),expected);
});

test('TOPIC-05.4 actual ContinuousTopicReader reaches 1001 Entries with <=40 hydrations and 120 clean retained bodies',async()=>{
 const {s,r}=await fixture(),a=await topic(s),expected=[];for(let n=0;n<1001;n++)expected.push((await s.continueThinking({operationId:op(),topicId:a.id,body:`SYNTHETIC expression ${n}\n\n中文 paragraph ${n}`})).id);
 let maxHydrated=0,maxRetained=0;const pins=new Set(),reader=new ContinuousTopicReader({pins:()=>pins,load:async options=>{const page=await r.page(options);maxHydrated=Math.max(maxHydrated,page.operations?.hydratedEntries||0);return page;}});reader.reset({topicId:a.id});await reader.initial();pins.add(expected[0]);
 while(!reader.terminalNext){const state=await reader.next();assert.equal(state.errorNext,null);assert.equal(state.stale,false);maxRetained=Math.max(maxRetained,reader.items.filter(x=>!x.unloaded&&!pins.has(x.entry.id)).length);}
 assert.deepEqual(reader.items.map(x=>x.entry.id),expected);assert.ok(maxHydrated<=40);assert.ok(maxRetained<=120);assert.equal(reader.items[0].unloaded,undefined,'dirty/IME pin remains hydrated');
 reader.moveWindowAround(expected[420]);assert.equal(await reader.hydrateWindow(),true);assert.equal(reader.items[420].entry.body,'SYNTHETIC expression 420\n\n中文 paragraph 420');assert.equal(reader.stale,false);
 const saved=reader.snapshot({id:expected[420],top:143}),restored=new ContinuousTopicReader({load:options=>r.page(options)});restored.reset({topicId:a.id});assert.equal(restored.restore(saved),true);assert.equal(await restored.hydrateWindow(),true);assert.equal(restored.stale,false);assert.ok(restored.items.filter(x=>!x.unloaded).length<=120);
});

test('TOPIC-05.4 every completed read is readonly after foundation, with no provider or chronology maintenance',async()=>{
 const {s,r}=await fixture(),a=await topic(s);await section(s,a,'SYNTHETIC named');const e=await entry(s,a);const before=await persisted(s),writes=s.repository.metrics.writes,transaction=s.repository.transaction.bind(s.repository),fetch=globalThis.fetch;
 s.repository.transaction=(write,...args)=>{assert.equal(write,false,'reader cannot enter a write transaction');return transaction(write,...args);};s.finishFoundation=()=>assert.fail('the reader cannot initialize or maintain foundation');s.topicDocumentPage=()=>assert.fail('the reader cannot trigger chronology maintenance');globalThis.fetch=()=>assert.fail('no network');
 try{const page=await r.page({topicId:a.id,trackedEntryIds:[e.id,'synthetic-missing']});assert.equal(page.tracked[0].revision,page.items[0].entry.revision);assert.deepEqual(page.tracked[1],{id:'synthetic-missing',lifecycle:'unavailable',purged:true});await r.page({topicId:a.id,anchorId:e.id,expectedReadGeneration:page.coverage.activeGeneration});}finally{s.repository.transaction=transaction;globalThis.fetch=fetch;}
 assert.equal(s.repository.metrics.writes,writes);assert.deepEqual(await persisted(s),before);
});

test('TOPIC-05.4 Unicode cursors bind Topic/provider/direction and expire or replay without retaining bodies',async()=>{
 const {s,m,r}=await fixture();let sequence=0;s.uuid=()=>`SYNTHETIC 中文 👩🏽‍💻 ${++sequence}`;
 const a=await topic(s),b=await topic(s);const expected=[];for(let n=0;n<4;n++)expected.push((await entry(s,a)).id);
 const first=await r.page({topicId:a.id,limit:1}),second=await r.page({topicId:a.id,limit:1,cursor:first.nextCursor});assert.deepEqual(second.items.map(x=>x.entry.id),[expected[1]]);assert.equal(second.coverage.activeGeneration,first.coverage.activeGeneration);assert.match(first.coverage.activeGeneration,/^[a-f0-9-]{36}$/);assert.ok(!first.nextCursor.includes('中文'));
 assert.deepEqual((await r.page({topicId:a.id,cursor:first.nextCursor,limit:1})).items,second.items);
 for(const options of [{topicId:b.id},{direction:'prev'},{providerKey:'chatgpt'}])assert.equal((await r.page({topicId:a.id,cursor:first.nextCursor,...options})).cursorInvalid,true);
 assert.equal((await new ThoughtSectionReading(new ThoughtLibraryReadModel(s)).page({topicId:a.id,cursor:first.nextCursor})).cursorInvalid,true);
 assert.equal((await r.page({topicId:a.id,cursor:op()})).cursorInvalid,true);
 assert.equal((await r.page({topicId:a.id,anchorId:'SYNTHETIC deleted'})).anchorUnavailable,true);assert.equal((await r.page({topicId:a.id,sectionId:'SYNTHETIC deleted'})).anchorUnavailable,true);
 for(let n=0;n<130;n++)await r.page({topicId:a.id,limit:1});assert.ok([...m.cursors.values()].filter(x=>x.kind==='section_reading').length<=128);assert.equal((await r.page({topicId:a.id,cursor:first.nextCursor})).cursorInvalid,true);
 assert.ok(!JSON.stringify([...m.cursors.values()]).includes('Second paragraph'));assert.ok(!JSON.stringify([...r.generations]).includes('exact prose'));
});

test('TOPIC-05.4 removed/excluded Placement gaps remain partial and cannot create a pagination dead end',async()=>{
 const {s,r}=await fixture(),a=await topic(s),expected=[];for(let n=0;n<6;n++)expected.push(await entry(s,a));
 await place(s,expected[0],a,{remove:true});await s.removeEntry({id:expected[1].id,expectedRevision:(await s.entry(expected[1].id)).revision,operationId:op()});
 await s.foundationWrite(async t=>{for(const e of expected.slice(2,5)){const p=await t.get('placements',JSON.stringify([a.id,1,e.id]));p.excludedByUser=true;await t.put('placements',p);}});
 const all=await collect(r,{topicId:a.id,limit:1});assert.deepEqual(all.items.map(x=>x.entry.id),[expected[5].id]);assert.ok(all.pages.some(p=>p.items.length===0&&p.complete===false&&p.nextCursor));assert.equal((await r.page({topicId:a.id,anchorId:expected[3].id})).anchorUnavailable,true);
});

test('TOPIC-05.4 continuation failure retries the exact boundary; background additions invalidate saved hydration',async()=>{
 const {s,r}=await fixture(),a=await topic(s),expected=[];for(let n=0;n<5;n++)expected.push((await entry(s,a)).id);
 const reader=new ContinuousTopicReader({load:options=>r.page({...options,limit:2})});reader.reset({topicId:a.id});await reader.initial();const cursor=reader.nextCursor,original=s.readingEntry;let failOnce=true;
 s.readingEntry=function(...args){if(failOnce){failOnce=false;throw Error('SYNTHETIC retryable read failure');}return original.apply(this,args);};
 await reader.next();assert.equal(reader.errorNext?.message,'SYNTHETIC retryable read failure');assert.equal(reader.nextCursor,cursor);assert.deepEqual(reader.items.map(x=>x.entry.id),expected.slice(0,2));
 while(!reader.terminalNext)await reader.next();assert.equal(reader.errorNext,null);assert.deepEqual(reader.items.map(x=>x.entry.id),expected);
 const saved=reader.snapshot({id:expected[2],top:149});await entry(s,a);const restored=new ContinuousTopicReader({load:options=>r.page(options)});restored.reset({topicId:a.id});assert.equal(restored.restore(saved),true);assert.equal(await restored.hydrateWindow(),false);assert.equal(restored.stale,true);assert.ok(restored.items.every(x=>x.unloaded));
});

test('TOPIC-05.4 carries existing recovery epoch and refuses final consent revocation',async()=>{
 const {s,r}=await fixture(),a=await topic(s);await entry(s,a);const first=await r.page({topicId:a.id});assert.equal(first.recoveryEpoch,await s.recoveryDraftEpoch());
 const epoch=op();await s.foundationWrite(t=>t.put('meta',{id:'recovery-restore-epoch',value:epoch}));const next=await r.page({topicId:a.id});assert.equal(next.recoveryEpoch,epoch);assert.notEqual(next.coverage.activeGeneration,first.coverage.activeGeneration);
 const get=s.local.get.bind(s.local);let calls=0;s.local.get=async key=>{const result=await get(key);if(key===STORAGE_KEY&&++calls===2)result[STORAGE_KEY].settings.consentVersion=null;return result;};
 try{await assert.rejects(r.page({topicId:a.id}),{code:'CONSENT_REQUIRED'});}finally{s.local.get=get;}
});

test('TOPIC-05.4 lexical queries qualify generated Sections independently of protected Topics and preserve real body matches',async()=>{
 for(const removal of ['exclude','filter','purge']){
  const {s,r,a,input}=await generatedFixture();
  // Purge while this fixture has no human-linked dependency; B-02 remains gated.
  if(removal==='purge')await s.permanentDelete(input.sourceRecordId);
  await s.editTopic({id:a.id,expectedRevision:(await s.topic(a.id)).revision,changes:{name:'SYNTHETIC human Topic'},operationId:op()});
  const generated=(await rows(s,'sections')).find(x=>x.title==='Observations'),human=await section(s,a,'SYNTHETIC human Observations');
  const falseMatch=await entry(s,a,{sectionId:generated.sectionId,body:'SYNTHETIC unrelated independent prose'}),trueMatch=await entry(s,a,{sectionId:generated.sectionId,body:'SYNTHETIC literal Observations body\n\n中文 👩🏽‍💻'}),humanMatch=await entry(s,a,{sectionId:human.sectionId,body:'SYNTHETIC human-labelled prose'});
  await section(s,a,'SYNTHETIC unrelated overview must stay absent');
  if(removal==='exclude')await s.excludeLibrary(input.id,true);
  else if(removal==='filter'){const request=capture((await s.status()).epoch,'synthetic-query-filter','继续');request.messages[0].presence={version:1,attachment:'absent',reference:'absent',confidence:'verified'};await s.capture(request);const backing=(await s.snapshot()).library.blocks.at(-1);await s.foundationWrite(async t=>{const row=await t.get('sections',generated.id);row.sourceRecordIds=[backing.sourceRecordId];await t.put('sections',row);});await s.evaluateFilters();assert.equal((await s.inputEligibility(backing.id)).eligible,false);}
  const all=await collect(r,{topicId:a.id,query:'Observations',limit:1});
  assert.ok(!all.items.some(x=>x.entry.id===falseMatch.id));assert.ok(all.items.some(x=>x.entry.id===trueMatch.id));assert.ok(all.items.some(x=>x.entry.id===humanMatch.id));
  assert.equal(all.items.find(x=>x.entry.id===trueMatch.id).entry.body,(await s.readingEntry(trueMatch.id)).body);
  assert.equal(all.sections.find(x=>x.sectionId===generated.sectionId).title,'');assert.equal(all.sections.find(x=>x.sectionId===human.sectionId).title,'SYNTHETIC human Observations');
  for(const page of all.pages){assert.equal(page.topic.name,'SYNTHETIC human Topic');assert.equal(Object.hasOwn(page,'overview'),false);assert.equal(Object.hasOwn(page,'matchCount'),false);assert.equal(Object.hasOwn(page.coverage,'activeCount'),false);assert.ok(page.sections.every(row=>page.items.some(item=>item.placement.sectionId===row.sectionId)));assert.ok(!JSON.stringify(page).includes('overview must stay absent'));}
  assert.ok(all.pages.some(page=>!page.items.length));
 }
});

test('TOPIC-05.4 lexical query preserves bounded genuine gaps, reverse cursors, Unicode matches and large placeholders',async()=>{
 const {s,r,m}=await fixture(),a=await topic(s),expected=[];
 for(let n=0;n<45;n++)expected.push(await entry(s,a,{body:n===44?'中文'.repeat(28000)+' SYNTHETIC ＭＡＴＣＨ':n%3===0?`SYNTHETIC MATCH ${n}`:`SYNTHETIC unrelated ${n}`}));
 await s.foundationWrite(async t=>{const p=await t.get('placements',JSON.stringify([a.id,1,expected[3].id]));p.excludedByUser=true;await t.put('placements',p);});
 const all=await collect(r,{topicId:a.id,query:'match',limit:2}),ids=all.items.map(x=>x.entry.id),wanted=expected.filter((_,n)=>n===44||n%3===0&&n!==3).map(e=>e.id);
 assert.deepEqual(new Set(ids),new Set(wanted));assert.ok(all.pages.some(p=>!p.items.length&&p.nextCursor));assert.ok(all.pages.every(p=>p.operations.hydratedEntries<=2));assert.equal(all.items.find(x=>x.entry.id===expected[44].id).entry.large,true);
 let page=all.pages.at(-1),back=[...page.items];while(page.previousCursor){page=await r.page({topicId:a.id,query:'match',limit:2,direction:'prev',cursor:page.previousCursor});assert.equal(page.cursorInvalid,undefined);back.unshift(...page.items);}
 assert.deepEqual(back.map(x=>x.entry.id),ids);
 const first=all.pages[0];for(const options of [{query:'different'},{providerKey:'chatgpt'},{direction:'prev'}])assert.equal((await r.page({topicId:a.id,query:'match',cursor:first.nextCursor,...options})).cursorInvalid,true);
 assert.equal((await r.page({topicId:a.id,query:'match',anchorId:expected[3].id})).anchorUnavailable,true);
 assert.ok(!JSON.stringify([...m.cursors.values()]).includes('SYNTHETIC unrelated'));
});

test('TOPIC-05.4 lexical query fences rename, canonical body edits, restore, purge and consent after resolution',async()=>{
 for(const change of ['rename','edit','restore','purge','consent','generation']){
  const {s,r,a,e,input}=await generatedFixture(),original=s.topicDocumentPage;
  s.topicDocumentPage=async function(options){
   const page=await original.call(this,options);
   if(change==='rename')await s.editTopic({id:a.id,expectedRevision:(await s.topic(a.id)).revision,changes:{name:'SYNTHETIC newer name'},operationId:op()});
   else if(change==='edit')await s.editEntry({id:e.id,expectedRevision:(await s.entry(e.id)).revision,operationId:op(),changes:{body:'SYNTHETIC newer human body'}});
   else if(change==='restore')await s.foundationWrite(t=>t.put('meta',{id:'recovery-restore-epoch',value:op()}));
   else if(change==='purge')await s.permanentDelete(input.sourceRecordId);
   else if(change==='consent'){const saved=await s.local.get(STORAGE_KEY);saved[STORAGE_KEY].settings.consentVersion=null;await s.local.set(saved);}
   else await s.foundationWrite(async t=>{const value=await t.get('meta','thought-read-index:v1:topic:'+a.id);value.activeGeneration=op();await t.put('meta',value);});
   return page;
  };
  if(change==='consent')await assert.rejects(r.page({topicId:a.id,query:'Synthetic'}),{code:'CONSENT_REQUIRED'});
  else{const page=await r.page({topicId:a.id,query:'Synthetic'});assert.equal(page.cursorInvalid,true,change);assert.deepEqual(page.items,[]);assert.equal(page.complete,false);}
 }
});

test('TOPIC-05.4 lexical query refuses body revision drift even without an authority-counter change',async()=>{
 const {s,r}=await fixture(),a=await topic(s),e=await entry(s,a),original=s.topicDocumentPage;
 s.topicDocumentPage=async function(options){const page=await original.call(this,options);await s.foundationWrite(async t=>{const row=await t.get('thoughts',e.id);row.contentRevision++;await t.put('thoughts',row);});return page;};
 const page=await r.page({topicId:a.id,query:'SYNTHETIC'});assert.equal(page.cursorInvalid,true);assert.deepEqual(page.items,[]);
});

test('TOPIC-05.4 lexical query final consent fence catches changes after qualification and preserves canonical Input bodies',async()=>{
 const {s,r,m}=await fixture(),a=await topic(s),input=(await s.snapshot()).library.blocks[0],added=await s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:input.revision,topicIds:[a.id]});
 await inputEdit(s,input.id,{libraryText:'SYNTHETIC changed bound Input MATCH'});
 const before=await r.page({topicId:a.id,query:'match'});assert.equal(before.items[0].entry.id,added.id);assert.equal(before.items[0].entry.body,(await s.readingEntry(added.id)).body);
 const consent=m.consent.bind(m);let calls=0;m.consent=async()=>{if(++calls===2)await s.editTopic({id:a.id,expectedRevision:(await s.topic(a.id)).revision,changes:{name:'SYNTHETIC final rename'},operationId:op()});return consent();};
 try{const page=await r.page({topicId:a.id,query:'match'});assert.equal(page.cursorInvalid,true);assert.deepEqual(page.items,[]);}finally{m.consent=consent;}
});

test('TOPIC-05.4 editor metadata qualifies generated name and summary independently without rewriting canonical fields or CAS',async()=>{
 for(const protectedField of ['name','summary']){
  const {s,m,a,input}=await generatedFixture();
  await s.foundationWrite(async t=>{const row=await t.get('topics',a.id);row.summary='SYNTHETIC generated summary';await t.put('topics',row);});
  await s.editTopic({id:a.id,expectedRevision:(await s.topic(a.id)).revision,changes:{[protectedField]:'SYNTHETIC human '+protectedField},operationId:op()});
  await s.excludeLibrary(input.id,true);const canonical=await raw(s,'topics',a.id),before=await persisted(s),transaction=s.repository.transaction.bind(s.repository);
  s.repository.transaction=(write,...args)=>{assert.equal(write,false,'metadata projection is read-only');return transaction(write,...args);};
  let safe;try{safe=await m.topicReadingMetadata({id:a.id});}finally{s.repository.transaction=transaction;}
  assert.deepEqual(await persisted(s),before);assert.equal(safe.id,a.id);assert.equal(safe.revision,canonical.revision);assert.equal(safe.defaultSectionId,canonical.defaultSectionId);assert.equal(safe.recoveryEpoch,await s.recoveryDraftEpoch());assert.equal(safe[protectedField],canonical[protectedField]);
  if(protectedField==='name')assert.equal(safe.summary,'');else assert.notEqual(safe.name,canonical.name);
  for(const field of ['body','sourceRecordIds','protections','visibleEntryCount','readingStructure'])assert.equal(Object.hasOwn(safe,field),false);
  const result=await s.editTopic({id:a.id,expectedRevision:safe.revision,changes:{name:'SYNTHETIC explicit rename'},operationId:op()});assert.equal(result.conflict,undefined);assert.equal((await raw(s,'topics',a.id)).summary,canonical.summary,'saving only name never persists sanitized summary');
  assert.equal((await s.editTopic({id:a.id,expectedRevision:safe.revision,changes:{summary:'SYNTHETIC stale edit'},operationId:op()})).conflict,true);
 }
});

test('TOPIC-05.4 editor metadata suppresses generated summaries under human-created Topics after filter or missing evidence',async()=>{
 for(const change of ['filter','no_evidence']){
  const {s,m}=await fixture(),a=await topic(s,'SYNTHETIC authored name');
  const request=capture((await s.status()).epoch,'synthetic-summary-filter','继续');request.messages[0].presence={version:1,attachment:'absent',reference:'absent',confidence:'verified'};await s.capture(request);const input=(await s.snapshot()).library.blocks.at(-1);
  await s.foundationWrite(async t=>{const row=await t.get('topics',a.id);row.summary='SYNTHETIC generated note';row.sourceRecordIds=change==='no_evidence'?[]:[input.sourceRecordId];row.protections.summary={locked:false};await t.put('topics',row);});
  if(change==='filter'){await s.evaluateFilters();assert.equal((await s.inputEligibility(input.id)).eligible,false);}
  const safe=await m.topicReadingMetadata({id:a.id});assert.equal(safe.name,'SYNTHETIC authored name');assert.equal(safe.summary,'');assert.equal((await raw(s,'topics',a.id)).summary,'SYNTHETIC generated note');
 }
 const {s,m,a,input}=await generatedFixture();
 await s.foundationWrite(async t=>{const row=await t.get('topics',a.id);row.summary='SYNTHETIC purged generated note';await t.put('topics',row);});
 await s.permanentDelete(input.sourceRecordId);
 await s.editTopic({id:a.id,expectedRevision:(await raw(s,'topics',a.id)).revision,changes:{name:'SYNTHETIC human name after purge'},operationId:op()});
 const before=await persisted(s),safe=await m.topicReadingMetadata({id:a.id});assert.equal(safe.name,'SYNTHETIC human name after purge');assert.equal(safe.summary,'');assert.deepEqual(await persisted(s),before);
});

test('TOPIC-05.4 editor metadata refuses invalid shapes, removed or redirected Topics and malformed field payloads',async()=>{
 const {s,m}=await fixture(),a=await topic(s),b=await topic(s,'SYNTHETIC second Topic');
 for(const options of [undefined,{}, {id:''},{id:a.id,summary:'injected'},{id:null},null,[]])assert.throws(()=>m.topicReadingMetadata(options),{code:'INVALID_REQUEST'});
 await s.removeTopic({id:a.id,expectedRevision:(await s.topic(a.id)).revision,operationId:op()});
 await s.foundationWrite(async t=>{const row=await t.get('topics',b.id);row.redirectTo=a.id;await t.put('topics',row);});
 for(const id of [a.id,b.id,'synthetic-missing']){const refused=await m.topicReadingMetadata({id});assert.equal(refused.unavailable,true);for(const field of ['name','summary','topic','id'])assert.equal(Object.hasOwn(refused,field),false);}
 const c=await topic(s,'SYNTHETIC malformed');await s.foundationWrite(async t=>{const row=await t.get('topics',c.id);row.summary={body:'SYNTHETIC smuggled body'};await t.put('topics',row);});await assert.rejects(m.topicReadingMetadata({id:c.id}));
});

test('TOPIC-05.4 editor metadata final fence rejects rename, restore and consent races',async()=>{
 for(const change of ['rename','restore','consent']){
  const {s,m}=await fixture(),a=await topic(s),get=s.local.get.bind(s.local);let calls=0;
  s.local.get=async key=>{if(key===STORAGE_KEY&&++calls===2){if(change==='rename')await s.editTopic({id:a.id,expectedRevision:(await s.topic(a.id)).revision,changes:{name:'SYNTHETIC concurrent name'},operationId:op()});else if(change==='restore')await s.foundationWrite(t=>t.put('meta',{id:'recovery-restore-epoch',value:op()}));else{const value=await get(key);value[key].settings.consentVersion=null;return value;}}return get(key);};
  try{if(change==='consent')await assert.rejects(m.topicReadingMetadata({id:a.id}),{code:'CONSENT_REQUIRED'});else{const result=await m.topicReadingMetadata({id:a.id});assert.equal(result.cursorInvalid,true);assert.equal(Object.hasOwn(result,'name'),false);assert.equal(Object.hasOwn(result,'summary'),false);}}finally{s.local.get=get;}
 }
});

test('TOPIC-05.4 query generations bind authority and cannot be reused after rename, restore, filters or across ordinary reading',async()=>{
 for(const change of ['rename','restore','filter']){
  const {s,r}=await fixture(),a=await topic(s);await entry(s,a);await entry(s,a);
  const first=await r.page({topicId:a.id,query:'SYNTHETIC',limit:1});assert.ok(first.nextCursor);
  if(change==='rename')await s.editTopic({id:a.id,expectedRevision:(await s.topic(a.id)).revision,changes:{name:'SYNTHETIC changed label'},operationId:op()});
  else if(change==='restore')await s.foundationWrite(t=>t.put('meta',{id:'recovery-restore-epoch',value:op()}));
  else await s.setFilterMode('off');
  assert.equal((await r.page({topicId:a.id,query:'SYNTHETIC',cursor:first.nextCursor})).cursorInvalid,true);
  assert.equal((await r.page({topicId:a.id,query:'SYNTHETIC',expectedReadGeneration:first.coverage.activeGeneration})).cursorInvalid,true);
  const fresh=await r.page({topicId:a.id,query:'SYNTHETIC',limit:1}),ordinary=await r.page({topicId:a.id,limit:1});assert.notEqual(fresh.coverage.activeGeneration,ordinary.coverage.activeGeneration);
  assert.equal((await r.page({topicId:a.id,query:'SYNTHETIC',cursor:ordinary.nextCursor})).cursorInvalid,true);assert.equal((await r.page({topicId:a.id,cursor:fresh.nextCursor})).cursorInvalid,true);
  assert.equal((await r.page({topicId:a.id,query:'SYNTHETIC',expectedReadGeneration:ordinary.coverage.activeGeneration})).cursorInvalid,true);
 }
});

test('TOPIC-05.4 query allows only the existing descriptor index maintenance and no chronology, canonical, AI or network writes',async()=>{
 const {s,r}=await fixture(),a=await topic(s);await section(s,a,'SYNTHETIC named');await entry(s,a);
 const before=await persisted(s),fetch=globalThis.fetch;globalThis.fetch=()=>assert.fail('no network');
 try{const page=await r.page({topicId:a.id,query:'SYNTHETIC'});assert.equal(page.complete,true);assert.equal(page.items.length,1);}finally{globalThis.fetch=fetch;}
 const after=await persisted(s),strip=value=>Object.fromEntries(Object.entries(value).map(([name,data])=>[name,name==='libraryMigrationItems'?data.filter(row=>!row.id.startsWith('thought-topic:')&&!row.id.startsWith('thought-expression:')):name==='meta'?data.filter(row=>!row.id.startsWith('thought-read-index:v1:topic:')):data]));
 assert.deepEqual(strip(after),strip(before));assert.equal(after.meta.some(row=>row.id.startsWith('topicChronology:')),false);
});

test('TOPIC-05.4 query final transaction rejects descriptor generation replacement during final consent',async()=>{
 const {s,r,m}=await fixture(),a=await topic(s);await entry(s,a);await r.page({topicId:a.id,query:'SYNTHETIC'});
 const consent=m.consent.bind(m);let calls=0;m.consent=async()=>{if(++calls===2)await s.foundationWrite(async t=>{const row=await t.get('meta','thought-read-index:v1:topic:'+a.id);row.activeGeneration=op();await t.put('meta',row);});return consent();};
 try{const page=await r.page({topicId:a.id,query:'SYNTHETIC'});assert.equal(page.cursorInvalid,true);assert.deepEqual(page.items,[]);assert.equal(page.complete,false);}finally{m.consent=consent;}
});
