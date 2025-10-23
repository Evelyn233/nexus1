/**
 * 杂志封面生成服务
 * 
 * 功能：
 * 1. 检测是否是深度人生故事（需要封面）
 * 2. 提取核心冲突
 * 3. 生成封面大标题和小标题
 * 4. 生成封面图片提示词
 */

import { getUserInfo, getUserMetadata } from './userDataApi'
import { SceneGenerationResult } from './sceneGenerationService'
import { StoryResult } from './storyGenerationService'

/**
 * 杂志封面数据结构
 */
export interface MagazineCover {
  // 是否需要封面
  needsCover: boolean
  
  // 封面标题
  mainTitle: string           // 大标题（核心主题）
  subtitle: string            // 小标题（补充说明）
  
  // 核心冲突
  coreConflict: string        // 故事的核心冲突
  conflictIntensity: number   // 冲突强度（1-10）
  
  // 🆕 封面元素
  keyLocation: string         // 最重要的精准地点
  otherCharacters: string[]   // 其他人物（如果有）
  psychologicalElements: string[]  // 心理元素（象征性视觉元素）
  
  // 封面设计
  coverStyle: string          // 封面风格（简约、戏剧性、文艺等）
  colorScheme: string         // 配色方案
  typography: string          // 字体风格
  
  // 封面图片
  coverImagePrompt: string    // 图片生成提示词
  coverImageDescription_CN: string  // 中文描述
  coverImageDescription_EN: string  // 英文描述
  
  // 元数据
  storyType: string          // 故事类型（人生转折、情感历程、成长故事等）
  emotionalTone: string      // 情感基调
}

/**
 * 故事深度评估
 */
interface StoryDepthAnalysis {
  isDeepStory: boolean        // 是否是深度故事
  depth: number               // 深度评分（1-10）
  hasConflict: boolean        // 是否有冲突
  hasEmotionalJourney: boolean // 是否有情感历程
  hasLifeTurning: boolean     // 是否有人生转折
  timeSpan: string            // 时间跨度（一天、一周、一年、多年）
  complexity: number          // 复杂度（1-10）
}

/**
 * 杂志封面生成服务
 */
export class MagazineCoverService {
  
  /**
   * 主函数：生成杂志封面
   */
  static async generateMagazineCover(
    scenes: SceneGenerationResult,
    story: StoryResult,
    initialPrompt: string,
    answers: string[]
  ): Promise<MagazineCover | null> {
    console.log('📰 [MAGAZINE-COVER] 开始生成杂志封面')
    
    try {
      // 直接生成封面（不做深度检测，所有故事都可以生成封面）
      console.log('📰 [MAGAZINE-COVER] 开始为故事生成专属封面')
      
      const cover = await this.createCover(
        scenes,
        story,
        initialPrompt,
        answers
      )
      
      console.log('✅ [MAGAZINE-COVER] 封面生成完成')
      return cover
      
    } catch (error) {
      console.error('❌ [MAGAZINE-COVER] 生成封面失败:', error)
      return null
    }
  }
  
  /**
   * 评估故事深度
   */
  private static async analyzeStoryDepth(
    initialPrompt: string,
    answers: string[],
    scenes: SceneGenerationResult,
    story: StoryResult
  ): Promise<StoryDepthAnalysis> {
    console.log('🔍 [MAGAZINE-COVER] 评估故事深度')
    
    const fullText = `${initialPrompt} ${answers.join(' ')} ${story.narrative}`
    
    try {
      // 判断是否在服务器端（Node.js环境）
      const isServer = typeof window === 'undefined'
      const apiUrl = isServer 
        ? 'https://api.deepseek.com/chat/completions'
        : '/api/ai/chat'
      
      const headers: any = {
        'Content-Type': 'application/json'
      }
      
      // 服务器端需要Authorization，客户端通过代理
      if (isServer) {
        headers['Authorization'] = 'Bearer sk-4d7c509f56f64f4a9b1d52f9e1791a67'
      }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        credentials: isServer ? undefined : 'include',
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `你是故事深度评估专家。判断一个故事是否是深度人生故事。

**深度人生故事的特征：**
1. 涉及人生重要转折（高考、出国、创业、失恋等）
2. 有明显的情感变化历程（难过→开心、迷茫→坚定等）
3. 包含内心冲突或外部冲突
4. 时间跨度较长（几个月、几年、一生）
5. 有成长或改变

**简单场景的特征：**
1. 只是日常琐事（吃饭、工作、休息）
2. 时间跨度短（一天内）
3. 没有明显冲突或情感起伏
4. 平淡的流水账

请返回JSON格式：
{
  "isDeepStory": true/false,
  "depth": 1-10,
  "hasConflict": true/false,
  "hasEmotionalJourney": true/false,
  "hasLifeTurning": true/false,
  "timeSpan": "一天|一周|几个月|一年|多年",
  "complexity": 1-10,
  "reason": "判断理由"
}`
            },
            {
              role: 'user',
              content: `请评估以下故事的深度：

用户初始输入：${initialPrompt}

用户回答：
${answers.map((a, i) => `${i+1}. ${a}`).join('\n')}

故事叙述：
${story.narrative.substring(0, 500)}

场景数量：${scenes.logicalScenes.length}

只返回JSON，不要其他解释。`
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      })
      
      if (!response.ok) {
        throw new Error('DeepSeek API调用失败: ' + response.status)
      }
      
      const data = await response.json()
      const content = data.choices[0].message.content.trim()
      
      // 提取JSON - 查找 { } 括号之间的内容
      let jsonString = content
      
      const startBrace = content.indexOf('{')
      const endBrace = content.lastIndexOf('}')
      
      if (startBrace !== -1 && endBrace !== -1 && endBrace > startBrace) {
        jsonString = content.substring(startBrace, endBrace + 1)
      }
      
      const analysis = JSON.parse(jsonString)
      console.log('✅ [MAGAZINE-COVER] 深度评估:', analysis)
      
      return analysis
      
    } catch (error) {
      console.error('❌ [MAGAZINE-COVER] 评估失败:', error)
      
      // 简单规则判断
      const hasLifeKeywords = /高考|大学|出国|创业|失恋|结婚|离职|创业|梦想|人生|成长|改变/.test(fullText)
      const hasEmotionKeywords = /难过|开心|伤心|快乐|痛苦|幸福|迷茫|坚定|后悔|满足/.test(fullText)
      const isLong = answers.length >= 3 || scenes.logicalScenes.length >= 4
      
      return {
        isDeepStory: hasLifeKeywords && hasEmotionKeywords && isLong,
        depth: hasLifeKeywords ? 7 : 3,
        hasConflict: hasLifeKeywords,
        hasEmotionalJourney: hasEmotionKeywords,
        hasLifeTurning: hasLifeKeywords,
        timeSpan: hasLifeKeywords ? '多年' : '一天',
        complexity: isLong ? 7 : 3
      }
    }
  }
  
  /**
   * 创建封面
   */
  private static async createCover(
    scenes: SceneGenerationResult,
    story: StoryResult,
    initialPrompt: string,
    answers: string[]
  ): Promise<MagazineCover> {
    console.log('🎨 [MAGAZINE-COVER] 创建封面')
    
    const userInfo = await getUserInfo()
    const userMetadata = await getUserMetadata()
    
    try {
      // 判断是否在服务器端（Node.js环境）
      const isServer = typeof window === 'undefined'
      const apiUrl = isServer 
        ? 'https://api.deepseek.com/chat/completions'
        : '/api/ai/chat'
      
      const headers: any = {
        'Content-Type': 'application/json'
      }
      
      // 服务器端需要Authorization，客户端通过代理
      if (isServer) {
        headers['Authorization'] = 'Bearer sk-4d7c509f56f64f4a9b1d52f9e1791a67'
      }
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        credentials: isServer ? undefined : 'include',
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `你是资深杂志封面设计师。根据故事内容设计专属的封面。

**🎯 核心原则：一切设计决策都基于故事内容！**

**封面设计流程：**

**Step 1：深度理解故事**
- 这是什么类型的故事？（成长、挣扎、转变、追梦、治愈...）
- 核心冲突是什么？（内心冲突 vs 外部冲突）
- 情感基调是什么？（痛苦→希望、迷茫→清晰、压抑→释放...）
- 关键转折点在哪？
- 最戏剧性的moment是什么？

**Step 2：根据故事确定风格**

**如果是挣扎/冲突类故事 →**
- 封面风格：戏剧性、强对比
- 配色：深色调 → 亮色调（黑暗→光明）
- 画风：电影感、张力强、情绪饱满
- 构图：对比构图、冲突视觉化
- 例如：高考失利→出国、失败→成功

**如果是成长/蜕变类故事 →**
- 封面风格：温暖励志、层次感
- 配色：温暖色系（橙、黄、粉）
- 画风：柔和光线、成长感、希望感
- 构图：展望未来、向上向前
- 例如：找到方向、自我发现

**如果是情感/治愈类故事 →**
- 封面风格：文艺、细腻
- 配色：柔和暖色（米色、浅粉、淡蓝）
- 画风：温柔、诗意、情感细腻
- 构图：特写、情绪捕捉
- 例如：疗愈、和解、内心平静

**如果是都市/职场类故事 →**
- 封面风格：现代简约、商业感
- 配色：高级灰、黑白、金属色
- 画风：专业、利落、都市感
- 构图：干练、精致、质感强
- 例如：创业、职场、都市生活

**如果是压抑/释放类故事 →**
- 封面风格：强烈对比、爆发感
- 配色：压抑色→释放色（灰蓝→明黄、黑→红）
- 画风：前后对比、情绪释放
- 构图：从束缚到自由
- 例如：逃离、突破、解放

**Step 3：根据内容生成标题**

**大标题规则：**
- 从故事中提炼最核心的1个词或短语
- 3-8个字
- 必须体现故事核心主题
- ❌ 不要用通用标题（如"我的故事"、"人生"）
- ✅ 要用具体主题（如"逆境重生"、"追光者"、"破茧"）

**小标题规则：**
- 概括故事的核心情节或冲突
- 10-20个字
- 体现"从...到..."或"在...中..."的结构
- 必须包含故事的关键元素
- ❌ 不要泛泛而谈
- ✅ 要具体到这个故事

**Step 4：视觉化核心moment**

选择故事中最戏剧性、最有视觉冲击力的moment作为封面：
- 转折点：高考失利后的决定、收到offer、第一次出国
- 冲突点：内心挣扎、对抗压力、做出选择
- 象征点：站在新起点、回望过去、眺望未来

**Step 5：设计封面图片**

封面构图要求：
- **人物姿态**：体现故事的核心状态（回望、前行、挣扎、坚定）
- **环境选择**：最象征性的场景（大学门口、机场、办公室、家）
- **光线运用**：体现情感基调（从暗到亮、柔和温暖、冷峻锐利）
- **色彩情绪**：匹配故事情感（冷暖对比、渐变、单色调）

**⚠️ 重要：**
1. 所有设计决策必须有故事依据
2. 不要用模板化的设计
3. 每个故事的封面都应该是独特的
4. 标题、配色、画风都要匹配故事内容

请返回JSON格式：
{
  "needsCover": true,
  "mainTitle": "根据故事核心主题生成（3-8字）",
  "subtitle": "根据故事核心情节生成（10-20字）",
  "coreConflict": "从故事中提取的核心矛盾",
  "conflictIntensity": 1-10,
  "coverStyle": "根据故事类型确定（戏剧性/文艺/现代简约/商业/对比强烈）",
  "colorScheme": "根据情感基调确定（具体描述，如'深蓝渐变到暖橙'）",
  "typography": "根据故事气质确定（粗体现代/优雅衬线/手写体/未来感等）",
  "coverImageDescription_CN": "根据故事最戏剧性moment生成的中文描述",
  "coverImageDescription_EN": "English description",
  "coverImagePrompt": "完整的英文封面图片提示词（Magazine cover style, 包含人物、场景、光线、情绪、构图）",
  "storyType": "根据故事内容确定（成长蜕变/情感治愈/职场突破/追梦之路等）",
  "emotionalTone": "根据故事情感确定（从痛苦到希望/从迷茫到坚定/从压抑到释放等）",
  "designReasoning": "简短说明为什么选择这个风格、配色和构图（基于故事的哪些元素）"
}`
            },
            {
              role: 'user',
              content: `请为以下深度人生故事设计专属的杂志封面。

**🎯 核心要求：所有设计决策都必须基于故事内容！**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📖 故事内容
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**用户初始输入（最重要）：**
${initialPrompt}

**用户详细回答（深度信息）：**
${answers.map((a, i) => (i+1) + '. ' + a).join('\\n')}

**完整故事叙述：**
${story.narrative}

**场景数量：** ${scenes.logicalScenes.length}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
👤 用户信息
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- 性别：${userInfo?.gender === 'female' ? '女性' : '男性'}
- 年龄：${userInfo?.age || 26}岁
- 身高：${userInfo?.height || '165'}cm
- 头发：${userInfo?.hairLength || '长发'}
- 所在地：${userInfo?.location || '上海'}
- 性格：${userInfo?.personality || '未知'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🎨 设计要求
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Step 1：分析故事类型和情感基调**
从故事内容判断：
- 这是什么类型的故事？（挣扎、成长、治愈、追梦、转变、突破...）
- 情感走向是什么？（痛苦→希望、迷茫→清晰、压抑→释放、黑暗→光明...）
- 核心冲突是什么？（内心 vs 外部、传统 vs 自由、失败 vs 成功...）

**Step 2：根据故事确定封面风格**
- 挣扎/冲突故事 → 戏剧性、强对比、张力感
- 成长/蜕变故事 → 温暖励志、层次感、希望感
- 情感/治愈故事 → 文艺细腻、柔和、诗意
- 都市/职场故事 → 现代简约、商业感、利落
- 追梦/突破故事 → 动感、向上、光明

**Step 3：根据情感基调确定配色**
- 痛苦→希望：深蓝/灰黑 渐变到 暖橙/金黄
- 迷茫→清晰：雾灰/模糊 渐变到 明亮/清透
- 压抑→释放：暗沉/灰色 到 明快/彩色
- 挣扎→平静：冷色调 到 暖色调
- 黑暗→光明：黑/深色 到 白/亮色
- 温暖治愈：米色、浅粉、淡蓝、温暖色系
- 都市现代：高级灰、黑白、金属色

**Step 4：根据故事气质确定画风**
- 激烈冲突 → 电影感、戏剧光影、强烈情绪
- 细腻情感 → 柔和光线、温暖色调、细节丰富
- 理性成长 → 清晰简约、构图规整、质感强
- 浪漫文艺 → 诗意、朦胧、意境美
- 现代都市 → 利落、专业、时尚感

**Step 5：根据最戏剧moment设计封面图片**
- 选择故事中最具视觉冲击力的moment
- 人物姿态要体现核心状态（回望、前行、挣扎、释放）
- 环境要象征性强（转折点的场所）
- 光线要烘托情绪（从暗到亮、柔和温暖、锐利冷峻）

**Step 6：生成标题**
- 大标题：从故事中提炼最核心的主题词（3-8字）
  * 挣扎故事：逆境重生、破茧、突围
  * 成长故事：向光而行、蜕变、新生
  * 追梦故事：追光者、筑梦、远航
  * 治愈故事：归途、和解、治愈
- 小标题：概括故事的核心情节（10-20字）
  * 必须包含故事的关键元素
  * 体现"从...到..."的转变

**🎯 示例（根据不同故事类型）：**

**故事1：高考失利 → 出国留学**
- 类型：挣扎突破类
- 风格：戏剧性、强对比
- 配色：深蓝沉重 → 暖橙希望
- 画风：电影感、光影强烈
- 大标题：逆境重生（体现从失败到新生）
- 小标题：从高考失利到海外求学的勇敢一跃
- 构图：站在大学门前回望过去，眼神坚定

**故事2：创业失败 → 重新开始**
- 类型：跌倒站起类
- 风格：温暖励志
- 配色：灰色低谷 → 金色希望
- 画风：柔和但坚定、希望感
- 大标题：不败（体现不被打败的精神）
- 小标题：跌倒后，我选择以另一种方式站起
- 构图：从地面缓缓站起，晨光洒在身上

**故事3：工作压力 → 找到平衡**
- 类型：都市治愈类
- 风格：现代文艺
- 配色：冷灰都市 → 温暖米色
- 画风：都市感 + 温暖治愈
- 大标题：呼吸（体现从压抑到释放）
- 小标题：在快节奏都市中寻找内心平静
- 构图：都市剪影中一个安静的角落

**⚠️⚠️⚠️ 关键原则：**
1. **不要套用模板**：每个故事都是独特的
2. **深度理解内容**：标题、风格、配色都要匹配故事
3. **具体而非抽象**：用故事中的具体元素，不要泛泛而谈
4. **情感共鸣**：设计要能引发读者的情感共鸣

**🎯 封面必须包含的3大核心要素：**

1. **精准地点（必须！）**
   - 从故事中提取最重要、最象征性的地点
   - 必须具体到街道/建筑/楼层/位置
   - 这个地点要体现故事的核心转折或冲突

2. **其他人物（如果故事中有）**
   - 检查故事是否提到父母、朋友、同学、同事等
   - 如果有，必须在封面中体现
   - 可以是：剪影、模糊身影、对立角色

3. **心理元素（夸张的冲突视觉化）**
   - 选取故事中最强烈、最夸张的心理冲突
   - 用视觉元素象征化表达
   - 不要含蓄，要极致、戏剧性

请返回JSON格式：
{
  "needsCover": true,
  "mainTitle": "根据故事核心主题提炼（3-8字）",
  "subtitle": "根据故事核心情节生成（10-20字）",
  "coreConflict": "从故事中提取的核心冲突（要夸张、强烈表达）",
  "conflictIntensity": 1-10,
  
  "keyLocation": "最重要的精准地点（必须具体，如'悉尼大学主楼门前的台阶上'）",
  "otherCharacters": ["故事中提到的其他人物，描述他们在封面中的呈现方式"],
  "psychologicalElements": [
    "心理元素1（如'极端光影对比：左侧完全黑暗到右侧强烈光明'）",
    "心理元素2（如'双重曝光：两种状态叠加'）",
    "心理元素3（如'空间对比：从拥挤到开阔'）"
  ],
  
  "coverStyle": "根据故事类型确定",
  "colorScheme": "根据情感走向具体描述（要夸张对比）",
  "typography": "根据故事气质确定",
  
  "coverImageDescription_CN": "详细描述，必须包含：1)精准地点 2)其他人物的呈现 3)心理元素的视觉化 4)夸张的冲突表达",
  "coverImageDescription_EN": "Detailed English description including precise location, other characters, psychological visual elements, exaggerated conflict expression",
  "coverImagePrompt": "Magazine cover photography, [年龄]-year-old Chinese [gender], [height]cm, [hair], at [精准地点，必须具体], [其他人物的详细描述], [心理元素的视觉化], [夸张的冲突和情绪表达], dramatic lighting, cinematic composition, professional magazine cover, high quality, photorealistic",
  
  "storyType": "根据故事内容确定",
  "emotionalTone": "根据故事情感确定",
  "designReasoning": "说明为什么选择这个地点（象征什么）、这些人物（体现什么关系）、这些心理元素（表达什么冲突）"
}

只返回JSON，不要其他解释。`
            }
          ],
          temperature: 0.8,
          max_tokens: 1500
        })
      })
      
      if (!response.ok) {
        throw new Error('DeepSeek API调用失败: ' + response.status)
      }
      
      const data = await response.json()
      const content = data.choices[0].message.content.trim()
      
      // 提取JSON - 查找 { } 括号之间的内容
      let jsonString = content
      
      const startBrace = content.indexOf('{')
      const endBrace = content.lastIndexOf('}')
      
      if (startBrace !== -1 && endBrace !== -1 && endBrace > startBrace) {
        jsonString = content.substring(startBrace, endBrace + 1)
      }
      
      const cover = JSON.parse(jsonString)
      console.log('✅ [MAGAZINE-COVER] 封面设计完成')
      
      return cover
      
    } catch (error) {
      console.error('❌ [MAGAZINE-COVER] 封面生成失败:', error)
      
      // 返回基础封面
      const age = userInfo?.age || 26
      const gender = userInfo?.gender === 'female' ? '女性' : '男性'
      const genderEn = userInfo?.gender === 'female' ? 'female' : 'male'
      
      return {
        needsCover: true,
        mainTitle: this.extractSimpleTitle(initialPrompt),
        subtitle: '一个' + age + '岁' + gender + '的故事',
        coreConflict: initialPrompt,
        conflictIntensity: 7,
        keyLocation: userInfo?.location || '未知地点',
        otherCharacters: [],
        psychologicalElements: ['光影对比'],
        coverStyle: '简约现代',
        colorScheme: '温暖色调',
        typography: '优雅衬线体',
        coverImageDescription_CN: age + '岁' + gender + '，面对人生重要时刻',
        coverImageDescription_EN: 'A ' + age + '-year-old ' + genderEn + ' at an important life moment',
        coverImagePrompt: 'Magazine cover style, a ' + age + '-year-old Chinese ' + genderEn + ', dramatic moment, cinematic lighting, professional photography, high quality',
        storyType: '人生故事',
        emotionalTone: '深刻'
      }
    }
  }
  
  /**
   * 提取简单标题（从初始输入）
   */
  private static extractSimpleTitle(initialPrompt: string): string {
    // 提取关键词作为标题
    const keywords = initialPrompt
      .replace(/我|的|了|在|和|是|有|很|非常/g, '')
      .split(/[，,。！!？?；;]/)
      .filter(w => w.trim().length > 0)
    
    if (keywords.length > 0) {
      return keywords[0].substring(0, 8)
    }
    
    return '我的故事'
  }
  
  /**
   * 将封面集成到内容生成结果
   */
  static async integrateCoverIntoContent(
    content: any,
    cover: MagazineCover | null
  ): Promise<any> {
    if (!cover) {
      return content
    }
    
    console.log('📰 [MAGAZINE-COVER] 将封面集成到内容中')
    
    return {
      ...content,
      magazineCover: cover,
      hasCover: true
    }
  }
}

