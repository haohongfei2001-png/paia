// CPV1-12.3A-1: finite, local, precision-first rules. No storage or IO.
export const NEXT_ACTION_VERSION='direct-choice-1';
export const NEXT_REPLY_LIMITS=Object.freeze({characters:32768,bytes:131072,blocks:256,candidate:120});
const defer=reason=>({version:NEXT_ACTION_VERSION,type:'DEFER',confidence:'LOW',reason});
const count=text=>Array.from(text).length;
const risk=/(?:删除|清空|销毁|覆盖|付款|支付|转账|购买|订阅|退订|授权|权限|密码|口令|密钥|凭证|令牌|验证码|登录码|银行卡|身份证|全部资料|所有资料|整个档案|自动发送|PAIA|delete|erase|purge|wipe|overwrite|pay\b|payment|transfer|purchase|subscribe|permission|authori[sz]|consent|password|credential|secret|token|cookie|api\s*key|verification\s*code|one.time\s*(?:code|password)|bank|medical|diagnos|contract|resign|send\s+automatically|whole\s+archive)/iu;
const contextual=/(?:例如|示例|举例|例子|文档(?:中|里|写道|说明|要求|指出|[：:])|教程|手册|引用|原话|他(?:说|写)|她(?:说|写)|对方|第三方|假设|假如|若是|终端|命令行|其他应用|另一个应用|for\s+example|example|documentation(?:\s*(?:[:：]|\b(?:says|states|instructs|requires|recommends|requests|tells|indicates)\b))|manual|tutorial|quoted?|someone|they\s+(?:said|wrote)|he\s+said|she\s+said|suppose|hypothetical|terminal|command\s+line|another\s+app)/iu;
const negation=/(?:不要|不能|不可|无需|不必|不是让|别(?:回复|说|输入)|do\s+not|don['’]t|never|shouldn['’]t|not\s+(?:reply|say|type|tell))/iu;
const material=/(?:日志|文件|截图|链接|路径|附件|上传|粘贴|error\s+log|screenshot|attach|upload|paste|file|link|path)/iu;
const requestPattern=/(?:回复|告诉我|只要你说|Reply(?:\s+with)?|Tell\s+me|Say|Type)\s*[“"「]/giu;
// Direct v1 accepts non-consequential acknowledgement/continuation literals only.
// Unknown literal meanings are unsupported, even when their quotation is exact.
const safeLiteral=/^(?:继续|停止|已登录|完成了|已完成|准备好了|准备好|好了|收到|未完成|还没准备好|保留原文|ready|done|finished|continue|stop|not ready|not done|I am ready)(?:[。.!！])?$/iu;
const quote='[“"「]([^”"」\\n]+)[”"」]';
const zhBefore='(登录完成后|登录后|完成后|准备好后|确认完成后|如果已经完成|如果已经登录|只要你准备好|)';
const zh=new RegExp('^(?:请)?'+zhBefore+'(?:请)?(?:回复|告诉我|只要你说)\\s*'+quote+'(?:[，,]我就继续)?[。.!！]?$', 'u');
const en=new RegExp('^(?:(When (?:finished|ready|done)|After (?:logging in|you finish|you have finished))[, ]+)?(?:Please )?(?:Reply(?: with)?|Tell me|Say|Type)\\s*'+quote+'(?: (when (?:finished|ready|done)|after (?:logging in|you finish|you have finished)|to continue))?[.!]?$', 'iu');
const conditionLabel=s=>({'登录完成后':'登录后','如果已经登录':'如果已登录','如果已经完成':'如果已完成'}[s]||s);

export function detectNextAction(snapshot){
 if(!snapshot||snapshot.completed!==true)return defer('COMPLETION_UNVERIFIED');
 const {text,blocks}=snapshot;
 if(typeof text!=='string'||text.length>NEXT_REPLY_LIMITS.characters*2||!Number.isSafeInteger(blocks)||blocks<1||blocks>NEXT_REPLY_LIMITS.blocks||count(text)>NEXT_REPLY_LIMITS.characters||new TextEncoder().encode(text).length>NEXT_REPLY_LIMITS.bytes)return defer('RESOURCE_LIMIT');
 if(snapshot.excluded===true||/(?:^|\n)\s*>|```|~~~|`/.test(text))return defer('QUOTED_OR_EXAMPLE');
 if(/[\u0000-\u0008\u000b-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/u.test(text))return defer('UNSUPPORTED_STRUCTURE');
 if(risk.test(text))return defer('SENSITIVE_AUTHORIZATION');
 if(contextual.test(text))return defer('QUOTED_OR_EXAMPLE');
 if(negation.test(text))return defer('NEGATED_CANDIDATE');
 if(material.test(text))return defer('PREREQUISITE_UNCLEAR');
 const requests=[...text.matchAll(requestPattern)];
 if(requests.length>1)return defer('CONFLICTING_ACTIONS');
 // Only a complete, final standalone request is accepted. No tail is hidden.
 const trimmed=text.trim(),line=trimmed.split('\n').filter(x=>x.trim()).at(-1)?.trim()||'';
 const offset=text.lastIndexOf(line);
 const choices=/^(?:请(?:选择|回复)[：:]?\s*(是\s*[/／]\s*否|继续\s*[/／]\s*停止|A\s*[/／]\s*B(?:\s*[/／]\s*C)?)|(?:Please )?(?:Choose|Reply with)[：:]?\s*(yes\s*\/\s*no|continue\s*\/\s*stop|A\s*\/\s*B(?:\s*\/\s*C)?))[。.!！]?$/iu.exec(line);
 if(choices){
  // Bare letter choices only have meaning if this reply explicitly names them.
  const options=(choices[1]||choices[2]).split(/\s*[/／]\s*/u);
  const prefix=trimmed.slice(0,trimmed.lastIndexOf(line)).trim();
  let labels=options,condition='';
  if(options[0].toUpperCase()==='A'){
   labels=options.map(option=>new RegExp('(?:^|\\n)'+option+'[.、:：)）]\\s*([^\\n]+)','u').exec(prefix)?.[1]);
   if(labels.some(x=>!x||! /^(?:概要|详细说明|总结|解释|比较|继续解释|停止解释|Summarize|Explain|Compare|Continue explaining|Stop explaining)$/iu.test(x))||prefix.split('\n').length!==options.length)return defer('AMBIGUOUS_REFERENCE');
   labels=labels.map((label,i)=>options[i]+' · '+label);
  }else if(/^(?:是|yes)$/iu.test(options[0])){
   // Versioned low-risk questions only. Bare yes/no lacks a referent.
   if(!/^(?:需要简短回答吗？|要我继续解释吗？|Would you like a shorter answer\?|Should I continue explaining\?)$/u.test(prefix))return defer('AMBIGUOUS_REFERENCE');
   condition=prefix;
  }else if(prefix)return defer('UNSUPPORTED_STRUCTURE');
  return {version:NEXT_ACTION_VERSION,type:'CHOICE',confidence:'HIGH',sourceType:'REPLY_SPAN',choices:options,labels,condition,evidence:{start:offset,end:offset+line.length}};
 }
 const z=zh.exec(line),e=en.exec(line),m=z||e;
 if(!m)return defer(requests.length?'UNSUPPORTED_STRUCTURE':'NO_EXPLICIT_NEXT_ACTION');
 const candidate=m[2],condition=z?conditionLabel(m[1]):[m[1],m[3]].filter(Boolean).join(' · ');
 if(!candidate.trim()||candidate!==candidate.trim()||count(candidate)>NEXT_REPLY_LIMITS.candidate)return defer('CANDIDATE_TOO_LONG');
 if(risk.test(candidate)||!safeLiteral.test(candidate))return defer('UNSAFE_OR_UNSUPPORTED_LITERAL');
 // Avoid accepting a request whose preceding prose supplies a hidden condition,
 // a conflicting choice, question, or unresolved deictic instruction.
 const prefix=text.slice(0,offset);
 if(prefix.trim())return defer('PREREQUISITE_UNCLEAR');
 return {version:NEXT_ACTION_VERSION,type:'DIRECT_REPLY',confidence:'HIGH',sourceType:'REPLY_SPAN',choices:[candidate],condition,evidence:{start:offset,end:offset+line.length}};
}
