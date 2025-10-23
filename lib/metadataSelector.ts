/**
 * 智能Metadata选择器
 * 根据不同的生成场景，重点突出相关的metadata字段，但保留所有字段供参考
 */

export interface MetadataContext {
  // 场景生成相关
  sceneGeneration?: {
    frequentLocations?: string[]
    favoriteVenues?: string[]
    aestheticPreferences?: string[]
    lifestyleHobbies?: string[]
    activityPreferences?: string[]
  }
  
  // 故事生成相关
  storyGeneration?: {
    coreTraits?: string[]
    emotionalPattern?: string[]
    communicationStyle?: string[]
    behaviorPatterns?: string[]
    conversationInsights?: string[]
  }
  
  // 提示词生成相关
  promptGeneration?: {
    aestheticPreferences?: string[]
    fashionStyle?: string[]
    lifestyleHobbies?: string[]
    activityPreferences?: string[]
    styleInsights?: string[]
  }
  
  // 性格可视化相关
  personalityVisualization?: {
    coreTraits?: string[]
    emotionalPattern?: string[]
    decisionStyle?: string[]
    stressResponse?: string[]
    interpersonalStrengths?: string[]
    interpersonalChallenges?: string[]
  }
}

/**
 * 根据生成场景智能选择metadata字段
 */
export class MetadataSelector {
  
  /**
   * 场景生成时使用的metadata（重点突出地点、场所、美学，但包含所有字段）
   */
  static selectForSceneGeneration(userMetadata: any): any {
    return {
      // 重点字段（场景生成最相关）
      frequentLocations: this.parseJsonArray(userMetadata.frequentLocations),
      favoriteVenues: this.parseJsonArray(userMetadata.favoriteVenues),
      aestheticPreferences: this.parseJsonArray(userMetadata.aestheticPreferences),
      lifestyleHobbies: this.parseJsonArray(userMetadata.lifestyleHobbies),
      activityPreferences: this.parseJsonArray(userMetadata.activityPreferences),
      
      // 所有其他字段（供参考）
      coreTraits: this.parseJsonArray(userMetadata.coreTraits),
      emotionalPattern: this.parseJsonArray(userMetadata.emotionalPattern),
      communicationStyle: this.parseJsonArray(userMetadata.communicationStyle),
      behaviorPatterns: this.parseJsonArray(userMetadata.behaviorPatterns),
      conversationInsights: this.parseJsonArray(userMetadata.conversationInsights),
      fashionStyle: this.parseJsonArray(userMetadata.fashionStyle),
      styleInsights: this.parseJsonArray(userMetadata.styleInsights),
      decisionStyle: this.parseJsonArray(userMetadata.decisionStyle),
      stressResponse: this.parseJsonArray(userMetadata.stressResponse),
      interpersonalStrengths: this.parseJsonArray(userMetadata.interpersonalStrengths),
      interpersonalChallenges: this.parseJsonArray(userMetadata.interpersonalChallenges)
    }
  }
  
  /**
   * 故事生成时使用的metadata（重点突出性格、情感、行为，但包含所有字段）
   */
  static selectForStoryGeneration(userMetadata: any): any {
    return {
      // 重点字段（故事生成最相关）
      coreTraits: this.parseJsonArray(userMetadata.coreTraits),
      emotionalPattern: this.parseJsonArray(userMetadata.emotionalPattern),
      communicationStyle: this.parseJsonArray(userMetadata.communicationStyle),
      behaviorPatterns: this.parseJsonArray(userMetadata.behaviorPatterns),
      conversationInsights: this.parseJsonArray(userMetadata.conversationInsights),
      
      // 所有其他字段（供参考）
      frequentLocations: this.parseJsonArray(userMetadata.frequentLocations),
      favoriteVenues: this.parseJsonArray(userMetadata.favoriteVenues),
      aestheticPreferences: this.parseJsonArray(userMetadata.aestheticPreferences),
      lifestyleHobbies: this.parseJsonArray(userMetadata.lifestyleHobbies),
      activityPreferences: this.parseJsonArray(userMetadata.activityPreferences),
      fashionStyle: this.parseJsonArray(userMetadata.fashionStyle),
      styleInsights: this.parseJsonArray(userMetadata.styleInsights),
      decisionStyle: this.parseJsonArray(userMetadata.decisionStyle),
      stressResponse: this.parseJsonArray(userMetadata.stressResponse),
      interpersonalStrengths: this.parseJsonArray(userMetadata.interpersonalStrengths),
      interpersonalChallenges: this.parseJsonArray(userMetadata.interpersonalChallenges)
    }
  }
  
  /**
   * 提示词生成时使用的metadata（重点突出美学、时尚、风格，但包含所有字段）
   */
  static selectForPromptGeneration(userMetadata: any): any {
    return {
      // 重点字段（提示词生成最相关）
      aestheticPreferences: this.parseJsonArray(userMetadata.aestheticPreferences),
      fashionStyle: this.parseJsonArray(userMetadata.fashionStyle),
      lifestyleHobbies: this.parseJsonArray(userMetadata.lifestyleHobbies),
      activityPreferences: this.parseJsonArray(userMetadata.activityPreferences),
      styleInsights: this.parseJsonArray(userMetadata.styleInsights),
      
      // 所有其他字段（供参考）
      frequentLocations: this.parseJsonArray(userMetadata.frequentLocations),
      favoriteVenues: this.parseJsonArray(userMetadata.favoriteVenues),
      coreTraits: this.parseJsonArray(userMetadata.coreTraits),
      emotionalPattern: this.parseJsonArray(userMetadata.emotionalPattern),
      communicationStyle: this.parseJsonArray(userMetadata.communicationStyle),
      behaviorPatterns: this.parseJsonArray(userMetadata.behaviorPatterns),
      conversationInsights: this.parseJsonArray(userMetadata.conversationInsights),
      decisionStyle: this.parseJsonArray(userMetadata.decisionStyle),
      stressResponse: this.parseJsonArray(userMetadata.stressResponse),
      interpersonalStrengths: this.parseJsonArray(userMetadata.interpersonalStrengths),
      interpersonalChallenges: this.parseJsonArray(userMetadata.interpersonalChallenges)
    }
  }
  
  /**
   * 性格可视化时使用的metadata（重点突出性格、情感、决策，但包含所有字段）
   */
  static selectForPersonalityVisualization(userMetadata: any): any {
    return {
      // 重点字段（性格可视化最相关）
      coreTraits: this.parseJsonArray(userMetadata.coreTraits),
      emotionalPattern: this.parseJsonArray(userMetadata.emotionalPattern),
      decisionStyle: this.parseJsonArray(userMetadata.decisionStyle),
      stressResponse: this.parseJsonArray(userMetadata.stressResponse),
      interpersonalStrengths: this.parseJsonArray(userMetadata.interpersonalStrengths),
      interpersonalChallenges: this.parseJsonArray(userMetadata.interpersonalChallenges),
      
      // 所有其他字段（供参考）
      frequentLocations: this.parseJsonArray(userMetadata.frequentLocations),
      favoriteVenues: this.parseJsonArray(userMetadata.favoriteVenues),
      aestheticPreferences: this.parseJsonArray(userMetadata.aestheticPreferences),
      lifestyleHobbies: this.parseJsonArray(userMetadata.lifestyleHobbies),
      activityPreferences: this.parseJsonArray(userMetadata.activityPreferences),
      communicationStyle: this.parseJsonArray(userMetadata.communicationStyle),
      behaviorPatterns: this.parseJsonArray(userMetadata.behaviorPatterns),
      conversationInsights: this.parseJsonArray(userMetadata.conversationInsights),
      fashionStyle: this.parseJsonArray(userMetadata.fashionStyle),
      styleInsights: this.parseJsonArray(userMetadata.styleInsights)
    }
  }
  
  /**
   * 解析JSON数组字段
   */
  private static parseJsonArray(field: any): string[] {
    if (!field) return []
    if (Array.isArray(field)) return field
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }
    return []
  }
  
  /**
   * 获取所有相关字段的摘要（用于调试）
   */
  static getMetadataSummary(userMetadata: any): string {
    const scene = this.selectForSceneGeneration(userMetadata)
    const story = this.selectForStoryGeneration(userMetadata)
    const prompt = this.selectForPromptGeneration(userMetadata)
    const personality = this.selectForPersonalityVisualization(userMetadata)
    
    return `场景生成相关: ${Object.values(scene).flat().length}项 | 故事生成相关: ${Object.values(story).flat().length}项 | 提示词生成相关: ${Object.values(prompt).flat().length}项 | 性格可视化相关: ${Object.values(personality).flat().length}项`
  }
}
