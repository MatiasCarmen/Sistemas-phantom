import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { hashPassword } from '../src/security';

const databaseName = process.env.MONGODB_DATABASE || '';
if (databaseName !== 'phantom_erp_demo') {
  throw new Error('El seed demo solo puede ejecutarse con MONGODB_DATABASE=phantom_erp_demo');
}

const mongoUri = process.env.MONGODB_URI?.trim();
if (!mongoUri) {
  throw new Error('La variable de entorno MONGODB_URI es obligatoria para ejecutar el seed.');
}
const client = new MongoClient(mongoUri);
const now = new Date();
const iso = (date: Date) => date.toISOString();
const dateOnly = (date: Date) => iso(date).slice(0, 10);
const money = (value: number) => Number(value.toFixed(2));
const id = (prefix: string, number: number) => `demo-${prefix}-${String(number).padStart(3, '0')}`;

const stores = [
  { id: 'main-warehouse', name: 'Almacén central DEMO', code: 'ALM-DEMO', verificationNumber: '00', type: 'MAIN_WAREHOUSE', address: 'Lima - DEMO', status: 'ACTIVE' },
  ...Array.from({ length: 8 }, (_, index) => ({
    id: `store-${String(index + 1).padStart(2, '0')}`,
    name: `Sucursal DEMO ${index + 1}`,
    code: `TDA-D${String(index + 1).padStart(2, '0')}`,
    verificationNumber: String(index + 1).padStart(2, '0'),
    type: 'STORE',
    address: `Zona comercial DEMO ${index + 1}`,
    status: 'ACTIVE'
  }))
];

const categories = Array.from({ length: 6 }, (_, index) => ({
  id: id('category', index + 1),
  name: `Categoría DEMO ${index + 1}`,
  description: 'Datos sintéticos para demostración APF3',
  color: ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed', '#0891b2'][index]
}));

const suppliers = Array.from({ length: 8 }, (_, index) => ({
  id: id('supplier', index + 1),
  name: `Proveedor DEMO ${index + 1}`,
  taxId: `DEMO-RUC-${String(index + 1).padStart(4, '0')}`,
  email: `proveedor${index + 1}@demo.invalid`,
  phone: `900000${String(index + 1).padStart(2, '0')}`,
  address: `Dirección DEMO ${index + 1}`,
  contactPerson: `Contacto DEMO ${index + 1}`,
  category: 'Datos sintéticos',
  paymentTerms: 'Contado',
  status: 'Activo',
  notes: 'Registro sintético para demostración',
  createdAt: '2026-01-01T10:00:00.000Z'
}));

const products = Array.from({ length: 30 }, (_, index) => {
  const costPrice = 8 + (index % 10) * 3;
  const sellingPrice = money(costPrice * 1.55);
  return {
    id: id('product', index + 1),
    sku: `DEMO-SKU-${String(index + 1).padStart(3, '0')}`,
    barcode: `750000000${String(index + 1).padStart(3, '0')}`,
    name: `Producto DEMO ${String(index + 1).padStart(2, '0')}`,
    description: 'Producto sintético para demostración académica',
    category: categories[index % categories.length].name,
    brand: `Marca DEMO ${(index % 5) + 1}`,
    costPrice,
    sellingPrice,
    taxRate: 18,
    stock: 500 - (index % 8) * 4 - (index < 8 ? 5 : 0),
    minStock: 10 + (index % 5),
    maxStock: 700,
    unit: 'UND',
    location: 'Almacén central DEMO',
    supplierId: suppliers[index % suppliers.length].id,
    supplierName: suppliers[index % suppliers.length].name,
    status: 'in_stock',
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: iso(now)
  };
});

const users = [
  {
    id: 'demo-user-admin',
    username: 'demo_admin',
    name: 'Administrador DEMO',
    email: 'admin@demo.invalid',
    role: 'admin',
    roleLabel: 'Administrador DEMO',
    avatarColor: 'indigo',
    password: hashPassword('DemoAdmin2026!'),
    status: 'active',
    permissions: { canViewDashboard: true, canManageInventory: true, canViewCosts: true, canManageQuotes: true, canManageSales: true, canManageContacts: true, canManageSettings: true, canManageUsers: true, canDeleteRecords: true },
    createdAt: '2026-01-01T10:00:00.000Z'
  },
  {
    id: 'demo-user-warehouse',
    username: 'demo_almacen',
    name: 'Encargado de Almacén DEMO',
    email: 'almacen@demo.invalid',
    role: 'warehouse',
    roleLabel: 'Almacén DEMO',
    avatarColor: 'amber',
    password: hashPassword('DemoAlmacen2026!'),
    status: 'active',
    permissions: { canViewDashboard: true, canManageInventory: true, canViewCosts: false, canManageQuotes: false, canManageSales: false, canManageContacts: true, canManageSettings: false, canManageUsers: false, canDeleteRecords: false },
    createdAt: '2026-01-01T10:00:00.000Z'
  },
  {
    id: 'demo-user-sales',
    username: 'demo_vendedor',
    name: 'Vendedor DEMO',
    email: 'ventas@demo.invalid',
    role: 'collaborator',
    roleLabel: 'Ventas DEMO',
    avatarColor: 'emerald',
    password: hashPassword('DemoVentas2026!'),
    status: 'active',
    permissions: { canViewDashboard: true, canManageInventory: false, canViewCosts: false, canManageQuotes: true, canManageSales: true, canManageContacts: true, canManageSettings: false, canManageUsers: false, canDeleteRecords: false },
    createdAt: '2026-01-01T10:00:00.000Z'
  },
  {
    id: 'demo-user-supervisor',
    username: 'demo_supervisor',
    name: 'Supervisor DEMO',
    email: 'supervisor@demo.invalid',
    role: 'cashier',
    roleLabel: 'Supervisor de Operaciones DEMO',
    avatarColor: 'blue',
    password: hashPassword('DemoSupervisor2026!'),
    status: 'active',
    permissions: { canViewDashboard: true, canManageInventory: false, canViewCosts: false, canManageQuotes: true, canManageSales: true, canManageContacts: true, canManageSettings: false, canManageUsers: false, canDeleteRecords: false },
    createdAt: '2026-01-01T10:00:00.000Z'
  }
];

const customers = Array.from({ length: 12 }, (_, index) => ({
  id: id('customer', index + 1),
  name: `Cliente DEMO ${String(index + 1).padStart(2, '0')}`,
  taxId: `DEMO-DOC-${String(index + 1).padStart(4, '0')}`,
  email: `cliente${index + 1}@demo.invalid`,
  phone: `910000${String(index + 1).padStart(2, '0')}`,
  address: `Dirección cliente DEMO ${index + 1}`,
  city: 'Lima',
  status: 'Activo',
  creditLimit: 1000 + index * 250,
  paymentTerms: index % 3 === 0 ? 'Crédito' : 'Contado',
  notes: 'Cliente sintético para demostración',
  createdAt: '2026-01-01T10:00:00.000Z',
  totalPurchases: 0
}));

const storeStock = stores.flatMap((store, storeIndex) => products.map((product, productIndex) => ({
  storeId: store.id,
  productId: product.id,
  quantity: store.id === 'main-warehouse'
    ? product.stock
    : 16 + ((storeIndex + productIndex) % 8) + (storeIndex === productIndex + 1 ? 5 : 0)
})));

const transfers = stores.slice(1).map((store, index) => ({
  id: id('transfer', index + 1),
  guideNumber: `GUIA-DEMO-${String(index + 1).padStart(3, '0')}`,
  verificationNumber: String(index + 1).padStart(2, '0'),
  productId: products[index].id,
  fromStoreId: 'main-warehouse',
  toStoreId: store.id,
  quantity: 5,
  notes: 'Transferencia sintética recibida para demostración',
  createdBy: 'demo_admin',
  status: 'RECEIVED',
  receivedAt: '2026-01-15T12:00:00.000Z',
  createdAt: '2026-01-14T12:00:00.000Z'
}));

const movements = products.map((product, index) => ({
  id: id('movement-in', index + 1),
  productId: product.id,
  productSku: product.sku,
  productName: product.name,
  type: 'IN_PURCHASE',
  quantity: product.stock + (index < 8 ? 5 : 0),
  previousStock: 0,
  newStock: product.stock + (index < 8 ? 5 : 0),
  unitCost: product.costPrice,
  referenceId: `COMPRA-DEMO-${String(index + 1).padStart(3, '0')}`,
  storeId: 'main-warehouse',
  notes: 'Entrada inicial sintética',
  createdBy: 'demo_admin',
  createdAt: '2026-01-01T10:00:00.000Z'
}));

transfers.forEach((transfer, index) => {
  const product = products[index];
  const initialWarehouseStock = product.stock + transfer.quantity;
  movements.push(
    {
      id: id('movement-transfer-out', index + 1),
      productId: product.id,
      productSku: product.sku,
      productName: product.name,
      type: 'OUT_ADJUSTMENT',
      quantity: transfer.quantity,
      previousStock: initialWarehouseStock,
      newStock: product.stock,
      unitCost: product.costPrice,
      referenceId: transfer.guideNumber,
      storeId: 'main-warehouse',
      notes: 'Salida por transferencia sintética',
      createdBy: 'demo_admin',
      createdAt: transfer.createdAt
    },
    {
      id: id('movement-transfer-in', index + 1),
      productId: product.id,
      productSku: product.sku,
      productName: product.name,
      type: 'IN_ADJUSTMENT',
      quantity: transfer.quantity,
      previousStock: 16 + ((index + 1 + index) % 8),
      newStock: 21 + ((index + 1 + index) % 8),
      unitCost: product.costPrice,
      referenceId: transfer.guideNumber,
      storeId: transfer.toStoreId,
      notes: 'Recepción de transferencia sintética',
      createdBy: 'demo_admin',
      createdAt: transfer.receivedAt || transfer.createdAt
    }
  );
});

const makeLine = (product: typeof products[number], quantity: number) => {
  const total = money(product.sellingPrice * quantity);
  const subtotal = money(total / 1.18);
  return {
    id: `line-${product.id}-${quantity}`,
    productId: product.id,
    sku: product.sku,
    name: product.name,
    unit: product.unit,
    unitPrice: product.sellingPrice,
    costPrice: product.costPrice,
    quantity,
    discountPercent: 0,
    taxRate: 18,
    subtotal,
    taxAmount: money(total - subtotal),
    total
  };
};

const quotes = Array.from({ length: 24 }, (_, index) => {
  const product = products[index % products.length];
  const line = makeLine(product, 1 + (index % 3));
  const created = new Date(Date.UTC(2026, index % 12, 5 + (index % 20), 11, 0));
  return {
    id: id('quote', index + 1),
    quoteNumber: `COT-DEMO-${String(index + 1).padStart(4, '0')}`,
    customerId: customers[index % customers.length].id,
    customerName: customers[index % customers.length].name,
    customerTaxId: customers[index % customers.length].taxId,
    customerEmail: customers[index % customers.length].email,
    customerPhone: customers[index % customers.length].phone,
    customerAddress: customers[index % customers.length].address,
    date: dateOnly(created),
    expiryDate: dateOnly(new Date(created.getTime() + 15 * 86400000)),
    status: index % 4 === 0 ? 'APPROVED' : 'SENT',
    items: [line],
    subtotal: line.subtotal,
    discountTotal: 0,
    taxTotal: line.taxAmount,
    total: line.total,
    currency: 'S/.',
    paymentTerms: 'Contado',
    notes: 'Cotización sintética APF3',
    termsAndConditions: 'Documento de demostración sin validez comercial.',
    createdBy: 'demo_vendedor',
    createdAt: iso(created),
    updatedAt: iso(created)
  };
});

const sales = Array.from({ length: 48 }, (_, index) => {
  const product = products[index % products.length];
  const store = stores[1 + (index % 8)];
  const customer = customers[index % customers.length];
  const quantity = 1 + (index % 2);
  const line = makeLine(product, quantity);
  const created = new Date(Date.UTC(2025 + Math.floor(index / 24), index % 12, 8 + (index % 18), 14, 0));
  movements.push({
    id: id('movement-sale', index + 1),
    productId: product.id,
    productSku: product.sku,
    productName: product.name,
    type: 'OUT_SALE',
    quantity,
    previousStock: 18,
    newStock: 18 - quantity,
    unitCost: product.costPrice,
    referenceId: `FAC-DEMO-${String(index + 1).padStart(6, '0')}`,
    storeId: store.id,
    notes: 'Venta sintética APF3',
    createdBy: 'demo_vendedor',
    createdAt: iso(created)
  });
  return {
    id: id('sale', index + 1),
    saleNumber: `FAC-DEMO-${String(index + 1).padStart(6, '0')}`,
    voucherType: index % 3 === 0 ? 'FACTURA' : 'BOLETA',
    customerId: customer.id,
    customerName: customer.name,
    customerTaxId: customer.taxId,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    customerAddress: customer.address,
    date: dateOnly(created),
    storeId: store.id,
    items: [line],
    subtotal: line.subtotal,
    discountTotal: 0,
    taxTotal: line.taxAmount,
    total: line.total,
    currency: 'S/.',
    paymentMethod: index % 2 === 0 ? 'CARD' : 'CASH',
    paymentStatus: 'PAID',
    paidAmount: line.total,
    dueAmount: 0,
    notes: 'Venta sintética para demostración APF3',
    sellerName: 'demo_vendedor',
    status: 'COMPLETED',
    createdAt: iso(created),
    updatedAt: iso(created)
  };
});

const settings = {
  companyName: 'SGICOP-PHANTOM DEMO',
  taxId: 'DEMO-RUC-00000000',
  phone: '900000000',
  email: 'demo@phantom.invalid',
  address: 'Entorno sintético para exposición académica',
  cityCountry: 'Lima, Perú',
  currencySymbol: 'S/.',
  currencyCode: 'PEN',
  currencyName: 'Sol peruano',
  defaultTaxRate: 18,
  quotePrefix: 'COT-DEMO-',
  invoicePrefix: 'FAC-DEMO-',
  nextQuoteNumber: quotes.length + 1,
  nextInvoiceNumber: sales.length + 1
};

async function upsertCollection<T extends { id: string }>(name: string, records: T[]) {
  const collection = client.db(databaseName).collection(name);
  await collection.bulkWrite(records.map(record => ({
    replaceOne: { filter: { _id: record.id }, replacement: { ...record, _id: record.id }, upsert: true }
  })));
}

async function main() {
  await client.connect();
  const database = client.db(databaseName);
  await Promise.all([
    upsertCollection('categories', categories),
    upsertCollection('suppliers', suppliers),
    upsertCollection('products', products),
    upsertCollection('users', users),
    upsertCollection('customers', customers),
    upsertCollection('stores', stores),
    upsertCollection('stock_transfers', transfers),
    upsertCollection('inventory_movements', movements),
    upsertCollection('quotes', quotes),
    upsertCollection('sales', sales)
  ]);
  const storeStockRecords = storeStock.map(stock => ({ ...stock, _id: `${stock.storeId}::${stock.productId}` }));
  await database.collection('store_stock').bulkWrite(storeStockRecords.map(record => ({
    replaceOne: { filter: { _id: record._id }, replacement: record, upsert: true }
  })));
  await database.collection('company_settings').replaceOne({ _id: 'primary' }, { _id: 'primary', value: settings }, { upsert: true });
  await database.collection('system_state').replaceOne({ _id: 'primary' }, { _id: 'primary', lastUpdated: iso(now) }, { upsert: true });
  const counts = await Promise.all(['categories', 'suppliers', 'products', 'users', 'customers', 'stores', 'store_stock', 'stock_transfers', 'inventory_movements', 'quotes', 'sales'].map(async name => [name, await database.collection(name).countDocuments()] as const));
  console.log(JSON.stringify({ database: databaseName, synthetic: true, counts: Object.fromEntries(counts) }, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}).finally(async () => {
  await client.close();
});
