import test from 'node:test';import assert from 'node:assert/strict';import {mkdir,writeFile} from 'node:fs/promises';
import {decideLight} from '../core/smart-filter.js';import {evaluateSemanticProvider,SEMANTIC_PROVIDERS} from '../core/classifier-contract.js';
const safe={authorship:'untouched',presence:{version:1,attachment:'absent',reference:'absent',confidence:'verified'}};
test('adversarial benchmark: no substring, affirmation, constraint, citation, Unicode or missing-evidence false filtering',async()=>{
 const cases=[];
 const risk=['好的','可以','是的','不','不要','就这样','这个呢','为什么','开始吧','按照上面的做','朽才是不朽','说错了，是9月5日','就选第二个','去北京','蓝色','预算800','0','不批准','继续？','Continue?'];
 for(const text of risk)cases.push({text,label:text==='开始吧'?'filter':'keep',risk:'standalone'});
 for(const base of ['继续','请继续','继续做','再来一版','continue','Please continue']){
  cases.push({text:base,label:'filter',risk:'control'});
  for(const clause of ['但不要修改原始数据','就选第二个','我决定去北京','预算不超过1000','先备份','禁止联网','更正式一点','是9月5日','只处理第一项','保留这个偏好','请解释原因','这是我的诗'])for(const separator of ['，','。','\n','; ',': '])cases.push({text:base+separator+clause,label:'keep',risk:'mixed_information'});
  for(const suffix of ['\n','\r','\u2028','\u2029','\u200b','\u202e','？','?','✅',' 1',' https://example.invalid',' [ref:2]'])cases.push({text:base+suffix,label:'keep',risk:'reference_or_ambiguous'});
  for(const [left,right]of [['“','”'],['"','"'],['`','`'],['[',']'],['<','>']])cases.push({text:left+base+right,label:'keep',risk:'quoted_content'});
  for(const patch of [{userEdited:true},{filterOverride:'keep'},{authorship:'legacy_unknown'},{presence:null},{presence:{...safe.presence,attachment:'present'}},{presence:{...safe.presence,reference:'present'}}])cases.push({text:base,label:patch.authorship==='legacy_unknown'||patch.presence===null?'filter':'keep',risk:'protection',patch});
 }
 let filtered=0,falseFiltered=0;const byRisk={};const started=performance.now();
 for(const c of cases){const actual=decideLight({...safe,text:c.text,...c.patch}).decision==='filter';filtered+=Number(actual);falseFiltered+=Number(actual&&c.label!=='filter');byRisk[c.risk]??={total:0,falseFiltered:0};byRisk[c.risk].total++;byRisk[c.risk].falseFiltered+=Number(actual&&c.label!=='filter');assert.equal(actual,c.label==='filter',JSON.stringify(c));}
 assert.equal(falseFiltered,0);assert.ok(filtered>0);const precision=(filtered-falseFiltered)/filtered;assert.ok(precision>=0.995);
 await mkdir('work',{recursive:true});await writeFile('work/smart-filter-benchmark.json',JSON.stringify({scope:'synthetic adversarial, not independent user-labeled population evidence',cases:cases.length,filtered,falseFiltered,precision,coverage:filtered/cases.length,byRisk,durationMs:performance.now()-started,statisticalGuarantee:false,productionSemanticProviders:SEMANTIC_PROVIDERS.length},null,2)+'\n');
});
test('provider-neutral evaluation interface fails safely; no semantic provider ships',async()=>{
 assert.equal(SEMANTIC_PROVIDERS.length,0);for(const provider of [null,{classify:async()=>{throw Error('SYNTHETIC');}},{classify:async()=>({decision:'filter',score:Infinity})},{classify:async()=>({decision:'filter',score:1,text:'forbidden payload'})}])assert.equal((await evaluateSemanticProvider(provider,{text:'Synthetic'})).decision,'uncertain');assert.deepEqual(await evaluateSemanticProvider({classify:async()=>({decision:'keep',score:0.9})},{text:'Synthetic'}),{decision:'keep',score:0.9});
});
