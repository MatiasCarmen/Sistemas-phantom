import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Package, 
  FileSpreadsheet, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowUpRight, 
  Plus, 
  ShoppingCart, 
  Clock, 
  Box, 
  RefreshCw,
  ExternalLink,
  Shield,
  Layers,
  History,
  CheckCircle,
  ArrowRight,
  Database,
  Info,
  Sparkles
} from 'lucide-react';
import { DashboardMetrics, CompanySettings, Product, User } from '../types';
import { formatAmount } from '../lib/formatters';

interface DashboardViewProps {
  metrics: DashboardMetrics | null;
  settings: CompanySettings | null;
  products: Product[];
  currentUser?: User | null;
  onNavigate: (view: string) => void;
  onOpenNewSale: () => void;
  onOpenNewQuote: () => void;
  onOpenNewProduct: () => void;
  onOpenStockAdjust: (product?: Product) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  settings,
  products,
  currentUser,
  onNavigate,
  onOpenNewSale,
  onOpenNewQuote,
  onOpenNewProduct,
  onOpenStockAdjust,
  onRefresh,
  isLoading
}) => {
  const currency = settings?.currencySymbol || 'S/.';
  const role = currentUser?.role || 'collaborator';
  const isAdmin = role === 'admin';
  const isWarehouse = role === 'warehouse';
  const isCashier = role === 'cashier';
  const isCollaborator = role === 'collaborator';

  if (!metrics) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <p className="text-sm text-slate-600">Cargando métricas del sistema...</p>
        </div>
      </div>
    );
  }

  const criticalProducts = products.filter(p => p.status === 'low_stock' || p.status === 'out_of_stock');
  const maxDaySales = Math.max(...metrics.salesByDay.map(d => d.total), 100);

  return (
    <div className="space-y-5 pb-10">
      
      {/* Top Banner & Quick Actions - Role-Aware */}
      <div className="bg-[#141414] rounded p-5 text-white border border-[#2D2D2D] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border ${
              isAdmin ? 'bg-[#8A091E]/60 text-[#FFDAD8] border-[#C8102E]/60' :
              isWarehouse ? 'bg-[#78350F]/60 text-[#FDE68A] border-[#F59E0B]/60' :
              isCashier ? 'bg-[#1E3A8A]/60 text-[#DBEAFE] border-[#3B82F6]/60' :
              'bg-[#064E3B]/60 text-[#A7F3D0] border-[#10B981]/60'
            }`}>
              {isAdmin ? 'Panel Ejecutivo & Control Total' :
               isWarehouse ? 'Panel de Operaciones de Almacén' :
               isCashier ? 'Punto de Venta & Caja' :
               'Panel Comercial & Cotizaciones'}
            </span>
            <span className="text-[11px] text-[#9CA3AF] font-mono">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-1">
            Bienvenido, {currentUser?.name || 'Usuario'}
          </h2>
          <p className="text-xs text-[#9CA3AF] max-w-2xl mt-0.5">
            {isAdmin && 'Supervisión integral de ventas, inventario valorizado, margen comercial y estados financieros.'}
            {isWarehouse && 'Gestión de stock físico, alertas de reposición, kardex valorizado y entradas de mercadería.'}
            {isCashier && 'Emisión ágil de comprobantes de pago (Boletas/Facturas/Tickets) y registro de cobros.'}
            {isCollaborator && 'Generación de cotizaciones con IGV 18%, cierre de ventas y consulta de existencias.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!isWarehouse && (
            <button
              id="btn-dash-new-sale"
              onClick={onOpenNewSale}
              className="px-3.5 py-2 bg-[#C8102E] hover:bg-[#A80C25] text-white rounded text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Nueva Venta</span>
            </button>
          )}

          {!isWarehouse && (
            <button
              id="btn-dash-new-quote"
              onClick={onOpenNewQuote}
              className="px-3.5 py-2 bg-[#1E1E1E] hover:bg-[#2D2D2D] text-white border border-[#2D2D2D] rounded text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#9CA3AF]" />
              <span>Nueva Cotización</span>
            </button>
          )}

          {isWarehouse && (
            <button
              id="btn-dash-new-prod"
              onClick={onOpenNewProduct}
              className="px-3.5 py-2 bg-[#C8102E] hover:bg-[#A80C25] text-white rounded text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Producto</span>
            </button>
          )}

          <button
            id="btn-dash-refresh"
            onClick={onRefresh}
            className="p-2 bg-[#1E1E1E] hover:bg-[#2D2D2D] text-[#9CA3AF] hover:text-white rounded border border-[#2D2D2D] transition-colors cursor-pointer"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid - Industrial Surface Layering */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Stock Value */}
        <div className="bg-[#141414] p-4 rounded border border-[#2D2D2D] hover:border-[#474747] transition-all">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-[#9CA3AF] uppercase font-bold tracking-wider font-mono">Valorización Almacén</p>
            <span className="text-[9px] px-1.5 py-0.2 bg-[#1E1E1E] text-white rounded font-mono border border-[#2D2D2D]">KARDEX</span>
          </div>
          <h3 className="text-2xl font-bold text-white font-mono tabular-nums">
            {currency} {metrics.totalInventoryValuation.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-[#9CA3AF] mt-2 flex items-center gap-1 font-medium">
            <Package className="w-3.5 h-3.5 text-[#C8102E]" />
            <span>{metrics.totalProductsCount} productos en catálogo</span>
          </p>
        </div>

        {/* Pending Quotes */}
        <div className="bg-[#141414] p-4 rounded border border-[#2D2D2D] hover:border-[#F59E0B]/50 transition-all">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-[#9CA3AF] uppercase font-bold tracking-wider font-mono">Cotizaciones Pendientes</p>
            <span className="text-[9px] px-1.5 py-0.2 bg-[rgba(245,158,11,0.14)] text-[#FDE68A] rounded font-mono border border-[#F59E0B]">SEGUIMIENTO</span>
          </div>
          <h3 className="text-2xl font-bold text-white font-mono tabular-nums">{metrics.pendingQuotesCount}</h3>
          <p className="text-xs text-[#FDE68A] mt-2 flex items-center gap-1 font-medium">
            <Clock className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>{metrics.approvedQuotesCount} aprobadas / listas para venta</span>
          </p>
        </div>

        {/* Inventory Alerts */}
        <div className="bg-[#141414] p-4 rounded border border-[#2D2D2D] hover:border-[#C8102E]/50 transition-all">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-[#9CA3AF] uppercase font-bold tracking-wider font-mono">Alertas de Stock</p>
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono ${
              criticalProducts.length > 0 
                ? 'bg-[rgba(200,16,46,0.14)] text-[#FFDAD8] border border-[#C8102E]' 
                : 'bg-[rgba(16,185,129,0.14)] text-[#A7F3D0] border border-[#10B981]'
            }`}>
              REPOSICIÓN
            </span>
          </div>
          <h3 className={`text-2xl font-bold font-mono tabular-nums ${criticalProducts.length > 0 ? 'text-[#FFDAD8]' : 'text-white'}`}>
            {criticalProducts.length}
          </h3>
          <p className={`text-xs mt-2 flex items-center gap-1 font-medium ${criticalProducts.length > 0 ? 'text-[#FFDAD8]' : 'text-[#A7F3D0]'}`}>
            <AlertTriangle className={`w-3.5 h-3.5 ${criticalProducts.length > 0 ? 'text-[#C8102E]' : 'text-[#10B981]'}`} />
            <span>{criticalProducts.length > 0 ? 'Reposición requerida urgente' : 'Stock en nivel óptimo'}</span>
          </p>
        </div>

        {/* Monthly Sales */}
        <div className="bg-[#141414] p-4 rounded border border-[#2D2D2D] hover:border-[#10B981]/50 transition-all">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-[#9CA3AF] uppercase font-bold tracking-wider font-mono">Ventas del Mes</p>
            <span className="text-[9px] px-1.5 py-0.2 bg-[rgba(16,185,129,0.14)] text-[#A7F3D0] rounded font-mono border border-[#10B981]">IGV 18%</span>
          </div>
          <h3 className="text-2xl font-bold text-white font-mono tabular-nums">
            {currency} {metrics.totalSalesMonth.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-[#A7F3D0] mt-2 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5 text-[#10B981]" />
            <span>{metrics.totalSalesCountMonth} comprobantes emitidos</span>
          </p>
        </div>

      </div>

      {/* Main Grid: Sales Chart & Quick Action Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Sales by Day Chart (2 cols on lg) */}
        <div className="lg:col-span-2 bg-[#141414] rounded border border-[#2D2D2D] flex flex-col justify-between overflow-hidden">
          <div className="p-4 border-b border-[#2D2D2D] flex items-center justify-between">
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-white font-mono">Comportamiento Diario de Facturación</h4>
              <p className="text-[11px] text-[#9CA3AF] mt-1">Ingresos comerciales de los últimos 7 días con desglose</p>
            </div>
            <button
              id="btn-goto-sales-history"
              onClick={() => onNavigate('sales')}
              className="text-xs font-semibold text-[#D1D5DB] hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Ver Historial</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#C8102E]" />
            </button>
          </div>

          {/* Bar Visualizer */}
          <div className="p-4">
            <div className="h-44 flex items-end justify-between gap-3 pt-4 pb-2 px-2">
              {metrics.salesByDay.map((day, idx) => {
                const heightPercent = maxDaySales > 0 ? Math.max((day.total / maxDaySales) * 100, 6) : 6;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <div className="text-[10px] font-mono text-[#D1D5DB] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {currency}{formatAmount(day.total, 0)}
                    </div>
                    <div 
                      className="w-full bg-[#8A091E] hover:bg-[#C8102E] rounded-t transition-colors relative overflow-hidden"
                      style={{ height: `${heightPercent}%` }}
                    >
                      <div className="absolute inset-x-0 bottom-0 bg-[#C8102E] h-1/2 opacity-80 group-hover:opacity-100"></div>
                    </div>
                    <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-tight font-mono">
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-4 py-3 bg-[#0E0E0E] border-t border-[#2D2D2D] flex items-center justify-between text-xs text-[#9CA3AF]">
            <span>Total semana: <strong className="text-white font-mono">{currency} {formatAmount(metrics.salesByDay.reduce((a, b) => a + b.total, 0))}</strong></span>
            <span className="font-mono">{metrics.salesByDay.reduce((a, b) => a + b.count, 0)} transacciones</span>
          </div>
        </div>

        {/* Quick Action & Critical Stock Card (1 col on lg) */}
        <div className="flex flex-col gap-4">
          
          {/* Quick Quote Card */}
          <div className="bg-[#1E1E1E] rounded p-5 text-white border border-[#2D2D2D]">
            <h4 className="text-[14px] font-bold tracking-tight mb-1.5 uppercase font-mono">Cotización Rápida</h4>
            <p className="text-xs text-[#9CA3AF] mb-4 leading-relaxed">Emite una cotización formal con IGV 18% vinculada a stock y exportable en PDF industrial.</p>
            <button 
              onClick={onOpenNewQuote}
              className="w-full py-2.5 bg-[#C8102E] text-white rounded text-xs font-bold hover:bg-[#A80C25] transition-colors cursor-pointer"
            >
              + Nueva Cotización
            </button>
          </div>

          {/* Critical Stock Alert Card */}
          <div className="bg-[#141414] rounded border border-[#2D2D2D] flex-1 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-white font-mono">Stock Crítico</h4>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase font-mono ${
                  criticalProducts.length > 0 ? 'bg-[rgba(200,16,46,0.14)] text-[#FFDAD8] border border-[#C8102E]' : 'bg-[rgba(16,185,129,0.14)] text-[#A7F3D0] border border-[#10B981]'
                }`}>
                  {criticalProducts.length} Items
                </span>
              </div>

              {criticalProducts.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#9CA3AF] space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-[#10B981] mx-auto mb-1" />
                  <p className="font-bold text-white">Inventario en nivel óptimo</p>
                  <p className="text-[11px] text-[#9CA3AF]">Todos los productos superan el stock mínimo.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {criticalProducts.slice(0, 3).map(prod => (
                    <div 
                      key={prod.id} 
                      className="p-2.5 bg-[#1E1E1E] border border-[#2D2D2D] rounded flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-white truncate">{prod.name}</p>
                        <p className="text-[10px] text-[#9CA3AF] font-mono">SKU: {prod.sku}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold block mb-1 uppercase font-mono ${
                          prod.stock === 0 
                            ? 'bg-[rgba(200,16,46,0.14)] text-[#FFDAD8] border border-[#C8102E]' 
                            : 'bg-[rgba(245,158,11,0.14)] text-[#FDE68A] border border-[#F59E0B]'
                        }`}>
                          {prod.stock === 0 ? 'Agotado' : `${prod.stock} ${prod.unit}`}
                        </span>
                        <button
                          onClick={() => onOpenStockAdjust(prod)}
                          className="text-[10px] text-[#C8102E] hover:underline font-bold cursor-pointer"
                        >
                          + Reponer
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              id="btn-goto-inventory"
              onClick={() => onNavigate('inventory')}
              className="w-full mt-3 py-2 bg-[#1E1E1E] hover:bg-[#2D2D2D] text-[#D1D5DB] hover:text-white text-xs font-bold rounded border border-[#2D2D2D] transition-colors text-center cursor-pointer"
            >
              Ver Todo el Inventario
            </button>
          </div>

        </div>

      </div>

      {/* Secondary Row: Top Selling Products & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Top 5 Products */}
        <div className="bg-[#141414] rounded border border-[#2D2D2D] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#2D2D2D] flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">Productos Más Vendidos</h4>
            <span className="text-[11px] text-[#9CA3AF]">Por unidades y facturación</span>
          </div>

          {metrics.topSellingProducts.length === 0 ? (
            <p className="text-xs text-[#9CA3AF] py-6 text-center">Aún no se registran ventas en el sistema.</p>
          ) : (
            <div className="divide-y divide-[#2D2D2D]">
              {metrics.topSellingProducts.map((p, idx) => (
                <div key={p.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-[#1E1E1E] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 h-5 rounded bg-[#1E1E1E] border border-[#2D2D2D] text-[#C8102E] font-bold flex items-center justify-center text-[10px] shrink-0 font-mono">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <p className="font-semibold text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-[#9CA3AF] font-mono">SKU: {p.sku}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-3">
                    <p className="font-bold text-white font-mono tabular-nums">{currency} {formatAmount(p.revenue)}</p>
                    <p className="text-[10px] text-[#9CA3AF] font-mono">{p.soldQuantity} unid. vendidas</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Quotes with High-Density Status */}
        <div className="bg-[#141414] rounded border border-[#2D2D2D] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#2D2D2D] flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">Cotizaciones Recientes</h4>
            <button
              onClick={() => onNavigate('quotes')}
              className="text-xs font-semibold text-[#D1D5DB] hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todas</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#C8102E]" />
            </button>
          </div>

          {metrics.recentQuotes.length === 0 ? (
            <p className="text-xs text-[#9CA3AF] py-6 text-center">No hay cotizaciones registradas.</p>
          ) : (
            <div className="divide-y divide-[#2D2D2D]">
              {metrics.recentQuotes.map(q => {
                const statusColors: Record<string, string> = {
                  DRAFT: 'bg-[#1E1E1E] text-[#D1D5DB] border border-[#2D2D2D]',
                  SENT: 'bg-[#1E3A8A]/50 text-[#DBEAFE] border border-[#3B82F6]',
                  APPROVED: 'bg-[rgba(16,185,129,0.14)] text-[#A7F3D0] border border-[#10B981]',
                  CONVERTED: 'bg-[#8A091E]/50 text-[#FFDAD8] border border-[#C8102E]',
                  REJECTED: 'bg-[rgba(200,16,46,0.14)] text-[#FFDAD8] border border-[#C8102E]',
                  EXPIRED: 'bg-[rgba(245,158,11,0.14)] text-[#FDE68A] border border-[#F59E0B]'
                };
                const statusLabels: Record<string, string> = {
                  DRAFT: 'Borrador',
                  SENT: 'Enviada',
                  APPROVED: 'Aprobada',
                  CONVERTED: 'Convertida',
                  REJECTED: 'Rechazada',
                  EXPIRED: 'Vencida'
                };

                return (
                  <div key={q.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-[#1E1E1E] transition-colors">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white">{q.quoteNumber}</span>
                        <span className={`px-2 py-0.2 rounded text-[9px] font-bold uppercase font-mono ${statusColors[q.status] || 'bg-[#1E1E1E] text-white'}`}>
                          {statusLabels[q.status] || q.status}
                        </span>
                      </div>
                      <p className="text-[#9CA3AF] truncate mt-0.5">{q.customerName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-white font-mono tabular-nums">{q.currency} {formatAmount(q.total)}</p>
                      <p className="text-[10px] text-[#9CA3AF] font-mono">{q.date}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </div>
  );
};
