import {element} from './common.js';
import {thoughtCopy as tc} from './thought-copy.js';

const english={
 '写下想法':'Write a thought',
 '写下此刻的想法，不改写过去的输入。':'Write what is on your mind now. Earlier inputs stay unchanged.',
 '主题':'Topic',
 '更多':'More',
 '外观预览：保存与返回尚未接通。文字仅留在本页，可继续编辑、选择主题或复制。':'Appearance preview: saving and returning are not connected yet. Text stays on this page; you can edit, choose a topic or copy it.',
 '外观预览不能创建主题；已有主题仍可选择。':'This appearance preview cannot create topics. You can still choose an existing topic.'
};
export const composeCopy=text=>document.documentElement.lang==='en'?(english[text]||tc(text)):text;

// Presentation owns nodes only. TopicActions owns the draft, selected Topics,
// acknowledgement lifecycle and every effect handler in both presentations.
export function createThoughtComposeNodes({topicId,quote=''}={}){
 const explanation=element('p','muted',tc('这会保存为今天的新想法，不修改以前的内容。'));
 let quotePreview=null;
 if(quote){quotePreview=element('details');quotePreview.append(element('summary','',tc('参考文字')),element('pre','topic-selection-preview',quote));}
 const draft=element('textarea','thought-draft');draft.setAttribute('aria-label',tc('今天的新想法'));draft.placeholder=tc('接着写…');
 const destination=element('p','muted',topicId?tc('保存到当前主题'):tc('暂不加入主题'));
 const choices=element('details'),choiceHost=element('div');choices.append(element('summary','',tc('选择主题（可不选）')),choiceHost);
 return {explanation,quotePreview,draft,destination,choices,choiceHost};
}

export function mountThoughtComposePresentation({content,feedback,nodes,submit,copy,cancel,workspacePreview=false}){
 const {explanation,quotePreview,draft,destination,choices}=nodes;
 const optional=[quotePreview].filter(Boolean);
 if(!workspacePreview){content.append(explanation,...optional,draft,destination,choices,submit,copy,cancel);return {};}

 const heading=element('h1','thought-compose-title',composeCopy('写下想法'));heading.id='thought-compose-workspace-title';content.setAttribute('aria-labelledby',heading.id);
 explanation.className='thought-compose-explanation';explanation.textContent=composeCopy('写下此刻的想法，不改写过去的输入。');
 const topicLabel=element('label','thought-compose-topic',composeCopy('主题')),topicSelect=element('select');topicSelect.setAttribute('aria-label',composeCopy('主题'));topicLabel.append(topicSelect);
 const actions=element('div','thought-compose-actions');submit.className='thought-compose-save';cancel.className='thought-compose-cancel';actions.append(submit,cancel);
 const notice=element('p','thought-compose-preview-note',composeCopy('外观预览：保存与返回尚未接通。文字仅留在本页，可继续编辑、选择主题或复制。'));notice.id='thought-compose-preview-note';
 for(const control of [submit,cancel]){control.disabled=true;control.setAttribute('aria-describedby',notice.id);}
 const more=element('details','thought-compose-more');more.append(element('summary','',composeCopy('更多')),copy,...optional,destination,choices);
 feedback.className='topic-action-feedback thought-compose-feedback';
 content.append(heading,explanation,topicLabel,draft,actions,notice,feedback,more);
 return {heading,topicSelect,more,notice};
}
