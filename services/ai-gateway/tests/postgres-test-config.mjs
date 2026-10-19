// Test-only authority: a literal numeric loopback address, explicit port,
// disposable name and trust-authenticated postgres user. No URI parser options,
// password, query, fragment, hostname resolution or ambient pg target fallback.
export function disposablePostgresConfig(value, disposable) {
  const match = typeof value === 'string' && /^postgres(?:ql)?:\/\/postgres@(127\.0\.0\.1|\[::1\]):([1-9][0-9]{0,4})\/(paia_ledger_test_[a-z0-9_]+)$/.exec(value);
  if (!match || match[0] !== value || disposable !== 'yes' || Number(match[2]) > 65535) throw Error('NOT_RUN: explicit disposable loopback PostgreSQL configuration required');
  return {
    host: match[1] === '[::1]' ? '::1' : '127.0.0.1', port: Number(match[2]),
    user: 'postgres', database: match[3],
    // A function prevents pg from consulting PGPASSWORD/.pgpass; this ephemeral
    // localhost service uses no secret. ssl:false is confined to loopback tests.
    password: () => '', ssl: false, sslnegotiation: 'postgres',
    options: '-c application_name=paia-ledger-disposable-test',
    application_name: 'paia-ledger-disposable-test', client_encoding: 'UTF8',
    connectionTimeoutMillis: 5000,
  };
}
