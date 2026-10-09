import {ArchiveError} from './constants.js';

// UX-R2: device-local positions and portable, body-free policy in existing meta.
// Neither is a content store or an AI authorization rule.
export const READING_ROW='reading:v1', VISIT_ROW='revisit:v2';
export const REVISIT_POLICY_ROW='revisit-policy:v1', CAPTURE_POLICY_ROW='capture-policy:v1';
export const MAX_READING_ANCHORS=200, MAX_EXCLUSIONS=1000;
const fail=()=>{throw new ArchiveError('INVALID_REQUEST');};
const idOK=id=>typeof id==='string'&&id.length>0&&id.length<=200;
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const only=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).every(k=>keys.includes(k));
const prefix=p=>IDBKeyRange.bound(p,[...p,[]],false,true);
export const emptyRevisitPolicy=()=>({id:REVISIT_POLICY_ROW,version:1,oldContent:false,exclusions:[]});
export const emptyCapturePolicy=()=>({id:CAPTURE_POLICY_ROW,version:1,excludedChats:[]});
export function validReaderPolicy(row){
 if(row?.id===CAPTURE_POLICY_ROW)return only(row,['id','version','excludedChats'])&&row.version===1&&Array.isArray(row.excludedChats)&&row.excludedChats.length<=MAX_EXCLUSIONS&&new Set(row.excludedChats).size===row.excludedChats.length&&row.excludedChats.every(x=>/^chatgpt:[A-Za-z0-9_-]{1,200}$/.test(x));
 return only(row,['id','version','oldContent','exclusions'])&&row.id===REVISIT_POLICY_ROW&&row.version===1&&typeof row.oldContent==='boolean'&&Array.isArray(row.exclusions)&&row.exclusions.length<=MAX_EXCLUSIONS&&new Set(row.exclusions.map(x=>x.kind+':'+x.id)).size===row.exclusions.length&&row.exclusions.every(x=>only(x,['kind','id','sourceKeys'])&&['input','document','topic'].includes(x.kind)&&idOK(x.id)&&Array.isArray(x.sourceKeys)&&x.sourceKeys.length<=1000&&x.sourceKeys.every(k=>/^[a-f0-9]{64}$/.test(k)));
}
export async function readRevisitPolicy(t){const row=await t.get('meta',REVISIT_POLICY_ROW);if(row&&!validReaderPolicy(row))fail();return row||emptyRevisitPolicy();}
export async function captureIsExcluded(t,chatId){const row=await t.get('meta',CAPTURE_POLICY_ROW);if(row&&!validReaderPolicy(row))fail();return row?.excludedChats.includes('chatgpt:'+chatId)===true;}
export function safeOffset(text,offset){
 const n=Math.max(0,Math.min(text.length,offset));if(!n||n===text.length)return n;
 for(const part of new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text))if(part.index+part.segment.length>n)return part.index;
 return n;
}
export async function inputRevisitExcluded(t,b,policy){
 if(!policy.exclusions.length)return false;
 if(policy.exclusions.some(x=>x.kind==='input'&&x.id===b.id||x.kind==='document'&&x.id===b.documentId))return true;
 const topics=new Set(policy.exclusions.filter(x=>x.kind==='topic').map(x=>x.id));
 const dependencies=topics.size?await t.all('dependencies','byInput',b.id,1001):[];if(dependencies.length>1000)return true;const entries=new Set(dependencies.map(d=>d.thoughtId||d.targetId));
 for(const p of b.provenance||[]){
  const source=await t.get('recordIndex',p.sourceRecordId);
  if(source&&policy.exclusions.some(x=>x.sourceKeys.includes(source.sourceKey)))return true;
  if(source&&policy.exclusions.some(x=>x.kind==='document')){
   const docs=await t.all('documents','byChat',source.chatKey);
   if(docs.some(d=>policy.exclusions.some(x=>x.kind==='document'&&x.id===d.id)))return true;
  }
  // The same source quoted by another Thought remains subject to the rule.
  if(topics.size){const evidence=await t.all('provenance','bySource',p.sourceRecordId,1001);if(evidence.length>1000)return true;for(const row of evidence)if(row.ownerKind==='entry')entries.add(row.ownerId);if(entries.size>1000)return true;}
 }
 if(topics.size)for(const entryId of entries)if(entryId)for(const p of await t.all('placements','byEntry',prefix([entryId]))){
  if(!topics.has(p.topicId)||p.lifecycle!=='active')continue;const topic=await t.get('topics',p.topicId);if(topic?.lifecycle==='active'&&p.layoutGeneration===topic.activeLayoutGeneration)return true;
 }
 return false;
}
export async function topicRevisitExcluded(t,topicId,policy){
 if(policy.exclusions.some(x=>x.kind==='topic'&&x.id===topicId))return true;
 const topic=await t.get('topics',topicId);if(!topic||topic.lifecycle!=='active')return true;
 if(!policy.exclusions.length)return false;
 const placements=await t.all('placements','byTopicOrder',prefix([topicId,topic.activeLayoutGeneration,0]),5001);
 if(placements.length>5000)return true; // Cannot prove a mixed preview safe within this read bound.
 for(const p of placements)for(const e of await t.all('provenance','byOwner',prefix(['entry',p.entryId]))){const b=(await t.get('blocks',e.inputId))?.value;if(!b||b.excluded||await inputRevisitExcluded(t,b,policy))return true;}
 return false;
}
export class ReaderStateService {
 constructor(store,{clock=()=>Date.now()}={}){this.store=store;this.clock=clock;}
 async policy(){return this.store.run(()=>this.store.repository.transaction(false,async t=>{const capture=await t.get('meta',CAPTURE_POLICY_ROW)||emptyCapturePolicy();if(!validReaderPolicy(capture))fail();return {revisit:await readRevisitPolicy(t),capture};}));}
 async configure(change){
  if(!only(change,['oldContent','kind','id','excluded'])||!Object.keys(change).length)fail();
  return this.store.run(()=>this.store.repository.transaction(true,async t=>{
   const row=await readRevisitPolicy(t);
   if(Object.hasOwn(change,'oldContent')){if(typeof change.oldContent!=='boolean'||Object.keys(change).length!==1)fail();row.oldContent=change.oldContent;}
   else{
    const {kind,id,excluded}=change;if(!['input','document','topic'].includes(kind)||!idOK(id)||typeof excluded!=='boolean')fail();
    const index=row.exclusions.findIndex(x=>x.kind===kind&&x.id===id);
    if(!excluded){if(index>=0)row.exclusions.splice(index,1);}
    else if(index<0){
     const object=await t.get({input:'blocks',document:'documents',topic:'topics'}[kind],id);if(!object)fail();
     if(row.exclusions.length>=MAX_EXCLUSIONS)fail();const sourceKeys=[];
     if(kind==='input')for(const p of object.value.provenance||[]){const ix=await t.get('recordIndex',p.sourceRecordId);if(ix?.sourceKey&&!sourceKeys.includes(ix.sourceKey))sourceKeys.push(ix.sourceKey);}
     row.exclusions.push({kind,id,sourceKeys});
    }
   }
   await t.put('meta',row);return row;
  }));
 }
 async captureScope(options={}){
  if(!only(options,['documentId','chatKey','excluded']))fail();const {documentId=null,chatKey=null,excluded}=options;if(typeof excluded!=='boolean'||documentId!==null&&(!idOK(documentId)||chatKey!==null)||documentId===null&&(excluded!==false||typeof chatKey!=='string'||!/^chatgpt:[A-Za-z0-9_-]{1,200}$/.test(chatKey)))fail();
  return this.store.run(()=>this.store.repository.transaction(true,async t=>{
   if(documentId===null){const row=await t.get('meta',CAPTURE_POLICY_ROW);if(!validReaderPolicy(row)||!row.excludedChats.includes(chatKey))fail();row.excludedChats=row.excludedChats.filter(key=>key!==chatKey);await t.put('meta',row);return {excluded:false};}
   const d=(await t.get('documents',documentId))?.value;
   if(d?.platform!=='chatgpt'||!/^[-A-Za-z0-9_]{1,200}$/.test(d.sourceConversationId||''))fail();
   const row=await t.get('meta',CAPTURE_POLICY_ROW)||emptyCapturePolicy();if(!validReaderPolicy(row))fail();
   const chat='chatgpt:'+d.sourceConversationId;row.excludedChats=row.excludedChats.filter(x=>x!==chat);
   if(excluded){if(row.excludedChats.length>=MAX_EXCLUSIONS)fail();row.excludedChats.push(chat);}
   await t.put('meta',row);return {documentId,excluded};
  }));
 }
 async save(anchor){
  if(!only(anchor,['documentId','inputId','revision','offset','sort','expanded'])||!idOK(anchor.documentId)||!idOK(anchor.inputId)||!integer(anchor.revision)||!integer(anchor.offset)||!['asc','desc'].includes(anchor.sort)||!Array.isArray(anchor.expanded)||anchor.expanded.length>100||!anchor.expanded.every(idOK))fail();
  return this.store.run(()=>this.store.repository.transaction(true,async t=>{
   const b=(await t.get('blocks',anchor.inputId))?.value,ix=await t.get('blockIndex',anchor.inputId),d=await t.get('documents',anchor.documentId);
   if(!b||!ix||!d||b.excluded||b.branchStatus||b.documentId!==anchor.documentId)return {saved:false,unavailable:true};
   if(b.revision!==anchor.revision)return {saved:false,conflict:true};
   const text=b.libraryText??(b.originalTextReference?(await t.get('records',b.originalTextReference))?.value.originalText:'')??'';
   const row=await t.get('meta',READING_ROW)||{id:READING_ROW,version:1,anchors:[]};if(row.version!==1)fail();
   const expanded=[];for(const id of new Set(anchor.expanded)){const block=(await t.get('blocks',id))?.value;if(block?.documentId===b.documentId&&!block.excluded)expanded.push(id);}
   const saved={...anchor,offset:safeOffset(text,anchor.offset),expanded,at:new Date(this.clock()).toISOString(),position:ix.listKey.slice(2,5)};
   row.anchors=[saved,...row.anchors.filter(x=>x.documentId!==anchor.documentId)].slice(0,MAX_READING_ANCHORS);await t.put('meta',row);return {saved:true};
  }));
 }
 async recent(){return this.store.run(()=>this.store.repository.transaction(false,async t=>{
  const row=await t.get('meta',READING_ROW);if(row&&row.version!==1)fail();const items=[],policy=await readRevisitPolicy(t);
  for(const anchor of row?.anchors||[]){const resolved=await resolveReadingAnchor(t,anchor);if(resolved){const b=(await t.get('blocks',resolved.inputId))?.value;if(!b||await inputRevisitExcluded(t,b,policy))continue;const d=(await t.get('documents',anchor.documentId)).value;items.push({...resolved,title:d.userTitle||d.originalConversationTitle||'独立整理文档'});if(items.length===3)break;}}
  return items;
 }));}
 async resolve(documentId){if(!idOK(documentId))fail();return this.store.run(()=>this.store.repository.transaction(false,async t=>{const row=await t.get('meta',READING_ROW);if(row&&row.version!==1)fail();const anchor=row?.anchors.find(x=>x.documentId===documentId);return anchor?resolveReadingAnchor(t,anchor):null;}));}
}
export async function resolveReadingAnchor(t,anchor){
 if(anchor.kind==='topic')return null;
 if(!await t.get('documents',anchor.documentId))return null;
 let b=anchor.inputId?(await t.get('blocks',anchor.inputId))?.value:null,nearby=!b||b.excluded||b.branchStatus||b.documentId!==anchor.documentId;
 if(nearby){const start=[anchor.documentId,0,...anchor.position],end=[anchor.documentId,0,[]];let ix=await t.edge('blockIndex','byList',IDBKeyRange.bound(start,end,false,true));if(!ix)ix=await t.edge('blockIndex','byList',prefix([anchor.documentId,0]),'prev');b=ix?(await t.get('blocks',ix.id))?.value:null;}
 if(!b||b.excluded||b.branchStatus)return null;
 const text=b.libraryText??(b.originalTextReference?(await t.get('records',b.originalTextReference))?.value.originalText:'')??'';
 return {...anchor,inputId:b.id,offset:nearby?0:safeOffset(text,anchor.offset),revision:b.revision,nearby,changed:anchor.revision!==b.revision};
}
// Run inside the existing purge transaction. Retain only a body-free nearby
// position, never an old Input id or expanded target that can revive a cache.
export async function clearReadingTargets(t,ids){
 const row=await t.get('meta',READING_ROW);if(!row)return;
 let changed=false;for(const a of row.anchors){if(ids.has(a.inputId)){a.inputId=null;a.offset=0;changed=true;}const expanded=a.expanded.filter(id=>!ids.has(id));if(expanded.length!==a.expanded.length){a.expanded=expanded;changed=true;}}
 if(changed)await t.put('meta',row);
}

// Remove references to purged targets while retaining opaque exclusion fences.
export async function clearPurgedReaderPolicy(t,ids,sourceKey){
 const row=await readRevisitPolicy(t);let changed=false;
 for(const rule of row.exclusions){
  const gone=rule.kind==='input'&&ids.has(rule.id)&&!await t.get('blocks',rule.id)||rule.kind==='document'&&!(await t.get('documents',rule.id))?.value.sourceConversationId&&!await t.count('blockIndex','byList',prefix([rule.id]));
  if(gone&&!rule.id.startsWith('purged:')){rule.id='purged:'+sourceKey;if(!rule.sourceKeys.includes(sourceKey))rule.sourceKeys.push(sourceKey);changed=true;}
 }
 if(changed){row.exclusions=row.exclusions.filter((rule,index,all)=>all.findIndex(x=>x.kind===rule.kind&&x.id===rule.id)===index);await t.put('meta',row);}
}
