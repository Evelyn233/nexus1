import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

// 强制动态渲染
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
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

    const { imageUrl, prompt } = await request.json()
    
    if (!imageUrl) {
      return NextResponse.json({ error: '缺少图片URL' }, { status: 400 })
    }

    // 创建保存目录
    const saveDir = path.join(process.cwd(), 'public', 'generated-images')
    if (!fs.existsSync(saveDir)) {
      fs.mkdirSync(saveDir, { recursive: true })
    }

    // 生成文件名
    const timestamp = Date.now()
    const filename = `generated-${timestamp}.jpg`
    const filepath = path.join(saveDir, filename)

    try {
      // 下载图片
      const imageResponse = await fetch(imageUrl)
      if (!imageResponse.ok) {
        throw new Error(`下载图片失败: ${imageResponse.status}`)
      }

      const imageBuffer = await imageResponse.arrayBuffer()
      
      // 保存到本地
      fs.writeFileSync(filepath, Buffer.from(imageBuffer))
      
      // 保存到数据库
      const savedImage = await prisma.generatedImage.create({
        data: {
          userId: user.id,
          filename,
          prompt: prompt || '',
          imageUrl,
          localPath: `/generated-images/${filename}`
        }
      })

      // 同时保存元数据文件（向后兼容）
      const metadata = {
        filename,
        prompt,
        originalUrl: imageUrl,
        savedAt: new Date().toISOString(),
        size: imageBuffer.byteLength
      }
      
      const metadataFile = path.join(saveDir, `${timestamp}.json`)
      fs.writeFileSync(metadataFile, JSON.stringify(metadata, null, 2))

      console.log('✅ 图片已保存到数据库和本地')

      return NextResponse.json({
        success: true,
        localPath: `/generated-images/${filename}`,
        metadata,
        dbId: savedImage.id
      })
      
    } catch (downloadError) {
      console.error('下载图片失败:', downloadError)
      return NextResponse.json({ error: '下载图片失败' }, { status: 500 })
    }
    
  } catch (error) {
    console.error('保存图片错误:', error)
    return NextResponse.json({ error: '保存图片失败' }, { status: 500 })
  }
}
