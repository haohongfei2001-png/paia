import {quickPromptEligible} from '../core/prompt-reuse-preferences.js';

// Existing private Prompt surface only; original bodies remain literal text.
// An invalidated offer keeps the human's draft but cannot submit again.
export function mountManualPromptConflict(container,offer,{button,copy,resolve,done,cancel,error,pending,blocked=()=>false}){
 const doc=container.ownerDocument;container.replaceChildren();let invalid=false,composing=false,saving=false;
 const title=doc.createElement('p');copy(title,'有一项修改需要确认');container.append(title);
 for(const [label,text]of [['本机当前保留的版本',offer.localText],['另一版本',offer.otherText]]){const heading=doc.createElement('p'),body=doc.createElement('div');copy(heading,label);body.className='check-body';body.tabIndex=0;body.textContent=text;container.append(heading,body);}
 const label=doc.createElement('label'),caption=doc.createElement('span'),area=doc.createElement('textarea');copy(caption,'手动整理后的正文');copy(area,'手动整理后的正文','aria-label');area.maxLength=200000;area.value=offer.localText;label.append(caption,area);container.append(label);
 area.addEventListener('compositionstart',()=>{composing=true;});area.addEventListener('compositionend',()=>{composing=false;});
 const text=()=>area.value===offer.localText.replace(/\r\n/g,'\n')?offer.localText:area.value,actions=doc.createElement('div');actions.className='actions';
 const saves=[];const submit=async choice=>{if(invalid||composing||saving||blocked())return;if(choice==='manual'&&!quickPromptEligible(text())){error('最多 150 个字符；编辑仍保留。');return;}saving=true;pending(true);try{await resolve({token:offer.token,choice,...(choice==='manual'?{text:text()}:{})});await done();}catch{invalidate();error('未保存，编辑已保留。取消后刷新可重新编辑。');}finally{saving=false;pending(false);}};
 for(const [label,choice]of [['保留本机版本','local'],['保留另一版本','other'],['两份都保留','both'],['保存整理后的正文','manual']]){const control=button(label,()=>submit(choice));saves.push(control);actions.append(control);}
 actions.append(button('暂不处理',()=>{if(composing||saving||blocked())return;cancel();}));container.append(actions);
 function invalidate(){invalid=true;for(const control of saves){control.disabled=true;if('pendingDisabled'in control.dataset)control.dataset.pendingDisabled='1';}copy(title,'版本已变化，请取消后刷新；编辑仍保留。');}
 return {invalidate};
}
