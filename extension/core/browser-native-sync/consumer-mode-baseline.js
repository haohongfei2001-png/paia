import {digest,count,opaque,fail} from './value.js';
// Existing opaque operation ID commits the original prejournal local counter.
// No portable counter/grant, additional codec, row or restore effect is added.
// A foreign baseline is never assigned to a receiver's local policy epoch.
export function modeBootstrapCommitment({datasetId,deviceId,namespace,epoch,mode,policyEpoch}){
 if(!opaque(datasetId)||!opaque(deviceId)||namespace!=='initial'&&!opaque(namespace)||epoch!==null&&!opaque(epoch)||!['light','off'].includes(mode)||!count(policyEpoch)||mode==='off'&&policyEpoch<1)fail('BNS_OWNER_CHANGED');
 return digest({profile:'consumer-mode-bootstrap-counter-v1',datasetId,deviceId,namespace,epoch,mode,policyEpoch});
}
