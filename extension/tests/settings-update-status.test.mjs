import test from 'node:test';
import assert from 'node:assert/strict';
import {projectSettingsUpdateStatus,readSettingsUpdateStatus,SETTINGS_UPDATE_STATE_KEY} from '../core/settings-update-status.js';
const now=10000,version='0.15.0',available={state:'available',fromVersion:version,toVersion:'0.16.0',at:9000};
test('About projects only valid existing version transitions without claiming latest',()=>{
 assert.deepEqual(projectSettingsUpdateStatus(available,version,now),{version,state:'available',targetVersion:'0.16.0',at:9000});
 for(const fromVersion of ['0.14.9',null])assert.deepEqual(projectSettingsUpdateStatus({state:'installed',fromVersion,toVersion:version,at:9000},version,now),{version,state:'installed',at:9000});
 assert.equal(projectSettingsUpdateStatus({...available,toVersion:'0.15.0.1'},version,now).state,'available');
 assert.equal(projectSettingsUpdateStatus({...available,fromVersion:'0.15',toVersion:'0.15.1'},version,now).state,'available');
 for(const value of [undefined,null,[],{},'latest',{...available,state:'latest'},{...available,at:now+1},{...available,at:-1},{...available,at:1.5},{...available,privateBody:'synthetic'},{...available,fromVersion:'0.14.0'},{...available,toVersion:'0.15'},{...available,toVersion:'0.14.99'},{...available,toVersion:'0.16.0-beta'},{...available,toVersion:'0.016.0'},{...available,toVersion:'65536.0'},{...available,toVersion:'1.2.3.4.5'},{...available,state:'installed'},{...available,state:'installed',toVersion:version},{...available,state:'installed',toVersion:'0.14.0'}])assert.deepEqual(projectSettingsUpdateStatus(value,version,now),{version,state:'unknown'},JSON.stringify(value));
 assert.throws(()=>projectSettingsUpdateStatus(available,'broken',now),{code:'UNAVAILABLE'});
});
test('About status reads exactly the existing local key and propagates storage uncertainty',async()=>{
 const calls=[],storage={get:async key=>{calls.push(key);return {[key]:available,unrelated:'private'};},set:()=>assert.fail('read cannot write')};
 assert.deepEqual(await readSettingsUpdateStatus(storage,version,now),{version,state:'available',targetVersion:'0.16.0',at:9000});assert.deepEqual(calls,[SETTINGS_UPDATE_STATE_KEY]);
 await assert.rejects(readSettingsUpdateStatus({get:async()=>{throw Error('private failure');}},version,now),{code:'STORAGE_FAILED'});
});
