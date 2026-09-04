import test from 'node:test';
import assert from 'node:assert/strict';

import { buildMySQLConnectionConfig, isMySQLConfigComplete } from './mysql.js';

test('buildMySQLConnectionConfig uses XAMPP defaults', () => {
  const config = buildMySQLConnectionConfig({
    host: 'localhost',
    port: 3306,
    database: 'nexus_erp_db',
    user: 'root',
    password: '',
    ssl: false,
    charset: 'utf8mb4',
    autoSync: true,
  });

  assert.equal(config.host, 'localhost');
  assert.equal(config.port, 3306);
  assert.equal(config.user, 'root');
  assert.equal(config.database, 'nexus_erp_db');
});

test('isMySQLConfigComplete accepts a proper XAMPP config', () => {
  const complete = isMySQLConfigComplete({
    host: 'localhost',
    port: 3306,
    database: 'nexus_erp_db',
    user: 'root',
    password: '',
  });

  assert.equal(complete, true);
});
