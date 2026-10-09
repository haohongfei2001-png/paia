"""Shared real-browser journeys for the fictional homepage and standalone demo.

Product-model guards survive the visual redesign: immutable sources, safe text,
explicit insertion, stable Topic readers and independent Context permissions.
The Owner-approved website scenario starts with a fictional user's grants;
it does not change any real product permission default.
These checks never certify a real extension, AI connection or cloud service.
"""
import json
from urllib.parse import urlsplit


def verify_core(page, check, en=True, download_dir=None, offline=False):
    prefix = 'EN' if en else 'ZH'
    def test(value, label):
        check(value, f'{prefix} core: {label}')
    def on(selector):
        return page.locator(selector).get_attribute('aria-pressed') == 'true'
    def permission_names():
        test(page.locator('[data-card-allow]').evaluate_all("""els=>els.every(e=>{
            const label=e.getAttribute('aria-label')||e.textContent;
            return label.includes(e.textContent.trim());
        })"""), 'permission controls keep their visible state in the accessible name')
    def open_card(key):
        page.locator(f'[data-card-open="{key}"]').click()
        test(page.locator(f'[data-card-detail="{key}"]').is_visible(), f'{key} opens its own detail')
        test(not page.locator('[data-context-overview]').is_visible(), 'detail replaces overview')
    def back(key):
        page.locator(f'[data-card-detail="{key}"] [data-context-back]').click()
        test(page.locator(f'[data-card-open="{key}"]').evaluate('e=>e===document.activeElement'), 'Back restores card focus')
    def manage_prompt(key):
        control = page.locator(f'[data-prompt-manage="{key}"]')
        if control.get_attribute('aria-expanded') != 'true':
            control.focus()
            page.keyboard.press('Enter')
        test(page.locator(f'#pc-prompt-manage-{key}').is_visible(), f'prompt {key} management opens explicitly')
        return page.locator(f'[data-prompt-row="{key}"]')
    def close_prompt(key):
        page.locator(f'#pc-prompt-{key}').focus()
        page.keyboard.press('Escape')
        test(not page.locator(f'#pc-prompt-manage-{key}').is_visible(), 'Escape closes the current prompt management')
        test(page.locator(f'[data-prompt-manage="{key}"]').evaluate('e=>e===document.activeElement'), 'closing prompt management restores its menu focus')
    def topic_open(key, section=None):
        selector = f'[data-topic-block="{key}"] h3 a' if section is None else f'[data-topic-block="{key}"] a[href="#pc-section-{section}"]'
        link = page.locator(selector)
        link.evaluate("e=>e.scrollIntoView({block:'center',behavior:'instant'})")
        # Observe the real click after Playwright's actionability/focus scrolling,
        # before the page's bubbling handler changes the Topic view.
        click_position = link.evaluate_handle("""link=>{
            const observed={scrollY:null};
            link.addEventListener('click',()=>{observed.scrollY=scrollY;},{capture:true,once:true});
            return observed;
        }""")
        try:
            link.click()
            position = click_position.evaluate('observed=>observed.scrollY')
        finally:
            click_position.dispose()
        test(page.locator(f'[data-topic-reader="{key}"]').is_visible(), f'{key} opens its continuous reader')
        test(not page.locator('[data-topic-overview]').is_visible(), 'Topic reader replaces the overview')
        test(page.locator('[data-topic-reader]:visible').count() == 1, 'only the selected Topic reader is visible')
        target = f'#pc-topic-{key}' if section is None else f'#pc-section-{section}'
        test(page.locator(target).evaluate('e=>e===document.activeElement'), 'Topic navigation focuses the requested title or Section')
        return selector, position
    def topic_back(key, origin):
        selector, position = origin
        page.locator(f'[data-topic-reader="{key}"] [data-topic-back]').click()
        test(page.locator('[data-topic-overview]').is_visible() and page.locator('[data-topic-reader]:visible').count() == 0, 'Back restores the overview and closes every reader')
        test(page.locator(selector).evaluate('e=>e===document.activeElement'), 'Topic Back restores the exact originating link')
        actual = page.evaluate('scrollY')
        restored = abs(actual - position) <= 2
        diagnostic = ''
        if not restored:
            observed = page.evaluate("""({selector,expected,actual})=>{
                const describe=el=>{if(!el)return null;const r=el.getBoundingClientRect();return {tag:el.localName,id:el.id,classes:el.className,href:el.getAttribute('href'),rect:{x:r.x,y:r.y,width:r.width,height:r.height,top:r.top,right:r.right,bottom:r.bottom,left:r.left}};};
                const scroller=document.scrollingElement||document.documentElement;
                return {expected,actual,maxScroll:Math.max(0,scroller.scrollHeight-scroller.clientHeight),currentScrollY:scrollY,viewport:{width:innerWidth,height:innerHeight},selector,focus:describe(document.activeElement),target:describe(document.querySelector(selector))};
            }""", {'selector': selector, 'expected': position, 'actual': actual})
            diagnostic = '; ' + json.dumps(observed, ensure_ascii=False)
        test(restored, 'Topic Back restores the previous scroll position' + diagnostic)

    requests = []
    host = urlsplit(page.url).netloc
    def observe_request(request):
        remote = urlsplit(request.url)
        if request.method != 'GET' or request.resource_type in ('fetch', 'xhr', 'websocket') or (remote.scheme in ('http', 'https') and remote.netloc != host):
            requests.append({'url': request.url, 'method': request.method, 'type': request.resource_type})
    page.on('request', observe_request)

    test(page.locator('[data-core-preview]').count() == 1, 'one shared product illustration')
    test(set(page.locator('.pc-nav a').evaluate_all('els=>els.map(e=>e.getAttribute("href"))')) == {'#input-library', '#prompt-reuse', '#thought-library', '#personal-context'}, 'all approved example destinations remain reachable')
    test(page.locator('[data-core-preview] img[src*="/brand/paia-logo-v1.webp"]').count() == 0, 'brand artwork is not repeated through the product scenes')
    expected_close = 0 if page.locator('body').get_attribute('data-page') == 'demo.html' else 1
    test(page.locator('.core-close img[src*="/brand/paia-logo-v1.webp"]').count() == expected_close, 'original closing brand usage retained')
    test(page.locator('[data-topic-export], [data-authorize], [data-confirm-candidate], [data-build], [data-export]').count() == 0, 'retired export and task-approval controls are absent')
    test(page.locator('[data-topic-overview]').is_visible() and page.locator('[data-topic-reader]:visible').count() == 0, 'Thought Library starts at its Topic overview')
    test(page.locator('[data-demo-permissions="pregranted"]').count() == 1, 'Context declares its fictional pre-granted scenario')
    test(page.locator('[data-card-allow][aria-pressed=true]').count() == 4 and page.locator('[data-topic-allow][aria-pressed=true]').count() == 2 and on('[data-context-global]'), 'the example user has opened four cards and both example topics')
    test(page.locator('[data-context-preview] strong').count() == 5, 'the granted overview reads the three personal cards and two complete topics')
    permission_names()

    original = page.locator('[data-original="a"]').text_content()
    independent = page.locator('[data-thought-text="note"]').text_content()
    changed = 'Example working text <img src=x onerror=alert(1)> — user-authored.'
    page.locator('[data-working="a"]').fill(changed)
    test(page.locator('[data-original="a"]').text_content() == original, 'source remains immutable')
    test(page.locator('[data-thought-text="a"]').text_content() == changed, 'whole-input reference follows working text')
    test(page.locator('[data-thought-text="a"] img').count() == 0, 'working text cannot inject HTML')
    initial_topic = topic_open('product')
    page.locator('[data-reading-style]').select_option('balanced')
    test(page.locator('[data-reading-output]').get_attribute('data-stale') == 'true', 'source edit retires preset AI reading')
    topic_back('product', initial_topic)
    page.locator('[data-archive-search]').fill('Example working text')
    test(page.locator('[data-input]:visible').count() == 3, 'Reader Find retains the complete conversation')
    test(page.locator('[data-input][data-find-match="true"]').evaluate_all('els=>els.map(e=>e.dataset.input)') == ['a'], 'Reader Find matches the current working text')
    page.locator('[data-archive-search]').press('Enter')
    test(page.locator('[data-input][data-find-current="true"]').get_attribute('data-input') == 'a', 'Enter locates the matching input without filtering')
    test(page.locator('[data-working="a"]').input_value() == changed, 'locating a match never rewrites it')
    page.locator('[data-working="a"]').fill('The matching phrase has now been edited away.')
    test(page.locator('[data-working="a"]').is_visible() and page.locator('[data-working="a"]').evaluate('e=>e===document.activeElement'), 'Find never hides the input being edited or steals editor focus')
    page.locator('[data-archive-search]').focus()
    test(page.locator('[data-input]:visible').count() == 3 and page.locator('[data-input][data-find-match="true"]').count() == 0, 'editing away a match preserves every input')
    page.locator('[data-archive-search]').fill('')
    page.locator('[data-working="a"]').fill(changed)
    page.locator('[data-archive-search]').fill('no-match-website-core-xyz')
    test(page.locator('[data-archive-empty]').is_visible() and page.locator('[data-input]:visible').count() == 3, 'no-match feedback leaves the complete conversation visible')
    test(page.locator('[data-input][data-find-match="true"], [data-input][data-find-current="true"]').count() == 0, 'no-match Find has no false match or current position')
    page.locator('[data-archive-search]').fill('')
    test(page.locator('[data-input]:visible').count() == 3 and not page.locator('[data-archive-empty]').is_visible(), 'an empty Find query restores ordinary reading')
    # A shared literal tests next/previous navigation in both locales, then all
    # edits are restored before the existing Topic and source-safety journeys.
    prior_b = page.locator('[data-working="b"]').input_value()
    page.locator('[data-working="a"]').fill(changed + ' Navigation sample.')
    page.locator('[data-working="b"]').fill(prior_b + ' Navigation sample.')
    find = page.locator('[data-archive-search]')
    find.focus()
    observed = find.evaluate_handle("""el=>{
        const result={scrollY:null};
        el.addEventListener('input',()=>{result.scrollY=scrollY;},{capture:true,once:true});
        return result;
    }""")
    try:
        find.fill('Navigation sample')
        find_origin = observed.evaluate('result=>result.scrollY')
    finally:
        observed.dispose()
    test(page.locator('[data-input][data-find-match="true"]').count() == 2 and page.locator('[data-input]:visible').count() == 3, 'Find marks multiple matches while keeping nonmatching text')
    test(page.locator('[data-find-controls]').is_visible() and '2' in page.locator('[data-find-count]').inner_text(), 'Find exposes its honest match count and navigation')
    find.press('Enter')
    current = page.locator('[data-input][data-find-current="true"]').get_attribute('data-input')
    page.locator('[data-find-next]').click()
    test(page.locator('[data-input][data-find-current="true"]').get_attribute('data-input') != current, 'Next moves to another actual match')
    page.locator('[data-find-prev]').click()
    test(page.locator('[data-input][data-find-current="true"]').get_attribute('data-input') == current, 'Previous returns to the prior match')
    find.press('Escape')
    page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
    test(find.input_value() == '' and page.locator('[data-input][data-find-match="true"], [data-input][data-find-current="true"]').count() == 0, 'Escape clears Find and its temporary location marks')
    test(find_origin is not None and abs(page.evaluate('scrollY') - find_origin) <= 2, 'Escape returns to the pre-Find reading position')
    test(page.locator('[data-working="a"]').input_value() == changed + ' Navigation sample.' and page.locator('[data-working="b"]').input_value() == prior_b + ' Navigation sample.', 'Find navigation and Escape preserve all working text')
    for exit_action in ('clear query', 'Escape from step button'):
        find.focus()
        observed = find.evaluate_handle("""el=>{
            const result={scrollY:null};
            el.addEventListener('input',()=>{result.scrollY=scrollY;},{capture:true,once:true});
            return result;
        }""")
        try:
            find.fill('Navigation sample')
            repeat_origin = observed.evaluate('result=>result.scrollY')
        finally:
            observed.dispose()
        find.press('Enter')
        page.locator('[data-find-next]').click()
        if exit_action == 'clear query':
            find.fill('')
        else:
            page.locator('[data-find-next]').press('Escape')
        page.evaluate('()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)))')
        restored_y = page.evaluate('scrollY')
        test(find.input_value() == '' and page.locator('[data-input]:visible').count() == 3 and page.locator('[data-input][data-find-match="true"], [data-input][data-find-current="true"]').count() == 0 and repeat_origin is not None and abs(restored_y - repeat_origin) <= 2 and page.locator('[data-working="a"]').input_value() == changed + ' Navigation sample.' and page.locator('[data-working="b"]').input_value() == prior_b + ' Navigation sample.', f'{exit_action} closes Find, preserves all text and returns to its reading origin ({repeat_origin}; actual {restored_y})')
    page.locator('[data-working="a"]').fill(changed)
    page.locator('[data-working="b"]').fill(prior_b)
    page.locator('[data-sort]').click()
    test(page.locator('[data-records]>article').first.get_attribute('data-input') == 'c', 'time order reverses')
    page.locator('[data-sort]').click()
    test(page.locator('[data-records]>article').first.get_attribute('data-input') == 'a', 'time order restores')

    # Ordinary rows stay quiet. Their contextual controls retain all prior edits,
    # ordering and keyboard Pin tests without exposing management by default.
    test(page.locator('[data-prompt-pick]').count() == 3, 'personal prompts are ordinary selectable rows')
    test(page.locator('.pc-prompt-management:visible').count() == 0, 'editing controls are disclosed only on request')
    test(page.locator('[data-rank]:visible').count() == 0, 'ordinary prompt rows have no ranking dashboard')
    test(not page.locator('#pc-local-suggestion').is_visible(), 'optional suggestion starts closed')
    prompt = 'A personal edited prompt, not a preset.'
    row = manage_prompt('0')
    page.locator('#pc-prompt-0').fill(prompt)
    test(page.locator('[data-prompt-pick="0"]').inner_text() == prompt, 'ordinary prompt row follows the user wording')
    close_prompt('0')
    page.locator('[data-prompt-pick="0"]').click()
    test(page.locator('#pc-composer').input_value() == prompt, 'empty composer receives the edited prompt from its row')
    row = manage_prompt('0')
    page.locator('#pc-composer').fill('An existing draft must survive.')
    row.locator('[data-insert]').click()
    test(page.locator('#pc-composer').input_value() == 'An existing draft must survive.\n\n' + prompt, 'insertion preserves existing draft')
    composer = page.locator('#pc-composer')
    preserved_draft = composer.input_value()
    before, after = 'Before.', 'After.'
    composer.fill(before + after)
    composer.focus()
    composer.evaluate("""(el,position)=>{
        el.setSelectionRange(position,position);
        el.dispatchEvent(new Event('select',{bubbles:true}));
    }""", len(before))
    row.locator('[data-insert]').click()
    test(composer.input_value() == before + '\n\n' + prompt + '\n\n' + after, 'a reliable middle caret inserts the prompt between the intact draft parts')
    insertion_end = len(before) + 2 + len(prompt)
    test(composer.evaluate('(el,end)=>el.selectionStart===end&&el.selectionEnd===end', insertion_end), 'middle insertion leaves the caret at the new prompt end before the remaining draft')
    before, selected, after = 'Keep ', 'these selected words', ' and the rest.'
    composer.fill(before + selected + after)
    composer.focus()
    composer.evaluate("""(el,range)=>{
        el.setSelectionRange(range.start,range.end);
        el.dispatchEvent(new Event('select',{bubbles:true}));
    }""", {'start': len(before), 'end': len(before + selected)})
    row.locator('[data-insert]').click()
    test(composer.input_value() == before + selected + '\n\n' + prompt + '\n\n' + after, 'a selected range is preserved and insertion occurs after selectionEnd')
    insertion_end = len(before + selected) + 2 + len(prompt)
    test(composer.evaluate('(el,end)=>el.selectionStart===end&&el.selectionEnd===end', insertion_end), 'selection-based insertion collapses the caret after the new prompt without replacing selected words')
    test(not requests, 'caret and selection insertion make no send, upload or processing request')
    # Restore the preceding complete draft and its end caret so the existing
    # reorder, pin and suggestion journeys retain their original expectations.
    composer.fill(preserved_draft)
    composer.evaluate("""el=>{
        el.setSelectionRange(el.value.length,el.value.length);
        el.dispatchEvent(new Event('select',{bubbles:true}));
    }""")
    row.locator('[data-move="1"]').click()
    test(page.locator('[data-prompt-list]>div').nth(1).get_attribute('data-prompt-row') == '0', 'prompt order changes')
    test(row.locator('[data-rank]').inner_text() == '02', 'management rank follows order')
    row.locator('[data-move="-1"]').click()
    close_prompt('0')
    row = manage_prompt('2')
    pin = row.locator('[data-pin]')
    pin.focus()
    page.keyboard.press('Enter')
    test(pin.get_attribute('aria-pressed') == 'true', 'keyboard pin has explicit selected state')
    test(page.locator('[data-prompt-list]>div').first.get_attribute('data-prompt-row') == '2', 'pin moves above unpinned prompts')
    test(row.locator('[data-move="1"]').is_disabled(), 'ordering cannot silently unpin')
    prior_draft = page.locator('#pc-composer').input_value()
    row.locator('[data-insert]').click()
    test(page.locator('#pc-composer').input_value() == prior_draft + '\n\n' + page.locator('#pc-prompt-2').input_value(), 'pinned prompt preserves the draft without sending')
    pin.click()
    test(pin.get_attribute('aria-pressed') == 'false', 'unpin is reversible')
    close_prompt('2')
    page.locator('[data-suggestion-toggle]').click()
    test(page.locator('#pc-local-suggestion').is_visible() and page.locator('[data-suggestion-toggle]').get_attribute('aria-expanded') == 'true', 'the separate suggestion opens only when requested')
    test(page.locator('[data-suggestion]').inner_text() == prompt, 'suggestion refers to saved wording rather than an invented generated candidate')
    draft = page.locator('#pc-composer').input_value()
    page.locator('[data-suggestion]').click()
    test(page.locator('#pc-composer').input_value() == draft + '\n\n' + prompt, 'optional preset preserves the prior draft without sending')
    page.locator('[data-suggestion-toggle]').click()
    test(not page.locator('#pc-local-suggestion').is_visible(), 'the separate suggestion can be hidden again')
    prompt_draft = page.locator('#pc-composer').input_value()
    page.locator('[data-prompt-toggle]').click()
    test(not page.locator('#pc-prompt-card').is_visible() and page.locator('[data-prompt-toggle]').get_attribute('aria-expanded') == 'false', 'the orb collapses the prompt card')
    page.locator('[data-prompt-toggle]').click()
    test(page.locator('#pc-prompt-card').is_visible() and page.locator('[data-prompt-toggle]').get_attribute('aria-expanded') == 'true', 'the orb reopens the same prompt card')
    test(page.locator('#pc-composer').input_value() == prompt_draft, 'opening and closing the prompt card never inserts or sends')

    # PT1 grid/search/Section navigation replace the retired card-rearrangement demo.
    keys = ['product', 'writing', 'learning']
    test(page.locator('[data-topic-block]').evaluate_all('els=>els.map(e=>e.dataset.topicBlock)') == keys, 'the stable root contains the three personal example topics')
    page.locator('[data-topic-search]').fill('Example working text')
    test(page.locator('[data-topic-block][data-match=yes]').evaluate_all('els=>els.map(e=>e.dataset.topicBlock)') == ['product'], 'Topic search reads current expression text')
    test(page.locator('[data-topic-block]:visible').count() == 3, 'search highlights matches without destroying the Topic layout')
    page.locator('[data-topic-search]').press('Enter')
    test(page.locator('[data-topic-block="product"] h3 a').evaluate('e=>e===document.activeElement'), 'search Enter focuses the first matching Topic')
    page.locator('[data-topic-search]').fill('View source' if en else '查看来源')
    test(page.locator('[data-topic-block][data-match=yes]').count() == 0, 'Topic search excludes interface labels from content matches')
    page.locator('[data-topic-search]').fill('no-match-website-topic-xyz')
    test(page.locator('[data-topic-block]:visible').count() == 3 and page.locator('[data-topic-block][data-match=yes]').count() == 0, 'no-match search preserves the root blocks')
    test('0' in page.locator('[data-topic-match]').inner_text(), 'no-match state reports zero honestly')
    page.locator('[data-topic-search]').fill('')
    test(page.locator('[data-topic-block][data-match]').count() == 0, 'clearing Topic search removes only the match indicators')
    section_origin = topic_open('product', 'decisions')
    test(page.locator('[data-topic-reader="product"] .pc-thoughts > section').count() == 2, 'the product Topic has two continuous Sections')
    test(page.locator('[data-thought]').count() == 4, 'the same four expressions survive Topic navigation')
    test(page.locator('[data-thought-text="a"]').inner_text() == changed, 'the reader preserves the current user-authored meaning')
    test(page.locator('[data-thought-text="note"]').inner_text() == independent, 'independent thought content is not overwritten')
    test(0 <= page.locator('#pc-section-decisions').bounding_box()['y'] < page.viewport_size['height'], 'Section link reaches its actual reader location')
    source = page.locator('[data-thought="c"] .pc-topic-source')
    source.locator('summary').focus()
    page.keyboard.press('Enter')
    test(source.evaluate('e=>e.open') and 'ChatGPT' in source.inner_text(), 'source provenance expands by keyboard')
    source.locator('summary').press('Enter')
    topic_back('product', section_origin)
    for key in ['writing', 'learning']:
        origin = topic_open(key)
        test(page.locator(f'[data-topic-reader="{key}"] .pc-reader-prose').count() == 2, f'{key} has its own example body')
        test(page.locator('[data-working="a"]').input_value() == changed, 'Topic navigation never rewrites Archive')
        topic_back(key, origin)

    # Withdraw the fictional user's initial grants through the real control,
    # then keep the full closed-to-open isolation journey. No default policy
    # in the extension or real AI service is asserted by this local scenario.
    test(page.locator('[data-context-card]').count() == 4, 'exactly four independent Context cards')
    test(page.locator('[data-context-overview] textarea, [data-context-overview] input').count() == 0, 'overview has no personal body or checkbox matrix')
    page.locator('[data-context-clear]').click()
    test(page.locator('[data-card-allow][aria-pressed=true], [data-topic-allow][aria-pressed=true]').count() == 0 and not on('[data-context-global]'), 'withdrawing the example grants closes every independent scope')
    permission_names()
    page.locator('[data-card-allow="rules"]').click()
    test(not on('[data-context-global]'), 'opening a card does not open global access')
    test(page.locator('[data-context-preview] strong').count() == 0, 'paused scope releases no example material')
    open_card('rules')
    rule = 'User rule <script>neverRun()</script>'
    page.locator('[data-context-text="rules"]').fill(rule)
    test(page.locator('[data-working="a"]').input_value() == changed, 'independent Context edit never writes Archive')
    back('rules')
    page.locator('[data-context-global]').click()
    test(rule in page.locator('[data-context-preview]').inner_text(), 'allowed card shows literal current content')
    test(page.locator('[data-context-preview] script').count() == 0, 'Context cannot inject markup')
    test(page.locator('[data-context-preview] strong').count() == 1, 'other cards stay out of scope')
    open_card('inputs')
    page.locator('[data-topic-allow="product"]').click()
    test(not on('[data-card-allow="inputs"]'), 'opening a topic does not open parent card')
    test(changed not in page.locator('[data-context-preview]').inner_text(), 'closed My Inputs denies an open topic')
    test(page.locator('[data-topic-allow="product"] [data-topic-access-state]').inner_text() == ('Open' if en else '已开放'), 'closed parent never labels a retained topic AI-readable')
    test(page.locator('[data-topic-allow="product"] .pc-topic-name').inner_text() == ('A product’s first step' if en else '产品的第一步'), 'the whole permission pill retains its Topic identity')
    back('inputs')
    page.locator('[data-card-allow="inputs"]').click()
    preview = page.locator('[data-context-preview]').inner_text()
    test(changed in preview and independent in preview, 'open topic scope includes complete sample bodies')
    test(page.locator('[data-topic-allow="product"] [data-topic-access-state]').inner_text() == ('AI readable' if en else 'AI 可读'), 'topic label reflects effective access')
    test(('Writing practice' if en else '写作习惯') not in preview, 'unopened topic stays excluded')
    page.locator('[data-context-pause]').click()
    test(not on('[data-context-global]') and on('[data-card-allow="rules"]') and on('[data-topic-allow="product"]'), 'pause preserves lower choices')
    test(page.locator('[data-context-preview] strong').count() == 0, 'pause removes effective scope')
    permission_names()
    page.locator('[data-context-global]').click()
    open_card('inputs')
    page.locator('[data-topic-allow="product"]').click()
    test(rule in page.locator('[data-context-preview]').inner_text() and changed not in page.locator('[data-context-preview]').inner_text(), 'closing a topic preserves independent Rules')
    page.locator('[data-topic-allow="writing"]').click()
    writing = page.locator('[data-topic-reader="writing"] .pc-reader-prose').all_text_contents()
    preview = page.locator('[data-context-preview]').inner_text()
    test(all(text in preview for text in writing) and changed not in preview, 'writing permission reads its actual body without the closed product Topic')
    test(page.locator('[data-topic-reader="learning"] .pc-reader-prose').first.text_content() not in preview, 'an unrelated Topic never becomes an Archive fallback')
    page.locator('[data-topic-allow="writing"]').click()
    back('inputs')
    open_card('rules')
    page.locator('[data-context-remove="rules"]').click()
    test(rule not in page.locator('[data-context-preview]').inner_text(), 'removed item leaves allowed scope')
    page.locator('[data-context-undo="rules"]').click()
    test(page.locator('[data-context-text="rules"]').input_value() == rule, 'undo restores the exact local item')
    back('rules')
    page.locator('[data-context-clear]').click()
    test(page.locator('[data-card-allow][aria-pressed=true], [data-topic-allow][aria-pressed=true]').count() == 0 and not on('[data-context-global]'), 'withdraw clears permissions')
    test(page.locator('[data-context-text="rules"]').input_value() == rule, 'withdraw does not delete content')
    test(page.locator('.pc-access-boundary').is_visible(), 'real-connection limitation stays visible')
    page.locator('[data-reset-inputs]').click()
    test(page.locator('[data-working="a"]').input_value() == original, 'reset restores working text')
    test(page.locator('[data-thought-text="a"]').text_content() == original, 'reset updates the explicit Topic reference')
    test(page.locator('[data-reading-output]').get_attribute('data-stale') == 'false', 'matching source allows the preset again')
    final_topic = topic_open('product')
    for style in ('original', 'balanced', 'concise'):
        page.locator('[data-reading-style]').select_option(style)
        test(page.locator('[data-reading-output]').is_visible() and bool(page.locator('[data-reading-output]').inner_text().strip()), f'{style} reading is visible')
        test(page.locator('[data-working="a"]').input_value() == original, f'{style} never overwrites working text')
    page.locator('[data-reading-style]').select_option('original')
    topic_back('product', final_topic)
    test(not requests, 'all example interactions avoid uploads, remote processing and form submissions')
    page.remove_listener('request', observe_request)
    if not offline:
        test(not page.evaluate('localStorage.length || sessionStorage.length'), 'example edits remain in page memory only')
