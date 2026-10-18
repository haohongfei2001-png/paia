import {Pool} from 'pg';
import {PostgresLedgerStorage} from './postgres-ledger.mjs';
import {createPostgresReservationService} from './reservation-service.mjs';
import {createGatewayHandler} from './request-entry.mjs';
import {snapshotDeploymentEnvironment, sameDeploymentSnapshot, compileDeploymentConfig} from './deployment-config.mjs';

const STARTUP_WAIT_MS = 25000, DISPOSE_WAIT_MS = 35000, MAX_IN_FLIGHT = 16;
const unavailable = () => Response.json({decision:'deny',reason:'SERVICE_UNAVAILABLE',financialAuthority:false,dispatchAllowed:false,retryAllowed:false},
  {status:503,headers:{'cache-control':'no-store','content-type':'application/json; charset=utf-8','x-content-type-options':'nosniff'}});
async function bounded(promise, millis) {
  let timer;
  try {return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('DEPLOYMENT_TIMEOUT')),millis);})]);}
  finally {clearTimeout(timer);}
}

// A single lifecycle per warm Node instance. The only injection seam is a
// service-owned environment reader for isolated tests; Pool, readiness, identity,
// original accounting/service and HTTP composition are fixed production imports.
// Construction/import reads no deployment input and creates no pool/connection.
export function createDeploymentGateway({readEnvironment=()=>process.env}={}) {
  let current=null, live=null, serial=Promise.resolve(), closed=false, blocked=false, inFlight=0, closePromise;
  const snapshot = () => {try {return snapshotDeploymentEnvironment(readEnvironment());} catch {return snapshotDeploymentEnvironment({});}};
  const retire = entry => {
    if (!entry?.pool) return Promise.resolve(true);
    entry.failed=true; entry.service=null;
    if (!entry.retired) entry.retired=bounded(Promise.resolve().then(()=>entry.pool.end()),DISPOSE_WAIT_MS).then(()=>{
      if (live===entry) live=null;
      return true;
    }).catch(()=>{
      // Uncertain disposal must not create a second pool. A fresh process is
      // required; no client transaction is replayed, cancelled or refunded.
      blocked=true; return false;
    });
    return entry.retired;
  };
  const resolveService = async () => {
    if (closed || blocked) return null;
    const input=snapshot();
    if (!current || !sameDeploymentSnapshot(current.input,input)) {
      const prior=current, entry={input,pool:null,service:null,failed:false,retired:null};
      current=entry;
      entry.ready=serial.then(async()=>{
        await retire(prior);
        if (closed || blocked || current!==entry) return;
        let config;
        try {config=compileDeploymentConfig(input);} catch {entry.failed=true;return;}
        if (!config) return;
        try {
          entry.pool=new Pool(config.poolOptions);
          live=entry;
          entry.pool.on('error',()=>{
            // pg idle errors can contain connection data. Never log/rethrow.
            entry.failed=true; entry.service=null;
            void retire(entry);
          });
          await new PostgresLedgerStorage({pool:entry.pool}).checkReady();
          if (closed || blocked || current!==entry || entry.failed) {await retire(entry);return;}
          entry.service=createPostgresReservationService({pool:entry.pool,identityConfig:config.identityConfig,profileId:config.profileId});
        } catch {entry.failed=true;await retire(entry);}
      });
      serial=entry.ready.catch(()=>{entry.failed=true;blocked=true;});
    }
    const entry=current;
    try {await bounded(entry.ready,STARTUP_WAIT_MS);} catch {entry.failed=true;void retire(entry);return null;}
    // The HTTP handler calls this synchronously AFTER its await, immediately
    // before invoking the original service. No late initializer can revive a
    // disabled, rotated, disposed or failed service. This checks config only;
    // DB grants, budgets, time and signatures are never cached here.
    const isCurrent=()=>!closed&&!blocked&&current===entry&&!entry.failed&&sameDeploymentSnapshot(entry.input,snapshot());
    return isCurrent() && entry.service ? {service:entry.service,isCurrent} : null;
  };
  const handler=createGatewayHandler({resolveService});
  return Object.freeze({
    async fetch(request) {
      if (inFlight>=MAX_IN_FLIGHT) return unavailable();
      inFlight++;
      try {return await handler(request);} finally {inFlight--;}
    },
    close() {
      if (!closePromise) {
        closed=true;
        // Safe explicit lifecycle shutdown only. No process-global signal hook,
        // automatic reconnect, ledger clear or release of unknown occupation.
        closePromise=bounded(Promise.all([serial,retire(live)]),DISPOSE_WAIT_MS)
          .then(()=>Object.freeze({closed:true,drained:!blocked&&live===null}))
          .catch(()=>{blocked=true;return Object.freeze({closed:true,drained:false});});
      }
      return closePromise;
    },
  });
}
