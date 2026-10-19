import {evaluateAdmission} from '../../extension/core/ai-usage/admission-policy.js';
import {quoteRequestBound} from '../../extension/core/ai-usage/ratebook.js';
import {equal} from '../../extension/core/ai-usage/contracts.js';
import {createSignedIdentityVerifier, IdentityVerificationError, exactData, snapshotRequest, requireSynchronous} from './signed-identity.mjs';

const deny = reason => ({decision:'deny',reason,dispatchAllowed:false,financialAuthority:false});
const invalid = () => {throw new IdentityVerificationError('SERVICE_FACTS_UNQUALIFIED');};
const COMMON = ['request','generation','expiresAt'];
const FIELDS = Object.freeze({
  content:[...COMMON,'authorized'],
  route:[...COMMON,'routeQualified','thinkingBoundQualified','inputBoundQualified','route','book','fx'],
  budget:[...COMMON,'usage','global','attemptState','ownsResultReservation']
});
function checkFacts(value, kind, request, now, generations) {
  exactData(value,FIELDS[kind]);
  if (!equal(value.request,request) || typeof value.generation !== 'string' || !value.generation.length || value.generation.length > 200 || value.generation !== generations[kind] || !Number.isSafeInteger(value.expiresAt) || value.expiresAt <= now) invalid();
}
// This is the service-owned composition root. Never populate these options from
// a client request. Facts owners are separate from the entitlement authority;
// signed Pro cannot enable content permission, qualify a route, or set money.
// This function performs no I/O itself and returns PRE-FLIGHT ONLY. The original
// AtomicReservationLedger/BudgetWindowReservation remains the sole accounting
// owner. A later qualified durable service must repeat all guards at its commit.
export function createServiceAdmission({identityConfig, clock, readSecurityState, readContentFacts, readRouteFacts, readBudgetFacts, readFactGenerations} = {}) {
  let verifiedAt;
  const verifier=createSignedIdentityVerifier({config:identityConfig,clock:typeof clock === 'function' ? () => {verifiedAt=clock(); return verifiedAt;} : null,readSecurityState});
  const readers={content:readContentFacts,route:readRouteFacts,budget:readBudgetFacts};
  return Object.freeze({async evaluate(input) {
    try {
      if (![clock,readFactGenerations,...Object.values(readers)].every(value => typeof value === 'function')) return deny('SERVICE_UNCONFIGURED');
      exactData(input,['request','principalToken','entitlementToken']);
      const request=snapshotRequest(input.request);
      // Capture token strings before yielding: caller mutation cannot rebind.
      const proof=Object.freeze({request,principalToken:input.principalToken,entitlementToken:input.entitlementToken});
      const identity=verifier.verify(proof), context=Object.freeze({request,identity});
      let results;
      try {
        results=await Promise.all(Object.entries(readers).map(async ([kind,read]) => [kind,structuredClone(await read(context))]));
      } catch {return deny('SERVICE_FACTS_UNAVAILABLE');}
      const facts=Object.fromEntries(results);
      // One synchronous final decision segment: no await/callback to asynchronous
      // owners between the final security/generation checks and original policy.
      // These synchronous snapshot readers must be pure and service-owned.
      const generations=requireSynchronous(readFactGenerations(Object.freeze({principalId:identity.principalId,libraryId:identity.libraryId,operationId:identity.operationId})));
      exactData(generations,['content','route','budget']);
      verifier.verify(proof); // Rechecks time, both signatures, keys and generations.
      const now=verifiedAt; // The same server-time snapshot used by final verification.
      if (!Number.isSafeInteger(now) || now < 0) return deny('UNTRUSTED_CLOCK');
      for (const [kind,value] of Object.entries(facts)) checkFacts(value,kind,request,now,generations);
      const content=facts.content, route=facts.route, budget=facts.budget;
      if (content.authorized !== true) return deny('AUTHORIZATION');
      if (route.routeQualified !== true || route.thinkingBoundQualified !== true || route.inputBoundQualified !== true || typeof budget.ownsResultReservation !== 'boolean') invalid();
      const quote=quoteRequestBound({book:route.book,route:route.route,fx:route.fx,now,inputTokens:request.inputTokens,billableOutputCap:request.outputCap});
      const decision=evaluateAdmission({
        ...request, intent:'remote', authorized:true, verifiedServiceFacts:true,
        tier:identity.tier, routeQualified:true, thinkingBoundQualified:true, inputBoundQualified:true,
        attemptState:budget.attemptState, ownsResultReservation:budget.ownsResultReservation,
        reservationMicros:quote.usdReservationMicros, usage:budget.usage, global:budget.global
      });
      return {...decision,financialAuthority:false};
    } catch (error) {
      // Only locally enumerated policy reasons are returned. No raw upstream
      // error, token, subject, request body or personal identifier is logged.
      const reasons=new Set(['IDENTITY_INVALID','IDENTITY_UNCONFIGURED','IDENTITY_REVOKED','IDENTITY_BINDING','IDENTITY_TIME_INVALID','IDENTITY_STATE_UNAVAILABLE','ENTITLEMENT_INVALID','REQUEST_INVALID','UNTRUSTED_CLOCK','SERVICE_FACTS_UNQUALIFIED','RATEBOOK_UNQUALIFIED','RATEBOOK_INPUT_BAND','FX_UNQUALIFIED','COST_OVERFLOW','USAGE_INVALID']);
      return deny(reasons.has(error?.code) ? error.code : 'SERVICE_FACTS_UNQUALIFIED');
    }
  }});
}
