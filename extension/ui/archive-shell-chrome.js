const $=id=>document.getElementById(id);
const SVG_NS='http:'+'//www.w3.org/2000/svg';
const NAV_LABELS={library:['档案','Archive'],thoughts:['思想库','Thought Library'],memory:['用于 AI','For AI'],settings:['设置','Settings']};
const NAV_PATHS={
 library:'M4.5 5.5h15v13h-15zM8 9h8M8 13h6',
 thoughts:'M6 5.5h12v9H11l-4 3v-3H6zM9 9h6M9 12h4',
 memory:'M12 4.5l1.25 3.25L16.5 9l-3.25 1.25L12 13.5l-1.25-3.25L7.5 9l3.25-1.25zM18 14l.75 1.75L20.5 16.5l-1.75.75L18 19l-.75-1.75-1.75-.75 1.75-.75z',
 settings:'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zM12 4v2M12 18v2M4 12h2M18 12h2M6.35 6.35l1.4 1.4M16.25 16.25l1.4 1.4M17.65 6.35l-1.4 1.4M7.75 16.25l-1.4 1.4'
};
function copy(zh,en){return document.documentElement.lang==='en'?en:zh;}
function icon(path,className){const svg=document.createElementNS(SVG_NS,'svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');svg.classList.add(className);const shape=document.createElementNS(SVG_NS,'path');shape.setAttribute('d',path);shape.setAttribute('fill','none');shape.setAttribute('stroke','currentColor');shape.setAttribute('stroke-width','1.7');shape.setAttribute('stroke-linecap','round');shape.setAttribute('stroke-linejoin','round');svg.append(shape);return svg;}
function sync(){
 for(const [view,pair] of Object.entries(NAV_LABELS)){
  const selector=view==='settings'?'.sidebar-bottom > [data-view="settings"]':`#primary-nav > [data-view="${view}"]`,button=document.querySelector(selector);if(!button)continue;
  let label=button.querySelector('.ux-nav-label');if(!label){label=document.createElement('span');label.className='ux-nav-label';button.replaceChildren(icon(NAV_PATHS[view],'ux-nav-icon'),label);}label.textContent=copy(...pair);
 }
 const revisit=$('revisit-open');if(!revisit)return;
 revisit.classList.remove('core-loop-card','uir-revisit-entry');revisit.classList.add('uir-revisit-shortcut');
 let label=revisit.querySelector('.uir-revisit-label');if(!label){label=document.createElement('span');label.className='uir-visually-hidden uir-revisit-label';revisit.replaceChildren(icon('M7 7h5a6 6 0 1 1-5.2 9M7 7v5M7 7l4-4','uir-revisit-icon'),label);}
 label.textContent=copy('打开回来看看','Open Revisit');revisit.setAttribute('aria-label',label.textContent+(revisit.dataset.returnState==='new'?copy(' · 有新内容',' · New local changes'):''));
}
export function installArchiveShellChrome(){sync();new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});if(!$('revisit-open')){const workspace=document.querySelector('.workspace');if(workspace){const observer=new MutationObserver(()=>{if($('revisit-open')){observer.disconnect();sync();}});observer.observe(workspace,{subtree:true,childList:true});}}}
