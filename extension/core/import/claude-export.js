// Local structural profile for Claude data exports. Synthetic acceptance is not
// evidence of a real export; the adapter never owns file access or persistence.
export const CLAUDE_PROFILE=Object.freeze({id:'claude-conversations-v1',version:1,provider:'official_export',platform:'claude',realExportVerified:false,timeUnit:'iso8601'});
const ID=/^[A-Za-z0-9_-]{8,128}$/;
const id=v=>typeof v==='string'&&ID.test(v);
const equal=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
const inside=(path,root)=>root.every((v,i)=>path[i]===v);
const candidate=path=>path.length===0||path.length===1&&(Number.isInteger(path[0])||path[0]==='data')||path.length===2&&['conversations','data'].includes(path[0])&&Number.isInteger(path[1])||path.length===3&&path[0]==='data'&&path[1]==='conversations'&&Number.isInteger(path[2]);
const iso=v=>{if(typeof v!=='string')return null;const n=Date.parse(v);return Number.isFinite(n)&&n>=946684800000&&n<=Date.now()?new Date(n).toISOString():null;};
const newConversation=path=>({path,fields:{},messages:new Map(),chars:0,overflow:false,shaped:0,issues:0});
export class ClaudeExportProjection {
 constructor({maxMessages=4096,maxConversationChars=4*1024*1024}={}){this.maxMessages=Math.min(4096,maxMessages);this.maxConversationChars=Math.min(4*1024*1024,maxConversationChars);this.conv=null;this.found=0;this.issues=0;this.review=0;this.backup=false;this.metrics={maxNodes:0,maxBufferedTextChars:0,conversations:0,userMessages:0,skippedConversations:0,skippedMessages:0,invalidTimes:0};}
 selectString(path){
  if(path.length===1&&path[0]==='format')return true;const c=this.conv;if(!c||c.overflow||!inside(path,c.path))return false;const p=path.slice(c.path.length);
  if(p.length===1)return ['uuid','name','current_leaf_message_uuid'].includes(p[0]);
  if(p[0]!=='chat_messages'||!Number.isInteger(p[1]))return false;
  if(p.length===3)return ['uuid','sender','created_at','parent_message_uuid','text'].includes(p[2]);
  return p.length===5&&p[2]==='content'&&Number.isInteger(p[3])&&['type','text'].includes(p[4]);
 }
 async event(e,emit){
  if(e.kind==='value'&&e.path.length===1&&e.path[0]==='format'&&e.value==='PAIA Backup')this.backup=true;
  if(e.kind==='value'&&e.type==='object'&&candidate(e.path)){if(this.conv&&!this.conv.messages.size&&e.path.length>this.conv.path.length)this.conv=null;if(!this.conv)this.conv=newConversation(e.path);}
  const c=this.conv;if(!c||!inside(e.path,c.path))return;const p=e.path.slice(c.path.length);
  if(e.kind==='end'&&equal(e.path,c.path)){await this.completeConversation(c,emit);this.conv=null;return;}
  if(c.overflow||e.kind!=='value')return;
  if(p.length===1){if(['uuid','name','current_leaf_message_uuid'].includes(p[0]))c.fields[p[0]]=e.value;return;}
  if(p[0]!=='chat_messages'||!Number.isInteger(p[1]))return;
  if(p.length===2){if(e.type!=='object'){c.issues++;return;}if(c.messages.size>=this.maxMessages){this.overflow(c);return;}c.messages.set(p[1],{index:p[1],parts:[],blocks:new Map(),chars:0});this.metrics.maxNodes=Math.max(this.metrics.maxNodes,c.messages.size);return;}
  const m=c.messages.get(p[1]);if(!m)return;
  if(p.length===3){if(['uuid','sender','created_at','parent_message_uuid','text'].includes(p[2]))m[p[2]]=e.value;return;}
  if(p.length===4&&p[2]==='content'&&Number.isInteger(p[3])){if(e.type==='object')m.blocks.set(p[3],{});return;}
  if(p.length===5&&p[2]==='content'&&Number.isInteger(p[3])){const b=m.blocks.get(p[3]);if(!b)return;if(p[4]==='type')b.type=e.value;else if(p[4]==='text'){if(typeof e.value!=='string'){c.issues++;return;}b.text=e.value;c.chars+=e.value.length;m.chars+=e.value.length;this.metrics.maxBufferedTextChars=Math.max(this.metrics.maxBufferedTextChars,c.chars);if(c.chars>this.maxConversationChars)this.overflow(c);}}
 }
 overflow(c){c.overflow=true;c.issues++;c.messages.clear();c.chars=0;}
 async completeConversation(c,emit){
  this.metrics.conversations++;const f=c.fields,chat=f.uuid;if(c.overflow||!id(chat)){this.metrics.skippedConversations++;this.issues+=Math.max(1,c.issues);return;}
  const messages=[...c.messages.values()].sort((a,b)=>a.index-b.index);if(!messages.length){this.metrics.skippedConversations++;this.issues+=Math.max(1,c.issues);return;}
  const byId=new Map();let graphPresent=false,graphOK=true;
  for(const m of messages){if(!id(m.uuid)){c.issues++;graphOK=false;continue;}if(byId.has(m.uuid))graphOK=false;byId.set(m.uuid,m);if(m.parent_message_uuid!==undefined&&m.parent_message_uuid!==null){graphPresent=true;if(!id(m.parent_message_uuid))graphOK=false;}}
  if(graphPresent)for(const m of messages)if(m.parent_message_uuid&& !byId.has(m.parent_message_uuid))graphOK=false;
  const current=new Set();let orderedCurrent=[];
  if(graphPresent){let cursor=f.current_leaf_message_uuid;if(!id(cursor)||!byId.has(cursor))graphOK=false;const seen=new Set();while(graphOK&&cursor){if(seen.has(cursor)||!byId.has(cursor)){graphOK=false;break;}seen.add(cursor);current.add(cursor);cursor=byId.get(cursor).parent_message_uuid||null;}if(graphOK)orderedCurrent=[...current].map(k=>byId.get(k)).sort((a,b)=>a.index-b.index);}
  this.found++;let userOrder=0,currentOrder=new Map();for(const m of (graphPresent&&graphOK?orderedCurrent:messages))if(m.sender==='human')currentOrder.set(m.uuid,++userOrder);
  for(const m of messages){
   c.shaped++;if(m.sender!=='human')continue;
   const textParts=[...m.blocks.values()].filter(b=>b.type==='text'&&typeof b.text==='string'&&b.text.length).map(b=>b.text);const text=(textParts.length?textParts.join('\n'):typeof m.text==='string'?m.text:'').trim();
   if(!id(m.uuid)||!text||text.length>200000){c.issues++;this.metrics.skippedMessages++;continue;}
   const time=iso(m.created_at);if(m.created_at!=null&&!time){c.issues++;this.metrics.invalidTimes++;}
   const branch=graphPresent?(graphOK?(current.has(m.uuid)?'current':'other'):'ambiguous'):'current';if(branch!=='current')this.review++;
   const parent=graphPresent&&m.parent_message_uuid&&byId.get(m.parent_message_uuid);await emit({platform:'claude',chatId:chat,messageId:m.uuid,title:typeof f.name==='string'?f.name.slice(0,1000):'',text,role:'user',sent:true,contentType:'text',createTime:time,order:branch==='current'?currentOrder.get(m.uuid)??null:null,branch,parentMessageId:parent&&id(parent.uuid)&&parent.uuid!==m.uuid?parent.uuid:null});this.metrics.userMessages++;
  }
  this.issues+=c.issues;
 }
 finish(){return {profileId:CLAUDE_PROFILE.id,profileVersion:CLAUDE_PROFILE.version,platform:'claude',realExportVerified:false,support:this.backup?'paia_backup':!this.found?'unknown':this.issues||this.review?'partial':'supported',issues:this.issues,review:this.review,...this.metrics,conversations:this.found,inspectedConversations:this.metrics.conversations};}
}
export const claudeExportAdapter=Object.freeze({id:CLAUDE_PROFILE.id,profile:CLAUDE_PROFILE,createProjection:options=>new ClaudeExportProjection(options)});
