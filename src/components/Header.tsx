import React, { useState } from 'react';
import { 
  Package, 
  FileSpreadsheet, 
  ShoppingCart, 
  BarChart3, 
  History, 
  Users, 
  Settings, 
  AlertTriangle, 
  Plus, 
  Menu,
  X,
  LogOut,
  UserCheck,
  Shield,
  UserCog,
  ChevronDown,
  Database,
  HelpCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { User } from '../types';

export interface SidebarProps {
  activeTab: 'dashboard' | 'inventory' | 'kardex' | 'quotes' | 'sales' | 'contacts' | 'settings';
  setActiveTab: (tab: 'dashboard' | 'inventory' | 'kardex' | 'quotes' | 'sales' | 'contacts' | 'settings') => void;
  companyName?: string;
  lowStockCount?: number;
  outOfStockCount?: number;
  pendingQuotesCount?: number;
  mobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
  currentUser: User | null;
  onLogout: () => void;
  onOpenUsersModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  companyName,
  lowStockCount = 0,
  outOfStockCount = 0,
  pendingQuotesCount = 0,
  mobileMenuOpen,
  setMobileMenuOpen,
  currentUser,
  onLogout,
  onOpenUsersModal
}) => {
  const role = currentUser?.role || 'collaborator';
  const isAdmin = role === 'admin';
  const isWarehouse = role === 'warehouse';
  const isCashier = role === 'cashier';
  const isCollaborator = role === 'collaborator';

  // Build role-tailored navigation groups
  const getNavGroups = () => {
    if (isAdmin) {
      return [
        {
          title: 'PANEL & EXISTENCIAS',
          items: [
            { id: 'dashboard' as const, label: 'Panel Ejecutivo', icon: BarChart3, desc: 'Métricas generales, ventas y utilidades' },
            { 
              id: 'inventory' as const, 
              label: 'Inventario & Catálogo', 
              icon: Package, 
              desc: 'Control de stock, precios y costos',
              badge: lowStockCount + outOfStockCount > 0 ? lowStockCount + outOfStockCount : undefined,
              badgeColor: 'bg-rose-500 text-white' 
            },
            { id: 'kardex' as const, label: 'Kardex Valorizado', icon: History, desc: 'Trazabilidad de entradas, salidas y ajustes' }
          ]
        },
        {
          title: 'MÓDULO COMERCIAL',
          items: [
            { 
              id: 'quotes' as const, 
              label: 'Cotizaciones Formales', 
              icon: FileSpreadsheet,
              desc: 'Emisión con IGV y validez',
              badge: pendingQuotesCount > 0 ? pendingQuotesCount : undefined,
              badgeColor: 'bg-amber-500 text-white'
            },
            { id: 'sales' as const, label: 'Ventas & Facturación POS', icon: ShoppingCart, desc: 'Boletas, facturas y cobros' }
          ]
        },
        {
          title: 'SISTEMA & DIRECTORIO',
          items: [
            { id: 'contacts' as const, label: 'Clientes & Proveedores', icon: Users, desc: 'Cartera RUC/DNI y contactos' },
            { id: 'settings' as const, label: 'Configuración & Sistema', icon: Settings, desc: 'Parámetros fiscales y base de datos' }
          ]
        }
      ];
    }

    if (isWarehouse) {
      return [
        {
          title: 'LOGÍSTICA & ALMACÉN',
          items: [
            { id: 'dashboard' as const, label: 'Panel de Almacén', icon: BarChart3, desc: 'Resumen de stock y alertas' },
            { 
              id: 'inventory' as const, 
              label: 'Inventario & Stock', 
              icon: Package, 
              desc: 'Control de existencias físicas',
              badge: lowStockCount + outOfStockCount > 0 ? lowStockCount + outOfStockCount : undefined,
              badgeColor: 'bg-rose-500 text-white' 
            },
            { id: 'kardex' as const, label: 'Kardex / Movimientos', icon: History, desc: 'Registro de entradas y despachos' }
          ]
        },
        {
          title: 'CONTACTOS LOGÍSTICOS',
          items: [
            { id: 'contacts' as const, label: 'Proveedores & Clientes', icon: Users, desc: 'Directorio de abastecimiento' }
          ]
        }
      ];
    }

    if (isCashier) {
      return [
        {
          title: 'CAJA & FACTURACIÓN',
          items: [
            { id: 'sales' as const, label: 'Punto de Venta (POS)', icon: ShoppingCart, desc: 'Emisión de boletas y tickets' },
            { 
              id: 'quotes' as const, 
              label: 'Cotizaciones', 
              icon: FileSpreadsheet,
              desc: 'Convertir a venta',
              badge: pendingQuotesCount > 0 ? pendingQuotesCount : undefined,
              badgeColor: 'bg-amber-500 text-white'
            }
          ]
        },
        {
          title: 'CONSULTAS',
          items: [
            { id: 'inventory' as const, label: 'Consultar Stock', icon: Package, desc: 'Disponibilidad para ventas' },
            { id: 'contacts' as const, label: 'Cartera de Clientes', icon: Users, desc: 'Búsqueda por DNI/RUC' }
          ]
        }
      ];
    }

    // Default Collaborator (Ventas / Comercial)
    return [
      {
        title: 'GESTIÓN COMERCIAL',
        items: [
          { id: 'dashboard' as const, label: 'Panel Comercial', icon: BarChart3, desc: 'Metas y ventas del día' },
          { id: 'sales' as const, label: 'Ventas & Facturas', icon: ShoppingCart, desc: 'Registro de ventas y cobranzas' },
          { 
            id: 'quotes' as const, 
            label: 'Mis Cotizaciones', 
            icon: FileSpreadsheet,
            desc: 'Cotizaciones a clientes',
            badge: pendingQuotesCount > 0 ? pendingQuotesCount : undefined,
            badgeColor: 'bg-amber-500 text-white'
          }
        ]
      },
      {
        title: 'CONSULTAS & CLIENTES',
        items: [
          { id: 'inventory' as const, label: 'Catálogo de Stock', icon: Package, desc: 'Precios de venta y unidades' },
          { id: 'contacts' as const, label: 'Directorio de Clientes', icon: Users, desc: 'Gestión de cuentas RUC/DNI' }
        ]
      }
    ];
  };

  const navGroups = getNavGroups();

  const brandName = 'PHANTOM';
  const brandInitials = 'PH';

  const userInitials = currentUser?.name
    ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'US';

  const getRoleBadgeInfo = () => {
    switch (role) {
      case 'admin':
        return { label: 'ADMINISTRADOR', bg: 'bg-indigo-900/80 text-indigo-300 border-indigo-700/60', desc: 'Acceso Total a Finanzas, MySQL y Usuarios' };
      case 'warehouse':
        return { label: 'ALMACÉN & KARDEX', bg: 'bg-amber-900/80 text-amber-300 border-amber-700/60', desc: 'Control de Stock, Entradas y Despachos' };
      case 'cashier':
        return { label: 'CAJA & POS', bg: 'bg-blue-900/80 text-blue-300 border-blue-700/60', desc: 'Emisión de Comprobantes y Cobros' };
      default:
        return { label: 'ASESOR COMERCIAL', bg: 'bg-emerald-900/80 text-emerald-300 border-emerald-700/60', desc: 'Ventas, Cotizaciones y Cartera' };
    }
  };

  const roleInfo = getRoleBadgeInfo();

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-72 bg-[linear-gradient(180deg,#0b1220_0%,#111827_38%,#0f172a_100%)] text-slate-200 flex-col border-r border-violet-500/20 shrink-0 h-full select-none z-30 justify-between shadow-[8px_0_30px_rgba(76,29,149,0.24)]">
        
        {/* Top Part */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Brand Header */}
          <div className="p-4 flex items-center gap-3 border-b border-slate-700/80 bg-gradient-to-r from-slate-900 to-violet-950/70">
            <div className="w-28 h-12 rounded-xl overflow-hidden border border-violet-400/20 bg-black flex items-center justify-center shadow-md shadow-violet-900/30">
              <img src="/phantom-logo.svg" alt="PHANTOM logo" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <span className="text-white font-black tracking-tight uppercase text-[10px] truncate block">
                {brandName}
              </span>
              <span className="text-[10px] text-cyan-700 font-medium block">
                Soles (S/.) • IGV 18%
              </span>
            </div>
          </div>

          {/* User Role Card in Sidebar - Didactic Component */}
          <div className="mx-3 mt-3 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/70">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ROL ASIGNADO</span>
              <span className={`text-[9px] px-2 py-0.5 font-bold rounded-full border ${roleInfo.bg}`}>
                {roleInfo.label}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-tight flex items-center gap-1">
              <Info className="w-3 h-3 text-indigo-400 shrink-0" />
              <span>{roleInfo.desc}</span>
            </p>
          </div>

          {/* Navigation Section */}
          <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-1.5">
                  {group.title}
                </div>
                {group.items.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`sidebar-nav-${item.id}`}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all text-left cursor-pointer group border ${
                        isActive
                          ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white font-bold shadow-lg shadow-teal-500/20 border-teal-300/50'
                          : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium border-transparent'
                      }`}
                      title={item.desc}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-900'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded-full ${item.badgeColor || 'bg-indigo-100 text-indigo-700'}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </div>

        {/* User Session & Actions at Bottom */}
        <div className="p-3 bg-slate-50/90 border-t border-slate-200/80 space-y-2">
          {currentUser && (
            <div className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-xs ${
                  role === 'admin' ? 'bg-teal-600' :
                  role === 'collaborator' ? 'bg-emerald-600' :
                  role === 'warehouse' ? 'bg-amber-600' :
                  'bg-sky-600'
                }`}>
                  {userInitials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800 truncate block">
                      {currentUser.name.split(' ')[0]}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 truncate block">
                    @{currentUser.username}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {isAdmin && onOpenUsersModal && (
                  <button
                    onClick={onOpenUsersModal}
                    id="btn-sidebar-users-manage"
                    className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Administrar Usuarios & Roles"
                  >
                    <UserCog className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onLogout}
                  id="btn-sidebar-logout"
                  className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] text-slate-500 px-1 pt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span>Sistema ERP Activo</span>
            </div>
            <span className="font-mono text-[9px] text-slate-400">v2.5 Pro</span>
          </div>
        </div>

      </aside>

      {/* Mobile Off-Canvas Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs transition-opacity" 
            onClick={() => setMobileMenuOpen(false)} 
          />
          <aside className="relative w-64 max-w-[80vw] bg-[#1e293b] text-slate-300 flex flex-col border-r border-slate-700 z-50 h-full justify-between">
            <div>
              <div className="p-4 flex items-center justify-between border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-20 h-9 rounded-lg overflow-hidden bg-black border border-slate-700 flex items-center justify-center">
                    <img src="/phantom-logo.svg" alt="PHANTOM logo" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-white font-black uppercase text-[10px] truncate">
                    {brandName}
                  </span>
                </div>
                <button 
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3">
                <span className={`text-[9px] px-2 py-0.5 font-bold rounded-full border ${roleInfo.bg}`}>
                  {roleInfo.label}
                </span>
              </div>

              <nav className="p-3 space-y-3 overflow-y-auto">
                {navGroups.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-1">
                      {group.title}
                    </div>
                    {group.items.map(item => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            setActiveTab(item.id);
                            setMobileMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs cursor-pointer ${
                            isActive
                              ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </div>
                          {item.badge !== undefined && (
                            <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded-full ${item.badgeColor || 'bg-indigo-500 text-white'}`}>
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </nav>
            </div>

            {/* Mobile Footer User */}
            {currentUser && (
              <div className="p-3 bg-slate-900 border-t border-slate-700/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white text-xs font-bold">
                      {userInitials}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{currentUser.name}</div>
                      <div className="text-[10px] text-slate-400">{currentUser.roleLabel || currentUser.role}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      onLogout();
                    }}
                    className="p-1.5 text-rose-400 hover:bg-slate-800 rounded cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}
    </>
  );
};

export interface TopBarProps {
  onOpenMobileMenu: () => void;
  onOpenNewQuoteModal: () => void;
  onOpenPosModal: () => void;
  lowStockCount?: number;
  outOfStockCount?: number;
  onNavigateToInventory: () => void;
  globalSearch?: string;
  onGlobalSearchChange?: (val: string) => void;
  currentUser: User | null;
  onLogout: () => void;
  onOpenUsersModal?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  onOpenMobileMenu,
  onOpenNewQuoteModal,
  onOpenPosModal,
  lowStockCount = 0,
  outOfStockCount = 0,
  onNavigateToInventory,
  globalSearch = '',
  onGlobalSearchChange,
  currentUser,
  onLogout,
  onOpenUsersModal
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isAdmin = currentUser?.role === 'admin';
  const isWarehouse = currentUser?.role === 'warehouse';

  const userInitials = currentUser?.name
    ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'US';

  return (
    <header className="h-16 bg-[linear-gradient(90deg,#0f172a_0%,#111827_35%,#1e1b4b_100%)] backdrop-blur-md border-b border-violet-500/20 px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 shadow-[0_12px_28px_rgba(76,29,149,0.2)] z-20">
      
      {/* Left: Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onOpenMobileMenu}
          className="lg:hidden p-1.5 rounded-lg border border-slate-200/70 text-white hover:bg-white/10 cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

      </div>

      {/* Right: Quick Action CTAs, Stock Alert & User Session */}
      <div className="flex items-center gap-2 sm:gap-3">
        
        {/* Low Stock Badge Button */}
        {(lowStockCount > 0 || outOfStockCount > 0) && (
          <button
            id="btn-top-low-stock-alert"
            onClick={onNavigateToInventory}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-800 border border-amber-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-sm"
            title={`${lowStockCount} productos con stock bajo, ${outOfStockCount} agotados`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>{lowStockCount + outOfStockCount} Alertas</span>
          </button>
        )}

        {/* Quick Quote Button (Sales / Admin) */}
        {!isWarehouse && (
          <button
            id="btn-top-new-quote"
            onClick={onOpenNewQuoteModal}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[linear-gradient(135deg,#f1f5f9,#e2e8f0)] hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors border border-slate-200 cursor-pointer shadow-sm hover:shadow-md"
          >
            <Plus className="w-3.5 h-3.5 text-slate-600" />
            <span>Cotizar</span>
          </button>
        )}

        {/* Quick Sale Button */}
        {!isWarehouse && (
          <button
            id="btn-top-new-sale"
            onClick={onOpenPosModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-500/25 hover:shadow-xl cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Nueva Venta</span>
          </button>
        )}

        {/* User Session Dropdown */}
        {currentUser && (
          <div className="relative pl-2 border-l border-white/20">
            <button
              id="btn-user-session-menu"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-md ${
                currentUser.role === 'admin' ? 'bg-indigo-500' :
                currentUser.role === 'collaborator' ? 'bg-emerald-500' :
                currentUser.role === 'warehouse' ? 'bg-amber-500' :
                'bg-sky-500'
              }`}>
                {userInitials}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-white leading-none">
                    {currentUser.name.split(' ')[0]}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-full font-bold uppercase ${
                    currentUser.role === 'admin' ? 'bg-indigo-100 text-indigo-700' : 
                    currentUser.role === 'warehouse' ? 'bg-amber-100 text-amber-800' :
                    'bg-emerald-100 text-emerald-700'
                  }`}>
                    {currentUser.roleLabel || currentUser.role}
                  </span>
                </div>
                <span className="text-[10px] text-slate-200 leading-tight">
                  @{currentUser.username}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-white/80" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setDropdownOpen(false)} 
                />
                <div className="absolute right-0 mt-2 w-60 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 z-40 text-slate-800 text-xs">
                  <div className="px-3.5 py-2.5 border-b border-slate-100">
                    <div className="font-bold text-slate-900">{currentUser.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{currentUser.email}</div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        {currentUser.roleLabel || currentUser.role}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Conectado
                      </span>
                    </div>
                  </div>

                  {isAdmin && onOpenUsersModal && (
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        onOpenUsersModal();
                      }}
                      className="w-full px-3.5 py-2 text-left hover:bg-slate-50 flex items-center gap-2 text-slate-700 cursor-pointer"
                    >
                      <UserCog className="w-4 h-4 text-indigo-600" />
                      <span>Gestionar Usuarios & Roles</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-rose-50 flex items-center gap-2 text-rose-600 font-semibold cursor-pointer border-t border-slate-100"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </>
            )}
          </div>
        )}

      </div>

    </header>
  );
};

// Backwards compatibility
export const Header = Sidebar;


