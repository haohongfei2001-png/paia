import {readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {group,testShard} from './test-groups.mjs';

process.chdir(fileURLToPath(new URL('../',import.meta.url)));
const names=new Set((await readdir('tests')).filter(name=>name.endsWith('.test.mjs')));
const formerCore=[
 'ux-r1-shell-chrome-e2e.test.mjs',
 'ux-r2-reader-revisit-chrome-e2e.test.mjs',
 'ux-r3-thought-chrome-e2e.test.mjs',
 'ux-r4-search-reuse-chrome-e2e.test.mjs',
 'ux-r5-ai-organize-chrome-e2e.test.mjs',
 'ux-r5-ai-update-chrome-e2e.test.mjs',
 'ux-r5-certification-chrome-e2e.test.mjs',
 'ux-r6-release-chrome-e2e.test.mjs',
 'release-certification-round48-chrome-e2e.test.mjs',
 'release-certification-round49-chrome-e2e.test.mjs',
 'activation-return-round410-chrome-e2e.test.mjs'
];
for(const name of formerCore){
 if(!names.has(name))throw Error(`CURRENT_BROWSER_CORE_MISSING:${name}`);
 if(group(name)!=='browser E2E')throw Error(`CURRENT_BROWSER_CORE_NOT_CURRENT:${name}`);
}
const uir=[...names].filter(name=>/^uir-\d+-.*-chrome-e2e\.test\.mjs$/.test(name)).sort();
if(!uir.length)throw Error('UIR_BROWSER_SET_EMPTY');
for(const name of uir){
 if(group(name)!=='browser E2E')throw Error(`UIR_BROWSER_NOT_CURRENT:${name}`);
}
for(const [name,expected]of [['ans-09-integration-chrome-e2e.test.mjs','browser E2E'],['ans-09-migration.test.mjs','unit']]){
 if(!names.has(name)||group(name)!==expected)throw Error(`ANS09_INTEGRATION_COVERAGE_MISSING:${name}`);
}
const ans=[...names].filter(name=>/^ans-\d+-.*-chrome-e2e\.test\.mjs$/.test(name)).sort();
if(!ans.length)throw Error('ANS_BROWSER_SET_EMPTY');
for(const name of ans){
 if(group(name)!=='browser E2E')throw Error(`ANS_BROWSER_NOT_CURRENT:${name}`);
}
const cpr=[...names].filter(name=>/^cpr-\d+-.*-chrome-e2e\.test\.mjs$/.test(name)).sort();
for(const name of cpr){
 if(group(name)!=='browser E2E')throw Error(`CPR_BROWSER_NOT_CURRENT:${name}`);
}
const archived=[
 'cpv1-07-lab-cadence.test.mjs',
 'cpv1-07-official-minilm.test.mjs',
 'cpv1-07-public-model-provenance.test.mjs',
 'cpv1-07-retrieval-evaluation.test.mjs',
 'cpv1-07-semantic-index.test.mjs',
 'cpv1-07-semantic-lab.test.mjs',
 'cpv1-07-semantic-material-snapshot.test.mjs',
 'cpv1-07-semantic-storage-chrome-e2e.test.mjs'
];
for(const name of archived){
 if(!names.has(name)||group(name)!=='experimental')throw Error(`SEMANTIC_ARCHIVE_COVERAGE_MISSING:${name}`);
}
const current=[...names].filter(name=>group(name)==='browser E2E').sort();
const partition=Array.from({length:4},(_,slot)=>current.filter((name,position)=>
 testShard('tests/'+name,position,4,'browser E2E')===slot+1));
if(partition.some(part=>!part.length)
    || partition.flat().sort().join('|')!==current.join('|')
    || !partition[0].includes('cpv1-07-historical-comparison-chrome-e2e.test.mjs')
    || partition[1].includes('cpv1-07-historical-comparison-chrome-e2e.test.mjs')
    || !partition[0].includes('cpv1-02-dvn-working-revision-chrome-e2e.test.mjs')
    || !partition[0].includes('cpv1-05-dvn-organize-chrome-e2e.test.mjs')
    || !partition[2].includes('desktop-vnext-context-chrome-e2e.test.mjs')
    || !partition[1].includes('cpv1-02-dvn-purge-chrome-e2e.test.mjs')
    || !partition[1].includes('cpv1-02-dvn-removal-chrome-e2e.test.mjs')
    || !partition[1].includes('cpv1-02-dvn-search-chrome-e2e.test.mjs')
    || !partition[2].includes('cpv1-02-dvn-direct-edit-chrome-e2e.test.mjs')
    || !partition[3].includes('cpv1-02-dvn-topic-root-chrome-e2e.test.mjs')
    || !partition[3].includes('cpv1-02-dvn-topic-content-chrome-e2e.test.mjs')
    || !partition[3].includes('cpv1-02-dvn-topic-years-chrome-e2e.test.mjs')){
 throw Error('CURRENT_BROWSER_SHARD_PARTITION_INVALID');
}
// The three earlier inserted files stay on2; the new Q6 file is on3. Every
// previously certified file must retain its original placement below. D3 adds
// a separately pinned shard1 file; it is not part of that historical baseline.
// Prompt Reuse Stage 1/2 files were inserted after this frozen baseline.
// Their explicit shard-3 placement is checked separately, not modulo-reindexed.
const promptReuseFiles=['cpv1-09-prompt-compatibility-chrome-e2e.test.mjs','cpv1-09-prompt-insertion-chrome-e2e.test.mjs','cpv1-09-prompt-surface-chrome-e2e.test.mjs'];
for(const name of promptReuseFiles){if(!current.includes(name))throw Error('PROMPT_REUSE_BROWSER_MISSING:'+name);for(const count of [4,5,6])if(testShard(name,current.indexOf(name),count,'browser E2E')!==3)throw Error('PROMPT_REUSE_BROWSER_ROUTING:'+name);}
const beforeQ4=current.filter(name=>![...promptReuseFiles,'desktop-vnext-context-chrome-e2e.test.mjs','cpv1-05-dvn-organize-chrome-e2e.test.mjs','cpv1-02-dvn-topic-content-chrome-e2e.test.mjs','cpv1-02-dvn-topic-years-chrome-e2e.test.mjs','cpv1-02-dvn-topic-root-chrome-e2e.test.mjs','cpv1-02-dvn-direct-edit-chrome-e2e.test.mjs','cpv1-02-dvn-purge-chrome-e2e.test.mjs','cpv1-02-dvn-removal-chrome-e2e.test.mjs','cpv1-02-dvn-search-chrome-e2e.test.mjs'].includes(name));
for(const [position,name]of beforeQ4.entries()){
 const expected=['cpv1-02-dvn-working-revision-chrome-e2e.test.mjs','cpv1-07-historical-comparison-chrome-e2e.test.mjs'].includes(name)?1:position%4+1;
 if(testShard(name,current.indexOf(name),4,'browser E2E')!==expected)throw Error('Q4_SHIFTED_PREVIOUS_BROWSER_ROUTING:'+name);
}
const expanded=Array.from({length:5},(_,slot)=>current.filter((name,position)=>testShard('tests/'+name,position,5,'browser E2E')===slot+1));
if(expanded.some(part=>!part.length)||expanded.flat().sort().join('|')!==current.join('|')||expanded[4].join('|')!=='cpv1-02-dvn-direct-edit-chrome-e2e.test.mjs')throw Error('D5_BROWSER_SHARD_PARTITION_INVALID');
for(const [position,name]of current.entries())if(name!=='cpv1-02-dvn-direct-edit-chrome-e2e.test.mjs'&&testShard(name,position,5,'browser E2E')!==testShard(name,position,4,'browser E2E'))throw Error('D5_SHIFTED_PREVIOUS_BROWSER_ROUTING:'+name);
const six=Array.from({length:6},(_,slot)=>current.filter((name,position)=>testShard(name,position,6,'browser E2E')===slot+1)),moves=new Map([['ux-r3-thought-chrome-e2e.test.mjs',6],['cpv1-02-dvn-topic-content-chrome-e2e.test.mjs',5],['cpv1-02-dvn-topic-years-chrome-e2e.test.mjs',5]]);
if(six.some(part=>!part.length)||six.flat().sort().join('|')!==current.join('|')||six[5].join('|')!=='ux-r3-thought-chrome-e2e.test.mjs')throw Error('D5_SIX_BROWSER_SHARD_PARTITION_INVALID');
for(const [position,name]of current.entries())if(testShard(name,position,6,'browser E2E')!==(moves.get(name)||testShard(name,position,5,'browser E2E')))throw Error('D5_SIX_SHIFTED_UNREVIEWED_ROUTING:'+name);
console.log(`CURRENT_BROWSER_COVERAGE_CONTRACT_PASS core=${formerCore.length} uir=${uir.length} ans=${ans.length} cpr=${cpr.length}`);
