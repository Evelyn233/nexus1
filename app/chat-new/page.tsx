'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Send, Loader2, X, Menu, History, Share2, Check } from 'lucide-react'
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
  const questionsRef = useRef<string[]>([])  // 🔥 使用ref追踪实际问题数，避免state更新延迟
  const [answers, setAnswers] = useState<string[]>([])
  const answersRef = useRef<string[]>([])  // 🔥 使用ref追踪实际回答数，避免state更新延迟
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [step, setStep] = useState<'loading' | 'questions' | 'generating'>('questions') // 默认设置为 questions，允许用户输入
  const [userProfile, setUserProfile] = useState<string>('')
  const [contextAnalysis, setContextAnalysis] = useState<any>(null)
  const [askedQuestions, setAskedQuestions] = useState<string[]>([])
  const [apiStatus, setApiStatus] = useState<'active' | 'fallback' | 'error'>('active')
  const [sceneNarrative, setSceneNarrative] = useState<string>('')
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string>('')
  const [mainTitle, setMainTitle] = useState<string>('')
  const [generatedImagesCount, setGeneratedImagesCount] = useState(0) // 生图次数计数
  const [isGenerating, setIsGenerating] = useState(false) // 是否正在生成图片
  const abortControllerRef = useRef<AbortController | null>(null) // 用于中止生成
  const MAX_GENERATED_IMAGES = 15 // 最多生成15张图（免费额度）
  const [isNewSession, setIsNewSession] = useState(true) // 是否是新会话
  const [generatedImagesData, setGeneratedImagesData] = useState<Array<{ 
    imageUrl: string; 
    imageDataUrl?: string;
    story: string; 
    sceneTitle: string;
    sceneIndex: number;
    prompt: string;
  }>>([]) // 🔥 收集所有生成的图片数据
  const generatedImagesDataRef = useRef<Array<{ 
    imageUrl: string; 
    imageDataUrl?: string;
    story: string; 
    sceneTitle: string;
    sceneIndex: number;
    prompt: string;
  }>>([]) // 🔥 ref用于获取最新的图片数据
  
  // 🔥 辅助函数：同时更新state和ref
  const updateGeneratedImagesData = (updater: (prev: typeof generatedImagesData) => typeof generatedImagesData) => {
    setGeneratedImagesData(prev => {
      const newData = updater(prev)
      generatedImagesDataRef.current = newData // 同步更新ref
      return newData
    })
  }
  
  const [showPublishDialog, setShowPublishDialog] = useState(false) // 发布对话框显示状态
  const [isPublishing, setIsPublishing] = useState(false) // 是否正在发布
  const [isPublished, setIsPublished] = useState(false) // 是否已发布
  const [publishTitle, setPublishTitle] = useState('') // 发布标题（可编辑）
  const [savedContentId, setSavedContentId] = useState<string>('') // 保存后的内容ID
  
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
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000) // 10秒超时
      
      try {
        const response = await fetch(`/api/user/generated-content/${contentId}`, {
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        
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
      } catch (fetchError: any) {
        clearTimeout(timeoutId)
        if (fetchError.name === 'AbortError') {
          console.error('⏱️ [CHAT-NEW] 加载历史对话超时')
          alert('加载历史对话超时，请重试')
        } else {
          throw fetchError
        }
      }
    } catch (error) {
      console.error('❌ [CHAT-NEW] 加载历史对话失败:', error)
      alert(`加载历史对话失败: ${error instanceof Error ? error.message : '未知错误'}`)
      router.push('/chat-new')
    } finally {
      setIsLoading(false)
    }
  }

  // 全局错误处理：捕获未处理的 Promise rejection
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      // 忽略浏览器扩展相关的错误
      if (event.reason?.message?.includes('message channel closed') || 
          event.reason?.message?.includes('listener indicated an asynchronous response')) {
        console.warn('⚠️ [CHAT-NEW] 浏览器扩展相关错误（可忽略）:', event.reason?.message)
        event.preventDefault() // 阻止默认的错误处理
        return
      }
      
      console.error('❌ [CHAT-NEW] 未处理的 Promise rejection:', event.reason)
      // 不阻止默认处理，让其他错误正常显示
    }

    const handleError = (event: ErrorEvent) => {
      // 忽略浏览器扩展相关的错误
      if (event.message?.includes('message channel closed') || 
          event.message?.includes('listener indicated an asynchronous response')) {
        console.warn('⚠️ [CHAT-NEW] 浏览器扩展相关错误（可忽略）:', event.message)
        event.preventDefault()
        return
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
    }
  }, [])

  // 初始化 sessionId（从 localStorage 读取或创建新的）
  useEffect(() => {
    try {
      // 尝试从 localStorage 读取当前活跃的 sessionId
      const savedSessionId = localStorage.getItem('currentChatSessionId')
      if (savedSessionId) {
        console.log('📂 [CHAT-NEW] 恢复会话:', savedSessionId)
        setCurrentSessionId(savedSessionId)
        setIsNewSession(false)
      } else {
        // 创建新的 sessionId
        const newSessionId = `session_${Date.now()}`
        console.log('🆕 [CHAT-NEW] 创建新会话:', newSessionId)
        setCurrentSessionId(newSessionId)
        try {
          localStorage.setItem('currentChatSessionId', newSessionId)
        } catch (storageError) {
          console.warn('⚠️ [CHAT-NEW] localStorage写入失败，继续使用内存中的sessionId:', storageError)
        }
        setIsNewSession(true)
      }
    } catch (error) {
      console.error('❌ [CHAT-NEW] 初始化sessionId失败:', error)
      // 如果localStorage失败，创建新会话
      const newSessionId = `session_${Date.now()}`
      setCurrentSessionId(newSessionId)
      setIsNewSession(true)
    }
  }, [])

  // 初始化
  useEffect(() => {
    // 🔥 检查是否有待处理的输入（从 localStorage 恢复并保存到数据库）
    try {
      const pendingInput = localStorage.getItem('chat-new-pending-input')
      const pendingTimestamp = localStorage.getItem('chat-new-pending-timestamp')
      
      if (pendingInput && pendingTimestamp) {
        const timestamp = parseInt(pendingTimestamp, 10)
        const now = Date.now()
        // 如果待处理输入在 30 秒内，尝试恢复并保存到数据库
        if (now - timestamp < 30000) {
          console.log('🔄 [CHAT-NEW] 检测到待处理的输入，尝试恢复并保存到数据库:', pendingInput)
          setInputValue(pendingInput)
          
          // 尝试保存到数据库
          saveSession().then(() => {
            console.log('✅ [CHAT-NEW] 待处理输入已保存到数据库')
            // 清除 localStorage 中的备份
            localStorage.removeItem('chat-new-pending-input')
            localStorage.removeItem('chat-new-pending-timestamp')
          }).catch((error) => {
            console.warn('⚠️ [CHAT-NEW] 保存待处理输入到数据库失败，保留在 localStorage:', error)
            // 如果保存失败，保留在 localStorage，等待下次尝试
          })
        } else {
          // 超过 30 秒，清除
          console.log('⚠️ [CHAT-NEW] 待处理输入已过期，清除')
          localStorage.removeItem('chat-new-pending-input')
          localStorage.removeItem('chat-new-pending-timestamp')
        }
      }
    } catch (e) {
      console.warn('⚠️ [CHAT-NEW] 无法读取 localStorage:', e)
    }
    
    // 如果没有 prompt 或 continueId，确保页面处于正确状态
    if (!urlPrompt && !continueId) {
      console.log('📝 [CHAT-NEW] 没有 prompt 或 continueId，等待用户输入')
      setStep('questions') // 设置为 questions 状态，允许用户输入
      setIsLoading(false)
      return
    }
    
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
      answersRef.current = []  // 🔥 同步重置ref
      setQuestions([])
      questionsRef.current = []  // 🔥 同步重置ref
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
          console.log('📝 [CHAT-NEW] Preparing to call generateFirstQuestion function')
          console.log('📝 [CHAT-NEW] Starting to generate first question...', currentPrompt)
          
          // Get user info from Prisma database (with timeout handling)
          let userInfoFromAPI = null
          try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 10000) // 10 second timeout
            
            try {
              const userResponse = await fetch('/api/user/info', {
                signal: controller.signal
              })
              clearTimeout(timeoutId)
              
              if (userResponse.ok) {
                const userData = await userResponse.json()
                userInfoFromAPI = userData
                console.log('✅ [CHAT-NEW] Using user info from Prisma database:', {
                  name: userData.userInfo?.name,
                  age: userData.userInfo?.age,
                  location: userData.userInfo?.location
                })
              }
            } catch (fetchError: any) {
              clearTimeout(timeoutId)
              if (fetchError.name === 'AbortError') {
                console.log('⏱️ [CHAT-NEW] User info fetch timeout, using fallback')
              } else {
                throw fetchError
              }
            }
          } catch (error) {
            console.log('⚠️ [CHAT-NEW] Failed to get Prisma user info, using localStorage or default config:', error)
            // If database connection fails, use localStorage as fallback
            const userInfo = await getUserInfo()
            const userInfoDescription = getUserInfoDescription()
            console.log('📊 [CHAT-NEW] localStorage user info:', userInfoDescription)
            
            if (!userInfo || !userInfoDescription) {
              console.warn('⚠️ [CHAT-NEW] No user info available, using default config')
            }
          }
          
      const firstQuestionText = await generateFirstQuestion()
      console.log('📝 [CHAT-NEW] API response:', { firstQuestion: firstQuestionText })
      console.log('📝 [CHAT-NEW] firstQuestionText type:', typeof firstQuestionText)
      console.log('📝 [CHAT-NEW] firstQuestionText length:', firstQuestionText?.length)
      
      if (firstQuestionText) {
        console.log(`✅ [CHAT-NEW] Generated first question:`, firstQuestionText)
            
            // Save first question to state
        setQuestions([firstQuestionText])
        questionsRef.current = [firstQuestionText]  // 🔥 Sync update ref
        setAskedQuestions([firstQuestionText])
            
            // Add first question to messages
            setMessages(prev => [...prev, {
          id: `assistant-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              type: 'assistant',
          content: firstQuestionText
            }])
            
            setApiStatus('active')
            setStep('questions')
            setCurrentQuestionIndex(0)
            console.log(`✅ [CHAT-NEW] First question displayed, waiting for user answer to dynamically generate next`)
          } else {
            console.log('⚠️ [CHAT-NEW] API did not return question, generating directly with initial input')
            setApiStatus('fallback')
            // Generate directly with initial input, pass currentPrompt
            try {
              await generateInChat([currentPrompt], currentPrompt)
            } catch (genError) {
              console.error('💥 [CHAT-NEW] Failed to generate in chat:', genError)
            }
          }
          
        } catch (error) {
          console.error('💥 [CHAT-NEW] Failed to generate first question:', error)
          
          // API call failed, generate directly with initial input, pass currentPrompt
          console.log('💥 [CHAT-NEW] API call failed, generating directly with initial input')
          try {
            await generateInChat([currentPrompt], currentPrompt)
          } catch (genError) {
            console.error('💥 [CHAT-NEW] Failed to generate in chat after error:', genError)
          }
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
      // First parameter: current input (first time is initialPrompt)
      // Second parameter: meta input (initialPrompt, most important)
      // Third parameter: previous answers (empty first time)
      // Fourth parameter: previous questions (empty first time)
      console.log('📝 [CHAT-NEW] Calling generateDeepQuestions with:', {
        userInput: initialPrompt,
        initialPrompt,
        previousAnswers: [],
        previousQuestions: []
      })
      
      const response = await generateDeepQuestions(initialPrompt, initialPrompt, [], [])
      
      console.log('📝 [CHAT-NEW] generateDeepQuestions response:', response)
      
      if (response.success && response.questions && response.questions.length > 0) {
        console.log(`📋 [CHAT-NEW] API generated ${response.questions.length} questions:`, response.questions)
        return response.questions[0] // Only return first question
      }
      
      console.warn('⚠️ [CHAT-NEW] No questions generated from API')
      return null
    } catch (error) {
      console.error('💥 [CHAT-NEW] Failed to generate question:', error)
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
    if (messages.length > 0 && currentSessionId) {
      const timer = setTimeout(() => {
        saveSession()
      }, 1000) // 延迟1秒保存，避免频繁保存
      
      return () => clearTimeout(timer)
    }
  }, [messages, answers, currentSessionId])

  // 停止生成
  const handleStopGeneration = () => {
    console.log('🛑 [CHAT-NEW] 用户请求停止生成')
    
    // 中止所有正在进行的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    // 完全重置状态，确保可以立即开始新的生图
    setIsLoading(false)
    setIsGenerating(false)
    
    // 显示停止消息
    setMessages(prev => [...prev, {
      id: `system-stopped-${Date.now()}`,
      type: 'system',
      content: '⏸️ 生成已停止，您可以继续对话或直接生图'
    }])
    
    console.log('✅ [CHAT-NEW] 已重置所有状态，可以立即开始新的生图')
  }

  // 处理用户输入（智能区分回答问题 vs 新想法）
  const handleSendMessage = async () => {
    // 🔥 确保停止后可以立即发送新消息
    if (!inputValue.trim()) return
    if (isLoading || isGenerating) {
      console.log('⚠️ [CHAT-NEW] 正在生成中，无法发送消息')
      return
    }

    const userInput = inputValue.trim()
    console.log('💬 [CHAT-NEW] 用户输入:', userInput)
    
    // 🔥 优先保存到云端数据库（作为草稿），如果失败则保存到 localStorage 作为备份
    try {
      // 尝试立即保存到数据库
      await saveSession()
      console.log('✅ [CHAT-NEW] 用户输入已保存到云端数据库')
      // 清除 localStorage 中的备份（如果存在）
      localStorage.removeItem('chat-new-pending-input')
      localStorage.removeItem('chat-new-pending-timestamp')
    } catch (error: any) {
      // 如果保存到数据库失败（可能是 401），保存到 localStorage 作为备份
      console.warn('⚠️ [CHAT-NEW] 保存到数据库失败，保存到 localStorage 作为备份:', error)
      try {
        localStorage.setItem('chat-new-pending-input', userInput)
        localStorage.setItem('chat-new-pending-timestamp', Date.now().toString())
        console.log('✅ [CHAT-NEW] 用户输入已保存到 localStorage 作为备份')
      } catch (e) {
        console.warn('⚠️ [CHAT-NEW] 无法保存输入到 localStorage:', e)
      }
    }
    
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
    
    // 🔍 判断：AI是否问了问题（用户是否在回答）
    // 🔥 使用 questionsRef 和 answersRef 而不是 state，避免React state更新延迟导致误判
    const hasActiveQuestion = questionsRef.current.length > 0 && answersRef.current.length < questionsRef.current.length
    
    console.log('🔍 [CHAT-NEW] 判断用户输入类型:')
    console.log(`  - questions.length (state): ${questions.length}`)
    console.log(`  - questionsRef.current.length (ref): ${questionsRef.current.length}`)
    console.log(`  - answers.length (state): ${answers.length}`)
    console.log(`  - answersRef.current.length (ref): ${answersRef.current.length}`)
    console.log(`  - currentQuestionIndex: ${currentQuestionIndex}`)
    console.log(`  - hasActiveQuestion: ${hasActiveQuestion}`)
    
    // === 路径1：新键入（AI没问问题，用户主动说） ===
    if (!hasActiveQuestion) {
      console.log('💡 [CHAT-NEW] AI没问问题，识别为新键入')
      console.log(`🔍 [CHAT-NEW] 当前initialPrompt: "${initialPrompt}"`)
      console.log(`🔍 [CHAT-NEW] 当前answers数量: ${answers.length}`)
      console.log(`🔍 [CHAT-NEW] 当前questions数量: ${questions.length}`)
      
      // 🚨 关键修复：只在真正的新对话开始时设置initialPrompt
      // 如果已经有answers（说明正在对话中），不应该改变initialPrompt
      if (answers.length === 0 && questions.length === 0) {
        console.log('✅ [CHAT-NEW] 确认为新对话，设置initialPrompt')
        setInitialPrompt(userInput)
      } else {
        console.warn('⚠️ [CHAT-NEW] 检测到异常：对话中途被判定为新键入，保持原initialPrompt不变')
        console.warn(`⚠️ [CHAT-NEW] 保持原initialPrompt: "${initialPrompt}"`)
        // 不修改initialPrompt，继续用原来的
      }
      
      // 重置answers（新一轮对话开始）
      setAnswers([])
      answersRef.current = []  // 🔥 同步重置ref
      
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
            
            const updatedQuestions = [...questions, newQuestion]
            setQuestions(updatedQuestions)
            questionsRef.current = updatedQuestions  // 🔥 同步更新ref
            console.log(`✅ [CHAT-NEW] 问题已添加，当前问题数: ${updatedQuestions.length}`)
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
        } catch (error: any) {
          console.error('❌ [CHAT-NEW] 生成问题失败:', error)
          setMessages(prev => prev.filter(m => m.id !== 'assistant-thinking'))
          
          // 🔥 如果是未登录错误，提示用户重新登录，但不自动跳转（避免循环）
          if (error?.message?.includes('未登录') || error?.message?.includes('用户未登录')) {
            setMessages(prev => [...prev, {
              id: `error-${Date.now()}`,
              type: 'system',
              content: '⚠️ 登录状态已过期，请刷新页面重新登录'
            }])
          } else {
            // 其他错误，直接生成
            console.log('⚠️ [CHAT-NEW] 生成问题失败，直接生成内容')
            generateInChat([userInput])
          }
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
    answersRef.current = newAnswers  // 🔥 同步更新ref，立即生效
    console.log(`✅ [CHAT-NEW] 回答已添加，当前回答数: ${newAnswers.length}`)
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
        // 🚨 强制3轮对话上限检查（在前端也检查一次）
        console.log(`🔍 [CHAT-NEW] 3轮检查 - 当前回答数: ${newAnswers.length}`)
        console.log(`🔍 [CHAT-NEW] 3轮检查 - 所有回答:`, newAnswers)
        
        if (newAnswers.length >= 3) {
          console.log('🚨 [CHAT-NEW] 已达到3轮对话上限，停止提问，开始生成')
          setMessages(prev => prev.filter(m => !m.id.includes('assistant-processing')))
          generateInChat(newAnswers)
          return
        }
        
        console.log('✅ [CHAT-NEW] 未达到3轮上限，继续生成问题')
        
        // 对话过程中不再计数（生图时才计数）
        console.log(`🔍 [CHAT-NEW] 当前问题索引: ${currentQuestionIndex}, 问题总数: ${questions.length}`)
        console.log(`📝 [CHAT-NEW] 当前所有回答:`, newAnswers)
        
        // 基于当前所有回答，让AI动态判断是否需要继续提问
        const response = await generateDeepQuestions(initialPrompt, initialPrompt, newAnswers, questions)
        
        if (response.success && response.questions && response.questions.length > 0) {
          // 生成新问题成功
          const nextQuestion = response.questions[0] // 取第一个问题
          console.log(`✅ [CHAT-NEW] 动态生成新问题: ${nextQuestion}`)
          
          // 更新问题数组
          const updatedQuestions = [...questions, nextQuestion]
          setQuestions(updatedQuestions)
          questionsRef.current = updatedQuestions  // 🔥 同步更新ref
          console.log(`✅ [CHAT-NEW] 问题已添加，当前问题数: ${updatedQuestions.length}`)
          
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
          return
        }
      } catch (error: any) {
        console.error(`💥 [CHAT-NEW] 动态生成问题失败:`, error)
        
        // 🔥 如果是未登录错误，提示用户重新登录，但不自动跳转（避免循环）
        if (error?.message?.includes('未登录') || error?.message?.includes('用户未登录')) {
          setMessages(prev => prev.filter(m => !m.id.includes('assistant-processing')).concat([{
            id: `error-${Date.now()}`,
            type: 'system',
            content: '⚠️ 登录状态已过期，请刷新页面重新登录'
          }]))
        } else {
          // 如果出错，开始生成内容
          setMessages(prev => prev.filter(m => !m.id.includes('assistant-processing')))
          generateInChat(newAnswers)
        }
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
      console.log('⚠️ [CHAT-NEW] 获取Prisma用户信息失败，使用localStorage或默认配置')
      // 如果没有数据库连接，使用默认用户信息
      userInfoFromAPI = {
        userInfo: {
          name: '用户',
          age: 25,
          location: '未知',
          gender: 'unknown',
          height: 170,
          weight: 60,
          personality: '待了解'
        },
        userMetadata: null
      }
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
      const userInfo = await getUserInfo()
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

  // 🔥 处理场景显示的函数
  const processScenesForDisplay = (scenes: any[]) => {
    // 处理心理剧场景
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
      }
    })
    
    // 开始生图
    scenes.forEach((scene: any, index: number) => {
      const imagePrompt = scene.detailedPrompt || scene.description || scene.imagePrompt
      if (imagePrompt) {
        // 直接调用现有的生图逻辑
        generateImageForScene(scene, index, scenes)
      }
    })
  }

  // 🔥 为新增场景生成图片的函数（并行生成）
  const generateImagesForNewScenes = async (
    newScenes: any[], 
    startIndex: number,
    actualPrompt: string,
    answersWithContext: string[],
    questions: string[]
  ) => {
    console.log(`🎨 [CHAT-NEW] 开始为新增场景并行生成图片，从索引 ${startIndex} 开始`)
    console.log(`📊 [CHAT-NEW] 新增场景数量: ${newScenes.length}`)
    console.log(`📋 [CHAT-NEW] 新增场景列表:`, newScenes.map(s => ({
      title: s.title || s.emotionalTrigger || s.opinionText,
      isPsychodrama: s.isPsychodrama,
      isOpinionScene: s.isOpinionScene,
      hasImagePrompt: !!s.imagePrompt
    })))
    
    // 🔥 设置生成状态，防止用户在生成过程中输入
    setIsGenerating(true)
    setIsLoading(true)
    
    if (newScenes.length === 0) {
      console.log('⚠️ [CHAT-NEW] 没有新增场景需要生成图片')
      // 🔥 即使没有新增场景，也要在基础场景图片完成后更新元数据
      // 但由于这个函数是在基础场景生成完成后才调用的，我们需要执行元数据更新
      console.log('💾 [CHAT-NEW] 没有新增场景，在基础场景完成后执行元数据更新...')
      Promise.resolve().then(async () => {
        await updateMetadataAfterAllImages(actualPrompt, answersWithContext, questions)
      }).catch(error => {
        console.error('❌ [CHAT-NEW] 元数据更新异常（不影响前端）:', error)
      })
      // 🔥 没有场景需要生成，重置状态
      setIsGenerating(false)
      setIsLoading(false)
      return
    }
    
    // ⚡ 并行生成所有新增场景的图片
    const imagePromises = newScenes.map(async (scene, i) => {
      const globalIndex = startIndex + i
      
      console.log(`🎨 [CHAT-NEW] 并行处理新增场景 ${globalIndex + 1}: ${scene.title || scene.emotionalTrigger || scene.sceneTitle || '未知场景'}`)
      
      // 🔥 添加占位消息（使用唯一ID，避免不同批次的场景ID冲突）
      const placeholderId = `image-placeholder-${globalIndex}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      setMessages(prev => [...prev, {
        id: placeholderId,
        type: 'system',
        content: `⚡ 正在创作第 ${globalIndex + 1} 幅作品...`
      }])
      
      try {
        // 根据场景类型选择正确的提示词字段
        let imagePrompt = scene.isPsychodrama 
          ? scene.imagePrompt  // 心理剧使用imagePrompt
          : scene.isHypothetical
            ? scene.imagePrompt  // 假定场景使用imagePrompt
            : scene.isOpinionScene
              ? scene.imagePrompt  // 观点场景使用imagePrompt
              : scene.detailedPrompt || scene.description  // 普通场景使用detailedPrompt或description
        
        // 🔥 调试：打印场景对象的详细信息
        console.log(`🔍 [CHAT-NEW] 新增场景 ${globalIndex + 1} 详细信息:`, {
          title: scene.title,
          emotionalTrigger: scene.emotionalTrigger,
          sceneTitle: scene.sceneTitle,
          isPsychodrama: scene.isPsychodrama,
          isHypothetical: scene.isHypothetical,
          isOpinionScene: scene.isOpinionScene,
          hasImagePrompt: !!scene.imagePrompt,
          hasDetailedPrompt: !!scene.detailedPrompt,
          hasDescription: !!scene.description,
          imagePrompt: scene.imagePrompt?.substring(0, 100) + '...',
          detailedPrompt: scene.detailedPrompt?.substring(0, 100) + '...',
          description: scene.description?.substring(0, 100) + '...',
          // 🔥 打印完整的场景对象
          fullScene: scene
        })
        
        // 🔥 根据场景类型确定标题
        let sceneTitle = scene.title || scene.emotionalTrigger || scene.sceneTitle || `场景 ${globalIndex + 1}`
        if (scene.isOpinionScene && scene.opinionText) {
          sceneTitle = `观点：${scene.opinionText}`
        }
        console.log(`🎯 [CHAT-NEW] 场景 ${globalIndex + 1} 最终标题:`, sceneTitle)
        
        if (!imagePrompt || imagePrompt.trim() === '') {
          console.error(`❌ [CHAT-NEW] 新增场景 ${globalIndex + 1} 缺少提示词`)
          setMessages(prev => prev.map(msg => 
            msg.id === placeholderId
              ? { ...msg, content: `❌ 场景 ${globalIndex + 1} 缺少提示词` }
              : msg
          ))
          return // 在map中使用return代替continue
        }
        
        console.log(`✅ [CHAT-NEW] 新增场景 ${globalIndex + 1} 图片提示词已准备:`, imagePrompt.substring(0, 200) + '...')
        
        // 调用SeeDream API生成图片
        const imageResponse = await fetch('/api/seedream-generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: imagePrompt,
            negativePrompt: "low quality, blurry, distorted, text, words, letters, numbers, age, height, personal information text, 26岁, 165cm, any text overlay, watermark, captions, labels",
            width: 1024,
            height: 1024
          })
        })
        
        if (imageResponse.ok) {
          const imageData = await imageResponse.json()
          
          // 获取场景的故事
          const sceneStory = scene.storyFragment || scene.sceneDescription_CN || ''
          
          // 🔥 立即替换占位消息为图片+故事的组合（生完图立即返回前端）
          const imageId = `image-${globalIndex}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          
          setMessages(prev => prev.map(msg => 
            msg.id === placeholderId
              ? {
                  id: imageId,
                  type: 'image',
                  content: sceneTitle, // 使用之前确定的场景标题
                  story: sceneStory,
                  imageUrl: imageData.imageUrl,
                  sceneData: scene,
                  sceneIndex: globalIndex
                }
              : msg
          ))
          
          // 💾 收集图片数据用于保存（额外场景）
          updateGeneratedImagesData(prev => {
            const newIndex = prev.length
            return [...prev, {
              imageUrl: imageData.imageUrl,
              story: sceneStory,
              sceneTitle: sceneTitle,
              sceneIndex: globalIndex, // 🔥 使用globalIndex而不是newIndex，保持逻辑顺序
              prompt: sceneStory
            }]
          })
          
          console.log(`✅ [CHAT-NEW] 新增场景 ${globalIndex + 1} 图片已立即返回前端`)
          
          // 增加生图计数
          setGeneratedImagesCount(prev => {
            const newCount = prev + 1
            console.log(`📊 [CHAT-NEW] 已生成图片数: ${newCount}/${MAX_GENERATED_IMAGES}`)
            return newCount
          })
          
          console.log(`✅ [CHAT-NEW] 新增场景 ${globalIndex + 1} 图片生成成功`)
        } else {
          const errorData = await imageResponse.json().catch(() => ({}))
          const errorMsg = errorData.error || imageResponse.statusText || '未知错误'
          console.error(`❌ [CHAT-NEW] 新增场景 ${globalIndex + 1} API错误:`, {
            status: imageResponse.status,
            statusText: imageResponse.statusText,
            error: errorData
          })
          
          setMessages(prev => prev.map(msg => 
            msg.id === placeholderId
              ? { ...msg, content: `❌ 第 ${globalIndex + 1} 幅创作失败: ${errorMsg}` }
              : msg
          ))
        }
      } catch (error) {
        console.error(`❌ [CHAT-NEW] 新增场景 ${globalIndex + 1} 生成失败:`, error)
          setMessages(prev => prev.map(msg => 
            msg.id === placeholderId
              ? { ...msg, content: `❌ 第 ${globalIndex + 1} 幅创作失败` }
              : msg
          ))
      }
    })
    
    try {
      // ⚡ 等待所有图片生成完成（并行执行）
      await Promise.allSettled(imagePromises)
      
      console.log(`✅ [CHAT-NEW] 新增场景图片生成完成（并行完成）`)
      
      // 🔥 不在这里显示完成消息，由外部统一管理
      // （因为 generateImagesForNewScenes 会被多次调用，每批生成都会触发）
      
      // 🔥🔥🔥 所有图片生成完成后，才执行元数据更新（不阻塞前端）
      await updateMetadataAfterAllImages(actualPrompt, answersWithContext, questions)
    } catch (error) {
      console.error('❌ [CHAT-NEW] 新增场景生成过程出错:', error)
    }
    // 🔥 注意：不在这里重置状态，由外部统一管理所有批次的状态
  }
  
  // 🔥 元数据更新函数（提取为独立函数，确保在生完所有图后才执行）
  const updateMetadataAfterAllImages = async (
    actualPrompt: string,
    answersWithContext: string[],
    questions: string[]
  ) => {
    Promise.resolve().then(async () => {
      console.log('💾 [CHAT-NEW] 所有图片已生成完成，开始保存用户原始输入和更新元数据（后台异步）...')
      
      try {
        // 1. 保存用户原始输入
        const { saveUserRawInput } = await import('../../lib/userRawInputService')
        
        // 保存元键入（新的初始输入）
        await saveUserRawInput(actualPrompt, '元键入')
        
        // 保存所有回答
        for (let i = 0; i < answersWithContext.length; i++) {
          const question = questions?.[i] || `问题${i + 1}`
          await saveUserRawInput(answersWithContext[i], question)
        }
        
        console.log('✅ [CHAT-NEW] 用户原始输入已保存（后台完成）')
      } catch (error) {
        console.error('❌ [CHAT-NEW] 保存用户原始输入失败（不影响前端）:', error)
      }
      
      try {
        // 2. 更新用户元数据（在所有图片生成完成后）
        console.log('🧠 [CHAT-NEW] 开始分析整个对话，更新元数据（后台异步）...')
        
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
        
        console.log('✅ [CHAT-NEW] 元数据更新完成（后台完成，不影响前端）')
      } catch (error) {
        console.error('❌ [CHAT-NEW] 元数据分析失败（不影响前端）:', error)
      }
    }).catch(error => {
      console.error('❌ [CHAT-NEW] 保存和更新操作异常（不影响前端）:', error)
    })
  }

  // 🔥 为单个场景生图的函数
  const generateImageForScene = async (scene: any, index: number, allScenes: any[]) => {
    const imagePrompt = scene.detailedPrompt || scene.description || scene.imagePrompt
    if (!imagePrompt) {
      console.log(`❌ [CHAT-NEW] 场景 ${index + 1} 缺少提示词`)
      return
    }
    
    try {
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
      })
      
      if (imageResponse.ok) {
        const imageData = await imageResponse.json()
        
        // 获取场景的故事
        const sceneStory = scene.storyFragment
        
        // 替换占位消息为图片+故事的组合
        const imageId = `image-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        setMessages(prev => prev.map(msg => 
          msg.id === `placeholder-${index}`
            ? {
                id: imageId,
                type: 'image',
                content: sceneStory || '',
                imageUrl: imageData.imageUrl,
                sceneData: scene
              }
            : msg
        ))
        
        console.log(`✅ [CHAT-NEW] 场景 ${index + 1} 图片生成完成`)
      } else {
        console.error(`❌ [CHAT-NEW] 场景 ${index + 1} 图片生成失败:`, imageResponse.status)
      }
    } catch (error) {
      console.error(`❌ [CHAT-NEW] 场景 ${index + 1} 生图错误:`, error)
    }
  }

  // 🆕 在对话框中生成内容
  const generateInChat = async (finalAnswers: string[], promptToUse?: string) => {
    // 创建新的 AbortController
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal
    
    setIsGenerating(true)
    setIsLoading(true)
    
    // 🔥 在函数作用域声明contentResult，确保finally块可以访问
    let contentResult: any = null
    
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
      console.log('⚠️ [CHAT-NEW] 跳过权限检查，直接允许生图（可能是数据库未连接）')
      // 如果检查失败（比如数据库没连上），允许继续生成（避免阻塞用户体验）
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
      
      // 🔥 确保问题列表与回答列表对应（只使用与当前answers对应的问题）
      // 如果answers为空，questions也应该为空
      // 如果answers有3个，questions应该只取前3个
      const matchingQuestions = answersWithContext.length > 0 
        ? questions.slice(0, answersWithContext.length)
        : []
      
      console.log('📊 [CHAT-NEW] 场景生成参数:')
      console.log('  - 元键入:', actualPrompt)
      console.log('  - 回答数量:', answersWithContext.length)
      console.log('  - 回答内容:', answersWithContext)
      console.log('  - 问题数量:', matchingQuestions.length)
      console.log('  - 问题内容:', matchingQuestions)
      console.log('  - 状态中总问题数:', questions.length)
      console.log('  - 状态中所有问题:', questions)
      
      // 🔥 检查问题是否与回答匹配
      if (matchingQuestions.length !== answersWithContext.length) {
        console.warn(`⚠️ [CHAT-NEW] 问题数量(${matchingQuestions.length})与回答数量(${answersWithContext.length})不匹配`)
      }
      
      // 1. 生成内容（场景、故事、心理剧）
      // actualPrompt = 当前键入（生成场景的核心）
      // answersWithContext = 历史背景 + 用户回答（提供上下文）
      contentResult = await ContentGenerationService.generateQuickContent({
        initialPrompt: actualPrompt,
        answers: answersWithContext,
        questions: matchingQuestions, // 🔥 使用匹配的问题列表，而不是状态中的所有问题
        contextHistory: contextHistory ? [contextHistory] : [] // 传入历史背景，让场景生成知道
      })
      // 2. 准备基础场景数据（立即处理）
      const logicalScenes = contentResult.scenes?.logicalScenes
      
      // 🔥 使用基础场景
      const scenes = Array.isArray(logicalScenes) 
        ? logicalScenes 
        : logicalScenes 
          ? Object.values(logicalScenes) 
          : []
      
      // 🔥 基础场景立即开始生图
      const sceneNames = scenes.map((s: any) => s.title).join('、')
      setMessages(prev => prev.map(msg => 
        msg.id === progressId 
          ? { ...msg, content: `✅ 场景已生成：${sceneNames}\n🎨 开始创作画面...` }
          : msg
      ))
      
      // 🔥 后台并行检测观点和心理剧（基于用户输入，不阻塞基础场景生图）
      if (contentResult.needsAdditionalGeneration) {
        console.log('🔄 [CHAT-NEW] 启动后台并行检测观点和情绪（基于用户输入）...')
        
        // 🔥 显示检测提示
        setMessages(prev => [...prev, {
          id: `detecting-${Date.now()}`,
          type: 'system',
          content: '🔍 正在检测您的观点和情绪...'
        }])
        
        // 获取用户信息
        const userInfo = await getUserInfo()
        const userMetadata = await getUserMetadata()
        
        // 🔥 后台并行生成观点和心理剧（不阻塞基础场景生图）
        console.log('🚀 [CHAT-NEW] 开始调用 generateAdditionalContent...')
        ContentGenerationService.generateAdditionalContent(
          actualPrompt,  // 🔥 基于用户键入检测
          answersWithContext,
          questions,
          userInfo,
          userMetadata
        ).then((additionalResults) => {
          console.log('✅ [CHAT-NEW] 后台生成完成，收到结果!')
          console.log('📦 [CHAT-NEW] 结果对象:', additionalResults)
          
          // 🔥 调试：打印每个生成结果的详细信息
          console.log('🔍 [CHAT-NEW] 后台生成结果详情:')
          if (additionalResults.opinionScenes?.length > 0) {
            console.log('🎯 观点场景详情:', additionalResults.opinionScenes.map((scene, i) => ({
              index: i,
              title: scene.title,
              isOpinionScene: scene.isOpinionScene,
              opinionText: scene.opinionText,
              hasImagePrompt: !!scene.imagePrompt,
              imagePrompt: scene.imagePrompt?.substring(0, 100) + '...',
              fullScene: scene
            })))
          }
          if (additionalResults.psychodramaScene) {
            console.log('🎭 心理剧场景详情:', {
              title: additionalResults.psychodramaScene.title || additionalResults.psychodramaScene.emotionalTrigger,
              emotionalTrigger: additionalResults.psychodramaScene.emotionalTrigger,
              isPsychodrama: additionalResults.psychodramaScene.isPsychodrama,
              hasImagePrompt: !!additionalResults.psychodramaScene.imagePrompt,
              imagePrompt: additionalResults.psychodramaScene.imagePrompt?.substring(0, 100) + '...',
              fullScene: additionalResults.psychodramaScene
            })
          }
          
          // 🔥 收集新增场景和所有生成Promise
          const newScenes: any[] = []
          const generationPromises: Promise<void>[] = [] // 🔥 收集所有生成Promise
          
          // 🔥 计算正确的起始索引，确保sceneIndex不冲突
          const baseSceneCount = scenes.length // 基础场景数量
          let currentIndex = baseSceneCount // 从基础场景数量之后开始
          
          // 🎭 心理剧场景（第一优先级）- 🔥 生成后立即生图
          if (additionalResults.psychodramaScene) {
            // 🔥 确保心理剧字段正确传递
            const psychodramaScene = {
              ...additionalResults.psychodramaScene,
              isPsychodrama: true,
              imagePrompt: additionalResults.psychodramaScene.imagePrompt || additionalResults.psychodramaScene.detailedPrompt,
              title: additionalResults.psychodramaScene.title || additionalResults.psychodramaScene.emotionalTrigger || '心理剧场景',
              storyFragment: (() => {
                const parts: string[] = []
                if (additionalResults.psychodramaScene.innerMonologue) {
                  parts.push(`内心独白："${additionalResults.psychodramaScene.innerMonologue}"`)
                }
                if (additionalResults.psychodramaScene.surfaceVsInner) {
                  parts.push(`表面vs内心：${additionalResults.psychodramaScene.surfaceVsInner}`)
                }
                if (additionalResults.psychodramaScene.consciousnessStream) {
                  parts.push(`意识流：${additionalResults.psychodramaScene.consciousnessStream}`)
                }
                if (additionalResults.psychodramaScene.psychologicalSymbolism) {
                  parts.push(`心理象征：${additionalResults.psychodramaScene.psychologicalSymbolism}`)
                }
                return parts.length > 0 ? parts.join('\n\n') : additionalResults.psychodramaScene.sceneDescription_CN || ''
              })()
            }
            newScenes.push(psychodramaScene)
            console.log('🎭 [CHAT-NEW] 心理剧场景准备生图（优先级最高）:', {
              title: psychodramaScene.title,
              isPsychodrama: psychodramaScene.isPsychodrama,
              hasImagePrompt: !!psychodramaScene.imagePrompt
            })
            
            // 🔥 立即为心理剧生图，使用正确的起始索引
            const psychodramaStartIndex = currentIndex
            console.log('⚡ [CHAT-NEW] 第2批：心理剧场景立即生图，起始索引:', psychodramaStartIndex)
            generationPromises.push(generateImagesForNewScenes([psychodramaScene], psychodramaStartIndex, actualPrompt, answersWithContext, questions))
            currentIndex += 1 // 心理剧场景数量（通常是1个）
          }
          
          // 🎬 假想场景（第二优先级）- 🔥 生成后立即生图
          if (additionalResults.hypotheticalScene) {
            // 兼容性处理：可能是数组或单个对象
            const hypotheticalScenes = Array.isArray(additionalResults.hypotheticalScene) 
              ? additionalResults.hypotheticalScene 
              : [additionalResults.hypotheticalScene]
            
            const processedHypotheticalScenes: any[] = []
            hypotheticalScenes.forEach((scene: any) => {
              const hypotheticalScene = {
                ...scene,
                isHypothetical: true,
                imagePrompt: scene.imagePrompt || scene.detailedPrompt,
                title: scene.title || '假想场景',
                storyFragment: scene.sceneDescription_CN || scene.sceneDescription_EN || ''
              }
              newScenes.push(hypotheticalScene)
              processedHypotheticalScenes.push(hypotheticalScene)
              console.log('🎬 [CHAT-NEW] 假想场景准备生图:', {
                title: hypotheticalScene.title,
                isHypothetical: hypotheticalScene.isHypothetical,
                hasImagePrompt: !!hypotheticalScene.imagePrompt,
                location: hypotheticalScene.location
              })
            })
            
            // 🔥 立即为假想场景生图，使用正确的起始索引
            if (processedHypotheticalScenes.length > 0) {
              const hypotheticalStartIndex = currentIndex
              console.log(`⚡ [CHAT-NEW] 第3批：假想场景立即生图（共${processedHypotheticalScenes.length}个），起始索引:`, hypotheticalStartIndex)
              generationPromises.push(generateImagesForNewScenes(processedHypotheticalScenes, hypotheticalStartIndex, actualPrompt, answersWithContext, questions))
              currentIndex += processedHypotheticalScenes.length
            }
          }
          
          // 🎯 观点场景（第三优先级）- 🔥 生成后立即生图
          if (additionalResults.opinionScenes?.length > 0) {
            const processedOpinionScenes: any[] = []
            additionalResults.opinionScenes.forEach((scene: any) => {
              // 🔥 确保字段正确传递
              const opinionScene = {
                ...scene,
                isOpinionScene: true,  // 🔥 确保正确标识
                imagePrompt: scene.imagePrompt,  // 🔥 确保imagePrompt存在
                opinionText: scene.opinionText || scene.opinion || scene.title?.replace('观点：', ''),  // 🔥 确保opinionText存在
                storyFragment: scene.storyFragment || ''  // 🔥 只使用storyFragment（人文叙事），不使用sceneDescription_CN（技术性描述）
              }
              newScenes.push(opinionScene)
              processedOpinionScenes.push(opinionScene)
              console.log('🎯 [CHAT-NEW] 观点场景准备生图:', {
                title: opinionScene.title,
                isOpinionScene: opinionScene.isOpinionScene,
                hasImagePrompt: !!opinionScene.imagePrompt,
                opinionText: opinionScene.opinionText
              })
            })
            
            // 🔥 立即为观点场景生图，使用正确的起始索引
            if (processedOpinionScenes.length > 0) {
              const opinionStartIndex = currentIndex
              console.log(`⚡ [CHAT-NEW] 第4批：观点场景立即生图（共${processedOpinionScenes.length}个），起始索引:`, opinionStartIndex)
              generationPromises.push(generateImagesForNewScenes(processedOpinionScenes, opinionStartIndex, actualPrompt, answersWithContext, questions))
              currentIndex += processedOpinionScenes.length
            }
          }
          
          // 🔥 等待所有批次生成完成，然后保存和重置状态
          if (generationPromises.length > 0) {
            Promise.allSettled(generationPromises).then(async () => {
              console.log('✅ [CHAT-NEW] 所有额外场景已分批生图完成')
              
              // 🔥 等待状态更新，确保所有图片数据都已添加到 generatedImagesData
              await new Promise(resolve => setTimeout(resolve, 1000))
              
              // 🔥 重新保存内容，更新images字段（包含所有分批生成的图片）
              if (savedContentId) {
                // 🔥 使用ref获取最新的图片数据（避免状态更新延迟问题）
                const latestImages = generatedImagesDataRef.current
                console.log('💾 [CHAT-NEW] 更新已保存的内容，添加分批生成的图片...')
                console.log('💾 [CHAT-NEW] 当前图片总数:', latestImages.length)
                console.log('💾 [CHAT-NEW] 图片详情:', latestImages.map(img => ({
                  sceneIndex: img.sceneIndex,
                  title: img.sceneTitle,
                  hasUrl: !!img.imageUrl
                })))
                
                try {
                  // 按逻辑顺序排序
                  const sortedImages = [...latestImages].sort((a, b) => a.sceneIndex - b.sceneIndex)
                  
                  // 更新内容（只更新images字段）
                  const updateResponse = await fetch(`/api/user/generated-content/${savedContentId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      images: sortedImages,
                      imageCount: sortedImages.length
                    })
                  })
                  
                  if (updateResponse.ok) {
                    console.log('✅ [CHAT-NEW] 内容已更新，包含所有分批生成的图片')
                  } else {
                    console.error('❌ [CHAT-NEW] 更新内容失败:', await updateResponse.json())
                  }
                } catch (error) {
                  console.error('❌ [CHAT-NEW] 更新内容异常:', error)
                }
              }
              
              // 🔥 所有批次完成后，重置状态
              setIsGenerating(false)
              setIsLoading(false)
            }).catch((error) => {
              console.error('❌ [CHAT-NEW] 部分批次生成失败:', error)
              // 即使有失败，也重置状态
              setIsGenerating(false)
              setIsLoading(false)
            })
          } else {
            // 如果没有需要生成的场景，立即重置状态
            setIsGenerating(false)
            setIsLoading(false)
          }
          
          // 🔥 延迟显示统一的完成消息（给图片生成时间）
          if (newScenes.length > 0) {
            // 统计各类场景数量
            const psychodramaCount = newScenes.filter((s: any) => s.isPsychodrama).length
            const hypotheticalCount = newScenes.filter((s: any) => s.isHypothetical).length
            const opinionCount = newScenes.filter((s: any) => s.isOpinionScene).length
            
            // 生成完成消息
            const completionParts: string[] = []
            if (psychodramaCount > 0) completionParts.push(`心理剧${psychodramaCount}张`)
            if (hypotheticalCount > 0) completionParts.push(`假想场景${hypotheticalCount}张`)
            if (opinionCount > 0) completionParts.push(`观点场景${opinionCount}张`)
            
            const completionMessage = `✨ 创作完成！生成了${completionParts.join('、')}`
            
            // 延迟3秒显示完成消息（等待大部分图片生成完成）
            setTimeout(() => {
              setMessages(prev => {
                // 移除检测提示
                const filtered = prev.filter(msg => !msg.content.includes('正在检测您的观点和情绪'))
                // 添加最终完成消息
                return [...filtered, {
                  id: `final-completion-${Date.now()}`,
                  type: 'system',
                  content: completionMessage
                }]
              })
            }, 3000)
          } else {
            // 移除检测提示
            setMessages(prev => prev.filter(msg => !msg.content.includes('正在检测您的观点和情绪')))
          }
        }).catch((error) => {
          console.error('❌ [CHAT-NEW] 后台生成失败:', error)
          // 移除检测提示
          setMessages(prev => prev.filter(msg => !msg.content.includes('正在检测您的观点和情绪')))
        })
      }
      
      // 3. ✅ 场景对象已经有storyFragment了，直接用（心理剧补充）
      scenes.forEach((scene: any) => {
        if (scene.isPsychodrama && !scene.storyFragment) {
          // 心理剧如果没有storyFragment，用完整的心理分析文字（格式化）
          const parts: string[] = []
          if (scene.innerMonologue) {
            parts.push(`内心独白："${scene.innerMonologue}"`)
          }
          if (scene.surfaceVsInner) {
            parts.push(`表面vs内心：${scene.surfaceVsInner}`)
          }
          if (scene.consciousnessStream) {
            parts.push(`意识流：${scene.consciousnessStream}`)
          }
          if (scene.psychologicalSymbolism) {
            parts.push(`心理象征：${scene.psychologicalSymbolism}`)
          }
          
          scene.storyFragment = parts.length > 0 ? parts.join('\n\n') : scene.sceneDescription_CN || ''
          
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
      
      // 💾 清空之前的图片数据，准备收集新的
      updateGeneratedImagesData(() => [])
      
      // ⚡ 流式生成图片：每生成一张立即返回，不阻塞后续流程
      let completedImages = 0
      
      // 🔥 收集所有基础场景图片生成的Promise，确保保存时包含所有图片
      const baseImagePromises: Promise<void>[] = []
      
      // 🔥 收集Promise，等待所有基础场景图片生成完成
      scenes.forEach((scene: any, i: number) => {
        const imagePromise = (async () => {
        const sceneTitle = scene.title || scene.emotionalTrigger || `场景 ${i + 1}`
        const sceneType = scene.isPsychodrama ? '心理剧' : '场景'
        
        
        // 🔥 添加生成中的占位消息（使用唯一ID）
        const placeholderId = `base-image-placeholder-${i}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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
          
          // 🔥 根据场景类型选择正确的提示词字段
          let imagePrompt = scene.isPsychodrama 
            ? scene.imagePrompt  // 心理剧使用imagePrompt
            : scene.isOpinionScene
              ? scene.imagePrompt  // 🔥 观点场景使用imagePrompt
              : scene.isHypothetical
                ? scene.imagePrompt  // 假定场景使用imagePrompt
                : scene.detailedPrompt || scene.description  // 普通场景使用detailedPrompt或description
          
          // 🔥 调试：打印场景类型和提示词字段
          console.log(`🔍 [CHAT-NEW] 场景${i + 1}类型识别:`, {
            title: scene.title,
            isPsychodrama: scene.isPsychodrama,
            isOpinionScene: scene.isOpinionScene,
            isHypothetical: scene.isHypothetical,
            opinionText: scene.opinionText,
            hasImagePrompt: !!scene.imagePrompt,
            hasDetailedPrompt: !!scene.detailedPrompt,
            selectedPrompt: imagePrompt?.substring(0, 100) + '...'
          })
          
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
            
            // 💾 收集图片数据用于保存（基础场景）
            updateGeneratedImagesData(prev => [...prev, {
              imageUrl: imageData.imageUrl,
              story: sceneStory || '',
              sceneTitle: scene.title || `场景 ${i + 1}`,
              sceneIndex: i,
              prompt: sceneStory || ''
            }])
            
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
            
            // 🔄 直接显示图片，不进行预加载（避免预加载问题）
            console.log(`✅ [CHAT-NEW] 场景 ${i + 1} 图片生成成功，直接显示`)
            console.log(`🔗 [CHAT-NEW] 图片URL: ${imageData.imageUrl}`)
            
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
            
            // 🔥 流式返回：图片生成成功，不返回Promise
          } else {
            // 生成失败，获取错误信息
            const errorData = await imageResponse.json().catch(() => ({}))
            const errorMsg = errorData.error || imageResponse.statusText || '未知错误'
            console.error(`❌ [CHAT-NEW] 场景 ${i + 1} API错误:`, {
              status: imageResponse.status,
              statusText: imageResponse.statusText,
              error: errorData,
              imagePrompt: imagePrompt.substring(0, 100) + '...'
            })
            
            setMessages(prev => prev.map(msg => 
              msg.id === placeholderId
                ? { ...msg, content: `❌ 第 ${i + 1} 幅创作失败: ${errorMsg} (状态码: ${imageResponse.status})` }
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
        })() // 🔥 立即执行async函数，返回Promise
        
        baseImagePromises.push(imagePromise)
      })
      
      // 🔥 等待所有基础场景图片生成完成后再保存
      console.log('⏳ [CHAT-NEW] 等待所有基础场景图片生成完成...')
      await Promise.all(baseImagePromises)
      console.log('✅ [CHAT-NEW] 所有基础场景图片生成完成，开始保存内容')
      
      // 只等待故事生成完成
      const storyResult = await storyPromise
      
      // 🔥 流式返回：图片生成情况通过 completedImages 追踪
      // 不需要等待所有图片，图片会在后台继续生成
      console.log(`📊 [CHAT-NEW] 故事生成完成，图片正在后台流式生成...`)
      console.log(`📊 [CHAT-NEW] 当前已完成: ${completedImages}/${scenes.length} 张图片`)
      
      // 🔥 不再等待所有图片，立即继续后续流程
      // 图片会在后台继续生成，生成完成后自动显示
      
      // 移除进度消息
      setMessages(prev => prev.filter(msg => msg.id !== progressId))
      
      // 4. 基础场景生成已启动，显示检测通知（图片在后台继续生成）
      console.log(`✅ [CHAT-NEW] 基础场景生成已启动，共 ${scenes.length} 个场景正在生成图片`)
      
      // 🔥 注意：如果有新增场景（观点、心理剧），元数据更新会在新增场景图片生成完成后执行
      // 如果没有新增场景，在这里执行元数据更新（基础场景图片已完成）
      // 这样不会影响生图速度
      
      // 🔥 立即显示检测通知（如果有新增场景，会在后面移除）
      setMessages(prev => [...prev, {
        id: `detection-${Date.now()}`,
        type: 'system',
        content: '🔍 正在检测您的观点和情绪，为您生成专属心理场景...'
      }])
      
      console.log('✅ [CHAT-NEW] 基础场景图片已完成：图片+故事配对显示')
      
      // 🔥 注意：元数据更新会在以下情况执行：
      // 1. 如果有新增场景：在 generateImagesForNewScenes 完成后执行
      // 2. 如果没有新增场景：在基础场景图片完成后执行
      if (!contentResult.needsAdditionalGeneration) {
        // 🔥 没有新增场景，在基础场景图片生成完成后立即执行元数据更新
        console.log('💾 [CHAT-NEW] 没有新增场景，在基础场景图片生成完成后执行元数据更新...')
        updateMetadataAfterAllImages(actualPrompt, answersWithContext, questions).catch(error => {
          console.error('❌ [CHAT-NEW] 元数据更新异常（不影响前端）:', error)
        })
      }
      
      // 🤖 AI自动生成标题（传入聊天记录）
      const autoTitle = await generateTitle(actualPrompt, scenes, answersWithContext)
      setMainTitle(autoTitle)
      console.log('🤖 [CHAT-NEW] AI生成标题:', autoTitle)
      
      // 💾 保存生成内容到数据库
      console.log('💾 [CHAT-NEW] 开始保存生成内容到数据库...')
      
      // 🔥 等待状态更新完成，确保获取最新的图片数据
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 🔥 使用ref获取最新的图片数据（避免状态更新延迟问题）
      const latestImages = generatedImagesDataRef.current
      console.log('💾 [CHAT-NEW] 生成的图片数量:', latestImages.length)
      console.log('💾 [CHAT-NEW] 图片数据预览:', latestImages.map(img => ({ 
        sceneTitle: img.sceneTitle, 
        sceneIndex: img.sceneIndex,
        hasUrl: !!img.imageUrl 
      })))
      try {
        // 🔥 按逻辑顺序（sceneIndex）排序图片
        const sortedImages = [...latestImages].sort((a, b) => a.sceneIndex - b.sceneIndex)
        console.log('📊 [CHAT-NEW] 图片排序:', sortedImages.map(img => ({
          sceneIndex: img.sceneIndex,
          title: img.sceneTitle
        })))
        
        // 调用保存API
        console.log('💾 [CHAT-NEW] 保存sessionId:', currentSessionId)
        console.log('💾 [CHAT-NEW] 保存标题:', autoTitle)
        const saveResponse = await fetch('/api/user/generated-content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sessionId: currentSessionId,  // 🔥 包含sessionId
            title: autoTitle, // 🔥 AI生成的标题
            initialPrompt: actualPrompt,
            questions: questions.slice(0, answersWithContext.length),
            answers: answersWithContext,
            scenes: scenes || {},
            storyNarrative: contentResult.story?.narrative || '',
            images: sortedImages, // 🔥 使用排序后的图片
            category: 'daily'
          })
        })
        
        if (saveResponse.ok) {
          const saveResult = await saveResponse.json()
          console.log('✅ [CHAT-NEW] 内容已保存到数据库:', saveResult.contentId)
          // 🔥 记录contentId，用于发布
          setSavedContentId(saveResult.contentId)
        } else {
          const errorData = await saveResponse.json()
          console.error('❌ [CHAT-NEW] 保存内容失败:', errorData)
        }
      } catch (saveError) {
        console.error('❌ [CHAT-NEW] 保存内容异常:', saveError)
      }
      
      // 🔥 注意：元数据更新会延迟到所有图片（包括新增场景）生成完成后执行
      // 详见 generateImagesForNewScenes 函数末尾
      
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
      answersRef.current = []  // 🔥 同步重置ref
      setQuestions([])
      questionsRef.current = []  // 🔥 同步重置ref
      setCurrentQuestionIndex(0)
      setInitialPrompt('') // 清空，下一个输入会成为新的initialPrompt
      
      console.log('✅ [CHAT-NEW] 对话状态已清空，等待新键入')
      
    } catch (error: any) {
      // 检查是否是用户主动中止
      if (error.name === 'AbortError' || error.message?.includes('abort')) {
        console.log('⏸️ [CHAT-NEW] 用户中止了生成')
        // 不显示错误消息，已经在 handleStopGeneration 中显示了
      } else {
        console.error('💥 [CHAT-NEW] 生成失败:', error)
        setMessages(prev => [...prev, {
          id: 'system-error',
          type: 'system',
          content: '❌ 创作失败，请重试'
        }])
      }
    } finally {
      // 🔥 如果没有额外场景需要生成，立即重置状态
      // 如果有额外场景，状态重置由外部统一管理（在 Promise.allSettled 后）
      if (!contentResult?.needsAdditionalGeneration) {
        console.log('🔄 [CHAT-NEW] 没有额外场景，重置生成状态')
        setIsGenerating(false)
        setIsLoading(false)
      } else {
        console.log('⏳ [CHAT-NEW] 有额外场景正在生成，状态重置由外部统一管理')
      }
      
      // 清理 AbortController
      if (abortControllerRef.current) {
        abortControllerRef.current = null
      }
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
      const currentMetadata = await getUserMetadata() as any
      const rawInputsToAdd = [userAnswer]  // 用户的原始回答
      if (context.length > 0) {
        rawInputsToAdd.unshift(context[0])  // 初始prompt也要存储
      }
      
      // 🔵 第二步：提取用户提到的关键词（简单提取，不用AI）
      const mentionedKeywords = userAnswer.match(/[\u4e00-\u9fa5a-zA-Z0-9]{2,}/g) || []
      
      // 获取用户的完整信息（包括八字、星盘）
      const userInfo = await getUserInfo()
      
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

  // AI自动生成标题 - 智能提炼关键词
  const generateTitle = async (prompt: string, scenes: any[], chatAnswers: string[] = []): Promise<string> => {
    try {
      console.log('🤖 [TITLE-GEN] 开始生成标题...')
      console.log('🤖 [TITLE-GEN] 原始输入:', prompt)
      console.log('🤖 [TITLE-GEN] 聊天回答:', chatAnswers)
      
      // 合并所有对话内容
      const allText = [prompt, ...chatAnswers].join('。')
      
      // 使用AI提炼标题
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `你是标题提炼专家。任务：从用户对话中提炼一个简洁有力的标题（8-15字）。

**标题原则：**
1. 提炼核心关键词，不要照搬原文
2. 去除口语化、重复的词汇
3. 保留情感/观点/核心话题
4. 简洁有力，有吸引力

**❌ 错误示例：**
- "综艺 叫再见爱人 就觉得两个人" → 太口语化，冗长
- "我今天看了那个节目然后" → 太啰嗦

**✅ 正确示例：**
- 输入："看了综艺《再见爱人》，就觉得两个人的亲密关系太难了"
  → 标题："再见爱人：亲密关系困境"
  
- 输入："今天上班的时候老板找人咨询AI，我觉得他们根本不懂"
  → 标题："老板的AI咨询闹剧"
  
- 输入："我很孤独，感觉没人理解我"
  → 标题："孤独与不被理解"

**提炼步骤：**
1. 识别核心话题（人物/事件/情感）
2. 提取关键词（2-3个）
3. 组合成简洁标题

只返回标题文本，不要其他内容！`
            },
            {
              role: 'user',
              content: `用户对话：\n${allText.slice(0, 500)}\n\n请提炼标题（8-15字）：`
            }
          ],
          temperature: 0.7,
          max_tokens: 50
        })
      })

      if (response.ok) {
        const data = await response.json()
        let title = data.choices[0].message.content.trim()
        
        // 清理标题
        title = title
          .replace(/^["'「『《】|\.。,，\s]+|["'」』》】|\.。,，\s]+$/g, '') // 去除首尾标点
          .replace(/标题[:：]?\s*/g, '') // 去除"标题："前缀
          .slice(0, 20) // 限制长度
        
        console.log('✅ [TITLE-GEN] AI生成标题:', title)
        
        // 如果AI返回的标题为空或太短，使用兜底方案
        if (!title || title.length < 3) {
          title = prompt.slice(0, 15)
          console.log('⚠️ [TITLE-GEN] 使用兜底标题:', title)
        }
        
        return title
      }
      
      // API失败，使用简单提取
      console.log('⚠️ [TITLE-GEN] AI调用失败，使用简单提取')
      const keywords = prompt
        .replace(/[，。！？；：""''（）【】《》\s我你他她它的了吗呢吧啊就]/g, ' ')
        .split(' ')
        .filter(w => w.length >= 2 && w.length <= 8)
        .slice(0, 3)
        .join(' ')
      
      return keywords || prompt.slice(0, 15)
      
    } catch (error) {
      console.error('❌ [TITLE-GEN] 生成标题失败:', error)
      return prompt.slice(0, 15)
    }
  }

  // 发布内容处理函数
  const handlePublish = async () => {
    console.log('📤 [PUBLISH] 开始发布流程...')
    console.log('📤 [PUBLISH] currentSessionId:', currentSessionId)
    console.log('📤 [PUBLISH] savedContentId:', savedContentId)
    console.log('📤 [PUBLISH] generatedImagesData:', generatedImagesData.length)
    
    if (generatedImagesData.length === 0) {
      console.error('❌ [PUBLISH] 验证失败: 没有图片')
      alert('没有可发布的内容')
      return
    }
    
    if (!savedContentId && !currentSessionId) {
      console.error('❌ [PUBLISH] 验证失败: 缺少contentId和sessionId')
      alert('无法找到要发布的内容，请重新生成')
      return
    }
    
    setIsPublishing(true)
    try {
      // 🔥 发布前先确保所有图片数据都已更新到数据库
      const latestImages = generatedImagesDataRef.current
      if (savedContentId && latestImages.length > 0) {
        console.log('💾 [PUBLISH] 发布前更新图片数据，确保包含所有图片（包括观点场景）...')
        const sortedImages = [...latestImages].sort((a, b) => a.sceneIndex - b.sceneIndex)
        try {
          const updateResponse = await fetch(`/api/user/generated-content/${savedContentId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              images: sortedImages,
              imageCount: sortedImages.length,
              title: publishTitle || mainTitle || initialPrompt  // 🔥 同时更新标题
            })
          })
          if (updateResponse.ok) {
            console.log('✅ [PUBLISH] 图片数据已更新，包含', sortedImages.length, '张图片')
          } else {
            console.warn('⚠️ [PUBLISH] 更新图片数据失败，继续发布')
          }
        } catch (updateError) {
          console.error('❌ [PUBLISH] 更新图片数据异常:', updateError)
          // 继续发布流程，不阻塞
        }
      }
      
      const publishData = {
        contentId: savedContentId,  // 🔥 优先使用contentId
        sessionId: currentSessionId,  // 备用sessionId
        title: publishTitle || mainTitle || initialPrompt
      }
      
      console.log('📤 [PUBLISH] 发送请求:', publishData)
      
      const response = await fetch('/api/user/generated-content/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(publishData)
      })
      
      console.log('📤 [PUBLISH] 响应状态:', response.status)
      
      const data = await response.json()
      console.log('📤 [PUBLISH] 响应数据:', data)
      
      if (!response.ok) {
        throw new Error(data.details || data.error || '发布失败')
      }
      
      setIsPublished(true)
      setShowPublishDialog(false)
      
      // 显示成功提示
      setMessages(prev => [...prev, {
        id: `system-publish-${Date.now()}`,
        type: 'system',
        content: '✅ 发布成功！你的作品已分享到社区。3秒后将跳转到首页...'
      }])
      
      console.log('✅ [PUBLISH] 发布成功!')
      
      // 3秒后跳转到首页查看，并刷新已发布内容
      setTimeout(() => {
        router.push('/home?refresh=true')
      }, 3000)
    } catch (error: any) {
      console.error('❌ [PUBLISH] 发布失败:', error)
      console.error('❌ [PUBLISH] 错误详情:', error.message)
      alert(`发布失败: ${error.message}`)
    } finally {
      setIsPublishing(false)
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
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50">
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
            <div className="flex items-center mr-2">
              <img 
                src="/inflow-logo.jpeg" 
                alt="logo" 
                className="w-20 h-14 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => router.push('/home')}
              />
            </div>
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
          
          {/* 发布按钮 */}
          {generatedImagesData.length > 0 && !isPublished && (
            <button
              onClick={() => {
                // 🔥 打开对话框时，同步ref的最新数据到state，确保包含所有图片（包括观点场景）
                const latestImages = generatedImagesDataRef.current
                if (latestImages.length > generatedImagesData.length) {
                  console.log('🔄 [PUBLISH] 同步最新图片数据:', latestImages.length, '张')
                  setGeneratedImagesData(latestImages)
                }
                setPublishTitle(mainTitle || initialPrompt)
                setShowPublishDialog(true)
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-all"
              title="发布到社区"
            >
              <Share2 className="w-4 h-4" />
              <span>发布</span>
            </button>
          )}
          {isPublished && (
            <div className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
              <Check className="w-4 h-4" />
              <span>已发布</span>
            </div>
          )}
        </div>
      </div>

      {/* 用户信息栏 */}
      <UserInfoBar />

      {/* 主要内容 */}
      <div className="max-w-md mx-auto px-4 py-6">
        {step === 'loading' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-magazine-primary animate-spin mb-4" />
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
                            ? 'text-magazine-primary'
                            : message.sceneData?.isHypothetical
                            ? 'text-blue-600'
                            : 'text-gray-800'
                        }`}>
                          {message.sceneData?.isPsychodrama ? '🎭 ' : message.sceneData?.isHypothetical ? '🎬 ' : '🎬 '}
                          {sceneTitle}
                        </h3>
                        {message.sceneData?.isPsychodrama && (
                          <span className="text-xs bg-magazine-primary/90 text-white px-2 py-0.5 rounded-full">
                              心理剧
                            </span>
                        )}
                        {message.sceneData?.isHypothetical && (
                          <span className="text-xs bg-blue-500/90 text-white px-2 py-0.5 rounded-full">
                              假想人生
                            </span>
                        )}
                      </div>
                      
                      {/* 图片 - 优化显示 */}
                      <div className={`relative rounded-2xl shadow-lg overflow-hidden border-2 ${
                        message.sceneData?.isPsychodrama 
                          ? 'border-teal-300 shadow-teal-100'
                          : message.sceneData?.isHypothetical
                          ? 'border-blue-300 shadow-blue-100'
                          : 'border-gray-200 shadow-gray-100'
                      }`}>
                        {/* 假想场景：添加电影黑边效果 */}
                        {message.sceneData?.isHypothetical && (
                          <>
                            <div className="absolute top-0 left-0 right-0 h-12 bg-black z-10"></div>
                            <div className="absolute bottom-0 left-0 right-0 h-12 bg-black z-10"></div>
                            <div className="absolute top-3 left-4 text-white text-xs font-mono z-20 opacity-50">
                              IMAGINED REALITY
                            </div>
                          </>
                        )}
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
                            ? 'bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-100'
                            : message.sceneData?.isHypothetical
                            ? 'bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100'
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
                        ? 'bg-magazine-primary text-white'
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

            {/* 直接生图按钮 - 仅在问答阶段显示，创作中时隐藏 */}
            {!isLoading && !isGenerating && questions.length > 0 && answers.length < questions.length && (
              <div className="flex justify-center mb-4">
                <button
                  onClick={() => {
                    console.log('🎨 [CHAT-NEW] 用户选择直接生图，跳过剩余问题')
                    console.log('🔍 [CHAT-NEW] 状态检查:', {
                      isLoading,
                      isGenerating,
                      questionsLength: questions.length,
                      answersLength: answers.length
                    })
                    console.log('🔍 [CHAT-NEW] 当前answers state:', answers)
                    console.log('🔍 [CHAT-NEW] 当前questions state:', questions)
                    
                    // 🔥 从messages中提取用户的实际回答
                    const userAnswersFromMessages = messages
                      .filter(m => m.type === 'user' && m.content !== initialPrompt) // 排除初始输入
                      .map(m => m.content)
                    
                    console.log('✅ [CHAT-NEW] 从messages提取的用户回答:', userAnswersFromMessages)
                    console.log('📊 [CHAT-NEW] 提取到 ' + userAnswersFromMessages.length + ' 个回答')
                    
                    setIsLoading(true)
                    setMessages(prev => [...prev, {
                      id: `system-skip-${Date.now()}`,
                      type: 'system',
                      content: '✅ 已跳过剩余问题，开始为您生成专属场景...'
                    }])
                    setTimeout(() => {
                      // 🔥 使用从messages提取的回答，而不是空的answers state
                      generateInChat(userAnswersFromMessages)
                    }, 500)
                  }}
                  className="px-6 py-2.5 bg-magazine-primary text-white rounded-full font-medium shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center gap-2 hover:bg-magazine-secondary"
                >
                  <span>🎨</span>
                  <span>直接生图</span>
                </button>
              </div>
            )}

            {/* 输入框 - 始终显示，生成过程中禁用输入 */}
            <div className="sticky bottom-4 bg-white rounded-2xl shadow-lg border border-gray-200 p-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isLoading && !isGenerating && handleSendMessage()}
                  placeholder={
                    isGenerating 
                      ? '正在创作中...' 
                      : isLoading && questions.length === 0
                      ? '正在生成问题，请稍候...'
                      : '请输入您的回答...'
                  }
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-magazine-primary focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                  disabled={isLoading || isGenerating}
                />
                
                {/* 生成中显示停止按钮，否则显示发送按钮 */}
                {isGenerating || isLoading ? (
                  <button
                    onClick={handleStopGeneration}
                    className="px-4 py-2 bg-magazine-primary text-white rounded-xl hover:bg-magazine-secondary transition-colors flex items-center justify-center"
                    title="停止生成"
                  >
                    <div className="w-5 h-5 rounded-full border-2 border-white animate-spin border-t-transparent"></div>
                  </button>
                ) : (
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim()}
                    className="px-4 py-2 bg-magazine-primary text-white rounded-xl hover:bg-magazine-secondary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {step === 'generating' && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-magazine-primary animate-spin mb-4" />
            <p className="text-gray-600">正在生成您的专属内容...</p>
          </div>
        )}
      </div>

      {/* 发布确认对话框 - 完整预览 */}
      {showPublishDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 max-h-[90vh] overflow-y-auto">
            {/* 头部 */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-800">发布作品预览</h3>
              <button
                onClick={() => setShowPublishDialog(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            {/* 内容区域 */}
            <div className="p-6 space-y-4">
              {/* AI生成的标题 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  作品标题 <span className="text-teal-500 text-xs">(AI自动生成)</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={publishTitle}
                    onChange={(e) => setPublishTitle(e.target.value)}
                    placeholder="AI正在生成标题..."
                    className="w-full px-4 py-2.5 border border-teal-300 bg-teal-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm font-medium text-gray-800"
                    maxLength={100}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <span className="text-xs text-teal-600">🤖 可编辑</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {publishTitle.length}/100 字符 · 标题由AI根据内容自动生成，你可以修改
                </p>
              </div>
              
              {/* 封面图预览 */}
              {generatedImagesData.length > 0 && (() => {
                const sortedImages = [...generatedImagesData].sort((a, b) => a.sceneIndex - b.sceneIndex)
                const coverImage = sortedImages[0]
                return (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      封面图 <span className="text-gray-500 text-xs">(将使用第一张图作为封面)</span>
                    </label>
                    <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-teal-300 shadow-md">
                      <img
                        src={coverImage.imageDataUrl || coverImage.imageUrl}
                        alt={coverImage.sceneTitle}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 left-2 bg-teal-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                        封面
                      </div>
                      <div className="absolute bottom-2 left-2 right-2">
                        <p className="text-white text-sm font-medium bg-black/50 px-2 py-1 rounded backdrop-blur-sm">
                          {coverImage.sceneTitle}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })()}
              
              {/* 图片数量信息 */}
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">图片数量</span>
                  <span className="text-lg font-bold text-teal-600">{generatedImagesData.length} 张</span>
                </div>
              </div>
              
              {/* 图文预览 */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  图文预览 <span className="text-gray-500 text-xs">(共{generatedImagesData.length}组)</span>
                </h4>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                  {[...generatedImagesData].sort((a, b) => a.sceneIndex - b.sceneIndex).map((image, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                      {/* 图片部分 */}
                      <div className="relative aspect-video bg-gray-100">
                    <img
                      src={image.imageDataUrl || image.imageUrl}
                          alt={image.sceneTitle}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 bg-teal-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                          {index + 1}
                        </div>
                      </div>
                      {/* 文字部分 */}
                      <div className="p-3">
                        <h5 className="font-medium text-sm text-gray-800 mb-1">
                          {image.sceneTitle}
                        </h5>
                        {image.story && (
                          <p className="text-xs text-gray-600 line-clamp-3">
                            {image.story}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* 提示信息 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex gap-2">
                  <span className="text-yellow-600 flex-shrink-0">💡</span>
                  <p className="text-sm text-yellow-800">
                    发布后，你的作品将展示在首页"社区作品"区域，供其他用户欣赏和学习。
                  </p>
                </div>
              </div>
            </div>
            
            {/* 底部按钮 */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 rounded-b-2xl">
              <button
                onClick={() => setShowPublishDialog(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
              >
                取消
              </button>
              <button
                onClick={handlePublish}
                disabled={isPublishing || !publishTitle.trim()}
                className="flex-1 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg hover:shadow-lg transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>发布中...</span>
                  </>
                ) : (
                  <>
                    <Share2 className="w-4 h-4" />
                    <span>确认发布</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

