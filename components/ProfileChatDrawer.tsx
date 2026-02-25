'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Loader2 } from 'lucide-react'
import Drawer from '@/components/Drawer'
import { generateDeepQuestions } from '@/lib/doubaoService'

interface ChatMsg {
  id: string
  type: 'user' | 'assistant' | 'system'
  content: string
}

export interface ProfileChatDrawerProps {
  isOpen: boolean
  onClose: () => void
  initialPrompt: string
  initialImage?: string
  /** When true: show the prompt as a direct message to you (no profile-creation wrap). */
  directToUser?: boolean
}

export default function ProfileChatDrawer({
  isOpen,
  onClose,
  initialPrompt,
  initialImage,
  directToUser = false
}: ProfileChatDrawerProps) {
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [questions, setQuestions] = useState<string[]>([])
  const questionsRef = useRef<string[]>([])
  const sessionIdRef = useRef<string>('')
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)

  const answers = messages.filter(m => m.type === 'user').map(m => m.content)

  const saveChatSession = useCallback(async () => {
    const sid = sessionIdRef.current
    if (!sid || !initialPrompt.trim()) return
    const toSave = messages.filter(
      m => !m.id.startsWith('thinking-') && !m.id.startsWith('cont-') && !m.id.startsWith('gen-')
    )
    try {
      await fetch('/api/chat-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: sid,
          title: (initialPrompt.slice(0, 48) || 'Profile chat') + (initialPrompt.length > 48 ? '...' : ''),
          messages: toSave,
          initialPrompt,
          answers,
          questions: questionsRef.current
        })
      })
    } catch (e) {
      console.warn('ProfileChatDrawer save session failed:', e)
    }
  }, [initialPrompt, messages, answers])

  const updateDraftPartial = useCallback((patch: { userSay: string; tags: string[]; insights: string[]; avatarDataUrl?: string }) => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('livingProfile.home.v1') : null
      const existing = raw ? JSON.parse(raw) as Record<string, unknown> : {}
      
      // 累积 insights（去重）
      const existingInsights = Array.isArray(existing.insights) ? existing.insights.filter((x): x is string => typeof x === 'string') : []
      const mergedInsights = Array.from(new Set([...existingInsights, ...patch.insights]))
      
      // 累积 tags（去重）
      const existingTags = Array.isArray(existing.tags) ? existing.tags.filter((x): x is string => typeof x === 'string') : []
      const mergedTags = Array.from(new Set([...existingTags, ...patch.tags]))
      // 不把新 tag 直接放到卡片：保留原有 selectedTags，没有则 []，不自动用新 tag 填
      const selectedTags = Array.isArray(existing.selectedTags) ? existing.selectedTags : []
      
      const merged = { ...existing, ...patch, insights: mergedInsights, tags: mergedTags, selectedTags }
      if (typeof window !== 'undefined') localStorage.setItem('livingProfile.home.v1', JSON.stringify(merged))
    } catch (e) {
      console.warn('ProfileChatDrawer updateDraftPartial failed:', e)
    }
  }, [])

  const generateInsightsOnly = useCallback(async (prompt: string, answerList: string[]): Promise<{ insights: string[]; tags: string[] }> => {
    const parts = [prompt, ...answerList].filter(Boolean)
    const text = parts.join('\n\n').trim()
    if (!text) return { insights: [], tags: [] }
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: `From the conversation below, extract ONLY two things. Use the same language as the conversation.

1. "tags": Extract 5-10 core keyword tags that best describe this person. Each tag should be SHORT (1-4 words). Extract directly from what the user said — roles, interests, what they do, key traits. Examples: "AI founder", "Podcasts", "Arthouse films", "Product builder", "Deep thinker". Output as a JSON array of strings.

2. "insights": array of 3-5 short insight strings (values, interests, motivations, style).

Return ONLY a valid JSON object with keys "tags" and "insights". No other text.`
          },
          { role: 'user', content: `Conversation:\n\n${text}` }
        ],
        max_tokens: 800,
        temperature: 0.5
      })
    })
    const data = await res.json()
    if (!res.ok) return { insights: [], tags: [] }
    const raw = data.choices?.[0]?.message?.content?.trim() || '{}'
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    const jsonStr = jsonMatch ? jsonMatch[0] : raw
    let obj: { tags?: string | string[]; insights?: string[] }
    try {
      obj = JSON.parse(jsonStr) as { tags?: string | string[]; insights?: string[] }
    } catch {
      return { insights: [], tags: [] }
    }
    const rawTags = obj.tags
    const tags: string[] = Array.isArray(rawTags)
      ? rawTags.filter((x): x is string => typeof x === 'string').map(s => s.trim()).filter(Boolean)
      : typeof rawTags === 'string'
        ? rawTags.split(/[,，\n]+/).map(s => s.trim()).filter(Boolean)
        : []
    const rawIns = obj.insights
    const insights = Array.isArray(rawIns)
      ? rawIns.filter((x): x is string => typeof x === 'string').map(s => s.trim()).filter(Boolean)
      : []
    return { insights, tags }
  }, [])

  const generateProfile = useCallback(async (prompts: string[], finalAnswers: string[], img?: string) => {
    setIsGenerating(true)
    setMessages(prev => [...prev, {
      id: `gen-${Date.now()}`,
      type: 'system',
      content: img ? '📝 Generating your profile (with photo)...' : '📝 Generating your profile...'
    }])

    try {
      const all = [...prompts, ...finalAnswers].filter(Boolean)
      const text = all.join('\n\n')
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `You are a professional profile writer. Generate a Living Profile from the user's conversation.

Use these exact JSON keys (all required, use "" or [] if empty):
openingStatement, whoIAm, reassuranceLine, howIThink, whatImBuildingNow, whereIComeFromCompressed, engageCoffeeChat, engageCollab, engageFollow, engageTalk, tags, insights.

- "tags": REQUIRED. Extract 5-10 core keyword tags that best describe this person. Each tag SHORT (1-4 words). Extract directly from what the user said — roles, interests, what they do, key traits. Examples: "AI founder", "Podcasts", "Arthouse films", "Product builder", "Deep thinker". Output as a JSON array of strings. Same language.
- "insights": an array of 3-5 short insight strings (values, interests, motivations, style). Same language as the conversation.

Use first-person for profile fields. Be concise. Return ONLY a valid JSON object.`
            },
            { role: 'user', content: `Conversation:\n\n${text}` }
          ],
          max_tokens: 2000,
          temperature: 0.7
        })
      })
      const data = await res.json()
      if (!res.ok) {
        const errMsg = data?.error || `API error: ${res.status}`
        console.error('❌ [ProfileChatDrawer] profile gen failed:', res.status, data)
        throw new Error(errMsg)
      }
      const raw = data.choices?.[0]?.message?.content?.trim() || '{}'
      const jsonMatch = raw.match(/```json\n?([\s\S]*?)\n?```/) || raw.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : raw
      let profile: Record<string, unknown>
      try {
        profile = JSON.parse(jsonStr) as Record<string, unknown>
      } catch (parseErr) {
        console.error('❌ [ProfileChatDrawer] JSON parse failed:', parseErr)
        console.error('Raw response:', raw?.slice(0, 500))
        throw new Error('Profile response invalid. Please try again.')
      }

      const rawInsights = profile.insights
      const insights: string[] = Array.isArray(rawInsights)
        ? rawInsights.filter((x): x is string => typeof x === 'string').map(s => s.trim()).filter(Boolean)
        : typeof rawInsights === 'string'
          ? rawInsights.split(/\n/).map(s => s.trim()).filter(Boolean)
          : []

      const rawTags = profile.tags
      const newTags: string[] = Array.isArray(rawTags)
        ? rawTags.filter((x): x is string => typeof x === 'string').map(s => s.trim()).filter(Boolean)
        : typeof rawTags === 'string'
          ? rawTags.split(/[,，\n]+/).map(s => s.trim()).filter(Boolean)
          : []

      // 读取现有数据，累积 insights 和 tags
      const existingRaw = typeof window !== 'undefined' ? localStorage.getItem('livingProfile.home.v1') : null
      const existingData = existingRaw ? JSON.parse(existingRaw) as Record<string, unknown> : {}
      const existingInsights = Array.isArray(existingData.insights) ? existingData.insights.filter((x): x is string => typeof x === 'string') : []
      const existingTags = Array.isArray(existingData.tags) ? existingData.tags.filter((x): x is string => typeof x === 'string') : []
      const existingSelectedTags = Array.isArray(existingData.selectedTags) ? existingData.selectedTags.filter((x): x is string => typeof x === 'string') : []
      
      const mergedInsights = Array.from(new Set([...existingInsights, ...insights]))
      const mergedTags = Array.from(new Set([...existingTags, ...newTags]))
      // 保留用户已选的 selectedTags，新增的 tags 如果还没选过，可以追加（但保持用户已有选择）
      const mergedSelectedTags = existingSelectedTags.length > 0 
        ? existingSelectedTags 
        : mergedTags.slice(0, 5)

      const userSay = [prompts[0], ...finalAnswers].filter(Boolean).join('\n')
      const draft = {
        ...existingData,
        fullName: (profile.fullName as string) || '',
        headline: (profile.headline as string) || '',
        location: (profile.location as string) || '',
        contactEmail: (profile.contactEmail as string) || '',
        websiteOrSocial: (profile.websiteOrSocial as string) || '',
        avatarDataUrl: img || (profile.avatarDataUrl as string) || '',
        userSay: userSay.trim() || '',
        tags: mergedTags,
        selectedTags: mergedSelectedTags,
        insights: mergedInsights,
        openingStatement: (profile.openingStatement as string) || '',
        whoIAm: (profile.whoIAm as string) || '',
        reassuranceLine: (profile.reassuranceLine as string) || '',
        howIThink: (profile.howIThink as string) || '',
        whatImBuildingNow: (profile.whatImBuildingNow as string) || '',
        whereIComeFromCompressed: (profile.whereIComeFromCompressed as string) || '',
        engageCoffeeChat: (profile.engageCoffeeChat as string) || '',
        engageCollab: (profile.engageCollab as string) || '',
        engageFollow: (profile.engageFollow as string) || '',
        engageTalk: (profile.engageTalk as string) || ''
      }
      localStorage.setItem('livingProfile.home.v1', JSON.stringify(draft))

      // 保存到数据库
      try {
        await fetch('/api/user/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            image: img || undefined,
            profileData: draft
          })
        })
      } catch {}

      const isChinese = /[\u4e00-\u9fa5]/.test(initialPrompt)
      setMessages(prev => prev.filter(m => !m.id.startsWith('gen-')).concat([{
        id: `done-${Date.now()}`,
        type: 'system',
        content: isChinese ? '✅ Profile 已生成，已保存。' : '✅ Profile created and saved.'
      }]))
      window.dispatchEvent(new CustomEvent('profileChat:completed'))
      setTimeout(onClose, 1200)
    } catch (e: any) {
      console.error('Profile generation failed:', e)
      const msg = e?.message || 'Profile generation failed. Please try again.'
      setMessages(prev => prev.filter(m => !m.id.startsWith('gen-')).concat([{
        id: `fail-${Date.now()}`,
        type: 'system',
        content: `❌ ${msg}`
      }]))
    } finally {
      setIsGenerating(false)
    }
  }, [initialPrompt, onClose])

  useEffect(() => {
    if (!isOpen || !initialPrompt.trim()) return
    sessionIdRef.current = `profile_${Date.now()}`
    setMessages([])
    setQuestions([])
    questionsRef.current = []
    setInputValue('')
    setIsGenerating(false)

    if (directToUser) {
      setMessages([{ id: `dm-${Date.now()}`, type: 'user', content: initialPrompt }])
      return
    }

    const isChinese = /[\u4e00-\u9fa5]/.test(initialPrompt)
    const welcome = isChinese
      ? `你好！我会帮你创建专属的 profile。我们希望贴上你的故事，让别人更好理解你。你提到："${initialPrompt}"。让我问你一些问题来更好地了解你。`
      : `Hi! I'll help you create your exclusive profile. We'd like to include your story so others can understand you better. You mentioned: "${initialPrompt}". Let me ask you some questions to get to know you.`

    setMessages([{ id: `welcome-${Date.now()}`, type: 'assistant', content: welcome }])
    setIsLoading(true)

    generateDeepQuestions(initialPrompt, initialPrompt, [], [])
      .then((res) => {
        if (res.success && res.questions && res.questions.length > 0) {
          const q = res.questions[0]
          setQuestions([q])
          questionsRef.current = [q]
          setMessages(prev => {
            const next: ChatMsg[] = [...prev, { id: `q-${Date.now()}`, type: 'assistant', content: q }]
            return next
          })
          generateInsightsOnly(initialPrompt, []).then(({ insights, tags }) => {
            updateDraftPartial({
              userSay: initialPrompt.trim(),
              tags,
              insights,
              ...(initialImage ? { avatarDataUrl: initialImage } : {})
            })
            window.dispatchEvent(new CustomEvent('profileChat:insightsUpdated'))
            const isChinese = /[\u4e00-\u9fa5]/.test(initialPrompt)
            const msg = isChinese
              ? `已生成 ${insights.length} 个新洞察、${tags.length} 个新 tag，可在个人页「标签」「洞察」中查看。`
              : `Generated ${insights.length} new insights and ${tags.length} new tags. Check them in Profile → Tags / Insights.`
            setMessages(prev => [...prev, { id: `gen-${Date.now()}`, type: 'system', content: msg }])
          }).catch(() => {})
        } else {
          setMessages(prev => [...prev, {
            id: `noq-${Date.now()}`,
            type: 'assistant',
            content: isChinese ? '好的，我根据你的介绍直接生成 profile。' : 'Sure, I\'ll generate your profile from what you shared.'
          }])
          generateProfile([initialPrompt], [], initialImage)
        }
      })
      .catch((err) => {
        console.error('ProfileChatDrawer first question failed:', err)
        setMessages(prev => [...prev, {
          id: `err-${Date.now()}`,
          type: 'system',
          content: isChinese ? '生成问题失败，将直接根据你的输入生成 profile。' : 'Couldn\'t generate questions. Creating your profile from your input.'
        }])
        generateProfile([initialPrompt], [], initialImage)
      })
      .finally(() => setIsLoading(false))
  }, [isOpen, initialPrompt, initialImage, directToUser, generateProfile, generateInsightsOnly, updateDraftPartial])

  // 每次聊天记录变化后 debounce 保存
  useEffect(() => {
    if (!sessionIdRef.current || messages.length === 0) return
    const t = setTimeout(() => { saveChatSession() }, 1000)
    return () => clearTimeout(t)
  }, [messages, saveChatSession])

  const handleSend = async () => {
    const val = inputValue.trim()
    if (!val || isLoading || isGenerating) return

    setInputValue('')
    if (directToUser) {
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, type: 'assistant', content: val }])
      return
    }

    setMessages(prev => [...prev, { id: `u-${Date.now()}`, type: 'user', content: val }])
    const newAnswers = [...answers, val]
    const userSay = [initialPrompt, ...newAnswers].filter(Boolean).join('\n')

    if (newAnswers.length >= 3) {
      generateProfile([initialPrompt], newAnswers, initialImage)
      return
    }

    generateInsightsOnly(initialPrompt, newAnswers).then(({ insights, tags }) => {
      updateDraftPartial({
        userSay,
        tags,
        insights,
        ...(initialImage ? { avatarDataUrl: initialImage } : {})
      })
      window.dispatchEvent(new CustomEvent('profileChat:insightsUpdated'))
      const isChinese = /[\u4e00-\u9fa5]/.test(initialPrompt)
      const msg = isChinese
        ? `已生成 ${insights.length} 个新洞察、${tags.length} 个新 tag，可在个人页「标签」「洞察」中查看。`
        : `Generated ${insights.length} new insights and ${tags.length} new tags. Check them in Profile → Tags / Insights.`
      setMessages(prev => [...prev, { id: `gen-${Date.now()}`, type: 'system', content: msg }])
    }).catch(() => {})

    setIsLoading(true)
    setMessages(prev => [...prev, {
      id: `thinking-${Date.now()}`,
      type: 'assistant',
      content: 'Thinking...'
    }])

    try {
      const res = await generateDeepQuestions(
        initialPrompt,
        initialPrompt,
        newAnswers,
        questionsRef.current
      )
      setMessages(prev => prev.filter(m => !m.id.startsWith('thinking-')))

      if (res.success && res.questions && res.questions.length > 0) {
        const next = res.questions[0]
        const updated = [...questionsRef.current, next]
        questionsRef.current = updated
        setQuestions(updated)
        setMessages(prev => [...prev, { id: `q-${Date.now()}`, type: 'assistant', content: next }])
      } else {
        generateProfile([initialPrompt], newAnswers, initialImage)
      }
    } catch (err) {
      console.error('Next question failed:', err)
      setMessages(prev => prev.filter(m => !m.id.startsWith('thinking-')))
      generateProfile([initialPrompt], newAnswers, initialImage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGenerateNow = () => {
    generateProfile([initialPrompt], answers, initialImage)
  }

  const handleContinueAsking = async () => {
    setIsLoading(true)
    setMessages(prev => [...prev, {
      id: `cont-${Date.now()}`,
      type: 'assistant',
      content: 'Let me ask another question...'
    }])
    try {
      const res = await generateDeepQuestions(
        initialPrompt,
        initialPrompt,
        answers,
        questionsRef.current
      )
      setMessages(prev => prev.filter(m => !m.id.startsWith('cont-')))

      if (res.success && res.questions && res.questions.length > 0) {
        const next = res.questions[0]
        const updated = [...questionsRef.current, next]
        questionsRef.current = updated
        setQuestions(updated)
        setMessages(prev => [...prev, { id: `q-${Date.now()}`, type: 'assistant', content: next }])
      } else {
        generateProfile([initialPrompt], answers, initialImage)
      }
    } catch (err) {
      console.error('Continue asking failed:', err)
      setMessages(prev => prev.filter(m => !m.id.startsWith('cont-')))
      generateProfile([initialPrompt], answers, initialImage)
    } finally {
      setIsLoading(false)
    }
  }

  const showActions = !isLoading && !isGenerating && questions.length > 0 && answers.length < questions.length

  const footer = (
    <div className="p-4 space-y-3">
      {showActions && (
        <div className="flex justify-center gap-3 flex-wrap">
          <button
            type="button"
            onClick={handleGenerateNow}
            className="px-5 py-2.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-full text-sm font-medium shadow hover:shadow-lg transition-all"
          >
            Generate Profile Now
          </button>
          <button
            type="button"
            onClick={handleContinueAsking}
            className="px-5 py-2.5 border-2 border-teal-600 text-teal-600 rounded-full text-sm font-medium hover:bg-teal-50 transition-colors"
          >
            Continue Asking
          </button>
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={isGenerating ? 'Generating...' : isLoading ? 'Thinking...' : 'Your answer...'}
          disabled={isLoading || isGenerating}
          className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={!inputValue.trim() || isLoading || isGenerating}
          className="px-4 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shrink-0"
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          <span>Send</span>
        </button>
      </div>
    </div>
  )

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Create your profile"
      minimizable
      width="max-w-lg"
      minimizedTitle="Profile chat"
      footer={footer}
    >
      <div className="p-4 space-y-3">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                m.type === 'user'
                  ? 'bg-primary text-white'
                  : m.type === 'assistant'
                  ? 'bg-white text-gray-800 shadow border border-gray-200'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
      </div>
    </Drawer>
  )
}
