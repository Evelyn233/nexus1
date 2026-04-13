'use client'

import { useState, useRef, useEffect, useCallback, Suspense, Fragment } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  ArrowRight, Sparkles, Check, AlertCircle, Loader2, Layers,
  Image, Link2, Paperclip, Plus, X, Upload, ImagePlus, Info,
} from 'lucide-react'
import ProjectCard, { CardData, CardActions } from '@/components/ProjectCard'
import ShareToAccess from '@/components/ShareToAccess'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  id: string
  question: string
  required: boolean
  placeholder: string
}

type Step = 'input' | 'questions' | 'card' | 'share'

type AttachmentKind = 'picture' | 'link' | 'attachment'

interface AttachmentEntry {
  id: string
  kind: AttachmentKind
  url: string        // data: URL (upload) 或外链地址；Link 模式下为输入框中的 URL（提交前）或同 linkHref
  describe: string   // 用户描述
  error: string
  /** Link：点击「获取预览」成功后为页面 URL */
  linkHref?: string
  linkCover?: string | null
  linkTitle?: string | null
  linkDescription?: string | null
  linkFetching?: boolean
  /** Link：用户点击 Submit 后才计入最终卡片 */
  linkSubmitted?: boolean
}

function emptyAttachment(): AttachmentEntry {
  return {
    id:
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2),
    kind: 'picture',
    url: '',
    describe: '',
    error: '',
  }
}

// ─── AttachmentItem: 可复用单元 ────────────────────────────────────────────────

interface AttachmentItemProps {
  entry: AttachmentEntry
  onChange: (updated: AttachmentEntry) => void
  onRemove: () => void
}

const ACCEPTED_IMAGE = 'image/*'
const MAX_SIZE = 4 * 1024 * 1024

function AttachmentItem({ entry, onChange, onRemove }: AttachmentItemProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

  const isDataUrl = (v: string) => v.startsWith('data:image')

  const applyUrl = (url: string, error = '') =>
    onChange({ ...entry, url, error })

  const processFile = (file: File | undefined | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      applyUrl('', 'Please choose an image file (PNG, JPG, WebP, GIF).')
      return
    }
    if (file.size > MAX_SIZE) {
      applyUrl('', 'Image must be 4 MB or smaller.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const r = reader.result
      if (typeof r === 'string') applyUrl(r, '')
    }
    reader.readAsDataURL(file)
  }

  const handleUrlChange = (value: string) => {
    if (isDataUrl(entry.url)) return
    const v = value.trim()
    if (entry.kind === 'link') {
      onChange({
        ...entry,
        url: v,
        linkHref: undefined,
        linkCover: undefined,
        linkTitle: undefined,
        linkDescription: undefined,
        linkSubmitted: false,
        error: '',
      })
      return
    }
    applyUrl(v, '')
  }

  // 自动抓取：URL 变化后延迟 800ms 触发（防误触），用 debounceRef 防止竞态
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevUrlRef = useRef<string>('')
  useEffect(() => {
    if (entry.kind !== 'link') return
    const v = entry.url.trim()
    if (!v || !/^https?:\/\//i.test(v)) return
    if (entry.linkHref && v === prevUrlRef.current) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    prevUrlRef.current = v
    debounceRef.current = setTimeout(async () => {
      onChange({ ...entry, linkFetching: true, error: '' })
      try {
        const res = await fetch('/api/link-metadata', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: v }),
        })
        const data = await res.json().catch(() => ({}))
        if (!res.ok) {
          onChange({
            ...entry,
            linkFetching: false,
            error: typeof data?.error === 'string' ? data.error : `Could not fetch (${res.status})`,
          })
          return
        }
        onChange({
          ...entry,
          linkFetching: false,
          linkHref: v,
          linkCover: data.cover ?? null,
          linkTitle: data.name ?? null,
          linkDescription: data.description ?? null,
          error: '',
        })
      } catch {
        onChange({ ...entry, linkFetching: false, error: 'Network error.' })
      }
    }, 800)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entry.url, entry.kind])

  const imgError = () => {
    if (isDataUrl(entry.url)) return
    if (entry.kind === 'link') return
    applyUrl(entry.url, 'Could not load this URL as an image. Check the link.')
  }

  return (
    <div
      className={`border rounded-2xl overflow-hidden transition-all duration-300 ${
        entry.kind === 'link' && entry.linkSubmitted
          ? 'border-teal-500/50 bg-[#0f2a26]/40'
          : 'border-white/10 bg-[#131c26]/50'
      }`}
    >
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${
        entry.kind === 'link' && entry.linkSubmitted
          ? 'border-teal-500/20'
          : 'border-white/5'
      }`}>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Attachment</span>
          {entry.kind === 'link' && entry.linkSubmitted && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 text-[10px] font-semibold">
              <Check className="w-3 h-3" />
              已确认
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onRemove}
          className="text-gray-500 hover:text-red-400 transition-colors p-1 rounded-lg hover:bg-red-500/10"
          title="Remove this attachment"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Kind selector: Picture / Link / Attachment */}
        <div className="flex rounded-xl border border-white/10 overflow-hidden">
          {(['picture', 'link', 'attachment'] as AttachmentKind[]).map((k) => {
            const icons = { picture: Image, link: Link2, attachment: Paperclip }
            const labels = { picture: 'Picture', link: 'Link', attachment: 'Attachment' }
            const Icon = icons[k]
            const active = entry.kind === k
            return (
              <button
                key={k}
                type="button"
                onClick={() => {
                  if (entry.kind !== k) {
                    onChange({
                      ...entry,
                      kind: k,
                      url: '',
                      error: '',
                      linkHref: undefined,
                      linkCover: undefined,
                      linkTitle: undefined,
                      linkDescription: undefined,
                      linkFetching: false,
                      linkSubmitted: false,
                    })
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-teal-500/15 text-teal-300 border-r border-white/10 last:border-r-0'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5 border-r border-white/10 last:border-r-0'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                {labels[k]}
              </button>
            )
          })}
        </div>

        {/* ── Picture: upload ── */}
        {entry.kind === 'picture' && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE}
              className="hidden"
              onChange={(e) => {
                processFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                processFile(e.dataTransfer.files?.[0])
              }}
              className={`w-full rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors ${
                dragOver
                  ? 'border-teal-400 bg-teal-500/10'
                  : 'border-gray-600 bg-gray-800/30 hover:border-gray-500 hover:bg-gray-800/50'
              }`}
            >
              <Upload className="w-7 h-7 mx-auto text-gray-500 mb-2" />
              <p className="text-sm text-gray-200 font-medium">Drop image here</p>
              <p className="text-[11px] text-gray-500 mt-1">PNG, JPG, WebP, GIF · max 4 MB</p>
            </button>
          </>
        )}

        {/* ── Link: paste URL ── */}
        {entry.kind === 'link' && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-1.5">
              <Link2 className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <label className="text-xs text-gray-400">Paste URL</label>
            </div>
            <input
              type="url"
              value={entry.url}
              onChange={(e) => handleUrlChange(e.target.value)}
              placeholder="https://…"
              className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
            />
            {entry.linkFetching && (
              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                正在抓取页面信息…
              </p>
            )}
            {entry.linkHref && !entry.error && !entry.linkSubmitted ? (
              <p className="text-[11px] text-amber-400/90 flex items-center gap-1 leading-relaxed">
                <Info className="w-3.5 h-3.5 shrink-0" />
                预览已就绪 — 填写 Describe（可选）后点击下方 Submit，才会加入最终卡片。
              </p>
            ) : null}
            {entry.linkHref && !entry.error && entry.linkSubmitted ? (
              <p className="text-[11px] text-teal-400/90 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 shrink-0" />
                已加入卡片 — 生成预览时会包含此链接。
              </p>
            ) : null}
            {!entry.linkHref && !entry.linkFetching ? (
              <p className="text-[11px] text-gray-500 leading-relaxed">
                粘贴链接后自动抓取标题与封面（约 800ms），不会把网页当成图片直链加载。
              </p>
            ) : null}
          </div>
        )}

        {/* ── Attachment: mixed upload + optional URL ── */}
        {entry.kind === 'attachment' && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE}
              className="hidden"
              onChange={(e) => {
                processFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                processFile(e.dataTransfer.files?.[0])
              }}
              className={`w-full rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors ${
                dragOver
                  ? 'border-teal-400 bg-teal-500/10'
                  : 'border-gray-600 bg-gray-800/30 hover:border-gray-500 hover:bg-gray-800/50'
              }`}
            >
              <Paperclip className="w-7 h-7 mx-auto text-gray-500 mb-2" />
              <p className="text-sm text-gray-200 font-medium">Drop or click to upload</p>
              <p className="text-[11px] text-gray-500 mt-1">PNG, JPG, WebP, GIF · max 4 MB</p>
            </button>
            <div className="flex items-center gap-2 text-[11px] text-gray-500">
              <div className="flex-1 h-px bg-white/8" />
              <span>or paste a URL</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>
            <input
              type="url"
              value={isDataUrl(entry.url) ? '' : entry.url}
              onChange={(e) => handleUrlChange(e.target.value)}
              disabled={isDataUrl(entry.url)}
              placeholder={isDataUrl(entry.url) ? 'Remove image below to use a URL' : 'https://…'}
              className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </>
        )}

        {/* ── Describe ── */}
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">Describe</span>
            <span className="text-[10px] text-gray-600">(optional)</span>
          </div>
          <textarea
            value={entry.describe}
            onChange={(e) => onChange({ ...entry, describe: e.target.value })}
            placeholder="e.g. Early prototype demo, Dashboard overview…"
            rows={2}
            className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm resize-none"
          />
        </div>

        {/* ── Error ── */}
        {entry.error && (
          <p className="text-red-400 text-xs flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {entry.error}
          </p>
        )}

        {/* ── Preview：Link 用抓取结果；其它用图片 URL ── */}
        {entry.kind === 'link' && entry.linkHref && !entry.error && (
          <div className={`rounded-xl overflow-hidden transition-all duration-300 ${
            entry.linkSubmitted
              ? 'border border-teal-500/30 ring-1 ring-teal-500/20'
              : 'border border-white/10 bg-gray-900/50'
          }`}>
            {/* 已确认：左上角绿色标记 */}
            {entry.linkSubmitted && (
              <div className="relative">
                <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 rounded-full bg-teal-500 text-white text-[10px] font-bold shadow-lg">
                  <Check className="w-3 h-3" />
                  Added
                </div>
              </div>
            )}
            {entry.linkCover ? (
              <div className="relative">
                <img
                  src={entry.linkCover}
                  alt=""
                  className="w-full min-h-[120px] h-48 sm:h-56 max-h-[min(24rem,55vh)] object-cover"
                />
                {/* 确认后：半透明遮罩 + 对勾 */}
                {entry.linkSubmitted && (
                  <div className="absolute inset-0 bg-teal-500/20 flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-teal-500 flex items-center justify-center shadow-lg">
                      <Check className="w-7 h-7 text-white" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className={`px-4 py-4 space-y-2 ${entry.linkSubmitted ? 'bg-teal-500/5' : 'bg-gray-900/50'}`}>
                {entry.linkTitle ? (
                  <p className={`text-sm font-semibold leading-snug pr-16 ${entry.linkSubmitted ? 'text-teal-300' : 'text-white'}`}>
                    {entry.linkTitle}
                  </p>
                ) : (
                  <p className="text-gray-400 text-xs">No title from page — your description below still appears on the card.</p>
                )}
                {entry.linkDescription ? (
                  <p className="text-gray-400 text-xs line-clamp-4">{entry.linkDescription}</p>
                ) : null}
                <a
                  href={entry.linkHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-teal-400 text-xs font-medium hover:underline break-all"
                >
                  {entry.linkHref}
                </a>
              </div>
            )}
            {entry.describe ? (
              <p className="text-gray-300 text-xs px-3 py-2 border-t border-white/5">{entry.describe}</p>
            ) : null}
          </div>
        )}
        {entry.kind === 'link' && entry.linkHref && !entry.error && !entry.linkSubmitted && (
          <button
            type="button"
            onClick={() => onChange({ ...entry, linkSubmitted: true })}
            disabled={entry.linkFetching}
            className="w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-violet-900/25 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Submit — add link to card
          </button>
        )}
        {/* 已提交：显示确认卡片（不再显示 Submit 按钮） */}
        {entry.kind === 'link' && entry.linkSubmitted && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold">
            <Check className="w-4 h-4 shrink-0" />
            此链接已确认加入卡片 — 生成卡片时会显示为可点击预览卡。
          </div>
        )}
        {entry.kind !== 'link' && entry.url && !entry.error && (
          <div className="rounded-xl overflow-hidden border border-white/10 bg-gray-900/50">
            <img
              src={entry.url}
              alt="Preview"
              className="w-full min-h-[200px] h-56 sm:h-72 max-h-[min(24rem,55vh)] object-cover"
              onError={imgError}
            />
            {entry.describe ? (
              <p className="text-gray-300 text-xs px-3 py-2 border-t border-white/5">{entry.describe}</p>
            ) : null}
          </div>
        )}
        {/* 图片/附件类型：添加提交按钮 */}
        {entry.kind !== 'link' && entry.url && !entry.error && !entry.linkSubmitted && (
          <button
            type="button"
            onClick={() => onChange({ ...entry, linkSubmitted: true })}
            className="w-full py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg shadow-teal-900/25 flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            Submit — add image to card
          </button>
        )}
        {/* 已提交：显示确认信息 */}
        {entry.kind !== 'link' && entry.linkSubmitted && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-semibold">
            <Check className="w-4 h-4 shrink-0" />
            此图片已确认加入卡片 — 生成卡片时会显示。
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function CardPageContent() {
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()
  const searchParams = useSearchParams()
  const prefillSentence = searchParams.get('sentence') || ''
  const [step, setStep] = useState<Step>('input')
  const [projectSentence, setProjectSentence] = useState(prefillSentence)
  const [sentenceError, setSentenceError] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [questionsError, setQuestionsError] = useState('')
  const [formRequiredError, setFormRequiredError] = useState('')
  const [autoTriggered, setAutoTriggered] = useState(false)
  const cardPreviewRef = useRef<HTMLDivElement>(null)

  const [attachments, setAttachments] = useState<AttachmentEntry[]>([])

  const updateAttachment = (id: string, updated: AttachmentEntry) =>
    setAttachments((prev) => prev.map((a) => (a.id === id ? updated : a)))

  /** 至少保留一张空卡；删光时自动补回 */
  const removeAttachment = (id: string) =>
    setAttachments((prev) => {
      const next = prev.filter((a) => a.id !== id)
      return next.length === 0 ? [emptyAttachment()] : next
    })

  const addAttachment = () => setAttachments((prev) => [...prev, emptyAttachment()])

  /** 进入第二步时默认展开第一张附件卡，无需先点「添加」 */
  useEffect(() => {
    if (step !== 'questions') return
    setAttachments((prev) => (prev.length === 0 ? [emptyAttachment()] : prev))
  }, [step])

  /** 有预填时：自动触发 AI 追问 */
  useEffect(() => {
    if (!prefillSentence || autoTriggered) return
    if (projectSentence !== prefillSentence) return
    const timer = setTimeout(() => {
      setAutoTriggered(true)
      void handleStart()
    }, 500)
    return () => clearTimeout(timer)
  }, [prefillSentence, projectSentence])

  /** Step 1 → Step 2: 生成问卷 */
  const handleStart = async () => {
    const trimmed = projectSentence.trim()
    if (trimmed.length < 4) {
      setSentenceError('Please describe your project in a few sentences.')
      return
    }
    setSentenceError('')
    setLoadingQuestions(true)
    setQuestionsError('')
    try {
      const res = await fetch('/api/generate-card-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectSentence: trimmed }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !Array.isArray(data?.questions)) {
        setQuestionsError(data?.error || `Error (${res.status}). Please try again.`)
        return
      }
      setQuestions(data.questions as Question[])
      setStep('questions')
    } catch {
      setQuestionsError('Network error, please try again.')
    } finally {
      setLoadingQuestions(false)
    }
  }

  /** Step 2 → Step 3: 展示卡片 */
  const handleShowCard = () => {
    const whoAnswer = (answers['who'] || '').trim()
    if (!whoAnswer) {
      setFormRequiredError('Please fill in "What is your name?" — it\'s the top line on the card.')
      return
    }
    const collabAnswer = (answers['collaborators'] || '').trim()
    if (!collabAnswer) {
      setFormRequiredError(
        'Please describe what kind of collaborators you\'re looking for — that\'s the second most important field.'
      )
      return
    }
    setFormRequiredError('')
    setStep('card')
  }

  /** 仅包含有 URL 的附件；Link 须预览成功且用户已点 Submit */
  const attachedWithUrl = attachments.filter((a) => {
    if (a.kind === 'link') return !!(a.linkHref || '').trim() && a.linkSubmitted
    return !!(a.url || '').trim()
  })

  /** 构建卡片数据（含附件） */
  const cardData: CardData = {
    hook: projectSentence.trim(),
    who: answers['who']?.trim() || undefined,
    collaborators: answers['collaborators']?.trim() || undefined,
    value: answers['value']?.trim() || undefined,
    stage: answers['stage']?.trim() || undefined,
    needs: answers['needs']?.trim() || undefined,
    blocker: answers['blocker']?.trim() || undefined,
    special: answers['special']?.trim() || undefined,
    attachmentUrl: attachedWithUrl
      .map((a) => {
        if (a.kind === 'link' && a.linkHref) {
          // 只在有封面图时才传封面 URL；无封面则为空，让 AttachmentBlock 显示纯链接卡样式
          return (a.linkCover || '').trim()
        }
        return (a.url || '').trim()
      })
      .join('\n'),
    attachmentCaption: attachedWithUrl.map((a) => (a.describe || '').trim()).join('\n'),
    attachmentLinkHref: attachedWithUrl
      .map((a) => (a.kind === 'link' && a.linkHref ? a.linkHref.trim() : ''))
      .join('\n'),
    attachmentLinkTitle: attachedWithUrl
      .map((a) => (a.kind === 'link' && a.linkTitle ? (a.linkTitle || '').trim() : ''))
      .join('\n'),
  }

  /** 保存草稿：已登录 → 进入分享验证；未登录 → 注册后再继续 */
  const persistCardAndContinueToProject = useCallback(() => {
    try {
      sessionStorage.setItem('cardDraft', JSON.stringify(cardData))
    } catch {
      /* quota / private mode */
    }
    if (sessionStatus === 'loading') return
    if (session) {
      // 已登录用户：进入分享验证步骤
      setStep('share')
    } else {
      // 未登录用户：先注册
      const cb = encodeURIComponent('/project-new?needShare=1')
      router.push(`/auth/signup?callbackUrl=${cb}&type=project`)
    }
  }, [router, session, sessionStatus, cardData])

  /** 分享验证完成后 → 项目创建 */
  const handleShareVerified = useCallback(() => {
    router.push('/project-new')
  }, [router])

  return (
    <div className="min-h-screen bg-[#0a0f14] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0f14]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo-nexus.jpeg" alt="Nexus" className="h-9 sm:h-10 w-auto max-w-[200px] object-contain object-left" />
            </Link>
            <Link href="/profile" className="text-sm text-gray-400 hover:text-white transition-colors">
              My Profile
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* 顶部标题 */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-teal-500/10 border-2 border-teal-500/40 text-teal-300 text-sm font-semibold mb-8 max-w-[95vw]">
            <Layers className="w-5 h-5 shrink-0" />
            <span className="leading-snug">Project-Oriented Collaboration for Creators</span>
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]">
            <span className="text-teal-400">Build real projects.</span>
            <br />
            <span className="text-amber-400">Find the right collaborators.</span>
            <br />
            <span className="text-cyan-400">Ship faster.</span>
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
            A project-first profile system that helps you showcase real work, attract the right people, and move from idea to execution.
          </p>
        </div>

        {/* 进度指示器 */}
        <div className="flex items-center justify-center gap-2 mb-10">
          {(['input', 'questions', 'card', 'share'] as Step[]).map((s, idx) => {
            const labels = { input: 'Describe', questions: 'Details', card: 'Your Card', share: 'Share' }
            const done = ['input', 'questions', 'card', 'share'].indexOf(step) > idx
            const active = step === s
            return (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  done
                    ? 'bg-teal-500/20 text-teal-300'
                    : active
                    ? 'bg-violet-500/20 text-violet-300 ring-1 ring-violet-500/40'
                    : 'bg-white/5 text-gray-500'
                }`}>
                  {done ? <Check className="w-3 h-3" /> : <span className="w-3 h-3 inline-block text-center">{idx + 1}</span>}
                  {labels[s]}
                </div>
                {idx < 3 && <div className={`w-8 h-px ${done ? 'bg-teal-500/40' : 'bg-white/10'}`} />}
              </div>
            )
          })}
        </div>

        {/* ── STEP 1: 输入项目 ── */}
        {step === 'input' && (
          <div className="max-w-xl mx-auto">
            <div className="bg-gradient-to-br from-gray-900/80 to-gray-900/40 border border-white/10 rounded-3xl p-8 space-y-5">
              <div>
                <p className="text-sm text-gray-400 font-medium mb-1.5">Your project</p>
                <textarea
                  value={projectSentence}
                  onChange={(e) => {
                    setProjectSentence(e.target.value)
                    if (sentenceError) setSentenceError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void handleStart()
                  }}
                  placeholder="Describe your project in a few sentences — what you are building, what stage it is at, and what makes it interesting."
                  rows={5}
                  className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm resize-none leading-relaxed"
                />
              </div>

              {sentenceError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {sentenceError}
                </div>
              )}

              {questionsError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {questionsError}
                </div>
              )}

              <button
                onClick={handleStart}
                disabled={loadingQuestions}
                className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loadingQuestions ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating questions…
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Start Building My Card
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: 填写问卷 + 附件 ── */}
        {step === 'questions' && (
          <div className="max-w-2xl mx-auto">
            <form
              className="bg-gradient-to-br from-gray-900/80 to-gray-900/40 border border-white/10 rounded-3xl overflow-hidden"
              style={{ maxHeight: '85vh', overflowY: 'auto', scrollSnapType: 'y mandatory' }}
              onSubmit={(e) => {
                e.preventDefault()
                handleShowCard()
              }}
            >
              <div className="p-8 space-y-5" style={{ scrollSnapAlign: 'start' }}>
                <div className="mb-2">
                  <p className="text-xs text-gray-500 mb-1">Your project</p>
                  <p className="text-teal-300 font-semibold text-sm leading-snug">"{projectSentence.trim()}"</p>
                </div>

                <div className="border-t border-white/5 pt-5 space-y-4">
                  {questions.map((q) => (
                    <Fragment key={q.id}>
                      <div>
                        <label className="flex items-center gap-1.5 text-sm font-medium text-gray-200 mb-1.5">
                          <span className={q.required ? 'text-red-400' : 'text-gray-500'}>
                            {q.required ? '* ' : ''}
                          </span>
                          {q.question}
                        </label>
                        {q.id === 'who' ? (
                          <input
                            type="text"
                            value={answers[q.id] || ''}
                            onChange={(e) => {
                              setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                              if (q.id === 'who' || q.id === 'collaborators') setFormRequiredError('')
                            }}
                            placeholder={q.placeholder}
                            className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm"
                          />
                        ) : (
                          <textarea
                            value={answers[q.id] || ''}
                            onChange={(e) => {
                              setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                              if (q.id === 'collaborators') setFormRequiredError('')
                            }}
                            placeholder={q.placeholder}
                            rows={q.id === 'collaborators' ? 3 : 2}
                            className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-sm resize-none"
                          />
                        )}
                      </div>

                      {q.id === 'collaborators' && (
                        <div className="space-y-4 pt-4 mt-2 border-t border-white/10">
                          <div>
                            <div className="flex items-center gap-2">
                              <ImagePlus className="w-4 h-4 text-teal-400 shrink-0" />
                              <span className="text-xs text-gray-500 uppercase tracking-wider font-medium">
                                Image link or attachment
                              </span>
                              <span className="text-xs text-gray-600">(optional)</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">
                              Add visuals for your project. Choose Picture, Link, or Attachment — then describe each one. More than one? Use Add another below.
                            </p>
                          </div>

                          {attachments.map((a) => (
                            <AttachmentItem
                              key={a.id}
                              entry={a}
                              onChange={(updated) => updateAttachment(a.id, updated)}
                              onRemove={() => removeAttachment(a.id)}
                            />
                          ))}

                          <button
                            type="button"
                            onClick={addAttachment}
                            className="w-full py-2.5 border border-dashed border-gray-600 rounded-xl text-gray-500 hover:border-gray-500 hover:text-gray-300 transition-colors flex items-center justify-center gap-2 text-sm"
                          >
                            <Plus className="w-4 h-4" />
                            Add another attachment
                          </button>
                        </div>
                      )}
                    </Fragment>
                  ))}
                </div>

                {formRequiredError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    {formRequiredError}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 pt-2 sticky bottom-0 pb-1 -mb-1 bg-gradient-to-t from-gray-900 via-gray-900/95 to-transparent pt-4 -mx-2 px-2">
                  <button
                    type="button"
                    onClick={() => setStep('input')}
                    className="px-6 py-3 border border-gray-600 hover:border-gray-500 hover:bg-gray-800 text-gray-300 rounded-xl text-sm font-medium transition-colors sm:shrink-0"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3.5 sm:py-3 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 shadow-lg shadow-violet-900/30"
                  >
                    <span className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>提交并生成卡片</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </span>
                    <span className="text-xs font-semibold text-white/85 sm:ml-0">
                      Submit &amp; generate card
                    </span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* ── STEP 3: 卡片展示 ── */}
        {step === 'card' && (
          <div className="space-y-8">
            <div className="flex justify-center">
              <div className="w-full max-w-2xl px-2 sm:px-0" style={{ maxWidth: 'min(42rem, 96vw)' }}>
                <div className="rounded-2xl shadow-2xl shadow-violet-900/20 ring-1 ring-white/10 overflow-visible">
                  <div ref={cardPreviewRef}>
                    <ProjectCard
                      data={cardData}
                      draftEngagement={{ onAction: persistCardAndContinueToProject }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <p className="max-w-2xl mx-auto px-2 sm:px-0 text-[11px] text-gray-500 text-center mt-2">
              卡片底部与 Nexus 同一行的互动按钮会保存草稿：已登录则进入创建项目；未登录会先前往注册/登录，完成后再继续。
            </p>

            <div className="max-w-2xl mx-auto px-2 sm:px-0">
              <CardActions cardData={cardData} previewRef={cardPreviewRef} />
            </div>

            <div className="max-w-2xl mx-auto px-2 sm:px-0 text-center">
              <p className="text-sm text-gray-400 mb-3">
                Want to fully set up your project page?
              </p>
              <button
                type="button"
                onClick={persistCardAndContinueToProject}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white/10 border border-white/20 hover:bg-white/15 hover:border-white/30 text-white font-semibold rounded-xl transition-all text-sm"
              >
                进入我的项目
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="text-center pt-4 border-t border-white/5">
              <button
                onClick={() => {
                  setStep('input')
                  setProjectSentence('')
                  setAnswers({})
                  setQuestions([])
                  setFormRequiredError('')
                  setAttachments([])
                }}
                className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
              >
                ← Make another card
              </button>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .bg-gradient-to-br, .bg-gradient-to-r, .rounded-2xl, .rounded-3xl, .rounded-xl {
          animation: fadeIn 0.3s ease;
        }
      `}</style>

      {/* Share Verification Modal */}
      <ShareToAccess
        isOpen={step === 'share'}
        onClose={() => setStep('card')}
        onVerified={handleShareVerified}
        projectSentence={projectSentence}
        cardData={cardData}
      />
    </div>
  )
}

export default function CardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0a0f14]" />}>
      <CardPageContent />
    </Suspense>
  )
}
