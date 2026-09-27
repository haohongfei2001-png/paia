import {execFileSync} from 'node:child_process';
import {appendFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const sha=value=>typeof value==='string'&&/^[0-9a-f]{40}$/.test(value);
const exact=new Set([
 '.github/workflows/paia-vs07-semantic-lab.yml',
 'extension/core/search-service.js','extension/core/search-ranking.js',
 'extension/scripts/run-semantic-retrieval-lab.mjs',
 'extension/scripts/run-official-semantic-retrieval-lab.mjs',
 'extension/scripts/run-retrieval-bakeoff.mjs',
 'extension/scripts/inspect-public-model-provenance.mjs',
 'extension/scripts/screen-public-semantic-candidates.mjs',
 'extension/scripts/semantic-lab-change.mjs',
]);
export function semanticProbeRequired({action,before,head,ancestor,paths}={}){
 // Uncertain event/history/changed-path evidence always runs the original gate.
 if(action!=='synchronize'||!sha(before)||!sha(head)||before===head||ancestor!==true
   ||!Array.isArray(paths)||paths.some(x=>typeof x!=='string'||!x||x.length>500))return true;
 return paths.some(path=>exact.has(path)||path.startsWith('extension/experiments/')
   ||path.startsWith('extension/tests/fixtures/cpv1-07-'));
}

const sourceOnlyPaths=new Set([
 'extension/experiments/public-reranker-provenance.mjs',
 'extension/scripts/screen-public-rerankers.mjs',
 'extension/tests/cpv1-07-public-model-provenance.test.mjs',
 'extension/scripts/semantic-lab-change.mjs',
 '.github/workflows/paia-vs07-semantic-lab.yml',
 '.github/workflows/paia-candidate.yml',
 'extension/docs/consumer-product-v1/STATUS.md',
 'extension/docs/consumer-product-v1/EXECUTION_PROTOCOL.md'
]);
const sourceModule='extension/experiments/public-reranker-provenance.mjs';
const sourceScript='extension/scripts/screen-public-rerankers.mjs';
const pairedPaths=new Set([
 'extension/experiments/public-paired-text-lab.mjs',
 'extension/scripts/run-public-paired-text-lab.mjs',
 'extension/experiments/public-reranker-provenance.mjs',
 'extension/experiments/retrieval-evaluation.mjs',
 'extension/tests/cpv1-07-semantic-lab.test.mjs',
 'extension/tests/cpv1-07-public-model-provenance.test.mjs',
 'extension/scripts/semantic-lab-change.mjs',
 '.github/workflows/paia-vs07-semantic-lab.yml',
 '.github/workflows/paia-candidate.yml',
 'extension/docs/consumer-product-v1/STATUS.md',
 'extension/docs/consumer-product-v1/EXECUTION_PROTOCOL.md'
]);
const pairedModule='extension/experiments/public-paired-text-lab.mjs';
const pairedScript='extension/scripts/run-public-paired-text-lab.mjs';
const embeddingPaths=new Set([
 'extension/experiments/public-embedding-provenance.mjs',
 'extension/scripts/screen-public-embeddings.mjs',
 'extension/experiments/public-reranker-provenance.mjs',
 'extension/tests/cpv1-07-public-model-provenance.test.mjs',
 'extension/scripts/semantic-lab-change.mjs',
 '.github/workflows/paia-vs07-semantic-lab.yml',
 '.github/workflows/paia-candidate.yml',
 'extension/docs/consumer-product-v1/STATUS.md',
 'extension/docs/consumer-product-v1/EXECUTION_PROTOCOL.md'
]);
const embeddingProbePaths=new Set([
 'extension/experiments/retrieval-evaluation.mjs',
 'extension/tests/cpv1-07-retrieval-evaluation.test.mjs',
 "extension/experiments/public-embedding-inputs.mjs",
 "extension/scripts/run-public-embedding-lab.mjs",
 "extension/experiments/public-embedding-provenance.mjs",
 "extension/tests/cpv1-07-public-model-provenance.test.mjs",
 "extension/tests/cpv1-07-semantic-lab.test.mjs",
 "extension/scripts/semantic-lab-change.mjs",
 ".github/workflows/paia-vs07-semantic-lab.yml",
 ".github/workflows/paia-candidate.yml",
 "extension/docs/consumer-product-v1/STATUS.md",
 "extension/docs/consumer-product-v1/EXECUTION_PROTOCOL.md"
]);
export function semanticLabRouting(evidence={}){
 const {action,before,head,ancestor,paths}=evidence;
 const verified=action==='synchronize'&&sha(before)&&sha(head)&&before!==head
  &&ancestor===true&&Array.isArray(paths)&&paths.length>0
  &&paths.every(x=>typeof x==='string'&&x.length>0&&x.length<=500)
  &&new Set(paths).size===paths.length;
 const embeddingProbeOnly=verified&&paths.includes('extension/scripts/run-public-embedding-lab.mjs')
  &&(paths.includes('extension/experiments/public-embedding-inputs.mjs')
    ||paths.includes('extension/experiments/retrieval-evaluation.mjs')
      &&paths.includes('extension/tests/cpv1-07-retrieval-evaluation.test.mjs'))
  &&paths.every(path=>embeddingProbePaths.has(path));
 if(embeddingProbeOnly)return {runProbe:false,runSourceScreen:false,sourceOnly:false,
  runPairedProbe:false,runEmbeddingScreen:false,runEmbeddingProbe:true,embeddingProbeOnly:true};
 const embeddingOnly=verified&&paths.includes('extension/experiments/public-embedding-provenance.mjs')
  &&paths.includes('extension/scripts/screen-public-embeddings.mjs')
  &&paths.every(path=>embeddingPaths.has(path));
 if(embeddingOnly)return {runProbe:false,runSourceScreen:false,sourceOnly:false,
  runPairedProbe:false,runEmbeddingScreen:true,embeddingOnly:true};
 const pairedOnly=verified&&paths.includes(pairedModule)&&paths.includes(pairedScript)
  &&paths.every(path=>pairedPaths.has(path));
 if(pairedOnly)return {runProbe:false,runSourceScreen:true,sourceOnly:false,
  runPairedProbe:true,pairedOnly:true};
 const sourceOnly=verified&&paths.includes(sourceModule)&&paths.includes(sourceScript)
  &&paths.every(path=>sourceOnlyPaths.has(path));
 return {runProbe:!verified?true:sourceOnly?false:semanticProbeRequired(evidence),
  runSourceScreen:!verified||paths.some(path=>path===sourceModule||path===sourceScript),
  sourceOnly};
}

function classify(){
 const {PAIA_EVENT_ACTION:action,PAIA_BEFORE:before,PAIA_HEAD:head}=process.env;
 let ancestor=false,paths=null;
 if(action==='synchronize'&&sha(before)&&sha(head)&&before!==head){
  try{
   execFileSync('git',['merge-base','--is-ancestor',before,head],{stdio:'pipe'});
   ancestor=true;
   paths=execFileSync('git',['diff','--name-only','-z',before,head],{encoding:'utf8',stdio:'pipe'})
    .split('\0').filter(Boolean);
  }catch{/* Missing/force-rewritten history cannot justify reusing model evidence. */}
 }
 const routing=semanticLabRouting({action,before,head,ancestor,paths});
 const required=routing.runProbe;
 appendFileSync(process.env.GITHUB_OUTPUT,'run_probe='+required+'\nrun_source_screen='+routing.runSourceScreen+'\nrun_paired_probe='+!!routing.runPairedProbe+ '\nrun_embedding_screen='+!!routing.runEmbeddingScreen+'\nrun_embedding_probe='+!!routing.runEmbeddingProbe+'\n');
 console.log(routing.embeddingProbeOnly?'Verified one new pinned official embedding candidate: one actual CPU measurement; retain old model receipts.':routing.embeddingOnly?'Verified new official embedding source batch: source contracts only; retain both negative model measurements.':routing.pairedOnly?'Verified new paired-text batch: one changed-input paired probe; retain old MiniLM measurement.':required?'Semantic inputs changed or unverified: run the original bounded model probe.':
  'Semantic inputs unchanged: retained prior measurement only; no new quality or production certification.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))classify();
