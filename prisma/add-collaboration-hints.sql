-- 新增潜在合作表：访客查看被访者 profile 时生成，自动入库
CREATE TABLE IF NOT EXISTS "collaboration_hints" (
    "id" TEXT NOT NULL,
    "viewerUserId" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "hint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collaboration_hints_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "collaboration_hints_viewerUserId_targetUserId_key" ON "collaboration_hints"("viewerUserId", "targetUserId");
CREATE INDEX IF NOT EXISTS "collaboration_hints_viewerUserId_idx" ON "collaboration_hints"("viewerUserId");
CREATE INDEX IF NOT EXISTS "collaboration_hints_targetUserId_idx" ON "collaboration_hints"("targetUserId");
