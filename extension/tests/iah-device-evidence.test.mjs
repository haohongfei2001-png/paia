import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {assertArchiveDevice} from './harness/archive-device-evidence.mjs';

test('IAH native coarse evidence refuses fine media even when the control is 44px',()=>{
 const fine={coarse:false,fine:true,maxTouchPoints:0,rect:{width:44,height:44}},coarse={coarse:true,fine:false,maxTouchPoints:1,rect:{width:44,height:44}};
 assertArchiveDevice(fine,{hasTouch:false,label:'fine baseline'});assertArchiveDevice(coarse,{hasTouch:true,label:'coarse target'});
 for(const sample of [fine,{...fine,maxTouchPoints:1},{...coarse,coarse:false},{...coarse,fine:true},{...coarse,maxTouchPoints:0},{...coarse,maxTouchPoints:NaN}])assert.throws(()=>assertArchiveDevice(sample,{hasTouch:true,label:'invalid device'}),assert.AssertionError);
 assert.throws(()=>assertArchiveDevice(coarse,{hasTouch:false,label:'invalid baseline'}),assert.AssertionError);
});

test('IAH selected fixture keeps separate lifetime devices and all original target thresholds',async()=>{
 const source=await readFile(new URL('./iah11-selected-acceptance-chrome-e2e.test.mjs',import.meta.url),'utf8');
 assert.match(source,/hasTouch:false/);assert.match(source,/headless:false,hasTouch:true/);
 assert.doesNotMatch(source,/newCDPSession|setTouchEmulationEnabled/);
 const guard=source.indexOf("assert.notEqual(process.env.PAIA_HEADLESS,'1'"),launch=source.indexOf('headless:false,hasTouch:true'),probe=source.indexOf("deviceEvidence(p,data,'fresh coarse context before seed',true)"),seed=source.indexOf('await seedArchive(h,p)',probe);
 assert.ok(guard>=0&&guard<launch&&launch<probe&&probe<seed,'forced headless is rejected and actual media is checked before seeding');
 assert.match(source,/timeout:90000/);assert.match(source,/box.width>=44&&box.height>=44/);assert.match(source,/backBox.width<44\|\|backBox.height<44/);
 for(const point of ['fresh coarse context','after result screenshot','after Enter','actual coarse media established at Reader target measurement','after Reader screenshot','after Back'])assert.ok(source.includes(point),point);
});
