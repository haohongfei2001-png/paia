"""Product-only distribution gate; inspect emitted files, never a user profile."""
from pathlib import Path
import json
import sys

def check_release(target):
    target=Path(target)
    files=[p for p in target.rglob('*') if p.is_file()]
    rel_files={str(p.relative_to(target)) for p in files}
    current_docs={'README.md','PRODUCT.md','ARCHITECTURE.md','ROADMAP.md','SYNC_CONTRACT.md','REMOTE_OBJECT_PROTOCOL.md'}
    assert current_docs <= rel_files, sorted(current_docs-rel_files)
    forbidden_paths={'ui/development-reload.js','ui/response-time.html','ui/response-time.js','ui/response-time.css','ui/structure-diagnostics.js'}
    assert not any(str(p.relative_to(target)) in forbidden_paths or set(p.relative_to(target).parts)&{'experiments','tests','fixtures','development','node_modules','.git'} for p in files)
    markers=['globalThis.contextSyntheticScale','DEV_ONLY','globalThis.memorySyntheticScale','globalThis.syntheticMemory','globalThis.v092Synthetic','globalThis.v092Scale','synthetic generator','sensitive debug dump','development-reload','data-paia-development']
    for p in files:
        if p.suffix in {'.js','.html'}:
            text=p.read_text()
            assert not any(m in text for m in markers),p
    html=(target/'ui/archive.html').read_text()
    for id in ['diagnostics','filter-advanced','library-organizer-jobs']:
        assert 'id="'+id+'"' not in html,id
    assert 'id="integrity-check"' in html
    assert 'id="product-diagnostics"' in html and '<details id="product-diagnostics" open' not in html
    if (target/'ui/memory.js').exists():
        for id in ['memory-authorizations','memory-builder','memory-preview','memory-copy','memory-markdown']:
            assert 'id="'+id+'"' in html,id
        assert 'navigator.clipboard.read' not in (target/'ui/memory.js').read_text()
    manifest=json.loads((target/'manifest.json').read_text())
    assert manifest['permissions']==['storage']
    assert manifest['host_permissions']==['https://api.deepseek.com/*']
    assert "connect-src https://api.deepseek.com;" in manifest['content_security_policy']['extension_pages']
    print('RELEASE_PRODUCT_GUARD_PASS',len(files),'files')
if __name__=='__main__':
    check_release(sys.argv[1])
