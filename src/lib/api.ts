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
  LoginResponse,
  MySQLConfig,
  MySQLTestResult
} from '../types';

const API_BASE = '/api';

function getAuthToken(): string | null {
  try {
    return localStorage.getItem('nexus_auth_token');
  } catch {
    return null;
  }
}

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...((options?.headers as Record<string, string>) || {})
  };

  const response = await fetch(`${API_BASE}${url}`, {
    headers,
    ...options
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Error en la petición: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  return json.data !== undefined ? json.data : json;
}

export const api = {
  // Health
  checkHealth: () => fetchJson<{ status: string; message: string }>('/health'),

  // Dashboard
  getDashboardStats: () => fetchJson<DashboardMetrics>('/dashboard/stats'),

  // Products
  getProducts: (params?: { category?: string; search?: string; status?: string }) => {
    const query = new URLSearchParams();
    if (params?.category) query.append('category', params.category);
    if (params?.search) query.append('search', params.search);
    if (params?.status) query.append('status', params.status);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchJson<Product[]>(`/products${qs}`);
  },

  getProductById: (id: string) => fetchJson<Product>(`/products/${id}`),

  createProduct: (product: Partial<Product>) => 
    fetchJson<Product>('/products', {
      method: 'POST',
      body: JSON.stringify(product)
    }),

  updateProduct: (id: string, product: Partial<Product>) => 
    fetchJson<Product>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(product)
    }),

  deleteProduct: (id: string) => 
    fetchJson<{ success: boolean }>(`/products/${id}`, {
      method: 'DELETE'
    }),

  adjustStock: (data: { productId: string; type: MovementType; quantity: number; notes?: string; createdBy?: string }) =>
    fetchJson<{ product: Product; movement: InventoryMovement }>('/products/adjust-stock', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Categories
  getCategories: () => fetchJson<Category[]>('/categories'),
  createCategory: (data: Partial<Category>) => 
    fetchJson<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  deleteCategory: (id: string) => 
    fetchJson<{ success: boolean }>(`/categories/${id}`, {
      method: 'DELETE'
    }),

  // Suppliers
  getSuppliers: () => fetchJson<Supplier[]>('/suppliers'),
  createSupplier: (data: Partial<Supplier>) => 
    fetchJson<Supplier>('/suppliers', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateSupplier: (id: string, data: Partial<Supplier>) => 
    fetchJson<Supplier>(`/suppliers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteSupplier: (id: string) => 
    fetchJson<{ success: boolean }>(`/suppliers/${id}`, {
      method: 'DELETE'
    }),

  // Customers
  getCustomers: () => fetchJson<Customer[]>('/customers'),
  createCustomer: (data: Partial<Customer>) => 
    fetchJson<Customer>('/customers', {
      method: 'POST',
      body: JSON.stringify(data)
    }),
  updateCustomer: (id: string, data: Partial<Customer>) => 
    fetchJson<Customer>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
  deleteCustomer: (id: string) => 
    fetchJson<{ success: boolean }>(`/customers/${id}`, {
      method: 'DELETE'
    }),

  // Inventory Movements
  getMovements: (productId?: string) => {
    const qs = productId ? `?productId=${productId}` : '';
    return fetchJson<InventoryMovement[]>(`/inventory/movements${qs}`);
  },
  getKardex: (productId?: string) => {
    const qs = productId ? `?productId=${productId}` : '';
    return fetchJson<InventoryMovement[]>(`/inventory/movements${qs}`);
  },

  // Quotes
  getQuotes: (params?: { status?: string; search?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.search) query.append('search', params.search);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchJson<Quote[]>(`/quotes${qs}`);
  },

  getQuoteById: (id: string) => fetchJson<Quote>(`/quotes/${id}`),

  createQuote: (quote: Partial<Quote>) => 
    fetchJson<Quote>('/quotes', {
      method: 'POST',
      body: JSON.stringify(quote)
    }),

  updateQuote: (id: string, quote: Partial<Quote>) => 
    fetchJson<Quote>(`/quotes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(quote)
    }),

  deleteQuote: (id: string) => 
    fetchJson<{ success: boolean }>(`/quotes/${id}`, {
      method: 'DELETE'
    }),

  convertQuoteToSale: (quoteId: string, options?: { voucherType?: string; paymentMethod?: string; sellerName?: string }) =>
    fetchJson<{ sale: Sale; quote: Quote }>(`/quotes/${quoteId}/convert-to-sale`, {
      method: 'POST',
      body: JSON.stringify(options || {})
    }),

  // Sales
  getSales: (params?: { status?: string; voucherType?: string; search?: string; startDate?: string; endDate?: string }) => {
    const query = new URLSearchParams();
    if (params?.status) query.append('status', params.status);
    if (params?.voucherType) query.append('voucherType', params.voucherType);
    if (params?.search) query.append('search', params.search);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return fetchJson<Sale[]>(`/sales${qs}`);
  },

  getSaleById: (id: string) => fetchJson<Sale>(`/sales/${id}`),

  createSale: (sale: Partial<Sale>) => 
    fetchJson<Sale>('/sales', {
      method: 'POST',
      body: JSON.stringify(sale)
    }),

  cancelSale: (id: string, reason: string) => 
    fetchJson<Sale>(`/sales/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason })
    }),

  // Settings
  getSettings: () => fetchJson<CompanySettings>('/settings'),
  updateSettings: (settings: Partial<CompanySettings>) => 
    fetchJson<CompanySettings>('/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    }),

  // Authentication & Users
  login: (credentials: { username: string; password?: string }) => 
    fetchJson<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    }),

  getCurrentUser: () => fetchJson<{ user: User }>('/auth/me'),
  getMe: async (): Promise<User> => {
    const res = await fetchJson<{ user: User }>('/auth/me');
    return res.user;
  },

  logout: () => fetchJson<{ success: boolean; message: string }>('/auth/logout', {
    method: 'POST'
  }),

  getUsers: () => fetchJson<User[]>('/users'),

  createUser: (user: Partial<User>) => 
    fetchJson<User>('/users', {
      method: 'POST',
      body: JSON.stringify(user)
    }),

  updateUser: (id: string, user: Partial<User>) => 
    fetchJson<User>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(user)
    }),

  deleteUser: (id: string) => 
    fetchJson<{ success: boolean; message: string }>(`/users/${id}`, {
      method: 'DELETE'
    }),

  // MySQL Database Connection & Synchronization
  getMySQLConfig: () => fetchJson<{ success: boolean; config: MySQLConfig }>('/database/mysql-config'),
  saveMySQLConfig: (config: Partial<MySQLConfig>) => 
    fetchJson<{ success: boolean; config: MySQLConfig; message: string }>('/database/mysql-config', {
      method: 'POST',
      body: JSON.stringify(config)
    }),
  testMySQLConnection: (config: MySQLConfig) => 
    fetchJson<MySQLTestResult>('/database/mysql-test', {
      method: 'POST',
      body: JSON.stringify(config)
    }),
  exportMySQLScriptUrl: () => `${API_BASE}/database/mysql-script`,

  // System
  exportBackupUrl: () => `${API_BASE}/system/export`,
  exportSqlUrl: () => `${API_BASE}/system/sql-export`,
  getRawDatabase: () => fetchJson<{ success: boolean; data: any }>('/system/raw-db'),
  importBackup: (backupData: any) => 
    fetchJson<{ success: boolean; message: string }>('/system/import', {
      method: 'POST',
      body: JSON.stringify(backupData)
    }),
  resetDemoData: () => 
    fetchJson<{ success: boolean; message: string }>('/system/reset-demo', {
      method: 'POST'
    }),
  resetDatabase: () => 
    fetchJson<{ success: boolean; message: string }>('/system/reset-demo', {
      method: 'POST'
    })
};
