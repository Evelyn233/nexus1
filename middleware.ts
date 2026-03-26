import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const pathname = req.nextUrl.pathname
    const isSignInPage = pathname === '/auth/signin'
    const isRootPage = pathname === '/'
    const isGetStartedPage = pathname === '/get-started' || pathname.startsWith('/get-started/')

    console.log('🔍 [MIDDLEWARE]', {
      pathname,
      isAuth,
      isSignInPage,
      isRootPage,
      hasToken: !!token,
      tokenEmail: token?.email
    })

    // 🔥 /home、/gallery 已移除，统一重定向到 /profile
    if (pathname === '/home' || pathname.startsWith('/home/') || pathname === '/gallery' || pathname.startsWith('/gallery/')) {
      return NextResponse.redirect(new URL('/profile', req.url))
    }

    // 🔥 已登录用户访问 /profile：若是 project 账号，则统一跳到 /project
    if (pathname === '/profile' && isAuth) {
      const userType = (token as { userType?: string })?.userType
      if (userType === 'project') {
        console.log('🔄 [MIDDLEWARE] project 账号访问 /profile，重定向到 /project')
        const targetUrl = new URL('/project', req.url)
        targetUrl.searchParams.set('t', Date.now().toString())
        return NextResponse.redirect(targetUrl)
      }
    }

    // 🔥 根路径是公开的 landing page，已登录/未登录都可访问（方便测试首页注册流程）
    if (isRootPage) {
      console.log('✅ [MIDDLEWARE] 根路径，允许访问（landing page）')
      return null
    }

    // 🔥 get-started：未登录时直接去注册页（避免先落到 get-started 再客户端跳转）
    if (isGetStartedPage && !isAuth) {
      let from = pathname
      if (req.nextUrl.search) from += req.nextUrl.search
      console.log('🔄 [MIDDLEWARE] 未登录访问 get-started，重定向到注册页')
      return NextResponse.redirect(new URL(`/auth/signup?callbackUrl=${encodeURIComponent(from)}`, req.url))
    }

    // 🔥 处理登录页面
    if (isSignInPage) {
      if (isAuth) {
        const cb = req.nextUrl.searchParams.get('callbackUrl') || ''
        // 从 Create Project 进来的登录：callbackUrl 指向 /get-started，直接送去 get-started（让它处理项目初始化，而不是落到 /project 或 /profile）
        if (cb.startsWith('/get-started')) {
          console.log('🔄 [MIDDLEWARE] 已登录访问登录页且带 get-started callback，重定向到 callbackUrl:', cb)
          const targetUrl = new URL(cb, req.url)
          targetUrl.searchParams.set('t', Date.now().toString())
          return NextResponse.redirect(targetUrl)
        }
        // 其他情况：project 账号去 /project，否则去 /profile
        const userType = (token as { userType?: string })?.userType
        const target = userType === 'project' ? '/project' : '/profile'
        console.log('🔄 [MIDDLEWARE] 已登录用户访问登录页，重定向到', target)
        const targetUrl = new URL(target, req.url)
        targetUrl.searchParams.set('t', Date.now().toString())
        return NextResponse.redirect(targetUrl)
      }
      // 未登录用户访问登录页，允许访问
      console.log('✅ [MIDDLEWARE] 未登录用户访问登录页，允许访问')
      return null
    }

    // 🔥 处理其他认证页面（signup, forgot-password等）
    if (pathname.startsWith('/auth/')) {
      console.log('✅ [MIDDLEWARE] 其他认证页面，允许访问')
      return null
    }

    // 🔥 明确排除 API 路由（API 路由应该返回 401，而不是重定向）
    if (pathname.startsWith('/api/')) {
      console.log('✅ [MIDDLEWARE] API 路由，跳过中间件处理（由 API 路由自己处理认证）')
      return null
    }

    // 🔥 广场、公开 profile 允许未登录访问
    if (pathname === '/square' || pathname.startsWith('/u/')) {
      console.log('✅ [MIDDLEWARE] 广场/公开 profile，允许访问')
      return null
    }

    // 🔥 处理保护页面
    if (!isAuth) {
      // 🔥 特殊处理：chat-new 页面允许未登录访问，由前端处理认证状态
      // 这样可以避免用户在输入时被重定向，导致输入丢失
      if (pathname.startsWith('/chat-new')) {
        console.log('⚠️ [MIDDLEWARE]', pathname, '页面允许未登录访问，由前端处理认证状态')
        return null
      }
      
      // 检查是否有时间戳参数（表示是登录后的跳转）
      const hasTimestamp = req.nextUrl.searchParams.has('t')
      
      // 🔥 如果有时间戳，可能是刚登录，cookie 还没同步，允许访问
      // 前端会检测 session 状态，如果确实未登录会自己处理
      if (hasTimestamp) {
        console.log('⚠️ [MIDDLEWARE] 检测到带时间戳的访问，但无 token，可能是 cookie 同步延迟，允许访问')
        console.log('📍 [MIDDLEWARE] 路径:', pathname)
        console.log('📍 [MIDDLEWARE] 查询参数:', req.nextUrl.search)
        // 允许访问，让前端处理认证状态
        return null
      }
      
      // 未登录用户访问保护页面，重定向到登录页
      let from = pathname
      if (req.nextUrl.search) {
        from += req.nextUrl.search
      }
      
      // 检查 callbackUrl 是否已经是登录页面，避免嵌套
      const existingCallbackUrl = req.nextUrl.searchParams.get('callbackUrl')
      if (existingCallbackUrl && existingCallbackUrl.includes('/auth/signin')) {
        console.log('🔄 [MIDDLEWARE] 检测到循环重定向，直接跳转到登录页（不添加callbackUrl）')
        return NextResponse.redirect(new URL('/auth/signin', req.url))
      }

      console.log('🔄 [MIDDLEWARE] 未登录用户访问保护页面，重定向到登录页')
      return NextResponse.redirect(
        new URL(`/auth/signin?callbackUrl=${encodeURIComponent(from)}`, req.url)
      )
    }

    // 已登录用户访问保护页面，允许访问
    console.log('✅ [MIDDLEWARE] 已登录用户访问保护页面，允许访问')
    return null
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname
        
        // 🔥 根路径、认证页面、广场、公开 profile 始终允许访问（不检查token）
        if (pathname === '/' || pathname === '/auth/signin' || pathname.startsWith('/auth/') || pathname === '/square' || pathname.startsWith('/u/')) {
          return true
        }

        // 🔥 get-started 允许进入 middleware 走自定义重定向到 signup
        if (pathname === '/get-started' || pathname.startsWith('/get-started/')) {
          return true
        }
        
        // 🔥 chat-new 页面允许未登录访问，由前端处理认证状态
        if (pathname.startsWith('/chat-new')) {
          console.log('⚠️ [MIDDLEWARE-AUTH]', pathname, '页面允许未登录访问，由前端处理认证状态')
          return true
        }
        
        // 🔥 如果有时间戳参数，可能是刚登录，cookie 还没同步，允许访问
        const hasTimestamp = req.nextUrl.searchParams.has('t')
        if (hasTimestamp) {
          console.log('⚠️ [MIDDLEWARE-AUTH] 检测到时间戳参数，允许访问（cookie 可能还在同步）')
          return true
        }
        
        // 其他页面需要token
        const hasToken = !!token
        console.log('🔍 [MIDDLEWARE-AUTH] authorized callback:', {
          hasToken,
          tokenEmail: token?.email,
          pathname
        })
        return hasToken
      },
    },
  }
)

// 保护以下路由
// 🔥 包含根路径和登录页，以便middleware可以处理重定向逻辑
// authorized callback 会确保这些公开页面始终允许访问
export const config = {
  matcher: [
    '/', // 根路径（landing page），允许公开访问
    '/home/:path*', // 重定向到 /profile
    '/get-started/:path*', // onboarding，未登录时由 middleware 送去 signup
    '/profile/:path*',
    '/chat/:path*',
    '/chat-new/:path*',
    '/generate/:path*',
    '/gallery/:path*', // 重定向到 /profile
    '/user-info/:path*',
    '/auth/signin', // 登录页，允许公开访问
    '/square', // 广场，允许公开访问
    '/u/:path*', // 公开 profile，允许公开访问
  ],
}

