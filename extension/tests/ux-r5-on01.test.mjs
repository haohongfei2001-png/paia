import test from 'node:test';
import assert from 'node:assert/strict';
import {TopicAIViewSession} from '../core/topic-ai-view-session.js';

test('UX-R5 topic AI view state is tab-local, per-topic and separates view positions',()=>{
 const s=new TopicAIViewSession({maxTopics:2});
 assert.equal(s.view('topic-a'),'original');
 s.setView('topic-a','ai');
 s.remember('topic-a','original',{scroll:140,cursor:{page:1},pages:[null],query:'原话',anchor:null});
 s.remember('topic-a','ai',{scroll:620,cursor:null,pages:[],query:'整理',anchor:null});
 assert.equal(s.view('topic-a'),'ai');
 assert.equal(s.view('topic-b'),'original');
 assert.deepEqual(s.position('topic-a','original'),{scroll:140,cursor:{page:1},pages:[null],query:'原话'});
 assert.deepEqual(s.position('topic-a','ai'),{scroll:620,cursor:null,pages:[],query:'整理'});
 const copy=s.position('topic-a','original');copy.pages.push('mutated');assert.deepEqual(s.position('topic-a','original').pages,[null]);
});

test('UX-R5 topic AI view session remains bounded and never invents an AI default',()=>{
 const s=new TopicAIViewSession({maxTopics:2});
 s.setView('topic-a','ai');s.setView('topic-b','ai');assert.equal(s.view('topic-a'),'ai');
 s.setView('topic-c','ai');
 assert.equal(s.view('topic-b'),'original','least-recent topic is evicted back to safe Original default');
 assert.equal(s.view('topic-a'),'ai');assert.equal(s.view('topic-c'),'ai');
 assert.throws(()=>s.setView('topic-c','invalid'),/INVALID_TOPIC_VIEW/);
 assert.throws(()=>s.remember('topic-c','ai',{scroll:-1}),/INVALID_TOPIC_POSITION/);
});
