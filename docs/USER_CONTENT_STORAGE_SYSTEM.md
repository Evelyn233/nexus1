# 用户生成内容存储系统

## 📋 系统概述

建立了一个完整的用户生成内容存储系统，用于保存每次生图的所有数据，包括：
- 用户输入（元键入、问题、回答）
- 生成的场景数据
- 生成的故事
- 生成的图片
- 用户状态快照
- 元数据快照

---

## 🗄️ 数据库结构

### UserGeneratedContent 表

```prisma
model UserGeneratedContent {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // 用户输入
  initialPrompt String   // 用户元键入
  questions     String   // JSON数组：问题列表
  answers       String   // JSON数组：回答列表
  
  // 生成的场景数据
  scenes        String   // JSON格式：SceneGenerationResult
  // scenes包含：coreKeywords, coreScenes, logicalScenes, storyDescription, narrative
  
  // 生成的故事
  storyNarrative String? // 故事叙述
  
  // 生成的图片
  images        String   // JSON数组：[{sceneTitle, prompt, imageUrl, localPath}, ...]
  imageCount    Int      @default(0)
  
  // 生成时的用户状态快照
  userSnapshot  String?  // JSON格式：{age, location, personality, hairLength, ...}
  
  // 元数据快照（生成时的用户元数据）
  metadataSnapshot String? // JSON格式：personality, traits, preferences
  
  // 生成状态
  status        String   @default("draft") // draft, processing, completed, failed
  
  // 标签和分类
  tags          String?  // JSON数组：用户可以添加的标签
  category      String?  // 分类：daily, memory, milestone, etc.
  
  // 时间戳
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@map("user_generated_contents")
}
```

---

## 📁 文件结构

### 1. 数据库 Schema
- **文件**: `prisma/schema.prisma`
- **新增**: `UserGeneratedContent` 模型
- **关系**: 与 `User` 表一对多关系

### 2. API Endpoint
- **文件**: `app/api/user/generated-content/route.ts`
- **功能**:
  - `POST`: 保存生成内容
  - `GET`: 获取内容列表（支持分页、分类过滤）
  - `PUT`: 获取单个内容详情

### 3. Service 层
- **文件**: `lib/userContentStorageService.ts`
- **函数**:
  - `saveUserGeneratedContent()`: 保存生成内容
  - `getUserGeneratedContents()`: 获取内容列表
  - `getUserGeneratedContentDetail()`: 获取内容详情

### 4. 生图页面集成
- **文件**: `app/generate/page.tsx`
- **修改**: 在图片生成完成后自动保存到数据库
- **函数**: `saveGeneratedContentToDB()`

### 5. 历史记录页面
- **文件**: `app/history/page.tsx`
- **功能**: 展示用户的生成历史记录

### 6. 导航菜单
- **文件**: `components/UserMenu.tsx`
- **修改**: 添加"生成历史"入口

---

## 🔄 数据流

### 保存流程

```
用户生成内容
    ↓
app/generate/page.tsx
  - 图片生成完成
  - 调用 saveGeneratedContentToDB()
    ↓
lib/userContentStorageService.ts
  - 获取用户信息快照
  - 获取元数据快照
  - 构建完整数据
    ↓
/api/user/generated-content (POST)
  - 验证用户登录
  - 创建数据库记录
    ↓
prisma.userGeneratedContent.create()
  - 保存到数据库
    ↓
✅ 保存成功
```

### 查询流程

```
用户访问历史页面
    ↓
app/history/page.tsx
  - 调用 getUserGeneratedContents()
    ↓
lib/userContentStorageService.ts
  - 构建查询参数
    ↓
/api/user/generated-content (GET)
  - 验证用户登录
  - 查询数据库
    ↓
prisma.userGeneratedContent.findMany()
  - 返回内容列表
    ↓
✅ 显示历史记录
```

---

## 💾 存储的数据结构

### 完整数据示例

```json
{
  "id": "clxxx...",
  "userId": "cmgm6e4mv...",
  "initialPrompt": "我中午起床 听podcast 父母出门了 我出门上班了",
  "questions": [
    "你听podcast时是在哪里？",
    "父母出门前说了什么吗？",
    "你出门上班路上做了什么？"
  ],
  "answers": [
    "在卧室床上 iPhone 很暗 粉色睡衣",
    "说去买菜",
    "继续听podcast 思考AI伦理"
  ],
  "scenes": {
    "coreKeywords": ["bedroom", "podcast", "parents leaving", "going to work"],
    "logicalScenes": [
      {
        "title": "Waking Up and Listening to Podcast",
        "description": "26-year-old Chinese female, 165cm, long hair, lying in bed wearing pink pajamas...",
        "location": "Home - Bedroom",
        "age": 26,
        "peopleCount": "alone",
        "visualDetails": { ... }
      },
      {
        "title": "Parents Leaving Home",
        "description": "26-year-old Chinese female watching parents leave, door closing...",
        "location": "Home - Entrance",
        "age": 26,
        "peopleCount": "with parents (leaving)",
        "visualDetails": { ... }
      },
      // ... 更多场景
    ],
    "storyDescription": "中午醒来，开始听播客...",
    "narrative": "那是一个平静的中午..."
  },
  "images": [
    {
      "sceneTitle": "Waking Up and Listening to Podcast",
      "sceneIndex": 0,
      "prompt": "A 26-year-old Chinese female, 165cm, long hair...",
      "imageUrl": "https://...",
      "localPath": "/public/generated-images/..."
    },
    // ... 更多图片
  ],
  "imageCount": 4,
  "userSnapshot": {
    "name": "Evelyn",
    "gender": "female",
    "age": 26,
    "height": "165",
    "hairLength": "long hair",
    "location": "上海",
    "personality": "INTJ..."
  },
  "metadataSnapshot": {
    "corePersonalityTraits": [...],
    "communicationStyle": [...],
    "emotionalPattern": [...]
  },
  "category": "daily",
  "tags": [],
  "status": "completed",
  "createdAt": "2025-10-13T12:00:00.000Z",
  "updatedAt": "2025-10-13T12:00:00.000Z"
}
```

---

## 🎯 功能特点

### 1. 完整记录
- ✅ 保存用户输入（元键入、问答）
- ✅ 保存生成的场景数据（完整的SceneGenerationResult）
- ✅ 保存生成的故事
- ✅ 保存所有生成的图片（URL和提示词）
- ✅ 保存用户状态快照（生成时的用户信息）
- ✅ 保存元数据快照（生成时的性格分析）

### 2. 时间快照
- ✅ 记录生成时的用户年龄、身高、头发等信息
- ✅ 记录生成时的性格分析结果
- ✅ 即使用户信息后来改变，历史记录仍保持生成时的状态

### 3. 分类和标签
- ✅ 支持内容分类（daily, memory, milestone等）
- ✅ 支持自定义标签
- ✅ 方便后续检索和筛选

### 4. 状态管理
- ✅ 记录生成状态（draft, processing, completed, failed）
- ✅ 支持未来扩展（如：重新生成、编辑等）

---

## 📡 API 接口

### POST /api/user/generated-content
保存生成内容

**请求体：**
```json
{
  "initialPrompt": "用户元键入",
  "questions": ["问题1", "问题2"],
  "answers": ["回答1", "回答2"],
  "scenes": { ... },
  "storyNarrative": "故事叙述",
  "images": [{ sceneTitle, prompt, imageUrl, localPath }],
  "userSnapshot": { ... },
  "metadataSnapshot": { ... },
  "category": "daily",
  "tags": ["tag1", "tag2"]
}
```

**响应：**
```json
{
  "success": true,
  "contentId": "clxxx...",
  "message": "内容保存成功"
}
```

### GET /api/user/generated-content
获取内容列表

**查询参数：**
- `limit`: 每页数量（默认10）
- `offset`: 偏移量（默认0）
- `category`: 分类过滤（可选）

**响应：**
```json
{
  "success": true,
  "contents": [
    {
      "id": "...",
      "initialPrompt": "...",
      "imageCount": 4,
      "category": "daily",
      "tags": [],
      "status": "completed",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "total": 10,
  "hasMore": true
}
```

### PUT /api/user/generated-content
获取内容详情

**请求体：**
```json
{
  "contentId": "clxxx..."
}
```

**响应：**
```json
{
  "success": true,
  "content": {
    // 完整的内容数据，所有JSON字段已解析
  }
}
```

---

## 🚀 使用方式

### 1. 自动保存
在 `app/generate/page.tsx` 中，图片生成完成后会自动保存：

```typescript
// 所有场景图片生成完成
const validImages = allImageUrls.filter(url => url)
setGeneratedImages(validImages)
setGenerationMessage(`🎉 完成！共生成${validImages.length}个场景图片`)

// 💾 保存生成内容到数据库
await saveGeneratedContentToDB(scenePrompts, allImageUrls)
```

### 2. 查看历史
用户可以通过以下方式查看历史记录：
- 点击用户菜单 → "生成历史"
- 直接访问 `/history` 页面

### 3. 查看详情
点击历史记录中的任意一条，可以查看：
- 完整的对话记录
- 所有生成的场景
- 所有生成的图片
- 生成时的用户状态

---

## 🎨 UI 设计

### 历史记录页面
- **卡片式布局**：每条记录显示为一个卡片
- **关键信息**：元键入、图片数量、分类、标签、时间
- **响应式设计**：支持桌面和移动端
- **分页加载**：支持加载更多

### 卡片内容
```
┌─────────────────────────────┐
│ 我中午起床 听podcast...      │  ← 元键入（标题）
│                             │
│ 📷 4 张图片                  │  ← 图片数量
│                             │
│ [daily] [tag1] [tag2]       │  ← 分类和标签
│                             │
│ 📅 2025年10月13日 12:00     │  ← 创建时间
└─────────────────────────────┘
```

---

## 📊 数据统计

### 可以实现的统计功能
1. **生成次数**：用户总共生成了多少次
2. **图片总数**：生成了多少张图片
3. **最常用的标签**：用户最常使用的标签
4. **分类分布**：daily vs memory vs milestone
5. **时间分布**：每月/每周生成频率
6. **场景类型**：最常生成的场景类型

---

## 🔮 未来扩展

### 1. 内容管理
- [ ] 编辑标签和分类
- [ ] 删除历史记录
- [ ] 收藏/置顶
- [ ] 分享功能

### 2. 内容重用
- [ ] 从历史记录重新生成
- [ ] 基于历史记录创建变体
- [ ] 合并多个历史记录

### 3. 高级检索
- [ ] 按时间范围搜索
- [ ] 按关键词搜索
- [ ] 按场景类型筛选
- [ ] 按标签筛选

### 4. 数据分析
- [ ] 生成频率分析
- [ ] 偏好场景分析
- [ ] 情绪变化趋势
- [ ] 个性化推荐

---

## ✅ 已实现功能

### 数据库
- ✅ UserGeneratedContent 表创建
- ✅ 与 User 表的关系建立
- ✅ 数据库同步完成

### API
- ✅ POST 保存内容接口
- ✅ GET 获取列表接口（支持分页）
- ✅ PUT 获取详情接口
- ✅ 用户权限验证

### Service
- ✅ saveUserGeneratedContent() 保存服务
- ✅ getUserGeneratedContents() 列表服务
- ✅ getUserGeneratedContentDetail() 详情服务
- ✅ 用户状态快照
- ✅ 元数据快照

### 前端
- ✅ 生图页面自动保存集成
- ✅ 历史记录页面创建
- ✅ 用户菜单添加入口
- ✅ 卡片式布局
- ✅ 响应式设计

---

## 🎯 核心优势

### 1. 完整性
每次生成都完整保存，包括：
- 用户输入的每一个字
- AI生成的每一个场景
- 每一张生成的图片
- 生成时的用户状态

### 2. 可追溯性
- 可以回看任何一次生成的完整过程
- 可以看到生成时用户的状态和性格
- 可以分析用户的变化趋势

### 3. 可重用性
- 可以基于历史记录重新生成
- 可以对比不同时期的生成结果
- 可以提取常用的提示词模板

### 4. 安全性
- 用户权限验证
- 数据级联删除
- 只能访问自己的记录

---

## 📝 使用示例

### 保存内容

```typescript
import { saveUserGeneratedContent } from '@/lib/userContentStorageService'

const result = await saveUserGeneratedContent({
  initialPrompt: "我中午起床 听podcast 父母出门了 我出门上班了",
  questions: ["你听podcast时是在哪里？", "父母去哪了？"],
  answers: ["在卧室 iPhone 很暗", "去买菜"],
  scenes: sceneGenerationResult,
  storyNarrative: "那是一个平静的中午...",
  images: [
    {
      sceneTitle: "Waking Up",
      sceneIndex: 0,
      prompt: "A 26-year-old Chinese female...",
      imageUrl: "https://...",
      localPath: null
    }
  ],
  category: 'daily',
  tags: ['生活', 'podcast']
})

if (result.success) {
  console.log('保存成功，ID:', result.contentId)
}
```

### 获取历史

```typescript
import { getUserGeneratedContents } from '@/lib/userContentStorageService'

const result = await getUserGeneratedContents(10, 0, 'daily')

if (result.success) {
  console.log('历史记录:', result.contents)
  console.log('总数:', result.total)
  console.log('还有更多:', result.hasMore)
}
```

---

## 🎉 总结

用户生成内容存储系统已完成，现在：
1. ✅ 每次生图都会自动保存到数据库
2. ✅ 保存完整的输入、场景、图片、状态快照
3. ✅ 用户可以在"生成历史"页面查看所有记录
4. ✅ 支持分页、分类、标签等功能
5. ✅ 为未来的内容管理和分析打下基础

用户的每一次创作都会被完整记录，形成个人的创作历史档案！










