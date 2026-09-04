export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface Product {
  id: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  category: string;
  brand?: string;
  costPrice: number;
  sellingPrice: number;
  taxRate: number; // percentage e.g. 18 for 18% or 16 for 16%
  stock: number;
  minStock: number;
  maxStock?: number;
  unit: string; // 'UND', 'KG', 'MTS', 'CJ', 'PAQ', 'LTS'
  location?: string;
  supplierId?: string;
  supplierName?: string;
  imageUrl?: string;
  status: StockStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  itemCount?: number;
}

export interface Supplier {
  id: string;
  name: string;
  taxId: string; // RUC / NIT / RFC / CIF
  email: string;
  phone: string;
  address?: string;
  contactPerson?: string;
  category?: string;
  paymentTerms?: string;
  notes?: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  taxId: string; // DNI / RUC / NIT / RFC
  email: string;
  phone: string;
  address?: string;
  city?: string;
  creditLimit?: number;
  paymentTerms?: string;
  notes?: string;
  createdAt: string;
  totalPurchases?: number;
}

export type MovementType = 
  | 'IN_PURCHASE' 
  | 'IN_ADJUSTMENT' 
  | 'OUT_SALE' 
  | 'OUT_ADJUSTMENT' 
  | 'OUT_DAMAGE' 
  | 'OUT_RETURN';

export interface InventoryMovement {
  id: string;
  productId: string;
  productSku: string;
  productName: string;
  type: MovementType;
  quantity: number; // always positive in the record, sign handled by type
  previousStock: number;
  newStock: number;
  unitCost: number;
  referenceId?: string; // Sale number or Purchase order
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface QuoteItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  unit: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  discountPercent: number;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
}

export type QuoteStatus = 
  | 'DRAFT' 
  | 'SENT' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'EXPIRED' 
  | 'CONVERTED';

export interface Quote {
  id: string;
  quoteNumber: string; // e.g. "COT-2025-001"
  customerId: string;
  customerName: string;
  customerTaxId: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  date: string;
  expiryDate: string;
  status: QuoteStatus;
  items: QuoteItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  currency: string; // '$', 'S/.', '€', 'MXN', 'COP'
  paymentTerms: string;
  notes?: string;
  termsAndConditions?: string;
  convertedToSaleId?: string;
  convertedToSaleNumber?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  id: string;
  productId: string;
  sku: string;
  name: string;
  unit: string;
  unitPrice: number;
  costPrice: number;
  quantity: number;
  discountPercent: number;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
}

export type VoucherType = 'FACTURA' | 'BOLETA' | 'TICKET';
export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'CREDIT' | 'MIXED';
export type PaymentStatus = 'PAID' | 'PENDING' | 'PARTIAL';
export type SaleStatus = 'COMPLETED' | 'CANCELLED';

export interface Sale {
  id: string;
  saleNumber: string; // e.g. "FAC-2025-001"
  voucherType: VoucherType;
  customerId: string;
  customerName: string;
  customerTaxId: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  date: string;
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  currency: string;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paidAmount: number;
  dueAmount: number;
  quoteIdReference?: string;
  quoteNumberReference?: string;
  notes?: string;
  sellerName: string;
  status: SaleStatus;
  cancellationReason?: string;
  cancelledAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySettings {
  companyName: string;
  taxId: string;
  phone: string;
  email: string;
  address: string;
  cityCountry?: string;
  website?: string;
  currencySymbol: string;
  currencyCode?: string;
  currencyName?: string;
  defaultTaxRate: number; // e.g. 18 or 16
  quotePrefix?: string;
  invoicePrefix?: string;
  ticketPrefix?: string;
  nextQuoteNumber?: number;
  nextInvoiceNumber?: number;
  nextTicketNumber?: number;
  quoteTermsDefault?: string;
  salesNotesDefault?: string;
  invoiceFooterNotes?: string;
}

export interface DashboardMetrics {
  totalSalesToday: number;
  totalSalesMonth: number;
  totalSalesCountMonth: number;
  totalGrossProfitMonth: number;
  totalInventoryValuation: number;
  totalProductsCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  pendingQuotesCount: number;
  approvedQuotesCount: number;
  quoteConversionRate: number;
  salesByDay: { date: string; label: string; total: number; count: number }[];
  topSellingProducts: { id: string; name: string; sku: string; soldQuantity: number; revenue: number }[];
  recentSales: Sale[];
  recentQuotes: Quote[];
}

export type DashboardStats = DashboardMetrics;

export type UserRole = 'admin' | 'collaborator' | 'cashier' | 'warehouse';

export interface UserPermissions {
  canViewDashboard: boolean;
  canManageInventory: boolean;
  canViewCosts: boolean; // only admin by default
  canManageQuotes: boolean;
  canManageSales: boolean;
  canManageContacts: boolean;
  canManageSettings: boolean; // only admin
  canManageUsers: boolean; // only admin
  canDeleteRecords: boolean; // only admin
}

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  avatarColor?: string;
  password?: string;
  status: 'active' | 'inactive';
  permissions: UserPermissions;
  createdAt: string;
  lastLogin?: string;
}

export interface LoginResponse {
  success: boolean;
  token: string;
  user: User;
  message?: string;
}

export interface MySQLConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password?: string;
  ssl: boolean;
  charset: string;
  tablePrefix?: string;
  autoSync: boolean;
  connected?: boolean;
  lastTested?: string;
}

export interface MySQLTestResult {
  success: boolean;
  message: string;
  serverVersion?: string;
  tablesFound?: string[];
  latencyMs?: number;
  details?: string;
}

