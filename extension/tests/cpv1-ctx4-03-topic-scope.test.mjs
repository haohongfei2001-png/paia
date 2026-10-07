import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,local,derived,inputEdit,capture} from './harness/thought-m1.mjs';
import {OrganizerStore} from '../core/organizer/store.js';
import {ContextCardsService} from '../core/context-cards.js';
import {MemoryService} from '../core/memory/service.js';
import {key,profileDefault} from '../core/memory/model.js';
import {admitPreGatePurgeFixture} from './harness/pre-gate-purge-fixture.mjs';
import {readContextTopicScope,CONTEXT_TOPIC_SCOPE_LIMITS} from '../core/context-topic-scope.js';
import {evaluateContextTopicAccess} from '../core/context-topic-access-policy.js';
import {FilterRunner} from '../core/filter-runner.js';
import {setTopicLifecycle} from '../core/topic-identity.js';
import {markHuman} from '../core/thought-model.js';
import {BackupService as ExistingFileFixture} from './harness/context-legacy-file.mjs';
import {BackupService} from '../core/backup-service.js';
import {exported,prepared} from './harness/backup-v081.mjs';

const op=()=>crypto.randomUUID();
const raw=(s,name,id)=>s.repository.transaction(false,t=>t.get(name,id));
const rows=(s,name)=>s.repository.transaction(false,t=>t.all(name));
const change=(s,name,id,fn)=>s.foundationWrite(async t=>{const row=await t.get(name,id);fn(row);await t.put(name,row);});
const createTopic=(s,name='SYNTHETIC_TOPIC_PRIVATE_LABEL')=>s.createTopic({name,operationId:op()});
const independent=s=>s.createEntry({operationId:op(),actor:'user',body:'SYNTHETIC_SAVED_THOUGHT_PRIVATE_BODY',note:'SYNTHETIC_THOUGHT_PRIVATE_NOTE',type:'idea',formation:'explicit',evidence:[]});
async function place(s,entryId,topic,sectionId){const e=await raw(s,'thoughts',entryId),t=await raw(s,'topics',topic.id);return s.placeEntry({entryId,topicId:topic.id,...(sectionId?{sectionId}:{}),operationId:op(),expectedEntryRevision:e.revision,expectedTopicRevision:t.organizationRevision});}
async function fixture({empty=false,input=false}={}){
 const {s}=await setup(OrganizerStore);await s.finishFoundation();await s.setFilterMode('off');
 const topic=await createTopic(s),inputRow=(await s.snapshot()).library.blocks[0];
 const entry=empty?null:input?await derived(s,[inputRow.id],{body:'SYNTHETIC_DERIVED_PRIVATE_BODY'}):await independent(s);
 if(entry)await place(s,entry.id,topic);
 const c=new ContextCardsService(s),m=new MemoryService(s);
 for(const name of ['global','inputs'])await c.change({kind:'access',operationId:op(),epoch:'initial',key:name,enabled:true,expectedRevision:0});
 return {s,c,m,topic,entry,input:inputRow};
}
const scope=f=>readContextTopicScope(f.s,{topicId:f.topic.id});
function evaluate(result,selection=result.binding&&{...result.binding,enabled:true}){
 assert.equal(result.externalAllowed,false);assert.equal(result.available,true,JSON.stringify(result));
 const value=evaluateContextTopicAccess({...result.snapshot,selection});assert.equal(value.externalAllowed,false);return value;
}
function refused(result,reason){assert.equal(result.available,false);if(reason)assert.equal(result.reason,reason);assert.equal(result.externalAllowed,false);assert.equal(result.binding,null);assert.equal(result.snapshot,null);assert.deepEqual(result.scope,{complete:false,legacyComplete:false,eligibility:'unknown',topicIds:[],entryIds:[],inputIds:[],sections:[]});}
async function deny(f,id,decision='denied',profileId='default'){
 if(profileId!=='default')await f.s.foundationWrite(t=>t.put('meta',{...profileDefault(),id:key('profile',profileId),profileId,name:'SYNTHETIC_PRIVATE_PROFILE_NAME',instruction:'SYNTHETIC_PRIVATE_PROFILE_INSTRUCTION'}));
 // Retained legacy negative evidence in the actual repository. Current Memory
 // authorize also turns off legacy external access globally; keeping untouched
 // config here proves the specific membership veto without that masking veto.
 await f.m.ready();const topic=await raw(f.s,'topics',id);
 await f.s.foundationWrite(t=>t.put('meta',{id:key('topic',profileId,id),kind:'topic',version:1,profileId,topicId:id,decision,layoutGeneration:topic.activeLayoutGeneration}));
}
async function freeze(s){return s.repository.transaction(false,async t=>Object.fromEntries(await Promise.all(['meta','records','blocks','inputStates','thoughts','topics','sections','placements','dependencies','provenance','revisions','operationReceipts'].map(async name=>[name,await t.all(name)]))));}

test('CTX4-03 scope reads one material snapshot and a metadata-only fence without bodies, grants or writes',async()=>{
 const f=await fixture({input:true});await f.c.change({kind:'put',operationId:op(),epoch:'initial',itemId:op(),expectedRevision:0,body:'SYNTHETIC_CONTEXT_PRIVATE_BODY',section:'SYNTHETIC_CONTEXT_PRIVATE_SECTION'});
 await f.s.foundationWrite(t=>t.put('meta',{...profileDefault(),instruction:'SYNTHETIC_PRIVATE_PROFILE_INSTRUCTION'}));
 const before=await freeze(f.s),transaction=f.s.repository.transaction.bind(f.s.repository);let calls=0;
 f.s.run=()=>{throw Error('must not initialize from a permission read');};
 f.s.repository.transaction=(write,fn,stores)=>{calls++;assert.equal(write,false);if(calls===2)assert.deepEqual(stores,['meta']);return transaction(write,async t=>{for(const name of ['put','delete','clear'])t[name]=()=>{throw Error('must not write');};t.all=()=>{throw Error('must use bounded pages');};if(calls===2){const get=t.get.bind(t);t.get=(name,id)=>{assert.equal(name,'meta');return get(name,id);};}return fn(t);},stores);};
 const result=await scope(f);assert.equal(calls,2);f.s.repository.transaction=transaction;
 assert.equal(evaluate(result).reason,'policy_allowed');assert.equal(evaluate(result,null).reason,'topic_off');
 assert.deepEqual(result.scope.entryIds,[f.entry.id]);assert.deepEqual(result.scope.inputIds,[f.input.id]);assert.deepEqual(await freeze(f.s),before);
 const serialized=JSON.stringify(result);
 for(const forbidden of ['SYNTHETIC_','originalText','thoughtText','summary','instruction','queryDigest','thought-suppression-key','sourceRecordIds','fieldDigests','body','result'])assert.ok(!serialized.includes(forbidden),forbidden);
 assert.deepEqual(result.snapshot.legacyRows,[],'valid profile contents never leave the read boundary');
});

test('CTX4-03 genuinely empty Topic is complete, while an unknown Topic has no partial snapshot',async()=>{
 const f=await fixture({empty:true}),value=await scope(f);assert.equal(evaluate(value).reason,'policy_allowed');assert.deepEqual(value.scope.entryIds,[]);assert.equal(value.scope.sections.length,1);
 refused(await readContextTopicScope(f.s,{topicId:'unknown-synthetic-topic'}),'topic_unavailable');
});

test('CTX4-03 read never opens or initializes an unprepared database or Memory config',async()=>{
 const s=new OrganizerStore(local());let opened=0;s.repository.open=()=>{opened++;throw Error('unexpected initialize');};refused(await readContextTopicScope(s,{topicId:'synthetic-topic'}),'not_ready');assert.equal(opened,0);
 const f=await fixture({empty:true});assert.equal(await raw(f.s,'meta','memory:config'),undefined);assert.equal((await scope(f)).available,true);assert.equal(await raw(f.s,'meta','memory:config'),undefined);
});

for(const variant of ['denied','never','section','other_profile_denied','other_profile_never'])test('CTX4-03 all actual shared placements retain '+variant+' veto even after allowed ordering',async()=>{
 const f=await fixture({input:true});const uuid=f.s.uuid;f.s.uuid=()=>`zz-restricted-${op()}`;const other=await createTopic(f.s);f.s.uuid=uuid;await place(f.s,f.entry.id,other);
 if(variant==='section')await f.s.foundationWrite(t=>t.put('meta',{id:key('section',other.id,other.sectionId),kind:'section',version:1,topicId:other.id,sectionId:other.sectionId,excluded:true}));
 else await deny(f,other.id,variant.includes('never')?'never':'denied',variant.startsWith('other_profile')?'private-profile':'default');
 // The production writer never grants; this is a retained legacy allow on the
 // target. The trusted reader still obtains all current owners itself.
 await f.s.foundationWrite(t=>t.put('meta',{id:key('topic','default',f.topic.id),kind:'topic',version:1,profileId:'default',topicId:f.topic.id,decision:'allowed',layoutGeneration:1}));
 const result=await scope(f);assert.equal(evaluate(result).reason,'legacy_restricted');assert.ok(result.scope.topicIds.includes(other.id));
 assert.ok(result.scope.sections.some(s=>s.topicId===other.id&&s.sectionId===other.sectionId));
});

test('CTX4-03 extra excluded placement still supplies a negative witness; entry.topics is never authority',async()=>{
 const f=await fixture(),other=await createTopic(f.s);await place(f.s,f.entry.id,other);await deny(f,other.id);
 await change(f.s,'placements',JSON.stringify([other.id,1,f.entry.id]),p=>{p.excludedByUser=true;});
 await change(f.s,'thoughts',f.entry.id,e=>{e.topics=[f.topic.id];});
 const result=await scope(f);assert.equal(evaluate(result).reason,'legacy_restricted');assert.ok(result.scope.topicIds.includes(other.id));
});

test('CTX4-03 common Input does not create a new cross-Entry Topic permission policy',async()=>{
 const f=await fixture({input:true}),other=await createTopic(f.s),sibling=await derived(f.s,[f.input.id]);await place(f.s,sibling.id,other);await deny(f,other.id);
 const result=await scope(f);assert.equal(evaluate(result).reason,'policy_allowed');assert.deepEqual(result.scope.topicIds,[f.topic.id]);assert.deepEqual(result.scope.entryIds,[f.entry.id]);
 await f.m.exclude({inputId:f.input.id,excluded:true});assert.equal(evaluate(await scope(f)).reason,'legacy_restricted');
});

test('CTX4-03 current generation excludes historical memberships and removed placements',async()=>{
 const f=await fixture(),other=await createTopic(f.s);await place(f.s,f.entry.id,other);
 const e=await raw(f.s,'thoughts',f.entry.id),t=await raw(f.s,'topics',other.id);await f.s.placeEntry({entryId:e.id,topicId:t.id,expectedEntryRevision:e.revision,expectedTopicRevision:t.organizationRevision,expectedPlacementRevision:0,remove:true,operationId:op()});await deny(f,other.id);
 const result=await scope(f);assert.equal(evaluate(result).reason,'policy_allowed');assert.deepEqual(result.scope.topicIds,[f.topic.id]);
});

async function merge(s,a,b){await s.startLayout({kind:'topic_merge',topicId:a.id,survivorId:b.id,expectedTopicRevision:(await raw(s,'topics',a.id)).organizationRevision,expectedSurvivorRevision:(await raw(s,'topics',b.id)).organizationRevision,operationId:op()});await s.drainLibraryMaintenance();return (await s.revisions({kind:'topic',entityId:b.id})).items.find(x=>x.reason==='merge');}
async function restore(s,b,revision,side){return s.restoreRevision({id:revision.id,side,expectedRevision:(await raw(s,'topics',b.id)).revision,operationId:op()});}
for(const kind of ['topic','section'])test('CTX4-03 raw '+kind+' restriction ancestry reaches a merged survivor without allow transfer',async()=>{
 const f=await fixture(),source=await createTopic(f.s);await merge(f.s,source,f.topic);
 // Existing-file legacy evidence may refer to the old identity. Preserve it.
 await f.s.foundationWrite(t=>t.put('meta',kind==='topic'?{id:key('topic','retained',source.id),kind,version:1,profileId:'retained',topicId:source.id,decision:'denied',layoutGeneration:1}:{id:key('section',source.id,source.sectionId),kind,version:1,topicId:source.id,sectionId:source.sectionId,excluded:true}));
 const result=await scope(f);assert.equal(evaluate(result).reason,'legacy_restricted');assert.ok(result.snapshot.topics.some(t=>t.id===source.id&&t.redirectTo===f.topic.id));
 refused(await readContextTopicScope(f.s,{topicId:source.id}),'topic_unavailable');
});

for(const variant of ['missing','cycle','incompatible'])test('CTX4-03 refuses '+variant+' restrictive ancestry without partial output',async()=>{
 const f=await fixture(),other=await createTopic(f.s);await deny(f,other.id);
 if(variant==='missing')await f.s.foundationWrite(t=>t.delete('topics',other.id));
 else await change(f.s,'topics',other.id,t=>{t.redirectTo=variant==='cycle'?other.id:f.topic.id;t.lifecycle=variant==='incompatible'?'removed':'merged';t.identity.noRecreation=true;});
 refused(await scope(f));
});

for(const variant of ['entry','input','section'])test('CTX4-03 direct legacy '+variant+' exclusion is retained by actual scope production',async()=>{
 const f=await fixture({input:true});await f.m.exclude({excluded:true,...(variant==='entry'?{entryId:f.entry.id}:variant==='input'?{inputId:f.input.id}:{topicId:f.topic.id,sectionId:f.topic.sectionId})});assert.equal(evaluate(await scope(f)).reason,'legacy_restricted');
});

for(const variant of ['excluded','removed','historical_purged','trashed','hidden','source_changed'])test('CTX4-03 actual source/Input '+variant+' cannot remain locally eligible',async()=>{
 const f=await fixture({input:true});
 if(variant==='excluded'||variant==='removed')await inputEdit(f.s,f.input.id,{excluded:true});
 if(variant==='historical_purged')await admitPreGatePurgeFixture(f.s,f.input.sourceRecordId);
 if(variant==='trashed')await f.s.trash(f.input.sourceRecordId);
 if(variant==='hidden')await f.s.update(f.input.sourceRecordId,{hidden:true});
 if(variant==='source_changed')await inputEdit(f.s,f.input.id,{libraryText:'SYNTHETIC_CHANGED_INPUT_BODY'});
 const value=await scope(f);if(value.available)assert.equal(evaluate(value).reason,'content_unavailable');else refused(value);
});

test('CTX4-03 actual processing filter is rechecked inside the same read transaction',async()=>{
 const f=await fixture({empty:true});await f.s.capture(capture((await f.s.status()).epoch,'synthetic-filtered','继续'));
 const input=(await f.s.snapshot()).library.blocks.find(x=>x.id!==f.input.id),entry=await derived(f.s,[input.id]);await place(f.s,entry.id,f.topic);
 assert.equal(evaluate(await scope(f)).reason,'policy_allowed');await f.s.setFilterMode('light');await new FilterRunner(f.s).wake();
 assert.equal(evaluate(await scope(f)).reason,'content_unavailable');
});

for(const lifecycle of ['removed','invalidated','quarantined','stale'])test('CTX4-03 stale/deleted Entry '+lifecycle+' fails closed and preserves saved bodies',async()=>{
 const f=await fixture();
 if(lifecycle==='removed')await f.s.removeEntry({id:f.entry.id,expectedRevision:(await raw(f.s,'thoughts',f.entry.id)).revision,operationId:op()});
 else await change(f.s,'thoughts',f.entry.id,e=>{if(lifecycle==='stale'){e.freshness='stale';e.staleReasons=['source_updated'];}else e.lifecycle=lifecycle;});
 const before=await freeze(f.s),value=await scope(f);if(value.available)assert.equal(evaluate(value).reason,'content_unavailable');else refused(value);assert.deepEqual(await freeze(f.s),before);
});

test('CTX4-03 traverses every target Entry, Section and shared placement beyond 100 and 144',async()=>{
 const f=await fixture({empty:true}),expected=[];
 for(let n=0;n<151;n++){const e=await independent(f.s);expected.push(e.id);await place(f.s,e.id,f.topic);}
 const extraSections=[];for(let n=0;n<101;n++){const t=await raw(f.s,'topics',f.topic.id);extraSections.push(await f.s.createSection({topicId:t.id,title:'Synthetic section '+n,expectedTopicRevision:t.organizationRevision,operationId:op()}));}
 const shared=expected.at(-1),others=[];for(let n=0;n<102;n++){const other=await createTopic(f.s,'Synthetic other '+n);others.push(other);await place(f.s,shared,other);}
 const value=await scope(f);assert.equal(evaluate(value).reason,'policy_allowed');assert.deepEqual(new Set(value.scope.entryIds),new Set(expected));assert.equal(value.scope.topicIds.length,103);assert.equal(value.scope.sections.length,204);
 await deny(f,others.at(-1).id);assert.equal(evaluate(await scope(f)).reason,'legacy_restricted');
});

test('CTX4-03 validates all legacy pages before dropping private profiles/activity; malformed rows refuse',async()=>{
 const f=await fixture();await f.m.ready();
 await f.s.foundationWrite(async t=>{for(let n=0;n<151;n++){const profileId='synthetic-'+String(n).padStart(3,'0');await t.put('meta',{...profileDefault(),id:key('profile',profileId),profileId,instruction:'SYNTHETIC_PRIVATE_PROFILE_INSTRUCTION'});}await t.put('meta',{id:'memory:activity:synthetic',kind:'activity',version:1,createdAt:new Date().toISOString(),profileId:'default',queryDigest:'a'.repeat(64),topicIds:[],entryIds:[],action:'permission'});});
 const value=await scope(f);assert.equal(evaluate(value).reason,'policy_allowed');assert.deepEqual(value.snapshot.legacyRows.map(r=>r.kind),['config']);
 await f.s.foundationWrite(t=>t.put('meta',{id:'memory:profile:zz-invalid',kind:'profile',version:1,instruction:'SYNTHETIC_PRIVATE_PROFILE_INSTRUCTION'}));refused(await scope(f),'legacy_unavailable');
});

test('CTX4-03 exact hard scope budget refuses instead of claiming a truncated permission set',async()=>{
 const f=await fixture();assert.equal(CONTEXT_TOPIC_SCOPE_LIMITS.refs,4096);
 await f.s.foundationWrite(async t=>{for(let i=0;i<=4096;i++)await t.put('meta',{id:key('input','synthetic-extra-'+i),kind:'input',version:1,inputId:'synthetic-extra-'+i,excluded:true});});
 const before=await freeze(f.s);refused(await scope(f),'scope_budget');assert.deepEqual(await freeze(f.s),before);
});

for(const variant of ['empty_nonterminal','repeated_cursor','omitted_next'])test('CTX4-03 broken page '+variant+' never certifies partial facts',async()=>{
 const f=await fixture(),transaction=f.s.repository.transaction.bind(f.s.repository);
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,t=>{const original=t.primaryRangePage.bind(t);t.primaryRangePage=async(name,options)=>{const page=await original(name,options);if(name==='sections'){if(variant==='empty_nonterminal')return {rows:[],next:'synthetic'};if(variant==='omitted_next')return {rows:page.rows};return {rows:page.rows,next:options.after??page.rows[0].key};}return page;};return fn(t);},stores);
 refused(await scope(f),'incomplete_page');
});

test('CTX4-03 expected authority is checked against fresh repository facts',async()=>{
 const f=await fixture(),before=await scope(f);assert.equal((await readContextTopicScope(f.s,{topicId:f.topic.id,expectedAuthority:before.snapshot.currentAuthority})).available,true);
 await f.c.change({kind:'access',operationId:op(),epoch:'initial',key:'inputs',enabled:false,expectedRevision:1});refused(await readContextTopicScope(f.s,{topicId:f.topic.id,expectedAuthority:before.snapshot.currentAuthority}),'stale_authority');assert.equal(evaluate(await scope(f),{...before.binding,enabled:true}).reason,'inputs_off');
});

test('CTX4-03 rename, normal append and dormancy retain the selection binding',async()=>{
 const f=await fixture(),before=await scope(f);await f.s.renameTopic({id:f.topic.id,name:'Synthetic renamed stable object',expectedRevision:(await raw(f.s,'topics',f.topic.id)).revision,operationId:op()});
 const next=await independent(f.s);await place(f.s,next.id,f.topic);let value=await scope(f);assert.deepEqual(value.binding,before.binding);assert.equal(evaluate(value,{...before.binding,enabled:true}).reason,'policy_allowed');
 await change(f.s,'topics',f.topic.id,t=>{t.pinKey=1;setTopicLifecycle(t,'dormant',{actor:'ai',operationId:op(),at:new Date().toISOString()});});value=await scope(f);assert.deepEqual(value.binding,before.binding);assert.equal(evaluate(value,{...before.binding,enabled:true}).reason,'policy_allowed');
});

test('CTX4-03 actual merge and repeated Undo cannot revive source or survivor selections',async()=>{
 const f=await fixture({empty:true}),source=await createTopic(f.s),ids=[source.id,f.topic.id],original=new Map();
 for(const id of ids){const value=await readContextTopicScope(f.s,{topicId:id});original.set(id,{...value.binding,enabled:true});assert.equal(evaluate(value).reason,'policy_allowed');}
 const revision=await merge(f.s,source,f.topic);await restore(f.s,f.topic,revision,'before');const renewed=new Map();
 for(const id of ids){const value=await readContextTopicScope(f.s,{topicId:id});assert.equal(evaluate(value,original.get(id)).reason,'selection_stale');renewed.set(id,{...value.binding,enabled:true});assert.equal(evaluate(value).reason,'policy_allowed');assert.ok(value.snapshot.organizationReservations.length);}
 await restore(f.s,f.topic,revision,'after');await restore(f.s,f.topic,revision,'before');
 for(const id of ids){const value=await readContextTopicScope(f.s,{topicId:id});assert.equal(evaluate(value,original.get(id)).reason,'selection_stale');assert.equal(evaluate(value,renewed.get(id)).reason,'selection_stale');assert.equal(evaluate(value).reason,'policy_allowed');}
});

for(const variant of ['missing','null','malformed','changed'])test('CTX4-03 structural receipt '+variant+' reservation refuses or invalidates saved choice',async()=>{
 const f=await fixture({empty:true}),source=await createTopic(f.s),revision=await merge(f.s,source,f.topic);await restore(f.s,f.topic,revision,'before');const before=await scope(f),id=before.binding.organizationOperationId;assert.ok(id);
 if(variant==='missing')await f.s.foundationWrite(t=>t.delete('operationReceipts',id));
 else await change(f.s,'operationReceipts',id,r=>{if(variant==='null')r.result=null;if(variant==='malformed')r.result={id:r.ownerId,body:'SYNTHETIC_PRIVATE_RECEIPT_BODY'};if(variant==='changed')r.digest='f'.repeat(64);});
 const value=await scope(f);if(variant==='changed')assert.equal(evaluate(value,{...before.binding,enabled:true}).reason,'selection_stale');else refused(value,'organization_unavailable');
 assert.ok(!JSON.stringify(value).includes('SYNTHETIC_PRIVATE_RECEIPT_BODY'));
});

for(const variant of ['identity_missing','alias_invalid','no_recreation_mismatch','default_section_missing','missing_entry','missing_input','missing_dependency','unready','sealed','consent','gate','filter_unknown'])test('CTX4-03 missing/corrupt owner '+variant+' has no partial positive snapshot',async()=>{
 const f=await fixture({input:true});
 if(variant==='identity_missing')await change(f.s,'topics',f.topic.id,t=>{delete t.identity;});
 if(variant==='alias_invalid')await change(f.s,'topics',f.topic.id,t=>{t.identity.aliases=[{token:'invalid'}];});
 if(variant==='no_recreation_mismatch')await change(f.s,'topics',f.topic.id,t=>{t.identity.noRecreation=true;});
 if(variant==='default_section_missing')await f.s.foundationWrite(t=>t.delete('sections',JSON.stringify([f.topic.id,1,f.topic.sectionId])));
 if(variant==='missing_entry')await f.s.foundationWrite(t=>t.delete('thoughts',f.entry.id));
 if(variant==='missing_input')await f.s.foundationWrite(t=>t.delete('blocks',f.input.id));
 if(variant==='missing_dependency')await f.s.foundationWrite(t=>t.delete('dependencies',JSON.stringify([f.input.id,'entry',f.entry.id])));
 if(variant==='unready')await change(f.s,'meta','thought-binding:v1',m=>{m.complete=false;});
 if(variant==='sealed')await change(f.s,'meta','thought-library',m=>{m.sealed=1;});
 if(variant==='consent')f.s.controlCache.settings.consentVersion=null;
 if(variant==='gate')await change(f.s,'meta','gate',m=>{m.epoch++;});
 if(variant==='filter_unknown')await change(f.s,'meta','smart-filter',m=>{m.mode='unknown';});
 const before=await freeze(f.s);refused(await scope(f));assert.deepEqual(await freeze(f.s),before);
});

test('CTX4-03 capture pause preserves consented local Topic scope and binding',async()=>{
 const f=await fixture({input:true}),before=await scope(f);await f.s.setEnabled(false);assert.deepEqual(await f.s.status(),{enabled:false,consented:true,epoch:2,adapterVersion:'0.3.0'});
 const value=await scope(f);assert.equal(evaluate(value,{...before.binding,enabled:true}).reason,'policy_allowed');assert.deepEqual(value.binding,before.binding);
});

test('CTX4-03 all consumed Input references beyond one page come from production evidence',async()=>{
 const f=await fixture({empty:true});const ids=[];
 for(let n=0;n<103;n++){
  await f.s.capture(capture((await f.s.status()).epoch,'synthetic-input-'+n,'Synthetic input body '+n));
  const input=(await rows(f.s,'blocks')).find(x=>x.value.provenance.some(p=>p.sourceRecordId===x.value.originalTextReference)&&x.value.libraryText===null&&x.value.id!==f.input.id&&!ids.includes(x.id));
  ids.push(input.id);const entry=await derived(f.s,[input.id]);await place(f.s,entry.id,f.topic);
 }
 const value=await scope(f);assert.equal(evaluate(value).reason,'policy_allowed');assert.deepEqual(new Set(value.scope.inputIds),new Set(ids));assert.equal(value.scope.entryIds.length,103);
});

test('CTX4-03 a committed Section merge remains readable, but an imported old Section veto cannot disappear',async()=>{
 const f=await fixture(),topic=await raw(f.s,'topics',f.topic.id),section=await f.s.createSection({topicId:topic.id,expectedTopicRevision:topic.organizationRevision,title:'Synthetic old section',operationId:op()});
 await f.s.startLayout({kind:'section_merge',topicId:topic.id,sectionId:section.sectionId,targetSectionId:f.topic.sectionId,expectedTopicRevision:(await raw(f.s,'topics',topic.id)).organizationRevision,operationId:op()});await f.s.drainLibraryMaintenance();
 assert.equal(evaluate(await scope(f)).reason,'policy_allowed');
 await f.s.foundationWrite(t=>t.put('meta',{id:key('section',topic.id,section.sectionId),kind:'section',version:1,topicId:topic.id,sectionId:section.sectionId,excluded:true}));refused(await scope(f),'legacy_unavailable');
});

test('CTX4-03 premature terminal page and inconsistent primary/index membership refuse',async()=>{
 const f=await fixture(),transaction=f.s.repository.transaction.bind(f.s.repository);
 f.s.repository.transaction=(write,fn,stores)=>transaction(write,t=>{const page=t.primaryRangePage.bind(t);t.primaryRangePage=async(name,options)=>name==='placements'?{rows:[],next:null}:page(name,options);return fn(t);},stores);
 refused(await scope(f),'incomplete_page');f.s.repository.transaction=transaction;
 await f.s.foundationWrite(async t=>{const id=JSON.stringify([f.topic.id,1,f.entry.id]),placement=await t.get('placements',id);await t.delete('placements',id);placement.id='synthetic-corrupt-key';await t.put('placements',placement);});refused(await scope(f),'membership_unavailable');
});

test('CTX4-03 revoked consent and sealed Thought admission stop before any material read',async()=>{
 for(const gate of ['consent','sealed']){
  const f=await fixture({input:true});if(gate==='consent')f.s.controlCache.settings.consentVersion=null;else await change(f.s,'meta','thought-library',r=>{r.sealed=1;});
  const transaction=f.s.repository.transaction.bind(f.s.repository);let reads=0;
  f.s.repository.transaction=(write,fn,stores)=>transaction(write,t=>{const get=t.get.bind(t);t.get=(name,id)=>{if(['records','blocks','thoughts','topics'].includes(name))reads++;return get(name,id);};return fn(t);},stores);
  refused(await scope(f));assert.equal(reads,0);
 }
});

for(const variant of ['thought-sequence','thought-epoch','input-delta-sequence','revision-sequence','backup-data-generation','recovery-restore-epoch','smart-filter'])test('CTX4-03 corrupt '+variant+' cannot leak private text through the freshness token',async()=>{
 const f=await fixture({empty:true});
 await f.s.repository.transaction(true,async t=>{if(variant==='smart-filter'){const row=await t.get('meta',variant);row.policyEpoch='SYNTHETIC_PRIVATE_AUTHORITY_TEXT';await t.put('meta',row);}else await t.put('meta',{id:variant,value:'SYNTHETIC_PRIVATE_AUTHORITY_TEXT'});});
 const value=await scope(f);refused(value);assert.ok(!JSON.stringify(value).includes('SYNTHETIC_PRIVATE_AUTHORITY_TEXT'));
});

for(const variant of ['missing','null','false','malformed'])test('CTX4-03 actual existing-file restore of '+variant+' reservation never mints a binding',async()=>{
 const f=await fixture({empty:true}),marker=op();
 await f.s.foundationWrite(async t=>{
  const topic=await t.get('topics',f.topic.id);markHuman(topic,'organization',marker,f.s.clock());await t.put('topics',topic);
  if(variant!=='missing')await t.put('operationReceipts',{id:marker,namespace:'thought-library',schemaVersion:1,ownerId:topic.id,operationSequence:1,createdAt:f.s.clock(),digest:'a'.repeat(64),result:variant==='null'?null:variant==='false'?false:{id:topic.id,body:'SYNTHETIC_PRIVATE_RECEIPT_BODY'}});
 });
 const file=await exported(new ExistingFileFixture(f.s)),backup=new BackupService(f.s),stage=await prepared(backup,file),preview=await backup.previewRestore({sessionId:stage.sessionId,mode:'replace'});assert.equal(preview.canRestore,true,preview.reason);
 await backup.restore({sessionId:stage.sessionId,confirmation:preview.integrity,mode:'replace',targetGeneration:preview.targetGeneration,confirmReplace:true});
 const before=await freeze(f.s),value=await scope(f);refused(value,'organization_unavailable');assert.deepEqual(await freeze(f.s),before);assert.ok(!JSON.stringify(value).includes('SYNTHETIC_PRIVATE_RECEIPT_BODY'));
});

test('CTX4-03 actual existing-file restore with a different valid digest agrees with the stale Entry owner',async()=>{
 const f=await fixture({input:true});await change(f.s,'dependencies',JSON.stringify([f.input.id,'entry',f.entry.id]),d=>{d.fieldDigests.body='f'.repeat(64);});
 const file=await exported(new ExistingFileFixture(f.s)),backup=new BackupService(f.s),stage=await prepared(backup,file),preview=await backup.previewRestore({sessionId:stage.sessionId,mode:'replace'});assert.equal(preview.canRestore,true,preview.reason);
 await backup.restore({sessionId:stage.sessionId,confirmation:preview.integrity,mode:'replace',targetGeneration:preview.targetGeneration,confirmReplace:true});
 const owner=await f.s.entry(f.entry.id),before=await freeze(f.s),result=await scope(f);assert.equal(owner.freshness,'stale');assert.ok(owner.staleReasons.includes('source_updated'));
 assert.equal(result.scope.eligibility,'ineligible');assert.equal(evaluate(result).reason,'content_unavailable');assert.deepEqual(await freeze(f.s),before);
});

test('CTX4-03 an ordinary note-only edit keeps body-only evidence current after invalidation maintenance',async()=>{
 const f=await fixture({input:true}),binding=(await scope(f)).binding;
 await inputEdit(f.s,f.input.id,{note:'SYNTHETIC_PRIVATE_NOTE_ONLY_EDIT'});await f.s.drainInvalidations();
 const dep=await raw(f.s,'dependencies',JSON.stringify([f.input.id,'entry',f.entry.id])),input=await raw(f.s,'inputStates',f.input.id),owner=await f.s.entry(f.entry.id);assert.ok(input.contentRevision>dep.basedOnContentRevision);assert.equal(dep.validatedAgainstContentRevision,input.contentRevision);assert.equal(owner.freshness,'current');assert.deepEqual(owner.staleReasons,[]);
 const before=await freeze(f.s),result=await scope(f);assert.equal(result.scope.eligibility,'eligible');assert.equal(evaluate(result,{...binding,enabled:true}).reason,'policy_allowed');assert.deepEqual(await freeze(f.s),before);assert.ok(!JSON.stringify(result).includes('SYNTHETIC_PRIVATE_NOTE_ONLY_EDIT'));
});

for(const drain of [false,true])test('CTX4-03 a changed selected body is ineligible '+(drain?'after':'before')+' invalidation maintenance',async()=>{
 const f=await fixture({input:true});await inputEdit(f.s,f.input.id,{libraryText:'SYNTHETIC_PRIVATE_CHANGED_SELECTED_BODY'});if(drain)await f.s.drainInvalidations();
 const owner=await f.s.entry(f.entry.id),before=await freeze(f.s),result=await scope(f);assert.equal(owner.freshness,'stale');assert.ok(owner.staleReasons.includes('source_updated'));assert.equal(evaluate(result).reason,'content_unavailable');assert.deepEqual(await freeze(f.s),before);
});

test('CTX4-03 selected note evidence is hashed as well as body evidence',async()=>{
 const f=await fixture({empty:true}),evidence=await f.s.evidenceFor([{inputId:f.input.id,role:'primary',selectedFields:['body','note']}]),entry=await f.s.createEntry({operationId:op(),actor:'user',body:'SYNTHETIC_NOTE_AND_BODY_DERIVED',type:'idea',formation:'explicit',evidence});await place(f.s,entry.id,f.topic);
 assert.equal(evaluate(await scope(f)).reason,'policy_allowed');await inputEdit(f.s,f.input.id,{note:'SYNTHETIC_CHANGED_SELECTED_NOTE'});
 assert.equal((await f.s.entry(entry.id)).freshness,'stale');assert.equal(evaluate(await scope(f)).reason,'content_unavailable');
});

for(const status of ['source_updated','version_unknown'])test('CTX4-03 follows canonical selected-field '+status+' semantics',async()=>{
 const f=await fixture({input:true});await change(f.s,'dependencies',JSON.stringify([f.input.id,'entry',f.entry.id]),d=>{d.status=status;});
 const owner=await f.s.entry(f.entry.id),result=await scope(f);assert.equal(owner.freshness,status==='version_unknown'?'stale':'current');assert.equal(evaluate(result).reason,status==='version_unknown'?'content_unavailable':'policy_allowed');
});

// Hold exactly the scope reader's first WebCrypto call. Mutations continue
// through their real owners using the original digest implementation. A live
// IDB transaction here would make the write hang or fail the explicit assertion.
async function heldDigest(f,mutate){
 const subtle=crypto.subtle,original=subtle.digest,transaction=f.s.repository.transaction.bind(f.s.repository);let active=0,held=false,start,release;
 const started=new Promise(resolve=>{start=resolve;}),resume=new Promise(resolve=>{release=resolve;});
 f.s.repository.transaction=async(...args)=>{active++;try{return await transaction(...args);}finally{active--;}};
 subtle.digest=async function(...args){if(!held){held=true;assert.equal(active,0,'WebCrypto starts only after material transaction completion');start();await resume;}return original.apply(this,args);};
 let pending;
 try{
  pending=scope(f);await Promise.race([started,pending.then(()=>assert.fail('scope returned before selected-field hashing'))]);
  await mutate();const before=await freeze(f.s);release();const result=await pending;refused(result);assert.deepEqual(await freeze(f.s),before);return result;
 }finally{release();if(pending)await pending;subtle.digest=original;f.s.repository.transaction=transaction;}
}

for(const variant of ['input_write','legacy_denial','context_revoke','consent_revoke','restore','capture_pause','sealed','malformed_authority'])test('CTX4-03 held digest refuses concurrent '+variant+' and returns no partial result',async()=>{
 const f=await fixture({input:true}),file=variant==='restore'?await exported(new ExistingFileFixture(f.s)):null;
 const value=await heldDigest(f,async()=>{
  if(variant==='input_write')await inputEdit(f.s,f.input.id,{libraryText:'SYNTHETIC_PRIVATE_CONCURRENT_BODY'});
  if(variant==='legacy_denial')await deny(f,f.topic.id);
  if(variant==='context_revoke')await f.c.change({kind:'access',operationId:op(),epoch:'initial',key:'global',enabled:false,expectedRevision:1});
  if(variant==='consent_revoke')f.s.controlCache.settings.consentVersion=null;
  if(variant==='capture_pause')await f.s.setEnabled(false);
  if(variant==='sealed')await change(f.s,'meta','thought-library',r=>{r.sealed=1;});
  if(variant==='malformed_authority')await f.s.repository.transaction(true,t=>t.put('meta',{id:'thought-epoch',value:'SYNTHETIC_PRIVATE_BAD_AUTHORITY'}));
  if(variant==='restore'){const backup=new BackupService(f.s),stage=await prepared(backup,file),preview=await backup.previewRestore({sessionId:stage.sessionId,mode:'replace'});assert.equal(preview.canRestore,true,preview.reason);await backup.restore({sessionId:stage.sessionId,confirmation:preview.integrity,mode:'replace',targetGeneration:preview.targetGeneration,confirmReplace:true});}
 });
 assert.equal(value.reason,variant==='consent_revoke'?'consent_unavailable':variant==='sealed'?'not_ready':variant==='malformed_authority'?'authority_unavailable':'stale_authority');assert.ok(!JSON.stringify(value).includes('SYNTHETIC_PRIVATE'));
});

test('CTX4-03 transient hashing has explicit UTF-8 byte/work limits and refuses without truncation or crypto',async()=>{
 const f=await fixture({empty:true}),text='SYNTHETIC_PRIVATE_HASH_BUDGET_'+'界'.repeat(30000),bytes=new TextEncoder().encode(text).byteLength;
 assert.equal(CONTEXT_TOPIC_SCOPE_LIMITS.hashFields,2*CONTEXT_TOPIC_SCOPE_LIMITS.refs);assert.equal(CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes,8*1024*1024);
 await inputEdit(f.s,f.input.id,{libraryText:text});
 const count=Math.floor(CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes/bytes)+1;assert.ok(count*text.length<CONTEXT_TOPIC_SCOPE_LIMITS.hashBytes,'UTF-8 bytes, not string length, exhaust the budget');
 for(let i=0;i<count;i++){const entry=await derived(f.s,[f.input.id]);await place(f.s,entry.id,f.topic);}
 const before=await freeze(f.s),subtle=crypto.subtle,original=subtle.digest;let hashes=0;
 try{subtle.digest=async function(...args){hashes++;return original.apply(this,args);};const result=await scope(f);refused(result,'hash_budget');assert.equal(hashes,0);assert.ok(!JSON.stringify(result).includes('SYNTHETIC_PRIVATE_HASH_BUDGET'));}finally{subtle.digest=original;}
 assert.deepEqual(await freeze(f.s),before);
});

test('CTX4-03 unavailable crypto produces a finite body-free failure',async()=>{
 const f=await fixture({input:true}),before=await freeze(f.s),subtle=crypto.subtle,original=subtle.digest;
 try{subtle.digest=async()=>{throw Error('SYNTHETIC_PRIVATE_CRYPTO_FAILURE');};const result=await scope(f);refused(result,'hash_unavailable');assert.ok(!JSON.stringify(result).includes('SYNTHETIC_PRIVATE_CRYPTO_FAILURE'));}finally{subtle.digest=original;}
 assert.deepEqual(await freeze(f.s),before);
});

test('CTX4-03 excessive selected-field work refuses even below the transient byte budget',async()=>{
 const f=await fixture({input:true});for(let i=0;i<2;i++){const entry=await derived(f.s,[f.input.id]);await place(f.s,entry.id,f.topic);}
 // Malformed retained multiplicity must not turn a small Input into unbounded
 // crypto work. Nothing is truncated or interpreted as a positive assessment.
 await f.s.foundationWrite(async t=>{for(const row of await t.all('dependencies')){row.selectedFields=Array(4096).fill('body');await t.put('dependencies',row);}});
 const before=await freeze(f.s),subtle=crypto.subtle,original=subtle.digest;let hashes=0;
 try{subtle.digest=async function(...args){hashes++;return original.apply(this,args);};refused(await scope(f),'hash_budget');assert.equal(hashes,0);}finally{subtle.digest=original;}
 assert.deepEqual(await freeze(f.s),before);
});
