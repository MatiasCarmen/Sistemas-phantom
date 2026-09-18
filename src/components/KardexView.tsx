import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  ArrowDownLeft, 
  ArrowUpRight, 
  Package, 
  Download, 
  Calendar, 
  User, 
  FileText,
  Layers
} from 'lucide-react';
import { InventoryMovement, Product, CompanySettings } from '../types';

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
  const currency = settings?.currencySymbol || 'S/.';
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedProductId, setSelectedProductId] = useState<string>(selectedProductFilter?.id || 'ALL');

  const filteredMovements = movements.filter(m => {
    const matchesProduct = selectedProductId === 'ALL' || m.productId === selectedProductId;
    const matchesType = typeFilter === 'ALL' || m.type === typeFilter;
    const matchesSearch = searchTerm.trim() === '' ||
      m.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.productSku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.referenceId && m.referenceId.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (m.notes && m.notes.toLowerCase().includes(searchTerm.toLowerCase())) ||
      m.createdBy.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesProduct && matchesType && matchesSearch;
  });

  const handleExportCSV = () => {
    const headers = ['Fecha_Hora', 'SKU', 'Producto', 'Tipo_Movimiento', 'Cantidad', 'Stock_Anterior', 'Stock_Nuevo', 'Costo_Unitario', 'Referencia', 'Notas', 'Usuario'];
    const rows = filteredMovements.map(m => [
      `"${m.createdAt}"`,
      `"${m.productSku}"`,
      `"${m.productName.replace(/"/g, '""')}"`,
      `"${m.type}"`,
      m.quantity,
      m.previousStock,
      m.newStock,
      m.unitCost,
      `"${m.referenceId || ''}"`,
      `"${(m.notes || '').replace(/"/g, '""')}"`,
      `"${m.createdBy}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `kardex_movimientos_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
            <h2 className="text-xl font-bold text-white tracking-tight">Kardex Físico & Trazabilidad de Existencias</h2>
            <span className="px-2.5 py-0.5 bg-[#C8102E]/15 text-[#ffb3b1] border border-[#C8102E]/40 text-xs font-bold font-mono rounded">
              {filteredMovements.length} movimientos
            </span>
          </div>
        </div>

        <button
          id="btn-export-kardex-csv"
          onClick={handleExportCSV}
          className="px-3.5 py-2 bg-[#C8102E] hover:bg-[#A80C25] text-white rounded font-bold text-xs transition-colors shadow-sm flex items-center space-x-1.5 self-start md:self-auto"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Exportar Libro Kardex CSV</span>
        </button>
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
              onClearProductFilter();
            }}
            className="text-xs text-[#ffb3b1] hover:text-white font-bold underline transition-colors"
          >
            Quitar filtro
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-[#141414] p-4 rounded-md border border-[#2D2D2D] flex flex-col md:flex-row gap-3">
        
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-kardex-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por producto, SKU, número de comprobante, motivo o usuario..."
            className="w-full pl-9 pr-4 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded-md text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#C8102E]"
          />
        </div>

        <div className="flex items-center space-x-2">
          
          <select
            id="select-kardex-product"
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded-md text-xs text-white font-medium focus:outline-none focus:border-[#C8102E] max-w-[200px]"
          >
            <option value="ALL">Todos los Productos</option>
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name.slice(0, 30)}...</option>
            ))}
          </select>

          <select
            id="select-kardex-type"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded-md text-xs text-white font-medium focus:outline-none focus:border-[#C8102E]"
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

      {/* Movements Table */}
      <div className="bg-[#141414] rounded-md border border-[#2D2D2D] overflow-hidden">
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
