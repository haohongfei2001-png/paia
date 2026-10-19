import {createPublicKey, createHash, X509Certificate} from 'node:crypto';
import {checkServerIdentity} from 'node:tls';
import {exactData} from './signed-identity.mjs';

// This module consumes only service-owned deployment input. Never pass HTTP
// fields here. There is no connection string, PG* fallback, arbitrary pg option,
// budget, entitlement, request grant, private signing key or provider setting.
export const MAX_CONFIG_BYTES = 65536;
const invalid = () => {throw new Error('DEPLOYMENT_CONFIG_INVALID');};
const text = value => typeof value === 'string' && value.length > 0 && value.length <= 200 && value.isWellFormed() && !/[\u0000-\u001f\u007f]/u.test(value);
const integer = value => Number.isSafeInteger(value) && value >= 0;
const exact = (value, keys) => {try {exactData(value, keys);} catch {invalid();}};
const DISABLED = Object.freeze({enabled:false});
const INVALID = Object.freeze({enabled:true, invalid:true});

export function snapshotDeploymentEnvironment(environment) {
  try {
    // Off means no configuration or password read, including on module import.
    if (environment?.PAIA_RESERVATIONS_ENABLED !== 'true') return DISABLED;
    const json = environment.PAIA_RESERVATIONS_CONFIG;
    const password = environment.PAIA_RESERVATIONS_DB_PASSWORD;
    if (typeof json !== 'string' || !json.length || json.length > MAX_CONFIG_BYTES || Buffer.byteLength(json, 'utf8') > MAX_CONFIG_BYTES ||
        typeof password !== 'string' || !password.length || password.length > 1024 || !password.isWellFormed() || /[\u0000-\u001f\u007f]/u.test(password)) return INVALID;
    return Object.freeze({enabled:true, json, password});
  } catch {return INVALID;}
}
export const sameDeploymentSnapshot = (a,b) => a?.enabled === b?.enabled && a?.invalid === b?.invalid && a?.json === b?.json && a?.password === b?.password;

// Bounded JSON with duplicate decoded names refused before JSON.parse can erase
// them. The exact schema below then narrows all values; no JSON reviver or hooks.
function parseConfiguration(source) {
  let at = 0, nodes = 0;
  const space = () => {while (/[\x20\t\r\n]/.test(source[at] ?? '\0')) at++;};
  const string = () => {
    const start = at++;
    while (at < source.length) {
      const c = source[at++];
      if (c === '\\') {at++; continue;}
      if (c === '"') {
        const value = JSON.parse(source.slice(start,at));
        if (value.length > 16384 || !value.isWellFormed()) invalid();
        return value;
      }
    }
    invalid();
  };
  const value = depth => {
    if (++nodes > 512 || depth > 6) invalid();
    space();
    if (source[at] === '"') return string();
    if (source[at] === '{') {
      at++; space(); const out = Object.create(null), seen = new Set();
      if (source[at] !== '}') while (true) {
        if (source[at] !== '"' || seen.size >= 16) invalid();
        const key = string();
        if (seen.has(key)) invalid();
        seen.add(key); space(); if (source[at++] !== ':') invalid();
        out[key] = value(depth+1); space();
        if (source[at] !== ',') break;
        at++; space();
      }
      if (source[at++] !== '}') invalid();
      return out;
    }
    if (source[at] === '[') {
      at++; space(); const out=[];
      if (source[at] !== ']') while (true) {
        if (out.length >= 16) invalid();
        out.push(value(depth+1)); space();
        if (source[at] !== ',') break;
        at++; space();
      }
      if (source[at++] !== ']') invalid();
      return out;
    }
    const token = /^(?:true|false|null|-?(?:0|[1-9][0-9]*))/.exec(source.slice(at));
    if (!token) invalid();
    at += token[0].length;
    return JSON.parse(token[0]);
  };
  const result = value(0); space(); if (at !== source.length) invalid();
  return result;
}

function identity(config) {
  exact(config,['principal','entitlement','maxTokenAgeSeconds','maxSecurityStateAgeSeconds']);
  if (!integer(config.maxTokenAgeSeconds) || config.maxTokenAgeSeconds < 1 || config.maxTokenAgeSeconds > 300 ||
      !integer(config.maxSecurityStateAgeSeconds) || config.maxSecurityStateAgeSeconds < 1 || config.maxSecurityStateAgeSeconds > 60) invalid();
  const fingerprints = new Set();
  for (const kind of ['principal','entitlement']) {
    const authority = config[kind]; exact(authority,['issuer','audience','keys']);
    if (!text(authority.issuer) || !text(authority.audience) || !Array.isArray(authority.keys) || !authority.keys.length || authority.keys.length > 16) invalid();
    const kids = new Set();
    for (const entry of authority.keys) {
      exact(entry,['kid','publicKeyPem','notBefore','notAfter','revoked']);
      if (typeof entry.kid !== 'string' || !/^[A-Za-z0-9_:./-]{1,200}$/.test(entry.kid) || kids.has(entry.kid) ||
          typeof entry.publicKeyPem !== 'string' || entry.publicKeyPem.length > 8192 ||
          !/^-----BEGIN PUBLIC KEY-----\r?\n(?:[A-Za-z0-9+/=]+\r?\n)+-----END PUBLIC KEY-----\r?\n?$/.test(entry.publicKeyPem) ||
          !integer(entry.notBefore) || !integer(entry.notAfter) || entry.notAfter <= entry.notBefore || typeof entry.revoked !== 'boolean') invalid();
      kids.add(entry.kid);
      const key = createPublicKey(entry.publicKeyPem), details = key.asymmetricKeyDetails;
      if (key.type !== 'public' || key.asymmetricKeyType !== 'rsa' || !details || details.modulusLength < 2048 || details.modulusLength > 4096 || details.publicExponent !== 65537n) invalid();
      const fingerprint = createHash('sha256').update(key.export({type:'spki',format:'der'})).digest('hex');
      if (fingerprints.has(fingerprint)) invalid();
      fingerprints.add(fingerprint);
    }
  }
}

export function compileDeploymentConfig(snapshot) {
  try {
    if (snapshot?.enabled !== true || snapshot.invalid) return null;
    // Recheck even when called directly by trusted server code, not the bootstrap.
    const checked = snapshotDeploymentEnvironment({PAIA_RESERVATIONS_ENABLED:'true', PAIA_RESERVATIONS_CONFIG:snapshot.json, PAIA_RESERVATIONS_DB_PASSWORD:snapshot.password});
    if (checked.invalid) invalid();
    const config = parseConfiguration(checked.json);
    exact(config,['version','profileId','postgres','identityConfig']);
    if (config.version !== 1 || !text(config.profileId)) invalid();
    const db = config.postgres;
    exact(db,['host','port','database','user','caPem']);
    // A reviewed exact DNS target, never a URL, Unix socket, numeric address,
    // local suffix, request-selected endpoint or guessed localhost fallback.
    if (typeof db.host !== 'string' || db.host.length > 253 ||
        !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(db.host) ||
        /(?:^|\.)(?:localhost|local|internal)$/.test(db.host) ||
        !integer(db.port) || db.port < 1 || db.port > 65535 ||
        typeof db.database !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,62}$/.test(db.database) ||
        typeof db.user !== 'string' || !/^[A-Za-z][A-Za-z0-9_.-]{0,127}$/.test(db.user) ||
        /^(?:postgres|anon|authenticated|service_role)(?:\.|$)/i.test(db.user)) invalid();
    if (db.caPem !== null) {
      if (typeof db.caPem !== 'string' || db.caPem.length > 16384 ||
          !/^-----BEGIN CERTIFICATE-----\r?\n(?:[A-Za-z0-9+/=]+\r?\n)+-----END CERTIFICATE-----\r?\n?$/.test(db.caPem) ||
          new X509Certificate(db.caPem).ca !== true) invalid();
    }
    // Same pinned-key profile as the original verifier. This preliminary check
    // prevents invalid trust from opening a socket; actual proofs and current
    // revocations are still verified by the original service in every PG txn.
    identity(config.identityConfig);
    const ssl = {rejectUnauthorized:true, servername:db.host, minVersion:'TLSv1.2', checkServerIdentity};
    if (db.caPem !== null) ssl.ca = db.caPem;
    const poolOptions = {host:db.host, port:db.port, database:db.database, user:db.user, password:checked.password,
      ssl, sslnegotiation:'postgres', options:'-c search_path=pg_catalog', client_encoding:'UTF8', replication:'false',
      application_name:'paia-reservations-v1', fallback_application_name:'paia-reservations-v1',
      max:2, min:0, maxUses:500, maxLifetimeSeconds:300, connectionTimeoutMillis:5000,
      idleTimeoutMillis:10000, statement_timeout:15000, lock_timeout:5000,
      idle_in_transaction_session_timeout:15000, query_timeout:16000,
      keepAlive:true, keepAliveInitialDelayMillis:10000, allowExitOnIdle:true, enableChannelBinding:true};
    return {poolOptions, profileId:config.profileId, identityConfig:structuredClone(config.identityConfig)};
  } catch {invalid();} // No parser, certificate, credential or pg error details.
}
