import {IndexedArchiveStore} from '../indexed-store.js';
import {originalIAConstructor} from '../ia-store-owner.js';
import {planInitialFilter} from '../smart-filter-store-owner.js';
import {syncArchiveYearIndex} from '../archive-year-index.js';
import {trackNavigationWrite,flushNavigationWrites} from '../archive-navigation-invalidation.js';
import {trackSemanticWrite,flushSemanticWrites} from '../ai-usage/delta.js';
import {readGroupRows} from './group-page-reader.js';
import {measureSourceWorkingPhysicalTree,equalSourceWorkingPhysicalTree} from './source-working-physical.js';
import {registerRepositoryFinalReadFence} from '../idb-repository.js';
import {fail} from './value.js';
const deny=()=>fail('BNS_SOURCE_PURGE_GROUP_CHANGED'),copy=x=>x===undefined?undefined:structuredClone(x),sort=rows=>rows.sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
const snapshots=new WeakMap();
export async function sourcePurgeGroupSnapshot(core,t){
 const rows={},schema={};let refs=0,size=0;
 for(const name of core.repository.stores){rows[name]=await readGroupRows(t,name);refs+=rows[name].length;for(const row of rows[name])size+=measureSourceWorkingPhysicalTree(row).B;if(refs>4096||size>2*1024*1024)fail('BNS_GROUP_RESOURCE_LIMIT');const table=t.tx.objectStore(name);schema[name]=Object.fromEntries([...table.indexNames].map(key=>{const i=table.index(key);return [key,{path:copy(i.keyPath),multi:i.multiEntry}];}));}
 snapshots.set(rows,{core,repository:core.repository,database:core.repository.db,schema});return rows;
}
// Detached prediction only: original domain/index/semantic writers operate on
// private Maps. No native transaction, store mutation, or alternate data truth.
export async function planSourcePurgeGroupPhysical(store,core,before,groups,negative,protocol){
 const bound=snapshots.get(before);if(!bound||bound.core!==core||bound.repository!==store.repository||bound.database!==store.repository.db)deny();
 if(measureSourceWorkingPhysicalTree(before).B*4+measureSourceWorkingPhysicalTree({groups,negative,protocol}).B*8>2*1024*1024)fail('BNS_GROUP_RESOURCE_LIMIT');
 const maps=Object.fromEntries(Object.entries(before).map(([name,rows])=>[name,new Map(rows.map(row=>[row.id,copy(row)]))]));
 const cmp=(a,b)=>{if(Array.isArray(a)&&Array.isArray(b)){for(let i=0;i<Math.min(a.length,b.length);i++){const c=cmp(a[i],b[i]);if(c)return c;}return a.length-b.length;}return a===b?0:a<b?-1:1;};
 const matches=(key,range)=>range===undefined||range===null||range&&typeof range==='object'&&!Array.isArray(range)&&typeof range.includes==='function'?range===undefined||range===null||range.includes(key):cmp(key,range)===0;
 const query=(table,index,range)=>{const d=index?bound.schema[table]?.[index]:null;if(index&&!d)deny();const value=(row,path)=>Array.isArray(path)?path.map(k=>row[k]):row[path];const result=[];for(const row of maps[table].values()){const key=d?value(row,d.path):row.id;if(key===undefined)continue;for(const k of d?.multi?key:[key])if(matches(k,range))result.push({key:k,row});}return result.sort((a,b)=>cmp(a.key,b.key)||cmp(a.row.id,b.row.id));};
 const scratch={semanticEnabled:true,tx:{objectStoreNames:{contains:name=>Object.hasOwn(maps,name)}},get:async(table,id)=>copy(maps[table]?.get(id)),
  put:async(table,row)=>{if(!maps[table])deny();if(table==='blockIndex')await syncArchiveYearIndex(scratch,await scratch.get(table,row.id),row);await trackSemanticWrite(scratch,table,row.id,row);await trackNavigationWrite(scratch,table,row.id,row);maps[table].set(row.id,copy(row));},
  delete:async(table,id)=>{if(!maps[table])deny();if(table==='blockIndex')await syncArchiveYearIndex(scratch,await scratch.get(table,id),null);await trackSemanticWrite(scratch,table,id,null);await trackNavigationWrite(scratch,table,id,null);maps[table].delete(id);},
  rangePage:async(table,index,range,after,limit,direction='next')=>{let rows=query(table,index,range);if(direction==='prev')rows.reverse();if(after!==null)rows=rows.filter(x=>direction==='prev'?cmp(x.key,after)<0:cmp(x.key,after)>0);return {rows:rows.slice(0,limit).map(x=>({key:copy(x.key),value:copy(x.row)})),next:rows.length>limit?copy(rows[limit-1].key):null};},
  all:async(table,index,key)=>query(table,index,key).map(x=>copy(x.row)),count:async(table,index,key)=>query(table,index,key).length,
  edge:async(table,index,key,direction='next')=>{const rows=query(table,index,key);return copy((direction==='prev'?rows.at(-1):rows[0])?.row);},keys:async(table,index,key)=>query(table,index,key).map(x=>x.row.id)};
 const facade={changedSources:new Set(),control:async()=>copy(store.controlCache),saveRecord:IndexedArchiveStore.prototype.saveRecord,refreshDoc:IndexedArchiveStore.prototype.refreshDoc,initialFilter:planInitialFilter,applyInitialBaseline:(t,cap)=>originalIAConstructor().prototype.applyInitialBaseline.call(store,t,cap)};
 for(const group of groups)await IndexedArchiveStore.prototype.applyInitialSource.call(facade,scratch,group.capability);
 for(const n of negative){const v=n.intent,id='source:'+v.sourceKey;if(maps.tombstones.has(id))continue;await scratch.put('tombstones',{id,sequence:Date.parse(v.at),value:{sourceIdentityHash:v.sourceKey,deletedAt:v.at,status:'permanently_ignored'}});}
 for(const row of protocol)maps.meta.set(row.id,copy(row));
 const callback=Object.fromEntries(Object.entries(maps).map(([name,map])=>[name,sort([...map.values()].map(copy))]));
 await flushNavigationWrites(scratch);await flushSemanticWrites(scratch);
 if(groups.length||negative.length){const row=maps.meta.get('backup-data-generation');maps.meta.set('backup-data-generation',{id:'backup-data-generation',value:(row?.value||0)+1});}
 const terminal=Object.fromEntries(Object.entries(maps).map(([name,map])=>[name,sort([...map.values()].map(copy))]));
 if(measureSourceWorkingPhysicalTree({before,callback,terminal}).B>2*1024*1024)fail('BNS_GROUP_RESOURCE_LIMIT');return {callback,terminal};
}
export async function requireSourcePurgeGroupRows(core,t,expected){const actual=await sourcePurgeGroupSnapshot(core,t);if(!equalSourceWorkingPhysicalTree(actual,expected))deny();}
export function sealSourcePurgeGroupRows(store,core,t,before,terminal,current){
 const bound=snapshots.get(before);if(!bound||bound.core!==core||bound.repository!==store.repository)deny();
 registerRepositoryFinalReadFence(store.repository,t,{isCurrent:()=>{current();if(core.repository!==bound.repository||core.repository.db!==bound.database)deny();return true;},plan:function*(){for(const [table,rows]of Object.entries(terminal)){if((yield {method:'count',table})!==rows.length)deny();for(const row of rows)if(!equalSourceWorkingPhysicalTree(yield {method:'get',table,key:row.id},row))deny();}return true;}});
}
