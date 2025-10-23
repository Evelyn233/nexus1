# 两层数据结构详细分类

## 核心原则

### 第一层：表意识（Conscious Layer）
**定义：** 用户真实说的、做的、明确表达的事实

**特点：**
- 用户原话，不加推测
- 事实记录，不做分析
- 最高优先级，不可篡改

### 第二层：潜意识（Subconscious Layer）
**定义：** AI基于第一层分析、推测、学习的深层模式

**特点：**
- AI分析结果
- 基于第一层证据
- 用于推测和辅助
- 次要优先级

---

## 数据库字段分类

### 📝 第一层：表意识数据

#### 1. User表 - 用户自我填写
```
存储位置: users 表

字段分类:
✅ 表意识（用户自己说的）:
  - name: 姓名
  - email: 邮箱
  - gender: 性别
  - birthDate: 生日
  - height: 身高
  - weight: 体重
  - location: 所在地
  - personality: 性格描述（用户自我认知）
  - hairLength: 头发长度
  - selfMBTI: 自己认为的MBTI类型
  - selfTraits: 自我描述的性格特质
  - selfInterests: 兴趣爱好
  - selfGoals: 目标和愿景
```

#### 2. ChatSession表 - 对话记录
```
存储位置: chat_sessions 表

字段分类:
✅ 表意识（用户真实说的）:
  - title: 对话标题
  - initialPrompt: 用户初始输入（原话）
  - messages: 完整对话消息（JSON）
  - answers: 用户的回答（JSON数组）
  - questions: 系统提问（用于理解上下文）
  - createdAt: 对话时间
```

#### 3. UserMetadata表 - 用户原始输入
```
存储位置: user_metadata 表

🔥 优先级1字段（表意识）:
✅ userRawInputs: 用户原始输入记录
   - 格式: [{timestamp, input, context}, ...]
   - 内容: 用户逐字逐句说的话
   - 例如: "我今天去了静安寺星巴克"

✅ userMentionedKeywords: 用户提到的关键词/短语
   - 格式: ["关键词1", "关键词2", ...]
   - 内容: 从对话中直接提取的用户说的词
   - 例如: ["静安寺", "星巴克", "咖啡", "累了"]
```

#### 4. 用户明确提到的地点（应该在第一层！）
```
建议新增字段到 user_metadata 表:

✅ userMentionedLocations: 用户明确提到的地点
   - 格式: [{name, timestamp, context}, ...]
   - 内容: 用户原话中的具体地点
   - 例如: [
       {name: "静安寺星巴克", timestamp: "2024-01-01", context: "我今天去了静安寺星巴克"},
       {name: "复兴公园", timestamp: "2024-01-02", context: "昨天在复兴公园散步"}
     ]
   
✅ userMentionedActivities: 用户明确提到的活动
   - 格式: [{activity, timestamp, context}, ...]
   - 内容: 用户原话中的具体活动
   - 例如: [
       {activity: "喝咖啡", timestamp: "2024-01-01", context: "去星巴克喝咖啡"},
       {activity: "散步", timestamp: "2024-01-02", context: "在公园散步"}
     ]

✅ userMentionedFoods: 用户明确提到的食物
   - 格式: [{food, timestamp, context}, ...]
   - 内容: 用户原话中的具体食物
   - 例如: [
       {food: "云海肴炒牛肉", timestamp: "2024-01-03", context: "中午吃了云海肴的炒牛肉"}
     ]

✅ userMentionedPeople: 用户明确提到的人物
   - 格式: [{person, relationship, timestamp, context}, ...]
   - 内容: 用户原话中提到的人
   - 例如: [
       {person: "同事", relationship: "colleague", context: "和同事一起开会"}
     ]
```

---

### 🧠 第二层：潜意识数据

#### 1. 核心性格特征（AI分析）
```
存储位置: user_metadata 表

❌ 第二层（AI分析推测）:
  - coreTraits: 核心性格特质（AI分析）
  - communicationStyle: 沟通风格（AI分析）
  - emotionalPattern: 情感模式（AI分析）
  - decisionStyle: 决策风格（AI分析）
  - stressResponse: 压力反应（AI分析）
```

#### 2. 人际关系特征（AI分析）
```
❌ 第二层（AI分析推测）:
  - interpersonalStrengths: 人际优势（AI分析）
  - interpersonalChallenges: 人际挑战（AI分析）
  - socialEnergyPattern: 社交能量模式（AI分析）
```

#### 3. 生活方式和偏好（AI学习）
```
❌ 第二层（AI推测和学习）:
  - aestheticPreferences: 美学偏好（AI从对话中学习）
    例如: ["简约风格", "现代设计", "暖色调"]
  
  - lifestyleHobbies: 生活爱好（AI从对话中学习）
    例如: ["喝咖啡", "看书", "散步"]
  
  - activityPreferences: 活动偏好（AI从对话中学习）
    例如: ["独处活动", "小型聚会", "户外运动"]
  
  - fashionStyle: 时尚风格（AI从对话中学习）
    例如: ["休闲", "简约", "舒适"]
```

#### 4. 地点偏好（AI分析和推测）⚠️
```
❌ 第二层（AI从多次对话中推测）:
  
  - frequentLocations: 常去地点（AI推测）
    ⚠️ 注意: 这是AI基于第一层数据推测的"常去"地点
    格式: [{location, frequency, confidence, evidence: [指向第一层]}, ...]
    例如: [
      {
        location: "静安寺商圈",
        frequency: 5,
        confidence: 0.85,
        evidence: ["userMentionedLocations[0]", "userMentionedLocations[3]"]
      }
    ]
  
  - favoriteVenues: 喜欢的场所类型（AI推测）
    ⚠️ 注意: 这是AI推测的场所类型偏好
    格式: ["场所类型1", "场所类型2", ...]
    例如: ["咖啡厅", "公园", "书店", "安静的餐厅"]
```

#### 5. 职业和关系模式（AI分析）
```
❌ 第二层（AI分析）:
  - careerAptitude: 职业天赋（AI分析）
  - relationshipPattern: 感情模式（AI分析）
  - lifePhilosophy: 人生哲学（AI分析）
```

#### 6. AI洞察和模式（AI分析）
```
❌ 第二层（AI持续学习）:
  - conversationInsights: 对话洞察（AI分析）
  - behaviorPatterns: 行为模式（AI识别）
  - styleInsights: 风格洞察（AI分析）
```

#### 7. 命理分析（基于生日计算）
```
❌ 第二层（计算和分析）:
  - zodiacSign: 星座（基于生日计算）
  - chineseZodiac: 生肖（基于生日计算）
  - baziAnalysis: 八字分析（AI分析）
  - astrologicalProfile: 星盘分析（AI分析）
  - ziweiAnalysis: 紫微命盘分析（AI分析）
```

---

## 关键区别示例

### 示例1：地点信息

#### 第一层（表意识）
```json
userMentionedLocations: [
  {
    "name": "静安寺星巴克",
    "timestamp": "2024-01-01T10:00:00Z",
    "context": "我今天去了静安寺星巴克喝咖啡",
    "quote": "静安寺星巴克"
  },
  {
    "name": "复兴公园",
    "timestamp": "2024-01-02T15:00:00Z",
    "context": "昨天在复兴公园散步很放松",
    "quote": "复兴公园"
  },
  {
    "name": "武康路的咖啡店",
    "timestamp": "2024-01-05T11:00:00Z",
    "context": "去武康路的咖啡店工作",
    "quote": "武康路的咖啡店"
  }
]
```

#### 第二层（潜意识）- AI推测
```json
frequentLocations: [
  {
    "location": "静安寺商圈",
    "frequency": 5,
    "confidence": 0.85,
    "evidence": ["提到过5次静安寺相关地点"],
    "basedOn": ["userMentionedLocations[0]", "..."]
  }
],

favoriteVenues: [
  "咖啡厅",      // AI推测：用户经常提到咖啡店
  "公园",        // AI推测：用户多次提到公园
  "安静的场所"   // AI推测：基于用户的活动偏好
]
```

### 示例2：食物信息

#### 第一层（表意识）
```json
userMentionedFoods: [
  {
    "food": "云海肴炒牛肉",
    "timestamp": "2024-01-03T12:00:00Z",
    "context": "中午吃了云海肴的炒牛肉",
    "quote": "云海肴的炒牛肉"
  },
  {
    "food": "过桥米线",
    "timestamp": "2024-01-10T13:00:00Z",
    "context": "去吃了过桥米线",
    "quote": "过桥米线"
  }
]
```

#### 第二层（潜意识）- AI推测
```json
behaviorPatterns: [
  {
    "pattern": "饮食习惯",
    "description": "喜欢云南菜",
    "frequency": 3,
    "confidence": 0.75,
    "evidence": [
      "提到过云海肴炒牛肉",
      "提到过过桥米线",
      "提到过云南餐厅"
    ]
  }
]
```

### 示例3：活动信息

#### 第一层（表意识）
```json
userMentionedActivities: [
  {
    "activity": "喝咖啡",
    "timestamp": "2024-01-01T10:00:00Z",
    "context": "去星巴克喝咖啡",
    "quote": "喝咖啡"
  },
  {
    "activity": "散步",
    "timestamp": "2024-01-02T15:00:00Z",
    "context": "在公园散步",
    "quote": "散步"
  },
  {
    "activity": "看书",
    "timestamp": "2024-01-05T16:00:00Z",
    "context": "在咖啡店看书",
    "quote": "看书"
  }
]
```

#### 第二层（潜意识）- AI推测
```json
activityPreferences: [
  "独处活动",    // AI推测：喝咖啡、看书多为独处
  "安静的活动",  // AI推测：散步、看书都是安静活动
  "慢节奏活动"   // AI推测：没有提到激烈运动
],

lifestyleHobbies: [
  "咖啡文化",    // AI推测：经常喝咖啡
  "阅读",        // AI推测：经常看书
  "户外休闲"     // AI推测：经常散步
]
```

---

## 数据流程图

```
用户说话："我今天去了静安寺星巴克喝咖啡"
    ↓
┌─────────────────────────────────────────┐
│ 第一层：表意识（立即存储）               │
├─────────────────────────────────────────┤
│ userRawInputs: [                         │
│   {input: "我今天去了静安寺星巴克喝咖啡"}│
│ ]                                        │
│                                          │
│ userMentionedLocations: [                │
│   {name: "静安寺星巴克", ...}            │
│ ]                                        │
│                                          │
│ userMentionedActivities: [               │
│   {activity: "喝咖啡", ...}              │
│ ]                                        │
│                                          │
│ userMentionedKeywords: [                 │
│   "静安寺", "星巴克", "咖啡"             │
│ ]                                        │
└─────────────────────────────────────────┘
    ↓ AI异步分析
┌─────────────────────────────────────────┐
│ 第二层：潜意识（AI分析后存储）           │
├─────────────────────────────────────────┤
│ frequentLocations: [                     │
│   {location: "静安寺商圈", frequency: 5} │
│ ]                                        │
│                                          │
│ favoriteVenues: [                        │
│   "咖啡厅"  ← AI推测                     │
│ ]                                        │
│                                          │
│ activityPreferences: [                   │
│   "独处活动"  ← AI推测                   │
│ ]                                        │
│                                          │
│ lifestyleHobbies: [                      │
│   "咖啡文化"  ← AI推测                   │
│ ]                                        │
└─────────────────────────────────────────┘
```

---

## 优先级使用规则

### 场景生成时的优先级

```
场景生成需要地点信息时:

1️⃣ 最高优先级：用户当前输入
   - 用户刚刚说的地点
   
2️⃣ 第二优先级：第一层数据（事实）
   - userMentionedLocations（用户明确提到过的地点）
   - 例如："静安寺星巴克"
   - ✅ 使用用户原话，不改名字
   
3️⃣ 第三优先级：第二层数据（推测）
   - frequentLocations（AI推测的常去地点）
   - favoriteVenues（AI推测的场所偏好）
   - ✅ 用于补充，不能覆盖第一层
```

### 示例对比

#### ❌ 错误用法
```
用户说过："我去了静安寺星巴克"（第一层）
AI推测："用户喜欢咖啡厅"（第二层）

场景生成时写：
"用户在某个咖啡厅" ← 错误！应该用具体地点"静安寺星巴克"
```

#### ✅ 正确用法
```
用户说过："我去了静安寺星巴克"（第一层）
AI推测："用户喜欢咖啡厅"（第二层）

场景生成时写：
- 场景1："用户在静安寺星巴克" ← 使用第一层具体地点
- 场景2（用户没说地点时）："用户在咖啡厅" ← 可以使用第二层推测
```

---

## 建议的Schema更新

### 新增字段到 UserMetadata 表

```prisma
model UserMetadata {
  // ... 现有字段 ...
  
  // 🔥 第一层：表意识（用户真实说的）
  userRawInputs        String?  // 已存在
  userMentionedKeywords String? // 已存在
  
  // 🆕 新增：用户明确提到的信息
  userMentionedLocations   String?  // JSON: [{name, timestamp, context, quote}, ...]
  userMentionedActivities  String?  // JSON: [{activity, timestamp, context, quote}, ...]
  userMentionedFoods       String?  // JSON: [{food, timestamp, context, quote}, ...]
  userMentionedPeople      String?  // JSON: [{person, relationship, timestamp, context}, ...]
  userMentionedEmotions    String?  // JSON: [{emotion, intensity, timestamp, context, quote}, ...]
  
  // 第二层：潜意识（AI推测）
  frequentLocations    String?  // 已存在 - AI推测的常去地点
  favoriteVenues       String?  // 已存在 - AI推测的场所类型
  // ... 其他AI分析字段 ...
}
```

---

## 总结

### 第一层（表意识）包含
1. ✅ 用户自己填写的信息（User表）
2. ✅ 用户对话记录（ChatSession表）
3. ✅ 用户原始输入（userRawInputs）
4. ✅ 用户提到的关键词（userMentionedKeywords）
5. ✅ **用户明确提到的地点**（userMentionedLocations - 建议新增）
6. ✅ **用户明确提到的活动**（userMentionedActivities - 建议新增）
7. ✅ **用户明确提到的食物**（userMentionedFoods - 建议新增）
8. ✅ **用户明确提到的人物**（userMentionedPeople - 建议新增）

### 第二层（潜意识）包含
1. ❌ AI分析的性格特征
2. ❌ AI推测的行为模式
3. ❌ AI学习的生活偏好
4. ❌ **AI推测的常去地点**（frequentLocations）
5. ❌ **AI推测的场所类型**（favoriteVenues）
6. ❌ AI的对话洞察
7. ❌ 命理分析结果

### 关键原则
1. **第一层是事实**：用户说什么就记什么
2. **第二层是推测**：AI基于第一层分析
3. **优先级明确**：第一层 > 第二层
4. **可追溯性**：第二层必须指向第一层证据
5. **不可篡改**：第一层数据不能被第二层覆盖








