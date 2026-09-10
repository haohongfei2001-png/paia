// Matches reported counts, not a reconstruction of the unknown private payload.
export function structuralHistory(kind='dictionary') {
 const id='fake-structural-history',base=1609459200;
 const users=Array.from({length:5},(_,i)=>({id:`fake-structural-user-${i}`,text:`虚构结构历史输入 ${i}`,at:base+i*86400}));
 const messages=Array.from({length:55},(_,i)=>({id:i<5?users[i].id:`fake-structural-assistant-${i}`,author:{role:i<5?'user':'assistant'},create_time:base+i*86400,update_time:base+i*86400+1,content:{parts:['FAKE_RESPONSE_NEVER_ARCHIVED']}}));
 // Reverse insertion order: JSON position must never supply conversation order.
 const entries=messages.slice().reverse();
 const collection=kind==='array'?entries:Object.fromEntries(entries.map((m,i)=>['entry_'+i,m]));
 return {c:{id,title:'虚构结构历史',base,messages:users.slice(0,3)},users,data:{conversation_id:id,[kind==='messages'?'messages':'history_items']:collection}};
}
