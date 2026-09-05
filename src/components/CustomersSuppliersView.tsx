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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/80 p-5 rounded-2xl border border-slate-700/80 shadow-2xl shadow-slate-950/30">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-white tracking-tight">Directorio de Contactos Comerciales</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-600">
            <button
              id="tab-customers-view"
              onClick={() => setActiveTab('customers')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === 'customers'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/30'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Clientes ({customers.length})</span>
            </button>
            <button
              id="tab-suppliers-view"
              onClick={() => setActiveTab('suppliers')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 ${
                activeTab === 'suppliers'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/30'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Proveedores ({suppliers.length})</span>
            </button>
          </div>

          <button
            id="btn-add-contact-action"
            onClick={activeTab === 'customers' ? handleOpenAddCust : handleOpenAddSupp}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-xs font-bold transition-colors shadow-lg shadow-violet-900/40 flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === 'customers' ? 'Nuevo Cliente' : 'Nuevo Proveedor'}</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-slate-900/80 p-4 rounded-2xl border border-slate-700/80 shadow-2xl shadow-slate-950/30">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            id="input-contacts-search"
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder={`Buscar en ${activeTab === 'customers' ? 'clientes por nombre, RUC o email' : 'proveedores por empresa o contacto'}...`}
            className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-600 rounded-xl text-xs text-slate-100 placeholder-slate-400 focus:ring-2 focus:ring-violet-500 focus:bg-slate-950"
          />
        </div>
      </div>

      {/* Content */}
      {activeTab === 'customers' ? (
        
        /* Customers List */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCustomers.map(cust => (
            <div key={cust.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">
                    {cust.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono text-[10px]">
                    RUC: {cust.taxId}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 mt-3">{cust.name}</h4>
                
                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{cust.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{cust.phone}</span>
                  </div>
                  {cust.address && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{cust.address}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Límite Crédito:</span>
                  <span className="font-mono font-bold text-slate-900">
                    {currency} {(cust.creditLimit || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleOpenEditCust(cust)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar al cliente ${cust.name}?`)) onDeleteCustomer(cust.id);
                  }}
                  className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

      ) : (
        
        /* Suppliers List */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map(supp => (
            <div key={supp.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
                    {supp.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md font-medium text-[10px]">
                    {supp.category || 'Proveedor'}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-900 mt-3">{supp.name}</h4>
                <p className="text-[11px] font-mono text-slate-400">RUC: {supp.taxId}</p>

                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  {supp.contactPerson && (
                    <div className="flex items-center space-x-2">
                      <UserCheck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{supp.contactPerson}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{supp.email}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{supp.phone}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Condición Pago:</span>
                  <span className="font-semibold text-slate-700">{supp.paymentTerms || 'Contado'}</span>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 mt-4 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleOpenEditSupp(supp)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors flex items-center space-x-1"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => {
                    if (confirm(`¿Eliminar al proveedor ${supp.name}?`)) onDeleteSupplier(supp.id);
                  }}
                  className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

      )}

      {/* Modal: Customer Form */}
      {isCustModalOpen && (
        <div id="modal-customer-form" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold">{editingCustomer ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}</h3>
              </div>
              <button onClick={() => setIsCustModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCust} className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre / Razón Social *</label>
                <input
                  type="text"
                  required
                  value={custForm.name}
                  onChange={e => setCustForm({ ...custForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">RUC / NIT / DNI *</label>
                  <input
                    type="text"
                    required
                    value={custForm.taxId}
                    onChange={e => setCustForm({ ...custForm, taxId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={custForm.phone}
                    onChange={e => setCustForm({ ...custForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico *</label>
                <input
                  type="email"
                  required
                  value={custForm.email}
                  onChange={e => setCustForm({ ...custForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Dirección Fiscal</label>
                <input
                  type="text"
                  value={custForm.address}
                  onChange={e => setCustForm({ ...custForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Límite de Crédito ({currency})</label>
                  <input
                    type="number"
                    value={custForm.creditLimit}
                    onChange={e => setCustForm({ ...custForm, creditLimit: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Condición de Pago</label>
                  <input
                    type="text"
                    value={custForm.paymentTerms}
                    onChange={e => setCustForm({ ...custForm, paymentTerms: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCustModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
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
        <div id="modal-supplier-form" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-2xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Truck className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold">{editingSupplier ? 'Editar Proveedor' : 'Registrar Proveedor'}</h3>
              </div>
              <button onClick={() => setIsSuppModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitSupp} className="p-6 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nombre / Empresa Proveedora *</label>
                <input
                  type="text"
                  required
                  value={suppForm.name}
                  onChange={e => setSuppForm({ ...suppForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">RUC / NIT *</label>
                  <input
                    type="text"
                    required
                    value={suppForm.taxId}
                    onChange={e => setSuppForm({ ...suppForm, taxId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Persona de Contacto</label>
                  <input
                    type="text"
                    value={suppForm.contactPerson}
                    onChange={e => setSuppForm({ ...suppForm, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={suppForm.email}
                    onChange={e => setSuppForm({ ...suppForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={suppForm.phone}
                    onChange={e => setSuppForm({ ...suppForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría de Suministros</label>
                  <input
                    type="text"
                    value={suppForm.category}
                    onChange={e => setSuppForm({ ...suppForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Condiciones de Pago</label>
                  <input
                    type="text"
                    value={suppForm.paymentTerms}
                    onChange={e => setSuppForm({ ...suppForm, paymentTerms: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsSuppModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
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
