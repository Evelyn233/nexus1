// 用户信息存储服务
export interface UserInfo {
  name: string // 用户名字
  gender: 'male' | 'female' | ''
  birthDate: {
    year: string
    month: string
    day: string
    hour?: string // 时辰（用于八字分析）
  }
  height: string // cm
  weight: string // kg
  location: string // 所在地
  personality: string // 性格/人格描述
  hairLength?: string // 头发长度（仅女性）
  age?: number // 计算得出的年龄
}

// 用户元数据（通过LLM分析生成）
export interface UserMetadata {
  // 基础元数据（基于生日分析，不可变）
  zodiacSign: string // 星座（基于生日计算）
  chineseZodiac: string // 生肖（基于年份计算）
  baziAnalysis: string // 八字分析（基于生日）
  astrologicalProfile: string // 星盘分析（基于生日）
  ziweiAnalysis: string // 紫微命盘分析（基于生日）
  ziweiPersonality: string[] // 紫微命盘性格特征
  ziweiDestiny: string[] // 紫微命盘命运特征
  ziweiCareer: string[] // 紫微命盘事业特征
  ziweiRelationship: string[] // 紫微命盘感情特征
  
  // 深度八字分析
  baziDayMaster: string // 日主（如丁火、甲木等）
  baziPattern: string // 格局（如偏印格、正官格等）
  baziYinYang: string // 阴阳属性（如全阴八字、全阳八字等）
  baziSoulMission: string // 八字灵魂使命
  baziCoreTraits: string[] // 八字核心特质
  baziEnergyType: string // 八字能量类型
  baziLifePath: string // 八字人生路径
  
  // 核心性格特征（累积式存储）
  corePersonalityTraits: string[] // 核心性格特质（不断累积）
  communicationStyle: string[] // 沟通风格特征（累积）
  emotionalPattern: string[] // 情感模式特征（累积）
  decisionMakingStyle: string[] // 决策风格特征（累积）
  stressResponse: string[] // 压力反应特征（累积）
  
  // 命运和人生倾向（累积式存储）
  careerAptitude: string[] // 职业天赋倾向（累积）
  relationshipPattern: string[] // 感情关系模式（累积）
  lifePhilosophy: string[] // 人生哲学和价值观（累积）
  destinyCharacteristics: string[] // 命运特征（累积）
  
  // 人际关系特征（基于八字星盘分析的深度特征）
  interpersonalStrengths: string[] // 人际关系优势（如温暖细腻、智慧洞察、包容理解等）
  interpersonalChallenges: string[] // 人际关系挑战（如选择挑剔、情感敏感、内向倾向等）
  communicationTendencies: string[] // 沟通倾向（如深度交流、直觉表达、智慧引导等）
  socialEnergyPattern: string[] // 社交能量模式（如小圈子深度、智慧吸引、温暖关怀等）
  relationshipPreferences: string[] // 关系偏好（如深度友谊、智慧交流、艺术创作、精神共鸣等）
  interpersonalRole: string[] // 人际关系角色（如智慧顾问、温暖关怀者、深度倾听者等）
  
  // 爱好和兴趣特征（累积式存储）
  aestheticPreferences: string[] // 美学偏好（累积）
  lifestyleHobbies: string[] // 生活方式爱好（累积）
  socialPreferences: string[] // 社交偏好（累积）
  
  // 特点和优势（累积式存储）
  naturalStrengths: string[] // 天然优势（累积）
  personalChallenges: string[] // 个人挑战（累积）
  growthPotential: string[] // 成长潜力（累积）
  
  // 实用特征（累积式存储）
  luckyColors: string[] // 幸运色彩（累积）
  luckyNumbers: number[] // 幸运数字（累积）
  compatiblePersonalityTypes: string[] // 相配的性格类型（累积）
  fashionStyleTendencies: string[] // 时尚风格倾向（累积）
  
  // 对话历史分析（累积式存储）
  conversationInsights: string[] // 对话洞察（基于用户回答分析）
  activityPreferences: string[] // 活动偏好（基于用户回答分析）
  styleInsights: string[] // 风格洞察（基于用户回答分析）
  
  lastAnalyzed: string // 最后分析时间
  analysisHistory: string[] // 分析历史（记录每次分析的内容）
}

// 默认用户信息
const defaultUserInfo: UserInfo = {
  name: '',
  gender: '',
  birthDate: {
    year: '',
    month: '',
    day: '',
    hour: ''
  },
  height: '',
  weight: '',
  location: '',
  personality: '',
  hairLength: '',
  age: undefined
}

// 默认用户元数据
const defaultUserMetadata: UserMetadata = {
  // 基础元数据（基于生日分析，不可变）
  zodiacSign: '',
  chineseZodiac: '',
  baziAnalysis: '',
  astrologicalProfile: '',
  ziweiAnalysis: '',
  ziweiPersonality: [],
  ziweiDestiny: [],
  ziweiCareer: [],
  ziweiRelationship: [],
  
  // 深度八字分析
  baziDayMaster: '',
  baziPattern: '',
  baziYinYang: '',
  baziSoulMission: '',
  baziCoreTraits: [],
  baziEnergyType: '',
  baziLifePath: '',
  
  // 核心性格特征（累积式存储）
  corePersonalityTraits: [],
  communicationStyle: [],
  emotionalPattern: [],
  decisionMakingStyle: [],
  stressResponse: [],
  
  // 命运和人生倾向（累积式存储）
  careerAptitude: [],
  relationshipPattern: [],
  lifePhilosophy: [],
  destinyCharacteristics: [],
  
  // 人际关系特征（基于八字星盘分析的深度特征）
  interpersonalStrengths: [],
  interpersonalChallenges: [],
  communicationTendencies: [],
  socialEnergyPattern: [],
  relationshipPreferences: [],
  interpersonalRole: [],
  
  // 爱好和兴趣特征（累积式存储）
  aestheticPreferences: [],
  lifestyleHobbies: [],
  socialPreferences: [],
  
  // 特点和优势（累积式存储）
  naturalStrengths: [],
  personalChallenges: [],
  growthPotential: [],
  
  // 实用特征（累积式存储）
  luckyColors: [],
  luckyNumbers: [],
  compatiblePersonalityTypes: [],
  fashionStyleTendencies: [],
  
  // 对话历史分析（累积式存储）
  conversationInsights: [],
  activityPreferences: [],
  styleInsights: [],
  
  lastAnalyzed: '',
  analysisHistory: []
}

// 本地存储键名
const USER_INFO_KEY = 'magazine_user_info'
const USER_METADATA_KEY = 'magazine_user_metadata'
const CURRENT_USER_KEY = 'magazine_current_user'
const USER_LIST_KEY = 'magazine_user_list'
const USER_REPORT_KEY = 'magazine_user_report'

// 获取当前用户名字
export function getCurrentUserName(): string {
  if (typeof window === 'undefined') {
    return ''
  }
  
  try {
    return localStorage.getItem(CURRENT_USER_KEY) || ''
  } catch (error) {
    console.error('获取当前用户名字失败:', error)
    return ''
  }
}

// 设置当前用户名字
export function setCurrentUserName(name: string): void {
  if (typeof window === 'undefined') {
    return
  }
  
  try {
    localStorage.setItem(CURRENT_USER_KEY, name)
  } catch (error) {
    console.error('设置当前用户名字失败:', error)
  }
}

// 获取用户列表
export function getUserList(): string[] {
  if (typeof window === 'undefined') {
    return []
  }
  
  try {
    const stored = localStorage.getItem(USER_LIST_KEY)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('获取用户列表失败:', error)
  }
  
  return []
}

// 添加用户到列表
export function addUserToList(name: string): void {
  if (typeof window === 'undefined' || !name.trim()) {
    return
  }
  
  try {
    const userList = getUserList()
    if (!userList.includes(name)) {
      userList.push(name)
      localStorage.setItem(USER_LIST_KEY, JSON.stringify(userList))
    }
  } catch (error) {
    console.error('添加用户到列表失败:', error)
  }
}

// 从列表删除用户
export function removeUserFromList(name: string): void {
  if (typeof window === 'undefined') {
    return
  }
  
  try {
    const userList = getUserList()
    const filteredList = userList.filter(user => user !== name)
    localStorage.setItem(USER_LIST_KEY, JSON.stringify(filteredList))
    
    // 如果删除的是当前用户，清空当前用户
    if (getCurrentUserName() === name) {
      setCurrentUserName('')
    }
  } catch (error) {
    console.error('从列表删除用户失败:', error)
  }
}

// 用户简介报告接口
export interface UserReport {
  userName: string
  reportDate: string
  conversationSummary: string
  personalityInsights: string[]
  lifestylePatterns: string[]
  emotionalState: string
  growthAreas: string[]
  recommendations: string[]
  conversationCount: number
  totalConversationTime: string
  keyTopics: string[]
  moodTrends: string[]
}

// 生成用户简介报告
export async function generateUserReport(
  conversationHistory: string[], 
  userAnswers: string[], 
  originalPrompt: string
): Promise<UserReport> {
  const currentUserName = getCurrentUserName()
  const userInfo = getUserInfo()
  const userInfoDescription = getUserInfoDescription()
  
  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer sk-e3911ff08dae4f4fb59c7b521e2a5415'
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的用户行为分析专家，擅长分析用户的对话内容并生成深度的用户简介报告。你的任务是基于用户的对话历史和回答，生成一个全面的用户简介报告，帮助系统更好地了解用户。请用JSON格式返回。'
          },
          {
            role: 'user',
            content: `请基于以下信息生成用户简介报告：

用户基本信息：${userInfoDescription}

用户原始问题：${originalPrompt}
用户回答：${userAnswers.join(' | ')}
对话历史：${conversationHistory.join(' | ')}

请生成一个全面的用户简介报告，包括：

1. **对话总结**：简要总结这次对话的核心内容
2. **性格洞察**：基于对话内容分析用户的性格特点
3. **生活方式模式**：分析用户的生活习惯和偏好
4. **情感状态**：分析用户当前的情感状态
5. **成长领域**：识别用户可能需要关注的成长领域
6. **建议**：基于分析结果给出个性化建议
7. **关键话题**：提取对话中的关键话题
8. **情绪趋势**：分析用户的情绪变化趋势

请用JSON格式返回：
{
  "conversationSummary": "对话总结",
  "personalityInsights": ["性格洞察1", "性格洞察2"],
  "lifestylePatterns": ["生活方式1", "生活方式2"],
  "emotionalState": "情感状态描述",
  "growthAreas": ["成长领域1", "成长领域2"],
  "recommendations": ["建议1", "建议2"],
  "keyTopics": ["话题1", "话题2"],
  "moodTrends": ["情绪趋势1", "情绪趋势2"]
}`
          }
        ],
        max_tokens: 1000,
        temperature: 0.7
      })
    })

    if (response.ok) {
      const data = await response.json()
      if (data.choices && data.choices[0] && data.choices[0].message) {
        let content = data.choices[0].message.content.trim()
        
        // 清理markdown代码块标记
        if (content.includes('```json')) {
          content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        } else if (content.includes('```')) {
          content = content.replace(/```\s*/g, '').trim()
        }
        
        try {
          const parsed = JSON.parse(content)
          
          const report: UserReport = {
            userName: currentUserName,
            reportDate: new Date().toISOString(),
            conversationSummary: parsed.conversationSummary || '',
            personalityInsights: parsed.personalityInsights || [],
            lifestylePatterns: parsed.lifestylePatterns || [],
            emotionalState: parsed.emotionalState || '',
            growthAreas: parsed.growthAreas || [],
            recommendations: parsed.recommendations || [],
            conversationCount: getConversationCount() + 1,
            totalConversationTime: calculateTotalConversationTime(),
            keyTopics: parsed.keyTopics || [],
            moodTrends: parsed.moodTrends || []
          }
          
          // 保存报告
          saveUserReport(report)
          
          console.log('✅ [USER-REPORT] 用户简介报告生成成功:', report)
          return report
        } catch (parseError) {
          console.error('❌ [USER-REPORT] 报告JSON解析失败:', parseError)
          console.error('❌ [USER-REPORT] 原始内容:', content)
        }
      }
    }
  } catch (error) {
    console.error('💥 [USER-REPORT] 生成用户简介报告失败:', error)
  }
  
  // 返回默认报告
  return {
    userName: currentUserName,
    reportDate: new Date().toISOString(),
    conversationSummary: '对话内容分析中...',
    personalityInsights: [],
    lifestylePatterns: [],
    emotionalState: '分析中...',
    growthAreas: [],
    recommendations: [],
    conversationCount: getConversationCount() + 1,
    totalConversationTime: '0分钟',
    keyTopics: [],
    moodTrends: []
  }
}

// 保存用户报告
export function saveUserReport(report: UserReport): void {
  if (typeof window === 'undefined') {
    return
  }
  
  try {
    const currentUserName = getCurrentUserName()
    if (!currentUserName) {
      console.error('没有设置当前用户名字')
      return
    }
    
    const reportKey = `${USER_REPORT_KEY}_${currentUserName}`
    const existingReports = getUserReports()
    
    // 添加新报告到历史记录
    existingReports.push(report)
    
    // 只保留最近10个报告
    if (existingReports.length > 10) {
      existingReports.splice(0, existingReports.length - 10)
    }
    
    localStorage.setItem(reportKey, JSON.stringify(existingReports))
    console.log('✅ [USER-REPORT] 用户报告已保存')
  } catch (error) {
    console.error('保存用户报告失败:', error)
  }
}

// 获取用户报告历史
export function getUserReports(): UserReport[] {
  if (typeof window === 'undefined') {
    return []
  }
  
  try {
    const currentUserName = getCurrentUserName()
    if (!currentUserName) {
      return []
    }
    
    const reportKey = `${USER_REPORT_KEY}_${currentUserName}`
    const stored = localStorage.getItem(reportKey)
    if (stored) {
      return JSON.parse(stored)
    }
  } catch (error) {
    console.error('获取用户报告失败:', error)
  }
  
  return []
}

// 获取最新用户报告
export function getLatestUserReport(): UserReport | null {
  const reports = getUserReports()
  return reports.length > 0 ? reports[reports.length - 1] : null
}

// 获取对话次数
function getConversationCount(): number {
  const reports = getUserReports()
  return reports.length
}

// 计算总对话时间
function calculateTotalConversationTime(): string {
  const reports = getUserReports()
  const totalMinutes = reports.length * 5 // 假设每次对话平均5分钟
  return `${totalMinutes}分钟`
}

// 获取用户信息（支持多用户）
export function getUserInfo(): UserInfo {
  if (typeof window === 'undefined') {
    return defaultUserInfo
  }
  
  try {
    const currentUserName = getCurrentUserName()
    if (!currentUserName) {
      return defaultUserInfo
    }
    
    const userKey = `${USER_INFO_KEY}_${currentUserName}`
    const stored = localStorage.getItem(userKey)
    if (stored) {
      const parsed = JSON.parse(stored)
      // 计算年龄
      if (parsed.birthDate.year && parsed.birthDate.month && parsed.birthDate.day) {
        parsed.age = calculateAge(parsed.birthDate)
      }
      return parsed
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
  }
  
  return defaultUserInfo
}

// 保存用户信息（支持多用户）
export function saveUserInfo(userInfo: UserInfo): void {
  if (typeof window === 'undefined') {
    return
  }
  
  try {
    const currentUserName = getCurrentUserName()
    if (!currentUserName) {
      console.error('没有设置当前用户名字')
      return
    }
    
    // 计算年龄
    if (userInfo.birthDate.year && userInfo.birthDate.month && userInfo.birthDate.day) {
      userInfo.age = calculateAge(userInfo.birthDate)
    }
    
    const userKey = `${USER_INFO_KEY}_${currentUserName}`
    localStorage.setItem(userKey, JSON.stringify(userInfo))
    
    // 确保用户名字在列表中
    addUserToList(currentUserName)
    
    console.log('✅ 用户信息已保存:', userInfo)
  } catch (error) {
    console.error('保存用户信息失败:', error)
  }
}

// 清除用户信息（支持多用户）
export function clearUserInfo(): void {
  if (typeof window === 'undefined') {
    return
  }
  
  try {
    const currentUserName = getCurrentUserName()
    if (currentUserName) {
      const userKey = `${USER_INFO_KEY}_${currentUserName}`
      localStorage.removeItem(userKey)
      
      // 同时清除元数据
      const metadataKey = `${USER_METADATA_KEY}_${currentUserName}`
      localStorage.removeItem(metadataKey)
      
      console.log('✅ 用户信息已清除:', currentUserName)
    }
  } catch (error) {
    console.error('清除用户信息失败:', error)
  }
}

// 计算年龄
function calculateAge(birthDate: { year: string; month: string; day: string }): number {
  const year = parseInt(birthDate.year)
  const month = parseInt(birthDate.month) - 1 // JavaScript月份从0开始
  const day = parseInt(birthDate.day)
  
  const birth = new Date(year, month, day)
  const today = new Date()
  
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  
  return age
}

// 获取星座
function getZodiacSign(month: string, day: string): string {
  const monthNum = parseInt(month)
  const dayNum = parseInt(day)
  
  if ((monthNum === 3 && dayNum >= 21) || (monthNum === 4 && dayNum <= 19)) return '白羊座'
  if ((monthNum === 4 && dayNum >= 20) || (monthNum === 5 && dayNum <= 20)) return '金牛座'
  if ((monthNum === 5 && dayNum >= 21) || (monthNum === 6 && dayNum <= 21)) return '双子座'
  if ((monthNum === 6 && dayNum >= 22) || (monthNum === 7 && dayNum <= 22)) return '巨蟹座'
  if ((monthNum === 7 && dayNum >= 23) || (monthNum === 8 && dayNum <= 22)) return '狮子座'
  if ((monthNum === 8 && dayNum >= 23) || (monthNum === 9 && dayNum <= 22)) return '处女座'
  if ((monthNum === 9 && dayNum >= 23) || (monthNum === 10 && dayNum <= 23)) return '天秤座'
  if ((monthNum === 10 && dayNum >= 24) || (monthNum === 11 && dayNum <= 22)) return '天蝎座'
  if ((monthNum === 11 && dayNum >= 23) || (monthNum === 12 && dayNum <= 21)) return '射手座'
  if ((monthNum === 12 && dayNum >= 22) || (monthNum === 1 && dayNum <= 19)) return '摩羯座'
  if ((monthNum === 1 && dayNum >= 20) || (monthNum === 2 && dayNum <= 18)) return '水瓶座'
  if ((monthNum === 2 && dayNum >= 19) || (monthNum === 3 && dayNum <= 20)) return '双鱼座'
  
  return '未知'
}

// 获取生肖
function getChineseZodiac(year: string): string {
  const yearNum = parseInt(year)
  const zodiacs = ['猴', '鸡', '狗', '猪', '鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊']
  return zodiacs[yearNum % 12]
}

// 获取用户信息描述文本（用于LLM）
export function getUserInfoDescription(): string {
  const userInfo = getUserInfo()
  const metadata = getUserMetadata()
  
  if (!userInfo.gender && !userInfo.height && !userInfo.weight && !userInfo.age && !userInfo.location && !userInfo.personality) {
    return ''
  }
  
  // 计算正确的星座和生肖
  const zodiacSign = getZodiacSign(userInfo.birthDate.month, userInfo.birthDate.day)
  const chineseZodiac = getChineseZodiac(userInfo.birthDate.year)
  
  // 优先显示元数据分析结果
  let description = ''
  
  if (metadata && Array.isArray(metadata.corePersonalityTraits) && metadata.corePersonalityTraits.length > 0) {
    description += `用户完整档案（基于深度分析的性格特征）：`
    description += `\n- 星座：${zodiacSign}（根据生日${userInfo.birthDate.month}月${userInfo.birthDate.day}日计算）`
    description += `\n- 生肖：${chineseZodiac}（根据年份${userInfo.birthDate.year}年计算）`
    
    if (metadata.corePersonalityTraits.length > 0) {
      description += `\n- 核心性格特质：${metadata.corePersonalityTraits.join('、')}`
    }
    
    if (Array.isArray(metadata.communicationStyle) && metadata.communicationStyle.length > 0) {
      description += `\n- 沟通风格特征：${metadata.communicationStyle.join('、')}`
    }
    
    if (Array.isArray(metadata.emotionalPattern) && metadata.emotionalPattern.length > 0) {
      description += `\n- 情感模式特征：${metadata.emotionalPattern.join('、')}`
    }
    
    if (Array.isArray(metadata.decisionMakingStyle) && metadata.decisionMakingStyle.length > 0) {
      description += `\n- 决策风格特征：${metadata.decisionMakingStyle.join('、')}`
    }
    
    if (Array.isArray(metadata.careerAptitude) && metadata.careerAptitude.length > 0) {
      description += `\n- 职业天赋倾向：${metadata.careerAptitude.join('、')}`
    }
    
    if (Array.isArray(metadata.relationshipPattern) && metadata.relationshipPattern.length > 0) {
      description += `\n- 感情关系模式：${metadata.relationshipPattern.join('、')}`
    }
    
    if (Array.isArray(metadata.lifePhilosophy) && metadata.lifePhilosophy.length > 0) {
      description += `\n- 人生哲学：${metadata.lifePhilosophy.join('、')}`
    }
    
    if (Array.isArray(metadata.destinyCharacteristics) && metadata.destinyCharacteristics.length > 0) {
      description += `\n- 命运特征：${metadata.destinyCharacteristics.join('、')}`
    }
    
    // 显示人际关系特征
    if (Array.isArray(metadata.interpersonalStrengths) && metadata.interpersonalStrengths.length > 0) {
      description += `\n- 人际关系优势：${metadata.interpersonalStrengths.join('、')}`
    }
    
    if (Array.isArray(metadata.interpersonalChallenges) && metadata.interpersonalChallenges.length > 0) {
      description += `\n- 人际关系挑战：${metadata.interpersonalChallenges.join('、')}`
    }
    
    if (Array.isArray(metadata.communicationTendencies) && metadata.communicationTendencies.length > 0) {
      description += `\n- 沟通倾向：${metadata.communicationTendencies.join('、')}`
    }
    
    if (Array.isArray(metadata.socialEnergyPattern) && metadata.socialEnergyPattern.length > 0) {
      description += `\n- 社交能量模式：${metadata.socialEnergyPattern.join('、')}`
    }
    
    if (Array.isArray(metadata.relationshipPreferences) && metadata.relationshipPreferences.length > 0) {
      description += `\n- 关系偏好：${metadata.relationshipPreferences.join('、')}`
    }
    
    if (Array.isArray(metadata.interpersonalRole) && metadata.interpersonalRole.length > 0) {
      description += `\n- 人际关系角色：${metadata.interpersonalRole.join('、')}`
    }
    
    if (Array.isArray(metadata.aestheticPreferences) && metadata.aestheticPreferences.length > 0) {
      description += `\n- 美学偏好：${metadata.aestheticPreferences.join('、')}`
    }
    
    if (Array.isArray(metadata.lifestyleHobbies) && metadata.lifestyleHobbies.length > 0) {
      description += `\n- 生活方式爱好：${metadata.lifestyleHobbies.join('、')}`
    }
    
    if (Array.isArray(metadata.naturalStrengths) && metadata.naturalStrengths.length > 0) {
      description += `\n- 天然优势：${metadata.naturalStrengths.join('、')}`
    }
    
    if (metadata.personalChallenges.length > 0) {
      description += `\n- 个人挑战：${metadata.personalChallenges.join('、')}`
    }
    
    if (Array.isArray(metadata.fashionStyleTendencies) && metadata.fashionStyleTendencies.length > 0) {
      description += `\n- 时尚风格倾向：${metadata.fashionStyleTendencies.join('、')}`
    }
    
    if (Array.isArray(metadata.luckyColors) && metadata.luckyColors.length > 0) {
      description += `\n- 幸运色彩：${metadata.luckyColors.join('、')}`
    }
    
    // 显示星盘深度分析
    if (metadata.astrologicalProfile && metadata.astrologicalProfile !== '待深度分析') {
      description += `\n- 星盘深度分析：${metadata.astrologicalProfile}`
    }
    
    // 显示紫微命盘分析
    if (metadata.ziweiAnalysis && metadata.ziweiAnalysis !== '待深度分析') {
      description += `\n- 紫微命盘分析：${metadata.ziweiAnalysis}`
    }
    
    if (Array.isArray(metadata.ziweiPersonality) && metadata.ziweiPersonality.length > 0) {
      description += `\n- 紫微性格特质：${metadata.ziweiPersonality.join('、')}`
    }
    
    if (Array.isArray(metadata.ziweiDestiny) && metadata.ziweiDestiny.length > 0) {
      description += `\n- 紫微命运特征：${metadata.ziweiDestiny.join('、')}`
    }
    
    if (Array.isArray(metadata.ziweiCareer) && metadata.ziweiCareer.length > 0) {
      description += `\n- 紫微事业倾向：${metadata.ziweiCareer.join('、')}`
    }
    
    if (Array.isArray(metadata.ziweiRelationship) && metadata.ziweiRelationship.length > 0) {
      description += `\n- 紫微感情模式：${metadata.ziweiRelationship.join('、')}`
    }
    
    // 显示深度八字分析
    if (metadata.baziDayMaster) {
      description += `\n- 八字日主：${metadata.baziDayMaster}`
    }
    
    if (metadata.baziPattern) {
      description += `\n- 八字格局：${metadata.baziPattern}`
    }
    
    if (metadata.baziYinYang) {
      description += `\n- 八字阴阳：${metadata.baziYinYang}`
    }
    
    if (metadata.baziSoulMission) {
      description += `\n- 八字灵魂使命：${metadata.baziSoulMission}`
    }
    
    if (Array.isArray(metadata.baziCoreTraits) && metadata.baziCoreTraits.length > 0) {
      description += `\n- 八字核心特质：${metadata.baziCoreTraits.join('、')}`
    }
    
    if (metadata.baziEnergyType) {
      description += `\n- 八字能量类型：${metadata.baziEnergyType}`
    }
    
    if (metadata.baziLifePath) {
      description += `\n- 八字人生路径：${metadata.baziLifePath}`
    }
    
    // 显示累积的对话洞察
    if (Array.isArray(metadata.conversationInsights) && metadata.conversationInsights.length > 0) {
      description += `\n- 对话洞察：${metadata.conversationInsights.join('、')}`
    }
    
    if (Array.isArray(metadata.activityPreferences) && metadata.activityPreferences.length > 0) {
      description += `\n- 活动偏好：${metadata.activityPreferences.join('、')}`
    }
    
    if (Array.isArray(metadata.styleInsights) && metadata.styleInsights.length > 0) {
      description += `\n- 风格洞察：${metadata.styleInsights.join('、')}`
    }
    
    // 将用户性格描述融入到元数据中，作为自我认知的体现
    if (userInfo.personality) {
      description += `\n- 自我性格认知：${userInfo.personality}`
    }
    
    description += `\n\n用户基本信息（参考）：`
  } else {
    description += `用户基本信息：`
  }
  
  if (userInfo.gender) {
    description += `\n- 性别：${userInfo.gender === 'male' ? '男性' : '女性'}`
  }
  
  if (userInfo.age) {
    description += `\n- 年龄：${userInfo.age}岁`
  }
  
  if (userInfo.height) {
    description += `\n- 身高：${userInfo.height}cm`
  }
  
  if (userInfo.weight) {
    description += `\n- 体重：${userInfo.weight}kg`
  }
  
  if (userInfo.location) {
    description += `\n- 所在地：${userInfo.location}`
  }
  
  if (userInfo.gender === 'female' && userInfo.hairLength) {
    description += `\n- 头发长度：${userInfo.hairLength}`
  }
  
  return description
}

// 检查用户信息是否完整
export function isUserInfoComplete(): boolean {
  const userInfo = getUserInfo()
  const baseComplete = !!(
    userInfo.name &&  // 姓名必填
    userInfo.gender &&
    userInfo.birthDate.year &&
    userInfo.birthDate.month &&
    userInfo.birthDate.day &&
    userInfo.height &&
    userInfo.weight &&
    userInfo.location &&
    userInfo.personality
  )
  
  // 如果是女性，还需要头发长度信息
  if (userInfo.gender === 'female') {
    return baseComplete && !!userInfo.hairLength
  }
  
  return baseComplete
}

// 重置用户信息（用于重新填写）
export function resetUserInfo(): void {
  clearUserInfo()
  clearUserMetadata()
  if (typeof window !== 'undefined') {
    // 重定向到用户信息收集页面
    window.location.href = '/user-info'
  }
}

// 获取用户元数据
// ⚠️ 注意：这个函数现在优先从Prisma获取，localStorage作为fallback
export function getUserMetadata(): UserMetadata {
  if (typeof window === 'undefined') {
    return defaultUserMetadata
  }
  
  try {
    const currentUserName = getCurrentUserName()
    if (!currentUserName) {
      console.warn('⚠️ 没有设置当前用户名字，返回默认元数据')
      return defaultUserMetadata
    }
    
    const metadataKey = `${USER_METADATA_KEY}_${currentUserName}`
    const stored = localStorage.getItem(metadataKey)
    if (stored) {
      const metadata = JSON.parse(stored)
      // ⚠️ 此函数已弃用，请使用 getUserMetadata from '@/lib/userDataApi'
      return metadata
    }
  } catch (error) {
    console.error('获取用户元数据失败:', error)
  }
  
  return defaultUserMetadata
}

// 保存用户元数据
export function saveUserMetadata(metadata: UserMetadata): void {
  if (typeof window === 'undefined') {
    return
  }
  
  try {
    const currentUserName = getCurrentUserName()
    if (!currentUserName) {
      console.error('没有设置当前用户名字，无法保存元数据')
      return
    }
    
    metadata.lastAnalyzed = new Date().toISOString()
    
    // 1. 保存到localStorage
    const metadataKey = `${USER_METADATA_KEY}_${currentUserName}`
    localStorage.setItem(metadataKey, JSON.stringify(metadata))
    console.log('✅ [USER-META] 用户元数据已保存到localStorage')
    
    // 2. 同步到Prisma（异步）
    syncMetadataToPrisma(metadata).catch(error => {
      console.error('⚠️ [USER-META] 同步到Prisma失败（不影响localStorage）:', error)
    })
  } catch (error) {
    console.error('❌ [USER-META] 保存用户元数据失败:', error)
  }
}

/**
 * 同步完整元数据到Prisma（异步）
 */
async function syncMetadataToPrisma(metadata: UserMetadata): Promise<void> {
  try {
    console.log('🔄 [USER-META] 开始同步完整元数据到Prisma...')
    
    const response = await fetch('/api/user/metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        updates: metadata,
        source: 'save_user_metadata',
        reasoning: '保存完整用户元数据'
      })
    })
    
    if (!response.ok) {
      throw new Error(`API请求失败: ${response.status}`)
    }
    
    const data = await response.json()
    console.log('✅ [USER-META] 完整元数据已同步到Prisma')
  } catch (error) {
    console.error('❌ [USER-META] 同步到Prisma失败:', error)
    throw error
  }
}

// ❌ 已删除重复的 updateUserMetadata 函数
// 请从 '@/lib/userDataApi' 导入 updateUserMetadata

// 清除用户元数据
export function clearUserMetadata(): void {
  if (typeof window === 'undefined') {
    return
  }
  
  try {
    const currentUserName = getCurrentUserName()
    if (currentUserName) {
      const metadataKey = `${USER_METADATA_KEY}_${currentUserName}`
      localStorage.removeItem(metadataKey)
      console.log('✅ 用户元数据已清除:', currentUserName)
    }
  } catch (error) {
    console.error('清除用户元数据失败:', error)
  }
}

// 检查用户元数据是否完整
export function isUserMetadataComplete(): boolean {
  const metadata = getUserMetadata()
  return !!(
    metadata &&
    Array.isArray(metadata.corePersonalityTraits) &&
    metadata.corePersonalityTraits.length > 0 &&
    metadata.communicationStyle &&
    metadata.careerAptitude &&
    Array.isArray(metadata.aestheticPreferences) &&
    metadata.aestheticPreferences.length > 0
  )
}

// Memobase集成 - 增强用户记忆功能
export async function saveUserInfoWithMemobase(userInfo: UserInfo): Promise<void> {
  try {
    // 保存到本地存储
    saveUserInfo(userInfo)
    
    // 获取当前用户ID
    const currentUserName = getCurrentUserName()
    if (!currentUserName) {
      console.warn('没有设置当前用户名字，跳过Memobase保存')
      return
    }
    
    // 动态导入Memobase服务以避免SSR问题
    const { memobaseService } = await import('./memobaseService')
    
    // 检查Memobase连接
    const isConnected = await memobaseService.checkConnection()
    if (!isConnected) {
      console.warn('Memobase连接失败，使用本地存储')
      return
    }
    
    // 初始化Memobase用户
    await memobaseService.initUser(currentUserName, userInfo)
    console.log('✅ 用户信息已同步到Memobase')
    
  } catch (error) {
    console.error('保存用户信息到Memobase失败:', error)
    // 即使Memobase失败，本地存储仍然可用
  }
}

// 保存用户元数据到Memobase
export async function saveUserMetadataWithMemobase(metadata: UserMetadata): Promise<void> {
  try {
    // 保存到本地存储
    saveUserMetadata(metadata)
    
    // 获取当前用户ID
    const currentUserName = getCurrentUserName()
    if (!currentUserName) {
      console.warn('没有设置当前用户名字，跳过Memobase保存')
      return
    }
    
    // 动态导入Memobase服务
    const { memobaseService } = await import('./memobaseService')
    
    // 检查连接
    const isConnected = await memobaseService.checkConnection()
    if (!isConnected) {
      console.warn('Memobase连接失败，使用本地存储')
      return
    }
    
    // 保存到Memobase
    await memobaseService.saveMetadata(currentUserName, metadata)
    console.log('✅ 用户元数据已同步到Memobase')
    
  } catch (error) {
    console.error('保存用户元数据到Memobase失败:', error)
  }
}

// 获取增强的用户上下文（包含Memobase数据）
export async function getEnhancedUserContext(): Promise<string> {
  try {
    const currentUserName = getCurrentUserName()
    if (!currentUserName) {
      return getUserInfoDescription()
    }
    
    // 动态导入Memobase服务
    const { memobaseService } = await import('./memobaseService')
    
    // 检查连接
    const isConnected = await memobaseService.checkConnection()
    if (!isConnected) {
      console.warn('Memobase连接失败，使用本地用户信息')
      return getUserInfoDescription()
    }
    
    // 获取Memobase上下文
    const memobaseContext = await memobaseService.getUserContext(currentUserName, 1000)
    if (memobaseContext) {
      console.log('✅ 获取到Memobase增强上下文')
      return memobaseContext
    }
    
    // 回退到本地用户信息
    return getUserInfoDescription()
    
  } catch (error) {
    console.error('获取增强用户上下文失败:', error)
    return getUserInfoDescription()
  }
}

// 保存聊天记录到Memobase
export async function saveChatToMemobase(messages: Array<{role: 'user' | 'assistant' | 'system', content: string}>): Promise<void> {
  try {
    const currentUserName = getCurrentUserName()
    if (!currentUserName) {
      return
    }
    
    // 动态导入Memobase服务
    const { memobaseService } = await import('./memobaseService')
    
    // 检查连接
    const isConnected = await memobaseService.checkConnection()
    if (!isConnected) {
      console.warn('Memobase连接失败，跳过聊天记录保存')
      return
    }
    
    // 保存聊天记录
    await memobaseService.saveChat(currentUserName, messages)
    console.log('✅ 聊天记录已保存到Memobase')
    
  } catch (error) {
    console.error('保存聊天记录到Memobase失败:', error)
  }
}
