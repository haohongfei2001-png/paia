// The production shell and history coordinator share this route projection.
// Page modules may keep transient data, but the visible container and primary
// navigation are presented from this one route.
const collectionViews=new Set(['library','archive','excluded']);

export function appShellRoute(current,navigator=null){
 const selected=['library','archive'].includes(current.view)?current.sourcePath||null:null;
 return {
  view:current.view,
  ...(current.originKey?{originKey:current.originKey}:{}),
  documentId:current.documentId||null,
  topicId:current.topicId||null,
  ...(current.contextCard?{contextCard:current.contextCard}:{}),
  contextInputId:current.contextInputId||null,
  returnTo:current.returnTo||null,
  sourceKey:current.sourceScope||selected?.providerKey||null,
  projectRef:selected?.groupKind==='project'?selected.projectRef||null:null,
  searchQuery:typeof current.searchQuery==='string'?current.searchQuery.slice(0,1000):'',
  sort:current.sort==='asc'||current.sort==='desc'?current.sort:null,
  anchor:current.anchor||null,
  navigator
 };
}

export function presentAppShell(root,route,{consented=false,writing=false}={}){
 const get=id=>root.getElementById(id),view=route.view,documentId=route.documentId;
 for(const button of root.querySelectorAll('[data-view]')){
  button.disabled=!consented;
  button.setAttribute('aria-current',button.dataset.view===(view==='revisit'?'library':view)?'page':'false');
 }
 const visible={
  'collection-panel':consented&&!documentId&&collectionViews.has(view),
  'document-panel':consented&&!!documentId,
  'thought-panel':consented&&view==='thoughts',
  'thought-root-header':consented&&view==='thoughts'&&!route.topicId,
  'thought-root-source':consented&&view==='thoughts'&&!route.topicId,
  'thought-topic-header':consented&&view==='thoughts'&&!!route.topicId,
  'settings-panel':consented&&view==='settings',
  'legacy-panel':consented&&view==='legacy',
  'memory-panel':consented&&view==='memory',
  'revisit-panel':view==='revisit'
 };
 const navigatorHost=get('archive-reader-navigator-slot');if(navigatorHost)navigatorHost.hidden=writing;
 const workspace=get('thought-writing-workspace');if(workspace)workspace.hidden=!consented||!writing;const header=root.querySelector?.('.workspace-header');if(header)header.hidden=consented&&writing;
 for(const [id,shown] of Object.entries(visible)){const panel=get(id);if(panel)panel.hidden=writing||!shown;}
}
