// Source-record export retains its existing format. This only coordinates a
// single archive generation across its bounded reads, including the final check.
export async function readSourceExport({read,query='',providerKey=null}){
 let generation=null;const records=[],documents=new Set(),recordIds=new Set();
 async function page(options){
  const result=await read({...options,...(generation===null?{}:{expectedGeneration:generation})});
  if(!Number.isSafeInteger(result.dataGeneration)||generation!==null&&result.dataGeneration!==generation)throw Error('BACKUP_CHANGED');
  generation=result.dataGeneration;return result;
 }
 async function pages(options,visit){
  let cursor=null;const seen=new Set();
  do{const key=JSON.stringify(cursor);if(seen.has(key))throw Error('INVALID_EXPORT_CURSOR');seen.add(key);
   const result=await page({...options,cursor,limit:100});await visit(result);cursor=result.nextCursor;
  }while(cursor);
 }
 await pages({view:'archive',query,...(providerKey?{providerKey}:{})},async list=>{
  for(const doc of list.documents){
   if(documents.has(doc.id))throw Error('INVALID_EXPORT_CURSOR');documents.add(doc.id);
   await pages({view:'archive',documentId:doc.id},part=>{
    for(const record of part.records){if(recordIds.has(record.id))throw Error('INVALID_EXPORT_CURSOR');recordIds.add(record.id);records.push(record);}
   });
  }
 });
 return {records,verify:()=>page({view:'settings'})};
}
