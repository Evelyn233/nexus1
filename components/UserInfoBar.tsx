'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Home, User, ChevronDown, ChevronUp } from 'lucide-react'
import { getCurrentUserName, getUserInfo, getUserInfoDescription, getLatestUserReport } from '@/lib/userInfoService'
import ClientOnly from './ClientOnly'

function UserInfoBarContent() {
  const router = useRouter()
  const [showDetails, setShowDetails] = useState(false)
  
  const currentUserName = getCurrentUserName()
  const userInfo = getUserInfo()
  const latestReport = getLatestUserReport()
  
  // 如果没有当前用户，不显示
  if (!currentUserName) {
    return null
  }
  
  return (
    <div className="bg-white border-b border-gray-200 px-4 py-2">
      <div className="max-w-md mx-auto flex items-center justify-between">
        {/* 左侧：用户信息 */}
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-medium text-gray-900">{currentUserName}</div>
            <div className="text-xs text-gray-500">
              {userInfo.gender === 'male' ? '男' : userInfo.gender === 'female' ? '女' : '未设置'} 
              {userInfo.age && ` • ${userInfo.age}岁`}
              {userInfo.location && ` • ${userInfo.location}`}
            </div>
          </div>
        </div>
        
        {/* 右侧：操作按钮 */}
        <div className="flex items-center space-x-2">
          {/* 返回Home按钮 */}
          <button
            onClick={() => router.push('/home')}
            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="返回主页"
          >
            <Home className="w-4 h-4" />
          </button>
          
          {/* 展开/收起详情按钮 */}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title={showDetails ? "收起详情" : "查看详情"}
          >
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      {/* 展开的详情 */}
      {showDetails && (
        <div className="max-w-md mx-auto mt-3 p-3 bg-gray-50 rounded-lg">
          <div className="space-y-2 text-sm">
            {/* 基本信息 */}
            <div className="flex justify-between">
              <span className="text-gray-600">身高：</span>
              <span className="text-gray-900">{userInfo.height ? `${userInfo.height}cm` : '未设置'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">体重：</span>
              <span className="text-gray-900">{userInfo.weight ? `${userInfo.weight}kg` : '未设置'}</span>
            </div>
            
            {/* 最新报告摘要 */}
            {latestReport && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-500 mb-1">最新对话报告</div>
                <div className="text-xs text-gray-700">
                  {latestReport.conversationSummary.substring(0, 50)}...
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  对话次数：{latestReport.conversationCount} | 情感状态：{latestReport.emotionalState}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// 导出包装后的组件
export default function UserInfoBar() {
  return (
    <ClientOnly>
      <UserInfoBarContent />
    </ClientOnly>
  )
}
