import React, { useState, useEffect } from 'react';
import { 
  Product, 
  Quote, 
  Sale, 
  Customer, 
  Supplier, 
  Category, 
  InventoryMovement, 
  CompanySettings, 
  DashboardStats,
  MovementType,
  QuoteStatus,
  User
} from './types';
import { api } from './lib/api';

import { Sidebar, TopBar } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { InventoryView } from './components/InventoryView';
import { KardexView } from './components/KardexView';
import { QuotesView } from './components/QuotesView';
import { SalesView } from './components/SalesView';
import { CustomersSuppliersView } from './components/CustomersSuppliersView';
import { ReportsSettingsView } from './components/ReportsSettingsView';
import { LoginView } from './components/LoginView';
import { UsersManagementModal } from './components/UsersManagementModal';
import { DatabaseExplorerModal } from './components/DatabaseExplorerModal';

type ActiveTab = 'dashboard' | 'inventory' | 'kardex' | 'quotes' | 'sales' | 'contacts' | 'settings';

export default function App() {
  // Authentication & Session State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('nexus_auth_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isUsersModalOpen, setIsUsersModalOpen] = useState(false);
  const [isDbModalOpen, setIsDbModalOpen] = useState(false);

  // Navigation State
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    try {
      const savedTab = sessionStorage.getItem('phantom_active_tab');
      return savedTab as ActiveTab || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Theme State (Dark / Light)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('phantom_theme');
      return (saved === 'light' || saved === 'dark') ? saved : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('phantom_theme', theme);
      if (theme === 'light') {
        document.documentElement.classList.add('theme-light');
      } else {
        document.documentElement.classList.remove('theme-light');
      }
    } catch {
      // localStorage may be unavailable
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  useEffect(() => {
    try {
      sessionStorage.setItem('phantom_active_tab', activeTab);
    } catch {
      // Session storage may be unavailable in restricted browser contexts.
    }
  }, [activeTab]);

  // Application Domain State
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [settings, setSettings] = useState<CompanySettings | null>(null);

  // Filter for Kardex by Product
  const [kardexProductFilter, setKardexProductFilter] = useState<Product | null>(null);

  // Modals
  const [isCreateQuoteModalOpen, setIsCreateQuoteModalOpen] = useState(false);
  const [isPosModalOpen, setIsPosModalOpen] = useState(false);

  // Status & Notification
  const [isLoading, setIsLoading] = useState(true);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Load all initial data from REST API
  const fetchAllData = async () => {
    try {
      setIsLoading(true);
      const [
        dashStats,
        prodsData,
        quotesData,
        salesData,
        custsData,
        suppsData,
        catsData,
        movsData,
        settingsData
      ] = await Promise.all([
        api.getDashboardStats(),
        api.getProducts(),
        api.getQuotes(),
        api.getSales(),
        api.getCustomers(),
        api.getSuppliers(),
        api.getCategories(),
        api.getKardex(),
        api.getSettings()
      ]);

      setStats(dashStats);
      setProducts(prodsData);
      setQuotes(quotesData);
      setSales(salesData);
      setCustomers(custsData);
      setSuppliers(suppsData);
      setCategories(catsData);
      setMovements(movsData);
      setSettings(settingsData);
    } catch (err: any) {
      console.error('Error loading initial data:', err);
      showToast(err.message || 'Error al conectar con la API RESTful', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Check current session on mount
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem('nexus_auth_token');
      if (token) {
        try {
          const user = await api.getMe();
          setCurrentUser(user);
          localStorage.setItem('nexus_auth_user', JSON.stringify(user));
          fetchAllData();
          return;
        } catch {
          // invalid or expired token
          localStorage.removeItem('nexus_auth_token');
          localStorage.removeItem('nexus_auth_user');
          setCurrentUser(null);
        }
      }
      // If we don't have user, try to load settings for company branding in login view
      try {
        const settingsData = await api.getSettings();
        setSettings(settingsData);
      } catch {}
      setIsLoading(false);
    };

    checkSession();
  }, []);

  const handleLoginSuccess = (user: User, _token: string) => {
    setCurrentUser(user);
    showToast(`¡Bienvenido(a), ${user.name}!`);
    fetchAllData();
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch {}
    localStorage.removeItem('nexus_auth_token');
    localStorage.removeItem('nexus_auth_user');
    setCurrentUser(null);
    showToast('Sesión finalizada correctamente.');
  };

  // Handlers for Products
  const handleAddProduct = async (productData: Partial<Product>) => {
    try {
      const newProd = await api.createProduct(productData);
      setProducts([newProd, ...products]);
      showToast(`Producto "${newProd.name}" registrado correctamente.`);
      // Refresh stats & kardex
      const [newStats, newMovs] = await Promise.all([api.getDashboardStats(), api.getKardex()]);
      setStats(newStats);
      setMovements(newMovs);
    } catch (err: any) {
      showToast(err.message || 'Error al registrar producto', 'error');
    }
  };

  const handleUpdateProduct = async (id: string, productData: Partial<Product>) => {
    try {
      const updated = await api.updateProduct(id, productData);
      setProducts(products.map(p => p.id === id ? updated : p));
      showToast(`Producto "${updated.name}" actualizado.`);
      const newStats = await api.getDashboardStats();
      setStats(newStats);
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar producto', 'error');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await api.deleteProduct(id);
      setProducts(products.filter(p => p.id !== id));
      showToast('Producto eliminado del catálogo.');
      const newStats = await api.getDashboardStats();
      setStats(newStats);
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar producto', 'error');
    }
  };

  const handleAdjustStock = async (data: { productId: string; type: MovementType; quantity: number; notes?: string; createdBy?: string }) => {
    try {
      const result = await api.adjustStock(data);
      setProducts(products.map(p => p.id === result.product.id ? result.product : p));
      setMovements([result.movement, ...movements]);
      showToast(`Existencias ajustadas (${result.movement.quantity} unidades).`);
      const newStats = await api.getDashboardStats();
      setStats(newStats);
    } catch (err: any) {
      showToast(err.message || 'Error al ajustar existencias', 'error');
    }
  };

  // Handlers for Quotes
  const handleCreateQuote = async (quoteData: Partial<Quote>) => {
    try {
      const newQuote = await api.createQuote(quoteData);
      setQuotes([newQuote, ...quotes]);
      showToast(`Cotización ${newQuote.quoteNumber} emitida con éxito.`);
      const newStats = await api.getDashboardStats();
      setStats(newStats);
    } catch (err: any) {
      showToast(err.message || 'Error al crear cotización', 'error');
    }
  };

  const handleUpdateQuote = async (id: string, quoteData: Partial<Quote>) => {
    try {
      const updated = await api.updateQuote(id, quoteData);
      setQuotes(quotes.map(q => q.id === id ? updated : q));
      showToast(`Cotización ${updated.quoteNumber} actualizada.`);
      const newStats = await api.getDashboardStats();
      setStats(newStats);
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar cotización', 'error');
    }
  };

  const handleDeleteQuote = async (id: string) => {
    try {
      await api.deleteQuote(id);
      setQuotes(quotes.filter(q => q.id !== id));
      showToast('Cotización eliminada.');
      const newStats = await api.getDashboardStats();
      setStats(newStats);
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar cotización', 'error');
    }
  };

  const handleConvertToSale = async (quoteId: string, options?: { voucherType?: string; paymentMethod?: string; sellerName?: string }) => {
    try {
      const result = await api.convertQuoteToSale(quoteId, options);
      setQuotes(quotes.map(q => q.id === result.quote.id ? result.quote : q));
      setSales([result.sale, ...sales]);
      // Refetch products and kardex because stock was decremented
      const [newProds, newMovs, newStats] = await Promise.all([
        api.getProducts(),
        api.getKardex(),
        api.getDashboardStats()
      ]);
      setProducts(newProds);
      setMovements(newMovs);
      setStats(newStats);
      showToast(`¡Cotización convertida en ${result.sale.voucherType} ${result.sale.saleNumber}! Stock descontado en Kardex.`);
    } catch (err: any) {
      showToast(err.message || 'Error al convertir cotización a venta', 'error');
    }
  };

  // Handlers for Sales
  const handleCreateSale = async (saleData: Partial<Sale>) => {
    try {
      const newSale = await api.createSale(saleData);
      setSales([newSale, ...sales]);
      // Refetch products and kardex
      const [newProds, newMovs, newStats] = await Promise.all([
        api.getProducts(),
        api.getKardex(),
        api.getDashboardStats()
      ]);
      setProducts(newProds);
      setMovements(newMovs);
      setStats(newStats);
      showToast(`Comprobante de venta ${newSale.saleNumber} generado y registrado en caja.`);
    } catch (err: any) {
      showToast(err.message || 'Error al registrar venta', 'error');
    }
  };

  const handleCancelSale = async (id: string, reason: string) => {
    try {
      const cancelledSale = await api.cancelSale(id, reason);
      setSales(sales.map(s => s.id === id ? cancelledSale : s));
      const [newProds, newMovs, newStats] = await Promise.all([
        api.getProducts(),
        api.getKardex(),
        api.getDashboardStats()
      ]);
      setProducts(newProds);
      setMovements(newMovs);
      setStats(newStats);
      showToast(`Venta ${cancelledSale.saleNumber} anulada. Mercadería devuelta a stock.`);
    } catch (err: any) {
      showToast(err.message || 'Error al anular venta', 'error');
    }
  };

  // Handlers for Customers & Suppliers
  const handleAddCustomer = async (c: Partial<Customer>) => {
    try {
      const newCust = await api.createCustomer(c);
      setCustomers([newCust, ...customers]);
      showToast(`Cliente "${newCust.name}" registrado.`);
      const newStats = await api.getDashboardStats();
      setStats(newStats);
    } catch (err: any) {
      showToast(err.message || 'Error al crear cliente', 'error');
    }
  };

  const handleUpdateCustomer = async (id: string, c: Partial<Customer>) => {
    try {
      const updated = await api.updateCustomer(id, c);
      setCustomers(customers.map(cust => cust.id === id ? updated : cust));
      showToast(`Cliente "${updated.name}" modificado.`);
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar cliente', 'error');
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    try {
      await api.deleteCustomer(id);
      setCustomers(customers.filter(c => c.id !== id));
      showToast('Cliente eliminado.');
      const newStats = await api.getDashboardStats();
      setStats(newStats);
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar cliente', 'error');
    }
  };

  const handleAddSupplier = async (s: Partial<Supplier>) => {
    try {
      const newSupp = await api.createSupplier(s);
      setSuppliers([newSupp, ...suppliers]);
      showToast(`Proveedor "${newSupp.name}" registrado.`);
    } catch (err: any) {
      showToast(err.message || 'Error al crear proveedor', 'error');
    }
  };

  const handleUpdateSupplier = async (id: string, s: Partial<Supplier>) => {
    try {
      const updated = await api.updateSupplier(id, s);
      setSuppliers(suppliers.map(supp => supp.id === id ? updated : supp));
      showToast(`Proveedor "${updated.name}" actualizado.`);
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar proveedor', 'error');
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    try {
      await api.deleteSupplier(id);
      setSuppliers(suppliers.filter(s => s.id !== id));
      showToast('Proveedor eliminado.');
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar proveedor', 'error');
    }
  };

  // Handlers for Settings
  const handleUpdateSettings = async (newSettings: Partial<CompanySettings>) => {
    try {
      const updated = await api.updateSettings(newSettings);
      setSettings(updated);
      showToast('Configuración empresarial guardada.');
    } catch (err: any) {
      showToast(err.message || 'Error al guardar configuración', 'error');
    }
  };

  // Helper to open Kardex filtered by product
  const handleOpenKardex = (prod?: Product) => {
    if (prod) {
      setKardexProductFilter(prod);
    } else {
      setKardexProductFilter(null);
    }
    setActiveTab('kardex');
  };

  const lowStockCount = products.filter(p => p.status === 'low_stock').length;
  const outOfStockCount = products.filter(p => p.status === 'out_of_stock').length;
  const pendingQuotesCount = quotes.filter(q => q.status === 'DRAFT' || q.status === 'SENT').length;

  const effectiveStats: DashboardStats = stats || {
    totalProductsCount: products.length,
    totalInventoryValuation: products.reduce((acc, p) => acc + (p.stock * p.sellingPrice), 0),
    totalInventoryCost: products.reduce((acc, p) => acc + (p.stock * p.costPrice), 0),
    lowStockCount,
    outOfStockCount,
    totalSalesToday: 0,
    totalSalesMonth: sales.reduce((acc, s) => acc + (s.total || 0), 0),
    totalSalesCountMonth: sales.length,
    totalGrossProfitMonth: 0,
    quoteConversionRate: quotes.length > 0 ? Math.round((quotes.filter(q => q.status === 'CONVERTED' || q.status === 'APPROVED').length / quotes.length) * 100) : 0,
    approvedQuotesCount: quotes.filter(q => q.status === 'CONVERTED' || q.status === 'APPROVED').length,
    pendingQuotesCount,
    salesByDay: [
      { date: '', label: 'Lun', total: 0, count: 0 },
      { date: '', label: 'Mar', total: 0, count: 0 },
      { date: '', label: 'Mié', total: 0, count: 0 },
      { date: '', label: 'Jue', total: 0, count: 0 },
      { date: '', label: 'Vie', total: 0, count: 0 },
      { date: '', label: 'Sáb', total: 0, count: 0 },
      { date: '', label: 'Dom', total: 0, count: 0 }
    ],
    topSellingProducts: [],
    recentSales: sales.slice(0, 5),
    recentQuotes: quotes.slice(0, 5)
  };

  if (!currentUser) {
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        companyName={settings?.companyName}
      />
    );
  }

  return (
    <div className="app-shell h-screen w-screen bg-[#0E0E0E] flex overflow-hidden font-sans antialiased">
      
      {/* Toast Notification Banner */}
      {notification && (
        <div className={`fixed bottom-5 right-5 z-50 px-4 py-3 rounded border text-xs font-semibold flex items-center space-x-2 transition-all transform duration-200 animate-in fade-in slide-in-from-bottom-5 ${
          notification.type === 'success' 
            ? 'bg-[#141414] text-[#A7F3D0] border-[#10B981]' 
            : 'bg-[#410006] text-[#FFDAD8] border-[#C8102E]'
        }`}>
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Sidebar (Left Column) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        companyName={settings?.companyName}
        lowStockCount={lowStockCount}
        outOfStockCount={outOfStockCount}
        pendingQuotesCount={pendingQuotesCount}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenUsersModal={() => setIsUsersModalOpen(true)}
        theme={theme}
        toggleTheme={toggleTheme}
      />

      {/* Main Content Workspace (Right Column) */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Top Navbar */}
        <TopBar
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          onOpenNewQuoteModal={() => {
            setActiveTab('quotes');
            setIsCreateQuoteModalOpen(true);
          }}
          onOpenPosModal={() => {
            setActiveTab('sales');
            setIsPosModalOpen(true);
          }}
          lowStockCount={lowStockCount}
          outOfStockCount={outOfStockCount}
          onNavigateToInventory={() => setActiveTab('inventory')}
          globalSearch={globalSearch}
          onGlobalSearchChange={setGlobalSearch}
          currentUser={currentUser}
          onLogout={handleLogout}
          onOpenUsersModal={() => setIsUsersModalOpen(true)}
          theme={theme}
          toggleTheme={toggleTheme}
        />

        {/* Scrollable View Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          
          {activeTab === 'dashboard' && (
            <DashboardView
              metrics={effectiveStats}
              settings={settings}
              products={products}
              currentUser={currentUser}
              onNavigate={(tab) => {
                setActiveTab(tab as ActiveTab);
              }}
              onOpenNewQuote={() => {
                setActiveTab('quotes');
                setIsCreateQuoteModalOpen(true);
              }}
              onOpenNewSale={() => {
                setActiveTab('sales');
                setIsPosModalOpen(true);
              }}
              onOpenNewProduct={() => {
                setActiveTab('inventory');
              }}
              onOpenStockAdjust={() => {
                setActiveTab('inventory');
              }}
              onRefresh={fetchAllData}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'inventory' && (
            <InventoryView
              products={products}
              categories={categories}
              suppliers={suppliers}
              settings={settings}
              onAddProduct={handleAddProduct}
              onUpdateProduct={handleUpdateProduct}
              onDeleteProduct={handleDeleteProduct}
              onAdjustStock={handleAdjustStock}
              onOpenKardex={handleOpenKardex}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'kardex' && (
            <KardexView
              movements={movements}
              products={products}
              settings={settings}
              selectedProductFilter={kardexProductFilter}
              onClearProductFilter={() => setKardexProductFilter(null)}
            />
          )}

          {activeTab === 'quotes' && (
            <QuotesView
              quotes={quotes}
              customers={customers}
              products={products}
              settings={settings}
              currentUser={currentUser}
              onCreateQuote={handleCreateQuote}
              onUpdateQuote={handleUpdateQuote}
              onDeleteQuote={handleDeleteQuote}
              onConvertToSale={handleConvertToSale}
              isCreateModalOpen={isCreateQuoteModalOpen}
              setIsCreateModalOpen={setIsCreateQuoteModalOpen}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'sales' && (
            <SalesView
              sales={sales}
              products={products}
              customers={customers}
              categories={categories}
              settings={settings}
              onCreateSale={handleCreateSale}
              onCancelSale={handleCancelSale}
              isPosModalOpen={isPosModalOpen}
              setIsPosModalOpen={setIsPosModalOpen}
              isLoading={isLoading}
            />
          )}

          {activeTab === 'contacts' && (
            <CustomersSuppliersView
              customers={customers}
              suppliers={suppliers}
              settings={settings}
              onAddCustomer={handleAddCustomer}
              onUpdateCustomer={handleUpdateCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onAddSupplier={handleAddSupplier}
              onUpdateSupplier={handleUpdateSupplier}
              onDeleteSupplier={handleDeleteSupplier}
            />
          )}

          {activeTab === 'settings' && (
            <ReportsSettingsView
              settings={settings}
              products={products}
              sales={sales}
              quotes={quotes}
              onUpdateSettings={handleUpdateSettings}
              onRefreshAllData={fetchAllData}
              onOpenUsersModal={() => setIsUsersModalOpen(true)}
              onOpenDatabaseModal={() => setIsDbModalOpen(true)}
            />
          )}

        </main>
      </div>

      {/* User Management & Collaborators Modal */}
      <UsersManagementModal
        isOpen={isUsersModalOpen}
        onClose={() => setIsUsersModalOpen(false)}
        currentUser={currentUser}
      />

      {/* Database Explorer Modal */}
      <DatabaseExplorerModal
        isOpen={isDbModalOpen}
        onClose={() => setIsDbModalOpen(false)}
      />

    </div>
  );
}
