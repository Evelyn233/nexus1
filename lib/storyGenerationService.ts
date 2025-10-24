import { SceneGenerationResult } from './sceneGenerationService'
import { getUserInfo, getUserMetadata } from './userDataApi'
// ✂️ 已删除：PersonalityVisualizationService - 避免"理性"标签带偏
import { MetadataSelector } from './metadataSelector'

export interface StoryResult {
  narrative: string
  aiPrompt: string
  sceneDescription: string
  characterDescription: string
  settingDescription: string
  moodDescription: string
}

/**
 * 故事生成服务
 * 负责根据场景数据生成完整的故事叙述
 */
export class StoryGenerationService {
  
  /**
   * 根据场景数据生成完整故事（如果第一阶段已有narrative则进行增强）
   */
  static async generateStoryFromScenes(
    sceneData: SceneGenerationResult,
    initialPrompt: string,
    answers: string[]
  ): Promise<StoryResult> {
    console.log('📖 [STORY-GEN] 开始根据场景生成故事')
    console.log('📖 [STORY-GEN] 场景数据:', sceneData)
    
    // ✂️ 删除冗余日志：用户完整档案（太长，影响性能）
    
    // 🔄 本次完整对话（所有输入同等对待）
    const allInputs = [initialPrompt, ...answers].filter(input => input && input.trim())
    
    console.log('🔄 [STORY-GEN] 本次完整对话（所有输入）:', allInputs)
    console.log('🔄 [STORY-GEN] 总计', allInputs.length, '条输入')

    // 在try块外获取用户信息，以便catch块也能使用
    const userInfo = await getUserInfo()
    const userLocation = userInfo?.location || '上海'

    try {
      const userMetadata = await getUserMetadata()
      
      // 智能选择故事生成相关的metadata字段
      const storyMetadata = MetadataSelector.selectForStoryGeneration(userMetadata)
      console.log('📖 [STORY-GEN] 故事生成相关metadata:', storyMetadata)
      
      // ✂️ 已删除性格可视化调用（避免"理性"标签带偏）
      const personalityDescription = '' // 删除性格可视化，避免元数据带偏
      
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
              content: `你是一个专业的故事叙述专家。你的任务是根据提供的场景数据，生成一个完整、连贯、引人入胜的故事叙述。

故事生成要求：
1. **基于现有内容**：如果场景数据中已有narrative，则在此基础上进行增强和完善
2. **逻辑连贯**：确保故事逻辑顺畅，时间线清晰
3. **人物一致**：用户是${userInfo?.age || 26}岁中国${userInfo?.gender === 'female' ? '女性' : '男性'}，${userInfo?.height || '165'}cm，${userInfo?.weight || '55'}kg，主要活动地点在${userLocation}，不能改为其他城市
4. **真实姓名**：必须使用用户的真实姓名"${userInfo?.name || '用户'}"，不要虚构其他名字（如"李雨晨"等）
5. **性格深度体现**：
   - 优先基于用户的自我认知（personality字段）来理解用户的整体特质
   - 不要在故事中直接出现"INTJ"、"MBTI"、"AI创业者"等标签
   - 通过用户的行为、思考方式、情感反应、对话方式等细节，自然地体现这些特征
   - 元数据分析（如核心性格特征、沟通风格等）作为辅助参考，帮助理解用户的行为模式
6. **情感真实**：根据用户元数据中的性格特征、情感模式、沟通风格，展现真实的情感变化
7. **细节丰富**：结合用户的生活经历和偏好，增加生动的细节描述
8. **语言风格**：根据用户的沟通风格特征，调整叙述的语言风格
9. **核心聚焦**：始终围绕用户的初始输入和问答记录展开

**⚠️⚠️⚠️ 心理剧场景特殊处理（极其重要！）：**
- 场景中如果有 isPsychodrama=true 标记，说明这是心理剧场景
- 心理剧场景有特殊字段：innerMonologue（内心独白）、surfaceVsInner（表面vs内心对比）
- **故事中必须体现心理剧的内心世界描写**
- 写法示例：
  * 外部场景："老板站在前方，双臂高举，激情宣布..."
  * 内心世界："${userInfo?.name}表面保持优雅姿态，偶尔点头，内心却在疯狂冷笑：'[innerMonologue内容]'她的理性思维快速运转..."
- **不要忽略心理剧场景！必须在故事中完整体现内心独白和表面vs内心对比！**

**⚠️⚠️⚠️ 用户对话和思考必须基于潜意识数据（极其重要！）：**
- 故事中如果有用户说的话、想的内容，必须符合用户的真实表达方式！
- **根据用户沟通风格写对话**：
  * 如果用户"简洁直接" → 对话简短有力："就6块钱"而不是"我觉得可以用6块钱的方案"
  * 如果用户"幽默调侃" → 对话带玩笑感："我花了6块钱呢"（带点欠的语气）
  * 如果用户"略带挑衅" → 对话可以有挑衅意味
- **根据用户核心性格写思考**：
  * 如果用户"批判性思维" → 思考是理性分析："她分析着：内容同质化..."
  * 如果用户"务实主义" → 思考聚焦实际效果
  * 如果用户"艺术敏感" → 思考有艺术化比喻
- **根据用户情感模式写情绪反应**：
  * 如果用户"情绪稳定、克制" → 情绪内敛但深刻
  * 如果用户"享受冲突反应" → 表现出觉得好笑而非紧张
  * 如果用户"幽默化解压力" → 用幽默视角看待冲突

请返回JSON格式的结果，包含：
- narrative: 完整的故事叙述（⚠️ 自然流畅的叙述，不要包含【】标签！）
- aiPrompt: 用于图像生成的AI提示词
- sceneDescription: 场景描述
- characterDescription: 人物描述
- settingDescription: 环境描述
- moodDescription: 氛围描述

🚨🚨🚨 关键要求：
- narrative字段必须是自然流畅的故事叙述
- ❌ 不要包含【简洁直接】、【批判性思维】、【情绪内化】等标签！
- ✅ 这些特质要融入叙述方式，而不是作为标签显示
- ✅ 例如：不要写"${userInfo?.name}【简洁直接】说"，而是直接写"${userInfo?.name}冷静地说"
- ✅ 不要写"【批判性思维】她分析"，而是直接写"她理性分析着"
- ✅ 不要写"【艺术敏感】她把场面看作话剧"，而是直接写"她把这场面看作一出精心编排的滑稽剧"`
            },
            {
              role: 'user',
              content: `场景数据（包含心理剧场景的内心世界字段）：
${JSON.stringify({
  ...sceneData,
  logicalScenes: sceneData.logicalScenes.map((scene: any) => {
    if (scene.isPsychodrama) {
      return {
        ...scene,
        '心理剧标记_重要': '必须在故事中体现内心世界！',
        '内心独白_必须写入故事': scene.innerMonologue,
        '表面vs内心对比_必须写入故事': scene.surfaceVsInner,
        '意识流_可融入故事': scene.consciousnessStream,
        '心理象征_可融入故事': scene.psychologicalSymbolism
      }
    }
    return scene
  })
}, null, 2)}

用户元数据：
${JSON.stringify(userMetadata, null, 2)}

**🔄 用户输入：**

**📌 本次完整对话（所有输入同等重要）：**
${allInputs.map((input, i) => `
输入 ${i + 1}: "${input}"
${i === 0 ? '→ 对话起点（核心主题）' : '→ 补充细节（同等重要）'}
`).join('')}

⚠️⚠️⚠️ 核心原则：
1. **所有输入同等重要**：这是一个完整对话，不分主次
2. **综合理解所有输入**：初始输入通常包含核心观点，后续回答补充细节和例子
3. **故事应该反映整体内容**：串联所有提到的场景和观点
4. **特别注意用户的观点、对比和价值判断**

用户基本信息：
- 姓名：${userInfo?.name || '用户'}
- 性别：${userInfo?.gender === 'female' ? '女性' : '男性'}
- 年龄：${userInfo?.age || 26}岁
- 身高：${userInfo?.height || '165'}cm
- 体重：${userInfo?.weight || '55'}kg
- 所在地：${userLocation}（重要：所有场景必须在${userLocation}，不能改为其他城市）

用户自我认知（重要：这是用户对自己的整体描述，请深度理解并通过故事细节体现）：
${userInfo?.personality || '暂无自我描述'}

**📋 用户元数据参考（重点突出故事生成相关字段，但包含所有字段供参考）：**

**🎯 故事生成重点字段（必须用于精准表达用户！）：**
- 核心性格特征：${JSON.stringify(storyMetadata.coreTraits || [])}
- 沟通风格（重要！用于写用户对话）：${JSON.stringify(storyMetadata.communicationStyle || [])}
- 情感模式（重要！用于写情绪反应）：${JSON.stringify(storyMetadata.emotionalPattern || [])}
- 行为模式（重要！用于写行为细节）：${JSON.stringify(storyMetadata.behaviorPatterns || [])}
- 对话洞察（重要！了解用户真实想法）：${JSON.stringify(storyMetadata.conversationInsights || [])}
- 压力反应（重要！用于写用户应对方式）：${JSON.stringify(storyMetadata.stressResponse || [])}

**⚠️⚠️⚠️ 如何使用潜意识数据写用户可能说的话（极其重要！）：**

1. **用户说话方式（基于沟通风格）**：
   - 如果有"简洁直接" → 用户说话简短："就6块钱" "用淘宝爬虫"
   - 如果有"幽默调侃" → 用户说话带玩笑："我花了6块钱呢"（欠欠的语气）
   - 如果有"略带挑衅" → 用户说话可以挑衅："我很欠的跟老板说"
   - 如果有"直接表达" → 用户不绕弯子，直接说重点
   
2. **用户思考方式（基于核心性格）**：
   - 如果有"批判性思维" → "她理性分析：公司内容同质化严重，AI都能做..."
   - 如果有"务实主义" → "她关注实际：6块钱解决了核心问题，比空谈有效"
   - 如果有"艺术敏感" → "她用艺术化视角看待：这像一场荒诞话剧..."
   
3. **用户情绪反应（基于情感模式）**：
   - 如果有"轻松应对压力" → "她觉得好笑，毫无压力"
   - 如果有"享受冲突反应" → "她内心觉得这场景很有意思"
   - 如果有"幽默化解" → "她用幽默视角看待，觉得荒诞又好笑"
   - 如果有"情绪内化" → "表面平静，内心激烈"

**示例对比：**

❌ 不精准（通用模板）：
"${userInfo?.name}说：'我觉得可以用一个比较经济的方案来解决这个问题。'她心里想着这个方案很好。"

✅ 精准（基于潜意识特质，自然融入叙述，无标签）：
"面试间里，老板摊开手掌，笑容温暖地说：'我们是result-oriented的，你可以work from home，兼职也可以。'${userInfo?.name}表面保持职业化的专注，内心却被这种开放思维吸引——这正是她向往的硅谷式工作氛围。

然而现实很快露出真相。在日常工作中，老板手指指向她，肩膀平展展现着传统中式权威姿态。${userInfo?.name}眉毛微挑，冷静地分析着这种文化身份的割裂。她理性思维快速运转：表面谈开放创新，内核却是传统权威结构。她把这场面看作一个精心包装的谎言——美国思维只是外层糖衣，传统老男人的专制才是内核。意识流中闪过'所谓的开放...原来都是假象'的念头，嘴角几乎看不见的讽刺弧度暴露了她内心对虚伪的洞察。"

⚠️ 注意对比：
- ❌ 有标签："${userInfo?.name}【简洁直接】说"、"【批判性思维】她分析"
- ✅ 无标签："${userInfo?.name}冷静地说"、"她理性分析着"

⚠️⚠️⚠️ 重要：以上【】标签只是给你的指导，帮你理解如何运用潜意识特质！
🚨🚨🚨 生成的最终故事中不要包含【】标签！要自然流畅的叙述！

**📚 其他参考字段：**
- 常去地点：${JSON.stringify(storyMetadata.frequentLocations || [])}
- 喜欢场所：${JSON.stringify(storyMetadata.favoriteVenues || [])}
- 美学偏好：${JSON.stringify(storyMetadata.aestheticPreferences || [])}
- 生活爱好：${JSON.stringify(storyMetadata.lifestyleHobbies || [])}
- 活动偏好：${JSON.stringify(storyMetadata.activityPreferences || [])}
- 时尚风格：${JSON.stringify(storyMetadata.fashionStyle || [])}
- 风格洞察：${JSON.stringify(storyMetadata.styleInsights || [])}
- 决策风格：${JSON.stringify(storyMetadata.decisionStyle || [])}
- 压力反应：${JSON.stringify(storyMetadata.stressResponse || [])}
- 人际优势：${JSON.stringify(storyMetadata.interpersonalStrengths || [])}
- 人际挑战：${JSON.stringify(storyMetadata.interpersonalChallenges || [])}

**⚠️ 重要原则：**
1. 用户明确说的内容（食物、地点、时间、状态等）必须100%准确还原
2. 用户没说的地方，可以参考metadata进行合理推测
3. 如果用户说的内容与metadata不符，以用户说的为准
4. metadata只用于补充细节，不能篡改用户明确表达的内容

**🎨 用户性格可视化（重要！请在故事中自然体现这些细节）：**
${personalityDescription}

**故事细节要求：**
- 描述环境时，要体现用户喜欢的配色、装饰风格、空间布局
- 如果涉及饮食场景，要使用用户偏好的菜系和口味
- 描述环境氛围时，要体现用户偏好的声音和音乐
- 人物的活动方式要符合用户的性格特质
- 空间的选择要符合用户的隐私度偏好

${sceneData.narrative ? `现有故事叙述：
${sceneData.narrative}

请在现有故事基础上进行增强和完善，确保：` : `请基于以上信息生成一个完整的故事叙述，确保：`}
1. 故事逻辑连贯，时间线清晰
2. 人物特征一致，地理位置必须在${userLocation}，不能改为其他城市
3. 情感变化真实，体现用户的性格特点
4. 语言风格符合用户的沟通特征
5. ${sceneData.narrative ? '在现有narrative基础上增加细节和深度' : '生成全新的故事叙述'}

🚨🚨🚨 故事叙述格式要求（必须遵守！）：
- ❌ 不要在故事中包含【】标签（如【简洁直接】、【批判性思维】、【情绪内化】等）
- ✅ 这些特质要自然融入叙述，用描述性语言表达
- ✅ 例如：写"她冷静地说"而不是"她【简洁直接】说"
- ✅ 例如：写"她理性分析着"而不是"【批判性思维】她分析"
- ✅ 例如：写"她把这场面看作一出滑稽剧"而不是"【艺术敏感】她把场面看作话剧"

重要：所有场景必须在${userLocation}发生，包括法院、机场、公园等地点都必须在${userLocation}！`
            }
          ],
          max_tokens: 3000,
          temperature: 0.8
        })
      })

      if (!response.ok) {
        throw new Error(`DeepSeek API调用失败: ${response.status}`)
      }

      const data = await response.json()
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content.trim()
        console.log('📖 [STORY-GEN] 原始LLM响应:', content)
        
        // 解析JSON响应
        let jsonContent = content
        if (jsonContent.includes('```json')) {
          jsonContent = jsonContent.replace(/```json\s*/, '').replace(/```\s*$/, '').trim()
        }
        if (jsonContent.includes('```')) {
          jsonContent = jsonContent.replace(/```\s*/, '').replace(/```\s*$/, '').trim()
        }
        
        const parsedData = JSON.parse(jsonContent)
        console.log('📖 [STORY-GEN] 解析后的故事数据:', parsedData)
        
        return parsedData
      } else {
        throw new Error('DeepSeek API返回格式错误')
      }
    } catch (error) {
      console.error('💥 [STORY-GEN] 故事生成失败:', error)
      
      // 返回基于用户真实信息的默认故事
      const userGender = userInfo?.gender === 'female' ? '她' : '他'     
      const userGenderDesc = userInfo?.gender === 'female' ? 'female' : 'male'
      
      return {
        narrative: `在${userLocation}的某个时刻，${userInfo?.age || 26}岁的${userGender}思考着自己的人生。${userInfo?.personality || '这是一个关于成长的故事'}。

这是${userGender}的故事，基于真实的经历和感受。`,
        aiPrompt: `A ${userInfo?.age || 26}-year-old Chinese ${userGenderDesc}, ${userInfo?.height || '165'}cm, ${userInfo?.weight || '55'}kg, in ${userLocation}, modern realistic style, based on personality: ${userInfo?.personality}`,
        sceneDescription: `${userLocation}的日常场景`,
        characterDescription: `${userInfo?.age || 26}岁的${userInfo?.gender === 'female' ? '女性' : '男性'}，${userInfo?.personality}`,
        settingDescription: `主要在${userLocation}，现代都市环境`,
        moodDescription: '基于用户真实情感'
      }
    }
  }

  /**
   * 生成图像生成的AI提示词
   */
  static generateImagePrompt(storyResult: StoryResult, userMetadata: any): string {
    console.log('🎨 [STORY-GEN] 生成图像提示词')
    
    // 基础人物描述（从用户信息获取）
    const { getUserInfo } = require('./userInfoService')
    const userInfo = getUserInfo()
    const baseCharacter = `${userInfo.age || 26}-year-old Chinese ${userInfo.gender === 'female' ? 'female' : 'male'}, ${userInfo.height || '165'}cm, ${userInfo.weight || '55'}kg`
    
    // 根据用户元数据调整风格
    const stylePreferences = userMetadata.fashionStylePreference || '简约'
    const colorPreferences = userMetadata.luckyColors || ['蓝色', '绿色', '紫色', '黑色']
    
    // 构建提示词
    let prompt = `${baseCharacter}, ${storyResult.sceneDescription}, ${storyResult.characterDescription}, ${storyResult.moodDescription}`
    
    // 添加风格偏好
    if (stylePreferences.includes('简约')) {
      prompt += ', minimalist style, clean composition'
    }
    
    // 添加颜色偏好
    if (colorPreferences.includes('蓝色')) {
      prompt += ', blue color palette'
    }
    if (colorPreferences.includes('绿色')) {
      prompt += ', green accents'
    }
    
    // 添加技术参数
    prompt += ', high quality, detailed, realistic, cinematic lighting'
    
    console.log('🎨 [STORY-GEN] 生成的图像提示词:', prompt)
    return prompt
  }

  /**
   * 完整的故事生成流程
   */
  static async generateCompleteStory(
    sceneData: SceneGenerationResult,
    initialPrompt: string,
    answers: string[]
  ): Promise<StoryResult> {
    console.log('🚀 [STORY-GEN] 开始完整故事生成流程')
    
    try {
      // 生成故事
      const storyResult = await this.generateStoryFromScenes(sceneData, initialPrompt, answers)
      
      // 生成图像提示词
      const userMetadata = getUserMetadata()
      const imagePrompt = this.generateImagePrompt(storyResult, userMetadata)
      
      // 更新故事结果中的AI提示词
      storyResult.aiPrompt = imagePrompt
      
      console.log('✅ [STORY-GEN] 完整故事生成流程完成')
      return storyResult
      
    } catch (error) {
      console.error('💥 [STORY-GEN] 完整故事生成失败:', error)
      throw error
    }
  }
}
