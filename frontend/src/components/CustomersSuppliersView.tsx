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
  UserCheck
} from 'lucide-react';
import { Customer, Supplier, CompanySettings } from '../types';

interface CustomersSuppliersViewProps {
  customers: Customer[];
  suppliers: Supplier[];
  settings: CompanySettings | null;
  onAddCustomer: (c: Partial<Customer>) => Promise<void>;
  onUpdateCustomer: (id: string, c: Partial<Customer>) => Promise<void>;
  onDeleteCustomer: (id: string) => Promise<void>;
  onAddSupplier: (s: Partial<Supplier>) => Promise<void>;
  onUpdateSupplier: (id: string, s: Partial<Supplier>) => Promise<void>;
  onDeleteSupplier: (id: string) => Promise<void>;
}

export const CustomersSuppliersView: React.FC<CustomersSuppliersViewProps> = ({
  customers,
  suppliers,
  settings,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier
}) => {
  const currency = settings?.currencySymbol || '$';
  const [activeTab, setActiveTab] = useState<'customers' | 'suppliers'>('customers');
  const [searchTerm, setSearchTerm] = useState('');

  // Customer Modal State
  const [isCustModalOpen, setIsCustModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [custForm, setCustForm] = useState({
    name: '',
    taxId: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    creditLimit: 0,
    paymentTerms: 'Contado'
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
    paymentTerms: '30 días crédito'
  });

  // Open Add Customer
  const handleOpenAddCust = () => {
    setEditingCustomer(null);
    setCustForm({
      name: '',
      taxId: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      creditLimit: 2000,
      paymentTerms: 'Contado'
    });
    setIsCustModalOpen(true);
  };

  // Open Edit Customer
  const handleOpenEditCust = (c: Customer) => {
    setEditingCustomer(c);
    setCustForm({
      name: c.name,
      taxId: c.taxId,
      email: c.email,
      phone: c.phone,
      address: c.address || '',
      city: c.city || '',
      creditLimit: c.creditLimit || 0,
      paymentTerms: c.paymentTerms || 'Contado'
    });
    setIsCustModalOpen(true);
  };

  // Submit Customer
  const handleSubmitCust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custForm.name.trim()) return;

    if (editingCustomer) {
      await onUpdateCustomer(editingCustomer.id, {
        ...custForm,
        creditLimit: Number(custForm.creditLimit)
      });
    } else {
      await onAddCustomer({
        ...custForm,
        creditLimit: Number(custForm.creditLimit)
      });
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
      category: 'Hardware & Equipos',
      paymentTerms: '30 días crédito'
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
      paymentTerms: s.paymentTerms || 'Contado'
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

  // Filtered lists
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.taxId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.phone.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.taxId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.contactPerson && s.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#141414] p-5 rounded-md border border-[#2D2D2D]">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Directorio de Contactos Comerciales</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
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

      {/* Search Bar */}
      <div className="bg-[#141414] p-4 rounded-md border border-[#2D2D2D]">
        <div className="relative">
          <Search className="w-4 h-4 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-contacts-search"
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={`Buscar en ${activeTab === 'customers' ? 'clientes por nombre, RUC o email' : 'proveedores por empresa o contacto'}...`}
            className="w-full pl-9 pr-4 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded-md text-xs text-white placeholder-[#71717A] focus:outline-none focus:border-[#C8102E]"
          />
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
                    RUC: {cust.taxId}
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

                <div className="mt-4 pt-3 border-t border-[#1E1E1E] flex items-center justify-between text-xs">
                  <span className="text-[#71717A]">Límite Crédito:</span>
                  <span className="font-mono tabular-nums font-bold text-white">
                    {currency} {(cust.creditLimit || 0).toLocaleString()}
                  </span>
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

                <div className="mt-4 pt-3 border-t border-[#1E1E1E] flex items-center justify-between text-xs">
                  <span className="text-[#71717A]">Condición Pago:</span>
                  <span className="font-semibold text-white">{supp.paymentTerms || 'Contado'}</span>
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
                  <label className="block text-xs font-semibold text-[#c8c6c6] mb-1">RUC / NIT / DNI *</label>
                  <input
                    type="text"
                    required
                    value={custForm.taxId}
                    onChange={e => setCustForm({ ...custForm, taxId: e.target.value })}
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
                  <label className="block text-xs font-semibold text-[#c8c6c6] mb-1">Límite de Crédito ({currency})</label>
                  <input
                    type="number"
                    value={custForm.creditLimit}
                    onChange={e => setCustForm({ ...custForm, creditLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-white text-xs font-mono tabular-nums focus:outline-none focus:border-[#C8102E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c6] mb-1">Condición de Pago</label>
                  <input
                    type="text"
                    value={custForm.paymentTerms}
                    onChange={e => setCustForm({ ...custForm, paymentTerms: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-white text-xs focus:outline-none focus:border-[#C8102E]"
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
                  <input
                    type="text"
                    value={suppForm.category}
                    onChange={e => setSuppForm({ ...suppForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-white text-xs focus:outline-none focus:border-[#C8102E]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#c8c6c6] mb-1">Condiciones de Pago</label>
                  <input
                    type="text"
                    value={suppForm.paymentTerms}
                    onChange={e => setSuppForm({ ...suppForm, paymentTerms: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-white text-xs focus:outline-none focus:border-[#C8102E]"
                  />
                </div>
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
