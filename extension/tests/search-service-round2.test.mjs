import test from 'node:test';
import assert from 'node:assert/strict';
import {
 normalizeSearch,searchRank,rankSearchPage,queryTerms,prepareSearchQuery,
 rankLexicalCandidate,searchExcerpt,SEARCH_SERVICE_VERSION
} from '../core/search-service.js';
import {searchRank as legacyRank} from '../core/search-ranking.js';
import {rankCandidate,contextExcerpt} from '../core/memory/retrieval.js';

test('Round 2 Search Service preserves established Input and Thought rank semantics',()=>{
 assert.equal(SEARCH_SERVICE_VERSION,1);
 assert.equal(normalizeSearch('  Ｎeedle  '),'needle');
 assert.equal(searchRank('Ｎeedle','needle'),0);
 assert.equal(searchRank('needle','A Needle Topic'),1);
 assert.equal(searchRank('needle','Other','needle in body'),2);
 assert.equal(searchRank('needle','Needle','needle',true),3);
 assert.equal(searchRank('missing','Other','body'),-1);
 assert.equal(legacyRank('needle','Needle'),searchRank('needle','Needle'));
 assert.deepEqual(rankSearchPage([
  {id:'old',rank:2,sourceSentAt:'2020-01-01'},
  {id:'new',rank:2,sourceSentAt:'2025-01-01'},
  {id:'title',rank:0}
 ]).map(x=>x.id),['title','new','old']);
});

test('Round 2 Search Service shares Chinese/Latin query preparation with Context retrieval',()=>{
 const terms=queryTerms('我应该如何继续完善 PAIA 思想整理？');
 assert.ok(terms.includes('paia'));
 assert.ok(terms.some(x=>x==='思想'));
 assert.ok(!terms.includes('应该'));
 const prepared=prepareSearchQuery('PAIA 思想整理');
 const item={id:'e1',body:'PAIA 的思想整理应该保留用户原话。',title:'整理原则',topicName:'PAIA',sectionTitle:'思想整理',human:true,pinned:false};
 const shared=rankLexicalCandidate(item,'PAIA 思想整理',prepared);
 const context=rankCandidate(item,'PAIA 思想整理',prepared);
 assert.equal(context.score,shared.score);
 assert.deepEqual(context.why,shared.why);
 assert.ok(shared.score>0);
});

test('Round 2 Search Service excerpts long Unicode text around relevant evidence without splitting emoji',()=>{
 const body='前文🙂'.repeat(160)+'TAIL_QUERY_PAIA 这里是需要重新找到的旧内容🙂。'+'后文🙂'.repeat(160);
 const excerpt=searchExcerpt(body,'TAIL_QUERY_PAIA',180);
 assert.match(excerpt,/TAIL_QUERY_PAIA/);
 assert.ok([...excerpt].length<=180);
 assert.ok(!excerpt.includes('\uFFFD'));
 assert.equal(contextExcerpt(body,'TAIL_QUERY_PAIA',180),excerpt);
});
