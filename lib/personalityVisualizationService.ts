/**
 * 性格可视化服务
 * 
 * 根据用户的性格特质、审美偏好、生活方式，推测用户在场景中的具体细节：
 * - 视觉偏好（看什么）
 * - 食物偏好（吃什么）
 * - 听觉偏好（听什么）
 * - 活动偏好（做什么）
 * - 空间偏好（在哪）
 */

import { UserInfo, UserMetadata } from './userInfoService'

export interface VisualizedPersonality {
  // 视觉偏好
  visualPreferences: {
    colors: string[]           // 喜欢的颜色
    artStyle: string[]         // 艺术风格
    designStyle: string        // 设计风格（极简/复杂/工业/自然）
    decorElements: string[]    // 装饰元素
  }
  
  // 食物偏好
  foodPreferences: {
    cuisineTypes: string[]     // 菜系类型
    flavors: string[]          // 口味偏好
    diningStyle: string        // 用餐风格（精致/随意/快速/社交）
    beverages: string[]        // 饮品偏好
  }
  
  // 听觉偏好
  audioPreferences: {
    musicGenres: string[]      // 音乐类型
    ambientSounds: string[]    // 环境声音
    voiceStyle: string         // 说话风格
  }
  
  // 活动偏好
  activityPreferences: {
    workStyle: string          // 工作方式
    leisure: string[]          // 休闲活动
    socialStyle: string        // 社交方式
    movement: string           // 活动强度（静态/动态）
  }
  
  // 空间偏好
  spacePreferences: {
    indoor: string[]           // 室内偏好
    outdoor: string[]          // 户外偏好
    privacy: string            // 隐私度（私密/半开放/开放）
    organization: string       // 组织方式（极简/有序/丰富）
  }
}

export class PersonalityVisualizationService {
  
  /**
   * 主函数：将用户性格可视化为场景细节
   */
  static async visualizePersonality(
    userInfo: UserInfo,
    userMetadata: UserMetadata | null
  ): Promise<VisualizedPersonality> {
    // 提取关键性格特质
    const coreTraits = this.extractCoreTraits(userMetadata)
    const aesthetics = this.extractAestheticPreferences(userMetadata)
    const lifestyle = this.extractLifestyleHobbies(userMetadata)
    
    // 基于性格推测视觉偏好
    const visualPreferences = this.inferVisualPreferences(coreTraits, aesthetics, userInfo)
    
    // 基于性格推测食物偏好
    const foodPreferences = this.inferFoodPreferences(coreTraits, lifestyle, userInfo)
    
    // 基于性格推测听觉偏好
    const audioPreferences = this.inferAudioPreferences(coreTraits, aesthetics)
    
    // 基于性格推测活动偏好
    const activityPreferences = this.inferActivityPreferences(coreTraits, lifestyle)
    
    // 基于性格推测空间偏好
    const spacePreferences = this.inferSpacePreferences(coreTraits, aesthetics)
    
    const result = {
      visualPreferences,
      foodPreferences,
      audioPreferences,
      activityPreferences,
      spacePreferences
    }
    
    return result
  }
  
  /**
   * 提取核心性格特质
   */
  private static extractCoreTraits(userMetadata: UserMetadata | null): string[] {
    if (!userMetadata) return []
    
    const traits = []
    
    // 从多个字段提取性格特质
    if (userMetadata.corePersonalityTraits) {
      traits.push(...this.parseJsonArray(userMetadata.corePersonalityTraits))
    }
    
    if (userMetadata.ziweiPersonality) {
      traits.push(...this.parseJsonArray(userMetadata.ziweiPersonality))
    }
    
    return traits
  }
  
  /**
   * 提取审美偏好
   */
  private static extractAestheticPreferences(userMetadata: UserMetadata | null): string[] {
    if (!userMetadata || !userMetadata.aestheticPreferences) return []
    return this.parseJsonArray(userMetadata.aestheticPreferences)
  }
  
  /**
   * 提取生活方式爱好
   */
  private static extractLifestyleHobbies(userMetadata: UserMetadata | null): string[] {
    if (!userMetadata || !userMetadata.lifestyleHobbies) return []
    return this.parseJsonArray(userMetadata.lifestyleHobbies)
  }
  
  /**
   * 推测视觉偏好
   */
  private static inferVisualPreferences(
    coreTraits: string[],
    aesthetics: string[],
    userInfo: UserInfo
  ) {
    const colors: string[] = []
    const artStyle: string[] = []
    let designStyle = '现代简约'
    const decorElements: string[] = []
    
    // 基于性格推测配色
    if (coreTraits.some(t => t.includes('理性') || t.includes('冷静'))) {
      colors.push('冷色调', '深蓝', '灰白')
      designStyle = '极简主义'
    }
    
    if (coreTraits.some(t => t.includes('感性') || t.includes('艺术'))) {
      colors.push('暖色调', '琥珀色', '米白')
      artStyle.push('现代艺术', '抽象画')
      decorElements.push('艺术摆件', '设计师灯具')
    }
    
    if (coreTraits.some(t => t.includes('创新') || t.includes('科技'))) {
      colors.push('黑白灰', '科技蓝')
      designStyle = '工业风'
      decorElements.push('金属质感', '几何装饰', '科技感灯光')
    }
    
    if (coreTraits.some(t => t.includes('温和') || t.includes('内敛'))) {
      colors.push('莫兰迪色', '浅色系')
      designStyle = '北欧风'
      decorElements.push('绿植', '木质家具', '柔和灯光')
    }
    
    // 基于审美偏好补充
    if (aesthetics.some(a => a.includes('简约') || a.includes('极简'))) {
      designStyle = '极简主义'
      decorElements.push('留白', '单色系')
    }
    
    if (aesthetics.some(a => a.includes('艺术') || a.includes('文艺'))) {
      artStyle.push('文艺复兴', '印象派', '当代艺术')
      decorElements.push('画作', '雕塑', '艺术书籍')
    }
    
    return {
      colors: colors.length > 0 ? colors : ['中性色调'],
      artStyle: artStyle.length > 0 ? artStyle : ['现代简约'],
      designStyle,
      decorElements: decorElements.length > 0 ? decorElements : ['简约装饰']
    }
  }
  
  /**
   * 推测食物偏好
   */
  private static inferFoodPreferences(
    coreTraits: string[],
    lifestyle: string[],
    userInfo: UserInfo
  ) {
    const cuisineTypes: string[] = []
    const flavors: string[] = []
    let diningStyle = '随意舒适'
    const beverages: string[] = []
    
    // 基于地理位置推测菜系
    const location = userInfo.location || '上海'
    if (location.includes('上海')) {
      cuisineTypes.push('本帮菜', '融合菜', '精致简餐')
    } else if (location.includes('北京')) {
      cuisineTypes.push('京菜', '北方菜', '烤肉')
    } else if (location.includes('广州') || location.includes('深圳')) {
      cuisineTypes.push('粤菜', '港式茶餐厅', '海鲜')
    }
    
    // 基于性格推测口味
    if (coreTraits.some(t => t.includes('理性') || t.includes('严谨'))) {
      flavors.push('清淡', '原汁原味', '健康')
      diningStyle = '精致用餐'
      beverages.push('美式咖啡', '绿茶', '矿泉水')
    }
    
    if (coreTraits.some(t => t.includes('感性') || t.includes('浪漫'))) {
      flavors.push('甜', '精致', '有层次感')
      diningStyle = '优雅慢食'
      beverages.push('拿铁', '红茶', '甜品配饮')
    }
    
    if (coreTraits.some(t => t.includes('创新') || t.includes('冒险'))) {
      cuisineTypes.push('创意料理', '融合菜', '网红餐厅')
      flavors.push('新奇', '多元', '创意')
      beverages.push('特调饮品', '精品咖啡', '果汁')
    }
    
    // 基于生活方式补充
    if (lifestyle.some(l => l.includes('健身') || l.includes('运动'))) {
      flavors.push('低卡', '高蛋白', '清淡')
      beverages.push('蛋白饮', '运动饮料')
    }
    
    if (lifestyle.some(l => l.includes('咖啡') || l.includes('下午茶'))) {
      beverages.push('手冲咖啡', '意式浓缩', '精品茶')
      diningStyle = '休闲社交'
    }
    
    return {
      cuisineTypes: cuisineTypes.length > 0 ? cuisineTypes : ['家常菜', '简餐'],
      flavors: flavors.length > 0 ? flavors : ['适中口味'],
      diningStyle,
      beverages: beverages.length > 0 ? beverages : ['咖啡', '茶']
    }
  }
  
  /**
   * 推测听觉偏好
   */
  private static inferAudioPreferences(
    coreTraits: string[],
    aesthetics: string[]
  ) {
    const musicGenres: string[] = []
    const ambientSounds: string[] = []
    let voiceStyle = '温和平稳'
    
    // 基于性格推测音乐类型
    if (coreTraits.some(t => t.includes('理性') || t.includes('专注'))) {
      musicGenres.push('古典音乐', 'Lo-fi', '环境音乐')
      ambientSounds.push('键盘敲击声', '纸张翻动', '轻微人声')
      voiceStyle = '低沉平稳'
    }
    
    if (coreTraits.some(t => t.includes('感性') || t.includes('艺术'))) {
      musicGenres.push('独立音乐', '爵士', '古典')
      ambientSounds.push('咖啡机声', '轻柔交谈', '雨声')
      voiceStyle = '温柔细腻'
    }
    
    if (coreTraits.some(t => t.includes('创新') || t.includes('活力'))) {
      musicGenres.push('电子', '流行', '摇滚')
      ambientSounds.push('城市车流', '人群喧嚣', '活力音乐')
      voiceStyle = '清晰有力'
    }
    
    if (coreTraits.some(t => t.includes('内敛') || t.includes('安静'))) {
      musicGenres.push('轻音乐', '钢琴曲', '自然声')
      ambientSounds.push('鸟鸣', '风声', '安静环境')
      voiceStyle = '温和轻柔'
    }
    
    // 基于审美补充
    if (aesthetics.some(a => a.includes('文艺') || a.includes('复古'))) {
      musicGenres.push('民谣', '爵士', '蓝调')
    }
    
    return {
      musicGenres: musicGenres.length > 0 ? musicGenres : ['轻音乐'],
      ambientSounds: ambientSounds.length > 0 ? ambientSounds : ['安静环境'],
      voiceStyle
    }
  }
  
  /**
   * 推测活动偏好
   */
  private static inferActivityPreferences(
    coreTraits: string[],
    lifestyle: string[]
  ) {
    let workStyle = '专注独立工作'
    const leisure: string[] = []
    let socialStyle = '小圈子社交'
    let movement = '静态为主'
    
    // 基于性格推测工作方式
    if (coreTraits.some(t => t.includes('理性') || t.includes('专注'))) {
      workStyle = '深度工作，长时间专注'
      movement = '静态为主'
    }
    
    if (coreTraits.some(t => t.includes('外向') || t.includes('社交'))) {
      workStyle = '团队协作，边走边想'
      socialStyle = '活跃社交，多元圈子'
      movement = '动静结合'
    }
    
    if (coreTraits.some(t => t.includes('创新') || t.includes('冒险'))) {
      workStyle = '灵活多变，头脑风暴'
      leisure.push('探索新地方', '尝试新事物', '户外运动')
      movement = '动态为主'
    }
    
    // 基于生活方式补充
    if (lifestyle.some(l => l.includes('阅读'))) {
      leisure.push('阅读', '图书馆', '书店')
    }
    
    if (lifestyle.some(l => l.includes('运动') || l.includes('健身'))) {
      leisure.push('跑步', '健身', '户外运动')
      movement = '动态为主'
    }
    
    if (lifestyle.some(l => l.includes('咖啡') || l.includes('文艺'))) {
      leisure.push('咖啡厅', '艺术展', '文艺活动')
    }
    
    if (lifestyle.some(l => l.includes('音乐'))) {
      leisure.push('音乐会', '现场演出', '唱片店')
    }
    
    return {
      workStyle,
      leisure: leisure.length > 0 ? leisure : ['日常休闲'],
      socialStyle,
      movement
    }
  }
  
  /**
   * 推测空间偏好
   */
  private static inferSpacePreferences(
    coreTraits: string[],
    aesthetics: string[]
  ) {
    const indoor: string[] = []
    const outdoor: string[] = []
    let privacy = '半开放'
    let organization = '有序整洁'
    
    // 基于性格推测空间偏好
    if (coreTraits.some(t => t.includes('内向') || t.includes('私密'))) {
      indoor.push('独立工作室', '安静角落', '私人空间')
      privacy = '私密'
      organization = '极简有序'
    }
    
    if (coreTraits.some(t => t.includes('外向') || t.includes('开放'))) {
      indoor.push('开放式办公', '共享空间', '咖啡厅')
      outdoor.push('公园', '户外露台', '繁华街道')
      privacy = '开放'
    }
    
    if (coreTraits.some(t => t.includes('创意') || t.includes('艺术'))) {
      indoor.push('创意工作室', '艺术空间', 'loft')
      outdoor.push('艺术园区', '文艺街区')
      organization = '丰富有序'
    }
    
    // 基于审美补充
    if (aesthetics.some(a => a.includes('极简'))) {
      organization = '极简留白'
      indoor.push('简约空间', '空旷房间')
    }
    
    if (aesthetics.some(a => a.includes('自然'))) {
      outdoor.push('森林公园', '河边', '山间')
      indoor.push('大量绿植', '自然光')
    }
    
    return {
      indoor: indoor.length > 0 ? indoor : ['舒适室内'],
      outdoor: outdoor.length > 0 ? outdoor : ['户外散步'],
      privacy,
      organization
    }
  }
  
  /**
   * 生成场景描述文本（用于注入到提示词）
   */
  static generateSceneDescription(visualized: VisualizedPersonality): string {
    return `
【视觉细节】
- 配色：${visualized.visualPreferences.colors.join('、')}
- 设计风格：${visualized.visualPreferences.designStyle}
- 装饰元素：${visualized.visualPreferences.decorElements.join('、')}
- 艺术品：${visualized.visualPreferences.artStyle.join('、')}

【食物细节】
- 菜系：${visualized.foodPreferences.cuisineTypes.join('、')}
- 口味：${visualized.foodPreferences.flavors.join('、')}
- 用餐风格：${visualized.foodPreferences.diningStyle}
- 饮品：${visualized.foodPreferences.beverages.join('、')}

【听觉细节】
- 背景音乐：${visualized.audioPreferences.musicGenres.join('、')}
- 环境声音：${visualized.audioPreferences.ambientSounds.join('、')}

【活动细节】
- 工作方式：${visualized.activityPreferences.workStyle}
- 休闲活动：${visualized.activityPreferences.leisure.join('、')}
- 社交方式：${visualized.activityPreferences.socialStyle}

【空间细节】
- 隐私度：${visualized.spacePreferences.privacy}
- 组织方式：${visualized.spacePreferences.organization}
- 偏好空间：${visualized.spacePreferences.indoor.concat(visualized.spacePreferences.outdoor).join('、')}
`.trim()
  }
  
  /**
   * 辅助：解析JSON数组字符串
   */
  private static parseJsonArray(jsonString: string): string[] {
    try {
      const parsed = JSON.parse(jsonString)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
}

