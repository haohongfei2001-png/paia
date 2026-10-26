import {fixture,rows,op} from './topic-02.mjs';
import {capture} from './thought-m1.mjs';
import {TopicFormationService} from '../../core/topic-formation.js';
export {rows,raw,topic,op,collect} from './topic-02.mjs';
export {inputEdit,derived,capture} from './thought-m1.mjs';
export const parameters=Object.freeze({version:'synthetic-policy-1',subject:{minContributions:3,minContexts:2},section:{minContributions:2,minContexts:1}});
export const citation=(input,field='body',start=0,end=input.fields[field].length)=>({inputId:input.id,field,start,end});
export function assessment(view,overrides={}){
 const citations=view.inputs.map(input=>citation(input));
 return {version:1,kind:'object',name:'Synthetic continuing object',substance:{reason:'substantive',citations:[citations[0]]},boundary:{reason:'independent_object',citations:[citations[0]]},returnValue:{reason:'decision',citations:[citations[0]]},continuity:{reason:'ongoing_work',citations:[citations[0]]},evidence:citations,relations:[...new Set(view.identities.map(x=>x.canonicalId))].map(topicId=>({topicId,relation:'distinct',citations:[citations[0]]})),section:{kind:'default'},entries:[{span:citations[0],type:'idea',additional:[]}],...overrides};
}
export async function formationFixture({decide=assessment,policy=parameters,...options}={}){
 const f=await fixture(options);f.decision={version:'synthetic-annotations-v1',assess:decide};f.service=new TopicFormationService(f.s,{...f.serviceOptions,decision:f.decision,parameters:policy});return f;
}
export const request=(f,extra={})=>({scope:f.scope,operationId:op(),...extra});
export async function runFormation(f,extra={},options={}){const r=request(f,extra),prepared=await f.service.prepare(r,options),result=await f.service.commit(prepared);return {r,prepared,result};}
export async function addInput(f,{id=op(),text='Another independent synthetic contribution',chat='second-synthetic-chat'}={}){
 const req=capture((await f.s.status()).epoch,id,text);req.chat={id:chat,url:'https://chatgpt.com/c/'+chat,title:'Synthetic conversation'};await f.s.capture(req);f.scope=(await rows(f.s,'inputStates')).map(row=>({inputId:row.id,role:'primary',selectedFields:['body']}));return f.scope;
}
export const portableTables=['records','blocks','inputStates','thoughts','topics','sections','placements','provenance','dependencies','revisions','operationReceipts','organizerWorkItems'];
export const snapshot=s=>Promise.all(portableTables.map(name=>rows(s,name)));
