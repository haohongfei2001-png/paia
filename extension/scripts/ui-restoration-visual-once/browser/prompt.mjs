// Visual-only loopback boundary. The R3 host/layout/private UI are loaded from
// untouched production files. This is NOT extension, caller, real-host,
// insertion, native-undo, private-origin or provider qualification.
const sceneIds=new Set(['orb-idle','orb-expanded','orb-capsule','nib-normal','nib-search','nib-search-narrow','nib-narrow','nib-status-dirty','nib-status-dirty-narrow','nib-long-notice','nib-long-notice-narrow','nib-copy-failure','nib-keyboard-ime-dirty-dark']);
const longNoticeScenes=new Set(['nib-long-notice','nib-long-notice-narrow','nib-copy-failure']);
let current=null;
const textOf=input=>typeof input==='string'?input:[input?.text,input?.body,input?.workingText,input?.content,input?.inputText].find(value=>typeof value==='string');
function fixtureItems(fixture){
 const inputs=fixture?.inputs;if(!Array.isArray(inputs)||inputs.length<6)throw Error('PROMPT_REQUIRES_SIX_EXISTING_SHARED_INPUTS');
 return inputs.slice(0,6).map((input,index)=>{
  const text=textOf(input);if(!text?.trim()||[...new Intl.Segmenter(undefined,{granularity:'grapheme'}).segment(text)].length>150)throw Error('PROMPT_SHARED_INPUT_MUST_BE_COMPLETE_QUICK_EXPRESSION_'+index);
  return {id:'visual-prompt-'+index,text,members:[],conversations:0,score:0,hidden:false,edited:true,useful:true,pinned:false,retained:true};
 });
}
const handled=data=>({handled:true,data});
const prefs=scene=>({appearance:scene.theme||'light',language:'zh-CN'});
async function emitHost(message){
 if(typeof globalThis.__paiaVisualEmit!=='function')throw Error('PROMPT_RUNTIME_MESSAGE_FIXTURE_MISSING');
 return globalThis.__paiaVisualEmit(message,{id:chrome.runtime.id,url:location.origin+'/ui/archive.html'});
}
export async function fixtureRPC(message,{scene,fixture}){
 if(!sceneIds.has(scene?.id))return null;
 if(!current)current={scene,items:fixtureItems(fixture),collapsedForm:scene.id==='orb-capsule'?'capsule':'orb',open:false};
 if(message.type==='PAIA_PROMPT_SURFACE_HOST'){
  if(message.state){current.open=message.state.open===true;current.collapsedForm=message.state.collapsedForm==='capsule'?'capsule':'orb';}
  return handled({version:1,open:current.open,position:null,positionGeneration:0,collapsedForm:current.collapsedForm,displayPreferences:prefs(scene)});
 }
 if(message.type==='PAIA_PROMPT_SURFACE_REQUEST_CLOSE'){
  if(typeof globalThis.__paiaVisualForwardPromptClose!=='function')throw Error('PROMPT_CLOSE_BRIDGE_MISSING');
  const reply=await globalThis.__paiaVisualForwardPromptClose(message);
  if(reply?.received!==true)throw Error('PROMPT_CLOSE_NOT_RECEIVED');
  return handled(reply);
 }
 if(message.type!=='PAIA_PROMPT_SURFACE_RPC')return null;
 const command=message.command;
 switch(command?.type){
  case 'PAIA_PROMPT_QUERY':return handled({items:current.items,revision:1,generation:1,manualOrder:[],displayPreferences:prefs(scene),surfaceForm:current.open?'board':current.collapsedForm,automaticSuggestion:false,oversizedItems:[],manualConflict:null,target:null});
  case 'history_candidates_status':return handled({available:false});
  case 'suggestion_current':return handled({source:'local',result:null});
  case 'measure':return handled(await emitHost({type:'PAIA_PROMPT_SURFACE_MEASURE',nonce:message.nonce,height:command.height,minimumHeight:command.minimumHeight,appearance:command.appearance,language:command.language}));
  case 'surface_form':{
   const result=await emitHost({type:'PAIA_PROMPT_SURFACE_FORM',nonce:message.nonce,form:command.form});return handled(result);
  }
  case 'close':if(longNoticeScenes.has(scene.id)||scene.id==='nib-keyboard-ime-dirty-dark')throw Error('PROMPT_GAP_UNEXPECTED_CLOSE');return handled(await emitHost({type:'PAIA_PROMPT_SURFACE_CLOSE',nonce:message.nonce}));
  case 'PAIA_PROMPT_SELECTION_INSERT':{
   // The real UI sends INSERT directly. This isolated boundary only REFUSES
   // that request: no receiver, action token, insertion implementation or ACK.
   const ref=command.ref,keys=Object.keys(command);
   if(!longNoticeScenes.has(scene.id)||command.range!==null||command.target!==null||
      ref?.kind!=='manual_reuse'||ref.id!==current.items[0].id||ref.revision!==1||ref.generation!==1||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(command.operationId||'')||
      keys.some(key=>!['type','ref','range','target','operationId'].includes(key))||current.insertionRefusals)
    throw Error('PROMPT_VISUAL_INSERT_REFUSAL_NOT_ALLOWLISTED');
   current.insertionRefusals=1;
   return {handled:true,expectedFailure:{error:'UNAVAILABLE',boundary:'synthetic_no_receiver'}};
  }
  case 'PAIA_PROMPT_COPY_TEXT':{
   const item=current.items[0];
   if(scene.id!=='nib-copy-failure'||command.id!==item.id||command.text!==item.text)throw Error('PROMPT_VISUAL_COPY_READ_NOT_ALLOWLISTED');
   return handled({text:item.text});
  }
  case 'PAIA_PROMPT_HISTORY_QUERY':{
   const query=command.query.trim().toLocaleLowerCase();
   const items=current.items.filter(item=>item.text.toLocaleLowerCase().includes(query)).map(item=>({...item,ref:{kind:'history_input',id:item.id,revision:1}}));
   return handled({items,nextCursor:null,complete:true,searchSnapshot:{version:1,generation:1,signature:'a'.repeat(64)},searchScope:{kind:'all'},target:null});
  }
  default:throw Error('PROMPT_VISUAL_UNAUTHORIZED_RPC_'+String(command?.type));
 }
}
async function loadClassic(path){
 await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=path;script.onload=resolve;script.onerror=()=>reject(Error('PROMPT_SOURCE_LOAD_FAILED_'+path));document.head.append(script);});
}
export async function prepareScene(scene,{fixture}){
 if(!sceneIds.has(scene?.id))return null;
 const items=fixtureItems(fixture);current={scene,items,collapsedForm:scene.id==='orb-capsule'?'capsule':'orb',open:false};
 // This page is a deliberately generic synthetic receiving host. Never clone
 // the PAIA surface, rewrite its stylesheet, or pretend localhost is ChatGPT.
 for(const link of document.querySelectorAll('link[rel=stylesheet]'))link.remove();
 document.body.replaceChildren();document.title='Synthetic R3 host';
 const style=document.createElement('style');style.textContent=`html,body{margin:0;width:100%;height:100%;background:#f8f9fb;color:#717783;font:14px/1.5 Arial,sans-serif}.visual-host-header{position:fixed;inset:0 0 auto;height:64px;padding:0 24px;box-sizing:border-box;display:flex;align-items:center;border-bottom:1px solid #eceff3;background:#fff}.visual-host-note{position:fixed;top:100px;left:24px;font-size:12px;color:#9aa1ac}.visual-host-composer{position:fixed;left:16px;right:16px;bottom:24px;max-width:760px;margin:0 auto;box-sizing:border-box;padding:14px 18px;background:#fff;border:1px solid #e1e5eb;border-radius:24px}.visual-host-input{display:block;box-sizing:border-box;width:100%;height:52px;resize:none;border:0;outline:0;background:transparent;color:#333;font:14px/1.5 Arial,sans-serif}.visual-host-composer-footer{display:flex;align-items:center;justify-content:space-between;height:28px;color:#929aa6;font-size:12px}`;document.head.append(style);
 const header=document.createElement('header');header.className='visual-host-header';header.textContent='Synthetic conversation';
 const note=document.createElement('div');note.className='visual-host-note';note.textContent='Local visual fixture · no account data';
 const form=document.createElement('form');form.className='visual-host-composer';form.setAttribute('aria-label','Synthetic composer');form.addEventListener('submit',event=>event.preventDefault());
 const composer=document.createElement('textarea');composer.className='visual-host-input';composer.dataset.visualPromptComposer='';composer.placeholder='Message';composer.setAttribute('aria-label','Synthetic message');
 const footer=document.createElement('div');footer.className='visual-host-composer-footer';const plus=document.createElement('span');plus.textContent='＋';const label=document.createElement('span');label.textContent='Offline fixture';footer.append(plus,label);form.append(composer,footer);document.body.append(header,note,form);
 // Explicit, nonprivileged host-discovery fixture only. The production
 // ChatGPT adapter's origin guard is neither loaded under a fake origin nor
 // changed. There is intentionally no insertion or receiver capability here.
 globalThis.PAIAChatGPTComposerAdapter=class VisualComposerDiscovery{
  discover(){return composer.isConnected?{node:composer,status:'composer_available'}:{node:null,status:'composer_unrecognized'};}
  find(){return this.discover().node;}
  dispose(){}
 };
 await loadClassic('/core/prompt-surface-layout.js');await loadClassic('/content/prompt-surface.js');
 const frameURL='/ui/prompt-surface.html',actions=[],longNotice=longNoticeScenes.has(scene.id),imeDirty=scene.id==='nib-keyboard-ime-dirty-dark';
 if(!['orb-idle','orb-capsule'].includes(scene.id))actions.push({selector:'[data-paia-prompt-surface]',action:'click'});
 if(scene.id.startsWith('nib-search')||scene.id.startsWith('nib-status-dirty')||longNotice||imeDirty)actions.push({frameURL,selector:'#list .row:nth-child(6)',action:'wait'});
 if(scene.id.startsWith('nib-search')){
  actions.push({frameURL,selector:'#open-search',action:'click'},{frameURL,selector:'#search-query',action:'fill',value:Array.from(items[0].text.trim()).slice(0,3).join('')});
 }
 if(scene.id.startsWith('nib-status-dirty'))actions.push({frameURL,selector:'#surface-more',action:'click'},{frameURL,selector:'#surface-tools:not([hidden])',action:'wait'},{frameURL,selector:'#new',action:'click'},{frameURL,selector:'#editor textarea',action:'fill',value:items[0].text},{selector:'[data-paia-prompt-surface]',action:'click'});
 if(longNotice)actions.push({frameURL,selector:'#list .row:first-child .insert',action:'click'},{frameURL,selector:'#status button[aria-label="复制"]:not(:disabled)',action:'wait'});
 if(scene.id==='nib-copy-failure')actions.push({frameURL,selector:'#status button[aria-label="复制"]',action:'click'});
 if(imeDirty)actions.push({frameURL,selector:'#surface-more',action:'click'},{frameURL,selector:'#surface-tools:not([hidden])',action:'wait'},{frameURL,selector:'#new',action:'click'},{frameURL,selector:'#editor textarea',action:'fill',value:items[0].text},{frameURL,selector:'#editor textarea',action:'focus'},{frameURL,selector:'#editor textarea',action:'ime',value:Array.from(items[0].text)[0]},{frameURL,selector:'#editor textarea',action:'observe',label:'ime-start'},{frameURL,selector:'#editor textarea',action:'press',value:'Escape'},{frameURL,selector:'#editor textarea',action:'observe',label:'ime-escape'},{frameURL,selector:'#editor textarea',action:'ime',value:''},{frameURL,selector:'#editor textarea',action:'press',value:'Escape'});
 const statusSelector=scene.id==='nib-copy-failure'?'#status[data-quiet="false"]:has-text("未能复制，请检查浏览器权限。")':longNotice?'#status[data-quiet="false"]:has-text("插入结果未确认。请先检查草稿，不会自动重试。")':imeDirty?'#status[data-quiet="false"]:has-text("请先保存或取消编辑。")':null;
 return {handled:true,readySelector:scene.id==='orb-idle'?'[data-paia-prompt-surface]':{frameURL,selector:statusSelector||(scene.id.startsWith('nib-status-dirty')?'#status[data-quiet="false"]:not(:empty)':scene.id==='orb-capsule'?'#capsule-use':scene.id.startsWith('nib-search')?'.row.history':'.row:nth-child(6)')},actions,evidence:{sourceOwners:['core/prompt-surface-layout.js','content/prompt-surface.js','ui/prompt-surface.html','ui/prompt-surface.css','ui/prompt-surface.js'],syntheticBoundary:'loopback chrome.runtime RPC and nonprivileged composer discovery',sharedInputIndexes:[0,1,2,3,4,5],additionalInputs:0,expectedInsertionRefusal:longNotice?'UNAVAILABLE':null,receiverImplemented:false,successfulInsertionAcknowledged:false,clipboardDenied:scene.id==='nib-copy-failure',nativeCompositionRequested:imeDirty,longNoticeIsMaximumHeightClaim:false,realHostOriginQualification:false,extensionIsolationQualification:false,insertionOrProviderQualification:false}};
}
