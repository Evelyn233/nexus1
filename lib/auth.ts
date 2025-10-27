import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import GitHubProvider from 'next-auth/providers/github'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import prisma from './prisma'

export const authOptions: NextAuthOptions = {
  // 在Vercel上，如果数据库连接失败，不使用adapter
  ...(process.env.DATABASE_URL ? { adapter: PrismaAdapter(prisma) } : {}),
  
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

        try {
          console.log('🔍 [AUTH] 开始认证:', credentials.emailOrPhone)
          
          // 判断是邮箱还是手机号
          const isPhone = /^1[3-9]\d{9}$/.test(credentials.emailOrPhone)
          console.log('📱 [AUTH] 输入类型:', isPhone ? '手机号' : '邮箱')
          
          // 添加超时处理
          const userPromise = prisma.user.findFirst({
            where: isPhone 
              ? { phone: credentials.emailOrPhone }
              : { email: credentials.emailOrPhone }
          })
          
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('数据库查询超时')), 10000)
          )
          
          const user = await Promise.race([userPromise, timeoutPromise]) as any
          console.log('👤 [AUTH] 用户查询结果:', user ? '找到用户' : '用户不存在')

          if (!user || !user.password) {
            console.log('❌ [AUTH] 用户不存在或密码为空')
            throw new Error('账号或密码错误')
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

          console.log('✅ [AUTH] 认证成功:', user.email || user.phone)
          return {
            id: user.id,
            email: user.email || user.phone || '',  // 兼容手机号登录
            name: user.name,
            image: user.image,
          }
        } catch (error) {
          console.error('❌ [AUTH] 数据库查询失败:', error)
          if (error instanceof Error && error.message.includes('超时')) {
            throw new Error('数据库连接超时，请稍后重试')
          }
          throw new Error('数据库连接失败，请稍后重试')
        }
      }
    }),

    // Google OAuth（可选）
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []
    ),

    // GitHub OAuth（可选）
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [GitHubProvider({
          clientId: process.env.GITHUB_ID,
          clientSecret: process.env.GITHUB_SECRET,
        })]
      : []
    ),
  ],

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 天
  },

  pages: {
    signIn: '/auth/signin',
    signOut: '/auth/signout',
    error: '/auth/error',
    newUser: '/user-info', // 新用户注册后跳转到信息收集页面
  },

  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
      }
      return token
    },

    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id as string
        session.user.email = token.email as string
        session.user.name = token.name as string
        session.user.image = token.picture as string
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
    async signIn({ user, account, profile, isNewUser }) {
      console.log('✅ 用户登录:', user.email)
      
      // 新用户自动创建
      if (isNewUser) {
        console.log('🆕 新用户注册:', user.email)
      }
    },
    
    async signOut({ token }) {
      console.log('👋 用户登出:', token.email)
    },
  },

  debug: process.env.NODE_ENV === 'development',
}

