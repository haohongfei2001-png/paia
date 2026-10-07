import test from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from './vendor/fake-indexeddb/build/esm/index.js';
import {setup,local,capture,derived,inputEdit} from './harness/thought-m1.mjs';
import {STORAGE_KEY} from '../core/constants.js';
import {OrganizerStore} from '../core/organizer/store.js';
import {ThoughtLibraryReadModel} from '../core/thought-library-read-model.js';
import {setTopicLifecycle} from '../core/topic-identity.js';
import {OrganizerRunner} from '../core/organizer/runner.js';
import {DeterministicFixtureProvider} from './fixtures/organizer/provider.mjs';

const op=()=>crypto.randomUUID();
const raw=(s,table,id)=>s.repository.transaction(false,t=>t.get(table,id));
const rows=(s,table)=>s.repository.transaction(false,t=>t.all(table));
const topic=(s,name='SYNTHETIC Personal Topic')=>s.createTopic({name,operationId:op()});
async function section(s,a,title,rank){return s.createSection({topicId:a.id,expectedTopicRevision:(await s.topic(a.id)).organizationRevision,title,...(rank?{rank}:{}),operationId:op()});}
async function entry(s,a,{sectionId,body='SYNTHETIC canonical prose\n\nSecond paragraph. 中文 👩🏽‍💻 é',rank}={}){
 const e=await s.createEntry({actor:'user',operationId:op(),body,type:'idea',formation:'explicit',evidence:[]});
 await place(s,e,a,{sectionId,rank});return e;
}
async function place(s,e,a,extra={}){
 const current=await s.entry(e.id),owner=await s.topic(a.id),old=await s.libraryPlacement(a.id,e.id);
 return s.placeEntry({entryId:e.id,topicId:a.id,expectedEntryRevision:current.revision,expectedTopicRevision:owner.organizationRevision,...(old?{expectedPlacementRevision:old.revision}:{}),...Object.fromEntries(Object.entries(extra).filter(([,v])=>v!==undefined)),operationId:op()});
}
async function fixture(){const f=await setup(OrganizerStore);await f.s.finishFoundation();return {...f,m:new ThoughtLibraryReadModel(f.s)};}
async function collect(read){const out=[];let cursor=null;for(let n=0;n<1000;n++){const page=await read(cursor);assert.equal(page.cursorInvalid,undefined);assert.equal(page.unavailable,undefined);out.push(...page.items);if(!page.nextCursor){assert.equal(page.complete,true);return out;}assert.equal(page.complete,false);cursor=page.nextCursor;}throw Error('continuation did not reach the real end');}
async function persisted(s){return s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(s.repository.stores.map(async name=>[name,await t.all(name)]))));}

test('TOPIC-05.1 refuses an uninitialized owner without opening a database or preparing metadata',async()=>{
 const storage=local(),s=new OrganizerStore(storage,{indexedDB:new IDBFactory()}),m=new ThoughtLibraryReadModel(s);
 assert.equal((await m.rootPage()).reason,'foundation_not_ready');assert.equal(s.repository.db,undefined);assert.equal(s.loaded,false);
});

test('TOPIC-05.1 title-only Root has no fabricated default heading, excerpt, count or body reads',async()=>{
 const {s,m}=await fixture(),a=await topic(s);await entry(s,a);
 const original=s.repository.transaction.bind(s.repository);
 s.repository.transaction=(write,fn,stores)=>{assert.equal(write,false);return original(write,t=>{const get=t.get.bind(t);t.get=(table,...args)=>{assert.notEqual(table,'thoughts');assert.notEqual(table,'blocks');return get(table,...args);};return fn(t);},stores);};
 try{const page=await m.rootPage();assert.equal(page.items.length,1);assert.equal(page.items[0].id,a.id);assert.deepEqual(page.items[0].sectionOverview.items,[]);assert.equal(page.items[0].sectionOverview.complete,true);for(const field of ['body','summary','rootCue','visibleEntryCount'])assert.equal(Object.hasOwn(page.items[0],field),false);assert.deepEqual(page.readingStructure,{kind:'derivative_reading',state:'not_projected'});}finally{s.repository.transaction=original;}
});

test('TOPIC-05.1 zero/one/many/long named Sections preserve exact labels and protected durable order',async()=>{
 const {s,m}=await fixture(),a=await topic(s);
 const first=await section(s,a,'SYNTHETIC first named Section','100000000000');
 const long='中文 Mixed 👩🏽‍💻 é / '.repeat(12),second=await section(s,a,long,'800000000000');
 const empty=await section(s,a,'SYNTHETIC empty writing Section','900000000000');
 const page=await m.sectionPage({topicId:a.id});assert.deepEqual(page.items.map(x=>x.id),[first.sectionId,a.sectionId,second.sectionId,empty.sectionId]);
 assert.equal(page.items[1].isDefault,true);assert.equal(page.items[1].title,'');assert.equal(page.items[1].named,false);
 assert.equal(page.items[2].title,long);assert.equal(page.items.at(-1).titleProtected,true);
 const root=await m.rootPage({sectionLimit:1});assert.deepEqual(root.items[0].sectionOverview.items.map(x=>x.id),[first.sectionId]);assert.equal(root.items[0].sectionOverview.complete,false);
 const tail=await collect(cursor=>m.sectionPage({topicId:a.id,namedOnly:true,cursor:cursor??root.items[0].sectionOverview.nextCursor,limit:1}));
 assert.deepEqual(tail.map(x=>x.id),[second.sectionId,empty.sectionId]);
 assert.equal((await m.entryPage({topicId:a.id,sectionId:empty.sectionId})).items.length,0,'an empty human Section is not filled with synthetic content');
});

test('TOPIC-05.1 Root continues through144 actual Personal Topics without a taxonomy or total-count cap',async()=>{
 const {s,m}=await fixture(),expected=[];
 for(let i=0;i<144;i++){const a=await topic(s,`SYNTHETIC 对象 ${i}`);expected.push(a.id);}
 const actual=await collect(cursor=>m.rootPage({cursor,limit:30}));assert.equal(actual.length,144);assert.deepEqual(actual.map(x=>x.id),expected.sort());assert.equal(new Set(actual.map(x=>x.id)).size,144);
});

test('TOPIC-05.1 same-name identities stay distinct, rename keeps route ID and invalidates old continuation',async()=>{
 const {s,m}=await fixture(),a=await topic(s,'SYNTHETIC same'),b=await topic(s,'SYNTHETIC same');
 await section(s,a,'SYNTHETIC one');await section(s,a,'SYNTHETIC two');
 assert.equal((await m.rootPage()).items.filter(x=>x.name==='SYNTHETIC same').length,2);
 const prior=await m.sectionPage({topicId:a.id,limit:1});await s.renameTopic({id:a.id,expectedRevision:(await s.topic(a.id)).revision,name:'SYNTHETIC renamed',operationId:op()});
 const stale=await m.sectionPage({topicId:a.id,cursor:prior.nextCursor,limit:1});assert.equal(stale.cursorInvalid,true);assert.deepEqual(stale.items,[]);
 const fresh=await m.sectionPage({topicId:a.id});assert.equal(fresh.topic.id,a.id);assert.equal(fresh.topic.name,'SYNTHETIC renamed');assert.notEqual(a.id,b.id);
});

test('TOPIC-05.1 candidates/removed/redirect sources are absent while dormant established identity remains readable',async()=>{
 const {s,m}=await fixture(),active=await topic(s,'SYNTHETIC active'),dormant=await topic(s,'SYNTHETIC dormant'),candidate=await topic(s,'SYNTHETIC secret candidate'),removed=await topic(s,'SYNTHETIC removed'),merged=await topic(s,'SYNTHETIC old redirect');
 await s.removeTopic({id:removed.id,expectedRevision:(await s.topic(removed.id)).revision,operationId:op()});
 await s.foundationWrite(async t=>{const d=await t.get('topics',dormant.id);setTopicLifecycle(d,'dormant',{actor:'ai',operationId:op(),at:s.clock()});await t.put('topics',d);const c=await t.get('topics',candidate.id);c.lifecycle='candidate';await t.put('topics',c);const r=await t.get('topics',merged.id);r.lifecycle='merged';r.redirectTo=active.id;await t.put('topics',r);});
 const all=await collect(cursor=>m.rootPage({cursor,limit:1}));assert.deepEqual(all.map(x=>x.id).sort(),[active.id,dormant.id].sort());assert.ok(!JSON.stringify(all).includes('secret candidate'));
 for(const hidden of [candidate,removed,merged]){assert.equal((await m.sectionPage({topicId:hidden.id})).unavailable,true);assert.equal((await m.entryPage({topicId:hidden.id})).unavailable,true);}
});

test('TOPIC-05.1 Entry references preserve Section/placement order and one canonical owner across two Topics',async()=>{
 const {s,m}=await fixture(),a=await topic(s),b=await topic(s),before=await section(s,a,'SYNTHETIC before','100000000000');
 const tail=await entry(s,a),first=await entry(s,a,{sectionId:before.sectionId,rank:'100000000000'}),second=await entry(s,a,{sectionId:before.sectionId,rank:'800000000000'});await place(s,first,b);
 const list=await collect(cursor=>m.entryPage({topicId:a.id,cursor,limit:1}));assert.deepEqual(list.map(x=>x.entryRef.id),[first.id,second.id,tail.id]);
 const shared=(await m.entryPage({topicId:b.id})).items[0];assert.deepEqual(shared.bodyRef,list[0].bodyRef);assert.equal(shared.bodyRef.kind,'thought');assert.equal(shared.bodyRef.id,first.id);
 for(const item of list){assert.equal(item.placement.orderProtected,true);assert.equal(item.placement.sectionProtected,true);assert.equal(Object.hasOwn(item,'body'),false);assert.equal(Object.hasOwn(item,'thoughtText'),false);}
 assert.equal((await rows(s,'thoughts')).length,3,'multi-placement never duplicates a body');
});

test('TOPIC-05.1 whole Input binding uses current canonical Input owner and detach updates only the reference',async()=>{
 const {s,m}=await fixture(),a=await topic(s),input=(await s.snapshot()).library.blocks[0];
 const added=await s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:input.revision,topicIds:[a.id]});
 const bound=(await m.entryPage({topicId:a.id})).items[0];assert.equal(bound.bodyRef.kind,'input');assert.equal(bound.bodyRef.id,input.id);assert.equal(bound.bodyRef.contentRevision,(await raw(s,'inputStates',input.id)).contentRevision);
 const current=await s.entry(added.id);await s.editEntry({id:added.id,operationId:op(),expectedRevision:current.revision,expectedInputRevision:current.currentInputRevision,changes:{body:'SYNTHETIC independent human rewrite'}});
 const detached=(await m.entryPage({topicId:a.id})).items[0];assert.equal(detached.bodyRef.kind,'thought');assert.equal(detached.bodyRef.id,added.id);assert.equal((await s.input(input.id)).libraryText,null);
});

test('TOPIC-05.1 actual expression time remains unknown without evidence and preserves committed first-party creation',async()=>{
 const {s,m}=await fixture(),a=await topic(s),legacy=await entry(s,a),created=await s.continueThinking({operationId:op(),topicId:a.id,body:'SYNTHETIC actual first-party expression'});
 const list=(await m.entryPage({topicId:a.id})).items;
 assert.deepEqual(list.find(x=>x.entryRef.id===legacy.id).expressionTime,{at:null,year:null,basis:'unknown'});
 assert.equal(list.find(x=>x.entryRef.id===created.id).expressionTime.basis,'independent_creation');
 const input=(await s.snapshot()).library.blocks[0],added=await s.addToTopics({operationId:op(),kind:'input',id:input.id,expectedRevision:input.revision,topicIds:[a.id]});
 assert.equal((await m.entryPage({topicId:a.id})).items.find(x=>x.entryRef.id===added.id).expressionTime.basis,'unknown');
 await s.foundationWrite(async t=>{const r=await t.get('records',input.sourceRecordId);r.value.sourceSentAt='2023-04-05T12:00:00.000Z';await t.put('records',r);});
 assert.deepEqual((await m.entryPage({topicId:a.id})).items.find(x=>x.entryRef.id===added.id).expressionTime,{at:'2023-04-05T12:00:00.000Z',year:2023,basis:'source'});
});

test('TOPIC-05.1 removed/excluded placements and removed Entries cannot appear or turn a partial page into an end',async()=>{
 const {s,m}=await fixture(),a=await topic(s),entries=[];for(let i=0;i<5;i++)entries.push(await entry(s,a));
 await place(s,entries[0],a,{remove:true});await s.removeEntry({id:entries[1].id,expectedRevision:(await s.entry(entries[1].id)).revision,operationId:op()});
 await s.foundationWrite(async t=>{const id=JSON.stringify([a.id,1,entries[2].id]),p=await t.get('placements',id);p.excludedByUser=true;await t.put('placements',p);});
 const all=await collect(cursor=>m.entryPage({topicId:a.id,cursor,limit:1}));assert.deepEqual(all.map(x=>x.entryRef.id),entries.slice(3).map(x=>x.id));
});

test('TOPIC-05.1 Source purge sanitizes generated labels and excludes invalid bodies before lazy cleanup',async()=>{
 const {s,m}=await fixture(),input=(await s.snapshot()).library.blocks[0];await s.enqueueOrganizer({operationId:op(),specs:[{inputId:input.id,role:'primary',selectedFields:['body']}]});await new OrganizerRunner(s,{providers:[new DeterministicFixtureProvider()]}).step();
 const a=(await rows(s,'topics'))[0],oldName=a.name,oldSections=(await m.sectionPage({topicId:a.id})).items.map(x=>x.title).filter(Boolean);assert.ok((await m.entryPage({topicId:a.id})).items.length);
 await s.permanentDelete(input.sourceRecordId);
 const root=await m.rootPage(),sections=await m.sectionPage({topicId:a.id}),entries=await m.entryPage({topicId:a.id});assert.equal(entries.items.length,0);assert.ok(!JSON.stringify(root).includes(oldName));for(const title of oldSections)assert.ok(!JSON.stringify(sections).includes(title));assert.equal(root.items[0].sourceUnavailable,true);
});

test('TOPIC-05.1 an excluded backing Input cannot release an AI Section label through its human Topic',async()=>{
 const {s,m}=await fixture(),a=await topic(s,'SYNTHETIC protected human Topic'),input=(await s.snapshot()).library.blocks[0];
 const generated=await section(s,a,'SYNTHETIC PRIVATE GENERATED SECTION'),human=await section(s,a,'SYNTHETIC human Section');
 await s.foundationWrite(async t=>{for(const item of [generated,human]){const id=JSON.stringify([a.id,1,item.sectionId]),row=await t.get('sections',id);row.sourceRecordIds=[input.sourceRecordId];if(item===generated)row.protections.title.locked=false;await t.put('sections',row);}});
 assert.ok(JSON.stringify(await m.rootPage()).includes('PRIVATE GENERATED SECTION'));
 await s.excludeLibrary(input.id,true);
 const root=await m.rootPage(),all=await m.sectionPage({topicId:a.id});assert.equal(root.items[0].name,'SYNTHETIC protected human Topic');assert.ok(!JSON.stringify(root).includes('PRIVATE GENERATED SECTION'));assert.ok(!JSON.stringify(all).includes('PRIVATE GENERATED SECTION'));
 assert.equal(all.items.find(x=>x.id===generated.sectionId).sourceUnavailable,true);assert.equal(all.items.find(x=>x.id===human.sectionId).title,'SYNTHETIC human Section');
 assert.equal((await raw(s,'sections',JSON.stringify([a.id,1,generated.sectionId]))).title,'SYNTHETIC PRIVATE GENERATED SECTION','projection never rewrites canonical saved metadata');
});

test('TOPIC-05.1 Unicode IDs use opaque scoped cursors; wrong scope, reload and tampering refuse',async()=>{
 const {s,m}=await fixture();let seq=0;s.uuid=()=>`主题-中文-👩🏽‍💻-${++seq}`;const a=await topic(s),b=await topic(s);for(let i=0;i<4;i++)await section(s,a,`中文 Section ${i}`);
 const page=await m.sectionPage({topicId:a.id,limit:1});assert.equal(typeof page.nextCursor,'string');assert.ok(!page.nextCursor.includes('中文'));
 const all=await collect(cursor=>m.sectionPage({topicId:a.id,cursor,limit:1}));assert.equal(all.length,5);
 assert.equal((await m.sectionPage({topicId:b.id,cursor:page.nextCursor})).cursorInvalid,true);assert.equal((await m.entryPage({topicId:a.id,cursor:page.nextCursor})).cursorInvalid,true);assert.equal((await new ThoughtLibraryReadModel(s).sectionPage({topicId:a.id,cursor:page.nextCursor})).cursorInvalid,true);
 await assert.rejects(m.sectionPage({topicId:a.id,cursor:{key:'forged'}}),{code:'INVALID_REQUEST'});
});

test('TOPIC-05.1 concurrent rename between coherent read and final authority check returns no stale labels',async()=>{
 const {s,m}=await fixture(),a=await topic(s,'SYNTHETIC old label'),original=s.repository.transaction.bind(s.repository);let inject=true;
 s.repository.transaction=async(write,fn,stores)=>{const result=await original(write,fn,stores);if(!write&&inject){inject=false;await s.renameTopic({id:a.id,expectedRevision:0,name:'SYNTHETIC current label',operationId:op()});}return result;};
 try{const page=await m.rootPage();assert.equal(page.cursorInvalid,true);assert.deepEqual(page.items,[]);assert.equal(page.complete,false);}finally{s.repository.transaction=original;}
 assert.equal((await m.rootPage()).items[0].name,'SYNTHETIC current label');
});

test('TOPIC-05.1 rename during final consent revalidation cannot publish an old Topic label',async()=>{
 const {s,m}=await fixture(),a=await topic(s,'SYNTHETIC old consent-gap label'),get=s.local.get.bind(s.local);let reads=0;
 s.local.get=async key=>{if(key===STORAGE_KEY&&++reads===2)await s.renameTopic({id:a.id,expectedRevision:0,name:'SYNTHETIC current consent-gap label',operationId:op()});return get(key);};
 try{const page=await m.rootPage();assert.equal(page.cursorInvalid,true);assert.deepEqual(page.items,[]);assert.equal(page.complete,false);}finally{s.local.get=get;}
 assert.equal((await m.rootPage()).items[0].name,'SYNTHETIC current consent-gap label');
});

test('TOPIC-05.1 Source purge during final consent revalidation cannot publish generated labels or references',async()=>{
 for(const kind of ['root','entries']){
  const {s,m}=await fixture(),input=(await s.snapshot()).library.blocks[0];await s.enqueueOrganizer({operationId:op(),specs:[{inputId:input.id,role:'primary',selectedFields:['body']}]});await new OrganizerRunner(s,{providers:[new DeterministicFixtureProvider()]}).step();
  const a=(await rows(s,'topics'))[0],get=s.local.get.bind(s.local);let reads=0;
  s.local.get=async key=>{if(key===STORAGE_KEY&&++reads===2)await s.permanentDelete(input.sourceRecordId);return get(key);};
  try{const page=await (kind==='root'?m.rootPage():m.entryPage({topicId:a.id}));assert.equal(page.cursorInvalid,true);assert.deepEqual(page.items,[]);assert.equal(page.complete,false);}finally{s.local.get=get;}
  assert.equal((await m.entryPage({topicId:a.id})).items.length,0);
 }
});

test('TOPIC-05.1 edited and removed supporting Inputs resolve canonical freshness before lazy invalidation',async()=>{
 const {s,m}=await fixture(),a=await topic(s);await s.capture(capture((await s.status()).epoch,'synthetic-supporting-source','SYNTHETIC second supporting Input'));
 const [primary,supporting]=(await s.snapshot()).library.blocks,evidence=await s.evidenceFor([{inputId:primary.id,role:'primary',selectedFields:['body']},{inputId:supporting.id,role:'supporting',selectedFields:['body']}]),e=await derived(s,[primary.id,supporting.id],{evidence});await place(s,e,a);
 assert.equal((await m.entryPage({topicId:a.id})).items[0].source.freshness,'current');
 await inputEdit(s,primary.id,{libraryText:'SYNTHETIC edited primary body'});
 let canonical=await s.entry(e.id),before=await persisted(s),page=await m.entryPage({topicId:a.id});
 assert.equal(canonical.freshness,'stale');assert.equal(page.items[0].source.freshness,canonical.freshness);assert.equal(page.items[0].source.integrity,canonical.integrity);assert.deepEqual(await persisted(s),before);
 await s.excludeLibrary(supporting.id,true);
 canonical=await s.entry(e.id);before=await persisted(s);page=await m.entryPage({topicId:a.id});
 assert.equal(canonical.integrity,'partial');assert.equal(page.items[0].source.integrity,canonical.integrity);assert.equal(page.items[0].source.freshness,canonical.freshness);assert.deepEqual(await persisted(s),before);
});

test('TOPIC-05.1 restore epoch, removed Topic and active layout changes invalidate old continuations',async()=>{
 for(const change of ['epoch','remove','layout']){const {s,m}=await fixture(),a=await topic(s);await section(s,a,'SYNTHETIC one');const page=await m.sectionPage({topicId:a.id,limit:1});
  if(change==='epoch')await s.foundationWrite(t=>t.put('meta',{id:'recovery-restore-epoch',value:op()}));
  else if(change==='remove')await s.removeTopic({id:a.id,expectedRevision:(await s.topic(a.id)).revision,operationId:op()});
  else await s.foundationWrite(async t=>{const row=await t.get('topics',a.id);row.activeLayoutGeneration++;await t.put('topics',row);});
  const stale=await m.sectionPage({topicId:a.id,cursor:page.nextCursor});assert.equal(stale.cursorInvalid,true);assert.deepEqual(stale.items,[]);
 }
});

test('TOPIC-05.1 all projection paths leave the complete database, source bodies, order and AI records untouched',async()=>{
 const {s,m}=await fixture(),a=await topic(s);await section(s,a,'SYNTHETIC named');await entry(s,a);const before=await persisted(s),writes=s.repository.metrics.writes;
 const original=s.repository.transaction.bind(s.repository);s.repository.transaction=(write,...args)=>{assert.equal(write,false,'read facade cannot enter any write transaction');return original(write,...args);};
 const fetch=globalThis.fetch;let network=0;globalThis.fetch=async()=>{network++;throw Error('network forbidden');};
 try{await m.rootPage();await m.sectionPage({topicId:a.id});await m.entryPage({topicId:a.id});}finally{s.repository.transaction=original;globalThis.fetch=fetch;}
 assert.equal(network,0);assert.equal(s.repository.metrics.writes,writes);assert.deepEqual(await persisted(s),before);
});

test('TOPIC-05.1 bounded cursors expire honestly and invalid request shapes never widen a query',async()=>{
 const {s,m}=await fixture(),a=await topic(s);await section(s,a,'SYNTHETIC next');const first=await m.sectionPage({topicId:a.id,limit:1});for(let i=0;i<130;i++)await m.sectionPage({topicId:a.id,limit:1});assert.ok(m.cursors.size<=128);assert.equal((await m.sectionPage({topicId:a.id,cursor:first.nextCursor})).cursorInvalid,true);
 for(const run of [()=>m.rootPage({limit:51}),()=>m.rootPage({query:'invented search'}),()=>m.sectionPage({topicId:a.id,limit:101}),()=>m.entryPage({topicId:a.id,limit:41}),()=>m.entryPage({topicId:a.id,view:'ai'})])assert.throws(run,{code:'INVALID_REQUEST'});
});

test('TOPIC-05.1 malformed optional metadata cannot smuggle body-shaped values into projections',async()=>{
 const {s,m}=await fixture(),a=await topic(s),e=await entry(s,a),secret={body:'SYNTHETIC BODY SHAPED METADATA'};
 await s.foundationWrite(async t=>{const owner=await t.get('topics',a.id);owner.createdAt=secret;owner.pinKey=secret;await t.put('topics',owner);const value=await t.get('thoughts',e.id);value.integrity=secret;value.freshness=secret;await t.put('thoughts',value);const id=JSON.stringify([a.id,1,e.id]),p=await t.get('placements',id);p.membershipAuthorship=secret;await t.put('placements',p);});
 const root=await m.rootPage(),page=await m.entryPage({topicId:a.id});assert.equal(root.items[0].orderRef.createdAt,null);assert.equal(root.items[0].orderRef.pinKey,null);assert.equal(page.items[0].source.integrity,'unknown');assert.equal(page.items[0].placement.membershipAuthorship,'unknown');assert.ok(!JSON.stringify([root,page]).includes(secret.body));
});
