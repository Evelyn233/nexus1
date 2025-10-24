import { UserInfo, UserMetadata } from './userInfoService'

// 用户元数据分析服务
export class UserMetadataAnalyzer {
  
  // 分析用户元数据
  static async analyzeUserMetadata(userInfo: UserInfo): Promise<UserMetadata> {
    console.log('🔍 开始分析用户元数据...')
    
    // 构建分析提示词
    const analysisPrompt = this.buildAnalysisPrompt(userInfo)
    
    try {
      // 调用DeepSeek API进行元数据分析
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY || 'sk-e3911ff08dae4f4fb59c7b521e2a5415'}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的心理学专家，擅长分析用户的真实性格特质。星座、八字只是辅助参考（权重10%），最重要的是基于用户的真实对话、行为、自我描述来分析性格特征。当用户提供MBTI信息时，你必须立即进行深度分析，生成具体的性格特征，绝对不能返回"待分析"。特别擅长分析性格演化（如从ENTP到INFJ）和创业经历对性格的影响。'
            },
            {
              role: 'user',
              content: analysisPrompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        throw new Error(`DeepSeek API调用失败: ${response.status}`)
      }

      const data = await response.json()
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const analysisResult = data.choices[0].message.content.trim()
        console.log('🎯 元数据分析结果:', analysisResult)
        
        // 解析分析结果
        return this.parseAnalysisResult(analysisResult, userInfo)
      } else {
        throw new Error('DeepSeek API返回格式错误')
      }
    } catch (error) {
      console.error('❌ 用户元数据分析失败:', error)
      // 返回基于基本信息的默认分析
      return this.generateDefaultMetadata(userInfo)
    }
  }

  // 构建分析提示词
  private static buildAnalysisPrompt(userInfo: UserInfo, existingMetadata?: any, userAnswers?: string[]): string {
    const age = userInfo.age || 0
    const gender = userInfo.gender === 'male' ? '男性' : '女性'
    
    // 先计算正确的星座和生肖
    const zodiacSign = this.getZodiacSign(userInfo.birthDate.month, userInfo.birthDate.day)
    const chineseZodiac = this.getChineseZodiac(userInfo.birthDate.year)
    
    // 检查是否包含MBTI信息
    const mbtiMatch = userInfo.personality.match(/\b(ENTP|INFJ|INTJ|ENTJ|ENFP|INFP|ENFJ|INFJ|ISTJ|ESTJ|ISFJ|ESFJ|ISTP|ESTP|ISFP|ESFP)\b/i)
    const hasMBTI = mbtiMatch !== null
    const mbtiType = mbtiMatch ? mbtiMatch[1] : ''
    
    // 检查是否包含性格变化信息（如从ENTP到INFJ）
    const personalityEvolutionMatch = userInfo.personality.match(/(从|以前是|曾经是|本来是)\s*(ENTP|INFJ|INTJ|ENTJ|ENFP|INFP|ENFJ|INFJ|ISTJ|ESTJ|ISFJ|ESFJ|ISTP|ESTP|ISFP|ESFP)\s*(到|现在是|后来变成|后来是)\s*(ENTP|INFJ|INTJ|ENTJ|ENFP|INFP|ENFJ|INFJ|ISTJ|ESTJ|ISFJ|ESFJ|ISTP|ESTP|ISFP|ESFP)/i)
    const hasPersonalityEvolution = personalityEvolutionMatch !== null
    const previousMBTI = personalityEvolutionMatch ? personalityEvolutionMatch[2] : ''
    const currentMBTI = personalityEvolutionMatch ? personalityEvolutionMatch[4] : mbtiType
    
    let prompt = `请根据以下用户基本信息进行深度性格和元数据分析：

用户基本信息：
- 性别：${gender}
- 年龄：${age}岁
- 身高：${userInfo.height}cm
- 体重：${userInfo.weight}kg
- 所在地：${userInfo.location}
- 生日：${userInfo.birthDate.year}年${userInfo.birthDate.month}月${userInfo.birthDate.day}日
- 星座：${zodiacSign}（根据生日计算）
- 生肖：${chineseZodiac}（根据年份计算）
- 性格描述：${userInfo.personality}${userInfo.gender === 'female' && userInfo.hairLength ? `\n- 头发长度：${userInfo.hairLength}` : ''}`

    // 如果有MBTI信息，特别强调进行深度分析
    if (hasMBTI) {
      prompt += `\n\n🎯 重要提示：用户提供了MBTI性格类型信息（${currentMBTI}），请立即进行深度分析，不要返回"待分析"！`
    }
    
    // 如果有性格变化信息，特别分析
    if (hasPersonalityEvolution) {
      prompt += `\n\n🔄 性格演化分析：用户经历了从${previousMBTI}到${currentMBTI}的性格变化，请深度分析这种变化的原因、特征和影响！`
    }

    // 如果有现有元数据，显示给LLM参考
    if (existingMetadata && Object.keys(existingMetadata).length > 0) {
      prompt += `\n\n现有元数据（请在此基础上累积分析，不要重复）：`
      if (existingMetadata.corePersonalityTraits?.length > 0) {
        prompt += `\n- 已有性格特质：${existingMetadata.corePersonalityTraits.join('、')}`
      }
      if (existingMetadata.aestheticPreferences?.length > 0) {
        prompt += `\n- 已有美学偏好：${existingMetadata.aestheticPreferences.join('、')}`
      }
      if (existingMetadata.conversationInsights?.length > 0) {
        prompt += `\n- 已有对话洞察：${existingMetadata.conversationInsights.join('、')}`
      }
    }

    // 如果有用户回答，进行分析
    if (userAnswers && userAnswers.length > 0) {
      prompt += `\n\n用户最新回答：${userAnswers.join(' | ')}`
      prompt += `\n\n请基于用户的最新回答，分析其：`
      prompt += `\n- 活动偏好和生活方式`
      prompt += `\n- 审美风格和穿搭偏好`
      prompt += `\n- 社交行为和沟通风格`
      prompt += `\n- 性格特征的新发现`
    }

    // 如果有MBTI信息，添加专门的MBTI分析要求
    if (hasMBTI || hasPersonalityEvolution) {
      prompt += `\n\n📊 MBTI深度分析要求：`
      if (hasPersonalityEvolution) {
        prompt += `\n- 分析从${previousMBTI}到${currentMBTI}的性格变化特征`
        prompt += `\n- 分析创业经历对性格演化的影响`
        prompt += `\n- 分析性格变化对沟通风格、情感模式、决策风格的影响`
      }
      prompt += `\n- 基于${currentMBTI}类型分析其核心性格特质`
      prompt += `\n- 分析沟通风格特征（如：ENTP的辩论型沟通 vs INFJ的深度倾听）`
      prompt += `\n- 分析情感模式特征（如：ENTP的外向直觉 vs INFJ的内向直觉）`
      prompt += `\n- 分析决策风格特征（如：ENTP的创新导向 vs INFJ的价值观导向）`
      prompt += `\n- 分析职业天赋倾向（基于MBTI类型和创业经历）`
      prompt += `\n- 分析感情关系模式（基于性格类型和人生经历）`
      prompt += `\n- 分析人生哲学（基于性格演化过程）`
    }

    prompt += `\n\n重要：用户手动输入的性格描述（"${userInfo.personality}"）是重要的自我认知信息，请将其与上述星座、生肖等分析结果结合起来，形成完整的用户画像。请基于${zodiacSign}和${chineseZodiac}的特征进行分析。

请进行深度分析并以JSON格式返回，将星盘八字分析转换为具体的用户性格特征、命运特点、爱好偏好，不要存储原始的五行、星座、生肖标签：

**深度命理分析（基于用户具体生日${userInfo.birthDate.year}年${userInfo.birthDate.month}月${userInfo.birthDate.day}日）：**
请根据用户的具体生日进行精确的命理计算和分析，不要使用任何模板或示例数据。

- 深度八字分析：根据用户生日精确计算日主、格局、阴阳属性，分析五行强弱、喜忌神、用神
- 八字灵魂使命：基于用户的具体日主和格局分析其独特的灵魂核心使命
- 八字核心特质：基于用户的具体日主特性分析其性格特质和能量特征
- 八字能量类型：分析用户的具体五行能量类型和格局特征
- 八字人生路径：基于用户的具体格局分析其人生发展路径和方向

- 星盘深度分析：根据用户生日精确计算太阳星座、月亮星座、上升星座位置，分析各行星的影响
- 星盘性格特征：基于用户的具体星盘配置分析其性格特质、情感模式、行为倾向
- 星盘人生主题：分析用户星盘中的关键主题和人生课题
- 星盘天赋才能：基于星盘配置分析用户的天然优势和才能倾向

- 紫微命盘分析：根据用户生日精确计算命宫主星、十二宫位配置
- 紫微性格分析：基于用户的具体命宫主星分析其性格特质、行为模式、思维特点
- 紫微命运分析：基于用户的具体命盘格局分析命运走向、人生起伏、机遇挑战
- 紫微事业分析：基于用户的事业宫和官禄宫分析职业倾向、领导能力、创业潜质
- 紫微感情分析：基于用户的夫妻宫和感情宫分析恋爱模式、婚姻状况、感情需求

**⚠️⚠️⚠️ 分析优先级（重要！）⚠️⚠️⚠️**

**第一优先级（90%权重）：用户实际对话和行为分析**
- 基于用户的真实对话内容、自我描述、实际行为进行分析
- 这是最可靠的数据来源，必须重点分析

**第二优先级（10%权重）：星座八字辅助参考**
- 星座、八字、紫微等只是辅助参考，不能作为主要依据
- 只有当用户没有提供足够信息时才使用

**重要原则：**
- 优先分析用户实际说的、做的、表达的
- 星座分析只能用于补充说明，不能替代用户实际行为分析
- 每个用户都有其独特的实际表现特征

**⚠️⚠️⚠️ 绝对禁止使用星座术语！⚠️⚠️⚠️**

**禁止的内容（死刑线！）：**
❌ 天机星、紫微、天府、文曲星、福德宫、迁移宫等紫微斗数术语
❌ 水木相生、伤官配印、驿马星等八字术语
❌ 任何星座、命盘相关的术语

**必须使用的内容：**
✅ 基于用户实际对话内容的描述
✅ 基于用户实际行为的描述
✅ 基于用户自我表达的描述

**核心性格特征分析（必须基于用户实际对话和行为，不能用星座术语）：**

**示例对比：**
❌ 错误："天机星化科的知识重构模式"
✅ 正确："高考失利后选择出国留学，展现出通过改变环境应对挫折的能力"

❌ 错误："迁移宫紫微天府形成的阶层跃迁意识"
✅ 正确："在悉尼大学的开放环境中找到新的学习方式，说明具有环境适应能力"

❌ 错误："水木相生格局下的逆境转化力"
✅ 正确："从高考失利的难过到出国后的开心，展现出积极的心态转变能力"

**⚠️⚠️⚠️ 字段分配规则（每个洞察必须放在正确的字段！）⚠️⚠️⚠️**

**根据洞察内容，分配到对应字段：**

1. **corePersonalityTraits**（核心性格特质）
   - 什么时候用：描述用户最核心的性格特征
   - 示例：面对挫折时选择改变环境、在压力下保持积极心态

2. **communicationStyle**（沟通风格）
   - 什么时候用：描述用户如何表达、如何沟通
   - 示例：表达直接、叙述清晰、善于描述情绪

3. **emotionalPattern**（情感模式）
   - 什么时候用：描述用户的情绪反应和情感表达
   - 示例：对失败感到难过但能快速调整、对新环境感到开心

4. **decisionMakingStyle**（决策风格）
   - 什么时候用：描述用户如何做决定
   - 示例：遇到困难选择出国、通过环境改变来解决问题

5. **stressResponse**（压力反应）
   - 什么时候用：描述用户在压力下的行为
   - 示例：高考失利后选择重新开始、通过换环境减压

6. **careerAptitude**（职业天赋）
   - 什么时候用：描述用户在工作/学习中的天赋和倾向
   - 示例：喜欢实验室小组作业说明有团队协作能力

7. **relationshipPattern**（感情模式）
   - 什么时候用：描述用户的恋爱/婚姻模式
   - 示例：深度连接、理性选择、感性投入

8. **lifePhilosophy**（人生哲学）
   - 什么时候用：描述用户的价值观和人生观
   - 示例：追求和谐、重视效率、注重体验

9. **interpersonalStrengths**（人际优势）
   - 什么时候用：描述用户在社交中的优势
   - 示例：和同学一起做项目说明有协作能力

10. **interpersonalChallenges**（人际挑战）
    - 什么时候用：描述用户在社交中的困难
    - 示例：在压抑环境中感到不适

11. **socialEnergyPattern**（社交能量）
    - 什么时候用：描述用户的社交偏好
    - 示例：喜欢小组合作、偏好开放环境

12. **aestheticPreferences**（审美偏好）
    - 什么时候用：描述用户的审美和视觉偏好
    - 示例：喜欢开放自主的环境

13. **lifestyleHobbies**（生活爱好）
    - 什么时候用：描述用户的生活方式和爱好
    - 示例：喜欢做实验、偏好自主学习

14. **activityPreferences**（活动偏好）
    - 什么时候用：描述用户喜欢的活动类型
    - 示例：偏好自主探索式学习、厌恶传统课堂

15. **conversationInsights**（对话洞察）
    - 什么时候用：从对话中发现的重要洞察
    - 示例：从高考失利到出国开心展现出积极心态转变

16. **behaviorPatterns**（行为模式）
    - 什么时候用：描述用户的行为模式和习惯
    - 示例：遇到困难选择改变环境而非正面对抗

17. **styleInsights**（风格洞察）
    - 什么时候用：描述用户的风格和品味
    - 示例：偏好开放自由的空间、重视环境美感

**⚠️⚠️⚠️ 实际分配示例（重要！）⚠️⚠️⚠️**

**用户对话："我高考失利 很难过 后来出国读书了 很开心。在家睡不好，去了补习班很压抑。去悉尼大学做实验室小组作业印象深刻。"**

**应该这样分配：**
- **corePersonalityTraits**: ["面对挫折选择改变环境而非逃避"]
- **communicationStyle**: ["表达直接，善于描述情绪状态"]
- **emotionalPattern**: ["对失败感到难过但能快速调整情绪"]
- **decisionMakingStyle**: ["遇到困难选择通过环境改变来解决问题"]
- **stressResponse**: ["高考失利后选择出国重新开始"]
- **careerAptitude**: ["喜欢实验室小组作业，说明有团队协作能力"]
- **interpersonalStrengths**: ["能够在小组环境中有效协作"]
- **interpersonalChallenges**: ["在压抑环境中感到不适，需要开放自由的空间"]
- **socialEnergyPattern**: ["偏好开放自主的学习环境"]
- **aestheticPreferences**: ["偏好开放自由的空间，不喜欢拥挤压抑的环境"]
- **lifestyleHobbies**: ["喜欢做实验，偏好自主探索式学习"]
- **activityPreferences**: ["偏好实验室小组作业，厌恶传统补习班"]
- **conversationInsights**: ["从高考失利到出国开心展现出积极心态转变能力"]
- **behaviorPatterns**: ["遇到困难倾向于改变环境而非正面对抗"]
- **styleInsights**: ["重视学习环境的开放性和自主性"]

**❌ 不要这样做（把所有洞察都放在少数几个字段）：**
- **behaviorPatterns**: [10条洞察]
- **conversationInsights**: [10条洞察]
- **其他字段**: []

**✅ 应该这样（每个洞察放在最合适的字段）：**
- 每个字段都有相应的洞察
- 根据洞察内容选择最合适的字段
- 不要把不相关的洞察放在同一个字段

**特点和优势：**
13. 天然优势（如：直觉敏锐、创造力强、共情能力强、逻辑思维等）
14. 个人挑战（如：容易情绪化、决策犹豫、过于理性等）
15. 成长潜力（如：领导力发展、情感表达、创造力提升等）

**实用特征：**
16. 幸运色彩（基于性格分析得出的适合颜色）
17. 幸运数字
18. 相配的性格类型（如：理性分析型、感性艺术型等）
19. 时尚风格倾向（如：优雅知性、自然舒适、前卫个性等）

请返回JSON格式：
{
  "zodiacSign": "${zodiacSign}",
  "chineseZodiac": "${chineseZodiac}",
  "baziAnalysis": "基于八字五行的深度分析，包括五行强弱、喜忌神、用神、十神格局分析",
  "astrologicalProfile": "基于星盘的深度分析，包括太阳、月亮、上升星座、金木水火土星的影响",
  "ziweiAnalysis": "基于紫微命盘的深度分析，包括命宫主星、十二宫位、命盘格局分析",
  "ziweiPersonality": ["基于紫微命宫主星的性格特质分析"],
  "ziweiDestiny": ["基于紫微命盘格局的命运走向分析"],
  "ziweiCareer": ["基于紫微事业宫的职业倾向分析"],
  "ziweiRelationship": ["基于紫微夫妻宫的感情模式分析"],
  "baziDayMaster": "基于用户具体生日计算的日主分析",
  "baziPattern": "基于用户具体八字计算的格局分析",
  "baziYinYang": "基于用户具体八字计算的阴阳属性分析",
  "baziSoulMission": "基于用户具体八字分析的独特灵魂使命",
  "baziCoreTraits": ["基于用户具体八字分析的核心特质"],
  "baziEnergyType": "基于用户具体八字分析的能量类型",
  "baziLifePath": "基于用户具体八字分析的人生路径",
  
  **⚠️⚠️⚠️ 以下所有字段必须基于用户实际对话和行为，绝对禁止使用星座术语！⚠️⚠️⚠️**
  
  **错误示例（死刑！）：**
  ❌ "corePersonalityTraits": ["天机星化科的知识重构模式"]
  ❌ "conversationInsights": ["水木相生格局下的逆境转化力"]
  
  **正确示例（必须！）：**
  ✅ "corePersonalityTraits": ["高考失利后选择出国，展现出通过改变环境应对挫折的能力"]
  ✅ "conversationInsights": ["从难过到开心的情绪转变，展现出积极的心态调整能力"]
  
  "corePersonalityTraits": ["基于用户实际对话和行为分析得出的最核心性格特征，如：面对挫折选择改变环境、在压力下保持积极心态"],
  "communicationStyle": ["基于用户实际沟通方式分析的沟通风格特征，如：表达直接、善于描述情绪"],
  "emotionalPattern": ["基于用户实际情绪表达分析的情感模式特征，如：对失败感到难过但能快速调整"],
  "decisionMakingStyle": ["基于用户实际选择行为分析的决策风格特征，如：遇到困难选择出国解决问题"],
  "stressResponse": ["基于用户实际压力反应分析的压力应对特征，如：高考失利后选择重新开始"],
  "careerAptitude": ["基于用户实际工作/学习经历分析的职业天赋倾向，如：喜欢实验室小组作业"],
  "relationshipPattern": ["基于用户实际关系描述分析的恋爱婚姻模式"],
  "lifePhilosophy": ["基于用户实际表达观点分析的人生哲学和价值观"],
  "destinyCharacteristics": ["基于用户实际生活经历分析的生活特征"],
  "interpersonalStrengths": ["基于用户实际社交表现分析的人际关系优势"],
  "interpersonalChallenges": ["基于用户实际社交困扰分析的人际关系挑战"],
  "communicationTendencies": ["基于用户实际沟通方式分析的沟通倾向"],
  "socialEnergyPattern": ["基于用户实际社交偏好分析的社交能量模式"],
  "relationshipPreferences": ["基于用户实际关系描述分析的关系偏好"],
  "interpersonalRole": ["基于用户实际社交角色分析的人际关系角色"],
  "aestheticPreferences": ["基于用户实际审美表达分析的审美偏好"],
  "lifestyleHobbies": ["基于用户实际生活方式分析的生活方式爱好"],
  "socialPreferences": ["基于用户实际社交行为分析的社交偏好"],
  "naturalStrengths": ["基于用户实际表现分析的优势"],
  "personalChallenges": ["基于用户实际困扰分析的挑战"],
  "growthPotential": ["基于用户实际发展轨迹分析的成长潜力"],
  "luckyColors": ["基于五行喜忌的幸运色彩"],
  "luckyNumbers": [基于命理分析的幸运数字],
  "compatiblePersonalityTypes": ["基于八字合婚分析的相配性格类型"],
  "fashionStyleTendencies": ["基于星盘美学分析的时尚风格倾向"],
  "conversationInsights": ["基于用户实际对话内容的洞察，如：从高考失利到出国开心展现出积极心态转变，绝对不能用星座术语"],
  "activityPreferences": ["基于用户实际活动描述的活动偏好，如：喜欢实验室小组作业，绝对不能用星座术语"],
  "styleInsights": ["基于用户实际风格表达的风格洞察，绝对不能用星座术语"]
}`
    
    return prompt
  }

  // 解析分析结果
  private static parseAnalysisResult(analysisResult: string, userInfo: UserInfo): UserMetadata {
    try {
      // 提取JSON内容（处理markdown格式）
      let jsonString = analysisResult.trim()
      
      // 尝试提取```json ... ```中的内容
      const jsonMatch = jsonString.match(/```json\n?([\s\S]*?)\n?```/) || 
                       jsonString.match(/```\n?([\s\S]*?)\n?```/)
      
      if (jsonMatch) {
        jsonString = jsonMatch[1].trim()
        console.log('✅ [METADATA] 从markdown中提取JSON')
      }
      
      // 尝试解析JSON
      const parsed = JSON.parse(jsonString)
      console.log('✅ [METADATA] JSON解析成功:', parsed)
      
        // 验证必要字段
        if (parsed.corePersonalityTraits && Array.isArray(parsed.corePersonalityTraits)) {
          console.log('✅ [METADATA] 包含核心性格特质，字段数:', parsed.corePersonalityTraits.length)
          return {
            // 基础元数据（基于生日分析，不可变）
            zodiacSign: parsed.zodiacSign || '',
            chineseZodiac: parsed.chineseZodiac || '',
            baziAnalysis: parsed.baziAnalysis || '',
            astrologicalProfile: parsed.astrologicalProfile || '',
            ziweiAnalysis: parsed.ziweiAnalysis || '',
            ziweiPersonality: Array.isArray(parsed.ziweiPersonality) ? parsed.ziweiPersonality : [],
            ziweiDestiny: Array.isArray(parsed.ziweiDestiny) ? parsed.ziweiDestiny : [],
            ziweiCareer: Array.isArray(parsed.ziweiCareer) ? parsed.ziweiCareer : [],
            ziweiRelationship: Array.isArray(parsed.ziweiRelationship) ? parsed.ziweiRelationship : [],
            
            // 深度八字分析
            baziDayMaster: parsed.baziDayMaster || '',
            baziPattern: parsed.baziPattern || '',
            baziYinYang: parsed.baziYinYang || '',
            baziSoulMission: parsed.baziSoulMission || '',
            baziCoreTraits: Array.isArray(parsed.baziCoreTraits) ? parsed.baziCoreTraits : [],
            baziEnergyType: parsed.baziEnergyType || '',
            baziLifePath: parsed.baziLifePath || '',
            
            // 核心性格特征（累积式存储）
            corePersonalityTraits: Array.isArray(parsed.corePersonalityTraits) ? parsed.corePersonalityTraits : [],
            communicationStyle: Array.isArray(parsed.communicationStyle) ? parsed.communicationStyle : [parsed.communicationStyle || ''].filter(Boolean),
            emotionalPattern: Array.isArray(parsed.emotionalPattern) ? parsed.emotionalPattern : [parsed.emotionalPattern || ''].filter(Boolean),
            decisionMakingStyle: Array.isArray(parsed.decisionMakingStyle) ? parsed.decisionMakingStyle : [parsed.decisionMakingStyle || ''].filter(Boolean),
            stressResponse: Array.isArray(parsed.stressResponse) ? parsed.stressResponse : [parsed.stressResponse || ''].filter(Boolean),
            
            // 命运和人生倾向（累积式存储）
            careerAptitude: Array.isArray(parsed.careerAptitude) ? parsed.careerAptitude : [parsed.careerAptitude || ''].filter(Boolean),
            relationshipPattern: Array.isArray(parsed.relationshipPattern) ? parsed.relationshipPattern : [parsed.relationshipPattern || ''].filter(Boolean),
            lifePhilosophy: Array.isArray(parsed.lifePhilosophy) ? parsed.lifePhilosophy : [parsed.lifePhilosophy || ''].filter(Boolean),
            destinyCharacteristics: Array.isArray(parsed.destinyCharacteristics) ? parsed.destinyCharacteristics : [],

      // 人际关系特征
      interpersonalStrengths: Array.isArray(parsed.interpersonalStrengths) ? parsed.interpersonalStrengths : [],
      interpersonalChallenges: Array.isArray(parsed.interpersonalChallenges) ? parsed.interpersonalChallenges : [],
      communicationTendencies: Array.isArray(parsed.communicationTendencies) ? parsed.communicationTendencies : [],
      socialEnergyPattern: Array.isArray(parsed.socialEnergyPattern) ? parsed.socialEnergyPattern : [],
      relationshipPreferences: Array.isArray(parsed.relationshipPreferences) ? parsed.relationshipPreferences : [],
      interpersonalRole: Array.isArray(parsed.interpersonalRole) ? parsed.interpersonalRole : [],
            
            // 爱好和兴趣特征（累积式存储）
            aestheticPreferences: Array.isArray(parsed.aestheticPreferences) ? parsed.aestheticPreferences : [],
            lifestyleHobbies: Array.isArray(parsed.lifestyleHobbies) ? parsed.lifestyleHobbies : [],
            socialPreferences: Array.isArray(parsed.socialPreferences) ? parsed.socialPreferences : [],
            
            // 特点和优势（累积式存储）
            naturalStrengths: Array.isArray(parsed.naturalStrengths) ? parsed.naturalStrengths : [],
            personalChallenges: Array.isArray(parsed.personalChallenges) ? parsed.personalChallenges : [],
            growthPotential: Array.isArray(parsed.growthPotential) ? parsed.growthPotential : [],
            
            // 实用特征（累积式存储）
            luckyColors: Array.isArray(parsed.luckyColors) ? parsed.luckyColors : [],
            luckyNumbers: Array.isArray(parsed.luckyNumbers) ? parsed.luckyNumbers : [],
            compatiblePersonalityTypes: Array.isArray(parsed.compatiblePersonalityTypes) ? parsed.compatiblePersonalityTypes : [],
            fashionStyleTendencies: Array.isArray(parsed.fashionStyleTendencies) ? parsed.fashionStyleTendencies : [],
            
            // 对话历史分析（累积式存储）
            conversationInsights: Array.isArray(parsed.conversationInsights) ? parsed.conversationInsights : [],
            activityPreferences: Array.isArray(parsed.activityPreferences) ? parsed.activityPreferences : [],
            styleInsights: Array.isArray(parsed.styleInsights) ? parsed.styleInsights : [],
            
            lastAnalyzed: new Date().toISOString(),
            analysisHistory: [`分析时间: ${new Date().toISOString()}, 分析内容: 基础元数据分析`]
          }
      } else {
        console.error('❌ [METADATA] 解析结果缺少必要字段corePersonalityTraits')
        console.error('❌ [METADATA] 实际解析内容:', parsed)
        throw new Error('解析结果缺少必要字段')
      }
    } catch (error) {
      console.error('❌ [METADATA] 解析分析结果失败:', error)
      console.error('❌ [METADATA] 原始响应:', analysisResult.substring(0, 500))
      return this.generateDefaultMetadata(userInfo)
    }
  }

  // 生成默认元数据（当分析失败时使用）
  private static generateDefaultMetadata(userInfo: UserInfo): UserMetadata {
    const age = userInfo.age || 0
    const gender = userInfo.gender === 'male' ? '男性' : '女性'
    
    // 基于基本信息的简单分析
    const zodiacSign = this.getZodiacSign(userInfo.birthDate.month, userInfo.birthDate.day)
    const chineseZodiac = this.getChineseZodiac(userInfo.birthDate.year)
    
    // 检查是否包含MBTI信息
    const mbtiMatch = userInfo.personality.match(/\b(ENTP|INFJ|INTJ|ENTJ|ENFP|INFP|ENFJ|INFJ|ISTJ|ESTJ|ISFJ|ESFJ|ISTP|ESTP|ISFP|ESFP)\b/i)
    const hasMBTI = mbtiMatch !== null
    const mbtiType = mbtiMatch ? mbtiMatch[1] : ''
    
    // 检查是否包含性格变化信息
    const personalityEvolutionMatch = userInfo.personality.match(/(从|以前是|曾经是|本来是)\s*(ENTP|INFJ|INTJ|ENTJ|ENFP|INFP|ENFJ|INFJ|ISTJ|ESTJ|ISFJ|ESFJ|ISTP|ESTP|ISFP|ESFP)\s*(到|现在是|后来变成|后来是)\s*(ENTP|INFJ|INTJ|ENTJ|ENFP|INFP|ENFJ|INFJ|ISTJ|ESTJ|ISFJ|ESFJ|ISTP|ESTP|ISFP|ESFP)/i)
    const hasPersonalityEvolution = personalityEvolutionMatch !== null
    const previousMBTI = personalityEvolutionMatch ? personalityEvolutionMatch[2] : ''
    const currentMBTI = personalityEvolutionMatch ? personalityEvolutionMatch[4] : mbtiType
    
    // 如果有MBTI信息，生成基于MBTI的具体分析
    const generateMBTIBasedAnalysis = () => {
      if (!hasMBTI && !hasPersonalityEvolution) return null
      
      const currentType = currentMBTI || mbtiType
      const isEvolution = hasPersonalityEvolution
      
      // 基于MBTI类型生成具体分析
      const mbtiAnalysis = {
        // 核心性格特征
        corePersonalityTraits: [] as string[],
        communicationStyle: [] as string[],
        emotionalPattern: [] as string[],
        decisionMakingStyle: [] as string[],
        stressResponse: [] as string[],
        // 职业和关系
        careerAptitude: [] as string[],
        relationshipPattern: [] as string[],
        lifePhilosophy: [] as string[],
        // 其他特征
        naturalStrengths: [] as string[],
        personalChallenges: [] as string[],
        fashionStyleTendencies: [] as string[]
      }
      
      // 根据MBTI类型生成分析
      switch (currentType.toUpperCase()) {
        case 'INFJ':
          mbtiAnalysis.corePersonalityTraits = ['理想主义', '洞察力强', '追求深度', '直觉导向', '温和包容']
          mbtiAnalysis.communicationStyle = ['深度倾听', '智慧引导', '温和表达', '注重理解', '直觉沟通']
          mbtiAnalysis.emotionalPattern = ['情感丰富', '内敛深沉', '共情能力强', '情感细腻', '寻求意义']
          mbtiAnalysis.decisionMakingStyle = ['价值观导向', '直觉优先', '考虑长远', '追求和谐', '理想化选择']
          mbtiAnalysis.careerAptitude = ['心理咨询', '教育指导', '创意写作', '人文研究', '艺术创作']
          mbtiAnalysis.relationshipPattern = ['深度连接', '精神共鸣', '忠诚专一', '理解包容', '理想化期待']
          mbtiAnalysis.lifePhilosophy = ['追求意义', '重视和谐', '注重成长', '理想主义', '精神追求']
          mbtiAnalysis.naturalStrengths = ['直觉敏锐', '洞察力强', '共情能力', '创造力', '智慧引导']
          mbtiAnalysis.personalChallenges = ['过于理想化', '容易内耗', '完美主义', '情感敏感', '社交疲劳']
          mbtiAnalysis.fashionStyleTendencies = ['简约优雅', '文艺风格', '品质生活', '低调内涵']
          break
        case 'ENTP':
          mbtiAnalysis.corePersonalityTraits = ['创新思维', '辩论天赋', '外向直觉', '灵活适应', '挑战传统']
          mbtiAnalysis.communicationStyle = ['辩论型沟通', '逻辑清晰', '思维跳跃', '善于说服', '活跃表达']
          mbtiAnalysis.emotionalPattern = ['理性主导', '外向热情', '情绪稳定', '乐观积极', '社交活跃']
          mbtiAnalysis.decisionMakingStyle = ['创新导向', '机会主义', '灵活应变', '挑战权威', '快速决策']
          mbtiAnalysis.careerAptitude = ['创业创新', '市场营销', '科技产品', '投资理财', '商业策划']
          mbtiAnalysis.relationshipPattern = ['理性选择', '独立自主', '社交广泛', '灵活适应', '挑战传统']
          mbtiAnalysis.lifePhilosophy = ['追求创新', '重视效率', '挑战权威', '机会主义', '理性思考']
          mbtiAnalysis.naturalStrengths = ['创新思维', '辩论天赋', '适应能力强', '领导力', '商业嗅觉']
          mbtiAnalysis.personalChallenges = ['缺乏耐心', '容易分心', '过于理性', '社交压力', '执行困难']
          mbtiAnalysis.fashionStyleTendencies = ['前卫个性', '潮流时尚', '陈冠希风格', '夜店混搭']
          break
      }
      
      // 如果有性格演化，添加演化分析
      if (isEvolution && previousMBTI && currentMBTI) {
        mbtiAnalysis.corePersonalityTraits.push(`从${previousMBTI}演化到${currentMBTI}`)
        mbtiAnalysis.lifePhilosophy.push('经历重大人生变化', '性格深度演化', '创业经历影响')
        mbtiAnalysis.personalChallenges.push('性格变化适应', '身份认同重塑', '社交模式调整')
      }
      
      return mbtiAnalysis
    }
    
    const mbtiAnalysis = generateMBTIBasedAnalysis()
    
    // 如果有MBTI分析，使用具体分析结果；否则使用默认值
    const defaultValues = {
      communicationStyle: mbtiAnalysis?.communicationStyle || ['待分析'],
      emotionalPattern: mbtiAnalysis?.emotionalPattern || ['待分析'],
      decisionMakingStyle: mbtiAnalysis?.decisionMakingStyle || ['待分析'],
      stressResponse: mbtiAnalysis?.stressResponse || ['待分析'],
      careerAptitude: mbtiAnalysis?.careerAptitude || ['待分析'],
      relationshipPattern: mbtiAnalysis?.relationshipPattern || ['待分析'],
      lifePhilosophy: mbtiAnalysis?.lifePhilosophy || ['待分析'],
      naturalStrengths: mbtiAnalysis?.naturalStrengths || ['独立思考'],
      personalChallenges: mbtiAnalysis?.personalChallenges || ['社交技能'],
      fashionStyleTendencies: mbtiAnalysis?.fashionStyleTendencies || ['简约'],
      corePersonalityTraits: mbtiAnalysis?.corePersonalityTraits || [userInfo.personality]
    }
    
    return {
      // 基础元数据（基于生日分析，不可变）
      zodiacSign: zodiacSign,
      chineseZodiac: chineseZodiac,
      baziAnalysis: hasMBTI ? '基于MBTI的深度分析' : '待深度分析',
      astrologicalProfile: hasMBTI ? '基于MBTI的星盘分析' : '待深度分析',
      ziweiAnalysis: hasMBTI ? '基于MBTI的紫微分析' : '待深度分析',
      ziweiPersonality: mbtiAnalysis?.corePersonalityTraits || [],
      ziweiDestiny: mbtiAnalysis?.lifePhilosophy || [],
      ziweiCareer: mbtiAnalysis?.careerAptitude || [],
      ziweiRelationship: mbtiAnalysis?.relationshipPattern || [],
      
      // 深度八字分析
      baziDayMaster: hasMBTI ? '基于MBTI分析' : '待分析',
      baziPattern: hasMBTI ? '基于MBTI格局' : '待分析',
      baziYinYang: hasMBTI ? '基于MBTI阴阳' : '待分析',
      baziSoulMission: hasMBTI ? '基于MBTI灵魂使命' : '待分析',
      baziCoreTraits: mbtiAnalysis?.corePersonalityTraits || [],
      baziEnergyType: hasMBTI ? '基于MBTI能量类型' : '待分析',
      baziLifePath: hasMBTI ? '基于MBTI人生路径' : '待分析',
      
      // 核心性格特征（累积式存储）
      corePersonalityTraits: defaultValues.corePersonalityTraits,
      communicationStyle: defaultValues.communicationStyle,
      emotionalPattern: defaultValues.emotionalPattern,
      decisionMakingStyle: defaultValues.decisionMakingStyle,
      stressResponse: defaultValues.stressResponse,
      
      // 命运和人生倾向（累积式存储）
      careerAptitude: defaultValues.careerAptitude,
      relationshipPattern: defaultValues.relationshipPattern,
      lifePhilosophy: defaultValues.lifePhilosophy,
      destinyCharacteristics: mbtiAnalysis ? ['性格演化影响命运', '创业经历塑造人生'] : [],

      // 人际关系特征
      interpersonalStrengths: mbtiAnalysis?.naturalStrengths || [],
      interpersonalChallenges: mbtiAnalysis?.personalChallenges || [],
      communicationTendencies: mbtiAnalysis?.communicationStyle || [],
      socialEnergyPattern: hasMBTI ? ['基于MBTI社交模式'] : [],
      relationshipPreferences: mbtiAnalysis?.relationshipPattern || [],
      interpersonalRole: hasMBTI ? ['基于MBTI人际关系角色'] : [],
      
      // 爱好和兴趣特征（累积式存储）
      aestheticPreferences: [],
      lifestyleHobbies: ['品质生活'],
      socialPreferences: [],
      
      // 特点和优势（累积式存储）
      naturalStrengths: defaultValues.naturalStrengths,
      personalChallenges: defaultValues.personalChallenges,
      growthPotential: ['个人发展'],
      
      // 实用特征（累积式存储）
      luckyColors: [],
      luckyNumbers: [],
      compatiblePersonalityTypes: [],
      fashionStyleTendencies: defaultValues.fashionStyleTendencies,
      
      // 对话历史分析（累积式存储）
      conversationInsights: [],
      activityPreferences: [],
      styleInsights: [],
      
      lastAnalyzed: new Date().toISOString(),
      analysisHistory: [`分析时间: ${new Date().toISOString()}, 分析内容: ${hasMBTI ? '基于MBTI的深度分析' : '默认元数据生成'}`]
    }
  }

  // 获取星座
  private static getZodiacSign(month: string, day: string): string {
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
  private static getChineseZodiac(year: string): string {
    const yearNum = parseInt(year)
    const zodiacs = ['猴', '鸡', '狗', '猪', '鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊']
    return zodiacs[yearNum % 12]
  }

  // 基于用户回答进行累积式元数据分析
  static async analyzeUserAnswers(userAnswers: string[]): Promise<Partial<UserMetadata>> {
    try {
      const { getUserInfo } = await import('./userInfoService')
      const { getUserMetadata } = await import('./userInfoService')
      
      const userInfo = getUserInfo()
      const existingMetadata = getUserMetadata()
      
      if (!userInfo.birthDate.year) {
        throw new Error('用户信息不完整，无法进行分析')
      }
      
      const prompt = this.buildAnalysisPrompt(userInfo, existingMetadata, userAnswers)
      
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY || 'sk-e3911ff08dae4f4fb59c7b521e2a5415'}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的用户行为分析专家，擅长基于用户回答分析其性格特征、审美偏好和生活方式。请返回JSON格式的分析结果。'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      })
      
      if (!response.ok) {
        throw new Error(`DeepSeek API调用失败: ${response.status}`)
      }
      
      const data = await response.json()
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const analysisResult = data.choices[0].message.content.trim()
        return this.parseAnalysisResult(analysisResult, userInfo)
      } else {
        throw new Error('DeepSeek API返回格式错误')
      }
    } catch (error) {
      console.error('分析用户回答失败:', error)
      return {}
    }
  }
}
