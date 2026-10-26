// Internal, fixed eligibility projections. IndexedDB physically returns a whole
// canonical row; discard its body/title/note immediately, without retaining or
// hashing them. These values never confer a processing grant or activity time.
const project=(row,fields)=>row?Object.fromEntries(fields.map(key=>[key,structuredClone(row[key]??null)])):null;
export function lifecycleEntryMetadata(row){return project(row,[
 'id','storageSchema','revision','lifecycle','quarantineKey','quarantineSealed',
 'hasHumanAction','origin','sourceRecordIds','workingInputId','bodyBinding',
 'provenanceType','bindingRevision','contentRevision','fieldRevisions',
 'updatedSequence','negativeUpdatedSequence','staleReasons','protections'
]);}
export function lifecycleInputMetadata(row){return project(row?.value,[
 'id','documentId','excluded','branchStatus','provenance','originalTextReference'
]);}
