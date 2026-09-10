from pathlib import Path
import sys,json,hashlib,re,contextlib,io
from zipfile import ZipFile
base=Path(__file__).resolve().parents[1];sys.path.insert(0,str(base/'scripts'));import check_package
root=base/'outputs/PAIA-v0.7.0-foundation-release-structure';check_package.ROOT=root
log=io.StringIO()
with contextlib.redirect_stdout(log):result=check_package.main()
assert result==0,log.getvalue()
m=json.loads((root/'manifest.json').read_text());source=json.loads((base/'manifest.json').read_text());assert m['permissions']==['storage'];assert 'host_permissions' not in m;assert m['content_security_policy']==source['content_security_policy'];assert "connect-src 'none'" in m['content_security_policy']['extension_pages']
files={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(root.rglob('*')) if p.is_file()}
for name in files:assert not re.search(r'(^|/)(tests|fixtures|development)/|development-reload|response-diagnostics|structure-diagnostics|fingerprint-display|source-time-display|ui/response-time\.',name),name
runtime='\n'.join((root/n).read_text() for n in files if n.endswith('.js'))
for forbidden in ['DeterministicFixtureProvider','MockOrganizerProvider','runtime.reload(', 'openaiApiKey','api.openai.com','api.anthropic.com']:assert forbidden not in runtime,forbidden
assert 'productionProviders=Object.freeze([])' in (root/'core/organizer/contracts.js').read_text()
receipts=json.loads((base/'outputs/v070-m5-artifacts.json').read_text());assert len({r['archive'] for r in receipts})==2
for r in receipts:
 archive=base/'outputs'/r['archive'];assert hashlib.sha256(archive.read_bytes()).hexdigest()==r['sha256'];target=base/'outputs'/('PAIA-v0.7.0-foundation-'+r['kind'])
 with ZipFile(archive) as z:
  assert z.testzip() is None
  expected={str(Path(target.name)/p.relative_to(target)) for p in target.rglob('*') if p.is_file()};assert set(z.namelist())==expected
  for p in target.rglob('*'):
   if p.is_file():assert z.read(str(Path(target.name)/p.relative_to(target)))==p.read_bytes()
receipt={'passed':True,'audit':log.getvalue(),'version':m['version'],'permissions':m['permissions'],'hostPermissions':[],'connectSrc':'none','productionProviderRegistryEmpty':True,'credentialDurableSecrets':False,'diagnosticUIRemoved':True,'fixturesAbsent':True,'selfReloadAbsent':True,'telemetryAdded':False,'distinctZipNames':True,'zipByteComparison':True,'fileSha256':files}
(base/'outputs/v070-m5-release-audit.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2)+'\n');print(log.getvalue())
