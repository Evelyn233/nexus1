/**
 * 用户生成内容存储服务
 * 负责保存和检索用户的生图内容
 */

import { getUserInfo, getUserMetadata } from './userInfoService'

export interface SaveContentData {
  initialPrompt: string
  questions: string[]
  answers: string[]
  scenes: any  // SceneGenerationResult
  storyNarrative?: string
  images: Array<{
    sceneTitle: string
    sceneIndex: number
    prompt: string
    imageUrl?: string
    localPath?: string
  }>
  tags?: string[]
  category?: string
}

export interface UserGeneratedContentRecord {
  id: string
  initialPrompt: string
  questions: string[]
  answers: string[]
  scenes: any
  storyNarrative?: string
  images: any[]
  imageCount: number
  userSnapshot?: any
  metadataSnapshot?: any
  tags?: string[]
  category?: string
  status: string
  createdAt: string
  updatedAt: string
}

/**
 * 保存用户生成的内容到数据库
 */
export async function saveUserGeneratedContent(
  data: SaveContentData
): Promise<{ success: boolean; contentId?: string; error?: string }> {
  try {
    console.log('💾 [CONTENT-STORAGE] 开始保存用户生成内容...')
    console.log('💾 [CONTENT-STORAGE] 初始输入:', data.initialPrompt)
    console.log('💾 [CONTENT-STORAGE] 场景数量:', data.scenes?.logicalScenes?.length || 0)
    console.log('💾 [CONTENT-STORAGE] 图片数量:', data.images?.length || 0)

    // 获取当前用户信息和元数据作为快照
    const userInfo = await getUserInfo()
    const userMetadata = await getUserMetadata()

    const userSnapshot = {
      name: userInfo.name,
      gender: userInfo.gender,
      age: userInfo.age,
      height: userInfo.height,
      weight: userInfo.weight,
      location: userInfo.location,
      personality: userInfo.personality,
      hairLength: userInfo.hairLength,
      birthDate: userInfo.birthDate
    }

    const metadataSnapshot = {
      corePersonalityTraits: userMetadata.corePersonalityTraits,
      communicationStyle: userMetadata.communicationStyle,
      emotionalPattern: userMetadata.emotionalPattern,
      decisionMakingStyle: userMetadata.decisionMakingStyle,
      stressResponse: userMetadata.stressResponse
    }

    // 调用API保存
    const response = await fetch('/api/user/generated-content', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        initialPrompt: data.initialPrompt,
        questions: data.questions,
        answers: data.answers,
        scenes: data.scenes,
        storyNarrative: data.storyNarrative,
        images: data.images,
        userSnapshot,
        metadataSnapshot,
        tags: data.tags || [],
        category: data.category || 'daily'
      })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('❌ [CONTENT-STORAGE] API保存失败:', error)
      return { success: false, error: error.error || '保存失败' }
    }

    const result = await response.json()
    console.log('✅ [CONTENT-STORAGE] 内容保存成功:', result.contentId)

    return {
      success: true,
      contentId: result.contentId
    }

  } catch (error) {
    console.error('❌ [CONTENT-STORAGE] 保存内容失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '保存失败'
    }
  }
}

/**
 * 获取用户的生成内容列表
 */
export async function getUserGeneratedContents(
  limit: number = 10,
  offset: number = 0,
  category?: string
): Promise<{
  success: boolean
  contents?: UserGeneratedContentRecord[]
  total?: number
  hasMore?: boolean
  error?: string
}> {
  try {
    console.log('📖 [CONTENT-STORAGE] 获取用户内容列表...')

    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    })
    if (category) {
      params.append('category', category)
    }

    console.log('📡 [CONTENT-STORAGE] 发送API请求:', `/api/user/generated-content?${params}`)
    const response = await fetch(`/api/user/generated-content?${params}`)
    console.log('📡 [CONTENT-STORAGE] API响应状态:', response.status)

    if (!response.ok) {
      const error = await response.json()
      console.error('❌ [CONTENT-STORAGE] API获取失败:', error)
      return { success: false, error: error.error || '获取失败' }
    }

    const result = await response.json()
    console.log(`✅ [CONTENT-STORAGE] 获取成功: ${result.contents.length}条`)

    return {
      success: true,
      contents: result.contents,
      total: result.total,
      hasMore: result.hasMore
    }

  } catch (error) {
    console.error('❌ [CONTENT-STORAGE] 获取内容列表失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取失败'
    }
  }
}

/**
 * 获取单个生成内容的详细信息
 */
export async function getUserGeneratedContentDetail(
  contentId: string
): Promise<{
  success: boolean
  content?: UserGeneratedContentRecord
  error?: string
}> {
  try {
    console.log('📖 [CONTENT-STORAGE] 获取内容详情:', contentId)

    const response = await fetch('/api/user/generated-content', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ contentId })
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('❌ [CONTENT-STORAGE] API获取详情失败:', error)
      return { success: false, error: error.error || '获取失败' }
    }

    const result = await response.json()
    console.log('✅ [CONTENT-STORAGE] 获取详情成功')

    return {
      success: true,
      content: result.content
    }

  } catch (error) {
    console.error('❌ [CONTENT-STORAGE] 获取内容详情失败:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : '获取失败'
    }
  }
}

