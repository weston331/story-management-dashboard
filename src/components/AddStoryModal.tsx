import React, { useState, useEffect } from 'react';
import { X, BookOpen, AlertCircle, Plus, Sparkles, Check } from 'lucide-react';
import { Story, StorySystemType } from '../types';
import { Language, translations, IMAMS_LANG, CATEGORIES_LANG } from '../types/locale';
import R2ImageUploader from './R2ImageUploader';
import { deleteImageFromR2 } from '../services/r2';

interface AddStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (story: Story) => Promise<void>;
  lang: Language;
  currentUser?: any;
}

export const IMAMS = IMAMS_LANG['en'];
export const CATEGORIES = CATEGORIES_LANG['en'];

const PROPHET_CATEGORIES = [
  'أبو البشر',
  'شيخ المرسلين',
  'خليل الله',
  'أحسن القصص',
  'كليم الله',
  'روح الله',
  'خاتم الأنبياء',
];

export default function AddStoryModal({ isOpen, onClose, onAdd, lang, currentUser }: AddStoryModalProps) {
  const t = translations[lang];

  const [type, setType] = useState<StorySystemType>('ahlulbayt');
  const [isChapterBased, setIsChapterBased] = useState(false);
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [imamId, setImamId] = useState(IMAMS[0].id);
  const [category, setCategory] = useState('');
  const [summary, setSummary] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(3);
  const [narrator, setNarrator] = useState('');
  const [moral, setMoral] = useState('');
  const [tags, setTags] = useState('');
  const [author, setAuthor] = useState('');

  // Prophet specific fields
  const [shortName, setShortName] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [categoryLabel, setCategoryLabel] = useState('');
  const [categorySection, setCategorySection] = useState('الأنبياء');

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isIdManuallyEdited, setIsIdManuallyEdited] = useState(false);

  // Track all uploaded images during this modal session for potential cleanup on cancel
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  // Transliterate Arabic characters to clean English slugs
  const generateSlug = (text: string): string => {
    const charMap: { [key: string]: string } = {
      'ا': 'a', 'أ': 'a', 'إ': 'i', 'آ': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th',
      'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'dh', 'ر': 'r', 'ز': 'z',
      'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'zh', 'ع': 'a',
      'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
      'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a', 'ة': 't', 'ئ': 'e', 'ؤ': 'o',
      'ء': 'a'
    };
    
    return text
      .split('')
      .map(char => charMap[char] || char)
      .join('')
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
  };

  // Auto-generate ID from title if empty
  useEffect(() => {
    if (!isIdManuallyEdited && title) {
      setId(generateSlug(title));
    }
  }, [title, isIdManuallyEdited]);

  // Set default author when modal opens or currentUser changes
  useEffect(() => {
    if (isOpen) {
      const displayName = currentUser?.user_metadata?.display_name;
      if (displayName) {
        setAuthor(displayName);
      } else if (currentUser?.email) {
        setAuthor(currentUser.email);
      } else {
        setAuthor('');
      }
    }
  }, [isOpen, currentUser]);

  // Reset type-specific fields when switching between story types to avoid data bleed.
  // Common fields (title, summary, tags, estimatedMinutes, author) are intentionally preserved.
  useEffect(() => {
    if (type === 'ahlulbayt') {
      // Clear prophet-only fields
      setShortName('');
      setIntroduction('');
      setCategoryLabel('');
      setCategorySection('الأنبياء');
      setIsChapterBased(false);
    } else {
      // Clear ahl al-bayt-only fields
      setImamId(IMAMS[0].id);
      setCategory('');
      setNarrator('');
      setMoral('');
      setIsChapterBased(true);
    }
    // Also reset the ID since the slug convention may differ between types
    if (!isIdManuallyEdited) {
      setId(title ? generateSlug(title) : '');
    }
    setError('');
  }, [type]);

  // Track new uploads to the session list
  const handleImageChange = (newUrl: string) => {
    setHeroImage(newUrl);
    if (newUrl) {
      setUploadedImages((prev) => [...prev, newUrl]);
    }
  };

  const handleCancel = async () => {
    onClose();
    // Fire-and-forget deletion of all uploaded images since the user cancelled
    if (uploadedImages.length > 0) {
      uploadedImages.forEach((url) => {
        deleteImageFromR2(url);
      });
      setUploadedImages([]);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!id.trim() || !title.trim()) {
      setError(lang === 'ar' ? 'المعرف والعنوان هي حقول مطلوبة.' : 'ID and Title are required.');
      return;
    }

    if (!/^[a-z0-9-_]+$/.test(id)) {
      setError(lang === 'ar' 
        ? 'يجب أن يتكون المعرف من أحرف إنجليزية صغيرة وأرقام وشرطات فقط (مثال: wisdom-of-imam-ali).' 
        : 'Story ID must be alphanumeric and contain only lowercase letters, numbers, hyphens, or underscores (e.g. wisdom-of-imam-ali).');
      return;
    }

    setIsSubmitting(true);

    try {
      let newStory: Story;

      if (type === 'ahlulbayt') {
        const imamName = IMAMS_LANG['ar'].find((i) => i.id === imamId)?.name || '';
        newStory = {
          id: id.trim(),
          title: title.trim(),
          imam_id: imamId,
          imam_name: imamName,
          category: category,
          summary: summary.trim(),
          estimated_minutes: Number(estimatedMinutes) || 3,
          narrator: narrator.trim(),
          moral: moral.trim(),
          hero_image: heroImage.trim() || undefined,
          tags: tags.trim(),
          author: author.trim() || (lang === 'ar' ? 'مكتبة سراج الأثر' : 'Siraj Al-Athar Library'),
          order_index: 0,
          status: 'draft',
          is_chapter_based: isChapterBased,
        };
      } else {
        newStory = {
          id: id.trim(),
          title: title.trim(),
          type: 'prophet_story',
          short_name: shortName.trim() || title.trim(),
          summary: summary.trim(),
          introduction: introduction.trim(),
          estimated_minutes: Number(estimatedMinutes) || 3,
          hero_image: heroImage.trim() || `assets/images/prophets/${id.replace('prophet_', '')}_hero.jpg`,
          tags: tags.trim(),
          category_label: categoryLabel.trim(),
          category_section: categorySection.trim(),
          author: author.trim() || (lang === 'ar' ? 'مكتبة سراج الأثر' : 'Siraj Al-Athar Library'),
          order_index: 0,
          status: 'draft',
        };
      }

      await onAdd(newStory);
      
      // Reset form
      setId('');
      setTitle('');
      setImamId(IMAMS[0].id);
      setCategory('');
      setSummary('');
      setEstimatedMinutes(3);
      setNarrator('');
      setMoral('');
      setTags('');
      const displayName = currentUser?.user_metadata?.display_name;
      setAuthor(displayName || currentUser?.email || '');
      setShortName('');
      setIntroduction('');
      setHeroImage('');
      setCategoryLabel('');
      setCategorySection('الأنبياء');
      
      // Successfully saved! Clean tracked list so they aren't deleted on close
      setUploadedImages([]);
      handleCancel();
    } catch (e: any) {
      setError(e.message || (lang === 'ar' ? 'فشل إضافة القصة.' : 'Failed to add story.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        id="add-story-modal"
        className="w-full max-w-2xl bg-[#1e1e1e] border border-[#D4AF37]/40 rounded-xl shadow-[0_0_30px_rgba(212,175,55,0.15)] flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-5 border-b border-stone-800 flex items-center justify-between bg-gradient-to-r from-stone-900 to-[#1e1e1e]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-serif text-lg font-bold text-white tracking-wide">
                {t.createNobleStoryTitle}
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                {t.createNobleStoryDesc}
              </p>
            </div>
          </div>
          <button
            id="close-add-story-modal-btn"
            onClick={handleCancel}
            className="text-stone-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3.5 bg-red-950/40 border border-red-500/30 text-red-200 text-sm rounded-lg flex flex-col gap-2.5">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
              {(error.toLowerCase().includes('row-level security') || error.toLowerCase().includes('rls') || error.toLowerCase().includes('policy')) && (
                <div className="mt-2 p-3 bg-black/45 rounded-lg border border-red-900/40 space-y-2 text-start">
                  <p className="text-[11px] text-stone-300 font-semibold leading-relaxed">
                    {lang === 'ar' 
                      ? 'لحل مشكلة RLS، يرجى نسخ وتشغيل هذا الكود في Supabase SQL Editor لتمكين الوصول إلى الجداول:'
                      : 'To resolve this RLS issue, copy and run this code in your Supabase SQL Editor to grant table access:'}
                  </p>
                  <pre className="text-[10.5px] text-emerald-400 font-mono bg-black/85 p-2.5 rounded overflow-x-auto select-all leading-normal">
                    {type === 'ahlulbayt'
                      ? `CREATE POLICY "Allow authenticated write stories" ON ahlulbayt_stories FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL);`
                      : `CREATE POLICY "Allow authenticated write stories" ON stories FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL);`}
                  </pre>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-start">
            {/* Story Location Selector */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                {t.storyType}
              </label>
              <div className="flex bg-stone-900 border border-stone-800 rounded-lg p-0.5 w-full">
                <button
                  type="button"
                  onClick={() => setType('ahlulbayt')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer text-center ${
                    type === 'ahlulbayt' ? 'bg-[#D4AF37] text-black shadow-md' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  {t.ahlulbaytStories}
                </button>
                <button
                  type="button"
                  onClick={() => setType('prophet')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer text-center ${
                    type === 'prophet' ? 'bg-[#D4AF37] text-black shadow-md' : 'text-stone-400 hover:text-white'
                  }`}
                >
                  {t.prophetStories}
                </button>
              </div>
            </div>

            {type === 'ahlulbayt' && (
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider block text-start">
                  {lang === 'ar' ? 'نمط القصة' : 'Story Format'}
                </label>
                <div className="flex bg-stone-900 border border-stone-800 rounded-lg p-0.5 w-full">
                  <button
                    type="button"
                    onClick={() => setIsChapterBased(false)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer text-center ${
                      !isChapterBased ? 'bg-[#D4AF37] text-black shadow-md' : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    {lang === 'ar' ? 'نمط حالي (سرد مباشر)' : 'Single Story / Narrative'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsChapterBased(true)}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer text-center ${
                      isChapterBased ? 'bg-[#D4AF37] text-black shadow-md' : 'text-stone-400 hover:text-white'
                    }`}
                  >
                    {lang === 'ar' ? 'نمط فصول (مثل قصص الأنبياء)' : 'Chapter-based'}
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                {t.storyTitle} <span className="text-red-500">*</span>
              </label>
              <input
                id="add-story-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={lang === 'ar' ? 'أدخل عنوان القصة العطرة...' : 'The Patience of Imam Hasan (as)'}
                className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3.5 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors placeholder-stone-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#D4AF37] uppercase tracking-wider flex items-center gap-1.5">
                {t.storyId} <span className="text-red-500">*</span>
                <span className="text-[10px] text-amber-500/80 font-normal normal-case">{t.storyIdHint}</span>
              </label>
              <div className="flex gap-2">
                <input
                  id="add-story-id"
                  type="text"
                  required
                  value={id}
                  onChange={(e) => {
                    setId(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''));
                    setIsIdManuallyEdited(true);
                  }}
                  placeholder="patience-of-imam-hasan"
                  className="flex-1 bg-stone-900 border border-stone-800 rounded-lg px-3.5 py-2 text-white text-sm font-mono focus:outline-none focus:border-[#D4AF37] transition-colors placeholder-stone-600 animate-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (title) {
                      setId(generateSlug(title));
                      setIsIdManuallyEdited(false);
                    }
                  }}
                  className="px-4 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/35 hover:border-[#D4AF37] text-[#D4AF37] text-xs font-bold rounded-lg transition-colors cursor-pointer active:scale-95 animate-none"
                >
                  {lang === 'ar' ? 'توليد' : 'Generate'}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                {t.estMinutes}
              </label>
              <input
                id="add-story-minutes"
                type="number"
                min="1"
                max="60"
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3.5 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors"
              />
            </div>

            {type === 'ahlulbayt' ? (
              <>
                {/* Ahl al-Bayt form elements */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                    {t.figureLabel} <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="add-story-imam"
                    value={imamId}
                    onChange={(e) => setImamId(e.target.value)}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3.5 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors"
                  >
                    {IMAMS_LANG[lang].map((imam) => (
                      <option key={imam.id} value={imam.id} className="bg-stone-950 text-white">
                        {imam.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                    {t.categoryLabel} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="add-story-category"
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder={lang === 'ar' ? 'مثال: الحكم والمواعظ' : 'e.g. Wisdom & Sayings'}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3.5 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors placeholder-stone-600"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                    {t.summaryLabel}
                  </label>
                  <textarea
                    id="add-story-summary"
                    rows={2}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder={t.summaryPlaceholder}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3.5 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors placeholder-stone-600 resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                    {t.narratorLabel}
                  </label>
                  <input
                    id="add-story-narrator"
                    type="text"
                    value={narrator}
                    onChange={(e) => setNarrator(e.target.value)}
                    placeholder={lang === 'ar' ? 'مثال: الكافي، ج ٢' : 'e.g. Al-Kafi, Vol. 2'}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3.5 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors placeholder-stone-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                    {t.authorLabel}
                  </label>
                  <input
                    id="add-story-author"
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder={t.authorPlaceholder}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3.5 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors placeholder-stone-600"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2 text-start">
                  <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider block">
                    {t.heroImageLabel}
                  </label>
                  <R2ImageUploader
                    value={heroImage}
                    onChange={handleImageChange}
                    lang={lang}
                    idPrefix="add-story-hero-ahlulbayt"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                    {t.moralLabel}
                  </label>
                  <input
                    id="add-story-moral"
                    type="text"
                    value={moral}
                    onChange={(e) => setMoral(e.target.value)}
                    placeholder={lang === 'ar' ? 'الصبر يمتص الغضب ويؤلف القلوب.' : 'Patience dissolves anger and wins hearts.'}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3.5 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors placeholder-stone-600"
                  />
                </div>
              </>
            ) : (
              <>
                {/* Prophet / main stories form elements */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                    {t.shortNameLabel}
                  </label>
                  <input
                    id="add-story-shortname"
                    type="text"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    placeholder={lang === 'ar' ? 'مثال: يوسف' : 'e.g. Yusuf'}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3.5 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors placeholder-stone-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                    {t.categoryLabelText}
                  </label>
                  <input
                    id="add-story-categorylabel"
                    type="text"
                    value={categoryLabel}
                    onChange={(e) => setCategoryLabel(e.target.value)}
                    placeholder={lang === 'ar' ? 'مثال: سيد الشهداء' : 'e.g. Master of Martyrs'}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3.5 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors placeholder-stone-600"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                    {t.categorySectionLabel}
                  </label>
                  <input
                    id="add-story-categorysection"
                    type="text"
                    value={categorySection}
                    onChange={(e) => setCategorySection(e.target.value)}
                    placeholder="الأنبياء"
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3.5 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors placeholder-stone-600"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2 text-start">
                  <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider block">
                    {t.heroImageLabel}
                  </label>
                  <R2ImageUploader
                    value={heroImage}
                    onChange={handleImageChange}
                    lang={lang}
                    idPrefix="add-story-hero"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                    {t.authorLabel}
                  </label>
                  <input
                    id="add-story-author"
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder={t.authorPlaceholder}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3.5 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors placeholder-stone-600"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                    {t.summaryLabel}
                  </label>
                  <textarea
                    id="add-story-summary"
                    rows={2}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder={lang === 'ar' ? 'أدخل ملخصاً للقصة الشريفة...' : 'Enter a brief summary of the noble story...'}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3.5 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors placeholder-stone-600 resize-none"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                    {t.introLabel}
                  </label>
                  <textarea
                    id="add-story-intro"
                    rows={3}
                    value={introduction}
                    onChange={(e) => setIntroduction(e.target.value)}
                    placeholder={lang === 'ar' ? 'أدخل النص التعريفي/المقدمة للقصة...' : 'Enter the introductory text of the story...'}
                    className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3.5 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors placeholder-stone-600 resize-none leading-relaxed"
                  />
                </div>
              </>
            )}

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-stone-300 uppercase tracking-wider">
                {t.tagsLabel}
              </label>
              <input
                id="add-story-tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder={lang === 'ar' ? 'الصبر، مكارم الأخلاق، الشام، الكافي' : 'Patience, Kind treatment, Syria, Al-Kafi'}
                className="w-full bg-stone-900 border border-stone-800 rounded-lg px-3.5 py-2 text-white text-sm focus:outline-none focus:border-[#D4AF37] transition-colors placeholder-stone-600"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-stone-800 flex gap-3 justify-end">
            <button
              id="cancel-add-story-btn"
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 text-sm bg-stone-800 hover:bg-stone-700 text-stone-300 font-medium rounded-lg transition-colors cursor-pointer"
            >
              {t.cancel}
            </button>
            <button
              id="submit-add-story-btn"
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-sm bg-gradient-to-r from-emerald-800 to-emerald-600 hover:from-emerald-700 hover:to-emerald-500 text-white font-semibold rounded-lg shadow-md transition-all border border-emerald-500/20 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t.saving}</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>{t.createStoryBtn}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

