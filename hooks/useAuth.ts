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

      // 调用同步API
      const response = await fetch('/api/user/sync', {
        method: 'POST'
      })

      if (response.ok) {
        const data = await response.json()
        console.log('✅ 用户数据同步成功:', data)

        // 如果用户还没有填写详细信息，跳转到用户信息页面
        if (!data.result?.hasDetailedInfo) {
          console.log('⚠️ [AUTH] 新用户缺少详细信息，跳转到用户信息页面')
          router.push('/user-info')
        } else {
          console.log('✅ [AUTH] 老用户已有详细信息，直接进入主页')
        }
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

