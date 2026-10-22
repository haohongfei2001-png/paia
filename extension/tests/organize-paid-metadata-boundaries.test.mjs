import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture} from './harness/organize-material-method-fixture.mjs';
import {captureOriginalOrganizeScope,readOriginalOrganizeScope,releaseOriginalOrganizeScope,registerOriginalOrganizePaidMetadataBaseline,retireOriginalOrganizePaidMetadataBaseline} from '../core/organizer/organize-processing-scope.js';
import {assertOriginalOrganizeActionFacts,chargeOriginalOrganizeActionWork} from '../background/organize-action-source.js';
import {captureOrganizeProcessingGrant,releaseOrganizeProcessingGrant} from '../background/organize-processing-policy.js';
const sender={id:'synthetic',frameId:0,documentId:'document',url:'chrome-extension://synthetic/ui/archive.html',tab:{id:1,windowId:2,incognito:false}};
async function capture(f,{observe=null,before=()=>{},grant=false}={}){
 let proof,permission,facts,error,requests=0,seen=0;
 try{await f.s.run(()=>f.s.repository.transaction(false,async tx=>{
  const stores=new WeakSet(),objectStore=tx.tx.objectStore.bind(tx.tx);
  const wrap=(s,table)=>{if(stores.has(s))return s;stores.add(s);for(const method of ['get','openCursor'])if(typeof s[method]==='function'){const original=s[method].bind(s);s[method]=(...args)=>{requests++;const req=original(...args);if(observe)req.addEventListener('success',()=>{const row=method==='get'?req.result:req.result?.value;if(row){seen++;observe(table,row,args[0]);}});return req;};}if(typeof s.index==='function'){const original=s.index.bind(s);s.index=(...args)=>wrap(original(...args),table);}return s;};
  tx.tx.objectStore=(name,...args)=>wrap(objectStore(name,...args),name);before(tx);
  try{proof=await captureOriginalOrganizeScope(f.s,tx,f.topic.id,f.source,f.action);facts=readOriginalOrganizeScope(proof,f.s,tx);if(grant)permission=captureOrganizeProcessingGrant(f.source,f.action,f.s,tx,proof);}
  finally{releaseOrganizeProcessingGrant(permission);releaseOriginalOrganizeScope(proof);}
 }));}catch(e){error=e;}
 return {error,proof,facts,requests,seen};
}
async function richFixture(t){
 const f=await fixture(t,{input:true,consume:false});
 await f.s.repository.transaction(true,async tx=>{const source=(await tx.all('recordIndex'))[0],topic=await tx.get('topics',f.topic.id);await tx.put('topics',{...topic,sourceRecordIds:[source.id]});
  await tx.put('meta',{id:'aiPresentation:'+f.topic.id,topicId:f.topic.id,schemaVersion:3,presentationVersion:1,revision:0,needsUpdate:false,stale:false});
  await tx.put('meta',{id:'memory:entry:'+f.entry.id,kind:'entry',version:1,entryId:f.entry.id,excluded:false});
 });
 const selected=await f.source.select(sender,{topicId:f.topic.id});f.action=await f.source.consume(sender,{topicId:f.topic.id,scopeBinding:selected.scopeBinding,userActionId:crypto.randomUUID()});return f;
}
const schemas=[
 ['topic','topics',row=>row,'revision'],['placement','placements',row=>row,'revision'],['entry','thoughts',row=>row,'revision'],['section','sections',row=>row,'revision'],
 ['dependency','dependencies',row=>row,'basedOnContentRevision'],['provenance','provenance',row=>row,'basedOnContentRevision'],['input','blocks',row=>row.value,'documentId'],['input state','inputStates',row=>row,'contentRevision'],['source index','recordIndex',row=>row,'sequence'],
 ['presentation','meta',row=>row.id.startsWith('aiPresentation:')?row:null,'revision'],['restriction','meta',row=>row.kind==='entry'?row:null,'excluded'],['gate','meta',row=>row.id==='gate'?row:null,'epoch']
];
for(const [label,table,target,key]of schemas)test(`paid ${label} known own getter refuses without invoking and permanently retires the action`,async t=>{
 const f=await richFixture(t);let changed=0,touches=0;
 const result=await capture(f,{observe:(name,row)=>{if(name!==table)return;const item=target(row);if(!item)return;changed++;Object.defineProperty(item,key,{enumerable:true,configurable:true,get(){touches++;throw Error('SELECTED_METADATA_GETTER');}});}});
 assert.ok(changed>0,label);assert.equal(touches,0);assert.ok(result.error,label);assert.equal(result.facts,undefined);assert.throws(()=>assertOriginalOrganizeActionFacts(f.source,f.action,f.s));
 const again=await capture(f);assert.ok(again.error);assert.equal(again.requests,0);
});

for(const [label,mutate]of [
 ['missing',row=>{delete row.revision;}],['undefined',row=>{row.revision=undefined;}],['null',row=>{row.revision=null;}],['wrong primitive type',row=>{row.revision='0';}],
 ['array order',row=>{row.sourceRecordIds=[...row.sourceRecordIds,'extra'];}],['array extra key',row=>{row.sourceRecordIds.extra='x';}],['array hole',row=>{delete row.sourceRecordIds[0];}],
 ['nested field type',row=>{row.fieldRevisions.body='0';}],['oversized selected string',row=>{row.origin='x'.repeat(8193);}]
])test(`paid metadata ${label} cannot refresh an observed baseline`,async t=>{
 const f=await richFixture(t);let changed=0;const result=await capture(f,{observe:(table,row)=>{if(table==='thoughts'&&row.id===f.entry.id){changed++;mutate(row);}}});assert.ok(changed);assert.ok(result.error);assert.equal(result.facts,undefined);assert.throws(()=>assertOriginalOrganizeActionFacts(f.source,f.action,f.s));
});

test('paid original metadata with Source overlap, presentation and restrictions still closes the complete scope',async t=>{
 const f=await richFixture(t),one=await capture(f),two=await capture(f);assert.equal(one.error,undefined);assert.equal(two.error,undefined);assert.strictEqual(one.facts,two.facts);
 assert.equal(two.facts.organizationSources.length,1);assert.equal(two.facts.sources.length,1);assert.equal(two.facts.sources[0].id,two.facts.organizationSources[0].id);assert.equal(two.facts.organizationSources[0].present,true);assert.ok(two.facts.presentation);assert.ok(two.facts.restrictions.length);assert.equal(one.requests,two.requests);
});

test('unknown semantic properties under a positive nested schema remain unobserved',async t=>{
 const f=await richFixture(t);let touches=0,installed=0;const result=await capture(f,{observe:(table,row)=>{if(table==='thoughts'){for(const value of [row,row.authorship.body,row.protections.body,row.fieldRevisions]){installed++;Object.defineProperty(value,'futureSemantic',{enumerable:true,configurable:true,get(){touches++;throw Error('FUTURE_SEMANTIC');}});}}}});assert.equal(result.error,undefined);assert.ok(installed);assert.equal(touches,0);assert.equal(JSON.stringify(result.facts).includes('futureSemantic'),false);
});

test('unknown restriction key keeps the original closed rejection and never invokes its getter',async t=>{
 const f=await richFixture(t);let touches=0,installed=0;const result=await capture(f,{observe:(table,row)=>{if(table==='meta'&&row.kind==='entry'){installed++;Object.defineProperty(row,'futureSemantic',{enumerable:true,configurable:true,get(){touches++;throw Error('CLOSED_UNKNOWN');}});}}});assert.ok(installed);assert.ok(result.error);assert.equal(touches,0);
});

test('copied facts cannot rebind the registered action and failure permanently retires it',async t=>{
 const f=await fixture(t),original=await capture(f);assert.equal(original.error,undefined);assert.throws(()=>registerOriginalOrganizePaidMetadataBaseline(f.source,f.action,f.s,{...original.facts}));assert.throws(()=>assertOriginalOrganizeActionFacts(f.source,f.action,f.s));const again=await capture(f);assert.equal(again.requests,0);assert.ok(again.error);
});

test('registered metadata missing after deny cleanup cannot fall back or re-register',async t=>{
 const f=await fixture(t),original=await capture(f);assert.equal(original.error,undefined);retireOriginalOrganizePaidMetadataBaseline(f.source,f.action);const again=await capture(f);assert.ok(again.error);assert.equal(again.requests,0);assert.throws(()=>registerOriginalOrganizePaidMetadataBaseline(f.source,f.action,f.s,original.facts));
});

test('a fully spent request ledger denies a reuse capture before any original IO',async t=>{
 const f=await fixture(t);chargeOriginalOrganizeActionWork(f.source,f.action,f.s,4096-12,0);const result=await capture(f);assert.equal(result.error?.code,'BUDGET_EXCEEDED');assert.equal(result.requests,0);assert.throws(()=>assertOriginalOrganizeActionFacts(f.source,f.action,f.s));
});

test('equal scopes in separate original consumed actions do not share their paid baseline',async t=>{
 const f=await fixture(t),first=await capture(f);const selection=await f.source.select(sender,{topicId:f.topic.id}),other=await f.source.consume(sender,{topicId:f.topic.id,scopeBinding:selection.scopeBinding,userActionId:crypto.randomUUID()}),second=await capture({...f,action:other});assert.equal(first.error,undefined);assert.equal(second.error,undefined);assert.deepEqual(first.facts,second.facts);assert.notStrictEqual(first.facts,second.facts);
});
