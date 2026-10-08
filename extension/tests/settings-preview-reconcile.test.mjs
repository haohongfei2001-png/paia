import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../ui/r6-settings.js',import.meta.url),'utf8').replace(/^import .*\n/gm,'').replace(/^export /gm,'');
for(const actual of [true,false,null])test('preview lost acknowledgement reconciles or masks unknown state '+actual,async()=>{
 const control={checked:false,disabled:false},feedback={},calls=[],masks=[],context={document:{documentElement:{lang:'en',classList:{toggle:(key,value)=>masks.push(value)}}},request:async(type,payload)=>{calls.push(type);if(type==='UPDATE_PREFERENCES')throw Error('lost ack');if(actual===null)throw Error('read lost');return {preferences:{hideContentPreviews:actual}};},control,feedback};vm.createContext(context);vm.runInContext(source+';previewToggle=control;privacyStatus=feedback;privacyLoaded=true;previewValue=false;globalThis.run=setPreviewMask;',context);await context.run(true);assert.deepEqual(calls,['UPDATE_PREFERENCES','GET_PAGE']);assert.equal(control.checked,actual??true);assert.equal(masks.at(-1),actual??true);assert.equal(control.disabled,false);assert.doesNotMatch(feedback.textContent,/previous setting is still active/);assert.match(feedback.textContent,actual===null?/unknown/:/current setting was checked/);
});
