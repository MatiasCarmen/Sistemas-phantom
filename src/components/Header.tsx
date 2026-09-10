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
  Info,
  Sun,
  Moon
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
  theme?: 'dark' | 'light';
  toggleTheme?: () => void;
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
  onOpenUsersModal,
  theme = 'dark',
  toggleTheme
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
              badgeColor: 'bg-[rgba(200,16,46,0.14)] text-[#FFDAD8] border border-[#C8102E]' 
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
              badgeColor: 'bg-[rgba(245,158,11,0.14)] text-[#FDE68A] border border-[#F59E0B]'
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
              badgeColor: 'bg-[rgba(200,16,46,0.14)] text-[#FFDAD8] border border-[#C8102E]' 
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
              badgeColor: 'bg-[rgba(245,158,11,0.14)] text-[#FDE68A] border border-[#F59E0B]'
            }
          ]
        },
        {
          title: 'CONSULTAS',
          items: [
            { id: 'inventory' as const, label: 'Consulta de Precios', icon: Package, desc: 'Existencias y catálogo' },
            { id: 'contacts' as const, label: 'Directorio de Clientes', icon: Users, desc: 'Clientes registrados' }
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
            badgeColor: 'bg-[rgba(245,158,11,0.14)] text-[#FDE68A] border border-[#F59E0B]'
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

  const brandName = 'PHANTOM LOGISTICS';
  const brandInitials = 'PH';

  const userInitials = currentUser?.name
    ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'US';

  const getRoleBadgeInfo = () => {
    switch (role) {
      case 'admin':
        return { label: 'ADMINISTRADOR', bg: 'bg-[#8A091E]/60 text-[#FFDAD8] border-[#C8102E]/60', desc: 'Acceso Total a Finanzas, MySQL y Usuarios' };
      case 'warehouse':
        return { label: 'ALMACÉN & KARDEX', bg: 'bg-[#78350F]/60 text-[#FDE68A] border-[#F59E0B]/60', desc: 'Control de Stock, Entradas y Despachos' };
      case 'cashier':
        return { label: 'CAJA & POS', bg: 'bg-[#1E3A8A]/60 text-[#DBEAFE] border-[#3B82F6]/60', desc: 'Emisión de Comprobantes y Cobros' };
      default:
        return { label: 'ASESOR COMERCIAL', bg: 'bg-[#064E3B]/60 text-[#A7F3D0] border-[#10B981]/60', desc: 'Ventas, Cotizaciones y Cartera' };
    }
  };

  const roleInfo = getRoleBadgeInfo();

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden lg:flex w-72 bg-[#0E0E0E] text-white flex-col border-r border-[#2D2D2D] shrink-0 h-full select-none z-30 justify-between">
        
        {/* Top Part */}
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Brand Header */}
          <div className="p-4 flex items-center gap-3 border-b border-[#2D2D2D] bg-[#141414]">
            <div className="w-28 h-11 rounded overflow-hidden border border-[#2D2D2D] bg-black flex items-center justify-center">
              <img src="/phantom-logo.svg" alt="PHANTOM logo" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <span className="text-white font-bold tracking-tight uppercase text-[11px] truncate block">
                {brandName}
              </span>
              <span className="text-[10px] text-[#9CA3AF] font-medium block">
                Soles (S/.) • IGV 18%
              </span>
            </div>
          </div>

          {/* User Role Card in Sidebar */}
          <div className="mx-3 mt-3 p-2.5 rounded bg-[#141414] border border-[#2D2D2D]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider font-mono">ROL ASIGNADO</span>
              <span className={`text-[9px] px-2 py-0.5 font-bold rounded border ${roleInfo.bg}`}>
                {roleInfo.label}
              </span>
            </div>
            <p className="text-[10px] text-[#D1D5DB] mt-1.5 leading-tight flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#C8102E] shrink-0" />
              <span>{roleInfo.desc}</span>
            </p>
          </div>

          {/* Navigation Section */}
          <nav className="flex-1 p-3 space-y-4 overflow-y-auto">
            {navGroups.map((group, gIdx) => (
              <div key={gIdx} className="space-y-1">
                <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest px-3 mb-1.5 font-mono">
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
                      className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs transition-colors text-left cursor-pointer group border ${
                        isActive
                          ? 'bg-[#C8102E] text-white font-bold border-[#A80C25]'
                          : 'text-[#D1D5DB] hover:bg-[#1E1E1E] hover:text-white font-medium border-transparent'
                      }`}
                      title={item.desc}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-[#9CA3AF] group-hover:text-white'}`} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${item.badgeColor || 'bg-[#1E1E1E] text-white border border-[#2D2D2D]'}`}>
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
        <div className="p-3 bg-[#0E0E0E] border-t border-[#2D2D2D] space-y-2">
          {currentUser && (
            <div className="p-2.5 rounded bg-[#141414] border border-[#2D2D2D] flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded bg-[#C8102E] flex items-center justify-center font-bold text-xs text-white shrink-0 font-mono">
                  {userInitials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-white truncate block">
                      {currentUser.name.split(' ')[0]}
                    </span>
                  </div>
                  <span className="text-[10px] text-[#9CA3AF] truncate block font-mono">
                    @{currentUser.username}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {isAdmin && onOpenUsersModal && (
                  <button
                    onClick={onOpenUsersModal}
                    id="btn-sidebar-users-manage"
                    className="p-1.5 text-[#9CA3AF] hover:text-white hover:bg-[#1E1E1E] rounded transition-colors cursor-pointer"
                    title="Administrar Usuarios & Roles"
                  >
                    <UserCog className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onLogout}
                  id="btn-sidebar-logout"
                  className="p-1.5 text-[#9CA3AF] hover:text-[#C8102E] hover:bg-[#1E1E1E] rounded transition-colors cursor-pointer"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] text-[#9CA3AF] px-1 pt-1">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse"></div>
              <span>WMS Industrial Activo</span>
            </div>
            <span className="font-mono text-[9px] text-[#9CA3AF]">v2.5 Pro</span>
          </div>
        </div>

      </aside>

      {/* Mobile Off-Canvas Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div 
            className="fixed inset-0 bg-black/80 backdrop-blur-xs transition-opacity" 
            onClick={() => setMobileMenuOpen(false)} 
          />
          <aside className="relative w-64 max-w-[80vw] bg-[#0E0E0E] text-white flex flex-col border-r border-[#2D2D2D] z-50 h-full justify-between">
            <div>
              <div className="p-4 flex items-center justify-between border-b border-[#2D2D2D] bg-[#141414]">
                <div className="flex items-center gap-3">
                  <div className="w-20 h-9 rounded overflow-hidden bg-black border border-[#2D2D2D] flex items-center justify-center">
                    <img src="/phantom-logo.svg" alt="PHANTOM logo" className="w-full h-full object-cover" />
                  </div>
                  <span className="text-white font-bold uppercase text-[10px] truncate">
                    {brandName}
                  </span>
                </div>
                <button 
                  onClick={() => setMobileMenuOpen(false)} 
                  className="p-1 rounded text-[#9CA3AF] hover:text-white cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3">
                <span className={`text-[9px] px-2 py-0.5 font-bold rounded border ${roleInfo.bg}`}>
                  {roleInfo.label}
                </span>
              </div>

              <nav className="p-3 space-y-3 overflow-y-auto">
                {navGroups.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-1">
                    <div className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-widest px-3 mb-1 font-mono">
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
                          className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs cursor-pointer ${
                            isActive
                              ? 'bg-[#C8102E] text-white font-bold'
                              : 'text-[#D1D5DB] hover:bg-[#1E1E1E] hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </div>
                          {item.badge !== undefined && (
                            <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${item.badgeColor || 'bg-[#1E1E1E] text-white border border-[#2D2D2D]'}`}>
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
              <div className="p-3 bg-[#141414] border-t border-[#2D2D2D]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded bg-[#C8102E] flex items-center justify-center text-white text-xs font-bold font-mono">
                      {userInitials}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{currentUser.name}</div>
                      <div className="text-[10px] text-[#9CA3AF] font-mono">{currentUser.roleLabel || currentUser.role}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {toggleTheme && (
                      <button
                        id="btn-mobile-toggle-theme"
                        onClick={toggleTheme}
                        className="p-1.5 text-[#9CA3AF] hover:text-white hover:bg-[#1E1E1E] rounded cursor-pointer"
                        title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
                      >
                        {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-blue-500" />}
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        onLogout();
                      }}
                      className="p-1.5 text-[#9CA3AF] hover:text-[#C8102E] hover:bg-[#1E1E1E] rounded cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
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
  theme?: 'dark' | 'light';
  toggleTheme?: () => void;
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
  onOpenUsersModal,
  theme = 'dark',
  toggleTheme
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isAdmin = currentUser?.role === 'admin';
  const isWarehouse = currentUser?.role === 'warehouse';

  const userInitials = currentUser?.name
    ? currentUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'US';

  return (
    <header className="h-16 bg-[#141414] border-b border-[#2D2D2D] px-4 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 z-20">
      
      {/* Left: Mobile Toggle */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onOpenMobileMenu}
          className="lg:hidden p-1.5 rounded border border-[#2D2D2D] text-white hover:bg-[#1E1E1E] cursor-pointer"
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
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-[rgba(245,158,11,0.14)] hover:bg-[rgba(245,158,11,0.22)] text-[#FDE68A] border border-[#F59E0B] rounded text-xs font-semibold transition-colors cursor-pointer"
            title={`${lowStockCount} productos con stock bajo, ${outOfStockCount} agotados`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" />
            <span>{lowStockCount + outOfStockCount} Alertas Stock</span>
          </button>
        )}

        {/* Quick Quote Button (Sales / Admin) */}
        {!isWarehouse && (
          <button
            id="btn-top-new-quote"
            onClick={onOpenNewQuoteModal}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#1E1E1E] hover:bg-[#2D2D2D] text-white rounded text-xs font-bold transition-colors border border-[#2D2D2D] cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#9CA3AF]" />
            <span>Cotizar</span>
          </button>
        )}

        {/* Quick Sale Button */}
        {!isWarehouse && (
          <button
            id="btn-top-new-sale"
            onClick={onOpenPosModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#C8102E] hover:bg-[#A80C25] text-white rounded text-xs font-bold transition-colors cursor-pointer"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Nueva Venta</span>
          </button>
        )}

        {/* Theme Toggle Button */}
        {toggleTheme && (
          <button
            id="btn-toggle-theme"
            onClick={toggleTheme}
            className="p-2 rounded bg-[#1E1E1E] hover:bg-[#2D2D2D] text-zinc-300 hover:text-white border border-[#2D2D2D] transition-colors cursor-pointer flex items-center justify-center"
            title={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
            aria-label={theme === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-blue-600" />
            )}
          </button>
        )}

        {/* User Session Dropdown */}
        {currentUser && (
          <div className="relative pl-2 border-l border-[#2D2D2D]">
            <button
              id="btn-user-session-menu"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2 p-1 rounded hover:bg-[#1E1E1E] transition-colors cursor-pointer"
            >
              <div className="w-8 h-8 rounded bg-[#C8102E] flex items-center justify-center font-bold text-xs text-white font-mono">
                {userInitials}
              </div>
              <div className="hidden md:flex flex-col text-left">
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-white leading-none">
                    {currentUser.name.split(' ')[0]}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase border ${
                    currentUser.role === 'admin' ? 'bg-[#8A091E]/60 text-[#FFDAD8] border-[#C8102E]/60' : 
                    currentUser.role === 'warehouse' ? 'bg-[#78350F]/60 text-[#FDE68A] border-[#F59E0B]/60' :
                    'bg-[#064E3B]/60 text-[#A7F3D0] border-[#10B981]/60'
                  }`}>
                    {currentUser.roleLabel || currentUser.role}
                  </span>
                </div>
                <span className="text-[10px] text-[#9CA3AF] leading-tight font-mono">
                  @{currentUser.username}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" />
            </button>

            {/* Dropdown Menu */}
            {dropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-30" 
                  onClick={() => setDropdownOpen(false)} 
                />
                <div className="absolute right-0 mt-2 w-60 bg-[#141414] border border-[#2D2D2D] rounded shadow-xl py-2 z-40 text-white text-xs">
                  <div className="px-3.5 py-2.5 border-b border-[#2D2D2D]">
                    <div className="font-bold text-white">{currentUser.name}</div>
                    <div className="text-[11px] text-[#9CA3AF] truncate font-mono">{currentUser.email}</div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-[#1E1E1E] text-white border border-[#2D2D2D]">
                        {currentUser.roleLabel || currentUser.role}
                      </span>
                      <span className="text-[10px] text-[#10B981] font-semibold flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
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
                      className="w-full px-3.5 py-2 text-left hover:bg-[#1E1E1E] flex items-center gap-2 text-[#D1D5DB] hover:text-white cursor-pointer"
                    >
                      <UserCog className="w-4 h-4 text-[#C8102E]" />
                      <span>Gestionar Usuarios & Roles</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onLogout();
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-[#410006]/40 flex items-center gap-2 text-[#FFDAD8] font-semibold cursor-pointer border-t border-[#2D2D2D]"
                  >
                    <LogOut className="w-4 h-4 text-[#C8102E]" />
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


