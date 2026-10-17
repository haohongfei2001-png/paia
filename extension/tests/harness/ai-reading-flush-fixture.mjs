// Synthetic real UI/recovery/domain owner; no browser layout is simulated.
import {AIReadingEditor} from '../../ui/ai-presentation.js';
import {PresentationNode} from './presentation-dom.mjs';
import {OrganizerStore} from '../../core/organizer/store.js';
import {IDBFactory,IDBKeyRange} from '../vendor/fake-indexeddb/build/esm/index.js';
import {AI_FIELDS,AI_LIST_FIELDS,AI_SCHEMA_VERSION} from '../../core/organizer/ai-contract.js';
import {RecoveryDraftStore} from '../../core/recovery-draft.js';
globalThis.IDBKeyRange=IDBKeyRange;
class Node extends PresentationNode {get innerText(){return this.parentElement&&this.renderedText!==undefined?this.renderedText:this.textContent;} set innerText(v){this.textContent=v;}matches(){return false;}closest(){return null;}querySelectorAll(){return [];}}
const local=()=>{const data={};return {async get(k){return structuredClone(k===null?data:Array.isArray(k)?Object.fromEntries(k.map(x=>[x,data[x]])):{[k]:data[k]});},async set(x){Object.assign(data,structuredClone(x));},async remove(k){for(const x of Array.isArray(k)?k:[k])delete data[x];}};};
export async function fixture({revision=1,lists=false}={}){
 const storage=local(),s=new OrganizerStore(storage,{indexedDB:new IDBFactory()});await s.consent(true);const topic=await s.createTopic({name:'SYNTHETIC race topic',operationId:crypto.randomUUID()}),entry=await s.continueThinking({topicId:topic.id,body:'SYNTHETIC evidence',operationId:crypto.randomUUID()});
 const ids=[entry.id],row={id:'aiPresentation:'+topic.id,topicId:topic.id,schemaVersion:AI_SCHEMA_VERSION,revision,evidenceEntryIds:ids,protections:{},...Object.fromEntries(AI_FIELDS.map(key=>[key,AI_LIST_FIELDS.includes(key)?(lists?[{text:'SYNTHETIC 人工 '+key+'\n<literal> 👩‍💻 é',evidenceEntryIds:ids}]:[]):'SYNTHETIC '+key]))};await s.foundationWrite(t=>t.put('meta',row));
 const qualified=(await s.aiPresentationStatus({topicId:topic.id})).topics.find(x=>x.topicId===topic.id||x.id===topic.id).presentation;
 qualified.recoveryEpoch=await s.recoveryDraftEpoch(); const recovery=new RecoveryDraftStore(storage),saves=[],edits=[],statuses=[];let onSave=async()=>{},onEdit=async()=>{};
 globalThis.document={documentElement:{lang:'zh-CN'},createElement:tag=>new Node(tag),addEventListener(){},getSelection:()=>null};
 globalThis.chrome={runtime:{sendMessage:async message=>{try{switch(message.type){case 'GET_LIBRARY_ENTRY':return {ok:true,data:await s.entry(message.id)};case 'PAIA_RECOVERY_DRAFT_LOAD':return {ok:true,data:await recovery.load(message.draft.kind,message.draft.ownerId)};case 'PAIA_RECOVERY_DRAFT_SAVE':{saves.push(message);await onSave(message,saves.length);return {ok:true,data:await recovery.save(message.draft)};}case 'PAIA_RECOVERY_DRAFT_CLEAR':return {ok:true,data:await recovery.clear(message.draft.kind,message.draft.ownerId,message.draft.token)};case 'EDIT_AI_PRESENTATION':{const call={edit:structuredClone(message.edit)};edits.push(call);const index=edits.length;const result=await s.editAIPresentation(message.edit);call.result=structuredClone(result);await onEdit(call,index);return {ok:true,data:result};}default:throw Error(message.type);}}catch(e){return {ok:false,error:e.code||'UNAVAILABLE'};}}}};
 const editor=new AIReadingEditor(new Node(),qualified,()=>{},(...s)=>statuses.push(s),{fieldsOnly:true});await Promise.all([editor.ready,editor.recoveryReady]);
 return {s,editor,qualified,entry,saves,edits,statuses,topic,setSave:f=>onSave=f,setEdit:f=>onEdit=f,read:()=>s.repository.transaction(false,t=>t.get('meta',row.id),['meta']),close:async()=>{editor.dispose();await s.repository.close();}};
}
