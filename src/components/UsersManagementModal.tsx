import React, { useState, useEffect } from 'react';
import { 
  X, 
  UserPlus, 
  Users, 
  ShieldCheck, 
  Briefcase, 
  Boxes, 
  CreditCard, 
  Check, 
  Trash2, 
  Edit3, 
  Key, 
  Mail, 
  User as UserIcon, 
  Lock, 
  AlertCircle,
  Clock
} from 'lucide-react';
import { User, UserRole, UserPermissions } from '../types';
import { api } from '../lib/api';

interface UsersManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User | null;
}

export const UsersManagementModal: React.FC<UsersManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [isEditing, setIsEditing] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [formUsername, setFormUsername] = useState('');
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('collaborator');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');

  const [formPermissions, setFormPermissions] = useState<UserPermissions>({
    canViewDashboard: true,
    canManageInventory: false,
    canViewCosts: false,
    canManageQuotes: true,
    canManageSales: true,
    canManageContacts: true,
    canManageSettings: false,
    canManageUsers: false,
    canDeleteRecords: false
  });

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al cargar usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setIsEditing(false);
    setIsCreateModalOpen(false);
    setSelectedUserId(null);
    setFormUsername('');
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('collaborator');
    setFormStatus('active');
    setFormPermissions({
      canViewDashboard: true,
      canManageInventory: false,
      canViewCosts: false,
      canManageQuotes: true,
      canManageSales: true,
      canManageContacts: true,
      canManageSettings: false,
      canManageUsers: false,
      canDeleteRecords: false
    });
    setErrorMessage(null);
  };

  const handleRoleChange = (role: UserRole) => {
    setFormRole(role);
    if (role === 'admin') {
      setFormPermissions({
        canViewDashboard: true,
        canManageInventory: true,
        canViewCosts: true,
        canManageQuotes: true,
        canManageSales: true,
        canManageContacts: true,
        canManageSettings: true,
        canManageUsers: true,
        canDeleteRecords: true
      });
    } else if (role === 'collaborator') {
      setFormPermissions({
        canViewDashboard: true,
        canManageInventory: false,
        canViewCosts: false,
        canManageQuotes: true,
        canManageSales: true,
        canManageContacts: true,
        canManageSettings: false,
        canManageUsers: false,
        canDeleteRecords: false
      });
    } else if (role === 'warehouse') {
      setFormPermissions({
        canViewDashboard: true,
        canManageInventory: true,
        canViewCosts: false,
        canManageQuotes: false,
        canManageSales: false,
        canManageContacts: true,
        canManageSettings: false,
        canManageUsers: false,
        canDeleteRecords: false
      });
    } else if (role === 'cashier') {
      setFormPermissions({
        canViewDashboard: true,
        canManageInventory: false,
        canViewCosts: false,
        canManageQuotes: true,
        canManageSales: true,
        canManageContacts: true,
        canManageSettings: false,
        canManageUsers: false,
        canDeleteRecords: false
      });
    }
  };

  const openCreateUserModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  const handleEditClick = (user: User) => {
    setIsEditing(true);
    setIsCreateModalOpen(false);
    setSelectedUserId(user.id);
    setFormUsername(user.username);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword('');
    setFormRole(user.role);
    setFormStatus(user.status);
    setFormPermissions(user.permissions || {
      canViewDashboard: true,
      canManageInventory: user.role === 'admin' || user.role === 'warehouse',
      canViewCosts: user.role === 'admin',
      canManageQuotes: user.role !== 'warehouse',
      canManageSales: user.role !== 'warehouse',
      canManageContacts: true,
      canManageSettings: user.role === 'admin',
      canManageUsers: user.role === 'admin',
      canDeleteRecords: user.role === 'admin'
    });
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (isEditing && selectedUserId) {
        const payload: any = {
          name: formName,
          email: formEmail,
          role: formRole,
          status: formStatus,
          permissions: formPermissions
        };
        if (formPassword.trim()) {
          payload.password = formPassword.trim();
        }

        await api.updateUser(selectedUserId, payload);
        setSuccessMessage('Colaborador actualizado correctamente');
      } else {
        if (!formUsername.trim() || !formName.trim() || !formEmail.trim() || !formPassword.trim()) {
          setErrorMessage('Todos los campos son obligatorios para crear un nuevo usuario');
          return;
        }

        await api.createUser({
          username: formUsername.trim().toLowerCase(),
          name: formName.trim(),
          email: formEmail.trim().toLowerCase(),
          password: formPassword.trim(),
          role: formRole,
          status: formStatus,
          permissions: formPermissions
        });
        setSuccessMessage('Nuevo colaborador creado con éxito');
      }

      await loadUsers();
      resetForm();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al procesar usuario');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`¿Está seguro de eliminar al usuario "${name}"?`)) return;
    try {
      await api.deleteUser(id);
      setSuccessMessage('Usuario eliminado correctamente');
      loadUsers();
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al eliminar usuario');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-slate-800 font-sans">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Gestión de Usuarios y Colaboradores
              </h2>
              <p className="text-xs text-slate-500">
                Administre accesos, roles y permisos del personal (Administradores, Vendedores, Almacén, Caja).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-700">
            <Check className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left: Users List */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Personal Registrado ({users.length})
              </h3>
              <button
                type="button"
                onClick={openCreateUserModal}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ Nuevo Usuario</span>
              </button>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-xs text-slate-400">Cargando personal...</div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const isSelected = selectedUserId === u.id && isEditing;

                  return (
                    <div
                      key={u.id}
                      className={`p-3.5 rounded-lg border transition-all flex items-center justify-between gap-3 ${
                        isSelected 
                          ? 'bg-indigo-50/70 border-indigo-300 ring-1 ring-indigo-300' 
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 text-white ${
                          u.role === 'admin' ? 'bg-indigo-600' :
                          u.role === 'collaborator' ? 'bg-emerald-600' :
                          u.role === 'warehouse' ? 'bg-amber-600' :
                          'bg-blue-600'
                        }`}>
                          {u.name.substring(0, 2).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 truncate">
                              {u.name}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.2 rounded border border-slate-300">
                                Tú
                              </span>
                            )}
                            <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                              u.role === 'admin' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                              u.role === 'collaborator' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              u.role === 'warehouse' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                              'bg-blue-50 text-blue-700 border-blue-200'
                            }`}>
                              {u.roleLabel || u.role}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                            <span>@{u.username}</span>
                            <span>•</span>
                            <span className="truncate">{u.email}</span>
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                            <Clock className="w-3 h-3" />
                            <span>Último acceso: {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Nunca'}</span>
                            <span className={`px-1 rounded text-[9px] font-semibold ${
                              u.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                            }`}>
                              {u.status === 'active' ? 'ACTIVO' : 'INACTIVO'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleEditClick(u)}
                          className="p-1.5 rounded-md text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors cursor-pointer"
                          title="Editar usuario"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {u.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleDelete(u.id, u.name)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {!isCreateModalOpen && (
            <div className="lg:col-span-5 bg-slate-50 border border-slate-200 rounded-xl p-5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                {isEditing ? <Edit3 className="w-3.5 h-3.5 text-indigo-600" /> : <UserPlus className="w-3.5 h-3.5 text-emerald-600" />}
                <span>{isEditing ? 'Editar Colaborador' : 'Registrar Nuevo Colaborador'}</span>
              </h3>

              <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Nombre Completo
                </label>
                <div className="relative">
                  <UserIcon className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Usuario
                  </label>
                  <input
                    type="text"
                    required
                    disabled={isEditing}
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                    placeholder="juanp"
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Rol / Puesto
                  </label>
                  <select
                    value={formRole}
                    onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="collaborator">Ejecutivo Comercial</option>
                    <option value="warehouse">Jefe de Almacén</option>
                    <option value="cashier">Caja & Facturación</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="juan@empresa.pe"
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  {isEditing ? 'Nueva Contraseña (dejar en blanco para mantener)' : 'Contraseña de Acceso'}
                </label>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="password"
                    required={!isEditing}
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Permissions */}
              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                    Permisos de Visualización y Acción:
                  </span>
                  
                  <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canViewCosts}
                      onChange={(e) => setFormPermissions({ ...formPermissions, canViewCosts: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span>Ver Precios de Costo & Márgenes de Ganancia</span>
                  </label>

                  <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canManageInventory}
                      onChange={(e) => setFormPermissions({ ...formPermissions, canManageInventory: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span>Crear / Modificar Productos y Ajustar Stock</span>
                  </label>

                  <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPermissions.canManageSettings}
                      onChange={(e) => setFormPermissions({ ...formPermissions, canManageSettings: e.target.checked })}
                      className="rounded border-slate-300 text-indigo-600"
                    />
                    <span>Modificar Configuración y Datos Fiscales</span>
                  </label>
                </div>
              </div>

                <div className="flex items-center gap-2 pt-2">
                  {isEditing && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="w-1/3 py-2 text-xs font-semibold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-lg cursor-pointer transition-colors"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    className={`flex-1 py-2 text-xs font-bold text-white rounded-lg cursor-pointer transition-all shadow-sm ${
                      isEditing ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {isEditing ? 'Guardar Cambios' : 'Crear Colaborador'}
                  </button>
                </div>

              </form>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end text-xs text-slate-500">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-800">Registrar nuevo colaborador</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Nombre Completo</label>
                  <div className="relative">
                    <UserIcon className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Ej. Juan Pérez"
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Usuario</label>
                    <input
                      type="text"
                      required
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      placeholder="juanp"
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">Rol / Puesto</label>
                    <select
                      value={formRole}
                      onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="collaborator">Ejecutivo Comercial</option>
                      <option value="warehouse">Jefe de Almacén</option>
                      <option value="cashier">Caja & Facturación</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="juan@empresa.pe"
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Contraseña de Acceso</label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1.5">
                    <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">Permisos de Visualización y Acción:</span>
                    <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formPermissions.canViewCosts}
                        onChange={(e) => setFormPermissions({ ...formPermissions, canViewCosts: e.target.checked })}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span>Ver Precios de Costo & Márgenes de Ganancia</span>
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formPermissions.canManageInventory}
                        onChange={(e) => setFormPermissions({ ...formPermissions, canManageInventory: e.target.checked })}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span>Crear / Modificar Productos y Ajustar Stock</span>
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formPermissions.canManageSettings}
                        onChange={(e) => setFormPermissions({ ...formPermissions, canManageSettings: e.target.checked })}
                        className="rounded border-slate-300 text-indigo-600"
                      />
                      <span>Modificar Configuración y Datos Fiscales</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="w-1/3 py-2 text-xs font-semibold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-lg cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer transition-all shadow-sm"
                  >
                    Crear Colaborador
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
