import {element,request} from './common.js';
import {setIconLabel} from './icons.js';

// Shared ordinary-workspace transition for normal composition and the explicit
// visual review entry. It mounts the same real production owners;
// documentation specimens are never loaded by the runtime.
let current=null,opening=0;
export function closeDesktopAppearancePreview(){opening++;if(current&&!current.close())return false;current=null;return true;}
const get=id=>document.getElementById(id);
async function stylesheet(name){
 const href=chrome.runtime.getURL('ui/'+name);let link=[...document.styleSheets].find(sheet=>sheet.href===href);if(link)return;
 await new Promise((resolve,reject)=>{link=element('link');link.rel='stylesheet';link.href=href;link.onload=resolve;link.onerror=()=>reject(Error('PREVIEW_STYLE_UNAVAILABLE'));document.head.append(link);});
}
export async function openDesktopAppearancePreview(owners,{screen,topicId,scope,step='task',model={},composeOptions={},organizeOptions={}}={}){
 if(!['topic','compose','organize','context'].includes(screen))throw Error('PREVIEW_SCREEN_INVALID');
 if(!closeDesktopAppearancePreview())return false;const intent=++opening;
 await stylesheet('desktop-appearance-preview.css');
 if(intent!==opening)return false;
 if(!await owners.navigate('thoughts',null,null,{keepAppearancePreview:true})||intent!==opening)return false;
 if(topicId){const opened=await owners.thoughts.open(topicId);if(intent!==opening||opened!==owners.thoughts.openIntent||owners.thoughts.id!==topicId||owners.thoughts.readFailed)return false;}
 await stylesheet(screen==='context'?'context-workspace-presentation.css':screen==='topic'?'topic-workspace-presentation.css':screen==='compose'?'thought-compose-workspace.css':'organize-scope-workspace.css');
 const contextModule=screen==='context'?await import('./context-workspace-presentation.js'):null,scopeModule=screen==='organize'?await import('./organize-scope-workspace.js'):null;
 if(intent!==opening)return false;
 const hidden=[],remember=(node,value)=>{if(node){hidden.push({node,hidden:node.hidden});node.hidden=value;}},created=[],workspace=document.querySelector('.workspace'),header=document.querySelector('.workspace-header');
 let presenter=null,host=null;
 if(screen==='context'){
  // The former Context feature plan is withdrawn. Mount only an explicitly
  // synthetic display; never activate its old controller or actions.
  remember(get('thought-panel'),true);for(const child of [...header.children])remember(child,true);
  host=element('section','dvn-preview-workspace');host.id='desktop-appearance-preview-workspace';workspace.append(host);created.push(host);
  presenter=contextModule.mountContextWorkspacePreview({host,headerHost:header,stage:step,model});
 }else{
  if(screen==='topic'){
   presenter=owners.thoughts.enableDesktopPresentation();
  }else{
   remember(get('thought-panel'),true);for(const child of [...header.children])remember(child,true);
   if(screen==='compose'){const context=element('div','thought-compose-context');context.append(element('h2','',topicId?(owners.thoughts.topic?.name||'主题'):'Thought Library'),element('p','',topicId?'从主题阅读写下新的表达；可另选主题。':'独立写下新的表达；可选择已有主题。'));header.append(context);created.push(context);}
   const back=element('button','dvn-preview-back');setIconLabel(back,'back',screen==='compose'?'返回':(scope?.topicName||owners.thoughts.topic?.name||'主题'));back.type='button';back.disabled=true;back.title='主工作区返回接线尚未完成';header.append(back);created.push(back);
   host=element('section','dvn-preview-workspace');host.id='desktop-appearance-preview-workspace';workspace.append(host);created.push(host);
   if(screen==='compose'){
    // Mount is completed below after teardown ownership is installed.
   }else{
    presenter=scopeModule.mountOrganizeScopeWorkspace({host,scope,previewOnly:true,stage:organizeOptions.stage,model:organizeOptions.model});
   }
  }
 }
 document.body.dataset.desktopAppearancePreview=screen;
 const session={screen,host,presenter,close(){
  if(screen==='compose'&&!owners.actions.close())return false;
  if(screen==='context'||screen==='organize')presenter.dispose();
  if(screen==='topic'){const active=owners.thoughts.desktopPresentation;active?.dispose();if(owners.thoughts.desktopPresentation===active)owners.thoughts.desktopPresentation=null;owners.thoughts.updateTopicContinuous();}
  for(const row of hidden.toReversed())row.node.hidden=row.hidden;for(const node of created)node.remove();delete document.body.dataset.desktopAppearancePreview;return true;
 }};current=session;
 const exit=element('button','dvn-preview-exit','退出界面预览');exit.type='button';exit.onclick=()=>{if(closeDesktopAppearancePreview())void owners.navigate('settings');};(screen==='context'?presenter.header:header).append(exit);created.push(exit);
 if(screen==='compose'){await owners.actions.compose({...composeOptions,topicId,workspacePreview:{host},isCurrent:()=>current===session&&intent===opening});if(current!==session||intent!==opening)return false;}
 return session;
}

// A visible, explicit entry into the same components. It never seeds user data.
export function installDesktopAppearancePreviewEntry(open){
 const host=document.getElementById('ux-settings-advanced-group');if(!host||document.getElementById('desktop-appearance-preview-entry'))return;
 const section=element('section'),heading=element('h3','','新版界面预览'),note=element('p','muted','查看 D5 完整页面。未开放的编写、整理和 AI Context 功能会明确标示；此入口不会替你授权外部处理。'),status=element('p','muted');section.id='desktop-appearance-preview-entry';status.setAttribute('role','status');section.append(heading,note);
 for(const [screen,label]of [['topic','思想阅读'],['compose','写下想法'],['organize','整理范围'],['context','AI Context 界面']]){const button=element('button','',label);button.type='button';button.onclick=async()=>{button.disabled=true;try{let topicId,scope;if(screen!=='context'){const result=await request('LIBRARY_INDEX_PAGE',{options:{mode:'stable',limit:1}});topicId=result.items?.[0]?.id;if(screen!=='compose'&&!topicId){status.textContent='目前没有主题可供展示。已有档案保持原样。';return;}if(screen==='organize')scope=await request('GET_AI_PRESENTATION_SCOPE',{options:{topicId}});}const shown=await open({screen,topicId,scope});if(!shown)status.textContent='页面未切换；请先处理仍在编辑的内容。';}catch{status.textContent='界面预览未打开，已有内容未改变。';}finally{button.disabled=false;}};section.append(button);}
 section.append(status);host.append(section);
}
