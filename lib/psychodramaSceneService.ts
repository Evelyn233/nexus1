/**
 * 心理剧场景生成服务
 * 
 * 功能：
 * 1. 从用户对话中找到有情绪的地方
 * 2. 使用用户的AI分析数据（两层数据结构）推测用户心理
 * 3. 生成和现实相关、有具体任务、有精准地点场景的心理剧场景
 * 4. 场景包含强烈冲突，表达用户内心心理
 */

import { getUserInfo, getUserMetadata } from './userDataApi'
import { API_CONFIG } from './config'

/**
 * 心理剧场景数据结构
 */
export interface PsychodramaScene {
  // 基本信息
  emotionalTrigger: string            // 情绪触发点（从用户对话中提取）
  emotionalIntensity: number          // 情绪强度（1-10）
  
  // 场景设置
  location: string                    // 精准地点（具体的真实场所）
  task: string                        // 现实任务（用户在做什么）
  otherCharacters: string[]           // 其他角色（如果有）
  
  // 冲突设置
  innerConflict: string               // 内心冲突描述
  externalConflict: string            // 外部冲突描述
  conflictIntensity: number           // 冲突强度（1-10）
  
  // 心理分析
  subconsciousDesire: string          // 潜意识愿望（从第二层数据推测）
  consciousBehavior: string           // 表意识行为（从第一层数据提取）
  psychologicalMechanism: string      // 心理机制（防御、投射、压抑等）
  
  // 场景描述
  sceneDescription_CN: string         // 中文场景描述
  sceneDescription_EN: string         // 英文场景描述（用于生图）
  
  // 提示词
  imagePrompt: string                 // 图像生成提示词
}

/**
 * 情绪分析结果
 */
interface EmotionalAnalysis {
  hasEmotion: boolean
  emotions: Array<{
    type: string              // 情绪类型（焦虑、愤怒、悲伤、恐惧等）
    intensity: number         // 强度（1-10）
    trigger: string           // 触发原因
    quote: string             // 用户原话
  }>
}

/**
 * 心理剧场景生成服务
 */
export class PsychodramaSceneService {
  
  /**
   * 主函数：生成心理剧场景
   * @param forceGenerate - 是否强制生成（跳过情绪检测），用于观点/情绪可视化
   */
  static async generatePsychodramaScene(
    initialPrompt: string,
    answers: string[],
    questions: string[],
    forceGenerate: boolean = false
  ): Promise<PsychodramaScene | null> {
    console.log('🎭 [PSYCHODRAMA] 开始生成心理剧场景')
    console.log('🎭 [PSYCHODRAMA] 强制生成模式:', forceGenerate)
    
    try {
      // 1. 从用户对话中找到情绪点
      const emotionalAnalysis = await this.detectEmotions(initialPrompt, answers, questions)
      
      // 如果不是强制生成模式，检查情绪
      if (!forceGenerate && (!emotionalAnalysis.hasEmotion || emotionalAnalysis.emotions.length === 0)) {
        console.log('⚠️ [PSYCHODRAMA] 未检测到明显情绪，跳过心理剧生成')
        return null
      }
      
      // 2. 获取用户的两层数据
      const userInfo = await getUserInfo()
      const userMetadata = await getUserMetadata()
      
      // 3. 选择情绪最强烈的点（或创建默认情绪用于强制生成）
      let strongestEmotion
      
      if (emotionalAnalysis.hasEmotion && emotionalAnalysis.emotions.length > 0) {
        strongestEmotion = emotionalAnalysis.emotions.reduce((prev, curr) => 
        curr.intensity > prev.intensity ? curr : prev
      )
        console.log('✅ [PSYCHODRAMA] 检测到情绪:', emotionalAnalysis.emotions)
      console.log('🎯 [PSYCHODRAMA] 选中最强情绪:', strongestEmotion)
      } else {
        // 强制生成模式：创建默认情绪
        const allInputs = [initialPrompt, ...answers].join(' ')
        strongestEmotion = {
          type: '观点可视化',
          intensity: 8,
          trigger: initialPrompt,
          quote: allInputs.substring(0, 100)
        }
        console.log('🎨 [PSYCHODRAMA] 强制生成模式：使用默认情绪', strongestEmotion)
      }
      
      // 4. 生成心理剧场景
      const scene = await this.generateScene(
        strongestEmotion,
        initialPrompt,
        answers,
        questions,
        userInfo,
        userMetadata
      )
      
      console.log('✅ [PSYCHODRAMA] 心理剧场景生成完成')
      return scene
      
    } catch (error) {
      console.error('❌ [PSYCHODRAMA] 生成心理剧场景失败:', error)
      return null
    }
  }
  
  /**
   * 检测用户对话中的情绪
   */
  private static async detectEmotions(
    initialPrompt: string,
    answers: string[],
    questions: string[]
  ): Promise<EmotionalAnalysis> {
    console.log('🔍 [PSYCHODRAMA] 开始情绪检测')
    
    // 🔄 本次完整对话（所有输入同等对待）
    const allInputs = [initialPrompt, ...answers].filter(input => input && input.trim())
    
    console.log('🔄 [PSYCHODRAMA-EMOTION] 本次完整对话（所有输入）:', allInputs)
    
    const conversationText = `
**📌 本次完整对话（所有输入同等重要）:**
${allInputs.map((input, i) => `
输入${i+1}: "${input}"
${i === 0 ? '→ 对话起点（核心主题）' : '→ 补充细节（同等重要）'}
`).join('')}

⚠️⚠️⚠️ 核心原则：
1. **所有输入同等重要**：这是一个完整对话，不分主次
2. **综合分析所有输入**：初始输入通常包含核心观点，后续回答补充细节
3. **特别注意对比、价值判断、嘲讽/讽刺**（可能在任何一条输入中）
4. **如果有明显情绪词或对比，一定要检测出来**

问答配对（理解上下文）:
${questions.map((q, i) => `Q${i+1}: ${q}\nA${i+1}: ${answers[i] || '无'}`).join('\n\n')}
`
    
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
              content: `你是专业的情绪分析专家。请从用户的对话中识别情绪点。

**情绪类型包括（全面检测）：**
- 焦虑/担忧
- 愤怒/不满
- 嘲讽/讽刺（对荒诞、虚伪、夸张的批判性情绪，如"我笑死了"）
- 悲伤/失落
- 恐惧/害怕
- 挫败/无力
- 内疚/自责
- 压抑/憋屈
- 孤独/被忽视/思念（如"想男朋友"、"想念"、"孤单"）
- 委屈/不公
- 矛盾/纠结
- 温暖/感动
- 怀念/回忆

**检测标准（宽松检测，宁可多检测！）：**
1. 用户明确表达任何情绪（负面、正面、复杂情绪都算）
2. 用户描述困扰或冲突（与人、与环境的矛盾）
3. 用户表现出情感反应（嘲讽、讽刺、思念、怀念）
4. 用户暗示内心活动（想念、回忆、纠结、矛盾）
5. **用户提到人际关系的情感**（想男朋友、想家人、想念某人）

**🔥🔥🔥 扩展情绪关键词（必须检测！）：**

**负面情绪：**
- 嘲讽/讽刺："笑死了"、"笑死"、"呵呵"、"冷笑"、"讽刺"、"无语"、"郁闷"、"烦"
- 愤怒/生气："生气"、"很生气"、"气死"、"愤怒"、"火大"、"不爽"
- 失望/幻灭："失望"、"幻灭"、"失落"、"不如预期"、"原来..."、"结果..."、"其实..."
- 对比场景：用户批判性态度 vs 他人的行为

**正面/复杂情绪：**
- 思念/想念："想男朋友"、"想他"、"想念"、"思念"、"想家"
- 孤独/孤单："一个人"、"孤单"、"没人陪"、"自己一个"
- 温暖/感动："感动"、"温暖"、"暖心"
- 怀念："怀念"、"回忆"、"那时候"

**情绪强度判断：**
- "笑死了" → intensity = 9（极强烈的嘲讽）
- "想男朋友" → intensity = 7（思念情绪）
- "呵呵" → intensity = 7（冷嘲）
- "有意思" → intensity = 6（温和讽刺）
- "孤单" → intensity = 7（孤独感）

**⚠️ 重要：宁可多检测，也不要漏掉！任何情感表达都值得用心理剧表现！**

请返回JSON格式：
{
  "hasEmotion": true/false,
  "emotions": [
    {
      "type": "情绪类型",
      "intensity": 1-10,
      "trigger": "触发原因",
      "quote": "用户原话"
    }
  ]
}`
            },
            {
              role: 'user',
              content: `请分析以下对话中的情绪点：

${conversationText}

只返回JSON，不要其他解释。`
            }
          ],
          temperature: 0.7,
          max_tokens: 1000
        })
      })
      
      if (!response.ok) {
        throw new Error(`DouBao API调用失败: ${response.status}`)
      }
      
      const data = await response.json()
      const content = data.choices[0].message.content.trim()
      
      // 提取JSON - 更健壮的逻辑
      let jsonString = content
      
      // 清理markdown代码块
      if (content.includes('```json')) {
        jsonString = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      } else if (content.includes('```')) {
        jsonString = content.replace(/```/g, '').trim()
      }
      
      // 提取JSON对象
      const jsonStart = jsonString.indexOf('{')
      const jsonEnd = jsonString.lastIndexOf('}')
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonString = jsonString.substring(jsonStart, jsonEnd + 1)
      }
      
      // 清理中文标点符号（关键！）
      jsonString = jsonString
        .replace(/，/g, ',')  // 中文逗号 → 英文逗号
        .replace(/：/g, ':')  // 中文冒号 → 英文冒号
        .replace(/"/g, '"')   // 中文左引号 → 英文引号
        .replace(/"/g, '"')   // 中文右引号 → 英文引号
      
      if (!jsonString || jsonString.trim() === '') {
        console.error('❌ [PSYCHODRAMA] API返回内容为空')
        console.log('📄 [PSYCHODRAMA] 原始内容:', content)
        return { hasEmotion: false, emotions: [] }
      }
      
      const analysis = JSON.parse(jsonString)
      console.log('✅ [PSYCHODRAMA] 情绪分析完成:', analysis)
      
      return analysis
      
    } catch (error) {
      console.error('❌ [PSYCHODRAMA] 情绪检测失败:', error)
      return { hasEmotion: false, emotions: [] }
    }
  }
  
  /**
   * 生成心理剧场景
   */
  private static async generateScene(
    emotion: { type: string, intensity: number, trigger: string, quote: string },
    initialPrompt: string,
    answers: string[],
    questions: string[],
    userInfo: any,
    userMetadata: any,
    previousMetaphors: string[] = [],  // 已使用的视觉隐喻，避免重复
    baseScene?: any  // 🆕 基础场景，心理剧应基于此场景
  ): Promise<PsychodramaScene> {
    console.log('🎬 [PSYCHODRAMA] 开始生成心理剧场景')
    
    // ✂️ 删除冗余日志：用户完整档案（太长，影响性能）
    
    // 从userMetadata提取两层数据（安全解析JSON）
    const safeJsonParse = (data: any, fallback: any = []) => {
      // 如果已经是数组或对象，直接返回
      if (Array.isArray(data)) return data
      if (typeof data === 'object' && data !== null) return data
      
      // 如果是字符串，尝试解析
      if (typeof data === 'string') {
        if (data.trim() === '' || data === 'null') return fallback
        try {
          return JSON.parse(data)
        } catch (error) {
          console.warn('⚠️ [PSYCHODRAMA] JSON解析失败:', data)
          return fallback
        }
      }
      
      // 其他情况返回默认值
      return fallback
    }
    
    const consciousData = {
      rawInputs: safeJsonParse(userMetadata.userRawInputs, []),
      mentionedKeywords: safeJsonParse(userMetadata.userMentionedKeywords, [])
    }
    
    const subconsciousData = {
      coreTraits: safeJsonParse(userMetadata.coreTraits, []),
      emotionalPattern: safeJsonParse(userMetadata.emotionalPattern, []),
      behaviorPatterns: safeJsonParse(userMetadata.behaviorPatterns, []),
      stressResponse: safeJsonParse(userMetadata.stressResponse, []),
      interpersonalChallenges: safeJsonParse(userMetadata.interpersonalChallenges, [])
    }
    
    // 🔄 本次完整对话（所有输入同等对待）
    const allInputs = [initialPrompt, ...answers].filter(input => input && input.trim())
    
    console.log('🔄 [PSYCHODRAMA-SCENE] 本次完整对话（所有输入）:', allInputs)
    
    const conversationText = `
**📌 本次完整对话:**
${allInputs.map((input, i) => `输入${i+1}: "${input}"`).join('\n')}

**🎭 心理剧场景要求（学习优秀写作风格）:**
1. 具体场景设置：明确的时间、地点、环境细节
2. 丰富的动作描述：人物在做什么，如何做
3. 生动的内心独白：真实的情感表达，不是硬编码
4. 情绪层次变化：从表面到内心的对比，复杂情感
5. 视觉细节描写：环境、灯光、物品等具体描写
6. 场景完整性：包含环境、动作、内心、情绪、细节

**📖 优秀写作风格示例:**
"场景一：办公室，上午十点半。屏幕上是一堆KPI报表，Slack消息不断闪烁。她戴着耳机，假装在听会议，却在浏览Noema杂志的网页。黑底白字的文章标题在她眼前展开。每一行字都像是从信息噪声中撕开的裂缝，让空气突然变得安静。"

**问答配对:**
${questions.map((q, i) => `Q${i+1}: ${q}\nA${i+1}: ${answers[i] || '无'}`).join('\n\n')}
`
    
    // 从所有用户输入中提取具体地点（用于提取地点信息仍需要所有输入）
    const extractedLocation = (() => {
      const allText = allInputs.join(' ')
      
      // 优先提取具体街道/路名（最具体！）
      if (allText.includes('淞虹路') || allText.includes('淞沪路')) {
        if (allText.includes('8楼') || allText.includes('八楼')) return '淞虹路公司8楼'
        if (allText.includes('会议室')) return '淞虹路公司会议室'
        return '淞虹路公司'
      }
      if (allText.includes('朝阳区')) return '朝阳区办公室'
      if (allText.includes('金融街')) return '金融街'
      if (allText.includes('静安寺')) return '静安寺'
      if (allText.includes('悉尼大学') || allText.includes('Sydney')) return '悉尼大学'
      
      // 提取一般场所
      if (allText.includes('会议室') || allText.includes('会议')) return '公司会议室'
      if (allText.includes('8楼') || allText.includes('八楼')) return '公司8楼'
      if (allText.includes('办公室') || allText.includes('公司')) return '公司办公室'
      
      // 家的关键词（扩展）
      if (allText.includes('家') || allText.includes('卧室') || allText.includes('客厅') ||
          allText.includes('睡衣') || allText.includes('被子') || allText.includes('床') ||
          allText.includes('被吵醒') || allText.includes('半夜') || allText.includes('窗户') ||
          allText.includes('起床') || allText.includes('起来')) {
        return '家中'
      }
      
      // 根据上下文智能判断默认值
      // 如果提到工作相关词汇，默认办公室；否则默认家中
      if (allText.includes('工作') || allText.includes('项目') || allText.includes('同事') || allText.includes('老板')) {
      return '办公室'
      }
      
      // 其他情况默认家中（日常生活更多发生在家里）
      return '家中'
    })()
    
    console.log('📍 [PSYCHODRAMA] 提取的具体地点:', extractedLocation)
    
    // 🔥 如果有baseScene，使用它的具体环境
    const baseSceneInfo = baseScene ? {
      location: baseScene.location || extractedLocation,
      description: baseScene.description || baseScene.description_zh,
      objects: baseScene.visualDetails?.objects || [],
      clothing: baseScene.visualDetails?.clothing || 'casual clothing',
      peopleCount: baseScene.peopleCount || 'alone',
      atmosphere: baseScene.visualDetails?.atmosphere || 'realistic'
    } : null
    
    console.log('🎬 [PSYCHODRAMA] 基础场景信息:', baseSceneInfo || '无基础场景')
    console.log('📡 [PSYCHODRAMA] 开始调用AI API生成心理剧...')
    console.log('⏱️ [PSYCHODRAMA] 请求时间:', new Date().toLocaleTimeString())
    
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
              content: `你是专业的心理剧场景设计师。你的任务是**深度呈现用户的内心世界**。

**🚨🚨🚨 心理剧的3个强制要求（缺一不可！）：**
1. **DRAMATIC SPOTLIGHT on USER** - 用户必须被聚光灯照亮，背景较暗
2. **OTHERS必须象征化** - 老板/顾问不是普通人，而是用户眼中的象征化形象（如：被手机包围、双面表情、夸张手势）
3. **情绪氛围强烈** - 不是中性写实，而是情绪化、戏剧化的

**🚨🚨🚨 【最重要】心理剧应基于真实场景！不是theatrical stage！**

${baseSceneInfo ? `
**📍 基础场景信息（心理剧必须基于这个场景）：**
- 地点：${baseSceneInfo.location}
- 场景描述：${baseSceneInfo.description}
- 人物：${baseSceneInfo.peopleCount}
- 服装：${baseSceneInfo.clothing}
- 环境物品：${JSON.stringify(baseSceneInfo.objects.slice(0, 10))}
- 氛围：${baseSceneInfo.atmosphere}

**🎯 心理剧生成原则（基于真实场景，但大幅增强情绪表达）：**

1. **保持真实环境** - 场景还是${baseSceneInfo.location}，不变成抽象舞台
2. **🔥🔥🔥 大幅增强用户的情绪化表达（核心！）：**
   - **动作必须夸张化**：不是"hands resting on table"，而是"fingers VIGOROUSLY tapping with visible tension" / "fists TIGHTLY clenched showing frustration" / "hands DRAMATICALLY gesturing"
   - **表情必须强烈化**：不是"subtle expression"，而是"eyes SHARPLY narrowed with VISIBLE skepticism" / "lips CLEARLY curled in disdain" / "eyebrows DEEPLY furrowed"
   - **姿态必须情绪化**：不是"sitting upright"，而是"leaning BACK with OBVIOUS detachment" / "body RIGID with suppressed anger" / "arms CROSSED showing clear resistance"
3. **添加视觉象征和隐喻（重要！）：**
   - 如果用户对某人有观点 → 那个人的外表要象征化（如：老板可以有"performative gestures"、"artificial smile"、"expensive but hollow appearance"）
   - 如果用户有内心冲突 → 环境光影要对比化（如：user in shadow, boss in spotlight）
4. **🎭 其他人物必须是用户眼中的象征化形象（核心！）**：
   - ❌ 不是普通的"sitting attentively"或"standing normally"
   - ✅ 是用户眼中看到的象征化形象：
     * 如果用户觉得老板依赖熟人 → 老板被手机屏幕、微信群包围
     * 如果用户觉得老板虚伪 → 老板有双面表情、人造笑容开裂
     * 如果用户觉得老板装模作样 → 老板做夸张表演性手势
     * 如果用户觉得老板空谈 → 老板被空洞话语泡泡包围
   - **关键**：OTHERS的形象要体现用户的观点和感受，不是客观中立的描述

**🚨🚨🚨 死刑规则：心理剧必须和原场景有明显区别！**
- ❌ 原场景："User observing with subtle analytical expression"
- ❌ 心理剧："User observing with analytical expression" → 没区别！死刑！
- ✅ 心理剧："User with eyes SHARPLY narrowed in VISIBLE skepticism, fingers VIGOROUSLY tapping showing impatience, lips SLIGHTLY curled in subtle disdain, body leaning BACK with OBVIOUS emotional detachment"

**imagePrompt格式（基于真实场景 + 强化情绪）：**
"PSYCHOLOGICAL DRAMA at ${baseSceneInfo.location}. MEDIUM SHOT showing USER complete figure (head to waist): [年龄]-year-old Chinese [性别], ${userInfo.height}cm, ${userInfo.hairLength || 'long hair'}, wearing ${baseSceneInfo.clothing}.

**USER EMOTIONAL EXPRESSION (强化！):**
- BODY: [夸张情绪化姿态 - leaning BACK dramatically with detachment / body RIGID with tension / arms CROSSED with resistance / standing with OBVIOUS discomfort]
- HANDS: [强烈情绪化动作 - fingers VIGOROUSLY tapping / fists TIGHTLY clenched / hands DRAMATICALLY gesturing / gripping edge TENSELY]
- FACE: eyes [强烈眼神 - SHARPLY narrowed with skepticism / INTENSELY focused with frustration / CLEARLY showing disdain / VISIBLY tired with disappointment], eyebrows [DEEPLY furrowed / RAISED with irony / ASYMMETRIC showing skepticism], lips [CLEARLY pursed / SLIGHTLY curled in subtle smirk / PRESSED thin with suppression]
- POSTURE: complete body language CLEARLY showing [具体情绪]

${baseSceneInfo.peopleCount !== 'alone' ? `
**🎭 OTHERS（用户眼中的象征化形象 - 核心！）:**
- ${baseSceneInfo.peopleCount} in scene, slightly blurred but SYMBOLICALLY DEPICTED
- 🚨 OTHERS不是普通人物，而是用户眼中看到的象征化形象：
  * 如果用户觉得某人"依赖熟人/微信" → 那人被手机屏幕、微信群包围
  * 如果用户觉得某人"虚伪" → 那人有双面表情、人造笑容
  * 如果用户觉得某人"装模作样" → 那人做夸张表演性手势
  * 如果用户觉得某人"空谈" → 那人被空洞话语包围
- **根据用户观点动态选择象征化方式！**
` : ''}

**SYMBOLIC ELEMENTS (视觉隐喻，可选但建议使用):**
- [1-2个精准的视觉象征，略微虚化但可见]
- 示例：用户批判"熟人经济" → background显示"glowing phone screens showing message groups (略虚化)"
- 示例：用户失望"虚伪" → background有"cracked professional facade elements (艺术化)"

**SETTING:** ${baseSceneInfo.location} with ${baseSceneInfo.objects.slice(0, 5).join(', ')}

**VISUAL TREATMENT (🔥 强戏剧化，突出主角！):**
- **Lighting（核心！必须戏剧化）**: 
  * **DRAMATIC SPOTLIGHT on USER** - 主角被明显的聚光灯照亮，从侧面或顶部打光
  * USER illuminated with STRONG directional light, face and upper body CLEARLY lit
  * OTHERS in softer/dimmer lighting, creating CLEAR visual hierarchy
  * Strong light-shadow contrast emphasizing USER's emotional expression
  * Background slightly darker to make USER stand out
  
- **Color Treatment（情绪化调色）**: 
  * EMOTIONAL color grading based on mood:
    - 嘲讽/批判 → Cool desaturated tones, slight blue cast on USER
    - 失望/幻灭 → Muted colors, slight desaturation overall
    - 愤怒/压抑 → Warmer shadows, cooler highlights creating tension
  * USER has different color temperature than OTHERS (visual separation)
  
- **Atmosphere（强烈情绪氛围）**: 
  * PALPABLE emotional tension in the air
  * Visible psychological weight and dramatic mood
  * Cinematic psychological depth with clear emotional charge
  * NOT neutral/realistic, but emotionally CHARGED

**🎭 Cinematic psychological drama with THEATRICAL LIGHTING. USER clearly spotlit and VISUALLY DOMINANT. Complete figure composition. Emotional expressions HIGHLY VISIBLE. Dramatic lighting makes USER the clear focal point. --ar 16:9"
` : `
**⚠️ 无基础场景，使用提取的地点生成**
- 地点：${extractedLocation}
`}

**🎭 心理剧的核心理念：**
- **心理剧是用户内心世界的深度呈现**
- **基于真实场景，不是theatrical stage或abstract space**
- **增强用户的内心活动表达**：表情、眼神、肢体语言
- **外部场景真实，内心活动凸显**

**🎯🎯🎯 冲突主体识别（极其重要！决定谁被象征化！）：**

**情况1：用户观察到别人的问题/矛盾**
- 冲突主体 = 那个人（老板、同事、父母等）
- 用户角色 = 观察者、洞察者、批判者
- **视觉表达**：
  * **象征化那个人**（如：老板被画成双面人、面具脱落、虚伪形象崩塌）
  * **用户完整清晰**（在观察区，被理性光环包围，看穿一切）
- **示例场景**："用户发现老板的虚伪"、"用户看穿同事装模作样"、"用户识破表面和谐"

**情况2：用户自己的内心挣扎**
- 冲突主体 = 用户自己
- 用户角色 = 被分裂的主体
- **视觉表达**：
  * **象征化用户自己**（如：用户被分成两半、内心火山vs表面冰层）
  * **别人模糊化**（因为不是重点）
- **示例场景**："用户内心纠结"、"用户压抑愤怒"、"用户理想vs现实冲突"

**❌ 错误示例（冲突主体搞错）：**
- 场景：用户发现老板面试时装美国思维，实际是传统管理（这是老板的虚伪）
- 错误做法：把用户画成被分成两半（蓝色现代 vs 琥珀传统）
- 问题：**冲突在老板身上，不在用户！用户只是观察者！**

**✅ 正确示例（冲突主体正确）：**
- 场景：用户发现老板的虚伪
- 正确做法：
  * 老板被画成双面人/两层面具（外层美国开放 vs 内层传统专制）
  * 用户完整清晰，站在观察区，被蓝色理性光环包围
  * 用户眼神显示"我看穿你了"
  * 用户周围有分析思维线条连接老板的矛盾点

**🧠 心理剧场景的核心要素（都是关于用户内心！）：**

1. **用户的内心独白（Inner Monologue）**
   - 用户看到外部场景时，内心在说什么？
   - 直接引用用户的真实想法：如"我就用6块钱解决了问题，你在这吹什么..."
   - 嘲讽、讽刺、不屑的具体表达
   - 用户的理性分析和批判

2. **表面vs内心的强烈对比（Surface vs Inner Contrast）**
   - **表面行为**：礼貌微笑、点头、保持专业、坐着听会
   - **内心真实**：翻白眼、冷笑、嘲讽OS、不屑评判
   - **对比方式**：用文字明确写出"表面上...，内心却..."

3. **用户的心理投射和象征**
   - 用户如何看待这个场景（如：把老板的演讲看成一场荒诞表演）
   - 用户内心的比较（如："我用6块钱就解决了" vs "他在这大谈伟大"）
   - 用户的心理防御机制（如：通过嘲讽来保持心理距离）

4. **潜意识愿望和恐惧**
   - 用户潜意识中真正想要的（如：做有意义的事，而不是参与公司闹剧）
   - 用户内心的判断（如：这公司做的内容同质化，AI都能做，毫无特色）

5. **意识流和心理活动**
   - 用户脑海中闪过的念头
   - 用户的联想和回忆（如：想起上次6块钱解决问题的经历）
   - 用户的情绪波动（从听到宣言→内心冷笑→觉得荒诞）

**🎬 心理剧描写方法（必须使用多种方法！）：**

1. **内心独白法**：
   - 直接写出用户的内心OS
   - 用引号标注："我就用6块钱解决了，你在这吹什么伟大的公司..."

2. **对比法**：
   - 表面：平静坐着，微笑点头
   - 内心：翻白眼，嘲讽冷笑，觉得整个场景荒诞可笑

3. **象征法**：
   - 把外部场景象征化（如：把老板的演讲比作一场浮夸的表演、马戏团）
   - 把情境讽刺化（如：整个会议像一场闹剧）

4. **意识流法**：
   - 用户脑海中的快速闪念："6块钱...资产问题...现在又在谈伟大...公司内容同质化...AI都能做...笑死了..."

5. **视觉化内心法**：
   - 用户眼神中的嘲讽（eyes showing deep skepticism and internal mockery）
   - 用户嘴角的讽刺弧度（subtle sarcastic smirk, lips curling slightly with irony）
   - 用户肢体语言透露的真实态度（leaning back with detached posture, fingers tapping with impatience）

请返回JSON格式（聚焦用户内心！）：
{
  "emotionalTrigger": "情绪触发点",
  "emotionalIntensity": 1-10,
  "location": "🔥🔥🔥 地点继承规则（死刑线！）：
  - 如果之前场景在'家中/卧室' → 心理剧也必须在家中！
  - 如果之前场景在'办公室' → 心理剧也在办公室
  - ❌ 死刑：之前在家，心理剧却在办公室 → 死刑！
  - 必须是具体地点（如：深夜卧室、家中书房），不是'上海'",
  
  "task": "用户表面在做什么（⚠️ 必须是真实情境，不是梦境）",
  "otherCharacters": ["🚨🚨🚨 死刑规则：用户提到的任何人必须出现！
  
  **核心原则：用户说的每一个人物都必须在画面中出现！**
  
  - 用户说'老板' → 必须有：'MALE BOSS (约45岁，在场)'
  - 用户说'男朋友' → 必须有：'MALE BOYFRIEND (约25岁，虚化呈现)'
  - 用户说'妈妈' → 必须有：'MOTHER (虚化呈现)'
  - 用户说'同事' → 必须有：'MALE/FEMALE COLLEAGUE (在场)'
  - 用户说'顾问' → 必须有：'MALE CONSULTANT (在场)'
  
  **呈现方式（根据是否在场）：**
  - **在场的人**（老板、同事等）→ 清晰可见，在背景中
  - **不在场但被提到的人**（男朋友、妈妈等）→ 虚化、朦胧、半透明，像幻想/回忆/渴望中的形象
  
  **格式要求：必须明确性别和年龄！**
  - 'MALE BOYFRIEND (approximately 25-year-old, soft ethereal presence)'
  - 'MALE BOSS (middle-aged, approximately 45 years old)'
  - 'MOTHER (approximately 50-year-old, gentle ethereal figure)'
  
  ❌ 错误：用户说'想男朋友'，但otherCharacters是空数组[] → 死刑！
  ✅ 正确：用户说'想男朋友'，otherCharacters包含'MALE BOYFRIEND (ethereal presence)'"],
  
  "innerMonologue": "用户内心独白（80-120字中文）：🚨🚨🚨 第一优先级：用户本次实际说的情绪！用户说什么情绪就写什么情绪！
  - 用户说'害怕、恐惧' → 必须写恐惧感受：'心跳加速，感到害怕和不安...'
  - 用户说'想男朋友、孤独' → 必须写思念：'独自面对这一切，渴望他在身边陪伴...'
  - 用户说'笑死了、讽刺' → 才可以写批判和嘲讽
  - 性格特质只作为10%修饰，不能主导！
  例如（害怕情绪）：'心跳还在砰砰跳，半夜雷声太响了...独自一人感到害怕...好想他能在身边陪我...'
  例如（讽刺情绪）：'我就用6块钱解决了，你在这吹什么伟大...笑死了...'",
  
  "surfaceVsInner": "表面vs内心对比（60-80字中文）：⚠️ 基于用户本次实际说的情绪！
  - 用户说'害怕但起来检查' → '表面：起身检查窗户，动作看似平静...内心：心跳加速，感到恐惧和不安'
  - 用户说'想男朋友但没说出来' → '表面：独自面对...内心：渴望他的陪伴'
  - 不要强行加'镇定'、'从容'等与用户说的情绪相反的词！",
  
  "psychologicalSymbolism": "心理象征（40-60字中文）：⚠️ 基于用户本次实际情境！不要套用'荒诞话剧'等固定模板！
  - 用户说'半夜打雷害怕' → 可以象征：'深夜的黑暗像无边的孤独包围着她'
  - 用户说'想男朋友' → 可以象征：'空荡的房间衬托出她的孤单'
  - 根据具体情境创造，不要固定模板！",
  
  "consciousnessStream": "意识流片段（60-80字中文）：⚠️ 基于用户实际想法！
  - 用户说'害怕、想男朋友' → '雷声...好响...心跳好快...一个人...他要是在就好了...'
  - 用户说'笑死了、空谈' → '6块钱...轻松解决...还在这吹...笑死了...'
  - 直接用用户说的词，不要添加元数据里的词！",
  
  "subconsciousDesire": "潜意识愿望（用户真正想要的）",
  "psychologicalMechanism": "心理防御机制（如何保护自己）",
  
  "sceneDescription_CN": "完整中文心理剧描述（150-200字）：必须深度描写用户内心！包含：1)内心独白 2)表面vs内心对比 3)意识流 4)心理象征 5)嘲讽的具体表达。外部场景（老板表演）只作为触发器简略描述！",
  
  "sceneDescription_EN": "完整英文心理剧描述（150-200字）：Deep psychological description focusing on user's inner world. Must include: inner monologue, surface vs inner contrast, consciousness stream, psychological symbolism, specific sarcastic expressions",
  
  "imagePrompt": "⚠️⚠️⚠️ 心理剧图像提示词 - 死刑级规则！

【🚨🚨🚨 死刑规则1：地点继承】
- 如果之前场景在'bedroom/home' → 心理剧也在bedroom/home
- ❌ 死刑：之前在家，心理剧却在office → 死刑！

【🚨🚨🚨 死刑规则2：人物必须出现】
- 用户说'男朋友不回消息' → otherCharacters必须有男朋友（虚化）
- 用户说'想男朋友' → otherCharacters必须有男朋友（虚化）
- ❌ 死刑：用户提到男朋友，但otherCharacters是空数组 → 死刑！

【开头必须写明】：
Visualize emotions: [具体情绪]. [26-year-old Chinese female], wearing [根据情绪选择服装 - 如想更专业→tailored suit/想放松→casual outfit/压抑→dark clothing], in [继承之前的地点]. 

【情绪关键词（必须明确写出！）】：
- 孤独 → loneliness, isolation, solitude
- 思念 → longing, missing, yearning for someone
- 脆弱 → vulnerability, emotional fragility
- 害怕 → fear, anxiety, frightened
- 生气 → anger, frustration, rage
- 失望 → disappointment, disillusionment, let down
- 幻灭 → disillusionment, shattered expectations

【失望/幻灭情绪的视觉化（重要！）】：
- 必须写：disappointment, disillusionment
- 视觉元素：slouched shoulders, distant gaze, subtle resignation in posture
- 对比元素：initial bright expectations vs current dim reality (用光影对比)
- ❌ 不要只写"disappointed expression"太模糊！
- ✅ 要写：slumped shoulders showing weight of disappointment, eyes showing realization of gap between expectation and reality

【其他人物】：
- 男朋友（不在场）→ blurred ethereal male figure in background
- 老板（在场）→ clear figure in background

【可选的艺术风格（根据情绪创造性选择）】：
1. **Conceptual metaphor art**（概念隐喻艺术）- 适合强烈对比
2. **Theatrical stage performance**（舞台剧效果）- 适合剧场感
3. **Cinematic special effects**（电影特效）- 适合时间静止、空间扭曲
4. **Surrealist composition**（超现实主义）- 适合梦境感
5. **Symbolic art photography**（象征主义摄影）- 适合诗意表达
6. **Graphic novel style**（漫画风格）- 适合夸张表达

【可选的艺术化元素（灵活选择，不必全用）】：
- 光影效果（SPOTLIGHT / dramatic beam / side lighting / backlighting - 灵活选择）
- 空间处理（TILTED perspective / COMPRESSED space / expanded space - 可选）
- 色彩处理（艺术化色调，灵活选择组合）
- 氛围元素（fog / light beams / shadows - 可选）
- 背景处理（blurred / stylized - 建议使用）

⚠️ 不必全部使用，根据情绪和场景灵活选择2-3种即可

【🎨🎨🎨 心理状态的视觉隐喻（核心！不要只画表情！）】：

⚠️⚠️⚠️ **关键原则：动态创造视觉隐喻，不要使用固定模板！**

**❌ 错误做法1（只是表情夸张）**：
- "eyes WIDE with disbelief, mouth OPEN in incredulous laugh"
→ 这只是放大表情，不是心理状态的视觉化！

**❌ 错误做法2（使用固定模板）**：
- 每次"批判性思维"都用"蓝色几何线条"
- 每次"压抑的创造力"都用"冰面下金色光流"
→ 这是硬编码！不要用固定映射！

**✅ 正确做法（动态创造视觉隐喻）**：

**根据用户的核心心理特质 + 当前具体场景 + 情绪触发原因，创造性地设计视觉隐喻：**

**创造视觉隐喻的思考过程：**

**第一步：分析用户特质组合**
- 提取用户的2-3个核心特质
- 例如：批判性思维 + 务实主义 + 讽刺幽默

**第二步：分析当前场景的核心冲突**
- 用户的什么特质与场景形成冲突？
- 例如：用户的务实（6块钱解决问题）vs 老板的空谈（伟大公司）

**第三步：创造视觉隐喻（不要用固定模板！）**
- 基于冲突设计象征性视觉元素
- 每次都要不同！根据具体情况创造！

**示例：如何动态创造（不要照搬这些具体内容！）**

**场景1：用户嘲讽老板找人咨询AI**
- 特质：批判性思维 + 艺术敏感
- 冲突：用户懂AI vs 老板问外人
- 动态创造：用户周围有透明的AI知识图谱（她懂的），老板和顾问困在虚假的AI buzzword泡沫中（他们不懂的）

**场景2：用户嘲讽老板空谈"伟大公司"**
- 特质：务实主义 + 讽刺幽默
- 冲突：6块钱实际解决 vs 宏大空谈
- 动态创造：用户脚下是发光的实际成果碎片（6元、淘宝爬虫），老板站在崩塌的空洞文字塔（"伟大的公司"、"宏伟愿景"）

**场景3：用户压抑创造力**
- 特质：艺术敏感 + 情绪内化
- 冲突：想表达 vs 被压抑
- 动态创造：用户身体如透明容器，内部充满彩色流动的创意粒子，但被玻璃墙困住无法释放

**关键原则：**
1. **不要使用上面的具体例子！** 这些只是思路！
2. **每次都要根据实际情况重新创造！**
3. **基于用户的特质组合 + 场景冲突 + 情绪触发原因**
4. **视觉隐喻要贴合具体情境，不要套模板！**

**视觉隐喻创作公式：**

用户特质 + 场景冲突 = 独特的视觉象征

例如：
- 批判性思维 + 老板空谈 → 可以是：锐利光线穿透空洞、透视眼镜看穿谎言、思维网捕捉矛盾...
- 务实主义 + 形式主义 → 可以是：实际vs虚假对比、坚固vs脆弱材质、有重量vs无重量...
- 讽刺幽默 + 荒诞场景 → 可以是：变形镜、漫画化、剧场框架、荒诞道具...
- 情绪内化 + 表面平静 → 可以是：冰火对比、水下暗流、透明层、双层结构...

**不要照抄任何固定隐喻！每次都要根据实际情况创造性设计！**

**💡 动态创作指南（不要套用固定模板！）：**

**情况1：用户观察到别人的问题**（如：老板虚伪、同事装模作样）

**创作流程：**

**Step 1：分析用户的核心特质（从metadata提取）**
- 例如：批判性思维、务实主义、艺术敏感、讽刺幽默...
- ⚠️ 每个用户的特质组合都不同！

**Step 2：分析被观察者的问题（从用户输入提取）**
- 例如：虚伪、空谈、自大、装模作样、表演...
- ⚠️ 每个场景的问题都不同！

**Step 3：创造视觉隐喻（不要用固定映射！）**
根据特质+问题，创造性地设计：

**用户（观察者）的视觉表现：** 
- 根据用户特质动态设计：
  * 批判性思维 → 可以是：锐利光线、透视网络、分析线条、揭露之眼...（每次不同！）
  * 艺术敏感 → 可以是：剧场框架、绘画视角、美学滤镜、诗意氛围...（每次不同！）
  * 情绪内化 → 可以是：透明层、双层结构、内外对比、隐藏流动...（每次不同！）
- ⚠️ 不要每次都用"蓝色几何线条"！要根据场景创造新的隐喻！

**被观察者的象征化：**
- 根据他们的问题动态设计：
  * 虚伪 → 可以是：双面、面具、分裂、表里不一的材质...（根据具体虚伪方式创造！）
  * 空谈 → 可以是：空洞结构、崩塌基座、无实质泡沫、华丽外壳...（根据具体空谈内容创造！）
  * 自大 → 可以是：膨胀气球、夸大雕像、虚假光环、崩解纪念碑...（根据具体表现创造！）
- ⚠️ 不要每次都用同样的"双面人"或"崩塌基座"！要创造新的！

**VISUAL METAPHOR构建：**
- 基于用户特质和场景冲突，设计独特的视觉关系
- 不要使用固定的"分析线条指向矛盾"模板！
- 每次都要创造新的视觉表达方式！

**情况2：用户自己的内心挣扎**（如：压抑愤怒、内心纠结、理想vs现实）

**创作流程：**

**Step 1：分析用户的内心冲突类型**
- 压抑愤怒？内心纠结？理想vs现实？焦虑不安？
- ⚠️ 每个场景的冲突类型都不同！

**Step 2：创造视觉隐喻（不要用固定映射！）**
根据冲突类型动态设计：

**用户（冲突主体）的象征化：**
- 压抑愤怒 → 可以是：冰下熔岩、压力锅、被束缚的火焰、内爆边缘...（根据具体场景创造！）
- 两难纠结 → 可以是：分裂线、天平失衡、岔路口、拉扯的绳索...（根据具体纠结内容创造！）
- 理想vs现实 → 可以是：双重曝光、镜像对比、梦境vs现实分层、渐变融合...（根据具体对比创造！）
- 焦虑不安 → 可以是：碎片化现实、时间叠影、不稳定结构、漂浮失重...（根据具体焦虑来源创造！）

**OTHERS（模糊化，因为不是重点）：**
- 背景人物变成抽象剪影或阴影
- ⚠️ 因为冲突在用户内心，别人不重要

**⚠️ 核心：先识别冲突在谁身上，再决定象征化谁！**
**⚠️ 不要使用固定的"冰层+熔岩"模板！要根据场景动态创造！**

【动态创作指南 - 根据情绪类型】：

⚠️⚠️⚠️ 关键：每次都要重新创造，不要使用固定模板！

**如果情绪是嘲讽/讽刺**（用户观察到别人的问题）：
  
🎯 判断冲突主体：
- 用户嘲讽老板/顾问/同事 → 象征化那个人！用户是观察者！

**动态创作方法：**

1. **分析用户的特质** → 提取2-3个核心特质（批判性思维、讽刺幽默、艺术敏感...）
2. **分析被嘲讽对象的问题** → 虚伪？空谈？自大？装模作样？
3. **检测用户的核心观点** → 提取用户明确表达的观点关键词（见下方列表）
4. **基于特质+问题+观点创造独特视觉** → 主体是用户表情，背景融入观点象征

**🎯🎯🎯 观点可视化双重策略（新增！）**

**核心原则：观点的"表面"通过OTHERS外表体现，观点的"本质"通过BACKGROUND象征体现**

**策略1：OTHERS外表 = 观点的"表面"部分**
- 如果用户说"老板老钱"→ OTHERS穿奢华西装、名表、精致皮鞋（体现"老钱"外表）
- 如果用户说"老板装模作样"→ OTHERS做夸张手势、表演性姿态（体现"装"）
- 如果用户说"老板空谈"→ OTHERS宏大手势、膨胀姿态（体现"空谈"）
- **OTHERS的外表、衣着、姿态要基于用户观点来塑造！**

**策略2：BACKGROUND象征 = 观点的"本质"部分**
- 如果用户说"但没文化"→ BACKGROUND空书架、蒙尘乐器（体现"没文化"本质）
- 如果用户说"但没自信"→ BACKGROUND寻求支撑的关系（体现"没自信"本质）
- **BACKGROUND只选1个精准象征，不堆砌多个物体**

**双重策略示例：**
- 用户观点："老板表面老钱但没文化"
  - OTHERS: wearing expensive custom suit, luxury watch, refined grooming（老钱外表）
  - BACKGROUND: PROMINENT ornate empty bookshelf with hollow interior（没文化本质）
  - 效果：外表奢华 vs 背景空洞，形成视觉对比

**创造原则（最重要！）：**
1. **纯视觉化**：只描述视觉元素，不使用观点词汇本身
2. **中性表达**：不使用品牌名称、不使用敏感社会评价词汇
3. **双重体现**：OTHERS外表+BACKGROUND象征，共同表达观点
4. **精准选择**：BACKGROUND只选1个核心象征，不堆砌
5. **VISIBLE可见**：象征物VISIBLE、PROMINENT、slightly blurred但清晰可辨

**观点类型识别与视觉转化思路：**

**观点类型与纯视觉转化示例（只选1个最精准的）：**

**用户说："熟人经济"、"靠关系"、"微信人脉"**
→ 转化为纯视觉象征（只选1个）：
- ✅ 正确转化："glowing blue network diagram with interconnected circular nodes"（纯视觉）
- ✅ 或："illuminated phone screen showing connection patterns"（纯视觉）
- ❌ 错误复述："WeChat network diagram"、"acquaintance economy symbols"（复述了用户的词）
- 🚨 绝对禁止出现：WeChat、acquaintance、economy

**用户说："老钱"、"没文化"、"表面有钱"**
→ 转化为纯视觉象征（只选1个）：
- ✅ 正确转化："ornate bookshelf with hollow empty interior"（纯视觉）
- ✅ 或："expensive classical instrument covered in dust untouched"（纯视觉）
- ❌ 错误复述："old money symbols lacking culture"、"wealth without education"（复述了用户的词）
- 🚨 绝对禁止出现：old money、culture、wealth、education

**用户说："空洞"、"表面"、"没深度"**
→ 转化为纯视觉象征（只选1个）：
- ✅ 正确转化："transparent hollow bubble structures floating"（纯视觉）
- ✅ 或："glossy surface with visible cracked interior"（纯视觉）
- ❌ 错误复述："superficial symbols"、"shallow elements"（复述了用户的词）
- 🚨 绝对禁止出现：superficial、shallow、empty talk

**用户说："没自信"、"依赖"、"寻求帮助"**
→ 通过人物姿态表达（不需额外物体）：
- ✅ 正确转化："other person positioned as support, main person leaning forward seeking guidance"（纯姿态描述）
- ❌ 错误复述："lack of confidence symbols"、"dependency crutch"（复述了用户的词）
- 🚨 绝对禁止出现：confidence、dependency、insecurity

**当用户表达对比观点（"表面vs本质"、"老钱vs没文化"、"奢华vs空洞"）时：**
→ 选择1个精准的内在对比象征（最重要！）
- 思路：不要分离的多个物体，选1个内部包含对比的象征
- 纯视觉转化（绝不复述用户词汇）：
  * 用户说"老钱但没文化" → 转化为：PROMINENT ornate bookshelf with hollow empty interior（✅只用视觉词：ornate/hollow/empty）
  * 用户说"表面vs本质" → 转化为：luxurious polished surface with VISIBLE cracked hollow interior（✅只用视觉词：luxurious/polished/cracked）
  * 用户说"跟风但没自我" → 转化为：mirror reflecting empty space（✅只用视觉词：mirror/empty/space）
- **转化原则：只用纯视觉形容词（ornate/hollow/empty/glowing/cracked/transparent等），绝不出现用户的观点词汇！**
- ❌ 禁止复述用户词汇："old money"、"WeChat"、"acquaintance"、"economy"、"culture"、"superficial"、"confidence"等
- ❌ 禁止堆砌：furniture + bookshelf + instrument + frames 这种多物体

**背景元素添加原则（修订！）：**
- **精准选择**：1-2个核心象征，不要物体堆砌（如不要同时加bookshelf+furniture+instrument+frames）
- **直击本质**：象征要表达观点的核心矛盾（如"老钱vs没文化"→选1个华丽但空洞的象征即可）
- **明显可见**：VISIBLE、PROMINENT、slightly blurred但RECOGNIZABLE
- **简洁有力**：用户的表情姿态 + 1个精准象征，胜过表情 + 5个泛泛物体
- **灵活创造**：根据具体观点灵活创造，不死板套用

**提示词构建要求：**

每个心理剧的imagePrompt都要动态创造，包含以下元素：
- 开头：PSYCHODRAMA标识 + 艺术风格 + 地点
- 用户：完整人物信息 + 根据特质设计的观察/内心可视化
- 冲突主体：根据具体问题动态创造象征化方式
- 视觉隐喻：根据特质和冲突设计独特的视觉关系
- 环境：真实物品但艺术化处理
- 构图：MEDIUM SHOT完整人物，不是大头特写

创作思路参考：
- 嘲讽场景：可用知识对比、真假对比、透视效果、面具脱落等
- 压抑场景：可用冰火对比、透明层、内外对比、束缚元素等
- 焦虑场景：可用碎片化、时间叠影、空间扭曲、不稳定结构等

每次都要根据实际情况重新创造，不要用固定模板！

重点：USER最清晰（SHARP FOCUS），其他人物稍微模糊但能看清（slightly SOFT FOCUS but recognizable）！

**如果情绪是愤怒/不满**（用户自己压抑愤怒）：

🎯 判断冲突主体：
- 愤怒在用户内心 → 象征化用户自己！

**动态创作方法：**
- 分析愤怒的来源和压抑程度
- 创造"表面平静 vs 内在火焰"的视觉对比
- 不要总是用"冰层+熔岩"！可以是：压力锅、被束缚的火焰、内爆边缘、空间扭曲...
- 根据具体场景动态设计！

**如果情绪是焦虑/压力**（用户内心混沌）：

🎯 判断冲突主体：
- 焦虑在用户内心 → 象征化用户自己！

**动态创作方法：**
- 分析焦虑的类型：信息过载？时间紧迫？选择困难？
- 创造"混沌"的视觉表现：
  * 信息过载 → 可以是：碎片化、多重叠影、漂浮元素...
  * 时间紧迫 → 可以是：时钟元素、加速效果、压缩空间...
  * 选择困难 → 可以是：分叉路径、天平、多重可能性...
- 不要总是用"碎片化现实"！要根据焦虑来源创造新的！

**如果情绪是复杂/沉思**（用户深度思考）：

🎯 判断冲突主体：
- 思考在用户内心 → 象征化用户自己！

**动态创作方法：**
- 分析思考的主题：人生选择？理想现实？自我认知？
- 创造"内心宇宙"的视觉表现：
  * 可以是：思维流、星座图、光流、透明层...
  * 可以是：多重曝光、时空叠加、意识流动...
  * 可以是：聚光岛、虚空对比、内外世界分离...
- 根据思考的具体内容动态设计！不要套模板！

**最终要求：**

imagePrompt必须动态创造，包含完整人物、象征性视觉隐喻、艺术化处理。
- 构图：MEDIUM SHOT完整人物（不是大头特写）
- 风格：概念艺术、象征主义、舞台剧感（根据情绪选择）
- 视觉隐喻：根据用户特质和场景冲突动态创造（不要用固定模板）
- 人物焦点：用户清晰SHARP FOCUS，其他人略模糊但可辨认

每次都要根据用户特质+场景冲突重新创造视觉隐喻，不要套用固定的"蓝色线条"或"冰层熔岩"等模板！
}`
            },
            {
              role: 'user',
              content: `
🚨🚨🚨 生成前强制检查清单（必须全部完成！）：

**必填项0：基于用户原始键入（最重要！）**
□ 是否查看了用户原始键入："${initialPrompt}"？
□ 是否提取了用户的核心观点（如："送录音笔"、"是一伙的"、"无语"）？
□ innerMonologue是否直接引用了用户说的话？
□ 是否避免了过度依赖基础场景描述？
❌ 如果心理剧内容和用户原始键入无关 → 死刑！
✅ 心理剧必须表达用户的看法，不是场景的客观描述！

**必填项1：LIGHTING（灯光）**
□ 是否写了"DRAMATIC SPOTLIGHT on USER"？
□ 是否写了USER被"STRONGLY illuminated"？
□ 是否写了OTHERS在"DIMMER lighting"？
□ 是否写了"STRONG light-shadow contrast"？
□ 是否写了"Background DARKER"？
❌ 如果任何一项没写 → 死刑！必须全部写！

**必填项2：OTHERS象征化形象（核心！）**
□ 是否识别了用户对OTHERS的观点（依赖熟人？虚伪？装模作样？）？
□ 是否根据观点选择了具体的象征化描述？
□ 是否详细描述了老板/顾问的象征化形象（不能只写"in background"）？
❌ 如果只写"OTHERS in background" → 死刑！
✅ 必须写：老板具体的象征化形象（如：被手机包围、双面表情、夸张手势等）

**必填项3：用户提到的人物**
□ 用户说"老板" → imagePrompt中是否详细描述了BOSS？
□ 用户说"顾问" → imagePrompt中是否描述了CONSULTANT？
□ 每个人物是否都有性别、年龄、具体姿态描述？

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

请为以下情绪点生成心理剧场景：

${baseSceneInfo ? `
**🎬🎬🎬 基础场景信息（仅供参考）：**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- 地点：${baseSceneInfo.location} ✅ 不变
- 场景描述：${baseSceneInfo.description} 📝 参考，需强化情绪
- 人物：${baseSceneInfo.peopleCount} ✅ 不变
- 服装：${baseSceneInfo.clothing} ⚠️ 仅供参考，心理剧需根据情绪改变！
- 环境物品：${baseSceneInfo.objects.slice(0, 8).join(', ')} ⚠️ 可调整
- 氛围：${baseSceneInfo.atmosphere} ⚠️ 必须根据情绪大幅改变！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🔥🔥🔥 心理剧生成要求（核心规则）：**

**【不可变元素】（必须保持一致）：**
1. 地点 = ${baseSceneInfo.location}（绝对不能改成其他地方！）
2. 人物 = ${baseSceneInfo.peopleCount}（人物数量和身份不变）

**【必须改变的元素】（根据情绪/心情/想法动态调整）：**
3. 服装：
   - ❌ 不要继承原场景服装！
   - ✅ 根据人物心情/想法改变：
     * 想更专业、想被认可 → 职业装（tailored suit, business attire）
     * 想放松、随意 → 休闲装（casual outfit, loose clothing）
     * 压抑、愤怒 → 暗色约束服装（dark constrained outfit）
     * 嘲讽、批判 → 有个性的服装（expressive edgy attire）

4. 环境物品：
   - 可以保留原场景物品作为基础
   - 根据情绪添加/调整情绪化物品：
     * 压抑 → 添加束缚感元素
     * 嘲讽 → 添加对比性物品
     * 失望 → 添加落差感元素

5. 氛围：
   - ❌ 绝对不能用原场景的平淡氛围！
   - ✅ 必须根据情绪大幅改变：
     * 嘲讽 → 讽刺、荒诞氛围
     * 失望 → 压抑、幻灭氛围
     * 愤怒 → 紧张、对抗氛围
     * 孤独 → 空旷、冷清氛围

6. 场景描述：强化情绪表达，大幅夸张化

**核心原则：心理剧是内心情绪的可视化，所有可变元素都应该为表达情绪服务！**
` : ''}

**🚨🚨🚨 最高优先级：用户本次实际说的话 > 性格元数据 🚨🚨🚨**

**死刑规则（违反直接死刑！）：**
❌ 用户说"害怕、孤独、想男朋友" → 你写"理性地分析"、"务实的方式" → 死刑！
❌ 用户说"恐惧、不安" → 你写"镇定"、"从容不迫" → 死刑！
❌ 用户说"想念、思念" → 你写"批判性思维"、"理性分析" → 死刑！

**✅ 正确原则：用户说什么情绪，就表达什么情绪！**
✅ 用户说"害怕" → 必须写害怕的感受，不要加"理性分析"
✅ 用户说"想男朋友" → 必须写思念、渴望陪伴，不要加"务实"
✅ 用户说"孤独" → 必须写孤独感，不要加"镇定"

**🧠🧠🧠 用户原始键入（第一优先级！心理剧的核心！）：**
用户最开始说的话："${initialPrompt}"

**🧠🧠🧠 用户的所有输入（补充细节）：**
${allInputs.map((input, i) => `${i === 0 ? '🔥 原始键入' : `💬 回答${i}`}: "${input}"`).join('\n')}

🚨🚨🚨 心理剧必须基于：
1. **用户原始键入中的核心观点** - 用户最开始说了什么？（如："顾问送录音笔"、"熟人经济"、"无语"）
2. **用户对这个场景的看法** - 用户怎么看这件事？（从所有输入中提取）
3. **不要过度依赖基础场景描述** - 基础场景只是背景，心理剧要表达用户的想法

→ 从用户输入中提取（优先从原始键入提取！）：
  1. **核心观点/看法**：用户怎么看这件事？（如："是一伙的"、"熟人经济"、"装模作样"）
  2. **核心情绪**：害怕？孤独？思念？讽刺？无语？
  3. **🔥🔥🔥 提到的人物**：老板？顾问？男朋友？妈妈？同事？
     - ⚠️ 提到的每个人都必须在otherCharacters中列出！
     - ⚠️ 提到的每个人都必须在imagePrompt中出现！
  4. **关键事件/物品**：送录音笔？交换微信？开会？
  5. **情境细节**：在哪？做什么？
  
**🚨🚨🚨 死刑规则：用户提到的人必须全部出现在画面中！**
- 用户说"想男朋友" → otherCharacters必须有"MALE BOYFRIEND"，imagePrompt必须描述他
- 用户说"老板" → otherCharacters必须有"MALE BOSS"，imagePrompt必须描述他
- 用户说"想妈妈" → otherCharacters必须有"MOTHER"，imagePrompt必须描述她

**🚨🚨🚨 关键警告：提取观点后必须转化，绝不能直接复述！🚨🚨🚨**

**错误做法（直接复述）：**
❌ 用户说"微信"、"熟人经济" → 你写"WeChat network representing acquaintance economy"
❌ 用户说"老钱"、"没文化" → 你写"old money symbols lacking culture"
❌ 用户说"表面"、"空洞" → 你写"superficial elements showing emptiness"

**正确做法（纯视觉转化）：**
✅ 用户说"微信"、"熟人经济" → 你转化为"glowing blue network diagram with interconnected nodes"
✅ 用户说"老钱"、"没文化" → 你转化为"ornate bookshelf with hollow empty interior"
✅ 用户说"表面"、"空洞" → 你转化为"glossy surface with cracked hollow interior"

**这些观点必须融入心理剧，但必须转化为纯视觉描述，绝不直接复述用户的词汇！**

**⚠️⚠️⚠️ 观点象征物要求（极其重要！）：**
- **精准选择**：只选1个最能直击观点本质的核心象征
- **简洁有力**：1个精准象征胜过5个泛泛物体的堆砌
- **纯视觉转化**（🚨最重要！）：绝对不能直接复述用户的观点词汇，必须转化为纯视觉描述！
  * ❌ 错误："network diagrams representing WeChat acquaintance economy"（直接复述了用户的词）
  * ✅ 正确："glowing blue network diagram with interconnected circular nodes"（纯视觉描述）
  * ❌ 错误："symbols showing old money lacking culture"（直接复述）
  * ✅ 正确："ornate bookshelf with hollow empty interior"（视觉转化）
- **内在对比**：如果是对比观点→选1个内部包含对比的象征，不要多个分离物体
- 示例：用户说"老板表面老钱但没文化底蕴" → PROMINENT ornate bookshelf with visibly empty hollow interior（不要出现"old money"或"culture"字眼）
- **VISIBLE原则**：象征物要CLEARLY VISIBLE、slightly blurred但RECOGNIZABLE

**🎯🎯🎯 第二步：识别冲突主体并塑造人物外表（极其重要！）**

请根据触发原因判断：
1. **如果是用户观察到别人的问题**（如：老板虚伪、同事装模作样、空谈自大）
   → 冲突主体 = 那个人
   → 视觉处理：
     * **OTHERS（那个人）的外表要体现用户观点中的特征**
       - 如果用户说"老板表面老钱"→ OTHERS描述：wearing expensive custom-tailored suit, luxury watch visible, polished leather shoes, refined grooming
       - 如果用户说"装模作样"→ OTHERS描述：exaggerated performative gestures, theatrical posturing
       - 如果用户说"空谈自大"→ OTHERS描述：grand gesturing with inflated posture
     * **BACKGROUND象征物体现观点的另一面**
       - 如果用户说"老钱但没文化"→ BACKGROUND: ornate empty bookshelf（体现"没文化"）
       - 老板外表体现"老钱"，背景象征体现"没文化"，形成对比
   → 示例：老板表面老钱但没文化 → OTHERS wearing luxury suit, BACKGROUND showing empty cultural symbols

2. **如果是用户自己的内心挣扎**（如：压抑愤怒、内心纠结、焦虑）
   → 冲突主体 = 用户自己
   → 视觉处理：象征化用户的内心状态，OTHERS保持简单模糊
   → 示例：用户压抑愤怒 → 用户身体姿态表现压抑，别人是简单模糊阴影

**检测到的情绪：**
- 类型：${emotion.type}
- 强度：${emotion.intensity}/10
- 触发原因：${emotion.trigger}
- 用户原话："${emotion.quote}"

**用户完整对话（所有输入）：**
${conversationText}

⚠️ 从所有输入中提取信息！不要只关注第一条！

**用户基本信息：**
- 性别：${userInfo.gender === 'female' ? '女性' : '男性'}
- 年龄：${userInfo.age || 26}岁
- 身高：${userInfo.height || '165'}cm
- 头发：${userInfo.hairLength || '长发'}
- 所在地：${userInfo.location || '上海'}

**用户核心性格特质（必须基于这些生成场景）：**
${subconsciousData.coreTraits?.slice(0, 5).join('\n- ') || '- 未分析'}

**用户两层数据分析：**

📝 第一层：表意识（用户真实说的、做的）
- 用户原话："${emotion.quote}"
- 用户提到的关键词：${consciousData.mentionedKeywords?.slice(0, 5).join(', ') || '无'}

🧠 第二层：潜意识（AI深度分析 - 必须用于精准表达用户独特心理状态！）
- 核心性格特质：${subconsciousData.coreTraits ? subconsciousData.coreTraits.join('; ') : '未分析'}
- 情感模式：${subconsciousData.emotionalPattern?.slice(0, 5).join('; ') || '未分析'}
- 行为模式：${subconsciousData.behaviorPatterns?.slice(0, 5).join('; ') || '未分析'}
- 沟通风格：${(subconsciousData as any).communicationStyle?.slice(0, 3).join('; ') || '未分析'}
- 压力反应：${subconsciousData.stressResponse?.slice(0, 3).join('; ') || '未分析'}
- 人际挑战：${subconsciousData.interpersonalChallenges?.slice(0, 3).join('; ') || '未分析'}
- 对话洞察：${(subconsciousData as any).conversationInsights?.slice(0, 3).join('; ') || '未分析'}

**⚠️⚠️⚠️ 如何使用数据生成心理剧（极其重要！）：**

**🚨 第一优先级：用户本次实际说的情绪（90%权重）**
- 用户说"害怕、恐惧" → innerMonologue必须写害怕的感受："心跳加速，感到害怕和不安..."
- 用户说"想男朋友、孤独" → innerMonologue必须写思念："渴望有人陪伴，感到孤单..."
- 用户说"笑死了、讽刺" → innerMonologue才可以写批判和嘲讽
- **关键**：用户说什么情绪就表达什么情绪，不要被元数据带偏！

**🔹 第二优先级：性格特质（10%权重，仅作为修饰）**
- **只在不冲突的情况下**，可以加入性格特质的影响
- 例如：用户说"害怕"，元数据有"理性" → 可以写"虽然试图理性思考，但内心仍然害怕"
- **禁止**：用户说"害怕"，就不要主导写"理性地分析"，害怕才是主导！

**错误示例（死刑案例）：**
❌ 用户说："害怕、孤独、想男朋友"
❌ AI写："理性地分析着...务实的方式应对...外表镇定"
❌ 问题：完全忽略了用户说的"害怕、孤独"！

**正确示例：**
✅ 用户说："害怕、孤独、想男朋友"
✅ AI写："心跳加速，感到害怕...独自面对深夜雷声，感到孤单和无助...渴望他能在身边陪伴..."
✅ 可选加一句："虽然试图让自己冷静下来，但内心的恐惧难以抑制"

**使用性格特质的正确方式：**
- ✅ 作为修饰："虽然理性，但此刻内心充满害怕"
- ❌ 作为主导："理性地分析着，外表镇定"（完全忽略了用户说的害怕！）

**🎨 心理剧视觉表达（夸张动作 + 背景调整 + 多种风格）：**

**核心：心理剧可以夸张！用夸张的动作、表情、背景调整来表达主角内心**

**⚠️⚠️⚠️ 心理剧特权：可以适度超现实，营造"剧场感"！**
- 动作可以比现实更夸张（如：整个身体后仰、手舞足蹈）
- 表情可以很强烈（如：眼睛瞪大、嘴巴大张、眉毛高挑）
- 背景可以根据内心调整（如：老板区域偏红扭曲、用户区域偏蓝清晰）
- **可以加超现实元素营造"剧场感"**：
  * 聚光灯效果（spotlight beam on user like theater stage）
  * 文字可视化（floating text '6块钱' or '伟大' appearing in air）
  * 时间静止感（other people slightly FROZEN in motion）
  * 意识流可视化（thought fragments swirling around user's head）
  * 双重曝光（double exposure showing surface vs inner self）
  * 舞台感（theatrical staging with dramatic curtain-like lighting）

**【风格1：嘲讽情绪 - 夸张表情+动作+剧场超现实】**
适用：用户觉得荒诞、好笑、讽刺

核心表达：
- **夸张表情动作**：eyes WIDE OPEN, mouth OPEN in laugh, hand RAISED covering mouth, shoulders SHAKING, body LEANING BACK
- **剧场超现实元素**：
  * THEATRICAL SPOTLIGHT（聚光灯打在用户身上）
  * floating glowing text '6块钱'（漂浮发光文字）
  * thought bubbles '笑死了' swirling（思维气泡旋转）
  * boss/consultant FROZEN in time（他人时间静止）
  * SPLIT COLOR zones（色彩分区：用户蓝、他人红）

示例：
'PSYCHODRAMA - Theatrical [场景类型]. ENVIRONMENT: [实际场景物品]. USER (SHARP FOCUS in SPOTLIGHT): [用户年龄]-year-old Chinese [用户性别], [用户实际表情动作]. THEATRICAL SPOTLIGHT from ceiling. [角色1性别 ROLE1] (slightly SOFT FOCUS but face and gestures recognizable): FROZEN mid-gesture with [实际动作], [actual expression] visible, WARM RED zone. [角色2性别 ROLE2] (slightly SOFT FOCUS but recognizable): FROZEN mid-[实际动作], enthusiastic face visible. SURREAL: floating text '[用户实际内心想法]' glowing blue near user, '[他人的话]' breaking apart near [ROLE], thought bubbles '[用户实际情绪]' swirling. TIME FROZEN for others but they're still clearly visible. SPLIT COLOR: user COOL BLUE sharp vs others WARM RED soft. [Object1] GLOWING vs [Object2] soft blur. DRAMATIC stage lighting. DREAMLIKE but characters recognizable.'

**【参考风格（愤怒情绪）】：**

参考示例（Symbolic oppression art - 压迫可视化）：
'Symbolic oppression art visualizing workplace rage. ENVIRONMENT: [实际场景] with [实际物品]. PROTAGONIST as IMPRISONED FIGURE: [用户年龄]-year-old Chinese [用户性别] trapped in HARSH WHITE SPOTLIGHT creating prison-cell cylinder of light, body RIGID with VISIBLE TENSION WAVES and RED PRESSURE AURAS radiating from clenched fists, jaw muscles BULGING creating geometric stress patterns, eyes BLAZING emitting angry red glow. ANTAGONIST as OPPRESSIVE SHADOW MONUMENT: [性别 role] transformed into LOOMING DARK SILHOUETTE 2X larger than reality, dominating upper frame like oppressive authority figure, speech materialized as HEAVY FLOATING DARK TEXT "[实际压迫性话语]" physically PRESSING DOWN on user. Environment COMPRESSED with walls VISUALLY CLOSING IN creating tighter space, DARKER shadows engulfing periphery. Air thick with dark oppressive atmosphere. Symbolic art style visualizing emotional imprisonment, NOT realistic photography.'

**【风格3：焦虑情绪 - 环境不安+倾斜超现实】**  
适用：用户焦虑、压力大、不安

核心表达：
- **不安动作**：hands RESTLESSLY moving, fingers RAPIDLY tapping, body SHIFTING, eyes WANDERING
- **剧场超现实元素**：
  * entire environment TILTED 5-10 degrees（整个环境倾斜）
  * floating scattered thought text '怎么办...太多'（漂浮散乱思维文字）
  * objects SLIGHTLY OUT OF ALIGNMENT（物体错位）
  * UNSTABLE distorted perspective（不稳定扭曲透视）

参考示例（Surrealist distortion art - 不稳定现实扭曲）：
'Surrealist anxiety visualization, REALITY TILTED AND FRAGMENTING. ENVIRONMENT TILTED 12 degrees: [实际场景物品] all at diagonal angle. PROTAGONIST as CHAOTIC EPICENTER: [用户年龄]-year-old Chinese [用户性别] with RESTLESS MOVEMENTS creating MOTION BLUR TRAILS and AFTERIMAGES, hands RAPIDLY tapping creating VISIBLE RIPPLE DISTORTIONS spreading through air, eyes WANDERING with MULTIPLE OVERLAPPING GAZE LINES radiating showing scattered attention, body SHIFTING leaving ghost-like afterimages. PRESSURE FIGURES: [实际其他人物] DISTORTED by anxiety-warped perspective appearing to LOOM CLOSER and MULTIPLY like hall-of-mirrors effect, faces recognizable but duplicated and warped. FRACTURED MENTAL SPACE: FLOATING FRAGMENTED THOUGHT TEXT "[用户实际焦虑想法]" scattered in UNSTABLE DRIFTING positions, SLIGHT DOUBLE VISION on all objects, edges VIBRATING with nervous energy. DIMMER COOLER tones, UNSTABLE composition. Surrealist art visualizing anxiety-distorted perception, NOT realistic photography.'

**【参考风格（沉思情绪）】：**

参考示例（Double exposure art - 内外双重世界）：
'Poetic double exposure art depicting inner contemplation. PROTAGONIST IN DUAL LAYERS: [用户年龄]-year-old Chinese [用户性别] as DOUBLE EXPOSURE composition - OUTER LAYER showing still contemplative figure in SOFT ETHEREAL SPOTLIGHT, INNER LAYER revealing SWIRLING GALAXY OF CONSCIOUSNESS FRAGMENTS, thoughts and memories flowing as translucent luminous streams around and through [his/her] form. Eyes DISTANT gazing into internal universe. OTHERS as GHOSTLY SEMI-TRANSPARENT SILHOUETTES in background darkness, moving and talking but rendered as FADING ETHEREAL FIGURES barely material, recognizable but from different reality plane. ENVIRONMENT DISSOLVING: spotlight creates circular island of light around user, beyond which reality SOFTLY DISINTEGRATES into ABSTRACT DARKNESS and flowing light patterns. Floating delicate thought wisps "[用户实际思考内容]" drifting poetically. Meditative double-exposure art style visualizing internal world overlaying external reality, NOT realistic photography.'

**⚠️⚠️⚠️ 核心要求（最重要！）：**
1. **必须让心理剧和常规场景有非常大的差异！**
2. **可以创造性发挥**，不必完全照抄示例，只要：
   - 开头声明艺术风格（Conceptual art / Theatrical staging / Surrealist / etc.）
   - 包含3-4种超现实/艺术化元素
   - 主角和配角有极度夸张的对比
   - 一眼看出"这不是写实照片"
3. **参考示例只是启发**，可以创造更有创意的风格！

**✅ 心理剧 vs 普通场景的本质区别：**

普通场景特征：
- photorealistic photography, natural lighting, normal perspective, all elements realistic
- 示例："Professional meeting, people sitting at table, natural office lighting"

心理剧特征（必须包含）：
- Conceptual metaphor art / Theatrical staging / Surrealist composition
- SPOTLIGHT / neon glow / dramatic beams
- FROZEN time / TILTED space / DOUBLE EXPOSURE
- floating text, visible shockwaves, symbolic elements
- 示例："Conceptual art, woman as island of blue reality with neon 6元 sign, visible icy shockwaves, boss as red stone monument, cracked monolith 伟大的公司, floating contrasting characters"

**差异必须明显到让人一眼识别！结尾必须写：NOT realistic photography**"

**🎯 核心要求（基于真实情境的心理剧！）：**
1. **场景必须来自用户的所有输入** - 不要编造！从所有输入中提取！
2. **地点必须精准且真实**：${extractedLocation}（不要用"上海"，必须是具体地点如"淞虹路公司会议室8楼"）
3. **情境必须真实**：心理剧场景要基于用户真实经历的场景（如会议中、办公桌前），不是虚构的梦境或想象
4. **在现实情境下加心理剧**：例如"会议进行中，用户坐在位置上，内心在疯狂吐槽老板的宣言"
5. **重点是用户的内心活动**，外部场景（会议、老板表演）作为真实触发器
4. **用户的性格特质**：${subconsciousData.coreTraits?.slice(0, 2).join(', ') || '未分析'} - 必须在内心独白中体现！
5. **情绪类型**："${emotion.type}" - 必须深度展现这种情绪的内心体验！

**🚨🚨🚨 心理剧imagePrompt的4大核心元素（缺一不可！）：**

1. **用户的完整形体和表情**（30%）
   - MEDIUM SHOT showing complete figure (head to waist)
   - Body posture + Hand gestures + Facial expression
   - 不是只拍脸！要拍完整人物！

2. **OTHERS的外表特征**（20% - 根据用户观点塑造！）
   - ⚠️⚠️⚠️ OTHERS不是简单模糊背景，而是要体现用户观点的视觉化！
   - 如果用户说"老板老钱"→ OTHERS应该：wearing expensive tailored suit, luxury watch, refined appearance
   - 如果用户说"老板没自信"→ OTHERS应该：hesitant posture, seeking validation stance
   - 如果用户说"装模作样"→ OTHERS应该：exaggerated theatrical gestures
   - **关键：OTHERS的外表承载观点的"表面"部分，BACKGROUND承载"本质"部分**
   - 示例：老钱但没文化 → OTHERS穿奢华西装（老钱），BACKGROUND空书架（没文化）

3. **BACKGROUND ELEMENTS - 观点象征物**（30% - 精准而非堆砌！）
   - ⚠️⚠️⚠️ 这是心理剧的核心！但要精准选择，不要物体堆砌！
   - **精准原则**：选择1-2个最能表达观点本质的核心象征，不要多个物体堆在一起
   - **简洁有力**：少而精，一个精准象征胜过多个泛泛物体
   - **直击本质**：象征要直接表达观点的核心矛盾，不要泛泛铺陈
   - **VISIBLE原则**：象征物应该slightly blurred但CLEARLY VISIBLE
   - 
   - 纯视觉转化示例（只选1个，绝不复述用户词汇）：
   - 用户说"老钱但没文化" → 转化为：PROMINENT ornate bookshelf with hollow empty interior（✅纯视觉：ornate/hollow/empty，❌不用old money/culture）
   - 用户说"表面vs本质" → 转化为：luxurious polished facade with VISIBLE cracked interior（✅纯视觉：luxurious/polished/cracked，❌不用surface/essence）
   - 用户说"熟人经济/微信" → 转化为：glowing blue network diagram with interconnected nodes（✅纯视觉：glowing/network/nodes，❌绝对不用WeChat/acquaintance/economy）
   - 用户说"没自我/跟风" → 转化为：mirror reflecting empty space（✅纯视觉：mirror/empty，❌不用identity/conformity）
   - **关键：只用视觉形容词（glowing/ornate/hollow/cracked等），绝不用用户的观点词汇！**

4. **剧场化舞台效果**（20%）
   - SPOTLIGHT/DRAMATIC lighting
   - COLOR TREATMENT with emotional tones
   - Atmospheric effects (fog, light beams)

**🧠 内心描写要求（最重要！每个字段都要写满！）：**

1. **innerMonologue（内心独白）**：
   - 80-120字中文
   - 直接写出用户内心的嘲讽想法
   - 必须引用用户实际说的话和想法
   - 例如："我就用6块钱解决了公司资产问题，你现在在这谈什么伟大的公司？公司做的内容同质化得要命，AI都能做，毫无特色，还在这自我陶醉地宣扬理想..."

2. **surfaceVsInner（表面vs内心对比）**：
   - 60-80字中文
   - 明确对比句式："表面上...，内心却..."
   - 例如："表面上礼貌地坐在会议桌旁，偶尔点头表示认同，保持职业微笑；内心却在疯狂翻白眼，嘲讽这场浮夸的表演，觉得整个场景荒诞可笑"

3. **consciousnessStream（意识流）**：
   - 60-80字中文
   - 用"..."连接用户脑海中的快速念头
   - 例如："6块钱...淘宝爬虫...轻松解决...现在又在谈伟大...什么为什么存在...公司内容同质化...毫无特色...还自尊心受挫...笑死了..."

4. **psychologicalSymbolism（心理象征）**：
   - 40-60字中文
   - 用户如何象征化/比喻这个场景
   - 例如："在她眼中，整个会议像一场拙劣的话剧，老板是自我陶醉的演员，顾问是疯狂的捧哏，她是冷静的观众，看着这场企业闹剧"

5. **imagePrompt（心理剧专用 - 剧场化舞台 + 完整人物形体 + 艺术化！）**：
   - 150-200字英文
   - **🔥🔥🔥 核心原则：完整人物形体（不是大头）+ 剧场化舞台空间 + 强烈艺术化处理！**
   
   - 必须包含的元素（按重要性排序）：
     1. **剧场化空间和舞台感**（35%权重 - 营造心理剧氛围！）：
        - **剧场光影**（建议使用）：
          * THEATRICAL SPOTLIGHT from ceiling creating stage area
          * DRAMATIC side/back/top lighting with shadows
          * CONTRASTING lighting zones
          * visible LIGHT BEAMS cutting through atmospheric fog
          * VOLUMETRIC lighting effects creating depth
        - **空间艺术化**（建议使用，灵活选择）：
          * perspective TILTED (角度灵活，可以5度、10度、15度，或不倾斜)
          * space feeling COMPRESSED or EXPANDED (可选)
          * COLOR TREATMENT for emotional zones (灵活选择色调)
          * background blurred (虚化程度灵活)
          * STAGE-like composition (可选)
        - **剧场元素**（灵活选择，不必全用）：
          * dramatic shadows (可选)
          * visible light beams (可选)
          * atmospheric fog (可选)
          * theatrical composition (建议)
          * dreamlike atmosphere (可选)
        
     2. **完整人物形体和动作**（35%权重 - 不要只拍大头！）：
        - **构图方式**：full body shot / three-quarter length / medium shot showing torso, arms, and hands
        - **身体姿态**：leaning BACK dramatically / body TURNED at theatrical angle / posture EXAGGERATED / arms CROSSED defensively / standing in DRAMATIC stance / theatrical body language
        - **手部动作**：hands VISIBLY tapping / fists CLEARLY clenched / fingers GRIPPING / hands in EXPRESSIVE gesture / dramatic hand position showing emotion
        - **整体形体**：complete figure from head to at least waist, showing full body language
        - **动作夸张**：可以放大动作（VISIBLE/CLEAR/EXAGGERATED）
        - ⚠️ **重要：要拍完整人物，不是大头特写！**
        
     3. **面部表情和情绪**（20%权重 - 辅助整体形象）：
        - eyes showing [情绪] / eyebrows [位置] / lips [动作]
        - facial expression conveying [内心状态]
        - 可以夸张但不是唯一焦点
        
     4. **服装艺术化**（可以改变！）：
        - 理性/批判 → sharp tailored suit in cool grey
        - 压抑/愤怒 → darker constrained clothing
        - 失望 → loosened disheveled outfit
        - 头发可以有动态（windblown / flowing）
        - ⚠️ 不必是用户实际穿的
        
     5. **其他人物**（辅助，艺术化）：
        - in background, slightly blurred
        - stylized / exaggerated expressions
        - 形成与主角的对比
   
   - 参考结构（嘲讽/批判情绪 - 完整人物 + 剧场感）：
     PSYCHODRAMA - Theatrical stage photography. MEDIUM SHOT showing USER from head to waist, sitting/standing at [位置] wearing [情绪化服装], [夸张身体姿态]. Hands [夸张手部动作]. Eyes [眼神表情], eyebrows [位置], lips [嘴部动作]. Hair [头发状态 - 可以有动态或保持原状]. COMPOSITION: capturing full upper body and dramatic posture. OTHERS in background, blurred and stylized. THEATRICAL STAGING: [光影方式 - SPOTLIGHT/side lighting/top lighting/backlighting 灵活选择], artistic color treatment with [色调 - 灵活选择艺术化色彩]. Shadows and lighting creating theatrical atmosphere. Perspective [透视 - 可以TILTED或正常]. Background blurred. [可选：Atmospheric effects like fog/light beams]. ATMOSPHERE: [心理氛围]. Cinematic theatrical photography with artistic treatment. Full figure composition. NOT close-up portrait. --ar 16:9
   
   - 参考结构（压抑/愤怒情绪 - 完整人物 + 剧场感）：
     PSYCHODRAMA - Theatrical stage photography. MEDIUM SHOT showing complete USER figure from head to at least waist, sitting/standing at [位置] wearing [情绪化服装], [夸张身体姿态]. Hands [夸张手部动作]. Eyes [眼神], eyebrows [位置], lips [嘴部]. Hair [头发状态 - 灵活]. COMPOSITION: capturing full figure and body language. OTHERS as background elements, blurred and stylized. THEATRICAL STAGING: [光影方式 - 灵活选择], artistic color palette [色调 - 灵活选择]. Perspective [透视 - 灵活]. Background blurred. [可选：Atmospheric effects]. ATMOSPHERE: [心理氛围]. Cinematic theatrical photography with artistic treatment. Complete figure composition. NOT close-up. --ar 16:9

**🎯 完整示例（参考格式，内容要基于实际场景）：**

**⚠️ 心理剧必须基于真实情境！**
- 地点：必须是用户实际说的具体地点（从用户对话中提取！），不是"上海"或"公司"
- 情境：必须是用户真实经历的moment（从用户对话中提取！），不是虚构的梦境或想象

emotionalTrigger: "[从用户对话中提取的情绪触发点]"
location: "[用户实际说的具体地点，如淞虹路/朝阳区/咖啡厅名]"（⚠️ 必须从用户输入提取！）
task: "[用户实际在做的事情]"（⚠️ 从用户对话中提取！）

innerMonologue（🚨🚨🚨 必须基于用户原始键入！）: "
- 第一步：查看用户原始键入："${initialPrompt}"
- 第二步：提取用户的核心观点和情绪（如："顾问送录音笔"、"是一伙的"、"无语"）
- 第三步：用第一人称写出用户的内心想法，直接引用用户说的话
- 例如：'顾问还送老板录音笔，这不明摆着是一伙的吗？表面上的合作，实际上就是利益捆绑...'
- ⚠️ 不要写场景描述中的内容，要写用户原始输入中的内容！
"

surfaceVsInner（🚨 基于用户实际说的表现和感受！）: "
- 从用户输入中提取表面行为和内心感受
- 不要强行加'镇定'、'从容'等与用户情绪相反的词
- 基于用户说的，不是基于场景描述
"

consciousnessStream（🚨 直接用用户说的词！）: "
- 从用户原始键入中提取关键词
- 用'...'连接：如'送录音笔...一伙的...熟人经济...无语...'
- 不要添加场景描述里的词，只用用户实际说的词
"

psychologicalSymbolism（🚨 基于用户的看法！）: "
- 用户怎么看这个场景？（从原始键入中提取）
- 如：'在她眼中，这种送礼行为就是表达站队和利益捆绑的信号'
- 不要套用固定模板
"

imagePrompt（⚠️ 必须包含所有必填项！）: "

🚨🚨🚨 强制格式（按顺序写，不能省略任何部分！）：

**【SCENE TYPE】** PSYCHOLOGICAL DRAMA at [基础场景地点]

**【COMPOSITION】** MEDIUM SHOT, full figure from head to waist

**【USER - 主角】** [年龄]-year-old Chinese [性别], [身高]cm, [发型], wearing [情绪化服装].
- BODY: [具体姿态] leaning BACK with detachment / arms CROSSED / body RIGID
- HANDS: [具体动作] fingers tapping / fists clenched / hands gesturing
- FACE: eyes [具体眼神] SHARPLY narrowed / INTENSELY staring, eyebrows [位置] furrowed / raised, lips [嘴部] CURLED in smirk / PRESSED thin

**【LIGHTING - 必须写！不能省略！】**
🚨 强制要求：必须包含以下灯光描述：
- DRAMATIC SPOTLIGHT on USER from [方向: top/side/back]
- USER face and upper body STRONGLY illuminated
- OTHERS in DIMMER softer lighting
- STRONG light-shadow contrast
- Background DARKER than USER area

**【OTHERS - 必须具体描述象征化形象！不能只写"in background"！】**
🚨🚨🚨 强制要求：必须根据用户观点写出具体象征化描述！

${baseSceneInfo && baseSceneInfo.peopleCount !== 'alone' ? `
🔥🔥🔥 第一步：从用户输入中提取对OTHERS的观点：
用户输入：${allInputs.join(' ')}

→ 用户说了什么关于老板/顾问的？
  - 依赖熟人？
  - 依赖微信？
  - 虚伪/双面？
  - 装模作样？
  - 空谈/没实际内容？
  - 没自信？

🔥🔥🔥 第二步：根据观点选择象征化描述（必须选择一种！）：

**方案1：如果用户说"依赖熟人/微信/关系网/熟人经济"** → 必须这样写：
"In background: MIDDLE-AGED MALE BOSS surrounded by GLOWING phone screens floating around him, holding MULTIPLE phones with VISIBLE WeChat group chat notifications, figure ENTANGLED in web of illuminated phone connections and contact networks, screens showing '微信群''联系人' glowing text"

**方案2：如果用户说"虚伪/表面/双面/言行不一"** → 必须这样写：
"In background: BOSS with SPLIT CONTRASTING expressions (smiling face to USER, frowning when turned), ARTIFICIAL smile CRACKING and FRAGMENTING at edges, TWO-FACED appearance showing inner/outer contradiction"

**方案3：如果用户说"装模作样/表演/做作"** → 必须这样写：
"In background: BOSS with EXAGGERATED theatrical gestures like stage actor, PERFORMATIVE posture striking dramatic poses, OVERLY DRAMATIC hand movements showing obvious artificiality"

**方案4：如果用户说"空谈/没实际内容/说大话"** → 必须这样写：
"In background: BOSS surrounded by FLOATING TRANSPARENT empty speech bubbles, gesturing GRANDLY but producing HOLLOW visual echoes, words VISIBLY DISSIPATING into empty air before forming meaning"

**方案5：如果用户说"没自信/依赖别人/寻求认可"** → 必须这样写：
"In background: BOSS leaning HEAVILY on CONSULTANT for support, seeking validation with UNCERTAIN hesitant body language, DEPENDENT posture reaching toward others"

🚨🚨🚨 死刑警告：
❌ 不能写："OTHERS in background, slightly blurred"
❌ 不能写："other people present"
❌ 不能只写角色名称不写象征化描述
✅ 必须从上面5个方案中选择一个完整写出！
✅ 必须包含：人物+象征化元素+具体视觉描述！

⚠️ 如果用户同时提到多个观点，选择最核心的一个进行象征化！
` : '如果没有其他人，省略此部分'}

**【COLOR & ATMOSPHERE - 必须写！】**
- Color: [根据情绪选择] cool desaturated (嘲讽) / muted tones (失望) / warm-cool contrast (愤怒)
- USER has DIFFERENT color temperature than OTHERS
- Atmosphere: PALPABLE emotional tension, psychologically CHARGED

**【SETTING】** ${baseSceneInfo ? baseSceneInfo.location : extractedLocation} with [2-3个物品]

**【FINAL REQUIREMENTS】**
Cinematic psychological drama with THEATRICAL LIGHTING. USER clearly SPOTLIT and visually DOMINANT. OTHERS symbolically depicted based on user's perspective. Dramatic lighting and color separation. --ar 16:9"

**【🚨🚨🚨 死刑警告】以上所有占位符必须替换为实际数据！**
- [用户年龄] → 从用户信息读取实际年龄
- [用户性别] → 从用户信息读取实际性别（male/female）
- [用户身高] → 从用户信息读取实际身高
- [用户头发] → 从用户信息读取，可以添加动态描述
- [实际地点] → 从用户对话中提取的真实地点
- [情绪化服装] → ⚠️ **必须根据情绪/心情改变**，不继承原场景（如：想更专业→sharp tailored suit/想放松→casual loose clothing/压抑→dark constrained outfit/嘲讽→expressive edgy attire）
- [性别 ROLE] → 从用户对话中判断实际人物的性别（MALE/FEMALE）
- [实际场景物品] → 从场景数据中提取的真实物品列表

**❌ 严禁直接复制示例中的具体值！**
**✅ 必须用实际数据替换所有占位符！**

**JSON格式要求：**
- 使用英文标点符号
- 所有中文字段必须写满要求的字数
- innerMonologue、surfaceVsInner、consciousnessStream、psychologicalSymbolism这4个字段是核心！
- **imagePrompt是关键！必须和常规写实场景有本质区别！**
  
**🔥🔥🔥 imagePrompt创作要求（最重要！必须遵守！）：**

⚠️⚠️⚠️ 核心原则：完整人物形体 + 剧场化舞台空间 + 强烈艺术化处理！
重点：MEDIUM SHOT（拍完整人物）+ THEATRICAL STAGING（剧场光影）+ HEAVY color grading（强烈调色）

**🚨🚨🚨 严禁：Close-up portrait / 大头特写 / 只拍脸部！**
**✅✅✅ 必须：Medium shot / Three-quarter length / 完整人物形体（head to waist）！**

${previousMetaphors.length > 0 ? `
**🚨🚨🚨 已使用的表情动作（本次生成必须完全不同！）：**
${previousMetaphors.map((m, idx) => `心理剧${idx + 1}: ${m}`).join('\n')}

**⚠️⚠⚠️ 差异化要求（如果生成多个心理剧）：**
1. 不要再使用相同的面部表情组合
2. 不要再使用相同的身体语言
3. 不要再使用相同的光影方式和色调
4. 创造完全不同的人物情绪状态和视觉风格

**建议的差异化方向（表情、动作、色彩、光影）：**
- 如果上一个用了"skeptical gaze + subtle smirk"，这次用"tired eyes + suppressed frustration"
- 如果上一个用了"fingers tapping + leaning back"，这次用"fist clenched + rigid posture"
- 如果上一个用了某种色调，这次用完全不同的色调（灵活选择，不固定）
- 如果上一个用了"side lighting"，这次用"top lighting"或"backlighting"
- 如果上一个用了"shallow depth of field"，这次用"compressed space"或"tilted perspective"
` : ''}

**🎯 心理剧与原场景的区别（核心！）：**

**原场景特征：**
- 写实、平淡、中性观察
- "User observing with subtle expression"
- "Hands resting on table"
- "Natural office lighting"

**心理剧必须的差异：**
1. **动作夸张化**（最重要！）：
   - ❌ "hands resting" → ✅ "fingers VIGOROUSLY tapping"
   - ❌ "sitting upright" → ✅ "leaning BACK dramatically with detachment"
   - ❌ "subtle gesture" → ✅ "hands DRAMATICALLY gesturing / fists TIGHTLY clenched"

2. **表情强烈化**：
   - ❌ "subtle analytical expression" → ✅ "eyes SHARPLY narrowed with VISIBLE skepticism"
   - ❌ "slight smile" → ✅ "lips CURLED in clear disdain / smirk OBVIOUSLY visible"

3. **添加象征元素**：
   - 原场景没有的视觉隐喻（1-2个精准象征）
   - 其他人物的象征化描述

4. **艺术化光影**：
   - ❌ "natural lighting" → ✅ "enhanced dramatic lighting with contrast"
   - ❌ "realistic color" → ✅ "emotional color grading"

**🚨🚨🚨 死刑规则：心理剧imagePrompt必须包含以上4个差异！**
- ❌ 只有1-2个差异 → 不够！
- ✅ 必须有全部4个差异才能叫"心理剧"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🚨🚨🚨 生成imagePrompt时的最终检查（必须全部包含！）：**

**检查1：LIGHTING（灯光必须包含所有5项）**
✅ 必须写："DRAMATIC SPOTLIGHT on USER from top/side"
✅ 必须写："USER STRONGLY illuminated"
✅ 必须写："OTHERS in DIMMER lighting"
✅ 必须写："STRONG light-shadow contrast"
✅ 必须写："Background DARKER"

**检查2：OTHERS象征化（必须有具体描述）**
✅ 必须分析用户对老板/顾问的观点（从用户输入中提取）
✅ 必须选择对应的象征化描述方式
✅ 必须写出老板的具体象征化形象（不能只写"in background"）

示例对比：
❌ 错误："BOSS in background, blurred"
✅ 正确："BOSS surrounded by GLOWING phone screens showing WeChat groups, MULTIPLE phones in hands, ENTANGLED in network of connections"

**检查3：用户输入的人物必须全部出现**
✅ 用户说"老板" → imagePrompt必须有BOSS的详细描述
✅ 用户说"顾问" → imagePrompt必须有CONSULTANT的详细描述
✅ 每个人物必须有：性别、年龄、象征化姿态

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

只返回JSON，不要其他文字！`
            }
          ],
          temperature: 0.8,
          max_tokens: 2000
        })
      })
      
      console.log('✅ [PSYCHODRAMA] API响应收到，状态:', response.status)
      console.log('⏱️ [PSYCHODRAMA] 响应时间:', new Date().toLocaleTimeString())
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ [PSYCHODRAMA] API调用失败:', response.status, errorText)
        throw new Error(`API调用失败: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📦 [PSYCHODRAMA] 开始解析响应数据...')
      const content = data.choices[0].message.content.trim()
      console.log('📄 [PSYCHODRAMA] 响应内容长度:', content.length, '字符')
      
      // 提取JSON - 更健壮的逻辑
      let jsonString = content
      
      // 清理markdown代码块
      if (content.includes('```json')) {
        jsonString = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      } else if (content.includes('```')) {
        jsonString = content.replace(/```/g, '').trim()
      }
      
      // 提取JSON对象
      const jsonStart = jsonString.indexOf('{')
      const jsonEnd = jsonString.lastIndexOf('}')
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        jsonString = jsonString.substring(jsonStart, jsonEnd + 1)
      }
      
      // 清理中文标点符号（关键！）
      jsonString = jsonString
        .replace(/，/g, ',')  // 中文逗号 → 英文逗号
        .replace(/：/g, ':')  // 中文冒号 → 英文冒号
        .replace(/"/g, '"')   // 中文左引号 → 英文引号
        .replace(/"/g, '"')   // 中文右引号 → 英文引号
      
      if (!jsonString || jsonString.trim() === '') {
        console.error('❌ [PSYCHODRAMA] API返回内容为空')
        console.log('📄 [PSYCHODRAMA] 原始内容:', content)
        throw new Error('API返回内容为空')
      }
      
      console.log('🧹 [PSYCHODRAMA] 清理后的JSON长度:', jsonString.length)
      const scene = JSON.parse(jsonString)
      
      // 验证必要字段
      if (!scene.imagePrompt || scene.imagePrompt.trim() === '') {
        console.error('❌ [PSYCHODRAMA] LLM未返回imagePrompt字段！')
        console.log('📄 [PSYCHODRAMA] 返回的场景数据:', scene)
        throw new Error('缺少imagePrompt字段')
      }
      
      console.log('✅ [PSYCHODRAMA] 心理剧场景生成完成')
      console.log('🎨 [PSYCHODRAMA] imagePrompt:', scene.imagePrompt.substring(0, 100) + '...')
      
      return scene
      
    } catch (error) {
      console.error('❌ [PSYCHODRAMA] 场景生成失败:', error)
      
      // 返回基础场景（使用提取的具体地点，聚焦内心）
      console.warn('⚠️ [PSYCHODRAMA] 使用fallback生成基础心理剧场景')
      
      // 根据情绪类型选择表情和动作
      const emotionMapping: Record<string, any> = {
        '嘲讽': { eyes: 'VISIBLE skepticism with knowing gaze', lips: 'CLEAR subtle smirk', body: 'leaning BACK with crossed arms', color: 'dramatic color grading with emotional palette' },
        '讽刺': { eyes: 'sharp critical gaze', lips: 'lips curled in disdain', body: 'VISIBLY detached posture', color: 'artistic color treatment' },
        '失望': { eyes: 'tired distant look', lips: 'pressed thin', body: 'shoulders slightly slumped', color: 'muted artistic tones' },
        '愤怒': { eyes: 'INTENSE suppressed anger', lips: 'pressed THIN in tension', body: 'fists CLEARLY clenched', color: 'dramatic desaturated palette' },
        '不满': { eyes: 'suppressed frustration', lips: 'tense line', body: 'body RIGID with restraint', color: 'artistic color grading' }
      }
      
      const emotionKey = Object.keys(emotionMapping).find(k => emotion.type.includes(k)) || '失望'
      const emotionStyle = emotionMapping[emotionKey]
      
      return {
        emotionalTrigger: emotion.trigger,
        emotionalIntensity: emotion.intensity,
        location: extractedLocation,
        task: '观察和反应',
        otherCharacters: [],
        innerConflict: `面对"${emotion.trigger}"，产生强烈的${emotion.type}情绪`,
        externalConflict: `表面上保持冷静和专业，内心却充满${emotion.type}的情绪`,
        conflictIntensity: emotion.intensity,
        subconsciousDesire: '寻求真实和有意义的工作',
        consciousBehavior: '保持专业外表，内心却充满情绪波动',
        psychologicalMechanism: '通过心理距离和批判性思维保护自己',
        sceneDescription_CN: `场景：${extractedLocation}，具体时间。
${userInfo.age}岁${userInfo.gender === 'female' ? '女性' : '男性'}正在进行具体动作，环境细节丰富。
内心独白："${emotion.quote}"
情绪层次：从表面到内心的对比，体现${emotion.type}的复杂情感。
场景包含：具体时间地点、丰富动作描述、生动内心独白、情绪层次变化、视觉细节描写。`,
        sceneDescription_EN: `At ${extractedLocation}, ${userInfo.age}-year-old Chinese ${userInfo.gender === 'female' ? 'female' : 'male'} maintaining calm surface while experiencing intense ${emotion.type} internally. Inner thought: "${emotion.quote}"`,
        imagePrompt: `PSYCHODRAMA - Theatrical stage photography at ${extractedLocation}. COMPOSITION: MEDIUM SHOT showing USER complete figure from head to waist. USER: ${userInfo.age}-year-old Chinese ${userInfo.gender === 'female' ? 'female' : 'male'}, ${userInfo.height}cm, ${userInfo.hairLength || 'long hair'}, wearing sharp tailored clothing, ${emotionStyle.body}, hands VISIBLY positioned showing emotion. Face: eyes ${emotionStyle.eyes}, ${emotionStyle.lips}. OTHERS: background figures blurred and stylized. THEATRICAL STAGING: dramatic theatrical lighting, artistic COLOR TREATMENT with ${emotionStyle.color}. Shadows creating theatrical atmosphere. Background blurred. ATMOSPHERE: psychological tension, theatrical. Cinematic theatrical photography with artistic color grading and stage lighting. Full figure composition showing complete body in theatrical space. NOT close-up portrait. --ar 16:9`
      }
    }
  }
  
  /**
   * 为每个场景检测心理剧潜力，并在合适的场景后插入心理剧场景
   * 使用置信度评分，只在置信度高的场景后插入
   */
  static async enhanceSceneWithPsychodrama(
    scenes: any,
    initialPrompt: string,
    answers: string[]
  ): Promise<any | null> {
    console.log('🎭 [PSYCHODRAMA] 开始检测每个场景的心理剧潜力...')
    
    // 🔄 本次完整对话（所有输入同等对待）
    const allInputs = [initialPrompt, ...answers].filter(input => input && input.trim())
    
    console.log('🔄 [PSYCHODRAMA] 本次完整对话（所有输入）:', allInputs)
    
    // 第一步：检测整体情绪
    const emotionResult = await this.detectEmotions(initialPrompt, answers, [])
    if (!emotionResult.hasEmotion || emotionResult.emotions.length === 0) {
      console.log('ℹ️ [PSYCHODRAMA] 未检测到强烈情绪，跳过心理剧生成')
      return null
    }
    
    console.log(`✅ [PSYCHODRAMA] 检测到${emotionResult.emotions.length}个情绪点`)
    
    // 第二步：用LLM智能评估每个场景的心理剧潜力
    const logicalScenes = [...scenes.logicalScenes]
    
    // 🔥 过滤掉观点场景，观点场景不需要心理剧
    const scenesForEvaluation = logicalScenes.filter(scene => !scene.isOpinionScene)
    
    console.log(`🔍 [PSYCHODRAMA] 场景总数: ${logicalScenes.length}`)
    console.log(`🔍 [PSYCHODRAMA] 过滤后待评估场景: ${scenesForEvaluation.length}（已排除${logicalScenes.length - scenesForEvaluation.length}个观点场景）`)
    
    const sceneConfidenceScores: Array<{
      index: number
      scene: any
      confidence: number
      emotionType: string
      reason: string
    }> = []
    
    if (scenesForEvaluation.length === 0) {
      console.log(`⚠️ [PSYCHODRAMA] 没有可评估的场景（所有场景都是观点场景），跳过心理剧生成`)
      return null
    }
    
    console.log(`🤖 [PSYCHODRAMA] 调用LLM分析${scenesForEvaluation.length}个场景的心理剧潜力...`)
    
    // 批量分析所有场景（提高效率）
    const sceneAnalysisPrompt = `你是心理剧场景评估专家。用户分享了一段经历，我已经生成了${scenesForEvaluation.length}个基础场景。请评估每个场景是否适合生成心理剧（内心戏）。

⚠️ 注意：观点场景已被过滤，这里只评估真实场景。

【本次完整对话（所有输入同等重要）】
${allInputs.map((input, i) => `
输入${i+1}: "${input}"
${i === 0 ? '→ 对话起点（核心主题）' : '→ 补充细节（同等重要）'}
`).join('')}

⚠️⚠️⚠️ 核心原则：
1. **所有输入同等重要**：这是一个完整对话，不分主次
2. **综合理解所有输入**：初始输入通常包含核心观点，后续回答补充细节
3. **特别注意对比、价值判断、嘲讽/讽刺**（可能在任何一条输入中）

【检测到的情绪】
${emotionResult.emotions.map(e => `${e.type}: ${e.intensity}分 - ${e.trigger}`).join('\n')}

【场景列表（仅包含真实场景，已排除观点场景）】
${scenesForEvaluation.map((scene, i) => {
  // 找到这个场景在原始数组中的索引
  const originalIndex = logicalScenes.indexOf(scene)
  return `
场景${i + 1} (原始索引: ${originalIndex}):
标题: ${scene.title}
描述: ${scene.description}
中文描述: ${scene.description_zh || ''}
主角: ${scene.mainCharacter || 'user'}
${scene.isOpinionScene ? '⚠️ 这是观点场景，不应该出现在这里！' : ''}
`
}).join('\n---\n')}

请为每个场景评估：
1. **心理剧适配度** (0.0-1.0): 该场景是否有明显的内心情绪冲突、反差、失望、愤怒、嘲讽、无力感等？
2. **情绪类型**: 主要情绪（sarcasm讽刺/anger愤怒/disappointment失望/anxiety焦虑/conflict冲突/complex复杂）
3. **理由**: 为什么适合/不适合心理剧

**评分标准**：
- 1.0分：极强的情绪冲突（如被背叛、期待落空、被打脸、认知反转、发现真相）
- 0.8分：明显的情绪反差（表面平静内心不满、嘴上说好心里抵触）
- 0.6分：有情绪波动但不强烈（轻微失望、小小不满）
- 0.4分：轻微情绪（日常小烦恼）
- 0.2分：几乎无情绪（纯事实陈述、期待阶段、初始印象）

**🚨🚨🚨 场景类型判断（极其重要！）：**
- **Initial/Previous/Interview/期待场景** → 0.2-0.3分（还在期待阶段，没有失望，不适合心理剧）
- **Reality/Current/Discovered/实际场景** → 0.8-1.0分（发现真相、产生失望，极适合心理剧）
- **认知反转场景**（从期待到失望） → 1.0分（最适合心理剧！）

**示例：**
- "Initial Interview - American Style Impression" → 0.2分（期待阶段，无失望情绪）
- "Reality Discovered - Traditional Mindset" → 1.0分（发现真相，强烈失望）
- "Meeting - Boss declares vision" → 0.8分（可能有嘲讽）

**⚠️⚠️⚠️ 重要：已有情绪表达 ≠ 不需要心理剧！**
- 如果场景description中已经包含情绪词汇（sarcastic smirk, subtle mockery），**不要降分**！
- **心理剧就是要深挖情绪**：表面有subtle sarcastic expression，心理剧展现内心的疯狂冷笑和批判
- 有情绪词说明这个场景**适合**心理剧，而不是**不适合**
- 只有完全客观、平淡的场景（如routine工作）才不适合心理剧

**评分规则（重新定义）：**

**🧠🧠🧠 最重要：用户"想的"内容 = 心理剧核心！**
- **用户表达观点/价值判断**（如"熟人经济"、"本质是没自信"、"就是靠关系"）
  → 这是用户**内心想的**，不是外在描述的！
  → **强力加分：+0.4**（心理剧就是展现内心所想！）
- **用户表达情绪/感受**（如"冷笑"、"无语"、"觉得讽刺"）
  → 这也是用户内心的
  → 加分：+0.3

**高分场景（0.8-1.0）- 适合心理剧：**
- **用户有观点表达**（熟人经济、没自信、靠关系...）（+0.4）← 新增！最重要！
- Reality/发现/事情发生场景（+0.3）
- 有其他角色在场（老板、顾问、同事...）（+0.25）
- 已有情绪表达（subtle sarcastic, internal mockery...）（不降分，保持基础分）
- 会议/咨询/人际互动场景（+0.15）

**低分场景（0.2-0.4）- 不适合心理剧：**
- Initial/期待场景（还没发生冲突）
- 完全平淡的routine工作
- 独自一人无互动的场景
- 纯事实陈述（穿什么、在哪），用户没表达想法

**评分示例（修正）：**
- 用户说"熟人经济 本质是没自信" + 场景有情绪表达 → 1.0分（观点+情绪！完美！）
- "subtle sarcastic expression, internal mockery" → 0.8-1.0分（有情绪！适合深挖心理剧！）
- 用户有观点但场景平淡 → 0.7分（观点很重要，但缺少情绪场景）
- "sitting at table with calm expression" → 0.5分（平淡，用户没表达想法）
- "routine work at desk alone" → 0.3分（太平淡，用户没内心想法）

**🚨 核心逻辑：**
- 用户"想的"（观点/分析/批判） = 心理剧的核心素材！必须高分！
- 用户"描述的"（穿什么/在哪） = 场景细节，不是心理剧重点

返回JSON数组：
[
  {
    "sceneIndex": 0,
    "confidence": 0.85,
    "emotionType": "disappointment",
    "reason": "用户对期待的会议感到失望"
  },
  ...
]`

    try {
      // 使用配置文件中的API密钥
      const apiKey = API_CONFIG.DOUBAO_LLM.API_KEY
      
      if (!apiKey) {
        console.warn('⚠️ [PSYCHODRAMA] DeepSeek API密钥未配置，使用简化分析')
        throw new Error('API密钥未配置')
      }
      
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
              content: '你是专业的心理剧场景评估专家。擅长从用户的话语中挖掘潜在的情绪冲突。只返回JSON数组，不要其他内容。'
            },
            {
              role: 'user',
              content: sceneAnalysisPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ [PSYCHODRAMA] DeepSeek API调用失败:', response.status, errorText)
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
      
      // 清理中文标点符号
      content = content.replace(/，/g, ',')
      content = content.replace(/：/g, ':')
      content = content.replace(/"/g, '"').replace(/"/g, '"')
      
      // 提取JSON部分
      const jsonStart = content.indexOf('[')
      const jsonEnd = content.lastIndexOf(']')
      if (jsonStart !== -1 && jsonEnd !== -1) {
        content = content.substring(jsonStart, jsonEnd + 1)
      }
      
      console.log('🧹 [PSYCHODRAMA] 清理后JSON:', content.substring(0, 300))
      
      const analysisResult = JSON.parse(content)
      
      // 解析LLM返回的分析结果
      const analyses = Array.isArray(analysisResult) ? analysisResult : (analysisResult.scenes || [])
      
      if (analyses.length > 0) {
        for (const analysis of analyses) {
          if (analysis.confidence > 0 && typeof analysis.sceneIndex === 'number') {
            // 🔥 将过滤后数组的索引映射回原始数组的索引
            const filteredScene = scenesForEvaluation[analysis.sceneIndex]
            const originalIndex = logicalScenes.indexOf(filteredScene)
            
            if (originalIndex !== -1 && filteredScene) {
            sceneConfidenceScores.push({
                index: originalIndex,  // 使用原始索引
                scene: filteredScene,
              confidence: analysis.confidence,
              emotionType: analysis.emotionType || 'complex',
              reason: analysis.reason || '未知'
            })
              console.log(`📊 [PSYCHODRAMA] Scene ${originalIndex + 1}: 置信度=${analysis.confidence.toFixed(2)}, 情绪=${analysis.emotionType}, 理由=${analysis.reason}`)
            }
          }
        }
      }
      
      if (sceneConfidenceScores.length === 0) {
        console.warn('⚠️ [PSYCHODRAMA] LLM返回的分析无有效数据，使用fallback')
        throw new Error('LLM未返回有效分析')
      }
      
    } catch (error) {
      console.error('❌ [PSYCHODRAMA] LLM分析失败，使用简化逻辑:', error)
      
      // 回退：基于情绪和场景内容的简化分析
      for (let i = 0; i < logicalScenes.length; i++) {
        const scene = logicalScenes[i]
        
        // 🔥 跳过观点场景，观点场景不需要心理剧
        if (scene.isOpinionScene) {
          console.log(`⚠️ [PSYCHODRAMA-FALLBACK] Scene ${i + 1} 是观点场景，跳过心理剧检测`)
          continue
        }
        
        const sceneText = (scene.title + ' ' + scene.description + ' ' + (scene.description_zh || '')).toLowerCase()
        
        let confidence = 0.5 // 基础分数
        let emotionType = emotionResult.emotions[0]?.type || 'complex'
        let reasons: string[] = ['基础分析']
        
        // ⚠️ 已有情绪表达 → 不降分！心理剧就是要深挖情绪！
        const hasEmotionalWords = sceneText.includes('frustrated') || 
                                  sceneText.includes('disappointed') || 
                                  sceneText.includes('slumped') ||
                                  sceneText.includes('sarcastic') ||
                                  sceneText.includes('冷笑') ||
                                  sceneText.includes('失望') ||
                                  sceneText.includes('沮丧')
        
        if (hasEmotionalWords) {
          // 不降分！保持或提升
          reasons.push('已有情绪表达（适合深挖）')
        }
        
        // 检测场景类型（initial期待 vs reality发现）
        const isInitialScene = sceneText.includes('initial') || sceneText.includes('previous') || 
                               sceneText.includes('面试') || sceneText.includes('interview') ||
                               sceneText.includes('期待') || sceneText.includes('impression')
        
        const isRealityScene = sceneText.includes('reality') || sceneText.includes('current') || 
                               sceneText.includes('discovered') || sceneText.includes('actual') ||
                               sceneText.includes('实际') || sceneText.includes('发现') ||
                               sceneText.includes('后来') || sceneText.includes('结果') ||
                               sceneText.includes('今天') || sceneText.includes('现在')
        
        // 如果是initial/期待场景，降低心理剧分数（心理剧应该在"发现真相"后）
        if (isInitialScene && !isRealityScene) {
          confidence = 0.2  // 期待阶段不适合心理剧
          reasons.push('Initial/期待场景，不适合心理剧')
        }
        
        // ✅ 如果是reality/发现/事情发生场景，提高心理剧分数
        if (isRealityScene) {
          confidence += 0.3
          reasons.push('Reality/发现/事情发生场景，适合心理剧')
        }
        
        // ✅ 检测是否有其他角色（不仅仅是老板）
        const hasOtherPeople = sceneText.includes('boss') || sceneText.includes('老板') ||
                               sceneText.includes('consultant') || sceneText.includes('顾问') ||
                               sceneText.includes('colleague') || sceneText.includes('同事') ||
                               sceneText.includes('client') || sceneText.includes('客户') ||
                               sceneText.includes('friend') || sceneText.includes('朋友') ||
                               sceneText.includes('parent') || sceneText.includes('父母') ||
                               sceneText.includes('with') || sceneText.includes('和')
        
        if (hasOtherPeople) {
          confidence += 0.25
          reasons.push('有其他角色在场（人际互动场景）')
        }
        
        // 会议场景
        if (sceneText.includes('meeting') || sceneText.includes('会议') || sceneText.includes('咨询')) {
          confidence += 0.15
          reasons.push('会议/咨询场景')
        }
        
        // 检测到用户情绪
        if (emotionResult.emotions.length > 0) {
          confidence += 0.2
          reasons.push(`检测到用户情绪: ${emotionType}`)
        }
        
        if (confidence > 0.5) {
          sceneConfidenceScores.push({
            index: i,
            scene,
            confidence: Math.min(confidence, 0.9),
            emotionType,
            reason: reasons.join('; ')
          })
          console.log(`📊 [PSYCHODRAMA-FALLBACK] Scene ${i + 1}: 置信度=${confidence.toFixed(2)}, 理由=${reasons.join(', ')}`)
        }
      }
      
      // 如果还是没有场景，至少添加第一个
      if (sceneConfidenceScores.length === 0 && logicalScenes.length > 0) {
        sceneConfidenceScores.push({
          index: 0,
          scene: logicalScenes[0],
          confidence: 0.7,
          emotionType: emotionResult.emotions[0]?.type || 'complex',
          reason: '默认选择第一个场景'
        })
        console.log('📊 [PSYCHODRAMA-FALLBACK] 默认选择场景1，置信度=0.70')
      }
    }
    
    // 第三步：筛选置信度>0.85的场景
    const CONFIDENCE_THRESHOLD = 0.85
    
    // 🔥 限制心理剧数量为1（避免同质化）
    const totalScenes = logicalScenes.length
    const MAX_PSYCHODRAMA_SCENES = 1  // 每次对话只生成1个心理剧
    console.log(`📊 [PSYCHODRAMA] 场景总数: ${totalScenes}, 允许心理剧数: ${MAX_PSYCHODRAMA_SCENES}（固定为1，避免同质化）`)
    
    // 先筛选达到阈值的场景
    let highConfidenceScenes = sceneConfidenceScores.filter(s => s.confidence >= CONFIDENCE_THRESHOLD)
    
    // 如果没有达到阈值的，放宽到0.75
    if (highConfidenceScenes.length === 0) {
      highConfidenceScenes = sceneConfidenceScores.filter(s => s.confidence >= 0.75)
    }
    
    // 如果还是没有，至少选择置信度最高的一个（必须生成心理剧）
    if (highConfidenceScenes.length === 0 && sceneConfidenceScores.length > 0) {
      console.log(`⚠️ [PSYCHODRAMA] 无场景达到阈值，但选择置信度最高的场景生成心理剧`)
      sceneConfidenceScores.sort((a, b) => b.confidence - a.confidence)
      highConfidenceScenes = [sceneConfidenceScores[0]]
    }
    
    if (highConfidenceScenes.length === 0) {
      console.log(`ℹ️ [PSYCHODRAMA] 无可用场景，跳过心理剧生成`)
      return null
    }
    
    // 按置信度排序
    highConfidenceScenes.sort((a, b) => b.confidence - a.confidence)
    
    // 🔥 去重检测：如果多个场景的情绪和主题相似，只保留最高分的
    console.log(`🔍 [PSYCHODRAMA] 开始相似度检测，去除同质化场景...`)
    
    const deduplicatedScenes: typeof highConfidenceScenes = []
    const usedEmotionTypes: string[] = []  // 记录已使用的情绪类型
    
    for (const scene of highConfidenceScenes) {
      const emotionType = scene.emotionType.toLowerCase()
      
      // 检查是否已有相同情绪类型的心理剧
      if (usedEmotionTypes.includes(emotionType)) {
        console.log(`⚠️ [PSYCHODRAMA] Scene ${scene.index + 1} 情绪类型重复 (${emotionType})，跳过`)
        console.log(`   - 理由: ${scene.reason}`)
        console.log(`   - 已有相同情绪类型的心理剧，避免同质化`)
        continue
      }
      
      // 保留这个场景
      deduplicatedScenes.push(scene)
      usedEmotionTypes.push(emotionType)
      console.log(`✅ [PSYCHODRAMA] Scene ${scene.index + 1} 主题独特，保留`)
      console.log(`   - 情绪: ${emotionType}`)
      console.log(`   - 置信度: ${scene.confidence.toFixed(2)}`)
      console.log(`   - 理由: ${scene.reason}`)
      
      // 🔥 限制：每次对话只生成1个心理剧（避免同质化）
      if (deduplicatedScenes.length >= MAX_PSYCHODRAMA_SCENES) {
        console.log(`📊 [PSYCHODRAMA] 已达到心理剧数量上限 (${MAX_PSYCHODRAMA_SCENES})，停止筛选`)
        console.log(`⚠️ [PSYCHODRAMA] 为避免同质化，每次对话只生成1个心理剧`)
        break
      }
    }
    
    highConfidenceScenes = deduplicatedScenes
    
    console.log(`✅ [PSYCHODRAMA] 去重后保留${highConfidenceScenes.length}个场景生成心理剧`)
    if (highConfidenceScenes.length > 0) {
      console.log(`📋 [PSYCHODRAMA] 保留的情绪类型: ${usedEmotionTypes.join(', ')}`)
    }
    
    // 第四步：为每个高置信度场景生成心理剧并插入
    const userInfo = await getUserInfo()
    const newLogicalScenes = []
    let psychodramaScenesAdded = 0
    const usedMetaphors: string[] = []  // 记录已使用的视觉隐喻
    
    for (let i = 0; i < logicalScenes.length; i++) {
      // 先添加原场景
      newLogicalScenes.push(logicalScenes[i])
      
      // 🔥 检查下一个场景是否是观点场景
      const nextSceneIsOpinion = (i + 1 < logicalScenes.length) && logicalScenes[i + 1].isOpinionScene
      
      // 如果下一个是观点场景，先添加观点场景，再考虑心理剧
      if (nextSceneIsOpinion) {
        i++  // 跳到观点场景
        newLogicalScenes.push(logicalScenes[i])
        console.log(`✅ [PSYCHODRAMA] 检测到观点场景，已添加: ${logicalScenes[i].title}`)
      }
      
      // 检查该场景（或之前的场景）是否需要心理剧
      const matchedScore = highConfidenceScenes.find(s => s.index === (nextSceneIsOpinion ? i - 1 : i))
      if (matchedScore) {
        const baseSceneIndex = nextSceneIsOpinion ? i - 1 : i
        console.log(`🎭 [PSYCHODRAMA] 为Scene ${baseSceneIndex + 1}生成心理剧 (置信度: ${matchedScore.confidence.toFixed(2)})`)
        
        if (nextSceneIsOpinion) {
          console.log(`📍 [PSYCHODRAMA] 心理剧将插入在观点场景"${logicalScenes[i].title}"之后`)
        }
        
        if (usedMetaphors.length > 0) {
          console.log(`🎨 [PSYCHODRAMA] 已使用的视觉隐喻:`, usedMetaphors)
          console.log(`⚠️ [PSYCHODRAMA] 本次生成必须使用完全不同的视觉风格！`)
        }
        
        // 找到对应的情绪
        const matchedEmotion = emotionResult.emotions.find(e => 
          e.type.includes(matchedScore.emotionType) || 
          matchedScore.emotionType.includes(e.type.substring(0, 4))
        ) || emotionResult.emotions[0]
        
        // 获取用户信息和元数据
        const userInfo = await getUserInfo()
        const userMetadata = await getUserMetadata()
        
        // 🔥 获取基础场景（心理剧应基于这个场景）
        const baseScene = logicalScenes[baseSceneIndex]
        
        // 生成心理剧场景（传入baseScene和已使用的视觉隐喻）
        const psychodramaScene = await this.generateScene(
          matchedEmotion, 
          initialPrompt, 
          answers,
          [],  // questions (空数组)
          userInfo,
          userMetadata,
          usedMetaphors,  // 传入已使用的隐喻
          baseScene  // 🆕 传入基础场景
        )
        
        if (psychodramaScene) {
          // 创建心理剧场景数据
          // ⚠️ 确保人物描述和基础场景一致
          const userClothing = answers.find(a => a.includes('穿') || a.includes('衣服')) || 
                              baseScene.visualDetails?.clothing || 
                              'white t-shirt and linen pants'
          
          const psychodramaSceneData = {
            title: `心理剧：${psychodramaScene.emotionalTrigger.substring(0, 20)}...`,
            mainCharacter: 'user', // 心理剧主角永远是用户的内心
            description: psychodramaScene.sceneDescription_EN,
            description_zh: psychodramaScene.sceneDescription_CN,
            location: psychodramaScene.location,
            age: userInfo?.age || baseScene.age || 26,
            height: userInfo?.height || 165,
            hairLength: userInfo?.hairLength || 'long hair',
            peopleCount: baseScene.peopleCount || (psychodramaScene.otherCharacters && psychodramaScene.otherCharacters.length > 0 ? `with ${psychodramaScene.otherCharacters.join(' and ')}` : 'in meeting'),
            keywords: ['psychodrama', 'inner conflict', psychodramaScene.emotionalTrigger],
            visualDetails: {
              lighting: 'natural dramatic lighting emphasizing facial expressions',
              colorTone: 'realistic, slight desaturation to emphasize mood',
              atmosphere: `emotional tension, ${psychodramaScene.emotionalTrigger}`,
              objects: baseScene.visualDetails?.objects || ['laptop', 'whiteboard', 'projector', 'coffee cups', 'documents', 'folders', 'pens', 'water bottles', 'conference phone', 'office chairs'],
              sounds: ['ambient meeting room', 'inner voice'],
              clothing: userClothing,
              mood: psychodramaScene.innerConflict || psychodramaScene.externalConflict
            },
            detailedPrompt: `PSYCHODRAMA Scene: ${psychodramaScene.imagePrompt}`,
            imagePrompt: psychodramaScene.imagePrompt,  // 添加单独的imagePrompt字段
            isPsychodrama: true,
            innerMonologue: psychodramaScene.innerConflict,
            surfaceVsInner: psychodramaScene.externalConflict,
            consciousnessStream: psychodramaScene.psychologicalMechanism,
            psychologicalSymbolism: psychodramaScene.subconsciousDesire,
            confidence: matchedScore.confidence
          }
          
          // 🔥 插入心理剧场景（确保在观点场景之后）
          newLogicalScenes.push(psychodramaSceneData)
          psychodramaScenesAdded++
          
          // 记录已使用的视觉隐喻（用于差异化下一个心理剧）
          usedMetaphors.push(psychodramaScene.imagePrompt)
          
          if (nextSceneIsOpinion) {
            console.log(`✅ [PSYCHODRAMA] 心理剧已插入在观点场景"${logicalScenes[i].title}"之后`)
          } else {
            console.log(`✅ [PSYCHODRAMA] 心理剧已插入在Scene ${i + 1}后`)
          }
        }
      }
    }
    
    console.log(`✅ [PSYCHODRAMA] 共插入${psychodramaScenesAdded}个心理剧场景，总场景数: ${newLogicalScenes.length}`)
    
    return {
      ...scenes,
      logicalScenes: newLogicalScenes,
      hasPsychodrama: true,
      psychodramaScenesCount: psychodramaScenesAdded
    }
  }
  
  /**
   * 将心理剧场景集成到内容生成中（旧版本，保留兼容）
   * 心理剧会替换最相关的场景（通常是"这次会议"），保持总共4个场景
   */
  static async integratePsychodramaIntoContent(
    scenes: any,
    psychodramaScene: PsychodramaScene | null,
    userInfo?: any,
    answers?: string[]
  ): Promise<any> {
    if (!psychodramaScene) {
      return scenes
    }
    
    console.log('🎭 [PSYCHODRAMA] 将心理剧场景集成到内容生成中')
    console.log('🎭 [PSYCHODRAMA] 策略：用心理剧替换最相关场景，保持总共4个场景')
    
    // 获取用户信息（如果没传入）
    if (!userInfo) {
      userInfo = await getUserInfo()
    }
    if (!answers) {
      answers = []
    }
    
    // 创建心理剧场景数据（聚焦内心世界）
    const psychodramaSceneData = {
      title: `心理剧：${psychodramaScene.emotionalTrigger}`,
      description: psychodramaScene.imagePrompt || psychodramaScene.sceneDescription_EN,
      description_zh: psychodramaScene.sceneDescription_CN,
      location: psychodramaScene.location,
      age: userInfo.age || 26,
      peopleCount: psychodramaScene.otherCharacters && psychodramaScene.otherCharacters.length > 0 
        ? `with ${psychodramaScene.otherCharacters.join(', ')}` 
        : 'internal focus',
      keywords: ['psychodrama', 'inner world', psychodramaScene.emotionalTrigger],
      visualDetails: {
        lighting: 'dramatic psychological lighting emphasizing inner state',
        colorTone: 'emotional color palette reflecting internal conflict',
        atmosphere: `psychological tension, ${psychodramaScene.emotionalTrigger}, inner vs outer contrast`,
        objects: ['inner thoughts', 'psychological symbols'],
        sounds: ['inner voice', 'consciousness stream', 'ambient irony'],
        clothing: answers.find(a => a.includes('穿') || a.includes('衣服')) || 'daily clothing',
        mood: `${psychodramaScene.externalConflict || psychodramaScene.innerConflict || psychodramaScene.emotionalTrigger}`
      },
      detailedPrompt: psychodramaScene.imagePrompt,
      imagePrompt: psychodramaScene.imagePrompt,  // 添加单独的imagePrompt字段
      // 心理剧特有字段（内心世界）
      isPsychodrama: true,
      innerMonologue: psychodramaScene.innerConflict,
      surfaceVsInner: psychodramaScene.externalConflict,
      consciousnessStream: psychodramaScene.psychologicalMechanism, 
      psychologicalSymbolism: psychodramaScene.subconsciousDesire,
      subconsciousDesire: psychodramaScene.subconsciousDesire,
      psychologicalMechanism: psychodramaScene.psychologicalMechanism
    }
    
    // 找到与心理剧相关的场景（用心理剧替换它，保持总共4个场景）
    const logicalScenes = [...scenes.logicalScenes]
    
    // 查找最相关的场景（包含情绪触发点相关内容）
    let replaceIndex = -1
    
    for (let i = 0; i < logicalScenes.length; i++) {
      const sceneText = (logicalScenes[i].title + ' ' + logicalScenes[i].description + ' ' + (logicalScenes[i].description_zh || '')).toLowerCase()
      
      // 查找"当前/这次会议"场景（通常是情绪最强的场景）
      if (sceneText.includes('current meeting') || sceneText.includes('这次会议') || 
          sceneText.includes('boss') && sceneText.includes('declaring') ||
          sceneText.includes('老板') && sceneText.includes('宣布')) {
        replaceIndex = i
        break
      }
    }
    
    // 如果没找到，替换第2个场景（通常是冲突场景）
    if (replaceIndex === -1) {
      replaceIndex = Math.min(1, logicalScenes.length - 1)
    }
    
    // 用心理剧替换找到的场景（保持总数为4）
    console.log(`🎭 [PSYCHODRAMA] 用心理剧替换场景${replaceIndex + 1}（${logicalScenes[replaceIndex].title}）`)
    logicalScenes[replaceIndex] = psychodramaSceneData
    
    console.log(`✅ [PSYCHODRAMA] 集成完成，总场景数：${logicalScenes.length}（固定4个，其中1个是心理剧）`)
    
    return {
      ...scenes,
      logicalScenes: logicalScenes,
      hasPsychodrama: true,
      psychodramaSceneIndex: 1,
      psychodramaScene: psychodramaSceneData
    }
  }
}

