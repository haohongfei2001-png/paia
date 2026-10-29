// Synthetic RPC boundary only. Resolve the actual private source frame through
// Playwright identity, not parent-window enumeration of a closed shadow root.
const path='/ui/prompt-surface.html';
export function resolvePromptFrame(page,base,nonce=null){
 const matches=page.frames().filter(frame=>{
  if(frame===page.mainFrame()||frame.parentFrame()!==page.mainFrame())return false;
  try{const url=new URL(frame.url());return url.origin===base&&url.pathname===path&&!url.search&&url.hash.length>1&&(nonce===null||url.hash.slice(1)===nonce);}catch{return false;}
 });
 if(matches.length!==1)throw Error('PROMPT_FRAME_IDENTITY_COUNT_'+matches.length);
 return matches[0];
}
export async function installPromptCloseBridge(page,base,scene,transcript){
 await page.exposeBinding('__paiaVisualForwardPromptClose',async(caller,message)=>{
  const entry={type:message?.type,nonce:message?.nonce,at:Date.now(),delivered:false,received:false};transcript.push(entry);
  try{
   if(caller.page!==page||caller.frame!==page.mainFrame()||!['nib-status-dirty','nib-status-dirty-narrow','nib-keyboard-ime-dirty-dark'].includes(scene.id))throw Error('PROMPT_CLOSE_CALLER_OR_SCENE_REFUSED');
   if(message?.type!=='PAIA_PROMPT_SURFACE_REQUEST_CLOSE'||typeof message.nonce!=='string'||!message.nonce||Object.keys(message).some(key=>!['type','nonce'].includes(key)))throw Error('PROMPT_CLOSE_SHAPE_REFUSED');
   const frame=resolvePromptFrame(page,base,message.nonce);entry.frameURL=frame.url();
   const response=await frame.evaluate(async({message,base})=>{
    if(typeof globalThis.__paiaVisualEmit!=='function')throw Error('PROMPT_FRAME_EMITTER_MISSING');
    return globalThis.__paiaVisualEmit(message,{id:chrome.runtime.id,url:base+'/ui/archive.html'});
   },{message,base});
   entry.delivered=true;entry.response=response??null;
   if(response?.received!==true)throw Error('PROMPT_CLOSE_NO_ACTUAL_ACK');
   entry.received=true;return response;
  }catch(error){entry.error=String(error);throw error;}
 });
}
export async function readPromptGeometry(page,base){
 // Idle Orb intentionally has no private frame: the original content owner
 // creates one only on expand/capsule/suggestion. This exact scene is not a
 // fallback for a missing/incorrect frame in any opened Prompt state.
 const sceneId=await page.evaluate(()=>globalThis.__PAIA_VISUAL_CONFIG?.scene?.id);
 if(sceneId==='orb-idle'){
  if(page.frames().some(frame=>frame!==page.mainFrame()))throw Error('PROMPT_IDLE_UNEXPECTED_CHILD_FRAME');
  return page.evaluate(base=>{
   const config=globalThis.__PAIA_VISUAL_CONFIG,url=new URL(location.href);
   if(config?.scene?.id!=='orb-idle'||config.scene.group!=='prompt'||config.base!==base||url.origin!==base||url.pathname!=='/ui/archive.html'||url.search||url.hash)throw Error('PROMPT_IDLE_SCENE_IDENTITY');
   const hosts=document.querySelectorAll('[data-paia-prompt-surface]');
   if(hosts.length!==1)throw Error('PROMPT_IDLE_HOST_IDENTITY_COUNT_'+hosts.length);
   const host=hosts[0],css=getComputedStyle(host),rect=node=>{if(!node)return null;const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};},bounds=rect(host);
   if(host.hidden||host.dataset.surfaceForm!=='orb'||host.dataset.expanded!=='false'||css.display==='none'||css.visibility==='hidden'||bounds.width<=0||bounds.height<=0)throw Error('PROMPT_IDLE_HOST_NOT_VISIBLE_OR_COLLAPSED');
   return {scope:'actual idle host DOM on loopback synthetic fixture; private frame intentionally not created; not extension or real-host qualification',mode:host.dataset.surfaceForm,host:bounds,hostExpanded:host.dataset.expanded,hostTheme:host.dataset.theme,privateFrameState:'NOT_CREATED_EXPECTED_IDLE',frameURL:null,frame:null,frameClip:null,ownerPlacement:null,composer:rect(document.querySelector('[data-visual-prompt-composer]')?.closest('form')),skin:null,skinRadius:null,skinFill:null,control:null,header:null,list:null,rows:null,rowCount:null,layoutPending:null,nativeTitleCount:null,customTooltipCount:null,status:null,editor:null,inputEvents:globalThis.__paiaVisualInputEvents||[],clipboardDenied:null,unmeasured:['closed-shadow skin and control internals','private-frame-only fields: no frame exists in this state']};
  },base);
 }
 const frame=resolvePromptFrame(page,base);
 return frame.evaluate(()=>{
  const rect=node=>{if(!node)return null;const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
  const frame=window.frameElement,root=frame?.getRootNode(),host=parent.document.querySelector('[data-paia-prompt-surface]');
  const q=selector=>document.querySelector(selector),css=node=>node?node.ownerDocument.defaultView.getComputedStyle(node):null;
  const skin=root?.querySelector('.surface-skin'),control=root?.querySelector('button[aria-controls="paia-prompt-private"]'),rows=[...document.querySelectorAll('.row')],status=q('#status');
  return {scope:'actual child-frame DOM on loopback synthetic RPC; not extension or real-host qualification',frameURL:location.href,mode:host?.dataset.surfaceForm,host:rect(host),ownerPlacement:parent.PAIAPromptSurface?.nextPlacement(),frame:rect(frame),frameClip:css(frame)?.clipPath,skin:rect(skin),skinRadius:css(skin)?.borderRadius,skinFill:css(skin)?.backgroundColor,control:rect(control),header:rect(q('header')),list:rect(q('#list')),rows:rows.map(rect),rowCount:rows.length,layoutPending:document.documentElement.hasAttribute('data-layout-pending'),nativeTitleCount:document.querySelectorAll('[title]').length,customTooltipCount:document.querySelectorAll('[role=tooltip]').length,status:status?{text:status.textContent,nonempty:!!status.textContent,quiet:status.dataset.quiet,position:css(status).position,overflow:css(status).overflow,rect:rect(status)}:null,inputEvents:globalThis.__paiaVisualInputEvents||[],clipboardDenied:globalThis.__paiaVisualClipboardDenied||null,editor:{text:q('#editor textarea')?.value??null,visible:!!q('#editor')&&!q('#editor').hidden,textareaLength:q('#editor textarea')?.value.length??null}};
 });
}
