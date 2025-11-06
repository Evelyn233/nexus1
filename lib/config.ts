// API配置
export const API_CONFIG = {
  // DeepSeek语言模型配置
  DOUBAO_LLM: {
    API_KEY: process.env.DEEPSEEK_API_KEY || 'sk-e3911ff08dae4f4fb59c7b521e2a5415',
    ENDPOINT: 'https://api.deepseek.com/chat/completions',
    MODEL: 'deepseek-chat',
    TIMEOUT: 30000,
    MAX_RETRIES: 3
  },
  
  // SeeDream生图API配置
  SEEDREAM_IMAGE: {
    API_KEY: process.env.SEEDREAM_API_KEY || '17b4a6a5-1a2b-4c3d-827b-cef480fd1580',
    ENDPOINT: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
    MODEL: 'doubao-seedream-4-0-250828',
    TIMEOUT: 60000, // 60秒超时，生图需要更长时间
    MAX_RETRIES: 3
  },
  
  // 支持的图片尺寸
  IMAGE_SIZES: {
    SQUARE: { width: 512, height: 512 },
    LANDSCAPE: { width: 768, height: 512 },
    PORTRAIT: { width: 512, height: 768 },
    MAGAZINE: { width: 400, height: 300 }
  },
  
  // 支持的风格
  IMAGE_STYLES: [
    'photorealistic',
    'artistic',
    'minimalist',
    'vintage',
    'modern',
    'black_and_white'
  ]
}

// 预设提示词模板
export const PROMPT_TEMPLATES = {
  FASHION: '时尚生活杂志风格，{prompt}，高质量摄影，柔和光线，杂志封面风格，专业摄影',
  LIFESTYLE: '生活方式摄影，{prompt}，自然光线，温馨氛围，高质量',
  PROFESSIONAL: '专业商务风格，{prompt}，正式场合，自信优雅，高质量摄影',
  CASUAL: '休闲日常风格，{prompt}，轻松自然，生活化场景，高质量'
}

// 快速生成选项 - 精简版（6个核心场景，涵盖所有类型）
export const QUICK_GENERATE_OPTIONS = [
  // 😊 情绪/日常场景
  '今天上班很开心 项目顺利完成了',
  
  // 💡 观点表达场景
  '中国缺乏高端杂志市场',
  
  // 🎬 假想场景（如果...）
  '如果我当年没有出国 现在会是什么样',
  
  // 🎭 角色扮演场景
  '我觉得自己像个反社会女反派',
  
  // 🏢 工作/社交场景
  '今天和老板开会 讨论了新项目',
  
  // 💭 自我反思场景
  '最近在想要不要换个工作'
]
