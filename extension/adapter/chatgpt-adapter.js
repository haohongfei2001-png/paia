/* ChatGPT DOM contract. No other module should know page selectors. */
(() => {
  'use strict';

  const VERSION = '0.3.0';
  const USER = '[data-message-author-role="user"]';
  const TURN = 'article[data-testid^="conversation-turn-"]';
  const TEXT = '.whitespace-pre-wrap, [data-testid="user-message-text"]';
  const EDITOR = 'textarea, input, [contenteditable]:not([contenteditable="false"]), [role="textbox"]';
  const UNSAFE = `${EDITOR}, button, a, img, svg, canvas, video, audio, iframe, script, style, [data-testid*="attachment"], [data-testid*="file"], [data-testid*="image"]`;
  const MAX_TEXT = 200000;
  const STABILITY_MS = 750;
  const {emptyStructure, emptyRow, MAX_ROWS} = globalThis.ArchiveDiagnostics;

  class ChatGPTAdapter {
    static version = VERSION;

    constructor({document = globalThis.document, location = globalThis.location} = {}) {
      this.document = document;
      this.location = location;
      this.version = VERSION;
      this.observer = null;
      this.pending = null;
      this.lastRoute = null;
      this.identities = new Map();
      this.nodeBindings = new WeakMap();
      this.nodeTokens = new WeakMap();
      this.nodeRevisions = new WeakMap();
      this.nextToken = 1;
    }

    // Called only after consent and enablement have been checked.
    watch(onChange) {
      if (this.observer || !this.document.documentElement) return;
      this.observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
          const target = mutation.target.nodeType === 1 ? mutation.target : mutation.target.parentElement;
          const root = target?.closest(USER);
          if (root) this.nodeRevisions.set(root, (this.nodeRevisions.get(root) || 0) + 1);
        }
        onChange();
      });
      this.observer.observe(this.document.documentElement, {
        subtree: true, childList: true, characterData: true, attributes: true,
        attributeFilter: ['data-message-id', 'data-message-author-role', 'data-testid', 'hidden', 'aria-hidden', 'aria-busy', 'class', 'style', 'contenteditable', 'datetime', 'data-time-kind', 'data-message-created-at', 'data-message-sent-at', 'title', 'aria-label']
      });
    }

    stopWatching() {
      this.observer?.disconnect();
      this.observer = null;
      this.invalidate();
    }

    invalidate() { this.pending = null; }

    route() {
      let url;
      try { url = new URL(this.location.href); } catch { return {code: 'WAITING_CHAT'}; }
      if (url.origin !== 'https://chatgpt.com') return {code: 'WAITING_CHAT'};
      if (['temporary-chat', 'temporary_chat', 'temporary'].some((name) => url.searchParams.has(name))) {
        return {code: 'TEMPORARY_CHAT'};
      }
      // Only explicit top-bar markers count; message text is never searched.
      const header = this.document.querySelector('header');
      if (header) {
        const marker = header.querySelector('[data-testid="temporary-chat-indicator"], [data-testid="temporary-chat-button"][aria-pressed="true"], [data-testid="temporary-chat-button"][data-state="on"]');
        if (marker && this.visible(marker)) return {code: 'TEMPORARY_CHAT'};
        const activeButtons = header.querySelectorAll('button[aria-pressed="true"]');
        for (const button of activeButtons) {
          if (this.visible(button) && /^(temporary(?: chat)?|临时聊天|臨時聊天)$/i.test(button.textContent.trim())) {
            return {code: 'TEMPORARY_CHAT'};
          }
        }
      }
      const match = url.pathname.match(/^\/(?:g\/[A-Za-z0-9_-]+\/)?c\/([A-Za-z0-9_-]{8,128})\/?$/);
      if (!match) return {code: 'WAITING_CHAT'};
      return {code: 'READY', id: match[1], url: `https://chatgpt.com/c/${match[1]}`};
    }

    isSameChat(id) {
      const route = this.route();
      return route.code === 'READY' && route.id === id;
    }

    visible(element) {
      if (!element.isConnected || !element.getClientRects().length) return false;
      for (let current = element; current; current = current.parentElement) {
        if (current.hidden || current.getAttribute('aria-hidden') === 'true' || current.hasAttribute('inert')) return false;
        const style = this.document.defaultView.getComputedStyle(current);
        if (style.display === 'none' || style.visibility === 'hidden' || style.visibility === 'collapse' || style.opacity === '0') return false;
      }
      return true;
    }

    token(node) {
      if (!this.nodeTokens.has(node)) this.nodeTokens.set(node, this.nextToken++);
      return this.nodeTokens.get(node);
    }

    // Called only after canonical identity, role, editor and stability gates pass.
    domTime(root,container,identity,main) {
      const values=[];let visited=0;
      const add=value=>{
        if(typeof value==='string'&&value.length<=40&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&
           Date.parse(value)>=946684800000&&Date.parse(value)<=Date.now())values.push(value);
      };
      const read=node=>{
        for(const key of ['data-message-created-at','data-message-sent-at'])add(node.getAttribute(key));
        if(node.matches('time[datetime]')&&(['sent','created'].includes(node.getAttribute('data-time-kind'))||['message-sent-at','message-created-at'].includes(node.getAttribute('data-testid'))))add(node.getAttribute('datetime'));
        for(const key of ['title','aria-label']){
          const raw=node.getAttribute(key);if(typeof raw!=='string'||raw.length>80)continue;
          const match=raw.match(/^(?:Sent at|Created at|发送于|创建于)\s+(.+)$/);if(match)add(match[1]);
        }
      };
      const walk=(node,depth)=>{
        if(++visited>64)return;
        if(depth>3||container.contains(node)||node.matches(UNSAFE)||node.closest('[data-message-author-role]')!==root)return;
        if(node.hasAttribute('data-message-id')&&node.getAttribute('data-message-id')!==identity.sourceMessageId)return;
        read(node);
        for(const child of node.children){if(visited>64)break;walk(child,depth+1);}
      };
      walk(root,0);
      let ancestor=root.parentElement;
      for(let depth=1;ancestor&&ancestor!==main&&depth<=3;depth++,ancestor=ancestor.parentElement){
        if(!main.contains(ancestor)||ancestor.matches(UNSAFE))break;
        if(ancestor.getAttribute('data-message-id')!==identity.sourceMessageId)continue;
        const roles=ancestor.querySelectorAll('[data-message-author-role]');
        if(roles.length===1&&roles[0]===root)read(ancestor);
      }
      if(visited>64||!values.length||values.length>8)return null;
      if(Math.max(...values.map(Date.parse))-Math.min(...values.map(Date.parse))>1000)return null;
      return {source:'chatgpt_dom',timestamp:values[0],identity};
    }

    // Structural probes never read text, markup, IDs into diagnostics, or expand capture rules.
    inspectRole(root, main) {
      const row = emptyRow();
      const sourceMessageId = root.getAttribute('data-message-id');
      const nearestTurn = root.closest(TURN);
      const turn = nearestTurn && main.contains(nearestTurn) ? nearestTurn : null;
      const marker = root.closest('[data-testid^="conversation-turn-"]');
      const article = root.closest('article');
      row.turnFound = Boolean(turn);
      row.turnMarkerFound = Boolean(marker && main.contains(marker));
      row.articleFound = Boolean(article && main.contains(article));
      row.idAttributeOnRole = root.hasAttribute('data-message-id');
      row.idOnRole = /^[A-Za-z0-9_-]{8,128}$/.test(sourceMessageId || '');
      // Ancestor IDs are evidence about placement only, never identity fallbacks.
      const boundary = root.closest(`${TURN}, [data-testid^="conversation-turn-"]`);
      if (boundary !== root) {
        for (let ancestor = root.parentElement; ancestor && main.contains(ancestor); ancestor = ancestor.parentElement) {
          if (/^[A-Za-z0-9_-]{8,128}$/.test(ancestor.getAttribute('data-message-id') || '')) row.idOnAncestor = true;
          if (ancestor === boundary || ancestor === main) break;
        }
      }
      row.idOnDescendant = [...root.querySelectorAll('[data-message-id]')]
        .some((node) => /^[A-Za-z0-9_-]{8,128}$/.test(node.getAttribute('data-message-id') || ''));
      row.rootInsideEditor = Boolean(root.closest(EDITOR));
      row.rootIsContentEditable = root.isContentEditable === true;
      // Keep the old turn veto where available. A validated role is also a
      // bounded message scope; absence of the old wrapper is not an editor failure.
      const editorScope = turn || (row.idOnRole ? root : null);
      row.editorCheckAvailable = Boolean(editorScope);
      const editors = editorScope ? [...editorScope.querySelectorAll(EDITOR)].filter((node) => this.visible(node)) : [];
      // Retain schema-1 field names; turnFound identifies turn vs role scope.
      row.visibleEditorsInTurn = editors.length;
      row.visibleInputsInTurn = editors.filter((node) => node.matches('input')).length;
      row.visibleTextareasInTurn = editors.filter((node) => node.matches('textarea')).length;
      row.visibleEditablesInTurn = editors.filter((node) => node.matches('[contenteditable]:not([contenteditable="false"])')).length;
      row.visibleTextboxesInTurn = editors.filter((node) => node.matches('[role="textbox"]')).length;
      row.editorPassed = row.editorCheckAvailable && !row.rootInsideEditor && editors.length === 0;
      row.busy = root.getAttribute('aria-busy') === 'true' || Boolean(turn && turn.getAttribute('aria-busy') === 'true');
      row.roleMatchesTextSelector = root.matches(TEXT);
      const matches = [...root.querySelectorAll(TEXT)];
      row.textMatches = matches.length;
      const owned = matches.filter((node) => node.closest(USER) === root);
      row.ownedTextMatches = owned.length;
      const visible = owned.filter((node) => this.visible(node));
      row.visibleTextMatches = visible.length;
      row.unsafeAncestorMatches = visible.filter((node) => node.closest(UNSAFE)).length;
      row.unsafeDescendantMatches = visible.filter((node) => node.querySelector(UNSAFE)).length;
      const containers = visible.filter((node) => !node.closest(UNSAFE) && !node.querySelector(UNSAFE));
      row.safeTextMatches = containers.length;
      return {root, turn, sourceMessageId, row, containers};
    }

    collect({now = Date.now()} = {}) {
      const route = this.route();
      if (route.code !== 'READY') {
        this.lastRoute = null;
        this.invalidate();
        return {code: route.code, scanned: 0};
      }
      if (route.id !== this.lastRoute) {
        this.lastRoute = route.id;
        this.invalidate();
      }
      const structure = emptyStructure();
      const main = this.document.querySelector('main');
      structure.mainPresent = Boolean(main);
      structure.mainVisible = Boolean(main && this.visible(main));
      structure.mainBusy = Boolean(main && main.getAttribute('aria-busy') === 'true');
      if (!main || !structure.mainVisible || structure.mainBusy) {
        this.invalidate();
        return {code: 'UNSTABLE_PAGE', scanned: 0, structure};
      }
      const allRoots = [...main.querySelectorAll(USER)];
      const roots = allRoots.filter((node) => this.visible(node));
      structure.userRoleCount = allRoots.length;
      structure.visibleUserRoleCount = roots.length;
      if (!roots.length) {
        this.invalidate();
        return {code: 'NO_MESSAGES', scanned: 0, structure};
      }
      // Every visible role gets a structural report, even when turn or ID validation fails.
      const inspected = roots.map((root) => this.inspectRole(root, main));
      for (const {row} of inspected) {
        structure.validTurnCount += Number(row.turnFound);
        structure.turnMarkerCount += Number(row.turnMarkerFound);
        structure.roleIdPresentCount += Number(row.idAttributeOnRole);
        structure.roleIdValidCount += Number(row.idOnRole);
        structure.ancestorIdCount += Number(row.idOnAncestor);
        structure.descendantIdCount += Number(row.idOnDescendant);
        structure.editorPassedCount += Number(row.editorPassed);
        structure.busyPassedCount += Number(row.editorCheckAvailable && !row.busy);
      }
      structure.rows = inspected.slice(0, MAX_ROWS).map(({row}) => row);
      structure.rowsTruncated = inspected.length > MAX_ROWS;
      const rejectCandidates = () => {
        structure.finalCandidateCount = 0;
        for (const {row} of inspected) row.candidateAccepted = false;
      };
      const candidates = [];
      const seenIds = new Set();
      let stale = false;
      for (let index = 0; index < inspected.length; index += 1) {
        const {root, sourceMessageId, row, containers} = inspected[index];
        if (!row.idOnRole) continue;
        // Duplicate IDs in the same render are ambiguous; do not pick a winner.
        if (seenIds.has(sourceMessageId)) {
          for (const entry of inspected) {
            if (entry.row.idOnRole && entry.sourceMessageId === sourceMessageId) entry.row.duplicateIdentity = true;
          }
          rejectCandidates();
          this.invalidate();
          return {code: 'UNSTABLE_PAGE', scanned: roots.length, structure};
        }
        seenIds.add(sourceMessageId);
        const bound = this.nodeBindings.get(root);
        if ((bound && bound.messageId === sourceMessageId && bound.chatId !== route.id) ||
            (this.identities.has(sourceMessageId) && this.identities.get(sourceMessageId) !== route.id)) {
          stale = true;
          row.staleIdentity = true;
          continue;
        }
        this.nodeBindings.set(root, {chatId: route.id, messageId: sourceMessageId});
        this.identities.set(sourceMessageId, route.id);
        if (!row.editorPassed) continue;
        if (row.busy) continue;
        if (containers.length !== 1) continue;
        row.candidateAccepted = true;
        candidates.push({root, container: containers[0], sourceMessageId, pageOrder: index + 1});
      }
      if (stale) {
        rejectCandidates();
        this.invalidate();
        return {code: 'UNSTABLE_PAGE', scanned: roots.length, structure};
      }
      structure.finalCandidateCount = candidates.length;
      if (!candidates.length) {
        this.invalidate();
        return {code: 'ADAPTER_MISMATCH', scanned: roots.length, structure};
      }
      const title = this.document.title.replace(/\s*[-–—|]\s*ChatGPT\s*$/i, '').trim() || 'ChatGPT';
      const signature = JSON.stringify([route.id, title, candidates.map(({root, container, sourceMessageId, pageOrder}) => [
        sourceMessageId, pageOrder, this.token(root), this.token(container), this.nodeRevisions.get(root) || 0
      ])]);
      if (!this.pending || this.pending.signature !== signature) {
        this.pending = {signature, since: now};
        return {code: 'UNSTABLE_PAGE', scanned: roots.length, structure};
      }
      if (now - this.pending.since < STABILITY_MS) return {code: 'UNSTABLE_PAGE', scanned: roots.length, structure};
      const messages = [];
      let oversized = false;
      for (const {root,container, sourceMessageId, pageOrder} of candidates) {
        // Read only a confirmed, rendered text leaf; never a turn, role root, or page.
        const originalText = container.innerText;
        if (!originalText.trim()) continue;
        if (originalText.length > MAX_TEXT) { oversized = true; continue; }
        const domTime=this.domTime(root,container,{chatId:route.id,sourceMessageId},main);
        messages.push({sourceMessageId, pageOrder, originalText,...(domTime?{domTime}:{})});
        if(globalThis.PAIAInputPresence)messages.at(-1).presence=globalThis.PAIAInputPresence.collect(root,container);
      }
      if (!this.isSameChat(route.id)) {
        rejectCandidates();
        this.invalidate();
        return {code: 'UNSTABLE_PAGE', scanned: roots.length, structure};
      }
      return {
        code: oversized ? 'MESSAGE_TOO_LARGE' : (messages.length ? 'CAPTURING' : 'NO_MESSAGES'),
        scanned: roots.length,
        structure,
        chat: {id: route.id, url: route.url, title: title.slice(0, 500)},
        messages
      };
    }
  }

  globalThis.ChatGPTAdapter = ChatGPTAdapter;
})();
