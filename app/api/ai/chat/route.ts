import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

// 强制动态渲染
export const dynamic = 'force-dynamic'

/**
 * AI Chat API 代理
 * 用于避免前端CORS问题
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户登录状态
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }
    
    const body = await request.json()
    const { messages, model = 'deepseek-chat', temperature = 0.7, max_tokens = 2000 } = body
    
    // 创建带超时的fetch（60秒）
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000)
    
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-4d7c509f56f64f4a9b1d52f9e1791a67'
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens
        }),
        signal: controller.signal
      })
      
      clearTimeout(timeoutId)
    
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ [AI-API] DeepSeek API调用失败:', response.status, errorText)
        
        // 🔥 检测是否是余额不足错误
        if (response.status === 401 || response.status === 402 || response.status === 403) {
          let errorMessage = 'DeepSeek API 认证失败'
          
          try {
            const errorData = JSON.parse(errorText)
            if (errorData.error?.message?.includes('余额') || 
                errorData.error?.message?.includes('balance') ||
                errorData.error?.message?.includes('insufficient')) {
              errorMessage = 'DeepSeek API 余额不足，请充值后再试'
            } else if (errorData.error?.message) {
              errorMessage = `DeepSeek API 错误: ${errorData.error.message}`
            }
          } catch (e) {
            // 如果无法解析错误信息，使用默认提示
            if (errorText.includes('余额') || errorText.includes('balance')) {
              errorMessage = 'DeepSeek API 余额不足，请充值后再试'
            }
          }
          
          return NextResponse.json(
            { 
              error: errorMessage,
              details: '可能是API密钥无效或余额不足',
              suggestion: '请检查DeepSeek账户余额或联系管理员'
            },
            { status: response.status }
          )
        }
        
        // 其他错误
        return NextResponse.json(
          { 
            error: 'AI API调用失败: ' + response.status,
            details: errorText.substring(0, 200)
          },
          { status: response.status }
        )
      }
      
      const data = await response.json()
      return NextResponse.json(data)
      
    } catch (fetchError: any) {
      clearTimeout(timeoutId)
      
      if (fetchError.name === 'AbortError') {
        console.error('⏱️ AI API调用超时（60秒）')
        return NextResponse.json(
          { error: 'AI API调用超时，请重试' },
          { status: 504 }
        )
      }
      throw fetchError
    }
    
  } catch (error) {
    console.error('AI Chat API错误:', error)
    return NextResponse.json(
      { error: '服务器内部错误' },
      { status: 500 }
    )
  }
}

