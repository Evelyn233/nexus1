# Profile 页面臃肿问题

## 现状
- `app/profile/page.tsx` 约 **6752 行**
- 单文件过大导致 Cursor/IDE 解析慢、内存占用高、易崩溃

## 大文件排行
| 文件 | 行数 |
|------|------|
| app/profile/page.tsx | ~6752 |
| app/u/[userId]/page.tsx | ~974 |
| lib/userInfoService.ts | ~1024 |
| app/square/page.tsx | ~872 |
| app/u/[userId]/project/[createdAt]/page.tsx | ~862 |

## 建议拆分（逐步进行）
1. **ProfileProjectMetaEditor** - 项目编辑弹窗 (~1000 行) → `components/profile/ProfileProjectMetaEditor.tsx`
2. **ProfilePreviewCard** - 右侧预览卡片 → `components/profile/ProfilePreviewCard.tsx`
3. **ProfileModals** - 各类弹窗（tags, insights, add activity 等）→ 独立组件

## 注意
- 拆分时保持 profile 和 project 核心逻辑不变
- 添加数据库功能需保留
