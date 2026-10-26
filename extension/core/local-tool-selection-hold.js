import {queueOriginalApplicationSelectionRead} from './indexed-store.js';
import {requireOriginalApplicationSelectionMember,chargeOriginalApplicationSelectionMember,trackOriginalApplicationSelectionMemberWork,invalidateOriginalApplicationSelectionMember,originalApplicationSelectionMemberPinned} from '../background/application-selection-reservation-coordination.js';
import {ArchiveError} from './constants.js';
import {controlPublicationEncoding} from './local-control-publication.js';
import {requireOriginalLibraryDocumentsGenerationMethods} from './library-documents-owner.js';
import {createOriginalRecoveryWork,originalRestrictedRepositoryTransaction,checkOriginalRecoveryWork,bindOriginalRecoveryWorkApplicationSelection} from './idb-repository.js';
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
// Restriction-only implementation detail for the three original local tools.
// Its tokens are private to each original class; this helper grants no selection,
// cold, external-writer or global-quiescence authority.
export function localToolSelectionHold(store,original,{importTasks=false,owner=null,kind=null}={}){
 const repository=store?.repository,database=repository?.db,databaseId=store?.databaseId,local=store?.local,get=local?.get,set=local?.set,run=store?.run,transaction=repository?.transaction;
 const tasks=new Set(),probes=new Set();let hold=null,serial=0;
 const identity=()=>{requireOriginalLibraryDocumentsGenerationMethods(store);if(!original()||!database||store.repository!==repository||repository.db!==database||store.databaseId!==databaseId||store.local!==local||local.get!==get||local.set!==set||store.run!==run||repository.transaction!==transaction)fail();};
 const current=h=>{try{identity();const valid=hold===h&&h.valid&&now()<h.deadline;if(!valid&&h.selection)invalidateOriginalSelectionHold(h);return valid;}catch{invalidateOriginalSelectionHold(h);return false;}};
 const admit=()=>{if(hold)fail('LOCAL_TOOL_SELECTION_HELD');return serial;};
 const check=epoch=>{if(hold||epoch!==serial)fail('LOCAL_TOOL_SELECTION_HELD');};
 const entry=fn=>{const epoch=admit();let resolve,reject;const task=new P((a,b)=>{resolve=a;reject=b;});tasks.add(task);observe(task,()=>tasks.delete(task),()=>tasks.delete(task));try{observe(resolved(fn(epoch)),resolve,reject);}catch(e){reject(e);}return task;};
 const snapshot=h=>{const read=async t=>{
  const rows=[];for(const key of keys)rows.push((await t.get('meta',key))??null);
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
 return Object.freeze({admit,check,entry,
  invalidate(){serial++;invalidateOriginalSelectionHold(hold);},
  sourceIs(candidate){try{identity();return candidate===store;}catch{return false;}},
  async hold(action=null){admit();identity();const selection=originalSelectionHoldBinding(action,owner,kind);const h={selection,token:Object.freeze(Object.create(null)),valid:true,ready:false,deadline:selection?.deadline??now()+30000,error:null,snapshot:null};hold=h;serial++;try{h.work=selection?bindOriginalSelectionHoldRepository(h,repository):createOriginalRecoveryWork(repository,{isCurrent:()=>current(h)});}catch(error){invalidateOriginalSelectionHold(h);h.error=error;throw error;}
   const acquire=(async()=>{for(;;){if(!current(h))fail('OUTCOME_UNKNOWN');if(tasks.size||probes.size){await settled([...tasks,...probes]);continue;}await resolved();if(!tasks.size&&!probes.size)break;}h.snapshot=await snapshot(h);if(!current(h)||tasks.size||probes.size)fail('OUTCOME_UNKNOWN');checkOriginalRecoveryWork(repository,h.work);h.ready=true;return h.token;})();
   trackOriginalSelectionHoldWork(h,acquire);for(const task of [...tasks,...probes])retainOriginalSelectionHoldWork(h,task);try{return await bounded(h,acquire);}catch(error){invalidateOriginalSelectionHold(h);h.error=error;throw error;}
  },
  held(token){return !!hold&&hold.token===token&&hold.ready&&current(hold)&&!tasks.size&&!probes.size;},
  async fence(token){const h=hold;if(!h||h.token!==token||!h.ready||!current(h)||tasks.size||probes.size)fail();try{const value=await bounded(h,snapshot(h));chargeOriginalSelectionHold(h,[value,h.snapshot],0);if(value!==h.snapshot||!current(h)||tasks.size||probes.size)fail();checkOriginalRecoveryWork(repository,h.work);return true;}catch(error){invalidateOriginalSelectionHold(h);h.error=error;throw error;}},
  release(token,action=null){if(!hold||hold.token!==token&&!(token===undefined&&hold.selection?.action===action))return false;if(originalSelectionHoldPinned(hold)){invalidateOriginalSelectionHold(hold);return false;}chargeOriginalSelectionHold(hold,{operation:'release'},1);hold.valid=false;hold=null;return true;},
  releaseFailed(error,action=null){if(!hold||hold.valid||!error||hold.error!==error)return false;if(originalSelectionHoldPinned(hold)){invalidateOriginalSelectionHold(hold);return false;}chargeOriginalSelectionHold(hold,{operation:'release-failed'},1);hold=null;return true;}
 });
}
