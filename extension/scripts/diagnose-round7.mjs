// Isolated synthetic diagnostic. Does not read a real browser profile or provider.
import {writeFile,mkdir} from 'node:fs/promises';
import {FakeChatGPT,eventually,pause} from '../tests/harness/fake-chatgpt.mjs';
const output='work/round7';await mkdir(output,{recursive:true});
const h=await FakeChatGPT.start({deepSeekFixture:body=>{const r=JSON.parse(body.messages[1].content);return {choices:[{message:{content:JSON.stringify({items:r.inputs.map(x=>({inputRef:x.ref,topic:{proposedName:'长期学习系统'},section:{proposedName:'想法与过程'},type:'idea',spans:[],uncertain:false}))})}}]};}});
try{
 const p=h.archive;await p.locator('#consent-check').check();await p.locator('#enable-consent').click();
 await h.open({id:'r7-diagnostic',title:'合成调试',base:1609459200,messages:[{id:'r7-diagnostic-msg',text:'我想重新阅读自己的想法，也希望可以修改和保留它们。'}]});
 await eventually(async()=>(await h.state()).records.length===1);
 const rpc=(type,rest={})=>p.evaluate(m=>chrome.runtime.sendMessage(m),{type,...rest});
 await rpc('SAVE_DEEPSEEK_CREDENTIAL',{config:{apiKey:'synthetic-only-diagnostic'}});
 const organize=await rpc('UPDATE_ORIGINAL_LIBRARY_VIEW',{userActionId:'r7-diagnostic-organize'});
 await p.locator('.sidebar [data-view=thoughts]').click();await eventually(async()=>await p.locator('.topic-index-row').count()===1);await p.locator('.topic-index-row').click();
 await p.locator('#ai-presentation-toggle').check();await pause(2200);
 const report={organize,status:{},errors:h.errors,dom:await p.evaluate(()=>({checked:document.querySelector('#ai-presentation-toggle').checked,disabled:document.querySelector('#ai-presentation-toggle').disabled,button:document.querySelector('#ai-library-update').outerHTML,text:document.querySelector('#thought-panel').innerText,error:document.querySelector('#error').textContent,view:document.querySelector('#topic-body').innerHTML.slice(0,600)}))};
 for(const type of ['GET_AI_PRESENTATION_STATUS','GET_ORGANIZER_CONTROLS','GET_ORIGINAL_ORGANIZER_STATUS','GET_BOUNDED_ORGANIZER','GET_DEEPSEEK_STATUS'])report.status[type]=await rpc(type);
 await writeFile(output+'/diagnostic.json',JSON.stringify(report,null,2));await p.screenshot({path:output+'/diagnostic.png',fullPage:true});console.log(JSON.stringify(report));
}finally{await h.close();}
