import test from 'node:test';import assert from 'node:assert/strict';import {validateRealEvidence} from '../scripts/compatibility-gate.mjs';
test('release requires current-runtime real evidence and every user acceptance invariant',()=>{
 const e={productVersion:'0.5.0',indexedDBActive:true,migrationFieldEquality:true,migrationRecoveryVerified:true,tombstonesPreserved:true,paginatedRead:true,directEditing:true,autoSave:true,sessionUndoRedo:true,sharedTitle:true,originalReadOnly:true,settingsDefaults:true,schema5Migration:true,selfReload:true,libraryDefault:true,conversationGrouping:true,continuousDocument:true,sourceDateTimeCorrect:true,libraryEditImmutable:true,libraryExcludeNoRevival:true,permanentSourceIgnore:true,sameTextOtherSourceUnaffected:true,format:'paia-real-chrome-v1',runtimeDigest:'synthetic-digest',matchedHistorical:3,sourceBeforeCutoff:true,capturedAtUnchanged:true,contentHashUnchanged:true,refreshNoDuplicates:true,reopenNoDuplicates:true,archiveUI:true};
 assert.equal(validateRealEvidence(e,'synthetic-digest'),true);assert.equal(validateRealEvidence(e,'changed-runtime'),false);
 for(const k of ['indexedDBActive','migrationFieldEquality','migrationRecoveryVerified','tombstonesPreserved','paginatedRead','directEditing','autoSave','sessionUndoRedo','sharedTitle','originalReadOnly','settingsDefaults','schema5Migration','selfReload','libraryDefault','conversationGrouping','continuousDocument','sourceDateTimeCorrect','libraryEditImmutable','libraryExcludeNoRevival','permanentSourceIgnore','sameTextOtherSourceUnaffected','sourceBeforeCutoff','capturedAtUnchanged','contentHashUnchanged','refreshNoDuplicates','reopenNoDuplicates','archiveUI'])assert.equal(validateRealEvidence({...e,[k]:false},'synthetic-digest'),false);
 for(const n of [0,-1,null,'3'])assert.equal(validateRealEvidence({...e,matchedHistorical:n},'synthetic-digest'),false);
});


test('v0.4 release rejects old or incomplete Thought Library real acceptance evidence',()=>{
 const e={format:'paia-real-chrome-v1',runtimeDigest:'synthetic-digest',matchedHistorical:3,sourceBeforeCutoff:true,capturedAtUnchanged:true,contentHashUnchanged:true,refreshNoDuplicates:true,reopenNoDuplicates:true,archiveUI:true};
 assert.equal(validateRealEvidence(e,'synthetic-digest'),false);
});


test('v060 IA release requires current isolated Chrome IA evidence; never reuses v050 historical acceptance',async()=>{
 const {IA_REAL_CHECKS}=await import('../scripts/compatibility-gate.mjs');const e={productVersion:'0.6.0',format:'paia-real-chrome-ia-v1',scope:'isolated-synthetic',runtimeDigest:'synthetic-digest',...Object.fromEntries(IA_REAL_CHECKS.map(k=>[k,true]))};assert.equal(validateRealEvidence(e,'synthetic-digest'),true);for(const k of IA_REAL_CHECKS)assert.equal(validateRealEvidence({...e,[k]:false},'synthetic-digest'),false);assert.equal(validateRealEvidence({...e,scope:'private-live'},'synthetic-digest'),false);assert.equal(validateRealEvidence(e,'other-runtime'),false);
});
