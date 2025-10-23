# 📐 系统架构文档

## 🏗️ 整体架构

### 技术栈
- **前端框架**: Next.js 14 (App Router)
- **UI库**: React 18 + TypeScript
- **样式**: Tailwind CSS
- **数据库**: SQLite (开发环境) / Prisma ORM
- **认证**: NextAuth.js
- **AI服务**: DeepSeek API
- **图像生成**: Flux API

---

## 📊 核心数据架构：两层数据结构

### 表意识层（Conscious Layer）
**存储位置**: `UserMetadata` 表 + `ChatSession` 表

**核心字段**:
```typescript
{
  // 用户原始输入
  userRawInputs: string[]           // 用户真实说的话
  userMentionedKeywords: string[]   // 用户提到的关键词
  userMentionedLocations: Location[] // 用户提到的地点
  userMentionedActivities: string[] // 用户提到的活动
  userMentionedFoods: string[]      // 用户提到的食物
  userMentionedPeople: string[]     // 用户提到的人物
  
  // 用户自我填写
  userProfile: {
    personality: string    // 性格描述
    mbti: string          // MBTI类型
    interests: string[]   // 兴趣爱好
  }
}
```

### 潜意识层（Subconscious Layer）
**存储位置**: `UserMetadata` 表（AI分析字段）

**核心字段**:
```typescript
{
  // 性格分析
  coreTraits: string[]              // 核心性格特质
  emotionalPattern: string[]        // 情绪模式
  behaviorPatterns: string[]        // 行为模式
  
  // 社交分析
  communicationStyle: string[]      // 沟通风格
  interpersonalStrengths: string[]  // 人际优势
  interpersonalChallenges: string[] // 人际挑战
  socialEnergyPattern: string[]     // 社交能量模式
  
  // 生活方式
  aestheticPreferences: string[]    // 审美偏好
  lifestyleHobbies: string[]       // 生活方式和爱好
  activityPreferences: string[]     // 活动偏好
  
  // 地点分析
  frequentLocations: string[]       // 常去地点（AI推断）
  favoriteVenues: string[]          // 喜欢的场所类型（AI推断）
  
  // 深度洞察
  conversationInsights: string[]    // 对话洞察
  stressResponse: string[]          // 压力应对
  careerAptitude: string[]          // 职业倾向
}
```

---

## 🔄 核心功能流程

### 1. 智能对话流程
```
用户输入 → AI提问 → 用户回答 → 元数据更新 → 场景生成
```

**关键文件**:
- `app/chat-new/page.tsx` - 前端对话页面
- `lib/doubaoService.ts` - AI提问生成
- `app/api/user/metadata/route.ts` - 元数据更新API

**数据流**:
1. 用户输入初始prompt
2. AI分析并生成深度问题（最多3个）
3. 用户回答问题
4. **表意识层**: 存储用户原始输入到 `userRawInputs`
5. **潜意识层**: AI分析对话，更新性格、情绪等字段
6. 收集足够信息后生成场景

### 2. 场景生成流程
```
基础场景生成 → 情绪检测 → 心理剧插入 → 图像生成
```

**关键文件**:
- `lib/sceneGenerationService.ts` - 基础场景生成（3个场景）
- `lib/psychodramaSceneService.ts` - 心理剧场景生成
- `lib/contentGenerationService.ts` - 内容生成协调

**流程**:
1. **基础场景生成**（最多3个）
   - 根据用户输入识别关键事件
   - 每个事件生成一个场景
   - 必须有用户语义支撑

2. **心理剧检测与插入**
   - 对每个场景评估置信度
   - 置信度规则：
     * `+0.25` 包含老板角色
     * `+0.25` 激烈情绪
     * `+0.30` 情绪冲突
     * `+0.20` 主角是他人
   - 置信度 ≥ 0.70 → 在该场景后插入心理剧
   - 心理剧基于真实地点和情境

3. **最终输出**
   - 3-5个场景（3个基础 + 0-2个心理剧）
   - 每个场景包含 `mainCharacter` 字段

### 3. 心理剧生成策略

**置信度驱动**:
```typescript
// 场景评分
if (包含老板) confidence += 0.25
if (包含会议) confidence += 0.15
if (时间对比) confidence += 0.20
if (激烈动作) confidence += 0.25
if (情绪冲突) confidence += 0.30
if (主角是他人) confidence += 0.20

// 筛选
if (confidence >= 0.70) {
  插入心理剧场景
}
```

**心理剧内容**:
- `innerMonologue` - 内心独白
- `surfaceVsInner` - 表面vs内心对比
- `consciousnessStream` - 意识流
- `psychologicalSymbolism` - 心理象征
- `imagePrompt` - **戏剧化写实风格**提示词（强烈情绪表达，高对比光线，电影级构图）
  - 必须以 `PSYCHODRAMA -` 开头
  - 情绪从 subtle → VISIBLE（眼睛瞪大、嘴巴张开、肩膀抖动）
  - 戏剧化光线（DRAMATIC SIDE LIGHTING, HIGH CONTRAST）
  - 前景特写 + 背景虚化（SHARP FOCUS + HEAVILY BLURRED）

### 4. 杂志封面生成
```
故事分析 → 封面元素生成 → 图像生成
```

**关键文件**:
- `lib/magazineCoverService.ts` - 封面生成服务
- `app/api/generate-magazine-cover/route.ts` - API路由

**流程**:
1. 分析故事内容和情绪
2. 动态生成封面元素：
   - 大标题（核心冲突）
   - 副标题（情感张力）
   - 封面风格（基于故事类型）
   - 艺术风格（基于情绪基调）
3. 生成封面图像

---

## 🗂️ 目录结构

```
magazine/
├── app/                          # Next.js App Router
│   ├── api/                     # API路由
│   │   ├── auth/               # NextAuth认证
│   │   ├── ai/chat/            # AI聊天代理
│   │   ├── doubao-chat/        # DouBao API代理
│   │   ├── user/
│   │   │   ├── metadata/       # 元数据CRUD
│   │   │   ├── info/          # 用户信息
│   │   │   └── two-layer-data/ # 两层数据查询
│   │   ├── chat-sessions/      # 聊天会话
│   │   ├── generate-content/   # 内容生成
│   │   └── generate-magazine-cover/ # 封面生成
│   │
│   ├── chat-new/               # 智能对话页面
│   ├── generate/               # 场景生成页面
│   ├── two-layer-data/         # 两层数据展示页面
│   └── profile/                # 用户资料页面
│
├── lib/                         # 核心服务层
│   ├── doubaoService.ts        # AI深度提问
│   ├── sceneGenerationService.ts    # 场景生成
│   ├── psychodramaSceneService.ts   # 心理剧生成
│   ├── contentGenerationService.ts  # 内容协调
│   ├── magazineCoverService.ts      # 封面生成
│   ├── userDataApi.ts          # 用户数据API
│   ├── imageGeneration.ts      # 图像生成
│   └── sceneStoryMappingService.ts  # 场景-故事映射
│
├── prisma/
│   └── schema.prisma           # 数据库模型
│
└── components/                  # React组件
```

---

## 📡 API路由详解

### 认证相关
- `POST /api/auth/[...nextauth]` - NextAuth认证

### 用户数据
- `GET /api/user/info` - 获取用户基本信息
- `GET /api/user/metadata` - 获取用户元数据
- `POST /api/user/metadata` - 更新元数据
- `GET /api/user/two-layer-data` - 获取两层数据结构

### 聊天会话
- `GET /api/chat-sessions` - 获取聊天会话列表
- `POST /api/chat-sessions` - 创建聊天会话
- `PUT /api/chat-sessions` - 更新聊天会话

### 内容生成
- `POST /api/generate-content` - 生成内容和场景
- `POST /api/generate-magazine-cover` - 生成杂志封面

### AI代理
- `POST /api/ai/chat` - DeepSeek聊天代理
- `POST /api/doubao-chat` - DouBao聊天代理

---

## 🔐 数据库模型（Prisma）

### User
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  phone         String?   @unique
  emailVerified DateTime?
  image         String?
  
  userInfo      UserInfo?
  metadata      UserMetadata?
  chatSessions  ChatSession[]
  accounts      Account[]
  sessions      Session[]
}
```

### UserInfo
```prisma
model UserInfo {
  id            String   @id @default(cuid())
  userId        String   @unique
  
  // 基本信息
  name          String?
  gender        String?
  birthdate     DateTime?
  age           Int?
  height        Int?
  hairLength    String?
  
  // 用户填写的性格
  userProfile   Json?    // { personality, mbti, interests }
  
  user          User     @relation(fields: [userId], references: [id])
}
```

### UserMetadata
```prisma
model UserMetadata {
  id                        String   @id @default(cuid())
  userId                    String   @unique
  
  // 📝 表意识层（用户真实数据）
  userRawInputs            String?  @db.Text  // JSON数组
  userMentionedKeywords    String?  @db.Text  // JSON数组
  userMentionedLocations   String?  @db.Text  // JSON数组
  userMentionedActivities  String?  @db.Text  // JSON数组
  
  // 🧠 潜意识层（AI分析）
  coreTraits               String?  @db.Text  // JSON数组
  emotionalPattern         String?  @db.Text  // JSON数组
  behaviorPatterns         String?  @db.Text  // JSON数组
  communicationStyle       String?  @db.Text  // JSON数组
  
  // 地点分析
  frequentLocations        String?  @db.Text  // JSON数组（AI推断）
  favoriteVenues           String?  @db.Text  // JSON数组（AI推断）
  
  // ... 更多字段
  
  user                     User     @relation(fields: [userId], references: [id])
}
```

### ChatSession
```prisma
model ChatSession {
  id              String   @id @default(cuid())
  userId          String
  sessionId       String   @unique
  
  initialPrompt   String   @db.Text
  questions       String?  @db.Text  // JSON数组
  answers         String?  @db.Text  // JSON数组
  
  generatedScenes String?  @db.Text  // JSON
  generatedStory  String?  @db.Text
  
  createdAt       DateTime @default(now())
  
  user            User     @relation(fields: [userId], references: [id])
}
```

---

## 🎯 核心设计原则

### 1. 两层数据分离
- **表意识层**: 100%用户真实数据，不做推断
- **潜意识层**: AI分析和推断，持续学习

### 2. 语义完整性
- 每个场景必须有用户语义支撑
- 不生成用户没提到的场景

### 3. 心理剧置信度驱动
- 不是所有场景都有心理剧
- 只在置信度≥0.70时生成

### 4. 真实情境优先
- 心理剧基于真实地点（如"淞虹路会议室8楼"）
- 不用虚构的梦境或超现实元素

### 5. 主角动态识别
- 场景的`mainCharacter`字段标注主角
- 图像提示词的句首必须是主角

---

## 🔧 环境变量

```env
# 数据库
DATABASE_URL="file:./dev.db"

# NextAuth
NEXTAUTH_SECRET="your-secret"
NEXTAUTH_URL="http://localhost:3000"

# AI API
DEEPSEEK_API_KEY="sk-xxx"
DOUBAO_API_KEY="xxx"

# 图像生成
FLUX_API_KEY="xxx"
```

---

## 🚀 部署架构

### 开发环境
```
Next.js Dev Server (localhost:3000)
  ↓
SQLite Database (prisma/dev.db)
  ↓
DeepSeek API (云端)
Flux API (云端)
```

### 生产环境（建议）
```
Next.js App (Vercel)
  ↓
PostgreSQL (Vercel Postgres / Supabase)
  ↓
DeepSeek API (云端)
Flux API (云端)
```

---

## 📈 数据流示意图

```
用户输入
  ↓
[智能对话]
  ├─→ 表意识层存储（userRawInputs）
  └─→ AI分析 → 潜意识层存储（emotionalPattern等）
  ↓
[场景生成]
  ├─→ 基础场景（3个）
  ├─→ 情绪检测
  └─→ 心理剧插入（0-2个）
  ↓
[图像生成]
  ├─→ Flux API
  └─→ 图像URL
  ↓
[展示]
  └─→ 用户查看场景 + 故事 + 封面
```

---

## 🔄 更新日志

### 最新更新（2025-10-15）
1. ✅ 修复表意识层数据缺失问题（添加userRawInputs存储）
2. ✅ 添加场景主角识别（mainCharacter字段）
3. ✅ 优化心理剧置信度算法（置信度≥0.70触发）
4. ✅ 移除超现实元素，使用戏剧化写实风格
5. ✅ 场景数量控制（3个基础 + 0-2个心理剧 = 3-5个场景）
6. ✅ 修复API参数缺失bug（detectEmotions、generateScene参数）
7. ✅ 强化心理剧drama表达（情绪从subtle改为VISIBLE）
8. ✅ 增强嘲讽情绪检测（"笑死了"→强度9）
9. ✅ 优化心理剧提示词（PSYCHODRAMA标识 + 戏剧化光线）

### 已知问题
1. ⚠️ **DeepSeek API余额不足（紧急）**
   - API Key 1: `sk-4d7c509f56f64f4a9b1d52f9e1791a67` - 402 Insufficient Balance
   - API Key 2: `sk-e3911ff08dae4f4fb59c7b521e2a5415` - 402 Insufficient Balance
   - 影响：所有AI功能无法使用（对话、场景生成、心理剧、封面）
   
2. ⚠️ 部分表意识层字段未实现
   - `userMentionedActivities` - 需要NLP提取
   - `userMentionedFoods` - 需要NLP提取
   - `userMentionedPeople` - 需要NLP提取
   
3. ⚠️ 心理剧图像生成效果待验证
   - 新的drama化提示词需要测试
   - 需确认Flux API能否正确渲染强烈情绪表达

---

## 📝 开发规范

### 代码风格
- TypeScript严格模式
- ESLint + Prettier
- 函数式组件 + Hooks

### 提交规范
- `feat:` 新功能
- `fix:` Bug修复
- `refactor:` 重构
- `docs:` 文档更新

### 测试策略
- 单元测试：核心服务层
- 集成测试：API路由
- E2E测试：关键用户流程

---

# 🧠 系统设计哲学：为什么这个系统能"比ChatGPT更懂用户"

## 核心价值：从"通用AI"到"专属AI"

### 传统AI的局限（以ChatGPT为例）

**问题1：零记忆开始**
```
用户第1次对话：
ChatGPT: "您好，我是AI助手，有什么可以帮您？"
生成内容: 通用模板，千人一面

用户第100次对话：
ChatGPT: "您好，我是AI助手，有什么可以帮您？"
生成内容: 依然是通用模板，没有进化
```

**问题2：无法累积深度理解**
```
ChatGPT生成的故事：
"用户说：'我有一个解决方案，可以用比较经济的方式处理。'"
→ 通用、客气、没有个性
```

**问题3：每次都需要重新"学习"用户**
```
用户每次都要重新解释：
"我说话比较直接"
"我喜欢用讽刺的方式表达"
"我比较务实，不喜欢空谈"
```

---

## 我们的解决方案：两层数据架构

### 1. 显意识层（Conscious Layer）- 用户说了什么

**存储内容：**
- `ChatSession`：完整对话历史
- `userRawInputs`：用户真实键入的原话
- `userMentionedKeywords`：用户提到的关键词
- `userMentionedLocations`：用户提到的地点

**作用：**
```javascript
用户说："我很欠的跟老板说，我花了六块钱呢"
系统记录：
{
  userRawInputs: ["我很欠的跟老板说，我花了六块钱呢"],
  userMentionedKeywords: ["老板", "六块钱", "欠"],
  context: "上次会议，解决资产问题"
}
```

### 2. 潜意识层（Subconscious Layer）- AI理解了什么

**存储内容：**
```typescript
interface SubconsciousData {
  // 核心性格
  coreTraits: ["批判性思维", "务实主义", "艺术敏感", "讽刺幽默"]
  
  // 沟通风格 ⭐ 关键！用于生成对话
  communicationStyle: ["简洁直接", "幽默调侃", "略带挑衅"]
  
  // 情感模式 ⭐ 关键！用于生成情绪反应
  emotionalPattern: ["情绪稳定", "克制表达", "享受冲突", "轻松应对压力"]
  
  // 行为模式 ⭐ 关键！用于生成行为细节
  behaviorPatterns: ["观察者姿态", "独立判断", "情绪内化"]
  
  // 深度洞察
  conversationInsights: [
    "从'混夜店'到'AI创业'的认知跃迁，显示强烈的自我重构能力",
    "对初恋的后悔未转化为缠绵，而是快速理性切割",
    "用'6块钱解决问题'挑战老板权威，展现隐藏的竞争性"
  ]
}
```

**AI分析过程：**
```javascript
// Step 1: 观察用户原话
userInput: "我很欠的跟老板说，我花了六块钱呢"

// Step 2: DeepSeek分析
分析结果：
- "我很欠的" → 自我认知：幽默调侃、略带挑衅
- "跟老板说" → 行为模式：不惧权威、直接沟通
- "六块钱呢" → 沟通风格：简洁直接、强调对比（6块钱vs宏大项目）
- 语气："呢" → 玩笑感、轻松感

// Step 3: 存储到潜意识层
communicationStyle += ["幽默调侃", "略带挑衅"]
behaviorPatterns += ["不惧权威"]
```

---

## 精准生成的实现逻辑

### 场景1：生成用户的对话

**通用AI的做法：**
```javascript
// ChatGPT生成
"用户说：'我觉得可以用一个比较经济实惠的方案来解决这个问题。'"
// ❌ 客气、冗长、没有个性
```

**我们的做法：**
```javascript
// Step 1: 查询用户潜意识数据
const user = await getUserMetadata()
const communicationStyle = user.communicationStyle
// → ["简洁直接", "幽默调侃", "略带挑衅"]

// Step 2: 传递给LLM
prompt: `
用户沟通风格：简洁直接、幽默调侃、略带挑衅
要求：生成用户说的话，必须符合以上风格

示例：
- 简洁直接 → "用淘宝爬虫，6块钱"（不是"我觉得可以..."）
- 幽默调侃 → "我花了六块钱呢"（带玩笑感）
- 略带挑衅 → "我很欠的跟老板说"（有挑衅意味）
`

// Step 3: LLM生成
"evelyn冷静地说：'用淘宝爬虫，6块钱。'她还特意强调：'我很欠的跟老板说，我花了六块钱呢。'"
// ✅ 简短、有个性、完全符合用户真实表达方式！
```

### 场景2：生成用户的思考

**通用AI的做法：**
```javascript
"她心里觉得这个方案不错。"
// ❌ 肤浅、模糊、没有深度
```

**我们的做法：**
```javascript
// Step 1: 查询核心性格
const coreTraits = user.coreTraits
// → ["批判性思维", "务实主义", "艺术敏感"]

// Step 2: 传递给LLM
prompt: `
用户核心性格：批判性思维、务实主义、艺术敏感
要求：生成用户的思考过程，必须体现这些特质

示例：
- 批判性思维 → "她理性分析：公司内容同质化严重，AI都能批量生产"
- 务实主义 → "6块钱解决了核心问题，比空谈伟大愿景有效得多"
- 艺术敏感 → "她把这场面看作一出荒诞话剧"
`

// Step 3: LLM生成
"她的批判性思维快速运转：公司内容同质化，AI都能做，毫无特色。她把这场面看作精心编排的滑稽剧——老板是自我陶醉的主演，顾问是疯狂捧场的配角。"
// ✅ 深刻、独特、完全符合用户思维方式！
```

### 场景3：生成用户的情绪反应

**通用AI的做法：**
```javascript
"她感到有些不满和焦虑。"
// ❌ 错误！用户实际上是"觉得好笑"而非"焦虑"
```

**我们的做法：**
```javascript
// Step 1: 查询情感模式
const emotionalPattern = user.emotionalPattern
// → ["轻松应对压力", "享受冲突", "情绪内化"]

// Step 2: 传递给LLM
prompt: `
用户情感模式：轻松应对压力、享受冲突、情绪内化
要求：生成用户的情绪反应

示例：
- 轻松应对压力 → "她觉得好笑，毫无压力"（不是"焦虑"）
- 享受冲突 → "她内心觉得这场景很有意思"
- 情绪内化 → "表面保持优雅，内心却在冷笑"
`

// Step 3: LLM生成
"evelyn表面保持优雅，偶尔点头。内心却在冷笑：'我就用6块钱解决了问题，你谈什么伟大？'她觉得好笑，毫无压力，纯粹觉得这场面荒诞又有意思。"
// ✅ 精准！完全符合用户真实情绪状态！
```

---

## 系统进化过程：从"不懂"到"懂"到"比用户更懂"

### 第1阶段：初次对话（系统开始学习）

```
用户输入：
"我昨天晚上想到一个产品idea很兴奋，早上醒得早早早来了公司"

系统分析：
→ 记录原话到 userRawInputs
→ 提取关键词：["产品idea", "兴奋", "早早来公司"]
→ 初步分析：对工作有激情、行动力强
→ 存储到潜意识层
```

### 第2阶段：深度对话（系统深度学习）

```
用户输入：
"上次开会我用6块钱解决了公司资产问题，老板自尊心受挫了。
这次他激情宣布要做伟大的媒体公司，我笑死了。"

系统分析：
→ 记录原话
→ 提取沟通风格："笑死了" → 幽默讽刺
→ 提取性格特质："6块钱解决问题" → 务实主义
→ 提取情感模式："笑死了"（不是"紧张"） → 轻松应对压力、享受冲突
→ 深度洞察："用实际行动（6块钱）对抗空洞愿景（伟大公司）"
→ 更新潜意识层
```

### 第3阶段：精准生成（系统"懂"了用户）

```
用户新输入：
"今天公司来了个新顾问，讲了一堆理论。"

系统生成：
"evelyn【简洁直接】听完后只说了一句：'然后呢？'
【批判性思维】她内心分析：又是一堆空洞理论，没有实际落地方案。
【艺术敏感】她把这场演讲看作另一出熟悉的话剧。
【轻松应对压力】她觉得有点好笑，想起上次老板的'伟大宣言'。"

// ✅ 完全符合用户风格！对话、思考、情绪都精准！
```

---

## 核心优势总结

### 1. **累积式理解 vs 零记忆**

| 特性 | ChatGPT | 我们的系统 |
|------|---------|-----------|
| 记忆机制 | 单次对话内记忆 | 跨对话持久化存储 |
| 理解深度 | 表面理解 | 深度心理分析 |
| 进化能力 | 无进化 | 每次对话都在学习 |
| 生成质量 | 通用模板 | 个性化精准生成 |

### 2. **从"表面语义"到"深层心理"**

```
用户说："我花了6块钱呢"

ChatGPT理解：
→ 用户花了6块钱（字面意思）

我们的系统理解：
→ 显意识：用户花了6块钱解决问题
→ 潜意识：
   - 简洁直接的沟通风格
   - 幽默调侃的语气（"呢"）
   - 略带挑衅（强调"6块钱"vs"宏大项目"的对比）
   - 务实主义（关注实际效果而非形式）
   - 批判性思维（用事实对抗空谈）
```

### 3. **动态适应用户表达习惯**

```javascript
// 第1次对话
用户: "我觉得老板说的有点夸张"
系统学习: 用户比较含蓄

// 第5次对话
用户: "我笑死了"
系统更新: 用户其实很直接、幽默

// 第10次对话
用户: "我很欠的跟老板说..."
系统再更新: 用户不仅直接、幽默，还有点挑衅

// 第15次生成
系统输出: "evelyn欠欠地说：'用淘宝爬虫，6块钱。'"
// ✅ 完全匹配用户真实表达方式！
```

---

## 技术实现核心

### 1. 数据流

```
用户输入
  ↓
[显意识层存储] ← 原话、关键词、上下文
  ↓
[DeepSeek分析] ← 提取性格、情感、行为模式
  ↓
[潜意识层存储] ← 累积式更新特质库
  ↓
[内容生成] ← 查询特质库 + LLM生成
  ↓
精准个性化内容
```

### 2. 关键代码逻辑

**故事生成时：**
```typescript
// lib/storyGenerationService.ts
const generateStory = async (scenes, userInfo, userMetadata) => {
  // 提取潜意识数据
  const traits = {
    coreTraits: userMetadata.coreTraits,
    communicationStyle: userMetadata.communicationStyle,
    emotionalPattern: userMetadata.emotionalPattern,
    behaviorPatterns: userMetadata.behaviorPatterns
  }
  
  // 传递给LLM
  const prompt = `
    用户沟通风格：${traits.communicationStyle}
    用户核心性格：${traits.coreTraits}
    用户情感模式：${traits.emotionalPattern}
    
    要求：
    1. 用户说的话必须符合沟通风格
    2. 用户的思考必须符合核心性格
    3. 用户的情绪必须符合情感模式
    
    示例：
    - 简洁直接 → "就6块钱"（不是"我觉得可以用6块钱"）
    - 幽默调侃 → "我很欠的跟老板说"
    - 批判性思维 → "她分析：内容同质化..."
  `
  
  return await LLM.generate(prompt)
}
```

**心理剧生成时：**
```typescript
// lib/psychodramaSceneService.ts
const generatePsychodrama = async (scene, userInfo, userMetadata) => {
  // 提取潜意识数据
  const innerWorld = {
    coreTraits: userMetadata.coreTraits,
    emotionalPattern: userMetadata.emotionalPattern,
    stressResponse: userMetadata.stressResponse
  }
  
  // 生成内心独白（基于特质）
  const prompt = `
    用户核心特质：批判性思维、务实主义、幽默讽刺
    
    生成innerMonologue（内心独白）：
    - 必须体现"批判性思维"：理性分析
    - 必须体现"务实主义"：关注实际
    - 必须体现"幽默讽刺"：冷笑、觉得好笑
    
    示例：
    "我用6块钱就解决了问题，你现在谈什么伟大公司？
    内容同质化到AI都能批量生产，真是荒诞..."
  `
  
  return await LLM.generate(prompt)
}
```

---

## 最终效果

### 用户感知：
> **"你现在比ChatGPT都了解我"**

### 原因：
1. ✅ **记住了用户说过的每一句话**（显意识层）
2. ✅ **理解了用户为什么这么说**（潜意识分析）
3. ✅ **知道用户会怎么说、怎么想、怎么反应**（特质库）
4. ✅ **生成的内容完全符合用户个性**（精准生成）
5. ✅ **每次对话都在加深理解**（持续进化）

### 这就是"专属AI"的核心价值：
**不是一个为所有人服务的通用助手**  
**而是一个只为你、懂你、像你的专属AI** 🧠✨

---

**更新时间：2025-01-16 00:20**

