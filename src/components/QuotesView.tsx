import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  FileSpreadsheet, 
  Download, 
  Printer, 
  Send, 
  CheckCircle, 
  XCircle, 
  ArrowRight, 
  Trash2, 
  Edit, 
  Eye, 
  MessageSquare, 
  Copy, 
  Check, 
  Calendar, 
  DollarSign, 
  AlertCircle,
  PackageCheck,
  X
} from 'lucide-react';
import { Quote, QuoteItem, Customer, Product, CompanySettings, QuoteStatus, User } from '../types';
import { generateQuotePDF } from '../lib/pdfGenerator';
import { formatAmount } from '../lib/formatters';

interface QuotesViewProps {
  quotes: Quote[];
  customers: Customer[];
  products: Product[];
  settings: CompanySettings | null;
  currentUser: User | null;
  onCreateQuote: (quote: Partial<Quote>) => Promise<void>;
  onUpdateQuote: (id: string, quote: Partial<Quote>) => Promise<void>;
  onDeleteQuote: (id: string) => Promise<void>;
  onConvertToSale: (quoteId: string, options?: { voucherType?: string; paymentMethod?: string; sellerName?: string }) => Promise<void>;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  isLoading: boolean;
}

export const QuotesView: React.FC<QuotesViewProps> = ({
  quotes,
  customers,
  products,
  settings,
  currentUser,
  onCreateQuote,
  onUpdateQuote,
  onDeleteQuote,
  onConvertToSale,
  isCreateModalOpen,
  setIsCreateModalOpen,
  isLoading
}) => {
  const currency = settings?.currencySymbol || 'S/.';
  const taxRateDefault = settings?.defaultTaxRate || 18;
  const canChangeQuoteStatus = currentUser?.role === 'admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [quoteToConvert, setQuoteToConvert] = useState<Quote | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // New Quote Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [customerName, setCustomerName] = useState(customers[0]?.name || '');
  const [customerTaxId, setCustomerTaxId] = useState(customers[0]?.taxId || '');
  const [customerEmail, setCustomerEmail] = useState(customers[0]?.email || '');
  const [customerPhone, setCustomerPhone] = useState(customers[0]?.phone || '');
  const [customerAddress, setCustomerAddress] = useState(customers[0]?.address || '');
  
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]
  );
  const [paymentTerms, setPaymentTerms] = useState('Contado contra entrega / Transferencia interbancaria');
  const [quoteNotes, setQuoteNotes] = useState('');
  const [termsAndConditions, setTermsAndConditions] = useState(settings?.quoteTermsDefault || '');
  const [createdBy, setCreatedBy] = useState('Asesor Comercial');

  // Items in Quote Builder
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [selectedProductToAdd, setSelectedProductToAdd] = useState<string>(products[0]?.id || '');
  const [quantityToAdd, setQuantityToAdd] = useState<number>(1);
  const [discountToAdd, setDiscountToAdd] = useState<number>(0);

  useEffect(() => {
    if (!customers.length) return;

    const hasCurrentCustomer = customers.some((customer) => customer.id === selectedCustomerId);
    if (!hasCurrentCustomer) {
      const firstCustomer = customers[0];
      setSelectedCustomerId(firstCustomer.id);
      setCustomerName(firstCustomer.name);
      setCustomerTaxId(firstCustomer.taxId);
      setCustomerEmail(firstCustomer.email);
      setCustomerPhone(firstCustomer.phone);
      setCustomerAddress(firstCustomer.address || '');
    }
  }, [customers, selectedCustomerId]);

  useEffect(() => {
    if (!products.length) {
      setSelectedProductToAdd('');
      return;
    }

    const hasCurrentProduct = products.some((product) => product.id === selectedProductToAdd);
    if (!hasCurrentProduct) {
      setSelectedProductToAdd(products[0].id);
    }
  }, [products, selectedProductToAdd]);

  // Quick Select Customer Handler
  const handleSelectCustomer = (custId: string) => {
    setSelectedCustomerId(custId);
    const found = customers.find(c => c.id === custId);
    if (found) {
      setCustomerName(found.name);
      setCustomerTaxId(found.taxId);
      setCustomerEmail(found.email);
      setCustomerPhone(found.phone);
      setCustomerAddress(found.address || '');
    }
  };

  // Add Item to Builder
  const handleAddItem = () => {
    const prod = products.find(p => p.id === selectedProductToAdd);
    if (!prod) return;

    // Check if already in items
    const existingIndex = quoteItems.findIndex(i => i.productId === prod.id);
    const qty = Math.max(1, quantityToAdd);
    const disc = Math.max(0, Math.min(100, discountToAdd));
    const unitPrice = prod.sellingPrice;
    const total = unitPrice * (1 - disc / 100) * qty;
    const subtotal = total / (1 + taxRateDefault / 100);
    const taxAmount = total - subtotal;

    if (existingIndex > -1) {
      const updated = [...quoteItems];
      const newQty = updated[existingIndex].quantity + qty;
      const newTotal = unitPrice * (1 - disc / 100) * newQty;
      const newSubtotal = newTotal / (1 + taxRateDefault / 100);
      const newTax = newTotal - newSubtotal;
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: newQty,
        discountPercent: disc,
        subtotal: newSubtotal,
        taxAmount: newTax,
        total: newTotal
      };
      setQuoteItems(updated);
    } else {
      const newItem: QuoteItem = {
        id: `qitem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        productId: prod.id,
        sku: prod.sku,
        name: prod.name,
        unit: prod.unit,
        unitPrice,
        costPrice: prod.costPrice,
        quantity: qty,
        discountPercent: disc,
        taxRate: taxRateDefault,
        subtotal,
        taxAmount,
        total
      };
      setQuoteItems([...quoteItems, newItem]);
    }

    setQuantityToAdd(1);
    setDiscountToAdd(0);
  };

  // Remove Item
  const handleRemoveItem = (index: number) => {
    const updated = [...quoteItems];
    updated.splice(index, 1);
    setQuoteItems(updated);
  };

  // Update item quantity or discount in-place
  const handleUpdateItem = (index: number, qty: number, disc: number) => {
    const updated = [...quoteItems];
    const item = updated[index];
    const validQty = Math.max(1, qty);
    const validDisc = Math.max(0, Math.min(100, disc));
    const total = item.unitPrice * (1 - validDisc / 100) * validQty;
    const subtotal = total / (1 + item.taxRate / 100);
    const taxAmount = total - subtotal;
    
    updated[index] = {
      ...item,
      quantity: validQty,
      discountPercent: validDisc,
      subtotal,
      taxAmount,
      total
    };
    setQuoteItems(updated);
  };

  // Totals calculations
  const rawSubtotal = quoteItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const calculatedSubtotal = quoteItems.reduce((sum, item) => sum + item.subtotal, 0);
  const totalDiscount = rawSubtotal - calculatedSubtotal;
  const calculatedTax = quoteItems.reduce((sum, item) => sum + item.taxAmount, 0);
  const calculatedGrandTotal = quoteItems.reduce((sum, item) => sum + item.total, 0);

  // Submit New Quote
  const handleSaveQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || quoteItems.length === 0) return;

    await onCreateQuote({
      customerId: selectedCustomerId,
      customerName,
      customerTaxId,
      customerEmail,
      customerPhone,
      customerAddress,
      date: quoteDate,
      expiryDate,
      status: 'SENT',
      items: quoteItems,
      subtotal: calculatedSubtotal,
      discountTotal: totalDiscount,
      taxTotal: calculatedTax,
      total: calculatedGrandTotal,
      currency,
      paymentTerms,
      notes: quoteNotes,
      termsAndConditions: termsAndConditions || settings?.quoteTermsDefault || '',
      createdBy
    });

    setIsCreateModalOpen(false);
    setQuoteItems([]);
    setQuoteNotes('');
  };

  // Convert to Sale Action
  const handleConvertAction = (quote: Quote) => {
    setQuoteToConvert(quote);
  };

  const confirmQuoteConversion = async () => {
    if (!quoteToConvert) return;

    await onConvertToSale(quoteToConvert.id, {
      voucherType: 'FACTURA',
      paymentMethod: 'TRANSFER',
      sellerName: quoteToConvert.createdBy
    });
    setQuoteToConvert(null);
    setIsDetailModalOpen(false);
  };

  // Status changer
  const handleStatusChange = async (quote: Quote, newStatus: QuoteStatus) => {
    if (!canChangeQuoteStatus) return;
    await onUpdateQuote(quote.id, { status: newStatus });
    if (selectedQuote && selectedQuote.id === quote.id) {
      setSelectedQuote({ ...selectedQuote, status: newStatus });
    }
  };

  // Share via WhatsApp
  const handleShareWhatsApp = (quote: Quote) => {
    const text = `*COTIZACIÓN COMERCIAL - ${settings?.companyName}*\n` +
      `Folio: ${quote.quoteNumber}\n` +
      `Cliente: ${quote.customerName}\n` +
      `Fecha: ${quote.date} (Válido hasta: ${quote.expiryDate})\n` +
      `Total: ${quote.currency} ${formatAmount(quote.total)}\n\n` +
      `Ítems cotizados:\n` +
      quote.items.map(i => `• ${i.quantity}x ${i.name} - ${quote.currency}${formatAmount(i.total)}`).join('\n') +
      `\n\nCondiciones: ${quote.paymentTerms}\n` +
      `Contacto: ${settings?.phone} | ${settings?.email}`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  // Copy text details
  const handleCopyQuoteText = (quote: Quote) => {
    const text = `COTIZACIÓN ${quote.quoteNumber}\nCliente: ${quote.customerName}\nTotal: ${quote.currency} ${formatAmount(quote.total)}\nFecha: ${quote.date}\nValidez: ${quote.expiryDate}`;
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Filtered list
  const filteredQuotes = quotes.filter(q => {
    const matchesStatus = statusFilter === 'ALL' || q.status === statusFilter;
    const matchesSearch = searchTerm.trim() === '' ||
      q.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      q.customerTaxId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (q.notes && q.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: QuoteStatus) => {
    switch (status) {
      case 'DRAFT':
        return <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 rounded-full font-bold text-[10px]">Borrador</span>;
      case 'SENT':
        return <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 rounded-full font-bold text-[10px]">Enviada</span>;
      case 'APPROVED':
        return <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">Aprobada</span>;
      case 'CONVERTED':
        return <span className="px-2.5 py-0.5 bg-purple-100 text-purple-800 rounded-full font-bold text-[10px]">Convertida a Venta</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-full font-bold text-[10px]">Rechazada</span>;
      case 'EXPIRED':
        return <span className="px-2.5 py-0.5 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px]">Vencida</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-700/80 shadow-2xl shadow-slate-950/30">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Módulo de Cotizaciones Comerciales</h2>
            <span className="px-2.5 py-0.5 bg-violet-500/20 text-violet-200 border border-violet-400/30 text-xs font-bold rounded-full">
              {filteredQuotes.length} cotizaciones
            </span>
          </div>
        </div>

        <button
          type="button"
          id="btn-open-create-quote-modal"
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-violet-900/40 flex items-center space-x-1.5 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Nueva Cotización</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700/80 shadow-2xl shadow-slate-950/30 flex flex-col md:flex-row gap-3">
        
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-quotes-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por folio COT, nombre de cliente, RUC/DNI..."
            className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-600 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:bg-slate-950"
          />
        </div>

        <div className="flex items-center space-x-2">
          <select
            id="select-quotes-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950/60 border border-slate-600 rounded-xl text-xs text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-violet-500"
          >
            <option value="ALL">Todos los Estados</option>
            <option value="DRAFT">Borrador</option>
            <option value="SENT">Enviada</option>
            <option value="APPROVED">Aprobada</option>
            <option value="CONVERTED">Convertida a Venta</option>
            <option value="REJECTED">Rechazada</option>
            <option value="EXPIRED">Vencida</option>
          </select>
        </div>

      </div>

      {/* Quotes List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Folio / N°</th>
                <th className="py-3.5 px-4">Cliente & Contacto</th>
                <th className="py-3.5 px-4">Fecha / Vigencia</th>
                <th className="py-3.5 px-4 text-center">Ítems</th>
                <th className="py-3.5 px-4">Total</th>
                <th className="py-3.5 px-4">Estado</th>
                <th className="py-3.5 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No se encontraron cotizaciones con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map(quote => (
                  <tr key={quote.id} className="hover:bg-slate-50/80 transition-colors">
                    
                    {/* Quote Folio */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                        <span className="font-mono font-bold text-slate-900">{quote.quoteNumber}</span>
                      </div>
                      {quote.convertedToSaleNumber && (
                        <span className="text-[10px] text-purple-700 font-semibold block font-mono mt-0.5">
                          → {quote.convertedToSaleNumber}
                        </span>
                      )}
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-slate-900 leading-snug">{quote.customerName}</p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {quote.customerTaxId ? `Doc: ${quote.customerTaxId}` : quote.customerEmail}
                      </p>
                    </td>

                    {/* Dates */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <p className="text-slate-700 font-mono text-[11px]">{quote.date}</p>
                      <p className="text-[10px] text-slate-400 font-mono">Vence: {quote.expiryDate}</p>
                    </td>

                    {/* Items Count */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-center font-mono">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
                        {quote.items.length} prod.
                      </span>
                    </td>

                    {/* Total */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono font-bold text-slate-900 text-sm">
                        {quote.currency} {formatAmount(quote.total)}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(quote.status)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end space-x-1">
                        
                        {/* Convert to Sale Button (if not already converted) */}
                        {quote.status !== 'CONVERTED' && (
                          <button
                            type="button"
                            id={`btn-convert-quote-${quote.id}`}
                            onClick={() => handleConvertAction(quote)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-semibold text-[11px] flex items-center space-x-1"
                            title="Convertir a Venta / Factura"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Vender</span>
                          </button>
                        )}

                        {/* View Details */}
                        <button
                          type="button"
                          id={`btn-view-quote-${quote.id}`}
                          onClick={() => {
                            setSelectedQuote(quote);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
                          title="Ver detalle comercial"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Download PDF */}
                        <button
                          type="button"
                          id={`btn-download-pdf-quote-${quote.id}`}
                          onClick={() => {
                            if (settings) generateQuotePDF(quote, settings);
                          }}
                          className="p-1.5 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-lg transition-colors"
                          title="Descargar PDF comercial"
                        >
                          <Download className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          type="button"
                          id={`btn-delete-quote-${quote.id}`}
                          onClick={() => {
                            if (confirm(`¿Eliminar la cotización ${quote.quoteNumber}?`)) {
                              onDeleteQuote(quote.id);
                            }
                          }}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title="Eliminar cotización"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                      </div>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create Quote */}
      {isCreateModalOpen && (
        <div id="modal-create-quote" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-base font-bold">Generador de Cotización Comercial</h3>
                  <p className="text-[11px] text-slate-400">Calcula precios, descuentos e impuestos automáticamente</p>
                </div>
              </div>
              <button 
                id="btn-close-create-quote"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuote} className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* Customer & Quote Header Info */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-900 block">Datos del Cliente & Emisión</span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Seleccionar Cliente Existente</label>
                    <select
                      id="select-quote-customer"
                      value={selectedCustomerId}
                      onChange={e => handleSelectCustomer(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <option value="">-- Cliente Nuevo / Manual --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nombre / Razón Social *</label>
                    <input
                      id="input-quote-cust-name"
                      type="text"
                      required
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                      placeholder="e.g. Acme Corp S.A.C."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">RUC / NIT / Identificación</label>
                    <input
                      id="input-quote-cust-taxid"
                      type="text"
                      value={customerTaxId}
                      onChange={e => setCustomerTaxId(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                      placeholder="e.g. 20601234567"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                    <input
                      id="input-quote-cust-email"
                      type="email"
                      value={customerEmail}
                      onChange={e => setCustomerEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                      placeholder="correo@cliente.com"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Teléfono</label>
                    <input
                      id="input-quote-cust-phone"
                      type="text"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                      placeholder="+51 987 654 321"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Fecha Emisión</label>
                    <input
                      id="input-quote-date"
                      type="date"
                      value={quoteDate}
                      onChange={e => setQuoteDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Válido Hasta (Vigencia)</label>
                    <input
                      id="input-quote-expiry"
                      type="date"
                      value={expiryDate}
                      onChange={e => setExpiryDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Product Selector Bar */}
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-3">
                <span className="text-xs font-bold text-blue-900 block">Agregar Productos a la Cotización</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-6">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Producto del Catálogo</label>
                    <select
                      id="select-quote-add-product"
                      value={selectedProductToAdd}
                      onChange={e => setSelectedProductToAdd(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.name} · ({currency}{formatAmount(p.sellingPrice)}) · [Stock: {p.stock} {p.unit}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Cantidad</label>
                    <input
                      id="input-quote-add-qty"
                      type="number"
                      min="1"
                      value={quantityToAdd}
                      onChange={e => setQuantityToAdd(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono font-bold text-center"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Desc %</label>
                    <input
                      id="input-quote-add-disc"
                      type="number"
                      min="0"
                      max="100"
                      value={discountToAdd}
                      onChange={e => setDiscountToAdd(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-mono text-center"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      id="btn-add-item-to-quote"
                      type="button"
                      onClick={handleAddItem}
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center justify-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold text-[10px] uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Ítem / Producto</th>
                      <th className="py-2.5 px-3 text-center">Cant.</th>
                      <th className="py-2.5 px-3 text-right">P. Unit</th>
                      <th className="py-2.5 px-3 text-center">Desc %</th>
                      <th className="py-2.5 px-3 text-right">Subtotal</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-3 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {quoteItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                          Agrega al menos un producto a la cotización usando el formulario superior.
                        </td>
                      </tr>
                    ) : (
                      quoteItems.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          
                          <td className="py-2.5 px-3">
                            <p className="font-semibold text-slate-900">{item.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</p>
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={e => handleUpdateItem(idx, parseInt(e.target.value) || 1, item.discountPercent)}
                              className="w-14 px-1 py-1 border border-slate-200 rounded text-center font-mono font-bold text-xs"
                            />
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono">
                            {currency} {formatAmount(item.unitPrice)}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discountPercent}
                              onChange={e => handleUpdateItem(idx, item.quantity, parseFloat(e.target.value) || 0)}
                              className="w-12 px-1 py-1 border border-slate-200 rounded text-center font-mono text-xs"
                            />
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                            {currency} {formatAmount(item.subtotal)}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {currency} {formatAmount(item.total)}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>

                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Summary and Terms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Forma de Pago & Términos</label>
                    <input
                      id="input-quote-payment-terms"
                      type="text"
                      value={paymentTerms}
                      onChange={e => setPaymentTerms(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Observaciones Comerciales</label>
                    <textarea
                      id="textarea-quote-notes"
                      rows={2}
                      value={quoteNotes}
                      onChange={e => setQuoteNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      placeholder="e.g. Incluye transporte y entrega en almacén de obra..."
                    />
                  </div>
                </div>

                {/* Totals Breakdown Box */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal Bruto:</span>
                    <span className="font-mono">{currency} {formatAmount(rawSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Descuento Comercial:</span>
                    <span className="font-mono">-{currency} {formatAmount(totalDiscount)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Base Imponible:</span>
                    <span className="font-mono">{currency} {formatAmount(calculatedSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Impuestos (IVA/IGV {taxRateDefault}%):</span>
                    <span className="font-mono">{currency} {formatAmount(calculatedTax)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-300 flex justify-between text-sm font-bold text-slate-900">
                    <span>TOTAL COTIZACIÓN:</span>
                    <span className="font-mono text-base text-blue-700">{currency} {formatAmount(calculatedGrandTotal)}</span>
                  </div>
                </div>

              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  id="btn-save-quote-submit"
                  type="submit"
                  disabled={quoteItems.length === 0}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm flex items-center space-x-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Emitir Cotización</span>
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Modal: View Details & PDF Export */}
      {isDetailModalOpen && selectedQuote && (
        <div id="modal-quote-details" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileSpreadsheet className="w-5 h-5 text-blue-400" />
                <div>
                  <h3 className="text-base font-bold">Cotización {selectedQuote.quoteNumber}</h3>
                  <p className="text-xs text-slate-400">Cliente: {selectedQuote.customerName}</p>
                </div>
              </div>
              <button 
                id="btn-close-quote-details"
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* Status and Fast Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-500">Estado actual:</span>
                  {getStatusBadge(selectedQuote.status)}
                </div>

                <div className="flex items-center space-x-2">
                  {canChangeQuoteStatus && (
                    <select
                      id="select-quote-change-status"
                      value={selectedQuote.status}
                      onChange={e => handleStatusChange(selectedQuote, e.target.value as QuoteStatus)}
                      className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-semibold"
                    >
                      <option value="DRAFT">Marcar Borrador</option>
                      <option value="SENT">Marcar Enviada</option>
                      <option value="APPROVED">Marcar Aprobada</option>
                      <option value="REJECTED">Marcar Rechazada</option>
                      <option value="EXPIRED">Marcar Vencida</option>
                    </select>
                  )}

                  {selectedQuote.status !== 'CONVERTED' && (
                    <button
                      onClick={() => handleConvertAction(selectedQuote)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center space-x-1"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Convertir a Venta</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Descripción</th>
                      <th className="py-2.5 px-3 text-center">Cant.</th>
                      <th className="py-2.5 px-3 text-right">P. Unit</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedQuote.items.map(i => (
                      <tr key={i.id}>
                        <td className="py-2 px-3 font-mono text-[11px]">{i.sku}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{i.name}</td>
                        <td className="py-2 px-3 text-center font-mono">{i.quantity} {i.unit}</td>
                        <td className="py-2 px-3 text-right font-mono">{selectedQuote.currency} {formatAmount(i.unitPrice)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{selectedQuote.currency} {formatAmount(i.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono">{selectedQuote.currency} {formatAmount(selectedQuote.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Impuestos:</span>
                    <span className="font-mono">{selectedQuote.currency} {formatAmount(selectedQuote.taxTotal)}</span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                    <span>Total General:</span>
                    <span className="font-mono text-blue-700">{selectedQuote.currency} {formatAmount(selectedQuote.total)}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleShareWhatsApp(selectedQuote)}
                  className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Enviar por WhatsApp</span>
                </button>
                <button
                  onClick={() => handleCopyQuoteText(selectedQuote)}
                  className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition-colors flex items-center space-x-1"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copiado' : 'Copiar Resumen'}</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  id="btn-pdf-download-detail"
                  onClick={() => {
                    if (settings) generateQuotePDF(selectedQuote, settings);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors shadow-sm flex items-center space-x-1.5"
                >
                  <Download className="w-4 h-4" />
                  <span>Descargar PDF Oficial</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {quoteToConvert && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl shadow-slate-950/50">
            <div className="flex items-center gap-3 border-b border-slate-700 bg-slate-950 px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-400">
                <PackageCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Convertir cotización en venta</h3>
                <p className="text-[11px] text-slate-400">Confirmación de operación</p>
              </div>
              <button
                type="button"
                onClick={() => setQuoteToConvert(null)}
                className="ml-auto rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                aria-label="Cerrar confirmación"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-5 text-sm text-slate-200">
              <p>
                ¿Deseas convertir la cotización <strong className="text-white">{quoteToConvert.quoteNumber}</strong> en una venta directa?
              </p>
              <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 p-3 text-xs leading-relaxed text-amber-100">
                Se registrará la factura y se descontará automáticamente el stock del almacén en el Kardex.
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-700 bg-slate-950 px-5 py-4">
              <button
                type="button"
                onClick={() => setQuoteToConvert(null)}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmQuoteConversion}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-950/30 transition-colors hover:bg-emerald-500"
              >
                Aceptar y convertir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
