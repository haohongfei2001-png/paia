// Invented contract variants only. These are not copied from a logged-in ChatGPT page.
export function sentUser({id = 'message-synthetic-001', body = '<div class="whitespace-pre-wrap">虚构已发送文字</div>', extra = '', turnAttributes = '', roleAttributes = '', tag = 'article', marker = true} = {}) {
  const role = `<div data-message-author-role="user" ${id ? `data-message-id="${id}"` : ''} ${roleAttributes}>${body}${extra}</div>`;
  return tag ? `<${tag} ${marker ? 'data-testid="conversation-turn-0"' : ''} ${turnAttributes}>${role}</${tag}>` : role;
}

const noCandidates = {finalCandidateCount: 0};
const mismatch = (name, body, row, summary = {}) => ({name, body, code: 'ADAPTER_MISMATCH', row, summary: {...noCandidates, ...summary}});
const accepted = (name, body, row) => ({name, body, code: 'CAPTURING', row, summary: {finalCandidateCount: 1}});

export const structureCases = [
  {name: 'no user role matches is NO_MESSAGES', body: '<article data-testid="conversation-turn-0"><div data-message-author-role="assistant"><div class="whitespace-pre-wrap">虚构 AI</div></div></article>', code: 'NO_MESSAGES', summary: {userRoleCount: 0, visibleUserRoleCount: 0, finalCandidateCount: 0}},
  {name: 'hidden user roles are counted but not inspected', body: `<div hidden>${sentUser()}</div>`, code: 'NO_MESSAGES', summary: {userRoleCount: 1, visibleUserRoleCount: 0, finalCandidateCount: 0}},
  accepted('article without conversation marker', sentUser({marker: false}), {articleFound: true, turnMarkerFound: false, turnFound: false, editorCheckAvailable: true, editorPassed: true, safeTextMatches: 1}),
  accepted('conversation marker on div instead of article', sentUser({tag: 'div'}), {articleFound: false, turnMarkerFound: true, turnFound: false, editorCheckAvailable: true, safeTextMatches: 1}),
  accepted('article and marker exist on separate ancestors', `<article>${sentUser({tag: 'div'})}</article>`, {articleFound: true, turnMarkerFound: true, turnFound: false}),
  accepted('missing turn does not inspect the main composer', `<textarea>虚构输入框</textarea>${sentUser({tag: 'div'})}`, {editorCheckAvailable: true, visibleEditorsInTurn: 0, visibleTextareasInTurn: 0, editorPassed: true}),
  accepted('no wrapper at all uses the role identity and retains every following check', sentUser({tag: null}), {turnFound: false, articleFound: false, turnMarkerFound: false, idOnRole: true, editorCheckAvailable: true, editorPassed: true, candidateAccepted: true}),
  mismatch('no wrapper and no ID anywhere still fails closed', sentUser({tag: null, id: ''}), {idOnRole: false, idOnAncestor: false, idOnDescendant: false, editorCheckAvailable: false}),
  mismatch('no wrapper and invalid role ID still fails closed', sentUser({tag: null, id: 'short'}), {idAttributeOnRole: true, idOnRole: false, editorCheckAvailable: false}),
  mismatch('no wrapper does not promote a descendant ID', sentUser({tag: null, id: '', body: '<div data-message-id="message-synthetic-descendant"><div class="whitespace-pre-wrap">虚构</div></div>'}), {idOnRole: false, idOnDescendant: true}),
  mismatch('no old turn does not promote an ancestor ID', `<section data-message-id="message-synthetic-ancestor">${sentUser({tag: null, id: ''})}</section>`, {idOnRole: false, idOnAncestor: true}),
  {name: 'assistant with legal ID and known text without wrapper is not a user message', body: '<div data-message-author-role="assistant" data-message-id="message-synthetic-assistant"><div class="whitespace-pre-wrap">虚构 AI</div></div>', code: 'NO_MESSAGES', summary: {userRoleCount: 0, finalCandidateCount: 0}},
  mismatch('no wrapper role inside editor remains excluded', `<div contenteditable="true">${sentUser({tag: null})}</div>`, {rootInsideEditor: true, editorCheckAvailable: true, editorPassed: false}),
  mismatch('no wrapper role itself being edited remains excluded', sentUser({tag: null, roleAttributes: 'contenteditable="true"'}), {rootInsideEditor: true, rootIsContentEditable: true, editorPassed: false}),
  ...[
    ['input', '<input>', 'visibleInputsInTurn'],
    ['textarea', '<textarea>虚构草稿</textarea>', 'visibleTextareasInTurn'],
    ['contenteditable', '<div contenteditable="true">虚构草稿</div>', 'visibleEditablesInTurn'],
    ['textbox', '<div role="textbox">虚构草稿</div>', 'visibleTextboxesInTurn']
  ].map(([name, extra, key]) => mismatch(`no wrapper role with visible ${name} editor is excluded`, sentUser({tag: null, extra}), {editorCheckAvailable: true, editorPassed: false, visibleEditorsInTurn: 1, [key]: 1})),
  mismatch('no wrapper with two safe containers remains ambiguous', sentUser({tag: null, extra: '<div class="whitespace-pre-wrap">虚构第二段</div>'}), {editorPassed: true, textMatches: 2, safeTextMatches: 2}),
  mismatch('no wrapper with nested safe containers remains ambiguous', sentUser({tag: null, body: '<div class="whitespace-pre-wrap"><div class="whitespace-pre-wrap">虚构</div></div>'}), {textMatches: 2, safeTextMatches: 2}),
  mismatch('no wrapper with unknown container remains unsupported', sentUser({tag: null, body: '<p>虚构</p>'}), {textMatches: 0, safeTextMatches: 0, editorPassed: true}),
  mismatch('no wrapper with hidden text is excluded', sentUser({tag: null, body: '<div hidden class="whitespace-pre-wrap">虚构</div>'}), {textMatches: 1, visibleTextMatches: 0, safeTextMatches: 0}),
  mismatch('no wrapper with attachment text is excluded', sentUser({tag: null, body: '<div data-testid="attachment-card"><div class="whitespace-pre-wrap">虚构附件</div></div>'}), {unsafeAncestorMatches: 1, safeTextMatches: 0}),
  mismatch('no wrapper busy role is excluded', sentUser({tag: null, roleAttributes: 'aria-busy="true"'}), {busy: true, editorPassed: true}, {busyPassedCount: 0}),
  mismatch('existing turn still vetoes sibling editors outside the role', `<article data-testid="conversation-turn-0">${sentUser({tag: null})}<textarea>虚构编辑草稿</textarea></article>`, {turnFound: true, visibleTextareasInTurn: 1, editorPassed: false}),
  mismatch('missing message identity on role', sentUser({id: ''}), {turnFound: true, idAttributeOnRole: false, idOnRole: false, editorPassed: true, textMatches: 1, safeTextMatches: 1}, {roleIdPresentCount: 0, roleIdValidCount: 0}),
  mismatch('invalid identity is different from missing identity', sentUser({id: 'short'}), {idAttributeOnRole: true, idOnRole: false}, {roleIdPresentCount: 1, roleIdValidCount: 0}),
  mismatch('message identity on turn does not become a capture fallback', sentUser({id: '', turnAttributes: 'data-message-id="message-synthetic-ancestor"'}), {idAttributeOnRole: false, idOnRole: false, idOnAncestor: true, idOnDescendant: false}, {ancestorIdCount: 1}),
  mismatch('message identity on descendant does not become a capture fallback', sentUser({id: '', body: '<div data-message-id="message-synthetic-descendant"><div class="whitespace-pre-wrap">虚构</div></div>'}), {idOnRole: false, idOnAncestor: false, idOnDescendant: true}, {descendantIdCount: 1}),
  mismatch('empty ancestor identity is not reported as valid', sentUser({id: '', turnAttributes: 'data-message-id=""'}), {idOnAncestor: false}, {ancestorIdCount: 0}),
  mismatch('invalid ancestor identity is not reported as valid', sentUser({id: '', turnAttributes: 'data-message-id="bad id!"'}), {idOnAncestor: false}, {ancestorIdCount: 0}),
  mismatch('empty descendant identity is not reported as valid', sentUser({id: '', body: '<div data-message-id=""><div class="whitespace-pre-wrap">虚构</div></div>'}), {idOnDescendant: false}, {descendantIdCount: 0}),
  mismatch('invalid descendant identity is not reported as valid', sentUser({id: '', body: '<div data-message-id="bad id!"><div class="whitespace-pre-wrap">虚构</div></div>'}), {idOnDescendant: false}, {descendantIdCount: 0}),
  mismatch('unknown text container remains unsupported', sentUser({body: '<p>虚构未知容器</p>'}), {textMatches: 0, safeTextMatches: 0, roleMatchesTextSelector: false}),
  mismatch('known text selector on role itself remains unsupported', sentUser({roleAttributes: 'class="whitespace-pre-wrap"', body: '虚构'}), {roleMatchesTextSelector: true, textMatches: 0, safeTextMatches: 0}),
  mismatch('two sibling known text containers remain ambiguous', sentUser({extra: '<div data-testid="user-message-text">虚构第二段</div>'}), {textMatches: 2, ownedTextMatches: 2, visibleTextMatches: 2, safeTextMatches: 2}),
  mismatch('nested known text containers remain ambiguous', sentUser({body: '<div class="whitespace-pre-wrap"><div data-testid="user-message-text">虚构</div></div>'}), {textMatches: 2, safeTextMatches: 2}),
  mismatch('nested role text is not owned by the outer role', sentUser({body: '<div data-message-author-role="user"><div class="whitespace-pre-wrap">虚构嵌套</div></div>'}), {textMatches: 1, ownedTextMatches: 0, visibleTextMatches: 0, safeTextMatches: 0}, {userRoleCount: 2, visibleUserRoleCount: 2}),
  accepted('one node matching both aliases is one container', sentUser({body: '<div class="whitespace-pre-wrap" data-testid="user-message-text">虚构</div>'}), {textMatches: 1, safeTextMatches: 1, candidateAccepted: true}),
  accepted('the explicit text testid remains a valid original contract', sentUser({body: '<div data-testid="user-message-text">虚构</div>'}), {textMatches: 1, safeTextMatches: 1}),
  mismatch('hidden known text is distinguished from no selector match', sentUser({body: '<div hidden class="whitespace-pre-wrap">虚构</div>'}), {textMatches: 1, ownedTextMatches: 1, visibleTextMatches: 0, safeTextMatches: 0}),
  mismatch('attachment ancestor excludes an otherwise known text container', sentUser({body: '<div data-testid="attachment-card"><div class="whitespace-pre-wrap">虚构附件</div></div>'}), {textMatches: 1, visibleTextMatches: 1, unsafeAncestorMatches: 1, unsafeDescendantMatches: 0, safeTextMatches: 0}),
  mismatch('interactive descendant excludes an otherwise known text container', sentUser({body: '<div class="whitespace-pre-wrap">虚构 <a>虚构链接</a></div>'}), {textMatches: 1, unsafeAncestorMatches: 0, unsafeDescendantMatches: 1, safeTextMatches: 0}),
  accepted('raw multiple containers with one safe known text remain accepted', sentUser({extra: '<div data-testid="attachment-card"><div class="whitespace-pre-wrap">虚构附件</div></div>'}), {textMatches: 2, ownedTextMatches: 2, visibleTextMatches: 2, unsafeAncestorMatches: 1, safeTextMatches: 1}),
  mismatch('visible input anywhere in the valid turn preserves fail-closed exclusion', sentUser({extra: '<input>'}), {editorCheckAvailable: true, visibleEditorsInTurn: 1, visibleInputsInTurn: 1, editorPassed: false, safeTextMatches: 1}),
  mismatch('visible textarea editor has a distinct count', sentUser({extra: '<textarea>虚构草稿</textarea>'}), {visibleEditorsInTurn: 1, visibleTextareasInTurn: 1, editorPassed: false}),
  mismatch('visible contenteditable editor has a distinct count', sentUser({extra: '<div contenteditable="true">虚构草稿</div>'}), {visibleEditorsInTurn: 1, visibleEditablesInTurn: 1, editorPassed: false}),
  mismatch('visible role textbox has a distinct count', sentUser({extra: '<div role="textbox">虚构草稿</div>'}), {visibleEditorsInTurn: 1, visibleTextboxesInTurn: 1, editorPassed: false}),
  mismatch('contenteditable ancestor excludes the role without inspecting its text', `<div contenteditable="true">${sentUser()}</div>`, {rootInsideEditor: true, rootIsContentEditable: true, visibleEditorsInTurn: 0, editorPassed: false}),
  mismatch('a noneditable island inside an editor keeps the original ancestor veto', `<div contenteditable="true"><div contenteditable="false">${sentUser()}</div></div>`, {rootInsideEditor: true, rootIsContentEditable: false, editorPassed: false}),
  accepted('explicit noneditable role with no editing ancestor is valid', sentUser({roleAttributes: 'contenteditable="false"'}), {rootInsideEditor: false, rootIsContentEditable: false, editorPassed: true}),
  accepted('a hidden sibling editor does not veto rendered sent text', sentUser({extra: '<textarea hidden>虚构草稿</textarea>'}), {visibleEditorsInTurn: 0, editorPassed: true}),
  mismatch('busy turn preserves exclusion and reports its cause', sentUser({turnAttributes: 'aria-busy="true"'}), {editorPassed: true, busy: true, safeTextMatches: 1}, {busyPassedCount: 0}),
  mismatch('busy role preserves exclusion and reports its cause', sentUser({roleAttributes: 'aria-busy="true"'}), {editorPassed: true, busy: true, safeTextMatches: 1}, {busyPassedCount: 0})
];
