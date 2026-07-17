export type StorySystemType = 'ahlulbayt' | 'prophet';

/** Publication status for the review workflow */
export type StoryStatus = 'draft' | 'review' | 'published';

export interface Story {
  id: string;
  title: string;
  summary: string;
  estimated_minutes: number;
  tags: string; // Comma-separated string, e.g. "Patience,Imam Ali,Hadith"
  author?: string; // Ahl al-Bayt specific (optional for Prophets)
  order_index: number;
  updated_at?: string;
  created_by?: string;
  /** Review workflow status — defaults to 'draft' for new stories */
  status?: StoryStatus;
  is_chapter_based?: boolean;

  // Ahl al-Bayt specific
  imam_id?: string;
  imam_name?: string;
  category?: string;
  narrator?: string;
  moral?: string;

  // Prophet specific
  type?: 'prophet_story';
  short_name?: string;
  introduction?: string;
  hero_image?: string;
  category_label?: string;
  category_section?: string;
}

export type BlockType = 'paragraph' | 'verse' | 'quote' | 'text';

export interface StoryBlock {
  id?: number;
  story_id?: string;
  chapter_id?: string; // Used for prophet story chapters
  type: BlockType;
  text: string;
  translation: string; // Translation/reference for verses, attribution for quotes
  order_index: number;
  updated_at?: string;
}

export interface Chapter {
  id: string;
  story_id: string;
  title: string;
  subtitle: string;
  label: string;
  image?: string;
  image_path?: string;
  featured?: boolean;
  accent?: string;
  icon?: string;
  order_index: number;
  updated_at?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}
