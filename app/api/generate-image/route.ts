import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const { prompt } = await request.json()
    
    console.log('收到生图请求:', prompt)
    
    // 模拟API延迟
    await new Promise(resolve => setTimeout(resolve, 3000))
    
    // 根据提示词生成不同的模拟图片URL（高清1920x1920）
    const imageUrls = {
      '面试': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920&h=1920&fit=crop&q=100',
      '约会': 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=1920&h=1920&fit=crop&q=100',
      '聚会': 'https://images.unsplash.com/photo-1488161628813-04466f872be2?w=1920&h=1920&fit=crop&q=100',
      '工作': 'https://images.unsplash.com/photo-1556157382-97eda2d62296?w=1920&h=1920&fit=crop&q=100',
      '日常': 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&h=1920&fit=crop&q=100',
      '时尚': 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=1920&h=1920&fit=crop&q=100',
      '穿搭': 'https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?w=1920&h=1920&fit=crop&q=100',
      'business': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920&h=1920&fit=crop&q=100',
      'interview': 'https://images.unsplash.com/photo-1556157382-97eda2d62296?w=1920&h=1920&fit=crop&q=100',
      'professional': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920&h=1920&fit=crop&q=100'
    }
    
    // 根据提示词内容选择合适的图片
    let selectedImage = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920&h=1920&fit=crop&q=100'
    
    for (const [keyword, url] of Object.entries(imageUrls)) {
      if (prompt.toLowerCase().includes(keyword.toLowerCase())) {
        selectedImage = url
        break
      }
    }
    
    // 生成多张图片（模拟连续生成，高清）
    const generatedImages = [
      selectedImage,
      'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1920&h=1920&fit=crop&q=100',
      'https://images.unsplash.com/photo-1544022613-e87ca75a784a?w=1920&h=1920&fit=crop&q=100'
    ]
    
    // 保存图片到本地
    const savedImages = []
    for (let i = 0; i < generatedImages.length; i++) {
      try {
        const saveResponse = await fetch(`${request.nextUrl.origin}/api/save-image`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageUrl: generatedImages[i],
            prompt: `${prompt} - 图片${i + 1}`
          })
        })
        
        if (saveResponse.ok) {
          const saveData = await saveResponse.json()
          savedImages.push({
            originalUrl: generatedImages[i],
            localPath: saveData.localPath,
            metadata: saveData.metadata
          })
        }
      } catch (saveError) {
        console.error('保存图片失败:', saveError)
      }
    }
    
    console.log('生图完成，保存了', savedImages.length, '张图片')
    
    return NextResponse.json({
      success: true,
      imageUrls: generatedImages,
      imageUrl: generatedImages[0], // 兼容性
      savedImages: savedImages,
      prompt: prompt,
      generatedAt: new Date().toISOString(),
      message: `成功生成${generatedImages.length}张图片并保存到本地`
    })
    
  } catch (error) {
    console.error('生图API错误:', error)
    return NextResponse.json(
      { success: false, error: '图片生成失败' },
      { status: 500 }
    )
  }
}
