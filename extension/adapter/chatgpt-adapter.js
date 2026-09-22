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
      this.pending = new WeakMap();
      this.lastRoute = null;
      this.identities = new Map();
      this.identityBindings = 0;
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

    invalidate() { this.pending = new WeakMap(); }

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
      const owned = matches.filter((node) => node.closest('[data-message-author-role]') === root);
      row.ownedTextMatches = owned.length;
      const visible = owned.filter((node) => this.visible(node));
      row.visibleTextMatches = visible.length;
      row.unsafeAncestorMatches = visible.filter((node) => node.closest(UNSAFE)).length;
      row.unsafeDescendantMatches = visible.filter((node) => node.querySelector(UNSAFE)).length;
      const containers = visible.filter((node) => !node.closest(UNSAFE) && !node.querySelector(UNSAFE) && !node.querySelector('[data-message-author-role]'));
      row.safeTextMatches = containers.length;
      return {root, turn, sourceMessageId, row, containers};
    }

    async projectDiscovery({salt} = {}) {
      const win=this.document.defaultView;
      if(typeof salt!=='string'||!/^[a-f0-9]{32}$/.test(salt)||!win?.crypto?.subtle)return null;
      let page;
      try{page=new URL(this.location.href);}catch{return null;}
      if(page.origin!=='https://chatgpt.com')return null;
      const encoder=new TextEncoder();
      const digest=async(kind,value)=>{
        if(typeof value!=='string'||!value.length)return null;
        const bytes=encoder.encode(salt+'\0'+kind+'\0'+value);
        const hash=await win.crypto.subtle.digest('SHA-256',bytes);
        return [...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('').slice(0,32);
      };
      const projectId=segment=>{
        const match=typeof segment==='string'?segment.match(/^(g-p-[a-f0-9]{32})(?:-|$)/i):null;
        return match?match[1].toLowerCase():null;
      };
      const routeInfo=pathname=>{
        let match=pathname.match(/^\/g\/([^/]+)\/c\/([A-Za-z0-9_-]{8,128})\/?$/);
        if(match){
          const project=projectId(match[1]);
          return {kind:project?'project_chat':'g_other_chat',project,chatId:match[2]};
        }
        match=pathname.match(/^\/c\/([A-Za-z0-9_-]{8,128})\/?$/);
        if(match)return {kind:'plain_chat',project:null,chatId:match[1]};
        match=pathname.match(/^\/g\/([^/]+)\/project\/?$/);
        if(match){
          const project=projectId(match[1]);
          return {kind:project?'project_home':'g_other_home',project,chatId:null};
        }
        return {kind:'other',project:null,chatId:null};
      };
      const route=routeInfo(page.pathname);
      const routeProjectDigest=route.project?await digest('project-id',route.project):null;
      const zone=node=>node.closest('header')?'header':node.closest('nav')?'nav':node.closest('aside')?'aside':node.closest('main')?'main':'other';
      const excluded=node=>!!node.closest('[data-message-author-role], textarea, input, [contenteditable]:not([contenteditable="false"]), [role="textbox"]');
      const normalize=value=>typeof value==='string'?value.replace(/\s+/g,' ').trim().slice(0,300):'';
      const anchors=[];
      const rawAnchors=[...this.document.querySelectorAll('a[href]')];
      for(const node of rawAnchors){
        if(anchors.length>=80||excluded(node))continue;
        let href;try{href=new URL(node.getAttribute('href'),page.href);}catch{continue;}
        if(href.origin!=='https://chatgpt.com')continue;
        const info=routeInfo(href.pathname);
        const segment=href.pathname.match(/^\/g\/([^/]+)/)?.[1]||null;
        const pid=info.project||projectId(segment);
        if(!pid&&!href.pathname.includes('/project'))continue;
        const label=normalize(node.textContent)||normalize(node.getAttribute('aria-label'));
        const pidDigest=pid?await digest('project-id',pid):null;
        anchors.push({
          kind:info.kind,
          zone:zone(node),
          visible:this.visible(node),
          projectDigest:pidDigest,
          labelDigest:label?await digest('project-name',label):null,
          labelLength:[...label].length,
          matchesRouteProject:!!routeProjectDigest&&pidDigest===routeProjectDigest,
          currentConversation:!!route.chatId&&info.chatId===route.chatId,
          selected:node.getAttribute('aria-current')==='page'||node.getAttribute('data-state')==='active'
        });
      }
      const nested=[];
      if(route.chatId){
        const current=rawAnchors.filter(node=>{
          if(excluded(node))return false;
          try{
            const href=new URL(node.getAttribute('href'),page.href),info=routeInfo(href.pathname);
            return info.chatId===route.chatId;
          }catch{return false;}
        });
        for(const link of current.slice(0,20)){
          let ancestor=link.parentElement;
          for(let depth=1;ancestor&&depth<=6;depth++,ancestor=ancestor.parentElement){
            const candidates=[...ancestor.querySelectorAll('a[href]')].filter(node=>!excluded(node));
            let found=false;
            for(const node of candidates.slice(0,80)){
              let href;try{href=new URL(node.getAttribute('href'),page.href);}catch{continue;}
              if(href.origin!=='https://chatgpt.com')continue;
              const segment=href.pathname.match(/^\/g\/([^/]+)\/project\/?$/)?.[1];
              const pid=projectId(segment);
              if(!pid)continue;
              const label=normalize(node.textContent)||normalize(node.getAttribute('aria-label'));
              nested.push({
                distance:depth,
                projectDigest:await digest('project-id',pid),
                labelDigest:label?await digest('project-name',label):null,
                labelLength:[...label].length,
                visible:this.visible(node)
              });
              found=true;break;
            }
            if(found)break;
          }
        }
      }
      const attributes=[];
      for(const node of [...this.document.querySelectorAll('[data-project-id],[data-project-name],[data-testid*="project"]')]){
        if(attributes.length>=40||excluded(node))continue;
        const rawId=normalize(node.getAttribute('data-project-id'));
        const rawName=normalize(node.getAttribute('data-project-name'));
        const testId=normalize(node.getAttribute('data-testid'));
        attributes.push({
          tag:String(node.tagName||'').toLowerCase(),
          zone:zone(node),
          visible:this.visible(node),
          projectIdDigest:rawId?await digest('project-id-attr',rawId):null,
          projectNameDigest:rawName?await digest('project-name',rawName):null,
          testIdDigest:testId?await digest('project-testid',testId):null
        });
      }
      return {
        schemaVersion:1,
        code:'OK',
        route:{kind:route.kind,projectDigest:routeProjectDigest},
        anchors,
        nestedMemberships:nested.slice(0,20),
        attributes,
        counts:{
          projectAnchors:anchors.length,
          matchingRouteProjectAnchors:anchors.filter(item=>item.matchesRouteProject).length,
          namedMatchingRouteAnchors:anchors.filter(item=>item.matchesRouteProject&&item.labelDigest).length,
          currentConversationLinks:anchors.filter(item=>item.currentConversation).length,
          nestedMemberships:nested.length,
          projectAttributes:attributes.length
        },
        privacy:{messageBodiesRead:false,assistantBodiesRead:false,draftsRead:false,rawProjectIdsEmitted:false,rawProjectNamesEmitted:false,urlsEmitted:false}
      };
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
        const unknownTurns = allRoots.length ? [] : [...main.querySelectorAll('[data-testid^="conversation-turn-"]')]
          .filter(node => this.visible(node) && !node.matches('[data-message-author-role]') && !node.querySelector('[data-message-author-role]'));
        structure.turnMarkerCount = unknownTurns.length;
        return {code: unknownTurns.length ? 'ADAPTER_MISMATCH' : 'NO_MESSAGES', scanned: 0, structure};
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
      let stale = false, limited = false;
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
        const bound = this.nodeBindings.get(root), knownChats=this.identities.get(sourceMessageId);
        const sharedProof=(!bound||bound.messageId!==sourceMessageId)&&globalThis.ArchiveResponseTime?.owns?.(route.id,sourceMessageId)===true;
        if ((bound && bound.messageId === sourceMessageId && bound.chatId !== route.id) ||
            (knownChats && !knownChats.has(route.id) && !sharedProof)) {
          stale = true;
          row.staleIdentity = true;
          continue;
        }
        if(!knownChats?.has(route.id)&&this.identityBindings>=10000){limited=true;continue;}
        this.nodeBindings.set(root, {chatId: route.id, messageId: sourceMessageId});
        const chats=knownChats||new Set();
        if(!chats.has(route.id)){chats.add(route.id);this.identityBindings++;}
        this.identities.set(sourceMessageId,chats);
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
        return {code: limited ? 'ADAPTER_LIMIT' : 'ADAPTER_MISMATCH', scanned: roots.length, structure};
      }
      const title = this.document.title.replace(/\s*[-–—|]\s*ChatGPT\s*$/i, '').trim() || 'ChatGPT';
      // Stability belongs to a message, not to the entire changing conversation.
      // Keep unconfirmed text unread and avoid starving stable neighbours.
      const stable = [];
      for (const candidate of candidates) {
        const {root,container,sourceMessageId}=candidate;
        const signature=JSON.stringify([route.id,sourceMessageId,this.token(container),this.nodeRevisions.get(root)||0]);
        const pending=this.pending.get(root);
        if(!pending||pending.signature!==signature){this.pending.set(root,{signature,since:now});continue;}
        if(now-pending.since>=STABILITY_MS)stable.push(candidate);
      }
      if(!stable.length)return {code:'UNSTABLE_PAGE',scanned:roots.length,structure};
      const degraded=inspected.some(({row,containers})=>!row.idOnRole||row.editorPassed&&!row.busy&&containers.length!==1);
      const messages = [];
      let oversized = false;
      for (const {root,container, sourceMessageId, pageOrder} of stable) {
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
        code: oversized ? 'MESSAGE_TOO_LARGE' : limited ? 'ADAPTER_LIMIT' : degraded ? 'ADAPTER_MISMATCH' : (messages.length ? 'CAPTURING' : 'NO_MESSAGES'),
        pendingCandidates: candidates.length-stable.length,
        scanned: roots.length,
        structure,
        chat: {id: route.id, url: route.url, title: title.slice(0, 500)},
        messages
      };
    }
  }

  globalThis.ChatGPTAdapter = ChatGPTAdapter;
})();
