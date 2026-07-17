import React, { useState, useEffect, useRef, useCallback, Suspense, lazy } from 'react';
import { 
  Database, Sliders, LogOut, CheckCircle, HelpCircle, 
  BookOpen, Sparkles, AlertTriangle, Moon, RefreshCw, Layers, Globe, Loader2,
  Edit3
} from 'lucide-react';
import { Story, StoryBlock, StorySystemType, Chapter } from './types';
import { Language, translations } from './types/locale';
import { getSupabaseClient } from './services/supabase';
import Sidebar from './components/Sidebar';
import MainEditorPanel from './components/MainEditorPanel';
import ToastContainer, { ToastMessage } from './components/Toast';
import Logo from './components/Logo';
import LoginPanel from './components/LoginPanel';

// Lazy-load heavy modals — parsed only when first opened (saves ~40KB initial parse)
const AddStoryModal = lazy(() => import('./components/AddStoryModal'));
const ProfileModal = lazy(() => import('./components/ProfileModal'));

export default function App() {
  // Language states
  const [lang, setLang] = useState<Language>(() => {
    const stored = localStorage.getItem('story_builder_lang');
    return (stored === 'en' || stored === 'ar') ? stored : 'ar';
  });

  useEffect(() => {
    localStorage.setItem('story_builder_lang', lang);
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang]);

  const t = translations[lang];

  // Connection and modal states
  const [isConfigured, setIsConfigured] = useState(false);
  const [isAddStoryOpen, setIsAddStoryOpen] = useState(false);

  // Active Story Type (System Type)
  const [systemType, setSystemType] = useState<StorySystemType>('ahlulbayt');

  // Database states
  const [stories, setStories] = useState<Story[]>([]);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [blocks, setBlocks] = useState<StoryBlock[]>([]);

  // Chapters states (Prophet stories specific)
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [isLoadingChapters, setIsLoadingChapters] = useState(false);
  
  // Loading states
  const [isLoadingStories, setIsLoadingStories] = useState(false);
  const [isLoadingBlocks, setIsLoadingBlocks] = useState(false);
  const [isSavingBlocks, setIsSavingBlocks] = useState(false);
  const [tableError, setTableError] = useState<string | null>(null);

  // Custom Toast state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Stable references prevent unnecessary re-renders in Sidebar / MainEditorPanel
  const addToast = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Auth states
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(null);
  // Tracks manual sign-out so we don't show a session-expired toast for deliberate logouts
  const isManualSignOut = useRef(false);

  // Fetch user role from database
  useEffect(() => {
    if (user) {
      fetchUserRole(user.id);
    } else {
      setUserRole(null);
    }
  }, [user]);

  const fetchUserRole = async (userId: string) => {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const { data, error } = await client
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setUserRole('writer'); // Default fallback
        } else {
          throw error;
        }
      } else {
        setUserRole(data?.role || 'writer');
      }
    } catch (err) {
      console.error('Failed to fetch user role:', err);
      setUserRole('writer'); // Default fallback
    }
  };

  // Check auth session on mount and subscribe to changes
  useEffect(() => {
    const client = getSupabaseClient();
    if (client) {
      client.auth.getSession().then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setIsAuthLoading(false);
      });

      const { data: { subscription } } = client.auth.onAuthStateChange((event, session) => {
        setUser(session?.user ?? null);
        setIsAuthLoading(false);
        // Show session-expired toast only when Supabase drops the session automatically
        // (not when the user deliberately clicked Log Out)
        if (event === 'SIGNED_OUT' && !isManualSignOut.current) {
          addToast('info', lang === 'ar'
            ? 'انتهت جلستك، يرجى تسجيل الدخول مجدداً.'
            : 'Your session has expired. Please sign in again.');
        }
        isManualSignOut.current = false;
      });

      return () => subscription.unsubscribe();
    } else {
      setIsAuthLoading(false);
    }
  }, []);

  const handleSignOut = async () => {
    const client = getSupabaseClient();
    if (client) {
      // Flag as manual so onAuthStateChange won't also show a session-expired toast
      isManualSignOut.current = true;
      await client.auth.signOut();
      setUser(null);
      addToast('info', lang === 'ar' ? 'تم تسجيل الخروج بنجاح.' : 'Logged out successfully.');
    }
  };

  // Verify the Supabase connection is reachable on mount
  useEffect(() => {
    const client = getSupabaseClient();
    if (!client) {
      setIsConfigured(false);
      return;
    }
    // Perform a lightweight ping by fetching a minimal query
    const checkConnection = async () => {
      try {
        const { error } = await client
          .from('ahlulbayt_stories')
          .select('id', { count: 'exact', head: true });
        // A successful HTTP response (even table-not-found) means the project is reachable
        setIsConfigured(!error || error.code === '42P01' || error.code === 'PGRST116');
      } catch {
        setIsConfigured(false);
      }
    };
    checkConnection();
  }, []);

  // Fetch stories whenever configuration changes, system type changes, or is verified
  useEffect(() => {
    if (isConfigured) {
      setSelectedStoryId(null);
      fetchStories();
    }
  }, [isConfigured, systemType]);

  // Fetch chapters when selected story changes and the story is chapter-based
  useEffect(() => {
    const selectedStory = stories.find((s) => s.id === selectedStoryId);
    const isChapterStory = systemType === 'prophet' || !!selectedStory?.is_chapter_based;

    if (isConfigured && selectedStoryId && isChapterStory) {
      fetchChaptersForStory(selectedStoryId);
    } else {
      setChapters([]);
      setSelectedChapterId(null);
    }
  }, [selectedStoryId, systemType, isConfigured, stories]);

  // Fetch blocks when selected chapter changes (if chapter-based) or selected story changes (if direct)
  useEffect(() => {
    if (!isConfigured) return;

    const selectedStory = stories.find((s) => s.id === selectedStoryId);
    const isChapterStory = systemType === 'prophet' || !!selectedStory?.is_chapter_based;

    if (!isChapterStory) {
      if (selectedStoryId) {
        fetchBlocksForStory(selectedStoryId);
      } else {
        setBlocks([]);
      }
    } else {
      if (selectedChapterId) {
        fetchBlocksForChapter(selectedChapterId);
      } else {
        setBlocks([]);
      }
    }
  }, [selectedStoryId, selectedChapterId, systemType, isConfigured, stories]);

  const fetchStories = async () => {
    const client = getSupabaseClient();
    if (!client) {
      return;
    }

    setIsLoadingStories(true);
    setTableError(null);

    const tableName = systemType === 'ahlulbayt' ? 'ahlulbayt_stories' : 'stories';

    try {
      const { data, error } = await client
        .from(tableName)
        .select('*')
        .order('order_index', { ascending: true });

      if (error) {
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          setTableError(`Table "${tableName}" does not exist. Please run the Setup SQL in your Supabase SQL Editor.`);
          addToast('error', `Table "${tableName}" not found.`);
        } else {
          const errMsg = error.message || error.details || `Error code: ${error.code}`;
          throw new Error(errMsg);
        }
      } else {
        setStories(data || []);
      }
    } catch (err: any) {
      console.error('Fetch stories error:', err);
      const msg = err?.message || String(err) || 'Unknown connection error';
      addToast('error', `Failed to load stories: ${msg}`);
    } finally {
      setIsLoadingStories(false);
    }
  };

  const fetchChaptersForStory = async (storyId: string) => {
    const client = getSupabaseClient();
    if (!client) return;

    setIsLoadingChapters(true);
    try {
      const { data, error } = await client
        .from('chapters')
        .select('*')
        .eq('story_id', storyId)
        .order('order_index', { ascending: true });

      if (error) throw error;
      setChapters(data || []);
      if (data && data.length > 0) {
        setSelectedChapterId(data[0].id);
      } else {
        setSelectedChapterId(null);
      }
    } catch (err: any) {
      addToast('error', `Failed to load chapters: ${err.message}`);
    } finally {
      setIsLoadingChapters(false);
    }
  };

  const fetchBlocksForChapter = async (chapterId: string) => {
    const client = getSupabaseClient();
    if (!client) return;

    setIsLoadingBlocks(true);
    try {
      const { data, error } = await client
        .from('chapter_blocks')
        .select('*')
        .eq('chapter_id', chapterId)
        .order('order_index', { ascending: true });

      if (error) throw error;

      // Map 'text' to 'paragraph' for editor compatibility
      const mapped = (data || []).map((b: any) => ({
        ...b,
        type: b.type === 'text' ? 'paragraph' : b.type,
      }));
      setBlocks(mapped);
    } catch (err: any) {
      addToast('error', `Failed to load blocks: ${err.message}`);
    } finally {
      setIsLoadingBlocks(false);
    }
  };

  const fetchBlocksForStory = async (storyId: string) => {
    const client = getSupabaseClient();
    if (!client) return;

    setIsLoadingBlocks(true);
    try {
      const { data, error } = await client
        .from('ahlulbayt_story_blocks')
        .select('*')
        .eq('story_id', storyId)
        .order('order_index', { ascending: true });

      if (error) {
        if (error.message?.includes('does not exist') || error.code === '42P01') {
          setTableError('Table "ahlulbayt_story_blocks" does not exist.');
        } else {
          const errMsg = error.message || error.details || `Error code: ${error.code}`;
          throw new Error(errMsg);
        }
      } else {
        setBlocks(data || []);
      }
    } catch (err: any) {
      console.error('Fetch blocks error:', err);
      const msg = err?.message || String(err) || 'Unknown error fetching blocks';
      addToast('error', `Failed to load blocks: ${msg}`);
    } finally {
      setIsLoadingBlocks(false);
    }
  };

  // Add Story handler
  const handleAddStory = async (newStory: Story) => {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase not configured');

    const nextOrder = stories.length > 0 
      ? Math.max(...stories.map(s => s.order_index || 0)) + 1 
      : 1;
    
    const storyToInsert = {
      ...newStory,
      order_index: nextOrder,
      created_by: user?.id || null,
    };

    const isProphet = newStory.type === 'prophet_story';
    const tableName = isProphet ? 'stories' : 'ahlulbayt_stories';

    const { data, error } = await client
      .from(tableName)
      .insert([storyToInsert])
      .select();

    if (error) throw error;

    // Refresh lists
    addToast('success', `Created story: "${newStory.title}"`);
    await fetchStories();
    setSelectedStoryId(newStory.id);
  };

  // Update Story handler
  const handleUpdateStory = async (updatedStory: Story) => {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase not configured');

    const isProphet = updatedStory.type === 'prophet_story';
    const tableName = isProphet ? 'stories' : 'ahlulbayt_stories';

    const { error } = await client
      .from(tableName)
      .update(updatedStory)
      .eq('id', updatedStory.id);

    if (error) throw error;

    // Update state locally
    setStories((prev) =>
      prev.map((s) => (s.id === updatedStory.id ? updatedStory : s))
    );
  };

  // Delete Story handler
  const handleDeleteStory = async (storyId: string) => {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase not configured');

    const tableName = systemType === 'ahlulbayt' ? 'ahlulbayt_stories' : 'stories';

    const { error } = await client
      .from(tableName)
      .delete()
      .eq('id', storyId);

    if (error) throw error;

    // Clear selection and refresh list
    setSelectedStoryId(null);
    await fetchStories();
  };

  // Save Content Blocks handler
  const handleSaveBlocks = async (updatedBlocks: StoryBlock[]) => {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase not configured');

    setIsSavingBlocks(true);

    const selectedStory = stories.find((s) => s.id === selectedStoryId);
    const isChapterStory = systemType === 'prophet' || !!selectedStory?.is_chapter_based;

    try {
      if (!isChapterStory) {
        if (!selectedStoryId) throw new Error('No active story');
        const { error: deleteError } = await client
          .from('ahlulbayt_story_blocks')
          .delete()
          .eq('story_id', selectedStoryId);

        if (deleteError) throw deleteError;

        if (updatedBlocks.length > 0) {
          const sanitized = updatedBlocks.map(({ id, updated_at, ...rest }) => rest);
          const { error: insertError } = await client
            .from('ahlulbayt_story_blocks')
            .insert(sanitized);
          if (insertError) throw insertError;
        }
        await fetchBlocksForStory(selectedStoryId);
      } else {
        if (!selectedChapterId) throw new Error('No active chapter selected');
        const { error: deleteError } = await client
          .from('chapter_blocks')
          .delete()
          .eq('chapter_id', selectedChapterId);

        if (deleteError) throw deleteError;

        if (updatedBlocks.length > 0) {
          const sanitized = updatedBlocks.map(({ id, updated_at, ...rest }) => {
            const blockType = rest.type === 'paragraph' ? 'text' : rest.type;
            return {
              chapter_id: selectedChapterId,
              type: blockType,
              text: rest.text,
              translation: rest.translation,
              order_index: rest.order_index,
            };
          });
          const { error: insertError } = await client
            .from('chapter_blocks')
            .insert(sanitized);
          if (insertError) throw insertError;
        }
        await fetchBlocksForChapter(selectedChapterId);
      }
      addToast('success', 'Blocks saved successfully.');
    } catch (err: any) {
      addToast('error', err.message || 'Failed to save blocks.');
    } finally {
      setIsSavingBlocks(false);
    }
  };

  // Chapter CRUD handlers (Prophet stories specific)
  const handleAddChapter = async (newChapter: Omit<Chapter, 'order_index'>) => {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase not configured');
    if (!selectedStoryId) throw new Error('No active story');

    const nextOrder = chapters.length > 0
      ? Math.max(...chapters.map(c => c.order_index || 0)) + 1
      : 1;

    const chapterToInsert = {
      ...newChapter,
      story_id: selectedStoryId,
      order_index: nextOrder,
    };

    const { data, error } = await client
      .from('chapters')
      .insert([chapterToInsert])
      .select();

    if (error) throw error;

    addToast('success', `Created chapter: "${newChapter.title}"`);
    await fetchChaptersForStory(selectedStoryId);
    if (data && data.length > 0) {
      setSelectedChapterId(data[0].id);
    }
  };

  const handleUpdateChapter = async (updatedChapter: Chapter) => {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase not configured');

    const { error } = await client
      .from('chapters')
      .update(updatedChapter)
      .eq('id', updatedChapter.id);

    if (error) throw error;

    setChapters((prev) =>
      prev.map((c) => (c.id === updatedChapter.id ? updatedChapter : c))
    );
    addToast('success', t.chapterSaved);
  };

  const handleDeleteChapter = async (chapterId: string) => {
    const client = getSupabaseClient();
    if (!client) throw new Error('Supabase not configured');
    if (!selectedStoryId) throw new Error('No active story');

    // Delete all blocks belonging to this chapter FIRST to prevent orphaned records
    // (Supabase does not auto-cascade unless ON DELETE CASCADE is set in the schema)
    const { error: blocksError } = await client
      .from('chapter_blocks')
      .delete()
      .eq('chapter_id', chapterId);

    if (blocksError) throw blocksError;

    const { error } = await client
      .from('chapters')
      .delete()
      .eq('id', chapterId);

    if (error) throw error;

    addToast('success', t.chapterDeleted);
    setSelectedChapterId(null);
    await fetchChaptersForStory(selectedStoryId);
  };

  const activeStory = stories.find((s) => s.id === selectedStoryId) || null;

  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0c0e17] text-white">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  if (!user) {
    return <LoginPanel onLoginSuccess={setUser} lang={lang} />;
  }

  return (
    <div className="flex flex-col h-screen bg-[#0c0e17] text-white overflow-hidden font-sans select-none relative">
      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* Header */}
      <header className="h-16 border-b border-white/10 bg-[#0f111a] px-3 sm:px-6 flex items-center justify-between z-10 flex-shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
          <div className="hidden min-[370px]:flex h-9 w-14 sm:h-11 sm:w-20 rounded-lg bg-[#D4AF37]/5 border border-[#D4AF37]/20 items-center justify-center overflow-hidden p-1 shadow-[0_0_12px_rgba(212,175,55,0.1)] transition-all hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/35 flex-shrink-0">
            <Logo className="w-full h-full" />
          </div>
          <div className="min-w-0">
            <h1 className="font-serif text-sm sm:text-lg font-bold tracking-wider text-white flex items-center gap-1.5 sm:gap-2 truncate">
              <span className="truncate">{t.siteTitle}</span>
              <span className="text-[#D4AF37] text-[10px] sm:text-xs font-sans tracking-normal italic font-normal hidden md:inline flex-shrink-0">{t.siteSubTitle}</span>
            </h1>
            <p className="text-[8px] sm:text-[10px] text-emerald-400 font-semibold tracking-wide uppercase truncate hidden sm:block">
              {t.spiritualDashboard}
            </p>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-1 sm:gap-1.5 md:gap-3 flex-shrink-0">
          {/* Language Selector */}
          <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5" dir="ltr">
            <button
              onClick={() => setLang('en')}
              className={`px-1.5 sm:px-2.5 py-1 text-[9px] sm:text-[10px] font-bold tracking-wider rounded-md transition-all cursor-pointer ${
                lang === 'en' ? 'bg-[#D4AF37] text-black' : 'text-stone-400 hover:text-white'
              }`}
            >
              EN
            </button>
            <button
              onClick={() => setLang('ar')}
              className={`px-1.5 sm:px-2.5 py-1 text-[9px] sm:text-[10px] font-bold tracking-wider rounded-md transition-all cursor-pointer ${
                lang === 'ar' ? 'bg-[#D4AF37] text-black' : 'text-stone-400 hover:text-white'
              }`}
            >
              العربية
            </button>
          </div>

          {user && (
            <>
              <div className="flex items-center gap-1.5 sm:gap-2 px-2 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] sm:text-xs text-stone-300">
                <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] flex-shrink-0" />
                <div className="flex flex-col text-start min-w-0">
                  {user.user_metadata?.display_name && (
                    <span className="font-semibold truncate max-w-[50px] min-[360px]:max-w-[80px] sm:max-w-[120px]">
                      {user.user_metadata.display_name}
                    </span>
                  )}
                  <span className={`truncate max-w-[65px] min-[360px]:max-w-[100px] sm:max-w-[140px] font-mono ${
                    user.user_metadata?.display_name ? 'text-[8px] text-stone-500 font-normal mt-0.5' : 'font-semibold'
                  }`}>
                    {user.email}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(true)}
                  className="p-1 rounded hover:bg-white/10 text-stone-400 hover:text-white transition-colors cursor-pointer flex-shrink-0"
                  title={lang === 'ar' ? 'تعديل الملف الشخصي' : 'Edit Profile'}
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              </div>
              <button
                onClick={handleSignOut}
                className="p-1.5 sm:p-2 text-stone-400 hover:text-red-400 bg-white/5 hover:bg-red-950/20 border border-white/10 hover:border-red-500/20 rounded-lg transition-colors cursor-pointer flex items-center gap-1 sm:gap-1.5"
                title={lang === 'ar' ? 'تسجيل الخروج' : 'Log Out'}
              >
                <LogOut className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                <span className="hidden sm:inline text-[9px] sm:text-xs font-semibold">{lang === 'ar' ? 'خروج' : 'Logout'}</span>
              </button>
            </>
          )}

          {isConfigured && (
            <div 
              className="hidden sm:flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 bg-emerald-950/30 border border-emerald-500/20 rounded-full text-xs text-emerald-400"
              title={t.databaseConnected}
            >
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-400 flex-shrink-0" />
              <span className="hidden sm:inline text-[9px] sm:text-xs font-medium">{t.databaseConnected}</span>
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace Grid */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {tableError ? (
          /* Table missing warning screen */
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-transparent">
            <div className="max-w-xl w-full bg-white/5 border border-white/10 rounded-2xl p-8 text-center space-y-6 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] backdrop-blur-md">
              <div className="mx-auto w-16 h-16 bg-red-950/30 border border-red-500/30 rounded-full flex items-center justify-center text-red-400">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="font-serif text-2xl font-bold tracking-wide text-white">
                  {t.tablesMissing}
                </h2>
                <p className="text-stone-300 text-sm leading-relaxed">
                  {t.tablesMissingDesc}
                </p>
              </div>

              <div className="p-4 bg-black/35 rounded-xl border border-white/10 text-left" dir="ltr">
                <p className="text-xs font-mono text-stone-350 select-all leading-relaxed whitespace-pre-wrap">
                  {`CREATE TABLE ahlulbayt_stories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  imam_id TEXT NOT NULL,
  imam_name TEXT NOT NULL,
  category TEXT NOT NULL,
  summary TEXT,
  estimated_minutes INTEGER DEFAULT 3,
  narrator TEXT,
  moral TEXT,
  tags TEXT,
  author TEXT DEFAULT 'مكتبة سراج الأثر',
  order_index INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);`}
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <button
                  id="recheck-tables-btn"
                  onClick={fetchStories}
                  className="w-full py-2.5 bg-emerald-850 hover:bg-emerald-700 text-white font-semibold text-xs uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  {t.recheckConnection}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* On mobile: show Sidebar OR editor, never both at once */}
            <Sidebar
              currentUser={user}
              stories={stories}
              selectedStoryId={selectedStoryId}
              onSelectStory={setSelectedStoryId}
              onAddStoryOpen={() => setIsAddStoryOpen(true)}
              isLoading={isLoadingStories}
              lang={lang}
              systemType={systemType}
              onSystemTypeChange={setSystemType}
            />

            {/* On mobile: only render editor when a story is active */}
            <div className={`flex-1 flex flex-col overflow-hidden ${
              selectedStoryId ? 'flex' : 'hidden md:flex'
            }`}>
              <MainEditorPanel
                currentUser={user}
                currentUserRole={userRole}
                story={activeStory}
                onUpdateStory={handleUpdateStory}
                onDeleteStory={handleDeleteStory}
                blocks={blocks}
                isLoadingBlocks={isLoadingBlocks}
                onSaveBlocks={handleSaveBlocks}
                isSavingBlocks={isSavingBlocks}
                addToast={addToast}
                lang={lang}
                onDeselectStory={() => setSelectedStoryId(null)}
                systemType={systemType}
                chapters={chapters}
                selectedChapterId={selectedChapterId}
                onSelectChapter={setSelectedChapterId}
                isLoadingChapters={isLoadingChapters}
                onAddChapter={handleAddChapter}
                onUpdateChapter={handleUpdateChapter}
                onDeleteChapter={handleDeleteChapter}
                stories={stories}
                onSelectStory={setSelectedStoryId}
              />
            </div>
          </>
        )}
      </div>

      {/* Add Story Form Modal — lazy loaded, only parsed when first opened */}
      <Suspense fallback={null}>
        <AddStoryModal
          isOpen={isAddStoryOpen}
          onClose={() => setIsAddStoryOpen(false)}
          onAdd={handleAddStory}
          lang={lang}
          currentUser={user}
        />
      </Suspense>

      {/* Profile Edit Modal — lazy loaded */}
      {isProfileModalOpen && (
        <Suspense fallback={null}>
          <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => setIsProfileModalOpen(false)}
            currentUser={user}
            onUpdateUser={(updatedUser) => {
              setUser(updatedUser);
            }}
            lang={lang}
            addToast={addToast}
          />
        </Suspense>
      )}
    </div>
  );
}
