# 🚀 快速参考指南

## 今天完成的5大功能

### 1️⃣ 心理剧场景 🎭
**触发条件：** 检测到强烈情绪  
**功能：** 生成心理冲突场景，表达内心状态  
**文档：** `docs/PSYCHODRAMA_FEATURE.md`

### 2️⃣ 两层数据 🧠
**功能：** 分离表意识（用户说的）和潜意识（AI推测的）  
**查看：** http://localhost:3000/two-layer-data  
**文档：** `docs/TWO_LAYER_DATA_CLASSIFICATION.md`

### 3️⃣ 数据清理 🧹
**完成：** 移除了混入的男性用户数据  
**结果：** Evelyn的数据完全干净  
**报告：** `DATA_CLEANUP_FINAL_REPORT.md`

### 4️⃣ 手机号注册 📱
**页面：** http://localhost:3000/auth/signup-phone  
**优势：** 验证码验证，更安全  
**文档：** `PHONE_REGISTRATION_COMPLETE.md`

### 5️⃣ 杂志封面 📰
**触发条件：** 深度人生故事  
**功能：** 根据内容生成大标题、小标题、封面设计  
**文档：** `docs/MAGAZINE_COVER_FEATURE.md`、`MAGAZINE_COVER_DESIGN_RULES.md`

## 内容生成完整流程

```
用户输入
    ↓
生成场景 ✅
    ↓
检测情绪？
├─ YES → 🎭 心理剧场景
└─ NO → 跳过
    ↓
生成故事 ✅
    ↓
评估深度？
├─ 深度故事 → 📰 杂志封面
│  ├─ 分析类型 → 确定风格
│  ├─ 分析情感 → 确定配色
│  ├─ 分析气质 → 确定画风
│  ├─ 提取主题 → 生成大标题
│  └─ 提取情节 → 生成小标题
└─ 简单场景 → 跳过
    ↓
生成图片提示词 ✅
    ↓
返回完整结果
```

## 设计决策规则

### 封面风格（根据故事类型）
- 挣扎突破 → 戏剧性、强对比
- 成长蜕变 → 温暖励志
- 情感治愈 → 文艺细腻
- 都市职场 → 现代简约
- 追梦突破 → 动感明亮

### 配色方案（根据情感走向）
- 痛苦→希望 → 深蓝→暖橙
- 迷茫→清晰 → 雾灰→明亮
- 压抑→释放 → 暗沉→明快
- 温暖治愈 → 米粉淡蓝
- 都市现代 → 高级灰黑白

### 画风（根据故事气质）
- 激烈冲突 → 电影感、戏剧光影
- 细腻情感 → 柔和光线、温暖质感
- 理性成长 → 清晰简约、专业质感
- 浪漫文艺 → 诗意朦胧、意境美
- 现代都市 → 利落锐利、时尚感

### 标题生成（从故事提炼）
- 大标题：核心主题词（3-8字）
- 小标题：核心情节（10-20字）
- ❌ 禁止通用词：故事、人生、成长
- ✅ 使用具体词：逆境重生、破茧、追光者

## 新用户流程

```
1. 手机号注册 📱
   /auth/signup-phone
   ↓
2. 填写详细信息 📝
   /user-info
   ↓
3. Chat对话 💬
   /chat-new
   ↓
4. 生成内容 🎨
   /generate
   ↓
获得完整结果：
├─ 基础场景 ✅
├─ 心理剧（如有情绪）🎭
└─ 杂志封面（如是深度故事）📰
```

## 数据查看

### 两层数据
```
http://localhost:3000/two-layer-data

可以看到：
├─ 第一层（表意识）
│  ├─ 用户自我填写
│  ├─ 对话记录
│  ├─ 明确提到的地点
│  └─ ...
└─ 第二层（潜意识）
   ├─ 核心性格特征
   ├─ AI推测的场所偏好
   └─ ...
```

### 调试数据
```
http://localhost:3000/debug-data

JSON格式完整数据
```

### 数据库管理
```
http://localhost:5555

Prisma Studio
直接编辑数据库
```

## 常用脚本

```bash
# 检查所有用户
node scripts/check-all-users.js

# 检查聊天记录
node scripts/check-chat-sessions.js

# 显示当前数据
node scripts/show-current-data.js

# 验证数据隔离
node scripts/verify-data-isolation.js
```

## 关键文件

### 核心服务
- `lib/psychodramaSceneService.ts` - 心理剧
- `lib/magazineCoverService.ts` - 杂志封面
- `lib/contentGenerationService.ts` - 内容生成

### 完整文档
- `docs/PSYCHODRAMA_FEATURE.md` - 心理剧
- `docs/MAGAZINE_COVER_FEATURE.md` - 封面功能
- `MAGAZINE_COVER_DESIGN_RULES.md` - 封面设计规则
- `docs/TWO_LAYER_DATA_CLASSIFICATION.md` - 数据分类

### 总结报告
- `FINAL_IMPLEMENTATION_COMPLETE.md` - 最终总结
- `TODAY_ALL_FEATURES_SUMMARY.md` - 今日总结

## 核心优势

### 1. 智能化
- 自动检测情绪 → 心理剧
- 自动评估深度 → 封面
- 自动分类数据 → 两层结构

### 2. 个性化
- 基于真实用户数据
- 根据故事内容设计
- 每个封面都独特

### 3. 专业化
- 杂志级别封面设计
- 心理剧级别情绪表达
- 专业的数据分析

### 4. 安全性
- 手机号验证
- 数据隔离保护
- API安全验证

## 快速测试

### 测试心理剧
```
输入：我工作压力好大，很焦虑
预期：✅ 生成心理剧场景
```

### 测试封面
```
输入：我高考失利很难过，后来出国读书找到了方向
预期：
- ✅ 生成杂志封面
- ✅ 大标题：逆境重生（或类似）
- ✅ 风格：戏剧性
- ✅ 配色：深色→亮色
```

### 测试两层数据
```
访问：http://localhost:3000/two-layer-data
预期：
- ✅ 第一层：5个地点（上海）
- ✅ 第二层：72条洞察
- ✅ 数据分类清晰
```

---

**所有功能已完成并集成！** 🎉

**封面设计完全根据内容动态生成！** 📰✨

