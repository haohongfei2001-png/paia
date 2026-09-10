import {readdir,readFile,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {inputDigest,goldenBundle} from './compatibility-gate.mjs';
import {group} from './test-groups.mjs';
process.chdir(fileURLToPath(new URL('../',import.meta.url)));
const startingDigest=await inputDigest();
const requested=process.argv[2];
const allowed=['unit','adapter contract','browser E2E','privacy/security'];
if(requested&&!allowed.includes(requested))throw Error('Allowed categories: '+allowed.join(', '));
const files=(await readdir('tests')).filter(n=>n.endsWith('.test.mjs')&&(!requested||group(n)===requested)).sort().map(n=>'tests/'+n);
const concurrency=process.env.PAIA_TEST_CONCURRENCY||'4';
if(!['1','4'].includes(concurrency))throw Error('PAIA_TEST_CONCURRENCY must be 1 or 4');
const tests=spawnSync(process.execPath,['--test','--test-concurrency='+concurrency,'--test-reporter=./scripts/test-report.mjs',...files],{stdio:'inherit'});
if(tests.status!==0)process.exit(tests.status||1);
const audit=spawnSync(process.env.PYTHON||'python3',['scripts/check_package.py'],{stdio:'inherit'});
const developmentAudit=spawnSync(process.execPath,['scripts/check_development.mjs'],{stdio:'inherit'});
if(audit.status===0&&developmentAudit.status===0&&!requested){const p='work/test-summary.json',r=JSON.parse(await readFile(p,'utf8'));r.fullSuite=true;r.auditPassed=true;r.testConcurrency=Number(concurrency);r.inputDigest=await inputDigest();if(r.inputDigest!==startingDigest)throw Error('SOURCE_CHANGED_DURING_TESTS');r.realGolden=await goldenBundle()?'AVAILABLE':'UNAVAILABLE';await writeFile(p,JSON.stringify(r,null,2)+'\n');}
process.exit(audit.status===0&&developmentAudit.status===0?0:1);
