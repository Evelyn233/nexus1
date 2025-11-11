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
  
  // 冲突设置（保留兼容性）
  innerConflict?: string               // 内心冲突描述（已废弃，使用 innerMonologue）
  externalConflict?: string            // 外部冲突描述（已废弃，使用 surfaceVsInner）
  conflictIntensity?: number           // 冲突强度（1-10）
  
  // 心理分析（保留兼容性）
  subconsciousDesire?: string          // 潜意识愿望（从第二层数据推测）
  consciousBehavior?: string           // 表意识行为（从第一层数据提取）
  psychologicalMechanism?: string      // 心理机制（防御、投射、压抑等）
  
  // 🆕 心理剧 narrative 字段（AI 返回的主要字段）
  innerMonologue?: string              // 内心独白（80-120字中文）
  surfaceVsInner?: string              // 表面vs内心对比（60-80字中文）
  consciousnessStream?: string          // 意识流片段（60-80字中文）
  psychologicalSymbolism?: string       // 心理象征（40-60字中文）
  
  // 场景描述
  sceneDescription_CN: string         // 中文场景描述
  sceneDescription_EN: string         // 英文场景描述（用于生图）
  narrativeBlock?: string             // 完整叙述（用户语言）
  
  // 提示词
  imagePrompt: string                 // 图像生成提示词
}

interface PsychodramaNarrative {
  innerMonologue: string
  surfaceVsInner: string
  consciousnessStream: string
  psychologicalSymbolism: string
  narrativeBlock?: string
  actionHint?: string
  sceneSummaryEn?: string
}

function limitText(text: string, maxLength: number) {
  if (!text) return ''
  const trimmed = text.trim()
  return trimmed.length <= maxLength ? trimmed : `${trimmed.slice(0, maxLength - 1)}…`
}

function normalizeArrayField(field: any, limit = 4): string[] {
  if (!field) return []
  if (Array.isArray(field)) {
    return field
      .map(item => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .slice(0, limit)
  }
  if (typeof field === 'string') {
    try {
      const parsed = JSON.parse(field)
      if (Array.isArray(parsed)) {
        return parsed
          .map(item => (typeof item === 'string' ? item.trim() : ''))
          .filter(Boolean)
          .slice(0, limit)
      }
      if (typeof parsed === 'string') {
        return [parsed.trim()].filter(Boolean)
      }
    } catch {
      // treat as comma separated
      return field
        .split(/[，,、;]/)
        .map(item => item.trim())
        .filter(Boolean)
        .slice(0, limit)
    }
  }
  return []
}

function buildProtagonistAppearance(userInfo?: any, userMetadata?: any) {
  if (!userInfo) {
    return null
  }

  const gender = typeof userInfo.gender === 'string' ? userInfo.gender.toLowerCase() : 'female'
  const isMale = gender === 'male' || gender === 'man' || gender === 'm'
  const genderCN = isMale ? '男性' : '女性'
  const genderEN = isMale ? 'male' : 'female'

  let ageNumber: number | null = null
  if (typeof userInfo.age === 'number') {
    ageNumber = userInfo.age
  } else if (typeof userInfo.age === 'string') {
    const parsed = parseInt(userInfo.age, 10)
    if (!Number.isNaN(parsed)) {
      ageNumber = parsed
    }
  }
  const ageCN = ageNumber ? `${ageNumber}岁` : '二十多岁'
  const ageEN = ageNumber ? `${ageNumber}-year-old` : 'mid-twenties'

  const normalizeHair = (hair?: string) => {
    if (!hair) return { cn: '黑色长发', en: 'long black hair' }
    const trimmed = hair.trim()
    if (!trimmed) return { cn: '黑色长发', en: 'long black hair' }
    if (/短|短发/.test(trimmed)) {
      return { cn: '黑色短发', en: 'short black hair' }
    }
    if (/中长|及肩/.test(trimmed)) {
      return { cn: '黑色及肩发', en: 'shoulder-length black hair' }
    }
    if (/卷|波浪/.test(trimmed)) {
      return { cn: '黑色微卷长发', en: 'long wavy black hair' }
    }
    return { cn: '黑色长发', en: 'long black hair' }
  }

  const hairResult = normalizeHair(userInfo.hairLength)

  const metadataTraits = normalizeArrayField(userMetadata?.corePersonalityTraits, 3)
  const metadataStyle = normalizeArrayField(
    userMetadata?.styleInsights?.length ? userMetadata.styleInsights : userMetadata?.aestheticPreferences,
    3
  )

  const buildCN = () => {
    const locationCN = typeof userInfo.location === 'string' && userInfo.location.trim()
      ? `${userInfo.location.trim()}`
      : '中国'
    const temperamentCN = (() => {
      const personality = typeof userInfo.personality === 'string' ? userInfo.personality.trim() : ''
      const traitText = metadataTraits.length > 0 ? metadataTraits.join('、') : personality.replace(/。$/, '')
      if (traitText) {
        return `，气质带着${traitText}`
      }
      return '，带着理性与情绪交织的气质'
    })()
    const styleCN = metadataStyle.length > 0 ? `，风格偏向${metadataStyle.join('、')}` : ''
    return `主角外观：${ageCN}的${locationCN}${genderCN}，${hairResult.cn}，肤色自然偏暖，眼神里有倦意与坚持${temperamentCN}${styleCN}。`
  }

  const buildEN = () => {
    const locationEN = typeof userInfo.location === 'string' && userInfo.location.trim()
      ? `${userInfo.location.trim()}`
      : 'China'
    const traitEN = (() => {
      if (metadataTraits.length > 0) {
        return metadataTraits.join(', ')
      }
      const personality = typeof userInfo.personality === 'string' ? userInfo.personality.trim() : ''
      return personality || 'rational yet deeply feeling'
    })()
    const styleEN = metadataStyle.length > 0 ? `Style cues: ${metadataStyle.join(', ')}.` : ''
    return `Protagonist appearance: ${ageEN} Chinese ${genderEN} from ${locationEN}, ${hairResult.en}, warm beige skin, eyes carrying exhaustion yet resolve. Personality keywords: ${traitEN}. ${styleEN}`.trim()
  }

  return {
    cn: buildCN(),
    en: buildEN()
  }
}

function createPsychodramaImagePrompt({
  emotionType,
  emotionIntensity,
  location,
  baseSceneInfo,
  symbolism,
  surfaceVsInner,
  consciousnessStream,
  clothingHint,
  actionHint,
  protagonistName,
  userProfile,
  userMetadata
}: {
  emotionType: string
  emotionIntensity: number
  location: string
  baseSceneInfo?: {
    location?: string
    description?: string
    objects?: string[]
    clothing?: string
    peopleCount?: string
    atmosphere?: string
  } | null
  symbolism: string
  surfaceVsInner: string
  consciousnessStream: string
  clothingHint: string
  actionHint?: string
  protagonistName?: string
  userProfile?: any
  userMetadata?: any
}) {
  const narrativeSegments: string[] = []

  if (protagonistName) {
    narrativeSegments.push(`主角：${protagonistName}（请以第一人称呈现她的神态）`)
  } else {
    narrativeSegments.push('主角：用户本人（保持第一人称神态）')
  }

  if (location) {
    narrativeSegments.push(`场景地点：${location}`)
  }

  const appearance = buildProtagonistAppearance(userProfile, userMetadata)
  if (appearance) {
    narrativeSegments.push(appearance.cn)
    narrativeSegments.push(appearance.en)
  }

  const traitSummaryCN = normalizeArrayField(userMetadata?.corePersonalityTraits, 3)
  const emotionSummaryCN = normalizeArrayField(userMetadata?.emotionalPattern, 2)
  const behaviorSummaryCN = normalizeArrayField(userMetadata?.behaviorPatterns, 2)
  const metadataSummaryCN = [
    traitSummaryCN.length > 0 ? `心理特质：${traitSummaryCN.join('、')}` : '',
    emotionSummaryCN.length > 0 ? `情绪模式：${emotionSummaryCN.join('、')}` : '',
    behaviorSummaryCN.length > 0 ? `行为习惯：${behaviorSummaryCN.join('、')}` : ''
  ].filter(Boolean)
  if (metadataSummaryCN.length > 0) {
    narrativeSegments.push(metadataSummaryCN.join('；'))
  }

  const traitSummaryEN = normalizeArrayField(userMetadata?.corePersonalityTraits, 3)
  const styleSummaryEN = normalizeArrayField(userMetadata?.styleInsights || userMetadata?.aestheticPreferences, 2)
  if (traitSummaryEN.length > 0 || styleSummaryEN.length > 0) {
    const traitText = traitSummaryEN.length > 0 ? `Personality traits: ${traitSummaryEN.join(', ')}.` : ''
    const styleText = styleSummaryEN.length > 0 ? `Style or aesthetic leanings: ${styleSummaryEN.join(', ')}.` : ''
    narrativeSegments.push(`${traitText} ${styleText}`.trim())
  }

  if (baseSceneInfo?.description) {
    narrativeSegments.push(`场地氛围：${baseSceneInfo.description}`)
  }

  if (Array.isArray(baseSceneInfo?.objects) && baseSceneInfo.objects.length > 0) {
    narrativeSegments.push(`关键物件：${baseSceneInfo.objects.join('、')}`)
  }

  if (emotionType) {
    narrativeSegments.push(`主导情绪：${emotionType}（强度 ${emotionIntensity}/10）`)
  }

  if (surfaceVsInner) {
    narrativeSegments.push(`表层与内心：${surfaceVsInner}`)
  }

  if (consciousnessStream) {
    narrativeSegments.push(`意识流片段：${consciousnessStream}`)
  }

  if (symbolism) {
    narrativeSegments.push(`心理象征：${symbolism}`)
  }

  if (clothingHint) {
    narrativeSegments.push(`穿着提示：${clothingHint}`)
  }

  if (actionHint) {
    narrativeSegments.push(`动作提示：${actionHint}`)
  }

  if (baseSceneInfo?.atmosphere) {
    narrativeSegments.push(`环境补充：${baseSceneInfo.atmosphere}`)
  }

  return narrativeSegments.join('\n') || '心理剧场景：根据叙述生成视觉画面'
}

function buildPsychodramaNarrativePrompt({
  emotion,
  location,
  allInputs,
  baseSceneInfo,
  consciousTraits,
  subconsciousTraits
}: {
  emotion: { type: string, intensity: number, trigger: string, quote?: string }
  location: string
  allInputs: string[]
  baseSceneInfo?: {
    location?: string
    description?: string
    objects?: string[]
    atmosphere?: string
  } | null
  consciousTraits: string[]
  subconsciousTraits: string[]
}) {
  const conversationHighlights = allInputs
    .slice(0, 6)
    .map((input, index) => `- 输入${index + 1}: ${input}`)
    .join('\n')
  const consciousLine = consciousTraits.length > 0
    ? `- 表层关键词：${consciousTraits.slice(0, 4).join('、')}`
    : ''
  const subconsciousLine = subconsciousTraits.length > 0
    ? `- 深层特质：${subconsciousTraits.slice(0, 4).join('、')}`
    : ''
  const sceneLine = baseSceneInfo
    ? `- 当前具体情境：${baseSceneInfo.location || location}；环境细节：${(baseSceneInfo.objects || []).slice(0, 4).join('、') || '日常物件'}`
    : ''

  return `
你是心理剧编剧，请根据输入编写「叙述部分」，只关注文字内容，先写完叙述，图像稍后由模板生成。

输出JSON（不要额外说明）：
{
  "innerMonologue": "80-120字中文，直接呈现人物脑海里的第一人称独白，可以引用原话，保持真实情绪。",
  "surfaceVsInner": "50-70字中文，使用"表面上……，内心却……"结构描述外表与内心的对比。",
  "consciousnessStream": "50-70字中文，用"..."连接的片段，保留关键词和语气词，像快速闪过的念头。",
  "psychologicalSymbolism": "40-60字中文，给出一个贴合场景的象征或隐喻，不能照抄模板。",
  "actionHint": "10-20字中文，概括此刻身体动作或姿态，可选字段。",
  "sceneSummaryEn": "2 sentences in English summarising the moment and its emotional tension.",
  "narrativeBlock": "120-160字，严格使用用户主要语言，以第一人称“我”自然串联整个心理剧，把情绪、动作和象征织成完整叙述，保持情绪锋利"
}

写作要求：
1. 所有中文字段必须自然、口语化，围绕用户真实情绪，避免空泛大词。
2. 不能凭空杜撰场景外的角色或事件。
3. priority：使用元输入的关键情绪和观点，其次才是深层特质做点缀。
4. 如果用户表达讽刺/愤怒/失望，文本里要保留这种锋芒，不能柔化。
5. sceneSummaryEn 仅需两句英文，准确描述场景与内心张力。
6. 任何字段都必须以第一人称“我”自然展开，不要出现姓名、"我是Evelyn"、"我是这场心理剧的主角"等自我介绍句式。
7. narrativeBlock 只能使用用户主要语言（用户输入多为中文就写中文，反之写英文），保持自然完整，不可逐句拼贴。

关键信息：
- 情绪类型：${emotion.type}（强度 ${emotion.intensity}/10）
- 情绪触发：${emotion.trigger}
- 用户原话：${limitText(emotion.quote || '无', 120)}
- 场景地点：${location}
${sceneLine}
${consciousLine}
${subconsciousLine}
- 对话摘录：
${conversationHighlights}
`.trim()
}

function extractJsonBlock(content: string) {
  let jsonString = content.trim()
  if (jsonString.includes('```json')) {
    jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
  } else if (jsonString.includes('```')) {
    jsonString = jsonString.replace(/```/g, '').trim()
  }
  const jsonStart = jsonString.indexOf('{')
  const jsonEnd = jsonString.lastIndexOf('}')
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    jsonString = jsonString.substring(jsonStart, jsonEnd + 1)
  }
  jsonString = jsonString
    .replace(/，/g, ',')
    .replace(/：/g, ':')
    .replace(/"/g, '"')
    .replace(/"/g, '"')
  return jsonString
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
      let userInfo = await getUserInfo()
      const userMetadata = await getUserMetadata()
      
      // 🔥 确保用户信息完整性，添加默认值
      if (!userInfo) {
        console.warn('⚠️ [PSYCHODRAMA] 用户信息为空，使用默认值')
        userInfo = {
          name: '用户',
          gender: 'female',
          birthDate: {
            year: '1999',
            month: '3',
            day: '16'
          },
          height: '165cm',
          weight: '50kg',
          location: '上海',
          personality: '理性思维与艺术感知的独特结合',
          hairLength: '长发',
          age: 26
        }
      }
      
      // 确保关键信息存在
      if (!userInfo.name) userInfo.name = '用户'
      if (!userInfo.gender) userInfo.gender = 'female'
      if (!userInfo.age) userInfo.age = 26
      if (!userInfo.height) userInfo.height = '165cm'
      if (!userInfo.hairLength) userInfo.hairLength = '长发'
      if (!userInfo.personality) userInfo.personality = '理性思维与艺术感知的独特结合'
      if (!userInfo.birthDate) {
        userInfo.birthDate = {
          year: '1999',
          month: '3',
          day: '16'
        }
      }
      
      console.log('✅ [PSYCHODRAMA] 用户信息验证完成:', {
        gender: userInfo.gender,
        age: userInfo.age,
        height: userInfo.height,
        hairLength: userInfo.hairLength
      })
      
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
  private static async buildPsychodramaScene(
    emotion: { type: string, intensity: number, trigger: string, quote: string },
    initialPrompt: string,
    answers: string[],
    questions: string[],
    userInfo: any,
    userMetadata: any,
    previousMetaphors: string[] = [],
    baseScene?: any
  ): Promise<PsychodramaScene> {
    const safeJsonParse = (data: any, fallback: any = []) => {
      if (Array.isArray(data)) return data
      if (typeof data === 'object' && data !== null) return data
      if (typeof data === 'string') {
        if (data.trim() === '' || data === 'null') return fallback
        try {
          return JSON.parse(data)
        } catch (error) {
          console.warn('⚠️ [PSYCHODRAMA] JSON解析失败:', data)
          return fallback
        }
      }
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
    
    const allInputs = [initialPrompt, ...answers].filter(input => input && input.trim())
    console.log('🔄 [PSYCHODRAMA] 叙述输入汇总:', allInputs)

    const extractedLocation = (() => {
      const allText = allInputs.join(' ')
      if (allText.includes('淞虹路') || allText.includes('淞沪路')) {
        if (allText.includes('8楼') || allText.includes('八楼')) return '淞虹路公司8楼'
        if (allText.includes('会议室')) return '淞虹路公司会议室'
        return '淞虹路公司'
      }
      if (allText.includes('朝阳区')) return '朝阳区办公室'
      if (allText.includes('金融街')) return '金融街'
      if (allText.includes('静安寺')) return '静安寺'
      if (allText.includes('悉尼大学') || allText.includes('Sydney')) return '悉尼大学'
      if (allText.includes('会议室') || allText.includes('会议')) return '公司会议室'
      if (allText.includes('8楼') || allText.includes('八楼')) return '公司8楼'
      if (allText.includes('办公室') || allText.includes('公司')) return '公司办公室'
      if (allText.includes('家') || allText.includes('卧室') || allText.includes('客厅') ||
          allText.includes('睡衣') || allText.includes('被子') || allText.includes('床') ||
          allText.includes('被吵醒') || allText.includes('半夜') || allText.includes('窗户') ||
          allText.includes('起床') || allText.includes('起来')) {
        return '家中'
      }
      if (allText.includes('工作') || allText.includes('项目') || allText.includes('同事') || allText.includes('老板') || 
          allText.includes('上班') || allText.includes('办公室') || allText.includes('公司') || 
          allText.includes('chatgpt') || allText.includes('ChatGPT') || allText.includes('chat')) {
      return '办公室'
      }
      return '家中'
    })()
    
    const baseSceneInfo = baseScene ? {
      location: baseScene.location || extractedLocation,
      description: baseScene.description || baseScene.description_zh,
      objects: baseScene.visualDetails?.objects || [],
      clothing: baseScene.visualDetails?.clothing || 'casual clothing',
      peopleCount: baseScene.peopleCount || 'alone',
      atmosphere: baseScene.visualDetails?.atmosphere || 'realistic'
    } : null
    
    const combinedInputs = allInputs.join(' ')
    const combinedInputsLower = combinedInputs.toLowerCase()
    const userPrimaryIsChinese = /[\u4e00-\u9fff]/.test(combinedInputs)

    const hasRiver = combinedInputs.includes('河') || combinedInputsLower.includes('river')
    const hasMorning =
      combinedInputs.includes('清晨') ||
      combinedInputs.includes('早晨') ||
      combinedInputs.includes('早起') ||
      combinedInputsLower.includes('morning') ||
      combinedInputsLower.includes('sunrise')
    const hasWalk =
      combinedInputs.includes('散步') ||
      combinedInputs.includes('走路') ||
      combinedInputsLower.includes('walk')
    const hasFoodContext =
      combinedInputs.includes('烧烤') ||
      combinedInputs.includes('烤串') ||
      combinedInputs.includes('烤肉') ||
      combinedInputs.includes('餐') ||
      combinedInputs.includes('杯') ||
      combinedInputs.includes('味道') ||
      combinedInputs.includes('香味') ||
      combinedInputsLower.includes('bbq') ||
      combinedInputsLower.includes('dinner') ||
      combinedInputsLower.includes('meal') ||
      combinedInputsLower.includes('restaurant')

    const defaultLocationCN = baseScene?.location || extractedLocation || baseScene?.title || '家中'
    const defaultLocationEN = baseScene?.location_EN || baseScene?.location || 'a quiet interior space'

    const deriveFallbackContext = (
      rawText: string,
      defaults: { locationCN: string; locationEN: string }
    ) => {
      const lower = rawText.toLowerCase()
      const contains = (keyword: string) => rawText.includes(keyword)

      if (
        contains('烧烤') ||
        contains('烤串') ||
        contains('烤肉') ||
        contains('炭火') ||
        contains('服务员') ||
        lower.includes('bbq')
      ) {
        return {
          locationCN: defaults.locationCN.includes('家') ? defaults.locationCN : '家中的客厅',
          locationEN: defaults.locationEN || 'a lived-in apartment living room',
          descriptionCN: '空气里还缠着炭火与孜然的味道，小桌上散落着签子和刚拆开的外卖袋。',
          descriptionEN: 'The air still carries charcoal and cumin; skewers and takeaway bags rest on the table.',
          objects: ['冒着余温的烤串签', '倒了一半的茶杯', '摊开的收据'],
          atmosphere: 'glow of charcoal warmth mixing with night air',
          surfaceActionCN: '她安静地坐在家里的椅子上，指尖不自觉地摩挲杯壁。',
          surfaceActionEN: 'She sits quietly at home, fingertips tracing the rim of a warm cup.',
          surfaceSummaryPositiveCN: '表面上她只是坐着回味那顿烧烤，内心却因真实的善意而慢慢松开。',
          surfaceSummaryPositiveEN: 'Outwardly she just sits and remembers the meal; inwardly the genuine kindness eases her guard.',
          surfaceSummaryNegativeCN: '表面上她依旧维持冷静的坐姿，内心却提醒自己别被瞬间的温度迷惑。',
          surfaceSummaryNegativeEN: 'Outwardly she keeps a cool pose; inwardly she warns herself not to be fooled by a fleeting warmth.',
          innerPositiveCN: '那份被服务员点燃的满足感让她暂时放下对社会的尖锐嘲讽。',
          innerPositiveEN: 'The attentive service softens her usual barbed view of society.',
          innerNegativeCN: '她仍听见心里那股讥讽的回音，担心温度会像炭火一样很快熄灭。',
          innerNegativeEN: 'Cynical echoes remain, afraid the warmth will die like a coal ember.',
          innerPositiveAddon: '她想把这种真实的温度好好记住。',
          innerNegativeAddon: '她提醒自己别让短暂的感动削弱了戒心。',
          symbolismPositive: '桌上残留的炭火像黑暗里保存下来的篝火，让她看到世界仍有光亮。',
          symbolismNegative: '逐渐暗下的炭火像即将熄灭的信念，提醒她温暖往往太短暂。',
          actionHint: '双手环抱温热的杯子，让指尖记住炭火的温度',
          clothing: 'soft sweater still carrying a hint of charcoal smoke',
          consciousBehavior: '她轻轻呼一口气，让香味在口腔里停留更久。',
          streamFallback: ['炭火的香味', '服务员的笑脸', '嘲讽社会的老念头', '真实的温暖'],
          taskPositive: '记录下善意带来的安全感',
          taskNegative: '看清温暖背后仍存的疑虑',
          mechanismPositive: '用真实的体验修补对世界的怀疑裂缝',
          mechanismNegative: '用理性框住情绪，避免再次失望'
        }
      }

      return {
        locationCN: defaults.locationCN,
        locationEN: defaults.locationEN,
        descriptionCN: '清晨的空气还带着水汽，光线从窗边斜落。',
        descriptionEN: 'Morning air still carries dew; light falls in from the window.',
        objects: ['窗边的植物', '折叠好的外套', '玻璃水杯'],
        atmosphere: 'soft morning hush',
        surfaceActionCN: '她站在窗边，努力让呼吸与脉搏同步。',
        surfaceActionEN: 'She stands by the window, syncing breath to pulse.',
        surfaceSummaryPositiveCN: '表面上她只是调整呼吸，内心却因这份宁静而渐渐松开。',
        surfaceSummaryPositiveEN: 'Outwardly she only adjusts her breathing; inwardly the quiet loosens a knot.',
        surfaceSummaryNegativeCN: '表面上她显得平静，内心却仍被焦虑紧紧勒住。',
        surfaceSummaryNegativeEN: 'Outwardly she seems calm, but anxiety still holds tight inside.',
        innerPositiveCN: '一点点勇气重新回到身体里，仿佛今天的开始值得被珍惜。',
        innerPositiveEN: 'A small courage returns to her body; this beginning feels worth keeping.',
        innerNegativeCN: '胸口依旧发紧，她担心下一次失控随时会出现。',
        innerNegativeEN: 'Her chest stays tight, bracing for the next slip.',
        innerPositiveAddon: '她想把这种稳稳的节奏延续下去。',
        innerNegativeAddon: '她提醒自己别再松懈。',
        symbolismPositive: '窗外的光像柔软的带子，把她从阴影里牵出。',
        symbolismNegative: '窗外的雾像一层玻璃墙，把她和真实的暖意隔开。',
        actionHint: '顺着窗外的光线缓慢吸气',
        clothing: 'soft knit layered with a light coat',
        consciousBehavior: '她盯着窗框的影子数呼吸。',
        streamFallback: ['窗外的光线', '昨夜的念头', '今天的节奏'],
        taskPositive: '把这份安定感保持到接下来的计划里',
        taskNegative: '识别焦虑真正的触发点',
        mechanismPositive: '通过身体节奏重新获得掌控感',
        mechanismNegative: '用具体动作把情绪锁进可控范围'
      }
    }

    const derivedContext = deriveFallbackContext(combinedInputs, {
      locationCN: defaultLocationCN,
      locationEN: defaultLocationEN
    })

    const fallbackLocation = extractedLocation || derivedContext.locationCN

    const fallbackLocationEN =
      baseScene?.location_EN ||
      baseScene?.location ||
      derivedContext.locationEN ||
      'an introspective interior space'

    const clothingHintBase =
      answers.find(a => a.includes('穿') || a.includes('衣服')) ||
      baseScene?.visualDetails?.clothing

    const consciousTraits = Array.isArray(consciousData.mentionedKeywords) ? consciousData.mentionedKeywords : []
    const subconsciousTraits = Array.isArray(subconsciousData.coreTraits) ? subconsciousData.coreTraits : []

    const narrativePrompt = buildPsychodramaNarrativePrompt({
      emotion,
      location: baseSceneInfo?.location || extractedLocation || fallbackLocation,
      allInputs,
      baseSceneInfo,
      consciousTraits,
      subconsciousTraits
    })

    const controller = new AbortController()
    let timeoutId: NodeJS.Timeout | null = null
    let narrative: PsychodramaNarrative | null = null

    try {
      timeoutId = setTimeout(() => {
        console.warn('⏱️ [PSYCHODRAMA] 叙述生成超时，终止请求')
        controller.abort()
      }, 45000)

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        signal: controller.signal,
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: 'You are a bilingual psychodrama narrator. Focus on short, vivid psychological writing. Always respond with valid JSON only.'
            },
            {
              role: 'user',
              content: narrativePrompt
            }
          ],
          temperature: 0.45,
          max_tokens: 650
        })
      })

      if (timeoutId) {
        clearTimeout(timeoutId)
      }

      console.log('✅ [PSYCHODRAMA] 叙述响应状态:', response.status)

      if (response.ok) {
        const data = await response.json()
        const content = data.choices[0].message.content.trim()
        const jsonString = extractJsonBlock(content)
        const parsed = JSON.parse(jsonString)
        const candidate: PsychodramaNarrative = {
          innerMonologue: (parsed.innerMonologue || '').trim(),
          surfaceVsInner: (parsed.surfaceVsInner || '').trim(),
          consciousnessStream: (parsed.consciousnessStream || '').trim(),
          psychologicalSymbolism: (parsed.psychologicalSymbolism || '').trim(),
          actionHint: (parsed.actionHint || '').trim(),
          sceneSummaryEn: (parsed.sceneSummaryEn || '').trim(),
          narrativeBlock: (parsed.narrativeBlock || '').trim()
        }
        if (
          candidate.innerMonologue &&
          candidate.surfaceVsInner &&
          candidate.consciousnessStream &&
          candidate.psychologicalSymbolism
        ) {
          narrative = candidate
          console.log('🧠 [PSYCHODRAMA] 叙述生成内容:', candidate)
          console.log('✅ [PSYCHODRAMA] 叙述生成成功')
        } else {
          console.warn('⚠️ [PSYCHODRAMA] 叙述字段不完整，fallback')
          console.warn('📄 [PSYCHODRAMA] 叙述内容预览:', candidate)
        }
      } else {
        const errorText = await response.text()
        console.error('❌ [PSYCHODRAMA] 叙述生成失败:', response.status, errorText)
      }
    } catch (error) {
      console.error('❌ [PSYCHODRAMA] 叙述生成异常:', error)
    } finally {
      if (timeoutId) {
        clearTimeout(timeoutId)
      }
    }

    const extractBehaviorDescription = () => {
      const segments = combinedInputs
        .split(/[\n。！？!?\r]/)
        .map(segment => segment.trim())
        .filter(Boolean)

      const hasActionSignature = (segment: string) => {
        if (!segment) return false
        const pronounMatch = /(她|他|我)/.test(segment)
        if (!pronounMatch) return false
        const actionMatch = /(在|着|地|着手|握|靠|沿|举|捧|端|踩|走|坐|站|靠着|顺着|保持|调整|吸|呼|品|回味)/.test(segment)
        if (!actionMatch) return false
        return true
      }

      const descriptiveSegment =
        segments.find(segment => hasActionSignature(segment) && segment.length >= 6) ||
        segments.find(segment => hasActionSignature(segment)) ||
        segments.find(segment => /(她|他|我)/.test(segment))

      if (descriptiveSegment) {
        return descriptiveSegment
      }

      if (typeof baseScene?.consciousBehavior === 'string' && baseScene.consciousBehavior.trim()) {
        return baseScene.consciousBehavior
      }

      if (hasFoodContext) {
        return isPositiveEmotion || isCalmEmotion
          ? '她双手捧着还残留炭火温度的杯子，让香气慢慢安抚胸口。'
          : '她握紧杯身的热度，提醒自己不要被短暂的香味牵着情绪走。'
      }

      if (hasWalk) {
        return isPositiveEmotion || isCalmEmotion
          ? '她让步伐跟着呼吸慢慢展开，不再把时间往后拖'
          : '她刻意放慢步伐，让紧绷的思绪在节奏里慢慢化开'
      }

      return isPositiveEmotion || isCalmEmotion
        ? '她让呼吸沿着胸腔缓缓铺开，给内心的温度留出空间。'
        : '她稳住肩膀和呼吸，不让胸口的紧绷继续扩散。'
    }

    const clothingHint = clothingHintBase || baseSceneInfo?.clothing || 'textured attire with muted tones echoing inner tension'
    const protagonistName = typeof userInfo?.name === 'string' ? userInfo.name.trim() : ''

    const toFirstPersonChinese = (text?: string) => {
      if (!text) return ''
      let result = text
        .replace(/她们/g, '我们')
        .replace(/他们/g, '我们')
      result = result.replace(/(?<![其那这])她的/g, '我的')
      result = result.replace(/(?<![其那这])他的/g, '我的')
      result = result.replace(/(?<![其那这])她/g, '我')
      result = result.replace(/(?<![其那这])他/g, '我')
      return result
    }

    const normalizeNarrative = (narr: PsychodramaNarrative): PsychodramaNarrative => {
      const normalizedInner = toFirstPersonChinese(narr.innerMonologue)

      let normalizedSurface = toFirstPersonChinese(narr.surfaceVsInner)
      if (normalizedSurface) {
        normalizedSurface = normalizedSurface
          .replace(/表面上(?!我)/, '表面上我')
          .replace(/内心却(?!我)/, '内心却我')
      }

      const normalizedStream = toFirstPersonChinese(narr.consciousnessStream)
      const normalizedSymbolism = toFirstPersonChinese(narr.psychologicalSymbolism)
      const normalizedAction = toFirstPersonChinese(narr.actionHint)

      let normalizedSummary = narr.sceneSummaryEn || ''
      if (normalizedSummary) {
        normalizedSummary = normalizedSummary
          .replace(/\bThe protagonist\b/gi, protagonistName ? `${protagonistName}` : 'I')
          .replace(/\bShe\b/g, 'I')
          .replace(/\bHe\b/g, 'I')
          .replace(/\bHer\b/g, 'My')
          .replace(/\bHis\b/g, 'My')
      }

      return {
        ...narr,
        innerMonologue: normalizedInner,
        surfaceVsInner: normalizedSurface,
        consciousnessStream: normalizedStream,
        psychologicalSymbolism: normalizedSymbolism,
        narrativeBlock: narr.narrativeBlock,
        actionHint: normalizedAction,
        sceneSummaryEn: normalizedSummary
      }
    }

    const buildCombinedNarrativeCN = (narr: PsychodramaNarrative) => {
      const stream = narr.consciousnessStream
        ? narr.consciousnessStream.replace(/\.\.\./g, '…')
        : ''
      const segments = [
        protagonistName
          ? `我是${protagonistName}，这整个场景发生在我身上。`
          : '我是这场心理剧里体验一切的用户本人。',
        narr.innerMonologue,
        narr.surfaceVsInner,
        stream ? `念头像弹幕一样掠过：${stream}` : '',
        narr.psychologicalSymbolism
      ].filter(Boolean)
      return segments.join(' ')
    }

    const buildCombinedNarrativeEN = (narr: PsychodramaNarrative, fallback: string) => {
      if (narr.sceneSummaryEn && narr.sceneSummaryEn.trim().length > 0) {
        const summary = narr.sceneSummaryEn.trim()
        const inner = narr.consciousnessStream
          ? `Her rapid-fire thoughts whisper "${narr.consciousnessStream.replace(/\.\.\./g, ' … ')}".`
          : ''
        const symbolism = narr.psychologicalSymbolism
          ? `Symbolism: ${narr.psychologicalSymbolism}`
          : ''
        return [summary, inner, symbolism].filter(Boolean).join(' ')
      }
      return fallback
    }

    const buildScene = (
      narr: PsychodramaNarrative,
      symbolismText: string,
      sceneLocation: string,
      englishFallback: string
    ): PsychodramaScene => {
      let sceneDescriptionCN = buildCombinedNarrativeCN(narr)

      let sceneDescriptionEN = buildCombinedNarrativeEN(narr, englishFallback)
      const primaryBlock = narr.narrativeBlock?.trim()
      const containsChinese = (text?: string) => !!text && /[\u4e00-\u9fff]/.test(text)

      if (primaryBlock) {
        if (containsChinese(primaryBlock)) {
          sceneDescriptionCN = primaryBlock
        } else {
          sceneDescriptionEN = primaryBlock
        }
      }

      const finalNarrativeBlock = primaryBlock || (userPrimaryIsChinese ? sceneDescriptionCN : sceneDescriptionEN)

      console.log('📝 [PSYCHODRAMA] 最终叙述（模型）:', {
        innerMonologue: narr.innerMonologue,
        surfaceVsInner: narr.surfaceVsInner,
        consciousnessStream: narr.consciousnessStream,
        psychologicalSymbolism: symbolismText,
        actionHint: narr.actionHint,
        sceneSummaryEn: narr.sceneSummaryEn,
        narrativeBlock: finalNarrativeBlock
      })

      const imagePrompt = createPsychodramaImagePrompt({
        emotionType: emotion.type,
        emotionIntensity: emotion.intensity,
        location: sceneLocation,
        baseSceneInfo,
        symbolism: symbolismText,
        surfaceVsInner: narr.surfaceVsInner,
        consciousnessStream: narr.consciousnessStream,
        clothingHint,
        actionHint: narr.actionHint,
        protagonistName,
        userProfile: userInfo
      })

      const baseOtherCharacters = (baseScene as any)?.otherCharacters
      const otherCharacters = Array.isArray(baseOtherCharacters) ? baseOtherCharacters : []

      const subconsciousDesireText = Array.isArray(subconsciousTraits) && subconsciousTraits.length > 0
        ? subconsciousTraits.slice(0, 2).join('、')
        : ''

      return {
        emotionalTrigger: emotion.trigger,
        emotionalIntensity: emotion.intensity,
        location: sceneLocation,
        task: narr.actionHint || '识别并允许情绪显现',
        otherCharacters,
        innerMonologue: narr.innerMonologue,
        surfaceVsInner: narr.surfaceVsInner,
        consciousnessStream: narr.consciousnessStream,
        psychologicalSymbolism: symbolismText,
        innerConflict: narr.surfaceVsInner,
        externalConflict: narr.surfaceVsInner,
        conflictIntensity: emotion.intensity,
        subconsciousDesire: subconsciousDesireText
          ? `渴望落实${subconsciousDesireText}`
          : `渴望整理内心的${emotion.type}`,
        consciousBehavior: extractBehaviorDescription(),
        psychologicalMechanism: `通过觉察与表达调节${emotion.type}`,
        sceneDescription_CN: sceneDescriptionCN,
        sceneDescription_EN: sceneDescriptionEN,
        narrativeBlock: finalNarrativeBlock || undefined,
        imagePrompt
      }
    }

    const positiveKeywords = ['温暖', '感动', '愉悦', '开心', '喜悦', '平静', '满足', '放松', '幸福', '安心', '治愈', '轻松', '踏实']
    const calmKeywords = ['宁静', '柔软', '缓慢', '沉静', '自在']
    const isPositiveEmotion = positiveKeywords.some(k => emotion.type.includes(k))
    const isCalmEmotion = calmKeywords.some(k => emotion.type.includes(k))

    if (narrative) {
      const normalizedNarrative = normalizeNarrative(narrative)
      const englishFallback = `The protagonist maintains outward composure in ${baseSceneInfo?.location || fallbackLocation} while ${emotion.type} ripples beneath the surface. Symbolism highlights ${narrative.psychologicalSymbolism}.`
      console.log('🧷 [PSYCHODRAMA] 使用模型叙述构建场景')
      return buildScene(
        normalizedNarrative,
        normalizedNarrative.psychologicalSymbolism,
        baseSceneInfo?.location || fallbackLocation,
        englishFallback
      )
    }

    const buildFallbackScene = (): PsychodramaScene => {
      console.warn('⚠️ [PSYCHODRAMA] 使用fallback叙述')

      const normalizeEmotionQuote = (quote?: string) => {
        if (!quote) return ''
        let result = quote.trim()
        result = result.replace(/^['\"]/, '').replace(/['\"]$/, '')
        result = result.replace(/^(内心独白|心理独白|心声|内心OS|内在独白|内心旁白)[：:\-——\s]*/i, '')
        result = result.replace(/^['\"]/, '').replace(/['\"]$/, '')
        return result.trim()
      }

      const normalizedEmotionQuote = normalizeEmotionQuote(emotion.quote)

      const buildConsciousnessStreamFromInputs = (text: string, fallbackSegments: string[]) => {
        const normalized = text.replace(/\s+/g, ' ').trim()
        if (normalized) {
          const fragments = normalized
            .split(/[。！？!?…]/)
            .map(fragment => fragment.replace(/[\,\s]+/g, ' ').trim())
            .filter(Boolean)
          const sliced = fragments.slice(0, 4).map(fragment => limitText(fragment, 26))
          if (sliced.length > 0) {
            return `${sliced.join(' … ')} …`
          }
        }
        if (fallbackSegments.length > 0) {
          return `${fallbackSegments.join(' … ')} …`
        }
        return '思绪在胸口反复回响 … 温度与怀疑交错 … 情绪仍未降临终点 …'
      }

      const isPositiveLike = isPositiveEmotion || isCalmEmotion
      const symbolismPositive = derivedContext.symbolismPositive || '环境里的细节像隐形的符号，把真实的温度照亮。'
      const symbolismNegative = derivedContext.symbolismNegative || '角落里的暗影像未说出口的情绪，在胸口盘旋。'
      const surfaceSummaryPositiveCN =
        derivedContext.surfaceSummaryPositiveCN || `表面上她保持原有姿态，内心却因为${emotion.type}而慢慢松开。`
      const surfaceSummaryNegativeCN =
        derivedContext.surfaceSummaryNegativeCN || `表面上她仍维持镇定，内心却被${emotion.type}牢牢牵住。`
      const innerPositiveAddon = derivedContext.innerPositiveAddon || '她想把这份真实的温度记在心里。'
      const innerNegativeAddon = derivedContext.innerNegativeAddon || '她提醒自己别再被情绪推着走。'
      const descriptionCN = derivedContext.descriptionCN || '空气静下来，光线沿着墙面缓慢移动。'
      const descriptionEN = derivedContext.descriptionEN || 'The air has settled; light slides softly across the wall.'
      const surfaceActionCN = derivedContext.surfaceActionCN || '她保持着原本的坐姿，让意识追上情绪。'
      const surfaceActionEN = derivedContext.surfaceActionEN || 'She keeps the same posture, waiting for her mind to catch up.'
      const innerPositiveCN = derivedContext.innerPositiveCN || `她感到一丝${emotion.type}重新回到身体里。`
      const innerPositiveEN = derivedContext.innerPositiveEN || `A trace of ${emotion.type} returns to her body.`
      const innerNegativeCN = derivedContext.innerNegativeCN || `她仍能感觉到${emotion.type}在胸口打圈。`
      const innerNegativeEN = derivedContext.innerNegativeEN || `${emotion.type} still circles behind her ribs.`

      const toFirstPerson = (text?: string) => {
        if (!text) return ''
        return text.replace(/她/g, '我').replace(/他/g, '我')
      }

      const quoteForMonologue = normalizedEmotionQuote || limitText(emotion.trigger || emotion.type, 60)
      const addonText = toFirstPerson(isPositiveLike ? innerPositiveAddon : innerNegativeAddon) ||
        (isPositiveLike ? '我想把这份真实的温度牢牢记住。' : '我提醒自己保持锋利，不让警觉松动。')
      const nameIntro = protagonistName ? `我是${protagonistName}，` : ''
      const innerMonologue = `${nameIntro}我心里反复响着：“${quoteForMonologue}”。${addonText}`

      const surfaceVsInnerTemplate = isPositiveLike ? surfaceSummaryPositiveCN : surfaceSummaryNegativeCN
      const surfaceVsInner = toFirstPerson(surfaceVsInnerTemplate) ||
        (isPositiveLike
          ? '表面上我让自己显得从容，内心却被突如其来的温度慢慢松开。'
          : '表面上我能笑着应对，内心却把所有细节一一记账。')

      const consciousnessStream = buildConsciousnessStreamFromInputs(
        combinedInputs,
        derivedContext.streamFallback || []
      )

      const symbolismTemplate = isPositiveLike ? symbolismPositive : symbolismNegative
      const psychologicalSymbolism = toFirstPerson(symbolismTemplate) ||
        (isPositiveLike
          ? '周围的细节像小小的光点，让我相信温度还能留下。'
          : '阴影里潜伏着一只冷静的猫，我在暗处打量每一处虚伪。')

      const sceneDescription_CN = [
        `${fallbackLocation}，${descriptionCN}`,
        toFirstPerson(surfaceActionCN),
        toFirstPerson(isPositiveLike ? innerPositiveCN : innerNegativeCN),
        psychologicalSymbolism
      ]
        .filter(Boolean)
        .join('\n')

      const englishSurface = isPositiveLike
        ? `Outwardly I keep my movements measured so the moment stays gentle${protagonistName ? ` — this is ${protagonistName}` : ''}.`
        : `Outwardly I can still laugh, letting the scene look harmless${protagonistName ? ` — this is ${protagonistName}` : ''}.`
      const englishInner = isPositiveLike
        ? `Inside, the ${emotion.type} eases the knot I grip so tightly.`
        : `Inside, the ${emotion.type} sharpens like wire, auditing every motive.`
      const englishSymbolism = isPositiveLike
        ? 'Every small object glows like proof that warmth can survive my skepticism.'
        : 'The space morphs into a poised cat in shadow, claws ready to tear through pretense.'
      const sceneDescription_EN = [
        `${fallbackLocationEN || 'An interior'} under muted light.`,
        descriptionEN,
        englishSurface,
        englishInner,
        englishSymbolism
      ]
        .filter(Boolean)
        .join(' ')

      const consciousBehaviorText = extractBehaviorDescription()

      const fallbackSceneInfoForPrompt =
        baseSceneInfo || {
          location: derivedContext.locationCN,
          description: descriptionCN,
          objects: derivedContext.objects || [],
          clothing: derivedContext.clothing || clothingHint,
          peopleCount: baseScene?.peopleCount || 'alone',
          atmosphere: derivedContext.atmosphere || 'intimate interior'
        }

      const imagePrompt = createPsychodramaImagePrompt({
        emotionType: emotion.type,
        emotionIntensity: emotion.intensity,
        location: fallbackLocation,
        baseSceneInfo: fallbackSceneInfoForPrompt,
        symbolism: psychologicalSymbolism,
        surfaceVsInner,
        consciousnessStream,
        clothingHint,
        actionHint: derivedContext.actionHint,
        protagonistName,
        userProfile: userInfo
      })

      const fallbackNarrativePrimary = userPrimaryIsChinese ? sceneDescription_CN : sceneDescription_EN

      console.log('📝 [PSYCHODRAMA] 最终叙述（fallback）:', {
        innerMonologue,
        surfaceVsInner,
        consciousnessStream,
        psychologicalSymbolism,
        sceneDescriptionCN: sceneDescription_CN,
        sceneDescriptionEN: sceneDescription_EN,
        narrativeBlock: fallbackNarrativePrimary
      })

      const task = isPositiveLike
        ? derivedContext.taskPositive || '记录这份真实带来的安全感'
        : derivedContext.taskNegative || '辨认温度退去后仍在的疑虑'

      const psychologicalMechanism = isPositiveLike
        ? derivedContext.mechanismPositive || '用真实体验重建对世界的信任'
        : derivedContext.mechanismNegative || '用理性框住情绪，避免再次受伤'

      const subconsciousDesireText = toFirstPerson(isPositiveLike
        ? `保留这份${emotion.type}带来的证据`
        : `重新整理${emotion.type}背后的故事`)

      return {
        emotionalTrigger: emotion.trigger,
        emotionalIntensity: emotion.intensity,
        location: fallbackLocation,
        task,
        otherCharacters: baseScene?.otherCharacters || [],
        innerMonologue,
        surfaceVsInner,
        consciousnessStream,
        psychologicalSymbolism,
        innerConflict: surfaceVsInner,
        externalConflict: surfaceVsInner,
        conflictIntensity: emotion.intensity,
        subconsciousDesire: subconsciousDesireText,
        consciousBehavior: toFirstPerson(consciousBehaviorText),
        psychologicalMechanism,
        sceneDescription_CN,
        sceneDescription_EN,
        narrativeBlock: fallbackNarrativePrimary,
        imagePrompt
      }
    }

    console.warn('🧾 [PSYCHODRAMA] narrative 缺失，准备回退到 legacy 提示', {
      fallbackLocation,
      fallbackLocationEN,
      derivedContext,
      emotion,
      combinedInputs
    })

    try {
      return await this.generateSceneLegacy(
        emotion,
        initialPrompt,
        answers,
        questions,
        userInfo,
        userMetadata,
        previousMetaphors,
        baseScene
      )
    } catch (legacyError) {
      console.error('❌ [PSYCHODRAMA] legacy 提示也失败，使用模板 fallback:', legacyError)
      console.warn('🧾 [PSYCHODRAMA] fallback叙述详情:', {
        fallbackLocation,
        fallbackLocationEN,
        derivedContext,
        emotion,
        combinedInputs
      })
      return buildFallbackScene()
    }
  }

  private static async generateScene(
    emotion: { type: string, intensity: number, trigger: string, quote: string },
    initialPrompt: string,
    answers: string[],
    questions: string[],
    userInfo: any,
    userMetadata: any,
    previousMetaphors: string[] = [],
    baseScene?: any
  ): Promise<PsychodramaScene> {
    try {
      const scene = await this.buildPsychodramaScene(
        emotion,
        initialPrompt,
        answers,
        questions,
        userInfo,
        userMetadata,
        previousMetaphors,
        baseScene
      )
      if (Array.isArray(previousMetaphors)) {
        previousMetaphors.push(scene.imagePrompt)
      }
      return scene
    } catch (error) {
      console.error('❌ [PSYCHODRAMA] 新版心理剧生成失败，将回退到旧提示：', error)
      return await this.generateSceneLegacy(
        emotion,
        initialPrompt,
        answers,
        questions,
        userInfo,
        userMetadata,
        previousMetaphors,
        baseScene
      )
    }
  }

  private static async generateSceneLegacy(
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
2. 多人物互动：可以有多个角色，不是只有一个人
3. 丰富的动作描述：人物在做什么，如何做
4. 现象描述：描述行业现状、社会现象，不是硬编码情绪
5. 生动的内心独白：真实的情感表达，不是硬编码
6. 情绪层次变化：从表面到内心的对比，复杂情感
7. 视觉细节描写：环境、灯光、物品等具体描写
8. 场景完整性：包含环境、动作、内心、情绪、细节

**📖 优秀写作风格示例:**
"场景一：办公室，上午十点半。屏幕上是一堆KPI报表，Slack消息不断闪烁。她戴着耳机，假装在听会议，却在浏览Noema杂志的网页。黑底白字的文章标题在她眼前展开。每一行字都像是从信息噪声中撕开的裂缝，让空气突然变得安静。"

"场景二：会议室里弥漫着一种无奈的气氛。年轻女编辑轻轻抚摸着最新一期杂志的封面，纸张的质感和精美的印刷工艺无可挑剔，但她的眉头却紧锁着。对面的男主编将一份财务报表推到桌子中央，红色的亏损数字格外刺眼。旁边的市场编辑滑动着手机屏幕，展示着短视频平台的数据。三人的目光在精美的杂志和冰冷的数字之间徘徊，陷入了沉默。"

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
      if (allText.includes('工作') || allText.includes('项目') || allText.includes('同事') || allText.includes('老板') || 
          allText.includes('上班') || allText.includes('办公室') || allText.includes('公司') || 
          allText.includes('chatgpt') || allText.includes('ChatGPT') || allText.includes('chat')) {
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
    
    // 🔥 添加超时控制，避免超过 Vercel 函数执行时间限制（45秒，给 DeepSeek API 更多时间处理长 prompt）
    const controller = new AbortController()
    let timeoutId: NodeJS.Timeout | null = null
    
    try {
      timeoutId = setTimeout(() => {
        console.warn('⏱️ [PSYCHODRAMA] API调用超时（45秒），中止请求')
        controller.abort()
      }, 45000) // 45秒超时（心理剧 prompt 很长，需要更多时间）
      
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        signal: controller.signal, // 🔥 添加 signal
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: '你是一名心理剧场景设计师，只能输出 JSON，需基于真实情境强化主角内心冲突。'
            },
            {
              role: 'user',
              content: `
请输出 JSON：
{
  "innerMonologue": "80-120字中文，第一人称，引用用户原话的核心情绪",
  "surfaceVsInner": "50-70字中文，用"表面上…，内心却…"对比",
  "consciousnessStream": "50-70字中文，用"..."串联闪念",
  "psychologicalSymbolism": "40-60字中文，给出贴合情境的象征解释",
  "imagePrompt": "180-200字英文，结构化的心理剧视觉提示"
}

六条硬性原则：
1. 真实地点和人物不变，心理剧是在原场景基础上的情绪夸张。
2. 先判断冲突主体：若用户在批评他人→象征化他人；若情绪发生在自己→聚焦自我象征。
3. OTHERS 表现观点的"表层"，BACKGROUND 仅选 1 个核心意象呈现"本质"，避免堆砌。
4. 观点必须转化为纯视觉语言，例如"熟人经济"→"glowing network nodes"，"老钱但空洞"→"ornate bookshelf with hollow interior"，禁止复述原词。
5. 必须写明：DRAMATIC SPOTLIGHT on USER、USER strongly illuminated、OTHERS dimmer、strong light-shadow contrast、background darker。
6. imagePrompt 用 Medium Shot（头到腰），写出主角服装、姿态、手势、表情、光影、其他角色象征、背景象征、色调氛围，注明一种匹配情绪的艺术风格（Symbolic Expressionism / Surreal Minimalism / Cinematic Psychoscape / Conceptual Collage），结尾加 NOT realistic photography。

情绪：${emotion.type}（强度 ${emotion.intensity}/10） 触发：${emotion.trigger}
用户原话：${emotion.quote}
真实地点：${extractedLocation}
基础场景：${baseSceneInfo ? `location=${baseSceneInfo.location}, people=${baseSceneInfo.peopleCount}, objects=${(baseSceneInfo.objects || []).slice(0, 4).join('/') || 'none'}` : '无'}
用户全部输入：
${allInputs.map((input, i) => `输入${i + 1}: "${input}"`).join('\n')}
`
            }
          ],
          temperature: 0.65,
          max_tokens: 1200
        })
      })
      
      if (timeoutId) {
        clearTimeout(timeoutId) // 🔥 清除超时定时器
      }
      
      console.log('✅ [PSYCHODRAMA] API响应收到，状态:', response.status)
      console.log('⏱️ [PSYCHODRAMA] 响应时间:', new Date().toLocaleTimeString())
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('❌ [PSYCHODRAMA] API调用失败:', response.status, errorText)
        
        // 🔥 504 超时错误特殊处理
        if (response.status === 504) {
          console.warn('⏱️ [PSYCHODRAMA] Vercel 函数超时，使用 fallback 场景')
          throw new Error('TIMEOUT') // 使用特殊错误标识
        }
        
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
      
    } catch (error: any) {
      if (timeoutId) {
        clearTimeout(timeoutId) // 🔥 确保清除超时定时器
      }
      
      // 🔥 处理超时错误（AbortError 或 TIMEOUT）
      if (error.name === 'AbortError' || error.message === 'TIMEOUT' || error.message?.includes('504')) {
        console.warn('⏱️ [PSYCHODRAMA] API调用超时（45秒），使用fallback场景')
        console.error('❌ [PSYCHODRAMA] 超时原因:', error.message || 'AbortError')
      } else {
      console.error('❌ [PSYCHODRAMA] 场景生成失败:', error)
      }
      
      // 回退到旧版提示词逻辑，保证生成不中断
      console.warn('⚠️ [PSYCHODRAMA] 使用legacy心理剧生成逻辑')

      return await this.generateSceneLegacy(
        emotion,
        initialPrompt,
        answers,
        questions,
        userInfo,
        userMetadata,
        previousMetaphors,
        baseScene
      )
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
    let userInfo = await getUserInfo()
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
        let userInfo = await getUserInfo()
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
            innerMonologue: psychodramaScene.innerMonologue || psychodramaScene.innerConflict,
            surfaceVsInner: psychodramaScene.surfaceVsInner || psychodramaScene.externalConflict,
            consciousnessStream: psychodramaScene.consciousnessStream || psychodramaScene.psychologicalMechanism,
            psychologicalSymbolism: psychodramaScene.psychologicalSymbolism || psychodramaScene.subconsciousDesire,
            confidence: matchedScore.confidence
          }
          
          // 🔥 插入心理剧场景（确保在观点场景之后）
          newLogicalScenes.push(psychodramaSceneData)
          psychodramaScenesAdded++
          
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
      innerMonologue: psychodramaScene.innerMonologue || psychodramaScene.innerConflict,
      surfaceVsInner: psychodramaScene.surfaceVsInner || psychodramaScene.externalConflict,
      consciousnessStream: psychodramaScene.consciousnessStream || psychodramaScene.psychologicalMechanism, 
      psychologicalSymbolism: psychodramaScene.psychologicalSymbolism || psychodramaScene.subconsciousDesire,
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

