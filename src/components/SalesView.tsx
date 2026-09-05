import React, { useEffect, useState } from 'react';
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  DollarSign, 
  CreditCard, 
  Building2, 
  Receipt, 
  FileText, 
  Download, 
  Eye, 
  Ban, 
  CheckCircle2, 
  AlertTriangle, 
  User, 
  Calculator, 
  ArrowRight,
  Printer,
  Calendar,
  X
} from 'lucide-react';
import { Sale, SaleItem, Product, Customer, CompanySettings, VoucherType, PaymentMethod, Category } from '../types';
import { generateSaleInvoicePDF } from '../lib/pdfGenerator';
import { formatAmount } from '../lib/formatters';

interface SalesViewProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  categories: Category[];
  settings: CompanySettings | null;
  onCreateSale: (sale: Partial<Sale>) => Promise<void>;
  onCancelSale: (id: string, reason: string) => Promise<void>;
  isPosModalOpen: boolean;
  setIsPosModalOpen: (open: boolean) => void;
  isLoading: boolean;
}

export const SalesView: React.FC<SalesViewProps> = ({
  sales,
  products,
  customers,
  categories,
  settings,
  onCreateSale,
  onCancelSale,
  isPosModalOpen,
  setIsPosModalOpen,
  isLoading
}) => {
  const currency = settings?.currencySymbol || 'S/.';
  const taxRateDefault = settings?.defaultTaxRate || 18;

  // View Subtabs
  const [subTab, setSubTab] = useState<'history' | 'pos'>('pos');
  
  // History Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [voucherFilter, setVoucherFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  // POS State
  const [posSearch, setPosSearch] = useState('');
  const [posCategory, setPosCategory] = useState('ALL');
  const [cartItems, setCartItems] = useState<SaleItem[]>([]);
  
  const [voucherType, setVoucherType] = useState<VoucherType>('FACTURA');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH');
  const [selectedCustomerId, setSelectedCustomerId] = useState(customers[0]?.id || '');
  const [customerName, setCustomerName] = useState(customers[0]?.name || 'CLIENTE GENERAL');
  const [customerTaxId, setCustomerTaxId] = useState(customers[0]?.taxId || '99999999');
  const [customerEmail, setCustomerEmail] = useState(customers[0]?.email || '');
  const [sellerName, setSellerName] = useState('Cajero Principal');
  const [notes, setNotes] = useState('');
  
  // Cash Tendered & Change
  const [cashTendered, setCashTendered] = useState<number>(0);

  useEffect(() => {
    if (!customers.length) {
      setSelectedCustomerId('general');
      setCustomerName('CLIENTE GENERAL');
      setCustomerTaxId('99999999');
      setCustomerEmail('');
      return;
    }

    const hasCurrentCustomer = customers.some((customer) => customer.id === selectedCustomerId) || selectedCustomerId === 'general';
    if (!hasCurrentCustomer) {
      const firstCustomer = customers[0];
      setSelectedCustomerId(firstCustomer.id);
      setCustomerName(firstCustomer.name);
      setCustomerTaxId(firstCustomer.taxId);
      setCustomerEmail(firstCustomer.email);
    }
  }, [customers, selectedCustomerId]);

  // Quick Select Customer Handler
  const handleSelectCustomer = (custId: string) => {
    setSelectedCustomerId(custId);
    if (custId === 'general') {
      setCustomerName('CLIENTES VARIOS / GENERAL');
      setCustomerTaxId('99999999');
      setCustomerEmail('');
      return;
    }
    const found = customers.find(c => c.id === custId);
    if (found) {
      setCustomerName(found.name);
      setCustomerTaxId(found.taxId);
      setCustomerEmail(found.email);
    }
  };

  // Add Product to POS Cart
  const handleAddToCart = (product: Product) => {
    if (product.stock <= 0) {
      alert(`El producto "${product.name}" está agotado en inventario.`);
      return;
    }

    const existingIndex = cartItems.findIndex(item => item.productId === product.id);
    if (existingIndex > -1) {
      const currentQty = cartItems[existingIndex].quantity;
      if (currentQty + 1 > product.stock) {
        alert(`No puedes agregar más unidades. Stock disponible: ${product.stock}`);
        return;
      }
      const updated = [...cartItems];
      const newQty = currentQty + 1;
      const total = product.sellingPrice * newQty;
      const subtotal = total / (1 + taxRateDefault / 100);
      const taxAmount = total - subtotal;
      updated[existingIndex] = {
        ...updated[existingIndex],
        quantity: newQty,
        subtotal,
        taxAmount,
        total
      };
      setCartItems(updated);
    } else {
      const total = product.sellingPrice;
      const subtotal = total / (1 + taxRateDefault / 100);
      const taxAmount = total - subtotal;
      const newItem: SaleItem = {
        id: `sitem-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        productId: product.id,
        sku: product.sku,
        name: product.name,
        unit: product.unit,
        unitPrice: product.sellingPrice,
        costPrice: product.costPrice,
        quantity: 1,
        discountPercent: 0,
        taxRate: taxRateDefault,
        subtotal,
        taxAmount,
        total
      };
      setCartItems([...cartItems, newItem]);
    }
  };

  // Update Cart Item Quantity
  const handleUpdateCartQty = (index: number, newQty: number) => {
    const item = cartItems[index];
    const product = products.find(p => p.id === item.productId);
    if (!product) return;

    if (newQty <= 0) {
      handleRemoveCartItem(index);
      return;
    }

    if (newQty > product.stock) {
      alert(`Stock insuficiente. Máximo disponible: ${product.stock} ${product.unit}`);
      return;
    }

    const updated = [...cartItems];
    const total = item.unitPrice * (1 - item.discountPercent / 100) * newQty;
    const subtotal = total / (1 + item.taxRate / 100);
    const taxAmount = total - subtotal;
    updated[index] = {
      ...item,
      quantity: newQty,
      subtotal,
      taxAmount,
      total
    };
    setCartItems(updated);
  };

  // Remove Cart Item
  const handleRemoveCartItem = (index: number) => {
    const updated = [...cartItems];
    updated.splice(index, 1);
    setCartItems(updated);
  };

  // Clear Cart
  const handleClearCart = () => {
    setCartItems([]);
    setCashTendered(0);
    setNotes('');
  };

  // Cart Calculations
  const rawSubtotal = cartItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const cartSubtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
  const cartDiscount = rawSubtotal - cartSubtotal;
  const cartTax = cartItems.reduce((sum, item) => sum + item.taxAmount, 0);
  const cartGrandTotal = cartItems.reduce((sum, item) => sum + item.total, 0);
  const changeDue = Math.max(0, cashTendered - cartGrandTotal);

  // Complete Sale
  const handleCompleteSale = async () => {
    if (cartItems.length === 0) {
      alert('Agrega al menos un producto al carrito de venta.');
      return;
    }
    if (!customerName.trim()) {
      alert('Ingresa el nombre del cliente o receptor.');
      return;
    }

    await onCreateSale({
      voucherType,
      customerId: selectedCustomerId || 'cust-general',
      customerName,
      customerTaxId,
      customerEmail,
      date: new Date().toISOString().split('T')[0],
      items: cartItems,
      subtotal: cartSubtotal,
      discountTotal: cartDiscount,
      taxTotal: cartTax,
      total: cartGrandTotal,
      currency,
      paymentMethod,
      paymentStatus: 'PAID',
      paidAmount: paymentMethod === 'CASH' && cashTendered > 0 ? cashTendered : cartGrandTotal,
      dueAmount: 0,
      notes,
      sellerName,
      status: 'COMPLETED'
    });

    handleClearCart();
    setSubTab('history');
  };

  // Confirm Sale Cancellation
  const handleConfirmCancel = async () => {
    if (!selectedSale || !cancelReason.trim()) return;
    await onCancelSale(selectedSale.id, cancelReason);
    setIsCancelModalOpen(false);
    setIsDetailModalOpen(false);
    setCancelReason('');
  };

  // Filtered Sales History
  const filteredSales = sales.filter(s => {
    const matchesVoucher = voucherFilter === 'ALL' || s.voucherType === voucherFilter;
    const matchesStatus = statusFilter === 'ALL' || s.status === statusFilter;
    const matchesSearch = searchTerm.trim() === '' ||
      s.saleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.customerTaxId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.notes && s.notes.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesVoucher && matchesStatus && matchesSearch;
  });

  // Filtered Products for POS
  const posFilteredProducts = products.filter(p => {
    const matchesCategory = posCategory === 'ALL' || p.category.toLowerCase() === posCategory.toLowerCase();
    const matchesSearch = posSearch.trim() === '' ||
      p.name.toLowerCase().includes(posSearch.toLowerCase()) ||
      p.sku.toLowerCase().includes(posSearch.toLowerCase()) ||
      (p.barcode && p.barcode.toLowerCase().includes(posSearch.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header & Tab Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-700/80 shadow-2xl shadow-slate-950/30">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Control de Ventas & Punto de Venta (POS)</h2>
          </div>
        </div>

        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-600 self-start md:self-auto">
          <button
            id="tab-pos-terminal"
            onClick={() => setSubTab('pos')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 ${
              subTab === 'pos'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Terminal POS / Caja</span>
          </button>
          <button
            id="tab-sales-history"
            onClick={() => setSubTab('history')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 ${
              subTab === 'history'
                ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/30'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Historial de Ventas ({sales.length})</span>
          </button>
        </div>
      </div>

      {subTab === 'pos' ? (
        
        /* POS Mode: Left products catalogue, Right live cart & checkout */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Product Selector (7 cols on lg) */}
          <div className="lg:col-span-7 space-y-4">
            
            {/* Search & Category Pills */}
            <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700/80 shadow-2xl shadow-slate-950/30 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-pos-search"
                  type="text"
                  value={posSearch}
                  onChange={e => setPosSearch(e.target.value)}
                  placeholder="Buscar producto por nombre, SKU o código de barras para venta rápida..."
                  className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-600 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500 focus:bg-slate-950"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setPosCategory('ALL')}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg shrink-0 transition-colors ${
                    posCategory === 'ALL'
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todos
                </button>
                {categories.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setPosCategory(c.name)}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg shrink-0 transition-colors ${
                      posCategory === c.name
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
              {posFilteredProducts.map(product => {
                const isOutOfStock = product.stock <= 0;
                return (
                  <button
                    key={product.id}
                    id={`btn-pos-add-${product.id}`}
                    disabled={isOutOfStock}
                    onClick={() => handleAddToCart(product)}
                    className={`p-3 rounded-2xl border text-left flex flex-col justify-between transition-all group ${
                      isOutOfStock
                        ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-emerald-500 hover:shadow-md active:scale-98'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono text-slate-400 truncate max-w-[100px]">{product.sku}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                          isOutOfStock ? 'bg-red-100 text-red-700' :
                          product.stock <= product.minStock ? 'bg-amber-100 text-amber-800' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {product.stock} {product.unit}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-2 group-hover:text-emerald-700 transition-colors">
                        {product.name}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900 font-mono">
                        {currency} {formatAmount(product.sellingPrice)}
                      </span>
                      <span className="w-6 h-6 rounded-lg bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center text-xs group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        +
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Right Column: Active Cart & Checkout (5 cols on lg) */}
          <div className="lg:col-span-5 bg-slate-900/80 rounded-2xl border border-slate-700/80 shadow-2xl shadow-slate-950/30 p-5 space-y-4">
            
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Carrito de Venta Actual</h3>
              </div>
              {cartItems.length > 0 && (
                <button
                  onClick={handleClearCart}
                  className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                >
                  Vaciar
                </button>
              )}
            </div>

            {/* Voucher & Customer Selector */}
            <div className="space-y-3 p-3 bg-slate-950/60 border border-slate-600 rounded-xl text-xs">
              
              <div className="grid grid-cols-3 gap-2">
                {(['FACTURA', 'BOLETA', 'TICKET'] as VoucherType[]).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setVoucherType(type)}
                    className={`py-1.5 text-center font-bold rounded-lg transition-colors ${
                      voucherType === type
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Cliente / Receptor</label>
                <select
                  id="select-pos-customer"
                  value={selectedCustomerId}
                  onChange={e => handleSelectCustomer(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                >
                  <option value="general">CLIENTES VARIOS / PÚBLICO GENERAL</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.taxId})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={customerName}
                  onChange={e => setCustomerName(e.target.value)}
                  placeholder="Nombre / Razón Social"
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                />
                <input
                  type="text"
                  value={customerTaxId}
                  onChange={e => setCustomerTaxId(e.target.value)}
                  placeholder="RUC / DNI"
                  className="px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono"
                />
              </div>

            </div>

            {/* Cart Items List */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {cartItems.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p>El carrito está vacío.</p>
                  <p className="text-[11px]">Haz clic en los productos para agregarlos.</p>
                </div>
              ) : (
                cartItems.map((item, idx) => (
                  <div key={item.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-slate-900 truncate">{item.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">
                        {currency}{formatAmount(item.unitPrice)} x {item.quantity} = <strong>{currency}{formatAmount(item.total)}</strong>
                      </p>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => handleUpdateCartQty(idx, item.quantity - 1)}
                        className="w-6 h-6 bg-white border border-slate-200 rounded-md font-bold flex items-center justify-center hover:bg-slate-100"
                      >
                        -
                      </button>
                      <span className="w-7 text-center font-mono font-bold">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateCartQty(idx, item.quantity + 1)}
                        className="w-6 h-6 bg-white border border-slate-200 rounded-md font-bold flex items-center justify-center hover:bg-slate-100"
                      >
                        +
                      </button>
                      <button
                        onClick={() => handleRemoveCartItem(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 ml-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-semibold text-slate-700">Método de Pago</label>
              <div className="grid grid-cols-4 gap-1.5">
                {[
                  { id: 'CASH', label: 'Efectivo', icon: DollarSign },
                  { id: 'CARD', label: 'Tarjeta', icon: CreditCard },
                  { id: 'TRANSFER', label: 'Transf.', icon: Building2 },
                  { id: 'CREDIT', label: 'Crédito', icon: Calendar }
                ].map(method => {
                  const Icon = method.icon;
                  const isSelected = paymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                      className={`p-2 rounded-xl text-center flex flex-col items-center justify-center gap-1 transition-all ${
                        isSelected
                          ? 'bg-emerald-50 border border-emerald-500 text-emerald-800 font-bold'
                          : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px]">{method.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Cash Tendered & Change Calculator (if CASH) */}
            {paymentMethod === 'CASH' && (
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-900">Monto Recibido ({currency}):</span>
                  <input
                    id="input-cash-tendered"
                    type="number"
                    min="0"
                    step="1"
                    value={cashTendered || ''}
                    onChange={e => setCashTendered(parseFloat(e.target.value) || 0)}
                    placeholder={formatAmount(cartGrandTotal)}
                    className="w-24 px-2 py-1 bg-white border border-emerald-300 rounded-lg text-right font-mono font-bold text-xs"
                  />
                </div>
                {cashTendered >= cartGrandTotal && (
                  <div className="flex items-center justify-between text-emerald-900 font-bold">
                    <span>Vuelto / Cambio:</span>
                    <span className="font-mono text-sm">{currency} {formatAmount(changeDue)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Totals Summary */}
            <div className="p-3.5 bg-slate-900 text-white rounded-xl space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal:</span>
                <span className="font-mono">{currency} {formatAmount(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Impuesto ({taxRateDefault}%):</span>
                <span className="font-mono">{currency} {formatAmount(cartTax)}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between text-base font-bold">
                <span>TOTAL A PAGAR:</span>
                <span className="font-mono text-emerald-400">{currency} {formatAmount(cartGrandTotal)}</span>
              </div>
            </div>

            {/* Complete Sale Button */}
            <button
              id="btn-complete-pos-sale"
              onClick={handleCompleteSale}
              disabled={cartItems.length === 0 || isLoading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>Cobrar & Emitir Comprobante</span>
            </button>

          </div>

        </div>

      ) : (
        
        /* Sales History View */
        <div className="space-y-4">
          
          {/* Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-sales-search"
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por número de factura/boleta, cliente, RUC..."
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 focus:bg-white"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                id="select-sales-voucher"
                value={voucherFilter}
                onChange={e => setVoucherFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Todos los Comprobantes</option>
                <option value="FACTURA">Facturas</option>
                <option value="BOLETA">Boletas</option>
                <option value="TICKET">Tickets</option>
              </select>

              <select
                id="select-sales-status"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="COMPLETED">Completadas / Válidas</option>
                <option value="CANCELLED">Anuladas (Revertidas)</option>
              </select>
            </div>
          </div>

          {/* Sales History Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Comprobante / N°</th>
                    <th className="py-3.5 px-4">Cliente & Doc</th>
                    <th className="py-3.5 px-4">Fecha</th>
                    <th className="py-3.5 px-4">Método Pago</th>
                    <th className="py-3.5 px-4">Total</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No hay ventas registradas que coincidan con los filtros.
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map(sale => {
                      const isCancelled = sale.status === 'CANCELLED';
                      return (
                        <tr key={sale.id} className={`hover:bg-slate-50/80 transition-colors ${isCancelled ? 'bg-rose-50/40' : ''}`}>
                          
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <Receipt className={`w-4 h-4 ${isCancelled ? 'text-rose-500' : 'text-emerald-600'}`} />
                              <span className="font-mono font-bold text-slate-900">{sale.saleNumber}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 block font-semibold">{sale.voucherType}</span>
                          </td>

                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-slate-900 leading-snug">{sale.customerName}</p>
                            <p className="text-[11px] text-slate-500 font-mono">{sale.customerTaxId || '-'}</p>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-slate-600">
                            {sale.date}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
                              {sale.paymentMethod}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-slate-900 text-sm">
                            {sale.currency} {formatAmount(sale.total)}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isCancelled ? (
                              <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-full font-bold text-[10px]">
                                Anulado
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                                Pagado
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end space-x-1">
                              
                              {/* View Details */}
                              <button
                                id={`btn-view-sale-${sale.id}`}
                                onClick={() => {
                                  setSelectedSale(sale);
                                  setIsDetailModalOpen(true);
                                }}
                                className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
                                title="Ver comprobante"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Download PDF */}
                              <button
                                id={`btn-download-pdf-sale-${sale.id}`}
                                onClick={() => {
                                  if (settings) generateSaleInvoicePDF(sale, settings);
                                }}
                                className="p-1.5 hover:bg-emerald-50 text-slate-600 hover:text-emerald-600 rounded-lg transition-colors"
                                title="Descargar comprobante en PDF"
                              >
                                <Download className="w-4 h-4" />
                              </button>

                              {/* Cancel Sale Button */}
                              {!isCancelled && (
                                <button
                                  id={`btn-cancel-sale-${sale.id}`}
                                  onClick={() => {
                                    setSelectedSale(sale);
                                    setIsCancelModalOpen(true);
                                  }}
                                  className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                                  title="Anular venta y reincorporar stock"
                                >
                                  <Ban className="w-4 h-4" />
                                </button>
                              )}

                            </div>
                          </td>

                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* Modal: View Sale Details */}
      {isDetailModalOpen && selectedSale && (
        <div id="modal-sale-details" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200">
            
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-bold">{selectedSale.voucherType} N° {selectedSale.saleNumber}</h3>
                  <p className="text-xs text-slate-400">{selectedSale.customerName}</p>
                </div>
              </div>
              <button 
                id="btn-close-sale-details"
                onClick={() => setIsDetailModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {selectedSale.status === 'CANCELLED' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <div>
                    <strong>COMPROBANTE ANULADO:</strong> Motivo: {selectedSale.cancellationReason || 'No especificado'}. Las existencias fueron reincorporadas al inventario.
                  </div>
                </div>
              )}

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-700 font-semibold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Producto</th>
                      <th className="py-2.5 px-3 text-center">Cant.</th>
                      <th className="py-2.5 px-3 text-right">P. Unit</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {selectedSale.items.map(item => (
                      <tr key={item.id}>
                        <td className="py-2 px-3 font-mono text-[11px]">{item.sku}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{item.name}</td>
                        <td className="py-2 px-3 text-center font-mono">{item.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono">{selectedSale.currency} {formatAmount(item.unitPrice)}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-slate-900">{selectedSale.currency} {formatAmount(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="w-60 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span className="font-mono">{selectedSale.currency} {formatAmount(selectedSale.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Impuestos:</span>
                    <span className="font-mono">{selectedSale.currency} {formatAmount(selectedSale.taxTotal)}</span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
                    <span>Total Pagado:</span>
                    <span className="font-mono text-emerald-600">{selectedSale.currency} {formatAmount(selectedSale.total)}</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => {
                  if (settings) generateSaleInvoicePDF(selectedSale, settings);
                }}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Descargar PDF</span>
              </button>

              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Cancel Sale */}
      {isCancelModalOpen && selectedSale && (
        <div id="modal-cancel-sale" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Ban className="w-5 h-5" />
                <h3 className="text-base font-bold">Anulación de Venta & Reversión</h3>
              </div>
              <button onClick={() => setIsCancelModalOpen(false)} className="text-rose-200 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-700">
                ¿Estás seguro de anular el comprobante <strong>{selectedSale.saleNumber}</strong> por el monto de <strong>{selectedSale.currency} {formatAmount(selectedSale.total)}</strong>?
              </p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                <strong>Efecto en inventario:</strong> Las unidades vendidas ({selectedSale.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}) volverán a sumarse al stock de almacén y se registrará un ajuste positivo en el Kardex.
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Motivo de Anulación *</label>
                <textarea
                  id="textarea-cancel-reason"
                  required
                  rows={2}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="e.g. Error en datos de facturación a solicitud del cliente o devolución de mercadería"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-cancel-sale"
                  type="button"
                  disabled={!cancelReason.trim()}
                  onClick={handleConfirmCancel}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-sm"
                >
                  Confirmar Anulación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
