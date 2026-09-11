// Local RPCs only. Deadlines settle the UI wait, not the underlying operation;
// a late response has no publication callback and cannot update another route.
const STATUS_READS=Object.freeze({
 ai:'GET_AI_PRESENTATION_STATUS',original:'GET_ORIGINAL_ORGANIZER_STATUS',
 controls:'GET_ORGANIZER_CONTROLS',bounded:'GET_BOUNDED_ORGANIZER',credential:'GET_DEEPSEEK_STATUS'
});
export function boundedLocalRead(read,{timeoutMs=1500}={}){
 return new Promise(resolve=>{
  let settled=false;
  const finish=result=>{if(settled)return;settled=true;clearTimeout(timer);resolve(result);};
  const timer=setTimeout(()=>finish({ok:false,reason:'timeout'}),timeoutMs);
  Promise.resolve().then(read).then(value=>finish({ok:true,value}),()=>finish({ok:false,reason:'unavailable'}));
 });
}
export async function readOptionalLibraryStatus(read,{isCurrent=()=>true,timeoutMs=1500}={}){
 const results=await Promise.all(Object.entries(STATUS_READS).map(async([key,type])=>[key,await boundedLocalRead(()=>read(type),{timeoutMs})]));
 if(!isCurrent())return null;
 const values={},unavailable=[];
 for(const [key,result]of results){
  // GET_BOUNDED_ORGANIZER returns null when no bounded job exists. This is an
  // observed idle state, not a failed read. Other null/undefined responses are
  // still unavailable and must never enable a paid action through fallback.
  const idle=key==='bounded'&&result.ok&&result.value===null;
  const record=result.value!==null&&typeof result.value==='object'&&!Array.isArray(result.value);
  if(result.ok&&(idle||record))values[key]=result.value;else unavailable.push(key);
 }
 return {values,unavailable};
}
export function libraryReadFailureText(retained){
 return retained?'暂时无法刷新思想库。页面上次成功读取的内容仍显示，但尚未确认最新状态。请重试。':'暂时无法读取思想库，尚未获得当前页面的数据。请重试；这不表示内容已被删除。';
}
