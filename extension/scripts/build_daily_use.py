"""Build audited v0.8.1 internal and release artifacts; deployment is separate."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from build_internal import build_internal
from package_assets import release_files
import check_package

ROOT = Path(__file__).resolve().parents[1]
NAME = 'PAIA-v0.8.1-daily-use-reliability'
LABEL = 'v0.8.1 Daily Use, Reading Experience & Reliability'


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sub_once(path, pattern, replacement):
    text, count = re.subn(pattern, replacement, path.read_text(), flags=re.S)
    if count != 1:
        raise RuntimeError('Release transform drift: ' + path.name + ' / ' + pattern)
    path.write_text(text)


def cut(path, start, end):
    text = path.read_text()
    a, b = text.index(start), text.index(end, text.index(start))
    path.write_text(text[:a] + text[b:])


def build_release(source, target):
    source, target = Path(source).resolve(), Path(target).resolve()
    if target == source or target.is_relative_to(source / 'ui'):
        raise ValueError('Release output must be separate')
    target.mkdir(parents=True, exist_ok=True)
    if any(target.iterdir()):
        raise ValueError('Release output must be empty')
    for path in release_files(source):
        output = target / path.relative_to(source)
        output.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(path, output)
    # Remove capture probing controls and legacy job controls from the release.
    # Ordinary read-only error details and the user-requested usage audit remain.
    sub_once(target/'ui/popup.html', r'    <details><summary>捕获诊断</summary>.*?</details>', '')
    sub_once(target/'ui/popup.js', r"import \{ briefStructure \} from './structure-diagnostics.js';\n", '')
    cut(target/'ui/popup.js', "    $('diagnostic-status')", '\n  } catch')
    sub_once(target/'ui/archive.html', r'<details id="diagnostics">.*?</details>', '<section aria-label="捕获设置"><p id="enabled-state"></p><button id="toggle-capture">暂停捕获</button><p id="storage-usage"></p></section>')
    sub_once(target/'ui/archive.html', r'<details id="filter-advanced">.*?</details>', '')
    sub_once(target/'ui/archive.html', r'<button id="library-organizer-jobs">.*?</button>', '')
    sub_once(target/'ui/archive.js', r"import \{formatStructure\} from './structure-diagnostics.js';\n", '')
    sub_once(target/'ui/archive.js', r"\$\('structure-summary'\).textContent=formatStructure\(state.diagnostics.structure,state.diagnostics.structureAt\);", '')
    cut(target/'ui/archive.js', "$('diagnostic-summary').textContent=", "$('storage-usage').textContent=")
    sub_once(target/'ui/smart-filter.js', r"  setInterval\(\(\)=>\{if\(!\$\('settings-panel'\).hidden\)void this.diagnostics\(\);\},2000\);\n", '')
    sub_once(target/'ui/smart-filter.js', r"  \$\('filter-advanced'\)\?\.addEventListener\('toggle',\(\)=>void this.diagnostics\(\)\);\n", '')
    sub_once(target/'ui/smart-filter.js', r' async diagnostics\(\)\{.*?\n async home\(', ' async diagnostics(){}\n async home(')
    sub_once(target/'ui/library-updates.js', r"\$\('library-organizer-jobs'\).addEventListener\('click',\(\)=>void this.jobs\(\)\);", '')
    cut(target/'background/service-worker.js', 'import { ResponseDiagnostics }', 'import { OrganizerStore')
    sub_once(target/'background/service-worker.js', r'  const responseUI =.*?  if \(!ui && !content\)', "  if (content && request.type === 'RESPONSE_POLL') return {arm:false,fingerprintAllowed:false};\n  if (!ui && !content)")
    sub_once(target/'background/service-worker.js', r"    case 'FILTER_DIAGNOSTICS': return store.filterDiagnostics\(\);\n", '')
    for name in ['ui/response-time.html','ui/response-time.js','ui/response-time.css','ui/structure-diagnostics.js','ui/fingerprint-display.js','ui/source-time-display.js','background/response-diagnostics.js']:
        (target/name).unlink()
    return target


def package(output):
    node = os.environ.get('PAIA_NODE', 'node')
    subprocess.run([node, 'scripts/compatibility-gate.mjs', '--sampler'], cwd=ROOT, check=True)
    reports = {name: json.loads((ROOT / ('work/'+path)).read_text()) for name, path in {
        'daily':'v081-daily-e2e/acceptance.json','backup':'v081-backup-e2e/acceptance.json',
        'longTerm':'v081-long-term/acceptance.json','migration':'v081-migration-e2e/migration.json',
        'governance':'v081-governance-e2e/acceptance.json','release':'v081-release-e2e/acceptance.json',
        'secondError':'v081-bounded-e2e/second-error.json','restart':'v081-bounded-e2e/restart.json',
        'pageClose':'v081-bounded-e2e/page-close.json'}.items()}
    for name, report in reports.items():
        assert report['syntheticOnly'], name
        assert not report.get('errors') and report.get('externalRequests',0)==0, name
    assert reports['migration']['sameExtensionId'] and reports['migration']['idempotent']
    output = Path(output).resolve()
    if output == ROOT or output.is_relative_to(ROOT/'core') or output.is_relative_to(ROOT/'ui'):
        raise ValueError('Unsafe output directory')
    output.mkdir(parents=True,exist_ok=True)
    revision = subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT,text=True).strip()
    artifacts = []
    for kind in ('internal','release'):
        target = output/(NAME+'-'+kind)
        if target.exists():
            raise ValueError('Refuse existing artifact')
        (build_internal if kind=='internal' else build_release)(ROOT,target)
        path=target/'manifest.json'
        manifest=json.loads(path.read_text())
        manifest['version_name']=LABEL+(' internal' if kind=='internal' else '')
        path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
        if kind=='release':
            check_package.ROOT=target;check_package.ERRORS.clear();check_package.CHECKS=0
            if check_package.main():
                raise RuntimeError('Release audit failed')
        files=sorted(p for p in target.rglob('*') if p.is_file())
        assert not any('fixtures' in p.parts or 'tests' in p.parts or 'node_modules' in p.parts for p in files)
        assert (target/'ui/development-reload.js').exists()==(kind=='internal')
        hashes={str(p.relative_to(target)):digest(p) for p in files}
        archive=Path(str(target)+'.zip')
        with ZipFile(archive,'w',ZIP_DEFLATED) as z:
            for p in files:z.write(p,Path(target.name)/p.relative_to(target))
        with ZipFile(archive) as z:
            assert z.testzip() is None and len(z.namelist())==len(files)
            for p in files:assert z.read(str(Path(target.name)/p.relative_to(target)))==p.read_bytes()
        sha=digest(archive)
        Path(str(archive)+'.sha256').write_text(sha+'  '+archive.name+'\n')
        artifacts.append({'kind':kind,'directory':str(target),'zip':str(archive),'zipSha256':sha,'files':hashes})
    report={'checkpoint':revision,'version':manifest['version'],'artifacts':artifacts,'releaseScope':'Isolated synthetic Chrome validated. Live DeepSeek and private daily database are not accessed.'}
    (output/(NAME+'-artifacts.json')).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'sourceCommit':revision,'artifacts':[{k:a[k] for k in ['kind','directory','zip','zipSha256']} for a in artifacts]},indent=2))

if __name__=='__main__':
    if len(sys.argv)!=2:raise SystemExit('Usage: build_daily_use.py OUTPUT_DIRECTORY')
    package(sys.argv[1])
