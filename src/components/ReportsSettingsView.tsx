import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Building, 
  Database, 
  Download, 
  RotateCcw, 
  Check, 
  ShieldCheck, 
  FileText, 
  Save, 
  AlertCircle,
  Users,
  UserPlus,
  RefreshCw,
  Wifi,
  ServerCog
} from 'lucide-react';
import { CompanySettings, Product, Sale, Quote, MySQLConfig } from '../types';
import { api } from '../lib/api';

interface ReportsSettingsViewProps {
  settings: CompanySettings | null;
  products: Product[];
  sales: Sale[];
  quotes: Quote[];
  onUpdateSettings: (settings: Partial<CompanySettings>) => Promise<void>;
  onRefreshAllData: () => Promise<void>;
  onOpenUsersModal?: () => void;
  onOpenDatabaseModal?: () => void;
}

export const ReportsSettingsView: React.FC<ReportsSettingsViewProps> = ({
  settings,
  products,
  sales,
  quotes,
  onUpdateSettings,
  onRefreshAllData,
  onOpenUsersModal,
  onOpenDatabaseModal
}) => {
  const [formData, setFormData] = useState<CompanySettings>({
    companyName: settings?.companyName || 'NEXUS GESTIÓN EMPRESARIAL S.A.C.',
    taxId: settings?.taxId || '20608945123',
    phone: settings?.phone || '+51 (01) 458-9920 / +51 984 123 456',
    email: settings?.email || 'contacto@nexusgestion.com',
    address: settings?.address || 'Av. Javier Prado Este 4200, San Isidro, Lima - Perú',
    website: settings?.website || 'www.nexusgestion.com',
    currencySymbol: settings?.currencySymbol || 'S/.',
    currencyName: settings?.currencyName || 'PEN',
    defaultTaxRate: settings?.defaultTaxRate || 18,
    quoteTermsDefault: settings?.quoteTermsDefault || 'Precios expresados en Soles (S/.) e incluyen IGV (18%). Validez de la oferta: 15 días calendario.',
    invoiceFooterNotes: settings?.invoiceFooterNotes || 'Gracias por su preferencia. Conserve este comprobante para efectos de garantía.'
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [mysqlStatus, setMysqlStatus] = useState<MySQLConfig | null>(null);
  const [mysqlLoading, setMysqlLoading] = useState(false);
  const [mysqlMessage, setMysqlMessage] = useState('Sin verificar');

  const loadMySQLStatus = async () => {
    try {
      const response = await api.getMySQLConfig();
      setMysqlStatus(response.config ?? null);
      setMysqlMessage(response.config?.connected ? 'Conexión MySQL activa' : 'MySQL sin conexión activa');
    } catch (error) {
      setMysqlMessage('No se pudo consultar el estado de MySQL');
      setMysqlStatus(null);
    }
  };

  useEffect(() => {
    void loadMySQLStatus();
  }, []);

  const handleTestMySQLConnection = async () => {
    if (!mysqlStatus) {
      setMysqlMessage('Primero configura la conexión MySQL');
      return;
    }

    setMysqlLoading(true);
    try {
      const result = await api.testMySQLConnection(mysqlStatus);
      setMysqlMessage(result.message || 'Conexión exitosa');
      await loadMySQLStatus();
    } catch (error: any) {
      setMysqlMessage(error.message || 'No se pudo probar la conexión');
    } finally {
      setMysqlLoading(false);
    }
  };

  // Financial Metrics
  const totalCostValue = products.reduce((acc, p) => acc + (p.costPrice * p.stock), 0);
  const totalSaleValue = products.reduce((acc, p) => acc + (p.sellingPrice * p.stock), 0);
  const projectedGrossMargin = totalSaleValue - totalCostValue;
  const marginPercentage = totalCostValue > 0 ? ((projectedGrossMargin / totalCostValue) * 100).toFixed(1) : '0';

  const completedSales = sales.filter(s => s.status === 'COMPLETED');
  const totalSalesRevenue = completedSales.reduce((acc, s) => acc + s.total, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onUpdateSettings({
      ...formData,
      defaultTaxRate: Number(formData.defaultTaxRate)
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Download Full DB Backup
  const handleDownloadBackup = async () => {
    try {
      const response = await fetch('/api/backup/export');
      const data = await response.json();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexus_database_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Backup download failed:', err);
    }
  };

  // Reset to Initial Seed Data
  const handleResetDatabase = async () => {
    if (confirm('¿ATENCIÓN: Deseas restaurar la base de datos a sus valores iniciales de demostración?\n\nEsta acción reiniciará los productos, clientes, ventas y cotizaciones al estado por defecto.')) {
      try {
        setIsResetting(true);
        await api.resetDatabase();
        await onRefreshAllData();
        alert('Base de datos restaurada con éxito.');
      } catch (err) {
        console.error('Error resetting db:', err);
      } finally {
        setIsResetting(false);
      }
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header */}
      <div className="bg-slate-900/80 p-5 rounded-2xl border border-slate-700/80 shadow-2xl shadow-slate-950/30">
        <div className="flex items-center space-x-2">
          <Settings className="w-5 h-5 text-violet-300" />
          <h2 className="text-xl font-bold text-white tracking-tight">Configuración del Sistema & Valorización</h2>
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          Personaliza los datos tributarios de tu empresa, moneda, tasa de impuesto por defecto y realiza copias de seguridad de la base de datos.
        </p>
      </div>

      {/* Inventory & Financial Valuation Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Inventario a Costo</span>
          <p className="text-xl font-bold text-slate-900 font-mono mt-1">
            {formData.currencySymbol} {totalCostValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Inversión acumulada en existencias</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Inventario a Precio Venta</span>
          <p className="text-xl font-bold text-blue-700 font-mono mt-1">
            {formData.currencySymbol} {totalSaleValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Valor comercial realizable</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Margen Bruto Proyectado</span>
          <p className="text-xl font-bold text-emerald-700 font-mono mt-1">
            +{marginPercentage}%
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">
            {formData.currencySymbol} {projectedGrossMargin.toLocaleString(undefined, { minimumFractionDigits: 2 })} utilidad potencial
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">Total Facturado Histórico</span>
          <p className="text-xl font-bold text-slate-900 font-mono mt-1">
            {formData.currencySymbol} {totalSalesRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">{completedSales.length} comprobantes válidos</span>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Company Settings Form (8 cols on lg) */}
        <div className="lg:col-span-8 bg-slate-900/80 rounded-2xl border border-slate-700/80 shadow-2xl shadow-slate-950/30 p-6">
          
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
            <div className="flex items-center space-x-2">
              <Building className="w-5 h-5 text-slate-700" />
              <h3 className="text-sm font-bold text-slate-900">Datos Fiscales de la Empresa & Membrete</h3>
            </div>
            {savedSuccess && (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-full flex items-center space-x-1 animate-pulse">
                <Check className="w-3.5 h-3.5" />
                <span>¡Cambios guardados con éxito!</span>
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Razón Social / Nombre Comercial *</label>
                <input
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={e => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">RUC / NIT / Identificación Tributaria *</label>
                <input
                  type="text"
                  required
                  value={formData.taxId}
                  onChange={e => setFormData({ ...formData, taxId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfonos de Contacto</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico Comercial</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección Fiscal / Ubicación</label>
              <input
                type="text"
                value={formData.address}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            {/* Currency & Tax Parameters */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <span className="text-xs font-bold text-slate-800 block">Moneda & Parámetros Impositivos</span>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Símbolo Moneda</label>
                  <input
                    type="text"
                    value={formData.currencySymbol}
                    onChange={e => setFormData({ ...formData, currencySymbol: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-center"
                    placeholder="$, S/, €, MX$"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Código ISO</label>
                  <input
                    type="text"
                    value={formData.currencyName}
                    onChange={e => setFormData({ ...formData, currencyName: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center"
                    placeholder="USD, PEN, EUR"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Impuesto por Defecto (IVA/IGV %)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    value={formData.defaultTaxRate}
                    onChange={e => setFormData({ ...formData, defaultTaxRate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-center text-blue-700"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Términos por Defecto en Cotizaciones (Pie de página PDF)</label>
              <textarea
                rows={2}
                value={formData.quoteTermsDefault}
                onChange={e => setFormData({ ...formData, quoteTermsDefault: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Pie de Página en Facturas / Boletas de Venta</label>
              <input
                type="text"
                value={formData.invoiceFooterNotes}
                onChange={e => setFormData({ ...formData, invoiceFooterNotes: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                id="btn-save-settings"
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center space-x-1.5"
              >
                <Save className="w-4 h-4" />
                <span>Guardar Parámetros de Empresa</span>
              </button>
            </div>

          </form>
        </div>

        {/* Right Column: Database, Users & Backup Management (4 cols on lg) */}
        <div className="lg:col-span-4 space-y-4">
          
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Wifi className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Estado de conexión</h3>
              </div>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold ${mysqlStatus?.connected ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                {mysqlStatus?.connected ? 'Conectado' : 'Pendiente'}
              </span>
            </div>

            <div className="space-y-2 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span>Servidor</span>
                <span className="font-semibold text-slate-800">{mysqlStatus?.host || 'localhost'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Base</span>
                <span className="font-semibold text-slate-800">{mysqlStatus?.database || 'nexus_erp_db'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Usuario</span>
                <span className="font-semibold text-slate-800">{mysqlStatus?.user || 'root'}</span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
              <div className="flex items-center space-x-2 font-semibold text-slate-700">
                {mysqlStatus?.connected ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <AlertCircle className="w-3.5 h-3.5 text-amber-600" />}
                <span>{mysqlMessage}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleTestMySQLConnection}
              disabled={mysqlLoading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${mysqlLoading ? 'animate-spin' : ''}`} />
              <span>{mysqlLoading ? 'Probando conexión...' : 'Probar conexión MySQL'}</span>
            </button>
          </div>

          {/* Collaborators Management Box */}
          {onOpenUsersModal && (
            <div className="bg-white rounded-2xl border border-indigo-100 shadow-2xs p-5 space-y-3 bg-gradient-to-b from-indigo-50/40 to-white">
              <div className="flex items-center space-x-2 pb-2 border-b border-indigo-100">
                <Users className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Personal & Colaboradores</h3>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Gestione las cuentas de los administradores y colaboradores comerciales, almacén y caja, configurando sus credenciales y permisos.
              </p>
              <button
                type="button"
                id="btn-settings-open-users"
                onClick={onOpenUsersModal}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center space-x-2 cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>Gestionar Usuarios y Accesos</span>
              </button>
            </div>
          )}

          {/* Backup & DB Explorer Box */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
            <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
              <ServerCog className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Base de Datos & Copias</h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Consulte la estructura de datos en vivo, visualice tablas relacionales, o descargue copias completas en JSON y scripts SQL.
            </p>

            {onOpenDatabaseModal && (
              <button
                type="button"
                id="btn-open-db-explorer"
                onClick={onOpenDatabaseModal}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Database className="w-4 h-4" />
                <span>Explorar Base de Datos</span>
              </button>
            )}

            <button
              id="btn-download-db-backup"
              onClick={handleDownloadBackup}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Copia JSON</span>
            </button>

            <a
              id="btn-download-db-sql"
              href={api.exportSqlUrl()}
              download
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-colors flex items-center justify-center space-x-2 border border-slate-200"
            >
              <FileText className="w-4 h-4 text-slate-600" />
              <span>Descargar Script SQL</span>
            </a>

            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900 space-y-1">
              <div className="flex items-center space-x-1 font-bold">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Estado de persistencia</span>
              </div>
              <p className="text-[11px] text-blue-700">
                Los datos del sistema se sincronizan con MySQL y se mantienen respaldados con copia local para continuidad operativa.
              </p>
            </div>
          </div>

          {/* Reset Demo Data Box */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-3">
            <h4 className="text-xs font-bold text-slate-900">Restablecer Datos de Demostración</h4>
            <p className="text-xs text-slate-500">
              Si deseas reiniciar el inventario y transacciones para realizar pruebas desde cero, puedes recargar el conjunto inicial.
            </p>
            <button
              id="btn-reset-demo-data"
              onClick={handleResetDatabase}
              disabled={isResetting}
              className="w-full py-2 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{isResetting ? 'Restaurando...' : 'Recargar Datos Semilla'}</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
