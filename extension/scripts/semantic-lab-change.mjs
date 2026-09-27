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
 const required=semanticProbeRequired({action,before,head,ancestor,paths});
 appendFileSync(process.env.GITHUB_OUTPUT,'run_probe='+required+'\n');
 console.log(required?'Semantic inputs changed or unverified: run the original bounded model probe.':
  'Semantic inputs unchanged: retained prior measurement only; no new quality or production certification.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))classify();
