import {SettingsAIStyleState} from './settings-ai-style-state.js';
import {mountSettingsDetail} from './settings-details.js';
import {withSettingsControlFocus} from './settings-local-state.js';
import {STORAGE_KEY} from '../core/constants.js';

const choices=[
 ['original','原话优先','Original wording','尽量保留你的原句，只做重新组织。','Keep your original sentences wherever possible, changing their organization.'],
 ['balanced','平衡整理 · 默认','Balanced · Default','适度修剪、拼接和优化，让想法更连贯。','Lightly trim, connect and refine your words for a more coherent read.'],
 ['concise','更加概括','More concise','提炼和压缩重复表达，突出主要思想。','Condense repeated expressions to bring the main ideas forward.']
];
const feedback={saving:['正在保存…','Saving…'],saved:['已保存','Saved'],unsupported:['这个版本无法更改已保存的整理方式。','This version cannot edit the saved organize style.'],'read-error':['暂时无法读取整理方式。重新打开可重试。','Could not read organize style. Reopen to retry.'],conflict:['另一页面已更改整理方式，已显示当前选择。','Another page changed organize style. The current choice is shown.'],'save-error':['保存未获确认，已重新核对当前选择。请重试。','Save was not confirmed. The current choice was checked again. Please retry.'],'save-unknown':['保存结果暂时无法确认。重新打开核对后再试。','The save result is unknown. Reopen to check before trying again.']};
const owners=new WeakMap();
export function mountSettingsAIStyle(host,{send,language=()=>document.documentElement.lang,runtime,storage}={}){
 if(owners.has(host))return owners.get(host);
 const content=document.createElement('div');content.className='ux-settings-style-content';
 const note=document.createElement('p');note.className='ux-settings-note';note.id='settings-ai-style-note';
 const fieldset=document.createElement('fieldset'),legend=document.createElement('legend');fieldset.append(legend);fieldset.setAttribute('aria-describedby',note.id+' settings-ai-style-feedback');
 const status=document.createElement('p');status.id='settings-ai-style-feedback';status.setAttribute('role','status');status.className='ux-settings-style-feedback';content.append(note,status,fieldset);
 const inputs=new Map(),labels=new Map();let detail;
 const state=new SettingsAIStyleState({send,changed:()=>sync()});
 for(const [value]of choices){const label=document.createElement('label'),copy=document.createElement('span'),title=document.createElement('span'),description=document.createElement('span'),input=document.createElement('input');input.type='radio';input.name='settings-ai-organize-style';input.value=value;input.id='settings-ai-style-'+value;title.className='ux-settings-style-title';description.className='ux-settings-style-description';copy.append(title,description);label.htmlFor=input.id;label.append(copy,input);fieldset.append(label);inputs.set(value,input);labels.set(value,{title,description});const select=async()=>{await withSettingsControlFocus(input,()=>state.select(value));if(detail.dialog.open&&document.activeElement===input){content.style?.setProperty('--style-feedback-height',`${status.getBoundingClientRect?.().height||0}px`);input.scrollIntoView?.({block:'nearest'});}};input.addEventListener('click',select);input.addEventListener('change',select);}
 const value=chinese=>state.readError?(chinese?'读取失败':'Could not read'):state.value?.available?choices.find(row=>row[0]===state.value.value)[chinese?1:2]:state.value?(chinese?'暂不可用':'Unavailable'):(chinese?'读取中':'Loading');
 detail=mountSettingsDetail({id:'settings-ai-style-open',title:['AI 整理方式','AI organize style'],content,value,language,onOpen:async()=>{const focused=document.activeElement,loaded=await state.load();if(loaded&&detail.dialog.open&&state.editable&&document.activeElement===focused)inputs.get(state.value.value)?.focus({preventScroll:true});}});
 function sync(){const chinese=language()==='zh-CN';note.textContent=chinese?'只改变整理后的阅读方式，不修改你的原始内容。':'Only changes how organized content reads. Your original content stays unchanged.';legend.textContent=chinese?'选择整理方式':'Choose an organize style';for(const [key,zh,en,descriptionZh,descriptionEn]of choices){const label=labels.get(key),input=inputs.get(key);label.title.textContent=chinese?zh:en;label.description.textContent=chinese?descriptionZh:descriptionEn;input.disabled=!state.editable;input.checked=state.value?.available===true&&state.value.value===key;}status.textContent=feedback[state.feedback]?.[chinese?0:1]||'';status.dataset.kind=['read-error','save-error','save-unknown','conflict'].includes(state.feedback)?'error':'status';fieldset.setAttribute('aria-busy',String(state.busy));detail?.sync();}
 host.append(detail.row);runtime?.onMessage?.addListener(message=>{if(message?.type==='PAIA_SETTINGS_AI_STYLE_CHANGED'||message?.type==='ARCHIVE_CHANGED'&&message.cause==='PAIA_BACKUP_RESTORE')void state.load();});storage?.onChanged?.addListener((changes,area)=>{const change=area==='local'&&changes[STORAGE_KEY];if(change&&JSON.stringify(change.oldValue?.preferences?.aiOrganizeStyle)!==JSON.stringify(change.newValue?.preferences?.aiOrganizeStyle))void state.load();});
 const owner={...detail,state,sync,refresh:()=>state.load()};owners.set(host,owner);sync();void state.load();return owner;
}
