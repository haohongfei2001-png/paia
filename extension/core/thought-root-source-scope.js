import {prefix,fail} from './thought-model.js';
import {validProvider} from './read-projection-keys.js';
import {entryMatchesProvider} from './thought-source-scope.js';

const normalize=value=>value.trim().normalize('NFKC').toLocaleLowerCase();
const invalid=()=>({cursorInvalid:true,items:[],nextCursor:null,complete:false});
const active=row=>row?.lifecycle==='active'&&!row.redirectTo;

// One existing root/search candidate and at most 40 placement descriptors per
// request. Large nonmatching Topics continue with an opaque, scope-bound cursor;
// membership never comes from historical Topic sourceRecordIds or body scans.
export async function sourceRootPage(store,{providerKey,query='',cursor=null,mode='stable',limit=40}={},readBase){
 if(!validProvider(providerKey)||typeof query!=='string'||query.length>300||mode!=='stable'||!Number.isInteger(limit)||limit<1||limit>40)fail();
 const needle=normalize(query);
 if(cursor&&(cursor.mode!=='source_root'||cursor.providerKey!==providerKey||cursor.query!==needle))return invalid();
 const baseCursor=cursor?.baseCursor??null,base=await readBase({query:needle,cursor:baseCursor,limit:1});
 if(base.cursorInvalid)return invalid();
 const wrap=(next,pending=null)=>({mode:'source_root',providerKey,query:needle,baseCursor:next,pending});
 const operations={...base.operations,placementRowsRead:0,entryRowsRead:0};
 const result=(items,next,pending=null)=>({...base,items,recent:[],operations,providerKey,
  nextCursor:pending?wrap(baseCursor,pending):next?wrap(next):null,
  complete:!pending&&!next&&base.complete===true});
 const item=base.items[0];
 if(!item){if(cursor?.pending)return invalid();return result([],base.nextCursor);}
 const match=await store.run(()=>store.repository.transaction(false,async t=>{
  if(item.kind==='entry'){
   if(cursor?.pending)return {invalid:true};
   if(!await entryMatchesProvider(store,t,item.entryId,providerKey))return {};
   operations.entryRowsRead++;
   const entry=await t.get('thoughts',item.entryId);
   return {matched:active(entry)&&entry.storageSchema===2};
  }
  const topicId=item.topicId||item.id,topic=await t.get('topics',topicId);
  if(!active(topic)||!topic.activeLayoutGeneration)return {};
  const epoch=(await t.get('meta','thought-epoch'))?.value||0;
  const viewKey=JSON.stringify([topic.activeLayoutGeneration,topic.organizationRevision,topic.countVersion,epoch]);
  const sectionId=item.kind==='section'?item.sectionId:null;
  const pending=cursor?.pending;
  if(pending&&(pending.topicId!==topicId||pending.sectionId!==sectionId||pending.viewKey!==viewKey))return {invalid:true};
  const range=sectionId?prefix([topicId,topic.activeLayoutGeneration,sectionId,0]):prefix([topicId,topic.activeLayoutGeneration,0]);
  const placements=await t.rangePage('placements',sectionId?'bySectionOrder':'byTopicOrder',range,pending?.key??null,40);
  operations.placementRowsRead=placements.rows.length;
  for(const {value:p}of placements.rows){
   if(!active(p)||!await entryMatchesProvider(store,t,p.entryId,providerKey))continue;
   const section=await t.get('sections',JSON.stringify([topicId,topic.activeLayoutGeneration,p.sectionId]));
   if(!active(section))continue;
   operations.entryRowsRead++;
   const entry=await t.get('thoughts',p.entryId);
   if(active(entry)&&entry.storageSchema===2)return {matched:true};
  }
  return {pending:placements.next?{topicId,sectionId,viewKey,key:placements.next}:null};
 }));
 if(match.invalid)return invalid();
 const scoped=needle?item:{...item,visibleEntryCount:null,countComplete:false,countApproximate:false};
 return result(match.matched?[scoped]:[],base.nextCursor,match.pending);
}
