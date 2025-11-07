import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 调试Prisma可用性

// 强制动态渲染
export const dynamic = 'force-dynamic'
console.log('🔍 [CONTENT-API] Prisma调试信息:', {
  prismaType: typeof prisma,
  prismaAvailable: !!prisma,
  userGeneratedContentAvailable: !!(prisma && prisma.userGeneratedContent),
  prismaKeys: prisma ? Object.keys(prisma) : 'prisma is undefined'
})

// 保存用户生成的内容
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const {
      sessionId,
      title, // 🔥 AI生成的标题
      initialPrompt,
      questions,
      answers,
      scenes,
      storyNarrative,
      images,
      userSnapshot,
      metadataSnapshot,
      tags,
      category
    } = body
    
    console.log('📥 [CONTENT-API] 接收到的数据:', {
      sessionId,
      title,
      initialPrompt: initialPrompt?.substring(0, 50) + '...',
      imagesCount: Array.isArray(images) ? images.length : 0,
      imagesType: typeof images,
      imagesPreview: Array.isArray(images) ? images.slice(0, 2).map((img: any) => ({
        sceneTitle: img.sceneTitle,
        sceneIndex: img.sceneIndex,
        hasImageUrl: !!img.imageUrl
      })) : 'not array'
    })

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 检查Prisma是否可用
    if (!prisma || !prisma.userGeneratedContent) {
      console.error('❌ [CONTENT-API] Prisma userGeneratedContent不可用')
      return NextResponse.json(
        { error: '数据库连接问题', details: 'Prisma userGeneratedContent模型不可用' },
        { status: 500 }
      )
    }

    // 🔥 确保图片按sceneIndex排序后再保存
    const sortedImages = Array.isArray(images) 
      ? [...images].sort((a: any, b: any) => (a.sceneIndex || 0) - (b.sceneIndex || 0))
      : images || []
    const imagesJson = JSON.stringify(sortedImages)
    const imageCount = Array.isArray(sortedImages) ? sortedImages.length : 0
    
    console.log('💾 [CONTENT-API] 准备保存图片数据（已排序）:', {
      imagesJsonLength: imagesJson.length,
      imageCount,
      sceneIndices: Array.isArray(sortedImages) ? sortedImages.map((img: any) => img.sceneIndex) : [],
      imagesJsonPreview: imagesJson.substring(0, 200) + '...'
    })
    
    const content = await prisma.userGeneratedContent.create({
      data: {
        userId: user.id,
        sessionId: sessionId || null,  // 保存sessionId
        title: title || null, // 🔥 保存AI生成的标题
        initialPrompt: initialPrompt || '',
        questions: JSON.stringify(questions || []),
        answers: JSON.stringify(answers || []),
        scenes: JSON.stringify(scenes || {}),
        storyNarrative: storyNarrative || null,
        images: imagesJson,
        imageCount: imageCount,
        userSnapshot: userSnapshot ? JSON.stringify(userSnapshot) : null,
        metadataSnapshot: metadataSnapshot ? JSON.stringify(metadataSnapshot) : null,
        tags: tags ? JSON.stringify(tags) : null,
        category: category || 'daily',
        status: 'completed'
      }
    })

    console.log('✅ [CONTENT-API] 保存生成内容成功:', {
      contentId: content.id,
      imageCount: content.imageCount,
      imagesFieldLength: content.images ? content.images.length : 0
    })

    return NextResponse.json({
      success: true,
      contentId: content.id,
      message: '内容保存成功'
    })

  } catch (error) {
    console.error('❌ [CONTENT-API] 保存内容失败:', error)
    console.error('❌ [CONTENT-API] 错误详情:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      prismaAvailable: typeof prisma !== 'undefined',
      userGeneratedContentAvailable: typeof prisma?.userGeneratedContent !== 'undefined'
    })
    return NextResponse.json(
      { error: '保存失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// 获取用户的生成内容列表
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = parseInt(searchParams.get('offset') || '0')
    const category = searchParams.get('category')

    console.log('🔍 [CONTENT-API] GET请求调试信息:', {
      userEmail: session.user.email,
      limit,
      offset,
      category
    })

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    console.log('🔍 [CONTENT-API] 用户查找结果:', {
      userFound: !!user,
      userId: user?.id
    })

    if (!user) {
      return NextResponse.json({ error: '用户不存在' }, { status: 404 })
    }

    // 构建查询条件
    const where: any = { userId: user.id }
    if (category) {
      where.category = category
    }

    // 获取内容列表
    const contents = await prisma.userGeneratedContent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      select: {
        id: true,
        initialPrompt: true,
        questions: true,
        answers: true,
        storyNarrative: true,
        imageCount: true,
        category: true,
        tags: true,
        status: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // 获取总数
    const total = await prisma.userGeneratedContent.count({ where })

    console.log('🔍 [CONTENT-API] 查询结果调试信息:', {
      contentsLength: contents.length,
      total,
      where,
      contents: contents.map(c => ({ id: c.id, initialPrompt: c.initialPrompt?.substring(0, 50) + '...' }))
    })

    console.log(`✅ [CONTENT-API] 获取用户内容列表: ${contents.length}条`)

    return NextResponse.json({
      success: true,
      contents: contents.map(c => ({
        ...c,
        questions: c.questions ? JSON.parse(c.questions) : [],
        answers: c.answers ? JSON.parse(c.answers) : [],
        tags: c.tags ? JSON.parse(c.tags) : [],
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString()
      })),
      total,
      hasMore: offset + contents.length < total
    })

  } catch (error) {
    console.error('❌ [CONTENT-API] 获取内容列表失败:', error)
    return NextResponse.json(
      { error: '获取失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// 获取单个生成内容的详细信息
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const body = await request.json()
    const { contentId } = body

    if (!contentId) {
      return NextResponse.json({ error: '缺少contentId' }, { status: 400 })
    }

    // 查找内容
    const content = await prisma.userGeneratedContent.findUnique({
      where: { id: contentId }
    })

    if (!content) {
      return NextResponse.json({ error: '内容不存在' }, { status: 404 })
    }

    // 验证用户权限
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || content.userId !== user.id) {
      return NextResponse.json({ error: '无权访问' }, { status: 403 })
    }

    // 解析JSON字段
    const detailedContent = {
      ...content,
      questions: JSON.parse(content.questions),
      answers: JSON.parse(content.answers),
      scenes: JSON.parse(content.scenes),
      images: JSON.parse(content.images),
      userSnapshot: content.userSnapshot ? JSON.parse(content.userSnapshot) : null,
      metadataSnapshot: content.metadataSnapshot ? JSON.parse(content.metadataSnapshot) : null,
      tags: content.tags ? JSON.parse(content.tags) : []
    }

    console.log('✅ [CONTENT-API] 获取内容详情成功:', contentId)

    return NextResponse.json({
      success: true,
      content: detailedContent
    })

  } catch (error) {
    console.error('❌ [CONTENT-API] 获取内容详情失败:', error)
    return NextResponse.json(
      { error: '获取失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

