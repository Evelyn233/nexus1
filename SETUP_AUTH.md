# NextAuth.js + Prisma 用户认证系统设置指南

## 📦 第一步：安装依赖

```bash
npm install next-auth @prisma/client @next-auth/prisma-adapter bcryptjs
npm install -D prisma @types/bcryptjs
```

## 🗄️ 第二步：初始化 Prisma

```bash
# 初始化 Prisma（如果还没有）
npx prisma init

# 生成 Prisma Client
npx prisma generate

# 创建数据库表
npx prisma db push

# 或者使用 migration（推荐生产环境）
npx prisma migrate dev --name init
```

## 🔐 第三步：配置环境变量

复制 `.env.example` 到 `.env`:

```bash
cp .env.example .env
```

然后编辑 `.env` 文件：

```env
# 数据库连接
DATABASE_URL="file:./dev.db"

# NextAuth 配置
NEXTAUTH_URL="http://localhost:3001"
NEXTAUTH_SECRET="your-secret-key-change-this"

# 生成一个安全的 secret
# 运行: openssl rand -base64 32
```

### 生成 NEXTAUTH_SECRET

**Windows (PowerShell):**
```powershell
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString()))
```

**Mac/Linux:**
```bash
openssl rand -base64 32
```

## 🎨 第四步：更新 Layout

编辑 `app/layout.tsx`:

```typescript
import { Providers } from './providers'

export default function RootLayout({ children }) {
  return (
    <html lang="zh">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
```

## 🚀 第五步：测试系统

1. **启动开发服务器:**
```bash
npm run dev
```

2. **访问注册页面:**
```
http://localhost:3001/auth/signup
```

3. **注册新账号:**
   - 输入姓名、邮箱、密码
   - 点击注册
   - 自动登录并跳转到用户信息页面

4. **访问登录页面:**
```
http://localhost:3001/auth/signin
```

5. **访问受保护的页面:**
```
http://localhost:3001/home
```
   - 未登录会自动跳转到登录页面
   - 登录后可以正常访问

## 📊 数据库管理

### 查看数据库

```bash
# 打开 Prisma Studio（可视化数据库管理工具）
npx prisma studio
```

### 重置数据库

```bash
# 删除并重新创建数据库
npx prisma migrate reset
```

### 查看数据库状态

```bash
npx prisma db pull  # 从数据库同步 schema
npx prisma format   # 格式化 schema 文件
```

## 🎯 系统架构

### 文件结构

```
magazine/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── [...nextauth]/route.ts  # NextAuth API
│   │       └── register/route.ts       # 注册 API
│   ├── auth/
│   │   ├── signin/page.tsx             # 登录页面
│   │   └── signup/page.tsx             # 注册页面
│   ├── providers.tsx                   # Session Provider
│   └── layout.tsx
├── lib/
│   ├── prisma.ts                       # Prisma 客户端
│   └── auth.ts                         # NextAuth 配置
├── prisma/
│   ├── schema.prisma                   # 数据库 Schema
│   └── dev.db                          # SQLite 数据库
├── middleware.ts                       # 路由保护
└── .env                                # 环境变量
```

### 数据流

```
用户注册
  ↓
POST /api/auth/register
  ↓
Prisma 创建用户（密码加密）
  ↓
自动调用 signIn
  ↓
JWT Token 生成
  ↓
Session 创建
  ↓
跳转到用户信息页面
```

## 🔒 安全特性

✅ **密码加密**: 使用 bcrypt 加密存储  
✅ **JWT Token**: 安全的会话管理  
✅ **路由保护**: Middleware 自动保护  
✅ **CSRF 保护**: NextAuth 内置  
✅ **环境变量**: 敏感信息不提交代码库  

## 🌐 OAuth 配置（可选）

### Google OAuth

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 创建项目并启用 OAuth
3. 获取 Client ID 和 Secret
4. 添加到 `.env`:
```env
GOOGLE_CLIENT_ID="your-client-id"
GOOGLE_CLIENT_SECRET="your-client-secret"
```

### GitHub OAuth

1. 访问 [GitHub Settings > Developer settings](https://github.com/settings/developers)
2. 创建 OAuth App
3. 添加到 `.env`:
```env
GITHUB_ID="your-github-client-id"
GITHUB_SECRET="your-github-client-secret"
```

## 🛠️ 常见问题

### Q: 登录后立即退出？
A: 检查 `NEXTAUTH_SECRET` 是否设置正确

### Q: 数据库连接失败？
A: 确认 `DATABASE_URL` 配置正确，运行 `npx prisma db push`

### Q: OAuth 登录不工作？
A: 确认回调 URL 配置正确：`http://localhost:3001/api/auth/callback/google`

### Q: 中间件重定向循环？
A: 检查 `middleware.ts` 的 matcher 配置

## 📝 下一步

- [ ] 添加忘记密码功能
- [ ] 添加邮箱验证
- [ ] 添加用户头像上传
- [ ] 添加更多 OAuth 提供商（微信、微博等）
- [ ] 集成到现有的用户信息系统
- [ ] 添加管理员权限系统
- [ ] 实现用户资料编辑

## 🎓 学习资源

- [NextAuth.js 文档](https://next-auth.js.org/)
- [Prisma 文档](https://www.prisma.io/docs)
- [Next.js 文档](https://nextjs.org/docs)

## 📧 支持

如有问题，请查看:
- NextAuth.js GitHub Issues
- Prisma Discord 社区
- Stack Overflow

