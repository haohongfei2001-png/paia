import {fail,keys,idOK,keyedHash,same} from './thought-model.js';
import {resolveTopicIdentity,identityMetadata} from './topic-identity.js';
import {TopicProcessingGuard,publicTopicAuthority} from './topic-processing.js';

const VERSION=1,PAIR_PREFIX='topicKeepSeparate:';
const normalize=name=>name.normalize('NFKC').toLocaleLowerCase().trim();
const signatureOK=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const cursorKeyOK=state=>state.after===null||state.phase==='topics'&&idOK(state.after)||state.phase==='constraints'&&typeof state.after==='string'&&state.after.startsWith(PAIR_PREFIX)&&state.after.length<=PAIR_PREFIX.length+2*200*6+16;
export function validateTopicLookupNames(names){if(!Array.isArray(names)||names.length>8||names.some(x=>typeof x!=='string'||!x.trim()||x.length>300))fail();}
async function eligibleLabel(store,t,topic){
 if(topic.protections?.name?.locked||!topic.sourceRecordIds?.length)return true;
 // Source-derived labels need current processing eligibility too. Ambiguous or
 // oversized legacy provenance stays unavailable; it never proves absence.
 if(topic.sourceRecordIds.length>20)return false;const filter=await t.get('meta','smart-filter');
 for(const id of topic.sourceRecordIds){
  const page=await t.indexPrimaryPage('blockIndex','byRecord',id,{limit:20});if(page.next||!page.rows.length)return false;
  for(const {value:index}of page.rows){const block=(await t.get('blocks',index.id))?.value,state=await t.get('inputStates',index.id);if(!block||block.excluded||block.branchStatus||state?.removalState!=='active'||state.sourcePurged||await store.isFiltered(t,block,filter))return false;}
 }
 return true;
}

// Explicit background work, never a keystroke read. The primary-key traversal
// enumerates the whole identity/constraint universe in bounded transactions;
// it does not turn a lexical shortlist, exact name, or absence into identity.
export class TopicIdentityRetrieval {
 constructor(store,options={}){this.store=store;this.guard=new TopicProcessingGuard(store,options);}
 async prepare({scope,names=[]}){
  validateTopicLookupNames(names);const prepared=await this.guard.prepare(scope),secret=prepared.authority.secret;
  const nameTokens=await Promise.all(names.map(name=>keyedHash(secret,['personal-topic-name-v1',normalize(name)])));
  return {...prepared,names:names.map(normalize),nameTokens,requestKey:await keyedHash(secret,['topic-lookup-scope-v1',prepared.evidence,nameTokens])};
 }
 async sign(prepared,state){return {...state,signature:await keyedHash(prepared.authority.secret,['topic-lookup-cursor-v1',state])};}
 async verify(prepared,proof,{complete=false}={}){
  keys(proof,['version','authority','requestKey','phase','after','visited','unavailable','removedNameMatch','signature'],['version','authority','requestKey','phase','after','visited','unavailable','removedNameMatch','signature']);
  const {signature,...state}=proof;
  if(state.version!==VERSION||!['topics','constraints','complete'].includes(state.phase)||!cursorKeyOK(state)||!Number.isSafeInteger(state.visited)||state.visited<0||!Number.isSafeInteger(state.unavailable)||state.unavailable<0||typeof state.removedNameMatch!=='boolean'||!signatureOK(signature)||complete&&(state.phase!=='complete'||state.unavailable!==0)||!same(state.authority,publicTopicAuthority(prepared.authority))||state.requestKey!==prepared.requestKey)fail();
  if(await keyedHash(prepared.authority.secret,['topic-lookup-cursor-v1',state])!==signature)fail();
  return state;
 }
 async page({scope,names=[],cursor=null,limit=50}={}){
  if(!Number.isInteger(limit)||limit<1||limit>100)fail();
  const prepared=await this.prepare({scope,names});
  const state=cursor?await this.verify(prepared,cursor):{version:VERSION,authority:publicTopicAuthority(prepared.authority),requestKey:prepared.requestKey,phase:'topics',after:null,visited:0,unavailable:0,removedNameMatch:false};
  if(state.phase==='complete')fail();
  const result=await this.store.run(()=>this.store.repository.transaction(false,async t=>{
   await this.guard.check(t,prepared);const items=[];let unavailable=state.unavailable,removedNameMatch=state.removedNameMatch;
   const page=state.phase==='topics'?await t.page('topics',{after:state.after??undefined,limit}):await t.primaryRangePage('meta',{prefix:PAIR_PREFIX,after:state.after,limit});
   const topicIds=new Set(page.rows.flatMap(({value:row})=>state.phase==='topics'?[row.id]:[row.sourceId,row.targetId]));
   if(await this.guard.processing(t,prepared.evidence,[...topicIds])!==prepared.authority.processingEpoch)fail();
   const resolver={get:async(name,id)=>{if(name==='topics')topicIds.add(id);return t.get(name,id);}},resolved=new Map();
   for(const id of [...topicIds])resolved.set(id,await resolveTopicIdentity(resolver,id));
   const authorizedTopicIds=[...topicIds];
   if(await this.guard.processing(t,prepared.evidence,authorizedTopicIds)!==prepared.authority.processingEpoch)fail();
   for(const {value:raw}of page.rows){
    if(state.phase==='constraints'){
     const left=resolved.get(raw.sourceId),right=resolved.get(raw.targetId);if(left.id===right.id)fail();
     items.push({kind:'keep_separate',sourceId:raw.sourceId,targetId:raw.targetId,canonicalSourceId:left.id,canonicalTargetId:right.id});continue;
    }
    if(raw.lifecycle==='candidate'){unavailable++;continue;}
    if(!['active','dormant','merged','removed'].includes(raw.lifecycle))fail();
    const canonical=resolved.get(raw.id),identity=identityMetadata(raw);
    const safe=await this.store.safeOrganization(t,'topic',canonical),blocked=canonical.lifecycle==='removed',available=!safe.sourceUnavailable&&!canonical.layoutJobId&&!blocked&&await eligibleLabel(this.store,t,canonical);
    if(!available&&!blocked)unavailable++;
    const matches=prepared.nameTokens.map((token,i)=>({query:i,current:identity.nameToken===token||typeof raw.name==='string'&&normalize(raw.name)===prepared.names[i],alias:identity.aliases.some(alias=>alias.token===token)})).filter(x=>x.current||x.alias);
    if(blocked&&matches.length)removedNameMatch=true;
    items.push({kind:'identity',id:raw.id,canonicalId:canonical.id,lifecycle:raw.redirectTo?'merged':raw.lifecycle,canonicalLifecycle:canonical.lifecycle,revision:raw.revision,identityRevision:identity.revision,removedFence:blocked,available,nameMatches:matches,...(available?{name:safe.name,scope:identityMetadata(canonical).scope}:{}),identityProof:false});
   }
   const phase=page.next?state.phase:state.phase==='topics'?'constraints':'complete';
   return {items,authorizedTopicIds,state:{...state,phase,after:page.next??null,visited:state.visited+page.rows.length,unavailable,removedNameMatch}};
  }));
  const proof=await this.sign(prepared,result.state);
  // Hashing occurs outside IndexedDB. Recheck after that asynchronous gap too.
  await this.store.run(()=>this.store.repository.transaction(false,async t=>{await this.guard.check(t,prepared);if(await this.guard.processing(t,prepared.evidence,result.authorizedTopicIds)!==prepared.authority.processingEpoch)fail();}));
  return {items:result.items,nextCursor:result.state.phase==='complete'?null:proof,coverage:proof,complete:result.state.phase==='complete',creationAllowed:false,identityProof:false};
 }
 async prepareCoverage({scope,names=[],coverage}){const prepared=await this.prepare({scope,names});const verified=await this.verify(prepared,coverage,{complete:true});return {...prepared,removedNameMatch:verified.removedNameMatch};}
 async constraintProof(prepared,{nameTokens=[],relatedTopicIds=[]}={}){
  if(!Array.isArray(nameTokens)||nameTokens.length>8||nameTokens.some(x=>!signatureOK(x))||!Array.isArray(relatedTopicIds)||relatedTopicIds.length>20||relatedTopicIds.some(x=>!idOK(x)))fail();
  const read=fn=>this.store.run(()=>this.store.repository.transaction(false,async t=>{await this.guard.check(t,prepared);return fn(t);}));
  const resolve=async(t,ids)=>{const authorized=new Set(ids),resolver={get:async(name,id)=>{if(name==='topics')authorized.add(id);return t.get(name,id);}},rows=[];for(const id of ids)rows.push(await resolveTopicIdentity(resolver,id));if(await this.guard.processing(t,prepared.evidence,[...authorized])!==prepared.authority.processingEpoch)fail();return {rows,authorizedTopicIds:[...authorized]};};
  const initial=await read(t=>resolve(t,relatedTopicIds)),targets=new Set(initial.rows.map(row=>row.id));
  let blocked=prepared.removedNameMatch===true||initial.rows.some(row=>!['active','dormant'].includes(row.lifecycle)||row.layoutJobId),after=null,topicRows=0,constraintRows=0;
  // Candidate reads have only opaque names. Scan current labels in bounded
  // pages so an unmapped legacy removal is fenced without a migration/index.
  if(nameTokens.length)do{
   const page=await read(async t=>{const page=await t.page('topics',{after:after??undefined,limit:100});if(await this.guard.processing(t,prepared.evidence,page.rows.map(x=>x.value.id))!==prepared.authority.processingEpoch)fail();return page;});
   const matching=[];for(const {value:row}of page.rows){const identity=identityMetadata(row),tokens=[identity.nameToken,...identity.aliases.map(x=>x.token),await keyedHash(prepared.authority.secret,['personal-topic-name-v1',normalize(row.name)])];if(tokens.some(token=>nameTokens.includes(token)))matching.push(row.id);}
   const matched=await read(t=>resolve(t,matching));if(matched.rows.some(row=>['removed','candidate'].includes(row.lifecycle)))blocked=true;
   topicRows+=page.rows.length;after=page.next;await this.store.repository.checkpoint('topic-constraints-page');
  }while(after);
  after=null;do{
   const page=await read(async t=>{const page=await t.primaryRangePage('meta',{prefix:PAIR_PREFIX,after,limit:100});const ids=[...new Set(page.rows.flatMap(x=>[x.value.sourceId,x.value.targetId]))],resolved=await resolve(t,ids),canonical=new Map(ids.map((id,i)=>[id,resolved.rows[i].id]));let separated=false;for(const {value:pair}of page.rows){const a=canonical.get(pair.sourceId),b=canonical.get(pair.targetId);if(a===b)fail();if(targets.has(a)&&targets.has(b))separated=true;}return {...page,separated};});
   blocked||=page.separated;constraintRows+=page.rows.length;after=page.next;await this.store.repository.checkpoint('topic-constraints-page');
  }while(after);
  const proof={blocked,authorizedTopicIds:initial.authorizedTopicIds,topicRows,constraintRows};
  await read(t=>this.checkConstraintProof(t,prepared,proof));return proof;
 }
 async checkConstraintProof(t,prepared,proof){
  await this.guard.check(t,prepared);
  if(await this.guard.processing(t,prepared.evidence,proof.authorizedTopicIds)!==prepared.authority.processingEpoch)fail();
  return !proof.blocked;
 }
 async withCoverage(request,write){
  const prepared=await this.prepareCoverage(request);
  return this.store.foundationWrite(async t=>{await this.guard.check(t,prepared);return write(t,prepared);});
 }
}
