import React, { useState } from 'react';
import { getSupabaseClient } from '../services/supabase';
import { Lock, Mail, Loader2, Sparkles } from 'lucide-react';
import { Language, translations } from '../types/locale';
import Logo from './Logo';

interface LoginPanelProps {
  onLoginSuccess: (user: any) => void;
  lang: Language;
}

export default function LoginPanel({ onLoginSuccess, lang }: LoginPanelProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const t = translations[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const client = getSupabaseClient();
    if (!client) {
      setError(lang === 'ar' ? 'حدث خطأ في جلب عميل Supabase.' : 'Supabase client is not available.');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error: authError } = await client.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError) {
        throw authError;
      }

      if (data?.user) {
        onLoginSuccess(data.user);
      }
    } catch (err: any) {
      console.error('Authentication error:', err);
      let errMsg = err.message || 'Authentication failed';
      if (errMsg.includes('Invalid login credentials')) {
        errMsg = lang === 'ar' 
          ? 'بيانات الدخول غير صحيحة، يرجى التأكد من البريد وكلمة المرور.' 
          : 'Invalid email or password. Please verify your credentials.';
      }
      setError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0c0e17] via-[#0f111a] to-[#07080f] text-white p-4 relative font-sans overflow-hidden select-none">
      {/* Ambient Halos */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-900/10 blur-[150px] rounded-full pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#D4AF37]/5 blur-[150px] rounded-full pointer-events-none z-0" />

      <div className="w-full max-w-md bg-white/[0.01] border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-[0_8px_32px_rgba(0,0,0,0.5)] z-10 space-y-6 relative">
        {/* Glow effect at the top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-[1px] bg-gradient-to-r from-transparent via-[#D4AF37]/40 to-transparent" />

        {/* Logo and Header */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="h-16 w-28 rounded-xl bg-[#D4AF37]/5 border border-[#D4AF37]/20 flex items-center justify-center p-1.5 shadow-[0_0_20px_rgba(212,175,55,0.08)]">
            <Logo className="w-full h-full" />
          </div>
          <div>
            <h2 className="font-serif text-2xl font-bold tracking-wider text-white">
              {t.siteTitle}
            </h2>
            <p className="text-[10px] text-[#D4AF37] font-semibold tracking-wide uppercase mt-1 flex items-center justify-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              {lang === 'ar' ? 'منصة تدوين السير الشريفة' : 'Noble Chronicles Portal'}
            </p>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 bg-red-950/30 border border-red-500/20 text-red-200 text-xs rounded-lg text-start animate-none">
            {error}
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-start">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">
              {lang === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-stone-500 absolute start-3 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={lang === 'ar' ? 'name@example.com' : 'writer@siraj-alathar.org'}
                className="w-full bg-white/5 border border-white/10 rounded-lg ps-10 pe-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all text-start"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-stone-300 uppercase tracking-widest">
              {lang === 'ar' ? 'كلمة المرور' : 'Password'}
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-stone-500 absolute start-3 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-lg ps-10 pe-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all text-start"
              />
            </div>
            <div className="flex justify-end pt-1.5">
              <a
                href="https://t.me/SirajSupport_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-bold text-[#D4AF37]/80 hover:text-amber-400 transition-colors cursor-pointer"
              >
                {lang === 'ar' ? 'هل نسيت الرمز السري؟' : 'Forgot security code?'}
              </a>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-bold rounded-lg text-xs uppercase tracking-wider shadow-md transition-all duration-300 flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{lang === 'ar' ? 'جاري التحقق...' : 'Verifying...'}</span>
              </>
            ) : (
              <span>{lang === 'ar' ? 'تسجيل الدخول' : 'Sign In'}</span>
            )}
          </button>
        </form>

        <div className="text-center space-y-3.5 pt-2 border-t border-white/5">
          <p className="text-[10px] text-stone-500 font-medium leading-relaxed">
            {lang === 'ar' 
              ? 'يجب تسجيل الحساب من قبل مدير النظام للكتابة.' 
              : 'Accounts must be pre-registered by the admin to gain access.'}
          </p>
          <div className="text-xs">
            <span className="text-stone-400">
              {lang === 'ar' ? 'ليس لديك حساب؟ ' : "Don't have an account? "}
            </span>
            <a 
              href="https://t.me/SirajSupport_bot" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-[#D4AF37] hover:text-amber-400 font-bold transition-colors underline underline-offset-4 decoration-[#D4AF37]/30 hover:decoration-amber-400"
            >
              {lang === 'ar' ? 'إنشاء حساب (طلب تفعيل)' : 'Create account (Request access)'}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
