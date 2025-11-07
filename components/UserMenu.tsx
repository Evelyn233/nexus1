'use client'

import { signOut, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { LogOut, User, Settings, History } from 'lucide-react'

export default function UserMenu() {
  const { data: session } = useSession()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut({ callbackUrl: '/auth/signin' })
  }

  if (!session?.user) {
    return null
  }

  return (
    <div className="relative group">
      <button className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100">
        <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center text-white">
          {session.user.name?.[0]?.toUpperCase() || session.user.email?.[0]?.toUpperCase() || 'U'}
        </div>
        <span className="text-sm text-gray-700">{session.user.name || session.user.email}</span>
      </button>

      {/* 下拉菜单 */}
      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
        <div className="p-2">
          <button
            onClick={() => router.push('/user-info')}
            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
          >
            <User className="w-4 h-4" />
            <span>个人信息</span>
          </button>
          
          <button
            onClick={() => router.push('/history')}
            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
          >
            <History className="w-4 h-4" />
            <span>生成历史</span>
          </button>
          
          <button
            onClick={() => router.push('/settings')}
            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
          >
            <Settings className="w-4 h-4" />
            <span>设置</span>
          </button>
          
          <hr className="my-2 border-gray-200" />
          
          <button
            onClick={handleSignOut}
            className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md"
          >
            <LogOut className="w-4 h-4" />
            <span>退出登录</span>
          </button>
        </div>
      </div>
    </div>
  )
}

