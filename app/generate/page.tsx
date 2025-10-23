'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Download, Share2, RotateCcw } from 'lucide-react'
import Image from 'next/image'
import { generateImage } from '@/lib/imageGeneration'
import { getUserDescription, getUserMetadata } from '@/lib/userDataApi'
import { SceneStoryMappingService, StoryMappingResult } from '../../lib/sceneStoryMappingService'
import { saveUserGeneratedContent } from '@/lib/userContentStorageService'

export default function GeneratePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const fromChat = searchParams.get('from') === 'chat'
  const timestamp = searchParams.get('timestamp')
  
  // 从URL参数或sessionStorage获取数据
  const [prompt, setPrompt] = useState('')
  const [title, setTitle] = useState('')
  const [subtitle, setSubtitle] = useState('')
  const [narrative, setNarrative] = useState('')
  const [original, setOriginal] = useState('')
  const [answers, setAnswers] = useState<string[]>([])
  const [fourScenes, setFourScenes] = useState<any>(null)
  
  // 初始化数据
  useEffect(() => {
    if (fromChat && timestamp) {
      // 从sessionStorage读取数据
      const storedData = sessionStorage.getItem('chat_data') || sessionStorage.getItem('magazine_generate_data')
      if (storedData) {
        try {
          const data = JSON.parse(storedData)
          // 处理从chat-new传递的数据结构
          if (data.contentResult) {
            // 新的数据结构：来自chat-new页面
            setPrompt(data.contentResult.finalPrompt || '')
            setNarrative(data.contentResult.story?.narrative || '')
            setAnswers(data.answers || [])
            setOriginal(data.initialPrompt || '')
            console.log('✅ [GENERATE] 使用chat-new数据结构')
          } else {
            // 旧的数据结构：兼容原有格式
            setPrompt(data.prompt || '')
            setTitle(data.title || '')
            setSubtitle(data.subtitle || '')
            setNarrative(data.narrative || '')
            setOriginal(data.original || '')
            setAnswers(data.answers || [])
            setFourScenes(data.fourScenes || null)
            console.log('✅ [GENERATE] 使用原有数据结构')
          }
          
          console.log('🔍 [GENERATE] 从sessionStorage读取数据:', {
            prompt: data.prompt ? '有' : '无',
            title: data.title ? '有' : '无',
            subtitle: data.subtitle ? '有' : '无',
            narrative: data.narrative ? '有' : '无',
            original: data.original ? '有' : '无',
            answers: data.answers ? data.answers.length : 0,
            fourScenes: data.fourScenes ? '有' : '无',
            contentResult: data.contentResult ? '有' : '无',
            storyNarrative: data.contentResult?.story?.narrative ? '有' : '无'
          })
          
          // 调试：显示实际的故事内容
          if (data.contentResult?.story?.narrative) {
            console.log('📖 [GENERATE] 故事内容预览:', data.contentResult.story.narrative.substring(0, 100) + '...')
          }
          
          // 调试：显示场景数据
          if (data.contentResult?.scenes?.logicalScenes) {
            console.log('🎬 [GENERATE] 场景数据:', data.contentResult.scenes.logicalScenes)
            data.contentResult.scenes.logicalScenes.forEach((scene: any, index: number) => {
              console.log(`🎬 [SCENE-${index + 1}] 标题:`, scene.title)
              console.log(`🎬 [SCENE-${index + 1}] 描述:`, scene.description)
            })
          }
          
          // 调试：显示故事分割结果
          if (data.contentResult?.story?.narrative) {
            const storyFragments = splitStoryIntoScenes(data.contentResult.story.narrative)
            console.log('📖 [GENERATE] 故事分割结果:')
            storyFragments.forEach((fragment, index) => {
              console.log(`📖 [FRAGMENT-${index + 1}]:`, fragment.substring(0, 50) + '...')
            })
          }
          
          // 执行智能故事归属
          if (data.contentResult?.story?.narrative && data.contentResult?.scenes?.logicalScenes) {
            console.log('🎯 [GENERATE] 开始执行智能故事归属...')
            setIsStoryMappingLoading(true)
            SceneStoryMappingService.generateStoryMappingFromContentResult(data.contentResult)
              .then((mappingResult: StoryMappingResult) => {
                console.log('✅ [GENERATE] 智能故事归属完成:', mappingResult)
                setStoryMappings(mappingResult.mappings)
                setIsStoryMappingLoading(false)
              })
              .catch((error: any) => {
                console.error('❌ [GENERATE] 智能故事归属失败:', error)
                setIsStoryMappingLoading(false)
              })
          }
        } catch (error) {
          console.error('❌ [GENERATE] 解析sessionStorage数据失败:', error)
        }
      }
    } else {
      // 从URL参数读取数据（兼容旧版本）
      const urlPrompt = searchParams.get('prompt') || ''
      const urlTitle = searchParams.get('title') || ''
      const urlSubtitle = searchParams.get('subtitle') || ''
      const urlNarrative = searchParams.get('narrative') || ''
      const urlOriginal = searchParams.get('original') || ''
      
      setPrompt(urlPrompt)
      setTitle(urlTitle)
      setSubtitle(urlSubtitle)
      setNarrative(urlNarrative)
      setOriginal(urlOriginal)
      
      console.log('🔍 [GENERATE] 从URL参数读取数据:', {
        prompt: urlPrompt ? '有' : '无',
        title: urlTitle ? '有' : '无',
        subtitle: urlSubtitle ? '有' : '无',
        narrative: urlNarrative ? '有' : '无',
        original: urlOriginal ? '有' : '无'
      })
    }
  }, [fromChat, timestamp, searchParams])
  
  const [isGenerating, setIsGenerating] = useState(true)
  const [generatedImages, setGeneratedImages] = useState<string[]>([])
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [generationTime, setGenerationTime] = useState<number>(0)
  const [savedImages, setSavedImages] = useState<any[]>([])
  const [generationMessage, setGenerationMessage] = useState<string>('')
  const [sceneTitles, setSceneTitles] = useState<string[]>([])
  const [mainTitle, setMainTitle] = useState<string>('')

  useEffect(() => {
    if (prompt) {
      generateImageHandler()
    }
  }, [prompt, fromChat, timestamp])

  // 生成场景标题和主标题
  useEffect(() => {
    if (fourScenes && generatedImages.length > 0) {
      generateAllTitles()
    }
  }, [fourScenes, generatedImages])

  // 生成所有标题
  const generateAllTitles = async () => {
    if (!fourScenes) return
    
    console.log('🎨 [GENERATE] 开始生成场景标题和主标题...')
    
    try {
      // 生成场景标题
      const scenes = [fourScenes.scene1, fourScenes.scene2, fourScenes.scene3, fourScenes.scene4]
      const newSceneTitles: string[] = []
      
      for (let i = 0; i < scenes.length; i++) {
        const sceneContent = scenes[i]
        if (sceneContent) {
          const title = await generateSceneTitle(sceneContent, i)
          newSceneTitles.push(title)
        } else {
          newSceneTitles.push(`场景${i + 1}`)
        }
      }
      
      setSceneTitles(newSceneTitles)
      console.log('✅ [GENERATE] 场景标题生成完成:', newSceneTitles)
      
      // 生成主标题
      const mainTitle = await generateMainTitle(newSceneTitles, scenes)
      setMainTitle(mainTitle)
      console.log('✅ [GENERATE] 主标题生成完成:', mainTitle)
      
    } catch (error) {
      console.error('💥 [GENERATE] 标题生成失败:', error)
    }
  }

  const generateImageHandler = async () => {
    if (!prompt.trim()) return
    
    console.log('🎨 [GENERATE] 开始生图流程')
    console.log('🎨 [GENERATE] 提示词:', prompt)
    
    setIsGenerating(true)
    setError(null)
    const startTime = Date.now()
    
    try {
      // 检查是否包含多个场景的提示词
      const sceneMatches = prompt.match(/Scene \d+:/g)
      const hasMultipleScenes = sceneMatches && sceneMatches.length > 1
      
      if (hasMultipleScenes) {
        const sceneCount = sceneMatches.length
        console.log(`🎨 [GENERATE] 检测到${sceneCount}个场景提示词，开始分别生成`)
        
        // 分割场景提示词
        const scenePrompts = prompt.split(/Scene \d+:/).slice(1).map(s => s.trim())
        console.log('🎨 [GENERATE] 分割的场景提示词:', scenePrompts)
        console.log('🎨 [GENERATE] 场景数量:', scenePrompts.length)
        
        const allImageUrls: (string | null)[] = new Array(scenePrompts.length).fill(null)
        
        // 🎯 立即初始化UI：显示所有场景卡片（loading占位符）
        setGeneratedImages([...allImageUrls.filter(url => url !== null) as string[]])
        
        // 🚀 并行生成所有场景图片，实时显示
        setGenerationMessage(`🚀 并行生成${scenePrompts.length}个场景图片...`)
        
        // 创建所有生成Promise（并行执行）
        const generationPromises = scenePrompts.map(async (scenePrompt, i) => {
          const trimmedPrompt = scenePrompt.trim()
          console.log(`🎨 [GENERATE] 🚀 并行启动场景${i + 1}生成`)
          console.log(`📝 [GENERATE] 场景${i + 1}提示词:`, trimmedPrompt.substring(0, 200) + '...')
          
          try {
            const result = await generateImage({ prompt: trimmedPrompt })
            console.log(`🎨 [GENERATE] 场景${i + 1}生成结果:`, result)
            
            if (result.success && result.imageUrl) {
              allImageUrls[i] = result.imageUrl
              
              // 🎉 立即更新UI显示新图片！（使用函数式更新避免竞态）
              setGeneratedImages(prev => {
                const newImages = [...allImageUrls.filter(url => url !== null) as string[]]
                const completed = newImages.length
                
                // 不自动选中，保持按顺序显示
                // 用户可以手动点击查看大图
                
                console.log(`✅ [GENERATE] 场景${i + 1}生成成功，已立即显示！（${completed}/${scenePrompts.length}）`)
                setGenerationMessage(`✅ 已完成 ${completed}/${scenePrompts.length} 个场景`)
                
                return newImages
              })
              
              return { success: true, index: i, imageUrl: result.imageUrl }
            } else {
              console.error(`❌ [GENERATE] 场景${i + 1}生成失败:`, result.error)
              return { success: false, index: i, error: result.error }
            }
          } catch (error) {
            console.error(`❌ [GENERATE] 场景${i + 1}生成异常:`, error)
            return { success: false, index: i, error }
          }
        })
        
        // 等待所有生成完成
        const results = await Promise.allSettled(generationPromises)
        
        console.log('🎨 [GENERATE] 所有场景图片生成完成:', allImageUrls)
        const validImages = allImageUrls.filter(url => url) as string[]
        setGeneratedImages(validImages)
        
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length
        const failedCount = scenePrompts.length - successCount
        
        if (failedCount > 0) {
          setGenerationMessage(`⚠️ 完成！成功${successCount}个，失败${failedCount}个`)
          console.warn(`⚠️ [GENERATE] 部分场景生成失败：${successCount}/${scenePrompts.length}`)
        } else {
          setGenerationMessage(`🎉 完成！成功生成全部${successCount}个场景图片`)
        }

        // 💾 保存生成内容到数据库
        await saveGeneratedContentToDB(scenePrompts, validImages)
        
      } else {
        console.log('🎨 [GENERATE] 单场景提示词，使用原有逻辑')
        const result = await generateImage({ prompt })
        console.log('🎨 [GENERATE] generateImage返回结果:', result)
        
        if (result.success && result.imageUrls) {
          console.log('🎨 [GENERATE] 成功 - 多张图片:', result.imageUrls)
          setGeneratedImages(result.imageUrls)
          setSelectedImageIndex(0)
          setSavedImages(result.savedImages || [])
          setGenerationMessage(result.message || '')
        } else if (result.success && result.imageUrl) {
          console.log('🎨 [GENERATE] 成功 - 单张图片:', result.imageUrl)
          setGeneratedImages([result.imageUrl])
          setSelectedImageIndex(0)
          setSavedImages(result.savedImages || [])
          setGenerationMessage(result.message || '')
        } else {
          console.log('🎨 [GENERATE] 失败:', result.error)
          setError(result.error || '图片生成失败')
        }
      }
    } catch (err) {
      console.error('🎨 [GENERATE] 生图异常:', err)
      setError('生成过程中出现错误')
    } finally {
      setIsGenerating(false)
      setGenerationTime(Date.now() - startTime)
      console.log('🎨 [GENERATE] 生图流程完成，耗时:', Date.now() - startTime, 'ms')
    }
  }

  // 保存生成内容到数据库
  const saveGeneratedContentToDB = async (scenePrompts: string[], imageUrls: string[]) => {
    try {
      console.log('💾 [GENERATE] 开始保存生成内容到数据库...')
      
      // 从sessionStorage获取完整的场景数据
      const storedData = sessionStorage.getItem('chat_data') || sessionStorage.getItem('magazine_generate_data')
      if (!storedData) {
        console.warn('⚠️ [GENERATE] 未找到完整的生成数据，跳过保存')
        console.log('🔍 [GENERATE] 可用的sessionStorage keys:', Object.keys(sessionStorage))
        return
      }

      const contentData = JSON.parse(storedData)
      
      console.log('🔍 [GENERATE] 从sessionStorage获取的数据:', {
        hasInitialPrompt: !!contentData.initialPrompt,
        hasQuestions: !!contentData.questions,
        hasAnswers: !!contentData.answers,
        hasScenes: !!contentData.scenes,
        questionsCount: (contentData.questions || []).length,
        answersCount: (contentData.answers || []).length,
        scenesType: typeof contentData.scenes,
        scenesKeys: contentData.scenes ? Object.keys(contentData.scenes) : []
      })
      
      // 构建images数组
      const images = scenePrompts.map((prompt, index) => ({
        sceneTitle: contentData.scenes?.logicalScenes?.[index]?.title || `Scene ${index + 1}`,
        sceneIndex: index,
        prompt: prompt,
        imageUrl: imageUrls[index] || '',
        localPath: undefined
      }))

      // 调用保存服务
      console.log('💾 [GENERATE] 准备保存的数据:', {
        initialPrompt: contentData.initialPrompt || original || '',
        questionsCount: (contentData.questions || []).length,
        answersCount: (contentData.answers || answers || []).length,
        imagesCount: images.length,
        scenesData: contentData.scenes ? '有场景数据' : '无场景数据'
      })
      
      const result = await saveUserGeneratedContent({
        initialPrompt: contentData.initialPrompt || original || '',
        questions: contentData.questions || [],
        answers: contentData.answers || answers || [],
        scenes: contentData.scenes || {},
        storyNarrative: narrative || contentData.narrative,
        images: images,
        category: 'daily',
        tags: []
      })

      console.log('💾 [GENERATE] 保存结果:', result)

      if (result.success) {
        console.log('✅ [GENERATE] 内容保存成功，ID:', result.contentId)
        // 可以在UI中显示保存成功的提示
        setGenerationMessage(prev => prev + ' | 已保存到历史记录')
      } else {
        console.error('❌ [GENERATE] 内容保存失败:', result.error)
        alert(`保存失败: ${result.error}`)
      }

    } catch (error) {
      console.error('❌ [GENERATE] 保存生成内容异常:', error)
    }
  }

  const handleRegenerate = () => {
    generateImageHandler()
  }

  const handleDownload = (imageIndex?: number) => {
    if (imageIndex !== undefined) {
      // 下载单张图片
      const imageToDownload = generatedImages[imageIndex]
      if (imageToDownload) {
        const link = document.createElement('a')
        link.href = imageToDownload
        link.download = `scene-${imageIndex + 1}-${Date.now()}.jpg`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      }
    } else {
      // 下载所有图片
      generatedImages.forEach((imageUrl, index) => {
        setTimeout(() => {
          const link = document.createElement('a')
          link.href = imageUrl
          link.download = `scene-${index + 1}-${Date.now()}.jpg`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
        }, index * 500) // 延迟下载避免浏览器阻止
      })
    }
  }

  const handleShare = async (imageIndex?: number) => {
    const imageToShare = imageIndex !== undefined ? generatedImages[imageIndex] : generatedImages[0]
    if (imageToShare && typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: 'AI生成的多场景图片',
          text: `基于"${prompt}"生成的${generatedImages.length}张场景图片`,
          url: imageToShare
        })
      } catch (error) {
        console.log('分享失败:', error)
      }
    }
  }

  const handleBack = () => {
    router.back()
  }

  // 获取场景标题
  const getSceneTitle = (index: number): string => {
    // 优先使用新的场景数据
    const storedData = sessionStorage.getItem('chat_data') || sessionStorage.getItem('magazine_generate_data')
    if (storedData) {
      try {
        const data = JSON.parse(storedData)
        if (data.contentResult?.scenes?.logicalScenes) {
          const scene = data.contentResult.scenes.logicalScenes[index]
          if (scene && scene.title) {
            console.log(`📖 [SCENE-${index + 1}] 使用新场景标题:`, scene.title)
            return scene.title
          }
        }
      } catch (error) {
        console.error('❌ [SCENE] 解析场景标题失败:', error)
      }
    }
    
    // 如果有生成的标题，使用生成的标题
    if (sceneTitles.length > index) {
      return sceneTitles[index]
    }
    
    // 标准场景标题
    return `场景${index + 1}`
  }

  // 使用LLM生成场景标题
  const generateSceneTitle = async (sceneContent: string, index: number): Promise<string> => {
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-e3911ff08dae4f4fb59c7b521e2a5415'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的标题生成专家，擅长为生活场景生成有诗意的中文标题。你的任务是根据场景内容生成一个富有诗意的标题，要体现场景的核心情感和氛围。不要使用"回忆起点"、"回忆展开"、"回到现在"、"展望未来"这种概念性标题，而要生成具体的、有诗意的标题。标题长度不限，可以是2个字、3个字、4个字或更多，只要能够准确表达场景的情感和意境即可。请直接返回标题，不要其他解释。'
            },
            {
              role: 'user',
              content: `请为以下场景生成一个有诗意的中文标题：

场景内容：${sceneContent}

要求：
1. 标题要体现场景的核心情感和氛围
2. 富有诗意和美感
3. 与场景内容高度对应
4. 标题长度不限，可以是2个字、3个字、4个字或更多
5. 避免使用概念性词汇，要具体有画面感

请直接返回标题，不要其他解释。`
            }
          ],
          max_tokens: 50,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        throw new Error(`DeepSeek API调用失败: ${response.status}`)
      }

      const data = await response.json()
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const title = data.choices[0].message.content.trim()
        console.log(`✅ [GENERATE] 场景${index + 1}标题生成成功:`, title)
        return title
      } else {
        throw new Error('DeepSeek API返回格式错误')
      }
    } catch (error) {
      console.error(`💥 [GENERATE] 场景${index + 1}标题生成失败:`, error)
      // 如果LLM失败，返回基于内容的简单标题
      return generateFallbackTitle(sceneContent, index)
    }
  }

  // 生成主标题
  const generateMainTitle = async (sceneTitles: string[], scenes: string[]): Promise<string> => {
    try {
      const response = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer sk-e3911ff08dae4f4fb59c7b521e2a5415'
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: '你是一个专业的主标题生成专家，擅长为生活场景系列生成简洁、有诗意、有概括性的中文主标题。你的任务是根据四个场景标题和内容生成一个4-8个字的主标题，要体现整个故事的核心主题和情感。请直接返回标题，不要其他解释。'
            },
            {
              role: 'user',
              content: `请为以下四个场景生成一个简洁、有诗意的主标题（4-8个字）：

场景标题：
1. ${sceneTitles[0] || '场景1'}
2. ${sceneTitles[1] || '场景2'}
3. ${sceneTitles[2] || '场景3'}
4. ${sceneTitles[3] || '场景4'}

场景内容：
1. ${scenes[0] || '场景1内容'}
2. ${scenes[1] || '场景2内容'}
3. ${scenes[2] || '场景3内容'}
4. ${scenes[3] || '场景4内容'}

要求：
1. 主标题要体现整个故事的核心主题和情感
2. 简洁有力，4-8个字
3. 有诗意和美感
4. 能够概括四个场景的整体氛围
5. 与场景内容高度对应

请直接返回主标题，不要其他解释。`
            }
          ],
          max_tokens: 100,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        throw new Error(`DeepSeek API调用失败: ${response.status}`)
      }

      const data = await response.json()
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const title = data.choices[0].message.content.trim()
        console.log('✅ [GENERATE] 主标题生成成功:', title)
        return title
      } else {
        throw new Error('DeepSeek API返回格式错误')
      }
    } catch (error) {
      console.error('💥 [GENERATE] 主标题生成失败:', error)
      // 如果LLM失败，返回备用主标题
      return generateFallbackMainTitle(sceneTitles)
    }
  }

  // 备用主标题生成
  const generateFallbackMainTitle = (sceneTitles: string[]): string => {
    // 基于场景标题生成备用主标题
    const titles = sceneTitles.join('')
    if (titles.includes('回忆') && titles.includes('现在') && titles.includes('未来')) {
      return '时光的印记'
    } else if (titles.includes('回忆')) {
      return '回忆的旋律'
    } else if (titles.includes('现在')) {
      return '当下的美好'
    } else if (titles.includes('未来')) {
      return '未来的憧憬'
    }
    return '生活的片段'
  }

  // 备用标题生成
  const generateFallbackTitle = (sceneContent: string, index: number): string => {
    const content = sceneContent.toLowerCase()
    
    if (content.includes('咖啡') || content.includes('窗外') || content.includes('黄浦江')) {
      return '咖啡时光'
    } else if (content.includes('实验室') || content.includes('代码') || content.includes('算法')) {
      return '深夜思考'
    } else if (content.includes('素描') || content.includes('服装') || content.includes('设计')) {
      return '创意灵感'
    } else if (content.includes('雨夜') || content.includes('白板') || content.includes('模型')) {
      return '雨夜思绪'
    } else if (content.includes('男友') || content.includes('伴侣') || content.includes('默契')) {
      return '温馨相遇'
    } else if (content.includes('风铃') || content.includes('门推开') || content.includes('原型')) {
      return '风铃轻响'
    }
    
    return `场景${index + 1}`
  }

  // 分割完整故事为场景片段
  const splitStoryIntoScenes = (fullStory: string): string[] => {
    if (!fullStory) return []
    
    // 尝试按段落分割
    const paragraphs = fullStory.split('\n\n').filter(p => p.trim().length > 0)
    
    if (paragraphs.length >= 4) {
      // 如果有4个或更多段落，直接使用
      return paragraphs.slice(0, 4)
    } else if (paragraphs.length >= 2) {
      // 如果段落较少，尝试按句子分割
      const allSentences = fullStory.split(/[。！？]/).filter(s => s.trim().length > 10)
      const sentencesPerScene = Math.ceil(allSentences.length / 4)
      const scenes = []
      
      for (let i = 0; i < 4; i++) {
        const startIndex = i * sentencesPerScene
        const endIndex = Math.min((i + 1) * sentencesPerScene, allSentences.length)
        const sceneSentences = allSentences.slice(startIndex, endIndex)
        scenes.push(sceneSentences.join('。') + (sceneSentences.length > 0 ? '。' : ''))
      }
      return scenes
    } else {
      // 如果只有一个段落，尝试按句号分割
      const sentences = fullStory.split(/[。！？]/).filter(s => s.trim().length > 10)
      const sentencesPerScene = Math.ceil(sentences.length / 4)
      const scenes = []
      
      for (let i = 0; i < 4; i++) {
        const startIndex = i * sentencesPerScene
        const endIndex = Math.min((i + 1) * sentencesPerScene, sentences.length)
        const sceneSentences = sentences.slice(startIndex, endIndex)
        scenes.push(sceneSentences.join('。') + (sceneSentences.length > 0 ? '。' : ''))
      }
      return scenes
    }
  }

  // 获取场景描述
  const getSceneDescription = (index: number): string => {
    // 优先使用新的场景数据
    const storedData = sessionStorage.getItem('chat_data') || sessionStorage.getItem('magazine_generate_data')
    if (storedData) {
      try {
        const data = JSON.parse(storedData)
        if (data.contentResult?.scenes?.logicalScenes) {
          const scene = data.contentResult.scenes.logicalScenes[index]
          if (scene && scene.description) {
            console.log(`📖 [SCENE-${index + 1}] 使用新场景描述:`, scene.description)
            return scene.description
          }
        }
      } catch (error) {
        console.error('❌ [SCENE] 解析场景数据失败:', error)
      }
    }
    
    // 回退到旧数据结构
    if (fourScenes) {
      const scenes = [fourScenes.scene1, fourScenes.scene2, fourScenes.scene3, fourScenes.scene4]
      const sceneContent = scenes[index]
      if (sceneContent) {
        return simplifySceneDescription(sceneContent)
      }
    }
    
    // 最终回退到默认描述
    const defaultDescriptions = [
      '基于您的实际经历生成的场景描述',
      '根据您的问答内容动态生成的场景',
      '结合您个人经历的场景描述',
      '基于您的故事生成的场景内容'
    ]
    return defaultDescriptions[index] || `这是第${index + 1}个场景的精彩描述。`
  }

  // 场景故事归属结果
  const [storyMappings, setStoryMappings] = useState<Array<{
    sceneIndex: number
    sceneTitle: string
    storyFragment: string
    confidence: number
    keywords: string[]
  }>>([])
  
  // 智能归属加载状态
  const [isStoryMappingLoading, setIsStoryMappingLoading] = useState(false)
  
  // 杂志封面相关状态
  const [magazineCover, setMagazineCover] = useState<any>(null)
  const [isGeneratingCover, setIsGeneratingCover] = useState(false)
  const [showCover, setShowCover] = useState(false)

  // 生成杂志封面
  const handleGenerateCover = async () => {
    console.log('📰 [GENERATE] 开始生成杂志封面')
    setIsGeneratingCover(true)
    
    try {
      // 从sessionStorage获取完整数据
      const storedData = sessionStorage.getItem('chat_data')
      if (!storedData) {
        throw new Error('未找到生成数据')
      }
      
      const data = JSON.parse(storedData)
      
      // 调用后端API生成封面
      const response = await fetch('/api/generate-magazine-cover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          initialPrompt: data.original || data.initialPrompt,
          answers: data.answers || [],
          scenes: data.contentResult?.scenes,
          story: data.contentResult?.story
        })
      })
      
      if (!response.ok) {
        throw new Error('封面生成失败')
      }
      
      const coverData = await response.json()
      console.log('✅ [GENERATE] 杂志封面生成成功:', coverData)
      
      setMagazineCover(coverData.cover)
      setShowCover(true)
      
    } catch (error) {
      console.error('❌ [GENERATE] 封面生成失败:', error)
      alert('封面生成失败，请重试')
    } finally {
      setIsGeneratingCover(false)
    }
  }

  // 获取场景对应的故事片段（使用智能归属）
  const getSceneStoryFragment = (index: number): string => {
    console.log(`🔍 [SCENE-${index + 1}] 当前storyMappings状态:`, storyMappings)
    
    const mapping = storyMappings.find(m => m.sceneIndex === index)
    if (mapping && mapping.storyFragment) {
      console.log(`📖 [SCENE-${index + 1}] 使用智能归属故事片段:`, mapping.storyFragment.substring(0, 50) + '...')
      return mapping.storyFragment
    }
    
    console.log(`⚠️ [SCENE-${index + 1}] 未找到智能归属，使用回退方案`)
    // 回退到简单分割
    if (!narrative) return ''
    const storyFragments = splitStoryIntoScenes(narrative)
    return storyFragments[index] || ''
  }

  // 精简场景描述 - 移除视觉元素，保留内心感受和场景描述
  const simplifySceneDescription = (sceneContent: string): string => {
    // 移除图片能展示的视觉元素，保留内心感受、思考过程和基本场景描述
    let simplified = sceneContent
    
    // 移除过于详细的视觉描述，保留基本场景和内心感受
    simplified = simplified.replace(/这个瞬间让你想起两年前——那时你还在科技园的实验室里调试代码，屏幕的蓝光映着你专注的眉眼，而窗外是凌晨三点的寂静。你总在完成一个算法模块后，独自走到天台，看城市边缘泛起的晨光。那种孤独的清醒像一种仪式，让你在机械的逻辑与朦胧的灵感之间，找到属于自己的一方天地。/g, '这个瞬间让你想起两年前在科技园实验室里调试代码的夜晚。你总在完成算法模块后，独自走到天台看城市边缘泛起的晨光。那种孤独的清醒像一种仪式，让你在机械的逻辑与朦胧的灵感之间，找到属于自己的一方天地。')
    
    simplified = simplified.replace(/那时你尚未遇见现在的伴侣，但已在潜意识里构建一种关系模式：既要彼此独立的思考空间，又渴望在深夜讨论时能碰撞出火花的默契。你习惯先沉默地观察，再突然提出一个颠覆性的角度，如同水墨画中刻意留白的意境。/g, '那时你尚未遇见现在的伴侣，但已在潜意识里构建一种关系模式：既要彼此独立的思考空间，又渴望在深夜讨论时能碰撞出火花的默契。你习惯先沉默地观察，再突然提出颠覆性的角度，如同水墨画中刻意留白的意境。')
    
    simplified = simplified.replace(/你伸手替他整理，指尖掠过棉麻的粗粝触感，同时轻声说："第三页的交互逻辑需要更柔软的过渡，就像这件衬衫的剪裁，技术不该是冰冷的框架。"他挑眉笑了，递给你一杯新的热可可："你总是能用'感受'解构我的代码。"你们开始低声讨论AI如何理解人类对美的渴望，窗外的暮色渐浓，台灯暖光笼罩着你们交叠的笔记本，页角贴着你手绘的服装草图，旁边是他密密麻麻的注释。/g, '你轻声说："第三页的交互逻辑需要更柔软的过渡，技术不该是冰冷的框架。"他笑着说："你总是能用感受解构我的代码。"你们开始讨论AI如何理解人类对美的渴望，台灯暖光笼罩着你们交叠的笔记本，页角贴着你手绘的服装草图。')
    
    simplified = simplified.replace(/你望向江对岸的陆家嘴，霓虹灯已连成一片银河。你想像明年此时，你们的工作室会搬进那座玻璃幕墙大厦的中层，晨间会议时阳光会穿过百叶窗，在你设计的智能织物上投下斑驳光影。/g, '你望向江对岸的陆家嘴，想象明年此时，你们的工作室会搬进那座玻璃幕墙大厦，晨间会议时阳光会穿过百叶窗，在你设计的智能织物上投下斑驳光影。')
    
    simplified = simplified.replace(/你计划在产品发布会那天，穿一件你自己参与设计的暗纹旗袍——用纳米材料编织出若隐若现的电路图脉络，领口别一枚白玉扣子。那时你们创造的"新物种"或许正悄然改变着人们触摸世界的方式，而你会站在台下安静微笑，如同多年前在天台看日出时那样，在喧嚣中守护自己独立思考的岛屿。夜风拂过你的长发，你轻轻按住被吹起的图纸，那上面不仅有算法架构，还有你用钢笔细细描画的一枝春桃——这是独属于你的，理性与诗意的共生语言。/g, '你计划穿一件自己参与设计的暗纹旗袍。那时你们创造的"新物种"会悄然改变人们触摸世界的方式，而你会安静微笑，如同多年前在天台看日出时那样，在喧嚣中守护自己独立思考的岛屿。这是独属于你的，理性与诗意的共生语言。')
    
    // 保留基本场景描述，只移除过于详细的视觉元素
    simplified = simplified.replace(/此刻，你坐在上海外滩边一家咖啡馆的落地窗前，指尖轻触温热的陶瓷杯壁，窗外黄浦江的游船缓缓驶过，霓虹倒映在水面碎成流动的光斑。/g, '此刻，你坐在外滩边一家咖啡馆的落地窗前，窗外黄浦江的游船缓缓驶过，霓虹倒映在水面碎成流动的光斑。')
    
    simplified = simplified.replace(/你记得某个雨夜，你裹着米白色的羊绒开衫，在实验室的白板上画下第一个"技术与人"的交集模型——线条干净利落，像你偏爱的极简主义设计，却藏着层层叠叠的隐喻。/g, '你记得某个雨夜，在实验室的白板上画下第一个"技术与人"的交集模型——线条干净利落，像你偏爱的极简主义设计，却藏着层层叠叠的隐喻。')
    
    simplified = simplified.replace(/此刻，咖啡馆的木门被推开，风铃轻响——你的男友带着刚修改的产品原型走来。他自然地坐在你对面，平板电脑上流动的数据映在他镜片上，而你的目光落在他袖口一道未修剪的线头上。/g, '咖啡馆的门被推开，风铃轻响——你的男友带着产品原型走来。他自然地坐在你对面，平板电脑上流动着数据。')
    
    // 移除深度分析注释
    simplified = simplified.replace(/\*注：本叙事基于用户命理特质[\s\S]*?\*\./g, '')
    simplified = simplified.replace(/注：本叙事基于用户命理特质[\s\S]*?技术天赋。*/g, '')
    simplified = simplified.replace(/---[\s\S]*?技术天赋。*/g, '')
    
    return simplified
  }

  // 用户信息组件
  const UserProfileInfo = () => {
    // 注意：这是一个同步组件，但API是异步的
    // 需要改成 useEffect + useState 模式
    const [userInfoDescription, setUserInfoDescription] = useState('')
    const [userMetadata, setUserMetadata] = useState<any>(null)
    
    useEffect(() => {
      (async () => {
        const desc = await getUserDescription()
        const meta = await getUserMetadata()
        setUserInfoDescription(desc)
        setUserMetadata(meta)
      })()
    }, [])
    
    // 检查是否有用户信息
    const hasUserInfo = userInfoDescription && userInfoDescription.trim() !== ''
    const hasMetadata = userMetadata && (
      userMetadata.corePersonalityTraits?.length > 0 ||
      userMetadata.communicationStyle?.length > 0 ||
      userMetadata.emotionalPattern?.length > 0
    )
    
    if (!hasUserInfo && !hasMetadata) {
      return null
    }
    
    return (
      <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <h3 className="text-sm font-semibold text-blue-800 mb-2">📋 您的画像分析</h3>
        <div className="text-sm text-blue-700 space-y-2">
          {hasUserInfo && (
            <div className="flex items-start space-x-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></span>
              <span>{userInfoDescription}</span>
            </div>
          )}
          
          {hasMetadata && (
            <div className="mt-3 space-y-1">
              {userMetadata.corePersonalityTraits?.length > 0 && (
                <div>
                  <span className="font-medium text-blue-800">核心特质：</span>
                  <span>{userMetadata.corePersonalityTraits.slice(0, 3).join('、')}</span>
                  {userMetadata.corePersonalityTraits.length > 3 && <span>等</span>}
                </div>
              )}
              
              {userMetadata.communicationStyle?.length > 0 && userMetadata.communicationStyle[0] !== '待分析' && (
                <div>
                  <span className="font-medium text-blue-800">沟通风格：</span>
                  <span>{userMetadata.communicationStyle.slice(0, 2).join('、')}</span>
                </div>
              )}
              
              {userMetadata.emotionalPattern?.length > 0 && userMetadata.emotionalPattern[0] !== '待分析' && (
                <div>
                  <span className="font-medium text-blue-800">情感模式：</span>
                  <span>{userMetadata.emotionalPattern.slice(0, 2).join('、')}</span>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="mt-2 text-xs text-blue-600">
          基于您的性格特征，为您生成了专属的图片内容
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="flex items-center justify-between p-4 bg-white border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="font-handwriting text-xl text-magazine-purple">
            logo
          </div>
          <button
            onClick={handleBack}
            className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm">返回</span>
          </button>
        </div>
        <h1 className="text-lg font-semibold text-gray-900">AI图片生成</h1>
        <div className="w-20"></div>
      </header>

        {/* Main Content */}
        <main className="max-w-2xl mx-auto p-4">
          {/* User Profile Info - 用户信息显示 */}
          <UserProfileInfo />
          
          {/* Magazine Title Display */}
          {(mainTitle || title) && (
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-6 mb-4 text-white shadow-lg">
              <h1 className="text-xl font-bold mb-2 text-center">{mainTitle || title}</h1>
              {subtitle && (
                <p className="text-sm text-purple-100 text-center">{subtitle}</p>
              )}
            </div>
          )}
          
          {/* Prompt Display */}
          {prompt && (
            <div className="bg-white rounded-lg p-4 mb-4 shadow-sm">
              <h2 className="text-sm font-medium text-gray-500 mb-2">生成提示词</h2>
              <p className="text-gray-900">"{prompt}"</p>
            </div>
          )}

        {/* Debug Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6">
          <div className="text-sm font-medium text-gray-700 mb-2">🔧 调试信息</div>
          <div className="text-xs text-gray-600 space-y-1">
            <div>提示词: {prompt}</div>
            <div>生成状态: {isGenerating ? '生成中...' : '已完成'}</div>
            <div>图片数量: {generatedImages.length}</div>
            <div>错误信息: {error || '无'}</div>
            <div>生成时间: {generationTime}ms</div>
            <div>图片URLs: {JSON.stringify(generatedImages)}</div>
          </div>
        </div>

        {/* Generation Area */}
        <div className="image-gallery bg-white rounded-lg shadow-sm overflow-hidden">
          {isGenerating && generatedImages.filter(img => img).length === 0 ? (
            // 初始loading界面：还没有任何图片完成
            <div className="aspect-square flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">
                  {generationMessage || '🚀 并行生成中...'}
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  多张图片同时生成，完成后立即显示
                </p>
              </div>
            </div>
          ) : error && generatedImages.length === 0 ? (
            <div className="aspect-square flex items-center justify-center bg-red-50">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-red-600 text-2xl">⚠️</span>
                </div>
                <p className="text-red-600 font-medium">生成失败</p>
                <p className="text-sm text-red-500 mt-1">{error}</p>
                <button
                  onClick={handleRegenerate}
                  className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  重试
                </button>
              </div>
            </div>
          ) : generatedImages.length > 0 ? (
            <div className="relative">
              {/* 生成进度提示条 */}
              {isGenerating && (
                <div className="sticky top-0 z-10 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-3 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span className="font-medium">
                        {generationMessage || '并行生成中...'}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm opacity-90">
                        {generatedImages.filter(img => img).length} / {generatedImages.length} 完成
                      </span>
                      <div className="flex space-x-1">
                        {generatedImages.map((img, idx) => (
                          <div 
                            key={idx} 
                            className={`w-2 h-2 rounded-full ${img ? 'bg-green-300' : 'bg-white/40'}`}
                            title={`场景${idx + 1}${img ? '已完成' : '生成中'}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* 上下四个排列的卡片设计 */}
              <div className="space-y-6">
                {generatedImages.map((imageUrl, index) => {
                  const sceneTitle = getSceneTitle(index)
                  const sceneDescription = getSceneDescription(index)
                  const storyFragment = getSceneStoryFragment(index)
                  
                  return (
                    <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-100">
                      {/* 场景标题 */}
                      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800">{sceneTitle}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          场景 {index + 1} - 对应故事中的关键时刻
                        </p>
                      </div>
                      
                      {/* 场景图片 */}
                      <div className="relative aspect-[4/3] overflow-hidden">
                        {imageUrl ? (
                          <>
                            <Image
                              src={imageUrl}
                              alt={`场景${index + 1}：${sceneTitle}`}
                              fill
                              className="object-cover"
                              sizes="(max-width: 768px) 100vw, 50vw"
                              quality={100}
                              priority={index === 0}
                              unoptimized={true}
                            />
                            {/* 点击查看大图 */}
                            <button
                              onClick={() => setSelectedImageIndex(index)}
                              className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors"
                            />
                          </>
                        ) : (
                          // 图片还在生成中
                          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 animate-pulse">
                            <div className="text-center">
                              <div className="w-12 h-12 border-4 border-gray-300 border-t-purple-600 rounded-full animate-spin mx-auto mb-3"></div>
                              <p className="text-gray-600 text-sm font-medium">场景 {index + 1} 生成中...</p>
                              <p className="text-gray-400 text-xs mt-1">并行处理中，请稍候</p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {/* 场景描述 */}
                      <div className="p-4 bg-white">
                        <p className="text-gray-700 leading-relaxed text-sm">
                          {sceneDescription}
                        </p>
                      </div>
                      
                      {/* 场景对应的故事片段 */}
                      {storyFragment && (
                        <div className="px-4 py-3 bg-purple-50 border-t border-gray-200">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-medium text-purple-800 flex items-center">
                              <span className="mr-1">📖</span>
                              故事片段
                              {isStoryMappingLoading && (
                                <span className="ml-2 text-xs text-purple-500">(智能归属中...)</span>
                              )}
                            </h4>
                            {(() => {
                              const mapping = storyMappings.find(m => m.sceneIndex === index)
                              if (mapping) {
                                return (
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-purple-600">
                                      匹配度: {(mapping.confidence * 100).toFixed(0)}%
                                    </span>
                                    {mapping.keywords.length > 0 && (
                                      <span className="text-xs text-purple-500">
                                        关键词: {mapping.keywords.slice(0, 2).join(', ')}
                                      </span>
                                    )}
                                  </div>
                                )
                              }
                              return null
                            })()}
                          </div>
                          <p className="text-sm text-purple-700 leading-relaxed">
                            {storyFragment}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              
              {/* 大图查看模态 */}
              {selectedImageIndex !== null && (
                <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={() => setSelectedImageIndex(null)}>
                  <div className="relative max-w-4xl max-h-full" onClick={(e) => e.stopPropagation()}>
                    <Image
                      src={generatedImages[selectedImageIndex]}
                      alt={`大图查看：场景${selectedImageIndex + 1}`}
                      width={1024}
                      height={1024}
                      className="object-contain max-h-[80vh] rounded-lg"
                      quality={100}
                      unoptimized={true}
                    />
                    <button
                      onClick={() => setSelectedImageIndex(null)}
                      className="absolute top-4 right-4 bg-white/90 hover:bg-white text-black w-8 h-8 rounded-full flex items-center justify-center"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
              
              {/* Generation Info */}
              <div className="p-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                  <span>生成时间: {generationTime}ms</span>
                  <span>共 {generatedImages.length} 张图片</span>
                </div>
                
                {/* Action Buttons */}
                <div className="space-y-3">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleDownload()}
                      className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>下载全部</span>
                    </button>
                    
                    <button
                      onClick={() => handleShare()}
                      className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>分享</span>
                    </button>
                    
                    <button
                      onClick={handleRegenerate}
                      className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>重新生成</span>
                    </button>
                  </div>
                  
                  {/* 生成杂志封面按钮 */}
                  {!magazineCover && (
                    <button
                      onClick={handleGenerateCover}
                      disabled={isGeneratingCover}
                      className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white rounded-lg hover:from-pink-600 hover:to-purple-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isGeneratingCover ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>正在生成封面...</span>
                        </>
                      ) : (
                        <>
                          <span className="text-lg">📰</span>
                          <span className="font-medium">生成杂志封面</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="aspect-square flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-gray-600 text-2xl">🎨</span>
                </div>
                <p className="text-gray-600 font-medium">等待生成</p>
                <p className="text-sm text-gray-400 mt-1">准备生成图片...</p>
              </div>
            </div>
          )}
        </div>


        {/* Magazine Cover Display */}
        {magazineCover && showCover && (
          <div className="mt-6 bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg p-6 shadow-lg border-2 border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-purple-600">
                📰 杂志封面
              </h2>
              <button
                onClick={() => setShowCover(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md">
              {/* 封面标题 */}
              <div className="text-center mb-6 space-y-3">
                <h1 className="text-4xl font-bold text-gray-900 mb-2">
                  {magazineCover.mainTitle}
                </h1>
                <p className="text-lg text-gray-600 italic">
                  {magazineCover.subtitle}
                </p>
                <div className="h-1 w-24 bg-gradient-to-r from-pink-500 to-purple-600 mx-auto rounded-full"></div>
              </div>
              
              {/* 封面信息 */}
              <div className="space-y-4 text-sm">
                {/* 核心冲突 */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-800 mb-2">核心冲突</h3>
                  <p className="text-gray-700 leading-relaxed">{magazineCover.coreConflict}</p>
                  <div className="mt-2 flex items-center">
                    <span className="text-xs text-purple-600">冲突强度:</span>
                    <div className="flex-1 ml-2 bg-purple-200 rounded-full h-2">
                      <div 
                        className="bg-purple-600 h-2 rounded-full transition-all" 
                        style={{ width: `${(magazineCover.conflictIntensity || 5) * 10}%` }}
                      ></div>
                    </div>
                    <span className="ml-2 text-xs text-purple-600">{magazineCover.conflictIntensity || 5}/10</span>
                  </div>
                </div>
                
                {/* 关键地点 */}
                {magazineCover.keyLocation && (
                  <div className="bg-pink-50 rounded-lg p-4">
                    <h3 className="font-semibold text-pink-800 mb-2">📍 关键地点</h3>
                    <p className="text-gray-700">{magazineCover.keyLocation}</p>
                  </div>
                )}
                
                {/* 其他人物 */}
                {magazineCover.otherCharacters && magazineCover.otherCharacters.length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-semibold text-blue-800 mb-2">👥 其他人物</h3>
                    <ul className="space-y-1">
                      {magazineCover.otherCharacters.map((char: string, idx: number) => (
                        <li key={idx} className="text-gray-700 text-sm">• {char}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* 心理元素 */}
                {magazineCover.psychologicalElements && magazineCover.psychologicalElements.length > 0 && (
                  <div className="bg-indigo-50 rounded-lg p-4">
                    <h3 className="font-semibold text-indigo-800 mb-2">🧠 心理元素</h3>
                    <ul className="space-y-1">
                      {magazineCover.psychologicalElements.map((elem: string, idx: number) => (
                        <li key={idx} className="text-gray-700 text-sm">• {elem}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* 设计方案 */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">封面风格</div>
                    <div className="text-gray-800 font-medium">{magazineCover.coverStyle}</div>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">字体风格</div>
                    <div className="text-gray-800 font-medium">{magazineCover.typography}</div>
                  </div>
                </div>
                
                {/* 配色方案 */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-800 mb-2">🎨 配色方案</h3>
                  <p className="text-gray-700 text-sm">{magazineCover.colorScheme}</p>
                </div>
                
                {/* 封面图片描述 */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-800 mb-2">📸 封面图片描述</h3>
                  <p className="text-gray-700 text-sm leading-relaxed">{magazineCover.coverImageDescription_CN}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Additional Suggestions */}
        {generatedImages.length > 0 && (
          <div className="mt-6 bg-white rounded-lg p-4 shadow-sm">
            <h3 className="font-medium text-gray-900 mb-3">相关建议</h3>
            <div className="space-y-2">
              <button
                onClick={() => router.push(`/chat?prompt=${encodeURIComponent('类似风格的更多图片')}`)}
                className="w-full text-left p-3 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors"
              >
                🎨 生成类似风格的图片
              </button>
              <button
                onClick={() => router.push(`/chat?prompt=${encodeURIComponent('不同角度的图片')}`)}
                className="w-full text-left p-3 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
              >
                📐 生成不同角度的图片
              </button>
              <button
                onClick={() => router.push(`/chat?prompt=${encodeURIComponent('不同配色的图片')}`)}
                className="w-full text-left p-3 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
              >
                🎨 生成不同配色的图片
              </button>
            </div>
          </div>
        )}
      </main>
      
      {/* 输入框 */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
        <div className="max-w-md mx-auto flex items-center space-x-3">
          <input
            type="text"
            placeholder="输入您的需求..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={() => router.push('/chat-new')}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  )
}