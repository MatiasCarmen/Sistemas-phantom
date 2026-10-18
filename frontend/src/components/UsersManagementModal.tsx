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
    setIsCreateModalOpen(true);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="bg-[#141414] rounded-md shadow-2xl border border-[#2D2D2D] w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden text-[#e5e2e1] font-sans">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2D2D2D] flex items-center justify-between bg-[#0E0E0E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#1E1E1E] border border-[#2D2D2D] flex items-center justify-center text-[#ffb3b1] shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Gestión de Personal & Roles
              </h2>
              <p className="text-xs text-zinc-400">
                Administre accesos, roles y permisos operativos (Administradores, Ventas, Almacén, Caja).
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-[#1E1E1E] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 bg-[#C8102E]/10 border border-[#C8102E]/30 rounded flex items-center gap-2 text-xs text-[#ffb3b1]">
            <AlertCircle className="w-4 h-4 text-[#ffb3b1] shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 bg-emerald-950/40 border border-emerald-500/30 rounded flex items-center gap-2 text-xs text-emerald-400">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Left: Users List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider font-mono">
                Personal Registrado ({users.length})
              </h3>
              <button
                type="button"
                onClick={openCreateUserModal}
                className="text-xs font-semibold text-[#ffb3b1] hover:text-white flex items-center gap-1.5 cursor-pointer px-2.5 py-1 rounded bg-[#1E1E1E] border border-[#2D2D2D] hover:border-[#3D3D3D] transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#C8102E]" />
                <span>+ Nuevo Usuario</span>
              </button>
            </div>

            {isLoading ? (
              <div className="p-8 text-center text-xs text-zinc-500 font-mono">Cargando personal...</div>
            ) : (
              <div className="space-y-2">
                {users.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const isSelected = selectedUserId === u.id && isEditing;

                  return (
                    <div
                      key={u.id}
                      className={`p-3.5 rounded border transition-all flex items-center justify-between gap-3 ${
                        isSelected 
                          ? 'bg-[#1E1E1E] border-[#C8102E]/60 ring-1 ring-[#C8102E]/30' 
                          : 'bg-[#0E0E0E] border-[#2D2D2D] hover:border-[#3D3D3D]'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded flex items-center justify-center font-bold text-xs shrink-0 font-mono text-white bg-[#1E1E1E] border border-[#2D2D2D]">
                          {u.name.substring(0, 2).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">
                              {u.name}
                            </span>
                            {isCurrent && (
                              <span className="text-[10px] bg-[#1E1E1E] text-zinc-400 font-semibold px-1.5 py-0.2 rounded border border-[#2D2D2D]">
                                Tú
                              </span>
                            )}
                            <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                              u.role === 'admin' ? 'bg-[#C8102E]/15 text-[#ffb3b1] border-[#C8102E]/40' :
                              u.role === 'collaborator' ? 'bg-[#1E1E1E] text-zinc-300 border-[#2D2D2D]' :
                              u.role === 'warehouse' ? 'bg-amber-950/40 text-amber-400 border-amber-500/30' :
                              'bg-blue-950/40 text-blue-400 border-blue-500/30'
                            }`}>
                              {u.roleLabel || u.role}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-0.5 font-mono">
                            <span>@{u.username}</span>
                            <span>•</span>
                            <span className="truncate">{u.email}</span>
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-[10px] text-zinc-500 font-mono tabular-nums">
                            <Clock className="w-3 h-3" />
                            <span>Último acceso: {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Nunca'}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] font-semibold border ${
                              u.status === 'active' 
                                ? 'bg-emerald-950/50 text-emerald-400 border-emerald-500/30' 
                                : 'bg-zinc-900 text-zinc-500 border-zinc-800'
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
                          className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-[#1E1E1E] transition-colors cursor-pointer"
                          title="Editar usuario"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {u.role !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleDelete(u.id, u.name)}
                            className="p-1.5 rounded text-zinc-500 hover:text-[#ffb3b1] hover:bg-[#C8102E]/20 transition-colors cursor-pointer"
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

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-[#2D2D2D] bg-[#0E0E0E] flex items-center justify-end text-xs text-zinc-400">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#1E1E1E] hover:bg-[#2D2D2D] text-zinc-200 font-semibold rounded border border-[#2D2D2D] transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>

      </div>

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-xl bg-[#141414] rounded-md shadow-2xl border border-[#2D2D2D] overflow-hidden relative text-[#e5e2e1]">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#2D2D2D] bg-[#0E0E0E]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#ffb3b1]" />
                <h3 className="text-sm font-bold text-white">{isEditing ? 'Editar Colaborador' : 'Registrar Nuevo Colaborador'}</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-[#1E1E1E] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              <form onSubmit={handleSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Nombre Completo</label>
                  <div className="relative">
                    <UserIcon className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Ej. Juan Pérez"
                      className="w-full pl-8 pr-3 py-1.5 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#C8102E]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Usuario</label>
                    <input
                      type="text"
                      required
                      disabled={isEditing}
                      value={formUsername}
                      onChange={(e) => setFormUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                      placeholder="juanp"
                      className="w-full px-3 py-1.5 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs text-white font-mono focus:outline-none focus:border-[#C8102E] disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Rol / Puesto</label>
                    <select
                      value={formRole}
                      onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                      className="w-full px-2.5 py-1.5 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs text-white focus:outline-none focus:border-[#C8102E]"
                    >
                      <option value="collaborator">Ejecutivo Comercial</option>
                      <option value="warehouse">Jefe de Almacén</option>
                      <option value="cashier">Caja & Facturación</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">Correo Electrónico</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="juan@empresa.pe"
                      className="w-full pl-8 pr-3 py-1.5 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#C8102E]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                    {isEditing ? 'Nueva Contraseña (opcional)' : 'Contraseña de Acceso'}
                  </label>
                  <div className="relative">
                    <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
                    <input
                      type="password"
                      required={!isEditing}
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-8 pr-3 py-1.5 bg-[#0E0E0E] border border-[#2D2D2D] rounded text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#C8102E]"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-[#2D2D2D] space-y-2">
                  <div className="bg-[#0E0E0E] p-2.5 rounded border border-[#2D2D2D] space-y-1.5">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block font-mono">Permisos de Visualización y Acción:</span>
                    <label className="flex items-center gap-2 text-[11px] text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formPermissions.canViewCosts}
                        onChange={(e) => setFormPermissions({ ...formPermissions, canViewCosts: e.target.checked })}
                        className="rounded border-[#2D2D2D] accent-[#C8102E]"
                      />
                      <span>Ver Precios de Costo & Márgenes de Ganancia</span>
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formPermissions.canManageInventory}
                        onChange={(e) => setFormPermissions({ ...formPermissions, canManageInventory: e.target.checked })}
                        className="rounded border-[#2D2D2D] accent-[#C8102E]"
                      />
                      <span>Crear / Modificar Productos y Ajustar Stock</span>
                    </label>
                    <label className="flex items-center gap-2 text-[11px] text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formPermissions.canManageSettings}
                        onChange={(e) => setFormPermissions({ ...formPermissions, canManageSettings: e.target.checked })}
                        className="rounded border-[#2D2D2D] accent-[#C8102E]"
                      />
                      <span>Modificar Configuración y Datos Fiscales</span>
                    </label>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="w-1/3 py-2 text-xs font-semibold text-zinc-300 bg-[#1E1E1E] hover:bg-[#2D2D2D] border border-[#2D2D2D] rounded cursor-pointer transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 text-xs font-bold text-white bg-[#C8102E] hover:bg-[#A80C25] rounded cursor-pointer transition-all shadow-sm"
                  >
                    {isEditing ? 'Guardar Cambios' : 'Crear Colaborador'}
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
