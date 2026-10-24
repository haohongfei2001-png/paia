"""V13 static shell plus owner-requested official spatial enhancement.
The no-JS shell remains exact. Actual browser tests target the rendered shadow
content through spatial_home_checks, not the hidden fallback. All independent
product-demo, IME, permission, support and publication tests remain unchanged.
"""
from pathlib import Path
import hashlib,json,re

def static(root,check):
    lock=json.loads((root/'website/atelier/preserved-v13.json').read_text())
    for path,digest in lock['files'].items():
        check(hashlib.sha256((root/path).read_bytes()).hexdigest()==digest,'V13 unchanged exact: '+path)
    from art_direction import Fragments
    from launch_checks import find
    for lang,prefix in [('zh','zh/'),('en','')]:
        text=(root/(prefix+'index.html')).read_text();parsed=Fragments(text)
        check('data-atelier-version="13"' in text,prefix+': exact no-script homepage shell')
        check('presentation15.js?v=20261024-v15' in text and 'presentation13.js?' not in text,prefix+': immutable V15 shell entry avoids stale V13 cache')
        check('data-website-release="atelier-v15-20261024"' in text,prefix+': deployed release identity is current')
        check('world13.css' in text,prefix+': prior shell styling retained')
        for selector,digest in lock['home_fragments'][lang].items():
            nodes=find(parsed,selector)
            check(len(nodes)==1 and hashlib.sha256(parsed.outer(nodes[0]).encode()).hexdigest()==digest,prefix+': retained approved '+selector)
        check(text.count('data-story="')==3,prefix+': complete archive/thought/reuse fallback')
        check(text.count('data-topic-art="')==3,prefix+': fallback has actual topic directories')
        check(text.count('class="p13-thought-entry"')==2,prefix+': complete two-input fallback Section')
        check('class="p10-daily-scene"' not in text and 'id="daily-title"' in text,prefix+': minor details remain subordinate')
        check('/demo.html#topic-reader' in text,prefix+': topic link retains exact destination')
        check(not any(x in text for x in ['data-topic-search','data-open-source','data-view-source','data-reading-style']),prefix+': retired source/search/actions stay absent')
    code=(root/'assets/website/atelier/presentation15.js').read_text()
    check(code==(root/'assets/website/atelier/presentation13.js').read_text(),'V15 release entry preserves already verified behavior exactly')
    check(not re.search(r'\b(fetch|XMLHttpRequest|WebSocket|sendBeacon)\s*\(',code),'shell has no data transport')
    check('localStorage' not in code and 'sessionStorage' not in code,'shell has no persistence')
    check(all(x in code for x in ['subjectVisible','visibilitychange','prefers-reduced-motion','manualFloat=true']),'visibility and R3 ownership retained')
    check("el.dataset.story!=='thoughts'" in code,'old thought timer does not compete with native spatial scroll')
    check('spatial-folio15.js' in code and "dataset.spatial15='fallback'" in code,'homepage enables V15 with original semantic fallback')
    spatial=(root/'assets/website/atelier/spatial-folio15.js').read_text()
    css=(root/'assets/website/atelier/thought15.css').read_text()
    structure=(root/'assets/website/atelier/thought15.html').read_text()
    check("['thought15.html','thought15.css']" in spatial,'only fixed own-origin presentation assets')
    check("credentials:'omit'" in spatial and 'AbortController' in spatial,'public design assets omit credentials and time out')
    check(not re.search(r'\b(localStorage|sessionStorage|XMLHttpRequest|WebSocket|sendBeacon)\b',spatial),'no private storage or active data channel')
    check('attachShadow' in spatial and "host.style.padding='0'" in spatial,'V15 mounted on exact official section')
    check('eval(' not in spatial and 'new Function' not in spatial,'no execution of fetched text')
    check('pa15-story' in structure and '.pa15-stage' in css,'V15 complete design source')
    check((root/'design/thought-space/index.html').exists(),'previous isolated study remains available')

def home(page,check,label,deep=False,out=None):
    from spatial_folio15_checks import home as verify_rendered_home
    return verify_rendered_home(page,check,label,deep,out)
