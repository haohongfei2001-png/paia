import assert from 'node:assert/strict';
import {completeFixture,rows} from './original-complete.mjs';
import {ArchiveNavigationQuery} from '../../core/archive-navigation-query.js';
import {NAV_CATALOG} from '../../core/read-projection-keys.js';
export {completeFixture,rows,ArchiveNavigationQuery,NAV_CATALOG};
export const windowOptions={providerKey:'chatgpt',groupKind:'unknown'};
export async function seedMetadata(s,count,{providers=['chatgpt']}={}){
 await s.finishFoundation();
 for(let start=0;start<count;start+=100)await s.write(async t=>{
  for(let i=start;i<Math.min(start+100,count);i++){
   const id='ans04-meta-'+String(i).padStart(6,'0'),platform=providers[i%providers.length],chat='ans04-chat-'+i,time=i%7===0?0:-(1609459200000+i%13);
   const value={id,platform,sourceConversationId:chat,userTitle:'User '+i,originalConversationTitle:'Source '+i,status:'active',titleRevision:0,firstSourceSentAt:null,lastSourceSentAt:null};
   await t.put('documents',{id,sequence:i,chatKey:platform+':'+chat,displayKey:[time,id],libraryDisplay:[time,id],value});
  }
 });
 await s.write(async t=>{const seq=await t.get('meta','sequence');await t.put('meta',{...seq,documents:count});});
}
export async function settled(q,options={},max=3000){
 for(let step=0;step<max;step++){
  const p=await q.page(options);assert.ok(p.operations.metadataScanned<=100);assert.equal(p.operations.inputBodyReads,0);assert.ok(p.items.length<=40);
  if(p.coverage.state==='complete')return p;
  assert.equal(p.coverage.state,'building');assert.equal(p.items.length,0);
 }throw Error('ANS-04 projection did not reach complete coverage');
}
export async function allPages(q,options={}){
 let page=await settled(q,options),out=[...page.items],pages=1;
 while(page.nextCursor){page=await q.page({...options,cursor:page.nextCursor});assert.equal(page.cursorInvalid,false);assert.equal(page.coverage.state,'complete');out.push(...page.items);assert.ok(++pages<10000);}
 return out;
}
export function forbidBodyReads(s){
 const original=s.repository.transaction.bind(s.repository),metrics={bodyReads:0,fullScans:0,maxBatch:0,maxWriterMs:0};
 s.repository.transaction=(write,fn,stores)=>original(write,async t=>{
  for(const method of ['get','all','page','rangePage','primaryRangePage','indexPrimaryPage','edge','keys'])if(t[method]){
   const f=t[method].bind(t);t[method]=async(name,...args)=>{
    if(['records','blocks','inputStates','thoughts','revisions'].includes(name)){metrics.bodyReads++;throw Error('Navigator attempted body read '+name);}
    if(method==='all'){metrics.fullScans++;throw Error('Navigator attempted unbounded all('+name+')');}
    const result=await f(name,...args);if(['primaryRangePage','indexPrimaryPage'].includes(method)){metrics.maxBatch=Math.max(metrics.maxBatch,result.rows.length);assert.ok(result.rows.length<=100);}return result;
   };
  }
  const start=performance.now();try{return await fn(t);}finally{if(write)metrics.maxWriterMs=Math.max(metrics.maxWriterMs,performance.now()-start);}
 },stores);
 return {metrics,restore(){s.repository.transaction=original;}};
}
export async function factDigest(s){
 const names=['records','recordIndex','blocks','blockIndex','documents','libraryDocuments','inputStates','inputRemovals','thoughts','revisions','dependencies','topics','sections','placements','provenance','filterInputs','filterIntents','times','tombstones','meta'];
 const values={};for(const name of names){let data=await rows(s,name);if(name==='meta')data=data.filter(r=>!r.id.startsWith('ans:index:')&&!r.id.startsWith('ans:index-state:'));values[name]=data.sort((a,b)=>String(a.id).localeCompare(String(b.id)));}return JSON.stringify(values);
}
export const evidence=n=>({id:'ans04-evidence-'+n,contractId:'ans04.synthetic',contractVersion:1,channel:'synthetic_fixture',scope:'conversation',originClass:'fixture',requestGeneration:n,evidenceKind:'relationship',digest:n.toString(16).padStart(64,'0')});
export const observation=(ref,n,fields)=>({conversationRef:ref,expectedRevision:n-1,observedAt:new Date(Date.UTC(2026,8,1,0,n)).toISOString(),evidence:evidence(n),...fields});
