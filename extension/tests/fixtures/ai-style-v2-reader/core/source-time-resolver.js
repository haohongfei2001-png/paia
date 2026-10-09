// Pure arbitration. No DOM, storage or network; only the trusted writer applies results.
const active=new Set(['chatgpt_dom','chatgpt_response_create_time']);
const validID=v=>typeof v==='string'&&/^[A-Za-z0-9_-]{8,128}$/.test(v);
export class SourceTimeResolver {
  static toleranceMs=1000;
  static sources=Object.freeze({chatgpt_dom:'high',chatgpt_response_create_time:'high',official_export:'reserved',firstObservedAt:'approximate_reserved'});
  static normalize(candidate,identity,now=Date.now()) {
    if(!validID(identity?.chatId)||!validID(identity.sourceMessageId)||!active.has(candidate?.source)||
       candidate.identity?.chatId!==identity.chatId||candidate.identity?.sourceMessageId!==identity.sourceMessageId)return null;
    const text=candidate.timestamp;
    if(typeof text!=='string'||text.length>40)return null;
    const m=text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/);
    if(!m)return null;
    const [,y,mo,d,h,mi,s,zone]=m;
    if(+mo<1||+mo>12||+d<1||+d>new Date(Date.UTC(+y,+mo,0)).getUTCDate()||+h>23||+mi>59||+s>59)return null;
    if(zone!=='Z'&&(+zone.slice(1,3)>14||+zone.slice(4)>59||+zone.slice(1,3)===14&&+zone.slice(4)!==0))return null;
    const ms=Date.parse(text);if(!Number.isFinite(ms)||ms<946684800000||ms>now)return null;
    return {source:candidate.source,timestamp:new Date(ms).toISOString(),identity:{...identity}};
  }
  static resolve(identity,candidates,{now=Date.now()}={}) {
    const values=new Map();let conflict=false;
    if(!Array.isArray(candidates)||candidates.length>8)candidates=[];
    for(const raw of candidates){
      const c=this.normalize(raw,identity,now);if(!c)continue;
      const prior=values.get(c.source);
      if(prior&&Math.abs(Date.parse(prior.timestamp)-Date.parse(c.timestamp))>this.toleranceMs)conflict=true;
      else if(!prior)values.set(c.source,c);
    }
    const dom=values.get('chatgpt_dom'),response=values.get('chatgpt_response_create_time');
    if(dom&&response&&Math.abs(Date.parse(dom.timestamp)-Date.parse(response.timestamp))>this.toleranceMs)conflict=true;
    const summary={dom:Boolean(dom),response:Boolean(response),agreement:conflict?'conflict':dom&&response?'agree':dom||response?'single':'unknown'};
    if(conflict)return {sourceSentAt:null,timeSource:'unknown',timeConfidence:'conflict',timeCandidates:summary};
    if(dom&&response)return {sourceSentAt:response.timestamp,timeSource:'dom+response',timeConfidence:'very_high',timeCandidates:summary};
    const only=response||dom;
    return {sourceSentAt:only?.timestamp||null,timeSource:only?.source||'unknown',timeConfidence:only?'high':'unknown',timeCandidates:summary};
  }
}
