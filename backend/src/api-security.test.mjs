import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';

process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters-long';
process.env.FRONTEND_URL = 'http://localhost:5173';

const { createApp } = await import('./app.ts');

let server;
let baseUrl;

before(async () => {
  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('requiere autenticación para endpoints sensibles y conserva health público', async () => {
  const [health, products, users, database] = await Promise.all([
    fetch(`${baseUrl}/health`),
    fetch(`${baseUrl}/products`),
    fetch(`${baseUrl}/users`),
    fetch(`${baseUrl}/system/raw-db`)
  ]);

  assert.equal(health.status, 200);
  assert.equal(products.status, 401);
  assert.equal(users.status, 401);
  assert.equal(database.status, 401);
});

test('no refleja orígenes CORS no autorizados', async () => {
  const response = await fetch(`${baseUrl}/health`, {
    headers: { Origin: 'https://atacante.example' }
  });

  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), null);
});
