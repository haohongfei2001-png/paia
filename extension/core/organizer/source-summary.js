// Extractive only: scoring chooses a user's existing passage, never rewrites it.
export function sourceFaithfulSummary(entries){
 const ranked=entries.filter(e=>typeof e.body==='string'&&e.body.trim()).map(e=>{
  const body=e.body.trim(),human=!!(e.userEdited||e.protections?.body?.locked),meaningful=body.length>=18;
  return {e,body,human,meaningful,time:Date.parse(e.updatedAt||e.createdAt||'')||0,density:Math.min(body.length,180)};
 }).sort((a,b)=>Number(b.human)-Number(a.human)||Number(b.meaningful)-Number(a.meaningful)||b.time-a.time||b.density-a.density||String(a.e.id||'').localeCompare(String(b.e.id||'')));
 const text=ranked[0]?.body||'';return text.length>140?text.slice(0,139)+'…':text;
}
