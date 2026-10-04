import {element} from './common.js';

const c=(zh,en)=>document.documentElement.lang.startsWith('en')?en:zh;
const pages=[['task','01 目的','01 Purpose'],['select','02 材料','02 Materials'],['retrieve','03 补充','03 Additions'],['review','04 核对','04 Review'],['ready','05 准备完成','05 Ready']];
const titles={task:['这次准备让 AI 帮你做什么？','What would you like AI to help you with?'],select:['选择本次材料','Choose materials for this task'],retrieve:['补充可能相关的材料','Find relevant additions'],review:['这次准备带给 AI 的内容','The content you will bring to AI'],ready:['准备完成','Ready preview']};
const unavailable=()=>c('设计预览：功能尚未开放，不会执行操作。','Design preview: this feature is not available and no action will run.');
const text=value=>typeof value==='string'?value:'';

function action(zh,en,name){const button=element('button','',c(zh,en));button.type='button';button.disabled=true;button.title=unavailable();button.dataset.previewAction=name;return button;}
function search(zh,en){const label=element('label','context-presentation-search'),input=element('input');input.type='search';input.placeholder=c(zh,en);input.setAttribute('aria-label',input.placeholder);input.disabled=true;label.append(input);return label;}
function materials(items,{supplements=false}={}){
 const list=element('div','material-list');
 for(const [index,item]of items.entries()){
  const row=element('section','material-row'),box=element('input','context-material-checkbox'),body=element('div','context-material-body');
  row.dataset.previewMaterial=String(item.id??index);box.type='checkbox';box.checked=!supplements;box.disabled=true;box.setAttribute('aria-label',c(supplements?'加入补充':'选择材料',supplements?'Add supplement':'Select material')+' '+(index+1));
  if(item.title)body.append(element('strong','material-row-title',text(item.title)));
  body.append(element('p','material-snippet',text(item.body)),element('small','material-source-role',text(item.meta)||c(supplements?'文字匹配 · 尚未加入本次':'用户选择 · 完整范围将在核对前确认',supplements?'Text match · Not included':'User selection · Full scope to be checked before review')));
  row.append(box,body);list.append(row);
 }
 return list;
}

/**
 * UI-only, synthetic design preview. No ContextController, RPC, permission,
 * compilation, clipboard, export, or persistence dependency is connected.
 * model: {purpose, materials:[{id,title,body,meta}], suggestions:[...],
 *         output: string | {purpose,sections:[{title,paragraphs,body,meta}]}}
 */
export function mountContextWorkspacePreview({host,headerHost,stage='task',model={}}={}){
 if(!host)throw new TypeError('A Context preview host is required');
 const root=element('section','material-workbench');root.id='context-workspace-design-preview';root.dataset.contextPresentation='desktop-preview';root.dataset.location='page';root.setAttribute('aria-label',c('AI Context 设计预览','AI Context design preview'));
 const header=element('header','context-presentation-header'),scope=action('本次使用范围','Scope for this task','scope');header.append(element('span','context-space-title','AI Context'),scope);scope.className='material-permissions-open';
 const workspace=element('article','context-presentation-workspace'),nav=element('nav','context-presentation-steps');nav.setAttribute('aria-label',c('设计预览页面','Design preview pages'));
 const links=new Map(),panels=new Map();
 const heading=element('h1'),local=element('small','context-presentation-local',c('设计预览 · 功能未开放','Design preview · Not available'));
 const headingRow=element('div','context-presentation-heading');headingRow.append(heading,local);
 for(const [id,zh,en]of pages){const button=element('button','',c(zh,en));button.type='button';button.dataset.contextPreviewPage=id;button.addEventListener('click',()=>setStage(id));links.set(id,button);nav.append(button);}
 workspace.append(nav,headingRow);
 for(const id of ['task','select','retrieve','review','ready']){const panel=element('section','context-presentation-panel');panel.dataset.contextPanel=id;panels.set(id,panel);workspace.append(panel);}
 const task=panels.get('task'),purposeLabel=element('label','material-field',c('本次目的','Purpose for this task')),purpose=element('textarea');purpose.value=text(model.purpose);purpose.readOnly=true;purpose.setAttribute('aria-label',c('本次目的（设计示例）','Task purpose (design example)'));purpose.placeholder=c('例如：准备一次产品设计面试，希望 AI 了解我的职业选择，以及那些还没有决定的部分。','For example: prepare for a product design interview, including my career choices and the questions I am still working through.');purposeLabel.append(purpose);
 task.append(purposeLabel,element('p','context-presentation-help',c('可先从档案或主题选取材料，再继续补充目的。','You can choose materials from Archive or a Topic before finishing the purpose.')));
 const taskActions=element('div','context-presentation-actions');taskActions.append(action('选择材料','Choose materials','choose'));task.append(taskActions);
 for(const id of ['select','retrieve']){
  const panel=panels.get(id),retrieving=id==='retrieve';panel.append(element('p','context-presentation-subtitle',retrieving?c('从已允许的资料中按文字匹配查找，未自动加入。','Search existing allowed materials by text match. Nothing is added automatically.'):c('完整主题不等于当前可见的几条内容。','A whole Topic includes more than the entries currently visible.')),retrieving?search('搜索允许范围内的补充','Search additions within the allowed scope'):search('搜索可选材料','Search available materials'),element('h2','material-count',c('你选择的材料','Your selected materials')),materials(Array.isArray(model.materials)?model.materials:[]));
  if(retrieving)panel.append(element('h2','context-suggestions-heading',c('PAIA 找到的补充','Additions found by PAIA')),materials(Array.isArray(model.suggestions)?model.suggestions:[],{supplements:true}));
  const footer=element('div','context-presentation-actions');footer.append(action('继续核对','Continue to review','review'));panel.append(footer);
 }
 for(const id of ['review','ready']){
  const panel=panels.get(id);panel.append(element('p','context-presentation-subtitle',c('逐段核对。这里的改动只影响本次输出，不会修改你的档案。','Review each passage. Changes here affect only this output and do not change your Archive.')));
  const controls=element('div','context-presentation-review-tools');controls.append(action('编辑或隐去内容','Edit or redact content','edit'),action('调整材料','Adjust materials','adjust'),element('small','',c('本次输出 · 不写回档案','This output only · Archive stays unchanged')));panel.append(controls);
  if(typeof model.output==='string')panel.append(element('pre','material-output',model.output));
  else{
   const output=model.output||{};panel.append(element('h2','',c('本次任务','Current task')),element('p','context-preview-prose',text(output.purpose)||text(model.purpose)));
   for(const section of Array.isArray(output.sections)?output.sections:[]){if(section.title)panel.append(element('h2','',text(section.title)));const paragraphs=Array.isArray(section.paragraphs)?section.paragraphs:[section.body];for(const paragraph of paragraphs)if(typeof paragraph==='string')panel.append(element('p','context-preview-prose',paragraph));if(section.meta)panel.append(element('small','material-source-role',text(section.meta)));}
  }
  const footer=element('div','context-presentation-actions');if(id==='review')footer.append(action('确认当前内容','Confirm this content','confirm'));const copy=action('复制','Copy','copy');if(id==='ready')copy.className='primary';footer.append(copy,action('导出','Export','export'));panel.append(footer);
 }
 const disclosure=element('p','context-preview-disclosure',c('此页仅展示界面。材料选择、检索、核对、复制和导出均未开放；示例不代表已授权、已核验或已准备完成。','This page only previews the interface. Material selection, retrieval, review, copy and export are unavailable. Examples do not indicate authorization, validation or a completed task.'));workspace.append(disclosure);
 root.append(workspace);if(headerHost)headerHost.append(header);else root.prepend(header);host.append(root);
 function setStage(value){const id=String(value).replace(/^context-/,'');if(!panels.has(id))throw new RangeError('Unknown Context preview page');for(const [key,panel]of panels)panel.hidden=key!==id;for(const [key,button]of links){if(key===id)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}root.dataset.contextStep=id;root.dataset.mode=['review','ready'].includes(id)?'preview':'tray';heading.textContent=c(...titles[id]);return id;}
 setStage(stage);
 return {root,header,setStage,dispose(){header.remove();root.remove();}};
}
