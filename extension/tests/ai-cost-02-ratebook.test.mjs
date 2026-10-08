import test from 'node:test';import assert from 'node:assert/strict';
import {quoteUsage,quoteRequestBound,qualifiedRatebook,ROUTE_FIELDS} from '../core/ai-usage/ratebook.js';
const now=100000000,route=Object.fromEntries(ROUTE_FIELDS.map(k=>[k,k==='currency'?'CNY':'synthetic-'+k]));
const book=()=>({route:{...route},rates:{standardInput:2000000,cachedReadInput:500000,cacheCreateInput:3000000,completion:4000000},effectiveAt:0,verifiedAt:now-1,expiresAt:now+1,source:'SYNTHETIC_NOT_LIVE_TARIFF',verified:true,inputBand:{minInclusive:0,maxInclusive:16000}});
const fx=()=>({version:'synthetic-fx',verified:true,observedAt:now-1,expiresAt:now+1,source:'SYNTHETIC_NOT_MARKET_RATE',cnyMicrosPerUsd:7000000,reservationCnyMicrosPerUsd:6500000});
const usage={standardInput:100,cachedReadInput:20,cacheCreateInput:10,completion:50};
test('synthetic tariff uses exact fixed precision, conservative rounding and one normalized reservation',()=>{
 const q=quoteUsage({book:book(),route,now,usage,fx:fx()});assert.deepEqual(q,{nativeCurrency:'CNY',nativeMicros:440,usdReservationMicros:68,pricingVersion:'synthetic-pricingVersion',fxVersion:'synthetic-fx'});
 assert.throws(()=>quoteUsage({book:book(),route,now,usage:q,fx:fx()}));
 const b=book();b.route.currency='USD';assert.equal(quoteUsage({book:b,route:b.route,now,usage}).usdReservationMicros,440);
});
test('every route dimension must match and stale or unverified prices fail closed',()=>{
 for(const k of ROUTE_FIELDS)assert.throws(()=>qualifiedRatebook(book(),{...route,[k]:'mismatch'},now));
 for(const patch of [{verified:false},{verifiedAt:now-86400001},{verifiedAt:now+1},{expiresAt:now},{effectiveAt:now+1}])assert.throws(()=>qualifiedRatebook({...book(),...patch},route,now));
 const b=book(),copy=qualifiedRatebook(b,route,now);b.rates.completion=0;assert.equal(copy.rates.completion,4000000);
});
test('CNY requires fresh previously verified FX and never treats hypothetical F=7 as authority',()=>{
 for(const patch of [{verified:false},{observedAt:now-86400001},{expiresAt:now},{cnyMicrosPerUsd:0},{reservationCnyMicrosPerUsd:8000000}])assert.throws(()=>quoteUsage({book:book(),route,now,usage,fx:{...fx(),...patch}}));
 assert.throws(()=>quoteUsage({book:book(),route,now,usage}));
});
test('malformed rates, categories and unsafe arithmetic are rejected',()=>{
 for(const v of [-1,NaN,Infinity,1.5]){const b=book();b.rates.standardInput=v;assert.throws(()=>quoteUsage({book:b,route,now,usage,fx:fx()}));}
 const b=book();b.rates.completion=Number.MAX_SAFE_INTEGER;assert.throws(()=>quoteUsage({book:b,route,now,usage:{...usage,completion:Number.MAX_SAFE_INTEGER},fx:fx()}),{code:'COST_OVERFLOW'});
 assert.throws(()=>quoteUsage({book:book(),route,now,usage:{...usage,reasoning:1},fx:fx()}));
});

test('length-tier tariff cannot price an input outside its qualified band',()=>{const b=book();b.inputBand.maxInclusive=100;assert.throws(()=>quoteUsage({book:b,route,now,usage,fx:fx()}),{code:'RATEBOOK_INPUT_BAND'});});

test('request reservation never guesses a cache hit or undercounts reasoning output',()=>{const q=quoteRequestBound({book:book(),route,now,inputTokens:100,billableOutputCap:50,fx:fx()});assert.equal(q.nativeMicros,500);assert.equal(q.usdReservationMicros,77);});
