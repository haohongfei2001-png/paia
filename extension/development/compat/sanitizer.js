/* No I/O. Output vocabulary is closed; unknown schema keys refuse export. */
(() => {
 'use strict';
 const BASE=981158400,SPAN=315576000;
 const keys=new Set(('conversation_id conversationId id mapping message messages data result payload history records items nodes author role name create_time update_time content content_type parts text title parent children current_node status end_turn weight metadata recipient channel model_slug default_model_slug gizmo_id conversation_template_id moderation_results is_archived is_starred is_do_not_remember safe_urls conversation_origin conversation_mode is_read_only history_and_training_disabled is_anonymous default_model requested_model_slug finish_details type stop_tokens citations content_references attachments timestamp message_type model_switcher_deny is_complete sonic_classification_result aggregate_result message_source serialization_metadata timestamp_ relative_timestamp order task_id async_task_id request_id turn_exchange_id turn_start_id can_save internal_id tags search_result_groups searched_display search_queries canvas documents language code execution_output selected_sources is_user_system_message user_context_message_data command context total offset limit next previous root current result_data conversation conversations has_more client-created-root format provenance files body endpointClass contentType contentTypeClass tag attrs canonical messages responseMatched domMatched sourceSentAt timeSource timeConfidence conversationOrder rootType entries path valueType count value code reasonCode capture historical identity recovery source canonicalIds roles dates fingerprint expected schemaVersion messageCount userCount assistantCount matchCount chat dom response time data-message-id data-message-author-role data-testid class hidden aria-hidden contenteditable datetime data-time-kind data-message-created-at data-message-sent-at aria-label').split(' '));
 const denied=/cookie|authorization|password|credential|access_token|refresh_token|api_key|email|account_id|session/i;
 const aliases=/^TEST_(?:CONVERSATION|MESSAGE)_\d+$/;
 const placeholders=/^(?:USER_TEXT|ASSISTANT_TEXT|SYSTEM_TEXT|TOOL_TEXT)_\d+$/;
 const enums=new Set(('user assistant system developer tool text multimodal_text code execution_output image_asset_pointer audio_asset_pointer null unknown high very_high conflict chatgpt_response_create_time chatgpt_dom dom+response REDACTED INVALID_TIME object array string number boolean main article div span p pre code br ul ol li table tbody tr td time true false sent created whitespace-pre-wrap user-message-text message-sent-at message-created-at markdown other conversation_load_candidate message_send_or_stream_candidate json application/json application/problem+json chatgpt-real-structure-v1 user-sampled constructed-test').split(' '));
 const names=['response.json','dom.json','identity-map.json','expected-time.json','fingerprint.json'];
 const validKey=k=>!denied.test(k)&&(keys.has(k)||aliases.test(k)||names.includes(k));
 const validString=v=>enums.has(v)||keys.has(v)||aliases.test(v)||placeholders.test(v)||/^conversation-turn-TEST_MESSAGE_\d+$/.test(v);
 function seconds(v){if(typeof v==='number')return v;if(typeof v==='string'){if(/^\d+(?:\.\d+)?$/.test(v))return Number(v);if(/^\d{4}-\d{2}-\d{2}T[0-9:.]+(?:Z|[+-]\d{2}:\d{2})$/.test(v))return Date.parse(v)/1000;}return NaN;}
 function sanitize(root,chat,info){
  const fail=code=>{throw Error(code);};
  if(typeof chat!=='string'||!/^[A-Za-z0-9_-]{8,128}$/.test(chat))fail('IDENTITY_REQUIRED');
  let nodes=0;const times=[],rawIds=new Map([[chat,'TEST_CONVERSATION_1']]),messageRows=new Map(),bodyNames=new Map();let index=0,userIndex=0,assistantIndex=0;
  const mapID=v=>{if(typeof v!=='string'||!v||v.length>128)fail('INVALID_ID');if(!rawIds.has(v))rawIds.set(v,'TEST_MESSAGE_'+(++index));return rawIds.get(v);};
  function inspect(v,depth=0,key=''){
   if(depth>20||++nodes>30000)fail('STRUCTURE_LIMIT');if(!v||typeof v!=='object')return;
   if(Array.isArray(v)){if(v.length>2000)fail('STRUCTURE_LIMIT');for(const x of v)inspect(x,depth+1,key);return;}
   const ks=Object.keys(v);if(ks.length>2000)fail('STRUCTURE_LIMIT');
   if(v.author&&typeof v.author==='object'&&['user','assistant','system','developer','tool'].includes(v.author.role)){
    const id=v.id;if(typeof id!=='string'||!/^[A-Za-z0-9_-]{8,128}$/.test(id)||id===chat||messageRows.has(id))fail('AMBIGUOUS_ID');mapID(id);messageRows.set(id,v);
    bodyNames.set(id,v.author.role==='user'?'USER_TEXT_'+(++userIndex):v.author.role==='assistant'?'ASSISTANT_TEXT_'+(++assistantIndex):'SYSTEM_TEXT_'+index);
   }
   for(const k of ks){
    if(key==='mapping'){mapID(k);}
    else if(!validKey(k))fail('UNKNOWN_SCHEMA_KEY');
    const x=v[k];
    if(['conversation_id','conversationId'].includes(k)&&x!==chat)fail('CONVERSATION_CONFLICT');
    if(['create_time','update_time'].includes(k)&&x!=null){const t=seconds(x);if(Number.isFinite(t)){if(t>=946684800&&t<=Date.now()/1000)times.push(t);}}
    inspect(x,depth+1,k);
   }
  }
  inspect(root);if(!messageRows.size)fail('MESSAGE_STRUCTURE_REQUIRED');
  const origin=times.length?Math.min(...times):null;if(times.length&&Math.max(...times)-origin>SPAN)fail('TIME_SPAN_LIMIT');
  const shift=v=>{if(v===null)return null;const t=seconds(v);if(!Number.isFinite(t)||t<946684800||t>Date.now()/1000||origin===null)return typeof v==='number'?-1:'INVALID_TIME';
   const moved=BASE+t-origin;if(typeof v==='number')return moved;if(/^\d/.test(v)&&!v.includes('T'))return String(moved);return new Date(moved*1000).toISOString();};
  function transform(v,key='',bodyName='REDACTED'){
   if(v===null)return null;
   if(['create_time','update_time'].includes(key)){if(typeof v==='boolean')return false;if(typeof v==='object')return transform(v,'',bodyName);return shift(v);}
   if(typeof v==='string'){
    if(rawIds.has(v))return rawIds.get(v);
    if(['parent','children','current_node'].includes(key))return mapID(v);
    if(['role','content_type','status','channel','recipient'].includes(key)&&enums.has(v))return v;
    return ['parts','text'].includes(key)?bodyName:'REDACTED';
   }
   if(typeof v==='number')return 0;if(typeof v==='boolean')return false;
   if(Array.isArray(v))return v.map(x=>transform(x,key,bodyName));
   const next=Object.create(null);if(v.id&&bodyNames.has(v.id))bodyName=bodyNames.get(v.id);
   for(const [k,x] of Object.entries(v))next[key==='mapping'?mapID(k):k]=transform(x,k,bodyName);
   return next;
  }
  const body=transform(root);
  // Keep only minimal matching evidence in memory; no raw object or body in the returned closure.
  const minimal=[...messageRows].map(([id,m])=>({raw:id,id:mapID(id),role:m.author.role,create:typeof m.create_time==='number'&&m.create_time>=946684800&&m.create_time<=Date.now()/1000?shift(m.create_time):null,update:typeof m.update_time==='number'?shift(m.update_time):null}));
  if(!['application/json','application/problem+json'].includes(info.contentType))fail('CONTENT_TYPE_UNSUPPORTED');
  const safeInfo={endpointClass:['other','conversation_load_candidate','message_send_or_stream_candidate'].includes(info.endpointClass)?info.endpointClass:'other',contentType:info.contentType,contentTypeClass:'json'};
  messageRows.clear();root=null;times.length=0;
  return {body,info:safeInfo,ids:rawIds,bodyNames,rows:minimal,shift};
 }
 function bundle(sample,ast,canonical,provenance='user-sampled'){
  let count=0;
  const mapID=id=>{if(!sample.ids.has(id)&&sample.ids.size>=4000)throw Error('DOM_LIMIT');if(!sample.ids.has(id))sample.ids.set(id,'TEST_MESSAGE_'+(sample.ids.size+1));return sample.ids.get(id);};
  function dom(node,parentID=null,role='user',depth=0){
   if(depth>24||++count>4000)throw Error('DOM_LIMIT');
   if(node.text===true)return {text:sample.bodyNames.get(parentID)||(role==='assistant'?'ASSISTANT_TEXT_1':'USER_TEXT_1')};
   if(!['main','article','div','span','p','pre','code','br','ul','ol','li','table','tbody','tr','td','time'].includes(node.tag))throw Error('DOM_TAG');
   const attrs=Object.create(null),raw=node.attrs||{};parentID=raw['data-message-id']||parentID;role=raw['data-message-author-role']||role;
   for(const [k,v] of Object.entries(raw)){
    if(k==='data-message-id')attrs[k]=mapID(v);
    else if(k==='data-testid'&&v.startsWith('conversation-turn-'))attrs[k]='conversation-turn-'+mapID(parentID||v);
    else if(['title','aria-label'].includes(k)){const m=v.match(/^(?:Sent at|Created at|发送于|创建于)\s+(.+)$/);if(!m)throw Error('DOM_ATTRIBUTE');attrs[k]='Sent at '+sample.shift(m[1]);}
    else if(['datetime','data-message-created-at','data-message-sent-at'].includes(k))attrs[k]=sample.shift(v);
    else if(validKey(k)&&validString(v))attrs[k]=v;
    else throw Error('DOM_ATTRIBUTE');
   }
   return {tag:node.tag,attrs,children:(node.children||[]).map(n=>dom(n,parentID,role,depth+1))};
  }
  const evidence=canonical.map(c=>typeof c==='string'?{id:c}:c);
  if(evidence.some(c=>!c||typeof c.id!=='string')||new Set(evidence.map(c=>c.id)).size!==evidence.length)throw Error('AMBIGUOUS_ID');
  const safeDom=dom(ast),identity=evidence.map(c=>({id:mapID(c.id),domMatched:true,responseMatched:sample.rows.some(r=>r.raw===c.id&&r.role==='user')}));
  const expected=identity.map((m,i)=>{
   const r=sample.rows.find(r=>r.id===m.id&&r.role==='user'),response=r?.create!=null&&(r.update==null||r.update>=r.create)?r.create:null;
   const shifted=evidence[i].domTime?sample.shift(evidence[i].domTime):null,domTime=typeof shifted==='string'&&shifted!=='INVALID_TIME'?seconds(shifted):null;
   const hasDOM=Number.isFinite(domTime),hasResponse=typeof response==='number',conflict=hasDOM&&hasResponse&&Math.abs(domTime-response)>1;
   const t=conflict?null:hasResponse?response:hasDOM?domTime:null;
   return {id:m.id,sourceSentAt:t===null?null:new Date(t*1000).toISOString(),timeSource:conflict?'unknown':hasDOM&&hasResponse?'dom+response':hasResponse?'chatgpt_response_create_time':hasDOM?'chatgpt_dom':'unknown',timeConfidence:conflict?'conflict':hasDOM&&hasResponse?'very_high':t!==null?'high':'unknown',conversationOrder:i+1};
  });
  const entries=[];function fingerprint(v,path=[]){const type=v===null?'null':Array.isArray(v)?'array':typeof v;entries.push({path,valueType:type});if(v&&typeof v==='object')for(const [k,x] of Object.entries(v))fingerprint(x,[...path,Array.isArray(v)?Number(k):k]);}
  fingerprint(sample.body);
  const result={format:'chatgpt-real-structure-v1',provenance,files:{'response.json':{...sample.info,body:sample.body},'dom.json':safeDom,'identity-map.json':{chat:'TEST_CONVERSATION_1',messages:identity,response:sample.rows.map(r=>({id:r.id,role:r.role,responseMatched:r.create!==null}))},'expected-time.json':{messages:expected},'fingerprint.json':{rootType:Array.isArray(sample.body)?'array':sample.body===null?'null':typeof sample.body,entries}}};
  if(!scan(result))throw Error('PRIVACY_REJECTED');return result;
 }
 function scan(bundle){
  try{
   if(bundle?.format!=='chatgpt-real-structure-v1'||!['user-sampled','constructed-test'].includes(bundle.provenance)||Object.keys(bundle.files||{}).sort().join('|')!==[...names].sort().join('|'))return false;
   let nodes=0;function walk(v,depth=0,path=[]){if(++nodes>80000||depth>40)return false;
    if(v===null||typeof v==='boolean')return true;
    if(typeof v==='number'){if(path[0]==='files'&&path[1]==='response.json'&&path[2]==='body'&&!['create_time','update_time'].includes(path.at(-1))&&v!==0)return false;}
    if(typeof v==='number')return Number.isFinite(v)&&(v===-1||Number.isInteger(v)&&v>=0&&v<=30000||v>=BASE&&v<=BASE+SPAN);
    if(typeof v==='string'){
     if(v.length>128||/[\u0080-\uffff]|https?:|@/.test(v))return false;
     if(path[0]==='files'&&path[1]==='response.json'&&path[2]==='body'&&!['role','content_type','status','channel','recipient','create_time','update_time'].includes(path.at(-1))&&!['REDACTED'].includes(v)&&!aliases.test(v)&&!placeholders.test(v))return false;
     if(['title','aria-label'].includes(path.at(-1))&&path[1]==='dom.json'&&/^Sent at \d{4}-\d{2}-\d{2}T[0-9:.]+Z$/.test(v)){const t=seconds(v.slice(8));return t>=BASE&&t<=BASE+SPAN;}
     if(validString(v))return true;
     if(/^\d{4}-\d{2}-\d{2}T[0-9:.]+Z$/.test(v)||/^\d+(?:\.\d+)?$/.test(v)){const t=seconds(v);return t>=BASE&&t<=BASE+SPAN;}
     return false;
    }
    if(Array.isArray(v))return v.length<=30000&&v.every((x,i)=>walk(x,depth+1,[...path,i]));
    if(typeof v==='object')return Object.entries(v).every(([k,x])=>validKey(k)&&walk(x,depth+1,[...path,k]));return false;
   }
   if(!walk(bundle)||JSON.stringify(bundle).length>4194304)return false;
   const f=bundle.files,ids=f['identity-map.json'],expected=f['expected-time.json'];
   if(!f['response.json']||!['application/json','application/problem+json'].includes(f['response.json'].contentType)||f['response.json'].contentTypeClass!=='json'||!Object.hasOwn(f['response.json'],'body')||ids?.chat!=='TEST_CONVERSATION_1'||!Array.isArray(ids.messages)||!Array.isArray(ids.response)||!Array.isArray(expected?.messages))return false;
   const identityIDs=ids.messages.map(m=>m.id);
   if(new Set(identityIDs).size!==identityIDs.length||identityIDs.some(id=>!/^TEST_MESSAGE_\d+$/.test(id))||expected.messages.length!==identityIDs.length||expected.messages.some((m,i)=>m.id!==identityIDs[i]||m.conversationOrder!==i+1||!['unknown','high','very_high','conflict'].includes(m.timeConfidence)))return false;
   function ast(n){if(n?.text)return placeholders.test(n.text);return n&&enums.has(n.tag)&&n.attrs&&Array.isArray(n.children)&&n.children.every(ast);}
   if(f['dom.json']?.tag!=='main'||!ast(f['dom.json']))return false;
   const entries=[];function mark(v,path=[]){entries.push({path,valueType:v===null?'null':Array.isArray(v)?'array':typeof v});if(v&&typeof v==='object')for(const [k,x]of Object.entries(v))mark(x,[...path,Array.isArray(v)?Number(k):k]);}
   mark(f['response.json'].body);
   return f['fingerprint.json']?.rootType===entries[0].valueType&&JSON.stringify(entries)===JSON.stringify(f['fingerprint.json'].entries);
  }catch{return false;}
 }
 globalThis.PAIACompat=Object.freeze({sanitize,bundle,scan,BASE,names});
})();
