/**
 * 临时对话内容提取器
 * 
 * 从当前对话中提取临时上下文信息（不保存到Prisma）
 * 用于增强生成提示词的具体细节
 */

export interface TemporaryContext {
  // 本次对话中提到的具体内容
  foods: string[]           // 吃了什么（如：茉莉花炒鸡蛋）
  activities: string[]      // 做了什么（如：做AI项目、休息）
  locations: string[]       // 去了哪里（如：家里、咖啡厅）
  emotions: string[]        // 情绪（如：开心、累）
  people: string[]          // 和谁（如：朋友、同事）
  timeOfDay: string[]       // 时间（如：中午、晚上）
  
  // 具体细节
  specificDetails: string[] // 其他具体细节
}

/**
 * 从对话中提取临时上下文
 */
export function extractTemporaryContext(
  initialPrompt: string,
  questions: string[],
  answers: string[]
): TemporaryContext {
  const context: TemporaryContext = {
    foods: [],
    activities: [],
    locations: [],
    emotions: [],
    people: [],
    timeOfDay: [],
    specificDetails: []
  }
  
  // 合并所有文本
  const allText = [initialPrompt, ...answers].join(' ')
  
  // 提取食物
  const foodKeywords = ['吃', '菜', '饭', '餐', '外卖', '点了', '喝', '茶', '咖啡']
  foodKeywords.forEach(keyword => {
    if (allText.includes(keyword)) {
      // 提取食物相关的词
      const foodMatch = allText.match(new RegExp(`(\\S{0,10}${keyword}\\S{0,10})`, 'g'))
      if (foodMatch) {
        context.foods.push(...foodMatch)
      }
    }
  })
  
  // 提取活动
  const activityKeywords = ['做', '干', '工作', '项目', '开发', '运动', '休息', '看', '玩']
  activityKeywords.forEach(keyword => {
    if (allText.includes(keyword)) {
      const activityMatch = allText.match(new RegExp(`(\\S{0,10}${keyword}\\S{0,10})`, 'g'))
      if (activityMatch) {
        context.activities.push(...activityMatch)
      }
    }
  })
  
  // 提取地点
  const locationKeywords = ['在', '去', '到', '家', '公司', '咖啡', '公园', '店', '路', '区']
  locationKeywords.forEach(keyword => {
    if (allText.includes(keyword)) {
      const locationMatch = allText.match(new RegExp(`(\\S{0,10}${keyword}\\S{0,10})`, 'g'))
      if (locationMatch) {
        context.locations.push(...locationMatch)
      }
    }
  })
  
  // 提取情绪
  const emotionKeywords = ['开心', '高兴', '快乐', '累', '疲惫', '焦虑', '激动', '满意', '失望']
  emotionKeywords.forEach(keyword => {
    if (allText.includes(keyword)) {
      context.emotions.push(keyword)
    }
  })
  
  // 提取人物
  const peopleKeywords = ['朋友', '同事', '家人', '伙伴', '老板', '客户', '一起']
  peopleKeywords.forEach(keyword => {
    if (allText.includes(keyword)) {
      context.people.push(keyword)
    }
  })
  
  // 提取时间
  const timeKeywords = ['早上', '上午', '中午', '下午', '晚上', '今天', '昨天', '明天']
  timeKeywords.forEach(keyword => {
    if (allText.includes(keyword)) {
      context.timeOfDay.push(keyword)
    }
  })
  
  // 去重
  context.foods = Array.from(new Set(context.foods))
  context.activities = Array.from(new Set(context.activities))
  context.locations = Array.from(new Set(context.locations))
  context.emotions = Array.from(new Set(context.emotions))
  context.people = Array.from(new Set(context.people))
  context.timeOfDay = Array.from(new Set(context.timeOfDay))
  
  return context
}

/**
 * 将临时上下文转换为描述文本
 */
export function temporaryContextToDescription(context: TemporaryContext): string {
  const parts: string[] = []
  
  if (context.foods.length > 0) {
    parts.push(`【本次饮食】${context.foods.join('、')}`)
  }
  
  if (context.activities.length > 0) {
    parts.push(`【本次活动】${context.activities.join('、')}`)
  }
  
  if (context.locations.length > 0) {
    parts.push(`【本次地点】${context.locations.join('、')}`)
  }
  
  if (context.emotions.length > 0) {
    parts.push(`【本次情绪】${context.emotions.join('、')}`)
  }
  
  if (context.people.length > 0) {
    parts.push(`【同伴】${context.people.join('、')}`)
  }
  
  if (context.timeOfDay.length > 0) {
    parts.push(`【时间】${context.timeOfDay.join('、')}`)
  }
  
  return parts.length > 0 ? parts.join('\n') : ''
}

