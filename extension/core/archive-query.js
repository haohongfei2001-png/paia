import {archiveYearPrefix,archiveYearKey,archiveYearMeta,archiveYearAuthority} from './archive-year-index.js';
import {readRevisitPolicy,inputRevisitExcluded} from './reader-state.js';
import {ArchiveError} from './constants.js';
import {historicalInstant,historicalDateBound} from './historical-time.js';
import {validProvider} from './read-projection-keys.js';
const views=['library','archive','excluded','settings','legacy','memory'];
function validCursor(c){return c===null||Array.isArray(c)&&c.length<=8&&c.every(x=>typeof x==='string'&&x.length<600||typeof x==='number'&&Number.isFinite(x));}
const prefixRange=p=>IDBKeyRange.bound(p,[...p,[]],false,true);
async function recentCapturedDocument(t){
 let cursor=null,scanned=0;const policy=await readRevisitPolicy(t);
 while(scanned<1000){
  const page=await t.rangePage('recordIndex','bySequence',null,cursor,100,'prev');
  if(!page.rows.length)break;
  for(const {key,value:ix} of page.rows){
   cursor=key;scanned++;
   if(ix.hidden||ix.deletedAt)continue;
   const record=(await t.get('records',ix.id))?.value;if(!record)continue;const b=(await t.get('blocks','block:'+ix.id))?.value;if(b&&(b.excluded||await inputRevisitExcluded(t,b,policy)))continue;
   const docs=await t.all('documents','byChat',ix.chatKey,2);
   for(const row of docs){
    const d=row.value;if(!d)continue;
    if(await t.count('blockIndex','byExcluded',[d.id,0]))return {id:d.id,userTitle:d.userTitle||null,originalConversationTitle:d.originalConversationTitle||null,capturedAt:record.capturedAt||null,sourceSentAt:record.sourceSentAt||null};
   }
  }
  if(page.next===null)break;cursor=page.next;
 }
 return null;
}
// Annual reading is a bounded projection over the original Input index. No
// body or annual truth is persisted; filtering stays at the pageRead owner.
export function archiveReadingYear(value){
 const at=typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)?historicalDateBound(value):historicalInstant(value);
 return at===null?null:new Date(at).getUTCFullYear();
}
export async function readArchiveYearPage(t,{documentId,cursor=null,limit=40,sort='desc',yearReading,generation,eligible=async()=>true}){
 const fail=()=>{throw new ArchiveError('INVALID_REQUEST');};
 if(!yearReading||typeof yearReading!=='object'||Array.isArray(yearReading)||Object.keys(yearReading).some(k=>!['year','phase','generation','probe'].includes(k)))fail();
 let {year=null,phase=year==='undated'?'undated':'dated',generation:expected=null,probe=false}=yearReading;
 if(typeof probe!=='boolean'||year!==null&&year!=='undated'&&(!Number.isInteger(year)||year<0||year>10000)||!['dated','undated'].includes(phase)||year==='undated'&&phase!=='undated'||Number.isInteger(year)&&phase!=='dated'||expected!==null&&!(Number.isSafeInteger(expected)&&expected>=0)&&!(typeof expected==='string'&&expected.length<=100&&/^[a-zA-Z0-9_.:-]+$/.test(expected)))fail();
 if(expected!==null&&expected!==generation)throw new ArchiveError('BACKUP_CHANGED');
 const base=archiveYearPrefix(documentId)+(phase==='dated'?'0:':'1:'),range=IDBKeyRange.bound(base,base+'\uffff',false,true);
 if(cursor!==null&&(!Array.isArray(cursor)||cursor.length!==1||!range.includes(cursor[0])))fail();
 const direction=phase==='undated'?'next':sort==='desc'?'prev':'next';
 const rows=[],budget=100;let position=cursor?.[0]??null,scanned=0,nextYear=null,exhausted=false;
 while(scanned<budget&&rows.length<limit){
  const page=await t.rangePage('meta',null,range,position,1,direction),stored=page.rows[0];
  const ix=stored?await t.get('blockIndex',stored.value.inputId):null,item=stored?{key:stored.key,value:ix||{}}:null;
  if(!item){exhausted=true;break;}
  scanned++;const candidateYear=archiveReadingYear(item.value.sourceSentAt),matching=phase==='undated'?candidateYear===null:candidateYear!==null;
  if(ix&&!ix.excluded&&archiveYearKey(ix)===item.key&&matching&&await eligible(item.value)){
   const candidate=phase==='undated'?'undated':candidateYear;
   if(probe){nextYear=candidate;break;}
   if(year===null)year=candidate;
   if(candidate===year)rows.push(item);
   else if(sort==='desc'?candidate<year:candidate>year){nextYear=candidate;break;}
  }
  position=item.key;
 }
 // A dated end is not total completion: undated/invalid-time Inputs use a
 // separate bounded pass, and only eligible evidence can name that segment.
 const nextCursor=nextYear!==null||exhausted?null:[position];
 const continuation=exhausted&&phase==='dated'?{year:'undated',phase:'undated',generation,probe:true}:null;
 return {rows,next:nextCursor,yearReading:{year,phase,generation,timeZone:'UTC',scanned,complete:nextYear!==null||exhausted,nextYear,continuation}};
}
export async function queryPage(t,control,{view='library',query='',limit=50,cursor=null,documentId=null,trackedBlockIds=[],sort=null,providerKey=null,expectedGeneration=null,yearReading=null}={},annualOwner={}){
 const dataGeneration=(await t.get('meta','backup-data-generation'))?.value||0;
 if(expectedGeneration!==null&&(!Number.isSafeInteger(expectedGeneration)||expectedGeneration<0))throw new ArchiveError('INVALID_REQUEST');
 if(expectedGeneration!==null&&expectedGeneration!==dataGeneration)throw new ArchiveError('BACKUP_CHANGED');
 if(sort!==null&&!['asc','desc'].includes(sort))throw new ArchiveError('INVALID_REQUEST');
 if(providerKey!==null&&!validProvider(providerKey))throw new ArchiveError('INVALID_REQUEST');
 if(!views.includes(view)||typeof query!=='string'||query.length>1000||!Number.isInteger(limit)||limit<1||limit>100||!validCursor(cursor)||documentId!==null&&(typeof documentId!=='string'||documentId.length>200))throw new ArchiveError('INVALID_REQUEST');
 if(!Array.isArray(trackedBlockIds)||trackedBlockIds.length>1000||trackedBlockIds.some(id=>typeof id!=='string'||id.length>200))throw new ArchiveError('INVALID_REQUEST');
 // Exact archive-wide counts are used by root/Settings. Reader pages never display them.
 const [trash,hidden,total]=documentId?[null,null,null]:await Promise.all([t.count('recordIndex','byTrash',1),t.count('recordIndex','byHidden',1),t.count('records')]);
 const state={schemaVersion:6,dataGeneration,...control,records:[],conversations:[],library:{documents:[],blocks:[],classificationRules:control.classificationRules,filterRules:control.filterRules},adapterVersion:'0.3.0',stats:{total:total===null?null:total-trash,trash,hidden,bytes:0,quotaBytes:0},documents:[],pageItemIds:[],nextCursor:null,recentCapturedDocument:null};
 if(['settings','memory'].includes(view))return state;
 if(view==='legacy'){
  const candidates=await t.page('recordIndex',{index:'bySequence',after:cursor?.[0],limit:100});for(const {value:r}of candidates.rows)if(r.hidden||r.deletedAt)state.records.push((await t.get('records',r.id)).value);state.nextCursor=candidates.next===null?null:[candidates.next];return state;
 }
 if(documentId){
  const readingSort=sort||(await t.get('meta','organizer-controls'))?.inputReadingSort||(yearReading?'desc':'asc');state.readingSort=readingSort;
  const row=await t.get('documents',documentId);if(!row){if(view==='library'&&trackedBlockIds.length){state.unavailableTrackedInputIds=[];for(const id of trackedBlockIds)if(!await t.get('blocks',id))state.unavailableTrackedInputIds.push(id);}return state;}state.conversations.push(row.value);state.library.documents.push((await t.get('libraryDocuments',documentId)).value);
  const prefix=view==='archive'?[row.chatKey,0]:[documentId,view==='excluded'?1:0];if(prefix[0]===undefined)return state;
  if(yearReading&&(view!=='library'||typeof annualOwner.eligible!=='function'))throw new ArchiveError('INVALID_REQUEST');
  if(yearReading&&annualOwner.ready===false){state.yearReading={year:null,phase:'dated',generation:null,complete:false,building:true};state.nextCursor=['archive-year-build',documentId,dataGeneration];return state;}
  const yearAuthority=yearReading?archiveYearAuthority(await t.get('meta',archiveYearMeta(documentId))):null;
  const page=yearReading?await readArchiveYearPage(t,{documentId,cursor,limit,sort:readingSort,yearReading,generation:yearAuthority,eligible:annualOwner.eligible}):await t.rangePage(view==='archive'?'recordIndex':'blockIndex','byList',prefixRange(prefix),cursor,limit,readingSort==='desc'?'prev':'next');
  if(page.yearReading){state.yearReading=page.yearReading;state.pageItemCursors=Object.fromEntries(page.rows.map(row=>[row.value.id,[row.key]]));}
  state.pageItemIds=page.rows.map(r=>r.value.id);const ids=new Set();
  if(view==='archive')for(const {value:ix}of page.rows)ids.add(ix.id);
  else{const blocks=await Promise.all(page.rows.map(({value:ix})=>t.get('blocks',ix.id)));for(const row of blocks){const b=row.value;state.library.blocks.push(b);b.provenance.forEach(p=>ids.add(p.sourceRecordId));}}
  if(view==='library')for(const id of trackedBlockIds){if(state.library.blocks.some(b=>b.id===id))continue;const row=await t.get('blocks',id);if(row?.value.documentId===documentId){state.library.blocks.push(row.value);row.value.provenance.forEach(p=>ids.add(p.sourceRecordId));}else if(!row)(state.unavailableTrackedInputIds??=[]).push(id);}
  const records=await Promise.all([...ids].map(id=>t.get('records',id)));for(const row of records)if(row)state.records.push(row.value);
  state.nextCursor=page.next;return state;
 }
 const needle=query.trim().toLocaleLowerCase();
 if(view==='library'&&!needle&&!providerKey)state.recentCapturedDocument=await recentCapturedDocument(t);
 const scan=await t.rangePage('documents',view+'Display',null,cursor,100);let last=null;
 for(const {key,value:row}of scan.rows){last=key;const d=row.value;
  if(providerKey&&d.platform!==providerKey)continue;
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
