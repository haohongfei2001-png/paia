import {ArchiveError} from './constants.js';
import {controlPublicationEncoding} from './local-control-publication.js';
import {requireOriginalLibraryDocumentsGenerationMethods} from './library-documents-owner.js';
import {createOriginalRecoveryWork,originalRestrictedRepositoryTransaction,checkOriginalRecoveryWork} from './idb-repository.js';
const now=performance.now.bind(performance),P=Promise,then=Promise.prototype.then,resolve=Promise.resolve,apply=Reflect.apply;
const resolved=value=>apply(resolve,P,[value]);
const observe=(p,yes,no)=>apply(then,p,[yes,no]);
const settled=tasks=>new P(resolve=>{let n=tasks.length;if(!n)return resolve();for(const p of tasks)observe(p,()=>{if(!--n)resolve();},()=>{if(!--n)resolve();});});
const fail=(code='LOCAL_TOOL_SELECTION_STALE')=>{throw new ArchiveError(code);};
const keys=['gate','recovery-restore-epoch','backup-data-generation','backup-recovery-settings','local-control-publication:reservation','local-control-publication:revision'];
// Restriction-only implementation detail for the three original local tools.
// Its tokens are private to each original class; this helper grants no selection,
// cold, external-writer or global-quiescence authority.
export function localToolSelectionHold(store,original,{importTasks=false}={}){
 const repository=store?.repository,database=repository?.db,databaseId=store?.databaseId,local=store?.local,get=local?.get,set=local?.set,run=store?.run,transaction=repository?.transaction;
 const tasks=new Set(),probes=new Set();let hold=null,serial=0;
 const identity=()=>{requireOriginalLibraryDocumentsGenerationMethods(store);if(!original()||!database||store.repository!==repository||repository.db!==database||store.databaseId!==databaseId||store.local!==local||local.get!==get||local.set!==set||store.run!==run||repository.transaction!==transaction)fail();};
 const current=h=>{try{identity();return hold===h&&h.valid&&now()<h.deadline;}catch{return false;}};
 const admit=()=>{if(hold)fail('LOCAL_TOOL_SELECTION_HELD');return serial;};
 const check=epoch=>{if(hold||epoch!==serial)fail('LOCAL_TOOL_SELECTION_HELD');};
 const entry=fn=>{const epoch=admit();let resolve,reject;const task=new P((a,b)=>{resolve=a;reject=b;});tasks.add(task);observe(task,()=>tasks.delete(task),()=>tasks.delete(task));try{observe(resolved(fn(epoch)),resolve,reject);}catch(e){reject(e);}return task;};
 const snapshot=h=>{const probe=apply(run,store,[()=>originalRestrictedRepositoryTransaction(repository,h.work,false,async t=>{
  const rows=[];for(const key of keys)rows.push((await t.get('meta',key))??null);
  if(rows[3]||rows[4])fail('OUTCOME_UNKNOWN');
  // No automatic pause/cancel or deletion: a cold/nonterminal import is not
  // certified by an empty warm promise set.
  if(importTasks){let after;do{const page=await t.page('importTasks',{after,limit:100});for(const row of page.rows)if(!['completed','partial','cancelled'].includes(row.value.phase))fail('OUTCOME_UNKNOWN');rows.push(...page.rows);after=page.next;}while(after);}
  return controlPublicationEncoding(rows);
 },importTasks?['meta','importTasks']:['meta'])]);probes.add(probe);observe(probe,()=>probes.delete(probe),()=>probes.delete(probe));return probe;};
 // Timeout bounds only this caller's wait. Keep the original queued/native
 // probe observed until actual settlement, including across release/reacquire.
 const bounded=(h,promise)=>{let timer;return new P((resolve,reject)=>{
  observe(promise,value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});
  const remaining=h.deadline-now(),expired=()=>{h.valid=false;reject(new ArchiveError('OUTCOME_UNKNOWN'));};
  if(remaining<=0)expired();else timer=setTimeout(expired,remaining);
 });};
 return Object.freeze({admit,check,entry,
  invalidate(){serial++;if(hold)hold.valid=false;},
  sourceIs(candidate){try{identity();return candidate===store;}catch{return false;}},
  async hold(){admit();identity();const h={token:Object.freeze(Object.create(null)),valid:true,ready:false,deadline:now()+30000,error:null,snapshot:null};hold=h;serial++;try{h.work=createOriginalRecoveryWork(repository,{isCurrent:()=>current(h)});}catch(error){h.valid=false;h.error=error;throw error;}
   const acquire=(async()=>{for(;;){if(!current(h))fail('OUTCOME_UNKNOWN');if(tasks.size||probes.size){await settled([...tasks,...probes]);continue;}await resolved();if(!tasks.size&&!probes.size)break;}h.snapshot=await snapshot(h);if(!current(h)||tasks.size||probes.size)fail('OUTCOME_UNKNOWN');checkOriginalRecoveryWork(repository,h.work);h.ready=true;return h.token;})();
   try{return await bounded(h,acquire);}catch(error){h.valid=false;h.error=error;throw error;}
  },
  held(token){return !!hold&&hold.token===token&&hold.ready&&current(hold)&&!tasks.size&&!probes.size;},
  async fence(token){const h=hold;if(!h||h.token!==token||!h.ready||!current(h)||tasks.size||probes.size)fail();try{if(await bounded(h,snapshot(h))!==h.snapshot||!current(h)||tasks.size||probes.size)fail();checkOriginalRecoveryWork(repository,h.work);return true;}catch(error){h.valid=false;h.error=error;throw error;}},
  release(token){if(!hold||hold.token!==token)return false;hold.valid=false;hold=null;return true;},
  releaseFailed(error){if(!hold||hold.valid||!error||hold.error!==error)return false;hold=null;return true;}
 });
}
