import {ArchiveError} from './constants.js';
import {documentBlocks} from './library.js';
export const defaults=()=>({settingsVersion:1,autoSave:true,permanentSourceIgnore:true,libraryDeleteAlsoDeletesOriginal:false,timeDisplay:'date_and_time',timeEmphasis:'subtle',aiEnabled:false,aiExecutionMode:'suggest_only'});
export function syncWorkspace(state){
 state.preferences={...defaults(),...state.preferences,autoSave:true,permanentSourceIgnore:true,libraryDeleteAlsoDeletesOriginal:false,aiEnabled:false,aiExecutionMode:'suggest_only'};
 state.conversations??=[];
 for(const b of state.library.blocks){const signature=JSON.stringify(b.provenance);b.revision??=0;if(b.provenanceSignature!==undefined&&b.provenanceSignature!==signature)b.revision++;b.provenanceSignature=signature;}
 state.conversations=state.library.documents.map(d=>{const old=state.conversations.find(c=>c.id===d.id);const c={...d,userTitle:old?.userTitle??d.userTitle,titleRevision:old?.titleRevision??0};d.userTitle=c.userTitle;return c;});
}
export function validatePreferences(changes){
 const allowed={timeDisplay:['date_only','date_and_time','date_and_seconds'],timeEmphasis:['subtle','standard']};
 if(!changes||typeof changes!=='object'||Array.isArray(changes)||!Object.keys(changes).length||Object.entries(changes).some(([k,v])=>!allowed[k]?.includes(v)))throw new ArchiveError('INVALID_REQUEST');return changes;
}
export function sourceCompare(a,b){return Number(!a.sourceSentAt)-Number(!b.sourceSentAt)||(a.sourceSentAt&&b.sourceSentAt?Date.parse(a.sourceSentAt)-Date.parse(b.sourceSentAt):0)||(a.conversationOrder??Infinity)-(b.conversationOrder??Infinity)||a.id.localeCompare(b.id);}
export function archiveRows(state,documentId){const d=state.conversations.find(c=>c.id===documentId);return d?state.records.filter(r=>r.platform===d.platform&&r.chatId===d.sourceConversationId&&!r.hidden&&!r.deletedAt).sort(sourceCompare):[];}
export function workspaceDocuments(state,layer,query=''){
 const needle=query.trim().toLocaleLowerCase();
 return state.conversations.map(d=>{const rows=layer==='archive'?archiveRows(state,d.id):documentBlocks(state,d.id,layer==='excluded');const ids=new Set(rows.flatMap(b=>layer==='archive'?[b.id]:b.provenance.map(p=>p.sourceRecordId)));const records=state.records.filter(r=>ids.has(r.id));const times=records.map(r=>r.sourceSentAt).filter(Boolean).sort();return {...d,rows,messageCount:new Set(records.map(r=>r.sourceKey||r.id)).size,firstSourceSentAt:times[0]||null,lastSourceSentAt:times.at(-1)||null,unknownCount:rows.filter(r=>!r.sourceSentAt).length};}).filter(d=>d.rows.length&&(!needle||[d.userTitle,d.originalConversationTitle,...d.rows.map(b=>b.text??b.originalText),...d.rows.map(b=>b.note||'')].some(t=>t.toLocaleLowerCase().includes(needle)))).sort((a,b)=>(b.lastSourceSentAt||'').localeCompare(a.lastSourceSentAt||'')||a.id.localeCompare(b.id));
}
// A single UI transaction; source and time identities cannot be supplied by editors.
export function applyDocumentEdit(state,request,now){
 const {documentId,title,expectedTitleRevision,blocks}=request||{};const doc=state.conversations.find(d=>d.id===documentId);
 if(!doc||!Array.isArray(blocks)||blocks.length>1000||new Set(blocks.map(b=>b?.id)).size!==blocks.length)throw new ArchiveError('INVALID_REQUEST');
 if(title!==undefined&&(typeof title!=='string'||title.length>300||!Number.isSafeInteger(expectedTitleRevision)))throw new ArchiveError('INVALID_REQUEST');
 for(const change of blocks){if(!change||Object.keys(change).some(k=>!['id','expectedRevision','libraryText','excluded','note'].includes(k))||!Number.isSafeInteger(change.expectedRevision)||!(change.libraryText===null||typeof change.libraryText==='string'&&change.libraryText.length<=200000)||typeof change.note!=='string'||change.note.length>200000||typeof change.excluded!=='boolean')throw new ArchiveError('INVALID_REQUEST');}
 if(title!==undefined&&doc.titleRevision!==expectedTitleRevision||blocks.some(c=>{const b=state.library.blocks.find(b=>b.id===c.id&&b.documentId===documentId);return !b||b.revision!==c.expectedRevision||c.libraryText===null&&!b.originalTextReference;}))return {conflict:true};
 if(title!==undefined){doc.userTitle=title;doc.titleRevision++;state.library.documents.find(d=>d.id===doc.id).userTitle=title;}
 for(const c of blocks){const b=state.library.blocks.find(b=>b.id===c.id);Object.assign(b,{libraryText:c.libraryText,note:c.note,excluded:c.excluded,status:c.excluded?'excluded_by_user':'active',editedAt:c.libraryText===null&&!c.note?null:now,revision:b.revision+1});}
 return {ok:true};
}
