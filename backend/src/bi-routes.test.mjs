import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';

process.env.MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017';
process.env.JWT_SECRET = 'test-secret-with-at-least-32-characters-long';
process.env.FRONTEND_URL = 'http://localhost:5173';

const { createApp } = await import('./app.ts');
const { db } = await import('./dataStore.ts');

let server;
let baseUrl;
let originalSales;
let originalCustomers;

const TEST_BI_KEY = 'bi-secret-test-key-phantom-2026';

before(async () => {
  const rawDb = db.exportDatabase();
  originalSales = structuredClone(rawDb.sales);
  originalCustomers = structuredClone(rawDb.customers);

  rawDb.sales.push(
    {
      id: 'sale-bi-active',
      saleNumber: 'FAC-00009991',
      voucherType: 'FACTURA',
      customerId: 'cust-bi-comma',
      customerName: 'Corporación Alfa, S.A.C.',
      customerTaxId: '20999999991',
      date: '2026-11-20',
      storeId: 'store-01',
      items: [
        {
          id: 'item-bi-1',
          productId: 'prod-1',
          sku: '100001',
          name: 'Laptop Empresarial, 16" Pro',
          unit: 'UND',
          unitPrice: 118,
          costPrice: 80,
          quantity: 2,
          discountPercent: 0,
          taxRate: 18,
          subtotal: 200,
          taxAmount: 36,
          total: 236,
        },
      ],
      subtotal: 200,
      discountTotal: 0,
      taxTotal: 36,
      total: 236,
      currency: 'S/.',
      paymentMethod: 'TRANSFER',
      paymentStatus: 'PAID',
      paidAmount: 236,
      dueAmount: 0,
      sellerName: 'Ejecutivo BI',
      status: 'COMPLETED',
      createdAt: '2026-11-20T15:30:00.000Z',
      updatedAt: '2026-11-20T15:30:00.000Z',
    },
    {
      id: 'sale-bi-cancelled',
      saleNumber: 'FAC-00009992',
      voucherType: 'BOLETA',
      customerId: 'cust-bi-comma',
      customerName: 'Corporación Alfa, S.A.C.',
      customerTaxId: '20999999991',
      date: '2026-11-21',
      storeId: 'store-01',
      items: [
        {
          id: 'item-bi-cancelled',
          productId: 'prod-1',
          sku: '100001',
          name: 'Producto Anulado',
          unit: 'UND',
          unitPrice: 59,
          costPrice: 30,
          quantity: 1,
          discountPercent: 0,
          taxRate: 18,
          subtotal: 50,
          taxAmount: 9,
          total: 59,
        },
      ],
      subtotal: 50,
      discountTotal: 0,
      taxTotal: 9,
      total: 59,
      currency: 'S/.',
      paymentMethod: 'CASH',
      paymentStatus: 'PAID',
      paidAmount: 59,
      dueAmount: 0,
      sellerName: 'Ejecutivo BI',
      status: 'CANCELLED',
      cancellationReason: 'Error de digitación',
      cancelledAt: '2026-11-21T16:00:00.000Z',
      createdAt: '2026-11-21T15:45:00.000Z',
      updatedAt: '2026-11-21T16:00:00.000Z',
    }
  );

  rawDb.customers.push({
    id: 'cust-bi-comma',
    name: 'Corporación "Alfa", S.A.C.',
    taxId: '20999999991',
    email: 'contacto@alfa.pe',
    phone: '999888777',
    address: 'Av. Principal 123, San Isidro, Lima',
    city: 'Lima',
    status: 'Activo',
    creditLimit: 5000,
    paymentTerms: 'Crédito 30 días',
    createdAt: '2026-11-01T10:00:00.000Z',
  });

  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/bi`;
});

after(async () => {
  const rawDb = db.exportDatabase();
  rawDb.sales = originalSales;
  rawDb.customers = originalCustomers;
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

test('responde 503 cuando BI_API_KEY no está definida y 401 cuando x-api-key es inválida', async () => {
  delete process.env.BI_API_KEY;
  const unavailable = await fetch(`${baseUrl}/fact_ventas`, {
    headers: { 'x-api-key': TEST_BI_KEY },
  });
  assert.equal(unavailable.status, 503);
  const unavailableBody = await unavailable.json();
  assert.match(unavailableBody.error, /BI_API_KEY/);

  process.env.BI_API_KEY = TEST_BI_KEY;

  const missingKey = await fetch(`${baseUrl}/fact_ventas`);
  assert.equal(missingKey.status, 401);

  const wrongKey = await fetch(`${baseUrl}/fact_ventas`, {
    headers: { 'x-api-key': 'clave-incorrecta' },
  });
  assert.equal(wrongKey.status, 401);
});

test('devuelve arreglos JSON planos con fechas ISO, montos numéricos y excluye ventas anuladas', async () => {
  process.env.BI_API_KEY = TEST_BI_KEY;
  const endpoints = [
    'fact_ventas',
    'fact_detalle_venta',
    'fact_kardex',
    'fact_cotizaciones',
    'dim_productos',
    'dim_clientes',
    'dim_proveedores',
    'dim_tiendas',
  ];

  for (const endpoint of endpoints) {
    const response = await fetch(`${baseUrl}/${endpoint}`, {
      headers: { 'x-api-key': TEST_BI_KEY },
    });
    assert.equal(response.status, 200, `Falló ${endpoint}`);
    const rows = await response.json();
    assert.ok(Array.isArray(rows), `${endpoint} debe devolver un arreglo JSON plano`);
    assert.ok(rows.length > 0, `${endpoint} debe contener registros`);

    for (const row of rows) {
      for (const [key, value] of Object.entries(row)) {
        assert.notEqual(
          typeof value === 'object' && value !== null,
          true,
          `${endpoint}.${key} no debe contener objetos ni arreglos anidados`
        );
      }
    }
  }

  const ventasRes = await fetch(`${baseUrl}/fact_ventas`, {
    headers: { 'x-api-key': TEST_BI_KEY },
  });
  const ventas = await ventasRes.json();
  assert.equal(ventas.some((v) => v.id_venta === 'sale-bi-cancelled'), false);
  const activeSale = ventas.find((v) => v.id_venta === 'sale-bi-active');
  assert.ok(activeSale);
  assert.equal(typeof activeSale.total, 'number');
  assert.equal(activeSale.total, 236);
  assert.match(activeSale.fecha, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

  const detalleRes = await fetch(`${baseUrl}/fact_detalle_venta`, {
    headers: { 'x-api-key': TEST_BI_KEY },
  });
  const detalles = await detalleRes.json();
  assert.equal(detalles.some((d) => d.id_venta === 'sale-bi-cancelled'), false);
  const activeItem = detalles.find((d) => d.id_detalle === 'item-bi-1');
  assert.ok(activeItem);
  assert.equal(typeof activeItem.total, 'number');
  assert.equal(activeItem.margen_bruto, 40);
});

test('soporta ?format=csv con encabezados y comillas RFC 4180 para textos con comas y comillas', async () => {
  process.env.BI_API_KEY = TEST_BI_KEY;
  const response = await fetch(`${baseUrl}/dim_clientes?format=csv`, {
    headers: { 'x-api-key': TEST_BI_KEY },
  });

  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type') || '', /text\/csv/i);

  const csvText = await response.text();
  const lines = csvText.split('\r\n');
  assert.equal(
    lines[0],
    'id_cliente,cliente,documento,email,telefono,direccion,ciudad,estado,condicion_pago,limite_credito,total_compras,fecha_creacion'
  );
  assert.ok(
    lines.some(
      (line) =>
        line.includes('cust-bi-comma,"Corporación ""Alfa"", S.A.C."') &&
        line.includes('"Av. Principal 123, San Isidro, Lima"')
    ),
    'Debe entrecomillar y escapar correctamente textos con comas y comillas dobles'
  );
});
