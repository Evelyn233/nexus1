# 快速修复指南 - 地点数据分类

## 问题

你的 `frequentLocations` 混合了两种数据：

### ✅ 具体地点（应该在第一层 - 表意识）
- 莱莱小笼
- 悬崖咖啡
- 静安寺/静安寺商圈
- 贵阳
- 上海老字号餐厅
- 社区办公室
- 工作台

### ❌ 场所类型（应该在第二层 - 潜意识）
- 餐厅
- 美食场所
- 工作场所
- 传统餐厅
- 安静环境
- 编程环境

## 快速修复步骤

### 步骤1：更新Schema（添加新字段）

我已经在 `prisma/schema.prisma` 中添加了：
```prisma
// 🆕 第一层：用户明确提到的具体信息
userMentionedLocations   String?  // 具体地点
userMentionedActivities  String?  // 活动
userMentionedFoods       String?  // 食物
userMentionedPeople      String?  // 人物
```

运行迁移：
```bash
npx prisma migrate dev --name add_user_mentioned_fields
npx prisma generate
```

### 步骤2：清理数据

运行清理脚本：
```bash
npx ts-node scripts/clean-user-locations.ts
```

这个脚本会：
1. ✅ 分析你的 frequentLocations
2. ✅ 分离具体地点 vs 场所类型
3. ✅ 显示建议的更新
4. ✅ 执行更新（如果你同意）

### 步骤3：验证结果

在 Prisma Studio (http://localhost:5555) 中检查：

**第一层（表意识）:**
- `userMentionedLocations`: 应该包含具体地点
- `frequentLocations`: 可以清空或保留（待废弃）

**第二层（潜意识）:**
- `favoriteVenues`: 应该只包含场所类型

## 最终目标数据结构

### 第一层（用户真实说的）
```json
{
  "userMentionedLocations": [
    {
      "name": "莱莱小笼",
      "timestamp": "2024-01-01T10:00:00Z",
      "context": "用户说：去莱莱小笼吃饭"
    },
    {
      "name": "悬崖咖啡",
      "timestamp": "2024-01-02T15:00:00Z",
      "context": "用户说：在悬崖咖啡工作"
    },
    {
      "name": "静安寺",
      "timestamp": "2024-01-03T12:00:00Z",
      "context": "用户说：去静安寺逛街"
    }
  ]
}
```

### 第二层（AI推测的）
```json
{
  "favoriteVenues": [
    "餐厅",
    "咖啡厅",
    "美食场所"
  ],
  
  "frequentLocations": [
    {
      "location": "静安寺商圈",
      "frequency": 5,
      "confidence": 0.85,
      "basedOn": ["userMentionedLocations"]
    }
  ]
}
```

## 运行命令

```bash
# 1. 更新数据库结构
npx prisma migrate dev --name add_user_mentioned_fields
npx prisma generate

# 2. 清理数据
npx ts-node scripts/clean-user-locations.ts

# 3. 检查结果
# 打开 http://localhost:5555
```

## 注意事项

1. **备份数据**：
   ```bash
   # Windows PowerShell
   Copy-Item prisma/dev.db prisma/dev_backup.db
   ```

2. **只有一个用户**：
   - 你的用户 ID: `cmgm6e4mv0000upispmfwegj4`
   - 所以不存在用户混淆问题
   - 只是地点分类需要优化

3. **昨天看到两个用户**：
   - 可能是另一个数据库文件
   - 或者已经被删除了
   - 现在只有一个用户是正常的

## 完成后

✅ 第一层：包含用户明确说的地点  
✅ 第二层：包含AI推测的场所类型  
✅ 数据分类清晰  
✅ 优先级正确  

---

**现在就运行这些命令吧！** 🚀








