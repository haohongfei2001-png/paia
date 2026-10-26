import {CONSENT_VERSION,STORAGE_KEY,ArchiveError} from '../constants.js';
import {prefix} from '../thought-model.js';
import {advanceThoughtTopicIndex,THOUGHT_TOPIC_INDEX_VERSION,liveTopicKey} from '../thought-read-index.js';
import {descriptorReader} from './topic-reading.js';
import {rootReadAuthority} from './root-read.js';

// An ephemeral complete-set identity snapshot, not another persistent writer.
// Derivation delegates solely to the existing bounded Topic projection builder.
const states=new WeakMap(),pending=new WeakMap();
const visible=row=>row&&['active','dormant'].includes(row.lifecycle)&&!row.redirectTo;
export const topicActivitySnapshot=(store,authority)=>{const state=states.get(store);return state?.authority===authority&&state.complete?state:null;};
export function prepareTopicRootActivity(store){
 if(pending.has(store))return pending.get(store);
 const work=prepare(store).finally(()=>{if(pending.get(store)===work)pending.delete(store);});pending.set(store,work);return work;
}
async function prepare(store){
 if(!store.loaded||!store.foundationLoaded||!store.bindingsLoaded||!store.documentsLoaded||!store.repository?.db)return;
 const consent=(await store.local.get(STORAGE_KEY))?.[STORAGE_KEY];if(consent?.settings?.consentVersion!==CONSENT_VERSION)throw new ArchiveError('CONSENT_REQUIRED');
 const authority=await store.repository.transaction(false,t=>rootReadAuthority(t));
 let state=states.get(store);if(!state||state.authority!==authority){state={authority,after:null,items:[],complete:false};states.set(store,state);}if(state.complete)return;
 const page=await store.repository.transaction(false,t=>t.page('topics',{after:state.after??undefined,limit:40}));
 let builds=0;
 for(const {key,value:topic}of page.rows){
  if(visible(topic)){
   let data=await store.repository.transaction(false,async t=>({meta:await t.get('meta','thought-read-index:v1:topic:'+topic.id),epoch:(await t.get('meta','thought-epoch'))?.value||0,placement:await t.edge('placements','byTopicOrder',prefix([topic.id,topic.activeLayoutGeneration,0]))}));
   let activityAt=null;
   if(data.placement){
    const current=()=>data.meta?.version===THOUGHT_TOPIC_INDEX_VERSION&&data.meta.activityAuthority===authority&&data.meta.activeKey===liveTopicKey(topic,data.epoch,data.meta.timeRevision||0)&&!data.meta.buildingGeneration;
    if(!current()){
     if(builds===4)return;builds++;
     await advanceThoughtTopicIndex(store,{topicId:topic.id,describe:descriptorReader(store)});
     data=await store.repository.transaction(false,async t=>({...data,meta:await t.get('meta','thought-read-index:v1:topic:'+topic.id)}));
     if(!current())return;
    }
    activityAt=data.meta.activityAt||null;
   }
   state.items.push({id:topic.id,activityAt});
  }
  state.after=key;
 }
 if(!page.next){state.items.sort((a,b)=>a.activityAt===b.activityAt?(a.id<b.id?-1:a.id>b.id?1:0):a.activityAt===null?1:b.activityAt===null?-1:a.activityAt>b.activityAt?-1:1);state.complete=true;}
 // An intervening canonical change discards the partial snapshot, never serves
 // a subset as the complete ranking. A later request makes bounded progress.
 const current=await store.repository.transaction(false,t=>rootReadAuthority(t));if(current!==authority)states.delete(store);
}
