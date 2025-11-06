import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// 获取单个生成内容的详细信息

// 强制动态渲染
export const dynamic = 'force-dynamic'
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
    let images = []
    try {
      if (content.images) {
        if (typeof content.images === 'string') {
          images = JSON.parse(content.images)
        } else if (Array.isArray(content.images)) {
          images = content.images
        }
      }
    } catch (error) {
      console.error('❌ [CONTENT-DETAIL-API] 解析images失败:', error)
      images = []
    }
    
    console.log('🔍 [CONTENT-DETAIL-API] 图片数据:', {
      raw: content.images,
      type: typeof content.images,
      parsed: images,
      length: images.length
    })
    
    const parsedContent = {
      ...content,
      questions: content.questions ? JSON.parse(content.questions) : [],
      answers: content.answers ? JSON.parse(content.answers) : [],
      scenes: content.scenes ? JSON.parse(content.scenes) : null,
      images: images,
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

// 更新生成内容（用于添加分批生成的图片）
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id: contentId } = await params
    const body = await request.json()
    
    console.log('🔄 [CONTENT-UPDATE-API] 更新内容:', contentId)
    console.log('📦 [CONTENT-UPDATE-API] 更新数据:', {
      imagesCount: body.images?.length || 0,
      imagesType: typeof body.images,
      imageCount: body.imageCount,
      imagesPreview: Array.isArray(body.images) ? body.images.slice(0, 2).map((img: any) => ({
        sceneTitle: img.sceneTitle,
        sceneIndex: img.sceneIndex,
        hasImageUrl: !!img.imageUrl
      })) : 'not array'
    })

    // 查找内容
    const content = await prisma.userGeneratedContent.findUnique({
      where: { id: contentId }
    })

    if (!content) {
      return NextResponse.json({ error: '内容不存在' }, { status: 404 })
    }

    // 验证是否是当前用户的内容
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || content.userId !== user.id) {
      return NextResponse.json({ error: '无权访问' }, { status: 403 })
    }

    // 更新内容
    const updateData: any = {}
    if (body.images) {
      const imagesJson = JSON.stringify(body.images)
      updateData.images = imagesJson
      console.log('💾 [CONTENT-UPDATE-API] 准备更新图片数据:', {
        imagesJsonLength: imagesJson.length,
        imageCount: body.images.length
      })
    }
    if (body.imageCount !== undefined) {
      updateData.imageCount = body.imageCount
    }
    if (body.title !== undefined) {
      updateData.title = body.title
      console.log('💾 [CONTENT-UPDATE-API] 更新标题:', body.title)
    }

    const updatedContent = await prisma.userGeneratedContent.update({
      where: { id: contentId },
      data: updateData
    })

    console.log('✅ [CONTENT-UPDATE-API] 内容更新成功:', {
      contentId,
      imageCount: updatedContent.imageCount,
      imagesFieldLength: updatedContent.images ? updatedContent.images.length : 0
    })

    return NextResponse.json({
      success: true,
      content: {
        id: updatedContent.id,
        imageCount: updatedContent.imageCount
      }
    })

  } catch (error) {
    console.error('❌ [CONTENT-UPDATE-API] 更新内容失败:', error)
    return NextResponse.json(
      { error: '更新失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

// 删除生成内容
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const { id: contentId } = await params
    
    console.log('🗑️ [CONTENT-DELETE-API] 删除内容:', contentId)

    // 查找内容
    const content = await prisma.userGeneratedContent.findUnique({
      where: { id: contentId }
    })

    if (!content) {
      return NextResponse.json({ error: '内容不存在' }, { status: 404 })
    }

    // 验证是否是当前用户的内容
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user || content.userId !== user.id) {
      return NextResponse.json({ error: '无权访问' }, { status: 403 })
    }

    // 删除内容
    await prisma.userGeneratedContent.delete({
      where: { id: contentId }
    })

    console.log('✅ [CONTENT-DELETE-API] 内容删除成功:', contentId)

    return NextResponse.json({
      success: true,
      message: '删除成功'
    })

  } catch (error) {
    console.error('❌ [CONTENT-DELETE-API] 删除内容失败:', error)
    return NextResponse.json(
      { error: '删除失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}

