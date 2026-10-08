const removedPlacement='settings-removed-placement-chrome-e2e.test.mjs';
const writing='topic-section-writing-chrome-e2e.test.mjs';
const settingsNext='settings-next-chrome-e2e.test.mjs';
const next='cpv1-12-next-prompt-chrome-e2e.test.mjs';
const entryMove='topic-entry-section-move-chrome-e2e.test.mjs';
const iah='iah11-result-presentation-chrome-e2e.test.mjs',selected='iah11-selected-acceptance-chrome-e2e.test.mjs';
import {readdir,readFile} from 'node:fs/promises';
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
const ai='cpv1-01-ai-cost-foundation-chrome-e2e.test.mjs';
if(current.length!==85||!current.includes(ai))throw Error('AI_TOPIC_CURRENT_CORPUS_INVALID');
for(const count of [4,5,6,7])if(testShard(ai,current.indexOf(ai),count,'browser E2E')!==4)throw Error('AI_WHOLE_FILE_ROUTING');
const sectionActions='cpv1-topic-05-5-section-actions-chrome-e2e.test.mjs';
if(!current.includes(sectionActions))throw Error('SECTION_ACTIONS_NATIVE_MISSING');
for(const count of [4,5,6,7])if(testShard(sectionActions,current.indexOf(sectionActions),count,'browser E2E')!==4)throw Error('SECTION_ACTIONS_NATIVE_ROUTING');
const section='cpv1-topic-05-4-section-chrome-e2e.test.mjs';
if(!current.includes(section))throw Error('SECTION_NATIVE_MISSING');
for(const count of [4,5,6,7])if(testShard(section,current.indexOf(section),count,'browser E2E')!==(count===7?7:4))throw Error('SECTION_NATIVE_ROUTING');
const maintenance='cpv1-ctx4-05-maintenance-chrome-e2e.test.mjs';
if(!current.includes(maintenance))throw Error('CONTEXT_MAINTENANCE_BROWSER_MISSING');
for(const count of [4,5,6])if(testShard(maintenance,current.indexOf(maintenance),count,'browser E2E')!==4)throw Error('CONTEXT_MAINTENANCE_BROWSER_ROUTING');
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
const consumer='consumer-cleanup-chrome-e2e.test.mjs';
if(!current.includes(consumer))throw Error('CONSUMER_RETIREMENT_BROWSER_MISSING');
for(const count of [4,5,6])if(testShard(consumer,current.indexOf(consumer),count,'browser E2E')!==1)throw Error('CONSUMER_RETIREMENT_BROWSER_ROUTING');
const context='context-cards-chrome-e2e.test.mjs';
if(!current.includes(context))throw Error('CONTEXT_CARDS_BROWSER_MISSING');
for(const [count,expected]of [[4,1],[5,1],[6,6]])if(testShard(context,current.indexOf(context),count,'browser E2E')!==expected)throw Error('CONTEXT_CARDS_BROWSER_ROUTING');
const root='cpv1-topic-05-2-root-chrome-e2e.test.mjs';
if(!current.includes(root))throw Error('TOPIC05_ROOT_BROWSER_MISSING');
for(const count of [4,5,6])if(testShard(root,current.indexOf(root),count,'browser E2E')!==3)throw Error('TOPIC05_ROOT_BROWSER_ROUTING');
const beforeQ4=current.filter(name=>![removedPlacement,writing,settingsNext,next,entryMove,iah,selected,ai,sectionActions,section,root,maintenance,context,consumer,...promptReuseFiles,'desktop-vnext-context-chrome-e2e.test.mjs','cpv1-05-dvn-organize-chrome-e2e.test.mjs','cpv1-02-dvn-topic-content-chrome-e2e.test.mjs','cpv1-02-dvn-topic-years-chrome-e2e.test.mjs','cpv1-02-dvn-topic-root-chrome-e2e.test.mjs','cpv1-02-dvn-direct-edit-chrome-e2e.test.mjs','cpv1-02-dvn-purge-chrome-e2e.test.mjs','cpv1-02-dvn-removal-chrome-e2e.test.mjs','cpv1-02-dvn-search-chrome-e2e.test.mjs'].includes(name));
for(const [position,name]of beforeQ4.entries()){
 const expected=['cpv1-02-dvn-working-revision-chrome-e2e.test.mjs','cpv1-07-historical-comparison-chrome-e2e.test.mjs'].includes(name)?1:position%4+1;
 if(testShard(name,current.indexOf(name),4,'browser E2E')!==expected)throw Error('Q4_SHIFTED_PREVIOUS_BROWSER_ROUTING:'+name);
}
const expanded=Array.from({length:5},(_,slot)=>current.filter((name,position)=>testShard('tests/'+name,position,5,'browser E2E')===slot+1));
if(expanded.some(part=>!part.length)||expanded.flat().sort().join('|')!==current.join('|')||expanded[4].join('|')!=='cpv1-02-dvn-direct-edit-chrome-e2e.test.mjs')throw Error('D5_BROWSER_SHARD_PARTITION_INVALID');
for(const [position,name]of current.entries())if(name!=='cpv1-02-dvn-direct-edit-chrome-e2e.test.mjs'&&testShard(name,position,5,'browser E2E')!==testShard(name,position,4,'browser E2E'))throw Error('D5_SHIFTED_PREVIOUS_BROWSER_ROUTING:'+name);
const six=Array.from({length:6},(_,slot)=>current.filter((name,position)=>testShard(name,position,6,'browser E2E')===slot+1)),moves=new Map([[context,6],['uir-04-settings-chrome-e2e.test.mjs',6],['ux-r3-thought-chrome-e2e.test.mjs',6],['cpv1-02-dvn-topic-content-chrome-e2e.test.mjs',5],['cpv1-02-dvn-topic-years-chrome-e2e.test.mjs',5]]);
if(six.some(part=>!part.length)||six.flat().sort().join('|')!==current.join('|')||six[5].join('|')!=='context-cards-chrome-e2e.test.mjs|uir-04-settings-chrome-e2e.test.mjs|ux-r3-thought-chrome-e2e.test.mjs')throw Error('D5_SIX_BROWSER_SHARD_PARTITION_INVALID');
for(const [position,name]of current.entries())if(testShard(name,position,6,'browser E2E')!==(moves.get(name)||testShard(name,position,5,'browser E2E')))throw Error('D5_SIX_SHIFTED_UNREVIEWED_ROUTING:'+name);
// The frozen68-file manifest plus the five separately admitted whole files
// is an independent oracle for every preceding placement, at all three widths.
const frozen=JSON.parse(await readFile('docs/consumer-product-v1/implementation/desktop-vnext/D5-Q6-FULL-MATRIX.json','utf8'));
const prior=[...frozen.rows,...promptReuseFiles.map(file=>({file,before:3,after:3})),
 {file:consumer,before:1,after:1},{file:context,before:1,after:6}];
if(frozen.files!==68||prior.length!==73||new Set(prior.map(row=>row.file)).size!==73
 ||prior.map(row=>row.file).sort().join('|')!==current.filter(name=>name!==removedPlacement&&name!==maintenance&&name!==root&&name!==section&&name!==sectionActions&&name!==ai&&name!==entryMove&&name!==writing&&name!==settingsNext&&name!==next&&name!==iah&&name!==selected).join('|'))throw Error('CONTEXT_MAINTENANCE_PRIOR_CORPUS_CHANGED');
for(const row of prior)for(const count of [4,5,6]){
 const expected=count===6?(row.file==='uir-04-settings-chrome-e2e.test.mjs'?6:row.after):
  count===4&&row.file==='cpv1-02-dvn-direct-edit-chrome-e2e.test.mjs'?3:row.before;
 if(testShard(row.file,current.indexOf(row.file),count,'browser E2E')!==expected)throw Error('CONTEXT_MAINTENANCE_SHIFTED_PRIOR_ROUTE:'+count+':'+row.file);
}
// The seventh job owns the complete Thought and measured retained Root files. Compare every
// current file against the retained six-way map, including all frozen oracles.
const thought='ux-r3-thought-chrome-e2e.test.mjs',retainedRoot='cpv1-02-dvn-topic-root-chrome-e2e.test.mjs';
const seven=Array.from({length:7},(_,slot)=>current.filter((name,position)=>testShard(name,position,7,'browser E2E')===slot+1));
if(seven.some(part=>!part.length)||seven.flat().sort().join('|')!==current.join('|')||new Set(seven.flat()).size!==current.length||seven[6].join('|')!==[retainedRoot,section,thought].join('|'))throw Error('D5_SEVEN_BROWSER_SHARD_PARTITION_INVALID');
for(const [position,name]of current.entries())if(testShard(name,position,7,'browser E2E')!==([thought,retainedRoot,section].includes(name)?7:name==='cpv1-07-historical-comparison-chrome-e2e.test.mjs'?4:name==='ux-r2-reader-revisit-chrome-e2e.test.mjs'?6:name==='ux-r4-search-reuse-chrome-e2e.test.mjs'?6:testShard(name,position,6,'browser E2E')))throw Error('D5_SEVEN_SHIFTED_UNREVIEWED_ROUTING:'+name);
console.log(`CURRENT_BROWSER_COVERAGE_CONTRACT_PASS core=${formerCore.length} uir=${uir.length} ans=${ans.length} cpr=${cpr.length}`);

for(const file of [iah,selected]){if(!current.includes(file))throw Error('IAH_NATIVE_MISSING');for(const count of [4,5,6,7])if(testShard(file,current.indexOf(file),count,'browser E2E')!==4)throw Error('IAH_NATIVE_ROUTING');}

if(!current.includes(entryMove))throw Error('ENTRY_MOVE_NATIVE_MISSING');for(const count of [4,5,6,7])if(testShard(entryMove,current.indexOf(entryMove),count,'browser E2E')!==4)throw Error('ENTRY_MOVE_NATIVE_ROUTING');

if(!current.includes(next))throw Error('NEXT_NATIVE_MISSING');for(const count of [4,5,6,7])if(testShard(next,current.indexOf(next),count,'browser E2E')!==3)throw Error('NEXT_NATIVE_ROUTING');

if(!current.includes(settingsNext))throw Error('SETTINGS_NEXT_NATIVE_MISSING');for(const count of [4,5,6,7])if(testShard(settingsNext,current.indexOf(settingsNext),count,'browser E2E')!==2)throw Error('SETTINGS_NEXT_NATIVE_ROUTING');

if(!current.includes(writing))throw Error('TOPIC_WRITING_NATIVE_MISSING');for(const count of [4,5,6,7])if(testShard(writing,current.indexOf(writing),count,'browser E2E')!==2)throw Error('TOPIC_WRITING_NATIVE_ROUTING');

if(!current.includes(removedPlacement))throw Error('SETTINGS_PLACEMENT_NATIVE_MISSING');for(const count of [4,5,6,7,9])if(testShard(removedPlacement,current.indexOf(removedPlacement),count,'browser E2E')!==4)throw Error('SETTINGS_PLACEMENT_NATIVE_ROUTING');
const nine=Array.from({length:9},(_,slot)=>current.filter((name,position)=>testShard(name,position,9,'browser E2E')===slot+1));
if(nine.some(part=>!part.length)||nine.flat().sort().join('|')!==current.join('|')||new Set(nine.flat()).size!==current.length)throw Error('CURRENT_NINE_INCOMPLETE');
for(const [file,shard]of [['uir-04-settings-chrome-e2e.test.mjs',6],['context-cards-chrome-e2e.test.mjs',6],['cpv1-02-dvn-topic-content-chrome-e2e.test.mjs',5]])if(testShard(file,current.indexOf(file),9,'browser E2E')!==shard)throw Error('CURRENT_NINE_ARTIFACT_OWNER:'+file);
