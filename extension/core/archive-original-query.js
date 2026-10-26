import {ArchiveError} from './constants.js';
const fail=()=>{throw new ArchiveError('INVALID_REQUEST');};
const keys=(v,allowed,required=allowed)=>{if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!allowed.includes(k))||required.some(k=>!Object.hasOwn(v,k)))fail();};
const id=v=>typeof v==='string'&&v.length>0&&v.length<=200;
const key=v=>v===null||Array.isArray(v)&&v.length<=8&&v.every(x=>typeof x==='string'&&x.length<=600||typeof x==='number'&&Number.isFinite(x));
const prefix=v=>IDBKeyRange.bound(v,[...v,[]],false,true);
// A bounded read model over existing records, blocks and indexes. No new body
// store, capture authority, revision owner or durable cursor is introduced.
export class ArchiveOriginalQuery {
 constructor(store){this.store=store;}
 page(options){
  keys(options,['target','cursor','expectedGeneration','limit'],['target']);
  const {target,cursor=null,expectedGeneration=null,limit=40}=options;keys(target,['kind','ref']);
  if(!['conversation','input'].includes(target.kind)||!id(target.ref)||!Number.isInteger(limit)||limit<1||limit>100||expectedGeneration!==null&&(!Number.isSafeInteger(expectedGeneration)||expectedGeneration<0))fail();
  const scope=JSON.stringify([target.kind,target.ref]);
  if(cursor!==null){keys(cursor,['scope','generation','visible','hidden','visibleDone','hiddenDone','offset']);if(cursor.scope!==scope||!Number.isSafeInteger(cursor.generation)||cursor.generation<0||!key(cursor.visible)||!key(cursor.hidden)||typeof cursor.visibleDone!=='boolean'||typeof cursor.hiddenDone!=='boolean'||!Number.isSafeInteger(cursor.offset)||cursor.offset<0)fail();}
  return this.store.run(()=>this.store.repository.transaction(false,async t=>{
   const generation=(await t.get('meta','backup-data-generation'))?.value||0;
   if(expectedGeneration!==null&&generation!==expectedGeneration||cursor&&cursor.generation!==generation)throw new ArchiveError('BACKUP_CHANGED');
   const control=await this.store.control(t);if(control.settings.consentVersion!==1)throw new ArchiveError('CONSENT_REQUIRED');
   const block=target.kind==='input'?(await t.get('blocks',target.ref))?.value:null;
   const doc=(await t.get('documents',target.kind==='conversation'?target.ref:block?.documentId||''))?.value;
   const base={target:{...target},generation,title:doc?.userTitle||doc?.originalConversationTitle||'',records:[],nextCursor:null,intended:0,unavailable:0};
   if(!doc||target.kind==='input'&&!block)return {...base,availability:'unavailable'};
   let indexes=[],next=null;
   if(block){
    const refs=[...new Set((block.provenance||[]).map(p=>p.sourceRecordId))];base.intended=refs.length;
    const offset=cursor?.offset||0;if(offset>refs.length||cursor&&(cursor.visible!==null||cursor.hidden!==null||!cursor.visibleDone||!cursor.hiddenDone))fail();
    for(const sourceId of refs.slice(offset,offset+limit))indexes.push(await t.get('recordIndex',sourceId));
    if(offset+limit<refs.length)next={scope,generation,visible:null,hidden:null,visibleDone:true,hiddenDone:true,offset:offset+limit};
   }else{
    const row=await t.get('documents',target.ref);if(!row.chatKey)return {...base,availability:'unavailable'};
    if(cursor&&(cursor.offset!==0||[0,1].some(bucket=>{const value=cursor[bucket?'hidden':'visible'];return value!==null&&(value.length!==6||value[0]!==row.chatKey||value[1]!==bucket);})))fail();
    base.intended=await t.count('recordIndex','byChat',row.chatKey);
    const parts=await Promise.all([0,1].map(async bucket=>{
     const name=bucket?'hidden':'visible',done=cursor?.[name+'Done']||false,after=cursor?.[name]||null;
     return {name,after,done,...(done?{rows:[],next:null}:await t.rangePage('recordIndex','byList',prefix([row.chatKey,bucket]),after,limit))};
    }));
    const merged=parts.flatMap(p=>p.rows.map(row=>({...row,part:p}))).sort((a,b)=>this.store.repository.factory.cmp(a.value.sort,b.value.sort));
    for(const row of merged.slice(0,limit)){indexes.push(row.value);row.part.after=row.key;row.part.consumed=(row.part.consumed||0)+1;}
    for(const p of parts)p.done=p.done||!p.next&&(p.consumed||0)===p.rows.length;
    if(parts.some(p=>!p.done))next={scope,generation,visible:parts[0].after,hidden:parts[1].after,visibleDone:parts[0].done,hiddenDone:parts[1].done,offset:0};
   }
   for(const ix of indexes){
    const source=ix?(await t.get('records',ix.id))?.value:null;
    if(!source||typeof source.originalText!=='string'||await t.get('tombstones','source:'+ix.sourceKey)||await t.get('tombstones','snapshot:'+ix.dedupeKey)){base.unavailable++;continue;}
    base.records.push({id:source.id,originalText:source.originalText,sourceSentAt:source.sourceSentAt||null});
   }
   return {...base,nextCursor:next,availability:base.unavailable?'partial':base.intended?'available':'unavailable'};
  }));
 }
}
