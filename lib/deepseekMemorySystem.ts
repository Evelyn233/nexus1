/**
 * DeepSeek智能记忆系统
 * 
 * 功能：
 * 1. 对话分析：每次对话后自动总结关键信息
 * 2. 智能召回：新对话时从历史中找相关内容
 * 3. 画像演化：持续更新用户元数据
 * 4. 情境理解：理解用户的长期偏好
 */

interface ConversationMemory {
  sessionId: string
  timestamp: string
  userInput: string
  aiResponse: string
  keyInsights: string[]  // 关键洞察
  topics: string[]       // 对话主题
  emotions: string[]     // 情绪状态
  preferences: string[]  // 偏好发现
  locations: string[]    // 提到的具体地点（新增）
}

interface MemoryRecallResult {
  relevantMemories: ConversationMemory[]
  contextSummary: string  // 相关历史总结
  suggestedTopics: string[]  // 建议讨论的话题
  userMoodTrend: string   // 用户情绪趋势
}

interface UserProfileEvolution {
  timestamp: string
  changedFields: string[]
  insights: string[]
  confidence: number  // 0-1, 洞察的置信度
}

/**
 * DeepSeek智能记忆服务
 */
export class DeepSeekMemorySystem {
  
  /**
   * 1. 对话后分析：自动总结关键信息
   */
  static async analyzeConversation(
    userInput: string,
    aiResponse: string,
    sessionId: string,
    fullConversationHistory: Array<{role: string, content: string}>
  ): Promise<ConversationMemory> {
    console.log('🧠 [MEMORY] 开始分析对话...')
    
    const analysisPrompt = `你是一个专业的对话分析专家。请深度分析这次对话，提取关键信息。

**对话内容：**
用户输入: "${userInput}"
AI回复: "${aiResponse}"

**完整对话历史（最近5轮）：**
${fullConversationHistory.slice(-10).map(msg => `${msg.role}: ${msg.content}`).join('\n')}

**分析要求：**
1. 提取关键洞察（用户的真实想法、需求、困扰）
2. 识别对话主题（工作、生活、情感、爱好等）
3. 分析情绪状态（快乐、疲惫、焦虑、兴奋等）
4. 发现用户偏好（喜欢什么、不喜欢什么、习惯等）

**输出JSON格式：**
{
  "keyInsights": ["洞察1", "洞察2", ...],
  "topics": ["主题1", "主题2", ...],
  "emotions": ["情绪1", "情绪2", ...],
  "preferences": ["偏好1", "偏好2", ...],
  "locations": ["提到的具体地点1（如：武康路咖啡、复兴公园、张江科技园）", "地点2", ...]
}

**特别注意**：如果用户提到具体地点，一定要记录到locations数组！

只返回JSON，不要其他解释。`

    try {
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
              content: '你是对话分析专家，擅长从对话中提取深层洞察和用户特征。'
            },
            {
              role: 'user',
              content: analysisPrompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        throw new Error(`DeepSeek API错误: ${response.status}`)
      }

      const data = await response.json()
      const content = data.choices[0].message.content.trim()
      
      // 提取JSON
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                       content.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content
      const analysis = JSON.parse(jsonString)

      const memory: ConversationMemory = {
        sessionId,
        timestamp: new Date().toISOString(),
        userInput,
        aiResponse,
        keyInsights: analysis.keyInsights || [],
        topics: analysis.topics || [],
        emotions: analysis.emotions || [],
        preferences: analysis.preferences || [],
        locations: analysis.locations || []  // 新增：记录地点
      }

      console.log('✅ [MEMORY] 对话分析完成:', memory)
      
      // 保存到Prisma
      await this.saveMemoryToPrisma(memory)
      
      return memory
    } catch (error) {
      console.error('❌ [MEMORY] 对话分析失败:', error)
      
      // 返回基础记忆
      return {
        sessionId,
        timestamp: new Date().toISOString(),
        userInput,
        aiResponse,
        keyInsights: [`用户说: ${userInput.substring(0, 50)}`],
        topics: ['未分类'],
        emotions: ['中性'],
        preferences: [],
        locations: []  // 新增
      }
    }
  }

  /**
   * 2. 智能召回：根据新对话找相关历史
   */
  static async recallRelevantMemories(
    currentInput: string,
    userId: string
  ): Promise<MemoryRecallResult> {
    console.log('🔍 [MEMORY] 智能召回相关记忆...')
    
    try {
      // 从Prisma获取历史对话
      const response = await fetch('/api/chat-sessions')
      if (!response.ok) throw new Error('获取历史失败')
      
      const { sessions } = await response.json()
      
      if (!sessions || sessions.length === 0) {
        console.log('ℹ️ [MEMORY] 没有历史记录')
        return {
          relevantMemories: [],
          contextSummary: '这是第一次对话',
          suggestedTopics: ['分享你的兴趣', '谈谈近况'],
          userMoodTrend: '未知'
        }
      }

      // 调用DeepSeek找相关对话
      const recallPrompt = `你是智能记忆召回系统。用户现在说："${currentInput}"

**历史对话（最近10次）：**
${sessions.slice(0, 10).map((s: any, i: number) => `
${i + 1}. [${new Date(s.createdAt).toLocaleDateString()}]
   初始输入: ${s.initialPrompt}
   关键答案: ${s.answers?.slice(0, 2).join(' | ') || '无'}
`).join('\n')}

**任务：**
1. 找出与当前输入最相关的3个历史对话
2. 总结相关历史的核心内容
3. 建议可以继续讨论的话题
4. 分析用户的情绪趋势（根据历史对话）

**输出JSON格式：**
{
  "relevantSessionIds": ["相关会话1的索引", "相关会话2的索引", ...],
  "contextSummary": "相关历史总结（50字以内）",
  "suggestedTopics": ["建议话题1", "建议话题2", ...],
  "userMoodTrend": "情绪趋势分析（积极/平稳/疲惫/焦虑等）"
}

只返回JSON。`

      const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
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
              content: '你是智能记忆召回系统，擅长从历史对话中找到与当前话题相关的内容。'
            },
            {
              role: 'user',
              content: recallPrompt
            }
          ],
          max_tokens: 800,
          temperature: 0.5
        })
      })

      if (!deepseekResponse.ok) {
        throw new Error('DeepSeek召回失败')
      }

      const data = await deepseekResponse.json()
      const content = data.choices[0].message.content.trim()
      
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                       content.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content
      const recall = JSON.parse(jsonString)

      console.log('✅ [MEMORY] 召回完成:', recall)

      return {
        relevantMemories: [],  // 简化版，暂不返回完整记忆
        contextSummary: recall.contextSummary || '正在分析历史...',
        suggestedTopics: recall.suggestedTopics || [],
        userMoodTrend: recall.userMoodTrend || '平稳'
      }
    } catch (error) {
      console.error('❌ [MEMORY] 智能召回失败:', error)
      return {
        relevantMemories: [],
        contextSummary: '历史记忆加载中...',
        suggestedTopics: [],
        userMoodTrend: '未知'
      }
    }
  }

  /**
   * 3. 画像演化：持续更新用户元数据
   */
  static async evolveUserProfile(
    memory: ConversationMemory,
    userId: string
  ): Promise<UserProfileEvolution> {
    console.log('🔄 [MEMORY] 更新用户画像...')
    
    try {
      // 获取当前用户元数据
      const response = await fetch('/api/user/metadata')
      if (!response.ok) throw new Error('获取元数据失败')
      
      const { metadata } = await response.json()
      
      // 调用DeepSeek分析如何更新画像
      const evolutionPrompt = `你是用户画像演化系统。根据这次对话，分析如何更新用户画像。

**当前对话洞察：**
- 关键发现: ${memory.keyInsights.join('、')}
- 讨论主题: ${memory.topics.join('、')}
- 情绪状态: ${memory.emotions.join('、')}
- 偏好发现: ${memory.preferences.join('、')}

**现有用户画像（部分）：**
- 核心特质: ${metadata?.coreTraits ? JSON.parse(metadata.coreTraits).slice(0, 3).join('、') : '未知'}
- 兴趣爱好: ${metadata?.lifestyleHobbies ? JSON.parse(metadata.lifestyleHobbies).slice(0, 3).join('、') : '未知'}

**任务：**
1. 基于这次对话，找出需要新增或更新的用户特征
2. 评估这些洞察的可信度（0-1）
3. 建议更新哪些字段

**输出JSON格式：**
{
  "newInsights": ["新发现的特质1", "新发现的特质2", ...],
  "fieldsToUpdate": {
    "lifestyleHobbies": ["爱好1", "爱好2"],
    "emotionalPattern": ["情感特征1", "情感特征2"],
    "conversationInsights": ["对话洞察1", "对话洞察2"],
    "frequentLocations": ["用户提到的具体地点1（如：武康路咖啡）", "地点2", ...],
    "favoriteVenues": ["喜欢的场所类型（如：精品咖啡厅、公园、创意园区）", ...]
  },
  "confidence": 0.8,
  "reasoning": "更新原因简述"
}

**重要**：如果对话中提到了具体地点，一定要记录到frequentLocations！

只返回JSON。`

      const deepseekResponse = await fetch('https://api.deepseek.com/chat/completions', {
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
              content: '你是用户画像演化专家，擅长从对话中提取长期特征。'
            },
            {
              role: 'user',
              content: evolutionPrompt
            }
          ],
          max_tokens: 1000,
          temperature: 0.6
        })
      })

      if (!deepseekResponse.ok) {
        throw new Error('画像演化分析失败')
      }

      const data = await deepseekResponse.json()
      const content = data.choices[0].message.content.trim()
      
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || 
                       content.match(/\{[\s\S]*\}/)
      const jsonString = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content
      const evolution = JSON.parse(jsonString)

      console.log('✅ [MEMORY] 画像演化分析完成:', evolution)

      // 如果置信度足够高，更新元数据
      if (evolution.confidence > 0.4 && evolution.fieldsToUpdate) {
        console.log('🔄 [MEMORY] 置信度足够（' + evolution.confidence + '），开始更新元数据到Prisma...')
        const updateResponse = await fetch('/api/user/metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            updates: evolution.fieldsToUpdate,
            source: 'conversation_evolution',
            reasoning: evolution.reasoning || '基于对话的画像演化'
          })
        })
        
        if (updateResponse.ok) {
          const result = await updateResponse.json()
          console.log('✅ [MEMORY] 用户画像已更新到Prisma，更新字段:', Object.keys(evolution.fieldsToUpdate).join(', '))
          console.log('📊 [MEMORY] 更新次数:', result.updateCount)
        } else {
          console.error('❌ [MEMORY] 更新Prisma失败:', updateResponse.status)
        }
      } else {
        console.log('ℹ️ [MEMORY] 置信度不足（' + (evolution.confidence || 0) + '），跳过更新')
      }

      return {
        timestamp: new Date().toISOString(),
        changedFields: Object.keys(evolution.fieldsToUpdate || {}),
        insights: evolution.newInsights || [],
        confidence: evolution.confidence || 0.5
      }
    } catch (error) {
      console.error('❌ [MEMORY] 画像演化失败:', error)
      return {
        timestamp: new Date().toISOString(),
        changedFields: [],
        insights: [],
        confidence: 0
      }
    }
  }

  /**
   * 4. 一键启动：完整的智能记忆流程
   */
  static async processConversation(
    userInput: string,
    aiResponse: string,
    sessionId: string,
    userId: string,
    fullConversationHistory: Array<{role: string, content: string}>
  ): Promise<{
    memory: ConversationMemory
    evolution: UserProfileEvolution
  }> {
    console.log('🚀 [MEMORY] 启动完整智能记忆流程...')
    
    try {
      // 1. 分析对话
      const memory = await this.analyzeConversation(
        userInput,
        aiResponse,
        sessionId,
        fullConversationHistory
      )

      // 2. 演化用户画像
      const evolution = await this.evolveUserProfile(memory, userId)

      console.log('🎉 [MEMORY] 智能记忆流程完成')
      
      return { memory, evolution }
    } catch (error) {
      console.error('❌ [MEMORY] 智能记忆流程失败:', error)
      throw error
    }
  }

  /**
   * 辅助：保存记忆到Prisma
   */
  private static async saveMemoryToPrisma(memory: ConversationMemory): Promise<void> {
    try {
      // 获取当前会话数据
      const response = await fetch(`/api/chat-sessions?sessionId=${memory.sessionId}`)
      if (!response.ok) return
      
      const { sessions } = await response.json()
      const currentSession = sessions.find((s: any) => s.sessionId === memory.sessionId)
      
      if (!currentSession) return

      // 更新会话，添加记忆分析
      const updatedData = {
        ...currentSession.data,
        memoryAnalysis: memory
      }

      await fetch('/api/chat-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: memory.sessionId,
          data: updatedData
        })
      })

      console.log('✅ [MEMORY] 记忆已保存到Prisma')
    } catch (error) {
      console.error('⚠️ [MEMORY] 保存到Prisma失败（不影响功能）:', error)
    }
  }
}

/**
 * 导出便捷函数
 */

// 对话后自动分析
export async function analyzeAfterConversation(
  userInput: string,
  aiResponse: string,
  sessionId: string,
  conversationHistory: Array<{role: string, content: string}>
) {
  return DeepSeekMemorySystem.analyzeConversation(
    userInput,
    aiResponse,
    sessionId,
    conversationHistory
  )
}

// 新对话前智能召回
export async function recallBeforeConversation(
  currentInput: string,
  userId: string
) {
  return DeepSeekMemorySystem.recallRelevantMemories(currentInput, userId)
}

// 画像持续演化
export async function evolveProfile(
  memory: ConversationMemory,
  userId: string
) {
  return DeepSeekMemorySystem.evolveUserProfile(memory, userId)
}

// 一键处理
export async function processConversationMemory(
  userInput: string,
  aiResponse: string,
  sessionId: string,
  userId: string,
  conversationHistory: Array<{role: string, content: string}>
) {
  return DeepSeekMemorySystem.processConversation(
    userInput,
    aiResponse,
    sessionId,
    userId,
    conversationHistory
  )
}

