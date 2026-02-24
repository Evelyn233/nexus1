# Drift 修复：不丢数据、只加 profile_messages 表

当前情况：数据库里已有表，但本地没有迁移历史（或历史不一致），所以 `prisma migrate dev` 报 drift。

**不要执行 `prisma migrate reset`**（会清空数据库）。

## 做法：用 db push 同步 schema

在项目根目录执行：

```bash
npx prisma db push
```

作用：

- 根据当前 `schema.prisma` 和数据库做**差异同步**
- 会**新建** `profile_messages` 表（以及 User 上的新关系）
- **不会删除**现有表和数据
- 不依赖迁移历史，所以不会报 drift

然后生成客户端（如未生成过）：

```bash
npx prisma generate
```

之后应用即可正常使用 profile 消息功能。

---

## 以后想用 migrate 怎么办（可选）

若之后希望用 `prisma migrate dev` 管理变更，需要先“对齐历史”：

1. 创建 migrations 目录并做一次“基线”迁移（把当前 DB 状态记为已应用）。
2. 详见：  
   https://www.prisma.io/docs/guides/database/developing-with-prisma-migrate/troubleshooting-development

当前阶段用 `db push` 即可。
