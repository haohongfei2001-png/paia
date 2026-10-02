import {manualReviewText} from './manual-review.js';
import {partitionManualOutput,MANUAL_OUTPUT_ENVELOPE} from './manual-output-packages.js';
import {isBudget} from './memory/model.js';
import {hashText} from './dedupe.js';
import {validContainerRef,readContextContainer,listContextContainers} from './context-containers.js';
import {manualContextManifest,MANUAL_CONTEXT_LIMITS} from './context-manifest.js';
import {rankLexicalCandidate} from './search-service.js';
import {ArchiveError} from './constants.js';
import {own,validMaterialRef,materialRead,materialKey,materialIdentity} from './manual-materials.js';
import {safeOffset} from './reader-state.js';
const fail=code=>{throw new ArchiveError(code||'MEMORY_INVALID');};
const ACTIONS={create:[],containers:['kind','cursor','limit'],addContainers:['containers'],profiles:[],addSupplement:['refs'],removeSupplements:[],read:[],add:['refs'],remove:['itemId'],clear:[],order:['itemIds'],edit:['itemId','text'],note:['text'],redact:['itemId','start','end'],budget:['budget'],reconcile:['accept','diffSha256'],task:['purpose'],compile:[],confirmReview:['outputSha256','manifestSha256'],editOutput:['text'],preview:[],share:['format','packageIndex'],suggest:['query','profileId']};
const candidateRef=c=>({kind:c.kind==='input'?'input':'thought',id:c.inputId||c.entryId,revision:c.revision});
const redact=(text,rules)=>rules.reduce((s,word)=>s.split(word).join('█'),text);
// Owned by ContextPackageService. These snapshots are per-tab, short-lived memory,
// never another canonical store, chrome.storage row, Backup or transferable Grant.
export class ManualContext {
 constructor(memory,{clock=()=>Date.now(),uuid=()=>crypto.randomUUID()}={}){this.memory=memory;this.clock=clock;this.uuid=uuid;this.sessions=new Map();this.tail=Promise.resolve();}
 run(options,owner){const task=this.tail.then(()=>this.dispatch(options,owner));this.tail=task.catch(()=>{});return task;}
 async transaction(fn){return this.memory.s.run(()=>this.memory.s.repository.transaction(false,fn));}
 async validate(session){
  const temporary=(await this.memory.temporary()).revision;
  if(session.temporaryPolicyRevision!==temporary){session.temporaryPolicyRevision=temporary;this.invalidate(session);session.suggestions=null;}
  const eligibility=new Map();
  for(const item of session.items.filter(i=>i.origin==='retrieval'&&!i.blocked)){
   const profileId=item.retrieval.profileId;if(eligibility.has(profileId))continue;
   try{eligibility.set(profileId,await this.memory.candidates({profileId,query:''}));}
   catch(e){if(!['MEMORY_INVALID','MEMORY_UNAVAILABLE'].includes(e.code))throw e;eligibility.set(profileId,null);}
  }
  await this.transaction(async t=>{
   const policyRevision=(await this.memory.state(t)).config.revision;if(session.policyRevision!==policyRevision){session.policyRevision=policyRevision;this.invalidate(session);session.suggestions=null;}
   for(const group of session.containers||[]){try{const now=await readContextContainer(this.memory,t,{kind:group.kind,id:group.id});group.state=now.signature===group.signature?'ready':'stale';}catch(e){if(!['MEMORY_DENIED','MEMORY_UNAVAILABLE','MEMORY_STALE','MEMORY_LIMIT','MEMORY_EMPTY'].includes(e.code))throw e;group.state=['MEMORY_UNAVAILABLE','MEMORY_DENIED','MEMORY_EMPTY'].includes(e.code)?'blocked':'stale';}}
   for(const item of session.items){if(item.blocked)continue;try{
    const now=await materialRead(this.memory,t,item.ref);
    if(item.origin==='retrieval'){
     const found=eligibility.get(item.retrieval.profileId),eligible=found?.candidates.some(c=>materialIdentity(candidateRef(c))===materialIdentity(item.ref));
     if(!eligible)fail('MEMORY_DENIED');
     if(found.profile.revision!==item.retrieval.profileRevision)fail('MEMORY_STALE');
    }
    item.state=now.token===item.token?'ready':'stale';
   }catch(e){if(!['MEMORY_DENIED','MEMORY_UNAVAILABLE','MEMORY_STALE'].includes(e.code))throw e;item.state=e.code==='MEMORY_STALE'?'stale':'blocked';item.reason=e.code;item.restriction=e.restriction;if(item.state==='blocked'){item.blocked=true;item.body='';delete item.override;}}}
   const generation=(await t.get('meta','backup-data-generation'))?.value||0;
   if([...eligibility.values()].some(found=>found&&(found.generation!==generation||found.sessionRevision!==temporary))){session.confirmed=null;fail('MEMORY_STALE');}
  });
  if(session.items.some(i=>i.state!=='ready')||(session.containers||[]).some(g=>g.state!=='ready'))this.invalidate(session);
  if((await this.memory.temporary()).revision!==temporary){this.invalidate(session);session.suggestions=null;fail('MEMORY_STALE');}
 }
 invalidate(session,{overlay=true}={}){session.confirmed=null;session.compiled=null;if(overlay)delete session.outputOverride;}
 text(session){return session.outputOverride??manualReviewText(session,redact);}
 async compile(session){
  if(!session.purpose?.trim())fail('MEMORY_PURPOSE_REQUIRED');
  if(!session.items.length&&!session.note.trim())fail('MEMORY_EMPTY');
  const manifest=JSON.stringify(manualContextManifest(session)),text=this.text(session);
  const packages=session.outputBudget?partitionManualOutput(text,session.outputBudget):[];
  const [outputSha256,manifestSha256,reviewedPackages]=await Promise.all([hashText(text),hashText(manifest),Promise.all(packages.map(async ({body,text:partText,...p})=>({...p,sha256:await hashText(partText)})))]);
  await this.validate(session);
  if(session.items.some(i=>i.state!=='ready')||(session.containers||[]).some(g=>g.state!=='ready')||JSON.stringify(manualContextManifest(session))!==manifest||this.text(session)!==text){this.invalidate(session);fail('MEMORY_STALE');}
  session.confirmed=null;session.reviewedPackages=reviewedPackages;session.reviewedManifest=manifest;session.reviewedManifestSha256=manifestSha256;session.reviewedPayloadSha256=outputSha256;
  session.compiled={generation:session.generation,outputSha256,manifestSha256};return this.dto(session);
 }
 dto(session){const state=session.items.some(i=>i.state==='blocked')||(session.containers||[]).some(i=>i.state==='blocked')?'blocked':session.items.some(i=>i.state==='stale')||(session.containers||[]).some(i=>i.state==='stale')?'stale':session.confirmed===session.generation?'ready':session.compiled?.generation===session.generation?'review':'dirty',text=['ready','review'].includes(state)?this.text(session):'';return {intent:'manual_selection',selectionId:session.id,generation:session.generation,state,expiresAt:session.expiresAt,purpose:redact(session.purpose||'',session.redactions),reviewBinding:['ready','review'].includes(state)?session.compiled:null,outputEdited:session.outputOverride!==undefined,note:redact(session.note,session.redactions),containers:(session.containers||[]).map(({signature,refs,...group})=>({...group,title:redact(group.title,session.redactions),memberCount:refs.length,selectedMemberCount:refs.filter(ref=>session.items.some(item=>materialKey(item.ref)===materialKey(ref))).length})),items:session.items.map(({token,blocked,override,...item})=>({...item,title:redact(item.title,session.redactions),body:item.state==='blocked'?'':redact(override??item.body,session.redactions),edited:override!==undefined})),text,characters:[...text].length,manifest:{...manualContextManifest(session),previewSha256:state==='ready'?session.reviewedPayloadSha256:null,reviewedManifestSha256:state==='ready'?session.reviewedManifestSha256:null},outputBudget:session.outputBudget??null,outputPackages:['ready','review'].includes(state)?(session.reviewedPackages||[]).map(p=>({...p,body:text.slice(p.start,p.end),text:MANUAL_OUTPUT_ENVELOPE+text.slice(p.start,p.end)})):[],localOnly:true};}
 async dispatch(o,owner){
  if(!own(o,['action','selectionId','generation',...(ACTIONS[o?.action]||[])])||!Object.hasOwn(ACTIONS,o.action)||typeof owner!=='string'||!owner)fail();
  for(const [id,s]of this.sessions)if(s.expiresAt<=this.clock())this.sessions.delete(id);await this.memory.ready();
  if(o.action==='create'){if(o.selectionId!==undefined||o.generation!==undefined)fail();if(this.sessions.size>=20)this.sessions.delete(this.sessions.keys().next().value);const s={id:this.uuid(),owner,generation:0,confirmed:null,expiresAt:this.clock()+900000,items:[],excluded:new Set(),purpose:'',note:'',redactions:[],containers:[]};this.sessions.set(s.id,s);return this.dto(s);}
  const s=this.sessions.get(o.selectionId);if(!s)fail('MEMORY_EXPIRED');if(s.owner!==owner)fail('MEMORY_DENIED');// A same-owner read can recover a committed mutation whose response was
  // discarded by the UI source-epoch fence. It never replays that mutation.
  if(!Number.isSafeInteger(o.generation)||o.generation<0||o.generation>s.generation||(o.action!=='read'&&o.generation!==s.generation))fail('MEMORY_STALE');
  await this.validate(s);if(o.action==='read')return this.dto(s);
  if(o.action==='profiles')return {...this.dto(s),profiles:(await this.transaction(t=>this.memory.state(t))).profiles.map(p=>({profileId:p.profileId,name:p.name,revision:p.revision})),defaultProfileId:'default'};
  if(o.action==='containers')return {...this.dto(s),containerPage:await this.transaction(t=>listContextContainers(this.memory,t,{kind:o.kind,cursor:o.cursor,limit:o.limit??40}))};
  if(o.action==='share'){
   if(!['copy','markdown'].includes(o.format))fail();if(this.dto(s).state!=='ready')fail(this.dto(s).state==='blocked'?'MEMORY_DENIED':'MEMORY_STALE');if(!s.items.length&&!s.note.trim())fail('MEMORY_EMPTY');
   const manifest=JSON.stringify(manualContextManifest(s)),text=this.text(s),digest=await hashText(text);
   let selected=null;
   if(s.outputBudget){
    if(!Number.isSafeInteger(o.packageIndex)||o.packageIndex<1)fail();
    const parts=partitionManualOutput(text,s.outputBudget);selected=parts[o.packageIndex-1];
    if(!selected||!s.reviewedPackages?.[o.packageIndex-1]||selected.start!==s.reviewedPackages[o.packageIndex-1].start||selected.end!==s.reviewedPackages[o.packageIndex-1].end||await hashText(selected.text)!==s.reviewedPackages[o.packageIndex-1].sha256)fail('MEMORY_STALE');
   }else if(o.packageIndex!==undefined)fail();
   // Hashing may yield to a source/policy mutation. Revalidate before release,
   // and compare the complete fixed selection AND exact reviewed payload.
   await this.validate(s);
   if(this.dto(s).state!=='ready')fail(this.dto(s).state==='blocked'?'MEMORY_DENIED':'MEMORY_STALE');
   if(JSON.stringify(manualContextManifest(s))!==manifest||manifest!==s.reviewedManifest||this.text(s)!==text||digest!==s.reviewedPayloadSha256)fail('MEMORY_STALE');
   return {...this.dto(s),...(selected?{text:selected.text,characters:selected.characters,packageIndex:selected.index,packageCount:selected.count,packageSha256:s.reviewedPackages[selected.index-1].sha256}:{}),format:o.format};
  }
  if(o.action==='reconcile'){
   if(o.accept!==undefined&&typeof o.accept!=='boolean'||o.diffSha256!==undefined&&typeof o.diffSha256!=='string')fail();
   const next=structuredClone(s),changes=[];this.invalidate(next);next.suggestions=null;
   await this.transaction(async t=>{
    for(const item of next.items){
     // A changed span cannot safely track a new version by numerical offsets.
     // A blocked item must be explicitly removed/reselected, never revived.
     if(item.blocked)continue;
     try{const fresh=await materialRead(this.memory,t,item.ref,{checkRevision:false});
      if(fresh.token!==item.token){
       if(item.ref.span){changes.push({itemId:item.itemId,kind:'reselect_span'});continue;}
       changes.push({itemId:item.itemId,kind:'changed',fromRevision:item.ref.revision,toRevision:fresh.revision});
       delete item.override;Object.assign(item,fresh,{ref:{...item.ref,revision:fresh.revision},state:'ready'});
      }
     }catch(e){if(!['MEMORY_DENIED','MEMORY_UNAVAILABLE','MEMORY_STALE'].includes(e.code))throw e;changes.push({itemId:item.itemId,kind:'unavailable'});item.state='blocked';item.blocked=true;item.body='';delete item.override;}
    }
    // Whole-container scope is fixed. Membership changes require a new explicit
    // whole-group choice; reconciliation cannot silently add or drop members.
    for(const group of next.containers||[]){const fresh=await readContextContainer(this.memory,t,{kind:group.kind,id:group.id});
     const keys=refs=>refs.map(materialIdentity).sort().join('|');
     if(keys(fresh.refs)!==keys(group.refs)){changes.push({kind:'reselect_group',container:{kind:group.kind,id:group.id}});continue;}
     Object.assign(group,fresh);
    }
   });
   await this.validate(next);
   const diffSha256=await hashText(JSON.stringify({generation:s.generation,policy:next.policyRevision,temporary:next.temporaryPolicyRevision,changes,items:next.items.map(i=>[i.itemId,i.ref,i.token,i.state,i.override??null]),containers:next.containers}));
   if(!o.accept)return {...this.dto(s),reconciliation:{changes,diffSha256,canApply:!changes.some(c=>c.kind==='reselect_span'||c.kind==='reselect_group')&&this.dto(next).state==='dirty'}};
   if(o.diffSha256!==diffSha256||changes.some(c=>c.kind==='reselect_span'||c.kind==='reselect_group')||['stale','blocked'].includes(this.dto(next).state))fail('MEMORY_STALE');
   next.generation++;this.sessions.set(s.id,next);return this.dto(next);
  }
  // The historical preview name is a compile-only alias. It never authorizes release.
  if(o.action==='preview'||o.action==='compile'){
   if(['blocked','stale'].includes(this.dto(s).state))return this.dto(s);
   return this.compile(s);
  }
  if(o.action==='confirmReview'){
   const binding=s.compiled;
   if(!binding||binding.generation!==s.generation||o.outputSha256!==binding.outputSha256||o.manifestSha256!==binding.manifestSha256)fail('MEMORY_STALE');
   const manifest=JSON.stringify(manualContextManifest(s)),text=this.text(s),digest=await hashText(text);
   await this.validate(s);
   if(!s.compiled||['blocked','stale'].includes(this.dto(s).state)||manifest!==s.reviewedManifest||JSON.stringify(manualContextManifest(s))!==manifest||this.text(s)!==text||digest!==binding.outputSha256)fail('MEMORY_STALE');
   s.confirmed=s.generation;return this.dto(s);
  }
  if(o.action==='editOutput'){
   if(!s.compiled||!['ready','review'].includes(this.dto(s).state))fail('MEMORY_STALE');
   if(typeof o.text!=='string'||!o.text.trim()||o.text.length>MANUAL_CONTEXT_LIMITS.materialUTF16Units)fail();
   // One ephemeral final-output overlay; material overrides remain inputs to the
   // compiler, never a competing final body. Any input/policy change discards it.
   const next=structuredClone(s);next.outputOverride=redact(o.text,next.redactions);next.generation++;this.invalidate(next,{overlay:false});const result=await this.compile(next);this.sessions.set(s.id,next);return result;
  }
  if(o.action==='suggest'){
   if(typeof o.query!=='string'||o.query.length>1000||o.profileId!==undefined&&(typeof o.profileId!=='string'||!o.profileId||o.profileId.length>200))fail();
   const query=o.query.trim()||s.items.filter(i=>i.state==='ready').map(i=>i.body).join(' ').slice(0,300),found=await this.memory.candidates({query,profileId:o.profileId??'default'}),items=[];
   const querySha256=await hashText(query);
   await this.transaction(async t=>{
    if(((await t.get('meta','backup-data-generation'))?.value||0)!==found.generation)fail('MEMORY_STALE');
    for(const c of found.candidates.map(c=>rankLexicalCandidate(c,query)).filter(c=>c.score>0).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id))){
     const ref=candidateRef(c);if(s.excluded.has(materialIdentity(ref))||s.items.some(i=>materialIdentity(i.ref)===materialIdentity(ref)))continue;
     try{const data=await materialRead(this.memory,t,ref);items.push({ref,title:redact(data.title,s.redactions),body:redact(data.body,s.redactions)});}catch(e){if(!['MEMORY_DENIED','MEMORY_UNAVAILABLE','MEMORY_STALE'].includes(e.code))throw e;}
     if(items.length===20)break;
    }
   });
   if((await this.memory.temporary()).revision!==found.sessionRevision)fail('MEMORY_STALE');
   s.suggestions={options:{profileId:found.profile.profileId,query},generation:found.generation,policyRevision:s.policyRevision,sessionRevision:found.sessionRevision,profileRevision:found.profile.revision,querySha256,refs:items.map(i=>structuredClone(i.ref)),partial:found.partial,inspected:found.inspected};
   return {...this.dto(s),suggestions:items,partial:found.partial,retrieval:{profileId:found.profile.profileId,profileRevision:found.profile.revision,querySha256,inspected:found.inspected,partial:found.partial}};
  }
  if(o.action==='task'){
   if(typeof o.purpose!=='string'||o.purpose.length>2000)fail();s.purpose=redact(o.purpose,s.redactions);
  }else if(o.action==='budget'){
   if(o.budget!==null&&!isBudget(o.budget))fail();s.outputBudget=o.budget;
  }else if(o.action==='addSupplement'){
   if(!Array.isArray(o.refs)||!o.refs.length||o.refs.length>20||!o.refs.every(validMaterialRef))fail();
   const offer=s.suggestions;if(!offer||o.refs.some(ref=>!offer.refs.some(allowed=>materialKey(allowed)===materialKey(ref))||s.excluded.has(materialIdentity(ref))))fail('MEMORY_STALE');
   // An offer fixes these refs and scope, not unrelated archive activity.
   // Rebuild current eligibility, then fence this read's full data snapshot.
   if(s.policyRevision!==offer.policyRevision||s.temporaryPolicyRevision!==offer.sessionRevision)fail('MEMORY_STALE');
   const found=await this.memory.candidates(offer.options),eligible=new Set(found.candidates.map(c=>materialKey(candidateRef(c)))),added=[];
   if(found.profile.revision!==offer.profileRevision||found.sessionRevision!==offer.sessionRevision)fail('MEMORY_STALE');
   await this.transaction(async t=>{
    if(((await t.get('meta','backup-data-generation'))?.value||0)!==found.generation||(await this.memory.state(t)).config.revision!==offer.policyRevision)fail('MEMORY_STALE');
    for(const ref of o.refs){
     if(!eligible.has(materialKey(ref)))fail(found.candidates.some(c=>materialIdentity(candidateRef(c))===materialIdentity(ref))?'MEMORY_STALE':'MEMORY_DENIED');if(s.items.some(i=>materialKey(i.ref)===materialKey(ref))||added.some(i=>materialKey(i.ref)===materialKey(ref)))continue;
     const data=await materialRead(this.memory,t,ref);added.push({itemId:this.uuid(),ref:structuredClone(ref),...data,state:'ready',origin:'retrieval',retrieval:{profileId:found.profile.profileId,profileRevision:found.profile.revision,querySha256:offer.querySha256,partial:offer.partial,inspected:offer.inspected}});
    }
   });
   if((await this.memory.temporary()).revision!==found.sessionRevision)fail('MEMORY_STALE');
   if(s.items.length+added.length>MANUAL_CONTEXT_LIMITS.items||[...s.items,...added].reduce((n,i)=>n+(i.override??i.body).length,0)>MANUAL_CONTEXT_LIMITS.materialUTF16Units)fail('MEMORY_LIMIT');
   s.items.push(...added);
  }else if(o.action==='removeSupplements'){
   for(const item of s.items.filter(i=>i.origin==='retrieval'))s.excluded.add(materialIdentity(item.ref));
   s.items=s.items.filter(i=>i.origin!=='retrieval');s.suggestions=null;
  }else if(o.action==='addContainers'){
   if(!Array.isArray(o.containers)||!o.containers.length||o.containers.length>20||!o.containers.every(validContainerRef))fail();
   const selected=await this.transaction(async t=>{const groups=[],allGroups=[],unique=new Set();for(const ref of o.containers){const key=JSON.stringify([ref.kind,ref.id]);if(unique.has(key))continue;unique.add(key);const group=await readContextContainer(this.memory,t,ref),prior=(s.containers||[]).find(g=>g.kind===ref.kind&&g.id===ref.id);if(prior&&prior.signature!==group.signature)fail('MEMORY_STALE');if(!prior)groups.push(group);allGroups.push(group);}const added=[];
    for(const group of allGroups)for(const ref of group.refs){if(s.items.some(i=>materialKey(i.ref)===materialKey(ref))||added.some(i=>materialKey(i.ref)===materialKey(ref)))continue;let data,state='ready',reason,restriction;try{data=await materialRead(this.memory,t,ref);}catch(e){if(!['MEMORY_DENIED','MEMORY_UNAVAILABLE','MEMORY_STALE'].includes(e.code))throw e;data={body:'',title:ref.kind,role:ref.kind==='ai'?'ai':'human',token:null};state=e.code==='MEMORY_STALE'?'stale':'blocked';reason=e.code;restriction=e.restriction;}added.push({itemId:this.uuid(),ref:structuredClone(ref),...data,state,reason,restriction,blocked:state==='blocked'});}
    return {groups,allGroups,added};});
   if((s.containers||[]).length+selected.groups.length>20||s.items.length+selected.added.length>MANUAL_CONTEXT_LIMITS.items||[...s.items,...selected.added].reduce((n,i)=>n+(i.override??i.body).length,0)>MANUAL_CONTEXT_LIMITS.materialUTF16Units)fail('MEMORY_LIMIT');
   (s.containers??=[]).push(...selected.groups);s.items.push(...selected.added);for(const group of selected.allGroups)for(const ref of group.refs){const item=s.items.find(i=>materialKey(i.ref)===materialKey(ref));if(item){delete item.origin;delete item.retrieval;}}for(const item of selected.added)s.excluded.delete(materialIdentity(item.ref));
  }else if(o.action==='add'){
   if(!Array.isArray(o.refs)||!o.refs.length||o.refs.length>200||!o.refs.every(validMaterialRef))fail();const added=[];
   await this.transaction(async t=>{for(const ref of o.refs){if(s.items.some(i=>materialKey(i.ref)===materialKey(ref))||added.some(i=>materialKey(i.ref)===materialKey(ref)))continue;let data,state='ready',reason,restriction;try{data=await materialRead(this.memory,t,ref);}catch(e){if(!['MEMORY_DENIED','MEMORY_UNAVAILABLE','MEMORY_STALE'].includes(e.code))throw e;data={body:'',title:ref.kind,role:ref.kind==='ai'?'ai':'human',token:null};state=e.code==='MEMORY_STALE'?'stale':'blocked';reason=e.code;restriction=e.restriction;}added.push({itemId:this.uuid(),ref:structuredClone(ref),...data,state,reason,restriction,blocked:state==='blocked'});}});
   if(s.items.length+added.length>MANUAL_CONTEXT_LIMITS.items||[...s.items,...added].reduce((n,i)=>n+(i.override??i.body).length,0)>MANUAL_CONTEXT_LIMITS.materialUTF16Units)fail('MEMORY_LIMIT');s.items.push(...added);for(const ref of o.refs){const item=s.items.find(i=>materialKey(i.ref)===materialKey(ref));if(item){delete item.origin;delete item.retrieval;}}for(const i of added)s.excluded.delete(materialIdentity(i.ref));
  }else if(o.action==='remove'){const item=s.items.find(i=>i.itemId===o.itemId);if(!item)fail();s.excluded.add(materialIdentity(item.ref));s.items=s.items.filter(i=>i!==item);
  }else if(o.action==='clear'){for(const i of s.items)s.excluded.add(materialIdentity(i.ref));s.items=[];s.containers=[];
  }else if(o.action==='order'){if(!Array.isArray(o.itemIds)||o.itemIds.length!==s.items.length||new Set(o.itemIds).size!==s.items.length||o.itemIds.some(id=>!s.items.some(i=>i.itemId===id)))fail();s.items=o.itemIds.map(id=>s.items.find(i=>i.itemId===id));
  }else if(o.action==='note'){if(typeof o.text!=='string'||o.text.length>20000)fail();s.note=redact(o.text,s.redactions);
  }else{const item=s.items.find(i=>i.itemId===o.itemId);if(!item||item.state!=='ready')fail('MEMORY_STALE');if(o.action==='edit'){if(typeof o.text!=='string'||o.text.length>200000)fail();if(s.items.reduce((n,i)=>n+(i===item?o.text.length:(i.override??i.body).length),0)>4000000)fail('MEMORY_LIMIT');item.override=redact(o.text,s.redactions);}else if(o.action==='redact'){const text=redact(item.override??item.body,s.redactions);if(!Number.isSafeInteger(o.start)||!Number.isSafeInteger(o.end)||o.start<0||o.end<=o.start||o.end>text.length||safeOffset(text,o.start)!==o.start||safeOffset(text,o.end)!==o.end)fail();if(s.redactions.length>=200)fail('MEMORY_LIMIT');s.redactions.push(text.slice(o.start,o.end));item.override=redact(text,s.redactions);}}
  s.generation++;this.invalidate(s);s.suggestions=null;return this.dto(s);
 }
}
