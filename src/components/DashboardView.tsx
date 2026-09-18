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
  Sparkles,
  Target,
  Award,
  Flame,
  Store,
  Building2,
  PieChart,
  Gamepad2
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

  // Meta de Ventas por Tienda (Objetivo mensual corporativo)
  const monthlySalesTarget = 50000; // S/ 50,000.00 Meta Objetivo
  const targetAchievedPercent = Math.min(100, Math.round((metrics.totalSalesMonth / monthlySalesTarget) * 100));
  const remainingToTarget = Math.max(0, monthlySalesTarget - metrics.totalSalesMonth);

  // Top 3 Productos de Alta Rotación (BI)
  const topProducts = (metrics.topSellingProducts && metrics.topSellingProducts.length > 0)
    ? metrics.topSellingProducts.slice(0, 3)
    : [
        {
          id: 'top-1',
          name: 'Consola PlayStation 5 Slim Digital 1TB',
          sku: 'CON-PS5-SLIM-DIG',
          soldQuantity: 34,
          revenue: 64566.00
        },
        {
          id: 'top-2',
          name: 'Figura Funko Pop! Animation - Charizard #843',
          sku: 'FNK-POK-CHAR843',
          soldQuantity: 52,
          revenue: 4108.00
        },
        {
          id: 'top-3',
          name: 'Consola Nintendo Switch OLED Neon Blue/Red',
          sku: 'CON-NSW-OLED-NEO',
          soldQuantity: 19,
          revenue: 30381.00
        }
      ];

  // Rentabilidad y Ventas por Tienda (8 Sucursales Phantom)
  const branchStores = [
    { id: 'jockey', name: 'Jockey Plaza', city: 'Surco, Lima', sales: 28450, transactions: 142, margin: 34.5 },
    { id: 'san-miguel', name: 'Plaza San Miguel', city: 'San Miguel, Lima', sales: 21890, transactions: 118, margin: 31.8 },
    { id: 'plaza-norte', name: 'Plaza Norte', city: 'Independencia, Lima', sales: 19420, transactions: 105, margin: 29.4 },
    { id: 'mall-sur', name: 'Mall del Sur', city: 'SJM, Lima', sales: 16800, transactions: 89, margin: 28.1 },
    { id: 'lima-centro', name: 'Lima Centro', city: 'Real Plaza Centro', sales: 14350, transactions: 76, margin: 26.5 },
    { id: 'arequipa', name: 'Mall Aventura', city: 'Arequipa', sales: 12640, transactions: 63, margin: 27.2 },
    { id: 'trujillo', name: 'Real Plaza', city: 'Trujillo', sales: 9820, transactions: 49, margin: 25.0 },
    { id: 'huancayo', name: 'Real Plaza', city: 'Huancayo', sales: 5180, transactions: 27, margin: 22.8 },
  ];

  const maxBranchSales = Math.max(...branchStores.map(b => b.sales));
  const minBranchSales = Math.min(...branchStores.map(b => b.sales));
  const totalNetworkSales = branchStores.reduce((acc, b) => acc + b.sales, 0);
  const avgStoreSales = Math.round(totalNetworkSales / branchStores.length);
  const topStore = branchStores.find(b => b.sales === maxBranchSales);
  const bottomStore = branchStores.find(b => b.sales === minBranchSales);

  // Distribución de Ventas por Categoría de Producto
  const categoryDistribution = [
    { name: 'Consolas', share: 44, amount: 56562, color: '#C8102E', bg: 'bg-[#C8102E]', text: 'text-[#FFDAD8]', desc: 'PS5 Slim, Nintendo Switch OLED, Xbox Series' },
    { name: 'Videojuegos', share: 26, amount: 33423, color: '#3B82F6', bg: 'bg-[#3B82F6]', text: 'text-[#DBEAFE]', desc: 'Juegos físicos PS5/PS4/Switch y novedades' },
    { name: 'Coleccionables (Funko / TCG)', share: 18, amount: 23139, color: '#F59E0B', bg: 'bg-[#F59E0B]', text: 'text-[#FDE68A]', desc: 'Funko Pop!, cartas Pokémon TCG y figuras' },
    { name: 'Periféricos Gamer', share: 12, amount: 15426, color: '#10B981', bg: 'bg-[#10B981]', text: 'text-[#A7F3D0]', desc: 'Headsets Razer/Logitech, mandos DualSense' }
  ];
  const totalCategorySales = categoryDistribution.reduce((sum, c) => sum + c.amount, 0);

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

        {/* Meta de Ventas por Tienda */}
        <div className="bg-[#141414] p-4 rounded border border-[#2D2D2D] hover:border-[#C8102E]/60 transition-all flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-[#C8102E]" />
                <p className="text-[10px] text-[#9CA3AF] uppercase font-bold tracking-wider font-mono">Meta de Ventas Tienda</p>
              </div>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold border ${
                targetAchievedPercent >= 100 
                  ? 'bg-[rgba(16,185,129,0.14)] text-[#A7F3D0] border-[#10B981]' 
                  : 'bg-[rgba(200,16,46,0.14)] text-[#FFDAD8] border-[#C8102E]'
              }`}>
                {targetAchievedPercent}% LOGRADO
              </span>
            </div>

            <div className="flex items-baseline justify-between gap-1">
              <div>
                <span className="text-[10px] text-[#9CA3AF] block font-mono">Monto Logrado:</span>
                <h3 className="text-xl sm:text-2xl font-bold text-white font-mono tabular-nums">
                  {currency} {metrics.totalSalesMonth.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#9CA3AF] block font-mono">Meta Objetivo:</span>
                <span className="text-xs font-bold text-[#D1D5DB] font-mono tabular-nums">
                  {currency} {monthlySalesTarget.toLocaleString('es-ES', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Visual Progress Bar */}
            <div className="mt-2.5">
              <div className="w-full bg-[#1E1E1E] rounded-full h-2 border border-[#2D2D2D] overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    targetAchievedPercent >= 100 
                      ? 'bg-gradient-to-r from-[#064E3B] to-[#10B981]' 
                      : 'bg-gradient-to-r from-[#8A091E] to-[#C8102E]'
                  }`}
                  style={{ width: `${Math.max(6, targetAchievedPercent)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-[10px] text-[#9CA3AF] mt-2 pt-2 border-t border-[#2D2D2D]/60 font-mono">
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-[#10B981]" />
              <span>{metrics.totalSalesCountMonth} comprobantes</span>
            </span>
            <span className={targetAchievedPercent >= 100 ? 'text-[#A7F3D0] font-bold' : 'text-[#D1D5DB]'}>
              {targetAchievedPercent >= 100 
                ? '¡Meta superada!' 
                : `Falta: ${currency} ${remainingToTarget.toLocaleString('es-ES', { minimumFractionDigits: 2 })}`}
            </span>
          </div>
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

          {/* Critical Stock Alert Card with Industrial Semáforo */}
          <div className="bg-[#141414] rounded border border-[#2D2D2D] flex-1 p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-[#0E0E0E] border border-[#2D2D2D]">
                    <span className="w-2 h-2 rounded-full bg-[#C8102E] animate-pulse" title="Semáforo: Rojo (Crítico)" />
                    <span className="w-2 h-2 rounded-full bg-[#F59E0B]" title="Semáforo: Ámbar (Alerta)" />
                    <span className="w-2 h-2 rounded-full bg-[#10B981]" title="Semáforo: Verde (Óptimo)" />
                  </div>
                  <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-white font-mono">Stock Crítico (Semáforo BI)</h4>
                </div>
                <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase font-mono ${
                  criticalProducts.length > 0 ? 'bg-[rgba(200,16,46,0.14)] text-[#FFDAD8] border border-[#C8102E]' : 'bg-[rgba(16,185,129,0.14)] text-[#A7F3D0] border border-[#10B981]'
                }`}>
                  {criticalProducts.length} Items en Riesgo
                </span>
              </div>

              {criticalProducts.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#9CA3AF] space-y-1 bg-[#0E0E0E] rounded border border-[#2D2D2D]/60 p-3">
                  <CheckCircle2 className="w-6 h-6 text-[#10B981] mx-auto mb-1" />
                  <p className="font-bold text-white">Inventario en nivel óptimo (Semáforo Verde)</p>
                  <p className="text-[11px] text-[#9CA3AF]">Todos los productos superan el stock de seguridad mínimo.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                  {criticalProducts.slice(0, 3).map(prod => {
                    const isZeroStock = prod.stock === 0;
                    return (
                      <div 
                        key={prod.id} 
                        className={`p-2.5 rounded border transition-colors ${
                          isZeroStock 
                            ? 'bg-[#410006]/30 border-[#C8102E]/60 hover:border-[#C8102E]' 
                            : 'bg-[#1E1E1E] border-[#2D2D2D] hover:border-[#F59E0B]/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex items-start gap-2">
                            <span 
                              className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${
                                isZeroStock ? 'bg-[#C8102E] animate-pulse shadow-[0_0_8px_#C8102E]' : 'bg-[#F59E0B] shadow-[0_0_6px_#F59E0B]'
                              }`}
                              title={isZeroStock ? 'Semáforo Rojo: Agotado' : 'Semáforo Ámbar: Stock Mínimo'}
                            />
                            <div className="truncate">
                              <p className="font-bold text-white text-xs truncate">{prod.name}</p>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] font-mono text-[#9CA3AF]">
                                <span>SKU: {prod.sku}</span>
                                <span>•</span>
                                <span className="text-white font-bold">Stock: {prod.stock} {prod.unit}</span>
                                <span className="text-[#9CA3AF]">(Mín: {prod.minStock})</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold block mb-1 uppercase font-mono ${
                              isZeroStock 
                                ? 'bg-[rgba(200,16,46,0.14)] text-[#FFDAD8] border border-[#C8102E]' 
                                : 'bg-[rgba(245,158,11,0.14)] text-[#FDE68A] border border-[#F59E0B]'
                            }`}>
                              {isZeroStock ? 'Agotado' : 'Bajo Stock'}
                            </span>
                            <button
                              onClick={() => onOpenStockAdjust(prod)}
                              className="text-[10px] text-[#C8102E] hover:text-[#ffb3b1] hover:underline font-bold cursor-pointer inline-flex items-center gap-0.5"
                            >
                              <span>+ Reponer</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              id="btn-goto-inventory"
              onClick={() => onNavigate('inventory')}
              className="w-full mt-3 py-2 bg-[#1E1E1E] hover:bg-[#2D2D2D] text-[#D1D5DB] hover:text-white text-xs font-bold rounded border border-[#2D2D2D] transition-colors text-center cursor-pointer"
            >
              Ver Todo el Inventario & Reponer
            </button>
          </div>

        </div>

      </div>

      {/* Visual Analytics & BI Section: 8 Stores Performance & Category Breakdown */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        
        {/* Panel 1: Gráfico de Rentabilidad y Ventas por Tienda (8 Sucursales) */}
        <div className="bg-[#141414] rounded border border-[#2D2D2D] flex flex-col justify-between overflow-hidden">
          <div className="p-4 border-b border-[#2D2D2D] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Store className="w-4 h-4 text-[#C8102E]" />
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-white font-mono">
                  Rendimiento y Ventas por Tienda (8 Sucursales)
                </h4>
                <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                  Comparativa de facturación mensual en la red nacional de tiendas Phantom
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 font-mono text-[9px] font-bold">
              <span className="px-2 py-0.5 rounded bg-[rgba(16,185,129,0.14)] text-[#A7F3D0] border border-[#10B981] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                <span>Líder: {topStore?.name}</span>
              </span>
              <span className="px-2 py-0.5 rounded bg-[rgba(200,16,46,0.14)] text-[#FFDAD8] border border-[#C8102E] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E]" />
                <span>Menor: {bottomStore?.name}</span>
              </span>
            </div>
          </div>

          {/* Comparative Horizontal Bars */}
          <div className="p-4 space-y-3">
            {branchStores.map((branch) => {
              const isTop = branch.sales === maxBranchSales;
              const isBottom = branch.sales === minBranchSales;
              const percentOfMax = Math.round((branch.sales / maxBranchSales) * 100);
              const shareOfTotal = ((branch.sales / totalNetworkSales) * 100).toFixed(1);

              return (
                <div key={branch.id} className="group">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        isTop ? 'bg-[#10B981] shadow-[0_0_8px_#10B981]' :
                        isBottom ? 'bg-[#C8102E] shadow-[0_0_8px_#C8102E]' :
                        'bg-[#9CA3AF]'
                      }`} />
                      <span className="font-bold text-white text-xs truncate font-mono">
                        {branch.name}
                      </span>
                      <span className="text-[10px] text-[#9CA3AF] hidden md:inline font-mono">
                        ({branch.city})
                      </span>
                      {isTop && (
                        <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold rounded bg-[rgba(16,185,129,0.14)] text-[#A7F3D0] border border-[#10B981]">
                          MAYOR RENDIMIENTO
                        </span>
                      )}
                      {isBottom && (
                        <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold rounded bg-[rgba(200,16,46,0.14)] text-[#FFDAD8] border border-[#C8102E]">
                          MENOR VENTAS
                        </span>
                      )}
                    </div>
                    <div className="text-right shrink-0 font-mono text-xs">
                      <span className="font-bold text-white tabular-nums">
                        {currency} {formatAmount(branch.sales)}
                      </span>
                      <span className="text-[10px] text-[#9CA3AF] ml-1.5">
                        ({shareOfTotal}%)
                      </span>
                    </div>
                  </div>

                  {/* Progress Bar with Color Semaphore */}
                  <div className="w-full bg-[#1E1E1E] rounded-full h-3 border border-[#2D2D2D] overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 relative ${
                        isTop 
                          ? 'bg-[#10B981]' 
                          : isBottom 
                            ? 'bg-[#C8102E]' 
                            : 'bg-gradient-to-r from-[#8A091E] to-[#bf0229] group-hover:from-[#A80C25] group-hover:to-[#C8102E]'
                      }`}
                      style={{ width: `${percentOfMax}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Network Summary Footer */}
          <div className="px-4 py-3 bg-[#0E0E0E] border-t border-[#2D2D2D] grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className="border-r border-[#2D2D2D] pr-2">
              <span className="text-[10px] text-[#9CA3AF] block uppercase">Total Red 8 Tiendas</span>
              <span className="font-bold text-white tabular-nums">{currency} {formatAmount(totalNetworkSales)}</span>
            </div>
            <div className="border-r border-[#2D2D2D] px-2">
              <span className="text-[10px] text-[#9CA3AF] block uppercase">Promedio por Tienda</span>
              <span className="font-bold text-white tabular-nums">{currency} {formatAmount(avgStoreSales)}</span>
            </div>
            <div className="pl-2">
              <span className="text-[10px] text-[#9CA3AF] block uppercase">Tienda Líder</span>
              <span className="font-bold text-[#A7F3D0] truncate block">{topStore?.name}</span>
            </div>
          </div>
        </div>

        {/* Panel 2: Gráfico de Distribución por Categoría de Producto */}
        <div className="bg-[#141414] rounded border border-[#2D2D2D] flex flex-col justify-between overflow-hidden">
          <div className="p-4 border-b border-[#2D2D2D] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#C8102E]" />
              <div>
                <h4 className="text-[11px] font-bold uppercase tracking-[0.12em] text-white font-mono">
                  Distribución de Ventas por Categoría
                </h4>
                <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                  Mix de facturación en consolas, videojuegos, coleccionables y periféricos
                </p>
              </div>
            </div>
            <span className="text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider rounded font-mono bg-[#1E1E1E] text-white border border-[#2D2D2D]">
              MIX COMERCIAL
            </span>
          </div>

          {/* Donut Chart & Category Breakdown Cards */}
          <div className="p-4 flex flex-col md:flex-row items-center gap-6">
            
            {/* Stylized SVG Donut Ring */}
            <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#1E1E1E"
                  strokeWidth="11"
                />

                {/* Segments: 
                  r = 38 -> Circumference = 2 * PI * 38 = 238.76
                  1. Consolas: 44% -> 105.05
                  2. Videojuegos: 26% -> 62.08 (offset -105.05)
                  3. Coleccionables: 18% -> 42.98 (offset -167.13)
                  4. Periféricos: 12% -> 28.65 (offset -210.11)
                */}
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#C8102E"
                  strokeWidth="11"
                  strokeDasharray="105.05 238.76"
                  strokeDashoffset="0"
                  className="transition-all duration-500 hover:opacity-90"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#3B82F6"
                  strokeWidth="11"
                  strokeDasharray="62.08 238.76"
                  strokeDashoffset="-105.05"
                  className="transition-all duration-500 hover:opacity-90"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#F59E0B"
                  strokeWidth="11"
                  strokeDasharray="42.98 238.76"
                  strokeDashoffset="-167.13"
                  className="transition-all duration-500 hover:opacity-90"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="38"
                  fill="transparent"
                  stroke="#10B981"
                  strokeWidth="11"
                  strokeDasharray="28.65 238.76"
                  strokeDashoffset="-210.11"
                  className="transition-all duration-500 hover:opacity-90"
                />
              </svg>

              {/* Center Donut Hole Info */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                <span className="text-[9px] text-[#9CA3AF] uppercase font-mono tracking-wider">Mix Ventas</span>
                <span className="text-base font-bold text-white font-mono tabular-nums leading-tight">
                  100%
                </span>
                <span className="text-[9px] text-[#A7F3D0] font-mono">
                  4 Categorías
                </span>
              </div>
            </div>

            {/* Breakdown List */}
            <div className="flex-1 w-full space-y-2.5">
              {categoryDistribution.map((cat, idx) => (
                <div key={idx} className="p-2.5 bg-[#0E0E0E] rounded border border-[#2D2D2D] hover:border-[#474747] transition-colors">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="font-bold text-white text-xs">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="font-bold text-white text-xs tabular-nums">
                        {currency} {formatAmount(cat.amount)}
                      </span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-bold" style={{ backgroundColor: `${cat.color}22`, color: cat.color, border: `1px solid ${cat.color}55` }}>
                        {cat.share}%
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-[#9CA3AF] mb-1.5 truncate">{cat.desc}</p>
                  
                  {/* Category mini bar */}
                  <div className="w-full bg-[#1E1E1E] rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${cat.share}%`, backgroundColor: cat.color }} />
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Category Total Footer */}
          <div className="px-4 py-3 bg-[#0E0E0E] border-t border-[#2D2D2D] flex items-center justify-between text-xs text-[#9CA3AF] font-mono">
            <span>Volumen catalogado: <strong className="text-white font-mono">{currency} {formatAmount(totalCategorySales)}</strong></span>
            <span className="text-[#A7F3D0] font-bold">Líder: Consolas (44%)</span>
          </div>
        </div>

      </div>

      {/* Secondary Row: Top 3 High-Rotation Products & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        
        {/* Top 3 High-Rotation Products (BI) */}
        <div className="bg-[#141414] rounded border border-[#2D2D2D] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-[#2D2D2D] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-[#C8102E]" />
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-white font-mono">Top 3 Productos de Alta Rotación</h4>
                <p className="text-[10px] text-[#9CA3AF] mt-0.5">Indicador de Inteligencia de Negocios (BI) por volumen y facturación</p>
              </div>
            </div>
            <span className="text-[9px] px-2 py-0.5 font-bold uppercase tracking-wider rounded font-mono bg-[#8A091E]/50 text-[#FFDAD8] border border-[#C8102E]/60">
              ALTA ROTACIÓN
            </span>
          </div>

          <div className="divide-y divide-[#2D2D2D]">
            {topProducts.map((p, idx) => {
              const medalStyles = [
                { badge: '1° ORO', bg: 'bg-[#F59E0B]/20 text-[#FDE68A] border-[#F59E0B]' },
                { badge: '2° PLATA', bg: 'bg-slate-700/40 text-slate-200 border-slate-400' },
                { badge: '3° BRONCE', bg: 'bg-amber-900/30 text-amber-300 border-amber-700/60' }
              ];
              const medal = medalStyles[idx] || { badge: `${idx + 1}°`, bg: 'bg-[#1E1E1E] text-white border-[#2D2D2D]' };

              return (
                <div key={p.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-[#1E1E1E] transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`px-2 py-1 rounded border text-[10px] font-bold shrink-0 font-mono ${medal.bg}`}>
                      {medal.badge}
                    </span>
                    <div className="truncate">
                      <p className="font-semibold text-white truncate">{p.name}</p>
                      <p className="text-[10px] text-[#9CA3AF] font-mono mt-0.5">SKU: {p.sku}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 pl-3">
                    <p className="font-bold text-white font-mono tabular-nums">{currency} {formatAmount(p.revenue)}</p>
                    <p className="text-[10px] text-[#A7F3D0] font-mono font-medium">{p.soldQuantity} unidades despachadas</p>
                  </div>
                </div>
              );
            })}
          </div>
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
