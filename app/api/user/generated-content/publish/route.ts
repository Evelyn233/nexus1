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

    // 🔥 发布前确保所有图片都已持久化为 base64
    let imagesData = content.images
    if (typeof imagesData === 'string') {
      try {
        imagesData = JSON.parse(imagesData)
      } catch (error) {
        console.error('❌ [PUBLISH-API] 解析图片数据失败:', error)
        imagesData = []
      }
    }

    if (Array.isArray(imagesData) && imagesData.length > 0) {
      console.log('🖼️ [PUBLISH-API] 开始持久化图片，共', imagesData.length, '张')
      
      const persistedImages = await Promise.all(
        imagesData.map(async (img: any, index: number) => {
          if (!img) return null

          // 检查是否已有 imageDataUrl
          const existingDataUrl =
            (typeof img.imageDataUrl === 'string' && img.imageDataUrl) ||
            (typeof img === 'string' && img.startsWith('data:') ? img : '') ||
            ''

          if (existingDataUrl) {
            console.log(`✅ [PUBLISH-API] 图片 ${index + 1} 已有 imageDataUrl`)
            return {
              ...img,
              imageDataUrl: existingDataUrl
            }
          }

          // 尝试从 imageUrl 下载并转换为 base64
          const candidateUrl =
            img.imageUrl ||
            img.url ||
            img.src ||
            img.image_path ||
            img.imageURI ||
            img.uri ||
            ''

          if (!candidateUrl || candidateUrl.startsWith('data:')) {
            return img
          }

          try {
            console.log(`🖼️ [PUBLISH-API] 下载图片 ${index + 1} 以持久化:`, candidateUrl)
            const imageResponse = await fetch(candidateUrl, {
              cache: 'no-store'
            })

            if (imageResponse.ok) {
              const arrayBuffer = await imageResponse.arrayBuffer()
              const buffer = Buffer.from(arrayBuffer)
              const contentType =
                imageResponse.headers.get('content-type') || 'image/jpeg'
              const imageDataUrl = `data:${contentType};base64,${buffer.toString('base64')}`
              console.log(`✅ [PUBLISH-API] 图片 ${index + 1} 持久化成功`)
              return {
                ...img,
                imageUrl: candidateUrl,
                imageDataUrl: imageDataUrl
              }
            } else {
              console.warn(
                `⚠️ [PUBLISH-API] 图片 ${index + 1} 下载失败，状态码:`,
                imageResponse.status
              )
              return img
            }
          } catch (downloadError) {
            console.error(`❌ [PUBLISH-API] 图片 ${index + 1} 下载异常:`, downloadError)
            return img
          }
        })
      )

      // 更新图片数据
      imagesData = persistedImages.filter(Boolean)
      console.log('✅ [PUBLISH-API] 图片持久化完成，共', imagesData.length, '张')
    }

    // 更新状态为已发布，同时更新图片数据
    console.log('📝 [PUBLISH-API] 更新发布状态...')
    const updateData: any = {
      status: 'published',
      publishedAt: new Date()
    }

    // 如果有持久化后的图片数据，一起更新
    if (Array.isArray(imagesData) && imagesData.length > 0) {
      updateData.images = JSON.stringify(imagesData)
      console.log('💾 [PUBLISH-API] 同时更新图片数据（包含 imageDataUrl）')
    }

    const updatedContent = await prisma.userGeneratedContent.update({
      where: {
        id: content.id
      },
      data: updateData
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

