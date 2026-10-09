import test from 'node:test';
import assert from 'node:assert/strict';
import {scanHumanSearchOwnerInventory as scan} from '../core/browser-native-sync/human-search-owner-inventory.js';
import {branchRawMeasure} from '../core/browser-native-sync/human-library-plan.js';
import {searchOwnerFields} from '../core/library-search.js';
import {LibraryDocumentsStore} from '../core/library-documents-store.js';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {local} from './harness/thought-m1.mjs';

const frozen=row=>Object.freeze(row);
function immutable(value){if(value&&typeof value==='object'){for(const item of Object.values(value))immutable(item);Object.freeze(value);}return value;}
const keys=['version','state','reason','ownerKind','active','rawBytes','rawUnits','rawNodes','rawSlots','fieldCount','examinedFields','sourceInputUnits','sourceMatchCount','sourceMatchUnits','sourceComplete','withinOwnerSourceMatchCeiling','executionProfileQualified','budgetAuthority'];
function check(x){assert.deepEqual(Object.keys(x),keys);assert.equal(x.state,'NOT_ADMITTED');assert.equal(x.executionProfileQualified,false);assert.equal(x.budgetAuthority,false);assert.equal(Object.isFrozen(x),true);for(const value of Object.values(x))assert.ok(value===null||['number','boolean','string'].includes(typeof value));}
const matches=text=>text.match(/[\p{Script=Han}]|[\p{L}\p{N}_]+/gu)||[];
for(const [kind,row]of [['entry',{lifecycle:'active',title:'abc中文',thoughtText:'中文abc 中a中文',type:'idea'}],['topic',{lifecycle:'active',name:'中文 topic_22'}],['section',{lifecycle:'active',title:'—“中文”、hello。'}],['entry',{lifecycle:'active',title:null,thoughtText:false,type:0}],['topic',{lifecycle:'active'}],['section',Object.assign(Object.create(null),{lifecycle:'active',title:'中文'})]])test('whole owner counts bind the exact original fields '+kind+' '+JSON.stringify(row),()=>{const input=frozen(row),x=scan(kind,input),fields=Object.values(searchOwnerFields(kind,input)),words=fields.flatMap(matches),stats={};check(x);assert.equal(x.sourceComplete,true);assert.equal(x.sourceInputUnits,fields.reduce((sum,field)=>sum+field.length,0));assert.equal(x.sourceMatchCount,words.length);assert.equal(x.sourceMatchUnits,words.reduce((sum,word)=>sum+word.length,0));assert.equal(x.fieldCount,fields.length);assert.equal(x.examinedFields,fields.length);assert.equal(x.rawBytes,branchRawMeasure(input,4*1024*1024,stats,'native'));assert.equal(x.rawUnits,stats.units);assert.equal(x.rawNodes,stats.nodes);assert.equal(x.rawSlots,stats.slots);});
test('removed original owners skip even unsupported/nonstring/over-scanner fields',()=>{const x=scan('entry',frozen({lifecycle:'removed',title:'A',thoughtText:'a'.repeat(2*1024*1024+1),type:true}));check(x);assert.equal(x.active,false);assert.equal(x.sourceComplete,true);assert.equal(x.examinedFields,0);assert.equal(x.sourceInputUnits,0);assert.equal(x.sourceMatchCount,0);assert.equal(x.reason,'INACTIVE_SOURCE_NOT_SCANNED');});
test('partial valid fields cannot become whole-owner counts after unsupported or invalid field',()=>{for(const [thoughtText,reason]of [['safeA','UNSUPPORTED_SOURCE_REPERTOIRE'],[true,'NON_STRING_SOURCE_FIELD'],['a'.repeat(2*1024*1024+1),'SOURCE_WORK_LIMIT']]){const x=scan('entry',frozen({lifecycle:'active',title:'valid 中文',thoughtText,type:'idea'}));check(x);assert.equal(x.reason,reason);assert.equal(x.sourceComplete,false);assert.equal(x.sourceInputUnits,null);assert.equal(x.sourceMatchCount,null);assert.equal(x.sourceMatchUnits,null);assert.equal(x.withinOwnerSourceMatchCeiling,null);}});
test('whole-owner ceiling sums all source fields before dedup and keeps complete over-limit facts',()=>{for(const size of [16384,16385]){const row=frozen({lifecycle:'active',title:'中'.repeat(size),thoughtText:'中'.repeat(16384),type:''}),x=scan('entry',row);check(x);assert.equal(x.sourceComplete,true);assert.equal(x.sourceMatchCount,size+16384);assert.equal(x.withinOwnerSourceMatchCeiling,size===16384);assert.equal(x.reason,size===16384?'EXECUTION_PROFILE_UNQUALIFIED':'OWNER_SOURCE_MATCH_COUNT_LIMIT');}});
test('raw meter ceiling remains independent from the scalar scanner work ceiling',()=>{assert.throws(()=>scan('topic',frozen({lifecycle:'active',name:'a'.repeat(4*1024*1024)})),{code:'BNS_HUMAN_GRAPH_LIMIT'});const x=scan('topic',frozen({lifecycle:'active',name:'a'.repeat(2*1024*1024+1)}));check(x);assert.equal(x.reason,'SOURCE_WORK_LIMIT');assert.equal(x.sourceComplete,false);});
test('ordinary getters are refused before invocation including hidden relevant fields',()=>{let reads=0;for(const field of ['title','thoughtText','type','lifecycle'])for(const enumerable of [true,false]){const row={lifecycle:'active'};Object.defineProperty(row,field,{enumerable,get(){reads++;throw Error('fixture getter read');}});assert.throws(()=>scan('entry',frozen(row)),{code:'BNS_HUMAN_SEARCH_OWNER_INVENTORY_ARGUMENT_INVALID'});}const row=frozen({lifecycle:'active',title:'safe',get extra(){reads++;throw Error('unrelated getter');}});assert.throws(()=>scan('entry',row),{code:'BNS_HUMAN_EFFECT_CUT_REQUIRED'});assert.equal(reads,0);});
test('inherited fields and nonenumerable data fields cannot bypass the original raw inventory',()=>{let reads=0;Object.defineProperty(Object.prototype,'name',{configurable:true,get(){reads++;throw Error('inherited fixture getter');}});try{assert.throws(()=>scan('topic',frozen({lifecycle:'active'})),{code:'BNS_HUMAN_SEARCH_OWNER_INVENTORY_ARGUMENT_INVALID'});}finally{delete Object.prototype.name;}assert.equal(reads,0);const row={lifecycle:'active'};Object.defineProperty(row,'name',{value:'safe',enumerable:false});assert.throws(()=>scan('topic',frozen(row)),{code:'BNS_HUMAN_SEARCH_OWNER_INVENTORY_ARGUMENT_INVALID'});});
test('inherited descriptor-value pollution refuses before selected or unrelated getter and meter access',()=>{
 let reads=0;
 const selected=frozen({lifecycle:'active',get name(){reads++;throw Error('selected accessor invoked');}});
 const extra=frozen({lifecycle:'active',name:'safe',get extra(){reads++;throw Error('extra accessor invoked');}});
 const clean=frozen(Object.assign(Object.create(null),{lifecycle:'active',name:'safe'}));
 assert.equal(Object.hasOwn(Object.prototype,'value'),false);
 Object.defineProperty(Object.prototype,'value',{value:0,configurable:true});
 try{for(const row of [selected,extra,clean])assert.throws(()=>scan('topic',row),{code:'BNS_HUMAN_SEARCH_OWNER_INVENTORY_ARGUMENT_INVALID'});}
 finally{delete Object.prototype.value;}
 assert.equal(reads,0);
 assert.equal(scan('topic',clean).sourceComplete,true);
});
test('unsupported roots/kinds/extra arguments refuse without coercion',()=>{for(const row of [null,undefined,'safe',[],frozen([]),{lifecycle:'active'},frozen(Object.create({lifecycle:'active'}))])assert.throws(()=>scan('topic',row),{code:'BNS_HUMAN_SEARCH_OWNER_INVENTORY_ARGUMENT_INVALID'});for(const kind of ['unknown',null,{toString(){throw Error('must not coerce');}}])assert.throws(()=>scan(kind,frozen({lifecycle:'active'})),{code:'BNS_HUMAN_SEARCH_OWNER_INVENTORY_ARGUMENT_INVALID'});assert.throws(()=>scan('topic',frozen({lifecycle:'active'}),true),{code:'BNS_HUMAN_SEARCH_OWNER_INVENTORY_ARGUMENT_INVALID'});assert.throws(()=>scan('topic',frozen({name:'safe'})),{code:'BNS_HUMAN_SEARCH_OWNER_INVENTORY_ARGUMENT_INVALID'});});
test('unknown lifecycle and unfrozen nested payload never become complete owner facts',()=>{for(const lifecycle of [null,'unknown'])assert.throws(()=>scan('topic',frozen({lifecycle,name:'safe'})),{code:'BNS_HUMAN_SEARCH_OWNER_INVENTORY_ARGUMENT_INVALID'});assert.throws(()=>scan('topic',frozen({lifecycle:'active',name:'safe',extra:{value:1}})),{code:'BNS_HUMAN_EFFECT_CUT_REQUIRED'});});
test('original raw native value/encoding gates precede source facts',()=>{for(const name of ['\ud800','\udc00'])assert.throws(()=>scan('topic',frozen({lifecycle:'active',name})),{code:'BNS_TEXT_ENCODING'});assert.throws(()=>scan('topic',frozen({lifecycle:'active',name:'safe',extra:Infinity})),{code:'BNS_VALUE_INVALID'});assert.throws(()=>scan('topic',frozen({lifecycle:'active',name:'safe',extra:new Date()})),{code:'BNS_HUMAN_EFFECT_CUT_REQUIRED'});});
test('inventory invokes no normalize/case transform and discloses no body or owner reference',()=>{const saved=['normalize','toLocaleLowerCase'].map(key=>[key,Object.getOwnPropertyDescriptor(String.prototype,key)]);for(const [key,d]of saved)Object.defineProperty(String.prototype,key,{...d,value(){throw Error('native transform');}});try{const row=frozen({id:'fixture_identity_secret',lifecycle:'active',thoughtText:'fixture_body_secret 中文',title:'safe',type:'idea'}),x=scan('entry',row);check(x);assert.equal(x.sourceComplete,true);assert.equal(JSON.stringify(x).includes('fixture_body_secret'),false);assert.equal(JSON.stringify(x).includes('fixture_identity_secret'),false);assert.equal(Object.values(x).includes(row),false);}finally{for(const [key,d]of saved)Object.defineProperty(String.prototype,key,d);}});
test('actual original Topic/default/named Section/Entry rows produce complete source facts without changing stored bytes',async()=>{
 globalThis.IDBKeyRange=IDBKeyRange;
 const s=new LibraryDocumentsStore(local(),{indexedDB:new IDBFactory(),clock:()=> '2026-10-01T00:00:00.000Z'});
 await s.consent(true);await s.finishFoundation();
 try{
  const topic=await s.createTopic({name:'fixture中文',operationId:crypto.randomUUID()});
  await s.createSection({topicId:topic.id,expectedTopicRevision:0,title:'fixture section中文',operationId:crypto.randomUUID()});
  await s.createEntry({actor:'user',body:'fixture body中文',type:'idea',formation:'explicit',evidence:[],operationId:crypto.randomUUID()});
  const before=await s.repository.transaction(false,async t=>({topics:await t.all('topics'),sections:await t.all('sections'),thoughts:await t.all('thoughts')}));
  let found=0;
  for(const [kind,name]of [['topic','topics'],['section','sections'],['entry','thoughts']])for(const row of before[name]){
   const x=scan(kind,immutable(row)),fields=Object.values(searchOwnerFields(kind,row)),words=fields.flatMap(matches);check(x);
   assert.equal(x.sourceComplete,true);assert.equal(x.sourceInputUnits,fields.reduce((n,text)=>n+text.length,0));assert.equal(x.sourceMatchCount,words.length);found++;
  }
  assert.ok(found>=4);
  const after=await s.repository.transaction(false,async t=>({topics:await t.all('topics'),sections:await t.all('sections'),thoughts:await t.all('thoughts')}));
  assert.deepEqual(after,before);
 }finally{s.repository.close();}
});
