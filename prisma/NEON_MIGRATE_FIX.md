# P1001: Can't reach database server (Neon)

## 0. 使用 DIRECT_URL（Neon 若 P1001 再配）

若你用的是 **Neon 的 Pooler 地址**（主机名里带 `-pooler`）且 `db pull` / `migrate` 报 **P1001**，需要加直连地址：

1. 在 **prisma/schema.prisma** 里，把 `datasource db` 下的 `// directUrl = env("DIRECT_URL")` 取消注释（删掉 `//`）。
2. 在 **.env** 里增加 `DIRECT_URL`：

```env
# 应用运行时用（Pooler）
DATABASE_URL="postgresql://USER:PASSWORD@ep-xxx-pooler.us-east-1.aws.neon.tech:5432/neondb?sslmode=require"

# Prisma CLI（db pull / migrate）用，Neon 控制台里选「Direct connection」复制
DIRECT_URL="postgresql://USER:PASSWORD@ep-xxx.us-east-1.aws.neon.tech:5432/neondb?sslmode=require"
```

- **DIRECT_URL**：在 [Neon Console](https://console.neon.tech) → 你的项目 → **Connection details** 里选 **Direct connection**，复制完整 URL，末尾加上 `?sslmode=require`（若已有 `?` 则用 `&sslmode=require`）。
- 主机名**不要**带 `-pooler` 的那条就是 Direct。

改完后保存，再执行：

```bash
npx prisma db pull
# 或
npx prisma migrate dev --name your_migration_name
```

## 1. 给 DATABASE_URL 加上 SSL（Neon 必须）

`prisma migrate dev` 用的是 **.env 里的 DATABASE_URL / DIRECT_URL 原始值**，不会走代码里的 `normalizeDatabaseUrl`。

在 **.env** 里确保两条 URL 末尾都带 `?sslmode=require`，例如：

```env
DATABASE_URL="postgresql://USER:PASSWORD@ep-gentle-wave-a458k1e4-pooler.us-east-1.aws.neon.tech:5432/neondb?sslmode=require"
DIRECT_URL="postgresql://USER:PASSWORD@ep-gentle-wave-a458k1e4.us-east-1.aws.neon.tech:5432/neondb?sslmode=require"
```

- 若已有 `?` 参数，写成：`...neondb?已有参数&sslmode=require`
- 没有 `?` 则：`...neondb?sslmode=require`

改完后保存，再执行：

```bash
npx prisma migrate dev --name add_profile_messages
```

## 2. 确认 Neon 项目未暂停

Neon 长时间不用会暂停，需要先“唤醒”：

1. 打开 [Neon Console](https://console.neon.tech)
2. 进入对应项目
3. 若显示 Suspended / Paused，点 **Restore** 或 **Resume**
4. 等几秒后再跑 `prisma migrate dev`

## 3. 网络 / 防火墙

- 本机或公司网络是否禁止出站 5432
- 关掉 VPN 试一次，或换一个网络（如手机热点）再试

## 4. 快速检查连接（可选）

```bash
# 先保证 .env 里 DATABASE_URL 带 ?sslmode=require，再：
npx prisma db pull
```

若 `db pull` 能成功，再跑 `npx prisma migrate dev` 即可。
