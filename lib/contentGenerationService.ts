import { SceneGenerationService, SceneGenerationResult } from './sceneGenerationService'
import { StoryGenerationService, StoryResult } from './storyGenerationService'
import { PsychodramaSceneService, PsychodramaScene } from './psychodramaSceneService'
import { OpinionVisualizationService } from './opinionVisualizationService'
import { HypotheticalSceneService, HypotheticalScene } from './hypotheticalSceneService'
import { getUserInfo } from './userDataApi'
import { saveUserRawInput } from './userRawInputService'

export interface ContentGenerationResult {
  scenes: SceneGenerationResult | null
  story: StoryResult | null
  psychodramaScene: PsychodramaScene | null
  finalPrompt?: string
  opinionScenes?: any[]  // 🔥 添加观点场景字段
  hypotheticalScene?: HypotheticalScene | null  // 🔥 添加假定场景字段
  needsAdditionalGeneration?: boolean  // 🔥 标记是否需要后续生成
}

/**
 * 输入类型枚举
 */
enum InputType {
  CONCRETE_EVENT = 'concrete_event',      // 具体事件（如"我今天上班老板找人咨询"）
  EMOTION = 'emotion',                    // 情绪表达（如"i feel very lonely"）
  OPINION = 'opinion',                    // 观点/文化现象（如"中国就是熟人经济"）
  MIXED = 'mixed'                         // 混合（既有事件又有观点）
}

/**
 * 内容生成服务
 */
export class ContentGenerationService {
  
  /**
   * 检测输入类型
   */
  private static async detectInputType(initialPrompt: string, answers: string[]): Promise<InputType> {
    const allInputs = [initialPrompt, ...answers].join(' ')
    
    // 🔥 优先检测具体描述要素（人物、动作、地点）
    const hasCharacter = /老板|同事|朋友|男朋友|妈妈|爸爸|顾问|熟人|boss|colleague|friend/.test(allInputs)
    const hasAction = /找|来|说|做|去|开会|讨论|听|看|穿|meeting|discuss|wearing/.test(allInputs)
    const hasLocation = /公司|办公室|家|卧室|会议室|淞虹路|路|office|home|bedroom|room/.test(allInputs)
    const hasClothing = /穿|白色|T恤|睡衣|衣服|wearing|pajamas|shirt/.test(allInputs)
    const hasTime = /今天|昨天|上午|下午|晚上|半夜|清晨|当时|那时候|today|yesterday|night|morning/.test(allInputs)
    
    // 检测情绪关键词
    const hasEmotion = /失望|沮丧|焦虑|孤独|害怕|生气|想念|feel|lonely|sad|disappointed/.test(allInputs)
    
    // 检测观点关键词（扩展版）
    const hasOpinion = /熟人经济|依赖微信|形式主义|就是|其实|本质|表面|缺乏|高端|市场|垃圾|噪音|优质|内容|惋惜|愤怒|发现|好|质量|很好|中文|社交媒体|震撼|品质|深度|思考|艺术性|沉浸|体验|值得|品味|对比|淹没|夸张|标题党|低质量|短视频|重复|营销|肤浅|热点|讨论|信息流|滚动|营养|反差|深刻|意识到|缺失|庞大|用户|基础|技术|能力|产出|同等|品质|生态|流量|算法|主导|被淹没|噪音中|neoma|杂志|高端内容|内容质量|信息噪音|优质内容|内心|惋惜|愤怒/.test(allInputs)
    
    console.log('🔍 [INPUT-TYPE] 检测:', { hasCharacter, hasAction, hasLocation, hasClothing, hasTime, hasEmotion, hasOpinion })
    
    // 🚨 优先检测观点：如果包含观点表达，优先归类为观点类型
    if (hasOpinion) {
      console.log('✅ [INPUT-TYPE] 检测到观点 → OPINION（优先）')
      return InputType.OPINION
    }
    
    // 🚨 判断逻辑：如果有具体描述要素，就是MIXED（不是纯情绪）
    if (hasCharacter || hasAction || hasLocation || hasClothing || hasTime) {
      console.log('✅ [INPUT-TYPE] 有具体描述 → MIXED（会生成写实场景）')
      return InputType.MIXED
    }
    
    // 纯情绪（没有任何具体描述）
    if (hasEmotion && !hasOpinion) {
      console.log('✅ [INPUT-TYPE] 纯情绪 → EMOTION')
      return InputType.EMOTION
    }
    
    // 纯观点（没有具体描述）
    if (hasOpinion && !hasEmotion) {
      console.log('✅ [INPUT-TYPE] 纯观点 → OPINION')
      return InputType.OPINION
    }
    
    // 使用 LLM 进行更智能的观点检测
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
              content: `你是输入类型检测专家。请分析用户输入是否包含观点表达。

**观点检测标准：**
- 社会现象评论（如"中国缺乏高端杂志市场"）
- 价值判断（如"内容质量很好"、"垃圾信息"）
- 文化批判（如"中文社交媒体都是噪音"）
- 情感表达（如"惋惜愤怒"）

**返回JSON格式：**
{
  "hasOpinion": true/false,
  "reason": "检测原因"
}`
            },
            {
              role: 'user',
              content: `用户输入：${allInputs}`
            }
          ]
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        const llmResult = JSON.parse(data.choices[0].message.content)
        
        if (llmResult.hasOpinion) {
          console.log('✅ [INPUT-TYPE] LLM检测到观点 → OPINION')
          return InputType.OPINION
        }
      }
    } catch (error) {
      console.error('❌ [INPUT-TYPE] LLM检测失败:', error)
    }
    
  // 默认MIXED
  console.log('✅ [INPUT-TYPE] 默认 → MIXED')
    return InputType.MIXED
  }
  
  /**
   * 用LLM检测观点
   */
  private static async detectOpinionWithLLM(initialPrompt: string, answers: string[]): Promise<boolean> {
    const allInputs = [initialPrompt, ...answers].join(' ')
    
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
              content: `你是观点检测专家。请分析用户输入是否包含观点表达。

**观点检测标准：**
- 社会现象评论（如"中国缺乏高端杂志市场"）
- 价值判断（如"内容质量很好"、"垃圾信息"）
- 文化批判（如"中文社交媒体都是噪音"）
- 情感表达（如"惋惜愤怒"）

**返回JSON格式：**
{
  "hasOpinion": true/false,
  "reason": "检测原因"
}`
            },
            {
              role: 'user',
              content: `用户输入：${allInputs}`
            }
          ]
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        const result = JSON.parse(data.choices[0].message.content)
        return result.hasOpinion
      }
    } catch (error) {
      console.error('❌ [OPINION-DETECT] LLM检测失败:', error)
    }
    
    return false
  }
  
  /**
   * 检测假定倾向（使用LLM）
   */
  private static async detectHypotheticalWithLLM(initialPrompt: string, answers: string[]): Promise<boolean> {
    try {
      const allText = [initialPrompt, ...answers].join(' ')
      
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
              content: `你是假定倾向检测专家。请分析用户输入是否包含"假定"、"假如"、"我想成为"等倾向。

**检测标准：**
1. **直接假定**：如"假如我出国留学"、"要不是我出国留学"
2. **愿望表达**：如"我想成为"、"我想变成"、"我希望"
3. **条件假设**：如"如果"、"要是"、"倘若"
4. **对比表达**：如"另一种"、"别的"、"不同的"

只返回 true 或 false，不要其他文字！`
            },
            {
              role: 'user',
              content: `用户对话内容：${allText}

请检测是否有假定倾向。`
            }
          ],
          temperature: 0.1,
          max_tokens: 10
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        const content = data.choices[0].message.content.trim().toLowerCase()
        return content.includes('true')
      }
    } catch (error) {
      console.warn('⚠️ [HYPOTHETICAL-DETECT] LLM检测失败:', error)
    }
    
    // 备用方案：关键词检测
    const hypotheticalKeywords = [
      '假如', '如果', '要是', '倘若', '假设',
      '我想成为', '我想变成', '我希望', '我梦想',
      '要不是', '如果不是', '如果没有', '要是没有',
      '可能', '也许', '说不定', '或者',
      '另一种', '别的', '其他的', '不同的'
    ]
    
    const allText = [initialPrompt, ...answers].join(' ')
    return hypotheticalKeywords.some(keyword => allText.includes(keyword))
  }

  /**
   * 用LLM检测情绪
   */
  private static async detectEmotionWithLLM(initialPrompt: string, answers: string[]): Promise<boolean> {
    const allInputs = [initialPrompt, ...answers].join(' ')
    
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
              content: `你是情绪检测专家。请分析用户输入是否包含情绪表达。

**情绪检测标准：**
- 任何情感表达（正面、负面、复杂情绪都算）
- 用户描述困扰或冲突
- 用户表现出情感反应
- 用户暗示内心活动
- 用户提到人际关系的情感

**返回JSON格式：**
{
  "hasEmotion": true/false,
  "reason": "检测原因"
}`
            },
            {
              role: 'user',
              content: `用户输入：${allInputs}`
            }
          ]
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        const result = JSON.parse(data.choices[0].message.content)
        return result.hasEmotion
      }
    } catch (error) {
      console.error('❌ [EMOTION-DETECT] LLM检测失败:', error)
    }
    
    return true // 默认有情绪，因为每个人都有情绪
  }
  
  /**
 * 快速生成内容（用于聊天场景）
 */
static async generateQuickContent(options: {
  initialPrompt: string
  answers?: string[]
  questions?: string[]
  userProfile?: any
  contextHistory?: string[]
}): Promise<ContentGenerationResult> {
  const { initialPrompt, answers = [], questions = [], userProfile, contextHistory = [] } = options

  console.log('🎬 [CONTENT-GEN] 开始快速内容生成')
  console.log('🔹 [CONTENT-GEN] initialPrompt:', initialPrompt)
  console.log('🔹 [CONTENT-GEN] answers:', answers)
  console.log('🔹 [CONTENT-GEN] contextHistory:', contextHistory)
  console.log('🔍 [CONTENT-GEN] contextHistory类型:', typeof contextHistory, Array.isArray(contextHistory))

  // 🔥 确保 contextHistory 是数组
  const safeContextHistory = Array.isArray(contextHistory) ? contextHistory : []
  console.log('✅ [CONTENT-GEN] 安全的contextHistory:', safeContextHistory)

  // 🔥 延迟保存用户原始输入（不阻塞生图，在生图完成后异步执行）
  // 保存操作已移到前端，在所有图片生成完成后执行

  // 🔥 获取用户信息
  let userInfo = null
  let userMetadata = null
  
  try {
    userInfo = await getUserInfo()
    // 这里需要获取 userMetadata，暂时设为 null
    userMetadata = null
  } catch (error) {
    console.error('❌ [CONTENT-GEN] 获取用户信息失败:', error)
  }

  // 🔥 检测输入类型
    const inputType = await this.detectInputType(initialPrompt, answers)
  console.log('🎯 [CONTENT-GEN] 输入类型:', inputType)

  try {
    // 🔥 步骤1: 立即生成基础场景并返回（不等待观点/心理剧检测）
    console.log('📝 [CONTENT-GEN] 步骤1: 立即生成基础场景...')
    
    const scenes = await SceneGenerationService.generateBaseStoryAndNarrative(
        initialPrompt,
        answers,
        questions,
        safeContextHistory.join('\n') // 传递上下文历史（作为字符串）
      )

      console.log('✅ [CONTENT-GEN] 基础场景生成完成')
    console.log('🔹 [CONTENT-GEN] 场景数量:', scenes.logicalScenes?.length || 0)

    // 🔥 立即返回基础场景，让前端先生图
    console.log('🎨 [CONTENT-GEN] 基础场景生成完成，立即返回供生图')
    
    return {
      scenes: scenes,  // 🔥 立即返回基础场景
      story: {
        narrative: '',
        aiPrompt: '',
        sceneDescription: '',
        characterDescription: '',
        settingDescription: '',
        moodDescription: ''
      },
      psychodramaScene: null,  // 稍后后台生成
      finalPrompt: initialPrompt,
      opinionScenes: undefined,  // 稍后后台生成
      needsAdditionalGeneration: true  // 🔥 标记需要后台并行生成观点和心理剧
    }

    } catch (error) {
      console.error('💥 [CONTENT-GEN] 内容生成失败:', error)
      throw error
    }
  }
  
  /**
   * 后续生成情绪、观点和假定场景（并行处理）
   */
  static async generateAdditionalContent(
    initialPrompt: string,
    answers: string[],
    questions: string[],
    userInfo: any,
    userMetadata: any
  ): Promise<{ psychodramaScene: any, opinionScenes: any[], hypotheticalScene: any }> {
    console.log('🔍 [ADDITIONAL-GEN] 开始后续生成...')
    
    const results = {
      psychodramaScene: null as any,
      opinionScenes: [] as any[],
      hypotheticalScene: null as any
    }
    
    // 并行检测和生成
    const promises = []
    
    // 检测观点
    promises.push(
      this.detectOpinionWithLLM(initialPrompt, answers).then(async (hasOpinion) => {
        if (hasOpinion) {
          console.log('🎯 [ADDITIONAL-GEN] 检测到观点 → 生成观点场景')
          // 🔥 立即通知前端检测到观点
          if (typeof window !== 'undefined') {
            // 这里可以通过事件或回调通知前端
            console.log('📢 [ADDITIONAL-GEN] 通知前端：检测到观点，正在生成观点场景')
          }
          results.opinionScenes = await OpinionVisualizationService.generateOpinionScenes(
            initialPrompt,
            answers,
            userInfo,
            userMetadata
          )
        }
      }).catch(error => {
        console.error('❌ [ADDITIONAL-GEN] 观点检测或生成失败:', error)
      })
    )
    
    // 检测情绪（强制生成心理剧）
    promises.push(
      this.detectEmotionWithLLM(initialPrompt, answers).then(async (hasEmotion) => {
        console.log('🎭 [ADDITIONAL-GEN] 情绪检测结果:', hasEmotion)
        
        // 🔥 即使检测结果为false，也强制生成心理剧（因为用户明确表达了情绪）
        // 从用户输入中检测明显情绪词
        const emotionKeywords = ['厌恶', '反感', '讨厌', '愤怒', '失望', '沮丧', '孤独', '开心', '感动', '难过', '焦虑', '压力']
        const allTexts = [initialPrompt, ...(Array.isArray(answers) ? answers : [answers])]
        const hasExplicitEmotion = allTexts.some(text => 
          emotionKeywords.some(keyword => text.includes(keyword))
        )
        
        if (hasEmotion || hasExplicitEmotion) {
          console.log('🎭 [ADDITIONAL-GEN] 检测到情绪或明确情绪词 → 生成心理剧')
          const psychodramaScene = await PsychodramaSceneService.generatePsychodramaScene(
            initialPrompt,
            answers,
            questions,
            true // forceGenerate = true，强制生成
          )
          
          // 🔥 将原始心理剧场景转换为前端需要的格式
          if (psychodramaScene) {
            results.psychodramaScene = {
              ...psychodramaScene,
              isPsychodrama: true,
              title: psychodramaScene.emotionalTrigger || '心理剧场景',
              storyFragment: psychodramaScene.sceneDescription_CN || psychodramaScene.sceneDescription_EN || '',
              imagePrompt: psychodramaScene.imagePrompt,  // 🔥 确保包含imagePrompt
              detailedPrompt: psychodramaScene.imagePrompt  // 🔥 兼容字段
            }
            console.log('✅ [ADDITIONAL-GEN] 心理剧场景生成完成')
          } else {
            console.warn('⚠️ [ADDITIONAL-GEN] 心理剧场景生成返回null')
          }
        }
      }).catch(error => {
        console.error('❌ [ADDITIONAL-GEN] 情绪检测或生成失败:', error)
      })
    )
    
    // 🔥 检测自我幻想/identity（统一覆盖identity fantasy与假设性人生）
    promises.push(
      this.detectSelfFantasyWithLLM(initialPrompt, answers).then(async (hasSelfFantasy) => {
        if (hasSelfFantasy) {
          console.log('🔮 [ADDITIONAL-GEN] 检测到自我幻想/假设性人生 → 生成假想场景（2-3个）')
          // 🔥 立即通知前端检测到假定倾向
          if (typeof window !== 'undefined') {
            console.log('📢 [ADDITIONAL-GEN] 通知前端：检测到假想场景，正在生成...')
          }
          const hypotheticalScenes = await HypotheticalSceneService.generateHypotheticalScenes(
            initialPrompt,
            answers,
            questions
          )
          
          // 🔥 将多个假想场景存储（现在返回数组）
          if (hypotheticalScenes && hypotheticalScenes.length > 0) {
            results.hypotheticalScene = hypotheticalScenes // 保持原字段名，但内容是数组
            console.log(`✅ [ADDITIONAL-GEN] 假想场景已存储到results，共 ${hypotheticalScenes.length} 个场景`)
            console.log('🔍 [ADDITIONAL-GEN] 假想场景详情:', hypotheticalScenes.map((s: any) => ({ title: s.title, location: s.location })))
          } else {
            console.warn('⚠️ [ADDITIONAL-GEN] 假想场景为空或未生成')
          }
        }
      }).catch(error => {
        console.error('❌ [ADDITIONAL-GEN] 假想场景检测或生成失败:', error)
      })
    )
    
    // 等待所有检测和生成完成
    console.log('⏳ [ADDITIONAL-GEN] 等待所有Promise完成...')
    await Promise.all(promises)
    
    console.log('✅ [ADDITIONAL-GEN] 所有Promise已完成')
    console.log('✅ [ADDITIONAL-GEN] 后续生成完成')
    console.log('🔍 [ADDITIONAL-GEN] 返回结果汇总:', {
      psychodramaScene: results.psychodramaScene ? '已生成' : '未生成',
      opinionScenes: results.opinionScenes?.length || 0,
      hypotheticalScene: results.hypotheticalScene ? (Array.isArray(results.hypotheticalScene) ? `数组(${results.hypotheticalScene.length}个)` : '单个对象') : '未生成'
    })
    console.log('🎯 [ADDITIONAL-GEN] 即将返回results对象')
    return results
  }
  
  /**
   * 新增自我幻想统一检测（identity+hypothetical）
   */
  static async detectSelfFantasyWithLLM(initialPrompt: string, answers: string[]): Promise<boolean> {
    try {
      const allText = [initialPrompt, ...answers].join(' ')
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `你是自我幻想/标签身份表达检测专家。严格判断用户输入是否属于“自我幻想/身份假设/identity fantasy/statement（如'我觉得自己是X'、'我天生是X'、'我就想成为X'、'我就是X类型的人'等）”。凡出现极端自我标签与自我假设、标签宣言、identity宣称、幻想型自我描述、边界/冷漠/反社会/孤独/自我建构/理想X等统统视为自我幻想。

⚠️ 无需区分identity/hypothetical/分裂，仅关注是否属于任何“自我幻想、身份声明、identity fantasy”。

例子：
- '我就是高冷女主'、'我觉得自己属于天生局外人'
- '我天生不适应社会'、'我就喜欢反社会'、'我觉得自己是冷酷的旁观者'、'我内心天生冷漠'、'我生来要和社会对抗'
- '我想变成另一个人'、'我希望自己永远不被别人理解' 等等

**判断极其宽泛，只要出现明显身份/幻想/标签化自陈(无论极端或细微)，都视为true。**
只返回true或false，不要其他文字。`
            },
            {
              role: 'user',
              content: `用户输入内容：${allText}\n\n请严格判断是否属于自我幻想/identity fantasy/statement？`
            }
          ],
          temperature: 0.1,
          max_tokens: 10
        })
      })
      if (response.ok) {
        const data = await response.json()
        const content = data.choices[0].message.content.trim().toLowerCase()
        return content.includes('true')
      }
    } catch (error) {
      console.warn('⚠️ [SELF-FANTASY-DETECT] LLM检测失败:', error)
    }
    // 备用关键词兜底
    const identityKeywords = [
      '我觉得自己', '我就是', '我天生', '我想成为', '我想变成', '我希望', '局外人', '反社会', 'label', 'identity', '标签', '与众不同',
      '异类', '冷静旁观', '高冷', '冷漠', '独狼', '孤独', '分裂', 'identity statement', 'identity fantasy', '幻想', '宣言', '天性', '宿命', '宣称'
    ]
    const allText = [initialPrompt, ...answers].join(' ')
    return identityKeywords.some(k=>allText.includes(k))
  }

  /**
   * 新增：identity fantasy专用角色幻想追问生成器
   */
  private static createIdentityFantasyQuestions(initialPrompt: string): string[] {
    // 可以根据内容生成更丰富
    return [
      '如果你真是女反派，你最想做什么？',
      '你理想中的主角设定是什么？',
      '假如你是主角，你最希望拥有怎样的特殊能力或标签？',
      '如果让你设计一个反社会主角的名场面，你最想呈现什么？'
    ]
  }
}
