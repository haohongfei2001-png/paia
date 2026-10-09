import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {canonical} from '../../../core/ai-usage/contracts.js';
import {JsonTokens} from '../../../core/import/json-tokens.js';

export const ARTIFACT_SHA='16aeb338e1f3566e47f2aef99ace09c9bf8f87cfe8cfae2d888649c9df60c8b6';
export const OWNER_SHA='01834155563e6cc5c3d1a5a6f7d83ee395f94436d28b6ec944476e91754819c7';
const corpusFolder=new URL('../../fixtures/ai-qwen-offline-v1/',import.meta.url);
export const digest=value=>createHash('sha256').update(canonical(value)).digest('hex');
const bytesDigest=value=>createHash('sha256').update(value).digest('hex');
const keys=(value,expected)=>assert.deepEqual(Object.keys(value).sort(),[...expected].sort(),'exact artifact fields');
export function parseStrict(bytes){
 assert.ok(bytes.byteLength>0&&bytes.byteLength<=1024*1024,'bounded offline bytes');
 const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes),tokens=new JsonTokens({limits:{depth:24,keys:64,keyChars:128,stringChars:10000},selectString:()=>true});
 for(const _ of tokens.feed(text)){}for(const _ of tokens.finish()){}
 return JSON.parse(text);
}
export function readFrozenBytes(bytes,expectedSha){assert.match(expectedSha,/^[a-f0-9]{64}$/);assert.equal(bytesDigest(bytes),expectedSha,'trusted frozen artifact digest');return parseStrict(bytes);}
export async function readCalibration(){
 const extraOwners=readFrozenBytes(await readFile(new URL('owner-freeze.json',import.meta.url)),OWNER_SHA);for(const [path,sha]of Object.entries(extraOwners.files))assert.equal(bytesDigest(await readFile(new URL('../../../'+path,import.meta.url))),sha,path);
 const freeze=JSON.parse(await readFile(new URL('freeze.json',corpusFolder),'utf8'));
 const corpus=readFrozenBytes(await readFile(new URL('calibration.json',corpusFolder)),freeze.files['calibration.json'].sha256);
 const contract=readFrozenBytes(await readFile(new URL('review-contract.json',corpusFolder)),freeze.files['review-contract.json'].sha256);
 assert.equal(freeze.files['calibration.json'].sha256,'56891aeb3abcc82e330e542007e849a2efb1c5b819274e11d2234cc2637d8d9b');
 assert.equal(freeze.files['review-contract.json'].sha256,'0cda0babef3e2503e3efd8cb28f1f2fd143e8a953fd28dd38ff999adc1b400d3');
 for(const [path,sha]of Object.entries(contract.ownerFreeze))assert.equal(bytesDigest(await readFile(new URL('../../../'+path,import.meta.url))),sha,path);
 return {corpus,contract,freeze};
}
export function validateArtifacts(artifact,corpus,freeze){
 keys(artifact,['version','kind','corpusDigest','contractDigest','quality','cases']);assert.equal(artifact.version,1);assert.equal(artifact.kind,'FIXTURE_LITERAL_REPLAY_ONLY');assert.equal(artifact.quality,'NOT_RUN');
 assert.equal(artifact.corpusDigest,freeze.files['calibration.json'].sha256);assert.equal(artifact.contractDigest,freeze.files['review-contract.json'].sha256);
 const expected=new Map();for(const t of corpus.topics)for(const phase of t.phases)for(const style of corpus.modes)expected.set(JSON.stringify([t.id,phase.id,style]),{t,phase});
 assert.ok(Array.isArray(artifact.cases));assert.equal(artifact.cases.length,expected.size);const seen=new Set();
 for(const c of artifact.cases){
  keys(c,['topicId','phaseId','style','blocks']);const key=JSON.stringify([c.topicId,c.phaseId,c.style]),scope=expected.get(key);assert.ok(scope&&!seen.has(key),'known unique frozen case');seen.add(key);
  const ids=scope.phase.addEntryIds??scope.phase.visibleEntryIds,entries=scope.t.entries.filter(e=>ids.includes(e.id)&&e.lifecycle==='active');assert.equal(c.blocks.length,entries.length);
  for(let n=0;n<entries.length;n++){const b=c.blocks[n],e=entries[n];keys(b,['field','text','sourceRef']);keys(b.sourceRef,['id','corpusRevision','start','end']);assert.equal(b.field,'currentView');assert.equal(b.text,e.body);assert.deepEqual(b.sourceRef,{id:e.id,corpusRevision:e.revision,start:0,end:e.body.length});}
 }
 return structuredClone(artifact);
}
export async function readArtifacts(){const {corpus,contract,freeze}=await readCalibration(),bytes=await readFile(new URL('literal-outputs.json',import.meta.url));return {corpus,contract,freeze,artifact:validateArtifacts(readFrozenBytes(bytes,ARTIFACT_SHA),corpus,freeze)};}
