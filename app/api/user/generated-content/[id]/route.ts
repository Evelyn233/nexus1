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
        
        // 🔥 确保图片按sceneIndex排序
        if (Array.isArray(images)) {
          images = images.sort((a: any, b: any) => (a.sceneIndex || 0) - (b.sceneIndex || 0))
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
      // 🔥 确保图片按sceneIndex排序后再保存，并在保存前下载为持久化的 data URL
      let sortedImages: any[] = []

      if (Array.isArray(body.images)) {
        const imagesByOrder = [...body.images].sort(
          (a: any, b: any) => (a?.sceneIndex || 0) - (b?.sceneIndex || 0)
        )

        sortedImages = (
          await Promise.all(
            imagesByOrder.map(async (img: any, index: number) => {
              if (!img) {
                return null
              }

              const baseObject =
                typeof img === 'object'
                  ? { ...img }
                  : {
                      sceneTitle: `场景 ${index + 1}`,
                      prompt: '',
                      story: '',
                    }

              const sceneIndex =
                typeof baseObject.sceneIndex === 'number'
                  ? baseObject.sceneIndex
                  : index

              const candidateUrl =
                typeof img === 'string'
                  ? img
                  : img?.imageUrl ||
                    img?.url ||
                    img?.src ||
                    img?.image_path ||
                    img?.imageURI ||
                    img?.uri ||
                    ''

              const existingDataUrl =
                typeof img === 'string' && img.startsWith('data:')
                  ? img
                  : baseObject.imageDataUrl && typeof baseObject.imageDataUrl === 'string'
                    ? baseObject.imageDataUrl
                    : candidateUrl.startsWith('data:')
                      ? candidateUrl
                      : ''

              let imageDataUrl = existingDataUrl

              // 🔥 如果没有 imageDataUrl，尝试从远程URL下载并转换为 base64
              if (!imageDataUrl && candidateUrl && !candidateUrl.startsWith('data:')) {
                try {
                  console.log('🖼️ [CONTENT-UPDATE-API] 下载远程图片以持久化:', candidateUrl)
                  const imageResponse = await fetch(candidateUrl, {
                    cache: 'no-store'
                  })

                  if (imageResponse.ok) {
                    const arrayBuffer = await imageResponse.arrayBuffer()
                    const buffer = Buffer.from(arrayBuffer)
                    const contentType =
                      imageResponse.headers.get('content-type') || 'image/jpeg'
                    imageDataUrl = `data:${contentType};base64,${buffer.toString('base64')}`
                    console.log('✅ [CONTENT-UPDATE-API] 图片持久化成功')
                  } else {
                    console.warn(
                      '⚠️ [CONTENT-UPDATE-API] 下载图片失败，状态码:',
                      imageResponse.status
                    )
                  }
                } catch (downloadError) {
                  console.error('❌ [CONTENT-UPDATE-API] 图片下载异常:', downloadError)
                }
              }

              return {
                ...baseObject,
                sceneIndex,
                imageUrl: candidateUrl,
                imageDataUrl: imageDataUrl || null
              }
            })
          )
        ).filter(Boolean) as any[]
      } else {
        sortedImages = body.images
      }

      const imagesJson = JSON.stringify(sortedImages)
      updateData.images = imagesJson
      console.log('💾 [CONTENT-UPDATE-API] 准备更新图片数据（已排序并持久化）:', {
        imagesJsonLength: imagesJson.length,
        imageCount: sortedImages.length,
        sceneIndices: Array.isArray(sortedImages) ? sortedImages.map((img: any) => img.sceneIndex) : [],
        hasDataUrls: Array.isArray(sortedImages) ? sortedImages.filter((img: any) => img.imageDataUrl).length : 0
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

