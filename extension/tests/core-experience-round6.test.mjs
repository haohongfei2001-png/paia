import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../ui/archive.html',import.meta.url),'utf8');
const thoughts=readFileSync(new URL('../ui/thoughts.js',import.meta.url),'utf8');

const between=(start,end)=>{
  const a=html.indexOf(start),b=html.indexOf(end,a+start.length);
  assert.ok(a>=0,`missing start marker: ${start}`);
  assert.ok(b>a,`missing end marker: ${end}`);
  return html.slice(a,b);
};

test('Round 6: empty Thought Library closes the first-value path through Settings without putting Organizer controls on the reading home',()=>{
  const empty=between('<div id="thought-empty">','</div><button id="thought-more"');
  assert.match(empty,/Thought Library 会把 Input Archive 中值得长期保留的内容整理成可以持续回看的主题。/u);
  assert.match(empty,/整理不会自动开始，也不会因为打开思想库而调用 AI。/u);
  assert.match(empty,/id="thought-empty-settings" data-view="settings">前往 Settings 整理新内容/u);
  assert.doesNotMatch(empty,/bounded-original-start|start-thought-library|deepseek-api-key/u);

  const panel=between('<section id="thought-panel"','</section>\n<dialog id="library-dialog"');
  assert.doesNotMatch(panel,/bounded-original-start|bounded-ai-start|deepseek-api-key/u);
});

test('Round 6: AI Context home distinguishes authorization from sharing and tells the user what happens next',()=>{
  const home=between('<section id="memory-home">','<section id="memory-authorizations"');
  assert.match(home,/AI 只能从你允许的内容中选择/u);
  assert.match(home,/可进入上下文<strong id="memory-allowed">0 个主题/u);
  assert.match(home,/仍未授权<strong id="memory-denied">0 个主题/u);
  assert.match(home,/授权不是发送/u);
  assert.match(home,/不会自动把内容交给任何 AI/u);
  assert.match(home,/只有你在预览后主动复制或导出，内容才会离开 PAIA/u);
  assert.match(home,/准备上下文只在本机检索与组合，不调用外部 AI/u);
  assert.match(home,/id="memory-manage">选择 AI 可用内容/u);
});

test('Round 6: Settings exposes one normal Thought Library update path and collapses bounded multi-request controls',()=>{
  const settings=between('<h2>Thought Library 整理</h2>','<fieldset id="deepseek-settings">');
  assert.match(settings,/id="original-library-menu"/u);
  assert.match(settings,/id="organizer-batch-actions"><summary>批量整理/u);
  assert.match(settings,/id="bounded-original-start">批量整理新内容/u);
  assert.match(settings,/id="bounded-ai-start">批量更新 AI整理/u);
  assert.match(settings,/id="start-thought-library" hidden aria-hidden="true" tabindex="-1"/u);
  assert.match(settings,/默认使用单次整理/u);
  assert.match(settings,/达到上限后不会自动继续/u);
  assert.match(thoughts,/\$\('start-thought-library'\)\.addEventListener/u,'hidden compatibility node must remain because the current controller still binds it');
});

test('Round 6: closure is UI-only and does not add a second runtime entry script',()=>{
  const scripts=[...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/gu)].map(match=>match[1]);
  assert.deepEqual(scripts,['archive.js']);
  assert.equal((html.match(/id="memory-allowed"/gu)||[]).length,1);
  assert.equal((html.match(/id="memory-denied"/gu)||[]).length,1);
  assert.equal((html.match(/id="start-thought-library"/gu)||[]).length,1);
});
