import test from 'node:test';
import assert from 'node:assert/strict';
import {topicPresentationFacts} from '../ui/topic-workspace-presentation.js';
test('Topic presentation derives only verified year coverage without inventing conversations',()=>{
 const facts=topicPresentationFacts({coverage:'complete',knownYearCounts:{2026:3,2025:2,2021:1},unknownCount:1});
 assert.equal(facts.caption,'2021—2026 · 已收录的表达');assert.equal(facts.coverage,'按时间完整浏览，不按“重要性”删表达。6条有时间，另1条时间未知。');assert.deepEqual(facts.years,['2026','2025','2021','unknown']);assert.doesNotMatch(facts.caption,/跨会话/);
});
test('Topic presentation respects current order and does not invent empty years',()=>{
 assert.deepEqual(topicPresentationFacts({coverage:'complete',knownYearCounts:{2026:1,2025:0,2021:1},unknownCount:0},'asc').years,['2021','2026']);
});
test('incomplete Topic metadata never claims full count or dates',()=>{
 assert.deepEqual(topicPresentationFacts({coverage:'partial',knownYearCounts:{2026:100}}),{caption:'表达时间范围尚未核对',coverage:'当前仅显示已载入的表达。',years:[]});
});
