# 心理剧场景生成功能

## 功能概述

心理剧场景生成是一个智能功能，它能够：
1. **检测用户情绪**：从用户对话中找到有情绪的地方
2. **分析心理状态**：使用两层数据结构（表意识+潜意识）推测用户心理
3. **生成心理剧场景**：创建和现实相关、有具体任务、有精准地点场景的心理剧
4. **表达内心冲突**：通过强烈冲突表达用户内心心理

## 两层数据结构

### 第一层：表意识（Conscious Layer）
存储用户真实说的、做的、表现的：
- 用户对话记录
- 用户原始输入
- 用户提到的关键词
- 用户自我描述

**查看方式：**
- API: `GET /api/user/two-layer-data`
- 页面: `/two-layer-data`

### 第二层：潜意识（Subconscious Layer）
存储AI分析的深层心理模式：
- 核心性格特征
- 情感模式
- 行为模式
- 压力反应
- 人际挑战
- 对话洞察

**查看方式：**
- API: `GET /api/user/two-layer-data`
- 页面: `/two-layer-data`

## 工作流程

### 1. 情绪检测
```typescript
// 从用户对话中检测情绪
const emotionalAnalysis = await detectEmotions(initialPrompt, answers, questions)

// 返回检测到的情绪
{
  hasEmotion: true,
  emotions: [
    {
      type: "焦虑",
      intensity: 8,
      trigger: "工作压力大",
      quote: "我最近压力好大"
    }
  ]
}
```

### 2. 两层数据提取
```typescript
// 表意识数据
const consciousData = {
  rawInputs: userMetadata.userRawInputs,        // 用户原话
  mentionedKeywords: userMetadata.userMentionedKeywords  // 提到的关键词
}

// 潜意识数据
const subconsciousData = {
  coreTraits: userMetadata.coreTraits,          // 核心特质
  emotionalPattern: userMetadata.emotionalPattern,  // 情感模式
  behaviorPatterns: userMetadata.behaviorPatterns,  // 行为模式
  stressResponse: userMetadata.stressResponse,      // 压力反应
  interpersonalChallenges: userMetadata.interpersonalChallenges  // 人际挑战
}
```

### 3. 心理剧场景生成
```typescript
// 生成心理剧场景
const scene = await generateScene(
  strongestEmotion,
  initialPrompt,
  answers,
  questions,
  userInfo,
  userMetadata
)

// 返回心理剧场景
{
  emotionalTrigger: "工作压力大",
  emotionalIntensity: 8,
  location: "公司办公室",
  task: "完成紧急项目",
  innerConflict: "想要休息 vs 必须完成工作",
  externalConflict: "老板催促 vs 身心疲惫",
  subconsciousDesire: "渴望被理解和支持",
  consciousBehavior: "强撑着继续工作",
  psychologicalMechanism: "压抑",
  sceneDescription_CN: "详细中文场景描述...",
  sceneDescription_EN: "Detailed English scene description...",
  imagePrompt: "Complete image generation prompt..."
}
```

### 4. 集成到内容生成
心理剧场景会自动集成到内容生成流程中：

```typescript
// 在场景生成后，检测情绪并生成心理剧
const psychodramaScene = await PsychodramaSceneService.generatePsychodramaScene(
  initialPrompt,
  answers,
  questions
)

// 如果有心理剧场景，集成到原有场景中
if (psychodramaScene) {
  scenes = await PsychodramaSceneService.integratePsychodramaIntoContent(
    scenes,
    psychodramaScene
  )
}
```

## API使用

### 查看两层数据
```bash
GET /api/user/two-layer-data
```

**返回示例：**
```json
{
  "userId": "xxx",
  "userName": "用户名",
  "consciousLayer": {
    "description": "第一层：表意识 - 用户真实说的、做的、表现的",
    "data": {
      "userProfile": { ... },
      "conversations": [ ... ],
      "rawInputs": [ ... ],
      "mentionedKeywords": [ ... ]
    }
  },
  "subconsciousLayer": {
    "description": "第二层：潜意识 - AI分析的深层心理模式和推测",
    "data": {
      "coreTraits": [ ... ],
      "emotionalPattern": [ ... ],
      "behaviorPatterns": [ ... ],
      "stressResponse": [ ... ],
      ...
    }
  },
  "summary": {
    "totalConversations": 10,
    "totalRawInputs": 50,
    "totalKeywords": 30,
    "totalAnalyzedTraits": 120
  }
}
```

## 页面访问

访问 `/two-layer-data` 页面可以：
- 查看表意识数据（第一层）
- 查看潜意识数据（第二层）
- 查看数据统计摘要
- 切换不同层级的数据视图

## 心理剧场景特点

### 1. 基于真实情绪
- 从用户对话中检测真实情绪
- 选择情绪强度最高的点
- 不编造戏剧性内容

### 2. 精准的现实场景
- 具体的地点（如："公司会议室"而不是"某个地方"）
- 明确的任务（用户正在做什么）
- 真实的环境细节

### 3. 强烈的心理冲突
- **内心冲突**：表意识 vs 潜意识
  - 例如："想要休息" vs "必须工作"
- **外部冲突**：现实压力 vs 内心需求
  - 例如："老板催促" vs "身心疲惫"

### 4. 深层心理分析
- 使用两层数据结构分析
- 揭示心理防御机制（压抑、投射、合理化等）
- 表达潜意识愿望

## 使用示例

### 示例1：工作压力
**用户输入：** "我最近工作压力好大，每天加班到很晚"

**情绪检测：**
- 类型：焦虑/疲惫
- 强度：8/10
- 触发：工作压力

**生成的心理剧场景：**
```
地点：公司办公室，深夜11点
任务：完成紧急项目报告

内心冲突：
- 表意识：必须完成工作，不能让老板失望
- 潜意识：渴望休息，想要逃离

外部冲突：
- 老板明天要结果 vs 身心已经疲惫
- 同事都下班了 vs 自己还在加班

心理机制：压抑（压抑自己的疲惫和不满）

场景描述：
26岁男性，在空荡荡的办公室里，独自盯着电脑屏幕。
窗外是漆黑的夜空，办公室的灯光显得格外刺眼。
他揉了揉眼睛，看了一眼手机上的时间，叹了口气。
内心一个声音说："再坚持一下就好了"，
但另一个声音却在呐喊："我真的撑不住了"。
```

### 示例2：人际冲突
**用户输入：** "我和朋友吵架了，觉得很委屈"

**情绪检测：**
- 类型：委屈/愤怒
- 强度：7/10
- 触发：人际冲突

**生成的心理剧场景：**
```
地点：家中卧室
任务：试图理解和消化这次冲突

内心冲突：
- 表意识：朋友不理解我
- 潜意识：害怕失去友谊

外部冲突：
- 想要被理解 vs 朋友的误解
- 想要道歉 vs 觉得自己没错

心理机制：投射（将自己的不安投射到朋友身上）

场景描述：
（详细的心理剧场景描述）
```

## 技术实现

### 核心文件
- `lib/psychodramaSceneService.ts` - 心理剧场景生成服务
- `lib/contentGenerationService.ts` - 集成到内容生成
- `app/api/user/two-layer-data/route.ts` - 两层数据API
- `app/two-layer-data/page.tsx` - 数据展示页面

### 使用的AI模型
- **DouBao API** - 情绪检测和心理剧场景生成
  - 模型：ep-20241231100501-dwll9
  - 用于情绪分析和场景生成

### 数据存储
- `UserMetadata` 表 - 存储两层数据
  - 第一层字段：`userRawInputs`, `userMentionedKeywords`
  - 第二层字段：`coreTraits`, `emotionalPattern`, `behaviorPatterns` 等

## 未来扩展

### 1. 情绪历史追踪
- 记录用户情绪变化趋势
- 分析情绪触发模式
- 提供情绪管理建议

### 2. 心理剧图像生成
- 自动生成心理剧场景图像
- 视觉化内心冲突
- 创建情绪表达画册

### 3. 心理剧对话
- 与AI进行心理剧角色扮演
- 探索不同的应对方式
- 获得心理洞察和建议

## 注意事项

1. **隐私保护**
   - 两层数据仅用户本人可见
   - 需要登录才能访问
   - 遵循数据安全规范

2. **专业性声明**
   - 这是辅助工具，不是专业心理咨询
   - 如有严重心理问题，请寻求专业帮助
   - AI分析仅供参考

3. **数据准确性**
   - 依赖用户提供的信息
   - AI分析可能有误差
   - 持续学习和优化

## 联系与反馈

如有问题或建议，请在项目中提出Issue。








