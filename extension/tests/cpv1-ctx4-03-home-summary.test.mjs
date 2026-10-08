import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService} from '../core/context-cards.js';
import {ContextTopicAccessService} from '../core/context-topic-access.js';
import {CONTEXT_TOPIC_ACCESS_ROW,CONTEXT_TOPIC_ACCESS_LIMITS} from '../core/context-topic-preferences.js';
import {setTopicLifecycle} from '../core/topic-identity.js';
import {MemoryService} from '../core/memory/service.js';
import {ContextCardsPage} from '../ui/context-cards.js';
import {PresentationNode} from './harness/presentation-dom.mjs';

const op=()=>crypto.randomUUID();
const raw=(s,name,id)=>s.repository.transaction(false,t=>t.get(name,id));
const snapshot=s=>s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all([...s.repository.db.objectStoreNames].map(async name=>[name,await t.all(name)]))));
const mutate=(s,name,id,fn)=>s.foundationWrite(async t=>{const row=await t.get(name,id);fn(row);await t.put(name,row);});
const change=(row,epoch,enabled=true)=>({topicId:row.topicId,enabled,expectedRevision:row.revision,expectedBinding:enabled?row.expectedBinding:row.binding,epoch,operationId:op()});

async function fixture(run,{count=4,select=true}={}){
 const {s}=await setup(OrganizerStore);await s.finishFoundation();await s.setFilterMode('off');
 const access=new ContextTopicAccessService(s),cards=new ContextCardsService(s,{topicSummary:(t,epoch)=>access.summaryInTransaction(t,epoch)}),topics=[];
 for(let index=0;index<count;index++)topics.push(await s.createTopic({name:`SYNTHETIC Summary ${String(count-index).padStart(2,'0')}`,operationId:op()}));
 await s.createEntry({operationId:op(),actor:'user',body:'SYNTHETIC_PRIVATE_THOUGHT_BODY',note:'SYNTHETIC_PRIVATE_THOUGHT_NOTE',type:'idea',formation:'explicit',evidence:[]});
 for(const card of ['info','rules','now'])await cards.change({kind:'put',card,itemId:op(),operationId:op(),epoch:'initial',expectedRevision:0,section:'SYNTHETIC independent',body:`SYNTHETIC_PRIVATE_${card}_ITEM`});
 for(const key of ['global','inputs'])await cards.change({kind:'access',key,enabled:true,operationId:op(),epoch:'initial',expectedRevision:0});
 const page=await access.page({limit:100});assert.equal(page.available,true);assert.equal(page.complete,true);
 // Reverse the explicit selection order to distinguish the canonical Topic
 // directory from preference insertion order. No summary algorithm is copied.
 if(select)for(const row of [...page.items].reverse())assert.equal((await access.change(change(row,page.epoch))).ok,true);
 const summary=()=>s.repository.transaction(false,async t=>access.summaryInTransaction(t,await cards.admitted(t)));
 const item=async id=>{const current=await access.page({limit:100});assert.equal(current.available,true);const row=current.items.find(value=>value.topicId===id);assert.ok(row);return {row,epoch:current.epoch};};
 const selectTopic=async(id,enabled=true)=>{const {row,epoch}=await item(id);assert.equal((await access.change(change(row,epoch,enabled))).ok,true);};
 try{await run({s,access,cards,topics,page,summary,item,selectTopic});}finally{await s.repository.close();}
}

function expectedSummary(value,names,remainder,total=names.length+remainder){
 assert.equal(value.available,true,JSON.stringify(value));assert.equal(value.selectedCount,total);assert.deepEqual(value.selectedNames,names);assert.equal(value.remainingSelectedCount,remainder);assert.equal(value.externalAllowed,false);
}
async function assertReadOnly(f,run){const before=await snapshot(f.s);await run();assert.deepEqual(await snapshot(f.s),before,'summary reads must not write any canonical data, preference, cache or receipt');}
const description=async cards=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');globalThis.document={addEventListener(){},documentElement:{lang:'en'},createElement:tag=>new PresentationNode(tag)};
 try{const page=new ContextCardsPage({host:null,onNavigate:()=>{}}),node=new PresentationNode('p');page.snapshot=await cards.snapshot();page.paintInputSummary(node);return {summary:node.textContent,count:page.inputCount(),snapshot:page.snapshot};}
 finally{if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;}
};

test('CTX4-03 home names exactly three of twenty real selections in canonical order with seventeen remaining',()=>fixture(async f=>{
 const expected=f.page.items.slice(0,3).map(row=>row.name),transaction=f.s.repository.transaction.bind(f.s.repository),reads=[];
 await assertReadOnly(f,async()=>{
  f.s.repository.transaction=(write,run,stores)=>transaction(write,t=>{const get=t.get.bind(t);t.get=(store,...args)=>{reads.push(store);return get(store,...args);};return run(t);},stores);
  try{expectedSummary(await f.summary(),expected,17,20);const card=await f.cards.snapshot();expectedSummary(card.topicChoices,expected,17,20);assert.equal(card.capabilities.external,false);assert.equal(card.connections,0);}finally{f.s.repository.transaction=transaction;}
 });
 assert.ok(reads.length>0);assert.equal(reads.some(name=>['thoughts','blocks','placements','dependencies'].includes(name)),false,'the home preview reads names without Thought or Input bodies');
 const rendered=await description(f.cards);for(const name of expected)assert.ok(rendered.summary.includes(name));assert.match(rendered.summary,/17/);for(const row of f.page.items.slice(3))assert.equal(rendered.summary.includes(row.name),false);assert.match(rendered.count,/20/);assert.equal(rendered.summary.includes('SYNTHETIC_PRIVATE'),false);
},{count:20}));

test('CTX4-03 home selected names follow same-ID rename, explicit off and later explicit selection',()=>fixture(async f=>{
 const [first,second,third,fourth]=f.page.items,stored=await raw(f.s,'meta',CONTEXT_TOPIC_ACCESS_ROW);
 await f.s.renameTopic({id:first.topicId,name:'SYNTHETIC Renamed summary',expectedRevision:(await raw(f.s,'topics',first.topicId)).revision,operationId:op()});
 expectedSummary(await f.summary(),['SYNTHETIC Renamed summary',second.name,third.name],1);assert.deepEqual(await raw(f.s,'meta',CONTEXT_TOPIC_ACCESS_ROW),stored);
 await f.selectTopic(second.topicId,false);expectedSummary(await f.summary(),['SYNTHETIC Renamed summary',third.name,fourth.name],0);
 const fresh=await f.s.createTopic({name:'SYNTHETIC Newly created default off',operationId:op()});expectedSummary(await f.summary(),['SYNTHETIC Renamed summary',third.name,fourth.name],0);
 await f.selectTopic(fresh.id);await assertReadOnly(f,async()=>expectedSummary(await f.summary(),['SYNTHETIC Renamed summary',third.name,fourth.name],1));
}));

for(const key of ['global','inputs'])test(`CTX4-03 home ${key} pause retains saved names and selected count`,()=>fixture(async f=>{
 const before=await f.summary(),prefs=await raw(f.s,'meta',CONTEXT_TOPIC_ACCESS_ROW),current=(await f.cards.snapshot()).access[key];await f.cards.change({kind:'access',key,enabled:false,expectedRevision:current.revision,epoch:'initial',operationId:op()});
 await assertReadOnly(f,async()=>{assert.deepEqual(await f.summary(),before);expectedSummary((await f.cards.snapshot()).topicChoices,before.selectedNames,before.remainingSelectedCount,before.selectedCount);});assert.deepEqual(await raw(f.s,'meta',CONTEXT_TOPIC_ACCESS_ROW),prefs);
 const page=await f.access.page();assert.ok(page.items.every(row=>row.enabled&&!row.policyAllowed));
}));

test('CTX4-03 home legacy denial remains a saved choice preview rather than an effective access count',()=>fixture(async f=>{
 const before=await f.summary(),prefs=await raw(f.s,'meta',CONTEXT_TOPIC_ACCESS_ROW);assert.equal((await new MemoryService(f.s).authorize({topicIds:[f.page.items[0].topicId],decision:'denied'})).saved,true);
 const page=await f.access.page();assert.equal(page.items[0].enabled,true);assert.equal(page.items[0].bindingValid,true);assert.equal(page.items[0].policyAllowed,false);assert.equal(page.items[0].reason,'legacy_restricted');await assertReadOnly(f,async()=>assert.deepEqual(await f.summary(),before));assert.deepEqual(await raw(f.s,'meta',CONTEXT_TOPIC_ACCESS_ROW),prefs);assert.equal((await f.cards.snapshot()).capabilities.external,false);
},{count:1}));

test('CTX4-03 home unselected and new identities never become preview names',()=>fixture(async f=>{
 await assertReadOnly(f,async()=>expectedSummary(await f.summary(),[],0));const second=f.page.items[1];await f.selectTopic(second.topicId);expectedSummary(await f.summary(),[second.name],0);await f.selectTopic(second.topicId,false);expectedSummary(await f.summary(),[],0);
 const rendered=await description(f.cards);assert.doesNotMatch(rendered.summary,/SYNTHETIC Summary/);assert.match(rendered.count,/^0\b/);
},{select:false}));

test('CTX4-03 home dormant stable identity keeps its name while removed and restored choices stay in the remainder',()=>fixture(async f=>{
 const [first,second]=f.page.items;await mutate(f.s,'topics',second.topicId,topic=>setTopicLifecycle(topic,'dormant',{actor:'ai',operationId:op(),at:f.s.clock()}));expectedSummary(await f.summary(),[first.name,second.name],0);
 await f.s.removeTopic({id:first.topicId,expectedRevision:(await raw(f.s,'topics',first.topicId)).revision,operationId:op()});expectedSummary(await f.summary(),[second.name],1);
 await f.s.restoreTopicContainer({id:first.topicId,expectedRevision:(await raw(f.s,'topics',first.topicId)).revision,operationId:op()});expectedSummary(await f.summary(),[second.name],1);
 await f.selectTopic(first.topicId,false);expectedSummary(await f.summary(),[second.name],0);await f.selectTopic(first.topicId);await assertReadOnly(f,async()=>expectedSummary(await f.summary(),[first.name,second.name],0));
},{count:2}));

test('CTX4-03 home merge and revision restore never reuse stale source or survivor labels',()=>fixture(async f=>{
 const [source,survivor]=f.page.items;await f.s.startLayout({kind:'topic_merge',topicId:source.topicId,survivorId:survivor.topicId,expectedTopicRevision:(await raw(f.s,'topics',source.topicId)).organizationRevision,expectedSurvivorRevision:(await raw(f.s,'topics',survivor.topicId)).organizationRevision,operationId:op()});await f.s.drainLibraryMaintenance();
 expectedSummary(await f.summary(),[],2);const rendered=await description(f.cards);assert.doesNotMatch(rendered.summary,/SYNTHETIC Summary/);assert.match(rendered.summary,/retain/i);assert.match(rendered.count,/2/);
 const revision=(await f.s.revisions({kind:'topic',entityId:survivor.topicId})).items.find(row=>row.reason==='merge');assert.ok(revision);await f.s.restoreRevision({id:revision.id,side:'before',expectedRevision:(await raw(f.s,'topics',survivor.topicId)).revision,operationId:op()});expectedSummary(await f.summary(),[],2);
 await f.selectTopic(survivor.topicId);expectedSummary(await f.summary(),[survivor.name],1);await assertReadOnly(f,async()=>expectedSummary((await f.cards.snapshot()).topicChoices,[survivor.name],1));
},{count:2}));

for(const variant of ['missing_topic','restore_epoch'])test(`CTX4-03 home ${variant} keeps the stored count and never names a stale binding`,()=>fixture(async f=>{
 if(variant==='missing_topic')await f.s.foundationWrite(t=>t.delete('topics',f.page.items[0].topicId));else await f.s.write(t=>t.put('meta',{id:'recovery-restore-epoch',value:op()}));
 await assertReadOnly(f,async()=>expectedSummary(await f.summary(),[],1));const rendered=await description(f.cards);assert.match(rendered.summary,/retain/i);assert.equal(rendered.summary.includes(f.page.items[0].name),false);assert.match(rendered.count,/1/);
},{count:1}));

for(const variant of ['hidden_source','removed_source','missing_source'])test(`CTX4-03 home ${variant} uses the actual safe-label mask instead of a source-derived name`,()=>fixture(async f=>{
 const row=f.page.items[0],source=(await f.s.snapshot()).records[0];await mutate(f.s,'topics',row.topicId,topic=>{topic.sourceRecordIds=[source.id];topic.protections.name={locked:false};});
 if(variant==='hidden_source')await f.s.update(source.id,{hidden:true});if(variant==='removed_source')await f.s.trash(source.id);if(variant==='missing_source')await f.s.foundationWrite(t=>t.delete('recordIndex',source.id));
 const topic=await raw(f.s,'topics',row.topicId),safe=await f.s.repository.transaction(false,t=>new MemoryService(f.s).safeLabel(t,topic,'name'));assert.notEqual(safe,row.name);assert.equal(safe,'来源已移除的主题');
 await assertReadOnly(f,async()=>{const summary=await f.summary();expectedSummary(summary,[safe],0);assert.equal(JSON.stringify(summary).includes(row.name),false);const card=(await f.cards.snapshot()).topicChoices;expectedSummary(card,[safe],0);});
},{count:1}));

test('CTX4-03 home preserves the actual owner-protected manual name after source hiding',()=>fixture(async f=>{
 const row=f.page.items[0],source=(await f.s.snapshot()).records[0],name='SYNTHETIC Owner-protected label';await f.s.renameTopic({id:row.topicId,name,expectedRevision:(await raw(f.s,'topics',row.topicId)).revision,operationId:op()});assert.equal((await raw(f.s,'topics',row.topicId)).protections.name.locked,true);await mutate(f.s,'topics',row.topicId,topic=>{topic.sourceRecordIds=[source.id];});await f.s.update(source.id,{hidden:true});await assertReadOnly(f,async()=>expectedSummary(await f.summary(),[name],0));
},{count:1}));

for(const variant of ['overlong','non_string','empty','whitespace','nul','bad_source_list','bad_source_id','excess_sources'])test(`CTX4-03 home malformed ${variant} label stays unnamed with its stored selection retained`,()=>fixture(async f=>{
 const row=f.page.items[0];await mutate(f.s,'topics',row.topicId,topic=>{if(variant==='overlong')topic.name='x'.repeat(301);if(variant==='non_string')topic.name={secret:'SYNTHETIC_PRIVATE_OBJECT'};if(variant==='empty')topic.name='';if(variant==='whitespace')topic.name=' \n\t ';if(variant==='nul')topic.name='SYNTHETIC\u0000PRIVATE';if(variant==='bad_source_list')topic.sourceRecordIds='SYNTHETIC_PRIVATE_SOURCE';if(variant==='bad_source_id')topic.sourceRecordIds=[null];if(variant==='excess_sources')topic.sourceRecordIds=Array(CONTEXT_TOPIC_ACCESS_LIMITS.choices+1).fill('synthetic-source');});
 await assertReadOnly(f,async()=>{expectedSummary(await f.summary(),[],1);expectedSummary((await f.cards.snapshot()).topicChoices,[],1);});assert.equal(JSON.stringify(await f.summary()).includes('SYNTHETIC_PRIVATE'),false);
},{count:1}));

for(const variant of ['version','duplicate','binding','unknown_name'])test(`CTX4-03 home malformed ${variant} preferences refuse unknown counts without touching independent Items`,()=>fixture(async f=>{
 const prefs=await raw(f.s,'meta',CONTEXT_TOPIC_ACCESS_ROW),items=(await f.cards.snapshot()).items;
 if(variant==='version')prefs.version=2;if(variant==='duplicate')prefs.choices.push(structuredClone(prefs.choices[0]));if(variant==='binding')delete prefs.choices[0].binding.createdAt;if(variant==='unknown_name')prefs.choices[0].name='SYNTHETIC_PRIVATE_RETAINED_NAME';await f.s.repository.transaction(true,t=>t.put('meta',prefs));
 await assertReadOnly(f,async()=>{const direct=await f.summary();assert.equal(direct.available,false);assert.equal(direct.selectedCount,null);assert.equal(direct.externalAllowed,false);const card=await f.cards.snapshot();assert.equal(card.topicChoices.available,false);assert.equal(card.topicChoices.selectedCount,null);assert.deepEqual(card.items,items);assert.equal(card.capabilities.info,true);assert.equal(card.capabilities.rules,true);assert.equal(card.capabilities.now,true);assert.equal(JSON.stringify(card.topicChoices).includes('SYNTHETIC_PRIVATE'),false);});
 const rendered=await description(f.cards);assert.match(rendered.count,/unavailable/);assert.doesNotMatch(rendered.count,/^0\b/);assert.match(rendered.summary,/cannot be read/);
},{count:1}));

for(const variant of ['no_names','too_many_names','non_string_name','overlong_name','empty_name','whitespace_name','nul_name','sparse_names','extra_name_property','negative_remainder','inconsistent_total','wrong_count','external_grant'])test(`CTX4-03 snapshot rejects malformed ${variant} callback fields without dropping independent Items`,()=>fixture(async f=>{
 const baseline=await f.cards.snapshot(),cards=new ContextCardsService(f.s,{topicSummary:async(t,epoch)=>{const summary=await f.access.summaryInTransaction(t,epoch);if(variant==='no_names')delete summary.selectedNames;if(variant==='too_many_names')summary.selectedNames=Array(4).fill('Synthetic');if(variant==='non_string_name')summary.selectedNames=[{body:'SYNTHETIC_PRIVATE_OBJECT'}];if(variant==='overlong_name')summary.selectedNames=['x'.repeat(301)];if(variant==='empty_name')summary.selectedNames=[''];if(variant==='whitespace_name')summary.selectedNames=[' \t\n '];if(variant==='nul_name')summary.selectedNames=['SYNTHETIC\u0000PRIVATE'];if(variant==='sparse_names')summary.selectedNames=Array(1);if(variant==='extra_name_property')summary.selectedNames.secret='SYNTHETIC_PRIVATE_EXTRA';if(variant==='negative_remainder')summary.remainingSelectedCount=-1;if(variant==='inconsistent_total')summary.remainingSelectedCount=1;if(variant==='wrong_count')summary.selectedCount='1';if(variant==='external_grant')summary.externalAllowed=true;return summary;}});
 await assertReadOnly(f,async()=>{const result=await cards.snapshot();assert.equal(result.topicChoices.available,false,variant);assert.equal(result.topicChoices.selectedCount,null);assert.equal(result.topicChoices.externalAllowed,false);assert.deepEqual(result.items,baseline.items);assert.equal(result.capabilities.external,false);assert.equal(result.capabilities.inputs,false);assert.equal(JSON.stringify(result.topicChoices).includes('SYNTHETIC_PRIVATE'),false);});
},{count:1}));

test('CTX4-03 snapshot whitelists the real names summary and never forwards callback body-like extras',()=>fixture(async f=>{
 const cards=new ContextCardsService(f.s,{topicSummary:async(t,epoch)=>({...await f.access.summaryInTransaction(t,epoch),body:'SYNTHETIC_PRIVATE_CALLBACK_BODY',sourceRecordIds:['synthetic-source'],details:{secret:'SYNTHETIC_PRIVATE_DETAILS'}})});
 await assertReadOnly(f,async()=>{const result=await cards.snapshot();expectedSummary(result.topicChoices,[f.page.items[0].name],0);assert.deepEqual(Object.keys(result.topicChoices).sort(),['available','externalAllowed','remainingSelectedCount','selectedCount','selectedNames']);assert.equal(JSON.stringify(result.topicChoices).includes('SYNTHETIC_PRIVATE'),false);});
},{count:1}));
