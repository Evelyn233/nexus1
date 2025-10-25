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
   * 去重观点（合并相似观点）
   */
  private static deduplicateOpinions(opinions: Array<{ type: string, text: string, trigger: string, priority: number, reason: string }>): Array<{ type: string, text: string, trigger: string, priority: number, reason: string }> {
    if (!opinions || opinions.length <= 1) {
      return opinions
    }
    
    const uniqueOpinions: Array<{ type: string, text: string, trigger: string, priority: number, reason: string }> = []
    
    for (const opinion of opinions) {
      // 检查是否与已有观点相似
      const isSimilar = uniqueOpinions.some(existing => {
        const similarity = this.calculateSimilarity(opinion.text, existing.text)
        return similarity > 0.5 // 50%相似度阈值（更严格）
      })
      
      if (!isSimilar) {
        uniqueOpinions.push(opinion)
      } else {
        console.log(`🔄 [OPINION] 跳过相似观点: "${opinion.text}" (与已有观点相似)`)
      }
    }
    
    console.log(`✅ [OPINION] 观点去重完成: ${opinions.length} → ${uniqueOpinions.length}`)
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
              content: `你是观点检测专家。任务：从用户输入中识别观点、价值判断、社会现象评论。

**⚠️ 重要：区分情绪表达和观点表达！**
- ❌ 情绪表达：如"很开心"、"很感动"、"觉得开心"、"感觉很好" → 这些是情绪，不是观点！
- ✅ 观点表达：如"熟人经济"、"形式主义"、"本质是XX"、"就是XX" → 这些是观点！

**观点类型：**
1. **社会现象评论**（如"熟人经济"、"形式主义"、"表面功夫"）
2. **价值判断**（如"其实很虚伪"、"本质是XX"、"就是XX"）
3. **文化批判**（如"传统vs现代"、"理想vs现实"）
4. **讽刺/嘲讽**（如"呵呵"、"笑死"、"装模作样"）

**🎯 观点检测标准（精准识别）：**
- **只识别抽象的观点表达，不要描述具体行为**
- 包括：社会现象评论（如"中国缺乏高端杂志市场"）
- 包括：价值判断（如"Neoma杂志做得特别好"）
- 包括：情感表达（如"很惋惜愤怒"）
- **不包括**：具体行为（如"用chatgpt搜到的"、"上班的时候"）
- **不包括**：场景描述（如"就是在公司"、"在书店"）
- **不包括**：发现过程（如"第一次看到"、"发现了"）

**🚨 重要：只识别抽象观点，不描述具体行为！**
- ✅ "中国缺乏高端杂志市场" → 这是观点（社会现象评论）
- ✅ "Neoma杂志做得特别好" → 这是观点（价值判断）
- ✅ "我很惋惜愤怒" → 这是观点（情感表达）
- ✅ "很惋惜愤怒" → 这是观点（情感表达）
- ❌ "用chatgpt搜到的" → 这不是观点（具体行为）
- ❌ "上班的时候" → 这不是观点（场景描述）
- ❌ "第一次看到neoma" → 这不是观点（发现过程）

**优先级分析标准：**
1. **社会现象评论**：如"中国缺乏高端杂志市场"、"熟人经济"等
2. **价值判断**：如"Neoma杂志做得特别好"、"本质是XX"等
3. **情感表达**：如"很惋惜愤怒"、"开心"、"失望"等
4. **文化批判**：如"传统vs现代"、"理想vs现实"等
5. **讽刺/嘲讽**：如"呵呵"、"笑死"、"装模作样"等

**优先级评分（1-10分）：**
- 10分：社会现象评论、深度商业分析、文化批判
- 9分：价值判断、情感表达、讽刺嘲讽
- 6-7分：个人偏好表达
- 4-5分：简单评价
- 1-3分：基础描述、场景描述

返回JSON：
{
  "hasOpinion": boolean,
  "opinions": [
    {
      "type": "社会现象评论/价值判断/情感表达/文化批判/讽刺嘲讽",
      "text": "观点的简短概括（5-10字）",
      "trigger": "用户原文中触发观点的句子",
      "priority": 8,
      "reason": "分析原因"
    }
  ]
}

**重要要求：**
- 最多只返回2个最重要的观点
- 优先选择社会现象评论、价值判断、情感表达
- 不要返回具体行为、场景描述、发现过程
- 观点必须是抽象的，不是具体的`
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
1. **🎨 使用The New Yorker风格的Editorial illustration**：高质量、有诗意的杂志插图风格
2. **象征性场景**：用象征性、概念性的场景来体现观点，而不是直接描述
3. **诗意表达**：场景要有诗意、有深度、有思考性
4. **高质量设计**：像The New Yorker、The Atlantic等高端杂志的插图质量

**🎨 高质量Editorial illustration风格要求：**
- Editorial illustration in The New Yorker style
- Conceptual, symbolic, and poetic
- Minimalist composition with intelligent mood
- Muted pastel tones, painterly texture
- Sophisticated and thoughtful visual metaphors

**观点类型与高质量可视化策略：**

**1. 社会现象（如"中国缺乏高端杂志市场"）：**
→ 生成：象征性场景，用隐喻表达社会现象
→ 示例："中国缺乏高端杂志市场" = Editorial illustration in The New Yorker style, conceptual scene of a small isolated island shaped like an open magazine, surrounded by a vast turbulent ocean made of data, social media icons, and message bubbles; the island glows softly under sunlight, symbolizing intellectual solitude and refinement in a chaotic digital age; minimalist composition, muted pastel tones, painterly texture, intelligent and poetic mood

**2. 价值判断（如"赞赏杂志的智性水平"）：**
→ 生成：象征性场景，用隐喻表达价值判断
→ 示例："智性水平" = Editorial illustration in The New Yorker style, conceptual scene of a lighthouse made of stacked books, casting beams of light through fog of information overload, symbolizing intellectual guidance; minimalist composition, muted pastel tones, painterly texture, intelligent and poetic mood

**3. 文化批判（如"传统vs现代"）：**
→ 生成：象征性场景，用隐喻表达文化冲突
→ 示例："传统vs现代" = Editorial illustration in The New Yorker style, conceptual scene of two trees - one ancient and gnarled, one sleek and digital - their branches intertwining in a dance of conflict and harmony; minimalist composition, muted pastel tones, painterly texture, intelligent and poetic mood

**4. 情感表达（如"很惋惜愤怒"）：**
→ 生成：象征性场景，用隐喻表达情感
→ 示例："很惋惜愤怒" = Editorial illustration in The New Yorker style, conceptual scene of a beautiful flower wilting in a storm of digital noise and superficial content, symbolizing the loss of authentic beauty; minimalist composition, muted pastel tones, painterly texture, intelligent and poetic mood

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

**生成要求（高质量Editorial illustration风格）：**
1. 场景必须是The New Yorker风格的Editorial illustration
2. 用象征性、概念性的场景来体现观点
3. 场景要有诗意、有深度、有思考性
4. 使用高质量的杂志插图风格，不是简单的插画
5. imagePrompt必须详细描述高质量Editorial illustration风格、象征性元素、诗意表达
6. 采用高端杂志插图的视角，像The New Yorker一样呈现

返回JSON：
{
  "opinion": "${opinion.text}",
  "opinionType": "${opinion.type}",
  "visualizationApproach": "可视化策略（1-2句话）",
  "sceneDescription_CN": "中文场景描述（详细）",
  "sceneDescription_EN": "English scene description (detailed)",
  "imagePrompt": "Editorial illustration in The New Yorker style, conceptual scene of [具体的象征性场景描述], symbolizing [观点含义]; minimalist composition, muted pastel tones, painterly texture, intelligent and poetic mood. --ar 16:9",
  "location": "象征性场景（如：Conceptual Social Scene, Symbolic Cultural Space）",
  "peopleInvolved": ["象征元素1", "象征元素2", "概念元素1"],
  "storyFragment": "高质量Editorial illustration描述（100-150字，描述象征性场景中的元素、隐喻和诗意表达，体现观点）"
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
      const opinionSceneData = {
        title: `观点：${opinionScene.opinion}`,
        mainCharacter: 'phenomenon', // 观点场景是现象呈现，没有主角
        description: opinionScene.sceneDescription_EN,
        description_zh: opinionScene.sceneDescription_CN,
        location: opinionScene.location,
        age: null, // 观点场景没有用户，不需要年龄
        height: null,
        hairLength: null,
        peopleCount: `${opinionScene.peopleInvolved.length} people demonstrating the phenomenon`,
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
}


