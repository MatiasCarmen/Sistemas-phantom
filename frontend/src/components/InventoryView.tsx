import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  ArrowUpDown, 
  Package, 
  AlertTriangle, 
  Edit, 
  Trash2, 
  SlidersHorizontal, 
  Download, 
  Upload, 
  Check, 
  X, 
  History, 
  Tag, 
  Layers, 
  Grid, 
  List, 
  DollarSign, 
  Percent, 
  Barcode
} from 'lucide-react';
import { Product, Category, Supplier, StockStatus, MovementType, CompanySettings, Store, StoreStock } from '../types';
import { api } from '../lib/api';

const createFormCode = (prefix: string, usedCodes: Set<string>): string => {
  let code = '';
  do {
    const randomPart = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
    code = `${prefix}${randomPart}`;
  } while (usedCodes.has(code));
  return code;
};

const createFormBarcode = (usedCodes: Set<string>): string => {
  let code = '';
  do {
    code = `775${Math.floor(Math.random() * 1000000).toString().padStart(6, '0')}`;
  } while (usedCodes.has(code));
  return code;
};
import { formatAmount } from '../lib/formatters';

interface InventoryViewProps {
  products: Product[];
  categories: Category[];
  suppliers: Supplier[];
  settings: CompanySettings | null;
  onAddProduct: (product: Partial<Product>) => Promise<void>;
  onUpdateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  onDeleteProduct: (id: string) => Promise<void>;
  onAdjustStock: (data: { productId: string; type: MovementType; quantity: number; locationId?: string; newQuantity?: number; notes?: string; createdBy?: string }) => Promise<void>;
  onOpenKardex: (product?: Product) => void;
  onStockTransferred?: () => Promise<void>;
  isLoading: boolean;
}

export const InventoryView: React.FC<InventoryViewProps> = ({
  products,
  categories,
  suppliers,
  settings,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
  onAdjustStock,
  onOpenKardex,
  onStockTransferred,
  isLoading
}) => {
  const currency = settings?.currencySymbol || 'S/.';

  // Filters & View State
  const [searchTerm, setSearchTerm] = useState('');
  const [storeSearch, setStoreSearch] = useState('');
  const [storeListFilter, setStoreListFilter] = useState('ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [productQuickFilter, setProductQuickFilter] = useState<'ALL' | 'ALERTS' | 'STORE_OUT'>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sortField, setSortField] = useState<'name' | 'stock' | 'sellingPrice' | 'sku'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [inventorySection, setInventorySection] = useState<'catalog' | 'stores'>('catalog');
  const [stores, setStores] = useState<Store[]>([]);
  const mainWarehouses = stores.filter(store => store.type === 'MAIN_WAREHOUSE');
  const selectedMainWarehouse = mainWarehouses[0]?.name || 'Tienda principal';
  const [storeStock, setStoreStock] = useState<StoreStock[]>([]);
  const [stockTransfers, setStockTransfers] = useState<any[]>([]);
  const [transferProduct, setTransferProduct] = useState('');
  const [transferStore, setTransferStore] = useState('');
  const [transferQuantity, setTransferQuantity] = useState(1);
  const [transferError, setTransferError] = useState('');
  const [transferSuccess, setTransferSuccess] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [isTransferPanelOpen, setIsTransferPanelOpen] = useState(false);
  const [transferQuantities, setTransferQuantities] = useState<Record<string, number>>({});
  const [transportSupplierId, setTransportSupplierId] = useState('');
  const [stockMatrixProduct, setStockMatrixProduct] = useState<Product | null>(null);
  const [receivingGuide, setReceivingGuide] = useState<string | null>(null);
  const [showNoPendingTransfers, setShowNoPendingTransfers] = useState(false);

  const openStoreInventory = (storeId: string) => {
    setSelectedCategory('ALL');
    setStoreSearch('');
    setSelectedStoreId(storeId);
  };

  const closeStoreInventory = () => {
    setSelectedCategory('ALL');
    setStoreSearch('');
    setSelectedStoreId(null);
    setIsTransferPanelOpen(false);
  };

  const changeInventorySection = (section: 'catalog' | 'stores') => {
    if (section !== inventorySection) {
      closeStoreInventory();
      setTransferSuccess('');
    }
    setInventorySection(section);
  };

  const loadStockLocations = async () => {
    try {
      const [loadedStores, stockData] = await Promise.all([api.getStores(), api.getStoreStock()]);
      setStores(loadedStores);
      setStoreStock(stockData.storeStock);
      setStockTransfers(stockData.transfers || []);
    } catch (error) {
      console.error('No se pudo cargar el stock por tiendas', error);
    }
  };

  useEffect(() => { loadStockLocations(); }, []);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);

  // Form state for Product Modal
  const [formData, setFormData] = useState({
    sku: '',
    barcode: '',
    name: '',
    description: '',
    category: categories[0]?.name || 'General',
    brand: '',
    costPrice: 0,
    sellingPrice: 0,
    taxRate: settings?.defaultTaxRate || 18,
    stock: 10,
    minStock: 5,
    maxStock: 100,
    unit: 'UND',
    location: 'Tienda principal',
    supplierId: suppliers[0]?.id || '',
    supplierName: suppliers[0]?.name || '',
    imageUrl: ''
  });

  // Form state for Adjust Stock Modal
  const [adjustData, setAdjustData] = useState<{
    type: MovementType;
    quantity: number;
    notes: string;
    responsible: string;
    locationId: string;
    newQuantity: number;
  }>({
    type: 'IN_ADJUSTMENT',
    quantity: 1,
    notes: '',
    responsible: 'Administrador',
    locationId: 'main-warehouse',
    newQuantity: 1
  });

  // Open Add Product
  const handleOpenAdd = () => {
    setEditingProduct(null);
    const usedSkus = new Set(products.map(product => product.sku));
    const usedBarcodes = new Set(products.map(product => product.barcode).filter(Boolean) as string[]);
    setFormData({
      sku: createFormCode('', usedSkus),
      barcode: createFormBarcode(usedBarcodes),
      name: '',
      description: '',
      category: categories[0]?.name || 'General',
      brand: '',
      costPrice: 50,
      sellingPrice: 75,
      taxRate: settings?.defaultTaxRate || 18,
      stock: 10,
      minStock: 5,
      maxStock: 100,
      unit: 'UND',
      location: 'Tienda principal',
      supplierId: suppliers[0]?.id || '',
      supplierName: suppliers[0]?.name || '',
      imageUrl: ''
    });
    setIsProductModalOpen(true);
  };

  // Open Edit Product
  const handleOpenEdit = (prod: Product) => {
    setEditingProduct(prod);
    setFormData({
      sku: prod.sku,
      barcode: prod.barcode || '',
      name: prod.name,
      description: prod.description || '',
      category: prod.category,
      brand: prod.brand || '',
      costPrice: prod.costPrice,
      sellingPrice: prod.sellingPrice,
      taxRate: prod.taxRate,
      stock: prod.stock,
      minStock: prod.minStock,
      maxStock: prod.maxStock || 100,
      unit: prod.unit,
      location: selectedMainWarehouse,
      supplierId: prod.supplierId || '',
      supplierName: prod.supplierName || '',
      imageUrl: prod.imageUrl || ''
    });
    setIsProductModalOpen(true);
  };

  const handleProductImageChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      alert('Seleccione una imagen JPG, PNG, WEBP o GIF.');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no puede superar los 5 MB.');
      event.target.value = '';
      return;
    }

    setIsUploadingImage(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const result = await api.uploadProductImage(dataUrl, file.name);
      setFormData(current => ({ ...current, imageUrl: result.imageUrl }));
    } catch (error: any) {
      alert(error?.message || 'No se pudo subir la imagen');
    } finally {
      setIsUploadingImage(false);
      event.target.value = '';
    }
  };

  // Submit Product Form
  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.sku.trim()) return;
    const normalizedLocation = selectedMainWarehouse;

    if (editingProduct) {
      await onUpdateProduct(editingProduct.id, {
        ...formData,
        location: normalizedLocation,
        costPrice: Number(formData.costPrice),
        sellingPrice: Number(formData.sellingPrice),
        stock: Number(formData.stock),
        minStock: Number(formData.minStock),
        maxStock: Number(formData.maxStock),
        taxRate: Number(formData.taxRate)
      });
    } else {
      await onAddProduct({
        ...formData,
        location: normalizedLocation,
        costPrice: Number(formData.costPrice),
        sellingPrice: Number(formData.sellingPrice),
        stock: Number(formData.stock),
        minStock: Number(formData.minStock),
        maxStock: Number(formData.maxStock),
        taxRate: Number(formData.taxRate)
      });
    }
    setIsProductModalOpen(false);
  };

  // Open Stock Adjust Modal
  const handleOpenAdjust = (prod: Product) => {
    setAdjustingProduct(prod);
    setAdjustData({
      type: 'IN_ADJUSTMENT',
      quantity: prod.stock,
      notes: '',
      responsible: 'Administrador',
      locationId: 'main-warehouse',
      newQuantity: prod.stock
    });
    setIsAdjustModalOpen(true);
  };

  // Submit Stock Adjust
  const handleSubmitAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct || adjustData.newQuantity < 0 || !adjustData.locationId) return;

    await onAdjustStock({
      productId: adjustingProduct.id,
      type: adjustData.type,
      quantity: Number(adjustData.newQuantity),
      locationId: adjustData.locationId,
      newQuantity: Number(adjustData.newQuantity),
      notes: adjustData.notes || 'Ajuste manual de existencias',
      createdBy: adjustData.responsible
    });

    const stockData = await api.getStoreStock();
    setStoreStock(stockData.storeStock);
    setIsAdjustModalOpen(false);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = ['SKU', 'Codigo_Barras', 'Nombre', 'Categoria', 'Marca', 'Precio_Costo', 'Precio_Venta', 'Stock_Actual', 'Stock_Minimo', 'Unidad', 'Ubicacion', 'Estado'];
    const rows = filteredProducts.map(p => [
      `"${p.sku}"`,
      `"${p.barcode || ''}"`,
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category}"`,
      `"${p.brand || ''}"`,
      p.costPrice,
      p.sellingPrice,
      p.stock,
      p.minStock,
      `"${p.unit}"`,
      `"${p.location || ''}"`,
      `"${p.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `inventario_nexus_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const normalizeSearchText = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  const matchesAllSearchTerms = (value: string, query: string) => {
    const normalizedQuery = normalizeSearchText(query);
    return normalizedQuery === '' || normalizedQuery.split(/\s+/).every(term => normalizeSearchText(value).includes(term));
  };

  const activeStores = stores.filter(store => store.status === 'ACTIVE' && store.type === 'STORE');
  const brands = Array.from(new Set(products.map(product => product.brand).filter((brand): brand is string => Boolean(brand)))).sort((a, b) => a.localeCompare(b));
  const productHasStockAlert = (product: Product) => product.stock <= product.minStock || activeStores.some(store => {
    const quantity = storeStock.find(item => item.storeId === store.id && item.productId === product.id)?.quantity || 0;
    return quantity <= product.minStock;
  });
  const productHasStoreStockout = (product: Product) => activeStores.some(store =>
    (storeStock.find(item => item.storeId === store.id && item.productId === product.id)?.quantity || 0) <= 0
  );

  // Filtering & Sorting
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'ALL' || p.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesBrand = selectedBrand === 'ALL' || (p.brand || '').toLowerCase() === selectedBrand.toLowerCase();
    const matchesStatus = selectedStatus === 'ALL' || p.status === selectedStatus;
    const matchesQuickFilter = productQuickFilter === 'ALL'
      || (productQuickFilter === 'ALERTS' && productHasStockAlert(p))
      || (productQuickFilter === 'STORE_OUT' && productHasStoreStockout(p));
    const productSearchText = [p.name, p.sku, p.barcode, p.brand, p.category, p.location]
      .filter(Boolean)
      .join(' ');
    const matchesSearch = matchesAllSearchTerms(productSearchText, searchTerm);
    return matchesCategory && matchesBrand && matchesStatus && matchesQuickFilter && matchesSearch;
  }).sort((a, b) => {
    let comp = 0;
    if (sortField === 'name') comp = a.name.localeCompare(b.name);
    if (sortField === 'sku') comp = a.sku.localeCompare(b.sku);
    if (sortField === 'stock') comp = a.stock - b.stock;
    if (sortField === 'sellingPrice') comp = a.sellingPrice - b.sellingPrice;
    return sortOrder === 'asc' ? comp : -comp;
  });

  const handleConfirmReceipt = async (guideNumber: string, storeId: string) => {
    await api.confirmTransferReceipt(guideNumber, storeId);
    await loadStockLocations();
    setReceivingGuide(null);
  };

  const handleTransfer = async () => {
    setTransferError('');
    setTransferSuccess('');
    const items = Object.entries(transferQuantities).filter(([, quantity]) => quantity > 0).map(([productId, quantity]) => ({ productId, quantity }));
    if (!transferStore || items.length === 0) {
      setTransferError('Seleccione una tienda y indique al menos una cantidad.');
      return;
    }
    const transportSupplier = suppliers.find(supplier => supplier.id === transportSupplierId);
    try {
      await api.transferStock({ items, toStoreId: transferStore, transportSupplierId, transportSupplierName: transportSupplier?.name });
      await loadStockLocations();
      await onStockTransferred?.();
      const destinationStore = stores.find(store => store.id === transferStore);
      setSelectedStoreId(transferStore);
      setTransferSuccess(`Transferencia exitosa hacia ${destinationStore?.name || 'la tienda destino'}.`);
      setIsTransferPanelOpen(false);
      setTransferStore('');
      setTransferQuantities({});
      setTransportSupplierId('');
      window.setTimeout(() => setTransferSuccess(''), 4000);
    } catch (error: any) {
      setTransferError(error.message || 'No se pudo realizar la transferencia');
    }
  };

  const filteredStores = stores.filter(store => {
    if (store.status !== 'ACTIVE') return false;
    if (storeListFilter !== 'ALL' && store.id !== storeListFilter) return false;
    if (storeListFilter === 'ALL' && store.type === 'MAIN_WAREHOUSE') return true;
    return matchesAllSearchTerms([store.name, store.code, store.address, store.verificationNumber].filter(Boolean).join(' '), storeSearch);
  });
  const orderedFilteredStores = [...filteredStores].sort((a, b) => {
    if (a.type === 'MAIN_WAREHOUSE' && b.type !== 'MAIN_WAREHOUSE') return -1;
    if (b.type === 'MAIN_WAREHOUSE' && a.type !== 'MAIN_WAREHOUSE') return 1;
    return a.name.localeCompare(b.name);
  });

  const getStoreQuantity = (storeId: string, productId: string) =>
    storeStock.find(item => item.storeId === storeId && item.productId === productId)?.quantity || 0;
  const totalStoreStock = (productId: string) => storeStock.filter(item => item.productId === productId).reduce((sum, item) => sum + item.quantity, 0);
  const nextTransferGuide = `TRS-${String(stockTransfers.reduce((maximum, transfer) => {
    const number = Number(transfer.guideNumber?.match(/(\d+)$/)?.[1] || 0);
    return Math.max(maximum, number);
  }, 0) + 1).padStart(8, '0')}`;

  const marginPercent = formData.sellingPrice > 0 && formData.costPrice > 0
    ? (((formData.sellingPrice - formData.costPrice) / formData.costPrice) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6 pb-12">
      {transferSuccess && (
        <div role="status" className="fixed right-6 top-6 z-[100] flex max-w-md items-center gap-3 rounded border border-[#10B981]/50 bg-[#063A2F] px-5 py-4 text-sm font-bold text-[#D1FAE5] shadow-2xl">
          <Check size={20} className="shrink-0 text-[#31D0AA]" />
          <span>{transferSuccess}</span>
          <button type="button" onClick={() => setTransferSuccess('')} className="ml-2 text-[#9CA3AF] hover:text-white" aria-label="Cerrar mensaje"><X size={16} /></button>
        </div>
      )}

      {/* Top Header & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414] p-5 rounded border border-[#2D2D2D]">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Modulo de inventario</h2>
            <span className="px-2.5 py-0.5 bg-[#1E1E1E] text-white border border-[#2D2D2D] text-xs font-bold rounded font-mono">
              {filteredProducts.length} productos
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-export-inventory-csv"
            onClick={handleExportCSV}
            className="px-3 py-2 bg-[#1E1E1E] hover:bg-[#2D2D2D] text-white border border-[#2D2D2D] rounded text-xs font-semibold transition-colors flex items-center space-x-1.5"
            title="Exportar inventario en formato CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#9CA3AF]" />
            <span>Exportar CSV</span>
          </button>

          <button
            id="btn-open-kardex-global"
            onClick={() => onOpenKardex()}
            className="px-3.5 py-2 bg-[#1E3A8A]/30 hover:bg-[#1E3A8A]/60 text-[#DBEAFE] border border-[#3B82F6]/60 rounded text-xs font-bold transition-all flex items-center space-x-1.5 shadow-xs cursor-pointer"
            title="Ver Kárdex General de Movimientos (Entradas, Salidas y Ajustes)"
          >
            <History className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Ver Kárdex General</span>
          </button>

          <button
            id="btn-add-product-main"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-[#C8102E] hover:bg-[#A80C25] text-white rounded text-xs font-bold transition-colors flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      <div className="flex gap-2 border-b border-[#2D2D2D]">
        {([
          ['catalog', 'Listado de productos'],
          ['stores', 'Tiendas']
        ] as const).map(([key, label]) => (
          <button key={key} onClick={() => changeInventorySection(key)} className={`px-4 py-2.5 text-xs font-bold border-b-2 -mb-px ${inventorySection === key ? 'text-white border-[#C8102E]' : 'text-[#9CA3AF] border-transparent hover:text-white'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Filter and Search Bar */}
      {!(inventorySection === 'stores' && selectedStoreId) && (
      <div className="bg-[#141414] p-4 rounded border border-[#2D2D2D] space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-inventory-search"
              type="text"
              value={inventorySection === 'catalog' ? searchTerm : storeSearch}
              onChange={(e) => inventorySection === 'catalog' ? setSearchTerm(e.target.value) : setStoreSearch(e.target.value)}
              placeholder={inventorySection === 'catalog'
                ? 'Buscar por nombre, SKU, código de barras o marca (ej. JBL 770)'
                : selectedStoreId
                  ? 'Buscar productos por nombre, SKU, código de barras, marca o categoría...'
                  : 'Buscar tiendas por nombre, código, dirección o N° de verificación...'}
              className="w-full pl-9 pr-4 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#C8102E] transition-colors"
            />
            {(inventorySection === 'catalog' ? searchTerm : storeSearch) && (
              <button 
                onClick={() => inventorySection === 'catalog' ? setSearchTerm('') : setStoreSearch('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {inventorySection === 'stores' && !selectedStoreId && (
            <div className="lg:w-72">
              <select
                id="select-store-list-filter"
                value={storeListFilter}
                onChange={(e) => setStoreListFilter(e.target.value)}
                className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs text-white focus:outline-none focus:border-[#C8102E]"
              >
                <option value="ALL">Todas las tiendas</option>
                {stores.filter(store => store.status === 'ACTIVE' && store.type === 'MAIN_WAREHOUSE').map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
                {stores.filter(store => store.status === 'ACTIVE' && store.type === 'STORE').map(store => (
                  <option key={store.id} value={store.id}>{store.name}</option>
                ))}
              </select>
            </div>
          )}

          {inventorySection === 'catalog' && (
          <div className="flex items-center space-x-2">
            <select
              id="select-inventory-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs text-white font-medium focus:outline-none focus:border-[#C8102E]"
            >
              <option value="ALL">Todas las Categorías</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>

            {/* View Mode Toggle */}
            <div className="flex bg-[#0E0E0E] p-1 rounded border border-[#2D2D2D] shrink-0">
              <button
                id="btn-view-table"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'table' ? 'bg-[#1E1E1E] text-white border border-[#2D2D2D]' : 'text-[#9CA3AF] hover:text-white'}`}
                title="Vista en tabla detallada"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                id="btn-view-grid"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-[#1E1E1E] text-white border border-[#2D2D2D]' : 'text-[#9CA3AF] hover:text-white'}`}
                title="Vista en cuadrícula"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>

          </div>
          )}

        </div>

        {inventorySection === 'stores' && selectedStoreId && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory('ALL')}
              className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${selectedCategory === 'ALL' ? 'bg-[#C8102E] text-white' : 'bg-[#1E1E1E] text-[#D1D5DB] hover:text-white'}`}
            >
              Todas las categorías
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.name)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${selectedCategory === category.name ? 'bg-[#C8102E] text-white' : 'bg-[#1E1E1E] text-[#D1D5DB] hover:text-white'}`}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}

        {inventorySection === 'catalog' && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setProductQuickFilter('ALL')}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${productQuickFilter === 'ALL' ? 'bg-[#C8102E] text-white' : 'bg-[#1E1E1E] text-[#D1D5DB] hover:text-white'}`}
              >
                Todos {products.length}
              </button>
              <button
                type="button"
                onClick={() => setProductQuickFilter('ALERTS')}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${productQuickFilter === 'ALERTS' ? 'bg-[#C8102E] text-white' : 'bg-[#1E1E1E] text-[#D1D5DB] hover:text-white'}`}
              >
                Con alertas {products.filter(productHasStockAlert).length}
              </button>
              <button
                type="button"
                onClick={() => setProductQuickFilter('STORE_OUT')}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${productQuickFilter === 'STORE_OUT' ? 'bg-[#C8102E] text-white' : 'bg-[#1E1E1E] text-[#D1D5DB] hover:text-white'}`}
              >
                Agotados en alguna tienda {products.filter(productHasStoreStockout).length}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                id="select-inventory-status"
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="min-w-[190px] px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs text-white font-medium focus:outline-none focus:border-[#C8102E]"
              >
                <option value="ALL">Todos los estados</option>
                <option value="in_stock">En stock</option>
                <option value="low_stock">Stock bajo</option>
                <option value="out_of_stock">Agotado</option>
              </select>
              <select
                id="select-inventory-brand"
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="min-w-[190px] px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs text-white font-medium focus:outline-none focus:border-[#C8102E]"
              >
                <option value="ALL">Todas las marcas</option>
                {brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}
              </select>
            </div>
          </>
        )}
      </div>
      )}

      {inventorySection === 'stores' && (
        <div className="space-y-5">
          {!selectedStoreId ? (
            <>
              {orderedFilteredStores.map(store => {
                const isWarehouse = store.type === 'MAIN_WAREHOUSE';
                const quantity = isWarehouse
                  ? products.reduce((sum, product) => sum + product.stock, 0)
                  : storeStock.filter(item => item.storeId === store.id).reduce((sum, item) => sum + item.quantity, 0);
                const cost = isWarehouse
                  ? products.reduce((sum, product) => sum + product.stock * product.costPrice, 0)
                  : products.reduce((sum, product) => sum + getStoreQuantity(store.id, product.id) * product.costPrice, 0);
                return (
                  <button key={store.id} onClick={() => openStoreInventory(store.id)} className="w-full text-left bg-[#141414] border border-[#2D2D2D] hover:border-[#4B5563] rounded px-5 py-4 transition-colors">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-white">{store.name}</h3>
                      {isWarehouse && <span className="px-2 py-1 bg-[#063A2F] text-[#31D0AA] border border-[#10B981]/50 rounded text-[10px] font-bold">Almacén central</span>}
                    </div>
                    {store.address && <p className="text-xs text-[#9CA3AF] mt-1">{store.address}</p>}
                    <p className="mt-1 text-[11px] font-mono text-[#60A5FA]">N° verificación {store.verificationNumber}</p>
                    <div className="mt-4 h-1.5 overflow-hidden rounded bg-[#262626]">
                      <div className="h-full bg-[#10B981]" style={{ width: `${Math.min(100, quantity > 0 ? 62 + quantity / 20 : 0)}%` }} />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs">
                      <span className="text-[#9CA3AF]">Inventario a costo <b className="text-[#D1D5DB] font-mono">{currency} {formatAmount(cost)}</b></span>
                      <span className="text-[#9CA3AF]">Unidades <b className="text-[#D1D5DB] font-mono">{quantity}</b></span>
                    </div>
                  </button>
                );
              })}
            </>
          ) : (() => {
            const store = stores.find(item => item.id === selectedStoreId);
            if (!store) return null;
            const isWarehouse = store.type === 'MAIN_WAREHOUSE';
            const locationProducts = (isWarehouse ? products : products.filter(product => getStoreQuantity(store.id, product.id) > 0)).filter(product =>
              matchesAllSearchTerms([product.name, product.sku, product.barcode, product.brand, product.category].filter(Boolean).join(' '), storeSearch) &&
              (selectedCategory === 'ALL' || product.category?.toLowerCase() === selectedCategory.toLowerCase())
            );
            const units = isWarehouse ? products.reduce((sum, product) => sum + product.stock, 0) : locationProducts.reduce((sum, product) => sum + getStoreQuantity(store.id, product.id), 0);
            const cost = locationProducts.reduce((sum, product) => sum + (isWarehouse ? product.stock : getStoreQuantity(store.id, product.id)) * product.costPrice, 0);
            const selling = locationProducts.reduce((sum, product) => sum + (isWarehouse ? product.stock : getStoreQuantity(store.id, product.id)) * product.sellingPrice, 0);
            const lowStock = locationProducts.filter(product => {
              const quantity = isWarehouse ? product.stock : getStoreQuantity(store.id, product.id);
              return quantity <= product.minStock;
            }).length;
            return (
              <div className="space-y-4">
                <button onClick={closeStoreInventory} className="text-xs text-[#9CA3AF] hover:text-white">← Volver a tiendas</button>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div><div className="flex items-center gap-3"><h3 className="text-2xl font-bold text-white">{store.name}</h3>{isWarehouse && <span className="px-2 py-1 bg-[#063A2F] text-[#31D0AA] border border-[#10B981]/50 rounded text-[10px] font-bold">Almacén central</span>}</div>{store.address && <p className="mt-1 text-xs text-[#9CA3AF]">{store.address}</p>}<p className="mt-1 text-[11px] font-mono text-[#60A5FA]">N° verificación {store.verificationNumber}</p></div>
                  <button
                    onClick={() => {
                      if (isWarehouse) {
                        setTransferStore('');
                        setIsTransferPanelOpen(true);
                      } else {
                        const pending = stockTransfers.find(transfer => transfer.toStoreId === store.id && transfer.status !== 'RECEIVED');
                        if (!pending) {
                          setShowNoPendingTransfers(true);
                          return;
                        }
                        setReceivingGuide(pending.guideNumber);
                      }
                    }}
                    className="px-4 py-2.5 bg-[#C8102E] hover:bg-[#A80C25] text-white rounded text-sm font-bold"
                  >
                    {isWarehouse ? 'Transferir a tiendas' : 'Recibir stock de la principal'}
                  </button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                  {[['SKUs', locationProducts.length], ['Unidades', units], ['Inventario a costo', `${currency} ${formatAmount(cost)}`], ['Inventario a venta', `${currency} ${formatAmount(selling)}`], ['Productos bajo mínimo', lowStock]].map(([label, value]) => <div key={String(label)} className="bg-[#141414] border border-[#2D2D2D] rounded p-4"><div className="text-lg font-mono font-bold text-white">{value}</div><div className="mt-1 text-xs text-[#9CA3AF]">{label}</div></div>)}
                </div>
                <div className="bg-[#141414] p-4 rounded border border-[#2D2D2D] space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={storeSearch}
                      onChange={(event) => setStoreSearch(event.target.value)}
                      placeholder="Buscar productos por nombre, SKU, código de barras, marca o categoría..."
                      className="w-full pl-9 pr-10 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#C8102E]"
                    />
                    {storeSearch && <button onClick={() => setStoreSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-white"><X className="w-3.5 h-3.5" /></button>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="button" onClick={() => setSelectedCategory('ALL')} className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${selectedCategory === 'ALL' ? 'bg-[#C8102E] text-white' : 'bg-[#1E1E1E] text-[#D1D5DB] hover:text-white'}`}>Todas las categorías</button>
                    {categories.map(category => <button key={category.id} type="button" onClick={() => setSelectedCategory(category.name)} className={`rounded-full px-4 py-2 text-xs font-semibold transition-colors ${selectedCategory === category.name ? 'bg-[#C8102E] text-white' : 'bg-[#1E1E1E] text-[#D1D5DB] hover:text-white'}`}>{category.name}</button>)}
                  </div>
                </div>
                {showNoPendingTransfers && (
                  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={() => setShowNoPendingTransfers(false)}>
                    <div className="w-full max-w-md rounded border border-[#3D3D3D] bg-[#161616] shadow-2xl" onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-start justify-between border-b border-[#303030] px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded bg-[#C8102E]/15 text-[#EF4444]">
                            <AlertTriangle className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-white">Recepción de stock</h3>
                            <p className="mt-0.5 text-xs text-[#9CA3AF]">Tienda sin transferencias pendientes</p>
                          </div>
                        </div>
                        <button onClick={() => setShowNoPendingTransfers(false)} className="text-[#9CA3AF] hover:text-white" aria-label="Cerrar">
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                      <div className="px-5 py-5">
                        <p className="text-sm leading-6 text-[#D1D5DB]">No hay transferencias pendientes para <span className="font-semibold text-white">{store.name}</span>.</p>
                      </div>
                      <div className="flex justify-end border-t border-[#303030] px-5 py-4">
                        <button onClick={() => setShowNoPendingTransfers(false)} className="rounded bg-[#C8102E] px-5 py-2 text-xs font-bold text-white hover:bg-[#A80C25]">Aceptar</button>
                      </div>
                    </div>
                  </div>
                )}
                {receivingGuide && (() => {
                  const receiptItems = stockTransfers.filter(transfer => transfer.guideNumber === receivingGuide && transfer.toStoreId === store.id);
                  const firstReceipt = receiptItems[0];
                  return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
                      <div className="w-full max-w-lg rounded border border-[#3D3D3D] bg-[#161616] shadow-2xl">
                        <div className="flex items-start justify-between border-b border-[#303030] px-5 py-4">
                          <div><h3 className="text-lg font-bold text-white">Confirmar recepción de stock</h3><p className="mt-1 font-mono text-xs text-[#60A5FA]">Guía {receivingGuide}</p></div>
                          <button onClick={() => setReceivingGuide(null)} className="text-[#9CA3AF] hover:text-white"><X className="h-5 w-5" /></button>
                        </div>
                        <div className="space-y-4 px-5 py-5">
                          <div className="grid grid-cols-2 gap-3 rounded border border-[#303030] bg-[#0E0E0E] p-3 text-xs"><div><span className="text-[#9CA3AF]">Origen</span><p className="mt-1 font-bold text-white">Almacén principal</p></div><div><span className="text-[#9CA3AF]">Destino</span><p className="mt-1 font-bold text-white">{store.name}</p></div></div>
                          <div className="overflow-hidden rounded border border-[#303030]"><div className="grid grid-cols-[1fr_90px] bg-[#252525] px-3 py-2 text-xs font-bold text-[#9CA3AF]"><span>Producto</span><span className="text-right">Cantidad</span></div>{receiptItems.map(transfer => { const product = products.find(item => item.id === transfer.productId); return <div key={transfer.id} className="grid grid-cols-[1fr_90px] border-t border-[#303030] px-3 py-3 text-xs"><span className="font-bold text-white">{product?.name || transfer.productId}<small className="block text-[#737373]">SKU {product?.sku || '-'}</small></span><span className="text-right font-mono font-bold text-white">{transfer.quantity}</span></div>; })}</div>
                          {firstReceipt?.transportSupplierName && <p className="text-xs text-[#9CA3AF]">Proveedor de transporte: <b className="text-white">{firstReceipt.transportSupplierName}</b></p>}
                        </div>
                        <div className="flex justify-end gap-3 border-t border-[#303030] px-5 py-4"><button onClick={() => setReceivingGuide(null)} className="rounded bg-[#252525] px-4 py-2 text-xs font-bold text-white">Cancelar</button><button onClick={() => handleConfirmReceipt(receivingGuide, store.id)} className="rounded bg-[#C8102E] px-4 py-2 text-xs font-bold text-white">Confirmar recepción</button></div>
                      </div>
                    </div>
                  );
                })()}
                {isTransferPanelOpen && (
                  <div className="fixed inset-0 z-50 flex justify-end bg-black/60">
                    <div className="flex h-full w-full max-w-md flex-col bg-[#161616] shadow-2xl">
                      <div className="border-b border-[#303030] px-8 py-6">
                        <h3 className="text-xl font-bold text-white">Transferir stock</h3>
                        <p className="mt-1 text-xs text-[#9CA3AF]">Desde el almacén principal hacia una tienda</p>
                        <p className="mt-3 font-mono text-xs font-bold text-[#60A5FA]">Guía {nextTransferGuide}</p>
                      </div>
                      <div className="flex-1 overflow-y-auto px-8 py-5 space-y-5">
                        <div>
                          <label className="mb-2 block text-sm text-white">Tienda destino</label>
                          <select value={transferStore} onChange={e => setTransferStore(e.target.value)} className="w-full rounded border border-[#C8102E] px-3 py-3 text-sm text-white bg-[#0E0E0E] focus:outline-none"><option value="">Seleccione una tienda</option>{stores.filter(item => item.type === 'STORE').map(item => <option key={item.id} value={item.id}>{item.verificationNumber} - {item.name}</option>)}</select>
                        </div>
                        <div>
                          <label className="mb-2 block text-sm text-white">Proveedor de transporte</label>
                          <select value={transportSupplierId} onChange={e => setTransportSupplierId(e.target.value)} className="w-full rounded border border-[#303030] px-3 py-3 text-sm text-white bg-[#0E0E0E] focus:outline-none"><option value="">Seleccione un proveedor</option>{suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select>
                        </div>
                        <div className="divide-y divide-[#303030]">
                          {products.map(product => {
                            const quantity = transferQuantities[product.id] || 0;
                            return (
                              <div key={product.id} className="flex items-center gap-4 py-4">
                                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-white">{product.name}</p><p className="mt-1 text-xs text-[#9CA3AF]">En principal: {product.stock} unid.</p></div>
                                <input type="number" min="0" max={product.stock} value={quantity} onChange={e => setTransferQuantities(prev => ({ ...prev, [product.id]: Math.min(product.stock, Math.max(0, Number(e.target.value) || 0)) }))} className="w-20 rounded border border-[#303030] bg-[#0E0E0E] px-2 py-2 text-right text-sm text-white" />
                              </div>
                            );
                          })}
                        </div>
                        <p className="text-sm text-[#9CA3AF]">Indica cuántas unidades enviar de cada producto.</p>
                        {transferError && <p className="text-xs text-red-400">{transferError}</p>}
                      </div>
                      <div className="flex gap-3 border-t border-[#303030] px-8 py-5">
                        <button onClick={() => setIsTransferPanelOpen(false)} className="flex-1 rounded bg-[#252525] px-4 py-3 text-sm font-bold text-white">Cancelar</button>
                        <button onClick={handleTransfer} disabled={!transferStore || !transportSupplierId || !Object.values(transferQuantities).some(quantity => quantity > 0)} className="flex-1 rounded bg-[#C8102E] px-4 py-3 text-sm font-bold text-white disabled:opacity-40">Confirmar transferencia</button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="overflow-x-auto bg-[#141414] border border-[#2D2D2D] rounded">
                  <table className="w-full text-left text-xs min-w-[760px]"><thead className="bg-[#1E1E1E] text-[#9CA3AF] uppercase"><tr><th className="p-3">Producto</th><th className="p-3">Existencia</th><th className="p-3">Valor costo</th><th className="p-3">Estado</th><th className="p-3">Acciones</th></tr></thead>
                    <tbody>{locationProducts.map(product => { const quantity = isWarehouse ? product.stock : getStoreQuantity(store.id, product.id); return <tr key={product.id} className="border-t border-[#2D2D2D]"><td className="p-3"><div className="font-bold text-white">{product.name}</div><div className="text-[#9CA3AF]">SKU {product.sku}</div></td><td className="p-3 font-mono font-bold text-white">{quantity} <span className="text-[#9CA3AF] font-normal">de mín. {product.minStock}</span></td><td className="p-3 font-mono">{currency} {formatAmount(quantity * product.costPrice)}</td><td className="p-3"><span className={`px-2 py-1 rounded border text-[10px] font-bold ${quantity <= product.minStock ? 'text-[#FBBF24] border-[#F59E0B]/50' : 'text-[#31D0AA] border-[#10B981]/50'}`}>{quantity <= product.minStock ? 'Bajo mínimo' : 'OK'}</span></td><td className="p-3"><button onClick={() => onOpenKardex(product)} className="px-2 py-1 border border-[#2563EB]/50 rounded text-[#60A5FA]">Kárdex</button></td></tr>; })}</tbody>
                  </table>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Products Content: Table or Grid */}
      {inventorySection === 'catalog' && (<>
      {filteredProducts.length === 0 ? ( 
        <div className="bg-[#141414] rounded border border-[#2D2D2D] p-12 text-center">
          <Package className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">No se encontraron productos</h3>
          <p className="text-xs text-[#9CA3AF] mt-1 max-w-sm mx-auto">
            Prueba ajustando los filtros de búsqueda o registra un nuevo producto en el catálogo.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 px-4 py-2 bg-[#C8102E] hover:bg-[#A80C25] text-white rounded text-xs font-bold inline-flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Producto</span>
          </button>
        </div>
      ) : viewMode === 'table' ? (
        
        /* Table View */
        <div className="bg-[#141414] rounded border border-[#2D2D2D] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#D1D5DB]">
              <thead className="bg-[#1E1E1E] border-b border-[#2D2D2D] text-[#9CA3AF] font-bold uppercase tracking-wider text-[10px] font-mono">
                <tr>
                  <th className="py-3.5 px-4">Producto & SKU</th>
                  <th className="py-3.5 px-4">Categoría</th>
                  <th className="py-3.5 px-4">P. Costo</th>
                  <th className="py-3.5 px-4">P. Venta</th>
                  <th className="py-3.5 px-4">Margen</th>
                  <th className="py-3.5 px-4">Existencias</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2D2D2D]">
                {filteredProducts.map(prod => {
                  const margin = prod.costPrice > 0 
                    ? (((prod.sellingPrice - prod.costPrice) / prod.costPrice) * 100).toFixed(0)
                    : '0';

                  return (
                    <tr key={prod.id} className="hover:bg-[#1E1E1E] transition-colors">
                      
                      {/* Product Name & SKU */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          {prod.imageUrl ? (
                            <img 
                              src={prod.imageUrl} 
                              alt={prod.name} 
                              className="w-10 h-10 rounded object-cover border border-[#2D2D2D] shrink-0" 
                            />
                          ) : (
                            <div className="w-10 h-10 rounded bg-[#0E0E0E] flex items-center justify-center text-[#9CA3AF] shrink-0 border border-[#2D2D2D]">
                              <Package className="w-5 h-5 text-[#9CA3AF]" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-white leading-snug">{prod.name}</p>
                            <div className="flex items-center space-x-2 text-[11px] text-[#9CA3AF] font-mono mt-0.5">
                              <span>SKU: {prod.sku}</span>
                              {prod.barcode && <span>· CB: {prod.barcode}</span>}
                              {prod.brand && <span>· {prod.brand}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-[#1E1E1E] text-white rounded border border-[#2D2D2D] font-medium text-[11px]">
                          {prod.category}
                        </span>
                        {prod.location && (
                          <p className="text-[10px] text-[#9CA3AF] mt-0.5 truncate max-w-[120px] font-mono">{prod.location}</p>
                        )}
                      </td>

                      {/* Cost Price */}
                      <td className="py-3.5 px-4 font-mono font-medium text-[#D1D5DB] whitespace-nowrap tabular-nums">
                        {currency} {formatAmount(prod.costPrice)}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 px-4 font-mono font-bold text-white whitespace-nowrap tabular-nums">
                        {currency} {formatAmount(prod.sellingPrice)}
                      </td>

                      {/* Margin */}
                      <td className="py-3.5 px-4 font-mono font-medium whitespace-nowrap tabular-nums">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold border ${
                          Number(margin) >= 30 
                            ? 'bg-[rgba(16,185,129,0.14)] text-[#A7F3D0] border-[#10B981]' 
                            : 'bg-[#1E1E1E] text-[#D1D5DB] border-[#2D2D2D]'
                        }`}>
                          +{margin}%
                        </span>
                      </td>

                      {/* Stock Level */}
                      <td
                        className="py-3.5 px-4 whitespace-nowrap cursor-pointer hover:bg-[#1E1E1E] rounded transition-colors"
                        onClick={() => setStockMatrixProduct(prod)}
                        title="Abrir matriz de stock de este producto"
                      >
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-white font-mono text-sm tabular-nums">{prod.stock + totalStoreStock(prod.id)}</span>
                          <span className="text-[10px] text-[#9CA3AF] font-medium">{prod.unit}</span>
                        </div>
                        <p className="text-[10px] text-[#9CA3AF] font-mono tabular-nums">Almacén: {prod.stock} · Tiendas: {totalStoreStock(prod.id)}</p>
                      </td>

                      {/* Status Badge - Critical differentiation rule */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {prod.status === 'out_of_stock' && (
                          <span className="px-2 py-0.5 bg-[rgba(200,16,46,0.14)] text-[#FFDAD8] border border-[#C8102E] rounded font-bold text-[10px] font-mono inline-flex items-center space-x-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-[#C8102E]" />
                            <span>Agotado</span>
                          </span>
                        )}
                        {prod.status === 'low_stock' && (
                          <span className="px-2 py-0.5 bg-[rgba(245,158,11,0.14)] text-[#FDE68A] border border-[#F59E0B] rounded font-bold text-[10px] font-mono inline-flex items-center space-x-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
                            <span>Stock Bajo</span>
                          </span>
                        )}
                        {prod.status === 'in_stock' && (
                          <span className="px-2 py-0.5 bg-[rgba(16,185,129,0.14)] text-[#A7F3D0] border border-[#10B981] rounded font-bold text-[10px] font-mono inline-flex items-center space-x-1.5">
                            <Check className="w-3.5 h-3.5 text-[#10B981]" />
                            <span>En Stock</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            id={`btn-adjust-stock-${prod.id}`}
                            onClick={() => handleOpenAdjust(prod)}
                            className="p-1.5 hover:bg-[#2D2D2D] text-[#9CA3AF] hover:text-white rounded transition-colors"
                            title="Ajustar stock (Entrada / Salida / Kardex)"
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                          </button>
                          <button
                            id={`btn-kardex-${prod.id}`}
                            onClick={() => onOpenKardex(prod)}
                            className="px-2 py-1 bg-[#1E3A8A]/30 hover:bg-[#1E3A8A]/60 text-[#DBEAFE] border border-[#3B82F6]/60 hover:border-[#3B82F6] rounded transition-all flex items-center gap-1 font-mono text-[11px] font-bold shadow-xs cursor-pointer group"
                            title="Ver Kárdex de Movimientos (Entradas, Salidas y Stock)"
                          >
                            <History className="w-3.5 h-3.5 text-[#3B82F6] group-hover:rotate-[-45deg] transition-transform" />
                            <span>Kárdex</span>
                          </button>
                          <button
                            id={`btn-edit-prod-${prod.id}`}
                            onClick={() => handleOpenEdit(prod)}
                            className="p-1.5 hover:bg-[#2D2D2D] text-[#9CA3AF] hover:text-white rounded transition-colors"
                            title="Editar producto"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            id={`btn-delete-prod-${prod.id}`}
                            onClick={() => {
                              if (confirm(`¿Eliminar definitivamente el producto "${prod.name}"?`)) {
                                onDeleteProduct(prod.id);
                              }
                            }}
                            className="p-1.5 hover:bg-[#410006]/50 text-[#9CA3AF] hover:text-[#C8102E] rounded transition-colors"
                            title="Eliminar producto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map(prod => (
            <div key={prod.id} className="bg-[#141414] rounded border border-[#2D2D2D] p-4 flex flex-col justify-between hover:border-[#474747] transition-all">
              <div>
                <div className="relative h-36 bg-[#0E0E0E] rounded overflow-hidden mb-3 border border-[#2D2D2D] flex items-center justify-center">
                  {prod.imageUrl ? (
                    <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-10 h-10 text-[#9CA3AF]" />
                  )}
                  <span className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[9px] font-bold font-mono border ${
                    prod.status === 'out_of_stock' ? 'bg-[rgba(200,16,46,0.14)] text-[#FFDAD8] border-[#C8102E]' :
                    prod.status === 'low_stock' ? 'bg-[rgba(245,158,11,0.14)] text-[#FDE68A] border-[#F59E0B]' : 'bg-[rgba(16,185,129,0.14)] text-[#A7F3D0] border-[#10B981]'
                  }`}>
                    {prod.stock} {prod.unit}
                  </span>
                </div>

                <span className="text-[10px] font-bold text-[#C8102E] uppercase tracking-wider font-mono">{prod.category}</span>
                <h4 className="text-xs font-bold text-white mt-0.5 line-clamp-2">{prod.name}</h4>
                <p className="text-[11px] font-mono text-[#9CA3AF] mt-1">SKU: {prod.sku}</p>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#2D2D2D]">
                  <div>
                    <span className="text-[10px] text-[#9CA3AF] block font-mono">Precio Venta</span>
                    <span className="text-sm font-bold text-white font-mono tabular-nums">{currency} {formatAmount(prod.sellingPrice)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-[#9CA3AF] block font-mono">Costo</span>
                    <span className="text-xs font-medium text-[#D1D5DB] font-mono tabular-nums">{currency} {formatAmount(prod.costPrice)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#2D2D2D] gap-2">
                <button
                  onClick={() => handleOpenAdjust(prod)}
                  className="flex-1 py-1.5 bg-[#1E1E1E] hover:bg-[#2D2D2D] text-white text-xs font-semibold rounded border border-[#2D2D2D] transition-colors flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#9CA3AF]" />
                  <span>Ajustar</span>
                </button>
                <button
                  onClick={() => onOpenKardex(prod)}
                  className="px-2.5 py-1.5 bg-[#1E3A8A]/30 hover:bg-[#1E3A8A]/60 text-[#DBEAFE] border border-[#3B82F6]/60 rounded text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  title="Ver Kárdex de Movimientos"
                >
                  <History className="w-3.5 h-3.5 text-[#3B82F6]" />
                  <span>Kárdex</span>
                </button>
                <button
                  onClick={() => handleOpenEdit(prod)}
                  className="p-1.5 bg-[#1E1E1E] hover:bg-[#2D2D2D] text-[#D1D5DB] hover:text-white rounded border border-[#2D2D2D] transition-colors cursor-pointer"
                  title="Editar"
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create / Edit Product */}
      </>)}

      {isProductModalOpen && (
        <div id="modal-product" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#141414] rounded border border-[#2D2D2D] shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden text-white">
            
            <div className="px-6 py-4 bg-[#0E0E0E] text-white flex items-center justify-between border-b border-[#2D2D2D]">
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-[#C8102E]" />
                <h3 className="text-base font-bold">
                  {editingProduct ? 'Editar Producto del Inventario' : 'Registrar Nuevo Producto'}
                </h3>
              </div>
              <button 
                id="btn-close-product-modal"
                onClick={() => setIsProductModalOpen(false)}
                className="text-[#9CA3AF] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1 font-mono">Código SKU *</label>
                  <input
                    id="input-prod-sku"
                    type="text"
                    required
                    value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs font-mono text-white focus:outline-none focus:border-[#C8102E]"
                    placeholder="e.g. LAP-DELL-5520"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1 font-mono">Código de Barras</label>
                  <input
                    id="input-prod-barcode"
                    type="text"
                    value={formData.barcode}
                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs font-mono text-white focus:outline-none focus:border-[#C8102E]"
                    placeholder="e.g. 7751234500101"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">Nombre Completo del Producto *</label>
                <input
                  id="input-prod-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  placeholder="e.g. Laptop Dell Latitude 5520 Core i7 16GB RAM"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">Categoría *</label>
                  <select
                    id="select-prod-category"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">Marca</label>
                  <input
                    id="input-prod-brand"
                    type="text"
                    value={formData.brand}
                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs text-white focus:outline-none focus:border-[#C8102E]"
                    placeholder="e.g. Dell, Cisco, Hikvision"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">Unidad de Medida</label>
                  <select
                    id="select-prod-unit"
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  >
                    <option value="UND">Unidades (UND)</option>
                    <option value="CJ">Caja (CJ)</option>
                    <option value="PAQ">Paquete (PAQ)</option>
                    <option value="KG">Kilogramos (KG)</option>
                    <option value="MTS">Metros (MTS)</option>
                    <option value="LTS">Litros (LTS)</option>
                  </select>
                </div>
              </div>

              {/* Pricing & Profit Margin Preview */}
              <div className="p-4 bg-[#1E1E1E] border border-[#2D2D2D] rounded space-y-3">
                <span className="text-xs font-bold text-white uppercase font-mono block">Precios & Margen de Ganancia</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#9CA3AF] mb-1 font-mono">Costo Unitario ({currency}) *</label>
                    <input
                      id="input-prod-cost"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.costPrice}
                      onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs font-mono font-bold text-white focus:border-[#C8102E]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#9CA3AF] mb-1 font-mono">Precio Venta ({currency}) *</label>
                    <input
                      id="input-prod-price"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.sellingPrice}
                      onChange={e => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs font-mono font-bold text-[#FFDAD8] focus:border-[#C8102E]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#9CA3AF] mb-1 font-mono">Margen Calculado</label>
                    <div className="px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs font-bold text-[#A7F3D0] font-mono">
                      +{marginPercent}% (${formatAmount(formData.sellingPrice - formData.costPrice)})
                    </div>
                  </div>
                </div>
              </div>

              {/* Stock and Thresholds */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1 font-mono">
                    {editingProduct ? `Stock Actual - ${selectedMainWarehouse} *` : 'Stock Actual *'}
                  </label>
                  <input
                    id="input-prod-stock"
                    type="number"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs font-mono font-bold text-white focus:border-[#C8102E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1 font-mono">Stock Mínimo (Alerta) *</label>
                  <input
                    id="input-prod-minstock"
                    type="number"
                    min="1"
                    required
                    value={formData.minStock}
                    onChange={e => setFormData({ ...formData, minStock: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs font-mono text-white focus:border-[#C8102E]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1 font-mono">Ubicación en Almacén *</label>
                  <select
                    id="input-prod-location"
                    required
                    disabled={Boolean(editingProduct)}
                    value={mainWarehouses.some(store => store.name === formData.location) ? formData.location : selectedMainWarehouse}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs text-white disabled:opacity-100 focus:border-[#C8102E]"
                  >
                    {(mainWarehouses.length ? mainWarehouses : [{ id: 'main-warehouse', name: 'Tienda principal' }]).map(store => (
                      <option key={store.id} value={store.name}>{store.name}</option>
                    ))}
                  </select>
                  <p className="mt-1 text-[10px] text-[#6B7280]">Los productos nuevos se registran únicamente en el almacén principal.</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">Descripción / Especificaciones Técnicas</label>
                <textarea
                  id="textarea-prod-desc"
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs text-white focus:border-[#C8102E]"
                  placeholder="Detalles adicionales, número de parte o compatibilidades..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">Imagen del Producto</label>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 shrink-0 rounded border border-[#2D2D2D] bg-[#0E0E0E] overflow-hidden flex items-center justify-center">
                    {formData.imageUrl ? (
                      <img src={formData.imageUrl} alt="Vista previa del producto" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-[#71717A]" />
                    )}
                  </div>
                  <label className="cursor-pointer px-4 py-2 bg-[#1E1E1E] hover:bg-[#2D2D2D] border border-[#2D2D2D] rounded text-xs font-semibold text-white flex items-center gap-2">
                    <Upload className="w-4 h-4" />
                    {isUploadingImage ? 'Subiendo...' : formData.imageUrl ? 'Cambiar imagen' : 'Subir imagen'}
                    <input
                      id="input-prod-image"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      disabled={isUploadingImage}
                      onChange={handleProductImageChange}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-[10px] text-[#71717A] mt-2">JPG, PNG, WEBP o GIF. Tamaño máximo: 5 MB.</p>
              </div>

              <div className="pt-4 border-t border-[#2D2D2D] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 bg-[#1E1E1E] hover:bg-[#2D2D2D] text-[#D1D5DB] text-xs font-semibold rounded border border-[#2D2D2D] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-save-product"
                  type="submit"
                  className="px-5 py-2 bg-[#C8102E] hover:bg-[#A80C25] text-white text-xs font-bold rounded cursor-pointer transition-colors"
                >
                  {editingProduct ? 'Guardar Cambios' : 'Registrar Producto'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Matriz de stock por producto */}
      {stockMatrixProduct && (
        <div id="modal-product-stock-matrix" className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm">
          <div className="bg-[#141414] border border-[#2D2D2D] rounded-lg shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden text-white">
            <div className="px-5 py-4 bg-[#0E0E0E] border-b border-[#2D2D2D] flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                {stockMatrixProduct.imageUrl ? (
                  <img src={stockMatrixProduct.imageUrl} alt={stockMatrixProduct.name} className="w-12 h-12 rounded object-cover border border-[#2D2D2D]" />
                ) : (
                  <div className="w-12 h-12 rounded bg-[#1E1E1E] flex items-center justify-center"><Package className="w-6 h-6 text-[#9CA3AF]" /></div>
                )}
                <div className="min-w-0">
                  <h3 className="text-sm font-bold truncate">Matriz de stock</h3>
                  <p className="text-xs text-[#9CA3AF] truncate">{stockMatrixProduct.name} · SKU {stockMatrixProduct.sku}</p>
                </div>
              </div>
              <button type="button" onClick={() => setStockMatrixProduct(null)} className="p-2 text-[#9CA3AF] hover:text-white hover:bg-[#2D2D2D] rounded" aria-label="Cerrar matriz de stock">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 overflow-auto">
              <table className="w-full min-w-[850px] text-left text-xs border-collapse">
                <thead className="bg-[#1E1E1E] text-[#9CA3AF] uppercase font-mono text-[10px]">
                  <tr>
                    <th className="p-3 border border-[#2D2D2D]">Ubicación</th>
                    <th className="p-3 border border-[#2D2D2D] text-center">Almacén principal</th>
                    {stores.filter(store => store.type === 'STORE').map(store => <th key={store.id} className="p-3 border border-[#2D2D2D] text-center">{store.name}</th>)}
                    <th className="p-3 border border-[#2D2D2D] text-center">Existencia total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border border-[#2D2D2D]">
                    <td className="p-3 bg-[#1E1E1E] font-bold text-white border border-[#2D2D2D]">{stockMatrixProduct.name}</td>
                    <td className="p-3 font-mono text-center font-bold text-white border border-[#2D2D2D]">{stockMatrixProduct.stock}</td>
                    {stores.filter(store => store.type === 'STORE').map(store => (
                      <td key={store.id} className="p-3 font-mono text-center text-white border border-[#2D2D2D]">
                        {getStoreQuantity(store.id, stockMatrixProduct.id)}
                      </td>
                    ))}
                    <td className="p-3 font-mono text-center font-bold text-[#31D0AA] border border-[#2D2D2D]">
                      {stockMatrixProduct.stock + totalStoreStock(stockMatrixProduct.id)}
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="p-3 bg-[#0E0E0E] border border-[#2D2D2D] rounded"><p className="text-[10px] text-[#9CA3AF]">Almacén</p><p className="mt-1 font-mono font-bold text-white">{stockMatrixProduct.stock} {stockMatrixProduct.unit}</p></div>
                <div className="p-3 bg-[#0E0E0E] border border-[#2D2D5A] rounded"><p className="text-[10px] text-[#9CA3AF]">Tiendas</p><p className="mt-1 font-mono font-bold text-white">{totalStoreStock(stockMatrixProduct.id)} {stockMatrixProduct.unit}</p></div>
                <div className="p-3 bg-[#0E0E0E] border border-[#2D2D2D] rounded"><p className="text-[10px] text-[#9CA3AF]">Existencia total</p><p className="mt-1 font-mono font-bold text-[#31D0AA]">{stockMatrixProduct.stock + totalStoreStock(stockMatrixProduct.id)} {stockMatrixProduct.unit}</p></div>
                <div className="p-3 bg-[#0E0E0E] border border-[#2D2D2D] rounded"><p className="text-[10px] text-[#9CA3AF]">Stock mínimo</p><p className="mt-1 font-mono font-bold text-white">{stockMatrixProduct.minStock} {stockMatrixProduct.unit}</p></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Adjust Stock (Kardex Movement) */}
      {isAdjustModalOpen && adjustingProduct && (
        <div id="modal-adjust-stock" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#141414] rounded border border-[#2D2D2D] shadow-2xl max-w-md w-full overflow-hidden text-white">
            
            <div className="px-6 py-4 bg-[#0E0E0E] text-white flex items-center justify-between border-b border-[#2D2D2D]">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-5 h-5 text-[#C8102E]" />
                <h3 className="text-base font-bold">Ajustar Existencias de Stock</h3>
              </div>
              <button 
                id="btn-close-adjust-modal"
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-[#9CA3AF] hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjust} className="p-6 space-y-4">
              
              <div className="p-3 bg-[#1E1E1E] border border-[#2D2D2D] rounded text-xs space-y-1">
                <p className="font-bold text-white">{adjustingProduct.name}</p>
                <div className="flex items-center justify-between text-[#9CA3AF] font-mono">
                  <span>SKU: {adjustingProduct.sku}</span>
                  <span className="font-bold text-[#A7F3D0]">
                    Stock Actual: {adjustData.locationId === 'main-warehouse'
                      ? adjustingProduct.stock
                      : storeStock.find(item => item.storeId === adjustData.locationId && item.productId === adjustingProduct.id)?.quantity || 0} {adjustingProduct.unit}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">Ubicación del stock *</label>
                <select
                  id="select-adjust-location"
                  value={adjustData.locationId}
                  onChange={e => {
                    const locationId = e.target.value;
                    const current = locationId === 'main-warehouse'
                      ? adjustingProduct.stock
                      : storeStock.find(item => item.storeId === locationId && item.productId === adjustingProduct.id)?.quantity || 0;
                    setAdjustData({ ...adjustData, locationId, newQuantity: current });
                  }}
                  className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs font-medium text-white focus:border-[#C8102E]"
                >
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>{store.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1 font-mono">Nueva cantidad *</label>
                <input
                  id="input-adjust-new-qty"
                  type="number"
                  min="0"
                  required
                  value={adjustData.newQuantity}
                  onChange={e => setAdjustData({ ...adjustData, newQuantity: Math.max(0, parseInt(e.target.value) || 0) })}
                  className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs font-mono font-bold text-white focus:border-[#C8102E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">Motivo / Justificación *</label>
                <textarea
                  id="textarea-adjust-notes"
                  required
                  rows={2}
                  value={adjustData.notes}
                  onChange={e => setAdjustData({ ...adjustData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs text-white focus:border-[#C8102E]"
                  placeholder="e.g. Ingreso por factura de proveedor F-00234 o conteo físico mensual"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">Usuario Responsable</label>
                <select
                  id="select-adjust-user"
                  value={adjustData.responsible}
                  onChange={(e) => setAdjustData({ ...adjustData, responsible: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs text-white focus:border-[#C8102E]"
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Almacenero">Almacenero</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#2D2D2D] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 bg-[#1E1E1E] hover:bg-[#2D2D2D] text-[#D1D5DB] text-xs font-semibold rounded border border-[#2D2D2D] cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-adjust-stock"
                  type="submit"
                  className="px-5 py-2 bg-[#C8102E] hover:bg-[#A80C25] text-white text-xs font-bold rounded cursor-pointer transition-colors"
                >
                  Confirmar Movimiento
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
