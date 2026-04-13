# 修改说明

## 已修复的问题

### 1. 图片上传预览不显示
**问题**：上传的图片在卡片编辑页面没有预览  
**原因**：`AttachmentBlock` 组件在没有 `pageHref`（链接地址）时返回 `null`，导致纯图片附件不显示  
**修复**：修改 `components/ProjectCard.tsx` 中的 `AttachmentBlock` 函数，使其在没有链接时也能显示纯图片

### 2. 缺少图片提交按钮
**问题**：上传图片后没有明确的提交按钮，用户不知道如何确认添加  
**修复**：在 `app/card/page.tsx` 的 `AttachmentItem` 组件中，为图片类型添加了提交按钮：
- 按钮样式与链接提交按钮一致
- 点击后设置 `linkSubmitted: true`，确认图片加入最终卡片
- 提交后显示绿色确认信息

## 修改的文件

- `components/ProjectCard.tsx` — 修改 AttachmentBlock 组件
- `app/card/page.tsx` — 添加图片提交按钮

## 测试方法

1. 访问 `/card` 页面
2. 添加图片附件（拖拽或点击上传）
3. 图片预览应该正常显示
4. 点击 "Submit — add image to card" 按钮
5. 按钮变为绿色确认信息 "此图片已确认加入卡片"
6. 继续填写问卷并生成卡片，图片应该出现在最终卡片中
