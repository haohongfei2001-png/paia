// The production shell and history coordinator share this route projection.
// Page modules may keep transient data, but the visible container and primary
// navigation are presented from this one route.
const collectionViews=new Set(['library','archive','excluded']);

export function appShellRoute(current,navigator=null){
 const selected=['library','archive'].includes(current.view)?current.sourcePath||null:null;
 return {
  view:current.view,
  documentId:current.documentId||null,
  topicId:current.topicId||null,
  contextInputId:current.contextInputId||null,
  returnTo:current.returnTo||null,
  sourceKey:selected?.providerKey||null,
  projectRef:selected?.groupKind==='project'?selected.projectRef||null:null,
  searchQuery:typeof current.searchQuery==='string'?current.searchQuery.slice(0,1000):'',
  sort:current.sort==='asc'||current.sort==='desc'?current.sort:null,
  anchor:current.anchor||null,
  navigator
 };
}

export function presentAppShell(root,route,{consented=false}={}){
 const get=id=>root.getElementById(id),view=route.view,documentId=route.documentId;
 for(const button of root.querySelectorAll('[data-view]')){
  button.disabled=!consented;
  button.setAttribute('aria-current',button.dataset.view===(view==='revisit'?'library':view)?'page':'false');
 }
 const visible={
  'collection-panel':consented&&!documentId&&collectionViews.has(view),
  'document-panel':consented&&!!documentId,
  'thought-panel':consented&&view==='thoughts',
  'settings-panel':consented&&view==='settings',
  'legacy-panel':consented&&view==='legacy',
  'memory-panel':consented&&view==='memory',
  'revisit-panel':view==='revisit'
 };
 for(const [id,shown] of Object.entries(visible)){const panel=get(id);if(panel)panel.hidden=!shown;}
}
