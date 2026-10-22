import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {FakeChatGPT} from './fake-chatgpt.mjs';
const evidence=(await readFile(new URL('./ans07-seed-evidence.mjs',import.meta.url),'utf8')).replaceAll('export function','function');
const publication=(await readFile(new URL('./historical-publication-evidence.mjs',import.meta.url),'utf8')).replace('export function','function');

export function testANS07SeedAdmission(test){
for(const admit of [false,true])test(`ANS07 original consent publication ${admit?'completes before seed admission':'rejects an unadmitted seed without replay'}`,{timeout:30000},async()=>{
 const h=await FakeChatGPT.start(),page=h.archive;
 try{
  await page.evaluate(`(()=>{${evidence}\n${publication}\n globalThis.__observeSeed=observeANS07Seed;globalThis.__observeConsent=observeANS07Consent;globalThis.__observePublication=observeHistoricalPublication;})()`);
  await page.evaluate(()=>{
   // Delay dispatch of this one original UI command. The real worker, native
   // publication transaction and ACK run unchanged after release.
   const send=chrome.runtime.sendMessage,gate=new Promise(resolve=>globalThis.__releaseConsent=resolve);
   chrome.runtime.sendMessage=function(message,...args){return message?.type==='CONSENT'?gate.then(()=>Reflect.apply(send,this,[message,...args])):Reflect.apply(send,this,[message,...args]);};
   globalThis.__trace={phase:'consent',seedAttempts:0};Object.defineProperty(__trace,'stage',{enumerable:true,get:()=>__trace.phase});
   globalThis.__consent=__observeConsent(chrome.runtime,__trace);
  });
  await page.locator('#enable-consent').click();
  assert.deepEqual(await page.evaluate(()=>__trace.consent),{dispatched:1,settled:0,acknowledged:0});
  await page.evaluate(async()=>{
   const {LibraryDocumentsStore}=await import('../core/library-documents-store.js');
   const {readControlPublicationFence}=await import('../core/local-control-publication.js');
   const s=new LibraryDocumentsStore(chrome.storage.local);globalThis.__seedStore=s;
   globalThis.__stopPublication=__observePublication(s,chrome.storage,'personalAIArchive',__trace);
   globalThis.__stopSeed=__observeSeed(s,__trace);
   const transaction=s.repository.transaction;let held=false;
   s.repository.transaction=async function(write,callback,...args){
    const result=await Reflect.apply(transaction,this,[write,callback,...args]);
    if(!held&&!write&&callback===readControlPublicationFence){held=true;__trace.firstFenceRead=true;
     if(__trace.consent.acknowledged===0){__releaseConsent();await __consent.complete();}
    }
    return result;
   };
  });
  const outcome=page.evaluate(async admit=>{
   try{
    if(admit)await __consent.complete();
    __trace.phase='first-topic';__trace.seedAttempts++;
    await __seedStore.createTopic({name:'ANS07 synthetic held-consent topic',operationId:crypto.randomUUID()});
    __trace.result='committed';
   }catch(error){__trace.result=error.code||error.message;}
   finally{__stopSeed();__stopPublication();__consent.stop();}
   return __trace;
  },admit);
  if(admit){
   // A second debugger task runs while completion is held; no timer-based
   // grace period and no polling/retry of the compound seed operation.
   const pending=await page.evaluate(()=>({seedAttempts:__trace.seedAttempts,settled:__trace.consent.settled,firstFenceRead:!!__trace.firstFenceRead}));
   assert.deepEqual(pending,{seedAttempts:0,settled:0,firstFenceRead:false});
   await page.evaluate(()=>__releaseConsent());
  }
  const trace=await outcome;
  const counts=await page.evaluate(()=>__seedStore.repository.transaction(false,async t=>({topics:await t.count('topics'),entries:await t.count('thoughts')}),['topics','thoughts']));
  console.log('ANS07_HELD_CONSENT',JSON.stringify({admit,trace,counts}));
  assert.equal(trace.seedAttempts,1);assert.deepEqual(trace.consent,{dispatched:1,settled:1,acknowledged:1});
  if(admit){assert.equal(trace.result,'committed');assert.equal(counts.topics,1);assert.ok(trace.committedWrites>0);}
  else{assert.equal(trace.result,'CONTROL_PUBLICATION_CHANGED');assert.equal(counts.topics,0);assert.equal(trace.committedWrites,0);assert.equal(trace.runs.length,1);assert.equal(trace.runs[0].entered,false);assert.ok(trace.publications.some(row=>!row.fixturePublishing&&row.changed.includes('settings')));}
  assert.equal(counts.entries,0);assert.deepEqual(h.errors,[]);assert.equal(h.externalRequests,0);assert.equal(h.extensionNetworkRequests,0);assert.equal(h.deepSeekRequests.length,0);
 }finally{await h.close();}
});
}
