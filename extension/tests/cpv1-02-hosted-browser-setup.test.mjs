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
import importlib.util, json, sys, tempfile, hashlib, subprocess, copy, os
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
 os.environ['RUNNER_TEMP']=str(root);os.environ.pop('APT_CONFIG',None)
 sources={'/etc/apt/sources.list':'deb [arch=amd64 signed-by=/usr/share/keyrings/ubuntu.gpg] https://archive.ubuntu.com/ubuntu noble main', '/etc/apt/sources.list.d/base.sources':'Types: deb\nURIs: https://archive.ubuntu.com/ubuntu\nSuites: noble-updates\nComponents: main\nSigned-By: /usr/share/keyrings/ubuntu.gpg'}
 m.source_files=lambda:copy.deepcopy(sources)
 fragments={'/etc/apt/apt.conf.d/01synthetic':'APT::Install-Recommends \"0\";'}
 m.configuration_files=lambda:copy.deepcopy(fragments)
 if scenario.startswith('hosted-mirror'):
  sources={ '/etc/apt/sources.list.d/ubuntu.sources':'Types: deb\nURIs: mirror+file:/etc/apt/apt-mirrors.txt\nSuites: noble\nComponents: main\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg', '/etc/apt/apt-mirrors.txt':'https://archive.ubuntu.com/ubuntu/\tpriority:1\n'}
 if scenario=='source-trusted':sources['/etc/apt/sources.list']=sources['/etc/apt/sources.list'].replace('arch=amd64','trusted=yes')
 if scenario=='source-insecure':sources['/etc/apt/sources.list']=sources['/etc/apt/sources.list'].replace('arch=amd64','allow-insecure=yes')
 if scenario=='source-expired':sources['/etc/apt/sources.list.d/base.sources']+='\nCheck-Valid-Until: no'
 if scenario=='apt-config-env':os.environ['APT_CONFIG']='/unsupported'
 def command(args):
  calls.append(args)
  if 'apt-config' in args:
   config={'Dir':'/','Dir::Etc':'etc/apt','Dir::Etc::sourcelist':'sources.list','Dir::Etc::sourceparts':'sources.list.d','Dir::Etc::trusted':'trusted.gpg','Dir::Etc::trustedparts':'trusted.gpg.d','Dir::Etc::main':'apt.conf','Dir::Etc::parts':'apt.conf.d'}
   if scenario.startswith('hosted-mirror'):
    config.update({'APT::Key':'','APT::Key::Assert-Pubkey-Algo':'>=rsa2048,ed25519,ed448,nistp256,nistp384,nistp512,brainpoolP256r1,brainpoolP320r1,brainpoolP384r1,brainpoolP512r1,secp256k1','APT::Key::Assert-Pubkey-Algo::Next':'>=rsa2048,ed25519,ed448,nistp256,nistp384,nistp512','APT::Key::Assert-Pubkey-Algo::Future':'>=rsa3072,ed25519,ed448'})
   for i,arg in enumerate(args):
    if arg=='-o':k,v=args[i+1].split('=',1);config[k]=v
   if scenario=='config-insecure':config['Acquire::https::AllowInsecureRepositories']='true'
   if scenario=='config-date':config['Acquire::https::Check-Date']='false'
   if scenario=='config-validity-label':config['Acquire::Min-ValidTime::Ubuntu']='999999'
   if scenario=='config-validity':config['Acquire::https::Check-Valid-Until']='false'
   if scenario=='config-signature':config['Acquire::gpgv::Options::']='--ignore-time-conflict'
   if scenario=='config-binary':config['Binary::apt-get::Acquire::Check-Date']='false'
   if scenario=='config-path':config['Dir::Etc::sourceparts']='other'
   if scenario=='config-root-user' and args[0]=='sudo':config['Acquire::Retries']='1'
   return '\n'.join(k+' "'+v.replace('%','%25').replace('\"','%22').replace('\n','%0a')+'";' for k,v in config.items())+'\nDPkg::Post-Invoke:: "true";\nDPkg::Post-Invoke:: "true";'
  if 'update' in args:
   if scenario=='signed-index-failure': raise subprocess.CalledProcessError(100,args)
   return 'fresh signed index\n'
  if '--print-uris' in args:
   return '\n'.join(("'mirror+file:/etc/apt/apt-mirrors.txt/" if scenario.startswith('hosted-mirror') else "'https://archive.ubuntu.com/ubuntu/")+r['Filename'].replace(':','%3a')+"' "+n+' '+r['Size']+' '+('MD5Sum:unused' if scenario=='weak-resolver-hash' else 'SHA256:'+('a'*64 if scenario=='resolver-hash-mismatch' else r['SHA256'])) for n,r in zip(blobs,rows))
  if 'dumpavail' in args:
   return '\n\n'.join('\n'.join(k+': '+v for k,v in r.items()) for r in (rows[:-1] if scenario=='missing-signed-metadata' else rows))
  if args[0]=='dpkg-deb':
   control=json.loads(Path(args[-1]).read_bytes())
   if 'cache' in Path(args[-1]).parts and scenario in ['bad-version','bad-architecture']:
    control['Version' if scenario=='bad-version' else 'Architecture']='not-approved'
   return '\n'.join(k+': '+v for k,v in control.items())
  if '--download-only' in args:
   if scenario=='original-source-failure': raise subprocess.CalledProcessError(100,args)
   for name,data in blobs.items():
    target=state/'archives'/name
    if not target.exists() or target.stat().st_size!=len(data):target.write_bytes(data)
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
 if scenario in ['signed-index-failure','missing-signed-metadata','weak-resolver-hash','resolver-hash-mismatch','source-trusted','source-insecure','source-expired','apt-config-env','config-insecure','config-date','config-validity','config-validity-label','config-signature','config-binary','config-path','config-root-user']:
  try:m.plan(state);raise AssertionError('invalid index admitted')
  except (subprocess.CalledProcessError,ValueError):pass
  assert not (state/'plan.json').exists()
  if scenario not in ['signed-index-failure','missing-signed-metadata','weak-resolver-hash','resolver-hash-mismatch']:assert not any('apt-get' in c for c in calls)
  assert not any('--no-download' in c or '--download-only' in c and '--print-uris' not in c for c in calls)
  sys.exit(0)
 plan=m.plan(state)
 assert len(plan['archives'])==3,'native dependency closure, not just requested fonts'
 assert outputs['key']==m.key_for(plan)
 for c in calls:
  assert 'Dir::State::lists='+str(state/'lists') in c
  assert 'APT::Update::Error-Mode=any' in c
  assert 'APT::Get::AllowUnauthenticated=false' in c
 assert next(c for c in calls if 'apt-get' in c)[-1]=='update'
 assert all('Acquire::ForceHash=SHA256' in c for c in calls)
 assert next(c for c in calls if 'dumpavail' in c)[:2]==['sudo','apt-cache']
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
 if scenario in ['image-changed-after-plan','config-changed-after-plan','hosted-mirror-changed-after-plan','fragments-changed-after-plan']:
  if scenario=='hosted-mirror-changed-after-plan':sources['/etc/apt/apt-mirrors.txt']+='# changed bytes\n'
  if scenario=='fragments-changed-after-plan':fragments['/etc/apt/apt.conf.d/01synthetic']+='\n// changed'
  if scenario=='config-changed-after-plan':sources['/etc/apt/sources.list']+='\n# changed'
  if scenario=='image-changed-after-plan':host['ImageVersion']='new'
  try:m.install(state,cache,m.key_for(plan));raise AssertionError('changed image admitted')
  except ValueError:pass
  assert not any('--no-download' in c for c in calls);sys.exit(0)
 if scenario in ['staged-copy-corrupt','staged-copy-throws']:
  original=m.copy_archives
  def broken_copy(source,target,archives):
   original(source,target,archives)
   if target==state/'archives':
    (target/first).write_bytes(b'x'*len(blobs[first]))
    if scenario=='staged-copy-throws':raise OSError('injected interrupted copy')
  m.copy_archives=broken_copy
 matched='' if scenario in ['restore-timeout','cold-miss','hosted-mirror-cold','original-source-failure'] else m.key_for(plan)+'-partial' if scenario=='key-mismatch' else m.key_for(plan)
 if scenario in ['original-source-failure','install-failure']:
  try:m.install(state,cache,matched);raise AssertionError('fatal APT failure swallowed')
  except subprocess.CalledProcessError:pass
 else:
  hit=m.install(state,cache,matched)
  assert hit==(scenario in ['hit','hosted-mirror-hit'])
 downloads=[c for c in calls if '--download-only' in c and '--print-uris' not in c]
 installs=[c for c in calls if '--no-download' in c]
 assert len(downloads)==(0 if scenario in ['hit','hosted-mirror-hit','install-failure'] else 1)
 assert len(installs)==(0 if scenario=='original-source-failure' else 1)
 for c in downloads+installs:
  assert c[-2:]==m.PACKAGES and '--no-install-recommends' in c
  assert c[:2]==['sudo','apt-get'] and 'Dir::Cache::archives='+str(state/'archives') in c
 if scenario in ['staged-copy-corrupt','staged-copy-throws']:
  assert (state/'rejected-archives'/first).read_bytes()==b'x'*len(blobs[first])
  assert (state/'archives'/first).read_bytes()==blobs[first]
 if scenario=='parent-symlink':
  assert cache.parent.is_symlink() and outputs['cache_ready']=='false'
  assert (root/'outside'/'debs'/first).read_bytes()==blobs[first]
 if scenario not in ['original-source-failure','install-failure']:
  assert outputs['cache_hit']==str(scenario in ['hit','hosted-mirror-hit']).lower()
 print(json.dumps({'scenario':scenario,'nativeDownloadAttempts':len(downloads),'nativeInstallAttempts':len(installs),'output':outputs}))
`;
for(const scenario of ['hit','cold-miss','restore-timeout','corrupt','wrong-size','missing','extra','nested-path','symlink','hardlink','parent-symlink','bad-version','bad-architecture','key-mismatch','key-invalidation','image-changed-after-plan','signed-index-failure','missing-signed-metadata','stale-lists','original-source-failure','install-failure','weak-resolver-hash','resolver-hash-mismatch','staged-copy-corrupt','staged-copy-throws','source-trusted','source-insecure','source-expired','apt-config-env','config-insecure','config-date','config-validity','config-validity-label','config-signature','config-binary','config-path','config-root-user','config-changed-after-plan','hosted-mirror-hit','hosted-mirror-cold','hosted-mirror-changed-after-plan','fragments-changed-after-plan'])test('font archive control: '+scenario,()=>{
 execFileSync(process.env.PYTHON||'python3',['-c',fontControl,fileURLToPath(new URL('../scripts/prepare-browser-fonts.py',import.meta.url)),scenario],{encoding:'utf8',stdio:'pipe'});
});

// Controlled Ubuntu24 / APT2.8.1 defaults and runner-images source at
// 5b6567dc8f6adb65a208b8203b7947bf8323de37. This is NOT a hosted APT run.
const compatibilityControl=String.raw`
import importlib.util, sys, tempfile, os, copy, hashlib
from pathlib import Path
from urllib.parse import quote
spec=importlib.util.spec_from_file_location('fonts',sys.argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
case=sys.argv[2]
config={'APT':'','APT::Key':'','APT::Key::Assert-Pubkey-Algo':'>=rsa2048,ed25519,ed448,nistp256,nistp384,nistp512,brainpoolP256r1,brainpoolP320r1,brainpoolP384r1,brainpoolP512r1,secp256k1','APT::Key::Assert-Pubkey-Algo::Next':'>=rsa2048,ed25519,ed448,nistp256,nistp384,nistp512','APT::Key::Assert-Pubkey-Algo::Future':'>=rsa3072,ed25519,ed448','Dir':'/','Dir::Etc':'etc/apt','Dir::Etc::sourcelist':'sources.list','Dir::Etc::sourceparts':'sources.list.d','Dir::Etc::trusted':'trusted.gpg','Dir::Etc::trustedparts':'trusted.gpg.d','Dir::Etc::main':'apt.conf','Dir::Etc::parts':'apt.conf.d','Binary':'apt-config','Binary::apt':'','Binary::apt::APT::Color':'1','Binary::apt::APT::Cache::Show::Version':'2','Acquire::Check-Date':'true','Acquire::Check-Valid-Until':'true','Acquire::ForceHash':'SHA256'}
source='/etc/apt/sources.list.d/ubuntu.sources';mirror='/etc/apt/apt-mirrors.txt'
sources={source:'Types: deb\nURIs: mirror+file:/etc/apt/apt-mirrors.txt\nSuites: noble noble-updates noble-backports\nComponents: main universe restricted multiverse\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg',mirror:'http://azure.archive.ubuntu.com/ubuntu/\tpriority:1\nhttps://archive.ubuntu.com/ubuntu/\tpriority:2\nhttps://security.ubuntu.com/ubuntu/\tpriority:3\n'}
def dump(c):return '\n'.join(quote(k,safe=':')+' "'+quote(v,safe='/:,>-._')+'";' for k,v in c.items())
def audit():return m.checked_configuration(dump(config),sources)
def denied(fn):
 try:fn()
 except (ValueError,OSError):return
 raise AssertionError('unsafe configuration admitted: '+case)
if case=='native-defaults':assert len(audit())==64
elif case=='native-root':config['RootDir']='/';assert len(audit())==64
elif case=='weak-key':config['APT::Key::Assert-Pubkey-Algo']='>=rsa1024';denied(audit)
elif case=='unknown-key':config['APT::Key::Custom']='yes';denied(audit)
elif case=='empty-key':config['APT::Key::Assert-Pubkey-Algo']='';denied(audit)
elif case=='weak-future-key':config['APT::Key::Assert-Pubkey-Algo::Future']='>=rsa1024';denied(audit)
elif case=='rootdir':config['RootDir']='/tmp/elsewhere';denied(audit)
elif case=='config-parts':config['Dir::Etc::parts']='other';denied(audit)
elif case=='config-binary-visible':config['Binary::apt-config::Acquire::Check-Date']='true';denied(audit)
elif case=='config-hidden-subtree':
 # Native MoveSubTree can remove the apt-config prefix before dump. Refuse
 # original fragments before executing apt-config instead of trusting that DTO.
 called=[];m.run=lambda args:called.append(args)
 m.configuration_files=lambda:{'/etc/apt/apt.conf':'Binary { "apt-config" { Dir::Etc::sourcelist "sources.list"; }; };'}
 denied(lambda:m.configuration(Path('/tmp/synthetic')));assert called==[]
elif case=='config-adjacent-comment':denied(lambda:m.checked_fragments({'a':'Binary/* native comment */ { apt-config { Dir::Etc "other"; }; };'}))
elif case=='config-comments':assert m.checked_fragments({'a':'// binary packages\n/* Binary { apt-config {}; }; */\nAPT::Install-Recommends "0";'})
elif case=='config-include':denied(lambda:m.checked_fragments({'a':'#include "/other.conf";'}))
elif case=='config-clear':denied(lambda:m.checked_fragments({'a':'#clear Binary;'}))
elif case=='mirror-label':sources[mirror]+='https://archive.ubuntu.com/ubuntu/\ttrusted:yes\n';denied(audit)
elif case=='mirror-user':sources[mirror]+='https://user:pass@archive.ubuntu.com/ubuntu/\n';denied(audit)
elif case=='mirror-scheme':sources[mirror]+='file:/tmp/other\n';denied(audit)
elif case=='mirror-empty':sources[mirror]='# nothing';denied(audit)
elif case=='mirror-path':sources[source]=sources[source].replace('apt-mirrors.txt','../apt-mirrors.txt');denied(audit)
elif case=='mirror-missing':del sources[mirror];denied(audit)
elif case=='mirror-fingerprint':before=audit();sources[mirror]+='# changed exact bytes\n';assert audit()!=before
elif case.startswith('continuation'):
 sources[source]=sources[source].replace('URIs: mirror+file:/etc/apt/apt-mirrors.txt','URIs: https://archive.ubuntu.com/ubuntu/\n https://security.ubuntu.com/ubuntu/').replace('Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg','Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg\n /usr/share/keyrings/other.gpg')
 if case=='continuation-legal':assert len(audit())==64
 elif case=='continuation-scheme':sources[source]=sources[source].replace(' https://security.ubuntu.com/ubuntu/',' file:/tmp/repo');denied(audit)
 elif case=='continuation-user':sources[source]=sources[source].replace(' https://security.ubuntu.com/ubuntu/',' https://user:pass@security.ubuntu.com/ubuntu/');denied(audit)
 elif case=='continuation-signed-by':sources[source]+='\n https://other.invalid/key';denied(audit)
 elif case=='continuation-orphan':sources[source]=' file:/tmp/repo\n'+sources[source];denied(audit)
elif case.startswith('archive-'):
 uri='mirror+file:/etc/apt/apt-mirrors.txt/pool/fonts.deb';sha='a'*64;metadata='Package: fonts\nVersion: 1\nArchitecture: all\nSize: 10\nSHA256: '+sha+'\nFilename: pool/fonts.deb'
 if case=='archive-path':uri='mirror+file:/etc/apt/other.txt/pool/fonts.deb'
 if case=='archive-traversal':uri='mirror+file:/etc/apt/apt-mirrors.txt/%2e%2e/pool/fonts.deb'
 if case=='archive-missing-manifest':del sources[mirror]
 if case=='archive-weak':sha='b'*64
 def resolve():return m.resolve_archives("'"+uri+"' fonts.deb 10 SHA256:"+sha,metadata,'amd64',sources)
 if case=='archive-legal':assert resolve()[0]['uri']==uri
 else:denied(resolve)
elif case.startswith('file-'):
 with tempfile.TemporaryDirectory() as temporary:
  root=Path(temporary).resolve();p=root/'manifest';p.write_bytes(b'https://archive.ubuntu.com/ubuntu/\tpriority:1\r\n')
  if case=='file-regular':assert m.read_regular(p).endswith('\r\n')
  elif case=='file-symlink':link=root/'link';link.symlink_to(p);denied(lambda:m.read_regular(link))
  elif case=='file-parent-symlink':directory=root/'sub';directory.mkdir();link=root/'linked';link.symlink_to(directory,target_is_directory=True);q=directory/'file';q.write_text('x');denied(lambda:m.read_regular(link/'file'))
  elif case=='file-fifo':p.unlink();os.mkfifo(p);denied(lambda:m.read_regular(p))
  elif case=='file-hardlink':q=root/'link';q.hardlink_to(p);denied(lambda:m.read_regular(p))
else:raise AssertionError(case)
print('CONTROLLED Ubuntu24/APT2.8.1 '+case+' PASS; hosted NOT_RUN')
`;
for(const scenario of ['native-defaults','native-root','weak-key','unknown-key','empty-key','weak-future-key','rootdir','config-parts','config-binary-visible','config-hidden-subtree','config-adjacent-comment','config-comments','config-include','config-clear','mirror-label','mirror-user','mirror-scheme','mirror-empty','mirror-path','mirror-missing','mirror-fingerprint','continuation-legal','continuation-scheme','continuation-user','continuation-signed-by','continuation-orphan','archive-legal','archive-path','archive-traversal','archive-missing-manifest','archive-weak','file-regular','file-symlink','file-parent-symlink','file-fifo','file-hardlink'])test('hosted font compatibility: '+scenario,()=>{
 execFileSync(process.env.PYTHON||'python3',['-c',compatibilityControl,fileURLToPath(new URL('../scripts/prepare-browser-fonts.py',import.meta.url)),scenario],{encoding:'utf8',stdio:'pipe',timeout:5000});
});
