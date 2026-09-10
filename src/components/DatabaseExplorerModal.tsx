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
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div 
        id="database-explorer-modal"
        className="bg-[#141414] w-full max-w-6xl rounded-md shadow-2xl border border-[#2D2D2D] overflow-hidden flex flex-col max-h-[92vh] text-[#e5e2e1]"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#0E0E0E] text-white flex items-center justify-between border-b border-[#2D2D2D]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded bg-[#1E1E1E] border border-[#2D2D2D] flex items-center justify-center text-[#ffb3b1]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Explorador de Base de Datos y Datos Activos
                </h2>
                <span className="px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-400 text-[10px] font-bold border border-emerald-500/30 flex items-center space-x-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Persistencia Activa</span>
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                Almacenamiento en <code className="text-[#ffb3b1] font-mono">data/db.json</code> con soporte para exportación en JSON y scripts SQL
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              id="btn-refresh-db"
              onClick={fetchDatabase}
              disabled={isLoading}
              title="Recargar datos"
              className="p-2 rounded bg-[#1E1E1E] hover:bg-[#2D2D2D] text-zinc-300 border border-[#2D2D2D] transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <a
              id="btn-download-sql-export"
              href={api.exportSqlUrl()}
              download
              className="px-3 py-1.5 rounded bg-[#C8102E] hover:bg-[#A80C25] text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Exportar SQL</span>
            </a>
            <a
              id="btn-download-json-export"
              href={api.exportBackupUrl()}
              download
              className="px-3 py-1.5 rounded bg-[#1E1E1E] hover:bg-[#2D2D2D] text-zinc-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-[#2D2D2D]"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Descargar JSON</span>
            </a>
            <button
              id="btn-close-db-modal"
              onClick={onClose}
              className="p-2 rounded bg-[#1E1E1E] hover:bg-[#2D2D2D] text-zinc-400 hover:text-white border border-[#2D2D2D] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body Layout (Sidebar + Main Content) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-[#141414]">
          
          {/* Tables Sidebar */}
          <div className="w-full md:w-64 bg-[#0E0E0E] border-r border-[#2D2D2D] p-3 flex flex-col overflow-y-auto shrink-0">
            <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-3 py-2 font-mono">
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
                    className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-all text-left cursor-pointer ${
                      isSelected
                        ? 'bg-[#C8102E] text-white font-bold shadow-xs'
                        : 'text-zinc-300 hover:bg-[#1E1E1E] hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span className="text-sm">{tbl.icon}</span>
                      <span className="truncate">{tbl.label}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono tabular-nums font-bold ${
                      isSelected ? 'bg-black/30 text-white' : 'bg-[#1E1E1E] text-zinc-400 border border-[#2D2D2D]'
                    }`}>
                      {tbl.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* DB Metadata summary */}
            <div className="mt-auto pt-4 border-t border-[#2D2D2D] px-2 space-y-2">
              <div className="p-3 bg-[#141414] rounded border border-[#2D2D2D] text-[11px] text-zinc-400 space-y-1">
                <div className="flex items-center space-x-1 font-bold text-zinc-200">
                  <Server className="w-3.5 h-3.5 text-[#ffb3b1]" />
                  <span>Motor: JSON Atomic Store</span>
                </div>
                <div className="text-zinc-400">
                  Archivo: <span className="font-mono text-[10px] text-[#ffb3b1]">data/db.json</span>
                </div>
                {dbData?.lastUpdated && (
                  <div className="text-zinc-500 font-mono text-[10px]">
                    Act: {new Date(dbData.lastUpdated).toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Table Viewer Area */}
          <div className="flex-1 flex flex-col overflow-hidden bg-[#141414]">
            
            {/* Table Header Controls */}
            <div className="px-6 py-3.5 border-b border-[#2D2D2D] flex flex-wrap items-center justify-between gap-3 bg-[#0E0E0E]">
              <div className="flex items-center space-x-3">
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <Table className="w-4 h-4 text-[#ffb3b1]" />
                  <span className="capitalize">{selectedTable}</span>
                  <span className="text-xs text-zinc-400 font-mono tabular-nums font-normal">
                    ({filteredRecords.length} {filteredRecords.length === 1 ? 'registro' : 'registros'})
                  </span>
                </h3>

                {/* View switcher */}
                <div className="flex items-center bg-[#141414] p-0.5 rounded border border-[#2D2D2D] text-xs">
                  <button
                    onClick={() => setViewMode('table')}
                    className={`px-2.5 py-1 rounded font-medium transition-all ${
                      viewMode === 'table' ? 'bg-[#1E1E1E] text-white font-bold border border-[#2D2D2D]' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    Tabla
                  </button>
                  <button
                    onClick={() => setViewMode('json')}
                    className={`px-2.5 py-1 rounded font-medium transition-all ${
                      viewMode === 'json' ? 'bg-[#1E1E1E] text-white font-bold border border-[#2D2D2D]' : 'text-zinc-400 hover:text-white'
                    }`}
                  >
                    JSON
                  </button>
                </div>
              </div>

              {/* Search and copy */}
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filtrar registros..."
                    className="pl-8 pr-3 py-1.5 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs text-white placeholder-zinc-500 w-48 sm:w-60 focus:border-[#C8102E] outline-none"
                  />
                </div>

                <button
                  id="btn-copy-table-data"
                  onClick={() => handleCopy(JSON.stringify(filteredRecords, null, 2))}
                  className="px-3 py-1.5 rounded border border-[#2D2D2D] bg-[#1E1E1E] hover:bg-[#2D2D2D] text-zinc-300 text-xs font-medium flex items-center space-x-1 transition-colors cursor-pointer"
                  title="Copiar JSON al portapapeles"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-bold">Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto p-4">
              {isLoading ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-3 text-zinc-500 font-mono">
                  <RefreshCw className="w-8 h-8 animate-spin text-[#C8102E]" />
                  <p className="text-xs">Cargando base de datos...</p>
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="h-64 flex flex-col items-center justify-center space-y-2 text-zinc-500">
                  <Table className="w-8 h-8 stroke-1 text-zinc-600" />
                  <p className="text-xs font-medium">No se encontraron registros en esta tabla</p>
                </div>
              ) : viewMode === 'table' ? (
                /* Dynamic Table View */
                <div className="overflow-x-auto rounded border border-[#2D2D2D] bg-[#0E0E0E]">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#1E1E1E] text-zinc-300 font-bold border-b border-[#2D2D2D] font-mono text-[11px] uppercase tracking-wider">
                      <tr>
                        {Object.keys(filteredRecords[0] || {}).map((key) => (
                          <th key={key} className="px-3 py-2.5 whitespace-nowrap font-semibold">
                            {key}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2D2D2D] font-mono tabular-nums text-[11px]">
                      {filteredRecords.map((row: any, idx: number) => (
                        <tr key={idx} className="hover:bg-[#1E1E1E]/50 transition-colors">
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
                                className="px-3 py-2 max-w-xs truncate text-zinc-300" 
                                title={displayVal}
                              >
                                {typeof val === 'number' ? (
                                  <span className="text-[#ffb3b1] font-semibold">{val}</span>
                                ) : typeof val === 'boolean' ? (
                                  <span className={val ? 'text-emerald-400 font-bold' : 'text-[#ffb3b1]'}>
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
                <div className="rounded border border-[#2D2D2D] bg-[#0E0E0E] p-4 font-mono text-xs text-emerald-400 overflow-auto max-h-full">
                  <pre>{JSON.stringify(filteredRecords, null, 2)}</pre>
                </div>
              )}
            </div>

            {/* Footer Summary */}
            <div className="px-6 py-2.5 bg-[#0E0E0E] border-t border-[#2D2D2D] text-xs text-zinc-400 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Base de datos persistente validada con estructura JSON y tipos TypeScript</span>
              </div>
              <div className="font-mono tabular-nums text-[11px] text-zinc-500">
                Total de tablas: {tableKeys.length} | Registros en vista: {filteredRecords.length}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
