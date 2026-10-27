import {queueOriginalApplicationSelectionRead,queueOriginalApplicationSelectionLocalToolsRead} from './indexed-store.js';
import {readOriginalApplicationSelectionLocalToolCutSources} from '../background/application-local-tools-coordination.js';
import {originalBootstrapFreeze,originalBootstrapCreate,originalBootstrapWeakMap,originalBootstrapWeakGet,originalBootstrapWeakSet} from '../background/native-host-bootstrap.js';
import {requireOriginalApplicationSelectionMember,chargeOriginalApplicationSelectionMember,trackOriginalApplicationSelectionMemberWork,invalidateOriginalApplicationSelectionMember,originalApplicationSelectionMemberPinned} from '../background/application-selection-reservation-coordination.js';
import {ArchiveError} from './constants.js';
import {controlPublicationEncoding} from './local-control-publication.js';
import {requireOriginalLibraryDocumentsGenerationMethods} from './library-documents-owner.js';
import {createOriginalRecoveryWork,originalRestrictedRepositoryTransaction,checkOriginalRecoveryWork,bindOriginalRecoveryWorkApplicationSelection,readOriginalApplicationSelectionMetaGroup,readOriginalRecoveryWorkSelectionAccounting} from './idb-repository.js';
const now=performance.now.bind(performance),P=Promise,then=Promise.prototype.then,resolve=Promise.resolve,apply=Reflect.apply;
const resolved=value=>apply(resolve,P,[value]);
const observe=(p,yes,no)=>apply(then,p,[yes,no]);
const settled=tasks=>new P(resolve=>{let n=tasks.length;if(!n)return resolve();for(const p of tasks)observe(p,()=>{if(!--n)resolve();},()=>{if(!--n)resolve();});});
const fail=(code='LOCAL_TOOL_SELECTION_STALE')=>{throw new ArchiveError(code);};
// Restriction-only shared plumbing. The fixed driver must have privately enrolled
// the exact original owner first; none of these operations registers authority.
export function originalSelectionHoldBinding(action,owner,kind){if(action===null)return null;const {deadline}=requireOriginalApplicationSelectionMember(action,owner,kind);chargeOriginalApplicationSelectionMember(action,owner,kind,{operation:'hold',kind},1);return Object.freeze({action,owner,kind,deadline});}
export function chargeOriginalSelectionHold(h,value,references=0){const b=h?.selection;if(b)return chargeOriginalApplicationSelectionMember(b.action,b.owner,b.kind,value,references);return true;}
export function invalidateOriginalSelectionHold(h){if(!h)return false;h.valid=false;const b=h.selection;if(b)invalidateOriginalApplicationSelectionMember(b.action,b.owner,b.kind);return false;}
export function originalSelectionHoldPinned(h){const b=h?.selection;return !!b&&originalApplicationSelectionMemberPinned(b.action,b.owner,b.kind);}
export function retainOriginalSelectionHoldWork(h,promise){const b=h?.selection;if(b)trackOriginalApplicationSelectionMemberWork(b.action,b.owner,b.kind,promise);return promise;}
export function trackOriginalSelectionHoldWork(h,promise){const b=h?.selection;if(!b)return promise;trackOriginalApplicationSelectionMemberWork(b.action,b.owner,b.kind,promise);observe(promise,value=>{try{chargeOriginalSelectionHold(h,{operation:'settled',value:value??null},1);}catch{invalidateOriginalSelectionHold(h);}},error=>{try{chargeOriginalSelectionHold(h,{operation:'rejected',code:typeof error?.code==='string'?error.code:null},1);}catch{}invalidateOriginalSelectionHold(h);});return promise;}
export function bindOriginalSelectionHoldRepository(h,repository){if(!h.selection)return null;const remaining=h.selection.deadline-now();if(remaining<=0)fail('OUTCOME_UNKNOWN');const work=createOriginalRecoveryWork(repository,{ms:Math.min(30000,remaining),isCurrent:()=>h.valid});bindOriginalRecoveryWorkApplicationSelection(repository,work,h.selection.action,h.selection.owner,h.selection.kind);return work;}
export function originalSelectionHoldRemaining(h){return h?.selection?Math.max(0,h.selection.deadline-now()):30000;}
const keys=['gate','recovery-restore-epoch','backup-data-generation','backup-recovery-settings','local-control-publication:reservation','local-control-publication:revision'];
// One private rendezvous for the fixed original three tools, never a read grant.
// Source capsules are obtained from their original class's private #selection,
// through the original aggregate registry; callers cannot nominate participants.
const cutSources=originalBootstrapWeakMap(),cuts=originalBootstrapWeakMap();
const cutKinds=['local-import','local-backup','local-integrity'];
export function createOriginalLocalToolsSelectionCut(action,aggregate,store,phase){
 if(action===null||(phase!=='hold'&&phase!=='fence'))fail();
 const original=readOriginalApplicationSelectionLocalToolCutSources(aggregate,store,action,phase);
 requireOriginalApplicationSelectionMember(action,aggregate,'local-tools');
 const sources=original.sources,repository=store.repository;
 if(sources.length!==3)fail();
 for(let i=0;i<3;i++){const source=originalBootstrapWeakGet(cutSources,sources[i]);if(!source||source.store!==store||source.repository!==repository||source.kind!==cutKinds[i]||source.importTasks!==(i===0))fail();}
 let resolveCut,rejectCut;const promise=new P((yes,no)=>{resolveCut=yes;rejectCut=no;});observe(promise,()=>{},()=>{});
 const token=originalBootstrapFreeze(originalBootstrapCreate(null));
 const r={token,action,aggregate,store,repository,phase,sources,aggregateCurrent:original.current,participants:[null,null,null],joined:0,started:false,settled:false,failed:false,error:null,promise,resolve:resolveCut,reject:rejectCut};
 originalBootstrapWeakSet(cuts,token,r);return token;
}
export function abortOriginalLocalToolsSelectionCut(cut,error){
 const r=originalBootstrapWeakGet(cuts,cut);if(!r||r.settled)return false;
 if(!r.failed){r.failed=true;r.error=error??new ArchiveError('OUTCOME_UNKNOWN');}
 for(let i=0;i<3;i++)if(r.participants[i])try{r.participants[i].invalidate();}catch{}
 // Accepted physical work owns settlement. A deadline/refusal does not retire it.
 if(!r.started){r.settled=true;r.reject(r.error);}return false;
}
function cutCurrent(r){
 try{if(r.failed||r.settled||r.joined!==3||!r.aggregateCurrent())return false;for(let i=0;i<3;i++)if(!r.participants[i].current())return false;return true;}catch{return false;}
}
async function readCut(r,t,values){
 if(!cutCurrent(r)||!Array.isArray(values)||values.length!==6)fail('OUTCOME_UNKNOWN');
 const rows=[];for(let i=0;i<6;i++)rows.push(values[i]??null);
 if(rows[3]||rows[4])fail('OUTCOME_UNKNOWN');
 const imported=[];let after;
 do{if(!cutCurrent(r))fail('OUTCOME_UNKNOWN');const page=await t.page('importTasks',{after,limit:100});if(!cutCurrent(r))fail('OUTCOME_UNKNOWN');for(const row of page.rows){if(!['completed','partial','cancelled'].includes(row.value.phase))fail('OUTCOME_UNKNOWN');imported.push(row);}after=page.next;}while(after);
 const meta=controlPublicationEncoding(rows),imports=imported.length?controlPublicationEncoding([...rows,...imported]):meta;
 return {meta,imports};
}
// Only the original IndexedStore producer consumes this private lookup. Its
// methods are fixed closures, not caller-supplied callbacks or tx authority.
export function readOriginalLocalToolsSelectionCut(cut,store,action,aggregate){
 const r=originalBootstrapWeakGet(cuts,cut);
 if(!r||r.store!==store||r.action!==action||r.aggregate!==aggregate||!r.started||!cutCurrent(r))fail('OUTCOME_UNKNOWN');
 return r.producer;
}
// Injected diagnostics read counters only: no currentness call, fee or capability.
export function readOriginalLocalToolsSelectionCutAccounting(cut){
 const r=originalBootstrapWeakGet(cuts,cut);if(!r)return null;const restrictions=[];
 for(let i=0;i<3;i++){const p=r.participants[i],s=p?readOriginalRecoveryWorkSelectionAccounting(r.repository,p.ticket):null;restrictions.push(s===null?null:originalBootstrapFreeze({references:s.references,bytes:s.bytes,deadline:s.deadline,failed:s.failed,closed:s.closed,pending:s.pending,scope:s.scope,window:s.window}));}
 return originalBootstrapFreeze({joined:r.joined,started:r.started,settled:r.settled,failed:r.failed,restrictions:originalBootstrapFreeze(restrictions)});
}
function startCut(r){
 if(r.started||r.settled||r.failed)return;
 if(!cutCurrent(r)){abortOriginalLocalToolsSelectionCut(r.token,new ArchiveError('OUTCOME_UNKNOWN'));return;}
 r.started=true;
 const participants=[];for(let i=0;i<3;i++){const p=r.participants[i];participants.push(originalBootstrapFreeze({owner:p.owner,kind:p.kind,ticket:p.ticket,current:p.current}));}
 r.producer=originalBootstrapFreeze({participants:originalBootstrapFreeze(participants),current:()=>cutCurrent(r),read:(t,values)=>readCut(r,t,values)});
 const produce=async()=>{
  let value;
  try{
   value=await queueOriginalApplicationSelectionLocalToolsRead(r.store,r.action,r.aggregate,r.token);
   if(!value||typeof value.meta!=='string'||typeof value.imports!=='string'||!cutCurrent(r))fail('OUTCOME_UNKNOWN');
   // This newly materialized combined result is actual same-action work too.
   chargeOriginalApplicationSelectionMember(r.action,r.aggregate,'local-tools',value,0);
   requireOriginalApplicationSelectionMember(r.action,r.aggregate,'local-tools');
   if(!cutCurrent(r))fail('OUTCOME_UNKNOWN');
  }catch(error){abortOriginalLocalToolsSelectionCut(r.token,error);}
  r.settled=true;if(r.failed)r.reject(r.error);else r.resolve(value);
 };
 observe(produce(),()=>{},error=>{r.failed=true;r.error=error;r.settled=true;r.reject(error);});
}

// Restriction-only implementation detail for the three original local tools.
// Its tokens are private to each original class; this helper grants no selection,
// cold, external-writer or global-quiescence authority.
export function localToolSelectionHold(store,original,{importTasks=false,owner=null,kind=null}={}){
 const repository=store?.repository,database=repository?.db,databaseId=store?.databaseId,local=store?.local,get=local?.get,set=local?.set,run=store?.run,transaction=repository?.transaction;
 const tasks=new Set(),probes=new Set();let hold=null,serial=0;
 const sourceToken=originalBootstrapFreeze(originalBootstrapCreate(null));originalBootstrapWeakSet(cutSources,sourceToken,{store,repository,owner,kind,importTasks});
 const identity=()=>{requireOriginalLibraryDocumentsGenerationMethods(store);if(!original()||!database||store.repository!==repository||repository.db!==database||store.databaseId!==databaseId||store.local!==local||local.get!==get||local.set!==set||store.run!==run||repository.transaction!==transaction)fail();};
 const current=h=>{try{identity();const valid=hold===h&&h.valid&&now()<h.deadline;if(!valid&&h.selection)invalidateOriginalSelectionHold(h);return valid;}catch{invalidateOriginalSelectionHold(h);return false;}};
 const admit=()=>{if(hold)fail('LOCAL_TOOL_SELECTION_HELD');return serial;};
 const check=epoch=>{if(hold||epoch!==serial)fail('LOCAL_TOOL_SELECTION_HELD');};
 const entry=fn=>{const epoch=admit();let resolve,reject;const task=new P((a,b)=>{resolve=a;reject=b;});tasks.add(task);observe(task,()=>tasks.delete(task),()=>tasks.delete(task));try{observe(resolved(fn(epoch)),resolve,reject);}catch(e){reject(e);}return task;};
 const sharedSnapshot=(h,cut,phase)=>{
  const r=originalBootstrapWeakGet(cuts,cut),index=kind==='local-import'?0:kind==='local-backup'?1:kind==='local-integrity'?2:-1,epoch=serial;
  if(!r||r.settled||r.failed||r.phase!==phase||r.action!==h.selection?.action||r.store!==store||r.repository!==repository||index<0||r.sources[index]!==sourceToken||r.participants[index]||!current(h)||tasks.size||probes.size)fail('OUTCOME_UNKNOWN');
  let probe;
  const participant={owner,kind,ticket:h.work,invalidate:()=>invalidateOriginalSelectionHold(h),current:()=>serial===epoch&&current(h)&&!tasks.size&&probes.size===1&&probes.has(probe)};
  r.participants[index]=participant;r.joined++;
  probe=new P((yes,no)=>observe(r.promise,value=>yes(importTasks?value.imports:value.meta),no));
  probes.add(probe);observe(probe,()=>probes.delete(probe),()=>probes.delete(probe));trackOriginalSelectionHoldWork(h,probe);
  // The last join has installed its own probe before any producer callback runs.
  if(r.joined===3)observe(resolved(),()=>startCut(r),error=>abortOriginalLocalToolsSelectionCut(cut,error));
  return probe;
 };
 const snapshot=(h,cut=null,phase=null)=>{if(cut!==null)return sharedSnapshot(h,cut,phase);const read=async t=>{
  // All six original gets precede this snapshot's first semantic validation.
  // Preserve their exact order; the helper never deduplicates requested keys.
  const values=await readOriginalApplicationSelectionMetaGroup(t,keys),rows=[];for(const value of values)rows.push(value??null);
  if(rows[3]||rows[4])fail('OUTCOME_UNKNOWN');
  // No automatic pause/cancel or deletion: a cold/nonterminal import is not
  // certified by an empty warm promise set.
  if(importTasks){let after;do{const page=await t.page('importTasks',{after,limit:100});for(const row of page.rows)if(!['completed','partial','cancelled'].includes(row.value.phase))fail('OUTCOME_UNKNOWN');rows.push(...page.rows);after=page.next;}while(after);}
  return controlPublicationEncoding(rows);
 };const stores=importTasks?['meta','importTasks']:['meta'],b=h.selection;const probe=b?queueOriginalApplicationSelectionRead(store,b.action,b.owner,b.kind,h.work,read,stores):apply(run,store,[()=>originalRestrictedRepositoryTransaction(repository,h.work,false,read,stores)]);trackOriginalSelectionHoldWork(h,probe);probes.add(probe);observe(probe,()=>probes.delete(probe),()=>probes.delete(probe));return probe;};
 // Timeout bounds only this caller's wait. Keep the original queued/native
 // probe observed until actual settlement, including across release/reacquire.
 const bounded=(h,promise)=>{let timer;return new P((resolve,reject)=>{
  observe(promise,value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});
  const remaining=h.deadline-now(),expired=()=>{invalidateOriginalSelectionHold(h);reject(new ArchiveError('OUTCOME_UNKNOWN'));};
  if(remaining<=0)expired();else timer=setTimeout(expired,remaining);
 });};
 return Object.freeze({admit,check,entry,cutSource:()=>sourceToken,
  invalidate(){serial++;invalidateOriginalSelectionHold(hold);},
  sourceIs(candidate){try{identity();return candidate===store;}catch{return false;}},
  async hold(action=null,cut=null){admit();identity();const selection=originalSelectionHoldBinding(action,owner,kind);const h={selection,token:Object.freeze(Object.create(null)),valid:true,ready:false,deadline:selection?.deadline??now()+30000,error:null,snapshot:null};hold=h;serial++;try{h.work=selection?bindOriginalSelectionHoldRepository(h,repository):createOriginalRecoveryWork(repository,{isCurrent:()=>current(h)});}catch(error){if(cut!==null)abortOriginalLocalToolsSelectionCut(cut,error);invalidateOriginalSelectionHold(h);h.error=error;throw error;}
   const acquire=(async()=>{for(;;){if(!current(h))fail('OUTCOME_UNKNOWN');if(tasks.size||probes.size){await settled([...tasks,...probes]);continue;}await resolved();if(!tasks.size&&!probes.size)break;}h.snapshot=await snapshot(h,cut,'hold');if(!current(h)||tasks.size||probes.size)fail('OUTCOME_UNKNOWN');checkOriginalRecoveryWork(repository,h.work);h.ready=true;return h.token;})();
   trackOriginalSelectionHoldWork(h,acquire);for(const task of [...tasks,...probes])retainOriginalSelectionHoldWork(h,task);try{return await bounded(h,acquire);}catch(error){if(cut!==null)abortOriginalLocalToolsSelectionCut(cut,error);invalidateOriginalSelectionHold(h);h.error=error;throw error;}
  },
  held(token){return !!hold&&hold.token===token&&hold.ready&&current(hold)&&!tasks.size&&!probes.size;},
  async fence(token,cut=null){const h=hold;if(!h||h.token!==token||!h.ready||!current(h)||tasks.size||probes.size)fail();try{const value=await bounded(h,snapshot(h,cut,'fence'));chargeOriginalSelectionHold(h,[value,h.snapshot],0);if(value!==h.snapshot||!current(h)||tasks.size||probes.size)fail();checkOriginalRecoveryWork(repository,h.work);return true;}catch(error){if(cut!==null)abortOriginalLocalToolsSelectionCut(cut,error);invalidateOriginalSelectionHold(h);h.error=error;throw error;}},
  release(token,action=null){if(!hold||hold.token!==token&&!(token===undefined&&hold.selection?.action===action))return false;if(originalSelectionHoldPinned(hold)){invalidateOriginalSelectionHold(hold);return false;}chargeOriginalSelectionHold(hold,{operation:'release'},1);hold.valid=false;hold=null;return true;},
  releaseFailed(error,action=null){if(!hold||hold.valid||!error||hold.error!==error)return false;if(originalSelectionHoldPinned(hold)){invalidateOriginalSelectionHold(hold);return false;}chargeOriginalSelectionHold(hold,{operation:'release-failed'},1);hold=null;return true;}
 });
}
