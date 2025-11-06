import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, title, contentId } = await request.json()
    
    console.log('📤 [PUBLISH-API] 收到发布请求:', { sessionId, title, contentId })
    
    if (!sessionId && !contentId) {
      console.error('❌ [PUBLISH-API] sessionId 和 contentId 都缺失')
      return NextResponse.json({ error: 'Session ID or Content ID is required' }, { status: 400 })
    }

    // 查找对应的生成内容记录 - 支持多种查询方式
    console.log('🔍 [PUBLISH-API] 查找内容记录...')
    let content = null
    
    // 方式1: 通过 contentId 查询（最准确）
    if (contentId) {
      console.log('🔍 [PUBLISH-API] 通过 contentId 查询:', contentId)
      content = await prisma.userGeneratedContent.findUnique({
        where: {
          id: contentId
        }
      })
    }
    
    // 方式2: 通过 sessionId 查询（如果有）
    if (!content && sessionId) {
      console.log('🔍 [PUBLISH-API] 通过 sessionId 查询:', sessionId)
      content = await prisma.userGeneratedContent.findFirst({
        where: {
          sessionId: sessionId
        },
        orderBy: {
          createdAt: 'desc'  // 获取最新的
        }
      })
    }
    
    // 方式3: 如果都没找到，尝试通过用户最新的内容
    if (!content) {
      console.log('🔍 [PUBLISH-API] 查找用户最新的内容...')
      const session = await getServerSession(authOptions)
      if (session?.user?.email) {
        const user = await prisma.user.findUnique({
          where: { email: session.user.email }
        })
        if (user) {
          content = await prisma.userGeneratedContent.findFirst({
            where: {
              userId: user.id,
              status: 'completed'
            },
            orderBy: {
              createdAt: 'desc'
            }
          })
          console.log('🔍 [PUBLISH-API] 找到用户最新内容:', content?.id)
        }
      }
    }

    if (!content) {
      console.error('❌ [PUBLISH-API] 未找到内容记录')
      return NextResponse.json({ 
        error: 'Content not found',
        details: `未找到匹配的内容记录 (sessionId: ${sessionId}, contentId: ${contentId})`
      }, { status: 404 })
    }

    console.log('✅ [PUBLISH-API] 找到内容记录:', content.id)

    // 更新状态为已发布
    console.log('📝 [PUBLISH-API] 更新发布状态...')
    const updatedContent = await prisma.userGeneratedContent.update({
      where: {
        id: content.id
      },
      data: {
        status: 'published',
        publishedAt: new Date()
      }
    })

    console.log('✅ [PUBLISH-API] 发布成功:', updatedContent.id)

    return NextResponse.json({
      success: true,
      content: {
        id: updatedContent.id,
        sessionId: updatedContent.sessionId,
        status: updatedContent.status,
        publishedAt: updatedContent.publishedAt
      }
    })
  } catch (error: any) {
    console.error('❌ [PUBLISH-API] 发布失败:', error)
    console.error('❌ [PUBLISH-API] 错误详情:', error.message, error.stack)
    return NextResponse.json({ 
      error: 'Failed to publish content',
      details: error.message
    }, { status: 500 })
  }
}

