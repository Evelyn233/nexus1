import { API_CONFIG } from './config'
import { getUserDescription, getUserInfo, getUserMetadata } from './userDataApi'
import { buildPrioritizedUserDescription } from './userRawInputService'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface DoubaoResponse {
  success: boolean
  content?: string
  error?: string
}

export interface DeepQuestionResponse {
  success: boolean
  questions?: string[]
  enhancedPrompt?: string
  userProfile?: string
  error?: string
  isFallback?: boolean // 标记是否是备用问题
}

export interface UserContextAnalysis {
  occasion: string
  profession: string
  personalStyle: string
  specialNeeds: string
  hasCompanion: boolean
  companionType: string
}

// 豆包语言模型对话
export async function chatWithDoubao(messages: ChatMessage[]): Promise<DoubaoResponse> {
  // 使用内部API端点（/api/ai/chat），避免DeepSeek余额限制
  console.log('🚀 使用内部AI API处理请求...')

  try {
    console.log('🚀 调用内部AI API...', {
      endpoint: '/api/ai/chat',
      messages: messages
    });

    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: messages,
        temperature: 0.7,
        max_tokens: 2000
      })
    })

    console.log('📡 DeepSeek API响应状态:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ DeepSeek API请求失败:', response.status, errorText);
      
      // 如果API失败，使用本地模拟
      console.log('🔄 切换到本地模拟API...');
      return await fallbackToLocalAPI(messages);
    }

    const data = await response.json();
    console.log('✅ DeepSeek API响应成功:', data);
    
    return {
      success: true,
      content: data.choices?.[0]?.message?.content || '没有收到回复'
    }
  } catch (error) {
    console.error('DeepSeek API错误:', error)
    console.log('🔄 切换到本地模拟API...');
    return await fallbackToLocalAPI(messages);
  }
}

// 本地模拟API作为备用方案（当DeepSeek余额不足时）
async function fallbackToLocalAPI(messages: ChatMessage[]): Promise<DoubaoResponse> {
  console.warn('⚠️ [FALLBACK] DeepSeek API不可用，使用本地备用逻辑')
  
  // 分析请求类型
  const lastUserMessage = messages.find(m => m.role === 'user')?.content || ''
  const isQuestionGeneration = lastUserMessage.includes('生成问题') || 
                                lastUserMessage.includes('深度问题') ||
                                messages.some(m => m.content.includes('场景细节挖掘'))
  
  if (isQuestionGeneration) {
    console.log('🎯 [FALLBACK] 检测到问题生成请求')
    
    // ⚠️ 检查问题数量，如果已经问了3个以上，停止提问
    const answersCount = (lastUserMessage.match(/回答\d+:/g) || []).length
    
    if (answersCount >= 3) {
      console.log(`⚠️ [FALLBACK] 已经问了${answersCount}个问题，停止提问`)
      return {
        success: true,
        content: JSON.stringify({ questions: [] })  // 返回空数组，停止提问
      }
    }
    
    // 返回JSON格式的备用问题
    const fallbackQuestions = {
      questions: [
        "能再详细说说当时的情况吗？",
        "当时您的感受是什么？"
      ]
    }
    
    console.log('🎯 [FALLBACK] 返回备用问题:', fallbackQuestions.questions)
    return {
      success: true,
      content: JSON.stringify(fallbackQuestions)
    }
  }
  
  // 对于其他类型的请求，返回简单回复
  return {
    success: true,
    content: JSON.stringify({
      message: "收到您的信息，正在处理中..."
    })
  }
}

// 使用LLM动态生成备用问题的函数
async function generateDynamicFallbackQuestions(userInput: string): Promise<string[]> {
  console.log('🤖 [DOUBAO-SERVICE] 使用LLM生成动态备用问题...')
  
  try {
    const userInfoDescription = await getUserDescription()
    const userInfo = await getUserInfo()
    const userMetadata = await getUserMetadata()
    
    // 构建基于用户分析数据的个性化提示词
    const userAnalysisPrompt = userMetadata && userMetadata.corePersonalityTraits ? `
用户深度分析档案：
- 核心性格特质：${userMetadata.corePersonalityTraits.join('、')}
- 沟通风格特征：${userMetadata.communicationStyle?.join('、') || ''}
- 情感模式特征：${userMetadata.emotionalPattern?.join('、') || ''}
- 决策风格特征：${userMetadata.decisionMakingStyle?.join('、') || ''}
- 职业天赋倾向：${userMetadata.careerAptitude?.join('、') || ''}
- 感情关系模式：${userMetadata.relationshipPattern?.join('、') || ''}
- 人生哲学：${userMetadata.lifePhilosophy?.join('、') || ''}
- 天然优势：${userMetadata.naturalStrengths?.join('、') || ''}
- 个人挑战：${userMetadata.personalChallenges?.join('、') || ''}
- 时尚风格倾向：${userMetadata.fashionStyleTendencies?.join('、') || ''}
- 生活方式爱好：${userMetadata.lifestyleHobbies?.join('、') || ''}
- 星座：${userMetadata.zodiacSign || ''}
- 生肖：${userMetadata.chineseZodiac || ''}
` : ''
    
    const context = `你是一个专业的AI助手，擅长分析用户意图并生成个性化问题。

**用户原始输入（最重要）：** ${userInput}

${userAnalysisPrompt}

用户基本信息：${userInfoDescription || ''}

**分析任务：**
1. **优先分析用户原始输入**：用户直接提供的信息是最重要的，必须重点关注
2. 基于用户的原始输入和性格特征，推测用户的真实意图和需求
3. 生成3个具体的、有针对性的深度问题

**重要原则：**
- **用户原始输入优先**：用户直接提到的内容是最重要的
- **具体化问题**：问题要具体明确，不要问"营造什么氛围"这种模糊问题
- **基于实际情况**：结合用户的具体经历和当前状态生成问题
- **避免重复**：每个问题都要不同，有针对性

**用户特点分析：**
${userInfo?.gender === 'male' ?
  '用户是男性，有创业经历，经历过失败和挫折，需要具体的、实用的建议' :  
  '用户是女性，需要平衡的问题权重'
}

请基于用户的原始输入和上述信息生成3个具体的深度问题。

**生成要求：**
1. 问题要具体明确，不要模糊
2. 基于用户的实际经历和当前状态
3. 每个问题都要不同，有针对性
4. 避免重复和模版化

请直接返回3个问题，用换行分隔，不要其他格式。`
    
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个专业的智能问答专家，擅长基于用户元数据分析结果生成个性化的深度问题。你的任务是生成3个智能的备用问题，必须遵循原有的逻辑规则：活动导向、关键信息提取、活动细节优先、地理位置关键、穿搭融入问题、智能同伴询问等。基于用户档案和输入，避免模板化。请用JSON格式返回。'
          },
          {
            role: 'user',
            content: context
          }
        ],
        max_tokens: 500,
        temperature: 0.7
      })
    })

    if (!response.ok) {
      throw new Error(`DeepSeek API调用失败: ${response.status}`)
    }

    const data = await response.json()
    if (data.choices && data.choices[0] && data.choices[0].message) {
      const content = data.choices[0].message.content.trim()
      
      try {
        let cleanContent = content
        
        // 清理JSON格式 - 移除```json标记
        if (cleanContent.includes('```json')) {
          cleanContent = cleanContent.replace(/```json\s*/, '').replace(/```\s*$/, '').trim()
        }
        if (cleanContent.includes('```')) {
          cleanContent = cleanContent.replace(/```\s*/, '').replace(/```\s*$/, '').trim()
        }
        
        const parsed = JSON.parse(cleanContent)
        console.log('✅ [DOUBAO-SERVICE] LLM生成备用问题成功:', parsed.questions)
        return parsed.questions || []
      } catch (parseError) {
        console.error('❌ [DOUBAO-SERVICE] JSON解析失败:', parseError)
        console.log('📄 原始内容:', content)
        
        // 尝试从文本中提取问题
        const lines = content.split('\n').filter((line: string) => line.trim().length > 0)
        const questions = lines.filter((line: string) =>
          line.includes('？') || line.includes('?') ||
          line.length > 10 && !line.includes('```')
        ).slice(0, 3)
        
        if (questions.length > 0) {
          console.log('✅ 从文本中提取到问题:', questions)
          return questions
        }
        
        // 如果提取失败，返回基于用户输入的具体问题
        return [
          `关于您提到的"${userInput}"，您希望如何处理这个情况？`,
          '您目前最关心的是什么问题？',
          '您希望获得什么样的帮助或建议？'
        ]
      }
    } else {
      throw new Error('DeepSeek API返回格式错误')
    }
  } catch (error) {
    console.error('💥 [DOUBAO-SERVICE] LLM生成备用问题失败:', error)
    // 如果LLM失败，返回基于用户输入的具体问题
    return [
      `关于您提到的"${userInput}"，您希望如何处理这个情况？`,
      '您目前最关心的是什么问题？',
      '您希望获得什么样的帮助或建议？'
    ]
  }
}

// API状态检查功能
export async function checkApiStatus(): Promise<{ status: 'active' | 'error', message: string }> {
  try {
    const testMessages: ChatMessage[] = [
      { role: 'system', content: '你是一个测试助手，请回复"API正常"' },
      { role: 'user', content: '测试API连接' }
    ]
    
    const response = await fetch(API_CONFIG.DOUBAO_LLM.ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_CONFIG.DOUBAO_LLM.API_KEY}`,
      },
      body: JSON.stringify({
        model: API_CONFIG.DOUBAO_LLM.MODEL,
        messages: testMessages,
        temperature: 0.1,
        max_tokens: 50
      })
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.choices && data.choices[0] && data.choices[0].message) {
        return { status: 'active', message: 'API连接正常' }
      }
    }
    
    return { status: 'error', message: `API响应异常: ${response.status}` }
  } catch (error) {
    return { status: 'error', message: `API连接失败: ${error instanceof Error ? error.message : '未知错误'}` }
  }
}

// ❌ 删除硬编码检测函数，改用AI判断

// 深度提问功能
export async function generateDeepQuestions(
  userInput: string,
  initialPrompt?: string,
  previousAnswers?: string[],
  previousQuestions?: string[]  // ⚠️ 新增：之前问过的问题
): Promise<DeepQuestionResponse> {
  // 删除硬编码检测，让AI自己判断
  
  // 获取用户基本信息和性格
  const userInfoDescription = await getUserDescription()
  const userInfo = await getUserInfo()
  const userMetadata = await getUserMetadata()
  const isMale = userInfo?.gender === 'male'
  
  // 构建基于用户分析数据的个性化提示词
  const userAnalysisPrompt = userMetadata && userMetadata.corePersonalityTraits ? `
用户深度分析档案：
- 核心性格特质：${userMetadata.corePersonalityTraits.join('、')}
- 沟通风格特征：${userMetadata.communicationStyle?.join('、') || ''}
- 情感模式特征：${userMetadata.emotionalPattern?.join('、') || ''}
- 决策风格特征：${userMetadata.decisionMakingStyle?.join('、') || ''}
- 自我认知：${userInfo?.personality || '暂无'}
` : ''

  // 构建之前的对话上下文（问答配对）
  const previousContext = previousAnswers && previousAnswers.length > 0 ? `
**🔄 完整对话历史（问答配对）：**
${previousAnswers.map((answer, i) => {
  const question = previousQuestions?.[i] || '(问题缺失)'
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
第${i+1}轮对话：
  AI问: ${question}
  用户答: ${answer}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
}).join('\n')}

⚠️ 以上是完整的对话历史！生成下一个问题时：
1. 必须基于用户已经回答的内容
2. 绝对不要重复问已经回答过的问题
3. 分析每个回答对应的是什么问题，避免重复询问
` : ''
  
  const systemPrompt = `你是一个场景细节挖掘专家。

**🚨🚨🚨 最高优先级：重复检测（违反 = 死刑！）🚨🚨🚨**

**强制规则：生成问题前必须先检查用户已回答的内容！**

**如果用户已经回答过以下任何内容，立即返回 {"questions": []}：**
- 用户说了"穿/T恤/衣服/裤子/白色T恤" → 穿着已回答 → 禁止再问"穿什么"、"穿的什么"、"当时穿什么"
- 用户说了"开会/会议/一起开会" → 场合已回答 → 禁止再问"什么场合"、"在什么场合下"、"什么情况下"
- 用户说了"路/区/街/淞虹路/朝阳区" → 地点已回答 → 禁止再问地点
- 用户说了"商圈/楼下/周边/环境" → 环境已回答 → 禁止再问环境
- 用户说了"白色T恤" → 穿着已明确 → 禁止再问任何衣服相关问题
- 用户说了"办公室挺好" → 环境已回答 → 禁止再问办公室环境
- 用户说"我说过了/已经说了/宁可错杀/无语/真无语" → 用户抗议 → 立即停止！
- 已经问过3次以上 → 立即返回 {"questions": []}

🚨🚨🚨 特别警告：组合问题也算重复！
- ❌ "当时你穿的什么？在什么场合下..." → 如果"穿"和"场合"都已回答 → 死刑！
- 必须检查问题中的每个部分是否都已回答！

**⚠️ 宁可少问，不要重复！宁可错杀（停止提问），不要问废话（重复问题）！**

**🎯🎯🎯 核心目的：平衡理解用户内心 + 收集场景信息（55开）🎯🎯🎯**

**🔍 情绪检测（最高优先级！）：**
**如果用户输入包含以下强烈情绪词，立即切换到"情绪优先模式"：**
- 冷笑、嘲笑、讽刺、无语、生气、愤怒、郁闷、烦躁
- 超开心、兴奋、激动、爽、舒服、满足
- 委屈、难过、失落、沮丧、崩溃、绝望
- 尴尬、社死、丢人、羞耻

**情绪优先模式（检测到情绪词时启动）：**
1. **第一问（必问）**：为什么有这个情绪？具体发生了什么让你有这种感受？
2. **第二问**：必要的场景细节（简化版，只问1-2个关键信息）
   - 在哪里发生的？
   - 当时有谁在场？
3. **第三问**：停止提问，开始生图

**常规模式（没有强烈情绪词时）：**

**🧠 智能判断：先分析用户输入的类型！**

**🚨🚨🚨 第一步：判断输入类型（极其重要！）**

**类型A：纯观点/评价（没有具体事件）**
- 特征：对某事的看法、评价、分析，但缺少具体时间/地点/动作
- 示例："老板找别人咨询本质是熟人经济 没自信"、"这公司就是靠关系"
- **处理**：生成追问具体事件的问题
- **问题示例**：
  * "你是在什么时候观察到这种情况的？当时发生了什么？"
  * "能说说让你这么觉得的具体事情吗？在哪里发生的？"
  * "有没有具体的例子？是什么场景下你有这种感受的？"
- **⚠️ 不要硬编码！根据用户观点灵活生成问题！**

**类型B：具体事件描述（有时间/地点/动作）**
- 特征：描述了具体发生的事，有时间、地点、动作
- 示例："我今天上班，老板找了个人咨询AI行业，我心里冷笑"
- **处理**：生成场景细节问题

**用户回答类型判断（后续问题时）：**
1. **观点/价值判断**（如"公司靠熟人"、"这很讽刺"、"我觉得..."）
   → 追问：具体案例、内心感受、为什么这么想
   
2. **情绪表达**（如"冷笑"、"无语"、"开心"）
   → 追问：为什么有这种情绪？发生了什么？
   
3. **事实陈述**（如"穿白T恤"、"在办公室"）
   → 追问：场景细节（视觉、地点、动作）

**🔥🔥🔥 第一优先级（100%）：必须采集用户感受！🔥🔥🔥**

**🚨🚨🚨 强制规则：每次对话必须问一次感受！不能跳过！🚨🚨🚨**

**第一步：识别用户输入的核心是什么**
从用户输入"${userInput}"中提取：
- 🔥 核心情绪关键词："很想"、"想念"、"害怕"、"孤独"、"笑死了"、"无语"
- 🔸 次要细节："窗户"、"检查"、"关没关"

**识别规则：**
- 如果有情绪词 → 核心是情绪！第一个问题必须问情绪！
- 如果只有事实 → 第一个问题也要问"当时什么感受？"

**🚨🚨🚨 死刑案例（绝对禁止）：**
- 用户说："我其实很想我男朋友" 
- ❌ 错误：问"窗户怎样？在哪检查的？" → 死刑！（问次要细节，忽略核心情绪）
- ✅ 正确：问"为什么那个时候会特别想他？他不在身边时你会怎么做？"

**第二步：基于核心生成问题（平衡情绪和行为！）**

**🎯 核心原则：情绪 + 行为，两者都要！**

- 如果核心是**情绪** → 问情绪原因 + 当时在干什么
  * "为什么会有这种感觉？当时在做什么？"
  * "那一刻你心里想什么？然后做了什么？"
  
- 如果核心是**行为/事实** → 问具体细节 + **开放式**情感反应
  * "你具体怎么做的？当时什么感觉？"
  * "做这件事时心里在想什么？"

**🚨🚨🚨 死刑规则1：不要假设用户情绪！**
❌ 死刑："让你觉得好笑？" ← 用户没说"笑"，你假设了！
❌ 死刑："让你觉得生气？" ← 用户没说"生气"，你假设了！
✅ 正确："当时你什么感受？" ← 开放式，不假设
✅ 正确："这让你有什么想法？" ← 开放式

**🚨🚨🚨 死刑规则2：不能只问其中一个！**
❌ 错误："当时是什么情况？" → 只问事实，没问情感！
❌ 错误："你心里什么感觉？" → 只问情感，没问具体做了什么！
✅ 正确："当时你什么感受？他们讨论了什么？"

**✅ 好问题示例（感受优先！）**：
- 用户说"老板找熟人" → "当时你什么感受？老板找的是谁？" ← 感受在前！
- 用户说"老板说结果导向" → "听到这个你心里怎么想的？" ← 问想法！
- 用户说"很想我男朋友" → "为什么那时候特别想他？你当时在做什么？"
- 用户说"去检查窗户" → "检查窗户时你心里想什么？窗户关着吗？"
- 用户说"半夜被雷惊醒" → "被惊醒时什么感觉？然后你做了什么？"

❌❌❌ **错误示例（只问事实）**：
- "面试时老板具体说了什么？当时你穿的什么？" → 死刑！没问感受！
- "你是在什么情况下开始兼职的？" → 死刑！只问背景！
- "老板在美国有房子后你怎么想的？" → 还行，但应该先问：**"当时你什么感受？"**

**第三优先级（5%）：必要的场景信息（最后才问！）**
- 只在**已经问过感受**且**缺少关键视觉信息时**才问
- 问视觉信息（穿什么、环境怎样）
- ❌ 不要优先问这些！先问感受！

**🏢 地点提问原则（重要！）：**
- ✅ **只在用户描述具体事件时才问地点**
- ❌ **不要在用户表达观点/感受时突然问地点**
- 示例：
  * 用户："寄生于微信熟人经济" → ❌ 不要问"公司在哪"
  * 用户："今天去公司上班" → ✅ 可以问"公司在哪个区域"

**✅✅✅ 必须问的感受类问题（每次对话必问！不能跳过！）：**
- ✅ "当时你心里在想什么？"
- ✅ "为什么冷笑？" / "为什么觉得好笑？"
- ✅ "你怎么看这件事？"
- ✅ "这让你有什么感受？"
- ✅ "你为什么会这样做/想？"
- ✅ "这件事对你来说意味着什么？"
- ✅ "你当时什么感觉？开心？失落？还是其他？"

**🚨🚨🚨 强制要求：**
- 如果还没有问过用户的感受/情绪，第一个问题必须包含感受询问！
- 即使用户只提到事实（"我去了公司"），也要问："当时什么感觉？"
- 不能只问场景细节而不问感受！这是死刑线！

**⚠️ 核心原则：感受是心理剧的灵魂！没有感受就没有心理剧！必须采集！**

**❌ 仍然不要问的（过度专业分析）：**
- ❌ "你的人格面具是什么？"
- ❌ "从精神分析角度..."
- ❌ "这反映了你的童年创伤..."
- ❌ 使用心理学专业术语的问题

**为什么55开？**
→ 场景信息：为生图提供视觉元素（穿什么、在哪）
→ 情绪动机：理解用户真实内心，让故事有灵魂
→ **既要画面精准，也要情感真实**

**🏢 地点提问示例（一定要这样问！）：**

**用户说："我在公司工作"**
- ✅ 正确问法："公司在哪个区域？" → 能得到"朝阳区"、"金融街"等，可生成室外场景
- ❌ 错误问法："在公司的哪个区域工作？" → 只能得到"会议室"、"工位"，无室外场景

**用户说："去了一家咖啡馆"**
- ✅ 正确问法："这家咖啡馆在哪里？叫什么名字？" → 可生成咖啡馆外观、街景
- ❌ 错误问法："在咖啡馆的哪个位置坐的？" → 只是室内细节

**用户说："在办公室开会"**
- ✅ 正确问法："办公室在哪？周边环境怎么样？" → 可生成办公楼外景
- ❌ 错误问法："在几号会议室？" → 只是室内编号

**🔥🔥🔥 问题生成的核心逻辑（严格按此顺序）🔥🔥🔥**

**优先级排序（从高到低）：**
1. **第一优先级：用户的元键入（initialPrompt）** - 用户最开始说的话，是最核心的
2. **第二优先级：用户当前回答** - 用户刚刚回答的内容
3. **第三优先级：之前问过的不要再问** - 已经问过的信息，绝对不要重复

**⚠️⚠️⚠️ 问题生成策略：**
- ✅ 必须基于元键入"${initialPrompt || userInput}"中的关键事件提问
- ✅ 结合用户当前回答"${userInput}"的具体内容
- ❌ 绝对不要问之前已经回答过的信息

**用户元键入（initialPrompt，最重要！必须优先基于此提问）：** 
"${initialPrompt || userInput}"

**用户当前回答（第二重要！结合此内容生成下一个问题）：** 
"${userInput}"

${previousContext}

**⚠️⚠️⚠️ 死刑规则：绝对不要重复问已回答的问题！⚠️⚠️⚠️**

**⚠️ 当前轮次：第 ${(previousAnswers?.length || 0) + 1} 个问题**

**🚨 问题数量限制：**
- 如果已经问了2个或以上问题 → 建议停止（返回空数组）
- 如果已经问了3个或以上问题 → 强制停止（必须返回空数组）
- **用户说"宁可错杀"** = 用户觉得问太多了 → 立即停止！

${previousAnswers && previousAnswers.length > 0 ? `
**🚨🚨🚨 重复检测（死刑级规则！）🚨🚨🚨**

**用户已经回答过的内容（逐条检查！禁止重复！）：**
${previousAnswers.map((ans, i) => `
回答${i+1}: "${ans}"
→ 从这条回答中提取：用户说了什么？(穿着/地点/环境/背景/时间...)
→ 禁止再问这些已回答的内容！
`).join('')}

**🚨🚨🚨 重复问题 = 死刑！以下是用户已经明确回答过的内容，绝对禁止再问！🚨🚨🚨**

**已回答的信息类别（绝对不要再问这些！）：**
${(() => {
  const answered = previousAnswers || []
  const answeredTopics = []
  
  // 检测已回答的地点信息
  if (answered.some(a => a && (a.includes('路') || a.includes('区') || a.includes('街') || a.includes('在') || a.includes('公司在') || a.includes('商圈') || a.includes('周边')))) {
    answeredTopics.push('❌ 地点位置已回答（包含具体地址、周边环境）')
  }
  
  // 检测已回答的环境信息
  if (answered.some(a => a && (a.includes('环境') || a.includes('氛围') || a.includes('周围') || a.includes('楼下') || a.includes('附近')))) {
    answeredTopics.push('❌ 周边环境已回答')
  }
  
  // 检测已回答的idea/产品信息
  if (answered.some(a => a && (a.includes('idea') || a.includes('产品') || a.includes('ai') || a.includes('用户体验') || a.includes('心理场景') || a.includes('功能')))) {
    answeredTopics.push('❌ idea/产品内容已回答（包括核心功能、产品类型）')
  }
  
  // 检测已回答的开会/会议信息
  if (answered.some(a => a && (a.includes('开会') || a.includes('会议') || a.includes('讨论了') || a.includes('会议室')))) {
    answeredTopics.push('❌ 开会/会议内容已回答')
  }
  
  // 检测已回答的穿着信息
  if (answered.some(a => a && (a.includes('穿') || a.includes('衣服') || a.includes('T恤') || a.includes('裤子') || a.includes('白色')))) {
    answeredTopics.push('❌ 穿着/衣服已回答（禁止再问：穿什么、穿的什么、当时穿什么）')
  }
  
  // 检测已回答的场合/会议信息
  if (answered.some(a => a && (a.includes('开会') || a.includes('会议') || a.includes('一起') || a.includes('讨论')))) {
    answeredTopics.push('❌ 场合/会议已回答（禁止再问：什么场合、在什么场合下、什么情况下）')
  }
  
  // 检测已回答的6块钱事件
  if (answered.some(a => a && (a.includes('6块钱') || a.includes('六块钱') || a.includes('花了六') || a.includes('淘宝')))) {
    answeredTopics.push('❌ 6块钱解决问题事件已回答（怎么操作的、怎么解决的）')
  }
  
  // 检测已回答的老板/同事反应
  if (answered.some(a => a && (a.includes('老板') && (a.includes('激动') || a.includes('反应') || a.includes('表情'))))) {
    answeredTopics.push('❌ 老板反应/表情已回答')
  }
  
  // 检测已回答的顾问反应
  if (answered.some(a => a && (a.includes('顾问') || a.includes('拍手') || a.includes('叫好')))) {
    answeredTopics.push('❌ 顾问/同事反应已回答')
  }
  
  // 检测已回答的时间信息
  if (answered.some(a => a && (a.includes('早上') || a.includes('中午') || a.includes('晚上') || a.includes('几点') || a.includes('时候')))) {
    answeredTopics.push('❌ 时间信息已回答')
  }
  
  // 检测已回答的活动内容
  if (answered.some(a => a && (a.includes('吃了') || a.includes('做了') || a.includes('点了') || a.includes('开会')))) {
    answeredTopics.push('❌ 活动内容已回答')
  }
  
  return answeredTopics.length > 0 ? answeredTopics.join('\n') : ''
})()}

**死刑案例（绝对禁止的重复问题）：**
${(() => {
  const forbidden = [];
  const allAnswers = previousAnswers.join(' ');
  
  // 检查所有已回答的信息
  
  // 🏢 地点位置检测（重要！）
  if (allAnswers.includes('路') || allAnswers.includes('区') || allAnswers.includes('街') || allAnswers.includes('公司在') || allAnswers.includes('淞虹路') || allAnswers.includes('朝阳区') || allAnswers.includes('金融街')) {
    forbidden.push('❌❌❌ 用户已回答地点位置（包含路名/区域） → 禁止再问：公司在哪、在哪个区域、具体在哪、公司位置、公司地址、哪里的公司');
  }
  
  // 🏢 周边环境检测（重要！）
  if (allAnswers.includes('商圈') || allAnswers.includes('楼下') || allAnswers.includes('周边') || allAnswers.includes('附近') || allAnswers.includes('周围')) {
    forbidden.push('❌❌❌ 用户已回答周边环境 → 禁止再问：周边环境怎样、周围有什么、环境特点、附近有什么');
  }
  
  // 🏠 在家相关
  if (allAnswers.includes('在家') || allAnswers.includes('卧室') || allAnswers.includes('客厅')) {
    forbidden.push('❌❌❌ 用户已说"在家/卧室/客厅" → 禁止再问：在哪里、什么地方、哪个房间、在家里吗、具体在哪');
  }
  
  // 📱 设备相关
  if (allAnswers.includes('iPhone') || allAnswers.includes('手机') || allAnswers.includes('MacBook') || allAnswers.includes('电脑')) {
    forbidden.push('❌❌❌ 用户已说设备（iPhone/手机/电脑） → 禁止再问：用什么设备、什么设备听的、用的什么、什么设备上');
  }
  
  // 💡 光线相关
  if (allAnswers.includes('暗') || allAnswers.includes('亮') || allAnswers.includes('光线')) {
    forbidden.push('❌❌❌ 用户已说光线（暗/亮） → 禁止再问：光线怎么样、环境明暗、当时环境、卧室环境');
  }
  
  // 🛏️ 位置相关
  if (allAnswers.includes('床') || allAnswers.includes('沙发') || allAnswers.includes('椅子')) {
    forbidden.push('❌❌❌ 用户已说位置（床/沙发） → 禁止再问：在床上还是其他地方、在卧室的床上还是、具体在哪');
  }
  
  // 😴 状态相关
  if (allAnswers.includes('刚起床') || allAnswers.includes('起床') || allAnswers.includes('还没完全起来')) {
    forbidden.push('❌❌❌ 用户已说状态（刚起床） → 禁止再问：当时的环境、周围环境、刚起床的环境');
  }
  if (allAnswers.includes('穿') || allAnswers.includes('睡衣') || allAnswers.includes('上衣') || allAnswers.includes('裤子')) {
    forbidden.push('❌❌❌ 用户已说服装（睡衣/上衣） → 禁止再问：穿什么、什么衣服、穿的什么');
  }
  if (allAnswers.includes('听') || allAnswers.includes('podcast') || allAnswers.includes('播客')) {
    forbidden.push('❌❌❌ 用户已说听的内容（podcast） → 禁止再问：听什么、在听什么');
  }
  if (allAnswers.includes('父母') || allAnswers.includes('爸妈') || allAnswers.includes('出门')) {
    forbidden.push('❌❌❌ 用户已说父母出门 → 禁止再问：父母做什么、父母去哪');
  }
  
  // ⚠️⚠️⚠️ 检测废话问题（重要！）
  const initialLower = (initialPrompt || '').toLowerCase();
  if (initialLower.includes('吃') || initialLower.includes('吃了')) {
    forbidden.push('❌❌❌ 废话问题禁止：用户说"吃了XX" → 绝对不要问"吃的时候在做什么"（废话！吃就是在吃！）');
    forbidden.push('✅ 可以问：吃之前从哪来？吃之后去哪了？和谁一起吃？');
  }
  if (initialLower.includes('听') || initialLower.includes('podcast') || initialLower.includes('播客')) {
    forbidden.push('❌❌❌ 废话问题禁止：用户说"听podcast" → 绝对不要问"听的时候在做什么"（废话！）');
    forbidden.push('✅ 可以问：听之前干嘛？听之后干嘛？');
  }
  if (initialLower.includes('开会') || initialLower.includes('会议')) {
    forbidden.push('❌❌❌ 废话问题禁止：用户说"开会" → 绝对不要问"开会时在做什么"（废话！）');
    forbidden.push('✅ 可以问：开会前干嘛？开会后干嘛？');
  }
  
  return forbidden.length > 0 ? forbidden.join('\n') : '';
})()}

**🚨🚨🚨 用户已经回答过的内容（死刑线！不要再问！）：**

${previousAnswers.map((answer, i) => `
**回答${i+1}：${answer}**

从这个回答中，我们知道了：
${(() => {
  const topics = [];
  if (answer.includes('土豆') || answer.includes('牛肉') || answer.includes('焖饭') || answer.includes('炒') || answer.includes('菜')) {
    topics.push('- ❌ 菜品信息已收集，不要再问"吃了什么菜"');
  }
  if (answer.includes('在家') || answer.includes('卧室') || answer.includes('客厅') || answer.includes('房间')) {
    topics.push('- ❌ 地点信息已收集（在家/卧室/客厅/房间），绝对不要再问"在哪里"、"什么地方"、"哪个房间"');
  }
  if (answer.includes('外卖') || answer.includes('餐厅') || answer.includes('地点') || answer.includes('环境')) {
    topics.push('- ❌ 环境信息已收集，不要再问"环境是怎样的"、"周围环境"');
  }
  if (answer.includes('高考') || answer.includes('失利') || answer.includes('复习') || answer.includes('补习班') || answer.includes('教室') || answer.includes('教英语') || answer.includes('单词')) {
    topics.push('- ❌ 高考相关信息已收集，不要再问高考失利、复习、补习相关的问题');
    topics.push('- ✅ 必须转向其他主题（如：出国读书的经历）');
  }
  if (answer.includes('iPhone') || answer.includes('MacBook') || answer.includes('电脑') || answer.includes('手机') || answer.includes('设备') || answer.includes('笔记本')) {
    topics.push('- ❌ 设备信息已收集（iPhone/MacBook/电脑/手机），绝对不要再问"用什么设备"、"什么设备听的"');
  }
  if (answer.includes('暗') || answer.includes('亮') || answer.includes('光线') || answer.includes('灯')) {
    topics.push('- ❌ 光线信息已收集，不要再问"光线怎么样"、"环境明暗"');
  }
  if (answer.includes('床上') || answer.includes('床') || answer.includes('沙发') || answer.includes('椅子') || answer.includes('桌子')) {
    topics.push('- ❌ 具体位置已收集（床上/沙发/椅子），不要再问"在床上还是其他地方"');
  }
  if (answer.includes('穿') || answer.includes('睡衣') || answer.includes('上衣') || answer.includes('裤子') || answer.includes('衣服') || answer.includes('T恤') || answer.includes('白色')) {
    topics.push('- ❌ 服装信息已收集，不要再问"穿什么"、"什么衣服"、"穿的什么"、"当时穿什么"');
  }
  if (answer.includes('开会') || answer.includes('会议') || answer.includes('一起')) {
    topics.push('- ❌ 场合/会议信息已收集，不要再问"什么场合"、"在什么场合下"、"什么情况下"');
  }
  if (answer.includes('听') || answer.includes('podcast') || answer.includes('播客') || answer.includes('音乐')) {
    topics.push('- ❌ 听的内容已收集，不要再问"听什么"');
  }
  if (answer.includes('父母') || answer.includes('爸妈') || answer.includes('出门')) {
    topics.push('- ❌ 父母/家人信息已收集，不要再问"父母做什么"');
  }
  if (answer.includes('项目') || answer.includes('会议') || answer.includes('开会') || answer.includes('讨论')) {
    topics.push('- ❌ 会议信息已收集，不要再问"开会讨论了什么"');
  }
  if (answer.includes('线上') || answer.includes('线下') || answer.includes('会议室') || answer.includes('办公室')) {
    topics.push('- ❌ 会议地点已收集，不要再问"在哪里开会"');
  }
  if (answer.includes('累') || answer.includes('状态') || answer.includes('感觉') || answer.includes('精神')) {
    topics.push('- ❌ 用户状态已收集，不要再问"感觉怎么样"');
  }
  
  // ⚠️ 检测废话问题：不要问"做X时在做什么"
  const initialLower = (initialPrompt || userInput).toLowerCase();
  if (initialLower.includes('吃') || initialLower.includes('吃了')) {
    topics.push('- ❌❌❌ 死刑警告：用户说的是"吃"，不要问"吃的时候在做什么"（废话！吃就是在吃！）');
    topics.push('- ✅ 可以问：吃之前干嘛了？吃之后去哪了？和谁一起吃的？');
  }
  if (initialLower.includes('听') || initialLower.includes('podcast') || initialLower.includes('播客')) {
    topics.push('- ❌❌❌ 死刑警告：用户说的是"听podcast"，不要问"听的时候在做什么"（废话！）');
    topics.push('- ✅ 可以问：听之前干嘛了？听之后干嘛了？');
  }
  if (initialLower.includes('开会') || initialLower.includes('会议')) {
    topics.push('- ❌❌❌ 死刑警告：用户说的是"开会"，不要问"开会时在做什么"（废话！）');
    topics.push('- ✅ 可以问：开会之前干嘛了？开会后干嘛了？');
  }
  
  return topics.length > 0 ? topics.join('\n') : '- 已收集该信息，不要重复问';
})()}
`).join('\n')}

**📋 下一个问题应该问什么？**

**当前轮次：第 ${(previousAnswers?.length || 0) + 1} 个问题（AI智能判断何时信息足够）**

**🚨🚨🚨 核心原则：必须基于用户元键入"${initialPrompt}"提问！🚨🚨🚨**

**第一步：分析元键入中的所有关键事件**
从"${initialPrompt}"中提取所有事件：
${(() => {
  const prompt = initialPrompt || userInput;
  const events = [];
  if (prompt.includes('高考') || prompt.includes('考试')) events.push('高考');
  if (prompt.includes('出国') || prompt.includes('留学') || prompt.includes('读书')) events.push('出国读书');
  if (prompt.includes('工作') || prompt.includes('创业') || prompt.includes('项目')) events.push('工作/项目');
  if (prompt.includes('开会') || prompt.includes('会议')) events.push('开会');
  if (prompt.includes('吃') || prompt.includes('点') || prompt.includes('外卖')) events.push('用餐');
  return events.length > 0 
    ? `关键事件：${events.join('、')}\n总共 ${events.length} 个关键事件，需要覆盖所有事件！`
    : '分析元键入，提取所有关键事件';
})()}

**第二步：检查哪些事件已经问过，哪些还没问**
${previousAnswers && previousAnswers.length > 0 ? `
${(() => {
  const askedEvents = [];
  let gaoKaoCount = 0;
  let studyAbroadCount = 0;
  
  previousAnswers.forEach(ans => {
    if (ans.includes('高考') || ans.includes('失利') || ans.includes('补习') || ans.includes('在家') || ans.includes('教室') || ans.includes('单词')) {
      gaoKaoCount++;
    }
    if (ans.includes('悉尼') || ans.includes('Sydney') || ans.includes('出国') || ans.includes('实验') || ans.includes('留学')) {
      studyAbroadCount++;
    }
  });
  
  askedEvents.push(`高考相关：已问过 ${gaoKaoCount} 次`);
  askedEvents.push(`出国读书：已问过 ${studyAbroadCount} 次`);
  
  if (gaoKaoCount >= 2) {
    askedEvents.push('⚠️⚠️⚠️ 高考已经问了' + gaoKaoCount + '次，不要再问高考了！必须问其他事件！');
  }
  
  return askedEvents.join('\n');
})()}

**第三步：下一个问题必须问还没问过的事件！**

${(() => {
  let gaoKaoCount = 0;
  previousAnswers.forEach(ans => {
    if (ans.includes('高考') || ans.includes('失利') || ans.includes('补习') || ans.includes('在家') || ans.includes('教室')) {
      gaoKaoCount++;
    }
  });
  
  if (gaoKaoCount >= 2) {
    return '🚨🚨🚨 死刑警告：高考已经问了' + gaoKaoCount + '次！如果再问高考，必须返回空数组[]！必须转向其他事件（如：出国读书）！';
  }
  return '';
})()}
` : ''}

**下一个问题应该：**
- ✅✅✅ 优先询问元键入中**还没问过**的关键事件
- ✅ 如果一个事件已经问过2次，**必须**转向其他事件
- ✅ 不要只深挖一个点，要覆盖多个关键信息
- ❌ 不要重复问已经回答过的内容
- ❌ 不要在同一个事件上问超过2个问题

**🚨🚨🚨 重复问题检测（死刑线！）🚨🚨🚨**

**🚨🚨🚨 重复问题 = 直接返回空数组[]！🚨🚨🚨**

**⚠️⚠️⚠️ 严禁问已回答的问题的不同表述方式！例如：**
- 用户已回答"面试时老板说work from home、兼职、看结果不看时间"
- ❌ 禁止再问："老板具体说了什么？" → 已经回答过了！
- ❌ 禁止再问："老板怎么表现的？" → 已经回答过了！
- ❌ 禁止再问："老板什么打扮？" → 已经回答过"穿着随意"了！
- ❌ 禁止再问："面试环境怎样？" → 同一个事件的不同角度，都算重复！

**🚨 如果用户回答了一个问题，就不要从不同角度再问同一件事！**

**常见重复问题模式（绝对禁止，违反直接返回[]）：**
${previousAnswers && previousAnswers.length > 0 ? `
${(() => {
  const checks = [];
  const allAnswers = previousAnswers.join(' ');
  
  // 🏢 地点位置检测（最重要！）
  if (allAnswers.includes('路') || allAnswers.includes('区') || allAnswers.includes('街') || allAnswers.includes('公司在') || allAnswers.includes('淞虹路') || allAnswers.includes('朝阳区') || allAnswers.includes('金融街')) {
    checks.push('❌❌❌ 用户已回答地点位置（包含路名/区域） → 绝对禁止再问：公司在哪、在哪个区域、具体在哪、公司位置、公司地址、哪里的公司、什么区域');
  }
  
  // 🏢 周边环境检测（最重要！）
  if (allAnswers.includes('商圈') || allAnswers.includes('楼下') || allAnswers.includes('周边') || allAnswers.includes('附近') || allAnswers.includes('周围') || allAnswers.includes('环境')) {
    checks.push('❌❌❌ 用户已回答周边环境 → 绝对禁止再问：周边环境怎样、周围有什么、环境特点、附近有什么、环境怎么样、周边什么样');
  }
  
  // 🏠 在家相关
  if (allAnswers.includes('在家') || allAnswers.includes('卧室') || allAnswers.includes('客厅')) {
    checks.push('❌❌❌ 用户已说"在家/卧室/客厅" → 禁止问：在哪里、什么地方、哪个房间、在家里吗、具体在哪');
  }
  
  // 📱 设备相关
  if (allAnswers.includes('iPhone') || allAnswers.includes('手机') || allAnswers.includes('MacBook') || allAnswers.includes('电脑')) {
    checks.push('❌❌❌ 用户已说设备（iPhone/手机/电脑） → 禁止问：用什么设备、什么设备听的、用的什么、什么设备上');
  }
  
  // 💡 光线相关
  if (allAnswers.includes('暗') || allAnswers.includes('亮') || allAnswers.includes('光线')) {
    checks.push('❌❌❌ 用户已说光线（暗/亮） → 禁止问：光线怎么样、环境明暗、当时环境、卧室环境');
  }
  
  // 🛏️ 位置相关
  if (allAnswers.includes('床') || allAnswers.includes('沙发') || allAnswers.includes('椅子')) {
    checks.push('❌❌❌ 用户已说位置（床/沙发） → 禁止问：在床上还是其他地方、在卧室的床上还是、具体在哪');
  }
  
  // 😴 状态相关
  if (allAnswers.includes('刚起床') || allAnswers.includes('起床') || allAnswers.includes('还没完全起来')) {
    checks.push('❌❌❌ 用户已说状态（刚起床） → 禁止问：当时的环境、周围环境、刚起床的环境');
  }
  if (allAnswers.includes('店里') || allAnswers.includes('餐厅') || allAnswers.includes('环境') || allAnswers.includes('装修') || allAnswers.includes('氛围')) {
    checks.push('❌❌❌ 用户已说环境（店里/餐厅/环境/装修/氛围） → 禁止问：店里环境怎么样、餐厅环境、装修怎么样、氛围如何、环境如何');
  }
  if (allAnswers.includes('人多') || allAnswers.includes('游客') || allAnswers.includes('旅客') || allAnswers.includes('拥挤')) {
    checks.push('❌❌❌ 用户已说人群（人多/游客/旅客/拥挤） → 禁止问：人多吗、人多不多、人多吗、店里人多吗、人多吗、人多吗');
  }
  if (allAnswers.includes('静安寺') || allAnswers.includes('老字号') || allAnswers.includes('传统')) {
    checks.push('❌❌❌ 用户已说地点（静安寺/老字号/传统） → 禁止问：在哪里吃的、什么餐厅、哪家店、静安寺哪里');
  }
  if (allAnswers.includes('蟹粉') || allAnswers.includes('小笼') || allAnswers.includes('鸭血汤') || allAnswers.includes('菜')) {
    checks.push('❌❌❌ 用户已说食物（蟹粉/小笼/鸭血汤/菜） → 禁止问：吃了什么、什么菜、具体吃了什么、点了什么');
  }
  
  // 💼 面试相关检测（重要！）
  if (allAnswers.includes('work from home') || allAnswers.includes('兼职') || allAnswers.includes('fulltime') || allAnswers.includes('看结果') || allAnswers.includes('不看时间') || allAnswers.includes('零散工作')) {
    checks.push('❌❌❌ 用户已说面试内容（work from home/兼职/看结果不看时间等） → 绝对禁止再问：老板说了什么、老板具体说了什么、老板怎么表现的、让你觉得怎样、老板怎么说的、老板是怎么说的');
  }
  if (allAnswers.includes('随意') || allAnswers.includes('休闲') || allAnswers.includes('polo') || allAnswers.includes('T恤') || allAnswers.includes('穿着')) {
    checks.push('❌❌❌ 用户已说穿着（随意/休闲等） → 绝对禁止再问：穿什么、什么打扮、穿着打扮、老板穿什么、什么衣服、怎么打扮的');
  }
  
  // 💼 实际工作体验检测（重要！）
  if (allAnswers.includes('自尊心') || allAnswers.includes('受伤') || allAnswers.includes('压我') || allAnswers.includes('撑场面') || allAnswers.includes('老男人') || allAnswers.includes('传统') || allAnswers.includes('取代人') || allAnswers.includes('降本增效') || allAnswers.includes('不想用人') || allAnswers.includes('赋能')) {
    checks.push('❌❌❌ 用户已说实际工作发现（自尊心受伤/压我/撑场面/取代人/降本增效等） → 绝对禁止再问：老板哪些行为、具体行为、什么场景、让你觉得怎样、发现了什么、有什么表现、什么事情、哪些事情');
  }
  
  // 🚨 同一主题重复检测（最重要！）
  if (previousAnswers.length >= 2) {
    const answer1 = previousAnswers[previousAnswers.length - 2] || ''
    const answer2 = previousAnswers[previousAnswers.length - 1] || ''
    
    // 检查最近两次回答是否都包含相同的主题关键词
    const theme1Keywords = ['面试', 'work from home', '兼职', '开放', '美国思维']
    const theme2Keywords = ['自尊心', '压我', '撑场面', '取代人', '降本增效', '老男人', '传统']
    
    const hasTheme1InBoth = theme1Keywords.some(k => answer1.includes(k) && answer2.includes(k))
    const hasTheme2InBoth = theme2Keywords.some(k => answer1.includes(k) && answer2.includes(k))
    
    if (hasTheme1InBoth) {
      checks.push('🚨🚨🚨 最近两次回答都在谈"面试/开放思维"！说明你在重复提问！立即返回空数组停止！')
    }
    if (hasTheme2InBoth) {
      checks.push('🚨🚨🚨 最近两次回答都在谈"实际工作/传统思维"！说明你在重复提问！立即返回空数组停止！')
    }
  }
  
  // 🚨 "我说过了" 检测（终极检测！）
  if (allAnswers.includes('说过了') || allAnswers.includes('已经说了') || allAnswers.includes('回答过了') || allAnswers.includes('刚说了') || allAnswers.includes('无语') || allAnswers.includes('真无语')) {
    checks.push('🚨🚨🚨 用户明确表示不耐烦（"说过了"/"无语"）！说明你在重复提问或问题不当！立即返回空数组 {"questions": []} 停止提问！');
  }
  if (allAnswers.includes('白T恤') || allAnswers.includes('蓝黑') || allAnswers.includes('裤子') || allAnswers.includes('衣服') || allAnswers.includes('白色T恤') || allAnswers.includes('穿')) {
    checks.push('❌❌❌ 用户已说服装（白T恤/裤子/衣服/穿） → 禁止问：穿什么、什么衣服、穿什么颜色、什么穿搭、当时穿什么、穿的什么');
  }
  if (allAnswers.includes('开会') || allAnswers.includes('会议') || allAnswers.includes('一起开会')) {
    checks.push('❌❌❌ 用户已说场合（开会/会议） → 禁止问：什么场合、在什么场合下、什么情况下、在什么场合看到');
  }
  
  return checks.length > 0 ? checks.join('\n') : '';
})()}
` : ''}

**⚠️⚠️⚠️ 如果你的问题会问到上面任何一个已经回答过的信息，必须返回空数组[]！**

**例如：**
- 用户已说"在卧室" → 你问"在哪里听的" → 返回[]
- 用户已说"iPhone" → 你问"用什么设备" → 返回[]
- 用户已说"很暗" → 你问"光线怎么样" → 返回[]
- 用户已说"刚起床" → 你问"当时环境怎样" → 返回[]
- 用户已说"店里环境" → 你问"店里环境怎么样" → 返回[]
- 用户已说"人多" → 你问"人多吗" → 返回[]
- 用户已说"静安寺" → 你问"在哪里吃的" → 返回[]
- **用户已说"公司在淞虹路 楼下有商圈"** → 你问"公司在哪个区域？周边环境怎样？" → **死刑！返回[]**
- **用户已说"周边环境"** → 你问"周边有什么特点？" → **死刑！返回[]**

**⚠️ 因为只有3个问题机会，要覆盖元键入"${initialPrompt}"中的多个关键点，不要在一个细节上过度深挖！**

**正确策略：**
1. 第1个问题：问核心场景细节（什么活动、在哪里、和谁）
2. 第2个问题：问另一个关键事件（如：父母出门、去上班）
3. 第3个问题：问用户整体状态（今天感觉怎么样）

**❌ 错误策略：3个问题都问同一个场景的细节（地点、设备、环境、位置...）**
` : '**这是第一个问题**，基于用户元键入"' + (initialPrompt || userInput) + '"生成第一个问题'}

${userAnalysisPrompt}

**问题生成原则（严格按优先级）：**

**优先级1：场景信息（60%，最重要！）**
针对用户键入的活动/事件，问具体的场景细节：

**场景细节问题（优先）：**

**⚠️⚠️⚠️ 禁止问废话问题（死刑线！）：**
- ❌ 用户说"吃了小笼包" → 不要问"吃的时候在做什么"（废话！吃就是在吃！）
- ❌ 用户说"开会" → 不要问"开会时在做什么"（废话！开会就是在开会！）
- ❌ 用户说"听podcast" → 不要问"听的时候在做什么"（废话！听就是在听！）

**✅✅✅ 正确的场景问题方向：**

**关于"吃"的场景：**
- ✅ 问吃什么：具体菜品、口味
- ✅ 问在哪吃：地点、环境、装修
- ✅ 问和谁吃：独自、朋友、家人
- ✅ 问穿什么：服装
- ✅ 问吃之前：从哪来的、之前干嘛了
- ✅ 问吃之后：去哪了、之后干嘛了
- ❌ 不要问"吃的时候在做什么"（废话！）

**关于其他活动的场景：**
- ✅ 问具体内容、地点、人物、环境
- ✅ 问之前干嘛了、之后干嘛了
- ❌ 不要问"做这件事的时候在做什么"（废话！）

**智能提问策略（如果用户信息很少）：**
- ✅ 问时间线：做这件事之前干嘛了？之后干嘛了？
- ✅ 问环境细节：地点、光线、装修、氛围
- ✅ 问人物：和谁一起、周围有什么人
- ✅ 问视觉：穿什么、周围有什么物品

**⚠️⚠️⚠️ 年龄相关问题规则 ⚠️⚠️⚠️**

**可以问年龄的情况：**
✅ 用户说"小时候"、"小学"、"中学" → 可以问具体几岁
✅ 用户说"工作"、"创业"、"那时候" → 可以问当时多大
✅ 用户说"几年前"、"前段时间" → 可以问具体时间

**不要问年龄的情况（常识性年龄）：**
❌ 用户说"高考" → 不要问年龄（常识是18岁左右）
❌ 用户说"大学" → 不要问年龄（常识是18-22岁）
❌ 用户说"研究生" → 不要问年龄（常识是22-25岁）
❌ 用户说"幼儿园"、"小学" → 不要问年龄（常识性阶段）

**正确提问方式：**
✅ "你小时候那段经历是几岁的时候？"（不确定的年龄）
✅ "你开始工作/创业是多大的时候？"（不确定的年龄）
❌ "你高考时多大？"（常识是18岁，不用问）
❌ "你上大学时几岁？"（常识是18-19岁，不用问）

**优先级2：用户状态（40%，关键！）**
询问用户今天的状态，为生图提供情绪氛围：
- 动态生成询问用户今天感觉的问题
- 动态生成询问用户心情的问题
- 动态生成询问用户状态的问题
→ 用户的状态会影响所有场景的氛围！
→ 不要使用固定模板！

**优先级3：用户性格（极少使用）**
- 不要基于性格问心理问题
- 只在必要时轻微参考

**生成策略（动态生成1个问题）：**
1. **🚨 第一步：检查是否已问过感受**
   - 如果之前的问题都没问感受 → 本次问题必须问感受！不能跳过！
   - 如果已经问过感受 → 可以问其他细节
   
2. **识别活动/事件**：从用户键入中提取活动（吃饭、开会、做项目...）

3. **🔥 感受问题（必问！）**：前3个问题中至少有1个必须问感受！
   - ✅ **必须问（第一优先级）**："当时你心里在想什么？"、"你当时什么感觉？"、"为什么会这样想？"、"这让你有什么感受？"
   - ✅ 把感受问题和场景问题结合："在XX做XX时，你什么感觉？"
   - ❌ 不要问：专业术语（"你的人格面具"、"童年创伤"、"精神分析"）
   
4. **问场景细节（次要，感受问过之后才问）**：只在必要时问具体细节（什么菜、做什么、在哪、和谁）

5. **核心原则**：
   - 没有感受就没有心理剧！必须采集感受！
   - 宁可多问感受，也不要只问事实细节！
   - 感受是理解用户内心的钥匙！

**完整示例对比：**

**案例：基于用户实际输入"${initialPrompt || userInput}"**

**动态生成1个问题：根据当前对话生成最需要的问题**

❌ 错误的问题（心理分析）：
- "吃[食物]这件事，对你来说是一天中难得的放松时刻吗？"（心理分析）
- "作为[性格]的你，在做[活动]时的心态是怎样的？"（心理分析）
- "你喜欢什么样的[环境/氛围]？"（太宽泛）

✅ 正确的问题生成方式（动态生成）：
- 问题类型1（场景细节）：基于用户活动动态生成，询问具体内容（为生图提供视觉元素）
- 问题类型2（场景环境）：基于用户活动动态生成，询问地点/人物/环境（为生图提供空间元素）
- 问题类型3（用户状态）：动态生成询问用户今天状态的问题（为生图提供情绪氛围）

**3个问题的标准配置：**

**问题类型1（场景细节）：** 根据用户活动动态生成，询问具体内容
- 基于用户提到的活动生成问题
- 不要使用固定模板

**问题类型2（场景环境）：** 根据活动动态生成，询问地点、人物、环境
- 基于用户活动生成环境相关问题
- 不要使用固定模板

**问题类型3（用户状态）：** 询问今天的身体/情绪状态
- 询问用户今天的感觉和状态
- 不要使用固定模板

**🎯 提问优先级（必须遵守！）：**

**优先级1（最重要）：故事细节和情节**
- 如果用户讲了一个故事（如"上次...这次..."、"我做了...后来..."），优先问故事细节！
- 问具体情节：怎么做的？当时什么情况？为什么这样？
- 问人物反应：老板什么反应？其他人怎么样？
- 问用户感受：你为什么笑？你怎么想的？
- **⚠️ 如果已经问了2个具体问题，可以用开放性问题**："关于这件事，还有什么其他细节吗？"

**优先级2（次要）：穿搭和视觉细节**
- 如果故事细节已经问清楚，再问穿搭

**优先级3（最后）：地点环境**
- 只有当故事和穿搭都问过了，才问地点
- ⚠️ 如果用户讲的是一个故事，不要一上来就问地点！

**提问方式分类：**

**1. 具体问题（用于挖掘细节）：**
- "这6块钱具体是怎么解决的？"
- "老板当时什么反应？"
- "你穿的什么？"

**2. 开放性问题（用于让用户自由补充）：**
- "关于这件事，还有什么其他的细节吗？"
- "当时还发生了什么？"
- "你还记得什么特别的画面吗？"

**❌ 错误示例：**
用户说："上次我用6块钱解决了公司问题 老板受挫了 这次开会老板说要做伟大的公司 我笑死了"
AI问："公司在哪个区域？" ← 错误！应该先问故事！

**✅ 正确示例：**
用户说："上次我用6块钱解决了公司问题 老板受挫了 这次开会老板说要做伟大的公司 我笑死了"
第1问："这6块钱具体是怎么解决的？老板当时什么反应？" ← 具体问题
第2问："开会时你穿的什么？老板说那些话时有什么动作和表情？" ← 视觉细节
第3问："关于这件事，还有什么其他的细节吗？" ← 开放性问题，让用户补充

**核心：优先问故事，后期可用开放性问题**

**问题数量：1个（动态生成，智能判断何时停止）**

**🚨🚨🚨 停止提问的条件（满足任一即返回空数组[]）：**
1. 所有关键事件的核心信息都已回答
2. 检测到重复提问（最近两次回答谈同一件事）
3. 用户明确表示已经回答过
4. 问题超过5个（强制停止）

**⚠️ 不要为了凑问题数量而继续问！信息足够就立即停止！**

**⚠️⚠️⚠️ 强制终止规则（必须返回空数组的情况）：**

${previousAnswers && previousAnswers.length > 0 ? (() => {
  let gaoKaoCount = 0;
  previousAnswers.forEach(ans => {
    if (ans.includes('高考') || ans.includes('失利') || ans.includes('补习') || ans.includes('在家') || ans.includes('教室') || ans.includes('单词')) {
      gaoKaoCount++;
    }
  });
  
  if (gaoKaoCount >= 2) {
    return `🚨🚨🚨 死刑线：高考已经问了${gaoKaoCount}次！
    
**你现在必须做的：**
1. 检查元键入中是否还有其他未问过的事件
2. 如果有（如"出国读书"），必须问那个事件
3. 如果没有其他事件，返回空数组 {"questions": []}

**绝对禁止：**
❌ 不要再问任何高考相关的问题！
❌ 不要问"高考失利后..."
❌ 不要问"在哪里复习"
❌ 不要问任何和高考、补习、复习相关的问题

如果你发现自己还在想问高考相关的问题，立即停止，返回空数组！`;
  }
  return '';
})() : ''}

**问题分配策略（AI智能判断，不固定数量）：**
- 优先询问：用户提到的关键事件的具体内容
- 其次询问：大范围地点（能生成室外场景）
- 最后询问：用户状态（如有需要）
- **当信息足够时立即返回空数组[]，不要继续问**

**⚠️ 智能停止条件（满足任一即停止）：**
- 所有关键事件都问过了
- 用户回答中已包含足够的视觉信息
- 检测到重复提问
- 用户表示已经回答过

**🏢 地点提问原则（重要！）**：
**优先问大范围地点（能产生室外场景）：**
- ✅ 正确："公司在哪？" → 能得到"xx区"、"xx路"等室外场景信息
- ✅ 正确："咖啡馆在哪里？" → 能得到具体位置，可生成室外环境
- ✅ 正确："在哪里工作？" → 能得到地理位置
- ❌ 错误："在公司的哪个区域工作？" → 只能得到室内细节（会议室、工位），无法生成室外场景
- ❌ 错误："在咖啡馆的哪个位置？" → 只是室内细节

**为什么优先问大范围地点？**
→ 大范围地点能生成室外场景（建筑外观、街道、周边环境）
→ 室内细节无法生成室外画面，场景会很单调

**问题配置（根据当前对话动态生成）：**

**基于用户元键入和当前回答，智能生成下一个问题：**

**动态问题生成逻辑（不要使用固定模板！）：**

**第一轮：** 基于用户元键入的第一个活动生成问题
- 分析用户提到的第一个活动
- 动态生成询问该活动具体内容的问题

**第二轮：** 基于用户回答，分析还缺少什么信息
- 如果活动内容已收集，问地点/环境
- 如果该活动信息完整，问下一个活动
- 不要重复问已回答的内容

**第三轮：** 继续收集其他活动信息
- 分析还有哪些活动没有询问
- 动态生成针对该活动的问题

**最后：** 收集用户状态
- 所有活动信息收集完毕后，询问用户今天的状态

**⚠️ 关键：不要重复问已回答的问题！**

**动态问题生成示例（通用逻辑）：**

**示例1：用户元键入 "我高考失利 很难过 后来出国读书了 很开心"**

**元键入分析：**
- 关键事件1：高考失利（很难过）
- 关键事件2：出国读书（很开心）
- 总共2个关键事件，需要覆盖所有事件

**❌ 错误的提问方式（一直问高考，没有覆盖出国读书）：**
1. 问："高考失利时在哪里？"（问高考 - 第1次）
   回答："在家呗 一晚上没睡好"
2. 问："在哪里复习的？"（还在问高考相关！- 第2次）
   回答："在很多人的教室 教英语单词"
3. 问："高考失利后你在做什么？"（还是问高考！！- 第3次）
   ❌❌❌ 这是第3次问高考了！应该返回空数组[]！
❌ 结果：3个问题都在问高考，完全没有问"出国读书"！

**🚨 检测逻辑：如果回答中包含"在家"、"教室"、"补习"、"单词"等高考相关词汇，标记为"已问过高考"！**

**✅ 正确的提问方式（覆盖多个关键事件）：**
1. 问："高考失利时在哪里？当时环境是怎样的？"（第1个问题：覆盖高考）
2. 问："后来出国读书是去了哪里？有什么印象深刻的场景吗？"（第2个问题：**必须转向出国读书**）
3. 问："现在感觉怎么样？和之前相比有什么变化？"（第3个问题：覆盖状态变化）
✅ 结果：覆盖了高考、出国读书、状态变化

**⚠️ 关键规则：如果高考已经问过1-2次，第3个问题必须问出国读书！不要一直问同一个事件！**

**示例2：用户元键入 "我今天吃了云海肴 开了会 点了意面 上了课"**

**正确对话流程（覆盖多个活动）：**
1. 第一轮：问第一个活动的具体内容和地点
2. 第二轮：问其他活动的具体内容（不要在第一个活动上过度深挖）
3. 第三轮：问用户今天的状态

**❌ 错误行为（绝对禁止）：**
- 用户已回答某活动的具体内容，还重复问该活动的内容 → 死刑！
- 用户已回答某信息，还用相同或相似的问题再问一次 → 死刑！
- 在一个活动上过度深挖，忽略元键入中的其他关键事件 → 死刑！
- 使用固定的问题模板，不根据用户实际回答动态生成 → 死刑！

**✅ 正确行为：**
- 分析用户元键入，提取所有关键事件/活动/状态
- 覆盖元键入中的多个关键点，不要只深挖一个点
- 分析用户回答，标记已收集的信息
- 基于已收集信息，动态生成下一个最需要的问题
- 不使用固定模板，根据实际情况灵活生成
- 信息完整后返回空数组

**信息收集目标（动态确定）：**
- 分析用户元键入，提取所有活动
- 为每个活动收集：具体内容、地点环境
- 最后收集：用户今天的状态

**🚨🚨🚨 生成问题前的强制检查清单（全部✅才能生成问题）：**

1. ✅ **地点检查**：用户是否已回答地点位置（路名/区域）？
   - 如果已回答 → 绝对不能再问：在哪、哪个区域、具体位置、公司在哪
   
2. ✅ **环境检查**：用户是否已回答周边环境（商圈/楼下/周围）？
   - 如果已回答 → 绝对不能再问：环境怎样、周边有什么、环境特点
   
3. ✅ **信息覆盖**：元键入中是否有多个事件？
   - 如果有 → 不要只问一个事件，要覆盖所有事件
   
4. ✅ **问题相似度**：和之前的问题是否相似？
   - 如果相似 → 返回[]，不要生成

**如果以上任何一条未通过，必须返回空数组 {"questions": []}！**

**最终检查：**
□ 是否基于用户当前回答生成问题？（不要重复问已回答的问题）
□ 是否询问了最需要的信息？（场景细节或用户状态）
□ 是否避免了心理分析？（不问"心态"、"角色"、"感受"）
□ 问题是否能为生图提供精准信息？（场景+状态）
□ **是否检查了地点和环境是否已回答？**（最重要！）

**返回格式（标准JSON）：**

**🚨🚨🚨 强制要求：只返回1个问题！不要返回多个！**

**如果还有需要收集的信息：**
{
  "questions": ["只返回1个问题，不要数组里放多个！"]
}

**如果所有信息都已收集（不要再问问题）：**
{
  "questions": []
}

**JSON格式要求：**
❌ 不能使用中文逗号（，） → 必须用英文逗号（,）
❌ 不能使用中文冒号（：） → 必须用英文冒号（:）
❌ 不能使用中文引号（""） → 必须用英文引号（""）
❌ 不要在questions数组里放多个问题 → 只放1个！
✅ 只返回JSON，不要其他内容

**示例（正确）：**
{"questions": ["为什么那时候会特别想他？"]}

**示例（错误）：**
{"questions": ["问题1？", "问题2？"]} ← 不要这样！只要1个！`

  // 构建用户消息，把重复检测放在最前面
  const userMessage = `
🚨🚨🚨 【紧急！先检查是否应该停止提问！】🚨🚨🚨

之前问过的问题：${previousQuestions && previousQuestions.length > 0 ? previousQuestions.join(' | ') : '无'}

用户之前的回答：${previousAnswers && previousAnswers.length > 0 ? previousAnswers.join(' | ') : '无'}

🔥🔥🔥 **第一步：检测用户是否已经不耐烦**
${previousAnswers && previousAnswers.length > 0 ? (() => {
  const allAnswers = previousAnswers.join(' ');
  if (allAnswers.includes('无语') || allAnswers.includes('真无语') || allAnswers.includes('说过了')) {
    return `🚨🚨🚨 用户说"无语"或"说过了"！用户已经不耐烦了！
    
**立即返回 {"questions": []} 停止提问！不要生成任何新问题！**`;
  }
  return '';
})() : ''}

🔥🔥🔥 **第二步：检查组合问题中的每个部分是否都已回答**
${previousAnswers && previousAnswers.length > 0 ? (() => {
  const allAnswers = previousAnswers.join(' ');
  const alreadyAnswered = [];
  
  if (allAnswers.includes('穿') || allAnswers.includes('白色') || allAnswers.includes('T恤')) {
    alreadyAnswered.push('穿着（穿白色T恤）');
  }
  if (allAnswers.includes('开会') || allAnswers.includes('会议') || allAnswers.includes('一起')) {
    alreadyAnswered.push('场合（开会/会议）');
  }
  
  if (alreadyAnswered.length >= 2) {
    return `🚨🚨🚨 警告：用户已回答 ${alreadyAnswered.join(' 和 ')}
    
如果你想问"当时穿什么？在什么场合？"这种组合问题：
- 穿着已回答 → 不能问
- 场合已回答 → 不能问
→ 两个都已回答，必须返回 {"questions": []} 停止！

**不要问已经回答过的任何内容！**`;
  }
  return '';
})() : ''}

🔥🔥🔥 **死刑规则：检查相似度！**
- 如果之前问过"什么情况下发现" → 禁止再问"什么场合下发现"
- 如果之前问过"当时发生什么" → 禁止再问"当时具体怎么样"
- 相似的问题 = 重复 → 死刑！

强制检查：
${previousAnswers && previousAnswers.length > 0 ? (() => {
  const allAnswers = previousAnswers.join(' ');
  const warnings = [];
  
  if (allAnswers.includes('路') || allAnswers.includes('区') || allAnswers.includes('街') || allAnswers.includes('淞虹路') || allAnswers.includes('淞沪路')) {
    warnings.push('❌ 地点已回答！禁止再问：公司在哪、哪个区域、哪里、在什么地方');
  }
  if (allAnswers.includes('商圈') || allAnswers.includes('楼下') || allAnswers.includes('周边') || allAnswers.includes('环境')) {
    warnings.push('❌ 环境已回答！禁止再问：周边环境、环境怎样、什么环境');
  }
  if (allAnswers.includes('穿') || allAnswers.includes('衣服') || allAnswers.includes('T恤') || allAnswers.includes('裤子') || allAnswers.includes('白色')) {
    warnings.push('❌ 穿着已回答！禁止再问：穿什么、什么衣服、穿了什么、穿的什么、当时穿什么、当时你穿什么');
  }
  if (allAnswers.includes('开会') || allAnswers.includes('会议') || allAnswers.includes('一起开会')) {
    warnings.push('❌ 场合已回答（开会/会议）！禁止再问：什么场合、在什么场合下、什么情况下看到、在什么场合看到');
  }
  if (allAnswers.includes('6块钱') || allAnswers.includes('六块钱') || allAnswers.includes('花了') || allAnswers.includes('淘宝')) {
    warnings.push('❌ 6块钱解决问题已回答！禁止再问：怎么操作的、怎么解决的、具体怎么做的');
  }
  if (allAnswers.includes('老板') || allAnswers.includes('激动') || allAnswers.includes('反应') || allAnswers.includes('表情') || allAnswers.includes('动作')) {
    warnings.push('❌ 老板反应已回答！禁止再问：老板什么反应、老板表情、老板动作、其他同事反应');
  }
  if (allAnswers.includes('顾问') || allAnswers.includes('拍手') || allAnswers.includes('叫好')) {
    warnings.push('❌ 顾问反应已回答！禁止再问：顾问做什么、同事反应');
  }
  if (allAnswers.includes('面试') || allAnswers.includes('work from home') || allAnswers.includes('兼职') || allAnswers.includes('fulltime') || allAnswers.includes('看结果')) {
    warnings.push('❌ 面试情况已回答！禁止再问：老板说了什么、老板怎么表现的、面试环境、老板穿着');
  }
  if (allAnswers.includes('开放') || allAnswers.includes('美国思维') || allAnswers.includes('随意') || allAnswers.includes('灵活')) {
    warnings.push('❌ 老板风格已回答！禁止再问：老板有什么特点、老板怎么表现的、让你觉得怎样');
  }
  if (allAnswers.includes('自尊心') || allAnswers.includes('受伤') || allAnswers.includes('压我') || allAnswers.includes('撑场面') || allAnswers.includes('取代人') || allAnswers.includes('降本增效')) {
    warnings.push('❌ 实际工作体验已回答！禁止再问：老板哪些行为、具体行为、什么场景、让你觉得怎样、什么事情、哪些事情');
  }
  
  // 🚨🚨🚨 核心事件完整性检测（最重要！）
  const hasInterviewInfo = allAnswers.includes('work from home') || allAnswers.includes('兼职') || allAnswers.includes('看结果')
  const hasRealWorkInfo = allAnswers.includes('自尊心') || allAnswers.includes('压我') || allAnswers.includes('取代人') || allAnswers.includes('降本增效')
  
  if (hasInterviewInfo && hasRealWorkInfo) {
    warnings.push('🚨🚨🚨 两个核心事件都已回答（面试期望 + 实际发现）！信息已完整！必须立即返回 {"questions": []} 停止提问！')
  }
  if (allAnswers.includes('说过了') || allAnswers.includes('已经说了') || allAnswers.includes('回答过了')) {
    warnings.push('🚨🚨🚨 用户说"我说过了"！立即返回空数组停止提问！');
  }
  // 移除硬性的3个问题限制，改为智能判断
  // 只在问题过多时警告（5个以上才强制停止）
  if (previousAnswers.length >= 5) {
    warnings.push('🚨 已经问了' + previousAnswers.length + '个问题！必须返回 {"questions": []} 结束提问！');
  }
  
  if (warnings.length > 0) {
    return '\n' + warnings.join('\n') + '\n\n🚨🚨🚨 如果有任何警告，必须立即返回空数组 {"questions": []} 停止提问！\n🚨🚨🚨 特别是"两个核心事件都已回答"的警告，说明信息已完整，绝对不能再问！\n\n';
  }
  return '';
})() : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━

用户元键入：${initialPrompt || userInput}
用户当前输入：${userInput}

🎯 【元键入分析 - 必须做】：
分析元键入中有几个关键事件/活动：
${(() => {
  const prompt = initialPrompt || userInput;
  const allAnswers = previousAnswers ? previousAnswers.join(' ') : '';
  const events = [];
  
  // 检测idea/产品事件
  if (prompt.includes('idea') || prompt.includes('产品') || prompt.includes('想到')) {
    const hasAnswered = allAnswers.includes('idea') || allAnswers.includes('产品') || allAnswers.includes('ai') || allAnswers.includes('用户体验') || allAnswers.includes('心理场景');
    if (hasAnswered) {
      events.push('❌ 事件1：想到产品idea（已回答！不能再问！）');
    } else {
      events.push('✅ 事件1：想到产品idea（还没问过，可以问）');
    }
  }
  
  // 检测来公司事件
  if (prompt.includes('公司') || prompt.includes('来了') || prompt.includes('上班')) {
    const hasAnswered = allAnswers.includes('路') || allAnswers.includes('区') || allAnswers.includes('街') || allAnswers.includes('商圈') || allAnswers.includes('环境');
    if (hasAnswered) {
      events.push('❌ 事件2：来公司/上班（已回答！不能再问！）');
    } else {
      events.push('✅ 事件2：来公司/上班（还没问过，可以问）');
    }
  }
  
  // 检测开会事件（重要！）
  if (prompt.includes('开会') || prompt.includes('会议')) {
    const hasAnswered = allAnswers.includes('穿') || allAnswers.includes('衣服') || allAnswers.includes('老板') || allAnswers.includes('顾问') || allAnswers.includes('反应') || allAnswers.includes('激动');
    if (hasAnswered) {
      events.push('❌ 事件3：开会/会议（已回答！不能再问！）');
    } else {
      events.push('✅ 事件3：开会/会议（还没问过！核心事件！）');
    }
  }
  
  // 检测"上次"的事件（6块钱解决问题）
  if (prompt.includes('上次') || prompt.includes('6块钱') || prompt.includes('解决') || prompt.includes('资产')) {
    const hasAnswered = allAnswers.includes('6块钱') || allAnswers.includes('六块钱') || allAnswers.includes('花了六') || allAnswers.includes('淘宝') || allAnswers.includes('爬虫');
    if (hasAnswered) {
      events.push('❌ 事件4：上次6块钱解决资产问题（已回答！不能再问怎么操作的！）');
    } else {
      events.push('✅ 事件4：上次用6块钱解决资产问题（可以问详情！）');
    }
  }
  
  // 检测老板/领导相关
  if (prompt.includes('老板') || prompt.includes('自尊心') || prompt.includes('受挫')) {
    const hasAnswered = allAnswers.includes('老板') || allAnswers.includes('自尊心') || allAnswers.includes('受挫');
    if (hasAnswered) {
      events.push('❌ 事件5：老板自尊心受挫（已回答）');
    } else {
      events.push('✅ 事件5：老板的反应和心理（重要！可以深挖！）');
    }
  }
  
  // 检测面试相关
  if (prompt.includes('面试') || prompt.includes('当初') || prompt.includes('以为')) {
    const hasAnswered = allAnswers.includes('面试') || allAnswers.includes('work from home') || allAnswers.includes('兼职') || allAnswers.includes('看结果') || allAnswers.includes('随意');
    if (hasAnswered) {
      events.push('❌ 事件：面试经历（已回答！不能再问老板说了什么、怎么表现、穿着等！）');
    } else {
      events.push('✅ 事件：面试经历（还没问过！重要！）');
    }
  }
  
  // 检测工作体验/发现真相相关
  if (prompt.includes('深入') || prompt.includes('结果') || prompt.includes('发现') || prompt.includes('实际') || prompt.includes('骨子里') || prompt.includes('中国老男人')) {
    const hasAnswered = allAnswers.includes('深入') || allAnswers.includes('发现') || allAnswers.includes('实际情况') || allAnswers.includes('后来') || allAnswers.includes('自尊心') || allAnswers.includes('受伤') || allAnswers.includes('压我') || allAnswers.includes('撑场面') || allAnswers.includes('老男人') || allAnswers.includes('取代人') || allAnswers.includes('降本增效') || allAnswers.includes('不想用人') || allAnswers.includes('ai');
    if (hasAnswered) {
      events.push('❌ 事件：实际工作体验（已回答！包括自尊心、压我、撑场面、取代人、降本增效等！绝对不能再问任何相关问题！）');
    } else {
      events.push('✅ 事件：实际工作体验和发现（重要！可以问！）');
    }
  }
  
  return events.length > 0 ? events.join('\n') : '只有1个事件';
})()}

**🎯 必读提示：**
- 如果元键入中提到"上次"和"这次"，说明有2个不同的时间点，必须都问！
- 如果提到老板、同事等人物，必须问人物的具体表现！
- 如果是会议/开会场景，必须问：1)穿搭 2)人物反应 3)会议内容 4)你的感受
- 不要过早结束！除非所有关键人物、事件、细节都问到了！

🎯 下一个问题应该问：

**🚨🚨🚨 第一步：检查是否已采集感受（强制检查！）🚨🚨🚨**
${previousAnswers && previousAnswers.length > 0 ? (() => {
  const allAnswers = previousAnswers.join(' ');
  const allQuestions = (previousQuestions || []).join(' ');
  
  // 检查是否问过感受相关的问题
  const hasAskedFeelings = allQuestions.includes('感受') || 
                           allQuestions.includes('感觉') || 
                           allQuestions.includes('想法') ||
                           allQuestions.includes('心里') ||
                           allQuestions.includes('为什么') && allQuestions.includes('？');
  
  // 检查用户是否主动表达了情绪
  const userExpressedEmotion = allAnswers.includes('开心') || 
                                allAnswers.includes('难过') ||
                                allAnswers.includes('生气') ||
                                allAnswers.includes('害怕') ||
                                allAnswers.includes('想念') ||
                                allAnswers.includes('冷笑') ||
                                allAnswers.includes('无语') ||
                                allAnswers.includes('笑死') ||
                                allAnswers.includes('失望');
  
  if (!hasAskedFeelings && !userExpressedEmotion) {
    return `
🚨🚨🚨 警告：还没有采集用户感受！
- 之前的问题：${(previousQuestions || []).join(' | ')}
- 检测结果：未包含感受询问
- **强制要求：本次问题必须问感受！不能再跳过！**
- 必须问："当时你什么感受？"、"你心里在想什么？"、"为什么会这样？"

**感受是心理剧的核心！没有感受数据就无法生成心理剧！必须采集！**
`;
  } else if (hasAskedFeelings || userExpressedEmotion) {
    return `
✅ 感受已采集（${hasAskedFeelings ? '通过问题询问' : '用户主动表达'}）
- 可以继续问其他信息（场景细节、地点等）
`;
  }
  return '';
})() : `
🚨 这是第一个问题！
**强制要求：第一个问题必须包含感受询问！**
- ✅ 可以问："在XX时，你什么感觉？"
- ✅ 可以问："当时你心里在想什么？"
- ❌ 不要只问事实细节而不问感受！
`}

**第二步：分析事件覆盖情况**
- 看上面的事件分析，优先问标记为"✅还没问过"或"✅...重要！"的事件
- 绝对不能问标记为"❌已回答"的事件
- **⚠️ 只有当所有事件都标记为❌时，才能返回空数组！**
- **如果还有任何✅标记的事件，必须继续问！**
- 特别关注标记为"重要！"或"核心事件！"的事件，这些必须要问

生成1个新问题（如果需要）：`
  
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ]

  try {
    const response = await chatWithDoubao(messages)
    
    if (!response.success || !response.content) {
      return {
        success: false,
        error: response.error || '生成问题失败'
      }
    }

    // 尝试解析JSON响应
    try {
      let content = response.content
      
      // 清理JSON格式 - 移除```json标记
      if (content.includes('```json')) {
        content = content.replace(/```json\s*/, '').replace(/```\s*$/, '').trim()
      }
      if (content.includes('```')) {
        content = content.replace(/```\s*/, '').replace(/```\s*$/, '').trim()
      }
      
      // 清理中文标点符号
      content = content.replace(/，/g, ',')  // 中文逗号→英文逗号
      content = content.replace(/：/g, ':')  // 中文冒号→英文冒号
      content = content.replace(/"/g, '"').replace(/"/g, '"')  // 中文引号→英文引号
      
      console.log('🧹 [QUESTION-GEN] 清理后的JSON:', content)
      
      const parsed = JSON.parse(content)
      
      return {
        success: true,
        questions: parsed.questions || [],
        enhancedPrompt: parsed.enhancedPrompt || '',
        userProfile: parsed.userProfile || ''
      }
    } catch (parseError) {
      console.error('❌ JSON解析失败:', parseError)
      console.log('📄 原始内容:', response.content)
      
      // 如果不是JSON格式，尝试从文本中提取信息
      const content = response.content
      const questionsMatch = content.match(/问题[：:]\s*([^\n]+)/g)
      const questions = questionsMatch ? questionsMatch.map(q => q.replace(/问题[：:]\s*/, '').trim()) : []
      
      return {
        success: true,
        questions: questions.length > 0 ? questions : await generateDynamicFallbackQuestions(userInput),
        enhancedPrompt: content.includes('提示词') ? 
          content.split('提示词')[1]?.trim() || content : content
      }
    }
  } catch (error) {
    console.error('深度提问生成错误:', error)
    console.error('API调用失败，使用备用问题生成逻辑')
    
    // 即使API失败，也尝试生成备用问题
    try {
      const fallbackQuestions = await generateDynamicFallbackQuestions(userInput)
      console.log('✅ 备用问题生成成功:', fallbackQuestions)
      return {
        success: true,
        questions: fallbackQuestions,
        enhancedPrompt: '基于用户输入的个性化提示词',
        userProfile: '基于输入分析的用户画像',
        isFallback: true // 标记这是备用问题
      }
    } catch (fallbackError) {
      console.error('备用问题生成也失败:', fallbackError)
      return {
        success: false,
        error: error instanceof Error ? error.message : '深度提问生成失败'
      }
    }
  }
}

// ✂️ 已废弃：此函数未被使用，且依赖已删除的sceneInferenceEngine
/*
export async function generateFinalPrompt(userInput: string, userAnswers: string[]): Promise<DoubaoResponse> {
  // 导入用户信息服务和场景推测引擎
  const { generateSoulfulPrompt } = await import('./sceneInferenceEngine')
  
  // 获取用户信息（纯API调用）
  const userInfo = await getUserInfo()
  const userMetadata = await getUserMetadata()
  
  // 🔥 使用优先级系统构建用户描述
  // 优先级：用户键入 > 基本信息 > AI分析
  const prioritizedDescription = await buildPrioritizedUserDescription(userInfo, userMetadata)
  
  console.log('📊 [FINAL-PROMPT] 使用优先级用户数据')
  console.log('🔥 [FINAL-PROMPT] 优先级描述:', prioritizedDescription)
  
  // 尝试获取星盘超深度分析（从Prisma）
  let deepAstrologicalAnalysis = null
  try {
    const response = await fetch('/api/user/info')
    if (response.ok) {
      const data = await response.json()
      if (data.userMetadata?.deepAstrologicalAnalysis) {
        deepAstrologicalAnalysis = JSON.parse(data.userMetadata.deepAstrologicalAnalysis)
        console.log('✨ [FINAL-PROMPT] 获取到星盘超深度分析')
      }
    }
  } catch (error) {
    console.log('ℹ️ [FINAL-PROMPT] 未获取到星盘分析（不影响生成）')
  }
  
  // 🔮 使用深度场景推测生成有灵魂的提示词
  console.log('🔮 [FINAL-PROMPT] 启用深度场景推测引擎...')
  try {
    const soulfulPrompt = await generateSoulfulPrompt(
      userInfo,
      userMetadata,
      `${userInput} ${userAnswers.join(' ')}`,
      deepAstrologicalAnalysis
    )
    
    console.log('✨ [FINAL-PROMPT] 有灵魂的提示词已生成')
    
    return {
      success: true,
      content: soulfulPrompt
    }
  } catch (soulfulError) {
    console.log('⚠️ [FINAL-PROMPT] 场景推测失败，使用标准流程')
  }
  
  const systemPrompt = `你是一个专业的AI图像提示词生成专家。你的任务是生成给AI图像生成模型使用的英文提示词。

**严格优先级要求：**
1. **第一优先级**：用户的真实输入（如"被前女友告上法庭，成为失信人"）是最重要的，必须重点体现
2. **第二优先级**：用户的自我认知部分（如"本来是播音艺考生 是那种搞黑帮在外面就把夜店混的 穿搭是陈冠希风格 然后从大一开始创业..."）比系统分析更重要
3. **第三优先级**：系统生成的深度分析数据作为补充
4. **删除模版场景**：不要使用固定的回忆、闪回等模版场景

**关键要求：**
- **人物一致性**：必须准确体现用户的性别、年龄、外貌特征
- **核心内容体现**：必须包含用户真实输入的核心内容（如"法庭"、"法律纠纷"、"失信人"等）
- **真实情况反映**：场景要基于用户实际情况，不要虚构优雅场景

**格式要求（严格遵守）：**
每个场景独立一行，格式如下：
Scene 1: [详细英文描述]
Scene 2: [详细英文描述]
Scene 3: [详细英文描述]
Scene 4: [详细英文描述]

**生成要求：**
- 每个场景会生成单独的图片，不要把场景合并
- 场景要具体、真实，基于用户实际情况
- 严格按照优先级顺序：真实输入 > 自我认知 > 系统分析
- 必须确保人物特征与用户信息一致
- 直接返回4个Scene，不要其他解释`
  
  // 构建基于用户分析数据的个性化提示词
  const userAnalysisPrompt = userMetadata && userMetadata.corePersonalityTraits ? `
用户深度分析档案：
- 核心性格特质：${userMetadata.corePersonalityTraits.join('、')}
- 沟通风格特征：${userMetadata.communicationStyle?.join('、') || ''}
- 情感模式特征：${userMetadata.emotionalPattern?.join('、') || ''}
- 决策风格特征：${userMetadata.decisionMakingStyle?.join('、') || ''}
- 职业天赋倾向：${userMetadata.careerAptitude?.join('、') || ''}
- 感情关系模式：${userMetadata.relationshipPattern?.join('、') || ''}
- 人生哲学：${userMetadata.lifePhilosophy?.join('、') || ''}
- 天然优势：${userMetadata.naturalStrengths?.join('、') || ''}
- 个人挑战：${userMetadata.personalChallenges?.join('、') || ''}
- 时尚风格倾向：${userMetadata.fashionStyleTendencies?.join('、') || ''}
- 生活方式爱好：${userMetadata.lifestyleHobbies?.join('、') || ''}
- 星座：${userMetadata.zodiacSign || ''}
- 生肖：${userMetadata.chineseZodiac || ''}
` : ''
  
  // 获取用户的自我认知部分（第二优先级）
  const userSelfCognition = userInfo.personality || ''
  
  // 星盘超深度分析（用于背景氛围，10%权重）
  const astrologicalContext = deepAstrologicalAnalysis ? `
**星盘背景分析（10%权重 - 仅用于场景氛围）：**
- 核心特质（来自用户）：${deepAstrologicalAnalysis.corePersonality?.slice(0, 3).join('、') || ''}
- 场景关键词：${deepAstrologicalAnalysis.sceneKeywords?.slice(0, 5).join(', ') || ''}
- 星座背景：${deepAstrologicalAnalysis.astrologicalContext?.interpretation || ''}
` : ''
  
  const context = `**第一优先级 - 用户真实输入（90%权重，最重要）：** ${userInput}

**第二优先级 - 用户自我认知（85%权重）：** ${userSelfCognition}

**第三优先级 - 系统分析数据（50%权重）：**
${userAnalysisPrompt}

${astrologicalContext}

用户基本信息：${userInfoDescription || ''}

用户回答：${userAnswers.join(' | ')}

**场景生成优先级要求：**
1. **第一优先级**：必须围绕用户真实输入的核心内容（如"被前女友告上法庭，成为失信人"）
2. **第二优先级**：体现用户自我认知中的具体经历（如创业经历、情感经历、性格变化等）
3. **第三优先级**：结合系统生成的深度分析数据
4. **删除模版场景**：不要使用"回忆"、"闪回"等模版场景
5. **基于真实情况**：场景要反映用户实际的生活状态和经历

**关键提醒：**
- **人物一致性**：用户是${userInfo.age || '26'}岁中国${isMale ? '男性' : '女性'}，身高${userInfo.height || '165'}cm，体重${userInfo.weight || '55'}kg，必须准确体现
- **地点准确性**：所有场景必须在${userInfo.location || '上海'}发生，不能改为其他城市
- **核心内容体现**：场景必须围绕用户真实输入"${userInput}"的核心内容
- **真实情况反映**：基于用户的实际回答生成场景，不添加没提到的内容
- **用户真实输入最重要**：必须重点体现用户的核心输入内容

请严格按照上述优先级，根据用户的真实输入、自我认知和系统分析，生成一个包含4个连贯生活场景的英文AI图像生成提示词。

**格式要求：**
Scene 1: [场景1的详细英文描述]
Scene 2: [场景2的详细英文描述]  
Scene 3: [场景3的详细英文描述]
Scene 4: [场景4的详细英文描述]

**生成要求：**
- 必须围绕用户原始输入的核心内容
- 体现用户的基本信息：年龄、性别、身高、体重、所在地
- 结合用户的性格特征和经历
- 场景要具体、真实，不要虚构
- 包含具体的穿搭风格描述

请直接返回英文提示词，不要其他解释。`

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: context }
  ]

  return await chatWithDoubao(messages)
}
*/

// 分析用户输入的功能已删除，现在直接基于用户分析数据生成个性化问题
