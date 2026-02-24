# 数据库连接配置（Neon）

项目使用 **Neon** 的 PostgreSQL（你控制台里的 `inflow_db`）。按下面步骤改/确认配置即可。

## 1. 拿到连接串

1. 打开 [Neon 控制台](https://console.neon.tech)，登录 `595674464@qq.com`。
2. 进入项目 **inflow_db**。
3. 在项目里点 **Connection details**（或类似「连接」入口）。
4. 选择 **Pooled connection**（不要选 Direct），复制整段连接串，形如：
   ```text
   postgresql://neondb_owner:密码@ep-xxx-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
   ```
   主机名里要有 **-pooler**。

## 2. 写到本机环境变量

在**项目根目录**（和 `package.json` 同级）建或改：

- **`.env`** 或 **`.env.local`**

内容里加一行（把 `你的连接串` 换成上面复制的）：

```env
DATABASE_URL=你的连接串
```

例如：

```env
DATABASE_URL=postgresql://neondb_owner:xxxx@ep-gentle-wave-a458k1e4-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require
```

保存后**重启一次** `npm run dev`，让环境变量生效。

## 3. 代码里已自动加的参数

`lib/prisma.ts` 会对 Neon 的 URL 自动补：

- `sslmode=require`（若没有）
- `pgbouncer=true`（pooler 地址时）
- `connection_limit=5`（限制连接数，避免 P2024 连接池超时）

所以你**不用**在连接串里自己写 `connection_limit=5`，除非你想改成别的数字。

## 4. 常见报错对应

| 报错 | 处理 |
|------|------|
| **Can't reach database server** (P1001) | Neon 空闲会休眠，去控制台点进 **inflow_db** 等几秒「唤醒」再刷新页面；或检查网络/防火墙。 |
| **Timed out fetching a new connection** (P2024) | 连接池满了。代码已把 `connection_limit` 设为 5；若仍出现，可把 `.env` 里 URL 末尾加 `&connection_limit=3` 再试。 |

## 5. 其他可能的问题

| 情况 | 处理 |
|------|------|
| **Neon 休眠** | 免费版一段时间不用会休眠。去控制台点进 **inflow_db** 等几秒「唤醒」再刷新页面。代码里已加 `connect_timeout=15`，首次连接会多等一会儿。 |
| **连接池超时 P2024** | 已自动加 `connection_limit=5`。若仍出现，可把 URL 里改成 `connection_limit=3`。 |
| **多页面/多组件同时请求** | 首页、聊天、profile 等都会调 `/api/user/info` 或 `/api/user/sync`，同时开很多页会占满连接池。尽量少开标签页，或等一页加载完再切页。 |
| **本机网络/代理** | 若公司网络或 VPN 拦截出站 5432，会报 P1001。可换网络或关代理试一下。 |

## 6. 和 GitHub 的关系

- **Neon 控制台里的 GitHub 图标**：是 Neon 的「从 GitHub 部署/关联仓库」功能，和「你代码有没有上传 GitHub」是两回事。
- **代码没上传 GitHub**：只影响你是否用 GitHub 部署/CI；**不影响**本机用 `.env` 连 Neon。本机只要配好上面的 `DATABASE_URL` 即可。
- 若以后要把代码推到 GitHub：在 GitHub 新建仓库，本地 `git remote add origin <仓库地址>` 再 `git push` 即可；和改数据库配置无关。

---

**总结**：改数据库 = 在 Neon 控制台复制 **Pooled** 连接串 → 写到项目根目录 `.env` 或 `.env.local` 的 `DATABASE_URL` → 重启 `npm run dev`。

---

**代码里已自动处理**：`connection_limit=5`、`connect_timeout=15`、`sslmode=require`、`pgbouncer=true`（pooler 时）、启动健康检查只跑一次。
