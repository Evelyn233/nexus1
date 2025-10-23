import { SceneGenerationService, SceneGenerationResult } from './sceneGenerationService'
import { StoryGenerationService, StoryResult } from './storyGenerationService'
import { PsychodramaSceneService, PsychodramaScene } from './psychodramaSceneService'
import { OpinionVisualizationService } from './opinionVisualizationService'
import { MagazineCoverService, MagazineCover } from './magazineCoverService'
import { getUserInfo } from './userDataApi'

export interface ContentGenerationResult {
  scenes: SceneGenerationResult
  story: StoryResult | null
  psychodramaScene: PsychodramaScene | null
  magazineCover: MagazineCover | null
  finalPrompt?: string
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
  private static detectInputType(initialPrompt: string, answers: string[]): InputType {
    const allInputs = [initialPrompt, ...answers].join(' ')
    
    // 🔥 优先检测具体描述要素（人物、动作、地点）
    const hasCharacter = /老板|同事|朋友|男朋友|妈妈|爸爸|顾问|熟人|boss|colleague|friend/.test(allInputs)
    const hasAction = /找|来|说|做|去|开会|讨论|听|看|穿|meeting|discuss|wearing/.test(allInputs)
    const hasLocation = /公司|办公室|家|卧室|会议室|淞虹路|路|office|home|bedroom|room/.test(allInputs)
    const hasClothing = /穿|白色|T恤|睡衣|衣服|wearing|pajamas|shirt/.test(allInputs)
    const hasTime = /今天|昨天|上午|下午|晚上|半夜|清晨|当时|那时候|today|yesterday|night|morning/.test(allInputs)
    
    // 检测情绪关键词
    const hasEmotion = /失望|沮丧|焦虑|孤独|害怕|生气|想念|feel|lonely|sad|disappointed/.test(allInputs)
    
    // 检测观点关键词
    const hasOpinion = /熟人经济|依赖微信|形式主义|就是|其实|本质|表面/.test(allInputs)
    
    console.log('🔍 [INPUT-TYPE] 检测:', { hasCharacter, hasAction, hasLocation, hasClothing, hasTime, hasEmotion, hasOpinion })
    
    // 🚨 判断逻辑：只要有具体描述要素，就是MIXED（不是纯情绪）
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
    
  // 默认MIXED
  console.log('✅ [INPUT-TYPE] 默认 → MIXED')
    return InputType.MIXED
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

  // 🔥 检测输入类型
  const inputType = this.detectInputType(initialPrompt, answers)
  console.log('🎯 [CONTENT-GEN] 输入类型:', inputType)

  try {
    // 步骤1: 生成场景
    console.log('📝 [CONTENT-GEN] 步骤1: 生成场景...')
    const scenes = await SceneGenerationService.generateBaseStoryAndNarrative(
        initialPrompt,
        answers,
      questions,
      safeContextHistory.join('\n') // 传递上下文历史（作为字符串）
      )

      console.log('✅ [CONTENT-GEN] 场景生成完成')
    console.log('🔹 [CONTENT-GEN] 场景数量:', scenes.logicalScenes?.length || 0)

    // 步骤2: 检测并生成观点可视化场景（先于心理剧）
    console.log('🎨 [CONTENT-GEN] 步骤2: 检测观点...')
    const scenesWithOpinion = await OpinionVisualizationService.enhanceSceneWithOpinion(
        scenes,
        initialPrompt,
        answers
      )
      
    // 🔥 使用包含观点场景的新scenes对象
    let finalScenes = scenesWithOpinion || scenes

    if (scenesWithOpinion?.hasOpinionScene) {
      console.log('✅ [CONTENT-GEN] 观点场景生成完成，场景数:', finalScenes.logicalScenes?.length)
      } else {
      console.log('ℹ️ [CONTENT-GEN] 未生成观点场景')
    }

    // 步骤3: 检测并生成心理剧
    console.log('🎭 [CONTENT-GEN] 步骤3: 检测心理剧...')
    const scenesWithPsychodrama = await PsychodramaSceneService.enhanceSceneWithPsychodrama(
      finalScenes,
          initialPrompt,
          answers
        )
        
    // 🔥 使用包含心理剧的新scenes对象
    finalScenes = scenesWithPsychodrama || finalScenes

    if (scenesWithPsychodrama?.hasPsychodrama) {
      console.log('✅ [CONTENT-GEN] 心理剧生成完成，场景数:', finalScenes.logicalScenes?.length)
        } else {
      console.log('ℹ️ [CONTENT-GEN] 未生成心理剧')
    }

    // 步骤4: 生成故事（不阻塞）
    console.log('📖 [CONTENT-GEN] 步骤4: 准备故事生成（占位）')
    const story = {
      completeStory: '',
      storyFragments: []
    }

    return {
      scenes: finalScenes,  // 🔥 返回包含观点场景和心理剧的完整scenes  
      story: {
        narrative: story.completeStory,
        aiPrompt: '',
        sceneDescription: '',
        characterDescription: '',
        settingDescription: '',
        moodDescription: ''
      },
      psychodramaScene: null,  // 已废弃，心理剧现在在scenes.logicalScenes中                                                                            
      magazineCover: null,
      finalPrompt: '' // 已删除
    }

    } catch (error) {
      console.error('💥 [CONTENT-GEN] 内容生成失败:', error)
      throw error
    }
  }

  /**
 * 生成杂志封面
 */
static async generateMagazineCover(
  finalScenes: any,
  story: any,
    initialPrompt: string,
    answers: string[]
): Promise<MagazineCover> {
  console.log('📰 [CONTENT-GEN] 开始生成杂志封面')
  
  const cover = await MagazineCoverService.generateMagazineCover(
    finalScenes,
          story,
          initialPrompt,
          answers
        )
        
  console.log('✅ [CONTENT-GEN] 杂志封面生成完成')
  return cover || {
    needsCover: true,
    mainTitle: '默认封面',
    subtitle: '默认副标题',
    coreConflict: '默认冲突',
    conflictIntensity: 5,
    keyLocation: '默认地点',
    otherCharacters: [],
    psychologicalElements: [],
    coverStyle: '简约',
    colorScheme: '蓝色系',
    typography: '现代',
    storyType: '个人故事',
    emotionalTone: '平静',
    coverImagePrompt: '默认封面提示',
    coverImageDescription_CN: '默认中文描述',
    coverImageDescription_EN: 'Default English Description'
    }
  }
}
