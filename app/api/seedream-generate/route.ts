import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt, negativePrompt, width, height } = await request.json()
    
    console.log('🚀 [API] 收到SeeDream生图请求', { prompt, negativePrompt, width, height })
    
    // SeeDream API配置
    const config = {
      API_KEY: process.env.SEEDREAM_API_KEY || '17b4a6a5-1a2b-4c3d-827b-cef480fd1580',
      ENDPOINT: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
      MODEL: 'doubao-seedream-4-0-250828'
    }

    // 构建请求体
    const requestBody = {
      model: config.MODEL,
      prompt: prompt,
      ...(negativePrompt && { negative_prompt: negativePrompt }),
      sequential_image_generation: "auto",
      sequential_image_generation_options: {
        max_images: 4
      },
      response_format: "url",
      size: width && height ? `${width}x${height}` : "1024x1024",
      quality: "hd",
      stream: false,
      watermark: false,
      n: 4
    }

    // 带重试机制的请求函数
    const makeRequest = async (attempt: number) => {
      console.log(`🔄 [API] 第${attempt}次尝试...`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 60000) // 60秒超时
      
      try {
        console.log('📤 [API] 发送请求体:', JSON.stringify(requestBody, null, 2))
        
        const response = await fetch(config.ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.API_KEY}`,
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        return response
      } catch (error) {
        clearTimeout(timeoutId)
        throw error
      }
    }

    // 重试逻辑
    let lastError
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const response = await makeRequest(attempt)
        
        console.log('📡 [API] SeeDream API响应状态:', response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error('❌ [API] SeeDream API错误:', response.status, errorText)
          console.error('❌ [API] 请求配置:', {
            endpoint: config.ENDPOINT,
            model: config.MODEL,
            apiKey: config.API_KEY ? `${config.API_KEY.substring(0, 8)}...` : 'undefined',
            requestBody: requestBody
          })
          
          if (attempt < 2) {
            console.log('⏳ [API] 等待1秒后重试...')
            await new Promise(resolve => setTimeout(resolve, 1000))
            continue
          }
          
          return NextResponse.json(
            { 
              success: false, 
              error: `SeeDream API请求失败: ${response.status} - ${errorText}` 
            },
            { status: 500 }
          )
        }

        const data = await response.json()
        console.log('✅ [API] SeeDream API响应成功')
        
        // 处理响应数据
        if (data.data && Array.isArray(data.data)) {
          const imageUrls = data.data.map((item: any) => item.url).filter(Boolean)
          
          return NextResponse.json({
            success: true,
            imageUrls: imageUrls,
            imageUrl: imageUrls[0],
            prompt: prompt,
            generatedAt: new Date().toISOString()
          })
        } else if (data.url) {
          return NextResponse.json({
            success: true,
            imageUrls: [data.url],
            imageUrl: data.url,
            prompt: prompt,
            generatedAt: new Date().toISOString()
          })
        } else {
          console.error('❌ [API] API响应格式不正确:', data)
          return NextResponse.json(
            { 
              success: false, 
              error: 'API响应格式不正确' 
            },
            { status: 500 }
          )
        }
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
