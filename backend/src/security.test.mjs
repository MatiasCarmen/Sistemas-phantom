import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword, signAuthToken, verifyAuthToken } from './security.ts';

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
  assert.deepEqual(verified, {
    userId: 'usr-admin',
    role: 'admin',
  });

  // Token manipulado debe ser rechazado
  const tampered = `${token}manipulado`;
  assert.equal(verifyAuthToken(`Bearer ${tampered}`), null);
  assert.equal(verifyAuthToken(undefined), null);
});
