'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Send, Loader2, X, Menu, History } from 'lucide-react'
import { generateDeepQuestions } from '@/lib/doubaoService'
import { getUserInfoDescription, getUserMetadata, isUserMetadataComplete, getUserInfo, generateUserReport, getLatestUserReport, saveChatToMemobase, getEnhancedUserContext } from '@/lib/userInfoService'
import { updateUserMetadata } from '@/lib/userDataApi'
import { UserMetadataAnalyzer } from '@/lib/userMetadataService'
import { ContentGenerationService } from '@/lib/contentGenerationService'
import { detectEmotionsWithLLM, translateEmotionsToEnglish } from '@/lib/emotionDetectionService'
import UserInfoBar from '@/components/UserInfoBar'
import ChatHistorySidebar from '@/components/ChatHistorySidebar'

interface ChatMessage {
  id: string
  type: 'user' | 'assistant' | 'system' | 'image' | 'story'
  content: string
  imageUrl?: string
  sceneData?: any
  story?: string  // 故事内容（并行生成）
  sceneIndex?: number  // 场景索引（用于更新）
}

interface ChatSession {
  sessionId: string
  title: string
  messages: ChatMessage[]
  initialPrompt: string
  answers: string[]
  questions: string[]
  createdAt: string
  updatedAt: string
}

export default function ChatNewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlPrompt = searchParams.get('prompt') || ''
  const continueId = searchParams.get('continue') || '' // 继续对话的ID
  
  const [initialPrompt, setInitialPrompt] = useState(urlPrompt) // 改为可变状态，支持指代词识别
  const [contextHistory, setContextHistory] = useState('') // 历史背景（用于理解上下文，不生成场景）
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [questions, setQuestions] = useState<string[]>([])
  const [answers, setAnswers] = useState<string[]>([])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [step, setStep] = useState<'loading' | 'questions' | 'generating'>('loading')
  const [userProfile, setUserProfile] = useState<string>('')
  const [contextAnalysis, setContextAnalysis] = useState<any>(null)
  const [askedQuestions, setAskedQuestions] = useState<string[]>([])
  const [apiStatus, setApiStatus] = useState<'active' | 'fallback' | 'error'>('active')
  const [sceneNarrative, setSceneNarrative] = useState<string>('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string>(`session_${Date.now()}`)
  const [mainTitle, setMainTitle] = useState<string>('')
  const [generatedImagesCount, setGeneratedImagesCount] = useState(0) // 生图次数计数
  const [isGenerating, setIsGenerating] = useState(false) // 是否正在生成图片
  const MAX_GENERATED_IMAGES = 15 // 最多生成15张图（免费额度）
  
  // 指代词检测：识别用户说的"这个"、"上一个"、"刚才那个"等
  const detectReferenceWords = (text: string): boolean => {
    const referencePatterns = [
      /这个键入/,
      /就这个/,
      /上一个/,
      /刚才那个/,
      /刚刚的/,
      /基于上面/,
      /基于之前/,
      /用刚才/,
      /用上面/
    ]
    return referencePatterns.some(pattern => pattern.test(text))
  }

  // 加载历史对话
  const loadHistoryConversation = async (contentId: string) => {
    try {
      console.log('📚 [CHAT-NEW] 加载历史对话:', contentId)
      setIsLoading(true)
      
      const response = await fetch(`/api/user/generated-content/${contentId}`)
      
      if (!response.ok) {
        throw new Error('加载历史对话失败')
      }
      
      const result = await response.json()
      
      if (result.success && result.content) {
        const content = result.content
        
        // 恢复对话状态
        setInitialPrompt(content.initialPrompt)
        setQuestions(content.questions || [])
        setAnswers(content.answers || [])
        setCurrentQuestionIndex(content.questions?.length || 0)
        
        // 恢复消息历史
        const historyMessages: ChatMessage[] = [
          {
            id: 'user-0',
            type: 'user',
            content: content.initialPrompt
          }
        ]
        
        // 添加问答历史
        if (content.questions && content.questions.length > 0) {
          content.questions.forEach((question: string, index: number) => {
            historyMessages.push({
              id: `assistant-${index}`,
              type: 'assistant',
              content: question
            })
            
            if (content.answers[index]) {
              historyMessages.push({
                id: `user-${index + 1}`,
                type: 'user',
                content: content.answers[index]
              })
            }
          })
        }
        
        setMessages(historyMessages)
        setStep('questions')
        
        console.log('✅ [CHAT-NEW] 历史对话加载成功')
        console.log('📊 [CHAT-NEW] 对话状态:', {
          initialPrompt: content.initialPrompt,
          questionsCount: content.questions?.length || 0,
          answersCount: content.answers?.length || 0
        })
      } else {
        throw new Error(result.error || '历史对话不存在')
      }
    } catch (error) {
      console.error('❌ [CHAT-NEW] 加载历史对话失败:', error)
      alert(`加载历史对话失败: ${error}`)
      router.push('/chat-new')
    } finally {
      setIsLoading(false)
    }
  }

  // 初始化
  useEffect(() => {
    if (urlPrompt || continueId) {
      // 🚨 防止React StrictMode重复执行
      let cancelled = false
      
      // 使用本地变量保存当前输入（避免异步setState问题）
      const currentPrompt = urlPrompt
      
      // 🔄 每次进入都重置对话状态（确保是全新对话）
      console.log('🔄 [CHAT-NEW] 新对话开始，重置所有状态')
      console.log('🔄 [CHAT-NEW] 输入:', currentPrompt)
      console.log('🔄 [CHAT-NEW] 继续对话ID:', continueId)
      
      // 更新initialPrompt
      setInitialPrompt(currentPrompt)
      
      // 重置所有对话状态
      setAnswers([])
      setQuestions([])
      setAskedQuestions([])
      setCurrentQuestionIndex(0)
      setMessages([])
      setStep('loading')
      setIsLoading(false)
      setIsGenerating(false)
      
      console.log('✅ [CHAT-NEW] 对话状态已完全重置')
      
      // 如果是继续对话，加载历史对话
      if (continueId) {
        loadHistoryConversation(continueId)
        return
      }
      
      // ⚠️ 检测是否是追加请求（包含指代词或特定关键词）
      const isAppendRequest = detectReferenceWords(urlPrompt) || 
                             /艺术|心理剧|封面|杂志/.test(urlPrompt)
      
      if (isAppendRequest) {
        console.log('🔍 [CHAT-NEW] 检测到追加请求')
        // 追加请求不是直接生成，而是：
        // 1. 把追加内容合并到initialPrompt
        // 2. 基于新的完整输入重新生成深度问题
        // 3. 判断信息够不够，不够继续问
        console.log('📝 [CHAT-NEW] 追加请求将合并到对话中，继续提问流程')
        // 继续执行正常的提问流程
      }
      
      console.log('🚀 [CHAT-NEW] 开始chat流程，初始提示:', currentPrompt)
      console.log('🚀 [CHAT-NEW] 页面组件已挂载')
      
      // 检查生图次数限制
      if (generatedImagesCount >= MAX_GENERATED_IMAGES) {
        setMessages([{
          id: 'system-limit',
          type: 'system',
          content: `⚠️ 您已生成 ${MAX_GENERATED_IMAGES} 张图片，达到免费额度上限。\n\n如需继续使用，请联系客服开通付费功能。`
        }])
        return
      }
      
      // 添加用户消息
      setMessages([{
        id: 'user-1',
        type: 'user',
        content: currentPrompt
      }])
      console.log('🚀 [CHAT-NEW] 已添加用户消息到状态')
      
      // ❌ 删除冗余的初始输入分析
      // 现在使用 DeepSeekMemorySystem 在对话结束时统一分析
      
      // 开始生成第一个问题
      const timeoutId = setTimeout(async () => {
        // 🚨 如果已取消，直接返回
        if (cancelled) {
          console.log('⚠️ [CHAT-NEW] useEffect已取消，跳过API调用')
          return
        }
        
        try {
          console.log('📝 [CHAT-NEW] 准备调用generateFirstQuestion函数')
          console.log('📝 [CHAT-NEW] 开始生成第一个问题...', currentPrompt)
          
          // 获取用户元数据
          const userMetadata = getUserMetadata()
          console.log('🔍 [CHAT-NEW] 用户元数据状态:', typeof userMetadata)
          
          // 获取用户深度分析数据
          const userInfo = getUserInfo()
          const userInfoDescription = getUserInfoDescription()
          console.log('📊 [CHAT-NEW] 用户深度分析数据:', userInfoDescription)
          
      const firstQuestionText = await generateFirstQuestion()
      console.log('📝 [CHAT-NEW] API响应:', { firstQuestion: firstQuestionText })
      console.log('📝 [CHAT-NEW] firstQuestionText类型:', typeof firstQuestionText)
      console.log('📝 [CHAT-NEW] firstQuestionText长度:', firstQuestionText?.length)
      
      if (firstQuestionText) {
        console.log(`✅ [CHAT-NEW] 生成了第一个问题:`, firstQuestionText)
            
            // 保存第一个问题到状态
        setQuestions([firstQuestionText])
        setAskedQuestions([firstQuestionText])
            
            // 添加第一个问题到消息
            setMessages(prev => [...prev, {
          id: `assistant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'assistant',
          content: firstQuestionText
            }])
            
            setApiStatus('active')
            setStep('questions')
            setCurrentQuestionIndex(0)
            console.log(`✅ [CHAT-NEW] 第一个问题已显示，等待用户回答后动态生成下一个`)
          } else {
            console.log('⚠️ [CHAT-NEW] API未返回问题，用初始输入直接生成')
            setApiStatus('fallback')
            // 使用初始输入直接生成，传入currentPrompt
            generateInChat([currentPrompt], currentPrompt)
          }
          
        } catch (error) {
          console.error('💥 [CHAT-NEW] 生成第一个问题失败:', error)
          
          // API调用失败，使用初始输入直接生成，传入currentPrompt
          console.log('💥 [CHAT-NEW] API调用失败，使用初始输入直接生成')
          generateInChat([currentPrompt], currentPrompt)
        }
      }, 500)
      
      // 🧹 清理函数：防止重复调用
      return () => {
        cancelled = true
        clearTimeout(timeoutId)
        console.log('🧹 [CHAT-NEW] useEffect清理，取消API调用')
      }
    }
  }, [urlPrompt])  // 监听URL变化，而不是initialPrompt状态

  // ❌ 已删除 analyzeUserInputForMetadata 函数 - 冗余的DeepSeek调用
  // 现在使用 DeepSeekMemorySystem.processConversation 在对话结束时统一分析

  // 生成第一个问题
  const generateFirstQuestion = async () => {
    try {
      // 第一个参数：当前输入（首次就是initialPrompt）
      // 第二个参数：元键入（initialPrompt，最重要的）
      // 第三个参数：之前的回答（首次为空）
      // 第四个参数：之前的问题（首次为空）
      const response = await generateDeepQuestions(initialPrompt, initialPrompt, [], [])
      
      if (response.success && response.questions && response.questions.length > 0) {
        console.log(`📋 [CHAT-NEW] API生成了 ${response.questions.length} 个问题:`, response.questions)
        return response.questions[0] // 只返回第一个问题
      }
      
      return null
    } catch (error) {
      console.error('💥 [CHAT-NEW] 生成问题失败:', error)
      return null
    }
  }

  // 保存会话到本地
  const saveSession = async () => {
    try {
      const title = initialPrompt.slice(0, 50) + (initialPrompt.length > 50 ? '...' : '')
      
      await fetch('/api/chat-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sessionId: currentSessionId,
          title,
          messages,
          initialPrompt,
          answers,
          questions
        })
      })
      
      console.log('✅ [CHAT-NEW] 会话已保存')
    } catch (error) {
      console.error('❌ [CHAT-NEW] 保存会话失败:', error)
    }
  }

  // 自动保存会话（当消息变化时）
  useEffect(() => {
    if (messages.length > 0) {
      const timer = setTimeout(() => {
        saveSession()
      }, 1000) // 延迟1秒保存，避免频繁保存
      
      return () => clearTimeout(timer)
    }
  }, [messages, answers])

  // 处理用户输入（智能区分回答问题 vs 新想法）
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userInput = inputValue.trim()
    console.log('💬 [CHAT-NEW] 用户输入:', userInput)
    
    // 检测"直接生图"指令（精确匹配，避免误触发）
    const directGenerateKeywords = ['直接生图', '生图', '开始生成', '马上生成', '立即生成', '跳过问答']
    const isDirectGenerateCommand = directGenerateKeywords.some(keyword => 
      userInput === keyword || // 完全匹配
      (userInput.length <= 10 && userInput.includes(keyword)) // 短句包含关键词
    )
    
    if (isDirectGenerateCommand) {
      console.log('🚀 [CHAT-NEW] 检测到直接生图指令，跳过问答直接生成')
      setInputValue('')
      setIsLoading(true)
      
      // 使用已有的answers直接生成，不把"直接生图"加到answers里
      generateInChat(answers)
      return
    }
    
    // 🔍 简单判断：AI是否问了问题
    const hasActiveQuestion = questions.length > currentQuestionIndex
    
    // === 路径1：新键入（AI没问问题，用户主动说） ===
    if (!hasActiveQuestion) {
      console.log('💡 [CHAT-NEW] AI没问问题，识别为新键入')
      
      // 如果之前有initialPrompt（说明是第二轮对话），历史已经在生成完成时保存了
      // 这里只需要设置新的initialPrompt
      setInitialPrompt(userInput)
      
      // 重置answers（新一轮对话开始）
      setAnswers([])
      
      console.log('📊 [CHAT-NEW] 新键入:', userInput)
      console.log('📊 [CHAT-NEW] 历史背景:', contextHistory || '无')
    
    // 添加用户消息
    setMessages(prev => [...prev, {
        id: `user-new-${Date.now()}`,
        type: 'user',
        content: `💡 ${userInput}`
      }])
      
      setInputValue('')
      setIsLoading(true)
      
      // 基于新想法生成问题（带上下文）
      setMessages(prev => [...prev, {
        id: 'assistant-thinking',
        type: 'assistant',
        content: '正在分析...'
      }])
      
      setTimeout(async () => {
        try {
          // 新键入时answers已清空（第309行），只传历史背景
          const contextForQuestion = contextHistory ? [contextHistory] : []
          const response = await generateDeepQuestions(userInput, userInput, contextForQuestion, questions)
          
          if (response.success && response.questions && response.questions.length > 0) {
            const newQuestion = response.questions[0]
            console.log(`✅ [CHAT-NEW] 生成问题: ${newQuestion}`)
            
            setQuestions(prev => [...prev, newQuestion])
            setMessages(prev => prev.filter(m => m.id !== 'assistant-thinking').concat([{
              id: `question-${Date.now()}`,
              type: 'assistant',
              content: newQuestion
            }]))
            setIsLoading(false)
          } else {
            // 信息足够，开始生图
            console.log('✅ [CHAT-NEW] 信息足够，直接生成')
            setMessages(prev => prev.filter(m => m.id !== 'assistant-thinking'))
            generateInChat([userInput])
          }
        } catch (error) {
          console.error('❌ [CHAT-NEW] 生成问题失败:', error)
          setMessages(prev => prev.filter(m => m.id !== 'assistant-thinking'))
          setIsLoading(false)
        }
      }, 500)
      
      return  // 新键入流程结束
    }
    
    // === 路径2：回答问题 ===
      console.log('💬 [CHAT-NEW] AI问了问题，识别为回答')
    const userAnswer = userInput
    
    // 添加用户消息
    setMessages(prev => [...prev, {
      id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'user',
      content: userAnswer
    }])
    
    // 添加到答案列表
    const newAnswers = [...answers, userAnswer]
    setAnswers(newAnswers)
    setInputValue('')
    setIsLoading(true)
    
    // 保存到Memobase
    saveChatToMemobase([
      { role: 'user', content: userAnswer },
      { role: 'assistant', content: questions[currentQuestionIndex] }
    ]).catch(error => {
      console.error('❌ [CHAT-NEW] 保存到Memobase失败:', error)
    })
    
    // ❌ 删除：每次回答都分析（太慢）
    // ✅ 改为：生成完成后统一分析整个对话（见generateInChat函数最后）
    
    // 显示处理中的消息
    setMessages(prev => [...prev, {
      id: `assistant-processing-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'assistant',
      content: '正在分析您的回答，准备下一个问题...'
    }])
    
    // 动态生成下一个问题或跳转到生图
    setTimeout(async () => {
      try {
        // 对话过程中不再计数（生图时才计数）
        console.log(`🔍 [CHAT-NEW] 当前问题索引: ${currentQuestionIndex}, 问题总数: ${questions.length}`)
        console.log(`📝 [CHAT-NEW] 当前所有回答:`, newAnswers)
        
        // 基于当前所有回答，让AI动态判断是否需要继续提问
        // ⚠️ 传递完整对话历史：questions + answers
        const response = await generateDeepQuestions(initialPrompt, initialPrompt, newAnswers, questions)
        
        if (response.success && response.questions && response.questions.length > 0) {
          // 生成新问题成功
          const nextQuestion = response.questions[0] // 取第一个问题
          console.log(`✅ [CHAT-NEW] 动态生成新问题: ${nextQuestion}`)
          
          // 更新问题索引
          setCurrentQuestionIndex(prev => prev + 1)
          
          // 移除处理中消息，添加新问题
          setMessages(prev => prev.filter(msg => !msg.id.includes('assistant-processing')).concat([{
            id: `question-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'assistant',
            content: nextQuestion
          }]))
          
        } else if (response.success && response.questions && response.questions.length === 0) {
          // AI返回空数组，表示信息已收集完毕，开始生成
          console.log('✅ [CHAT-NEW] AI判断信息已收集完毕，开始在对话框中生成内容')
          console.log(`📊 [CHAT-NEW] 已收集 ${newAnswers.length} 个回答`)
          console.log('📋 [CHAT-NEW] 所有回答:', newAnswers)
          
          // 移除"正在分析"的消息
          setMessages(prev => prev.filter(m => !m.id.includes('assistant-processing')))
          
          // 保存answers并开始生成
          setAnswers(newAnswers)
          generateInChat(newAnswers)
          setIsLoading(false)
          return
        } else {
          // 生成问题失败，开始生成
          console.log('⚠️ [CHAT-NEW] 生成问题失败或API异常，开始在对话框中生成内容')
          console.log(`📊 [CHAT-NEW] 已收集 ${newAnswers.length} 个回答`)
          
          // 移除"正在分析"的消息
          setMessages(prev => prev.filter(m => !m.id.includes('assistant-processing')))
          
          // 保存answers并开始生成
          setAnswers(newAnswers)
          generateInChat(newAnswers)
          setIsLoading(false)
          return
        }
      } catch (error) {
        console.error(`💥 [CHAT-NEW] 动态生成问题失败:`, error)
        // 如果出错，开始生成内容
        setMessages(prev => prev.filter(m => !m.id.includes('assistant-processing')))
        generateInChat(newAnswers)
      } finally {
        setIsLoading(false)
      }
    }, 800)
  }

  // 生成下一个问题
  const generateNextQuestion = async (allAnswers: string[]) => {
    try {
      // 这里可以添加更智能的问题生成逻辑
      // 暂时返回null，直接跳转到生图
      return null
    } catch (error) {
      console.error('💥 [CHAT-NEW] 生成下一个问题失败:', error)
      return null
    }
  }

  // 生成用户简介报告
  const generateUserProfile = async () => {
    try {
      // 准备对话历史（从messages中提取）
      const conversationHistory = messages.map(m => `${m.type}: ${m.content}`)
      
      const userReport = await generateUserReport(conversationHistory, answers, initialPrompt)
      console.log('📊 [CHAT-NEW] 用户简介报告:', userReport)
      setUserProfile(userReport.conversationSummary || '')
      setContextAnalysis(userReport)
      
      console.log('💡 建议:', userReport.recommendations)
      console.log('🎯 关键话题:', userReport.keyTopics)
      console.log('📊 情绪趋势:', userReport.moodTrends)
      console.log('🔢 对话次数:', userReport.conversationCount)
      console.log('⏱️ 总对话时间:', userReport.totalConversationTime)
    } catch (error) {
      console.error('💥 [CHAT-NEW] 生成用户简介报告失败:', error)
    }
  }

  // 两阶段场景生成：先基于核心输入生成基础故事，再根据元数据扩写
  const generateLogicalScenes = async () => {
    console.log('🎯 [CHAT-NEW] 开始两阶段场景生成...')
    
    try {
      // 第一阶段：基于核心输入和聊天记录生成基础故事和场景
      console.log('📝 [CHAT-NEW] 第一阶段：生成基础故事和场景...')
      const baseStory = await generateBaseStory()
      console.log('✅ [CHAT-NEW] 基础故事生成完成:', baseStory)
      
      // 第二阶段：根据用户元数据扩写和完善故事
      console.log('🎨 [CHAT-NEW] 第二阶段：根据用户元数据扩写故事...')
      const enhancedStory = await enhanceStoryWithMetadata(baseStory)
      console.log('✅ [CHAT-NEW] 元数据扩写完成:', enhancedStory)
      
      return enhancedStory
    } catch (error) {
      console.error('💥 [CHAT-NEW] 两阶段场景生成失败:', error)
      return {
        storyDescription: '基于您的回答，我们为您准备了一个专属的生活场景。',
        logicalScenes: {},
        aiPrompt: '',
        coreKeywords: []
      }
    }
  }

  // 第一阶段：基于核心输入生成基础故事
  const generateBaseStory = async () => {
    console.log('🎯 [CHAT-NEW] 第一阶段：基于核心输入生成基础故事...')
    
    const context = `
**用户核心输入（必须严格遵循）：**
${initialPrompt}

**用户聊天记录：**
${answers.join(' | ')}

**基础故事生成要求：**
1. **严格基于核心输入**：必须围绕"前女友"、"法庭"、"告上法庭"、"失信人"等核心元素
2. **人物设定**：30岁中国男性，身高175cm，体重70kg，主要场景在贵阳
3. **时间线**：过去（感情纠纷）→ 现在（法庭/失信人）→ 未来（AI创业）
4. **生成4个核心场景**：
   - 场景1：法庭现场（现在）
   - 场景2：感情纠纷回忆（过去）
   - 场景3：失信人后果（现在）
   - 场景4：AI创业现状（现在/未来）

**严禁生成与核心输入无关的内容**：
- 禁止科技园、实验室、代码调试
- 禁止服装设计、时尚
- 禁止男友、恋爱等无关人物
- 必须严格围绕核心输入元素

**返回格式：**
{
  "coreKeywords": ["前女友", "法庭", "失信人", "AI创业"],
  "baseStory": "基于核心输入的基础故事描述",
  "baseScenes": {
    "scene1": {
      "title": "法庭现场",
      "description": "贵阳某法院，面对前女友起诉的场景",
      "timeframe": "现在",
      "keywords": ["法庭", "前女友", "起诉"]
    },
    "scene2": {
      "title": "感情纠纷回忆", 
      "description": "回忆与前女友的感情纠纷过程",
      "timeframe": "过去",
      "keywords": ["前女友", "感情纠纷", "回忆"]
    },
    "scene3": {
      "title": "失信人后果",
      "description": "成为失信人后的生活影响",
      "timeframe": "现在", 
      "keywords": ["失信人", "限制", "影响"]
    },
    "scene4": {
      "title": "AI创业现状",
      "description": "当前AI创业的状态和未来展望",
      "timeframe": "现在/未来",
      "keywords": ["AI创业", "现在", "未来"]
    }
  }
}`
    
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
              content: `你是一个专业的故事生成器，专门基于用户的核心输入生成基础故事和场景。

**核心任务：**
1. 严格基于用户的核心输入生成故事
2. 不添加任何与用户输入无关的内容
3. 确保故事逻辑连贯，场景清晰
4. 返回标准JSON格式

**生成原则：**
- 忠实于用户的核心输入
- 保持故事的逻辑性和连贯性
- 场景描述要具体生动
- 时间线要清晰明确`
            },
            {
              role: 'user',
              content: context
            }
          ],
          max_tokens: 1200,
          temperature: 0.7
        })
      })

      if (!response.ok) {
        throw new Error(`DeepSeek API调用失败: ${response.status}`)
      }

      const data = await response.json()
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content.trim()
        console.log('✅ [CHAT-NEW] 第一阶段原始响应:', content)
        
        // 解析JSON响应
        try {
          let jsonContent = content
          if (jsonContent.includes('```json')) {
            jsonContent = jsonContent.replace(/```json\s*/, '').replace(/```\s*$/, '').trim()
          }
          if (jsonContent.includes('```')) {
            jsonContent = jsonContent.replace(/```\s*/, '').replace(/```\s*$/, '').trim()
          }
          
          const parsedData = JSON.parse(jsonContent)
          console.log('📋 [CHAT-NEW] 第一阶段解析结果:', parsedData)
          
          // 打印基础场景信息
          if (parsedData.baseScenes) {
            console.log('🎬 [CHAT-NEW] 生成的基础场景:')
            Object.keys(parsedData.baseScenes).forEach((key, index) => {
              const scene = parsedData.baseScenes[key]
              console.log(`基础场景${index + 1}: ${scene.title}`)
              console.log(`  时间: ${scene.timeframe}`)
              console.log(`  描述: ${scene.description}`)
              console.log(`  关键词: ${scene.keywords?.join(', ') || '无'}`)
              console.log('---')
            })
          }
          
          return parsedData
        } catch (parseError) {
          console.error('❌ [CHAT-NEW] 第一阶段JSON解析失败:', parseError)
          console.log('📄 [CHAT-NEW] 原始内容:', content)
          
          return {
            coreKeywords: ["前女友", "法庭", "失信人", "AI创业"],
            baseStory: content,
            baseScenes: {}
          }
        }
      } else {
        throw new Error('DeepSeek API返回格式错误')
      }
    } catch (error) {
      console.error('💥 [CHAT-NEW] 第一阶段生成失败:', error)
      return {
        coreKeywords: ["前女友", "法庭", "失信人", "AI创业"],
        baseStory: '基于您的核心输入，我们为您准备了一个基础故事。',
        baseScenes: {}
      }
    }
  }

  // 第二阶段：根据用户元数据扩写故事
  const enhanceStoryWithMetadata = async (baseStory: any) => {
    console.log('🎨 [CHAT-NEW] 第二阶段：根据用户元数据扩写故事...')
    
    try {
      // 获取用户信息描述
      const userInfoDescription = getUserInfoDescription()
      
      const enhanceContext = `
**基础故事（第一阶段生成）：**
${JSON.stringify(baseStory, null, 2)}

**用户元数据（用于扩写）：**
${userInfoDescription}

**第二阶段扩写要求：**
1. **保持基础故事的核心结构**：不改变基础场景的逻辑和时间线
2. **融入用户元数据**：基于用户的深度分析结果丰富故事细节
3. **增强个性化体验**：体现用户的性格特质、情感模式、审美偏好等
4. **丰富场景描述**：添加具体的感官描述、情感体验、生活细节
5. **保持故事连贯性**：确保扩写后的故事逻辑清晰，前后呼应

**扩写重点：**
- 基于用户的八字日主特质推测行为反应
- 基于用户的八字格局特征推测环境偏好
- 基于用户的星盘分析推测情感反应
- 基于用户的紫微命盘推测人际互动
- 基于用户的美学偏好推测具体选择
- 添加具体的感官描述和情感体验
- 营造强烈的场景氛围和故事感

**返回格式：**
{
  "coreKeywords": ["前女友", "法庭", "失信人", "AI创业"],
  "logicalScenes": {
    "scene1": {
      "title": "扩写后的场景1标题",
      "description": "基于元数据扩写后的详细场景描述",
      "keywords": ["场景1相关关键词"]
    },
    "scene2": {
      "title": "扩写后的场景2标题", 
      "description": "基于元数据扩写后的详细场景描述",
      "keywords": ["场景2相关关键词"]
    },
    "scene3": {
      "title": "扩写后的场景3标题",
      "description": "基于元数据扩写后的详细场景描述", 
      "keywords": ["场景3相关关键词"]
    },
    "scene4": {
      "title": "扩写后的场景4标题",
      "description": "基于元数据扩写后的详细场景描述",
      "keywords": ["场景4相关关键词"]
    }
  },
  "storyDescription": "基于扩写后场景生成的完整故事描述",
  "aiPrompt": "基于扩写后场景生成的详细AI图像提示词"
}`
      
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
              content: `你是一个专业的故事扩写器，专门基于用户元数据扩写和完善基础故事。

**核心任务：**
1. 保持基础故事的核心结构和逻辑
2. 基于用户元数据丰富故事细节
3. 增强个性化体验和场景描述
4. 确保故事连贯性和逻辑性
5. 返回标准JSON格式

**扩写原则：**
- 忠实于基础故事的核心内容
- 融入用户的性格特质和情感模式
- 添加丰富的感官描述和细节
- 保持故事的逻辑连贯性`
            },
            {
              role: 'user',
              content: enhanceContext
            }
          ],
          max_tokens: 1500,
          temperature: 0.8
        })
      })

      if (!response.ok) {
        throw new Error(`DeepSeek API调用失败: ${response.status}`)
      }

      const data = await response.json()
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const content = data.choices[0].message.content.trim()
        console.log('✅ [CHAT-NEW] 第二阶段原始响应:', content)
        
        // 解析JSON响应
        try {
          let jsonContent = content
          if (jsonContent.includes('```json')) {
            jsonContent = jsonContent.replace(/```json\s*/, '').replace(/```\s*$/, '').trim()
          }
          if (jsonContent.includes('```')) {
            jsonContent = jsonContent.replace(/```\s*/, '').replace(/```\s*$/, '').trim()
          }
          
          const parsedData = JSON.parse(jsonContent)
          console.log('📋 [CHAT-NEW] 第二阶段解析结果:', parsedData)
          
          // 打印扩写后的场景信息
          if (parsedData.logicalScenes) {
            console.log('🎨 [CHAT-NEW] 扩写后的场景:')
            Object.keys(parsedData.logicalScenes).forEach((key, index) => {
              const scene = parsedData.logicalScenes[key]
              console.log(`扩写场景${index + 1}: ${scene.title}`)
              console.log(`  描述: ${scene.description}`)
              console.log(`  关键词: ${scene.keywords?.join(', ') || '无'}`)
              console.log('---')
            })
          }
          
          return parsedData
        } catch (parseError) {
          console.error('❌ [CHAT-NEW] 第二阶段JSON解析失败:', parseError)
          console.log('📄 [CHAT-NEW] 原始内容:', content)
          
          return {
            coreKeywords: baseStory.coreKeywords || ["前女友", "法庭", "失信人", "AI创业"],
            logicalScenes: {},
            storyDescription: content,
            aiPrompt: ''
          }
        }
      } else {
        throw new Error('DeepSeek API返回格式错误')
      }
    } catch (error) {
      console.error('💥 [CHAT-NEW] 第二阶段扩写失败:', error)
      return {
        coreKeywords: baseStory.coreKeywords || ["前女友", "法庭", "失信人", "AI创业"],
        logicalScenes: {},
        storyDescription: baseStory.baseStory || '基于您的输入，我们为您准备了一个故事。',
        aiPrompt: ''
      }
    }
  }

  // 生成最终提示词
  const generateFinalPrompt = async () => {
    console.log('🎯 [CHAT-NEW] 开始生成最终提示词...')
    
    // 确保用户信息从Prisma获取
    let userInfoFromAPI = null
    try {
      const userResponse = await fetch('/api/user/info')
      if (userResponse.ok) {
        const userData = await userResponse.json()
        userInfoFromAPI = userData
        console.log('✅ [CHAT-NEW] 使用Prisma数据库的用户信息:', {
          name: userData.userInfo?.name,
          age: userData.userInfo?.age,
          location: userData.userInfo?.location
        })
      }
    } catch (error) {
      console.log('⚠️ [CHAT-NEW] 获取Prisma用户信息失败，使用localStorage')
    }
    
    // 生成用户简介报告
    await generateUserProfile()
    
    // 生成杂志标题
    const magazineTitle = await generateMagazineTitle()
    console.log('📰 [CHAT-NEW] 生成的杂志标题:', magazineTitle)
    setMainTitle(magazineTitle)  // 保存标题到状态
    
    // 步骤1：直接基于用户第一键入生成有逻辑性的场景
    console.log('🎯 [CHAT-NEW] 步骤1：开始基于用户第一键入生成有逻辑性的场景...')
    console.log('🎯 [CHAT-NEW] 使用用户数据:', userInfoFromAPI ? 'Prisma数据库' : 'localStorage')
    const logicalScenes = await generateLogicalScenes()
    console.log('🎯 [CHAT-NEW] 有逻辑性场景生成完成:', logicalScenes)
    
    // 设置场景叙事
    if (logicalScenes.storyDescription) {
      setSceneNarrative(logicalScenes.storyDescription)
    }
    
    // 提取4个场景
    const fourScenes = logicalScenes.logicalScenes ? Object.values(logicalScenes.logicalScenes) : []
    
    // 直接使用生成的AI提示词
    const aiPrompt = logicalScenes.aiPrompt || ''
    
    // 构建最终提示词
    const finalPrompt = `${magazineTitle}

${logicalScenes.storyDescription || '基于您的回答，我们为您准备了一个专属的生活场景。'}

${aiPrompt}`
    
    console.log('✅ [CHAT-NEW] 最终提示词生成完成，长度:', finalPrompt.length)
    return finalPrompt
  }

  // 生成杂志标题
  const generateMagazineTitle = async () => {
    try {
      const userInfo = getUserInfo()
      const userMetadata = getUserMetadata()
      
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
              content: '你是一个专业的杂志标题生成器。请直接返回一个简洁的标题文本，不要使用JSON格式，不要使用引号，只返回纯文本标题。'
            },
            {
              role: 'user',
              content: `基于以下信息生成一个杂志标题：

用户故事：${initialPrompt}
用户回答：${answers.join(' | ')}

要求：
1. 简洁有力，10-15个字
2. 有诗意和美感
3. 能概括核心主题
4. 直接返回标题文本，不要任何其他内容

请直接返回标题：`
            }
          ],
          max_tokens: 50,
          temperature: 0.8
        })
      })

      if (response.ok) {
        const data = await response.json()
        if (data.choices && data.choices[0] && data.choices[0].message) {
          let title = data.choices[0].message.content.trim()
          
          // 清理markdown标记
          if (title.includes('```json')) {
            title = title.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
          } else if (title.includes('```')) {
            title = title.replace(/```\s*/g, '').trim()
          }
          
          // 尝试解析JSON格式的标题
          try {
            const parsedTitle = JSON.parse(title)
            if (parsedTitle.title) {
              return parsedTitle.title
            }
          } catch (parseError) {
            // 如果不是JSON格式，直接返回文本内容
            console.log('📝 [CHAT-NEW] 标题不是JSON格式，直接使用文本:', title)
            return title
          }
        }
      }
    } catch (error) {
      console.error('💥 [CHAT-NEW] 标题生成失败:', error)
    }
    
    // 备用方案：使用默认标题
    return '我的生活故事'
  }

  // 🆕 在对话框中生成内容
  const generateInChat = async (finalAnswers: string[], promptToUse?: string) => {
    setIsGenerating(true)
    setIsLoading(true)
    
    // 使用传入的prompt或当前状态的initialPrompt
    const actualPrompt = promptToUse || initialPrompt
    
    // 🔒 检查用户图片生成额度
    try {
      const usageResponse = await fetch('/api/user/image-usage')
      if (usageResponse.ok) {
        const usage = await usageResponse.json()
        const canGenerate = await fetch('/api/user/can-generate')
        if (canGenerate.ok) {
          const { canGenerate: allowed, needsPayment } = await canGenerate.json()
          if (!allowed) {
            setIsGenerating(false)
            setIsLoading(false)
            if (needsPayment) {
              router.push('/payment')
              return
            } else {
              alert('无法生成图片，请稍后重试')
              return
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ [CHAT-NEW] 检查用户额度失败:', error)
      // 如果检查失败，允许继续生成（避免阻塞用户体验）
    }
    
    console.log('🎬 [CHAT-NEW] 开始在对话框中生成内容')
    console.log('📊 [CHAT-NEW] 当前键入（生成场景）:', actualPrompt)
    console.log('📊 [CHAT-NEW] 历史背景（上下文）:', contextHistory || '无')
    console.log('📊 [CHAT-NEW] 本轮回答（补充细节）:', finalAnswers)
    
    // 🔥 answersWithContext只包含当前轮的回答（不包含历史）
    // 历史背景通过contextHistory单独传给场景生成
    const answersWithContext = finalAnswers
    
    try {
      // 添加进度显示
      const progressId = 'system-generating'
      setMessages(prev => [...prev, {
        id: progressId,
        type: 'system',
        content: '🎬 正在生成场景...'
      }])
      
      // 1. 生成内容（场景、故事、心理剧）
      // actualPrompt = 当前键入（生成场景的核心）
      // answersWithContext = 历史背景 + 用户回答（提供上下文）
      const contentResult = await ContentGenerationService.generateQuickContent({
        initialPrompt: actualPrompt,
        answers: answersWithContext,
        questions: questions,
        contextHistory: contextHistory ? [contextHistory] : [] // 传入历史背景，让场景生成知道
      })
      // 2. 准备场景数据
      const logicalScenes = contentResult.scenes?.logicalScenes
      const scenes = Array.isArray(logicalScenes) 
        ? logicalScenes 
        : logicalScenes 
          ? Object.values(logicalScenes) 
          : []
      
      // 显示生成的场景
      const sceneNames = scenes.map((s: any) => s.title).join('、')
      setMessages(prev => prev.map(msg => 
        msg.id === progressId 
          ? { ...msg, content: `✅ 场景已生成：${sceneNames}\n🎨 开始创作画面...` }
          : msg
      ))
      
      // 3. ✅ 场景对象已经有storyFragment了，直接用（心理剧补充）
      scenes.forEach((scene: any) => {
        if (scene.isPsychodrama && !scene.storyFragment) {
          // 心理剧如果没有storyFragment，用完整的心理分析文字
          const psychodramaText = [
            scene.innerMonologue,
            scene.surfaceVsInner, 
            scene.consciousnessStream,
            scene.psychologicalSymbolism
          ].filter(text => text && text.trim()).join('\n\n')
          
          scene.storyFragment = psychodramaText || scene.sceneDescription_CN || ''
          
          console.log('🎭 [PSYCHODRAMA] 心理剧文字内容:', {
            innerMonologue: scene.innerMonologue,
            surfaceVsInner: scene.surfaceVsInner,
            consciousnessStream: scene.consciousnessStream,
            psychologicalSymbolism: scene.psychologicalSymbolism,
            finalText: scene.storyFragment
          })
        }
        // 普通场景的storyFragment已经由场景生成时生成了，直接用
      })
      
      const storyPromise = Promise.resolve()
      
      // 更新进度：开始生成图片（已在上面显示）
      
      // 💾 收集生成的图片数据（用于保存到数据库）
      const generatedImagesData: Array<{ imageUrl: string; story: string; sceneTitle: string }> = []
      
      // ⚡ 并行生成所有图片（同时开始，不等待）
      let completedImages = 0
      const imagePromises = scenes.map(async (scene: any, i: number) => {
        const sceneTitle = scene.title || scene.emotionalTrigger || `场景 ${i + 1}`
        const sceneType = scene.isPsychodrama ? '心理剧' : '场景'
        
        
        // 添加生成中的占位消息
        const placeholderId = `image-placeholder-${i}`
        setMessages(prev => [...prev, {
          id: placeholderId,
          type: 'system',
          content: `⚡ 正在创作第 ${i + 1} 幅作品...`
        }])
        
        try {
          // 🔍 调试：检查场景对象的字段
          console.log(`🔍 [CHAT-NEW] 场景${i + 1}字段检查:`, {
            title: scene.title,
            isPsychodrama: scene.isPsychodrama,
            hasDetailedPrompt: !!scene.detailedPrompt,
            hasImagePrompt: !!scene.imagePrompt,
            hasDescription: !!scene.description,
            detailedPrompt: scene.detailedPrompt?.substring(0, 100) + '...',
            imagePrompt: scene.imagePrompt?.substring(0, 100) + '...',
            description: scene.description?.substring(0, 100) + '...'
          })
          
          // 根据场景类型选择正确的提示词字段
          let imagePrompt = scene.isPsychodrama 
            ? scene.imagePrompt  // 心理剧使用imagePrompt
            : scene.detailedPrompt || scene.description  // 普通场景使用detailedPrompt或description
          
          // 🎭 心理剧特殊处理：添加潜意识/内心独白
          if (scene.isPsychodrama) {
            if (!imagePrompt || imagePrompt.trim() === '') {
            console.warn(`⚠️ [CHAT-NEW] 心理剧场景 ${i + 1} 缺少imagePrompt，使用备用方案`)
            imagePrompt = `PSYCHODRAMA - Close-up portrait of person with emotional expression showing ${scene.emotionalTrigger || 'internal conflict'}, dramatic lighting, cinematic color grading, photorealistic style. --ar 16:9`
          }
          
            // 🧠 提取情绪关键词强化提示词
            const allEmotionText = [
              scene.emotionalTrigger || '',
              scene.innerMonologue || '',
              scene.subconsciousDesire || ''
            ].join(' ')
            
            // 使用LLM进行智能情绪检测（心理剧功能）
            try {
              const emotionResult = await detectEmotionsWithLLM(allEmotionText)
              // 只在高置信度且明确情绪时才使用
              if (emotionResult.emotions.length > 0 && emotionResult.confidence > 0.7) {
                const emotionEN = translateEmotionsToEnglish(emotionResult.emotions).join(', ')
                const intensityText = emotionResult.intensity === 'high' ? 'intense' : 
                                   emotionResult.intensity === 'medium' ? 'moderate' : 'subtle'
                imagePrompt = `Core emotions: ${emotionEN} (${intensityText} intensity). ` + imagePrompt
                console.log(`🎭 [EMOTION] 心理剧情绪检测: ${emotionResult.emotions.join(', ')} (${emotionResult.intensity}, 置信度: ${emotionResult.confidence})`)
              } else {
                console.log(`🎭 [EMOTION] 情绪检测置信度不足，跳过情绪增强 (置信度: ${emotionResult.confidence})`)
              }
            } catch (error) {
              console.warn('⚠️ [EMOTION] LLM情绪检测失败，跳过情绪增强:', error)
            }
          }
          
          
          if (!imagePrompt || imagePrompt.trim() === '') {
            console.error(`❌ [CHAT-NEW] 场景 ${i + 1} 缺少提示词，跳过`)
            console.error(`❌ [CHAT-NEW] 场景对象:`, {
              title: scene.title,
              isPsychodrama: scene.isPsychodrama,
              detailedPrompt: scene.detailedPrompt,
              imagePrompt: scene.imagePrompt,
              description: scene.description
            })
            setMessages(prev => prev.map(msg => 
              msg.id === placeholderId
                ? { ...msg, content: `❌ 场景 ${i + 1} 缺少提示词` }
                : msg
            ))
            return // map中使用return代替continue
          }
          
          console.log(`✅ [CHAT-NEW] 场景 ${i + 1} 图片提示词已准备:`, imagePrompt.substring(0, 200) + '...')
          
          // 调用SeeDream API生成图片
          const imageResponse = await fetch('/api/seedream-generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              prompt: imagePrompt,
              negativePrompt: "low quality, blurry, distorted",
              width: 1024,
              height: 1024
            })
          }).catch(err => {
            console.error(`❌ [CHAT-NEW] 场景 ${i + 1} 网络错误:`, err)
            throw new Error(`网络请求失败: ${err.message}`)
          })
          
          if (imageResponse.ok) {
            const imageData = await imageResponse.json()
            
            // 获取场景的故事
            const sceneStory = scene.storyFragment
            
            // 💾 收集图片数据用于保存
            generatedImagesData.push({
              imageUrl: imageData.imageUrl,
              story: sceneStory || '',
              sceneTitle: scene.title || `场景 ${i + 1}`
            })
            
            // 更新进度
            completedImages++
            
            // 更新进度
            setMessages(prev => prev.map(msg => 
              msg.id === progressId 
                ? { ...msg, content: `✅ 场景已生成：${sceneNames}\n🎨 创作画面中... ${completedImages}/${scenes.length}` }
                : msg
            ))
            
            // 替换占位消息为图片+故事的组合
            const imageId = `image-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
            setMessages(prev => prev.map(msg => 
              msg.id === placeholderId
                ? {
                    id: imageId,
                    type: 'image',
                    content: sceneTitle,  // 先显示标题
                    story: sceneStory || '',  // 故事字段（可能为空，并行生成）
                    imageUrl: imageData.imageUrl,
                    sceneData: scene,
                    sceneIndex: i  // 保存场景索引，用于后续更新
                  }
                : msg
            ))
            
            // 增加生图计数
            setGeneratedImagesCount(prev => {
              const newCount = prev + 1
              console.log(`📊 [CHAT-NEW] 已生成图片数: ${newCount}/${MAX_GENERATED_IMAGES}`)
              return newCount
            })
          } else {
            // 生成失败，获取错误信息
            const errorData = await imageResponse.json().catch(() => ({}))
            const errorMsg = errorData.error || imageResponse.statusText || '未知错误'
            console.error(`❌ [CHAT-NEW] 场景 ${i + 1} API错误:`, errorMsg)
            
            setMessages(prev => prev.map(msg => 
              msg.id === placeholderId
                ? { ...msg, content: `❌ 第 ${i + 1} 幅创作失败: ${errorMsg}` }
                : msg
            ))
          }
    } catch (error) {
          console.error(`❌ [CHAT-NEW] 场景 ${i + 1} 生成失败:`, error)
          setMessages(prev => prev.map(msg => 
            msg.id === placeholderId
              ? { ...msg, content: `❌ 第 ${i + 1} 幅创作失败` }
              : msg
          ))
        }
      })
      
      // ⚡ 等待所有图片并行生成完成 + 故事生成完成
      await Promise.all([...imagePromises, storyPromise])
      
      // 移除进度消息
      setMessages(prev => prev.filter(msg => msg.id !== progressId))
      
      // 4. 所有图片和故事配对显示完成，添加完成消息
      setMessages(prev => [...prev, {
        id: `system-complete-${Date.now()}`,  // 唯一ID，避免重复
        type: 'system',
        content: '✨ 创作完成！'
      }])
      
      console.log('✅ [CHAT-NEW] 所有场景已完成：图片+故事配对显示')
      
      // 💾 保存生成内容到数据库
      console.log('💾 [CHAT-NEW] 开始保存生成内容到数据库...')
      console.log('💾 [CHAT-NEW] 生成的图片数据:', generatedImagesData)
      try {
        // 调用保存API
        const saveResponse = await fetch('/api/user/generated-content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            initialPrompt: actualPrompt,
            questions: questions.slice(0, answersWithContext.length),
            answers: answersWithContext,
            scenes: scenes || {},
            storyNarrative: contentResult.story?.narrative || '',
            images: generatedImagesData,
            category: 'daily'
          })
        })
        
        if (saveResponse.ok) {
          const saveResult = await saveResponse.json()
          console.log('✅ [CHAT-NEW] 内容已保存到数据库:', saveResult.contentId)
        } else {
          const errorData = await saveResponse.json()
          console.error('❌ [CHAT-NEW] 保存内容失败:', errorData)
        }
      } catch (saveError) {
        console.error('❌ [CHAT-NEW] 保存内容异常:', saveError)
      }
      
      // 🧠 生成完成后，统一分析整个对话，更新用户元数据
      console.log('🧠 [CHAT-NEW] 开始分析整个对话，更新元数据...')
      try {
        // 收集完整对话历史
        const fullConversation = [
          { role: 'user', content: actualPrompt },
          ...questions.slice(0, answersWithContext.length).map((q, i) => ([
            { role: 'assistant', content: q },
            { role: 'user', content: answersWithContext[i] }
          ])).flat()
        ]
        
        console.log('🧠 [CHAT-NEW] 完整对话:', fullConversation)
        
        // 调用统一分析（基于整个对话）
        await updateMetadataFromConversationAPI(
          answersWithContext.join('。'),  // 所有回答合并
          questions.join('；'),  // 所有问题合并
          [actualPrompt, ...answersWithContext]
        )
        
        console.log('✅ [CHAT-NEW] 元数据更新完成')
      } catch (error) {
        console.error('❌ [CHAT-NEW] 元数据分析失败:', error)
      }
      
      // 🔄 清空对话状态，准备下一轮
      console.log('🔄 [CHAT-NEW] 清空对话状态，准备接收新键入')
      
      // 把当前完整对话移到历史背景（包括initialPrompt和所有answers）
      const allCurrentInputs = [actualPrompt, ...finalAnswers].filter(Boolean)
      const completedContent = allCurrentInputs.join('。')
      
      setContextHistory(prev => {
        const newHistory = prev ? `${prev}。${completedContent}` : completedContent
        console.log('📊 [CHAT-NEW] 历史背景已更新:', newHistory)
        return newHistory
      })
      
      // 清空问答状态
      setAnswers([])
      setQuestions([])
      setCurrentQuestionIndex(0)
      setInitialPrompt('') // 清空，下一个输入会成为新的initialPrompt
      
      console.log('✅ [CHAT-NEW] 对话状态已清空，等待新键入')
      
    } catch (error) {
      console.error('💥 [CHAT-NEW] 生成失败:', error)
      setMessages(prev => [...prev, {
        id: 'system-error',
        type: 'system',
        content: '❌ 创作失败，请重试'
      }])
    } finally {
      setIsGenerating(false)
      setIsLoading(false)
    }
  }
  
  // ❌ 已废弃：不再跳转，改为在对话框中生成
  const goToGeneration = async (customPrompt?: string, finalAnswers?: string[]) => {
    console.warn('⚠️ [CHAT-NEW] goToGeneration 已废弃！改用 generateInChat')
    const answersToUse = finalAnswers || answers
    generateInChat(answersToUse)
  }

  // 跳过问题直接生成（已废弃，现在使用AI智能判断）
  const skipToGeneration = () => {
    console.log('⏭️ [CHAT-NEW] 用户选择跳过问题，直接在对话框中生成')
    // 使用当前已有的answers生成
    generateInChat(answers.length > 0 ? answers : [initialPrompt])
  }

  // AI从对话中学习更新元数据
  const updateMetadataFromConversationAPI = async (
    userAnswer: string,
    aiQuestion: string,
    context: string[]
  ) => {
    try {
      // 🔵 第一步：存储用户原始输入（表意识层）
      const currentMetadata = getUserMetadata() as any
      const rawInputsToAdd = [userAnswer]  // 用户的原始回答
      if (context.length > 0) {
        rawInputsToAdd.unshift(context[0])  // 初始prompt也要存储
      }
      
      // 🔵 第二步：提取用户提到的关键词（简单提取，不用AI）
      const mentionedKeywords = userAnswer.match(/[\u4e00-\u9fa5a-zA-Z0-9]{2,}/g) || []
      
      // 获取用户的完整信息（包括八字、星盘）
      const userInfo = getUserInfo()
      
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
              content: `你是专业的心理学专家，从用户的实际对话中分析性格特质和行为模式。

**⚠️⚠️⚠️ 死刑规则：绝对禁止使用星座、八字、紫微等术语！⚠️⚠️⚠️**

**❌ 禁止的内容：**
- 天机星、紫微、天府、文曲星、福德宫、迁移宫
- 水木相生、伤官配印、驿马星、日主
- 双鱼座特质、海王星主导、金星落位
- 任何命理术语

**✅ 必须使用的内容：**
- 基于用户实际说的话
- 基于用户实际行为
- 基于用户实际选择

**示例对比：**
❌ "紫微命盘迁移宫活跃" → 死刑！
✅ "高考失利后选择出国，展现出通过改变环境应对挫折的能力" → 正确！

**⚠️ JSON格式要求：**
- 必须使用英文标点符号（逗号,、冒号:、引号"）
- 字符串内容尽量简短，不要超过30字
- 避免使用特殊字符和换行

返回JSON格式：
{
  "corePersonalityTraits": ["简短的性格特质描述"],
  "communicationStyle": ["沟通方式"],
  "emotionalPattern": ["情绪反应"],
  "decisionMakingStyle": ["决策方式"],
  "stressResponse": ["压力应对"],
  "careerAptitude": ["工作特长"],
  "interpersonalStrengths": ["社交优势"],
  "interpersonalChallenges": ["社交挑战"],
  "socialEnergyPattern": ["社交偏好"],
  "aestheticPreferences": ["审美偏好"],
  "lifestyleHobbies": ["生活爱好"],
  "activityPreferences": ["活动偏好"],
  "conversationInsights": ["对话发现"],
  "behaviorPatterns": ["行为习惯"],
  "styleInsights": ["个人风格"],
  "frequentLocations": ["具体地点名称"],
  "favoriteVenues": ["场所类型"]
}

**⚠️ 每个字段至少有1-2条内容，内容要简洁！**

**📍 地点学习特别重要：**
- **frequentLocations**：从对话中提取用户常去的具体地点
  - 示例：用户说"静安寺" → ["静安寺", "静安寺商圈"]
  - 示例：用户说"悉尼大学" → ["悉尼大学", "悉尼"]
  - 示例：用户说"在家" → ["家", "卧室", "客厅"]
  
- **favoriteVenues**：从对话中提取用户喜欢的场所类型
  - 示例：用户说"老字号" → ["传统餐厅", "老字号"]
  - 示例：用户说"咖啡厅" → ["咖啡厅", "休闲场所"]
  - 示例：用户说"实验室" → ["实验室", "学术场所"]

**🎯 地点学习示例：**
用户对话："我去吃了莱莱小笼，蟹粉小笼和鸭血汤，静安寺店里，很多旅客游客"
- frequentLocations: ["静安寺", "静安寺商圈", "莱莱小笼"]
- favoriteVenues: ["传统餐厅", "老字号", "旅游景点餐厅"]

**🚨 重要提醒：**
1. 只返回JSON，不要有其他文字
2. 必须使用英文逗号(,)和英文冒号(:)
3. 字符串内容不要包含引号、冒号等特殊符号`
            },
            {
              role: 'user',
              content: `
AI问题：${aiQuestion}
用户回答：${userAnswer}
对话上下文：${context.join(' | ')}

请从这个对话中提取洞察，分配到各个字段。记住：绝对不要用星座术语！`
            }
          ],
          max_tokens: 600,
          temperature: 0.7
        })
      })

      const data = await response.json()
      let content = data.choices[0].message.content.trim()
      
      // 清理markdown代码块
      if (content.includes('```json')) {
        content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
      }
      if (content.includes('```')) {
        content = content.replace(/```/g, '').trim()
      }
      
      // 提取JSON对象（处理可能的额外文本）
      const jsonStart = content.indexOf('{')
      const jsonEnd = content.lastIndexOf('}')
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        content = content.substring(jsonStart, jsonEnd + 1)
      }
      
      // 清理JSON内容（处理常见的格式问题）
      // 注意：这些替换需要谨慎，避免破坏正确的JSON
      content = content
        .replace(/，/g, ',')  // 中文逗号 → 英文逗号
        .replace(/：/g, ':')  // 中文冒号 → 英文冒号
        .replace(/"/g, '"')   // 中文左引号 → 英文引号
        .replace(/"/g, '"')   // 中文右引号 → 英文引号
      
      // 尝试解析JSON，如果失败则使用默认值
      let insights
      try {
        insights = JSON.parse(content)
      } catch (parseError) {
        console.error('❌ [CHAT-NEW] JSON解析失败，使用默认值:', parseError)
        console.log('📄 [CHAT-NEW] 原始内容:', content)
        // 使用默认的空洞察
        insights = {
          corePersonalityTraits: [],
          communicationStyle: [],
          emotionalPattern: [],
          decisionMakingStyle: [],
          stressResponse: [],
          careerAptitude: [],
          interpersonalStrengths: [],
          interpersonalChallenges: [],
          socialEnergyPattern: [],
          aestheticPreferences: [],
          lifestyleHobbies: [],
          activityPreferences: [],
          conversationInsights: [],
          behaviorPatterns: [],
          styleInsights: [],
          frequentLocations: [],
          favoriteVenues: []
        }
      }
      
      // 🔵 第三步：更新到Prisma数据库（表意识 + 潜意识）
      await fetch('/api/user/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          updates: {
            // 📝 表意识层（用户真实说的）
            userRawInputs: JSON.stringify([
              ...(currentMetadata?.userRawInputs ? JSON.parse(currentMetadata.userRawInputs) : []),
              ...rawInputsToAdd
            ]),
            userMentionedKeywords: JSON.stringify([
              ...(currentMetadata?.userMentionedKeywords ? JSON.parse(currentMetadata.userMentionedKeywords) : []),
              ...mentionedKeywords
            ]),
            
            // 🧠 潜意识层（AI分析）- 核心性格
            corePersonalityTraits: insights.corePersonalityTraits || [],
            communicationStyle: insights.communicationStyle || [],
            emotionalPattern: insights.emotionalPattern || [],
            decisionMakingStyle: insights.decisionMakingStyle || [],
            stressResponse: insights.stressResponse || [],
            
            // 职业和人际
            careerAptitude: insights.careerAptitude || [],
            interpersonalStrengths: insights.interpersonalStrengths || [],
            interpersonalChallenges: insights.interpersonalChallenges || [],
            socialEnergyPattern: insights.socialEnergyPattern || [],
            
            // 生活和审美
            aestheticPreferences: insights.aestheticPreferences || [],
            lifestyleHobbies: insights.lifestyleHobbies || [],
            activityPreferences: insights.activityPreferences || [],
            
            // 洞察和模式
            conversationInsights: insights.conversationInsights || [],
            behaviorPatterns: insights.behaviorPatterns || [],
            styleInsights: insights.styleInsights || [],
            
            // 地点学习（从对话中提取用户常去的地点）
            frequentLocations: insights.frequentLocations || [],
            favoriteVenues: insights.favoriteVenues || []
          },
          source: 'conversation'
        })
      })
      
      console.log('✅ [CHAT-NEW] 元数据已从对话中更新到Prisma')
    } catch (error) {
      console.error('❌ [CHAT-NEW] 更新元数据失败:', error)
    }
  }

  // 获取星座特质
  const getZodiacTraits = (sign: string) => {
    const traits: Record<string, string> = {
      '双鱼座': '敏感细腻、富有同情心、直觉强、艺术气质、理想主义',
      '白羊座': '热情主动、勇敢直率、领导力强、行动力强',
      '金牛座': '稳重踏实、执着坚韧、审美力强、物质主义',
      '双子座': '机智灵活、好奇心强、沟通能力强、多才多艺',
      '巨蟹座': '情感丰富、家庭观念强、直觉敏锐、保护欲强',
      '狮子座': '自信大方、领导力强、创造力丰富、慷慨大方',
      '处女座': '完美主义、注重细节、分析能力强、务实理性',
      '天秤座': '优雅平衡、社交能力强、审美力佳、追求和谐',
      '天蝎座': '深沉专注、洞察力强、意志坚定、情感深刻',
      '射手座': '乐观开朗、热爱自由、冒险精神、哲学思考',
      '摩羯座': '踏实稳重、目标明确、责任心强、耐力持久',
      '水瓶座': '独立创新、思想前卫、人道主义、理想主义',
    }
    return traits[sign] || '待分析'
  }
  
  // 获取生肖特质
  const getZodiacAnimalTraits = (animal: string) => {
    const traits: Record<string, string> = {
      '鼠': '机智灵活、适应力强、善于社交、敏锐洞察',
      '牛': '勤奋踏实、责任心强、稳重可靠、执着坚韧',
      '虎': '勇敢果断、领袖气质、独立自主、冒险精神',
      '兔': '温和善良、机敏灵活、审美力强、避免冲突、追求和谐',
      '龙': '自信果敢、领导力强、创造力丰富、追求卓越',
      '蛇': '智慧深沉、洞察力强、神秘优雅、直觉敏锐',
      '马': '热情奔放、行动力强、自由精神、社交活跃',
      '羊': '温柔体贴、艺术气质、同情心强、追求和谐',
      '猴': '聪明机智、灵活变通、好奇心强、善于学习',
      '鸡': '勤奋努力、注重细节、诚实守信、完美主义',
      '狗': '忠诚正直、责任心强、善良温和、保护意识',
      '猪': '真诚善良、乐观豁达、享受生活、宽容大度',
    }
    return traits[animal] || '待分析'
  }

  // 加载历史会话
  const handleSessionSelect = (session: ChatSession) => {
    console.log('📂 [CHAT-NEW] 加载历史会话:', session.sessionId)
    
    setCurrentSessionId(session.sessionId)
    setMessages(session.messages)
    setAnswers(session.answers)
    setQuestions(session.questions)
    setStep('questions')
    setCurrentQuestionIndex(session.questions.length - 1)
    
    // 如果有初始提示词，也需要恢复
    if (session.initialPrompt) {
      // 通过路由参数传递不太合适，因为会刷新页面
      // 这里我们直接在组件状态中处理
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50">
      {/* 历史记录侧边栏 */}
      <ChatHistorySidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSessionSelect={handleSessionSelect}
      />

      {/* 顶部导航 */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="历史记录"
            >
              <History className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="text-sm">返回</span>
            </button>
          </div>
          
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${generatedImagesCount >= MAX_GENERATED_IMAGES ? 'bg-red-500' : 'bg-green-500'}`}></div>
            <span className="text-sm text-gray-600">
              {generatedImagesCount >= MAX_GENERATED_IMAGES 
                ? '免费额度已用完' 
                : `已生成${generatedImagesCount}/${MAX_GENERATED_IMAGES}张图`}
            </span>
          </div>
          
          <div className="w-12"></div> {/* 占位，保持布局对称 */}
        </div>
      </div>

      {/* 用户信息栏 */}
      <UserInfoBar />

      {/* 主要内容 */}
      <div className="max-w-md mx-auto px-4 py-6">
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-4" />
            <p className="text-gray-600">正在分析您的输入...</p>
          </div>
        )}

        {step === 'questions' && (
          <div className="space-y-6">
            {/* 对话消息 */}
            <div className="space-y-4">
              {messages.map((message) => {
                // 图片消息类型（图片+故事配对显示）
                if (message.type === 'image' && message.imageUrl) {
                  // 获取场景标题（直接使用LLM生成的title，应该和用户输入语言一致）
                  const sceneTitle = message.sceneData?.title // LLM会根据用户输入语言生成
                    || message.sceneData?.emotionalTrigger // 心理剧fallback
                    || message.content // 最终fallback
                    || '场景'
                  
                  return (
                    <div key={message.id} className="w-full space-y-3">
                      {/* 场景标题（图片上方） */}
                      <div className="flex items-center gap-2">
                        <h3 className={`text-base font-medium ${
                        message.sceneData?.isPsychodrama 
                            ? 'text-purple-600' 
                            : 'text-gray-800'
                        }`}>
                          {message.sceneData?.isPsychodrama ? '🎭 ' : '🎬 '}
                          {sceneTitle}
                        </h3>
                        {message.sceneData?.isPsychodrama && (
                          <span className="text-xs bg-purple-500/90 text-white px-2 py-0.5 rounded-full">
                              心理剧
                            </span>
                        )}
                      </div>
                      
                      {/* 图片 - 优化显示 */}
                      <div className={`relative rounded-2xl shadow-lg overflow-hidden border-2 ${
                        message.sceneData?.isPsychodrama 
                          ? 'border-purple-300 shadow-purple-100' 
                          : 'border-gray-200 shadow-gray-100'
                      }`}>
                        <img 
                          src={message.imageUrl} 
                          alt={sceneTitle}
                          className="w-full h-auto max-h-96 object-cover"
                        />
                      </div>
                      
                      {/* 对应的故事描述 - 优化样式 */}
                      {(message.story || message.sceneData?.storyFragment) && (
                        <div className={`rounded-xl px-4 py-3 ${
                          message.sceneData?.isPsychodrama
                            ? 'bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100'
                            : 'bg-gray-50 border border-gray-100'
                        }`}>
                          <p className="text-sm leading-relaxed text-gray-700">
                            {message.story || message.sceneData?.storyFragment || message.content}
                          </p>
                        </div>
                      )}
                    </div>
                  )
                }
                
                // 故事消息类型（已废弃，现在故事和图片配对显示）
                if (message.type === 'story') {
                  // 不再显示整体故事，因为已经和图片配对显示了
                  return null
                }
                
                // 普通消息
                return (
                <div
                  key={message.id}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                      message.type === 'user'
                        ? 'bg-purple-500 text-white'
                        : message.type === 'assistant'
                        ? 'bg-white text-gray-800 shadow-sm border'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                </div>
                )
              })}
            </div>

            {/* 输入框 */}
            <div className="sticky bottom-4 bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
              {isGenerating ? (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-500">✨ 正在创作中...</p>
                </div>
              ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="请输入您的回答..."
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="px-4 py-2 bg-purple-500 text-white rounded-xl hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
              )}
            </div>
          </div>
        )}

        {step === 'generating' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-purple-500 animate-spin mb-4" />
            <p className="text-gray-600">正在生成您的专属内容...</p>
          </div>
        )}
      </div>
    </div>
  )
}

