import {prepareOriginalCopyRetirement,retireOriginalCheckpointCopies} from './canonical-generation-copy-retirement.js';
import {CANONICAL_REPOSITORY_PROTECTION,originalGenerationProtection} from './canonical-generation-repository-gate.js';
import {createGroupPageBudget,chargeGroupPageValue,checkGroupPageBudget} from './group-page-reader.js';
import {requireOriginalHumanGenerationActivation} from './canonical-generation-human-restore.js';
import * as originalCheckpoint from './group-checkpoint.js';
import * as checkpointStage from './canonical-generation-checkpoint-stage.js';
import {ArchiveError} from '../constants.js';
import {SyncError} from './value.js';
import {ArchiveRepository,originalGenerationRepositoryTransaction,registerRepositoryWorkLimit,registerRepositoryFinalReadFence} from '../idb-repository.js';

// Opt-in publication infrastructure. This module does not validate a canonical
// graph, switch the application's repository, publish chrome.local or delete a
// database. A sealed identity is publication metadata, never a content grant.
export const CANONICAL_GENERATION_REGISTRY='canonical-generation:registry:v1';
export const CANONICAL_GENERATION_GATE='canonical-generation:gate:v1';
const qualifiedGraph='canonical-generation:qualified-graph:v1';
const receipts='canonical-generation:receipt:',deletions='canonical-generation:deletion:',invalidations='canonical-generation:invalidated:',catalog='canonical-generation:catalog:';
const handles=new WeakMap(),seals=new WeakMap(),bases=new WeakMap(),repositoryAuthorities=new WeakMap();
export function readOriginalPublicationRepositoryAuthority(token,repository,scope){
 const r=repositoryAuthorities.get(token);if(!r)return null;if(r.repository!==repository||r.name!==repository.name||r.factory!==repository.factory||scope!==null&&(repository.db!==scope.tx.db||r.scope!==null&&r.scope!==scope))fail('GENERATION_REPOSITORY_WRITE_DENIED');if(scope!==null&&r.scope===null)r.scope=scope;return r.authority;
}
async function publicationTransaction(repository,fn,stores=['meta'],kind='publication'){
 const token=Object.freeze(Object.create(null));repositoryAuthorities.set(token,{repository,name:repository.name,factory:repository.factory,scope:null,authority:Object.freeze({kind})});try{return await originalGenerationRepositoryTransaction(repository,token,fn,stores);}finally{repositoryAuthorities.delete(token);}
}

const fail=(code='GENERATION_INVALID')=>{throw new ArchiveError(code);};
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b),copy=x=>structuredClone(x);
const id=x=>typeof x==='string'&&/^[A-Za-z0-9_-]{8,128}$/.test(x);
const hash=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
function data(value,keys){
 if(!value||Object.getPrototypeOf(value)!==Object.prototype)fail();const d=Object.getOwnPropertyDescriptors(value);
 if(Reflect.ownKeys(d).length!==keys.length||keys.some(k=>!Object.hasOwn(d,k)||!Object.hasOwn(d[k],'value')))fail();
 return Object.fromEntries(keys.map(k=>[k,d[k].value]));
}
function identity(value){const r=data(value,['generationId','databaseId','databaseName']);if(!id(r.generationId)||!id(r.databaseId)||typeof r.databaseName!=='string'||!r.databaseName.length||r.databaseName.length>200)fail();return r;}
function sealData(value){const r=data(value,['sealId','manifestId','graphDigest']);if(!id(r.sealId)||!hash(r.manifestId)||!hash(r.graphDigest))fail();return r;}
function gateData(value){
 const r=data(value,['id','version','registryName','identity','phase','writeRevision','seal','publicationId','retirementId']);
 if(r.id!==CANONICAL_GENERATION_GATE||r.version!==1||!['staging','sealed','active','retired','invalidated','deleting'].includes(r.phase)||!Number.isSafeInteger(r.writeRevision)||r.writeRevision<0||r.publicationId!==null&&!id(r.publicationId)||r.retirementId!==null&&!id(r.retirementId))fail();
 if(typeof r.registryName!=='string'||!r.registryName.length)fail();identity(r.identity);if(r.seal!==null)sealData(r.seal);
 if(r.phase==='staging'&&(r.seal!==null||r.publicationId!==null||r.retirementId!==null)||r.phase==='sealed'&&(r.seal===null||r.publicationId!==null||r.retirementId!==null)||['active','retired'].includes(r.phase)&&(r.seal===null||r.publicationId===null)||r.phase==='active'&&r.retirementId!==null||r.phase==='retired'&&r.retirementId===null)fail();return r;
}
function receiptData(value){const r=data(value,['id','version','operationId','revision','from','to','seal']);if(!id(r.operationId)||r.id!==receipts+r.operationId||r.version!==1||!Number.isSafeInteger(r.revision)||r.revision<1)fail();if(r.from!==null)identity(r.from);identity(r.to);sealData(r.seal);return r;}
function invalidationData(value,operationId){const r=data(value,['id','version','operationId','state','reason','from','to']);if(r.id!==invalidations+operationId||r.operationId!==operationId||r.version!==1||r.state!=='reservation-invalidated'||r.reason!=='source-write-advanced')fail('GENERATION_CHANGED');identity(r.from);identity(r.to);return r;}
function rootData(value){
 if(value===undefined)return {id:CANONICAL_GENERATION_REGISTRY,version:1,revision:0,active:null,pending:null};
 const r=data(value,['id','version','revision','active','pending']);if(r.id!==CANONICAL_GENERATION_REGISTRY||r.version!==1||!Number.isSafeInteger(r.revision)||r.revision<0)fail();
 if(r.active!==null){const a=data(r.active,['identity','publicationId','receipt']);identity(a.identity);const receipt=receiptData(a.receipt);if(!id(a.publicationId)||receipt.operationId!==a.publicationId||!equal(receipt.to,a.identity)||receipt.revision>r.revision)fail();}
 if(r.pending!==null){const p=data(r.pending,['operationId','baseRevision','from','to','seal']);if(!id(p.operationId)||!Number.isSafeInteger(p.baseRevision)||p.baseRevision<0)fail();identity(p.to);sealData(p.seal);if(p.from!==null)gateData(p.from);if(p.baseRevision+1!==r.revision||!equal(p.from?.identity??null,r.active?.identity??null)||p.from&&p.from.publicationId!==r.active.publicationId)fail();}
 return r;
}
const rootRead=async t=>{const root=rootData(await t.get('meta',CANONICAL_GENERATION_REGISTRY));if(root.active&&!equal(await t.get('meta',root.active.receipt.id),root.active.receipt))fail('GENERATION_CHANGED');return root;};
function sealPoint(repository,t,key,expected){registerRepositoryFinalReadFence(repository,t,{isCurrent:()=>true,plan:function*(){if(!equal((yield {method:'get',table:'meta',key})??null,expected))fail('GENERATION_CHANGED');return true;}});}
function sealRoot(repository,t,root){sealPoint(repository,t,root.id,root);if(root.active)sealPoint(repository,t,root.active.receipt.id,root.active.receipt);}
async function write(repository,fn){return publicationTransaction(repository,async t=>{registerRepositoryWorkLimit(repository,t);return fn(t);},['meta']);}
const receiptValue=(pending,revision)=>({id:receipts+pending.operationId,version:1,operationId:pending.operationId,revision,from:pending.from?.identity??null,to:pending.to,seal:pending.seal});

export class CanonicalGenerationPublication {
 #registry;#registryName;#factory;#repositories=new Map();
 constructor(registry){if(!(registry instanceof ArchiveRepository))fail();this.#registry=registry;this.#registryName=registry.name;this.#factory=registry.factory;}
 #bound(repository){if(repository.factory!==this.#factory||repository===this.#registry&&repository.name!==this.#registryName||repository.db&&repository.db.name!==repository.name)fail('GENERATION_CAPABILITY');}
 #gate(row,ident){const gate=gateData(row);if(gate.registryName!==this.#registryName||!equal(gate.identity,ident))fail('GENERATION_COLLISION');return gate;}
 #held(handle){this.#bound(this.#registry);const held=handles.get(handle);if(!held||held.owner!==this||held.repository.factory!==this.#registry.factory||held.repository.name!==held.identity.databaseName)fail('GENERATION_CAPABILITY');this.#bound(held.repository);return held;}
 #repository(ident){const held=this.#repositories.get(ident.generationId);if(!held||!equal(held.identity,ident))fail('GENERATION_NOT_ATTACHED');this.#held(held.handle);return held.repository;}
 async attach(repository,definition){
  if(!(repository instanceof ArchiveRepository)||repository===this.#registry||repository.factory!==this.#registry.factory||repository.name===this.#registry.name)fail();
  const ident=identity({...data(definition,['generationId','databaseId']),databaseName:repository.name});
  for(const held of this.#repositories.values())if(held.identity.generationId===ident.generationId||held.identity.databaseName===ident.databaseName||held.identity.databaseId===ident.databaseId){if(held.repository===repository&&equal(held.identity,ident))return held.handle;fail('GENERATION_COLLISION');}
  await this.#registry.open();await repository.open();this.#bound(this.#registry);this.#bound(repository);
  const entries=[['generation',ident.generationId],['database',ident.databaseId],['name',ident.databaseName]].map(([kind,key])=>({id:catalog+kind+':'+key,version:1,identity:ident}));
  await write(this.#registry,async t=>{if(await t.get('meta',deletions+ident.generationId))fail('GENERATION_DELETED');for(const row of entries){const prior=await t.get('meta',row.id);if(prior&&!equal(prior,row))fail('GENERATION_COLLISION');if(!prior)await t.put('meta',row);sealPoint(this.#registry,t,row.id,row);}});
  await publicationTransaction(repository,async t=>{registerRepositoryWorkLimit(repository,t);const existing=await t.get('meta',CANONICAL_GENERATION_GATE);if(existing){this.#gate(existing,ident);return;}
   // New publication databases must be empty. The original schema owner may
   // create its exact DDL marker on a new thought-library database.
   for(const table of repository.stores){const count=await t.count(table);if(table==='meta'&&count===1){const ddl=await t.get('meta','thought-ddl');if(ddl?.id==='thought-ddl'&&ddl.fromVersion===0&&ddl.toVersion===5&&Object.keys(ddl).length===3)continue;}if(count)fail('GENERATION_NOT_EMPTY');}
   const gate={id:CANONICAL_GENERATION_GATE,version:1,registryName:this.#registryName,identity:ident,phase:'staging',writeRevision:0,seal:null,publicationId:null,retirementId:null};await t.put('meta',gate);sealPoint(repository,t,gate.id,gate);
  },repository.stores);
  const handle=Object.freeze(Object.create(null)),held={owner:this,repository,identity:ident,handle};handles.set(handle,held);this.#repositories.set(ident.generationId,held);return handle;
 }
 async captureSourceBase(expected=undefined){
  this.#bound(this.#registry);const root=await this.#registry.transaction(false,rootRead,['meta']);if(root.pending)fail('GENERATION_PENDING');
  const gate=root.active?await this.#repository(root.active.identity).transaction(false,async t=>this.#gate(await t.get('meta',CANONICAL_GENERATION_GATE),root.active.identity),['meta']):null;
  if(gate&&(gate.phase!=='active'||gate.publicationId!==root.active.publicationId))fail('GENERATION_CHANGED');if(!equal(await this.#registry.transaction(false,rootRead,['meta']),root))fail('GENERATION_CHANGED');
  const snapshot={root,gate};if(expected!==undefined){const input=data(expected,['root','gate']);rootData(input.root);if(input.gate!==null)gateData(input.gate);if(!equal(snapshot,input))fail('GENERATION_CHANGED');}
  const token=Object.freeze(Object.create(null));bases.set(token,{owner:this,snapshot:copy(snapshot)});return token;
 }
 sourceBaseSnapshot(token){const b=bases.get(token);if(!b||b.owner!==this)fail('GENERATION_CAPABILITY');return copy(b.snapshot);}
 async sealOriginalCheckpoint(handle,restore,proof){return this.#sealCheckpoint(handle,restore,proof,false);}
 async sealOriginalHumanCheckpoint(handle,restore,proof){return this.#sealCheckpoint(handle,restore,proof,true);}
 async #sealCheckpoint(handle,restore,proof,human){
  const held=this.#held(handle),validate=human?requireOriginalHumanGenerationActivation:originalCheckpoint.requireOriginalCanonicalGenerationActivation;if(typeof validate!=='function')fail('GENERATION_COORDINATOR_UNAVAILABLE');
  const packet=checkpointStage.readCanonicalCheckpointProof(proof,{store:restore?.store,core:restore?.live});
  // A source revision proves freshness, not inheritance of purge negatives or
  // existing canonical data. Replacement needs a separate migration owner.
  if(packet.sourceBase.root.active!==null)fail('GENERATION_EXISTING_SOURCE_OWNER_REQUIRED');
  const base=await this.captureSourceBase(packet.sourceBase);
  if(!equal(packet.generationIdentity,held.identity))fail('GENERATION_COLLISION');
  const selected=sealData({sealId:crypto.randomUUID(),manifestId:packet.manifestRef.id,graphDigest:packet.graphDigest});
  let validationError;const gate=await publicationTransaction(held.repository,async t=>{registerRepositoryWorkLimit(held.repository,t);const before=this.#gate(await t.get('meta',CANONICAL_GENERATION_GATE),held.identity);if(before.phase!=='staging')fail('GENERATION_NOT_STAGING');
   const qualification={id:qualifiedGraph,version:1,kind:human?'original-human':'original-group',identity:held.identity,seal:selected,sourceBase:packet.sourceBase};if(await t.get('meta',qualifiedGraph))fail('GENERATION_CHANGED');await t.put('meta',qualification);
   let actual;try{actual=await validate(restore,proof,t);}catch(error){if(error instanceof SyncError)validationError=error;throw error;}if(!equal(actual,{manifestId:selected.manifestId,graphDigest:selected.graphDigest,generationIdentity:held.identity}))fail('GENERATION_CHANGED');
   const after={...before,phase:'sealed',seal:selected};await t.put('meta',after);sealPoint(held.repository,t,after.id,after);sealPoint(held.repository,t,qualifiedGraph,qualification);return after;
  },held.repository.stores,'publication-seal').catch(error=>{throw validationError??error;});const token=Object.freeze(Object.create(null));seals.set(token,{owner:this,handle,gate,base:this.sourceBaseSnapshot(base)});return token;
 }
 async stagingWrite(handle,fn,authority=null,stores=undefined){return this.#writeGeneration(handle,'staging',fn,authority,stores);}
 async activeWrite(handle,fn){return this.#writeGeneration(handle,'active',fn);}
 async #writeGeneration(handle,phase,fn,authority=null,stores=undefined){
  const held=this.#held(handle);if(typeof fn!=='function')fail();let active=null;
  if(phase==='active'){const root=await this.#registry.transaction(false,rootRead,['meta']);if(root.pending||!equal(root.active?.identity,held.identity))fail('GENERATION_NOT_ACTIVE');active=root.active;}
  return originalGenerationRepositoryTransaction(held.repository,authority,async t=>{
   registerRepositoryWorkLimit(held.repository,t);const before=this.#gate(await t.get('meta',CANONICAL_GENERATION_GATE),held.identity);
   if(!equal(before.identity,held.identity)||before.phase!==phase||active&&before.publicationId!==active.publicationId)fail('GENERATION_STALE_WRITE');
   if(before.writeRevision>=Number.MAX_SAFE_INTEGER)fail('GENERATION_LIMIT');
   const result=await fn(t),after={...before,writeRevision:before.writeRevision+1};
   if(!equal(await t.get('meta',CANONICAL_GENERATION_GATE),before))fail('GENERATION_CHANGED');await t.put('meta',after);sealPoint(held.repository,t,after.id,after);return result;
  },stores);
 }
 async seal(handle,definition){
  const held=this.#held(handle),selected=sealData(definition);
  const gate=await write(held.repository,async t=>{if(await t.get('meta','canonical-generation:repository-protection:v1')!=null)fail('GENERATION_GRAPH_QUALIFICATION_REQUIRED');const before=this.#gate(await t.get('meta',CANONICAL_GENERATION_GATE),held.identity);if(!equal(before.identity,held.identity))fail('GENERATION_CHANGED');
   if(before.phase==='sealed'&&equal(before.seal,selected))return before;
   if(before.phase!=='staging')fail('GENERATION_NOT_STAGING');const after={...before,phase:'sealed',seal:selected};await t.put('meta',after);sealPoint(held.repository,t,after.id,after);return after;
  });
  const token=Object.freeze(Object.create(null));seals.set(token,{owner:this,handle,gate});return token;
 }
 async reserve(sealToken,operationId){
  const sealed=seals.get(sealToken);if(!sealed||sealed.owner!==this||!id(operationId))fail('GENERATION_CAPABILITY');const target=this.#held(sealed.handle);
  const before=await this.#registry.transaction(false,rootRead,['meta']);
  const from=before.active?await this.#repository(before.active.identity).transaction(false,async t=>this.#gate(await t.get('meta',CANONICAL_GENERATION_GATE),before.active.identity),['meta']):null;
  if(sealed.base&&(!equal(sealed.base.root,before)||!equal(sealed.base.gate,from)))fail('GENERATION_CHANGED');
  if(from&&(from.registryName!==this.#registryName||from.phase!=='active'||from.publicationId!==before.active.publicationId))fail('GENERATION_CHANGED');
  const actual=await target.repository.transaction(false,async t=>gateData(await t.get('meta',CANONICAL_GENERATION_GATE)),['meta']);if(!equal(actual,sealed.gate))fail('GENERATION_CHANGED');
  return write(this.#registry,async t=>{
   const root=await rootRead(t);if(!equal(root,before))fail('GENERATION_CHANGED');if(root.pending)fail('GENERATION_PENDING');if(root.revision>=Number.MAX_SAFE_INTEGER)fail('GENERATION_LIMIT');
   if(await t.get('meta',receipts+operationId)||await t.get('meta',invalidations+operationId)||await t.get('meta',deletions+target.identity.generationId)||equal(root.active?.identity,target.identity))fail('GENERATION_COLLISION');
   const pending={operationId,baseRevision:root.revision,from,to:target.identity,seal:sealed.gate.seal},next={...root,revision:root.revision+1,pending};await t.put('meta',next);sealRoot(this.#registry,t,next);return {state:'reserved',operationId};
  });
 }
 async advance(operationId){
  this.#bound(this.#registry);
  if(!id(operationId))fail();const root=await this.#registry.transaction(false,rootRead,['meta']),p=root.pending;
  if(!p){return this.#registry.transaction(false,async t=>{const invalidated=await t.get('meta',invalidations+operationId);if(invalidated){return copy(invalidationData(invalidated,operationId));}const receipt=receiptData(await t.get('meta',receipts+operationId));if(root.active?.publicationId===operationId&&!equal(receipt,root.active.receipt))fail('GENERATION_CHANGED');return {state:'committed',receipt};},['meta']);}
  if(p.operationId!==operationId)fail('GENERATION_PENDING');
  const target=this.#repository(p.to),targetGate=await target.transaction(false,async t=>gateData(await t.get('meta',CANONICAL_GENERATION_GATE)),['meta']);
  if(targetGate.registryName!==this.#registryName||!equal(targetGate.identity,p.to)||!equal(targetGate.seal,p.seal)||!['sealed','active','invalidated'].includes(targetGate.phase)||targetGate.phase==='active'&&targetGate.publicationId!==operationId||targetGate.phase==='invalidated'&&targetGate.retirementId!==operationId)fail('GENERATION_CHANGED');
  if(p.from){const source=this.#repository(p.from.identity);const retired=await write(source,async t=>{
   const old=this.#gate(await t.get('meta',CANONICAL_GENERATION_GATE),p.from.identity),expected={...p.from,phase:'retired',retirementId:operationId};if(equal(old,expected))return 'retired';
   if(old.phase==='active'&&old.writeRevision>p.from.writeRevision&&equal({...old,writeRevision:p.from.writeRevision},p.from))return 'drifted';
   if(!equal(old,p.from))fail('GENERATION_CHANGED');await t.put('meta',expected);sealPoint(source,t,expected.id,expected);return 'newly-retired';
  });if(retired==='drifted'){if(targetGate.phase==='active')fail('GENERATION_CHANGED');await write(target,async t=>{const actual=this.#gate(await t.get('meta',CANONICAL_GENERATION_GATE),p.to),discarded={...targetGate,phase:'invalidated',retirementId:operationId};if(!equal(actual,targetGate)&&!equal(actual,discarded))fail('GENERATION_CHANGED');await t.put('meta',discarded);sealPoint(target,t,discarded.id,discarded);});return write(this.#registry,async t=>{if(!equal(await rootRead(t),root))fail('GENERATION_CHANGED');const outcome={id:invalidations+operationId,version:1,operationId,state:'reservation-invalidated',reason:'source-write-advanced',from:p.from.identity,to:p.to},next={...root,pending:null};await t.put('meta',outcome);await t.put('meta',next);sealRoot(this.#registry,t,next);sealPoint(this.#registry,t,outcome.id,outcome);return copy(outcome);});}if(retired==='newly-retired')return {state:'source-retired',operationId};}
  if(targetGate.phase==='invalidated')fail('GENERATION_CHANGED');
  if(targetGate.phase==='sealed'){
   await write(target,async t=>{if(!equal(await t.get('meta',CANONICAL_GENERATION_GATE),targetGate))fail('GENERATION_CHANGED');const next={...targetGate,phase:'active',publicationId:operationId};await t.put('meta',next);sealPoint(target,t,next.id,next);});return {state:'target-ready',operationId};
  }
  return write(this.#registry,async t=>{
   if(!equal(await rootRead(t),root)||await t.get('meta',deletions+p.to.generationId)||await t.get('meta',receipts+operationId))fail('GENERATION_CHANGED');
   const receipt=receiptValue(p,root.revision),next={...root,active:{identity:p.to,publicationId:operationId,receipt},pending:null};await t.put('meta',receipt);await t.put('meta',next);sealRoot(this.#registry,t,next);sealPoint(this.#registry,t,receipt.id,receipt);return {state:'committed',receipt};
  });
 }
 async recover(){this.#bound(this.#registry);const root=await this.#registry.transaction(false,rootRead,['meta']);if(!root.pending)return {state:'idle',active:root.active};for(let n=0;n<3;n++){const result=await this.advance(root.pending.operationId);if(['committed','reservation-invalidated'].includes(result.state))return result;}fail('GENERATION_CHANGED');}
 async active(){
  this.#bound(this.#registry);
  const first=await this.#registry.transaction(false,rootRead,['meta']);if(first.pending)return {state:'pending',active:copy(first.active)};
  if(!first.active)return {state:'empty'};
  const repository=this.#repository(first.active.identity),gate=await repository.transaction(false,async t=>gateData(await t.get('meta',CANONICAL_GENERATION_GATE)),['meta']);
  const last=await this.#registry.transaction(false,async t=>{if(!equal(await t.get('meta',first.active.receipt.id),first.active.receipt))fail('GENERATION_CHANGED');return rootRead(t);},['meta']);if(!equal(first,last)||!equal(gate.seal,first.active.receipt.seal)||gate.registryName!==this.#registryName||gate.phase!=='active'||gate.publicationId!==first.active.publicationId||!equal(gate.identity,first.active.identity))fail('GENERATION_CHANGED');return {state:'active',...copy(first.active)};
 }
 async retireCheckpointCopies(handle){
  const started=performance.now(),budget=createGroupPageBudget(),held=this.#held(handle);
  // The receipt is from the original registry, never a caller DTO. This is a
  // two-database protocol: the target gate is the deletion TX linearization
  // point; this method does not promise a globally atomic active-pointer read.
  const root=await this.#registry.transaction(false,rootRead,['meta']);chargeGroupPageValue(budget,root);
  if(root.pending||!root.active||!equal(root.active.identity,held.identity))fail('GENERATION_NOT_ACTIVE');
  const receipt=receiptData(root.active.receipt);
  const selected=await held.repository.transaction(false,async t=>{return {gate:this.#gate(await t.get('meta',CANONICAL_GENERATION_GATE),held.identity),qualification:await t.get('meta',qualifiedGraph),marker:await t.get('meta',CANONICAL_REPOSITORY_PROTECTION)};},['meta']);chargeGroupPageValue(budget,selected);
  const {gate,qualification,marker:protection}=selected;originalGenerationProtection(protection,gate,held.repository.name);
  if(gate.phase!=='active'||gate.publicationId!==root.active.publicationId||!equal(gate.seal,receipt.seal)||receipt.from!==null)fail('GENERATION_CHANGED');
  const q=data(qualification,['id','version','kind','identity','seal','sourceBase']);if(q.id!==qualifiedGraph||q.version!==1||!['original-human','original-group'].includes(q.kind)||!equal(q.identity,held.identity)||!equal(q.seal,gate.seal))fail('GENERATION_GRAPH_QUALIFICATION_REQUIRED');
  const base=data(q.sourceBase,['root','gate']),sourceRoot=rootData(base.root);if(sourceRoot.active!==null||sourceRoot.pending!==null||base.gate!==null||receipt.revision!==sourceRoot.revision+1)fail('GENERATION_CHANGED');
  const prepared=await prepareOriginalCopyRetirement(held.repository,gate,qualification,budget,started);checkGroupPageBudget(budget);
  return publicationTransaction(held.repository,t=>retireOriginalCheckpointCopies(held.repository,t,prepared,gate,qualification,protection,budget,started),['meta'],'checkpoint-retire');
 }
 async prepareDeletion(handle){
  const held=this.#held(handle);
  // This persistent tombstone prevents a future publication from racing a
  // separately implemented physical deletion owner. No deleteDatabase here.
  const permit=await write(this.#registry,async t=>{
   const root=await rootRead(t);if([root.active?.identity,root.pending?.from?.identity,root.pending?.to].some(x=>equal(x,held.identity)))fail('GENERATION_ACTIVE_DELETE');
   const key=deletions+held.identity.generationId,prior=await t.get('meta',key),next={id:key,version:1,identity:held.identity};if(prior&&!equal(prior,next))fail('GENERATION_COLLISION');if(!prior)await t.put('meta',next);sealPoint(this.#registry,t,key,next);return next;
  });
  await write(held.repository,async t=>{const before=this.#gate(await t.get('meta',CANONICAL_GENERATION_GATE),held.identity);if(!equal(before.identity,held.identity))fail('GENERATION_CHANGED');const next={...before,phase:'deleting'};await t.put('meta',next);sealPoint(held.repository,t,next.id,next);});return {state:'deletion-authorized',identity:copy(permit.identity)};
 }
}
const originalStagingWrite=CanonicalGenerationPublication.prototype.stagingWrite;
export function originalCheckpointStagingWrite(publication,handle,fn,authority,stores){return originalStagingWrite.call(publication,handle,fn,authority,stores);}
