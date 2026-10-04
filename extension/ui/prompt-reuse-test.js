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
   copy.addEventListener('click',async()=>{const r=await copyPrompt(item.text);status.textContent=r.status==='copied'?'Copied. Paste manually.':'Copy failed. Prompt remains available.';});
   row.append(insert,copy);root.append(row);
  }
  status.textContent=projection.items.length?'Snapshot ready. Background activity will not reorder it.':'No useful repeated prompts yet.';
 }catch{status.textContent='Unavailable. Check PAIA consent and refresh.';}
}
document.getElementById('refresh').addEventListener('click',refresh);
