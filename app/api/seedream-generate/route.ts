import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt, negativePrompt, width, height, imageUrl, imageData } = await request.json()
    
    console.log('🚀 [API] 收到SeeDream生图请求', { prompt: prompt?.slice(0, 60), hasImage: !!(imageUrl || imageData) })
    
    const apiKey = process.env.SEEDREAM_API_KEY || process.env.ARK_API_KEY || '17b4a6a5-1a2b-4c3d-827b-cef480fd1580'
    const endpoint = 'https://ark.cn-beijing.volces.com/api/v3/images/generations'
    
    // 用户输入了图片：走图生图，使用 4-5 模型，把图作为 image 传给 SeeDream
    let imageForApi: string | undefined
    if (imageData && typeof imageData === 'string' && imageData.startsWith('data:')) {
      imageForApi = imageData
    } else if (imageUrl && typeof imageUrl === 'string') {
      // localhost 时 Volces 无法抓取，转为 base64
      if (imageUrl.includes('localhost') || imageUrl.includes('127.0.0.1')) {
        try {
          const r = await fetch(imageUrl)
          if (r.ok) {
            const buf = await r.arrayBuffer()
            const b64 = Buffer.from(buf).toString('base64')
            const ct = r.headers.get('content-type') || 'image/jpeg'
            imageForApi = `data:${ct};base64,${b64}`
          } else {
            imageForApi = imageUrl
          }
        } catch {
          imageForApi = imageUrl
        }
      } else {
        imageForApi = imageUrl
      }
    }
    
    const size = width && height ? `${width}x${height}` : '1024x1024'
    const requestBody: Record<string, unknown> = imageForApi
      ? {
          model: 'doubao-seedream-4-5-251128',
          prompt,
          image: imageForApi,
          size,
          watermark: false,
          response_format: 'url'
        }
      : {
          model: 'doubao-seedream-4-0-250828',
          prompt,
          ...(negativePrompt && { negative_prompt: negativePrompt }),
          sequential_image_generation: 'auto',
          sequential_image_generation_options: { max_images: 1 },
          response_format: 'url',
          size,
          quality: 'hd',
          stream: false,
          watermark: false,
          n: 1
        }
    
    console.log('📋 [API] 请求参数:', { model: requestBody.model, promptLength: prompt?.length, size, hasImage: !!imageForApi })

    const makeRequest = async (attempt: number) => {
      console.log(`🔄 [API] 第${attempt}次尝试...`)
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000)
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        return res
      } catch (e) {
        clearTimeout(timeoutId)
        throw e
      }
    }

    // 重试逻辑
    let lastError
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await makeRequest(attempt)
        
        if (!response.ok) {
          const errorText = await response.text()
          console.error('❌ [API] SeeDream API错误:', response.status, errorText)
          if (attempt < 2) {
            await new Promise(r => setTimeout(r, 1000))
            continue
          }
          return NextResponse.json({ success: false, error: `SeeDream API请求失败: ${response.status} - ${errorText}` }, { status: 500 })
        }

        const data = await response.json()
        console.log('✅ [API] SeeDream API响应成功')
        console.log('📦 [API] 完整响应数据:', JSON.stringify(data, null, 2))
        
        // 🔥 处理响应数据 - 支持多种返回格式
        let imageUrls: string[] = []
        
        // 格式1: data.data 数组格式（标准格式）
        if (data.data && Array.isArray(data.data)) {
          imageUrls = data.data.map((item: any) => item.url).filter(Boolean)
          console.log(`📸 [API] 从data.data提取到 ${imageUrls.length} 个图片URL`)
        } 
        // 格式2: 直接包含 url 字段
        else if (data.url) {
          imageUrls = [data.url]
          console.log('📸 [API] 从data.url提取到 1 个图片URL')
        }
        // 格式3: choices 格式（某些API返回）
        else if (data.choices && Array.isArray(data.choices)) {
          imageUrls = data.choices
            .map((choice: any) => choice.url || choice.image_url)
            .filter(Boolean)
          console.log(`📸 [API] 从data.choices提取到 ${imageUrls.length} 个图片URL`)
        }
        // 格式4: images 数组格式
        else if (data.images && Array.isArray(data.images)) {
          imageUrls = data.images
            .map((img: any) => typeof img === 'string' ? img : img.url)
            .filter(Boolean)
          console.log(`📸 [API] 从data.images提取到 ${imageUrls.length} 个图片URL`)
        }
        
        // 🔥 验证是否成功提取到图片URL
        if (imageUrls.length === 0) {
          console.error('❌ [API] 未能从响应中提取到图片URL')
          console.error('📦 [API] 响应数据结构:', Object.keys(data))
          console.error('📦 [API] 完整响应:', JSON.stringify(data, null, 2))
          return NextResponse.json(
            { 
              success: false, 
              error: '未能从API响应中提取到图片URL，请检查API返回格式' 
            },
            { status: 500 }
          )
        }
        
        console.log(`✅ [API] 成功提取 ${imageUrls.length} 个图片URL`)
        console.log('🔗 [API] 图片URLs:', imageUrls)
        
        return NextResponse.json({
          success: true,
          imageUrls: imageUrls,
          imageUrl: imageUrls[0], // 第一张图作为主图
          prompt: prompt,
          generatedAt: new Date().toISOString(),
          totalImages: imageUrls.length
        })
      } catch (error) {
        lastError = error
        console.error(`❌ [API] 第${attempt}次尝试失败:`, error)
        
        if (attempt < 2) {
          console.log('⏳ [API] 等待2秒后重试...')
          await new Promise(resolve => setTimeout(resolve, 2000))
          continue
        }
      }
    }
    
    // 所有重试都失败
    console.error('💥 [API] 所有重试都失败')
    return NextResponse.json(
      { 
        success: false, 
        error: lastError instanceof Error ? lastError.message : '生图失败，请重试' 
      },
      { status: 500 }
    )
    
  } catch (error) {
    console.error('💥 [API] SeeDream API异常:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : '生图失败' 
      },
      { status: 500 }
    )
  }
}
