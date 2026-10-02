import {validProvider} from '../read-projection-keys.js';
import {fail,prefix} from '../thought-model.js';

// Authority tokens contain only existing mutation/recovery metadata, never text.
// Existing portable-data generation includes filter intents, time and saved-AI
// eligibility. No new mutation or filtering policy is introduced.
export async function rootReadAuthority(t,{search=false}={}){
 const ids=['thought-sequence','thought-epoch','input-delta-sequence','revision-sequence','recovery-restore-epoch','backup-data-generation'];
 const values=[];for(const id of ids)values.push((await t.get('meta',id))?.value??null);
 const filter=await t.get('meta','smart-filter');values.push(['mode','phase','policyEpoch','decisionSequence','filterVersion','policyVersion','classifierVersion'].map(key=>filter?.[key]??null));
 // Partial index pages may be displayed but never certified complete after
 // an in-place rebuild advances behind an already issued cursor.
 if(search){const rebuild=await t.get('meta','library-search-rebuild'),pending=await t.count('libraryMigrationItems','byStatus',prefix([0,'search']));values.push(rebuild?.complete===true&&pending===0);}
 return JSON.stringify(values);
}
export const invalidRootRead=()=>({cursorInvalid:true,items:[],recent:[],nextCursor:null,complete:false});
export function validateRootRead(o){
 if(o.query!==undefined&&(typeof o.query!=='string'||o.query.length>300))fail();
 if(o.authority!==undefined&&o.authority!==null&&(typeof o.authority!=='string'||!o.authority.length||o.authority.length>500))fail();
 if(o.cursor?.authority!==undefined&&(typeof o.cursor.authority!=='string'||!o.cursor.authority.length||o.cursor.authority.length>500))fail();
 if(o.providerKey!==undefined&&o.providerKey!==null&&!validProvider(o.providerKey))fail();
}
// Root presentation never transports a canonical Topic summary/protection map.
export function compactTopic(row,cue=null){
 const out={};for(const key of ['id','name','revision','createdAt','updatedAt','organizationRevision','activeLayoutGeneration','countVersion','visibleEntryCount','countComplete','countApproximate','compatibilityUnavailable'])if(row[key]!==undefined)out[key]=row[key];
 out.rootCue=cue;
 out.readRef={kind:'topic',id:row.id,revision:row.revision,countVersion:row.countVersion||0,cueEntryId:cue?.entryId??null,cueRevision:cue?.revision??null};
 return out;
}
export function compactSearchResult(item){
 const out={};for(const key of ['kind','topicId','topicName','sectionId','sectionTitle','entryId','snippet','rank','aiField'])if(item[key]!==undefined)out[key]=item[key];
 if(item.paths)out.paths=item.paths.map(path=>Object.fromEntries(['topicId','topicName','sectionId','sectionTitle'].filter(k=>path[k]!==undefined).map(k=>[k,path[k]])));
 out.readRef={kind:item.kind,id:item.entryId||item.topicId,sectionId:item.sectionId??null,aiField:item.aiField??null};
 return out;
}
