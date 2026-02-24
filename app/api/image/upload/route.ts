import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

// 强制动态渲染
export const dynamic = 'force-dynamic'

/**
 * 上传图片（base64 或文件）并返回可访问的 URL
 * POST /api/image/upload
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { imageData, filename } = body

    if (!imageData) {
      return NextResponse.json(
        { error: 'Missing imageData' },
        { status: 400 }
      )
    }

    // 处理 base64 图片
    let imageBuffer: Buffer
    let mimeType = 'image/jpeg'
    let extension = 'jpg'

    if (typeof imageData === 'string') {
      // 如果是 base64 data URL
      if (imageData.startsWith('data:')) {
        const matches = imageData.match(/^data:([^;]+);base64,(.+)$/)
        if (!matches) {
          return NextResponse.json(
            { error: 'Invalid base64 image format' },
            { status: 400 }
          )
        }
        mimeType = matches[1]
        const base64Data = matches[2]
        imageBuffer = Buffer.from(base64Data, 'base64')
        
        // 根据 mimeType 确定扩展名
        if (mimeType.includes('png')) {
          extension = 'png'
        } else if (mimeType.includes('webp')) {
          extension = 'webp'
        } else if (mimeType.includes('gif')) {
          extension = 'gif'
        }
      } else {
        // 如果是纯 base64 字符串（无 data: 前缀）
        imageBuffer = Buffer.from(imageData, 'base64')
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid imageData format' },
        { status: 400 }
      )
    }

    // 创建保存目录
    const uploadDir = join(process.cwd(), 'public', 'uploaded-images')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    // 生成文件名
    const timestamp = Date.now()
    const finalFilename = filename 
      ? `${timestamp}-${filename.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      : `${timestamp}.${extension}`
    
    const filepath = join(uploadDir, finalFilename)

    // 保存文件
    await writeFile(filepath, imageBuffer)

    // 返回可访问的 URL
    const imageUrl = `/uploaded-images/${finalFilename}`
    
    // 如果是本地开发，返回完整 URL
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    const fullUrl = `${baseUrl}${imageUrl}`

    console.log('✅ [IMAGE-UPLOAD] 图片上传成功:', fullUrl)

    return NextResponse.json({
      success: true,
      url: fullUrl,
      localPath: imageUrl,
      filename: finalFilename
    })

  } catch (error) {
    console.error('❌ [IMAGE-UPLOAD] 图片上传失败:', error)
    return NextResponse.json(
      { error: 'Image upload failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}
