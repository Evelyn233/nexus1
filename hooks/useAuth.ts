/**
 * 统一的认证Hook
 * 集成NextAuth和原有的用户信息系统
 */

import { useSession } from 'next-auth/react'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { setCurrentUserName, addUserToList, isUserInfoComplete } from '@/lib/userInfoService'

export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()

  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      // 登录成功后，同步用户信息
      syncUserData()
    }
  }, [status, session])

  const syncUserData = async () => {
    try {
      if (!session?.user?.email) return

      const response = await fetch('/api/user/sync', {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ 用户数据同步成功:', data)
        // 不再以「profile 有数据」为前置条件跳转；用户可自行进入 profile / user-info
      }
    } catch (error) {
      console.error('❌ 同步用户数据失败:', error)
    }
  }

  return {
    session,
    status,
    isAuthenticated: status === 'authenticated',
    isLoading: status === 'loading',
    user: session?.user
  }
}

