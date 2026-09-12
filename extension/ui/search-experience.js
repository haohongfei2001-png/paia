import {element} from './common.js';
import {installUniversalSearch} from './universal-search.js';
import {installRevisit} from './revisit.js';
// Literal text only. Reading highlights use CSS ranges, never mutate editable DOM.
export function highlightText(node,text,query){node.replaceChildren();const value=String(text||''),needle=String(query||'').trim().toLocaleLowerCase();let from=0,found;if(!needle){node.textContent=value;return;}while((found=value.toLocaleLowerCase().indexOf(needle,from))>=0){node.append(document.createTextNode(value.slice(from,found)),element('mark','search-match',value.slice(found,found+needle.length)));from=found+needle.length;}node.append(document.createTextNode(value.slice(from)));}
export function highlightReading(root,query){if(!globalThis.CSS?.highlights||!globalThis.Highlight)return;CSS.highlights.delete('paia-search');const q=String(query||'').trim().toLocaleLowerCase();if(!q||!root)return;const ranges=[],walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;while((node=walker.nextNode())&&ranges.length<500){if(node.parentElement.closest('[hidden],button,select'))continue;const text=node.data.toLocaleLowerCase();let from=0,index;while((index=text.indexOf(q,from))>=0&&ranges.length<500){const range=new Range();range.setStart(node,index);range.setEnd(node,index+q.length);ranges.push(range);from=index+q.length;}}CSS.highlights.set('paia-search',new Highlight(...ranges));}

let revealToken=0;
// Search opens a bounded page around the matched Input. Reveal that exact Input only
// after the Reader has replaced the collection view, so the document's remembered
// scroll position cannot hide the result. This is ephemeral UI state only.
export function revealSearchResult(itemId,query,{attempts=40}={}){
 const token=++revealToken,id=String(itemId||''),needle=String(query||'');let remaining=attempts;
 const attempt=()=>{
  if(token!==revealToken||!id)return;
  const panel=document.getElementById('document-panel'),root=document.getElementById('document-body');
  const target=root&&[...root.querySelectorAll('[data-item-id]')].find(node=>node.dataset.itemId===id);
  if(panel&&!panel.hidden&&target){
   requestAnimationFrame(()=>requestAnimationFrame(()=>{
    if(token!==revealToken||!target.isConnected)return;
    highlightReading(root,needle);
    const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches===true,section=target.closest('section');
    if(section)section.dataset.searchOrigin='true';
    target.scrollIntoView({block:'center',behavior:reduced?'auto':'smooth'});
    if(!reduced)section?.animate?.([{backgroundColor:'#eef3e9'},{backgroundColor:'transparent'}],{duration:900,easing:'ease-out'});
   }));
   return;
  }
  if(remaining-->0)setTimeout(attempt,50);
 };
 setTimeout(attempt,0);
}

export function wireSearchKeyboard(input,results){input.addEventListener('keydown',e=>{if(e.key==='ArrowDown'){const first=results.querySelector('button:not(:disabled)');if(first){e.preventDefault();first.focus();}}});results.addEventListener('keydown',e=>{if(!['ArrowUp','ArrowDown','Escape'].includes(e.key))return;const all=[...results.querySelectorAll('button:not(:disabled)')].filter(x=>x.getClientRects().length),at=all.indexOf(document.activeElement);if(at<0)return;e.preventDefault();if(e.key==='Escape'||e.key==='ArrowUp'&&at===0)input.focus();else all[Math.max(0,Math.min(all.length-1,at+(e.key==='ArrowDown'?1:-1)))]?.focus();});results.addEventListener('click',e=>{const hit=e.target.closest?.('button.search-input[data-input-id]');if(hit&&results.contains(hit))revealSearchResult(hit.dataset.inputId,input.value);});}
export async function findLibraryPage(read,{query,cursor=null,isCurrent=()=>true,onProgress=()=>{}}){let next=cursor;for(;;){if(!isCurrent())return null;const page=await read({query,cursor:next,ranked:true});if(!isCurrent())return null;if(page.items.length||!page.nextCursor)return page;if(JSON.stringify(next)===JSON.stringify(page.nextCursor))throw Error('Search did not advance');next=page.nextCursor;onProgress();await new Promise(r=>setTimeout(r,0));}}

queueMicrotask(installUniversalSearch);
queueMicrotask(installRevisit);
