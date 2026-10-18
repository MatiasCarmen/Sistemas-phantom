import React, { useState } from 'react';
import { User as UserType } from '../types';
import { api } from '../lib/api';

interface LoginViewProps {
  onLoginSuccess: (user: UserType, token: string) => void;
  companyName?: string;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  companyName = 'PHANTOM Gaming'
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [recoveryMethod, setRecoveryMethod] = useState<'email' | 'sms'>('email');

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
    <div className="min-h-full flex flex-col bg-[#0B0B0B] text-[#e5e2e1] justify-between" style={{ fontFamily: 'Geist, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      <header className="w-full border-b border-[#2D2D2D] bg-[#0E0E0E] px-6 py-3.5 flex items-center justify-between z-20">
        <div className="flex items-center gap-4">
          <div className="flex items-baseline gap-2.5">
            <span className="text-2xl text-white tracking-tighter uppercase select-none font-black" style={{ letterSpacing: '-0.04em' }}>PHANTOM</span>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 lg:p-8">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 bg-[#141414] rounded-md border border-[#2D2D2D] shadow-2xl overflow-hidden min-h-[640px]">
          <section aria-labelledby="form-header" className="lg:col-span-6 p-8 sm:p-10 lg:p-12 flex flex-col justify-between">
            <div>
              <div className="mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white" id="form-header">
                  Portal de Operaciones
                </h1>
                <p className="mt-2 text-sm text-[#A1A1AA] leading-relaxed">
                  Acceso centralizado para gestión de inventarios, recepción, cross-docking y distribución de Phantom Oficial.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  className="w-full flex items-center justify-center gap-3 bg-[#1E1E1E] hover:bg-[#2D2D2D] border border-[#2D2D2D] hover:border-[#3D3D3D] text-white font-medium text-sm py-2.5 px-4 rounded transition duration-150"
                  type="button"
                >
                  <svg aria-hidden="true" className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                  </svg>
                  <span>Continuar con Google Workspace</span>
                </button>
              </div>

              <div className="relative my-6">
                <div aria-hidden="true" className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#2D2D2D]"></div>
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#141414] px-3 text-[#71717A] font-mono font-medium">o continuar con credenciales corporativas</span>
                </div>
              </div>

              {errorMessage && (
                <div className="mb-4 p-3 bg-[#C8102E]/15 border border-[#C8102E]/40 rounded flex items-start gap-2.5 text-xs text-[#ffb3b1]">
                  <svg className="w-4 h-4 shrink-0 mt-0.5 text-[#C8102E]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="leading-relaxed">{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#c8c6c6] mb-1.5" htmlFor="corporate-id">
                    Usuario o Correo Corporativo
                  </label>
                  <div className="relative">
                    <input
                      className="w-full bg-[#0E0E0E] border border-[#2D2D2D] rounded px-3.5 py-2.5 text-sm text-white placeholder-[#71717A] transition-colors focus:outline-none focus:border-[#C8102E]"
                      id="corporate-id"
                      name="corporate-id"
                      placeholder="ej. jperez@phantom.com.pe o CÓDIGO EMPLEADO"
                      required
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-[#c8c6c6]" htmlFor="corporate-password">
                      Contraseña
                    </label>
                    <button
                      type="button"
                      className="text-xs text-[#A1A1AA] hover:text-[#ffb3b1] transition-colors duration-150"
                      onClick={() => { setShowForgotModal(true); setForgotSent(false); setForgotEmail(''); }}
                    >
                      ¿Olvidaste tu contraseña?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      className="w-full bg-[#0E0E0E] border border-[#2D2D2D] rounded px-3.5 py-2.5 text-sm text-white placeholder-[#71717A] transition-colors pr-10 focus:outline-none focus:border-[#C8102E]"
                      id="corporate-password"
                      name="corporate-password"
                      placeholder="••••••••••••"
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      aria-label="Alternar visibilidad de contraseña"
                      className="absolute inset-y-0 right-0 flex items-center pr-3 text-[#71717A] hover:text-white focus:outline-none"
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div className="flex items-center pt-1">
                  <input
                    className="h-4 w-4 rounded bg-[#0E0E0E] border-[#2D2D2D] text-[#C8102E] focus:ring-[#C8102E] focus:ring-offset-0 focus:ring-offset-[#141414]"
                    id="remember-device"
                    name="remember-device"
                    type="checkbox"
                  />
                  <label className="ml-2.5 block text-xs text-[#A1A1AA] select-none cursor-pointer" htmlFor="remember-device">
                    Recordar este dispositivo seguro por 30 días
                  </label>
                </div>

                <div className="pt-2">
                  <button
                    className="w-full bg-[#C8102E] hover:bg-[#A80C25] text-white font-semibold text-sm py-2.5 px-4 rounded transition duration-150 ease-in-out shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#141414] focus:ring-[#C8102E] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Iniciar Sesión'
                    )}
                  </button>
                </div>
              </form>
            </div>

            <div className="pt-8 mt-6 border-t border-[#2D2D2D] text-[11px] text-[#71717A] leading-relaxed">
              <p>
                Sistema exclusivo para uso laboral y operativo de Phantom. Toda interacción queda registrada y auditada de acuerdo al manual interno de TI y seguridad de la información.
              </p>
            </div>
          </section>

          <section aria-label="Instalaciones Logísticas Phantom" className="hidden lg:block lg:col-span-6 relative bg-neutral-900 border-l border-[#2D2D2D]">
            <img
              alt="Operador de almacén de Phantom realizando inventario de productos gaming y consolas"
              className="absolute inset-0 w-full h-full object-cover object-center grayscale-[20%] contrast-105"
              src="/assets/Login%20phantom.jpg"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-transparent"></div>
          </section>
        </div>
      </main>

      <footer className="w-full border-t border-[#2D2D2D] bg-[#0E0E0E] px-6 py-4 text-xs text-[#71717A]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span>© 2026 Phantom Oficial. Todos los derechos reservados.</span>
          </div>
          <nav aria-label="Enlaces de soporte y legales" className="flex flex-wrap items-center gap-6">
            <a className="hover:text-white transition-colors duration-150" href="#politicas">Políticas de Seguridad</a>
            <a className="hover:text-white transition-colors duration-150" href="#terminos">Términos de Servicio</a>
            <a className="hover:text-white transition-colors duration-150" href="#soporte">Mesa de Ayuda TI Almacén</a>
          </nav>
          <div className="flex items-center gap-1.5 text-[11px] text-[#71717A]">
            <svg className="w-3.5 h-3.5 text-[#71717A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>Acceso protegido con cifrado TLS 256-bit</span>
          </div>
        </div>
      </footer>

      {showForgotModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowForgotModal(false); }}
        >
          <div className="w-full max-w-5xl bg-[#141414] border border-[#2D2D2D] rounded-md shadow-2xl overflow-hidden relative">
            <button
              type="button"
              className="absolute top-4 right-4 z-20 text-[#71717A] hover:text-white transition-colors bg-[#1E1E1E] border border-[#2D2D2D] rounded-full p-1.5"
              onClick={() => setShowForgotModal(false)}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[520px]">
              <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-between bg-[#141414] border-b lg:border-b-0 lg:border-r border-[#2D2D2D]">
                <div>
                  <button
                    type="button"
                    className="inline-flex items-center text-xs font-semibold text-[#A1A1AA] hover:text-white transition-colors duration-150 mb-6 group"
                    onClick={() => setShowForgotModal(false)}
                  >
                    <svg className="w-4 h-4 mr-1.5 transform group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                    </svg>
                    Volver al inicio de sesión
                  </button>

                  <div className="mb-4">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-[#C8102E]/40 bg-[#C8102E]/15 text-[10px] font-bold tracking-widest text-[#ffb3b1] uppercase mb-3 font-mono">
                      <svg className="w-3 h-3 text-[#C8102E]" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clipRule="evenodd" />
                      </svg>
                      Seguridad y Control de Acceso
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
                      Recuperar Acceso Corporativo
                    </h2>
                    <p className="mt-2 text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
                      Ingresa tu correo institucional o código de colaborador para recibir un enlace seguro de restablecimiento o código de verificación temporal.
                    </p>
                  </div>

                  {!forgotSent ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (forgotEmail.trim()) setForgotSent(true);
                      }}
                      className="space-y-5"
                    >
                      <div>
                        <label className="block text-[11px] font-semibold tracking-wider text-[#c8c6c6] uppercase mb-1.5" htmlFor="recovery-identity">
                          Correo Corporativo o Código de Empleado
                        </label>
                        <div className="relative rounded">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#71717A]">
                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                            </svg>
                          </div>
                          <input
                            className="block w-full rounded border border-[#2D2D2D] bg-[#0E0E0E] py-2.5 pl-10 pr-3 text-xs sm:text-sm text-white placeholder-[#71717A] focus:border-[#C8102E] focus:outline-none transition-colors"
                            id="recovery-identity"
                            placeholder="ej.@phantom.com.pe o EMP-****"
                            required
                            type="text"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold tracking-wider text-[#c8c6c6] uppercase mb-2">
                          Canal de Verificación Preferido
                        </label>
                        <div className="space-y-2">
                          <label className="relative flex items-start p-3 rounded border border-[#2D2D2D] bg-[#0E0E0E] hover:bg-[#1E1E1E] cursor-pointer transition-colors group">
                            <div className="flex items-center h-5">
                              <input
                                checked={recoveryMethod === 'email'}
                                className="h-4 w-4 text-[#C8102E] focus:ring-[#C8102E] focus:ring-offset-0 border-[#2D2D2D] bg-[#141414]"
                                name="recovery-method"
                                type="radio"
                                onChange={() => setRecoveryMethod('email')}
                              />
                            </div>
                            <div className="ml-3 text-xs">
                              <div className="font-medium text-[#e5e2e1] group-hover:text-white flex items-center gap-1.5">
                                <span>Enlace al correo corporativo</span>
                                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-1.5 py-0.2 rounded font-mono">Recomendado</span>
                              </div>
                              <p className="text-[#71717A] text-[11px] mt-0.5">Sincronizado con Microsoft 365 / Google Workspace corporativo.</p>
                            </div>
                          </label>

                          <label className="relative flex items-start p-3 rounded border border-[#2D2D2D] bg-[#0E0E0E] hover:bg-[#1E1E1E] cursor-pointer transition-colors group">
                            <div className="flex items-center h-5">
                              <input
                                checked={recoveryMethod === 'sms'}
                                className="h-4 w-4 text-[#C8102E] focus:ring-[#C8102E] focus:ring-offset-0 border-[#2D2D2D] bg-[#141414]"
                                name="recovery-method"
                                type="radio"
                                onChange={() => setRecoveryMethod('sms')}
                              />
                            </div>
                            <div className="ml-3 text-xs">
                              <span className="font-medium text-[#e5e2e1] group-hover:text-white">Código vía SMS al móvil corporativo</span>
                              <p className="text-[#71717A] text-[11px] mt-0.5">Número de teléfono registrado en el perfil operativo central.</p>
                            </div>
                          </label>
                        </div>
                      </div>

                      <div className="pt-1">
                        <button
                          className="w-full flex justify-center items-center py-3 px-4 rounded font-semibold text-xs sm:text-sm text-white bg-[#C8102E] hover:bg-[#A80C25] shadow-md shadow-[#C8102E]/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#141414] focus:ring-[#C8102E] transition-all tracking-wide"
                          type="submit"
                        >
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                          </svg>
                          Enviar Enlace de Recuperación
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="text-center py-8">
                      <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-emerald-950/40 border border-emerald-800/50 flex items-center justify-center">
                        <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-base text-white font-bold">Correo enviado correctamente</p>
                      <p className="text-xs text-[#A1A1AA] mt-2 max-w-xs mx-auto leading-relaxed">
                        {recoveryMethod === 'email'
                          ? `Se envió un enlace de restablecimiento a ${forgotEmail}. Revise su bandeja de entrada y siga las instrucciones.`
                          : `Se envió un código de verificación vía SMS al número registrado asociado a ${forgotEmail}.`}
                      </p>
                      <button
                        className="mt-6 text-xs text-[#ffb3b1] hover:text-white transition-colors font-semibold"
                        onClick={() => { setShowForgotModal(false); setForgotSent(false); setForgotEmail(''); }}
                      >
                        Volver al inicio de sesión
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-8 pt-6 border-t border-[#2D2D2D] space-y-3">
                  <div className="p-3 bg-[#0E0E0E] border border-[#2D2D2D] rounded">
                    <div className="flex items-start space-x-2.5">
                      <svg className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <div className="text-[11px] text-[#A1A1AA] leading-relaxed">
                        <strong className="text-white">Nota de Seguridad:</strong> Por políticas internas de Phantom 2026, los enlaces de restablecimiento expiran en <span className="text-white font-medium font-mono">15 minutos</span> y requieren validación en dispositivo corporativo autorizado. Si perdiste acceso a tu correo o móvil, contacta directamente con Mesa de Ayuda TI Almacén (Anexo 4400).
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-[#71717A] text-[11px]">¿Problemas con el factor 2FA corporativo?</span>
                    <button className="font-medium text-[#c8c6c6] hover:text-white inline-flex items-center transition-colors text-[11px]">
                      Contactar Soporte TI
                      <svg className="w-3.5 h-3.5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              <div className="hidden lg:flex lg:col-span-5 relative bg-[#090909] flex-col justify-end overflow-hidden p-6 sm:p-8 min-h-[380px]">
                <img
                  alt="Operario Phantom WMS escaneando inventario en almacén"
                  className="absolute inset-0 w-full h-full object-cover object-center opacity-45 mix-blend-luminosity contrast-125"
                  src="/assets/Login%20phantom.jpg"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E0E] via-[#0E0E0E]/70 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0E0E0E]/40 to-[#0E0E0E]" />                

                <div className="relative z-10 space-y-4">
                  <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded bg-[#1E1E1E] border border-[#2D2D2D] text-[11px] text-[#c8c6c6] backdrop-blur-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#C8102E]" />
                    <span>Mesa de Seguridad de Cuentas</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white tracking-tight">Centro de Distribución Central</h3>
                    <p className="text-xs text-[#A1A1AA] mt-1 leading-normal">
                      Auditoría en tiempo real para terminales PDA, escáneres de radiofrecuencia y estaciones de despacho. Todas las solicitudes quedan registradas bajo hash SHA-256.
                    </p>
                  </div>
                  <div className="pt-2 grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-white/10 text-[#c8c6c6]">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
