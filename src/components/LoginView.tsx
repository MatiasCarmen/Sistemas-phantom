import React, { useState } from 'react';
import { 
  ShieldCheck, 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertCircle,
  Building2
} from 'lucide-react';
import { User as UserType } from '../types';
import { api } from '../lib/api';

interface LoginViewProps {
  onLoginSuccess: (user: UserType, token: string) => void;
  companyName?: string;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  companyName = 'NEXUS TECH & INDUSTRIAL S.A.C.'
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!identifier.trim()) {
      setErrorMessage('Por favor ingrese su usuario o correo electrónico');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await api.login({
        username: identifier.trim(),
        password: password
      });

      if (response.success && response.user) {
        localStorage.setItem('nexus_auth_token', response.token);
        localStorage.setItem('nexus_auth_user', JSON.stringify(response.user));
        onLoginSuccess(response.user, response.token);
      } else {
        setErrorMessage(response.message || 'Error al iniciar sesión');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Credenciales no válidas. Verifique su usuario y contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[radial-gradient(circle_at_top_left,_rgba(57,199,181,0.18),transparent_18%),radial-gradient(circle_at_bottom_right,_rgba(94,183,255,0.16),transparent_22%),linear-gradient(180deg,#f5fbff_0%,#edf7ff_100%)] text-slate-800 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans relative overflow-hidden">
      
      {/* Background glow effects */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-200/50 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-sky-200/50 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 relative z-10">
        
        {/* Left / Top Side: Login Form Card */}
        <div className="lg:col-span-6 bg-white/90 border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-[0_18px_45px_rgba(148,163,184,0.18)] flex flex-col justify-between backdrop-blur-sm">
          
          <div>
            {/* Header Brand */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center text-white shadow-md shadow-teal-700/30">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-800 tracking-wide uppercase">
                  NEXUS ERP & INVENTARIO
                </h1>
                <p className="text-[11px] text-slate-500 font-medium">
                  {companyName}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <h2 className="text-xl font-bold text-slate-800">
                Iniciar Sesión
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Ingrese sus credenciales corporativas para acceder al sistema.
              </p>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="mb-4 p-3 bg-rose-950/50 border border-rose-800/80 rounded-lg flex items-start gap-2.5 text-xs text-rose-300">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Usuario o Correo Electrónico
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    id="input-login-username"
                    required
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="Ej. admin o carlos"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Contraseña
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="input-login-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-1" />

              <button
                type="submit"
                id="btn-submit-login"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-500 hover:to-cyan-500 active:from-teal-700 active:to-cyan-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-all shadow-md shadow-teal-600/30 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Ingresar al Sistema</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="pt-6 mt-6 border-t border-slate-700/60 text-center">
            <p className="text-[11px] text-slate-500">
              Nexus ERP v2.4 • Base de Datos Local y Servidor Express
            </p>
          </div>

        </div>


      </div>

    </div>
  );
};
