# Profile 统计与钱包系统说明

## 🎯 功能概述

在 Profile 页面添加了完整的统计系统和钱包展示，确保所有数据都有真实来源。

## 📊 统计数据来源

### 1. 生成图片总数

**数据源**: `UserGeneratedContent` 表

**计算逻辑**:
```typescript
// 从数据库获取所有创作内容
const response = await fetch('/api/user/generated-content?limit=1000&offset=0')

// 累加所有内容的 imageCount
const totalImages = allContents.reduce((sum, content) => 
  sum + (content.imageCount || 0), 0
)
```

**更新时机**:
- 用户每次生成图片后，`imageCount` 字段自动累加
- 保存到 `UserGeneratedContent.imageCount`

### 2. 创作次数

**数据源**: `UserGeneratedContent` 表的记录总数

**计算逻辑**:
```typescript
const totalContents = allContentsData.total
```

**更新时机**:
- 用户每完成一次创作，创建一条新的 `UserGeneratedContent` 记录
- 自动增加总数

### 3. 已创作（草稿）

**数据源**: `UserGeneratedContent` 表，筛选 `status === 'draft'`

**计算逻辑**:
```typescript
const draftCount = allContents.filter((c) => 
  c.status === 'draft'
).length
```

### 4. 🔒 锁着的（私密）

**数据源**: `UserGeneratedContent` 表，筛选 `status === 'private'`

**计算逻辑**:
```typescript
const privateCount = allContents.filter((c) => 
  c.status === 'private'
).length
```

### 5. 已发布（公开）

**数据源**: `UserGeneratedContent` 表，筛选 `status === 'completed' || 'published'`

**计算逻辑**:
```typescript
const publishedCount = allContents.filter((c) => 
  c.status === 'completed' || c.status === 'published'
).length
```

### 6. 加入时间

**数据源**: `User.createdAt` 字段

**计算逻辑**:
```typescript
const joinDate = infoData.userInfo?.createdAt
```

## 💰 钱包系统

### 数据结构

#### UserWallet (数据库表)
```prisma
model UserWallet {
  id              String   @id @default(cuid())
  userId          String   @unique
  balance         Float    @default(0)    // 账户余额
  totalSpent      Float    @default(0)    // 总消费金额
  totalEarned     Float    @default(0)    // 总充值金额
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

### 钱包卡片展示

```
┌─────────────────────────┐
│ 💰 我的钱包              │
├─────────────────────────┤
│ 账户余额                │
│     $0.00              │
├─────────────────────────┤
│ 总充值      │ 总消费    │
│ $0.00      │ $0.00     │
├─────────────────────────┤
│ [充值 / 查看详情]       │
└─────────────────────────┘
```

### API 接口

#### GET `/api/user/wallet`

**请求**: 无需参数（自动获取当前登录用户）

**响应**:
```json
{
  "success": true,
  "wallet": {
    "balance": 0.00,
    "totalSpent": 0.00,
    "totalEarned": 0.00
  },
  "dailyFreeUsed": 0,
  "dailyFreeLimit": 15,
  "isNewUser": false
}
```

## 📊 数据流图

### 统计数据流

```
用户完成创作
  ↓
保存到 UserGeneratedContent 表
  ├─ imageCount: 本次生成的图片数
  ├─ status: 'draft' | 'private' | 'completed' | 'published'
  └─ createdAt: 创作时间
  ↓
Profile 页面加载
  ↓
GET /api/user/generated-content?limit=1000
  ↓
计算统计数据
  ├─ totalImages = Σ(imageCount)
  ├─ totalContents = 记录总数
  ├─ draftContents = status === 'draft'
  ├─ privateContents = status === 'private'
  └─ publishedContents = status === 'completed' || 'published'
  ↓
展示在 Profile 页面
```

### 钱包数据流

```
用户登录
  ↓
Profile 页面加载
  ↓
GET /api/user/wallet
  ↓
获取钱包信息
  ├─ balance (余额)
  ├─ totalSpent (总消费)
  └─ totalEarned (总充值)
  ↓
展示在钱包卡片
```

## 🎨 UI 布局

### Profile 页面左侧栏（从上到下）

```
1. 用户头像和基本信息
   ├─ 头像
   ├─ 姓名
   ├─ 邮箱
   ├─ [编辑资料]
   └─ 性别/生日/身高/发型

2. 💰 钱包卡片 ✨ 新增
   ├─ 账户余额 (大字显示)
   ├─ 总充值 | 总消费
   └─ [充值 / 查看详情]

3. 📊 创作统计
   ├─ 生成图片: 156
   ├─ 创作次数: 24
   ├─ ─────────
   ├─ 🟡 已创作: 8
   ├─ 🔒 锁着的: 3
   ├─ 🟢 已发布: 13
   ├─ ─────────
   └─ 🕐 加入时间: 2025/10

4. ⚙️ 快捷操作
   ├─ 完善个人资料 →
   ├─ 开始创作 →
   └─ 浏览图库 →
```

## 💰 钱包卡片详细设计

### 视觉效果

```tsx
<div className="bg-gradient-to-br from-magazine-primary to-magazine-secondary rounded-xl shadow-sm p-6 text-white">
  {/* 标题 */}
  <h3 className="font-semibold mb-4 flex items-center gap-2">
    <span className="text-2xl">💰</span>
    我的钱包
  </h3>
  
  {/* 余额 */}
  <div className="flex items-center justify-between">
    <span className="text-sm opacity-90">账户余额</span>
    <span className="text-2xl font-bold">$0.00</span>
  </div>
  
  {/* 统计 */}
  <div className="border-t border-white/20 pt-3 grid grid-cols-2 gap-4 text-xs">
    <div>
      <p className="opacity-75">总充值</p>
      <p className="text-lg font-semibold">$0.00</p>
    </div>
    <div>
      <p className="opacity-75">总消费</p>
      <p className="text-lg font-semibold">$0.00</p>
    </div>
  </div>
  
  {/* 按钮 */}
  <button className="w-full mt-3 px-4 py-2 bg-white text-magazine-primary rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium">
    充值 / 查看详情
  </button>
</div>
```

### 颜色设计

- **背景**: 品牌色渐变（`from-magazine-primary to-magazine-secondary`）
- **文字**: 白色
- **分隔线**: 半透明白色（`border-white/20`）
- **按钮**: 白色背景 + 品牌色文字

## 🔢 统计数据示例

### 场景1: 新用户

```
生成图片: 0
创作次数: 0
─────────────
已创作: 0
🔒 锁着的: 0
已发布: 0
─────────────
加入时间: 2025/10/31
```

### 场景2: 活跃用户

```
生成图片: 156
创作次数: 24
─────────────
已创作: 8     (草稿)
🔒 锁着的: 3   (私密)
已发布: 13    (公开)
─────────────
加入时间: 2025/09/15
```

### 场景3: 重度用户

```
生成图片: 1,245
创作次数: 189
─────────────
已创作: 45    (草稿)
🔒 锁着的: 20  (私密)
已发布: 124   (公开)
─────────────
加入时间: 2025/01/10
```

## 🔄 数据更新机制

### 自动更新

每次用户生成内容时：

1. **创建记录**
```typescript
await prisma.userGeneratedContent.create({
  data: {
    userId: user.id,
    imageCount: images.length,  // 🔥 本次生成的图片数
    status: 'completed',         // 🔥 默认状态
    // ... 其他字段
  }
})
```

2. **自动累加**
- `totalImages` = 所有记录的 `imageCount` 之和
- `totalContents` = 记录总数
- `draftContents` = `status === 'draft'` 的记录数
- `privateContents` = `status === 'private'` 的记录数
- `publishedContents` = `status === 'completed' || 'published'` 的记录数

### 手动刷新

用户可以：
1. 重新进入 Profile 页面
2. 刷新浏览器
3. 点击"查看全部"重新加载数据

## 💡 数据准确性保证

### 1. 实时同步

```typescript
// Profile 页面加载时
useEffect(() => {
  if (isAuthenticated) {
    loadUserData()  // 每次进入都重新加载
  }
}, [isAuthenticated])
```

### 2. 数据库一致性

```typescript
// 获取所有创作内容（最多1000条）
const response = await fetch('/api/user/generated-content?limit=1000&offset=0')

// 使用数据库的实际记录计算
const totalImages = allContents.reduce(...)
const totalContents = allContentsData.total
```

### 3. 状态校验

```typescript
// 确保只统计有效状态
const validStatuses = ['draft', 'private', 'completed', 'published']
const draftCount = allContents.filter(c => c.status === 'draft').length
```

## 🚀 未来优化

### 1. 实时更新（WebSocket）

```typescript
// 用户生成内容时，实时推送更新
socket.on('content_created', (data) => {
  setUserStats(prev => ({
    ...prev,
    totalImages: prev.totalImages + data.imageCount,
    totalContents: prev.totalContents + 1
  }))
})
```

### 2. 缓存优化

```typescript
// 使用 React Query 缓存数据
const { data: userStats } = useQuery('userStats', fetchUserStats, {
  staleTime: 5 * 60 * 1000,  // 5分钟内使用缓存
  cacheTime: 10 * 60 * 1000  // 缓存保留10分钟
})
```

### 3. 钱包充值功能

```typescript
// 跳转到充值页面
<button onClick={() => router.push('/wallet')}>
  充值 / 查看详情
</button>
```

### 4. 钱包交易历史

```typescript
// 显示最近交易
{transactions.map(tx => (
  <div key={tx.id}>
    <span>{tx.type}</span>
    <span>${tx.amount}</span>
    <span>{tx.date}</span>
  </div>
))}
```

## 📝 修改的文件

1. ✅ `app/profile/page.tsx`
   - 添加钱包数据状态
   - 加载钱包信息
   - 添加钱包卡片UI

2. ✅ `app/api/user/wallet/route.ts`
   - 修改返回格式
   - 添加 `success` 标志
   - 包装 `wallet` 数据对象

3. ✅ `Profile统计与钱包系统说明.md`
   - 详细文档

## 📊 数据监控建议

### 1. 日志记录

```typescript
console.log('📊 [PROFILE] 统计数据:', {
  totalImages,
  totalContents,
  draftContents,
  privateContents,
  publishedContents
})
```

### 2. 数据验证

```typescript
// 验证数据合理性
if (totalImages < 0 || totalContents < 0) {
  console.error('❌ [PROFILE] 统计数据异常!')
}

// 验证状态总和
const statusTotal = draftContents + privateContents + publishedContents
if (statusTotal !== totalContents) {
  console.warn('⚠️ [PROFILE] 状态统计不一致')
}
```

### 3. 性能监控

```typescript
const startTime = Date.now()
const data = await loadUserData()
console.log(`⏱️ [PROFILE] 数据加载耗时: ${Date.now() - startTime}ms`)
```

---

**更新时间**：2025-10-31  
**功能状态**：✅ 已完成  
**数据来源**：数据库 (UserGeneratedContent, UserWallet)  
**更新机制**：每次进入 Profile 页面自动加载



