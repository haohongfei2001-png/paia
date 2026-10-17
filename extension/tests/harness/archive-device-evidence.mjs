import assert from 'node:assert/strict';

// Validate the actual browser media sample. A correctly sized fine-pointer
// control cannot certify the coarse journey; never repair device state here.
export function assertArchiveDevice(sample,{hasTouch,label}){
 assert.equal(sample.coarse,hasTouch,label+' coarse media');
 assert.equal(sample.fine,!hasTouch,label+' fine media');
 assert.ok(Number.isInteger(sample.maxTouchPoints)&&(hasTouch?sample.maxTouchPoints>=1:sample.maxTouchPoints===0),label+' touch capability');
}
