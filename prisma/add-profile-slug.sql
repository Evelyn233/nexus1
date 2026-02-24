-- 仅添加 users.profileSlug 列（不执行 db push，避免影响 rag_chunks 等表）
-- 在 Neon SQL Editor 执行，或: npx prisma db execute --file prisma/add-profile-slug.sql

-- PostgreSQL: 若列已存在则跳过
ALTER TABLE users ADD COLUMN IF NOT EXISTS "profileSlug" TEXT;

-- 唯一约束：允许多个 NULL，但不允许重复非空值
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_profileSlug_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_profileSlug_key UNIQUE ("profileSlug");
  END IF;
END $$;
