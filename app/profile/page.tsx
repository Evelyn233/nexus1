'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { signOut } from 'next-auth/react'
import { ArrowLeft, Calendar, LogOut, X, Share2, Lightbulb, Search, ChevronRight, ChevronDown, MoreVertical, ShoppingBag, Heart, Play, Mail, FileText, List, Link2, Tag, MessageSquare, Eye, EyeOff, Database, Trash2, Camera, Bookmark, HeartHandshake, Briefcase, GraduationCap, Pencil, LayoutGrid, Sparkles, Paperclip, ExternalLink, CornerDownLeft } from 'lucide-react'
import { ALL_SOCIAL_PLATFORMS, getPlatformByKey, getPlaceholder, SUGGESTED_PLATFORM_KEYS } from '@/lib/socialPlatforms'
import type { SocialCategory } from '@/lib/socialPlatforms'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import { ensureAbsoluteUrl } from '@/lib/ensureAbsoluteUrl'
import FirstTimeSetupModal from '@/components/FirstTimeSetupModal'
import DailyQuestionCard from '@/components/DailyQuestionCard'
import ImageCropModal, { blobToDataUrl } from '@/components/ImageCropModal'
import { ProfileModals } from '@/components/ProfileModals'
import { ProfileProjectsModal } from '@/components/ProfileProjectsModal'
import { ProfileDatabaseSourcesModal } from '@/components/ProfileDatabaseSourcesModal'
import { ProfileQAModal } from '@/components/ProfileQAModal'
import { ProfileAddSocialIconModal } from '@/components/ProfileAddSocialIconModal'
import { ProfileHeader } from '@/components/ProfileHeader'
import { ProfileFloatingActions } from '@/components/ProfileFloatingActions'
import { ProfileExperiencePreview } from '@/components/ProfileExperiencePreview'
import { ProfileEngagePreview } from '@/components/ProfileEngagePreview'
import { ProfileSocialPreview } from '@/components/ProfileSocialPreview'
import { ProfileAiSuggestionsPreview } from '@/components/ProfileAiSuggestionsPreview'
import { ProfileWorksLinksPreview } from '@/components/ProfileWorksLinksPreview'
import { ProfileProjectsPreviewSection } from '@/components/ProfileProjectsPreviewSection'
import { useProfileBasics } from '@/hooks/useProfileBasics'
import { useProfileExperience } from '@/hooks/useProfileExperience'
import { useProfileMessages } from '@/hooks/useProfileMessages'
import { useProfileRag } from '@/hooks/useProfileRag'
import type { ExperienceItem, EducationItem, PeopleNeededItem, ProjectReference, ProjectAttachment, ProjectItem } from '@/lib/profileTypes'
import { STAGE_RECOMMENDED_TAGS, getUserAddedStageOrder, inferStageFromPeopleNeeded, stageDisplayLabel } from '@/lib/profileStages'

/** [comment] */
function getSharePath(profileSlug?: string | null, name?: string | null, id?: string): string {
  if (id && /^[a-zA-Z0-9_-]+$/.test(id)) return id
  if (profileSlug && /^[a-zA-Z0-9_-]+$/.test(profileSlug)) return profileSlug
  const slugFromName = (name || '').toLowerCase().trim().replace(/\s+/g, '').replace(/[^a-z0-9_-]/g, '')
  if (slugFromName) return slugFromName
  return id || ''
}

function ProfilePageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { isAuthenticated, session, isLoading } = useAuth()
  const isProjectAccount = (session?.user as any)?.userType === 'project'
  const requireAvatar = searchParams.get('requireAvatar') === '1'
  const {
    userInfo,
    setUserInfo,
    avatarDataUrl,
    setAvatarDataUrl,
    userSay,
    setUserSay,
    tags,
    setTags,
    selectedTags,
    setSelectedTags,
    showTagsInPreview,
    setShowTagsInPreview,
    tagsSaveToDb,
    setTagsSaveToDb,
    showSocialInPreview,
    setShowSocialInPreview,
    showLinksInPreview,
    setShowLinksInPreview,
    showExperienceInPreview,
    setShowExperienceInPreview,
    showQABlockInPreview,
    setShowQABlockInPreview,
  } = useProfileBasics()
  const [isLoadingData, setIsLoadingData] = useState(true)
  // When the crop modal is open, the avatar overlay would block the crop UI, making users think "nothing changed after upload"
  const [showTagsModal, setShowTagsModal] = useState(false)
  const [insights, setInsights] = useState<string[]>([])
  const [showInsightsModal, setShowInsightsModal] = useState(false)
  const [showPotentialConnectionModal, setShowPotentialConnectionModal] = useState(false)
  const [viewedPotentialConnections, setViewedPotentialConnections] = useState<any[]>([])
  const [insightsInDb, setInsightsInDb] = useState<string[]>([])
  const [insightGenHint, setInsightGenHint] = useState<string | null>(null)
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

  const {
    experiences,
    setExperiences,
    education,
    setEducation,
    showExperienceModal,
    setShowExperienceModal,
    experienceModalTab,
    setExperienceModalTab,
    editingExpId,
    setEditingExpId,
    editingEduId,
    setEditingEduId,
    expForm,
    setExpForm,
    eduForm,
    setEduForm,
  } = useProfileExperience()

  /** [comment] */
  const DEFAULT_COLLAB_OPTIONS: { value: string; label: string }[] = [
    { value: 'guest', label: 'Guest' },
    { value: 'partner', label: 'Co-Partner' },
    { value: 'part-time', label: 'Part-Time' },
  ]
  /**  AI-recommended collaboration options (click to add as an existing tag)  */
  const RECOMMENDED_COLLAB_OPTIONS: { value: string; label: string }[] = [
    ...DEFAULT_COLLAB_OPTIONS,
    { value: 'remote', label: 'Remote' },
    { value: 'advisor', label: 'Advisor' },
    { value: 'co-founder', label: 'Co-Founder' },
  ]
  const PROJECT_ROLE_OPTIONS = [
    { value: '', label: 'Please select (required)' },
    { value: 'initiator', label: 'Initiator' },
    { value: 'co-initiator', label: 'Co-initiator' },
    { value: 'core-member', label: 'Core member' },
    { value: 'advisor', label: 'Advisor' },
    { value: 'other', label: 'Other' },
  ]
  const [projectsList, setProjectsList] = useState<ProjectItem[]>([])
  const [creatingProjectFromProfile, setCreatingProjectFromProfile] = useState(false)

  const handleCreateProjectAndGo = useCallback(async () => {
    const slug = getSharePath(userInfo?.profileSlug, userInfo?.name, userInfo?.id ?? '')
    if (!slug) return
    try {
      setCreatingProjectFromProfile(true)
      const res = await fetch('/api/project/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          initiatorRole: 'initiator',
                }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.createdAt) return
      router.push(`/u/${encodeURIComponent(slug)}/project/${data.createdAt}`)
    } finally {
      setCreatingProjectFromProfile(false)
    }
  }, [router, userInfo?.id, userInfo?.name, userInfo?.profileSlug])
  /** [comment] */
  const [profileAiSuggestions, setProfileAiSuggestions] = useState<string[]>([])
  const [profileAiSuggestionsLoading, setProfileAiSuggestionsLoading] = useState(false)
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
  const [editingSocialAsLink, setEditingSocialAsLink] = useState(false)
  // [comment]
  const [socialUrlInput, setSocialUrlInput] = useState('')
  const [showAddSocialList, setShowAddSocialList] = useState(false)
  // [comment]
  const [addModalTarget, setAddModalTarget] = useState<'social' | 'links'>('links')
  const [socialSearch, setSocialSearch] = useState('')
  const [showAddSocialIcon, setShowAddSocialIcon] = useState(false)
  const [addModalCategory, setAddModalCategory] = useState<SocialCategory | 'view_all'>('suggested')
  const [previewCardMenuOpen, setPreviewCardMenuOpen] = useState(false)
  const [shareLinkCopied, setShareLinkCopied] = useState(false)
  const previewCardMenuRef = useRef<HTMLDivElement>(null)
  const profilePhotoInputRef = useRef<HTMLInputElement>(null)
  const [avatarCropImageSrc, setAvatarCropImageSrc] = useState<string | null>(null)
  // When the avatar setup modal opens, the avatar overlay would block the crop UI,
  // making users think the upload did not work. This flag forces avatar setup.
  const forceAvatarSetup = requireAvatar && !avatarDataUrl && !avatarCropImageSrc
  const qaSectionRef = useRef<HTMLDivElement>(null)
  const oneSentenceTextareaRef = useRef<HTMLTextAreaElement>(null)
  const lastSavedDbTotalRef = useRef(0)
  const profileStateRef = useRef<Record<string, unknown>>({})
  const [showQAModal, setShowQAModal] = useState(false)
  const [oneSentenceDesc, setOneSentenceDesc] = useState('')
  const [showOneSentenceModal, setShowOneSentenceModal] = useState(false)
  const [showSendMessageModal, setShowSendMessageModal] = useState(false)
  const [showProjectsModal, setShowProjectsModal] = useState(false)
  const [showDatabaseSourcesModal, setShowDatabaseSourcesModal] = useState(false)
  const [databaseSources, setDatabaseSources] = useState<{ id: string; type: string; url: string; title?: string }[]>([])
  const [newDatabaseSourceType, setNewDatabaseSourceType] = useState('linkedin')
  const [newDatabaseSourceUrl, setNewDatabaseSourceUrl] = useState('')
  const [newDatabaseSourceText, setNewDatabaseSourceText] = useState('')
  const [newDatabaseSourceFile, setNewDatabaseSourceFile] = useState<File | null>(null)
  // [comment]
  const [databaseSourceFileAdding, setDatabaseSourceFileAdding] = useState(false)
  const [databaseSourceFileAddResult, setDatabaseSourceFileAddResult] = useState<'success' | 'error' | null>(null)
  // [comment]
  const [databaseSourceTextAdding, setDatabaseSourceTextAdding] = useState(false)
  const [databaseSourceTextAddResult, setDatabaseSourceTextAddResult] = useState<'success' | 'error' | null>(null)
  const [databaseSourceTextAddError, setDatabaseSourceTextAddError] = useState<string>('')
  const [pendingRagCount, setPendingRagCount] = useState(0)
  const [ragSyncPending, setRagSyncPending] = useState(false)
  const [ragInitPending, setRagInitPending] = useState(false)
  const [ragInitMessage, setRagInitMessage] = useState<string | null>(null)
  // Add to database: optional types (Word / LinkedIn / personal page / Notion / PDF / Google Doc / Other)
  const DATABASE_SOURCE_TYPES = [
    { id: 'word', label: 'Word document' },
    { id: 'linkedin', label: 'LinkedIn page' },
    { id: 'personal_web', label: 'Personal webpage' },
    { id: 'notion', label: 'Notion page' },
    { id: 'pdf', label: 'PDF document' },
    { id: 'google_doc', label: 'Google doc' },
    { id: 'other', label: 'Other link' },
  ]

  const qaListStorageKey = typeof userInfo?.id === 'string' ? `profileQAList_${userInfo.id}` : 'profileQAList'
  const [qaList, setQaList] = useState<{ question: string; answer: string; showInPreview?: boolean; saveToDb?: boolean }[]>([])
  const [showAddQA, setShowAddQA] = useState(false)
  const [newQAQuestion, setNewQAQuestion] = useState('')
  const [newQAAnswer, setNewQAAnswer] = useState('')
  const [isGeneratingQA, setIsGeneratingQA] = useState(false)
  const [sendingQAIndex, setSendingQAIndex] = useState<number | null>(null)
  // [comment]
  const [generatedToast, setGeneratedToast] = useState<{ message: string; index: number } | null>(null)
  const {
    askMeAnythingValue,
    setAskMeAnythingValue,
    databaseQueryResults,
    setDatabaseQueryResults,
    databaseLastQuery,
    setDatabaseLastQuery,
    databaseQueryLoading,
    databaseQueryRagError,
    handleQueryDatabaseSubmit,
  } = useProfileRag({ tags, insights, qaList, sessionName: session?.user?.name ?? undefined })
  const [ragStatusCheck, setRagStatusCheck] = useState<{ configured: boolean; reachable: boolean; processedCount?: number; testQuery?: string; testAnswer?: string; error?: string; hint?: string } | null>(null)
  const [ragStatusChecking, setRagStatusChecking] = useState(false)
  const [dbToastMessage, setDbToastMessage] = useState<string | null>(null)
  const [plazaToastMessage, setPlazaToastMessage] = useState<string | null>(null)
  const [hasNewDbAdditions, setHasNewDbAdditions] = useState(false)
  const messages = useProfileMessages({ isAuthenticated, userId: userInfo?.id })

  // Check if RAG is configured and reachable; if passed, use the last query as the test question for the status page
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
      setRagStatusCheck({ configured: false, reachable: false, error: 'Query failed', hint: 'Please check if Next.js is running' })
    } finally {
      setRagStatusChecking(false)
    }
  }, [databaseLastQuery])

  const [showFirstTimeModal, setShowFirstTimeModal] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      if (!isProjectAccount) {
        loadUserData()
      } else {
        setIsLoadingData(false)
      }
    } else {
      setIsLoadingData(false)
    }
  }, [isAuthenticated, isProjectAccount])

  useEffect(() => {
    if (!isLoading && isAuthenticated && isProjectAccount) {
      router.replace('/project')
    }
  }, [isLoading, isAuthenticated, isProjectAccount, router])

  useEffect(() => {
    profileStateRef.current = {
      tags,
      selectedTags,
      insights,
      insightsInDb,
      oneSentenceDesc: oneSentenceDesc || '',
      userSay: userSay ?? null,
      projects: projectsList,
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
    if (!previewCardMenuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (previewCardMenuRef.current && !previewCardMenuRef.current.contains(e.target as Node)) {
        setPreviewCardMenuOpen(false)
      }
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [previewCardMenuOpen])

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
                .map((x: { text?: string; visibility?: string; showOnPlaza?: boolean; peopleNeeded?: Array<string | { text?: string; detail?: string }>; detail?: string; references?: Array<{ title?: string; url?: string; cover?: string; stageTag?: string; contentTag?: string }>; detailImage?: string; attachments?: Array<{ url?: string; name?: string; addedAt?: number; stageTag?: string; contentTag?: string }>; stage?: string; stageOrder?: string[]; stageEnteredAt?: Record<string, number>; creators?: string[]; createdAt?: number; projectTypeTag?: string; openStatusLabel?: string; allowEasyApply?: boolean; whatToProvide?: string; cultureAndBenefit?: string }) => ({
                  text: String(x.text ?? '').trim(),
                  visibility: (x.visibility === 'public' ? 'public' : x.visibility === 'hidden' ? 'hidden' : 'individual') as 'individual' | 'public' | 'hidden',
                  showOnPlaza: x.showOnPlaza === true || (x.visibility === 'public' && x.showOnPlaza !== false),
                  projectTypeTag: typeof x.projectTypeTag === 'string' && x.projectTypeTag.trim() ? x.projectTypeTag.trim() : undefined,
                  openStatusLabel: typeof x.openStatusLabel === 'string' && x.openStatusLabel.trim() ? x.openStatusLabel.trim().slice(0, 48) : undefined,
                  allowEasyApply: x.allowEasyApply === true,
                  whatToProvide: typeof x.whatToProvide === 'string' && x.whatToProvide.trim() ? x.whatToProvide.trim() : undefined,
                  cultureAndBenefit: typeof (x as { cultureAndBenefit?: string }).cultureAndBenefit === 'string' && (x as { cultureAndBenefit: string }).cultureAndBenefit.trim() ? (x as { cultureAndBenefit: string }).cultureAndBenefit.trim() : undefined,
                  initiatorRole: typeof (x as { initiatorRole?: string }).initiatorRole === 'string' && (x as { initiatorRole: string }).initiatorRole.trim() ? (x as { initiatorRole: string }).initiatorRole.trim() : undefined,
                  oneSentenceDesc: typeof (x as { oneSentenceDesc?: string }).oneSentenceDesc === 'string' && (x as { oneSentenceDesc: string }).oneSentenceDesc.trim() ? (x as { oneSentenceDesc: string }).oneSentenceDesc.trim() : undefined,
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
                            const collabIntent = typeof (item as any).collabIntent === 'string' && (item as any).collabIntent.trim() ? (item as any).collabIntent.trim() : undefined
                            const image = typeof (item as any).image === 'string' && (item as any).image.trim() ? (item as any).image.trim() : undefined
                            const link = typeof (item as any).link === 'string' && (item as any).link.trim() ? (item as any).link.trim() : undefined
                            const workMode = (item as any).workMode === 'local' ? 'local' as const : 'remote' as const
                            const location = typeof (item as any).location === 'string' && (item as any).location.trim() ? (item as any).location.trim() : undefined
                            return text ? { text, detail: detail || undefined, stageTag: stageTag || undefined, contentTag: contentTag || undefined, collabIntent, image, link, workMode, ...(workMode === 'local' && location ? { location } : {}) } : null
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
                          const description = typeof (r as { description?: string })?.description === 'string' ? (r as { description: string }).description.trim() : undefined
                          if (!url) return null
                          return {
                            title: title || url,
                            url,
                            ...(cover ? { cover } : {}),
                            ...(description ? { description } : {}),
                            ...(typeof r?.stageTag === 'string' && r.stageTag.trim() ? { stageTag: r.stageTag.trim() } : {}),
                            ...(typeof r?.contentTag === 'string' && r.contentTag.trim() ? { contentTag: r.contentTag.trim() } : {}),
                            ...(typeof (r as { contributor?: string })?.contributor === 'string' && (r as { contributor: string }).contributor.trim() ? { contributor: (r as { contributor: string }).contributor.trim() } : {}),
                          }
                        })
                        .filter((v): v is ProjectReference => !!v)
                    : undefined,
                  detailImage: typeof x.detailImage === 'string' ? x.detailImage.trim() : undefined,
                  attachments: Array.isArray(x.attachments)
                    ? x.attachments
                        .map((a): ProjectAttachment | null => (a && typeof a.url === 'string' && a.url.trim() ? { url: a.url.trim(), name: typeof a.name === 'string' ? a.name.trim() || a.url : a.url, addedAt: typeof a.addedAt === 'number' ? a.addedAt : undefined, ...(typeof a.stageTag === 'string' && a.stageTag.trim() ? { stageTag: a.stageTag.trim() } : {}), ...(typeof a.contentTag === 'string' && a.contentTag.trim() ? { contentTag: a.contentTag.trim() } : {}), ...(typeof (a as { contributor?: string }).contributor === 'string' && (a as { contributor: string }).contributor.trim() ? { contributor: (a as { contributor: string }).contributor.trim() } : {}) } : null))
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
                  createdAt:
                    typeof x.createdAt === 'number' && !Number.isNaN(x.createdAt)
                      ? x.createdAt
                      : typeof x.createdAt === 'string'
                        ? (() => {
                            const parsed = parseInt(x.createdAt as string, 10)
                            return Number.isNaN(parsed) ? Date.now() : parsed
                          })()
                        : Date.now(),
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
          const fromApi = pd.oneSentenceDesc && typeof pd.oneSentenceDesc === 'string'
          if (fromApi) {
            setOneSentenceDesc(pd.oneSentenceDesc)
          } else {
            const fromOnboarding = typeof window !== 'undefined' ? localStorage.getItem('newUserOnboardingIntro') : null
            const fallback = fromOnboarding?.trim() || ''
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
        }
      }
    } catch (error) {
      console.error('?[PROFILE]  ½½ç¨æ·ä¿¡æ¯¤±´¥:', error)
    } finally {
      setIsLoadingData(false)
    }
  }

  // [comment]
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

  /**  Build a text block from the current profile content (used for manually generating tags and insights)  */
  const buildProfileTextForInsights = useCallback((data: Record<string, unknown>) => {
    const parts: string[] = []
    const one = (data.oneSentenceDesc ?? data.userSay) as string | undefined
    if (one && String(one).trim()) parts.push(String(one).trim())
    const work = Array.isArray(data.workIntroductions) ? data.workIntroductions as { name?: string; description?: string }[] : []
    work.forEach((w) => {
      const line = [w.name, w.description].filter(Boolean).join(': ')
      if (line) parts.push(line)
    })
    const projs = Array.isArray(data.projects) ? data.projects as { text?: string; peopleNeeded?: { text?: string }[] }[] : []
    projs.forEach((p) => {
      if (p.text && String(p.text).trim()) parts.push(String(p.text).trim())
      ;(p.peopleNeeded || []).forEach((n) => { if (n?.text?.trim()) parts.push(n.text.trim()) })
    })
    return parts.filter(Boolean).join('\n\n')
  }, [])

  const saveProfileDataToDb = async (data: Record<string, unknown>, options?: { generateInsights?: boolean }) => {
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
      if (total > prevTotal) {
        const parts: string[] = []
        if (tagsCount > 0) parts.push(`${tagsCount} tag(s)`)
        if (insightsCount > 0) parts.push(`${insightsCount} insight(s)`)
        if (topicsCount > 0) parts.push(`${topicsCount} topic(s)`)
        setDbToastMessage(`Added: ${parts.join(', ')} saved`)
        setTimeout(() => setDbToastMessage(null), 5000)
      }
      const key = typeof userInfo?.id === 'string' ? `profileDbLastSeen_${userInfo.id}` : 'profileDbLastSeen'
      const lastSeen = parseInt(localStorage.getItem(key) || '0', 10)
      if (total > lastSeen) setHasNewDbAdditions(true)
    } catch (e) {
      console.warn('saveProfileDataToDb failed:', e)
    }
  }

  const regenerateTagsAndInsights = useCallback(async () => {
    try {
      const data = getProfileDataFromState()
      const text = buildProfileTextForInsights(data).trim()
      if (text.length < 10) {
        setDbToastMessage('®¹¤ª°ï¼¡¥ä¸ç¹çææ ç­¾/æ´¯')
        setTimeout(() => setDbToastMessage(null), 3000)
        return
      }
      setInsightGenHint('Generating tags and insights...')
      const res = await fetch('/api/user/update-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      const json = await res.json().catch(() => ({}))
      const nextTags = Array.isArray(json.tags) ? json.tags.filter((x: unknown): x is string => typeof x === 'string').map((s: string) => s.trim()).filter(Boolean) : []
      const nextInsights = Array.isArray(json.insights) ? json.insights.filter((x: unknown): x is string => typeof x === 'string').map((s: string) => s.trim()).filter(Boolean) : []

      if (nextTags.length > 0) setTags(nextTags)
      if (nextInsights.length > 0) setInsights(nextInsights)
      if (selectedTags.length === 0 && nextTags.length > 0) setSelectedTags(nextTags)

      try {
        saveProfileDataToDb(
          getProfileDataFromState({
            tags: nextTags,
            insights: nextInsights,
            selectedTags: selectedTags.length === 0 ? nextTags : selectedTags,
          })
        )
        window.dispatchEvent(new CustomEvent('profileChat:insightsUpdated'))
      } catch {}

      setDbToastMessage('·²æ´æ°æ ç­¾ä¸æ´¯')
      setTimeout(() => setDbToastMessage(null), 4000)
    } catch (e) {
      console.warn('regenerateTagsAndInsights failed:', e)
      setDbToastMessage('çæ¤±´¥ï¼¯·ç¨é¯')
      setTimeout(() => setDbToastMessage(null), 4000)
    } finally {
      setInsightGenHint(null)
    }
  }, [buildProfileTextForInsights, getProfileDataFromState, saveProfileDataToDb, selectedTags])

  const markDbAdditionsSeen = useCallback(() => {
    const tagsCount = tagsSaveToDb ? selectedTags.length : 0
    const total = tagsCount + insightsInDb.length + qaList.filter((q) => q.saveToDb).length
    const key = typeof userInfo?.id === 'string' ? `profileDbLastSeen_${userInfo.id}` : 'profileDbLastSeen'
    try { localStorage.setItem(key, String(total)) } catch {}
    setHasNewDbAdditions(false)
  }, [userInfo?.id, tagsSaveToDb, selectedTags.length, insightsInDb.length, qaList])

  // [comment]
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

  /** [comment] */
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


  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = () => {
      setAvatarCropImageSrc(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleAvatarCropConfirm = async (blob: Blob) => {
    setAvatarCropImageSrc(null)
    try {
      const dataUrl = await blobToDataUrl(blob)
      const res = await fetch('/api/image/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: dataUrl, filename: 'avatar.jpg' })
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
    if (confirm('Logout? You will be logged out and can log in to another account.')) {
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
      if (userSay) parts.push(`ç¨æ·¯ï¼?{userSay}`)
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
      if (!res.ok) throw new Error('æ¤±´¥')
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
          ? rawTags.split(/[,ï¼\n]+/).map(s => s.trim()).filter(Boolean)
          : []
      const rawIns = obj.insights
      const newInsights = Array.isArray(rawIns)
        ? rawIns.filter((x): x is string => typeof x === 'string').map(s => s.trim()).filter(Boolean)
        : []
      const mergedTags = Array.from(new Set([...tags, ...newTags]))
      const mergedInsights = Array.from(new Set([...insights, ...newInsights]))
      setTags(mergedTags)
      setInsights(mergedInsights)
      const msg = `çæäº?${newTags.length} ä¸?tagã?{newInsights.length} ä¸?insight`
      setGeneratedToast({ message: msg, index: i })
      setTimeout(() => setGeneratedToast(null), 4000)
      try {
        saveProfileDataToDb(getProfileDataFromState({ tags: mergedTags, selectedTags: selectedTags, insights: mergedInsights }))
        window.dispatchEvent(new CustomEvent('profileChat:insightsUpdated'))
      } catch {}
    } catch (e) {
      console.error('handleSendQAAnswer failed:', e)
      alert('æ¤±´¥ï¼¯·ç¨é¯')
    } finally {
      setSendingQAIndex(null)
    }
  }

  const generateQAFromIdentity = async () => {
    const name = session?.user?.name || 'ç¨æ·'
    const parts: string[] = []
    if (userSay) parts.push(`ç¨æ·¯/ªæä»ç»ï¼?{userSay}`)
    if (selectedTags.length > 0) parts.push(`º«ä»½æ ç­¾ï¼?{selectedTags.join('ã?)}`)
    if (userInfo?.gender) parts.push(`æ§«ï¼?{userInfo.gender === 'male' ? 'ç? : userInfo.gender === 'female' ? '¥? : userInfo.gender}`)
    if (userInfo?.location) parts.push(`æ¨°ï¼?{userInfo.location}`)
    const identityText = parts.length > 0 ? parts.join('\n') : `${name}ï¼ææ æ´¤º«ä»½ä¿¡æ¯ï¼`
    setIsGeneratingQA(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: "You generate Q&A questions for a profile interested topics section. The questions must be SHARP, EDGY, CONTRADICTORY. Not soft or generic. Aim for: provocative, challenging assumptions, exposing paradox/tension, uncomfortable. Return ONLY a JSON array of objects, each with question and answer. Use answer: '' for every item. Same language as identity (Chinese or English). No markdown, no code block, no explanation."
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
      if (!res.ok) throw new Error('Generation failed')
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
      alert('Failed to generate questions from identity, please try again later')
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

  const knownLinkDisplayName = useCallback((url: string): string | null => {
    try {
      const host = new URL(url).hostname.toLowerCase()
      if (/linkedin\.com$/i.test(host) || host === 'www.linkedin.com') return 'LinkedIn'
      if (/twitter\.com$/i.test(host) || /^x\.com$/i.test(host) || host === 'www.twitter.com' || host === 'www.x.com') return 'Twitter / X'
      if (/instagram\.com$/i.test(host) || host === 'www.instagram.com') return 'Instagram'
      if (/facebook\.com$/i.test(host) || host === 'www.facebook.com') return 'Facebook'
      return null
    } catch {
      return null
    }
  }, [])

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
      const fallbackName = knownLinkDisplayName(u) ?? 'Work'
      const displayName = (data.name && data.name.trim()) ? data.name.trim() : fallbackName
      setLinkPreviewDraft((prev) => ({
        cover: res.ok && data.cover ? data.cover : undefined,
        name: displayName,
        description: res.ok && data.description ? data.description : undefined,
        url: u,
        isPersonalWebsite: prev?.isPersonalWebsite ?? false,
      }))
    } catch {
      const fallbackName = knownLinkDisplayName(u) ?? 'Work'
      setLinkPreviewDraft((prev) => ({ name: fallbackName, url: u, isPersonalWebsite: prev?.isPersonalWebsite ?? false }))
    } finally {
      setLinkInputFetching(false)
    }
  }, [knownLinkDisplayName])

  const addLinkFromDraft = useCallback(() => {
    if (!linkPreviewDraft || !linkPreviewDraft.url?.trim()) return
    const item = {
      id: `w-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      cover: linkPreviewDraft.cover || undefined,
      name: (linkPreviewDraft.name?.trim() || 'Work'),
      description: linkPreviewDraft.description?.trim() || undefined,
      url: linkPreviewDraft.url.trim(),
      isPersonalWebsite: linkPreviewDraft.isPersonalWebsite ?? false,
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
        alert('Cover upload failed: ' + (err.error || res.status))
      }
    } catch (err) {
      console.error('Cover upload error:', err)
      alert('Cover upload failed, please try again')
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
        alert('Fetch failed: ' + (data.error || res.status))
      }
    } catch (e) {
      alert('Fetch failed, please check if the link is accessible')
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
        alert('Cover upload failed: ' + (err.error || res.status))
      }
    } catch (err) {
      console.error('Cover upload error:', err)
      alert('Cover upload failed, please try again')
    } finally {
      setNewWorkIntroCoverUploading(false)
    }
  }

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
    if (url) next[editingSocial] = ensureAbsoluteUrl(url)
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

  if (isProjectAccount) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md rounded-2xl bg-white/80 backdrop-blur border border-white/40 shadow-lg p-6 text-center">
          <h1 className="text-lg font-semibold text-gray-900 mb-2">Project Account</h1>
          <p className="text-sm text-gray-600 mb-5">Project editing and management is done on the Project page</p>
          <div className="flex items-center justify-center gap-3">
            <Link
              href="/project"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-teal-600 text-white font-medium hover:bg-teal-700"
            >
              Go to Project
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              Back to home
            </Link>
          </div>
          <p className="text-xs text-gray-500 mt-4">If not redirected automatically, click the button above.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-cyan-50 to-blue-50">
      {forceAvatarSetup && (
        <div className="fixed inset-0 z-[200] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl bg-white border border-gray-200 shadow-xl p-6">
            <h2 className="text-base font-semibold text-gray-900">Setting up your avatar</h2>
            <p className="text-sm text-gray-600 mt-2">
              After registration, you need to upload and crop a photo as your avatar before using the profile page.            </p>
            <input
              id="profile-force-avatar-input"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handlePhotoUpload}
            />
            <div className="mt-4 flex flex-col items-center gap-3">
              <label
                htmlFor="profile-force-avatar-input"
                className="cursor-pointer flex flex-col items-center"
              >
                <div className="w-24 h-24 rounded-full bg-teal-50 border-2 border-dashed border-teal-400 flex flex-col items-center justify-center hover:bg-teal-100/80 hover:border-teal-500 transition-colors">
                  <Camera className="w-9 h-9 text-teal-500 mb-0.5" />
                  <span className="text-[10px] text-teal-700 font-medium">Click to upload</span>
                </div>
              </label>
              <label
                htmlFor="profile-force-avatar-input"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium cursor-pointer hover:bg-teal-700"
              >
                <Camera className="w-4 h-4" />
                Select image
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-3">After upload, a crop dialog will open. Click the circle above or the button to select an image.</p>
          </div>
        </div>
      )}
      {/* Generating tags and insights hint */}
      {insightGenHint && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 bg-gray-700 text-white text-sm rounded-lg shadow-lg flex items-center gap-2">
          <span className="animate-pulse">{insightGenHint}</span>
        </div>
      )}
      {/* Database import hint */}
      {dbToastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 bg-teal-600 text-white text-sm rounded-lg shadow-lg flex items-center gap-2">
          <Database className="w-4 h-4 shrink-0" />
          <span>{dbToastMessage}</span>
          <button type="button" onClick={() => { setDbToastMessage(null); markDbAdditionsSeen() }} className="ml-1 p-0.5 rounded hover:bg-white/20" aria-label="Close">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {/* Remove from plaza hint */}
      {plazaToastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 bg-amber-500 text-white text-sm rounded-lg shadow-lg flex items-center gap-2">
          <span>{plazaToastMessage}</span>
          <button type="button" onClick={() => setPlazaToastMessage(null)} className="ml-1 p-0.5 rounded hover:bg-white/20" aria-label="Close">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {/* Project-related editing (looking-for / stage, etc.) has been migrated to the Project page */}
      {/* Header */}
      <ProfileHeader
        tagsCount={tags.length}
        insightsCount={insights.length}
        onOpenTags={() => setShowTagsModal(true)}
        onOpenInsights={() => insights.length > 0 && setShowInsightsModal(true)}
        onLogout={handleLogout}
      />

      <ProfileFloatingActions
        hasTags={tags.length > 0}
        hasInsights={insights.length > 0}
        hasMessages={messages.unreadCount > 0 || messages.profileMessages.length > 0}
        hasPotentialConnections={true}
        onOpenTags={() => setShowTagsModal(true)}
        onOpenInsights={() => setShowInsightsModal(true)}
        onOpenMessages={messages.openMessages}
        onOpenPotentialConnections={async () => {
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
      />

      {/* Profile: daily question + preview */}
      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-6 items-stretch">
        {/* Daily question: shown above the card */}
        <div className="w-full max-w-sm mx-auto shrink-0">
          <DailyQuestionCard />
        </div>

        {/* Preview card: shown below on mobile, users can control visibility of each section */}
        <aside className="w-full max-w-sm mx-auto shrink-0">
          <p className="text-xs font-medium text-gray-500 mb-2">Preview</p>
          <div className="rounded-2xl shadow-xl overflow-hidden bg-gradient-to-b from-blue-100 via-pink-100 to-orange-200 min-h-[360px] flex flex-col">
            {/* Link name + share link on top of card */}
            {typeof window !== 'undefined' && userInfo?.id && (
              <div className="px-3 pt-2 pb-1.5 border-b border-white/60 bg-white/50">
                <p className="text-[10px] text-gray-500 mb-1">Profile link (use the link on the project card below for sharing projects):</p>
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
              <span>Copy profile link</span>
              {shareLinkCopied && <span className="text-xs text-teal-600">Copied</span>}
            </button>
            <div className="relative flex-1 min-h-[200px] flex flex-col items-center pt-4 pb-2 gap-3">
              {/* Always mounted, avatar area shares menu with Change photo */}
              <input
                ref={profilePhotoInputRef}
                type="file"
                accept="image/*"
                className="sr-only"
                title="Select avatar image"
                onChange={(e) => {
                  handlePhotoUpload(e)
                  setPreviewCardMenuOpen(false)
                }}
              />
              <button
                type="button"
                onClick={() => profilePhotoInputRef.current?.click()}
                className="relative shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
                title="Click to upload or change avatar"
                aria-label="Click to upload or change avatar"
              >
                {avatarDataUrl ? (
                  <img src={resolveImageUrl(avatarDataUrl)} alt="" className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg hover:opacity-95 transition-opacity" />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-b from-teal-900/10 to-gray-300 border-2 border-dashed border-teal-500/50 flex flex-col items-center justify-center text-teal-600 shrink-0 hover:border-teal-500 hover:bg-teal-50/30 transition-colors">
                    <Camera className="w-9 h-9 text-teal-500/80 mb-0.5" />
                    Click to upload
                  </div>
                )}
              </button>
              <div className="absolute top-3 right-3 z-10" ref={previewCardMenuRef}>
                <button
                  type="button"
                  onClick={() => { setPreviewCardMenuOpen((v) => !v); if (hasNewDbAdditions) markDbAdditionsSeen() }}
                  className="relative w-8 h-8 rounded-full bg-white/90 flex items-center justify-center text-gray-500 hover:bg-white hover:shadow transition-colors"
                  aria-label="Edit"
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
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewCardMenuOpen(false)
                        profilePhotoInputRef.current?.click()
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 min-h-[44px]"
                    >
                      <Camera className="w-4 h-4 text-teal-500 shrink-0" />
                      Change photo
                    </button>
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
                  </div>
                )}
              </div>
              {/* Tags, name, one sentence, gender/base: below avatar, not overlapping */}
              <div className="w-full px-4 flex flex-col items-center gap-2">
                {showTagsInPreview && selectedTags.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1.5 w-full">
                    {selectedTags.map((tag, i) => (
                      <span key={i} className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-white/90 text-gray-700 border border-white/90 shadow-sm">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="font-bold text-gray-900 text-lg">
                  {session?.user?.name || 'Username'}
                </p>
                <textarea
                  ref={oneSentenceTextareaRef}
                  placeholder="Describe myself in one sentence"
                  value={oneSentenceDesc}
                  onChange={(e) => setOneSentenceDesc(e.target.value)}
                  onBlur={() => {
                    try { persistOneSentenceToDb() } catch {}
                  }}
                  rows={1}
                  className="w-full max-w-full px-2 py-1 text-xs text-center text-gray-700 bg-white/80 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-teal-400 focus:border-teal-400 placeholder-gray-400 resize-none min-h-[1.75rem] break-words whitespace-pre-wrap overflow-hidden shrink-0"
                />
                <div className="flex flex-wrap justify-center gap-1.5">
                  {userInfo?.gender && (
                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-white/95 text-gray-800 border border-gray-200 shadow-sm">
                      {userInfo.gender === 'male' ? 'Male' : userInfo.gender === 'female' ? 'Female' : userInfo.gender}
                    </span>
                  )}
                  {userInfo?.location && (
                    <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-white/95 text-gray-800 border border-gray-200 shadow-sm">
                      {userInfo.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <ProfileSocialPreview
              showSocialInPreview={showSocialInPreview}
              socialLinks={socialLinks}
            />
            <ProfileAiSuggestionsPreview
              suggestions={profileAiSuggestions}
              loading={profileAiSuggestionsLoading}
            />
            {/* Projects (and who you're looking for): Plaza / Profile / Hidden. */}
            <ProfileProjectsPreviewSection
              userInfo={userInfo}
              projectsList={projectsList}
              getSharePath={getSharePath}
              stageDisplayLabel={stageDisplayLabel}
              handleCreateProjectAndGo={handleCreateProjectAndGo}
              creatingProjectFromProfile={creatingProjectFromProfile}
            />
            <ProfileWorksLinksPreview
              showLinksInPreview={showLinksInPreview}
              workIntroductions={workIntroductions}
              customLinks={customLinks}
              onEditWork={(w) => {
                setEditingWorkIntroId(w.id)
                setWorkIntroModalMode(w.url ? 'link' : 'image')
                setNewWorkIntroCover(w.cover || null)
                setNewWorkIntroName(w.name || '')
                setNewWorkIntroDesc(w.description || '')
                setNewWorkIntroUrl(w.url || '')
                setNewWorkIntroIsPersonalWebsite(w.isPersonalWebsite ?? false)
                setShowAddWorkIntroModal(true)
              }}
              onRemoveWork={handleRemoveWorkIntro}
              onRemoveCustomLink={handleRemoveCustomLink}
            />
            <ProfileExperiencePreview
              experiences={experiences}
              education={education}
              showExperienceInPreview={showExperienceInPreview}
              onEditExperience={(e) => {
                setEditingExpId(e.id)
                setExpForm({
                  title: e.title,
                  company: e.company,
                  employmentType: e.employmentType || '',
                  location: e.location || '',
                  startDate: e.startDate || '',
                  endDate: e.endDate || '',
                  current: e.current || false,
                  description: e.description || '',
                })
                setShowExperienceModal(true)
                setExperienceModalTab('experience')
              }}
              onEditEducation={(e) => {
                setEditingEduId(e.id)
                setEduForm({
                  school: e.school,
                  degree: e.degree || '',
                  fieldOfStudy: e.fieldOfStudy || '',
                  startDate: e.startDate || '',
                  endDate: e.endDate || '',
                  grade: e.grade || '',
                  description: e.description || '',
                })
                setShowExperienceModal(true)
                setExperienceModalTab('education')
              }}
            />
            {/* Interested topics: display-only on card (Q&A + Ask me anything that are checked to show), edit via the menu in the top-right corner */}
            {showQABlockInPreview && (
              <div ref={qaSectionRef} className="flex flex-col w-full px-3 pt-1 pb-1 shrink-0 border-t border-white/50">
                <p className="text-[10px] text-amber-700/90 mb-0.5">Empty fields won&apos;t be publicly visible</p>
                <p className="text-[11px] text-gray-500 mb-0.5">&nbsp;</p>
                <div className="space-y-1.5 max-h-[7.5rem] overflow-y-auto">
                      {qaList.map((item, origIndex) =>
                        item.showInPreview !== true || !(item.answer ?? '').trim() ? null : (
                          <div key={origIndex} className="flex flex-col gap-0.5">
                            <div className="flex items-start gap-1">
                              <p className="flex-1 min-w-0 text-[11px] font-medium text-gray-800 leading-snug whitespace-pre-wrap break-words">Q: {item.question || '(no question)'}</p>
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveQA(origIndex)}
                                  title="Delete"
                                  className="p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                  aria-label="Delete"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                                <a
                                  href={typeof window !== 'undefined' && userInfo?.id ? `#discuss-${origIndex}` : '#'}
                                  title="Join discussion"
                                  className="p-0.5 rounded text-gray-500 hover:text-teal-600 hover:bg-white/80 transition-colors"
                                  aria-label="Join discussion"
                                >
                                  <MessageSquare className="w-3.5 h-3.5" />
                                </a>
                              </div>
                            </div>
                            <p className="text-[10px] text-gray-600 leading-snug whitespace-pre-wrap break-words px-1.5 py-0.5 bg-white/80 rounded border border-white/60">
                              A: {item.answer || ''}
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
                                    {(r.text.includes('Send message') || r.showMessageToTa) && databaseLastQuery.trim() && (
                                      <span className="block mt-1">
                                        <button
                                          type="button"
                                          onClick={() => { messages.setSendMessageDraft(databaseLastQuery); setShowSendMessageModal(true) }}
                                          disabled={messages.sendToEvelynFeedback === 'sending'}
                                          className="text-teal-600 hover:text-teal-700 font-medium text-[10px] underline disabled:opacity-50"
                                        >
                                          Send message
                                        </button>
                                        {messages.sendToEvelynFeedback === 'sending' && <span className="text-[10px] text-gray-500 ml-1">Sending...</span>}
                                        {messages.sendToEvelynFeedback === 'sent' && <span className="text-[10px] text-green-600 ml-1">Sent!</span>}
                                        {messages.sendToEvelynFeedback === 'error' && <span className="text-[10px] text-red-600 ml-1">Failed</span>}
                                      </span>
                                    )}
                                    {(r.askUser || /not found|suggest.*add|suggest.*supplement|suggest.*improve/.test(r.text)) && !r.showMessageToTa && (
                                      <span className="block mt-1">
                                        <button
                                          type="button"
                                          onClick={() => router.push('/profile')}
                                          className="text-teal-600 hover:text-teal-700 font-medium text-[10px] underline disabled:opacity-50"
                                        >
                                          Go to profile to add                                        </button>
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
                          </div>
                        )}
                        {databaseQueryRagError === 'unavailable' && (
                          <div className="space-y-1">
                            <button type="button" onClick={checkRagStatus} disabled={ragStatusChecking} className="text-[10px] text-teal-600 hover:underline disabled:opacity-50">Check RAG status</button>
                                {ragStatusCheck && (
                                  <div className={`text-[10px] px-1 py-0.5 rounded space-y-0.5 ${ragStatusCheck.reachable ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50'}`}>
                                    <p>
                                      {ragStatusCheck.reachable
                                        ? (ragStatusCheck.processedCount !== undefined
                                          ? (ragStatusCheck.processedCount === 0
                                            ? 'RAG service is running but index is empty. Paste text or upload documents in Add to database first.'
                                            : `RAG service is running, ${ragStatusCheck.processedCount} documents in index`)
                                          : 'RAG service is running')
                                        : (ragStatusCheck.hint || ragStatusCheck.error)}
                                    </p>
                                    {ragStatusCheck.reachable && ragStatusCheck.testQuery != null && (
                                      <p className="text-gray-600">
                                        Test "{ragStatusCheck.testQuery}" returned: {ragStatusCheck.testAnswer === '' ? '(empty)' : (ragStatusCheck.testAnswer || '(empty)')}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            {databaseQueryRagError === 'empty' && (
                              <div className="space-y-1">
                                <p className="text-[10px] text-amber-700 bg-amber-50 px-1 py-0.5 rounded">RAG returned no results. Click "Check RAG status" first: if it shows <strong>index is empty</strong>, you need to <strong>paste text</strong> or <strong>upload Word/PDF</strong> in "Add to database"; if index has documents but still no results, try a different question.</p>
                                <button type="button" onClick={checkRagStatus} disabled={ragStatusChecking} className="text-[10px] text-teal-600 hover:underline disabled:opacity-50">Check RAG status</button>
                                {ragStatusCheck && (
                                  <div className={`text-[10px] px-1 py-0.5 rounded space-y-0.5 ${ragStatusCheck.reachable ? 'text-green-700 bg-green-50' : 'text-amber-700 bg-amber-50'}`}>
                                    <p>
                                      {ragStatusCheck.reachable
                                        ? (ragStatusCheck.processedCount !== undefined
                                          ? (ragStatusCheck.processedCount === 0
                                            ? 'RAG service is running but index is empty. Paste text or upload documents in "Add to database" first.'
                                            : `RAG service is running, ${ragStatusCheck.processedCount} documents in index`)
                                          : 'RAG service is running')
                                        : (ragStatusCheck.hint || ragStatusCheck.error)}
                                    </p>
                                    {ragStatusCheck.reachable && ragStatusCheck.testQuery != null && (
                                      <p className="text-gray-600">
                                        Test "{ragStatusCheck.testQuery}" returned: {ragStatusCheck.testAnswer === '' ? '(empty)' : (ragStatusCheck.testAnswer || '(empty)')}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            <p className="text-gray-700 break-words">&quot;{databaseLastQuery}&quot;</p>
                            <button
                              type="button"
                              onClick={() => messages.handleSendToEvelyn(databaseLastQuery)}
                              disabled={messages.sendToEvelynFeedback === 'sending'}
                              className="text-teal-600 hover:text-teal-700 font-medium text-[10px] underline disabled:opacity-50"
                            >
                              Send to {session?.user?.name || 'me'}
                            </button>
                            {messages.sendToEvelynFeedback === 'sending' && <p className="text-[10px] text-gray-500">Sending...</p>}
                            {messages.sendToEvelynFeedback === 'sent' && <p className="text-[10px] text-green-600 font-medium">Sent to {session?.user?.name || 'me'}!</p>}
                            {messages.sendToEvelynFeedback === 'error' && <p className="text-[10px] text-red-600">Failed to send. Try again.</p>}
                          </div>
                        )}
                      </div>
                    )}
            <ProfileEngagePreview
              onlineValue={howToEngageMeOnline}
              offlineValue={howToEngageMeOffline}
              onChangeOnline={setHowToEngageMeOnline}
              onBlurOnline={() => saveProfileDataToDb(getProfileDataFromState({ howToEngageMeOnline }))}
              onChangeOffline={setHowToEngageMeOffline}
              onBlurOffline={() => saveProfileDataToDb(getProfileDataFromState({ howToEngageMeOffline }))}
            />
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

      {/* Describe myself in one sentence edit modal: opened via the menu in the top-right corner */}
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
                Cancel
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
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <ProfileModals
        showMessagesModal={messages.showMessagesModal}
        setShowMessagesModal={(v) => (v ? messages.openMessages() : messages.closeMessages())}
        profileMessages={messages.profileMessages}
        sessionUserName={session?.user?.name}
        onAnswerToQa={(text) => { setQaList(prev => [{ question: text, answer: '', showInPreview: false, saveToDb: false }, ...prev]); setShowQAModal(true) }}
        showPotentialConnectionModal={showPotentialConnectionModal}
        setShowPotentialConnectionModal={setShowPotentialConnectionModal}
        viewedPotentialConnections={viewedPotentialConnections}
        showSendMessageModal={showSendMessageModal}
        setShowSendMessageModal={setShowSendMessageModal}
        sendMessageDraft={messages.sendMessageDraft}
        setSendMessageDraft={messages.setSendMessageDraft}
        sendToEvelynFeedback={messages.sendToEvelynFeedback}
        onSendMessage={() => {
          messages.handleSendMessageFromModal()
          setDatabaseQueryResults(null)
          setDatabaseLastQuery('')
        }}
      />

      <ImageCropModal
        imageSrc={avatarCropImageSrc ?? ''}
        isOpen={!!avatarCropImageSrc}
        onClose={() => setAvatarCropImageSrc(null)}
        onConfirm={handleAvatarCropConfirm}
        circularAvatar
        title="Crop avatar"
      />

      <ProfileProjectsModal
        isOpen={showProjectsModal}
        onClose={() => setShowProjectsModal(false)}
        projectsList={projectsList}
        userId={userInfo?.id}
      />

      {/* Add to database: Word / LinkedIn / Website / Notion / PDF / Google Doc */}
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
              <h3 className="font-semibold text-gray-900">Add to database</h3>
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
              You can paste text, upload Word/PDF, or add links; visible when others query your database
            </p>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {databaseSources.length === 0 ? (
                <p className="text-sm text-gray-500">No data source yet. Add below.</p>
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
                          aria-label="Delete"
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
                  <p className="text-sm font-semibold text-teal-800 mb-1">Add by pasting text</p>
                  <p className='text-xs text-gray-600 mb-2'>LinkedIn links often cannot be scraped. Please copy a brief summary and paste below, then click Add text to database.</p>
                  <textarea
                    value={newDatabaseSourceText}
                    onChange={(e) => setNewDatabaseSourceText(e.target.value)}
                    placeholder="Paste LinkedIn profile, experience, etc..."
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
                            setDatabaseSourceTextAddError(data?.message || 'Text saved. Please click Init RAG table first, then click Sync to RAG to add.')
                            setPendingRagCount((c) => c + 1)
                          } else {
                            setDatabaseSourceTextAddError('')
                          }
                          setTimeout(() => { setDatabaseSourceTextAddResult(null); setDatabaseSourceTextAddError('') }, 6000)
                        } else {
                          setDatabaseSourceTextAddResult('error')
                          setDatabaseSourceTextAddError(typeof data?.error === 'string' ? data.error : 'Please ensure RAG service is running (start-rag.bat)')
                          setTimeout(() => { setDatabaseSourceTextAddResult(null); setDatabaseSourceTextAddError('') }, 6000)
                        }
                      } catch (err) {
                        setDatabaseSourceTextAddResult('error')
                        setDatabaseSourceTextAddError(err instanceof Error ? err.message : 'Please ensure RAG service is running (start-rag.bat)')
                        setTimeout(() => { setDatabaseSourceTextAddResult(null); setDatabaseSourceTextAddError('') }, 6000)
                      }
                      setDatabaseSourceTextAdding(false)
                    }}
                    className="mt-2 px-3 py-1.5 text-sm font-medium text-teal-700 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {databaseSourceTextAdding ? 'Adding...' : 'Add text to database'}
                  </button>
                  {databaseSourceTextAddResult === 'success' && (
                    <p className="mt-2 text-xs text-green-600 font-medium">
                      {databaseSourceTextAddError ? databaseSourceTextAddError : 'Added to RAG index, can be queried in Query my database'}
                    </p>
                  )}
                  {databaseSourceTextAddResult === 'error' && (
                    <p className="mt-2 text-xs text-red-600">
                      Add failed. {databaseSourceTextAddError || 'Please ensure RAG service is running (start-rag.bat)'}
                    </p>
                  )}
                  {(pendingRagCount > 0 || ragInitMessage) && (
                    <div className="mt-3 p-2 rounded-lg bg-amber-50 border border-amber-200">
                      {pendingRagCount > 0 && (
                        <p className='text-xs text-amber-800 font-medium'></p>
                      )}
                      {ragInitMessage && (
                        <p className={`text-[11px] mt-0.5 ${ragInitMessage.includes('failed') ? 'text-red-600' : 'text-green-700'}`}>
                          {ragInitMessage}
                        </p>
                      )}
                      <p className='text-[11px] text-amber-700 mt-0.5'></p>
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
                                setRagInitMessage(data.message || 'RAG table is ready')
                                setTimeout(() => setRagInitMessage(null), 5000)
                              } else {
                                setRagInitMessage(data.hint || data.error || 'Initialization failed')
                              }
                            } catch {
                              setRagInitMessage('Init request failed')
                            } finally {
                              setRagInitPending(false)
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-teal-800 bg-teal-100 border border-teal-300 rounded-lg hover:bg-teal-200 disabled:opacity-50"
                        >
                          {ragInitPending ? 'Initializing...' : 'Initialize RAG table'}
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
                              } else {
                                setDatabaseSourceTextAddResult('error')
                                setDatabaseSourceTextAddError(data?.error || data?.message || 'Sync failed')
                                setTimeout(() => { setDatabaseSourceTextAddResult(null); setDatabaseSourceTextAddError('') }, 5000)
                              }
                            } catch {
                              setDatabaseSourceTextAddResult('error')
                              setDatabaseSourceTextAddError('Sync request failed')
                              setTimeout(() => { setDatabaseSourceTextAddResult(null); setDatabaseSourceTextAddError('') }, 5000)
                            } finally {
                              setRagSyncPending(false)
                            }
                          }}
                          className="px-3 py-1.5 text-xs font-medium text-amber-800 bg-amber-100 border border-amber-300 rounded-lg hover:bg-amber-200 disabled:opacity-50"
                        >
                          {ragSyncPending ? 'Syncing...' : 'Sync to RAG'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-2">Add link or text</p>
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
                          <span className="text-gray-600">{newDatabaseSourceFile ? newDatabaseSourceFile.name : (newDatabaseSourceType === 'word' ? 'Select Word document (.docx/.doc)' : 'Select PDF file')}</span>
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
                          {databaseSourceFileAdding ? 'Uploading...' : 'Add document to database'}
                        </button>
                        {databaseSourceFileAddResult === 'success' && (
                          <p className="text-xs text-green-600 font-medium">Added to RAG index</p>
                        )}
                        {databaseSourceFileAddResult === 'error' && (
                          <p className="text-xs text-red-600">Upload failed. Make sure RAG service is running</p>
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
                          Add
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

      <ProfileQAModal
        isOpen={showQAModal}
        onClose={() => setShowQAModal(false)}
        sessionName={session?.user?.name}
        qaList={qaList}
        showAddQA={showAddQA}
        setShowAddQA={setShowAddQA}
        newQAQuestion={newQAQuestion}
        setNewQAQuestion={setNewQAQuestion}
        newQAAnswer={newQAAnswer}
        setNewQAAnswer={setNewQAAnswer}
        isGeneratingQA={isGeneratingQA}
        generatedToast={generatedToast}
        sendingQAIndex={sendingQAIndex}
        onGenerateFromIdentity={generateQAFromIdentity}
        onToggleShowInPreview={handleToggleQAShowInPreview}
        onToggleSaveToDb={handleToggleQASaveToDb}
        onUpdateAnswer={handleUpdateQAAnswer}
        onSendAnswer={handleSendQAAnswer}
        onRemove={handleRemoveQA}
        onAdd={handleAddQA}
      />

      <ProfileAddSocialIconModal
        isOpen={showAddSocialIcon}
        onClose={() => { setShowAddSocialIcon(false); setSocialSearch('') }}
        socialSearch={socialSearch}
        setSocialSearch={setSocialSearch}
        onSelectPlatform={(key) => { setShowAddSocialIcon(false); setSocialSearch(''); openSocialEdit(key, false) }}
      />

      {/* Add modal: Linktree style, left tabs + right suggested list */}
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
              <h2 className="text-lg font-semibold text-gray-900">Add Link</h2>
              <button
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
                    placeholder={addModalTarget === 'links' ? 'Enter link' : 'Paste or search a link'}
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
                    {linkInputFetching ? 'Fetching...' : 'Fetch'}
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
                        <p className="text-xs text-gray-500">Click Fetch to auto-fill cover, name, and description</p>
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
                              <span className="text-xs text-gray-500">{linkPreviewCoverUploading ? 'Uploading...' : 'Fetch or upload cover'}</span>
                            )}
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            <div>
                              <label className="text-[10px] text-gray-500 block mb-0.5">Start Date</label>
                              <input
                                type="text"
                                value={linkPreviewDraft?.name ?? ''}
                                onChange={(e) => setLinkPreviewDraft((d) => ({ ...(d || { url: socialSearch.trim(), name: '', description: '' }), name: e.target.value }))}
                                                                placeholder="Auto fill from scraping"
                                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-500 block mb-0.5">é¾æ¥</label>
                              <input
                                type="url"
                                value={linkPreviewDraft?.url ?? socialSearch.trim()}
                                onChange={(e) => setLinkPreviewDraft((d) => ({ ...(d || { url: '', name: '', description: '' }), url: e.target.value }))}
                                placeholder="Enter link"
                                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg"
                              />
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-500 block mb-0.5">æ¿°</label>
                          <textarea
                            value={linkPreviewDraft?.description ?? ''}
                            onChange={(e) => setLinkPreviewDraft((d) => ({ ...(d || { url: socialSearch.trim(), name: '', description: '' }), description: e.target.value }))}
                            placeholder='Auto fill after scraping'
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
                            Add
                          </button>
                          <button
                            type="button"
                            onClick={() => { setLinkPreviewDraft(null); setSocialSearch('') }}
                            className="px-4 py-2 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-100"
                          >
                            Clear
                          </button>
                        </div>
                      </div>
                      ) : (
                        <p className="text-sm text-gray-500 py-6 text-center">Enter a link and the fetch form will appear below</p>
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

      {/* Add project modal: Plaza / Profile / Hidden only */}
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
                <p className="text-xs text-gray-500">Where to show this project</p>
                <div className="flex flex-col gap-2">
                  {!avatarDataUrl ? (
                    <div className="px-4 py-3 rounded-lg text-sm text-left bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed">
                      Plaza
                      <span className="block text-[10px] mt-0.5 text-gray-400">You need to upload an avatar first before posting to Plaza</span>
                    </div>
                  ) : (
                  <button type="button" onClick={() => { const next = [...projectsList, { text: addActivityDraft, visibility: 'public' as const, showOnPlaza: true, peopleNeeded: undefined, createdAt: Date.now() }]; setProjectsList(next); saveProfileDataToDb(getProfileDataFromState({ projects: next })); setShowAddActivityModal(false); setAddActivityDraft(''); setAddActivityVisibility(null); setAddActivityShowOnPlaza(null) }} className="px-4 py-3 rounded-lg text-sm font-medium text-left bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100">
                    Plaza
                  </button>
                  )}
                  <button type="button" onClick={() => { const next = [...projectsList, { text: addActivityDraft, visibility: 'public' as const, showOnPlaza: false, peopleNeeded: undefined, createdAt: Date.now() }]; setProjectsList(next); saveProfileDataToDb(getProfileDataFromState({ projects: next })); setShowAddActivityModal(false); setAddActivityDraft(''); setAddActivityVisibility(null); setAddActivityShowOnPlaza(null) }} className="px-4 py-3 rounded-lg text-sm font-medium text-left bg-teal-50 text-teal-700 border border-teal-200 hover:bg-teal-100">
                    Profile
                  </button>
                  <button type="button" onClick={() => { const next = [...projectsList, { text: addActivityDraft, visibility: 'hidden' as const, showOnPlaza: false, peopleNeeded: undefined, createdAt: Date.now() }]; setProjectsList(next); saveProfileDataToDb(getProfileDataFromState({ projects: next })); setShowAddActivityModal(false); setAddActivityDraft(''); setAddActivityVisibility(null); setAddActivityShowOnPlaza(null) }} className="px-4 py-3 rounded-lg text-sm font-medium text-left bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100">
                    Hidden
                  </button>
                </div>
                <p className="text-[10px] text-gray-400">You can add &quot;I&apos;m looking for&quot; by editing the activity later</p>
              </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Add work intro modal: cover, name, description */}
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
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {workIntroModalMode === 'link' && (
                <div>
                  <p className="text-xs font-medium text-gray-700 mb-1">Link (fill link first, click "Fetch" to auto-fill cover, name, description)</p>
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
                      {fetchLinkMetadataLoading ? 'Fetching...' : 'Fetch'}
                    </button>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs font-medium text-gray-700 mb-1.5">
                  {workIntroModalMode === 'image' ? 'Image (upload)' : 'Cover (auto-fill by fetch, or upload manually)'}
                </p>
                <label className="block w-full aspect-video max-h-40 rounded-lg border-2 border-dashed border-gray-300 hover:border-teal-400 cursor-pointer overflow-hidden bg-gray-50">
                  {newWorkIntroCover ? (
                    <img src={resolveImageUrl(newWorkIntroCover)} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                      {newWorkIntroCoverUploading ? (
                        <span>Uploading...</span>
                      ) : (
                        <>
                          <Camera className="w-8 h-8 mb-1" />
                          <span>Click to upload cover</span>
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
                <p className="text-xs font-medium text-gray-700 mb-1">Name <span className="text-red-500">*</span></p>
                <input
                  type="text"
                  placeholder="Work title"
                  value={newWorkIntroName}
                  onChange={(e) => setNewWorkIntroName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-700 mb-1">Description</p>
                <textarea
                  placeholder="Work description..."
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
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddWorkIntro}
                disabled={!newWorkIntroName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingWorkIntroId ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add experience modal: work + education (LinkedIn style) */}
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
              <h3 className="font-semibold text-gray-900">Add Experience</h3>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => { const next = !showExperienceInPreview; setShowExperienceInPreview(next); try { localStorage.setItem('profileShowExperienceInPreview', next ? '1' : '0') } catch {} }} title={showExperienceInPreview ? 'Showing on card (click to hide)' : 'Show on card'} className={`p-1.5 rounded-lg transition-colors ${showExperienceInPreview ? 'text-teal-600 bg-teal-50' : 'text-gray-400 bg-gray-100'}`}><Eye className="w-4 h-4" /></button>
                <button type="button" onClick={() => { setShowExperienceModal(false); setEditingExpId(null); setEditingEduId(null) }} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Close"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="flex border-b border-gray-100 shrink-0">
              <button type="button" onClick={() => { setExperienceModalTab('experience'); setEditingExpId(null); setEditingEduId(null); setExpForm({ title: '', company: '', employmentType: '', location: '', startDate: '', endDate: '', current: false, description: '' }) }} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium ${experienceModalTab === 'experience' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50' : 'text-gray-600 hover:bg-gray-50'}`}><Briefcase className="w-4 h-4" />Work Experience</button>
              <button type="button" onClick={() => { setExperienceModalTab('education'); setEditingExpId(null); setEditingEduId(null); setEduForm({ school: '', degree: '', fieldOfStudy: '', startDate: '', endDate: '', grade: '', description: '' }) }} className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium ${experienceModalTab === 'education' ? 'text-teal-600 border-b-2 border-teal-600 bg-teal-50/50' : 'text-gray-600 hover:bg-gray-50'}`}><GraduationCap className="w-4 h-4" />Education</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {experienceModalTab === 'experience' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Position *</label>
                      <input type="text" value={expForm.title} onChange={(e) => setExpForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Product Manager" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Company *</label>
                      <input type="text" value={expForm.company} onChange={(e) => setExpForm((f) => ({ ...f, company: e.target.value }))} placeholder="e.g. ByteDance" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                      <select value={expForm.employmentType} onChange={(e) => setExpForm((f) => ({ ...f, employmentType: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        <option value="">Select</option>
                        <option value="Full-time">Full-time</option>
                        <option value="Part-time">Part-time</option>
                        <option value="Internship">Internship</option>
                        <option value="Freelance">Freelance</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                      <input type="text" value={expForm.location} onChange={(e) => setExpForm((f) => ({ ...f, location: e.target.value }))} placeholder="e.g. Beijing" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                      <input type="text" value={expForm.startDate} onChange={(e) => setExpForm((f) => ({ ...f, startDate: e.target.value }))} placeholder="e.g. 2020-01" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">ç»ææ¥æ</label>
                      <div className="flex gap-2 items-center">
                        <input type="text" value={expForm.endDate} onChange={(e) => setExpForm((f) => ({ ...f, endDate: e.target.value }))} placeholder="e.g. 2023-06" disabled={expForm.current} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100" />
                        <label className="flex items-center gap-1.5 text-xs text-gray-600 whitespace-nowrap"><input type="checkbox" checked={expForm.current} onChange={(e) => setExpForm((f) => ({ ...f, current: e.target.checked }))} />³ä»</label>
                      </div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">æ¿°</label>
                    <textarea value={expForm.description} onChange={(e) => setExpForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="Job details, achievements, etc." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={saveExperience} disabled={!expForm.title?.trim() || !expForm.company?.trim()} className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50">{editingExpId ? 'ä¿­' : 'æ·» '}</button>
                    {editingExpId && <button type="button" onClick={() => removeExperience(editingExpId)} className="px-4 py-2 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50"> é¤</button>}
                  </div>
                  {experiences.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-700 mb-2">·²æ·» ç·¥ä½ç»</p>
                      <ul className="space-y-2">
                        {experiences.map((e) => (
                          <li key={e.id} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-gray-50">
                            <div>
                              <p className="text-sm font-medium text-gray-800">{e.title} · {e.company}</p>
                              <p className="text-xs text-gray-500">{(e.startDate || e.endDate) ? `${e.startDate || ''} - ${e.current ? 'Present' : (e.endDate || '')}` : ''}</p>
                            </div>
                            <div className="flex gap-1">
                              <button type="button" onClick={() => { setEditingExpId(e.id); setExpForm({ title: e.title, company: e.company, employmentType: e.employmentType || '', location: e.location || '', startDate: e.startDate || '', endDate: e.endDate || '', current: e.current || false, description: e.description || '' }) }} className="p-1 rounded text-gray-400 hover:text-teal-600 hover:bg-teal-50" aria-label="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => removeExperience(e.id)} className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50" aria-label="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
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
                    <label className="block text-xs font-medium text-gray-700 mb-1">­¦æ ¡ *</label>
                    <input type="text" value={eduForm.school} onChange={(e) => setEduForm((f) => ({ ...f, school: e.target.value }))} placeholder="e.g. Tsinghua University" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">­¦</label>
                      <input type="text" value={eduForm.degree} onChange={(e) => setEduForm((f) => ({ ...f, degree: e.target.value }))} placeholder="e.g. Bachelor, Master" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Major</label>
                      <input type="text" value={eduForm.fieldOfStudy} onChange={(e) => setEduForm((f) => ({ ...f, fieldOfStudy: e.target.value }))} placeholder="e.g. Computer Science" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                      <input type="text" value={eduForm.startDate} onChange={(e) => setEduForm((f) => ({ ...f, startDate: e.target.value }))} placeholder="e.g. 2016-09" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">ç»ææ¥æ</label>
                      <input type="text" value={eduForm.endDate} onChange={(e) => setEduForm((f) => ({ ...f, endDate: e.target.value }))} placeholder="e.g. 2020-06" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">æç»© / ª</label>
                    <input type="text" value={eduForm.grade} onChange={(e) => setEduForm((f) => ({ ...f, grade: e.target.value }))} placeholder="e.g. GPA 3.8, Scholarship" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">æ¿°</label>
                    <textarea value={eduForm.description} onChange={(e) => setEduForm((f) => ({ ...f, description: e.target.value }))} rows={3} placeholder="Activities, clubs, projects, etc." className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={saveEducation} disabled={!eduForm.school?.trim()} className="px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 disabled:opacity-50">{editingEduId ? 'ä¿­' : 'æ·» '}</button>
                    {editingEduId && <button type="button" onClick={() => removeEducation(editingEduId)} className="px-4 py-2 text-red-600 text-sm font-medium rounded-lg hover:bg-red-50"> é¤</button>}
                  </div>
                  {education.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs font-medium text-gray-700 mb-2">·²æ·» çæ²ç»</p>
                      <ul className="space-y-2">
                        {education.map((e) => (
                          <li key={e.id} className="flex items-start justify-between gap-2 p-2 rounded-lg bg-gray-50">
                            <div>
                              <p className="text-sm font-medium text-gray-800">{e.school}</p>
                              <p className="text-xs text-gray-500">{(e.degree || e.fieldOfStudy) ? [e.degree, e.fieldOfStudy].filter(Boolean).join(' · ') : ''} · {(e.startDate || e.endDate) ? `${e.startDate || ''} - ${e.endDate || ''}` : ''}</p>
                            </div>
                            <div className="flex gap-1">
                              <button type="button" onClick={() => { setEditingEduId(e.id); setEduForm({ school: e.school, degree: e.degree || '', fieldOfStudy: e.fieldOfStudy || '', startDate: e.startDate || '', endDate: e.endDate || '', grade: e.grade || '', description: e.description || '' }) }} className="p-1 rounded text-gray-400 hover:text-teal-600 hover:bg-teal-50" aria-label="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => removeEducation(e.id)} className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50" aria-label="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
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

      {/* Social / Link é¾æ¥ç¼¾¼¹çªï¼ä» Add ¼¹çªç¹¹³°æ¶¥ Linksï¼ä» profile ç¤¾äº¤¾æ ç¹æ¶¥ Social media */}
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

      {/* æ ç­¾ Tags ¼¹çªï¼ç¨æ·¯ä»¥éæ©¦æ¾ç¤º¨¡çä¸çæ ç­¾ */}
      {showTagsModal && (
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
                <span className="font-semibold text-gray-900">æ ç­¾ Tags</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => { try { regenerateTagsAndInsights() } catch {} }}
                title="Manually regenerate tags and insights"
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                >
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={() => { const next = !showTagsInPreview; setShowTagsInPreview(next); try { localStorage.setItem('profileShowTagsInPreview', next ? '1' : '0') } catch {} }}
                  title="Show"
                  className={`p-1.5 rounded-lg transition-colors ${showTagsInPreview ? 'text-teal-600 bg-teal-50' : 'text-gray-400 bg-gray-100'}`}
                >
                  {showTagsInPreview ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button
                  type="button"
                  onClick={() => { const next = !tagsSaveToDb; setTagsSaveToDb(next); try { localStorage.setItem('profileTagsSaveToDb', next ? '1' : '0') } catch {} }}
                  title="Whether to save to database? Others will be able to ask questions about it"
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
              Save to database: others will be able to ask questions about it. Click Regenerate to update tags/insights, then choose which tags to show on your card.
            </p>
            <div className="flex-1 overflow-y-auto p-4">
              {tags.length === 0 ? (
                <div className="text-sm text-gray-500">
                  No tags yet. Click Regenerate in the top-right to auto-extract tags, then you can manually select or Cancel
                </div>
              ) : (
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
              )}
            </div>
            <div className="px-4 py-3 border-t border-gray-200 flex justify-between items-center">
              <span className='text-xs text-gray-500'>Saved {selectedTags.length} tags</span>
              <button
                type="button"
                onClick={() => setShowTagsModal(false)}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insights modal: opens after clicking the button */}
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
                <span className="font-semibold text-gray-900">Insights</span>
              </div>
              <button
                type="button"
                onClick={() => setShowInsightsModal(false)}
                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2 text-sm text-gray-700">
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
                      title="Whether to save to database? Others will be able to ask questions about it"
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
                      title="Delete this insight"
                      className="shrink-0 mt-0.5 p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                )
              })}
            </div>
            <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-500">
              Saved {insightsInDb.length} items in database
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function ProfilePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Loading...
      </div>
    }>
      <ProfilePageInner />
    </Suspense>
  )
}

