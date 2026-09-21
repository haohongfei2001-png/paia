import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {summarizePassive,PRD02_FORMAT} from '../development/prd02-live-canary/canary-core.js';

const runtime={sourceHead:'a'.repeat(40),runtimeParity:true,manifestVersion:'0.12.0',releaseDigest:'b'.repeat(64)};
const observation={recent:true,boundedToCapture:true,membershipState:'unknown'};
const structure={schemaVersion:1,visibleUserRoleCount:6,finalCandidateCount:6,roleIdValidCount:6,editorPassedCount:6,busyPassedCount:6};
const ingestion={schemaVersion:1,kind:'capture',attempted:6,added:0,duplicates:6,ignored:0,unresolved:0,knownTimes:5,unknownTimes:1};
const diagnostics={adapterVersion:'0.3.0',status:'CAPTURING',recentCapture:true,sameCycleEvidence:true,structure,ingestion,captureHealthState:'ACCEPTED',lastErrorCode:null};
const archive={activeRows:6,distinctSources:6,distinctMessages:6,identityMappingConsistent:true,knownSourceTimes:5,unknownSourceTimes:1,invalidSourceTimes:0};

test('PRD-02 passive normal-use evidence passes without synthetic messages',()=>{
 const r=summarizePassive({runtime,observation,diagnostics,archive});
 assert.equal(r.format,PRD02_FORMAT);
 assert.equal(r.pass,true);
 assert.equal(r.evidence.attempted,6);
 assert.equal(r.evidence.duplicates,6);
 assert.equal(r.projectRecognition.gapConfirmed,true);
 assert.equal(r.projectRecognition.membership,'unverified');
});

test('runtime mismatch, stale evidence and non-current adapter fail closed',()=>{
 assert.equal(summarizePassive({runtime:{...runtime,runtimeParity:false},observation,diagnostics,archive}).pass,false);
 assert.equal(summarizePassive({runtime,observation:{...observation,recent:false},diagnostics,archive}).pass,false);
 assert.equal(summarizePassive({runtime,observation,diagnostics:{...diagnostics,adapterVersion:'0.2.0'},archive}).pass,false);
});

test('live structure must accept every visible user role and match ingestion exactly',()=>{
 assert.equal(summarizePassive({runtime,observation,diagnostics:{...diagnostics,structure:{...structure,finalCandidateCount:5}},archive}).pass,false);
 assert.equal(summarizePassive({runtime,observation,diagnostics:{...diagnostics,ingestion:{...ingestion,attempted:5}},archive}).pass,false);
 assert.equal(summarizePassive({runtime,observation,diagnostics:{...diagnostics,sameCycleEvidence:false},archive}).pass,false);
});

test('unresolved, ignored or no repeated observation cannot certify live capture',()=>{
 for(const patch of [{unresolved:1},{ignored:1},{duplicates:0}]){
  const r=summarizePassive({runtime,observation,diagnostics:{...diagnostics,ingestion:{...ingestion,...patch}},archive});
  assert.equal(r.pass,false);
 }
});

test('archive identity coverage and source-time evidence fail closed',()=>{
 assert.equal(summarizePassive({runtime,observation,diagnostics,archive:{...archive,distinctSources:5}}).pass,false);
 assert.equal(summarizePassive({runtime,observation,diagnostics,archive:{...archive,identityMappingConsistent:false}}).pass,false);
 assert.equal(summarizePassive({runtime,observation,diagnostics,archive:{...archive,invalidSourceTimes:1}}).pass,false);
});

test('Project recognition stays an explicit gap and does not fabricate membership',()=>{
 const r=summarizePassive({runtime,observation:{...observation,membershipState:'project'},diagnostics,archive});
 assert.equal(r.pass,true);
 assert.equal(r.projectRecognition.projectIdentity,'unverified');
 assert.equal(r.projectRecognition.projectName,'unverified');
 assert.equal(r.projectRecognition.membership,'unverified');
 assert.equal(r.projectRecognition.observedMembershipState,'project');
 assert.equal(r.projectRecognition.gapConfirmed,false);
});

test('public report contains no live identifiers, titles, URLs or bodies',()=>{
 const r=summarizePassive({runtime,observation:{...observation,privateConversationId:'secret-conversation'},diagnostics,archive:{...archive,privateSourceKey:'secret-source'}});
 const out=JSON.stringify(r);
 for(const secret of ['secret-conversation','secret-source','originalText','chatTitle','chatgpt.com/c/'])assert.equal(out.includes(secret),false);
 assert.deepEqual(r.privacy,{rawTextRead:false,rawTextEmitted:false,titlesEmitted:false,urlsEmitted:false,idsEmitted:false,profilePathsEmitted:false});
});

test('passive verifier reads only body-free indexes/meta and launcher never mutates or reloads PAIA',async()=>{
 const gate=await readFile('development/prd02-live-canary/gate.js','utf8');
 const command=await readFile('development/PRD-02 Live Canary.command','utf8');
 assert.match(gate,/recordIndex/);
 assert.match(gate,/ans:conversation:v1:/);
 assert.doesNotMatch(gate,/objectStore\(['"]records['"]\)|originalText|libraryText|chatTitle/);
 assert.doesNotMatch(gate,/\.put\(|\.delete\(|\.clear\(|chrome\.storage\.local\.set|PURGE_SOURCE|UPDATE_RECORD/);
 assert.match(command,/build_current_release\.py/);
 assert.match(command,/runtimeParity/);
 assert.doesNotMatch(command,/chrome\.runtime\.reload|rsync -a --delete "\$RELEASE\/" "\$RUNTIME\/"/);
 assert.doesNotMatch(command,/RUN_ID|START_MS|secrets\.token_hex/);
 assert.match(command,/PAIA_PRD02_PASSIVE/);
});
