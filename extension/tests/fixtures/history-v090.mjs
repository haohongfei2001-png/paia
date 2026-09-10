// Entirely invented content and identifiers; this is not a captured official export.
export function conversation(n=1,count=3){
 const id='synthetic-chat-'+String(n).padStart(6,'0'),root='synthetic-root-'+n,mapping={[root]:{id:root,parent:null,children:[],message:null}};let parent=root;
 for(let i=1;i<=count;i++){
  const key='synthetic-node-'+n+'-'+i,messageId='synthetic-message-'+n+'-'+i;
  mapping[parent].children.push(key);
  mapping[key]={id:key,parent,children:[],message:{id:messageId,author:{role:'user'},create_time:1577836800+i,update_time:1577836805+i,content:{content_type:'text',parts:['虚构历史输入 '+n+' / '+i+'：我希望保留自己的原始想法。']},status:'finished_successfully'}};
  parent=key;
 }
 return {id,conversation_id:id,title:'虚构历史窗口 '+n,mapping,current_node:parent,create_time:1577836800,update_time:1577836899};
}
export function branched(){
 const c=conversation(1,2),base=Object.keys(c.mapping)[1],key='synthetic-alternative-1';
 c.mapping[base].children.push(key);c.mapping[key]={id:key,parent:base,children:[],message:{id:'synthetic-alternative-message',author:{role:'user'},content:{content_type:'text',parts:['虚构的其他分支']},create_time:null}};
 return c;
}
export const historyFile=(items=[conversation()])=>new Blob([JSON.stringify(items)]);
