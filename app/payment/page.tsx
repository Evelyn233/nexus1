'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { CheckCircle, CreditCard, Image, Zap, Wallet } from 'lucide-react'

interface UserUsage {
  dailyFreeUsed: number
  dailyFreeLimit: number
  walletBalance: number
  canGenerateFree: boolean
  canGeneratePaid: boolean
  isNewUser: boolean
  totalImagesGenerated: number
}

export default function PaymentPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [userUsage, setUserUsage] = useState<UserUsage | null>(null)

  useEffect(() => {
    if (session?.user?.email) {
      loadUserUsage()
    }
  }, [session])

  const loadUserUsage = async () => {
    try {
      const response = await fetch('/api/user/image-usage')
      if (response.ok) {
        const data = await response.json()
        setUserUsage(data)
      }
    } catch (error) {
      console.error('加载用户使用情况失败:', error)
    }
  }

  const handleRecharge = async (amount: number, images: number) => {
    setIsProcessing(true)
    try {
      // 创建PayPal支付链接
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount,
          images: images,
          description: `${images}张图片额度`
        })
      })

      if (response.ok) {
        const { paymentUrl } = await response.json()
        // 跳转到PayPal支付页面
        window.open(paymentUrl, '_blank')
      } else {
        alert('创建支付失败，请重试')
      }
    } catch (error) {
      console.error('支付处理失败:', error)
      alert('支付处理失败，请重试')
    } finally {
      setIsProcessing(false)
    }
  }

  if (!userUsage) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
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
            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">图片额度</h1>
          <button
            onClick={() => router.push('/wallet')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Wallet className="w-6 h-6 text-gray-600" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6">
        {/* 今日免费额度 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">今日免费额度</h3>
            {userUsage.isNewUser && (
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                新用户
              </span>
            )}
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">已使用</span>
              <span className="font-medium">{userUsage.dailyFreeUsed}/{userUsage.dailyFreeLimit}</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-teal-500 h-2 rounded-full transition-all duration-300"
                style={{ 
                  width: `${(userUsage.dailyFreeUsed / userUsage.dailyFreeLimit) * 100}%` 
                }}
              ></div>
            </div>
            
            <p className="text-xs text-gray-500">
              {userUsage.isNewUser ? '新用户每日9张免费图片' : '老用户每日3张免费图片'}
            </p>
          </div>
        </div>

        {/* 钱包余额 */}
        <div className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wallet className="w-6 h-6" />
              <span className="font-medium">钱包余额</span>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold">${userUsage.walletBalance.toFixed(2)}</div>
              <div className="text-teal-100 text-sm">USD</div>
            </div>
          </div>
        </div>

        {/* 充值选项 */}
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">充值图片额度</h3>
          
          <div className="space-y-3">
            <button
              onClick={() => handleRecharge(5, 10)}
              disabled={isProcessing}
              className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="font-semibold text-gray-900">$5 - 10张图片</div>
                  <div className="text-sm text-gray-600">每张$0.5</div>
                </div>
                <CreditCard className="w-6 h-6 text-gray-400" />
              </div>
            </button>
            
            <button
              onClick={() => handleRecharge(10, 25)}
              disabled={isProcessing}
              className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="font-semibold text-gray-900">$10 - 25张图片</div>
                  <div className="text-sm text-gray-600">每张$0.4</div>
                </div>
                <CreditCard className="w-6 h-6 text-gray-400" />
              </div>
            </button>
            
            <button
              onClick={() => handleRecharge(20, 50)}
              disabled={isProcessing}
              className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="font-semibold text-gray-900">$20 - 50张图片</div>
                  <div className="text-sm text-gray-600">每张$0.4</div>
                </div>
                <CreditCard className="w-6 h-6 text-gray-400" />
              </div>
            </button>
            
            <button
              onClick={() => handleRecharge(50, 150)}
              disabled={isProcessing}
              className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-teal-500 hover:bg-teal-50 transition-colors disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <div className="font-semibold text-gray-900">$50 - 150张图片</div>
                  <div className="text-sm text-gray-600">每张$0.33</div>
                </div>
                <CreditCard className="w-6 h-6 text-gray-400" />
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
            onClick={() => router.push('/wallet')}
            className="w-full p-4 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Wallet className="w-5 h-5" />
            <span>查看钱包详情</span>
          </button>
        </div>
      </main>
    </div>
  )
}