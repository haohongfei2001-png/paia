import {keys,fail,idOK,prefix,entrySnapshot,markHuman,refreshEntryIndex,keyedHash} from './thought-model.js';
import {inputProjection,checkEvidenceInTransaction} from './thought-evidence.js';
import {bindingSource,applyBinding,bindingRead} from './thought-binding.js';
import {journal,nextSequence} from './thought-journal.js';
const validSpan=(body,span)=>{if(!span||!Number.isSafeInteger(span.start)||!Number.isSafeInteger(span.end)||span.start<0||span.end>body.length||span.end<=span.start)return false;const bounds=new Set([0,body.length,...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(body)].map(x=>typeof x==='number'?x:x.index));return bounds.has(span.start)&&bounds.has(span.end);};
async function topicsFor(s,t,ids){const topics=[];for(const id of ids){const row=await s.canonicalTopic(t,id);if(row.id!==id||row.lifecycle!=='active'||row.layoutJobId)fail();topics.push(row);}return topics;}
async function place(s,t,row,topics,operationId){for(const topic of topics){const old=await t.get('placements',JSON.stringify([topic.id,topic.activeLayoutGeneration,row.id]));if(old?.lifecycle==='active')continue;const r=await s.placeEntryInTransaction(t,{entryId:row.id,topicId:topic.id,expectedEntryRevision:row.revision,expectedTopicRevision:topic.organizationRevision,...(old?{expectedPlacementRevision:old.revision}:{}),operationId});if(r.conflict)fail();Object.assign(row,await t.get('thoughts',row.id));await s.touchTopic(t,await t.get('topics',topic.id));}return {id:row.id,revision:row.revision};}
export async function addToTopics(s,r){
 keys(r,['operationId','kind','id','expectedRevision','span','topicIds'],['operationId','kind','id','expectedRevision','topicIds']);if(!['input','thought'].includes(r.kind)||!idOK(r.id)||!Array.isArray(r.topicIds)||!r.topicIds.length||r.topicIds.length>20||new Set(r.topicIds).size!==r.topicIds.length||r.topicIds.some(x=>!idOK(x)))fail();
 const previous=await s.priorOperation(r);if(previous)return previous;
 if(r.kind==='thought'&&r.span)return addThoughtExcerpt(s,r);
 if(r.kind==='thought')return s.operation(r,async t=>{const row=await s.readableEntry(t,r.id);if(row.lifecycle!=='active'||row.revision!==r.expectedRevision||r.span) return {conflict:true};return place(s,t,row,await topicsFor(s,t,r.topicIds),r.operationId);});
 const p=await s.run(()=>s.repository.transaction(false,t=>inputProjection(s,t,r.id)));if(!p||p.block.revision!==r.expectedRevision)return {conflict:true,sourceChanged:true};const span=r.span||{start:0,end:p.body.length};if(!validSpan(p.body,span))fail();
 const evidence=await s.evidenceFor([{inputId:r.id,role:'primary',selectedFields:['body']}]);const body=p.body.slice(span.start,span.end),full=span.start===0&&span.end===p.body.length;
 // The operation receipt covers the user's exact selection, not a generated body.
 const internal={operationId:r.operationId,actor:'user',body,type:'idea',formation:'explicit',evidence};
 const hooks={before:async(t)=>{const live=await inputProjection(s,t,r.id);if(!live||live.block.revision!==r.expectedRevision)fail();await topicsFor(s,t,r.topicIds);
  const refs=await t.all('provenance','byInputVersion',prefix([r.id]));for(const ref of refs){if(ref.role==='context_only'||ref.contributionType!=='exact_excerpt'||ref.basedOnContentRevision!==p.contentRevision||ref.span?.start!==span.start||ref.span?.end!==span.end)continue;const row=await s.readableEntry(t,ref.ownerId);if(row.lifecycle==='active'&&row.thoughtText===body){return place(s,t,row,await topicsFor(s,t,r.topicIds),r.operationId);}}return null;},after:async(t,row)=>{
  row.provenanceType='input_original';applyBinding(row,full?{bodyBinding:'input',workingInputId:r.id,bindingRevision:p.contentRevision,bindingLength:p.body.length}:{bodyBinding:'thought'});
  for(const ref of await t.all('provenance','byOwner',prefix(['entry',row.id]))){ref.contributionType='exact_excerpt';ref.span={field:'body',...span,full};await t.put('provenance',ref);}await t.put('thoughts',row);await place(s,t,row,await topicsFor(s,t,r.topicIds),r.operationId);
 }};
 // Reuse the existing creation transaction with an explicit receipt identity.
 return s.createEntry(internal,{...hooks,receiptRequest:r});
}
async function addThoughtExcerpt(s,r){
 const original=await s.entry(r.id);if(original.lifecycle!=='active'||original.revision!==r.expectedRevision)return {conflict:true};if(!validSpan(original.body,r.span))fail();
 const body=original.body.slice(r.span.start,r.span.end),deps=await s.entryDependencies(r.id),specs=deps.map(d=>({inputId:d.inputId,role:d.roles.includes('primary')?'primary':d.roles.includes('supporting')?'supporting':'context_only',selectedFields:d.selectedFields}));
 const evidence=await s.evidenceFor(specs,{independentContext:true}),secret=await s.run(()=>s.repository.transaction(false,async t=>(await t.get('meta','thought-suppression-key')).value,['meta']));
 // The existing exact-key index identifies this precise explicit selection.
 // It contains no text and cannot deduplicate a different human revision.
 const exactKey=await keyedHash(secret,['thought-selection',r.id,r.expectedRevision,r.span.start,r.span.end,body]);
 return s.createEntry({operationId:r.operationId,actor:'user',body,type:original.type,formation:'explicit',evidence},{receiptRequest:r,independentContext:true,before:async t=>{const live=await s.readableEntry(t,r.id);if(live.revision!==r.expectedRevision||live.lifecycle!=='active')fail();const topics=await topicsFor(s,t,r.topicIds),old=await t.edge('thoughts','byExact',exactKey);if(old?.lifecycle==='active'&&old.thoughtText===body)return place(s,t,old,topics,r.operationId);},after:async(t,row)=>{row.exactKey=exactKey;row.provenanceType=original.provenanceType==='user_created'?'user_created':'input_derived';await t.put('thoughts',row);await place(s,t,row,await topicsFor(s,t,r.topicIds),r.operationId);}});
}
export async function continueThinking(s,r){
 keys(r,['operationId','body','topicId','inputId'],['operationId','body']);if(typeof r.body!=='string'||!r.body.trim())fail();if(r.topicId!==undefined&&!idOK(r.topicId)||r.inputId!==undefined&&!idOK(r.inputId))fail();
 let evidence=[];if(r.inputId){try{evidence=await s.evidenceFor([{inputId:r.inputId,role:'context_only',selectedFields:['body']}],{independentContext:true});}catch{}}
 return s.createEntry({operationId:r.operationId,actor:'user',body:r.body,type:'idea',formation:'explicit',evidence},{receiptRequest:r,independentContext:true,before:async t=>{if(r.topicId)await topicsFor(s,t,[r.topicId]);},after:async(t,row)=>{if(r.topicId)await place(s,t,row,await topicsFor(s,t,[r.topicId]),r.operationId);}});
}
export async function compareThought(s,id){await s.finishFoundation();return s.run(()=>s.repository.transaction(false,async t=>{const row=await s.readableEntry(t,id),p=await bindingSource(s,t,row);return {entry:await bindingRead(s,t,row),sources:await Promise.all((row.sourceRecordIds||[]).map(async id=>{const src=await s.sourcePresent(t,[id])?(await t.get('records',id))?.value:null;return src?{body:src.originalText,sourceSentAt:src.sourceSentAt||null}:null})).then(rows=>rows.filter(Boolean)),input:p?{id:p.inputId,body:p.body,revision:p.contentRevision}:null};}));}
export async function restoreThoughtInput(s,r){
 keys(r,['id','operationId','expectedRevision','expectedInputRevision'],['id','operationId','expectedRevision','expectedInputRevision']);
 return s.operation(r,async t=>{const row=await s.readableEntry(t,r.id),p=await bindingSource(s,t,row);if(!p||row.lifecycle!=='active'||row.revision!==r.expectedRevision||p.contentRevision!==r.expectedInputRevision)return {conflict:true};
  const before=entrySnapshot(row);row.thoughtText=p.body;applyBinding(row,{bodyBinding:'input',workingInputId:p.inputId,bindingRevision:p.contentRevision,bindingLength:p.body.length});row.revision++;row.contentRevision++;row.fieldRevisions.body++;row.thoughtEditedAt=s.clock();markHuman(row,'body',r.operationId,s.clock(),'restore');row.updatedAt=s.clock();row.updatedSequence=await nextSequence(t);delete row.exactKey;delete row.exactSignature;refreshEntryIndex(row);await t.put('thoughts',row);
  await journal(s,t,{kind:'library_entry',entityId:row.id,before,after:entrySnapshot(row),fieldMask:['body'],actor:'user',reason:'restore_binding',important:true,operationId:r.operationId,baseRevision:r.expectedRevision,afterRevision:row.revision,sourceRecordIds:row.sourceRecordIds});return {id:row.id,revision:row.revision};});
}
