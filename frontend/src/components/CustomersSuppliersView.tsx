import React, { useState } from 'react';
import { 
  Users, 
  Truck, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  CreditCard, 
  DollarSign, 
  Check, 
  X,
  UserCheck,
  SlidersHorizontal
} from 'lucide-react';
import { Customer, Supplier, CompanySettings, Category } from '../types';

interface CustomersSuppliersViewProps {
  mode?: 'customers' | 'suppliers';
  customers: Customer[];
  suppliers: Supplier[];
  categories: Category[];
  settings: CompanySettings | null;
  onAddCustomer: (c: Partial<Customer>) => Promise<void>;
  onUpdateCustomer: (id: string, c: Partial<Customer>) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
  onAddSupplier: (s: Partial<Supplier>) => Promise<void>;
  onUpdateSupplier: (id: string, s: Partial<Supplier>) => Promise<void>;
  onDeleteSupplier: (id: string) => Promise<void>;
}

export const CustomersSuppliersView: React.FC<CustomersSuppliersViewProps> = ({
  mode,
  customers,
  suppliers,
  categories,
  settings,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier
}) => {
  const currency = settings?.currencySymbol || '$';
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>(mode || 'customers');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'cash' | 'credit'>('all');
  const [sortOrder, setSortOrder] = useState<'name-asc' | 'name-desc' | 'recent'>('name-asc');

  // Customer Modal State
  const [isCustModalOpen, setIsCustModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [custForm, setCustForm] = useState({
    name: '',
    documentType: 'RUC' as 'RUC' | 'NIT' | 'DNI',
    taxId: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    creditLimit: 0,
    paymentTerms: 'Contado',
    status: 'Activo'
  });

  // Supplier Modal State
  const [isSuppModalOpen, setIsSuppModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [suppForm, setSuppForm] = useState({
    name: '',
    taxId: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    category: 'Hardware & Equipos',
    paymentTerms: '30 días crédito',
    status: 'Activo'
  });

  // Open Add Customer
  const handleOpenAddCust = () => {
    setEditingCustomer(null);
    setCustForm({
      name: '',
      documentType: 'RUC' as 'RUC' | 'NIT' | 'DNI',
      taxId: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      creditLimit: 2000,
      paymentTerms: 'Contado',
      status: 'Activo'
    });
    setIsCustModalOpen(true);
  };

  // Open Edit Customer
  const handleOpenEditCust = (c: Customer) => {
    setEditingCustomer(c);
    const inferredDocumentType = c.documentType || (c.taxId.length === 8 ? 'DNI' : c.taxId.length === 9 ? 'NIT' : 'RUC');
    setCustForm({
      name: c.name,
      documentType: inferredDocumentType,
      taxId: c.taxId,
      email: c.email,
      phone: c.phone,
      address: c.address || '',
      city: c.city || '',
      creditLimit: c.creditLimit || 0,
      paymentTerms: c.paymentTerms && c.paymentTerms !== 'Contado'
        ? (['Crédito 7 días', 'Crédito 15 días', 'Crédito 30 días', 'Crédito 45 días', 'Crédito 60 días'].includes(c.paymentTerms)
          ? c.paymentTerms
          : /30/i.test(c.paymentTerms) ? 'Crédito 30 días' : 'Crédito 30 días')
        : 'Contado',
      status: c.status || 'Activo'
    });
    setIsCustModalOpen(true);
  };

  // Submit Customer
  const handleSubmitCust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custForm.name.trim()) return;

    const documentLengths = { RUC: 12, NIT: 9, DNI: 8 };
    if (!/^\d+$/.test(custForm.taxId) || custForm.taxId.length !== documentLengths[custForm.documentType]) {
      alert(`${custForm.documentType} debe contener exactamente ${documentLengths[custForm.documentType]} dígitos.`);
      return;
    }

    const customerData = {
      ...custForm,
      creditLimit: custForm.paymentTerms === 'Contado' ? 0 : Number(custForm.creditLimit)
    };

    if (editingCustomer) {
      await onUpdateCustomer(editingCustomer.id, customerData);
    } else {
      await onAddCustomer(customerData);
    }
    setIsCustModalOpen(false);
  };

  // Open Add Supplier
  const handleOpenAddSupp = () => {
    setEditingSupplier(null);
    setSuppForm({
      name: '',
      taxId: '',
      contactPerson: '',
      email: '',
      phone: '',
      address: '',
      category: categories[0]?.name || '',
      paymentTerms: 'Contado',
      status: 'Activo'
    });
    setIsSuppModalOpen(true);
  };

  // Open Edit Supplier
  const handleOpenEditSupp = (s: Supplier) => {
    setEditingSupplier(s);
    setSuppForm({
      name: s.name,
      taxId: s.taxId,
      contactPerson: s.contactPerson || '',
      email: s.email,
      phone: s.phone,
      address: s.address || '',
      category: s.category || 'General',
      paymentTerms: s.paymentTerms || 'Contado',
      status: s.status || 'Activo'
    });
    setIsSuppModalOpen(true);
  };

  // Submit Supplier
  const handleSubmitSupp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suppForm.name.trim()) return;

    if (editingSupplier) {
      await onUpdateSupplier(editingSupplier.id, suppForm);
    } else {
      await onAddSupplier(suppForm);
    }
    setIsSuppModalOpen(false);
  };

  const normalizeSearch = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  const normalizedSearch = normalizeSearch(searchTerm);
  const isCashPayment = (paymentTerms?: string) => !paymentTerms || normalizeSearch(paymentTerms).includes('contado');
  const isActive = (status?: string) => !status || normalizeSearch(status) === 'activo' || normalizeSearch(status) === 'active';
  const getCustomerDocumentType = (customer: Customer): 'RUC' | 'NIT' | 'DNI' => {
    if (customer.documentType) return customer.documentType;
    const digits = customer.taxId.replace(/\D/g, '').length;
    if (digits === 8) return 'DNI';
    if (digits === 9) return 'NIT';
    return 'RUC';
  };

  const filteredCustomers = customers
    .filter(c => {
      const searchable = [c.name, c.taxId, c.email, c.phone, c.address, c.city, c.contactPerson, c.paymentTerms]
        .filter(Boolean)
        .map(value => normalizeSearch(String(value)))
        .join(' ');
      const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'active' && isActive(c.status))
        || (statusFilter === 'inactive' && !isActive(c.status))
        || (statusFilter === 'cash' && isCashPayment(c.paymentTerms))
        || (statusFilter === 'credit' && !isCashPayment(c.paymentTerms));
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => sortOrder === 'recent'
      ? (b.createdAt || '').localeCompare(a.createdAt || '')
      : sortOrder === 'name-desc'
        ? b.name.localeCompare(a.name, 'es')
        : a.name.localeCompare(b.name, 'es'));

  const filteredSuppliers = suppliers
    .filter(s => {
      const searchable = [s.name, s.taxId, s.email, s.phone, s.address, s.contactPerson, s.category, s.paymentTerms]
        .filter(Boolean)
        .map(value => normalizeSearch(String(value)))
        .join(' ');
      const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
      const matchesStatus = statusFilter === 'all'
        || statusFilter === 'active'
        || (statusFilter === 'inactive' && false)
        || (statusFilter === 'cash' && isCashPayment(s.paymentTerms))
        || (statusFilter === 'credit' && !isCashPayment(s.paymentTerms));
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => sortOrder === 'recent'
      ? (b.createdAt || '').localeCompare(a.createdAt || '')
      : sortOrder === 'name-desc'
        ? b.name.localeCompare(a.name, 'es')
        : a.name.localeCompare(b.name, 'es'));

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414] p-5 rounded-md border border-[#2D2D2D]">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight">
              {mode === 'suppliers' ? 'Gestión de Proveedores' : mode === 'customers' ? 'Gestión de Clientes' : 'Directorio de Contactos Comerciales'}
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {!mode && (
          <div className="flex bg-[#0E0E0E] p-1 rounded-md border border-[#2D2D2D]">
            <button
              id="tab-customers-view"
              onClick={() => setActiveTab('customers')}
              className={`px-4 py-2 text-xs font-bold rounded transition-all flex items-center space-x-1.5 ${
                activeTab === 'customers'
                  ? 'bg-[#C8102E] text-white shadow-sm'
                  : 'text-[#c8c6c6] hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Clientes ({customers.length})</span>
            </button>
            <button
              id="tab-suppliers-view"
              onClick={() => setActiveTab('suppliers')}
              className={`px-4 py-2 text-xs font-bold rounded transition-all flex items-center space-x-1.5 ${
                activeTab === 'suppliers'
                  ? 'bg-[#C8102E] text-white shadow-sm'
                  : 'text-[#c8c6c6] hover:text-white'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Proveedores ({suppliers.length})</span>
            </button>
          </div>
          )}

          <button
            id="btn-add-contact-action"
            onClick={activeTab === 'customers' ? handleOpenAddCust : handleOpenAddSupp}
            className="px-4 py-2 bg-[#C8102E] hover:bg-[#A80C25] text-white rounded font-bold text-xs transition-colors shadow-sm flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === 'customers' ? 'Nuevo Cliente' : 'Nuevo Proveedor'}</span>
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="bg-[#141414] p-4 rounded-md border border-[#2D2D2D] space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-contacts-search"
              type="search"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder={activeTab === 'customers'
                ? 'Buscar por nombre, RUC/DNI, correo, teléfono o dirección...'
                : 'Buscar por empresa, RUC, contacto, correo o categoría...'}
              className="w-full pl-9 pr-4 py-2.5 bg-[#0E0E0E] border border-[#2D2D2D] rounded-md text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#C8102E]"
            />
          </div>
          <button
            type="button"
            aria-label="Filtros de búsqueda"
            onClick={() => setStatusFilter('all')}
            className="px-3 bg-[#C8102E] hover:bg-[#A80C25] text-white rounded-md border border-[#C8102E] transition-colors"
            title="Limpiar filtros"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {([
            ['all', 'Todos'],
            ['active', 'Activos'],
            ['inactive', 'Inactivos'],
            ['cash', 'Contado'],
            ['credit', 'Crédito']
          ] as const).map(([value, label]) => {
            const currentItems = activeTab === 'customers' ? customers : suppliers;
            const count = value === 'all'
              ? currentItems.length
              : value === 'active'
                ? currentItems.filter(item => isActive((item as Customer).status)).length
                : value === 'inactive'
                  ? currentItems.filter(item => !isActive((item as Customer).status)).length
                  : currentItems.filter(item => value === 'cash'
                      ? isCashPayment(item.paymentTerms)
                      : !isCashPayment(item.paymentTerms)).length;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors border ${statusFilter === value
                  ? 'bg-[#C8102E] border-[#C8102E] text-white'
                  : 'bg-transparent border-[#2D2D2D] text-[#c8c6c6] hover:text-white hover:border-[#71717A]'}`}
              >
                {label} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-[#71717A] border-t border-[#2D2D2D] pt-3">
          <span>
            Mostrando {activeTab === 'customers' ? filteredCustomers.length : filteredSuppliers.length} de {(activeTab === 'customers' ? customers : suppliers).length} {activeTab === 'customers' ? 'clientes' : 'proveedores'}
          </span>
          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value as typeof sortOrder)}
            aria-label="Ordenar resultados"
            className="bg-transparent text-[#c8c6c6] border-none outline-none cursor-pointer"
          >
            <option value="name-asc">Ordenar: Nombre A-Z</option>
            <option value="name-desc">Ordenar: Nombre Z-A</option>
            <option value="recent">Ordenar: Más recientes</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {activeTab === 'customers' ? (
        
        /* Customers List */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(cust => (
            <div key={cust.id} className="bg-[#141414] rounded-md border border-[#2D2D2D] p-5 flex flex-col justify-between hover:border-[#C8102E] transition-all">
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded bg-[#1E1E1E] text-[#ffb3b1] border border-[#2D2D2D] flex items-center justify-center font-bold text-sm font-mono">
                    {cust.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="px-2 py-0.5 bg-[#1E1E1E] border border-[#2D2D2D] text-[#c8c6c6] rounded font-mono text-[10px]">
                    {getCustomerDocumentType(cust)}: {cust.taxId}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white mt-3">{cust.name}</h4>
                
                <div className="mt-3 space-y-1.5 text-xs text-[#c8c6c6]">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
                    <span className="truncate">{cust.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
                    <span>{cust.phone}</span>
                  </div>
                  {cust.address && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
                      <span className="truncate">{cust.address}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-[#1E1E1E] space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[#71717A]">Condición de Pago:</span>
                    <span className="font-semibold text-white">{cust.paymentTerms || 'Contado'}</span>
                  </div>
                    <div className="flex items-center justify-between">
                    <span className="text-[#71717A]">Límite Crédito:</span>
                    <span className="font-mono tabular-nums font-bold text-white">
                      {currency} {(cust.creditLimit || 0).toLocaleString()}
                    </span>
                  </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#71717A]">Estado:</span>
                      <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${isActive(cust.status) ? 'bg-[#063A2F] text-[#31D0AA] border border-[#10B981]/50' : 'bg-[#1E1E1E] text-[#9CA3AF] border border-[#3D3D3D]'}`}>
                        {isActive(cust.status) ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 mt-4 pt-3 border-t border-[#1E1E1E]">
                <button
                  onClick={() => handleOpenEditCust(cust)}
                  className="px-3 py-1.5 bg-[#1E1E1E] hover:bg-[#2D2D2D] text-white border border-[#2D2D2D] text-xs font-semibold rounded transition-colors flex items-center space-x-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar al cliente ${cust.name}?`)) onDeleteCustomer(cust.id);
                  }}
                  className="p-1.5 hover:bg-[#C8102E]/15 text-[#71717A] hover:text-[#C8102E] rounded border border-transparent hover:border-[#C8102E]/40 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

      ) : (
        
        /* Suppliers List */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map(supp => (
            <div key={supp.id} className="bg-[#141414] rounded-md border border-[#2D2D2D] p-5 flex flex-col justify-between hover:border-[#C8102E] transition-all">
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded bg-[#1E1E1E] text-[#ffb3b1] border border-[#2D2D2D] flex items-center justify-center font-bold text-sm font-mono">
                    {supp.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="px-2 py-0.5 bg-[#1E1E1E] border border-[#2D2D2D] text-[#c8c6c6] rounded font-mono text-[10px]">
                    {supp.category || 'Proveedor'}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-white mt-3">{supp.name}</h4>
                <p className="text-[11px] font-mono text-[#71717A]">RUC: {supp.taxId}</p>

                <div className="mt-3 space-y-1.5 text-xs text-[#c8c6c6]">
                  {supp.contactPerson && (
                    <div className="flex items-center space-x-2">
                      <UserCheck className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
                      <span>{supp.contactPerson}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
                    <span className="truncate">{supp.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-[#71717A] shrink-0" />
                    <span>{supp.phone}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#1E1E1E] space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[#71717A] shrink-0">Categoría de Suministros:</span>
                    <span className="font-semibold text-white text-right">{supp.category || 'No definida'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#71717A]">Condición Pago:</span>
                    <span className="font-semibold text-white">{supp.paymentTerms || 'Contado'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#71717A]">Estado:</span>
                    <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${isActive(supp.status) ? 'border border-[#10B981]/50 bg-[#063A2F] text-[#31D0AA]' : 'border border-[#3D3D3D] bg-[#1E1E1E] text-[#9CA3AF]'}`}>
                      {isActive(supp.status) ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 mt-4 pt-3 border-t border-[#1E1E1E]">
                <button
                  onClick={() => handleOpenEditSupp(supp)}
                  className="px-3 py-1.5 bg-[#1E1E1E] hover:bg-[#2D2D2D] text-white border border-[#2D2D2D] text-xs font-semibold rounded transition-colors flex items-center space-x-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar al proveedor ${supp.name}?`)) onDeleteSupplier(supp.id);
                  }}
                  className="p-1.5 hover:bg-[#C8102E]/15 text-[#71717A] hover:text-[#C8102E] rounded border border-transparent hover:border-[#C8102E]/40 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

      )}

      {/* Modal: Customer Form */}
      {isCustModalOpen && (
        <div id="modal-customer-form" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#141414] rounded-md shadow-2xl max-w-lg w-full overflow-hidden border border-[#2D2D2D]">
            <div className="px-6 py-4 bg-[#0E0E0E] text-white flex items-center justify-between border-b border-[#2D2D2D]">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-[#C8102E]" />
                <h3 className="text-base font-bold text-white">{editingCustomer ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}</h3>
              </div>
              <button onClick={() => setIsCustModalOpen(false)} className="text-[#71717A] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCust} className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#c8c6c6] mb-1">Nombre / Razón Social *</label>
                <input
                  type="text"
                  required
                  value={custForm.name}
                  onChange={e => setCustForm({ ...custForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-white text-xs focus:outline-none focus:border-[#C8102E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c6] mb-1">Tipo de documento *</label>
                  <div className="mb-2 grid grid-cols-3 gap-2">
                    {(['RUC', 'NIT', 'DNI'] as const).map(documentType => (
                      <button
                        key={documentType}
                        type="button"
                        onClick={() => setCustForm({ ...custForm, documentType, taxId: '' })}
                        className={`rounded border px-3 py-2 text-xs font-bold transition-colors ${custForm.documentType === documentType ? 'border-[#C8102E] bg-[#C8102E] text-white' : 'border-[#2D2D2D] bg-[#1E1E1E] text-[#D1D5DB] hover:text-white'}`}
                      >
                        {documentType}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={custForm.taxId}
                    onChange={e => {
                      const maxLength = { RUC: 12, NIT: 9, DNI: 8 }[custForm.documentType];
                      setCustForm({ ...custForm, taxId: e.target.value.replace(/\D/g, '').slice(0, maxLength) });
                    }}
                    maxLength={{ RUC: 12, NIT: 9, DNI: 8 }[custForm.documentType]}
                    placeholder={`${custForm.documentType}: ${ { RUC: 12, NIT: 9, DNI: 8 }[custForm.documentType]} dígitos`}
                    className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-white text-xs font-mono focus:outline-none focus:border-[#C8102E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c6] mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={custForm.phone}
                    onChange={e => setCustForm({ ...custForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-white text-xs focus:outline-none focus:border-[#C8102E]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8c6c6] mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={custForm.email}
                  onChange={e => setCustForm({ ...custForm, email: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-white text-xs focus:outline-none focus:border-[#C8102E]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8c6c6] mb-1">Dirección Fiscal</label>
                <input
                  type="text"
                  value={custForm.address}
                  onChange={e => setCustForm({ ...custForm, address: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-white text-xs focus:outline-none focus:border-[#C8102E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c6] mb-1">Estado</label>
                  <select
                    value={custForm.status}
                    onChange={e => setCustForm({ ...custForm, status: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-white text-xs focus:outline-none focus:border-[#C8102E]"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c6] mb-1">Condición de Pago</label>
                  <select
                    value={custForm.paymentTerms}
                    onChange={e => {
                      const paymentTerms = e.target.value;
                      setCustForm({
                        ...custForm,
                        paymentTerms,
                        creditLimit: paymentTerms === 'Contado' ? 0 : (custForm.creditLimit || 2000)
                      });
                    }}
                    className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-white text-xs focus:outline-none focus:border-[#C8102E]"
                  >
                    <option value="Contado">Al contado</option>
                    <option value="Crédito 7 días">Crédito 7 días</option>
                    <option value="Crédito 15 días">Crédito 15 días</option>
                    <option value="Crédito 30 días">Crédito 30 días</option>
                    <option value="Crédito 45 días">Crédito 45 días</option>
                    <option value="Crédito 60 días">Crédito 60 días</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c6] mb-1">Límite de Crédito ({currency})</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    disabled={custForm.paymentTerms === 'Contado'}
                    value={custForm.paymentTerms === 'Contado' ? 0 : custForm.creditLimit}
                    onChange={e => setCustForm({ ...custForm, creditLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-white text-xs font-mono tabular-nums focus:outline-none focus:border-[#C8102E] disabled:bg-[#141414] disabled:text-[#71717A] disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#2D2D2D] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCustModalOpen(false)}
                  className="px-4 py-2 bg-[#1E1E1E] hover:bg-[#2D2D2D] text-white border border-[#2D2D2D] text-xs font-semibold rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#C8102E] hover:bg-[#A80C25] text-white text-xs font-bold rounded shadow-sm"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Supplier Form */}
      {isSuppModalOpen && (
        <div id="modal-supplier-form" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="bg-[#141414] rounded-md shadow-2xl max-w-lg w-full overflow-hidden border border-[#2D2D2D]">
            <div className="px-6 py-4 bg-[#0E0E0E] text-white flex items-center justify-between border-b border-[#2D2D2D]">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-[#C8102E]" />
                <h3 className="text-base font-bold text-white">{editingSupplier ? 'Editar Proveedor' : 'Registrar Proveedor'}</h3>
              </div>
              <button onClick={() => setIsSuppModalOpen(false)} className="text-[#71717A] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSupp} className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[#c8c6c6] mb-1">Nombre / Empresa Proveedora *</label>
                <input
                  type="text"
                  required
                  value={suppForm.name}
                  onChange={e => setSuppForm({ ...suppForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-white text-xs focus:outline-none focus:border-[#C8102E]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c6] mb-1">RUC / NIT *</label>
                  <input
                    type="text"
                    required
                    value={suppForm.taxId}
                    onChange={e => setSuppForm({ ...suppForm, taxId: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-white text-xs font-mono focus:outline-none focus:border-[#C8102E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c6] mb-1">Persona de Contacto</label>
                  <input
                    type="text"
                    value={suppForm.contactPerson}
                    onChange={e => setSuppForm({ ...suppForm, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-white text-xs focus:outline-none focus:border-[#C8102E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c6] mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={suppForm.email}
                    onChange={e => setSuppForm({ ...suppForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-white text-xs focus:outline-none focus:border-[#C8102E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c6] mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={suppForm.phone}
                    onChange={e => setSuppForm({ ...suppForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-white text-xs focus:outline-none focus:border-[#C8102E]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c6] mb-1">Categoría de Suministros</label>
                  <select
                    value={suppForm.category}
                    onChange={e => setSuppForm({ ...suppForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-white text-xs focus:outline-none focus:border-[#C8102E]"
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.name}>{category.name}</option>
                    ))}
                    {!categories.some(category => category.name === 'Transportista') && <option value="Transportista">Transportista</option>}
                    {!categories.some(category => category.name === suppForm.category) && suppForm.category && (
                      <option value={suppForm.category}>{suppForm.category}</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c6] mb-1">Condición de Pago</label>
                  <select
                    value={suppForm.paymentTerms}
                    onChange={e => setSuppForm({ ...suppForm, paymentTerms: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-white text-xs focus:outline-none focus:border-[#C8102E]"
                  >
                    <option value="Contado">Al contado</option>
                    <option value="Crédito 7 días">Crédito 7 días</option>
                    <option value="Crédito 15 días">Crédito 15 días</option>
                    <option value="Crédito 30 días">Crédito 30 días</option>
                    <option value="Crédito 45 días">Crédito 45 días</option>
                    <option value="Crédito 60 días">Crédito 60 días</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#c8c6c6] mb-1">Estado</label>
                <select
                  value={suppForm.status}
                  onChange={e => setSuppForm({ ...suppForm, status: e.target.value })}
                  className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-white text-xs focus:outline-none focus:border-[#C8102E]"
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>
              </div>

              <div className="pt-4 border-t border-[#2D2D2D] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsSuppModalOpen(false)}
                  className="px-4 py-2 bg-[#1E1E1E] hover:bg-[#2D2D2D] text-white border border-[#2D2D2D] text-xs font-semibold rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#C8102E] hover:bg-[#A80C25] text-white text-xs font-bold rounded shadow-sm"
                >
                  Guardar Proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
