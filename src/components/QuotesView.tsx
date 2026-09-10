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
        return <span className="px-2.5 py-0.5 bg-[#1E1E1E] border border-[#2D2D2D] text-[#c8c6c6] rounded font-mono font-bold text-[10px]">Borrador</span>;
      case 'SENT':
        return <span className="px-2.5 py-0.5 bg-blue-950/40 border border-blue-800/40 text-blue-400 rounded font-mono font-bold text-[10px]">Enviada</span>;
      case 'APPROVED':
        return <span className="px-2.5 py-0.5 bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 rounded font-mono font-bold text-[10px]">Aprobada</span>;
      case 'CONVERTED':
        return <span className="px-2.5 py-0.5 bg-purple-950/40 border border-purple-800/40 text-purple-400 rounded font-mono font-bold text-[10px]">Convertida a Venta</span>;
      case 'REJECTED':
        return <span className="px-2.5 py-0.5 bg-[#C8102E]/15 border border-[#C8102E]/40 text-[#ffb3b1] rounded font-mono font-bold text-[10px]">Rechazada</span>;
      case 'EXPIRED':
        return <span className="px-2.5 py-0.5 bg-amber-950/40 border border-amber-800/40 text-amber-400 rounded font-mono font-bold text-[10px]">Vencida</span>;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414] p-5 rounded-md border border-[#2D2D2D]">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Módulo de Cotizaciones Comerciales</h2>
            <span className="px-2.5 py-0.5 bg-[#C8102E]/15 text-[#ffb3b1] border border-[#C8102E]/40 text-xs font-bold font-mono rounded">
              {filteredQuotes.length} cotizaciones
            </span>
          </div>
        </div>

        <button
          type="button"
          id="btn-open-create-quote-modal"
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 bg-[#C8102E] hover:bg-[#A80C25] text-white rounded font-bold text-xs transition-colors shadow-sm flex items-center space-x-1.5 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Nueva Cotización</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-[#141414] p-4 rounded-md border border-[#2D2D2D] flex flex-col md:flex-row gap-3">
        
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-quotes-search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por folio COT, nombre de cliente, RUC/DNI..."
            className="w-full pl-9 pr-4 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded-md text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#C8102E]"
          />
        </div>

        <div className="flex items-center space-x-2">
          <select
            id="select-quotes-status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded-md text-xs text-white font-medium focus:outline-none focus:border-[#C8102E]"
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
      <div className="bg-[#141414] rounded-md border border-[#2D2D2D] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#c8c6c6]">
            <thead className="bg-[#1E1E1E] border-b border-[#2D2D2D] text-[#c8c6c6] font-mono uppercase tracking-wider text-[10px]">
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
            <tbody className="divide-y divide-[#2D2D2D]">
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#71717A]">
                    No se encontraron cotizaciones con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map(quote => (
                  <tr key={quote.id} className="hover:bg-[#1E1E1E]/50 transition-colors">
                    
                    {/* Quote Folio */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <FileSpreadsheet className="w-4 h-4 text-[#C8102E]" />
                        <span className="font-mono font-bold text-white">{quote.quoteNumber}</span>
                      </div>
                      {quote.convertedToSaleNumber && (
                        <span className="text-[10px] text-[#ffb3b1] font-semibold block font-mono mt-0.5">
                          → {quote.convertedToSaleNumber}
                        </span>
                      )}
                    </td>

                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <p className="font-semibold text-white leading-snug">{quote.customerName}</p>
                      <p className="text-[11px] text-[#71717A] font-mono">
                        {quote.customerTaxId ? `Doc: ${quote.customerTaxId}` : quote.customerEmail}
                      </p>
                    </td>

                    {/* Dates */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <p className="text-[#A1A1AA] font-mono text-[11px]">{quote.date}</p>
                      <p className="text-[10px] text-[#71717A] font-mono">Vence: {quote.expiryDate}</p>
                    </td>

                    {/* Items Count */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-center font-mono">
                      <span className="px-2 py-0.5 bg-[#1E1E1E] border border-[#2D2D2D] text-[#c8c6c6] rounded font-mono text-[11px]">
                        {quote.items.length} prod.
                      </span>
                    </td>

                    {/* Total */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-mono tabular-nums font-bold text-white text-sm">
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
                            className="px-2 py-1 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/40 text-emerald-400 rounded font-semibold text-[11px] flex items-center space-x-1 transition-colors"
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
                          className="p-1.5 hover:bg-[#1E1E1E] text-[#A1A1AA] hover:text-white rounded border border-transparent hover:border-[#2D2D2D] transition-colors"
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
                          className="p-1.5 hover:bg-[#1E1E1E] text-[#A1A1AA] hover:text-[#ffb3b1] rounded border border-transparent hover:border-[#2D2D2D] transition-colors"
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
                          className="p-1.5 hover:bg-[#C8102E]/15 text-[#71717A] hover:text-[#C8102E] rounded border border-transparent hover:border-[#C8102E]/40 transition-colors"
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
        <div id="modal-create-quote" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#141414] rounded-md shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-[#2D2D2D]">
            
            {/* Header */}
            <div className="px-6 py-4 bg-[#0E0E0E] text-white flex items-center justify-between border-b border-[#2D2D2D]">
              <div className="flex items-center space-x-2">
                <FileSpreadsheet className="w-5 h-5 text-[#C8102E]" />
                <div>
                  <h3 className="text-base font-bold text-white">Generador de Cotización Comercial</h3>
                  <p className="text-[11px] text-[#71717A]">Calcula precios, descuentos e impuestos automáticamente</p>
                </div>
              </div>
              <button 
                id="btn-close-create-quote"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#71717A] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveQuote} className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* Customer & Quote Header Info */}
              <div className="p-4 bg-[#0E0E0E] border border-[#2D2D2D] rounded-md space-y-3">
                <span className="text-xs font-bold text-white block">Datos del Cliente & Emisión</span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#c8c6c6] mb-1">Seleccionar Cliente Existente</label>
                    <select
                      id="select-quote-customer"
                      value={selectedCustomerId}
                      onChange={e => handleSelectCustomer(e.target.value)}
                      className="w-full px-3 py-2 bg-[#141414] border border-[#2D2D2D] text-white rounded text-xs focus:outline-none focus:border-[#C8102E]"
                    >
                      <option value="">-- Cliente Nuevo / Manual --</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#c8c6c6] mb-1">Nombre / Razón Social *</label>
                    <input
                      id="input-quote-cust-name"
                      type="text"
                      required
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      className="w-full px-3 py-2 bg-[#141414] border border-[#2D2D2D] text-white rounded text-xs font-semibold focus:outline-none focus:border-[#C8102E]"
                      placeholder="e.g. Acme Corp S.A.C."
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#c8c6c6] mb-1">RUC / NIT / Identificación</label>
                    <input
                      id="input-quote-cust-taxid"
                      type="text"
                      value={customerTaxId}
                      onChange={e => setCustomerTaxId(e.target.value)}
                      className="w-full px-3 py-2 bg-[#141414] border border-[#2D2D2D] text-white rounded text-xs font-mono focus:outline-none focus:border-[#C8102E]"
                      placeholder="e.g. 20601234567"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#c8c6c6] mb-1">Correo Electrónico</label>
                    <input
                      id="input-quote-cust-email"
                      type="email"
                      value={customerEmail}
                      onChange={e => setCustomerEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-[#141414] border border-[#2D2D2D] text-white rounded text-xs focus:outline-none focus:border-[#C8102E]"
                      placeholder="correo@cliente.com"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#c8c6c6] mb-1">Teléfono</label>
                    <input
                      id="input-quote-cust-phone"
                      type="text"
                      value={customerPhone}
                      onChange={e => setCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-[#141414] border border-[#2D2D2D] text-white rounded text-xs focus:outline-none focus:border-[#C8102E]"
                      placeholder="+51 987 654 321"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#c8c6c6] mb-1">Fecha Emisión</label>
                    <input
                      id="input-quote-date"
                      type="date"
                      value={quoteDate}
                      onChange={e => setQuoteDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#141414] border border-[#2D2D2D] text-white rounded text-xs font-mono focus:outline-none focus:border-[#C8102E]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#c8c6c6] mb-1">Válido Hasta (Vigencia)</label>
                    <input
                      id="input-quote-expiry"
                      type="date"
                      value={expiryDate}
                      onChange={e => setExpiryDate(e.target.value)}
                      className="w-full px-3 py-2 bg-[#141414] border border-[#2D2D2D] text-white rounded text-xs font-mono focus:outline-none focus:border-[#C8102E]"
                    />
                  </div>
                </div>
              </div>

              {/* Product Selector Bar */}
              <div className="p-4 bg-[#0E0E0E] border border-[#2D2D2D] rounded-md space-y-3">
                <span className="text-xs font-bold text-white block">Agregar Productos a la Cotización</span>
                
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-6">
                    <label className="block text-[11px] font-semibold text-[#c8c6c6] mb-1">Producto del Catálogo</label>
                    <select
                      id="select-quote-add-product"
                      value={selectedProductToAdd}
                      onChange={e => setSelectedProductToAdd(e.target.value)}
                      className="w-full px-3 py-2 bg-[#141414] border border-[#2D2D2D] text-white rounded text-xs focus:outline-none focus:border-[#C8102E]"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                            {p.name} · ({currency}{formatAmount(p.sellingPrice)}) · [Stock: {p.stock} {p.unit}]
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-[#c8c6c6] mb-1">Cantidad</label>
                    <input
                      id="input-quote-add-qty"
                      type="number"
                      min="1"
                      value={quantityToAdd}
                      onChange={e => setQuantityToAdd(parseInt(e.target.value) || 1)}
                      className="w-full px-3 py-2 bg-[#141414] border border-[#2D2D2D] text-white rounded text-xs font-mono tabular-nums font-bold text-center focus:outline-none focus:border-[#C8102E]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-[#c8c6c6] mb-1">Desc %</label>
                    <input
                      id="input-quote-add-disc"
                      type="number"
                      min="0"
                      max="100"
                      value={discountToAdd}
                      onChange={e => setDiscountToAdd(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 bg-[#141414] border border-[#2D2D2D] text-white rounded text-xs font-mono tabular-nums text-center focus:outline-none focus:border-[#C8102E]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <button
                      id="btn-add-item-to-quote"
                      type="button"
                      onClick={handleAddItem}
                      className="w-full py-2 bg-[#C8102E] hover:bg-[#A80C25] text-white rounded text-xs font-bold transition-colors flex items-center justify-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Agregar</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-[#2D2D2D] rounded-md overflow-hidden">
                <table className="w-full text-left text-xs text-[#c8c6c6]">
                  <thead className="bg-[#1E1E1E] border-b border-[#2D2D2D] text-[#c8c6c6] font-mono font-semibold text-[10px] uppercase">
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
                  <tbody className="divide-y divide-[#2D2D2D]">
                    {quoteItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-[#71717A] text-xs">
                          Agrega al menos un producto a la cotización usando el formulario superior.
                        </td>
                      </tr>
                    ) : (
                      quoteItems.map((item, idx) => (
                        <tr key={item.id} className="hover:bg-[#1E1E1E]/50">
                          
                          <td className="py-2.5 px-3">
                            <p className="font-semibold text-white">{item.name}</p>
                            <p className="text-[10px] text-[#71717A] font-mono">SKU: {item.sku}</p>
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={e => handleUpdateItem(idx, parseInt(e.target.value) || 1, item.discountPercent)}
                              className="w-14 px-1 py-1 bg-[#141414] border border-[#2D2D2D] text-white rounded text-center font-mono tabular-nums font-bold text-xs focus:outline-none focus:border-[#C8102E]"
                            />
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#c8c6c6]">
                            {currency} {formatAmount(item.unitPrice)}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={item.discountPercent}
                              onChange={e => handleUpdateItem(idx, item.quantity, parseFloat(e.target.value) || 0)}
                              className="w-12 px-1 py-1 bg-[#141414] border border-[#2D2D2D] text-white rounded text-center font-mono tabular-nums text-xs focus:outline-none focus:border-[#C8102E]"
                            />
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#A1A1AA]">
                            {currency} {formatAmount(item.subtotal)}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-white">
                            {currency} {formatAmount(item.total)}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-[#71717A] hover:text-[#C8102E] rounded transition-colors"
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
                    <label className="block text-[11px] font-semibold text-[#c8c6c6] mb-1">Forma de Pago & Términos</label>
                    <input
                      id="input-quote-payment-terms"
                      type="text"
                      value={paymentTerms}
                      onChange={e => setPaymentTerms(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] text-white rounded-md text-xs focus:outline-none focus:border-[#C8102E]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#c8c6c6] mb-1">Observaciones Comerciales</label>
                    <textarea
                      id="textarea-quote-notes"
                      rows={2}
                      value={quoteNotes}
                      onChange={e => setQuoteNotes(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] text-white rounded-md text-xs focus:outline-none focus:border-[#C8102E]"
                      placeholder="e.g. Incluye transporte y entrega en almacén de obra..."
                    />
                  </div>
                </div>

                {/* Totals Breakdown Box */}
                <div className="p-4 bg-[#0E0E0E] border border-[#2D2D2D] rounded-md space-y-2 text-xs">
                  <div className="flex justify-between text-[#A1A1AA]">
                    <span>Subtotal Bruto:</span>
                    <span className="font-mono tabular-nums">{currency} {formatAmount(rawSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#10B981] font-medium">
                    <span>Descuento Comercial:</span>
                    <span className="font-mono tabular-nums">-{currency} {formatAmount(totalDiscount)}</span>
                  </div>
                  <div className="flex justify-between text-[#A1A1AA]">
                    <span>Base Imponible:</span>
                    <span className="font-mono tabular-nums">{currency} {formatAmount(calculatedSubtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#A1A1AA]">
                    <span>Impuestos (IVA/IGV {taxRateDefault}%):</span>
                    <span className="font-mono tabular-nums">{currency} {formatAmount(calculatedTax)}</span>
                  </div>
                  <div className="pt-2 border-t border-[#2D2D2D] flex justify-between text-sm font-bold text-white">
                    <span>TOTAL COTIZACIÓN:</span>
                    <span className="font-mono tabular-nums text-base text-[#ffb3b1]">{currency} {formatAmount(calculatedGrandTotal)}</span>
                  </div>
                </div>

              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-4 border-t border-[#2D2D2D] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-[#1E1E1E] hover:bg-[#2D2D2D] text-white border border-[#2D2D2D] text-xs font-semibold rounded"
                >
                  Cancelar
                </button>
                <button
                  id="btn-save-quote-submit"
                  type="submit"
                  disabled={quoteItems.length === 0}
                  className="px-5 py-2 bg-[#C8102E] hover:bg-[#A80C25] disabled:opacity-50 text-white text-xs font-bold rounded shadow-sm flex items-center space-x-1.5"
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
        <div id="modal-quote-details" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#141414] rounded-md shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-[#2D2D2D]">
            
            {/* Header */}
            <div className="px-6 py-4 bg-[#0E0E0E] text-white flex items-center justify-between border-b border-[#2D2D2D]">
              <div className="flex items-center space-x-3">
                <FileSpreadsheet className="w-5 h-5 text-[#C8102E]" />
                <div>
                  <h3 className="text-base font-bold text-white">Cotización {selectedQuote.quoteNumber}</h3>
                  <p className="text-xs text-[#71717A]">Cliente: {selectedQuote.customerName}</p>
                </div>
              </div>
              <button 
                id="btn-close-quote-details"
                onClick={() => setIsDetailModalOpen(false)}
                className="text-[#71717A] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              
              {/* Status and Fast Actions Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#0E0E0E] border border-[#2D2D2D] rounded-md">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-[#c8c6c6]">Estado actual:</span>
                  {getStatusBadge(selectedQuote.status)}
                </div>

                <div className="flex items-center space-x-2">
                  {canChangeQuoteStatus && (
                    <select
                      id="select-quote-change-status"
                      value={selectedQuote.status}
                      onChange={e => handleStatusChange(selectedQuote, e.target.value as QuoteStatus)}
                      className="px-2.5 py-1 bg-[#141414] border border-[#2D2D2D] text-white rounded text-xs font-semibold focus:outline-none focus:border-[#C8102E]"
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
                      className="px-3 py-1 bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-800/40 text-emerald-400 rounded text-xs font-bold transition-colors flex items-center space-x-1"
                    >
                      <PackageCheck className="w-3.5 h-3.5" />
                      <span>Convertir a Venta</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Items Breakdown */}
              <div className="border border-[#2D2D2D] rounded-md overflow-hidden">
                <table className="w-full text-left text-xs text-[#c8c6c6]">
                  <thead className="bg-[#1E1E1E] text-[#c8c6c6] font-mono uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Descripción</th>
                      <th className="py-2.5 px-3 text-center">Cant.</th>
                      <th className="py-2.5 px-3 text-right">P. Unit</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2D2D]">
                    {selectedQuote.items.map(i => (
                      <tr key={i.id}>
                        <td className="py-2 px-3 font-mono text-[11px] text-[#A1A1AA]">{i.sku}</td>
                        <td className="py-2 px-3 font-medium text-white">{i.name}</td>
                        <td className="py-2 px-3 text-center font-mono tabular-nums">{i.quantity} {i.unit}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums text-[#c8c6c6]">{selectedQuote.currency} {formatAmount(i.unitPrice)}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-white">{selectedQuote.currency} {formatAmount(i.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 p-3 bg-[#0E0E0E] border border-[#2D2D2D] rounded-md text-xs space-y-1.5">
                  <div className="flex justify-between text-[#A1A1AA]">
                    <span>Subtotal:</span>
                    <span className="font-mono tabular-nums">{selectedQuote.currency} {formatAmount(selectedQuote.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#A1A1AA]">
                    <span>Impuestos:</span>
                    <span className="font-mono tabular-nums">{selectedQuote.currency} {formatAmount(selectedQuote.taxTotal)}</span>
                  </div>
                  <div className="pt-1.5 border-t border-[#2D2D2D] flex justify-between font-bold text-sm text-white">
                    <span>Total General:</span>
                    <span className="font-mono tabular-nums text-[#ffb3b1]">{selectedQuote.currency} {formatAmount(selectedQuote.total)}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="bg-[#0E0E0E] px-6 py-4 border-t border-[#2D2D2D] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleShareWhatsApp(selectedQuote)}
                  className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold transition-colors flex items-center space-x-1.5"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Enviar por WhatsApp</span>
                </button>
                <button
                  onClick={() => handleCopyQuoteText(selectedQuote)}
                  className="px-3 py-2 bg-[#1E1E1E] hover:bg-[#2D2D2D] text-white border border-[#2D2D2D] rounded text-xs font-semibold transition-colors flex items-center space-x-1"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? 'Copiado' : 'Copiar Resumen'}</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  id="btn-pdf-download-detail"
                  onClick={() => {
                    if (settings) generateQuotePDF(selectedQuote, settings);
                  }}
                  className="px-4 py-2 bg-[#C8102E] hover:bg-[#A80C25] text-white rounded text-xs font-bold transition-colors shadow-sm flex items-center space-x-1.5"
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-md overflow-hidden rounded-md border border-[#2D2D2D] bg-[#141414] shadow-2xl">
            <div className="flex items-center gap-3 border-b border-[#2D2D2D] bg-[#0E0E0E] px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded bg-emerald-950/40 border border-emerald-800/40 text-emerald-400">
                <PackageCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Convertir cotización en venta</h3>
                <p className="text-[11px] text-[#71717A]">Confirmación de operación</p>
              </div>
              <button
                type="button"
                onClick={() => setQuoteToConvert(null)}
                className="ml-auto rounded p-1.5 text-[#71717A] transition-colors hover:bg-[#1E1E1E] hover:text-white"
                aria-label="Cerrar confirmación"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-5 text-sm text-[#c8c6c6]">
              <p>
                ¿Deseas convertir la cotización <strong className="text-white font-mono">{quoteToConvert.quoteNumber}</strong> en una venta directa?
              </p>
              <div className="rounded border border-amber-800/40 bg-amber-950/40 p-3 text-xs leading-relaxed text-amber-300">
                Se registrará la factura y se descontará automáticamente el stock del almacén en el Kardex.
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-[#2D2D2D] bg-[#0E0E0E] px-5 py-4">
              <button
                type="button"
                onClick={() => setQuoteToConvert(null)}
                className="rounded bg-[#1E1E1E] border border-[#2D2D2D] px-4 py-2 text-xs font-semibold text-[#c8c6c6] transition-colors hover:bg-[#2D2D2D] hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmQuoteConversion}
                className="rounded bg-[#C8102E] hover:bg-[#A80C25] px-4 py-2 text-xs font-bold text-white shadow-sm transition-colors"
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
