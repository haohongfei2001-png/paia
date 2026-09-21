import {readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {group} from './test-groups.mjs';

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
console.log(`CURRENT_BROWSER_COVERAGE_CONTRACT_PASS core=${formerCore.length} uir=${uir.length} ans=${ans.length}`);
