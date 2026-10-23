import {ArchiveError} from '../constants.js';
import {requireRepositoryTransactionDataMethods,registerRepositoryWorkLimit,registerRepositoryFinalReadFence} from '../idb-repository.js';
import {CanonicalGenerationPublication,CANONICAL_GENERATION_GATE} from './canonical-generation-publication.js';
import {BrowserNativeSyncCore} from './core.js';
import {readObject,assertProtocolObjectReference,SEGMENT_PROFILE} from './segments.js';
import {checkpointItems} from './checkpoints.js';
import {assertGroupedCheckpointManifest} from './group-checkpoint-manifest.js';
import {validateGroupedCheckpointGraph} from './group-checkpoint.js';
import {createGroupPageBudget,chargeGroupPageValue,chargeGroupPageBytes,checkGroupPageBudget,GROUP_PAGE_LIMITS} from './group-page-reader.js';
import {bytes,clone,decodeJSON,digest,equal,hash} from './value.js';

// Explicit shadow-generation consumer. It authenticates checkpoint transport and
// the original bounded complete graph; it does not materialize canonical rows,
// grant product access, publish chrome.local or choose the application's DB.
export const CANONICAL_CHECKPOINT_PREFIX='canonical-generation:checkpoint:';
export const CANONICAL_CHECKPOINT_STATE=CANONICAL_CHECKPOINT_PREFIX+'state:v1';
const ITEM=CANONICAL_CHECKPOINT_PREFIX+'item:',PAGE=CANONICAL_CHECKPOINT_PREFIX+'page:',PAGE_ITEMS=32;
const proofs=new WeakMap(),fail=(code='GENERATION_CHECKPOINT_CHANGED')=>{throw new ArchiveError(code);};
const key=(prefix,n)=>prefix+String(n).padStart(8,'0');
const freeze=x=>{if(x&&typeof x==='object'){Object.values(x).forEach(freeze);Object.freeze(x);}return x;};
const own=(v,keys)=>v&&Object.getPrototypeOf(v)===Object.prototype&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k));
function stateData(row,core){
 if(!own(row,['id','version','phase','manifestRef','manifest','manifestEncoded','received','pages','payloadBytes','chain','pageChain','graphDigest','sourceBase'])||row.id!==CANONICAL_CHECKPOINT_STATE||row.version!==1||!['staging','authenticated','validated'].includes(row.phase)||!Number.isSafeInteger(row.received)||row.received<0||row.received>GROUP_PAGE_LIMITS.refs||!Number.isSafeInteger(row.pages)||row.pages<0||row.pages>Math.ceil(GROUP_PAGE_LIMITS.refs/PAGE_ITEMS)||!Number.isSafeInteger(row.payloadBytes)||row.payloadBytes<0||row.payloadBytes>GROUP_PAGE_LIMITS.bytes||row.pages!==Math.ceil(row.received/PAGE_ITEMS)||row.chain!==''&&!hash(row.chain)||row.pageChain!==''&&!hash(row.pageChain)||row.graphDigest!==null&&!hash(row.graphDigest)||row.phase==='validated'&&!hash(row.graphDigest))fail();
 assertProtocolObjectReference(row.manifestRef);if(row.manifestRef.kind!=='checkpoint-manifest'||!Array.isArray(row.manifestEncoded)||row.manifestEncoded.length!==row.manifestRef.encodedBytes||row.manifestEncoded.some(v=>!Number.isInteger(v)||v<0||v>255))fail();
 assertGroupedCheckpointManifest(row.manifest,{core});if(row.received>row.manifest.itemCount||row.phase!=='staging'&&(row.received!==row.manifest.itemCount||row.chain!==row.manifest.chain))fail();return row;
}
function binding(store,core){if(!(core instanceof BrowserNativeSyncCore)||store?.repository!==core.repository)fail('GENERATION_CHECKPOINT_BINDING');return {store,core,repository:core.repository,datasetId:core.datasetId,prefix:core.prefix,namespace:core.fixedNamespace};}
function current(b){if(b.store.repository!==b.repository||b.core.repository!==b.repository||b.core.datasetId!==b.datasetId||b.core.prefix!==b.prefix||b.core.fixedNamespace!==b.namespace)fail('GENERATION_CHECKPOINT_BINDING');return true;}
function pointPlan(points,counts){return function*(){for(const [prefix,total]of counts)if((yield {method:'count',table:'meta',key:IDBKeyRange.bound(prefix,prefix+'\uffff',false,true)})!==total)fail();for(const row of points)if(!equal((yield {method:'get',table:'meta',key:row.id})??null,row))fail();return true;};}
function sealRows(repository,t,points,counts,isCurrent=()=>true){registerRepositoryFinalReadFence(repository,t,{isCurrent,plan:pointPlan(points,counts)});}
async function readRows(t,prefix,budget=createGroupPageBudget()){let after=null,out=[];do{const page=await t.primaryRangePage('meta',{prefix,after,limit:1});checkGroupPageBudget(budget);for(const {key:k,value}of page.rows){if(k!==value.id)fail();chargeGroupPageValue(budget,value);out.push(value);if(out.length>GROUP_PAGE_LIMITS.refs)fail('BNS_GROUP_RESOURCE_LIMIT');}after=page.next;}while(after!==null);return out;}
function held(proof,options){const p=proofs.get(proof);if(!p||p.binding.store!==options?.store||p.binding.core!==options?.core)fail('GENERATION_CHECKPOINT_PROOF_REQUIRED');current(p.binding);if(performance.now()-p.created>=30000)fail('BNS_GROUP_RESOURCE_LIMIT');return p;}
export function readCanonicalCheckpointProof(proof,options){const p=held(proof,options);return freeze(clone({manifestRef:p.state.manifestRef,manifest:p.state.manifest,items:p.items.map(x=>x.item),graphDigest:p.state.graphDigest,stateId:p.state.id,generationIdentity:p.gate.identity,sourceBase:p.state.sourceBase}));}
async function requireProof(proof,options,t,sealGate){
 const p=held(proof,options),repository=p.binding.repository;requireRepositoryTransactionDataMethods(repository,t);registerRepositoryWorkLimit(repository,t);
 const points=[p.state,p.gate,...p.items,...p.pages];for(const row of points)if(!equal(await t.get('meta',row.id)??null,row))fail();
 const itemRows=await readRows(t,ITEM),pageRows=await readRows(t,PAGE);if(!equal(itemRows,p.items)||!equal(pageRows,p.pages))fail();
 sealRows(repository,t,sealGate?points:points.filter(row=>row.id!==CANONICAL_GENERATION_GATE),[[ITEM,p.items.length],[PAGE,p.pages.length]],()=>{held(proof,options);return true;});return true;
}
export const requireCanonicalCheckpointProof=(proof,options,t)=>requireProof(proof,options,t,true);
// Original sealing coordinator still reads the old gate here; the publication
// owner alone writes and seals its successor gate in this same transaction.
export const requireCanonicalCheckpointProofForSeal=(proof,options,t)=>requireProof(proof,options,t,false);
export const requireCanonicalCheckpointInputProof=requireCanonicalCheckpointProofForSeal;
function boundedTransport(get,budget){const started=performance.now();let ended=false;return {close(){ended=true;},get:async ref=>{if(ended)fail('BNS_GROUP_RESOURCE_LIMIT');checkGroupPageBudget(budget);assertProtocolObjectReference(ref);chargeGroupPageBytes(budget,ref.decodedBytes);let timer;try{const remaining=30000-(performance.now()-started);if(remaining<=0)fail('BNS_GROUP_RESOURCE_LIMIT');const raw=await Promise.race([Promise.resolve().then(()=>get(ref)),new Promise((_,reject)=>{timer=setTimeout(()=>{ended=true;reject(new ArchiveError('BNS_GROUP_RESOURCE_LIMIT'));},remaining);})]);if(ended)fail('BNS_GROUP_RESOURCE_LIMIT');checkGroupPageBudget(budget);if(raw instanceof Uint8Array)chargeGroupPageBytes(budget,raw.byteLength);return raw;}finally{clearTimeout(timer);}}};}
export class CanonicalGenerationCheckpointStage {
 #publication;#handle;#binding;#checkpoint;
 constructor(publication,handle,{store,core,checkpoint=async()=>{}}){if(!(publication instanceof CanonicalGenerationPublication)||typeof checkpoint!=='function')fail('GENERATION_CHECKPOINT_BINDING');this.#publication=publication;this.#handle=handle;this.#binding=binding(store,core);this.#checkpoint=checkpoint;}
 async #read(){current(this.#binding);return this.#binding.repository.transaction(false,async t=>{const state=await t.get('meta',CANONICAL_CHECKPOINT_STATE);return state===undefined?null:stateData(state,this.#binding.core);},['meta']);}
 async #write(fn){current(this.#binding);return this.#publication.stagingWrite(this.#handle,async t=>{requireRepositoryTransactionDataMethods(this.#binding.repository,t);return fn(t);});}
 async begin(ref,get){const budget=createGroupPageBudget(),transport=boundedTransport(get,budget);try{return await this.#begin(ref,transport.get,budget);}finally{transport.close();}}
 async #begin(ref,get,budget){
  ref=clone(ref);current(this.#binding);if(ref?.kind!=='checkpoint-manifest'||typeof get!=='function')fail('BNS_CHECKPOINT_INVALID');
  const prior=await this.#read(),sourceToken=await this.#publication.captureSourceBase(prior?.sourceBase),sourceBase=this.#publication.sourceBaseSnapshot(sourceToken);
  let manifestEncoded;const decoded=await readObject(ref,async requested=>{const raw=await get(requested);if(!(raw instanceof Uint8Array))return raw;const owned=raw.slice();manifestEncoded=Array.from(owned);return owned;},{profile:SEGMENT_PROFILE});checkGroupPageBudget(budget);const manifest=decodeJSON(decoded,SEGMENT_PROFILE.decoded);assertGroupedCheckpointManifest(manifest,{core:this.#binding.core});
  await this.#publication.captureSourceBase(sourceBase);const before=await this.#read();if(before){if(!equal(before.manifestRef,ref)||!equal(before.manifest,manifest))fail('GENERATION_CHECKPOINT_COLLISION');return clone(before);}
  const state={id:CANONICAL_CHECKPOINT_STATE,version:1,phase:'staging',manifestRef:clone(ref),manifest,manifestEncoded,received:0,pages:0,payloadBytes:0,chain:'',pageChain:'',graphDigest:null,sourceBase};
  await this.#write(async t=>{if(await t.get('meta',state.id)||(await t.primaryRangePage('meta',{prefix:CANONICAL_CHECKPOINT_PREFIX,limit:1})).rows.length)fail('GENERATION_CHECKPOINT_COLLISION');await t.put('meta',state);sealRows(this.#binding.repository,t,[state],[[ITEM,0],[PAGE,0]],()=>current(this.#binding));});return clone(state);
 }
 async #append(expected,items){
  if(!items.length||items.length>PAGE_ITEMS||expected.received%PAGE_ITEMS!==0)fail();
  let chain=expected.chain,payloadBytes=expected.payloadBytes;for(const item of items){const raw=bytes(item);payloadBytes+=raw.length;if(payloadBytes>GROUP_PAGE_LIMITS.bytes)fail('BNS_GROUP_RESOURCE_LIMIT');chain=await digest(bytes(chain+'\n'+new TextDecoder().decode(raw)));}
  const pageDigest=await digest(bytes(items)),pageChain=await digest(bytes(expected.pageChain+'\n'+pageDigest)),rows=items.map((item,i)=>({id:key(ITEM,expected.received+i),item:clone(item)}));
  const receipt={id:key(PAGE,expected.pages),version:1,index:expected.pages,start:expected.received,count:items.length,pageDigest,pageChain};
  const next={...expected,received:expected.received+items.length,pages:expected.pages+1,payloadBytes,chain,pageChain};stateData(next,this.#binding.core);
  await this.#write(async t=>{if(!equal(await t.get('meta',expected.id),expected)||await t.get('meta',receipt.id))fail();for(const row of rows){if(await t.get('meta',row.id))fail();await t.put('meta',row);}await t.put('meta',receipt);await t.put('meta',next);sealRows(this.#binding.repository,t,[next,receipt,...rows],[],()=>current(this.#binding));});await this.#checkpoint('committed-page',{index:receipt.index,received:next.received});return next;
 }
 async stageCheckpoint(ref,get){const budget=createGroupPageBudget(),transport=boundedTransport(get,budget);try{return await this.#stageCheckpoint(ref,transport.get,budget);}finally{transport.close();}}
 async #stageCheckpoint(ref,get,budget){
  let state=await this.#begin(ref,get,budget);if(state.phase!=='staging')return state;
  let at=0,page=[],replayedChain='';
  // Replay authenticates the complete immutable transport chain on every resume;
  // the original iterator's cumulative budget is not reset for each page.
  for await(const item of checkpointItems(state.manifest,get,{profile:SEGMENT_PROFILE})){
   chargeGroupPageValue(budget,item);
   replayedChain=await digest(bytes(replayedChain+'\n'+new TextDecoder().decode(bytes(item))));at++;
   if(at<=state.received){const stored=await this.#binding.repository.transaction(false,t=>t.get('meta',key(ITEM,at-1)),['meta']);if(!equal(stored,{id:key(ITEM,at-1),item}))fail();continue;}
   page.push(item);if(page.length===PAGE_ITEMS){state=await this.#append(state,page);page=[];}
  }
  if(page.length)state=await this.#append(state,page);
  if(at!==state.manifest.itemCount||state.received!==at||state.chain!==replayedChain||state.chain!==state.manifest.chain)fail('BNS_CHECKPOINT_COUNT');
  const next={...state,phase:'authenticated'};await this.#write(async t=>{if(!equal(await t.get('meta',state.id),state))fail();await t.put('meta',next);sealRows(this.#binding.repository,t,[next],[[ITEM,state.received],[PAGE,state.pages]],()=>current(this.#binding));});return clone(next);
 }
 async validate(){
  const before=await this.#read();if(!before||before.phase==='staging')fail('GENERATION_CHECKPOINT_NOT_READY');await this.#publication.captureSourceBase(before.sourceBase);const budget=createGroupPageBudget();chargeGroupPageValue(budget,before);const manifestBytes=await readObject(before.manifestRef,async()=>Uint8Array.from(before.manifestEncoded),{profile:SEGMENT_PROFILE});checkGroupPageBudget(budget);if(!equal(decodeJSON(manifestBytes,SEGMENT_PROFILE.decoded),before.manifest))fail('GENERATION_CHECKPOINT_CHANGED');const snapshot=await this.#binding.repository.transaction(false,async t=>{
   if(!equal(await t.get('meta',before.id),before))fail();const items=await readRows(t,ITEM,budget),pages=await readRows(t,PAGE,budget),gate=await t.get('meta',CANONICAL_GENERATION_GATE);return {items,pages,gate};
  },['meta']);
  if(snapshot.items.length!==before.received||snapshot.pages.length!==before.pages||snapshot.gate?.phase!=='staging')fail();let chain='',pageChain='',payloadBytes=0;
  for(let n=0;n<snapshot.pages.length;n++){const page=snapshot.items.slice(n*PAGE_ITEMS,(n+1)*PAGE_ITEMS).map(row=>row.item),pageDigest=await digest(bytes(page));pageChain=await digest(bytes(pageChain+'\n'+pageDigest));const expected={id:key(PAGE,n),version:1,index:n,start:n*PAGE_ITEMS,count:page.length,pageDigest,pageChain};if(!equal(snapshot.pages[n],expected))fail();}
  for(let n=0;n<snapshot.items.length;n++){const row=snapshot.items[n];if(!own(row,['id','item'])||row.id!==key(ITEM,n))fail();const raw=bytes(row.item);payloadBytes+=raw.length;chain=await digest(bytes(chain+'\n'+new TextDecoder().decode(raw)));}
  if(payloadBytes!==before.payloadBytes||chain!==before.chain||pageChain!==before.pageChain)fail();
  const graphDigest=await validateGroupedCheckpointGraph(this.#binding.core,snapshot.items.map(x=>x.item),before.manifest,{store:this.#binding.store});checkGroupPageBudget(budget);if(before.graphDigest!==null&&before.graphDigest!==graphDigest)fail();
  await this.#publication.captureSourceBase(before.sourceBase);const next={...before,phase:'validated',graphDigest};let expectedGate=snapshot.gate;
  await this.#write(async t=>{const points=[before,snapshot.gate,...snapshot.items,...snapshot.pages];for(const row of points)if(!equal(await t.get('meta',row.id)??null,row))fail();await t.put('meta',next);sealRows(this.#binding.repository,t,[next,...snapshot.items,...snapshot.pages],[[ITEM,snapshot.items.length],[PAGE,snapshot.pages.length]],()=>current(this.#binding));expectedGate={...snapshot.gate,writeRevision:snapshot.gate.writeRevision+1};});
  const proof=Object.freeze(Object.create(null));proofs.set(proof,{binding:this.#binding,state:clone(next),items:clone(snapshot.items),pages:clone(snapshot.pages),gate:clone(expectedGate),created:performance.now()});return proof;
 }
}
