import React, { useState, useMemo, useRef, useCallback } from 'react';
import { Search, SlidersHorizontal, Plus, Book, Tag, Clock, ChevronRight, Sparkles, FileText, Eye, CheckCircle2 } from 'lucide-react';
import { Story, StorySystemType } from '../types';
import { Language, translations, IMAMS_LANG, CATEGORIES_LANG } from '../types/locale';

interface SidebarProps {
  currentUser?: any;
  stories: Story[];
  selectedStoryId: string | null;
  onSelectStory: (id: string) => void;
  onAddStoryOpen: () => void;
  isLoading: boolean;
  lang: Language;
  systemType: StorySystemType;
  onSystemTypeChange: (type: StorySystemType) => void;
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

const Sidebar = React.memo(function Sidebar({
  currentUser,
  stories,
  selectedStoryId,
  onSelectStory,
  onAddStoryOpen,
  isLoading,
  lang,
  systemType,
  onSystemTypeChange,
}: SidebarProps) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [selectedImam, setSelectedImam] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [onlyMyStories, setOnlyMyStories] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(40);

  // Debounced search handler — only triggers filter computation 200ms after last keystroke
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(value);
    }, 200);
  }, []);

  const t = translations[lang];
  const localImams = IMAMS_LANG[lang];

  // Reset filters and display limit when system type changes
  React.useEffect(() => {
    setSelectedImam('all');
    setSelectedCategory('all');
    setOnlyMyStories(false);
    setDisplayLimit(40);
  }, [systemType]);

  // Reset display limit when searching or applying filters to optimize UI responsiveness
  React.useEffect(() => {
    setDisplayLimit(40);
  }, [search, selectedImam, selectedCategory, onlyMyStories]);

  // Full-text filtered stories — searches across all meaningful text fields
  const filteredStories = useMemo(() => {
    const q = search.toLowerCase().trim();
    return stories.filter((story) => {
      if (onlyMyStories && currentUser) {
        if (story.created_by !== currentUser.id) return false;
      }

      const matchSearch = !q ||
        story.title.toLowerCase().includes(q) ||
        (story.tags         && story.tags.toLowerCase().includes(q)) ||
        (story.summary      && story.summary.toLowerCase().includes(q)) ||
        (story.narrator     && story.narrator.toLowerCase().includes(q)) ||
        (story.moral        && story.moral.toLowerCase().includes(q)) ||
        (story.author       && story.author.toLowerCase().includes(q)) ||
        (story.short_name   && story.short_name.toLowerCase().includes(q)) ||
        (story.introduction && story.introduction.toLowerCase().includes(q)) ||
        (story.category     && story.category.toLowerCase().includes(q)) ||
        (story.category_label && story.category_label.toLowerCase().includes(q));

      if (systemType === 'ahlulbayt') {
        const matchImam = selectedImam === 'all' || story.imam_id === selectedImam;
        const matchCategory = selectedCategory === 'all' || story.category === selectedCategory;
        return matchSearch && matchImam && matchCategory;
      } else {
        const matchCategory = selectedCategory === 'all' || story.category_label === selectedCategory;
        return matchSearch && matchCategory;
      }
    });
  }, [stories, search, selectedImam, selectedCategory, systemType, onlyMyStories, currentUser]);

  return (
    <div 
      id="sidebar-container"
      className={`w-full md:w-85 lg:w-96 bg-white/[0.01] border-e border-white/10 flex-col h-full flex-shrink-0 ${
        selectedStoryId ? 'hidden md:flex' : 'flex'
      }`}
    >
      {/* Search & Filter Header */}
      <div className="p-4 border-b border-white/10 space-y-3 bg-white/[0.02]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Book className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="font-serif font-bold text-white tracking-wide text-base">
              {t.nobleChronicles}
            </h2>
          </div>
          <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-mono">
            {filteredStories.length} {lang === 'ar' ? t.story : (filteredStories.length === 1 ? t.story : t.stories)}
          </span>
        </div>

        {/* System type switcher */}
        <div className="flex flex-col min-[380px]:flex-row bg-white/5 border border-white/10 rounded-lg p-0.5 w-full gap-1 min-[380px]:gap-0">
          <button
            onClick={() => onSystemTypeChange('ahlulbayt')}
            className={`flex-1 py-1.5 text-[10px] font-bold tracking-wider rounded-md transition-all cursor-pointer text-center ${
              systemType === 'ahlulbayt' ? 'bg-[#D4AF37] text-black shadow-md' : 'text-stone-400 hover:text-white'
            }`}
          >
            {t.ahlulbaytStories}
          </button>
          <button
            onClick={() => onSystemTypeChange('prophet')}
            className={`flex-1 py-1.5 text-[10px] font-bold tracking-wider rounded-md transition-all cursor-pointer text-center ${
              systemType === 'prophet' ? 'bg-[#D4AF37] text-black shadow-md' : 'text-stone-400 hover:text-white'
            }`}
          >
            {t.prophetStories}
          </button>
        </div>

        {/* Create button */}
        <button
          id="sidebar-add-story-btn"
          onClick={onAddStoryOpen}
          className="w-full py-2 px-3 bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/30 hover:border-[#D4AF37]/50 rounded-lg text-xs font-semibold tracking-wider uppercase transition-all duration-300 flex items-center justify-center gap-1.5 shadow-[0_4px_20px_rgba(212,175,55,0.05)] focus:outline-none cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          {t.addNobleStory}
        </button>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute start-3 top-2.5" />
          <input
            id="sidebar-search-input"
            type="text"
            placeholder={t.searchPlaceholder}
            value={searchInput}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-lg ps-9 pe-4 py-2 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-[#D4AF37]/60 focus:ring-1 focus:ring-[#D4AF37]/20 transition-all text-start"
          />
        </div>

        {/* Only My Stories Toggle */}
        {currentUser && (
          <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg p-2 text-xs">
            <span className="text-stone-300 font-semibold flex items-center gap-1.5 select-none">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              {lang === 'ar' ? 'عرض رواياتي فقط' : 'Show my stories only'}
            </span>
            <button
              type="button"
              onClick={() => setOnlyMyStories(!onlyMyStories)}
              className={`w-9 h-5 rounded-full transition-all duration-300 relative p-0.5 cursor-pointer ${
                onlyMyStories ? 'bg-[#D4AF37]' : 'bg-stone-850'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-black shadow transition-all duration-300 transform ${
                  onlyMyStories ? 'translate-x-4 rtl:-translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        )}

        {/* Filters Grid */}
        <div className="flex flex-col min-[380px]:flex-row gap-2">
          {systemType === 'ahlulbayt' ? (
            <>
              {/* Imam Filter */}
              <div className="flex-1 space-y-1">
                <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                  {t.byFigure}
                </label>
                <select
                  id="sidebar-filter-imam"
                  value={selectedImam}
                  onChange={(e) => setSelectedImam(e.target.value)}
                  className="w-full bg-[#11131c] border border-white/10 text-stone-200 text-[11px] rounded px-2 py-1 focus:outline-none focus:border-[#D4AF37]/60 transition-all cursor-pointer"
                >
                  <option value="all" className="bg-stone-950 text-white">{t.allFigures}</option>
                  {localImams.map((imam) => (
                    <option key={imam.id} value={imam.id} className="bg-stone-950 text-white">
                      {imam.name.replace(/ \(.*?\)/, '')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Filter */}
              <div className="flex-1 space-y-1">
                <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                  {t.byCategory}
                </label>
                <select
                  id="sidebar-filter-category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-[#11131c] border border-white/10 text-stone-200 text-[11px] rounded px-2 py-1 focus:outline-none focus:border-[#D4AF37]/60 transition-all cursor-pointer"
                >
                  <option value="all" className="bg-stone-950 text-white">{t.allCategories}</option>
                  {Array.from(new Set(stories.filter(s => !s.type || s.type !== 'prophet_story').map(s => s.category).filter(Boolean))).map((cat) => {
                    const predefinedIndex = CATEGORIES_LANG['en'].indexOf(cat);
                    const displayCategory = (predefinedIndex !== -1 && lang === 'ar') ? CATEGORIES_LANG['ar'][predefinedIndex] : cat;
                    return (
                      <option key={cat} value={cat} className="bg-stone-950 text-white">
                        {displayCategory}
                      </option>
                    );
                  })}
                </select>
              </div>
            </>
          ) : (
            /* Prophet Category Filter */
            <div className="w-full space-y-1">
              <label className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                {t.byCategory}
              </label>
              <select
                id="sidebar-filter-category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-[#11131c] border border-white/10 text-stone-200 text-[11px] rounded px-2 py-1 focus:outline-none focus:border-[#D4AF37]/60 transition-all cursor-pointer"
              >
                <option value="all" className="bg-stone-950 text-white">{t.allCategories}</option>
                {Array.from(new Set(stories.filter(s => s.type === 'prophet_story').map(s => s.category_label).filter(Boolean))).map((cat) => (
                  <option key={cat} value={cat} className="bg-stone-950 text-white">
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Story List with dynamic viewport rendering pagination */}
      <div 
        className="flex-1 overflow-y-auto p-3 space-y-2.5"
        onScroll={(e) => {
          const target = e.currentTarget;
          // When user scrolls down close to bottom (within 120px), load the next 40 items
          if (target.scrollHeight - target.scrollTop - target.clientHeight < 120) {
            if (displayLimit < filteredStories.length) {
              setDisplayLimit((prev) => prev + 40);
            }
          }
        }}
      >
        {isLoading ? (
          // Shimmer loaders
          <div className="space-y-3 p-1">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="border border-white/10 rounded-xl p-4 space-y-2.5 bg-white/5">
                <div className="h-4 w-3/4 rounded animate-shimmer" />
                <div className="h-3 w-1/2 rounded animate-shimmer" />
                <div className="flex gap-2 pt-1">
                  <div className="h-4.5 w-16 rounded animate-shimmer" />
                  <div className="h-4.5 w-12 rounded animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredStories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-3">
            <div className="p-3 bg-white/5 rounded-full text-stone-400 border border-white/10">
              <Search className="w-6 h-6" />
            </div>
            <div>
              <p className="text-stone-300 font-medium text-sm">{t.noStories}</p>
              <p className="text-stone-500 text-xs mt-1 max-w-[200px] mx-auto">
                {t.noStoriesDesc}
              </p>
            </div>
          </div>
        ) : (
          filteredStories.slice(0, displayLimit).map((story) => (
            <StoryListCard
              key={story.id}
              story={story}
              isSelected={story.id === selectedStoryId}
              lang={lang}
              systemType={systemType}
              onSelectStory={onSelectStory}
              currentUser={currentUser}
            />
          ))
        )}
      </div>
    </div>
  );
});

export default Sidebar;

// Optimized Story List Card component
const StoryListCard = React.memo(function StoryListCard({
  story,
  isSelected,
  lang,
  systemType,
  onSelectStory,
  currentUser,
}: {
  story: Story;
  isSelected: boolean;
  lang: Language;
  systemType: StorySystemType;
  onSelectStory: (id: string) => void;
  currentUser?: any;
}) {
  const tagArray = useMemo(() =>
    story.tags
      ? story.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [],
  [story.tags]);

  const displaySubtitle = React.useMemo(() => {
    if (systemType === 'ahlulbayt') {
      const localImam = IMAMS_LANG[lang].find(i => i.id === story.imam_id);
      return localImam ? localImam.name : story.imam_name;
    } else {
      return story.category_label || '';
    }
  }, [story, systemType, lang]);

  const displayCategory = React.useMemo(() => {
    if (systemType === 'ahlulbayt') {
      const catIndex = CATEGORIES_LANG['en'].indexOf(story.category || '');
      return (catIndex !== -1 && CATEGORIES_LANG[lang])
        ? CATEGORIES_LANG[lang][catIndex]
        : story.category;
    } else {
      return story.category_section || '';
    }
  }, [story, systemType, lang]);

  return (
    <div
      id={`story-card-${story.id}`}
      onClick={() => onSelectStory(story.id)}
      className={`group border rounded-xl p-4 cursor-pointer transition-all duration-300 relative overflow-hidden backdrop-blur-md ${
        isSelected
          ? 'bg-[#D4AF37]/10 border-[#D4AF37]/40 shadow-[0_8px_32px_rgba(212,175,55,0.1)]'
          : 'bg-white/[0.03] border-white/10 hover:border-[#D4AF37]/30 hover:bg-white/[0.06] hover:shadow-[0_8px_32px_rgba(255,255,255,0.02)]'
      }`}
    >
      {/* Decorative border highlight for selected */}
      {isSelected && (
        <div className="absolute top-0 bottom-0 start-0 w-1 bg-[#D4AF37]" />
      )}

      <div className="space-y-2">
        <div className="flex justify-between items-start gap-2">
          <h3 className="font-serif text-sm font-semibold text-white tracking-wide group-hover:text-emerald-300 transition-colors duration-250 line-clamp-1 text-start">
            {story.title}
          </h3>
          <ChevronRight className={`w-4 h-4 text-stone-500 flex-shrink-0 group-hover:text-emerald-400 transition-all ${
            isSelected ? (lang === 'ar' ? '-translate-x-1 rotate-180' : 'translate-x-1') : (lang === 'ar' ? 'rotate-180' : '')
          }`} />
        </div>

        {/* Figure/Imam name & category */}
        <div className="space-y-1 text-start">
          <p className="text-[11px] text-[#D4AF37] font-medium tracking-wide">
            {displaySubtitle}
          </p>
          {/* Clock row */}
          <div className="flex items-center gap-1.5 text-[10px] text-stone-400 flex-wrap">
            {displayCategory && (
              <span className="px-1.5 py-0.5 bg-white/10 border border-white/5 rounded text-stone-300 font-medium">
                {displayCategory}
              </span>
            )}
            <span className="flex items-center gap-0.5">
              <Clock className="w-3 h-3 text-stone-500" />
              {story.estimated_minutes}{lang === 'ar' ? ' د' : 'm'}
            </span>
          </div>
          {/* Status badge + Mine badge row */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {story.status === 'published' ? (
              <span className="px-1.5 py-0.5 bg-emerald-950/40 border border-emerald-500/25 rounded text-emerald-400 text-[9px] font-bold flex items-center gap-0.5 flex-shrink-0">
                <CheckCircle2 className="w-2.5 h-2.5" />
                {lang === 'ar' ? 'منشور' : 'Published'}
              </span>
            ) : story.status === 'review' ? (
              <span className="px-1.5 py-0.5 bg-amber-950/40 border border-amber-500/25 rounded text-amber-400 text-[9px] font-bold flex items-center gap-0.5 flex-shrink-0">
                <Eye className="w-2.5 h-2.5" />
                {lang === 'ar' ? 'قيد المراجعة' : 'In Review'}
              </span>
            ) : (
              <span className="px-1.5 py-0.5 bg-stone-800/60 border border-stone-600/25 rounded text-stone-400 text-[9px] font-bold flex items-center gap-0.5 flex-shrink-0">
                <FileText className="w-2.5 h-2.5" />
                {lang === 'ar' ? 'مسودة' : 'Draft'}
              </span>
            )}
            {story.created_by === currentUser?.id && (
              <span className="px-1.5 py-0.5 bg-[#D4AF37]/15 border border-[#D4AF37]/35 rounded text-[#D4AF37] text-[9px] font-bold flex items-center gap-0.5 flex-shrink-0">
                <Sparkles className="w-2.5 h-2.5 text-[#D4AF37]" />
                {lang === 'ar' ? 'خاصتي' : 'Mine'}
              </span>
            )}
          </div>
        </div>

        {/* Tags */}
        {tagArray.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1.5 justify-start">
            {tagArray.slice(0, 3).map((tag, idx) => (
              <span
                key={idx}
                className="text-[9px] bg-emerald-950/40 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-900/30 font-medium flex items-center gap-0.5"
              >
                <Tag className="w-2.5 h-2.5 text-emerald-500" />
                {tag}
              </span>
            ))}
            {tagArray.length > 3 && (
              <span className="text-[9px] text-stone-500 font-bold px-1 py-0.5">
                +{tagArray.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

