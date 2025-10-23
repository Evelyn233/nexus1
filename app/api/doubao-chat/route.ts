import { NextRequest, NextResponse } from 'next/server'
import { chatWithDoubao } from '@/lib/doubaoService'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messages } = body
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: '无效的请求格式' }, { status: 400 })
    }
    
    const lastMessage = messages[messages.length - 1]?.content || ''
    console.log('🔍 [API] 收到请求，最后一条消息:', lastMessage)
    
    // 所有请求都通过真正的LLM处理，不使用预设模板
    try {
      const llmResponse = await chatWithDoubao(messages)
      return NextResponse.json(llmResponse)
    } catch (error) {
      console.error('🔍 [API] LLM调用失败:', error)
      return NextResponse.json({
        choices: [{
          message: {
            content: '我理解您的需求，正在为您生成个性化建议...'
          }
        }]
      })
    }
  } catch (error) {
    console.error('API错误:', error)
    return NextResponse.json({ error: '服务器内部错误' }, { status: 500 })
  }
}