// Presentation only. Dates already carry the trusted domain expression basis.
export const expressionYear = entry => entry?.expressionTime?.year ?? 'unknown';
export function expressionCaption(entry,locale='zh-CN'){
 const at=entry?.expressionTime?.at;
 if(!at)return locale==='en'?'Expression time unknown':'时间未知';
 return new Intl.DateTimeFormat(locale==='en'?'en':'zh-CN',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'UTC'}).format(new Date(at))+' UTC';
}
