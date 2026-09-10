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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414] p-5 rounded border border-[#2D2D2D]">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Catálogo & Control de Inventario</h2>
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
            className="px-3 py-2 bg-[#1E1E1E] hover:bg-[#2D2D2D] text-white border border-[#2D2D2D] rounded text-xs font-semibold transition-colors flex items-center space-x-1.5"
          >
            <History className="w-3.5 h-3.5 text-[#3B82F6]" />
            <span>Kardex</span>
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

      {/* Filter and Search Bar */}
      <div className="bg-[#141414] p-4 rounded border border-[#2D2D2D] space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-inventory-search"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por SKU, nombre de producto, código de barras o marca..."
              className="w-full pl-9 pr-4 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs text-white placeholder-[#9CA3AF] focus:outline-none focus:border-[#C8102E] transition-colors"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')} 
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-white"
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
              className="px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs text-white font-medium focus:outline-none focus:border-[#C8102E]"
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
              className="px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs text-white font-medium focus:outline-none focus:border-[#C8102E]"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="in_stock">En Stock</option>
              <option value="low_stock">Stock Bajo (Alerta)</option>
              <option value="out_of_stock">Agotado (0)</option>
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

        </div>
      </div>

      {/* Products Content: Table or Grid */}
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
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-white font-mono text-sm tabular-nums">{prod.stock}</span>
                          <span className="text-[10px] text-[#9CA3AF] font-medium">{prod.unit}</span>
                        </div>
                        <p className="text-[10px] text-[#9CA3AF] font-mono tabular-nums">Mín: {prod.minStock}</p>
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
                            className="p-1.5 hover:bg-[#2D2D2D] text-[#9CA3AF] hover:text-[#3B82F6] rounded transition-colors"
                            title="Ver Kardex de movimientos"
                          >
                            <History className="w-4 h-4" />
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
                  className="flex-1 py-1.5 bg-[#1E1E1E] hover:bg-[#2D2D2D] text-white text-xs font-semibold rounded border border-[#2D2D2D] transition-colors flex items-center justify-center space-x-1"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5 text-[#9CA3AF]" />
                  <span>Ajustar</span>
                </button>
                <button
                  onClick={() => handleOpenEdit(prod)}
                  className="p-1.5 bg-[#1E1E1E] hover:bg-[#2D2D2D] text-[#D1D5DB] hover:text-white rounded border border-[#2D2D2D] transition-colors"
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
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1 font-mono">Stock Actual *</label>
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
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1 font-mono">Ubicación en Almacén</label>
                  <input
                    id="input-prod-location"
                    type="text"
                    value={formData.location}
                    onChange={e => setFormData({ ...formData, location: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs text-white focus:border-[#C8102E]"
                    placeholder="e.g. CDL-A04-R12-S02"
                  />
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
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">URL de Imagen (Opcional)</label>
                <input
                  id="input-prod-image"
                  type="url"
                  value={formData.imageUrl}
                  onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs text-white focus:border-[#C8102E]"
                  placeholder="https://images.unsplash.com/..."
                />
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
                  <span className="font-bold text-[#A7F3D0]">Stock Actual: {adjustingProduct.stock} {adjustingProduct.unit}</span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1">Tipo de Movimiento Kardex *</label>
                <select
                  id="select-adjust-type"
                  value={adjustData.type}
                  onChange={e => setAdjustData({ ...adjustData, type: e.target.value as MovementType })}
                  className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs font-medium text-white focus:border-[#C8102E]"
                >
                  <option value="IN_PURCHASE">Entrada por Compra / Reabastecimiento (+)</option>
                  <option value="IN_ADJUSTMENT">Ajuste Positivo / Conteo de Inventario (+)</option>
                  <option value="OUT_ADJUSTMENT">Ajuste Negativo / Descuento Manual (-)</option>
                  <option value="OUT_DAMAGE">Salida por Merma / Producto Dañado (-)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-1 font-mono">Cantidad a Mover *</label>
                <input
                  id="input-adjust-qty"
                  type="number"
                  min="1"
                  required
                  value={adjustData.quantity}
                  onChange={e => setAdjustData({ ...adjustData, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs font-mono font-bold text-white focus:border-[#C8102E]"
                />
                <span className="text-[11px] text-[#9CA3AF] mt-1 block font-mono">
                  Nuevo stock estimado: <strong className="text-white">
                    {adjustData.type.startsWith('IN_') 
                      ? adjustingProduct.stock + adjustData.quantity 
                      : Math.max(0, adjustingProduct.stock - adjustData.quantity)} {adjustingProduct.unit}
                  </strong>
                </span>
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
                <input
                  id="input-adjust-user"
                  type="text"
                  value={adjustData.responsible}
                  onChange={e => setAdjustData({ ...adjustData, responsible: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs text-white focus:border-[#C8102E]"
                />
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
