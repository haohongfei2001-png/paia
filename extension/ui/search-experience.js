import {element} from './common.js';

import {normalizeSearch} from '../core/search-service.js';

const graphemes=new Intl.Segmenter(undefined,{granularity:'grapheme'});
// Sentinel padding preserves leading/trailing spaces while reusing the search
// owner's exact normalization. Offsets always map back to original graphemes.
const normalizedBody=value=>normalizeSearch('\0'+value+'\0').slice(1,-1);
function lexicalSpans(value,query,limit=Infinity){
 const needle=normalizeSearch(query);if(!needle)return [];
 const normalized=normalizedBody(value),matches=[];let from=0,at;
 while(matches.length<limit&&(at=normalized.indexOf(needle,from))!==-1){matches.push({start:at,end:at+needle.length});from=at+needle.length;}
 if(!matches.length)return [];
 const spans=[];let offset=0,first=0;
 // Keep only match ranges, not a per-character copy of a potentially long Input.
 for(const {segment,index} of graphemes.segment(value)){
  const next=offset+normalizedBody(segment).length;
  for(let i=first;i<matches.length&&matches[i].start<next;i++){
   const match=matches[i];if(match.end<=offset)continue;
   match.originalStart??=index;match.originalEnd=index+segment.length;
  }
  while(first<matches.length&&matches[first].end<=next)first++;
  offset=next;
 }
 // Context-sensitive casing is evaluated on the full string above. Refuse an
 // unmappable transformation instead of applying guessed offsets to prose.
 if(offset!==normalized.length)return [];
 for(const match of matches){
  const start=match.originalStart,end=match.originalEnd;if(start===undefined||end===undefined)return [];
  const previous=spans.at(-1);
  if(previous&&start<previous.end)previous.end=Math.max(previous.end,end);
  else spans.push({start,end});
 }
 return spans;
}
// Literal text only. Reading highlights use CSS ranges, never mutate editable DOM.
export function highlightText(node,text,query){
 node.replaceChildren();const value=String(text||'');let from=0;
 for(const {start,end} of lexicalSpans(value,query)){node.append(document.createTextNode(value.slice(from,start)),element('mark','search-match',value.slice(start,end)));from=end;}
 node.append(document.createTextNode(value.slice(from)));
}
export function highlightReading(root,query){
 if(!globalThis.CSS?.highlights||!globalThis.Highlight)return;
 CSS.highlights.delete('paia-search');if(!normalizeSearch(query)||!root)return;
 const ranges=[],walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
 while((node=walker.nextNode())&&ranges.length<500){
  if(node.parentElement.closest('[hidden],button,select'))continue;
  for(const {start,end} of lexicalSpans(node.data,query,500-ranges.length)){const range=new Range();range.setStart(node,start);range.setEnd(node,end);ranges.push(range);}
 }
 CSS.highlights.set('paia-search',new Highlight(...ranges));
}

// Locate a lexical match within one Input without changing editable content.
export function firstLexicalRange(root,query){
 if(!root||!normalizeSearch(query))return null;
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;
 while((node=walker.nextNode())){
  if(node.parentElement?.closest('[hidden],button,select'))continue;
  const span=lexicalSpans(node.data,query,1)[0];if(!span)continue;
  const range=new Range();range.setStart(node,span.start);range.setEnd(node,span.end);return range;
 }
 return null;
}
let revealToken=0;
// Search opens a bounded page around the matched Input. Position the exact
// lexical hit after the Reader swaps pages; title-only hits retain Input fallback.
export function revealSearchResult(itemId,query,{attempts=40,isCurrent=()=>true,onMissingMatch=()=>{}}={}){
 const token=++revealToken,id=String(itemId||''),needle=String(query||'');let remaining=attempts;
 const attempt=()=>{
  if(token!==revealToken||!id||!isCurrent())return;
  const panel=document.getElementById('document-panel'),root=document.getElementById('document-body');
  const target=root&&[...root.querySelectorAll('[data-item-id]')].find(node=>node.dataset.itemId===id);
  if(panel&&!panel.hidden&&target){
   requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(token!==revealToken||!isCurrent()||!target.isConnected||!root.contains(target))return;
    highlightReading(root,needle);
    const section=target.closest('section');
    if(section)section.dataset.searchOrigin='true';
    const match=firstLexicalRange(target,needle),rect=match?.getBoundingClientRect();
    if(rect?.height)window.scrollTo({top:Math.max(0,window.scrollY+rect.top-innerHeight*0.45),behavior:'instant'});
    else target.scrollIntoView({block:'center',behavior:'instant'});
    if(!match&&isCurrent())onMissingMatch();
    // Exact-result navigation has one explicit jump, without competing smooth
    // scrolls or decorative animation over an editable Input.
   }));
   return;
  }
  if(remaining-->0)setTimeout(attempt,50);
 };
 setTimeout(attempt,0);
}

export function wireSearchKeyboard(input,results,{listenInput=true,revealOnClick=true,onScrollIntent=()=>{},selector='button:not(:disabled)'}={}){if(listenInput)input.addEventListener('keydown',e=>{if(!e.isComposing&&e.keyCode!==229&&['ArrowUp','ArrowDown','PageUp','PageDown','Home','End'].includes(e.key))onScrollIntent();if(!e.isComposing&&e.keyCode!==229&&e.key==='ArrowDown'){const first=results.querySelector(selector);if(first){e.preventDefault();first.focus();}}});results.addEventListener('keydown',e=>{if(!e.isComposing&&e.keyCode!==229&&['ArrowUp','ArrowDown','PageUp','PageDown','Home','End'].includes(e.key))onScrollIntent();if(!['ArrowUp','ArrowDown','Escape'].includes(e.key))return;const all=[...results.querySelectorAll(selector)].filter(x=>x.getClientRects().length),at=all.indexOf(document.activeElement);if(at<0)return;e.preventDefault();if(e.key==='Escape'||e.key==='ArrowUp'&&at===0)input.focus();else all[Math.max(0,Math.min(all.length-1,at+(e.key==='ArrowDown'?1:-1)))]?.focus();});if(revealOnClick)results.addEventListener('click',e=>{const hit=e.target.closest?.('button.search-input[data-input-id]');if(hit&&results.contains(hit))revealSearchResult(hit.dataset.inputId,input.value);});}
// A single input listener chooses only the admitted, visible page. Result
// lists keep their reviewed keyboard behavior without duplicate input owners.
export function wireScopeSearchKeyboard(input,pages){
 input.addEventListener('keydown',e=>{if(e.isComposing||e.keyCode===229||e.key!=='ArrowDown')return;const page=pages.find(p=>p.active());const first=page?.results.querySelector('button:not(:disabled)');if(first?.getClientRects().length){e.preventDefault();first.focus();}});
 for(const page of pages)wireSearchKeyboard(input,page.results,{listenInput:false,revealOnClick:page.revealOnClick!==false});
}
export async function findLibraryPage(read,{query,cursor=null,isCurrent=()=>true,onProgress=()=>{}}){let next=cursor;for(;;){if(!isCurrent())return null;const page=await read({query,cursor:next,ranked:true});if(!isCurrent())return null;if(page.items.length||!page.nextCursor)return page;if(JSON.stringify(next)===JSON.stringify(page.nextCursor))throw Error('Search did not advance');next=page.nextCursor;onProgress();await new Promise(r=>setTimeout(r,0));}}


export function wireContinuousKeyboard(results,run){results.addEventListener('keydown',event=>{if(!['Enter',' '].includes(event.key))return;event.preventDefault();void Promise.resolve().then(run);});}
