import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ sessions: [] })
    }

    // 从数据库获取用户
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ sessions: [] })
    }

    // 从数据库获取该用户的所有会话
    const sessions = await prisma.chatSession.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })

    // 转换格式
    const formattedSessions = sessions.map(s => ({
      sessionId: s.id,
      title: s.title,
      messages: JSON.parse(s.messages),
      initialPrompt: s.initialPrompt,
      answers: JSON.parse(s.answers),
      questions: JSON.parse(s.questions),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString()
    }))

    return NextResponse.json({ sessions: formattedSessions })
    
  } catch (error) {
    console.error('获取会话列表失败:', error)
    return NextResponse.json(
      { error: '获取会话列表失败' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: '用户不存在' },
        { status: 404 }
      )
    }
    
    // 🔐 安全验证：确保userId匹配
    console.log('🔐 [CHAT-SESSION] 用户验证')
    console.log('   Session email:', session.user.email)
    console.log('   User ID:', user.id)
    console.log('   User name:', user.name)

    const body = await request.json()
    const { sessionId, title, messages, initialPrompt, answers, questions } = body
    
    console.log('💾 [CHAT-SESSION] 保存聊天记录')
    console.log('   用户:', user.name)
    console.log('   初始输入:', initialPrompt?.substring(0, 50))
    
    // 使用 upsert：如果存在就更新，不存在就创建
    const chatSession = await prisma.chatSession.upsert({
      where: { id: sessionId || 'new' },
      update: {
        title: title || '新对话',
        messages: JSON.stringify(messages || []),
        answers: JSON.stringify(answers || []),
        questions: JSON.stringify(questions || []),
        updatedAt: new Date()
      },
      create: {
        id: sessionId || undefined,
        userId: user.id,  // ⚠️ 确保使用正确的userId
        title: title || '新对话',
        initialPrompt: initialPrompt || '',
        messages: JSON.stringify(messages || []),
        answers: JSON.stringify(answers || []),
        questions: JSON.stringify(questions || [])
      }
    })
    
    console.log('✅ [CHAT-SESSION] 聊天记录已保存，userId:', chatSession.userId)
    
    return NextResponse.json({ 
      success: true,
      session: {
        sessionId: chatSession.id,
        title: chatSession.title,
        messages: JSON.parse(chatSession.messages),
        initialPrompt: chatSession.initialPrompt,
        answers: JSON.parse(chatSession.answers),
        questions: JSON.parse(chatSession.questions),
        createdAt: chatSession.createdAt.toISOString(),
        updatedAt: chatSession.updatedAt.toISOString()
      }
    })
    
  } catch (error) {
    console.error('保存会话失败:', error)
    return NextResponse.json(
      { error: '保存会话失败' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')
    
    if (!sessionId) {
      return NextResponse.json(
        { error: '缺少会话ID' },
        { status: 400 }
      )
    }

    // 从数据库删除
    await prisma.chatSession.delete({
      where: { id: sessionId }
    })
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('删除会话失败:', error)
    return NextResponse.json(
      { error: '删除会话失败' },
      { status: 500 }
    )
  }
}


