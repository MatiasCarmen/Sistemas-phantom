import { Router, type Request, type Response, type NextFunction } from 'express';
import { timingSafeEqual } from 'crypto';
import { db } from './dataStore';

const biRouter = Router();

type PrimitiveValue = string | number | boolean | null;
type FlatRecord = Record<string, PrimitiveValue>;

function verifyBiApiKey(req: Request, res: Response, next: NextFunction): void {
  const configuredKey = process.env.BI_API_KEY?.trim();
  if (!configuredKey) {
    res.status(503).json({
      success: false,
      error: 'Servicio BI no disponible: la variable de entorno BI_API_KEY no está configurada en el servidor.',
    });
    return;
  }

  const providedKey = req.header('x-api-key')?.trim() || '';
  const expectedBuffer = Buffer.from(configuredKey, 'utf8');
  const providedBuffer = Buffer.from(providedKey, 'utf8');

  if (
    !providedKey ||
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    res.status(401).json({
      success: false,
      error: 'No autorizado: header x-api-key inválido o ausente.',
    });
    return;
  }

  next();
}

function toIsoDate(value?: string, fallback?: string): string {
  const raw = (value || fallback || '').trim();
  if (!raw) {
    return '';
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return `${raw}T00:00:00.000Z`;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }
  return parsed.toISOString();
}

function toNumber(value: unknown): number {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
}

function toMoney(value: unknown): number {
  return Number(toNumber(value).toFixed(2));
}

function escapeCsvCell(value: PrimitiveValue | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  const text = String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function toCsv(columns: readonly string[], rows: FlatRecord[]): string {
  const headerLine = columns.map((col) => escapeCsvCell(col)).join(',');
  const dataLines = rows.map((row) =>
    columns.map((col) => escapeCsvCell(row[col])).join(',')
  );
  return [headerLine, ...dataLines].join('\r\n');
}

function sendDataset(
  req: Request,
  res: Response,
  datasetName: string,
  columns: readonly string[],
  rows: FlatRecord[]
): void {
  const format = String(req.query.format || 'json').trim().toLowerCase();
  if (format === 'csv') {
    const csv = toCsv(columns, rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="${datasetName}.csv"`);
    res.send(csv);
    return;
  }

  res.json(rows);
}

biRouter.use(verifyBiApiKey);

const FACT_VENTAS_COLUMNS = [
  'id_venta',
  'numero_venta',
  'tipo_comprobante',
  'fecha',
  'fecha_creacion',
  'fecha_actualizacion',
  'id_tienda',
  'id_cliente',
  'cliente_nombre',
  'cliente_documento',
  'vendedor',
  'moneda',
  'metodo_pago',
  'estado_pago',
  'estado',
  'cantidad_items',
  'subtotal',
  'descuento_total',
  'impuesto_total',
  'total',
  'monto_pagado',
  'saldo_pendiente',
  'id_cotizacion_origen',
  'numero_cotizacion_origen',
] as const;

biRouter.get('/fact_ventas', (req: Request, res: Response) => {
  const rows: FlatRecord[] = db
    .getSales()
    .filter((sale) => sale.status !== 'CANCELLED')
    .map((sale) => ({
      id_venta: sale.id,
      numero_venta: sale.saleNumber,
      tipo_comprobante: sale.voucherType,
      fecha: toIsoDate(sale.date, sale.createdAt),
      fecha_creacion: toIsoDate(sale.createdAt),
      fecha_actualizacion: toIsoDate(sale.updatedAt, sale.createdAt),
      id_tienda: sale.storeId || 'main-warehouse',
      id_cliente: sale.customerId,
      cliente_nombre: sale.customerName,
      cliente_documento: sale.customerTaxId || '',
      vendedor: sale.sellerName || '',
      moneda: sale.currency || 'S/.',
      metodo_pago: sale.paymentMethod,
      estado_pago: sale.paymentStatus,
      estado: sale.status,
      cantidad_items: sale.items.reduce((sum, item) => sum + toNumber(item.quantity), 0),
      subtotal: toMoney(sale.subtotal),
      descuento_total: toMoney(sale.discountTotal),
      impuesto_total: toMoney(sale.taxTotal),
      total: toMoney(sale.total),
      monto_pagado: toMoney(sale.paidAmount),
      saldo_pendiente: toMoney(sale.dueAmount),
      id_cotizacion_origen: sale.quoteIdReference || '',
      numero_cotizacion_origen: sale.quoteNumberReference || '',
    }));

  sendDataset(req, res, 'fact_ventas', FACT_VENTAS_COLUMNS, rows);
});

const FACT_DETALLE_VENTA_COLUMNS = [
  'id_detalle',
  'id_venta',
  'numero_venta',
  'fecha',
  'fecha_creacion',
  'id_tienda',
  'id_cliente',
  'id_producto',
  'sku',
  'producto',
  'unidad',
  'cantidad',
  'precio_unitario',
  'costo_unitario',
  'porcentaje_descuento',
  'tasa_impuesto',
  'subtotal',
  'impuesto',
  'total',
  'costo_total',
  'margen_bruto',
  'estado_venta',
] as const;

biRouter.get('/fact_detalle_venta', (req: Request, res: Response) => {
  const rows: FlatRecord[] = db
    .getSales()
    .filter((sale) => sale.status !== 'CANCELLED')
    .flatMap((sale) =>
      sale.items.map((item) => {
        const quantity = toNumber(item.quantity);
        const unitCost = toMoney(item.costPrice);
        const subtotal = toMoney(item.subtotal);
        const totalCost = toMoney(unitCost * quantity);
        return {
          id_detalle: item.id,
          id_venta: sale.id,
          numero_venta: sale.saleNumber,
          fecha: toIsoDate(sale.date, sale.createdAt),
          fecha_creacion: toIsoDate(sale.createdAt),
          id_tienda: sale.storeId || 'main-warehouse',
          id_cliente: sale.customerId,
          id_producto: item.productId,
          sku: item.sku,
          producto: item.name,
          unidad: item.unit,
          cantidad: quantity,
          precio_unitario: toMoney(item.unitPrice),
          costo_unitario: unitCost,
          porcentaje_descuento: toNumber(item.discountPercent),
          tasa_impuesto: toNumber(item.taxRate),
          subtotal,
          impuesto: toMoney(item.taxAmount),
          total: toMoney(item.total),
          costo_total: totalCost,
          margen_bruto: toMoney(subtotal - totalCost),
          estado_venta: sale.status,
        };
      })
    );

  sendDataset(req, res, 'fact_detalle_venta', FACT_DETALLE_VENTA_COLUMNS, rows);
});

const FACT_KARDEX_COLUMNS = [
  'id_movimiento',
  'fecha',
  'id_producto',
  'sku',
  'producto',
  'id_tienda',
  'tipo_movimiento',
  'direccion',
  'cantidad',
  'stock_anterior',
  'stock_nuevo',
  'costo_unitario',
  'costo_total',
  'referencia',
  'usuario',
  'notas',
] as const;

biRouter.get('/fact_kardex', (req: Request, res: Response) => {
  const rows: FlatRecord[] = db.getInventoryMovements().map((movement) => {
    const quantity = toNumber(movement.quantity);
    const unitCost = toMoney(movement.unitCost);
    return {
      id_movimiento: movement.id,
      fecha: toIsoDate(movement.createdAt),
      id_producto: movement.productId,
      sku: movement.productSku,
      producto: movement.productName,
      id_tienda: movement.storeId || 'main-warehouse',
      tipo_movimiento: movement.type,
      direccion: movement.type.startsWith('IN_') ? 'ENTRADA' : 'SALIDA',
      cantidad: quantity,
      stock_anterior: toNumber(movement.previousStock),
      stock_nuevo: toNumber(movement.newStock),
      costo_unitario: unitCost,
      costo_total: toMoney(quantity * unitCost),
      referencia: movement.referenceId || '',
      usuario: movement.createdBy || '',
      notas: movement.notes || '',
    };
  });

  sendDataset(req, res, 'fact_kardex', FACT_KARDEX_COLUMNS, rows);
});

const FACT_COTIZACIONES_COLUMNS = [
  'id_cotizacion',
  'numero_cotizacion',
  'fecha',
  'fecha_vencimiento',
  'fecha_creacion',
  'fecha_actualizacion',
  'id_cliente',
  'cliente_nombre',
  'cliente_documento',
  'estado',
  'moneda',
  'condicion_pago',
  'cantidad_items',
  'subtotal',
  'descuento_total',
  'impuesto_total',
  'total',
  'convertida_venta',
  'id_venta_convertida',
  'numero_venta_convertida',
  'creado_por',
] as const;

biRouter.get('/fact_cotizaciones', (req: Request, res: Response) => {
  const rows: FlatRecord[] = db.getQuotes().map((quote) => ({
    id_cotizacion: quote.id,
    numero_cotizacion: quote.quoteNumber,
    fecha: toIsoDate(quote.date, quote.createdAt),
    fecha_vencimiento: toIsoDate(quote.expiryDate),
    fecha_creacion: toIsoDate(quote.createdAt),
    fecha_actualizacion: toIsoDate(quote.updatedAt, quote.createdAt),
    id_cliente: quote.customerId,
    cliente_nombre: quote.customerName,
    cliente_documento: quote.customerTaxId || '',
    estado: quote.status,
    moneda: quote.currency || 'S/.',
    condicion_pago: quote.paymentTerms || '',
    cantidad_items: quote.items.reduce((sum, item) => sum + toNumber(item.quantity), 0),
    subtotal: toMoney(quote.subtotal),
    descuento_total: toMoney(quote.discountTotal),
    impuesto_total: toMoney(quote.taxTotal),
    total: toMoney(quote.total),
    convertida_venta: quote.status === 'CONVERTED' || Boolean(quote.convertedToSaleId),
    id_venta_convertida: quote.convertedToSaleId || '',
    numero_venta_convertida: quote.convertedToSaleNumber || '',
    creado_por: quote.createdBy || '',
  }));

  sendDataset(req, res, 'fact_cotizaciones', FACT_COTIZACIONES_COLUMNS, rows);
});

const DIM_PRODUCTOS_COLUMNS = [
  'id_producto',
  'sku',
  'codigo_barras',
  'producto',
  'descripcion',
  'categoria',
  'marca',
  'unidad',
  'ubicacion',
  'id_proveedor',
  'proveedor',
  'costo_unitario',
  'precio_venta',
  'tasa_impuesto',
  'stock_actual',
  'stock_minimo',
  'stock_maximo',
  'valor_inventario_costo',
  'estado_stock',
  'fecha_creacion',
  'fecha_actualizacion',
] as const;

biRouter.get('/dim_productos', (req: Request, res: Response) => {
  const rows: FlatRecord[] = db.getProducts().map((product) => {
    const stock = toNumber(product.stock);
    const costPrice = toMoney(product.costPrice);
    return {
      id_producto: product.id,
      sku: product.sku,
      codigo_barras: product.barcode || '',
      producto: product.name,
      descripcion: product.description || '',
      categoria: product.category,
      marca: product.brand || '',
      unidad: product.unit,
      ubicacion: product.location || '',
      id_proveedor: product.supplierId || '',
      proveedor: product.supplierName || '',
      costo_unitario: costPrice,
      precio_venta: toMoney(product.sellingPrice),
      tasa_impuesto: toNumber(product.taxRate),
      stock_actual: stock,
      stock_minimo: toNumber(product.minStock),
      stock_maximo: toNumber(product.maxStock ?? 0),
      valor_inventario_costo: toMoney(stock * costPrice),
      estado_stock: product.status,
      fecha_creacion: toIsoDate(product.createdAt),
      fecha_actualizacion: toIsoDate(product.updatedAt, product.createdAt),
    };
  });

  sendDataset(req, res, 'dim_productos', DIM_PRODUCTOS_COLUMNS, rows);
});

const DIM_CLIENTES_COLUMNS = [
  'id_cliente',
  'cliente',
  'documento',
  'email',
  'telefono',
  'direccion',
  'ciudad',
  'estado',
  'condicion_pago',
  'limite_credito',
  'total_compras',
  'fecha_creacion',
] as const;

biRouter.get('/dim_clientes', (req: Request, res: Response) => {
  const rows: FlatRecord[] = db.getCustomers().map((customer) => ({
    id_cliente: customer.id,
    cliente: customer.name,
    documento: customer.taxId,
    email: customer.email || '',
    telefono: customer.phone || '',
    direccion: customer.address || '',
    ciudad: customer.city || '',
    estado: customer.status || 'Activo',
    condicion_pago: customer.paymentTerms || 'Contado',
    limite_credito: toMoney(customer.creditLimit ?? 0),
    total_compras: toMoney(customer.totalPurchases ?? 0),
    fecha_creacion: toIsoDate(customer.createdAt),
  }));

  sendDataset(req, res, 'dim_clientes', DIM_CLIENTES_COLUMNS, rows);
});

const DIM_PROVEEDORES_COLUMNS = [
  'id_proveedor',
  'proveedor',
  'ruc',
  'email',
  'telefono',
  'direccion',
  'contacto',
  'categoria',
  'condicion_pago',
  'estado',
  'fecha_creacion',
] as const;

biRouter.get('/dim_proveedores', (req: Request, res: Response) => {
  const rows: FlatRecord[] = db.getSuppliers().map((supplier) => ({
    id_proveedor: supplier.id,
    proveedor: supplier.name,
    ruc: supplier.taxId,
    email: supplier.email || '',
    telefono: supplier.phone || '',
    direccion: supplier.address || '',
    contacto: supplier.contactPerson || '',
    categoria: supplier.category || '',
    condicion_pago: supplier.paymentTerms || '',
    estado: supplier.status || 'Activo',
    fecha_creacion: toIsoDate(supplier.createdAt),
  }));

  sendDataset(req, res, 'dim_proveedores', DIM_PROVEEDORES_COLUMNS, rows);
});

const DIM_TIENDAS_COLUMNS = [
  'id_tienda',
  'codigo',
  'numero_verificacion',
  'tienda',
  'tipo_tienda',
  'direccion',
  'estado',
] as const;

biRouter.get('/dim_tiendas', (req: Request, res: Response) => {
  const rows: FlatRecord[] = db.getStores().map((store) => ({
    id_tienda: store.id,
    codigo: store.code,
    numero_verificacion: store.verificationNumber,
    tienda: store.name,
    tipo_tienda: store.type,
    direccion: store.address || '',
    estado: store.status,
  }));

  sendDataset(req, res, 'dim_tiendas', DIM_TIENDAS_COLUMNS, rows);
});

biRouter.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Endpoint BI no encontrado: [${req.method}] ${req.originalUrl}`,
  });
});

export default biRouter;
