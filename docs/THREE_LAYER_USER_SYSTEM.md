# 🎯 三层用户数据体系 - 完整实现

## 架构概览

```
┌──────────────────────────────────────────────────┐
│           第一层：自我认知（用户填写）             │
│  - MBTI类型：INTJ                                 │
│  - 自我描述：AI创业者、内心文艺、向往硅谷         │
│  - 基本信息：性别、生日、身高体重、所在地         │
│  存储：Prisma users表                             │
└─────────────────┬────────────────────────────────┘
                  │
                  ↓ (初始分析)
┌──────────────────────────────────────────────────┐
│       第二层：初始深度分析（基于命理）             │
│  - 星座：双鱼座（3月16日）                        │
│  - 生肖：兔（1999年）                             │
│  - 八字日主：根据生辰计算                         │
│  - 八字格局：根据生辰计算                         │
│  - 星盘分析：12宫位分析                           │
│  - 紫微命盘：命宫、财帛宫等                       │
│  存储：Prisma user_metadata表                    │
└─────────────────┬────────────────────────────────┘
                  │
                  ↓ (持续学习)
┌──────────────────────────────────────────────────┐
│      第三层：AI持续学习（从对话中更新）            │
│  - 对话洞察：从每次回答中提取                     │
│  - 行为模式：观察用户行为习惯                     │
│  - 风格偏好：学习审美和选择                       │
│  - 性格细化：不断完善性格画像                     │
│  存储：Prisma user_metadata表（累积更新）        │
│  更新频率：每次对话后自动更新                     │
└──────────────────────────────────────────────────┘
```

## 📊 数据库Schema设计

### users表（第一层：自我认知）
```sql
CREATE TABLE users (
  -- 基本信息
  id            TEXT PRIMARY KEY,
  email         TEXT UNIQUE,
  name          TEXT,
  
  -- 自我认知
  gender        TEXT,
  birthDate     TEXT,  -- JSON: {year, month, day, hour}
  personality   TEXT,  -- "INTJ AI创业者 内心文艺 向往硅谷"
  selfMBTI      TEXT,  -- "INTJ"
  selfTraits    TEXT,  -- JSON: ["创业者", "文艺", "硅谷梦"]
  selfInterests TEXT,  -- JSON: ["AI", "创业", "艺术"]
  selfGoals     TEXT   -- JSON: ["打造AI产品", "移居硅谷"]
);
```

### user_metadata表（第二层+第三层）
```sql
CREATE TABLE user_metadata (
  id        TEXT PRIMARY KEY,
  userId    TEXT UNIQUE REFERENCES users(id),
  
  -- 第二层：命理分析（基于生日，一次性计算）
  zodiacSign        TEXT,  -- "双鱼座"
  chineseZodiac     TEXT,  -- "兔"
  baziAnalysis      TEXT,  -- "八字完整分析"
  baziDayMaster     TEXT,  -- "丁火" "甲木" 等
  baziPattern       TEXT,  -- "偏印格" "正官格" 等
  astrologicalProfile TEXT, -- 星盘12宫位分析
  ziweiAnalysis     TEXT,  -- 紫微命盘分析
  
  -- 第三层：AI持续学习（不断累积）
  coreTraits            TEXT,  -- JSON数组，不断添加新发现
  conversationInsights  TEXT,  -- JSON数组，每次对话提取
  behaviorPatterns      TEXT,  -- JSON数组，观察行为习惯
  styleInsights         TEXT,  -- JSON数组，学习审美偏好
  
  -- 元数据
  lastAnalyzed     DATETIME,
  analysisHistory  TEXT,  -- JSON数组：每次更新的记录
  updateCount      INTEGER DEFAULT 0
);
```

## 🔄 完整数据流程

### 1️⃣ 用户注册 → 第一层自我认知

```typescript
// 用户填写信息
POST /api/auth/register
{
  email: "user@email.com",
  password: "******",
  name: "张三"
}
  ↓
// 填写详细信息（第一层）
POST /user-info
{
  name: "张三",
  gender: "male",
  birthDate: {year: "1999", month: "3", day: "16"},
  personality: "INTJ AI创业者 内心文艺 向往硅谷"
}
  ↓
// 保存自我认知到users表
UPDATE users SET
  selfMBTI = "INTJ",
  selfTraits = '["AI创业者", "内心文艺", "向往硅谷"]',
  personality = "INTJ AI创业者 内心文艺 向往硅谷"
```

### 2️⃣ 信息填写后 → 第二层命理分析

```typescript
// 基于生日计算命理信息
const birthData = {year: "1999", month: "3", day: "16"}
  ↓
// 计算基础命理
zodiacSign = "双鱼座"  // 3月16日
chineseZodiac = "兔"   // 1999年
  ↓
// 调用AI进行八字分析
baziDayMaster = calculateBaziDayMaster(birthData)  // "丁火"
baziPattern = analyzeBaziPattern(birthData)       // "偏印格"
  ↓
// 调用AI进行星盘分析
astrologicalProfile = analyzeAstrology(birthData)
  ↓
// 调用AI进行紫微分析
ziweiAnalysis = analyzeZiwei(birthData)
  ↓
// 保存到user_metadata表
POST /api/user/metadata
{
  updates: {
    zodiacSign, chineseZodiac,
    baziDayMaster, baziPattern,
    astrologicalProfile, ziweiAnalysis,
    coreTraits: ["基于八字的特质", "基于星盘的特质"]
  },
  source: "self_cognition"
}
```

### 3️⃣ 每次对话后 → 第三层持续学习

```typescript
// 用户回答问题
userAnswer = "昨天晚上没睡着困死了"
  ↓
// AI分析（结合命理）
分析输入：
- 用户回答："昨天晚上没睡着困死了"
- 八字日主：丁火（火主热情，易焦虑）
- 星座：双鱼座（敏感，思虑多）
- 紫微：命宫在xxx（影响睡眠）
  ↓
// AI推理
基于双鱼座的敏感特质 + 丁火的多思
→ 推断：压力下容易失眠，需要情绪舒缓
  ↓
// 提取新洞察
newInsights = {
  "newTraits": ["压力敏感型", "睡眠质量受情绪影响"],
  "behaviorPatterns": ["工作压力大时失眠"],
  "styleInsights": ["需要舒缓的睡眠环境"],
  "preferences": ["轻音乐", "香薰", "冥想"]
}
  ↓
// 累积更新到数据库
POST /api/user/metadata
{
  updates: newInsights,
  source: "conversation"
}
  ↓
// Prisma更新（累积式）
UPDATE user_metadata SET
  conversationInsights = JSON_MERGE(old, new),
  behaviorPatterns = JSON_MERGE(old, new),
  updateCount = updateCount + 1,
  lastAnalyzed = NOW()
```

## 🧠 AI分析提示词优化

让我更新AI分析时的提示词，确保结合命理：

<function_calls>
<invoke name="search_replace">
<parameter name="file_path">app/chat-new/page.tsx
