import type { User } from './types';
import { isScryptPasswordHash } from './security';

export function prepareImportedUsers(input: unknown, existing: User[]): User[] {
  if (input === undefined) input = existing;
  if (!Array.isArray(input) || input.length === 0) throw new Error('La importación debe conservar usuarios válidos');
  const identifiers = new Set<string>();
  return input.map(value => {
    if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !value.id || identifiers.has(value.id)) {
      throw new Error('Los identificadores de usuarios importados no son válidos o están duplicados');
    }
    identifiers.add(value.id);
    const password = value.password === undefined
      ? existing.find(user => user.id === value.id)?.password
      : value.password;
    if (!isScryptPasswordHash(password)) {
      throw new Error('La importación requiere hashes scrypt válidos; no admite contraseñas en texto plano');
    }
    return { ...structuredClone(value), password } as User;
  });
}
