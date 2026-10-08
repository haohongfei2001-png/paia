import {setup,capture} from './thought-m1.mjs';
import {OrganizerStore} from '../../core/organizer/store.js';
import {TopicIdentityRetrieval} from '../../core/topic-retrieval.js';
export const op=()=>crypto.randomUUID();
export const rows=(s,name)=>s.repository.transaction(false,t=>t.all(name));
export const raw=(s,name,id)=>s.repository.transaction(false,t=>t.get(name,id));
export const topic=(s,name='Synthetic independent object')=>s.createTopic({name,operationId:op()});
export async function fixture(options={}){
 const f=await setup(OrganizerStore,options),permission={allowed:true,epoch:'synthetic-processing-1'};
 const serviceOptions={resolveProcessing:async(_t,request)=>({...permission,inputIds:[...request.inputIds],topicIds:[...request.topicIds]})};
 const scope=(await rows(f.s,'inputStates')).map(row=>({inputId:row.id,role:'primary',selectedFields:['body']}));
 return {...f,permission,serviceOptions,scope,retrieval:new TopicIdentityRetrieval(f.s,serviceOptions)};
}
export async function collect(retrieval,request){const items=[];let cursor=null,page,calls=0;do{page=await retrieval.page({...request,cursor});items.push(...page.items);cursor=page.nextCursor;calls++;}while(cursor);return {...page,items,calls};}
export async function append(s,id='topic-02-extra',text='Another independent synthetic contribution'){
 await s.capture(capture((await s.status()).epoch,id,text));return (await rows(s,'inputStates')).map(row=>({inputId:row.id,role:'primary',selectedFields:['body']}));
}
