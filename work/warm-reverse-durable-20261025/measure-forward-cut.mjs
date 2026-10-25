import {existingSelectionFixture} from '../../extension/tests/harness/existing-application-selection.mjs';
import {OriginalApplicationGenerationSelection,APPLICATION_SELECTION_MARKER} from '../../extension/core/browser-native-sync/application-generation-selection.js';
import {measureSourceWorkingPhysicalTree as meter} from '../../extension/core/browser-native-sync/source-working-physical.js';
const cleanup=[],t={after:f=>cleanup.push(f)};
try{
 const f=await existingSelectionFixture(t),owner=new OriginalApplicationGenerationSelection(f.a,f.coreA,f.a.local);cleanup.push(()=>owner.close());await owner.prepare();await owner.activate();
 const result={scope:'Fresh synthetic forward-selected fixture only; NO reverse invocation. Sizes are calibration, not retrospectively captured failed-run phases.'};
 for(const [label,store]of [['source',f.a],['target',f.b]]){const raw=await f.snapshot(store);result[label]={bytes:meter(raw).B,tables:Object.fromEntries(Object.entries(raw).map(([k,v])=>[k,{rows:v.length,bytes:meter(v).B}])),canonicalMetadata:raw.meta.filter(r=>r.id.startsWith('canonical-generation:')).map(r=>({id:r.id,bytes:meter(r).B})),forwardMarkerBytes:meter(raw.meta.find(r=>r.id===APPLICATION_SELECTION_MARKER)).B};}
 console.log(JSON.stringify(result,null,2));
}finally{for(const close of cleanup.reverse())close();}
