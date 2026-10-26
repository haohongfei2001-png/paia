// Stage3A-2 local matching only. A match is NOT insertion or read authority:
// a future caller must revalidate Family eligibility/text/generation on use.
import {detectNextAction} from './next-action-detector.js';
export const NEXT_FAMILY_VERSION='exact-action-object-1';
export const NEXT_FAMILY_LIMITS=Object.freeze({families:64,textCharacters:2048,totalBytes:65536});
const defer=reason=>({version:NEXT_FAMILY_VERSION,type:'DEFER',confidence:'LOW',reason});
const own=(x,keys)=>!!x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).every(k=>keys.includes(k));
const normalized=s=>s.normalize('NFKC').toLowerCase().replace(/\s+/gu,' ').trim();
const actions=new Map([['explain','explain'],['解释','explain'],['simplify','simplify'],['简化','simplify'],['summarize','summarize'],['summarise','summarize'],['总结','summarize'],['compare','compare'],['比较','compare'],['check the logic of','logic'],['检查逻辑：','logic'],['check the edge cases of','edges'],['检查边界：','edges'],['list actionable steps for','steps'],['列出步骤：','steps']]);
const deictic=/(?:\b(?:this|that|these|those|it|them|my|your|our|his|her|their|above|previous|second|other|account|private)\b|这个|那个|这些|那些|上述|前面|第二|我的|你的|账户|帐号|账号|私有)/iu;
function intent(text,reply){
 const trimmed=text.trim();let value=trimmed;
 if(reply){const prefix=/^(?:Next, ask me to |下一步，请让我)/iu.exec(value);if(!prefix)return null;value=value.slice(prefix[0].length);}
 else value=value.replace(/^(?:Please |请)/iu,'');
 value=value.replace(/[。.]$/u,'');
 let quantity=null,language=null;
 const amount=/(?: in ([1-9]|1[0-2]) bullet points|，列出([1-9]|1[0-2])点)$/u.exec(value);
 if(amount){quantity=Number(amount[1]||amount[2]);value=value.slice(0,amount.index);}
 const lang=/(?: in (English|Chinese)|，用(英文|中文))$/u.exec(value);
 if(lang){language=['English','英文'].includes(lang[1]||lang[2])?'en':'zh';value=value.slice(0,lang.index);}
 const parsed=/^(explain|simplify|summarize|summarise|compare|check the logic of|check the edge cases of|list actionable steps for) ([\s\S]+)$|^(解释|简化|总结|比较|检查逻辑：|检查边界：|列出步骤：)([\s\S]+)$/iu.exec(value);
 if(!parsed)return null;
 const object=parsed[2]||parsed[4],action=actions.get((parsed[1]||parsed[3]).toLowerCase()),literal=normalized(object);
 // Only literal, bounded object labels. Clauses, references and hidden tails
 // are unsupported; lexical equivalence never erases arguments or negation.
 if(!object||Array.from(object).length>80||deictic.test(literal)||! /^[\p{L}\p{N} ]+$/u.test(object)||/\b(?:and|or|then|not|without|unless|after|before|if|when|once|until|while|provided|only|must|please|explain|summarize|simplify|compare|send|share|post|write|execute)\b|(?:不要|不含|然后|之后|之前|如果|仅|必须|以及|并且|发送|分享|执行|完成后|登录后|准备好后)/iu.test(literal))return null;
 return {action,object:normalized(object),language,quantity,start:text.indexOf(trimmed),end:text.indexOf(trimmed)+trimmed.length};
}
function candidates(view){
 if(!own(view,['available','complete','generation','items'])||view.available!==true||view.complete!==true||!Number.isSafeInteger(view.generation)||view.generation<0||!Array.isArray(view.items))return null;
 if(view.items.length>NEXT_FAMILY_LIMITS.families)return null;
 let bytes=0;const ids=new Set();
 for(const item of view.items){
  if(!own(item,['id','text','hidden','useful','pinned','edited','retained'])||typeof item.id!=='string'||! /^(?:pf:[a-f0-9]{64}|manual:[a-f0-9-]{36})$/u.test(item.id)||ids.has(item.id)||typeof item.text!=='string'||!item.text.trim()||Array.from(item.text).length>NEXT_FAMILY_LIMITS.textCharacters)return null;
  if(['hidden','useful','pinned','edited','retained'].some(k=>typeof item[k]!=='boolean'))return null;
  ids.add(item.id);bytes+=new TextEncoder().encode(item.text).length;if(bytes>NEXT_FAMILY_LIMITS.totalBytes)return null;
 }
 return view.items.filter(x=>!x.hidden&&(x.useful||x.pinned||x.edited||x.retained));
}
export function matchNextFamily(snapshot,view){
 const prior=detectNextAction(snapshot);
 if(prior.type!=='DEFER')return prior;
 if(prior.reason!=='NO_EXPLICIT_NEXT_ACTION')return prior;
 const normalizedSafety=detectNextAction({...snapshot,text:snapshot.text.normalize('NFKC')});
 if(normalizedSafety.type!=='DEFER'||normalizedSafety.reason!=='NO_EXPLICIT_NEXT_ACTION')return defer('FAMILY_INTENT_UNSUPPORTED');
 const wanted=intent(snapshot.text,true);if(!wanted)return defer('FAMILY_INTENT_UNSUPPORTED');
 const items=candidates(view);if(!items)return defer('FAMILY_VIEW_UNAVAILABLE');
 const matches=items.filter(item=>{
  const safe=detectNextAction({completed:true,text:item.text.normalize('NFKC'),blocks:1,excluded:false});
  if(safe.type!=='DEFER'||safe.reason!=='NO_EXPLICIT_NEXT_ACTION')return false;
  const offered=intent(item.text,false);
  return offered&&['action','object','language','quantity'].every(k=>offered[k]===wanted[k]);
 });
 if(matches.length!==1)return defer(matches.length?'FAMILY_AMBIGUOUS':'FAMILY_RELEVANCE_INSUFFICIENT');
 const family=matches[0];
 return {version:NEXT_FAMILY_VERSION,type:'PROMPT_FAMILY_MATCH',confidence:'HIGH',sourceType:'PROMPT_FAMILY',family:{id:family.id,text:family.text,generation:view.generation},choices:[family.text],condition:'',evidence:{start:wanted.start,end:wanted.end}};
}
