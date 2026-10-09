import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp,readFile,readdir,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {digest} from '../artifacts.mjs';
import {collectReadbacks,trustedData,verifyReadbacks} from './readback.mjs';
import {formatBlind,verifyFormatted} from './formatter.mjs';
const seed='1'.repeat(64),otherSeed='2'.repeat(64);
const reseal=b=>{for(const r of b.records){r.receiptDigest=digest(r.receipt);const {readbackDigest,...rest}=r;r.readbackDigest=digest(rest);}b.recordsDigest=digest(b.records);return b;};
const publicForbidden=new Set(['style','model','provider','route','price','seed','assignments','profile','jobId','candidateKey','ownerTopicId']);
function noPublicLabels(value){if(!value||typeof value!=='object')return;for(const [k,v]of Object.entries(value)){assert.ok(!publicForbidden.has(k),k);noPublicLabels(v);}}
let short;
const shortBundle=async()=>short??=await collectReadbacks(['SYN-T01','SYN-T02','SYN-T03']);
test('actual adopted three-short readbacks format deterministically, hide all label/private identities, and keep separate seed/map commitments',async()=>{
 const b=await shortBundle(),a=await formatBlind(b,seed),same=await formatBlind(b,seed),other=await formatBlind(b,otherSeed);assert.deepEqual(a,same);assert.notEqual(a.publicBundle.seedCommitment,other.publicBundle.seedCommitment);assert.notDeepEqual(a.publicBundle.packets.map(p=>p.packetId),other.publicBundle.packets.map(p=>p.packetId));assert.equal(await verifyFormatted(a,b),true);noPublicLabels(a.publicBundle);
 assert.equal(a.publicBundle.counts.packets,9);assert.equal(a.publicBundle.counts.missingReviews,9);assert.equal(a.publicBundle.counts.humanJudgments,0);assert.equal(a.publicBundle.qualification,'NOT_RUN');assert.equal(a.privateSeed.seed,seed);assert.ok(!JSON.stringify(a.publicBundle).includes(seed));assert.ok(!JSON.stringify(a.privateAssignments).includes(seed));assert.match(a.publicBundle.blindness,/semantic wording/);
 const groups=new Map();for(const p of a.publicBundle.packets){assert.equal(p.reviewStatus,'NOT_COLLECTED');const g=groups.get(p.groupId)??[];g.push(p);groups.set(p.groupId,g);}assert.equal(groups.size,3);for(const g of groups.values()){assert.equal(g.length,3);assert.deepEqual(g[0].evidence,g[1].evidence);assert.deepEqual(g[0].evidence,g[2].evidence);assert.deepEqual(g[0].output,g[1].output);assert.deepEqual(g[0].output,g[2].output);}
});
test('missing/duplicate/unknown/cross-version/cross-digest readback cases refuse even after altered records are resealed',async()=>{
 const original=await shortBundle(),data=await trustedData();for(const mutate of [b=>b.version++,b=>b.parentCode='0'.repeat(40),b=>b.corpusDigest='0'.repeat(64),b=>b.contractDigest='0'.repeat(64),b=>b.records.pop(),b=>b.records[1]=structuredClone(b.records[0]),b=>b.records[0].style='unknown',b=>b.records[0].phaseId='not-declared',b=>b.records[0].receipt.style='concise',b=>b.records[0].evidence[0].body+='凭空新增',b=>b.records[0].evidence[0].ownerRevision++,b=>b.records[0].extra=true,b=>b.records[0].receipt.children[0].attemptCount=2]){const b=structuredClone(original);mutate(b);assert.throws(()=>verifyReadbacks(reseal(b),data));}
 const changed=structuredClone(original);changed.records[0].receiptDigest='0'.repeat(64);assert.throws(()=>verifyReadbacks(changed,data));await assert.rejects(formatBlind(original,'shortseed'));
});
test('public/private crossing, replaced output, incorrect commitment/assignment/version and missing packet cannot masquerade as a valid blind package',async()=>{
 const b=await shortBundle(),original=await formatBlind(b,seed);for(const mutate of [p=>p.publicBundle.version++,p=>p.publicBundle.packets.pop(),p=>p.publicBundle.packets[1]=structuredClone(p.publicBundle.packets[0]),p=>p.publicBundle.packets[0].output.currentView+='新增含义',p=>p.publicBundle.seed=p.privateSeed.seed,p=>p.privateAssignments.assignments[0].style='other',p=>p.privateAssignments.publicDigest='0'.repeat(64),p=>p.privateSeed.seed=otherSeed,p=>p.privateSeed.version++]){const p=structuredClone(original);mutate(p);await assert.rejects(verifyFormatted(p,b));}
});
test('full102 actual phase readbacks remain102 public packets,99 outputs and3 refused missing-review cases; no phase/time/scope obligation is dropped',async()=>{
 const b=await collectReadbacks(),p=await formatBlind(b,seed);assert.equal(await verifyFormatted(p,b),true);noPublicLabels(p.publicBundle);assert.deepEqual(p.publicBundle.counts,{topics:24,variantsPerTopic:3,scheduledPhases:102,packets:102,availableFixtureOutputs:99,refusedNoOutput:3,humanJudgments:0,missingReviews:102,missingReviewsForAvailable:99,missingReviewsForRefused:3});
 const refused=p.publicBundle.packets.filter(p=>p.status==='REFUSED_NO_OUTPUT');assert.equal(refused.length,3);for(const r of refused){assert.equal(r.output,null);assert.equal(r.reviewStatus,'NOT_COLLECTED');assert.ok(r.evidence.some(e=>e.lifecycle==='removed'&&e.body===null));const assignment=p.privateAssignments.assignments.find(a=>a.packetId===r.packetId);assert.equal(assignment.executionStatus,'NO_EXECUTION_REFUSED');assert.equal(assignment.provider,null);assert.equal(assignment.model,null);assert.equal(assignment.route,null);}
 assert.equal(new Set(p.publicBundle.packets.map(p=>p.packetId)).size,102);assert.equal(new Set(p.publicBundle.packets.map(p=>p.groupId)).size,34);
 const long=p.privateAssignments.assignments.filter(a=>a.topicId==='SYN-T14');assert.equal(long.length,33);assert.equal(new Set(long.map(a=>a.phaseId)).size,11);const finalPacket=p.publicBundle.packets.find(p=>p.packetId===long.find(a=>a.phaseId==='add-five').packetId);assert.equal(finalPacket.evidence.length,205);assert.equal(finalPacket.sourceTimeQualification,'CORPUS_REFERENCE_ONLY');
 const bad=structuredClone(b),r=bad.records.find(r=>r.topicId==='SYN-T12');r.state='AVAILABLE_FIXTURE_OUTPUT';r.output={currentView:''};const data=await trustedData();assert.throws(()=>verifyReadbacks(reseal(bad),data));
});
test('actual CLI separates public packets from private seed/map/readbacks and refuses an existing directory without rewriting any bytes',async()=>{
 const parent=await mkdtemp(join(tmpdir(),'paia-blind-owned-')),out=join(parent,'bundle'),args=[fileURLToPath(new URL('run.mjs',import.meta.url)),'--out='+out,'--topics=SYN-T01,SYN-T02,SYN-T03'],first=spawnSync(process.execPath,args,{encoding:'utf8'});assert.equal(first.status,0,first.stderr);assert.equal(JSON.parse(first.stdout).counts.packets,9);
 const seedData=JSON.parse(await readFile(join(out,'private/seed.json'),'utf8')),publicNames=await readdir(join(out,'public')),privateNames=await readdir(join(out,'private'));assert.deepEqual(publicNames.sort(),['packets.json','receipt.json']);assert.deepEqual(privateNames.sort(),['assignment-map.json','readbacks.json','seed.json']);
 const before=[];for(const name of [...publicNames.map(n=>'public/'+n),...privateNames.map(n=>'private/'+n)]){const bytes=await readFile(join(out,name));before.push([name,digest(bytes.toString('utf8'))]);assert.equal((await stat(join(out,name))).mode&0o777,0o600);if(name.startsWith('public/'))assert.ok(!bytes.toString('utf8').includes(seedData.seed));}
 const second=spawnSync(process.execPath,args,{encoding:'utf8'});assert.equal(second.status,1);assert.match(second.stderr,/exclusive new output directory required before replay/);for(const [name,hash]of before)assert.equal(digest((await readFile(join(out,name))).toString('utf8')),hash);for(const dir of [out,join(out,'public'),join(out,'private')])assert.equal((await stat(dir)).mode&0o777,0o700);
});
