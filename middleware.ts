import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const pathname = req.nextUrl.pathname
    const isSignInPage = pathname === '/auth/signin'
    const isRootPage = pathname === '/'

    console.log('🔍 [MIDDLEWARE]', {
      pathname,
      isAuth,
      isSignInPage,
      isRootPage,
      hasToken: !!token,
      tokenEmail: token?.email
    })

    // 🔥 根路径是公开的 landing page
    if (isRootPage) {
      // 已登录用户访问根路径，重定向到首页
      if (isAuth) {
        console.log('🔄 [MIDDLEWARE] 已登录用户访问根路径，重定向到首页')
        const homeUrl = new URL('/home', req.url)
        homeUrl.searchParams.set('t', Date.now().toString())
        return NextResponse.redirect(homeUrl)
      }
      // 未登录用户访问根路径，允许访问（显示 landing page）
      console.log('✅ [MIDDLEWARE] 未登录用户访问根路径（公开页面），允许访问')
      return null
    }

    // 🔥 处理登录页面
    if (isSignInPage) {
      if (isAuth) {
        // 已登录用户访问登录页，重定向到首页
        console.log('🔄 [MIDDLEWARE] 已登录用户访问登录页，重定向到首页')
        const homeUrl = new URL('/home', req.url)
        homeUrl.searchParams.set('t', Date.now().toString())
        return NextResponse.redirect(homeUrl)
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

    // 🔥 处理保护页面
    if (!isAuth) {
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
        
        // 🔥 根路径和认证页面始终允许访问（不检查token）
        if (pathname === '/' || pathname === '/auth/signin' || pathname.startsWith('/auth/')) {
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
    '/home/:path*',
    '/chat/:path*',
    '/chat-new/:path*',
    '/generate/:path*',
    '/gallery/:path*',
    '/user-info/:path*',
    '/auth/signin', // 登录页，允许公开访问
  ],
}

