import {fail} from './thought-model.js';
import {validateMemoryRow} from './memory/model.js';

// A removed active path must not discard its restrictive Context fence and
// expose a shared Entry through an already allowed Topic. Keep the current
// permission owner as the sole truth: refuse the structural change rather than
// copying a denial, granting another path or rewriting any permission here.
// The user may separately revise the existing restriction through its owner.
export async function assertPromotionPathRemovalAllowed(t,topicId,sectionIds){
 for(const kind of ['topic','section']){
  let after=null;do{
   const page=await t.primaryRangePage('meta',{prefix:'memory:'+kind+':',after,limit:100});
   for(const {value:row}of page.rows){
    if(!validateMemoryRow(row))fail();
    if(row.topicId===topicId&&(kind==='topic'&&['denied','never'].includes(row.decision)||kind==='section'&&row.excluded&&sectionIds.includes(row.sectionId)))fail();
   }
   after=page.next;
  }while(after);
 }
}
