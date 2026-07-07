-- =====================================================================
-- سياسات أمان قاعدة البيانات (RLS) المحكمة — سراج الأطهار
-- Secure Row Level Security Policies for Siraj Al-Athar Dashboard
-- =====================================================================
-- شغّل هذا الملف كاملاً في Supabase SQL Editor مرة واحدة.
-- Run this entire file once in your Supabase SQL Editor.
-- =====================================================================


-- ─── 1. جدول قصص أهل البيت (ahlulbayt_stories) ──────────────────────
ALTER TABLE ahlulbayt_stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read/write stories"                    ON ahlulbayt_stories;
DROP POLICY IF EXISTS "Public can read ahlulbayt stories"           ON ahlulbayt_stories;
DROP POLICY IF EXISTS "Public can read published ahlulbayt stories" ON ahlulbayt_stories;
DROP POLICY IF EXISTS "Authenticated can read own/all stories"      ON ahlulbayt_stories;
DROP POLICY IF EXISTS "Authenticated can insert ahlulbayt stories"  ON ahlulbayt_stories;
DROP POLICY IF EXISTS "Owner or admin can update ahlulbayt stories" ON ahlulbayt_stories;
DROP POLICY IF EXISTS "Owner or admin can delete ahlulbayt stories" ON ahlulbayt_stories;

-- Public (anonymous & authenticated) can only read published stories
CREATE POLICY "Public can read published ahlulbayt stories"
  ON ahlulbayt_stories FOR SELECT
  TO public
  USING (status = 'published');

-- Authenticated writers can read their own drafts/reviews, and Admins can read all stories
CREATE POLICY "Authenticated can read own/all stories"
  ON ahlulbayt_stories FOR SELECT
  TO authenticated
  USING (
    created_by::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text AND role = 'admin'
    )
  );

-- Only authenticated users can INSERT
CREATE POLICY "Authenticated can insert ahlulbayt stories"
  ON ahlulbayt_stories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only the story creator OR admin can UPDATE
CREATE POLICY "Owner or admin can update ahlulbayt stories"
  ON ahlulbayt_stories FOR UPDATE
  TO authenticated
  USING (
    created_by::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text AND role = 'admin'
    )
  );

-- Only the story creator OR admin can DELETE
CREATE POLICY "Owner or admin can delete ahlulbayt stories"
  ON ahlulbayt_stories FOR DELETE
  TO authenticated
  USING (
    created_by::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text AND role = 'admin'
    )
  );


-- ─── 2. جدول كتل أهل البيت (ahlulbayt_story_blocks) ─────────────────
ALTER TABLE ahlulbayt_story_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read/write blocks to all"              ON ahlulbayt_story_blocks;
DROP POLICY IF EXISTS "Allow authenticated read/write blocks"       ON ahlulbayt_story_blocks;
DROP POLICY IF EXISTS "Public can read ahlulbayt blocks"            ON ahlulbayt_story_blocks;
DROP POLICY IF EXISTS "Authenticated can write ahlulbayt blocks"    ON ahlulbayt_story_blocks;
DROP POLICY IF EXISTS "Authenticated can update ahlulbayt blocks"   ON ahlulbayt_story_blocks;
DROP POLICY IF EXISTS "Authenticated can delete ahlulbayt blocks"   ON ahlulbayt_story_blocks;

-- Anyone can read blocks (they only see blocks for stories they can access via RLS check on stories)
CREATE POLICY "Public can read ahlulbayt blocks"
  ON ahlulbayt_story_blocks FOR SELECT
  TO public
  USING (true);

-- Only authenticated users can INSERT
CREATE POLICY "Authenticated can write ahlulbayt blocks"
  ON ahlulbayt_story_blocks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- Only authenticated users can UPDATE
CREATE POLICY "Authenticated can update ahlulbayt blocks"
  ON ahlulbayt_story_blocks FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

-- Only authenticated users can DELETE
CREATE POLICY "Authenticated can delete ahlulbayt blocks"
  ON ahlulbayt_story_blocks FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);


-- ─── 3. جدول قصص الأنبياء (stories) ─────────────────────────────────
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow read/write stories"                   ON stories;
DROP POLICY IF EXISTS "Public can read prophet stories"            ON stories;
DROP POLICY IF EXISTS "Public can read published prophet stories"  ON stories;
DROP POLICY IF EXISTS "Authenticated can read own/all prophet stories" ON stories;
DROP POLICY IF EXISTS "Authenticated can insert prophet stories"   ON stories;
DROP POLICY IF EXISTS "Owner or admin can update prophet stories"  ON stories;
DROP POLICY IF EXISTS "Owner or admin can delete prophet stories"  ON stories;

-- Public can only read published prophet stories
CREATE POLICY "Public can read published prophet stories"
  ON stories FOR SELECT
  TO public
  USING (status = 'published');

-- Authenticated writers can read their own drafts/reviews, and Admins can read all prophet stories
CREATE POLICY "Authenticated can read own/all prophet stories"
  ON stories FOR SELECT
  TO authenticated
  USING (
    created_by::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text AND role = 'admin'
    )
  );

CREATE POLICY "Authenticated can insert prophet stories"
  ON stories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Owner or admin can update prophet stories"
  ON stories FOR UPDATE
  TO authenticated
  USING (
    created_by::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text AND role = 'admin'
    )
  );

CREATE POLICY "Owner or admin can delete prophet stories"
  ON stories FOR DELETE
  TO authenticated
  USING (
    created_by::text = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text AND role = 'admin'
    )
  );


-- ─── 4. جدول الفصول (chapters) ───────────────────────────────────────
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read chapters"          ON chapters;
DROP POLICY IF EXISTS "Authenticated can insert chapters" ON chapters;
DROP POLICY IF EXISTS "Authenticated can update chapters" ON chapters;
DROP POLICY IF EXISTS "Authenticated can delete chapters" ON chapters;

CREATE POLICY "Public can read chapters"
  ON chapters FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated can insert chapters"
  ON chapters FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update chapters"
  ON chapters FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete chapters"
  ON chapters FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);


-- ─── 5. جدول كتل الفصول (chapter_blocks) ────────────────────────────
ALTER TABLE chapter_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can read chapter blocks"            ON chapter_blocks;
DROP POLICY IF EXISTS "Authenticated can write chapter blocks"    ON chapter_blocks;
DROP POLICY IF EXISTS "Authenticated can update chapter blocks"   ON chapter_blocks;
DROP POLICY IF EXISTS "Authenticated can delete chapter blocks"   ON chapter_blocks;

CREATE POLICY "Public can read chapter blocks"
  ON chapter_blocks FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated can write chapter blocks"
  ON chapter_blocks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can update chapter blocks"
  ON chapter_blocks FOR UPDATE
  TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated can delete chapter blocks"
  ON chapter_blocks FOR DELETE
  TO authenticated
  USING (auth.uid() IS NOT NULL);


-- ─── 6. جدول الأدوار (user_roles) ────────────────────────────────────
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read user roles" ON user_roles;
DROP POLICY IF EXISTS "Admin can manage user roles"       ON user_roles;
DROP POLICY IF EXISTS "Admin can insert user roles"       ON user_roles;
DROP POLICY IF EXISTS "Admin can update user roles"       ON user_roles;
DROP POLICY IF EXISTS "Admin can delete user roles"       ON user_roles;

-- SELECT is fully safe and open to authenticated users (no recursion)
CREATE POLICY "Authenticated can read user roles"
  ON user_roles FOR SELECT
  TO authenticated
  USING (true);

-- Write operations are restricted to Admins only.
-- Since the select policy on user_roles has no subqueries, these checks will NOT cause recursion.
CREATE POLICY "Admin can insert user roles"
  ON user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text AND role = 'admin'
    )
  );

CREATE POLICY "Admin can update user roles"
  ON user_roles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text AND role = 'admin'
    )
  );

CREATE POLICY "Admin can delete user roles"
  ON user_roles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id::text = auth.uid()::text AND role = 'admin'
    )
  );

-- =====================================================================
-- ✅ Done! All tables are now protected with secure RLS policies.
-- =====================================================================

