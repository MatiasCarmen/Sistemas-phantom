import mysql, { type ConnectionOptions } from 'mysql2/promise';
import type { Customer, MySQLConfig, MySQLTestResult, Quote, Sale, User, UserRole } from '../src/types';
import type { DatabaseSchema } from './dataStore';

export type MySQLConnectionInput = Partial<MySQLConfig>;
export type PersistedDatabase = Partial<DatabaseSchema>;

export function buildMySQLConnectionConfig(config: MySQLConnectionInput): ConnectionOptions {
  const port = Number(config.port ?? process.env.MYSQL_PORT ?? 3306);

  return {
    host: config.host || process.env.MYSQL_HOST || 'localhost',
    port: Number.isFinite(port) ? port : 3306,
    database: config.database || process.env.MYSQL_DATABASE || 'nexus_erp_db',
    user: config.user || process.env.MYSQL_USER || 'root',
    password: config.password ?? process.env.MYSQL_PASSWORD ?? '',
    charset: config.charset || 'utf8mb4',
    timezone: '+00:00',
    connectTimeout: 15000,
    dateStrings: true,
    multipleStatements: true,
    supportBigNumbers: true,
    bigNumberStrings: true,
  };
}

export function isMySQLConfigComplete(config: MySQLConnectionInput): boolean {
  return !!(
    config.host &&
    config.database &&
    config.user &&
    config.port !== undefined &&
    config.port !== null &&
    String(config.port).trim() !== ''
  );
}

function normalizeUserRoleForMySQL(role?: string): string {
  const normalized = String(role || 'collaborator').toLowerCase();
  if (normalized === 'admin') return 'admin';
  if (normalized === 'warehouse') return 'almacenero';
  if (normalized === 'cashier') return 'supervisor';
  if (normalized === 'collaborator' || normalized === 'vendedor') return 'vendedor';
  return 'vendedor';
}

export async function ensureMySQLSchema(config: MySQLConnectionInput): Promise<void> {
  if (!isMySQLConfigComplete(config)) {
    throw new Error('Faltan parámetros obligatorios para la conexión MySQL.');
  }

  const baseConfig = {
    host: config.host || 'localhost',
    port: Number(config.port || 3306),
    user: config.user || 'root',
    password: config.password ?? '',
    charset: config.charset || 'utf8mb4',
    connectTimeout: 15000,
  };

  const adminConnection = await mysql.createConnection(baseConfig);
  try {
    await adminConnection.execute(`CREATE DATABASE IF NOT EXISTS \`${config.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
  } finally {
    await adminConnection.end().catch(() => undefined);
  }

  const prefix = config.tablePrefix || 'nexus_';
  const connection = await mysql.createConnection(buildMySQLConnectionConfig(config));
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ${prefix}erp_state (
        id VARCHAR(64) PRIMARY KEY,
        payload JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ${prefix}mysql_config (
        id VARCHAR(64) PRIMARY KEY,
        payload JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS categories (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        description TEXT NULL,
        color VARCHAR(30) NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS suppliers (
        id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        doc_type VARCHAR(20) NULL,
        doc_number VARCHAR(30) NULL,
        email VARCHAR(150) NULL,
        phone VARCHAR(30) NULL,
        address TEXT NULL,
        contact_person VARCHAR(150) NULL,
        payment_terms VARCHAR(50) NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ${prefix}customers (
        id VARCHAR(64) PRIMARY KEY,
        payload JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ${prefix}quotes (
        id VARCHAR(64) PRIMARY KEY,
        payload JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS ${prefix}sales (
        id VARCHAR(64) PRIMARY KEY,
        payload JSON NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(64) PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password VARCHAR(255) NULL,
        role VARCHAR(30) NOT NULL DEFAULT 'vendedor' CHECK (role IN ('admin', 'vendedor', 'almacenero', 'supervisor', 'collaborator', 'warehouse', 'cashier')),
        role_label VARCHAR(100) NULL,
        avatar_color VARCHAR(50) NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
        permissions JSON NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_login TIMESTAMP NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    const [columns] = await connection.query('SHOW COLUMNS FROM users') as any[];
    const existingColumns = new Set((Array.isArray(columns) ? columns : []).map((column: any) => String(column.Field)));
    const addColumnStatements = [
      ['role_label', 'ALTER TABLE users ADD COLUMN role_label VARCHAR(100) NULL AFTER role'],
      ['avatar_color', 'ALTER TABLE users ADD COLUMN avatar_color VARCHAR(50) NULL AFTER role_label'],
      ['status', 'ALTER TABLE users ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT "active" AFTER avatar_color'],
      ['permissions', 'ALTER TABLE users ADD COLUMN permissions JSON NULL AFTER status'],
      ['created_at', 'ALTER TABLE users ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER permissions'],
      ['last_login', 'ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL AFTER created_at']
    ];

    for (const [columnName, sql] of addColumnStatements) {
      if (!existingColumns.has(columnName)) {
        await connection.execute(sql);
      }
    }
  } finally {
    await connection.end().catch(() => undefined);
  }
}

export async function saveDatabaseSnapshot(config: MySQLConnectionInput, dbState: PersistedDatabase): Promise<void> {
  if (!isMySQLConfigComplete(config)) {
    throw new Error('Faltan parámetros obligatorios para guardar la base en MySQL.');
  }

  const prefix = config.tablePrefix || 'nexus_';
  const connection = await mysql.createConnection(buildMySQLConnectionConfig(config));
  try {
    const payload = JSON.stringify(dbState);
    await connection.execute(
      `INSERT INTO ${prefix}erp_state (id, payload) VALUES ('default', ?) ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
      [payload]
    );
  } finally {
    await connection.end().catch(() => undefined);
  }
}

export async function loadDatabaseSnapshot(config: MySQLConnectionInput): Promise<PersistedDatabase | null> {
  if (!isMySQLConfigComplete(config)) {
    return null;
  }

  const prefix = config.tablePrefix || 'nexus_';
  const connection = await mysql.createConnection(buildMySQLConnectionConfig(config));
  try {
    const [rows] = await connection.execute(
      `SELECT payload FROM ${prefix}erp_state WHERE id = ? LIMIT 1`,
      ['default']
    ) as any[];

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const payload = rows[0]?.payload;
    if (!payload) {
      return null;
    }

    return typeof payload === 'string' ? JSON.parse(payload) : payload;
  } catch {
    return null;
  } finally {
    await connection.end().catch(() => undefined);
  }
}

export async function saveMySQLRuntimeConfig(config: MySQLConnectionInput): Promise<void> {
  if (!isMySQLConfigComplete(config)) {
    return;
  }

  const prefix = config.tablePrefix || 'nexus_';
  const connection = await mysql.createConnection(buildMySQLConnectionConfig(config));
  try {
    await connection.execute(
      `INSERT INTO ${prefix}mysql_config (id, payload) VALUES ('runtime', ?) ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
      [JSON.stringify(config)]
    );
  } finally {
    await connection.end().catch(() => undefined);
  }
}

export async function loadProductsFromMySQL(config: MySQLConnectionInput): Promise<any[] | null> {
  if (!isMySQLConfigComplete(config)) {
    return null;
  }

  const connection = await mysql.createConnection(buildMySQLConnectionConfig(config));
  try {
    const [rows] = await connection.execute('SELECT * FROM products ORDER BY created_at ASC') as any[];
    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    return rows.map((row: any) => ({
      id: String(row.id || `prod-${Date.now()}`),
      sku: String(row.sku || ''),
      barcode: row.barcode ? String(row.barcode) : '',
      name: String(row.name || ''),
      description: row.description ? String(row.description) : '',
      category: String(row.category_name || row.category_id || 'General'),
      brand: '',
      costPrice: Number(row.cost_price ?? 0),
      sellingPrice: Number(row.sale_price ?? row.cost_price ?? 0),
      taxRate: 18,
      stock: Number(row.stock ?? 0),
      minStock: Number(row.min_stock ?? 0),
      maxStock: Number(row.max_stock ?? Math.max(Number(row.stock ?? 0), Number(row.min_stock ?? 0)) + 10),
      unit: String(row.unit || 'UND'),
      location: row.location ? String(row.location) : '',
      supplierId: '',
      supplierName: row.supplier_name ? String(row.supplier_name) : '',
      imageUrl: '',
      status: (() => {
        const qty = Number(row.stock ?? 0);
        const minQty = Number(row.min_stock ?? 0);
        if (qty <= 0) return 'out_of_stock';
        if (qty <= minQty) return 'low_stock';
        return 'in_stock';
      })(),
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    }));
  } catch {
    return null;
  } finally {
    await connection.end().catch(() => undefined);
  }
}

export async function loadCategoriesFromMySQL(config: MySQLConnectionInput): Promise<any[] | null> {
  if (!isMySQLConfigComplete(config)) {
    return null;
  }

  const connection = await mysql.createConnection(buildMySQLConnectionConfig(config));
  try {
    const [rows] = await connection.execute('SELECT * FROM categories ORDER BY name ASC') as any[];
    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    return rows.map((row: any) => ({
      id: String(row.id || `cat-${Date.now()}`),
      name: String(row.name || 'General'),
      description: row.description ? String(row.description) : '',
      color: row.color ? String(row.color) : '#64748b',
      itemCount: 0
    }));
  } catch {
    return null;
  } finally {
    await connection.end().catch(() => undefined);
  }
}

export async function loadSuppliersFromMySQL(config: MySQLConnectionInput): Promise<any[] | null> {
  if (!isMySQLConfigComplete(config)) {
    return null;
  }

  const connection = await mysql.createConnection(buildMySQLConnectionConfig(config));
  try {
    const [rows] = await connection.execute('SELECT * FROM suppliers ORDER BY name ASC') as any[];
    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    return rows.map((row: any) => ({
      id: String(row.id || `sup-${Date.now()}`),
      name: String(row.name || ''),
      taxId: String(row.doc_number || ''),
      email: String(row.email || ''),
      phone: String(row.phone || ''),
      address: row.address ? String(row.address) : '',
      contactPerson: row.contact_person ? String(row.contact_person) : '',
      paymentTerms: row.payment_terms ? String(row.payment_terms) : '',
      notes: '',
      createdAt: new Date().toISOString()
    }));
  } catch {
    return null;
  } finally {
    await connection.end().catch(() => undefined);
  }
}

export async function saveCategoriesToMySQL(config: MySQLConnectionInput, categories: any[]): Promise<void> {
  if (!isMySQLConfigComplete(config)) {
    return;
  }

  const connection = await mysql.createConnection(buildMySQLConnectionConfig(config));
  try {
    for (const category of categories) {
      await connection.execute(
        `INSERT INTO categories (id, name, description, color)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           description = VALUES(description),
           color = VALUES(color)`,
        [
          category.id,
          category.name || 'General',
          category.description || '',
          category.color || '#64748b'
        ]
      );
    }
  } finally {
    await connection.end().catch(() => undefined);
  }
}

export async function saveSuppliersToMySQL(config: MySQLConnectionInput, suppliers: any[]): Promise<void> {
  if (!isMySQLConfigComplete(config)) {
    return;
  }

  const connection = await mysql.createConnection(buildMySQLConnectionConfig(config));
  try {
    for (const supplier of suppliers) {
      await connection.execute(
        `INSERT INTO suppliers (id, name, doc_type, doc_number, email, phone, address, contact_person, payment_terms, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           doc_type = VALUES(doc_type),
           doc_number = VALUES(doc_number),
           email = VALUES(email),
           phone = VALUES(phone),
           address = VALUES(address),
           contact_person = VALUES(contact_person),
           payment_terms = VALUES(payment_terms),
           status = VALUES(status)`,
        [
          supplier.id,
          supplier.name || '',
          supplier.taxId && supplier.taxId.length === 11 ? 'RUC' : 'DNI',
          supplier.taxId || '',
          supplier.email || '',
          supplier.phone || '',
          supplier.address || '',
          supplier.contactPerson || '',
          supplier.paymentTerms || '',
          supplier.status || 'active'
        ]
      );
    }
  } finally {
    await connection.end().catch(() => undefined);
  }
}

async function ensureCustomerRowExistsForConnection(
  connection: Awaited<ReturnType<typeof mysql.createConnection>>,
  customerId: string,
  customerName: string,
  customerTaxId?: string
): Promise<void> {
  if (!customerId) {
    return;
  }

  const normalizedCustomerId = String(customerId).trim();
  if (!normalizedCustomerId) {
    return;
  }

  const [existingRows] = await connection.execute('SELECT id FROM customers WHERE id = ? LIMIT 1', [normalizedCustomerId]) as any[];
  if (Array.isArray(existingRows) && existingRows.length > 0) {
    return;
  }

  const safeName = (customerName || normalizedCustomerId || 'Cliente').slice(0, 150);
  const safeTaxId = String(customerTaxId || `DOC-${normalizedCustomerId}`).slice(0, 30);
  const docType = safeTaxId.length === 8 ? 'DNI' : safeTaxId.length === 11 ? 'RUC' : 'DNI';

  await connection.execute(
    `INSERT INTO customers (id, name, doc_type, doc_number, email, phone, address, contact_person, status)
     VALUES (?, ?, ?, ?, '', '', '', '', 'active')
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       doc_type = VALUES(doc_type),
       doc_number = VALUES(doc_number),
       status = VALUES(status)`,
    [normalizedCustomerId, safeName, docType, safeTaxId]
  );
}

export async function deleteCustomerFromMySQL(config: MySQLConnectionInput, customerId: string): Promise<void> {
  if (!isMySQLConfigComplete(config) || !customerId) {
    return;
  }

  const connection = await mysql.createConnection(buildMySQLConnectionConfig(config));
  try {
    await connection.execute('DELETE FROM customers WHERE id = ?', [customerId]);
  } finally {
    await connection.end().catch(() => undefined);
  }
}

export async function saveCustomersToMySQL(config: MySQLConnectionInput, customers: Customer[]): Promise<void> {
  if (!isMySQLConfigComplete(config)) {
    return;
  }

  const prefix = config.tablePrefix || 'nexus_';
  const connection = await mysql.createConnection(buildMySQLConnectionConfig(config));
  try {
    for (const customer of customers) {
      const docType = customer.taxId && customer.taxId.length === 8 ? 'DNI' : 'RUC';
      await connection.execute(
        `INSERT INTO customers (id, name, doc_type, doc_number, email, phone, address, contact_person, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           name = VALUES(name),
           doc_type = VALUES(doc_type),
           doc_number = VALUES(doc_number),
           email = VALUES(email),
           phone = VALUES(phone),
           address = VALUES(address),
           contact_person = VALUES(contact_person),
           status = VALUES(status)`,
        [
          customer.id,
          customer.name,
          docType,
          customer.taxId || '',
          customer.email || '',
          customer.phone || '',
          customer.address || '',
          customer.contactPerson || '',
          customer.status || 'active'
        ]
      );

      await connection.execute(
        `INSERT INTO ${prefix}customers (id, payload) VALUES (?, ?) ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
        [customer.id, JSON.stringify(customer)]
      );
    }
  } finally {
    await connection.end().catch(() => undefined);
  }
}

export async function loadCustomersFromMySQL(config: MySQLConnectionInput): Promise<Customer[] | null> {
  if (!isMySQLConfigComplete(config)) {
    return null;
  }

  const connection = await mysql.createConnection(buildMySQLConnectionConfig(config));
  try {
    const [rows] = await connection.execute('SELECT * FROM customers ORDER BY name ASC') as any[];
    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    return rows.map((row: any) => ({
      id: String(row.id || `cust-${Date.now()}`),
      name: String(row.name || ''),
      taxId: String(row.doc_number || ''),
      email: String(row.email || ''),
      phone: String(row.phone || ''),
      address: row.address ? String(row.address) : '',
      city: '',
      creditLimit: 0,
      paymentTerms: '',
      notes: '',
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      totalPurchases: 0
    }));
  } catch {
    return null;
  } finally {
    await connection.end().catch(() => undefined);
  }
}

export async function deleteQuoteFromMySQL(config: MySQLConnectionInput, quoteId: string): Promise<void> {
  if (!isMySQLConfigComplete(config) || !quoteId) {
    return;
  }

  const connection = await mysql.createConnection(buildMySQLConnectionConfig(config));
  try {
    await connection.execute('DELETE FROM quotes WHERE id = ?', [quoteId]);
  } finally {
    await connection.end().catch(() => undefined);
  }
}

export async function saveQuotesToMySQL(config: MySQLConnectionInput, quotes: Quote[]): Promise<void> {
  if (!isMySQLConfigComplete(config)) {
    return;
  }

  const prefix = config.tablePrefix || 'nexus_';
  const connection = await mysql.createConnection(buildMySQLConnectionConfig(config));
  try {
    for (const quote of quotes) {
      await ensureCustomerRowExistsForConnection(connection, quote.customerId || '', quote.customerName || 'Cliente', quote.customerTaxId || '');

      const statusValue = String(quote.status || 'DRAFT').toLowerCase();
      const mappedStatus = statusValue === 'approved' ? 'approved' : statusValue === 'sent' ? 'sent' : statusValue === 'rejected' ? 'rejected' : statusValue === 'expired' ? 'expired' : statusValue === 'converted' ? 'converted' : 'draft';
      const rowItems = JSON.stringify(
        (quote.items || []).map((item) => ({
          product_id: item.productId,
          productId: item.productId,
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unitPrice,
          unitPrice: item.unitPrice,
          cost_price: item.costPrice,
          costPrice: item.costPrice,
          discount_percent: item.discountPercent,
          discountPercent: item.discountPercent,
          tax_rate: item.taxRate,
          taxRate: item.taxRate,
          subtotal: item.subtotal,
          tax_amount: item.taxAmount,
          total: item.total
        }))
      );

      await connection.execute(
        `INSERT INTO quotes (id, code, customer_id, customer_name, customer_doc, subtotal, tax, total, status, payment_condition, delivery_time, valid_until, notes, items, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           code = VALUES(code),
           customer_id = VALUES(customer_id),
           customer_name = VALUES(customer_name),
           customer_doc = VALUES(customer_doc),
           subtotal = VALUES(subtotal),
           tax = VALUES(tax),
           total = VALUES(total),
           status = VALUES(status),
           payment_condition = VALUES(payment_condition),
           delivery_time = VALUES(delivery_time),
           valid_until = VALUES(valid_until),
           notes = VALUES(notes),
           items = VALUES(items)`,
        [
          quote.id,
          quote.quoteNumber || '',
          quote.customerId || '',
          quote.customerName || '',
          quote.customerTaxId || '',
          Number(quote.subtotal || 0),
          Number(quote.taxTotal || 0),
          Number(quote.total || 0),
          mappedStatus,
          quote.paymentTerms || '',
          quote.paymentTerms || '',
          quote.expiryDate || quote.date || new Date().toISOString().split('T')[0],
          quote.notes || '',
          rowItems,
          quote.createdAt || new Date().toISOString()
        ]
      );

      await connection.execute(
        `INSERT INTO ${prefix}quotes (id, payload) VALUES (?, ?) ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
        [quote.id, JSON.stringify(quote)]
      );
    }
  } finally {
    await connection.end().catch(() => undefined);
  }
}

export async function loadQuotesFromMySQL(config: MySQLConnectionInput): Promise<Quote[] | null> {
  if (!isMySQLConfigComplete(config)) {
    return null;
  }

  const connection = await mysql.createConnection(buildMySQLConnectionConfig(config));
  try {
    const [rows] = await connection.execute('SELECT * FROM quotes ORDER BY created_at ASC') as any[];
    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    return rows.map((row: any) => {
      const itemsSource = typeof row.items === 'string' ? JSON.parse(row.items || '[]') : Array.isArray(row.items) ? row.items : [];
      const mappedItems = (Array.isArray(itemsSource) ? itemsSource : []).map((item: any, idx: number) => ({
        id: String(item.product_id || item.id || `${row.id}-${idx}`),
        productId: String(item.product_id || item.productId || ''),
        sku: String(item.sku || item.product_id || ''),
        name: String(item.name || item.product_name || ''),
        unit: String(item.unit || 'UND'),
        unitPrice: Number(item.unit_price ?? item.unitPrice ?? 0),
        costPrice: Number(item.cost_price ?? item.costPrice ?? 0),
        quantity: Number(item.quantity ?? 0),
        discountPercent: Number(item.discount_percent ?? item.discountPercent ?? 0),
        taxRate: Number(item.tax_rate ?? item.taxRate ?? 18),
        subtotal: Number(item.subtotal ?? 0),
        taxAmount: Number(item.tax_amount ?? item.taxAmount ?? 0),
        total: Number(item.total ?? 0)
      }));

      const statusMap: Record<string, Quote['status']> = {
        draft: 'DRAFT',
        sent: 'SENT',
        approved: 'APPROVED',
        rejected: 'REJECTED',
        expired: 'EXPIRED',
        converted: 'CONVERTED'
      };

      return {
        id: String(row.id || `quote-${Date.now()}`),
        quoteNumber: String(row.code || ''),
        customerId: String(row.customer_id || ''),
        customerName: String(row.customer_name || ''),
        customerTaxId: String(row.customer_doc || ''),
        customerEmail: '',
        customerPhone: '',
        customerAddress: '',
        date: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        expiryDate: row.valid_until ? new Date(row.valid_until).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        status: statusMap[String(row.status || 'draft').toLowerCase()] || 'DRAFT',
        items: mappedItems,
        subtotal: Number(row.subtotal ?? 0),
        discountTotal: 0,
        taxTotal: Number(row.tax ?? 0),
        total: Number(row.total ?? 0),
        currency: 'S/.',
        paymentTerms: String(row.payment_condition || 'Contado'),
        notes: row.notes ? String(row.notes) : '',
        termsAndConditions: '',
        createdBy: 'Sistema',
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        updatedAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      };
    });
  } catch {
    return null;
  } finally {
    await connection.end().catch(() => undefined);
  }
}

export async function saveProductsToMySQL(config: MySQLConnectionInput, products: any[]): Promise<void> {
  if (!isMySQLConfigComplete(config)) {
    return;
  }

  const connection = await mysql.createConnection(buildMySQLConnectionConfig(config));
  try {
    for (const product of products) {
      await connection.execute(
        `INSERT INTO products (id, sku, name, description, category_name, cost_price, sale_price, stock, min_stock, unit, warehouse, location, barcode, supplier_name, status, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE
           sku = VALUES(sku),
           name = VALUES(name),
           description = VALUES(description),
           category_name = VALUES(category_name),
           cost_price = VALUES(cost_price),
           sale_price = VALUES(sale_price),
           stock = VALUES(stock),
           min_stock = VALUES(min_stock),
           unit = VALUES(unit),
           warehouse = VALUES(warehouse),
           location = VALUES(location),
           barcode = VALUES(barcode),
           supplier_name = VALUES(supplier_name),
           status = VALUES(status),
           updated_at = CURRENT_TIMESTAMP`,
        [
          product.id,
          product.sku || '',
          product.name || '',
          product.description || '',
          product.category || 'General',
          Number(product.costPrice ?? 0),
          Number(product.sellingPrice ?? 0),
          Number(product.stock ?? 0),
          Number(product.minStock ?? 0),
          product.unit || 'UND',
          product.location || 'Almacén Central',
          product.location || '',
          product.barcode || '',
          product.supplierName || '',
          product.status || 'in_stock'
        ]
      );
    }
  } finally {
    await connection.end().catch(() => undefined);
  }
}

export async function saveUsersToMySQL(config: MySQLConnectionInput, users: User[]): Promise<void> {
  if (!isMySQLConfigComplete(config)) {
    return;
  }

  const connection = await mysql.createConnection(buildMySQLConnectionConfig(config));
  try {
    for (const user of users) {
      const mappedRole = normalizeUserRoleForMySQL(user.role);

      await connection.execute(
        `INSERT INTO users (id, username, name, email, password, role, role_label, avatar_color, status, permissions, created_at, last_login)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           username = VALUES(username),
           name = VALUES(name),
           email = VALUES(email),
           password = VALUES(password),
           role = VALUES(role),
           role_label = VALUES(role_label),
           avatar_color = VALUES(avatar_color),
           status = VALUES(status),
           permissions = VALUES(permissions),
           last_login = VALUES(last_login)`,
        [
          user.id,
          user.username || '',
          user.name || '',
          user.email || '',
          user.password ?? '',
          mappedRole,
          user.roleLabel || '',
          user.avatarColor || '',
          user.status || 'active',
          JSON.stringify(user.permissions || {}),
          user.createdAt || new Date().toISOString(),
          user.lastLogin || null
        ]
      );
    }
  } finally {
    await connection.end().catch(() => undefined);
  }
}

export async function saveInventoryMovementsToMySQL(config: MySQLConnectionInput, movements: any[]): Promise<void> {
  if (!isMySQLConfigComplete(config)) {
    return;
  }

  const connection = await mysql.createConnection(buildMySQLConnectionConfig(config));
  try {
    for (const movement of movements) {
      const typeValue = String(movement.type || 'ajuste').toLowerCase();
      const mappedType = typeValue.includes('entrada') ? 'entrada' : typeValue.includes('salida') ? 'salida' : 'ajuste';

      await connection.execute(
        `INSERT INTO inventory_movements (id, product_id, product_name, type, quantity, previous_stock, new_stock, unit_cost, total_cost, reason, document_number, warehouse, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           product_id = VALUES(product_id),
           product_name = VALUES(product_name),
           type = VALUES(type),
           quantity = VALUES(quantity),
           previous_stock = VALUES(previous_stock),
           new_stock = VALUES(new_stock),
           unit_cost = VALUES(unit_cost),
           total_cost = VALUES(total_cost),
           reason = VALUES(reason),
           document_number = VALUES(document_number),
           warehouse = VALUES(warehouse),
           created_by = VALUES(created_by),
           created_at = VALUES(created_at)`,
        [
          movement.id,
          movement.productId || '',
          movement.productName || '',
          mappedType,
          Number(movement.quantity ?? 0),
          Number(movement.previousStock ?? 0),
          Number(movement.newStock ?? 0),
          Number(movement.unitCost ?? 0),
          Number((movement.unitCost ?? 0) * (movement.quantity ?? 0)),
          movement.notes || '',
          movement.referenceId || '',
          'Almacén Central',
          movement.createdBy || 'Sistema',
          movement.createdAt || new Date().toISOString()
        ]
      );
    }
  } finally {
    await connection.end().catch(() => undefined);
  }
}

export async function saveSalesToMySQL(config: MySQLConnectionInput, sales: Sale[]): Promise<void> {
  if (!isMySQLConfigComplete(config)) {
    return;
  }

  const prefix = config.tablePrefix || 'nexus_';
  const connection = await mysql.createConnection(buildMySQLConnectionConfig(config));
  try {
    for (const sale of sales) {
      await ensureCustomerRowExistsForConnection(connection, sale.customerId || '', sale.customerName || 'Cliente', sale.customerTaxId || '');

      const mappedStatus = sale.status === 'CANCELLED' ? 'cancelled' : 'completed';
      const paymentMethod = String(sale.paymentMethod || 'TRANSFER').toLowerCase();
      const mappedPayment = paymentMethod === 'cash' ? 'efectivo' : paymentMethod === 'card' ? 'tarjeta' : paymentMethod === 'transfer' ? 'transferencia' : paymentMethod === 'credit' ? 'crédito' : 'transferencia';
      const rowItems = JSON.stringify(
        (sale.items || []).map((item) => ({
          product_id: item.productId,
          productId: item.productId,
          sku: item.sku,
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unitPrice,
          unitPrice: item.unitPrice,
          cost_price: item.costPrice,
          costPrice: item.costPrice,
          discount_percent: item.discountPercent,
          discountPercent: item.discountPercent,
          tax_rate: item.taxRate,
          taxRate: item.taxRate,
          subtotal: item.subtotal,
          tax_amount: item.taxAmount,
          total: item.total
        }))
      );

      await connection.execute(
        `INSERT INTO sales (id, invoice_number, customer_id, customer_name, customer_doc, subtotal, tax, total, payment_method, status, items, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           invoice_number = VALUES(invoice_number),
           customer_id = VALUES(customer_id),
           customer_name = VALUES(customer_name),
           customer_doc = VALUES(customer_doc),
           subtotal = VALUES(subtotal),
           tax = VALUES(tax),
           total = VALUES(total),
           payment_method = VALUES(payment_method),
           status = VALUES(status),
           items = VALUES(items)`,
        [
          sale.id,
          sale.saleNumber || '',
          sale.customerId || '',
          sale.customerName || '',
          sale.customerTaxId || '',
          Number(sale.subtotal || 0),
          Number(sale.taxTotal || 0),
          Number(sale.total || 0),
          mappedPayment,
          mappedStatus,
          rowItems,
          sale.createdAt || new Date().toISOString()
        ]
      );

      await connection.execute(
        `INSERT INTO ${prefix}sales (id, payload) VALUES (?, ?) ON DUPLICATE KEY UPDATE payload = VALUES(payload), updated_at = CURRENT_TIMESTAMP`,
        [sale.id, JSON.stringify(sale)]
      );
    }
  } finally {
    await connection.end().catch(() => undefined);
  }
}

export async function loadSalesFromMySQL(config: MySQLConnectionInput): Promise<Sale[] | null> {
  if (!isMySQLConfigComplete(config)) {
    return null;
  }

  const connection = await mysql.createConnection(buildMySQLConnectionConfig(config));
  try {
    const [rows] = await connection.execute('SELECT * FROM sales ORDER BY created_at ASC') as any[];
    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    return rows.map((row: any) => {
      const itemsSource = typeof row.items === 'string' ? JSON.parse(row.items || '[]') : Array.isArray(row.items) ? row.items : [];
      const mappedItems = (Array.isArray(itemsSource) ? itemsSource : []).map((item: any, idx: number) => ({
        id: String(item.product_id || item.id || `${row.id}-${idx}`),
        productId: String(item.product_id || item.productId || ''),
        sku: String(item.sku || item.product_id || ''),
        name: String(item.name || item.product_name || ''),
        unit: String(item.unit || 'UND'),
        unitPrice: Number(item.unit_price ?? item.unitPrice ?? 0),
        costPrice: Number(item.cost_price ?? item.costPrice ?? 0),
        quantity: Number(item.quantity ?? 0),
        discountPercent: Number(item.discount_percent ?? item.discountPercent ?? 0),
        taxRate: Number(item.tax_rate ?? item.taxRate ?? 18),
        subtotal: Number(item.subtotal ?? 0),
        taxAmount: Number(item.tax_amount ?? item.taxAmount ?? 0),
        total: Number(item.total ?? 0)
      }));

      const saleStatus = String(row.status || 'completed').toLowerCase();
      const paymentMap: Record<string, any> = {
        cash: 'CASH',
        tarjeta: 'CARD',
        transferencia: 'TRANSFER',
        transfer: 'TRANSFER',
        credito: 'CREDIT',
        mixed: 'MIXED',
        'transferencia bancaria': 'TRANSFER'
      };

      const invoiceNumber = String(row.invoice_number || '');
      const voucherType = invoiceNumber.toUpperCase().startsWith('BOL') ? 'BOLETA' : invoiceNumber.toUpperCase().startsWith('TIC') ? 'TICKET' : 'FACTURA';

      return {
        id: String(row.id || `sale-${Date.now()}`),
        saleNumber: invoiceNumber,
        voucherType,
        customerId: String(row.customer_id || ''),
        customerName: String(row.customer_name || ''),
        customerTaxId: String(row.customer_doc || ''),
        customerEmail: '',
        customerPhone: '',
        customerAddress: '',
        date: row.created_at ? new Date(row.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        items: mappedItems,
        subtotal: Number(row.subtotal ?? 0),
        discountTotal: 0,
        taxTotal: Number(row.tax ?? 0),
        total: Number(row.total ?? 0),
        currency: 'S/.',
        paymentMethod: paymentMap[String(row.payment_method || '').toLowerCase()] || 'TRANSFER',
        paymentStatus: saleStatus === 'cancelled' ? 'PENDING' : 'PAID',
        paidAmount: Number(row.total ?? 0),
        dueAmount: 0,
        quoteIdReference: undefined,
        quoteNumberReference: undefined,
        notes: '',
        sellerName: 'Sistema',
        status: saleStatus === 'cancelled' ? 'CANCELLED' : 'COMPLETED',
        cancellationReason: saleStatus === 'cancelled' ? 'Anulada en MySQL' : undefined,
        cancelledAt: saleStatus === 'cancelled' ? new Date().toISOString() : undefined,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        updatedAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      };
    });
  } catch {
    return null;
  } finally {
    await connection.end().catch(() => undefined);
  }
}

export async function loadInventoryMovementsFromMySQL(config: MySQLConnectionInput): Promise<any[] | null> {
  if (!isMySQLConfigComplete(config)) {
    return null;
  }

  const connection = await mysql.createConnection(buildMySQLConnectionConfig(config));
  try {
    const [rows] = await connection.execute('SELECT * FROM inventory_movements ORDER BY created_at ASC') as any[];
    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    return rows.map((row: any) => ({
      id: String(row.id || `mov-${Date.now()}`),
      productId: String(row.product_id || ''),
      productSku: '',
      productName: String(row.product_name || ''),
      type: String(row.type || 'IN_ADJUSTMENT').toUpperCase().startsWith('ENTR') ? 'IN_ADJUSTMENT' : 'OUT_SALE',
      quantity: Number(row.quantity ?? 0),
      previousStock: Number(row.previous_stock ?? 0),
      newStock: Number(row.new_stock ?? 0),
      unitCost: Number(row.unit_cost ?? 0),
      referenceId: row.document_number ? String(row.document_number) : undefined,
      notes: row.reason ? String(row.reason) : '',
      createdBy: row.created_by ? String(row.created_by) : 'Sistema',
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    }));
  } catch {
    return null;
  } finally {
    await connection.end().catch(() => undefined);
  }
}

export async function loadUsersFromMySQL(config: MySQLConnectionInput): Promise<User[] | null> {
  if (!isMySQLConfigComplete(config)) {
    return null;
  }

  const connection = await mysql.createConnection(buildMySQLConnectionConfig(config));
  try {
    const [rows] = await connection.execute(
      'SELECT * FROM users ORDER BY created_at ASC'
    ) as any[];

    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const normalizeRole = (role: string): UserRole => {
      if (role === 'admin') return 'admin';
      if (role === 'vendedor' || role === 'collaborator') return 'collaborator';
      if (role === 'almacenero' || role === 'warehouse') return 'warehouse';
      if (role === 'supervisor' || role === 'cashier') return 'cashier';
      return 'collaborator';
    };

    const mapUser = (row: any): User => {
      const role = normalizeRole(String(row.role || 'collaborator'));
      const permissions = {
        canViewDashboard: true,
        canManageInventory: role === 'admin' || role === 'warehouse',
        canViewCosts: role === 'admin',
        canManageQuotes: role !== 'warehouse',
        canManageSales: role !== 'warehouse',
        canManageContacts: true,
        canManageSettings: role === 'admin',
        canManageUsers: role === 'admin',
        canDeleteRecords: role === 'admin'
      };

      return {
        id: String(row.id || `usr-${Date.now()}`),
        username: String(row.username || ''),
        name: String(row.name || row.username || ''),
        email: String(row.email || ''),
        role,
        roleLabel: String(row.role_label || row.role || 'Colaborador'),
        avatarColor: row.avatar_color || (role === 'admin' ? 'indigo' : role === 'warehouse' ? 'amber' : role === 'cashier' ? 'blue' : 'emerald'),
        password: row.password ? String(row.password) : undefined,
        status: row.status === 'inactive' ? 'inactive' : 'active',
        permissions,
        createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
        lastLogin: row.last_login ? new Date(row.last_login).toISOString() : undefined,
      };
    };

    return rows.map(mapUser);
  } catch {
    return null;
  } finally {
    await connection.end().catch(() => undefined);
  }
}

export async function testMySQLConnection(config: MySQLConnectionInput): Promise<MySQLTestResult & { database?: string; user?: string; latencyMs?: number }> {
  if (!isMySQLConfigComplete(config)) {
    throw new Error('Faltan parámetros obligatorios para la conexión MySQL (host, puerto, base de datos y usuario).');
  }

  const startedAt = Date.now();

  const connection = await mysql.createConnection(buildMySQLConnectionConfig(config));

  try {
    await connection.execute('SELECT 1 AS ok');

    const [versionRows] = await connection.execute('SELECT VERSION() AS version');
    const version = Array.isArray(versionRows) && versionRows.length > 0 ? String((versionRows as any[])[0]?.version || '') : '';

    const [tableRows] = await connection.query('SHOW TABLES');
    const tableNames = Array.isArray(tableRows)
      ? tableRows.map((row: any) => {
          const keys = Object.keys(row || {});
          return String(row[keys[0]] || '');
        })
      : [];

    const latencyMs = Date.now() - startedAt;

    return {
      success: true,
      message: `¡Conexión exitosa a MySQL en ${config.host ?? 'localhost'}:${config.port ?? 3306}!`,
      serverVersion: version || 'MySQL Server',
      database: config.database || process.env.MYSQL_DATABASE || 'nexus_erp_db',
      user: config.user || process.env.MYSQL_USER || 'root',
      tablesFound: tableNames.slice(0, 20),
      latencyMs,
      details: `Conexión verificada con juego de caracteres ${config.charset || 'utf8mb4'}.`,
    };
  } catch (error: any) {
    const message = error?.message || 'Error al conectar con MySQL';
    throw new Error(message);
  } finally {
    await connection.end().catch(() => undefined);
  }
}
