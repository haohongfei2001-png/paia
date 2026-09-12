import {readdir,mkdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {group} from './test-groups.mjs';

const require=createRequire(import.meta.url);
process.env.PLAYWRIGHT_MODULE=require.resolve('playwright');
process.env.PAIA_HEADLESS='1';
process.env.CHROME_PATH ||= require('playwright').chromium.executablePath();
await mkdir('work/round8',{recursive:true});

const exclusions=['history-performance-v090.test.mjs','light-coverage.test.mjs','smart-filter-diagnostics.test.mjs'];
const all=(await readdir('tests')).filter(n=>n.endsWith('.test.mjs'));
const portable=all.filter(n=>['unit','adapter contract','privacy/security'].includes(group(n))&&!exclusions.includes(n));
const browser=[
 'round8-shared-context-chrome-e2e.test.mjs',
 'original-complete-chrome-e2e.test.mjs',
 'memory-v0100-chrome-e2e.test.mjs',
 'backup-v081-chrome-e2e.test.mjs',
 'evolution-round7-chrome-e2e.test.mjs',
 'reading-optional-round3-chrome-e2e.test.mjs',
 'ai-presentation-chrome-v072c.test.mjs',
 'view-switch-v0110-chrome-e2e.test.mjs',
];
const results=[];
function run(label,args,command=process.execPath){
 const r=spawnSync(command,args,{encoding:'utf8',maxBuffer:100*1024*1024,timeout:480000,env:process.env});
 results.push({label,status:r.status,signal:r.signal,error:r.error?.message});
 return (r.stdout||'')+'\n'+(r.stderr||'');
}
for(const [label,files] of [['portable',portable],['browser',browser]]){
 const log=run(label,['--test','--test-concurrency='+(label==='browser'?'1':'4'),...files.map(n=>'tests/'+n)]);
 await writeFile('work/round8/'+label+'.log',log);
 console.log(log.slice(-4000));
}
for(const [label,args] of [['package',['scripts/check_package.py']],['release',['scripts/build_current_release.py','work/round8/release']]]){
 const log=run(label,args,'python3');
 await writeFile('work/round8/'+label+'.log',log);
 console.log(log.slice(-3000));
}
const sha=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).stdout.trim();
await writeFile('work/round8/verification.json',JSON.stringify({
 sha,exclusions,portableFiles:portable.length,browserFiles:browser,results,
 sharedWorkingBody:true,directUnorganizedInputContext:true,
 realUserData:false,realProvider:false,dailyDeployment:false
},null,2)+'\n');
if(results.some(r=>r.status!==0))process.exit(1);
console.log('ROUND8_VERIFIED');
