import { API_CONFIG, PROMPT_TEMPLATES } from './config'

export interface ImageGenerationRequest {
  prompt: string
  width?: number
  height?: number
  style?: string
  maxImages?: number
  sequentialGeneration?: boolean
}

export interface ImageGenerationResponse {
  success: boolean
  imageUrls?: string[]
  imageUrl?: string // 兼容性
  savedImages?: any[]
  message?: string
  error?: string
}

export async function generateImage(request: ImageGenerationRequest): Promise<ImageGenerationResponse> {
  try {
    console.log('🚀 调用SeeDream API (通过后端代理)...', {
      prompt: request.prompt
    });

    // 通过后端API调用SeeDream API
    const response = await fetch('/api/seedream-generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: request.prompt
      })
    })

    console.log('📡 后端API响应状态:', response.status);

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ 后端API错误:', response.status, errorText)
      throw new Error(`后端API请求失败: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('✅ 后端API响应成功:', data);
    
    if (data.success && data.imageUrls) {
      console.log('🖼️ 生成的图片URLs:', data.imageUrls);
      return {
        success: true,
        imageUrls: data.imageUrls,
        imageUrl: data.imageUrl || data.imageUrls[0]
      }
    } else {
      console.error('❌ 后端API返回失败:', data);
      throw new Error(data.error || '后端API返回失败')
    }
    
  } catch (error) {
    console.error('💥 SeeDream API异常:', error)
    console.error('💥 错误详情:', {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    })
    
    // 备用方案：使用本地API
    try {
      console.log('🔄 切换到本地备用API...')
      const fallbackResponse = await fetch('/api/generate-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: request.prompt,
          width: request.width || 1024,
          height: request.height || 1024,
          style: request.style || 'photorealistic',
          quality: 'hd'
        })
      })

      if (fallbackResponse.ok) {
        const data = await fallbackResponse.json()
        return {
          success: true,
          imageUrls: [data.imageUrl || data.url],
          imageUrl: data.imageUrl || data.url
        }
      }
    } catch (fallbackError) {
      console.error('备用API也失败:', fallbackError)
    }
    
    return {
      success: false,
      error: error instanceof Error ? error.message : '生图失败'
    }
  }
}

// 生成连贯的图片序列
export async function generateImageSequence(prompts: string[]): Promise<ImageGenerationResponse[]> {
  const results: ImageGenerationResponse[] = []
  
  for (const prompt of prompts) {
    const result = await generateImage({ prompt })
    results.push(result)
    
    // 添加延迟以避免API限制
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  
  return results
}

// 根据用户输入智能生成相关图片
export function createImagePrompts(userInput: string): string[] {
  const prompts: string[] = []
  
  // 分析用户输入，生成相关的图片提示词
  if (userInput.includes('穿') || userInput.includes('衣服') || userInput.includes('服装')) {
    prompts.push(`${userInput}的时尚搭配建议`)
    prompts.push(`适合${userInput}的配饰推荐`)
    prompts.push(`${userInput}的场合穿搭`)
  }
  
  if (userInput.includes('面试') || userInput.includes('工作')) {
    prompts.push(`专业面试穿搭`)
    prompts.push(`职场商务风格`)
    prompts.push(`自信面试造型`)
  }
  
  if (userInput.includes('约会') || userInput.includes('聚会')) {
    prompts.push(`浪漫约会穿搭`)
    prompts.push(`聚会时尚造型`)
    prompts.push(`优雅社交装扮`)
  }
  
  // 如果没有匹配到特定场景，生成通用建议
  if (prompts.length === 0) {
    prompts.push(`${userInput}的时尚建议`)
    prompts.push(`个性化穿搭推荐`)
    prompts.push(`生活方式建议`)
  }
  
  return prompts.slice(0, 3) // 最多生成3张图片
}
