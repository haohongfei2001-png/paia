import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFile,mkdtemp,mkdir,writeFile,rm,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {COMMAND_HASHES,LOG_PATHS,originalNodeCommands,collectPreflightReceipt,validatePreflightReceipt} from '../scripts/check-sync-node-preflight.mjs';
const workflow=await readFile(new URL('../../.github/workflows/paia-certification.yml',import.meta.url),'utf8');
const sha=x=>createHash('sha256').update(x).digest('hex');
const preflight=workflow.split('\n  sync_node_preflight:\n')[1].split('\n  sync_native_storage:\n')[0];
const commands=originalNodeCommands(workflow);
const expected={head:'1'.repeat(40),tree:'2'.repeat(40),runId:'123',runAttempt:'1'};
async function fixture(){const root=await mkdtemp(join(tmpdir(),'paia-node-preflight-'));await mkdir(join(root,'work/qa-bns-native-storage'),{recursive:true});for(const path of LOG_PATHS)await writeFile(join(root,path),'TAP version 13\n1..1\n# tests 1\n# pass 1\n# fail 0\n');await writeFile(join(root,'work/qa-bns-native-storage/node-step-exit.txt'),'0\n');return{root,read:overrides=>collectPreflightReceipt(root,{...expected,node:process.version,outcome:'success',commandSha256:COMMAND_HASHES,...overrides}),close:()=>rm(root,{recursive:true,force:true})};}
// Only the reviewed current_browser runner/font delta may be reversed.
const approvedFontStep = "      - name: Resolve browser fonts from fresh signed indexes\n        run: |\n          # Private per-job state; no Actions cache restore or save is enabled.\n          PAIA_FONT_STATE=\"$RUNNER_TEMP/paia-browser-fonts-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}-${{ matrix.index }}\"\n          echo \"PAIA_FONT_STATE=$PAIA_FONT_STATE\" >> \"$GITHUB_ENV\"\n          python3 scripts/prepare-browser-fonts.py plan --state \"$PAIA_FONT_STATE\"\n      - name: Provide Chinese glyph coverage for actual visual evidence\n        env:\n          PAIA_FONT_CACHE_MATCHED_KEY: ''\n        run: |\n          python3 scripts/prepare-browser-fonts.py install --state \"$PAIA_FONT_STATE\" --cache \"$PAIA_FONT_STATE/private/debs\"\n";
const originalFontStep = "      - name: Provide Chinese glyph coverage for actual visual evidence\n        run: |\n          sudo apt-get update\n          sudo apt-get install -y --no-install-recommends fonts-wqy-zenhei fonts-noto-cjk\n";
function restoreApprovedFonts(text){
 const start='\n  current_browser:\n',end='\n  full_suite:\n';
 assert.equal(text.split(start).length,2);assert.equal(text.split(end).length,2);
 const before=text.slice(0,text.indexOf(start)+start.length),tail=text.slice(before.length),at=tail.indexOf(end),job=tail.slice(0,at);
 assert.equal(job.split('    runs-on: ubuntu-24.04\n').length,2);
 assert.equal(job.split(approvedFontStep).length,2);
 return before+job.replace('    runs-on: ubuntu-24.04\n','    runs-on: ubuntu-latest\n').replace(approvedFontStep,originalFontStep)+tail.slice(at);
}
const approvedCoveragePreflight="      - uses: actions/checkout@v4\n        with:\n          persist-credentials: false\n      - uses: actions/setup-node@v4\n        with:\n          node-version: '22'\n      - name: Validate admission before scheduling expensive suites\n        working-directory: extension\n        run: node scripts/check-ui-refresh-ci.mjs\n";
function restoreApprovedCoveragePreflight(text){
 const start='\n  mode:\n',end='\n  unit:\n';
 assert.equal(text.split(start).length,2);assert.equal(text.split(end).length,2);
 const before=text.slice(0,text.indexOf(start)+start.length),tail=text.slice(before.length),at=tail.indexOf(end),job=tail.slice(0,at);
 const location='    steps:\n'+approvedCoveragePreflight+'      - id: depth\n';
 assert.equal(job.split(location).length,2,'one exact coverage preflight before depth selection');
 assert.equal(text.split(approvedCoveragePreflight).length,2,'coverage preflight is unique across workflow');
 const historical='\n  historical_browser:\n    needs: mode\n';
 assert.equal(text.split(historical).length,2,'historical audit also waits for coverage admission');
 return (before+job.replace(location,'    steps:\n      - id: depth\n')+tail.slice(at)).replace(historical,'\n  historical_browser:\n');
}
function restoredWorkflowHash(text){
 const commands=originalNodeCommands(text),preflight=text.split('\n  sync_node_preflight:\n')[1].split('\n  sync_native_storage:\n')[0];
 assert.deepEqual(commands.map(sha),COMMAND_HASHES);
 const originalStep='      - name: Verify whole owning Node files and fixture preflight\n        run: |\n          set -o pipefail\n'+commands.map(command=>'          '+command+'\n').join('');
 let restored=restoreApprovedFonts(restoreApprovedCoveragePreflight(text)).replace('\n  sync_node_preflight:\n'+preflight,'');
 restored=restored.replace("    needs: [mode, sync_node_preflight]\n    if: needs.mode.outputs.full == 'true' && needs.sync_node_preflight.result == 'success'","    needs: mode\n    if: needs.mode.outputs.full == 'true'");
 restored=restored.replace('      - name: Prove source and release native IndexedDB and worker durability\n',originalStep+'      - name: Prove source and release native IndexedDB and worker durability\n');
 restored=restored.replace('release, sync_node_preflight, sync_native_storage]','release, sync_native_storage]').replace('          SYNC_NODE_PREFLIGHT: ${{ needs.sync_node_preflight.result }}\n','').replace('            test "$SYNC_NODE_PREFLIGHT" = success\n','');
 assert.equal(sha(restored),'166fcd607396799510cc3ac947ab06d23496090d5a04939716d2302b0e982a78');
}
test('original Sync command move and exact approved font delta preserve every other workflow byte',()=>{
 restoredWorkflowHash(workflow);
 assert.match(preflight,/timeout-minutes: 5/);assert.match(preflight,/runs-on: ubuntu-latest/);assert.match(preflight,/persist-credentials: false/);assert.match(preflight,/node-version: '22'/);
 assert.match(preflight,/test "\$\(git rev-parse HEAD\)" = "\$PAIA_TESTED_HEAD"/);
 assert.match(preflight,/trap 'status=\$\?; printf "%s\\n" "\$status" > work\/qa-bns-native-storage\/node-step-exit.txt' EXIT/);
 assert.equal((preflight.match(/npm install --no-audit --no-fund --package-lock=false/g)||[]).length,1);
 const native=workflow.split('\n  sync_native_storage:\n')[1].split('\n  certified:\n')[0];
 assert.match(native,/timeout-minutes: 12/);assert.match(native,/--test-concurrency=3/);assert.equal((native.match(/tests\/native-sync\/[^ ]+\.mjs/g)||[]).filter(x=>x.endsWith('test.mjs')).length>=27,true);
 assert.doesNotMatch(native,/node --test tests\/browser-native-sync-/);
});
test('coverage preflight normalization rejects missing, relocated, duplicated or weakened admission',()=>{
 const changes=[
  [approvedCoveragePreflight,''],[approvedCoveragePreflight,approvedCoveragePreflight+approvedCoveragePreflight],
  [approvedCoveragePreflight,approvedCoveragePreflight.replace('persist-credentials: false','persist-credentials: true')],
  [approvedCoveragePreflight,approvedCoveragePreflight.replace("node-version: '22'","node-version: '24'")],
  [approvedCoveragePreflight,approvedCoveragePreflight.replace('run: node scripts/check-ui-refresh-ci.mjs','run: node scripts/check-ui-refresh-ci.mjs || true')],
  [approvedCoveragePreflight,approvedCoveragePreflight.replace('        working-directory: extension','        continue-on-error: true\n        working-directory: extension')],
  ['\n  historical_browser:\n    needs: mode\n','\n  historical_browser:\n'],
  ['    steps:\n'+approvedCoveragePreflight+'      - id: depth\n','    steps:\n      - id: depth\n'+approvedCoveragePreflight]
 ];
 for(const [from,to]of changes){assert.ok(workflow.includes(from),from);assert.throws(()=>restoredWorkflowHash(workflow.replace(from,to)),from);}
});
test('actual full aggregate requires both real job conclusions; round mode preserves the original rule',()=>{
 assert.match(workflow,/needs: \[mode, unit, contracts, current_browser, full_suite, macos_secure_store, macos_discard_lifecycle, release, sync_node_preflight, sync_native_storage\]/);
 assert.match(workflow,/needs: \[mode, sync_node_preflight\]\n    if: needs.mode.outputs.full == 'true' && needs.sync_node_preflight.result == 'success'/);
 const gate=workflow.split('      - name: Require selected verification depth\n')[1].split('        run: |\n')[1].split('\n').map(x=>x.startsWith('          ')?x.slice(10):x).join('\n');
 const good={...process.env,FULL:'true',UNIT:'success',CONTRACTS:'success',RELEASE:'success',CURRENT_BROWSER:'success',FULL_SUITE:'success',SYNC_NODE_PREFLIGHT:'success',SYNC_NATIVE_STORAGE:'success',MACOS_SECURE_STORE:'success',MACOS_DISCARD:'success'};
 assert.equal(spawnSync('bash',['-e','-c',gate],{env:good}).status,0);
 for(const key of ['SYNC_NODE_PREFLIGHT','SYNC_NATIVE_STORAGE'])for(const value of ['failure','cancelled','skipped'])assert.notEqual(spawnSync('bash',['-e','-c',gate],{env:{...good,[key]:value}}).status,0,`${key}/${value}`);
 assert.equal(spawnSync('bash',['-e','-c',gate],{env:{...good,FULL:'false',SYNC_NODE_PREFLIGHT:'skipped',SYNC_NATIVE_STORAGE:'skipped'}}).status,0);
 assert.doesNotMatch(preflight,/continue-on-error|download-artifact|actions\/cache|secrets\./);
 assert.match(preflight,/if: always\(\)\n        uses: actions\/upload-artifact@v4/);assert.match(preflight,/if-no-files-found: error\n          retention-days: 7/);
});
test('closed same-head preflight evidence hashes the actual two regular logs and shell result',async()=>{const f=await fixture();try{const r=await f.read();validatePreflightReceipt(r,expected);for(let i=0;i<2;i++){const bytes=await readFile(join(f.root,LOG_PATHS[i]));assert.equal(r.logs[i].sha256,sha(bytes));assert.equal(r.logs[i].bytes,bytes.length);}assert.equal(r.shellExit,0);assert.equal(r.result,'PASS');}finally{await f.close();}});
for(const [key,value]of [['head','3'.repeat(40)],['tree','4'.repeat(40)],['runId','124'],['runAttempt','2']])test(`wrong ${key} cannot qualify the receipt`,async()=>{const f=await fixture();try{const r=await f.read();r[key]=value;assert.throws(()=>validatePreflightReceipt(r,expected));}finally{await f.close();}});
test('unknown receipt fields, changed commands, paths and malformed log hashes fail closed',async()=>{const f=await fixture();try{const good=await f.read();for(const mutate of [r=>r.extra=true,r=>r.commandSha256[0]='0'.repeat(64),r=>r.logs[0].path='../foreign.log',r=>r.logs[0].sha256='wrong',r=>r.logs[0].bytes=-1]){const r=structuredClone(good);mutate(r);assert.throws(()=>validatePreflightReceipt(r,expected));}assert.throws(()=>originalNodeCommands(workflow.replace(commands[0],commands[0]+' --test-name-pattern=skip')));}finally{await f.close();}});
test('cancelled, skipped or failed shell execution remains incomplete even with both logs',async()=>{const f=await fixture();try{for(const outcome of ['cancelled','skipped','failure']){const r=await f.read({outcome});assert.equal(r.result,'INCOMPLETE');assert.throws(()=>validatePreflightReceipt(r,expected));}await writeFile(join(f.root,'work/qa-bns-native-storage/node-step-exit.txt'),'1\n');const r=await f.read();assert.equal(r.result,'INCOMPLETE');assert.throws(()=>validatePreflightReceipt(r,expected));}finally{await f.close();}});
test('missing logs or a missing original shell exit cannot become a successful receipt',async()=>{const f=await fixture();try{await rm(join(f.root,LOG_PATHS[1]));let r=await f.read();assert.equal(r.result,'INCOMPLETE');assert.equal(r.logs[1].sha256,null);assert.throws(()=>validatePreflightReceipt(r,expected));await rm(join(f.root,'work/qa-bns-native-storage/node-step-exit.txt'));r=await f.read();assert.equal(r.shellExit,null);assert.equal(r.result,'INCOMPLETE');}finally{await f.close();}});
test('symlink and directory substitutions are rejected rather than hashed or uploaded as log evidence',async()=>{const f=await fixture();try{await rm(join(f.root,LOG_PATHS[0]));await symlink(join(f.root,LOG_PATHS[1]),join(f.root,LOG_PATHS[0]));await assert.rejects(f.read());await rm(join(f.root,LOG_PATHS[0]));await mkdir(join(f.root,LOG_PATHS[0]));await assert.rejects(f.read());}finally{await f.close();}});

test('font normalization rejects unauthorized workflow mutations instead of masking them',()=>{
 const changes=[
  ['prepare-browser-fonts.py plan','prepare-browser-fonts.py plan --unsafe'],
  ['private/debs','shared/debs'],["PAIA_FONT_CACHE_MATCHED_KEY: ''","PAIA_FONT_CACHE_MATCHED_KEY: foreign"],
  [approvedFontStep,approvedFontStep+approvedFontStep],['    runs-on: ubuntu-24.04','    runs-on: ubuntu-latest'],
  ['timeout-minutes: 18','timeout-minutes: 19'],["PAIA_TEST_CONCURRENCY: '1'","PAIA_TEST_CONCURRENCY: '2'"],
  ['npm run test:browser','npm run test:browser -- --test-name-pattern=skip'],
  ['test "$CURRENT_BROWSER" = success','test "$CURRENT_BROWSER" != failure'],
  [commands[0],commands[0]+' --test-name-pattern=skip'],[commands[1],commands[1]+' --test-name-pattern=skip']
 ];
 for(const [from,to]of changes){assert.ok(workflow.includes(from),from);assert.throws(()=>restoredWorkflowHash(workflow.replace(from,to)),from);}
});
