import {PromptAssistState} from './prompt-assist-state.js';
// No second panel, generation button or new skin. The original left 224 px
// capsule is the complete first-click insertion control for both result owners.
export function mountPromptAssist({send,tell,clearFeedback=()=>{},changed=()=>{}}){
 const messages={inserting:'正在插入…',inserted:'已插入，未发送。',uncertain:'插入结果未确认。请先检查草稿，不会自动重试。',changed:'本轮回复或相关 Context 已变化。'};
 const state=new PromptAssistState({send,changed(){if(state.message)tell(messages[state.message]||'');else clearFeedback();changed();}});
 void state.refresh();return {state,get active(){return state.active;},dismiss:()=>state.dismiss(),invalidate:()=>state.invalidate(),dispose:()=>state.dispose()};
}
