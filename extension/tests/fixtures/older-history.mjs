// Entirely synthetic. Slice metadata without rebasing each message's timestamp.
export function olderHistory(id='fake-older-history') {
 const base=1609459200;
 const messages=Array.from({length:20},(_,i)=>({id:`${id}-user-${String(i+1).padStart(3,'0')}`,text:`虚构旧历史输入 ${i+1}\n保留原文`,sentAt:base+i*86400}));
 const c={id,title:'虚构分批历史',base,messages};
 const batch=(start,end)=>({conversation_id:id,messages:messages.slice(start,end).map(m=>({id:m.id,author:{role:'user'},create_time:m.sentAt,update_time:m.sentAt+1,content:{parts:['FAKE_METADATA_BODY_NOT_CAPTURED']}}))});
 return {c,recent:{...c,messages:messages.slice(15)},first:batch(15,20),second:batch(0,15)};
}
