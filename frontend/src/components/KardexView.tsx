import React, { useEffect, useMemo, useState } from 'react';
import { Search, ArrowDownLeft, ArrowUpRight, Package, Download, Eye, FileDown } from 'lucide-react';
import { InventoryMovement, Product, CompanySettings } from '../types';
import { generateKardexPDF } from '../lib/pdfGenerator';

interface KardexViewProps {
  movements: InventoryMovement[];
  products: Product[];
  settings: CompanySettings | null;
  selectedProductFilter?: Product | null;
  onClearProductFilter: () => void;
}

export const KardexView: React.FC<KardexViewProps> = ({
  movements,
  products,
  settings,
  selectedProductFilter,
  onClearProductFilter
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedProductId, setSelectedProductId] = useState<string>(selectedProductFilter?.id || 'ALL');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const productById = useMemo(() => new Map(products.map(product => [product.id, product])), [products]);
  const selectedProduct = selectedProductId === 'ALL' ? null : productById.get(selectedProductId) || null;
  const categories = useMemo(
    () => Array.from(new Set(products.map(product => product.category.trim()).filter(Boolean))).sort((a, b) => a.localeCompare(b)),
    [products]
  );
  const matchingProducts = products.filter(product => {
    const matchesCategory = selectedCategory === 'ALL' || product.category === selectedCategory;
    const query = searchTerm.trim().toLocaleLowerCase();
    const matchesProductSearch = !query || [
      product.name,
      product.sku,
      product.barcode,
      product.brand,
      product.category
    ].some(value => value?.toLocaleLowerCase().includes(query));
    return matchesCategory && matchesProductSearch;
  });

  useEffect(() => {
    const productId = selectedProductFilter?.id || 'ALL';
    setSelectedProductId(productId);
    setSelectedCategory(selectedProductFilter?.category || 'ALL');
  }, [selectedProductFilter]);

  const filteredMovements = movements.filter(m => {
    const matchesProduct = selectedProductId === 'ALL' || m.productId === selectedProductId;
    const product = productById.get(m.productId);
    const matchesCategory = selectedCategory === 'ALL' || product?.category === selectedCategory;
    const matchesType = typeFilter === 'ALL' || m.type === typeFilter;
    const query = searchTerm.trim().toLocaleLowerCase();
    const movementTime = new Date(m.createdAt).getTime();
    const startTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
    const endTime = dateTo ? new Date(`${dateTo}T00:00:00`).getTime() + 24 * 60 * 60 * 1000 : Number.POSITIVE_INFINITY;
    const matchesDate = movementTime >= startTime && movementTime < endTime;
    const matchesSearch = !query || [
      m.productName,
      m.productSku,
      m.referenceId,
      m.notes,
      m.createdBy,
      product?.barcode,
      product?.brand,
      product?.category
    ].some(value => value?.toLocaleLowerCase().includes(query));
    return matchesProduct && matchesCategory && matchesType && matchesSearch && matchesDate;
  });
  const selectedProductMovements = selectedProduct ? filteredMovements : [];

  const handleExportCSV = (rows: InventoryMovement[], filename: string) => {
    const headers = ['Fecha_Hora', 'SKU', 'Producto', 'Tipo_Movimiento', 'Cantidad', 'Stock_Anterior', 'Stock_Nuevo', 'Costo_Unitario', 'Referencia', 'Notas', 'Usuario'];
    const csvCell = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;
    const csvRows = rows.map(m => [
      csvCell(m.createdAt),
      csvCell(m.productSku),
      csvCell(m.productName),
      csvCell(m.type),
      csvCell(m.quantity),
      csvCell(m.previousStock),
      csvCell(m.newStock),
      csvCell(m.unitCost),
      csvCell(m.referenceId || ''),
      csvCell(m.notes || ''),
      csvCell(m.createdBy)
    ]);

    const csvContent = [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF', csvContent], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const downloadPDF = (rows: InventoryMovement[], product?: Product) => {
    if (!settings) return;
    const pdf = generateKardexPDF(rows, settings, product);
    const productSuffix = product ? `_${product.sku}` : '_general';
    pdf.save(`kardex${productSuffix}_${Date.now()}.pdf`);
  };

  const showGeneralKardex = () => {
    setSearchTerm('');
    setTypeFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setSelectedProductId('ALL');
    setSelectedCategory('ALL');
    onClearProductFilter();
    window.setTimeout(() => {
      document.getElementById('kardex-movements-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'IN_PURCHASE':
        return (
          <span className="px-2.5 py-0.5 bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 rounded font-mono font-bold text-[10px] inline-flex items-center space-x-1">
            <ArrowDownLeft className="w-3 h-3 text-emerald-400" />
            <span>Entrada / Compra (+)</span>
          </span>
        );
      case 'IN_ADJUSTMENT':
        return (
          <span className="px-2.5 py-0.5 bg-blue-950/40 border border-blue-800/40 text-blue-400 rounded font-mono font-bold text-[10px] inline-flex items-center space-x-1">
            <ArrowDownLeft className="w-3 h-3 text-blue-400" />
            <span>Ajuste Positivo (+)</span>
          </span>
        );
      case 'OUT_SALE':
        return (
          <span className="px-2.5 py-0.5 bg-[#C8102E]/15 border border-[#C8102E]/40 text-[#ffb3b1] rounded font-mono font-bold text-[10px] inline-flex items-center space-x-1">
            <ArrowUpRight className="w-3 h-3 text-[#ffb3b1]" />
            <span>Salida por Venta (-)</span>
          </span>
        );
      case 'OUT_ADJUSTMENT':
        return (
          <span className="px-2.5 py-0.5 bg-amber-950/40 border border-amber-800/40 text-amber-400 rounded font-mono font-bold text-[10px] inline-flex items-center space-x-1">
            <ArrowUpRight className="w-3 h-3 text-amber-400" />
            <span>Ajuste Negativo (-)</span>
          </span>
        );
      case 'OUT_DAMAGE':
        return (
          <span className="px-2.5 py-0.5 bg-[#C8102E]/25 border border-[#C8102E] text-[#ffb3b1] rounded font-mono font-bold text-[10px] inline-flex items-center space-x-1">
            <ArrowUpRight className="w-3 h-3 text-[#C8102E]" />
            <span>Merma / Daño (-)</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 bg-[#1E1E1E] border border-[#2D2D2D] text-[#c8c6c6] rounded font-mono font-bold text-[10px]">
            {type}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414] p-5 rounded-md border border-[#2D2D2D]">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Kardex Fisico</h2>
            <span className="px-2.5 py-0.5 bg-[#C8102E]/15 text-[#ffb3b1] border border-[#C8102E]/40 text-xs font-bold font-mono rounded">
              {filteredMovements.length} movimientos
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            id="btn-export-kardex-csv"
            onClick={() => handleExportCSV(movements, `kardex_general_${Date.now()}.csv`)}
            className="px-3.5 py-2 bg-[#C8102E] hover:bg-[#A80C25] text-white rounded font-bold text-xs transition-colors shadow-sm flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Kárdex general CSV</span>
          </button>
          <button
            type="button"
            onClick={showGeneralKardex}
            className="px-3.5 py-2 bg-[#1E1E1E] hover:bg-[#2D2D2D] border border-[#3D3D3D] text-white rounded font-bold text-xs transition-colors flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Ver Kárdex general</span>
          </button>
          <button
            type="button"
            onClick={() => downloadPDF(movements)}
            disabled={!settings}
            className="px-3.5 py-2 bg-[#1E1E1E] hover:bg-[#2D2D2D] border border-[#3D3D3D] text-white rounded font-bold text-xs transition-colors flex items-center gap-1.5"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Descargar PDF general</span>
          </button>
        </div>
      </div>

      {/* Active Product Filter Pill */}
      {selectedProductFilter && (
        <div className="p-3 bg-[#1E1E1E] border border-[#2D2D2D] rounded-md text-xs text-[#c8c6c6] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="w-4 h-4 text-[#ffb3b1]" />
            <span>Filtrando Kardex para: <strong className="text-white">{selectedProductFilter.name}</strong> (SKU: <span className="font-mono text-[#ffb3b1]">{selectedProductFilter.sku}</span>)</span>
          </div>
          <button
            onClick={() => {
              setSelectedProductId('ALL');
              setSelectedCategory('ALL');
              onClearProductFilter();
            }}
            className="text-xs text-[#ffb3b1] hover:text-white font-bold underline transition-colors"
          >
            Quitar filtro
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-[#141414] p-4 rounded-md border border-[#2D2D2D] space-y-4">
        
        <div className="flex flex-col gap-3 xl:flex-row">
          <div className="relative min-w-0 flex-1">
          <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-kardex-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por producto, SKU, código de barras, marca, categoría, comprobante, motivo o usuario..."
            className="w-full pl-9 pr-4 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded-md text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#C8102E]"
          />
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:w-[520px]">
            <select
              id="select-kardex-product"
              aria-label="Todos los productos"
              value={selectedProductId}
              onChange={event => {
                const productId = event.target.value;
                setSelectedProductId(productId);
                setSelectedCategory(productById.get(productId)?.category || 'ALL');
              }}
              className="w-full min-w-0 rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 text-xs font-medium text-white focus:border-[#C8102E] focus:outline-none"
            >
              <option value="ALL">Todos los productos</option>
              {matchingProducts.map(product => (
                <option key={product.id} value={product.id}>{product.name} · SKU {product.sku}</option>
              ))}
              {!matchingProducts.length && <option value="" disabled>No hay productos para esta búsqueda y categoría</option>}
            </select>
            <select
              id="select-kardex-type"
              aria-label="Todos los movimientos"
              value={typeFilter}
              onChange={event => setTypeFilter(event.target.value)}
              className="w-full min-w-0 rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 text-xs font-medium text-white focus:border-[#C8102E] focus:outline-none"
            >
              <option value="ALL">Todos los Movimientos</option>
              <option value="IN_PURCHASE">Entrada por Compra (+)</option>
              <option value="IN_ADJUSTMENT">Ajuste Positivo (+)</option>
              <option value="OUT_SALE">Salida por Venta (-)</option>
              <option value="OUT_ADJUSTMENT">Ajuste Negativo (-)</option>
              <option value="OUT_DAMAGE">Merma / Daño (-)</option>
            </select>
          </div>
        </div>
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2 sm:max-w-xl">
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#D1D5DB]" htmlFor="kardex-date-from">
              <span>Desde</span>
              <input
                id="kardex-date-from"
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={event => setDateFrom(event.target.value)}
                className="rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 text-xs text-white focus:border-[#C8102E] focus:outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-xs font-semibold text-[#D1D5DB]" htmlFor="kardex-date-to">
              <span>Hasta</span>
              <input
                id="kardex-date-to"
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={event => setDateTo(event.target.value)}
                className="rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 text-xs text-white focus:border-[#C8102E] focus:outline-none"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Filtrar por categoría">
            <button type="button" onClick={() => { setSelectedCategory('ALL'); setSelectedProductId('ALL'); }} className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${selectedCategory === 'ALL' ? 'bg-[#C8102E] text-white' : 'bg-[#252525] text-[#D1D5DB] hover:bg-[#303030]'}`}>Todas las categorías</button>
            {categories.map(category => (
              <button key={category} type="button" onClick={() => { setSelectedCategory(category); setSelectedProductId('ALL'); }} className={`rounded-full px-4 py-2 text-xs font-bold transition-colors ${selectedCategory === category ? 'bg-[#C8102E] text-white' : 'bg-[#252525] text-[#D1D5DB] hover:bg-[#303030]'}`}>{category}</button>
            ))}
          </div>
        </div>
        {selectedProduct && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded border border-[#3D3D3D] bg-[#101010] p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{selectedProduct.name}</p>
              <p className="mt-1 text-xs text-[#9CA3AF]">SKU {selectedProduct.sku} · {selectedProductMovements.length} movimientos registrados</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => downloadPDF(selectedProductMovements, selectedProduct)} disabled={!settings} className="flex items-center gap-1.5 rounded bg-[#C8102E] px-3 py-2 text-xs font-bold text-white hover:bg-[#A80C25] disabled:opacity-40">
                <Download className="h-3.5 w-3.5" />Descargar PDF
              </button>
              <button type="button" onClick={() => handleExportCSV(selectedProductMovements, `kardex_${selectedProduct.sku}_${Date.now()}.csv`)} className="flex items-center gap-1.5 rounded border border-[#3D3D3D] px-3 py-2 text-xs font-bold text-white hover:bg-[#252525]">
                <FileDown className="h-3.5 w-3.5" />Descargar CSV
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Movements Table */}
      <div id="kardex-movements-table" className="scroll-mt-4 bg-[#141414] rounded-md border border-[#2D2D2D] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#c8c6c6]">
            <thead className="bg-[#1E1E1E] border-b border-[#2D2D2D] text-[#c8c6c6] font-mono uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Fecha & Hora</th>
                <th className="py-3.5 px-4">Producto & SKU</th>
                <th className="py-3.5 px-4">Tipo Movimiento</th>
                <th className="py-3.5 px-4 text-center">Cant.</th>
                <th className="py-3.5 px-4 text-center">Stock Ant.</th>
                <th className="py-3.5 px-4 text-center">Stock Nuevo</th>
                <th className="py-3.5 px-4">Referencia / Motivo</th>
                <th className="py-3.5 px-4">Responsable</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2D2D2D]">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#71717A]">
                    No se registran movimientos para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredMovements.map(mov => {
                  const isPositive = mov.type.startsWith('IN_');
                  return (
                    <tr key={mov.id} className="hover:bg-[#1E1E1E]/50 transition-colors">
                      
                      <td className="py-3.5 px-4 whitespace-nowrap text-[#A1A1AA] font-mono text-[11px]">
                        {new Date(mov.createdAt).toLocaleString('es-ES', { 
                          day: '2-digit', 
                          month: '2-digit', 
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="font-semibold text-white leading-snug">{mov.productName}</p>
                        <p className="text-[11px] text-[#71717A] font-mono">SKU: {mov.productSku}</p>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {getMovementBadge(mov.type)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        <span className={`font-mono tabular-nums font-bold text-xs ${isPositive ? 'text-[#10B981]' : 'text-[#ffb3b1]'}`}>
                          {isPositive ? `+${mov.quantity}` : `-${mov.quantity}`}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-center font-mono tabular-nums text-[#71717A]">
                        {mov.previousStock}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-center font-mono tabular-nums font-bold text-white">
                        {mov.newStock}
                      </td>

                      <td className="py-3.5 px-4">
                        {mov.referenceId && (
                          <span className="font-mono font-bold text-[#ffb3b1] block text-[11px]">
                            Ref: {mov.referenceId}
                          </span>
                        )}
                        <p className="text-[#c8c6c6] text-[11px] line-clamp-1">{mov.notes || '-'}</p>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-[#c8c6c6] text-[11px]">
                        {mov.createdBy}
                      </td>

                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
