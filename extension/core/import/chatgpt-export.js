// Local structural profile. Synthetic acceptance is not evidence of a real export.
// No provider, file access or persistence lives in this adapter.
export const PROFILE=Object.freeze({id:'chatgpt-mapping-v1',version:1,provider:'official_export',realExportVerified:false,timeUnit:'unix_seconds'});
const ID=/^[A-Za-z0-9_-]{8,128}$/;
const id=v=>typeof v==='string'&&ID.test(v);
const nodeId=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v);
const equal=(a,b)=>a.length===b.length&&a.every((v,i)=>v===b[i]);
const inside=(path,root)=>root.every((v,i)=>path[i]===v);
const candidate=path=>path.length===0||path.length===1&&(Number.isInteger(path[0])||path[0]==='data')||path.length===2&&['conversations','data'].includes(path[0])&&Number.isInteger(path[1])||path.length===3&&path[0]==='data'&&path[1]==='conversations'&&Number.isInteger(path[2]);
const seconds=v=>typeof v==='number'&&Number.isFinite(v)&&v>=946684800&&v*1000<=Date.now()?new Date(v*1000).toISOString():null;
const newConversation=path=>({path,fields:{},nodes:new Map(),users:[],chars:0,edges:0,overflow:false,mapping:false,shaped:0,issues:0});
export class ChatGPTExportProjection {
 constructor({maxNodes=4096,maxConversationChars=4*1024*1024}={}){
  this.maxNodes=Math.min(4096,maxNodes);this.maxConversationChars=Math.min(4*1024*1024,maxConversationChars);
  this.conv=null;this.found=0;this.issues=0;this.review=0;this.backup=false;
  this.metrics={maxNodes:0,maxBufferedTextChars:0,conversations:0,userMessages:0,skippedConversations:0,skippedMessages:0,invalidTimes:0};
 }
 selectString(path){
  if(path.length===1&&path[0]==='format')return true;
  const c=this.conv;if(!c||c.overflow||!inside(path,c.path))return false;const p=path.slice(c.path.length);
  if(p.length===1)return ['id','conversation_id','title','current_node'].includes(p[0]);
  if(p[0]!=='mapping'||typeof p[1]!=='string')return false;
  if(p.length===3)return ['id','parent'].includes(p[2]);
  if(p.length===4&&p[2]==='children'&&Number.isInteger(p[3]))return true;
  if(p[2]!=='message')return false;
  if(p.length===4)return ['id','status'].includes(p[3]);
  if(p.length===5)return p[3]==='author'&&p[4]==='role'||p[3]==='content'&&p[4]==='content_type';
  return p.length===6&&p[3]==='content'&&p[4]==='parts'&&Number.isInteger(p[5])&&!c.nodes.get(p[1])?.badParts&&(!c.nodes.get(p[1])?.role||c.nodes.get(p[1]).role==='user');
 }
 async event(e,emit){
  if(e.kind==='value'&&e.path.length===1&&e.path[0]==='format'&&e.value==='PAIA Backup')this.backup=true;
  if(e.kind==='value'&&e.type==='object'&&candidate(e.path)){
   // Known envelopes may replace an empty root candidate; nested message objects cannot.
   if(this.conv&&!this.conv.mapping&&e.path.length>this.conv.path.length)this.conv=null;
   if(!this.conv)this.conv=newConversation(e.path);
  }
  const c=this.conv;if(!c||!inside(e.path,c.path))return;const p=e.path.slice(c.path.length);
  if(e.kind==='end'&&equal(e.path,c.path)){
   await this.completeConversation(c,emit);this.conv=null;return;
  }
  if(c.overflow||e.kind!=='value')return;
  if(p.length===1){if(p[0]==='mapping'&&e.type==='object')c.mapping=true;else if(['id','conversation_id','title','current_node','is_temporary'].includes(p[0]))c.fields[p[0]]=e.value;return;}
  if(p[0]!=='mapping'||typeof p[1]!=='string')return;
  if(p.length===2){
   if(e.type!=='object'){c.issues++;return;}
   if(c.nodes.size>=this.maxNodes){this.overflow(c);return;}
   c.nodes.set(p[1],{key:p[1],nodeId:undefined,parent:undefined,children:null,message:false,parts:[],chars:0,badParts:false,hidden:false});
   this.metrics.maxNodes=Math.max(this.metrics.maxNodes,c.nodes.size);return;
  }
  const n=c.nodes.get(p[1]);if(!n)return;
  if(p.length===3){if(p[2]==='id')n.nodeId=e.value;else if(p[2]==='parent')n.parent=e.value;else if(p[2]==='children')n.children=e.type==='array'?[]:false;else if(p[2]==='message')n.message=e.type==='object';return;}
  if(p.length===4&&p[2]==='children'){if(++c.edges>this.maxNodes*2){this.overflow(c);return;}if(n.children&&nodeId(e.value))n.children.push(e.value);else n.badGraph=true;return;}
  if(p[2]!=='message')return;
  if(p.length===4){if(p[3]==='id')n.messageId=e.value;else if(p[3]==='create_time')n.time=e.value;else if(p[3]==='status')n.status=e.value;}
  if(p.length===5&&p[3]==='author'&&p[4]==='role'){
   n.role=e.value;if(n.role!=='user'){c.chars-=n.chars;n.parts=[];n.chars=0;}
  }
  if(p.length===5&&p[3]==='content'&&p[4]==='content_type')n.contentType=e.value;
  if(p.length===5&&p[3]==='content'&&p[4]==='parts')n.partsArray=e.type==='array';
  if(p.length===5&&p[3]==='metadata'&&['is_visually_hidden_from_conversation','is_user_system_message'].includes(p[4])&&e.value===true)n.hidden=true;
  if(p.length===6&&p[3]==='content'&&p[4]==='parts'&&!n.badParts&&(!n.role||n.role==='user')){
   if(e.type!=='string'||typeof e.value!=='string'||n.parts.length>=1024){n.badParts=true;c.chars-=n.chars;n.chars=0;n.parts=[];return;}
   c.chars+=e.value.length;n.chars+=e.value.length;
   this.metrics.maxBufferedTextChars=Math.max(this.metrics.maxBufferedTextChars,c.chars);
   if(c.chars>this.maxConversationChars){this.overflow(c);return;}n.parts.push(e.value);
  }
 }
 overflow(c){c.overflow=true;c.issues++;c.nodes.clear();c.users=[];c.chars=0;}
 async completeConversation(c,emit){
  if(!c.mapping){if(Object.keys(c.fields).length)c.issues++;this.issues+=c.issues;return;}
  this.metrics.conversations++;
  const f=c.fields,chat=f.conversation_id??f.id;
  if(c.overflow||!id(chat)||f.id!==undefined&&f.conversation_id!==undefined&&f.id!==f.conversation_id||f.is_temporary===true){this.metrics.skippedConversations++;this.issues+=Math.max(1,c.issues);return;}
  const users=[];let graphOK=true;const messageIds=new Set();
  for(const n of c.nodes.values()){
   if(n.nodeId!==undefined&&n.nodeId!==n.key||!nodeId(n.key)||n.badGraph||n.parent!==null&&!nodeId(n.parent)||n.parent!==null&&!c.nodes.has(n.parent)||n.children===false)graphOK=false;
   if(n.children){for(const k of n.children)if(c.nodes.get(k)?.parent!==n.key)graphOK=false;if(new Set(n.children).size!==n.children.length)graphOK=false;}
   if(n.parent&&c.nodes.get(n.parent)?.children&&!c.nodes.get(n.parent).children.includes(n.key))graphOK=false;
   if(!n.message)continue;
   if(!['user','assistant','tool','system','developer'].includes(n.role)){c.issues++;this.metrics.skippedMessages++;graphOK=false;continue;}
   c.shaped++;
   if(n.role!=='user')continue;
   if(messageIds.has(n.messageId))graphOK=false;messageIds.add(n.messageId);
   if(!id(n.messageId)||n.hidden||n.status!==undefined&&n.status!=='finished_successfully'||n.contentType!=='text'||!n.partsArray||n.badParts||!n.parts.length){c.issues++;this.metrics.skippedMessages++;continue;}
   const text=n.parts.join('\n');n.parts=[];
   if(!text.length||text.length>200000){c.issues++;this.metrics.skippedMessages++;continue;}
   const time=seconds(n.time);if(n.time!=null&&!time){c.issues++;this.metrics.invalidTimes++;}
   users.push({node:n,text,time});
  }
  if(!c.shaped){this.metrics.skippedConversations++;this.issues+=Math.max(1,c.issues);return;}
  this.found++;
  const verified=new Set();
  for(const n of c.nodes.values()){const visiting=new Set();let cursor=n.key;while(graphOK&&cursor!==null&&!verified.has(cursor)){if(visiting.has(cursor)||!c.nodes.has(cursor)){graphOK=false;break;}visiting.add(cursor);cursor=c.nodes.get(cursor).parent;}for(const key of visiting)verified.add(key);}
  const current=new Set(),order=new Map();let cursor=f.current_node;
  if(!nodeId(cursor)||!c.nodes.has(cursor))graphOK=false;
  while(graphOK&&cursor!==null){if(current.has(cursor)||!c.nodes.has(cursor)){graphOK=false;break;}current.add(cursor);cursor=c.nodes.get(cursor).parent;}
  if(graphOK){let i=0;for(const key of [...current].reverse())if(c.nodes.get(key).role==='user')order.set(key,++i);}
  for(const {node:n,text,time}of users){
   const branch=graphOK?current.has(n.key)?'current':'other':'ambiguous';
   if(branch!=='current')this.review++;
   const parent=c.nodes.get(n.parent);
   await emit({chatId:chat,messageId:n.messageId,title:typeof f.title==='string'?f.title.slice(0,1000):'',text,role:'user',sent:true,contentType:'text',createTime:time,order:branch==='current'?order.get(n.key)??null:null,branch,parentMessageId:parent&&id(parent.messageId)&&parent.messageId!==n.messageId?parent.messageId:null});
   this.metrics.userMessages++;
  }
  this.issues+=c.issues;
 }
 finish(){return {profileId:PROFILE.id,profileVersion:PROFILE.version,realExportVerified:false,support:this.backup?'paia_backup':!this.found?'unknown':this.issues||this.review?'partial':'supported',issues:this.issues,review:this.review,...this.metrics,conversations:this.found,inspectedConversations:this.metrics.conversations};}
}
export const officialExportAdapter=Object.freeze({id:PROFILE.id,profile:PROFILE,createProjection:options=>new ChatGPTExportProjection(options)});
