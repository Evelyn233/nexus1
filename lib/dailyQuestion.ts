/**
 * 每日一问：多维问题池（与用户相关、中英混合），按维度轮换
 */

export type QuestionDimension = 'career_ai' | 'art' | 'philosophy' | 'personal' | 'location' | 'general'

export interface DailyQuestionItem {
  text: string
  dimension: QuestionDimension
}

/**
 * 仅供 fallback 使用（AI 生成失败时）。问题必须极其通用，不假设任何职业/身份。
 * 正常情况下应优先用 profile 驱动 AI 生成。
 */
export const DAILY_QUESTIONS_BY_DIMENSION: Record<QuestionDimension, string[]> = {
  career_ai: [
    '你工作中最有成就感的一刻是什么？',
    'What do you enjoy most about what you do?',
  ],
  art: [
    '最近有什么让你印象深刻的作品或音乐？',
    'What\'s something that recently moved you?',
  ],
  philosophy: [
    '有什么话题是你常常思考但很少和人聊的？',
    '你最近在思考的一个「大问题」是什么？',
  ],
  personal: [
    '当别人问「如何平衡事业与生活」时，你内心的真实反应是什么？',
    '你希望别人记住你的哪一面？',
    '你觉得自己在什么状态下最像自己？',
  ],
  location: [
    '你所在的地方如何影响你的日常？',
    'How does where you live shape your day?',
  ],
  general: [
    '今天你最有冲动想做的一件事是什么？',
    '如果明天世界只剩一件事可以做，你会选什么？',
    '如果可以对五年前的自己说一句话，你会说什么？',
    '你希望十年后的自己怎么评价现在的你？',
  ],
}

/** fallback 仅当 AI 生成失败时使用，全部为通用问题，不假设任何职业 */
export const DEFAULT_DAILY_QUESTIONS: string[] = [
  '今天你最有冲动想做的一件事是什么？',
  '你希望别人记住你的哪一面？',
  '你最近在思考的一个「大问题」是什么？',
  '你希望十年后的自己怎么评价现在的你？',
  '你所在的地方如何影响你的日常？',
  '有什么话题是你常常思考但很少和人聊的？',
  '你工作中最有成就感的一刻是什么？',
  '当别人问「如何平衡事业与生活」时，你内心的真实反应是什么？',
  '你觉得自己在什么状态下最像自己？',
  '如果可以对五年前的自己说一句话，你会说什么？',
]

export type QuestionRating = 'milder' | 'sharper' | 'keep' | 'more_personal' | 'other'

export const RATING_OPTIONS: { value: QuestionRating; label: string }[] = [
  { value: 'milder', label: '下次更温和一点' },
  { value: 'sharper', label: '下次更尖锐一点' },
  { value: 'keep', label: '保持这样就好' },
  { value: 'more_personal', label: '更个人化一点' },
  { value: 'other', label: '其他' },
]

const DIMENSION_ORDER: QuestionDimension[] = ['career_ai', 'art', 'philosophy', 'personal', 'location', 'general']

/** 根据日期取当日问题：按维度轮换；若传 userDimensionHint 则优先该维度（与用户评价相关） */
export function getQuestionForDate(date: Date, userDimensionHint?: QuestionDimension | null): string {
  const start = new Date(date.getFullYear(), 0, 0)
  const diff = date.getTime() - start.getTime()
  const oneDay = 24 * 60 * 60 * 1000
  const dayOfYear = Math.floor(diff / oneDay)

  // 与用户相关：若用户上次选了「更个人化/更尖锐/更温和」，优先对应维度
  if (userDimensionHint && DAILY_QUESTIONS_BY_DIMENSION[userDimensionHint]?.length) {
    const pool = DAILY_QUESTIONS_BY_DIMENSION[userDimensionHint]
    const qIndex = dayOfYear % pool.length
    return pool[qIndex] ?? pool[0]
  }

  // 按日轮换维度，保证多维
  const dimensionIndex = dayOfYear % DIMENSION_ORDER.length
  const dimension = DIMENSION_ORDER[dimensionIndex]
  const pool = DAILY_QUESTIONS_BY_DIMENSION[dimension]
  if (pool?.length) {
    const qIndex = Math.floor(dayOfYear / DIMENSION_ORDER.length) % pool.length
    return pool[qIndex] ?? pool[0]
  }

  // fallback: 扁平列表按日
  const index = dayOfYear % DEFAULT_DAILY_QUESTIONS.length
  return DEFAULT_DAILY_QUESTIONS[index] ?? DEFAULT_DAILY_QUESTIONS[0]
}

/** 当天 0 点（按本地日期） */
export function getTodayStart(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}
