import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {IDBFactory,IDBKeyRange} from './vendor/fake-indexeddb/build/esm/index.js';
import {seedRawDiagnostic,dumpRawDiagnostic} from './harness/readonly-diagnostic-round3.mjs';
const code=await readFile(new URL('../development/inspect-library-readonly.js',import.meta.url),'utf8');
async function run(factory,extra={}){
 const lines=[],modes=[],stores=[];let opens=0;
 const wrapped={databases:()=>factory.databases(),open:(...args)=>{
  opens++;const r=factory.open(...args);r.addEventListener('success',()=>{const db=r.result,old=db.transaction.bind(db);
   db.transaction=(names,mode)=>{modes.push(mode);assert.equal(mode,'readonly');const tx=old(names,mode),get=tx.objectStore.bind(tx);
    tx.objectStore=name=>{stores.push(name);assert.ok(['topics','sections','placements','meta'].includes(name));return get(name);};return tx;};});return r;
 }};
 const report=await vm.runInNewContext(code,{indexedDB:wrapped,IDBKeyRange,chrome:{runtime:{id:'synthetic-extension'}},location:{protocol:'chrome-extension:',host:'synthetic-extension'},console:{info:x=>lines.push(x)},setTimeout,clearTimeout,...extra});
 return {report,lines,modes,stores,opens};
}
test('readonly diagnostic refuses wrong context before touching IDB',async()=>{
 const f=new IDBFactory(),r=await run(f,{location:{protocol:'https:',host:'example.test'}});assert.equal(r.report.status,'wrong_context');assert.equal(r.opens,0);
});
test('readonly diagnostic does not create a database when none exists',async()=>{
 const f=new IDBFactory(),r=await run(f);assert.equal(r.report.status,'database_absent');assert.equal(r.opens,0);assert.deepEqual(await f.databases(),[]);
});
test('readonly diagnostic counts durable/index gaps without migration, body reads or writes',async()=>{
 const f=new IDBFactory();await seedRawDiagnostic(f);const before=await dumpRawDiagnostic(f),r=await run(f),after=await dumpRawDiagnostic(f);
 assert.equal(r.report.complete,true);assert.equal(r.report.topics.active,5);assert.equal(r.report.index.gap,1);
 assert.equal(r.report.layouts.missingGeneration,3);assert.equal(r.report.layouts.legacyOneWithSection,1);assert.equal(r.report.layouts.jobBlocked,1);assert.equal(r.report.layouts.unresolvedCandidates,1);
 assert.equal(r.report.markers.compatibilityComplete,false);assert.equal(r.report.markers.aiProductizationPresent,false);
 assert.deepEqual(after,before);assert.deepEqual(r.modes,['readonly']);assert.equal(r.lines.length,1);assert.doesNotMatch(r.lines[0],/PRIVATE|missing-index|intact|unproven-generation/);
});
test('readonly diagnostic reports missing structural stores/index explicitly, not a zero gap',async()=>{
 const f=new IDBFactory();await seedRawDiagnostic(f,{index:false,sections:false});const r=await run(f);
 assert.equal(r.report.stores.sections,false);assert.equal(r.report.index.present,false);assert.equal(r.report.index.gap,null);
});
test('readonly diagnostic aborts create-after-enumeration race without committing a version',async()=>{
 const f=new IDBFactory();const r=await run(f,{indexedDB:{databases:async()=>[{name:'paia-archive',version:5}],open:(...a)=>f.open(...a)}});
 assert.equal(r.report.status,'read_unavailable');
 // This vendored fake retains a version-0 registry entry after abort; native
 // browser coverage separately asserts that no actual database is created.
 assert.ok((await f.databases()).every(row=>row.version===0));
});
test('readonly diagnostic fails safely on enumeration errors without leaking raw error',async()=>{
 const r=await run(new IDBFactory(),{indexedDB:{databases:()=>Promise.reject(Error('PRIVATE_SENTINEL')),open:()=>assert.fail('must not open')}});
 assert.equal(r.report.status,'enumeration_unavailable');assert.doesNotMatch(r.lines[0],/PRIVATE/);
});
test('readonly diagnostic limits remain honest for a large structural scan',{timeout:30000},async()=>{
 const f=new IDBFactory();await seedRawDiagnostic(f,{many:20002});const r=await run(f);
 assert.equal(r.report.complete,false);assert.ok(['partial','read_unavailable'].includes(r.report.status));
 if(r.report.status==='partial'){assert.equal(r.report.index.gap,null);assert.ok(r.report.scanned.topics<=20000);}
});
