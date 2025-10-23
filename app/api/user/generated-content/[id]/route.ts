import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 获取单个生成内容的详细信息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id: contentId } = await params

    console.log('🔍 [CONTENT-DETAIL-API] 获取内容详情:', contentId)

    // 查找内容
    const content = await prisma.userGeneratedContent.findUnique({
      where: { id: contentId }
    })

    if (!content) {
      console.error('❌ [CONTENT-DETAIL-API] 内容不存在:', contentId)
      return NextResponse.json({ error: '内容不存在' }, { status: 404 })
    }

    // 验证是否是当前用户的内容
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || content.userId !== user.id) {
      console.error('❌ [CONTENT-DETAIL-API] 无权访问:', contentId)
      return NextResponse.json({ error: '无权访问' }, { status: 403 })
    }

    console.log('✅ [CONTENT-DETAIL-API] 获取内容详情成功:', contentId)

    // 解析JSON字段
    const parsedContent = {
      ...content,
      questions: content.questions ? JSON.parse(content.questions) : [],
      answers: content.answers ? JSON.parse(content.answers) : [],
      scenes: content.scenes ? JSON.parse(content.scenes) : null,
      images: content.images ? JSON.parse(content.images) : [],
      tags: content.tags ? JSON.parse(content.tags) : [],
      userSnapshot: content.userSnapshot ? JSON.parse(content.userSnapshot) : null,
      metadataSnapshot: content.metadataSnapshot ? JSON.parse(content.metadataSnapshot) : null
    }

    return NextResponse.json({
      success: true,
      content: parsedContent
    })

  } catch (error) {
    console.error('❌ [CONTENT-DETAIL-API] 获取内容详情失败:', error)
    return NextResponse.json(
      { error: '获取失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

