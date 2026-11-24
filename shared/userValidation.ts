export const USER_ROLES = ['admin', 'collaborator', 'warehouse', 'cashier'] as const;
export const PERMISSION_KEYS = [
  'canViewDashboard', 'canManageInventory', 'canViewCosts', 'canManageQuotes',
  'canManageSales', 'canManageContacts', 'canManageSettings', 'canManageUsers', 'canDeleteRecords'
] as const;
export const ROLE_LABELS = {
  admin: 'Administrador', collaborator: 'Ejecutivo Comercial', warehouse: 'Jefe de Almacén', cashier: 'Caja & Facturación'
};

export function passwordValidationError(value: unknown): string | undefined {
  if (typeof value !== 'string' || value.length < 12 || value.length > 128 ||
      !/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/[0-9]/.test(value)) {
    return 'La contraseña debe tener entre 12 y 128 caracteres, mayúsculas, minúsculas y números';
  }
}

export function userValidationError(input: Record<string, unknown>, creating: boolean): string | undefined {
  for (const key of ['username', 'name', 'email'] as const) {
    if ((creating || key in input) && (typeof input[key] !== 'string' || !(input[key] as string).trim() || (input[key] as string).length > 254)) {
      return 'Nombre, usuario y correo son obligatorios y deben tener como máximo 254 caracteres';
    }
  }
  if ('username' in input && !/^[a-zA-Z0-9._@+-]{3,254}$/.test(String(input.username).trim())) return 'Nombre de usuario inválido';
  if ('email' in input && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(input.email).trim())) return 'Correo electrónico inválido';
  if (creating || 'password' in input) {
    const error = passwordValidationError(input.password);
    if (error) return error;
  }
  if ((creating || 'role' in input) && !USER_ROLES.includes(input.role as typeof USER_ROLES[number])) return 'Rol no permitido';
  if ('status' in input && input.status !== 'active' && input.status !== 'inactive') return 'Estado no permitido';
  if ('avatarColor' in input && (typeof input.avatarColor !== 'string' || !/^[a-z]{1,24}$/.test(input.avatarColor))) return 'Color inválido';
  if ('permissions' in input) {
    const permissions = input.permissions;
    if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions) ||
        Object.keys(permissions).length !== PERMISSION_KEYS.length ||
        PERMISSION_KEYS.some(key => typeof (permissions as Record<string, unknown>)[key] !== 'boolean') ||
        Object.keys(permissions).some(key => !PERMISSION_KEYS.includes(key as typeof PERMISSION_KEYS[number]))) return 'Permisos inválidos';
  }
}
