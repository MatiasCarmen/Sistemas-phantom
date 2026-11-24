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
let originalPurchaseOrders;
let originalStockTransfers;

const TEST_BI_KEY = 'bi-secret-test-key-phantom-2026';

before(async () => {
  const rawDb = db.exportDatabase();
  originalSales = structuredClone(rawDb.sales);
  originalCustomers = structuredClone(rawDb.customers);
  originalPurchaseOrders = structuredClone(rawDb.purchaseOrders || []);
  originalStockTransfers = structuredClone(rawDb.stockTransfers || []);

  const firstProduct = rawDb.products[0];
  const firstSupplier = rawDb.suppliers[0];

  rawDb.sales.push(
    {
      id: 'sale-bi-active',
      saleNumber: 'FAC01-00009991',
      voucherType: 'FACTURA',
      customerId: 'cust-bi-comma',
      customerName: 'Corporación Alfa, S.A.C.',
      customerTaxId: '20999999991',
      date: '2026-11-20',
      storeId: 'store-01',
      items: [
        {
          id: 'item-bi-1',
          productId: firstProduct.id,
          sku: firstProduct.sku,
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
      saleNumber: 'BOL01-00009992',
      voucherType: 'BOLETA',
      customerId: 'cust-bi-comma',
      customerName: 'Corporación Alfa, S.A.C.',
      customerTaxId: '20999999991',
      date: '2026-11-21',
      storeId: 'store-01',
      items: [
        {
          id: 'item-bi-cancelled',
          productId: firstProduct.id,
          sku: firstProduct.sku,
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
      cancellationReason: 'Devolución total de mercadería',
      cancelledAt: '2026-11-21T16:00:00.000Z',
      createdAt: '2026-11-21T15:45:00.000Z',
      updatedAt: '2026-11-21T16:00:00.000Z',
    },
    {
      id: 'sale-bi-non-completed',
      saleNumber: 'FAC01-00009993',
      voucherType: 'FACTURA',
      customerId: 'cust-bi-comma',
      customerName: 'Corporación Alfa, S.A.C.',
      customerTaxId: '20999999991',
      date: '2026-11-22',
      storeId: 'store-01',
      items: [],
      subtotal: 0,
      discountTotal: 0,
      taxTotal: 0,
      total: 0,
      currency: 'S/.',
      paymentMethod: 'CASH',
      paymentStatus: 'PENDING',
      paidAmount: 0,
      dueAmount: 0,
      sellerName: 'Ejecutivo BI',
      status: 'RETURNED',
      createdAt: '2026-11-22T10:00:00.000Z',
      updatedAt: '2026-11-22T10:00:00.000Z',
    }
  );

  rawDb.customers.push({
    id: 'cust-bi-comma',
    name: 'Corporación "Alfa", S.A.C.',
    documentType: 'RUC',
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

  rawDb.purchaseOrders = [
    ...(rawDb.purchaseOrders || []),
    {
      id: 'oc-bi-received',
      orderNumber: 'OC-00009001',
      supplierId: firstSupplier.id,
      supplierName: firstSupplier.name,
      supplierTaxId: firstSupplier.taxId,
      date: '2026-11-18',
      expectedDate: '2026-11-25',
      status: 'RECEIVED',
      items: [
        {
          id: 'oci-bi-1',
          productId: firstProduct.id,
          sku: firstProduct.sku,
          name: firstProduct.name,
          unit: firstProduct.unit,
          quantity: 10,
          unitCost: 50,
          taxRate: 18,
          subtotal: 500,
          taxAmount: 90,
          total: 590,
        },
      ],
      subtotal: 500,
      taxTotal: 90,
      total: 590,
      currency: 'S/.',
      paymentTerms: 'Crédito 30 días',
      notes: 'Reposición almacén central, lote A',
      createdBy: 'Jefe Compras',
      receivedAt: '2026-11-19T12:00:00.000Z',
      createdAt: '2026-11-18T09:00:00.000Z',
      updatedAt: '2026-11-19T12:00:00.000Z',
    },
    {
      id: 'oc-bi-cancelled',
      orderNumber: 'OC-00009002',
      supplierId: firstSupplier.id,
      supplierName: firstSupplier.name,
      supplierTaxId: firstSupplier.taxId,
      date: '2026-11-19',
      status: 'CANCELLED',
      items: [
        {
          id: 'oci-bi-2',
          productId: firstProduct.id,
          sku: firstProduct.sku,
          name: firstProduct.name,
          unit: firstProduct.unit,
          quantity: 5,
          unitCost: 50,
          taxRate: 18,
          subtotal: 250,
          taxAmount: 45,
          total: 295,
        },
      ],
      subtotal: 250,
      taxTotal: 45,
      total: 295,
      currency: 'S/.',
      createdBy: 'Jefe Compras',
      createdAt: '2026-11-19T10:00:00.000Z',
      updatedAt: '2026-11-19T11:00:00.000Z',
    },
  ];

  rawDb.stockTransfers = [
    ...(rawDb.stockTransfers || []),
    {
      id: 'tr-bi-1',
      guideNumber: 'TRS-00009001',
      verificationNumber: '01',
      productId: firstProduct.id,
      fromStoreId: 'main-warehouse',
      toStoreId: 'store-01',
      quantity: 4,
      notes: 'Envío urgente, sucursal Jockey Plaza',
      transportSupplierId: firstSupplier.id,
      transportSupplierName: firstSupplier.name,
      createdBy: 'Almacén Central',
      status: 'RECEIVED',
      receivedAt: '2026-11-20T11:00:00.000Z',
      createdAt: '2026-11-20T08:00:00.000Z',
    },
  ];

  server = createApp().listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}/api/bi`;
});

after(async () => {
  const rawDb = db.exportDatabase();
  rawDb.sales = originalSales;
  rawDb.customers = originalCustomers;
  rawDb.purchaseOrders = originalPurchaseOrders;
  rawDb.stockTransfers = originalStockTransfers;
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

test('devuelve arreglos JSON planos en las 11 tablas, excluye ventas no válidas y refleja estados reales', async () => {
  process.env.BI_API_KEY = TEST_BI_KEY;
  const endpoints = [
    'fact_ventas',
    'fact_detalle_venta',
    'fact_ordenes_compra',
    'fact_detalle_orden_compra',
    'fact_transferencias',
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
  assert.equal(ventas.some((v) => v.id_venta === 'sale-bi-non-completed'), false);
  assert.ok(ventas.every((v) => v.estado === 'COMPLETED' && v.es_venta_valida === true));

  const activeSale = ventas.find((v) => v.id_venta === 'sale-bi-active');
  assert.ok(activeSale);
  assert.equal(activeSale.serie, 'FAC01');
  assert.equal(typeof activeSale.total, 'number');
  assert.equal(activeSale.total, 236);
  assert.match(activeSale.fecha, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

  // Con ?incluir_no_validas=true se exponen también anuladas/devueltas marcadas con es_venta_valida=false y su estado real
  const allVentasRes = await fetch(`${baseUrl}/fact_ventas?incluir_no_validas=true`, {
    headers: { 'x-api-key': TEST_BI_KEY },
  });
  const allVentas = await allVentasRes.json();
  const cancelledSale = allVentas.find((v) => v.id_venta === 'sale-bi-cancelled');
  const returnedSale = allVentas.find((v) => v.id_venta === 'sale-bi-non-completed');
  assert.equal(cancelledSale.estado, 'CANCELLED');
  assert.equal(cancelledSale.es_venta_valida, false);
  assert.equal(cancelledSale.motivo_anulacion, 'Devolución total de mercadería');
  assert.equal(returnedSale.estado, 'RETURNED');
  assert.equal(returnedSale.es_venta_valida, false);

  const detalleRes = await fetch(`${baseUrl}/fact_detalle_venta`, {
    headers: { 'x-api-key': TEST_BI_KEY },
  });
  const detalles = await detalleRes.json();
  assert.equal(detalles.some((d) => d.id_venta === 'sale-bi-cancelled'), false);
  assert.equal(detalles.some((d) => d.id_venta === 'sale-bi-non-completed'), false);
  const activeItem = detalles.find((d) => d.id_detalle === 'item-bi-1');
  assert.ok(activeItem);
  assert.equal(typeof activeItem.total, 'number');
  assert.equal(activeItem.margen_bruto, 40);
  assert.equal(activeItem.estado_venta, 'COMPLETED');
  assert.equal(activeItem.es_venta_valida, true);
});

test('expone correctamente fact_ordenes_compra, fact_detalle_orden_compra y fact_transferencias en JSON y CSV', async () => {
  process.env.BI_API_KEY = TEST_BI_KEY;

  const [ocRes, ocDetRes, trRes] = await Promise.all([
    fetch(`${baseUrl}/fact_ordenes_compra`, { headers: { 'x-api-key': TEST_BI_KEY } }),
    fetch(`${baseUrl}/fact_detalle_orden_compra`, { headers: { 'x-api-key': TEST_BI_KEY } }),
    fetch(`${baseUrl}/fact_transferencias`, { headers: { 'x-api-key': TEST_BI_KEY } }),
  ]);

  const ordenes = await ocRes.json();
  const receivedOc = ordenes.find((o) => o.id_orden_compra === 'oc-bi-received');
  const cancelledOc = ordenes.find((o) => o.id_orden_compra === 'oc-bi-cancelled');
  assert.ok(receivedOc);
  assert.equal(receivedOc.numero_orden, 'OC-00009001');
  assert.equal(receivedOc.id_tienda_destino, 'main-warehouse');
  assert.equal(receivedOc.estado, 'RECEIVED');
  assert.equal(receivedOc.es_orden_valida, true);
  assert.equal(receivedOc.cantidad_unidades, 10);
  assert.equal(receivedOc.total, 590);
  assert.match(receivedOc.fecha, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.match(receivedOc.fecha_recepcion, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  assert.ok(cancelledOc);
  assert.equal(cancelledOc.estado, 'CANCELLED');
  assert.equal(cancelledOc.es_orden_valida, false);

  const detallesOc = await ocDetRes.json();
  const detailLine = detallesOc.find((d) => d.id_detalle_oc === 'oci-bi-1');
  assert.ok(detailLine);
  assert.equal(detailLine.id_orden_compra, 'oc-bi-received');
  assert.equal(detailLine.cantidad, 10);
  assert.equal(detailLine.costo_unitario, 50);
  assert.equal(detailLine.total, 590);
  assert.equal(detailLine.estado_orden, 'RECEIVED');

  const transferencias = await trRes.json();
  const tr = transferencias.find((t) => t.id_transferencia === 'tr-bi-1');
  assert.ok(tr);
  assert.equal(tr.numero_guia, 'TRS-00009001');
  assert.equal(tr.id_tienda_origen, 'main-warehouse');
  assert.equal(tr.id_tienda_destino, 'store-01');
  assert.equal(tr.estado, 'RECEIVED');
  assert.equal(tr.cantidad, 4);
  assert.equal(typeof tr.costo_total, 'number');
  assert.match(tr.fecha_creacion, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

  const trCsvRes = await fetch(`${baseUrl}/fact_transferencias?format=csv`, {
    headers: { 'x-api-key': TEST_BI_KEY },
  });
  assert.equal(trCsvRes.status, 200);
  const trCsv = await trCsvRes.text();
  assert.ok(trCsv.startsWith('id_transferencia,numero_guia,numero_verificacion,'));
  assert.ok(trCsv.includes('"Envío urgente, sucursal Jockey Plaza"'));
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
    'id_cliente,cliente,tipo_documento,documento,email,telefono,direccion,ciudad,estado,condicion_pago,limite_credito,total_compras,fecha_creacion'
  );
  assert.ok(
    lines.some(
      (line) =>
        line.includes('cust-bi-comma,"Corporación ""Alfa"", S.A.C.",RUC') &&
        line.includes('"Av. Principal 123, San Isidro, Lima"')
    ),
    'Debe entrecomillar y escapar correctamente textos con comas y comillas dobles'
  );
});
