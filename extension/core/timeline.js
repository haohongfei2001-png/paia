const order=r=>Number.isSafeInteger(r.conversationOrder)&&r.conversationOrder>0?r.conversationOrder:null;
const stamp=r=>typeof r.sourceSentAt==='string'&&Number.isFinite(Date.parse(r.sourceSentAt))?r.sourceSentAt:null;
const fallback=(a,b)=>String(a.capturedAt||'').localeCompare(String(b.capturedAt||''))||String(a.id).localeCompare(String(b.id));
export function timelineCompare(a,b) {
  const x=stamp(a),y=stamp(b);
  if(Boolean(x)!==Boolean(y))return x?-1:1;
  // A total ordering keeps interleaved conversations transitive.
  return (x&&y?y.localeCompare(x):0)||String(a.chatId).localeCompare(String(b.chatId))||((order(b)||0)-(order(a)||0))||fallback(b,a);
}
export function conversationCompare(a,b) {
  const x=order(a),y=order(b);
  if((x!==null)!==(y!==null))return x!==null?-1:1;
  if(x!==null&&y!==null&&x!==y)return x-y;
  const at=stamp(a),bt=stamp(b);
  if(Boolean(at)!==Boolean(bt))return at?-1:1;
  return (at&&bt?at.localeCompare(bt):0)||fallback(a,b);
}
