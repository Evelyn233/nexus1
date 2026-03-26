/**
 * 统一的认证Hook
 * 集成NextAuth和原有的用户信息系统
 */

import { useSession } from 'next-auth/react'
import { useEffect, useRef } from 'react'

export function useAuth() {
  const { data: session, status } = useSession()
  const syncDoneRef = useRef<string | null>(null)

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user?.email) {
      if (status === 'unauthenticated') syncDoneRef.current = null
      return
    }
    const email = session.user.email
    // 同一邮箱只同步一次，避免 session 对象引用变化导致重复请求
    if (syncDoneRef.current === email) return
    syncDoneRef.current = email

    const syncUserData = async () => {
      try {
        const response = await fetch('/api/user/sync', {
          method: 'POST'
        })
        if (response.ok) {
          const data = await response.json()
          console.log('✅ 用户数据同步成功:', data)
        }
      } catch (error) {
        console.error('❌ 同步用户数据失败:', error)
        syncDoneRef.current = null
      }
    }
    syncUserData()
  }, [status, session?.user?.email])

  return {
    session,
    status,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    user: session?.user
  }
}

