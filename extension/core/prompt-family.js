import {hashText} from './dedupe.js';
import {emptyPromptPreferences} from './prompt-reuse-preferences.js';
const structured=text=>/[`{}<>\t]|^ {2,}\S/m.test(text);
export function promptCandidate(text){
 if(typeof text!=='string'||!text.trim()||text.length>200000)return null;
 const raw=text.replace(/\r\n?/g,'\n');let reusable=raw,mode='whole';
 const first=raw.indexOf('\n'),header=first<0?'':raw.slice(0,first).trim();
 if(first>0&&raw.length-first>256&&/^(?:(?:Please )?(?:Summarize the following article|Review the following code|Translate the following text into (?:English|Chinese))|(?:请)?(?:总结以下文章|审查以下代码|将以下文本翻译成(?:中文|英文)))[:：]$/.test(header)){reusable=header;mode='instruction';}
 let normalized=structured(reusable)?reusable:reusable.normalize('NFC');
 if(!structured(normalized)){
  normalized=normalized.trim();
  // Finite lexical equivalences only: never erase negation or an argument.
  normalized=normalized.replace(/^Please (?=(?:summarize|explain|translate|review)\b)/,'').replace(/^请(?=(?:总结|解释|翻译|审查))/,'');
 }
 const trivial=/^(?:请)?(?:继续|开始|好的?|重试|重新生成)[。！! .]*$|^(?:please )?(?:continue|start|ok(?:ay)?|retry|regenerate)[.! ]*$/i.test(normalized);
 return {normalized,text:reusable,mode,trivial};
}
export async function projectPromptFamilies(inputs,preferences=emptyPromptPreferences(),now=Date.now()){
 const groups=new Map(),splits=new Map(preferences.splits.map(x=>[x.inputId,x.group]));
 for(const input of inputs){
  if(input.role!=='user'||input.eligible!==true)continue;
  const candidate=promptCandidate(input.text);if(!candidate)continue;
  const key=splits.has(input.id)?'split:'+splits.get(input.id):candidate.normalized;
  let g=groups.get(key);if(!g){g={key,members:[],variants:new Map(),conversations:new Map(),trivial:candidate.trivial};groups.set(key,g);}
  g.members.push(input.id);const at=Number.isFinite(input.at)?Math.min(now,input.at):null;
  const v=g.variants.get(candidate.text)||{text:candidate.text,count:0,at:0};v.count++;v.at=Math.max(v.at,at||0);g.variants.set(candidate.text,v);
  const c=g.conversations.get(input.conversation)||{count:0,at:null};c.count++;if(at!==null)c.at=Math.max(c.at||0,at);g.conversations.set(input.conversation,c);
 }
 const result=[];
 for(const g of groups.values()){
  const id='pf:'+await hashText(g.key),override=preferences.overrides.find(x=>x.id===id);
  const representative=override?.representative&&inputs.find(x=>x.id===override.representative&&g.members.includes(x.id));
  const text=override?.text??(representative?promptCandidate(representative.text).text:[...g.variants.values()].sort((a,b)=>b.count-a.count||b.at-a.at||(a.text<b.text?-1:a.text>b.text?1:0))[0].text);
  const frequency=[...g.conversations.values()].reduce((sum,c)=>sum+(c.at===null?.75:.75+.25*Math.pow(.5,Math.max(0,now-c.at)/(180*86400000))),0);
  result.push({id,text,members:g.members.sort(),conversations:g.conversations.size,score:frequency+Math.min(.2,Math.max(0,g.members.length-g.conversations.size)*.01)+Math.min(.1,(override?.reuseCount||0)*.01),hidden:override?.hidden===true,edited:override?.text!==undefined,useful:!g.trivial&&(g.members.length>=2||g.key.startsWith('split:')),retained:!!override});
 }
 for(const o of preferences.overrides)if(o.text!==undefined&&!result.some(x=>x.id===o.id))result.push({id:o.id,text:o.text,members:[],conversations:0,score:Math.min(.1,o.reuseCount*.01),hidden:o.hidden,edited:true,useful:true});
 const pins=new Map(preferences.pins.map((id,i)=>[id,i]));for(const r of result)r.pinned=pins.has(r.id);
 result.sort((a,b)=>a.pinned!==b.pinned?(a.pinned?-1:1):a.pinned?pins.get(a.id)-pins.get(b.id):b.score-a.score||(a.id<b.id?-1:1));return result;
}
// A snapshot is presentation order, never release authority. Refresh is explicit.
export class PromptListSession{
 open(projection){this.items=structuredClone(projection.items);return structuredClone(this.items);}
 current(){return structuredClone(this.items||[]);}
 reconcile(projection){const current=new Map(projection.items.map(x=>[x.id,x]));this.items=(this.items||[]).filter(x=>current.get(x.id)?.text===x.text);return this.current();}
 refresh(projection){return this.open(projection);}
 close(){this.items=null;}
}
