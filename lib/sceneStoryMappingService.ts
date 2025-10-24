import { getUserMetadata, getUserInfo } from './userInfoService'

export interface SceneStoryMapping {
  sceneIndex: number
  sceneTitle: string
  storyFragment: string
  confidence: number
  keywords: string[]
}

export interface StoryMappingResult {
  mappings: SceneStoryMapping[]
  unmatchedStory: string[]
}

/**
 * 场景故事归属服务
 * 负责智能地将故事内容归属到对应的场景中
 */
export class SceneStoryMappingService {
  
  /**
   * 智能归属故事片段到场景
   */
  static async mapStoryToScenes(
    fullStory: string,
    scenes: Array<{ title: string; description: string; keywords: string[] }>
  ): Promise<StoryMappingResult> {
    console.log('🎯 [STORY-MAPPING] 开始智能故事场景归属')
    console.log('🎯 [STORY-MAPPING] 完整故事长度:', fullStory.length)
    console.log('🎯 [STORY-MAPPING] 场景数量:', scenes.length)

    try {
      // 从userDataApi获取用户信息
      const { getUserInfo, getUserMetadata } = await import('./userDataApi')
      const userInfo = await getUserInfo()
      const userMetadata = await getUserMetadata()
      
      const userLocation = userInfo?.location || '上海'

      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY || 'sk-e3911ff08dae4f4fb59c7b521e2a5415'}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `你是一个专业的故事场景归属分析专家。你的任务是将完整的故事内容智能地归属到对应的场景中。

**🚨🚨🚨 最高优先级：100%还原用户输入 + 纯粹叙述 🚨🚨🚨**

**绝对禁止的错误（死刑案例）**：
❌ 死刑1：场景中用户说[食物A]，故事中写[食物B]或过度装饰 → 篡改！
❌ 死刑2：场景中用户说[店名/菜系A]，故事中写[店名/菜系B] → 擅自改变！
❌ 死刑3：场景中用户说[地点A]，故事中写[地点B] → 虚构地点！
❌ 死刑4：故事中出现分析性语言（命理/MBTI/性格分析术语） → 这是分析！不是故事！
❌ 死刑5：场景中用户说的内容，故事中省略或改写 → 丢失信息！
❌ 死刑6：场景中用户说状态词，故事中不体现 → 忽视用户状态！

**100%还原规则（不可违反，基于场景中用户实际说的内容）**：
1. **食物名称**：场景中用户说的食物名称
   - ❌ 不能改成其他食物
   - ❌ 不能过度装饰添加豪华配料
   - ✅ 只能原样保留，最多加简单普通描述

2. **店名/品牌**：场景中用户说的店名必须100%原样保留
3. **地点**：场景中用户说的地点必须100%保留
4. **用户状态**：场景中用户说的状态必须在故事中体现

**纯粹叙述规则（故事不是分析报告！）**：
- ❌ 禁止："她命理中乙木日主需要金来修剪才能成材的特质"
- ❌ 禁止："这体现了她INTJ的性格特征"
- ❌ 禁止："根据她的星座分析"
- ✅ 正确："她喜欢独自思考"
- ✅ 正确："她细致地规划着每一步"

核心原则：
1. **语义匹配**：根据故事内容的语义和情节发展，将相关的故事片段归属到对应的场景
2. **关键词匹配**：识别故事中的关键地点、人物、事件，与场景描述进行匹配
3. **逻辑连贯**：确保故事归属符合时间顺序和逻辑发展
4. **地理准确性**：重点关注${userLocation}相关的地点描述
5. **人物一致性**：确保${userInfo?.age || 26}岁中国${userInfo?.gender === 'female' ? '女性' : '男性'}的角色描述一致
6. **用户输入准确性**：场景中用户说的具体名词（食物、地点、物品、店名）必须在故事中100%原样出现
7. **纯粹叙述**：只写故事，不写分析；只描述场景和感受，不解释元数据

分析要求：
- 仔细分析每个场景的标题、描述和关键词
- 识别故事中的关键事件、地点、人物、情感变化
- 将故事内容按场景进行智能归属
- 为每个归属给出置信度评分（0-1）
- 提取匹配的关键词

请返回JSON格式的结果。`
            },
            {
              role: 'user',
              content: `用户信息：
- 性别：${userInfo?.gender === 'female' ? '女性' : '男性'}
- 年龄：${userInfo?.age || 26}岁
- 身高：${userInfo?.height || '165'}cm
- 体重：${userInfo?.weight || '55'}kg
- 所在地：${userLocation}

用户元数据：
${JSON.stringify(userMetadata, null, 2)}

场景信息：
${scenes.map((scene, index) => `场景${index + 1}:
- 标题：${scene.title}
- 描述：${scene.description}
- 关键词：${scene.keywords.join(', ')}`).join('\n\n')}

完整故事：
${fullStory}

请将故事内容智能归属到对应的场景中。要求：
1. 分析故事中的关键事件、地点、人物、情感变化
2. 将相关的故事片段归属到对应的场景
3. 确保归属符合逻辑和时间顺序
4. 为每个归属给出置信度评分
5. 提取匹配的关键词
6. 如果有无法归属的故事片段，单独列出

请返回JSON格式：
{
  "mappings": [
    {
      "sceneIndex": 0,
      "sceneTitle": "场景标题",
      "storyFragment": "归属到该场景的故事片段",
      "confidence": 0.9,
      "keywords": ["关键词1", "关键词2"]
    }
  ],
  "unmatchedStory": ["无法归属的故事片段"]
}`
            }
          ],
          max_tokens: 3000,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        throw new Error(`DeepSeek API调用失败: ${response.status}`)
      }

      const data = await response.json()
      let content = data.choices[0].message.content.trim()

      console.log('🔍 [STORY-MAPPING] LLM原始响应:', content)

      // 清理JSON格式
      if (content.startsWith('```json') && content.endsWith('```')) {
        content = content.substring(7, content.length - 3).trim()
        console.log('🔍 [STORY-MAPPING] 清理后的JSON:', content)
      }

      const result: StoryMappingResult = JSON.parse(content)
      console.log('✅ [STORY-MAPPING] 智能归属完成:', result)
      console.log('✅ [STORY-MAPPING] 归属结果详情:')
      result.mappings.forEach((mapping, index) => {
        console.log(`📖 [MAPPING-${index + 1}] 场景${mapping.sceneIndex + 1}: ${mapping.sceneTitle}`)
        console.log(`📖 [MAPPING-${index + 1}] 置信度: ${(mapping.confidence * 100).toFixed(0)}%`)
        console.log(`📖 [MAPPING-${index + 1}] 关键词: ${mapping.keywords.join(', ')}`)
        console.log(`📖 [MAPPING-${index + 1}] 故事片段: ${mapping.storyFragment.substring(0, 100)}...`)
      })
      return result

    } catch (error) {
      console.error('💥 [STORY-MAPPING] 智能归属失败:', error)
      
      // 回退到简单的关键词匹配
      return this.fallbackKeywordMapping(fullStory, scenes)
    }
  }

  /**
   * 回退方案：基于关键词的简单匹配
   */
  private static fallbackKeywordMapping(
    fullStory: string,
    scenes: Array<{ title: string; description: string; keywords: string[] }>
  ): StoryMappingResult {
    console.log('🔄 [STORY-MAPPING] 使用关键词匹配回退方案')

    const mappings: SceneStoryMapping[] = []
    const unmatchedStory: string[] = []
    
    // 按段落分割故事，如果段落不足4个，按句子等分
    let paragraphs = fullStory.split('\n\n').filter(p => p.trim().length > 0)
    if (paragraphs.length < scenes.length) {
      paragraphs = this.splitStoryIntoEqualParts(fullStory, scenes.length)
    }
    
    console.log('🔍 [STORY-MAPPING] 分割后的段落数量:', paragraphs.length)
    paragraphs.forEach((paragraph, index) => {
      console.log(`📝 [PARAGRAPH-${index + 1}]: ${paragraph.substring(0, 50)}...`)
    })
    
    // 为每个段落找到最佳匹配的场景
    paragraphs.forEach((paragraph, paragraphIndex) => {
      let bestMatch = { sceneIndex: -1, score: 0, keywords: [] as string[] }
      
      // 计算与每个场景的匹配度
      scenes.forEach((scene, sceneIndex) => {
        const score = this.calculateMatchScore(paragraph, scene)
        if (score > bestMatch.score) {
          bestMatch = { sceneIndex, score, keywords: this.extractMatchingKeywords(paragraph, scene) }
        }
      })
      
      // 如果匹配度足够高，归属到对应场景
      if (bestMatch.score > 0.3) {
        mappings.push({
          sceneIndex: bestMatch.sceneIndex,
          sceneTitle: scenes[bestMatch.sceneIndex].title,
          storyFragment: paragraph,
          confidence: bestMatch.score,
          keywords: bestMatch.keywords
        })
      } else {
        unmatchedStory.push(paragraph)
      }
    })
    
    // 确保每个场景都有故事片段（即使匹配度较低）
    for (let i = 0; i < scenes.length; i++) {
      if (!mappings.find(m => m.sceneIndex === i)) {
        // 为每个场景分配不同的段落
        const paragraph = paragraphs[i] || 
                         paragraphs[Math.min(i, paragraphs.length - 1)] || 
                         this.splitStoryIntoEqualParts(fullStory, scenes.length)[i] || 
                         `这是场景${i + 1}对应的故事内容。`
        
        mappings.push({
          sceneIndex: i,
          sceneTitle: scenes[i].title,
          storyFragment: paragraph,
          confidence: 0.5,
          keywords: this.extractMatchingKeywords(paragraph, scenes[i])
        })
      }
    }
    
    console.log('✅ [STORY-MAPPING] 关键词匹配完成:', { mappings, unmatchedStory })
    return { mappings, unmatchedStory }
  }

  /**
   * 计算故事片段与场景的匹配度
   */
  private static calculateMatchScore(
    storyFragment: string,
    scene: { title: string; description: string; keywords: string[] }
  ): number {
    let score = 0
    const fragment = storyFragment.toLowerCase()
    
    // 标题匹配
    const titleKeywords = scene.title.toLowerCase().split(/[\s，,。！!？?；;]/)
    titleKeywords.forEach(keyword => {
      if (keyword.length > 1 && fragment.includes(keyword)) {
        score += 0.3
      }
    })
    
    // 描述匹配
    const descKeywords = scene.description.toLowerCase().split(/[\s，,。！!？?；;]/)
    descKeywords.forEach(keyword => {
      if (keyword.length > 1 && fragment.includes(keyword)) {
        score += 0.2
      }
    })
    
    // 关键词匹配
    scene.keywords.forEach(keyword => {
      if (fragment.includes(keyword.toLowerCase())) {
        score += 0.4
      }
    })
    
    return Math.min(score, 1.0)
  }

  /**
   * 提取匹配的关键词
   */
  private static extractMatchingKeywords(
    storyFragment: string,
    scene: { title: string; description: string; keywords: string[] }
  ): string[] {
    const matchingKeywords: string[] = []
    const fragment = storyFragment.toLowerCase()
    
    // 检查场景关键词
    scene.keywords.forEach(keyword => {
      if (fragment.includes(keyword.toLowerCase())) {
        matchingKeywords.push(keyword)
      }
    })
    
    // 检查标题关键词
    const titleKeywords = scene.title.toLowerCase().split(/[\s，,。！!？?；;]/)
    titleKeywords.forEach(keyword => {
      if (keyword.length > 1 && fragment.includes(keyword)) {
        matchingKeywords.push(keyword)
      }
    })
    
    return Array.from(new Set(matchingKeywords)) // 去重
  }

  /**
   * 将故事等分为指定数量的片段
   */
  private static splitStoryIntoEqualParts(fullStory: string, numParts: number): string[] {
    if (!fullStory || numParts <= 0) return []
    
    // 按句子分割
    const sentences = fullStory.split(/[。！？]/).filter(s => s.trim().length > 10)
    const sentencesPerPart = Math.ceil(sentences.length / numParts)
    const parts: string[] = []
    
    for (let i = 0; i < numParts; i++) {
      const startIndex = i * sentencesPerPart
      const endIndex = Math.min((i + 1) * sentencesPerPart, sentences.length)
      const partSentences = sentences.slice(startIndex, endIndex)
      parts.push(partSentences.join('。') + (partSentences.length > 0 ? '。' : ''))
    }
    
    return parts
  }

  /**
   * 根据场景数据生成故事归属
   */
  static async generateStoryMappingFromContentResult(
    contentResult: any
  ): Promise<StoryMappingResult> {
    console.log('🎯 [STORY-MAPPING] 从ContentResult生成故事归属')
    
    if (!contentResult?.story?.narrative || !contentResult?.scenes?.logicalScenes) {
      console.error('❌ [STORY-MAPPING] ContentResult缺少必要数据')
      return { mappings: [], unmatchedStory: [] }
    }

    const fullStory = contentResult.story.narrative
    const scenes = contentResult.scenes.logicalScenes.map((scene: any) => ({
      title: scene.title || `场景${scenes.indexOf(scene) + 1}`,
      description: scene.description || '',
      keywords: scene.keywords || []
    }))

    return await this.mapStoryToScenes(fullStory, scenes)
  }
}
