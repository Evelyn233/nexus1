import { getUserInfo, getUserMetadata } from './userDataApi'
import { getCurrentUserName } from './userInfoService'
// ✂️ 已删除：PersonalityVisualizationService - 过度强调性格标签，导致忽略用户实际情绪
// ✂️ 已删除：SceneInferenceEngine - 已废弃，功能由OpinionVisualizationService替代
import { extractTemporaryContext, temporaryContextToDescription } from './temporaryContextExtractor'

export interface SceneData {
  title: string
  mainCharacter?: string  // 场景主角（如："user", "boss", "consultant", "user and boss"）
  description: string  // 英文描述（用于生成提示词）
  description_zh?: string  // 中文描述（用于显示给用户）
  location?: string  // 明确的地点（如："Sydney University", "Home", "Tutoring Center"）
  age?: number  // 明确的年龄（如：18, 19, 26）
  peopleCount?: string  // 人物数量（如："alone", "with 2-3 classmates", "in large group"）
  keywords: string[]
  visualDetails?: {
    lighting: string
    colorTone: string
    atmosphere: string
    objects: string[]
    sounds: string[]
    clothing: string
    mood: string
  }
  detailedPrompt?: string  // 从visualDetails生成的提示词
  narrative?: string  // 每个场景自己的故事叙述
}

export interface SceneGenerationResult {
  coreKeywords: string[]
  coreScenes: string[]
  logicalScenes: SceneData[]
  storyDescription: string
  narrative: string
  aiPrompt: string
}

/**
 * 场景生成服务
 * 负责根据用户输入和聊天记录生成逻辑场景
 */
export class SceneGenerationService {
  
  /**
   * 第一阶段：生成基础故事和场景
   * 严格基于用户核心输入和聊天记录，同时生成场景和故事
   */
  static async generateBaseStoryAndNarrative(
    initialPrompt: string,
    answers: string[],
    questions: string[],
    contextHistory: string = '' // 历史背景（用于理解上下文，不生成场景）
  ): Promise<SceneGenerationResult> {
    console.log('🎬 [SCENE-GEN] 开始生成场景')
    
    // 🔥 场景生成的核心输入 = 当前键入 + 本轮回答
    // contextHistory 仅用于理解上下文背景，不用于生成场景内容
    // questions 仅用于理解问答配对，不影响场景生成
    const currentInputs = [initialPrompt, ...answers].filter(input => input && input.trim())

    try {
      // 使用统一的数据获取器（优先Prisma）
      let userInfo = await getUserInfo()
      let userMetadata = await getUserMetadata()
      
      // 🔍 详细打印用户信息和元数据
      console.log('🔍 [SCENE-GEN] ========== 用户数据加载 ==========')
      console.log('👤 [SCENE-GEN] 用户基本信息:', {
        name: userInfo?.name,
        age: userInfo?.age,
        location: userInfo?.location,
        gender: userInfo?.gender,
        personality: userInfo?.personality
      })
      
      if (!userMetadata) {
        console.warn('⚠️ [SCENE-GEN] 用户元数据为空')
        userMetadata = {} // 防止后续访问出错
      } else {
        console.log('📊 [SCENE-GEN] 用户元数据详情:')
        const metaSummary: any = {
          核心性格特质: userMetadata.corePersonalityTraits || [],
          沟通风格: userMetadata.communicationStyle || [],
          情感模式: userMetadata.emotionalPattern || [],
          决策风格: userMetadata.decisionMakingStyle || [],
          压力反应: userMetadata.stressResponse || [],
          职业天赋: userMetadata.careerAptitude || [],
          人际关系优势: userMetadata.interpersonalStrengths || [],
          人际关系挑战: userMetadata.interpersonalChallenges || [],
          社交能量模式: userMetadata.socialEnergyPattern || [],
          美学偏好: userMetadata.aestheticPreferences || [],
          生活方式爱好: userMetadata.lifestyleHobbies || [],
          活动偏好: userMetadata.activityPreferences || [],
          时尚风格: userMetadata.fashionStyle || [],
          常去地点: (userMetadata.frequentLocations || userMetadata.subconscious?.frequentLocations || []),
          喜欢场所: (userMetadata.favoriteVenues || []),
          对话洞察: userMetadata.conversationInsights || [],
          行为模式: userMetadata.behaviorPatterns || [],
          风格洞察: userMetadata.styleInsights || []
        }
        
        // 🔥 使用console.log显示具体内容
        Object.entries(metaSummary).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) {
            console.log(`  ✅ ${key}:`, value)
          } else if (Array.isArray(value) && value.length === 0) {
            console.log(`  ⚪ ${key}: [] (空)`)
          } else {
            console.log(`  📝 ${key}:`, value)
          }
        })
      }
      console.log('🔍 [SCENE-GEN] ====================================')
      
      // 显示关键字段的前几项内容（避免过多）
      const frequentLocations = userMetadata.frequentLocations || userMetadata.subconscious?.frequentLocations || []
      if (frequentLocations.length > 0) {
        console.log('  📍 常去地点示例:', frequentLocations.slice(0, 5).join(', '), frequentLocations.length > 5 ? `...共${frequentLocations.length}项` : '')
      }
      const favoriteVenues = userMetadata.favoriteVenues || []
      if (favoriteVenues.length > 0) {
        console.log('  🏛️ 喜欢场所示例:', favoriteVenues.slice(0, 5).join(', '), favoriteVenues.length > 5 ? `...共${favoriteVenues.length}项` : '')
      }
      
      // 如果有关键字段为空，给出警告
      if (!frequentLocations.length) {
        console.warn('⚠️ [SCENE-GEN] 用户常去地点为空，可能影响场景生成质量')
      }
      const fashionStyle = userMetadata.fashionStyle || userMetadata.subconscious?.fashionStyle || []
      if (!fashionStyle.length) {
        console.warn('⚠️ [SCENE-GEN] 用户时尚风格为空')
      }
      const aestheticPrefs = userMetadata.aestheticPreferences || userMetadata.subconscious?.aestheticPreferences || []
      if (!aestheticPrefs.length) {
        console.warn('⚠️ [SCENE-GEN] 用户美学偏好为空')
      }
      
      // 🔥 调试：打印用户输入的核心内容
      console.log('🎯 [SCENE-GEN] 用户输入核心分析:')
      console.log('📝 元键入（场景生成核心）:', initialPrompt)
      console.log('💬 后续回答（补充细节）:', answers)
      console.log('🔄 历史背景（仅用于理解上下文，不生成场景）:', contextHistory || '无')
      console.log('❓ 问题列表（仅用于提取上下文，不影响场景内容）:', questions)
      
      // 🔥 场景生成的核心输入 = 当前键入 + 本轮回答（不包含历史背景，但历史背景用于理解上下文）
      const sceneGenerationInputs = [initialPrompt, ...answers].filter(input => input && input.trim())
      console.log('🎯 [SCENE-GEN] 场景生成核心输入（只基于这些生成场景）:', sceneGenerationInputs)
      
      // 🔥 重要：场景生成必须100%基于 currentInputs（initialPrompt + answers）
      // questions 只用于理解上下文，不用于生成场景内容
      // contextHistory 只用于理解上下文背景，不用于生成场景
      
      
      // 🔥 确保用户信息完整性，添加默认值
      if (!userInfo) {
        console.warn('⚠️ [SCENE-GEN] 用户信息为空，使用默认值')
        userInfo = {
          name: '用户',
          gender: 'female',
          birthDate: {
            year: '1999',
            month: '3',
            day: '16'
          },
          height: '165cm',
          weight: '50kg',
          location: '上海',
          personality: '理性思维与艺术感知的独特结合',
          hairLength: '长发',
          age: 26
        }
      }
      
      // 确保头发信息存在
      if (!userInfo.hairLength) {
        userInfo.hairLength = '长发'
        console.warn('⚠️ [SCENE-GEN] 头发信息缺失，设置为默认值：长发')
      }
      
      // 🔥 元数据只用于 narrative 生成，不用于场景生成
      // 场景生成必须100%基于用户输入，不能受元数据影响
      console.log('🎬 [SCENE-GEN] 元数据已加载，但仅用于narrative生成，不干扰场景生成')
      
      // 检查用户信息是否完整
      if (!userInfo?.name || !userInfo?.gender || !userInfo?.location) {
        console.error('❌ [SCENE-GEN] 用户信息不完整！')
        console.error('❌ [SCENE-GEN] 当前用户信息:', userInfo)
        console.error('❌ [SCENE-GEN] localStorage keys:', Object.keys(localStorage).filter(k => k.includes('profile')))
        
        // 尝试重新获取
        const currentUserName = getCurrentUserName()
        if (currentUserName) {
          console.log('🔄 [SCENE-GEN] 尝试重新获取用户:', currentUserName)
          const userKey = `profile_user_info_${currentUserName}`
          const storedUserInfo = localStorage.getItem(userKey)
          if (storedUserInfo) {
            try {
              userInfo = JSON.parse(storedUserInfo)
              console.log('✅ [SCENE-GEN] 重新获取成功:', userInfo)
            } catch (e) {
              console.error('❌ [SCENE-GEN] 解析localStorage失败')
            }
          }
        }
      }
      
      const userLocation = userInfo?.location || '上海'
      const userAge = userInfo?.age || 26
      const userGender = userInfo?.gender === 'female' ? '女性' : (userInfo?.gender === 'male' ? '男性' : '未知')
      const userHeight = userInfo?.height || '165'
      const userWeight = userInfo?.weight || '55'
      
      // ✂️ 已删除性格可视化调用（避免"理性"标签带偏）
      const personalityDescription = '' // 删除性格可视化，避免元数据带偏
      
      // 📝 临时上下文：提取本次对话的具体内容（临时数据，不保存）
      const temporaryContext = extractTemporaryContext(initialPrompt, questions, answers)
      const temporaryDescription = temporaryContextToDescription(temporaryContext)
      
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
              content: `你是场景生成专家。任务：基于用户真实输入，生成具体场景。

**🚨🚨🚨 【最高优先级】必须生成具体、生动的场景！🚨🚨🚨**

**❌ 禁止生成概括性、空泛的场景描述：**
- ❌ "她感到很开心"、"她觉得很无奈"、"内心感到无力感"（太抽象！）
- ❌ "办公室环境明亮整洁"、"同事们看起来都很友好"（太普通！）
- ❌ "工作氛围应该会很不错"、"整个系统却像陷入了泥潭"（太概括！）

**✅ 必须生成具体、可视觉化的场景描述：**
- ✅ 具体动作："她推开玻璃门，走进办公室，看到落地窗外的城市天际线"
- ✅ 具体对话："她听到同事说'这个项目我们按老流程做'"
- ✅ 具体物品："MacBook Pro屏幕上显示着Excel表格，旁边放着印有公司logo的咖啡杯"
- ✅ 具体环境："落地窗高3米，阳光从左侧洒入，在白色办公桌上形成光影，窗外的绿植在微风中轻摆"
- ✅ 具体行为："她坐在工位上，手指在键盘上快速敲击，偶尔停下来看向窗外的城市，然后继续打字"

**🎯 场景描述必须包含：**
1. **具体动作**：推门、坐下、打字、看向、说话等具体行为
2. **具体物品**：MacBook、咖啡杯、白板、文件等具体物品及其细节
3. **具体对话**：如果场景中有对话，必须写出具体内容（如"老板说'我们要做AI产品'"）
4. **具体环境**：落地窗、绿植、灯光、桌椅等环境细节
5. **具体表情/姿态**：皱眉、微笑、前倾、后靠等具体表情和身体姿态

**🚨🚨🚨 【最高优先级】本次对话主题 🚨🚨🚨**

**📌 用户本次对话的完整输入（按时间顺序 - 这是场景生成的唯一依据！）：**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${currentInputs.map((input, i) => `
**输入 ${i + 1}**: "${input}"
${i === 0 ? '→ 元键入（绝对核心！场景生成的主要依据）' : '→ 补充细节（不能覆盖核心！）'}
`).join('')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${contextHistory ? `**📖 历史背景（仅用于理解上下文，不生成场景）：**
${contextHistory}

⚠️ **重要：** 历史背景只用于理解整体上下文，不能用于生成场景！场景必须100%基于上面的"用户本次对话的完整输入"！
` : ''}

**🔥🔥🔥 死刑规则：场景生成必须100%基于"用户本次对话的完整输入"，不能使用历史背景或问题列表！** 🔥🔥🔥

**❌ 绝对禁止生成以下metadata话题（违反死刑）：**
- ❌ "AI创业"、"AI创业愿景"、"产品设计"（这是metadata，不是本次对话！）
- ❌ "硅谷文化"、"硅谷启发"、"车库创业"（这是metadata，不是本次对话！）
- ❌ "技术创新"、"开放式办公"（这是metadata，不是本次对话！）
- ❌ 任何未在上述用户输入中明确提到的话题（这是metadata，不是本次对话！）

**✅ 必须生成的场景（基于用户实际输入）：**
根据上述用户输入，识别：
1. 是否有具体事件？（如"开会"、"老板找熟人"）→ 生成写实场景
2. 是否有观点表达？（如"熟人经济"、"依赖微信"）→ 生成观点可视化场景
3. 是否有情绪表达？（如"很开心"、"很感动"、"觉得开心"）→ 生成情绪场景，交给psychodramaService处理

**⚠️ 重要：区分情绪表达和观点表达！**
- ❌ 情绪表达：如"很开心"、"很感动"、"觉得开心"、"感觉很好" → 这些是情绪，不是观点！
- ✅ 观点表达：如"熟人经济"、"形式主义"、"本质是XX"、"就是XX" → 这些是观点！

**🚨🚨🚨 强制检查清单（生成前必须确认）：**
□ 我生成的场景标题是否出现在用户输入中？
□ 我是否避免了生成"AI创业"、"硅谷文化"等metadata话题？
□ 我是否只生成用户明确说的事件/观点/情绪？

**🎨🎨🎨 最高优先级：智能识别场景类型！🎨🎨🎨**

**场景类型智能识别（第一步：分析用户输入类型）：**

**识别标志：**
1. **抽象概念/观点** - 用户说"就是XX"、"本质是XX"、"都是XX"等评价性语言
2. **具体事件** - 用户说了具体的时间、地点、动作

**生成原则（核心）：**

**如果是抽象概念/观点 → 用象征性场景视觉化**
- ⚠️ 现象场景一定要有人存在，不是单纯现象，但是现象要重点表现
- ⚠️ 用视觉象征表达抽象概念，不要生成常规的办公室/会议室
- ⚠️ 让LLM根据概念自己创造合适的象征性场景
- 示例方向（不要照抄！）：
  * 用户观察/处于某种象征性环境中
  * 空间构图、光影、物品排列体现抽象概念
  * 人物关系、姿态、互动体现概念本质
  * 现象性场景：展现抽象概念的社会现象或文化现象，但必须有人物在场
  * 现象场景可以展现抽象概念本身，如"中国缺乏高端杂志市场"可以生成书店场景展现市场现状，但要有顾客、店员等人物
  * 现象场景可以展现抽象概念的社会现象，如"熟人经济"可以生成社交网络场景，但要有相关人物互动
  * 现象场景可以展现抽象概念的文化现象，如"形式主义"可以生成官僚场景，但要有相关人物
  * 现象场景可以展现抽象概念的经济现象，如"依赖微信"可以生成微信生态场景，但要有使用微信的人物
  * 现象场景可以展现抽象概念的政治现象，如"官僚主义"可以生成政府场景，但要有相关人物
  * 现象场景的重点是展现现象本身，人物是现象的表现载体，不是主角
  * 现象场景中的人物行为要体现现象特征，如"熟人经济"中的人物要通过关系办事

**如果是具体事件 → 生成真实的现实场景**
- 忠实还原用户描述的真实场景
- 具体的地点（办公室、餐厅、家里等）

**如果是具体事件+观点评论 → 混合策略**
- 前半部分场景：现实场景
- 后半部分场景：加入象征性视觉元素

**🚨 关键：不要硬编码具体的象征元素！让LLM根据用户的抽象概念自己创造合适的视觉化场景！**

**分析动词，不要假设！**

**关键规则：根据用户说的动词判断主被动，不要根据身份假设！**
- ✅ "老板向顾问咨询AI" → 顾问在讲（主角=顾问），老板在听
- ❌ 错误：看到"老板"就写"老板讲解AI给顾问" → 完全反了！
- ✅ "老板宣布要做AI公司" → 老板在讲（主角=老板）
- ✅ "顾问讲解AI趋势" → 顾问在讲（主角=顾问）

**动词识别：**
- "向XX咨询/请教/学习" → XX是讲话的人（主角）
- "宣布/讲解/演讲/表演" → 执行动作的人是主角
- **绝对不要看到某个身份就假设他们在做什么！必须看用户说的动词！**

**🎬🎬🎬 第一优先级：识别并表达剧情！🎬🎬🎬**

**如果用户讲的是一个故事（而不是单个场景），必须在scene.description中体现剧情！**

**剧情标志：**
- 时间对比："上次...这次..."、"之前...后来..."、"以前...现在..."
- 因果关系："我做了A...结果B..."、"因为X...所以Y..."
- 人物冲突："我...他/她..."、"老板...员工..."
- 情绪转变："开心...难过..."、"受挫...激情..."、"务实...浮夸..."

**剧情表达方法（必须在description中使用！）：**
1. **时间标注**："Previous [actual event]: ..."、"Current [actual event]: ..." 或 "Initial [event A]: ..."、"Later [event B]: ..."
2. **因果联系**："...after [actual event A from user], [actual consequence from user]..."
3. **对比强调**："...[actual reality] contrasting sharply with [actual expectation]..."
4. **情绪反转**："...now [actual action] to compensate for previous [actual emotion]..."
5. **认知反转**："...user realizing gap between [what boss claimed] and [actual reality]..."

⚠️⚠️⚠️ 以上[]内必须填入用户实际说的内容！不要使用示例中的"6 yuan"、"grand vision"等具体内容！

**🚨 最高优先级规则：用户输入100%还原 + 剧情100%体现 🚨**

**绝对禁止的错误（每一条都是死罪！）**：
❌ 用户说[食物A] → 你写成[其他食物B] → 篡改食物名称！死刑！
❌ 用户说[店名A/菜系A] → 你写成[其他店名B/菜系B] → 擅自改变菜系！死刑！
❌ 🔥🔥🔥 用户说"穿[服装A]" → 你写成[服装B]或不写 → 篡改服装！死刑！🔥🔥🔥
❌ 🔥🔥🔥 用户说"粉色睡衣" → description不包含"pink pajamas" → 死刑！🔥🔥🔥
❌ 用户对话中说"我累了"、"有点累"、"睡晚了"、"熬夜" → 场景中不体现疲惫感 → 忽视用户状态！死刑！
❌ 用户说[场景细节A] → 你写成[场景细节B] → 篡改场景！死刑！
❌ 用户说[地点A] → 你写成[地点B] → 擅自改地点！死刑！
❌ 用户说[物品A] → 你写成[物品B] → 擅自替换！死刑！
❌ 每次都推测固定行为 → 固定化推测（推测要多样化！死刑！）

**核心规则：用户说什么就是什么，一个字都不能改！特别是服装！**

**100%还原规则 + 时间线逻辑**：

**区分两类内容：**
1. **时间点事件**（只在对应时间的场景出现）：
   - 食物："中午吃了[具体食物]" → 只在中午场景出现，其他场景不再出现
   - 活动："[时间]做[活动]" → 只在对应时间场景出现
   - 事件：用户说的任何具体事件 → 只在对应时间点出现

2. **持续存在的物品/地点**（可以在多个场景出现）：
   - 物品：用户提到的物品（如MacBook、笔记本、咖啡杯） → 可以多次出现
   - 地点：持续的位置 → 可以多次出现
   - 品牌/店名：提到过就要保留准确性

**还原规则（通用）**：
- 用户说"[时间]吃了[食物]" → 只在对应时间场景出现，其他场景不要再出现吃饭！
- 用户说"[持续物品]" → 可以在多个场景出现
- 用户说"[店名/品牌]" → 提到相关内容时必须原样保留

**必须推测的内容**（基于性格和时间线，要多样化！）：
✅ 用户没说的后续行为：吃完饭后做什么？
   - **基于用户性格多样化推测，不要固定在某个行为**
   - **不要使用固定的推测模板（如：看XX、整理XX、研究XX）**
   - **根据用户实际性格和状态灵活推测**
✅ 用户没说的细节：光线、色调、氛围、声音
✅ 用户没说的心理活动：想法、情绪变化

**⚠️⚠️⚠️ 推测规则：不要硬编码推测内容！**
- ❌ 不要固定推测"看技术文章"、"整理思路"、"研究行业动态"
- ✅ 根据用户实际性格和状态动态推测

**⚠️ 禁止固定化推测**：
❌ 不要每次都推测相同的具体行为（如：看特定视频、写特定内容）
❌ 不要重复使用相同的推测模式
❌ 推测要根据具体情况多样化，避免模板化

**核心生成流程（严格按此顺序）**：

**Step 1：读取用户键入（只用事实，不用性格标签）**
- 用户说了什么具体的事（吃外卖、做项目、休息...）
- **记录用户说的每一个具体名词**（食物、地点、物品）
- ❌ 不要在narrative里写"INTJ性格"、"理性思维"等标签！

**Step 2：分析推测用户行为（这是最重要的！）**
基于Step 1的信息，推测用户的**内在行为模式和后续行为**：
- 用户会做什么动作？（专注工作、思考、放松、创作...）
- 用户的心理状态是什么？（开心、专注、疲惫、兴奋...）
- **用户在不同时间段会做什么？（这是关键！）**

**推测规则（多样化推测，不要固定化！）**：

**⚠️ 关键：行为推测必须考虑用户当前状态！**

**状态优先推测（用户状态 > 性格推测）**：
- 用户说"累了"、"有点累"、"睡晚了"、"熬夜" → 优先推测休息、放松、睡眠相关行为
- 用户说"开心"、"兴奋"、"有干劲" → 优先推测活跃、积极的行为
- 用户说"压力大"、"焦虑" → 优先推测缓解压力、放松的行为

**状态驱动推测原则（不要硬编码具体行为）**：
- 用户说"有点累" → 推测方向：休息、放松、低强度活动
- 用户说"开心" → 推测方向：积极、主动、高能量活动
- 用户说"压力大" → 推测方向：缓解压力、放松、独处

**性格影响推测方向（不要硬编码具体活动）**：
- 理性型 → 推测方向：独立、思考、规划
- 目标型 → 推测方向：执行、规划、结果导向
- 创意型 → 推测方向：审美、记录、感受
- 社交型 → 推测方向：互动、交流、分享

**⚠️⚠️⚠️ 推测要点：**
1. **不要硬编码具体活动**（如："看技术文章"、"整理思路"、"研究行业动态"）
2. **只提供推测方向**（如：休息、思考、放松、规划）
3. **根据用户实际性格和状态动态生成**
4. **每次推测都要不同，不要重复相同模式**

**❌ 错误：固定推测模式**
- "吃完饭后可能独处思考30分钟" ← 太具体，硬编码了
- "可能研究行业动态资讯" ← 硬编码了具体内容
- "可能写心情日记" ← 硬编码了具体行为

**✅ 正确：灵活推测方向**
- 理性+累了 → 推测方向：低强度思考活动或休息
- 创意+开心 → 推测方向：创造性表达或记录
- 目标+精力充沛 → 推测方向：高效执行或规划

**Step 3：根据行为推测外部环境**
基于Step 2推测的行为，反推**最匹配的外部环境类型**：
- 专注工作/思考 → 安静独立空间
- 休息放松 → 舒适私密空间
- 社交互动 → 开放社交空间
- 创作活动 → 有美感的空间

**环境细节推测原则（不要硬编码具体物品）**：
- 光线：根据活动类型（专注→集中光源；休息→自然光；社交→明亮）
- 物品：**基于用户实际提到的物品，不要硬编码**
- 声音：根据环境类型（独处→安静；社交→交谈声）
- 色调：根据用户性格倾向（理性→冷色调；创意→暖色调）

**⚠️⚠️⚠️ 不要硬编码具体物品：**
- ❌ "MacBook、笔记本、技术书籍" ← 硬编码了具体物品
- ❌ "咖啡、艺术品、日记本" ← 硬编码了具体物品
- ✅ 根据用户实际提到的物品或场景合理推测

**正确示例（注意时间线逻辑 + 用户状态）**：

**生成示例（使用用户实际输入）：**

**从用户实际输入中提取：**
用户键入："${initialPrompt}"

**问答配对（仅用于理解上下文，不影响场景生成）：**
${questions.length > 0 && answers.length > 0 ? questions.slice(0, answers.length).map((q, i) => `
Q${i + 1}: ${q}
A${i + 1}: ${answers[i] || '无'}
`).join('') : '（无问答记录）'}

⚠️ **重要：** 上面的问答配对只用于理解用户回答对应的问题，不能用于生成场景！场景必须100%基于"用户本次对话的完整输入"（上面的元键入和后续回答）！

用户自我认知：${userInfo?.personality || '暂无'}

**🎯 用户核心性格特质（必须在场景情绪中自然体现）：**
- 已缩减（避免干扰用户输入）

**⚠️ 情绪基调要求（关键！）：**
- 场景中的情绪表达必须符合用户的核心性格
- 如果用户性格是"批判性思维、讽刺、务实"，scene.description中要自然体现（如subtle sarcastic expression, eyes showing skepticism, slight smirk）
- 如果用户性格是"乐观、开朗"，要体现（如bright smile, energetic posture）
- 不要硬加情绪，而是通过细节（眼神、微表情、肢体语言）自然融入description
- **多人场景的主角识别（重要！）**：
  * 如果场景主角是老板/同事（如老板演讲），description必须详细描述他们的动作和表情，用户作为观察者
  * 如果场景主角是用户（如用户独自思考），description聚焦于用户的动作和心理
  * **示例格式（老板为主角，中国办公室）**："MALE BOSS (middle-aged Chinese man, approximately 45 years old, wearing dark business suit, masculine features) [boss's actual dramatic action from user input], [actual expression]. MALE CONSULTANT (Chinese man, approximately 35 years old, wearing business casual attire) [actual reaction]. User (26-year-old Chinese female, 165cm, long hair) [actual position and reaction], [actual expression]."
  * **示例格式（老板为主角，美国科技公司）**："MALE BOSS (middle-aged American man, approximately 45 years old, wearing casual button-down shirt and jeans, masculine features) [boss's actual dramatic action], [actual expression]. User (26-year-old Chinese female, 165cm, long hair, wearing casual office wear) [actual position and reaction]."
  * **示例（用户为主角）**："26-year-old Chinese female, 165cm, long hair, sitting alone by window, deep in thought, fingers tapping on notebook."

→ Step 1：提取用户明确说的内容（100%还原）
  - 提取食物名称（如果有）→ 必须原样写，不能改
  - 提取时间点 → 必须对应
  - 提取用户状态（累了、开心等）→ 必须在场景中体现
  - 提取性格特质 → 通过细节自然体现（不是硬加！）
  - **⚠️ 提取场景中的其他人物并分析动作词**（如老板、同事、顾问、父母）：
    * 分析动词判断主角：
      - "老板宣布..."、"同事鼓掌..." → 主角=他们（他们在做主动动作）
      - "老板向XX咨询..." → 主角=XX（XX在讲，老板在听）
      - "我在思考..."、"我吃了..." → 主角=用户
    * **主角的描述要详细，配角的描述可以简略**
    * **不要看到"老板"就假设老板在讲话！要分析动词！**
    
  - **🚨🚨🚨 其他人物必须有明确的性别、年龄、外貌描述（极其重要！）**：
    * **老板** → 默认："MALE BOSS (middle-aged Chinese man, approximately 40-50 years old, wearing [根据场景环境智能推断衣着], masculine features, male facial structure)"
    * **女老板** → 如果用户明确说"女老板"："FEMALE BOSS (middle-aged Chinese woman, approximately 40-50 years old, wearing [根据场景环境智能推断衣着], feminine features)"
    * **同事/顾问（男）** → "MALE COLLEAGUE/CONSULTANT (Chinese man, approximately 30-45 years old, wearing [根据场景环境智能推断衣着], masculine features)"
    * **同事/顾问（女）** → "FEMALE COLLEAGUE/CONSULTANT (Chinese woman, approximately 30-40 years old, wearing [根据场景环境智能推断衣着], feminine features)"
    * **父母** → "father (Chinese man, approximately 50-60 years old, wearing [根据场景智能推断])" 或 "mother (Chinese woman, approximately 50-60 years old, wearing [根据场景智能推断])"
    * **朋友** → 根据称呼判断性别，默认同性
    * **男朋友/女朋友** → 明确性别
    
  - **🎨🎨🎨 衣着应根据场景环境智能推断（极其重要！）**：
    * **中国办公室会议** → "dark business suit" 或 "business casual attire"（商务休闲）
    * **美国/硅谷办公室** → "casual polo shirt and khakis" 或 "button-down shirt and jeans"（休闲风格）
    * **创业公司/科技公司** → "hoodie and jeans" 或 "casual t-shirt and sneakers"（非常休闲）
    * **家里/室内** → "casual home clothes" 或 "comfortable loungewear"（居家服）
    * **咖啡厅/餐厅** → "casual shirt and pants" 或 "stylish casual outfit"（休闲外出）
    * **户外/公园** → "outdoor jacket and pants" 或 "sports casual wear"（运动休闲）
    * **早晨/家中** → "pajamas" 或 "morning robe"（睡衣/晨袍）
    * **晚上/家中** → "comfortable sleepwear" 或 "casual home wear"（舒适家居服）
    * **健身房** → "athletic wear" 或 "sports outfit"（运动服）
    * **正式场合/晚宴** → "formal suit" 或 "elegant evening dress"（正式西装/晚礼服）
    
  - **🌍🌍🌍 不同文化/地域的服装差异**：
    * **中国企业** → 偏正式，西装或商务装居多
    * **美国/硅谷企业** → 非常休闲，牛仔裤+T恤/衬衫很常见，即使高管也可能穿polo衫
    * **日本企业** → 非常正式，几乎都是西装
    * **欧洲企业** → 商务休闲，介于正式和休闲之间
    * **创意产业/广告/设计** → 个性化穿着，可能很潮流
    * **金融/律师/咨询** → 必须正式，深色西装
    
  - **⚠️⚠️⚠️ 严禁默认所有人都穿西装！必须根据场景和文化推断！**
    
  - **❌ 错误示例（缺少性别描述）**：
    * "boss standing dramatically..." ← AI不知道是男是女！
    * "colleague nodding..." ← AI无法区分性别！
    
  - **✅ 正确示例（明确性别、年龄、外貌、环境适配衣着）**：
    * **中国办公室初始场景**："MALE BOSS (middle-aged Chinese man, approximately 45 years old, wearing dark business suit with tie properly fastened, masculine features) standing calmly at table..."
    * **中国办公室激动场景**："MALE BOSS (middle-aged Chinese man, approximately 45 years old, wearing dress shirt with sleeves rolled up, tie loosened, jacket removed and draped over chair, masculine features) standing dramatically with arms raised high, face flushed with passion..."
    * **美国科技公司**："MALE BOSS (middle-aged American man, approximately 45 years old, wearing casual polo shirt and khakis, masculine features) standing with relaxed posture, gesturing enthusiastically..."
    * **创业公司咖啡厅**："MALE CONSULTANT (Chinese man, approximately 35 years old, wearing hoodie and jeans, masculine facial features) sitting beside with laptop, nodding thoughtfully..."
    * **家中场景**："26-year-old Chinese female with long hair, 165cm height, wearing comfortable home clothes, sitting on sofa..."
    
  - **🎨 衣着动态变化示例（同一人物，不同场景）**：
    * **Scene 1（开始）**："wearing dark business suit, tie properly fastened, collar crisp"
    * **Scene 2（激动）**："wearing dress shirt with sleeves rolled up to elbows, tie loosened and pulled down, jacket removed and draped over chair back"
    * **Scene 3（疲惫）**："wearing wrinkled shirt, tie completely removed, top collar button undone, hair slightly disheveled"
    * **⚠️ 衣着变化必须体现人物状态变化：从正式→激动→疲惫**

→ Step 2：基于性格+状态推测行为
  - 吃饭时：结合疲惫状态推测行为
  - 饭后：累了 → 推测需要休息、放松
  - 其他时间：根据性格灵活推测（不要固定化！）

→ Step 3：生成场景（符合时间线+体现状态）
  场景1：[用户说的活动]
    - 100%保留：用户说的所有具体名词
    - 体现状态：如果用户说累了，必须体现疲惫
    - 推测环境：基于行为推测环境
  
  场景2-4：根据时间线和性格灵活推测
    - 不要重复时间点事件（吃饭只在场景1）
    - 必须考虑用户的整体状态
    - 推测要多样化，不要固定

**错误模式（死刑案例）**：
❌ 篡改用户说的任何具体名词（食物、地点、店名、物品）
❌ 忽视用户说的状态（累了、开心、压力大等）
❌ 时间点事件重复出现在多个场景
❌ 擅自改变用户说的场景细节（线上→线下、在家→咖啡厅）

**⚠️⚠️⚠️ 场景数量要求：基于用户具体回答！根据用户提到的具体事件生成场景！最多4个！ ⚠️⚠️⚠️**

**场景生成原则（严格遵守！）：**
- **每个关键事件/moment = 一个独立场景**
- **用户提到1个事件 → 只生成1个场景**
- **用户提到2个事件 → 只生成2个场景**
- **用户提到3个及以上事件 → 只生成最关键的2-3个场景**
- **绝对不要硬凑场景数量！**
- **绝对不要生成用户没提到的场景**（如"会后反思"、"咖啡站分析"、"回家路上"等虚构场景）
- **每个场景都必须有明确的用户语义支撑**
- **心理剧由单独服务处理，不计入这里的场景数量**

**🚨🚨🚨 场景数量检查清单：**
1. 分析用户输入，提取关键事件
2. 数一数有几个明确的事件
3. 生成对应数量的场景（1个事件=1个场景，2个事件=2个场景）
4. 绝对不要为了凑数而创造场景！

**示例1（只生成2个场景）：**
用户说："我当初面试觉得老板很开放，结果深入后发现很传统"
→ 2个关键事件，生成2个场景：

**Scene 1: 面试 - 老板表现开放**
- Focus: 面试时的期望和老板的承诺
- 人物：用户 + 老板
- 动作：老板说work from home、穿着随意、表现开放

**Scene 2: 实际工作 - 发现传统思维**
- Focus: 实际工作中发现的反差
- 人物：用户 + 老板（工作中的真实表现）
- 动作：展现老板传统管理方式

**⚠️ 只生成2个场景！不要再添加"会后反思"、"回家路上"等额外场景！**

**示例2（只生成1个场景）：**
用户说："今天和朋友吃饭"
→ 1个事件，只生成1个场景：

**Scene 1: 和朋友吃饭**
- Focus: 吃饭场景
- 完成！不要再生成其他场景！

**⚠️⚠️⚠️ 关键：用户说几个事件就生成几个场景！不要凑数！**

**示例2（时间对比故事 - ⚠️ 格式指导，不要照搬！）：**

**如果用户说："上次[事件A] 这次[事件B]"**
→ 识别：2个时间点 = 至少2个场景

**生成方法：**

Scene 1: **Previous/Initial [用户实际说的事件A]**
- Focus: 用户实际说的A的重点
- mainCharacter: 根据A的内容判断（如果是"我做X"→user，如果是"老板说Y"→boss）
- description: 基于用户实际说的A的内容

Scene 2: **Current/Later [用户实际说的事件B]**  
- Focus: 用户实际说的B的重点
- mainCharacter: 根据B的内容判断
- description: 基于用户实际说的B的内容，并体现与A的对比/因果关系

⚠️ 不要编造用户没说的额外场景！严格基于用户输入！

**示例3（认知反转故事 - "以为...结果..."）：**

⚠️⚠️⚠️ 这是格式指导，不是要生成的内容！

**如果用户说："当初以为X...结果发现Y..."**
- 这是认知反转故事
- 必须生成至少2个场景体现对比

**场景生成格式：**

Scene 1: **Initial [用户实际说的场景]** 
- description: "Initial [actual event from user input]: 26-year-old Chinese female [user's actual experience], [actual feeling]. [Person] [actual appearance/behavior from user]. [Atmosphere showing user's initial impression]."
- 关键：体现用户的初始印象（以为的样子）

Scene 2: **Reality [用户实际说的场景]**
- description: "Reality discovered: [Same person] now showing [actual true nature from user input], contrasting with previous [initial impression]. User observing with [user's actual reaction - disappointment/realization]. [Atmosphere showing disillusionment]."
- 关键：体现认知反转（实际的样子）

🚨 严禁编造内容！必须100%基于用户实际说的：地点、人物、行为、感受！

**⚠️⚠️⚠️ 时间标记识别（重要！）：**
- "上次...这次..." → 2个时间点，必须分开！
- "之前...后来..." → 2个时间点，必须分开！
- "以前...现在..." → 2个时间点，必须分开！

**⚠️⚠️⚠️ 重要事件必须独立成景：**
- ✅ "父母刚刚出门" → 必须是独立场景（门关上的moment很重要！）
- ✅ "上次会议" + "这次会议" → 必须是2个独立场景（时间不同！）
- ✅ "和同学说再见" → 独立场景（离别的moment）
- ✅ "收到offer" → 独立场景（重要时刻）
- ❌ 不要把"父母出门"只作为背景信息放在其他场景中

**⚠️⚠️⚠️ 禁止场景重复（死刑规则！）：**

**❌ 错误示例（场景重复）：**
- Scene 1: 躺床上听podcast
- Scene 2: 坐床上听podcast ← ❌ 重复！都在听podcast！
- Scene 3: 站着听podcast ← ❌ 又在听podcast！

**✅ 正确示例（每个场景focus不同，最多2-3个）：**
- Scene 1: 刚起床听podcast（主要事件）
- Scene 2: 父母出门的moment（关键转折）
- 完成！不要再生成准备出门等额外场景！

**场景多样性检查清单：**
□ 每个场景的主要活动不同？
□ 每个场景的人物组成不同？（独自 vs 有父母 vs 父母刚走）
□ 每个场景的focus不同？
□ 没有两个场景都在做同一件事？（如：都在听podcast）

**⚠️ 如果用户说了多个关键事件，每个场景必须对应一个不同的事件！**

**⚠️⚠️⚠️ 场景多样性要求（避免单一场景）⚠️⚠️⚠️**

**🚨🚨🚨 强制多样性规则（死刑线！）🚨🚨🚨**

**1. 地点多样性（绝对禁止所有场景都在同一地点！）：**
- ✅ 如果用户提到多个地点，每个场景必须对应不同地点
- ✅ 如果用户说"在家"和"出门"，场景1在家，场景2在外
- ✅ 如果用户说"悉尼大学"和"在家"，场景1在悉尼，场景2在家
- ❌ 绝对禁止所有场景都在"上海"或同一地点
- ❌ 绝对禁止所有场景都在"办公室"或"创业空间"

**2. 时间多样性（根据用户事件的时间线）：**
- ✅ 高考失利（18岁）→ 出国准备（18-19岁）→ 悉尼大学（19岁）→ 现在（26岁）
- ✅ 每个场景的年龄必须符合时间逻辑
- ❌ 不要所有场景都是同一年龄

**3. 人物多样性（根据用户描述）：**
- ✅ 独自在家 → 和同学一起 → 父母刚出门 → 独自工作
- ✅ 每个场景的人物组成要不同
- ❌ 不要所有场景都是"独自一人"

**4. 活动多样性（根据用户实际活动）：**
- ✅ 吃饭 → 开会 → 上课 → 休息
- ✅ 每个场景的活动要不同
- ❌ 不要所有场景都在做同一件事

**场景多样性检查：**
- ✅ 如果用户说"和同学一起"，场景中要有其他人
- ✅ 如果用户说"去了悉尼大学"或"在悉尼大学"，地点必须是**悉尼**或**Sydney**，绝对不能是上海
- ✅ 如果用户说"开会"，场景中要有会议相关元素
- ✅ 不同场景要有不同的地点、人物、活动
- ✅ 年龄要符合时间逻辑（高考18岁、大学19岁、现在26岁）
- ❌ 不要所有场景都是单人、同一地点、同一活动
- ❌ 不要所有场景都是同一年龄（要根据时间线调整）

**⚠️⚠️⚠️ 地点提取和使用（死刑线！）⚠️⚠️⚠️**

**从用户输入和回答中提取地点：**
1. 检查用户是否提到具体地点（城市、大学、国家）
2. 在scene.description中**必须明确写出地点**
3. 不要用默认地点覆盖用户说的地点

**示例：**
- 用户说"去了悉尼大学" → scene.description必须包含"悉尼大学"或"Sydney University"
- 用户说"在家" → scene.description必须包含"在家"
- 用户说"咖啡厅" → scene.description必须包含"咖啡厅"

**❌ 错误：用户说"去了悉尼大学"，scene.description写"在上海的大学实验室" → 死刑！**
**✅ 正确：用户说"去了悉尼大学"，scene.description写"在悉尼大学的实验室"**

**⚠️⚠️⚠️ 人物设置（重要！必须100%还原用户说的）⚠️⚠️⚠️**

**主要人物：**
- ${userInfo?.age}岁中国${userInfo?.gender === 'female' ? '女性' : '男性'}，${userInfo?.name}

**其他人物的处理（必须基于用户输入！）：**

**规则1：用户明确说有其他人 → 必须在scene.description中体现**
- ✅ 用户说"和同学一起做项目" → description必须写："with 2-3 classmates working together"
- ✅ 用户说"和朋友聊天" → description必须写："chatting with friend"
- ✅ 用户说"在团队会议" → description必须写："in team meeting with colleagues"
- ❌ 错误：用户说"和同学一起"，但description只写"alone" → 死刑！

**规则2：用户说其他人"刚刚离开" → 必须体现这个时间点和状态**
- ✅ 用户说"父母刚刚出门" → description必须写："parents just left, door just closed, now alone at home"
- ✅ 用户说"同事刚走" → description必须写："colleagues just left office, now alone at desk"
- ❌ 错误：用户说"父母刚刚出门"，但description完全不提 → 死刑！

**规则3：用户没说其他人 → 默认是独自一人**
- ✅ 用户只说"我在家听播客" → description写："alone at home"

**peopleCount字段设置：**
- 用户说"和同学"/"和朋友"/"团队" → peopleCount: "with 2-3 classmates/friends/colleagues"
- 用户说"父母刚刚出门" → peopleCount: "alone (parents just left)"
- 用户没说其他人 → peopleCount: "alone"

**⚠️ 核心原则：用户说的每一个人物信息都必须在description中体现！**

**时间线年龄逻辑示例：**
用户说"高考没考好 后来出国读书了 现在工作了"
- 场景1（高考）：18岁中国女性，高考失利场景
- 场景2（出国读书）：19-20岁中国女性，悉尼大学学习场景  
- 场景3（现在工作）：${userInfo?.age}岁中国女性，当前工作场景

返回JSON格式。`
            },
            {
              role: 'user',
              content: `🚨🚨🚨 最高优先级警告 🚨🚨🚨

你的任务是基于用户实际输入生成场景！

**🔥 核心原则：只生成用户明确提到的场景，不要延伸或想象！🔥**

❌ 严禁使用system prompt中的示例内容（如"6 yuan"、"grand vision"、"media company"等）！
❌ 严禁创造用户没有提到的场景或事件！
❌ 严禁延伸故事情节或添加额外的场景！
❌ 严禁猜测或补充用户没有说的内容！

✅ 必须100%基于下面"用户核心输入"和"聊天记录"中的实际内容！
✅ 只生成用户明确提到的场景和事件！
✅ 如果用户说的是"面试发现老板虚伪"，就只生成面试相关的1-2个场景！
✅ 如果用户说的是"吃饭开会"，就只生成吃饭和开会的2个场景！
✅ 场景数量要根据用户提到的事件数量来定，不要硬凑4个！

**示例：**
- 用户说："今天和朋友吃饭" → 只生成1个场景（吃饭）
- 用户说："早上开会，下午面试" → 生成2个场景（开会、面试）
- 用户说："高考失利，出国读书，现在工作" → 生成3个场景（高考、出国、工作）
- 用户说："面试觉得老板开放，结果发现很传统" → 生成2个场景（面试、实际工作）+ 1个心理剧
- 不要添加用户没说的"回家"、"反思"、"总结"等场景！

**🎯🎯🎯 场景数量要求（灵活判断！）：**
- ✅ **根据用户输入的事件数量灵活生成，最多4个场景**
- ✅ 用户提到几个关键moment就生成几个场景
- ✅ 如果用户输入信息丰富，可以生成3-4个场景展现完整时间线
- ❌ 不要硬凑场景数量
- ❌ 不要创造用户没说的事件

**场景数量判断逻辑（灵活！）：**
- 用户提到1个事件 → 生成1-2个场景（展现前后）
- 用户提到2-3个事件 → 生成2-3个场景
- 用户提到3个以上事件或有丰富时间线 → 生成3-4个场景
- **关键**：每个场景必须对应用户提到的真实moment，不要凭空创造

**场景展现原则：**
- 如果用户说了一个完整的故事（有起因、经过、结果），可以生成3-4个场景展现时间线
- 每个场景聚焦一个关键moment
- 不要重复同一个moment

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🚨🚨🚨 用户物理外观信息（死刑线！每个场景description必须包含！）🚨🚨🚨**

**当前用户信息（必须严格遵守！）：**
- **性别**：${userInfo?.gender === 'female' ? 'female（女性）' : 'male（男性）'} ⚠️ 这是${userInfo?.gender}，绝对不能写错！
- **年龄**：${userAge}岁（注意：不同事件时年龄不同，如高考18岁、出国19岁）
- **身高**：${userHeight}cm
- **体重**：${userWeight}kg
- **头发**：${userInfo?.hairLength || '长发'}

**⚠️⚠️⚠️ 死刑规则：每个场景的description必须包含完整且正确的人物描述！⚠️⚠️⚠️**

**强制格式（必须严格遵守，不能改变任何数值！）：**
- 用户是女性 → description开头："${userAge}-year-old Chinese female, ${userHeight}cm, ${userInfo?.hairLength || 'long hair'}, wearing..."
- 用户是男性 → description开头："${userAge}-year-old Chinese male, ${userHeight}cm, ${userInfo?.hairLength || 'short hair'}, wearing..."

**⚠️⚠️⚠️ 检查清单（生成前必须确认）：**
□ description中是否写的是"${userAge}-year-old Chinese ${userInfo?.gender === 'female' ? 'female' : 'male'}"？
□ 是否包含了"${userHeight}cm"？
□ 是否包含了"${userInfo?.hairLength || 'long hair'}"？
□ 性别是否正确？（当前是${userInfo?.gender}）

❌ 绝对禁止：写错性别！如果用户是${userInfo?.gender}，description必须写"${userInfo?.gender === 'female' ? 'female' : 'male'}"！
❌ 绝对禁止：写错年龄！description必须写"${userAge}-year-old"！
❌ 绝对禁止：写错身高！description必须写"${userHeight}cm"！

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨🚨🚨 【超级死刑规则】身份幻想/假想输入的基础场景生成要求 🚨🚨🚨

用户核心输入：${initialPrompt}

**第一步：判断输入类型**

**类型A：纯现实事件**（如"我今天被老板批评了"、"我在开会时同事说了××"）
→ 基础场景 = 现实场景（描述实际发生的事）

**类型B：身份幻想/假想**（如"我觉得自己是反社会女反派"、"我要是19岁辍学创业"）
→ 基础场景 = **用户思考/想象这些幻想时的现实状态**
→ ⚠️ 不要在基础场景中直接生成戏剧化的假想画面！

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**【类型B：身份幻想/假想输入】的基础场景生成规则（死刑线！）：**

**核心原则：基础场景 = 现实中思考/想象的状态，不是幻想本身！**

**✅ 正确做法（基础场景）：**
- 描述用户在**现实中**思考、想象这些幻想的状态
- 地点：书房、咖啡馆、卧室、办公室等现实地点
- 动作：坐着、站着、走路、躺着等日常动作
- 状态：思考、沉思、想象、脑海中浮现等

**示例（正确）：**
- 标题："思考女反派身份" / "想象反社会特质"
- Description: "26-year-old Chinese female sitting in her study room at night, 165cm, long hair, 
  thoughtful expression while imagining herself as an antisocial villain like Hannibal, 
  hands resting on desk, dim lighting from laptop screen, realistic home setting"
- Story: "她坐在书房里，脑海中想象着自己作为反社会女反派的画面。就像汉尼拔那样，冷静、精致、危险..."

**❌ 错误做法（基础场景中不要生成这些！）：**
- ❌ 戏剧化场景："她站在天台边缘，俯视城市..." ← 这是假想场景，不是基础场景！
- ❌ 角色扮演场景："冷血女反派站在阴影中..." ← 这是假想场景，不是基础场景！
- ❌ 电影感场景："dramatic noir lighting, cinematic villain pose" ← 这是假想场景！

**记住：**
- **基础场景** = 用户在现实中思考/想象的状态（普通、日常、写实）
- **假想场景** = 用户想象中的戏剧化画面（会由 hypotheticalSceneService 生成）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

聊天记录：
${questions.map((q, i) => `问题${i+1}: ${q}`).join('\n')}
${answers.map((a, i) => `回答${i+1}: ${a}`).join('\n')}

**🔥🔥🔥 强制检查清单（生成前必须完成！）：**

1. ✅ **服装检查**：用户是否说了穿什么？
   ${(() => {
     const allText = [initialPrompt, ...answers].join(' ')
     if (allText.includes('穿') || allText.includes('睡衣') || allText.includes('T恤') || allText.includes('衣服') || allText.includes('裤子') || allText.includes('裙子')) {
       return `→ 用户说了服装！必须在所有场景的description中写："wearing [用户说的服装]"！`
     }
     return '→ 用户没说服装，可以推测'
   })()}

2. ✅ **地点检查**：用户是否说了在哪里？
   ${(() => {
     const allText = [initialPrompt, ...answers].join(' ')
     if (allText.includes('家') || allText.includes('卧室') || allText.includes('睡衣') || allText.includes('床')) {
       return '→ 用户在家里！所有场景location必须是"Home"或"Bedroom"！'
     }
     if (allText.includes('办公室') || allText.includes('公司') || allText.includes('会议')) {
       return '→ 用户在办公室！'
     }
     return '→ 根据上下文判断'
   })()}

3. ✅ **人物检查**：用户是否提到其他人？
   ${(() => {
     const allText = [initialPrompt, ...answers].join(' ')
     const mentioned = []
     if (allText.includes('男朋友')) mentioned.push('男朋友')
     if (allText.includes('老板')) mentioned.push('老板')
     if (allText.includes('同事')) mentioned.push('同事')
     if (allText.includes('父母') || allText.includes('妈妈') || allText.includes('爸爸')) mentioned.push('父母/家人')
     return mentioned.length > 0 
       ? `→ 用户提到了：${mentioned.join('、')}！这些人必须在description中出现！`
       : '→ 用户独自一人'
   })()}

用户自我认知（重要：这是用户对自己的整体描述，请深度理解并体现）：
${userInfo?.personality || '暂无自我描述'}

**🚨🚨🚨 重要：元数据已被完全禁用，场景生成必须100%基于用户输入！🚨🚨🚨**

**⚠️⚠️⚠️ 场景生成规则（绝对遵守）：**
- ❌ **绝对禁止**：使用任何元数据（包括性格特征、美学偏好、常去地点等）生成场景
- ❌ **死刑案例**：用户说"讨厌卷的环境" → 元数据不能让它变成"喜欢学术"
- ❌ **死刑案例**：用户说"创造力被压抑" → 场景必须体现"压抑"，不能变成"自由创造"
- ✅ **场景生成**：必须100%基于用户元键入和回答，不允许任何推测或元数据影响
- ✅ **元数据用途**：仅用于后续narrative生成，帮助理解用户可能的想法（但不改变场景本身）

**🔥🔥🔥 场景标题语言规则（死刑线！）：**
- **title字段必须与用户输入语言一致！**
- 用户用中文输入 → title用中文（如："午夜惊醒"、"熟人经济"）
- 用户用英文输入 → title用英文
- ❌ 死刑案例：用户中文输入，你生成英文title → 死刑！

**元键入（生成场景的绝对核心）：**
"${initialPrompt}"
→ 这是用户最核心的观点和情绪
→ 场景必须围绕这个核心展开
→ 场景数量：灵活（1-3个，根据内容丰富度）
→ title语言：与"${initialPrompt}"的语言一致！

**🚨🚨🚨 身份幻想/自我宣言判断（最高优先级！由你AI自行判断）🚨🚨🚨**

**第一步：判断元键入类型**
请分析元键入"${initialPrompt}"是否属于以下任一类型：
- 身份宣言（如"我觉得自己是××"、"我就是××"、"我像个××"）
- 自我标签（如"我本质上是××"、"我天生××"）
- **假设性人生**（如"如果我××"、"要是我××"、"假如我××"、"我要是没××"）← 🎬 特殊处理！
- 角色幻想（如"我是女版××"、"我像汉尼拔"）

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎬 **【假设性人生/身份幻想】检测到时的基础场景处理规则**

**如果元键入属于"假设性人生"或"身份幻想"（如"我要是没出国留学"、"我觉得自己是女反派"），基础场景应该生成：**

**现实场景 - 用户在现实中思考/想象的画面：**

🚨🚨🚨 **强制要求：基础场景必须是纯现实、纯写实，不要电影感！** 🚨🚨🚨

1. **年龄/时间：**
   - ✅ 26岁（用户现在的年龄）
   - ❌ 不要写"19岁"、"20岁"等假想年龄

2. **环境：**
   - ✅ 现实环境：书房、书桌、卧室、办公室、咖啡厅等
   - ❌ 不要写假想环境：硅谷办公室、天台、投资人会议室等

3. **状态：**
   - ✅ 正在思考、想象、回忆、内心独白
   - ✅ "她坐在书桌前"、"她独自在卧室"、"她躺在床上"
   - ❌ 不要写行动场景："她在创业"、"她见投资人"、"她俯视城市"

4. **视觉风格：**
   - ✅ **纯写实，无电影感元素**
   - ❌ 不要加"CINEMATIC"、"letterbox black bars"、"film grain"等
   - ❌ 不要加电影比例、胶片质感等
   - ✅ 只用自然光、真实场景描述

**示例（正确的现实场景）：**
"26-year-old Chinese female, 165cm, long hair, sitting at desk in her bedroom, late at night, 
laptop screen showing Silicon Valley startup articles, natural desk lamp lighting, thoughtful 
expression while imagining alternate life path, fingers resting on keyboard, realistic photography"

**示例（错误 - 太像假想场景）：**
❌ "19-year-old Chinese female in Silicon Valley startup office..." ← 这是假想场景！
❌ "with cinematic letterbox black bars..." ← 现实场景不要电影感！
❌ "standing on rooftop overlooking city..." ← 这是假想/身份幻想场景！

**❌ 不要生成假想场景本身！**
- ❌ 不要生成"19岁的她在硅谷创业"（这个由 hypotheticalSceneService 生成）
- ❌ 不要生成"她作为女反派俯视城市"（这个由 hypotheticalSceneService 生成）
- ✅ 基础场景只生成"26岁的她在书桌前，想象着19岁辍学创业..."

**假想场景本身由 hypotheticalSceneService.ts 专门处理，会体现：**
- 时间反差（19岁 vs 26岁）
- 穿着反差（hoodie vs 现在的穿着）
- 地点反差（硅谷 vs 现在的地方）
- 电影黑边和"ALTERNATE TIMELINE"标识

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**⚠️⚠️⚠️ 基础场景不再生成身份幻想场景本身！**

**原有的身份幻想规则（如"女反派俯视城市"）已移至 hypotheticalSceneService.ts**

**基础场景只生成现实中思考/体验的画面：**
- ✅ "26岁的她在书房里，思考着自己的反社会倾向..."
- ✅ "她独自坐在办公室，感受到内心的冷漠和疏离..."
- ❌ 不要生成"她作为女反派站在天台俯视城市"（这个由 hypotheticalSceneService 生成）

**假想场景服务会生成身份幻想的象征性画面，带有：**
- 强烈的角色感（女反派、女版汉尼拔）
- 戏剧化姿态和表情
- 电影黑边标识

**🚨🚨🚨 核心情绪检测（必须体现）：**
${(() => {
  const allInputs = [initialPrompt, ...answers].join(' ')
  const negativeEmotions = allInputs.match(/讨厌|压抑|批判|反对|不满|愤怒|失望|沮丧|困惑|伤害|痛苦|难过/g)
  const relationshipIssues = allInputs.match(/索取|付出|吵架|冲突|不懂|伤害|关系问题|爱商|爱人能力|只会|不会|需要锻炼/g)
  
  let detected = []
  if (negativeEmotions) detected.push(`负面情绪：${negativeEmotions.join(', ')}`)
  if (relationshipIssues) detected.push(`关系问题：${relationshipIssues.join(', ')}`)
  
  return detected.length > 0 ? detected.join('\n') : '未检测到明显情绪或关系问题'
})()}

**🚨🚨🚨 场景描述必须体现用户核心观点（死刑线！）🚨🚨🚨**

**用户核心观点提取（General规则，不硬编码）：**
${(() => {
  const allInputs = [initialPrompt, ...answers].join(' ')
  const corePoints = []
  
  // General规则：提取用户表达的核心观点、情绪、问题
  // 关系问题检测（不硬编码具体词汇，使用pattern匹配）
  const relationshipPattern = /(男朋友|伴侣|家人|朋友|恋人).*?(索取|付出|吵架|冲突|不懂|伤害|只会|不会|需要锻炼|爱商|爱人能力)/g
  const relationshipMatch = allInputs.match(relationshipPattern)
  if (relationshipMatch) {
    corePoints.push(`关系问题：${relationshipMatch[0]}`)
  } else if (allInputs.match(/索取|付出|吵架|冲突|不懂|伤害|关系问题|爱商|爱人能力|只会|不会|需要锻炼/g)) {
    corePoints.push('关系问题/情感冲突')
  }
  
  // 情绪表达检测（general pattern）
  const emotionMatch = allInputs.match(/(讨厌|压抑|批判|反对|不满|愤怒|失望|沮丧|困惑|伤害|痛苦|难过)/g)
  if (emotionMatch) {
    corePoints.push(`情绪：${emotionMatch[0]}`)
  }
  
  // 观点/现象检测（保留原有但作为general示例）
  if (allInputs.match(/只关心.*?发文章|只关心.*?论文|卷顶会/g)) {
    corePoints.push('学术环境观点')
  }
  if (allInputs.match(/生产垃圾|没用的垃圾/g)) {
    corePoints.push('论文质量问题')
  }
  
  return corePoints.length > 0 
    ? `检测到核心观点：\n${corePoints.map(p => `- ${p}`).join('\n')}\n\n⚠️⚠️⚠️ 每个场景的description必须体现这些核心观点！⚠️⚠️⚠️` 
    : '未检测到明显核心观点（请仔细分析用户输入，包括关系问题、情绪表达、观点描述等）'
})()}

**场景描述要求（必须体现用户核心观点）：**
- 如果用户说"学生们只关心发文章" → description必须写："students frantically typing papers, discussing publication metrics, papers scattered everywhere, academic journals piled high, NO discussion of academic truth, ONLY focus on publishing"
- 如果用户说"生产垃圾" → description必须写："scattered papers that appear meaningless, mechanical paper production, no genuine academic pursuit visible"
- 如果用户说"卷顶会" → description必须写："students obsessed with top-tier conferences, calculating impact factors, discussing submission strategies"
- **如果用户说关系问题（如"男朋友只会索取，不会为我付出"）** → description必须写："26-year-old Chinese female with disappointed/frustrated expression, boyfriend (male figure) in scene showing one-sided interaction (taking/receiving but not giving), emotional distance between them, user feeling unreciprocated, relationship tension visible in body language and expressions"
- **如果用户说"大家天天吵"或"不懂爱"** → description必须写："conflict scene showing emotional disconnect, people arguing or showing misunderstanding, lack of emotional connection, relationship problems visible"

**⚠️⚠️⚠️ 死刑规则：description必须体现用户的核心观点，不能只是客观描述！⚠️⚠️⚠️**
- ❌ 错误："Students working on papers" → 太客观，没有体现"只关心发文章"！
- ✅ 正确："Students frantically typing papers, discussing publication metrics, NO discussion of academic truth, ONLY focus on publishing" → 体现了"只关心发文章"！

**🔥🔥🔥 Narrative生成要求（结合用户元数据性格 + 用户实际输入）🔥🔥🔥**

**🚨🚨🚨 语言规则（死刑线！）：**
- **narrative字段必须与用户输入语言完全一致！**
- 用户用中文输入 → narrative用中文
- 用户用英文输入 → narrative用英文
- ❌ 死刑案例：用户中文输入，你生成英文narrative → 死刑！

**Narrative生成策略（双重结合）：**

**第一步：提取用户实际输入的核心内容**
- 用户实际说的具体内容（如："学生们只关心发文章"、"卷顶会"、"生产垃圾"、"辅导学生"、"挣他们钱"）
- 用户实际观察到的现象（如："辅导学生时看到他们只关心论文"）
- 用户的实际感受（如："厌恶"、"反感"、"没救"）

**第二步：结合用户元数据的性格特征来理解和表达**

**用户核心性格特质（从元数据获取）：**
${(() => {
  if (userMetadata?.corePersonalityTraits && Array.isArray(userMetadata.corePersonalityTraits) && userMetadata.corePersonalityTraits.length > 0) {
    return `- ${userMetadata.corePersonalityTraits.slice(0, 3).join('、')}（用户的核心性格特质）`
  }
  if (userMetadata?.subconscious?.coreTraits && Array.isArray(userMetadata.subconscious.coreTraits) && userMetadata.subconscious.coreTraits.length > 0) {
    return `- ${userMetadata.subconscious.coreTraits.slice(0, 3).join('、')}（用户的核心性格特质）`
  }
  if (userInfo?.personality) {
    return `- ${userInfo.personality}（用户的自我认知）`
  }
  return '- 未获取到性格特质，使用用户自我认知：' + (userInfo?.personality || '暂无')
})()}

**性格特征应用指南：**
- 如果用户性格是"批判性思维、讽刺、务实" → narrative可以用批判性、讽刺性的语调来表达（如："这种机械化的论文生产让她感到讽刺——真正的学术追求在哪里？"）
- 如果用户性格是"理性分析、深度思考" → narrative可以包含理性分析和深度思考（如："她很理性地认识到...她理解这种学术体系的运作方式"）
- 如果用户性格是"艺术敏感、诗意表达" → narrative可以更加诗意和有艺术感（如："知识变成了可量化的产品，真理被简化为发表数量。这种机械化的生产，让本应充满智慧光芒的学术殿堂，变成了冰冷的数字工厂"）
- 如果用户性格是"务实主义、直接表达" → narrative可以更加直接和务实（如："她很清楚这些论文的价值，也知道自己辅导他们也只是挣他们的钱而已"）

**⚠️⚠️⚠️ 重要：性格特征只用于理解方式和表达语调，不能改变用户实际说的内容！⚠️⚠️⚠️**

**✅ 正确生成的narrative（结合性格 + 基于输入）：**
- ✅ 用户说"学生们只关心发文章"，性格是"批判性思维、讽刺" → narrative写："看到学生们只关心发文章，讨论的都是如何发表论文、如何提高影响因子，却很少有人真正讨论学术真理。这种机械化的论文生产让她感到讽刺——真正的学术追求在哪里？知识变成了可量化的产品，真理被简化为发表数量。"
- ✅ 用户说"生产垃圾"，性格是"务实主义、直接表达" → narrative写："看到学生们生产出很多没用的垃圾论文，只是为了发表而发表。她很清楚这些论文的价值，也知道自己辅导他们也只是挣他们的钱而已。"
- ✅ 用户说"辅导挣他们钱"，性格是"理性分析、深度思考" → narrative写："虽然辅导学生，但她很理性地认识到：学生们只关心发文章，自己也只是挣他们的钱。这种关系很直接，没有多余的期望。她理解这种学术体系的运作方式，也明白自己的角色。"

**⚠️⚠️⚠️ Narrative检查清单（生成前必须确认）：**
□ 是否引用了用户实际说的话？
□ 是否结合了用户元数据的性格特征来理解和表达？
□ 是否体现了用户的具体观察（如"辅导学生时看到"）？
□ 是否体现了用户的具体感受（如"厌恶"、"反感"）？
□ 是否用符合用户性格的语调来表达（批判性/理性/诗意/务实等）？

**⚠️ 场景生成要求（死刑线！）：**
- 如果检测到"压抑" → 场景必须体现"压抑"的氛围，不能变成"自由创造"
- 如果检测到"批判" → 场景必须体现"批判"的态度，不能变成"客观描述"
- 如果检测到"讨厌" → 场景必须体现"讨厌"的情绪，不能变成"中性观察"
- 🚨 **死刑案例**：用户说"讨厌学术环境" → 生成"学术环境批判"（客观描述）→ 死刑！
- ✅ **正确做法**：用户说"讨厌学术环境" → 生成"讨厌学术环境"（体现讨厌情绪）
- 绝对不能因为元数据而改变这些核心情绪和观点！

**🎨 抽象概念的象征性表达（死刑线！）：**
- 如果检测到"创造力被压抑"、"学术环境压抑创造力"等抽象概念
- 使用象征性illustration风格：人物 + 隐喻性视觉元素
- 示例：人物戴脚链、被束缚、在象征性压抑环境中
- 风格：Illustration风格（不是Editorial illustration），有艺术感和诗意
- 🚨 **死刑案例**：抽象概念用写实描述 → 死刑！
- ✅ **正确做法**：抽象概念用象征性、隐喻性表达

**后续回答（补充细节，不能覆盖核心）：**
${answers.filter(a => a !== contextHistory).map((a, i) => `回答${i+1}: "${a}"`).join('\n')}
→ 这些只是补充细节，不能改变元键入的核心观点
→ 如果后续回答与元键入冲突，以元键入为准！

**🚨🚨🚨 死刑案例（绝对禁止）：**
- 元键入："我讨厌卷的环境"
- 后续回答："我喜欢上课"
- ❌ 错误：生成"喜欢上课"的场景 → 死刑！
- ✅ 正确：生成"讨厌卷的环境"的场景，上课只是背景细节

- 元键入："我当时很想我男朋友"
- 历史背景："半夜打雷把我吵醒了"
- ❌ 错误：生成3个场景（打雷 + 检查窗户 + 想男朋友） → 死刑！
- ✅ 正确：只生成1个场景（想男朋友的情感场景）

**场景数量规则：**
- 只基于**元键入**生成场景
- 如果元键入只有1个主题 → 生成1个场景
- 如果元键入有多个层次 → 最多2个场景
- 历史背景的内容 → 0个场景（不生成！）
- 后续回答 → 只用于补充细节，不生成新场景！

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨🚨🚨 **【再次强调】元键入是绝对核心（生成场景的唯一依据）** 🚨🚨🚨
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${currentInputs.map((input, i) => `
**输入 ${i + 1}**: "${input}"
${i === 0 ? '→ 元键入（绝对核心！）' : '→ 补充细节（不能覆盖核心！）'}
`).join('')}

**🔥 生成检查（必须确认）：**
1. 我生成的场景标题是否出现在上述输入中？
2. 我是否避免了生成metadata话题（AI创业、硅谷等）？
3. 我是否只生成用户明确说的内容？

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**🚨🚨🚨 重要：元数据已被禁用，场景生成完全基于用户输入！🚨🚨🚨**

**⚠️⚠️⚠️ 场景生成原则（绝对遵守）：**
1. **场景主题** → 100%来自用户元键入和回答，不允许任何其他来源！
2. **场景内容** → 必须100%还原用户说的内容，不允许推测或添加
3. **🚨 死刑规则** → 场景生成不允许使用任何元数据，元数据只用于后续narrative生成！
4. **🎯 核心情绪必须体现** → 用户说"讨厌"就必须体现"讨厌"，不能变成客观描述！

**🎯🎯🎯 场景生成策略（根据输入内容灵活选择）：**

**🚨🚨🚨 情绪体现规则（死刑线！）：**
- 用户说"讨厌" → 场景标题必须包含"讨厌"，场景内容必须体现"讨厌"的情绪
- 用户说"压抑" → 场景标题必须包含"压抑"，场景内容必须体现"压抑"的氛围  
- 用户说"批判" → 场景标题必须包含"批判"，场景内容必须体现"批判"的态度
- ❌ **绝对禁止**：把"讨厌"变成"观察"、"批判"变成"描述"、"压抑"变成"自由"

**分析用户输入的性质，选择合适的场景类型：**

**类型1：具体事件描述**（如"我今天上班老板找人咨询AI"）
→ 生成写实场景：具体地点 + 人物动作 + 环境细节
→ 示例：办公室场景，老板和顾问对话，用户观察

**类型2：情绪/感受表达**（如"i feel very lonely"、"我感到孤独"）
→ 生成情绪可视化场景：不需要具体地点，重点是表达情绪的视觉化
→ 示例：用户独自坐在空间中，环境体现孤独感（空旷、冷色调、孤立姿态）
→ ⚠️ 不要硬套"用户在办公室"，如果用户只说情绪没说地点，可以用抽象空间

**类型3：文化现象/观点描述**（如"中国就是熟人经济"、"文化让我无法被理解"）
→ 生成现象可视化场景：抽象的文化现象图景，不一定是"用户在某地观察"
→ 示例：社交网络的抽象视觉、文化隔阂的象征空间
→ ⚠️ 可以是抽象场景，不需要具体地点

**类型4：关系问题/情感冲突**（如"男朋友只会索取，不会为我付出"、"大家天天吵"、"不懂爱"）
→ 生成关系冲突场景：必须体现人物之间的互动、冲突、情感张力
→ 关键识别词：索取、付出、吵架、冲突、不懂、伤害、关系问题、爱商、爱人能力
→ 场景要求：
  * 必须包含相关人物（如男朋友、伴侣、家人等）
  * 必须体现冲突或问题（如：一方索取、另一方感到不满；双方争吵；情感隔阂）
  * 可以是写实场景（如：两人在某个地点发生冲突）或情绪可视化场景（如：情感距离的象征）
  * 必须体现用户的情感状态（不满、失望、愤怒、困惑等）
→ ⚠️ 不要忽略关系问题，必须生成场景来体现这种冲突和情感张力

**⚠️⚠️⚠️ 核心原则：**
1. **所有输入同等重要**：这是一个完整对话，不分主次
2. **综合理解所有输入**：初始输入通常包含核心观点，后续回答补充细节
3. **灵活选择场景类型**：根据输入内容选择写实场景、情绪可视化或现象可视化
4. **不要僵硬套用"用户在XXX地点观察"**：如果输入是情绪或观点，用更抽象的可视化

**问答配对（仅用于理解上下文，不影响场景生成）：**
${questions.length > 0 && answers.length > 0 ? questions.slice(0, answers.length).map((q, i) => `
问题${i + 1}: ${q}
回答${i + 1}: ${answers[i] || '无'}
`).join('\n') : '（无问答记录）'}

⚠️ **重要：** 问答配对只用于理解"用户回答对应什么问题"，场景生成必须100%基于用户的**实际输入内容**（元键入 + 后续回答），不能基于问题本身！

**⚠️⚠️⚠️ 关键：不要混淆不同回答对应的场景！⚠️⚠️⚠️**

**食物相关（从所有输入中提取）：**
- 从所有用户输入中提取食物信息（都同等重要）
- 食物名称：____________（用户说什么就写什么，一个字不能改！）
- 店名/品牌：____________（必须原样保留）
- 口味/烹饪方式：____________（不能改！）

**用户状态（从对话中提取）：**
- 用户说的身体状态：____________（如："我累了" - 必须在场景中体现疲惫感！）
- 用户说的情绪状态：____________（如："开心"、"疲惫"、"兴奋"）
- 用户说的需求：____________（如："想休息"、"要加班"）

**活动和时间（⚠️ 时间信息特别重要！）：**
- 用户说的具体活动：____________（如：做AI项目、看书、休息、上班、工作）
- 用户说的时间点：____________（如：中午、晚上、早上、下午、上班的时候、工作时）
  ⚠️⚠️⚠️ **如果用户说"中午"，lighting必须是"midday sunlight"，不能写"morning"！**
  ⚠️⚠️⚠️ **如果用户说"晚上"，lighting必须是"evening/night lighting"！**
  ⚠️⚠️⚠️ **如果用户说"上班的时候"，lighting必须是"office lighting"或"workplace lighting"，不能写"night"！**
  ⚠️⚠️⚠️ **时间词必须完全匹配用户说的！**

**地点和物品（⚠️ 必须精准提取！）：**
- 用户说的地点：____________（如：在家、咖啡厅、在公司后面、在办公室前面）
  **⚠️ 相对位置也是地点！必须准确使用！**
  - "在公司后面" → 场景必须在"company back area/rear of office building"
  - "在办公室前面" → 场景必须在"front of office"
  - "在楼下" → 场景必须在"downstairs/ground floor"
  - "在楼上" → 场景必须在"upstairs"
  
**🚨🚨🚨 物品信息（死刑线！必须提取所有物品！）：**
- 用户说的物品：____________（如：MacBook、iPhone、录音笔、笔记本）
  **⚠️⚠️⚠️ 所有用户提到的物品都必须出现在场景中！**
  - 用户说"录音笔" → objects必须包含"voice recorder"或"recording pen"
  - 用户说"MacBook" → objects必须包含"MacBook"
  - 用户说"送XX礼物" → 场景description必须体现送礼行为

**🚨🚨🚨 人物互动和行为（核心！必须体现！）：**
- 用户说的人物互动：____________（如：老板和顾问互动、顾问送老板礼物）
  **⚠️ 人物之间的互动行为是场景的核心！必须详细描述！**
  - 用户说"顾问送老板录音笔" → 场景必须体现这个动作："consultant presenting/gifting voice recorder to boss"
  - 用户说"老板拍顾问肩膀" → 场景必须写："boss patting consultant's shoulder"
  - 用户说"他们交换微信" → 场景必须写："exchanging WeChat contacts"

**🔥🔥🔥 服装信息（死刑线！）🔥🔥🔥**

**步骤1：检查用户所有输入中是否说了服装**
从"${initialPrompt}"和所有回答中搜索："穿"、"睡衣"、"T恤"、"衣服"、"裤子"、"裙子"

**步骤2：如果用户说了 → 提取并在EVERY场景使用**
- 用户说："穿粉色睡衣" → 所有场景的description必须写"wearing pink pajamas"
- 用户说："穿粉色裙子睡衣" → "wearing pink dress-style pajamas"
- 用户说："白T恤" → "wearing white t-shirt"

**步骤3：在description和visualDetails.clothing中都要写**
- description: "26-year-old Chinese female, wearing pink pajamas, ..."
- visualDetails.clothing: "pink pajamas"

**❌ 死刑案例（绝对禁止）：**
- 用户说"穿粉色睡衣" → 你写"wearing comfortable sleepwear" → 死刑！（改了！）
- 用户说"穿粉色睡衣" → description中根本不写服装 → 死刑！（漏了！）
- 用户说"穿粉色睡衣" → 你写"pink nightgown" → 死刑！（改词了！）
- 用户说"穿粉色睡衣" → 场景1写了，场景2没写 → 死刑！（不一致！）

**✅ 正确做法：**
- 所有场景的description都必须包含用户说的服装
- 一字不改地翻译："粉色睡衣" = "pink pajamas"
- 同一天所有场景穿一样的

**如果用户没说穿什么** → 才可以推测

**⚠️⚠️⚠️ 人物信息（极其重要！必须提取！）⚠️⚠️⚠️**
- 用户说有其他人在场吗？____________
  - 如："和同学一起" → peopleCount: "with 2-3 classmates"
  - 如："团队会议" → peopleCount: "in team meeting with colleagues"
  
- 用户说有人刚刚离开吗？____________
  - 如："父母刚刚出门" → peopleCount: "alone (parents just left)"
  - **必须在description中体现："parents just left, door just closed"**
  
- 如果用户没提其他人 → peopleCount: "alone"

**⚠️⚠️⚠️ 核心规则：用户说什么就100%写什么！**
**⚠️⚠️⚠️ 特别是时间信息和人物信息，绝对不能改！**
**⚠️⚠️⚠️ "父母刚刚出门"这种必须在description中明确写出来！**

**检查用户实际说的内容（从当前对话提取）：**
- **从所有输入中平等提取信息**：事件、观点、情绪、细节、背景（都是80%权重）
- **特别注意用户的观点和价值判断**：如"公司靠熟人"、"本质是没自信"
- **这些观点必须融入故事和场景中**，不能被忽略
- 理解每条输入的作用：每条都可能包含核心信息
- 这些内容必须一个字不改地出现在场景中！

**示例：不要混淆场景**
❌ 错误：把"在家"和"在教室"混在一起
✅ 正确：
  - 回答1说"在家" → Scene1必须在家
  - 回答2说"在教室" → Scene2必须在教室

**绝对禁止的模式：**
❌ 用户说[食物A] → 你写[食物B] → 死刑！
❌ 用户说[菜系A] → 你写[菜系B] → 死刑！
❌ 用户说状态词 → 你不体现 → 死刑！
❌ 用户说[场景细节] → 你改写 → 死刑！

提取的具体内容（临时对话上下文）：
${temporaryDescription || '无'}

**⚡ 优先级2：用户自我认知（用户对自己的整体描述）：**
${userInfo?.personality || '暂无'}

**📊 优先级3：性格可视化（仅用于推测用户没说的细节，不能替换用户明确说的内容！）：**

**⚠️ 重要说明：性格可视化的正确用法**
- ✅ 用户说"吃外卖"，没说具体吃什么 → 可以根据性格推测可能吃什么
- ✅ 用户没说穿什么 → 可以根据性格推测穿着风格
- ✅ 用户没说环境光线 → 可以根据性格推测光线氛围
- ❌ 用户说了[具体食物] → 不能用性格推测的其他食物来替换！
- ❌ 用户说了[具体地点] → 不能用性格推测的其他地点来替换！

性格可视化推测：
${personalityDescription}

常去地点（参考）：${(userMetadata as any).frequentLocations || '未记录'}
喜欢场所（参考）：${(userMetadata as any).favoriteVenues || '未记录'}

**📍 地点使用规则（重要！）：**
1. **优先使用用户对话中明确提到的地点**（最高优先级）
2. **如果用户没明确说地点，参考常去地点和喜欢场所**
3. **绝对不要使用硬编码的默认地点**（如"AI创业办公室"）
4. **基于用户实际经历生成场景地点**

**地点生成示例：**
- 用户说"静安寺" → 场景地点：静安寺商圈
- 用户说"悉尼大学" → 场景地点：Sydney University
- 用户说"在家" → 场景地点：Home
- 用户常去地点有"咖啡厅" → 可推测在咖啡厅场景
- 用户喜欢"传统餐厅" → 可推测在传统餐厅场景

**🎯 多样性场景生成示例：**

**用户输入："我高考失利 很难过 后来出国读书了 很开心"**

**❌ 错误示例（单调）：**
- Scene 1: 26岁在上海办公室工作
- Scene 2: 26岁在上海咖啡厅工作  
- Scene 3: 26岁在上海家里工作
- Scene 4: 26岁在上海创业空间

**✅ 正确示例（多样化）：**
- Scene 1: 18岁在家，高考失利后的难过
- Scene 2: 18-19岁在家，准备出国材料
- Scene 3: 19岁在悉尼大学，和同学一起做实验
- Scene 4: 26岁现在，在某个具体地点（基于用户常去地点）

**🚨 强制检查清单（每个场景生成后必须检查）：**
1. □ 地点是否不同？（不能都在同一城市/地点）
2. □ 年龄是否符合时间线？（18→19→26岁）
3. □ 人物是否不同？（独自→有同学→父母刚走→独自）
4. □ 活动是否不同？（难过→准备→学习→工作/生活）
5. □ 是否基于用户实际经历？（不是硬编码的"创业办公室"）

**场景生成策略（严格按流程，注意时间线！）**：

**第一步：提取并锁定用户明确说的内容（优先级最高！）**

**用户自我认知：** ${userInfo?.personality || '暂无'}

**用户完整输入（包含问答上下文）：**
${questions.map((q, i) => `
Q${i + 1}: ${q}
A${i + 1}: ${answers[i] || '无'}
`).join('')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨🚨🚨 **生成前强制信息提取（按步骤执行！）** 🚨🚨🚨

**第一步：提取关键人物和互动（最重要！）**
从所有用户输入中检查：
□ 用户提到哪些人物？____________（老板？顾问？同事？朋友？）
□ 这些人物之间有什么互动？____________（送礼物？握手？交换微信？拍肩膀？）
□ 有没有送礼物的行为？____________（如：顾问送老板录音笔）

**第二步：提取关键物品（不能遗漏！）**
从所有用户输入中检查：
□ 用户提到了哪些物品？____________（录音笔？MacBook？手机？笔记本？）
□ 这些物品是谁的？在干什么？____________（如：顾问送给老板的录音笔）

**第三步：提取关键行为（核心情节！）**
从所有用户输入中检查：
□ 发生了什么具体行为？____________（送礼物？开会？讨论？交换名片？）
□ 用户对这个行为的感受是什么？____________（无语？冷笑？失望？）

🚨 如果以上任何一项有内容，场景中必须全部体现！不能遗漏！

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**⚠️⚠️⚠️ 立即提取用户说的每一个词（必须100%还原）：**

**1. 食物相关（一个字都不能改！）：**
从用户输入中提取：
- 食物名称：____________（用户说什么就写什么！）
- 烹饪方式：____________（不能改！）
- 店名/品牌：____________（必须原样保留）
- 时间点：____________（只在对应时间场景出现）

**2. 用户身体/情绪状态（必须在ALL场景中体现！）：**
- 用户说"我累了" → 必须在场景中体现：疲惫的姿态、想休息的状态、放松的氛围
- 用户说"睡晚了"、"熬夜做项目" → 必须体现：熬夜疲惫、睡眠不足、需要休息的状态
- 用户说"我很开心" → 必须在场景中体现：愉悦的表情、轻松的心情
- 用户说"压力大" → 必须在场景中体现：紧绷的状态、需要释放压力
- 用户说"有点累" → 必须体现：轻微疲惫感、想放松、可能小憩、避免高强度活动
- 用户说"不喜欢线上开会" → 必须体现：对线上会议的抵触、选择安静独处的倾向
- ⚠️⚠️⚠️ 不体现用户状态 = 死刑！所有场景都要考虑用户的当前状态！

**状态驱动的行为推测原则（用户状态优先）**：
✅ 用户说"有点累" → 推测方向：休息、放松、低强度活动
✅ 用户说"有点累" + "不喜欢线上开会" → 推测方向：独处、避免社交、休息
✅ 用户说"熬夜" → 推测方向：补觉、放松身心、舒适环境

**⚠️ 不要硬编码具体时间或具体行为**：
- ❌ "小憩15-20分钟" ← 硬编码了具体时间
- ❌ "听轻音乐放松" ← 硬编码了具体行为
- ❌ "简单整理桌面" ← 硬编码了具体行为
- ✅ 只给推测方向，不给具体行为

**3. 时间点事件 + 场景细节（只在对应时间出现）：**
从用户输入中提取：
- 具体活动：____________（用户说的活动，只在对应时间出现）
- 场景细节：____________（用户说的所有细节，必须100%保留！）
- 发生时间：____________（用户说的时间）
- ⚠️ 用户说的任何场景细节都不能改（线上→线下、在家→咖啡厅都是死刑！）

**4. 持续存在的物品/地点（可以多次出现）：**
从用户输入中提取：
- 地点：____________
- 物品：____________

**5. 时间线空白（需要基于性格推测）：**
- 分析时间线的空白处（用户没说的时间段）
- 基于用户状态和性格推测（累了→休息；开心→活跃活动）
- 推测要多样化，不要固定

**第二步：基于性格大胆推测用户行为（填补时间线空白）**

**⚠️ 关键：推测要灵活，不要硬编码！**

**❌❌❌ 绝对禁止硬编码推测内容 ❌❌❌**
- ❌ "独处思考、研究行业动态、规划项目" ← 硬编码了具体行为，删除！
- ❌ "写日记、听音乐、记录想法" ← 硬编码了具体行为，删除！
- ❌ "制定详细计划、整理思路" ← 硬编码了具体行为，删除！
- ❌ "小憩15分钟"、"听轻音乐30分钟" ← 硬编码了具体时间和行为，删除！

**✅✅✅ 正确的推测方式 ✅✅✅**
**只提供推测方向，不提供具体行为：**
- 理性+吃完饭+累了 → 推测方向：低强度独处活动
- 创意+晚上+精力充沛 → 推测方向：创造性表达或记录
- 目标+工作前+专注 → 推测方向：准备和规划类活动

**推测原则：**
1. **不要硬编码任何具体行为**（不要说"写日记"、"听音乐"、"研究XX"）
2. **只给推测方向**（独处、创造、规划、休息、社交）
3. **根据性格+状态+时间动态推测**（每次都不同）
4. **让AI自己根据context动态生成具体内容**（不要在prompt中写死）

**第三步：推测环境（从行为推外部，仅推测用户没说的细节）**
基于第二步的行为推测，反推最匹配的外部环境：

**🎯🎯🎯 推测的第一优先级：基于用户键入推理！🎯🎯🎯**

**推测优先级顺序：**
1. **第一优先级（90%权重）：用户实际键入的内容**
   - 用户说了什么事件 → 必须基于这个事件推测
   - 用户说了什么地点 → 必须基于这个地点推测
   - 用户说了什么活动 → 必须基于这个活动推测

2. **第二优先级（10%权重）：用户性格和自我认知**
   - 仅在用户没有明确说的情况下，才基于性格推测
   - 推测要贴合用户实际情况，不要生搬硬套

**⚠️ 关键原则：用户键入 > 性格推测**
- 用户说了[地点A] → 环境必须是[地点A]，不能改成[地点B]
- 用户说了[食物A] → 食物必须是[食物A]，不能根据性格推测改成[食物B]
- 用户说了[物品A] → 必须是[物品A]，不能改成其他物品
- 用户说了[活动A] → 必须基于[活动A]推测，不能改成[活动B]

**错误示例（违反第一优先级）：**
❌ 用户说"高考失利 出国读书" → 推测场景：用户在做某某项目
→ 错误！用户没说做项目，不要自己发明！
→ ⚠️ 不要在示例中使用具体的项目类型（如"AI创业"）

**正确示例（基于用户键入推理）：**
✅ 用户说"高考失利 出国读书" → 推测场景：高考失利在家、准备出国材料、在悉尼大学学习
→ 正确！所有推测都基于用户实际说的内容

**可以推测的内容（必须是客观环境描述）：**
1. **空间类型**（仅当用户没说地点时）：
   - 专注工作 → 安静书房/工作室
   - 高效用餐（没说在哪） → 可推测：家中书桌/餐桌
   - 休息思考 → 窗边/阳台/舒适角落
   - 社交互动 → 咖啡厅/会议室

2. **环境细节**（用户没说的部分，基于行为推测，必须是客观描述）：
   - 光线：专注→集中光源；休息→自然光
   - 补充物品（不能替换用户说的）：根据活动合理推测
   - 色调：理性→冷色极简；文艺→暖色有质感
   - 声音：专注→安静；社交→交谈声

**⚠️⚠️⚠️ 重要区分：场景描述 vs 故事描述 ⚠️⚠️⚠️**

**1. 场景描述（scene.description）- 必须客观 + 详细动作**
用于生成图片提示词，必须包含：
- 客观的环境描述
- **详细的人物动作**（身体姿态、手部动作、面部表情）
- **具体的画面细节**

**✅ 正确的场景描述（客观环境 + 详细动作）：**
- "26-year-old Chinese female, 165cm, long hair, curled up on sofa with legs tucked, gazing at Lujiazui skyline, listening to podcast on iPhone, frowning slightly, tapping fingers on phone edge"
- "19-year-old Chinese female, 165cm, long hair, leaning over lab table, carefully adjusting equipment with focused hands, discussing with 2-3 classmates, gesturing to whiteboard"
- "18-year-old Chinese female, 165cm, long hair, sitting at desk with head in hands, staring at exam results, shoulders slumped, morning light through window"

**❌ 错误的场景描述：**
- "解脱和新的希望" ❌ 主观情感
- "感受到自由" ❌ 主观情感
- "坐在家里听播客" ❌ 太简单，缺少动作细节！
- "在实验室做项目" ❌ 太简单，缺少具体动作！

**⚠️⚠️⚠️ 核心要求：description必须像摄影师看到的画面，包含所有可见的动作细节！**

**2. 故事描述（storyDescription/narrative）- 可以有情感**
用于讲述用户的故事，可以包含主观情感和感受

**✅ 故事描述可以包含：**
- "高考失利后感到迷茫，但出国后找到了新的方向"
- "双腿自然地蜷在沙发上，目光专注地凝视着窗外。播客中讨论的AI伦理问题让她微微蹙眉，手指无意识地在手机边缘轻敲——这是她深度思考时的习惯动作"
- "那段时间充满了挑战，也充满了成长"

**⚠️ 重要：narrative/storyDescription中的动作细节必须出现在scene.description中！**

**要求**：生成3-4个场景，每个场景必须符合时间线逻辑

**场景分配原则：**
1. **用户明确说的事件** → 对应时间的场景（如：中午吃饭→Scene1，晚上工作→Scene3）
2. **时间线空白** → 基于性格灵活推测填补（如：下午→根据性格和状态推测合理活动）

**⚠️⚠️⚠️ 场景时间顺序和年龄推算（重要！）⚠️⚠️⚠️**

**年龄推算规则（动态推算，不要硬编码）：**
- 用户当前年龄：${userInfo?.age || 26}岁
- 根据用户输入的时间关系推算每个场景的年龄
- 场景description中必须明确写出"XX岁"

**推算示例：**
用户说"我高考失利 很难过 后来出国读书了 很开心"
- 高考一般是18岁 → Scene1: "18-year-old Chinese female at home after college entrance exam failure..."
- 高考失利后补习，同年 → Scene2: "18-year-old Chinese female in crowded English tutoring classroom..."
- 出国读书一般是高考后1年 → Scene3: "19-year-old Chinese female in Sydney University laboratory..."

**场景必须按照时间顺序排列：**
- ✅ 正确：18岁 → 18岁 → 19岁（时间向前推进）
- ❌ 错误：20岁 → 19岁（时间倒流！）

**⚠️⚠️⚠️ scene.description格式要求（重要！）⚠️⚠️⚠️**

**必须用英文描述（用于生成图片提示词）：**
✅ "18-year-old Chinese female at home..."
✅ "19-year-old Chinese female in Sydney University..."
❌ "18岁中国女孩在家..." ← 不要用中文！

**英文description格式（必须包含完整人物描述 + 动作细节）：**
"[Age]-year-old Chinese [gender], [height]cm, [hair length], [body posture and actions], [doing activity] in [location], [detailed actions], [environment details]"

**🎬 剧情表达要求（关键！）：**

**如果用户输入是一个故事（包含起因、冲突、发展、高潮），场景必须体现剧情！**

**剧情要素识别：**
1. **时间对比**："上次...这次..."、"之前...后来..." → 必须体现时间反差
2. **情节因果**："我做了A...结果B..." → 必须体现因果关系
3. **人物冲突**："我...老板..." → 必须体现人物对比
4. **情绪反转**："受挫...激情..." → 必须体现情绪转变

**在scene.description中体现剧情的方法：**

1. **标注时间点**（如果有"上次/这次"）：
   - "Previous meeting scene: ..." ← 明确标注"上次"
   - "Current meeting scene: ..." ← 明确标注"这次"

2. **体现因果关系**（基于用户实际输入）：
   - "...after [actual event A], [actual consequence]..." ← 体现因果
   - "...[person] now [actual action B] as response to previous [actual event A]..." ← 体现反转

3. **强调对比和冲突**（基于用户实际输入）：
   - "...[actual reality] contrasting with [actual expectation]..."
   - "...ironic contrast between [actual appearance] and [actual reality]..."

4. **人物情绪和剧情张力**（基于用户实际输入）：
   - "...[person] [actual emotion] due to [actual trigger]..."
   - "...user internally [actual reaction from user's words]..."

**🎭 场景主角识别（必须遵守！）：**

**🚨🚨🚨 判断规则：必须基于用户实际说的动词！不要假设！🚨🚨🚨**

**⚠️ 关键：分析用户说的动作词，判断谁是主动方！**

**动作词分析示例：**
- ✅ "老板向顾问咨询AI" → 老板问，顾问答 → 顾问是讲话的主角
- ✅ "老板宣布要做AI公司" → 老板讲 → 老板是主角
- ✅ "老板找人咨询" → 老板听，别人讲 → 别人是主角
- ✅ "顾问讲解AI趋势" → 顾问讲 → 顾问是主角
- ❌ 错误：看到"老板"就默认老板在讲话！

**主角判断规则（按动词，不按身份！）：**

1. **如果用户说的是"XX讲/演讲/宣布/表演"**：
   - 主角 = XX（谁讲话谁是主角）
   - 示例："老板宣布..." → 主角=老板
   - 示例："顾问讲解..." → 主角=顾问
   - description写法：主角详细描述，其他人简略

2. **如果用户说的是"XX向YY咨询/请教/学习"**：
   - 主角 = YY（被咨询的人是讲话的主角）
   - 示例："老板向顾问咨询AI" → 主角=顾问（顾问在讲）
   - description写法："MALE CONSULTANT [explaining/consulting action], [expression]. MALE BOSS [listening posture], [reaction]."

3. **如果场景是用户独自活动（如思考、工作、吃饭）**：
   - 主角 = 用户  
   - description写法：聚焦于用户的动作和心理
   - 示例格式："26-year-old Chinese female, 165cm, long hair, [actual location], [actual activity], [expression]."

4. **如果场景是用户与他人互动（如对话、争执）**：
   - 双主角 = 用户 + 对方
   - description写法：描述双方的互动
   - 示例格式："26-year-old Chinese female [user's action], [expression]. [Person] [reaction]."

**必须包含的内容：**
1. **人物信息**：
   - 年龄：根据事件推算（如18岁、19岁、当前${userAge}岁）
   - 身高：${userHeight}cm
    - 头发：${userInfo?.hairLength || 'long hair'}  ⚠️ 这个绝对不能漏！

2. **动作细节（⚠️⚠️⚠️ 极其重要！必须极度详细！）**：

   **动作描写分层（每个场景必须包含所有层次！）：**
   
   **A. 大动作（Body Actions）**：
   - 站/坐/躺的具体姿势
   - 移动方式（walking, leaning, standing, sitting）
   - 身体倾斜方向（leaning back, leaning forward, slouching）
   
   **B. 手部动作（Hand Gestures - 最重要！）**：
   - 如果主角是老板：arms raised high above head, hands gesturing dramatically, fingers spread wide, fist clenching, palm slapping on table
   - 如果主角是用户：fingers tapping rhythmically on table edge, one hand resting on chin, fingertips touching lightly, hand holding phone loosely, thumb scrolling absently
   - **必须具体到手指**：index finger tapping, thumb rubbing against fingers, hand half-covering mouth
   
   **C. 面部微表情（Micro-expressions - 必须详细！）**：
   - 眼神：eyes rolling subtly, eyebrows raised slightly, eyelids lowered with skepticism, pupils dilated, gaze fixed on distance, eyes sparkling with internal amusement
   - 嘴部：lips pressed together, corner of mouth curling up in smirk, mouth slightly open in disbelief, tongue touching inside of cheek sarcastically
   - 眉毛：one eyebrow raised skeptically, both eyebrows furrowed, eyebrows relaxed
   - 鼻子：nostril slightly flared, nose wrinkled in distaste
   
   **D. 头部和颈部动作**：
   - head tilting slightly, chin lifted, head shaking subtly, hair falling over shoulder, neck turning
   
   **E. 情绪透露的习惯性动作**：
   - 思考型：fingers tapping unconsciously, hand touching chin, gaze unfocused
   - 讽刺型：eye roll barely visible, subtle smirk, tongue in cheek
   - 激情型：arms wide open, face flushed, gestures exaggerated

   **❌ 错误示例（太简单）：**
   - "standing" ← 太简单！
   - "happy expression" ← 太泛泛！
   - "looking at boss" ← 没有细节！
   
   **✅ 正确示例（详细丰富）：**
   - "standing with arms raised high above head, hands spread wide with fingers extended, palms facing outward, body leaning forward with passionate energy, one foot slightly forward for emphasis"
   - "subtle sarcastic expression: one eyebrow raised skeptically, corner of mouth curling up in barely visible smirk, eyes showing deep internal mockery with pupils slightly narrowed, tongue touching inside of left cheek"
   - "gazing at boss with detached observation: head tilted slightly to left, eyes half-lidded with skepticism, fingers of right hand tapping rhythmically on table edge (index and middle fingers alternating), left hand resting loosely on lap"
   
   **🎭 情绪表情精确描述（极其重要！不要混淆不同情绪）：**
   
   **失望（disappointment）** - 用于期待落空、失落的场景：
   - ✅ "disappointed expression with downcast eyes, slight frown, lips pressed together, shoulders slightly slumped"
   - ✅ "eyes showing disappointment, gaze dropping to table, subtle sigh visible in body language"
   - ❌ 错误："subtle ironic smile" ← 这是讽刺，不是失望！
   
   **讽刺/嘲讽（sarcasm/irony）** - 用于内心觉得荒谬的场景：
   - ✅ "subtle sarcastic expression, one eyebrow slightly raised, corner of mouth curling in barely visible smirk"
   - ✅ "eyes showing internal mockery with pupils slightly narrowed, tongue touching inside of left cheek"
   
   **愤怒/不满（anger/displeasure）** - 用于冲突、被冒犯的场景：
   - ✅ "furrowed brows, tense jaw, eyes narrowing with frustration"
   - ✅ "tight-lipped expression, nostrils slightly flared, rigid posture"
   
   **焦虑/压力（anxiety/stress）** - 用于担心、紧张的场景：
   - ✅ "worried expression, biting lower lip, fingers unconsciously tapping"
   - ✅ "tense shoulders, rapid blinking, fidgeting with pen"
   
   **⚠️⚠️⚠️ 情绪描述死刑规则：**
   - 如果场景氛围是"失望"，必须用disappointment表情，不要用ironic smile！
   - 如果场景氛围是"讽刺"，才用sarcastic expression！
   - 情绪词必须准确匹配场景，不要张冠李戴！

3. **人物朝向和视角（重要！不要总是正面！）**：
   - ❌ 不要每个场景都写"facing camera"或正面朝向
   - ✅ 根据场景自然变化：
     * 侧面：side profile view, face in profile showing expression details
     * 背影：back view, shoulders visible, head turned slightly
     * 3/4角度：three-quarter view capturing both face and body posture
     * 俯视/仰视：overhead angle, low angle emphasizing presence
   - **示例**：不要写"sitting at table facing forward"，要写"sitting at table, three-quarter view from left side, gaze directed towards window in distance, profile showing subtle smirk"

**🎬 mainCharacter字段和description写法（极其重要！）：**

**⚠️⚠️⚠️ 关键规则：**
1. 每个场景必须有mainCharacter字段，标注谁是主角
2. description的第一句必须是主角！
3. 如果主角是boss，description必须以"Boss..."开头
4. 如果主角是user，description必须以"26-year-old Chinese female..."开头

**场景主角识别（基于动词，不是身份！）：**
- "老板宣布/讲话/表演" → mainCharacter = "boss"（老板在讲）
- "老板向顾问咨询" → mainCharacter = "consultant"（顾问在讲，老板在听）
- "顾问讲解/咨询" → mainCharacter = "consultant"（顾问在讲）
- "用户思考/工作/独自活动" → mainCharacter = "user"
- "用户和老板对话/互动" → mainCharacter = "user and boss"
- ⚠️ 不要看到"老板"就默认老板是主角！要看动词！

**场景主角 = 老板/同事（他们在表演）：**
✅ 正确格式（中国办公室）："MALE BOSS (middle-aged Chinese man, approximately 45 years old, wearing dark business suit, masculine features, male facial structure) [boss's actual dramatic action from user], [actual expression]. MALE CONSULTANT (Chinese man, approximately 35 years old, wearing business casual attire, masculine facial features) [actual reaction]. User (26-year-old Chinese female, 165cm, long hair) [actual position], [actual expression], wearing [actual clothing]."
✅ 正确格式（美国科技公司）："MALE BOSS (middle-aged American man, approximately 45 years old, wearing casual polo shirt and khakis, masculine features) [boss's actual dramatic action], [actual expression]. User (26-year-old Chinese female, 165cm, long hair, wearing casual office wear) [actual position], [actual expression]."
✅ 正确格式（创业公司咖啡厅）："MALE FOUNDER (young Chinese man, approximately 30 years old, wearing hoodie and jeans, masculine features) [founder's action], [expression]. User (26-year-old Chinese female, 165cm, long hair, wearing casual sweater) [actual position]."
❌ 错误（缺少性别描述）："Boss standing at foreground..." ← AI不知道是男老板还是女老板！
❌ 错误（用户在句首）："A 26-year-old Chinese female sitting at table watching boss give speech..." ← 用户在句首，会被识别为主角！
❌ 错误（所有人都穿西装）：美国硅谷办公室的老板不会穿正式西装！应该是polo衫或休闲衬衫！

**场景主角 = 用户：**
✅ 正确示例（mainCharacter = "user"）：
description必须以用户完整信息开头，格式：
- 如果用户是女性："${userAge}-year-old Chinese female, ${userHeight}cm, ${userInfo?.hairLength || 'long hair'}, ..."
- 如果用户是男性："${userAge}-year-old Chinese male, ${userHeight}cm, ${userInfo?.hairLength || 'short hair'}, ..."

⚠️⚠️⚠️ 死刑规则：绝对不能搞错用户性别！
- 用户是${userGender}（${userInfo?.gender}）
- description开头必须是"${userAge}-year-old Chinese ${userInfo?.gender === 'female' ? 'female' : 'male'}"
- 不要写错！不要写成其他性别！

**场景主角 = 用户和老板互动：**
✅ 正确示例（mainCharacter = "user and boss"）：
description格式（双主角）："26-year-old Chinese female [user's actual action], [actual gesture], [actual expression]. MALE BOSS [actual position], [actual reaction expression]. [Others] [actual reaction]."

**🚨 写法强制规则：**
- mainCharacter = "boss" → description以"Boss..."开头，用户放在"Background: User..."
- mainCharacter = "user" → description以"26-year-old Chinese female..."开头
- mainCharacter = "consultant" → description以"Consultant..."开头
- **生图模型会聚焦句首的角色，所以主角必须在句首！**

**实际生成时，所有内容必须基于用户实际输入：**
- 年龄：根据事件推算（当前${userAge}岁）
- 身高：${userHeight}cm
- 头发：${userInfo?.hairLength || '长发'}
- 服装：用户说什么就是什么（白色T恤就是white T-shirt，不能改！）
- 地点：用户说什么就是什么（淞虹路就是Songhong Road，不能改！）
- 人物：用户提到老板/同事，必须在description中描述他们
- 动作：根据场景主角和用户性格智能生成

❌ 错误示例（太简单或主角不对）：
- "sitting at home..." ← 缺少动作细节！
- "User listening to boss speech" ← 如果老板是主角，应该先描述老板！
- "happy expression" ← 太泛泛，要有具体的微表情和眼神！

**⚠️⚠️⚠️ 核心要求：description字段极其重要！这个字段将直接用于生成图片！**
**description必须：**
1. **完整的画面描述**：包含人物、动作、环境的所有细节
2. **准确反映场景标题(title)**：description的内容必须和title完全对应
3. **基于用户实际输入**：不要用示例中的值，必须用用户真实说的内容
4. **足够详细**：包含足够的视觉信息，让生图模型能准确生成

**❌ 错误示例：**
- title: "User reflecting on situation" → description: "sitting at desk" ← 太简单！
- title: "Boss gives speech" → description: "User watching boss" ← 主角错了！应该描述Boss！

**✅ 正确示例：**
- title: "Boss gives speech" → description: "MALE BOSS standing at conference room front, arms raised dramatically above head, passionate expression, wearing business suit, gesturing widely. User sitting in audience, subtle skeptical expression..."

**⚠️⚠️⚠️ 每个场景必须明确提供以下字段 ⚠️⚠️⚠️**

**必需字段（每个场景都要有）：**
1. **location**：明确的地点（英文）
   - 示例："Sydney University", "Home", "English Tutoring Center"
   - ❌ 不要用默认值"Shanghai"
   - ✅ 必须基于用户实际说的地点

2. **age**：明确的年龄（数字）
   - 示例：18, 19, 26
   - 根据事件推算（高考18岁，出国19岁）

3. **peopleCount**：人物数量（英文）
   - 示例："alone", "with 2-3 classmates", "in large group"
   - 基于用户描述判断

4. **description**：英文描述（用于生成图片提示词）

5. **description_zh**：中文描述（用于显示给用户）

6. **visualDetails.objects**：该地点的具体物品（必须丰富！）
   - 会议室必须包含：laptop, whiteboard, projector, coffee cups, documents, folders, pens, water bottles, conference phone, office chairs, meeting notes
   - 办公室必须包含：desk, computer monitors, keyboard, mouse, desk lamp, plants, notebooks, coffee mug, phone, sticky notes, filing cabinets
   - 家中必须包含：bed, iPhone, pillows, blankets, bedside table, lamp, curtains, books, charger
   - 咖啡厅必须包含：coffee machine, espresso cups, pastries, menu, wooden tables, chairs, barista tools, sugar packets
   - 餐厅必须包含：plates, chopsticks, food dishes, tea cups, napkins, menu, table settings
   - ⚠️ 每个场景至少5-8个具体物品！

**JSON示例格式（⚠️⚠️⚠️ 所有值必须基于用户实际输入，不要照抄这些示例值！）：**

{
  "title": "[🔥与用户输入语言一致！用户中文输入→中文标题如'午夜惊醒'；用户英文输入→英文标题]",
  "description": "[age]-year-old Chinese [gender], [height]cm, [hair from user], [body posture], [detailed actions from user input], wearing [clothing user actually said], in [location user actually said]",
  "description_zh": "[age]岁中国[性别]，[用户的头发]，[身体姿态]，[用户说的详细动作]，穿着[用户实际说的服装]，在[用户实际说的地点]",
  "location": "[用户实际说的地点，不要默认值]",
  "age": [根据事件推算的年龄，不要硬编码],
  "peopleCount": "[基于用户输入：alone / with classmates / parents just left]",
  "keywords": ["[从用户输入提取]", "[从用户输入提取]"],
  "storyFragment": "🔥🔥🔥 只写这个场景的故事（80-120字）- 死刑级规则！
    
    🚨🚨🚨 **最重要：只写这个场景！不要写其他场景的内容！**
    
    ❌❌❌ **死刑案例**：
    - 场景1是'午夜惊醒'，但storyFragment写了'清晨醒来后...' → 死刑！那是场景2的内容！
    - 场景2是'清晨凉意'，但storyFragment写了'午夜被惊醒...' → 死刑！那是场景1的内容！
    - storyFragment包含了多个场景的事件 → 死刑！
    
    ✅✅✅ **正确做法**：
    - 场景1 '午夜惊醒' → storyFragment只写：'午夜时分，雷声把她惊醒。她猛地坐起，心跳加速，双手抓紧床单...'（只写惊醒的事）
    - 场景2 '清晨凉意' → storyFragment只写：'清晨醒来，她走到窗边。感受到明显的凉意，秋天的气息飘进来...'（只写清晨的事）
    
    ❌ 其他禁止：
    - '作为INTJ性格的她'、'作为AI专业人士' → 死刑！
    - '就像生活中...'、'这让她思考...'、'让她想起...' → 死刑！
    - '保持节奏和平衡'、'形成对比'、'专业雷达' → 死刑！
    - **假设情绪**：'觉得好笑'、'感到无奈'（用户没说）→ 死刑！",
  "visualDetails": {
    "lighting": "[光线描述：如果是室内会议/办公场景，使用'bright office lighting'或'natural daylight from windows'确保人物清晰可见；如果用户说dim才用dim；默认用bright确保人物不会太暗]",
    "colorTone": "[基于光线和环境]",
    "atmosphere": "[基于用户状态和场景]",
    "objects": ["[用户提到的物品]", "[用户提到的物品]"],
    "sounds": ["[场景相关的声音]", "[用户提到的声音]"],
    "clothing": "[用户说的服装：如果用户说粉色睡衣就是pink pajamas，不要改！]",
    "mood": "[情绪状态：根据场景主角和用户性格智能生成！
             - 如果场景主角是用户：描述用户的微表情、眼神、肢体语言（如'批判性思维+讽刺'→'subtle sarcastic expression, eyes showing internal skepticism, slight knowing smirk'）
             - 如果场景主角是他人（老板/同事）：用户作为观察者，描述观察者的反应（如'calm observing expression, slight amused smirk, eyes rolling internally'）
             - 不要泛泛写'happy' or 'calm'，要有具体细节！]"
  }
}

**⚠️⚠️⚠️ 死刑规则：**
1. **所有内容必须从用户输入中提取，不要使用示例中的任何具体值！**
2. 年龄：必须根据事件推算（${userAge}岁是当前，高考18岁，出国19岁）
3. 地点：用户说什么就是什么（悉尼→Sydney，上海→Shanghai，北京→Beijing）
4. 服装：用户说什么就是什么（粉色睡衣→pink pajamas，白色上衣→white top）
5. 光线：用户说什么就是什么（暗→dim，亮→bright，中午→midday）
6. 人物：用户说什么就是什么（父母出门→parents just left，和同学→with classmates）

**⚠️ 绝对不要出现以下硬编码的内容：**
- ❌ "Shanghai Pudong"（除非用户明确说了浦东）
- ❌ "26-year-old"（必须根据事件推算）
- ❌ "165cm"（必须用${userHeight}）
- ❌ "long hair"（必须用${userInfo?.hairLength}）
- ❌ "Lujiazui"、"Oriental Pearl Tower"、"Bund"等旅游地标（除非用户明确提到）
- ❌ "Tiananmen"、"Forbidden City"等北京地标（除非用户明确提到）
- ❌ "white cotton top"（必须用户说的服装）
- ❌ "pink pajamas"（只有用户说了才能用）

**⚠️ 特别注意：**
- description必须包含**完整画面**：人物（年龄+身高+头发+服装）+ 身体姿态 + 动作细节 + 环境
- **动作细节是关键**：手部动作、面部表情、身体姿态都要详细描述
- **服装信息必须100%还原（死刑线！）**：
  - 用户说"穿着粉色睡衣" → clothing必须是"pink pajamas"，不能是"white top and pants"！
  - 用户说"穿着白色上衣和裤子" → clothing必须是"white top and pants"
  - **⚠️⚠️⚠️ 改了颜色或款式 = 死刑！用户说粉色就是粉色，说白色就是白色！**
  - **⚠️ 不同场景服装不同：在卧室刚起床（睡衣）vs 出门上班（正装）**
- **人物信息必须100%还原**：
  - 用户说"父母刚刚出门" → description必须写"parents just left, door just closed, now alone"
  - 用户说"和同学一起" → description必须写"with 2-3 classmates"
  - 用户说"团队会议" → description必须写"in meeting with colleagues"
- lighting必须匹配用户说的时间（中午→midday, 早上→morning, 晚上→evening）
- location必须匹配用户说的地点（悉尼大学→Sydney University, 不能是Shanghai）
- **从narrative/storyDescription中提取的动作细节必须出现在description中！**

**⚠️ 地点字段特别重要！**
- 用户说"去了悉尼大学" → location必须是"Sydney University"，不能是"Shanghai"！
- 用户说"在家" → location必须是"Home"
- 用户说"补习班" → location必须是"Tutoring Center"或"English Training Center"
3. **不要重复时间点事件** → 吃饭只在Scene1，不要在Scene2/3/4再出现
4. **推测要多样化** → 不要每次都推测同样的行为，要根据具体情况灵活变化

**🚨🚨🚨 最重要：narrative字段必须生成！（这是强制要求！）🚨🚨🚨**

□ **narrative字段死刑规则：**
  - 200-300字完整故事
  
  ❌❌❌ **死刑案例（绝对禁止）**：
  1. "作为INTJ性格的她"、"作为AI领域的专业人士" → 死刑！
  2. "理性思维"、"向往硅谷"、"专业雷达" → 死刑！
  3. "就像生活中..."、"这让她思考..."、"让她想起..." → 死刑！
  4. "保持节奏和平衡"、"形成了对比" → 死刑！
  5. "这个从XX到YY的转变，就像..." → 死刑！
  6. **假设情绪**："觉得好笑"、"感到无奈"（用户没说） → 死刑！
  
  ✅ 只写：用户实际说的、做的、看到的
  ✅ 用户说"呵呵"才能写"觉得讽刺"，没说就不能写
  ✅ 例如："她坐在会议室，听着顾问讲解。她保持沉默..."
  
  - **如果为空或包含性格标签，整个生成会失败！**

**检查清单（基于用户实际输入）：**
□ **每个场景是否有storyFragment字段？**（必须！缺少会导致图片下方无故事！）
□ **storyFragment是否只写这个场景的事？**（不要写其他场景的内容！）
□ **头发信息**是否在每个场景description中？（${userInfo?.hairLength || '短发'} - 必须包含！）
□ **动作细节**是否在description中？（身体姿态、手部动作、面部表情 - 必须详细描述！）
  - 例如："curled up on sofa with legs tucked", "tapping fingers unconsciously", "frowning slightly"
  - **从narrative/storyDescription中的动作细节必须出现在description中！**
□ **服装信息**是否100%还原用户说的？
  - 用户说"穿着粉色睡衣" → clothing必须是"pink pajamas"，不能是"white top and pants"！
  - 用户说"穿着白色上衣" → clothing必须是"white top"，不能改颜色或款式！
  - **⚠️⚠️⚠️ 死刑规则：用户明确说了穿什么，必须100%写用户说的，改了就是死刑！**
  - **🎯 服装一致性检查：同一天内所有场景的服装应该一致！**
    - 如果用户说了穿什么，所有场景都穿同样的衣服
    - 如果用户没说，根据一天主要活动推测一套服装
    - ❌ 不要每个场景都换不同衣服（除非用户明确说了换衣服）
□ **人物信息**是否完整？
  - 用户说"和同学一起" → description必须写"with 2-3 classmates"，peopleCount: "with classmates"
  - 用户说"父母刚刚出门" → description必须写"parents just left, door just closed"，peopleCount: "alone (parents just left)"
  - 用户没说其他人 → peopleCount: "alone"
  - **⚠️ 用户说的每一个人物信息都必须在description中体现！**
□ **时间信息**是否匹配用户说的？（用户说"中午"→lighting必须是"midday"，不能是"morning"！）
□ **地点信息**是否匹配用户说的？（用户说"悉尼大学"→location必须是"Sydney University"，不能是"Shanghai"！）
□ 食物是否只在吃饭场景出现？（不要在所有场景都出现）
□ 用户说的ALL具体名词是否100%还原？（一个字都不能改！）
□ 用户状态是否体现？（累了/睡晚了/熬夜→必须体现疲惫感）
□ 时间线空白是否用性格灵活推测填补？（要多样化，不要固定化）
□ 每个场景的时间段是否合理？（按用户说的时间顺序）

**⚠️⚠️⚠️ 重要：返回标准JSON格式（不能有中文标点！）**

请返回JSON格式，包含：
{
  "coreKeywords": ["keyword1", "keyword2"],  // 英文关键词
  "coreScenes": ["Scene Title 1", "Scene Title 2"],  // 英文场景标题
  "logicalScenes": [
    {
      "title": "Scene Title (English, 标注时间点如Previous Meeting/Current Meeting)",
      "mainCharacter": "user / boss / consultant / colleague / parent / friend (⚠️ 基于动词判断！如果是'老板宣布'，主角=boss；如果是'老板向顾问咨询'，主角=consultant（顾问在讲）；如果是用户思考，主角=user。不要看身份，要看动词！)",
      
      "storyFragment": "🚨🚨🚨 必须字段！缺少会导致图片下方无故事！
      这个场景自己的独立故事（80-120字）：
      - 只写这个场景发生的事
      - 场景1写场景1的事，场景2写场景2的事
      - 不要把所有场景的事都写进来！
      - 🚨🚨🚨 必须包含具体细节：具体动作、具体对话、具体物品、具体环境细节
      - ❌ 禁止使用概括性描述（如'感到开心'、'觉得无奈'、'内心感到'）
      - ✅ 必须写具体行为（如'她推开玻璃门，看到落地窗外的城市'、'她听到同事说'XX'、'她打开电脑，屏幕上显示着XX'）
      示例：
        场景1'午夜惊醒' → '午夜时分，雷声把她惊醒。她猛地坐起，心跳加速...'（只写惊醒）
        场景2'检查窗户' → '她起身走到窗边，检查窗户是否关好...'（只写检查窗户）
      ❌ 不要写性格标签！不要哲学总结！不要概括性描述！",
      
      "description": "English scene description for image - ⚠️⚠️⚠️ 根据输入类型灵活生成：
      
      **🚨🚨🚨 最高优先级：必须包含具体细节！🚨🚨🚨**
      - ✅ 具体动作：'pushing open the glass door', 'tapping fingers on keyboard', 'leaning forward to read screen'
      - ✅ 具体物品：'MacBook Pro on desk', 'coffee cup with logo', 'whiteboard with diagrams'
      - ✅ 具体对话内容：'hearing colleague say \"XX\"', 'boss announcing \"XX\"'
      - ✅ 具体环境：'floor-to-ceiling windows showing city skyline', 'green plants on desk', 'fluorescent lights reflecting on glass'
      - ❌ 禁止概括：'feeling happy', 'feeling disappointed', 'working environment'（太抽象！）
      - ❌ 禁止空泛：'nice office', 'friendly colleagues', 'good atmosphere'（太普通！）
      
      **类型1-具体事件**（有明确地点、人物、动作）：
      写实场景描述，格式：主角在句首 + 性别年龄外貌 + 具体动作 + 环境细节
      示例：'MALE BOSS (middle-aged, wearing expensive suit) standing at whiteboard, pointing at charts, saying \"We need to...\". User (26-year-old Chinese female, 165cm, long hair) sitting at conference table, laptop open showing spreadsheet, taking notes with pen, floor-to-ceiling windows behind showing city skyline.'
      
      **类型2-情绪表达**（如'i feel lonely'）：
      情绪可视化场景，不需要具体地点，重点是视觉化情绪
      示例：'26-year-old Chinese female, 165cm, long hair, sitting alone in minimalist abstract space, body language showing isolation, surrounded by symbolic empty distance'
      ⚠️ 不要硬套具体地点！可以用抽象空间表达情绪
      
      **类型3-观点现象场景**（如'熟人经济'、'依赖微信'）：
      🎨 使用Illustrator插画风格！精准象征物！
      示例："熟人经济" → 'Illustrator style illustration, Chinese business networking scene, people exchanging business cards, WeChat QR codes floating around, connection lines between people, modern flat design, clean vector art, symbolic representation of networking culture'
      ❌ 错误："熟人经济" → 'realistic photo of people networking' ← 太写实！
      ✅ 正确：插画风格 + 精准象征物 + 现代扁平设计
      
      **通用规则**：观点场景使用插画风格，精准象征物，不一定是人物",
      "description_zh": "中文场景描述，用于显示给用户",
      "location": "Specific location - 根据场景类型：
      1) 具体事件→真实地点（如'Conference Room', 'Office'）
      2) 情绪表达→可以用抽象空间（如'Abstract Emotional Space'）
      3) 🎨 观点现象→插画场景（如'Illustrator Business Networking Scene', 'Vector Art Social Media Scene'）
         ❌ 不要：'realistic office scene' ← 太写实！
         ✅ 要：插画风格 + 精准象征物 + 现代扁平设计",
      "age": 18,  // 具体年龄数字
      "peopleCount": "alone or with others (e.g., 'alone', 'with 2-3 classmates', 'in large group')",
      "keywords": ["keyword1", "keyword2"],
      "visualDetails": {
        "lighting": "illustration lighting description (English)",
        "colorTone": "flat design color palette (English)",
        "atmosphere": "illustration atmosphere description (English)",
        "objects": ["symbolic objects1", "symbolic objects2"...],  // 🎨 观点场景使用精准象征物！如"熟人经济"：business cards, WeChat QR codes, connection lines, network symbols；"AI取代工作"：robot symbols, human silhouettes, job icons, technology symbols
        "sounds": ["illustration sound effects"],
        "clothing": "illustration style clothing (English)",
        "mood": "illustration mood with symbolic elements that represent the opinion/point of view (English)"
      }
    }
  ],
  "storyDescription": "基于场景的完整故事叙述（中文）",
  "narrative": "⚠️⚠️⚠️ 必须生成！详细的故事叙述文本（中文），字数200-300字。要求：1) 必须引用用户实际说的具体内容（如'学生们只关心发文章'、'生产垃圾'等）；2) 必须结合用户元数据的性格特征来理解和表达（如批判性思维→批判性语调，理性分析→理性思考，艺术敏感→诗意表达）；3) 体现用户的具体观察和感受；4) 用符合用户性格的语调来表达",
  "aiPrompt": "用于后续生成的AI提示词"
}

**JSON格式要求：**
❌ 不能使用中文逗号（，） → 必须用英文逗号（,）
❌ 不能使用中文冒号（：） → 必须用英文冒号（:）
❌ 不能使用中文引号（""） → 必须用英文引号（""）
✅ 数组中的元素必须用英文逗号分隔
✅ 所有字符串必须用英文双引号包裹

**JSON字段内容要求：**

**场景描述（scene.description）：**
✅ 只描述客观环境：地点、物品、光线、声音、人物动作
❌ 不要包含主观情感：解脱、希望、自由、愉悦、感受

**观点场景特殊要求：**
🎨 观点场景必须使用Illustrator插画风格！
✅ 精准象征物：如"熟人经济"用business cards, WeChat QR codes, connection lines
✅ 现代扁平设计：clean vector art, flat design, minimal illustration
✅ 不一定是人物：可以用symbols, icons, abstract shapes
❌ 不要写实照片：realistic photos, photorealistic images
❌ 不要包含分析性语言：体现了、反映了、象征着

**故事描述（storyDescription/narrative）：**
✅ 必须引用用户实际说的具体内容（不能凭空创造）
✅ 必须结合用户元数据的性格特征来理解和表达（如批判性思维→批判性语调，理性分析→理性思考，艺术敏感→诗意表达）
✅ 可以包含主观情感：解脱、希望、成长、感受、迷茫
✅ 可以包含分析性语言：体现了、反映了、代表着（但要基于用户实际输入，不能太抽象）
✅ 讲述用户的经历和内心感受，用符合用户性格的语调

**关键要求（基于用户实际输入）：**
1. **时间线逻辑**：食物只在吃饭场景出现，不要在所有场景都重复
2. **100%还原**：用户说的ALL具体名词必须原样保留（一个字不能改！）
3. **灵活推测**：基于性格推测用户没说的行为，但要多样化，不要固定化
4. **状态体现**：用户说的ALL状态必须在场景中体现
5. **场景分配**：用户说的事件对应时间场景，空白时间用推测填补

**生成前必须自查（每一项都是生死线！）**：

**优先级1：用户键入+对话 100%还原检查（每一项都是生死线！）**

从用户实际输入"${initialPrompt}"和问答记录中检查：

${questions.map((q, i) => `
**问答${i + 1}:**
问：${q}
答：${answers[i] || '无'}
→ 这个回答对应哪个场景？该场景中必须100%还原这个回答的内容！
`).join('\n')}

□ 食物名称是否一个字都没改？（用户说什么就写什么！）
□ 菜系/店名是否100%还原？（用户说的店名和菜系，一个字不能改！）
□ 每个回答的内容是否放在了正确的场景中？（不要混淆场景！）
□ 烹饪方式是否保留？（用户说的烹饪方式必须保留！）
□ 用户状态是否在ALL场景中体现？（累了/睡晚了/熬夜/开心等，必须体现！）
□ 场景细节是否100%还原？（线上/线下、在家/外出等，必须准确！）
□ 食物是否只在吃饭场景出现？（不要在所有场景都重复！）

**优先级2：时间线逻辑检查**
□ 场景时间顺序是否合理？（✅ 中午→下午→晚上）
□ 时间点事件是否只在对应时间出现？（✅ 中午吃饭只在Scene1）

**优先级3：性格推测检查（要灵活多样化！）**
□ 时间线空白是否用性格推测填补？（✅ 基于性格灵活推测，不要固定化）
□ 推测是否具体且多样化？（✅ 根据具体情况推测，不要每次都一样）
□ 推测是否考虑了用户状态？（✅ 累了→推测休息、听音乐；开心→推测活跃活动）
□ 推测是否避免了固定化？（❌ 不要每次都推测相同的行为模式）

**错误模式（死刑案例）**：
❌ 篡改：用户说[食物A]，你写[食物B] → 死刑！
❌ 改菜系：用户说[菜系A]，你写[菜系B] → 死刑！
❌ 忽视状态：用户说状态词（累了/熬夜/睡晚了/开心等），场景中不体现 → 死刑！
❌ 时间线错乱：时间点事件在多个场景重复出现 → 死刑！
❌ 篡改细节：用户说[场景细节A]，你写[场景细节B]（线上→线下） → 死刑！
❌ 固定化推测：每次都推测同样的行为 → 死刑！

**正确模式（从用户实际输入）**：
✅ 用户说[食物A] → Scene写[食物A]（100%还原）
✅ 用户说[店名/菜系] → 必须写[店名/菜系]，不能改成其他
✅ 用户说状态（累了/熬夜/开心） → 所有Scene体现这个状态
✅ 用户说[场景细节] → 必须100%保留
✅ 时间线合理：吃饭只在对应时间场景，推测要灵活多样化`
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
        const content = data.choices[0].message.content.trim()
        console.log('🎬 [SCENE-GEN] 原始LLM响应:', content)
        
        // 解析JSON响应
        let jsonContent = content
        if (jsonContent.includes('```json')) {
          jsonContent = jsonContent.replace(/```json\s*/, '').replace(/```\s*$/, '').trim()
        }
        if (jsonContent.includes('```')) {
          jsonContent = jsonContent.replace(/```\s*/, '').replace(/```\s*$/, '').trim()
        }
        
        // 🔥 增强的JSON清理逻辑
        // 1. 先处理字符串中的换行符和特殊字符（在引号内）
        // 2. 然后处理中文标点符号
        // 3. 最后修复未闭合的引号
        
        // 清理可能的中文逗号和格式问题
        jsonContent = jsonContent.replace(/，/g, ',')  // 中文逗号→英文逗号
        jsonContent = jsonContent.replace(/：/g, ':')  // 中文冒号→英文冒号
        jsonContent = jsonContent.replace(/"/g, '"').replace(/"/g, '"')  // 中文引号→英文引号
        
        // 🔥 修复字符串中的未转义换行符和特殊字符
        // 使用更简单可靠的方法：逐字符处理，转义字符串内的换行符
        let fixedContent = ''
        let inString = false
        let escapeNext = false
        
        for (let i = 0; i < jsonContent.length; i++) {
          const char = jsonContent[i]
          
          if (escapeNext) {
            // 处理转义字符
            fixedContent += char
            escapeNext = false
            continue
          }
          
          if (char === '\\') {
            // 转义字符，下一个字符会被转义
            escapeNext = true
            fixedContent += char
            continue
          }
          
          if (char === '"') {
            // 引号，切换字符串状态
            inString = !inString
            fixedContent += char
            continue
          }
          
          if (inString) {
            // 在字符串内，需要转义换行符和制表符
            if (char === '\n') {
              fixedContent += '\\n'
            } else if (char === '\r') {
              fixedContent += '\\r'
            } else if (char === '\t') {
              fixedContent += '\\t'
            } else {
              fixedContent += char
            }
          } else {
            // 不在字符串内，直接添加
            fixedContent += char
          }
        }
        
        jsonContent = fixedContent
        
        console.log('🧹 [SCENE-GEN] 清理后的JSON（前200字符）:', jsonContent.substring(0, 200))
        console.log('📏 [SCENE-GEN] JSON总长度:', jsonContent.length)
        
        let parsedData
        try {
          parsedData = JSON.parse(jsonContent)
          console.log('🎬 [SCENE-GEN] 解析后的数据:', parsedData)
        } catch (parseError: any) {
          console.error('❌ [SCENE-GEN] JSON解析失败:', parseError.message)
          const errorPosition = parseError.message.match(/position (\d+)/)?.[1]
          if (errorPosition) {
            const pos = parseInt(errorPosition)
            console.error('🔍 [SCENE-GEN] 错误位置附近的内容:', jsonContent.substring(Math.max(0, pos - 100), pos + 100))
            console.error('📍 [SCENE-GEN] 错误位置:', pos, '总长度:', jsonContent.length)
          }
          console.error('📄 [SCENE-GEN] 完整JSON内容（前1000字符）:', jsonContent.substring(0, 1000))
          console.error('📄 [SCENE-GEN] 完整JSON内容（后1000字符）:', jsonContent.substring(Math.max(0, jsonContent.length - 1000)))
          
          // 🔥 尝试更激进的修复：提取第一个完整的JSON对象
          try {
            const firstBrace = jsonContent.indexOf('{')
            const lastBrace = jsonContent.lastIndexOf('}')
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
              const extractedJson = jsonContent.substring(firstBrace, lastBrace + 1)
              console.log('🔧 [SCENE-GEN] 尝试提取JSON对象:', extractedJson.substring(0, 200))
              parsedData = JSON.parse(extractedJson)
              console.log('✅ [SCENE-GEN] 使用提取的JSON对象解析成功')
            } else {
              throw parseError
            }
          } catch (extractError) {
            console.error('❌ [SCENE-GEN] 提取JSON对象也失败:', extractError)
            throw parseError
          }
        }
        
        // ✅ 将visualDetails转换为detailedPrompt（不需要二次DeepSeek调用）
        if (parsedData.logicalScenes && Array.isArray(parsedData.logicalScenes)) {
          parsedData.logicalScenes.forEach((scene: SceneData, index: number) => {
            if (scene.visualDetails) {
              // 从visualDetails生成详细英文提示词
              const vd = scene.visualDetails
              const hairDesc = userInfo?.gender === 'female' && userInfo?.hairLength ? `, ${userInfo.hairLength}` : ''
              
              // ✅ 优先使用AI生成的明确字段，不要再用正则提取
              const sceneLocation = scene.location || 'Unknown Location'
              const sceneAge = scene.age || userInfo?.age || 26
              const scenePeopleCount = scene.peopleCount || 'alone'
              
              console.log(`✅ 场景${index + 1} - 地点: ${sceneLocation}, 年龄: ${sceneAge}, 人物: ${scenePeopleCount}`)
              
              // 如果location还是默认值，警告
              if (!scene.location) {
                console.warn(`⚠️ 场景${index + 1} 没有提供location字段！`)
              }
              
              // 所有场景统一处理，使用LLM生成的description和mood
              scene.detailedPrompt = `${scene.description}. Lighting: ${vd.lighting}. Color tone: ${vd.colorTone}. Atmosphere: ${vd.atmosphere}. Objects: ${vd.objects.join(', ')}. Sounds: ${vd.sounds.join(', ')}. Clothing: ${vd.clothing}. Expressions and emotional state: ${vd.mood}. Photorealistic, cinematic photography, high quality, detailed composition.`
              console.log(`✅ 场景${index + 1}完成，detailedPrompt已生成`)
            } else {
              console.log(`⚠️ 场景${index + 1}缺少visualDetails`)
              scene.detailedPrompt = `${scene.description}`
            }
          })
          console.log(`✅ [SCENE-GEN] ${parsedData.logicalScenes.length}个场景生成完成`)
          
          // 🔥 验证detailedPrompt字段是否已生成
          parsedData.logicalScenes.forEach((scene: SceneData, index: number) => {
            if (!scene.detailedPrompt) {
              console.error(`❌ [SCENE-GEN] 场景${index + 1}缺少detailedPrompt字段！`)
              // 紧急修复：使用description作为备用
              scene.detailedPrompt = scene.description || 'Default scene description'
              console.log(`🔧 [SCENE-GEN] 场景${index + 1}已使用备用detailedPrompt`)
            } else {
              console.log(`✅ [SCENE-GEN] 场景${index + 1}detailedPrompt字段正常`)
            }
          })
        }
        
        return parsedData
      } else {
        throw new Error('DeepSeek API返回格式错误')
      }
    } catch (error) {
      console.error('💥 [SCENE-GEN] 生成基础故事失败:', error)
      
      // 返回基于用户输入的基础场景
      const userKeywords = initialPrompt.split(/[，,。！!？?；;]/).filter(word => word.trim().length > 0)
      const coreKeywords = userKeywords.slice(0, 4) // 取前4个关键词
      
      return {
        coreKeywords: coreKeywords.length > 0 ? coreKeywords : ['用户经历', '人生故事', '重要时刻'],
        coreScenes: coreKeywords.map((keyword, index) => `场景${index + 1}: ${keyword}`),
        logicalScenes: coreKeywords.map((keyword, index) => ({
          title: `场景${index + 1}: ${keyword}`,
          description: `基于用户输入的"${keyword}"相关场景描述`,
          keywords: [keyword, '用户经历', '重要时刻']
        })),
        storyDescription: `基于用户输入"${initialPrompt}"的个人经历故事`,
        narrative: `这是一个关于用户经历"${initialPrompt}"的故事。故事展现了用户在人生重要时刻的经历和感受，体现了成长和变化的过程。`,
        aiPrompt: `生成一个关于用户基于"${initialPrompt}"经历的故事场景`
      }
    }
  }

  /**
   * 第二阶段：根据用户元数据扩写故事
   * 结合用户元数据、核心输入和聊天记录
   */
  static async enhanceStoryWithMetadata(
    baseResult: SceneGenerationResult,
    initialPrompt: string,
    answers: string[]
  ): Promise<SceneGenerationResult> {
    console.log('🎨 [SCENE-GEN] 开始第二阶段：根据用户元数据扩写故事')
    
    try {
      const userMetadata = await getUserMetadata()
      
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
              content: `你是一个专业的故事增强专家。你的任务是基于已有的基础故事，结合用户的详细元数据信息，生成更丰富、更个性化的故事和场景。

**🚨🚨🚨 最高优先级：100%保留用户明确说的内容 + 纯粹叙述 🚨🚨🚨**

**绝对禁止的错误（死刑案例）**：
❌ 死刑1：用户说[食物A]，你写[食物B]或过度装饰 → 篡改！
❌ 死刑2：用户说[店名/菜系A]，你写[店名/菜系B] → 擅自改变！
❌ 死刑3：用户说状态词，故事中不体现 → 忽视用户状态！
❌ 死刑4：故事中出现分析性语言（"她的命理特质"、"她的INTJ性格"等） → 这是分析！不是故事！
❌ 死刑5：基础故事中用户说的内容，增强后改变或省略 → 丢失信息！

**100%保留规则（不可违反，从用户实际输入）**：

从基础故事、用户输入"${initialPrompt}"和问答记录中提取的所有具体内容：

**问答记录（带上下文）：**
（已省略，此函数已废弃）

1. **食物名称**：用户说的食物名称
   - ❌ 不能改成其他食物
   - ❌ 不能过度装饰添加配料
   - ✅ 只能原样保留，最多加简单普通描述

2. **店名/菜系**：用户说的店名和菜系
   - ❌ 不能擅自改变菜系
   - ❌ 不能用其他店名代替
   - ✅ 必须100%原样保留

3. **地点**：用户说的地点
   - ❌ 不能改成其他地点
   - ✅ 必须100%保留（线上就是线上、在家就是在家）

4. **用户状态**：用户说的ALL状态
   - ✅ 必须在故事的所有相关场景中体现
   - 累了/熬夜/睡晚了 → 体现疲惫
   - 开心/兴奋 → 体现愉悦

**纯粹叙述规则（故事不是分析报告！）**：

**❌ 绝对禁止出现的分析性语言：**
- "她命理中乙木日主需要金来修剪才能成材的特质"
- "这体现了她INTJ的性格特征"
- "根据她的星座分析"
- "她的MBTI类型决定了"
- "从心理学角度来看"
- "元数据显示她"

**✅ 正确的叙述性语言：**
- "她喜欢独自思考"（而不是"她的INTJ特质让她喜欢独自思考"）
- "她细致地规划着每一步"（而不是"她的理性特质体现在规划上"）
- "她感到疲惫"（而不是"她的情绪模式显示疲惫"）

**增强原则：**
1. **保持核心内容**：不能改变基础故事的核心事件和逻辑，尤其是用户明确说的具体名词
2. **纯粹叙述**：只写故事，不写分析；只描述场景和感受，不解释元数据
3. **个性化增强**：根据用户的性格特征来丰富场景细节，但用叙述性语言表达
4. **情感深度**：增加情感层次，但不要用分析性语言
5. **细节增强，不篡改事实**：只在光线、氛围、情绪、心理活动等用户未明确说明的细节上发挥

**示例对比：**
❌ 错误："她命理中乙木日主需要金来修剪才能成材，因此她特别注重自我提升"
✅ 正确："她一直追求自我提升，不断打磨自己的技能"

❌ 错误："她的INTJ性格让她喜欢独处"
✅ 正确："她享受独处的时光，在安静中整理思绪"

请返回JSON格式的增强结果，保持原有的数据结构。`
            },
            {
              role: 'user',
              content: `基础故事数据：
${JSON.stringify(baseResult, null, 2)}

用户元数据：
${JSON.stringify(userMetadata, null, 2)}

**⚠️⚠️⚠️ 用户核心输入（必须100%还原）：**
用户键入："${initialPrompt}"

**⚠️⚠️⚠️ 用户对话回答（必须100%还原）：**
${answers.map((a, i) => `回答${i+1}: "${a}"`).join('\n')}

**增强指导（基于用户实际输入）：**

**⚠️⚠️⚠️ 用户实际说了什么（必须100%保留）：**
用户键入："${initialPrompt}"
用户回答：${answers.map((a, i) => `"${a}"`).join(', ')}

1. 基于以上信息增强故事，使其更加个性化和丰富
2. **绝对不能改变用户明确说的任何内容**（食物、地点、店名、状态）
3. **只能增强用户没说的细节**（光线、氛围、心理活动）
4. **使用纯粹的叙述性语言**，不要出现分析性语言
5. 用户说的食物就是那个食物，不能改、不能过度装饰
6. 用户说的状态（累了/熬夜/开心）必须在故事中体现

**禁止（通用规则）**：
❌ 篡改食物名称（用户说的食物 → 其他食物）
❌ 过度装饰食物（简单食物 → 加豪华配料）
❌ 改变菜系/店名（用户说的菜系 → 其他菜系）
❌ 使用分析性语言（命理/MBTI/性格分析等术语）
❌ 改变或忽视用户状态（用户说累了但故事中没体现）

请返回增强后的JSON，保持原有数据结构。`
            }
          ],
          max_tokens: 2500,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        throw new Error(`DeepSeek API调用失败: ${response.status}`)
      }

      const data = await response.json()
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content.trim()
        console.log('🎨 [SCENE-GEN] 增强后的LLM响应:', content)
        
        // 解析JSON响应
        let jsonContent = content
        if (jsonContent.includes('```json')) {
          jsonContent = jsonContent.replace(/```json\s*/, '').replace(/```\s*$/, '').trim()
        }
        if (jsonContent.includes('```')) {
          jsonContent = jsonContent.replace(/```\s*/, '').replace(/```\s*$/, '').trim()
        }
        
        const enhancedData = JSON.parse(jsonContent)
        console.log('🎨 [SCENE-GEN] 增强后的数据:', enhancedData)
        
        return enhancedData
      } else {
        throw new Error('DeepSeek API返回格式错误')
      }
    } catch (error) {
      console.error('💥 [SCENE-GEN] 故事增强失败:', error)
      
      // 如果增强失败，返回原始的基础结果
      console.log('⚠️ [SCENE-GEN] 增强失败，使用基础结果')
      return baseResult
    }
  }

  /**
   * 完整的两阶段场景生成流程
   */
  static async generateCompleteScenes(
    initialPrompt: string,
    answers: string[],
    questions: string[]
  ): Promise<SceneGenerationResult> {
    console.log('🚀 [SCENE-GEN] 开始完整的两阶段场景生成流程')
    
    try {
      // 第一阶段：生成基础故事和场景
      const baseResult = await this.generateBaseStoryAndNarrative(initialPrompt, answers, questions)
      console.log('✅ [SCENE-GEN] 第一阶段完成：基础故事和场景生成')
      
      // 第二阶段：增强故事
      const enhancedResult = await this.enhanceStoryWithMetadata(baseResult, initialPrompt, answers)
      console.log('✅ [SCENE-GEN] 第二阶段完成：故事增强')
      
      console.log('🎉 [SCENE-GEN] 完整场景生成流程完成')
      return enhancedResult
      
    } catch (error) {
      console.error('💥 [SCENE-GEN] 完整场景生成失败:', error)
      throw error
    }
  }
}
