import test from 'node:test';
import assert from 'node:assert/strict';
import {MAINTENANCE_TOPIC_WIRE_SCHEMA,MAINTENANCE_TOPIC_WIRE_INSTRUCTIONS,validateMaintenanceTopicWire,decodeMaintenanceTopicWire} from '../core/ai-usage/maintenance-topic-wire.js';
import {MAINTENANCE_SERVICE_RESPONSE_SCHEMA,MAINTENANCE_SERVICE_FILTER_RESPONSE_SCHEMA} from '../core/ai-usage/maintenance-service-response-schema.js';
import {boundedSchema,snapshot as dataSnapshot} from '../core/ai-usage/qwen-request-data.js';
import {createMaintenancePayload} from '../core/ai-usage/maintenance-payload.js';
import {ENVELOPES} from '../core/ai-usage/admission-policy.js';
import {canonical} from '../core/ai-usage/contracts.js';
import {hashText} from '../core/dedupe.js';
import {topicPairKey} from '../core/topic-identity.js';
import {TopicFormationService} from '../core/topic-formation.js';
import {evaluateTopicFormation} from '../core/topic-formation-policy.js';
import {serviceFixture} from './harness/qwen-client-service-fixture.mjs';
import {formationFixture,assessment,citation,parameters,request,runFormation,rows,raw,op,topic,addInput,inputEdit,snapshot} from './harness/topic-03.mjs';

const plain=value=>JSON.parse(JSON.stringify(value));
const citations=values=>values.map(({field,...span})=>span);
const claim=value=>({...value,citations:citations(value.citations)});
const neutral=()=>({kind:'default',sectionId:'',name:'',aspect:{reason:'unknown',citations:[]},returnValue:{reason:'none',citations:[]},relations:[]});
function toWire(value){
 const section={...neutral(),...value.section};
 section.aspect=claim(section.aspect);section.returnValue=claim(section.returnValue);section.relations=section.relations.map(claim);
 const {relations:sectionRelations,aspect,returnValue,...rest}=section,wireSection={...rest,aspectReason:aspect.reason,aspectCitations:aspect.citations,returnReason:returnValue.reason,returnCitations:returnValue.citations};
 return plain({...value,name:value.name??'',substance:claim(value.substance),boundary:claim(value.boundary),returnValue:claim(value.returnValue),continuity:claim(value.continuity),evidence:citations(value.evidence),relations:value.relations.map(claim),section:wireSection,sectionRelations,
  entries:value.entries.map(({additional,...e})=>({...e,span:citations([e.span])[0],entryId:e.entryId??''})),additionalPlacements:value.entries.flatMap((e,entryIndex)=>e.additional.map(p=>({entryIndex,topicId:p.topicId,...claim(p.returnValue)})))});
}
const material=view=>createMaintenancePayload({}, {view,sourceCount:view.inputs.length}, {maxInputs:20,maxContentBytes:262144,maxRequestBytes:262144}).material;
const decode=(view,value)=>decodeMaintenanceTopicWire(toWire(value),material(view),view);
const reuse=(view,id,section={kind:'default'})=>{const value=assessment(view,{section});value.relations.forEach(r=>r.relation=r.topicId===id?'same':'distinct');return value;};
const service=(f,decide)=>new TopicFormationService(f.s,{...f.serviceOptions,parameters,decision:{version:'synthetic-topic-wire-v1',assess:view=>decode(view,decide(view))}});
const commit=(s,r)=>s.prepare(r).then(handle=>s.commit(handle));
const named=(view,id,name='Pricing decisions')=>({kind:'named',name,aspect:{reason:'recurring_internal_aspect',citations:view.inputs.map(i=>citation(i))},returnValue:{reason:'reading',citations:[citation(view.inputs[0])]},relations:view.sections.filter(s=>s.topicId===id&&!s.isDefault).map(s=>({sectionId:s.sectionId,relation:'distinct',citations:[citation(view.inputs[0])]}))});
async function inspect(f,entryIds=[]){const handle=await f.service.prepareMaterial({scope:f.scope,entryIds});try{return (await f.service.readMaterial(handle)).view;}finally{f.service.releaseMaterial(handle);}}
const rejected=(fn,code='INVALID_RESPONSE')=>assert.throws(fn,error=>error.code===code);
const fullSchema=()=>({...plain(MAINTENANCE_SERVICE_FILTER_RESPONSE_SCHEMA),properties:{...plain(MAINTENANCE_SERVICE_FILTER_RESPONSE_SCHEMA.properties),topic:plain(MAINTENANCE_TOPIC_WIRE_SCHEMA)}});

test('Topic wire compiles as a full closed response within unchanged schema and manifest depth; ordinary profile stays unchanged',()=>{
 const schema=fullSchema();assert.doesNotThrow(()=>boundedSchema(dataSnapshot(schema)));
 assert.equal(MAINTENANCE_SERVICE_RESPONSE_SCHEMA.properties.topic.properties.section.properties.kind.enum[0],'default');
 assert.equal(MAINTENANCE_SERVICE_RESPONSE_SCHEMA.properties.topic.properties.entries.items.properties.additional.maxItems,0);
 assert.equal(Object.hasOwn(MAINTENANCE_SERVICE_RESPONSE_SCHEMA.properties.topic.properties.entries.items.properties,'entryId'),false);
 assert.equal(ENVELOPES.AI_MAINTENANCE.children,2);assert.equal(ENVELOPES.AI_MAINTENANCE.output,2000);
 assert.ok(new TextEncoder().encode(JSON.stringify(schema)).length<16384);assert.ok(MAINTENANCE_TOPIC_WIRE_INSTRUCTIONS.length<8192);
 // Nesting even flat placements under entries fits schema depth eight but
 // exceeds the actual compiler's unchanged whole-manifest snapshot bound.
 const entry=schema.properties.topic.properties.entries.items;
 entry.properties.additional=schema.properties.topic.properties.additionalPlacements;entry.required.push('additional');
 assert.doesNotThrow(()=>boundedSchema(schema));
 assert.throws(()=>dataSnapshot({wire:{responseFormat:{json_schema:{schema}}}}),error=>error.reason==='DATA_BOUND');
});

test('actual qualified request owner binds the complete fragment with original two-child and 2000-token ceilings',async()=>{
 const f=await serviceFixture(),schema=fullSchema();
 f.manifest.wire.instructions=MAINTENANCE_TOPIC_WIRE_INSTRUCTIONS;f.manifest.wire.responseFormat.json_schema.schema=schema;
 f.manifest.profile.responseSchemaDigest=await hashText(canonical(schema));f.manifest.known.responseSchemaDigest=f.manifest.profile.responseSchemaDigest;
 f.manifest.profile.thinking.requestedMaxCompletionTokens=1900;
 Object.assign(f.input.reservationRequest,{childCount:2,outputCap:2000,maxCompletionTokens:1900});
 await f.ledger.reserve(f.input.reservationRequest);const before=f.writes(),bound=await f.owner.bind(f.input);
 assert.equal(bound.status,'BOUND_LOCAL',bound.reason);assert.equal(bound.dispatchAllowed,false);assert.equal(f.writes(),before);
 const body=JSON.parse(bound.envelope.body);assert.deepEqual(body.response_format.json_schema.schema,schema);assert.equal(body.max_completion_tokens,1900);assert.equal(bound.usageBinding.limits.billableOutputCap,2000);
 assert.equal(bound.qualification,'NOT_ESTABLISHED');assert.equal(f.rows().length,1);
 for(const patch of [{childCount:3},{outputCap:2001}]){const g=await serviceFixture();Object.assign(g.input.reservationRequest,patch);assert.equal((await g.owner.bind(g.input)).status,'UNAVAILABLE');assert.equal(g.writes(),0);}
});

test('actual Formation owner routes a new exact Entry into an existing human Section without rewriting its title or order',async()=>{
 const f=await formationFixture(),a=await topic(f.s,'Human project'),section=await f.s.createSection({topicId:a.id,title:'Human custom heading',expectedTopicRevision:0,operationId:op()}),before=await raw(f.s,'sections',section.id);
 const result=await commit(service(f,view=>reuse(view,a.id,{kind:'existing',sectionId:section.sectionId})),request(f));
 assert.equal(result.outcome,'reuse');assert.deepEqual(result.topicIds,[a.id]);assert.equal((await rows(f.s,'placements'))[0].sectionId,section.sectionId);
 assert.deepEqual(await raw(f.s,'sections',section.id),before);assert.equal((await f.s.entry(result.entryIds[0])).body,'Synthetic explicit working input');assert.equal((await rows(f.s,'thoughts')).length,1);
});

test('actual Formation owner creates a justified recurring named Section, keeps human Sections exact and uses one canonical body',async()=>{
 const f=await formationFixture(),a=await topic(f.s,'Human project'),manual=await f.s.createSection({topicId:a.id,title:'Human notes',expectedTopicRevision:0,operationId:op()}),before=await raw(f.s,'sections',manual.id);
 await addInput(f,{text:'Independent packaging and payment-boundary work.'});
 const result=await commit(service(f,view=>reuse(view,a.id,named(view,a.id))),request(f));
 const sections=await rows(f.s,'sections'),created=sections.find(s=>s.title==='Pricing decisions');assert.ok(created);assert.equal(sections.length,3);
 assert.equal((await rows(f.s,'placements'))[0].sectionId,created.sectionId);assert.deepEqual(await raw(f.s,'sections',manual.id),before);assert.equal(result.createdEntryIds.length,1);assert.equal((await rows(f.s,'provenance')).length,1);
});

test('named same-Section judgment reuses the original ID despite a different proposed name',async()=>{
 const f=await formationFixture(),a=await topic(f.s,'Human project'),manual=await f.s.createSection({topicId:a.id,title:'Human exact name',expectedTopicRevision:0,operationId:op()}),before=await raw(f.s,'sections',manual.id);
 const result=await commit(service(f,view=>{const section=named(view,a.id,'Do not rename human Section');section.relations[0].relation='same';return reuse(view,a.id,section);}),request(f));
 assert.equal(result.outcome,'reuse');assert.equal((await rows(f.s,'sections')).length,2);assert.equal((await rows(f.s,'placements'))[0].sectionId,manual.sectionId);assert.deepEqual(await raw(f.s,'sections',manual.id),before);
});

for(const mode of ['one contribution','duplicate citations','incidental','unknown','no return','ambiguous Section','transient name'])test(`named Section ${mode} preserves substantive content under the original default`,async()=>{
 const f=await formationFixture(),a=await topic(f.s,'Human project');
 if(mode==='ambiguous Section')await f.s.createSection({topicId:a.id,title:'Human notes',expectedTopicRevision:0,operationId:op()});
 if(!['one contribution','duplicate citations'].includes(mode))await addInput(f);
 const before=await rows(f.s,'sections');const result=await commit(service(f,view=>{const section=named(view,a.id);
  if(mode==='duplicate citations')section.aspect.citations=Array.from({length:4},()=>citation(view.inputs[0]));
  if(['incidental','unknown'].includes(mode))section.aspect.reason=mode;
  if(mode==='no return')section.returnValue={reason:'none',citations:[]};
  if(mode==='ambiguous Section')section.relations[0]={...section.relations[0],relation:'ambiguous',citations:[]};
  if(mode==='transient name')section.name='next steps';
  return reuse(view,a.id,section);
 }),request(f));
 assert.equal(result.outcome,'reuse');assert.deepEqual(await rows(f.s,'sections'),before);assert.equal((await rows(f.s,'placements'))[0].sectionId,(await raw(f.s,'topics',a.id)).defaultSectionId);assert.equal(result.entryIds.length,1);
});

test('actual Formation owner adds independently useful placement, drops lexical/category/no-evidence extras, and preserves keep-separate',async()=>{
 const f=await formationFixture(),a=await topic(f.s,'Primary object'),b=await topic(f.s,'Useful second object'),c=await topic(f.s,'Similar vocabulary'),d=await topic(f.s,'Broad category'),e=await topic(f.s,'Unsupported extra');
 await f.s.keepTopicsSeparate({sourceId:a.id,targetId:b.id});const constraints=await raw(f.s,'meta',topicPairKey(a.id,b.id));
 const result=await commit(service(f,view=>{const value=reuse(view,a.id);value.entries[0].additional=[{topicId:b.id,returnValue:{reason:'reuse',citations:[citation(view.inputs[0])]}},{topicId:c.id,returnValue:{reason:'lexical',citations:[citation(view.inputs[0])]}},{topicId:d.id,returnValue:{reason:'category',citations:[citation(view.inputs[0])]}},{topicId:e.id,returnValue:{reason:'decision',citations:[]}}];return value;}),request(f));
 assert.deepEqual(new Set(result.topicIds),new Set([a.id,b.id]));assert.equal((await rows(f.s,'thoughts')).length,1);assert.equal((await rows(f.s,'placements')).length,2);assert.equal((await rows(f.s,'provenance')).length,1);assert.deepEqual(await raw(f.s,'meta',topicPairKey(a.id,b.id)),constraints);
});

test('additional Placement citing a different Input is preserved as a claim but rejected by the actual original policy',async()=>{
 const f=await formationFixture(),a=await topic(f.s,'Primary object'),b=await topic(f.s,'Second object'),primary=f.scope[0].inputId;await addInput(f,{text:'Unrelated separate Input for the second object.'});
 const result=await commit(service(f,view=>{const value=reuse(view,a.id);value.entries=[{span:citation(view.inputs.find(i=>i.id===primary)),type:'idea',additional:[{topicId:b.id,returnValue:{reason:'reuse',citations:[citation(view.inputs.find(i=>i.id!==primary))]}}]}];return value;}),request(f));
 assert.deepEqual(result.topicIds,[a.id]);assert.equal((await rows(f.s,'placements')).length,1);
});

test('a qualified actually sent original Entry ID reuses its body for an additional Placement',async()=>{
 const f=await formationFixture(),first=(await runFormation(f)).result,entry=await f.s.entry(first.entryIds[0]),a=first.topicIds[0],b=await topic(f.s,'Second useful object'),beforeBody=entry.body;
 const result=await commit(service(f,view=>{const value=reuse(view,a);value.entries[0].entryId=entry.id;value.entries[0].additional=[{topicId:b.id,returnValue:{reason:'decision',citations:[citation(view.inputs[0])]}}];return value;}),request(f,{entryIds:[entry.id]}));
 assert.deepEqual(result.entryIds,[entry.id]);assert.deepEqual(result.createdEntryIds,[]);assert.equal((await rows(f.s,'thoughts')).length,1);assert.equal((await f.s.entry(entry.id)).body,beforeBody);assert.equal((await rows(f.s,'placements')).length,2);
});

for(const mode of ['excluded','fixed'])test(`actual owner refuses ${mode} human membership after wire mapping, atomically preserving all rows`,async()=>{
 const f=await formationFixture(),first=(await runFormation(f)).result,entry=await f.s.entry(first.entryIds[0]),a=await raw(f.s,'topics',first.topicIds[0]),b=await topic(f.s,'Human destination');
 if(mode==='excluded')await f.s.moveMembership({entryId:entry.id,sourceTopicId:a.id,targetTopicId:b.id,expectedEntryRevision:entry.revision,expectedSourceRevision:a.organizationRevision,expectedTargetRevision:0,operationId:op()});
 else await f.s.fixMembershipSet({entryId:entry.id,expectedRevision:entry.revision,operationId:op()});
 const before=await snapshot(f.s),s=service(f,view=>{const value=reuse(view,mode==='excluded'?b.id:a.id);value.entries[0].entryId=entry.id;value.entries[0].additional=[{topicId:mode==='excluded'?a.id:b.id,returnValue:{reason:'reuse',citations:[citation(view.inputs[0])]}}];return value;});
 await assert.rejects(commit(s,request(f,{entryIds:[entry.id]})));assert.deepEqual(await snapshot(f.s),before);
});

test('existing human Section/order stays fixed and a named proposal cannot materialize an empty Section',async()=>{
 const f=await formationFixture(),first=(await runFormation(f)).result,entry=await f.s.entry(first.entryIds[0]),a=await raw(f.s,'topics',first.topicIds[0]),manual=await f.s.createSection({topicId:a.id,title:'Human home',expectedTopicRevision:a.organizationRevision,operationId:op()});
 const current=await raw(f.s,'topics',a.id),placement=(await rows(f.s,'placements'))[0];
 await f.s.placeEntry({entryId:entry.id,topicId:a.id,sectionId:manual.sectionId,expectedEntryRevision:entry.revision,expectedTopicRevision:current.organizationRevision,expectedPlacementRevision:placement.revision,operationId:op()});
 await addInput(f);const before=await Promise.all(['thoughts','placements','sections'].map(table=>rows(f.s,table)));
 for(const kind of ['existing','named'])await commit(service(f,view=>{const value=reuse(view,a.id,kind==='existing'?{kind,sectionId:a.defaultSectionId}:named(view,a.id));value.entries[0].entryId=entry.id;value.entries[0].span=citation(view.inputs.find(i=>i.id===entry.workingInputId));return value;}),request(f,{entryIds:[entry.id]}));
 assert.deepEqual(await Promise.all(['thoughts','placements','sections'].map(table=>rows(f.s,table))),before);
});

test('removed identity and keep-separate ambiguity cannot be overwritten by section/extra proposals',async()=>{
 for(const mode of ['removed','keep separate']){
  const f=await formationFixture(),a=await topic(f.s,'Original identity'),b=await topic(f.s,'Independent identity');
  if(mode==='removed')await f.s.removeTopic({id:a.id,expectedRevision:0,operationId:op()});else await f.s.keepTopicsSeparate({sourceId:a.id,targetId:b.id});
  const before=await rows(f.s,'topics');const result=await commit(service(f,view=>{const value=reuse(view,a.id);if(mode==='keep separate')value.relations.forEach(r=>r.relation='same');value.entries[0].additional=[{topicId:b.id,returnValue:{reason:'reuse',citations:[citation(view.inputs[0])]}}];return value;}),request(f));
  assert.equal(result.outcome,'unassigned');assert.deepEqual(await rows(f.s,'topics'),before);assert.equal((await rows(f.s,'placements')).length,0);
 }
});

for(const change of ['Input edit','Section revision','permission'])test(`original final owner rechecks ${change} after decoding`,async()=>{
 const f=await formationFixture(),a=await topic(f.s,'Human project'),manual=await f.s.createSection({topicId:a.id,title:'Human notes',expectedTopicRevision:0,operationId:op()}),s=service(f,view=>reuse(view,a.id,{kind:'existing',sectionId:manual.sectionId})),handle=await s.prepare(request(f));
 if(change==='Input edit')await inputEdit(f.s,f.scope[0].inputId,{libraryText:'Changed original body after decoding'});
 else if(change==='Section revision')await f.s.editSection({topicId:a.id,sectionId:manual.sectionId,title:'New human title',expectedRevision:0,operationId:op()});
 else f.permission.allowed=false;
 const before=await snapshot(f.s);await assert.rejects(s.commit(handle));assert.deepEqual(await snapshot(f.s),before);
});

test('decoder preserves original policy reasons/citations and empty name maps only to null',async()=>{
 const f=await formationFixture(),view=await inspect(f),domain=assessment(view,{name:null}),mapped=decode(view,domain);
 assert.deepEqual(mapped,domain);
 const input=view.inputs[0],source={id:'synthetic-source',key:'k',contentHash:'h',originalText:input.fields.body,previousVersionId:null,conversation:'synthetic',date:null};
 const local={inputs:[{...input,sourceIds:[source.id]}],entries:[],sources:[source]};
 assert.equal(evaluateTopicFormation(mapped,local,view.identities,view.sections,parameters).outcome,'candidate');
});

test('wire rejects foreign/duplicate Topic, Section, Entry and citation identities without changing domain rows',async()=>{
 const f=await formationFixture(),a=await topic(f.s,'Primary object'),manual=await f.s.createSection({topicId:a.id,title:'Human notes',expectedTopicRevision:0,operationId:op()}),b=await topic(f.s,'Second object'),view=await inspect(f),sent=material(view),base=toWire(reuse(view,a.id)),before=await snapshot(f.s);
 const changes=[
  v=>v.relations[0].topicId='foreign-topic',v=>v.relations.pop(),v=>v.relations.push(plain(v.relations[0])),
  v=>v.entries[0].entryId='unsent-entry',v=>v.entries.push(plain(v.entries[0])),
  v=>v.additionalPlacements.push({entryIndex:0,topicId:'foreign-topic',reason:'reuse',citations:[]}),
  v=>{const p={entryIndex:0,topicId:b.id,reason:'reuse',citations:[]};v.additionalPlacements=[plain(p),plain(p)];},
  v=>{v.section.kind='existing';v.section.sectionId='foreign-section';},
  v=>{Object.assign(v,toWire(reuse(view,a.id,named(view,a.id))));v.sectionRelations[0].sectionId='foreign-section';},
  v=>{Object.assign(v,toWire(reuse(view,a.id,named(view,a.id))));v.sectionRelations.push(plain(v.sectionRelations[0]));},
  v=>v.evidence[0].inputId='unsent-input',v=>v.entries[0].span.end=99999,v=>v.entries[0].span.start=-1,
  v=>v.entries[0].span.end=0,v=>v.entries[0].span.start=0.5,v=>v.entries[0].span.field='note'
 ];
 for(const change of changes){const wire=plain(base);change(wire);rejected(()=>decodeMaintenanceTopicWire(wire,sent,view));}
 assert.deepEqual(await snapshot(f.s),before);assert.ok(manual.sectionId);
});

test('existing Section cannot borrow another Topic and named relations must cover the selected Topic exactly',async()=>{
 const f=await formationFixture(),a=await topic(f.s,'Primary object'),b=await topic(f.s,'Other object'),manual=await f.s.createSection({topicId:a.id,title:'Original aspect',expectedTopicRevision:0,operationId:op()}),other=await f.s.createSection({topicId:b.id,title:'Foreign aspect',expectedTopicRevision:0,operationId:op()});
 for(const section of [{kind:'existing',sectionId:other.sectionId},view=>({...named(view,a.id),relations:[]}),view=>({...named(view,a.id),relations:[{sectionId:other.sectionId,relation:'distinct',citations:[citation(view.inputs[0])]}]})]){
  const before=await snapshot(f.s),s=service(f,view=>reuse(view,a.id,typeof section==='function'?section(view):section));await assert.rejects(s.prepare(request(f)));assert.deepEqual(await snapshot(f.s),before);
 }
 assert.ok(manual.sectionId);
});

test('only exact sent input-bound Entry descriptors can select original Entry IDs; a different equal-text Input cannot be borrowed',async()=>{
 const f=await formationFixture(),first=(await runFormation(f)).result,entryId=first.entryIds[0],originalInput=f.scope[0].inputId;await addInput(f,{text:'Synthetic explicit working input'});
 const view=await inspect(f,[entryId]),sent=material(view),base=toWire(reuse(view,first.topicIds[0]));base.entries[0].entryId=entryId;base.entries[0].span=citations([citation(view.inputs.find(i=>i.id===originalInput))])[0];
 assert.equal(decodeMaintenanceTopicWire(base,sent,view).entries[0].entryId,entryId);
 const borrowed=plain(base);borrowed.entries[0].span=citations([citation(view.inputs.find(i=>i.id!==originalInput))])[0];rejected(()=>decodeMaintenanceTopicWire(borrowed,sent,view));
 for(const change of [m=>delete m.entries,m=>m.entries[0].revision++,m=>m.entries[0].body='different',m=>m.entries[0].workingInputId=view.inputs.find(i=>i.id!==originalInput).id,m=>m.entries[0].bodyBinding='derived']){const altered=plain(sent);change(altered);rejected(()=>decodeMaintenanceTopicWire(base,altered,view),'STALE_BASE');}
});

test('sent/current binding rejects changed inputs, roles, identities, Sections and constraints, including over-20 children',async()=>{
 const f=await formationFixture(),a=await topic(f.s,'Original project');await f.s.createSection({topicId:a.id,title:'Original Section',expectedTopicRevision:0,operationId:op()});const view=await inspect(f),sent=material(view),wire=toWire(reuse(view,a.id));
 for(const change of [v=>v.inputs[0].fields.body+=' changed',v=>v.inputs[0].revision++,v=>v.inputs[0].role='context_only',v=>v.inputs[0].fields.note='Unsent',v=>v.inputs.push(plain(v.inputs[0])),v=>v.identities[0].name+=' changed',v=>v.sections[0].revision++,v=>v.constraints.push({id:'new-constraint'})]){const altered=plain(view);change(altered);rejected(()=>decodeMaintenanceTopicWire(wire,sent,altered),'STALE_BASE');}
 const many=plain(sent);many.inputs=Array.from({length:21},(_,i)=>({...many.inputs[0],inputId:'synthetic-input-'+i,ref:'i'+i}));rejected(()=>decodeMaintenanceTopicWire(wire,many,view),'STALE_BASE');
});

test('closed schema rejects invented authority, unused Section payloads, optional-field omission and bounded hostile data',async()=>{
 const f=await formationFixture(),view=await inspect(f),sent=material(view),base=toWire(assessment(view));
 const changes=[v=>v.permissionId='invented',v=>v.confidence=1,v=>delete v.entries[0].entryId,v=>v.entries[0].entryId=null,v=>v.entries[0].additional=[{topicId:'x',returnValue:{reason:'reuse',citations:[]}}],v=>v.section.name='Ignored name',v=>v.section.aspectReason='incidental',v=>v.section.returnReason='reading',v=>v.section.sectionId='ignored',v=>v.name='\ud800',v=>v.name='\u0000',v=>v.name='x'.repeat(33000)];
 for(const change of changes){const wire=plain(base);change(wire);rejected(()=>decodeMaintenanceTopicWire(wire,sent,view));}
 const accessor=plain(base);let invoked=false;Object.defineProperty(accessor,'entries',{enumerable:true,get(){invoked=true;throw Error('not data');}});rejected(()=>validateMaintenanceTopicWire(accessor));assert.equal(invoked,false);
 const cycle=plain(base);cycle.entries[0].additional=cycle;rejected(()=>validateMaintenanceTopicWire(cycle));
 const huge=plain(base);huge.entries=Array.from({length:100},(_,i)=>({...plain(base.entries[0]),entryId:String(i).padEnd(200,'x'),additional:Array.from({length:20},()=>({topicId:'t'.repeat(200),reason:'reuse',citations:plain(base.evidence)}))}));rejected(()=>validateMaintenanceTopicWire(huge));
});

test('Topic decoder does not read or reinterpret independently owned Context/Filter material',async()=>{
 const f=await formationFixture(),view=await inspect(f),sent=material(view),wire=toWire(assessment(view));let invoked=false;
 for(const key of ['contextItems','filter','authoredEntries'])Object.defineProperty(sent,key,{enumerable:true,get(){invoked=true;throw Error('not a Topic facet');}});
 Object.defineProperty(view,'parameters',{enumerable:true,get(){invoked=true;throw Error('policy stays with owner');}});
 assert.equal(decodeMaintenanceTopicWire(wire,sent,view).version,1);assert.equal(invoked,false);
});

test('flattened additional entryIndex binds the extra to the exact second Entry, never the neighboring Entry',async()=>{
 const f=await formationFixture(),a=await topic(f.s,'Primary object'),b=await topic(f.s,'Second object');await addInput(f,{text:'Second distinct thought with useful application to both objects.'});
 const result=await commit(service(f,view=>{const value=reuse(view,a.id);value.entries=view.inputs.map((input,index)=>({span:citation(input),type:'idea',additional:index===1?[{topicId:b.id,returnValue:{reason:'reuse',citations:[citation(input)]}}]:[]}));return value;}),request(f));
 const placements=await rows(f.s,'placements');assert.equal(result.entryIds.length,2);assert.equal((await rows(f.s,'thoughts')).length,2);assert.equal(placements.length,3);
 assert.deepEqual(placements.filter(p=>p.entryId===result.entryIds[0]).map(p=>p.topicId),[a.id]);assert.deepEqual(new Set(placements.filter(p=>p.entryId===result.entryIds[1]).map(p=>p.topicId)),new Set([a.id,b.id]));
});

test('flattened placements reject missing/out-of-range entryIndex and retain the original per-Entry limit of twenty',async()=>{
 const f=await formationFixture(),a=await topic(f.s,'Primary object'),others=[];for(let i=0;i<21;i++)others.push(await topic(f.s,'Other object '+i));
 const view=await inspect(f),sent=material(view),value=reuse(view,a.id);value.entries[0].additional=others.slice(0,20).map(t=>({topicId:t.id,returnValue:{reason:'reuse',citations:[citation(view.inputs[0])]}}));
 const wire=toWire(value);assert.equal(decodeMaintenanceTopicWire(wire,sent,view).entries[0].additional.length,20);
 for(const index of [-1,0.5,1,99]){const changed=plain(wire);changed.additionalPlacements[0].entryIndex=index;rejected(()=>decodeMaintenanceTopicWire(changed,sent,view));}
 const absent=plain(wire);delete absent.additionalPlacements[0].entryIndex;rejected(()=>decodeMaintenanceTopicWire(absent,sent,view));
 const tooMany=plain(wire);tooMany.additionalPlacements.push({entryIndex:0,topicId:others[20].id,reason:'reuse',citations:plain(wire.evidence)});rejected(()=>decodeMaintenanceTopicWire(tooMany,sent,view));
 const noEntries=plain(wire);noEntries.entries=[];rejected(()=>decodeMaintenanceTopicWire(noEntries,sent,view));
});

test('new Section shape rejects non-neutral existing fields and named sectionId without discarding supplied claims',async()=>{
 const f=await formationFixture(),a=await topic(f.s,'Original project'),manual=await f.s.createSection({topicId:a.id,title:'Original aspect',expectedTopicRevision:0,operationId:op()}),view=await inspect(f),sent=material(view);
 const existing=toWire(reuse(view,a.id,{kind:'existing',sectionId:manual.sectionId}));
 for(const change of [v=>v.section.name='ignored',v=>v.section.aspectCitations=plain(v.evidence),v=>v.section.returnCitations=plain(v.evidence),v=>v.sectionRelations=[{sectionId:manual.sectionId,relation:'same',citations:plain(v.evidence)}]]){const changed=plain(existing);change(changed);rejected(()=>decodeMaintenanceTopicWire(changed,sent,view));}
 const namedWire=toWire(reuse(view,a.id,named(view,a.id)));namedWire.section.sectionId=manual.sectionId;rejected(()=>decodeMaintenanceTopicWire(namedWire,sent,view));
});

test('complete response still fails the original whole-wire byte ceiling before reservation reads or dispatch',async()=>{
 const f=await serviceFixture(),schema=fullSchema();f.manifest.wire.responseFormat.json_schema.schema=schema;f.manifest.profile.responseSchemaDigest=await hashText(canonical(schema));f.manifest.known.responseSchemaDigest=f.manifest.profile.responseSchemaDigest;f.manifest.tokenizer.maxWireBytes=1024;
 const result=await f.owner.bind(f.input);assert.equal(result.status,'UNAVAILABLE');assert.equal(result.reason,'WIRE_BOUND');assert.equal(result.dispatchAllowed,false);assert.equal(f.calls.tokenizer,0);assert.equal(f.calls.reservation,0);assert.equal(f.writes(),0);
});
