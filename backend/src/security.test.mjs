import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters-long';
import { hashPassword, verifyPassword, signAuthToken, verifyAuthToken, revokeAuthToken, revokeUserSessions, revokeAllSessions } from './security.ts';
import { loginRateLimit } from './loginRateLimit.ts';

test('hashPassword y verifyPassword validan contraseñas con scrypt y mantienen compatibilidad', () => {
  const hashed = hashPassword('ClaveSegura2026!');
  assert.ok(hashed.startsWith('scrypt$'));
  assert.equal(verifyPassword('ClaveSegura2026!', hashed), true);
  assert.equal(verifyPassword('ClaveIncorrecta', hashed), false);

  // Compatibilidad con usuarios demo preexistentes antes del primer login
  assert.equal(verifyPassword('admin123', 'admin123'), true);
});

test('signAuthToken y verifyAuthToken firman y validan JWT con HMAC-SHA256', () => {
  const token = signAuthToken({
    id: 'usr-admin',
    username: 'admin',
    role: 'admin',
  });

  assert.equal(token.split('.').length, 3);

  const verified = verifyAuthToken(`Bearer ${token}`);
  assert.equal(verified.userId, 'usr-admin');
  assert.equal(verified.role, 'admin');
  assert.match(verified.sessionId, /^[a-f0-9]{64}$/);

  // Token manipulado debe ser rechazado
  const tampered = `${token}manipulado`;
  assert.equal(verifyAuthToken(`Bearer ${tampered}`), null);
  assert.equal(verifyAuthToken(undefined), null);
});

test('rechaza contraseñas ausentes, entradas inválidas y hashes corruptos', () => {
  for (const stored of [undefined, null, '', 'scrypt$', 'scrypt$x$y', 'scrypt$' + 'a'.repeat(32) + '$' + 'z'.repeat(128)]) {
    assert.equal(verifyPassword('CualquierClave2026', stored), false);
  }
  for (const attempt of [undefined, null, '', {}, 123, 'a'.repeat(1025)]) {
    assert.equal(verifyPassword(attempt, 'legacy'), false);
  }
  const encoded = hashPassword('scrypt$ClaveElegida2026');
  assert.equal(verifyPassword('scrypt$ClaveElegida2026', encoded), true);
});

test('revoca solo la sesión cerrada y permite revocar todas las del usuario', () => {
  const user = { id: 'sessions-user', username: 'sessions', role: 'admin' };
  const first = signAuthToken(user);
  const second = signAuthToken(user);
  revokeAuthToken(`Bearer ${first}`);
  assert.equal(verifyAuthToken(`Bearer ${first}`), null);
  assert.ok(verifyAuthToken(`Bearer ${second}`));
  revokeUserSessions(user.id);
  assert.equal(verifyAuthToken(`Bearer ${second}`), null);
});

test('rechaza tokens al alcanzar exactamente su expiración', () => {
  const originalNow = Date.now;
  try {
    const issuedAt = originalNow();
    Date.now = () => issuedAt;
    const token = signAuthToken({ id: 'expires-user', username: 'expires', role: 'admin' });
    Date.now = () => issuedAt + 8 * 60 * 60 * 1000;
    assert.equal(verifyAuthToken(`Bearer ${token}`), null);
  } finally {
    Date.now = originalNow;
  }
});

test('reiniciar el proceso o revocar todas las sesiones impide reutilizar tokens', () => {
  const token = signAuthToken({ id: 'restart-user', username: 'restart', role: 'admin' });
  const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e',
    "import { verifyAuthToken } from './src/security.ts'; process.exit(verifyAuthToken('Bearer ' + process.env.RESTART_TEST_TOKEN) === null ? 0 : 1);"
  ], { env: { ...process.env, RESTART_TEST_TOKEN: token } });
  assert.equal(child.status, 0);
  assert.ok(verifyAuthToken(`Bearer ${token}`));
  revokeAllSessions();
  assert.equal(verifyAuthToken(`Bearer ${token}`), null);
});

test('rate limiting vence, limita por IP e ignora cabeceras falsificadas', () => {
  let time = 1000;
  const middleware = loginRateLimit(() => time);
  const request = { method: 'POST', ip: '127.0.0.1', socket: {}, headers: {} };
  let allowed = 0;
  let status;
  const headers = {};
  const response = { setHeader(key, value) { headers[key] = value; }, status(value) { status = value; return this; }, json() {} };
  for (let i = 0; i < 10; i++) middleware(request, response, () => allowed++);
  request.headers['x-forwarded-for'] = 'another-ip';
  middleware(request, response, () => allowed++);
  assert.equal(allowed, 10);
  assert.equal(status, 429);
  assert.equal(headers['Retry-After'], '900');
  middleware({ ...request, ip: '127.0.0.2' }, response, () => allowed++);
  assert.equal(allowed, 11);
  time += 15 * 60 * 1000;
  middleware(request, response, () => allowed++);
  assert.equal(allowed, 12);
});
