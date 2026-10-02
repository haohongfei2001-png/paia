import test from 'node:test';
import assert from 'node:assert/strict';
import {readerTimestamp} from '../ui/capture-time-view.js';
const format=(timeZone,seconds=false)=>({unknown:'发送时间未知',day:t=>new Intl.DateTimeFormat('zh-CN',{timeZone,year:'numeric',month:'long',day:'numeric'}).format(new Date(t)),time:t=>new Intl.DateTimeFormat('zh-CN',{timeZone,hour:'2-digit',minute:'2-digit',...(seconds?{second:'2-digit'}:{}),hour12:false}).format(new Date(t))});
test('Reader metadata never substitutes capture time for unknown or invalid expression time',()=>{for(const value of [null,undefined,'','invalid'])assert.equal(readerTimestamp(value,format('UTC')),'发送时间未知');});
test('Reader inline date and clock describe the same authoritative instant across midnight and timezones',()=>{const value='2026-09-18T20:24:31.000Z';assert.equal(readerTimestamp(value,format('UTC')),'2026年9月18日 · 20:24');assert.equal(readerTimestamp(value,format('Asia/Shanghai')),'2026年9月19日 · 04:24');assert.equal(value,'2026-09-18T20:24:31.000Z');});
test('Reader metadata respects configured seconds and does not reorder reversed reading sequences',()=>{const values=['2026-09-18T10:24:31.000Z','2024-05-09T18:36:02.000Z'];assert.deepEqual(values.map(t=>readerTimestamp(t,format('UTC',true))),['2026年9月18日 · 10:24:31','2024年5月9日 · 18:36:02']);});
