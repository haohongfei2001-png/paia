import test from 'node:test';
import assert from 'node:assert/strict';
import {validateContentHeaderInteractions} from '../scripts/verify-topic-retained.mjs';

const entryId='aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',sectionId='bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',bodyDigest='c'.repeat(64);
function fixture(){
 return [
  {kind:'native-directory-tab'},{kind:'native-keyboard-history'},
  {kind:'retired-search-service-only',retainedIds:[entryId]},
  {kind:'text200-failure-layout',contentFocus:[{},{}]},{kind:'text200-failure-layout',contentFocus:[{},{}]},
  {kind:'coarse-controls'},{kind:'coarse-history'},
  {kind:'saved-ai-original-target',entryId,sectionId,bodyDigest,bodyLength:123,actual:{currentSectionId:sectionId}},
  {kind:'saved-ai-history-early-dismissal'},{kind:'saved-ai-header'},
  {kind:'back-original-return',sameNodes:true,entryId,sectionId,bodyDigest,bodyLength:123,actual:{currentSectionId:sectionId}},
 ];
}
test('current header receipt admits the exact approved native sequence and qualified same-body return',()=>{
 assert.doesNotThrow(()=>validateContentHeaderInteractions(fixture()));
});
for(const fault of ['missing','extra','reordered','retired-search','duplicate-target','missing-focus-endpoint','invalid-entry','invalid-section','changed-entry','changed-section','unqualified-departure','unqualified-return','substituted-target','missing-body','empty-body','fractional-length','changed-length','missing-digest','invalid-digest','changed-digest','replaced-header'])test('current header receipt rejects '+fault,()=>{
 const rows=fixture(),departure=rows[7],returned=rows[10];
 if(fault==='missing')rows.splice(7,1);if(fault==='extra')rows.push(structuredClone(returned));if(fault==='reordered')[rows[7],rows[8]]=[rows[8],rows[7]];if(fault==='retired-search')rows[2].kind='search-clear';if(fault==='duplicate-target')rows[8].kind=departure.kind;
 if(fault==='missing-focus-endpoint')rows[3].contentFocus.pop();if(fault==='invalid-entry')departure.entryId='';if(fault==='invalid-section')departure.sectionId='';if(fault==='changed-entry')returned.entryId='dddddddd-dddd-4ddd-dddd-dddddddddddd';if(fault==='changed-section')returned.sectionId='eeeeeeee-eeee-4eee-eeee-eeeeeeeeeeee';
 if(fault==='unqualified-departure')departure.actual.currentSectionId='sibling';if(fault==='unqualified-return')returned.actual.currentSectionId='sibling';if(fault==='substituted-target')rows[2].retainedIds=['different-entry'];
 if(fault==='missing-body')delete departure.bodyLength;if(fault==='empty-body')departure.bodyLength=0;if(fault==='fractional-length')departure.bodyLength=.5;if(fault==='changed-length')returned.bodyLength++;
 if(fault==='missing-digest')delete departure.bodyDigest;if(fault==='invalid-digest')departure.bodyDigest='not-sha256';if(fault==='changed-digest')returned.bodyDigest='d'.repeat(64);if(fault==='replaced-header')returned.sameNodes=false;
 assert.throws(()=>validateContentHeaderInteractions(rows));
});
