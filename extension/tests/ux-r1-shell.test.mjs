import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeUXPreferences,resolveAppearance,resolveLanguage,canonicalRoot,validReturnTarget,onboardingTarget,UX_DEFAULTS} from '../ui/ux-r1-state.js';
import {defaults,syncWorkspace,validatePreferences} from '../core/workspace.js';

function minimalState(preferences={},settings={consentVersion:1,enabled:false,epoch:7}){
 return {library:{blocks:[],documents:[]},conversations:[],preferences:{...preferences},settings:{...settings}};
}

test('UX-R1 shell roots and return targets remain bounded to existing product destinations',()=>{
 assert.equal(canonicalRoot('library'),'library');
 assert.equal(canonicalRoot('thoughts'),'thoughts');
 assert.equal(canonicalRoot('memory'),'memory');
 assert.equal(canonicalRoot('archive'),'library');
 assert.equal(validReturnTarget('memory'),'memory');
 assert.equal(validReturnTarget('settings'),'library');
});

test('UX-R1 MIG-01 fills only missing UI preferences and preserves explicit existing values',()=>{
 const old={timeDisplay:'date_and_seconds',appearance:'dark',language:'en',fontSize:'large',readingWidth:'wide',sidebarCollapsed:true};
 const state=minimalState(old,{consentVersion:1,enabled:false,epoch:11});
 syncWorkspace(state);
 assert.equal(state.preferences.settingsVersion,2);
 for(const [key,value] of Object.entries(old))assert.equal(state.preferences[key],value,key);
 assert.equal(state.settings.consentVersion,1);
 assert.equal(state.settings.enabled,false,'UI preference migration must not resume paused capture');
 assert.equal(state.settings.epoch,11);
 const fresh=minimalState();syncWorkspace(fresh);
 assert.deepEqual({appearance:fresh.preferences.appearance,language:fresh.preferences.language,fontSize:fresh.preferences.fontSize,readingWidth:fresh.preferences.readingWidth,sidebarCollapsed:fresh.preferences.sidebarCollapsed},{appearance:'system',language:'system',fontSize:'standard',readingWidth:'standard',sidebarCollapsed:false});
});

test('UX-R1 UI preference parser fails closed to visual defaults without mutating product consent',()=>{
 assert.deepEqual(normalizeUXPreferences(null),UX_DEFAULTS);
 const normalized=normalizeUXPreferences({appearance:'invalid',language:'zh-CN',fontSize:'small',readingWidth:'narrow',sidebarCollapsed:true});
 assert.equal(normalized.appearance,'system');assert.equal(normalized.language,'zh-CN');assert.equal(normalized.fontSize,'small');assert.equal(normalized.readingWidth,'narrow');assert.equal(normalized.sidebarCollapsed,true);
 assert.equal(resolveAppearance('system',true),'dark');assert.equal(resolveAppearance('light',true),'light');
 assert.equal(resolveLanguage('system','zh-TW'),'zh-CN');assert.equal(resolveLanguage('system','fr-FR'),'en');
});

test('UX-R1 preference validation permits the approved UI surface and rejects ambiguous values',()=>{
 assert.deepEqual(validatePreferences({appearance:'dark',language:'en',fontSize:'xlarge',readingWidth:'wide',sidebarCollapsed:true}),{appearance:'dark',language:'en',fontSize:'xlarge',readingWidth:'wide',sidebarCollapsed:true});
 assert.deepEqual(validatePreferences({timeDisplay:'date_and_time'}),{timeDisplay:'date_and_time'});
 assert.throws(()=>validatePreferences({appearance:'auto'}));
 assert.throws(()=>validatePreferences({sidebarCollapsed:'false'}));
 assert.throws(()=>validatePreferences({unknown:true}));
 assert.equal(defaults().settingsVersion,2);
});

test('UX-R1 onboarding migration distinguishes a new consent flow from existing users',()=>{
 assert.equal(onboardingTarget({consented:false,existingUser:false,hasContent:false,step:'welcome'}),'consent');
 assert.equal(onboardingTarget({consented:true,existingUser:false,hasContent:false,step:'consent'}),'history');
 assert.equal(onboardingTarget({consented:true,existingUser:true,hasContent:true,step:'consent'}),'done');
 assert.equal(onboardingTarget({consented:true,existingUser:false,hasContent:true,step:'consent'}),'done');
});
