'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { CheckCircle, CreditCard, Image, Zap } from 'lucide-react'

export default function PaymentPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isProcessing, setIsProcessing] = useState(false)
  const [userUsage, setUserUsage] = useState<any>(null)

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

  const handlePayment = async () => {
    setIsProcessing(true)
    try {
      // 创建PayPal支付链接
      const response = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: 2.00,
          images: 5,
          description: 'inflow - 5张图片额度'
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

  const handleBackToHome = () => {
    router.push('/home')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">继续创作之旅</h1>
          <p className="text-gray-600">解锁更多图片生成额度</p>
        </div>

        {/* Usage Stats */}
        {userUsage && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">已使用免费额度</span>
                <span className="font-semibold">{userUsage.freeImagesUsed}/12</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(userUsage.freeImagesUsed / 12) * 100}%` }}
                ></div>
              </div>
              
              {userUsage.paidImagesUsed > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">已使用付费额度</span>
                  <span className="font-semibold text-purple-600">{userUsage.paidImagesUsed} 张</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pricing Card */}
        <div className="border-2 border-purple-200 rounded-xl p-6 mb-6 bg-gradient-to-br from-purple-50 to-pink-50">
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Image className="w-5 h-5 text-purple-600 mr-2" />
              <span className="text-lg font-semibold text-gray-900">5张图片</span>
            </div>
            <div className="text-3xl font-bold text-purple-600 mb-2">$2.00</div>
            <p className="text-sm text-gray-600 mb-4">一次性购买，永久有效</p>
            
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                <span>高质量AI生成图片</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                <span>个性化故事叙述</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                <span>无使用期限限制</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                <span>每5张图片仅需$2</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Button */}
        <button
          onClick={handlePayment}
          disabled={isProcessing}
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
              处理中...
            </>
          ) : (
            <>
              <CreditCard className="w-4 h-4 mr-2" />
              通过PayPal支付 $2.00
            </>
          )}
        </button>

        {/* Payment Info */}
        <div className="text-center mt-4 space-y-2">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-sm text-blue-800 font-medium">付费说明</p>
            <p className="text-xs text-blue-600 mt-1">
              前12张图片免费，超出后每5张图片收费$2
            </p>
          </div>
          <p className="text-xs text-gray-500">
            支付链接将跳转到PayPal安全支付页面
          </p>
          <p className="text-xs text-gray-400">
            支付完成后，额度将自动到账
          </p>
        </div>

        {/* Back Button */}
        <button
          onClick={handleBackToHome}
          className="w-full mt-4 text-gray-600 hover:text-gray-800 transition-colors"
        >
          返回首页
        </button>
      </div>
    </div>
  )
}
