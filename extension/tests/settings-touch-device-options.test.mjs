import test from 'node:test';
import assert from 'node:assert/strict';
import {fakeDeviceOptions} from './harness/synthetic-device-options.mjs';
test('synthetic browser device opt-in leaves every default launch option unchanged',()=>{
 assert.deepEqual(fakeDeviceOptions(),{});assert.deepEqual(fakeDeviceOptions({hasTouch:false}),{});assert.deepEqual(fakeDeviceOptions({viewport:null}),{viewport:null});assert.deepEqual(fakeDeviceOptions({viewport:{width:1440,height:900}}),{viewport:{width:1440,height:900}});
 assert.deepEqual(fakeDeviceOptions({hasTouch:true}),{hasTouch:true});assert.deepEqual(fakeDeviceOptions({viewport:{width:1440,height:900},hasTouch:true}),{viewport:{width:1440,height:900},hasTouch:true});
});
test('synthetic touch context refuses unsupported attachment configuration before launching',()=>{
 assert.deepEqual(fakeDeviceOptions({launchThroughPort:true}),{});for(const options of [{hasTouch:true,launchThroughPort:true},{hasTouch:'true'}])assert.throws(()=>fakeDeviceOptions(options),/UNSUPPORTED_SYNTHETIC_DEVICE_CONFIGURATION/);
});
