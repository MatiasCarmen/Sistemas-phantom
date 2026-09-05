import { Router, Request, Response } from 'express';
import { db } from './dataStore';
import { testMySQLConnection } from './mysql';

const router = Router();

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    message: 'Sistema de Inventario, Cotizaciones y Ventas API RESTful activo',
    timestamp: new Date().toISOString()
  });
});

// Dashboard metrics
router.get('/dashboard/stats', (req: Request, res: Response) => {
  try {
    const stats = db.getDashboardMetrics();
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/products/:id', (req: Request, res: Response) => {
  try {
    const product = db.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }
    res.json({ success: true, data: product });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/products', (req: Request, res: Response) => {
  try {
    const { name, sku, category, costPrice, sellingPrice, stock, minStock, unit } = req.body;
    if (!name || !category || costPrice === undefined || sellingPrice === undefined || stock === undefined) {
      return res.status(400).json({ 
        success: false, 
        error: 'Faltan campos obligatorios (nombre, categoría, precio costo, precio venta, stock)' 
      });
    }

    const newProduct = db.addProduct({
      name,
      sku: sku || '',
      barcode: req.body.barcode || '',
      description: req.body.description || '',
      category,
      brand: req.body.brand || '',
      costPrice: Number(costPrice),
      sellingPrice: Number(sellingPrice),
      taxRate: Number(req.body.taxRate || 18),
      stock: Number(stock),
      minStock: Number(minStock || 5),
      maxStock: Number(req.body.maxStock || 100),
      unit: unit || 'UND',
      location: req.body.location || '',
      supplierId: req.body.supplierId || '',
      supplierName: req.body.supplierName || '',
      imageUrl: req.body.imageUrl || ''
    });

    res.status(201).json({ success: true, data: newProduct });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/products/:id', (req: Request, res: Response) => {
  try {
    const updated = db.updateProduct(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/products/:id', (req: Request, res: Response) => {
  try {
    const success = db.deleteProduct(req.params.id);
    if (!success) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }
    res.json({ success: true, message: 'Producto eliminado correctamente' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/products/adjust-stock', (req: Request, res: Response) => {
  try {
    const { productId, type, quantity, notes, createdBy } = req.body;
    if (!productId || !type || quantity === undefined) {
      return res.status(400).json({ success: false, error: 'Faltan parámetros requeridos para el ajuste de stock' });
    }

    const result = db.adjustStock({
      productId,
      type,
      quantity: Number(quantity),
      notes,
      createdBy
    });

    if (!result) {
      return res.status(404).json({ success: false, error: 'Producto no encontrado' });
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- CATEGORIES ---
router.get('/categories', (req: Request, res: Response) => {
  try {
    const categories = db.getCategories();
    res.json({ success: true, data: categories });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/categories', (req: Request, res: Response) => {
  try {
    const { name, description, color } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'El nombre de la categoría es obligatorio' });
    }
    const newCat = db.addCategory({ name, description, color });
    res.status(201).json({ success: true, data: newCat });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/categories/:id', (req: Request, res: Response) => {
  try {
    const success = db.deleteCategory(req.params.id);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- SUPPLIERS ---
router.get('/suppliers', (req: Request, res: Response) => {
  try {
    const suppliers = db.getSuppliers();
    res.json({ success: true, data: suppliers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/suppliers', (req: Request, res: Response) => {
  try {
    const { name, taxId, email, phone, address, contactPerson, notes } = req.body;
    if (!name || !taxId) {
      return res.status(400).json({ success: false, error: 'Nombre y RUC/Identificación fiscal son obligatorios' });
    }
    const newSup = db.addSupplier({ name, taxId, email: email || '', phone: phone || '', address, contactPerson, notes });
    res.status(201).json({ success: true, data: newSup });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/suppliers/:id', (req: Request, res: Response) => {
  try {
    const updated = db.updateSupplier(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Proveedor no encontrado' });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/suppliers/:id', (req: Request, res: Response) => {
  try {
    const success = db.deleteSupplier(req.params.id);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- CUSTOMERS ---
router.get('/customers', (req: Request, res: Response) => {
  try {
    const customers = db.getCustomers();
    res.json({ success: true, data: customers });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/customers', (req: Request, res: Response) => {
  try {
    const { name, taxId, email, phone, address, creditLimit, notes } = req.body;
    if (!name || !taxId) {
      return res.status(400).json({ success: false, error: 'Nombre y Documento de Identidad/RUC son obligatorios' });
    }
    const newCust = db.addCustomer({ 
      name, 
      taxId, 
      email: email || '', 
      phone: phone || '', 
      address: address || '', 
      creditLimit: Number(creditLimit || 0), 
      notes: notes || '' 
    });
    res.status(201).json({ success: true, data: newCust });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/customers/:id', (req: Request, res: Response) => {
  try {
    const updated = db.updateCustomer(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Cliente no encontrado' });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/customers/:id', (req: Request, res: Response) => {
  try {
    const success = db.deleteCustomer(req.params.id);
    res.json({ success });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- INVENTORY MOVEMENTS (KARDEX) ---
router.get('/inventory/movements', (req: Request, res: Response) => {
  try {
    const { productId } = req.query;
    const movements = db.getInventoryMovements(productId as string);
    res.json({ success: true, data: movements, count: movements.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/quotes/:id', (req: Request, res: Response) => {
  try {
    const quote = db.getQuoteById(req.params.id);
    if (!quote) return res.status(404).json({ success: false, error: 'Cotización no encontrada' });
    res.json({ success: true, data: quote });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/quotes', (req: Request, res: Response) => {
  try {
    const { 
      customerId, 
      customerName, 
      customerTaxId, 
      customerEmail, 
      customerPhone,
      customerAddress,
      date, 
      expiryDate, 
      items, 
      subtotal, 
      discountTotal, 
      taxTotal, 
      total, 
      currency, 
      paymentTerms, 
      notes, 
      termsAndConditions, 
      createdBy, 
      status 
    } = req.body;

    if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Debe ingresar el cliente y al menos un producto a cotizar' });
    }

    const newQuote = db.addQuote({
      customerId: customerId || `cust-${Date.now()}`,
      customerName,
      customerTaxId: customerTaxId || '',
      customerEmail: customerEmail || '',
      customerPhone: customerPhone || '',
      customerAddress: customerAddress || '',
      date: date || new Date().toISOString().split('T')[0],
      expiryDate: expiryDate || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      status: status || 'SENT',
      items,
      subtotal: Number(subtotal || 0),
      discountTotal: Number(discountTotal || 0),
      taxTotal: Number(taxTotal || 0),
      total: Number(total || 0),
      currency: currency || db.getSettings().currencySymbol || 'S/.',
      paymentTerms: paymentTerms || 'Contado / Transferencia',
      notes: notes || '',
      termsAndConditions: termsAndConditions || '',
      createdBy: createdBy || 'Asesor Comercial'
    });

    res.status(201).json({ success: true, data: newQuote });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/quotes/:id', (req: Request, res: Response) => {
  try {
    if (req.body.status !== undefined) {
      const authHeader = req.headers.authorization;
      const tokenParts = authHeader?.startsWith('Bearer token_')
        ? authHeader.replace('Bearer token_', '').split('_')
        : [];
      const authenticatedUser = tokenParts[0] ? db.getUserById(tokenParts[0]) : undefined;
      if (authenticatedUser?.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Solo los administradores pueden cambiar el estado de una cotización' });
      }
    }

    const updated = db.updateQuote(req.params.id, req.body);
    if (!updated) return res.status(404).json({ success: false, error: 'Cotización no encontrada' });
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/quotes/:id', (req: Request, res: Response) => {
  try {
    const success = db.deleteQuote(req.params.id);
    if (!success) return res.status(404).json({ success: false, error: 'Cotización no encontrada' });
    res.json({ success: true, message: 'Cotización eliminada' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/quotes/:id/convert-to-sale', (req: Request, res: Response) => {
  try {
    const { voucherType, paymentMethod, sellerName } = req.body;
    const result = db.convertQuoteToSale(req.params.id, {
      voucherType,
      paymentMethod,
      sellerName
    });

    if (!result) {
      return res.status(404).json({ success: false, error: 'Cotización no encontrada o no se pudo convertir' });
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
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
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/sales/:id', (req: Request, res: Response) => {
  try {
    const sale = db.getSaleById(req.params.id);
    if (!sale) return res.status(404).json({ success: false, error: 'Venta no encontrada' });
    res.json({ success: true, data: sale });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/sales', (req: Request, res: Response) => {
  try {
    const {
      voucherType,
      customerId,
      customerName,
      customerTaxId,
      customerEmail,
      customerPhone,
      customerAddress,
      date,
      items,
      subtotal,
      discountTotal,
      taxTotal,
      total,
      currency,
      paymentMethod,
      paymentStatus,
      paidAmount,
      dueAmount,
      quoteIdReference,
      quoteNumberReference,
      notes,
      sellerName
    } = req.body;

    if (!customerName || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, error: 'Datos de cliente y productos requeridos para registrar la venta' });
    }

    // Verify stock availability
    for (const item of items) {
      const prod = db.getProductById(item.productId);
      if (!prod) {
        return res.status(400).json({ success: false, error: `El producto ${item.name} (${item.sku}) no existe en el catálogo.` });
      }
      if (prod.stock < item.quantity) {
        return res.status(400).json({ 
          success: false, 
          error: `Stock insuficiente para ${prod.name}. Stock disponible: ${prod.stock}, Solicitado: ${item.quantity}` 
        });
      }
    }

    const newSale = db.addSale({
      voucherType: voucherType || 'FACTURA',
      customerId: customerId || `cust-${Date.now()}`,
      customerName,
      customerTaxId: customerTaxId || '',
      customerEmail: customerEmail || '',
      customerPhone: customerPhone || '',
      customerAddress: customerAddress || '',
      date: date || new Date().toISOString().split('T')[0],
      items,
      subtotal: Number(subtotal || 0),
      discountTotal: Number(discountTotal || 0),
      taxTotal: Number(taxTotal || 0),
      total: Number(total || 0),
      currency: currency || db.getSettings().currencySymbol || 'S/.',
      paymentMethod: paymentMethod || 'CASH',
      paymentStatus: paymentStatus || 'PAID',
      paidAmount: Number(paidAmount !== undefined ? paidAmount : total),
      dueAmount: Number(dueAmount || 0),
      quoteIdReference,
      quoteNumberReference,
      notes: notes || '',
      sellerName: sellerName || 'Cajero Principal',
      status: 'COMPLETED'
    });

    res.status(201).json({ success: true, data: newSale });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/sales/:id/cancel', (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ success: false, error: 'Debe especificar el motivo de anulación' });
    }

    const cancelled = db.cancelSale(req.params.id, reason);
    if (!cancelled) {
      return res.status(404).json({ success: false, error: 'Venta no encontrada o ya se encuentra anulada' });
    }

    res.json({ success: true, data: cancelled, message: 'Venta anulada y stock devuelto exitosamente al inventario' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- SETTINGS ---
router.get('/settings', (req: Request, res: Response) => {
  try {
    const settings = db.getSettings();
    res.json({ success: true, data: settings });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/settings', (req: Request, res: Response) => {
  try {
    const updated = db.updateSettings(req.body);
    res.json({ success: true, data: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- AUTHENTICATION & USERS ---
router.post('/auth/login', (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username) {
      return res.status(400).json({ success: false, error: 'Ingrese su nombre de usuario o correo' });
    }

    const authResult = db.authenticateUser(username, password || '');
    if (authResult.error || !authResult.user) {
      return res.status(401).json({ success: false, error: authResult.error || 'Credenciales inválidas' });
    }

    const token = `token_${authResult.user.id}_${Date.now()}`;
    res.json({
      success: true,
      token,
      user: authResult.user,
      message: `Bienvenido(a), ${authResult.user.name}`
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/auth/me', (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    let userId = 'usr-admin';
    if (authHeader && authHeader.startsWith('Bearer token_')) {
      const parts = authHeader.replace('Bearer token_', '').split('_');
      if (parts[0]) {
        userId = parts[0];
      }
    }

    const user = db.getUserById(userId) || db.getUsers()[0];
    if (!user) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }

    const { password, ...safeUser } = user;
    res.json({ success: true, user: safeUser });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/auth/logout', (req: Request, res: Response) => {
  res.json({ success: true, message: 'Sesión cerrada correctamente' });
});

router.get('/users', (req: Request, res: Response) => {
  try {
    const users = db.getUsers();
    res.json({ success: true, data: users, count: users.length });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/users', (req: Request, res: Response) => {
  try {
    const { username, name, email, role, password, permissions } = req.body;
    if (!username || !name || !email) {
      return res.status(400).json({ success: false, error: 'Campos requeridos: username, name, email' });
    }

    // Check duplicate
    const existing = db.getUserByUsernameOrEmail(username);
    if (existing) {
      return res.status(400).json({ success: false, error: 'El nombre de usuario o correo ya está registrado' });
    }

    const newUser = db.addUser({
      username: username.trim().toLowerCase(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role: role || 'collaborator',
      roleLabel: role === 'admin' ? 'Administrador' : role === 'warehouse' ? 'Almacén' : role === 'cashier' ? 'Caja' : 'Colaborador',
      password: password || '123456',
      status: 'active',
      permissions: permissions || undefined
    });

    res.status(201).json({ success: true, data: newUser, message: 'Usuario colaborador creado con éxito' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.put('/users/:id', (req: Request, res: Response) => {
  try {
    const updated = db.updateUser(req.params.id, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Usuario no encontrado' });
    }
    res.json({ success: true, data: updated, message: 'Usuario actualizado correctamente' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/users/:id', (req: Request, res: Response) => {
  try {
    const success = db.deleteUser(req.params.id);
    if (!success) {
      return res.status(400).json({ success: false, error: 'No se puede eliminar el usuario (no existe o es el último administrador)' });
    }
    res.json({ success: true, message: 'Usuario eliminado exitosamente' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- SYSTEM BACKUP / RESET / EXPORT ---
router.get('/system/export', (req: Request, res: Response) => {
  try {
    const data = db.exportDatabase();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=inventario_db_backup_${Date.now()}.json`);
    res.send(JSON.stringify(data, null, 2));
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/system/raw-db', (req: Request, res: Response) => {
  try {
    const data = db.exportDatabase();
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.get('/system/sql-export', (req: Request, res: Response) => {
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
    sql += `  password VARCHAR(255) NOT NULL DEFAULT '123456',\n`;
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
      sql += `INSERT INTO categories (id, name, description, color) VALUES ('${c.id}', '${c.name.replace(/'/g, "''")}', '${(c.description || '').replace(/'/g, "''")}', '${c.color || 'blue'}') ON CONFLICT (id) DO NOTHING;\n`;
    });
    sql += `\n`;

    sql += `-- INSERTS: PRODUCTS (${data.products.length})\n`;
    data.products.forEach(p => {
      const catName = (p.category || '').replace(/'/g, "''");
      const prodName = (p.name || '').replace(/'/g, "''");
      const loc = (p.location || 'Almacén Central').replace(/'/g, "''");
      const supp = (p.supplierName || '').replace(/'/g, "''");
      sql += `INSERT INTO products (id, sku, name, category_name, cost_price, sale_price, stock, min_stock, unit, warehouse, barcode, supplier_name, status) VALUES ('${p.id}', '${p.sku}', '${prodName}', '${catName}', ${p.costPrice || 0}, ${p.sellingPrice || 0}, ${p.stock || 0}, ${p.minStock || 0}, '${p.unit || 'UND'}', '${loc}', '${p.barcode || ''}', '${supp}', '${p.status || 'in_stock'}') ON CONFLICT (id) DO NOTHING;\n`;
    });
    sql += `\n`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=nexus_erp_schema_${Date.now()}.sql`);
    res.send(sql);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- MYSQL DATABASE INTEGRATION ENDPOINTS ---
router.get('/database/mysql-config', (req: Request, res: Response) => {
  try {
    const config = db.getMySQLConfig();
    res.json({ success: true, config });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/database/mysql-config', (req: Request, res: Response) => {
  try {
    const updated = db.updateMySQLConfig(req.body);
    res.json({ success: true, config: updated, message: 'Configuración MySQL guardada con éxito' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/database/mysql-test', async (req: Request, res: Response) => {
  try {
    const { host, port, database, user, password, ssl, charset } = req.body;

    if (!host || !port || !database || !user) {
      return res.status(400).json({
        success: false,
        message: 'Faltan parámetros obligatorios (Host, Puerto, Base de datos o Usuario).'
      });
    }

    const connectionConfig = {
      host,
      port: Number(port),
      database,
      user,
      password: password || '',
      ssl: !!ssl,
      charset: charset || 'utf8mb4',
      autoSync: true,
    };

    const result = await testMySQLConnection(connectionConfig);

    db.updateMySQLConfig({
      host,
      port: Number(port),
      database,
      user,
      password: password || '',
      ssl: !!ssl,
      charset: charset || 'utf8mb4',
      connected: true,
      lastTested: new Date().toISOString()
    });

    return res.json({
      success: true,
      message: result.message,
      serverVersion: result.serverVersion,
      database: result.database,
      user: result.user,
      latencyMs: result.latencyMs,
      tablesFound: result.tablesFound || [],
      details: result.details
    });
  } catch (error: any) {
    const message = error?.message || 'Error al conectar con el servidor MySQL';
    db.updateMySQLConfig({
      host: req.body?.host || 'localhost',
      port: Number(req.body?.port || 3306),
      database: req.body?.database || 'nexus_erp_db',
      user: req.body?.user || 'root',
      password: req.body?.password || '',
      ssl: !!req.body?.ssl,
      charset: req.body?.charset || 'utf8mb4',
      connected: false,
      lastTested: new Date().toISOString()
    });

    return res.status(500).json({
      success: false,
      message: `Error al conectar con el servidor MySQL: ${message}`
    });
  }
});

router.get('/database/mysql-script', (req: Request, res: Response) => {
  try {
    const data = db.exportDatabase();
    const config = db.getMySQLConfig();
    const dbName = config.database || 'nexus_erp_db';
    const prefix = config.tablePrefix || 'nexus_';

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
    sql += `  \`password\` VARCHAR(255) NOT NULL DEFAULT '123456',\n`;
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

    // Users
    data.users.forEach(u => {
      const perms = JSON.stringify(u.permissions || {}).replace(/'/g, "\\'");
      const password = (u.password || '123456').replace(/'/g, "\\'");
      sql += `INSERT INTO \`${prefix}users\` (\`id\`, \`username\`, \`name\`, \`email\`, \`password\`, \`role\`, \`role_label\`, \`avatar_color\`, \`status\`, \`permissions\`) VALUES ('${u.id}', '${u.username}', '${u.name.replace(/'/g, "\\'")}', '${u.email}', '${password}', '${u.role}', '${u.roleLabel.replace(/'/g, "\\'")}', '${u.avatarColor || 'indigo'}', '${u.status}', '${perms}');\n`;
    });
    sql += `\n`;

    // Categories
    data.categories.forEach(c => {
      sql += `INSERT INTO \`${prefix}categories\` (\`id\`, \`name\`, \`description\`, \`color\`) VALUES ('${c.id}', '${c.name.replace(/'/g, "\\'")}', '${(c.description || '').replace(/'/g, "\\'")}', '${c.color || 'blue'}');\n`;
    });
    sql += `\n`;

    // Customers
    data.customers.forEach(cu => {
      sql += `INSERT INTO \`${prefix}customers\` (\`id\`, \`name\`, \`tax_id\`, \`email\`, \`phone\`, \`address\`, \`city\`, \`credit_limit\`, \`payment_terms\`) VALUES ('${cu.id}', '${cu.name.replace(/'/g, "\\'")}', '${cu.taxId}', '${cu.email || ''}', '${cu.phone || ''}', '${(cu.address || '').replace(/'/g, "\\'")}', '${cu.city || 'Lima'}', ${cu.creditLimit || 0}, '${cu.paymentTerms || 'Contado'}');\n`;
    });
    sql += `\n`;

    // Suppliers
    data.suppliers.forEach(s => {
      sql += `INSERT INTO \`${prefix}suppliers\` (\`id\`, \`name\`, \`tax_id\`, \`email\`, \`phone\`, \`address\`, \`contact_person\`, \`payment_terms\`) VALUES ('${s.id}', '${s.name.replace(/'/g, "\\'")}', '${s.taxId}', '${s.email || ''}', '${s.phone || ''}', '${(s.address || '').replace(/'/g, "\\'")}', '${(s.contactPerson || '').replace(/'/g, "\\'")}', '${s.paymentTerms || 'Crédito 30 días'}');\n`;
    });
    sql += `\n`;

    // Products
    data.products.forEach(p => {
      const prodName = p.name.replace(/'/g, "\\'");
      const cat = p.category.replace(/'/g, "\\'");
      const loc = (p.location || 'Almacén Central').replace(/'/g, "\\'");
      const supp = (p.supplierName || '').replace(/'/g, "\\'");
      sql += `INSERT INTO \`${prefix}products\` (\`id\`, \`sku\`, \`barcode\`, \`name\`, \`category\`, \`cost_price\`, \`selling_price\`, \`tax_rate\`, \`stock\`, \`min_stock\`, \`unit\`, \`location\`, \`supplier_name\`, \`status\`) VALUES ('${p.id}', '${p.sku}', '${p.barcode || ''}', '${prodName}', '${cat}', ${p.costPrice}, ${p.sellingPrice}, ${p.taxRate || 18}, ${p.stock}, ${p.minStock}, '${p.unit || 'UND'}', '${loc}', '${supp}', '${p.status}');\n`;
    });
    sql += `\n`;

    // Company Settings
    const set = data.settings;
    sql += `INSERT INTO \`${prefix}company_settings\` (\`company_name\`, \`tax_id\`, \`phone\`, \`email\`, \`address\`, \`currency_symbol\`, \`currency_code\`, \`default_tax_rate\`) VALUES ('${set.companyName.replace(/'/g, "\\'")}', '${set.taxId}', '${set.phone}', '${set.email}', '${(set.address || '').replace(/'/g, "\\'")}', '${set.currencySymbol || 'S/.'}', '${set.currencyCode || 'PEN'}', ${set.defaultTaxRate || 18});\n\n`;

    sql += `SET FOREIGN_KEY_CHECKS = 1;\n`;
    sql += `-- FIN DEL SCRIPT MYSQL NEXUS ERP\n`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename=nexus_erp_mysql_schema_${Date.now()}.sql`);
    res.send(sql);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/system/import', (req: Request, res: Response) => {
  try {
    const success = db.importDatabase(req.body);
    if (!success) {
      return res.status(400).json({ success: false, error: 'Estructura de respaldo JSON inválida' });
    }
    res.json({ success: true, message: 'Base de datos restaurada correctamente' });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/system/reset-demo', (req: Request, res: Response) => {
  try {
    const data = db.resetDemoData();
    res.json({ success: true, message: 'Datos de prueba reiniciados con éxito', data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
