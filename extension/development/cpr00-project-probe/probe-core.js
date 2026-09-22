export const CPR00_FORMAT='paia-cpr00-project-discovery-v1';

const visibleNamedRouteMatches=snapshot=>(snapshot?.anchors||[])
  .filter(item=>item?.matchesRouteProject===true&&item?.kind==='project_home'&&item?.visible===true&&typeof item?.labelDigest==='string');
const matchingHeaderAttributes=snapshot=>{
  const routeProject=typeof snapshot?.route?.projectDigest==='string'?snapshot.route.projectDigest:null;
  return (snapshot?.attributes||[]).filter(item=>routeProject&&item?.zone==='header'&&item?.visible===true&&item?.projectIdDigest===routeProject&&typeof item?.projectNameDigest==='string');
};
const visibleNested=snapshot=>(snapshot?.nestedMemberships||[])
  .filter(item=>item?.visible===true&&typeof item?.projectDigest==='string'&&typeof item?.labelDigest==='string');

function evidence(snapshot){
  const routeProject=typeof snapshot?.route?.projectDigest==='string'?snapshot.route.projectDigest:null;
  const routeNamed=visibleNamedRouteMatches(snapshot);
  if(routeProject&&routeNamed.length){
    const names=[...new Set(routeNamed.map(item=>item.labelDigest))];
    return {channel:'route_plus_matching_project_home_link',strong:true,projectDigest:routeProject,nameDigests:names};
  }
  const attrs=matchingHeaderAttributes(snapshot);
  if(routeProject&&attrs.length){
    const names=[...new Set(attrs.map(item=>item.projectNameDigest))];
    return {channel:'route_plus_matching_header_attribute',strong:true,projectDigest:routeProject,nameDigests:names};
  }
  const nested=visibleNested(snapshot);
  if(nested.length){
    const projects=[...new Set(nested.map(item=>item.projectDigest))];
    const names=[...new Set(nested.map(item=>item.labelDigest))];
    if(projects.length===1&&names.length===1)return {channel:'sidebar_proximity_only',strong:false,projectDigest:projects[0],nameDigests:names};
  }
  return {channel:'none',strong:false,projectDigest:null,nameDigests:[]};
}

const sameEvidence=(a,b)=>a.strong===true&&b.strong===true&&a.channel===b.channel&&
  a.projectDigest===b.projectDigest&&a.nameDigests.length===1&&b.nameDigests.length===1&&
  a.nameDigests[0]===b.nameDigests[0];

function snapshotSummary(snapshot){
  const ev=evidence(snapshot);
  return {
    routeKind:snapshot?.route?.kind||null,
    routeProjectDigest:snapshot?.route?.projectDigest||null,
    channel:ev.channel,
    projectDigest:ev.projectDigest,
    nameDigests:ev.nameDigests,
    counts:{
      projectAnchors:snapshot?.counts?.projectAnchors||0,
      matchingRouteProjectAnchors:snapshot?.counts?.matchingRouteProjectAnchors||0,
      namedMatchingRouteAnchors:snapshot?.counts?.namedMatchingRouteAnchors||0,
      currentConversationLinks:snapshot?.counts?.currentConversationLinks||0,
      nestedMemberships:snapshot?.counts?.nestedMemberships||0,
      projectAttributes:snapshot?.counts?.projectAttributes||0
    },
    matchingAnchors:(snapshot?.anchors||[]).filter(item=>item?.matchesRouteProject===true).slice(0,8).map(item=>({
      kind:item.kind,zone:item.zone,visible:item.visible,labelDigest:item.labelDigest,
      labelLength:item.labelLength,selected:item.selected
    })),
    nestedMemberships:(snapshot?.nestedMemberships||[]).slice(0,8)
  };
}

export function summarizeDiscovery({runtime,captures}={}){
  const project=captures?.project||null,reload=captures?.projectReload||null;
  const ordinary=captures?.ordinary||null,returned=captures?.projectReturn||null;
  const p=evidence(project),r=evidence(reload),o=evidence(ordinary),back=evidence(returned);
  const checks={
    runtimeParity:runtime?.runtimeParity===true,
    projectObserved:!!project,
    reloadObserved:!!reload,
    ordinaryObserved:!!ordinary,
    returnObserved:!!returned,
    projectIdentityCandidate:p.strong===true&&p.projectDigest!==null,
    projectNameCandidate:p.strong===true&&p.nameDigests.length===1,
    membershipCandidate:p.strong===true,
    stableAcrossReload:sameEvidence(p,r),
    ordinaryNegative:ordinary?.route?.kind==='plain_chat'&&o.channel==='none'&&ordinary?.route?.projectDigest==null,
    stableAfterAwayBack:sameEvidence(p,back),
    noRawPrivateEmission:[project,reload,ordinary,returned].filter(Boolean).every(s=>s?.privacy?.rawProjectIdsEmitted===false&&s?.privacy?.rawProjectNamesEmitted===false&&s?.privacy?.messageBodiesRead===false&&s?.privacy?.assistantBodiesRead===false&&s?.privacy?.draftsRead===false)
  };
  const reasons=Object.entries(checks).filter(([,v])=>!v).map(([k])=>k);
  return {
    format:CPR00_FORMAT,
    complete:!!project&&!!reload&&!!ordinary&&!!returned,
    contractCandidateReady:reasons.length===0,
    checks,reasons,
    candidate:{
      channel:p.channel,
      projectIdentity:p.projectDigest?'run-local-project-digest':null,
      projectName:p.nameDigests.length===1?'run-local-name-digest':null,
      membership:p.strong===true?'current-conversation-bound':null
    },
    snapshots:{
      project:snapshotSummary(project),
      projectReload:snapshotSummary(reload),
      ordinary:snapshotSummary(ordinary),
      projectReturn:snapshotSummary(returned)
    },
    runtime:{
      sourceHead:runtime?.sourceHead||null,
      runtimeParity:runtime?.runtimeParity===true,
      manifestVersion:runtime?.manifestVersion||null,
      releaseDigest:runtime?.releaseDigest||null
    },
    privacy:{rawProjectIdsEmitted:false,rawProjectNamesEmitted:false,messageBodiesEmitted:false,urlsEmitted:false,conversationIdsEmitted:false}
  };
}
