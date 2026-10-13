import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const ui=new URL('../ui/',import.meta.url);

// Production stylesheet order, synthetic DOM only: validates palette/cascade, not
// approved screenshot equivalence or data-owner/browser journey acceptance.
test('approved white refinement reaches real four-space roles in the complete production cascade',async()=>{
 const html=await readFile(new URL('archive.html',ui),'utf8');
 const sheets=[...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map(match=>match[1]);
 assert.ok(sheets.includes('app-shell.css')&&sheets.includes('context-cards.css'));
 const css=(await Promise.all(sheets.map(name=>readFile(new URL(name,ui),'utf8')))).join('\n');
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||(process.platform==='darwin'?'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome':undefined)});
 try{
  const page=await browser.newPage({reducedMotion:"reduce"});
  await page.route('**/*',route=>route.abort());
  await page.setContent(`<style>${css}</style><body><aside class="sidebar"><nav id="primary-nav"><button aria-current="page">Archive</button></nav></aside><div class="workspace"><h1 id="workspace-heading">Synthetic title</h1><div id="document-body"><div class="library-prose">Synthetic prose</div></div><article id="thought-document" class="dvn-topic-composition"><div id="topic-heading"><h1>Thought title</h1></div><div id="original-reading-body"><div class="entry-prose">Synthetic Thought</div></div></article><div id="settings-panel"><nav class="ux-settings-nav"><button aria-current="page">Reading</button></nav></div><button class="context-access" data-on="true">Allowed</button><button id="paused-card" class="context-access" data-on="true" data-paused="true">Paused card</button><button id="paused-topic" class="topic-access" data-on="true" data-paused="true">Paused Topic</button><span id="muted-probe" style="color:var(--muted)">Muted</span><div id="archive-compact-nav-items"><button aria-current="page">Archive</button></div><article class="personal-topic-block"><h2 class="personal-topic-title">Topic</h2><a class="personal-section-link">Chapter</a></article><div class="context-card"><h2 class="card-title">Information</h2></div><div class="context-item"><div class="item-text">Synthetic context</div></div><div id="error-probe" style="color:var(--paia-danger)">Error</div></div></body>`);
  const inspect=()=>page.evaluate(()=>{
   const style=selector=>getComputedStyle(document.querySelector(selector));
   const body=style('body');
   return {ink:body.getPropertyValue('--text').trim(),canvas:body.getPropertyValue('--bg').trim(),rail:style('.sidebar').backgroundColor,prose:style('.library-prose').color,leading:style('.library-prose').lineHeight,size:style('.library-prose').fontSize,width:body.getPropertyValue('--paia-prose-width').trim(),title:style('#workspace-heading').color,heading:style('.card-title').color,thoughtTitle:style('#topic-heading h1').color,settingsSelected:style('.ux-settings-nav button').color,permission:style('.context-access').color,pausedCard:style('#paused-card').color,pausedTopic:style('#paused-topic').color,muted:style('#muted-probe').color,card:style('.context-card').backgroundColor,topicCard:style('.personal-topic-block').backgroundColor,shadow:style('.context-card').boxShadow,directory:style('.personal-section-link').color,selected:style('#primary-nav button').color,selectedFill:style('#primary-nav button').backgroundColor,context:style('.item-text').color,thought:style('#original-reading-body .entry-prose').color,compactSelected:style('#archive-compact-nav-items button').color,danger:style('#error-probe').color,accent:body.getPropertyValue('--paia-accent').trim()};
  });
  for(const space of ['archive','library','thoughts','memory','settings']){
   await page.evaluate(space=>{document.body.dataset.paiaSpace=space;document.documentElement.dataset.paiaTheme='light';},space);
   const light=await inspect();assert.equal(light.pausedCard,light.muted);assert.equal(light.pausedTopic,light.muted);assert.notEqual(light.pausedCard,light.permission);
   assert.equal(light.ink,'#222832',space);assert.equal(light.canvas,'#ffffff');assert.equal(light.rail,'rgb(252, 253, 255)');
   assert.equal(light.prose,'rgb(52, 59, 69)');assert.equal(light.context,light.prose);assert.equal(light.thought,light.prose);assert.equal(light.compactSelected,light.selected);assert.equal(light.title,'rgb(36, 45, 59)');assert.equal(light.thoughtTitle,light.title);assert.equal(light.settingsSelected,light.selected);assert.equal(light.permission,light.selected);assert.equal(light.heading,'rgb(43, 53, 67)');
   assert.equal(light.card,'rgb(255, 255, 255)');assert.equal(light.topicCard,light.card);assert.notEqual(light.shadow,'none');assert.equal(light.directory,'rgb(82, 94, 109)');
   assert.equal(light.selected,'rgb(48, 94, 172)');assert.equal(light.selectedFill,'rgb(237, 243, 255)');assert.notEqual(light.danger,light.selected);assert.equal(light.accent,'#3769c9');
   assert.equal(parseFloat(light.leading)/parseFloat(light.size),1.65);
   await page.evaluate(()=>{document.documentElement.dataset.paiaTheme='dark';});
   const dark=await inspect();assert.equal(dark.pausedCard,dark.muted);assert.equal(dark.pausedTopic,dark.muted);assert.notEqual(dark.pausedCard,dark.permission);assert.equal(dark.canvas,'#1a2028');assert.equal(dark.card,'rgb(32, 39, 49)');assert.equal(dark.prose,'rgb(215, 221, 229)');assert.equal(dark.context,dark.prose);assert.notEqual(dark.danger,dark.selected);
  }
  await page.evaluate(()=>{document.documentElement.style.setProperty('--paia-prose-size','21px');document.documentElement.style.setProperty('--paia-prose-width','620px');});
  const saved=await inspect();assert.equal(saved.size,'21px');assert.equal(saved.width,'620px');assert.equal(saved.leading,'34.65px');
  await page.evaluate(()=>{delete document.body.dataset.paiaSpace;document.documentElement.dataset.paiaTheme='light';});
  await page.setViewportSize({width:390,height:844});
  await page.evaluate(()=>{document.body.dataset.paiaSpace='memory';});
  const narrow=await inspect();assert.equal(narrow.compactSelected,'rgb(48, 94, 172)');assert.equal(narrow.context,'rgb(52, 59, 69)');
  await page.emulateMedia({forcedColors:'active'});
  await page.locator('#primary-nav button').focus();
  const outline=await page.locator('#primary-nav button').evaluate(node=>{const style=getComputedStyle(node);return {style:style.outlineStyle,width:style.outlineWidth};});
  assert.notEqual(outline.style,'none');assert.ok(parseFloat(outline.width)>=2);
  await page.emulateMedia({forcedColors:'none'});
  await page.evaluate(()=>{delete document.body.dataset.paiaSpace;});
  const unrelated=await inspect();assert.equal(unrelated.ink,'#263031');assert.equal(unrelated.accent,'#8d4937');
 }finally{await browser.close();}
});
