/**
 * 用户原始键入服务
 * 优先级1：用户真实键入 > 用户基本信息 > AI分析
 * 
 * 核心理念：用户说的话是最重要的，AI分析只是辅助
 */

import { getUserMetadata, updateUserMetadata } from './userDataApi'

export interface UserRawInput {
  timestamp: string
  question: string // AI的问题
  answer: string // 用户的回答
  // 不需要fullContext，让DeepSeek自己理解问答对
}

/**
 * 保存用户原始键入到Prisma
 * 直接保存问答对，让DeepSeek自己理解语境
 */
export async function saveUserRawInput(
  userAnswer: string,
  aiQuestion: string = ''
): Promise<void> {
  try {
    console.log('💬 [RAW-INPUT] 保存原始问答对...', { aiQuestion, userAnswer })
    
    // 获取现有的原始输入
    const metadata = await getUserMetadata()
    const existingInputs: UserRawInput[] = metadata.userRawInputs 
      ? JSON.parse(metadata.userRawInputs) 
      : []
    
    // 添加新输入（直接保存问答对）
    const newInput: UserRawInput = {
      timestamp: new Date().toISOString(),
      question: aiQuestion,
      answer: userAnswer
    }
    
    // 保留最近100条（避免数据过大）
    const updatedInputs = [newInput, ...existingInputs].slice(0, 100)
    
    // 提取关键短语（从用户回答中提取）
    const keyPhrases = extractMeaningfulPhrases(userAnswer)
    const existingPhrases: string[] = metadata.userMentionedKeywords 
      ? JSON.parse(metadata.userMentionedKeywords) 
      : []
    const updatedPhrases = [...new Set([...keyPhrases, ...existingPhrases])].slice(0, 200)
    
    // 保存到Prisma
    const saveResult = await updateUserMetadata({
      userRawInputs: JSON.stringify(updatedInputs),
      userMentionedKeywords: JSON.stringify(updatedPhrases)
    }, '保存用户原始键入')
    
    if (saveResult) {
      console.log('✅ [RAW-INPUT] 原始问答对已保存到Prisma')
      console.log('📊 [RAW-INPUT] 当前共有', updatedInputs.length, '条问答记录')
    } else {
      console.error('❌ [RAW-INPUT] 保存到Prisma失败')
    }
  } catch (error) {
    console.error('❌ [RAW-INPUT] 保存失败:', error)
  }
}

/**
 * 提取有意义的短语（从用户回答中提取）
 */
function extractMeaningfulPhrases(userAnswer: string): string[] {
  const phrases: string[] = []
  
  // 提取地点短语（具体地点）
  const locationPatterns = [
    /([^\s]{2,10})(咖啡厅|咖啡店|餐厅|饭店|书店|图书馆|健身房|公园|商场|写字楼|办公室)/g,
    /([^\s]{2,6})(路|街|巷|大道|广场)/g,
    /(上海|北京|深圳|广州|杭州|成都|武汉|南京|西安|苏州)([^\s]{0,10})/g
  ]
  
  locationPatterns.forEach(pattern => {
    const matches = userAnswer.match(pattern) || []
    phrases.push(...matches)
  })
  
  // 提取动作短语（正在做什么）
  const actionPatterns = [
    /(在|正在|刚刚|今天|经常|喜欢)([\u4e00-\u9fa5]{2,10})/g,
    /(工作|学习|创业|运动|阅读|旅行|写作|开会|讨论|设计|编程|思考)/g
  ]
  
  actionPatterns.forEach(pattern => {
    const matches = userAnswer.match(pattern) || []
    phrases.push(...matches)
  })
  
  // 提取情感/状态短语
  const emotionPatterns = [
    /(感到|觉得|很|非常|特别|超级)([\u4e00-\u9fa5]{2,6})/g,
    /(开心|高兴|快乐|累|疲惫|紧张|放松|兴奋|满足|失落)/g
  ]
  
  emotionPatterns.forEach(pattern => {
    const matches = userAnswer.match(pattern) || []
    phrases.push(...matches)
  })
  
  // 去重并过滤
  return [...new Set(phrases)]
    .filter(p => p.trim().length >= 3)
    .filter(p => p.trim().length <= 30)
}

/**
 * 获取用户原始键入（用于生成提示词）
 * 返回最近的输入，优先级最高
 */
export async function getUserRawInputs(limit: number = 50): Promise<UserRawInput[]> {
  try {
    const metadata = await getUserMetadata()
    const rawInputs: UserRawInput[] = metadata.userRawInputs 
      ? JSON.parse(metadata.userRawInputs) 
      : []
    
    return rawInputs.slice(0, limit)
  } catch (error) {
    console.error('❌ [RAW-INPUT] 获取用户原始键入失败:', error)
    return []
  }
}

/**
 * 获取用户提到的所有关键词
 */
export async function getUserKeywords(): Promise<string[]> {
  try {
    const metadata = await getUserMetadata()
    const keywords: string[] = metadata.userMentionedKeywords 
      ? JSON.parse(metadata.userMentionedKeywords) 
      : []
    
    return keywords
  } catch (error) {
    console.error('❌ [RAW-INPUT] 获取用户关键词失败:', error)
    return []
  }
}

/**
 * 生成基于用户键入的描述（优先级最高）
 * 直接给DeepSeek原始问答对，让它自己理解语境
 */
export async function generateUserInputBasedDescription(): Promise<string> {
  try {
    const rawInputs = await getUserRawInputs(30) // 最近30条
    const keyPhrases = await getUserKeywords()
    
    if (rawInputs.length === 0) {
      return ''
    }
    
    // 按时间倒序（最新的在前）
    const recentInputs = rawInputs.slice(0, 15)
    
    const description = `
🔥 用户真实对话记录（优先级最高，原始问答）：

最近对话（按时间倒序，DeepSeek请自行理解完整语境）：
${recentInputs.map((input, index) => {
  if (input.question && input.answer) {
    return `${index + 1}. Q: "${input.question}" | A: "${input.answer}"`
  } else {
    // 兼容旧数据格式
    return `${index + 1}. ${(input as any).fullContext || input.answer}`
  }
}).join('\n')}

用户提到的关键短语（提取自用户回答）：
${keyPhrases.slice(0, 40).join('、')}

**DeepSeek请注意**：
- 上面是用户的原始问答对，请理解完整语境
- 比如 Q:"你为什么选择咖啡厅？" A:"因为环境安静" → 理解为"用户选择咖啡厅是因为环境安静"
- 比如 Q:"你今天做了什么？" A:"在武康路工作" → 理解为"用户今天在武康路工作"
- 用户说什么就是什么，不要AI脑补或美化
`
    
    return description.trim()
  } catch (error) {
    console.error('❌ [RAW-INPUT] 生成用户键入描述失败:', error)
    return ''
  }
}

/**
 * 构建完整的用户描述（遵循优先级）
 * 优先级：用户键入 > 基本信息 > AI分析
 */
export async function buildPrioritizedUserDescription(
  userInfo: any,
  userMetadata: any
): Promise<string> {
  // 优先级1：用户键入（最重要）
  const rawInputDescription = await generateUserInputBasedDescription()
  
  // 优先级2：用户基本信息（用户填写的）
  const basicInfo = `
📋 用户基本信息（优先级2，用户填写）：
- 姓名：${userInfo.name}
- 性别：${userInfo.gender === 'female' ? '女性' : '男性'}
- 年龄：${userInfo.age}岁
- 地点：${userInfo.location}
- 性格自述：${userInfo.personality}
`
  
  // 优先级3：AI分析（辅助参考，最次要）
  const aiAnalysis = userMetadata.conversationInsights?.length > 0 || 
                    userMetadata.styleInsights?.length > 0 ? `
📊 AI辅助分析（优先级3，仅供参考）：
- 对话洞察：${userMetadata.conversationInsights?.slice(0, 3).join('、') || '无'}
- 风格洞察：${userMetadata.styleInsights?.slice(0, 3).join('、') || '无'}
` : ''
  
  return `${rawInputDescription}\n\n${basicInfo}${aiAnalysis ? '\n\n' + aiAnalysis : ''}`
}

