import {syncArchiveYearIndex} from '../archive-year-index.js';
import {clearReadingTargets,clearPurgedReaderPolicy} from '../reader-state.js';
import {purgeSourceStructureForRecords} from '../source-structure-store.js';
import {trackNavigationWrite,flushNavigationWrites} from '../archive-navigation-invalidation.js';
import {trackSemanticWrite,flushSemanticWrites} from '../ai-usage/delta.js';
import {fail} from './value.js';
const denied=()=>fail('BNS_SOURCE_PURGE_UNSUPPORTED'),copy=x=>x===undefined?undefined:structuredClone(x);
const sorted=rows=>rows.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
// Pure planning over the already verified physical cut. These methods own only
// detached Maps, never a repository/transaction/native write capability. Every
// changed metadata row comes from an existing named owner, not a post-write cut.
export async function planSourcePurgeMetadata(p,retained){
 const maps=Object.fromEntries(Object.entries(p.portfolio).map(([name,rows])=>[name,new Map(rows.map(row=>[row.id,copy(row)]))]));
 const names={contains:name=>Object.hasOwn(maps,name)},scratch={semanticEnabled:true,tx:{objectStoreNames:names},
  get:async(table,id)=>copy(maps[table]?.get(id)),
  put:async(table,row)=>{if(!maps[table])denied();if(table==='blockIndex')await syncArchiveYearIndex(scratch,await scratch.get(table,row.id),row);await trackSemanticWrite(scratch,table,row.id,row);await trackNavigationWrite(scratch,table,row.id,row);maps[table].set(row.id,copy(row));},
  delete:async(table,id)=>{if(!maps[table])denied();if(table==='blockIndex')await syncArchiveYearIndex(scratch,await scratch.get(table,id),null);await trackSemanticWrite(scratch,table,id,null);await trackNavigationWrite(scratch,table,id,null);maps[table].delete(id);},
  all:async(table,index,key)=>{if(table!=='recordIndex'||index!=='byChat')denied();return [...maps[table].values()].filter(row=>row.chatKey===key).map(copy);},
  count:async(table,index,key)=>{if(table!=='blockIndex'||!['byDocument','byList'].includes(index))denied();return [...maps.blockIndex.values()].filter(row=>index==='byDocument'?row.documentId===key:key.includes(row.listKey)).length;},
  rangePage:async(table,index,range,after,limit)=>{let rows;if(table==='meta'&&index===null){rows=sorted([...maps.meta.values()]).filter(row=>range.includes(row.id)&&(!after||row.id>after)).map(row=>({key:row.id,value:copy(row)}));}else if(table==='organizerJobs'&&index==='byMaintenance'){if([...maps.organizerJobs.values()].some(row=>row.kind!=='purge_cleanup'))denied();rows=[];}else denied();return {rows:rows.slice(0,limit),next:rows.length>limit?rows[limit-1].key:null};}
 };
 // Original domain mutation order: structure and reading owners precede the
 // independent Source/document deletion and its original index hooks.
 const source=p.portfolio.records.find(row=>row.id===p.intent.sourceId)?.value;if(!source)denied();await purgeSourceStructureForRecords(p.store,scratch,[source]);await clearReadingTargets(scratch,new Set([p.intent.inputId]));
 await scratch.delete('meta','memory:input:'+JSON.stringify([p.intent.inputId]));
 for(const [table,id]of [['records',p.intent.sourceId],['recordIndex',p.intent.sourceId],['blocks',p.intent.inputId],['blockIndex',p.intent.inputId],['documents',p.intent.documentId],['libraryDocuments',p.intent.documentId]])await scratch.delete(table,id);
 for(const [table,id,row]of p.cleanupPoints.values())await scratch.put(table,row);
 for(const [table,rows]of Object.entries(retained))maps[table]=new Map(rows.map(row=>[row.id,copy(row)]));await clearPurgedReaderPolicy(scratch,new Set([p.intent.inputId]),p.intent.sourceKey);
 for(const id of [...maps.meta.keys()])if(id.startsWith('bns:v1:'))maps.meta.delete(id);for(const row of p.expected.values())maps.meta.set(row.id,copy(row));
 const callback=sorted([...maps.meta.values()].map(copy));
 await flushNavigationWrites(scratch);await flushSemanticWrites(scratch);const old=maps.meta.get('backup-data-generation');maps.meta.set('backup-data-generation',{id:'backup-data-generation',value:(old?.value||0)+1});
 return {callback,terminal:sorted([...maps.meta.values()].map(copy))};
}
