import test from 'node:test';
import assert from 'node:assert/strict';
import {parseReadConnectorRequest,READ_CONNECTOR_VERSION,
 READ_CONNECTOR_DEFAULT_OFF,READ_CONNECTOR_TOOLS,READ_CONNECTOR_LIMITS
} from '../core/read-connector-contract.js';

const parse=(tool,args)=>parseReadConnectorRequest({tool,args});
const denied=request=>assert.throws(()=>parseReadConnectorRequest(request),{code:'INVALID_REQUEST'});

test('VS-08 read contract is a default-off, finite, read-only five-tool surface',()=>{
 assert.equal(READ_CONNECTOR_VERSION,1);
 assert.equal(READ_CONNECTOR_DEFAULT_OFF,true);
 assert.deepEqual(READ_CONNECTOR_TOOLS,[
  'list_material','query','get_by_ref','get_task_context','permission_self_check'
 ]);
 assert.deepEqual(parse('list_material',{}).args,{
  kinds:['topic','input','thought'],cursor:null,limit:20
 });
 assert.deepEqual(parse('query',{text:'  汉字 PAIA  ',kinds:['input'],limit:3,cursor:'abc_-123'}).args,
  {text:'汉字 PAIA',kinds:['input'],cursor:'abc_-123',limit:3});
 assert.deepEqual(parse('get_task_context',{taskId:'task-1'}).args,
  {taskId:'task-1',budget:'standard'});
 assert.deepEqual(parse('permission_self_check',{}).args,{});
 assert.equal(READ_CONNECTOR_LIMITS.pageSize,20);
});

test('VS-08 request identity and grant metadata cannot be supplied by a caller',()=>{
 const base={tool:'query',args:{text:'find'}};
 for(const key of ['grantId','consumer','purpose','profileId','permission','token','url','body','write']){
  denied({...base,[key]:'attacker'});
  denied({tool:'query',args:{text:'find',[key]:'attacker'}});
 }
 for(const tool of ['put','delete','revoke','submit','search_semantic','model_query'])
  denied({tool,args:{}});
 denied({tool:'query'});
 denied({tool:'query',args:{text:'find'},extra:true});
});

test('VS-08 pagination and query bounds fail closed without truncating or widening',()=>{
 for(const args of [
  {text:''},{text:' '.repeat(3)},{text:'x'.repeat(301)},
  {text:'q',limit:0},{text:'q',limit:21},{text:'q',limit:1.5},
  {text:'q',cursor:'https://example.test'},{text:'q',cursor:'a'.repeat(513)},
  {text:'q',kinds:[]},{text:'q',kinds:['input','input']},
  {text:'q',kinds:['source']},{text:'q',kinds:['topic','input','thought','ai']}
 ])denied({tool:'query',args});
 denied({tool:'list_material',args:{limit:21}});
 denied({tool:'list_material',args:{cursor:'../private'}});
});

test('VS-08 exact material refs and Context IDs are bounded',()=>{
 const ref={kind:'input',id:'input-1',revision:2,span:{start:0,end:2}};
 const result=parse('get_by_ref',{ref});
 assert.deepEqual(result.args.ref,ref);
 assert.equal(Object.isFrozen(result.args.ref.span),true);
 assert.equal(Object.isFrozen(result),true);
 for(const bad of [
  {...ref,revision:-1},{...ref,sourceId:'s1'},{...ref,span:{start:1,end:1}},
  {...ref,span:{start:0,end:2,secret:'x'}},{...ref,extra:'x'}
 ])denied({tool:'get_by_ref',args:{ref:bad}});
 for(const args of [{taskId:''},{taskId:'x'.repeat(201)},
                   {taskId:'t',budget:'unbounded'},{taskId:'t',root:'/private'}])
  denied({tool:'get_task_context',args});
 denied({tool:'permission_self_check',args:{scope:'all'}});
});
