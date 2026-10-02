import assert from 'node:assert/strict';
// Historical release scenarios now exercise the explicit D4 review boundary.
// Fixtures still own every selection, mutation and release assertion.
export async function reviewManualSelection(f){
 if(!f.state.purpose)await f.call('task',{purpose:'Inspect the explicitly selected synthetic materials'});
 const compiled=await f.call('compile');
 if(['blocked','stale'].includes(compiled.state))return compiled;
 assert.equal(compiled.state,'review');
 const {outputSha256,manifestSha256}=compiled.reviewBinding;
 const reviewed=await f.call('confirmReview',{outputSha256,manifestSha256});
 assert.equal(reviewed.state,'ready');return reviewed;
}
