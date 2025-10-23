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
   * 检测用户输入中的观点表达
   */
  private static async detectOpinions(
    initialPrompt: string,
    answers: string[]
  ): Promise<{ hasOpinion: boolean, opinions: Array<{ type: string, text: string, trigger: string }> }> {
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

**观点类型：**
1. **社会现象评论**（如"熟人经济"、"形式主义"、"表面功夫"）
2. **价值判断**（如"其实很虚伪"、"本质是XX"、"就是XX"）
3. **文化批判**（如"传统vs现代"、"理想vs现实"）
4. **讽刺/嘲讽**（如"呵呵"、"笑死"、"装模作样"）

返回JSON：
{
  "hasOpinion": boolean,
  "opinions": [
    {
      "type": "社会现象/价值判断/文化批判/讽刺",
      "text": "观点的简短概括（5-10字）",
      "trigger": "用户原文中触发观点的句子"
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

**🎯 核心原则（观点是客观现象，不包含用户）：**
1. **必须有真实人物**：观点场景不是抽象符号，而是人物互动
2. **用人物行为体现观点**：通过人物的动作、表情、互动来呈现观点
3. **🚨 不要有用户！**：这是客观现象的呈现，画面中不应该出现用户本人
4. **第三人称视角**：像纪录片一样呈现这个社会现象

**🚨🚨🚨 死刑规则：**
- ❌ "熟人经济" → Abstract circles, symbolic network → 死刑！
- ✅ "熟人经济" → Real people exchanging WeChat contacts, introducing each other
- ❌ "形式主义" → Abstract forms, paperwork symbols → 死刑！
- ✅ "形式主义" → People performing tasks mechanically, going through motions
- ❌ "虚伪" → Mask symbols → 死刑！
- ✅ "虚伪" → Person with different expressions (smiling to face, frowning when turned away)

**观点类型与可视化策略：**

**1. 社会现象（如"熟人经济"）：**
→ 生成：多人互动场景，体现这个现象的典型行为
→ 示例："熟人经济" = 多个商务人士围成圈，交换微信、互相介绍、建群聊

**2. 价值判断（如"其实很虚伪"）：**
→ 生成：对比场景，体现表面vs内在的差异
→ 示例："虚伪" = 人物面对不同人时表情/姿态的明显差异

**3. 文化批判（如"传统vs现代"）：**
→ 生成：对比场景，两种风格/行为的并置
→ 示例："传统管理vs现代思维" = 不同管理风格的具体行为对比

**4. 讽刺/嘲讽（如"装模作样"）：**
→ 生成：夸张的行为场景，体现做作/表演性
→ 示例："装模作样" = 人物过度表演性的姿态和动作

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

**生成要求：**
1. 场景中必须有真实人物（至少2-3人）
2. 用人物的具体行为和互动来体现观点
3. **🚨 画面中不要有用户！**这是客观现象的呈现，不是用户视角
4. 不要用抽象符号，要用具体的人物动作
5. imagePrompt必须详细描述人物的衣着、动作、表情、互动
6. 采用第三人称视角，像纪录片/社会观察一样客观呈现

返回JSON：
{
  "opinion": "${opinion.text}",
  "opinionType": "${opinion.type}",
  "visualizationApproach": "可视化策略（1-2句话）",
  "sceneDescription_CN": "中文场景描述（详细）",
  "sceneDescription_EN": "English scene description (detailed)",
  "imagePrompt": "🚨 NO USER IN SCENE! Documentary-style objective observation. MUST include: MULTIPLE REAL PEOPLE (at least 2-3 characters) demonstrating the social phenomenon, their specific clothing, facial expressions, body language, interactions. Specific location. Third-person perspective like documentary photography. Realistic style, NOT abstract symbols. Focus on people's behavior and interactions that embody the opinion/phenomenon. --ar 16:9",
  "location": "具体地点（如：办公室、会议室、社交场合）",
  "peopleInvolved": ["角色1", "角色2", "角色3"],
  "storyFragment": "故事片段（100-150字，客观描述场景中发生的事情，不包含用户视角）"
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
    
    // 最多生成1个观点场景（选择第一个/最重要的观点）
    const primaryOpinion = opinionResult.opinions[0]
    
    console.log(`🎨 [OPINION] 为观点"${primaryOpinion.text}"生成可视化场景`)
    
    // 🔍 智能识别哪个场景体现了这个观点
    let relatedSceneIndex = -1
    const opinionKeywords = primaryOpinion.text.toLowerCase()
    
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
                        sceneText.includes(primaryOpinion.trigger.toLowerCase())
      
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
      primaryOpinion,
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
      for (let i = 0; i < logicalScenes.length; i++) {
        newLogicalScenes.push(logicalScenes[i])
        
        // 在找到的相关场景后插入观点场景
        if (i === relatedSceneIndex) {
          newLogicalScenes.push(opinionSceneData)
          opinionScenesAdded++
          console.log(`✅ [OPINION] 观点场景已插入到Scene ${i + 1}（${logicalScenes[i].title}）后面`)
        }
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


