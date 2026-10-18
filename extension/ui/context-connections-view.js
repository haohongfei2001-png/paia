import {element,request} from './common.js';

const copy=(zh,en)=>document.documentElement.lang==='en'?en:zh;
const button=(text,action,style='standard-button')=>{const node=element('button',style,text);node.type='button';node.addEventListener('click',action);return node;};
const states={connected:['已连接','Connected'],paused:['已暂停','Paused'],revoked:['已撤销','Revoked'],disconnected:['未连接','Disconnected'],expired:['连接已到期','Connection expired'],reconnect_required:['需重新配对','Pair again']};

// Existing Context connection detail only. No new navigation destination,
// body preview, AI directory or implicit permission/connection is created.
export class ContextConnectionsView {
 constructor({host,status}){this.host=host;this.status=status;this.active=true;this.busy=false;this.secret=null;this.secretTimer=null;this.onLocale=()=>this.localize();document.addEventListener?.('paia:preferences-applied',this.onLocale);this.render();}
 localize(){if(!this.active)return;if(!this.secret){if(!this.busy)this.render();return;}this.secretHeading.textContent=copy('保存这次连接凭证','Save this connection credential');this.secretExplanation.textContent=this.credentialExplanation();this.secretCopy.textContent=copy('复制凭证','Copy credential');this.secretDone.textContent=copy('已保存，隐藏凭证','Saved, hide credential');this.secretInput.setAttribute('aria-label',copy('一次性显示的连接凭证','Connection credential shown once'));}
 credentialExplanation(){return copy('本次连接有效期为 1 小时，到期需重新配对。凭证仅在此显示一次，60 秒后隐藏。把它填入已核验的专用 ChatGPT 连接认证设置。不要分享、放进网址或发到聊天中。','This connection expires in one hour and requires pairing again. The credential is shown once and hidden after 60 seconds. Enter it only in the verified dedicated ChatGPT connection authentication settings. Do not share it, put it in a URL or send it in chat.');}
 update(status){if(!this.active)return;this.status=status;if(!this.busy&&!this.secret)this.render();}
 clearSecret(){clearTimeout(this.secretTimer);this.secretTimer=null;if(this.secretInput)this.secretInput.value='';this.secret=null;this.secretInput=null;}
 async refresh(){try{const status=await request('PAIA_CONTEXT_CONNECTIONS_STATUS');if(this.active){this.status=status;if(!this.secret)this.render();}}catch{this.notice(copy('无法读取连接状态。','Could not read connection status.'));}}
 notice(text){if(this.feedback)this.feedback.textContent=text;}
 async perform(work){
  if(this.busy||!this.active)return;this.busy=true;this.host.querySelectorAll('button,input').forEach(node=>node.disabled=true);
  try{const result=await work();if(!this.active)return;if(result?.credential)this.showCredential(result.credential);else await this.refresh();}
  catch(error){if(this.active)this.notice(error?.code==='STALE_BASE'?copy('连接状态已变化，请刷新后重试。','Connection changed. Refresh before trying again.'):copy('操作未确认；请刷新核对。已暂停的读取不会自动恢复。','The operation was not confirmed. Refresh to check; paused reads do not restart automatically.'));}
  finally{this.busy=false;if(this.active&&!this.secret)this.render();}
 }
 change(connection,action){return this.perform(()=>request('PAIA_CONTEXT_CONNECTIONS_CHANGE',{options:{id:connection.id,action,expectedRevision:this.status.revision}}));}
 pair(){
  if(!this.ack?.checked||!this.status?.available||this.busy)return;
  const port=Number(this.port.value);if(!Number.isInteger(port)||port<1024||port>65535){this.notice(copy('请输入 1024–65535 之间的本机端口。','Enter a local port between 1024 and 65535.'));return;}
  // Permission is requested only in this explicit user gesture, after the
  // selected destination/data-flow explanation and acknowledgement.
  const permitted=chrome.permissions.request({permissions:['nativeMessaging']});
  return this.perform(async()=>{if(await permitted!==true)throw Error('PERMISSION_DENIED');return request(this.status.reason==='store_changed'?'PAIA_CONTEXT_CONNECTIONS_REPAIR':'PAIA_CONTEXT_CONNECTIONS_PAIR',{options:{expectedRevision:this.status.revision,port}});});
 }
 showCredential(value){
  this.clearSecret();this.secret=value;this.host.replaceChildren();const heading=element('h2','context-connection-heading',copy('保存这次连接凭证','Save this connection credential'));
  const explanation=element('p','quiet-footnote',this.credentialExplanation());this.secretHeading=heading;this.secretExplanation=explanation;
  const field=element('input','context-connection-secret');field.type='password';field.readOnly=true;field.autocomplete='off';field.spellcheck=false;field.value=value;field.setAttribute('aria-label',copy('一次性显示的连接凭证','Connection credential shown once'));this.secretInput=field;
  const actions=element('div','context-connection-actions'),copyButton=button(copy('复制凭证','Copy credential'),async()=>{try{if(!this.active||!this.secret)return;await navigator.clipboard.writeText(this.secret);this.notice(copy('已复制。请妥善保管。','Copied. Keep it secure.'));}catch{this.notice(copy('无法复制，请使用输入框手动复制。','Could not copy. Select the field and copy manually.'));}}),done=button(copy('已保存，隐藏凭证','Saved, hide credential'),()=>{this.clearSecret();void this.refresh();});this.secretCopy=copyButton;this.secretDone=done;actions.append(copyButton,done);this.feedback=element('p','context-notice');this.feedback.setAttribute('role','status');this.host.append(heading,explanation,field,actions,this.feedback);
  this.secretTimer=setTimeout(()=>{this.clearSecret();if(this.active)void this.refresh();},60000);
 }
 render(){
  if(!this.active||this.secret)return;const prior=this.feedback?.textContent||'';this.host.replaceChildren();this.host.classList.add('context-connections-detail');
  const status=this.status,connections=status?.connections||[];
  if(!connections.length)this.host.append(element('p','empty-detail',copy('还没有连接的 AI。','No AI is connected.')));
  for(const connection of connections){
   const row=element('section','context-connection-row'),heading=element('div','context-connection-heading');heading.append(element('h2','','ChatGPT'),element('span','quiet-footnote',copy(...(states[connection.state]||states.disconnected))));row.append(heading,element('p','quiet-footnote',copy('配对的是本机 PAIA 资料库连接，不代表验证了 ChatGPT 账户身份。','This pairing identifies your local PAIA library connection, not a verified ChatGPT account.')));
   const actions=element('div','context-connection-actions');if(connection.state==='connected')actions.append(button(copy('暂停','Pause'),()=>void this.change(connection,'pause')));if(connection.state!=='revoked')actions.append(button(copy('撤销连接','Revoke connection'),()=>void this.change(connection,'revoke')));if(status.available&&connection.state!=='reconnect_required')actions.append(button(copy('重新配对','Pair again'),()=>void this.change(connection,'reconnect')));row.append(actions);this.host.append(row);
  }
  this.host.append(element('p','quiet-footnote',status?.available?copy('通过本机只读桥和专用安全隧道提供已开放的上下文。返回给 ChatGPT 的内容会离开本机并经过 OpenAI。未开放的卡片和主题不会被读取。','The local read-only bridge and dedicated secure tunnel provide only allowed Context. Content returned to ChatGPT leaves this device and passes through OpenAI. Closed cards and Topics are not read.'):copy('外部连接目前不可用，等待账号、专用通路与认证资格核验。开放设置只保存在本机，不会发送内容。','External connections are unavailable. Account, dedicated transport and authentication qualification are pending. Access preferences stay on this device; no content is sent.')));
  if(status?.reason==='store_changed')this.host.append(element('p','context-notice',copy('资料库已恢复或切换。旧连接已失效；重新配对将移除旧连接绑定，为当前资料库生成新的凭证。','The library was restored or switched. Old connections are invalid. Pairing again replaces their bindings and creates a new credential for this library.')));
  if(status?.available&&(status.reason==='store_changed'||connections.filter(c=>c.state!=='revoked').length<8)){
   const form=element('div','context-connection-pair'),label=element('label','context-connection-port',copy('本机桥端口','Local bridge port')),port=element('input');port.type='number';port.min='1024';port.max='65535';port.value='49215';port.inputMode='numeric';label.append(port);this.port=port;
   const acknowledgement=element('label','context-connection-ack'),ack=element('input');ack.type='checkbox';this.ack=ack;acknowledgement.append(ack,element('span','',copy('我确认使用已核验的专用 ChatGPT 连接，并允许它按当前开放范围读取。','I confirm this is the verified dedicated ChatGPT connection and allow reads within my current access choices.')));const connect=button(status.reason==='store_changed'?copy('重新配对当前资料库','Pair this library again'):copy('生成连接凭证','Create connection credential'),()=>void this.pair());connect.disabled=true;ack.addEventListener('change',()=>{connect.disabled=!ack.checked||this.busy;});form.append(label,acknowledgement,connect);this.host.append(form);
  }
  this.host.append(button(copy('刷新状态','Refresh status'),()=>void this.refresh()));this.feedback=element('p','context-notice',prior);this.feedback.setAttribute('role','status');this.host.append(this.feedback);
  if(this.busy)this.host.querySelectorAll('button,input').forEach(node=>node.disabled=true);
 }
 close(){this.active=false;document.removeEventListener?.('paia:preferences-applied',this.onLocale);this.clearSecret();this.host.replaceChildren();}
}
