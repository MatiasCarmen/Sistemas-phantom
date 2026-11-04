import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { assertSecurityConfig, hashPassword, verifyPassword, signAuthToken, verifyAuthToken, validatePasswordPolicy } from './security.ts';

// security.ts lee el secreto en cada uso, por eso basta con fijarlo antes de ejecutar los tests
process.env.JWT_SECRET = 'secreto-de-pruebas-unitarias-con-mas-de-32-caracteres';

const b64url = (value) => Buffer.from(value).toString('base64url');

test('hashPassword y verifyPassword validan contraseñas con scrypt', () => {
  const hashed = hashPassword('ClaveSegura2026!');
  assert.ok(hashed.startsWith('scrypt$'));
  assert.equal(verifyPassword('ClaveSegura2026!', hashed), true);
  assert.equal(verifyPassword('ClaveIncorrecta', hashed), false);
});

test('verifyPassword falla cerrado (A07/A10): sin hash, texto plano o intento vacío', () => {
  assert.equal(verifyPassword('cualquiera', undefined), false);
  assert.equal(verifyPassword('cualquiera', ''), false);
  assert.equal(verifyPassword('admin123', 'admin123'), false);
  assert.equal(verifyPassword('', hashPassword('ClaveSegura2026!')), false);
});

test('signAuthToken y verifyAuthToken firman y validan JWT con HMAC-SHA256', () => {
  const token = signAuthToken({ id: 'usr-admin', username: 'admin', role: 'admin' });
  assert.equal(token.split('.').length, 3);
  assert.deepEqual(verifyAuthToken(`Bearer ${token}`), { userId: 'usr-admin', role: 'admin', sessionVersion: 0 });

  // Token manipulado debe ser rechazado
  assert.equal(verifyAuthToken(`Bearer ${token}manipulado`), null);
  assert.equal(verifyAuthToken(undefined), null);
});

test('verifyAuthToken rechaza tokens legacy sin firma (A07)', () => {
  assert.equal(verifyAuthToken('Bearer token_usr-admin_1'), null);
});

test('verifyAuthToken rechaza alg "none" y payloads alterados (A07/A08)', () => {
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({ sub: 'usr-admin', role: 'admin', iat: now, exp: now + 60 }));
  const noneHeader = b64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  assert.equal(verifyAuthToken(`Bearer ${noneHeader}.${payload}.`), null);

  const [header, , signature] = signAuthToken({ id: 'usr-vendedor-1', username: 'v', role: 'collaborator' }).split('.');
  assert.equal(verifyAuthToken(`Bearer ${header}.${payload}.${signature}`), null);
});

test('verifyAuthToken rechaza tokens vencidos o sin expiración', () => {
  const secret = process.env.JWT_SECRET;
  const sign = (claims) => {
    const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const body = b64url(JSON.stringify(claims));
    const signature = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    return `Bearer ${header}.${body}.${signature}`;
  };
  const now = Math.floor(Date.now() / 1000);
  assert.equal(verifyAuthToken(sign({ sub: 'usr-admin', sv: 0, iat: now - 100, exp: now - 1 })), null);
  assert.equal(verifyAuthToken(sign({ sub: 'usr-admin', sv: 0, iat: now })), null);
});

test('validatePasswordPolicy exige 8+ caracteres con letras y números', () => {
  assert.notEqual(validatePasswordPolicy(undefined), null);
  assert.notEqual(validatePasswordPolicy('123456'), null);
  assert.notEqual(validatePasswordPolicy('soloLetras'), null);
  assert.notEqual(validatePasswordPolicy('12345678'), null);
  assert.equal(validatePasswordPolicy('Ventas.Phantom2026'), null);
});

test('sin JWT_SECRET (o con uno corto) no se firman tokens: el servidor falla cerrado (A02/A04)', () => {
  const original = process.env.JWT_SECRET;
  try {
    delete process.env.JWT_SECRET;
    assert.throws(() => assertSecurityConfig(), /JWT_SECRET/);
    process.env.JWT_SECRET = 'corto';
    assert.throws(() => signAuthToken({ id: 'usr-admin', username: 'admin', role: 'admin' }), /JWT_SECRET/);
  } finally {
    process.env.JWT_SECRET = original;
  }
});
