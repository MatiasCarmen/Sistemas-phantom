import React, { useState, useEffect } from 'react';
import { 
  Database, 
  X, 
  Table, 
  Download, 
  Copy, 
  Check, 
  RefreshCw, 
  Search, 
  Layers, 
  Code, 
  FileSpreadsheet, 
  ShieldCheck,
  Server,
  Key
} from 'lucide-react';
import { api } from '../lib/api';

interface DatabaseExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DatabaseExplorerModal: React.FC<DatabaseExplorerModalProps> = ({
  isOpen,
  onClose
}) => {
  const [dbData, setDbData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTable, setSelectedTable] = useState<string>('products');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'table' | 'json' | 'sql'>('table');
  const [copied, setCopied] = useState<boolean>(false);

  const fetchDatabase = async () => {
    setIsLoading(true);
    try {
      const res = await api.getRawDatabase();
      if (res && res.data) {
        setDbData(res.data);
      }
    } catch (err) {
      console.error('Error loading database:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDatabase();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const tableKeys = [
    { key: 'products', label: 'Productos', count: dbData?.products?.length || 0, icon: '📦' },
    { key: 'categories', label: 'Categorías', count: dbData?.categories?.length || 0, icon: '🏷️' },
    { key: 'inventoryMovements', label: 'Kardex (Movimientos)', count: dbData?.inventoryMovements?.length || 0, icon: '📊' },
    { key: 'quotes', label: 'Cotizaciones', count: dbData?.quotes?.length || 0, icon: '📑' },
    { key: 'sales', label: 'Ventas & Facturas', count: dbData?.sales?.length || 0, icon: '💰' },
    { key: 'customers', label: 'Clientes', count: dbData?.customers?.length || 0, icon: '👥' },
    { key: 'suppliers', label: 'Proveedores', count: dbData?.suppliers?.length || 0, icon: '🏭' },
    { key: 'users', label: 'Usuarios / Roles', count: dbData?.users?.length || 0, icon: '🔐' },
    { key: 'settings', label: 'Configuración Fiscal', count: 1, icon: '⚙️' }
  ];

  const currentRecords = dbData ? (selectedTable === 'settings' ? [dbData.settings] : (dbData[selectedTable] || [])) : [];
  
  const filteredRecords = currentRecords.filter((rec: any) => {
    if (!searchTerm) return true;
    const str = JSON.stringify(rec).toLowerCase();
    return str.includes(searchTerm.toLowerCase());
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Generate sample SQL DDL & INSERTS for current selected table
  const generateSqlForTable = () => {
    if (!dbData) return '';
    return `-- SQL SCHEMA & DUMP PARA TABLA '${selectedTable}'\n-- Registros: ${currentRecords.length}\n\n` +
      JSON.stringify(currentRecords, null, 2);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div 
        id="database-explorer-modal"
        className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-300">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Explorador de Base de Datos y Datos Activos
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30 flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Persistencia Activa</span>
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Almacenamiento en <code className="text-indigo-300 font-mono">data/db.json</code> con soporte para exportación en JSON y scripts SQL
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="btn-refresh-db"
              onClick={fetchDatabase}
              disabled={isLoading}
              title="Recargar datos"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <a
              id="btn-download-sql-export"
              href={api.exportSqlUrl()}
              download
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Exportar SQL</span>
            </a>
            <a
              id="btn-download-json-export"
              href={api.exportBackupUrl()}
              download
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-slate-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar JSON</span>
            </a>
            <button
              id="btn-close-db-modal"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Layout (Sidebar + Main Content) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50">
          
          {/* Tables Sidebar */}
          <div className="w-full md:w-64 bg-white border-r border-slate-200 p-3 flex flex-col overflow-y-auto shrink-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-2">
              Tablas / Colecciones ({tableKeys.length})
            </div>

            <div className="space-y-1">
              {tableKeys.map((tbl) => {
                const isSelected = selectedTable === tbl.key;
                return (
                  <button
                    key={tbl.key}
                    id={`btn-table-${tbl.key}`}
                    onClick={() => {
                      setSelectedTable(tbl.key);
                      setSearchTerm('');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-xs font-bold'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="text-sm">{tbl.icon}</span>
                      <span className="truncate">{tbl.label}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {tbl.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* DB Metadata summary */}
            <div className="mt-auto pt-4 border-t border-slate-100 px-2 space-y-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-[11px] text-slate-600 space-y-1">
                <div className="flex items-center space-x-1 font-bold text-slate-900">
                  <Server className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Motor: JSON Atomic Store</span>
                </div>
                <div className="text-slate-500">
                  Archivo: <span className="font-mono text-[10px]">data/db.json</span>
                </div>
                {dbData?.lastUpdated && (
                  <div className="text-slate-400 text-[10px]">
                    Act: {new Date(dbData.lastUpdated).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Table Viewer Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-white">
            
            {/* Table Header Controls */}
            <div className="px-6 py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 bg-white">
              <div className="flex items-center space-x-3">
                <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                  <Table className="w-4 h-4 text-indigo-600" />
                  <span className="capitalize">{selectedTable}</span>
                  <span className="text-xs text-slate-500 font-normal">
                    ({filteredRecords.length} {filteredRecords.length === 1 ? 'registro' : 'registros'})
                  </span>
                </h3>

                {/* View switcher */}
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      viewMode === 'table' ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Tabla
                  </button>
                  <button
                    onClick={() => setViewMode('json')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-all ${
                      viewMode === 'json' ? 'bg-white shadow-2xs text-slate-900 font-bold' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    JSON
                  </button>
                </div>
              </div>

              {/* Search and copy */}
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filtrar registros..."
                    className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs w-48 sm:w-60 focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <button
                  id="btn-copy-table-data"
                  onClick={() => handleCopy(JSON.stringify(filteredRecords, null, 2))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium flex items-center space-x-1 transition-colors cursor-pointer"
                  title="Copiar JSON al portapapeles"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-4">
              {isLoading ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-3 text-slate-400">
                  <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                  <p className="text-xs">Cargando base de datos...</p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-2 text-slate-400">
                  <Table className="w-8 h-8 stroke-1 text-slate-300" />
                  <p className="text-xs font-medium">No se encontraron registros en esta tabla</p>
                </div>
              ) : viewMode === 'table' ? (
                /* Dynamic Table View */
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        {Object.keys(filteredRecords[0] || {}).map((key) => (
                          <th key={key} className="px-3 py-2.5 whitespace-nowrap font-semibold">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {filteredRecords.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          {Object.keys(filteredRecords[0] || {}).map((key) => {
                            const val = row[key];
                            let displayVal = '';
                            if (val === null || val === undefined) {
                              displayVal = 'null';
                            } else if (typeof val === 'object') {
                              displayVal = JSON.stringify(val);
                            } else {
                              displayVal = String(val);
                            }
                            return (
                              <td 
                                key={key} 
                                className="px-3 py-2 max-w-xs truncate text-slate-700" 
                                title={displayVal}
                              >
                                {typeof val === 'number' ? (
                                  <span className="text-indigo-600 font-semibold">{val}</span>
                                ) : typeof val === 'boolean' ? (
                                  <span className={val ? 'text-emerald-600 font-bold' : 'text-red-500'}>
                                    {String(val)}
                                  </span>
                                ) : (
                                  displayVal
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                /* Raw JSON viewer */
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-emerald-400 overflow-auto max-h-full">
                  <pre>{JSON.stringify(filteredRecords, null, 2)}</pre>
                </div>
              )}
            </div>

            {/* Footer Summary */}
            <div className="px-6 py-2.5 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Base de datos persistente validada con estructura JSON y tipos TypeScript</span>
              </div>
              <div className="font-mono text-[11px] text-slate-400">
                Total de tablas: {tableKeys.length} | Registros en vista: {filteredRecords.length}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
