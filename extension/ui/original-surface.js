import {thoughtCopy as tc} from './thought-copy.js';
import {element,dateLabel} from './common.js';
import {copyReadingText} from './reading-actions.js';
import {readOriginalText} from './original-sequence.js';
export class OriginalSurface {
 constructor({dialog,content,host,read}){Object.assign(this,{dialog,content,host,read});}
 async open(target,trigger){
  const {dialog,content,host,read}=this;content.replaceChildren();
  dialog.querySelector('h2').textContent=target.kind==='conversation'?tc('当前 Conversation · 原始内容'):tc('所选 Input · 原始内容');
  dialog.dataset.readingSurface='original';dialog.querySelector('#close-info').textContent=tc('关闭');
  const isCurrent=host.open(dialog,{target,trigger}),history=[];let generation=null,cursor=null,next=null,index=0,loading=false;
  const rows=element('div','original-rows'),status=element('p','muted'),position=element('p','muted'),controls=element('nav','original-navigation');status.setAttribute('role','status');controls.setAttribute('aria-label',tc('原文位置'));
  const previous=element('button','',tc('上一段')),more=element('button','',tc('下一段')),copy=element('button','',tc('复制原文'));copy.id='original-copy';previous.disabled=true;more.hidden=true;copy.disabled=true;controls.append(previous,position,more);content.append(rows,status,controls,copy);
  const load=async()=>{
   if(loading||!isCurrent())return;loading=true;copy.disabled=true;previous.disabled=true;more.disabled=true;status.textContent=tc('正在读取原始内容…');rows.replaceChildren();
   try{
    const page=await read({target,cursor,limit:40,...(generation===null?{}:{expectedGeneration:generation})});if(!isCurrent())return;
    generation=page.generation;next=page.nextCursor;
    dialog.querySelector('h2').textContent=(target.kind==='conversation'?(page.title||tc('当前 Conversation')):tc('所选 Input'))+tc(' · 原始内容');
    for(const r of page.records){const row=element('section','original-row');row.append(element('p','original-time',r.sourceSentAt?tc('发送于 ')+dateLabel(r.sourceSentAt):tc('发送时间未知')),element('pre','source-original',r.originalText));rows.append(row);}
    const singleComplete=target.kind==='input'&&page.availability==='available'&&page.records.length===1&&page.intended===1&&!next&&!history.length;
    controls.hidden=singleComplete;
    status.textContent=page.availability==='unavailable'?tc('当时来源已不可用。'):page.availability==='partial'?tc('部分当时来源已不可用；不能复制为完整原文。'):singleComplete?tc('所选输入的原始文字 · 只读'):tc('原始内容只读。缺少当时引用的内容时，PAIA 不猜测或补写 AI 回复。');
    position.textContent=page.records.length?(document.documentElement.lang==='en'?`Section ${index+1} · ${page.records.length} of ${page.intended} original Inputs`:`第 ${index+1} 段 · 本段 ${page.records.length} 条 / 共 ${page.intended} 条原始输入`):'';
    copy.disabled=page.availability!=='available';more.hidden=!next;previous.disabled=!history.length;more.disabled=false;
   }catch{if(isCurrent()){rows.replaceChildren();status.textContent=tc('原文暂时无法读取或已经变化。关闭后重新核对；未复制旧文本。');more.hidden=true;previous.disabled=true;}}
   finally{loading=false;}
  };
  previous.onclick=()=>{if(loading||!history.length)return;cursor=history.pop();index--;void load();};
  more.onclick=()=>{if(loading||!next)return;history.push(cursor);cursor=next;index++;void load();};
  copy.onclick=async()=>{
   if(loading||!isCurrent())return;copy.disabled=true;let copyReady=false;status.textContent=tc('正在核对完整原文…');
   try{
    const text=await readOriginalText({read,target,generation,isCurrent});if(!isCurrent())return;
    const copied=await copyReadingText(text,{fallback:false});if(!isCurrent())return;
    copyReady=true;if(copied)status.textContent=tc('原文已复制。');
    else{if(isCurrent()){const field=element('textarea','original-copy-fallback');field.value=text;field.readOnly=true;field.setAttribute('aria-label',tc('已核对的完整原文，手动复制'));rows.replaceChildren(field);status.textContent=tc('浏览器未允许直接复制。请选择完整原文，使用系统复制。');field.focus();field.select();}}
   }catch{if(isCurrent()){rows.replaceChildren();status.textContent=tc('原文暂时无法读取或已经变化。关闭后重新核对；未复制旧文本。');more.hidden=true;previous.disabled=true;}}
   finally{if(isCurrent())copy.disabled=!copyReady;}
  };
  await load();
 }
}
