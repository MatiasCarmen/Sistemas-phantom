import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// Entorno aislado: datos en un directorio temporal y MongoDB inexistente (fallback a JSON local)
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phantom-test-'));
process.env.PHANTOM_DATA_DIR = dataDir;
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1';
process.env.JWT_SECRET = 'secreto-de-pruebas-de-integracion-con-mas-de-32-caracteres';
process.env.FRONTEND_URL = 'http://localhost:5173';

const { db } = await import('./dataStore.ts');
const { createApp } = await import('./app.ts');

const ADMIN = { username: 'jperez', password: 'Admin.Phantom2026' };
const COLLABORATOR = { username: 'mgarcia', password: 'Ventas.Phantom2026' };

let server;
let base;

before(async () => {
  await db.initialize();
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await db.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

async function call(method, route, { token, body, headers = {} } = {}) {
  const response = await fetch(`${base}${route}`, {
    method,
    headers: {
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const text = await response.text();
  let json;
  try { json = JSON.parse(text); } catch { json = undefined; }
  return { status: response.status, headers: response.headers, json, text };
}

async function login(credentials) {
  const res = await call('POST', '/auth/login', { body: credentials });
  assert.equal(res.status, 200, `login de ${credentials.username} falló: ${res.text}`);
  return res.json.token;
}

test('A01: sin token, toda la API (salvo health/login) responde 401', async () => {
  for (const [method, route] of [['GET', '/products'], ['GET', '/users'], ['GET', '/system/raw-db'], ['POST', '/system/import'], ['PUT', '/settings'], ['POST', '/system/reset-demo']]) {
    const res = await call(method, route, { body: method === 'GET' ? undefined : {} });
    assert.equal(res.status, 401, `${method} ${route}`);
  }
  assert.equal((await call('GET', '/health')).status, 200);
  assert.deepEqual(Object.keys((await call('GET', '/settings/public')).json.data), ['companyName']);
});

test('A01: un colaborador no accede a funciones de administrador ni escala privilegios', async () => {
  const token = await login(COLLABORATOR);
  assert.equal((await call('GET', '/products', { token })).status, 200);
  assert.equal((await call('GET', '/users', { token })).status, 403);
  assert.equal((await call('GET', '/system/raw-db', { token })).status, 403);
  assert.equal((await call('PUT', '/users/usr-vendedor-1', { token, body: { role: 'admin' } })).status, 403);
  assert.equal((await call('DELETE', '/products/prod-1', { token })).status, 403);
  assert.equal(db.getUserById('usr-vendedor-1').role, 'collaborator');
});

test('A01: el administrador gestiona usuarios y los volcados no exponen hashes', async () => {
  const token = await login(ADMIN);
  assert.equal((await call('GET', '/users', { token })).status, 200);
  const raw = await call('GET', '/system/raw-db', { token });
  assert.equal(raw.status, 200);
  assert.ok(!raw.text.includes('scrypt$'));
  const sql = await call('GET', '/database/mysql-script', { token });
  assert.ok(!sql.text.includes('scrypt$'));
  const lastAdmin = await call('PUT', '/users/usr-admin', { token, body: { role: 'cashier' } });
  assert.equal(lastAdmin.status, 400);
});

test('A07: tokens legacy o falsificados son rechazados y el logout revoca la sesión', async () => {
  assert.equal((await call('GET', '/auth/me', { token: 'token_usr-admin_1' })).status, 401);
  const token = await login({ username: 'cvasquez', password: 'Caja.Phantom2026' });
  assert.equal((await call('GET', '/auth/me', { token })).status, 200);
  assert.equal((await call('POST', '/auth/logout', { token })).status, 200);
  assert.equal((await call('GET', '/auth/me', { token })).status, 401);
});

test('A07: mensajes de login genéricos y bloqueo de cuenta tras 5 fallos', async () => {
  const unknown = await call('POST', '/auth/login', { body: { username: 'no_existe', password: 'x' } });
  const wrong = await call('POST', '/auth/login', { body: { username: 'dsilva', password: 'incorrecta1' } });
  assert.equal(unknown.json.error, wrong.json.error);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    await call('POST', '/auth/login', { body: { username: 'dsilva', password: 'incorrecta1' } });
  }
  const locked = await call('POST', '/auth/login', { body: { username: 'dsilva', password: 'Asesor.Phantom2026' } });
  assert.equal(locked.status, 429);
});

test('A07: no se pueden crear usuarios con contraseñas débiles', async () => {
  const token = await login(ADMIN);
  const res = await call('POST', '/users', { token, body: { username: 'nuevo', name: 'Nuevo', email: 'nuevo@phantom.pe', password: '123456' } });
  assert.equal(res.status, 400);
});

test('A05/A06/A08: validación de entradas y precios recalculados en el servidor', async () => {
  const token = await login(ADMIN);
  const product = db.getProducts().find((item) => item.stock > 2);
  const negative = await call('POST', '/sales', { token, body: { customerName: 'X', items: [{ productId: product.id, quantity: -5 }] } });
  assert.equal(negative.status, 400);
  const badImage = await call('POST', '/products', { token, body: { name: 'P', category: 'C', costPrice: 1, sellingPrice: 2, stock: 1, imageUrl: 'javascript:alert(1)' } });
  assert.equal(badImage.status, 400);
  const tampered = await call('POST', '/sales', {
    token,
    body: { customerName: 'Cliente', sellerName: 'Suplantado', items: [{ productId: product.id, quantity: 1, unitPrice: 0.01, total: 0.01 }], total: 0.01 },
  });
  assert.equal(tampered.status, 201);
  assert.equal(tampered.json.data.items[0].unitPrice, product.sellingPrice);
  assert.equal(tampered.json.data.sellerName, 'Juan Pérez Ramírez');
  const badBackup = await call('POST', '/system/import', { token, body: { products: [] } });
  assert.equal(badBackup.status, 400);
});

test('A02: CORS con lista blanca y cabeceras de seguridad', async () => {
  const evil = await call('GET', '/health', { headers: { Origin: 'https://atacante.example' } });
  assert.equal(evil.headers.get('access-control-allow-origin'), null);
  const allowed = await call('GET', '/health', { headers: { Origin: 'http://localhost:5173' } });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.equal(evil.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(evil.headers.get('x-powered-by'), null);
  const huge = await call('POST', '/auth/login', { body: JSON.stringify({ username: 'a'.repeat(2_000_000) }) });
  assert.equal(huge.status, 413);
});

test('A10/A09: errores sin detalles internos y eventos de seguridad en la bitácora', async () => {
  const malformed = await call('POST', '/auth/login', { body: '{"username":' });
  assert.equal(malformed.status, 400);
  assert.doesNotMatch(malformed.text, /Unexpected|SyntaxError|at position/);

  const token = await login(ADMIN);
  const logs = await call('GET', '/audit/logs?entity=Seguridad&limit=100', { token });
  const actions = new Set(logs.json.data.events.map((event) => event.action));
  for (const action of ['login', 'login_failed', 'account_locked', 'logout', 'access_denied']) {
    assert.ok(actions.has(action), `falta el evento ${action}`);
  }
  const integrity = await call('GET', '/audit/verify', { token });
  assert.equal(integrity.json.data.valid, true);
});
