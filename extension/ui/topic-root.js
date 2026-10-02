export function topicRootCaption(item,language='zh-CN'){
 const en=language==='en',cue=item.rootCue,parts=[];
 if(cue?.kind==='human_cue')parts.push(en?'Human note':'人工说明');
 else if(cue?.kind==='exact_excerpt'){
  parts.push(cue.role==='working_input'?(en?'Input excerpt':'输入内容摘录'):(en?'Thought excerpt':'思想内容摘录'));
  if(cue.expressionTime?.at){
   const date=new Intl.DateTimeFormat(en?'en':'zh-CN',{timeZone:'UTC',dateStyle:'medium'}).format(new Date(cue.expressionTime.at));
   parts.push((cue.expressionTime.basis==='source'?(en?'Sent ':'发送于 '):(en?'Created ':'创建于 '))+date+' UTC');
  }else parts.push(en?'Expression time unknown':'表达时间未知');
 }
 if(item.countComplete)parts.push((item.countApproximate?(en?'About ':'约 '):'')+item.visibleEntryCount+(en?' items':' 条内容'));
 return parts.join(' · ');
}
