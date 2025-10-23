# ✅ NextAuth.js + Prisma 用户认证系统 - 完成！

## 🎉 已创建的文件

### 1. 数据库配置
- ✅ `prisma/schema.prisma` - 数据库 Schema（包含用户、会话、聊天记录表）
- ✅ `lib/prisma.ts` - Prisma 客户端单例

### 2. 认证系统
- ✅ `lib/auth.ts` - NextAuth 配置（支持邮箱登录 + OAuth）
- ✅ `app/api/auth/[...nextauth]/route.ts` - NextAuth API 路由
- ✅ `app/api/auth/register/route.ts` - 用户注册 API

### 3. 用户界面
- ✅ `app/auth/signin/page.tsx` - 登录页面（美观的UI）
- ✅ `app/auth/signup/page.tsx` - 注册页面
- ✅ `app/providers.tsx` - Session Provider
- ✅ `middleware.ts` - 路由保护中间件

### 4. 文档
- ✅ `SETUP_AUTH.md` - 详细设置指南
- ✅ `.env.example` - 环境变量模板

## 🚀 快速开始

### 第一步：安装依赖

```bash
npm install next-auth @prisma/client @next-auth/prisma-adapter bcryptjs
npm install -D prisma @types/bcryptjs
```

### 第二步：配置环境变量

复制环境变量模板：
```bash
cp .env.example .env
```

生成安全的 SECRET（Windows PowerShell）：
```powershell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString()))
```

编辑 `.env` 文件，填入生成的 SECRET。

### 第三步：初始化数据库

```bash
# 生成 Prisma Client
npx prisma generate

# 创建数据库表
npx prisma db push

# 查看数据库（可选）
npx prisma studio
```

### 第四步：启动项目

```bash
npm run dev
```

### 第五步：测试

1. **访问注册页面**: http://localhost:3001/auth/signup
2. **注册新账号**
3. **自动登录** → 跳转到用户信息页面
4. **访问受保护页面**: http://localhost:3001/home
5. **退出登录**
6. **尝试访问受保护页面** → 自动跳转到登录页

## 🎯 功能特性

### ✅ 完整的认证流程
- 邮箱密码注册/登录
- OAuth 登录（Google、GitHub）
- 自动会话管理
- 路由保护

### ✅ 安全特性
- 密码 bcrypt 加密
- JWT Token 会话
- CSRF 保护
- 环境变量保护

### ✅ 用户体验
- 美观的登录/注册页面
- 错误提示
- 自动跳转
- 记住我功能

### ✅ 数据库设计
- 用户表（扩展字段：性别、生日、身高等）
- OAuth 账号表
- 会话表
- 聊天记录表
- 图片记录表

## 📊 系统架构

```
┌─────────────┐
│   用户访问   │
└──────┬──────┘
       │
       ↓
┌─────────────────┐
│  Middleware     │ ← 检查认证状态
│  (路由保护)     │
└──────┬──────────┘
       │
       ↓
    已登录？
    ┌───┴───┐
   是│       │否
    ↓       ↓
┌────────┐ ┌──────────────┐
│ 访问页面│ │跳转到登录页面│
└────────┘ └──────────────┘
             │
             ↓
        ┌─────────┐
        │登录/注册│
        └────┬────┘
             │
             ↓
        ┌─────────────┐
        │ NextAuth.js │ ← 处理认证
        └──────┬──────┘
               │
               ↓
        ┌────────────┐
        │  Prisma    │ ← 存储数据
        │  Database  │
        └────────────┘
```

## 🔐 数据库表结构

### users 表
```prisma
- id: 用户ID
- name: 姓名
- email: 邮箱（唯一）
- password: 密码（加密）
- gender: 性别
- birthDate: 生日
- height: 身高
- weight: 体重
- location: 所在地
- personality: 性格描述
- createdAt: 创建时间
- updatedAt: 更新时间
```

### accounts 表（OAuth）
```prisma
- provider: 提供商（google/github）
- providerAccountId: 提供商账号ID
- access_token: 访问令牌
- refresh_token: 刷新令牌
```

### sessions 表
```prisma
- sessionToken: 会话令牌
- userId: 用户ID
- expires: 过期时间
```

### chat_sessions 表
```prisma
- userId: 用户ID
- title: 对话标题
- messages: 消息列表（JSON）
- createdAt: 创建时间
```

### generated_images 表
```prisma
- userId: 用户ID
- filename: 文件名
- prompt: 提示词
- imageUrl: 图片URL
- createdAt: 创建时间
```

## 🎨 UI 页面

### 登录页面
- 美观的渐变背景
- 邮箱密码输入
- OAuth 按钮（Google/GitHub）
- "记住我"选项
- 忘记密码链接
- 注册链接

### 注册页面
- 姓名、邮箱、密码输入
- 密码确认
- 服务条款勾选
- 自动登录
- 登录链接

## 🔄 认证流程

### 注册流程
```
1. 用户填写注册表单
   ↓
2. POST /api/auth/register
   ↓
3. 验证邮箱是否已存在
   ↓
4. bcrypt 加密密码
   ↓
5. Prisma 创建用户
   ↓
6. 自动调用 signIn
   ↓
7. 生成 JWT Token
   ↓
8. 创建 Session
   ↓
9. 跳转到 /user-info
```

### 登录流程
```
1. 用户输入邮箱密码
   ↓
2. signIn('credentials')
   ↓
3. NextAuth 调用 authorize
   ↓
4. 验证密码
   ↓
5. 生成 JWT Token
   ↓
6. 创建 Session
   ↓
7. 跳转到回调URL
```

### OAuth 流程
```
1. 用户点击 OAuth 按钮
   ↓
2. 跳转到提供商登录页
   ↓
3. 用户授权
   ↓
4. 回调到 /api/auth/callback/[provider]
   ↓
5. NextAuth 处理回调
   ↓
6. 创建/更新用户
   ↓
7. 创建 Session
   ↓
8. 跳转到 /home
```

## 🛡️ 安全最佳实践

### ✅ 已实现
- 密码 bcrypt 加密（12 rounds）
- JWT Token 会话
- CSRF 保护（NextAuth 内置）
- 环境变量保护
- SQL 注入防护（Prisma）
- XSS 防护（React）

### 🔜 建议添加
- 邮箱验证
- 两步验证（2FA）
- 密码强度检查
- 登录失败次数限制
- IP 白名单
- 日志记录

## 📝 常用命令

```bash
# 数据库操作
npx prisma db push        # 同步 schema 到数据库
npx prisma studio         # 打开可视化管理工具
npx prisma migrate dev    # 创建 migration
npx prisma migrate reset  # 重置数据库

# 开发
npm run dev              # 启动开发服务器
npm run build            # 生产构建
npm run start            # 生产运行

# 测试
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123456"}'
```

## 🔄 与现有系统集成

### 保持兼容
现有的用户信息系统（localStorage）和新的认证系统可以并存：

1. **登录后**：从数据库加载用户信息到 localStorage
2. **信息更新**：同时更新数据库和 localStorage
3. **退出登录**：清空 localStorage

### 迁移方案
```typescript
// 登录成功后，同步到 localStorage
const syncUserData = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (user) {
    localStorage.setItem('magazine_user_info', JSON.stringify({
      name: user.name,
      gender: user.gender,
      // ... 其他字段
    }))
  }
}
```

## 🎓 下一步扩展

### 短期目标
- [ ] 添加忘记密码功能
- [ ] 添加邮箱验证
- [ ] 添加用户头像上传
- [ ] 优化错误提示

### 中期目标
- [ ] 添加更多 OAuth 提供商（微信、微博）
- [ ] 实现用户资料编辑页面
- [ ] 添加账号安全设置
- [ ] 实现注销账号功能

### 长期目标
- [ ] 多租户支持
- [ ] 管理员后台
- [ ] 用户行为分析
- [ ] A/B 测试系统

## 🆘 故障排除

### 问题1：登录后立即退出
**原因**: `NEXTAUTH_SECRET` 未设置或不正确  
**解决**: 重新生成并设置 SECRET

### 问题2：数据库连接失败
**原因**: `DATABASE_URL` 配置错误  
**解决**: 检查数据库路径，运行 `npx prisma db push`

### 问题3：OAuth 不工作
**原因**: 回调 URL 配置错误  
**解决**: 确认 OAuth 提供商配置的回调 URL 为 `http://localhost:3001/api/auth/callback/[provider]`

### 问题4：中间件重定向循环
**原因**: matcher 配置包含登录页面  
**解决**: 检查 `middleware.ts` 的逻辑

## 📚 学习资源

- [NextAuth.js 官方文档](https://next-auth.js.org/)
- [Prisma 官方文档](https://www.prisma.io/docs)
- [Next.js App Router](https://nextjs.org/docs/app)
- [bcrypt 文档](https://github.com/kelektiv/node.bcrypt.js)

## 🎉 完成！

你现在拥有一个完整的、生产级的用户认证系统！

**立即开始**：
```bash
npm install next-auth @prisma/client @next-auth/prisma-adapter bcryptjs
npm install -D prisma @types/bcryptjs
npx prisma generate
npx prisma db push
npm run dev
```

访问 http://localhost:3001/auth/signup 开始使用！

