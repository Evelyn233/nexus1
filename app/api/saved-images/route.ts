import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json({ images: [] })
    }

    // 从数据库获取用户
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ images: [] })
    }

    // 从数据库获取该用户的所有图片
    const images = await prisma.generatedImage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })

    // 格式化返回数据
    const formattedImages = images.map(img => ({
      filename: img.filename,
      prompt: img.prompt,
      originalUrl: img.imageUrl,
      savedAt: img.createdAt.toISOString(),
      localPath: img.localPath || `/generated-images/${img.filename}`
    }))

    return NextResponse.json({ images: formattedImages })
    
  } catch (error) {
    console.error('获取保存图片失败:', error)
    return NextResponse.json(
      { error: '获取图片失败' },
      { status: 500 }
    )
  }
}
