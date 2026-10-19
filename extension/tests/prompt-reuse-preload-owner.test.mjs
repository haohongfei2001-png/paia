import test from 'node:test';
import assert from 'node:assert/strict';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
const execute=promisify(execFile);
for(const kind of ['store-run','repository-transaction','smart-filter-run','ia-run','indexed-run','control','publication-read','loaded-control-row','original-cold'])test(kind==='original-cold'?'a first cold original owner import supports shared work':'a '+kind+' wrapper installed before the service module loads must remain independent',async t=>{
 const script=`
  import assert from 'node:assert/strict';
  const {IDBFactory,IDBKeyRange,IDBObjectStore}=await import('./tests/vendor/fake-indexeddb/build/esm/index.js');globalThis.IDBKeyRange=IDBKeyRange;
  const local=()=>{const data={};return {async get(key){return {[key]:structuredClone(data[key])};},async set(row){Object.assign(data,structuredClone(row));}};};
  const kind=${JSON.stringify(kind)},sources={
   'store-run':['thought-store','LibraryFoundationStore','run'],
   'repository-transaction':['idb-repository','ArchiveRepository','transaction'],
   'smart-filter-run':['smart-filter-store','SmartFilterStore','run'],
   'ia-run':['ia-store','IAStore','run'],
   'indexed-run':['indexed-store','IndexedArchiveStore','run'],
   'control':['indexed-store','IndexedArchiveStore','control'],
   'publication-read':['indexed-store','IndexedArchiveStore','qualifyControlPublicationRead'],
   'loaded-control-row':['indexed-store','IndexedArchiveStore','controlPublicationLoadedRow'],
   'original-cold':['thought-store','LibraryFoundationStore','run']
  },[file,name,key]=sources[kind],owner=(await import('./core/'+file+'.js'))[name].prototype,original=owner[key];let calls=0;
  const wrapper=function(...args){calls++;return original.apply(this,args);};if(kind!=='original-cold')owner[key]=wrapper;
  // Import the selected declaration owner before any of its higher callers,
  // then evaluate the service for the first and only time in this process.
  const {PromptReuseService}=await import('./core/prompt-reuse-service.js');
  const {OrganizerStore}=await import('./core/organizer/store.js');
  const s=new OrganizerStore(local(),{indexedDB:new IDBFactory()});await s.consent(true);
  await s.capture({epoch:(await s.status()).epoch,adapterVersion:'0.3.0',chat:{id:'synthetic-preload',url:'https://chatgpt.com/c/synthetic-preload',title:'Synthetic preload'},messages:[0,1].map(i=>({sourceMessageId:'input-'+i,pageOrder:i+1,originalText:'Explain sorting'}))});
  await s.finishFoundation();const service=new PromptReuseService(s,{clock:()=>1800000000000}),expected=await service.query(),get=IDBObjectStore.prototype.get;let records=0;
  IDBObjectStore.prototype.get=function(...args){if(this.name==='records')records++;return get.apply(this,args);};
  const single=await service.query(),singleReads=records;records=0;const pair=await Promise.all([service.query(),service.query()]);assert.deepEqual(single,expected);assert.deepEqual(pair,[expected,expected]);
  console.log(JSON.stringify({kind:${JSON.stringify(kind)},single:singleReads,concurrent:records,wrapperCalls:calls,wrapperInstalled:kind!=='original-cold'&&owner[key]===wrapper,exactResults:true}));s.repository.close();
 `;
 const result=await execute(process.execPath,['--input-type=module','--eval',script],{cwd:new URL('..',import.meta.url),timeout:10000,maxBuffer:1024*1024});
 const value=JSON.parse(result.stdout.trim());t.diagnostic(JSON.stringify(value));if(['store-run','repository-transaction'].includes(kind))assert.ok(value.wrapperCalls>0);assert.equal(value.wrapperInstalled,kind!=='original-cold');assert.equal(value.exactResults,true);
 assert.equal(value.concurrent,value.single*(kind==='original-cold'?1:2),'service load order must not turn an already-wrapped owner into original sharing authority');
});
