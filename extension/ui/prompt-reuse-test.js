import {PromptListSession} from '../core/prompt-family.js';
import {copyPrompt} from '../core/prompt-clipboard.js';
const session=new PromptListSession(),status=document.getElementById('status'),root=document.getElementById('prompts'),target=document.getElementById('target');
async function command(request){const r=await chrome.runtime.sendMessage(request);if(!r?.ok)throw Error(r?.error||'Unavailable');return r.data;}
async function refresh(){
 try{
  const projection=await command({type:'PAIA_PROMPT_QUERY'}),tabs=await command({type:'PAIA_PROMPT_TARGETS'});
  session.open(projection);target.replaceChildren();
  for(const tab of tabs){const option=document.createElement('option');option.value=JSON.stringify(tab);option.textContent=tab.url;target.append(option);}
  root.replaceChildren();
  for(const item of session.current()){
   const row=document.createElement('p'),insert=document.createElement('button'),copy=document.createElement('button');
   row.dataset.promptId=item.id;
   insert.type=copy.type='button';insert.textContent=item.text;copy.textContent='Copy explicitly';copy.hidden=true;
   insert.addEventListener('click',async()=>{
    if(!target.value){status.textContent='Open a supported ChatGPT tab first.';copy.hidden=false;return;}
    const tab=JSON.parse(target.value);insert.disabled=true;status.textContent='Inserting…';
    try{const r=await command({type:'PAIA_PROMPT_INSERT',id:item.id,text:item.text,tabId:tab.id,url:tab.url,operationId:crypto.randomUUID()});
     status.textContent=r.status==='inserted'?'Inserted and verified. Not sent.':r.status==='uncertain'?'Insertion uncertain. Inspect the draft before another insertion.':'Insertion failed. Draft was not replaced.';
    }catch{status.textContent='Insertion not confirmed. Inspect the draft before another insertion.';}
    // Re-arm only on explicit refresh; no duplicate insertion retry.
    copy.hidden=false;
   });
   copy.addEventListener('click',async()=>{try{const selected=await command({type:'PAIA_PROMPT_COPY_TEXT',id:item.id,text:item.text});const r=await copyPrompt(selected.text);status.textContent=r.status==='copied'?'Copied. Paste manually.':'Copy failed. Prompt remains available.';}catch{status.textContent='Prompt changed or became unavailable. Refresh before copying.';}});
   row.append(insert,copy);root.append(row);
  }
  status.textContent=projection.items.length?'Snapshot ready. Background activity will not reorder it.':'No useful repeated prompts yet.';
 }catch{status.textContent='Unavailable. Check PAIA consent and refresh.';}
}
document.getElementById('refresh').addEventListener('click',refresh);

let validation=0;
chrome.runtime.onMessage.addListener(request=>{if(request?.type==='ARCHIVE_CHANGED'||request?.type==='PAIA_PROMPT_CHANGED'){const attempt=++validation;void command({type:'PAIA_PROMPT_QUERY'}).then(projection=>{if(attempt!==validation)return;const ids=new Set(session.reconcile(projection).map(x=>x.id));for(const row of [...root.children])if(!ids.has(row.dataset.promptId))row.remove();},()=>{if(attempt!==validation)return;session.close();root.replaceChildren();status.textContent='Content changed. Refresh the snapshot before reuse.';});}});
