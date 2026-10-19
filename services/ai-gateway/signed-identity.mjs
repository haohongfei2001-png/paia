import {createHash, createPublicKey, constants, verify as verifySignature} from 'node:crypto';
import {ENVELOPES} from '../../extension/core/ai-usage/admission-policy.js';

// A deliberately narrow JWT application profile, not an OAuth/OIDC client or an
// issuer. Only pinned public keys are read. No JWKS fetching, credentials,
// browser storage, network, paid dispatch or persistent state exists here.
const REQUEST_FIELDS = Object.freeze(['operationId','jobId','principalId','libraryId','scopeFingerprint','contractVersion','routeVersion','consentEpoch','jobType','childIndex','childCount','inputTokens','outputCap','maxCompletionTokens']);
const NUMBER_FIELDS = new Set(['childIndex','childCount','inputTokens','outputCap','maxCompletionTokens']);
const BASE_CLAIMS = ['iss','aud','sub','iat','nbf','exp','jti','library_id','operation_id','request_hash','generation'];
const MAX_TOKEN = 8192, MAX_KEYS = 16, MAX_SIGNATURE_BYTES = 512;
const decoder = new TextDecoder('utf-8', {fatal:true, ignoreBOM:true});
const integer = x => Number.isSafeInteger(x) && x >= 0;
const identifier = x => typeof x === 'string' && /^[A-Za-z0-9_:./-]{1,200}$/.test(x);
const boundedString = x => typeof x === 'string' && x.length > 0 && x.length <= 200 && x.isWellFormed() && !/[\u0000-\u001f\u007f]/.test(x);

export class IdentityVerificationError extends Error {
  constructor(code) {super(code); this.name='IdentityVerificationError'; this.code=code;}
}
const reject = (code = 'IDENTITY_INVALID') => {throw new IdentityVerificationError(code);};
export function requireSynchronous(value) {
  // A misconfigured rejected async reader must deny without creating an
  // unhandled rejection in the service process. Async results never qualify.
  if (value instanceof Promise) {value.catch(() => {}); reject('IDENTITY_STATE_UNAVAILABLE');}
  return value;
}
export function exactData(value, keys) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || ![Object.prototype,null].includes(Object.getPrototypeOf(value))) reject();
  const descriptors = Object.getOwnPropertyDescriptors(value), actual = Reflect.ownKeys(descriptors);
  if (actual.length !== keys.length || actual.some(k => typeof k !== 'string' || !keys.includes(k) || !Object.hasOwn(descriptors[k],'value'))) reject();
  return value;
}
export function snapshotRequest(value) {
  exactData(value, REQUEST_FIELDS);
  for (const key of REQUEST_FIELDS) if (!(NUMBER_FIELDS.has(key) ? integer(value[key]) : boundedString(value[key]))) reject('REQUEST_INVALID');
  if (!Object.hasOwn(ENVELOPES,value.jobType) || value.childCount < 1 || value.childIndex >= value.childCount) reject('REQUEST_INVALID');
  return Object.freeze(Object.fromEntries(REQUEST_FIELDS.map(key => [key,value[key]])));
}
// Original reservation requests contain only bounded string/integer fields.
// Their sorted-key, compact JSON representation is the v1 binding format. This
// is an application claim format, not a claim to implement RFC 8785 for all JSON.
export function requestBindingHash(value) {
  const request = snapshotRequest(value);
  return createHash('sha256').update(JSON.stringify(Object.fromEntries(Object.keys(request).sort().map(key => [key,request[key]]))), 'utf8').digest('hex');
}

// This profile admits one object with scalar values or a flat string array.
// Reject nested objects/arrays before recursion could consume resources, and
// compare decoded member names before JSON.parse can erase duplicates. String
// and number grammar still uses the platform JSON parser; no custom crypto.
function parseProfileObject(text) {
  let at = 0;
  const space = () => {while (/[\x20\t\r\n]/.test(text[at] ?? '\0')) at++;};
  const string = () => {
    const start = at++;
    while (at < text.length) {
      const c = text[at++];
      if (c === '\\') {at++; continue;}
      if (c === '"') {
        const result = JSON.parse(text.slice(start,at));
        if (!result.isWellFormed()) reject();
        return result;
      }
    }
    reject();
  };
  const scalar = () => {
    space();
    if (text[at] === '"') return string();
    const match = /^(?:true|false|null|-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]+)?)/.exec(text.slice(at));
    if (!match) reject();
    at += match[0].length;
    return JSON.parse(match[0]);
  };
  space(); if (text[at++] !== '{') reject(); space();
  const result = Object.create(null), seen = new Set();
  if (text[at] !== '}') while (true) {
    if (text[at] !== '"' || seen.size >= 20) reject();
    const key = string();
    if (seen.has(key)) reject(); seen.add(key);
    space(); if (text[at++] !== ':') reject(); space();
    let value;
    if (text[at] === '[') {
      at++; space(); value=[];
      if (text[at] !== ']') while (true) {
        if (text[at] !== '"' || value.length >= 3) reject();
        value.push(string()); space();
        if (text[at] !== ',') break;
        at++; space();
      }
      if (text[at++] !== ']') reject();
    } else value=scalar();
    result[key]=value; space();
    if (text[at] !== ',') break;
    at++; space();
  }
  if (text[at++] !== '}') reject(); space();
  if (at !== text.length) reject();
  return result;
}
function decode(segment, limit) {
  if (typeof segment !== 'string' || !segment.length || segment.length > Math.ceil(limit*4/3) || !/^[A-Za-z0-9_-]+$/.test(segment)) reject();
  const bytes=Buffer.from(segment,'base64url');
  if (bytes.length > limit || bytes.toString('base64url') !== segment) reject();
  return bytes;
}
function compileAuthority(value) {
  exactData(value,['issuer','audience','keys']);
  if (!boundedString(value.issuer) || !boundedString(value.audience) || !Array.isArray(value.keys) || !value.keys.length || value.keys.length > MAX_KEYS) reject('IDENTITY_UNCONFIGURED');
  const keys=new Map(), fingerprints=new Set();
  for (const entry of value.keys) {
    exactData(entry,['kid','publicKeyPem','notBefore','notAfter','revoked']);
    if (!identifier(entry.kid) || keys.has(entry.kid) || typeof entry.publicKeyPem !== 'string' || entry.publicKeyPem.length > 8192 || !/^-----BEGIN PUBLIC KEY-----\r?\n(?:[A-Za-z0-9+/=]+\r?\n)+-----END PUBLIC KEY-----\r?\n?$/.test(entry.publicKeyPem) || !integer(entry.notBefore) || !integer(entry.notAfter) || entry.notAfter <= entry.notBefore || typeof entry.revoked !== 'boolean') reject('IDENTITY_UNCONFIGURED');
    const key=createPublicKey(entry.publicKeyPem), details=key.asymmetricKeyDetails;
    if (key.type !== 'public' || key.asymmetricKeyType !== 'rsa' || !details || details.modulusLength < 2048 || details.modulusLength > 4096 || details.publicExponent !== 65537n) reject('IDENTITY_UNCONFIGURED');
    const fingerprint=createHash('sha256').update(key.export({type:'spki',format:'der'})).digest('hex');
    if (fingerprints.has(fingerprint)) reject('IDENTITY_UNCONFIGURED');
    fingerprints.add(fingerprint);
    keys.set(entry.kid,Object.freeze({key, size:Math.ceil(details.modulusLength/8), notBefore:entry.notBefore, notAfter:entry.notAfter, revoked:entry.revoked, fingerprint}));
  }
  return Object.freeze({issuer:value.issuer,audience:value.audience,keys});
}
function compile(config) {
  exactData(config,['principal','entitlement','maxTokenAgeSeconds','maxSecurityStateAgeSeconds']);
  if (!integer(config.maxTokenAgeSeconds) || config.maxTokenAgeSeconds < 1 || config.maxTokenAgeSeconds > 300 || !integer(config.maxSecurityStateAgeSeconds) || config.maxSecurityStateAgeSeconds < 1 || config.maxSecurityStateAgeSeconds > 60) reject('IDENTITY_UNCONFIGURED');
  const principal=compileAuthority(config.principal), entitlement=compileAuthority(config.entitlement);
  // No key can play both roles in this profile, even with distinct kid aliases.
  if ([...principal.keys.values()].some(p => [...entitlement.keys.values()].some(e => p.fingerprint === e.fingerprint))) reject('IDENTITY_UNCONFIGURED');
  return Object.freeze({principal,entitlement,maxTokenAgeSeconds:config.maxTokenAgeSeconds,maxSecurityStateAgeSeconds:config.maxSecurityStateAgeSeconds});
}
function verifyToken(token, kind, config, request, now) {
  if (typeof token !== 'string' || token.length > MAX_TOKEN) reject();
  const parts=token.split('.'); if (parts.length !== 3) reject();
  const header=parseProfileObject(decoder.decode(decode(parts[0],1024)));
  exactData(header,['alg','typ','kid']);
  if (header.alg !== 'RS256' || header.typ !== `paia-${kind}+jwt` || !identifier(header.kid)) reject();
  const authority=config[kind], key=authority.keys.get(header.kid);
  if (!key || key.revoked || now < key.notBefore || now >= key.notAfter) reject('IDENTITY_REVOKED');
  const signature=decode(parts[2],MAX_SIGNATURE_BYTES);
  if (signature.length !== key.size || !verifySignature('RSA-SHA256',Buffer.from(`${parts[0]}.${parts[1]}`,'ascii'),{key:key.key,padding:constants.RSA_PKCS1_PADDING},signature)) reject();
  const claims=parseProfileObject(decoder.decode(decode(parts[1],4096)));
  exactData(claims,kind === 'principal' ? BASE_CLAIMS : [...BASE_CLAIMS,'principal_issuer','tier','entitlements']);
  if (claims.iss !== authority.issuer || claims.aud !== authority.audience || !boundedString(claims.sub) || !identifier(claims.jti) || !identifier(claims.generation)) reject();
  if (!['iat','nbf','exp'].every(k => integer(claims[k])) || claims.iat > now || claims.nbf > now || claims.exp <= now || claims.nbf < claims.iat || claims.nbf >= claims.exp || claims.exp-claims.iat > config.maxTokenAgeSeconds || now-claims.iat > config.maxTokenAgeSeconds || claims.iat < key.notBefore || claims.exp > key.notAfter) reject('IDENTITY_TIME_INVALID');
  if (claims.sub !== request.principalId || claims.library_id !== request.libraryId || claims.operation_id !== request.operationId || claims.request_hash !== requestBindingHash(request)) reject('IDENTITY_BINDING');
  if (kind === 'entitlement' && (claims.principal_issuer !== config.principal.issuer || !['free','pro'].includes(claims.tier) || !Array.isArray(claims.entitlements) || !claims.entitlements.length || new Set(claims.entitlements).size !== claims.entitlements.length || claims.entitlements.some(job => !Object.hasOwn(ENVELOPES,job)) || !claims.entitlements.includes(request.jobType))) reject('ENTITLEMENT_INVALID');
  return {claims,kid:header.kid};
}
function securityState(value, config, now, principal, entitlement) {
  exactData(value,['principalId','libraryId','observedAt','expiresAt','principalActive','entitlementActive','principalGeneration','entitlementGeneration','revokedPrincipalKeys','revokedEntitlementKeys']);
  if (!integer(value.observedAt) || !integer(value.expiresAt) || value.observedAt > now || now-value.observedAt > config.maxSecurityStateAgeSeconds || value.expiresAt <= now || value.expiresAt-value.observedAt > config.maxSecurityStateAgeSeconds) reject('IDENTITY_STATE_UNAVAILABLE');
  for (const list of [value.revokedPrincipalKeys,value.revokedEntitlementKeys]) if (!Array.isArray(list) || list.length > MAX_KEYS || list.some(k => !identifier(k)) || new Set(list).size !== list.length) reject('IDENTITY_STATE_UNAVAILABLE');
  if (value.principalId !== principal.claims.sub || value.libraryId !== principal.claims.library_id || value.principalActive !== true || value.entitlementActive !== true || value.principalGeneration !== principal.claims.generation || value.entitlementGeneration !== entitlement.claims.generation || value.revokedPrincipalKeys.includes(principal.kid) || value.revokedEntitlementKeys.includes(entitlement.kid)) reject('IDENTITY_REVOKED');
}
export function createSignedIdentityVerifier({config, clock, readSecurityState} = {}) {
  let trust=null, lastNow=-1;
  try {trust=compile(config);} catch {/* Unconfigured factories stay closed. */}
  const verify = (bundle, includeValidity) => {
    try {
      if (!trust || typeof clock !== 'function' || typeof readSecurityState !== 'function') reject('IDENTITY_UNCONFIGURED');
      exactData(bundle,['request','principalToken','entitlementToken']);
      const request=snapshotRequest(bundle.request), millis=clock();
      if (!integer(millis) || millis < lastNow) reject('UNTRUSTED_CLOCK');
      lastNow=millis;
      const now=Math.floor(millis/1000);
      const principal=verifyToken(bundle.principalToken,'principal',trust,request,now), entitlement=verifyToken(bundle.entitlementToken,'entitlement',trust,request,now);
      // Must be a synchronous current service-owned snapshot, never request JSON
      // or an async fetch whose result is called current after an await.
      const state=requireSynchronous(readSecurityState(Object.freeze({principalId:request.principalId,libraryId:request.libraryId})));
      securityState(state,trust,now,principal,entitlement);
      const identity={principalId:request.principalId,libraryId:request.libraryId,operationId:request.operationId,jobType:request.jobType,tier:entitlement.claims.tier,principalGeneration:principal.claims.generation,entitlementGeneration:entitlement.claims.generation};
      // Only authenticated claims, pinned verified keys and the checked current
      // security snapshot contribute to this exclusive millisecond bound. Never
      // decode an unverified token expiry as publication authority.
      if (includeValidity) identity.verifiedUntil=Math.min(Number.MAX_SAFE_INTEGER,1000*Math.min(
        principal.claims.exp,entitlement.claims.exp,
        trust.principal.keys.get(principal.kid).notAfter,trust.entitlement.keys.get(entitlement.kid).notAfter,
        state.expiresAt,state.observedAt+trust.maxSecurityStateAgeSeconds));
      return Object.freeze(identity);
    } catch (error) {
      if (error instanceof IdentityVerificationError) throw error;
      reject(); // Never include token, claims, parser or upstream error details.
    }
  };
  // Preserve the established verify() result shape for all existing consumers.
  return Object.freeze({verify:bundle=>verify(bundle,false),verifyValidity:bundle=>verify(bundle,true)});
}
