// Pure policy over already verified service facts. No signature verification,
// credentials, network, persistent ledger or production route admission here.
import {exact,integer,fail} from './contracts.js';
export const ROUTE_FIELDS=Object.freeze(['provider','model','resolutionVersion','region','deployment','market','api','profile','tier','currency','tokenizer','pricingVersion']);
const categories=['standardInput','cachedReadInput','cacheCreateInput','completion'];
const positive=n=>integer(n)&&n>0;
const ceiling=(n,d)=>{const value=(n+d-1n)/d;if(value>BigInt(Number.MAX_SAFE_INTEGER))fail('COST_OVERFLOW');return Number(value);};
export function qualifiedRatebook(book,route,now){
 exact(book,['route','rates','effectiveAt','verifiedAt','expiresAt','source','verified','inputBand']);exact(book.route,ROUTE_FIELDS);exact(route,ROUTE_FIELDS);exact(book.rates,categories);exact(book.inputBand,['minInclusive','maxInclusive']);
 if(!integer(book.inputBand.minInclusive)||!integer(book.inputBand.maxInclusive)||book.inputBand.minInclusive>book.inputBand.maxInclusive)fail('RATEBOOK_UNQUALIFIED');
 if(!integer(now)||book.verified!==true||!ROUTE_FIELDS.every(k=>typeof route[k]==='string'&&route[k].length>0&&route[k].length<=200&&book.route[k]===route[k])||!['USD','CNY'].includes(route.currency)||!categories.every(k=>integer(book.rates[k]))||![book.effectiveAt,book.verifiedAt,book.expiresAt].every(integer)||book.effectiveAt>now||book.verifiedAt>now||now-book.verifiedAt>86400000||book.expiresAt<=now||typeof book.source!=='string'||!book.source.length)fail('RATEBOOK_UNQUALIFIED');
 return structuredClone(book);
}
export function quoteUsage({book,route,now,usage,fx}){
 const qualified=qualifiedRatebook(book,route,now);exact(usage,categories);if(!categories.every(k=>integer(usage[k])))fail('USAGE_INVALID');
 const input=usage.standardInput+usage.cachedReadInput+usage.cacheCreateInput;if(!integer(input)||input<qualified.inputBand.minInclusive||input>qualified.inputBand.maxInclusive)fail('RATEBOOK_INPUT_BAND');
 // Rates are integer micro native-currency units per million tokens.
 const nativeMicros=ceiling(categories.reduce((n,k)=>n+BigInt(usage[k])*BigInt(qualified.rates[k]),0n),1000000n);
 if(route.currency==='USD')return {nativeCurrency:'USD',nativeMicros,usdReservationMicros:nativeMicros,pricingVersion:route.pricingVersion,fxVersion:null};
 exact(fx,['version','verified','observedAt','expiresAt','source','cnyMicrosPerUsd','reservationCnyMicrosPerUsd']);
 if(fx.verified!==true||typeof fx.version!=='string'||!fx.version||typeof fx.source!=='string'||!fx.source||!integer(fx.observedAt)||!integer(fx.expiresAt)||fx.observedAt>now||now-fx.observedAt>86400000||fx.expiresAt<=now||!positive(fx.cnyMicrosPerUsd)||!positive(fx.reservationCnyMicrosPerUsd)||fx.reservationCnyMicrosPerUsd>fx.cnyMicrosPerUsd)fail('FX_UNQUALIFIED');
 return {nativeCurrency:'CNY',nativeMicros,usdReservationMicros:ceiling(BigInt(nativeMicros)*1000000n,BigInt(fx.reservationCnyMicrosPerUsd)),pricingVersion:route.pricingVersion,fxVersion:fx.version};
}
// Conservative request bound: no speculative provider cache discount. Charge
// every input token at the highest admitted input-category rate, plus full
// billable completion cap (including reasoning/headroom).
export function quoteRequestBound({book,route,now,inputTokens,billableOutputCap,fx}){
 const qualified=qualifiedRatebook(book,route,now);if(!integer(inputTokens)||!integer(billableOutputCap))fail('USAGE_INVALID');
 const category=categories.slice(0,3).reduce((a,b)=>qualified.rates[a]>=qualified.rates[b]?a:b);
 const usage={standardInput:0,cachedReadInput:0,cacheCreateInput:0,completion:billableOutputCap};usage[category]=inputTokens;
 return quoteUsage({book:qualified,route,now,usage,fx});
}
