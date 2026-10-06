"""Product-only distribution gate; inspect emitted files, never a user profile."""
from pathlib import Path
import json
import sys

def check_release(target):
    target=Path(target)
    files=[p for p in target.rglob('*') if p.is_file()]
    rel_files={str(p.relative_to(target)) for p in files}
    current_docs={'README.md','PRODUCT.md','ARCHITECTURE.md','ROADMAP.md','SYNC_CONTRACT.md','REMOTE_OBJECT_PROTOCOL.md','TRUSTED_DEVICE_PROTOCOL.md','SECURE_KEY_PERSISTENCE.md','ACCOUNT_DEVICE_SERVICE.md'}
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
    popup=(target/'ui/popup.html').read_text()
    assert 'popup-internal-tools' not in popup
    assert 'diagnostic-status' not in (target/'ui/popup.js').read_text()
    assert 'material-workbench[data-mode=' not in (target/'ui/reuse.css').read_text()
    assert 'id="integrity-check"' in html
    assert 'id="product-diagnostics"' in html and '<details id="product-diagnostics" open' not in html
    # The consumer build retains privacy/revocation, never retired product UI.
    for id in ['memory-authorizations','memory-profile-form','memory-builder','memory-preview','memory-copy','memory-markdown','deepseek-api-key','backup-create','backup-create-segmented','archive-root-export-json','archive-root-export-markdown']:
        assert 'id="'+id+'"' not in html,id
    controller=(target/'ui/context-workspace.js').read_text()
    assert 'FEATURE_UNAVAILABLE' in controller
    assert "this.rpc('compile')" not in controller and "this.rpc('confirmReview'" not in controller
    assert not (target/'ui/material-tray.js').exists()
    assert 'navigator.clipboard' not in controller
    assert 'navigator.clipboard' not in (target/'ui/memory.js').read_text()
    assert 'new DeepSeekSessionCredentials' not in (target/'background/service-worker.js').read_text()
    assert 'assertFeatureAvailable(request)' in (target/'background/service-worker.js').read_text()
    for retired in ['core/product-signals.js','background/organizer-network.js','background/response-diagnostics.js']:
        assert retired not in rel_files, retired
    provider=(target/'core/organizer/deepseek.js').read_text()
    assert 'class DeepSeekOrganizerProvider' not in provider and 'class DeepSeekSessionCredentials' not in provider
    assert 'fetchImpl' not in provider and 'api.deepseek.com' not in provider
    manifest=json.loads((target/'manifest.json').read_text())
    assert manifest['permissions']==['storage','scripting']
    assert manifest['optional_permissions']==['nativeMessaging']
    assert manifest['host_permissions']==['https://chatgpt.com/*']
    assert "connect-src 'none';" in manifest['content_security_policy']['extension_pages']
    adapter=(target/'core/macos-native-secure-store.js').read_text()
    assert "const HOST_NAME='com.paia.secure_store';" in adapter
    assert adapter.count('sendNativeMessage(')==1
    assert 'connectNative(' not in adapter
    assert 'SECURE_NATIVE_MESSAGING_PERMISSION_REQUIRED' in adapter
    assert 'requestMacOSNativeSecureStorePermission' in adapter
    print('RELEASE_PRODUCT_GUARD_PASS',len(files),'files')
if __name__=='__main__':
    check_release(sys.argv[1])