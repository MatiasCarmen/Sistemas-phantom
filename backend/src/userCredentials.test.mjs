import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareImportedUsers } from './userCredentials.ts';
import { hashPassword, isScryptPasswordHash, verifyPassword } from './security.ts';
import { initialUsers } from './initialData.ts';

test('todos los usuarios iniciales y del reset tienen hashes scrypt válidos', () => {
  assert.equal(initialUsers.length, 5);
  assert.ok(initialUsers.every(user => isScryptPasswordHash(user.password)));
});

test('importación conserva los hashes y recupera credenciales omitidas de usuarios existentes', () => {
  const password = hashPassword('ImportPassword2026!');
  const existing = [{ id: 'import-user', password, name: 'Original' }];
  const result = prepareImportedUsers([{ id: 'import-user', name: 'Importado' }], existing);
  assert.ok(result[0].password === password);
  assert.ok(verifyPassword('ImportPassword2026!', result[0].password));
  assert.equal(existing[0].name, 'Original');
  assert.ok(prepareImportedUsers(existing, [])[0].password === password);
  assert.deepEqual(prepareImportedUsers(undefined, existing), existing);
});

test('importación rechaza texto plano, hashes corruptos y credenciales nuevas ausentes', () => {
  for (const password of ['LegacyPassword2026', '', null, 'scrypt$invalid', undefined]) {
    assert.throws(() => prepareImportedUsers([{ id: 'new-user', password }], []));
  }
  const user = { id: 'duplicate', password: hashPassword('ImportPassword2026!') };
  assert.throws(() => prepareImportedUsers([user, user], []));
  assert.throws(() => prepareImportedUsers([], []));
  assert.throws(() => prepareImportedUsers({}, []));
});
