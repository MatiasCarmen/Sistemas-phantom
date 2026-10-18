import React, { useEffect, useState } from 'react';
import { AuditAction, AuditLogEvent } from '../types';
import { api } from '../lib/api';
import { ChevronLeft, ChevronRight, History, RefreshCw, Search, X } from 'lucide-react';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const actionLabels: Record<AuditAction, string> = {
  create: 'Creación',
  update: 'Modificación',
  delete: 'Eliminación'
};

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose }) => {
  const [events, setEvents] = useState<AuditLogEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [action, setAction] = useState<AuditAction | ''>('');
  const [entity, setEntity] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pageSize = 25;

  const loadEvents = async (nextPage = page) => {
    setLoading(true);
    setError('');
    try {
      const result = await api.getAuditLogs({ page: nextPage, limit: pageSize, action, entity, search: search.trim() });
      setEvents(result.events);
      setTotal(result.total);
      setPage(nextPage);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'No se pudo cargar la bitácora.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) void loadEvents(1);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-3 sm:p-6">
      <section className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-md border border-[#2D2D2D] bg-[#141414] text-[#e5e2e1]">
        <header className="flex items-center justify-between border-b border-[#2D2D2D] bg-[#0E0E0E] px-5 py-4">
          <div className="flex items-center gap-3">
            <History className="h-5 w-5 text-[#ffb3b1]" />
            <div>
              <h2 className="text-base font-bold text-white">Bitácora de actividad</h2>
              <p className="text-xs text-zinc-400">{total} cambios registrados</p>
            </div>
          </div>
          <button type="button" onClick={onClose} title="Cerrar bitácora" className="rounded border border-[#2D2D2D] p-2 text-zinc-300 hover:bg-[#1E1E1E]">
            <X className="h-4 w-4" />
          </button>
        </header>

        <form
          className="flex flex-wrap items-center gap-2 border-b border-[#2D2D2D] p-4"
          onSubmit={(event) => { event.preventDefault(); void loadEvents(1); }}
        >
          <label className="flex min-w-44 flex-1 items-center gap-2 rounded border border-[#383838] bg-[#0E0E0E] px-3 py-2">
            <Search className="h-4 w-4 text-zinc-500" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar usuario, registro o ruta" className="w-full bg-transparent text-xs text-white outline-none placeholder:text-zinc-500" />
          </label>
          <select value={entity} onChange={(event) => setEntity(event.target.value)} className="rounded border border-[#383838] bg-[#0E0E0E] px-3 py-2 text-xs text-white">
            <option value="">Todas las entidades</option>
            {['Producto', 'Categoría', 'Proveedor', 'Cliente', 'Movimiento de inventario', 'Cotización', 'Venta', 'Usuario', 'Configuración'].map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select value={action} onChange={(event) => setAction(event.target.value as AuditAction | '')} className="rounded border border-[#383838] bg-[#0E0E0E] px-3 py-2 text-xs text-white">
            <option value="">Todas las acciones</option>
            {Object.entries(actionLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button type="submit" disabled={loading} title="Aplicar filtros" className="rounded bg-[#C8102E] p-2.5 text-white hover:bg-[#A80C25] disabled:opacity-60">
            <Search className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => void loadEvents(page)} disabled={loading} title="Actualizar bitácora" className="rounded border border-[#383838] p-2.5 text-zinc-300 hover:bg-[#1E1E1E] disabled:opacity-60">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </form>

        <div className="flex-1 overflow-auto">
          {error ? (
            <p className="p-6 text-sm text-rose-300">{error}</p>
          ) : (
            <table className="w-full min-w-[850px] border-collapse text-left text-xs">
              <thead className="sticky top-0 bg-[#1B1B1B] text-[10px] uppercase text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Fecha y hora</th>
                  <th className="px-4 py-3">Acción</th>
                  <th className="px-4 py-3">Entidad / ID</th>
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Detalle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#292929]">
                {events.map((item) => (
                  <tr key={item.id} className="align-top hover:bg-[#1A1A1A]">
                    <td className="whitespace-nowrap px-4 py-3 text-zinc-300">{new Date(item.occurredAt).toLocaleString('es-PE')}</td>
                    <td className="px-4 py-3 font-semibold text-white">{actionLabels[item.action]}</td>
                    <td className="px-4 py-3 text-zinc-300"><span className="block">{item.entity}</span><span className="font-mono text-[10px] text-zinc-500">{item.entityId}</span></td>
                    <td className="px-4 py-3 text-zinc-300"><span className="block">{item.actorName}</span><span className="font-mono text-[10px] text-zinc-500">{item.actorId} · {item.ipAddress}</span></td>
                    <td className="max-w-sm px-4 py-3">
                      <details>
                        <summary className="cursor-pointer text-[#ffb3b1]">Ver valores</summary>
                        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded bg-[#0B0B0B] p-3 text-[10px] text-zinc-300">{JSON.stringify({ método: item.method, ruta: item.route, anterior: item.before, nuevo: item.after }, null, 2)}</pre>
                      </details>
                    </td>
                  </tr>
                ))}
                {!loading && events.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-12 text-center text-zinc-500">No hay cambios registrados para estos filtros.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-[#2D2D2D] bg-[#0E0E0E] px-4 py-3 text-xs text-zinc-400">
          <span>{total ? `${(page - 1) * pageSize + 1}-${Math.min(page * pageSize, total)} de ${total}` : '0 registros'}</span>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => void loadEvents(page - 1)} disabled={page <= 1 || loading} title="Página anterior" className="rounded border border-[#383838] p-2 text-white disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
            <span>{page}</span>
            <button type="button" onClick={() => void loadEvents(page + 1)} disabled={page * pageSize >= total || loading} title="Página siguiente" className="rounded border border-[#383838] p-2 text-white disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </footer>
      </section>
    </div>
  );
};