import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/prisma'

// 强制动态渲染（因为使用了 request.url）
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // 获取已发布的内容，按发布时间倒序排列
    const contents = await prisma.userGeneratedContent.findMany({
      where: {
        status: 'published',
        publishedAt: {
          not: null
        }
      },
      orderBy: {
        publishedAt: 'desc'
      },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    // 转换数据格式
    const formattedContents = contents.map(content => {
      let images = []
      try {
        images = typeof content.images === 'string' 
          ? JSON.parse(content.images) 
          : content.images
        
        // 🔥 确保images是数组并按sceneIndex排序
        if (Array.isArray(images)) {
          images = images.sort((a: any, b: any) => (a.sceneIndex || 0) - (b.sceneIndex || 0))
        } else {
          images = []
        }
      } catch (error) {
        console.error('解析images字段失败:', error)
        images = []
      }

      return {
        id: content.id,
        sessionId: content.sessionId,
        title: content.title || content.initialPrompt, // 🔥 优先使用AI生成的标题
        initialPrompt: content.initialPrompt, // 保留原始输入
        images: images,
        imageCount: Array.isArray(images) ? images.length : 0,
        publishedAt: content.publishedAt,
        createdAt: content.createdAt,
        author: {
          id: content.user?.id,
          name: content.user?.name || '匿名用户',
          email: content.user?.email
        }
      }
    })

    // 获取总数
    const total = await prisma.userGeneratedContent.count({
      where: {
        status: 'published',
        publishedAt: {
          not: null
        }
      }
    })

    return NextResponse.json({
      success: true,
      contents: formattedContents,
      total,
      limit,
      offset
    })
  } catch (error) {
    console.error('获取已发布内容失败:', error)
    return NextResponse.json({ error: 'Failed to fetch published content' }, { status: 500 })
  }
}

