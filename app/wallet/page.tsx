'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Wallet, CreditCard, History, Plus, Minus } from 'lucide-react'

interface WalletData {
  balance: number
  totalSpent: number
  totalEarned: number
  dailyFreeUsed: number
  dailyFreeLimit: number
  isNewUser: boolean
}

export default function WalletPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [walletData, setWalletData] = useState<WalletData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (session?.user?.email) {
      fetchWalletData()
    }
  }, [session])

  const fetchWalletData = async () => {
    try {
      const response = await fetch('/api/user/wallet')
      if (response.ok) {
        const data = await response.json()
        setWalletData(data)
      } else {
        setError('获取钱包信息失败')
      }
    } catch (err) {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  const handleRecharge = (amount: number) => {
    // 跳转到充值页面
    router.push(`/payment/recharge?amount=${amount}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={() => router.back()}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
          >
            返回
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900">我的钱包</h1>
          <div className="w-10"></div>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {/* 钱包余额卡片 */}
        <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Wallet className="w-6 h-6" />
              <span className="font-medium">钱包余额</span>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">${walletData?.balance.toFixed(2) || '0.00'}</div>
              <div className="text-teal-100 text-sm">USD</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-teal-100">总充值</div>
              <div className="font-semibold">${walletData?.totalEarned.toFixed(2) || '0.00'}</div>
            </div>
            <div>
              <div className="text-teal-100">总消费</div>
              <div className="font-semibold">${walletData?.totalSpent.toFixed(2) || '0.00'}</div>
            </div>
          </div>
        </div>

        {/* 今日免费额度 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">今日免费额度</h3>
            {walletData?.isNewUser && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                新用户
              </span>
            )}
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">已使用</span>
              <span className="font-medium">{walletData?.dailyFreeUsed || 0}/{walletData?.dailyFreeLimit || 0}</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${((walletData?.dailyFreeUsed || 0) / (walletData?.dailyFreeLimit || 1)) * 100}%` 
                }}
              ></div>
            </div>
            
            <p className="text-xs text-gray-500">
              {walletData?.isNewUser ? '新用户每日9张免费图片' : '老用户每日3张免费图片'}
            </p>
          </div>
        </div>

        {/* 充值选项 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">快速充值</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleRecharge(5)}
              className="p-4 border-2 border-gray-200 rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-colors"
            >
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">$5</div>
                <div className="text-sm text-gray-600">10张图片</div>
              </div>
            </button>
            
            <button
              onClick={() => handleRecharge(10)}
              className="p-4 border-2 border-gray-200 rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-colors"
            >
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">$10</div>
                <div className="text-sm text-gray-600">25张图片</div>
              </div>
            </button>
            
            <button
              onClick={() => handleRecharge(20)}
              className="p-4 border-2 border-gray-200 rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-colors"
            >
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">$20</div>
                <div className="text-sm text-gray-600">50张图片</div>
              </div>
            </button>
            
            <button
              onClick={() => handleRecharge(50)}
              className="p-4 border-2 border-gray-200 rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-colors"
            >
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">$50</div>
                <div className="text-sm text-gray-600">150张图片</div>
              </div>
            </button>
          </div>
        </div>

        {/* 使用说明 */}
        <div className="bg-blue-50 rounded-xl p-4">
          <h4 className="font-semibold text-blue-900 mb-2">使用说明</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 每张图片生成费用：$0.5</li>
            <li>• 新用户注册7天内每日9张免费图片</li>
            <li>• 老用户每日3张免费图片</li>
            <li>• 免费额度每日0点重置</li>
            <li>• 钱包余额永久有效</li>
          </ul>
        </div>

        {/* 操作按钮 */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/payment/history')}
            className="w-full p-4 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
          >
            <History className="w-5 h-5 text-gray-600" />
            <span className="text-gray-700">充值记录</span>
          </button>
          
          <button
            onClick={() => router.push('/payment/custom')}
            className="w-full p-4 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors flex items-center justify-center space-x-2"
          >
            <CreditCard className="w-5 h-5" />
            <span>自定义充值</span>
          </button>
        </div>
      </main>
    </div>
  )
}
