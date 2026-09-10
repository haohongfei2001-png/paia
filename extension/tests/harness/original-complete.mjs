import {IDBFactory,IDBKeyRange} from '../vendor/fake-indexeddb/build/esm/index.js';
import {local} from './thought-m1.mjs';
import {OrganizerStore} from '../../core/organizer/store.js';
import {SimpleOriginalOrganizerRunner} from '../../core/organizer/original-simple.js';
import {DeepSeekOrganizerProvider,DeepSeekSessionCredentials} from '../../core/organizer/deepseek.js';
import {bindBudgetSession} from '../../core/organizer/budget.js';
globalThis.IDBKeyRange=IDBKeyRange;

export const chineseInputs=[
 '事实：我在虚构项目中完成了三次原型访谈。',
 '偏好：我更喜欢安静的工作环境，便于持续思考。',
 '决定：这个虚构项目先保留原话，再做分类。',
 '判断：一次可观察的实验比十次空泛讨论更有帮助。',
 '想法：把学习笔记按问题出现的时间排列。',
 '长输入：起初我觉得所有内容都应该合并。后来我发现反例也有价值。最后我决定同时保存最初判断、证据和后续修正。',
 '修正：我收回前面关于合并所有笔记的判断，改为保留演化过程。',
 '重要决定：不自动重试。',
 '重复表达：原话是思考过程的证据。',
 '重复表达：原话是思考过程的证据。',
 '生活事实：虚构花园里的第一株幼苗今天发芽了。',
 '生活偏好：我喜欢清晨散步时观察树叶。',
 '生活决定：每周日留一小时照顾植物。',
 '生活判断：规律的小行动比突击更可持续。',
 '生活想法：做一本记录季节变化的小册子。',
 '跨章节：在工作中做实验，也可以用于观察植物的生长。',
 '模糊想法：我还没有想清楚这个选择意味着什么。',
 '学习反思：记录失败实验能帮助我避免重复犯错。',
 '创作：给虚构故事写一个开放结尾，保留不同可能。',
 '目标计划：下周完成两次小实验，并保留原始观察。'
];
export function sessionStorage(){const data={};return {data,async get(key){return {[key]:structuredClone(data[key])};},async set(row){Object.assign(data,structuredClone(row));},async remove(key){delete data[key];}};}
export function response(body,status=200){return {status,ok:status>=200&&status<300,headers:{get:()=>null},text:async()=>JSON.stringify(body)};}
export function classified(request){return request.inputs.map(input=>({inputRef:input.ref,topic:{proposedName:input.text.includes('生活')?'生活观察':'学习工作'},section:{proposedName:input.text.includes('修正')?'后续修正':'思考过程'},type:'idea',spans:[],uncertain:false}));}
export function success(init,mutate=rows=>rows){const request=JSON.parse(JSON.parse(init.body).messages[1].content);return response({choices:[{finish_reason:'stop',message:{content:JSON.stringify({items:mutate(classified(request),request)})}}]});}
export async function append(s,text,id='added-'+crypto.randomUUID(),chat='complete-synthetic'){
 return s.capture({epoch:(await s.status()).epoch,adapterVersion:'0.3.0',chat:{id:chat,url:'https://chatgpt.com/c/'+chat,title:'虚构验收'},messages:[{sourceMessageId:id,pageOrder:1,originalText:text}]});
}
export async function completeFixture({texts=chineseInputs.slice(0,5),fetchImpl=async(_url,init)=>success(init),timeoutMs=1000,networkGuard,organizerBudget,batchLimit=5}={}){
 const storage=local(),indexedDB=new IDBFactory(),s=new OrganizerStore(storage,{indexedDB,...(organizerBudget?{organizerBudget}:{})});await s.consent(true);
 for(let i=0;i<texts.length;i++)await append(s,texts[i],'complete-'+i);
 const session=sessionStorage(),credentials=new DeepSeekSessionCredentials(session);await credentials.configure({apiKey:'synthetic-test-key'});await bindBudgetSession(s.organizerLedger,session);
 const requests=[],provider=new DeepSeekOrganizerProvider({limits:s.organizerBudget.limits,timeoutMs,networkGuard,fetchImpl:async(url,init)=>{requests.push({url,init});return fetchImpl(url,init);}}),runner=new SimpleOriginalOrganizerRunner(s,{provider,credentials,batchLimit});
 return {s,indexedDB,storage,session,credentials,provider,runner,requests};
}
export const rows=(s,name)=>s.repository.transaction(false,t=>t.all(name),[name]);
export const meta=(s,id)=>s.repository.transaction(false,t=>t.get('meta',id),['meta']);
