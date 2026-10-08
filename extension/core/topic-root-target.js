const ref=value=>typeof value==='string'&&value.length>0&&value.length<=200;
// Links carry stable identity references only. The existing AppShell opens the
// Topic, then its existing reader resolves the Section against current owners.
export function topicRootURL(topicId,sectionId=null,base=globalThis.location.href){
 if(!ref(topicId)||sectionId!==null&&!ref(sectionId))throw Error('INVALID_TOPIC_TARGET');
 const url=new URL(base);url.search='';const target=new URLSearchParams({topic:topicId});if(sectionId!==null)target.set('section',sectionId);url.hash='paia-thought?'+target;return url.href;
}
export function topicRootTarget(value){
 try{
  const url=new URL(value);if(url.protocol!=='chrome-extension:'||url.pathname!=='/ui/archive.html'||url.search||!url.hash.startsWith('#paia-thought?'))return null;
  const target=new URLSearchParams(url.hash.slice('#paia-thought?'.length)),keys=[...target.keys()];
  if(keys.some(key=>!['topic','section'].includes(key))||new Set(keys).size!==keys.length||!ref(target.get('topic'))||target.has('section')&&!ref(target.get('section')))return null;
  const canonical=new URLSearchParams({topic:target.get('topic')});if(target.has('section'))canonical.set('section',target.get('section'));
  if(url.hash!=='#paia-thought?'+canonical.toString())return null;
  return {topicId:target.get('topic'),sectionId:target.get('section')};
 }catch{return null;}
}
export async function resolveTopicRootTarget(target,read){
 if(!target||!ref(target.topicId)||target.sectionId!==null&&!ref(target.sectionId))return false;
 let cursor=null;
 do{
  const page=await read({topicId:target.topicId,cursor,limit:target.sectionId?100:1});
  if(page?.cursorInvalid||page?.unavailable||page?.topic?.id!==target.topicId||!Array.isArray(page.items))return false;
  if(target.sectionId===null)return true;
  if(page.items.some(section=>section.id===target.sectionId&&section.topicId===target.topicId&&(!section.sourceUnavailable||section.titleProtected===true)))return true;
  if(!page.nextCursor)return false;if(page.nextCursor===cursor)return false;cursor=page.nextCursor;
 }while(cursor);
 return false;
}
