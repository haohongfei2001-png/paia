// Shared, provider-neutral lexical search primitives for Input, Thought and Context.
// Canonical content remains in its owning stores; this module creates no durable text cache.

export const SEARCH_SERVICE_VERSION=1;

export const normalizeSearch=value=>String(value||'').normalize('NFKC').toLocaleLowerCase().trim();

// Keep the established Input/Thought rank contract stable while the three search
// surfaces move onto one shared foundation: exact title -> title partial -> body -> AI.
export function searchRank(query,title,body='',ai=false){
 const q=normalizeSearch(query),t=normalizeSearch(title);
 if(!q)return -1;
 if(ai)return normalizeSearch(body).includes(q)?3:-1;
 if(t===q)return 0;
 if(t.includes(q))return 1;
 return normalizeSearch(body).includes(q)?2:-1;
}

export function rankSearchPage(items){
 return items.sort((a,b)=>(a.rank??2)-(b.rank??2)
  ||(Date.parse(b.updatedAt||b.sourceSentAt)||0)-(Date.parse(a.updatedAt||a.sourceSentAt)||0)
  ||String(a.id||a.entryId||a.topicId).localeCompare(String(b.id||b.entryId||b.topicId)));
}

const QUERY_STOP_TERMS=new Set([
 '我的','我想','我该','应该','怎么','如何','下一','一步','什么','可以','请问','帮我','相关','一下','关于','了解',
 'the','and','with','what','how','should'
]);

// Invocation-local query preparation. Chinese 2/3-character n-grams improve
// lexical recall without introducing embeddings, a vector store or another truth layer.
export function queryTerms(query){
 const words=normalizeSearch(query).match(/[a-z0-9_]{2,}|[\p{Script=Han}]+/gu)||[],out=[];
 for(const word of words){
  if(/^[\p{Script=Han}]+$/u.test(word)){
   if(word.length===1)out.push(word);
   else for(let n=2;n<=Math.min(3,word.length);n++)for(let i=0;i<=word.length-n;i++)out.push(word.slice(i,i+n));
  }else out.push(word);
 }
 return [...new Set(out)].filter(x=>!QUERY_STOP_TERMS.has(x)).slice(0,120);
}

export function searchOverlap(terms,text){
 const value=normalizeSearch(text);
 return terms.length?terms.filter(term=>value.includes(term)).length/terms.length:0;
}

export function prepareSearchQuery(query){
 const q=normalizeSearch(query);
 return {q,terms:queryTerms(q),han:[...new Set(q.match(/[\p{Script=Han}]/gu)||[])]};
}

// Shared relevance signals used by Context today and available to future Input /
// Thought retrieval after their current ranked-pagination contract is migrated.
export function rankLexicalCandidate(item,query,prepared=prepareSearchQuery(query)){
 const {q,terms,han}=prepared,
  body=normalizeSearch(item.body),title=normalizeSearch(item.title||''),
  topic=normalizeSearch(item.topicName||''),section=normalizeSearch(item.sectionTitle||'');
 const direct=searchOverlap(terms,body),titleMatch=searchOverlap(terms,title),
  topicMatch=searchOverlap(terms,topic),sectionMatch=searchOverlap(terms,section);
 const hanOverlap=han.length>=2?han.filter(c=>body.includes(c)).length/han.length:0;
 const exact=q.length>=2&&(body.includes(q)||title===q);
 const score=Math.max((exact?100:0)+direct*60+titleMatch*20+sectionMatch*12+topicMatch*12+(direct>0?hanOverlap:0),item.relatedScore||0);
 return {...item,score,why:[
  ...(direct||titleMatch?['与当前问题相关']:topicMatch||sectionMatch?['主题或章节与问题相关']:item.relatedScore?['相关综合的思想依据']:[]),
  ...(item.human?['你编辑或确认过的内容']:[]),
  ...(item.pinned?['来自置顶主题']:[])
 ]};
}

// Find a relevant excerpt using original Unicode code-point windows. Never use
// offsets from normalized text to slice the original: NFKC may change length and
// JavaScript UTF-16 offsets can split emoji/surrogate pairs.
export function searchExcerpt(text,query,limit=2000){
 const source=String(text??''),chars=[...source];
 if(chars.length<=limit)return source;
 const terms=queryTerms(query);let best=0,bestScore=-1;
 const width=Math.max(1,limit-2),step=Math.max(1,Math.floor(width/2));
 for(let start=0;start<chars.length;start+=step){
  const part=chars.slice(start,start+width).join(''),score=searchOverlap(terms,part);
  if(score>bestScore){bestScore=score;best=start;}
 }
 return (best?'…':'')+chars.slice(best,best+width).join('')+(best+width<chars.length?'…':'');
}
