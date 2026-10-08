import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {validArchiveOrigin} from '../ui/route-history.js';
const source=readFileSync(new URL('../ui/archive.js',import.meta.url),'utf8');
const html=readFileSync(new URL('../ui/archive.html',import.meta.url),'utf8');
const snapshot=originKind=>({originKind,readerDocumentId:'doc',view:'library',query:'SAVED_QUERY',cursor:null,pages:[],scroll:0,searchProject:null,sourceScope:null,navigator:null,dateStart:'',dateEnd:'',includeFiltered:true,focus:null});
const start=source.indexOf("setIconLabel($('back'),'back',"),end=source.indexOf(';',start);
function paintedLabel(saved,{en=false,returnTo='library',documentId='doc'}={}){
 let label;const context={view:'library',documentId,returnTo,archiveOriginKey:'origin',archiveOrigins:{get:()=>saved},validArchiveOrigin,readerCopy:(zh,english)=>en?english:zh,tc:text=>text,$:()=>({}),setIconLabel:(_node,_icon,value)=>label=value};vm.createContext(context);
 const helperStart=source.indexOf('function archiveBackLabel(');if(helperStart>=0)vm.runInContext(source.slice(helperStart,source.indexOf('\nfunction ',helperStart+1)),context);
 vm.runInContext(source.slice(start,end),context);return label;
}
for(const [kind,zh,en]of [['search-results','返回搜索结果','Back to search results'],['project-browse','返回项目浏览','Back to project browsing'],['archive','返回档案','Back to Archive']])test('actual Back presentation is qualified by recorded '+kind,()=>{
 assert.equal(paintedLabel(snapshot(kind)),zh);assert.equal(paintedLabel(snapshot(kind),{en:true}),en);
});
test('missing or wrong-document origin never claims exact search return',()=>{
 assert.equal(paintedLabel(null),'返回档案');assert.equal(paintedLabel({...snapshot('search-results'),readerDocumentId:'other'}),'返回档案');
});
test('ordinary Archive Find includes eligible smart-filtered Inputs by default',()=>{
 const input=html.match(/<input\b[^>]*id="search-include-filtered"[^>]*>/)[0];assert.match(input,/\bchecked(?:\s|>|=)/);
});

test('typed origin kind rejects unknown or missing kinds and never borrows another space label',()=>{
 assert.equal(validArchiveOrigin(snapshot('invented')),false);const missing=snapshot('archive');delete missing.originKind;assert.equal(validArchiveOrigin(missing),false);
 for(const returnTo of ['thoughts','memory','revisit'])assert.equal(paintedLabel(snapshot('search-results'),{returnTo}),'返回聊天窗口');
});
