import React, { useState } from 'react';
import { ClipboardList, Plus, Search, PackageCheck, X, Calendar, Truck, Download, History, Upload, Package } from 'lucide-react';
import { api } from '../lib/api';
import { Category, Product, PurchaseOrder, PurchaseOrderStatus, Supplier } from '../types';

interface PurchaseOrdersViewProps {
  orders: PurchaseOrder[];
  products: Product[];
  suppliers: Supplier[];
  categories: Category[];
  onAddProduct: (product: Partial<Product>) => Promise<Product>;
  onCreate: (order: Omit<Partial<PurchaseOrder>, 'items'> & { items: Array<{ productId: string; quantity: number; unitCost: number }> }) => Promise<void>;
  onStatusChange: (id: string, status: PurchaseOrderStatus) => Promise<void>;
  onReceive: (id: string) => Promise<void>;
}

export const PurchaseOrdersView: React.FC<PurchaseOrdersViewProps> = ({ orders, products, suppliers, categories, onAddProduct, onCreate, onStatusChange, onReceive }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PurchaseOrderStatus>('ALL');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'SUPPLIERS'>('ORDERS');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [productCategory, setProductCategory] = useState('Todos');
  const [isQuickProductOpen, setIsQuickProductOpen] = useState(false);
  const [quickSku, setQuickSku] = useState('');
  const [quickBarcode, setQuickBarcode] = useState('');
  const [quickImageUrl, setQuickImageUrl] = useState('');
  const [isUploadingQuickImage, setIsUploadingQuickImage] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickBrand, setQuickBrand] = useState('');
  const [quickUnit, setQuickUnit] = useState('UND');
  const [quickCost, setQuickCost] = useState(0);
  const [quickDescription, setQuickDescription] = useState('');
  const [selectedItems, setSelectedItems] = useState<Record<string, { quantity: number; unitCost: number }>>({});

  const filtered = orders.filter(order => {
    const matchesStatus = statusFilter === 'ALL' || order.status === statusFilter;
    const matchesSupplier = supplierFilter === 'ALL' || order.supplierId === supplierFilter;
    const q = search.trim().toLowerCase();
    const itemMatch = order.items.some(item => item.name.toLowerCase().includes(q) || item.sku.toLowerCase().includes(q));
    const matchesSearch = !q || order.orderNumber.toLowerCase().includes(q) || order.supplierName.toLowerCase().includes(q) || itemMatch;
    return matchesStatus && matchesSupplier && matchesSearch;
  });

  const statusCount = (status: PurchaseOrderStatus) => orders.filter(order => order.status === status).length;

  const itemRows = Object.entries(selectedItems).filter(([, item]) => item.quantity > 0);
  const subtotal = itemRows.reduce((sum, [, item]) => sum + item.quantity * item.unitCost, 0);
  const selectedSupplier = suppliers.find(supplier => supplier.id === supplierId);
  const supplierCategory = selectedSupplier?.category?.trim();
  const visibleSupplierProducts = supplierCategory
    ? products.filter(product => product.category.toLowerCase() === supplierCategory.toLowerCase())
    : products;

  const openQuickProduct = () => {
    const usedCodes = new Set(products.map(product => product.sku));
    let sku = '';
    do {
      sku = String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    } while (usedCodes.has(sku));
    setQuickSku(sku);
    setQuickBarcode(`775${String(Math.floor(Math.random() * 1000000000)).padStart(9, '0')}`);
    setQuickImageUrl('');
    setQuickName('');
    setQuickBrand('');
    setQuickUnit('UND');
    setQuickCost(0);
    setQuickDescription('');
    setIsQuickProductOpen(true);
  };

  const handleQuickImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Seleccione un archivo de imagen válido.'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('La imagen no puede superar los 5 MB.'); return; }
    setIsUploadingQuickImage(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      const result = await api.uploadProductImage(dataUrl, file.name);
      setQuickImageUrl(result.imageUrl);
    } catch (error: any) {
      alert(error?.message || 'No se pudo subir la imagen');
    } finally {
      setIsUploadingQuickImage(false);
      event.target.value = '';
    }
  };

  const registerQuickProduct = async () => {
    if (!quickName.trim() || !supplierCategory) return;
    const created = await onAddProduct({
      sku: quickSku,
      barcode: quickBarcode,
      imageUrl: quickImageUrl,
      name: quickName.trim(),
      category: supplierCategory,
      brand: quickBrand.trim(),
      unit: quickUnit,
      costPrice: quickCost,
      sellingPrice: quickCost,
      taxRate: 18,
      stock: 0,
      minStock: 0,
      maxStock: 0,
      supplierId,
      supplierName: selectedSupplier?.name || '',
      description: quickDescription.trim(),
      location: 'Tienda principal'
    });
    setSelectedItems(items => ({ ...items, [created.id]: { quantity: 1, unitCost: created.costPrice } }));
    setProductCategory(supplierCategory);
    setIsQuickProductOpen(false);
  };

  const nextOrderNumber = (() => {
    const maximum = orders.reduce((highest, order) => {
      const match = order.orderNumber.match(/(\d+)$/);
      return match ? Math.max(highest, Number(match[1])) : highest;
    }, 0);
    return `OC-${String(maximum + 1).padStart(8, '0')}`;
  })();

  const resetForm = () => {
    setSupplierId('');
    setDate(new Date().toISOString().slice(0, 10));
    setExpectedDate('');
    setNotes('');
    setProductSearch('');
    setProductCategory('Todos');
    setSelectedItems({});
  };

  const exportOrdersCSV = () => {
    const rows = [['NRO. ORDEN', 'PROVEEDOR', 'FECHA', 'ESTADO', 'TOTAL'], ...filtered.map(order => [
      order.orderNumber, order.supplierName, order.date, statusLabel[order.status], `${order.currency} ${order.total.toFixed(2)}`
    ])];
    const csv = rows.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'ordenes-de-compra.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const submitOrder = async () => {
    if (!supplierId || itemRows.length === 0) return;
    await onCreate({
      supplierId, date, expectedDate, notes,
      items: itemRows.map(([productId, item]) => ({ productId, quantity: item.quantity, unitCost: item.unitCost }))
    });
    resetForm();
    setIsModalOpen(false);
  };

  const statusStyle: Record<PurchaseOrderStatus, string> = {
    DRAFT: 'bg-[#374151] text-[#D1D5DB]',
    ISSUED: 'bg-[#1E3A8A] text-[#DBEAFE]',
    RECEIVED: 'bg-[#064E3B] text-[#A7F3D0]',
    CANCELLED: 'bg-[#450A0A] text-[#FECACA]'
  };

  const statusLabel: Record<PurchaseOrderStatus, string> = {
    DRAFT: 'Borrador', ISSUED: 'Emitida', RECEIVED: 'Recibida', CANCELLED: 'Cancelada'
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414] px-5 py-5 rounded border border-[#2D2D2D]">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-white tracking-tight">Modulo de órdenes de compra</h2>
          <span className="px-2.5 py-0.5 bg-[#1E1E1E] text-white border border-[#2D2D2D] text-xs font-bold rounded font-mono">{filtered.length} órdenes</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={exportOrdersCSV} className="px-3 py-2 bg-[#1E1E1E] hover:bg-[#2D2D2D] text-white border border-[#2D2D2D] rounded text-xs font-semibold transition-colors flex items-center gap-1.5"><Download className="w-3.5 h-3.5 text-[#9CA3AF]" />Exportar CSV</button>
          <button className="px-3.5 py-2 bg-[#1E3A8A]/30 hover:bg-[#1E3A8A]/60 text-[#DBEAFE] border border-[#3B82F6]/60 rounded text-xs font-bold transition-all flex items-center gap-1.5"><History className="w-3.5 h-3.5 text-[#3B82F6]" />Ver Kárdex General</button>
          <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 bg-[#C8102E] hover:bg-[#A80C25] text-white rounded text-xs font-bold transition-colors flex items-center gap-1.5"><Plus className="w-4 h-4" />Nueva Orden de Compra</button>
        </div>
      </div>

      <div>
        <div className="flex gap-2 border-b border-[#2D2D2D]">
          <button onClick={() => setActiveTab('ORDERS')} className={`px-4 py-2.5 text-xs font-bold border-b-2 -mb-px ${activeTab === 'ORDERS' ? 'text-white border-[#C8102E]' : 'text-[#9CA3AF] border-transparent hover:text-white'}`}>Listado de órdenes</button>
          <button onClick={() => setActiveTab('SUPPLIERS')} className={`px-4 py-2.5 text-xs font-bold border-b-2 -mb-px ${activeTab === 'SUPPLIERS' ? 'text-white border-[#C8102E]' : 'text-[#9CA3AF] border-transparent hover:text-white'}`}>Proveedores</button>
        </div>
        {activeTab === 'ORDERS' ? <div className="space-y-3 rounded border border-[#2D2D2D] bg-[#141414] p-4 mt-4">
          <div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por número de orden, proveedor o producto (ej. OC-00000001)" className="w-full rounded border border-[#2D2D2D] bg-[#0E0E0E] py-2 pl-9 pr-4 text-xs text-white placeholder-[#9CA3AF] focus:border-[#C8102E] focus:outline-none" /></div>
          <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)} className="w-full max-w-[220px] rounded border border-[#2D2D2D] bg-[#0E0E0E] px-3 py-2 text-xs text-white"><option value="ALL">Todos los proveedores</option>{suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setStatusFilter('ALL')} className={`rounded-full px-4 py-2 text-xs font-semibold ${statusFilter === 'ALL' ? 'bg-[#C8102E] text-white' : 'bg-[#1E1E1E] text-[#D1D5DB]'}`}>Todas {orders.length}</button>
            <button onClick={() => setStatusFilter('DRAFT')} className={`rounded-full px-4 py-2 text-xs font-semibold ${statusFilter === 'DRAFT' ? 'bg-[#C8102E] text-white' : 'bg-[#1E1E1E] text-[#D1D5DB]'}`}>Borradores {statusCount('DRAFT')}</button>
            <button onClick={() => setStatusFilter('ISSUED')} className={`rounded-full px-4 py-2 text-xs font-semibold ${statusFilter === 'ISSUED' ? 'bg-[#C8102E] text-white' : 'bg-[#1E1E1E] text-[#D1D5DB]'}`}>Enviadas {statusCount('ISSUED')}</button>
            <button onClick={() => setStatusFilter('RECEIVED')} className={`rounded-full px-4 py-2 text-xs font-semibold ${statusFilter === 'RECEIVED' ? 'bg-[#C8102E] text-white' : 'bg-[#1E1E1E] text-[#D1D5DB]'}`}>Recibidas {statusCount('RECEIVED')}</button>
            <button onClick={() => setStatusFilter('CANCELLED')} className={`rounded-full px-4 py-2 text-xs font-semibold ${statusFilter === 'CANCELLED' ? 'bg-[#C8102E] text-white' : 'bg-[#1E1E1E] text-[#D1D5DB]'}`}>Canceladas {statusCount('CANCELLED')}</button>
          </div>
        </div> : <div className="mt-4 grid gap-3 rounded border border-[#2D2D2D] bg-[#141414] p-4 sm:grid-cols-2 lg:grid-cols-3">{suppliers.map(supplier => <div key={supplier.id} className="rounded border border-[#303030] bg-[#111111] p-4"><strong className="text-white">{supplier.name}</strong><p className="mt-1 text-xs text-[#737373]">Órdenes: {orders.filter(order => order.supplierId === supplier.id).length}</p></div>)}</div>}
      </div>

      {activeTab === 'ORDERS' && <div className="overflow-hidden rounded border border-[#303030] bg-[#171717]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0E0E0E] font-mono text-[11px] uppercase text-[#9CA3AF]"><tr className="h-12 border-b border-[#2D2D2D]"><th className="px-4 py-3">Orden &amp; proveedor</th><th className="px-4 py-3">Destino</th><th className="px-4 py-3">Llegada</th><th className="px-4 py-3 text-center">Ítems</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3">Estado</th></tr></thead>
            <tbody>{filtered.map(order => <tr key={order.id} className="border-t border-[#303030] text-[#E5E5E5] hover:bg-[#181818]">
              <td className="px-4 py-4"><strong className="text-white">{order.orderNumber}</strong><span className="block text-xs text-[#A3A3A3]">{order.supplierName}</span></td><td className="px-4 py-4 text-[#D4D4D4]">Almacén principal</td><td className="px-4 py-4 text-[#D4D4D4]">{order.expectedDate || order.date}</td><td className="px-4 py-4 text-center text-white">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td><td className="px-4 py-4 text-right font-bold text-white">{order.currency} {order.total.toFixed(2)}</td>
              <td className="px-4 py-4"><span className={`rounded px-2 py-1 text-xs font-bold ${statusStyle[order.status]}`}>{statusLabel[order.status]}</span>
                {order.status === 'DRAFT' && <button onClick={() => onStatusChange(order.id, 'ISSUED')} className="mr-2 rounded border border-[#3B82F6] px-2 py-1 text-xs text-[#93C5FD]">Emitir</button>}
                {order.status === 'ISSUED' && <button onClick={() => onReceive(order.id)} className="inline-flex items-center gap-1 rounded border border-[#10B981] px-2 py-1 text-xs text-[#6EE7B7]"><PackageCheck className="h-3 w-3" /> Recibir</button>}
              </td>
            </tr>)}</tbody>
          </table>
          {!filtered.length && <div className="py-12 text-center text-sm text-[#737373]">No hay órdenes de compra registradas.</div>}
        </div>
      </div>}

      {isModalOpen && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"><div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded border border-[#404040] bg-[#171717]">
        <div className="flex items-start justify-between border-b border-[#303030] bg-[#0E0E0E] px-5 py-4"><div><h2 className="text-lg font-bold text-white">Nueva orden de compra</h2><p className="mt-1 font-mono text-xs text-[#9CA3AF]">{nextOrderNumber} · Borrador</p></div><button onClick={() => setIsModalOpen(false)}><X className="h-5 w-5 text-[#9CA3AF]" /></button></div>
        <div className="p-5 text-xs font-bold uppercase text-[#9CA3AF]">Datos generales</div>
        <div className="grid gap-4 px-5 pb-5 md:grid-cols-2"><label className="text-xs font-bold text-[#A3A3A3]">PROVEEDOR<select value={supplierId} onChange={e => { const id = e.target.value; const supplier = suppliers.find(item => item.id === id); setSupplierId(id); setProductCategory(supplier?.category?.trim() || 'Todos'); }} className="mt-2 w-full rounded border border-[#303030] bg-[#0E0E0E] p-3 text-sm text-white"><option value="">Seleccione proveedor</option>{suppliers.map(supplier => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}</select></label>
          <label className="text-xs font-bold text-[#A3A3A3]">ALMACÉN DESTINO<select className="mt-2 w-full rounded border border-[#303030] bg-[#0E0E0E] p-3 text-sm text-white"><option>Almacén principal</option></select></label>
          <label className="text-xs font-bold text-[#A3A3A3]">FECHA DE EMISIÓN<input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-2 w-full rounded border border-[#303030] bg-[#0E0E0E] p-3 text-sm text-white" /></label>
          <label className="text-xs font-bold text-[#A3A3A3]">ENTREGA ESTIMADA<input type="date" value={expectedDate} onChange={e => setExpectedDate(e.target.value)} className="mt-2 w-full rounded border border-[#303030] bg-[#0E0E0E] p-3 text-sm text-white" /></label></div>
        <div className="px-5"><div className="flex items-center justify-between"><div className="text-xs font-bold uppercase text-[#9CA3AF]">Productos <span className="ml-2 text-[#737373]">{itemRows.length} seleccionados</span></div>{supplierCategory && <button type="button" onClick={openQuickProduct} className="flex items-center gap-1.5 rounded bg-[#C8102E] px-3 py-2 text-xs font-bold text-white"><Plus className="h-3.5 w-3.5" />Nuevo producto</button>}</div><div className="mt-3 flex items-center gap-2 rounded border border-[#303030] bg-[#0E0E0E] px-3"><Search className="h-4 w-4 text-[#737373]" /><input value={productSearch} onChange={e => setProductSearch(e.target.value)} className="w-full bg-transparent py-3 text-sm text-white outline-none" placeholder="Buscar por nombre o SKU" /></div>
        <div className="mt-3 flex flex-wrap gap-2">{['Todos', ...Array.from(new Set(visibleSupplierProducts.map(product => product.category))).filter(Boolean)].map(category => <button key={category} type="button" onClick={() => setProductCategory(category)} className={`rounded-full px-4 py-2 text-xs font-bold ${productCategory === category ? 'bg-[#C8102E] text-white' : 'bg-[#252525] text-[#BDBDBD]'}`}>{category}</button>)}</div>
        <div className="mt-3 max-h-72 overflow-y-auto rounded border border-[#303030] bg-[#111111]"><div className="grid grid-cols-[minmax(260px,1fr)_140px_140px_140px_130px] bg-[#202020] px-3 py-2 text-[10px] font-bold uppercase text-[#9CA3AF]"><span>Producto</span><span>Stock</span><span>Costo unit.</span><span>Cantidad</span><span className="text-right">Subtotal</span></div>{visibleSupplierProducts.filter(product => (productCategory === 'Todos' || product.category.toLowerCase() === productCategory.toLowerCase()) && `${product.name} ${product.sku}`.toLowerCase().includes(productSearch.trim().toLowerCase())).map(product => { const selected = selectedItems[product.id] || { quantity: 0, unitCost: product.costPrice }; const quantity = selected.quantity; return <div key={product.id} className="grid grid-cols-[minmax(260px,1fr)_140px_140px_140px_130px] items-center gap-3 border-t border-[#303030] px-3 py-3"><div><span className="font-bold text-white">{product.name}</span><small className="block text-[#737373]">{product.sku} · {product.category}</small></div><span className="text-sm text-[#E5E5E5]">{product.stock} <small className="text-[#737373]">UND</small></span><input type="number" min="0" step="0.01" value={selected.unitCost} onChange={e => setSelectedItems({...selectedItems, [product.id]: { ...selected, unitCost: Number(e.target.value) }})} className="rounded border border-[#303030] bg-[#0E0E0E] p-2 text-white" /><div className="flex items-center"><button type="button" onClick={() => setSelectedItems({...selectedItems, [product.id]: { ...selected, quantity: Math.max(0, quantity - 1) }})} className="h-9 w-8 rounded-l border border-[#303030] text-white">−</button><input type="number" min="0" value={quantity} onChange={e => setSelectedItems({...selectedItems, [product.id]: { ...selected, quantity: Math.max(0, Number(e.target.value)) }})} className="h-9 w-14 border-y border-[#303030] bg-[#0E0E0E] text-center text-white" /><button type="button" onClick={() => setSelectedItems({...selectedItems, [product.id]: { ...selected, quantity: quantity + 1 }})} className="h-9 w-8 rounded-r border border-[#303030] text-white">+</button></div><span className="text-right font-bold text-white">S/. {(quantity * selected.unitCost).toFixed(2)}</span></div>; })}</div></div>
        <div className="flex items-center justify-end gap-3 border-t border-[#303040] bg-[#141414] p-5"><div className="mr-auto flex items-end gap-8"><div><span className="block text-xs text-[#737373]">PRODUCTOS</span><strong className="text-lg text-white">{itemRows.length}</strong></div><div><span className="block text-xs text-[#737373]">UNIDADES</span><strong className="text-lg text-white">{itemRows.reduce((sum, [, item]) => sum + item.quantity, 0)}</strong></div><div><span className="block text-xs text-[#737373]">TOTAL</span><strong className="text-xl text-white">S/. {subtotal.toFixed(2)}</strong></div></div><button onClick={() => { resetForm(); setIsModalOpen(false); }} className="rounded border border-[#404040] px-5 py-2.5 text-sm text-white">Cancelar</button><button disabled={!supplierId || itemRows.length === 0} onClick={submitOrder} className="rounded bg-[#C8102E] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40">Registrar orden</button></div>
      </div></div>}
      {isQuickProductOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"><div className="w-full max-w-2xl rounded border border-[#404040] bg-[#141414] text-white"><div className="flex items-center justify-between border-b border-[#303030] bg-[#0E0E0E] px-6 py-4"><div className="flex items-center gap-2"><Package className="h-5 w-5 text-[#C8102E]" /><h3 className="font-bold">Registrar Nuevo Producto</h3></div><button onClick={() => setIsQuickProductOpen(false)}><X className="h-5 w-5 text-[#9CA3AF]" /></button></div><div className="space-y-4 p-6"><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-[#9CA3AF]">Código SKU *<input value={quickSku} placeholder="e.g. LAP-DELL-5520" onChange={e => setQuickSku(e.target.value)} required className="mt-1 w-full rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 text-white" /></label><label className="text-xs font-semibold text-[#9CA3AF]">Código de barras<input value={quickBarcode} placeholder="e.g. 7751234500101" onChange={e => setQuickBarcode(e.target.value)}  className="mt-1 w-full rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 text-white" /></label></div><label className="block text-xs font-semibold text-[#9CA3AF]">Nombre completo del producto *<input value={quickName} onChange={e => setQuickName(e.target.value)} placeholder="e.g. Laptop Dell Latitude 5520 Core i7 16GB RAM" className="mt-1 w-full rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 text-xs text-white focus:border-[#C8102E] focus:outline-none" /></label><div className="grid gap-3 sm:grid-cols-3"><label className="text-xs font-semibold text-[#9CA3AF]">Categoría *<select value={supplierCategory || ''} disabled className="mt-1 w-full rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 text-xs text-white disabled:opacity-100"><option value={supplierCategory || ''}>{supplierCategory || ''}</option></select></label><label className="text-xs font-semibold text-[#9CA3AF]">Marca<input value={quickBrand} onChange={e => setQuickBrand(e.target.value)} placeholder="e.g. Dell, Cisco, Hikvision" className="mt-1 w-full rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 text-xs text-white focus:border-[#C8102E] focus:outline-none" /></label><label className="text-xs font-semibold text-[#9CA3AF]">Unidad de medida<select value={quickUnit} onChange={e => setQuickUnit(e.target.value)} className="mt-1 w-full rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 text-white"><option value="UND">Unidades (UND)</option><option value="CJ">Caja (CJ)</option><option value="PAQ">Paquete (PAQ)</option><option value="KG">Kilogramos (KG)</option></select></label></div><label className="block text-xs font-semibold text-[#9CA3AF]">Costo unitario (S/.) *<input type="number" min="0" step="0.01" value={quickCost} onChange={e => setQuickCost(Number(e.target.value))} className="mt-1 w-full rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 text-white" /></label><label className="block text-xs font-semibold text-[#9CA3AF]">Descripción / Especificaciones técnicas<textarea rows={3} value={quickDescription} placeholder="Detalles adicionales, número de parte o compatibilidades..." onChange={e => setQuickDescription(e.target.value)} className="mt-1 w-full rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 text-white" /></label><div><label className="mb-1 block text-xs font-semibold text-[#9CA3AF]">Imagen del producto</label><div className="flex items-center gap-3">{quickImageUrl ? <img src={quickImageUrl} alt="Vista previa del producto" className="h-16 w-16 shrink-0 rounded border border-[#303030] object-cover" /> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-[#303030] bg-[#0E0E0E] text-[#71717A]"><Package className="h-6 w-6" /></div>}<label className="flex cursor-pointer items-center gap-2 rounded border border-[#303030] bg-[#1E1E1E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2D2D2D]"><Upload className="h-4 w-4" />{isUploadingQuickImage ? 'Subiendo...' : quickImageUrl ? 'Cambiar imagen' : 'Subir imagen'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleQuickImage} disabled={isUploadingQuickImage} /></label></div><p className="mt-2 text-[10px] text-[#71717A]">JPG, PNG, WEBP o GIF. Tamaño máximo: 5 MB.</p></div></div><div className="flex justify-end gap-3 border-t border-[#303030] px-6 py-4"><button onClick={() => setIsQuickProductOpen(false)} className="rounded border border-[#404040] px-5 py-2 text-sm">Cancelar</button><button disabled={!quickName.trim() || !supplierCategory} onClick={registerQuickProduct} className="rounded bg-[#C8102E] px-5 py-2 text-sm font-bold disabled:opacity-40">Registrar producto</button></div></div></div>}
    </div>
  );
};
