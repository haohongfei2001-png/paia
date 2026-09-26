import {prefix} from './thought-model.js';
import {validProvider} from './read-projection-keys.js';

// Resolve current direct evidence; a Topic's historical sourceRecordIds are
// not a membership truth. Context-only evidence never attributes expression.
export async function entryMatchesProvider(store,t,entryId,providerKey){
 const refs=await t.all('provenance','byOwner',prefix(['entry',entryId]));
 for(const ref of refs){
  if(!['primary','supporting'].includes(ref.role))continue;
  const input=await t.get('inputStates',ref.inputId);
  if(!input||input.removalState!=='active'||input.sourcePurged)continue;
  const dependency=await t.edge('dependencies','byInputTarget',prefix([ref.inputId,'entry',entryId]));
  if(!dependency||(input.lastRemovalSequence||0)>(dependency.eligibilityEpochAtUse||0)
     ||!await store.sourcePresent(t,ref.sourceRecordIds))continue;
  for(const id of ref.sourceRecordIds||[]){
   const record=await t.get('records',id);
   if(validProvider(record?.value?.platform)&&record.value.platform===providerKey)return true;
  }
 }
 return false;
}
