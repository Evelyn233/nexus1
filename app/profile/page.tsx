'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from 'next-auth/react'
import { ArrowLeft, Calendar, LogOut, X, Share2, Plus, Lightbulb, Search, ChevronRight, ChevronDown, MoreVertical, ShoppingBag, Heart, Play, Mail, FileText, List, Link2, Tag, MessageSquare, Eye, EyeOff, Database, Trash2, Camera, Bookmark, HeartHandshake, Briefcase, GraduationCap, Pencil, LayoutGrid, Sparkles, Paperclip, ExternalLink } from 'lucide-react'
import { ALL_SOCIAL_PLATFORMS, getPlatformByKey, getPlaceholder, SUGGESTED_PLATFORM_KEYS } from '@/lib/socialPlatforms'
import type { SocialCategory } from '@/lib/socialPlatforms'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import FirstTimeSetupModal from '@/components/FirstTimeSetupModal'
import DailyQuestionCard from '@/components/DailyQuestionCard'

function getSharePath(profileSlug?: string | null, name?: string | null, id?: string): string {
  if (profileSlug && /^[a-zA-Z0-9_-]+$/.test(profileSlug)) return profileSlug
  const slugFromName = (name || '').toLowerCase().trim().replace(/\s+/g, '').replace(/[^a-z0-9_-]/g, '')
  if (slugFromName) return slugFromName
  return id || ''
}

export default function ProfilePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, session, isLoading } = useAuth()
  const [userInfo, setUserInfo] = useState<any>(null)
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null)
  const [userSay, setUserSay] = useState<string | null>(null)
  const [tags, setTags] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [showTagsInPreview, setShowTagsInPreview] = useState(true) // 是否在右侧预览中显示用户原话+标签，默认显示
  const [tagsSaveToDb, setTagsSaveToDb] = useState(false) // 标签是否存入数据库（别人可对此提问）
  const [showSocialInPreview, setShowSocialInPreview] = useState(true) // 预览中显示 Social media 区块
  const [showLinksInPreview, setShowLinksInPreview] = useState(true)   // 预览中显示 Links 区块
  const [showExperienceInPreview, setShowExperienceInPreview] = useState(true) // 预览中显示经历区块
  const [showQABlockInPreview, setShowQABlockInPreview] = useState(true) // 预览中显示「感兴趣的话题」整块
  const [showTagsModal, setShowTagsModal] = useState(false)
  const [insights, setInsights] = useState<string[]>([])
  const [showInsightsModal, setShowInsightsModal] = useState(false)
  const [insightsInDb, setInsightsInDb] = useState<string[]>([]) // 逐个选择：哪些洞察存入数据库（别人可对此提问）
  const [customLinks, setCustomLinks] = useState<{ title?: string; url: string }[]>([])
  const [workIntroductions, setWorkIntroductions] = useState<{ id: string; cover?: string; name: string; description?: string; url?: string; isPersonalWebsite?: boolean }[]>([])
  const [showAddWorkIntroModal, setShowAddWorkIntroModal] = useState(false)
  const [newWorkIntroCover, setNewWorkIntroCover] = useState<string | null>(null)
  const [newWorkIntroName, setNewWorkIntroName] = useState('')
  const [newWorkIntroDesc, setNewWorkIntroDesc] = useState('')
  const [newWorkIntroUrl, setNewWorkIntroUrl] = useState('')
  const [workIntroModalMode, setWorkIntroModalMode] = useState<'image' | 'link'>('image')
  const [newWorkIntroIsPersonalWebsite, setNewWorkIntroIsPersonalWebsite] = useState(false)
  const [newWorkIntroCoverUploading, setNewWorkIntroCoverUploading] = useState(false)
  const [fetchLinkMetadataLoading, setFetchLinkMetadataLoading] = useState(false)
  const [linkInputFetching, setLinkInputFetching] = useState(false)
  const [linkPreviewDraft, setLinkPreviewDraft] = useState<{ cover?: string; name: string; description?: string; url: string; isPersonalWebsite?: boolean } | null>(null)
  const [linkPreviewCoverUploading, setLinkPreviewCoverUploading] = useState(false)
  const linkPreviewCoverInputRef = useRef<HTMLInputElement>(null)
  const [editingWorkIntroId, setEditingWorkIntroId] = useState<string | null>(null)
  const workIntroCoverInputRef = useRef<HTMLInputElement>(null)

  // 经历（LinkedIn 风格）：工作经历 + 教育经历
  type ExperienceItem = { id: string; title: string; company: string; employmentType?: string; location?: string; startDate?: string; endDate?: string; current?: boolean; description?: string }
  type EducationItem = { id: string; school: string; degree?: string; fieldOfStudy?: string; startDate?: string; endDate?: string; grade?: string; description?: string }
  const [experiences, setExperiences] = useState<ExperienceItem[]>([])
  const [education, setEducation] = useState<EducationItem[]>([])
  const [showExperienceModal, setShowExperienceModal] = useState(false)
  const [experienceModalTab, setExperienceModalTab] = useState<'experience' | 'education'>('experience')
  const [editingExpId, setEditingExpId] = useState<string | null>(null)
  const [editingEduId, setEditingEduId] = useState<string | null>(null)
  const [expForm, setExpForm] = useState<Omit<ExperienceItem, 'id'> & { id?: string }>({ title: '', company: '', employmentType: '', location: '', startDate: '', endDate: '', current: false, description: '' })
  const [eduForm, setEduForm] = useState<Omit<EducationItem, 'id'> & { id?: string }>({ school: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '', grade: '', description: '' })

  type PeopleNeededItem = { text: string; detail?: string; stageTag?: string; contentTag?: string }
  type ProjectReference = { title: string; url: string; cover?: string; stageTag?: string; contentTag?: string }
  const STAGE_RECOMMENDED_TAGS = ['Idea', 'Planning'] as const
  function inferStageFromPeopleNeeded(peopleNeeded: PeopleNeededItem[]): string {
    const text = peopleNeeded.map((p) => (p.text + ' ' + (p.detail ?? '')).toLowerCase()).join(' ')
    if (/co-founder|founding partner|cofounder|idea partner|advisor|consultant|mentor|strategist/.test(text)) return 'Planning'
    return 'Idea'
  }
  function stageDisplayLabel(stage: string | undefined): string {
    return (stage ?? '').trim() || 'Idea'
  }
  type ProjectAttachment = { url: string; name: string; addedAt?: number; stageTag?: string; contentTag?: string }
  type ProjectItem = {
    text: string
    visibility: 'individual' | 'public' | 'hidden'
    showOnPlaza: boolean
    peopleNeeded?: PeopleNeededItem[]
    detail?: string
    references?: ProjectReference[]
    detailImage?: string
    attachments?: ProjectAttachment[]
    stage?: string
    stageOrder?: string[]
    stageEnteredAt?: Record<string, number>
    aiSuggestedStages?: string[]
    creators?: string[]
    createdAt?: number
  }
  const [projectsList, setProjectsList] = useState<ProjectItem[]>([])
  const [projectMetaEditor, setProjectMetaEditor] = useState<{
    projectIndex: number
    text: string
    detail: string
    references: ProjectReference[]
    detailImage: string
    attachments: ProjectAttachment[]
    linkInput: string
    stage: string
    stageOrder: string[]
    stageInput: string
    stageEnteredAt: Record<string, number>
    creators: string[]
    creatorInput: string
    peopleNeeded: PeopleNeededItem[]
    openToInput: string
  } | null>(null)
  const [projectMetaFetching, setProjectMetaFetching] = useState(false)
  const [projectMetaUploading, setProjectMetaUploading] = useState(false)
  const [projectMetaAttachmentUploading, setProjectMetaAttachmentUploading] = useState(false)
  const [stageSuggestions, setStageSuggestions] = useState<string[]>([])
  const [stageSuggestionsLoading, setStageSuggestionsLoading] = useState(false)
  const [inviteEmailLoading, setInviteEmailLoading] = useState(false)
  const [inviteEmailError, setInviteEmailError] = useState<string | null>(null)
  const [inviteEmailSent, setInviteEmailSent] = useState(false)
  useEffect(() => {
    if (!projectMetaEditor) {
      setInviteEmailError(null)
      setInviteEmailSent(false)
    }
  }, [projectMetaEditor])
  const [tagConfirmDialog, setTagConfirmDialog] = useState<{
    type: 'ref' | 'att' | 'people'
    key: string
    suggestStage: string
    suggestTag: string
    editStage: string
    editTag: string
    suggestUpdateStage: boolean
    updateStage: boolean
  } | null>(null)
  const [tagAnalyzing, setTagAnalyzing] = useState(false)
  const [projectMetaAttachmentMenuIndex, setProjectMetaAttachmentMenuIndex] = useState<number | null>(null)
  const [projectInput, setProjectInput] = useState('')
  const [editingProjectIndex, setEditingProjectIndex] = useState<number | null>(null)
  const [editingProjectValue, setEditingProjectValue] = useState('')
  const [peopleNeedEditor, setPeopleNeedEditor] = useState<{ projectIndex: number; whoIndex: number | null; text: string; detail: string } | null>(null)
  const [showAddActivityModal, setShowAddActivityModal] = useState(false)
  const [addActivityDraft, setAddActivityDraft] = useState('')
  const [addActivityVisibility, setAddActivityVisibility] = useState<'public' | 'individual' | null>(null)
  const [addActivityNeedPeople, setAddActivityNeedPeople] = useState<boolean | null>(null)
  const [addActivityPeopleInput, setAddActivityPeopleInput] = useState('')
  const [addActivityPeopleList, setAddActivityPeopleList] = useState<string[]>([])
  const [addActivityEditingWhoIndex, setAddActivityEditingWhoIndex] = useState<number | null>(null)
  const [addActivityEditingWhoValue, setAddActivityEditingWhoValue] = useState('')
  const [addActivityShowOnPlaza, setAddActivityShowOnPlaza] = useState<boolean | null>(null)
  const [addActivityInputFromModal, setAddActivityInputFromModal] = useState('')
  const [howToEngageMeOnline, setHowToEngageMeOnline] = useState('')
  const [howToEngageMeOffline, setHowToEngageMeOffline] = useState('')
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({})
  const [editingSocial, setEditingSocial] = useState<string | null>(null)
  const [editingSocialAsLink, setEditingSocialAsLink] = useState(false) // true = 从 Add 弹窗添加，写入 Links (customLinks)
  const [socialUrlInput, setSocialUrlInput] = useState('')
  const [showAddSocialList, setShowAddSocialList] = useState(false)
  const [showAddSocialIcon, setShowAddSocialIcon] = useState(false) // Social media 专用：Add social icon 列表弹窗
  const [addModalTarget, setAddModalTarget] = useState<'social' | 'links'>('links') // links = 加到 Links（大弹窗）
  const [socialSearch, setSocialSearch] = useState('')
  const [addModalCategory, setAddModalCategory] = useState<SocialCategory | 'view_all'>('suggested')
  const [showTopLeftMenu, setShowTopLeftMenu] = useState(false)
  const topLeftMenuRef = useRef<HTMLDivElement>(null)
  const [previewCardMenuOpen, setPreviewCardMenuOpen] = useState(false)
  const [shareLinkCopied, setShareLinkCopied] = useState(false)
  const [projectMetaEditorMenuOpen, setProjectMetaEditorMenuOpen] = useState(false)
  const [projectVisibilityDropdownIndex, setProjectVisibilityDropdownIndex] = useState<number | null>(null)
  const previewCardMenuRef = useRef<HTMLDivElement>(null)
  const projectMetaEditorMenuRef = useRef<HTMLDivElement>(null)
  const projectVisibilityDropdownRef = useRef<HTMLDivElement>(null)
  const profilePhotoInputRef = useRef<HTMLInputElement>(null)
  const qaSectionRef = useRef<HTMLDivElement>(null)
  const oneSentenceTextareaRef = useRef<HTMLTextAreaElement>(null)
  const [showQAModal, setShowQAModal] = useState(false) // 右上角三点 → 感兴趣的话题 打开的编辑弹窗
  const [oneSentenceDesc, setOneSentenceDesc] = useState('') // Describe myself in one sentence
  const [showOneSentenceModal, setShowOneSentenceModal] = useState(false) // 编辑一句话介绍弹窗
  const [showMessagesModal, setShowMessagesModal] = useState(false) // 收到的消息层（别人问我的问题）
  const [showFavoritesModal, setShowFavoritesModal] = useState(false)
  const [showPotentialConnectionModal, setShowPotentialConnectionModal] = useState(false)
  const [viewedPotentialConnections, setViewedPotentialConnections] = useState<{ targetUserId: string; targetName?: string; hint: string; possibleTopics?: string[]; viewedAt: string; source?: 'viewed' | 'engage' }[]>([])
  const [favoriteProfiles, setFavoriteProfiles] = useState<{ userId: string; name?: string; avatar?: string | null; profileSlug?: string | null; oneSentenceDesc?: string | null }[]>([])
  const [showSendMessageModal, setShowSendMessageModal] = useState(false) // 发消息给 TA 弹窗（RAG 无结果时）
  const [sendMessageDraft, setSendMessageDraft] = useState('') // 弹窗内可编辑的内容
  const [profileMessages, setProfileMessages] = useState<{ id: string; text: string; createdAt: string; from: { id: string; name: string; image: string | null } | null }[]>([])
  const [sendToEvelynFeedback, setSendToEvelynFeedback] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [lastSeenMessageCount, setLastSeenMessageCount] = useState(0) // 红点：未读数 = profileMessages.length - lastSeenMessageCount
  const [showProjectsModal, setShowProjectsModal] = useState(false) // 右上角三点 → Project：已发布的项目列表
  const [showDatabaseSourcesModal, setShowDatabaseSourcesModal] = useState(false) // 增加数据库：Word / LinkedIn / 个人网页 / Notion 等
  const [databaseSources, setDatabaseSources] = useState<{ id: string; type: string; url: string; title?: string }[]>([])
  const [newDatabaseSourceType, setNewDatabaseSourceType] = useState('linkedin')
  const [newDatabaseSourceUrl, setNewDatabaseSourceUrl] = useState('')
  const [newDatabaseSourceFile, setNewDatabaseSourceFile] = useState<File | null>(null) // Word/PDF 上传
  const [databaseSourceFileAdding, setDatabaseSourceFileAdding] = useState(false)
  const [databaseSourceFileAddResult, setDatabaseSourceFileAddResult] = useState<'success' | 'error' | null>(null)
  const [newDatabaseSourceText, setNewDatabaseSourceText] = useState('') // 粘贴文本（LinkedIn 等无法抓取时用）
  const [databaseSourceTextAdding, setDatabaseSourceTextAdding] = useState(false)
  const [databaseSourceTextAddResult, setDatabaseSourceTextAddResult] = useState<'success' | 'error' | null>(null)
  const [databaseSourceTextAddError, setDatabaseSourceTextAddError] = useState<string>('')
  const [pendingRagCount, setPendingRagCount] = useState(0) // RAG 不可用时已保存到 profile 的文本条数，待启动 RAG 后同步
  const [ragSyncPending, setRagSyncPending] = useState(false) // 正在执行「同步到 RAG」
  const [ragInitPending, setRagInitPending] = useState(false) // 正在执行「初始化 RAG 表」
  const [ragInitMessage, setRagInitMessage] = useState<string | null>(null) // 初始化结果提示

  // 增加数据库：可选类型（Word / LinkedIn / 个人网页 / Notion / PDF / Google Doc / 其他）
  const DATABASE_SOURCE_TYPES = [
    { id: 'word', label: 'Word 文档' },
    { id: 'linkedin', label: 'LinkedIn 页面' },
    { id: 'personal_web', label: '个人网页' },
    { id: 'notion', label: 'Notion 页面' },
    { id: 'pdf', label: 'PDF 文件' },
    { id: 'google_doc', label: 'Google 文档' },
    { id: 'other', label: '其他链接' }
  ]

  const qaListStorageKey = typeof userInfo?.id === 'string' ? `profileQAList_${userInfo.id}` : 'profileQAList'
  const [qaList, setQaList] = useState<{ question: string; answer: string; showInPreview?: boolean; saveToDb?: boolean }[]>([])
  const [showAddQA, setShowAddQA] = useState(false)
  const [newQAQuestion, setNewQAQuestion] = useState('')
  const [newQAAnswer, setNewQAAnswer] = useState('')
  const [isGeneratingQA, setIsGeneratingQA] = useState(false)
  const [sendingQAIndex, setSendingQAIndex] = useState<number | null>(null) // 正在发送的 Q&A 索引（不显示分析中，只禁用按钮）
  const [generatedToast, setGeneratedToast] = useState<{ message: string; index: number } | null>(null) // 生成结果提示，显示在对应那条 Q&A 旁
  const [askMeAnythingValue, setAskMeAnythingValue] = useState('') // 右边卡片 Q&A 底部「Query my database」输入
  const [databaseQueryResults, setDatabaseQueryResults] = useState<{ type: 'tag' | 'insight' | 'qa' | 'rag'; text: string; extra?: string; askUser?: boolean; showMessageToTa?: boolean }[] | null>(null)
  const [databaseLastQuery, setDatabaseLastQuery] = useState('') // 上次查询词，用于显示「无结果」提示
  const [databaseQueryLoading, setDatabaseQueryLoading] = useState(false) // 正在问 RAG 服务
  const [databaseQueryRagError, setDatabaseQueryRagError] = useState<'unavailable' | 'empty' | null>(null) // RAG 未配置/未启动 或 索引为空
  const [ragStatusCheck, setRagStatusCheck] = useState<{ configured: boolean; reachable: boolean; processedCount?: number; testQuery?: string; testAnswer?: string; error?: string; hint?: string } | null>(null)
  const [ragStatusChecking, setRagStatusChecking] = useState(false)
  const [dbToastMessage, setDbToastMessage] = useState<string | null>(null)
  const [plazaToastMessage, setPlazaToastMessage] = useState<string | null>(null)
  const [hasNewDbAdditions, setHasNewDbAdditions] = useState(false)

  // 检查 RAG 是否已配置且可连接；若传入上次查询，用其作为状态页的测试问句
  const checkRagStatus = useCallback(async () => {
    setRagStatusChecking(true)
    setRagStatusCheck(null)
    try {
      const qs = databaseLastQuery.trim() ? `?testQuery=${encodeURIComponent(databaseLastQuery.trim())}` : ''
      const res = await fetch(`/api/rag/status${qs}`, { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      setRagStatusCheck({
        configured: !!data.configured,
        reachable: !!data.reachable,
        processedCount: typeof data.processedCount === 'number' ? data.processedCount : undefined,
        testQuery: data.testQuery,
        testAnswer: data.testAnswer !== undefined ? data.testAnswer : undefined,
        error: data.error,
        hint: data.hint,
      })
    } catch {
      setRagStatusCheck({ configured: false, reachable: false, error: '请求失败', hint: '请检查 Next.js 是否在运行' })
    } finally {
      setRagStatusChecking(false)
    }
  }, [databaseLastQuery])

  // RAG 返回空时自动拉一次状态，直接显示「索引为空」或「索引中有 N 篇文档」+ 测试回答，无需再点「检查 RAG 状态」
  const fetchRagStatusForQuery = useCallback(async (testQuery: string) => {
    try {
      const qs = testQuery.trim() ? `?testQuery=${encodeURIComponent(testQuery.trim())}` : ''
      const res = await fetch(`/api/rag/status${qs}`, { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      setRagStatusCheck({
        configured: !!data.configured,
        reachable: !!data.reachable,
        processedCount: typeof data.processedCount === 'number' ? data.processedCount : undefined,
        testQuery: data.testQuery,
        testAnswer: data.testAnswer !== undefined ? data.testAnswer : undefined,
        error: data.error,
        hint: data.hint,
      })
    } catch {
      setRagStatusCheck({ configured: false, reachable: false, error: '请求失败', hint: '请检查 Next.js 是否在运行' })
    }
  }, [])

  // 先搜本地：全部标签、全部洞察、以及勾选「存入数据库」的 Q&A；无结果时再问 MiniRAG
  const handleQueryDatabaseSubmit = useCallback(async () => {
    const q = askMeAnythingValue.trim()
    if (!q) return
    const lower = q.toLowerCase()
    const results: { type: 'tag' | 'insight' | 'qa' | 'rag'; text: string; extra?: string }[] = []
    tags.filter(t => t.toLowerCase().includes(lower)).forEach(t => results.push({ type: 'tag', text: t }))
    insights.filter(s => s.toLowerCase().includes(lower)).forEach(s => results.push({ type: 'insight', text: s }))
    qaList.filter(item => item.saveToDb === true).forEach(item => {
      const qText = (item.question || '').toLowerCase()
      const aText = (item.answer || '').toLowerCase()
      if (qText.includes(lower) || aText.includes(lower)) {
        results.push({ type: 'qa', text: item.question || '', extra: item.answer || '—' })
      }
    })
    setDatabaseLastQuery(q)
    setAskMeAnythingValue('')
    setDatabaseQueryRagError(null)
    if (results.length > 0) {
      setDatabaseQueryResults(results)
      return
    }
    setDatabaseQueryLoading(true)
    setDatabaseQueryResults(null)
    try {
      const res = await fetch('/api/rag/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ query: q })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && typeof data?.answer === 'string' && data.answer.trim()) {
        setDatabaseQueryResults([{ type: 'rag', text: data.answer.trim(), askUser: !!data?.askUser, showMessageToTa: !!data?.showMessageToTa }])
        setDatabaseQueryRagError(null)
      } else {
        // 若中文提问无结果且包含年份，用英文再问一次（内容多为英文时更易匹配）
        const yearMatch = q.match(/(\d{4})年?/)
        const name = typeof session?.user?.name === 'string' ? session.user.name : 'Evelyn'
        const fallbackQuery = yearMatch ? `What did ${name} do in ${yearMatch[1]}` : null
        if (res.ok && fallbackQuery) {
          try {
            const res2 = await fetch('/api/rag/query', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({ query: fallbackQuery })
            })
            const data2 = await res2.json().catch(() => ({}))
            if (res2.ok && typeof data2?.answer === 'string' && data2.answer.trim()) {
              setDatabaseQueryResults([{ type: 'rag', text: data2.answer.trim(), askUser: !!data2?.askUser, showMessageToTa: !!data2?.showMessageToTa }])
              setDatabaseQueryRagError(null)
            } else {
              setDatabaseQueryResults([])
              setDatabaseQueryRagError('empty')
              fetchRagStatusForQuery(q)
            }
          } catch {
            setDatabaseQueryResults([])
            setDatabaseQueryRagError('empty')
            fetchRagStatusForQuery(q)
          }
        } else {
          setDatabaseQueryResults([])
          if (res.status === 503) {
            setDatabaseQueryRagError('unavailable')
          } else {
            setDatabaseQueryRagError('empty')
            fetchRagStatusForQuery(q)
          }
        }
      }
    } catch {
      setDatabaseQueryResults([])
      setDatabaseQueryRagError('unavailable')
    } finally {
      setDatabaseQueryLoading(false)
    }
  }, [askMeAnythingValue, tags, insights, qaList, session?.user?.name, fetchRagStatusForQuery])

  // 拉取收到的消息（进入 profile 时 + 打开消息层时 + 轮询以便收到新消息时显示小红点）
  const fetchProfileMessages = useCallback(() => {
    fetch('/api/profile-messages', { credentials: 'include' })
      .then((res) => res.ok ? res.json() : { messages: [] })
      .then((data) => setProfileMessages(data.messages || []))
      .catch(() => setProfileMessages([]))
  }, [])
  useEffect(() => {
    if (!isAuthenticated) return
    fetchProfileMessages()
  }, [isAuthenticated, fetchProfileMessages])
  useEffect(() => {
    if (showMessagesModal) fetchProfileMessages()
  }, [showMessagesModal, fetchProfileMessages])
  // 轮询 + 切回标签页时刷新：有人发消息时能及时显示小红点
  useEffect(() => {
    if (!isAuthenticated) return
    const interval = setInterval(fetchProfileMessages, 15000)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchProfileMessages()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [isAuthenticated, fetchProfileMessages])

  // 发送到 Evelyn：只写入消息层（API），不弹抽屉；Evelyn 在右上角三点 → Messages 里查看
  const handleSendToEvelyn = useCallback(async () => {
    const q = databaseLastQuery.trim()
    if (!q || !userInfo?.id) return
    setSendToEvelynFeedback('sending')
    try {
      const res = await fetch('/api/profile-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ toUserId: userInfo.id, text: q })
      })
      if (res.ok) {
        setSendToEvelynFeedback('sent')
        fetchProfileMessages() // 刷新消息列表，红点/数量立即更新
        setTimeout(() => setSendToEvelynFeedback('idle'), 2500)
      } else {
        setSendToEvelynFeedback('error')
        setTimeout(() => setSendToEvelynFeedback('idle'), 3000)
      }
    } catch (_) {
      setSendToEvelynFeedback('error')
      setTimeout(() => setSendToEvelynFeedback('idle'), 3000)
    }
  }, [databaseLastQuery, userInfo?.id, fetchProfileMessages])

  // 从弹窗发送消息给 TA（内容为弹窗内编辑的 sendMessageDraft）
  const handleSendMessageFromModal = useCallback(async () => {
    const text = sendMessageDraft.trim()
    if (!text || !userInfo?.id) return
    setSendToEvelynFeedback('sending')
    try {
      const res = await fetch('/api/profile-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ toUserId: userInfo.id, text })
      })
      if (res.ok) {
        setSendToEvelynFeedback('sent')
        fetchProfileMessages()
        setDatabaseQueryResults(null)
        setDatabaseLastQuery('')
        setTimeout(() => {
          setSendToEvelynFeedback('idle')
          setShowSendMessageModal(false)
          setSendMessageDraft('')
        }, 1500)
      } else {
        setSendToEvelynFeedback('error')
        setTimeout(() => setSendToEvelynFeedback('idle'), 3000)
      }
    } catch (_) {
      setSendToEvelynFeedback('error')
      setTimeout(() => setSendToEvelynFeedback('idle'), 3000)
    }
  }, [sendMessageDraft, userInfo?.id, fetchProfileMessages])

  // 红点：从 localStorage 恢复“已看到的消息数”
  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('profileMessagesLastSeen') : null
      if (raw != null) setLastSeenMessageCount(Math.max(0, parseInt(raw, 10)))
    } catch {}
  }, [])
  const markMessagesSeen = useCallback(() => {
    setLastSeenMessageCount(profileMessages.length)
    try {
      localStorage.setItem('profileMessagesLastSeen', String(profileMessages.length))
    } catch {}
  }, [profileMessages.length])

  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      loadUserData()
    } else {
      setIsLoadingData(false)
    }
  }, [isAuthenticated])

  // 用 ref 存当前 profile 状态，供保存时从 state 拼 payload（不读 localStorage，以 Neon 为准）
  const profileStateRef = useRef<Record<string, unknown>>({})
  const lastSavedDbTotalRef = useRef(0) // 上次保存时的入库总数，用于判断是否「新增」再显示 toast
  useEffect(() => {
    profileStateRef.current = {
      tags,
      selectedTags,
      insights,
      insightsInDb,
      oneSentenceDesc: oneSentenceDesc || '',
      userSay: userSay ?? null,
      projects: projectsList,
      collaborationPossibility: projectsList.map((p) => ({ text: p.text, visibility: p.visibility, showOnPlaza: p.showOnPlaza, peopleNeeded: p.peopleNeeded, detail: p.detail, references: p.references, detailImage: p.detailImage, attachments: p.attachments, stage: p.stage, stageOrder: p.stageOrder, stageEnteredAt: p.stageEnteredAt, creators: p.creators, createdAt: p.createdAt })), // backward compat
      peopleToCollaborateWith: projectsList.filter((p) => p.visibility === 'public').flatMap((p) => (p.peopleNeeded ?? []).map((n) => n.text)), // backward compat
      howToEngageMeOnline,
      howToEngageMeOffline,
      socialLinks,
      customLinks,
      workIntroductions,
      experiences,
      education,
      qaList,
      databaseSources,
      avatarDataUrl: avatarDataUrl ?? null,
      tagsSaveToDb,
    }
  })
  const getProfileDataFromState = useCallback((overrides: Record<string, unknown> = {}) => ({
    ...profileStateRef.current,
    ...overrides,
  }), [])

  // 加载「看过的」潜在合作列表（用于菜单角标）；监听更新
  const loadViewedPotential = useCallback(async () => {
    try {
      const res = await fetch('/api/profile-collaboration-hints', { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (Array.isArray(data?.list) && data.list.length > 0) {
        setViewedPotentialConnections(data.list)
        return
      }
    } catch (_) {}
    try {
      const raw = localStorage.getItem('profile_viewed_potential')
      setViewedPotentialConnections(raw ? JSON.parse(raw) : [])
    } catch {}
  }, [])
  useEffect(() => {
    loadViewedPotential()
    window.addEventListener('potentialConnection:updated', loadViewedPotential)
    return () => window.removeEventListener('potentialConnection:updated', loadViewedPotential)
  }, [loadViewedPotential])

  // 仅从 Neon（API）加载用户数据；只把 UI 偏好放 localStorage
  useEffect(() => {
    try {
      const v = localStorage.getItem('profileShowTagsInPreview')
      setShowTagsInPreview(v !== '0')
    } catch {}
    try {
      setShowSocialInPreview(localStorage.getItem('profileShowSocialInPreview') !== '0')
      setShowLinksInPreview(localStorage.getItem('profileShowLinksInPreview') !== '0')
      setShowExperienceInPreview(localStorage.getItem('profileShowExperienceInPreview') !== '0')
      setShowQABlockInPreview(localStorage.getItem('profileShowQABlockInPreview') !== '0')
      setTagsSaveToDb(localStorage.getItem('profileTagsSaveToDb') === '1')
    } catch {}
  }, [])

  useEffect(() => {
    if (!projectMetaEditor) {
      setStageSuggestions([])
    } else {
      const proj = projectsList[projectMetaEditor.projectIndex]
      setStageSuggestions(proj?.aiSuggestedStages ?? [])
    }
  }, [projectMetaEditor, projectsList])

  useEffect(() => {
    const onComplete = () => loadUserData()
    window.addEventListener('profileChat:completed', onComplete)
    return () => window.removeEventListener('profileChat:completed', onComplete)
  }, [])

  useEffect(() => {
    const onInsightsUpdated = () => loadUserData()
    window.addEventListener('profileChat:insightsUpdated', onInsightsUpdated)
    return () => window.removeEventListener('profileChat:insightsUpdated', onInsightsUpdated)
  }, [])

  // Homepage "Create project" redirect: ?addProject=name or ?openAddProject=1 opens add modal
  useEffect(() => {
    const addProject = searchParams.get('addProject')
    const openAddProject = searchParams.get('openAddProject')
    if ((addProject || openAddProject) && isAuthenticated && !isLoadingData) {
      const name = addProject ? decodeURIComponent(addProject).trim() : ''
      setAddActivityDraft(name)
      setShowAddActivityModal(true)
      setAddActivityVisibility(null)
      setAddActivityNeedPeople(null)
      setAddActivityPeopleList([])
      setAddActivityPeopleInput('')
      setAddActivityEditingWhoIndex(null)
      setAddActivityShowOnPlaza(null)
      router.replace('/profile', { scroll: false })
    }
  }, [searchParams, isAuthenticated, isLoadingData, router])

  useEffect(() => {
    if (!showTopLeftMenu) return
    const onDocClick = (e: MouseEvent) => {
      if (topLeftMenuRef.current && !topLeftMenuRef.current.contains(e.target as Node)) {
        setShowTopLeftMenu(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [showTopLeftMenu])

  useEffect(() => {
    if (!previewCardMenuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (previewCardMenuRef.current && !previewCardMenuRef.current.contains(e.target as Node)) {
        setPreviewCardMenuOpen(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [previewCardMenuOpen])

  useEffect(() => {
    if (!projectMetaEditorMenuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (projectMetaEditorMenuRef.current && !projectMetaEditorMenuRef.current.contains(e.target as Node)) {
        setProjectMetaEditorMenuOpen(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [projectMetaEditorMenuOpen])

  useEffect(() => {
    if (projectVisibilityDropdownIndex === null) return
    const onDocClick = (e: MouseEvent) => {
      if (projectVisibilityDropdownRef.current && !projectVisibilityDropdownRef.current.contains(e.target as Node)) {
        setProjectVisibilityDropdownIndex(null)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [projectVisibilityDropdownIndex])

  // 一句话介绍框高度随内容贴合，完整显示、不出现滚动条
  const resizeOneSentence = useCallback(() => {
    const el = oneSentenceTextareaRef.current
    if (!el) return
    el.style.height = '0px'
    const h = Math.max(28, el.scrollHeight + 2)
    el.style.height = `${h}px`
  }, [])
  useEffect(() => {
    resizeOneSentence()
    requestAnimationFrame(resizeOneSentence)
  }, [oneSentenceDesc, resizeOneSentence])

  const loadUserData = async () => {
    try {
      setIsLoadingData(true)
      const infoResponse = await fetch('/api/user/info', { cache: 'no-store' })
      if (infoResponse.ok) {
        const infoData = await infoResponse.json()
        const u = infoData.userInfo
        setUserInfo(u)
        if (u?.avatarDataUrl) {
          setAvatarDataUrl(u.avatarDataUrl)
        }
        // 从数据库加载 profileData
        const pd = infoData.profileData
        if (pd) {
          if (pd.socialLinks && typeof pd.socialLinks === 'object') setSocialLinks(pd.socialLinks)
          if (Array.isArray(pd.tags)) setTags(pd.tags)
          if (Array.isArray(pd.selectedTags)) setSelectedTags(pd.selectedTags)
          if (Array.isArray(pd.insights)) setInsights(pd.insights)
          if (Array.isArray(pd.qaList)) {
            const fromDb = pd.qaList.map((item: { question?: string; answer?: string; showInPreview?: boolean; saveToDb?: boolean }) => ({
              question: (item.question ?? '').trim(),
              answer: item.answer ?? '',
              showInPreview: item.showInPreview === true,
              saveToDb: item.saveToDb === true,
            }))
            setQaList(fromDb)
          }
          if (Array.isArray(pd.insightsInDb)) {
            setInsightsInDb(pd.insightsInDb.filter((x: unknown): x is string => typeof x === 'string'))
          }
          if (Array.isArray(pd.customLinks)) {
            setCustomLinks(pd.customLinks.filter((l: unknown) => l && typeof l === 'object' && 'url' in l))
          }
          if (Array.isArray(pd.workIntroductions)) {
            setWorkIntroductions(
              pd.workIntroductions
                .filter((w: unknown) => w && typeof w === 'object' && 'id' in w && 'name' in w)
                .map((w: { id?: string; cover?: string; name?: string; description?: string; url?: string; isPersonalWebsite?: boolean }) => ({
                  id: typeof w.id === 'string' ? w.id : `w-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                  cover: typeof w.cover === 'string' ? w.cover : undefined,
                  name: typeof w.name === 'string' ? w.name : '',
                  description: typeof w.description === 'string' ? w.description : undefined,
                  url: typeof w.url === 'string' ? w.url : undefined,
                  isPersonalWebsite: w.isPersonalWebsite === true,
                }))
            )
          }
          if (Array.isArray(pd.experiences)) {
            setExperiences(
              pd.experiences
                .filter((x: unknown) => x && typeof x === 'object' && 'id' in x && 'title' in x && 'company' in x)
                .map((x: { id?: string; title?: string; company?: string; employmentType?: string; location?: string; startDate?: string; endDate?: string; current?: boolean; description?: string }) => ({
                  id: typeof x.id === 'string' ? x.id : `exp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                  title: typeof x.title === 'string' ? x.title : '',
                  company: typeof x.company === 'string' ? x.company : '',
                  employmentType: typeof x.employmentType === 'string' ? x.employmentType : undefined,
                  location: typeof x.location === 'string' ? x.location : undefined,
                  startDate: typeof x.startDate === 'string' ? x.startDate : undefined,
                  endDate: typeof x.endDate === 'string' ? x.endDate : undefined,
                  current: x.current === true,
                  description: typeof x.description === 'string' ? x.description : undefined,
                }))
            )
          }
          if (Array.isArray(pd.education)) {
            setEducation(
              pd.education
                .filter((x: unknown) => x && typeof x === 'object' && 'id' in x && 'school' in x)
                .map((x: { id?: string; school?: string; degree?: string; fieldOfStudy?: string; startDate?: string; endDate?: string; grade?: string; description?: string }) => ({
                  id: typeof x.id === 'string' ? x.id : `edu-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                  school: typeof x.school === 'string' ? x.school : '',
                  degree: typeof x.degree === 'string' ? x.degree : undefined,
                  fieldOfStudy: typeof x.fieldOfStudy === 'string' ? x.fieldOfStudy : undefined,
                  startDate: typeof x.startDate === 'string' ? x.startDate : undefined,
                  endDate: typeof x.endDate === 'string' ? x.endDate : undefined,
                  grade: typeof x.grade === 'string' ? x.grade : undefined,
                  description: typeof x.description === 'string' ? x.description : undefined,
                }))
            )
          }
          if (Array.isArray(pd.projects)) {
            setProjectsList(
              pd.projects
                .filter((x: unknown) => x && typeof x === 'object' && 'text' in (x as object))
                .map((x: { text?: string; visibility?: string; showOnPlaza?: boolean; peopleNeeded?: Array<string | { text?: string; detail?: string }>; detail?: string; references?: Array<{ title?: string; url?: string; cover?: string; stageTag?: string; contentTag?: string }>; detailImage?: string; attachments?: Array<{ url?: string; name?: string; addedAt?: number; stageTag?: string; contentTag?: string }>; stage?: string; stageOrder?: string[]; stageEnteredAt?: Record<string, number>; creators?: string[]; createdAt?: number }) => ({
                  text: String(x.text ?? '').trim(),
                  visibility: (x.visibility === 'public' ? 'public' : x.visibility === 'hidden' ? 'hidden' : 'individual') as 'individual' | 'public' | 'hidden',
                  showOnPlaza: x.showOnPlaza === true || (x.visibility === 'public' && x.showOnPlaza !== false),
                  peopleNeeded: Array.isArray(x.peopleNeeded)
                    ? x.peopleNeeded
                        .map((item) => {
                          if (typeof item === 'string') {
                            const text = item.trim()
                            return text ? { text } : null
                          }
                          if (item && typeof item === 'object') {
                            const text = String(item.text ?? '').trim()
                            const detail = typeof item.detail === 'string' ? item.detail.trim() : ''
                            const stageTag = typeof (item as any).stageTag === 'string' ? (item as any).stageTag.trim() : undefined
                            const contentTag = typeof (item as any).contentTag === 'string' ? (item as any).contentTag.trim() : undefined
                            return text ? { text, detail: detail || undefined, stageTag: stageTag || undefined, contentTag: contentTag || undefined } : null
                          }
                          return null
                        })
                        .filter((v): v is PeopleNeededItem => v !== null)
                    : undefined,
                  detail: typeof x.detail === 'string' ? x.detail.trim() : undefined,
                  references: Array.isArray(x.references)
                    ? x.references
                        .map((r) => {
                          const url = typeof r?.url === 'string' ? r.url.trim() : ''
                          const title = typeof r?.title === 'string' ? r.title.trim() : ''
                          const cover = typeof r?.cover === 'string' ? r.cover.trim() : ''
                          if (!url) return null
                          return {
                            title: title || url,
                            url,
                            ...(cover ? { cover } : {}),
                            ...(typeof r?.stageTag === 'string' && r.stageTag.trim() ? { stageTag: r.stageTag.trim() } : {}),
                            ...(typeof r?.contentTag === 'string' && r.contentTag.trim() ? { contentTag: r.contentTag.trim() } : {}),
                          }
                        })
                        .filter((v): v is ProjectReference => !!v)
                    : undefined,
                  detailImage: typeof x.detailImage === 'string' ? x.detailImage.trim() : undefined,
                  attachments: Array.isArray(x.attachments)
                    ? x.attachments
                        .map((a): ProjectAttachment | null => (a && typeof a.url === 'string' && a.url.trim() ? { url: a.url.trim(), name: typeof a.name === 'string' ? a.name.trim() || a.url : a.url, addedAt: typeof a.addedAt === 'number' ? a.addedAt : undefined, ...(typeof a.stageTag === 'string' && a.stageTag.trim() ? { stageTag: a.stageTag.trim() } : {}), ...(typeof a.contentTag === 'string' && a.contentTag.trim() ? { contentTag: a.contentTag.trim() } : {}) } : null))
                        .filter((v): v is ProjectAttachment => !!v)
                    : undefined,
                  stage: typeof x.stage === 'string' && x.stage.trim() ? x.stage.trim() : undefined,
                  stageOrder: Array.isArray(x.stageOrder) && x.stageOrder.length > 0
                    ? x.stageOrder.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim())
                    : undefined,
                  stageEnteredAt: x.stageEnteredAt && typeof x.stageEnteredAt === 'object'
                    ? Object.fromEntries(Object.entries(x.stageEnteredAt).filter(([, v]) => typeof v === 'number').map(([k, v]) => [k, v as number]))
                    : undefined,
                  aiSuggestedStages: Array.isArray((x as { aiSuggestedStages?: string[] }).aiSuggestedStages)
                    ? (x as { aiSuggestedStages: string[] }).aiSuggestedStages.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim())
                    : undefined,
                  creators: Array.isArray(x.creators) ? x.creators.filter((s): s is string => typeof s === 'string' && s.trim().length > 0).map((s) => s.trim()) : undefined,
                  createdAt: typeof x.createdAt === 'number' ? x.createdAt : Date.now(),
                }))
                .filter((p: { text: string }) => p.text)
            )
          } else {
            // Migrate from old collaborationPossibility + peopleToCollaborateWith
            const what: ProjectItem[] = []
            if (Array.isArray(pd.collaborationPossibility)) {
              pd.collaborationPossibility.forEach((x: unknown) => {
                const text = typeof x === 'object' && x && 'text' in (x as object) ? String((x as { text: string }).text).trim() : (typeof x === 'string' ? (x as string).trim() : '')
                if (text) {
                  const isPublic = typeof x === 'object' && x && 'isPublic' in (x as object) ? (x as { isPublic?: boolean }).isPublic !== false : true
                  what.push({ text, visibility: isPublic ? 'public' : 'individual', showOnPlaza: isPublic, peopleNeeded: [], createdAt: Date.now() })
                }
              })
            } else if (pd.collaborationPossibility && typeof pd.collaborationPossibility === 'string') {
              pd.collaborationPossibility
                .split(/\n/)
                .map((s: string) => s.trim())
                .filter(Boolean)
                .forEach((s: string) => what.push({ text: s, visibility: 'public', showOnPlaza: true, peopleNeeded: [], createdAt: Date.now() }))
            }
            const whoArr = Array.isArray(pd.peopleToCollaborateWith)
              ? (pd.peopleToCollaborateWith as unknown[]).map((x) => (typeof x === 'object' && x && 'text' in (x as object) ? (x as { text: string }).text : String(x))).filter(Boolean)
              : (pd.peopleToCollaborateWith && typeof pd.peopleToCollaborateWith === 'string')
                ? pd.peopleToCollaborateWith.split(/\n/).map((s: string) => s.trim()).filter(Boolean)
                : []
            if (whoArr.length > 0 && what.length > 0) {
              const firstPublic = what.findIndex((p) => p.visibility === 'public')
              if (firstPublic >= 0) {
                what[firstPublic] = {
                  ...what[firstPublic],
                  peopleNeeded: whoArr
                    .map((text: string) => ({ text: String(text).trim() }))
                    .filter((x: { text: string }) => x.text),
                  createdAt: what[firstPublic].createdAt ?? Date.now(),
                }
              }
            }
            if (what.length > 0) setProjectsList(what)
          }
          if (pd.howToEngageMeOnline && typeof pd.howToEngageMeOnline === 'string') setHowToEngageMeOnline(pd.howToEngageMeOnline)
          if (pd.howToEngageMeOffline && typeof pd.howToEngageMeOffline === 'string') setHowToEngageMeOffline(pd.howToEngageMeOffline)
          if (Array.isArray(pd.pendingRagTexts)) setPendingRagCount(pd.pendingRagTexts.length)
          else setPendingRagCount(0)
          if (pd.avatarDataUrl) setAvatarDataUrl(pd.avatarDataUrl)
          if (pd.userSay) setUserSay(pd.userSay)
          if (pd.oneSentenceDesc && typeof pd.oneSentenceDesc === 'string') {
            setOneSentenceDesc(pd.oneSentenceDesc)
          } else {
            // 若 profile 无一句话，用 earliestInput（用户最早输入）或 onboarding intro
            const fromApi = (infoData as { earliestInput?: string | null })?.earliestInput?.trim()
            const fromOnboarding = typeof window !== 'undefined' ? localStorage.getItem('newUserOnboardingIntro') : null
            const fallback = fromApi || (fromOnboarding?.trim() || '')
            if (fallback) {
              setOneSentenceDesc(fallback)
              setUserSay(fallback)
              if (typeof window !== 'undefined') {
                try { localStorage.removeItem('newUserOnboardingIntro') } catch {}
              }
              try {
                await fetch('/api/user/save', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ profileData: { ...(pd || {}), oneSentenceDesc: fallback, userSay: fallback } })
                })
              } catch {}
            }
          }
          if (Array.isArray(pd.favoriteProfiles)) {
            setFavoriteProfiles(pd.favoriteProfiles.filter((f: unknown) => f && typeof f === 'object' && 'userId' in f))
          }
          if (Array.isArray(pd.databaseSources)) {
            setDatabaseSources(
              pd.databaseSources
                .filter((x: unknown) => x != null && typeof x === 'object' && 'id' in x && 'type' in x && 'url' in x)
                .map((x: { id?: string; type?: string; url?: string; title?: string }) => ({
                  id: typeof x.id === 'string' ? x.id : `ds-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                  type: typeof x.type === 'string' ? x.type : 'other',
                  url: typeof x.url === 'string' ? x.url : '',
                  title: typeof x.title === 'string' ? x.title : undefined
                }))
            )
          }
          const tSave = pd.tagsSaveToDb === true
          const tCount = tSave && Array.isArray(pd.selectedTags) ? pd.selectedTags.length : 0
          const iCount = Array.isArray(pd.insightsInDb) ? pd.insightsInDb.length : 0
          const qCount = Array.isArray(pd.qaList) ? (pd.qaList as { saveToDb?: boolean }[]).filter((q) => q.saveToDb).length : 0
          lastSavedDbTotalRef.current = tCount + iCount + qCount
          // 用户数据以 Neon 为准，不再写入 localStorage
        }
      }
    } catch (error) {
      console.error('❌ [PROFILE] 加载用户信息失败:', error)
    } finally {
      setIsLoadingData(false)
    }
  }

  // 每日问答提交后：仅当用户填写了回答时才追加到「感兴趣的话题」，否则不加入列表、也不上卡片
  useEffect(() => {
    const onDailyQuestionSubmitted = (e: Event) => {
      const detail = (e as CustomEvent<{ question?: string; answer?: string }>)?.detail
      const ans = (detail?.answer ?? '').trim()
      if (detail?.question && ans.length > 0) {
        setQaList((prev) => {
          const next = [...prev, { question: detail!.question!, answer: detail!.answer ?? '', showInPreview: false, saveToDb: false }]
          saveProfileDataToDb(getProfileDataFromState({ qaList: next }))
          return next
        })
      }
      loadUserData()
    }
    window.addEventListener('daily-question:submitted', onDailyQuestionSubmitted)
    return () => window.removeEventListener('daily-question:submitted', onDailyQuestionSubmitted)
  }, [qaListStorageKey])

  const saveProfileDataToDb = async (data: Record<string, unknown>) => {
    try {
      await fetch('/api/user/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileData: data })
      })
      const tagsSaveToDbVal = data.tagsSaveToDb === true
      const tagsCount = tagsSaveToDbVal && Array.isArray(data.selectedTags) ? data.selectedTags.length : 0
      const insightsCount = Array.isArray(data.insightsInDb) ? data.insightsInDb.length : 0
      const topicsCount = Array.isArray(data.qaList) ? (data.qaList as { saveToDb?: boolean }[]).filter((q) => q.saveToDb).length : 0
      const total = tagsCount + insightsCount + topicsCount
      const prevTotal = lastSavedDbTotalRef.current
      lastSavedDbTotalRef.current = total
      // 仅当「新增」入库项时才显示 toast，避免用户未输入时误报「28 个洞察加入」
      if (total > 0 && total > prevTotal) {
        const parts: string[] = []
        if (tagsCount > 0) parts.push(`${tagsCount} 个标签`)
        if (insightsCount > 0) parts.push(`${insightsCount} 个洞察`)
        if (topicsCount > 0) parts.push(`${topicsCount} 个话题`)
        setDbToastMessage(`有 ${parts.join('、')} 加进数据库`)
        setTimeout(() => setDbToastMessage(null), 5000)
      }
      const key = typeof userInfo?.id === 'string' ? `profileDbLastSeen_${userInfo.id}` : 'profileDbLastSeen'
      const lastSeen = parseInt(localStorage.getItem(key) || '0', 10)
      if (total > lastSeen) setHasNewDbAdditions(true)
    } catch (e) {
      console.warn('saveProfileDataToDb failed:', e)
    }
  }

  const markDbAdditionsSeen = useCallback(() => {
    const tagsCount = tagsSaveToDb ? selectedTags.length : 0
    const total = tagsCount + insightsInDb.length + qaList.filter((q) => q.saveToDb).length
    const key = typeof userInfo?.id === 'string' ? `profileDbLastSeen_${userInfo.id}` : 'profileDbLastSeen'
    try { localStorage.setItem(key, String(total)) } catch {}
    setHasNewDbAdditions(false)
  }, [userInfo?.id, tagsSaveToDb, selectedTags.length, insightsInDb.length, qaList])

  // 初始化：根据 localStorage 判断是否有新入库（首次访问时写入当前值，不显示红点）
  useEffect(() => {
    const tagsCount = tagsSaveToDb ? selectedTags.length : 0
    const total = tagsCount + insightsInDb.length + qaList.filter((q) => q.saveToDb).length
    const key = typeof userInfo?.id === 'string' ? `profileDbLastSeen_${userInfo.id}` : 'profileDbLastSeen'
    try {
      const raw = localStorage.getItem(key)
      if (raw == null || raw === '') {
        localStorage.setItem(key, String(total))
        setHasNewDbAdditions(false)
      } else {
        const lastSeen = parseInt(raw, 10)
        setHasNewDbAdditions(total > lastSeen)
      }
    } catch {}
  }, [userInfo?.id, tagsSaveToDb, selectedTags.length, insightsInDb.length, qaList])

  /** 把一句话自我介绍同步到 profile 数据库（onBlur 时调用，不覆盖其他 profileData） */
  const persistOneSentenceToDb = useCallback(async () => {
    try {
      const res = await fetch('/api/user/info', { cache: 'no-store' })
      if (!res.ok) return
      const info = await res.json()
      const existing = info.profileData && typeof info.profileData === 'object' ? { ...info.profileData } : {}
      const merged = { ...existing, oneSentenceDesc: oneSentenceDesc || '', userSay: userSay || oneSentenceDesc || '' }
      await fetch('/api/user/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileData: merged })
      })
    } catch (e) {
      console.warn('persistOneSentenceToDb failed:', e)
    }
  }, [oneSentenceDesc, userSay])


  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      let dataUrl: string
      const objectUrl = URL.createObjectURL(file)
      try {
        dataUrl = await new Promise<string>((resolve, reject) => {
          const img = new Image()
          img.onload = () => {
            const maxW = 1200
            const w = img.width
            const h = img.height
            const scale = w > maxW ? maxW / w : 1
            const cw = Math.round(w * scale)
            const ch = Math.round(h * scale)
            const canvas = document.createElement('canvas')
            canvas.width = cw
            canvas.height = ch
            const ctx = canvas.getContext('2d')
            if (!ctx) {
              const r = new FileReader()
              r.onload = () => resolve(r.result as string)
              r.onerror = () => reject(new Error('Failed to read file'))
              r.readAsDataURL(file)
              return
            }
            ctx.drawImage(img, 0, 0, cw, ch)
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  const r = new FileReader()
                  r.onload = () => resolve(r.result as string)
                  r.onerror = () => reject(new Error('Failed to read file'))
                  r.readAsDataURL(file)
                  return
                }
                const r = new FileReader()
                r.onload = () => resolve(r.result as string)
                r.onerror = () => reject(new Error('Failed to read blob'))
                r.readAsDataURL(blob)
              },
              'image/jpeg',
              0.85
            )
          }
          img.onerror = () => reject(new Error('Failed to load image'))
          img.src = objectUrl
        })
      } finally {
        URL.revokeObjectURL(objectUrl)
      }
      const res = await fetch('/api/image/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: dataUrl, filename: file.name.replace(/\.[^.]+$/, '.jpg') })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert('Upload failed: ' + (err.error || res.status))
        return
      }
      const data = await res.json()
      const url = data?.url
      if (!url) {
        alert('Upload failed: no URL returned')
        return
      }
      setAvatarDataUrl(url)
      try {
        await saveProfileDataToDb(getProfileDataFromState({ avatarDataUrl: url }))
      } catch {}
      const saveRes = await fetch('/api/user/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: url })
      })
      if (!saveRes.ok) console.warn('Profile avatar save to DB failed')
    } catch (err) {
      console.error('Photo upload error:', err)
      alert('Upload failed, please try again')
    }
  }

  const handleLogout = async () => {
    if (confirm('确定要换账号吗？将退出当前登录，可重新登录其他账号。')) {
      await signOut({ callbackUrl: '/auth/signin' })
    }
  }

  const handleAddQA = async () => {
    const q = newQAQuestion.trim()
    const a = newQAAnswer.trim()
    if (!q && !a) return
    const next = [...qaList, { question: q || 'Q', answer: a || '', showInPreview: false, saveToDb: false }]
    setQaList(next)
    saveProfileDataToDb(getProfileDataFromState({ qaList: next }))
    setShowAddQA(false)
    setNewQAQuestion('')
    setNewQAAnswer('')
    // 每次输入都更新洞察和标签
    try {
      const res = await fetch('/api/user/update-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ question: q || undefined, answer: a || undefined }),
      })
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data.insights)) setInsights(data.insights)
        if (Array.isArray(data.tags)) setTags(data.tags)
      }
    } catch (_) {}
  }

  const handleRemoveQA = (i: number) => {
    const next = qaList.filter((_, j) => j !== i)
    setQaList(next)
    saveProfileDataToDb(getProfileDataFromState({ qaList: next }))
  }

  const handleUpdateQAAnswer = (i: number, answer: string) => {
    const next = qaList.map((item, j) => (j === i ? { ...item, answer } : item))
    setQaList(next)
    saveProfileDataToDb(getProfileDataFromState({ qaList: next }))
  }

  const handleToggleQAShowInPreview = (i: number) => {
    const next = qaList.map((item, j) => (j === i ? { ...item, showInPreview: item.showInPreview !== true } : item))
    setQaList(next)
    saveProfileDataToDb(getProfileDataFromState({ qaList: next }))
  }

  const handleToggleQASaveToDb = (i: number) => {
    const next = qaList.map((item, j) => (j === i ? { ...item, saveToDb: item.saveToDb !== true } : item))
    setQaList(next)
    saveProfileDataToDb(getProfileDataFromState({ qaList: next }))
  }

  const handleSendQAAnswer = async (i: number) => {
    const item = qaList[i]
    if (!item?.answer?.trim()) return
    setSendingQAIndex(i)
    try {
      const parts: string[] = []
      if (userSay) parts.push(`用户原话：${userSay}`)
      qaList.forEach((qa, idx) => {
        parts.push(`Q: ${qa.question || ''}\nA: ${qa.answer || ''}`)
      })
      const text = parts.join('\n\n')
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: `From the user's profile and Q&A answers below, extract ONLY two things. Use the same language as the input.

1. "tags": Extract 5-10 core keyword tags that describe this person (roles, interests, traits). Each tag 1-4 words. Output as a JSON array of strings.

2. "insights": Array of 3-5 short insight strings (values, motivations, style).

Return ONLY a valid JSON object with keys "tags" and "insights". No other text.`
            },
            { role: 'user', content: `Profile & Q&A:\n\n${text}` }
          ],
          max_tokens: 800,
          temperature: 0.5
        })
      })
      if (!res.ok) throw new Error('分析失败')
      const data = await res.json()
      const raw = data?.choices?.[0]?.message?.content?.trim() || '{}'
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      const jsonStr = jsonMatch ? jsonMatch[0] : raw
      let obj: { tags?: string | string[]; insights?: string[] }
      try {
        obj = JSON.parse(jsonStr) as { tags?: string | string[]; insights?: string[] }
      } catch {
        return
      }
      const rawTags = obj.tags
      const newTags = Array.isArray(rawTags)
        ? rawTags.filter((x): x is string => typeof x === 'string').map(s => s.trim()).filter(Boolean)
        : typeof rawTags === 'string'
          ? rawTags.split(/[,，\n]+/).map(s => s.trim()).filter(Boolean)
          : []
      const rawIns = obj.insights
      const newInsights = Array.isArray(rawIns)
        ? rawIns.filter((x): x is string => typeof x === 'string').map(s => s.trim()).filter(Boolean)
        : []
      const mergedTags = Array.from(new Set([...tags, ...newTags]))
      const mergedInsights = Array.from(new Set([...insights, ...newInsights]))
      setTags(mergedTags)
      setInsights(mergedInsights)
      const msg = `生成了 ${newTags.length} 个 tag、${newInsights.length} 个 insight`
      setGeneratedToast({ message: msg, index: i })
      setTimeout(() => setGeneratedToast(null), 4000)
      try {
        saveProfileDataToDb(getProfileDataFromState({ tags: mergedTags, selectedTags: selectedTags, insights: mergedInsights }))
        window.dispatchEvent(new CustomEvent('profileChat:insightsUpdated'))
      } catch {}
    } catch (e) {
      console.error('handleSendQAAnswer failed:', e)
      alert('分析失败，请稍后重试')
    } finally {
      setSendingQAIndex(null)
    }
  }

  const generateQAFromIdentity = async () => {
    const name = session?.user?.name || '用户'
    const parts: string[] = []
    if (userSay) parts.push(`用户原话/自我介绍：${userSay}`)
    if (selectedTags.length > 0) parts.push(`身份标签：${selectedTags.join('、')}`)
    if (userInfo?.gender) parts.push(`性别：${userInfo.gender === 'male' ? '男' : userInfo.gender === 'female' ? '女' : userInfo.gender}`)
    if (userInfo?.location) parts.push(`所在地：${userInfo.location}`)
    const identityText = parts.length > 0 ? parts.join('\n') : `${name}（暂无更多身份信息）`
    setIsGeneratingQA(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: `You generate Q&A questions for a profile "interested topics" section. The questions must be SHARP, EDGY, CONTRADICTORY — 锋利、矛盾、尖锐. Not soft or generic. Aim for: provocative, challenging assumptions, exposing paradox/tension, uncomfortable, the kind that cut. Examples of sharp style: "做 AI 的人到底信不信 AI 会取代自己？" "女性 founder 被问 '如何平衡' 时你心里真实想法是？" "你说是 deep thinker，那什么想法深到你不愿跟人说？" "独立音乐和商业成功在你这里真的是兼容的吗？" Return ONLY a JSON array of objects, each with "question" and "answer". Use "answer": "" for every item. Same language as identity (Chinese or English). No markdown, no code block, no explanation.`
            },
            {
              role: 'user',
              content: `Identity:\n${identityText}\n\nGenerate 5-8 sharp/contradictory Q&A questions (answer empty). JSON array only.`
            }
          ],
          temperature: 0.7,
          max_tokens: 800
        })
      })
      if (!res.ok) throw new Error('生成失败')
      const data = await res.json()
      const raw = data?.choices?.[0]?.message?.content?.trim() || data?.content?.trim() || ''
      let list: { question: string; answer: string }[] = []
      const jsonMatch = raw.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        list = JSON.parse(jsonMatch[0]) as { question: string; answer: string }[]
        if (Array.isArray(list)) {
          list = list
            .filter((x: unknown) => x && typeof x === 'object' && 'question' in x)
            .map((x: { question?: string; answer?: string }) => ({
              question: typeof x.question === 'string' ? x.question : '',
              answer: typeof x.answer === 'string' ? x.answer : '',
              showInPreview: false,
              saveToDb: false
            }))
        }
      }
      if (list.length > 0) {
        const next = [...qaList, ...list]
        setQaList(next)
        saveProfileDataToDb(getProfileDataFromState({ qaList: next }))
      }
    } catch (e) {
      console.error('generateQAFromIdentity failed:', e)
      alert('根据身份生成问题失败，请稍后重试')
    } finally {
      setIsGeneratingQA(false)
    }
  }

  const openSocialEdit = (key: string, asCustomLink?: boolean) => {
    setShowAddSocialList(false)
    setSocialSearch('')
    setLinkPreviewDraft(null)
    setEditingSocial(key)
    setEditingSocialAsLink(!!asCustomLink)
    setSocialUrlInput(asCustomLink ? '' : (socialLinks[key] || ''))
  }

  const addToCustomLinks = (url: string, title?: string) => {
    const u = url.trim()
    if (!u) return
    const next = [...customLinks, { title: title?.trim() || undefined, url: u }]
    setCustomLinks(next)
    saveProfileDataToDb(getProfileDataFromState({ customLinks: next }))
    setShowAddSocialList(false)
    setSocialSearch('')
    setLinkPreviewDraft(null)
  }

  const handleRemoveCustomLink = (i: number) => {
    const next = customLinks.filter((_, j) => j !== i)
    setCustomLinks(next)
    saveProfileDataToDb(getProfileDataFromState({ customLinks: next }))
  }

  const fetchLinkPreview = useCallback(async (url: string) => {
    const u = url.trim()
    if (!u || !/^https?:\/\//i.test(u)) return
    setLinkInputFetching(true)
    try {
      const res = await fetch('/api/link-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: u }),
      })
      const data = await res.json().catch(() => ({}))
      const displayName = (data.name && data.name.trim()) ? data.name.trim() : '作品'
      setLinkPreviewDraft((prev) => ({
        cover: res.ok && data.cover ? data.cover : undefined,
        name: displayName,
        description: res.ok && data.description ? data.description : undefined,
        url: u,
        isPersonalWebsite: prev?.isPersonalWebsite ?? false,
      }))
    } catch {
      setLinkPreviewDraft((prev) => ({ name: '作品', url: u, isPersonalWebsite: prev?.isPersonalWebsite ?? false }))
    } finally {
      setLinkInputFetching(false)
    }
  }, [])

  const addLinkFromDraft = useCallback(() => {
    const draft = linkPreviewDraft || (socialSearch.trim() && /^https?:\/\//i.test(socialSearch.trim()) ? { url: socialSearch.trim(), name: '作品', description: undefined as string | undefined, cover: undefined as string | undefined } : null)
    if (!draft || !draft.url?.trim()) return
    const item = {
      id: `w-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      cover: draft.cover || undefined,
      name: (draft.name?.trim() || '作品'),
      description: draft.description?.trim() || undefined,
      url: draft.url.trim(),
      isPersonalWebsite: draft.isPersonalWebsite ?? false,
    }
    const next = [...workIntroductions, item]
    setWorkIntroductions(next)
    saveProfileDataToDb(getProfileDataFromState({ workIntroductions: next }))
    setLinkPreviewDraft(null)
    setSocialSearch('')
  }, [linkPreviewDraft, socialSearch, workIntroductions])

  const handleLinkPreviewCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setLinkPreviewCoverUploading(true)
    try {
      let dataUrl: string
      const objectUrl = URL.createObjectURL(file)
      try {
        dataUrl = await new Promise<string>((resolve, reject) => {
          const img = new Image()
          img.onload = () => {
            const maxW = 800
            const w = img.width
            const h = img.height
            const scale = w > maxW ? maxW / w : 1
            const cw = Math.round(w * scale)
            const ch = Math.round(h * scale)
            const canvas = document.createElement('canvas')
            canvas.width = cw
            canvas.height = ch
            const ctx = canvas.getContext('2d')
            if (!ctx) {
              const r = new FileReader()
              r.onload = () => resolve(r.result as string)
              r.onerror = () => reject(new Error('Failed to read file'))
              r.readAsDataURL(file)
              return
            }
            ctx.drawImage(img, 0, 0, cw, ch)
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  const r = new FileReader()
                  r.onload = () => resolve(r.result as string)
                  r.onerror = () => reject(new Error('Failed to read file'))
                  r.readAsDataURL(file)
                  return
                }
                const r = new FileReader()
                r.onload = () => resolve(r.result as string)
                r.onerror = () => reject(new Error('Failed to read blob'))
                r.readAsDataURL(blob)
              },
              'image/jpeg',
              0.85
            )
          }
          img.onerror = () => reject(new Error('Failed to load image'))
          img.src = objectUrl
        })
      } finally {
        URL.revokeObjectURL(objectUrl)
      }
      const res = await fetch('/api/image/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: dataUrl, filename: file.name.replace(/\.[^.]+$/, '.jpg') }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data?.url) setLinkPreviewDraft((d) => (d ? { ...d, cover: data.url } : { url: socialSearch.trim(), name: '', description: '', cover: data.url }))
      } else {
        const err = await res.json().catch(() => ({}))
        alert('封面上传失败: ' + (err.error || res.status))
      }
    } catch (err) {
      console.error('Cover upload error:', err)
      alert('封面上传失败，请重试')
    } finally {
      setLinkPreviewCoverUploading(false)
    }
  }

  const handleAddWorkIntro = () => {
    const name = newWorkIntroName.trim()
    if (!name) return
    if (editingWorkIntroId) {
      const next = workIntroductions.map((w) =>
        w.id === editingWorkIntroId
          ? {
              ...w,
              cover: newWorkIntroCover || undefined,
              name,
              description: newWorkIntroDesc.trim() || undefined,
              url: workIntroModalMode === 'link' ? (newWorkIntroUrl.trim() || undefined) : undefined,
              isPersonalWebsite: newWorkIntroIsPersonalWebsite,
            }
          : w
      )
      setWorkIntroductions(next)
      saveProfileDataToDb(getProfileDataFromState({ workIntroductions: next }))
      setEditingWorkIntroId(null)
    } else {
      const item = {
        id: `w-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        cover: newWorkIntroCover || undefined,
        name,
        description: newWorkIntroDesc.trim() || undefined,
        url: workIntroModalMode === 'link' ? (newWorkIntroUrl.trim() || undefined) : undefined,
        isPersonalWebsite: newWorkIntroIsPersonalWebsite,
      }
      const next = [...workIntroductions, item]
      setWorkIntroductions(next)
      saveProfileDataToDb(getProfileDataFromState({ workIntroductions: next }))
    }
    setShowAddWorkIntroModal(false)
    setNewWorkIntroCover(null)
    setNewWorkIntroName('')
    setNewWorkIntroDesc('')
    setNewWorkIntroUrl('')
    setNewWorkIntroIsPersonalWebsite(false)
  }

  const handleRemoveWorkIntro = (id: string) => {
    const next = workIntroductions.filter((w) => w.id !== id)
    setWorkIntroductions(next)
    saveProfileDataToDb(getProfileDataFromState({ workIntroductions: next }))
  }

  const saveExperience = () => {
    if (!expForm.title?.trim() || !expForm.company?.trim()) return
    const item: ExperienceItem = {
      id: editingExpId || `exp-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      title: expForm.title.trim(),
      company: expForm.company.trim(),
      employmentType: expForm.employmentType?.trim() || undefined,
      location: expForm.location?.trim() || undefined,
      startDate: expForm.startDate?.trim() || undefined,
      endDate: expForm.current ? undefined : (expForm.endDate?.trim() || undefined),
      current: expForm.current,
      description: expForm.description?.trim() || undefined,
    }
    const next = editingExpId ? experiences.map((e) => (e.id === editingExpId ? item : e)) : [...experiences, item]
    setExperiences(next)
    saveProfileDataToDb(getProfileDataFromState({ experiences: next }))
    setEditingExpId(null)
    setExpForm({ title: '', company: '', employmentType: '', location: '', startDate: '', endDate: '', current: false, description: '' })
  }

  const removeExperience = (id: string) => {
    const next = experiences.filter((e) => e.id !== id)
    setExperiences(next)
    saveProfileDataToDb(getProfileDataFromState({ experiences: next }))
    if (editingExpId === id) { setEditingExpId(null); setExpForm({ title: '', company: '', employmentType: '', location: '', startDate: '', endDate: '', current: false, description: '' }) }
  }

  const saveEducation = () => {
    if (!eduForm.school?.trim()) return
    const item: EducationItem = {
      id: editingEduId || `edu-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      school: eduForm.school.trim(),
      degree: eduForm.degree?.trim() || undefined,
      fieldOfStudy: eduForm.fieldOfStudy?.trim() || undefined,
      startDate: eduForm.startDate?.trim() || undefined,
      endDate: eduForm.endDate?.trim() || undefined,
      grade: eduForm.grade?.trim() || undefined,
      description: eduForm.description?.trim() || undefined,
    }
    const next = editingEduId ? education.map((e) => (e.id === editingEduId ? item : e)) : [...education, item]
    setEducation(next)
    saveProfileDataToDb(getProfileDataFromState({ education: next }))
    setEditingEduId(null)
    setEduForm({ school: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '', grade: '', description: '' })
  }

  const removeEducation = (id: string) => {
    const next = education.filter((e) => e.id !== id)
    setEducation(next)
    saveProfileDataToDb(getProfileDataFromState({ education: next }))
    if (editingEduId === id) { setEditingEduId(null); setEduForm({ school: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '', grade: '', description: '' }) }
  }

  const handleFetchLinkMetadata = useCallback(async () => {
    const url = newWorkIntroUrl.trim()
    if (!url || !/^https?:\/\//i.test(url)) return
    setFetchLinkMetadataLoading(true)
    try {
      const res = await fetch('/api/link-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        if (data.cover) setNewWorkIntroCover(data.cover)
        if (data.name) setNewWorkIntroName(data.name)
        if (data.description) setNewWorkIntroDesc(data.description || '')
      } else {
        alert('抓取失败：' + (data.error || res.status))
      }
    } catch (e) {
      alert('抓取失败，请检查链接是否可访问')
    } finally {
      setFetchLinkMetadataLoading(false)
    }
  }, [newWorkIntroUrl])

  const handleWorkIntroCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setNewWorkIntroCoverUploading(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as string)
        reader.onerror = () => reject(new Error('Failed to read file'))
        reader.readAsDataURL(file)
      })
      const res = await fetch('/api/image/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: dataUrl, filename: file.name.replace(/\.[^.]+$/, '.jpg') }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data?.url) setNewWorkIntroCover(data.url)
      } else {
        const err = await res.json().catch(() => ({}))
        alert('封面上传失败: ' + (err.error || res.status))
      }
    } catch (err) {
      console.error('Cover upload error:', err)
      alert('封面上传失败，请重试')
    } finally {
      setNewWorkIntroCoverUploading(false)
    }
  }

  const handleProjectMetaFetchLink = useCallback(async () => {
    if (!projectMetaEditor) return
    const url = projectMetaEditor.linkInput.trim()
    if (!url || !/^https?:\/\//i.test(url)) return
    setProjectMetaFetching(true)
    try {
      const res = await fetch('/api/link-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        alert('Failed to fetch link preview: ' + (data.error || res.status))
        return
      }
      const nextRef: ProjectReference = {
        title: (typeof data?.name === 'string' && data.name.trim()) ? data.name.trim() : url,
        url,
        cover: typeof data?.cover === 'string' && data.cover.trim() ? data.cover.trim() : undefined,
      }
      setProjectMetaEditor((prev) => {
        if (!prev) return prev
        const dedup = prev.references.filter((r) => r.url !== nextRef.url)
        const mergedDetail = prev.detail.trim() || (typeof data?.description === 'string' ? data.description.trim() : '')
        return {
          ...prev,
          detail: mergedDetail,
          references: [...dedup, nextRef],
          linkInput: '',
        }
      })
      // 异步分析标签，不阻塞添加流程
      triggerAnalyzeTag({
        type: 'ref',
        key: nextRef.url,
        title: nextRef.title,
        url: nextRef.url,
        description: typeof data?.description === 'string' ? data.description.trim() : '',
        projectTitle: projectMetaEditor.text,
        currentStage: projectMetaEditor.stage,
        stageOrder: projectMetaEditor.stageOrder,
      })
    } catch {
      alert('Failed to fetch link preview')
    } finally {
      setProjectMetaFetching(false)
    }
  }, [projectMetaEditor])

  const generateStageSuggestions = useCallback(async (projectTitle: string, replace = false) => {
    if (!projectTitle.trim() || !projectMetaEditor) return
    setStageSuggestionsLoading(true)
    try {
      const res = await fetch('/api/generate-stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectTitle: projectTitle.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(data.stages) && data.stages.length > 0) {
        const newStages = data.stages as string[]
        const result = replace
          ? newStages
          : (() => {
              const existing = projectsList[projectMetaEditor.projectIndex]?.aiSuggestedStages ?? []
              const merged = [...existing]
              for (const s of newStages) {
                if (!merged.some((x) => x.toLowerCase() === s.toLowerCase())) merged.push(s)
              }
              return merged
            })()
        setStageSuggestions(result)
        const idx = projectMetaEditor.projectIndex
        const next = [...projectsList]
        if (next[idx]) {
          next[idx] = { ...next[idx], aiSuggestedStages: result }
          setProjectsList(next)
          saveProfileDataToDb(getProfileDataFromState({ projects: next }))
        }
      }
    } catch {
      // silently fail
    } finally {
      setStageSuggestionsLoading(false)
    }
  }, [projectMetaEditor, projectsList, saveProfileDataToDb, getProfileDataFromState])

  const triggerAnalyzeTag = useCallback(async (params: {
    type: 'ref' | 'att' | 'people'
    key: string
    title?: string
    url?: string
    description?: string
    name?: string
    peopleText?: string
    projectTitle?: string
    currentStage?: string
    stageOrder?: string[]
  }) => {
    setTagAnalyzing(true)
    try {
      const res = await fetch('/api/analyze-content-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: params.type === 'ref' ? 'link' : params.type === 'att' ? 'attachment' : 'people',
          title: params.title,
          url: params.url,
          description: params.description,
          name: params.name,
          peopleText: params.peopleText,
          projectTitle: params.projectTitle,
          currentStage: params.currentStage,
          stageOrder: params.stageOrder,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.stage && data.tag) {
        setTagConfirmDialog({
          type: params.type,
          key: params.key,
          suggestStage: data.stage,
          suggestTag: data.tag,
          editStage: data.stage,
          editTag: data.tag,
          suggestUpdateStage: Boolean(data.suggestUpdateStage),
          updateStage: false,
        })
      }
    } catch {
      // 分析失败时静默忽略
    } finally {
      setTagAnalyzing(false)
    }
  }, [])

  const handleTagConfirm = useCallback(() => {
    if (!tagConfirmDialog) return
    const { type, key, editStage, editTag, updateStage } = tagConfirmDialog
    setProjectMetaEditor((prev) => {
      if (!prev) return prev
      const stageUpdate = updateStage
        ? { stage: editStage, stageEnteredAt: { ...prev.stageEnteredAt, [editStage]: Date.now() } }
        : {}
      if (type === 'ref') {
        return {
          ...prev,
          ...stageUpdate,
          references: prev.references.map((r) =>
            r.url === key ? { ...r, stageTag: editStage, contentTag: editTag } : r
          ),
        }
      } else if (type === 'att') {
        return {
          ...prev,
          ...stageUpdate,
          attachments: prev.attachments.map((a) =>
            a.url === key ? { ...a, stageTag: editStage, contentTag: editTag } : a
          ),
        }
      } else {
        // people — apply tags to the matching item, and optionally update project stage
        return {
          ...prev,
          ...stageUpdate,
          peopleNeeded: prev.peopleNeeded.map((p) =>
            p.text === key ? { ...p, stageTag: editStage, contentTag: editTag } : p
          ),
        }
      }
    })
    setTagConfirmDialog(null)
  }, [tagConfirmDialog])

  const handleProjectMetaUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !projectMetaEditor) return
    e.target.value = ''
    setProjectMetaUploading(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(r.result as string)
        r.onerror = () => reject(new Error('Failed to read image'))
        r.readAsDataURL(file)
      })
      const res = await fetch('/api/image/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: dataUrl, filename: file.name }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.url) {
        alert('Image upload failed: ' + (data.error || res.status))
        return
      }
      setProjectMetaEditor((prev) => (prev ? { ...prev, detailImage: data.url } : prev))
    } catch {
      alert('Image upload failed')
    } finally {
      setProjectMetaUploading(false)
    }
  }

  const handleProjectMetaUploadAttachment = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !projectMetaEditor) return
    e.target.value = ''
    setProjectMetaAttachmentUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/file/upload', { method: 'POST', body: formData })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.url) {
        alert('Upload failed: ' + (data.error || res.status))
        return
      }
      const attName = data.originalName || file.name
      const attUrl = data.url
      setProjectMetaEditor((prev) =>
        prev ? { ...prev, attachments: [...prev.attachments, { url: attUrl, name: attName, addedAt: Date.now() }] } : prev
      )
      triggerAnalyzeTag({
        type: 'att',
        key: attUrl,
        name: attName,
        projectTitle: projectMetaEditor.text,
        currentStage: projectMetaEditor.stage,
        stageOrder: projectMetaEditor.stageOrder,
      })
    } catch {
      alert('Upload failed')
    } finally {
      setProjectMetaAttachmentUploading(false)
    }
  }

  const saveProjectMetaEditor = useCallback(() => {
    if (!projectMetaEditor) return
    const next = [...projectsList]
    const idx = projectMetaEditor.projectIndex
    if (!next[idx]) {
      setProjectMetaEditor(null)
      return
    }
    next[idx] = {
      ...next[idx],
      text: projectMetaEditor.text.trim() || next[idx].text,
      detail: projectMetaEditor.detail.trim() || undefined,
      references: projectMetaEditor.references.length > 0 ? projectMetaEditor.references : undefined,
      detailImage: projectMetaEditor.detailImage.trim() || undefined,
      attachments: projectMetaEditor.attachments.length > 0 ? projectMetaEditor.attachments : undefined,
      stage: projectMetaEditor.stage,
      stageOrder: projectMetaEditor.stageOrder.length > 0 ? projectMetaEditor.stageOrder : undefined,
      stageEnteredAt: Object.keys(projectMetaEditor.stageEnteredAt).length > 0 ? projectMetaEditor.stageEnteredAt : undefined,
      creators: projectMetaEditor.creators.length > 0 ? projectMetaEditor.creators : undefined,
      peopleNeeded: projectMetaEditor.peopleNeeded.length > 0 ? projectMetaEditor.peopleNeeded : undefined,
    }
    setProjectsList(next)
    saveProfileDataToDb(getProfileDataFromState({ projects: next }))
    setProjectMetaEditor(null)
    setProjectMetaAttachmentMenuIndex(null)
  }, [projectMetaEditor, projectsList, saveProfileDataToDb, getProfileDataFromState])

  const saveSocialLink = () => {
    if (!editingSocial) return
    const url = socialUrlInput.trim()
    if (editingSocialAsLink) {
      const title = getPlatformByKey(editingSocial)?.label ?? editingSocial
      const next = [...customLinks, { title, url }]
      setCustomLinks(next)
      saveProfileDataToDb(getProfileDataFromState({ customLinks: next }))
      setEditingSocial(null)
      setSocialUrlInput('')
      setEditingSocialAsLink(false)
      return
    }
    const next = { ...socialLinks }
    if (url) next[editingSocial] = url
    else delete next[editingSocial]
    setSocialLinks(next)
    try {
      saveProfileDataToDb(getProfileDataFromState({ socialLinks: next }))
    } catch (e) {
      console.warn('profileSocialLinks save failed', e)
    }
    setEditingSocial(null)
    setSocialUrlInput('')
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
      saveProfileDataToDb(getProfileDataFromState({ selectedTags: next }))
      return next
    })
  }

  const addModalCategories: { id: SocialCategory | 'view_all'; label: string; icon: typeof Lightbulb }[] = [
    { id: 'suggested', label: 'Suggested', icon: Lightbulb },
    { id: 'make_money', label: 'Make Money', icon: ShoppingBag },
    { id: 'social', label: 'Social', icon: Heart },
    { id: 'media', label: 'Media', icon: Play },
    { id: 'contact', label: 'Contact', icon: Mail },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'text', label: 'Text', icon: FileText },
    { id: 'view_all', label: 'View all', icon: List },
  ]

  const filteredPlatforms = (() => {
    const q = socialSearch.trim().toLowerCase()
    const bySearch = (p: { label: string }) => !q || p.label.toLowerCase().includes(q)
    if (addModalCategory === 'suggested') {
      const ordered = SUGGESTED_PLATFORM_KEYS.map((k) => getPlatformByKey(k)).filter(Boolean) as NonNullable<ReturnType<typeof getPlatformByKey>>[]
      return ordered.filter(bySearch)
    }
    if (addModalCategory === 'view_all') {
      return ALL_SOCIAL_PLATFORMS.filter(bySearch)
    }
    return ALL_SOCIAL_PLATFORMS.filter((p) => p.category === addModalCategory && bySearch(p))
  })()

  const handleFirstTimeSetupComplete = () => {
    setShowFirstTimeModal(false)
    loadUserData()
  }

  // 只等 profile 数据加载，不阻塞在 NextAuth session 上（避免 session 卡住时一直 Loading）
  if (isLoadingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading...</p>
        </div>
      </div>
    )
  }

  // session 已解析完毕且未登录时才要求登录（session 加载中时不先跳登录）
  if (!isLoading && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Please login first</p>
          <button
            onClick={() => router.push('/auth/signin')}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
      {/* 数据库入库提示 toast */}
      {dbToastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 bg-teal-600 text-white text-sm rounded-lg shadow-lg flex items-center gap-2">
          <Database className="w-4 h-4 shrink-0" />
          <span>{dbToastMessage}</span>
          <button type="button" onClick={() => { setDbToastMessage(null); markDbAdditionsSeen() }} className="ml-1 p-0.5 rounded hover:bg-white/20" aria-label="关闭">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {/* 从广场移除提示 toast */}
      {plazaToastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 bg-amber-500 text-white text-sm rounded-lg shadow-lg flex items-center gap-2">
          <span>{plazaToastMessage}</span>
          <button type="button" onClick={() => setPlazaToastMessage(null)} className="ml-1 p-0.5 rounded hover:bg-white/20" aria-label="关闭">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {projectMetaEditor && (
        <div className="fixed inset-0 z-[111] bg-black/45 flex items-center justify-center p-4" onClick={() => { setProjectMetaEditor(null); setProjectMetaEditorMenuOpen(false) }}>
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-4 max-h-[86vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Edit project information</h3>
              <div className="flex items-center gap-1">
                <div className="relative" ref={projectMetaEditorMenuRef}>
                  <button
                    type="button"
                    onClick={() => setProjectMetaEditorMenuOpen((o) => !o)}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-500"
                    aria-label="More options"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {projectMetaEditorMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 py-1 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[120px] z-10">
                      <button
                        type="button"
                        onClick={() => {
                          const slug = getSharePath(userInfo?.profileSlug, userInfo?.name, userInfo?.id)
                          const url = typeof window !== 'undefined' ? `${window.location.origin}/u/${slug}/project/${projectsList[projectMetaEditor.projectIndex]?.createdAt ?? Date.now()}` : ''
                          if (url && navigator.clipboard?.writeText) {
                            navigator.clipboard.writeText(url)
                            setShareLinkCopied(true)
                            setTimeout(() => setShareLinkCopied(false), 2000)
                          }
                          setProjectMetaEditorMenuOpen(false)
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-left text-[12px] text-gray-700 hover:bg-gray-50"
                      >
                        <Share2 className="w-3.5 h-3.5 shrink-0" />
                        {shareLinkCopied ? '已复制' : '复制链接'}
                      </button>
                    </div>
                  )}
                </div>
                <button type="button" className="p-1 rounded hover:bg-gray-100" onClick={() => setProjectMetaEditor(null)} aria-label="Close">
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-[11px] text-gray-500 mb-1">Project title</p>
                <input
                  type="text"
                  value={projectMetaEditor.text}
                  onChange={(e) => setProjectMetaEditor((prev) => prev ? { ...prev, text: e.target.value } : prev)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-400/40"
                />
                <div className="flex items-center justify-between mt-2 mb-1">
                  <p className="text-[11px] text-gray-500">Stage <span className="text-gray-400 font-normal">· click to select current</span></p>
                  <button
                    type="button"
                    onClick={() => generateStageSuggestions(projectMetaEditor.text)}
                    disabled={!projectMetaEditor.text.trim() || stageSuggestionsLoading}
                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {stageSuggestionsLoading ? (
                      <span className="w-2.5 h-2.5 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                    ) : (
                      <Sparkles className="w-2.5 h-2.5" />
                    )}
                    {stageSuggestionsLoading ? 'Generating…' : 'AI suggest'}
                  </button>
                </div>
                <div className="space-y-2">
                  {/* 已在进行的进度：连线展示 */}
                  <div className="flex flex-wrap items-center gap-0 min-h-[32px]">
                    {projectMetaEditor.stageOrder.length === 0 && (
                      <span className="text-[10px] text-gray-400">Add below or pick from AI suggested</span>
                    )}
                    {projectMetaEditor.stageOrder.map((s, idx) => {
                      const currentIdx = projectMetaEditor.stageOrder.findIndex((x) => x.toLowerCase() === (projectMetaEditor.stage || 'Idea').toLowerCase())
                      const isCustom = currentIdx < 0 && (projectMetaEditor.stage ?? '').trim().length > 0
                      const litCount = currentIdx >= 0 ? currentIdx + 1 : (isCustom ? projectMetaEditor.stageOrder.length : 1)
                      const isLit = idx < litCount
                      return (
                        <div key={`${s}-${idx}`} className="flex items-center">
                          <div className="flex flex-col items-center shrink-0">
                            <button
                              type="button"
                              onClick={() => setProjectMetaEditor((prev) => prev ? { ...prev, stage: s, stageEnteredAt: { ...prev.stageEnteredAt, [s]: Date.now() } } : prev)}
                              className={`flex items-center justify-center gap-1 px-2 py-1 rounded-full border-2 transition-colors ${
                                isLit ? 'border-teal-500 bg-teal-500 text-white' : 'border-gray-200 bg-gray-50 text-gray-500 hover:bg-gray-100'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLit ? 'bg-white' : 'bg-gray-300'}`} />
                              <span className="text-[10px] font-medium">{s}</span>
                            </button>
                            {(() => {
                              const key = Object.keys(projectMetaEditor.stageEnteredAt).find((k) => k.toLowerCase() === s.toLowerCase()) ?? s
                              const ts = projectMetaEditor.stageEnteredAt[key] ?? (idx === 0 ? (projectsList[projectMetaEditor.projectIndex]?.createdAt ?? Date.now()) : undefined)
                              return ts != null ? (
                                <span className="text-[9px] text-gray-400 mt-1">
                                  {`${new Date(ts).getDate()}/${new Date(ts).getMonth() + 1}/${String(new Date(ts).getFullYear()).slice(-2)}`}
                                </span>
                              ) : null
                            })()}
                          </div>
                          {idx < projectMetaEditor.stageOrder.length - 1 && (
                            <div className={`w-4 h-0.5 shrink-0 mx-0.5 ${idx < litCount - 1 ? 'bg-teal-500' : 'bg-gray-200'}`} aria-hidden />
                          )}
                        </div>
                      )
                    })}
                  </div>
                  {/* Custom */}
                  <div>
                    <p className="text-[10px] text-gray-400 mb-1">Custom</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={projectMetaEditor.stageInput}
                        onChange={(e) => setProjectMetaEditor((prev) => prev ? { ...prev, stageInput: e.target.value } : prev)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const v = projectMetaEditor.stageInput.trim()
                            if (v && projectMetaEditor) {
                              const exists = projectMetaEditor.stageOrder.some((x) => x.toLowerCase() === v.toLowerCase())
                              if (!exists) {
                                setProjectMetaEditor({ ...projectMetaEditor, stageOrder: [...projectMetaEditor.stageOrder, v], stageInput: '' })
                              }
                            }
                          }
                        }}
                        placeholder="Type stage, Enter to add"
                        className="flex-1 px-2 py-1.5 text-[11px] border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-400/40"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const v = projectMetaEditor?.stageInput.trim()
                          if (v && projectMetaEditor) {
                            const exists = projectMetaEditor.stageOrder.some((x) => x.toLowerCase() === v.toLowerCase())
                            if (!exists) {
                              setProjectMetaEditor({ ...projectMetaEditor, stageOrder: [...projectMetaEditor.stageOrder, v], stageInput: '' })
                            }
                          }
                        }}
                        disabled={!projectMetaEditor?.stageInput.trim()}
                        className="px-2 py-1.5 text-[11px] rounded-lg border border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        添加
                      </button>
                    </div>
                  </div>
                  {/* AI 推荐：放在自定义下面，松散无连线 */}
                  {stageSuggestions.length > 0 && (
                    <div className="pt-2 mt-2 border-t border-gray-100">
                      <p className="text-[10px] text-gray-400 mb-1.5 flex items-center gap-1">
                        <Sparkles className="w-2.5 h-2.5 text-violet-400" />
                        AI suggested (click to add)
                        <button
                          type="button"
                          onClick={() => generateStageSuggestions(projectMetaEditor.text, true)}
                          disabled={stageSuggestionsLoading}
                          className="ml-auto px-2 py-0.5 text-[10px] rounded border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {stageSuggestionsLoading ? '…' : 'Change'}
                        </button>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {stageSuggestions.map((s) => {
                          const alreadyAdded = projectMetaEditor.stageOrder.some((x) => x.toLowerCase() === s.toLowerCase())
                          return (
                            <button
                              key={s}
                              type="button"
                              disabled={alreadyAdded}
                              onClick={() => {
                                if (!alreadyAdded) {
                                  setProjectMetaEditor((prev) => prev ? { ...prev, stageOrder: [...prev.stageOrder, s] } : prev)
                                }
                              }}
                              className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${
                                alreadyAdded ? 'border-teal-200 bg-teal-50 text-teal-500 opacity-50 cursor-default' : 'border-violet-200 bg-white text-violet-700 hover:bg-violet-50 hover:border-violet-300 cursor-pointer'
                              }`}
                            >
                              {alreadyAdded ? '✓ ' : '+ '}{s}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {stageSuggestionsLoading && (
                    <div className="flex items-center gap-1.5 text-[10px] text-violet-500 mt-1">
                      <span className="w-2.5 h-2.5 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                      AI generating stages…
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-gray-500 mt-2 mb-1">Creators</p>
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[10px] text-gray-400 shrink-0">Initiator {userInfo?.name ?? 'me'}</p>
                  <div className="flex flex-1 min-w-0 rounded-lg border border-gray-300 overflow-hidden">
                    <input
                      type="text"
                      value={projectMetaEditor.creatorInput}
                      onChange={(e) => {
                        setProjectMetaEditor((prev) => prev ? { ...prev, creatorInput: e.target.value } : prev)
                        setInviteEmailError(null)
                        setInviteEmailSent(false)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          const v = projectMetaEditor?.creatorInput.trim()
                          if (!v || !projectMetaEditor) return
                          const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
                          if (isEmail) {
                            // trigger send (same as button click)
                            ;(async () => {
                              const proj = projectsList[projectMetaEditor.projectIndex]
                              const projectName = projectMetaEditor.text || proj?.text || 'Project'
                              const slug = getSharePath(userInfo?.profileSlug, userInfo?.name, userInfo?.id ?? '')
                              const projectLink = typeof window !== 'undefined' ? `${window.location.origin}/u/${slug}/project/${proj?.createdAt ?? ''}` : ''
                              if (!projectLink || !projectLink.includes('/project/')) {
                                setInviteEmailError('Project link not ready')
                                return
                              }
                              setInviteEmailLoading(true)
                              setInviteEmailError(null)
                              setInviteEmailSent(false)
                              try {
                                const res = await fetch('/api/invite-email', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ inviteeEmail: v, projectName, projectLink }),
                                })
                                const data = await res.json().catch(() => ({}))
                                if (res.ok && data.success) {
                                  setInviteEmailSent(true)
                                  setProjectMetaEditor((p) => p ? { ...p, creators: [...p.creators, v], creatorInput: '' } : p)
                                } else {
                                  setInviteEmailError(data.hint ? `${data.error || 'Failed to send invite'}. ${data.hint}` : (data.error || 'Failed to send invite'))
                                }
                              } catch {
                                setInviteEmailError('Failed to send invite')
                              } finally {
                                setInviteEmailLoading(false)
                              }
                            })()
                          } else {
                            setProjectMetaEditor({ ...projectMetaEditor, creators: [...projectMetaEditor.creators, v], creatorInput: '' })
                          }
                        }
                      }}
                      placeholder="Email or name to invite"
                      className="flex-1 min-w-0 px-2 py-1.5 text-[11px] outline-none focus:ring-0 border-0"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        const v = projectMetaEditor?.creatorInput.trim()
                        if (!v || !projectMetaEditor) return
                        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)
                        if (isEmail) {
                          const proj = projectsList[projectMetaEditor.projectIndex]
                          const projectName = projectMetaEditor.text || proj?.text || 'Project'
                          const slug = getSharePath(userInfo?.profileSlug, userInfo?.name, userInfo?.id ?? '')
                          const projectLink = typeof window !== 'undefined' ? `${window.location.origin}/u/${slug}/project/${proj?.createdAt ?? ''}` : ''
                          if (!projectLink || !projectLink.includes('/project/')) {
                            setInviteEmailError('Project link not ready')
                            return
                          }
                          setInviteEmailLoading(true)
                          setInviteEmailError(null)
                          setInviteEmailSent(false)
                          try {
                            const res = await fetch('/api/invite-email', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ inviteeEmail: v, projectName, projectLink }),
                            })
                            const data = await res.json().catch(() => ({}))
                            if (res.ok && data.success) {
                              setInviteEmailSent(true)
                              setProjectMetaEditor((p) => p ? { ...p, creators: [...p.creators, v], creatorInput: '' } : p)
                            } else {
                              setInviteEmailError(data.hint ? `${data.error || 'Failed to send invite'}. ${data.hint}` : (data.error || 'Failed to send invite'))
                            }
                          } catch {
                            setInviteEmailError('Failed to send invite')
                          } finally {
                            setInviteEmailLoading(false)
                          }
                        } else {
                          setProjectMetaEditor({ ...projectMetaEditor, creators: [...projectMetaEditor.creators, v], creatorInput: '' })
                        }
                      }}
                      disabled={!projectMetaEditor?.creatorInput.trim() || inviteEmailLoading}
                      className="px-3 py-1.5 text-[11px] border-l border-teal-300 bg-teal-50/80 text-teal-700 hover:bg-teal-100 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1"
                    >
                      {inviteEmailLoading ? (
                        <span className="w-3 h-3 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
                      ) : null}
                      Invite
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-1">
                  {(projectMetaEditor.creators ?? []).map((c, ci) => (
                    <span key={ci} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-teal-50 text-teal-700 border border-teal-200">
                      {c}
                      <button
                        type="button"
                        onClick={() => setProjectMetaEditor((prev) => prev ? { ...prev, creators: prev.creators.filter((_, i) => i !== ci) } : prev)}
                        className="p-0.5 rounded hover:bg-teal-100 text-teal-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                {inviteEmailError && <p className="text-[10px] text-red-600 mb-1">{inviteEmailError}</p>}
                {inviteEmailSent && <p className="text-[10px] text-teal-600 mb-1">Invite sent successfully</p>}
                <p className="text-[11px] text-gray-500 mt-3 mb-1">Open to</p>
                <p className="text-[10px] text-gray-400 mb-1">People you&apos;re open to collaborate with (click chip to edit)</p>
                <div className="flex flex-wrap gap-1.5 mb-1">
                  {(projectMetaEditor.peopleNeeded ?? []).map((p, pi) => (
                    <span key={pi} className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] bg-amber-50 text-amber-800 border border-amber-200">
                      <button
                        type="button"
                        onClick={() => {
                          setPeopleNeedEditor({ projectIndex: projectMetaEditor.projectIndex, whoIndex: pi, text: p.text, detail: p.detail ?? '' })
                          setProjectMetaEditor(null)
                        }}
                        className="text-left hover:underline"
                      >
                        {p.text}
                        {!!p.detail && <span className="text-[9px] text-amber-700/80"> ⓘ</span>}
                      </button>
                      {(p.stageTag || p.contentTag) && (
                        <span className="flex items-center gap-1 shrink-0">
                          {p.stageTag && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border-2 border-teal-500 bg-teal-500 text-white text-[9px] font-medium">
                              <span className="w-1 h-1 rounded-full bg-white shrink-0" />
                              {p.stageTag}
                            </span>
                          )}
                          {p.contentTag && (
                            <span className="px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 text-[9px] font-medium">{p.contentTag}</span>
                          )}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setProjectMetaEditor((prev) => prev ? { ...prev, peopleNeeded: prev.peopleNeeded.filter((_, i) => i !== pi) } : prev)}
                        className="p-0.5 rounded hover:bg-amber-100 text-amber-600 shrink-0"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={projectMetaEditor.openToInput}
                    onChange={(e) => setProjectMetaEditor((prev) => prev ? { ...prev, openToInput: e.target.value } : prev)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const v = projectMetaEditor?.openToInput.trim()
                        if (v && projectMetaEditor) {
                          setProjectMetaEditor({ ...projectMetaEditor, peopleNeeded: [...projectMetaEditor.peopleNeeded, { text: v }], openToInput: '' })
                          triggerAnalyzeTag({ type: 'people', key: v, peopleText: v, projectTitle: projectMetaEditor.text, currentStage: projectMetaEditor.stage, stageOrder: projectMetaEditor.stageOrder })
                        }
                      }
                    }}
                    placeholder="e.g. video or podcast guests interested in AI"
                    className="flex-1 px-2 py-1.5 text-[11px] border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-teal-400/40"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const v = projectMetaEditor?.openToInput.trim()
                      if (v && projectMetaEditor) {
                        setProjectMetaEditor({ ...projectMetaEditor, peopleNeeded: [...projectMetaEditor.peopleNeeded, { text: v }], openToInput: '' })
                        triggerAnalyzeTag({ type: 'people', key: v, peopleText: v, projectTitle: projectMetaEditor.text, currentStage: projectMetaEditor.stage, stageOrder: projectMetaEditor.stageOrder })
                      }
                    }}
                    disabled={!projectMetaEditor?.openToInput.trim()}
                    className="px-2 py-1.5 text-[11px] rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <div className="flex-1 min-w-[120px]">
                  <p className="text-[10px] text-gray-500 mb-0.5">Description</p>
                  <input
                    type="text"
                    value={projectMetaEditor.detail}
                    onChange={(e) => setProjectMetaEditor((prev) => prev ? { ...prev, detail: e.target.value } : prev)}
                    placeholder="Short description..."
                    className="w-full px-2 py-1.5 text-[11px] border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-400/40"
                  />
                </div>
                <div className="flex-1 min-w-[120px]">
                  <p className="text-[10px] text-gray-500 mb-0.5">Link</p>
                  <div className="flex gap-1">
                    <input
                      type="url"
                      value={projectMetaEditor.linkInput}
                      onChange={(e) => setProjectMetaEditor((prev) => prev ? { ...prev, linkInput: e.target.value } : prev)}
                      placeholder="https://..."
                      className="flex-1 min-w-0 px-2 py-1.5 text-[11px] border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-400/40"
                    />
                    <button
                      type="button"
                      onClick={handleProjectMetaFetchLink}
                      disabled={!projectMetaEditor.linkInput.trim() || projectMetaFetching}
                      className="px-2 py-1.5 text-[11px] rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 shrink-0"
                    >
                      {projectMetaFetching ? '...' : 'Add'}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-gray-500 mb-0.5">Picture</p>
                  <label className="inline-flex items-center px-2 py-1.5 text-[11px] rounded-lg border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer">
                    Upload
                    <input type="file" accept="image/*" className="hidden" onChange={handleProjectMetaUploadImage} />
                  </label>
                </div>
                {(projectMetaUploading || projectMetaAttachmentUploading) && <span className="text-[10px] text-gray-500">Uploading...</span>}
              </div>
              {projectMetaEditor.detailImage && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={resolveImageUrl(projectMetaEditor.detailImage)} alt="" className="w-12 h-12 rounded object-cover border border-gray-200" />
                  <button type="button" onClick={() => setProjectMetaEditor((prev) => prev ? { ...prev, detailImage: '' } : prev)} className="text-[10px] text-red-600 hover:underline">Remove</button>
                </div>
              )}
              {(projectMetaEditor.references ?? []).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {projectMetaEditor.references.map((ref, idx) => (
                    <span key={`${ref.url}-${idx}`} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-gray-100 border border-gray-200">
                      {ref.cover ? <img src={resolveImageUrl(ref.cover)} alt="" className="w-5 h-5 rounded object-cover" /> : null}
                      <span className="truncate max-w-[100px]">{ref.title || ref.url}</span>
                      {ref.stageTag && (
                        <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border-2 border-teal-500 bg-teal-500 text-white text-[9px] font-medium shrink-0">
                          <span className="w-1 h-1 rounded-full bg-white shrink-0" />
                          {ref.stageTag}
                        </span>
                      )}
                      {ref.contentTag && (
                        <span className="px-1 py-0.5 rounded bg-violet-100 text-violet-700 border border-violet-200 text-[9px] font-medium shrink-0">{ref.contentTag}</span>
                      )}
                      <button type="button" onClick={() => setProjectMetaEditor((prev) => prev ? { ...prev, references: prev.references.filter((_, i) => i !== idx) } : prev)} className="p-0.5 rounded hover:bg-gray-200 text-gray-500"><X className="w-3 h-3" /></button>
                    </span>
                  ))}
                </div>
              )}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-gray-700">
                    <Paperclip className="w-3.5 h-3.5" />
                    Attachments
                  </span>
                  <label className="px-2.5 py-1 text-[11px] rounded-lg border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 cursor-pointer">
                    Add
                    <input type="file" className="hidden" onChange={handleProjectMetaUploadAttachment} />
                  </label>
                </div>
                <p className="text-[10px] text-gray-500 mb-2">Files</p>
                {(projectMetaEditor.attachments ?? []).length === 0 ? (
                  <p className="text-[10px] text-gray-400 italic">No attachments yet</p>
                ) : (
                  <div className="space-y-2">
                    {projectMetaEditor.attachments.map((att, idx) => {
                      const ext = (att.name.split('.').pop() || '').toUpperCase().slice(0, 4)
                      const typeLabel = ext === 'PDF' ? 'PDF' : ext ? ext : 'FILE'
                      const addedText = att.addedAt ? (() => {
                        const mins = Math.floor((Date.now() - att.addedAt) / 60000)
                        if (mins < 1) return 'Just now'
                        if (mins < 60) return `Added ${mins} minute${mins === 1 ? '' : 's'} ago`
                        const hrs = Math.floor(mins / 60)
                        return `Added ${hrs} hour${hrs === 1 ? '' : 's'} ago`
                      })() : ''
                      return (
                        <div key={`${att.url}-${idx}`} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/50 px-2.5 py-2">
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-medium bg-gray-200 text-gray-600 border-b border-gray-300">{typeLabel}</span>
                          <div className="flex-1 min-w-0">
                            <a href={resolveImageUrl(att.url)} target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-gray-800 hover:underline truncate block">{att.name}</a>
                            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                              {addedText && <p className="text-[10px] text-gray-500">{addedText}</p>}
                              {att.stageTag && (
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full border-2 border-teal-500 bg-teal-500 text-white text-[9px] font-medium">
                                  <span className="w-1 h-1 rounded-full bg-white shrink-0" />
                                  {att.stageTag}
                                </span>
                              )}
                              {att.contentTag && <span className="px-1 py-0.5 rounded bg-violet-100 text-violet-700 border border-violet-200 text-[9px] font-medium">{att.contentTag}</span>}
                            </div>
                          </div>
                          <a href={resolveImageUrl(att.url)} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-gray-200 text-gray-500" title="Open"><ExternalLink className="w-3.5 h-3.5" /></a>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setProjectMetaAttachmentMenuIndex((prev) => (prev === idx ? null : idx))}
                              className="p-1 rounded hover:bg-gray-200 text-gray-500"
                              title="More"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                            {projectMetaAttachmentMenuIndex === idx && (
                              <>
                                <div className="fixed inset-0 z-10" onClick={() => setProjectMetaAttachmentMenuIndex(null)} aria-hidden="true" />
                                <div className="absolute right-0 top-full mt-0.5 py-1 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[120px] z-20">
                                  <button type="button" onClick={() => { setProjectMetaAttachmentMenuIndex(null) }} className="w-full px-3 py-2 text-left text-[11px] hover:bg-gray-50 text-gray-800">Edit</button>
                                  <button type="button" onClick={() => { setProjectMetaAttachmentMenuIndex(null) }} className="w-full px-3 py-2 text-left text-[11px] hover:bg-gray-50 text-gray-800">Comment</button>
                                  <a href={resolveImageUrl(att.url)} download={att.name} target="_blank" rel="noopener noreferrer" onClick={() => setProjectMetaAttachmentMenuIndex(null)} className="block w-full px-3 py-2 text-left text-[11px] hover:bg-gray-50 text-gray-800">Download</a>
                                  <button type="button" onClick={() => { setProjectMetaEditor((prev) => prev ? { ...prev, attachments: prev.attachments.filter((_, i) => i !== idx) } : prev); setProjectMetaAttachmentMenuIndex(null) }} className="w-full px-3 py-2 text-left text-[11px] hover:bg-gray-50 text-red-600">Remove</button>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={() => { setProjectMetaEditor(null); setProjectMetaAttachmentMenuIndex(null) }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button type="button" onClick={saveProjectMetaEditor} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg">Save</button>
            </div>
            {tagAnalyzing && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-gray-400">
                <span className="w-3 h-3 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
                AI analyzing…
              </div>
            )}
          </div>
        </div>
      )}
      {/* AI 标签确认弹窗 — 独立浮层，覆盖在主 modal 上 */}
      {tagConfirmDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setTagConfirmDialog(null)}>
          <div className="w-full max-w-xs bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* 顶部色条 */}
            <div className="h-1 bg-gradient-to-r from-teal-400 to-violet-400" />
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] text-gray-400 mb-0.5">AI 判断这个{tagConfirmDialog.type === 'ref' ? '链接' : tagConfirmDialog.type === 'att' ? '附件' : '找人需求'}属于</p>
                  <div className="flex items-center gap-2 flex-wrap mt-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-teal-100 border border-teal-200 text-teal-800 text-[11px] font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                      {tagConfirmDialog.editStage}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-violet-100 border border-violet-200 text-violet-800 text-[11px] font-semibold">
                      {tagConfirmDialog.editTag}
                    </span>
                  </div>
                </div>
                <button type="button" onClick={() => setTagConfirmDialog(null)} className="text-gray-300 hover:text-gray-500 shrink-0 mt-0.5">
                  <X className="w-4 h-4" />
                </button>
              </div>
              {/* 可编辑区 */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[9px] text-gray-400 mb-0.5">进度阶段</label>
                  <input
                    type="text"
                    value={tagConfirmDialog.editStage}
                    onChange={(e) => setTagConfirmDialog((d) => d ? { ...d, editStage: e.target.value } : d)}
                    className="w-full px-2 py-1 text-[11px] border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-400/40 bg-gray-50"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[9px] text-gray-400 mb-0.5">内容标签</label>
                  <input
                    type="text"
                    value={tagConfirmDialog.editTag}
                    onChange={(e) => setTagConfirmDialog((d) => d ? { ...d, editTag: e.target.value } : d)}
                    className="w-full px-2 py-1 text-[11px] border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-violet-400/40 bg-gray-50"
                  />
                </div>
              </div>
              {/* 是否更新项目进度 */}
              {tagConfirmDialog.suggestUpdateStage && (
                <label className="flex items-start gap-2 cursor-pointer select-none bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2">
                  <input
                    type="checkbox"
                    checked={tagConfirmDialog.updateStage}
                    onChange={(e) => setTagConfirmDialog((d) => d ? { ...d, updateStage: e.target.checked } : d)}
                    className="mt-0.5 w-3.5 h-3.5 rounded accent-amber-500 shrink-0"
                  />
                  <span className="text-[11px] text-amber-800 leading-snug">
                    项目当前进度与此不同，是否同时更新为 <strong className="font-semibold">{tagConfirmDialog.editStage}</strong>？
                  </span>
                </label>
              )}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTagConfirm}
                  className="flex-1 py-2 text-[12px] font-semibold rounded-xl bg-teal-600 text-white hover:bg-teal-700 transition-colors"
                >
                  确认
                </button>
                <button
                  type="button"
                  onClick={() => setTagConfirmDialog(null)}
                  className="px-4 py-2 text-[12px] rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
                >
                  跳过
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {peopleNeedEditor && (
        <div className="fixed inset-0 z-[110] bg-black/45 flex items-center justify-center p-4" onClick={() => setPeopleNeedEditor(null)}>
          <div className="w-full max-w-md bg-white rounded-xl shadow-xl p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">{peopleNeedEditor.whoIndex === null ? 'Add looking-for card' : 'Edit looking-for card'}</h3>
              <button type="button" className="p-1 rounded hover:bg-gray-100" onClick={() => setPeopleNeedEditor(null)} aria-label="Close">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Who? e.g. podcast guests interested in AI"
                value={peopleNeedEditor.text}
                onChange={(e) => setPeopleNeedEditor((prev) => prev ? { ...prev, text: e.target.value } : prev)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-400/40"
              />
              <textarea
                placeholder="Details (optional): what kind of partner / how to collaborate"
                value={peopleNeedEditor.detail}
                onChange={(e) => setPeopleNeedEditor((prev) => prev ? { ...prev, detail: e.target.value } : prev)}
                rows={4}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-amber-400/40 resize-none"
              />
            </div>
            <div className="mt-3 flex items-center justify-between">
              {peopleNeedEditor.whoIndex !== null ? (
                <button
                  type="button"
                  onClick={() => {
                    const { projectIndex, whoIndex } = peopleNeedEditor
                    if (whoIndex === null) return
                    const next = [...projectsList]
                    if (!next[projectIndex]) return
                    const arr = [...(next[projectIndex]?.peopleNeeded ?? [])]
                    arr.splice(whoIndex, 1)
                    next[projectIndex] = { ...next[projectIndex], peopleNeeded: arr }
                    setProjectsList(next)
                    saveProfileDataToDb(getProfileDataFromState({ projects: next }))
                    setPeopleNeedEditor(null)
                  }}
                  className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                >
                  Delete
                </button>
              ) : <span />}
              <button
                type="button"
                onClick={() => {
                  const { projectIndex, whoIndex, text, detail } = peopleNeedEditor
                  const t = text.trim()
                  if (!t) return
                  const next = [...projectsList]
                  if (!next[projectIndex]) return
                  const arr = [...(next[projectIndex]?.peopleNeeded ?? [])]
                  if (whoIndex === null) arr.push({ text: t, detail: detail.trim() || undefined })
                  else arr[whoIndex] = { ...arr[whoIndex], text: t, detail: detail.trim() || undefined }
                  next[projectIndex] = { ...next[projectIndex], peopleNeeded: arr }
                  setProjectsList(next)
                  saveProfileDataToDb(getProfileDataFromState({ projects: next }))
                  setPeopleNeedEditor(null)
                }}
                className="px-4 py-1.5 text-sm font-medium bg-amber-500 text-white rounded-lg hover:bg-amber-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200">
        <div className="max-w-xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative shrink-0" ref={topLeftMenuRef}>
              <button
                type="button"
                onClick={() => setShowTopLeftMenu((v) => !v)}
                className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                title="More"
                aria-expanded={showTopLeftMenu}
              >
                <MoreVertical className="w-5 h-5" />
              </button>
              {showTopLeftMenu && (
                <div className="absolute left-0 top-full mt-1 min-w-[160px] py-1 bg-white rounded-lg border border-gray-200 shadow-lg z-50">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTopLeftMenu(false)
                      if (tags.length > 0) setShowTagsModal(true)
                    }}
                    disabled={tags.length === 0}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <Tag className="w-4 h-4 text-teal-500 shrink-0" />
                    <span>
                      {tags.length > 0 ? `Tags (${tags.length})` : 'Tags (none)'}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowTopLeftMenu(false)
                      if (insights.length > 0) setShowInsightsModal(true)
                    }}
                    disabled={insights.length === 0}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>
                      {insights.length > 0 ? `Insights (${insights.length})` : 'Insights (none)'}
                    </span>
                  </button>
                </div>
              )}
            </div>
            <img
              src="/logo-nexus.jpeg"
              alt="logo"
              className="h-12 w-auto object-contain rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
              onClick={() => router.push('/profile')}
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/profile')}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200"
            >
              Profile
            </button>
            <Link
              href="/square"
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <LayoutGrid className="w-4 h-4" />
              Plaza
            </Link>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-red-600 hover:text-red-700 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Switch account</span>
          </button>
        </div>
      </div>

      {/* 固定右上：标签、消息、洞察、我的收藏、潜在合作 */}
      <div className="fixed top-20 right-4 z-40 flex flex-col gap-1.5">
        <button
          type="button"
          onClick={() => tags.length > 0 && setShowTagsModal(true)}
          disabled={tags.length === 0}
          title="Tags"
          className="w-9 h-9 rounded-full bg-white/95 shadow-md border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-teal-50 hover:text-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Tag className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => { markMessagesSeen(); setShowMessagesModal(true) }}
          title="消息"
          className="relative w-9 h-9 rounded-full bg-white/95 shadow-md border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-teal-50 hover:text-teal-600 transition-colors"
        >
          <Mail className="w-4 h-4" />
          {profileMessages.length > lastSeenMessageCount && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-500 border-2 border-white" />
          )}
        </button>
        <button
          type="button"
          onClick={() => insights.length > 0 && setShowInsightsModal(true)}
          disabled={insights.length === 0}
          title="Insights"
          className="w-9 h-9 rounded-full bg-white/95 shadow-md border border-gray-200 flex items-center justify-center text-amber-600 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Lightbulb className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setShowFavoritesModal(true)
            fetch('/api/user/favorites', { credentials: 'include' })
              .then((r) => r.ok ? r.json() : null)
              .then((data) => data?.favorites && setFavoriteProfiles(data.favorites))
              .catch(() => {})
          }}
          title="我的收藏"
          className="w-9 h-9 rounded-full bg-white/95 shadow-md border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-teal-50 hover:text-teal-600 transition-colors"
        >
          <Bookmark className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={async () => {
            setShowPotentialConnectionModal(true)
            try {
              const res = await fetch('/api/profile-collaboration-hints', { credentials: 'include' })
              const data = await res.json().catch(() => ({}))
              if (Array.isArray(data?.list) && data.list.length > 0) {
                setViewedPotentialConnections(data.list)
                return
              }
            } catch (_) {}
            try {
              const raw = localStorage.getItem('profile_viewed_potential')
              setViewedPotentialConnections(raw ? JSON.parse(raw) : [])
            } catch {
              setViewedPotentialConnections([])
            }
          }}
          title="潜在合作"
          className="w-9 h-9 rounded-full bg-white/95 shadow-md border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-teal-50 hover:text-teal-600 transition-colors"
        >
          <HeartHandshake className="w-4 h-4" />
        </button>
      </div>

      {/* Profile：每日一问 + 预览 */}
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6 items-stretch">
        {/* 每日一问：卡片上方 */}
        <div className="w-full max-w-sm mx-auto shrink-0">
          <DailyQuestionCard />
        </div>

        {/* 预览模板：竖屏时在下方，用户可控制各区块显示/隐藏 */}
        <aside className="w-full max-w-sm mx-auto shrink-0">
          <p className="text-xs font-medium text-gray-500 mb-2">Preview</p>
          <div className="rounded-2xl shadow-xl overflow-hidden bg-gradient-to-b from-blue-100 via-pink-100 to-orange-200 min-h-[360px] flex flex-col">
            {/* 卡片最上方：链接名 + 分享链接（支持 /u/cm 短链） */}
            {typeof window !== 'undefined' && userInfo?.id && (
              <div className="px-3 pt-2 pb-1.5 border-b border-white/60 bg-white/50">
                <p className="text-[10px] text-gray-500 mb-1">Shareable link:</p>
                <p
                  title={`${window.location.origin}/u/${getSharePath(userInfo?.profileSlug, userInfo?.name, userInfo?.id)}`}
                  className="text-xs text-gray-700 font-mono truncate px-2 py-1 rounded bg-white/80"
                >
                  {window.location.origin}/u/{getSharePath(userInfo?.profileSlug, userInfo?.name, userInfo?.id)}
                </p>
                <p className="text-[10px] text-amber-700 mt-1">
                  {window.location.origin.includes('localhost')
                    ? 'Local link: only this device can open it. Use your local IP on the same Wi‑Fi, or deploy before sharing.'
                    : 'Copy and share the link above'}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                const path = getSharePath(userInfo?.profileSlug, userInfo?.name, userInfo?.id) || ''
                const url = typeof window !== 'undefined' && path ? `${window.location.origin}/u/${path}` : ''
                if (url && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                  navigator.clipboard.writeText(url)
                  setShareLinkCopied(true)
                  setTimeout(() => setShareLinkCopied(false), 2000)
                }
              }}
              disabled={!userInfo?.id}
              className="w-full flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-medium text-gray-700 bg-white/80 hover:bg-white border-b border-white/60 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Share2 className="w-4 h-4 text-teal-500 shrink-0" />
              <span>Share my link</span>
              {shareLinkCopied && <span className="text-xs text-teal-600">Copied</span>}
            </button>
            <div className="relative flex-1 min-h-[240px] flex flex-col">
              {avatarDataUrl ? (
                <img src={resolveImageUrl(avatarDataUrl)} alt="" className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full bg-gradient-to-b from-gray-200 to-gray-300 flex items-center justify-center text-white text-5xl font-bold">
                  {session?.user?.name?.charAt(0).toUpperCase() || '?'}
                </div>
              )}
              <div className="absolute top-3 right-3 z-10" ref={previewCardMenuRef}>
                <button
                  type="button"
                  onClick={() => { setPreviewCardMenuOpen((v) => !v); if (hasNewDbAdditions) markDbAdditionsSeen() }}
                  className="relative w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-gray-500 hover:bg-white hover:shadow transition-colors"
                  aria-label="编辑"
                  aria-expanded={previewCardMenuOpen}
                >
                  <MoreVertical className="w-4 h-4" />
                  {hasNewDbAdditions && (
                    <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" aria-hidden />
                  )}
                </button>
                {previewCardMenuOpen && (
                  <div className="absolute right-0 top-full mt-1 min-w-[160px] py-1 bg-white rounded-lg border border-gray-200 shadow-lg">
                    <button
                      type="button"
                      onClick={() => { setPreviewCardMenuOpen(false); setShowProjectsModal(true) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <LayoutGrid className="w-4 h-4 text-teal-500 shrink-0" />
                      Project{projectsList.filter((p) => p.showOnPlaza && p.visibility !== 'hidden').length > 0 ? ` (${projectsList.filter((p) => p.showOnPlaza && p.visibility !== 'hidden').length})` : ''}
                    </button>
                    <label className="relative block w-full cursor-pointer hover:bg-gray-50 min-h-[44px]">
                      <span className="flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 w-full pointer-events-none">
                        <Camera className="w-4 h-4 text-teal-500 shrink-0" />
                        Change photo
                      </span>
                      <input
                        ref={profilePhotoInputRef}
                        type="file"
                        accept="image/*"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        style={{ fontSize: '16px' }}
                        onChange={(e) => { handlePhotoUpload(e); setPreviewCardMenuOpen(false) }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => { setPreviewCardMenuOpen(false); setShowAddSocialIcon(true); setSocialSearch('') }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Link2 className="w-4 h-4 text-teal-500 shrink-0" />
                      Social media
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPreviewCardMenuOpen(false); setAddModalTarget('links'); setShowAddSocialList(true); setAddModalCategory('suggested') }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <List className="w-4 h-4 text-teal-500 shrink-0" />
                      Links
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewCardMenuOpen(false)
                        setEditingWorkIntroId(null)
                        setWorkIntroModalMode('image')
                        setNewWorkIntroCover(null)
                        setNewWorkIntroName('')
                        setNewWorkIntroDesc('')
                        setNewWorkIntroUrl('')
                        setNewWorkIntroIsPersonalWebsite(false)
                        setShowAddWorkIntroModal(true)
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <ShoppingBag className="w-4 h-4 text-teal-500 shrink-0" />
                      Add image
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPreviewCardMenuOpen(false); setShowAddActivityModal(true); setAddActivityDraft(''); setAddActivityInputFromModal(''); setAddActivityVisibility(null); setAddActivityNeedPeople(null); setAddActivityPeopleList([]); setAddActivityPeopleInput(''); setAddActivityEditingWhoIndex(null); setAddActivityShowOnPlaza(null) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Sparkles className="w-4 h-4 text-teal-500 shrink-0" />
                      Activity{projectsList.length > 0 ? ` (${projectsList.length})` : ''}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPreviewCardMenuOpen(false); setShowExperienceModal(true); setExperienceModalTab('experience'); setEditingExpId(null); setEditingEduId(null); setExpForm({ title: '', company: '', employmentType: '', location: '', startDate: '', endDate: '', current: false, description: '' }); setEduForm({ school: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '', grade: '', description: '' }) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Briefcase className="w-4 h-4 text-teal-500 shrink-0" />
                      Add experience{(experiences.length + education.length) > 0 ? ` (${experiences.length + education.length})` : ''}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPreviewCardMenuOpen(false); setShowQAModal(true) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <MessageSquare className="w-4 h-4 text-teal-500 shrink-0" />
                      Interested topics{qaList.length > 0 ? ` (${qaList.length})` : ''}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPreviewCardMenuOpen(false); setShowOneSentenceModal(true) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <FileText className="w-4 h-4 text-teal-500 shrink-0" />
                      Describe myself in one sentence
                    </button>
                    <button
                      type="button"
                      onClick={() => { setPreviewCardMenuOpen(false); setShowDatabaseSourcesModal(true) }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Database className="w-4 h-4 text-teal-500 shrink-0" />
                      <span>Add database</span>
                      {databaseSources.length > 0 && <span className="text-gray-400">({databaseSources.length})</span>}
                    </button>
                  </div>
                )}
              </div>
              {/* 底部一个框：从上到下 = 标签 → 人名 → 一句话介绍 → 性别/base */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent px-4 pt-4 pb-3 min-h-[120px] flex flex-col items-center justify-end gap-2 flex-wrap">
                {/* 第一行：标签（一定在人名上面） */}
                {showTagsInPreview && selectedTags.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5 w-full">
                    {selectedTags.map((tag, i) => (
                      <span key={i} className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-white/90 text-gray-700 border border-white/90 shadow-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {/* 第二行：人名 */}
                <div className="flex items-center justify-center w-full">
                  <p className="font-bold text-white text-lg drop-shadow-md">
                    {session?.user?.name || 'Username'}
                  </p>
                </div>
                {/* Describe myself in one sentence：可编辑，高度随内容完整显示，无滚动条 */}
                <textarea
                  ref={oneSentenceTextareaRef}
                  placeholder="Describe myself in one sentence"
                  value={oneSentenceDesc}
                  onChange={(e) => setOneSentenceDesc(e.target.value)}
                  onBlur={() => {
                    try { persistOneSentenceToDb() } catch {}
                  }}
                  rows={1}
                  className="w-full max-w-full px-2 py-1 text-xs text-center text-white/95 bg-white/10 border border-white/30 rounded focus:outline-none focus:ring-1 focus:ring-white/50 focus:border-white/50 placeholder-white/60 drop-shadow-md resize-none min-h-[1.75rem] break-words whitespace-pre-wrap overflow-hidden shrink-0"
                />
                {/* 第三行：性别、base 钉上去小标签 */}
                <div className="flex flex-wrap justify-center gap-1.5">
                  {userInfo?.gender && (
                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-white/95 text-gray-800 border border-white shadow-md">
                      {userInfo.gender === 'male' ? 'Male' : userInfo.gender === 'female' ? 'Female' : userInfo.gender}
                    </span>
                  )}
                  {userInfo?.location && (
                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-white/95 text-gray-800 border border-white shadow-md">
                      {userInfo.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {/* Projects (and who you're looking for): choose Public/Individual first, then options. */}
            <div className="flex flex-col w-full px-4 pt-2 pb-2 shrink-0 border-t border-white/50">
              <p className="text-xs text-gray-500 mb-2">Projects (and who you&apos;re looking for)</p>
              <div className="space-y-3">
                {projectsList.map((proj, i) => (
                  <div key={i} className="rounded-lg border border-white/80 bg-white/90 p-2 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {editingProjectIndex === i ? (
                        <input
                          type="text"
                          value={editingProjectValue}
                          onChange={(e) => setEditingProjectValue(e.target.value)}
                          onBlur={() => {
                            const v = editingProjectValue.trim()
                            if (v) {
                              const next = [...projectsList]
                              next[i] = { ...next[i], text: v }
                              setProjectsList(next)
                              saveProfileDataToDb(getProfileDataFromState({ projects: next }))
                            }
                            setEditingProjectIndex(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              const v = editingProjectValue.trim()
                              if (v) {
                                const next = [...projectsList]
                                next[i] = { ...next[i], text: v }
                                setProjectsList(next)
                                saveProfileDataToDb(getProfileDataFromState({ projects: next }))
                              }
                              setEditingProjectIndex(null)
                            }
                          }}
                          autoFocus
                          className="flex-1 min-w-[120px] px-2 py-1 text-[11px] border border-teal-300 rounded"
                        />
                      ) : (
                        <>
                          <span
                            onClick={() => {
                              setProjectMetaAttachmentMenuIndex(null)
                              setProjectMetaEditor({
                                projectIndex: i,
                                text: proj.text,
                                detail: proj.detail ?? '',
                                references: [...(proj.references ?? [])],
                                detailImage: proj.detailImage ?? '',
                                attachments: [...(proj.attachments ?? [])],
                                linkInput: '',
                                stage: proj.stage?.trim() || inferStageFromPeopleNeeded(proj.peopleNeeded ?? []),
                                stageOrder: (proj.stageOrder?.length ? proj.stageOrder.filter((s) => STAGE_RECOMMENDED_TAGS.includes(s as any)) : [...STAGE_RECOMMENDED_TAGS]).filter(Boolean).length > 0
                                  ? (proj.stageOrder?.length ? proj.stageOrder.filter((s) => STAGE_RECOMMENDED_TAGS.includes(s as any)) : [...STAGE_RECOMMENDED_TAGS]).filter(Boolean)
                                  : [...STAGE_RECOMMENDED_TAGS],
                                stageInput: '',
                                stageEnteredAt: (() => {
                                  const cur = proj.stage?.trim() || inferStageFromPeopleNeeded(proj.peopleNeeded ?? [])
                                  const entered = proj.stageEnteredAt ?? {}
                                  if (!entered[cur] && proj.createdAt) return { ...entered, [cur]: proj.createdAt }
                                  return entered
                                })(),
                                creators: proj.creators ?? [],
                                creatorInput: '',
                                peopleNeeded: proj.peopleNeeded ?? [],
                                openToInput: '',
                              })
                            }}
                            className="cursor-pointer hover:underline text-[11px] font-medium text-gray-800"
                            title="Click to edit project description, links, and image"
                          >
                            {proj.text}
                          </span>
                          <div
                            className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border border-teal-500 bg-teal-500 text-white text-[9px] font-medium shrink-0"
                            title={stageDisplayLabel(proj.stage)}
                          >
                            <span className="w-1 h-1 rounded-full bg-white shrink-0" />
                            <span>{stageDisplayLabel(proj.stage)}</span>
                          </div>
                          {proj.visibility !== 'hidden' && (
                            <button
                              type="button"
                              onClick={() => {
                                const next = [...projectsList]
                                const isPublic = proj.visibility === 'public'
                                next[i] = {
                                  ...next[i],
                                  visibility: isPublic ? 'individual' : 'public',
                                  showOnPlaza: isPublic ? false : true,
                                }
                                setProjectsList(next)
                                saveProfileDataToDb(getProfileDataFromState({ projects: next }))
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10px] shrink-0 cursor-pointer hover:opacity-80 transition-opacity ${proj.visibility === 'public' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-600 border border-gray-200'}`}
                              title="Click to toggle public / individual"
                            >
                              {proj.visibility === 'public' ? 'public' : 'individual'}
                            </button>
                          )}
                          <div className="relative" ref={projectVisibilityDropdownIndex === i ? projectVisibilityDropdownRef : null}>
                            <button
                              type="button"
                              onClick={() => setProjectVisibilityDropdownIndex((prev) => (prev === i ? null : i))}
                              className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] cursor-pointer hover:opacity-80 ${
                                proj.visibility === 'hidden'
                                  ? 'bg-gray-200 text-gray-500'
                                  : proj.showOnPlaza
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-teal-100 text-teal-700'
                              }`}
                              title="Select visibility"
                            >
                              {proj.visibility === 'hidden' ? 'Hidden' : proj.showOnPlaza ? 'Plaza' : 'Profile'}
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            {projectVisibilityDropdownIndex === i && (
                              <div className="absolute left-0 top-full mt-1 py-1 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[100px] z-10">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...projectsList]
                                    next[i] = { ...next[i], visibility: 'individual' as const, showOnPlaza: false }
                                    setProjectsList(next)
                                    saveProfileDataToDb(getProfileDataFromState({ projects: next }))
                                    setProjectVisibilityDropdownIndex(null)
                                  }}
                                  className={`w-full px-3 py-2 text-left text-[11px] hover:bg-gray-50 ${!proj.showOnPlaza && proj.visibility !== 'hidden' ? 'bg-teal-50 text-teal-700' : 'text-gray-700'}`}
                                >
                                  Profile
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...projectsList]
                                    next[i] = { ...next[i], visibility: 'public' as const, showOnPlaza: true }
                                    setProjectsList(next)
                                    saveProfileDataToDb(getProfileDataFromState({ projects: next }))
                                    setProjectVisibilityDropdownIndex(null)
                                  }}
                                  className={`w-full px-3 py-2 text-left text-[11px] hover:bg-gray-50 ${proj.showOnPlaza ? 'bg-amber-50 text-amber-700' : 'text-gray-700'}`}
                                >
                                  Plaza
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...projectsList]
                                    next[i] = { ...next[i], visibility: 'hidden' as const, showOnPlaza: false }
                                    setProjectsList(next)
                                    saveProfileDataToDb(getProfileDataFromState({ projects: next }))
                                    setProjectVisibilityDropdownIndex(null)
                                  }}
                                  className={`w-full px-3 py-2 text-left text-[11px] hover:bg-gray-50 ${proj.visibility === 'hidden' ? 'bg-gray-100 text-gray-700' : 'text-gray-700'}`}
                                >
                                  Hidden
                                </button>
                              </div>
                            )}
                          </div>
                          {(proj.attachments ?? []).length > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-gray-600 shrink-0">
                              <Paperclip className="w-3 h-3" />
                              {(proj.attachments ?? []).length}
                            </span>
                          )}
                          {(proj.references ?? []).length > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] shrink-0">{(proj.references ?? []).length} link(s)</span>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              const slug = getSharePath(userInfo?.profileSlug, userInfo?.name, userInfo?.id)
                              const url = typeof window !== 'undefined' ? `${window.location.origin}/u/${slug}/project/${proj.createdAt ?? Date.now()}` : ''
                              if (url && navigator.clipboard?.writeText) {
                                navigator.clipboard.writeText(url)
                                setShareLinkCopied(true)
                                setTimeout(() => setShareLinkCopied(false), 2000)
                              }
                            }}
                            className="p-0.5 rounded hover:bg-teal-100 text-teal-600"
                            title="Copy project share link"
                          >
                            <Share2 className="w-3 h-3" />
                          </button>
                          <button type="button" onClick={() => { const next = projectsList.filter((_, j) => j !== i); setProjectsList(next); saveProfileDataToDb(getProfileDataFromState({ projects: next })) }} className="p-0.5 rounded hover:bg-red-100 text-red-500" aria-label="Remove"><X className="w-3 h-3" /></button>
                        </>
                      )}
                    </div>
                    {(proj.detail?.trim() || proj.detailImage) && (
                      <div className="flex flex-wrap items-center gap-1 text-[10px] text-gray-500">
                        {proj.detail?.trim() ? <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">description</span> : null}
                        {proj.detailImage ? <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">picture</span> : null}
                      </div>
                    )}
                    {proj.visibility === 'public' && (
                      <div className="mt-1">
                        <p className="text-[10px] text-gray-500 mb-1">Open to (click chip to edit)</p>
                        <div className="flex flex-wrap gap-1 mb-1">
                          {(proj.peopleNeeded ?? []).map((who, wi) => (
                            <button
                              key={wi}
                              type="button"
                              onClick={() => setPeopleNeedEditor({ projectIndex: i, whoIndex: wi, text: who.text, detail: who.detail ?? '' })}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-200 hover:bg-amber-200"
                              title={who.detail ? `详情：${who.detail}` : '点击补充详情'}
                            >
                              <span>{who.text}</span>
                              {!!who.detail && <span className="text-[9px] text-amber-700/80">ⓘ</span>}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => setPeopleNeedEditor({ projectIndex: i, whoIndex: null, text: '', detail: '' })}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-white text-amber-700 border border-amber-200 hover:bg-amber-50"
                            title="Add looking-for card"
                          >
                            + Add
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div className="flex gap-1 items-center rounded-lg border border-white/80 bg-white/90 overflow-hidden focus-within:ring-2 focus-within:ring-teal-400/50">
                  <input
                    type="text"
                    placeholder="e.g. Building a documentary project and looking for interviewees"
                    value={projectInput}
                    onChange={(e) => setProjectInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        const v = projectInput.trim()
                        if (v) {
                          setAddActivityDraft(v)
                          setProjectInput('')
                          setAddActivityVisibility(null)
                          setAddActivityNeedPeople(null)
                          setAddActivityPeopleList([])
                          setAddActivityPeopleInput('')
                          setAddActivityShowOnPlaza(null)
                          setShowAddActivityModal(true)
                        }
                      }
                    }}
                    className="flex-1 min-w-0 px-2.5 py-1.5 text-[11px] bg-transparent placeholder-gray-400 text-gray-800 outline-none border-0"
                  />
                  <button type="button" onClick={() => { const v = projectInput.trim(); if (v) { setAddActivityDraft(v); setProjectInput(''); setAddActivityVisibility(null); setAddActivityNeedPeople(null); setAddActivityPeopleList([]); setAddActivityPeopleInput(''); setAddActivityShowOnPlaza(null); setShowAddActivityModal(true) } }} className="shrink-0 p-1.5 text-teal-600 hover:bg-teal-50 rounded-r-md" aria-label="Add" title="Enter to add"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
            {/* Social media：用户可选择在预览中显示/隐藏 */}
            {showSocialInPreview && (
              <div className="flex flex-col items-center w-full px-4 pt-2 pb-2 shrink-0 border-t border-white/50">
                <p className="text-[10px] text-amber-700/90 mb-0.5">Empty fields won&apos;t be publicly visible</p>
                <p className="text-xs text-gray-500 mb-1.5">Social media</p>
                {Object.keys(socialLinks).length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No social links yet — add via +</p>
                ) : (
                  <div className="flex items-center justify-center gap-2 flex-wrap">
                    {Object.keys(socialLinks).map((key) => {
                      const p = getPlatformByKey(key)
                      if (!p) return null
                      const { label, Icon, iconImage } = p
                      const url = socialLinks[key]
                      if (!url) return null
                      return (
                        <a
                          key={key}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center text-gray-700 hover:bg-white hover:shadow transition-all border border-white/80 overflow-hidden"
                          title={label}
                        >
                          {iconImage ? (
                            <img src={iconImage} alt={label} className="w-6 h-6 object-contain" />
                          ) : (
                            <Icon className="w-4 h-4" />
                          )}
                        </a>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            {/* 作品 · 链接：右上角三点 → Links 添加，输入链接自动抓取 */}
            {showLinksInPreview && (
              <div className="flex flex-col items-center w-full px-4 pt-2 pb-2 shrink-0 border-t border-white/50">
                <p className="text-xs text-gray-500 mb-1.5">Works · Links</p>
                {workIntroductions.length > 0 && (
                  <div className="w-full space-y-2 max-h-32 overflow-y-auto mb-2">
                    {workIntroductions.map((w) => (
                      <div
                        key={w.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setEditingWorkIntroId(w.id)
                          setWorkIntroModalMode(w.url ? 'link' : 'image')
                          setNewWorkIntroCover(w.cover || null)
                          setNewWorkIntroName(w.name || '')
                          setNewWorkIntroDesc(w.description || '')
                          setNewWorkIntroUrl(w.url || '')
                          setNewWorkIntroIsPersonalWebsite(w.isPersonalWebsite ?? false)
                          setShowAddWorkIntroModal(true)
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); (e.currentTarget as HTMLElement).click() } }}
                        className="flex gap-2 p-2 rounded-lg bg-white/90 border border-white/80 group relative cursor-pointer hover:bg-white/95 transition-colors"
                      >
                        {w.cover ? (
                          <img src={resolveImageUrl(w.cover)} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded bg-gray-200 shrink-0 flex items-center justify-center text-gray-400 text-[10px]">No cover</div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-gray-800 truncate">{w.name}</p>
                          {w.description && <p className="text-[10px] text-gray-600 line-clamp-2">{w.description}</p>}
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleRemoveWorkIntro(w.id) }}
                          className="absolute top-1 right-1 p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                          aria-label="删除"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {customLinks.length > 0 && (
                  <div className="w-full space-y-1 max-h-16 overflow-y-auto">
                    <p className="text-[10px] text-gray-500 mb-0.5">链接</p>
                    {customLinks.map((link, i) => (
                      <div key={i} className="flex items-center gap-1 group/link">
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 min-w-0 py-1 px-2 rounded bg-white/80 text-[10px] font-medium text-gray-700 truncate hover:bg-white border border-white/60 text-center"
                        >
                          {link.title || link.url}
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemoveCustomLink(i)}
                          className="shrink-0 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                          aria-label="删除"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {workIntroductions.length === 0 && customLinks.length === 0 && (
                  <p className="text-[10px] text-gray-400 italic mt-1">右上角三点 → Links，输入链接自动抓取</p>
                )}
              </div>
            )}
            {/* 经历：工作 + 教育（LinkedIn 风格） */}
            {showExperienceInPreview && (experiences.length > 0 || education.length > 0) && (
              <div className="flex flex-col w-full px-4 pt-2 pb-2 shrink-0 border-t border-white/50">
                <p className="text-xs text-gray-500 mb-1.5">Experience</p>
                {experiences.length > 0 && (
                  <div className="space-y-2 mb-2">
                    {experiences.map((e) => (
                      <div key={e.id} className="flex gap-2 p-2 rounded-lg bg-white/90 border border-white/80">
                        <Briefcase className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-gray-800">{e.title}</p>
                          <p className="text-[10px] text-gray-600">{e.company}{e.employmentType ? ` · ${e.employmentType}` : ''}</p>
                          <p className="text-[10px] text-gray-500">{(e.startDate || e.endDate) ? `${e.startDate || '—'} - ${e.current ? '至今' : (e.endDate || '—')}` : ''}{e.location ? ` · ${e.location}` : ''}</p>
                          {e.description && <p className="text-[10px] text-gray-600 line-clamp-2 mt-0.5">{e.description}</p>}
                        </div>
                        <button type="button" onClick={() => { setEditingExpId(e.id); setExpForm({ title: e.title, company: e.company, employmentType: e.employmentType || '', location: e.location || '', startDate: e.startDate || '', endDate: e.endDate || '', current: e.current || false, description: e.description || '' }); setShowExperienceModal(true); setExperienceModalTab('experience') }} className="shrink-0 p-1 rounded text-gray-400 hover:text-teal-600 hover:bg-teal-50" aria-label="编辑"><Pencil className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
                {education.length > 0 && (
                  <div className="space-y-2">
                    {education.map((e) => (
                      <div key={e.id} className="flex gap-2 p-2 rounded-lg bg-white/90 border border-white/80">
                        <GraduationCap className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-medium text-gray-800">{e.school}</p>
                          <p className="text-[10px] text-gray-600">{(e.degree || e.fieldOfStudy) ? [e.degree, e.fieldOfStudy].filter(Boolean).join(' · ') : ''}</p>
                          <p className="text-[10px] text-gray-500">{(e.startDate || e.endDate) ? `${e.startDate || '—'} - ${e.endDate || '—'}` : ''}{e.grade ? ` · ${e.grade}` : ''}</p>
                          {e.description && <p className="text-[10px] text-gray-600 line-clamp-2 mt-0.5">{e.description}</p>}
                        </div>
                        <button type="button" onClick={() => { setEditingEduId(e.id); setEduForm({ school: e.school, degree: e.degree || '', fieldOfStudy: e.fieldOfStudy || '', startDate: e.startDate || '', endDate: e.endDate || '', grade: e.grade || '', description: e.description || '' }); setShowExperienceModal(true); setExperienceModalTab('education') }} className="shrink-0 p-1 rounded text-gray-400 hover:text-teal-600 hover:bg-teal-50" aria-label="编辑"><Pencil className="w-3.5 h-3.5" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* 感兴趣的话题：卡片上只做展示（勾选显示的 Q&A + Ask me anything），编辑从右上角三点进入 */}
            {showQABlockInPreview && (
              <div ref={qaSectionRef} className="flex flex-col w-full px-3 pt-1 pb-1 shrink-0 border-t border-white/50">
                <p className="text-[10px] text-amber-700/90 mb-0.5">Empty fields won&apos;t be publicly visible</p>
                <p className="text-[11px] text-gray-500 mb-0.5">Interested topics{qaList.length > 0 ? ` · ${qaList.length}` : ''}</p>
                {qaList.length > 0 && qaList.some((item) => item.showInPreview === true && (item.answer ?? '').trim()) ? (
                  <>
                    <div className="space-y-1.5 max-h-[7.5rem] overflow-y-auto">
                      {qaList.map((item, origIndex) =>
                        item.showInPreview !== true || !(item.answer ?? '').trim() ? null : (
                          <div key={origIndex} className="flex flex-col gap-0.5">
                            <div className="flex items-start gap-1">
                              <p className="flex-1 min-w-0 text-[11px] font-medium text-gray-800 leading-snug whitespace-pre-wrap break-words">Q: {item.question || '(无问题)'}</p>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveQA(origIndex)}
                                  title="删除"
                                  className="p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                  aria-label="删除"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <a
                                  href={typeof window !== 'undefined' && userInfo?.id ? `#discuss-${origIndex}` : '#'}
                                  title="参与讨论"
                                  className="p-0.5 rounded text-gray-500 hover:text-teal-600 hover:bg-white/80 transition-colors"
                                  aria-label="参与讨论"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                            <p className="text-[10px] text-gray-600 leading-snug whitespace-pre-wrap break-words px-1.5 py-0.5 bg-white/80 rounded border border-white/60">
                              A: {item.answer || '—'}
                            </p>
                          </div>
                        )
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-0.5">When others query: only what I&apos;ve saved—no AI answers.</p>
                    <div className="mt-1.5 pt-1.5 border-t border-white/40 flex gap-1 items-center rounded-lg border border-white/80 bg-white/90 overflow-hidden focus-within:ring-2 focus-within:ring-teal-400/50">
                      <input
                        type="text"
                        placeholder="Query my database"
                        value={askMeAnythingValue}
                        onChange={(e) => setAskMeAnythingValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQueryDatabaseSubmit() } }}
                        className="flex-1 min-w-0 px-2.5 py-1.5 text-[11px] bg-transparent placeholder-gray-400 text-gray-800 outline-none border-0"
                      />
                      <button type="button" onClick={handleQueryDatabaseSubmit} disabled={databaseQueryLoading} className="shrink-0 p-1.5 text-teal-600 hover:bg-teal-50 rounded-r-md disabled:opacity-50" aria-label="Search">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    {databaseLastQuery && (
                      <div className="mt-1.5 p-1.5 rounded-lg bg-white/80 border border-white/60 text-[10px] text-gray-700">
                        <p className="font-medium text-gray-800 mb-0.5">From my database (saved + RAG from added links):</p>
                        {databaseQueryLoading ? (
                          <p className="text-gray-500">Searching RAG...</p>
                        ) : databaseQueryResults && databaseQueryResults.length > 0 ? (
                          <ul className="space-y-0.5 max-h-24 overflow-y-auto">
                            {databaseQueryResults.map((r, i) => (
                              <li key={i} className="flex flex-col gap-0">
                                {r.type === 'tag' && <span className="text-teal-700">Tag: {r.text}</span>}
                                {r.type === 'insight' && <span className="text-gray-700">{r.text}</span>}
                                {r.type === 'qa' && <span>Q: {r.text}<br className="block" />A: {r.extra}</span>}
                                {r.type === 'rag' && (
                                  <span className="text-teal-700">
                                    From RAG: {r.text}
                                    {(r.text.includes('发条消息') || r.showMessageToTa) && databaseLastQuery.trim() && (
                                      <span className="block mt-1">
                                        <button
                                          type="button"
                                          onClick={() => { setSendMessageDraft(databaseLastQuery); setShowSendMessageModal(true) }}
                                          disabled={sendToEvelynFeedback === 'sending'}
                                          className="text-teal-600 hover:text-teal-700 font-medium text-[10px] underline disabled:opacity-50"
                                        >
                                          发消息给 TA
                                        </button>
                                        {sendToEvelynFeedback === 'sending' && <span className="text-[10px] text-gray-500 ml-1">发送中…</span>}
                                        {sendToEvelynFeedback === 'sent' && <span className="text-[10px] text-green-600 ml-1">已发送 ✓</span>}
                                        {sendToEvelynFeedback === 'error' && <span className="text-[10px] text-red-600 ml-1">发送失败</span>}
                                      </span>
                                    )}
                                    {(r.askUser || /没有找到|建议您补充|建议.*补充|建议.*完善/.test(r.text)) && !r.showMessageToTa && (
                                      <span className="block mt-1">
                                        <button
                                          type="button"
                                          onClick={() => router.push('/user-info')}
                                          className="text-teal-600 hover:text-teal-700 font-medium text-[10px] underline disabled:opacity-50"
                                        >
                                          去个人资料补充
                                        </button>
                                      </span>
                                    )}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-gray-500">No matches.</p>
                            {databaseQueryRagError === 'unavailable' && (
                              <div className="space-y-1">
                                <p className="text-[10px] text-amber-700 bg-amber-50 px-1 py-0.5 rounded">RAG 服务未配置或未启动。请添加 .env.local 中 RAG_API_URL=http://localhost:8000，并双击 start-rag.bat 启动（详见 docs/RAG_START.md）。</p>
                                <button type="button" onClick={checkRagStatus} disabled={ragStatusChecking} className="text-[10px] text-teal-600 hover:underline disabled:opacity-50">检查 RAG 状态</button>
                                {ragStatusCheck && (
                                  <div className={`text-[10px] px-1 py-0.5 rounded space-y-0.5 ${ragStatusCheck.reachable ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50'}`}>
                                    <p>
                                      {ragStatusCheck.reachable
                                        ? (ragStatusCheck.processedCount !== undefined
                                          ? (ragStatusCheck.processedCount === 0
                                            ? 'RAG 服务正常，但索引为空。请先在「增加数据库」粘贴文本或上传文档。'
                                            : `RAG 服务正常，索引中有 ${ragStatusCheck.processedCount} 篇文档。`)
                                          : 'RAG 服务正常')
                                        : (ragStatusCheck.hint || ragStatusCheck.error)}
                                    </p>
                                    {ragStatusCheck.reachable && ragStatusCheck.testQuery != null && (
                                      <p className="text-gray-600">
                                        测试「{ragStatusCheck.testQuery}」返回: {ragStatusCheck.testAnswer === '' ? '(空)' : (ragStatusCheck.testAnswer || '(无)')}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            {databaseQueryRagError === 'empty' && (
                              <div className="space-y-1">
                                <p className="text-[10px] text-amber-700 bg-amber-50 px-1 py-0.5 rounded">RAG 未返回结果。请先点「检查 RAG 状态」：若显示<strong>索引为空</strong>，需在「增加数据库」里<strong>粘贴文本</strong>或<strong>上传 Word/PDF</strong>添加内容；若显示索引中有文档但仍无结果，可换一种问法再试。</p>
                                <button type="button" onClick={checkRagStatus} disabled={ragStatusChecking} className="text-[10px] text-teal-600 hover:underline disabled:opacity-50">检查 RAG 状态</button>
                                {ragStatusCheck && (
                                  <div className={`text-[10px] px-1 py-0.5 rounded space-y-0.5 ${ragStatusCheck.reachable ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50'}`}>
                                    <p>
                                      {ragStatusCheck.reachable
                                        ? (ragStatusCheck.processedCount !== undefined
                                          ? (ragStatusCheck.processedCount === 0
                                            ? 'RAG 服务正常，但索引为空。请先在「增加数据库」粘贴文本或上传文档。'
                                            : `RAG 服务正常，索引中有 ${ragStatusCheck.processedCount} 篇文档。`)
                                          : 'RAG 服务正常')
                                        : (ragStatusCheck.hint || ragStatusCheck.error)}
                                    </p>
                                    {ragStatusCheck.reachable && ragStatusCheck.testQuery != null && (
                                      <p className="text-gray-600">
                                        测试「{ragStatusCheck.testQuery}」返回: {ragStatusCheck.testAnswer === '' ? '(空)' : (ragStatusCheck.testAnswer || '(无)')}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            <p className="text-gray-700 break-words">&quot;{databaseLastQuery}&quot;</p>
                            <button
                              type="button"
                              onClick={handleSendToEvelyn}
                              disabled={sendToEvelynFeedback === 'sending'}
                              className="text-teal-600 hover:text-teal-700 font-medium text-[10px] underline disabled:opacity-50"
                            >
                              Send to {session?.user?.name || 'me'}
                            </button>
                            {sendToEvelynFeedback === 'sending' && <p className="text-[10px] text-gray-500">Sending...</p>}
                            {sendToEvelynFeedback === 'sent' && <p className="text-[10px] text-green-600 font-medium">Sent to {session?.user?.name || 'me'} ✓</p>}
                            {sendToEvelynFeedback === 'error' && <p className="text-[10px] text-red-600">Failed to send. Try again.</p>}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-[10px] text-gray-500 mt-0.5">When others query: only what I&apos;ve saved—no AI answers.</p>
                    <div className="mt-1.5 pt-1.5 border-t border-white/40 flex gap-1 items-center rounded-lg border border-white/80 bg-white/90 overflow-hidden focus-within:ring-2 focus-within:ring-teal-400/50">
                      <input
                        type="text"
                        placeholder="Query my database"
                        value={askMeAnythingValue}
                        onChange={(e) => setAskMeAnythingValue(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQueryDatabaseSubmit() } }}
                        className="flex-1 min-w-0 px-2.5 py-1.5 text-[11px] bg-transparent placeholder-gray-400 text-gray-800 outline-none border-0"
                      />
                      <button type="button" onClick={handleQueryDatabaseSubmit} disabled={databaseQueryLoading} className="shrink-0 p-1.5 text-teal-600 hover:bg-teal-50 rounded-r-md disabled:opacity-50" aria-label="Search">
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                    {databaseLastQuery && (
                      <div className="mt-1.5 p-1.5 rounded-lg bg-white/80 border border-white/60 text-[10px] text-gray-700">
                        <p className="font-medium text-gray-800 mb-0.5">From my database (saved + RAG from added links):</p>
                        {databaseQueryLoading ? (
                          <p className="text-gray-500">Searching RAG...</p>
                        ) : databaseQueryResults && databaseQueryResults.length > 0 ? (
                          <ul className="space-y-0.5 max-h-24 overflow-y-auto">
                            {databaseQueryResults.map((r, i) => (
                              <li key={i} className="flex flex-col gap-0">
                                {r.type === 'tag' && <span className="text-teal-700">Tag: {r.text}</span>}
                                {r.type === 'insight' && <span className="text-gray-700">{r.text}</span>}
                                {r.type === 'qa' && <span>Q: {r.text}<br className="block" />A: {r.extra}</span>}
                                {r.type === 'rag' && (
                                  <span className="text-teal-700">
                                    From RAG: {r.text}
                                    {(r.text.includes('发条消息') || r.showMessageToTa) && databaseLastQuery.trim() && (
                                      <span className="block mt-1">
                                        <button
                                          type="button"
                                          onClick={() => { setSendMessageDraft(databaseLastQuery); setShowSendMessageModal(true) }}
                                          disabled={sendToEvelynFeedback === 'sending'}
                                          className="text-teal-600 hover:text-teal-700 font-medium text-[10px] underline disabled:opacity-50"
                                        >
                                          发消息给 TA
                                        </button>
                                        {sendToEvelynFeedback === 'sending' && <span className="text-[10px] text-gray-500 ml-1">发送中…</span>}
                                        {sendToEvelynFeedback === 'sent' && <span className="text-[10px] text-green-600 ml-1">已发送 ✓</span>}
                                        {sendToEvelynFeedback === 'error' && <span className="text-[10px] text-red-600 ml-1">发送失败</span>}
                                      </span>
                                    )}
                                    {(r.askUser || /没有找到|建议您补充|建议.*补充|建议.*完善/.test(r.text)) && !r.showMessageToTa && (
                                      <span className="block mt-1">
                                        <button
                                          type="button"
                                          onClick={() => router.push('/user-info')}
                                          className="text-teal-600 hover:text-teal-700 font-medium text-[10px] underline disabled:opacity-50"
                                        >
                                          去个人资料补充
                                        </button>
                                      </span>
                                    )}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="space-y-1">
                            <p className="text-gray-500">No matches.</p>
                            {databaseQueryRagError === 'unavailable' && (
                              <div className="space-y-1">
                                <p className="text-[10px] text-amber-700 bg-amber-50 px-1 py-0.5 rounded">RAG 服务未配置或未启动。请添加 .env.local 中 RAG_API_URL=http://localhost:8000，并双击 start-rag.bat 启动（详见 docs/RAG_START.md）。</p>
                                <button type="button" onClick={checkRagStatus} disabled={ragStatusChecking} className="text-[10px] text-teal-600 hover:underline disabled:opacity-50">检查 RAG 状态</button>
                                {ragStatusCheck && (
                                  <div className={`text-[10px] px-1 py-0.5 rounded space-y-0.5 ${ragStatusCheck.reachable ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50'}`}>
                                    <p>
                                      {ragStatusCheck.reachable
                                        ? (ragStatusCheck.processedCount !== undefined
                                          ? (ragStatusCheck.processedCount === 0
                                            ? 'RAG 服务正常，但索引为空。请先在「增加数据库」粘贴文本或上传文档。'
                                            : `RAG 服务正常，索引中有 ${ragStatusCheck.processedCount} 篇文档。`)
                                          : 'RAG 服务正常')
                                        : (ragStatusCheck.hint || ragStatusCheck.error)}
                                    </p>
                                    {ragStatusCheck.reachable && ragStatusCheck.testQuery != null && (
                                      <p className="text-gray-600">
                                        测试「{ragStatusCheck.testQuery}」返回: {ragStatusCheck.testAnswer === '' ? '(空)' : (ragStatusCheck.testAnswer || '(无)')}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            {databaseQueryRagError === 'empty' && (
                              <div className="space-y-1">
                                <p className="text-[10px] text-amber-700 bg-amber-50 px-1 py-0.5 rounded">RAG 未返回结果。请先点「检查 RAG 状态」：若显示<strong>索引为空</strong>，需在「增加数据库」里<strong>粘贴文本</strong>或<strong>上传 Word/PDF</strong>添加内容；若显示索引中有文档但仍无结果，可换一种问法再试。</p>
                                <button type="button" onClick={checkRagStatus} disabled={ragStatusChecking} className="text-[10px] text-teal-600 hover:underline disabled:opacity-50">检查 RAG 状态</button>
                                {ragStatusCheck && (
                                  <div className={`text-[10px] px-1 py-0.5 rounded space-y-0.5 ${ragStatusCheck.reachable ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50'}`}>
                                    <p>
                                      {ragStatusCheck.reachable
                                        ? (ragStatusCheck.processedCount !== undefined
                                          ? (ragStatusCheck.processedCount === 0
                                            ? 'RAG 服务正常，但索引为空。请先在「增加数据库」粘贴文本或上传文档。'
                                            : `RAG 服务正常，索引中有 ${ragStatusCheck.processedCount} 篇文档。`)
                                          : 'RAG 服务正常')
                                        : (ragStatusCheck.hint || ragStatusCheck.error)}
                                    </p>
                                    {ragStatusCheck.reachable && ragStatusCheck.testQuery != null && (
                                      <p className="text-gray-600">
                                        测试「{ragStatusCheck.testQuery}」返回: {ragStatusCheck.testAnswer === '' ? '(空)' : (ragStatusCheck.testAnswer || '(无)')}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            <p className="text-gray-700 break-words">&quot;{databaseLastQuery}&quot;</p>
                            <button
                              type="button"
                              onClick={handleSendToEvelyn}
                              disabled={sendToEvelynFeedback === 'sending'}
                              className="text-teal-600 hover:text-teal-700 font-medium text-[10px] underline disabled:opacity-50"
                            >
                              Send to {session?.user?.name || 'me'}
                            </button>
                            {sendToEvelynFeedback === 'sending' && <p className="text-[10px] text-gray-500">Sending...</p>}
                            {sendToEvelynFeedback === 'sent' && <p className="text-[10px] text-green-600 font-medium">Sent to {session?.user?.name || 'me'} ✓</p>}
                            {sendToEvelynFeedback === 'error' && <p className="text-[10px] text-red-600">Failed to send. Try again.</p>}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                {/* How to engage me：Online / Offline */}
                <div className="mt-2 pt-2 border-t border-white/40 space-y-1">
                  <p className="text-[10px] text-gray-500 mb-1">How to engage me</p>
                  <div className="space-y-1">
                    <div>
                      <p className="text-[10px] text-gray-500 mb-0.5">Online</p>
                      <input
                        type="text"
                        placeholder="e.g. message me, video call, community chat"
                        value={howToEngageMeOnline}
                        onChange={(e) => setHowToEngageMeOnline(e.target.value)}
                        onBlur={() => saveProfileDataToDb(getProfileDataFromState({ howToEngageMeOnline }))}
                        className="w-full px-2 py-1 text-[10px] bg-white/90 border border-white/80 rounded placeholder-gray-400 text-gray-800"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 mb-0.5">Offline</p>
                      <input
                        type="text"
                        placeholder="e.g. coffee chat, meetup, co-shoot"
                        value={howToEngageMeOffline}
                        onChange={(e) => setHowToEngageMeOffline(e.target.value)}
                        onBlur={() => saveProfileDataToDb(getProfileDataFromState({ howToEngageMeOffline }))}
                        className="w-full px-2 py-1 text-[10px] bg-white/90 border border-white/80 rounded placeholder-gray-400 text-gray-800"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="flex flex-col items-center w-full px-4 pt-2 pb-4 shrink-0 border-t border-white/50">
              <a
                href={typeof window !== 'undefined' && userInfo?.id ? `${window.location.origin}/u/${getSharePath(userInfo?.profileSlug, userInfo?.name, userInfo?.id)}` : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-4 w-full max-w-[200px] py-2.5 rounded-xl bg-white font-medium text-gray-800 text-center text-sm shadow transition-colors ${userInfo?.id ? 'hover:bg-gray-50' : 'pointer-events-none opacity-70'}`}
              >
                join {userInfo?.profileSlug || userInfo?.name || 'me'} on nexus
              </a>
            </div>
          </div>
        </aside>
      </div>

      <FirstTimeSetupModal isOpen={showFirstTimeModal} onClose={handleFirstTimeSetupComplete} />

      {/* Describe myself in one sentence 编辑弹窗：右上角三点打开 */}
      {showOneSentenceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowOneSentenceModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-gray-900 mb-3">Describe myself in one sentence</h3>
            <textarea
              placeholder="Describe myself in one sentence"
              value={oneSentenceDesc}
              onChange={(e) => setOneSentenceDesc(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none min-h-[80px] focus:ring-2 focus:ring-teal-500"
              rows={3}
            />
            <div className="flex gap-2 justify-end mt-4">
              <button
                type="button"
                onClick={() => setShowOneSentenceModal(false)}
                className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => {
                  try {
                    saveProfileDataToDb(getProfileDataFromState({ oneSentenceDesc }))
                  } catch {}
                  setShowOneSentenceModal(false)
                }}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 消息层：别人发给我的问题（收件箱） */}
      {showMessagesModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowMessagesModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Messages</h3>
              <button
                type="button"
                onClick={() => setShowMessagesModal(false)}
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3">
              {profileMessages.length === 0 ? (
                <p className="text-sm text-gray-500">No messages yet. Others can send you questions via &quot;Send to {session?.user?.name || 'me'}&quot; on your profile.</p>
              ) : (
                profileMessages.map((m) => (
                  <div key={m.id} className="p-3 rounded-lg bg-gray-50 border border-gray-100 text-sm">
                    <p className="text-gray-800 break-words">&quot;{m.text}&quot;</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {m.from?.name || 'Someone'} · {new Date(m.createdAt).toLocaleString()}
                    </p>
                    <p className="mt-1.5 text-xs text-gray-500">You can answer it and add to the Q&A part.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setQaList(prev => [{ question: m.text, answer: '', showInPreview: false, saveToDb: false }, ...prev])
                        setShowMessagesModal(false)
                        setShowQAModal(true)
                      }}
                      className="mt-2 text-xs font-medium text-teal-600 hover:text-teal-700 underline"
                    >
                      Answer & add to Q&A
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 潜在合作：看过的 profile 及收到的 Engage 申请 */}
      {showPotentialConnectionModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowPotentialConnectionModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">潜在合作</h3>
              <button
                type="button"
                onClick={() => setShowPotentialConnectionModal(false)}
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3">
              {viewedPotentialConnections.length === 0 ? (
                <p className="text-sm text-gray-500">暂无。你看过的合作提示和别人发给你的 Engage 申请会显示在这里。</p>
              ) : (
                viewedPotentialConnections.map((v) => {
                  const linkUserId = /^[a-zA-Z0-9_-]+$/.test(v.targetUserId) ? v.targetUserId : v.targetUserId
                  return (
                    <a
                      key={v.targetUserId}
                      href={`/u/${linkUserId}`}
                      className="flex flex-col gap-1.5 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-gray-900">
                          {v.source === 'engage' ? 'Applicant' : 'TA'}：{v.targetName || 'Anonymous'}
                        </p>
                        <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                      </div>
                      {v.source === 'engage' && (
                        <p className="text-[10px] text-teal-600 font-medium">New engage request</p>
                      )}
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>{v.hint}</p>
                        {v.possibleTopics && v.possibleTopics.length > 0 && (
                          <p className="text-[10px] text-gray-500">
                            可能话题：{v.possibleTopics.slice(0, 3).join(' · ')}
                          </p>
                        )}
                      </div>
                    </a>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 我的收藏 */}
      {showFavoritesModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowFavoritesModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">我的收藏</h3>
              <button
                type="button"
                onClick={() => setShowFavoritesModal(false)}
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-3">
              {favoriteProfiles.length === 0 ? (
                <p className="text-sm text-gray-500">暂无收藏。在公开页点击「收藏」可添加名片到收藏。</p>
              ) : (
                favoriteProfiles.map((f) => {
                  const linkUserId = (f.profileSlug && /^[a-zA-Z0-9_-]+$/.test(f.profileSlug)) ? f.profileSlug : f.userId
                  return (
                    <a
                      key={f.userId}
                      href={`/u/${linkUserId}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:bg-gray-100 transition-colors"
                    >
                      {f.avatar ? (
                        <img src={resolveImageUrl(f.avatar)} alt="" className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-600 font-bold text-lg">
                          {f.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{f.name || 'Anonymous'}</p>
                        {f.oneSentenceDesc && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{f.oneSentenceDesc}</p>
                        )}
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
                    </a>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* 发消息给 TA 弹窗：内容预填用户输入，可编辑后点 Send */}
      {showSendMessageModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => !sendToEvelynFeedback && setShowSendMessageModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">发消息给 TA</h3>
              <button
                type="button"
                onClick={() => !sendToEvelynFeedback && (setShowSendMessageModal(false), setSendMessageDraft(''))}
                disabled={sendToEvelynFeedback === 'sending'}
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                aria-label="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              value={sendMessageDraft}
              onChange={(e) => setSendMessageDraft(e.target.value)}
              placeholder="输入你想问 TA 的内容…"
              className="w-full min-h-[100px] px-3 py-2 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400/50 focus:border-teal-400 resize-none"
              maxLength={2000}
              disabled={sendToEvelynFeedback === 'sending'}
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => !sendToEvelynFeedback && (setShowSendMessageModal(false), setSendMessageDraft(''))}
                disabled={sendToEvelynFeedback === 'sending'}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleSendMessageFromModal}
                disabled={!sendMessageDraft.trim() || sendToEvelynFeedback === 'sending'}
                className="px-4 py-1.5 text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 rounded-lg disabled:opacity-50 disabled:pointer-events-none"
              >
                {sendToEvelynFeedback === 'sending' ? '发送中…' : sendToEvelynFeedback === 'sent' ? '已发送 ✓' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 右上角三点 → Project：已发布的项目列表 */}
      {showProjectsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowProjectsModal(false)}>
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
              <h3 className="font-semibold text-gray-900">Project</h3>
              <button type="button" onClick={() => setShowProjectsModal(false)} className="p-1 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Close">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">已发布到 Plaza 的项目</p>
            <div className="flex-1 overflow-y-auto p-4">
              {projectsList.filter((p) => p.showOnPlaza && p.visibility !== 'hidden').length === 0 ? (
                <p className="text-sm text-gray-500">暂无已发布项目。在 Activity 中将项目设为 Plaza 即可发布。</p>
              ) : (
                <ul className="space-y-2">
                  {projectsList
                    .filter((p) => p.showOnPlaza && p.visibility !== 'hidden')
                    .map((proj, i) => (
                      <li key={proj.createdAt ?? i}>
                        <Link
                          href={userInfo?.id ? `/u/${userInfo.id}/project/${proj.createdAt ?? ''}` : '#'}
                          className="block p-3 rounded-lg border border-gray-200 hover:border-teal-300 hover:bg-teal-50/50 transition-colors"
                          onClick={() => setShowProjectsModal(false)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-800">{proj.text}</span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-teal-100 text-teal-700 border border-teal-200">
                              {(proj.stage ?? '').trim() || 'Idea'}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">点击查看项目详情</p>
                        </Link>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 增加数据库：Word / LinkedIn / 个人网页 / Notion / PDF / Google Doc 等 */}
      {showDatabaseSourcesModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowDatabaseSourcesModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
              <h3 className="font-semibold text-gray-900">增加数据库 / Add to database</h3>
              <button
                type="button"
                onClick={() => setShowDatabaseSourcesModal(false)}
                className="p-1 rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="px-4 pb-3 text-xs text-gray-500 border-b border-gray-100">
              可粘贴文本、上传 Word/PDF 文档、或添加链接；别人在「Query my database」查询时可见。
            </p>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {databaseSources.length === 0 ? (
                <p className="text-sm text-gray-500">暂无数据源，下方添加。</p>
              ) : (
                <ul className="space-y-2">
                  {databaseSources.map((ds) => {
                    const typeLabel = DATABASE_SOURCE_TYPES.find((t) => t.id === ds.type)?.label || ds.type
                    return (
                      <li key={ds.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border border-gray-100 text-sm">
                        <span className="shrink-0 text-teal-600 font-medium">{typeLabel}</span>
                        {(ds.type === 'word' || ds.type === 'pdf') ? (
                          <span className="flex-1 min-w-0 truncate text-gray-700" title={ds.url}>{ds.url}</span>
                        ) : (
                          <a href={ds.url} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-0 truncate text-gray-700 hover:underline" title={ds.url}>
                            {ds.url}
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const next = databaseSources.filter((x) => x.id !== ds.id)
                            setDatabaseSources(next)
                            try {
                              saveProfileDataToDb(getProfileDataFromState({ databaseSources: next }))
                            } catch {}
                          }}
                          className="shrink-0 p-1 text-red-500 hover:bg-red-50 rounded"
                          aria-label="删除"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
              <div className="pt-2 border-t border-gray-100 space-y-4">
                <div className="p-3 border-2 border-teal-200 bg-teal-50/60 rounded-lg">
                  <p className="text-sm font-semibold text-teal-800 mb-1">粘贴文本添加</p>
                  <p className="text-xs text-gray-600 mb-2">LinkedIn 等链接常无法抓取，请复制简介/经历粘贴到下方，点「添加文本到数据库」即可。</p>
                  <textarea
                    value={newDatabaseSourceText}
                    onChange={(e) => setNewDatabaseSourceText(e.target.value)}
                    placeholder="粘贴 LinkedIn 个人简介、经历等..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 min-h-[100px]"
                    rows={4}
                  />
                  <button
                    type="button"
                    disabled={!newDatabaseSourceText.trim() || databaseSourceTextAdding}
                    onClick={async () => {
                      const text = newDatabaseSourceText.trim()
                      if (!text) return
                      setDatabaseSourceTextAdding(true)
                      setDatabaseSourceTextAddResult(null)
                      setDatabaseSourceTextAddError('')
                      try {
                        const res = await fetch('/api/rag/index', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({ text })
                        })
                        const data = await res.json().catch(() => ({}))
                        if (res.ok) {
                          setNewDatabaseSourceText('')
                          setDatabaseSourceTextAddResult('success')
                          if (data?.savedToProfile && data?.ragUnavailable) {
                            setDatabaseSourceTextAddError(data?.message || '文本已保存。请先点「初始化 RAG 表」，再点「同步到 RAG」即可入库。')
                            setPendingRagCount((c) => c + 1)
                          } else {
                            setDatabaseSourceTextAddError('')
                          }
                          setTimeout(() => { setDatabaseSourceTextAddResult(null); setDatabaseSourceTextAddError('') }, 6000)
                        } else {
                          setDatabaseSourceTextAddResult('error')
                          setDatabaseSourceTextAddError(typeof data?.error === 'string' ? data.error : '请确认 RAG 服务已启动（start-rag.bat）')
                          setTimeout(() => { setDatabaseSourceTextAddResult(null); setDatabaseSourceTextAddError('') }, 6000)
                        }
                      } catch (err) {
                        setDatabaseSourceTextAddResult('error')
                        setDatabaseSourceTextAddError(err instanceof Error ? err.message : '请确认 RAG 服务已启动（start-rag.bat）')
                        setTimeout(() => { setDatabaseSourceTextAddResult(null); setDatabaseSourceTextAddError('') }, 6000)
                      }
                      setDatabaseSourceTextAdding(false)
                    }}
                    className="mt-2 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {databaseSourceTextAdding ? '添加中...' : '添加文本到数据库'}
                  </button>
                  {databaseSourceTextAddResult === 'success' && (
                    <p className="mt-2 text-xs text-green-600 font-medium">
                      {databaseSourceTextAddError ? databaseSourceTextAddError : '已添加到 RAG 索引，可在「Query my database」中查询。'}
                    </p>
                  )}
                  {databaseSourceTextAddResult === 'error' && (
                    <p className="mt-2 text-xs text-red-600">
                      添加失败。{databaseSourceTextAddError || '请确认 RAG 服务已启动（start-rag.bat）。'}
                    </p>
                  )}
                  {(pendingRagCount > 0 || ragInitMessage) && (
                    <div className="mt-3 p-2 rounded-lg bg-amber-50 border border-amber-200">
                      {pendingRagCount > 0 && (
                        <p className="text-xs text-amber-800 font-medium">已保存待同步：{pendingRagCount} 条</p>
                      )}
                      {ragInitMessage && (
                        <p className={`text-[11px] mt-0.5 ${ragInitMessage.includes('失败') ? 'text-red-600' : 'text-green-700'}`}>
                          {ragInitMessage}
                        </p>
                      )}
                      <p className="text-[11px] text-amber-700 mt-0.5">首次使用请先点「初始化 RAG 表」，再点「同步到 RAG」即可一键入库。</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={ragInitPending || ragSyncPending}
                          onClick={async () => {
                            setRagInitMessage(null)
                            setRagInitPending(true)
                            try {
                              const res = await fetch('/api/rag/init', { method: 'POST', credentials: 'include' })
                              const data = await res.json().catch(() => ({}))
                              if (res.ok && data.ok) {
                                setRagInitMessage(data.message || 'RAG 表已就绪')
                                setTimeout(() => setRagInitMessage(null), 5000)
                              } else {
                                setRagInitMessage((data.hint || data.error || '初始化失败'))
                              }
                            } catch {
                              setRagInitMessage('初始化请求失败')
                            } finally {
                              setRagInitPending(false)
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-100 border border-teal-300 rounded-lg hover:bg-teal-200 disabled:opacity-50"
                        >
                          {ragInitPending ? '初始化中...' : '初始化 RAG 表'}
                        </button>
                        <button
                          type="button"
                          disabled={ragSyncPending || ragInitPending}
                          onClick={async () => {
                            setRagSyncPending(true)
                            try {
                              const res = await fetch('/api/rag/sync-pending', { method: 'POST', credentials: 'include' })
                              const data = await res.json().catch(() => ({}))
                              if (res.ok && data.synced !== undefined) {
                                setPendingRagCount(data.remaining ?? 0)
                                loadUserData()
                                if (data.message) {
                                  setDatabaseSourceTextAddResult('success')
                                  setDatabaseSourceTextAddError(data.message)
                                  setTimeout(() => { setDatabaseSourceTextAddResult(null); setDatabaseSourceTextAddError('') }, 5000)
                                }
                                // 同步后刷新 RAG 状态，便于看到「索引中有 X 篇文档」更新
                                try {
                                  const statusRes = await fetch('/api/rag/status', { credentials: 'include' })
                                  const statusData = await statusRes.json().catch(() => ({}))
                                  if (typeof statusData.processedCount === 'number') {
                                    setRagStatusCheck((prev) => (prev ? { ...prev, processedCount: statusData.processedCount } : null))
                                  }
                                } catch (_) {}
                              } else {
                                setDatabaseSourceTextAddResult('error')
                                setDatabaseSourceTextAddError(data?.error || data?.message || '同步失败')
                                setTimeout(() => { setDatabaseSourceTextAddResult(null); setDatabaseSourceTextAddError('') }, 5000)
                              }
                            } catch {
                              setDatabaseSourceTextAddResult('error')
                              setDatabaseSourceTextAddError('同步请求失败')
                              setTimeout(() => { setDatabaseSourceTextAddResult(null); setDatabaseSourceTextAddError('') }, 5000)
                            } finally {
                              setRagSyncPending(false)
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-100 border border-amber-300 rounded-lg hover:bg-amber-200 disabled:opacity-50"
                        >
                          {ragSyncPending ? '同步中...' : '同步到 RAG'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-2">添加链接或文档</p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <select
                      value={newDatabaseSourceType}
                      onChange={(e) => {
                        setNewDatabaseSourceType(e.target.value)
                        setNewDatabaseSourceFile(null)
                        setNewDatabaseSourceUrl('')
                        setDatabaseSourceFileAddResult(null)
                      }}
                      className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                    >
                      {DATABASE_SOURCE_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>{t.label}</option>
                      ))}
                    </select>
                    {(newDatabaseSourceType === 'word' || newDatabaseSourceType === 'pdf') ? (
                      <>
                        <label className="flex-1 min-w-[180px] px-2 py-1.5 text-sm border border-gray-300 rounded-lg bg-white cursor-pointer hover:bg-gray-50">
                          <span className="text-gray-600">{newDatabaseSourceFile ? newDatabaseSourceFile.name : (newDatabaseSourceType === 'word' ? '选择 Word 文档 (.docx/.doc)' : '选择 PDF 文件')}</span>
                          <input
                            type="file"
                            accept={newDatabaseSourceType === 'word' ? '.docx,.doc' : '.pdf'}
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0]
                              setNewDatabaseSourceFile(f || null)
                              setDatabaseSourceFileAddResult(null)
                            }}
                          />
                        </label>
                        <button
                          type="button"
                          disabled={!newDatabaseSourceFile || databaseSourceFileAdding}
                          onClick={async () => {
                            if (!newDatabaseSourceFile) return
                            setDatabaseSourceFileAdding(true)
                            setDatabaseSourceFileAddResult(null)
                            try {
                              const form = new FormData()
                              form.append('file', newDatabaseSourceFile)
                              const res = await fetch('/api/rag/index-file', {
                                method: 'POST',
                                credentials: 'include',
                                body: form
                              })
                              if (res.ok) {
                                const next = [...databaseSources, {
                                  id: `ds-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                                  type: newDatabaseSourceType,
                                  url: newDatabaseSourceFile.name,
                                  title: undefined as string | undefined
                                }]
                                setDatabaseSources(next)
                                setNewDatabaseSourceFile(null)
                                setDatabaseSourceFileAddResult('success')
                                setTimeout(() => setDatabaseSourceFileAddResult(null), 4000)
                                try {
                                  saveProfileDataToDb(getProfileDataFromState({ databaseSources: next }))
                                } catch {}
                              } else {
                                setDatabaseSourceFileAddResult('error')
                                setTimeout(() => setDatabaseSourceFileAddResult(null), 4000)
                              }
                            } catch {
                              setDatabaseSourceFileAddResult('error')
                              setTimeout(() => setDatabaseSourceFileAddResult(null), 4000)
                            }
                            setDatabaseSourceFileAdding(false)
                          }}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {databaseSourceFileAdding ? '上传中...' : '添加文档到数据库'}
                        </button>
                        {databaseSourceFileAddResult === 'success' && (
                          <p className="text-xs text-green-600 font-medium">已添加到 RAG 索引</p>
                        )}
                        {databaseSourceFileAddResult === 'error' && (
                          <p className="text-xs text-red-600">上传失败，请确认 RAG 服务已启动</p>
                        )}
                      </>
                    ) : (
                      <>
                        <input
                          type="url"
                          placeholder="https://..."
                          value={newDatabaseSourceUrl}
                          onChange={(e) => setNewDatabaseSourceUrl(e.target.value)}
                          className="flex-1 min-w-[200px] px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const url = newDatabaseSourceUrl.trim()
                            if (!url) return
                            const newItem = {
                              id: `ds-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                              type: newDatabaseSourceType,
                              url,
                              title: undefined as string | undefined
                            }
                            const next = [...databaseSources, newItem]
                            setDatabaseSources(next)
                            setNewDatabaseSourceUrl('')
                            try {
                              saveProfileDataToDb(getProfileDataFromState({ databaseSources: next }))
                            } catch {}
                            try {
                              await fetch('/api/rag/index-url', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ url })
                              })
                            } catch { /* RAG service optional */ }
                          }}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700"
                        >
                          添加
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 感兴趣的话题 · Q&A 编辑弹窗：右上角三点 → 感兴趣的话题 打开 */}
      {showQAModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowQAModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center px-4 py-3 border-b border-gray-100 shrink-0">
              <button type="button" onClick={() => setShowQAModal(false)} className="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 -ml-10">
                {session?.user?.name || '我'} 感兴趣的话题 · Q&A{qaList.length > 0 ? ` (${qaList.length} 条)` : ''}
              </h2>
              <button type="button" onClick={() => setShowQAModal(false)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="px-4 pb-2 text-xs text-gray-500 border-b border-gray-100">
              不填写将不会公开展示。显示：在卡片展示；存入数据库：别人将可对此提问。
            </p>
            <div className="flex-1 overflow-y-auto p-4">
              {qaList.length === 0 && !showAddQA ? (
                <div className="py-6 flex flex-col items-center gap-3">
                  <p className="text-sm text-gray-500 text-center">暂无 Q&A，可根据身份生成或手动添加</p>
                  <button
                    type="button"
                    onClick={generateQAFromIdentity}
                    disabled={isGeneratingQA}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-60"
                  >
                    <Lightbulb className="w-4 h-4" />
                    {isGeneratingQA ? '生成中...' : '根据身份生成问题'}
                  </button>
                </div>
              ) : (
                <ul className="divide-y divide-gray-100 space-y-3">
                  {qaList.map((item, i) => (
                    <li key={i} className="pt-3 group flex flex-col gap-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium text-teal-700 flex-1 min-w-0">Q: {item.question || '(无问题)'}</p>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleToggleQAShowInPreview(i)}
                            title={item.showInPreview === true ? '在卡片显示（点击隐藏）' : '选到卡片显示'}
                            className={`p-1.5 rounded-lg transition-colors ${item.showInPreview === true ? 'text-teal-600 bg-teal-50' : 'text-gray-400 bg-gray-100'}`}
                          >
                            {item.showInPreview === true ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleQASaveToDb(i)}
                            title="是否存入数据库 别人将会对此提问"
                            className={`p-1.5 rounded-lg transition-colors ${item.saveToDb === true ? 'text-teal-600 bg-teal-50' : 'text-gray-400 bg-gray-100'}`}
                          >
                            <Database className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] text-gray-500">回答</label>
                        <div className="flex gap-2 items-end">
                          <textarea
                            placeholder="填写你的回答..."
                            value={item.answer}
                            onChange={(e) => handleUpdateQAAnswer(i, e.target.value)}
                            className="flex-1 min-w-0 px-3 py-2 text-xs border border-gray-300 rounded-lg resize-none min-h-[60px] focus:ring-2 focus:ring-teal-500"
                            rows={2}
                          />
                          <button
                            type="button"
                            onClick={() => handleSendQAAnswer(i)}
                            disabled={!item.answer?.trim() || sendingQAIndex === i}
                            title="发送并生成 tag / insight"
                            className="shrink-0 p-2 rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                        {generatedToast?.index === i && (
                          <p className="text-xs text-teal-600 bg-teal-50 rounded-lg px-2.5 py-1.5">{generatedToast.message}</p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveQA(i)}
                        className="self-end flex items-center gap-1 text-gray-400 hover:text-red-500 text-xs"
                        aria-label="删除"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        删除
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {showAddQA ? (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-2 bg-gray-50 rounded-lg p-3">
                  <input
                    type="text"
                    placeholder="问题"
                    value={newQAQuestion}
                    onChange={(e) => setNewQAQuestion(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                  <input
                    type="text"
                    placeholder="回答"
                    value={newQAAnswer}
                    onChange={(e) => setNewQAAnswer(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                  <div className="flex gap-2">
                    <button type="button" onClick={handleAddQA} className="px-3 py-1.5 bg-teal-600 text-white text-sm rounded-lg">保存</button>
                    <button type="button" onClick={() => { setShowAddQA(false); setNewQAQuestion(''); setNewQAAnswer('') }} className="px-3 py-1.5 text-gray-600 text-sm rounded-lg">取消</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1 mt-4 pt-4 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={generateQAFromIdentity}
                    disabled={isGeneratingQA}
                    className="w-full px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg flex items-center justify-center gap-1.5"
                  >
                    <Lightbulb className="w-4 h-4" />
                    {isGeneratingQA ? '生成中...' : '根据身份再生成一批'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddQA(true)}
                    className="w-full px-4 py-2.5 text-sm text-teal-600 hover:bg-teal-50 rounded-lg flex items-center justify-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    添加 Q&A
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add social icon 弹窗：Social media 的 + 打开，仅标题 + 搜索 + 平台列表，选后加到 socialLinks */}
      {showAddSocialIcon && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => { setShowAddSocialIcon(false); setSocialSearch('') }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center px-4 py-3 border-b border-gray-100">
              <button
                type="button"
                onClick={() => { setShowAddSocialIcon(false); setSocialSearch('') }}
                className="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 -ml-10">Add social icon</h2>
              <button
                type="button"
                onClick={() => { setShowAddSocialIcon(false); setSocialSearch('') }}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-100 rounded-xl">
                <Search className="w-4 h-4 text-gray-500 shrink-0" />
                <input
                  type="text"
                  placeholder="Search"
                  value={socialSearch}
                  onChange={(e) => setSocialSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-500 outline-none min-w-0"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0">
              {(() => {
                const q = socialSearch.trim().toLowerCase()
                const list = q
                  ? ALL_SOCIAL_PLATFORMS.filter((p) => p.label.toLowerCase().includes(q))
                  : ALL_SOCIAL_PLATFORMS
                if (list.length === 0) {
                  return <div className="px-4 py-12 text-center text-sm text-gray-500">No matching platforms</div>
                }
                return (
                  <ul>
                    {list.map(({ key, label, Icon, iconImage }) => (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddSocialIcon(false)
                            setSocialSearch('')
                            openSocialEdit(key, false)
                          }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                        >
                          {iconImage ? (
                            <img src={iconImage} alt={label} className="w-8 h-8 object-contain shrink-0 rounded" />
                          ) : (
                            <span className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
                              <Icon className="w-4 h-4 text-gray-600" />
                            </span>
                          )}
                          <span className="flex-1 text-sm font-medium text-gray-900">{label}</span>
                          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Add 弹窗：Linktree 风格，左侧分类 + 右侧 Suggested 列表（仅 Add Link 打开，加到 Links） */}
      {showAddSocialList && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => { setShowAddSocialList(false); setSocialSearch(''); setLinkPreviewDraft(null) }}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {addModalTarget === 'social' ? 'Add to Social media' : 'Links · 输入链接自动抓取'}
              </h2>
              <button
                type="button"
                onClick={() => { setShowAddSocialList(false); setSocialSearch(''); setLinkPreviewDraft(null) }}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 px-3 py-2.5 bg-gray-100 rounded-xl min-w-0">
                  <Search className="w-4 h-4 text-gray-500 shrink-0" />
                  <input
                    type="text"
                    placeholder={addModalTarget === 'links' ? '输入链接' : 'Paste or search a link'}
                    value={socialSearch}
                    onChange={(e) => setSocialSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && /^https?:\/\//i.test(socialSearch.trim())) {
                        e.preventDefault()
                        if (addModalTarget === 'links') fetchLinkPreview(socialSearch.trim())
                        else addToCustomLinks(socialSearch.trim())
                      }
                    }}
                    className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-500 outline-none min-w-0"
                  />
                </div>
                {addModalTarget === 'links' && /^https?:\/\//i.test(socialSearch.trim()) && (
                  <button
                    type="button"
                    onClick={() => fetchLinkPreview(socialSearch.trim())}
                    disabled={linkInputFetching}
                    className="shrink-0 px-3 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 disabled:opacity-50"
                  >
                    {linkInputFetching ? '抓取中...' : '抓取'}
                  </button>
                )}
                {addModalTarget !== 'links' && /^https?:\/\//i.test(socialSearch.trim()) && (
                  <button
                    type="button"
                    onClick={() => addToCustomLinks(socialSearch.trim())}
                    className="shrink-0 px-3 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 disabled:opacity-50"
                  >
                    Add to Links
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-1 min-h-0">
              {addModalTarget !== 'links' && (
                <nav className="w-40 shrink-0 py-2 border-r border-gray-100 flex flex-col gap-0.5">
                  {addModalCategories.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAddModalCategory(id)}
                      className={`flex items-center gap-2 px-3 py-2.5 text-left text-sm rounded-r-lg transition-colors ${
                        addModalCategory === id ? 'bg-teal-50 text-teal-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      {label}
                    </button>
                  ))}
                </nav>
              )}
              <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <div className="flex-1 overflow-y-auto min-h-0">
                  {addModalTarget === 'links' ? (
                    <div className="px-4 py-3">
                      {/^https?:\/\//i.test(socialSearch.trim()) ? (
                      <div className="space-y-3 rounded-xl bg-gray-50 border border-gray-100 p-4">
                        <p className="text-xs text-gray-500">点击「抓取」自动填入封面、名称、描述</p>
                        <div className="flex gap-3">
                          <input
                            type="file"
                            accept="image/*"
                            ref={linkPreviewCoverInputRef}
                            onChange={handleLinkPreviewCoverUpload}
                            className="hidden"
                          />
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => linkPreviewCoverInputRef.current?.click()}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); linkPreviewCoverInputRef.current?.click() } }}
                            className="shrink-0 w-20 h-20 rounded-lg border-2 border-dashed border-gray-300 hover:border-teal-400 cursor-pointer overflow-hidden bg-gray-100 flex items-center justify-center"
                          >
                            {linkPreviewDraft?.cover ? (
                              <img src={resolveImageUrl(linkPreviewDraft.cover)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-xs text-gray-500">{linkPreviewCoverUploading ? '上传中...' : '抓取或上传封面'}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div>
                              <label className="text-[10px] text-gray-500 block mb-0.5">名称</label>
                              <input
                                type="text"
                                value={linkPreviewDraft?.name ?? ''}
                                onChange={(e) => setLinkPreviewDraft((d) => ({ ...(d || { url: socialSearch.trim(), name: '', description: '' }), name: e.target.value }))}
                                placeholder="抓取后自动填入"
                                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 block mb-0.5">链接</label>
                              <input
                                type="url"
                                value={linkPreviewDraft?.url ?? socialSearch.trim()}
                                onChange={(e) => setLinkPreviewDraft((d) => ({ ...(d || { url: '', name: '', description: '' }), url: e.target.value }))}
                                placeholder="输入链接"
                                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg"
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-0.5">描述</label>
                          <textarea
                            value={linkPreviewDraft?.description ?? ''}
                            onChange={(e) => setLinkPreviewDraft((d) => ({ ...(d || { url: socialSearch.trim(), name: '', description: '' }), description: e.target.value }))}
                            placeholder="抓取后自动填入"
                            rows={2}
                            className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg resize-none"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={addLinkFromDraft}
                            disabled={!((linkPreviewDraft?.url || socialSearch).trim() && /^https?:\/\//i.test((linkPreviewDraft?.url || socialSearch).trim()))}
                            className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50"
                          >
                            添加
                          </button>
                          <button
                            type="button"
                            onClick={() => { setLinkPreviewDraft(null); setSocialSearch('') }}
                            className="px-4 py-2 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-100"
                          >
                            清空
                          </button>
                        </div>
                      </div>
                      ) : (
                        <p className="text-sm text-gray-500 py-6 text-center">输入链接后，下方将显示抓取表单</p>
                      )}
                    </div>
                  ) : filteredPlatforms.length === 0 ? (
                    <div className="px-4 py-12 text-center text-sm text-gray-500">No matching platforms</div>
                  ) : (
                    <ul>
                      {filteredPlatforms.map(({ key, label, Icon, iconImage, description }) => (
                        <li key={key}>
                          <button
                            type="button"
                            onClick={() => openSocialEdit(key, false)}
                            className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                          >
                            {iconImage ? (
                              <img src={iconImage} alt={label} className="w-8 h-8 object-contain shrink-0 rounded" />
                            ) : (
                              <span className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
                                <Icon className="w-4 h-4 text-gray-600" />
                              </span>
                            )}
                            <div className="flex-1 min-w-0 text-left">
                              <p className="text-sm font-medium text-gray-900 truncate">{label}</p>
                              {description && (
                                <p className="text-xs text-gray-500 truncate mt-0.5">{description}</p>
                              )}
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add project modal: choose Public/Individual first, then options */}
      {showAddActivityModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          onClick={() => { setShowAddActivityModal(false); setAddActivityDraft(''); setAddActivityInputFromModal(''); setAddActivityVisibility(null); setAddActivityNeedPeople(null); setAddActivityPeopleList([]); setAddActivityPeopleInput(''); setAddActivityEditingWhoIndex(null); setAddActivityShowOnPlaza(null) }}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Add project</h3>
              <button type="button" onClick={() => { setShowAddActivityModal(false); setAddActivityDraft(''); setAddActivityInputFromModal(''); setAddActivityVisibility(null); setAddActivityNeedPeople(null); setAddActivityPeopleList([]); setAddActivityPeopleInput(''); setAddActivityEditingWhoIndex(null); setAddActivityShowOnPlaza(null) }} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            {!addActivityDraft.trim() ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-500">Describe your project (and optionally who you&apos;re looking for):</p>
                <input
                  type="text"
                  placeholder="e.g. Building a startup, looking for a co-founder"
                  value={addActivityInputFromModal}
                  onChange={(e) => setAddActivityInputFromModal(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      const v = addActivityInputFromModal.trim()
                      if (v) { setAddActivityDraft(v); setAddActivityInputFromModal('') }
                    }
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => { const v = addActivityInputFromModal.trim(); if (v) { setAddActivityDraft(v); setAddActivityInputFromModal('') } }}
                  disabled={!addActivityInputFromModal.trim()}
                  className="w-full px-4 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Continue
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-700 mb-3">&quot;{addActivityDraft}&quot;</p>
                <div className="space-y-3">
                <p className="text-xs text-gray-500">Choose visibility and Plaza in one step</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => { const next = [...projectsList, { text: addActivityDraft, visibility: 'public' as const, showOnPlaza: true, peopleNeeded: undefined, createdAt: Date.now() }]; setProjectsList(next); saveProfileDataToDb(getProfileDataFromState({ projects: next })); setShowAddActivityModal(false); setAddActivityDraft(''); setAddActivityVisibility(null); setAddActivityShowOnPlaza(null) }} className="px-4 py-3 rounded-lg text-sm font-medium text-left bg-teal-100 text-teal-800 hover:bg-teal-200 border border-teal-200">
                    <span className="block font-medium">Public</span>
                    <span className="text-[10px] text-teal-600">Plaza</span>
                  </button>
                  <button type="button" onClick={() => { const next = [...projectsList, { text: addActivityDraft, visibility: 'public' as const, showOnPlaza: false, peopleNeeded: undefined, createdAt: Date.now() }]; setProjectsList(next); saveProfileDataToDb(getProfileDataFromState({ projects: next })); setShowAddActivityModal(false); setAddActivityDraft(''); setAddActivityVisibility(null); setAddActivityShowOnPlaza(null) }} className="px-4 py-3 rounded-lg text-sm font-medium text-left bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200">
                    <span className="block font-medium">Public</span>
                    <span className="text-[10px] text-teal-600">No Plaza</span>
                  </button>
                  <button type="button" onClick={() => { const next = [...projectsList, { text: addActivityDraft, visibility: 'individual' as const, showOnPlaza: true, createdAt: Date.now() }]; setProjectsList(next); saveProfileDataToDb(getProfileDataFromState({ projects: next })); setShowAddActivityModal(false); setAddActivityDraft(''); setAddActivityVisibility(null); setAddActivityShowOnPlaza(null) }} className="px-4 py-3 rounded-lg text-sm font-medium text-left bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200">
                    <span className="block font-medium">Individual</span>
                    <span className="text-[10px] text-gray-500">Plaza</span>
                  </button>
                  <button type="button" onClick={() => { const next = [...projectsList, { text: addActivityDraft, visibility: 'individual' as const, showOnPlaza: false, createdAt: Date.now() }]; setProjectsList(next); saveProfileDataToDb(getProfileDataFromState({ projects: next })); setShowAddActivityModal(false); setAddActivityDraft(''); setAddActivityVisibility(null); setAddActivityShowOnPlaza(null) }} className="px-4 py-3 rounded-lg text-sm font-medium text-left bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200">
                    <span className="block font-medium">Individual</span>
                    <span className="text-[10px] text-gray-500">No Plaza</span>
                  </button>
                </div>
                <p className="text-[10px] text-gray-400">You can add &quot;I&apos;m looking for&quot; by editing the activity later</p>
              </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* 添加作品简介弹窗：封面、名称、描述 */}
      {showAddWorkIntroModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          onClick={() => { setShowAddWorkIntroModal(false); setEditingWorkIntroId(null) }}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">
                {editingWorkIntroId ? (workIntroModalMode === 'image' ? 'Edit image' : 'Edit work') : (workIntroModalMode === 'image' ? 'Add image' : 'Add work intro')}
              </h3>
              <button
                type="button"
                onClick={() => { setShowAddWorkIntroModal(false); setEditingWorkIntroId(null) }}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100"
                aria-label="关闭"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {workIntroModalMode === 'link' && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">链接（先填链接，点「抓取」自动填写封面、名称、描述）</p>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://..."
                      value={newWorkIntroUrl}
                      onChange={(e) => setNewWorkIntroUrl(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleFetchLinkMetadata() } }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    />
                    <button
                      type="button"
                      onClick={handleFetchLinkMetadata}
                      disabled={!newWorkIntroUrl.trim() || !/^https?:\/\//i.test(newWorkIntroUrl.trim()) || fetchLinkMetadataLoading}
                      className="shrink-0 px-4 py-2 text-sm font-medium text-teal-600 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {fetchLinkMetadataLoading ? '抓取中...' : '抓取'}
                    </button>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-gray-700 mb-1.5">
                  {workIntroModalMode === 'image' ? '图片（上传）' : '封面（抓取自动填充，也可手动上传）'}
                </p>
                <label className="block w-full aspect-video max-h-40 rounded-lg border-2 border-dashed border-gray-300 hover:border-teal-400 cursor-pointer overflow-hidden bg-gray-50">
                  {newWorkIntroCover ? (
                    <img src={resolveImageUrl(newWorkIntroCover)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                      {newWorkIntroCoverUploading ? (
                        <span>上传中...</span>
                      ) : (
                        <>
                          <Camera className="w-8 h-8 mb-1" />
                          <span>点击上传封面图</span>
                        </>
                      )}
                    </div>
                  )}
                  <input
                    ref={workIntroCoverInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleWorkIntroCoverUpload}
                    disabled={newWorkIntroCoverUploading}
                  />
                </label>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-700 mb-1">名称 <span className="text-red-500">*</span></p>
                <input
                  type="text"
                  placeholder="作品名称"
                  value={newWorkIntroName}
                  onChange={(e) => setNewWorkIntroName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-700 mb-1">描述</p>
                <textarea
                  placeholder="作品简介、说明..."
                  value={newWorkIntroDesc}
                  onChange={(e) => setNewWorkIntroDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                />
              </div>
            </div>
            <div className="mt-4 flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setShowAddWorkIntroModal(false); setEditingWorkIntroId(null) }}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleAddWorkIntro}
                disabled={!newWorkIntroName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingWorkIntroId ? '保存' : '添加'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 添加经历弹窗：工作经历 + 教育经历（LinkedIn 风格） */}
      {showExperienceModal && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          onClick={() => { setShowExperienceModal(false); setEditingExpId(null); setEditingEduId(null) }}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
              <h3 className="font-semibold text-gray-900">添加经历</h3>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => { const next = !showExperienceInPreview; setShowExperienceInPreview(next); try { localStorage.setItem('profileShowExperienceInPreview', next ? '1' : '0') } catch {} }} title={showExperienceInPreview ? '在卡片显示（点击隐藏）' : '选到卡片显示'} className={`p-1.5 rounded-lg transition-colors ${showExperienceInPreview ? 'text-teal-600 bg-teal-50' : 'text-gray-400 bg-gray-100'}`}><Eye className="w-4 h-4" /></button>
                <button type="button" onClick={() => { setShowExperienceModal(false); setEditingExpId(null); setEditingEduId(null) }} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="关闭"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="flex border-b border-gray-100 shrink-0">
              <button type="button" onClick={() => { setExperienceModalTab('experience'); setEditingExpId(null); setEditingEduId(null); setExpForm({ title: '', company: '', employmentType: '', location: '', startDate: '', endDate: '', current: false, description: '' }) }} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium ${experienceModalTab === 'experience' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50' : 'text-gray-600 hover:bg-gray-50'}`}><Briefcase className="w-4 h-4" />工作经历</button>
              <button type="button" onClick={() => { setExperienceModalTab('education'); setEditingExpId(null); setEditingEduId(null); setEduForm({ school: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '', grade: '', description: '' }) }} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium ${experienceModalTab === 'education' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50' : 'text-gray-600 hover:bg-gray-50'}`}><GraduationCap className="w-4 h-4" />教育经历</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {experienceModalTab === 'experience' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">职位 *</label>
                      <input type="text" value={expForm.title} onChange={(e) => setExpForm((f) => ({ ...f, title: e.target.value }))} placeholder="如：产品经理" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">公司 *</label>
                      <input type="text" value={expForm.company} onChange={(e) => setExpForm((f) => ({ ...f, company: e.target.value }))} placeholder="如：字节跳动" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">雇佣类型</label>
                      <select value={expForm.employmentType} onChange={(e) => setExpForm((f) => ({ ...f, employmentType: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option value="">请选择</option>
                        <option value="全职">全职</option>
                        <option value="兼职">兼职</option>
                        <option value="实习">实习</option>
                        <option value="自由职业">自由职业</option>
                        <option value="合同制">合同制</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">地点</label>
                      <input type="text" value={expForm.location} onChange={(e) => setExpForm((f) => ({ ...f, location: e.target.value }))} placeholder="如：北京" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">开始日期</label>
                      <input type="text" value={expForm.startDate} onChange={(e) => setExpForm((f) => ({ ...f, startDate: e.target.value }))} placeholder="如：2020-01" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">结束日期</label>
                      <div className="flex gap-2 items-center">
                        <input type="text" value={expForm.endDate} onChange={(e) => setExpForm((f) => ({ ...f, endDate: e.target.value }))} placeholder="如：2023-06" disabled={expForm.current} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100" />
                        <label className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap"><input type="checkbox" checked={expForm.current} onChange={(e) => setExpForm((f) => ({ ...f, current: e.target.checked }))} />至今</label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">描述</label>
                    <textarea value={expForm.description} onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="工作内容、成就等" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={saveExperience} disabled={!expForm.title?.trim() || !expForm.company?.trim()} className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50">{editingExpId ? '保存' : '添加'}</button>
                    {editingExpId && <button type="button" onClick={() => removeExperience(editingExpId)} className="px-4 py-2 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50">删除</button>}
                  </div>
                  {experiences.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-700 mb-2">已添加的工作经历</p>
                      <ul className="space-y-2">
                        {experiences.map((e) => (
                          <li key={e.id} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-gray-50">
                            <div>
                              <p className="text-sm font-medium text-gray-800">{e.title} · {e.company}</p>
                              <p className="text-xs text-gray-500">{(e.startDate || e.endDate) ? `${e.startDate || '—'} - ${e.current ? '至今' : (e.endDate || '—')}` : ''}</p>
                            </div>
                            <div className="flex gap-1">
                              <button type="button" onClick={() => { setEditingExpId(e.id); setExpForm({ title: e.title, company: e.company, employmentType: e.employmentType || '', location: e.location || '', startDate: e.startDate || '', endDate: e.endDate || '', current: e.current || false, description: e.description || '' }) }} className="p-1 rounded text-gray-400 hover:text-teal-600 hover:bg-teal-50" aria-label="编辑"><Pencil className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => removeExperience(e.id)} className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50" aria-label="删除"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">学校 *</label>
                    <input type="text" value={eduForm.school} onChange={(e) => setEduForm((f) => ({ ...f, school: e.target.value }))} placeholder="如：清华大学" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">学历</label>
                      <input type="text" value={eduForm.degree} onChange={(e) => setEduForm((f) => ({ ...f, degree: e.target.value }))} placeholder="如：本科、硕士" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">专业</label>
                      <input type="text" value={eduForm.fieldOfStudy} onChange={(e) => setEduForm((f) => ({ ...f, fieldOfStudy: e.target.value }))} placeholder="如：计算机科学" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">开始日期</label>
                      <input type="text" value={eduForm.startDate} onChange={(e) => setEduForm((f) => ({ ...f, startDate: e.target.value }))} placeholder="如：2016-09" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">结束日期</label>
                      <input type="text" value={eduForm.endDate} onChange={(e) => setEduForm((f) => ({ ...f, endDate: e.target.value }))} placeholder="如：2020-06" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">成绩 / 荣誉</label>
                    <input type="text" value={eduForm.grade} onChange={(e) => setEduForm((f) => ({ ...f, grade: e.target.value }))} placeholder="如：GPA 3.8、奖学金" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">描述</label>
                    <textarea value={eduForm.description} onChange={(e) => setEduForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="活动、社团、项目等" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={saveEducation} disabled={!eduForm.school?.trim()} className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50">{editingEduId ? '保存' : '添加'}</button>
                    {editingEduId && <button type="button" onClick={() => removeEducation(editingEduId)} className="px-4 py-2 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50">删除</button>}
                  </div>
                  {education.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-700 mb-2">已添加的教育经历</p>
                      <ul className="space-y-2">
                        {education.map((e) => (
                          <li key={e.id} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-gray-50">
                            <div>
                              <p className="text-sm font-medium text-gray-800">{e.school}</p>
                              <p className="text-xs text-gray-500">{(e.degree || e.fieldOfStudy) ? [e.degree, e.fieldOfStudy].filter(Boolean).join(' · ') : ''} · {(e.startDate || e.endDate) ? `${e.startDate || '—'} - ${e.endDate || '—'}` : ''}</p>
                            </div>
                            <div className="flex gap-1">
                              <button type="button" onClick={() => { setEditingEduId(e.id); setEduForm({ school: e.school, degree: e.degree || '', fieldOfStudy: e.fieldOfStudy || '', startDate: e.startDate || '', endDate: e.endDate || '', grade: e.grade || '', description: e.description || '' }) }} className="p-1 rounded text-gray-400 hover:text-teal-600 hover:bg-teal-50" aria-label="编辑"><Pencil className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => removeEducation(e.id)} className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50" aria-label="删除"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Social / Link 链接编辑弹窗：从 Add 弹窗点平台时写入 Links，从 profile 社交图标点时写入 Social media */}
      {editingSocial && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50"
          onClick={() => { setEditingSocial(null); setSocialUrlInput(''); setEditingSocialAsLink(false) }}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-sm w-full p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold text-gray-900 mb-3">
              {editingSocialAsLink
                ? `Add ${getPlatformByKey(editingSocial)?.label ?? editingSocial} to Links`
                : `Add ${getPlatformByKey(editingSocial)?.label ?? editingSocial} link`}
            </h3>
            <input
              type="url"
              placeholder={getPlaceholder(editingSocial)}
              value={socialUrlInput}
              onChange={(e) => setSocialUrlInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => { setEditingSocial(null); setSocialUrlInput(''); setEditingSocialAsLink(false) }}
                className="px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveSocialLink}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 标签 Tags 弹窗：用户可以选择要显示在卡片上的标签 */}
      {showTagsModal && tags.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowTagsModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Tag className="w-5 h-5 text-teal-500" />
                <span className="font-semibold text-gray-900">标签 Tags</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { const next = !showTagsInPreview; setShowTagsInPreview(next); try { localStorage.setItem('profileShowTagsInPreview', next ? '1' : '0') } catch {} }}
                  title="显示"
                  className={`p-1.5 rounded-lg transition-colors ${showTagsInPreview ? 'text-teal-600 bg-teal-50' : 'text-gray-400 bg-gray-100'}`}
                >
                  {showTagsInPreview ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => { const next = !tagsSaveToDb; setTagsSaveToDb(next); try { localStorage.setItem('profileTagsSaveToDb', next ? '1' : '0') } catch {} }}
                  title="是否存入数据库 别人将会对此提问"
                  className={`p-1.5 rounded-lg transition-colors ${tagsSaveToDb ? 'text-teal-600 bg-teal-50' : 'text-gray-400 bg-gray-100'}`}
                >
                  <Database className="w-4 h-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowTagsModal(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="px-4 pt-2 pb-1 text-xs text-gray-500">
              存入数据库：别人将可对此提问。AI 从你的输入中提取了以下关键词，点击选择要显示在卡片上的标签。
            </p>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex flex-wrap gap-2">
                {tags.map((tag, i) => {
                  const isSelected = selectedTags.includes(tag)
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        isSelected
                          ? 'bg-teal-100 text-teal-700 border-2 border-teal-400'
                          : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                      }`}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-between items-center">
              <span className="text-xs text-gray-500">已选 {selectedTags.length} 个</span>
              <button
                type="button"
                onClick={() => setShowTagsModal(false)}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 洞察 Insights 弹窗：点击按钮后弹出 */}
      {showInsightsModal && insights.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          onClick={() => setShowInsightsModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                <span className="font-semibold text-gray-900">洞察 Insights</span>
              </div>
              <button
                type="button"
                onClick={() => setShowInsightsModal(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="px-4 pt-2 pb-2 text-xs text-gray-500">
              在数据库里显示 · 是否存入数据库 别人将会对此提问。点击每条可逐个选择。
            </p>
            <ul className="flex-1 overflow-y-auto p-4 space-y-2 text-sm text-gray-700">
              {insights.map((s, i) => {
                const inDb = insightsInDb.includes(s)
                return (
                  <li key={i} className="flex items-start gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const next = inDb ? insightsInDb.filter((x) => x !== s) : [...insightsInDb, s]
                        setInsightsInDb(next)
                        try {
                          saveProfileDataToDb(getProfileDataFromState({ insightsInDb: next }))
                        } catch {}
                      }}
                      title="是否存入数据库 别人将会对此提问"
                      className={`shrink-0 mt-0.5 p-1.5 rounded-lg transition-colors ${inDb ? 'text-teal-600 bg-teal-50' : 'text-gray-400 bg-gray-100 hover:bg-gray-200'}`}
                    >
                      <Database className="w-4 h-4" />
                    </button>
                    <span className="flex-1 min-w-0">{s}</span>
                    <button
                      type="button"
                      onClick={() => {
                        const nextInsights = insights.filter((_, idx) => idx !== i)
                        const nextInDb = insightsInDb.filter((x) => x !== s)
                        setInsights(nextInsights)
                        setInsightsInDb(nextInDb)
                        try {
                          saveProfileDataToDb(getProfileDataFromState({ insights: nextInsights, insightsInDb: nextInDb }))
                        } catch {}
                      }}
                      title="删除此条洞察"
                      className="shrink-0 mt-0.5 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                )
              })}
            </ul>
            <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-500">
              已选 {insightsInDb.length} 条存入数据库
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
