# 🚨 紧急：用户数据问题修复指南

## 问题总结

### 1. 数据混淆问题 🚨
**现象：** 你看到的常去地点包含"刘骁"和"evelyn"两个用户的数据

**可能原因：**
- UserMetadata的userId关联错误
- 数据更新时没有正确隔离用户
- 可能存在数据迁移错误

### 2. 地点分类不准确 ⚠️
**现象：** `frequentLocations` 混合了两种数据：
- 用户明确说的具体地点：如"莱莱小笼"、"悬崖咖啡"
- AI推测的场所类型：如"餐厅"、"美食场所"

**应该是：**
- **第一层（表意识）**：用户明确说的地点
- **第二层（潜意识）**：AI推测的场所类型

## 立即行动步骤

### 第一步：检查数据隔离问题

1. **查看Prisma Studio**（已打开）：
   ```
   http://localhost:5555
   ```

2. **检查UserMetadata表**：
   - 查看每条记录的 `userId`
   - 确认是否有多条记录关联到同一个 `userId`
   - 确认 evelyn 的 userId 和 刘骁 的 userId 是否不同

3. **运行检查脚本**：
   ```bash
   npx ts-node scripts/check-user-data-isolation.ts
   ```
   这个脚本会：
   - 列出所有用户
   - 检查每个用户的metadata关联
   - 发现孤立或错误的记录

### 第二步：修复地点分类问题

1. **运行地点修复脚本**（只检查，不修改）：
   ```bash
   npx ts-node scripts/fix-frequent-locations.ts
   ```
   这个脚本会：
   - 分析 `frequentLocations` 中的数据
   - 区分具体地点 vs 场所类型
   - 输出修复建议

2. **查看输出**：
   - ✅ 具体地点：应该移到第一层
   - ❌ 场所类型：保留在第二层

### 第三步：更新数据库Schema

1. **添加新字段到 schema.prisma**（已完成）：
   ```prisma
   // 🆕 手机号登录
   phone         String?   @unique
   phoneVerified Boolean   @default(false)
   
   // 🆕 第一层：用户明确提到的地点（建议新增）
   userMentionedLocations   String?  // JSON
   userMentionedActivities  String?  // JSON  
   userMentionedFoods       String?  // JSON
   ```

2. **运行迁移**：
   ```bash
   npx prisma migrate dev --name add_phone_and_mentioned_fields
   ```

3. **生成Prisma Client**：
   ```bash
   npx prisma generate
   ```

## 临时解决方案（如果数据确实混了）

### 方案A：手动分离数据（推荐）

1. 在Prisma Studio中：
   - 找到 evelyn 的 UserMetadata 记录
   - 找到 刘骁 的 UserMetadata 记录
   - 检查 `frequentLocations` 字段
   - 手动编辑，移除不属于该用户的地点

2. 备份当前数据：
   ```bash
   sqlite3 prisma/dev.db ".backup prisma/dev_backup_$(date +%Y%m%d).db"
   ```

### 方案B：清空重新开始

如果数据混乱严重，可以：

1. **备份数据库**：
   ```bash
   cp prisma/dev.db prisma/dev_backup.db
   ```

2. **清空UserMetadata**：
   ```sql
   DELETE FROM user_metadata;
   ```

3. **重新分析生成**：
   下次对话时会自动重新生成metadata

## 防止未来出现类似问题

### 1. 确保API正确使用userId

检查所有写入 UserMetadata 的代码：

```typescript
// ✅ 正确
await prisma.userMetadata.upsert({
  where: { userId: session.user.id },  // 使用当前用户ID
  update: { ... },
  create: { userId: session.user.id, ... }
})

// ❌ 错误
await prisma.userMetadata.update({
  where: { id: someId },  // 可能更新错误的记录
  data: { ... }
})
```

### 2. 添加数据验证

在更新metadata前验证：

```typescript
// 验证metadata属于当前用户
const metadata = await prisma.userMetadata.findUnique({
  where: { userId: session.user.id }
})

if (!metadata || metadata.userId !== session.user.id) {
  throw new Error('数据不属于当前用户')
}
```

### 3. 正确分离两层数据

在存储时就分离：

```typescript
// 第一层：用户明确说的
const userMentionedLocations = extractMentionedLocations(userInput)  // "莱莱小笼"

// 第二层：AI推测的
const aiInferredVenues = inferVenueTypes(userMentionedLocations)  // "餐厅"

await prisma.userMetadata.update({
  data: {
    userMentionedLocations: JSON.stringify(userMentionedLocations),  // 第一层
    favoriteVenues: JSON.stringify(aiInferredVenues)  // 第二层
  }
})
```

## 手机号注册功能

### 已添加Schema字段

```prisma
model User {
  phone         String?   @unique
  phoneVerified Boolean   @default(false)
}

model PhoneVerificationCode {
  phone     String
  code      String
  type      String
  expires   DateTime
}
```

### 下一步实现

1. **创建手机验证API**：
   - `/api/auth/send-code` - 发送验证码
   - `/api/auth/verify-code` - 验证验证码
   - `/api/auth/register-phone` - 手机号注册

2. **更新注册页面**：
   - 添加手机号输入
   - 发送验证码按钮
   - 验证码输入框

## 检查清单

在Prisma Studio中检查：

- [ ] users 表中有几个用户？
- [ ] 每个用户的 id 是什么？
- [ ] user_metadata 表中有几条记录？
- [ ] 每条 user_metadata 的 userId 指向哪个用户？
- [ ] evelyn 的 frequentLocations 包含哪些地点？
- [ ] 刘骁 的 frequentLocations 包含哪些地点？
- [ ] 是否有重复或混淆的数据？

## 需要的信息

请在Prisma Studio中查看并告诉我：

1. **users 表**：
   - 有多少个用户？
   - evelyn 的 userId 是什么？
   - 刘骁 的 userId 是什么？

2. **user_metadata 表**：
   - 有多少条记录？
   - 每条记录的 userId 是什么？
   - evelyn 的 metadata 的 frequentLocations 包含什么？

这样我才能准确诊断问题并提供修复方案！

## 相关文件

- ✅ `scripts/check-user-data-isolation.ts` - 检查用户数据隔离
- ✅ `scripts/fix-frequent-locations.ts` - 修复地点分类
- ✅ `scripts/add-phone-field.sql` - SQL脚本（参考）
- ✅ `prisma/schema.prisma` - 已更新（添加phone字段）

## 运行检查

```bash
# 1. 安装依赖（如果需要）
npm install ts-node @types/node --save-dev

# 2. 运行用户隔离检查
npx ts-node scripts/check-user-data-isolation.ts

# 3. 运行地点分类检查
npx ts-node scripts/fix-frequent-locations.ts

# 4. 查看Prisma Studio
# 已经打开在 http://localhost:5555
```

---

**下一步：请在Prisma Studio中查看数据，然后告诉我具体情况！** 🔍








