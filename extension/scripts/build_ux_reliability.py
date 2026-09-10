"""Build v0.9.1 from current full regression and synthetic Chrome evidence."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json
import os
import subprocess
import sys
from build_internal import build_internal
from build_daily_use import build_release
import check_package

ROOT = Path(__file__).resolve().parents[1]
NAME = 'PAIA-v0.9.1-ux-reliability'
LABEL = 'v0.9.1 UX & Reliability'
def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()
def package(output):
    subprocess.run([os.environ.get('PAIA_NODE','node'),'scripts/compatibility-gate.mjs','--sampler'],cwd=ROOT,check=True)
    reports={name:json.loads((ROOT/'work/history-v090'/name).read_text()) for name in [
        'browser.json','chrome-scale-1000.json','chrome-scale-10000.json',
        'long-term.json','performance-1000.json','performance-10000.json',
        'migration-v081.json','recovery-restart.json','recovery-cancel.json','packages.json']}
    for name,r in reports.items():
        assert r.get('syntheticOnly') or r.get('synthetic'),name
        assert not r.get('errors') and r.get('externalRequests',0)==0,name
    assert reports['migration-v081.json']['sameExtensionId']
    assert reports['chrome-scale-10000.json']['importRequests']==0
    assert reports['long-term.json']['backupRoundTrip']
    ux={n:json.loads((ROOT/'work/ux-v091'/n).read_text()) for n in ['review-reading.json','thought-actions.json','review-actions.json']}
    for r in ux.values():
        assert r['syntheticOnly'] and r['visibleChrome'] and not r['errors']
    output=Path(output).resolve()
    if output!=ROOT/'outputs/v091-artifacts':
        raise ValueError('Use the dedicated v091 artifact directory')
    output.mkdir(parents=True,exist_ok=True)
    revision=subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    manifest=json.loads((ROOT/'manifest.json').read_text())
    assert manifest['version']=='0.9.1'
    artifacts=[]
    for kind in ['internal','release']:
        target=output/(NAME+'-'+kind)
        if target.exists():raise ValueError('Refuse existing artifact')
        (build_internal if kind=='internal' else build_release)(ROOT,target)
        path=target/'manifest.json';m=json.loads(path.read_text());m['version_name']=LABEL+(' internal' if kind=='internal' else '');path.write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
        check_package.ROOT=target;check_package.ERRORS.clear();check_package.CHECKS=0
        assert check_package.main()==0
        files=sorted(p for p in target.rglob('*') if p.is_file())
        assert not any('fixtures' in p.parts or 'tests' in p.parts or 'node_modules' in p.parts for p in files)
        assert (target/'ui/development-reload.js').exists()==(kind=='internal')
        assert (target/'core/import/provider.js').is_file()
        assert (target/'ui/onboarding.js').is_file()
        hashes={str(p.relative_to(target)):digest(p) for p in files}
        archive=Path(str(target)+'.zip')
        with ZipFile(archive,'w',ZIP_DEFLATED) as z:
            for p in files:z.write(p,Path(target.name)/p.relative_to(target))
        with ZipFile(archive) as z:
            assert z.testzip() is None and len(z.namelist())==len(files)
            for p in files:assert z.read(str(Path(target.name)/p.relative_to(target)))==p.read_bytes()
        sha=digest(archive);Path(str(archive)+'.sha256').write_text(sha+'  '+archive.name+'\n')
        artifacts.append({'kind':kind,'directory':str(target),'zip':str(archive),'zipSha256':sha,'zipBytes':archive.stat().st_size,'files':hashes})
    receipt={'sourceCommit':revision,'version':'0.9.1','realExportVerified':False,'artifacts':artifacts}
    (output/(NAME+'-artifacts.json')).write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'sourceCommit':revision,'artifacts':[{k:a[k] for k in ['kind','directory','zip','zipSha256','zipBytes']} for a in artifacts]},indent=2))
if __name__=='__main__':
    if len(sys.argv)!=2:raise SystemExit('Usage: build_ux_reliability.py OUTPUT_DIRECTORY')
    package(sys.argv[1])
