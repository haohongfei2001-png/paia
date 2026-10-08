import {presentAppShell} from './app-shell-state.js';
import {mountIcon,setIconLabel} from './icons.js';
import {installReaderNavigation} from './reader-navigation.js';
import {installSettingsPreferences,presentSettingsPreferences,captureSettingsView,restoreSettingsView} from './settings-preferences.js';
import {installUniversalSearch} from './universal-search.js';
import {installRevisit} from './revisit.js';

const NAV_LABELS={library:['档案','Archive'],thoughts:['思想库','Thought Library'],memory:['用于 AI','For AI'],settings:['设置','Settings']};
const NAV_ICONS={library:'archive',thoughts:'thoughts',memory:'context',settings:'settings'};
const labels=()=>document.documentElement.lang==='en'?1:0;

// One explicit composition boundary. RouteSession remains the only history and
// navigation owner. Topic/Context use their existing page controllers until
// their approved slices replace them; neither installs another shell/router.
export class AppShellController {
 constructor(){this.route={view:'library'};this.settingsReturn={view:'library'};this.mounted=false;}
 connect(options){
  if(this.routes)throw Error('APP_SHELL_ALREADY_CONNECTED');
  this.navigate=options.navigate;
  this.routes=installReaderNavigation({...options,captureSettings:()=>this.captureSettingsRoute(),restoreSettings:route=>this.restoreSettingsRoute(route),present:(route,settings)=>this.present(route,settings)});
  return this.routes;
 }
 rememberSettingsOrigin(route){this.settingsReturn=route;this.settingsReturnPrepared=true;}
 captureSettingsRoute(){return {...captureSettingsView(),settingsReturn:this.settingsReturn};}
 restoreSettingsRoute(route){if(route.settingsReturn)this.settingsReturn=route.settingsReturn;restoreSettingsView(route);}
 mount(){
  if(this.mounted)return;this.mounted=true;
  const main=document.querySelector('.workspace');main.id='paia-main';main.tabIndex=-1;
  const skip=document.createElement('a');skip.id='ux-skip-main';skip.className='ux-skip-main';skip.href='#paia-main';document.body.prepend(skip);
  const local=document.createElement('span');local.id='ux-local-state';local.className='ux-local-state';document.querySelector('.sidebar-bottom').append(local);
  for(const [view,name]of Object.entries(NAV_ICONS)){
   const button=document.querySelector(`.sidebar [data-view="${view}"]`);setIconLabel(button,name,'',{labelClass:'ux-nav-label',iconClass:'ux-nav-icon'});
  }
  mountIcon(document.querySelector('.document-menu-glyph'),'more');
  // Fixed controls keep their existing listeners and domain owners.
  document.querySelector('.workspace-header').insertBefore(document.getElementById('scope-search-host'),document.getElementById('save-status'));
  document.querySelector('.workspace-header').insertBefore(document.getElementById('archive-navigator-toggle'),document.getElementById('scope-search-host'));
  document.querySelector('.workspace-header').insertBefore(document.getElementById('input-time-order'),document.getElementById('document-menu'));
  document.getElementById('thought-root-header').append(document.getElementById('thought-home-tools'));
  document.getElementById('thought-root-source').append(document.getElementById('thought-source-scope-label'),...document.querySelectorAll('#thought-home-tools > .library-actions,#thought-home-tools > button'));
  document.getElementById('thought-topic-header').append(document.getElementById('topic-search'));
  this.installArchivePresentation();
  installUniversalSearch();installRevisit();
  installSettingsPreferences({routeChanged:options=>this.routes?.commit(options),back:()=>this.navigate(this.settingsReturn.view,this.settingsReturn.documentId||null,null,{topicId:this.settingsReturn.topicId,...(this.settingsReturn.contextCard?{contextCard:this.settingsReturn.contextCard}:{}),returnTo:this.settingsReturn.returnTo,searchQuery:this.settingsReturn.searchQuery,anchor:this.settingsReturn.anchor})});
  const optional=document.createElement('small');optional.className='ux-consent-optional';document.getElementById('consent-check').closest('.consent-checkbox').append(optional);
  document.addEventListener('paia:preferences-applied',()=>this.localize());
  this.localize();
 }
 installArchivePresentation(){
  const get=id=>document.getElementById(id),header=document.querySelector('.workspace-header');
  this.archiveHeaderOrder=[...header.children];
  this.archiveControlHomes=new Map(['scope-search-host','back','archive-navigator-toggle','input-time-order','document-menu','save-status'].map(id=>[id,header]));
  this.archiveNavHomes=[...document.querySelectorAll('.sidebar [data-view]')].map(node=>({node,parent:node.parentElement,next:node.nextSibling}));
  const menu=document.createElement('details');menu.id='archive-compact-navigation';menu.hidden=true;const label=document.createElement('summary');label.id='archive-compact-nav-label';this.archiveCompactLabel=setIconLabel(label,'chevron-down','',{side:'end'});const items=document.createElement('div');items.id='archive-compact-nav-items';const actions=document.createElement('div');actions.id='archive-compact-reader-actions';actions.hidden=true;items.append(actions);menu.append(label,items);menu.addEventListener('keydown',event=>{if(event.key==='Escape'&&menu.open){event.preventDefault();event.stopPropagation();menu.open=false;label.focus({preventScroll:true});}});document.querySelector('.sidebar').append(menu);this.archiveCompactMenu=menu;
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
   if(active&&id==='scope-search-host')host=get('archive-root-header-actions');
   if(reader){
    if(id==='back')host=get('archive-reader-back-slot');
    else if(id==='archive-navigator-toggle')host=get(compact?'archive-compact-reader-actions':desktop?'reader-compact-tools':'archive-reader-back-slot');
    else if(['input-time-order','document-menu'].includes(id))host=get(compact?'archive-compact-reader-actions':'reader-heading-actions');
    else if(id==='save-status')host=get('reader-status-slot');
   }
   const node=get(id),next=host===home?this.archiveHeaderOrder?.slice(this.archiveHeaderOrder.indexOf(node)+1).find(item=>item.parentElement===home)||null:undefined;move(node,host,next);
  }
  // Archive always uses the same narrow navigator. Its root leaves the reading
  // column empty; search results still use the normal collection owner.
  move(get('archive-root-header'),active?get('archive-reader-navigator-slot'):get('archive-root-main'),active?(get('archive-root-tools')?.parentElement===get('archive-reader-navigator-slot')?get('archive-root-tools'):get('archive-reader-search-slot')):get('archive-root-tools'));
  move(get('archive-root-tools'),active?get('archive-reader-navigator-slot'):get('archive-root-main'),active?get('archive-reader-search-slot'):get('archive-root-navigator-slot'));
  move(get('archive-root-overflow'),get(active?'archive-root-header-actions':'archive-root-tools'));
  move(get('archive-source-scope-label'),active?get('archive-root-overflow').querySelector('.archive-root-overflow-actions'):get('archive-root-tools'));
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
  this.archiveCompactLabel.textContent=this.viewLabel(this.route.view)||this.viewLabel('library');
  presentSettingsPreferences({visible:this.route.view==='settings'});
 }
 present(route,options){
  if(route.view==='settings'&&this.route.view!=='settings'&&!this.settingsReturnPrepared)this.settingsReturn=this.route;this.settingsReturnPrepared=false;
  this.route=route;presentAppShell(document,route,options);
  const archiveRoot=['library','archive'].includes(route.view),heading=document.getElementById('workspace-heading'),header=document.querySelector('.workspace-header'),thoughtRoot=route.view==='thoughts'&&!route.topicId,headingHost=archiveRoot?document.getElementById('archive-root-heading'):thoughtRoot?document.getElementById('thought-root-heading'):header;
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
