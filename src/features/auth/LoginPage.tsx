import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Shield, Mail, Lock, ArrowRight, Users, FileText, LockKeyhole } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';
import { useT } from '../../i18n';
import { ThemeToggle, LanguageToggle } from '../../components/ThemeToggle';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const navigate = useNavigate();
  const t = useT();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      const user = useAuthStore.getState().user;
      if (user?.role === UserRole.GUARD) {
        navigate('/guard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      // One clear message per failure class; never surface routing noise
      // ("Route not found") or raw network errors on the login form.
      const status = err?.response?.status;
      const serverMsg = typeof err?.response?.data?.message === 'string' ? err.response.data.message : '';
      const isNotFound = status === 404 || /not found/i.test(serverMsg);
      if (status === 401) {
        // Wrong email and wrong password both get the same generic message.
        setError(t('loginInvalidCredentials'));
      } else if (status === 403) {
        setError(t('loginAccountDisabled'));
      } else if (status && status >= 400 && status < 500 && serverMsg && !isNotFound) {
        setError(serverMsg);
      } else {
        setError(t('somethingWentWrong'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F8FAFC] dark:bg-[#07152F] font-sans antialiased">
      {/* ─────────────────────────────────────────────────────────────
          LEFT SIDE: Enterprise Trust & Hero Brand Panel
          (Collapsed on mobile, deep enterprise navy + cobalt)
          ───────────────────────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 relative bg-gradient-to-br from-[#07152F] via-[#0A1A3B] to-[#0D1B36] flex-col justify-between p-12 xl:p-16 text-white overflow-hidden shadow-2xl">
        {/* Subtle background architectural geometry overlay */}
        <div className="absolute inset-0 opacity-15 pointer-events-none">
          <svg className="w-full h-full" viewBox="0 0 800 800" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="0.8" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
            <circle cx="200" cy="300" r="280" fill="radial-gradient(circle, rgba(37,99,235,0.25) 0%, transparent 70%)" />
            <circle cx="600" cy="650" r="320" fill="radial-gradient(circle, rgba(59,130,246,0.18) 0%, transparent 70%)" />
          </svg>
        </div>

        {/* Ambient radial glows */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-10 right-0 w-80 h-80 bg-indigo-600/15 blur-[100px] rounded-full pointer-events-none" />

        {/* Brand identity header */}
        <div className="relative z-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 p-2 shadow-lg mb-6 ring-1 ring-white/10">
            <img src="/logo.png" alt="Vital Security" className="w-10 h-10 object-contain" />
          </div>

          <h1 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white">
            VITAL SECURITY
          </h1>
          <p className="text-sm xl:text-base font-medium text-blue-200/90 mt-1.5">
            Enterprise Workforce & Payroll System
          </p>

          <div className="w-12 h-1 bg-[#2563EB] rounded-full mt-4" />
        </div>

        {/* Center narrative & trust pillars */}
        <div className="relative z-10 my-10 space-y-8">
          <div>
            <p className="text-xl xl:text-2xl font-bold text-slate-100 tracking-tight leading-snug">
              Secure. Efficient. Empowering Your Workforce.
            </p>
            <p className="text-xs xl:text-sm text-slate-300/80 mt-2 max-w-md leading-relaxed">
              Unified operational control for guard deployments, shift rotation scheduling, biometric attendance, and statutory Ethiopian payroll compliance.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-start gap-4 p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xs">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-400/30 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Secure Access</h4>
                <p className="text-xs text-slate-300/80 mt-0.5">Role-based controls, audit trails, and biometric QR validation.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xs">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-400/30 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Workforce Management</h4>
                <p className="text-xs text-slate-300/80 mt-0.5">Streamline guard rosters, shift patterns, and multi-site deployments.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-3.5 rounded-2xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-xs">
              <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-400/30 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Payroll & Finance</h4>
                <p className="text-xs text-slate-300/80 mt-0.5">Accurate ERCA tax withholding, POESSA pensions, and bank disbursement batches.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Left footer note */}
        <div className="relative z-10 flex items-center justify-between text-xs text-slate-400 border-t border-white/10 pt-6">
          <span>Enterprise Security Platform v2.4</span>
          <span>Addis Ababa, Ethiopia</span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          RIGHT SIDE: Focused Login Card Panel
          ───────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 lg:p-12 relative overflow-y-auto">
        {/* Top Controls: Language & Theme Switchers */}
        <div className="flex items-center justify-between sm:justify-end gap-3 z-20">
          <div className="sm:hidden flex items-center gap-2">
            <img src="/logo.png" alt="Vital" className="w-6 h-6 object-contain" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Vital Security</span>
          </div>
          <div className="flex items-center gap-2.5">
            <LanguageToggle className="bg-white dark:bg-navy-900 border-slate-200 dark:border-slate-800 shadow-xs" />
            <ThemeToggle className="bg-white dark:bg-navy-900 border-slate-200 dark:border-slate-800 shadow-xs hover:bg-slate-50 dark:hover:bg-navy-800" />
          </div>
        </div>

        {/* Centered Login Card */}
        <div className="my-auto py-8">
          <div className="w-full max-w-md mx-auto bg-white dark:bg-[#0D1B36] rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden transition-all">
            {/* Card Header */}
            <div className="pt-8 pb-4 px-8 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50/80 dark:bg-navy-800 border border-blue-100 dark:border-navy-700 mx-auto p-2.5 shadow-sm mb-3">
                <img src="/logo.png" alt="Vital Security" className="w-full h-full object-contain" />
              </div>
              <h2 className="text-xl font-black tracking-tight text-slate-900 dark:text-white uppercase">
                VITAL SECURITY
              </h2>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                Enterprise Workforce & Payroll System
              </p>
              <div className="w-10 h-1 bg-[#2563EB] rounded-full mx-auto mt-2.5" />
            </div>

            {/* Form */}
            <div className="px-8 pb-8 pt-3">
              {error && (
                <div className="mb-5 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-xs font-medium flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('email')}
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      required
                      autoComplete="username"
                      className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#07152F] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    {t('password')}
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                      className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-[#07152F] border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-blue-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-sm transition-all duration-150 flex items-center justify-center gap-2 group cursor-pointer"
                >
                  {loading ? (
                    <span>{t('signingIn')}</span>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Bottom Security Watermark Footer */}
            <div className="bg-slate-50/80 dark:bg-navy-950/80 px-8 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500">
              <span>Vital Security PLC © 2026</span>
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <LockKeyhole className="w-3 h-3 text-emerald-500" /> TLS 1.3 Encrypted
              </span>
            </div>
          </div>
        </div>

        {/* Bottom space filler */}
        <div className="hidden sm:block text-center text-[11px] text-slate-400 dark:text-slate-600">
          Secure Multi-Site Personnel & Payroll Management
        </div>
      </div>
    </div>
  );
}
