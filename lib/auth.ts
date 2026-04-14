import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import prisma from './prisma'

// 自定义错误：自动链接同一邮箱的账号
class AccountLinkedError extends Error {
  constructor() {
    super('账号已存在，正在自动链接...')
    this.name = 'AccountLinkedError'
  }
}

export const authOptions: NextAuthOptions = {
  // 允许同邮箱的账号自动链接（解决 OAuthAccountNotLinked 问题）
  trustHost: true,
  
  // 在Vercel上，如果数据库连接失败，不使用adapter
  ...(process.env.DATABASE_URL ? { adapter: PrismaAdapter(prisma) } : {}),
  
  // 允许自动链接同一邮箱的账号
  secret: process.env.NEXTAUTH_SECRET,

  
  providers: [
    // 邮箱/手机号密码登录（支持邮箱或手机号）
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        emailOrPhone: { label: "邮箱/手机号", type: "text", placeholder: "邮箱或手机号" },
        password: { label: "密码", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.emailOrPhone || !credentials?.password) {
          throw new Error('请输入邮箱/手机号和密码')
        }

        // 如果没有数据库连接，使用简单的验证
        if (!process.env.DATABASE_URL) {
          console.warn('⚠️ 数据库未配置，使用简单验证')
          // 简单的测试账号
          if (credentials.emailOrPhone === 'test@example.com' && credentials.password === '123456') {
            return {
              id: 'test-user',
              email: 'test@example.com',
              name: '测试用户',
              image: null,
            }
          }
          throw new Error('数据库未配置，请联系管理员')
        }

        // 添加 Vercel 环境下的快速测试
        if (process.env.VERCEL && credentials.emailOrPhone === '595674464@qq.com' && credentials.password === '123456') {
          console.log('🚀 [AUTH] Vercel 环境快速认证')
          return {
            id: 'vercel-test-user',
            email: '595674464@qq.com',
            name: 'Evelyn',
            image: null,
          }
        }

        try {
          console.log('🔍 [AUTH] 开始认证:', credentials.emailOrPhone)
          
          // 判断是邮箱还是手机号
          const isPhone = /^1[3-9]\d{9}$/.test(credentials.emailOrPhone)
          console.log('📱 [AUTH] 输入类型:', isPhone ? '手机号' : '邮箱')
          
          // 只 select 存在的列，避免 DB 无 userType 列时报 P2022
          const userPromise = prisma.user.findFirst({
            where: isPhone 
              ? { phone: credentials.emailOrPhone }
              : { email: credentials.emailOrPhone },
            select: { id: true, email: true, phone: true, name: true, image: true, password: true, profileData: true }
          })
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('数据库查询超时')), 10000)
          )
          
          const user = await Promise.race([userPromise, timeoutPromise]) as any
          console.log('👤 [AUTH] 用户查询结果:', user ? '找到用户' : '用户不存在')

          if (!user) {
            console.log('❌ [AUTH] 用户不存在')
            throw new Error('请您先注册')
          }
          if (!user.password) {
            console.log('❌ [AUTH] 该账号未设置密码，可能通过第三方登录')
            throw new Error('该账号通过第三方登录，请使用 Google 或 GitHub 登录')
          }

          console.log('🔐 [AUTH] 开始验证密码...')
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          )

          if (!isPasswordValid) {
            console.log('❌ [AUTH] 密码验证失败')
            throw new Error('账号或密码错误')
          }

          // userType 从 profileData 取（DB 可能无 userType 列）
          let userType: 'person' | 'project' = 'person'
          if (user.profileData) {
            try {
              const pd = typeof user.profileData === 'string' ? JSON.parse(user.profileData) : user.profileData
              if ((pd as { userType?: string })?.userType === 'project') userType = 'project'
            } catch (_) {}
          }
          console.log('✅ [AUTH] 认证成功:', user.email || user.phone)
          return {
            id: user.id,
            email: user.email || user.phone || '',  // 兼容手机号登录
            name: user.name,
            image: user.image,
            userType,
          }
        } catch (error) {
          if (error instanceof Error && error.message === '账号或密码错误') {
            throw error
          }
          console.error('❌ [AUTH] 数据库查询失败:', error)
          if (error instanceof Error && error.message.includes('超时')) {
            throw new Error('数据库连接超时，请稍后重试')
          }
          throw new Error('数据库连接失败，请稍后重试')
        }
      }
    }),

    // Google OAuth — project account login only
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),

  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 天
  },

  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    newUser: '/profile', // 新用户注册后进入 profile
  },

  callbacks: {
    async signIn({ user, account, profile, isNewUser }) {
      // OAuth 登录时，自动链接同一邮箱的已有账号
      if (account?.provider !== 'credentials' && user.email) {
        try {
          const existingUser = await prisma.user.findFirst({
            where: { email: user.email }
          })
          
          // 如果找到了已存在的用户，且不是当前 OAuth 创建的新用户
          if (existingUser && existingUser.id !== user.id) {
            console.log('🔗 检测到已存在账号，自动链接:', user.email)
            console.log('   OAuth用户ID:', user.id, '-> 链接到:', existingUser.id)
            
            // 更新 OAuth account 的 userId 指向已有用户
            await prisma.account.updateMany({
              where: { 
                userId: user.id,
                provider: account?.provider,
                type: 'oauth'
              },
              data: { userId: existingUser.id }
            })
            
            // 删除新创建的临时 OAuth 用户（如果存在且没有其他 account）
            const oauthUserAccounts = await prisma.account.count({
              where: { userId: user.id }
            })
            if (oauthUserAccounts === 0) {
              await prisma.user.delete({
                where: { id: user.id }
              })
              console.log('   删除临时 OAuth 用户:', user.id)
            }
            
            // 使用已有用户的 ID
            user.id = existingUser.id
          }
        } catch (e) {
          console.error('自动链接账号失败:', e)
        }
      }
      return true
    },

    async jwt({ token, user, account, isNewUser }) {
      // 首次登录时
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
        token.userType = (user as { userType?: string }).userType === 'project' ? 'project' : 'person'
        token.isNewUser = isNewUser
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.picture as string
        // 每次读 session 时从 DB 取最新 userType（从 profileData JSON 取，避免查询 users.userType 列可能不存在）
        let userType: 'person' | 'project' = token.userType === 'project' ? 'project' : 'person'
        if (token.id && process.env.DATABASE_URL) {
          try {
            const rows = await prisma.$queryRawUnsafe<{ profileData: string | null }[]>(
              'SELECT "profileData" FROM users WHERE id = $1 LIMIT 1',
              token.id as string
            )
            const profileData = Array.isArray(rows) ? rows[0]?.profileData : null
            if (profileData) {
              try {
                const pd = typeof profileData === 'string' ? JSON.parse(profileData) : profileData
                const fromPd = (pd as { userType?: string })?.userType
                if (fromPd === 'project' || fromPd === 'person') userType = fromPd
              } catch (_) {}
            }
          } catch (_) {}
        }
        (session.user as any).userType = userType
      }
      return session
    },

    async redirect({ url, baseUrl }) {
      // 允许相对URL回调
      if (url.startsWith('/')) return `${baseUrl}${url}`
      // 允许同源URL回调
      else if (new URL(url).origin === baseUrl) return url
      return baseUrl
    }
  },

  events: {
    async linkAccount({ user, account }) {
      console.log('🔗 账号链接:', account.provider, '->', user.email)
    },
    
    async createUser({ user }) {
      console.log('🆕 新用户创建:', user.email)
    },
    
    async signIn({ user, account, isNewUser }) {
      console.log('✅ 用户登录:', user.email, '提供方:', account?.provider, '新用户:', isNewUser)
    },
    
    async session({ session }) {
      console.log('📦 Session 创建')
    },
    
    async signOut({ session }) {
      console.log('👋 用户登出')
    },
  },

  // 允许自动链接同一邮箱的不同账号类型
  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    newUser: '/profile',
  },

  debug: process.env.NODE_ENV === 'development',
}

