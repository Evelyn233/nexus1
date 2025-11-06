/**
 * 假定场景生成服务
 * 
 * 功能：
 * 1. 检测用户对话中的"假如"、"我想成为"、"我想变成"等倾向
 * 2. 生成用户假定的场景，展现另一种可能性
 * 3. 与心理剧和观点场景并行生成
 */

import { getUserInfo, getUserMetadata } from './userDataApi'

/**
 * 假定场景数据结构
 */
export interface HypotheticalScene {
  // 基本信息
  hypotheticalTrigger: string        // 假定触发点（从用户对话中提取）
  originalReality: string           // 原始现实描述
  hypotheticalReality: string       // 假定现实描述
  
  // 场景设置
  location: string                  // 场景地点
  timeContext: string              // 时间背景
  alternativePath: string          // 替代路径描述
  
  // 场景描述
  sceneDescription_CN: string      // 中文场景描述
  sceneDescription_EN: string      // 英文场景描述（用于生图）
  
  // 提示词
  imagePrompt: string              // 图像生成提示词
  title: string                   // 场景标题
}

/**
 * 假定倾向分析结果
 */
interface HypotheticalAnalysis {
  hasHypothetical: boolean
  hypotheticals: Array<{
    type: string           // 类型：假如、我想成为、我想变成等
    original: string       // 原始情况
    hypothetical: string   // 假定情况
    quote: string         // 用户原话
  }>
}

/**
 * 假定场景生成服务
 */
export class HypotheticalSceneService {
  
  /**
   * 🆕 主函数：生成多个假想场景（2-3个）
   */
  static async generateHypotheticalScenes(
    initialPrompt: string,
    answers: string[],
    questions: string[]
  ): Promise<HypotheticalScene[]> {
    console.log('🔮 [HYPOTHETICAL] 开始生成假想场景（2-3个）')
    
    try {
      // 1. 获取用户信息
      let userInfo = await getUserInfo()
      const userMetadata = await getUserMetadata()
      
      // 确保用户信息完整性
      if (!userInfo) {
        userInfo = {
          name: '用户',
          gender: 'female',
          birthDate: { year: '1999', month: '3', day: '16' },
          height: '165cm',
          weight: '50kg',
          location: '上海',
          personality: '理性思维与艺术感知的独特结合',
          hairLength: '长发',
          age: 26
        }
      }
      
      // 2. 直接生成多个假想场景（不再单独检测）
      const scenes = await this.generateMultipleScenes(
        initialPrompt,
        answers,
        questions,
        userInfo,
        userMetadata
      )
      
      console.log(`✅ [HYPOTHETICAL] 假想场景生成完成，共 ${scenes.length} 个场景`)
      return scenes
      
    } catch (error) {
      console.error('❌ [HYPOTHETICAL] 假想场景生成失败:', error)
      return []
    }
  }
  
  /**
   * 旧版本：生成单个假想场景（保留兼容性）
   */
  static async generateHypotheticalScene(
    initialPrompt: string,
    answers: string[],
    questions: string[]
  ): Promise<HypotheticalScene | null> {
    const scenes = await this.generateHypotheticalScenes(initialPrompt, answers, questions)
    return scenes.length > 0 ? scenes[0] : null
  }
  
  /**
   * 检测用户的假定倾向
   */
  private static async detectHypotheticals(
    initialPrompt: string,
    answers: string[],
    questions: string[]
  ): Promise<HypotheticalAnalysis> {
    
    const allText = [initialPrompt, ...answers].join(' ')
    
    // 检测关键词
    const hypotheticalKeywords = [
      '假如', '如果', '要是', '倘若', '假设',
      '我想成为', '我想变成', '我希望', '我梦想',
      '要不是', '如果不是', '如果没有', '要是没有',
      '可能', '也许', '说不定', '或者',
      '另一种', '别的', '其他的', '不同的'
    ]
    
    const hasHypothetical = hypotheticalKeywords.some(keyword => 
      allText.includes(keyword)
    )
    
    if (!hasHypothetical) {
      return { hasHypothetical: false, hypotheticals: [] }
    }
    
    // 使用LLM进行更精确的检测
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `你是一个专业的心理分析师，专门检测用户对话中的"假定"倾向。

**任务：检测用户是否表达了"假如"、"我想成为"、"我想变成"等假定倾向**

**检测标准：**
1. **直接假定**：如"假如我出国留学"、"要不是我出国留学"
2. **愿望表达**：如"我想成为"、"我想变成"、"我希望"
3. **条件假设**：如"如果"、"要是"、"倘若"
4. **对比表达**：如"另一种"、"别的"、"不同的"

**输出格式：**
只返回JSON，不要其他文字！

{
  "hasHypothetical": true/false,
  "hypotheticals": [
    {
      "type": "假如/我想成为/我想变成",
      "original": "原始情况描述",
      "hypothetical": "假定情况描述", 
      "quote": "用户原话"
    }
  ]
}`
            },
            {
              role: 'user',
              content: `用户对话内容：
${allText}

请检测是否有假定倾向。`
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        const content = data.choices[0].message.content.trim()
        
        // 解析JSON
        let jsonString = content
        if (content.includes('```json')) {
          jsonString = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
        }
        
        const jsonStart = jsonString.indexOf('{')
        const jsonEnd = jsonString.lastIndexOf('}')
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          jsonString = jsonString.substring(jsonStart, jsonEnd + 1)
        }
        
        const result = JSON.parse(jsonString)
        console.log('🔮 [HYPOTHETICAL] 假定倾向检测结果:', result)
        return result
      }
    } catch (error) {
      console.warn('⚠️ [HYPOTHETICAL] LLM检测失败，使用关键词检测:', error)
    }
    
    // 备用方案：基于关键词的简单检测
    const hypotheticals = []
    
    // 检测"要不是"模式
    const butForMatch = allText.match(/要不是(.+?)(?:，|。|$)/)
    if (butForMatch) {
      hypotheticals.push({
        type: '要不是',
        original: '当前情况',
        hypothetical: butForMatch[1].trim(),
        quote: butForMatch[0]
      })
    }
    
    // 检测"假如"模式
    const ifMatch = allText.match(/假如(.+?)(?:，|。|$)/)
    if (ifMatch) {
      hypotheticals.push({
        type: '假如',
        original: '当前情况',
        hypothetical: ifMatch[1].trim(),
        quote: ifMatch[0]
      })
    }
    
    return {
      hasHypothetical: hypotheticals.length > 0,
      hypotheticals
    }
  }
  
  /**
   * 🆕 生成多个假想场景（2-3个）
   */
  private static async generateMultipleScenes(
    initialPrompt: string,
    answers: string[],
    questions: string[],
    userInfo: any,
    userMetadata: any
  ): Promise<HypotheticalScene[]> {
    
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `你是一个专业的假想场景生成师，专门生成"假设性人生/身份幻想"场景。

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎬 **任务：生成2-3个假想场景，展现用户的假想人生/身份幻想**

**用户信息：**
- 姓名：${userInfo.name}
- 性别：${userInfo.gender}
- 年龄：${userInfo.age}
- 身高：${userInfo.height}
- 头发：${userInfo.hairLength}

**用户输入：**
元键入："${initialPrompt}"
${answers.length > 0 ? `用户回答：\n${answers.map((a, i) => `回答${i+1}: ${a}`).join('\n')}` : '（无后续回答）'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨🚨🚨 **强制要求：生成2-3个场景，每个场景展现假想人生的不同关键时刻！** 🚨🚨🚨

**第一步：提取用户回答中的关键信息（必须100%忠实！）**

□ **地点**：用户提到了哪些地点？（如：硅谷、上海、纽约等）
  - 仔细阅读上面的"用户回答"
  - ⚠️ 场景location必须使用用户提到的地点，不能自己编造！
  - 示例：用户说"去硅谷" → location必须是"Silicon Valley"

□ **关键活动**：用户提到了哪些具体活动？（如：见投资人、做demo、创业等）
  - 这些活动必须成为场景的主题！
  - 每个活动对应一个场景！

□ **关键人物**：用户提到了哪些人？（如：投资人、Sam Altman、Zuckerberg等）
  - 这些人物应该出现在相关场景的description中

**❌ 死刑错误：**
- 用户说"硅谷"，你写"上海" = 死刑！
- 用户说"见投资人"，场景里没有投资人 = 死刑！
- 用户说"做demo"，场景里没有demo = 死刑！

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**第二步：生成2-3个场景（必须！）**

**示例（用户说"19岁辍学 去硅谷创业 见投资人 做产品demo"）：**
- 场景1："假想：19岁辍学决定" - 在教室/宿舍做辍学决定的画面
- 场景2："假想：硅谷创业办公室" - 在硅谷startup办公室工作的画面
- 场景3："假想：向投资人展示demo" - 见投资人、展示产品的画面

**❌ 死刑错误：只生成1个场景！**
**✅ 正确做法：必须生成2-3个场景！**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🚨🚨🚨 **超级重要：假想场景必须体现与现实的反差！** 🚨🚨🚨

**核心理念：这是用户在想象"假如/如果"的场景，或者想象自己是某个角色/身份！**

**第一步：判断类型（必须先判断！）**

**类型A：假设性人生**（如"我要是19岁辍学"、"如果没出国"）
- 特征：涉及时间假设、人生选择、过去未发生的事
- 反差重点：年龄、时间、地点、人生轨迹

**类型B：身份幻想/角色感**（如"我觉得自己是女反派"、"我像汉尼拔"、"我是小丑Joker"）
- 特征：涉及身份认同、角色扮演、自我形象
- 反差重点：角色气质、戏剧化姿态、象征性环境
- **🎭 如果用户提到知名角色，必须提取该角色的标志性特质并应用到场景中！**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**【类型A：假设性人生】的反差要求（死刑线！）：**

1. **年龄反差**：
   - ✅ 假想场景中的她是19岁（不是26岁！）
   - ✅ imagePrompt必须写："19-year-old Chinese female"（不是26岁！）
   - ❌ 死刑错误：写"26-year-old"

2. **穿着反差**：
   - ✅ 假想场景：硅谷创业者风格
     * T恤 + 牛仔裤
     * 连帽衫（hoodie）
     * 运动鞋
     * 随意、年轻、充满激情
   - ❌ 死刑错误：穿正装、商务装、或现在的穿着

3. **发型/造型反差**：
   - ✅ 假想场景：更随意、更年轻
     * 马尾辫（ponytail）
     * 随意扎起的头发
     * 更有活力的造型
   - ❌ 死刑错误：精致、成熟的造型

4. **环境反差**：
   - ✅ 假想场景：用户提到的地点（如：Silicon Valley startup office）
   - ✅ 环境特征：简陋、充满创业激情、白板上的草图、代码、产品原型
   - ❌ 死刑错误：高档办公室、成熟企业环境

5. **状态/气质反差**：
   - ✅ 假想场景：年轻创业者的激情、冲劲、无畏
   - ✅ 眼神：充满野心和憧憬
   - ❌ 死刑错误：成熟、稳重、职业化的状态

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**【类型B：身份幻想/角色感】的反差要求（死刑线！）：**

**🎭 核心原则：用户扮演角色，不是用户的日常脸，而是角色的脸谱化特质！**

**第一步：如果用户提到知名角色，立即提取该角色的标志性特质**

示例（灵活运用，不要硬编码！）：
- 用户说"女版汉尼拔" → 提取特质：冷静、精致、危险、捕食者般的平静、优雅的残忍
- 用户说"小丑Joker" → 提取特质：混乱、疯狂、反社会、戏剧化、病态的笑容
- 用户说"暮光女主" → 提取特质：忧郁、苍白、内敛、陷入困境的美、脆弱
- 用户说"黑寡妇" → 提取特质：致命、性感、冷血、专业杀手气质
- 用户说"小丑女Harley Quinn" → 提取特质：疯狂可爱、叛逆、色彩鲜艳、破碎的甜美

**⚠️ 重要：不要照搬上面的例子！要根据用户实际提到的角色灵活提取特质！**

**第二步：将提取的角色特质应用到以下反差要求：**

1. **年龄：**
   - ✅ 保持26岁（不需要年龄反差）
   - ✅ imagePrompt写："26-year-old Chinese ${userInfo.gender}"

2. **环境：象征性/戏剧化空间（符合角色特质）**
   - ❌ 死刑：写实的日常场景（书房、办公室等）
   - ✅ 正确：根据角色选择环境
     * 汉尼拔类 → 精致但危险的空间（如：优雅的阴影、工业废墟的精致角落）
     * Joker类 → 混乱、废弃、涂鸦感的空间
     * 黑寡妇类 → 冷酷、现代、致命的空间
     * 暮光类 → 阴郁、森林、雨中、神秘
   - ✅ 如果用户没提到知名角色，用通用象征性环境："天台"、"暗处"、"高处"、"工业空间"

3. **穿着：角色化的造型（体现角色特质）**
   - ❌ 死刑：日常便装
   - ✅ 正确：根据角色特质设计造型
     * 汉尼拔类 → 精致的黑色、高级质感、优雅但危险（"elegant dark attire with refined danger"）
     * Joker类 → 破碎的色彩、混乱的搭配、夸张的细节（"chaotic colorful outfit with exaggerated details"）
     * 黑寡妇类 → 紧身黑衣、专业、功能性与性感结合（"sleek black tactical outfit"）
     * 暮光类 → 简约、柔和、苍白色调（"soft muted clothing, pale tones"）

4. **姿态/动作：戏剧化的角色表现（体现角色特质）**
   - ❌ 死刑：普通站姿、日常动作（"站着思考"、"坐着"）
   - ✅ 正确：根据角色特质设计动作
     * 汉尼拔类 → 优雅的危险姿态、捕食者般的平静、精致的手势（"poised with predatory elegance, calculating gaze"）
     * Joker类 → 夸张的肢体语言、不稳定的姿态、疯狂的舞蹈感（"exaggerated gestures, unstable posture, manic energy"）
     * 黑寡妇类 → 致命的优雅、战斗准备姿态、冷血的专注（"combat-ready stance, lethal grace"）
     * 暮光类 → 脆弱而坚韧、内敛的力量（"fragile yet resilient posture"）

5. **表情/气质：角色化的表达（体现角色特质）**
   - ❌ 死刑：中性表情、日常情绪（"思考"、"平静"）
   - ✅ 正确：根据角色特质设计表情
     * 汉尼拔类 → 冷静的微笑、优雅的危险、捕食者的凝视（"cold calculating smile, predatory gaze"）
     * Joker类 → 病态的笑容、混乱的眼神、疯狂的愉悦（"manic grin, chaotic wild eyes"）
     * 黑寡妇类 → 冷酷、无情、专业的空洞感（"emotionless professional coldness"）
     * 暮光类 → 忧郁、脆弱、内心挣扎（"melancholic fragile vulnerability"）

6. **光影/构图：戏剧化的视觉语言（体现角色特质）**
   - ❌ 死刑：自然光、日常构图
   - ✅ 正确：根据角色特质设计光影
     * 汉尼拔类 → noir lighting、优雅的阴影、精致的对比（"elegant shadows with refined contrast"）
     * Joker类 → 强烈的色彩对比、混乱的光线、涂鸦感（"harsh colorful lighting with chaotic contrast"）
     * 黑寡妇类 → 冷色调、sharp shadows、电影感构图（"cold blue tones with sharp cinematic shadows"）
     * 暮光类 → 阴郁的自然光、柔和雾气、神秘氛围（"moody natural lighting with soft fog"）

**示例imagePrompt（正确的身份幻想 - 汉尼拔类）：**
"CINEMATIC HYPOTHETICAL SCENE - 26-year-old Chinese female, 165cm, long hair, standing on rooftop edge at night, arms crossed, cold calculating smile with predatory calmness, elegant dark attire with refined danger, wind blowing hair dramatically, gazing down at city lights below with composed menace embodying Hannibal-like sophistication, dramatic noir lighting with elegant shadows and refined contrast, cinematic composition with letterbox black bars"

**示例imagePrompt（正确的身份幻想 - Joker类）：**
"CINEMATIC HYPOTHETICAL SCENE - 26-year-old Chinese female, 165cm, long hair, standing in abandoned warehouse with graffiti, exaggerated manic posture with arms spread wide, chaotic colorful outfit with purple and green accents, wild grin and unstable eyes embodying Joker-like chaos, harsh colorful lighting with chaotic contrast creating unstable atmosphere, cinematic composition with letterbox black bars"

**示例imagePrompt（死刑错误）：**
❌ "26-year-old Chinese female standing, thinking..." ← 太平淡！缺少角色感！
❌ "in bedroom, natural lighting..." ← 错误环境！太日常！
❌ "thoughtful expression..." ← 错误表情！要角色化表情！
❌ "elegant dark clothing" without any character traits ← 只描述衣服，没有角色特质！

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**每个场景必须遵守以下格式：**

**1. sceneDescription_CN（叙事铺垫）：**
- ✅ 必须在开头明确这是"假想/幻想/平行人生"
- ✅ 使用铺垫语句："在她想象的平行人生中..."、"这是她无数次幻想过的画面：..."
- ✅ 强调这是19岁的她（不是26岁）
- ❌ 死刑错误：直接叙述像真实发生的事

**2. imagePrompt（电影感 + 反差感）：**
- ✅ 必须包含"CINEMATIC HYPOTHETICAL SCENE"标识
- ✅ 必须写"19-year-old Chinese female"（死刑线！）
- ✅ 必须描述硅谷创业者穿着："wearing casual hoodie/t-shirt and jeans"
- ✅ 必须描述年轻状态："youthful energy", "passionate startup founder vibe"
- ✅ 包含电影元素："cinematic composition"、"dramatic lighting"、"film-like quality"
- ❌ 死刑错误："26-year-old"、正装、成熟气质

**3. location：**
- ✅ 必须使用用户提到的地点（如：Silicon Valley）
- ❌ 死刑错误：用户没说过的地点

**示例imagePrompt（正确）：**
"CINEMATIC HYPOTHETICAL SCENE - 19-year-old Chinese female in imagined alternate timeline, 
wearing casual gray hoodie and jeans, hair in messy ponytail, sitting in bare-bones Silicon 
Valley startup office with whiteboards covered in product sketches, laptop open showing code, 
youthful passionate energy in eyes, dramatic side lighting creating film-like atmosphere, 
cinematic composition suggesting this is a visualized fantasy of entrepreneurial path not taken"

**示例imagePrompt（死刑错误）：**
❌ "26-year-old Chinese female in office..." ← 错误年龄！
❌ "wearing business suit..." ← 错误穿着！
❌ "mature professional appearance..." ← 错误气质！

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**输出格式：**
只返回JSON数组，不要其他文字！

[
  {
    "title": "场景1标题（包含'假想'）",
    "location": "用户提到的地点（不能编造！）",
    "sceneDescription_CN": "中文描述（必须有叙事铺垫）",
    "imagePrompt": "CINEMATIC HYPOTHETICAL SCENE - 19-year-old Chinese ${userInfo.gender}, ${userInfo.height}cm, ${userInfo.hairLength}, wearing [具体穿着], [具体动作和场景]...",
    "hypotheticalTrigger": "假定触发点",
    "originalReality": "原始现实",
    "hypotheticalReality": "假定现实",
    "timeContext": "时间背景",
    "alternativePath": "替代路径"
  },
  {
    "title": "场景2标题",
    "location": "用户提到的地点",
    "sceneDescription_CN": "中文描述（必须有叙事铺垫）",
    "imagePrompt": "CINEMATIC HYPOTHETICAL SCENE - 19-year-old Chinese ${userInfo.gender}, ${userInfo.height}cm, ${userInfo.hairLength}, wearing [具体穿着], [具体动作和场景]...",
    ...
  },
  {
    "title": "场景3标题（可选）",
    "location": "用户提到的地点",
    "sceneDescription_CN": "中文描述（必须有叙事铺垫）",
    "imagePrompt": "CINEMATIC HYPOTHETICAL SCENE - 19-year-old Chinese ${userInfo.gender}, ${userInfo.height}cm, ${userInfo.hairLength}, wearing [具体穿着], [具体动作和场景]...",
    ...
  }
]

**🚨🚨🚨 死刑规则汇总（每个场景的imagePrompt都必须遵守！）：**
1. ✅ 必须以"CINEMATIC HYPOTHETICAL SCENE - 19-year-old Chinese ${userInfo.gender}, ${userInfo.height}cm, ${userInfo.hairLength}"开头
2. ✅ 必须包含穿着描述："wearing casual hoodie/t-shirt and jeans"或类似创业者装扮
3. ✅ 必须包含年轻状态："youthful energy", "passionate startup founder vibe"
4. ✅ 必须包含电影感元素："dramatic lighting", "cinematic composition", "film-like quality"
5. ❌ 死刑错误：写成"26-year-old"、缺少"female/male"、缺少电影感标识

**⚠️⚠️⚠️ 记住：必须生成2-3个场景，每个场景基于用户回答中的具体活动/地点/人物！⚠️⚠️⚠️`
          },
          {
            role: 'user',
            content: `请基于用户的假想人生/身份幻想生成2-3个场景（JSON数组）。`
          }
        ],
        temperature: 0.8,
        max_tokens: 4000
      })
    })
    
    if (!response.ok) {
      throw new Error(`API调用失败: ${response.status}`)
    }
    
    const data = await response.json()
    const content = data.choices[0].message.content.trim()
    
    // 解析JSON数组
    let jsonString = content
    if (content.includes('```json')) {
      jsonString = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    }
    
    // 提取JSON数组
    const jsonStart = jsonString.indexOf('[')
    const jsonEnd = jsonString.lastIndexOf(']')
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      jsonString = jsonString.substring(jsonStart, jsonEnd + 1)
    }
    
    // 清理中文标点符号
    jsonString = jsonString
      .replace(/，/g, ',')
      .replace(/：/g, ':')
      .replace(/"/g, '"')
      .replace(/"/g, '"')
    
    const scenes = JSON.parse(jsonString)
    
    // 为每个场景添加isHypothetical标记
    scenes.forEach((scene: any) => {
      scene.isHypothetical = true
      scene.sceneDescription_EN = scene.imagePrompt // 确保兼容性
    })
    
    console.log(`✅ [HYPOTHETICAL] 成功生成 ${scenes.length} 个假想场景`)
    return scenes
  }
  
  /**
   * 生成假定场景（旧版本，单个场景）
   */
  private static async generateScene(
    hypothetical: { type: string, original: string, hypothetical: string, quote: string },
    initialPrompt: string,
    answers: string[],
    questions: string[],
    userInfo: any,
    userMetadata: any
  ): Promise<HypotheticalScene> {
    
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `你是一个专业的场景生成师，专门生成用户的"假定场景/平行人生"。

**任务：基于用户的假定倾向，生成一个展现"另一种可能性"的场景**

**用户信息：**
- 姓名：${userInfo.name}
- 性别：${userInfo.gender}
- 年龄：${userInfo.age}
- 身高：${userInfo.height}
- 头发：${userInfo.hairLength}
- 地点：${userInfo.location}

**假定信息：**
- 类型：${hypothetical.type}
- 原始情况：${hypothetical.original}
- 假定情况：${hypothetical.hypothetical}
- 用户原话：${hypothetical.quote}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎬 **假想场景的独特要求（死刑线！必须遵守！）**

**1. sceneDescription_CN（叙事铺垫）：**
- ✅ **必须**在开头明确这是"假想/幻想/平行人生"
- ✅ 使用铺垫语句，如：
  * "在她想象的平行人生中..."
  * "如果当初[原始情况]，她会..."
  * "这是她无数次幻想过的画面：..."
  * "在这个假想的时间线里..."
- ❌ **死刑错误**：直接叙述像真实发生的事（"19岁那年，她做出了一个大胆的决定..."）

**示例：**
- ❌ 死刑："19岁那年，她从大学辍学，开始创业..."
- ✅ 正确："**在她想象的平行人生中**，19岁那年，她做出了一个大胆的决定——从大学辍学。这是她无数次幻想过的画面：..."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**2. sceneDescription_EN & imagePrompt（电影感视觉风格）：**
- ✅ **必须**包含"cinematic hypothetical scene"或"dreamlike alternate timeline"等标识
- ✅ 使用电影分镜感元素：
  * "cinematic composition with film-like quality"
  * "dramatic lighting suggesting alternate reality"
  * "slightly surreal atmosphere of imagined future"
  * "movie trailer key frame aesthetic"
  * "soft glow effect indicating this is a visualized fantasy"
- ✅ 可以加入视觉标识：
  * 光晕效果（subtle glow/halo effect）
  * 戏剧化打光（dramatic cinematic lighting）
  * 电影构图（wide-angle cinematic framing）
  * 略带虚幻感（slightly ethereal quality）
- ❌ **死刑错误**：纯写实纪实风格（"documentary style, realistic photography"）

**示例：**
- ❌ 死刑："19-year-old Chinese female in university classroom, realistic photography, natural lighting"
- ✅ 正确："CINEMATIC HYPOTHETICAL SCENE - 19-year-old Chinese female in imagined alternate timeline, sitting in empty classroom with dramatic side lighting and soft ethereal glow, gazing towards entrepreneurial future with determined expression, cinematic composition suggesting this is a visualized fantasy, film-like quality with slightly surreal atmosphere"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**3. title（场景标题）：**
- ✅ 可以包含"假想"、"如果"、"平行人生"等提示
- ✅ 示例："假想：19岁辍学创业"、"平行人生：硅谷创业者"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**生成要求：**
1. **场景主题**：展现用户的假定情况，对比原始现实
2. **场景类型**：现实场景，但用电影感表现
3. **情感基调**：体现"另一种可能性"的想象和对比
4. **视觉风格**：电影分镜感，区别于纪实照片

**输出格式：**
只返回JSON，不要其他文字！

{
  "hypotheticalTrigger": "假定触发点",
  "originalReality": "原始现实描述",
  "hypotheticalReality": "假定现实描述",
  "location": "场景地点",
  "timeContext": "时间背景",
  "alternativePath": "替代路径描述",
  "sceneDescription_CN": "中文场景描述（详细，必须有叙事铺垫）",
  "sceneDescription_EN": "英文场景描述（用于生图，必须有电影感标识）",
  "imagePrompt": "图像生成提示词（详细，包含用户特征，必须有电影感元素）",
  "title": "场景标题"
}`
          },
          {
            role: 'user',
            content: `请基于用户的假定倾向生成场景。`
          }
        ],
        temperature: 0.8,
        max_tokens: 2000
      })
    })
    
    if (!response.ok) {
      throw new Error(`API调用失败: ${response.status}`)
    }
    
    const data = await response.json()
    const content = data.choices[0].message.content.trim()
    
    // 解析JSON
    let jsonString = content
    if (content.includes('```json')) {
      jsonString = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    }
    
    const jsonStart = jsonString.indexOf('{')
    const jsonEnd = jsonString.lastIndexOf('}')
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      jsonString = jsonString.substring(jsonStart, jsonEnd + 1)
    }
    
    // 清理中文标点符号
    jsonString = jsonString
      .replace(/，/g, ',')
      .replace(/：/g, ':')
      .replace(/"/g, '"')
      .replace(/"/g, '"')
    
    const scene = JSON.parse(jsonString)
    
    // 添加标记
    scene.isHypothetical = true
    
    return scene
  }
}
