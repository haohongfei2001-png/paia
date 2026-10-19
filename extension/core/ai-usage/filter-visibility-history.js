import {registerRepositoryFinalReadFence} from '../idb-repository.js';
import {readFreshAIFilterVisibilityWitness,openAIFilterVisibilityWitness,readAIFilterVisibilityWitness} from './filter-visibility-witness.js';
import {validFilterVisibilityHistoryData} from './filter-visibility-history-data.js';
import {canonical,equal} from './contracts.js';
import {snapshot,exact,integer} from './qwen-request-data.js';
// Derived private history only. This prefix is outside the original Backup/Sync
// allowlist. It contains no active lease, credential, or content body.
export const FILTER_VISIBILITY_HISTORY_PREFIX='ai-filter-read-history:v1:operation:';
export const FILTER_VISIBILITY_HISTORY_INDEX='ai-filter-read-history:v1:index';
export const FILTER_VISIBILITY_HISTORY_LIMITS=Object.freeze({rowBytes:98*1024,totalBytes:64*1024*1024,indexReserveBytes:1024,page:8,pending:8});
const owners=new WeakMap(),resources=new WeakMap(),id=x=>typeof x==='string'&&x.length>0&&x.length<=200&&!/[\u0000-\u001f\u007f]/u.test(x),size=x=>new TextEncoder().encode(canonical(x)).length;
const fail=()=>{throw Object.assign(Error('Filter history unavailable'),{code:'UNAVAILABLE'});};
const key=id=>FILTER_VISIBILITY_HISTORY_PREFIX+id;
function validRow(row){return exact(row,['id','version','operationId','bytes','envelope'])&&row.version===1&&id(row.operationId)&&row.id===key(row.operationId)&&integer(row.bytes)&&row.bytes<=FILTER_VISIBILITY_HISTORY_LIMITS.rowBytes&&row.bytes===size(row)&&exact(row.envelope,['data','signature'])&&/^[a-f0-9]{64}$/.test(row.envelope.signature)&&validFilterVisibilityHistoryData(row.envelope.data)&&row.envelope.data.publication.operationId===row.operationId;}
function validIndex(row){return exact(row,['id','version','databaseId','count','bytes','revision'])&&row.id===FILTER_VISIBILITY_HISTORY_INDEX&&row.version===1&&id(row.databaseId)&&integer(row.count)&&integer(row.bytes)&&row.bytes<=FILTER_VISIBILITY_HISTORY_LIMITS.totalBytes-FILTER_VISIBILITY_HISTORY_LIMITS.indexReserveBytes&&size(row)<=FILTER_VISIBILITY_HISTORY_LIMITS.indexReserveBytes&&integer(row.revision)&&row.revision<Number.MAX_SAFE_INTEGER&&row.count<=row.bytes&&((row.count===0)===(row.bytes===0));}
async function base(t,check){check();const m=await t.get('meta','migration');check();const l=await t.get('meta','thought-library');check();const r=await t.get('meta','recovery-restore-epoch');check();if(m?.phase!=='active'||!id(m.databaseId)||l?.phase!=='active'||l.verified!==true||l.sealed!==0||r&&!id(r.value))fail();return {databaseId:m.databaseId,restoreEpoch:r?.value??null};}
// Compare closed expected metadata without evaluating unexpected accessors.
function sameData(a,b,depth=0){if(Object.is(a,b))return true;if(depth>32||!a||!b||typeof a!=='object'||typeof b!=='object'||Array.isArray(a)!==Array.isArray(b))return false;const x=Object.getOwnPropertyDescriptors(a),y=Object.getOwnPropertyDescriptors(b),keys=Reflect.ownKeys(y);return Reflect.ownKeys(x).length===keys.length&&keys.every(k=>x[k]&&Object.hasOwn(x[k],'value')&&Object.hasOwn(y[k],'value')&&sameData(x[k].value,y[k].value,depth+1));}
function expectedInput(data,item){const p=data.publication,filtered=p.filtered.find(x=>x.inputId===item.inputId);return {...item.row,...(filtered?{aiDecision:{version:1,policy:p.policy,authority:p.epochs,scope:p.scope,proof:p.proof,sequence:filtered.sequence},filteredKey:[0,-filtered.sequence,item.inputId]}:{})};}
async function currentRows(t,data,check){
 const b=await base(t,check);if(b.databaseId!==data.databaseId||b.restoreEpoch!==data.restoreEpoch)return false;
 for(const item of data.publication.proof.snapshot.items){check();const row=await t.get('filterInputs',item.inputId);check();if(!sameData(row,expectedInput(data,item)))return false;}check();return true;
}
// Fixed metadata-only owner plan. Expected writes and validity predicates are
// captured before the first put/delete. Repository alone performs final reads
// after its own finalizers; no crypto, new grant, or refreshed baseline enters.
function terminal(repository,t,{index,rows,baseline,states,check}){
 const expected=structuredClone({index,rows,baseline,states});const live=()=>{check();return true;};
 registerRepositoryFinalReadFence(repository,t,{isCurrent:live,plan:function*(){
  let reads=0;const get=function*(table,key){check();if(++reads>100)fail();return yield {method:'get',table,key};};
  const m=yield*get('meta','migration'),l=yield*get('meta','thought-library'),r=yield*get('meta','recovery-restore-epoch');
  if(m?.phase!=='active'||l?.phase!=='active'||l.verified!==true||l.sealed!==0||!sameData({databaseId:m.databaseId,restoreEpoch:r?.value??null},expected.baseline))fail();
  if(!sameData((yield*get('meta',FILTER_VISIBILITY_HISTORY_INDEX))??null,expected.index))fail();
  for(const row of expected.rows)if(!sameData((yield*get('meta',row.id))??null,row.value))fail();
  for(const state of expected.states){let valid=state.data.databaseId===expected.baseline.databaseId&&state.data.restoreEpoch===expected.baseline.restoreEpoch;
   if(valid)for(const item of state.data.publication.proof.snapshot.items)if(!sameData(yield*get('filterInputs',item.inputId),expectedInput(state.data,item))){valid=false;break;}
   if(valid!==state.valid)fail();
  }return true;
 }});
}

export function createAIFilterVisibilityHistory(store){
 if(!store?.repository?.db)return null;const repository=store.repository,database=repository.db;let resource=resources.get(repository);if(!resource){resource={pending:0};resources.set(repository,resource);}let disposed=false;
 const check=()=>{if(disposed||store.repository!==repository||repository.db!==database)fail();};
 const original=async t=>{const b=await base(t,check),index=await t.get('meta',FILTER_VISIBILITY_HISTORY_INDEX);check();if(index){if(!validIndex(index)||index.databaseId!==b.databaseId)fail();return index;}
  // A missing counter never licenses rebuilding historical authority from live
  // rows. Only an entirely empty owned prefix may initialize a new counter.
  const page=await t.primaryRangePage('meta',{prefix:FILTER_VISIBILITY_HISTORY_PREFIX,limit:1});check();if(page.rows.length)fail();return {id:FILTER_VISIBILITY_HISTORY_INDEX,version:1,databaseId:b.databaseId,count:0,bytes:0,revision:0};};
 const owner=Object.freeze({
  async persist(token){if(resource.pending>=FILTER_VISIBILITY_HISTORY_LIMITS.pending)return false;resource.pending++;
   try{check();const envelope=readFreshAIFilterVisibilityWitness(token,store);if(!envelope||!validFilterVisibilityHistoryData(envelope.data))return false;const data=envelope.data,operationId=data.publication.operationId,row={id:key(operationId),version:1,operationId,bytes:0,envelope};for(let i=0;i<4;i++){const bytes=size(row);if(bytes===row.bytes)break;row.bytes=bytes;}if(!validRow(row))return false;
    return await repository.transaction(true,async t=>{check();const index=await original(t),prior=await t.get('meta',row.id);check();if(prior&&!equal(prior,row))fail();if(!await currentRows(t,data,check))fail();
     const next=prior?index:{...index,count:index.count+1,bytes:index.bytes+row.bytes,revision:index.revision+1};if(!validIndex(next))fail();
     terminal(repository,t,{index:next,rows:[{id:row.id,value:row}],baseline:{databaseId:data.databaseId,restoreEpoch:data.restoreEpoch},states:[{data,valid:true}],check});if(prior)return true;
     await t.put('meta',row);check();await t.put('meta',next);check();if(!equal(await t.get('meta',row.id),row)||!equal(await t.get('meta',next.id),next)||!await currentRows(t,data,check))fail();check();return true;
    },['meta','filterInputs']);
   }catch{return false;}finally{resource.pending--;}
  },
  async load(operationId){if(!id(operationId)||resource.pending>=FILTER_VISIBILITY_HISTORY_LIMITS.pending)return null;resource.pending++;
   try{check();const row=await repository.transaction(false,async t=>{const index=await original(t);check();if(index.count===0)return null;return t.get('meta',key(operationId));},['meta']);check();if(!row||!validRow(row))return null;
    const witness=await openAIFilterVisibilityWitness(store,row.envelope);check();if(!witness)return null;const current=await repository.transaction(false,t=>t.get('meta',row.id),['meta']);check();return equal(current,row)?witness:null;
   }catch{return null;}finally{resource.pending--;}
  },
  async page(after=null){if(after!==null&&(!id(after)||after.includes('\uffff'))||resource.pending>=FILTER_VISIBILITY_HISTORY_LIMITS.pending)return null;resource.pending++;try{check();return await repository.transaction(false,async t=>{await original(t);const page=await t.primaryRangePage('meta',{prefix:FILTER_VISIBILITY_HISTORY_PREFIX,after:after===null?null:key(after),limit:FILTER_VISIBILITY_HISTORY_LIMITS.page});check();if(page.rows.some(x=>!validRow(x.value)))fail();return {operationIds:page.rows.map(x=>x.value.operationId),next:page.next?.slice(FILTER_VISIBILITY_HISTORY_PREFIX.length)??null};},['meta']);}catch{return null;}finally{resource.pending--;}},
  async cleanup(after=null){if(after!==null&&(!id(after)||after.includes('\uffff'))||resource.pending>=FILTER_VISIBILITY_HISTORY_LIMITS.pending)return null;resource.pending++;
   try{check();return await repository.transaction(true,async t=>{const index=await original(t),baseline=await base(t,check),page=await t.primaryRangePage('meta',{prefix:FILTER_VISIBILITY_HISTORY_PREFIX,after:after===null?null:key(after),limit:FILTER_VISIBILITY_HISTORY_LIMITS.page});check();let count=0,bytes=0;const removed=[],states=[];
    for(const {value:row}of page.rows){if(!validRow(row))fail();const valid=await currentRows(t,row.envelope.data,check);states.push({data:row.envelope.data,valid});if(!valid){removed.push(row);count++;bytes+=row.bytes;}}
    const next=count?{...index,count:index.count-count,bytes:index.bytes-bytes,revision:index.revision+1}:(await t.get('meta',FILTER_VISIBILITY_HISTORY_INDEX))??null;if(next&&!validIndex(next))fail();
    terminal(repository,t,{index:next,rows:page.rows.map(({value:row})=>({id:row.id,value:removed.includes(row)?null:row})),baseline,states,check});
    if(count){for(const row of removed){if(!equal(await t.get('meta',row.id),row))fail();await t.delete('meta',row.id);check();}await t.put('meta',next);check();if(!equal(await t.get('meta',next.id),next))fail();for(const row of removed)if(await t.get('meta',row.id))fail();}
    check();return {removed:count,next:page.next?.slice(FILTER_VISIBILITY_HISTORY_PREFIX.length)??null};
   },['meta','filterInputs']);}catch{return null;}finally{resource.pending--;}
  },
  isDrained:()=>resource.pending===0,dispose(){disposed=true;}
 });owners.set(owner,{store,repository,database});return owner;
}
export const isAIFilterVisibilityHistory=owner=>owners.has(owner);
