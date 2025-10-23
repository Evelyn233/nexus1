import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: '未登录' },
        { status: 401 }
      )
    }

    const { filename } = await request.json()
    
    if (!filename) {
      return NextResponse.json({ error: '缺少文件名' }, { status: 400 })
    }

    // 从数据库删除
    await prisma.generatedImage.deleteMany({
      where: { filename }
    })

    // 同时删除本地文件
    const saveDir = path.join(process.cwd(), 'public', 'generated-images')
    const imagePath = path.join(saveDir, filename)
    
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath)
    }

    // 删除元数据文件
    const files = fs.readdirSync(saveDir)
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const metadataPath = path.join(saveDir, file)
          const metadataContent = fs.readFileSync(metadataPath, 'utf-8')
          const metadata = JSON.parse(metadataContent)
          
          if (metadata.filename === filename) {
            fs.unlinkSync(metadataPath)
            break
          }
        } catch (error) {
          console.error(`读取元数据文件失败: ${file}`, error)
        }
      }
    }

    console.log('✅ 图片已从数据库和本地删除')
    return NextResponse.json({ success: true, message: '图片删除成功' })
    
  } catch (error) {
    console.error('删除图片失败:', error)
    return NextResponse.json(
      { error: '删除图片失败' },
      { status: 500 }
    )
  }
}
