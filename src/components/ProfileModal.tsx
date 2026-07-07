import React, { useState } from 'react';
import { X, User, Loader2, Save } from 'lucide-react';
import { getSupabaseClient } from '../services/supabase';
import { Language, translations } from '../types/locale';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: any;
  onUpdateUser: (updatedUser: any) => void;
  lang: Language;
  addToast: (type: 'success' | 'error' | 'info', message: string) => void;
}

export default function ProfileModal({
  isOpen,
  onClose,
  currentUser,
  onUpdateUser,
  lang,
  addToast,
}: ProfileModalProps) {
  const t = translations[lang];
  const [name, setName] = useState(currentUser?.user_metadata?.display_name || '');
  const [isSaving, setIsSaving] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const supabase = getSupabaseClient();
      if (!supabase) throw new Error('Supabase client is not configured.');

      const { data: { user: updatedUser }, error } = await supabase.auth.updateUser({
        data: { display_name: name.trim() }
      });

      if (error) throw error;

      onUpdateUser(updatedUser);
      addToast('success', lang === 'ar' ? 'تم تحديث الاسم الشخصي بنجاح!' : 'Display name updated successfully!');
      onClose();
    } catch (err: any) {
      addToast('error', err.message || (lang === 'ar' ? 'فشل تحديث البيانات.' : 'Failed to update profile.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-[#1e1e1e] border border-[#D4AF37]/40 rounded-xl shadow-[0_0_30px_rgba(212,175,55,0.15)] overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between bg-gradient-to-r from-stone-900 to-[#1e1e1e]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#D4AF37]/10 rounded-lg text-[#D4AF37] border border-[#D4AF37]/20">
              <User className="w-5 h-5" />
            </div>
            <h2 className="font-serif text-base font-bold text-white tracking-wide">
              {lang === 'ar' ? 'تعديل الملف الشخصي' : 'Edit Profile'}
            </h2>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-white transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-1.5 text-start">
            <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
              {lang === 'ar' ? 'الاسم الشخصي (الظاهر)' : 'Display Name'}
            </label>
            <input
              type="text"
              required
              maxLength={45}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={lang === 'ar' ? 'أدخل اسمك الكريم...' : 'Enter your name...'}
              className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3.5 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors"
            />
          </div>

          <div className="pt-4 border-t border-stone-800 flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold rounded-lg transition-colors cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 text-xs bg-[#D4AF37] hover:bg-[#c49f27] text-black font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{t.saving}</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{lang === 'ar' ? 'حفظ التعديلات' : 'Save Changes'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
