import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token
    const isAuth = !!token
    const isAuthPage = req.nextUrl.pathname.startsWith('/auth')

    console.log('🔍 [MIDDLEWARE]', {
      pathname: req.nextUrl.pathname,
      isAuth,
      isAuthPage,
      hasToken: !!token,
      tokenEmail: token?.email
    })

    // 如果是认证页面，允许访问（不重定向）
    // 但如果用户已登录，可以重定向到首页（避免在登录页面循环）
    if (isAuthPage) {
      if (isAuth && req.nextUrl.pathname === '/auth/signin') {
        // 已登录用户访问登录页，重定向到首页
        console.log('🔄 [MIDDLEWARE] 已登录用户访问登录页，重定向到首页')
        const homeUrl = new URL('/home', req.url)
        // 添加时间戳确保刷新
        homeUrl.searchParams.set('t', Date.now().toString())
        return NextResponse.redirect(homeUrl)
      }
      console.log('✅ [MIDDLEWARE] 认证页面，允许访问')
      return null
    }

    // 如果未登录，重定向到登录页
    if (!isAuth) {
      // 🔥 如果已经在登录页面，不重定向（避免循环）
      if (req.nextUrl.pathname === '/auth/signin') {
        console.log('✅ [MIDDLEWARE] 已在登录页面，允许访问')
        return null
      }
      
      let from = req.nextUrl.pathname
      if (req.nextUrl.search) {
        from += req.nextUrl.search
      }
      
      // 🔥 检查 callbackUrl 是否已经是登录页面，避免嵌套
      const existingCallbackUrl = req.nextUrl.searchParams.get('callbackUrl')
      if (existingCallbackUrl && existingCallbackUrl.includes('/auth/signin')) {
        // callbackUrl 已经是登录页面，不添加新的 callbackUrl
        console.log('🔄 [MIDDLEWARE] 检测到循环重定向，直接跳转到登录页（不添加callbackUrl）')
        return NextResponse.redirect(new URL('/auth/signin', req.url))
      }

      console.log('🔄 [MIDDLEWARE] 未登录用户访问保护页面，重定向到登录页')
      return NextResponse.redirect(
        new URL(`/auth/signin?callbackUrl=${encodeURIComponent(from)}`, req.url)
      )
    }

    console.log('✅ [MIDDLEWARE] 已登录用户访问保护页面，允许访问')
    return null
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        console.log('🔍 [MIDDLEWARE-AUTH] authorized callback:', {
          hasToken: !!token,
          tokenEmail: token?.email,
          pathname: req.nextUrl.pathname
        })
        return !!token
      },
    },
  }
)

// 保护以下路由
// 🔥 不包含 /auth/signin，避免middleware处理登录页面造成循环
export const config = {
  matcher: [
    '/home/:path*',
    '/chat/:path*',
    '/chat-new/:path*',
    '/generate/:path*',
    '/gallery/:path*',
    '/user-info/:path*',
    // 不包含 /auth/signin，让登录页面不受middleware保护
  ],
}

