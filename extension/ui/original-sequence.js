// Copy consumes the complete explicit target, never the mounted Reader page.
export async function readOriginalText({read,target,generation,isCurrent=()=>true}){
 let cursor=null;const seen=new Set(),positions=new Set(),text=[];
 do{
  if(!isCurrent())throw Error('ORIGINAL_CLOSED');
  const position=JSON.stringify(cursor);if(positions.has(position))throw Error('INVALID_ORIGINAL_CURSOR');positions.add(position);
  const page=await read({target,cursor,expectedGeneration:generation,limit:100});
  if(!isCurrent()||page.generation!==generation)throw Error('BACKUP_CHANGED');
  if(page.availability!=='available'||page.unavailable)throw Error('SOURCE_UNAVAILABLE');
  for(const row of page.records){if(seen.has(row.id))throw Error('INVALID_ORIGINAL_CURSOR');seen.add(row.id);text.push(row.originalText);}
  cursor=page.nextCursor;
 }while(cursor);
 const check=await read({target,expectedGeneration:generation,limit:1});
 if(!isCurrent()||check.generation!==generation||check.availability!=='available'||seen.size!==check.intended)throw Error('BACKUP_CHANGED');
 return text.join('\n\n');
}
