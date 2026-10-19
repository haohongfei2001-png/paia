import {archiveYearPrefix,archiveYearKey,archiveYearMeta,archiveYearAuthority} from '../archive-year-index.js';
// Original Reader metadata only. This enumerates at most the original 100-row
// annual scan or exact normal page. It never acquires Source or Working text,
// alters a caller cursor, or claims that a speculative row is visible.
const nonnegative=x=>Number.isSafeInteger(x)&&x>=0;
const id=x=>typeof x==='string'&&x.length>0&&x.length<=200;
const prefix=p=>IDBKeyRange.bound(p,[...p,[]],false,true);
async function contextCursor(t,ix,annual,phase,descending){
 const base=archiveYearPrefix(ix.documentId)+(phase==='undated'?'1:':'0:'),key=archiveYearKey(ix),target=annual?t.tx.objectStore('meta'):t.tx.objectStore('blockIndex').index('byList');
 const range=annual?(descending?IDBKeyRange.bound(key,base+'\uffff',true,true):IDBKeyRange.bound(base,key,false,true)):(descending?IDBKeyRange.bound(ix.listKey,[ix.documentId,0,[]],true,true):IDBKeyRange.bound([ix.documentId,0],ix.listKey,false,true));
 return new Promise((resolve,reject)=>{const r=target.openCursor(range,descending?'next':'prev');let n=0;r.onerror=()=>reject(r.error);r.onsuccess=()=>{const c=r.result;if(!c)return resolve(null);if(++n===3)return resolve(annual?[c.key]:c.key);c.continue();};});
}
export async function filterVisibilityPageInputIds(t,options,ready=true){
 if((options.view??'library')!=='library'||!id(options.documentId))return [];
 // An invalid/stale original request cannot prewarm private processing before
 // the original Reader reports its own error. No cursor or baseline is fixed up.
 if(options.readingSnapshot!==undefined&&options.readingSnapshot!==null&&(!['light','off'].includes(options.readingSnapshot.mode)||!nonnegative(options.readingSnapshot.sequence))||options.readingSnapshot?.mode==='off')return [];
 if(options.expectedGeneration!==undefined&&options.expectedGeneration!==null&&(!nonnegative(options.expectedGeneration)||options.expectedGeneration!==((await t.get('meta','backup-data-generation'))?.value||0)))return [];
 if(options.yearReading){const y=options.yearReading;if(typeof y!=='object'||Array.isArray(y)||Object.keys(y).some(k=>!['year','phase','generation','probe'].includes(k)))return [];const {year=null,phase=year==='undated'?'undated':'dated',generation:expected=null,probe=false}=y;
  if(typeof probe!=='boolean'||year!==null&&year!=='undated'&&(!Number.isInteger(year)||year<0||year>10000)||!['dated','undated'].includes(phase)||year==='undated'&&phase!=='undated'||Number.isInteger(year)&&phase!=='dated'||expected!==null&&!(nonnegative(expected))&&!(typeof expected==='string'&&expected.length<=100&&/^[a-zA-Z0-9_.:-]+$/.test(expected)))return [];
  if(expected!==null&&expected!==archiveYearAuthority(await t.get('meta',archiveYearMeta(options.documentId))))return [];
 }
 const limit=options.limit??50;if(!Number.isInteger(limit)||limit<1||limit>100||options.sort!==undefined&&options.sort!==null&&!['asc','desc'].includes(options.sort))return [];
 const annual=!!options.yearReading;if(annual&&!ready)return [];const controls=await t.get('meta','organizer-controls'),sort=options.sort||controls?.inputReadingSort||(annual?'desc':'asc');
 let phase=options.yearReading?.phase??(options.yearReading?.year==='undated'?'undated':'dated'),cursor=options.cursor??null;const ids=new Set();
 if(annual&&!['dated','undated'].includes(phase))return [];
 const collect=async(after,selectedPhase=phase)=>{
  if(annual){const base=archiveYearPrefix(options.documentId)+(selectedPhase==='undated'?'1:':'0:'),range=IDBKeyRange.bound(base,base+'\uffff',false,true);if(after!==null&&(!Array.isArray(after)||after.length!==1||!range.includes(after[0])))return;
   const page=await t.rangePage('meta',null,range,after?.[0]??null,100,selectedPhase==='undated'?'next':sort==='desc'?'prev':'next');for(const row of page.rows){const ix=await t.get('blockIndex',row.value.inputId);if(ix&&!ix.excluded&&ix.documentId===options.documentId&&archiveYearKey(ix)===row.key)ids.add(ix.id);}
  }else{const page=await t.rangePage('blockIndex','byList',prefix([options.documentId,0]),after,limit,sort==='desc'?'prev':'next');for(const {value:ix}of page.rows)if(!ix.excluded&&ix.documentId===options.documentId)ids.add(ix.id);}
 };
 if(options.contextInputId&&id(options.contextInputId)){
  const ix=await t.get('blockIndex',options.contextInputId);if(ix&&!ix.excluded&&ix.documentId===options.documentId){ids.add(ix.id);if(cursor===null){let selectedPhase=phase;if(annual){const source=archiveYearKey(ix);selectedPhase=source?.startsWith(archiveYearPrefix(ix.documentId)+'1:')?'undated':'dated';}const descending=annual&&selectedPhase==='undated'?false:sort==='desc',position=await contextCursor(t,ix,annual,selectedPhase,descending);await collect(position,selectedPhase);}}
 }
 // Context qualification may legitimately reject the anchor and use the
 // original beginning. Both bounded alternatives stay metadata-only; the
 // original content owner independently decides and checks its own cursor.
 await collect(cursor);return [...ids];
}
