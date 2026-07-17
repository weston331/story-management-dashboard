import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  BookOpen, Edit3, Layers, Save, Trash2, ArrowUp, ArrowDown, 
  Plus, MessageSquare, Quote, Heart, ArrowRightLeft, Sparkles,
  Info, AlertTriangle, BookMarked, Check, Loader2, Undo2,
  ChevronLeft, ChevronRight, Copy, X, FileText, Eye, CheckCircle2,
  GripVertical, History, SlidersHorizontal
} from 'lucide-react';
import { Story, StoryBlock, BlockType, StorySystemType, Chapter, StoryStatus } from '../types';
import { Language, translations, IMAMS_LANG, CATEGORIES_LANG } from '../types/locale';
import R2ImageUploader from './R2ImageUploader';
import { deleteImageFromR2 } from '../services/r2';
import RichTextEditor from './RichTextEditor';

interface MainEditorPanelProps {
  currentUser?: any;
  currentUserRole?: string | null;
  story: Story | null;
  onUpdateStory: (updated: Story) => Promise<void>;
  onDeleteStory: (storyId: string) => Promise<void>;
  blocks: StoryBlock[];
  isLoadingBlocks: boolean;
  onSaveBlocks: (updatedBlocks: StoryBlock[]) => Promise<void>;
  isSavingBlocks: boolean;
  addToast: (type: 'success' | 'error' | 'info', message: string) => void;
  lang: Language;
  onDeselectStory?: () => void;
  systemType: StorySystemType;
  chapters: Chapter[];
  selectedChapterId: string | null;
  onSelectChapter: (id: string) => void;
  isLoadingChapters: boolean;
  onAddChapter: (chapter: Omit<Chapter, 'order_index'>) => Promise<void>;
  onUpdateChapter: (chapter: Chapter) => Promise<void>;
  onDeleteChapter: (chapterId: string) => Promise<void>;
  stories?: Story[];
  onSelectStory?: (id: string) => void;
}

const PROPHET_CATEGORIES = [
  'أبو البشر',
  'شيخ المرسلين',
  'خليل الله',
  'أحسن القصص',
  'كليم الله',
  'روح الله',
  'خاتم الأنبياء',
];

// EditorBlock is used to ensure React keys are stable even for unsaved blocks
interface EditorBlock extends StoryBlock {
  editorKey: string;
}

export default function MainEditorPanel({
  currentUser,
  currentUserRole,
  story,
  onUpdateStory,
  onDeleteStory,
  blocks,
  isLoadingBlocks,
  onSaveBlocks,
  isSavingBlocks,
  addToast,
  lang,
  onDeselectStory,
  systemType,
  chapters,
  selectedChapterId,
  onSelectChapter,
  isLoadingChapters,
  onAddChapter,
  onUpdateChapter,
  onDeleteChapter,
  stories = [],
  onSelectStory,
}: MainEditorPanelProps) {
  const [activeTab, setActiveTab] = useState<'metadata' | 'content'>('metadata');
  const [editorBlocks, setEditorBlocks] = useState<EditorBlock[]>([]);
  const [hasUnsavedBlockChanges, setHasUnsavedBlockChanges] = useState(false);
  const [rlsError, setRlsError] = useState<string | null>(null);
  const [copiedRlsSql, setCopiedRlsSql] = useState(false);

  // Chapter-level modals
  const [isAddChapterOpen, setIsAddChapterOpen] = useState(false);
  const [editingChapter, setEditingChapter] = useState<Chapter | null>(null);

  // Metadata states
  const [title, setTitle] = useState('');
  const [imamId, setImamId] = useState('');
  const [category, setCategory] = useState('');
  const [summary, setSummary] = useState('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(3);
  const [narrator, setNarrator] = useState('');
  const [moral, setMoral] = useState('');
  const [tags, setTags] = useState('');
  const [author, setAuthor] = useState('');

  // Prophet specific metadata states
  const [shortName, setShortName] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [heroImage, setHeroImage] = useState('');
  const [categoryLabel, setCategoryLabel] = useState('');
  const [categorySection, setCategorySection] = useState('');
  // Review workflow status
  const [status, setStatus] = useState<StoryStatus>('draft');
  const [isChapterBased, setIsChapterBased] = useState(false);

  const [isUpdatingMetadata, setIsUpdatingMetadata] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Filter states for when no story is selected (Dashboard Home view)
  const [selectedImamIdFilter, setSelectedImamIdFilter] = useState<string | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  // Reset filters when system type changes
  useEffect(() => {
    setSelectedImamIdFilter(null);
    setSelectedCategoryFilter(null);
  }, [systemType]);

  // Track temporary image uploads in this session that haven't been saved yet
  const tempUploadedStoryImages = useRef<string[]>([]);
  const t = translations[lang];

  // Clean up unsaved story image uploads when leaving or changing stories
  useEffect(() => {
    return () => {
      if (tempUploadedStoryImages.current.length > 0) {
        tempUploadedStoryImages.current.forEach((url) => {
          deleteImageFromR2(url);
        });
        tempUploadedStoryImages.current = [];
      }
    };
  }, [story?.id]);

  const handleStoryImageChange = (newUrl: string) => {
    setHeroImage(newUrl);
    if (newUrl) {
      tempUploadedStoryImages.current.push(newUrl);
    }
  };

  // Sync metadata states with active story
  useEffect(() => {
    if (story) {
      setTitle(story.title);
      setImamId(story.imam_id || '');
      setCategory(story.category || '');
      setSummary(story.summary || '');
      setEstimatedMinutes(story.estimated_minutes || 3);
      setNarrator(story.narrator || '');
      setMoral(story.moral || '');
      setTags(story.tags || '');
      setAuthor(story.author || '');

      setShortName(story.short_name || '');
      setIntroduction(story.introduction || '');
      setHeroImage(story.hero_image || '');
      setCategoryLabel(story.category_label || '');
      setCategorySection(story.category_section || '');
      setStatus((story.status as StoryStatus) || 'draft');
      setIsChapterBased(!!story.is_chapter_based);

      setShowDeleteConfirm(false);
    }
  }, [story]);

  // Sync editor blocks state when DB blocks change
  useEffect(() => {
    if (blocks) {
      const formatted = blocks.map((b) => ({
        ...b,
        editorKey: b.id ? `db-${b.id}` : `temp-${Math.random()}-${Date.now()}`,
      }));
      setEditorBlocks(formatted);
      setHasUnsavedBlockChanges(false);
    }
  }, [blocks]);

  const displaySubtitle = React.useMemo(() => {
    if (!story) return '';
    if (systemType === 'ahlulbayt') {
      const localImam = IMAMS_LANG[lang].find((i) => i.id === story.imam_id);
      return localImam ? localImam.name : story.imam_name;
    } else {
      return story.category_label || '';
    }
  }, [story, systemType, lang]);

  const displayCategory = React.useMemo(() => {
    if (!story) return '';
    if (systemType === 'ahlulbayt') {
      const catIndex = CATEGORIES_LANG['en'].indexOf(story.category || '');
      return (catIndex !== -1 && CATEGORIES_LANG[lang])
        ? CATEGORIES_LANG[lang][catIndex]
        : story.category;
    } else {
      return story.category_section || '';
    }
  }, [story, systemType, lang]);

  // isOwner logic:
  // - Admins can always edit/delete
  // - If the story has no created_by (legacy/imported stories), only admins can edit/delete to protect system data
  // - Otherwise, only the story creator can edit
  const isOwner = currentUserRole === 'admin' || (!!story?.created_by && story.created_by === currentUser?.id);

  // Block management functions (Declared as Hooks before early return to satisfy Rules of Hooks)
  const addBlock = useCallback((type: BlockType) => {
    setEditorBlocks((prev) => {
      const nextOrder = prev.length > 0 
        ? Math.max(...prev.map(b => b.order_index)) + 1 
        : 1;

      const newBlock: EditorBlock = {
        story_id: story?.id || '',
        type,
        text: '',
        translation: '',
        order_index: nextOrder,
        editorKey: `temp-${Date.now()}-${Math.random()}`,
      };
      return [...prev, newBlock];
    });
    setHasUnsavedBlockChanges(true);
  }, [story?.id]);

  const updateBlockText = useCallback((index: number, text: string) => {
    setEditorBlocks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], text };
      return updated;
    });
    setHasUnsavedBlockChanges(true);
  }, []);

  const updateBlockTranslation = useCallback((index: number, translation: string) => {
    setEditorBlocks((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], translation };
      return updated;
    });
    setHasUnsavedBlockChanges(true);
  }, []);

  const deleteBlock = useCallback((index: number) => {
    setEditorBlocks((prev) => {
      const updated = prev.filter((_, idx) => idx !== index);
      return updated.map((block, idx) => ({
        ...block,
        order_index: idx + 1,
      }));
    });
    setHasUnsavedBlockChanges(true);
  }, []);

  const moveBlock = useCallback((index: number, direction: 'up' | 'down') => {
    setEditorBlocks((prev) => {
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;

      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      const reordered = [...prev];
      
      const temp = reordered[index];
      reordered[index] = reordered[targetIndex];
      reordered[targetIndex] = temp;

      return reordered.map((block, idx) => ({
        ...block,
        order_index: idx + 1,
      }));
    });
    setHasUnsavedBlockChanges(true);
  }, []);

  // Drag & Drop: move block from dragIndex to dropIndex
  const moveBlockDirect = useCallback((fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    setEditorBlocks((prev) => {
      const reordered = [...prev];
      const [moved] = reordered.splice(fromIndex, 1);
      reordered.splice(toIndex, 0, moved);
      return reordered.map((block, idx) => ({ ...block, order_index: idx + 1 }));
    });
    setHasUnsavedBlockChanges(true);
  }, []);

  if (!story) {
    // Filter stories by selected figure or category
    const storiesList = (stories || []).filter((s) => {
      if (systemType === 'ahlulbayt') {
        if (selectedImamIdFilter && s.imam_id !== selectedImamIdFilter) return false;
        if (selectedCategoryFilter && s.category !== selectedCategoryFilter) return false;
        return true;
      } else {
        if (selectedCategoryFilter && s.category_label !== selectedCategoryFilter) return false;
        return true;
      }
    });

    const storyCountByImam = (stories || []).reduce((acc: Record<string, number>, s) => {
      if (s.imam_id) {
        acc[s.imam_id] = (acc[s.imam_id] || 0) + 1;
      }
      return acc;
    }, {});

    return (
      <div 
        id="empty-editor-panel"
        className="flex-1 bg-[#0c0e17] flex flex-col overflow-y-auto p-4 sm:p-8"
      >
        {/* Upper Hero/Banner */}
        <div className="relative w-full max-w-5xl mx-auto mb-8 p-6 sm:p-8 rounded-2xl bg-gradient-to-r from-[#D4AF37]/5 via-white/[0.01] to-stone-900/30 border border-white/5 overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 shadow-[0_4px_30px_rgba(0,0,0,0.2)]">
          <div className="absolute inset-0 bg-[#D4AF37]/5 rounded-full blur-3xl w-48 h-48 -top-12 -start-12" />
          <div className="space-y-2 text-start z-10">
            <h2 className="font-serif text-xl sm:text-2xl font-bold tracking-wide text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
              {lang === 'ar' ? 'فهرس ومحرّر المجموعات المباركة' : 'Spiritual Narrative Hub'}
            </h2>
            <p className="text-stone-400 text-xs sm:text-sm max-w-xl leading-relaxed">
              {lang === 'ar' 
                ? 'مرحباً بك في لوحة تحكّم كتابة وتعديل سير الأطهار والأنبياء الكرام. اختر معصوماً أو تصنيفاً أدناه لاستعراض وإدارة القصص مباشرة.'
                : 'Welcome to the noble content publisher. Select a holy figure or category below to review, manage, and write stories.'}
            </p>
          </div>
          <div className="relative p-4 bg-white/5 border border-white/10 rounded-xl text-[#D4AF37] shadow-[0_8px_32px_rgba(0,0,0,0.3)] flex-shrink-0 z-10">
            <BookOpen className="w-10 h-10" />
          </div>
        </div>

        {/* Dynamic Selector Panels */}
        <div className="w-full max-w-5xl mx-auto space-y-6 flex-1 flex flex-col">
          {systemType === 'ahlulbayt' ? (
            <>
              {/* Ma'soomeen Grid */}
              <div className="space-y-3">
                <h3 className="font-serif text-base font-semibold text-white tracking-wide text-start flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#D4AF37]" />
                  {lang === 'ar' ? 'شخصيات آل البيت الطاهرة (ع) والأنبياء' : 'Noble Figures & Prophets (as)'}
                </h3>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2.5">
                  {IMAMS_LANG[lang].map((imam) => {
                    const isSelected = selectedImamIdFilter === imam.id;
                    const count = storyCountByImam[imam.id] || 0;
                    return (
                      <button
                        key={imam.id}
                        type="button"
                        onClick={() => setSelectedImamIdFilter(isSelected ? null : imam.id)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-950/45 border-emerald-500/50 text-emerald-200 shadow-[0_0_15px_rgba(52,211,153,0.1)] scale-102 font-bold'
                            : 'bg-white/[0.02] border-white/5 text-stone-400 hover:text-white hover:bg-white/[0.05] hover:border-white/15'
                        }`}
                      >
                        <span className={`w-2.5 h-2.5 rounded-full mb-2 ${
                          isSelected ? 'bg-emerald-400' : count > 0 ? 'bg-[#D4AF37]' : 'bg-stone-700'
                        }`} />
                        <span className="text-xs font-semibold text-center leading-tight truncate w-full">
                          {imam.name.replace(/ \(.*?\)/, '')}
                        </span>
                        <span className="text-[10px] text-stone-500 mt-1 font-mono">
                          {count} {lang === 'ar' ? 'قصة' : 'stories'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* Prophet Categories Selection */}
              <div className="space-y-3">
                <h3 className="font-serif text-base font-semibold text-white tracking-wide text-start flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#D4AF37]" />
                  {lang === 'ar' ? 'تصنيفات قصص الأنبياء' : 'Prophet Story Categories'}
                </h3>
                
                <div className="flex flex-wrap gap-2">
                  {PROPHET_CATEGORIES.map((cat) => {
                    const isSelected = selectedCategoryFilter === cat;
                    const count = (stories || []).filter((s) => s.type === 'prophet_story' && s.category_label === cat).length;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategoryFilter(isSelected ? null : cat)}
                        className={`px-4 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-950/45 border-emerald-500/50 text-emerald-200 shadow-[0_0_15px_rgba(52,211,153,0.1)]'
                            : 'bg-white/[0.02] border-white/5 text-stone-400 hover:text-white hover:bg-white/[0.05] hover:border-white/15'
                        }`}
                      >
                        {cat} ({count})
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Filtered Stories List Card View */}
          <div className="space-y-3 flex-1 flex flex-col">
            <div className="flex items-center justify-between">
              <h3 className="font-serif text-base font-semibold text-white tracking-wide text-start flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#D4AF37]" />
                {lang === 'ar' ? 'القصص المطابقة' : 'Matching Chronicles'}
                <span className="text-[11px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full font-mono text-stone-400">
                  {storiesList.length}
                </span>
              </h3>
              {(selectedImamIdFilter || selectedCategoryFilter) && (
                <button
                  onClick={() => {
                    setSelectedImamIdFilter(null);
                    setSelectedCategoryFilter(null);
                  }}
                  className="text-xs text-[#D4AF37] hover:text-white transition-colors cursor-pointer"
                >
                  {lang === 'ar' ? 'إعادة ضبط التصفية' : 'Reset Filters'}
                </button>
              )}
            </div>

            {storiesList.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 border border-dashed border-white/10 rounded-2xl bg-white/[0.01]">
                <BookOpen className="w-8 h-8 text-stone-500 mb-2" />
                <p className="text-stone-400 text-sm">{lang === 'ar' ? 'لا توجد قصص مطابقة للمرشحات المحددة.' : 'No chronicles match your selection.'}</p>
                <p className="text-stone-500 text-xs mt-1">
                  {lang === 'ar' ? 'اختر شخصية أخرى أو قم بإنشاء قصة جديدة.' : 'Select another noble figure or create a new story.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-1">
                {storiesList.map((s) => {
                  const localImamName = systemType === 'ahlulbayt'
                    ? IMAMS_LANG[lang].find((i) => i.id === s.imam_id)?.name || s.imam_name
                    : s.category_label;
                  return (
                    <div
                      key={s.id}
                      onClick={() => onSelectStory?.(s.id)}
                      className="group p-4 bg-white/[0.02] border border-white/5 hover:border-[#D4AF37]/35 rounded-xl text-start cursor-pointer hover:bg-white/[0.05] transition-all flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-[#D4AF37] font-semibold">{localImamName}</span>
                          {s.status === 'published' ? (
                            <span className="text-[9px] bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                              {lang === 'ar' ? 'منشور' : 'Published'}
                            </span>
                          ) : s.status === 'review' ? (
                            <span className="text-[9px] bg-amber-950/40 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold">
                              {lang === 'ar' ? 'قيد المراجعة' : 'In Review'}
                            </span>
                          ) : (
                            <span className="text-[9px] bg-stone-850 text-stone-400 border border-white/5 px-2 py-0.5 rounded-full">
                              {lang === 'ar' ? 'مسودة' : 'Draft'}
                            </span>
                          )}
                        </div>
                        <h4 className="font-serif text-sm font-semibold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                          {s.title}
                        </h4>
                        {s.summary && (
                          <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                            {s.summary}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center justify-between border-t border-white/5 pt-2 text-[10px] text-stone-500">
                        <span>{s.category || s.category_section}</span>
                        <span>{s.estimated_minutes} {lang === 'ar' ? 'دقائق قراءة' : 'min read'}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Handle saving metadata changes
  const handleSaveMetadata = async (e: React.FormEvent) => {
    e.preventDefault();
    if (systemType === 'ahlulbayt') {
      if (!title.trim() || !category.trim()) {
        addToast('error', lang === 'ar' ? 'العنوان والتصنيف حقول مطلوبة.' : 'Title and Category are required.');
        return;
      }
    } else {
      if (!title.trim() || !categoryLabel.trim()) {
        addToast('error', lang === 'ar' ? 'العنوان وتسمية الفئة مطلوبة.' : 'Title and Category label are required.');
        return;
      }
    }

    setIsUpdatingMetadata(true);

    try {
      let updatedStory: Story;

      if (systemType === 'ahlulbayt') {
        const selectedImamObj = IMAMS_LANG['ar'].find((i) => i.id === imamId);
        const imamName = selectedImamObj ? selectedImamObj.name : story.imam_name;

        updatedStory = {
          ...story,
          title: title.trim(),
          imam_id: imamId,
          imam_name: imamName,
          category: category,
          summary: summary.trim(),
          introduction: isChapterBased ? introduction.trim() : '',
          estimated_minutes: Number(estimatedMinutes) || 3,
          narrator: narrator.trim(),
          moral: moral.trim(),
          hero_image: heroImage.trim() || undefined,
          tags: tags.trim(),
          author: author.trim() || (lang === 'ar' ? 'مكتبة سراج الأثر' : 'Siraj Al-Athar Library'),
          status,
          is_chapter_based: isChapterBased,
        };
      } else {
        updatedStory = {
          ...story,
          title: title.trim(),
          short_name: shortName.trim() || title.trim(),
          summary: summary.trim(),
          introduction: introduction.trim(),
          estimated_minutes: Number(estimatedMinutes) || 3,
          hero_image: heroImage.trim() || 'assets/images/prophets/default_hero.jpg',
          tags: tags.trim(),
          category_label: categoryLabel.trim(),
          category_section: categorySection.trim(),
          author: author.trim() || (lang === 'ar' ? 'مكتبة سراج الأثر' : 'Siraj Al-Athar Library'),
          status,
        };
      }

      await onUpdateStory(updatedStory);
      
      // Delete old replaced image from R2 if different
      if (story?.hero_image && story.hero_image !== heroImage && story.hero_image.startsWith('http')) {
        deleteImageFromR2(story.hero_image);
      }
      
      // Clear tracked session list because they are successfully saved
      tempUploadedStoryImages.current = [];

      addToast('success', t.metadataSaved);
    } catch (err: any) {
      addToast('error', err.message || (lang === 'ar' ? 'فشل تحديث البيانات الكلية.' : 'Failed to update metadata.'));
    } finally {
      setIsUpdatingMetadata(false);
    }
  };

  // Delete Story handler
  const handleDeleteStory = async () => {
    try {
      await onDeleteStory(story.id);
      addToast('success', lang === 'ar' ? `تم حذف القصة "${story.title}" بنجاح.` : `"${story.title}" deleted successfully.`);
      setShowDeleteConfirm(false);
    } catch (err: any) {
      addToast('error', err.message || (lang === 'ar' ? 'فشل حذف القصة.' : 'Failed to delete story.'));
    }
  };

  const handleSaveBlocks = async () => {
    const storyIsChapterBased = systemType === 'prophet' || !!story?.is_chapter_based;
    if (storyIsChapterBased && !selectedChapterId) {
      addToast('error', lang === 'ar' ? 'يرجى تحديد فصل أولاً.' : 'Please select a chapter first.');
      return;
    }

    // Flush any in-progress debounced input: blurring the active element triggers
    // BlockEditorCard's onBlur handler which immediately propagates local text to parent state.
    (document.activeElement as HTMLElement)?.blur?.();

    try {
      setRlsError(null);
      const blocksToSave: StoryBlock[] = editorBlocks.map((b) => {
        const { editorKey, ...cleanBlock } = b;
        if (storyIsChapterBased) {
          cleanBlock.chapter_id = selectedChapterId || '';
          delete cleanBlock.story_id;
        }
        return cleanBlock;
      });
      await onSaveBlocks(blocksToSave);
      setHasUnsavedBlockChanges(false);
      addToast('success', lang === 'ar' ? 'تم حفظ التعديلات بنجاح في قاعدة البيانات!' : 'All content blocks saved to Supabase!');
    } catch (err: any) {
      const errMsg = err.message || '';
      if (errMsg.toLowerCase().includes('row-level security') || errMsg.toLowerCase().includes('rls') || errMsg.toLowerCase().includes('policy')) {
        setRlsError(errMsg);
      }
      addToast('error', err.message || 'Failed to save content blocks.');
    }
  };



  return (
    <div 
      id="main-editor-panel"
      className="flex-1 bg-white/[0.01] backdrop-blur-md flex flex-col h-full overflow-hidden"
    >
      {/* Editor Header */}
      <div className="p-6 border-b border-white/10 bg-white/[0.02] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          {onDeselectStory && (
            <button 
              onClick={onDeselectStory}
              className="md:hidden flex items-center gap-1.5 text-xs text-[#D4AF37] hover:text-[#c49f27] mb-3 bg-[#D4AF37]/5 px-3 py-1.5 rounded-lg border border-[#D4AF37]/25 w-fit cursor-pointer transition-all active:scale-95"
            >
              {lang === 'ar' ? (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <span>الرجوع للقصص</span>
                </>
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4" />
                  <span>Back to Stories</span>
                </>
              )}
            </button>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            {displayCategory && (
              <span className="text-xs font-bold uppercase tracking-widest text-[#D4AF37] px-2 py-0.5 bg-[#D4AF37]/10 rounded border border-[#D4AF37]/30">
                {displayCategory}
              </span>
            )}
            <span className="text-xs text-stone-400 font-medium">{lang === 'ar' ? 'معرف القصة:' : 'ID:'} {story.id}</span>
            {story.updated_at && (
              <span className="flex items-center gap-1 text-[10px] text-stone-500 font-mono" title={story.updated_at}>
                <History className="w-3 h-3" />
                {lang === 'ar' ? 'آخر تحديث:' : 'Updated:'}{' '}
                {new Date(story.updated_at).toLocaleDateString(lang === 'ar' ? 'ar-SA' : 'en-GB', {
                  year: 'numeric', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            )}
          </div>
          <h1 className="font-serif text-2xl font-bold text-white mt-1.5 tracking-wide">
            {story.title}
          </h1>
          {displaySubtitle && (
            <p className="text-xs text-[#D4AF37] mt-0.5 font-medium">
              {systemType === 'ahlulbayt' 
                ? (lang === 'ar' ? 'الشخصية:' : 'Subject:') 
                : (lang === 'ar' ? 'الفئة:' : 'Category:')}{' '}
              {displaySubtitle}
            </p>
          )}
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3">
          {activeTab === 'content' && isOwner && (
            <button
              id="header-save-blocks-btn"
              onClick={handleSaveBlocks}
              disabled={isSavingBlocks || !hasUnsavedBlockChanges}
              className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider rounded-lg transition-all duration-300 flex items-center gap-1.5 cursor-pointer shadow-md border ${
                hasUnsavedBlockChanges
                  ? 'bg-[#D4AF37] hover:bg-[#c49f27] text-black border-[#D4AF37] animate-pulse'
                  : 'bg-white/5 text-stone-500 border-white/5 cursor-not-allowed'
              }`}
            >
              {isSavingBlocks ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{t.saving}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{t.saveBlocks}</span>
                </>
              )}
            </button>
          )}

          {/* Delete Story Button (Writers can only delete their own stories) */}
          {isOwner && (!showDeleteConfirm ? (
            <button
              id="trigger-delete-story-btn"
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-red-400 hover:text-red-300 bg-red-950/20 hover:bg-red-950/50 border border-red-900/30 hover:border-red-500/40 rounded-lg transition-colors cursor-pointer animate-none"
              title={lang === 'ar' ? 'حذف القصة بالكامل' : 'Delete Entire Story'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          ) : (
            <div className="flex items-center gap-2 bg-red-950/40 p-1.5 border border-red-900/60 rounded-lg">
              <span className="text-[10px] text-red-200 font-bold uppercase tracking-wider px-2">
                {lang === 'ar' ? 'تأكيد الحذف؟' : 'Confirm Delete?'}
              </span>
              <button
                id="confirm-delete-story-btn"
                onClick={handleDeleteStory}
                className="bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold px-2 py-1 rounded transition-colors cursor-pointer"
              >
                {lang === 'ar' ? 'نعم' : 'Yes'}
              </button>
              <button
                id="cancel-delete-story-btn"
                onClick={() => setShowDeleteConfirm(false)}
                className="bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] font-bold px-2 py-1 rounded transition-colors cursor-pointer"
              >
                {lang === 'ar' ? 'لا' : 'No'}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-white/10 bg-white/[0.01] px-3 sm:px-6 overflow-x-auto scrollbar-none flex-nowrap">
        <button
          id="tab-metadata-btn"
          onClick={() => setActiveTab('metadata')}
          className={`py-3 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 border-b-2 -mb-px focus:outline-none cursor-pointer flex-shrink-0 ${
            activeTab === 'metadata'
              ? 'border-[#D4AF37] text-[#D4AF37] font-bold'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Edit3 className="w-4 h-4 flex-shrink-0" />
          <span>{t.metaTab}</span>
        </button>
        <button
          id="tab-content-btn"
          onClick={() => setActiveTab('content')}
          className={`py-3 sm:py-3 px-3 sm:px-4 text-xs sm:text-sm font-semibold uppercase tracking-wider transition-all duration-200 flex items-center gap-2 border-b-2 -mb-px focus:outline-none cursor-pointer flex-shrink-0 ${
            activeTab === 'content'
              ? 'border-[#D4AF37] text-[#D4AF37] font-bold'
              : 'border-transparent text-stone-400 hover:text-stone-200'
          }`}
        >
          <Layers className="w-4 h-4 flex-shrink-0" />
          <span>{t.contentTab}</span>
          {hasUnsavedBlockChanges && (
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse flex-shrink-0" />
          )}
        </button>
      </div>

      {/* Tab Panels */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 pb-6">
        {activeTab === 'metadata' && (
          /* Metadata form */
          <form onSubmit={handleSaveMetadata} className="max-w-3xl space-y-5 bg-white/[0.02] border border-white/5 rounded-2xl p-4 sm:p-6 text-start">
            {!isOwner && (
              <div className="p-3 bg-amber-950/20 border border-amber-500/25 rounded-xl text-amber-300 text-xs flex items-center gap-2 mb-4">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>{lang === 'ar' ? 'هذه القصة تابعة لكاتب آخر. لا يمكنك تعديل بياناتها.' : 'This story belongs to another writer. You cannot modify its metadata.'}</span>
              </div>
            )}
            <fieldset className="contents" disabled={!isOwner}>
              {systemType === 'ahlulbayt' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-bold text-stone-300 uppercase tracking-widest">
                    {t.storyTitle}
                  </label>
                  <input
                    id="metadata-title-input"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2 text-start">
                  <label className="text-sm font-bold text-stone-300 uppercase tracking-widest">
                    {lang === 'ar' ? 'نمط القصة' : 'Story Format'}
                  </label>
                  <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5 w-full">
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

                <div className="space-y-1.5 text-start">
                  <label className="text-sm font-bold text-stone-300 uppercase tracking-widest">
                    {t.figureLabel}
                  </label>
                  <select
                    id="metadata-imam-select"
                    value={imamId}
                    onChange={(e) => setImamId(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all cursor-pointer"
                  >
                    {IMAMS_LANG[lang].map((i) => (
                      <option key={i.id} value={i.id} className="bg-stone-950 text-white">
                        {i.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5 text-start">
                  <label className="text-sm font-bold text-stone-300 uppercase tracking-widest">
                    {t.categoryLabel}
                  </label>
                  <input
                    id="metadata-category-input"
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder={lang === 'ar' ? 'مثال: الحكم والمواعظ' : 'e.g. Wisdom & Sayings'}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-bold text-stone-300 uppercase tracking-widest">
                    {t.summaryLabel}
                  </label>
                  <textarea
                    id="metadata-summary-textarea"
                    rows={3}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all placeholder-stone-500 resize-none leading-relaxed"
                  />
                </div>

                {/* Introduction: shown only for chapter-based imam stories */}
                {isChapterBased && (
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-sm font-bold text-[#D4AF37] uppercase tracking-widest flex items-center gap-2">
                      <BookOpen size={14} />
                      {t.introLabel}
                    </label>
                    <textarea
                      id="metadata-intro-textarea"
                      rows={4}
                      value={introduction}
                      onChange={(e) => setIntroduction(e.target.value)}
                      placeholder={lang === 'ar' ? 'نبذة تعريفية تظهر قبل قائمة الفصول في التطبيق...' : 'An introduction shown before the chapter list in the app...'}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all placeholder-stone-500 resize-none leading-relaxed"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-stone-300 uppercase tracking-widest">
                    {t.narratorLabel}
                  </label>
                  <input
                    id="metadata-narrator-input"
                    type="text"
                    value={narrator}
                    onChange={(e) => setNarrator(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-stone-300 uppercase tracking-widest">
                    {t.estMinutes}
                  </label>
                  <input
                    id="metadata-minutes-input"
                    type="number"
                    min="1"
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-bold text-stone-300 uppercase tracking-widest">
                    {t.authorLabel}
                  </label>
                  <input
                    id="metadata-author-input"
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2 text-start">
                  <label className="text-xs font-bold text-stone-300 uppercase tracking-widest block">
                    {t.heroImageLabel}
                  </label>
                  <R2ImageUploader
                    value={heroImage}
                    onChange={handleStoryImageChange}
                    lang={lang}
                    idPrefix="edit-story-hero-ahlulbayt"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2 text-start">
                  <label className="text-sm font-bold text-stone-300 uppercase tracking-widest">
                    {t.moralLabel}
                  </label>
                  <input
                    id="metadata-moral-input"
                    type="text"
                    value={moral}
                    onChange={(e) => setMoral(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all text-start"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2 text-start">
                  <label className="text-sm font-bold text-stone-300 uppercase tracking-widest">
                    {t.tagsLabel}
                  </label>
                  <input
                    id="metadata-tags-input"
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all font-sans text-start"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-bold text-stone-300 uppercase tracking-widest">
                    {t.storyTitle}
                  </label>
                  <input
                    id="metadata-title-input"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all"
                  />
                </div>

                <div className="space-y-1.5 text-start">
                  <label className="text-sm font-bold text-stone-300 uppercase tracking-widest">
                    {t.shortNameLabel}
                  </label>
                  <input
                    id="metadata-shortname-input"
                    type="text"
                    value={shortName}
                    onChange={(e) => setShortName(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all"
                  />
                </div>

                <div className="space-y-1.5 text-start">
                  <label className="text-sm font-bold text-stone-300 uppercase tracking-widest">
                    {t.categoryLabelText}
                  </label>
                  <input
                    id="metadata-categorylabel-input"
                    type="text"
                    value={categoryLabel}
                    onChange={(e) => setCategoryLabel(e.target.value)}
                    placeholder={lang === 'ar' ? 'مثال: سيد الشهداء' : 'e.g. Master of Martyrs'}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all"
                  />
                </div>

                <div className="space-y-1.5 text-start">
                  <label className="text-sm font-bold text-stone-300 uppercase tracking-widest">
                    {t.categorySectionLabel}
                  </label>
                  <input
                    id="metadata-categorysection-input"
                    type="text"
                    value={categorySection}
                    onChange={(e) => setCategorySection(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all font-mono"
                  />
                </div>

                <div className="space-y-1.5 text-start md:col-span-2">
                  <label className="text-xs font-bold text-stone-300 uppercase tracking-widest block">
                    {t.heroImageLabel}
                  </label>
                  <R2ImageUploader
                    value={heroImage}
                    onChange={handleStoryImageChange}
                    lang={lang}
                    idPrefix="edit-story-hero-prophet"
                  />
                </div>

                <div className="space-y-1.5 text-start">
                  <label className="text-sm font-bold text-stone-300 uppercase tracking-widest">
                    {t.authorLabel}
                  </label>
                  <input
                    id="metadata-author-input"
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-bold text-stone-300 uppercase tracking-widest">
                    {t.summaryLabel}
                  </label>
                  <textarea
                    id="metadata-summary-textarea"
                    rows={2}
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all placeholder-stone-500 resize-none leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-sm font-bold text-stone-300 uppercase tracking-widest">
                    {t.introLabel}
                  </label>
                  <textarea
                    id="metadata-intro-textarea"
                    rows={3}
                    value={introduction}
                    onChange={(e) => setIntroduction(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all placeholder-stone-500 resize-none leading-relaxed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-stone-300 uppercase tracking-widest">
                    {t.estMinutes}
                  </label>
                  <input
                    id="metadata-minutes-input"
                    type="number"
                    min="1"
                    value={estimatedMinutes}
                    onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-bold text-stone-300 uppercase tracking-widest">
                    {t.tagsLabel}
                  </label>
                  <input
                    id="metadata-tags-input"
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all font-sans text-start"
                  />
                </div>
              </div>
            )}
          </fieldset>

            {/* ── Review Workflow Status Selector ──────────────────────── */}
            {isOwner && (
              <div className="pt-4 border-t border-stone-800 space-y-3">
                <label className="text-xs font-bold text-stone-300 uppercase tracking-widest block">
                  {lang === 'ar' ? 'حالة النشر' : 'Publication Status'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['draft', 'review', 'published'] as const).map((s) => {
                    const labels: Record<string, { ar: string; en: string; icon: React.ReactNode; color: string; active: string }> = {
                      draft:     { ar: 'مسودة',       en: 'Draft',       icon: <FileText className="w-3.5 h-3.5" />, color: 'border-stone-600/40 text-stone-400 hover:border-stone-500', active: 'bg-stone-700 border-stone-500 text-white' },
                      review:    { ar: 'مراجعة',      en: 'In Review',  icon: <Eye className="w-3.5 h-3.5" />,      color: 'border-amber-600/40 text-amber-400/70 hover:border-amber-500', active: 'bg-amber-900/60 border-amber-500 text-amber-300' },
                      published: { ar: 'منشور',      en: 'Published',  icon: <CheckCircle2 className="w-3.5 h-3.5" />, color: 'border-emerald-600/40 text-emerald-400/70 hover:border-emerald-500', active: 'bg-emerald-900/60 border-emerald-500 text-emerald-300' },
                    };
                    const cfg = labels[s];
                    const isActive = status === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        id={`status-btn-${s}`}
                        onClick={() => setStatus(s)}
                        className={`flex flex-col items-center gap-1.5 py-2.5 px-2 rounded-xl border text-[11px] font-semibold transition-all cursor-pointer ${
                          isActive ? cfg.active : `bg-white/[0.02] ${cfg.color}`
                        }`}
                      >
                        {cfg.icon}
                        <span>{lang === 'ar' ? cfg.ar : cfg.en}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {isOwner && (
              <div className="pt-4 border-t border-stone-800 text-start">
                <button
                  id="save-metadata-btn"
                  type="submit"
                  disabled={isUpdatingMetadata}
                  className="px-6 py-2.5 bg-gradient-to-r from-[#D4AF37] to-amber-500 hover:from-amber-500 hover:to-amber-400 text-black font-semibold rounded-lg text-xs tracking-wider uppercase shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isUpdatingMetadata ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{lang === 'ar' ? 'جاري التحديث...' : 'Updating Metadata...'}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{t.saveMetadata}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        )}

        {activeTab === 'content' && (
          /* Content tab: interactive block editor */
          <div className="space-y-6 max-w-3xl pb-24 relative">
            {!isOwner && (
              <div className="p-3 bg-amber-950/20 border border-amber-500/25 rounded-xl text-amber-300 text-xs flex items-center gap-2 mb-4">
                <Info className="w-4 h-4 flex-shrink-0" />
                <span>{lang === 'ar' ? 'هذه القصة تابعة لكاتب آخر. لا يمكنك تعديل محتواها أو فصولها.' : 'This story belongs to another writer. You cannot edit its content blocks or chapters.'}</span>
              </div>
            )}
            <fieldset className="contents" disabled={!isOwner}>
            {(systemType === 'prophet' || !!story?.is_chapter_based) && (
              <div className="mb-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#D4AF37] uppercase tracking-widest flex items-center gap-1.5 text-start">
                    <BookMarked className="w-4 h-4" />
                    {t.chaptersTitle}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setIsAddChapterOpen(true)}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    {t.addChapterBtn}
                  </button>
                </div>

                {chapters.length === 0 ? (
                  <div className="p-8 border border-dashed border-white/10 rounded-xl text-center space-y-2 bg-white/[0.01]">
                    <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
                    <p className="text-xs font-semibold text-stone-300">{t.noChapters}</p>
                    <p className="text-[11px] text-stone-500 max-w-sm mx-auto leading-relaxed">{t.noChaptersDesc}</p>
                  </div>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                    {chapters.map((ch) => {
                      const isActive = ch.id === selectedChapterId;
                      return (
                        <div
                          key={ch.id}
                          onClick={() => onSelectChapter(ch.id)}
                          className={`flex-shrink-0 cursor-pointer border rounded-xl p-3 text-start transition-all duration-300 min-w-[160px] relative group/ch ${
                            isActive
                              ? 'bg-[#D4AF37]/10 border-[#D4AF37]/45 shadow-[0_4px_15px_rgba(212,175,55,0.05)]'
                              : 'bg-white/5 border-white/10 hover:border-white/20'
                          }`}
                        >
                          <div className="space-y-1 pe-6">
                            <span className="text-[9px] uppercase font-bold text-[#D4AF37]">
                              {ch.label}
                            </span>
                            <h4 className="text-xs font-bold text-white line-clamp-1">
                              {ch.title}
                            </h4>
                            {ch.subtitle && (
                              <p className="text-[10px] text-stone-500 line-clamp-1">
                                {ch.subtitle}
                              </p>
                            )}
                          </div>

                          {/* Chapter actions (hover) */}
                          <div className="absolute top-1.5 end-1.5 flex gap-1 opacity-0 group-hover/ch:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingChapter(ch);
                              }}
                              className="p-1 bg-stone-900/80 hover:bg-stone-900 border border-white/15 rounded text-stone-400 hover:text-white"
                            >
                              <Edit3 className="w-2.5 h-2.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(lang === 'ar' ? 'هل أنت متأكد من حذف هذا الفصل بالكامل؟' : 'Are you sure you want to delete this chapter?')) {
                                  onDeleteChapter(ch.id);
                                }
                              }}
                              className="p-1 bg-red-900/80 hover:bg-red-900 border border-red-900/40 rounded text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {(systemType === 'prophet' || !!story?.is_chapter_based) && !selectedChapterId ? null : isLoadingBlocks ? (
              /* Loading view */
              <div className="flex flex-col items-center justify-center py-16 space-y-3">
                <Loader2 className="w-8 h-8 text-[#D4AF37] animate-spin" />
                <p className="text-stone-400 text-xs font-mono">{lang === 'ar' ? 'جاري جلب أجزاء القصة من الخادم...' : 'Fetching story blocks from server...'}</p>
              </div>
            ) : (
              <>
                {/* Block status message */}
                <div className="flex items-center justify-between bg-stone-900/40 p-3 rounded-lg border border-stone-800 text-xs text-stone-400">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-[#D4AF37]" />
                    <span>{t.reorderInfo}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold ${
                    hasUnsavedBlockChanges 
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  }`}>
                    {hasUnsavedBlockChanges ? t.changesDrafted : t.synchronized}
                  </span>
                </div>

                {rlsError && (
                  <div className="p-4 bg-red-950/40 border border-red-500/30 rounded-xl space-y-3 text-start">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-semibold text-red-200 text-sm">
                          {lang === 'ar' ? 'فشل الحفظ بسبب سياسة أمان قاعدة البيانات (RLS)' : 'Save Failed due to Database Security Policy (RLS)'}
                        </h4>
                        <p className="text-xs text-stone-300 mt-1 leading-relaxed">
                          {lang === 'ar' 
                            ? 'يحتوي جدول "ahlulbayt_story_blocks" على سياسة أمان (RLS) تمنع الكتابة العامة. لتصحيح ذلك، يرجى نسخ وتشغيل هذا الأمر في محرِّر SQL الخاص بـ Supabase لتمكين الوصول:'
                            : 'The "ahlulbayt_story_blocks" table has Row Level Security (RLS) enabled but does not have a policy allowing authenticated inserts. Copy and run this SQL statement in your Supabase SQL Editor to resolve it:'}
                        </p>
                      </div>
                    </div>
                    <div className="bg-black/50 rounded-lg p-3 flex justify-between items-center border border-stone-800 font-mono text-xs">
                      <code className="text-emerald-400 text-[11px] overflow-x-auto whitespace-pre-wrap select-all pr-4">
                        {`CREATE POLICY "Allow authenticated read/write blocks" ON ahlulbayt_story_blocks FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL);`}
                      </code>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`CREATE POLICY "Allow authenticated read/write blocks" ON ahlulbayt_story_blocks FOR ALL TO authenticated USING (true) WITH CHECK (auth.uid() IS NOT NULL);`);
                          setCopiedRlsSql(true);
                          setTimeout(() => setCopiedRlsSql(false), 2000);
                        }}
                        className="px-2.5 py-1.5 bg-stone-800 hover:bg-stone-700 text-white rounded-md text-[11px] transition-colors flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
                      >
                        {copiedRlsSql ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span>{lang === 'ar' ? 'تم النسخ' : 'Copied'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{lang === 'ar' ? 'نسخ' : 'Copy'}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {editorBlocks.length === 0 ? (
                  /* Empty state */
                  <div className="border border-dashed border-white/10 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3.5 bg-white/[0.01] backdrop-blur-md">
                    <div className="p-3 bg-white/5 rounded-full text-stone-400 border border-white/10">
                      <Layers className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-stone-300 font-medium text-sm">{t.noBlocks}</h4>
                      <p className="text-stone-550 text-xs mt-1 max-w-[280px]">
                        {t.noBlocksDesc}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Block list */
                  <div className="space-y-4">
                    {editorBlocks.map((block, index) => (
                      <BlockEditorCard
                        key={block.editorKey}
                        block={block}
                        index={index}
                        totalBlocks={editorBlocks.length}
                        lang={lang}
                        t={t}
                        updateBlockText={updateBlockText}
                        updateBlockTranslation={updateBlockTranslation}
                        deleteBlock={deleteBlock}
                        moveBlock={moveBlock}
                        moveBlockDirect={moveBlockDirect}
                      />
                    ))}
                  </div>
                )}

                {/* Floating Add Block Action Bar */}
                <div className="pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
                  <span className="text-xs text-stone-400 font-medium">
                    {t.addBlockTitle}
                  </span>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      id="add-paragraph-block-btn"
                      type="button"
                      onClick={() => addBlock('paragraph')}
                      className="px-3.5 py-2 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-stone-300 rounded-lg transition-colors flex items-center gap-1.5 font-semibold cursor-pointer backdrop-blur-sm"
                    >
                      <Plus className="w-4 h-4 text-blue-400" />
                      {t.addParagraph}
                    </button>
                    <button
                      id="add-verse-block-btn"
                      type="button"
                      onClick={() => addBlock('verse')}
                      className="px-3.5 py-2 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-stone-300 rounded-lg transition-colors flex items-center gap-1.5 font-semibold cursor-pointer backdrop-blur-sm"
                    >
                      <Plus className="w-4 h-4 text-emerald-400" />
                      {t.addVerse}
                    </button>
                    <button
                      id="add-quote-block-btn"
                      type="button"
                      onClick={() => addBlock('quote')}
                      className="px-3.5 py-2 text-xs bg-white/5 hover:bg-white/10 border border-white/10 text-stone-300 rounded-lg transition-colors flex items-center gap-1.5 font-semibold cursor-pointer backdrop-blur-sm"
                    >
                      <Plus className="w-4 h-4 text-[#D4AF37]" />
                      {t.addQuote}
                    </button>
                  </div>
                </div>
              </>
            )}
            </fieldset>
          </div>
        )}
      </div>

      {/* Chapter Add/Edit Modal */}
      {(isAddChapterOpen || editingChapter) && (
        <ChapterModal
          isOpen={true}
          onClose={() => {
            setIsAddChapterOpen(false);
            setEditingChapter(null);
          }}
          chapter={editingChapter}
          onSave={async (ch) => {
            if (editingChapter) {
              await onUpdateChapter(ch as Chapter);
              setEditingChapter(null);
            } else {
              await onAddChapter(ch);
              setIsAddChapterOpen(false);
            }
          }}
          lang={lang}
        />
      )}
    </div>
  );
}

// Optimized individual content block card component to prevent continuous DOM node updates on keystrokes
const BlockEditorCard = React.memo(function BlockEditorCard({
  block,
  index,
  totalBlocks,
  lang,
  t,
  updateBlockText,
  updateBlockTranslation,
  deleteBlock,
  moveBlock,
  moveBlockDirect,
}: {
  block: EditorBlock;
  index: number;
  totalBlocks: number;
  lang: Language;
  t: any;
  updateBlockText: (index: number, text: string) => void;
  updateBlockTranslation: (index: number, translation: string) => void;
  deleteBlock: (index: number) => void;
  moveBlock: (index: number, direction: 'up' | 'down') => void;
  moveBlockDirect: (fromIndex: number, toIndex: number) => void;
}) {
  const [localText, setLocalText] = useState(block.text);
  const [localTranslation, setLocalTranslation] = useState(block.translation || '');
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isHandleHeld, setIsHandleHeld] = useState(false);
  // Shared ref so drag events can read the current index without stale closure
  const dragIndexRef = useRef(index);
  useEffect(() => { dragIndexRef.current = index; }, [index]);
  const moveBlockDirectRef = useRef(moveBlockDirect);
  useEffect(() => { moveBlockDirectRef.current = moveBlockDirect; }, [moveBlockDirect]);

  // HTML5 drag handlers
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(dragIndexRef.current));
    setIsDragging(true);
  };
  const handleDragEnd = () => { setIsDragging(false); setIsDragOver(false); };
  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setIsDragOver(true); };
  const handleDragLeave = () => { setIsDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const fromIndex = Number(e.dataTransfer.getData('text/plain'));
    moveBlockDirectRef.current(fromIndex, dragIndexRef.current);
  };

  // Keep ref to latest callbacks and index to avoid stale closures in debounced effects
  const updateTextRef = useRef(updateBlockText);
  const updateTranslationRef = useRef(updateBlockTranslation);
  const indexRef = useRef(index);

  useEffect(() => {
    updateTextRef.current = updateBlockText;
    updateTranslationRef.current = updateBlockTranslation;
    indexRef.current = index;
  });

  // Sync with prop changes when block itself is loaded or reordered
  useEffect(() => {
    setLocalText(block.text);
  }, [block.text]);

  useEffect(() => {
    setLocalTranslation(block.translation || '');
  }, [block.translation]);

  // Debounced parent updates
  const debounceTextRef = useRef<any>(null);
  const debounceTranslationRef = useRef<any>(null);

  const handleTextChange = (val: string) => {
    setLocalText(val);
    if (debounceTextRef.current) clearTimeout(debounceTextRef.current);
    debounceTextRef.current = setTimeout(() => {
      updateTextRef.current(indexRef.current, val);
    }, 450);
  };

  const handleTranslationChange = (val: string) => {
    setLocalTranslation(val);
    if (debounceTranslationRef.current) clearTimeout(debounceTranslationRef.current);
    debounceTranslationRef.current = setTimeout(() => {
      updateTranslationRef.current(indexRef.current, val);
    }, 450);
  };

  // Immediate parent updates on blur
  const handleTextBlur = () => {
    if (debounceTextRef.current) clearTimeout(debounceTextRef.current);
    if (localText !== block.text) {
      updateTextRef.current(indexRef.current, localText);
    }
  };

  const handleTranslationBlur = () => {
    if (debounceTranslationRef.current) clearTimeout(debounceTranslationRef.current);
    if (localTranslation !== block.translation) {
      updateTranslationRef.current(indexRef.current, localTranslation);
    }
  };

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (debounceTextRef.current) clearTimeout(debounceTextRef.current);
      if (debounceTranslationRef.current) clearTimeout(debounceTranslationRef.current);
    };
  }, []);

  let wrapperClass = "bg-white/5 border border-white/10";
  if (block.type === 'verse') {
    wrapperClass = "bg-emerald-500/5 border border-emerald-500/20";
  } else if (block.type === 'quote') {
    wrapperClass = "bg-amber-500/5 border border-[#D4AF37]/25";
  }

  return (
    <div
      id={`block-editor-card-${index}`}
      draggable={isHandleHeld}
      onDragStart={(e) => {
        handleDragStart(e);
        setIsHandleHeld(false);
      }}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`block-enter ${wrapperClass} rounded-2xl p-6 flex gap-4 shadow-lg transition-all duration-200 ${
        isDragging ? 'opacity-40 scale-95 shadow-none' : 'hover:shadow-xl'
      } ${
        isDragOver ? 'ring-2 ring-[#D4AF37]/60 scale-[1.01]' : ''
      }`}
    >
      {/* Block controls column */}
      <div className="flex flex-col items-center justify-between border-e border-white/10 pe-4">
        {/* Drag handle */}
        <div
          title={lang === 'ar' ? 'اسحب لإعادة الترتيب' : 'Drag to reorder'}
          className="cursor-grab active:cursor-grabbing p-1 text-stone-500 hover:text-[#D4AF37] transition-colors mb-1"
          onMouseDown={() => setIsHandleHeld(true)}
          onMouseUp={() => setIsHandleHeld(false)}
          onTouchStart={() => setIsHandleHeld(true)}
          onTouchEnd={() => setIsHandleHeld(false)}
        >
          <GripVertical className="w-4 h-4" />
        </div>
        <span className="text-xs font-mono font-bold text-[#D4AF37] bg-[#D4AF37]/10 w-6 h-6 rounded-full flex items-center justify-center border border-[#D4AF37]/20">
          {index + 1}
        </span>

        <div className="flex flex-col gap-1 mt-3">
          <button
            id={`block-${index}-move-up`}
            type="button"
            onClick={() => moveBlock(index, 'up')}
            disabled={index === 0}
            className={`p-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-stone-400 hover:text-white transition-colors cursor-pointer ${
              index === 0 ? 'opacity-30 cursor-not-allowed' : ''
            }`}
            title={lang === 'ar' ? 'نقل لأعلى' : 'Move Block Up'}
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            id={`block-${index}-move-down`}
            type="button"
            onClick={() => moveBlock(index, 'down')}
            disabled={index === totalBlocks - 1}
            className={`p-1.5 rounded bg-white/5 hover:bg-white/10 border border-white/10 text-stone-400 hover:text-white transition-colors cursor-pointer ${
              index === totalBlocks - 1 ? 'opacity-30 cursor-not-allowed' : ''
            }`}
            title={lang === 'ar' ? 'نقل لأسفل' : 'Move Block Down'}
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          id={`block-${index}-delete-btn`}
          type="button"
          onClick={() => deleteBlock(index)}
          className="mt-auto p-1.5 rounded text-stone-500 hover:text-red-400 hover:bg-red-950/20 transition-colors cursor-pointer"
          title={lang === 'ar' ? 'حذف الجزء' : 'Delete Block'}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Block form inputs */}
      <div className="flex-1 space-y-3.5 text-start">
        {/* Block Badge */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            {block.type === 'paragraph' && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950/30 px-2 py-0.5 rounded border border-blue-900/30">
                {t.paragraphBlock}
              </span>
            )}
            {block.type === 'verse' && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded border border-emerald-900/30 flex items-center gap-1">
                <BookMarked className="w-3 h-3" />
                {t.quranicVerse}
              </span>
            )}
            {block.type === 'quote' && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#D4AF37] bg-[#D4AF37]/10 px-2 py-0.5 rounded border border-[#D4AF37]/20 flex items-center gap-1">
                <Quote className="w-2.5 h-2.5" />
                {t.quoteHadith}
              </span>
            )}
          </div>
          <span className="text-[10px] font-mono text-stone-500">
            {lang === 'ar' ? 'الترتيب:' : 'Order index:'} {block.order_index}
          </span>
        </div>

        {/* Text Input depending on block type */}
        {block.type === 'paragraph' && (
          <RichTextEditor
            id={`block-${index}-text-input`}
            value={localText}
            onChange={handleTextChange}
            onBlur={handleTextBlur}
            placeholder={t.prosePlaceholder}
            lang={lang}
            className="text-stone-200 text-sm leading-relaxed"
          />
        )}

        {block.type === 'verse' && (
          <div className="space-y-2.5 w-full">
            <RichTextEditor
              id={`block-${index}-verse-arabic`}
              value={localText}
              onChange={handleTextChange}
              onBlur={handleTextBlur}
              placeholder={t.arabicVersePlaceholder}
              lang={lang}
              className="text-emerald-300 text-xl font-serif leading-loose text-right"
            />
            <input
              id={`block-${index}-verse-ref`}
              type="text"
              value={localTranslation}
              onChange={(e) => handleTranslationChange(e.target.value)}
              onBlur={handleTranslationBlur}
              placeholder={t.verseRefPlaceholder}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2 text-stone-300 text-xs focus:outline-none focus:border-emerald-500 transition-colors text-start animate-none"
            />
          </div>
        )}

        {block.type === 'quote' && (
          <div className="space-y-2.5 w-full">
            <RichTextEditor
              id={`block-${index}-quote-text`}
              value={localText}
              onChange={handleTextChange}
              onBlur={handleTextBlur}
              placeholder={t.quotePlaceholder}
              lang={lang}
              className="text-stone-200 text-sm italic leading-relaxed"
            />
            <input
              id={`block-${index}-quote-speaker`}
              type="text"
              value={localTranslation}
              onChange={(e) => handleTranslationChange(e.target.value)}
              onBlur={handleTranslationBlur}
              placeholder={t.quoteSpeakerPlaceholder}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3.5 py-2 text-stone-300 text-xs focus:outline-none focus:border-amber-500 transition-colors text-start animate-none"
            />
          </div>
        )}
      </div>
    </div>
  );
});

interface ChapterModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapter: Chapter | null;
  onSave: (chapter: any) => Promise<void>;
  lang: Language;
}

function ChapterModal({ isOpen, onClose, chapter, onSave, lang }: ChapterModalProps) {
  const [id, setId] = useState('');
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [label, setLabel] = useState('');
  const [imagePath, setImagePath] = useState('');
  const [featured, setFeatured] = useState(false);
  const [accent, setAccent] = useState('gold');
  const [icon, setIcon] = useState('auto_stories');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [isIdManuallyEdited, setIsIdManuallyEdited] = useState(false);

  const t = translations[lang];

  const tempUploadedChapterImages = useRef<string[]>([]);
  const originalImageRef = useRef(chapter?.image_path || '');

  useEffect(() => {
    if (chapter) {
      setId(chapter.id);
      setTitle(chapter.title);
      setSubtitle(chapter.subtitle || '');
      setLabel(chapter.label);
      setImagePath(chapter.image_path || '');
      setFeatured(chapter.featured || false);
      setAccent(chapter.accent || 'gold');
      setIcon(chapter.icon || 'auto_stories');
      originalImageRef.current = chapter.image_path || '';
    } else {
      setId('');
      setTitle('');
      setSubtitle('');
      setLabel('');
      setImagePath('');
      setFeatured(false);
      setAccent('gold');
      setIcon('auto_stories');
      originalImageRef.current = '';
    }
    // Reset temporary session uploads when modal opens/changes
    tempUploadedChapterImages.current = [];
  }, [chapter]);

  // Track R2 image change
  const handleChapterImageChange = (newUrl: string) => {
    setImagePath(newUrl);
    if (newUrl) {
      tempUploadedChapterImages.current.push(newUrl);
    }
  };

  const handleCancel = () => {
    onClose();
    // Delete all temporary unsaved images from R2
    if (tempUploadedChapterImages.current.length > 0) {
      tempUploadedChapterImages.current.forEach((url) => {
        deleteImageFromR2(url);
      });
      tempUploadedChapterImages.current = [];
    }
  };

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

  // Auto-generate ID from title if empty and adding
  useEffect(() => {
    if (!chapter && !isIdManuallyEdited && title) {
      setId(generateSlug(title));
    }
  }, [title, chapter, isIdManuallyEdited]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!id.trim() || !title.trim() || !label.trim()) {
      setError(lang === 'ar' ? 'العنوان وتسمية الفصل والمعرف حقول مطلوبة.' : 'ID, Title, and Label are required.');
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        id: id.trim(),
        title: title.trim(),
        subtitle: subtitle.trim(),
        label: label.trim(),
        image_path: imagePath.trim(),
        image: imagePath.trim(),
        featured,
        accent,
        icon,
      });

      // Successful save! Check if the image changed, and delete the old one from R2
      if (originalImageRef.current && originalImageRef.current !== imagePath && originalImageRef.current.startsWith('http')) {
        deleteImageFromR2(originalImageRef.current);
      }
      
      // Clear tracking array so we keep the new image
      tempUploadedChapterImages.current = [];

      onClose();
    } catch (err: any) {
      setError(err.message || 'Error saving chapter.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-[60] overflow-y-auto p-4 flex justify-center items-start sm:items-center">
      <div className="w-full max-w-md bg-[#1e1e1e] border border-[#D4AF37]/45 rounded-xl shadow-[0_0_30px_rgba(212,175,55,0.15)] my-auto overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-stone-800 flex items-center justify-between bg-stone-900">
          <h3 className="font-serif text-sm font-bold text-white tracking-wide">
            {chapter ? t.editChapter : t.createChapter}
          </h3>
          <button onClick={handleCancel} className="text-stone-400 hover:text-white transition-colors p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-start">
          {error && <div className="text-xs text-red-400 bg-red-950/20 border border-red-900/50 p-2 rounded">{error}</div>}

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">{t.chapterTitle}</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">{t.chapterSubtitle}</label>
            <input
              type="text"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">{t.chapterLabel}</label>
            <input
              type="text"
              required
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="الفصل الأول"
              className="w-full bg-stone-900 border border-stone-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">ID</label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                disabled={!!chapter}
                value={id}
                onChange={(e) => {
                  setId(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''));
                  setIsIdManuallyEdited(true);
                }}
                className="flex-1 bg-stone-900 border border-stone-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#D4AF37] disabled:opacity-50 font-mono"
              />
              {!chapter && (
                <button
                  type="button"
                  onClick={() => {
                    if (title) {
                      setId(generateSlug(title));
                      setIsIdManuallyEdited(false);
                    }
                  }}
                  className="px-3 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 border border-[#D4AF37]/35 hover:border-[#D4AF37] text-[#D4AF37] text-xs font-bold rounded transition-colors cursor-pointer active:scale-95 animate-none"
                >
                  {lang === 'ar' ? 'توليد' : 'Generate'}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1 text-start">
            <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider block">{t.chapterImage}</label>
            <R2ImageUploader
              value={imagePath}
              onChange={handleChapterImageChange}
              lang={lang}
              idPrefix="edit-chapter-img"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                {lang === 'ar' ? 'نوع الفصل' : 'Chapter Type'}
              </label>
              <select
                value={featured ? 'featured' : 'regular'}
                onChange={(e) => setFeatured(e.target.value === 'featured')}
                className="w-full bg-stone-900 border border-stone-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="regular">{lang === 'ar' ? 'فصل عادي' : 'Regular'}</option>
                <option value="featured">{lang === 'ar' ? 'فصل مميز' : 'Featured'}</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                {lang === 'ar' ? 'علامة الفصل (اللون)' : 'Chapter Mark (Color)'}
              </label>
              <select
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="w-full bg-stone-900 border border-stone-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
              >
                <option value="gold">{lang === 'ar' ? 'ذهبي' : 'Gold'}</option>
                <option value="green">{lang === 'ar' ? 'أخضر' : 'Green'}</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
              {lang === 'ar' ? 'أيقونة الفصل' : 'Chapter Icon'}
            </label>
            <select
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 rounded px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#D4AF37]"
            >
              <option value="auto_stories">{lang === 'ar' ? 'كتاب (فصل عادي)' : 'Book (Regular)'}</option>
              <option value="star">{lang === 'ar' ? 'نجمة (فصل مميز)' : 'Star (Featured)'}</option>
              <option value="bookmark">{lang === 'ar' ? 'علامة مرجعية (أخير / ختامي)' : 'Bookmark (Final)'}</option>
              <option value="check">{lang === 'ar' ? 'صح (مكتمل)' : 'Check (Completed)'}</option>
              <option value="stars">{lang === 'ar' ? 'نجوم (مميز جداً)' : 'Stars (Premium)'}</option>
              <option value="shield">{lang === 'ar' ? 'درع (معركة / بطولة)' : 'Shield (Battle)'}</option>
              <option value="mosque">{lang === 'ar' ? 'مسجد' : 'Mosque'}</option>
            </select>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-stone-800 flex gap-2 justify-end">
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs rounded transition-colors touch-target"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-[#D4AF37] hover:bg-[#c49f27] text-black text-xs font-semibold rounded transition-colors touch-target"
            >
              {isSaving ? t.saving : (chapter ? t.saveChapter : t.createChapter)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


