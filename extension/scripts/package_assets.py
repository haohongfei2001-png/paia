"""The release allowlist, shared by formal packaging and internal build generation."""
from pathlib import Path
import re

DOCS = ('README.md', 'PRODUCT.md', 'ARCHITECTURE.md', 'ROADMAP.md', 'SYNC_CONTRACT.md',
        'AGENTS.md', 'PRIVACY.md', 'PRODUCT_SPEC.md', 'TEST_PLAN.md',
        'TEST_RESULTS.md', 'DECISIONS.md', 'TIME_METADATA_INVESTIGATION.md')
RUNTIME_DIRS = ('adapter', 'content', 'background', 'core', 'ui', 'icons')


def release_files(root):
    root = Path(root).resolve()
    files = [root / name for name in ('manifest.json', *DOCS)]
    files.extend(root / name for name in ('BACKUP.md','HISTORY_COMPLETION.md','AI_MEMORY.md', 'AI_CONTEXT.md', 'INTELLIGENCE.md', 'READING_CLOSURE.md', 'V0120_RELEASE.md') if (root / name).is_file())
    for folder in RUNTIME_DIRS:
        files.extend(sorted(p for p in (root / folder).rglob('*')
                            if p.is_file() and p.suffix in ('.js', '.html', '.css', '.png', '.svg')))
    for path in files:
        if path.is_symlink() or not path.is_file() or not path.resolve().is_relative_to(root):
            raise RuntimeError('Unsafe or missing release asset')
        if path.suffix in ('.js', '.html') and re.search(
                r'development-reload|paia-development|Reload development extension|runtime\s*\.\s*reload\s*\(',
                path.read_text()):
            raise RuntimeError('Development reload must not enter a release package')
    return files