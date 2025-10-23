/**
 * 两层数据架构服务
 * 
 * 第一层：原始数据（用户真实说的/做的）
 * 第二层：分析层（基于第一层分析，也要存储）
 */

// ============================================
// 第一层：存储原始数据
// ============================================

/**
 * 存储用户对话到第一层
 */
export async function storeUserConversation(
  userId: string,
  initialPrompt: string,
  answers: string[],
  questions: string[]
) {
  console.log('📝 [LAYER-1] 存储原始对话数据')
  
  // 1.1 存储完整对话
  const chatSession = await prisma.chatSession.create({
    data: {
      userId,
      initialPrompt,
      answers: JSON.stringify(answers),
      questions: JSON.stringify(questions),
      extractedFacts: JSON.stringify(extractFactsFromConversation(initialPrompt, answers))
    }
  })
  
  // 1.2 提取并存储日常活动
  const activities = extractActivitiesFromConversation(initialPrompt, answers)
  for (const activity of activities) {
    await prisma.dailyActivity.create({
      data: {
        userId,
        activity: activity.description,
        time: activity.time,
        location: activity.location,
        people: (activity as any).people ? JSON.stringify((activity as any).people) : null,
        userState: activity.state,
        sourceType: 'chat_session',
        sourceId: chatSession.id,
        userQuote: activity.originalQuote
      }
    })
  }
  
  // 1.3 提取并存储用户陈述
  const statements = extractStatementsFromConversation(initialPrompt, answers)
  for (const stmt of statements) {
    await prisma.userStatement.create({
      data: {
        userId,
        statement: stmt.content,
        statementType: stmt.type, // "preference", "fact", "feeling"
        context: stmt.context,
        sourceType: 'chat_session',
        sourceId: chatSession.id
      }
    })
  }
  
  console.log('✅ [LAYER-1] 原始数据存储完成')
  
  // 触发第二层分析（异步）
  await analyzeAndUpdateLayer2(userId)
  
  return chatSession.id
}

/**
 * 从对话中提取事实
 */
function extractFactsFromConversation(prompt: string, answers: string[]) {
  const fullText = `${prompt} ${answers.join(' ')}`
  
  return {
    foods: extractFoods(fullText),           // 提取食物："炒牛肉"、"土豆焖饭"
    places: extractPlaces(fullText),         // 提取地点："云海肴"、"在家"
    activities: extractActivities(fullText), // 提取活动："线上开会"、"做AI项目"
    states: extractStates(fullText),         // 提取状态："累了"、"开心"
    times: extractTimes(fullText),           // 提取时间："中午"、"晚上"
    people: extractPeople(fullText)          // 提取人物："和妈妈"、"团队"
  }
}

/**
 * 从对话中提取日常活动
 */
function extractActivitiesFromConversation(prompt: string, answers: string[]) {
  // 示例实现
  const fullText = `${prompt} ${answers.join(' ')}`
  const activities = []
  
  // 提取吃饭活动
  if (fullText.includes('吃了')) {
    const foodMatch = fullText.match(/吃了(.+?)(?:[，。！]|$)/)
    if (foodMatch) {
      activities.push({
        description: `吃了${foodMatch[1].trim()}`,
        time: extractTimeFromContext(fullText),
        location: extractLocationFromContext(fullText),
        state: extractStateFromContext(fullText),
        originalQuote: foodMatch[0]
      })
    }
  }
  
  // 提取工作活动
  if (fullText.includes('开会') || fullText.includes('项目')) {
    const workMatch = fullText.match(/(线上|线下)?开会(.+?)(?:[，。！]|$)/)
    if (workMatch) {
      activities.push({
        description: `${workMatch[1] || ''}开会${workMatch[2].trim()}`,
        time: extractTimeFromContext(fullText),
        location: workMatch[1] === '线上' ? '线上' : extractLocationFromContext(fullText),
        state: extractStateFromContext(fullText),
        originalQuote: workMatch[0]
      })
    }
  }
  
  return activities
}

/**
 * 从对话中提取用户陈述
 */
function extractStatementsFromConversation(prompt: string, answers: string[]) {
  const fullText = `${prompt} ${answers.join(' ')}`
  const statements = []
  
  // 提取偏好陈述："我喜欢/不喜欢..."
  const preferencePatterns = [
    /我(不)?喜欢(.+?)(?:[，。！]|$)/g,
    /我(很|特别|非常)(.+?)(?:[，。！]|$)/g
  ]
  
  for (const pattern of preferencePatterns) {
    let match
    while ((match = pattern.exec(fullText)) !== null) {
      statements.push({
        content: match[0],
        type: 'preference',
        context: '对话中提到'
      })
    }
  }
  
  // 提取状态陈述："我累了"、"我开心"
  const statePatterns = [
    /我(有点|很|非常)?(累|开心|难过|兴奋|压力大)了?/g
  ]
  
  for (const pattern of statePatterns) {
    let match
    while ((match = pattern.exec(fullText)) !== null) {
      statements.push({
        content: match[0],
        type: 'feeling',
        context: '对话中提到'
      })
    }
  }
  
  return statements
}

// 辅助函数
function extractFoods(text: string): string[] {
  const foods = []
  const foodPatterns = [
    /吃了?(.+?)(外卖|菜)/g,
    /(炒|煮|蒸|焖)(.+?)(?:[，。！]|$)/g
  ]
  
  for (const pattern of foodPatterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      foods.push(match[0])
    }
  }
  
  return Array.from(new Set(foods))
}

function extractPlaces(text: string): string[] {
  const places = []
  const placePatterns = [
    /在(.+?)(?:吃|做|工作)/g,
    /(云海肴|星巴克|麦当劳)/g
  ]
  
  for (const pattern of placePatterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      places.push(match[1] || match[0])
    }
  }
  
  return Array.from(new Set(places))
}

function extractActivities(text: string): string[] {
  // 简化实现，实际应该更复杂
  const activities = []
  if (text.includes('开会')) activities.push('开会')
  if (text.includes('做项目')) activities.push('做项目')
  if (text.includes('工作')) activities.push('工作')
  return activities
}

function extractStates(text: string): string[] {
  const states = []
  if (text.includes('累') || text.includes('疲惫')) states.push('累了')
  if (text.includes('开心') || text.includes('高兴')) states.push('开心')
  if (text.includes('压力')) states.push('压力大')
  return states
}

function extractTimes(text: string): string[] {
  const times = []
  const timePatterns = ['中午', '早上', '下午', '晚上', '深夜']
  for (const time of timePatterns) {
    if (text.includes(time)) times.push(time)
  }
  return times
}

function extractPeople(text: string): string[] {
  const people = []
  if (text.includes('和') || text.includes('跟')) {
    const peopleMatch = text.match(/和(.+?)一起/)
    if (peopleMatch) people.push(peopleMatch[1])
  }
  return people
}

function extractTimeFromContext(text: string): string | null {
  const times = ['中午', '早上', '下午', '晚上', '深夜']
  for (const time of times) {
    if (text.includes(time)) return time
  }
  return null
}

function extractLocationFromContext(text: string): string | null {
  if (text.includes('在家') || text.includes('家里')) return '在家'
  if (text.includes('办公室') || text.includes('公司')) return '办公室'
  if (text.includes('咖啡厅')) return '咖啡厅'
  if (text.includes('线上')) return '线上'
  return null
}

function extractStateFromContext(text: string): string | null {
  if (text.includes('累') || text.includes('疲惫')) return '累了'
  if (text.includes('开心') || text.includes('高兴')) return '开心'
  if (text.includes('压力')) return '压力大'
  return null
}

// ============================================
// 第二层：分析并存储
// ============================================

/**
 * 分析第一层数据，更新第二层
 */
export async function analyzeAndUpdateLayer2(userId: string) {
  console.log('🔍 [LAYER-2] 开始分析第一层数据')
  
  // 获取第一层数据
  const activities = await prisma.dailyActivity.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 50 // 最近50条活动
  })
  
  const statements = await prisma.userStatement.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: 20 // 最近20条陈述
  })
  
  const chatSessions = await prisma.chatSession.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 10
  })
  
  // 分析核心性格
  const personalityAnalysis = await analyzePersonality(activities, statements, chatSessions)
  
  // 分析行为模式
  const behaviorPatterns = await analyzeBehaviorPatterns(activities, statements)
  
  // 总结偏好
  const preferences = await summarizePreferences(statements, activities)
  
  // 存储到第二层
  await prisma.userAnalysis.upsert({
    where: { userId },
    update: {
      corePersonality: JSON.stringify(personalityAnalysis),
      lastAnalyzedAt: new Date()
    },
    create: {
      userId,
      corePersonality: JSON.stringify(personalityAnalysis),
      lastAnalyzedAt: new Date()
    }
  })
  
  // 更新行为模式
  for (const pattern of behaviorPatterns) {
    await prisma.behaviorPattern.upsert({
      where: {
        userId_patternType_description: {
          userId,
          patternType: pattern.type,
          description: pattern.description
        }
      },
      update: {
        frequency: pattern.frequency,
        evidence: JSON.stringify(pattern.evidence),
        confidence: pattern.confidence,
        lastSeen: new Date()
      },
      create: {
        userId,
        patternType: pattern.type,
        description: pattern.description,
        frequency: pattern.frequency,
        evidence: JSON.stringify(pattern.evidence),
        confidence: pattern.confidence
      }
    })
  }
  
  // 更新偏好总结
  for (const pref of preferences) {
    await prisma.preferenceSummary.upsert({
      where: {
        userId_category_preference: {
          userId,
          category: pref.category,
          preference: pref.preference
        }
      },
      update: {
        strength: pref.strength,
        evidence: JSON.stringify(pref.evidence),
        confidence: pref.confidence
      },
      create: {
        userId,
        category: pref.category,
        preference: pref.preference,
        strength: pref.strength,
        evidence: JSON.stringify(pref.evidence),
        confidence: pref.confidence
      }
    })
  }
  
  console.log('✅ [LAYER-2] 分析层更新完成')
}

/**
 * 分析性格（基于第一层数据）
 */
async function analyzePersonality(activities: any[], statements: any[], chatSessions: any[]) {
  // 这里可以用AI分析，也可以用规则
  // 示例：基于规则的简单分析
  
  const traits = []
  const evidence = []
  
  // 分析独立性
  const aloneActivities = activities.filter(a => !a.people || a.people === 'null')
  if (aloneActivities.length / activities.length > 0.7) {
    traits.push('独立')
    evidence.push({ trait: '独立', activityIds: aloneActivities.map(a => a.id) })
  }
  
  // 分析工作风格
  const workStatements = statements.filter(s => s.statement.includes('工作') || s.statement.includes('项目'))
  // ... 更多分析
  
  return {
    traits,
    confidence: 0.75,
    basedOn: evidence.map(e => e.activityIds).flat(),
    analyzedAt: new Date().toISOString()
  }
}

/**
 * 分析行为模式（基于第一层数据）
 */
async function analyzeBehaviorPatterns(activities: any[], statements: any[]) {
  const patterns = []
  
  // 分析饮食习惯
  const eatingActivities = activities.filter(a => a.activity.includes('吃'))
  const foodCounts: Record<string, number> = {}
  
  for (const activity of eatingActivities) {
    // 提取食物类型
    if (activity.activity.includes('云南') || activity.activity.includes('云海肴')) {
      foodCounts['云南菜'] = (foodCounts['云南菜'] || 0) + 1
    }
  }
  
  for (const [food, count] of Object.entries(foodCounts)) {
    if (count >= 2) {
      patterns.push({
        type: 'eating_habit',
        description: `喜欢吃${food}`,
        frequency: count,
        evidence: eatingActivities.filter(a => a.activity.includes(food)).map(a => ({
          type: 'activity',
          id: a.id,
          date: a.date,
          excerpt: a.activity
        })),
        confidence: Math.min(0.9, count * 0.2)
      })
    }
  }
  
  return patterns
}

/**
 * 总结偏好（基于第一层数据）
 */
async function summarizePreferences(statements: any[], activities: any[]) {
  const preferences = []
  
  // 从用户陈述中提取偏好
  for (const stmt of statements) {
    if (stmt.statement.includes('不喜欢')) {
      const match = stmt.statement.match(/不喜欢(.+)/)
      if (match) {
        preferences.push({
          category: categorizePreference(match[1]),
          preference: `不喜欢${match[1]}`,
          strength: 'strong',
          evidence: [{
            type: 'statement',
            id: stmt.id,
            content: stmt.statement,
            date: stmt.timestamp
          }],
          confidence: 0.95
        })
      }
    }
    
    if (stmt.statement.includes('喜欢')) {
      const match = stmt.statement.match(/喜欢(.+)/)
      if (match) {
        preferences.push({
          category: categorizePreference(match[1]),
          preference: `喜欢${match[1]}`,
          strength: 'medium',
          evidence: [{
            type: 'statement',
            id: stmt.id,
            content: stmt.statement,
            date: stmt.timestamp
          }],
          confidence: 0.85
        })
      }
    }
  }
  
  // 从活动中推断偏好（置信度较低）
  const stateActivityMap: Record<string, any[]> = {}
  for (const activity of activities) {
    if (activity.userState) {
      if (!stateActivityMap[activity.userState]) {
        stateActivityMap[activity.userState] = []
      }
      stateActivityMap[activity.userState].push(activity)
    }
  }
  
  // 如果某个活动经常伴随负面状态，推断为不喜欢
  for (const [state, acts] of Object.entries(stateActivityMap)) {
    if (state === '累了' && acts.length >= 2) {
      const activityType = acts[0].activity.split(/[，。]/)[0]
      preferences.push({
        category: 'activity',
        preference: `${activityType}时容易感到疲惫`,
        strength: 'medium',
        evidence: acts.map(a => ({
          type: 'activity',
          id: a.id,
          content: a.activity,
          date: a.date
        })),
        confidence: 0.6
      })
    }
  }
  
  return preferences
}

function categorizePreference(item: string): string {
  if (item.includes('开会') || item.includes('工作')) return 'work_style'
  if (item.includes('吃') || item.includes('菜')) return 'food'
  if (item.includes('聊天') || item.includes('社交')) return 'social'
  return 'other'
}

// ============================================
// 获取数据（按优先级）
// ============================================

/**
 * 获取用于场景生成的数据（按优先级排序）
 */
export async function getDataForSceneGeneration(userId: string, currentInput: string) {
  console.log('📊 [DATA] 获取场景生成数据')
  
  // 优先级1：用户当前输入
  const priority1 = {
    currentInput
  }
  
  // 优先级2：第一层数据（最近的真实活动和陈述）
  const recentActivities = await prisma.dailyActivity.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 5
  })
  
  const recentStatements = await prisma.userStatement.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: 5
  })
  
  const priority2 = {
    recentActivities: recentActivities.map((a: any) => ({
      activity: a.activity,
      time: a.time,
      state: a.userState,
      quote: a.userQuote
    })),
    recentStatements: recentStatements.map((s: any) => ({
      statement: s.statement,
      type: s.statementType
    }))
  }
  
  // 优先级3：第二层数据（用于推测）
  const userAnalysis = await prisma.userAnalysis.findUnique({
    where: { userId }
  })
  
  const behaviorPatterns = await prisma.behaviorPattern.findMany({
    where: { userId },
    orderBy: { confidence: 'desc' },
    take: 10
  })
  
  const preferences = await prisma.preferenceSummary.findMany({
    where: { userId },
    orderBy: { confidence: 'desc' }
  })
  
  const priority3 = {
    analysis: userAnalysis ? JSON.parse(userAnalysis.corePersonality || '{}') : null,
    patterns: behaviorPatterns.map((p: any) => ({
      type: p.patternType,
      description: p.description,
      frequency: p.frequency,
      confidence: p.confidence
    })),
    preferences: preferences.map((p: any) => ({
      category: p.category,
      preference: p.preference,
      strength: p.strength,
      confidence: p.confidence
    }))
  }
  
  return {
    priority1, // 当前输入
    priority2, // 第一层：真实活动和陈述
    priority3  // 第二层：分析结果（用于推测）
  }
}

/**
 * 生成场景时的使用示例
 */
export async function generateSceneWithTwoLayerData(userId: string, currentInput: string) {
  // 获取两层数据
  const data = await getDataForSceneGeneration(userId, currentInput)
  
  // 构建提示词
  const prompt = `
**优先级1：用户当前输入（最高优先级，100%还原）**
${data.priority1.currentInput}

**优先级2：第一层数据（用户真实说的/做的，事实）**

最近活动：
${data.priority2.recentActivities.map((a: any) => 
  `- ${a.activity} (${a.time}) - 用户原话："${a.quote}"`
).join('\n')}

用户状态：
${data.priority2.recentActivities.filter((a: any) => a.state).map((a: any) => 
  `- ${a.state} (${a.time})`
).join('\n')}

最近陈述：
${data.priority2.recentStatements.map((s: any) => 
  `- "${s.statement}" (${s.type})`
).join('\n')}

**优先级3：第二层数据（AI分析，用于推测，不能覆盖优先级1和2）**

性格分析：
${data.priority3.analysis ? JSON.stringify(data.priority3.analysis.traits) : '暂无'}

行为模式：
${data.priority3.patterns.map((p: any) => 
  `- ${p.description} (出现${p.frequency}次，置信度${p.confidence})`
).join('\n')}

偏好总结：
${data.priority3.preferences.map((p: any) => 
  `- ${p.preference} (${p.strength}，置信度${p.confidence})`
).join('\n')}

**生成规则：**
1. 优先级1的内容必须100%还原
2. 优先级2的事实必须尊重（用户说"累了"必须体现）
3. 优先级3仅用于推测用户没说的细节
`
  
  // 调用场景生成
  return await generateSceneFromPrompt(prompt)
}

// 模拟函数（实际应该调用真实的场景生成服务）
async function generateSceneFromPrompt(prompt: string) {
  return { scene: '...' }
}

// ============================================
// 工具函数
// ============================================

/**
 * 查看用户的两层数据
 */
export async function viewUserTwoLayerData(userId: string) {
  console.log('📊 ===== 第一层：原始数据 =====')
  
  const activities = await prisma.dailyActivity.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 10
  })
  
  console.log('日常活动：')
  activities.forEach((a: any) => {
    console.log(`  - ${a.activity} (${a.time}) - 状态：${a.userState}`)
    console.log(`    用户原话："${a.userQuote}"`)
  })
  
  const statements = await prisma.userStatement.findMany({
    where: { userId },
    orderBy: { timestamp: 'desc' },
    take: 10
  })
  
  console.log('\n用户陈述：')
  statements.forEach((s: any) => {
    console.log(`  - "${s.statement}" (${s.statementType})`)
  })
  
  console.log('\n📊 ===== 第二层：分析层 =====')
  
  const analysis = await prisma.userAnalysis.findUnique({
    where: { userId }
  })
  
  if (analysis) {
    console.log('核心性格分析：')
    console.log(JSON.parse(analysis.corePersonality || '{}'))
  }
  
  const patterns = await prisma.behaviorPattern.findMany({
    where: { userId }
  })
  
  console.log('\n行为模式：')
  patterns.forEach((p: any) => {
    console.log(`  - ${p.description} (出现${p.frequency}次，置信度${p.confidence})`)
  })
  
  const preferences = await prisma.preferenceSummary.findMany({
    where: { userId }
  })
  
  console.log('\n偏好总结：')
  preferences.forEach((p: any) => {
    console.log(`  - ${p.preference} (${p.strength}，置信度${p.confidence})`)
  })
}

// Prisma client (需要导入)
// 这里只是示例，实际应该从 './prisma' 导入
const prisma: any = null // 实际应该导入真实的prisma client











