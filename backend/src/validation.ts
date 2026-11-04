import type { Request, Response, NextFunction } from 'express';
import { z, type ZodTypeAny } from 'zod';

/**
 * OWASP A05/A08: validación estricta de entradas en el servidor.
 * Cada esquema define una lista blanca de campos (z.object descarta las claves desconocidas),
 * tipos, rangos y longitudes máximas. Los campos que el servidor controla (id, createdAt,
 * status calculado, numeraciones, hashes) nunca se aceptan desde el cliente.
 */

const text = (max: number) => z.string().trim().max(max);
const requiredText = (max: number) => text(max).min(1, 'Campo obligatorio');
const optionalText = (max: number) => text(max).optional();
const money = z.coerce.number().finite().min(0).max(1_000_000_000);
const quantity = z.coerce.number().int().min(0).max(10_000_000);
const percent = z.coerce.number().finite().min(0).max(100);
const isoDate = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha esperado: AAAA-MM-DD');
const optionalEmail = z.union([z.literal(''), z.string().trim().toLowerCase().email().max(254)]).optional();

// Solo rutas locales (/assets/...), http(s) o imágenes embebidas: evita esquemas como javascript:
const imageUrl = z.string().trim().max(2048).refine(
  (value) => value === '' || /^(\/(?!\/)|https?:\/\/|data:image\/(png|jpe?g|gif|webp);base64,)/i.test(value),
  'URL de imagen no permitida'
);

export const userRoleSchema = z.enum(['admin', 'collaborator', 'cashier', 'warehouse']);
const movementTypeSchema = z.enum(['IN_PURCHASE', 'IN_ADJUSTMENT', 'OUT_SALE', 'OUT_ADJUSTMENT', 'OUT_DAMAGE', 'OUT_RETURN']);
const quoteStatusSchema = z.enum(['DRAFT', 'SENT', 'APPROVED', 'REJECTED', 'EXPIRED', 'CONVERTED']);
const voucherTypeSchema = z.enum(['FACTURA', 'BOLETA', 'TICKET']);
const paymentMethodSchema = z.enum(['CASH', 'CARD', 'TRANSFER', 'CREDIT', 'MIXED']);

export const permissionsSchema = z.object({
  canViewDashboard: z.boolean(),
  canManageInventory: z.boolean(),
  canViewCosts: z.boolean(),
  canManageQuotes: z.boolean(),
  canManageSales: z.boolean(),
  canManageContacts: z.boolean(),
  canManageSettings: z.boolean(),
  canManageUsers: z.boolean(),
  canDeleteRecords: z.boolean(),
}).strict();

// --- AUTH ---
export const loginSchema = z.object({
  username: requiredText(254),
  password: z.string().max(128).default(''),
});

// --- PRODUCTS ---
const productFields = {
  name: requiredText(200),
  sku: optionalText(60),
  barcode: optionalText(60),
  description: optionalText(2000),
  category: requiredText(100),
  brand: optionalText(100),
  costPrice: money,
  sellingPrice: money,
  taxRate: percent.optional(),
  stock: quantity,
  minStock: quantity.optional(),
  maxStock: quantity.optional(),
  unit: optionalText(20),
  location: optionalText(100),
  supplierId: optionalText(100),
  supplierName: optionalText(200),
  imageUrl: imageUrl.optional(),
};
export const productCreateSchema = z.object(productFields);
export const productUpdateSchema = z.object(productFields).partial();

export const adjustStockSchema = z.object({
  productId: requiredText(100),
  type: movementTypeSchema,
  quantity: z.coerce.number().int().min(1).max(10_000_000),
  notes: optionalText(500),
});

// --- CATEGORIES / CONTACTS ---
export const categoryCreateSchema = z.object({
  name: requiredText(100),
  description: optionalText(500),
  color: z.string().trim().regex(/^[#a-zA-Z0-9-]{0,30}$/, 'Color no válido').optional(),
});

const contactFields = {
  name: requiredText(200),
  taxId: requiredText(20),
  email: optionalEmail,
  phone: optionalText(30),
  address: optionalText(300),
  contactPerson: optionalText(200),
  notes: optionalText(1000),
};
export const supplierCreateSchema = z.object({
  ...contactFields,
  category: optionalText(100),
  paymentTerms: optionalText(100),
});
export const supplierUpdateSchema = supplierCreateSchema.partial();
export const customerCreateSchema = z.object({
  ...contactFields,
  city: optionalText(100),
  status: optionalText(30),
  creditLimit: money.optional(),
  paymentTerms: optionalText(100),
});
export const customerUpdateSchema = customerCreateSchema.partial();

// --- QUOTES / SALES ---
// Precios, costos y totales se recalculan en el servidor desde el catálogo (ver pricing.ts)
const lineItemSchema = z.object({
  productId: requiredText(100),
  quantity: z.coerce.number().int().min(1).max(100_000),
  discountPercent: percent.default(0),
});
const lineItems = z.array(lineItemSchema).min(1, 'Debe incluir al menos un producto').max(200);

const customerSnapshot = {
  customerId: optionalText(100),
  customerName: requiredText(200),
  customerTaxId: optionalText(20),
  customerEmail: optionalEmail,
  customerPhone: optionalText(30),
  customerAddress: optionalText(300),
};

export const quoteCreateSchema = z.object({
  ...customerSnapshot,
  date: isoDate.optional(),
  expiryDate: isoDate.optional(),
  items: lineItems,
  currency: optionalText(10),
  paymentTerms: optionalText(200),
  notes: optionalText(2000),
  termsAndConditions: optionalText(4000),
});
export const quoteUpdateSchema = quoteCreateSchema.partial().extend({
  status: quoteStatusSchema.optional(),
});
export const convertQuoteSchema = z.object({
  voucherType: voucherTypeSchema.optional(),
  paymentMethod: paymentMethodSchema.optional(),
});

export const saleCreateSchema = z.object({
  ...customerSnapshot,
  voucherType: voucherTypeSchema.default('FACTURA'),
  date: isoDate.optional(),
  items: lineItems,
  currency: optionalText(10),
  paymentMethod: paymentMethodSchema.default('CASH'),
  paidAmount: money.optional(),
  quoteIdReference: optionalText(100),
  quoteNumberReference: optionalText(30),
  notes: optionalText(2000),
});
export const saleCancelSchema = z.object({
  reason: requiredText(500),
});

// --- SETTINGS ---
export const settingsUpdateSchema = z.object({
  companyName: requiredText(200),
  taxId: optionalText(20),
  phone: optionalText(30),
  email: optionalEmail,
  address: optionalText(300),
  cityCountry: optionalText(100),
  website: optionalText(200),
  currencySymbol: optionalText(10),
  currencyCode: optionalText(10),
  currencyName: optionalText(50),
  defaultTaxRate: percent,
  quoteTermsDefault: optionalText(4000),
  salesNotesDefault: optionalText(4000),
  invoiceFooterNotes: optionalText(4000),
}).partial();

// --- USERS ---
const avatarColor = z.string().trim().regex(/^[a-z]{1,20}$/, 'Color no válido').optional();
export const userCreateSchema = z.object({
  username: requiredText(50).toLowerCase().regex(/^[a-z0-9._-]+$/, 'Usuario: solo letras, números, punto, guion y guion bajo'),
  name: requiredText(120),
  email: z.string().trim().toLowerCase().email().max(254),
  role: userRoleSchema.default('collaborator'),
  password: z.string().max(128),
  status: z.enum(['active', 'inactive']).default('active'),
  permissions: permissionsSchema.optional(),
  avatarColor,
});
export const userUpdateSchema = z.object({
  name: requiredText(120),
  email: z.string().trim().toLowerCase().email().max(254),
  role: userRoleSchema,
  roleLabel: optionalText(60),
  avatarColor,
  status: z.enum(['active', 'inactive']),
  permissions: permissionsSchema,
  password: z.string().max(128),
}).partial();

// --- RESTAURACIÓN DE RESPALDO ---
const recordWithId = z.object({ id: requiredText(100) }).passthrough();
const backupUserSchema = z.object({
  id: requiredText(100),
  username: requiredText(50),
  name: requiredText(120),
  email: requiredText(254),
  role: userRoleSchema,
  roleLabel: text(60),
  status: z.enum(['active', 'inactive']),
  permissions: permissionsSchema,
  password: z.string().max(256).optional(),
  createdAt: text(40),
}).passthrough();

export const backupSchema = z.object({
  products: z.array(recordWithId.extend({ sku: text(60), name: text(200), stock: z.number(), costPrice: z.number(), sellingPrice: z.number() })),
  categories: z.array(recordWithId),
  suppliers: z.array(recordWithId),
  customers: z.array(recordWithId),
  inventoryMovements: z.array(recordWithId),
  quotes: z.array(recordWithId.extend({ quoteNumber: text(30), items: z.array(z.object({}).passthrough()) })),
  sales: z.array(recordWithId.extend({ saleNumber: text(30), items: z.array(z.object({}).passthrough()) })),
  settings: z.object({ companyName: text(200) }).passthrough(),
  users: z.array(backupUserSchema).min(1),
  lastUpdated: text(40).optional(),
}).refine(
  (backup) => backup.users.some((user) => user.role === 'admin' && user.status === 'active'),
  { message: 'El respaldo debe contener al menos un administrador activo', path: ['users'] }
);

/**
 * Middleware que valida req.body contra el esquema y lo reemplaza por la versión depurada.
 */
export function validateBody(schema: ZodTypeAny) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const issue = result.error.issues[0];
      const field = issue?.path.join('.') || 'body';
      res.status(400).json({ success: false, error: `Dato inválido en "${field}": ${issue?.message}` });
      return;
    }
    req.body = result.data;
    next();
  };
}
