import {OrganizerProvider} from '../../../core/organizer/contracts.js';
export class DeterministicFixtureProvider extends OrganizerProvider {
 constructor(transform=null){super();this.transform=transform;this.calls=[];}
 describe(){return {providerId:'synthetic-fixture',adapterVersion:'1',capabilityVersion:1,modelVersion:'deterministic-1',executionKind:'fixture',supportedTaskSchemas:['organize.v1'],credentialRequirement:'none'};}
 async execute(request){this.calls.push(structuredClone(request));const input=request.inputs.find(x=>x.role!=='context_only'),body=input.fields.body||input.fields.note,result=[{action:'create',body,type:'idea',formation:'explicit',evidence:[{ref:input.ref,field:input.fields.body?'body':'note',start:0,end:body.length}],newTopic:'Synthetic ideas',newSection:'Observations'}],output={requestId:request.requestId,schemaVersion:1,providerVersion:'1',modelVersion:'deterministic-1',result};return this.transform?this.transform(output,request):output;}
}
export class MockOrganizerProvider extends DeterministicFixtureProvider {}
