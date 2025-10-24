/**
 * LLM情绪检测服务
 * 使用AI来智能识别用户文本中的情绪
 */

interface EmotionDetectionResult {
  emotions: string[]
  primaryEmotion: string
  intensity: 'low' | 'medium' | 'high'
  confidence: number
}

/**
 * 使用LLM检测文本中的情绪
 */
export async function detectEmotionsWithLLM(text: string): Promise<EmotionDetectionResult> {
  // 🔥 检查是否启用情绪检测（可以通过环境变量控制）
  if (process.env.DISABLE_EMOTION_DETECTION === 'true') {
    console.log('🔇 [EMOTION] 情绪检测已禁用')
    return {
      emotions: [],
      primaryEmotion: '',
      intensity: 'low',
      confidence: 0
    }
  }
  
  try {
    const prompt = `请分析以下文本中的情绪，返回JSON格式：
{
  "emotions": ["情绪1", "情绪2"],
  "primaryEmotion": "主要情绪",
  "intensity": "low/medium/high",
  "confidence": 0.85
}

文本：${text}

⚠️ 重要：这是心理剧功能，只识别明确表达的情绪！
- 如果文本只是描述事实或中性内容，返回空数组 []
- 只有明确表达负面情绪时才识别
- 避免把正常描述误判为情绪
- 用于心理剧场景生成，需要准确的情绪识别

请识别文本中明确表达的情绪，包括：
- 愤怒类：生气、愤怒、火大、不爽、气死
- 恐惧类：害怕、恐惧、担心、焦虑
- 孤独类：孤独、孤单、寂寞、想念、思念
- 悲伤类：失落、失望、沮丧、委屈、无助
- 渴望类：渴望、向往、期待
- 脆弱类：脆弱、无助、无奈、幻灭

只返回JSON，不要其他文字。`

    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        model: 'deepseek-chat',
        temperature: 0.2,
        max_tokens: 500
      })
    })

    if (!response.ok) {
      throw new Error('LLM情绪检测失败')
    }

    const data = await response.json()
    const aiResponse = data.choices?.[0]?.message?.content || data.response || data.message || ''

    // 尝试解析JSON响应
    try {
      const result = JSON.parse(aiResponse)
      return {
        emotions: result.emotions || [],
        primaryEmotion: result.primaryEmotion || '',
        intensity: result.intensity || 'medium',
        confidence: result.confidence || 0.5
      }
    } catch (parseError) {
      // 如果JSON解析失败，使用正则表达式作为备用方案
      console.warn('LLM响应无法解析为JSON，使用备用方案')
      return fallbackEmotionDetection(text)
    }

  } catch (error) {
    console.error('❌ LLM情绪检测失败:', error)
    // 使用备用方案
    return fallbackEmotionDetection(text)
  }
}

/**
 * 备用情绪检测方案（正则表达式）
 */
function fallbackEmotionDetection(text: string): EmotionDetectionResult {
  const emotionKeywords = text.match(/生气|很生气|气死|愤怒|火大|不爽|害怕|恐惧|孤独|孤单|想念|思念|渴望|脆弱|无助|失落|寂寞|失望|委屈|幻灭|沮丧|无奈/g) || []
  const uniqueEmotions = Array.from(new Set(emotionKeywords))
  
  return {
    emotions: uniqueEmotions,
    primaryEmotion: uniqueEmotions[0] || '',
    intensity: uniqueEmotions.length > 2 ? 'high' : uniqueEmotions.length > 0 ? 'medium' : 'low',
    confidence: uniqueEmotions.length > 0 ? 0.8 : 0.3
  }
}

/**
 * 将中文情绪转换为英文（用于图片生成）
 */
export function translateEmotionsToEnglish(emotions: string[]): string[] {
  const emotionMap: Record<string, string> = {
    '生气': 'anger', '很生气': 'strong anger', '气死': 'furious', '愤怒': 'rage', '火大': 'irritated', '不爽': 'upset',
    '害怕': 'fear', '恐惧': 'terror', '孤独': 'loneliness', '孤单': 'solitude',
    '想念': 'longing', '思念': 'missing', '渴望': 'yearning', '脆弱': 'vulnerability',
    '无助': 'helplessness', '失落': 'loss', '寂寞': 'loneliness',
    '失望': 'disappointment', '委屈': 'grievance', '幻灭': 'disillusionment',
    '沮丧': 'dejection', '无奈': 'helplessness'
  }
  
  return emotions.map(e => emotionMap[e] || e)
}
