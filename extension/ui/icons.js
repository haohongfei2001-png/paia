// D6.2 decorative glyphs. Controls retain their own labels, events and state.
const NS='http:'+'//www.w3.org/2000/svg';
const paths=Object.freeze({
 archive:'M3 4h12v11H3z M6 7h6 M6 10h4',
 thoughts:'M3 3h12v10l-6 3-6-3z M6 6v3c0 3 6 3 6 0V6',
 context:'M9 2l7 4v8l-7 3-7-3V6z M6 9h6 M9 6l3 3-3 3',
 settings:'M9 3v-2 M9 17v-2 M3 9H1 M17 9h-2 M4.8 4.8L3 3 M15 15l-1.8-1.8 M4.8 13.2L3 15 M15 3l-1.8 1.8 M14 9a5 5 0 1 1-10 0 5 5 0 0 1 10 0 M11 9a2 2 0 1 1-4 0 2 2 0 0 1 4 0',
 search:'M12 12l4 4 M13 7a5 5 0 1 1-10 0 5 5 0 0 1 10 0',
 back:'M11 3L5 9l6 6',
 'chevron-right':'M6 4l5 5-5 5',
 'chevron-down':'M4 6l5 5 5-5',
 close:'M4 4l10 10 M14 4L4 14',
 check:'M3 9l4 4L15 4',
 history:'M3 5a7 7 0 1 1-1 7 M3 1v5h5 M9 5v5l3 2',
 'sort-up':'M9 15V3 M4 8l5-5 5 5',
 'sort-down':'M9 3v12 M4 10l5 5 5-5',
 'external-link':'M8 3h7v7 M15 3 6 12 M11 15H3V7',
 forward:'M3 9h12 M10 4l5 5-5 5',
 copy:'M6 6h9v9H6z M3 12V3h9',
 warning:'M9 2l8 14H1z M9 6v5 M9 13.5v.1'
});
export const iconNames=Object.freeze([...Object.keys(paths),'more','status']);
export function createIcon(name,{className=''}={}){
 if(!iconNames.includes(name))throw Error('UNKNOWN_PAIA_ICON');
 const svg=document.createElementNS(NS,'svg');
 for(const [key,value] of Object.entries({viewBox:'0 0 18 18',width:'18',height:'18',fill:'none',stroke:'currentColor','stroke-width':'1.4','stroke-linecap':'round','stroke-linejoin':'round','aria-hidden':'true',focusable:'false','pointer-events':'none'}))svg.setAttribute(key,value);
 svg.classList.add('paia-icon');if(className)svg.classList.add(...className.split(/\s+/).filter(Boolean));svg.dataset.paiaIcon=name;
 if(name==='more'||name==='status')for(const cx of name==='more'?[4,9,14]:[9]){const circle=document.createElementNS(NS,'circle');for(const [key,value] of Object.entries({cx,cy:9,r:name==='more'?1.15:4,fill:'currentColor',stroke:'none'}))circle.setAttribute(key,String(value));svg.append(circle);}
 else{const path=document.createElementNS(NS,'path');path.setAttribute('d',paths[name]);svg.append(path);}
 return svg;
}
export function setIconLabel(control,name,text,{side='start',labelClass='',iconClass=''}={}){
 const label=document.createElement('span');label.classList.add('paia-icon-label');if(labelClass)label.classList.add(...labelClass.split(/\s+/).filter(Boolean));label.textContent=String(text??'');
 const icon=createIcon(name,{className:iconClass});control.classList.add('paia-icon-control');control.replaceChildren(...(side==='end'?[label,icon]:[icon,label]));return label;
}
export function setIconOnly(control,name,label){
 if(label!==undefined)control.setAttribute('aria-label',label);
 if(!control.getAttribute('aria-label'))throw Error('PAIA_ICON_ACCESSIBLE_LABEL_REQUIRED');
 control.classList.add('paia-icon-only');control.replaceChildren(createIcon(name));
}
export function mountIcon(slot,name,options){slot.replaceChildren(createIcon(name,options));}
