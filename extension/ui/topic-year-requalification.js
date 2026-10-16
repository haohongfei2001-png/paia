import {topicReaderReference} from './continuous-topic-reader.js';
// Stage a bounded current window after a human save changes read authority.
// Publication belongs to the caller: failures never replace its live reader,
// editor nodes, viewport anchor or any opaque cursor from the preceding view.
const idOf=item=>item?.entry?.id;
const yearOK=year=>year==='unknown'||Number.isInteger(year)&&year>=0&&year<=9999;
const idOK=id=>typeof id==='string'&&id.length>0&&id.length<=200;
const copy=structuredClone;
const identity=item=>JSON.stringify({entry:Object.fromEntries(['id','revision','contentRevision','bodyBinding','workingInputId','bindingRevision','currentInputRevision'].filter(key=>item?.entry?.[key]!==undefined).map(key=>[key,item.entry[key]])),placement:Object.fromEntries(['id','topicId','sectionId','layoutGeneration','revision','rank','sectionRank'].filter(key=>item?.placement?.[key]!==undefined).map(key=>[key,item.placement[key]]))});
export async function stageTopicYearWindow({topicId,sectionId,sort='desc',providerKey=null,recoveryEpoch,items=[],openedYears=[],readPrepared,isCurrent=()=>true,maxItems=120,pins=new Set(),expandEntry=null}={}){
 const refuse=reason=>({ok:false,reason});
 if(!idOK(topicId)||!idOK(sectionId)||!['asc','desc'].includes(sort)||typeof recoveryEpoch!=='string'||!recoveryEpoch||typeof readPrepared!=='function'||typeof isCurrent!=='function'||!Array.isArray(items)||!items.length||!Array.isArray(openedYears)||openedYears.length>10001||openedYears.some(year=>!yearOK(year))||!Number.isInteger(maxItems)||maxItems<1||maxItems>120||!(pins instanceof Set)||pins.size>120||expandEntry!==null&&typeof expandEntry!=='function'||!isCurrent())return refuse('window_unavailable');
 const required=new Map(),groups=[];
 for(const item of items){
  const id=idOf(item),year=item?.readingYear;
  if(!idOK(id)||required.has(id)||!yearOK(year)||!openedYears.includes(year)||item?.placement?.topicId!==topicId||item.placement.sectionId!==sectionId)return refuse('window_scope_changed');
  required.set(id,item);const last=groups.at(-1);if(last?.year===year)last.ids.push(id);else groups.push({year,ids:[id]});
 }
 const extraPins=[...pins].filter(id=>required.has(id)).length,budget=maxItems+extraPins;
 if(required.size>budget||new Set(groups.map(group=>group.year)).size!==groups.length)return refuse('window_limit');
 const staged=[],frontiers=[],sections=new Map(),seen=new Set();let generation=null,authority=null,firstPage=null,lastPage=null;
 const current=page=>{
  if(!isCurrent()||!page||page.cursorInvalid||page.unavailable||page.unsupported||page.indexing||page.topic?.id!==topicId||page.recoveryEpoch!==recoveryEpoch||!page.yearMetadata?.complete||page.yearMetadata.pending||!page.sections?.some(section=>section.sectionId===sectionId)||typeof page.coverage?.activeGeneration!=='string'||!page.coverage.activeGeneration||page.authority==null)return false;
  if(generation===null){generation=page.coverage.activeGeneration;authority=JSON.stringify(page.authority);}
  return generation===page.coverage.activeGeneration&&authority===JSON.stringify(page.authority);
 };
 const base={topicId,scopeSectionId:sectionId,sort,query:'',providerKey,chronology:'expression',direction:'next',limit:40};
 try{
  for(const [groupIndex,group]of groups.entries()){
   let cursor=null,initial=true;const remaining=new Set(group.ids),cursors=new Set();let done=false;
   for(let reads=0;reads<budget+1;reads++){
    const page=await readPrepared({...base,year:group.year,cursor,anchorId:initial?group.ids[0]:null,expectedReadGeneration:generation},isCurrent);
    if(!current(page)||page.year!==group.year)return refuse('window_scope_changed');
    if(initial&&!page.items?.some(item=>idOf(item)===group.ids[0]))return refuse('window_target_unavailable');
    if(!firstPage)firstPage=page;lastPage=page;
    const ids=[];
    for(const item of page.items||[]){
     const id=idOf(item);
     if(!idOK(id)||seen.has(id)||item.entry.lifecycle!=='active'||item.placement?.topicId!==topicId||item.placement.sectionId!==sectionId)return refuse('window_scope_changed');
     if(staged.length>=budget)return refuse('window_limit');
     let fresh={...copy(item),readingYear:group.year};
     // A large-body descriptor cannot qualify a cached expanded body. A caller
     // may use the original full-body + descriptor fence, never a stale copy.
     if(item.entry.large&&required.get(id)?.expanded){
      if(!expandEntry)return refuse('expanded_requalification_required');
      fresh=await expandEntry(fresh,required.get(id),{generation,recoveryEpoch,isCurrent});
      if(!isCurrent()||!fresh||idOf(fresh)!==id||fresh.entry?.lifecycle!=='active'||typeof fresh.entry.body!=='string'||fresh.entry.recoveryEpoch!==recoveryEpoch||identity(fresh)!==identity(item)||fresh.placement?.sectionId!==sectionId)return refuse('expanded_requalification_failed');
      fresh={...copy(fresh),expanded:true,...(Number.isFinite(required.get(id)?.height)&&required.get(id).height>0?{height:required.get(id).height}:{}),readingYear:group.year};
     }
     if(required.get(id)?.expanded)fresh={...fresh,expanded:true,...(Number.isFinite(required.get(id).height)&&required.get(id).height>0&&required.get(id).height<10000000?{height:required.get(id).height}:{})};
     staged.push(fresh);seen.add(id);remaining.delete(id);ids.push(id);
    }
    for(const section of page.sections||[]){if(section.sectionId!==sectionId||section.topicId&&section.topicId!==topicId)return refuse('window_scope_changed');sections.set(section.sectionId,copy(section));}
    frontiers.push({ids,sections:[...sections.keys()],before:copy(page.previousCursor??null),after:copy(page.nextCursor??null),requestYear:group.year,year:group.year,nextYear:page.nextYear??null});
    // Across already mounted years, finish the earlier year through its real
    // boundary. The last mounted year can retain its normal next-page cursor.
    if(!remaining.size&&(groupIndex===groups.length-1||!page.nextCursor)){
     if(groupIndex<groups.length-1&&page.nextYear!==groups[groupIndex+1].year)return refuse('window_year_gap_changed');
     done=true;break;
    }
    if(!page.nextCursor)return refuse('window_target_unavailable');
    const key=JSON.stringify(page.nextCursor);if(cursors.has(key))return refuse('window_cursor_cycle');cursors.add(key);cursor=page.nextCursor;initial=false;
   }
   if(!done||remaining.size)return refuse('window_preparation_pending');
  }
  // The final exact original-scope read catches edits, membership moves and
  // restores that settle while another page or expanded body was awaited.
  const last=staged.at(-1),check=await readPrepared({...base,year:last.readingYear,anchorId:idOf(last),cursor:null,limit:1,expectedReadGeneration:generation},isCurrent);
  if(!current(check)||check.year!==last.readingYear||!check.items?.some(item=>idOf(item)===idOf(last)&&item.placement?.topicId===topicId&&item.placement.sectionId===sectionId&&item.entry?.revision===last.entry.revision&&item.placement.revision===last.placement.revision))return refuse('window_scope_changed');
  const {items:unusedItems,tracked:unusedTracked,...pageMeta}=lastPage;
  return {ok:true,items:staged,sections:[...sections.values()],frontiers,coverage:copy(lastPage.coverage),pageMeta:copy(pageMeta),recoveryEpoch,generation,previousCursor:copy(firstPage.previousCursor??null),nextCursor:copy(lastPage.nextCursor??null),previousRequestYear:firstPage.year,nextRequestYear:lastPage.year,currentYear:lastPage.year,nextYear:lastPage.nextYear??null,openedYears:[...openedYears],terminalPrevious:!firstPage.previousCursor,terminalNext:!lastPage.nextCursor,windowStart:0};
 }catch(error){return refuse(error?.message==='TOPIC_YEAR_PREPARATION_PENDING'?'window_preparation_pending':'window_read_failed');}
}


// A mounted window is not the reader's whole known extent. Requalify retained
// references through the same bounded owner before publishing a new generation;
// only the already staged native window keeps bodies in this temporary result.
export async function stageTopicYearExtent({extent=[],staged,openedYears=[],topicId,sectionId,sort='desc',providerKey=null,recoveryEpoch,readPrepared,isCurrent=()=>true,maxReferences=10000,maxItems=120,chunk=40,pins=new Set(),maxEmptyLoads=20}={}){
 const refuse=reason=>({ok:false,reason});
 if(!idOK(topicId)||!idOK(sectionId)||!['asc','desc'].includes(sort)||typeof recoveryEpoch!=='string'||!recoveryEpoch||typeof readPrepared!=='function'||typeof isCurrent!=='function'||!isCurrent()||!Array.isArray(extent)||!extent.length||!Array.isArray(openedYears)||!openedYears.length||openedYears.length>10001||openedYears.some(year=>!yearOK(year))||!Number.isInteger(maxReferences)||maxReferences<1||maxReferences>20000||!Number.isInteger(maxItems)||maxItems<1||maxItems>120||maxReferences<maxItems||!Number.isInteger(chunk)||chunk<1||chunk>40||!(pins instanceof Set)||pins.size>120||!Number.isInteger(maxEmptyLoads)||maxEmptyLoads<1||maxEmptyLoads>100||!staged?.ok||!Array.isArray(staged.items)||!staged.items.length||typeof staged.generation!=='string'||!staged.generation||staged.coverage?.activeGeneration!==staged.generation||staged.recoveryEpoch!==recoveryEpoch||staged.pageMeta?.authority==null)return refuse('extent_unavailable');
 const required=new Map(),groups=[],budget=maxReferences+chunk;
 if(extent.length>budget)return refuse('extent_limit');
 for(const item of extent){
  const id=idOf(item),year=item?.readingYear;
  if(!idOK(id)||required.has(id)||!yearOK(year)||!openedYears.includes(year)||item?.placement?.topicId!==topicId||item.placement.sectionId!==sectionId)return refuse('extent_scope_changed');
  required.set(id,item);const last=groups.at(-1);if(last?.year===year)last.ids.push(id);else groups.push({year,ids:[id]});
 }
 if(new Set(groups.map(group=>group.year)).size!==groups.length)return refuse('extent_scope_changed');
 const bodyBudget=maxItems+[...pins].filter(id=>required.has(id)).length;
 if(staged.items.length>bodyBudget)return refuse('window_limit');
 const mounted=new Map();
 for(const item of staged.items){const id=idOf(item);if(!idOK(id)||mounted.has(id)||item?.placement?.topicId!==topicId||item.placement.sectionId!==sectionId||item.entry.lifecycle!=='active'||!yearOK(item.readingYear)||!openedYears.includes(item.readingYear))return refuse('extent_scope_changed');mounted.set(id,item);}
 const referenceIdentity=item=>JSON.stringify({...topicReaderReference(item),expanded:undefined,height:undefined,readingYear:undefined});
 const generation=staged.generation,authority=JSON.stringify(staged.pageMeta.authority),items=[],frontiers=[],sections=new Map(),seen=new Set();
 let firstPage=null,lastPage=null,emptyReads=0,totalReads=0;
 const current=page=>isCurrent()&&page&&!page.cursorInvalid&&!page.unavailable&&!page.unsupported&&!page.indexing&&page.topic?.id===topicId&&page.recoveryEpoch===recoveryEpoch&&page.yearMetadata?.complete===true&&!page.yearMetadata.pending&&page.coverage?.activeGeneration===generation&&JSON.stringify(page.authority)===authority&&Array.isArray(page.items)&&page.items.length<=chunk&&Array.isArray(page.sections)&&page.sections.some(section=>section.sectionId===sectionId)&&page.sections.every(section=>section.sectionId===sectionId&&(!section.topicId||section.topicId===topicId));
 const base={topicId,scopeSectionId:sectionId,sort,query:'',providerKey,chronology:'expression',direction:'next',limit:chunk,expectedReadGeneration:generation};
 try{
  for(const [groupIndex,group]of groups.entries()){
   let cursor=null,initial=true,complete=false;const remaining=new Set(group.ids),cursors=new Set();
   while(++totalReads<=budget+groups.length+1){
    const page=await readPrepared({...base,year:group.year,cursor,anchorId:initial&&groupIndex===0?group.ids[0]:null},isCurrent);
    if(!current(page)||page.year!==group.year)return refuse('extent_scope_changed');
    if(initial&&groupIndex===0&&!page.items.some(item=>idOf(item)===group.ids[0]))return refuse('extent_target_unavailable');
    const {items:pageBodies,tracked:pageTracked,...metadata}=page;
    if(!firstPage)firstPage=copy(metadata);lastPage=copy(metadata);
    if(!page.items.length){if(++emptyReads>=maxEmptyLoads)return refuse('extent_preparation_pending');}else emptyReads=0;
    const ids=[];
    for(const item of page.items){
     const id=idOf(item);
     if(!idOK(id)||seen.has(id)||item.entry.lifecycle!=='active'||item.placement?.topicId!==topicId||item.placement.sectionId!==sectionId)return refuse('extent_scope_changed');
     if(items.length>=budget)return refuse('extent_limit');
     const native=mounted.get(id),old=required.get(id);
     if(native&&(native.readingYear!==group.year||referenceIdentity(native)!==referenceIdentity(item)))return refuse('extent_window_changed');
     if(native)items.push(copy(native));
     else items.push(topicReaderReference({...item,readingYear:group.year,...(old?.expanded===true?{expanded:true,...(Number.isFinite(old.height)&&old.height>0&&old.height<10000000?{height:old.height}:{})}:{})}));
     seen.add(id);remaining.delete(id);ids.push(id);
    }
    for(const section of page.sections)sections.set(section.sectionId,copy(section));
    frontiers.push({ids,sections:[...sections.keys()],before:copy(page.previousCursor??null),after:copy(page.nextCursor??null),requestYear:group.year,year:group.year,nextYear:page.nextYear??null});
    if(!page.nextCursor){
     if(remaining.size)return refuse('extent_target_unavailable');
     if(groupIndex<groups.length-1&&page.nextYear!==groups[groupIndex+1].year)return refuse('window_year_gap_changed');
     complete=true;break;
    }
    const key=JSON.stringify(page.nextCursor);if(cursors.has(key))return refuse('extent_cursor_cycle');cursors.add(key);cursor=page.nextCursor;initial=false;
   }
   if(!complete)return refuse('extent_preparation_pending');
  }
  const mountedIds=staged.items.map(idOf),windowStart=items.findIndex(item=>idOf(item)===mountedIds[0]);
  if(windowStart<0||mountedIds.some((id,index)=>idOf(items[windowStart+index])!==id))return refuse('extent_window_changed');
  const last=items.at(-1),check=await readPrepared({...base,year:last.readingYear,anchorId:idOf(last),cursor:null,limit:1},isCurrent);
  if(!current(check)||check.year!==last.readingYear||!check.items.some(item=>idOf(item)===idOf(last)&&item.entry.lifecycle==='active'&&item.placement?.topicId===topicId&&item.placement.sectionId===sectionId&&referenceIdentity(item)===referenceIdentity(last)))return refuse('extent_scope_changed');
  const pageMeta=lastPage;
  return {...staged,ok:true,items,sections:[...sections.values()],frontiers,coverage:copy(lastPage.coverage),pageMeta:copy(pageMeta),recoveryEpoch,generation,previousCursor:copy(firstPage.previousCursor??null),nextCursor:copy(lastPage.nextCursor??null),previousRequestYear:firstPage.year,nextRequestYear:lastPage.year,currentYear:lastPage.year,nextYear:lastPage.nextYear??null,openedYears:[...openedYears],terminalPrevious:!firstPage.previousCursor,terminalNext:!lastPage.nextCursor,windowStart};
 }catch(error){return refuse(error?.message==='TOPIC_YEAR_PREPARATION_PENDING'?'extent_preparation_pending':'extent_read_failed');}
}
