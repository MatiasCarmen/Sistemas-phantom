import React, { useState } from 'react';
import { ClipboardList, Plus, Search, PackageCheck, X, Calendar, Truck, Download, History, Upload, Package, Eye, Trash2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { api } from '../lib/api';
import { Category, CompanySettings, Product, PurchaseOrder, PurchaseOrderStatus, Supplier } from '../types';

interface PurchaseOrdersViewProps {
  orders: PurchaseOrder[];
  products: Product[];
  suppliers: Supplier[];
  categories: Category[];
  settings: CompanySettings | null;
  onAddProduct: (product: Partial<Product>) => Promise<Product>;
  onCreate: (order: Omit<Partial<PurchaseOrder>, 'items'> & { items: Array<{ productId: string; quantity: number; unitCost: number }> }) => Promise<void>;
  onStatusChange: (id: string, status: PurchaseOrderStatus) => Promise<void>;
  onReceive: (id: string, items?: Array<{ productId: string; sellingPrice: number; minStock: number; location: string }>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export const PurchaseOrdersView: React.FC<PurchaseOrdersViewProps> = ({ orders, products, suppliers, categories, settings, onAddProduct, onCreate, onStatusChange, onReceive, onDelete }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | PurchaseOrderStatus>('ALL');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'ORDERS' | 'SUPPLIERS'>('ORDERS');
  const [viewOrder, setViewOrder] = useState<PurchaseOrder | null>(null);
  const [receivingOrder, setReceivingOrder] = useState<PurchaseOrder | null>(null);
  const [receptionSettings, setReceptionSettings] = useState<Record<string, { sellingPrice: string; minStock: string; location: string }>>({});
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

  const openReceiving = (order: PurchaseOrder) => {
    const settings: Record<string, { sellingPrice: string; minStock: string; location: string }> = {};
    order.items.forEach(item => {
      const product = products.find(candidate => candidate.id === item.productId);
      settings[item.productId] = {
        sellingPrice: String(product?.sellingPrice ?? Number((item.unitCost * 1.99).toFixed(2))),
        minStock: String(product?.minStock ?? 5),
        location: 'Almacén principal'
      };
    });
    setReceptionSettings(settings);
    setReceivingOrder(order);
  };

  const confirmReception = async () => {
    if (!receivingOrder) return;
    await onReceive(receivingOrder.id, receivingOrder.items.map(item => ({
      productId: item.productId,
      sellingPrice: Number(receptionSettings[item.productId]?.sellingPrice || 0),
      minStock: Number(receptionSettings[item.productId]?.minStock || 0),
      location: receptionSettings[item.productId]?.location || 'Almacén principal'
    })));
    setReceivingOrder(null);
  };

  const downloadOrder = (order: PurchaseOrder) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const company = settings || {
      companyName: 'PHANTOM Gaming', taxId: '20608945123', phone: '+51 987 654 321', email: 'ventas@phantomgaming.pe',
      address: 'Av. Gaming Plaza 1450, Centro Digital', cityCountry: 'Lima, Perú', currencySymbol: 'S/.', defaultTaxRate: 18
    } as CompanySettings;
    const supplier = suppliers.find(item => item.id === order.supplierId);
    const formatAmount = (value: number) => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    doc.setFillColor(200, 16, 46);
    doc.rect(0, 0, pageWidth, 8, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(30, 41, 59);
    doc.text(company.companyName, 14, 20);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(`RUC/Tax ID: ${company.taxId}`, 14, 25);
    doc.text(`${company.address}${company.cityCountry ? `, ${company.cityCountry}` : ''}`, 14, 29);
    doc.text(`Tel: ${company.phone} | Email: ${company.email}`, 14, 33);

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(pageWidth - 75, 15, 61, 28, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(200, 16, 46);
    doc.text('ORDEN DE COMPRA', pageWidth - 70, 22);
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(`N° ${order.orderNumber}`, pageWidth - 70, 28);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`Fecha: ${order.date}`, pageWidth - 70, 34);
    doc.text(`Estado: ${statusLabel[order.status]}`, pageWidth - 70, 39);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, 52, pageWidth - 28, 22, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 41, 59);
    doc.text('DATOS DEL PROVEEDOR:', 18, 58);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Razón social: ${order.supplierName}`, 18, 63);
    doc.text(`RUC/DNI: ${supplier?.taxId || 'N/A'}`, 18, 68);
    doc.text(`Contacto: ${supplier?.contactPerson || 'No especificado'}`, 120, 63);
    doc.text(`Teléfono: ${supplier?.phone || 'N/A'}`, 120, 68);

    let y = 80;
    doc.setFillColor(15, 23, 42);
    doc.rect(14, y, pageWidth - 28, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text('SKU', 18, y + 5.5);
    doc.text('DESCRIPCIÓN DEL PRODUCTO', 45, y + 5.5);
    doc.text('CANT', 120, y + 5.5);
    doc.text('P. UNIT', 140, y + 5.5);
    doc.text('TOTAL', pageWidth - 20, y + 5.5, { align: 'right' });

    y += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59);
    order.items.forEach((item, index) => {
      if (y > 250) {
        doc.addPage();
        y = 20;
        doc.setFillColor(15, 23, 42);
        doc.rect(14, y, pageWidth - 28, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        doc.text('SKU', 18, y + 5.5);
        doc.text('DESCRIPCIÓN DEL PRODUCTO', 45, y + 5.5);
        doc.text('CANT', 120, y + 5.5);
        doc.text('P. UNIT', 140, y + 5.5);
        doc.text('TOTAL', pageWidth - 20, y + 5.5, { align: 'right' });
        y += 8;
      }
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, pageWidth - 28, 7, 'F');
      }
      doc.setTextColor(30, 41, 59);
      doc.text(item.sku, 18, y + 5);
      doc.text(doc.splitTextToSize(item.name, 68)[0] || item.name, 45, y + 5);
      doc.text(`${item.quantity}`, 120, y + 5);
      doc.text(`${order.currency} ${formatAmount(item.unitCost)}`, 140, y + 5);
      doc.text(`${order.currency} ${formatAmount(item.subtotal)}`, pageWidth - 20, y + 5, { align: 'right' });
      y += 7;
    });

    y += 6;
    const totalsX = pageWidth - 80;
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(totalsX, y, 66, 32, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('Subtotal:', totalsX + 4, y + 7);
    doc.text(`${order.currency} ${formatAmount(order.total)}`, pageWidth - 18, y + 7, { align: 'right' });
    doc.text(`Impuesto (${settings?.defaultTaxRate || 18}%):`, totalsX + 4, y + 13);
    doc.text(`${order.currency} 0.00`, pageWidth - 18, y + 13, { align: 'right' });
    doc.setDrawColor(203, 213, 225);
    doc.line(totalsX + 4, y + 17, pageWidth - 18, y + 17);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('TOTAL A PAGAR:', totalsX + 4, y + 25);
    doc.text(`${order.currency} ${formatAmount(order.total)}`, pageWidth - 18, y + 25, { align: 'right' });

    doc.save(`${order.orderNumber}.pdf`);
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
            <thead className="bg-[#0E0E0E] font-mono text-[11px] uppercase text-[#9CA3AF]"><tr className="h-12 border-b border-[#2D2D2D]"><th className="px-4 py-3">Orden &amp; proveedor</th><th className="px-4 py-3">Destino</th><th className="px-4 py-3">Llegada</th><th className="px-4 py-3 text-center">Ítems</th><th className="px-4 py-3 text-right">Total</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-center">Acciones</th></tr></thead>
            <tbody>{filtered.map(order => <tr key={order.id} className="border-t border-[#303030] text-[#E5E5E5] hover:bg-[#181818]">
              <td className="px-4 py-4"><strong className="text-white">{order.orderNumber}</strong><span className="block text-xs text-[#A3A3A3]">{order.supplierName}</span></td><td className="px-4 py-4 text-[#D4D4D4]">Almacén principal</td><td className="px-4 py-4 text-[#D4D4D4]">{order.expectedDate || order.date}</td><td className="px-4 py-4 text-center text-white">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td><td className="px-4 py-4 text-right font-bold text-white">{order.currency} {order.total.toFixed(2)}</td>
              <td className="px-4 py-4"><span className={`rounded px-2 py-1 text-xs font-bold ${statusStyle[order.status]}`}>{statusLabel[order.status]}</span>
                {order.status === 'DRAFT' && <button onClick={() => onStatusChange(order.id, 'ISSUED')} className="ml-2 rounded border border-[#3B82F6] px-2 py-1 text-xs text-[#93C5FD]">Emitir</button>}
              </td>
              <td className="px-4 py-4"><div className="flex items-center justify-center gap-1">
                <button type="button" title="Visualizar orden" onClick={() => setViewOrder(order)} className="rounded border border-transparent p-1.5 text-[#A1A1AA] transition-colors hover:border-[#2D2D2D] hover:bg-[#1E1E1E] hover:text-white"><Eye className="h-4 w-4" /></button>
                <button type="button" title="Descargar orden" onClick={() => downloadOrder(order)} className="rounded border border-transparent p-1.5 text-[#A1A1AA] transition-colors hover:border-[#2D2D2D] hover:bg-[#1E1E1E] hover:text-[#ffb3b1]"><Download className="h-4 w-4" /></button>
                {(order.status === 'ISSUED' || order.status === 'DRAFT') && <button type="button" title="Recibir mercancía" onClick={() => openReceiving(order)} className="rounded border border-transparent p-1.5 text-[#A1A1AA] transition-colors hover:border-[#065F46]/60 hover:bg-[#064E3B]/20 hover:text-[#6EE7B7]"><PackageCheck className="h-4 w-4" /></button>}
                <button type="button" title="Eliminar orden" onClick={() => { if (window.confirm(`¿Eliminar la orden ${order.orderNumber}?${order.status === 'RECEIVED' ? '\nTambién se revertirá el ingreso al inventario.' : ''}`)) void onDelete(order.id); }} className="rounded border border-transparent p-1.5 text-[#71717A] transition-colors hover:border-[#C8102E]/40 hover:bg-[#C8102E]/15 hover:text-[#C8102E]"><Trash2 className="h-4 w-4" /></button>
              </div></td>
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
        <div className="mt-3 max-h-72 overflow-hidden rounded border border-[#2D2D2D] bg-[#141414]">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs text-[#D1D5DB]">
              <thead className="border-b border-[#2D2D2D] bg-[#1E1E1E] font-mono text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                <tr><th className="px-4 py-3.5">Producto &amp; SKU</th><th className="px-4 py-3.5">Categoría</th><th className="px-4 py-3.5 text-right">Stock</th><th className="px-4 py-3.5">Costo unit.</th><th className="px-4 py-3.5 text-center">Cantidad</th><th className="px-4 py-3.5 text-right">Subtotal</th></tr>
              </thead>
              <tbody className="divide-y divide-[#2D2D2D]">
                {visibleSupplierProducts.filter(product => (productCategory === 'Todos' || product.category.toLowerCase() === productCategory.toLowerCase()) && `${product.name} ${product.sku}`.toLowerCase().includes(productSearch.trim().toLowerCase())).map(product => {
                  const selected = selectedItems[product.id] || { quantity: 0, unitCost: product.costPrice };
                  const quantity = selected.quantity;
                  return <tr key={product.id} className="transition-colors hover:bg-[#1E1E1E]">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded border border-[#303030] bg-[#0E0E0E]">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" /> : <Package className="h-5 w-5 text-[#737373]" />}</div>
                        <div><span className="block font-bold text-white">{product.name}</span><small className="font-mono text-[#737373]">SKU: {product.sku}</small></div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><span className="rounded border border-[#404040] bg-[#252525] px-2 py-1 text-[10px] text-[#D1D5DB]">{product.category}</span></td>
                    <td className="px-4 py-3 text-right"><span className="font-mono font-bold text-white">{product.stock}</span><span className="ml-1 text-[10px] text-[#737373]">UND</span></td>
                    <td className="px-4 py-3"><div className="flex items-center rounded border border-[#303030] bg-[#0E0E0E] focus-within:border-[#C8102E]"><span className="pl-2 text-[#737373]">S/.</span><input type="number" min="0" step="0.01" value={selected.unitCost} onChange={e => setSelectedItems({...selectedItems, [product.id]: { ...selected, unitCost: Number(e.target.value) }})} className="w-24 bg-transparent px-2 py-2 text-right font-mono text-white outline-none" /></div></td>
                    <td className="px-4 py-3"><div className="flex items-center justify-center"><button type="button" onClick={() => setSelectedItems({...selectedItems, [product.id]: { ...selected, quantity: Math.max(0, quantity - 1) }})} className="h-9 w-8 rounded-l border border-[#303030] bg-[#252525] text-white hover:bg-[#303030]">−</button><input type="number" min="0" value={quantity} onChange={e => setSelectedItems({...selectedItems, [product.id]: { ...selected, quantity: Math.max(0, Number(e.target.value)) }})} className="h-9 w-14 border-y border-[#303030] bg-[#0E0E0E] text-center font-mono text-white outline-none" /><button type="button" onClick={() => setSelectedItems({...selectedItems, [product.id]: { ...selected, quantity: quantity + 1 }})} className="h-9 w-8 rounded-r border border-[#303030] bg-[#252525] text-white hover:bg-[#303030]">+</button></div></td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-white">S/. {(quantity * selected.unitCost).toFixed(2)}</td>
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          {!visibleSupplierProducts.filter(product => (productCategory === 'Todos' || product.category.toLowerCase() === productCategory.toLowerCase()) && `${product.name} ${product.sku}`.toLowerCase().includes(productSearch.trim().toLowerCase())).length && <div className="py-10 text-center text-xs text-[#737373]">No se encontraron productos para este proveedor.</div>}
        </div></div>
        <div className="flex items-center justify-end gap-3 border-t border-[#303040] bg-[#141414] p-5"><div className="mr-auto flex items-end gap-8"><div><span className="block text-xs text-[#737373]">PRODUCTOS</span><strong className="text-lg text-white">{itemRows.length}</strong></div><div><span className="block text-xs text-[#737373]">UNIDADES</span><strong className="text-lg text-white">{itemRows.reduce((sum, [, item]) => sum + item.quantity, 0)}</strong></div><div><span className="block text-xs text-[#737373]">TOTAL</span><strong className="text-xl text-white">S/. {subtotal.toFixed(2)}</strong></div></div><button onClick={() => { resetForm(); setIsModalOpen(false); }} className="rounded border border-[#404040] px-5 py-2.5 text-sm text-white">Cancelar</button><button disabled={!supplierId || itemRows.length === 0} onClick={submitOrder} className="rounded bg-[#C8102E] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40">Registrar orden</button></div>
      </div></div>}
      {viewOrder && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"><div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded border border-[#404040] bg-[#171717] text-white"><div className="flex items-center justify-between border-b border-[#303030] px-6 py-4"><div><h3 className="text-lg font-bold">Orden {viewOrder.orderNumber}</h3><p className="text-xs text-[#9CA3AF]">{viewOrder.supplierName}</p><label className="mt-2 block text-xs text-[#9CA3AF]">Estado<select value={viewOrder.status} onChange={async e => { const status = e.target.value as PurchaseOrderStatus; await onStatusChange(viewOrder.id, status); setViewOrder(current => current ? { ...current, status } : current); }} disabled={viewOrder.status === 'RECEIVED'} className="ml-2 rounded border border-[#303030] bg-[#0E0E0E] px-2 py-1 text-xs font-bold text-white disabled:opacity-60"><option value="DRAFT">Borrador</option><option value="ISSUED">Emitida</option><option value="RECEIVED">Recibida</option><option value="CANCELLED">Cancelada</option></select></label></div><button onClick={() => setViewOrder(null)}><X className="h-5 w-5 text-[#9CA3AF]" /></button></div><div className="p-6"><table className="w-full text-left text-xs"><thead className="bg-[#1E1E1E] text-[#9CA3AF]"><tr><th className="p-3">SKU</th><th className="p-3">Producto</th><th className="p-3 text-center">Cantidad</th><th className="p-3 text-right">Costo</th><th className="p-3 text-right">Subtotal</th></tr></thead><tbody>{viewOrder.items.map(item => <tr key={item.id} className="border-t border-[#303030]"><td className="p-3 font-mono">{item.sku}</td><td className="p-3">{item.name}</td><td className="p-3 text-center">{item.quantity}</td><td className="p-3 text-right">S/. {item.unitCost.toFixed(2)}</td><td className="p-3 text-right font-bold">S/. {item.subtotal.toFixed(2)}</td></tr>)}</tbody></table><div className="mt-5 text-right text-xl font-bold">Total {viewOrder.currency} {viewOrder.total.toFixed(2)}</div></div><div className="flex justify-end gap-3 border-t border-[#303030] px-6 py-4"><button onClick={() => setViewOrder(null)} className="rounded border border-[#404040] px-4 py-2 text-sm">Cerrar</button><button onClick={() => downloadOrder(viewOrder)} className="rounded bg-[#C8102E] px-4 py-2 text-sm font-bold"><Download className="mr-2 inline h-4 w-4" />Descargar OC</button></div></div></div>}
      {receivingOrder && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-4"><div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded border border-[#404040] bg-[#171717] text-white"><div className="flex items-center justify-between border-b border-[#303030] px-6 py-4"><div><h3 className="text-lg font-bold">Recepción de orden {receivingOrder.orderNumber}</h3><p className="text-xs text-[#9CA3AF]">Configure los datos comerciales antes de ingresar los productos.</p></div><button onClick={() => setReceivingOrder(null)}><X className="h-5 w-5 text-[#9CA3AF]" /></button></div><div className="space-y-3 p-6">{receivingOrder.items.map(item => { const product = products.find(candidate => candidate.id === item.productId); const settings = receptionSettings[item.productId] || { sellingPrice: '', minStock: '', location: 'Almacén principal' }; const margin = Number(settings.sellingPrice) > 0 ? ((Number(settings.sellingPrice) - item.unitCost) / Number(settings.sellingPrice) * 100) : 0; return <div key={item.id} className="rounded border border-[#303030] bg-[#111111] p-4"><div className="mb-3 flex justify-between"><div><strong>{item.name}</strong><p className="font-mono text-xs text-[#737373]">SKU: {item.sku} · Recibirá: {item.quantity} {product?.unit || item.unit}</p></div><strong className="text-[#D1D5DB]">Costo: S/. {item.unitCost.toFixed(2)}</strong></div><div className="grid gap-3 md:grid-cols-4"><label className="text-xs font-semibold text-[#9CA3AF]">Precio Venta (S/. ) *<input type="number" min="0" step="0.01" value={settings.sellingPrice} onChange={e => setReceptionSettings(current => ({ ...current, [item.productId]: { ...settings, sellingPrice: e.target.value } }))} className="mt-1 w-full rounded border border-[#303030] bg-[#0E0E0E] p-2 text-white" /></label><label className="text-xs font-semibold text-[#9CA3AF]">Margen Calculado<input readOnly value={`${margin.toFixed(1)}% (${(Number(settings.sellingPrice || 0) - item.unitCost).toFixed(2)})`} className="mt-1 w-full rounded border border-[#303030] bg-[#0E0E0E] p-2 text-emerald-400" /></label><label className="text-xs font-semibold text-[#9CA3AF]">Stock Mínimo (Alerta) *<input type="number" min="0" value={settings.minStock} onChange={e => setReceptionSettings(current => ({ ...current, [item.productId]: { ...settings, minStock: e.target.value } }))} className="mt-1 w-full rounded border border-[#303030] bg-[#0E0E0E] p-2 text-white" /></label><div className="text-xs font-semibold text-[#9CA3AF]">Ubicación en Almacén *<div className="mt-1 w-full rounded border border-[#303030] bg-[#0E0E0E] p-2 text-white">Almacén principal</div></div></div></div>; })}</div><div className="flex justify-end gap-3 border-t border-[#303030] px-6 py-4"><button onClick={() => setReceivingOrder(null)} className="rounded border border-[#404040] px-5 py-2 text-sm">Cancelar</button><button onClick={confirmReception} className="rounded bg-[#C8102E] px-5 py-2 text-sm font-bold"><PackageCheck className="mr-2 inline h-4 w-4" />Confirmar recepción</button></div></div></div>}
      {isQuickProductOpen && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4"><div className="w-full max-w-2xl rounded border border-[#404040] bg-[#141414] text-white"><div className="flex items-center justify-between border-b border-[#303030] bg-[#0E0E0E] px-6 py-4"><div className="flex items-center gap-2"><Package className="h-5 w-5 text-[#C8102E]" /><h3 className="font-bold">Registrar Nuevo Producto</h3></div><button onClick={() => setIsQuickProductOpen(false)}><X className="h-5 w-5 text-[#9CA3AF]" /></button></div><div className="space-y-4 p-6"><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-[#9CA3AF]">Código SKU *<input value={quickSku} placeholder="e.g. LAP-DELL-5520" onChange={e => setQuickSku(e.target.value)} required className="mt-1 w-full rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 text-white" /></label><label className="text-xs font-semibold text-[#9CA3AF]">Código de barras<input value={quickBarcode} placeholder="e.g. 7751234500101" onChange={e => setQuickBarcode(e.target.value)}  className="mt-1 w-full rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 text-white" /></label></div><label className="block text-xs font-semibold text-[#9CA3AF]">Nombre completo del producto *<input value={quickName} onChange={e => setQuickName(e.target.value)} placeholder="e.g. Laptop Dell Latitude 5520 Core i7 16GB RAM" className="mt-1 w-full rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 text-xs text-white focus:border-[#C8102E] focus:outline-none" /></label><div className="grid gap-3 sm:grid-cols-3"><label className="text-xs font-semibold text-[#9CA3AF]">Categoría *<select value={supplierCategory || ''} disabled className="mt-1 w-full rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 text-xs text-white disabled:opacity-100"><option value={supplierCategory || ''}>{supplierCategory || ''}</option></select></label><label className="text-xs font-semibold text-[#9CA3AF]">Marca<input value={quickBrand} onChange={e => setQuickBrand(e.target.value)} placeholder="e.g. Dell, Cisco, Hikvision" className="mt-1 w-full rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 text-xs text-white focus:border-[#C8102E] focus:outline-none" /></label><label className="text-xs font-semibold text-[#9CA3AF]">Unidad de medida<select value={quickUnit} onChange={e => setQuickUnit(e.target.value)} className="mt-1 w-full rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 text-white"><option value="UND">Unidades (UND)</option><option value="CJ">Caja (CJ)</option><option value="PAQ">Paquete (PAQ)</option><option value="KG">Kilogramos (KG)</option></select></label></div><label className="block text-xs font-semibold text-[#9CA3AF]">Costo unitario (S/.) *<input type="number" min="0" step="0.01" value={quickCost} onChange={e => setQuickCost(Number(e.target.value))} className="mt-1 w-full rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 text-white" /></label><label className="block text-xs font-semibold text-[#9CA3AF]">Descripción / Especificaciones técnicas<textarea rows={3} value={quickDescription} placeholder="Detalles adicionales, número de parte o compatibilidades..." onChange={e => setQuickDescription(e.target.value)} className="mt-1 w-full rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 text-white" /></label><div><label className="mb-1 block text-xs font-semibold text-[#9CA3AF]">Imagen del producto</label><div className="flex items-center gap-3">{quickImageUrl ? <img src={quickImageUrl} alt="Vista previa del producto" className="h-16 w-16 shrink-0 rounded border border-[#303030] object-cover" /> : <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded border border-[#303030] bg-[#0E0E0E] text-[#71717A]"><Package className="h-6 w-6" /></div>}<label className="flex cursor-pointer items-center gap-2 rounded border border-[#303030] bg-[#1E1E1E] px-4 py-2 text-xs font-semibold text-white hover:bg-[#2D2D2D]"><Upload className="h-4 w-4" />{isUploadingQuickImage ? 'Subiendo...' : quickImageUrl ? 'Cambiar imagen' : 'Subir imagen'}<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleQuickImage} disabled={isUploadingQuickImage} /></label></div><p className="mt-2 text-[10px] text-[#71717A]">JPG, PNG, WEBP o GIF. Tamaño máximo: 5 MB.</p></div></div><div className="flex justify-end gap-3 border-t border-[#303030] px-6 py-4"><button onClick={() => setIsQuickProductOpen(false)} className="rounded border border-[#404040] px-5 py-2 text-sm">Cancelar</button><button disabled={!quickName.trim() || !supplierCategory} onClick={registerQuickProduct} className="rounded bg-[#C8102E] px-5 py-2 text-sm font-bold disabled:opacity-40">Registrar producto</button></div></div></div>}
    </div>
  );
};
