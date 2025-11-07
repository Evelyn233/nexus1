import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// 获取评论列表
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const contentId = searchParams.get('contentId')
    
    if (!contentId) {
      return NextResponse.json({ error: 'contentId is required' }, { status: 400 })
    }
    
    const comments = await prisma.comment.findMany({
      where: {
        contentId: contentId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json({
      success: true,
      comments: comments.map(comment => ({
        id: comment.id,
        text: comment.text,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        author: {
          id: comment.user.id,
          name: comment.user.name || '匿名用户',
          email: comment.user.email,
          image: comment.user.image
        }
      }))
    })
  } catch (error) {
    console.error('❌ [COMMENT-API] 获取评论失败:', error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

// 创建评论
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }
    
    const body = await request.json()
    const { contentId, text } = body
    
    if (!contentId || !text || !text.trim()) {
      return NextResponse.json({ error: 'contentId and text are required' }, { status: 400 })
    }
    
    // 验证内容是否存在且已发布
    const content = await prisma.userGeneratedContent.findUnique({
      where: { id: contentId }
    })
    
    if (!content) {
      return NextResponse.json({ error: '内容不存在' }, { status: 404 })
    }
    
    if (content.status !== 'published') {
      return NextResponse.json({ error: '只能评论已发布的内容' }, { status: 403 })
    }
    
    // 获取用户
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })
    
    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }
    
    // 创建评论
    const comment = await prisma.comment.create({
      data: {
        contentId: contentId,
        userId: user.id,
        text: text.trim()
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        text: comment.text,
        createdAt: comment.createdAt,
        author: {
          id: comment.user.id,
          name: comment.user.name || '匿名用户',
          email: comment.user.email,
          image: comment.user.image
        }
      }
    })
  } catch (error) {
    console.error('❌ [COMMENT-API] 创建评论失败:', error)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}

