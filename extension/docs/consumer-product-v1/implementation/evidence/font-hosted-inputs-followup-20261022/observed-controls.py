
import importlib.util,sys,hashlib,json
from pathlib import Path
spec=importlib.util.spec_from_file_location('fonts',sys.argv[1]);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
directory=Path(sys.argv[2]);case=sys.argv[3];expected=json.loads((directory/'provenance.json').read_text())['files']
fragments={r['installedPath']:(directory/name).read_bytes().decode('utf-8') for name,r in expected.items()}
for name,r in expected.items():assert hashlib.sha256((directory/name).read_bytes()).hexdigest()==r['sha256']
def deny(fn):
 try:fn()
 except ValueError:return
 raise AssertionError('unsafe fragment admitted: '+case)
if case in expected:
 path=expected[case]['installedPath'];assert m.checked_fragments({path:fragments[path]})=={path:fragments[path]}
elif case=='all-six':assert m.checked_fragments(fragments)==fragments
elif case=='hash-inline':assert m.checked_fragments({'a':'APT::Install-Recommends "0"; # ordinary comment\n# kernels\n# (out-of-tree) modules\n'})
elif case=='quoted-hash':assert m.checked_fragments({'a':'DPkg::Post-Invoke { "echo #literal"; };'})
elif case=='include':deny(lambda:m.checked_fragments({'a':'#include "/other";'}))
elif case=='clear':deny(lambda:m.checked_fragments({'a':'#clear Binary;'}))
elif case=='configure-index':deny(lambda:m.checked_fragments({'a':'#x-apt-configure-index "other";'}))
elif case=='after-comment':deny(lambda:m.checked_fragments({'a':'# ordinary\nBinary::apt-config::Dir::Etc "other";'}))
elif case=='adjacent-comment':deny(lambda:m.checked_fragments({'a':'# comment\nBinary/*comment*/::apt-get::Acquire::Check-Date "false";'}))
elif case=='changed-cli':
 path='/etc/apt/apt.conf.d/20snapd.conf';deny(lambda:m.checked_fragments({path:fragments[path]+'\nBinary::apt-get::Acquire::Check-Date "false";'}))
elif case=='renamed-cli':deny(lambda:m.checked_fragments({'/etc/apt/apt.conf.d/other':fragments['/etc/apt/apt.conf.d/20snapd.conf']}))
elif case=='additional-binary':deny(lambda:m.checked_fragments({**fragments,'/etc/apt/apt.conf.d/other':'Binary::apt-config::Dir::Etc "other";'}))
elif case=='cli-byte-change':
 path='/etc/apt/apt.conf.d/20apt-esm-hook.conf';deny(lambda:m.checked_fragments({path:fragments[path]+'\n'}))
elif case=='process-policy':
 opts=m.apt_options(Path('/tmp/state'));pairs=dict(opts[i+1].split('=',1) for i,v in enumerate(opts) if v=='-o')
 assert pairs['APT::Key::Assert-Pubkey-Algo']=='>=rsa2048,ed25519,ed448,nistp256,nistp384,nistp512,brainpoolP256r1,brainpoolP320r1,brainpoolP384r1,brainpoolP512r1,secp256k1'
 assert pairs['APT::Key::Assert-Pubkey-Algo::Next']=='>=rsa2048,ed25519,ed448,nistp256,nistp384,nistp512'
 assert pairs['APT::Key::Assert-Pubkey-Algo::Future']=='>=rsa3072,ed25519,ed448'
else:raise AssertionError(case)
print('CONTROLLED observed Ubuntu24/APT2.8.3 '+case+' PASS; corrected hosted NOT_RUN')
