# Vercel环境变量配置指南

## 🚨 重要：需要在Vercel Dashboard中手动设置

### 步骤1：创建PostgreSQL数据库
1. 进入 [Vercel Dashboard](https://vercel.com/dashboard)
2. 选择你的项目 → **Storage** → **Create Database** → **Postgres**
3. 选择免费计划，创建数据库
4. 复制数据库连接字符串

### 步骤2：设置环境变量
在Vercel Dashboard → 你的项目 → **Settings** → **Environment Variables** 添加：

```
DATABASE_URL=你的PostgreSQL连接字符串
NEXTAUTH_URL=https://inflow-nu.vercel.app
NEXTAUTH_SECRET=c8bbf0a4c60d5a4845aedf3c15daffd241d7759a466a9b57fc2494d916635070
DEEPSEEK_API_KEY=sk-e3911ff08dae4f4fb59c7b521e2a5415
SEEDREAM_API_KEY=17b4a6a5-1a2b-4c3d-827b-cef480fd1580
```

### 步骤3：重新部署
设置完环境变量后，Vercel会自动重新部署你的应用。

## 🔧 当前问题
- 应用显示"正在加载..."是因为缺少DATABASE_URL
- SQLite数据库无法在Vercel上工作
- 需要切换到PostgreSQL数据库
