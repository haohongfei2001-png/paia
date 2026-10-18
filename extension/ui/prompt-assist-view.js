import {PromptAssistState} from './prompt-assist-state.js';
export function mountPromptAssist({card,list,tools,send,button,bindCopy,tell,clearFeedback=()=>{},canActivate,changed=()=>{}}){
 const panel=document.createElement('section');panel.id='prompt-assist';panel.hidden=true;bindCopy(panel,'本轮 AI 建议','aria-label');card.insertBefore(panel,tools);
 const open=button('本轮 AI 建议',()=>{if(canActivate())void state.activate();});open.id='prompt-assist-open';tools.append(open);
 const state=new PromptAssistState({send,changed:render});let showing=false,rendered=null;const messages={pending:'正在准备本轮建议；常用输入仍可使用。',unavailable:'本轮 AI 建议暂不可用；常用输入仍可使用。',permission:'请先在 PAIA 设置中分别允许本轮回复读取与远端处理。','no-reply':'启用后等待当前回复完成，再明确请求建议。',defer:'本轮没有必要的新建议。',inserting:'正在插入…',inserted:'已插入，未发送。',uncertain:'插入结果未确认。请先检查草稿，不会自动重试。',changed:'本轮回复或相关 Context 已变化，请重新请求。'};
 function render(){
  open.disabled=state.busy;open.setAttribute('aria-busy',String(state.busy));
  const value=state.result,visible=value?.kind==='SUGGESTION';
  if(visible&&rendered!==value){const focusCurrent=document.hasFocus?.()!==false&&[open,document.body].includes(document.activeElement);rendered=value;showing=true;list.hidden=true;panel.hidden=false;panel.replaceChildren();const note=document.createElement('p'),body=document.createElement('div'),condition=document.createElement('p'),actions=document.createElement('div');bindCopy(note,'本轮 AI 建议');body.className='check-body';body.tabIndex=0;body.textContent=value.text;condition.className='assist-condition';condition.textContent=value.condition;condition.hidden=!value.condition;const insert=button('填入整条',()=>state.insert()),back=button('返回',()=>state.dismiss());insert.id='prompt-assist-insert';back.id='prompt-assist-back';actions.className='actions';actions.append(insert,back);panel.append(note,body,condition,actions);state.markPresented(value);if(focusCurrent)body.focus({preventScroll:true});}
  if(!visible&&showing){showing=false;rendered=null;panel.hidden=true;panel.replaceChildren();list.hidden=false;}
  const insert=panel.querySelector('#prompt-assist-insert');if(insert)insert.disabled=state.busy||state.attempted;
  if(state.message)tell(messages[state.message]);else clearFeedback();changed();
 }
 void state.refresh();return {state,panel,open,get active(){return state.active;},dismiss:()=>state.dismiss(),invalidate:()=>state.invalidate(),dispose:()=>state.dispose()};
}
