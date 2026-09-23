import {mkdir,readdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {inputDigest,goldenBundle} from './compatibility-gate.mjs';
import {group} from './test-groups.mjs';

process.chdir(fileURLToPath(new URL('../',import.meta.url)));

for(const name of ['UNIT','CONTRACTS','CURRENT_BROWSER']){
  if(process.env[name]!=='success') throw new Error(`CI_CATEGORY_NOT_SUCCESS:${name}=${process.env[name]||''}`);
}

const names=(await readdir('tests')).filter(name=>name.endsWith('.test.mjs')).sort();
const counts={};
for(const name of names){
  const key=group(name);
  counts[key]=(counts[key]||0)+1;
}
const currentFiles=(counts.unit||0)+(counts['browser E2E']||0)+(counts['adapter contract']||0)+(counts['privacy/security']||0);
if(currentFiles<1)throw new Error('CURRENT_TEST_SET_EMPTY');

const row={
  schemaVersion:1,
  aggregateOnly:true,
  fullSuite:true,
  auditPassed:true,
  exactSha:process.env.GITHUB_SHA||null,
  categories:{
    unit:counts.unit||0,
    browserE2E:counts['browser E2E']||0,
    adapterContract:counts['adapter contract']||0,
    privacySecurity:counts['privacy/security']||0,
  },
  currentFiles,
  historicalBrowserFiles:counts['historical browser E2E']||0,
  historicalBrowserAudit:'SEPARATE_PRE_MIGRATION_EVIDENCE',
  testConcurrency:'SHARDED_4_WAY',
  inputDigest:await inputDigest(),
  realGolden:await goldenBundle()?'AVAILABLE':'UNAVAILABLE',
  jobResults:{
    unit:process.env.UNIT,
    contracts:process.env.CONTRACTS,
    currentBrowser:process.env.CURRENT_BROWSER,
  },
};
await mkdir('work',{recursive:true});
await writeFile('work/test-summary.json',JSON.stringify(row,null,2)+'\n');
console.log(JSON.stringify(row));
