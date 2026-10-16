import {historicalInstant,historicalDateBound} from '../core/historical-time.js';
// Presentation only. Date-only source values retain their civil day; they never
// acquire an invented midnight or use capture/import time as a substitute.
function sourceDate(value){
 const civil=typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value),at=civil?historicalDateBound(value):historicalInstant(value);
 return at===null?null:{date:new Date(at),civil};
}
function dateOptions(source,{timeZone,...options}={}){return {...options,...(source.civil?{timeZone:'UTC'}:timeZone?{timeZone}:{})};}
export function archiveSourceYear(value,{locale='zh-CN',timeZone}={}){
 const source=sourceDate(value);if(!source)return null;
 return new Intl.DateTimeFormat(locale,dateOptions(source,{year:'numeric',timeZone})).formatToParts(source.date).find(part=>part.type==='year')?.value??null;
}
export function archiveDateLabel(value,{locale='zh-CN',timeZone,includeYear=false,unknown='发送时间未知'}={}){
 const source=sourceDate(value);if(!source)return unknown;
 return new Intl.DateTimeFormat(locale,dateOptions(source,{month:'long',day:'numeric',...(includeYear?{year:'numeric'}:{}),timeZone})).format(source.date);
}
export function archiveInputStamp(value,{locale='zh-CN',timeZone,seconds=false,includeYear=false,unknown='发送时间未知'}={}){
 const source=sourceDate(value);if(!source)return unknown;
 const dateLabel=archiveDateLabel(value,{locale,timeZone,unknown});
 const year=includeYear?archiveSourceYear(value,{locale,timeZone}):null;
 const label=year?`${year}${locale.startsWith('zh')?'年':' '}${dateLabel}`:dateLabel;
 if(source.civil)return label;
 const clock=new Intl.DateTimeFormat(locale,{hour:'2-digit',minute:'2-digit',...(seconds?{second:'2-digit'}:{}),hourCycle:'h23',...(timeZone?{timeZone}:{})}).format(source.date);
 return `${label} ${clock}`;
}
// Only metadata nodes are touched. The first known year in each mounted window
// and each transition carries year context, including reversed reading order.
export function refreshArchiveStamps(body,rows,options={}){
 const values=new Map(rows.map(row=>[row.id,row]));
 const sections=[...body.querySelectorAll('.library-block,.archive-block')];
 const anchor=sections.find(node=>!node.hidden&&node.getBoundingClientRect().bottom>0),top=anchor?.getBoundingClientRect().top;
 let previousYear=null;
 for(const section of sections){
  const row=values.get(section.dataset.blockId);if(!row)continue;
  const stamp=section.querySelector('.block-time');if(!stamp)continue;
  const year=archiveSourceYear(row.sourceSentAt,options),start=year!==null&&year!==previousYear;
  const label=archiveInputStamp(row.sourceSentAt,{...options,includeYear:start});
  if(stamp.textContent!==label)stamp.textContent=label;
  stamp.classList.toggle('input-year-start',start);stamp.dataset.sourceYear=year||'';
  if(year!==null&&!section.hidden)previousYear=year;
 }
 for(const heading of body.querySelectorAll('.document-day'))heading.remove();
 if(anchor&&Number.isFinite(top)){
  const delta=anchor.getBoundingClientRect().top-top;
  if(Math.abs(delta)>0.5)body.ownerDocument.defaultView.scrollBy(0,delta);
 }
}
