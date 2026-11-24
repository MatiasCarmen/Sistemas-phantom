import React, { useEffect, useState } from 'react';
import { 
  ShoppingCart, 
  Search, 
  UserPlus,
  Plus, 
  Minus, 
  Trash2, 
  DollarSign, 
  CreditCard, 
  Tag,
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
  X
} from 'lucide-react';
import { Sale, SaleItem, Product, Customer, CompanySettings, VoucherType, PaymentMethod, Category, Store, StoreStock } from '../types';
import { generateSaleInvoicePDF } from '../lib/pdfGenerator';
import { formatAmount } from '../lib/formatters';

interface SalesViewProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  categories: Category[];
  stores: Store[];
  storeStock: StoreStock[];
  settings: CompanySettings | null;
  onCreateSale: (sale: Partial<Sale>) => Promise<void>;
  onRegisterCustomer: (customer: Partial<Customer>) => Promise<Customer>;
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
  stores,
  storeStock,
  settings,
  onCreateSale,
  onRegisterCustomer,
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
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerTaxId, setCustomerTaxId] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerSearchMessage, setCustomerSearchMessage] = useState('');
  const [isRegisteringCustomer, setIsRegisteringCustomer] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    documentType: 'RUC' as 'RUC' | 'NIT' | 'DNI',
    taxId: '',
    email: '',
    phone: '',
    address: '',
    status: 'Activo'
  });
  const [customerRegistrationError, setCustomerRegistrationError] = useState('');
  const [sellerName, setSellerName] = useState('Cajero Principal');
  const [selectedCardBrand, setSelectedCardBrand] = useState<'VISA' | 'MASTERCARD' | 'AMEX' | ''>('');
  const [isGiftCouponModalOpen, setIsGiftCouponModalOpen] = useState(false);
  const [giftCouponNumber, setGiftCouponNumber] = useState('');
  const [selectedStoreId, setSelectedStoreId] = useState('main-warehouse');
  const getAvailableStock = (productId: string) => selectedStoreId === 'main-warehouse'
    ? products.find(product => product.id === productId)?.stock || 0
    : storeStock.find(stock => stock.storeId === selectedStoreId && stock.productId === productId)?.quantity || 0;
  const getRemainingStock = (productId: string) => {
    const cartQuantity = cartItems.find(item => item.productId === productId)?.quantity || 0;
    return Math.max(0, getAvailableStock(productId) - cartQuantity);
  };
  const [notes, setNotes] = useState('');
  
  // Cash Tendered & Change
  const [cashTendered, setCashTendered] = useState<number>(0);

  const getRequiredCustomerDocumentType = (type: VoucherType = voucherType): 'RUC' | 'DNI' =>
    type === 'FACTURA' ? 'RUC' : 'DNI';

  const getCustomerDocumentType = (customer: Customer): 'RUC' | 'DNI' | 'NIT' => {
    if (customer.documentType) return customer.documentType;
    const digits = customer.taxId.replace(/\D/g, '');
    if (digits.length === 8) return 'DNI';
    if (digits.length === 11 || digits.length === 12) return 'RUC';
    return 'NIT';
  };

  const isValidDocumentLength = (documentType: 'RUC' | 'DNI' | 'NIT', length: number) =>
    documentType === 'RUC' ? length === 11 || length === 12 : length === (documentType === 'DNI' ? 8 : 9);

  const handleSelectCustomer = (custId: string) => {
    setSelectedCustomerId(custId);
    if (custId === 'general') {
      setCustomerName('CLIENTES VARIOS / PÚBLICO GENERAL');
      setCustomerTaxId('99999999');
      setCustomerEmail('');
      setCustomerSearchMessage('');
      return;
    }
    const found = customers.find(c => c.id === custId);
    if (found && getCustomerDocumentType(found) === getRequiredCustomerDocumentType()) {
      setCustomerName(found.name);
      setCustomerTaxId(found.taxId);
      setCustomerEmail(found.email);
      setCustomerSearchMessage(`Cliente encontrado: ${found.name}`);
    } else {
      setSelectedCustomerId('');
      setCustomerName('');
      setCustomerEmail('');
    }
  };

  const handleFindCustomer = () => {
    const documentType = getRequiredCustomerDocumentType();
    const digits = customerTaxId.replace(/\D/g, '');
    if (!isValidDocumentLength(documentType, digits.length)) {
      setSelectedCustomerId('');
      setCustomerName('');
      setCustomerEmail('');
      setCustomerSearchMessage(documentType === 'RUC'
        ? 'Ingrese un RUC válido de 11 o 12 dígitos.'
        : 'Ingrese un DNI válido de 8 dígitos.');
      return;
    }

    const found = customers.find(customer =>
      customer.taxId.replace(/\D/g, '') === digits && getCustomerDocumentType(customer) === documentType
    );
    if (found) {
      setSelectedCustomerId(found.id);
      setCustomerTaxId(found.taxId);
      setCustomerName(found.name);
      setCustomerEmail(found.email);
      setCustomerSearchMessage(`Cliente encontrado: ${found.name}`);
      return;
    }
    setSelectedCustomerId('');
    setCustomerName('');
    setCustomerEmail('');
    setCustomerTaxId(digits);
    setCustomerSearchMessage(`Cliente no registrado con este ${documentType}.`);
    setCustomerRegistrationError('');
  };

  const handleSelectNoDni = () => {
    if (voucherType !== 'BOLETA') return;
    handleSelectCustomer('general');
  };

  const handleVoucherTypeChange = (type: VoucherType) => {
    setVoucherType(type);
    setSelectedCustomerId('');
    setCustomerName('');
    setCustomerTaxId('');
    setCustomerEmail('');
    setCustomerSearchMessage('');
  };

  const handleRegisterCustomer = async (event: React.FormEvent) => {
    event.preventDefault();
    const documentType = getRequiredCustomerDocumentType();
    const digits = newCustomerForm.taxId.replace(/\D/g, '');
    const requiredLength = { RUC: 11, NIT: 9, DNI: 8 }[newCustomerForm.documentType];
    if (!newCustomerForm.name.trim()) {
      setCustomerRegistrationError('Ingrese el nombre o razón social del cliente.');
      return;
    }
    if (newCustomerForm.documentType !== documentType) {
      setCustomerRegistrationError(`Para esta venta seleccione el tipo de documento ${documentType}.`);
      return;
    }
    if (!isValidDocumentLength(newCustomerForm.documentType, digits.length)) {
      setCustomerRegistrationError(newCustomerForm.documentType === 'RUC'
        ? 'RUC debe contener 11 o 12 dígitos.'
        : `${newCustomerForm.documentType} debe contener exactamente ${requiredLength} dígitos.`);
      return;
    }

    try {
      const customer = await onRegisterCustomer({
        ...newCustomerForm,
        name: newCustomerForm.name.trim(),
        documentType: newCustomerForm.documentType,
        taxId: digits,
        email: newCustomerForm.email.trim(),
        phone: newCustomerForm.phone.trim(),
        address: newCustomerForm.address.trim(),
      });
      setSelectedCustomerId(customer.id);
      setCustomerName(customer.name);
      setCustomerTaxId(customer.taxId);
      setCustomerEmail(customer.email || '');
      setCustomerSearchMessage(`Cliente registrado: ${customer.name}`);
      setIsRegisteringCustomer(false);
    } catch (error) {
      setCustomerRegistrationError(error instanceof Error ? error.message : 'No se pudo registrar el cliente.');
    }
  };

  // Add Product to POS Cart
  const handleAddToCart = (product: Product) => {
    if (getAvailableStock(product.id) <= 0) {
      alert(`El producto "${product.name}" está agotado en inventario.`);
      return;
    }

    const existingIndex = cartItems.findIndex(item => item.productId === product.id);
    if (existingIndex > -1) {
      const currentQty = cartItems[existingIndex].quantity;
      if (currentQty + 1 > getAvailableStock(product.id)) {
        alert(`No puedes agregar más unidades. Stock disponible: ${getAvailableStock(product.id)}`);
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

    if (newQty > getAvailableStock(product.id)) {
      alert(`Stock insuficiente. Máximo disponible: ${getAvailableStock(product.id)} ${product.unit}`);
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
    const requiredDocumentType = getRequiredCustomerDocumentType();
    const isPublicGeneralBoleta = voucherType === 'BOLETA' && selectedCustomerId === 'general';
    const hasValidRegisteredCustomer = customers.some(customer =>
      customer.id === selectedCustomerId &&
      getCustomerDocumentType(customer) === requiredDocumentType &&
      isValidDocumentLength(requiredDocumentType, customer.taxId.replace(/\D/g, '').length)
    );
    if (!isPublicGeneralBoleta && !hasValidRegisteredCustomer) {
      alert(`Busca y selecciona un cliente registrado con ${requiredDocumentType} para emitir esta ${voucherType.toLowerCase()}.`);
      return;
    }
    if (paymentMethod === 'CARD' && !selectedCardBrand) {
      alert('Selecciona la marca de la tarjeta.');
      return;
    }
    if (paymentMethod === 'CREDIT' && !giftCouponNumber.trim()) {
      setIsGiftCouponModalOpen(true);
      return;
    }

    await onCreateSale({
      voucherType,
      customerId: selectedCustomerId || 'cust-general',
      customerName,
      customerTaxId,
      customerEmail,
      date: new Date().toISOString().split('T')[0],
      storeId: selectedStoreId,
      items: cartItems,
      subtotal: cartSubtotal,
      discountTotal: cartDiscount,
      taxTotal: cartTax,
      total: cartGrandTotal,
      currency,
      paymentMethod,
      paymentStatus: 'PAID',
      paidAmount: cartGrandTotal,
      dueAmount: 0,
      notes: [
        notes,
        paymentMethod === 'CARD' ? `Tarjeta: ${selectedCardBrand}` : '',
        paymentMethod === 'CREDIT' ? `Giftcard/Cupón: ${giftCouponNumber.trim()}` : ''
      ].filter(Boolean).join(' | '),
      sellerName,
      status: 'COMPLETED'
    });

    handleClearCart();
    setSubTab('history');
  };

  const handlePaymentMethodChange = (method: PaymentMethod) => {
    setPaymentMethod(method);
    if (method === 'CREDIT') {
      setGiftCouponNumber('');
      setIsGiftCouponModalOpen(true);
    } else {
      setIsGiftCouponModalOpen(false);
    }
    if (method !== 'CARD') setSelectedCardBrand('');
  };

  const closeGiftCouponModal = () => {
    setIsGiftCouponModalOpen(false);
    if (!giftCouponNumber.trim()) setPaymentMethod('CASH');
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
    const belongsToLocation = selectedStoreId === 'main-warehouse'
      ? true
      : storeStock.some(stock => stock.storeId === selectedStoreId && stock.productId === p.id);
    return matchesCategory && matchesSearch && belongsToLocation;
  });

  return (
    <div className="space-y-6 pb-12">
      
      {/* Top Header & Tab Toggle */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414] p-5 rounded-md border border-[#2D2D2D]">
        <div>
          <label className="block text-[11px] font-semibold text-[#c8c6c6] mb-1">Ubicación de venta</label>
          <select
            id="select-pos-store"
            value={selectedStoreId}
            onChange={e => {
              setSelectedStoreId(e.target.value);
              setCartItems([]);
              setSelectedCustomerId('');
              setCustomerName('');
              setCustomerTaxId('');
              setCustomerEmail('');
              setCustomerSearchMessage('');
              setCustomerRegistrationError('');
              setPaymentMethod('CASH');
              setCashTendered(0);
              setSelectedCardBrand('');
              setGiftCouponNumber('');
              setIsGiftCouponModalOpen(false);
              setNotes('');
            }}
            className="w-full px-2.5 py-1.5 bg-[#141414] border border-[#2D2D2D] text-white rounded-md text-xs focus:outline-none focus:border-[#C8102E]"
          >
            {stores.filter(store => store.status === 'ACTIVE').map(store => (
              <option key={store.id} value={store.id}>{store.name}</option>
            ))}
          </select>
          <p className="text-[10px] text-[#71717A] mt-1">El stock se descuenta de la ubicación seleccionada.</p>
        </div>

        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Control de Ventas & Punto de Venta (POS)</h2>
          </div>
        </div>

        <div className="flex bg-[#0E0E0E] p-1 rounded-md border border-[#2D2D2D] self-start md:self-auto">
          <button
            id="tab-pos-terminal"
            onClick={() => setSubTab('pos')}
            className={`px-4 py-2 text-xs font-bold rounded transition-all flex items-center space-x-1.5 ${
              subTab === 'pos'
                ? 'bg-[#C8102E] text-white shadow-sm'
                : 'text-[#c8c6c6] hover:text-white'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Terminal POS / Caja</span>
          </button>
          <button
            id="tab-sales-history"
            onClick={() => setSubTab('history')}
            className={`px-4 py-2 text-xs font-bold rounded transition-all flex items-center space-x-1.5 ${
              subTab === 'history'
                ? 'bg-[#C8102E] text-white shadow-sm'
                : 'text-[#c8c6c6] hover:text-white'
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
            <div className="bg-[#141414] p-4 rounded-md border border-[#2D2D2D] space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="input-pos-search"
                  type="text"
                  value={posSearch}
                  onChange={e => setPosSearch(e.target.value)}
                  placeholder="Buscar producto por nombre, SKU o código de barras para venta rápida..."
                  className="w-full pl-9 pr-4 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded-md text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#C8102E]"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => setPosCategory('ALL')}
                  className={`px-3 py-1 text-xs font-semibold rounded shrink-0 transition-colors ${
                    posCategory === 'ALL'
                      ? 'bg-[#C8102E] text-white shadow-xs'
                      : 'bg-[#1E1E1E] text-[#c8c6c6] hover:bg-[#2D2D2D] hover:text-white border border-[#2D2D2D]'
                  }`}
                >
                  Todos
                </button>
                {categories.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setPosCategory(c.name)}
                    className={`px-3 py-1 text-xs font-semibold rounded shrink-0 transition-colors ${
                      posCategory === c.name
                        ? 'bg-[#C8102E] text-white shadow-xs'
                        : 'bg-[#1E1E1E] text-[#c8c6c6] hover:bg-[#2D2D2D] hover:text-white border border-[#2D2D2D]'
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
                const remainingStock = getRemainingStock(product.id);
                const isOutOfStock = remainingStock <= 0;
                return (
                  <button
                    key={product.id}
                    id={`btn-pos-add-${product.id}`}
                    disabled={isOutOfStock}
                    onClick={() => handleAddToCart(product)}
                    className={`p-3 rounded-md border text-left flex flex-col justify-between transition-all group ${
                      isOutOfStock
                        ? 'bg-[#141414]/50 border-[#2D2D2D] opacity-50 cursor-not-allowed'
                        : 'bg-[#141414] border-[#2D2D2D] hover:border-[#C8102E] active:scale-98'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono text-[#71717A] truncate max-w-[100px]">{product.sku}</span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono tabular-nums ${
                          isOutOfStock ? 'bg-[#C8102E]/15 text-[#ffb3b1] border border-[#C8102E]/40' :
                          remainingStock <= product.minStock ? 'bg-amber-950/40 text-amber-400 border border-amber-800/40' : 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                        }`}>
                          {isOutOfStock ? 'AGOTADO' : `${remainingStock} ${product.unit}`}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white line-clamp-2 group-hover:text-[#ffb3b1] transition-colors">
                        {product.name}
                      </h4>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#1E1E1E] flex items-center justify-between">
                      <span className={`text-sm font-bold font-mono tabular-nums ${isOutOfStock ? 'text-[#71717A]' : 'text-white'}`}>
                        {currency} {formatAmount(product.sellingPrice)}
                      </span>
                      {isOutOfStock ? (
                        <span className="w-6 h-6 rounded border border-[#303030] text-[#4F4F4F] flex items-center justify-center text-xs">+</span>
                      ) : (
                        <span className="w-6 h-6 rounded bg-[#1E1E1E] text-[#ffb3b1] border border-[#2D2D2D] font-bold flex items-center justify-center text-xs group-hover:bg-[#C8102E] group-hover:text-white group-hover:border-[#C8102E] transition-colors">
                          +
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

          </div>

          {/* Right Column: Active Cart & Checkout (5 cols on lg) */}
          <div className="lg:col-span-5 bg-[#141414] rounded-md border border-[#2D2D2D] p-5 space-y-4">
            
            {/* Cart Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#2D2D2D]">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5 text-[#C8102E]" />
                <h3 className="text-sm font-bold text-white">Carrito de Venta Actual</h3>
              </div>
              {cartItems.length > 0 && (
                <button
                  onClick={handleClearCart}
                  className="text-xs text-[#ffb3b1] hover:text-white font-semibold transition-colors"
                >
                  Vaciar
                </button>
              )}
            </div>

            {/* Voucher & Customer Selector */}
            <div className="space-y-3 p-3 bg-[#0E0E0E] border border-[#2D2D2D] rounded-md text-xs">
              
              <div className="grid grid-cols-2 gap-2">
                {(['FACTURA', 'BOLETA'] as VoucherType[]).map(type => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleVoucherTypeChange(type)}
                    className={`py-1.5 text-center font-bold rounded transition-colors ${
                      voucherType === type
                        ? 'bg-[#C8102E] text-white shadow-xs'
                        : 'bg-[#1E1E1E] border border-[#2D2D2D] text-[#c8c6c6] hover:bg-[#2D2D2D] hover:text-white'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#c8c6c6] mb-1">Cliente / Receptor</label>
                <div className="flex gap-2">
                  <div className="relative min-w-0 flex-1">
                    <input
                      id="input-pos-customer-document"
                      type="text"
                      inputMode="numeric"
                      value={customerTaxId}
                      onChange={event => {
                        setCustomerTaxId(event.target.value.replace(/\D/g, '').slice(0, voucherType === 'FACTURA' ? 12 : 8));
                        setSelectedCustomerId('');
                        setCustomerName('');
                        setCustomerEmail('');
                        setCustomerSearchMessage('');
                      }}
                      onKeyDown={event => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handleFindCustomer();
                        }
                      }}
                      placeholder={`Ingrese ${getRequiredCustomerDocumentType()}`}
                      aria-label={`Número de ${getRequiredCustomerDocumentType()}`}
                      className="w-full min-w-0 rounded-md border border-[#2D2D2D] bg-[#141414] py-1.5 pl-2.5 pr-9 font-mono text-xs text-white focus:border-[#C8102E] focus:outline-none"
                    />
                    {customerTaxId && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerTaxId('');
                          setSelectedCustomerId('');
                          setCustomerName('');
                          setCustomerEmail('');
                          setCustomerSearchMessage('');
                          setCustomerRegistrationError('');
                        }}
                        aria-label="Limpiar búsqueda de cliente"
                        title="Limpiar"
                        className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-[#9CA3AF] hover:bg-[#2D2D2D] hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={handleFindCustomer}
                    aria-label={`Buscar cliente por ${getRequiredCustomerDocumentType()}`}
                    title="Buscar cliente"
                    className="flex items-center justify-center rounded-md border border-[#3D3D3D] bg-[#1E1E1E] px-3 text-white hover:border-[#C8102E] hover:bg-[#2D2D2D]"
                  >
                    <Search className="h-4 w-4" />
                  </button>
                </div>
                {customerSearchMessage && (
                  <div className={`mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] ${selectedCustomerId ? 'text-emerald-400' : 'text-amber-300'}`} role="status">
                    <span>{customerSearchMessage}</span>
                    {customerSearchMessage.startsWith('Cliente no registrado') && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomerRegistrationError('');
                          setNewCustomerForm({
                            name: '',
                            documentType: getRequiredCustomerDocumentType(),
                            taxId: customerTaxId,
                            email: '',
                            phone: '',
                            address: '',
                            status: 'Activo'
                          });
                          setIsRegisteringCustomer(true);
                        }}
                        className="inline-flex items-center gap-1 rounded border border-[#3D3D3D] px-2 py-1 font-bold text-white hover:border-[#C8102E]"
                      >
                        <UserPlus className="h-3 w-3" />Registrar cliente
                      </button>
                    )}
                  </div>
                )}
                {selectedCustomerId && (
                  <div className="mt-2 grid grid-cols-2 gap-2 rounded border border-[#2D2D2D] bg-[#141414] p-2 text-[11px]">
                    <div className="min-w-0">
                      <span className="block text-[#9CA3AF]">Cliente / Receptor</span>
                      <strong className="block truncate text-white">{customerName}</strong>
                    </div>
                    <div>
                      <span className="block text-[#9CA3AF]">{selectedCustomerId === 'general' ? 'Documento' : getRequiredCustomerDocumentType()}</span>
                      <strong className="block font-mono text-white">{customerTaxId}</strong>
                    </div>
                  </div>
                )}
                {voucherType === 'BOLETA' && (
                  <button
                    type="button"
                    onClick={handleSelectNoDni}
                    className="mt-2 rounded border border-[#3D3D3D] px-2.5 py-1.5 text-[10px] font-bold text-[#D1D5DB] hover:border-[#C8102E] hover:text-white"
                  >
                    Sin DNI
                  </button>
                )}
              </div>

            </div>

            {/* Cart Items List */}
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {cartItems.length === 0 ? (
                <div className="py-12 text-center text-[#71717A] text-xs">
                  <ShoppingCart className="w-8 h-8 text-[#2D2D2D] mx-auto mb-2" />
                  <p>El carrito está vacío.</p>
                  <p className="text-[11px]">Haz clic en los productos para agregarlos.</p>
                </div>
              ) : (
                cartItems.map((item, idx) => (
                  <div key={item.id} className="p-2.5 bg-[#0E0E0E] border border-[#2D2D2D] rounded-md flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white truncate">{item.name}</p>
                      <p className="text-[10px] text-[#A1A1AA] font-mono tabular-nums">
                        {currency}{formatAmount(item.unitPrice)} x {item.quantity} = <strong>{currency}{formatAmount(item.total)}</strong>
                      </p>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={() => handleUpdateCartQty(idx, item.quantity - 1)}
                        className="w-6 h-6 bg-[#1E1E1E] border border-[#2D2D2D] rounded font-bold flex items-center justify-center text-white hover:bg-[#2D2D2D] hover:border-[#C8102E] transition-colors"
                      >
                        -
                      </button>
                      <span className="w-7 text-center font-mono font-bold text-white tabular-nums">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateCartQty(idx, item.quantity + 1)}
                        className="w-6 h-6 bg-[#1E1E1E] border border-[#2D2D2D] rounded font-bold flex items-center justify-center text-white hover:bg-[#2D2D2D] hover:border-[#C8102E] transition-colors"
                      >
                        +
                      </button>
                      <button
                        onClick={() => handleRemoveCartItem(idx)}
                        className="p-1 text-[#71717A] hover:text-[#C8102E] ml-1 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2 pt-2 border-t border-[#2D2D2D]">
              <label className="block text-[11px] font-semibold text-[#c8c6c6]">Método de Pago</label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'CASH', label: 'Efectivo', icon: DollarSign },
                  { id: 'CARD', label: 'Tarjeta', icon: CreditCard },
                  { id: 'CREDIT', label: 'Giftcard / Cupón', icon: Tag }
                ].map(method => {
                  const Icon = method.icon;
                  const isSelected = paymentMethod === method.id;
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => handlePaymentMethodChange(method.id as PaymentMethod)}
                      className={`p-2 rounded-md text-center flex flex-col items-center justify-center gap-1 transition-all ${
                        isSelected
                          ? 'bg-[#C8102E]/15 border border-[#C8102E] text-[#ffb3b1] font-bold'
                          : 'bg-[#0E0E0E] border border-[#2D2D2D] text-[#c8c6c6] hover:bg-[#1E1E1E] hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="text-[10px]">{method.label}</span>
                    </button>
                  );
                })}
              </div>
              {paymentMethod === 'CARD' && (
                <div className="grid grid-cols-3 gap-1.5" aria-label="Marca de tarjeta">
                  {(['VISA', 'MASTERCARD', 'AMEX'] as const).map(brand => (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => setSelectedCardBrand(brand)}
                      aria-pressed={selectedCardBrand === brand}
                      className={`rounded border px-2 py-2 text-[10px] font-bold transition-colors ${
                        selectedCardBrand === brand
                          ? 'border-[#C8102E] bg-[#C8102E]/15 text-[#ffb3b1]'
                          : 'border-[#2D2D2D] bg-[#0E0E0E] text-[#c8c6c6] hover:border-[#71717A] hover:text-white'
                      }`}
                    >
                      {brand}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Cash Tendered & Change Calculator (if CASH) */}
            {paymentMethod === 'CASH' && (
              <div className="p-3 bg-[#0E0E0E] border border-[#2D2D2D] rounded-md space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#c8c6c6]">Monto Recibido ({currency}):</span>
                  <input
                    id="input-cash-tendered"
                    type="number"
                    min="0"
                    step="0.01"
                    inputMode="decimal"
                    value={cashTendered || ''}
                    onChange={e => setCashTendered(parseFloat(e.target.value) || 0)}
                    placeholder={formatAmount(cartGrandTotal)}
                    className="w-24 px-2 py-1 bg-[#141414] border border-[#2D2D2D] rounded text-right font-mono font-bold text-xs text-white focus:outline-none focus:border-[#C8102E]"
                  />
                </div>
                {cashTendered >= cartGrandTotal && (
                  <div className="flex items-center justify-between text-[#10B981] font-bold">
                    <span>Vuelto / Cambio:</span>
                    <span className="font-mono tabular-nums text-sm">{currency} {formatAmount(changeDue)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Totals Summary */}
            <div className="p-3.5 bg-[#0E0E0E] text-white rounded-md border border-[#2D2D2D] space-y-2 text-xs">
              <div className="flex justify-between text-[#A1A1AA]">
                <span>Subtotal:</span>
                <span className="font-mono tabular-nums">{currency} {formatAmount(cartSubtotal)}</span>
              </div>
              <div className="flex justify-between text-[#A1A1AA]">
                <span>Impuesto ({taxRateDefault}%):</span>
                <span className="font-mono tabular-nums">{currency} {formatAmount(cartTax)}</span>
              </div>
              <div className="pt-2 border-t border-[#2D2D2D] flex justify-between text-base font-bold">
                <span>TOTAL A PAGAR:</span>
                <span className="font-mono tabular-nums text-[#ffb3b1]">{currency} {formatAmount(cartGrandTotal)}</span>
              </div>
            </div>

            {/* Complete Sale Button */}
            <button
              id="btn-complete-pos-sale"
              onClick={handleCompleteSale}
              disabled={cartItems.length === 0 || isLoading}
              className="w-full py-3 bg-[#C8102E] hover:bg-[#A80C25] disabled:opacity-50 text-white rounded-md font-bold text-sm shadow-md transition-all flex items-center justify-center space-x-2"
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
          <div className="bg-[#141414] p-4 rounded-md border border-[#2D2D2D] flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="input-sales-search"
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por número de factura/boleta, cliente, RUC..."
                className="w-full pl-9 pr-4 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded-md text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#C8102E]"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                id="select-sales-voucher"
                value={voucherFilter}
                onChange={e => setVoucherFilter(e.target.value)}
                className="px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded-md text-xs font-medium text-white focus:outline-none focus:border-[#C8102E]"
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
                className="px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded-md text-xs font-medium text-white focus:outline-none focus:border-[#C8102E]"
              >
                <option value="ALL">Todos los Estados</option>
                <option value="COMPLETED">Completadas / Válidas</option>
                <option value="CANCELLED">Anuladas (Revertidas)</option>
              </select>
            </div>
          </div>

          {/* Sales History Table */}
          <div className="bg-[#141414] rounded-md border border-[#2D2D2D] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#c8c6c6]">
                <thead className="bg-[#1E1E1E] border-b border-[#2D2D2D] text-[#c8c6c6] font-mono uppercase tracking-wider text-[10px]">
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
                <tbody className="divide-y divide-[#2D2D2D]">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#71717A]">
                        No hay ventas registradas que coincidan con los filtros.
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map(sale => {
                      const isCancelled = sale.status === 'CANCELLED';
                      return (
                        <tr key={sale.id} className={`hover:bg-[#1E1E1E]/50 transition-colors ${isCancelled ? 'bg-[#C8102E]/5' : ''}`}>
                          
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              <Receipt className={`w-4 h-4 ${isCancelled ? 'text-[#C8102E]' : 'text-[#10B981]'}`} />
                              <span className="font-mono font-bold text-white">{sale.saleNumber}</span>
                            </div>
                            <span className="text-[10px] text-[#71717A] block font-mono font-semibold">{sale.voucherType}</span>
                          </td>

                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-white leading-snug">{sale.customerName}</p>
                            <p className="text-[11px] text-[#71717A] font-mono">{sale.customerTaxId || '-'}</p>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap font-mono text-[11px] text-[#A1A1AA]">
                            {sale.date}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span className="px-2 py-0.5 bg-[#1E1E1E] border border-[#2D2D2D] text-[#c8c6c6] rounded font-mono text-[11px]">
                              {sale.paymentMethod}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap font-mono tabular-nums font-bold text-white text-sm">
                            {sale.currency} {formatAmount(sale.total)}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {isCancelled ? (
                              <span className="px-2.5 py-0.5 bg-[#C8102E]/15 border border-[#C8102E]/40 text-[#ffb3b1] rounded font-mono font-bold text-[10px]">
                                Anulado
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 rounded font-mono font-bold text-[10px]">
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
                                className="p-1.5 hover:bg-[#1E1E1E] text-[#A1A1AA] hover:text-white rounded border border-transparent hover:border-[#2D2D2D] transition-colors"
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
                                className="p-1.5 hover:bg-[#1E1E1E] text-[#A1A1AA] hover:text-[#10B981] rounded border border-transparent hover:border-[#2D2D2D] transition-colors"
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
                                  className="p-1.5 hover:bg-[#C8102E]/15 text-[#71717A] hover:text-[#C8102E] rounded border border-transparent hover:border-[#C8102E]/40 transition-colors"
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
        <div id="modal-sale-details" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#141414] rounded-md shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-[#2D2D2D]">
            
            <div className="px-6 py-4 bg-[#0E0E0E] text-white flex items-center justify-between border-b border-[#2D2D2D]">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-[#C8102E]" />
                <div>
                  <h3 className="text-base font-bold text-white">{selectedSale.voucherType} N° {selectedSale.saleNumber}</h3>
                  <p className="text-xs text-[#A1A1AA]">{selectedSale.customerName}</p>
                </div>
              </div>
              <button 
                id="btn-close-sale-details"
                onClick={() => setIsDetailModalOpen(false)}
                className="text-[#71717A] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              
              {selectedSale.status === 'CANCELLED' && (
                <div className="p-3 bg-[#C8102E]/10 border border-[#C8102E]/40 rounded-md text-xs text-[#ffb3b1] flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-[#C8102E] shrink-0" />
                  <div>
                    <strong>COMPROBANTE ANULADO:</strong> Motivo: {selectedSale.cancellationReason || 'No especificado'}. Las existencias fueron reincorporadas al inventario.
                  </div>
                </div>
              )}

              <div className="border border-[#2D2D2D] rounded-md overflow-hidden">
                <table className="w-full text-left text-xs text-[#c8c6c6]">
                  <thead className="bg-[#1E1E1E] text-[#c8c6c6] font-mono uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">SKU</th>
                      <th className="py-2.5 px-3">Producto</th>
                      <th className="py-2.5 px-3 text-center">Cant.</th>
                      <th className="py-2.5 px-3 text-right">P. Unit</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2D2D]">
                    {selectedSale.items.map(item => (
                      <tr key={item.id}>
                        <td className="py-2 px-3 font-mono text-[11px] text-[#A1A1AA]">{item.sku}</td>
                        <td className="py-2 px-3 font-medium text-white">{item.name}</td>
                        <td className="py-2 px-3 text-center font-mono tabular-nums">{item.quantity}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums">{selectedSale.currency} {formatAmount(item.unitPrice)}</td>
                        <td className="py-2 px-3 text-right font-mono tabular-nums font-bold text-white">{selectedSale.currency} {formatAmount(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end">
                <div className="w-60 p-3 bg-[#0E0E0E] border border-[#2D2D2D] rounded-md text-xs space-y-1.5">
                  <div className="flex justify-between text-[#A1A1AA]">
                    <span>Subtotal:</span>
                    <span className="font-mono tabular-nums">{selectedSale.currency} {formatAmount(selectedSale.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#A1A1AA]">
                    <span>Impuestos:</span>
                    <span className="font-mono tabular-nums">{selectedSale.currency} {formatAmount(selectedSale.taxTotal)}</span>
                  </div>
                  <div className="pt-1.5 border-t border-[#2D2D2D] flex justify-between font-bold text-sm text-white">
                    <span>Total Pagado:</span>
                    <span className="font-mono tabular-nums text-[#ffb3b1]">{selectedSale.currency} {formatAmount(selectedSale.total)}</span>
                  </div>
                </div>
              </div>

            </div>

            <div className="bg-[#0E0E0E] px-6 py-4 border-t border-[#2D2D2D] flex items-center justify-between">
              <button
                onClick={() => {
                  if (settings) generateSaleInvoicePDF(selectedSale, settings);
                }}
                className="px-4 py-2 bg-[#C8102E] hover:bg-[#A80C25] text-white rounded-md text-xs font-bold transition-colors flex items-center space-x-1.5"
              >
                <Download className="w-4 h-4" />
                <span>Descargar PDF</span>
              </button>

              <button
                onClick={() => setIsDetailModalOpen(false)}
                className="px-4 py-2 bg-[#1E1E1E] hover:bg-[#2D2D2D] text-white border border-[#2D2D2D] rounded-md text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Modal: Cancel Sale */}
      {isCancelModalOpen && selectedSale && (
        <div id="modal-cancel-sale" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#141414] rounded-md shadow-2xl max-w-md w-full overflow-hidden border border-[#2D2D2D]">
            <div className="px-6 py-4 bg-[#8A091E] text-white flex items-center justify-between border-b border-[#2D2D2D]">
              <div className="flex items-center space-x-2">
                <Ban className="w-5 h-5 text-white" />
                <h3 className="text-base font-bold">Anulación de Venta & Reversión</h3>
              </div>
              <button onClick={() => setIsCancelModalOpen(false)} className="text-[#ffb3b1] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-[#c8c6c6]">
                ¿Estás seguro de anular el comprobante <strong className="text-white font-mono">{selectedSale.saleNumber}</strong> por el monto de <strong className="text-white font-mono">{selectedSale.currency} {formatAmount(selectedSale.total)}</strong>?
              </p>
              <div className="p-3 bg-amber-950/40 border border-amber-800/40 rounded-md text-amber-300">
                <strong>Efecto en inventario:</strong> Las unidades vendidas ({selectedSale.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}) volverán a sumarse al stock de almacén y se registrará un ajuste positivo en el Kardex.
              </div>

              <div>
                <label className="block font-semibold text-[#c8c6c6] mb-1">Motivo de Anulación *</label>
                <textarea
                  id="textarea-cancel-reason"
                  required
                  rows={2}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="e.g. Error en datos de facturación a solicitud del cliente o devolución de mercadería"
                  className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded-md text-white text-xs focus:outline-none focus:border-[#C8102E]"
                />
              </div>

              <div className="pt-3 border-t border-[#2D2D2D] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="px-4 py-2 bg-[#1E1E1E] hover:bg-[#2D2D2D] text-white border border-[#2D2D2D] font-semibold rounded-md"
                >
                  Cancelar
                </button>
                <button
                  id="btn-confirm-cancel-sale"
                  type="button"
                  disabled={!cancelReason.trim()}
                  onClick={handleConfirmCancel}
                  className="px-5 py-2 bg-[#C8102E] hover:bg-[#A80C25] disabled:opacity-50 text-white font-bold rounded-md shadow-sm"
                >
                  Confirmar Anulación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isRegisteringCustomer && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4">
          <form onSubmit={handleRegisterCustomer} className="max-h-[95vh] w-full max-w-lg overflow-y-auto rounded-md border border-[#2D2D2D] bg-[#141414] shadow-2xl">
            <header className="flex items-center justify-between border-b border-[#2D2D2D] bg-[#0E0E0E] px-5 py-4">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-[#C8102E]" />
                <h3 className="text-base font-bold text-white">Registrar Nuevo Cliente</h3>
              </div>
              <button type="button" onClick={() => setIsRegisteringCustomer(false)} aria-label="Cerrar registro de cliente" className="text-[#9CA3AF] hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </header>
            <div className="space-y-3 p-5">
              <label className="block text-xs font-semibold text-[#D1D5DB]">
                Nombre / Razón Social *
                <input
                  required
                  value={newCustomerForm.name}
                  onChange={event => setNewCustomerForm({ ...newCustomerForm, name: event.target.value })}
                  className="mt-1 w-full rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 text-sm text-white focus:border-[#C8102E] focus:outline-none"
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-[#D1D5DB]">Tipo de documento *</label>
                  <div className="mb-2 grid grid-cols-3 gap-2">
                    {(['RUC', 'NIT', 'DNI'] as const).map(type => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewCustomerForm({ ...newCustomerForm, documentType: type, taxId: type === getRequiredCustomerDocumentType() ? customerTaxId : '' })}
                        className={`rounded border px-3 py-2 text-xs font-bold transition-colors ${newCustomerForm.documentType === type ? 'border-[#C8102E] bg-[#C8102E] text-white' : 'border-[#2D2D2D] bg-[#1E1E1E] text-[#D1D5DB] hover:text-white'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                  <input
                    required
                    inputMode="numeric"
                    value={newCustomerForm.taxId}
                    onChange={event => {
                      const maxLength = { RUC: 12, NIT: 9, DNI: 8 }[newCustomerForm.documentType];
                      setNewCustomerForm({ ...newCustomerForm, taxId: event.target.value.replace(/\D/g, '').slice(0, maxLength) });
                    }}
                    maxLength={{ RUC: 12, NIT: 9, DNI: 8 }[newCustomerForm.documentType]}
                    placeholder={newCustomerForm.documentType === 'RUC' ? 'RUC: 11 o 12 dígitos' : `${newCustomerForm.documentType}: ${{ RUC: 11, NIT: 9, DNI: 8 }[newCustomerForm.documentType]} dígitos`}
                    className="w-full rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 font-mono text-sm text-white focus:border-[#C8102E] focus:outline-none"
                  />
                </div>
                <label className="block text-xs font-semibold text-[#D1D5DB]">
                  Teléfono
                  <input
                    value={newCustomerForm.phone}
                    onChange={event => setNewCustomerForm({ ...newCustomerForm, phone: event.target.value })}
                    className="mt-1 w-full rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 text-sm text-white focus:border-[#C8102E] focus:outline-none"
                  />
                </label>
              </div>
              <label className="block text-xs font-semibold text-[#D1D5DB]">
                Correo Electrónico *
                <input
                  type="email"
                  required
                  value={newCustomerForm.email}
                  onChange={event => setNewCustomerForm({ ...newCustomerForm, email: event.target.value })}
                  className="mt-1 w-full rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 text-sm text-white focus:border-[#C8102E] focus:outline-none"
                />
              </label>
              <label className="block text-xs font-semibold text-[#D1D5DB]">
                Dirección Fiscal
                <input
                  value={newCustomerForm.address}
                  onChange={event => setNewCustomerForm({ ...newCustomerForm, address: event.target.value })}
                  className="mt-1 w-full rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 text-sm text-white focus:border-[#C8102E] focus:outline-none"
                />
              </label>
              <div>
                <label className="block text-xs font-semibold text-[#D1D5DB]">
                  Estado
                  <select
                    value={newCustomerForm.status}
                    onChange={event => setNewCustomerForm({ ...newCustomerForm, status: event.target.value })}
                    className="mt-1 w-full rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 text-sm text-white focus:border-[#C8102E] focus:outline-none"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </label>
              </div>
              {customerRegistrationError && <p role="alert" className="text-xs text-red-400">{customerRegistrationError}</p>}
            </div>
            <footer className="flex justify-end gap-2 border-t border-[#2D2D2D] px-5 py-4">
              <button type="button" onClick={() => setIsRegisteringCustomer(false)} className="rounded border border-[#404040] px-4 py-2 text-xs font-semibold text-white hover:bg-[#252525]">Cancelar</button>
              <button type="submit" className="rounded bg-[#C8102E] px-4 py-2 text-xs font-bold text-white hover:bg-[#A80C25]">Guardar Cliente</button>
            </footer>
          </form>
        </div>
      )}

      {isGiftCouponModalOpen && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/80 p-4">
          <form
            onSubmit={event => {
              event.preventDefault();
              if (!giftCouponNumber.trim()) return;
              setIsGiftCouponModalOpen(false);
            }}
            className="w-full max-w-sm overflow-hidden rounded-md border border-[#2D2D2D] bg-[#141414] shadow-2xl"
          >
            <header className="border-b border-[#2D2D2D] bg-[#0E0E0E] px-5 py-4">
              <h3 className="text-sm font-bold text-white">Giftcard / Cupón</h3>
              <p className="mt-1 text-[11px] text-[#9CA3AF]">Ingrese el número de la Giftcard o del Cupón.</p>
            </header>
            <div className="p-5">
              <input
                autoFocus
                required
                value={giftCouponNumber}
                onChange={event => setGiftCouponNumber(event.target.value)}
                aria-label="Número de Giftcard o Cupón"
                placeholder="Nro. Giftcard o Cupón"
                className="w-full rounded border border-[#303030] bg-[#0E0E0E] px-3 py-2 text-sm text-white focus:border-[#C8102E] focus:outline-none"
              />
            </div>
            <footer className="flex justify-end gap-2 border-t border-[#2D2D2D] px-5 py-4">
              <button type="button" onClick={closeGiftCouponModal} className="rounded border border-[#404040] px-4 py-2 text-xs font-semibold text-white hover:bg-[#252525]">Cancelar</button>
              <button type="submit" className="rounded bg-[#C8102E] px-4 py-2 text-xs font-bold text-white hover:bg-[#A80C25]">Aceptar</button>
            </footer>
          </form>
        </div>
      )}

    </div>
  );
};
