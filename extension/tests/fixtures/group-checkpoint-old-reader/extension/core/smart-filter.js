// Entire-input grammar. Preservation guards run before any pure-control production.
export const FILTER_VERSIONS=Object.freeze({filterVersion:1,policyVersion:2,classifierVersion:'deterministic-light-2'});
export const classifierContract=Object.freeze({version:1,provider:'none',runtimeEnabled:false,decisions:['keep','filter','uncertain'],failureDecision:'uncertain'});
export const UNCERTAIN_REASONS=Object.freeze(['metadata_unknown','context_insufficient','ambiguous_ack','reference_possible','substantive_content','unsupported_expression','rule_no_match','other']);
export const FILTER_REASONS=Object.freeze({pure_continue:'仅推进或继续当前生成',pure_start:'仅开始当前操作',pure_retry:'仅要求重试或再来一版',pure_regenerate:'仅要求重新生成',user_protected:'用户内容保留保护',reference_or_attachment:'存在附件或引用，已保留',metadata_unknown:'缺少可靠的编辑状态或元数据格式',context_insufficient:'缺少语境，已保留',ambiguous_ack:'可能是确认或选择，已保留',reference_possible:'可能引用其他内容，已保留',substantive_content:'包含实际信息或保护性表达，已保留',unsupported_expression:'不支持的表达形式，已保留',rule_no_match:'未命中完整纯控制语法，已保留',other:'无法安全判定，已保留'});
export function normalizePresence(p){
 if(!p||Object.keys(p).sort().join(',')!=='attachment,confidence,reference,version'||p.version!==1||!['absent','present','unknown'].includes(p.attachment)||!['absent','present','unknown'].includes(p.reference)||!['verified','unknown'].includes(p.confidence))return null;
 return {version:1,attachment:p.attachment,reference:p.reference,confidence:p.confidence};
}
export function preservationReason({text,authorship,userEdited=false,filterOverride='none',presence,presenceInvalid=false}={}){
 if(userEdited||filterOverride==='keep'||authorship==='user_edited')return 'user_protected';
 if(presence?.attachment==='present'||presence?.reference==='present')return 'reference_or_attachment';
 if(!['untouched','legacy_unknown'].includes(authorship)||typeof userEdited!=='boolean'||!['none','keep'].includes(filterOverride))return 'metadata_unknown';
 if(presenceInvalid||presence!=null&&!normalizePresence(presence))return 'metadata_unknown';
 if(typeof text!=='string'||!text.length||text.length>100000)return 'other';
 // Quoted/structured/creative content, questions, corrections, constraints and decisions never become controls.
 if(/[\r\n\u2028\u2029]/u.test(text)||/["“”‘’`<>\[\]{}]/u.test(text))return 'substantive_content';
 if(/[?？]/u.test(text)||/(?:为什么|为何|怎么|如何|是否|多少|哪里|哪一|吗|么|不是|不对|说错|纠正|不要|别改|不许|禁止|不得|不能|必须|保留|限制|预算|决定|选择|选第|就选|偏好|喜欢|讨厌|更正式|搜索|截止|岗位|才是|算了)/u.test(text)||/\b(?:why|what|when|where|who|how|which|can|could|would|should|must|never|not|don't|without|except|unless|but|budget|prefer|choose|chosen|decide|correction|instead|poem|write)\b/iu.test(text))return 'substantive_content';
 if(/(?:https?:\/\/|www\.|这个|那个|这些|那些|看这|看那|上面|下面|上述|如图|附件|图片|文件|链接|第[一二三四五六七八九十0-9]+个)/iu.test(text)||/\b(?:this|that|these|those|above|below|attached|attachment|image|file|link|second|option)\b/iu.test(text))return 'reference_possible';
 if(/^(?:好的?|可以|是的?|就这样|行|行吧|没问题|同意|确认|批准|不|yes|no|ok(?:ay)?|sure|fine|agreed|go ahead)[。.!！ ]*$/iu.test(text.replace(/^ +| +$/g,'')))return 'ambiguous_ack';
 return null;
}
const zhPrefix='(?:请(?:你)?)?',zhTail='(?:吧|啊|呀)?[。.!！]{0,3}';
const productions=Object.freeze([
 ['pure_continue',new RegExp('^'+zhPrefix+'(?:继续(?:做(?:下一步)?|下一步|生成)?|往下做|下一步)'+zhTail+'$','u'),/^(?:please )?(?:continue(?: generating)?|keep going|go on|next step)(?: please)?[。.!！]{0,3}$/iu],
 ['pure_start',new RegExp('^'+zhPrefix+'开始(?:做)?'+zhTail+'$','u'),/^(?:please )?(?:start(?: now)?|begin)(?: please)?[。.!！]{0,3}$/iu],
 ['pure_retry',new RegExp('^'+zhPrefix+'(?:再来(?:一|1)版|重试(?:一次)?|再试一次)'+zhTail+'$','u'),/^(?:please )?(?:retry|try again|one more version)(?: please)?[。.!！]{0,3}$/iu],
 ['pure_regenerate',new RegExp('^'+zhPrefix+'(?:再生成(?:一|1)(?:个|版)|重新生成)'+zhTail+'$','u'),/^(?:please )?(?:regenerate|generate (?:another one|one more))(?: please)?[。.!！]{0,3}$/iu]
]);
export function decideLight(sample={}){
 const result=(reasonCode,decision='keep')=>({decision,reasonCode,...FILTER_VERSIONS});
 if(!sample||typeof sample!=='object'||Array.isArray(sample))return result('other','uncertain');
 const protectedReason=preservationReason(sample);
 if(protectedReason)return result(protectedReason,['metadata_unknown','other'].includes(protectedReason)?'uncertain':'keep');
 const value=sample.text.replace(/^ +| +$/g,'');
 if(/[,，;；:：]/u.test(value))return result('substantive_content');
 // Do not let Unicode case folding turn lookalike letters into accepted English controls.
 if(!/^[\p{Script=Han}a-zA-Z0-9 。.!！]+$/u.test(value))return result('unsupported_expression','uncertain');
 for(const [reason,zh,en]of productions)if(zh.test(value)||en.test(value))return result(reason,'filter');
 if(/\d/u.test(value))return result('substantive_content');
 if(/^(?:嗯|那|然后|所以|and|then|so)[。.!！ ]*$/iu.test(value))return result('context_insufficient','uncertain');
 return result('rule_no_match','uncertain');
}
export function validFilterDecision(row,meta){return !!row&&row.decision==='filter'&&['untouched','legacy_unknown'].includes(row.authorship)&&!row.userEdited&&!row.presenceInvalid&&row.filterOverride!=='keep'&&row.presence?.attachment!=='present'&&row.presence?.reference!=='present'&&row.basedOnContentRevision===meta?.contentRevision&&Object.entries(FILTER_VERSIONS).every(([k,v])=>row[k]===v);}
