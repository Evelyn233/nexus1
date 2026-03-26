'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { X, Plus, Sparkles, Pencil, Paperclip, ExternalLink, Camera } from 'lucide-react'
import { resolveImageUrl } from '@/lib/resolveImageUrl'
import { ACCEPTED_SUBMISSION_OPTIONS, acceptedSubmissionsFromString, acceptedSubmissionLabel } from '@/lib/acceptedSubmissions'

type ProjectReference = { title: string; url: string; cover?: string; description?: string; stageTag?: string; contentTag?: string; contributor?: string }
type ProjectAttachment = { url: string; name: string; addedAt?: number; stageTag?: string; contentTag?: string; contributor?: string }
type PeopleNeededItem = {
  text: string
  detail?: string
  stageTag?: string
  contentTag?: string
  collabIntent?: string
  /** 接受的投递形式，逗号分隔 */
  acceptedSubmissions?: string
  /** 勾选 questions 时：想问对方的问题 */
  recruiterQuestions?: string
  image?: string
  link?: string
  workMode?: 'local' | 'remote'
  location?: string
}

type ProjectData = {
  text: string
  detail?: string
  image?: string
  stage?: string
  stageOrder?: string[]
  stageEnteredAt?: Record<string, number>
  references?: ProjectReference[]
  peopleNeeded: PeopleNeededItem[]
  attachments?: ProjectAttachment[]
  projectTypeTag?: string
  /** 是否在 Plaza 上发布 */
  showOnPlaza?: boolean
  /** 可见性：individual | public | hidden */
  visibility?: 'individual' | 'public' | 'hidden'
  /** 对外状态标签，如 Actively Hiring */
  openStatusLabel?: string
  whatToProvide?: string
  /** 你能带来什么（英文展示给对方） */
  whatYouCanBring?: string
  /** AI summarized benefit tag (English) */
  whatYouCanBringTag?: string
  cultureAndBenefit?: string
  initiatorRole?: string
  oneSentenceDesc?: string
}

const STAGE_DEFAULT = ['Idea', 'Planning']

function formatStageDate(ts: number): string {
  const d = new Date(ts)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}
const PROJECT_ROLE_OPTIONS = [
  { value: '', label: '请选择 (required)' },
  { value: 'initiator', label: '发起人 Initiator' },
  { value: 'co-initiator', label: '联合发起 Co-initiator' },
  { value: 'core-member', label: '核心成员 Core member' },
  { value: 'advisor', label: '顾问 Advisor' },
  { value: 'other', label: '其他 Other' },
]

function getUserAddedStageOrder(proj: { stageOrder?: string[]; stageEnteredAt?: Record<string, number> }): string[] {
  const order = proj.stageOrder ?? []
  const entered = proj.stageEnteredAt ?? {}
  const fromEntered = Object.keys(entered).filter((s) => s.trim()).sort((a, b) => (entered[a] ?? 0) - (entered[b] ?? 0))
  const seen = new Set<string>()
  const out: string[] = []
  for (const s of order) {
    const key = s.trim().toLowerCase()
    if (key && !seen.has(key)) {
      seen.add(key)
      out.push(s.trim())
    }
  }
  for (const s of fromEntered) {
    const key = s.trim().toLowerCase()
    if (key && !seen.has(key)) {
      seen.add(key)
      out.push(s.trim())
    }
  }
  if (out.length === 0 && order.length > 0) return order.map((s) => s.trim()).filter(Boolean)
  if (out.length === 0) return STAGE_DEFAULT
  const ideaIdx = out.findIndex((s) => s.toLowerCase() === 'idea')
  if (ideaIdx > 0) {
    const [idea] = out.splice(ideaIdx, 1)
    out.unshift(idea)
  }
  return out
}

function collabIntentTagList(collabIntent: string | undefined): string[] {
  return (collabIntent ?? '').split(',').map((s) => s.trim()).filter((s): s is string => !!s)
}

/** Looking for 条目：协作方式 + 协作对象类型必填；选在地时须填地点 */
function peopleCollabFieldsValid(p: Pick<PeopleNeededItem, 'workMode' | 'location' | 'collabIntent'>): { ok: boolean; missing: string[] } {
  const missing: string[] = []
  if (p.workMode !== 'local' && p.workMode !== 'remote') missing.push('协作方式（远程或在地）')
  if (p.workMode === 'local' && !(p.location ?? '').trim()) missing.push('在地时的地点')
  if (collabIntentTagList(p.collabIntent).length === 0) missing.push('协作对象类型（至少选一项）')
  return { ok: missing.length === 0, missing }
}

type Props = {
  project: ProjectData
  userId: string
  createdAt: number
  userName?: string
  /** 个人资料是否已填必填项（如头像）。未完成时不允许勾选「在 Plaza 上发布」 */
  hasProfileAvatar?: boolean
  onSaved?: (updated: Partial<ProjectData>) => void
  onClose?: () => void
}

export function ProjectEditor({ project, userId, createdAt, userName, hasProfileAvatar = true, onSaved, onClose }: Props) {
  const [state, setState] = useState<ProjectData>(() => ({
    ...project,
    peopleNeeded: project.peopleNeeded?.length ? project.peopleNeeded.map((p) => ({ ...p, text: p.text || '' })) : [],
    references: project.references?.length ? project.references.map((r) => ({ title: r.title || r.url || '', url: r.url || '', cover: r.cover, description: r.description, stageTag: r.stageTag, contentTag: r.contentTag, contributor: r.contributor })) : [],
    attachments: project.attachments ?? [],
    stageOrder: getUserAddedStageOrder(project).length > 0 ? getUserAddedStageOrder(project) : STAGE_DEFAULT,
    stage: project.stage?.trim() || getUserAddedStageOrder(project)[0] || STAGE_DEFAULT[0] || 'Idea',
    stageEnteredAt: project.stageEnteredAt ?? {},
  }))
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null)
  const [stageInput, setStageInput] = useState('')
  const [peopleInput, setPeopleInput] = useState('')
  const [linkInput, setLinkInput] = useState('')
  const [linkFetching, setLinkFetching] = useState(false)
  const [pictureUploading, setPictureUploading] = useState(false)
  const [attachmentUploading, setAttachmentUploading] = useState(false)
  const [stageSuggestions, setStageSuggestions] = useState<string[]>([])
  const [stageSuggestionsLoading, setStageSuggestionsLoading] = useState(false)
  const [stageSuggestionsError, setStageSuggestionsError] = useState<string | null>(null)
  // When user jumps to a non-adjacent stage, show a modal to let them decide
  // which intermediate stages should be marked as reached.
  const [stageConnectModal, setStageConnectModal] = useState<null | { fromStage: string; toStage: string; intermediates: string[] }>(null)
  const [stageConnectChecked, setStageConnectChecked] = useState<Record<string, boolean>>({})
  const [editingStageDate, setEditingStageDate] = useState<string | null>(null)
  const [editingStageDateDraft, setEditingStageDateDraft] = useState('')
  const [benefitTagLoading, setBenefitTagLoading] = useState(false)
  const [benefitTagError, setBenefitTagError] = useState<string | null>(null)
  const benefitTagLastTextRef = useRef<string | null>(null)
  const [projectTypeSuggestions, setProjectTypeSuggestions] = useState<string[]>([])
  const [projectTypeLoading, setProjectTypeLoading] = useState(false)
  const [projectTypeSuggestionsLoading, setProjectTypeSuggestionsLoading] = useState(false)
  const [linkEditDraft, setLinkEditDraft] = useState<ProjectReference | null>(null)
  const [linkEditIndex, setLinkEditIndex] = useState<number | null>(null)
  const [linkEditCoverUploading, setLinkEditCoverUploading] = useState(false)
  const [peopleEditDraft, setPeopleEditDraft] = useState<PeopleNeededItem | null>(null)
  const [peopleEditIndex, setPeopleEditIndex] = useState<number | null>(null)
  const [peopleImageUploading, setPeopleImageUploading] = useState(false)
  const [collabIntentAiLoading, setCollabIntentAiLoading] = useState(false)
  const autoFilledRef = useRef(false)
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const peopleEditAutoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  /** 新增 Looking for 后滚动到对应卡片（不打开编辑弹窗） */
  const scrollToLookingForCard = (index: number) => {
    requestAnimationFrame(() => {
      document.getElementById(`looking-for-card-${index}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  }

  const contributorName = userName?.trim() || 'me'
  const requirePlazaFields = state.showOnPlaza === true
  const hasLookingFor = (state.peopleNeeded || []).some((p) => (p.text || '').trim())
  // Only required when publishing to Plaza.
  const requireWhatYouCanBring = requirePlazaFields

  /** 勾选「在 Plaza 上发布」前须已填项（与 save 中 Plaza 校验一致） */
  const plazaPrerequisitesOk =
    (state.initiatorRole ?? '').trim() &&
    (state.whatToProvide ?? '').trim() &&
    (state.projectTypeTag ?? '').trim() &&
    (state.whatYouCanBring ?? '').trim()
  /** 当前未开启 Plaza 时：无头像则整项禁用；有头像但未填齐必填则不可勾选开启（已开启时可随时取消） */
  const plazaCheckboxDisabled =
    !hasProfileAvatar || (state.showOnPlaza !== true && !plazaPrerequisitesOk)
  const plazaBlockerLabels: string[] = []
  if (hasProfileAvatar) {
    if (!(state.initiatorRole ?? '').trim()) plazaBlockerLabels.push('你在这个项目的角色')
    if (!(state.whatToProvide ?? '').trim()) plazaBlockerLabels.push('What this project provides')
    if (!(state.projectTypeTag ?? '').trim()) plazaBlockerLabels.push('项目类型')
    if (!(state.whatYouCanBring ?? '').trim()) plazaBlockerLabels.push('What benefit can you bring to them')
  }

  const buildProjectPatchPayload = (s: any, roleTrim: string) => ({
    text: (s.text ?? '').trim() || project.text,
    detail: s.detail?.trim() || undefined,
    detailImage: s.image?.trim() || undefined,
    stage: s.stage?.trim() || undefined,
    stageOrder: s.stageOrder?.filter(Boolean) || undefined,
    stageEnteredAt: s.stageEnteredAt && Object.keys(s.stageEnteredAt).length > 0 ? s.stageEnteredAt : undefined,
    peopleNeeded: (s.peopleNeeded || [])
      .filter((p: any) => (p?.text || '').trim())
      .map((p: any) => ({
        text: p.text.trim(),
        detail: p.detail?.trim() || undefined,
        stageTag: p.stageTag?.trim() || undefined,
        contentTag: p.contentTag?.trim() || undefined,
        collabIntent: p.collabIntent?.trim() || undefined,
        acceptedSubmissions: p.acceptedSubmissions?.trim() || undefined,
        recruiterQuestions: (p.recruiterQuestions ?? '').trim().slice(0, 4000) || undefined,
        image: p.image?.trim() || undefined,
        link: p.link?.trim() || undefined,
        workMode: p.workMode,
        location: p.location?.trim() || undefined,
      })),
    references: (s.references || [])
      .filter((r: any) => (r?.url || '').trim())
      .map((r: any) => ({
        title: (r.title || '').trim() || r.url,
        url: r.url.trim(),
        cover: r.cover?.trim() || undefined,
        description: r.description?.trim() || undefined,
        stageTag: r.stageTag?.trim() || undefined,
        contentTag: r.contentTag?.trim() || undefined,
        contributor: r.contributor?.trim() || undefined,
      })),
    attachments: s.attachments,
    projectTypeTag: s.projectTypeTag?.trim() || undefined,
    showOnPlaza: s.showOnPlaza,
    visibility: s.visibility || 'individual',
    openStatusLabel: s.openStatusLabel?.trim() || undefined,
    whatToProvide: s.whatToProvide?.trim() || undefined,
    whatYouCanBring: s.whatYouCanBring?.trim() || undefined,
    whatYouCanBringTag: s.whatYouCanBringTag?.trim() || undefined,
    cultureAndBenefit: s.cultureAndBenefit?.trim() || undefined,
    initiatorRole: roleTrim,
    oneSentenceDesc: s.oneSentenceDesc?.trim() || undefined,
  })

  // 兜底：如果已有 stage 但没有进入日期，补上一条（用于显示 stage 日期）
  useEffect(() => {
    const s = (state.stage || '').trim()
    if (!s) return
    if (state.stageEnteredAt && state.stageEnteredAt[s]) return
    setState((p) => ({ ...p, stageEnteredAt: { ...(p.stageEnteredAt || {}), [s]: Date.now() } }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getStageSequenceForUI = () => {
    const base = state.stageOrder && state.stageOrder.length > 0 ? state.stageOrder : STAGE_DEFAULT
    const enteredKeys = Object.keys(state.stageEnteredAt ?? {})
    const extra = enteredKeys.filter((k) => !base.some((b) => b.toLowerCase() === k.toLowerCase()))
    return [...base, ...extra]
  }

  const findStageIndex = (seq: string[], name: string) => seq.findIndex((s) => s.toLowerCase() === name.toLowerCase())

  const handleStageSelect = (targetRaw: string) => {
    const targetTrimmed = targetRaw.trim()
    if (!targetTrimmed) return

    const seq = getStageSequenceForUI()
    const enteredAt = state.stageEnteredAt ?? {}

    const fromRaw = (state.stage ?? '').trim() || seq[seq.length - 1] || seq[0] || 'Idea'
    const fromIdx = findStageIndex(seq, fromRaw)
    const fromStage = fromIdx >= 0 ? seq[fromIdx] : fromRaw

    const toIdx = findStageIndex(seq, targetTrimmed)
    const toStage = toIdx >= 0 ? seq[toIdx] : targetTrimmed

    const alreadyEntered = Object.entries(enteredAt).some(([k, v]) => !!v && k.toLowerCase() === toStage.toLowerCase())
    if (alreadyEntered) {
      setState((prev) => ({
        ...prev,
        stage: toStage,
        stageEnteredAt: { ...(prev.stageEnteredAt || {}), [toStage]: prev.stageEnteredAt?.[toStage] ?? Date.now() },
      }))
      return
    }

    // Always set the clicked stage immediately (so user sees the progress update).
    setState((prev) => {
      const nextStageOrder =
        prev.stageOrder && prev.stageOrder.some((s) => s.toLowerCase() === toStage.toLowerCase())
          ? prev.stageOrder
          : [...(prev.stageOrder && prev.stageOrder.length > 0 ? prev.stageOrder : STAGE_DEFAULT), toStage]
      return {
        ...prev,
        stage: toStage,
        stageOrder: nextStageOrder,
        stageEnteredAt: { ...(prev.stageEnteredAt || {}), [toStage]: prev.stageEnteredAt?.[toStage] ?? Date.now() },
      }
    })

    // If this is a non-adjacent jump within the known stage sequence, ask user which intermediates to connect.
    if (fromIdx >= 0 && toIdx >= 0 && Math.abs(toIdx - fromIdx) > 1) {
      const min = Math.min(fromIdx, toIdx)
      const max = Math.max(fromIdx, toIdx)
      const intermediates = seq.slice(min + 1, max)
      if (intermediates.length > 0) {
        // Ensure intermediate stages appear between endpoints in UI order.
        const segment = seq.slice(min, max + 1) // includes fromStage..toStage
        setState((prev) => {
          const prevOrder = prev.stageOrder && prev.stageOrder.length > 0 ? prev.stageOrder : []
          const existingSet = new Set(prevOrder.map((s) => s.toLowerCase()))
          const ensureSet = new Set(segment.map((s) => s.toLowerCase()))
          const allSet = new Set(Array.from(existingSet).concat(Array.from(ensureSet)))
          const orderedFromSeq = seq.filter((s) => allSet.has(s.toLowerCase()))
          const ordered = orderedFromSeq.length > 0 ? orderedFromSeq : prevOrder
          const remaining = prevOrder.filter((s) => !ordered.some((o) => o.toLowerCase() === s.toLowerCase()))
          return { ...prev, stageOrder: [...ordered, ...remaining] }
        })
        setStageConnectChecked(Object.fromEntries(intermediates.map((s) => [s, true])))
        setStageConnectModal({ fromStage, toStage, intermediates })
      }
    }
  }

  const confirmStageConnect = () => {
    if (!stageConnectModal) return
    const now = Date.now()
    const { toStage, intermediates } = stageConnectModal
    const checks = stageConnectChecked ?? {}

    setState((prev) => ({
      ...prev,
      stage: toStage,
      stageEnteredAt: {
        ...(prev.stageEnteredAt || {}),
        [toStage]: (prev.stageEnteredAt || {})[toStage] ?? now,
        ...Object.fromEntries(
          intermediates
            .filter((s) => checks[s] === true)
            .map((s) => [s, (prev.stageEnteredAt || {})[s] ?? now]),
        ),
      },
    }))
    setStageConnectModal(null)
  }

  const cancelStageConnect = () => setStageConnectModal(null)

  const tsToDateInputValue = (ts: number): string => {
    const d = new Date(ts)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  const dateInputValueToTs = (v: string): number | null => {
    if (!v) return null
    const ts = new Date(`${v}T00:00:00`).getTime()
    return Number.isFinite(ts) ? ts : null
  }

  const removeStageReached = (stageName: string) => {
    const lower = stageName.toLowerCase()
    setState((prev) => {
      const nextEnteredAt = { ...(prev.stageEnteredAt || {}) }
      for (const k of Object.keys(nextEnteredAt)) {
        if (k.toLowerCase() === lower) delete nextEnteredAt[k]
      }

      const order = prev.stageOrder && prev.stageOrder.length > 0 ? prev.stageOrder : STAGE_DEFAULT
      const reachedStages = order.filter((s) => !!nextEnteredAt[s])
      const nextStage = reachedStages.length > 0 ? reachedStages[reachedStages.length - 1] : (order[0] ?? 'Idea')

      return {
        ...prev,
        stageEnteredAt: nextEnteredAt,
        stage: nextStage,
      }
    })
  }

  const save = useCallback(async (options?: { silent?: boolean }) => {
    console.log('[ProjectEditor save] triggered, showOnPlaza:', state.showOnPlaza, 'stage:', state.stage, 'stageOrder:', state.stageOrder, 'whatToProvide:', state.whatToProvide, 'projectTypeTag:', state.projectTypeTag, 'whatYouCanBring:', state.whatYouCanBring)
    const roleTrim = (state.initiatorRole ?? '').trim()
    if (!roleTrim) {
      if (!options?.silent) alert('请填写「你在这个项目的角色」(Your role in this project is required)')
      else {
        setSaveErrorMsg('未同步到服务器：请先在主编辑区填写「你在这个项目的角色」')
        setSaveStatus('error')
        setTimeout(() => {
          setSaveErrorMsg(null)
          setSaveStatus('idle')
        }, 8000)
      }
      return
    }
    // 强制必填项（按你的流程）：你一旦填写了 Looking for，就必须补上 What you can bring
    // 同时：勾选 Plaza 时也必须有 What this project provides + 项目类型
    const missingProvide = !(state.whatToProvide ?? '').trim()
    const missingType = !(state.projectTypeTag ?? '').trim()
    const missingBring = !(state.whatYouCanBring ?? '').trim()

    const parts: string[] = []
    if (requirePlazaFields && missingProvide) parts.push('What this project provides')
    if (requirePlazaFields && missingType) parts.push('项目类型')
    if (requireWhatYouCanBring && missingBring) parts.push('What you can bring')

    if (parts.length > 0) {
      if (!options?.silent) {
        const prefix = requirePlazaFields ? '要发布到 Plaza，请先填写' : '请先填写'
        alert(`${prefix}：${parts.join('、')}`)
      } else {
        // 自动保存不能静默失败：否则用户以为已保存
        setSaveErrorMsg(`未同步到服务器：缺少 ${parts.join('、')}${requirePlazaFields ? '（已开启 Plaza）' : ''}`)
        setSaveStatus('error')
        setTimeout(() => {
          setSaveErrorMsg(null)
          setSaveStatus('idle')
        }, 8000)
      }
      return
    }
    for (let i = 0; i < state.peopleNeeded.length; i++) {
      const p = state.peopleNeeded[i]
      if (!(p.text || '').trim()) continue
      const collab = peopleCollabFieldsValid(p)
      if (!collab.ok) {
        if (!options?.silent) {
          alert(`「Looking for」第 ${i + 1} 条须填写：${collab.missing.join('、')}（点铅笔进入编辑）`)
        }
        setSaveStatus('idle')
        return
      }
      if (acceptedSubmissionsFromString(p.acceptedSubmissions).includes('questions') && !(p.recruiterQuestions ?? '').trim()) {
        if (!options?.silent) {
          alert(`「Looking for」第 ${i + 1} 条：已勾选「回答我想问的问题」，请在编辑弹窗里填写「想问对方的问题」`)
        } else {
          setSaveErrorMsg(`未同步：第 ${i + 1} 条 Looking for 勾选了「回答我想问的问题」但未填写具体问题`)
          setSaveStatus('error')
          setTimeout(() => {
            setSaveErrorMsg(null)
            setSaveStatus('idle')
          }, 8000)
        }
        setSaveStatus('idle')
        return
      }
    }
    setSaveStatus('saving')
    try {
      // 必须与 buildProjectPatchPayload 一致，否则会漏字段（例如 whatYouCanBring 从未写入数据库）
      const patchPayload = {
        ...buildProjectPatchPayload(state, roleTrim),
        showOnPlaza: hasProfileAvatar ? state.showOnPlaza : false,
      }
      const res = await fetch(`/api/project?userId=${encodeURIComponent(userId)}&createdAt=${createdAt}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patchPayload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || 'Save failed')
      }

      // 手动点击 Save 后，保证至少产出一轮 AI 结果（Looking for + 项目类型）
      let nextState = state
      let peopleChanged = false
      let typeChanged = false
      if (!options?.silent) {
        const nextPeople = await Promise.all(
          (state.peopleNeeded || []).map(async (p) => {
            const text = (p.text || '').trim()
            if (!text) return p
            try {
              const [intentRes, contentRes] = await Promise.all([
                fetch('/api/analyze-collab-intent', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({ peopleText: text, detail: p.detail || '' }),
                }).catch(() => null),
                fetch('/api/analyze-content-tag', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({
                    type: 'people',
                    peopleText: text,
                    projectTitle: state.text,
                    currentStage: state.stage,
                    stageOrder: state.stageOrder,
                  }),
                }).catch(() => null),
              ])
              const intentJson = intentRes && intentRes.ok ? await intentRes.json().catch(() => ({})) : {}
              const contentJson = contentRes && contentRes.ok ? await contentRes.json().catch(() => ({})) : {}
              const fallback = inferPeopleMetaFallback(text)
              return {
                ...p,
                collabIntent: typeof intentJson?.collabIntent === 'string' ? intentJson.collabIntent : (p.collabIntent || fallback.collabIntent),
                contentTag: typeof contentJson?.tag === 'string' && contentJson.tag.trim() ? contentJson.tag.trim() : (p.contentTag || fallback.contentTag),
                stageTag: typeof contentJson?.stage === 'string' && contentJson.stage.trim() ? contentJson.stage.trim() : (p.stageTag || fallback.stageTag),
              }
            } catch {
              const fallback = inferPeopleMetaFallback(text)
              return {
                ...p,
                collabIntent: p.collabIntent || fallback.collabIntent,
                contentTag: p.contentTag || fallback.contentTag,
                stageTag: p.stageTag || fallback.stageTag,
              }
            }
          })
        )

        let nextProjectTypeTag = state.projectTypeTag
        if (!nextProjectTypeTag?.trim() && state.text?.trim()) {
          try {
            const typeRes = await fetch('/api/generate-project-type-tag', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                projectTitle: state.text,
                detail: state.detail ?? '',
                peopleNeededTexts: nextPeople.map((p) => p.text || ''),
              }),
            })
            const typeJson = await typeRes.json().catch(() => ({}))
            if (typeRes.ok && typeof typeJson?.projectTypeTag === 'string' && typeJson.projectTypeTag.trim()) {
              nextProjectTypeTag = typeJson.projectTypeTag.trim()
            }
          } catch {
            // silent
          }
        }

        // 同时也拉一下 AI 推荐 chips（若有内容但还没有建议的话）
        if (projectTypeSuggestions.length === 0 && (state.text?.trim() || state.detail?.trim() || state.whatToProvide?.trim())) {
          try {
            const suggRes = await fetch('/api/generate-project-type-tags', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectTitle: state.text,
                detail: state.detail ?? '',
                peopleNeededTexts: nextPeople.map((p) => p.text || ''),
              }),
            })
            const suggJson = await suggRes.json().catch(() => ({}))
            if (Array.isArray(suggJson?.projectTypeTags) && suggJson.projectTypeTags.length > 0) {
              setProjectTypeSuggestions(suggJson.projectTypeTags)
            }
          } catch {
            // silent
          }
        }

        peopleChanged = JSON.stringify(nextPeople) !== JSON.stringify(state.peopleNeeded || [])
        typeChanged = (nextProjectTypeTag || '') !== (state.projectTypeTag || '')
        if (peopleChanged || typeChanged) {
          nextState = { ...state, peopleNeeded: nextPeople, projectTypeTag: nextProjectTypeTag }
          setState(nextState)
        }
      }

      // 关键：AI 产出要落库，否则父组件重新 loadProject 时看起来像“没生成”
      if (!options?.silent && (peopleChanged || typeChanged)) {
        try {
          const persistRes = await fetch(`/api/project?userId=${encodeURIComponent(userId)}&createdAt=${createdAt}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildProjectPatchPayload(nextState, roleTrim)),
          })
          if (!persistRes.ok) {
            const data = await persistRes.json().catch(() => ({}))
            console.warn('AI persist patch failed:', data?.error || persistRes.status)
          }
        } catch (e) {
          console.warn('AI persist patch network error:', e)
        }
      }

      setSaveStatus('saved')
      onSaved?.(nextState)
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch (e) {
      const msg = (e as Error).message || '保存失败'
      setSaveErrorMsg(msg)
      setSaveStatus('error')
      // 自动保存失败不弹窗避免打扰，但手动保存失败要弹
      if (!options?.silent) {
        alert(msg)
      } else {
        console.warn('Auto-save failed:', msg)
      }
      // 5秒后清除错误提示
      setTimeout(() => { setSaveErrorMsg(null); setSaveStatus('idle') }, 5000)
    }
  }, [state, userId, createdAt, project.text, onSaved, projectTypeSuggestions.length, hasProfileAvatar])

  const addStage = (name: string) => {
    const n = name.trim()
    if (!n) return
    const lower = n.toLowerCase()
    if (state.stageOrder?.some((s) => s.toLowerCase() === lower)) return
    const next = [...(state.stageOrder || []), n]
    setState((prev) => ({
      ...prev,
      stageOrder: next,
      stage: n,
      stageEnteredAt: { ...prev.stageEnteredAt, [n]: prev.stageEnteredAt?.[n] ?? Date.now() },
    }))
  }

  const inferPeopleMetaFallback = (text: string) => {
    const t = text.toLowerCase()
    let collabIntent: 'guest' | 'partner' | 'part-time' = 'partner'
    if (/(guest|嘉宾|访谈|采访|podcast)/.test(t)) collabIntent = 'guest'
    else if (/(part.?time|兼职|外包|freelance)/.test(t)) collabIntent = 'part-time'

    let contentTag = text.trim().slice(0, 24)
    if (/(go.?to.?market|gtm|市场|增长|运营)/.test(t)) contentTag = 'Go-to-Market'
    else if (/(design|设计|ui|ux)/.test(t)) contentTag = 'Product Design'
    else if (/(dev|开发|engineer|技术|前端|后端)/.test(t)) contentTag = 'Engineering'
    else if (/(video|剪辑|拍摄|摄影|导演|纪录片)/.test(t)) contentTag = 'Video Production'

    return {
      collabIntent,
      contentTag,
      stageTag: state.stage || 'Idea',
    }
  }

  const addPeople = async (text: string) => {
    const t = text.trim()
    if (!t) return
    const insertIndex = state.peopleNeeded.length
    // 只生成列表卡片，不打开「编辑 Looking for」弹窗（弹窗仅由铅笔打开）
    setState((prev) => ({
      ...prev,
      peopleNeeded: [...prev.peopleNeeded, { text: t, stageTag: prev.stage }],
    }))
    setPeopleInput('')
    scrollToLookingForCard(insertIndex)

    // 新增后自动做一次 AI 标注（协作方式 + 内容标签 + 可能的阶段）
    try {
      const [intentRes, contentRes] = await Promise.all([
        fetch('/api/analyze-collab-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ peopleText: t }),
        }).catch(() => null),
        fetch('/api/analyze-content-tag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            type: 'people',
            peopleText: t,
            projectTitle: state.text,
            currentStage: state.stage,
            stageOrder: state.stageOrder,
          }),
        }).catch(() => null),
      ])

      const intentJson = intentRes && intentRes.ok ? await intentRes.json().catch(() => ({})) : {}
      const contentJson = contentRes && contentRes.ok ? await contentRes.json().catch(() => ({})) : {}
      const fallback = inferPeopleMetaFallback(t)
      const nextCollabIntent = typeof intentJson?.collabIntent === 'string' ? intentJson.collabIntent : fallback.collabIntent
      const nextContentTag = typeof contentJson?.tag === 'string' && contentJson.tag.trim() ? contentJson.tag.trim() : fallback.contentTag
      const nextStageTag = typeof contentJson?.stage === 'string' && contentJson.stage.trim() ? contentJson.stage.trim() : fallback.stageTag
      const shouldUpdateStage = contentJson?.suggestUpdateStage === true && !!nextStageTag

      setState((prev) => {
        if (!prev.peopleNeeded[insertIndex]) return prev
        const updated = [...prev.peopleNeeded]
        const current = updated[insertIndex]
        updated[insertIndex] = {
          ...current,
          collabIntent: nextCollabIntent || current.collabIntent,
          contentTag: nextContentTag || current.contentTag,
          stageTag: nextStageTag || current.stageTag || prev.stage,
        }

        if (shouldUpdateStage && nextStageTag) {
          return {
            ...prev,
            stage: nextStageTag,
            stageEnteredAt: { ...(prev.stageEnteredAt || {}), [nextStageTag]: prev.stageEnteredAt?.[nextStageTag] ?? Date.now() },
            peopleNeeded: updated,
          }
        }
        return { ...prev, peopleNeeded: updated }
      })
    } catch {
      const fallback = inferPeopleMetaFallback(t)
      setState((prev) => {
        if (!prev.peopleNeeded[insertIndex]) return prev
        const updated = [...prev.peopleNeeded]
        updated[insertIndex] = {
          ...updated[insertIndex],
          collabIntent: updated[insertIndex].collabIntent || fallback.collabIntent,
          contentTag: updated[insertIndex].contentTag || fallback.contentTag,
          stageTag: updated[insertIndex].stageTag || fallback.stageTag,
        }
        return { ...prev, peopleNeeded: updated }
      })
    }
  }

  const openPeopleEdit = (index: number) => {
    const item = state.peopleNeeded[index]
    if (!item) return
    setPeopleEditDraft({ ...item })
    setPeopleEditIndex(index)
  }

  const savePeopleEdit = async () => {
    if (peopleEditAutoSaveTimerRef.current) clearTimeout(peopleEditAutoSaveTimerRef.current)
    if (peopleEditIndex == null || !peopleEditDraft) return
    const editIdx = peopleEditIndex
    const draft = peopleEditDraft
    const text = (draft.text || '').trim()
    if (!text) return
    const collabCheck = peopleCollabFieldsValid({
      workMode: draft.workMode,
      location: draft.location,
      collabIntent: draft.collabIntent,
    })
    if (!collabCheck.ok) {
      alert(`请填写：${collabCheck.missing.join('、')}`)
      return
    }
    const effectiveWorkMode = draft.workMode!
    const effectiveLocation = effectiveWorkMode === 'local' ? (draft.location?.trim() || undefined) : undefined
    const userChoseCollabIntent = draft.collabIntent
    const draftSubs = acceptedSubmissionsFromString(draft.acceptedSubmissions)

    // 合并后的「虚拟 state」用于校验与 PATCH（含弹窗里改的 whatYouCanBring 等）
    const merged: PeopleNeededItem = {
      ...state.peopleNeeded[editIdx],
      ...draft,
      text,
      detail: draft.detail?.trim() || undefined,
      link: draft.link?.trim() || undefined,
      workMode: effectiveWorkMode,
      location: effectiveLocation,
      recruiterQuestions: draftSubs.includes('questions')
        ? (draft.recruiterQuestions ?? '').trim().slice(0, 4000) || undefined
        : undefined,
    }
    const nextPeople = [...state.peopleNeeded]
    nextPeople[editIdx] = merged
    const virtualState: ProjectData = { ...state, peopleNeeded: nextPeople }

    const roleTrim = (virtualState.initiatorRole ?? '').trim()
    if (!roleTrim) {
      alert('请填写「你在这个项目的角色」(Your role in this project is required)（在主编辑区）')
      return
    }
    const vPlaza = virtualState.showOnPlaza === true
    const missingProvide = !(virtualState.whatToProvide ?? '').trim()
    const missingType = !(virtualState.projectTypeTag ?? '').trim()
    const missingBring = !(virtualState.whatYouCanBring ?? '').trim()
    const plazaParts: string[] = []
    if (vPlaza && missingProvide) plazaParts.push('What this project provides')
    if (vPlaza && missingType) plazaParts.push('项目类型')
    if (vPlaza && missingBring) plazaParts.push('What benefit can you bring to them')
    if (plazaParts.length > 0) {
      alert(`要保存并发布到 Plaza，请先填写：${plazaParts.join('、')}`)
      return
    }
    for (let i = 0; i < virtualState.peopleNeeded.length; i++) {
      const p = virtualState.peopleNeeded[i]
      if (!(p.text || '').trim()) continue
      const collab = peopleCollabFieldsValid(p)
      if (!collab.ok) {
        alert(`「Looking for」第 ${i + 1} 条须填写：${collab.missing.join('、')}`)
        return
      }
      if (acceptedSubmissionsFromString(p.acceptedSubmissions).includes('questions') && !(p.recruiterQuestions ?? '').trim()) {
        alert(`已勾选「回答我想问的问题」，请在下方的「想问对方的问题」里填写内容（每条一行）`)
        return
      }
    }

    setState((prev) => {
      if (!prev.peopleNeeded[editIdx]) return prev
      const next = [...prev.peopleNeeded]
      next[editIdx] = merged
      return { ...prev, peopleNeeded: next }
    })
    setPeopleEditDraft(null)
    setPeopleEditIndex(null)

    // 立即写入数据库（原先只改本地 state，依赖自动保存，且 PATCH 曾漏掉 whatYouCanBring）
    try {
      setSaveStatus('saving')
      const patchPayload = {
        ...buildProjectPatchPayload(virtualState, roleTrim),
        showOnPlaza: hasProfileAvatar ? virtualState.showOnPlaza : false,
      }
      const patchRes = await fetch(`/api/project?userId=${encodeURIComponent(userId)}&createdAt=${createdAt}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(patchPayload),
      })
      if (!patchRes.ok) {
        const data = await patchRes.json().catch(() => ({}))
        throw new Error(data?.error || 'Save failed')
      }
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
      onSaved?.(virtualState)
    } catch (e) {
      const msg = (e as Error).message || '保存失败'
      setSaveErrorMsg(msg)
      setSaveStatus('error')
      alert(msg)
      setTimeout(() => {
        setSaveErrorMsg(null)
        setSaveStatus('idle')
      }, 5000)
    }

    // 编辑后再跑一次 AI，确保标签/合作方式可随文本更新
    try {
      const [intentRes, contentRes] = await Promise.all([
        fetch('/api/analyze-collab-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ peopleText: text }),
        }).catch(() => null),
        fetch('/api/analyze-content-tag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            type: 'people',
            peopleText: text,
            projectTitle: state.text,
            currentStage: state.stage,
            stageOrder: state.stageOrder,
          }),
        }).catch(() => null),
      ])
      const intentJson = intentRes && intentRes.ok ? await intentRes.json().catch(() => ({})) : {}
      const contentJson = contentRes && contentRes.ok ? await contentRes.json().catch(() => ({})) : {}
      const fallback = inferPeopleMetaFallback(text)
      const nextCollabIntent = typeof intentJson?.collabIntent === 'string' ? intentJson.collabIntent : fallback.collabIntent
      const nextContentTag = typeof contentJson?.tag === 'string' && contentJson.tag.trim() ? contentJson.tag.trim() : fallback.contentTag
      const nextStageTag = typeof contentJson?.stage === 'string' && contentJson.stage.trim() ? contentJson.stage.trim() : fallback.stageTag

      setState((prev) => {
        if (!prev.peopleNeeded[editIdx]) return prev
        const next = [...prev.peopleNeeded]
        const current = next[editIdx]
        next[editIdx] = {
          ...current,
          collabIntent: userChoseCollabIntent || nextCollabIntent,
          contentTag: nextContentTag,
          stageTag: nextStageTag || current.stageTag,
          workMode: effectiveWorkMode,
          location: ((effectiveLocation ?? current.location?.trim()) || undefined),
        }
        return { ...prev, peopleNeeded: next }
      })
    } catch {
      // silent
    }

    // Ensure benefit tag is generated + persisted for public “Looking for” display.
    try {
      const benefitText = (virtualState.whatYouCanBring ?? '').trim()
      if (benefitText) {
        const res = await fetch('/api/analyze-benefit-tag', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ text: benefitText, projectTitle: state.text }),
        })
        const data = await res.json().catch(() => ({}))
        const tag = typeof data?.tag === 'string' ? data.tag.trim() : ''
        if (res.ok && tag) {
          await fetch(`/api/project?userId=${encodeURIComponent(userId)}&createdAt=${createdAt}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ whatYouCanBringTag: tag }),
          }).catch(() => ({}))

          setState((prev) => ({ ...prev, whatYouCanBringTag: tag }))
          onSaved?.({ whatYouCanBringTag: tag } as Partial<ProjectData>)
        }
      }
    } catch {
      // silent
    }
  }

  const handlePeopleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !peopleEditDraft) return
    e.target.value = ''
    setPeopleImageUploading(true)
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
      setPeopleEditDraft((prev) => (prev ? { ...prev, image: data.url } : prev))
    } catch {
      alert('Image upload failed')
    } finally {
      setPeopleImageUploading(false)
    }
  }

  const fetchLinkMetadata = useCallback(async () => {
    const u = linkInput.trim()
    if (!u || !/^https?:\/\//i.test(u)) return
    setLinkFetching(true)
    try {
      const res = await fetch('/api/link-metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: u }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setState((prev) => ({
          ...prev,
          references: [...(prev.references || []), { title: u, url: u, stageTag: prev.stage }],
        }))
        setLinkInput('')
        return
      }
      const title = (typeof data?.name === 'string' && data.name.trim()) ? data.name.trim() : u
      const cover = typeof data?.cover === 'string' && data.cover.trim() ? data.cover.trim() : undefined
      const description = typeof data?.description === 'string' && data.description.trim() ? data.description.trim() : undefined
      setState((prev) => ({
        ...prev,
        references: [...(prev.references || []), { title, url: u, cover, description, stageTag: prev.stage, contributor: contributorName }],
      }))
      setLinkInput('')
    } catch {
      setState((prev) => ({
        ...prev,
        references: [...(prev.references || []), { title: u, url: u, stageTag: prev.stage }],
      }))
      setLinkInput('')
    } finally {
      setLinkFetching(false)
    }
  }, [linkInput, state.stage, contributorName])

  const addLinkSimple = () => {
    const u = linkInput.trim()
    if (!u) return
    if (/^https?:\/\//i.test(u)) {
      fetchLinkMetadata()
    } else {
      setState((prev) => ({
        ...prev,
        references: [...(prev.references || []), { title: u, url: u, stageTag: prev.stage }],
      }))
      setLinkInput('')
    }
  }

  const handlePictureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setPictureUploading(true)
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
      setState((prev) => ({ ...prev, image: data.url }))
    } catch {
      alert('Image upload failed')
    } finally {
      setPictureUploading(false)
    }
  }

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setAttachmentUploading(true)
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
      setState((prev) => ({
        ...prev,
        attachments: [...(prev.attachments || []), { url: data.url, name: attName, addedAt: Date.now(), contributor: contributorName }],
      }))
    } catch {
      alert('Upload failed')
    } finally {
      setAttachmentUploading(false)
    }
  }

  const generateStageSuggestions = useCallback(async () => {
    const projectTitle =
      (state.text ?? '').trim() ||
      (state.whatToProvide ?? '').trim() ||
      (state.detail ?? '').trim().slice(0, 120)
    if (!projectTitle) return
    setStageSuggestionsError(null)
    setStageSuggestionsLoading(true)
    try {
      const res = await fetch('/api/generate-stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ projectTitle }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && Array.isArray(data.stages) && data.stages.length > 0) {
        setStageSuggestions(data.stages)
      } else {
        const msg = typeof data?.error === 'string' ? data.error : res.status === 401 ? '请先登录' : res.status === 503 ? 'LLM 未配置' : '生成失败，请重试'
        setStageSuggestionsError(msg)
      }
    } catch {
      setStageSuggestionsError('网络错误，请重试')
    } finally {
      setStageSuggestionsLoading(false)
    }
  }, [state.text, state.whatToProvide, state.detail])

  // 标题 / 描述 / provides 变化后防抖自动生成 Stage 推荐；「Change」仅用于不满意时换一批
  useEffect(() => {
    const seed =
      (state.text ?? '').trim() ||
      (state.whatToProvide ?? '').trim() ||
      (state.detail ?? '').trim().slice(0, 120)
    if (!seed) {
      setStageSuggestions([])
      setStageSuggestionsError(null)
      return
    }
    const id = setTimeout(() => {
      void generateStageSuggestions()
    }, 600)
    return () => clearTimeout(id)
  }, [state.text, state.whatToProvide, state.detail, generateStageSuggestions])

  const generateProjectTypeTag = useCallback(async () => {
    if (!state.text?.trim()) return
    setProjectTypeLoading(true)
    try {
      const res = await fetch('/api/generate-project-type-tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle: state.text,
          detail: state.detail ?? '',
          peopleNeededTexts: (state.peopleNeeded ?? []).map((p) => p.text),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.projectTypeTag) {
        setState((prev) => ({ ...prev, projectTypeTag: data.projectTypeTag }))
      }
    } catch {
      // silent
    } finally {
      setProjectTypeLoading(false)
    }
  }, [state.text, state.detail, state.peopleNeeded])

  const fetchProjectTypeSuggestions = useCallback(async () => {
    const title = (state.text ?? '').trim()
    const detail = (state.detail ?? '').trim()
    const wtp = (state.whatToProvide ?? '').trim()
    const projectTitle = title || wtp || detail.slice(0, 120)
    if (!projectTitle) return
    setProjectTypeSuggestionsLoading(true)
    try {
      const res = await fetch('/api/generate-project-type-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle: title || projectTitle,
          detail: state.detail ?? '',
          peopleNeededTexts: (state.peopleNeeded ?? []).map((p) => p.text),
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (Array.isArray(data?.projectTypeTags)) {
        setProjectTypeSuggestions(data.projectTypeTags)
      }
    } catch {
      setProjectTypeSuggestions([])
    } finally {
      setProjectTypeSuggestionsLoading(false)
    }
  }, [state.text, state.detail, state.whatToProvide, state.peopleNeeded])

  // 项目信息变化后防抖自动生成项目类型推荐；「Change」仅用于换一批
  useEffect(() => {
    const hasContent = !!(state.text?.trim() || state.detail?.trim() || state.whatToProvide?.trim())
    if (!hasContent) {
      setProjectTypeSuggestions([])
      return
    }
    const id = setTimeout(() => {
      void fetchProjectTypeSuggestions()
    }, 700)
    return () => clearTimeout(id)
  }, [state.text, state.detail, state.whatToProvide, state.peopleNeeded, fetchProjectTypeSuggestions])

  // AI: summarize “what you can bring” into a compact English tag.
  // Used for display under the Looking for card, and persisted to DB.
  useEffect(() => {
    const benefitText = (state.whatYouCanBring ?? '').trim()
    if (!benefitText) {
      if (state.whatYouCanBringTag) {
        setState((prev) => ({ ...prev, whatYouCanBringTag: undefined }))
      }
      benefitTagLastTextRef.current = null
      return
    }

    if (benefitTagLastTextRef.current === benefitText && state.whatYouCanBringTag?.trim()) return

    const id = setTimeout(() => {
      setBenefitTagLoading(true)
      setBenefitTagError(null)
      void (async () => {
        try {
          const res = await fetch('/api/analyze-benefit-tag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ text: benefitText, projectTitle: state.text }),
          })
          const data = await res.json().catch(() => ({}))
          if (res.ok && typeof data?.tag === 'string' && data.tag.trim()) {
            benefitTagLastTextRef.current = benefitText
            setState((prev) => ({ ...prev, whatYouCanBringTag: data.tag.trim().slice(0, 30) }))
          }
        } catch {
          // silent
        } finally {
          setBenefitTagLoading(false)
        }
      })()
    }, 700)

    return () => clearTimeout(id)
  }, [state.whatYouCanBring, state.text])

  // Stage / 项目类型：输入后防抖自动生成；「Change」为手动换一批

  // 自动保存：state 变化后 2.5 秒无操作则保存（需已填角色）
  useEffect(() => {
    if (!(state.initiatorRole ?? '').trim()) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null
      save({ silent: true })
    }, 2500)
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    }
  }, [state, save])

  // Looking for 编辑弹窗自动保存：peopleEditDraft 变化后 2.5 秒无操作则自动合并并触发保存
  useEffect(() => {
    if (!peopleEditDraft || peopleEditIndex == null) return
    if (peopleEditAutoSaveTimerRef.current) clearTimeout(peopleEditAutoSaveTimerRef.current)
    peopleEditAutoSaveTimerRef.current = setTimeout(() => {
      peopleEditAutoSaveTimerRef.current = null
      if (peopleEditIndex == null || !peopleEditDraft) return
      const text = (peopleEditDraft.text || '').trim()
      if (!text) return
      const collabCheck = peopleCollabFieldsValid({
        workMode: peopleEditDraft.workMode,
        location: peopleEditDraft.location,
        collabIntent: peopleEditDraft.collabIntent,
      })
      if (!collabCheck.ok) return
      const effectiveWorkMode = peopleEditDraft.workMode!
      const effectiveLocation = effectiveWorkMode === 'local' ? (peopleEditDraft.location?.trim() || undefined) : undefined
      setState((prev) => {
        if (!prev.peopleNeeded[peopleEditIndex]) return prev
        const next = [...prev.peopleNeeded]
        next[peopleEditIndex] = {
          ...prev.peopleNeeded[peopleEditIndex],
          ...peopleEditDraft,
          text,
          detail: peopleEditDraft.detail?.trim() || undefined,
          link: peopleEditDraft.link?.trim() || undefined,
          workMode: effectiveWorkMode,
          location: effectiveLocation,
        }
        return { ...prev, peopleNeeded: next }
      })
    }, 2500)
    return () => {
      if (peopleEditAutoSaveTimerRef.current) clearTimeout(peopleEditAutoSaveTimerRef.current)
    }
  }, [peopleEditDraft, peopleEditIndex])

  const saveLinkEdit = () => {
    if (!linkEditDraft?.url?.trim()) return
    if (linkEditIndex !== null) {
      setState((prev) => ({
        ...prev,
        references: prev.references?.map((r, i) => i === linkEditIndex ? { ...linkEditDraft!, url: linkEditDraft!.url.trim(), title: linkEditDraft!.title?.trim() || linkEditDraft!.url } : r) ?? [],
      }))
    } else {
      setState((prev) => ({
        ...prev,
        references: [...(prev.references || []), { ...linkEditDraft, url: linkEditDraft.url.trim(), title: linkEditDraft.title?.trim() || linkEditDraft.url }],
      }))
    }
    setLinkEditDraft(null)
    setLinkEditIndex(null)
  }

  const handleLinkEditCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !linkEditDraft) return
    e.target.value = ''
    setLinkEditCoverUploading(true)
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader()
        r.onload = () => resolve(r.result as string)
        r.onerror = () => reject(new Error('Failed to read'))
        r.readAsDataURL(file)
      })
      const res = await fetch('/api/image/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: dataUrl, filename: file.name }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data?.url) {
        setLinkEditDraft((d) => (d ? { ...d, cover: data.url } : null))
      }
    } catch {
      // silent
    } finally {
      setLinkEditCoverUploading(false)
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">Edit project</h2>
        <div className="flex items-center gap-2">
          {saveStatus === 'saving' && <span className="text-[10px] text-amber-600">Saving...</span>}
          {saveStatus === 'saved' && <span className="text-[10px] text-teal-600">Saved</span>}
          {saveStatus === 'error' && <span className="text-[10px] text-red-600">{saveErrorMsg ?? '保存失败'}</span>}
          {saveStatus === 'idle' && (state.initiatorRole ?? '').trim() && <span className="text-[10px] text-gray-400">自动保存</span>}
          <button
            type="button"
            onClick={() => { void save() }}
            disabled={saveStatus === 'saving'}
            className="px-3 py-1.5 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50"
          >
            Save
          </button>
          {onClose && (
            <button type="button" onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-500" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* 仅进度和标签有 AI 生成，其他不需要 */}
        {/* 1. Project title */}
        <div className="rounded-xl border border-teal-200 bg-teal-50/40 p-3">
          <label className="block text-[11px] font-medium text-gray-700 mb-1">Project title</label>
          <input
            type="text"
            value={state.text}
            onChange={(e) => setState((p) => ({ ...p, text: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-400/40"
          />
        </div>

        {/* 1.5 What to provide - 放在项目名称下面 */}
        <div className="rounded-xl border border-cyan-200 bg-cyan-50/40 p-3">
          <label className="block text-[11px] font-medium text-gray-700 mb-1">
            What this project provides
            {requirePlazaFields && <span className="text-amber-600">（必填）</span>}
          </label>
          <textarea
            value={state.whatToProvide ?? ''}
            onChange={(e) => setState((p) => ({ ...p, whatToProvide: e.target.value }))}
            placeholder="e.g. documentary production, podcast hosting, community ops..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-400/40 resize-none"
          />
        </div>

        {/* 2. Project type：上方 AI 推荐，下方用户自定义可修改，与 profile 一致 */}
        <div className="rounded-xl border border-violet-200 bg-violet-50/30 p-3">
          <label className="block text-[11px] font-medium text-gray-700 mb-1">
            项目类型
            {requirePlazaFields && <span className="text-amber-600">（必填）</span>}
          </label>
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-[10px] text-gray-500">AI 推荐（输入后自动生成，点击选用）</p>
            <button
              type="button"
              onClick={() => { void fetchProjectTypeSuggestions() }}
              disabled={
                !(state.text?.trim() || state.detail?.trim() || state.whatToProvide?.trim()) ||
                projectTypeSuggestionsLoading
              }
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] rounded border border-violet-200 bg-violet-50 text-violet-600 hover:bg-violet-100 disabled:opacity-50"
              title="换一批推荐"
            >
              {projectTypeSuggestionsLoading ? <span className="w-2.5 h-2.5 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
              Change
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {projectTypeSuggestionsLoading && projectTypeSuggestions.length === 0 ? (
              <span className="text-[10px] text-gray-400">根据项目生成中…</span>
            ) : null}
            {projectTypeSuggestions.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setState((p) => ({ ...p, projectTypeTag: tag }))}
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded border text-[11px] ${
                  state.projectTypeTag?.trim() === tag
                    ? 'border-violet-500 bg-violet-100 text-violet-800'
                    : 'border-gray-200 bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                {tag}
              </button>
            ))}
          </div>
          <p className="text-[10px] text-gray-500 mb-1">用户自定义（可修改，直接保存即可）</p>
          <input
            type="text"
            value={state.projectTypeTag ?? ''}
            onChange={(e) => setState((p) => ({ ...p, projectTypeTag: e.target.value }))}
            placeholder="e.g. 纪录片、播客、社区"
            className="w-full px-2 py-1 text-[11px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-400/40"
          />
        </div>

        {/* 3. Stage - 放在上面，与 profile 一致：AI 推荐 + 用户自定义添加 */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
          <label className="block text-[11px] font-medium text-gray-700 mb-1.5">Stage</label>
          <p className="text-[10px] text-gray-400 mb-1">· click to select current</p>
          {/* 选中的进度：只把用户点击过（已有日期）的阶段连起来 */}
          {(() => {
            const enteredAt = state.stageEnteredAt ?? {}
            const baseOrder = state.stageOrder && state.stageOrder.length > 0 ? state.stageOrder : STAGE_DEFAULT
            const enteredKeys = Object.keys(enteredAt)
            const extra = enteredKeys.filter((k) => !baseOrder.some((b) => b.toLowerCase() === k.toLowerCase()))
            const order = [...baseOrder, ...extra]

            const enteredLowerToTs = new Map<string, number>()
            for (const [k, v] of Object.entries(enteredAt)) {
              if (v && typeof v === 'number') enteredLowerToTs.set(k.toLowerCase(), v)
            }

            return (
              <div className="flex flex-nowrap overflow-x-auto items-center gap-0 mb-1 pb-1">
                {order.map((s, idx) => {
                  const sLower = s.toLowerCase()
                  const isLit = enteredLowerToTs.has(sLower)
                  const nextLit = idx + 1 < order.length && enteredLowerToTs.has(order[idx + 1].toLowerCase())
                  const dateTs = enteredLowerToTs.get(sLower)

                  return (
                    <div key={s} className="flex items-center gap-0 shrink-0">
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleStageSelect(s)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') handleStageSelect(s)
                        }}
                        className={`px-2.5 py-1 text-[11px] font-medium border-2 rounded-full cursor-pointer ${
                          isLit ? 'border-teal-500 bg-teal-500 text-white' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        <span className="flex flex-col items-center leading-tight">
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${isLit ? 'bg-white' : 'bg-amber-400'}`} />
                            <span>{s}</span>
                          </span>

                          {dateTs ? (
                            <span className={`text-[9px] mt-0.5 flex items-center gap-1`}>
                              {editingStageDate?.toLowerCase() === sLower ? (
                                <input
                                  type="date"
                                  value={editingStageDateDraft}
                                  onChange={(e) => {
                                    const v = e.target.value
                                    setEditingStageDateDraft(v)
                                    const nextTs = dateInputValueToTs(v)
                                    if (!nextTs) return
                                    setState((prev) => ({
                                      ...prev,
                                      stageEnteredAt: { ...(prev.stageEnteredAt || {}), [s]: nextTs },
                                    }))
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  onBlur={() => setEditingStageDate(null)}
                                  className="px-1 py-0.5 text-[9px] border border-white/40 rounded bg-white/10 text-white focus:outline-none"
                                />
                              ) : (
                                <span
                                  role="button"
                                  tabIndex={0}
                                  className="underline cursor-pointer text-white/90"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    setEditingStageDate(s)
                                    setEditingStageDateDraft(tsToDateInputValue(dateTs))
                                  }}
                                >
                                  {formatStageDate(dateTs)}
                                </span>
                              )}

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingStageDate(null)
                                  removeStageReached(s)
                                }}
                                className="p-0.5 rounded hover:bg-white/20 text-white/90"
                                aria-label="Remove stage date"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ) : null}
                        </span>
                      </div>

                      {idx < order.length - 1 && (
                        <div
                          className={`w-6 h-0.5 shrink-0 rounded-full ${isLit && nextLit ? 'bg-teal-500' : 'bg-gray-200'}`}
                          aria-hidden
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })()}

          {/* AI 推荐：在下面（保持原交互，只是 chips 改成横向滑动） */}
          <div className="mb-2">
            <p className="text-[10px] text-gray-400 mb-1 flex items-center gap-1">
              <Sparkles className="w-2.5 h-2.5 text-violet-400" />
              AI 推荐（输入后自动生成，点击选用）
              <button
                type="button"
                onClick={() => { void generateStageSuggestions() }}
                disabled={
                  stageSuggestionsLoading ||
                  !(state.text?.trim() || state.whatToProvide?.trim() || state.detail?.trim())
                }
                className="ml-auto px-2 py-0.5 text-[10px] rounded border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                title="换一批推荐"
              >
                {stageSuggestionsLoading ? '…' : 'Change'}
              </button>
            </p>
            {stageSuggestionsLoading && stageSuggestions.length === 0 ? (
              <div className="flex items-center gap-1.5 text-[10px] text-violet-500">
                <span className="w-2.5 h-2.5 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" />
                AI 生成中…
              </div>
            ) : stageSuggestionsError ? (
              <p className="text-[10px] text-amber-600">{stageSuggestionsError}</p>
            ) : stageSuggestions.length > 0 ? (
              <div className="flex flex-nowrap overflow-x-auto gap-2 pb-1">
                {stageSuggestions.map((s) => {
                  const enteredAt = state.stageEnteredAt ?? {}
                  const alreadyEntered = Object.entries(enteredAt).some(([k, v]) => !!v && k.toLowerCase() === s.toLowerCase())
                  return (
                    <button
                      key={s}
                      type="button"
                      disabled={alreadyEntered}
                      onClick={() => !alreadyEntered && handleStageSelect(s)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] ${
                        alreadyEntered ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed' : 'border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100'
                      }`}
                    >
                      <Sparkles className="w-2.5 h-2.5 shrink-0" />
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${alreadyEntered ? 'bg-gray-400' : 'bg-violet-500'}`} />
                      {s}
                    </button>
                  )
                })}
              </div>
            ) : (
              <span className="text-[10px] text-gray-400">
                {state.text?.trim() || state.whatToProvide?.trim() || state.detail?.trim()
                  ? '正在准备推荐…'
                  : '填写项目标题、描述或 What this project provides 后将自动生成；不满意可点「Change」换一批'}
              </span>
            )}
          </div>
          {/* 用户自定义：输入添加 */}
          <div className="flex gap-2">
            <input
              type="text"
              value={stageInput}
              onChange={(e) => setStageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addStage(stageInput)
                  setStageInput('')
                }
              }}
              placeholder="自定义输入，回车添加"
              className="flex-1 px-2 py-1 text-[11px] border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-400/40"
            />
            <button
              type="button"
              onClick={() => { addStage(stageInput); setStageInput('') }}
              className="px-2 py-1 text-[11px] rounded-lg border border-teal-300 bg-teal-50 text-teal-700 hover:bg-teal-100"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Stage connect modal: when user jumps, let them decide which intermediate steps to mark as reached */}
          {stageConnectModal && (
            <div
              className="fixed inset-0 z-[260] bg-black/40 flex items-center justify-center p-4"
              onClick={cancelStageConnect}
            >
              <div
                className="w-full max-w-md bg-white rounded-xl shadow-xl p-4 border border-gray-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-900">Connect progress</h3>
                  <button type="button" className="p-1 rounded hover:bg-gray-100 text-gray-500" onClick={cancelStageConnect} aria-label="Close">
                    ×
                  </button>
                </div>
                <p className="text-xs text-gray-600 mb-3">
                  From <span className="font-medium text-gray-900">{stageConnectModal.fromStage}</span> to{' '}
                  <span className="font-medium text-gray-900">{stageConnectModal.toStage}</span>. Choose which intermediate stages to mark as reached.
                </p>

                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {stageConnectModal.intermediates.length > 0 ? (
                    stageConnectModal.intermediates.map((s) => (
                      <label key={s} className="flex items-center gap-2 cursor-pointer text-sm text-gray-800">
                        <input
                          type="checkbox"
                          checked={stageConnectChecked[s] !== false}
                          onChange={(e) =>
                            setStageConnectChecked((prev) => ({
                              ...prev,
                              [s]: e.target.checked,
                            }))
                          }
                        />
                        <span>{s}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500">No intermediate stages.</p>
                  )}
                </div>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={cancelStageConnect}
                    className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={confirmStageConnect}
                    className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 当前标签：三种样式（实心 teal / 浅紫描边 / 浅绿描边+绿点）- 放在 Stage 后面 */}
        <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-3">
          <label className="block text-[11px] font-medium text-gray-700 mb-2">当前标签</label>
          <div className="flex flex-wrap items-center gap-2">
            {/* 样式1：实心 teal + 白点 + 白字 */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-600 text-white text-[11px] font-medium">
              <span className="w-2 h-2 rounded-full bg-white shrink-0" />
              {state.stage?.trim() || 'Idea'}
            </span>
            {/* 样式2：浅紫底 + 紫边 + 紫字，无图标 */}
            {state.projectTypeTag?.trim() ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-[11px] font-medium">
                {state.projectTypeTag.trim()}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-500 text-[11px]">
                项目类型
              </span>
            )}
            {/* 样式3：浅绿底 + 绿边 + 绿点 + 深绿字 */}
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-800 text-[11px] font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
              {state.openStatusLabel?.trim() || (state.peopleNeeded?.length ? 'Actively Hiring' : '') || '—'}
            </span>
          </div>
        </div>

        {/* 4. Looking for - 放在上面 */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-3">
          <label className="block text-[11px] font-medium text-gray-700 mb-1.5">Looking for</label>
          <div className="space-y-2 mb-2">
            {state.peopleNeeded.map((p, i) => (
              <div key={i} id={`looking-for-card-${i}`} className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 scroll-mt-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium text-amber-900">{p.text}</p>
                    {p.detail?.trim() && (
                      <p className="mt-1 text-[10px] text-amber-800/90 whitespace-pre-wrap">{p.detail.trim()}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {(p.workMode === 'local' || p.workMode === 'remote') && (
                        <span className="px-1.5 py-0.5 rounded-full bg-white text-[9px] border border-amber-200 text-amber-700">
                          {p.workMode === 'local' && p.location ? `在地 · ${p.location}` : p.workMode === 'local' ? '在地' : '远程'}
                        </span>
                      )}
                      {(p.collabIntent || '').split(',').map((s) => s.trim()).filter(Boolean).map((value) => (
                        <span key={value} className="px-1.5 py-0.5 rounded-full bg-white text-[9px] border border-amber-200 text-amber-700">
                          {value === 'guest' ? '嘉宾' : value === 'partner' ? '合作伙伴' : value === 'part-time' ? '纯兼职' : value}
                        </span>
                      ))}
                      {p.contentTag && <span className="px-1.5 py-0.5 rounded-full bg-white text-[9px] border border-amber-200 text-amber-700">{p.contentTag}</span>}
                      {p.stageTag && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-teal-500 text-white text-[9px] font-medium border-2 border-teal-500">
                          <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                          {p.stageTag}
                        </span>
                      )}
                      {acceptedSubmissionsFromString(p.acceptedSubmissions).map((v) => (
                        <span
                          key={v}
                          className="px-1.5 py-0.5 rounded-full bg-sky-50 text-[9px] border border-sky-200 text-sky-800"
                          title="接受的投递"
                        >
                          {acceptedSubmissionLabel(v)}
                        </span>
                      ))}
                    </div>
                    {(p.link || p.image) && (
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        {p.link && (
                          <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-700 underline break-all">
                            {p.link}
                          </a>
                        )}
                        {p.image && (
                          <img src={resolveImageUrl(p.image)} alt="" className="w-8 h-8 rounded object-cover border border-amber-200" />
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button type="button" onClick={() => openPeopleEdit(i)} className="p-1 rounded hover:bg-amber-100 text-amber-700" title="编辑">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setState((prev) => ({ ...prev, peopleNeeded: prev.peopleNeeded.filter((_, j) => j !== i) }))}
                      className="p-1 rounded hover:bg-red-100 text-red-500"
                      title="删除"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={peopleInput}
              onChange={(e) => setPeopleInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addPeople(peopleInput)
                }
              }}
              placeholder="Add who you're looking for..."
              className="flex-1 px-2 py-1 text-[11px] border border-gray-300 rounded-lg"
            />
            <button
              type="button"
              onClick={() => { void addPeople(peopleInput) }}
              className="px-2 py-1 text-[11px] rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 5. Role */}
        <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3">
          <label className="block text-[11px] font-medium text-gray-700 mb-1">你在这个项目的角色 <span className="text-amber-600">(必填)</span></label>
          <select
            value={state.initiatorRole ?? ''}
            onChange={(e) => setState((p) => ({ ...p, initiatorRole: e.target.value }))}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-400/40 bg-white"
          >
            {PROJECT_ROLE_OPTIONS.map((opt) => (
              <option key={opt.value || 'empty'} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 6. One sentence */}
        <div className="rounded-xl border border-sky-200 bg-sky-50/40 p-3">
          <label className="block text-[11px] font-medium text-gray-700 mb-1">一句话描述 <span className="text-gray-400">(选填)</span></label>
          <input
            type="text"
            value={state.oneSentenceDesc ?? ''}
            onChange={(e) => setState((p) => ({ ...p, oneSentenceDesc: e.target.value }))}
            placeholder="e.g. 用 AI 做产品，正在找 go-to-market 伙伴"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-400/40"
          />
        </div>

        {/* 7. Culture & Benefit */}
        <div className="rounded-xl border border-lime-200 bg-lime-50/40 p-3">
          <label className="block text-[11px] font-medium text-gray-700 mb-1">Culture & Benefit</label>
          <textarea
            value={state.cultureAndBenefit ?? ''}
            onChange={(e) => setState((p) => ({ ...p, cultureAndBenefit: e.target.value }))}
            placeholder="e.g. 扁平协作、远程友好、可署名/分成..."
            rows={2}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-400/40 resize-none"
          />
        </div>

        {/* 9. Detail */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
          <label className="block text-[11px] font-medium text-gray-700 mb-1">Detail</label>
          <textarea
            value={state.detail ?? ''}
            onChange={(e) => setState((p) => ({ ...p, detail: e.target.value }))}
            placeholder="Project description..."
            rows={4}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-400/40 resize-none"
          />
        </div>

        {/* 10. Links */}
        <div className="rounded-xl border border-blue-200 bg-blue-50/30 p-3">
          <label className="block text-[11px] font-medium text-gray-700 mb-1.5">Links</label>
          <div className="space-y-2 mb-2">
            {(state.references || []).map((r, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/50 px-2 py-1.5">
                {r.cover ? <img src={resolveImageUrl(r.cover)} alt="" className="w-8 h-8 rounded object-cover shrink-0" /> : null}
                <div className="flex-1 min-w-0">
                  <span className="text-[11px] font-medium truncate block">{r.title || r.url}</span>
                  <span className="text-[10px] text-gray-500 truncate block">{r.url}</span>
                </div>
                {r.stageTag && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-teal-100 text-teal-700 text-[9px] shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                    {r.stageTag}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => { setLinkEditDraft({ ...r }); setLinkEditIndex(i) }}
                  className="p-1 rounded hover:bg-teal-100 text-teal-600"
                >
                  <Pencil className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setState((prev) => ({ ...prev, references: prev.references?.filter((_, j) => j !== i) ?? [] }))}
                  className="p-1 rounded hover:bg-red-100 text-red-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="url"
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addLinkSimple()
                }
              }}
              placeholder="https://... (paste URL, click Add to fetch metadata)"
              className="flex-1 px-2 py-1 text-[11px] border border-gray-300 rounded-lg"
            />
            <button
              type="button"
              onClick={addLinkSimple}
              disabled={!linkInput.trim() || linkFetching}
              className="px-2 py-1 text-[11px] rounded-lg border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              {linkFetching ? '...' : 'Add'}
            </button>
          </div>
        </div>

        {/* 11. Picture */}
        <div className="rounded-xl border border-fuchsia-200 bg-fuchsia-50/30 p-3">
          <label className="block text-[11px] font-medium text-gray-700 mb-1">Picture</label>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-2 py-1.5 text-[11px] rounded-lg border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer">
              <Camera className="w-3.5 h-3.5" />
              {pictureUploading ? 'Uploading...' : 'Upload'}
              <input type="file" accept="image/*" className="hidden" onChange={handlePictureUpload} />
            </label>
            {state.image && (
              <div className="flex items-center gap-2">
                <img src={resolveImageUrl(state.image)} alt="" className="w-12 h-12 rounded object-cover border border-gray-200" />
                <button type="button" onClick={() => setState((p) => ({ ...p, image: '' }))} className="text-[10px] text-red-600 hover:underline">Remove</button>
              </div>
            )}
          </div>
        </div>

        {/* 12. Attachments */}
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/30 p-3">
          <label className="block text-[11px] font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
            <Paperclip className="w-3.5 h-3.5" />
            Attachments
          </label>
          <div className="space-y-2 mb-2">
            {(state.attachments ?? []).map((a, i) => (
              <div key={i} className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50/50 px-2.5 py-2">
                <div className="flex-1 min-w-0">
                  <a href={resolveImageUrl(a.url)} target="_blank" rel="noopener noreferrer" className="text-[11px] font-medium text-gray-800 hover:underline truncate block">{a.name}</a>
                  {a.stageTag && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-[9px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                    {a.stageTag}
                  </span>
                )}
                </div>
                <a href={resolveImageUrl(a.url)} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-gray-200 text-gray-500">
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  type="button"
                  onClick={() => setState((prev) => ({ ...prev, attachments: prev.attachments?.filter((_, j) => j !== i) ?? [] }))}
                  className="p-1 rounded hover:bg-red-100 text-red-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <label className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] rounded-lg border border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 cursor-pointer">
            {attachmentUploading ? 'Uploading...' : 'Add file'}
            <input type="file" className="hidden" onChange={handleAttachmentUpload} />
          </label>
        </div>
      </div>

      {/* Link edit modal */}
      {linkEditDraft && (
        <div className="fixed inset-0 z-[100] bg-white flex flex-col">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">编辑链接</h3>
            <button type="button" onClick={() => { setLinkEditDraft(null); setLinkEditIndex(null) }} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 space-y-4 flex-1">
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">封面 Cover</label>
              <input type="file" accept="image/*" className="hidden" id="link-edit-cover" onChange={handleLinkEditCoverUpload} />
              <label htmlFor="link-edit-cover" className="inline-flex flex-col items-center justify-center w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 hover:border-teal-400 cursor-pointer overflow-hidden bg-gray-50">
                {linkEditDraft.cover ? (
                  <img src={resolveImageUrl(linkEditDraft.cover)} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] text-gray-500 p-2 text-center">{linkEditCoverUploading ? '上传中...' : '点击上传'}</span>
                )}
              </label>
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">标题 Title</label>
              <input
                type="text"
                value={linkEditDraft.title}
                onChange={(e) => setLinkEditDraft((d) => (d ? { ...d, title: e.target.value } : null))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">详情 Description</label>
              <textarea
                value={linkEditDraft.description ?? ''}
                onChange={(e) => setLinkEditDraft((d) => (d ? { ...d, description: e.target.value } : null))}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">链接 URL</label>
              <input
                type="url"
                value={linkEditDraft.url}
                onChange={(e) => setLinkEditDraft((d) => (d ? { ...d, url: e.target.value } : null))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 block mb-1">进度 Stage</label>
              <select
                value={linkEditDraft.stageTag ?? ''}
                onChange={(e) => setLinkEditDraft((d) => (d ? { ...d, stageTag: e.target.value || undefined } : null))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
              >
                <option value="">—</option>
                {(state.stageOrder ?? []).map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
            <button type="button" onClick={() => { setLinkEditDraft(null); setLinkEditIndex(null) }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">取消</button>
            <button type="button" onClick={saveLinkEdit} disabled={!linkEditDraft.url?.trim()} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg disabled:opacity-50">保存</button>
          </div>
        </div>
      )}

      {/* Looking for item edit modal */}
      {peopleEditDraft && (
        <div className="fixed inset-0 z-[110] bg-black/40 flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg max-h-[min(90vh,720px)] my-auto rounded-xl bg-white shadow-xl border border-gray-200 flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="text-sm font-semibold text-gray-800">编辑 Looking for</h3>
              <button type="button" onClick={() => { setPeopleEditDraft(null); setPeopleEditIndex(null) }} className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto overscroll-y-contain min-h-0 flex-1">
              <div>
                <label className="block text-[11px] text-gray-600 mb-1">Text</label>
                <input
                  type="text"
                  value={peopleEditDraft.text}
                  onChange={(e) => setPeopleEditDraft((p) => (p ? { ...p, text: e.target.value } : p))}
                  className="w-full px-2.5 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-600 mb-1">Detail (optional)</label>
                <textarea
                  value={peopleEditDraft.detail ?? ''}
                  onChange={(e) => setPeopleEditDraft((p) => (p ? { ...p, detail: e.target.value } : p))}
                  rows={3}
                  placeholder="补充描述：你具体希望对方做什么、产出什么、时间要求等"
                  className="w-full px-2.5 py-2 text-sm border border-gray-300 rounded-lg resize-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-600 mb-1">
                  What benefit can you bring to them
                  <span className="text-amber-600 font-normal">（发布 Plaza 前必填）</span>
                </label>
                <textarea
                  value={state.whatYouCanBring ?? ''}
                  onChange={(e) => setState((p) => ({ ...p, whatYouCanBring: e.target.value }))}
                  rows={3}
                  placeholder="e.g. I can share relevant experience, provide resources, or contribute salary/funding to support the project..."
                  className="w-full px-2.5 py-2 text-sm border border-gray-300 rounded-lg resize-none"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  勾选「在 Plaza 上发布」前须填写；示例：资金/报酬、资源与经验、或你能提供的具体支持。
                </p>
              </div>

              <div>
                <label className="block text-[11px] text-gray-600 mb-1.5">
                  协作方式 <span className="text-amber-600 font-normal">（必填）</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="workMode"
                      checked={peopleEditDraft.workMode === 'remote'}
                      onChange={() => setPeopleEditDraft((p) => (p ? { ...p, workMode: 'remote' as const, location: undefined } : p))}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    远程 Remote
                  </label>
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] cursor-pointer transition-colors">
                    <input
                      type="radio"
                      name="workMode"
                      checked={peopleEditDraft.workMode === 'local'}
                      onChange={() => setPeopleEditDraft((p) => (p ? { ...p, workMode: 'local' as const } : p))}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    在地 Local
                  </label>
                </div>
                {peopleEditDraft.workMode !== 'local' && peopleEditDraft.workMode !== 'remote' ? (
                  <p className="mt-1 text-[10px] text-amber-600">请选择远程或在地</p>
                ) : null}
                {peopleEditDraft.workMode === 'local' && (
                  <>
                    <input
                      type="text"
                      value={peopleEditDraft.location ?? ''}
                      onChange={(e) => setPeopleEditDraft((p) => (p ? { ...p, location: e.target.value.trim() || undefined } : p))}
                      placeholder="在哪里（如：北京、上海）"
                      className={`mt-1.5 w-full px-2.5 py-2 text-sm rounded-lg border ${!(peopleEditDraft.location ?? '').trim() ? 'border-amber-400 bg-amber-50/50' : 'border-gray-300'}`}
                      required
                    />
                    <p className="mt-1 text-[10px] text-amber-600">选在地时须填写地点</p>
                  </>
                )}
              </div>
              <div>
                <label className="block text-[11px] text-gray-600 mb-1.5">
                  协作对象类型 <span className="text-amber-600 font-normal">（必填，至少一项）</span>
                  <span className="text-gray-400 font-normal">（可多选、可删，可点「AI 生成」）</span>
                </label>
                {(() => {
                  const COLLAB_OPTIONS = [
                    { value: 'partner', label: '合作伙伴' },
                    { value: 'guest', label: '嘉宾' },
                    { value: 'part-time', label: '纯兼职' },
                  ] as const
                  const list = collabIntentTagList(peopleEditDraft.collabIntent)
                  const toggle = (value: string) => {
                    const next = list.includes(value) ? list.filter((x) => x !== value) : [...list, value]
                    setPeopleEditDraft((p) => (p ? { ...p, collabIntent: next.length > 0 ? next.join(',') : undefined } : p))
                  }
                  return (
                    <>
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        {COLLAB_OPTIONS.map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => toggle(value)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                              list.includes(value) ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 bg-gray-50 text-gray-600 hover:bg-gray-100'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={async () => {
                            const text = (peopleEditDraft?.text || '').trim()
                            if (!text) return
                            setCollabIntentAiLoading(true)
                            try {
                              const res = await fetch('/api/analyze-collab-intent', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ peopleText: text, detail: peopleEditDraft?.detail }),
                              })
                              const data = await res.json().catch(() => ({}))
                              const v = typeof data?.collabIntent === 'string' ? data.collabIntent.trim() : ''
                              if (v && !list.includes(v)) {
                                setPeopleEditDraft((p) => (p ? { ...p, collabIntent: list.length > 0 ? [...list, v].join(',') : v } : p))
                              }
                            } finally {
                              setCollabIntentAiLoading(false)
                            }
                          }}
                          disabled={!peopleEditDraft?.text?.trim() || collabIntentAiLoading}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] border border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100 disabled:opacity-50"
                        >
                          {collabIntentAiLoading ? <span className="w-2.5 h-2.5 rounded-full border-2 border-violet-400 border-t-transparent animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
                          AI 生成
                        </button>
                      </div>
                      {list.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {list.map((value) => {
                            const label = COLLAB_OPTIONS.find((o) => o.value === value)?.label ?? value
                            return (
                              <span
                                key={value}
                                className="inline-flex items-center gap-0.5 pl-2 pr-1 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-teal-700 text-[10px]"
                              >
                                {label}
                                <button type="button" onClick={() => toggle(value)} className="p-0.5 rounded hover:bg-teal-200 text-teal-600" aria-label="删除">
                                  <X className="w-3 h-3" />
                                </button>
                              </span>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )
                })()}
              </div>

              {/* 发布到 Plaza：仅在「编辑 Looking for」弹窗内设置；须先填齐主表单与上方 benefit 等必填项 */}
              <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-2.5">
                <label
                  className={`flex items-center gap-3 ${plazaCheckboxDisabled ? 'cursor-not-allowed opacity-80' : 'cursor-pointer'}`}
                >
                  <input
                    type="checkbox"
                    checked={state.showOnPlaza === true}
                    disabled={plazaCheckboxDisabled}
                    onChange={(e) => {
                      if (plazaCheckboxDisabled && e.target.checked) return
                      if (e.target.checked && !plazaPrerequisitesOk) return
                      setState((p) => ({ ...p, showOnPlaza: e.target.checked }))
                    }}
                    className="w-4 h-4 rounded border-amber-300 text-teal-600 focus:ring-teal-500 disabled:opacity-60"
                  />
                  <span className="text-[11px] font-medium text-gray-800">在 Plaza 上发布此项目</span>
                </label>
                {!hasProfileAvatar ? (
                  <p className="text-[10px] text-amber-600 mt-1.5 ml-7">发布到 Plaza 需先完成个人资料必填项（如头像），请先在个人主页上传头像</p>
                ) : state.showOnPlaza === true ? (
                  <p className="text-[10px] text-gray-500 mt-1.5 ml-7">开启后，项目会出现在广场列表，便于他人发现与合作</p>
                ) : plazaBlockerLabels.length > 0 ? (
                  <p className="text-[10px] text-amber-700 mt-1.5 ml-7">
                    请先在本编辑页或主表单填写：{plazaBlockerLabels.join('、')}
                  </p>
                ) : (
                  <p className="text-[10px] text-gray-500 mt-1.5 ml-7">开启后，项目会出现在广场列表，便于他人发现与合作</p>
                )}
              </div>
              <p className="text-[10px] text-gray-500 -mt-1">
                「项目角色」「What this project provides」「项目类型」请在主编辑区填写后再勾选 Plaza。
              </p>

              <div className="rounded-lg border border-sky-100 bg-sky-50/50 p-2.5">
                <label className="block text-[11px] font-medium text-gray-800 mb-1">接受的投递</label>
                <p className="text-[10px] text-gray-500 mb-2">告诉对方可以用什么方式联系你；可多选。不选表示不限形式。</p>
                {(() => {
                  const list = acceptedSubmissionsFromString(peopleEditDraft.acceptedSubmissions)
                  const toggle = (value: string) => {
                    const had = list.includes(value)
                    const next = had ? list.filter((x) => x !== value) : [...list, value]
                    setPeopleEditDraft((p) =>
                      p
                        ? {
                            ...p,
                            acceptedSubmissions: next.length > 0 ? next.join(',') : undefined,
                            ...(value === 'questions' && had ? { recruiterQuestions: undefined } : {}),
                          }
                        : p
                    )
                  }
                  const wantsQuestions = list.includes('questions')
                  return (
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        {ACCEPTED_SUBMISSION_OPTIONS.map(({ value, label, desc }) => (
                          <button
                            key={value}
                            type="button"
                            title={desc}
                            onClick={() => toggle(value)}
                            className={`px-2.5 py-1 rounded-full text-[11px] font-medium border text-left max-w-full ${
                              list.includes(value)
                                ? 'border-sky-500 bg-sky-100 text-sky-900'
                                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      {list.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {list.map((value) => (
                            <span
                              key={value}
                              className="inline-flex items-center gap-0.5 pl-2 pr-1 py-0.5 rounded-full bg-sky-100 border border-sky-200 text-sky-900 text-[10px]"
                            >
                              {acceptedSubmissionLabel(value)}
                              <button type="button" onClick={() => toggle(value)} className="p-0.5 rounded hover:bg-sky-200 text-sky-700" aria-label="移除">
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                      {wantsQuestions ? (
                        <div className="pt-1 border-t border-sky-200/80">
                          <label className="block text-[11px] font-medium text-sky-900 mb-1">
                            想问对方的问题 <span className="text-amber-600 font-normal">（必填）</span>
                          </label>
                          <p className="text-[10px] text-gray-500 mb-1.5">每条一行更清晰；也可写一段说明希望对方回答什么。</p>
                          <textarea
                            value={peopleEditDraft.recruiterQuestions ?? ''}
                            onChange={(e) => setPeopleEditDraft((p) => (p ? { ...p, recruiterQuestions: e.target.value } : p))}
                            rows={4}
                            placeholder={'例如：\n1. 你过去做过哪些类似项目？\n2. 你每周可投入多少时间？\n3. 你希望的合作形式是？'}
                            className="w-full px-2.5 py-2 text-sm border border-sky-200 rounded-lg resize-y min-h-[88px] bg-white focus:ring-1 focus:ring-sky-400 focus:border-sky-400"
                          />
                        </div>
                      ) : null}
                    </div>
                  )
                })()}
              </div>

              <div>
                <label className="block text-[11px] text-gray-600 mb-1">Link (optional)</label>
                <input
                  type="url"
                  value={peopleEditDraft.link ?? ''}
                  onChange={(e) => setPeopleEditDraft((p) => (p ? { ...p, link: e.target.value } : p))}
                  placeholder="https://..."
                  className="w-full px-2.5 py-2 text-sm border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[11px] text-gray-600 mb-1">Image (optional)</label>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-2 py-1.5 text-[11px] rounded-lg border border-gray-300 bg-white hover:bg-gray-50 cursor-pointer">
                    <Camera className="w-3.5 h-3.5" />
                    {peopleImageUploading ? 'Uploading...' : 'Upload'}
                    <input type="file" accept="image/*" className="hidden" onChange={handlePeopleImageUpload} />
                  </label>
                  {peopleEditDraft.image && (
                    <>
                      <img src={resolveImageUrl(peopleEditDraft.image)} alt="" className="w-10 h-10 rounded object-cover border border-gray-200" />
                      <button type="button" onClick={() => setPeopleEditDraft((p) => (p ? { ...p, image: '' } : p))} className="text-[10px] text-red-600 hover:underline">
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>

            </div>
            <div className="px-4 py-3 border-t border-gray-100 flex justify-end gap-2 shrink-0 bg-white">
              <button type="button" onClick={() => { setPeopleEditDraft(null); setPeopleEditIndex(null) }} className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-50">
                Cancel
              </button>
              <button type="button" onClick={() => { void savePeopleEdit() }} className="px-3 py-1.5 rounded-lg bg-teal-600 text-white text-sm hover:bg-teal-700">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
