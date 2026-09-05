import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import { 
  Product, 
  Category, 
  Supplier, 
  Customer, 
  InventoryMovement, 
  Quote, 
  Sale, 
  CompanySettings, 
  DashboardMetrics,
  MovementType,
  User,
  MySQLConfig
} from '../src/types';
import { 
  initialProducts, 
  initialCategories, 
  initialSuppliers, 
  initialCustomers, 
  initialInventoryMovements, 
  initialQuotes, 
  initialSales, 
  initialCompanySettings,
  initialUsers
} from './initialData';
import {
  ensureMySQLSchema,
  loadCategoriesFromMySQL,
  loadCustomersFromMySQL,
  loadDatabaseSnapshot,
  loadInventoryMovementsFromMySQL,
  loadProductsFromMySQL,
  loadQuotesFromMySQL,
  loadSalesFromMySQL,
  loadSuppliersFromMySQL,
  loadUsersFromMySQL,
  saveCategoriesToMySQL,
  saveCustomersToMySQL,
  saveDatabaseSnapshot,
  saveInventoryMovementsToMySQL,
  saveProductsToMySQL,
  saveQuotesToMySQL,
  saveSalesToMySQL,
  saveSuppliersToMySQL,
  saveUsersToMySQL
} from './mysql';

export interface DatabaseSchema {
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  customers: Customer[];
  inventoryMovements: InventoryMovement[];
  quotes: Quote[];
  sales: Sale[];
  settings: CompanySettings;
  users: User[];
  mysqlConfig?: MySQLConfig;
  lastUpdated: string;
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

const defaultMySQLConfig: MySQLConfig = {
  host: 'localhost',
  port: 3306,
  database: 'nexus_erp_db',
  user: 'root',
  password: '',
  ssl: false,
  charset: 'utf8mb4',
  tablePrefix: 'nexus_',
  autoSync: true,
  connected: false,
  lastTested: undefined
};

class DataStore {
  private data: DatabaseSchema;
  private isLoaded: boolean = false;

  constructor() {
    this.data = this.getDefaultSchema();
    this.init();
  }

  private getDefaultSchema(): DatabaseSchema {
    return {
      products: JSON.parse(JSON.stringify(initialProducts)),
      categories: JSON.parse(JSON.stringify(initialCategories)),
      suppliers: JSON.parse(JSON.stringify(initialSuppliers)),
      customers: JSON.parse(JSON.stringify(initialCustomers)),
      inventoryMovements: JSON.parse(JSON.stringify(initialInventoryMovements)),
      quotes: JSON.parse(JSON.stringify(initialQuotes)),
      sales: JSON.parse(JSON.stringify(initialSales)),
      settings: JSON.parse(JSON.stringify(initialCompanySettings)),
      users: JSON.parse(JSON.stringify(initialUsers)),
      mysqlConfig: JSON.parse(JSON.stringify(defaultMySQLConfig)),
      lastUpdated: new Date().toISOString()
    };
  }

  private normalizeQuoteNumbering(): void {
    const chronologicalQuotes = [...this.data.quotes].sort((firstQuote, secondQuote) => {
      return new Date(firstQuote.createdAt).getTime() - new Date(secondQuote.createdAt).getTime();
    });
    const quoteNumbersById = new Map<string, string>();

    chronologicalQuotes.forEach((quote, index) => {
      const quoteNumber = `COT-${String(index + 1).padStart(8, '0')}`;
      quote.quoteNumber = quoteNumber;
      quoteNumbersById.set(quote.id, quoteNumber);
    });

    for (const sale of this.data.sales) {
      if (sale.quoteIdReference && quoteNumbersById.has(sale.quoteIdReference)) {
        sale.quoteNumberReference = quoteNumbersById.get(sale.quoteIdReference);
      }
    }

    this.data.settings.quotePrefix = 'COT-';
    this.data.settings.nextQuoteNumber = chronologicalQuotes.length + 1;
  }

  private shouldUseMySQL(): boolean {
    const config = this.data.mysqlConfig ?? { ...defaultMySQLConfig };
    return Boolean(config.autoSync ?? true) || (process.env.MYSQL_AUTO_SYNC === 'true');
  }

  private async hydrateFromMySQLIfEnabled(): Promise<void> {
    if (!this.shouldUseMySQL()) {
      return;
    }

    try {
      const config = this.getMySQLConfig();
      await ensureMySQLSchema(config);

      const snapshot = await loadDatabaseSnapshot(config);
      const mysqlProducts = await loadProductsFromMySQL(config);
      const mysqlCategories = await loadCategoriesFromMySQL(config);
      const mysqlSuppliers = await loadSuppliersFromMySQL(config);
      const mysqlUsers = await loadUsersFromMySQL(config);
      const mysqlCustomers = await loadCustomersFromMySQL(config);
      const mysqlQuotes = await loadQuotesFromMySQL(config);
      const mysqlSales = await loadSalesFromMySQL(config);
      const mysqlMovements = await loadInventoryMovementsFromMySQL(config);

      if (snapshot && Array.isArray(snapshot.products)) {
        this.data = snapshot;
      }

      if (Array.isArray(mysqlProducts) && mysqlProducts.length > 0) {
        this.data.products = mysqlProducts;
      }

      if (Array.isArray(mysqlCategories) && mysqlCategories.length > 0) {
        this.data.categories = mysqlCategories;
      }

      if (Array.isArray(mysqlSuppliers) && mysqlSuppliers.length > 0) {
        this.data.suppliers = mysqlSuppliers;
      }

      if (Array.isArray(mysqlUsers) && mysqlUsers.length > 0) {
        this.data.users = mysqlUsers;
      }

      if (Array.isArray(mysqlCustomers) && mysqlCustomers.length > 0) {
        this.data.customers = mysqlCustomers;
      }

      if (Array.isArray(mysqlQuotes) && mysqlQuotes.length > 0) {
        this.data.quotes = mysqlQuotes;
      }

      if (Array.isArray(mysqlSales) && mysqlSales.length > 0) {
        this.data.sales = mysqlSales;
      }

      if (Array.isArray(mysqlMovements) && mysqlMovements.length > 0) {
        this.data.inventoryMovements = mysqlMovements;
      }

      this.normalizeQuoteNumbering();
      this.isLoaded = true;
      return;
    } catch (err) {
      console.warn('[DataStore] MySQL not available, falling back to the local JSON store:', err);
    }
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        if (parsed && Array.isArray(parsed.products)) {
          if (!Array.isArray(parsed.users) || parsed.users.length === 0) {
            parsed.users = JSON.parse(JSON.stringify(initialUsers));
          }
          this.data = {
            ...this.getDefaultSchema(),
            ...parsed,
            mysqlConfig: {
              ...defaultMySQLConfig,
              ...(parsed.mysqlConfig || {})
            }
          };
          this.isLoaded = true;
        }
      }

      if (!this.isLoaded) {
        this.data = {
          ...this.getDefaultSchema(),
          mysqlConfig: { ...defaultMySQLConfig }
        };
        this.normalizeProductCodes();
        this.normalizeHistoricalTransactions();
        this.normalizeSaleNumbering();
        this.normalizeQuoteNumbering();
        this.saveToFile();
        this.isLoaded = true;
      }
    } catch (err) {
      console.warn('[DataStore] Warning while loading database file, using memory backup:', err);
      this.data = this.getDefaultSchema();
      this.isLoaded = true;
    }

    this.normalizeProductCodes();
    this.normalizeHistoricalTransactions();
    this.normalizeSaleNumbering();
    this.normalizeQuoteNumbering();
    this.saveToFile();
    void this.hydrateFromMySQLIfEnabled();
  }

  private normalizeHistoricalTransactions(): void {
    const productsById = new Map(this.data.products.map((product) => [product.id, product]));
    const productsBySku = new Map(this.data.products.map((product) => [product.sku, product]));

    const recalculateItems = (items: Array<any>) => {
      let subtotal = 0;
      let discountTotal = 0;
      let taxTotal = 0;

      for (const item of items) {
        const product = productsById.get(item.productId) || productsBySku.get(item.sku);
        if (!product) {
          continue;
        }

        item.productId = product.id;
        item.sku = product.sku;
        item.name = product.name;
        item.unit = product.unit;
        item.unitPrice = product.sellingPrice;
        item.costPrice = product.costPrice;
        item.taxRate = product.taxRate;

        const quantity = Number(item.quantity) || 0;
        const discountPercent = Number(item.discountPercent) || 0;
        const grossLine = item.unitPrice * quantity;
        const lineTotal = grossLine * (1 - discountPercent / 100);
        const lineSubtotal = lineTotal / (1 + item.taxRate / 100);
        const lineTax = lineTotal - lineSubtotal;

        item.subtotal = Number(lineSubtotal.toFixed(2));
        item.taxAmount = Number(lineTax.toFixed(2));
        item.total = Number(lineTotal.toFixed(2));
        subtotal += lineSubtotal;
        discountTotal += grossLine - lineSubtotal;
        taxTotal += lineTax;
      }

      return {
        subtotal: Number(subtotal.toFixed(2)),
        discountTotal: Number(discountTotal.toFixed(2)),
        taxTotal: Number(taxTotal.toFixed(2)),
        total: Number((subtotal + taxTotal).toFixed(2))
      };
    };

    for (const quote of this.data.quotes) {
      const totals = recalculateItems(quote.items);
      quote.subtotal = totals.subtotal;
      quote.discountTotal = totals.discountTotal;
      quote.taxTotal = totals.taxTotal;
      quote.total = totals.total;
    }

    for (const sale of this.data.sales) {
      const totals = recalculateItems(sale.items);
      sale.subtotal = totals.subtotal;
      sale.discountTotal = totals.discountTotal;
      sale.taxTotal = totals.taxTotal;
      sale.total = totals.total;
      sale.paidAmount = sale.paymentStatus === 'PAID'
        ? totals.total
        : Math.min(Number(sale.paidAmount) || 0, totals.total);
      sale.dueAmount = Number(Math.max(totals.total - sale.paidAmount, 0).toFixed(2));
    }

    for (const movement of this.data.inventoryMovements) {
      const product = productsById.get(movement.productId);
      if (product) {
        movement.productSku = product.sku;
        movement.productName = product.name;
        movement.unitCost = product.costPrice;
      }
    }
  }

  private createUniqueSku(usedCodes: Set<string>): string {
    let code = '';
    do {
      code = randomBytes(4).readUInt32BE(0).toString().slice(-6).padStart(6, '0');
    } while (usedCodes.has(code));
    usedCodes.add(code);
    return code;
  }

  private createUniqueBarcode(usedCodes: Set<string>): string {
    let code = '';
    do {
      code = `775${randomBytes(4).readUInt32BE(0).toString().slice(-6).padStart(6, '0')}`;
    } while (usedCodes.has(code));
    usedCodes.add(code);
    return code;
  }

  private normalizeProductCodes(): void {
    const usedSkus = new Set<string>();
    const usedBarcodes = new Set<string>();

    for (const product of this.data.products) {
      const hasUniqueSku = Boolean(product.sku) && !usedSkus.has(product.sku) && /^\d{6}$/.test(product.sku);
      const hasUniqueBarcode = Boolean(product.barcode) && !usedBarcodes.has(product.barcode) && /^775\d{6}$/.test(product.barcode);
      product.sku = hasUniqueSku ? product.sku : this.createUniqueSku(usedSkus);
      product.barcode = hasUniqueBarcode ? product.barcode : this.createUniqueBarcode(usedBarcodes);
      usedSkus.add(product.sku);
      usedBarcodes.add(product.barcode);
    }
  }

  private normalizeSaleNumbering(): void {
    const chronologicalSales = [...this.data.sales].sort((firstSale, secondSale) => {
      return new Date(firstSale.createdAt).getTime() - new Date(secondSale.createdAt).getTime();
    });
    const saleNumbersById = new Map<string, string>();
    const saleNumbersByPreviousNumber = new Map<string, string>();

    chronologicalSales.forEach((sale, index) => {
      const saleNumber = `FAC-${String(index + 1).padStart(8, '0')}`;
      saleNumbersById.set(sale.id, saleNumber);
      saleNumbersByPreviousNumber.set(sale.saleNumber, saleNumber);
      sale.saleNumber = saleNumber;
    });

    for (const quote of this.data.quotes) {
      if (quote.convertedToSaleId && saleNumbersById.has(quote.convertedToSaleId)) {
        quote.convertedToSaleNumber = saleNumbersById.get(quote.convertedToSaleId);
      }
    }

    for (const movement of this.data.inventoryMovements) {
      if (movement.referenceId) {
        const normalizedReference = saleNumbersByPreviousNumber.get(movement.referenceId);
        if (normalizedReference) {
          movement.referenceId = normalizedReference;
        }
      }
    }

    this.data.settings.invoicePrefix = 'FAC-';
    this.data.settings.nextInvoiceNumber = chronologicalSales.length + 1;
  }

  private saveToFile() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      this.data.lastUpdated = new Date().toISOString();
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DataStore] Failed to write database file:', err);
    }

    const config = this.data.mysqlConfig ?? { ...defaultMySQLConfig };
    if (Boolean(config.autoSync ?? true)) {
      void ensureMySQLSchema(config)
        .then(async () => {
          await saveDatabaseSnapshot(config, this.data);
          await saveCategoriesToMySQL(config, this.data.categories);
          await saveSuppliersToMySQL(config, this.data.suppliers);
          await saveCustomersToMySQL(config, this.data.customers);
          await saveProductsToMySQL(config, this.data.products);
          await saveUsersToMySQL(config, this.data.users);
          await saveQuotesToMySQL(config, this.data.quotes);
          await saveSalesToMySQL(config, this.data.sales);
          await saveInventoryMovementsToMySQL(config, this.data.inventoryMovements);
        })
        .catch((err) => {
          console.warn('[DataStore] Unable to sync database snapshot to MySQL, keeping local JSON backup:', err);
        });
    }
  }

  // --- PRODUCTS ---
  getProducts(): Product[] {
    return this.data.products;
  }

  getProductById(id: string): Product | undefined {
    return this.data.products.find(p => p.id === id);
  }

  addProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { id?: string }): Product {
    const id = productData.id || `prod-${Date.now()}`;
    const now = new Date().toISOString();
    const usedSkus = new Set(this.data.products.map(product => product.sku));
    const usedBarcodes = new Set(this.data.products.map(product => product.barcode).filter(Boolean) as string[]);
    const sku = productData.sku && !usedSkus.has(productData.sku)
      ? productData.sku
      : this.createUniqueSku(usedSkus);
    const barcode = productData.barcode && !usedBarcodes.has(productData.barcode)
      ? productData.barcode
      : this.createUniqueBarcode(usedBarcodes);
    
    // Auto status
    let status: Product['status'] = 'in_stock';
    if (productData.stock <= 0) {
      status = 'out_of_stock';
    } else if (productData.stock <= productData.minStock) {
      status = 'low_stock';
    }

    const newProduct: Product = {
      ...productData,
      sku,
      barcode,
      id,
      status,
      createdAt: now,
      updatedAt: now
    };

    this.data.products.unshift(newProduct);

    // If initial stock > 0, register initial Kardex entry
    if (newProduct.stock > 0) {
      this.addInventoryMovement({
        productId: newProduct.id,
        productSku: newProduct.sku,
        productName: newProduct.name,
        type: 'IN_ADJUSTMENT',
        quantity: newProduct.stock,
        previousStock: 0,
        newStock: newProduct.stock,
        unitCost: newProduct.costPrice,
        notes: 'Stock inicial al registrar producto',
        createdBy: 'Sistema'
      });
    }

    this.saveToFile();
    return newProduct;
  }

  updateProduct(id: string, updates: Partial<Product>): Product | null {
    const index = this.data.products.findIndex(p => p.id === id);
    if (index === -1) return null;

    const existing = this.data.products[index];
    const usedSkus = new Set(this.data.products.filter(product => product.id !== id).map(product => product.sku));
    const usedBarcodes = new Set(this.data.products.filter(product => product.id !== id).map(product => product.barcode).filter(Boolean) as string[]);
    const sku = updates.sku === undefined
      ? existing.sku
      : (updates.sku && !usedSkus.has(updates.sku) ? updates.sku : this.createUniqueSku(usedSkus));
    const barcode = updates.barcode === undefined
      ? existing.barcode
      : (updates.barcode && !usedBarcodes.has(updates.barcode) ? updates.barcode : this.createUniqueBarcode(usedBarcodes));
    const newStock = updates.stock !== undefined ? updates.stock : existing.stock;
    const minStock = updates.minStock !== undefined ? updates.minStock : existing.minStock;

    let status: Product['status'] = 'in_stock';
    if (newStock <= 0) {
      status = 'out_of_stock';
    } else if (newStock <= minStock) {
      status = 'low_stock';
    }

    const updated: Product = {
      ...existing,
      ...updates,
      sku,
      barcode,
      id, // protect ID
      status,
      updatedAt: new Date().toISOString()
    };

    this.data.products[index] = updated;
    this.saveToFile();
    return updated;
  }

  deleteProduct(id: string): boolean {
    const index = this.data.products.findIndex(p => p.id === id);
    if (index === -1) return false;
    this.data.products.splice(index, 1);
    this.saveToFile();
    return true;
  }

  adjustStock(params: {
    productId: string;
    type: MovementType;
    quantity: number;
    notes?: string;
    createdBy?: string;
    referenceId?: string;
  }): { product: Product; movement: InventoryMovement } | null {
    const product = this.getProductById(params.productId);
    if (!product) return null;

    const qty = Math.abs(params.quantity);
    const prevStock = product.stock;
    let newStock = prevStock;

    if (params.type.startsWith('IN_')) {
      newStock = prevStock + qty;
    } else if (params.type.startsWith('OUT_')) {
      newStock = Math.max(0, prevStock - qty);
    }

    // Update product stock
    let status: Product['status'] = 'in_stock';
    if (newStock <= 0) {
      status = 'out_of_stock';
    } else if (newStock <= product.minStock) {
      status = 'low_stock';
    }

    product.stock = newStock;
    product.status = status;
    product.updatedAt = new Date().toISOString();

    // Create movement
    const movement = this.addInventoryMovement({
      productId: product.id,
      productSku: product.sku,
      productName: product.name,
      type: params.type,
      quantity: qty,
      previousStock: prevStock,
      newStock: newStock,
      unitCost: product.costPrice,
      referenceId: params.referenceId,
      notes: params.notes,
      createdBy: params.createdBy || 'Usuario Almacén'
    });

    this.saveToFile();
    return { product, movement };
  }

  // --- CATEGORIES ---
  getCategories(): Category[] {
    // Recount items dynamically
    return this.data.categories.map(cat => ({
      ...cat,
      itemCount: this.data.products.filter(p => p.category.toLowerCase() === cat.name.toLowerCase()).length
    }));
  }

  addCategory(category: Omit<Category, 'id'> & { id?: string }): Category {
    const newCat: Category = {
      ...category,
      id: category.id || `cat-${Date.now()}`,
      itemCount: 0
    };
    this.data.categories.push(newCat);
    this.saveToFile();
    return newCat;
  }

  deleteCategory(id: string): boolean {
    const index = this.data.categories.findIndex(c => c.id === id);
    if (index === -1) return false;
    this.data.categories.splice(index, 1);
    this.saveToFile();
    return true;
  }

  // --- SUPPLIERS ---
  getSuppliers(): Supplier[] {
    return this.data.suppliers;
  }

  addSupplier(data: Omit<Supplier, 'id' | 'createdAt'> & { id?: string }): Supplier {
    const newSup: Supplier = {
      ...data,
      id: data.id || `sup-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    this.data.suppliers.push(newSup);
    this.saveToFile();
    return newSup;
  }

  updateSupplier(id: string, updates: Partial<Supplier>): Supplier | null {
    const index = this.data.suppliers.findIndex(s => s.id === id);
    if (index === -1) return null;
    this.data.suppliers[index] = { ...this.data.suppliers[index], ...updates };
    this.saveToFile();
    return this.data.suppliers[index];
  }

  deleteSupplier(id: string): boolean {
    const index = this.data.suppliers.findIndex(s => s.id === id);
    if (index === -1) return false;
    this.data.suppliers.splice(index, 1);
    this.saveToFile();
    return true;
  }

  // --- CUSTOMERS ---
  getCustomers(): Customer[] {
    return this.data.customers.map(c => {
      const sales = this.data.sales.filter(s => s.customerId === c.id && s.status === 'COMPLETED');
      const totalPurchases = sales.reduce((sum, s) => sum + s.total, 0);
      return { ...c, totalPurchases };
    });
  }

  getCustomerById(id: string): Customer | undefined {
    return this.getCustomers().find(c => c.id === id);
  }

  addCustomer(data: Omit<Customer, 'id' | 'createdAt' | 'totalPurchases'> & { id?: string }): Customer {
    const newCustomer: Customer = {
      ...data,
      id: data.id || `cust-${Date.now()}`,
      createdAt: new Date().toISOString(),
      totalPurchases: 0
    };
    this.data.customers.push(newCustomer);
    this.saveToFile();
    return newCustomer;
  }

  updateCustomer(id: string, updates: Partial<Customer>): Customer | null {
    const index = this.data.customers.findIndex(c => c.id === id);
    if (index === -1) return null;
    this.data.customers[index] = { ...this.data.customers[index], ...updates };
    this.saveToFile();
    return this.getCustomerById(id) || null;
  }

  deleteCustomer(id: string): boolean {
    const index = this.data.customers.findIndex(c => c.id === id);
    if (index === -1) return false;
    this.data.customers.splice(index, 1);
    const config = this.getMySQLConfig();
    if (this.shouldUseMySQL()) {
      void (async () => {
        try {
          const { deleteCustomerFromMySQL } = await import('./mysql');
          await deleteCustomerFromMySQL(config, id);
        } catch {
          // no-op: the local store has already been updated
        }
      })();
    }
    this.saveToFile();
    return true;
  }

  // --- INVENTORY MOVEMENTS (KARDEX) ---
  getInventoryMovements(productId?: string): InventoryMovement[] {
    if (productId) {
      return this.data.inventoryMovements.filter(m => m.productId === productId);
    }
    return this.data.inventoryMovements;
  }

  addInventoryMovement(movement: Omit<InventoryMovement, 'id' | 'createdAt'> & { id?: string }): InventoryMovement {
    const newMov: InventoryMovement = {
      ...movement,
      id: movement.id || `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: new Date().toISOString()
    };
    this.data.inventoryMovements.unshift(newMov);
    this.saveToFile();
    return newMov;
  }

  // --- QUOTES ---
  getQuotes(): Quote[] {
    return this.data.quotes;
  }

  getQuoteById(id: string): Quote | undefined {
    return this.data.quotes.find(q => q.id === id);
  }

  addQuote(quoteData: Omit<Quote, 'id' | 'quoteNumber' | 'createdAt' | 'updatedAt'> & { id?: string; quoteNumber?: string }): Quote {
    const settings = this.data.settings;
    const existingSequences = this.data.quotes
      .map(quote => Number((quote.quoteNumber.match(/^COT-(\d{8})$/)?.[1] || '0')))
      .filter(sequence => Number.isFinite(sequence));
    const nextSequence = existingSequences.length > 0 ? Math.max(...existingSequences) + 1 : 1;
    const quoteNumber = `COT-${String(nextSequence).padStart(8, '0')}`;
    settings.quotePrefix = 'COT-';
    settings.nextQuoteNumber = nextSequence + 1;
    const now = new Date().toISOString();

    const newQuote: Quote = {
      ...quoteData,
      id: quoteData.id || `quote-${Date.now()}`,
      quoteNumber,
      createdAt: now,
      updatedAt: now
    };

    this.data.quotes.unshift(newQuote);
    this.saveToFile();
    return newQuote;
  }

  updateQuote(id: string, updates: Partial<Quote>): Quote | null {
    const index = this.data.quotes.findIndex(q => q.id === id);
    if (index === -1) return null;

    this.data.quotes[index] = {
      ...this.data.quotes[index],
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };

    this.saveToFile();
    return this.data.quotes[index];
  }

  deleteQuote(id: string): boolean {
    const index = this.data.quotes.findIndex(q => q.id === id);
    if (index === -1) return false;
    this.data.quotes.splice(index, 1);
    const config = this.getMySQLConfig();
    if (this.shouldUseMySQL()) {
      void (async () => {
        try {
          const { deleteQuoteFromMySQL } = await import('./mysql');
          await deleteQuoteFromMySQL(config, id);
        } catch {
          // no-op: the local store has already been updated
        }
      })();
    }
    this.saveToFile();
    return true;
  }

  convertQuoteToSale(quoteId: string, options?: {
    voucherType?: 'FACTURA' | 'BOLETA' | 'TICKET';
    paymentMethod?: 'CASH' | 'CARD' | 'TRANSFER' | 'CREDIT' | 'MIXED';
    sellerName?: string;
  }): { sale: Sale; quote: Quote } | null {
    const quote = this.getQuoteById(quoteId);
    if (!quote) return null;

    // Create sale items from quote items
    const saleItems = quote.items.map(item => ({
      ...item,
      id: `sitem-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    }));

    const sale = this.addSale({
      voucherType: options?.voucherType || 'FACTURA',
      customerId: quote.customerId,
      customerName: quote.customerName,
      customerTaxId: quote.customerTaxId,
      customerEmail: quote.customerEmail,
      customerPhone: quote.customerPhone,
      customerAddress: quote.customerAddress,
      date: new Date().toISOString().split('T')[0],
      items: saleItems,
      subtotal: quote.subtotal,
      discountTotal: quote.discountTotal,
      taxTotal: quote.taxTotal,
      total: quote.total,
      currency: quote.currency,
      paymentMethod: options?.paymentMethod || 'TRANSFER',
      paymentStatus: 'PAID',
      paidAmount: quote.total,
      dueAmount: 0,
      quoteIdReference: quote.id,
      quoteNumberReference: quote.quoteNumber,
      notes: `Venta generada a partir de Cotización ${quote.quoteNumber}. ${quote.notes || ''}`,
      sellerName: options?.sellerName || quote.createdBy || 'Ventas',
      status: 'COMPLETED'
    });

    // Update Quote status
    quote.status = 'CONVERTED';
    quote.convertedToSaleId = sale.id;
    quote.convertedToSaleNumber = sale.saleNumber;
    quote.updatedAt = new Date().toISOString();

    this.saveToFile();
    return { sale, quote };
  }

  // --- SALES ---
  getSales(): Sale[] {
    return this.data.sales;
  }

  getSaleById(id: string): Sale | undefined {
    return this.data.sales.find(s => s.id === id);
  }

  addSale(saleData: Omit<Sale, 'id' | 'saleNumber' | 'createdAt' | 'updatedAt'> & { id?: string; saleNumber?: string }): Sale {
    const settings = this.data.settings;
    const existingSequences = this.data.sales
      .map(sale => Number((sale.saleNumber.match(/^FAC-(\d{8})$/)?.[1] || '0')))
      .filter(sequence => Number.isFinite(sequence));
    const nextNum = existingSequences.length > 0 ? Math.max(...existingSequences) + 1 : 1;
    const saleNumber = `FAC-${String(nextNum).padStart(8, '0')}`;
    settings.invoicePrefix = 'FAC-';
    settings.nextInvoiceNumber = nextNum + 1;
    const now = new Date().toISOString();

    const newSale: Sale = {
      ...saleData,
      id: saleData.id || `sale-${Date.now()}`,
      saleNumber,
      createdAt: now,
      updatedAt: now
    };

    this.data.sales.unshift(newSale);

    // Atomically decrement stock for each item and record Kardex
    for (const item of newSale.items) {
      const product = this.getProductById(item.productId);
      if (product) {
        const prevStock = product.stock;
        const newStock = Math.max(0, prevStock - item.quantity);
        
        product.stock = newStock;
        if (newStock <= 0) {
          product.status = 'out_of_stock';
        } else if (newStock <= product.minStock) {
          product.status = 'low_stock';
        }
        product.updatedAt = now;

        this.addInventoryMovement({
          productId: product.id,
          productSku: product.sku,
          productName: product.name,
          type: 'OUT_SALE',
          quantity: item.quantity,
          previousStock: prevStock,
          newStock: newStock,
          unitCost: product.costPrice,
          referenceId: newSale.saleNumber,
          notes: `Venta comprobante ${newSale.saleNumber} - Cliente: ${newSale.customerName}`,
          createdBy: newSale.sellerName || 'Cajero / Ventas'
        });
      }
    }

    this.saveToFile();
    return newSale;
  }

  cancelSale(saleId: string, reason: string): Sale | null {
    const sale = this.getSaleById(saleId);
    if (!sale || sale.status === 'CANCELLED') return null;

    sale.status = 'CANCELLED';
    sale.cancellationReason = reason;
    sale.cancelledAt = new Date().toISOString();
    sale.updatedAt = new Date().toISOString();

    // Revert inventory
    for (const item of sale.items) {
      const product = this.getProductById(item.productId);
      if (product) {
        const prevStock = product.stock;
        const newStock = prevStock + item.quantity;

        product.stock = newStock;
        if (newStock <= 0) {
          product.status = 'out_of_stock';
        } else if (newStock <= product.minStock) {
          product.status = 'low_stock';
        } else {
          product.status = 'in_stock';
        }
        product.updatedAt = new Date().toISOString();

        this.addInventoryMovement({
          productId: product.id,
          productSku: product.sku,
          productName: product.name,
          type: 'IN_ADJUSTMENT',
          quantity: item.quantity,
          previousStock: prevStock,
          newStock: newStock,
          unitCost: product.costPrice,
          referenceId: sale.saleNumber,
          notes: `Anulación de venta ${sale.saleNumber}. Motivo: ${reason}`,
          createdBy: 'Sistema de Reversión'
        });
      }
    }

    this.saveToFile();
    return sale;
  }

  // --- SETTINGS ---
  getSettings(): CompanySettings {
    return this.data.settings;
  }

  updateSettings(updates: Partial<CompanySettings>): CompanySettings {
    this.data.settings = { ...this.data.settings, ...updates };
    this.saveToFile();
    return this.data.settings;
  }

  // --- DASHBOARD METRICS ---
  getDashboardMetrics(): DashboardMetrics {
    const todayStr = new Date().toISOString().split('T')[0];
    const completedSales = this.data.sales.filter(s => s.status === 'COMPLETED');

    const totalSalesToday = completedSales
      .filter(s => s.date === todayStr || s.createdAt.startsWith(todayStr))
      .reduce((sum, s) => sum + s.total, 0);

    const totalSalesMonth = completedSales.reduce((sum, s) => sum + s.total, 0);
    const totalSalesCountMonth = completedSales.length;

    // Gross profit = sum((unitPrice - costPrice) * qty)
    let totalGrossProfitMonth = 0;
    for (const sale of completedSales) {
      for (const item of sale.items) {
        const profitPerUnit = (item.unitPrice * (1 - (item.discountPercent || 0) / 100)) - (item.costPrice || 0);
        totalGrossProfitMonth += profitPerUnit * item.quantity;
      }
    }

    const totalInventoryValuation = this.data.products.reduce(
      (sum, p) => sum + (p.stock * p.costPrice), 
      0
    );

    const totalProductsCount = this.data.products.length;
    const lowStockCount = this.data.products.filter(p => p.status === 'low_stock').length;
    const outOfStockCount = this.data.products.filter(p => p.status === 'out_of_stock').length;

    const pendingQuotesCount = this.data.quotes.filter(q => q.status === 'SENT' || q.status === 'DRAFT' || q.status === 'APPROVED').length;
    const approvedQuotesCount = this.data.quotes.filter(q => q.status === 'CONVERTED' || q.status === 'APPROVED').length;
    const totalQuotesCount = this.data.quotes.length;
    const quoteConversionRate = totalQuotesCount > 0 
      ? Math.round((approvedQuotesCount / totalQuotesCount) * 100) 
      : 0;

    // Sales by day (last 7 days)
    const salesByDayMap: Record<string, { total: number; count: number }> = {};
    const daysArr: { date: string; label: string; total: number; count: number }[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
      salesByDayMap[dateKey] = { total: 0, count: 0 };
      daysArr.push({ date: dateKey, label: dayName, total: 0, count: 0 });
    }

    for (const sale of completedSales) {
      const saleDate = sale.date || sale.createdAt.split('T')[0];
      if (salesByDayMap[saleDate] !== undefined) {
        salesByDayMap[saleDate].total += sale.total;
        salesByDayMap[saleDate].count += 1;
      }
    }

    const salesByDay = daysArr.map(d => ({
      ...d,
      total: Math.round((salesByDayMap[d.date]?.total || 0) * 100) / 100,
      count: salesByDayMap[d.date]?.count || 0
    }));

    // Top selling products
    const productSalesMap: Record<string, { id: string; name: string; sku: string; soldQuantity: number; revenue: number }> = {};
    for (const sale of completedSales) {
      for (const item of sale.items) {
        if (!productSalesMap[item.productId]) {
          productSalesMap[item.productId] = {
            id: item.productId,
            name: item.name,
            sku: item.sku,
            soldQuantity: 0,
            revenue: 0
          };
        }
        productSalesMap[item.productId].soldQuantity += item.quantity;
        productSalesMap[item.productId].revenue += item.total;
      }
    }

    const topSellingProducts = Object.values(productSalesMap)
      .sort((a, b) => b.soldQuantity - a.soldQuantity)
      .slice(0, 5);

    return {
      totalSalesToday,
      totalSalesMonth,
      totalSalesCountMonth,
      totalGrossProfitMonth: Math.round(totalGrossProfitMonth * 100) / 100,
      totalInventoryValuation: Math.round(totalInventoryValuation * 100) / 100,
      totalProductsCount,
      lowStockCount,
      outOfStockCount,
      pendingQuotesCount,
      approvedQuotesCount,
      quoteConversionRate,
      salesByDay,
      topSellingProducts,
      recentSales: this.data.sales.slice(0, 5),
      recentQuotes: this.data.quotes.slice(0, 5)
    };
  }

  // --- USERS & AUTHENTICATION ---
  getUsers(): User[] {
    return this.data.users.map(u => {
      const { password, ...safeUser } = u;
      return safeUser as User;
    });
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  getUserByUsernameOrEmail(identifier: string): User | undefined {
    const clean = identifier.trim().toLowerCase();
    return this.data.users.find(u => 
      u.username.toLowerCase() === clean || 
      u.email.toLowerCase() === clean
    );
  }

  authenticateUser(identifier: string, passwordAttempt: string): { user?: User; error?: string } {
    const user = this.getUserByUsernameOrEmail(identifier);
    if (!user) {
      return { error: 'Usuario o correo no encontrado' };
    }

    if (user.status === 'inactive') {
      return { error: 'Este usuario se encuentra inactivo. Contacte al administrador.' };
    }

    if (user.password && user.password !== passwordAttempt) {
      return { error: 'Contraseña incorrecta' };
    }

    // Update lastLogin
    user.lastLogin = new Date().toISOString();
    this.saveToFile();

    const { password, ...safeUser } = user;
    return { user: safeUser as User };
  }

  addUser(userData: Omit<User, 'id' | 'createdAt'> & { id?: string }): User {
    const id = userData.id || `usr-${Date.now()}`;
    const now = new Date().toISOString();

    const roleLabels: Record<string, string> = {
      admin: 'Administrador',
      collaborator: 'Ejecutivo Comercial',
      warehouse: 'Jefe de Almacén',
      cashier: 'Caja & Facturación'
    };

    const newUser: User = {
      ...userData,
      id,
      roleLabel: userData.roleLabel || roleLabels[userData.role] || 'Colaborador',
      status: userData.status || 'active',
      avatarColor: userData.avatarColor || (userData.role === 'admin' ? 'indigo' : 'emerald'),
      permissions: userData.permissions || {
        canViewDashboard: true,
        canManageInventory: userData.role === 'admin' || userData.role === 'warehouse',
        canViewCosts: userData.role === 'admin',
        canManageQuotes: userData.role !== 'warehouse',
        canManageSales: userData.role !== 'warehouse',
        canManageContacts: true,
        canManageSettings: userData.role === 'admin',
        canManageUsers: userData.role === 'admin',
        canDeleteRecords: userData.role === 'admin'
      },
      createdAt: now
    };

    this.data.users.push(newUser);
    this.saveToFile();

    const { password, ...safeUser } = newUser;
    return safeUser as User;
  }

  updateUser(id: string, updates: Partial<User>): User | null {
    const index = this.data.users.findIndex(u => u.id === id);
    if (index === -1) return null;

    const existing = this.data.users[index];
    this.data.users[index] = {
      ...existing,
      ...updates,
      id: existing.id,
      createdAt: existing.createdAt
    };

    this.saveToFile();
    const { password, ...safeUser } = this.data.users[index];
    return safeUser as User;
  }

  deleteUser(id: string): boolean {
    const initialLen = this.data.users.length;
    // Don't delete the last admin
    const target = this.data.users.find(u => u.id === id);
    if (target?.role === 'admin') {
      const adminCount = this.data.users.filter(u => u.role === 'admin').length;
      if (adminCount <= 1) {
        return false;
      }
    }

    this.data.users = this.data.users.filter(u => u.id !== id);
    if (this.data.users.length !== initialLen) {
      this.saveToFile();
      return true;
    }
    return false;
  }

  // --- MYSQL CONFIGURATION ---
  getMySQLConfig(): MySQLConfig {
    if (!this.data.mysqlConfig) {
      this.data.mysqlConfig = { ...defaultMySQLConfig };
    } else {
      this.data.mysqlConfig = {
        ...defaultMySQLConfig,
        ...this.data.mysqlConfig
      };
    }

    if (this.data.mysqlConfig.autoSync === undefined) {
      this.data.mysqlConfig.autoSync = true;
    }

    return this.data.mysqlConfig;
  }

  updateMySQLConfig(updates: Partial<MySQLConfig>): MySQLConfig {
    const current = this.getMySQLConfig();
    this.data.mysqlConfig = {
      ...current,
      ...updates,
      autoSync: updates.autoSync ?? current.autoSync ?? true
    };
    this.saveToFile();
    return this.data.mysqlConfig;
  }

  // --- SYSTEM BACKUP / RESET ---
  exportDatabase(): DatabaseSchema {
    return this.data;
  }

  importDatabase(schema: DatabaseSchema): boolean {
    if (!schema || !Array.isArray(schema.products)) return false;
    this.data = schema;
    this.saveToFile();
    return true;
  }

  resetDemoData(): DatabaseSchema {
    this.data = this.getDefaultSchema();
    this.saveToFile();
    return this.data;
  }
}

export const db = new DataStore();
