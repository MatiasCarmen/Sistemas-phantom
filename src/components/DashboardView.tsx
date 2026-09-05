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
      
      {/* Top Banner & Quick Actions - Role-Aware & Didactic */}
      <div className="bg-[linear-gradient(135deg,#f0fdfb_0%,#eff6ff_35%,#ffffff_100%)] rounded-3xl p-5 text-slate-800 shadow-[0_20px_45px_rgba(148,163,184,0.14)] border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border ${
              isAdmin ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
              isWarehouse ? 'bg-amber-100 text-amber-700 border-amber-200' :
              isCashier ? 'bg-sky-100 text-sky-700 border-sky-200' :
              'bg-emerald-100 text-emerald-700 border-emerald-200'
            }`}>
              {isAdmin ? 'Panel Ejecutivo & Control Total' :
               isWarehouse ? 'Panel de Operaciones de Almacén' :
               isCashier ? 'Punto de Venta & Caja' :
               'Panel Comercial & Cotizaciones'}
            </span>
            <span className="text-[11px] text-slate-400">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 mt-1">
            Bienvenido, {currentUser?.name || 'Usuario'}
          </h2>
          <p className="text-xs text-slate-600 max-w-2xl mt-0.5">
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
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Nueva Venta</span>
            </button>
          )}

          {!isWarehouse && (
            <button
              id="btn-dash-new-quote"
              onClick={onOpenNewQuote}
              className="px-3.5 py-2 bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center gap-2 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Nueva Cotización</span>
            </button>
          )}

          {isWarehouse && (
            <button
              id="btn-dash-new-prod"
              onClick={onOpenNewProduct}
              className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Producto</span>
            </button>
          )}

          <button
            id="btn-dash-refresh"
            onClick={onRefresh}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors border border-slate-700 cursor-pointer"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid - High Density 4 Columns with Didactic Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Stock Value (Visible for Admin & Warehouse) */}
        <div className="bg-[linear-gradient(135deg,#4f647d_0%,#536a7d_40%,#596f86_100%)] p-4 rounded-2xl shadow-[0_12px_28px_rgba(71,85,105,0.18)] border border-slate-500/40 hover:-translate-y-0.5 transition-all">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-slate-200 uppercase font-bold tracking-wider">Valorización Almacén</p>
            <span className="text-[9px] px-1.5 py-0.2 bg-white/10 text-slate-100 rounded font-mono border border-white/10">KARDEX</span>
          </div>
          <h3 className="text-2xl font-bold text-white">
            {currency} {metrics.totalInventoryValuation.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-cyan-100 mt-2 flex items-center gap-1 font-medium">
            <Package className="w-3.5 h-3.5" />
            <span>{metrics.totalProductsCount} productos en catálogo activo</span>
          </p>
        </div>

        {/* Pending Quotes */}
        <div className="bg-white/95 p-4 rounded-2xl shadow-[0_10px_30px_rgba(15,23,42,0.05)] border border-slate-200 hover:border-amber-300 transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Cotizaciones Pendientes</p>
            <span className="text-[9px] px-1.5 py-0.2 bg-amber-50 text-amber-700 rounded font-mono border border-amber-100">SEGUIMIENTO</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800">{metrics.pendingQuotesCount}</h3>
          <p className="text-xs text-amber-600 mt-2 flex items-center gap-1 font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>{metrics.approvedQuotesCount} aprobadas / listas para venta</span>
          </p>
        </div>

        {/* Inventory Alerts */}
        <div className="bg-white/95 p-4 rounded-2xl shadow-[0_10px_30px_rgba(15,23,42,0.05)] border border-slate-200 hover:border-rose-300 transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Alertas de Stock</p>
            <span className="text-[9px] px-1.5 py-0.2 bg-rose-50 text-rose-700 rounded font-mono border border-rose-100">REPOSICIÓN</span>
          </div>
          <h3 className={`text-2xl font-bold ${criticalProducts.length > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
            {criticalProducts.length}
          </h3>
          <p className={`text-xs mt-2 flex items-center gap-1 font-medium ${criticalProducts.length > 0 ? 'text-rose-500' : 'text-emerald-600'}`}>
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{criticalProducts.length > 0 ? 'Reposición requerida urgente' : 'Stock en nivel óptimo'}</span>
          </p>
        </div>

        {/* Monthly Sales */}
        <div className="bg-white/95 p-4 rounded-2xl shadow-[0_10px_30px_rgba(15,23,42,0.05)] border border-slate-200 hover:border-emerald-300 transition-all hover:-translate-y-0.5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Ventas del Mes</p>
            <span className="text-[9px] px-1.5 py-0.2 bg-emerald-50 text-emerald-700 rounded font-mono border border-emerald-100">IGV 18%</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-800">
            {currency} {metrics.totalSalesMonth.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{metrics.totalSalesCountMonth} comprobantes emitidos</span>
          </p>
        </div>

      </div>

      {/* Main Grid: Sales Chart & Quick Action Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* Sales by Day Chart (2 cols on lg) */}
        <div className="lg:col-span-2 bg-gradient-to-b from-slate-800 via-slate-800 to-slate-700 rounded-2xl shadow-[0_18px_38px_rgba(15,23,42,0.25)] border border-slate-600/80 flex flex-col justify-between overflow-hidden">
          <div className="p-4 border-b border-slate-600/80 flex items-center justify-between">
            <div>
              <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-100">Comportamiento Diario de Facturación</h4>
              <p className="text-[11px] text-slate-300 mt-1">Ingresos comerciales de los últimos 7 días con desglose</p>
            </div>
            <button
              id="btn-goto-sales-history"
              onClick={() => onNavigate('sales')}
              className="text-xs font-semibold text-indigo-200 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
            >
              <span>Ver Historial</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Bar Visualizer */}
          <div className="p-4">
            <div className="h-44 flex items-end justify-between gap-3 pt-4 pb-2 px-2">
              {metrics.salesByDay.map((day, idx) => {
                const heightPercent = maxDaySales > 0 ? Math.max((day.total / maxDaySales) * 100, 6) : 6;
                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                    <div className="text-[10px] font-semibold text-slate-50 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-sm">
                      {currency}{formatAmount(day.total, 0)}
                    </div>
                    <div 
                      className="w-full bg-gradient-to-t from-indigo-500 to-indigo-300 hover:from-indigo-400 hover:to-indigo-200 rounded-t-lg transition-all relative overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
                      style={{ height: `${heightPercent}%` }}
                    >
                      <div className="absolute inset-x-0 bottom-0 bg-indigo-600/90 h-3/4 opacity-90 group-hover:opacity-100"></div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-200 uppercase tracking-tight">
                      {day.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="px-4 py-3 bg-slate-700/60 border-t border-slate-600 flex items-center justify-between text-xs text-slate-200">
            <span>Total semana: <strong className="text-white">{currency} {formatAmount(metrics.salesByDay.reduce((a, b) => a + b.total, 0))}</strong></span>
            <span>{metrics.salesByDay.reduce((a, b) => a + b.count, 0)} transacciones registradas</span>
          </div>
        </div>

        {/* High-Density Quick Action + Critical Stock Card (1 col on lg) */}
        <div className="flex flex-col gap-4">
          
          {/* Quick Quote High-Density Card */}
          <div className="bg-gradient-to-br from-indigo-600 via-indigo-650 to-indigo-800 rounded-[22px] p-5 text-white shadow-[0_16px_32px_rgba(79,70,229,0.25)] border border-indigo-400/40">
            <h4 className="text-[15px] font-black tracking-tight mb-2">Cotización Comercial Rápida</h4>
            <p className="text-sm text-indigo-100/90 mb-4 leading-relaxed">Emite una cotización formal vinculada con inventario y exportable en PDF profesional.</p>
            <button 
              onClick={onOpenNewQuote}
              className="w-full py-3 bg-white text-indigo-700 rounded-xl text-sm font-black hover:bg-slate-50 transition-colors shadow-sm cursor-pointer"
            >
              + Nueva Cotización
            </button>
          </div>

          {/* Critical Stock Alert Card */}
          <div className="bg-slate-800/90 rounded-[22px] shadow-[0_14px_28px_rgba(15,23,42,0.25)] border border-slate-600/80 flex-1 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[11px] font-black uppercase tracking-[0.12em] text-slate-100">Stock Crítico</h4>
                <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase shadow-sm ${
                  criticalProducts.length > 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  {criticalProducts.length} Items
                </span>
              </div>

              {criticalProducts.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-200 space-y-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                  <p className="font-bold text-slate-100">¡Inventario óptimo!</p>
                  <p className="text-[11px] text-slate-300">Todos los productos superan el stock mínimo.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {criticalProducts.slice(0, 3).map(prod => (
                    <div 
                      key={prod.id} 
                      className="p-2.5 bg-slate-700/70 border border-slate-600 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="min-w-0 pr-2">
                        <p className="font-bold text-slate-100 truncate">{prod.name}</p>
                        <p className="text-[10px] text-slate-300 font-mono">SKU: {prod.sku}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`px-2 py-0.2 rounded-full text-[9px] font-black block mb-1 uppercase ${
                          prod.stock === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                          {prod.stock === 0 ? 'Agotado' : `${prod.stock} ${prod.unit}`}
                        </span>
                        <button
                          onClick={() => onOpenStockAdjust(prod)}
                          className="text-[10px] text-indigo-300 hover:text-indigo-200 font-bold cursor-pointer"
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
              className="w-full mt-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition-colors text-center cursor-pointer"
            >
              Ver Todo el Inventario
            </button>
          </div>

        </div>

      </div>

      {/* Secondary Row: Top Selling Products & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Top 5 Products Table Style */}
        <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Productos Más Vendidos</h4>
            <span className="text-[11px] text-slate-400">Por unidades y facturación</span>
          </div>

          {metrics.topSellingProducts.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">Aún no se registran ventas en el sistema.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {metrics.topSellingProducts.map((p, idx) => (
                <div key={p.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-5 h-5 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <p className="font-semibold text-slate-800 truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-400 font-mono">SKU: {p.sku}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-3">
                    <p className="font-bold text-slate-900">{currency} {formatAmount(p.revenue)}</p>
                    <p className="text-[10px] text-slate-500">{p.soldQuantity} unid. vendidas</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Quotes with High-Density Status */}
        <div className="bg-white rounded-2xl shadow-2xs border border-slate-200 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Cotizaciones Recientes</h4>
            <button
              onClick={() => onNavigate('quotes')}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
            >
              <span>Ver todas</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {metrics.recentQuotes.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No hay cotizaciones registradas.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {metrics.recentQuotes.map(q => {
                const statusColors: Record<string, string> = {
                  DRAFT: 'bg-slate-100 text-slate-700',
                  SENT: 'bg-blue-100 text-blue-800',
                  APPROVED: 'bg-emerald-100 text-emerald-800',
                  CONVERTED: 'bg-purple-100 text-purple-800',
                  REJECTED: 'bg-rose-100 text-rose-800',
                  EXPIRED: 'bg-amber-100 text-amber-800'
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
                  <div key={q.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50/50 transition-colors">
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{q.quoteNumber}</span>
                        <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold uppercase ${statusColors[q.status] || 'bg-slate-100 text-slate-700'}`}>
                          {statusLabels[q.status] || q.status}
                        </span>
                      </div>
                      <p className="text-slate-600 truncate mt-0.5">{q.customerName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-slate-900">{q.currency} {formatAmount(q.total)}</p>
                      <p className="text-[10px] text-slate-400">{q.date}</p>
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
