import { Router, Request, Response, type NextFunction } from 'express';
import { db, INVALID_CREDENTIALS_MESSAGE, type DatabaseSchema } from './dataStore';
import { clearLoginFailures, getLockoutSeconds, loginRateLimiter, registerLoginFailure } from './middlewares/loginProtection';
import { buildAuditEvents, buildSecurityEvent } from './audit';
import { getMongoStatus, loadAuditEvents, saveAuditEvents, saveLocalBackup, verifyLocalAuditChain } from './mongo';
import type { AuditAction } from './types';
import { signAuthToken, validatePasswordPolicy } from './security';
import { sendError } from './middlewares/errorHandler';
import { authenticate, requireAdmin, requirePermission, resolveAuthenticatedUser } from './middlewares/auth';
import type { User } from './types';
import { priceLineItems } from './pricing';
import { mysqlString, pgString, sqlNumber } from './sqlEscape';
import {
  validateBody, loginSchema, productCreateSchema, productUpdateSchema, adjustStockSchema,
  categoryCreateSchema, supplierCreateSchema, supplierUpdateSchema, customerCreateSchema,
  customerUpdateSchema, quoteCreateSchema, quoteUpdateSchema, convertQuoteSchema,
  saleCreateSchema, saleCancelSchema, settingsUpdateSchema, userCreateSchema,
  userUpdateSchema, backupSchema
} from './validation';

const router = Router();

function logSecurityEvent(
  req: Request,
  action: AuditAction,
  actor: { id: string; name: string },
  subject: string,
  detail?: Record<string, unknown>
): void {
  void saveAuditEvents([buildSecurityEvent(req, action, actor, subject, detail)])
    .catch((error) => console.error('[Audit] No se pudo registrar el evento de seguridad:', error));
}

router.use((req: Request, res: Response, next: NextFunction) => {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method) || req.path.startsWith('/auth/')) {
    next();
    return;
  }

  const before = JSON.parse(JSON.stringify(db.exportDatabase())) as DatabaseSchema;
  const user = resolveAuthenticatedUser(req);
  const originalJson = res.json.bind(res);
  let responseSent = false;

  res.json = ((body: unknown) => {
    if (responseSent || res.statusCode >= 400) {
      return originalJson(body);
    }
    responseSent = true;

    const after = JSON.parse(JSON.stringify(db.exportDatabase())) as DatabaseSchema;
    const events = buildAuditEvents(before, after, {
      id: user?.id || 'unknown',
      name: user?.name || 'Usuario no identificado'
    }, {
      method: req.method,
      path: req.originalUrl,
      ip: req.ip || 'unknown'
    });

    if (!events.length) {
      return originalJson(body);
    }

    void saveAuditEvents(events)
      .catch((error) => console.error('[Audit] No se pudieron guardar los eventos:', error))
      .finally(() => originalJson(body));
    return res;
  }) as Response['json'];

  next();
});

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Sistema de Inventario, Cotizaciones y Ventas API RESTful activo',
    timestamp: new Date().toISOString()
  });
});

router.post('/auth/login', loginRateLimiter, validateBody(loginSchema), (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    const lockoutSeconds = getLockoutSeconds(username);
    const anonymous = { id: 'unknown', name: 'Usuario no identificado' };
    if (lockoutSeconds > 0) {
      logSecurityEvent(req, 'login_failed', anonymous, username, { reason: 'Cuenta bloqueada', retryAfterSeconds: lockoutSeconds });
      res.setHeader('Retry-After', String(lockoutSeconds));
      return res.status(429).json({ success: false, error: 'Cuenta bloqueada temporalmente por intentos fallidos. Intente más tarde.' });
    }

    const authResult = db.authenticateUser(username, password);
    if (authResult.error || !authResult.user) {
      const locked = registerLoginFailure(username);
      logSecurityEvent(req, locked ? 'account_locked' : 'login_failed', anonymous, username, { reason: authResult.error });
      return res.status(401).json({ success: false, error: authResult.error || INVALID_CREDENTIALS_MESSAGE });
    }
    clearLoginFailures(username);
    logSecurityEvent(req, 'login', { id: authResult.user.id, name: authResult.user.name }, authResult.user.username);

    const token = signAuthToken({
      id: authResult.user.id,
      username: authResult.user.username,
      role: authResult.user.role,
      sessionVersion: authResult.user.sessionVersion
    });
    res.json({
      success: true,
      token,
      user: authResult.user,
      message: `Bienvenido(a), ${authResult.user.name}`
    });
  } catch (error) {
    sendError(res, error);
  }
});

// Datos mínimos de marca para la pantalla de login (sin RUC, correos ni numeraciones internas)
router.get('/settings/public', (req: Request, res: Response) => {
  res.json({ success: true, data: { companyName: db.getSettings().companyName } });
});

// OWASP A01: todo lo que sigue exige un JWT válido (denegación por defecto)
router.use(authenticate);

router.get('/database/status', (req: Request, res: Response) => {
  res.json({ success: true, status: getMongoStatus() });
});

router.get('/audit/verify', requireAdmin, (req: Request, res: Response) => {
  res.json({ success: true, data: verifyLocalAuditChain() });
});

router.get('/audit/logs', requireAdmin, async (req: Request, res: Response) => {
  try {
    const page = Math.max(1, Number.parseInt(String(req.query.page || '1'), 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(String(req.query.limit || '25'), 10) || 25));
    const result = await loadAuditEvents({
      page,
      limit,
      entity: typeof req.query.entity === 'string' ? req.query.entity : undefined,
      action: typeof req.query.action === 'string' ? req.query.action : undefined,
      search: typeof req.query.search === 'string' ? req.query.search.slice(0, 100) : undefined
    });
    res.json({ success: true, data: result });
  } catch (error) {
    sendError(res, error);
  }
});

// Dashboard metrics
router.get('/dashboard/stats', (req: Request, res: Response) => {
  try {
    const stats = db.getDashboardMetrics();
    res.json({ success: true, data: stats });
  } catch (error) {
    sendError(res, error);
  }
});

// --- PRODUCTS ---
router.get('/products', (req: Request, res: Response) => {
  try {
    const products = db.getProducts();
    const { category, search, status } = req.query;

    let filtered = [...products];

    if (category && typeof category === 'string' && category !== 'ALL') {
      filtered = filtered.filter(p => p.category.toLowerCase() === category.toLowerCase());
    }

    if (status && typeof status === 'string' && status !== 'ALL') {
      filtered = filtered.filter(p => p.status === status);
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q))
      );
    }

    res.json({ success: true, data: filtered, count: filtered.length });
  } catch (error) {
    sendError(res, error);
  }
});

router.get('/products/:id', (req: Request, res: Response) => {
  try {
    const product = db.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/products', requirePermission('canManageInventory'), validateBody(productCreateSchema), (req: Request, res: Response) => {
  try {
    const { name, sku, category, costPrice, sellingPrice, stock, minStock, unit } = req.body;
    const newProduct = db.addProduct({
      name,
      sku: sku || '',
      barcode: req.body.barcode || '',
      description: req.body.description || '',
      category,
      brand: req.body.brand || '',
      costPrice,
      sellingPrice,
      taxRate: req.body.taxRate ?? 18,
      stock,
      minStock: minStock ?? 5,
      maxStock: req.body.maxStock ?? 100,
      unit: unit || 'UND',
      location: req.body.location || '',
      supplierId: req.body.supplierId || '',
      supplierName: req.body.supplierName || '',
      imageUrl: req.body.imageUrl || ''
    });

    res.status(201).json({ success: true, data: newProduct });
  } catch (error) {
    sendError(res, error);
  }
});

router.put('/products/:id', requirePermission('canManageInventory'), validateBody(productUpdateSchema), (req: Request, res: Response) => {
  try {
    const updated = db.updateProduct(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    sendError(res, error);
  }
});

router.delete('/products/:id', requirePermission('canDeleteRecords'), (req: Request, res: Response) => {
  try {
    const success = db.deleteProduct(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }
    res.json({ success: true, message: 'Producto eliminado correctamente' });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/products/adjust-stock', requirePermission('canManageInventory'), validateBody(adjustStockSchema), (req: Request, res: Response) => {
  try {
    const { productId, type, quantity, notes } = req.body;
    // El responsable del movimiento es siempre el usuario autenticado (no se acepta del cliente)
    const result = db.adjustStock({
      productId,
      type,
      quantity,
      notes,
      createdBy: req.user?.name
    });

    if (!result) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    sendError(res, error);
  }
});

// --- CATEGORIES ---
router.get('/categories', (req: Request, res: Response) => {
  try {
    const categories = db.getCategories();
    res.json({ success: true, data: categories });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/categories', requirePermission('canManageInventory'), validateBody(categoryCreateSchema), (req: Request, res: Response) => {
  try {
    const { name, description, color } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'El nombre de la categoría es obligatorio' });
    }
    const newCat = db.addCategory({ name, description, color });
    res.status(201).json({ success: true, data: newCat });
  } catch (error) {
    sendError(res, error);
  }
});

router.delete('/categories/:id', requirePermission('canDeleteRecords'), (req: Request, res: Response) => {
  try {
    const success = db.deleteCategory(req.params.id);
    res.json({ success });
  } catch (error) {
    sendError(res, error);
  }
});

// --- SUPPLIERS ---
router.get('/suppliers', (req: Request, res: Response) => {
  try {
    const suppliers = db.getSuppliers();
    res.json({ success: true, data: suppliers });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/suppliers', requirePermission('canManageContacts'), validateBody(supplierCreateSchema), (req: Request, res: Response) => {
  try {
    const newSup = db.addSupplier({ ...req.body, email: req.body.email || '', phone: req.body.phone || '' });
    res.status(201).json({ success: true, data: newSup });
  } catch (error) {
    sendError(res, error);
  }
});

router.put('/suppliers/:id', requirePermission('canManageContacts'), validateBody(supplierUpdateSchema), (req: Request, res: Response) => {
  try {
    const updated = db.updateSupplier(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
    res.json({ success: true, data: updated });
  } catch (error) {
    sendError(res, error);
  }
});

router.delete('/suppliers/:id', requirePermission('canDeleteRecords'), (req: Request, res: Response) => {
  try {
    const success = db.deleteSupplier(req.params.id);
    res.json({ success });
  } catch (error) {
    sendError(res, error);
  }
});

// --- CUSTOMERS ---
router.get('/customers', (req: Request, res: Response) => {
  try {
    const customers = db.getCustomers();
    res.json({ success: true, data: customers });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/customers', requirePermission('canManageContacts'), validateBody(customerCreateSchema), (req: Request, res: Response) => {
  try {
    const { name, taxId, email, phone, address, creditLimit, notes } = req.body;
    const newCust = db.addCustomer({ 
      name, 
      taxId, 
      email: email || '', 
      phone: phone || '', 
      address: address || '', 
      creditLimit: creditLimit ?? 0, 
      notes: notes || '' 
    });
    res.status(201).json({ success: true, data: newCust });
  } catch (error) {
    sendError(res, error);
  }
});

router.put('/customers/:id', requirePermission('canManageContacts'), validateBody(customerUpdateSchema), (req: Request, res: Response) => {
  try {
    const updated = db.updateCustomer(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    res.json({ success: true, data: updated });
  } catch (error) {
    sendError(res, error);
  }
});

router.delete('/customers/:id', requirePermission('canDeleteRecords'), (req: Request, res: Response) => {
  try {
    const success = db.deleteCustomer(req.params.id);
    res.json({ success });
  } catch (error) {
    sendError(res, error);
  }
});

// --- INVENTORY MOVEMENTS (KARDEX) ---
router.get('/inventory/movements', (req: Request, res: Response) => {
  try {
    const { productId } = req.query;
    const movements = db.getInventoryMovements(productId as string);
    res.json({ success: true, data: movements, count: movements.length });
  } catch (error) {
    sendError(res, error);
  }
});

// --- QUOTES ---
router.get('/quotes', (req: Request, res: Response) => {
  try {
    const quotes = db.getQuotes();
    const { status, search } = req.query;
    let filtered = [...quotes];

    if (status && typeof status === 'string' && status !== 'ALL') {
      filtered = filtered.filter(q => q.status === status);
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(item => 
        item.quoteNumber.toLowerCase().includes(q) ||
        item.customerName.toLowerCase().includes(q) ||
        item.customerTaxId.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, data: filtered, count: filtered.length });
  } catch (error) {
    sendError(res, error);
  }
});

router.get('/quotes/:id', (req: Request, res: Response) => {
  try {
    const quote = db.getQuoteById(req.params.id);
    if (!quote) return res.status(404).json({ success: false, error: 'Cotización no encontrada' });
    res.json({ success: true, data: quote });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/quotes', requirePermission('canManageQuotes'), validateBody(quoteCreateSchema), (req: Request, res: Response) => {
  try {
    const body = req.body;
    const settings = db.getSettings();
    const priced = priceLineItems(body.items, (id) => db.getProductById(id), settings.defaultTaxRate ?? 18);
    if ('error' in priced) {
      return res.status(400).json({ success: false, error: priced.error });
    }

    const newQuote = db.addQuote({
      customerId: body.customerId || `cust-${Date.now()}`,
      customerName: body.customerName,
      customerTaxId: body.customerTaxId || '',
      customerEmail: body.customerEmail || '',
      customerPhone: body.customerPhone || '',
      customerAddress: body.customerAddress || '',
      date: body.date || new Date().toISOString().split('T')[0],
      expiryDate: body.expiryDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      // Toda cotización nueva nace "Enviada"; aprobar/rechazar es exclusivo del administrador (PUT)
      status: 'SENT',
      ...priced,
      currency: body.currency || settings.currencySymbol || 'S/.',
      paymentTerms: body.paymentTerms || 'Contado / Transferencia',
      notes: body.notes || '',
      termsAndConditions: body.termsAndConditions || '',
      createdBy: req.user?.name || 'Asesor Comercial'
    });

    res.status(201).json({ success: true, data: newQuote });
  } catch (error) {
    sendError(res, error);
  }
});

router.put('/quotes/:id', requirePermission('canManageQuotes'), validateBody(quoteUpdateSchema), (req: Request, res: Response) => {
  try {
    if (req.body.status !== undefined) {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Solo los administradores pueden cambiar el estado de una cotización' });
      }
      if (req.body.status === 'CONVERTED') {
        return res.status(400).json({ success: false, error: 'Use la conversión a venta para marcar una cotización como convertida' });
      }
    }

    const { items, ...fields } = req.body;
    const updates = { ...fields };
    if (items) {
      const priced = priceLineItems(items, (id) => db.getProductById(id), db.getSettings().defaultTaxRate ?? 18);
      if ('error' in priced) {
        return res.status(400).json({ success: false, error: priced.error });
      }
      Object.assign(updates, priced);
    }

    const updated = db.updateQuote(req.params.id, updates);
    if (!updated) return res.status(404).json({ success: false, error: 'Cotización no encontrada' });
    res.json({ success: true, data: updated });
  } catch (error) {
    sendError(res, error);
  }
});

router.delete('/quotes/:id', requirePermission('canDeleteRecords'), (req: Request, res: Response) => {
  try {
    const success = db.deleteQuote(req.params.id);
    if (!success) return res.status(404).json({ success: false, error: 'Cotización no encontrada' });
    res.json({ success: true, message: 'Cotización eliminada' });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/quotes/:id/convert-to-sale', requirePermission('canManageQuotes'), requirePermission('canManageSales'), validateBody(convertQuoteSchema), (req: Request, res: Response) => {
  try {
    const { voucherType, paymentMethod } = req.body;
    const quote = db.getQuoteById(req.params.id);
    if (quote && (quote.status === 'CONVERTED' || quote.convertedToSaleId)) {
      return res.status(400).json({ success: false, error: 'La cotización ya fue convertida en venta' });
    }
    const stockIssue = quote?.items.find((item) => (db.getProductById(item.productId)?.stock ?? 0) < item.quantity);
    if (stockIssue) {
      return res.status(400).json({ success: false, error: `Stock insuficiente para ${stockIssue.name}` });
    }
    const result = db.convertQuoteToSale(req.params.id, {
      voucherType,
      paymentMethod,
      sellerName: req.user?.name
    });

    if (!result) {
      return res.status(404).json({ success: false, error: 'Cotización no encontrada o no se pudo convertir' });
    }

    res.json({ success: true, data: result });
  } catch (error) {
    sendError(res, error);
  }
});

// --- SALES ---
router.get('/sales', (req: Request, res: Response) => {
  try {
    const sales = db.getSales();
    const { status, voucherType, search, startDate, endDate } = req.query;
    let filtered = [...sales];

    if (status && typeof status === 'string' && status !== 'ALL') {
      filtered = filtered.filter(s => s.status === status);
    }

    if (voucherType && typeof voucherType === 'string' && voucherType !== 'ALL') {
      filtered = filtered.filter(s => s.voucherType === voucherType);
    }

    if (startDate && typeof startDate === 'string') {
      filtered = filtered.filter(s => s.date >= startDate);
    }

    if (endDate && typeof endDate === 'string') {
      filtered = filtered.filter(s => s.date <= endDate);
    }

    if (search && typeof search === 'string' && search.trim() !== '') {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(s => 
        s.saleNumber.toLowerCase().includes(q) ||
        s.customerName.toLowerCase().includes(q) ||
        s.customerTaxId.toLowerCase().includes(q)
      );
    }

    res.json({ success: true, data: filtered, count: filtered.length });
  } catch (error) {
    sendError(res, error);
  }
});

router.get('/sales/:id', (req: Request, res: Response) => {
  try {
    const sale = db.getSaleById(req.params.id);
    if (!sale) return res.status(404).json({ success: false, error: 'Venta no encontrada' });
    res.json({ success: true, data: sale });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/sales', requirePermission('canManageSales'), validateBody(saleCreateSchema), (req: Request, res: Response) => {
  try {
    const body = req.body;
    const settings = db.getSettings();

    // Verify stock availability (cantidades agregadas por producto)
    const requested = new Map<string, number>();
    for (const item of body.items as Array<{ productId: string; quantity: number }>) {
      requested.set(item.productId, (requested.get(item.productId) || 0) + item.quantity);
    }
    for (const [productId, quantity] of requested) {
      const prod = db.getProductById(productId);
      if (!prod) {
        return res.status(400).json({ success: false, error: `El producto ${productId} no existe en el catálogo.` });
      }
      if (prod.stock < quantity) {
        return res.status(400).json({ 
          success: false, 
          error: `Stock insuficiente para ${prod.name}. Stock disponible: ${prod.stock}, Solicitado: ${quantity}` 
        });
      }
    }

    const priced = priceLineItems(body.items, (id) => db.getProductById(id), settings.defaultTaxRate ?? 18);
    if ('error' in priced) {
      return res.status(400).json({ success: false, error: priced.error });
    }

    const newSale = db.addSale({
      voucherType: body.voucherType,
      customerId: body.customerId || `cust-${Date.now()}`,
      customerName: body.customerName,
      customerTaxId: body.customerTaxId || '',
      customerEmail: body.customerEmail || '',
      customerPhone: body.customerPhone || '',
      customerAddress: body.customerAddress || '',
      date: body.date || new Date().toISOString().split('T')[0],
      ...priced,
      currency: body.currency || settings.currencySymbol || 'S/.',
      paymentMethod: body.paymentMethod,
      paymentStatus: 'PAID',
      paidAmount: Math.max(body.paidAmount ?? priced.total, priced.total),
      dueAmount: 0,
      quoteIdReference: body.quoteIdReference,
      quoteNumberReference: body.quoteNumberReference,
      notes: body.notes || '',
      // El vendedor registrado es el usuario autenticado (trazabilidad, A09)
      sellerName: req.user?.name || 'Cajero Principal',
      status: 'COMPLETED'
    });

    res.status(201).json({ success: true, data: newSale });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/sales/:id/cancel', requirePermission('canManageSales'), validateBody(saleCancelSchema), (req: Request, res: Response) => {
  try {
    const { reason } = req.body;

    const cancelled = db.cancelSale(req.params.id, reason);
    if (!cancelled) {
      return res.status(404).json({ success: false, error: 'Venta no encontrada o ya se encuentra anulada' });
    }

    res.json({ success: true, data: cancelled, message: 'Venta anulada y stock devuelto exitosamente al inventario' });
  } catch (error) {
    sendError(res, error);
  }
});

// --- SETTINGS ---
router.get('/settings', (req: Request, res: Response) => {
  try {
    const settings = db.getSettings();
    res.json({ success: true, data: settings });
  } catch (error) {
    sendError(res, error);
  }
});

router.put('/settings', requirePermission('canManageSettings'), validateBody(settingsUpdateSchema), (req: Request, res: Response) => {
  try {
    const updated = db.updateSettings(req.body);
    res.json({ success: true, data: updated });
  } catch (error) {
    sendError(res, error);
  }
});

// --- AUTHENTICATION & USERS ---
router.get('/auth/me', (req: Request, res: Response) => {
  try {
    const { password, ...safeUser } = req.user as User;
    res.json({ success: true, user: safeUser });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/auth/logout', (req: Request, res: Response) => {
  // OWASP A07: el logout invalida en el servidor los tokens emitidos hasta ahora para este usuario
  const user = req.user as User;
  db.revokeUserSessions(user.id);
  logSecurityEvent(req, 'logout', { id: user.id, name: user.name }, user.username);
  res.json({ success: true, message: 'Sesión cerrada correctamente' });
});

router.get('/users', requireAdmin, (req: Request, res: Response) => {
  try {
    const users = db.getUsers();
    res.json({ success: true, data: users, count: users.length });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/users', requireAdmin, validateBody(userCreateSchema), (req: Request, res: Response) => {
  try {
    const { username, name, email, role, password, permissions, status, avatarColor } = req.body;
    const passwordError = validatePasswordPolicy(password);
    if (passwordError) {
      return res.status(400).json({ success: false, error: passwordError });
    }

    // Check duplicate (usuario o correo)
    const existing = db.getUserByUsernameOrEmail(username) || db.getUserByUsernameOrEmail(email);
    if (existing) {
      return res.status(400).json({ success: false, error: 'El nombre de usuario o correo ya está registrado' });
    }

    const newUser = db.addUser({
      username,
      name,
      email,
      role,
      roleLabel: role === 'admin' ? 'Administrador' : role === 'warehouse' ? 'Almacén' : role === 'cashier' ? 'Caja' : 'Colaborador',
      password,
      status,
      avatarColor,
      permissions
    });

    res.status(201).json({ success: true, data: newUser, message: 'Usuario colaborador creado con éxito' });
  } catch (error) {
    sendError(res, error);
  }
});

router.put('/users/:id', requireAdmin, validateBody(userUpdateSchema), (req: Request, res: Response) => {
  try {
    // userUpdateSchema es la lista blanca: id, createdAt, lastLogin o hashes no pueden inyectarse (asignación masiva)
    const updates: Partial<User> = { ...req.body };
    if (updates.email) {
      const owner = db.getUserByUsernameOrEmail(updates.email);
      if (owner && owner.id !== req.params.id) {
        return res.status(400).json({ success: false, error: 'El correo ya está registrado por otro usuario' });
      }
    }
    if (updates.password !== undefined && updates.password !== '') {
      const passwordError = validatePasswordPolicy(updates.password);
      if (passwordError) {
        return res.status(400).json({ success: false, error: passwordError });
      }
    } else {
      delete updates.password;
    }

    const updated = db.updateUser(req.params.id, updates);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }
    res.json({ success: true, data: updated, message: 'Usuario actualizado correctamente' });
  } catch (error) {
    sendError(res, error);
  }
});

router.delete('/users/:id', requireAdmin, (req: Request, res: Response) => {
  try {
    if (req.params.id === req.user?.id) {
      return res.status(400).json({ success: false, error: 'No puede eliminar su propia cuenta' });
    }
    const success = db.deleteUser(req.params.id);
    if (!success) {
      return res.status(400).json({ success: false, error: 'No se puede eliminar el usuario (no existe o es el último administrador)' });
    }
    res.json({ success: true, message: 'Usuario eliminado exitosamente' });
  } catch (error) {
    sendError(res, error);
  }
});

// --- SYSTEM BACKUP / RESET / EXPORT ---
router.get('/system/export', requireAdmin, (req: Request, res: Response) => {
  try {
    const data = db.exportDatabase();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=inventario_db_backup_${Date.now()}.json`);
    res.send(JSON.stringify(data, null, 2));
  } catch (error) {
    sendError(res, error);
  }
});

router.get('/system/raw-db', requireAdmin, (req: Request, res: Response) => {
  try {
    const data = { ...db.exportDatabase(), users: db.getUsers() };
    res.json({ success: true, data });
  } catch (error) {
    sendError(res, error);
  }
});

router.get('/system/sql-export', requireAdmin, (req: Request, res: Response) => {
  try {
    const data = db.exportDatabase();
    
    let sql = `-- ==========================================\n`;
    sql += `-- NEXUS ERP - EXPORTACIÓN DE BASE DE DATOS SQL\n`;
    sql += `-- Generado: ${new Date().toISOString()}\n`;
    sql += `-- Moneda Base: ${data.settings.currencySymbol} (${data.settings.currencyCode})\n`;
    sql += `-- ==========================================\n\n`;

    // Users Table
    sql += `-- TABLA: users\n`;
    sql += `CREATE TABLE IF NOT EXISTS users (\n`;
    sql += `  id VARCHAR(50) PRIMARY KEY,\n`;
    sql += `  username VARCHAR(50) UNIQUE NOT NULL,\n`;
    sql += `  name VARCHAR(100) NOT NULL,\n`;
    sql += `  email VARCHAR(100) UNIQUE NOT NULL,\n`;
    sql += `  password VARCHAR(255) NOT NULL,\n`;
    sql += `  role VARCHAR(20) NOT NULL,\n`;
    sql += `  role_label VARCHAR(50),\n`;
    sql += `  status VARCHAR(20) DEFAULT 'active',\n`;
    sql += `  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  last_login TIMESTAMP WITH TIME ZONE\n`;
    sql += `);\n\n`;

    // Categories Table
    sql += `-- TABLA: categories\n`;
    sql += `CREATE TABLE IF NOT EXISTS categories (\n`;
    sql += `  id VARCHAR(50) PRIMARY KEY,\n`;
    sql += `  name VARCHAR(100) NOT NULL,\n`;
    sql += `  description TEXT,\n`;
    sql += `  color VARCHAR(20)\n`;
    sql += `);\n\n`;

    // Products Table
    sql += `-- TABLA: products\n`;
    sql += `CREATE TABLE IF NOT EXISTS products (\n`;
    sql += `  id VARCHAR(50) PRIMARY KEY,\n`;
    sql += `  sku VARCHAR(50) UNIQUE NOT NULL,\n`;
    sql += `  name VARCHAR(200) NOT NULL,\n`;
    sql += `  description TEXT,\n`;
    sql += `  category_id VARCHAR(50) REFERENCES categories(id),\n`;
    sql += `  category_name VARCHAR(100),\n`;
    sql += `  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,\n`;
    sql += `  sale_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,\n`;
    sql += `  stock INTEGER NOT NULL DEFAULT 0,\n`;
    sql += `  min_stock INTEGER NOT NULL DEFAULT 5,\n`;
    sql += `  unit VARCHAR(20) DEFAULT 'UND',\n`;
    sql += `  warehouse VARCHAR(100) DEFAULT 'Almacén Central',\n`;
    sql += `  location VARCHAR(50),\n`;
    sql += `  barcode VARCHAR(50),\n`;
    sql += `  supplier_name VARCHAR(100),\n`;
    sql += `  status VARCHAR(20) DEFAULT 'active',\n`;
    sql += `  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `);\n\n`;

    // Customers Table
    sql += `-- TABLA: customers\n`;
    sql += `CREATE TABLE IF NOT EXISTS customers (\n`;
    sql += `  id VARCHAR(50) PRIMARY KEY,\n`;
    sql += `  name VARCHAR(150) NOT NULL,\n`;
    sql += `  doc_type VARCHAR(20) NOT NULL,\n`;
    sql += `  doc_number VARCHAR(30) UNIQUE NOT NULL,\n`;
    sql += `  email VARCHAR(100),\n`;
    sql += `  phone VARCHAR(30),\n`;
    sql += `  address TEXT,\n`;
    sql += `  contact_person VARCHAR(100),\n`;
    sql += `  status VARCHAR(20) DEFAULT 'active'\n`;
    sql += `);\n\n`;

    // Suppliers Table
    sql += `-- TABLA: suppliers\n`;
    sql += `CREATE TABLE IF NOT EXISTS suppliers (\n`;
    sql += `  id VARCHAR(50) PRIMARY KEY,\n`;
    sql += `  name VARCHAR(150) NOT NULL,\n`;
    sql += `  doc_type VARCHAR(20) NOT NULL,\n`;
    sql += `  doc_number VARCHAR(30) UNIQUE NOT NULL,\n`;
    sql += `  email VARCHAR(100),\n`;
    sql += `  phone VARCHAR(30),\n`;
    sql += `  address TEXT,\n`;
    sql += `  contact_person VARCHAR(100),\n`;
    sql += `  payment_terms VARCHAR(50),\n`;
    sql += `  status VARCHAR(20) DEFAULT 'active'\n`;
    sql += `);\n\n`;

    // Inventory Movements (Kardex)
    sql += `-- TABLA: inventory_movements (KARDEX)\n`;
    sql += `CREATE TABLE IF NOT EXISTS inventory_movements (\n`;
    sql += `  id VARCHAR(50) PRIMARY KEY,\n`;
    sql += `  product_id VARCHAR(50) REFERENCES products(id),\n`;
    sql += `  product_name VARCHAR(200) NOT NULL,\n`;
    sql += `  type VARCHAR(20) NOT NULL,\n`;
    sql += `  quantity INTEGER NOT NULL,\n`;
    sql += `  previous_stock INTEGER NOT NULL,\n`;
    sql += `  new_stock INTEGER NOT NULL,\n`;
    sql += `  unit_cost NUMERIC(12,2),\n`;
    sql += `  total_cost NUMERIC(12,2),\n`;
    sql += `  reason TEXT,\n`;
    sql += `  document_number VARCHAR(50),\n`;
    sql += `  warehouse VARCHAR(100),\n`;
    sql += `  created_by VARCHAR(100),\n`;
    sql += `  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `);\n\n`;

    // Quotes Table
    sql += `-- TABLA: quotes\n`;
    sql += `CREATE TABLE IF NOT EXISTS quotes (\n`;
    sql += `  id VARCHAR(50) PRIMARY KEY,\n`;
    sql += `  code VARCHAR(50) UNIQUE NOT NULL,\n`;
    sql += `  customer_id VARCHAR(50),\n`;
    sql += `  customer_name VARCHAR(150) NOT NULL,\n`;
    sql += `  customer_doc VARCHAR(30),\n`;
    sql += `  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,\n`;
    sql += `  tax NUMERIC(12,2) NOT NULL DEFAULT 0.00,\n`;
    sql += `  total NUMERIC(12,2) NOT NULL DEFAULT 0.00,\n`;
    sql += `  status VARCHAR(20) DEFAULT 'draft',\n`;
    sql += `  payment_condition VARCHAR(50),\n`;
    sql += `  delivery_time VARCHAR(50),\n`;
    sql += `  valid_until DATE,\n`;
    sql += `  notes TEXT,\n`;
    sql += `  items JSONB,\n`;
    sql += `  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `);\n\n`;

    // Sales Table
    sql += `-- TABLA: sales\n`;
    sql += `CREATE TABLE IF NOT EXISTS sales (\n`;
    sql += `  id VARCHAR(50) PRIMARY KEY,\n`;
    sql += `  invoice_number VARCHAR(50) UNIQUE NOT NULL,\n`;
    sql += `  customer_id VARCHAR(50),\n`;
    sql += `  customer_name VARCHAR(150) NOT NULL,\n`;
    sql += `  customer_doc VARCHAR(30),\n`;
    sql += `  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0.00,\n`;
    sql += `  tax NUMERIC(12,2) NOT NULL DEFAULT 0.00,\n`;
    sql += `  total NUMERIC(12,2) NOT NULL DEFAULT 0.00,\n`;
    sql += `  payment_method VARCHAR(50),\n`;
    sql += `  status VARCHAR(20) DEFAULT 'completed',\n`;
    sql += `  items JSONB,\n`;
    sql += `  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP\n`;
    sql += `);\n\n`;

    // INSERT STATEMENTS
    sql += `-- INSERTS: CATEGORIES (${data.categories.length})\n`;
    data.categories.forEach(c => {
      sql += `INSERT INTO categories (id, name, description, color) VALUES (${pgString(c.id)}, ${pgString(c.name)}, ${pgString((c.description || ''))}, ${pgString(c.color || 'blue')}) ON CONFLICT (id) DO NOTHING;\n`;
    });
    sql += `\n`;

    sql += `-- INSERTS: PRODUCTS (${data.products.length})\n`;
    data.products.forEach(p => {
      const catName = (p.category || '');
      const prodName = (p.name || '');
      const loc = (p.location || 'Almacén Central');
      const supp = (p.supplierName || '');
      sql += `INSERT INTO products (id, sku, name, category_name, cost_price, sale_price, stock, min_stock, unit, warehouse, barcode, supplier_name, status) VALUES (${pgString(p.id)}, ${pgString(p.sku)}, ${pgString(prodName)}, ${pgString(catName)}, ${sqlNumber(p.costPrice || 0)}, ${sqlNumber(p.sellingPrice || 0)}, ${sqlNumber(p.stock || 0)}, ${sqlNumber(p.minStock || 0)}, ${pgString(p.unit || 'UND')}, ${pgString(loc)}, ${pgString(p.barcode || '')}, ${pgString(supp)}, ${pgString(p.status || 'in_stock')}) ON CONFLICT (id) DO NOTHING;\n`;
    });
    sql += `\n`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=nexus_erp_schema_${Date.now()}.sql`);
    res.send(sql);
  } catch (error) {
    sendError(res, error);
  }
});

router.get('/database/mysql-script', requireAdmin, (req: Request, res: Response) => {
  try {
    const data = db.exportDatabase();
    const dbName = 'phantom_erp';
    const prefix = 'nexus_';

    let sql = `-- ========================================================\n`;
    sql += `-- NEXUS ERP - SCRIPT OFICIAL DE BASE DE DATOS MYSQL\n`;
    sql += `-- Motor: InnoDB | Charset: utf8mb4 | Collation: utf8mb4_unicode_ci\n`;
    sql += `-- Generado: ${new Date().toLocaleString('es-PE')}\n`;
    sql += `-- Moneda del Sistema: ${data.settings.currencySymbol} (${data.settings.currencyCode || 'PEN'})\n`;
    sql += `-- ========================================================\n\n`;

    sql += `CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;\n`;
    sql += `USE \`${dbName}\`;\n\n`;
    sql += `SET FOREIGN_KEY_CHECKS = 0;\n\n`;

    // Users
    sql += `-- --------------------------------------------------------\n`;
    sql += `-- Estructura de tabla para: \`${prefix}users\`\n`;
    sql += `-- --------------------------------------------------------\n`;
    sql += `DROP TABLE IF EXISTS \`${prefix}users\`;\n`;
    sql += `CREATE TABLE \`${prefix}users\` (\n`;
    sql += `  \`id\` VARCHAR(50) NOT NULL,\n`;
    sql += `  \`username\` VARCHAR(50) NOT NULL UNIQUE,\n`;
    sql += `  \`name\` VARCHAR(100) NOT NULL,\n`;
    sql += `  \`email\` VARCHAR(100) NOT NULL UNIQUE,\n`;
    sql += `  \`password\` VARCHAR(255) NOT NULL,\n`;
    sql += `  \`role\` ENUM('admin', 'collaborator', 'cashier', 'warehouse') NOT NULL DEFAULT 'collaborator',\n`;
    sql += `  \`role_label\` VARCHAR(60) NOT NULL,\n`;
    sql += `  \`avatar_color\` VARCHAR(20) DEFAULT 'indigo',\n`;
    sql += `  \`status\` ENUM('active', 'inactive') NOT NULL DEFAULT 'active',\n`;
    sql += `  \`permissions\` JSON NULL,\n`;
    sql += `  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  \`last_login\` DATETIME NULL,\n`;
    sql += `  PRIMARY KEY (\`id\`),\n`;
    sql += `  INDEX \`idx_user_role\` (\`role\`),\n`;
    sql += `  INDEX \`idx_user_status\` (\`status\`)\n`;
    sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

    // Categories
    sql += `-- --------------------------------------------------------\n`;
    sql += `-- Estructura de tabla para: \`${prefix}categories\`\n`;
    sql += `-- --------------------------------------------------------\n`;
    sql += `DROP TABLE IF EXISTS \`${prefix}categories\`;\n`;
    sql += `CREATE TABLE \`${prefix}categories\` (\n`;
    sql += `  \`id\` VARCHAR(50) NOT NULL,\n`;
    sql += `  \`name\` VARCHAR(100) NOT NULL,\n`;
    sql += `  \`description\` TEXT NULL,\n`;
    sql += `  \`color\` VARCHAR(30) DEFAULT 'blue',\n`;
    sql += `  PRIMARY KEY (\`id\`)\n`;
    sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

    // Suppliers
    sql += `-- --------------------------------------------------------\n`;
    sql += `-- Estructura de tabla para: \`${prefix}suppliers\`\n`;
    sql += `-- --------------------------------------------------------\n`;
    sql += `DROP TABLE IF EXISTS \`${prefix}suppliers\`;\n`;
    sql += `CREATE TABLE \`${prefix}suppliers\` (\n`;
    sql += `  \`id\` VARCHAR(50) NOT NULL,\n`;
    sql += `  \`name\` VARCHAR(150) NOT NULL,\n`;
    sql += `  \`tax_id\` VARCHAR(30) NOT NULL UNIQUE,\n`;
    sql += `  \`email\` VARCHAR(100) NULL,\n`;
    sql += `  \`phone\` VARCHAR(30) NULL,\n`;
    sql += `  \`address\` TEXT NULL,\n`;
    sql += `  \`contact_person\` VARCHAR(100) NULL,\n`;
    sql += `  \`payment_terms\` VARCHAR(50) NULL,\n`;
    sql += `  \`notes\` TEXT NULL,\n`;
    sql += `  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  PRIMARY KEY (\`id\`),\n`;
    sql += `  INDEX \`idx_supplier_tax_id\` (\`tax_id\`)\n`;
    sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

    // Customers
    sql += `-- --------------------------------------------------------\n`;
    sql += `-- Estructura de tabla para: \`${prefix}customers\`\n`;
    sql += `-- --------------------------------------------------------\n`;
    sql += `DROP TABLE IF EXISTS \`${prefix}customers\`;\n`;
    sql += `CREATE TABLE \`${prefix}customers\` (\n`;
    sql += `  \`id\` VARCHAR(50) NOT NULL,\n`;
    sql += `  \`name\` VARCHAR(150) NOT NULL,\n`;
    sql += `  \`tax_id\` VARCHAR(30) NOT NULL UNIQUE,\n`;
    sql += `  \`email\` VARCHAR(100) NULL,\n`;
    sql += `  \`phone\` VARCHAR(30) NULL,\n`;
    sql += `  \`address\` TEXT NULL,\n`;
    sql += `  \`city\` VARCHAR(100) NULL,\n`;
    sql += `  \`credit_limit\` DECIMAL(12,2) DEFAULT 0.00,\n`;
    sql += `  \`payment_terms\` VARCHAR(50) DEFAULT 'Contado',\n`;
    sql += `  \`notes\` TEXT NULL,\n`;
    sql += `  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  PRIMARY KEY (\`id\`),\n`;
    sql += `  INDEX \`idx_customer_tax_id\` (\`tax_id\`)\n`;
    sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

    // Products
    sql += `-- --------------------------------------------------------\n`;
    sql += `-- Estructura de tabla para: \`${prefix}products\`\n`;
    sql += `-- --------------------------------------------------------\n`;
    sql += `DROP TABLE IF EXISTS \`${prefix}products\`;\n`;
    sql += `CREATE TABLE \`${prefix}products\` (\n`;
    sql += `  \`id\` VARCHAR(50) NOT NULL,\n`;
    sql += `  \`sku\` VARCHAR(50) NOT NULL UNIQUE,\n`;
    sql += `  \`barcode\` VARCHAR(50) NULL,\n`;
    sql += `  \`name\` VARCHAR(200) NOT NULL,\n`;
    sql += `  \`description\` TEXT NULL,\n`;
    sql += `  \`category\` VARCHAR(100) NOT NULL,\n`;
    sql += `  \`brand\` VARCHAR(100) NULL,\n`;
    sql += `  \`cost_price\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,\n`;
    sql += `  \`selling_price\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,\n`;
    sql += `  \`tax_rate\` DECIMAL(5,2) NOT NULL DEFAULT 18.00,\n`;
    sql += `  \`stock\` INT NOT NULL DEFAULT 0,\n`;
    sql += `  \`min_stock\` INT NOT NULL DEFAULT 5,\n`;
    sql += `  \`unit\` VARCHAR(20) NOT NULL DEFAULT 'UND',\n`;
    sql += `  \`location\` VARCHAR(100) DEFAULT 'Almacén Central',\n`;
    sql += `  \`supplier_id\` VARCHAR(50) NULL,\n`;
    sql += `  \`supplier_name\` VARCHAR(150) NULL,\n`;
    sql += `  \`image_url\` VARCHAR(500) NULL,\n`;
    sql += `  \`status\` ENUM('in_stock', 'low_stock', 'out_of_stock') NOT NULL DEFAULT 'in_stock',\n`;
    sql += `  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,\n`;
    sql += `  PRIMARY KEY (\`id\`),\n`;
    sql += `  INDEX \`idx_prod_sku\` (\`sku\`),\n`;
    sql += `  INDEX \`idx_prod_category\` (\`category\`),\n`;
    sql += `  INDEX \`idx_prod_status\` (\`status\`)\n`;
    sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

    // Kardex Inventory Movements
    sql += `-- --------------------------------------------------------\n`;
    sql += `-- Estructura de tabla para: \`${prefix}kardex_movements\`\n`;
    sql += `-- --------------------------------------------------------\n`;
    sql += `DROP TABLE IF EXISTS \`${prefix}kardex_movements\`;\n`;
    sql += `CREATE TABLE \`${prefix}kardex_movements\` (\n`;
    sql += `  \`id\` VARCHAR(50) NOT NULL,\n`;
    sql += `  \`product_id\` VARCHAR(50) NOT NULL,\n`;
    sql += `  \`product_sku\` VARCHAR(50) NOT NULL,\n`;
    sql += `  \`product_name\` VARCHAR(200) NOT NULL,\n`;
    sql += `  \`type\` VARCHAR(30) NOT NULL,\n`;
    sql += `  \`quantity\` INT NOT NULL,\n`;
    sql += `  \`previous_stock\` INT NOT NULL,\n`;
    sql += `  \`new_stock\` INT NOT NULL,\n`;
    sql += `  \`unit_cost\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,\n`;
    sql += `  \`total_cost\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,\n`;
    sql += `  \`reason\` TEXT NULL,\n`;
    sql += `  \`reference_doc\` VARCHAR(60) NULL,\n`;
    sql += `  \`created_by\` VARCHAR(100) NOT NULL,\n`;
    sql += `  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  PRIMARY KEY (\`id\`),\n`;
    sql += `  INDEX \`idx_kardex_product\` (\`product_id\`),\n`;
    sql += `  INDEX \`idx_kardex_type\` (\`type\`),\n`;
    sql += `  INDEX \`idx_kardex_date\` (\`created_at\`) \n`;
    sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

    // Quotes
    sql += `-- --------------------------------------------------------\n`;
    sql += `-- Estructura de tabla para: \`${prefix}quotes\`\n`;
    sql += `-- --------------------------------------------------------\n`;
    sql += `DROP TABLE IF EXISTS \`${prefix}quotes\`;\n`;
    sql += `CREATE TABLE \`${prefix}quotes\` (\n`;
    sql += `  \`id\` VARCHAR(50) NOT NULL,\n`;
    sql += `  \`quote_number\` VARCHAR(50) NOT NULL UNIQUE,\n`;
    sql += `  \`customer_id\` VARCHAR(50) NOT NULL,\n`;
    sql += `  \`customer_name\` VARCHAR(150) NOT NULL,\n`;
    sql += `  \`customer_tax_id\` VARCHAR(30) NOT NULL,\n`;
    sql += `  \`customer_email\` VARCHAR(100) NULL,\n`;
    sql += `  \`customer_phone\` VARCHAR(30) NULL,\n`;
    sql += `  \`date\` DATE NOT NULL,\n`;
    sql += `  \`valid_until\` DATE NOT NULL,\n`;
    sql += `  \`subtotal\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,\n`;
    sql += `  \`discount_total\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,\n`;
    sql += `  \`tax_total\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,\n`;
    sql += `  \`total\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,\n`;
    sql += `  \`currency\` VARCHAR(10) NOT NULL DEFAULT 'S/.',\n`;
    sql += `  \`status\` ENUM('DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'CONVERTED_TO_SALE') NOT NULL DEFAULT 'DRAFT',\n`;
    sql += `  \`payment_terms\` VARCHAR(100) NULL,\n`;
    sql += `  \`delivery_time\` VARCHAR(100) NULL,\n`;
    sql += `  \`seller_name\` VARCHAR(100) NOT NULL,\n`;
    sql += `  \`notes\` TEXT NULL,\n`;
    sql += `  \`items_json\` JSON NOT NULL,\n`;
    sql += `  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  PRIMARY KEY (\`id\`),\n`;
    sql += `  INDEX \`idx_quote_num\` (\`quote_number\`),\n`;
    sql += `  INDEX \`idx_quote_status\` (\`status\`)\n`;
    sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

    // Sales & Invoices
    sql += `-- --------------------------------------------------------\n`;
    sql += `-- Estructura de tabla para: \`${prefix}sales\`\n`;
    sql += `-- --------------------------------------------------------\n`;
    sql += `DROP TABLE IF EXISTS \`${prefix}sales\`;\n`;
    sql += `CREATE TABLE \`${prefix}sales\` (\n`;
    sql += `  \`id\` VARCHAR(50) NOT NULL,\n`;
    sql += `  \`sale_number\` VARCHAR(50) NOT NULL UNIQUE,\n`;
    sql += `  \`voucher_type\` ENUM('FACTURA', 'BOLETA', 'TICKET') NOT NULL DEFAULT 'BOLETA',\n`;
    sql += `  \`customer_id\` VARCHAR(50) NOT NULL,\n`;
    sql += `  \`customer_name\` VARCHAR(150) NOT NULL,\n`;
    sql += `  \`customer_tax_id\` VARCHAR(30) NOT NULL,\n`;
    sql += `  \`customer_email\` VARCHAR(100) NULL,\n`;
    sql += `  \`customer_phone\` VARCHAR(30) NULL,\n`;
    sql += `  \`date\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  \`subtotal\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,\n`;
    sql += `  \`discount_total\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,\n`;
    sql += `  \`tax_total\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,\n`;
    sql += `  \`total\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,\n`;
    sql += `  \`currency\` VARCHAR(10) NOT NULL DEFAULT 'S/.',\n`;
    sql += `  \`payment_method\` ENUM('CASH', 'CARD', 'TRANSFER', 'CREDIT', 'MIXED') NOT NULL DEFAULT 'CASH',\n`;
    sql += `  \`payment_status\` ENUM('PAID', 'PENDING', 'PARTIAL') NOT NULL DEFAULT 'PAID',\n`;
    sql += `  \`paid_amount\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,\n`;
    sql += `  \`due_amount\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,\n`;
    sql += `  \`quote_ref\` VARCHAR(50) NULL,\n`;
    sql += `  \`seller_name\` VARCHAR(100) NOT NULL,\n`;
    sql += `  \`status\` ENUM('COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'COMPLETED',\n`;
    sql += `  \`items_json\` JSON NOT NULL,\n`;
    sql += `  \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,\n`;
    sql += `  PRIMARY KEY (\`id\`),\n`;
    sql += `  INDEX \`idx_sale_num\` (\`sale_number\`),\n`;
    sql += `  INDEX \`idx_sale_voucher\` (\`voucher_type\`),\n`;
    sql += `  INDEX \`idx_sale_date\` (\`date\`)\n`;
    sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

    // Company Settings
    sql += `-- --------------------------------------------------------\n`;
    sql += `-- Estructura de tabla para: \`${prefix}company_settings\`\n`;
    sql += `-- --------------------------------------------------------\n`;
    sql += `DROP TABLE IF EXISTS \`${prefix}company_settings\`;\n`;
    sql += `CREATE TABLE \`${prefix}company_settings\` (\n`;
    sql += `  \`id\` INT AUTO_INCREMENT PRIMARY KEY,\n`;
    sql += `  \`company_name\` VARCHAR(200) NOT NULL,\n`;
    sql += `  \`tax_id\` VARCHAR(30) NOT NULL,\n`;
    sql += `  \`phone\` VARCHAR(30) NULL,\n`;
    sql += `  \`email\` VARCHAR(100) NULL,\n`;
    sql += `  \`address\` TEXT NULL,\n`;
    sql += `  \`currency_symbol\` VARCHAR(10) DEFAULT 'S/.',\n`;
    sql += `  \`currency_code\` VARCHAR(10) DEFAULT 'PEN',\n`;
    sql += `  \`default_tax_rate\` DECIMAL(5,2) DEFAULT 18.00,\n`;
    sql += `  \`quote_prefix\` VARCHAR(10) DEFAULT 'COT-',\n`;
    sql += `  \`invoice_prefix\` VARCHAR(10) DEFAULT 'FAC-',\n`;
    sql += `  \`ticket_prefix\` VARCHAR(10) DEFAULT 'BOL-',\n`;
    sql += `  \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP\n`;
    sql += `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;\n\n`;

    // INSERTS
    sql += `-- ========================================================\n`;
    sql += `-- INSERTS DE DATOS INICIALES\n`;
    sql += `-- ========================================================\n\n`;

    // Users (OWASP A04: los hashes de contraseña nunca salen del servidor; se deben restablecer tras importar)
    sql += `-- Las contraseñas no se exportan: asigne una nueva a cada usuario después de importar.\n`;
    data.users.forEach(u => {
      const perms = JSON.stringify(u.permissions || {});
      const password = '!RESTABLECER';
      sql += `INSERT INTO \`${prefix}users\` (\`id\`, \`username\`, \`name\`, \`email\`, \`password\`, \`role\`, \`role_label\`, \`avatar_color\`, \`status\`, \`permissions\`) VALUES (${mysqlString(u.id)}, ${mysqlString(u.username)}, ${mysqlString(u.name)}, ${mysqlString(u.email)}, ${mysqlString(password)}, ${mysqlString(u.role)}, ${mysqlString(u.roleLabel)}, ${mysqlString(u.avatarColor || 'indigo')}, ${mysqlString(u.status)}, ${mysqlString(perms)});\n`;
    });
    sql += `\n`;

    // Categories
    data.categories.forEach(c => {
      sql += `INSERT INTO \`${prefix}categories\` (\`id\`, \`name\`, \`description\`, \`color\`) VALUES (${mysqlString(c.id)}, ${mysqlString(c.name)}, ${mysqlString((c.description || ''))}, ${mysqlString(c.color || 'blue')});\n`;
    });
    sql += `\n`;

    // Customers
    data.customers.forEach(cu => {
      sql += `INSERT INTO \`${prefix}customers\` (\`id\`, \`name\`, \`tax_id\`, \`email\`, \`phone\`, \`address\`, \`city\`, \`credit_limit\`, \`payment_terms\`) VALUES (${mysqlString(cu.id)}, ${mysqlString(cu.name)}, ${mysqlString(cu.taxId)}, ${mysqlString(cu.email || '')}, ${mysqlString(cu.phone || '')}, ${mysqlString((cu.address || ''))}, ${mysqlString(cu.city || 'Lima')}, ${sqlNumber(cu.creditLimit || 0)}, ${mysqlString(cu.paymentTerms || 'Contado')});\n`;
    });
    sql += `\n`;

    // Suppliers
    data.suppliers.forEach(s => {
      sql += `INSERT INTO \`${prefix}suppliers\` (\`id\`, \`name\`, \`tax_id\`, \`email\`, \`phone\`, \`address\`, \`contact_person\`, \`payment_terms\`) VALUES (${mysqlString(s.id)}, ${mysqlString(s.name)}, ${mysqlString(s.taxId)}, ${mysqlString(s.email || '')}, ${mysqlString(s.phone || '')}, ${mysqlString((s.address || ''))}, ${mysqlString((s.contactPerson || ''))}, ${mysqlString(s.paymentTerms || 'Crédito 30 días')});\n`;
    });
    sql += `\n`;

    // Products
    data.products.forEach(p => {
      const prodName = p.name;
      const cat = p.category;
      const loc = (p.location || 'Almacén Central');
      const supp = (p.supplierName || '');
      sql += `INSERT INTO \`${prefix}products\` (\`id\`, \`sku\`, \`barcode\`, \`name\`, \`category\`, \`cost_price\`, \`selling_price\`, \`tax_rate\`, \`stock\`, \`min_stock\`, \`unit\`, \`location\`, \`supplier_name\`, \`status\`) VALUES (${mysqlString(p.id)}, ${mysqlString(p.sku)}, ${mysqlString(p.barcode || '')}, ${mysqlString(prodName)}, ${mysqlString(cat)}, ${sqlNumber(p.costPrice)}, ${sqlNumber(p.sellingPrice)}, ${sqlNumber(p.taxRate || 18)}, ${sqlNumber(p.stock)}, ${sqlNumber(p.minStock)}, ${mysqlString(p.unit || 'UND')}, ${mysqlString(loc)}, ${mysqlString(supp)}, ${mysqlString(p.status)});\n`;
    });
    sql += `\n`;

    // Company Settings
    const set = data.settings;
    sql += `INSERT INTO \`${prefix}company_settings\` (\`company_name\`, \`tax_id\`, \`phone\`, \`email\`, \`address\`, \`currency_symbol\`, \`currency_code\`, \`default_tax_rate\`) VALUES (${mysqlString(set.companyName)}, ${mysqlString(set.taxId)}, ${mysqlString(set.phone)}, ${mysqlString(set.email)}, ${mysqlString((set.address || ''))}, ${mysqlString(set.currencySymbol || 'S/.')}, ${mysqlString(set.currencyCode || 'PEN')}, ${sqlNumber(set.defaultTaxRate || 18)});\n\n`;

    sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    sql += `-- FIN DEL SCRIPT MYSQL NEXUS ERP\n`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=nexus_erp_mysql_schema_${Date.now()}.sql`);
    res.send(sql);
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/system/import', requireAdmin, validateBody(backupSchema), (req: Request, res: Response) => {
  try {
    // OWASP A08: se valida la estructura completa y se guarda una copia del estado actual antes de reemplazarlo
    const backupFile = saveLocalBackup(db.exportDatabase(), 'pre-import');
    const success = db.importDatabase(req.body);
    if (!success) {
      return res.status(400).json({ success: false, error: 'Estructura de respaldo JSON inválida' });
    }
    res.json({ success: true, message: `Base de datos restaurada correctamente. Copia previa: ${backupFile}` });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/system/reset-demo', requireAdmin, (req: Request, res: Response) => {
  try {
    saveLocalBackup(db.exportDatabase(), 'pre-reset');
    db.resetDemoData();
    res.json({ success: true, message: 'Datos de prueba reiniciados con éxito' });
  } catch (error) {
    sendError(res, error);
  }
});

export default router;
