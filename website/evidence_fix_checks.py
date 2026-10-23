"""Three proven copy corrections; restoration checks reject unrelated redesign.

The old frozen comparisons remain in force after reversing ONLY the declared
label, sentence-space, Help answer and cache-token changes. New positive checks
assert that the corrected production copy is present before normalizing it.
"""
import hashlib,json,re
from pathlib import Path
from functools import lru_cache

@lru_cache(maxsize=1)
def scope():
    return json.loads(Path(__file__).with_name('evidence_fix_scope.json').read_text())

def restore_confirmed_edits(name,data):
    config=scope();text=data.decode('utf-8') if name.endswith(('.html','.py','.js')) else None
    if text is None:return data
    if name in config['source_patches']:
        for before,after in reversed(config['source_patches'][name]['replacements']):
            text=text.replace(after,before)
    elif name.endswith('.html'):
        pattern=r'<a data-install-entry="pending" ([^>]*href="(?:/zh)?/download\.html"[^>]*)>(获取 PAIA|Get PAIA)( <span aria-hidden="true">→</span></a>)'
        text=re.sub(pattern,lambda m:'<a '+m[1]+'>'+('添加到 Chrome' if m[2]=='获取 PAIA' else 'Add to Chrome')+m[3],text)
        # The inherited presentation renderer removes non-presentation data
        # attributes inside the homepage. Its two plain primary links remain
        # exact, scoped string exceptions; every other byte is still checked.
        if Path(name).name=='index.html':
            prefix='/zh/' if name.startswith('zh/') else '/'
            before,after=('添加到 Chrome','获取 PAIA') if prefix=='/zh/' else ('Add to Chrome','Get PAIA')
            opening='<a class="button" href="'+prefix+'download.html">'
            text=text.replace(opening+after+' <span',opening+before+' <span')
        text=text.replace('Reuse it.<br> Begin with what you already know.','Reuse it.<br>Begin with what you already know.')
        for before,after in config['help_copy'].values():text=text.replace(after,before)
        token='20261013p' if Path(name).name=='index.html' else '20261013c'
        text=text.replace('site.js?v='+config['cache_token'],'site.js?v='+token)
    return text.encode('utf-8')

def verify_confirmed_fixes(root,check):
    config=scope()
    from art_direction import Fragments
    from launch_checks import find,Text
    for name,expected in config['generated_sha256'].items():
        data=(root/name).read_bytes()
        check(hashlib.sha256(restore_confirmed_edits(name,data)).hexdigest()==expected,name+': no changes beyond the explicitly approved copy corrections')
        if not name.endswith('.html'):continue
        p=Fragments(data.decode());entries=find(p,'[data-install-entry]')
        check(bool(entries),name+': pending install links use an honest entry label')
        for entry in entries:
            check(entry.attrs.get('href') in ('/download.html','/zh/download.html'),name+': original installation-state destination retained')
            check(Text(p.outer(entry)).value() in ('获取 PAIA →','Get PAIA →'),name+': entry does not promise immediate installation')
    for name,record in config['source_patches'].items():
        check(hashlib.sha256(restore_confirmed_edits(name,(root/name).read_bytes())).hexdigest()==record['sha256'],name+': only declared source edits')
    for prefix in ('','zh/'):
        p=Fragments((root/prefix/'help.html').read_text());lang='zh' if prefix else 'en'
        check(config['help_copy'][lang][1] in p.source,prefix+'help.html: availability agrees with the unchanged release manifest')
        d=Fragments((root/prefix/'download.html').read_text());install=find(d,'.release-install')[0]
        check(install.tag=='button' and 'disabled' in install.attrs,prefix+'download.html: no invented installer')
    check('Reuse it.<br> Begin' in (root/'index.html').read_text(),'English mobile paragraph has a real sentence separator')
    check("button.textContent = t('复制获取链接', 'Copy link');" in (root/'assets/website/site.js').read_text(),'phone button names its actual copy action')

def verify_home_copy(page,check):
    zh=page.locator('html').get_attribute('lang').startswith('zh')
    check(page.locator('.hero-actions a').first.inner_text().split('→')[0].strip()==('获取 PAIA' if zh else 'Get PAIA'),'confirmed fixes: truthful primary label')
    if page.evaluate("matchMedia('(max-width:640px)').matches"):
        check(page.locator('.ed-desktop-link').inner_text()==('复制获取链接' if zh else 'Copy link'),'confirmed fixes: explicit phone copy label')
        if not zh:
            check('Reuse it. Begin' in page.locator('.hero-description').inner_text(),'confirmed fixes: mobile English sentences do not join')
