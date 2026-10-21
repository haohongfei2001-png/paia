/* PAIA website examples. Deliberately ephemeral: no archive, AI, or storage APIs. */
(() => {
  'use strict';
  const zh = document.documentElement.lang.startsWith('zh');
  const t = (z, e) => zh ? z : e;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const node = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };

  for (const menu of $$('.mobile-menu')) {
    menu.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !menu.open) return;
      menu.open = false;
      $('summary', menu).focus();
    });
    document.addEventListener('click', event => {
      if (menu.open && !menu.contains(event.target)) menu.open = false;
    });
    $$('a', menu).forEach(a => a.addEventListener('click', () => { menu.open = false; }));
  }

  for (const root of $$('[data-workspace]')) {
    const entries = [
      {
        title: t('第一版，究竟留下什么？', 'What belongs in the first version?'),
        name: t('一个产品的起点', 'Where a product begins'),
        project: t('产品探索', 'Product exploration'), date:'2026-10-12', dateLabel:t('2026 年 10 月 12 日','12 October 2026'), earlierDate:'2026-10-08', earlierLabel:t('10 月 8 日','8 October'), earlier:t('先把“找回来”做好，再决定要不要生成更多。','Make finding things work first. Then decide whether to generate more.'),
        original: t('我想做的，也许不是一个让人写得更多的工具。\n而是让已经说过的话，在下一次需要时，还找得到。', 'Maybe the tool I want to make is not one that helps people write more.\nIt is one that helps them find what they have already said, when they need it again.'),
      },
      {
        title: t('用自己的语言，再说一次。', 'Say it again, in my own words.'),
        name: t('把想法说清楚', 'Finding my own words'),
        project: t('写作练习','Writing practice'), date:'2026-10-10', dateLabel:t('2026 年 10 月 10 日','10 October 2026'), earlierDate:'2026-10-03', earlierLabel:t('10 月 3 日','3 October'), earlier:t('我想先找到自己的说法，再考虑怎样写得更流畅。','I want to find my own way of saying it before making it more fluent.'),
        original: t('我不想让文字听起来更像“一个正确的答案”。\n有些犹豫，也是我真正想说的一部分。', 'I do not want my writing to sound more like “the right answer.”\nSome of the hesitation is part of what I actually mean.'),
      },
      {
        title: t('这个选择，还适合现在的我吗？', 'Does this choice still fit who I am now?'),
        name: t('我真正想要什么', 'What matters to me'),
        project: t('选择与决定','Choices and decisions'), date:'2026-10-09', dateLabel:t('2026 年 10 月 9 日','9 October 2026'), earlierDate:'2026-09-28', earlierLabel:t('9 月 28 日','28 September'), earlier:t('我曾经觉得，选择一条稳定的路会让我安心。','I once thought that choosing a stable path would give me peace of mind.'),
        original: t('上一次，我说稳定最重要。现在我还不确定。\n也许我需要重新考虑，什么是自己愿意长期做的事情。', 'Last time, I said stability mattered most. Now I am not so sure.\nPerhaps I need to reconsider what I want to keep doing over time.'),
      },
    ];
    for (const entry of entries) entry.working = entry.original;
    let selected = root.dataset.initialEntry === '1' ? 1 : 0;
    const tabs = $$('[data-space]', root);
    const panels = $$('[data-space-panel]', root);
    const setSpace = (space, focus = false) => {
      root.dataset.activeSpace = space;
      for (const tab of tabs) {
        const active = tab.dataset.space === space;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
        if (active && focus) tab.focus();
      }
      for (const panel of panels) panel.hidden = panel.dataset.spacePanel !== space;
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => setSpace(tab.dataset.space));
      tab.addEventListener('keydown', event => {
        let next = index;
        if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
        else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
        else if (event.key === 'Home') next = 0;
        else if (event.key === 'End') next = tabs.length - 1;
        else return;
        event.preventDefault();
        setSpace(tabs[next].dataset.space, true);
      });
    });
    const editing = $('[data-edit-form]', root);
    const working = $('[data-working-text]', root);
    const feedback = $('[data-workspace-status]', root);
    const endEdit = () => {
      editing.hidden = true;
      working.hidden = false;
      $('[data-edit]', root).hidden = false;
    };
    const renderEntry = () => {
      const entry = entries[selected];
      $('[data-reader-title]', root).textContent = entry.title;
      $('[data-reader-crumb]', root).textContent = entry.name;
      $('[data-reader-project]', root).textContent = entry.project;
      $('[data-reader-date]', root).dateTime = entry.date;
      $('[data-reader-date]', root).textContent = entry.dateLabel;
      $('[data-reader-source]', root).textContent = 'ChatGPT · '+entry.date;
      const sourceDate = $('[data-reader-source-date]', root);
      if (sourceDate) sourceDate.textContent = entry.date.split('-').reverse().join('.');
      $('[data-earlier-date]', root).dateTime = entry.earlierDate;
      $('[data-earlier-date]', root).textContent = entry.earlierLabel;
      $('[data-earlier-text]', root).textContent = entry.earlier;
      working.textContent = entry.working;
      $('[data-original-text]', root).textContent = entry.original;
      $('[data-source-note]', root).hidden = true;
      $('[data-source-toggle]', root).setAttribute('aria-expanded', 'false');
      $$('[data-entry]', root).forEach(button => { const active = +button.dataset.entry === selected; button.classList.toggle('is-selected', active); button.setAttribute('aria-pressed', String(active)); });
      endEdit();
      feedback.textContent = t('工作文字可以修改，原始来源始终保留。', 'You can edit the working text. The original source stays intact.');
    };
    $$('[data-entry]', root).forEach(button => button.addEventListener('click', () => {
      // A working edit stays open until the visitor saves or cancels it.
      if (!editing.hidden) {
        feedback.textContent = t('先保留或取消这次修改，再打开另一段表达。', 'Keep or cancel this edit before opening another expression.');
        $('[data-edit-text]', root).focus();
        return;
      }
      selected = +button.dataset.entry;
      renderEntry();
    }));
    const filterArchive = () => {
      const q = $('[data-archive-search]', root).value.toLocaleLowerCase().trim();
      let visible = 0;
      $$('[data-entry]', root).forEach((button, i) => {
        button.hidden = !`${entries[i].project} ${entries[i].name} ${entries[i].title} ${entries[i].original} ${entries[i].working}`.toLocaleLowerCase().includes(q);
        if (!button.hidden) visible++;
      });
      $('[data-search-empty]', root).hidden = visible !== 0;
    };
    $('[data-archive-search]', root).addEventListener('input', filterArchive);
    $('[data-edit]', root).addEventListener('click', () => {
      $('[data-edit-text]', root).value = entries[selected].working;
      editing.hidden = false;
      working.hidden = true;
      $('[data-edit]', root).hidden = true;
      $('[data-edit-text]', root).focus();
    });
    $('[data-save-edit]', root).addEventListener('click', () => {
      const next = $('[data-edit-text]', root).value;
      if (!next.trim()) {
        feedback.textContent = t('工作文字不能为空。保留一些文字，或取消这次修改。', 'Working text cannot be empty. Keep some text, or cancel this edit.');
        $('[data-edit-text]', root).focus();
        return;
      }
      entries[selected].working = next;
      working.textContent = next;
      filterArchive();
      endEdit();
      feedback.textContent = t('本页工作文字已更新。原始来源没有改变；刷新会重置示例。', 'Working text updated in this page. The source is unchanged; reloading resets the example.');
      $('[data-edit]', root).focus();
    });
    $('[data-cancel-edit]', root).addEventListener('click', () => {
      endEdit();
      $('[data-edit]', root).focus();
    });
    $('[data-source-toggle]', root).addEventListener('click', event => {
      const button = event.currentTarget;
      const expanded = button.getAttribute('aria-expanded') !== 'true';
      button.setAttribute('aria-expanded', String(expanded));
      $('[data-source-note]', root).hidden = !expanded;
    });
    $$('[data-section]', root).forEach(button => button.addEventListener('click', () => {
      $('.thought-directory', root).hidden = true;
      $('[data-thought-reader]', root).hidden = false;
      $('[data-section-title]', root).textContent = button.textContent.trim();
      const item = button.dataset.section === 'writing' ? entries[1] : entries[0];
      $('[data-section-text]', root).textContent = button.dataset.section === 'begin' ? entries[0].earlier : item.working;
      $('[data-thought-back]', root).focus({preventScroll:true});
    }));
    $('[data-thought-back]', root).addEventListener('click', () => {
      $('.thought-directory', root).hidden = false;
      $('[data-thought-reader]', root).hidden = true;
      $('[data-section]', root).focus({preventScroll:true});
    });
    if (selected !== 0) renderEntry();
    if (document.body.dataset.page === 'demo.html') {
      const initial = location.hash.slice(1);
      if (['archive', 'thought', 'context'].includes(initial)) setSpace(initial);
    }
  }

})();
