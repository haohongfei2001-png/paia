import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
test('full browser gate verifies installed Chrome with the exact shard set and unchanged budgets',async()=>{
 const workflow=await readFile(new URL('../../.github/workflows/paia-certification.yml',import.meta.url),'utf8');
 const job=workflow.split('  current_browser:')[1].split('  full_suite:')[0];
 assert.match(job,/timeout-minutes: 18/);assert.deepEqual([...job.matchAll(/shard: '(\d+\/10)'/g)].map(match=>match[1]),Array.from({length:10},(_,i)=>`${i+1}/10`));
 assert.match(job,/CHROME_PATH=\$CHROME_BIN/);assert.match(job,/xvfb-run -a node scripts\/check-hosted-chrome.mjs/);
 assert.match(job,/prepare-browser-fonts.py install/);assert.match(job,/fc-list :lang=zh/);
 const fontScript=await readFile(new URL('../scripts/prepare-browser-fonts.py',import.meta.url),'utf8');
 assert.match(fontScript,/PACKAGES = \['fonts-wqy-zenhei', 'fonts-noto-cjk'\]/);assert.match(fontScript,/'--no-install-recommends', 'install', \*PACKAGES/);
 assert.match(job,/xvfb-run -a npm run test:browser/);assert.match(job,/PAIA_TEST_CONCURRENCY: '1'/);
 assert.doesNotMatch(job,/playwright install/);
 const steps=job.split('      - name: ');const optional=steps.filter(step=>step.includes('continue-on-error:'));
 assert.equal(optional.length,2);
 for(const step of optional){assert.match(step,/uses: actions\/cache\/(restore|save)@v4/);assert.match(step,/timeout-minutes: 1/);assert.match(step,/continue-on-error: true/);}
 for(const step of steps.filter(step=>!optional.includes(step)))assert.doesNotMatch(step,/continue-on-error/);
 assert.match(job,/SEGMENT_DOWNLOAD_TIMEOUT_MINS: '1'/);assert.doesNotMatch(job,/restore-keys:|actions\/cache@|apt-cache-action/);
 const save=steps.find(step=>step.includes('uses: actions/cache/save@v4'));
 assert.match(save,/github.event_name == 'push' && github.ref == 'refs\/heads\/main'/);assert.match(save,/steps.font-install.outputs.cache_ready == 'true'/);
 assert.match(job,/PAIA_FONT_CACHE_MATCHED_KEY: \$\{\{ steps.font-restore.outputs.cache-matched-key \}\}/);
 assert.equal((job.match(/path: \$\{\{ runner.temp \}\}\/paia-font-cache\/debs/g)||[]).length,2,'restore/save use the same path and cache version');
 const smoke=await readFile(new URL('../scripts/check-hosted-chrome.mjs',import.meta.url),'utf8');
 assert.match(smoke,/executablePath:process.env.CHROME_PATH,headless:false/);assert.match(smoke,/route=>route.abort\(\)/);
 assert.match(smoke,/page.locator\('#latin'\).textContent\(\)/);assert.match(smoke,/CSS.getPlatformFontsForNode/);assert.match(smoke,/font.glyphCount>=4/);
 assert.match(smoke,/finally\{await browser.close\(\)/);
});

// Execute the actual acquisition script with synthetic native-command results.
// No sudo, APT, network, cache service or production install runs on this host.
const fontControl=String.raw`
import importlib.util, json, sys, tempfile, hashlib, subprocess, copy
from pathlib import Path
spec=importlib.util.spec_from_file_location('fonts',sys.argv[1]); m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
scenario=sys.argv[2]; calls=[]; outputs={}
host={'ImageOS':'ubuntu24','ImageVersion':'20261022.1','os':'ID=ubuntu\nVERSION_ID=24.04\n','architecture':'amd64'}
rows=[]; blobs={}
for package,version,arch in [('fonts-wqy-zenhei','0.9.45-8','all'),('fonts-noto-cjk','1:20230817+repack1-3','all'),('synthetic-native-dependency','2.0','amd64')]:
 name=package+'_'+version.replace(':','%3a')+'_'+arch+'.deb'
 data=json.dumps({'Package':package,'Version':version,'Architecture':arch}).encode()
 row={'Package':package,'Version':version,'Architecture':arch,'Filename':'pool/'+name.replace('%3a',':'),'Size':str(len(data)),'SHA256':hashlib.sha256(data).hexdigest()}
 rows.append(row); blobs[name]=data
with tempfile.TemporaryDirectory() as temporary:
 root=Path(temporary); state=root/'state'; cache=root/'cache'/'debs'
 def command(args):
  calls.append(args)
  if 'update' in args:
   if scenario=='signed-index-failure': raise subprocess.CalledProcessError(100,args)
   return 'fresh signed index\n'
  if '--print-uris' in args:
   return '\n'.join("'https://archive.ubuntu.com/ubuntu/"+r['Filename'].replace(':','%3a')+"' "+n+' '+r['Size']+' MD5Sum:unused' for n,r in zip(blobs,rows))
  if 'dumpavail' in args:
   return '\n\n'.join('\n'.join(k+': '+v for k,v in r.items()) for r in (rows[:-1] if scenario=='missing-signed-metadata' else rows))
  if args[0]=='dpkg-deb':
   control=json.loads(Path(args[-1]).read_bytes())
   if 'cache' in Path(args[-1]).parts and scenario in ['bad-version','bad-architecture']:
    control['Version' if scenario=='bad-version' else 'Architecture']='not-approved'
   return '\n'.join(k+': '+v for k,v in control.items())
  if '--download-only' in args:
   if scenario=='original-source-failure': raise subprocess.CalledProcessError(100,args)
   for name,data in blobs.items(): (state/'archives'/name).write_bytes(data)
   return 'original signed download once\n'
  if '--no-download' in args:
   if scenario=='install-failure': raise subprocess.CalledProcessError(100,args)
   return 'native dependency-check and configuration\n'
  raise AssertionError(args)
 m.run=command; m.identity=lambda:copy.deepcopy(host);m.output=lambda **kwargs:outputs.update(kwargs)
 if scenario=='stale-lists':
  (state/'lists').mkdir(parents=True);(state/'lists'/'old').write_text('must not reuse')
  try:m.plan(state);raise AssertionError('old lists admitted')
  except FileExistsError:pass
  assert not calls
  sys.exit(0)
 if scenario in ['signed-index-failure','missing-signed-metadata']:
  try:m.plan(state);raise AssertionError('invalid index admitted')
  except (subprocess.CalledProcessError,ValueError):pass
  assert not (state/'plan.json').exists()
  assert not any('--no-download' in c or '--download-only' in c and '--print-uris' not in c for c in calls)
  sys.exit(0)
 plan=m.plan(state)
 assert len(plan['archives'])==3,'native dependency closure, not just requested fonts'
 assert outputs['key']==m.key_for(plan)
 for c in calls:
  assert 'Dir::State::lists='+str(state/'lists') in c
  assert 'APT::Update::Error-Mode=any' in c
  assert 'APT::Get::AllowUnauthenticated=false' in c
 assert calls[0][-1]=='update'
 if scenario=='key-invalidation':
  for path,value in [('ImageOS','ubuntu-next'),('ImageVersion','new'),('architecture','arm64')]:
   other=copy.deepcopy(plan);other['host'][path]=value;assert m.key_for(other)!=m.key_for(plan)
  for field,value in [('Version','next'),('Architecture','arm64'),('Size',999),('SHA256','0'*64)]:
   other=copy.deepcopy(plan);other['archives'][0][field]=value;assert m.key_for(other)!=m.key_for(plan)
  sys.exit(0)
 if scenario!='cold-miss':
  cache.mkdir(parents=True)
  for name,data in blobs.items():(cache/name).write_bytes(data)
 first=next(iter(blobs))
 if scenario=='corrupt':(cache/first).write_bytes(b'x'*len(blobs[first]))
 if scenario=='wrong-size':(cache/first).write_bytes(b'x')
 if scenario=='missing':(cache/first).unlink()
 if scenario=='extra':(cache/'unrequested.deb').write_bytes(b'extra')
 if scenario=='nested-path':(cache/'nested').mkdir()
 if scenario=='symlink':
  (root/'outside.deb').write_bytes(blobs[first]);(cache/first).unlink();(cache/first).symlink_to(root/'outside.deb')
 if scenario=='hardlink':
  (cache/first).unlink();(root/'outside.deb').write_bytes(blobs[first]);(cache/first).hardlink_to(root/'outside.deb')
 if scenario=='parent-symlink':
  cache.parent.rename(root/'outside');cache.parent.symlink_to(root/'outside',target_is_directory=True)
 if scenario=='image-changed-after-plan':
  host['ImageVersion']='new'
  try:m.install(state,cache,m.key_for(plan));raise AssertionError('changed image admitted')
  except ValueError:pass
  assert not any('--no-download' in c for c in calls);sys.exit(0)
 matched='' if scenario in ['restore-timeout','cold-miss','original-source-failure'] else m.key_for(plan)+'-partial' if scenario=='key-mismatch' else m.key_for(plan)
 if scenario in ['original-source-failure','install-failure']:
  try:m.install(state,cache,matched);raise AssertionError('fatal APT failure swallowed')
  except subprocess.CalledProcessError:pass
 else:
  hit=m.install(state,cache,matched)
  assert hit==(scenario=='hit')
 downloads=[c for c in calls if '--download-only' in c and '--print-uris' not in c]
 installs=[c for c in calls if '--no-download' in c]
 assert len(downloads)==(0 if scenario in ['hit','install-failure'] else 1)
 assert len(installs)==(0 if scenario=='original-source-failure' else 1)
 for c in downloads+installs:
  assert c[-2:]==m.PACKAGES and '--no-install-recommends' in c
  assert c[:2]==['sudo','apt-get'] and 'Dir::Cache::archives='+str(state/'archives') in c
 if scenario=='parent-symlink':
  assert cache.parent.is_symlink() and outputs['cache_ready']=='false'
  assert (root/'outside'/'debs'/first).read_bytes()==blobs[first]
 if scenario not in ['original-source-failure','install-failure']:
  assert outputs['cache_hit']==str(scenario=='hit').lower()
 print(json.dumps({'scenario':scenario,'nativeDownloadAttempts':len(downloads),'nativeInstallAttempts':len(installs),'output':outputs}))
`;
for(const scenario of ['hit','cold-miss','restore-timeout','corrupt','wrong-size','missing','extra','nested-path','symlink','hardlink','parent-symlink','bad-version','bad-architecture','key-mismatch','key-invalidation','image-changed-after-plan','signed-index-failure','missing-signed-metadata','stale-lists','original-source-failure','install-failure'])test('font archive control: '+scenario,()=>{
 execFileSync(process.env.PYTHON||'python3',['-c',fontControl,fileURLToPath(new URL('../scripts/prepare-browser-fonts.py',import.meta.url)),scenario],{encoding:'utf8',stdio:'pipe'});
});
