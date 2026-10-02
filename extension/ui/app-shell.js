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
  installUniversalSearch();installRevisit();
  installSettingsPreferences({back:()=>this.navigate(this.settingsReturn.view,this.settingsReturn.documentId||null,null,{topicId:this.settingsReturn.topicId,searchQuery:this.settingsReturn.searchQuery,anchor:this.settingsReturn.anchor})});
  const optional=document.createElement('small');optional.className='ux-consent-optional';document.getElementById('consent-check').closest('.consent-checkbox').append(optional);
  document.addEventListener('paia:preferences-applied',()=>this.localize());
  this.localize();
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
  presentSettingsPreferences({visible:this.route.view==='settings'});
 }
 present(route,options){
  if(route.view==='settings'&&this.route.view!=='settings')this.settingsReturn=this.route;
  this.route=route;presentAppShell(document,route,options);
  const archiveRoot=['library','archive'].includes(route.view)&&!route.documentId,heading=document.getElementById('workspace-heading'),header=document.querySelector('.workspace-header'),headingHost=archiveRoot?document.getElementById('archive-root-heading'):header;
  if(heading.parentElement!==headingHost)headingHost.prepend(heading);
  const overflow=document.getElementById('archive-root-overflow'),overflowHost=archiveRoot?header:document.getElementById('archive-root-tools');
  if(overflow.parentElement!==overflowHost)overflowHost.append(overflow);
  document.getElementById('input-time-order').hidden=route.view!=='library'||!route.documentId;
  const reader=!!route.documentId||route.view==='thoughts'&&!!route.topicId;
  document.body.classList.toggle('ux-reader-active',reader);
  document.body.classList.toggle('uir-settings-active',route.view==='settings');
  document.body.dataset.paiaSpace=route.view;
  document.body.dataset.paiaSurface=reader?'reader':'root';
  this.localize();
 }
}
