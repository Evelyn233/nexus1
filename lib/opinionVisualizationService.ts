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

**🚨 严格排除情绪表达：**
- 用户说"很开心"、"很感动"、"觉得开心"、"感觉很好" → 这是情绪，不是观点！
- 用户说"喜欢"、"讨厌"、"觉得"（情感词汇）→ 这是情绪，不是观点！
- 只有涉及社会现象、价值判断、文化批判的才是观点！

**🎯 观点检测标准（更严格）：**
- 必须包含**社会现象、价值判断、文化批判**的具体内容
- 不能只是情感表达（如"开心"、"感动"）
- 不能只是描述性语言（如"看到"、"发现"）
- 必须是用户对某个现象、问题、文化的**评价和判断**

**优先级分析标准：**
1. **深度思考程度**：是否涉及深层次的思考、分析、质疑
2. **商业价值**：是否涉及商业模式、盈利、市场分析
3. **社会意义**：是否涉及社会现象、文化批判、价值判断
4. **创新性**：是否提出新的观点、角度、思考
5. **实用性**：是否对实际生活、工作有指导意义

**优先级评分（1-10分）：**
- 10分：深度商业分析、创新思考、社会批判
- 8-9分：深度思考、价值判断、文化分析
- 6-7分：一般观点、表面评价
- 4-5分：简单赞赏、基础对比
- 1-3分：表面描述、无深度思考

返回JSON：
{
  "hasOpinion": boolean,
  "opinions": [
    {
      "type": "社会现象/价值判断/文化批判/讽刺",
      "text": "观点的简短概括（5-10字）",
      "trigger": "用户原文中触发观点的句子",
      "priority": 8,
      "reason": "分析原因"
    }
  ]
}`
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
      
      // 清理markdown代码块
      if (content.includes('```json')) {
        content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      } else if (content.includes('```')) {
        content = content.replace(/```/g, '').trim()
      }
      
      // 清理可能的中文标点
      content = content.replace(/，/g, ',').replace(/：/g, ':').replace(/"/g, '"').replace(/"/g, '"')
      
      const analysis = JSON.parse(content)
      console.log('✅ [OPINION] 观点检测完成:', analysis)
      
      return analysis
      
    } catch (error) {
      console.error('❌ [OPINION] 观点检测失败:', error)
      return { hasOpinion: false, opinions: [] }
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
              content: `你是观点可视化专家。任务：将用户的抽象观点转化为具体的视觉场景。

**🎯 核心原则（观点场景使用插画风格）：**
1. **🎨 使用Illustrator插画风格**：观点场景必须是插画风格，不是写实照片
2. **必须有人物**：观点场景必须包含人物，用人物来体现观点
3. **现代扁平设计**：clean vector art, flat design, minimal illustration
4. **🚨 不要写实照片！**：realistic photos, photorealistic images

**🚨🚨🚨 死刑规则：**
- ❌ "熟人经济" → realistic photo of people networking → 死刑！
- ✅ "熟人经济" → Illustrator style illustration with people, business cards, WeChat QR codes, connection lines, modern flat design
- ❌ "形式主义" → realistic photo of office workers → 死刑！
- ✅ "形式主义" → Vector art illustration with people, mechanical symbols, repetitive patterns, clean design
- ❌ "虚伪" → realistic photo of person with different expressions → 死刑！
- ✅ "虚伪" → Flat design illustration with people, mask symbols, contrast elements, symbolic representation

**观点类型与可视化策略（插画风格）：**

**1. 社会现象（如"熟人经济"）：**
→ 生成：插画风格，必须有人物
→ 示例："熟人经济" = Illustrator style illustration with people, business cards, WeChat QR codes, connection lines, network symbols

**2. 价值判断（如"赞赏杂志的智性水平"）：**
→ 生成：插画风格，必须有人物
→ 示例："智性水平" = Vector art illustration with people, brain symbols, light bulbs, knowledge icons, intellectual symbols

**3. 文化批判（如"传统vs现代"）：**
→ 生成：插画风格，必须有人物
→ 示例："传统vs现代" = Flat design illustration with people, contrast elements, traditional vs modern symbols

**4. 讽刺/嘲讽（如"装模作样"）：**
→ 生成：插画风格，必须有人物
→ 示例："装模作样" = Vector art illustration with people, exaggerated symbols, performance elements

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

**生成要求（插画风格）：**
1. 场景必须是插画风格，必须包含人物
2. 用人物和象征物来体现观点
3. **🚨 不要写实照片！**使用Illustrator插画风格
4. 使用现代扁平设计，clean vector art
5. imagePrompt必须详细描述插画风格、人物、象征物、设计元素
6. 采用插画视角，像现代杂志插图一样呈现

返回JSON：
{
  "opinion": "${opinion.text}",
  "opinionType": "${opinion.type}",
  "visualizationApproach": "可视化策略（1-2句话）",
  "sceneDescription_CN": "中文场景描述（详细）",
  "sceneDescription_EN": "English scene description (detailed)",
  "imagePrompt": "🚨 ILLUSTRATOR ILLUSTRATION STYLE! Vector art illustration, modern flat design, clean vector art. MUST include: PEOPLE in the scene, PRECISE SYMBOLIC ELEMENTS that represent the opinion/phenomenon, symbolic icons, abstract shapes, design elements. NOT realistic photos, NOT photorealistic images. Focus on people and symbolic representation that embodies the opinion/phenomenon. --ar 16:9",
  "location": "插画场景（如：Illustrator Business Scene, Vector Art Social Scene）",
  "peopleInvolved": ["人物1", "人物2", "象征物1"],
  "storyFragment": "插画描述（100-150字，描述插画中的人物、象征物和设计元素，体现观点）"
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
    
    // 为每个高优先级观点生成场景
    for (const opinion of finalOpinions) {
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
    
    const opinionScene = await this.generateOpinionScene(
        opinion,
      initialPrompt,
      answers,
      userInfo,
      userMetadata
    )
    
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
      opinionScenesCount: opinionScenesAdded
    }
  }
}


