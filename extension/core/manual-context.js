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
const ACTIONS={create:[],containers:['kind','cursor','limit'],addContainers:['containers'],profiles:[],addSupplement:['refs'],removeSupplements:[],read:[],add:['refs'],remove:['itemId'],clear:[],order:['itemIds'],edit:['itemId','text'],note:['text'],redact:['itemId','start','end'],budget:['budget'],preview:[],share:['format','packageIndex'],suggest:['query','profileId']};
const candidateRef=c=>({kind:c.kind==='input'?'input':'thought',id:c.inputId||c.entryId,revision:c.revision});
const redact=(text,rules)=>rules.reduce((s,word)=>s.split(word).join('█'),text);
// Owned by ContextPackageService. These snapshots are per-tab, short-lived memory,
// never another canonical store, chrome.storage row, Backup or transferable Grant.
export class ManualContext {
 constructor(memory,{clock=()=>Date.now(),uuid=()=>crypto.randomUUID()}={}){this.memory=memory;this.clock=clock;this.uuid=uuid;this.sessions=new Map();this.tail=Promise.resolve();}
 run(options,owner){const task=this.tail.then(()=>this.dispatch(options,owner));this.tail=task.catch(()=>{});return task;}
 // Trusted local composition only; not a dispatch action or a transferable grant.
 // Keep the tab selection lease across scoped reads and both exact share checks.
 withReviewedSelection(options,owner,read,verify){
  if(typeof read!=='function'||typeof verify!=='function')fail();
  const task=this.tail.then(async()=>{
   const args={selectionId:options?.selectionId,generation:options?.generation};
   const state=await this.dispatch({action:'read',...args},owner);
   if(state.outputBudget!==null)fail('MEMORY_LIMIT'); // no incomplete package
   const before=await this.dispatch({action:'share',...args,format:'copy'},owner);
   const text=before.text,payload=before.manifest.previewSha256,
    manifest=before.manifest.reviewedManifestSha256;
   const result=await read(before);
   const after=await this.dispatch({action:'share',...args,format:'copy'},owner);
   if(after.text!==text||after.manifest.previewSha256!==payload
      ||after.manifest.reviewedManifestSha256!==manifest)fail('MEMORY_STALE');
   await verify(result,after);
   return result;
  });
  this.tail=task.catch(()=>{});
  return task;
 }
 async transaction(fn){return this.memory.s.run(()=>this.memory.s.repository.transaction(false,fn));}
 async validate(session){
  const temporary=(await this.memory.temporary()).revision;
  if(session.temporaryPolicyRevision!==temporary){session.temporaryPolicyRevision=temporary;session.confirmed=null;session.suggestions=null;}
  const eligibility=new Map();
  for(const item of session.items.filter(i=>i.origin==='retrieval'&&!i.blocked)){
   const profileId=item.retrieval.profileId;if(eligibility.has(profileId))continue;
   try{eligibility.set(profileId,await this.memory.candidates({profileId,query:''}));}
   catch(e){if(!['MEMORY_INVALID','MEMORY_UNAVAILABLE'].includes(e.code))throw e;eligibility.set(profileId,null);}
  }
  await this.transaction(async t=>{
   const policyRevision=(await this.memory.state(t)).config.revision;if(session.policyRevision!==policyRevision){session.policyRevision=policyRevision;session.confirmed=null;session.suggestions=null;}
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
  if((await this.memory.temporary()).revision!==temporary){session.confirmed=null;session.suggestions=null;fail('MEMORY_STALE');}
 }
 text(session){return manualReviewText(session,redact);}
 dto(session){const state=session.items.some(i=>i.state==='blocked')||(session.containers||[]).some(i=>i.state==='blocked')?'blocked':session.items.some(i=>i.state==='stale')||(session.containers||[]).some(i=>i.state==='stale')?'stale':session.confirmed===session.generation?'ready':'dirty',text=state==='ready'?this.text(session):'';return {intent:'manual_selection',selectionId:session.id,generation:session.generation,state,expiresAt:session.expiresAt,note:session.note,containers:(session.containers||[]).map(({signature,refs,...group})=>({...group,title:redact(group.title,session.redactions),memberCount:refs.length,selectedMemberCount:refs.filter(ref=>session.items.some(item=>materialKey(item.ref)===materialKey(ref))).length})),items:session.items.map(({token,blocked,override,...item})=>({...item,title:redact(item.title,session.redactions),body:item.state==='blocked'?'':redact(override??item.body,session.redactions),edited:override!==undefined})),text,characters:[...text].length,manifest:{...manualContextManifest(session),previewSha256:state==='ready'?session.reviewedPayloadSha256:null,reviewedManifestSha256:state==='ready'?session.reviewedManifestSha256:null},outputBudget:session.outputBudget??null,outputPackages:state==='ready'?(session.reviewedPackages||[]).map(p=>({...p,body:text.slice(p.start,p.end),text:MANUAL_OUTPUT_ENVELOPE+text.slice(p.start,p.end)})):[],localOnly:true};}
 async dispatch(o,owner){
  if(!own(o,['action','selectionId','generation',...(ACTIONS[o?.action]||[])])||!Object.hasOwn(ACTIONS,o.action)||typeof owner!=='string'||!owner)fail();
  for(const [id,s]of this.sessions)if(s.expiresAt<=this.clock())this.sessions.delete(id);await this.memory.ready();
  if(o.action==='create'){if(o.selectionId!==undefined||o.generation!==undefined)fail();if(this.sessions.size>=20)this.sessions.delete(this.sessions.keys().next().value);const s={id:this.uuid(),owner,generation:0,confirmed:null,expiresAt:this.clock()+900000,items:[],excluded:new Set(),note:'',redactions:[],containers:[]};this.sessions.set(s.id,s);return this.dto(s);}
  const s=this.sessions.get(o.selectionId);if(!s)fail('MEMORY_EXPIRED');if(s.owner!==owner)fail('MEMORY_DENIED');if(!Number.isSafeInteger(o.generation)||o.generation!==s.generation)fail('MEMORY_STALE');
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
  if(o.action==='preview'){
   if(['blocked','stale'].includes(this.dto(s).state))return this.dto(s);if(!s.items.length&&!s.note.trim())fail('MEMORY_EMPTY');
   const manifest=JSON.stringify(manualContextManifest(s)),text=this.text(s);
   const packages=s.outputBudget?partitionManualOutput(text,s.outputBudget):[];
   const [payloadDigest,manifestDigest,reviewedPackages]=await Promise.all([hashText(text),hashText(manifest),Promise.all(packages.map(async ({body,text:partText,...p})=>({...p,sha256:await hashText(partText)})))]);
   await this.validate(s);
   if(s.items.some(i=>i.state!=='ready')||JSON.stringify(manualContextManifest(s))!==manifest||this.text(s)!==text){s.confirmed=null;fail('MEMORY_STALE');}
   s.reviewedPackages=reviewedPackages;s.reviewedManifest=manifest;s.reviewedManifestSha256=manifestDigest;s.reviewedPayloadSha256=payloadDigest;s.confirmed=s.generation;return this.dto(s);
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
  if(o.action==='budget'){
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
  s.generation++;s.confirmed=null;s.suggestions=null;return this.dto(s);
 }
}
