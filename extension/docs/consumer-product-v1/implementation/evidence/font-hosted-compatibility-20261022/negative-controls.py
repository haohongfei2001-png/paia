import importlib.util,sys
from copy import deepcopy

def load(path):
 s=importlib.util.spec_from_file_location('fonts',path);m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
base={'Dir':'/','Dir::Etc':'etc/apt','Dir::Etc::sourcelist':'sources.list','Dir::Etc::sourceparts':'sources.list.d','Dir::Etc::trusted':'trusted.gpg','Dir::Etc::trustedparts':'trusted.gpg.d','Dir::Etc::main':'apt.conf','Dir::Etc::parts':'apt.conf.d'}
sources={'/etc/apt/sources.list.d/ubuntu.sources':'Types: deb\nURIs: https://archive.ubuntu.com/ubuntu/\nSuites: noble\nComponents: main\nSigned-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg'}
m=load(sys.argv[1]);reference=load(sys.argv[2]);fail=0
for case,want in [('native-defaults',True),('mirror',True),('rootdir',False),('continuation-scheme',False),('continuation-user',False),('binary-config',False)]:
 c=deepcopy(base);s=deepcopy(sources)
 if case=='native-defaults':c.update(reference.KEY_DEFAULTS)
 if case=='mirror':s[next(iter(s))]=s[next(iter(s))].replace('https://archive.ubuntu.com/ubuntu/',reference.MIRROR_URI);s[reference.MIRROR_PATH]='https://archive.ubuntu.com/ubuntu/ priority:1\n'
 if case=='rootdir':c['RootDir']='/tmp/other'
 if case.startswith('continuation'):s[next(iter(s))]=s[next(iter(s))].replace('Suites:',(' file:/tmp/repo' if case.endswith('scheme') else ' https://user:pass@example.invalid/ubuntu')+'\nSuites:')
 if case=='binary-config':c['Binary::apt-config::Acquire::Check-Date']='true'
 try:m.checked_configuration('\n'.join(k+' "'+v+'";' for k,v in c.items()),s);got=True;detail='admitted'
 except ValueError as e:got=False;detail=str(e)
 ok=got==want;fail+=not ok
 print(('PASS' if ok else 'FAIL'),case,'expected_admitted='+str(want),'actual='+str(got),detail)
print('CONTROLLED regression:',6-fail,'/6; no APT/network/install')
sys.exit(bool(fail))
