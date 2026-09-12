import {validateMemoryRow,key} from './memory/model.js';
import {ArchiveError} from './constants.js';

const tables=['records','blocks','thoughts','topics','sections','placements','provenance','revisions','meta'];
export const INTEGRITY_CATEGORIES=Object.freeze(['orphan_entries','orphan_topics','broken_provenance','missing_revision_refs','duplicate_stable_identity','invalid_organizer_checkpoint','dangling_redirects','dangling_memory_authorization','missing_memory_topic','excluded_missing_entry','excluded_missing_input','invalid_memory_profile_ref']);
const generation=async t=>(await t.get('meta','backup-data-generation'))?.value||0;
// Read-only, bounded pages. Only aggregate counts cross the UI boundary; no row,
// identity, body, credential or provider response is retained in a session.
export class IntegrityChecker {
 constructor(store,{clock=()=>Date.now(),pageSize=100}={}){this.s=store;this.clock=clock;this.pageSize=pageSize;this.sessions=new Map();}
 expire(){for(const [id,s]of this.sessions)if(this.clock()-s.at>600000)this.sessions.delete(id);}
 result(s){return {sessionId:s.id,state:s.state,checked:s.checked,total:s.total,counts:{...s.counts}};}
 async begin(){this.expire();if(this.sessions.size>=2)this.sessions.delete(this.sessions.keys().next().value);const snapshot=await this.s.repository.transaction(false,async t=>({generation:await generation(t),total:(await Promise.all(tables.map(n=>t.count(n)))).reduce((a,b)=>a+b,0)}));const s={id:crypto.randomUUID(),...snapshot,at:this.clock(),phase:0,cursor:null,checked:0,state:'loading',counts:Object.fromEntries(INTEGRITY_CATEGORIES.map(k=>[k,0]))};this.sessions.set(s.id,s);return this.result(s);}
 cancel({sessionId}={}){this.sessions.delete(sessionId);return {state:'idle'};}
 async page({sessionId}={}){this.expire();const s=this.sessions.get(sessionId);if(!s)throw new ArchiveError('INTEGRITY_SESSION_EXPIRED');if(s.pending)return s.pending;if(s.state!=='loading')return this.result(s);s.pending=this.scan(s).finally(()=>{s.pending=null;});return s.pending;}
 async scan(s){const update=await this.s.repository.transaction(false,async t=>{if(await generation(t)!==s.generation)return {state:'stale'};const name=tables[s.phase],page=await t.page(name,{after:s.cursor??undefined,limit:this.pageSize}),counts={...s.counts};for(const {value:row}of page.rows)await inspect(t,name,row,counts);return {counts,checked:s.checked+page.rows.length,cursor:page.next,phase:s.phase+(page.next?0:1),state:!page.next&&s.phase===tables.length-1?'ready':'loading'};});Object.assign(s,update,{at:this.clock()});return this.result(s);}
}
async function missingSources(t,ids){for(const id of ids||[])if(typeof id!=='string'||!await t.get('records',id))return true;return false;}
async function inspect(t,name,raw,c){const r=['records','blocks'].includes(name)?raw.value:raw;
 if(name==='records'){const index=await t.get('recordIndex',raw.id),canonical=r?.dedupeKey?await t.edge('recordIndex','byDedupe',r.dedupeKey):null;if(!index||!r?.dedupeKey||canonical?.id!==raw.id||index.dedupeKey!==r.dedupeKey)c.duplicate_stable_identity++;}
 if(name==='blocks'&&await missingSources(t,r?.provenance?.map(p=>p.sourceRecordId)))c.broken_provenance++;
 if(name==='thoughts'&&await missingSources(t,r.sourceRecordIds))c.broken_provenance++;
 if(name==='placements'){if(!await t.get('thoughts',r.entryId))c.orphan_entries++;if(!await t.get('topics',r.topicId))c.orphan_topics++;}
 if(name==='sections'){if(!await t.get('topics',r.topicId))c.orphan_topics++;if(r.redirectTo&&!await t.edge('sections','bySection',[r.redirectTo,r.layoutGeneration]))c.dangling_redirects++;}
 if(name==='topics'&&r.redirectTo){let target=r.redirectTo,seen=new Set([r.id]);for(let n=0;target;n++){if(n>=32||seen.has(target)){c.dangling_redirects++;break;}seen.add(target);const row=await t.get('topics',target);if(!row){c.dangling_redirects++;break;}target=row.redirectTo;}}
 if(name==='provenance'){if(r.ownerKind==='entry'&&!await t.get('thoughts',r.ownerId))c.orphan_entries++;if(!await t.get('blocks',r.inputId)||await missingSources(t,r.sourceRecordIds))c.broken_provenance++;}
 if(name==='revisions'){// Historical deletion/merge snapshots may legitimately outlive entities.
  if(!r.entityId||r.entityKey!==r.kind+':'+r.entityId||!Number.isFinite(r.sequence)||await missingSources(t,r.sourceRecordIds))c.missing_revision_refs++;
 }
 if(name==='meta'){
  if(r.id.startsWith('memory:')){
   if(!validateMemoryRow(r))c.invalid_memory_profile_ref++;
   if(r.kind==='topic'||r.kind==='section'){if(!await t.get('topics',r.topicId)){c.missing_memory_topic++;c.dangling_memory_authorization++;}}
   if(r.kind==='entry'&&!await t.get('thoughts',r.entryId))c.excluded_missing_entry++;
   if(r.kind==='input'&&(!await t.get('inputStates',r.inputId)||!await t.get('blocks',r.inputId)))c.excluded_missing_input++;
   if(r.kind==='topic'&&!await t.get('meta',key('profile',r.profileId))){c.invalid_memory_profile_ref++;c.dangling_memory_authorization++;}
   if(r.kind==='profile'&&!await t.get('meta','memory:config'))c.invalid_memory_profile_ref++;
  }

  if(r.id.startsWith('boundedOrganizerAction:')&&(!Number.isInteger(r.requestsReserved)||!Number.isInteger(r.maxRequests)||r.requestsReserved<0||r.requestsReserved>r.maxRequests))c.invalid_organizer_checkpoint++;
  if(['originalOrganizerCheckpoint','aiOrganizerCheckpoint'].includes(r.id)&&(![1,2,3].includes(r.version)||!r.inputVersions||Array.isArray(r.inputVersions)||typeof r.inputVersions!=='object'||!Number.isFinite(r.lastSequence)||r.lastSequence<0))c.invalid_organizer_checkpoint++;
  const requestPrefix={originalProviderRequestCurrent:'originalProviderRequest:',aiPresentationRequestCurrent:'aiPresentationRequest:',boundedOrganizerCurrent:'boundedOrganizerAction:'}[r.id];
  if(requestPrefix){const id=r.requestId||r.actionId;if(!id||!await t.get('meta',requestPrefix+id))c.invalid_organizer_checkpoint++;}
 }
}
