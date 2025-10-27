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
    if (isAuthPage) {
      console.log('✅ [MIDDLEWARE] 认证页面，允许访问')
      return null
    }

    // 如果未登录，重定向到登录页
    if (!isAuth) {
      let from = req.nextUrl.pathname
      if (req.nextUrl.search) {
        from += req.nextUrl.search
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
      authorized: ({ token }) => !!token,
    },
  }
)

// 保护以下路由
export const config = {
  matcher: [
    '/home/:path*',
    '/chat/:path*',
    '/chat-new/:path*',
    '/generate/:path*',
    '/gallery/:path*',
    '/user-info/:path*',
  ],
}

