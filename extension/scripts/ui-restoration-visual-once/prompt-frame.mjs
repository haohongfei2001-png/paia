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
   if(caller.page!==page||caller.frame!==page.mainFrame()||!['nib-status-dirty','nib-status-dirty-narrow'].includes(scene.id))throw Error('PROMPT_CLOSE_CALLER_OR_SCENE_REFUSED');
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
 const frame=resolvePromptFrame(page,base);
 return frame.evaluate(()=>{
  const rect=node=>{if(!node)return null;const r=node.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
  const frame=window.frameElement,root=frame?.getRootNode(),host=parent.document.querySelector('[data-paia-prompt-surface]');
  const q=selector=>document.querySelector(selector),css=node=>node?node.ownerDocument.defaultView.getComputedStyle(node):null;
  const skin=root?.querySelector('.surface-skin'),control=root?.querySelector('button[aria-controls="paia-prompt-private"]'),rows=[...document.querySelectorAll('.row')],status=q('#status');
  return {scope:'actual child-frame DOM on loopback synthetic RPC; not extension or real-host qualification',frameURL:location.href,mode:host?.dataset.surfaceForm,host:rect(host),ownerPlacement:parent.PAIAPromptSurface?.nextPlacement(),frame:rect(frame),frameClip:css(frame)?.clipPath,skin:rect(skin),skinRadius:css(skin)?.borderRadius,skinFill:css(skin)?.backgroundColor,control:rect(control),header:rect(q('header')),list:rect(q('#list')),rows:rows.map(rect),rowCount:rows.length,layoutPending:document.documentElement.hasAttribute('data-layout-pending'),nativeTitleCount:document.querySelectorAll('[title]').length,customTooltipCount:document.querySelectorAll('[role=tooltip]').length,status:status?{text:status.textContent,nonempty:!!status.textContent,quiet:status.dataset.quiet,position:css(status).position,overflow:css(status).overflow,rect:rect(status)}:null,editor:{visible:!!q('#editor')&&!q('#editor').hidden,textareaLength:q('#editor textarea')?.value.length??null}};
 });
}
