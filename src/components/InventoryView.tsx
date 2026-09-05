import React, { useState } from 'react';
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
import { Product, Category, Supplier, StockStatus, MovementType, CompanySettings } from '../types';

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
  onAdjustStock: (data: { productId: string; type: MovementType; quantity: number; notes?: string; createdBy?: string }) => Promise<void>;
  onOpenKardex: (product?: Product) => void;
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
  isLoading
}) => {
  const currency = settings?.currencySymbol || 'S/.';

  // Filters & View State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [sortField, setSortField] = useState<'name' | 'stock' | 'sellingPrice' | 'sku'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
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
    location: 'Almacén Principal',
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
  }>({
    type: 'IN_PURCHASE',
    quantity: 1,
    notes: '',
    responsible: 'Administrador Almacén'
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
      location: 'Almacén Principal - Estante A-01',
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
      location: prod.location || '',
      supplierId: prod.supplierId || '',
      supplierName: prod.supplierName || '',
      imageUrl: prod.imageUrl || ''
    });
    setIsProductModalOpen(true);
  };

  // Submit Product Form
  const handleSubmitProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.sku.trim()) return;

    if (editingProduct) {
      await onUpdateProduct(editingProduct.id, {
        ...formData,
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
      type: 'IN_PURCHASE',
      quantity: 5,
      notes: '',
      responsible: 'Almacén Central'
    });
    setIsAdjustModalOpen(true);
  };

  // Submit Stock Adjust
  const handleSubmitAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct || adjustData.quantity <= 0) return;

    await onAdjustStock({
      productId: adjustingProduct.id,
      type: adjustData.type,
      quantity: Number(adjustData.quantity),
      notes: adjustData.notes || `Ajuste manual de stock tipo ${adjustData.type}`,
      createdBy: adjustData.responsible
    });

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

  // Filtering & Sorting
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'ALL' || p.category.toLowerCase() === selectedCategory.toLowerCase();
    const matchesStatus = selectedStatus === 'ALL' || p.status === selectedStatus;
    const matchesSearch = searchTerm.trim() === '' || 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (p.brand && p.brand.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesStatus && matchesSearch;
  }).sort((a, b) => {
    let comp = 0;
    if (sortField === 'name') comp = a.name.localeCompare(b.name);
    if (sortField === 'sku') comp = a.sku.localeCompare(b.sku);
    if (sortField === 'stock') comp = a.stock - b.stock;
    if (sortField === 'sellingPrice') comp = a.sellingPrice - b.sellingPrice;
    return sortOrder === 'asc' ? comp : -comp;
  });

  const marginPercent = formData.sellingPrice > 0 && formData.costPrice > 0
    ? (((formData.sellingPrice - formData.costPrice) / formData.costPrice) * 100).toFixed(1)
    : '0';

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header & Action Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-700/80 shadow-2xl shadow-slate-950/30">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Catálogo & Control de Inventario</h2>
            <span className="px-2.5 py-0.5 bg-violet-500/20 text-violet-200 border border-violet-400/30 text-xs font-bold rounded-full">
              {filteredProducts.length} productos
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            id="btn-export-inventory-csv"
            onClick={handleExportCSV}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1.5"
            title="Exportar inventario en formato CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar CSV</span>
          </button>

          <button
            id="btn-open-kardex-global"
            onClick={() => onOpenKardex()}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1.5"
          >
            <History className="w-3.5 h-3.5 text-blue-600" />
            <span>Kardex</span>
          </button>

          <button
            id="btn-add-product-main"
            onClick={handleOpenAdd}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-violet-900/40 flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Producto</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700/80 shadow-2xl shadow-slate-950/30 space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-inventory-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por SKU, nombre de producto, código de barras o marca..."
              className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-600 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-slate-950 transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="flex items-center space-x-2">
            <select
              id="select-inventory-category"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-950/60 border border-slate-600 rounded-xl text-xs text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="ALL">Todas las Categorías</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              id="select-inventory-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-slate-950/60 border border-slate-600 rounded-xl text-xs text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="in_stock">En Stock</option>
              <option value="low_stock">Stock Bajo (Alerta)</option>
              <option value="out_of_stock">Agotado (0)</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-600 shrink-0">
              <button
                id="btn-view-table"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'table' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                title="Vista en tabla detallada"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                id="btn-view-grid"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-500 hover:text-slate-800'}`}
                title="Vista en cuadrícula"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* Products Content: Table or Grid */}
      {filteredProducts.length === 0 ? (
        <div className="bg-slate-900/80 rounded-2xl border border-slate-700/80 p-12 text-center shadow-2xl shadow-slate-950/30">
          <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-800">No se encontraron productos</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            Prueba ajustando los filtros de búsqueda o registra un nuevo producto en el catálogo.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar Producto</span>
          </button>
        </div>
      ) : viewMode === 'table' ? (
        
        /* Table View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[10px]">
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
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map(prod => {
                  const margin = prod.costPrice > 0 
                    ? (((prod.sellingPrice - prod.costPrice) / prod.costPrice) * 100).toFixed(0)
                    : '0';

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Product Name & SKU */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          {prod.imageUrl ? (
                            <img 
                              src={prod.imageUrl} 
                              alt={prod.name} 
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0" 
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 border border-slate-200">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-900 leading-snug">{prod.name}</p>
                            <div className="flex items-center space-x-2 text-[11px] text-slate-500 font-mono mt-0.5">
                              <span>SKU: {prod.sku}</span>
                              {prod.barcode && <span>· CB: {prod.barcode}</span>}
                              {prod.brand && <span className="font-sans">· {prod.brand}</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
                          {prod.category}
                        </span>
                        {prod.location && (
                          <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[120px]">{prod.location}</p>
                        )}
                      </td>

                      {/* Cost Price */}
                      <td className="py-3.5 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                        {currency} {formatAmount(prod.costPrice)}
                      </td>

                      {/* Selling Price */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {currency} {formatAmount(prod.sellingPrice)}
                      </td>

                      {/* Margin */}
                      <td className="py-3.5 px-4 font-mono font-medium whitespace-nowrap">
                        <span className={`px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                          Number(margin) >= 30 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          +{margin}%
                        </span>
                      </td>

                      {/* Stock Level */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-900 font-mono text-sm">{prod.stock}</span>
                          <span className="text-[10px] text-slate-500 font-medium">{prod.unit}</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">Mín: {prod.minStock}</p>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {prod.status === 'out_of_stock' && (
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-bold text-[10px] inline-flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            <span>Agotado</span>
                          </span>
                        )}
                        {prod.status === 'low_stock' && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px] inline-flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                            <span>Stock Bajo</span>
                          </span>
                        )}
                        {prod.status === 'in_stock' && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px] inline-flex items-center space-x-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
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
                            className="p-1.5 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg transition-colors"
                            title="Ajustar stock (Entrada / Salida / Kardex)"
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                          </button>
                          <button
                            id={`btn-kardex-${prod.id}`}
                            onClick={() => onOpenKardex(prod)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
                            title="Ver Kardex de movimientos"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button
                            id={`btn-edit-prod-${prod.id}`}
                            onClick={() => handleOpenEdit(prod)}
                            className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
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
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
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
            <div key={prod.id} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="relative h-36 bg-slate-100 rounded-xl overflow-hidden mb-3 border border-slate-100 flex items-center justify-center">
                  {prod.imageUrl ? (
                    <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-10 h-10 text-slate-300" />
                  )}
                  <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    prod.status === 'out_of_stock' ? 'bg-red-500 text-white' :
                    prod.status === 'low_stock' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                  }`}>
                    {prod.stock} {prod.unit}
                  </span>
                </div>

                <span className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">{prod.category}</span>
                <h4 className="text-xs font-bold text-slate-900 mt-0.5 line-clamp-2">{prod.name}</h4>
                <p className="text-[11px] font-mono text-slate-400 mt-1">SKU: {prod.sku}</p>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Precio Venta</span>
                    <span className="text-sm font-bold text-slate-900 font-mono">{currency} {formatAmount(prod.sellingPrice)}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block">Costo</span>
                    <span className="text-xs font-medium text-slate-600 font-mono">{currency} {formatAmount(prod.costPrice)}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100 gap-2">
                <button
                  onClick={() => handleOpenAdjust(prod)}
                  className="flex-1 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Ajustar</span>
                </button>
                <button
                  onClick={() => handleOpenEdit(prod)}
                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
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
      {isProductModalOpen && (
        <div id="modal-product" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold">
                  {editingProduct ? 'Editar Producto del Inventario' : 'Registrar Nuevo Producto'}
                </h3>
              </div>
              <button 
                id="btn-close-product-modal"
                onClick={() => setIsProductModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitProduct} className="flex-1 overflow-y-auto p-6 space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Código SKU *</label>
                  <input
                    id="input-prod-sku"
                    type="text"
                    required
                    value={formData.sku}
                    onChange={e => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    placeholder="e.g. LAP-DELL-5520"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Código de Barras</label>
                  <input
                    id="input-prod-barcode"
                    type="text"
                    value={formData.barcode}
                    onChange={e => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-blue-500 focus:bg-white"
                    placeholder="e.g. 7751234500101"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre Completo del Producto *</label>
                <input
                  id="input-prod-name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  placeholder="e.g. Laptop Dell Latitude 5520 Core i7 16GB RAM"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría *</label>
                  <select
                    id="select-prod-category"
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Marca</label>
                  <input
                    id="input-prod-brand"
                    type="text"
                    value={formData.brand}
                    onChange={e => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. Dell, Cisco, Hikvision"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Unidad de Medida</label>
                  <select
                    id="select-prod-unit"
                    value={formData.unit}
                    onChange={e => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500"
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
              <div className="p-4 bg-blue-50/60 border border-blue-100 rounded-xl space-y-3">
                <span className="text-xs font-bold text-blue-900 block">Precios & Margen de Ganancia</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Costo Unitario ({currency}) *</label>
                    <input
                      id="input-prod-cost"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.costPrice}
                      onChange={e => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Precio Venta ({currency}) *</label>
                    <input
                      id="input-prod-price"
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.sellingPrice}
                      onChange={e => setFormData({ ...formData, sellingPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-blue-700"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Margen Calculado</label>
                    <div className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-emerald-700 font-mono">
                      +{marginPercent}% (${formatAmount(formData.sellingPrice - formData.costPrice)})
                    </div>
                  </div>
                </div>
              </div>

              {/* Stock and Thresholds */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stock Actual *</label>
                  <input
                    id="input-prod-stock"
                    type="number"
                    min="0"
                    required
                    value={formData.stock}
                    onChange={e => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stock Mínimo (Alerta) *</label>
                  <input
                    id="input-prod-minstock"
                    type="number"
                    min="1"
                    required
                    value={formData.minStock}
                    onChange={e => setFormData({ ...formData, minStock: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ubicación en Almacén</label>
                  <input
                    id="input-prod-location"
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                    placeholder="e.g. Estante B-03"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción / Especificaciones Técnicas</label>
                <textarea
                  id="textarea-prod-desc"
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:bg-white"
                  placeholder="Detalles adicionales, número de parte o compatibilidades..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">URL de Imagen (Opcional)</label>
                <input
                  id="input-prod-image"
                  type="url"
                  value={formData.imageUrl}
                  onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  placeholder="https://images.unsplash.com/..."
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  id="btn-save-product"
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-sm"
                >
                  {editingProduct ? 'Guardar Cambios' : 'Registrar Producto'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: Adjust Stock (Kardex Movement) */}
      {isAdjustModalOpen && adjustingProduct && (
        <div id="modal-adjust-stock" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <SlidersHorizontal className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold">Ajustar Existencias de Stock</h3>
              </div>
              <button 
                id="btn-close-adjust-modal"
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjust} className="p-6 space-y-4">
              
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                <p className="font-bold text-slate-900">{adjustingProduct.name}</p>
                <div className="flex items-center justify-between text-slate-600 font-mono">
                  <span>SKU: {adjustingProduct.sku}</span>
                  <span className="font-bold text-blue-700">Stock Actual: {adjustingProduct.stock} {adjustingProduct.unit}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Movimiento Kardex *</label>
                <select
                  id="select-adjust-type"
                  value={adjustData.type}
                  onChange={e => setAdjustData({ ...adjustData, type: e.target.value as MovementType })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
                >
                  <option value="IN_PURCHASE">Entrada por Compra / Reabastecimiento (+)</option>
                  <option value="IN_ADJUSTMENT">Ajuste Positivo / Conteo de Inventario (+)</option>
                  <option value="OUT_ADJUSTMENT">Ajuste Negativo / Descuento Manual (-)</option>
                  <option value="OUT_DAMAGE">Salida por Merma / Producto Dañado (-)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cantidad a Mover *</label>
                <input
                  id="input-adjust-qty"
                  type="number"
                  min="1"
                  required
                  value={adjustData.quantity}
                  onChange={e => setAdjustData({ ...adjustData, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Nuevo stock estimado: <strong>
                    {adjustData.type.startsWith('IN_') 
                      ? adjustingProduct.stock + adjustData.quantity 
                      : Math.max(0, adjustingProduct.stock - adjustData.quantity)} {adjustingProduct.unit}
                  </strong>
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Motivo / Justificación *</label>
                <textarea
                  id="textarea-adjust-notes"
                  required
                  rows={2}
                  value={adjustData.notes}
                  onChange={e => setAdjustData({ ...adjustData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  placeholder="e.g. Ingreso por factura de proveedor F-00234 o conteo físico mensual"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Usuario Responsable</label>
                <input
                  id="input-adjust-user"
                  type="text"
                  value={adjustData.responsible}
                  onChange={e => setAdjustData({ ...adjustData, responsible: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-adjust-stock"
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm"
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
