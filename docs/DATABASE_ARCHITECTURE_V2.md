# 数据库架构V2：两层结构

## 核心理念

**两层分离，双层存储**

```
┌─────────────────────────────────────────────────┐
│  第一层：日常真实活动（原始数据层）             │
│  - 用户真实说了什么                              │
│  - 用户真实做了什么                              │
│  - 用户的原始输入                                │
│  - 事实记录，不含推测                            │
└─────────────────────────────────────────────────┘
              ↓ 分析（AI处理）
┌─────────────────────────────────────────────────┐
│  第二层：分析层（基于第一层的分析结果）         │
│  - 基于大量第一层数据分析出来的                  │
│  - 性格特质、行为模式、偏好总结                  │
│  - 也要存储，用于以后的推测                      │
│  - 可以重新分析和更新                            │
└─────────────────────────────────────────────────┘
              ↓ 使用
┌─────────────────────────────────────────────────┐
│  实时生成层（不存储）                            │
│  - 场景生成                                      │
│  - 问题生成                                      │
│  - 实时建议                                      │
└─────────────────────────────────────────────────┘
```

## 详细设计

### 第一层：原始数据表

#### 1. ChatSession（对话记录）
```typescript
{
  id: "xxx",
  userId: "user123",
  initialPrompt: "今天中午吃了云海肴的炒牛肉，线上开会，很累",
  messages: [...],
  answers: ["炒牛肉", "AI短剧项目", "有点累"],
  questions: [...],
  
  // 提取的关键事实（不是推测）
  extractedFacts: {
    foods: ["炒牛肉", "云海肴"],
    activities: ["线上开会"],
    states: ["累了"],
    places: ["在家"],
    times: ["中午"]
  },
  
  createdAt: "2024-01-01"
}
```

#### 2. DailyActivity（日常活动）
```typescript
{
  id: "act001",
  userId: "user123",
  date: "2024-01-01",
  
  // 用户真实做的事
  activity: "吃了云海肴的炒牛肉",
  time: "中午",
  location: "在家",
  people: null,
  userState: "累了",
  
  // 来源
  sourceType: "chat_session",
  sourceId: "chat001",
  userQuote: "今天中午吃了云海肴的炒牛肉"
}
```

#### 3. UserStatement（用户陈述）
```typescript
{
  id: "stmt001",
  userId: "user123",
  
  // 用户说的原话
  statement: "我不喜欢线上开会",
  statementType: "preference", // preference, fact, feeling
  
  context: "讨论工作方式时说的",
  sourceId: "chat001",
  timestamp: "2024-01-01"
}
```

### 第二层：分析层表

#### 1. UserAnalysis（用户分析）
```typescript
{
  id: "analysis001",
  userId: "user123",
  
  // 基于第一层数据分析出来的
  corePersonality: {
    traits: ["INTJ", "理性", "独立"],
    confidence: 0.85,
    basedOn: ["activity_act001", "activity_act002", ...], // 基于哪些原始数据
    analyzedAt: "2024-01-01"
  },
  
  communicationStyle: {
    style: ["直接", "简洁"],
    confidence: 0.80,
    basedOn: ["chat_001", "chat_002"],
    analyzedAt: "2024-01-01"
  },
  
  workPreferences: {
    preferences: ["线下开会 > 线上开会", "独立工作 > 团队协作"],
    confidence: 0.90,
    basedOn: ["stmt_001", "activity_003"],
    analyzedAt: "2024-01-01"
  },
  
  updatedAt: "2024-01-01"
}
```

#### 2. BehaviorPattern（行为模式）
```typescript
{
  id: "pattern001",
  userId: "user123",
  
  // 从多次活动中发现的模式
  patternType: "eating_habit",
  description: "喜欢吃云南菜，尤其是炒牛肉",
  frequency: 5, // 出现5次
  
  // 支持证据（第一层数据）
  evidence: [
    {
      type: "activity",
      id: "act001",
      date: "2024-01-01",
      excerpt: "吃了云海肴的炒牛肉"
    },
    {
      type: "activity",
      id: "act005",
      date: "2024-01-03",
      excerpt: "吃了云南菜"
    }
  ],
  
  confidence: 0.85,
  firstDetected: "2024-01-01",
  lastUpdated: "2024-01-05"
}
```

#### 3. PreferenceSummary（偏好总结）
```typescript
{
  id: "pref001",
  userId: "user123",
  
  category: "work_style",
  preference: "不喜欢线上开会",
  strength: "strong", // weak, medium, strong
  
  // 基于的证据（第一层数据）
  evidence: [
    {
      type: "statement",
      id: "stmt001",
      content: "我不喜欢线上开会",
      date: "2024-01-01"
    },
    {
      type: "activity",
      id: "act003",
      content: "线上开会，有点累",
      date: "2024-01-01"
    }
  ],
  
  confidence: 0.95,
  analyzedAt: "2024-01-01"
}
```

## 工作流程

### 1. 用户对话后的处理

```javascript
// Step 1: 存储到第一层（原始数据）
async function storeChatSession(userId, prompt, answers) {
  // 1.1 存储完整对话
  const chatSession = await prisma.chatSession.create({
    data: {
      userId,
      initialPrompt: prompt,
      answers: JSON.stringify(answers),
      extractedFacts: extractFacts(prompt, answers) // 提取事实
    }
  })
  
  // 1.2 提取日常活动
  const activities = extractActivities(prompt, answers)
  for (const activity of activities) {
    await prisma.dailyActivity.create({
      data: {
        userId,
        activity: activity.description,
        time: activity.time,
        location: activity.location,
        userState: activity.state,
        sourceType: 'chat_session',
        sourceId: chatSession.id,
        userQuote: activity.quote
      }
    })
  }
  
  // 1.3 提取用户陈述
  const statements = extractStatements(prompt, answers)
  for (const stmt of statements) {
    await prisma.userStatement.create({
      data: {
        userId,
        statement: stmt.content,
        statementType: stmt.type,
        sourceId: chatSession.id
      }
    })
  }
  
  // Step 2: 触发第二层分析（异步）
  await analyzeUserData(userId)
}
```

### 2. 分析层的更新

```javascript
// 基于第一层数据，更新第二层分析
async function analyzeUserData(userId) {
  // 2.1 获取所有第一层数据
  const activities = await prisma.dailyActivity.findMany({ where: { userId } })
  const statements = await prisma.userStatement.findMany({ where: { userId } })
  const chatSessions = await prisma.chatSession.findMany({ where: { userId } })
  
  // 2.2 分析性格特质
  const personalityAnalysis = await analyzePersonality(activities, statements, chatSessions)
  
  // 2.3 分析行为模式
  const behaviorPatterns = await analyzeBehaviorPatterns(activities)
  
  // 2.4 总结偏好
  const preferences = await summarizePreferences(statements, activities)
  
  // 2.5 存储到第二层
  await prisma.userAnalysis.upsert({
    where: { userId },
    update: {
      corePersonality: personalityAnalysis,
      // ... 其他分析结果
      updatedAt: new Date()
    },
    create: {
      userId,
      corePersonality: personalityAnalysis,
      // ...
    }
  })
  
  // 2.6 存储行为模式
  for (const pattern of behaviorPatterns) {
    await prisma.behaviorPattern.upsert({
      where: { userId_patternType: { userId, patternType: pattern.type } },
      update: pattern,
      create: { userId, ...pattern }
    })
  }
}
```

### 3. 场景生成时的使用

```javascript
// 场景生成时，使用两层数据
async function generateScene(userId, userInput) {
  // 3.1 获取第一层：最近的真实活动（最高优先级）
  const recentActivities = await prisma.dailyActivity.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 10
  })
  
  const recentStatements = await prisma.userStatement.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: 5
  })
  
  // 3.2 获取第二层：分析结果（用于推测）
  const userAnalysis = await prisma.userAnalysis.findUnique({
    where: { userId }
  })
  
  const behaviorPatterns = await prisma.behaviorPattern.findMany({
    where: { userId }
  })
  
  // 3.3 生成场景（优先级：第一层 > 第二层）
  return await sceneGenerationService.generate({
    userInput, // 当前输入（最高优先级）
    recentActivities, // 第一层：最近的真实活动
    recentStatements, // 第一层：最近的陈述
    userAnalysis, // 第二层：用于推测
    behaviorPatterns // 第二层：用于推测
  })
}
```

## 优势

### ✅ 两层结构的优势

1. **清晰的数据分层**：
   - 第一层：事实（用户说"我累了"）
   - 第二层：分析（经常说累 → 可能工作压力大）

2. **可追溯性**：
   - 第二层的每个分析都指向第一层的证据
   - 可以看到"用户不喜欢线上开会"是从哪些对话中分析出来的

3. **可重新分析**：
   - AI模型升级后，基于第一层重新分析第二层
   - 不会丢失原始数据

4. **提高效率**：
   - 第二层存储分析结果，不用每次都重新分析
   - 场景生成时直接使用第二层的分析

5. **优先级明确**：
   - 场景生成时：用户当前输入 > 第一层 > 第二层
   - 第一层是事实，第二层是推测

## 实际例子

### 用户说：
```
"今天中午吃了云海肴的炒牛肉和土豆焖饭，然后线上开会讨论AI项目，
有点累，我不喜欢线上开会"
```

### 第一层存储（原始数据）：

**ChatSession:**
```json
{
  "initialPrompt": "今天中午吃了云海肴的炒牛肉...",
  "extractedFacts": {
    "foods": ["炒牛肉", "土豆焖饭"],
    "places": ["云海肴"],
    "activities": ["线上开会"],
    "states": ["累了"]
  }
}
```

**DailyActivity:**
```json
[
  {
    "activity": "吃了云海肴的炒牛肉和土豆焖饭",
    "time": "中午",
    "userState": "累了",
    "userQuote": "今天中午吃了云海肴的炒牛肉和土豆焖饭"
  },
  {
    "activity": "线上开会讨论AI项目",
    "userState": "累了",
    "userQuote": "然后线上开会讨论AI项目，有点累"
  }
]
```

**UserStatement:**
```json
{
  "statement": "我不喜欢线上开会",
  "statementType": "preference",
  "context": "讨论工作方式"
}
```

### 第二层存储（分析结果）：

**UserAnalysis:**
```json
{
  "workPreferences": {
    "preferences": ["线下开会 > 线上开会"],
    "confidence": 0.95,
    "basedOn": ["stmt_001", "activity_002"],
    "reason": "用户明确表示不喜欢线上开会，且线上开会时表示累了"
  }
}
```

**BehaviorPattern:**
```json
{
  "patternType": "eating_habit",
  "description": "喜欢吃云南菜（云海肴）",
  "frequency": 3,
  "evidence": [
    {"type": "activity", "id": "act001", "excerpt": "吃了云海肴的炒牛肉"}
  ]
}
```

**PreferenceSummary:**
```json
{
  "category": "work_style",
  "preference": "不喜欢线上开会",
  "strength": "strong",
  "evidence": [
    {"type": "statement", "content": "我不喜欢线上开会"},
    {"type": "activity", "content": "线上开会，有点累"}
  ]
}
```

### 场景生成时使用：

```javascript
// 优先级：当前输入 > 第一层 > 第二层

const prompt = `
**优先级1：用户当前输入**
${userInput}

**优先级2：第一层数据（用户真实说的/做的）**
最近活动：
- ${recentActivities[0].activity} (${recentActivities[0].time})
- 用户状态：${recentActivities[0].userState}

最近陈述：
- "${recentStatements[0].statement}"

**优先级3：第二层数据（用于推测）**
工作偏好：${userAnalysis.workPreferences.preferences}
行为模式：${behaviorPatterns.map(p => p.description)}

生成场景时：
1. 必须100%还原优先级1和优先级2的内容
2. 使用优先级3进行推测（但不能覆盖1和2）
`
```

## 总结

**核心理念：两层分离，双层存储，优先级明确**

### 第一层：原始数据（事实）
- ✅ 用户说了什么
- ✅ 用户做了什么
- ✅ 用户的状态

### 第二层：分析层（推测，但要存储）
- ✅ 基于第一层分析出来的
- ✅ 性格特质、行为模式、偏好总结
- ✅ 用于以后的推测和生成
- ✅ 可以重新分析和更新

### 使用时的优先级：
**当前输入 > 第一层（事实） > 第二层（推测）**











