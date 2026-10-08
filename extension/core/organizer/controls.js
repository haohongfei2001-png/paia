import {reject} from './contracts.js';

export const DEFAULT_CONTROLS=Object.freeze({readingSort:'asc',inputReadingSort:'asc',libraryView:'original'});
const retired=new Set(['dailyRequests','batchMode','aiOnboardingSeen']);

export async function organizerControls(s){
 await s.finishFoundation();
 return s.run(()=>s.repository.transaction(false,async t=>{
  const saved=await t.get('meta','organizer-controls');
  return {...DEFAULT_CONTROLS,...Object.fromEntries(Object.keys(DEFAULT_CONTROLS).filter(key=>saved?.[key]!==undefined).map(key=>[key,saved[key]]))};
 },['meta']));
}

export async function setOrganizerControls(s,changes){
 if(!changes||typeof changes!=='object'||Array.isArray(changes))reject('INVALID_OUTPUT');
 if(Object.keys(changes).some(key=>retired.has(key)))reject('AI_SERVICE_UNAVAILABLE');
 if(Object.keys(changes).some(key=>!Object.hasOwn(DEFAULT_CONTROLS,key)))reject('INVALID_OUTPUT');
 if(changes.inputReadingSort!==undefined&&!['asc','desc'].includes(changes.inputReadingSort))reject('INVALID_OUTPUT');
 if(changes.readingSort!==undefined&&!['asc','desc'].includes(changes.readingSort)||changes.libraryView!==undefined&&!['original','ai'].includes(changes.libraryView))reject('INVALID_OUTPUT');
 await s.foundationWrite(async t=>{
  const prior=await t.get('meta','organizer-controls');
  // Keep legacy values verbatim for data compatibility; they are not public
  // controls, and reading preferences cannot rewrite or delete them.
  await t.put('meta',{...DEFAULT_CONTROLS,...prior,...changes,id:'organizer-controls'});
 });
 return organizerControls(s);
}
