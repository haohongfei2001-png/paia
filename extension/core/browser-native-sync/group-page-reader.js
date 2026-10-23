import {measureSourceWorkingPhysicalTree} from './source-working-physical.js';
import {bytes,fail} from './value.js';

// A work meter and paged reader, never a domain/native read capability. Existing
// owners still authenticate their own transaction, immutable graph and scope.
export const GROUP_PAGE_LIMITS=Object.freeze({page:64,refs:4096,bytes:2*1024*1024,ms:30000});
const budgets=new WeakMap(),transactions=new WeakMap();
export function createGroupPageBudget(){const ticket=Object.freeze({});budgets.set(ticket,{started:performance.now(),refs:0,bytes:0,requests:0});return ticket;}
function state(ticket){const s=budgets.get(ticket);if(!s||performance.now()-s.started>=GROUP_PAGE_LIMITS.ms)fail('BNS_GROUP_RESOURCE_LIMIT');return s;}
export function chargeGroupPageBytes(ticket,length){const s=state(ticket);if(!Number.isSafeInteger(length)||length<0||++s.refs>GROUP_PAGE_LIMITS.refs)fail('BNS_GROUP_RESOURCE_LIMIT');s.bytes+=length;if(s.bytes>GROUP_PAGE_LIMITS.bytes)fail('BNS_GROUP_RESOURCE_LIMIT');state(ticket);}
export function chargeGroupPageValue(ticket,value){if(state(ticket).refs>=GROUP_PAGE_LIMITS.refs)fail('BNS_GROUP_RESOURCE_LIMIT');chargeGroupPageBytes(ticket,bytes(value).length);}
export function checkGroupPageBudget(ticket){state(ticket);}
export function groupPageBudgetSnapshot(ticket){const s=state(ticket);return Object.freeze({refs:s.refs,bytes:s.bytes,requests:s.requests});}
export function groupTransactionPageBudget(t){if(!t||typeof t!=='object')fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');let budget=transactions.get(t);if(!budget){budget=createGroupPageBudget();transactions.set(t,budget);}return budget;}
export async function* groupOperationPages(input,{budget=createGroupPageBudget()}={}){
 if(Array.isArray(input)&&input.length>GROUP_PAGE_LIMITS.refs)fail('BNS_GROUP_RESOURCE_LIMIT');
 if(!input||typeof input[Symbol.iterator]!=='function'&&typeof input[Symbol.asyncIterator]!=='function')fail('BNS_GROUP_RESOURCE_LIMIT');
 let page=[];for await(const value of input){chargeGroupPageValue(budget,value);page.push(value);if(page.length===GROUP_PAGE_LIMITS.page){yield page;checkGroupPageBudget(budget);page=[];}}
 if(page.length)yield page;checkGroupPageBudget(budget);
}
export async function* groupTablePages(t,name,{prefix='',budget=groupTransactionPageBudget(t)}={}){
 if(typeof prefix!=='string'||typeof t.primaryRangePage!=='function')fail('BNS_GROUP_SCOPE_PROOF_REQUIRED');
 let after=null;
 do{
  const s=state(budget);if(++s.requests>GROUP_PAGE_LIMITS.refs)fail('BNS_GROUP_RESOURCE_LIMIT');
  const page=await t.primaryRangePage(name,{prefix,after,limit:GROUP_PAGE_LIMITS.page});checkGroupPageBudget(budget);
  if(!page||!Array.isArray(page.rows)||page.rows.length>GROUP_PAGE_LIMITS.page||page.next!==null&&(typeof page.next!=='string'||page.rows.length!==GROUP_PAGE_LIMITS.page))fail('BNS_GROUP_PAGE_INVALID');
  let previous=after;
  for(const row of page.rows){if(typeof row?.key!=='string'||!row.key.startsWith(prefix)||row.key>=prefix+'\uffff'||previous!==null&&row.key<=previous||row.value?.id!==row.key)fail('BNS_GROUP_PAGE_INVALID');chargeGroupPageBytes(budget,measureSourceWorkingPhysicalTree(row.value).B);previous=row.key;}
  if(page.next!==null&&page.next!==previous)fail('BNS_GROUP_PAGE_INVALID');
  yield page.rows.map(row=>row.value);checkGroupPageBudget(budget);after=page.next;
 }while(after!==null);
}
export async function readGroupRows(t,name,options){const rows=[];for await(const page of groupTablePages(t,name,options))rows.push(...page);return rows;}
