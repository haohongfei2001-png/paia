import {presentAppShell} from './app-shell-state.js';
import {installReaderNavigation} from './reader-navigation.js';
import {installSettingsPreferences,presentSettingsPreferences} from './settings-preferences.js';
import {installUniversalSearch} from './universal-search.js';
import {installRevisit} from './revisit.js';

const NAV_LABELS={library:['档案','Archive'],thoughts:['思想库','Thought Library'],memory:['用于 AI','For AI'],settings:['设置','Settings']};
const NAV_PATHS={
 library:'M4.5 5.5h15v13h-15zM8 9h8M8 13h6',
 thoughts:'M6 5.5h12v9H11l-4 3v-3H6zM9 9h6M9 12h4',
 memory:'M12 4.5l1.25 3.25L16.5 9l-3.25 1.25L12 13.5l-1.25-3.25L7.5 9l3.25-1.25zM18 14l.75 1.75L20.5 16.5l-1.75.75L18 19l-.75-1.75-1.75-.75 1.75-.75z',
 settings:'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM12 4v2M12 18v2M4 12h2M18 12h2M6.35 6.35l1.4 1.4M16.25 16.25l1.4 1.4M17.65 6.35l-1.4 1.4M7.75 16.25l-1.4 1.4'
};
const labels=()=>document.documentElement.lang==='en'?1:0;
function navIcon(path){
 const ns='http:'+'//www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg'),shape=document.createElementNS(ns,'path');
 svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.classList.add('ux-nav-icon');
 for(const [key,value]of Object.entries({d:path,fill:'none',stroke:'currentColor','stroke-width':'1.7','stroke-linecap':'round','stroke-linejoin':'round'}))shape.setAttribute(key,value);
 svg.append(shape);return svg;
}

// One explicit composition boundary. RouteSession remains the only history and
// navigation owner. Topic/Context use their existing page controllers until
// their approved slices replace them; neither installs another shell/router.
export class AppShellController {
 constructor(){this.route={view:'library'};this.settingsReturn={view:'library'};this.mounted=false;}
 connect(options){
  if(this.routes)throw Error('APP_SHELL_ALREADY_CONNECTED');
  this.navigate=options.navigate;
  this.routes=installReaderNavigation({...options,present:(route,settings)=>this.present(route,settings)});
  return this.routes;
 }
 mount(){
  if(this.mounted)return;this.mounted=true;
  const main=document.querySelector('.workspace');main.id='paia-main';main.tabIndex=-1;
  const skip=document.createElement('a');skip.id='ux-skip-main';skip.className='ux-skip-main';skip.href='#paia-main';document.body.prepend(skip);
  const local=document.createElement('span');local.id='ux-local-state';local.className='ux-local-state';document.querySelector('.sidebar-bottom').append(local);
  for(const [view,path]of Object.entries(NAV_PATHS)){
   const button=document.querySelector(`.sidebar [data-view="${view}"]`),label=document.createElement('span');label.className='ux-nav-label';button.replaceChildren(navIcon(path),label);
  }
  // Fixed controls keep their existing listeners and domain owners.
  document.querySelector('.workspace-header').insertBefore(document.getElementById('scope-search-host'),document.getElementById('save-status'));
  document.querySelector('.workspace-header').insertBefore(document.getElementById('archive-navigator-toggle'),document.getElementById('scope-search-host'));
  document.querySelector('.workspace-header').insertBefore(document.getElementById('input-time-order'),document.getElementById('document-menu'));
  document.getElementById('thought-root-header').append(document.getElementById('thought-home-tools'));
  document.getElementById('thought-root-source').append(document.getElementById('thought-source-scope-label'),...document.querySelectorAll('#thought-home-tools > .library-actions,#thought-home-tools > button'));
  document.getElementById('thought-topic-header').append(document.getElementById('topic-search'));
  this.installArchivePresentation();
  installUniversalSearch();installRevisit();
  installSettingsPreferences({back:()=>this.navigate(this.settingsReturn.view,this.settingsReturn.documentId||null,null,{topicId:this.settingsReturn.topicId,returnTo:this.settingsReturn.returnTo,searchQuery:this.settingsReturn.searchQuery,anchor:this.settingsReturn.anchor})});
  const optional=document.createElement('small');optional.className='ux-consent-optional';document.getElementById('consent-check').closest('.consent-checkbox').append(optional);
  document.addEventListener('paia:preferences-applied',()=>this.localize());
  this.localize();
 }
 installArchivePresentation(){
  const get=id=>document.getElementById(id),header=document.querySelector('.workspace-header');
  this.archiveHeaderOrder=[...header.children];
  this.archiveControlHomes=new Map(['scope-search-host','back','archive-navigator-toggle','input-time-order','document-menu','save-status'].map(id=>[id,header]));
  this.archiveNavHomes=[...document.querySelectorAll('.sidebar [data-view]')].map(node=>({node,parent:node.parentElement,next:node.nextSibling}));
  const menu=document.createElement('details');menu.id='archive-compact-navigation';menu.hidden=true;const label=document.createElement('summary');label.id='archive-compact-nav-label';const items=document.createElement('div');items.id='archive-compact-nav-items';const actions=document.createElement('div');actions.id='archive-compact-reader-actions';actions.hidden=true;items.append(actions);menu.append(label,items);menu.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.open){event.preventDefault();event.stopPropagation();menu.open=false;label.focus({preventScroll:true});}});document.querySelector('.sidebar').append(menu);this.archiveCompactMenu=menu;
  this.archiveDesktop=matchMedia('(min-width:1024px)');this.archiveCompact=matchMedia('(max-width:767px)');
  const image=document.querySelector('.brand img');image.src='assets/paia-logo-64.png';
 }
 presentArchiveComposition(options=this.archivePresentationOptions){
  if(!this.mounted||!this.archiveControlHomes)return;this.archivePresentationOptions=options;
  const get=id=>document.getElementById(id),route=this.route,active=!!options?.consented&&['library','archive'].includes(route.view),reader=active&&!!route.documentId,root=active&&!reader,desktop=this.archiveDesktop.matches,compact=!!options?.consented&&['library','archive','thoughts','memory','settings'].includes(route.view)&&this.archiveCompact.matches;
  const focusBefore=document.activeElement,focusedReaderAction=['back','archive-navigator-toggle','input-time-order','document-menu'].some(id=>get(id)?.contains(focusBefore))?focusBefore:null;
  const move=(node,host,before=undefined)=>{if(!node||!host)return;const anchor=before?.parentElement===host?before:null;if(node.parentElement===host&&(before===undefined||node.nextSibling===anchor))return;const focus=document.activeElement,retains=focus&&node.contains(focus);host.insertBefore(node,anchor);if(retains&&focus.isConnected)focus.focus({preventScroll:true});};
  for(const [id,home]of this.archiveControlHomes){
   let host=home;
   if(root&&id==='scope-search-host')host=get('archive-root-header-actions');
   if(reader){
    if(id==='scope-search-host')host=get(desktop?'archive-reader-search-slot':'reader-search-slot');
    else if(id==='back')host=get('archive-reader-back-slot');
    else if(id==='archive-navigator-toggle')host=get(compact?'archive-compact-reader-actions':desktop?'reader-compact-tools':'archive-reader-back-slot');
    else if(['input-time-order','document-menu'].includes(id))host=get(compact?'archive-compact-reader-actions':'reader-heading-actions');
    else if(id==='save-status')host=get('reader-status-slot');
   }
   const node=get(id),next=host===home?this.archiveHeaderOrder?.slice(this.archiveHeaderOrder.indexOf(node)+1).find(item=>item.parentElement===home)||null:undefined;move(node,host,next);
  }
  move(get('archive-root-overflow'),get(root?'archive-root-header-actions':'archive-root-tools'));
  move(get('archive-source-scope-label'),root?get('archive-root-overflow').querySelector('.archive-root-overflow-actions'):get('archive-root-tools'));
  for(const {node,parent,next}of this.archiveNavHomes)move(node,compact?get('archive-compact-nav-items'):parent,compact?undefined:next||null);
  move(get('archive-compact-reader-actions'),get('archive-compact-nav-items'),null);get('archive-compact-reader-actions').hidden=!(reader&&compact);
  this.archiveCompactMenu.hidden=!compact;
  if(!compact||this.archivePresentedView!==route.view)this.archiveCompactMenu.open=false;
  const restoreFocus=()=>{if(!reader||this.route!==route||!focusedReaderAction?.isConnected||![focusBefore,document.body,document.documentElement,null].includes(document.activeElement))return;if(compact&&get('archive-compact-reader-actions').contains(focusedReaderAction))this.archiveCompactMenu.open=true;const target=focusedReaderAction.getClientRects().length?focusedReaderAction:get('back');if(target?.getClientRects().length)target.focus({preventScroll:true});};
  restoreFocus();
  this.archivePresentedView=route.view;
  return restoreFocus;
 }
 viewLabel(view){return NAV_LABELS[view]?.[labels()]||null;}
 localize(){
  if(!this.mounted)return;
  for(const [view,pair]of Object.entries(NAV_LABELS)){
   const button=document.querySelector(`.sidebar [data-view="${view}"]`),text=pair[labels()];button.querySelector('.ux-nav-label').textContent=text;button.setAttribute('aria-label',text);button.title=text;
  }
  document.getElementById('ux-skip-main').textContent=labels()?'Skip to main content':'跳到主要内容';
  document.getElementById('primary-nav').setAttribute('aria-label',labels()?'Primary navigation':'主要导航');
  const title=document.getElementById('view-title'),text=this.viewLabel(this.route.view);if(text&&!title.hidden)title.textContent=text;
  document.querySelector('.ux-consent-optional').textContent=labels()?' Optional: mark that you read the detailed explanation.':' 可选：用于标记你已阅读上面的完整说明。';
  document.getElementById('thought-root-description').textContent=labels()?'Return to your own expressions, by topic.':'按主题回到自己的表达。';
  document.getElementById('archive-root-description').textContent=labels()?'Return to the places you once expressed yourself.':'回到你曾经表达过的地方。';
  document.getElementById('archive-compact-nav-label').textContent=this.viewLabel(this.route.view)||this.viewLabel('library');
  presentSettingsPreferences({visible:this.route.view==='settings'});
 }
 present(route,options){
  if(route.view==='settings'&&this.route.view!=='settings')this.settingsReturn=this.route;
  this.route=route;presentAppShell(document,route,options);
  const archiveRoot=['library','archive'].includes(route.view)&&!route.documentId,heading=document.getElementById('workspace-heading'),header=document.querySelector('.workspace-header'),thoughtRoot=route.view==='thoughts'&&!route.topicId,headingHost=archiveRoot?document.getElementById('archive-root-heading'):thoughtRoot?document.getElementById('thought-root-heading'):header;
  if(heading.parentElement!==headingHost)headingHost.prepend(heading);
  document.getElementById('input-time-order').hidden=route.view!=='library'||!route.documentId;
  const reader=!!route.documentId||route.view==='thoughts'&&!!route.topicId;
  document.body.classList.toggle('ux-reader-active',reader);
  document.body.classList.toggle('uir-settings-active',route.view==='settings');
  document.body.dataset.paiaSpace=route.view;
  document.body.dataset.paiaSurface=reader?'reader':'root';
  this.presentArchiveComposition(options);
  this.localize();
 }
}
