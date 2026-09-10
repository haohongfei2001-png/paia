import {ArchiveError} from './constants.js';
const views=['library','archive','excluded','settings','legacy','memory'];
function validCursor(c){return c===null||Array.isArray(c)&&c.length<=8&&c.every(x=>typeof x==='string'&&x.length<600||typeof x==='number'&&Number.isFinite(x));}
const prefixRange=p=>IDBKeyRange.bound(p,[...p,[]],false,true);
export async function queryPage(t,control,{view='library',query='',limit=50,cursor=null,documentId=null,trackedBlockIds=[],sort=null}={}){
 if(sort!==null&&!['asc','desc'].includes(sort))throw new ArchiveError('INVALID_REQUEST');
 if(!views.includes(view)||typeof query!=='string'||query.length>1000||!Number.isInteger(limit)||limit<1||limit>100||!validCursor(cursor)||documentId!==null&&(typeof documentId!=='string'||documentId.length>200))throw new ArchiveError('INVALID_REQUEST');
 if(!Array.isArray(trackedBlockIds)||trackedBlockIds.length>1000||trackedBlockIds.some(id=>typeof id!=='string'||id.length>200))throw new ArchiveError('INVALID_REQUEST');
 const trash=await t.count('recordIndex','byTrash',1),hidden=await t.count('recordIndex','byHidden',1);
 const state={schemaVersion:6,...control,records:[],conversations:[],library:{documents:[],blocks:[],classificationRules:control.classificationRules,filterRules:control.filterRules},adapterVersion:'0.3.0',stats:{total:await t.count('records')-trash,trash,hidden,bytes:0,quotaBytes:0},documents:[],pageItemIds:[],nextCursor:null};
 if(['settings','memory'].includes(view))return state;
 if(view==='legacy'){
  const candidates=await t.page('recordIndex',{index:'bySequence',after:cursor?.[0],limit:100});for(const {value:r}of candidates.rows)if(r.hidden||r.deletedAt)state.records.push((await t.get('records',r.id)).value);state.nextCursor=candidates.next===null?null:[candidates.next];return state;
 }
 if(documentId){
  const readingSort=sort||((await t.get('meta','organizer-controls'))?.inputReadingSort==='desc'?'desc':'asc');state.readingSort=readingSort;
  const row=await t.get('documents',documentId);if(!row)return state;state.conversations.push(row.value);state.library.documents.push((await t.get('libraryDocuments',documentId)).value);
  const prefix=view==='archive'?[row.chatKey,0]:[documentId,view==='excluded'?1:0];if(prefix[0]===undefined)return state;
  const page=await t.rangePage(view==='archive'?'recordIndex':'blockIndex','byList',prefixRange(prefix),cursor,limit,readingSort==='desc'?'prev':'next');
  state.pageItemIds=page.rows.map(r=>r.value.id);const ids=new Set();for(const {value:ix}of page.rows){if(view==='archive')ids.add(ix.id);else{const b=(await t.get('blocks',ix.id)).value;state.library.blocks.push(b);b.provenance.forEach(p=>ids.add(p.sourceRecordId));}}
  if(view==='library')for(const id of trackedBlockIds){if(state.library.blocks.some(b=>b.id===id))continue;const row=await t.get('blocks',id);if(row?.value.documentId===documentId){state.library.blocks.push(row.value);row.value.provenance.forEach(p=>ids.add(p.sourceRecordId));}}
  for(const id of ids){const r=await t.get('records',id);if(r)state.records.push(r.value);}
  state.nextCursor=page.next;return state;
 }
 const needle=query.trim().toLocaleLowerCase();
 const scan=await t.rangePage('documents',view+'Display',null,cursor,100);let last=null;
 for(const {key,value:row}of scan.rows){last=key;const d=row.value;
  const rowCount=view==='archive'?(row.chatKey?await t.count('recordIndex','byList',prefixRange([row.chatKey,0])):0):await t.count('blockIndex','byExcluded',[d.id,view==='excluded'?1:0]);if(!rowCount)continue;
  let matches=!needle||[d.userTitle,d.originalConversationTitle].some(v=>(v||'').toLocaleLowerCase().includes(needle));
  if(!matches){
   const archive=view==='archive',prefix=archive?[row.chatKey,0]:[d.id,view==='excluded'?1:0];let position=null;
   do{const part=await t.rangePage(archive?'recordIndex':'blockIndex','byList',prefixRange(prefix),position,50);for(const {value:ix}of part.rows){const v=(await t.get(archive?'records':'blocks',ix.id)).value;const text=archive?v.originalText:v.libraryText??(v.originalTextReference?(await t.get('records',v.originalTextReference))?.value.originalText:'');if([text,v.note].some(s=>(s||'').toLocaleLowerCase().includes(needle))){matches=true;break;}}position=part.next;}while(position&&!matches);
  }
  if(!matches)continue;
  const first=await t.edge('sourceCounts',view+'First',prefixRange([d.id,0])),lastTime=await t.edge('sourceCounts',view+'Last',prefixRange([d.id,0]),'prev');
  state.documents.push({...d,messageCount:await t.count('sourceCounts','byView',JSON.stringify([d.id,view])),unknownCount:view==='archive'?await t.count('recordIndex','byKnown',[row.chatKey,0,1]):await t.count('blockIndex','byKnown',[d.id,view==='excluded'?1:0,1]),firstSourceSentAt:first?.[view+'First'][2]||null,lastSourceSentAt:lastTime?.[view+'Last'][2]||null});
  if(state.documents.length===limit){state.nextCursor=last;return state;}
 }
 state.nextCursor=scan.next;return state;
}
