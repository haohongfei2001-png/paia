import test from 'node:test';
import assert from 'node:assert/strict';
import {completeFixture,seedMetadata,settled,allPages,forbidBodyReads,windowOptions,ArchiveNavigationQuery,rows} from './harness/ans-navigation.mjs';
import * as K from '../core/read-projection-keys.js';
import {navigationRequest} from '../core/archive-navigation-query.js';
const compare=(a,b)=>{const x=Array.from(a,c=>c.codePointAt(0)),y=Array.from(b,c=>c.codePointAt(0));for(let i=0;i<Math.min(x.length,y.length);i++)if(x[i]!==y[i])return x[i]-y[i];return x.length-y.length;};

test('ANS-04 UTF-8 tuple codec agrees with independent Unicode/time comparators and rejects collisions',()=>{
 let seed=713;const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
 const words=['','A','a','中','😀','𐀀','\ue000','\u0000','Å','A\u030a','Ａ'];
 for(let i=0;i<1000;i++){let s='';for(let j=0;j<rand()%8;j++){let cp=rand()%0x110000;if(cp>=0xd800&&cp<=0xdfff)cp=32;s+=String.fromCodePoint(cp);}words.push(s);}
 assert.deepEqual([...words].sort(compare),[...words].sort((a,b)=>K.stringKey(a)<K.stringKey(b)?-1:K.stringKey(a)>K.stringKey(b)?1:0));
 const tuples=[['ab','c'],['a','bc'],['','abc'],['abc','']];assert.equal(new Set(tuples.map(K.tupleKey)).size,4);
 const times=[-8640000000000000,-1,0,1,8640000000000000];assert.deepEqual(times.map(K.timeKey),times.map(K.timeKey).sort());
 for(const bad of ['\ud800','x\udc00'])assert.throws(()=>K.stringKey(bad));
 for(const bad of [NaN,Infinity,0.5,8640000000000001])assert.throws(()=>K.timeKey(bad));
 assert.throws(()=>K.rankKey(-1));assert.throws(()=>K.rankKey(100000));assert.ok(K.rankKey(12)<K.unrankedKey(''));
 assert.ok(K.projectKey('Ａ','a')<K.projectKey('a','b'));assert.equal(K.projectKey('Ａ','same'),K.projectKey('a','same'));
});

test('ANS-04 request validation binds bounded scope/mode and rejects injected or oversized requests',()=>{
 for(const bad of [{limit:41},{limit:0},{limit:'40'},{mode:'network'},{providerKey:'bad/provider'},{groupKind:'unknown'},{groupKind:'project',providerKey:'chatgpt',projectRef:{providerKey:'claude',namespace:'n',projectId:'p'}},{body:'secret'},{cursor:'x'.repeat(16385)},JSON.parse('{"__proto__":{}}')])assert.throws(()=>navigationRequest(bad));
 assert.deepEqual(navigationRequest({providerKey:'chatgpt',groupKind:'unknown'}).scope,K.windowScope('chatgpt','unknown'));
 assert.equal(navigationRequest({mode:'source'}).mode,'source');
});
for(const count of [1000,10000])test(`ANS-04 ${count} windows: complete 40-row pagination, zero body reads, bounded rebuild and warm latency`,{timeout:180000},async()=>{
 const {s}=await completeFixture({texts:[]});await seedMetadata(s,count);
 const expected=(await rows(s,'documents')).sort((a,b)=>a.libraryDisplay[0]-b.libraryDisplay[0]||compare(a.id,b.id)).map(r=>r.id);
 const guard=forbidBodyReads(s),q=new ArchiveNavigationQuery(s),start=performance.now(),cold=await q.page(windowOptions),coldMs=performance.now()-start;
 assert.equal(cold.coverage.state,'building');assert.equal(cold.items.length,0);assert.equal(cold.oldReaderAvailable,true);assert.ok(coldMs<=1500,`cold ${coldMs}ms`);
 const windows=await allPages(q,windowOptions);assert.deepEqual(windows.map(x=>x.documentId),expected);assert.equal(new Set(windows.map(x=>x.documentId)).size,count);
 assert.ok(windows.every(x=>x.title.startsWith('User ')));assert.ok(windows.every(x=>x.groupKind==='unknown'));
 const samples=[];for(let i=0;i<30;i++){const at=performance.now();await q.page(windowOptions);samples.push(performance.now()-at);}
 samples.sort((a,b)=>a-b);const p95=samples[Math.ceil(samples.length*0.95)-1];assert.ok(p95<=500,`warm p95 ${p95}ms`);
 assert.equal(guard.metrics.bodyReads,0);assert.equal(guard.metrics.fullScans,0);assert.equal(guard.metrics.maxBatch,100);
 console.log('ANS04_RESOURCE_EVIDENCE '+JSON.stringify({windows:count,coldMs,warmSamples:30,p95Ms:p95,...guard.metrics}));
 guard.restore();
});

test('ANS-04 provider order includes only archived providers, per-scope cursors reject cross-scope and cross-mode reuse',async()=>{
 const {s}=await completeFixture({texts:[]});await seedMetadata(s,180,{providers:['zeta','chatgpt','claude','alpha']});const q=new ArchiveNavigationQuery(s);
 assert.deepEqual((await allPages(q)).map(x=>x.providerKey),['chatgpt','claude','alpha','zeta']);
 const first=await settled(q,windowOptions);assert.equal(first.items.length,40);assert.ok(first.nextCursor);
 await settled(q,{providerKey:'claude',groupKind:'unknown'});
 const wrong=await q.page({providerKey:'claude',groupKind:'unknown',cursor:first.nextCursor});assert.equal(wrong.cursorInvalid,true);assert.deepEqual(wrong.items,[]);
 const mode=await q.page({...windowOptions,mode:'source',cursor:first.nextCursor});assert.equal(mode.cursorInvalid,true);assert.equal(mode.effectiveOrdering,'paia');assert.equal(mode.unavailableReason,'SOURCE_ORDER_UNAVAILABLE');
});
