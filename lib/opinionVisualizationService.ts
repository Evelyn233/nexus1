/**
 * 观点可视化服务
 * 
 * 检测用户输入中的观点表达（如"熟人经济"、"形式主义"），
 * 并生成可视化场景，用真实人物和互动来呈现抽象观点。
 */

import { getUserInfo, getUserMetadata } from './userDataApi'

export interface OpinionScene {
  sceneIndex: number
  opinion: string
  opinionType: string
  visualizationApproach: string
  sceneDescription_CN: string
  sceneDescription_EN: string
  imagePrompt: string
  location: string
  peopleInvolved: string[]
  storyFragment: string
}

/**
 * 观点可视化服务
 */
export class OpinionVisualizationService {
  
  
  /**
   * 选择最重要的观点（基于LLM分析结果）
   */
  private static selectMostImportantOpinion(opinions: Array<{ type: string, text: string, trigger: string, priority: number, reason: string }>): { type: string, text: string, trigger: string, priority: number, reason: string } {
    if (!opinions || opinions.length === 0) {
      return { type: '价值判断', text: '默认观点', trigger: '默认触发', priority: 5, reason: '默认观点' }
    }
    
    if (opinions.length === 1) {
      return opinions[0]
    }
    
    // 按优先级排序（LLM已经分析过了）
    const sortedOpinions = opinions.sort((a, b) => b.priority - a.priority)
    
    console.log('🎯 [OPINION] 观点优先级排序:', sortedOpinions.map(o => `${o.type}: ${o.text} (分数: ${o.priority}) - ${o.reason}`))
    
    return sortedOpinions[0]
  }

  /**
   * 去重观点（只去除文本相似的，保留语义不同的观点）
   */
  private static deduplicateOpinions(opinions: Array<{ type: string, text: string, trigger: string, priority: number, reason: string }>): Array<{ type: string, text: string, trigger: string, priority: number, reason: string }> {
    if (!opinions || opinions.length <= 1) {
      return opinions
    }
    
    const uniqueOpinions: Array<{ type: string, text: string, trigger: string, priority: number, reason: string }> = []
    const seenTexts = new Set<string>() // 🔥 记录已见过的观点文本（精确去重）
    
    for (const opinion of opinions) {
      // 🔥 第一层去重：精确文本匹配
      const normalizedText = opinion.text.toLowerCase().trim()
      if (seenTexts.has(normalizedText)) {
        console.log(`🔄 [OPINION] 跳过完全相同的观点: "${opinion.text}"`)
        continue
      }
      
      // 🔥 第二层去重：相似度检测
      const isSimilar = uniqueOpinions.some(existing => {
        const similarity = this.calculateSimilarity(opinion.text, existing.text)
        return similarity > 0.6 // 60%相似度阈值（更严格，从50%提升到60%）
      })
      
      if (!isSimilar) {
        uniqueOpinions.push(opinion)
        seenTexts.add(normalizedText) // 记录该观点
        console.log(`✅ [OPINION] 添加唯一观点: "${opinion.text}" (优先级: ${opinion.priority})`)
      } else {
        console.log(`🔄 [OPINION] 跳过相似观点: "${opinion.text}" (与已有观点相似)`)
      }
    }
    
    console.log(`✅ [OPINION] 观点去重完成: ${opinions.length} → ${uniqueOpinions.length}`)
    console.log(`📋 [OPINION] 保留的观点:`, uniqueOpinions.map(o => o.text))
    return uniqueOpinions
  }

  /**
   * 计算两个观点的相似度
   */
  private static calculateSimilarity(text1: string, text2: string): number {
    // 移除分数信息
    const cleanText1 = text1.replace(/\s*\(\d+分\)\s*$/, '').trim()
    const cleanText2 = text2.replace(/\s*\(\d+分\)\s*$/, '').trim()
    
    // 如果完全一样，返回1
    if (cleanText1 === cleanText2) {
      return 1
    }
    
    // 检查是否包含相同的关键词
    const keywords1 = cleanText1.toLowerCase().split(/[\s，。！？、]+/).filter(w => w.length > 1)
    const keywords2 = cleanText2.toLowerCase().split(/[\s，。！？、]+/).filter(w => w.length > 1)
    
    const set1 = new Set(keywords1)
    const set2 = new Set(keywords2)
    
    const intersection = new Set(Array.from(set1).filter(x => set2.has(x)))
    const union = new Set([...Array.from(set1), ...Array.from(set2)])
    
    // 计算Jaccard相似度
    const jaccardSimilarity = intersection.size / union.size
    
    // 检查是否包含相同的核心概念（使用简化的关键词匹配）
    const conceptKeywords1 = this.extractSimpleConcepts(cleanText1)
    const conceptKeywords2 = this.extractSimpleConcepts(cleanText2)
    const conceptOverlap = conceptKeywords1.filter(c => conceptKeywords2.includes(c)).length
    const conceptSimilarity = conceptOverlap / Math.max(conceptKeywords1.length, conceptKeywords2.length, 1)
    
    // 返回较高的相似度
    return Math.max(jaccardSimilarity, conceptSimilarity)
  }

  /**
   * 简化的概念提取（同步方法）
   */
  private static extractSimpleConcepts(text: string): string[] {
    const concepts: string[] = []
    
    // 提取关键概念（简化版）
    if (text.includes('中国') && text.includes('杂志')) {
      concepts.push('中国杂志')
    }
    if (text.includes('高端') || text.includes('智性')) {
      concepts.push('高端杂志')
    }
    if (text.includes('没有') || text.includes('缺乏')) {
      concepts.push('市场缺失')
    }
    if (text.includes('惋惜') || text.includes('愤怒')) {
      concepts.push('情感反应')
    }
    if (text.includes('Neoma') || text.includes('neoma')) {
      concepts.push('Neoma')
    }
    
    return concepts
  }

  /**
   * 使用LLM提取核心概念
   */
  private static async extractCoreConcepts(text: string): Promise<string[]> {
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `你是概念提取专家。任务：从用户观点中提取核心概念。

**要求：**
1. 只提取1-3个最重要的核心概念
2. 概念要简洁明确（2-4个字）
3. 避免重复和冗余

**示例：**
- "中国缺乏高端杂志市场" → ["中国杂志市场", "高端杂志"]
- "Neoma杂志做得特别好" → ["Neoma杂志", "杂志质量"]
- "很惋惜愤怒" → ["情感反应"]

返回JSON格式：
{
  "concepts": ["概念1", "概念2", "概念3"]
}

只返回JSON，不要其他文字！`
            },
            {
              role: 'user',
              content: `用户观点：${text}`
            }
          ],
          temperature: 0.3,
          max_tokens: 200
        })
      })

      if (!response.ok) {
        return []
      }

      const data = await response.json()
      let content = data.choices[0].message.content.trim()
      
      // 清理JSON
      if (content.includes('```json')) {
        content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      }
      
      const result = JSON.parse(content)
      return result.concepts || []
    } catch (error) {
      console.warn('⚠️ [OPINION] 概念提取失败:', error)
      return []
    }
  }
  
  /**
   * 检测用户输入中的观点表达
   */
  private static async detectOpinions(
    initialPrompt: string,
    answers: string[]
  ): Promise<{ hasOpinion: boolean, opinions: Array<{ type: string, text: string, trigger: string, priority: number, reason: string }> }> {
    console.log('🔍 [OPINION] 开始观点检测')
    
    // 🔄 本次完整对话（所有输入同等对待）
    const allInputs = [initialPrompt, ...answers].filter(input => input && input.trim())
    
    console.log('🔄 [OPINION] 本次完整对话（所有输入）:', allInputs)
    
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `你是观点检测专家。任务：从用户输入中识别**独立完整的观点**，每个观点必须能独立成图。

**🎯 核心原则：识别所有独立的观点，无论出现在第几轮！**

**✅ 独立观点的判断标准（必须同时满足）：**
1. **能独立成图** - 这个观点能否独立生成一张有意义的图？
2. **有完整意义** - 单独看这句话，是否表达了完整的观点？
3. **不是情绪词** - 不是简单的"很开心"、"有点难过"
4. **不是补充细节** - 不是对已有观点的进一步说明

**📊 示例分析：**

**场景1：一个核心观点 + 补充说明**
- 第1轮："亲密关系太难" → ✅ 独立观点
- 追问："为什么觉得难？"
- 第2轮："心智不成熟" → ❌ 补充说明（在解释"为什么难"）
- 追问："还有什么原因？"
- 第3轮："沟通有障碍" → ❌ 补充说明（还是在解释"为什么难"）

**场景2：多个独立观点**
- 第1轮："看了综艺《再见爱人》，觉得亲密关系太难" → ✅ 观点1："亲密关系难"
- 追问："你从中有什么感受？"
- 第2轮："看到他们的互动，我觉得中国的婚姻观念很传统" → ✅ 观点2："婚姻观念传统"（这是新观点！）
- 追问："你怎么看待这种传统？"
- 第3轮："觉得这种传统限制了个人自由" → ✅ 观点3："传统限制自由"（又是新观点！）

**🚨 关键区别：**
- 补充说明 = 对同一个话题的**原因/细节/例子**
- 独立观点 = **不同的话题/不同的评价对象/不同的观点角度**

**观点类型：**
1. **社会现象评论**（如"熟人经济"、"形式主义"、"表面功夫"）
2. **价值判断**（如"其实很虚伪"、"本质是XX"、"就是XX"）
3. **文化批判**（如"传统vs现代"、"理想vs现实"）
4. **情感核心观点**（如"我很孤独"、"感到被抛弃"）- 注意：不是简单情绪词！

**⚠️ 不识别为观点的内容：**
- 简单情绪词（"很开心"、"有点难过"）
- 具体行为（"用chatgpt搜到的"、"上班的时候"）
- 场景描述（"就是在公司"、"在书店"）
- 发现过程（"第一次看到"、"发现了"）
- **补充说明**（对已有观点的细节描述）

**优先级评分（1-10分）：**
- 10分：社会现象评论、深度文化批判
- 9分：价值判断、核心情感观点
- 6-7分：个人偏好表达
- 4-5分：简单评价
- 1-3分：补充说明、细节描述

**🔥 重要指令：**
- 仔细分析每一轮输入，判断是独立观点还是补充说明
- 如果是补充说明（解释原因/细节/例子） → 不返回
- 如果是独立观点（新话题/新角度/新评价对象） → 返回
- 每个观点必须能独立生成一张有意义的图
- 优先级高的观点（8-10分）才返回，低优先级的跳过

返回JSON：
{
  "hasOpinion": boolean,
  "opinions": [
    {
      "type": "社会现象评论/价值判断/情感核心观点/文化批判",
      "text": "观点的简短概括（5-10字）",
      "trigger": "用户原文中触发观点的句子",
      "priority": 8,
      "reason": "分析原因",
      "visualConcept": "这个观点应该用什么独特的视觉概念来表达（20字以内）"
    }
  ]
}

**⚠️ 每个观点必须包含visualConcept字段，用于指导图片生成的差异化！**`
            },
            {
              role: 'user',
              content: `用户输入：\n${allInputs.map((input, i) => `${i + 1}. ${input}`).join('\n')}`
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      })

      if (!response.ok) {
        throw new Error(`API调用失败: ${response.status}`)
      }

      const data = await response.json()
      let content = data.choices[0].message.content.trim()
      
      console.log('🔍 [OPINION] LLM原始响应:', content.substring(0, 200) + '...')
      
      // 清理markdown代码块
      if (content.includes('```json')) {
        content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      } else if (content.includes('```')) {
        content = content.replace(/```/g, '').trim()
      }
      
      // 清理可能的中文标点
      content = content.replace(/，/g, ',').replace(/：/g, ':').replace(/"/g, '"').replace(/"/g, '"')
      
      console.log('🔍 [OPINION] 清理后的内容:', content.substring(0, 200) + '...')
      
      // 尝试找到JSON部分
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        content = jsonMatch[0]
        console.log('🔍 [OPINION] 提取的JSON部分:', content.substring(0, 200) + '...')
      }
      
      // 尝试修复常见的JSON格式问题
      try {
        const analysis = JSON.parse(content)
        console.log('✅ [OPINION] 观点检测完成:', analysis)
        return analysis
      } catch (parseError) {
        console.warn('⚠️ [OPINION] 第一次JSON解析失败，尝试修复...')
        
        // 尝试修复常见的JSON问题
        let fixedContent = content
          .replace(/,(\s*[}\]])/g, '$1') // 移除多余的逗号
          .replace(/([{\[,])\s*([}\]])/g, '$1$2') // 移除空值
          .replace(/(\w+):/g, '"$1":') // 确保键被引号包围
          .replace(/'/g, '"') // 替换单引号为双引号
        
        console.log('🔧 [OPINION] 修复后的内容:', fixedContent.substring(0, 200) + '...')
        
        const analysis = JSON.parse(fixedContent)
        console.log('✅ [OPINION] 观点检测完成（修复后）:', analysis)
        return analysis
      }
      
    } catch (error) {
      console.error('❌ [OPINION] 观点检测失败:', error)
      if (error instanceof SyntaxError) {
        console.error('❌ [OPINION] JSON解析错误，错误位置:', error.message)
      }
      return { hasOpinion: false, opinions: [] }
    }
  }
  
  /**
   * 生成现实场景（写实风格）
   */
  private static async generateRealityScene(
    opinion: { type: string, text: string, trigger: string },
    initialPrompt: string,
    answers: string[],
    userInfo: any,
    userMetadata: any
  ): Promise<OpinionScene | null> {
    console.log('📸 [REALITY] 开始生成现实场景')
    console.log('📌 [REALITY] 观点类型:', opinion.type)
    console.log('📌 [REALITY] 观点内容:', opinion.text)
    
    // 🔄 本次完整对话
    const allInputs = [initialPrompt, ...answers].filter(input => input && input.trim())
    
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `你是现实场景生成专家。任务：将用户的观点转化为真实的现实场景。

**🎯 核心原则（现实场景使用写实风格）：**
1. **📸 使用写实照片风格**：现实场景必须是写实照片风格，不是插画
2. **必须有人物**：现实场景必须包含真实人物，展现真实生活场景
3. **真实环境**：真实的办公环境、书店、咖啡厅等
4. **🚨 不要插画风格！**：illustration, vector art, flat design

**🚨🚨🚨 死刑规则：**
- ❌ "中国缺乏高端杂志市场" → illustration style → 死刑！
- ✅ "中国缺乏高端杂志市场" → realistic photo of bookstore, people browsing magazines, real bookstore environment
- ❌ "熟人经济" → vector art illustration → 死刑！
- ✅ "熟人经济" → realistic photo of people networking, business meeting, real office environment

**现实场景生成策略：**

**1. 社会现象（如"中国缺乏高端杂志市场"）：**
→ 生成：写实照片风格，真实书店场景
→ 示例："中国缺乏高端杂志市场" = realistic photo of bookstore, people browsing magazines, real bookstore environment, customers looking at magazine racks

**2. 价值判断（如"赞赏杂志的智性水平"）：**
→ 生成：写实照片风格，真实阅读场景
→ 示例："智性水平" = realistic photo of person reading magazine, real reading environment, natural lighting

**用户信息：**
- 年龄：${userInfo.age || 26}岁
- 性别：${userInfo.gender === 'female' ? '女性' : '男性'}
- 身高：${userInfo.height || 165}cm
- 发型：${userInfo.hairLength || '长发'}

**用户输入：**
${allInputs.map((input, i) => `${i + 1}. ${input}`).join('\n')}

**观点类型：** ${opinion.type}
**观点内容：** ${opinion.text}
**触发句子：** ${opinion.trigger}

**生成要求（写实风格）：**
1. 场景必须是写实照片风格，必须包含真实人物
2. 用真实人物和真实环境来体现观点
3. **🚨 不要插画风格！**使用写实照片风格
4. 使用真实环境，realistic photography
5. imagePrompt必须详细描述写实风格、真实人物、真实环境、真实物品
6. 采用写实视角，像真实照片一样呈现

返回JSON：
{
  "opinion": "${opinion.text}",
  "opinionType": "${opinion.type}",
  "visualizationApproach": "可视化策略（1-2句话）",
  "sceneDescription_CN": "中文场景描述（详细）",
  "sceneDescription_EN": "English scene description (detailed)",
  "imagePrompt": "🚨 REALISTIC PHOTOGRAPHY STYLE! Realistic photo, natural lighting, real environment. MUST include: REAL PEOPLE in the scene, REALISTIC SETTING that represents the opinion/phenomenon, natural lighting, realistic objects, real environment. NOT illustration, NOT vector art, NOT flat design. Focus on realistic people and realistic environment that embodies the opinion/phenomenon. --ar 16:9",
  "location": "真实场景（如：Real Bookstore, Real Office, Real Coffee Shop）",
  "peopleInvolved": ["真实人物1", "真实人物2", "真实物品1"],
  "storyFragment": "写实描述（100-150字，描述真实场景中的人物、环境和物品，体现观点）"
}

只返回JSON，不要其他文字！`
            }
          ],
          temperature: 0.8,
          max_tokens: 2000
        })
      })

      if (!response.ok) {
        throw new Error(`API调用失败: ${response.status}`)
      }

      const data = await response.json()
      let content = data.choices[0].message.content.trim()
      
      console.log('🔍 [REALITY] LLM原始响应:', content.substring(0, 200) + '...')
      
      // 清理markdown代码块
      if (content.includes('```json')) {
        content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      } else if (content.includes('```')) {
        content = content.replace(/```/g, '').trim()
      }
      
      // 清理可能的中文标点
      content = content.replace(/，/g, ',').replace(/：/g, ':').replace(/"/g, '"').replace(/"/g, '"')
      
      console.log('🔍 [REALITY] 清理后的内容:', content.substring(0, 200) + '...')
      
      // 尝试找到JSON部分
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        content = jsonMatch[0]
        console.log('🔍 [REALITY] 提取的JSON部分:', content.substring(0, 200) + '...')
      }
      
      // 尝试修复常见的JSON格式问题
      try {
        const scene = JSON.parse(content)
        console.log('✅ [REALITY] 现实场景生成完成:', scene)
        return scene
      } catch (parseError) {
        console.error('❌ [REALITY] JSON解析失败:', parseError)
        console.log('📄 [REALITY] 原始内容:', content)
        return null
      }
    } catch (error) {
      console.error('❌ [REALITY] 生成现实场景失败:', error)
      return null
    }
  }

  /**
   * 生成观点可视化场景
   */
  private static async generateOpinionScene(
    opinion: { type: string, text: string, trigger: string },
    initialPrompt: string,
    answers: string[],
    userInfo: any,
    userMetadata: any
  ): Promise<OpinionScene | null> {
    console.log('🎨 [OPINION] 开始生成观点可视化场景')
    console.log('📌 [OPINION] 观点类型:', opinion.type)
    console.log('📌 [OPINION] 观点内容:', opinion.text)
    
    // 🔄 本次完整对话
    const allInputs = [initialPrompt, ...answers].filter(input => input && input.trim())
    
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `你是观点可视化专家。任务：将用户的抽象观点转化为高质量、有诗意的视觉场景。

**🎯 核心原则（高质量Editorial illustration风格）：**
1. **🎨 使用高质量杂志Editorial illustration风格（不引用品牌）**：高质量、有诗意的杂志插图风格
2. **象征性场景**：用象征性、概念性的场景来体现观点，而不是直接描述
3. **诗意表达**：场景要有诗意、有深度、有思考性
4. **高质量设计**：一线杂志插图品质（不引用具体品牌）

**🎨 高质量Editorial illustration风格要求：**
- High-quality editorial illustration style
- Conceptual, symbolic, and poetic
- Minimalist composition with intelligent mood
- Muted pastel tones, painterly texture
- Sophisticated and thoughtful visual metaphors

**🚨🚨🚨 强制要求：观点场景必须使用Editorial Illustration风格！🚨🚨🚨**
- ✅ **必须使用**：High-quality editorial illustration style
- ✅ **风格要求**：高质量杂志插图风格（不引用具体品牌）
- ✅ **必须包含**：精准象征物、诗意表达、概念性视觉隐喻
- ❌ **禁止使用**：realistic photo / photorealistic / documentary style
- ❌ **禁止使用**：写实照片风格
- ❌ **禁止使用**：general illustration / simple illustration（必须明确是editorial illustration）

**🔥🔥🔥 Editorial Illustration风格要求（核心！）：**
- **风格关键词**：High-quality editorial illustration style
- **视觉特征**：conceptual, symbolic, poetic, minimalist composition, intelligent mood
- **色彩特征**：muted pastel tones, painterly texture, sophisticated color palette
- **象征物**：精准象征物（如：论文工厂用 conveyor belts, papers, academic journals 等）

**观点类型与高质量可视化策略：**

**1. 社会现象（如"中国缺乏高端杂志市场"）：**
→ 生成：象征性场景，用隐喻表达社会现象
→ 示例："中国缺乏高端杂志市场" = High-quality editorial illustration, conceptual scene of a small isolated island shaped like an open magazine, surrounded by a vast turbulent ocean made of data, social media icons, and message bubbles; the island glows softly under sunlight, symbolizing intellectual solitude and refinement in a chaotic digital age; minimalist composition, muted pastel tones, painterly texture, intelligent and poetic mood

**2. 价值判断（如"赞赏杂志的智性水平"）：**
→ 生成：象征性场景，用隐喻表达价值判断
→ 示例："智性水平" = High-quality editorial illustration, conceptual scene of a lighthouse made of stacked books, casting beams of light through fog of information overload, symbolizing intellectual guidance; minimalist composition, muted pastel tones, painterly texture, intelligent and poetic mood

**3. 文化批判（如"传统vs现代"）：**
→ 生成：象征性场景，用隐喻表达文化冲突
→ 示例："传统vs现代" = High-quality editorial illustration, conceptual scene of two trees - one ancient and gnarled, one sleek and digital - their branches intertwining in a dance of conflict and harmony; minimalist composition, muted pastel tones, painterly texture, intelligent and poetic mood

**4. 情感表达（如"很惋惜愤怒"）：**
→ 生成：象征性场景，用隐喻表达情感
→ 示例："很惋惜愤怒" = High-quality editorial illustration, conceptual scene of a beautiful flower wilting in a storm of digital noise and superficial content, symbolizing the loss of authentic beauty; minimalist composition, muted pastel tones, painterly texture, intelligent and poetic mood

**用户信息：**
- 年龄：${userInfo.age || 26}岁
- 性别：${userInfo.gender === 'female' ? '女性' : '男性'}
- 身高：${userInfo.height || 165}cm
- 发型：${userInfo.hairLength || '长发'}

**用户输入：**
${allInputs.map((input, i) => `${i + 1}. ${input}`).join('\n')}

**观点类型：** ${opinion.type}
**观点内容：** ${opinion.text}
**触发句子：** ${opinion.trigger}

**🎯🎯🎯 核心原则：观点场景的主角识别！🎯🎯🎯**

**关键规则：观点场景的主角应该是观点涉及的对象，不是用户！**

**示例分析：**
- 用户观点："学生们都只关心论文" → **主角=学生们**（展现学生们只关心论文的现象）
- 用户观点："老板虚伪" → **主角=老板**（展现老板的虚伪）
- 用户观点："学术体系过于结构化" → **主角=学术环境中的学生/研究者**（展现体系化现象）

**⚠️ 重要：观点场景中用户是观察者，不是主角！**
- 观点场景应该展现观点涉及的社会现象或群体
- 用户可能在画面中作为观察者（次要位置），但主角是观点涉及的群体/现象

**生成要求（必须使用Editorial Illustration风格！）：**
1. **🚨🚨🚨 强制要求：所有观点场景都必须使用Editorial Illustration风格！🚨🚨🚨**
   - 无论是具体群体还是抽象概念，都必须用Editorial Illustration风格
   - 不要用写实照片风格！
   - 使用 高质量 editorial illustration 风格（不引用具体品牌）
   
2. **主角设置（Illustration风格中的象征化主角）**：
   - 观点涉及的具体人物/群体 → 象征化主角（如：学生们 → PAPER-COVERED FIGURE, PUBLICATION ROBOT）
   - 用象征性视觉元素表达观点（如：论文工厂 = conveyor belts, papers, academic journals）
   - 用户 → 观察者（如果有出现，在次要位置或作为观察者）
   
3. **场景描述要求（Illustration风格）**：
   - 描述象征性场景（如：论文工厂、学术机器、论文流水线）
   - 展现观点的核心现象（如：只关心论文 = 象征化为论文工厂、学术机器）
   - 用精准象征物表达观点（如：conveyor belts, papers, academic journals, PAPER-COVERED FIGURE, PUBLICATION ROBOT）
   
**4. **imagePrompt要求（必须使用Editorial Illustration风格！）**：
   - 🚨🚨🚨 **强制要求：观点场景必须使用Editorial Illustration风格！**
   - ✅ **必须使用**：High-quality editorial illustration style
   - ✅ **必须包含**：精准象征物、诗意表达、概念性视觉隐喻
   - ❌ **禁止使用**：realistic photo / photorealistic / documentary style
   - ❌ **禁止使用**：写实照片风格
   - ❌ **禁止使用**：general illustration / simple illustration（必须明确是editorial illustration）

**🔥🔥🔥 Editorial Illustration风格要求（核心！）：**
- **风格关键词**：High-quality editorial illustration style
- **视觉特征**：conceptual, symbolic, poetic, minimalist composition, intelligent mood
- **色彩特征**：muted pastel tones, painterly texture, sophisticated color palette
- **象征物**：精准象征物（如：论文工厂用 conveyor belts, papers, academic journals 等）

**🎨 隐喻风格要求（极其重要！必须紧密结合用户观点）：**

**核心原则：隐喻必须服务于用户的具体观点，灵活选择最合适的表现方式！**

- ✅ **根据观点内容选择隐喻方式**：
  * 涉及"道德/纯粹/坚守" → 用诗意象征（如：水晶灯塔、金色光芒、透明的孤独）
  * 涉及"异化/机械/系统" → 可以用科幻/工业隐喻（如：人变机器、论文工厂、数字化）
  * 涉及"压抑/束缚/窒息" → 用象征物隐喻（如：被束缚的火花、破碎的天平）
  * 涉及"批判/愤怒/反抗" → 用戏剧化隐喻（如：风暴、撕裂、对峙）

- ❌ **禁止模板化/硬编码**：
  * 不要每次都用相同的描述（如：总是"皮肤覆盖公式、眼睛闪光、手臂金属"）
  * 不要照搬示例，要根据具体观点创新
  * 每个观点都应该有独特的隐喻方式

- ✅ **风格灵活性**：
  * 科幻风、诗意风、抽象风、具象风都可以
  * 关键是：必须紧密结合用户观点的核心含义
  * 隐喻要精准、有力、独特

**隐喻选择指南（灵活运用，不要照搬）：**
- 观点核心="道德坚守" → 诗意象征：水晶灯塔、金色光芒、透明的纯粹
- 观点核心="学术异化" → 科幻隐喻：人变论文机器、机械化生产、数字化存在
- 观点核心="创造力压抑" → 象征物：被束缚的火花、灰色的空间、窒息的氛围
- 观点核心="道德沦丧" → 戏剧化：破碎的天平、崩塌的柱石、黑暗吞噬光明

**记住：每个观点都要有独特的隐喻，不要重复！分析观点核心含义后再选择最贴切的表现方式！**

返回JSON：
{
  "opinion": "${opinion.text}",
  "opinionType": "${opinion.type}",
  "visualizationApproach": "可视化策略（1-2句话）",
  "sceneDescription_CN": "中文场景描述（详细描述主角群体的行为，展现观点现象）",
  "sceneDescription_EN": "English scene description (detailed description of main characters' behaviors, showing the opinion phenomenon)",
  "imagePrompt": "🚨🚨🚨 MANDATORY EDITORIAL ILLUSTRATION STYLE! High-quality editorial illustration style. Conceptual scene of [具体的象征性场景描述，体现观点核心], symbolizing [观点含义]; symbolic elements: [精准象征物列表]; minimalist composition, muted pastel tones, painterly texture, intelligent and poetic mood, sophisticated visual metaphors. 🚨 IF user is included as observer: must describe as '${userInfo.age || 26}-year-old Chinese ${userInfo.gender}, ${userInfo.height || 165}cm, ${userInfo.hairLength || 'long hair'}'. NOT realistic photo, NOT photorealistic, NOT documentary style, NOT general illustration. --ar 16:9",
  "location": "场景地点（如：Academic Environment, Library, Classroom）",
  "peopleInvolved": ["主角群体1", "主角群体2", "如果有用户则作为观察者"],
  "storyFragment": "观点叙事（100-150字，描述观点涉及的社会现象、群体行为、深层思考，体现观点的社会意义和人文价值）"
}

只返回JSON，不要其他文字！`
            }
          ],
          temperature: 0.8,
          max_tokens: 2000
        })
      })

      console.log('✅ [OPINION] API响应收到')
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ [OPINION] API调用失败:', response.status, errorText)
        throw new Error(`API调用失败: ${response.status}`)
      }

      const data = await response.json()
      let content = data.choices[0].message.content.trim()
      
      // 清理markdown代码块
      if (content.includes('```json')) {
        content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      } else if (content.includes('```')) {
        content = content.replace(/```/g, '').trim()
      }
      
      // 清理中文标点
      content = content.replace(/，/g, ',').replace(/：/g, ':').replace(/"/g, '"').replace(/"/g, '"')
      
      const scene = JSON.parse(content)
      
      if (!scene.imagePrompt) {
        console.error('❌ [OPINION] 缺少imagePrompt字段')
        throw new Error('缺少imagePrompt字段')
      }
      
      console.log('✅ [OPINION] 观点可视化场景生成完成')
      console.log('🎨 [OPINION] 观点:', scene.opinion)
      console.log('🔍 [OPINION] 完整场景对象:', scene)
      
      // 🔥 验证关键字段
      if (!scene.opinion) {
        console.error('❌ [OPINION] 场景缺少opinion字段')
        console.error('🔍 [OPINION] 可用字段:', Object.keys(scene))
      }
      if (!scene.imagePrompt) {
        console.error('❌ [OPINION] 场景缺少imagePrompt字段')
      }
      
      return scene
      
    } catch (error) {
      console.error('❌ [OPINION] 生成观点场景失败:', error)
      return null
    }
  }
  
  /**
   * 主函数：检测观点并生成可视化场景，插入到scenes中
   */
  static async enhanceSceneWithOpinion(
    scenes: any,
    initialPrompt: string,
    answers: string[]
  ): Promise<any | null> {
    console.log('🎨 [OPINION] 开始检测并生成观点可视化场景...')
    
    // 第一步：检测观点
    const opinionResult = await this.detectOpinions(initialPrompt, answers)
    if (!opinionResult.hasOpinion || opinionResult.opinions.length === 0) {
      console.log('ℹ️ [OPINION] 未检测到观点表达，跳过观点场景生成')
      return null
    }
    
    console.log(`✅ [OPINION] 检测到${opinionResult.opinions.length}个观点`)
    
    // 获取用户信息
    const userInfo = await getUserInfo()
    const userMetadata = await getUserMetadata()
    
    const logicalScenes = [...scenes.logicalScenes]
    const newLogicalScenes: any[] = []
    let opinionScenesAdded = 0
    
    // 第二步：为每个观点生成可视化场景
    // 策略：🔥 找到体现观点的真实场景，在那个场景后插入观点场景
    
    // 生成所有高优先级观点场景（大于等于7分）
    const highPriorityOpinions = opinionResult.opinions.filter(opinion => opinion.priority >= 7)
    
    if (highPriorityOpinions.length === 0) {
      // 如果没有高优先级观点，选择最高分的观点
      const primaryOpinion = this.selectMostImportantOpinion(opinionResult.opinions)
      console.log(`🎨 [OPINION] 没有高优先级观点，选择最高分观点"${primaryOpinion.text}"`)
      highPriorityOpinions.push(primaryOpinion)
    }
    
    console.log(`🎨 [OPINION] 将为${highPriorityOpinions.length}个高优先级观点生成可视化场景:`, highPriorityOpinions.map(o => `${o?.text || 'undefined'} (${o?.priority || 0}分)`))
    
    // 验证观点对象结构
    const validOpinions = []
    for (const opinion of highPriorityOpinions) {
      if (!opinion || typeof opinion !== 'object') {
        console.error('❌ [OPINION] 观点对象不是有效对象:', opinion)
        continue
      }
      
      if (!opinion.text || typeof opinion.text !== 'string') {
        console.error('❌ [OPINION] 观点对象缺少text字段或不是字符串:', opinion)
        continue
      }
      
      if (typeof opinion.priority !== 'number') {
        console.error('❌ [OPINION] 观点对象缺少priority字段或不是数字:', opinion)
        continue
      }
      
      console.log(`✅ [OPINION] 观点对象验证通过: ${opinion.text} (${opinion.priority}分)`)
      validOpinions.push(opinion)
    }
    
    // 使用验证后的观点列表
    const finalOpinions = validOpinions.length > 0 ? validOpinions : highPriorityOpinions
    
    // 去重观点（合并相似观点）
    const uniqueOpinions = this.deduplicateOpinions(finalOpinions)
    console.log(`🎯 [OPINION] 去重后观点数量: ${uniqueOpinions.length}`)
    
    // 为每个去重后的观点生成场景
    for (const opinion of uniqueOpinions) {
      // 检查观点对象是否有效
      if (!opinion || !opinion.text) {
        console.error('❌ [OPINION] 观点对象无效:', opinion)
        continue
      }
      
      console.log(`🎨 [OPINION] 为观点"${opinion.text}"生成可视化场景`)
    
    // 🔍 智能识别哪个场景体现了这个观点
    let relatedSceneIndex = -1
      const opinionKeywords = opinion.text.toLowerCase()
    
    for (let i = 0; i < logicalScenes.length; i++) {
      const scene = logicalScenes[i]
      const sceneText = (scene.title + ' ' + scene.description + ' ' + (scene.description_zh || '')).toLowerCase()
      
      // 检查场景标题是否包含 "reality"、"discovered"、"actual"、"真相"、"实际"、"发现"、"后来"
      const isRealityScene = scene.title?.toLowerCase().includes('reality') ||
                             scene.title?.toLowerCase().includes('discovered') ||
                             scene.title?.toLowerCase().includes('actual') ||
                             scene.title?.includes('真相') ||
                             scene.title?.includes('实际') ||
                             scene.title?.includes('发现') ||
                             scene.title?.includes('后来')
      
      // 检查场景内容是否体现了这个观点
      const isRelated = sceneText.includes(opinionKeywords) ||
                          (opinion.trigger && sceneText.includes(opinion.trigger.toLowerCase()))
      
      // 优先选择 reality/发现真相 类型的场景
      if (isRealityScene && isRelated) {
        relatedSceneIndex = i
        console.log(`🎯 [OPINION] 找到体现观点的场景: Scene ${i + 1} - ${scene.title}`)
        break
      } else if (isRelated && relatedSceneIndex === -1) {
        relatedSceneIndex = i
      }
    }
    
    // 如果没找到相关场景，默认放在最后一个基础场景后（心理剧前）
    if (relatedSceneIndex === -1) {
      relatedSceneIndex = logicalScenes.length - 1
      console.log(`⚠️ [OPINION] 未找到明确体现观点的场景，将观点场景放在最后一个基础场景后`)
    }
    
    // 只生成观点场景（插画风格），不生成现实场景避免重复
    const opinionScene = await this.generateOpinionScene(
        opinion,
      initialPrompt,
      answers,
      userInfo,
      userMetadata
    )
    
    // 不生成现实场景，避免与基础场景重复
    const realityScene = null
    
    if (opinionScene) {
      // 🔥 验证观点场景的关键字段
      console.log('🔍 [OPINION] 观点场景字段验证:')
      console.log('📝 opinion:', opinionScene.opinion)
      console.log('🎨 imagePrompt:', opinionScene.imagePrompt ? '存在' : '缺失')
      console.log('📍 location:', opinionScene.location)
      console.log('📖 storyFragment:', opinionScene.storyFragment ? '存在' : '缺失')
      
      if (!opinionScene.opinion) {
        console.error('❌ [OPINION] 观点场景缺少opinion字段，使用默认值')
        opinionScene.opinion = '未知观点'
      }
      
      const opinionSceneData = {
        title: `观点：${opinionScene.opinion}`,
        mainCharacter: 'phenomenon', // 观点场景是现象呈现，没有主角
        description: opinionScene.sceneDescription_EN,
        description_zh: opinionScene.sceneDescription_CN,
        location: opinionScene.location,
        age: null, // 观点场景没有用户，不需要年龄
        height: null,
        hairLength: null,
        peopleCount: `${opinionScene.peopleInvolved?.length || 0} people demonstrating the phenomenon`,
        keywords: ['opinion', 'social phenomenon', opinionScene.opinion],
        visualDetails: {
          lighting: 'natural realistic lighting',
          colorTone: 'realistic documentary style',
          atmosphere: `objective observation of ${opinionScene.opinionType}`,
          objects: ['realistic setting objects'],
          sounds: ['conversation', 'ambient sounds'],
          clothing: 'various realistic clothing',
          mood: 'documentary-style objective presentation'
        },
        storyFragment: opinionScene.storyFragment,
        detailedPrompt: opinionScene.imagePrompt,
        imagePrompt: opinionScene.imagePrompt,
        isOpinionScene: true,
        opinionType: opinionScene.opinionType,
        opinionText: opinionScene.opinion,
        visualizationApproach: opinionScene.visualizationApproach
      }
      
      // 🔥 插入策略：在体现观点的场景后插入观点场景
        newLogicalScenes.splice(relatedSceneIndex + 1, 0, opinionSceneData)
          opinionScenesAdded++
        console.log(`✅ [OPINION] 观点场景已插入到Scene ${relatedSceneIndex + 1}（${logicalScenes[relatedSceneIndex].title}）后面`)
      }
      
      // 不生成现实场景，避免与基础场景重复
      // 现实场景生成已禁用
    }
    
    // 如果没有生成观点场景，返回原场景
    if (opinionScenesAdded === 0) {
      console.log('ℹ️ [OPINION] 未能生成观点场景')
      return null
    }
    
    // 如果newLogicalScenes为空（没有生成观点场景），使用原场景
    if (newLogicalScenes.length === 0) {
      console.log('⚠️ [OPINION] 场景列表为空，返回原场景')
      return null
    }
    
    console.log(`✅ [OPINION] 共添加${opinionScenesAdded}个观点场景，总场景数: ${newLogicalScenes.length}`)
    
    return {
      ...scenes,
      logicalScenes: newLogicalScenes,
      hasOpinionScene: true,
      opinionScenesCount: opinionScenesAdded,
      realityScenesCount: 0 // 不生成现实场景
    }
  }
  
  /**
   * 公共方法：生成观点场景
   */
  static async generateOpinionScenes(
    initialPrompt: string,
    answers: string[],
    userInfo: any,
    userMetadata: any
  ): Promise<any[]> {
    console.log('🎯 [OPINION] 开始生成观点场景')
    console.log('🔍 [OPINION] initialPrompt:', initialPrompt)
    console.log('🔍 [OPINION] answers:', answers)
    
    try {
      // 检测观点
      const opinionResult = await this.detectOpinions(initialPrompt, answers)
      console.log('🔍 [OPINION] 检测到的观点数量:', opinionResult.opinions?.length || 0)
      console.log('🔍 [OPINION] 检测到的观点:', opinionResult.opinions)
      
      if (!opinionResult.hasOpinion || opinionResult.opinions.length === 0) {
        console.log('ℹ️ [OPINION] 未检测到观点，跳过观点场景生成')
        return []
      }
      
      // 🔥 去重观点（避免重复生成）
      const uniqueOpinions = this.deduplicateOpinions(opinionResult.opinions)
      console.log(`✅ [OPINION] 去重后的观点数量: ${opinionResult.opinions.length} → ${uniqueOpinions.length}`)
      
      // 🔥 生成所有不重复的观点场景（不限制数量，但已经过去重）
      const selectedOpinions = uniqueOpinions // 使用所有去重后的观点
      console.log(`✅ [OPINION] 将为 ${selectedOpinions.length} 个不重复的观点生成场景`)
      console.log(`📌 [OPINION] 观点列表:`, selectedOpinions.map(o => `"${o.text}" (优先级: ${o.priority})`))
      
      // 生成观点场景
      const opinionScenes = []
      for (const opinion of selectedOpinions) {
        const scene = await this.generateOpinionScene(opinion, initialPrompt, answers, userInfo, userMetadata)
        if (scene) {
          // 🔥 将原始场景转换为前端需要的格式
          const opinionSceneData = {
            title: `观点：${scene.opinion}`,
            mainCharacter: 'phenomenon',
            description: scene.sceneDescription_EN,
            description_zh: scene.sceneDescription_CN,
            location: scene.location,
            age: null,
            height: null,
            hairLength: null,
            peopleCount: `${scene.peopleInvolved?.length || 0} people demonstrating the phenomenon`,
            keywords: ['opinion', 'social phenomenon', scene.opinion],
            visualDetails: {
              lighting: 'natural realistic lighting',
              colorTone: 'realistic documentary style',
              atmosphere: `objective observation of ${scene.opinionType}`,
              objects: ['realistic setting objects'],
              sounds: ['conversation', 'ambient sounds'],
              clothing: 'various realistic clothing',
              mood: 'documentary-style objective presentation'
            },
            storyFragment: scene.storyFragment,
            detailedPrompt: scene.imagePrompt,
            imagePrompt: scene.imagePrompt,
            isOpinionScene: true,
            opinionType: scene.opinionType,
            opinionText: scene.opinion,
            visualizationApproach: scene.visualizationApproach
          }
          opinionScenes.push(opinionSceneData)
        }
      }
      
      console.log(`✅ [OPINION] 生成了 ${opinionScenes.length} 个观点场景`)
      return opinionScenes
      
    } catch (error) {
      console.error('❌ [OPINION] 观点场景生成失败:', error)
      return []
    }
  }
}


