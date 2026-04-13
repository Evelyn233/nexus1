'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import ImageCropModal, { blobToDataUrl } from '@/components/ImageCropModal'
import { Camera } from 'lucide-react'

export default function GetStartedPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status, update } = useSession()
  const [error, setError] = useState<string | null>(null)
  const retriedRef = useRef(false)
  const [avatarDataUrl, setAvatarDataUrl] = useState<string | null>(null)
  const [avatarCropImageSrc, setAvatarCropImageSrc] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  const initialNameFromUrl = (searchParams.get('name')?.trim() || '').replace(/\s+/g, ' ')
  const initialCreatorFromUrl = (searchParams.get('creator')?.trim() || '').replace(/\s+/g, ' ')
  const [projectName, setProjectName] = useState(() => {
    if (initialNameFromUrl) return initialNameFromUrl
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('pending_project_name') || ''
    }
    return ''
  })
  const [creatorDisplayName, setCreatorDisplayName] = useState(() => {
    if (initialCreatorFromUrl) return initialCreatorFromUrl
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('pending_creator_display') || ''
    }
    return ''
  })
  const [role, setRole] = useState('')
  const [whatToProvide, setWhatToProvide] = useState('')
  const [oneSentenceDesc, setOneSentenceDesc] = useState('')
  const [detail, setDetail] = useState('')
  const [projectTypeTag, setProjectTypeTag] = useState('')
  const [cultureAndBenefit, setCultureAndBenefit] = useState('')
  const [referenceUrl, setReferenceUrl] = useState('')
  const [peopleNeededText, setPeopleNeededText] = useState('')
  const [saving, setSaving] = useState(false)
  const [touched, setTouched] = useState<{ creator?: boolean; name?: boolean; role?: boolean; provide?: boolean }>({})
  const [step, setStep] = useState<'form' | 'tags'>('form')
  const [suggestedTags, setSuggestedTags] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState('')
  const [generatingTags, setGeneratingTags] = useState(false)
  const pendingRef = useRef<{ name: string; role: string; provide: string; oneSentence?: string; detail?: string; projectTypeTag?: string; cultureAndBenefit?: string; referenceUrl?: string; peopleNeeded?: { text: string }[] } | null>(null)

  useEffect(() => {
    // Restore from sessionStorage (survives OAuth)
    if (!projectName && typeof window !== 'undefined') {
      const saved = sessionStorage.getItem('pending_project_name')
      if (saved) setProjectName(saved)
    }
    if (!creatorDisplayName && typeof window !== 'undefined') {
      const savedC = sessionStorage.getItem('pending_creator_display')
      if (savedC) setCreatorDisplayName(savedC)
    }
    if (initialNameFromUrl) setProjectName(initialNameFromUrl)
    if (initialCreatorFromUrl) setCreatorDisplayName(initialCreatorFromUrl)
  }, [initialNameFromUrl, initialCreatorFromUrl])

  // Clean up sessionStorage after values are present
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (projectName) {
      sessionStorage.removeItem('pending_project_name')
      sessionStorage.removeItem('pending_project_slug')
    }
    if (creatorDisplayName) sessionStorage.removeItem('pending_creator_display')
  }, [projectName, creatorDisplayName])

  // 已登录且 URL 未带 creator：用资料里的展示名补全（不要用项目名当账号名）
  useEffect(() => {
    if (status !== 'authenticated' || creatorDisplayName.trim()) return
    fetch('/api/user/info', { credentials: 'include', cache: 'no-store' })
      .then((r) => r.json())
      .then((data) => {
        const n =
          (typeof data?.userInfo?.displayName === 'string' && data.userInfo.displayName.trim()) ||
          (typeof data?.userInfo?.name === 'string' && data.userInfo.name.trim()) ||
          ''
        if (n) setCreatorDisplayName(n)
      })
      .catch(() => {})
  }, [status, creatorDisplayName])

  // 确保已登录；若刚注册 cookie 未就绪，重试一次
  useEffect(() => {
    if (status === 'loading') return
    if (status === 'authenticated' && session?.user) return

    const linkSuffix = searchParams.get('linkSuffix')?.trim()
    if (linkSuffix && !retriedRef.current) {
      retriedRef.current = true
      update?.()
      return
    }

    // 仍未登录：直接去注册页，并带回当前 get-started 作为 callback
    const qs = searchParams.toString()
    const callbackUrl = `/get-started${qs ? `?${qs}` : ''}`
    router.replace(`/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  }, [status, session, searchParams, update, router])

  const type = searchParams.get('type') === 'project' ? 'project' : 'personal'
  const linkSuffix = searchParams.get('linkSuffix')?.trim() || ''

  const showValidationError = (field: 'creator' | 'name' | 'role' | 'provide') => {
    setTouched((prev) => ({ ...prev, [field]: true }))
  }

  const normalizeTag = (s: string) => s.trim().replace(/\s+/g, ' ').slice(0, 24)

  const generateTagsFromOnboarding = async (payload: { name: string; role: string; provide: string; oneSentence?: string }) => {
    const lines = [
      `Project: ${payload.name}`,
      `Role: ${payload.role}`,
      `Provides: ${payload.provide}`,
      payload.oneSentence ? `One sentence: ${payload.oneSentence}` : '',
    ].filter(Boolean)
    const text = lines.join('\n')
    const res = await fetch('/api/user/update-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ text }),
    })
    const json = await res.json().catch(() => ({}))
    const tags = Array.isArray(json.tags) ? json.tags : []
    return tags
      .filter((x: unknown): x is string => typeof x === 'string')
      .map(normalizeTag)
      .filter(Boolean)
      .slice(0, 12)
  }

  const toggleSelected = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
  }

  const addCustomTag = () => {
    const t = normalizeTag(customTag)
    if (!t) return
    setCustomTag('')
    setSuggestedTags((prev) => (prev.includes(t) ? prev : [t, ...prev]))
    setSelectedTags((prev) => (prev.includes(t) ? prev : [t, ...prev]))
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !file.type.startsWith('image/')) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = () => setAvatarCropImageSrc(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleAvatarCropConfirm = async (blob: Blob) => {
    setAvatarCropImageSrc(null)
    setAvatarUploading(true)
    try {
      const dataUrl = await blobToDataUrl(blob)
      const res = await fetch('/api/image/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData: dataUrl, filename: 'avatar.jpg' }),
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
      await fetch('/api/user/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          image: url,
          profileData: { avatarDataUrl: url },
        }),
      })
    } catch (err) {
      console.error('Avatar upload error:', err)
      alert('Upload failed, please try again')
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleContinueToProject = async () => {
    if (saving) return
    setError(null)
    const pending = pendingRef.current
    if (!pending) {
      setStep('form')
      setError('请先完成上一步')
      return
    }
    if (!linkSuffix) {
      setError('Missing link suffix')
      setStep('form')
      return
    }

    setSaving(true)
    try {
      // 保存标签选择（不再在编辑页自动生成；后续如需更新由用户主动 change）
      await fetch('/api/user/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          profileData: {
            tags: suggestedTags,
            selectedTags,
          },
        }),
      }).catch(() => null)

      // 创建项目
      const createRes = await fetch('/api/project/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: pending.name,
          initiatorRole: pending.role,
          whatToProvide: pending.provide,
          oneSentenceDesc: pending.oneSentence || undefined,
        }),
      })
      const createData = await createRes.json().catch(() => ({}))
      if (!createRes.ok || !createData?.ok) {
        setError(createData?.error || 'Create project failed')
        return
      }

      router.replace(`/u/${encodeURIComponent(linkSuffix)}/project/${createData.createdAt}`)
    } catch (e) {
      setError('Something went wrong')
    } finally {
      setSaving(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (saving) return
    setError(null)

    // 仅项目账号需要填写 get started 表单；个人账号直接去 profile
    if (type !== 'project') {
      router.replace('/profile?requireAvatar=1')
      return
    }

    const trimmedName = projectName.trim()
    const trimmedCreator = creatorDisplayName.trim()
    const trimmedProvide = whatToProvide.trim()
    const trimmedRole = role.trim()

    const missingCreator = !trimmedCreator
    const missingName = !trimmedName
    const missingRole = !trimmedRole
    const missingProvide = !trimmedProvide

    if (missingCreator || missingName || missingRole || missingProvide) {
      if (missingCreator) showValidationError('creator')
      if (missingName) showValidationError('name')
      if (missingRole) showValidationError('role')
      if (missingProvide) showValidationError('provide')
      setError('请先填写你的名字与项目必填信息')
      return
    }

    if (!linkSuffix) {
      setError('Missing link suffix')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: trimmedName,
        role: trimmedRole,
        provide: trimmedProvide,
        oneSentence: oneSentenceDesc.trim() || undefined,
        detail: detail.trim() || undefined,
        projectTypeTag: projectTypeTag.trim() || undefined,
        cultureAndBenefit: cultureAndBenefit.trim() || undefined,
        referenceUrl: referenceUrl.trim() || undefined,
        peopleNeeded: peopleNeededText.trim() ? [{ text: peopleNeededText.trim() }] : [],
      }
      pendingRef.current = payload

      // 1. 保存用户基本信息 + 标记为 project 账号
      const saveRes = await fetch('/api/user/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: trimmedCreator,
          profileSlug: linkSuffix,
          userType: 'project',
          profileData: {
            userType: 'project',
            publicDisplayName: trimmedCreator,
            lastProjectOnboarding: {
              name: trimmedName,
              initiatorRole: trimmedRole,
              whatToProvide: trimmedProvide,
              oneSentenceDesc: payload.oneSentence,
            },
          },
        }),
      })
      const saveData = await saveRes.json().catch(() => ({}))
      if (!saveRes.ok && saveData?.error) {
        if (saveRes.status === 409 || saveData.error === 'Username already taken') {
          const params = new URLSearchParams({ error: 'username_taken', linkSuffix })
          params.set('type', 'project')
          // Pass project name back so user sees it on landing page
          params.set('name', encodeURIComponent(trimmedName))
          router.replace(`/?${params.toString()}`)
          return
        }
        setError(saveData.error || '保存账号信息失败')
        return
      }

      // 2. 自动推荐标签，让用户选择/自定义；确认后再创建项目并跳转
      setGeneratingTags(true)
      const tags = await generateTagsFromOnboarding(payload).catch(() => [])
      setSuggestedTags(tags)
      setSelectedTags(tags.slice(0, 6))
      setStep('tags')
    } catch (e) {
      setError('Something went wrong')
    } finally {
      setSaving(false)
      setGeneratingTags(false)
    }
  }

  if (type !== 'project') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0f14] text-white p-4">
        <div className="w-full max-w-md rounded-2xl bg-[#05080c] border border-teal-500/40 shadow-xl p-6 space-y-5 text-center">
          <p className="text-teal-300 text-lg font-medium">Setting up your profile…</p>
          <p className="text-sm text-teal-200/70">上传一张图片作为头像，会显示为圆形。</p>

          <div className="flex flex-col items-center gap-4">
            <input
              id="get-started-avatar-input"
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handlePhotoUpload}
              disabled={avatarUploading}
            />
            {/* 点击圆形区域与下方按钮均可选图 */}
            <label
              htmlFor="get-started-avatar-input"
              className={`flex flex-col items-center cursor-pointer ${avatarUploading ? 'opacity-50 pointer-events-none' : ''}`}
            >
              {avatarDataUrl ? (
                <img
                  src={avatarDataUrl}
                  alt=""
                  className="w-24 h-24 rounded-full object-cover border-2 border-teal-500/60 shrink-0 hover:ring-2 hover:ring-teal-400/50 transition-shadow"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-teal-500/20 border-2 border-dashed border-teal-500/50 flex items-center justify-center shrink-0 hover:bg-teal-500/30 hover:border-teal-400 transition-colors">
                  <Camera className="w-10 h-10 text-teal-400/70" />
                </div>
              )}
              <span className="sr-only">{avatarDataUrl ? '更换头像' : '选择图片'}</span>
            </label>
            <label
              htmlFor="get-started-avatar-input"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-gray-900 text-sm font-medium cursor-pointer hover:bg-teal-500 disabled:opacity-50"
            >
              <Camera className="w-4 h-4" />
              {avatarDataUrl ? '更换头像' : '选择图片'}
            </label>
          </div>

          <button
            type="button"
            onClick={() => router.replace(avatarDataUrl ? '/profile' : '/profile?requireAvatar=1')}
            className="w-full mt-2 px-4 py-2.5 rounded-lg bg-teal-500 text-gray-900 text-sm font-medium hover:bg-teal-400"
          >
            Go to profile
          </button>
        </div>

        <ImageCropModal
          imageSrc={avatarCropImageSrc ?? ''}
          isOpen={!!avatarCropImageSrc}
          onClose={() => setAvatarCropImageSrc(null)}
          onConfirm={handleAvatarCropConfirm}
          circularAvatar
          title="裁剪头像"
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0f14] text-white px-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#05080c] border border-teal-500/40 shadow-xl p-6 space-y-5">
        <h1 className="text-2xl font-semibold text-teal-300 mb-1">Set up your project</h1>
        <p className="text-sm text-teal-200/70 mb-4">
          先把这个项目最重要的几项信息填好，我们会帮你创建项目主页并标记为项目账号。
        </p>

        {error && (
          <div className="text-xs text-red-300 bg-red-900/30 border border-red-500/60 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        {step === 'form' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-200 mb-1.5">
              你怎么称呼（账号展示名）Your display name <span className="text-amber-400">*</span>
            </label>
            <p className="text-[11px] text-teal-200/50 mb-1.5">
              与「项目名称」不同；会写入个人资料并用于 /u/ 链接对应的主人名称。
            </p>
            <input
              type="text"
              value={creatorDisplayName}
              onChange={(e) => setCreatorDisplayName(e.target.value)}
              onBlur={() => showValidationError('creator')}
              placeholder="例如：艺名、真实姓名或常用昵称"
              className={`w-full px-3 py-2 rounded-lg text-sm bg-[#02040a] border ${
                touched.creator && !creatorDisplayName.trim() ? 'border-red-400' : 'border-teal-500/50'
              } text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/60`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-200 mb-1.5">
              项目名称 Project name <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={() => showValidationError('name')}
              placeholder="例如：nexus93 documentary / podcast"
              className={`w-full px-3 py-2 rounded-lg text-sm bg-[#02040a] border ${
                touched.name && !projectName.trim() ? 'border-red-400' : 'border-teal-500/50'
              } text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/60`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-200 mb-1.5">
              What this project provides / 项目要提供什么 <span className="text-amber-400">*</span>
            </label>
            <textarea
              value={whatToProvide}
              onChange={(e) => setWhatToProvide(e.target.value)}
              onBlur={() => showValidationError('provide')}
              rows={3}
              placeholder="例如：纪录片系列内容、播客节目、AI 产品原型、研究报告、社区活动、线上课程…"
              className={`w-full px-3 py-2 rounded-lg text-sm bg-[#02040a] border ${
                touched.provide && !whatToProvide.trim() ? 'border-red-400' : 'border-teal-500/50'
              } text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/60 resize-none`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-200 mb-1.5">
              你在这个项目里的身份 / 角色 <span className="text-amber-400">*</span>
            </label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              onBlur={() => showValidationError('role')}
              placeholder="例如：发起人 / 制片人 / 主播 / 设计 / 开发 / go‑to‑market..."
              className={`w-full px-3 py-2 rounded-lg text-sm bg-[#02040a] border ${
                touched.role && !role.trim() ? 'border-red-400' : 'border-teal-500/50'
              } text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/60`}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-200 mb-1.5">
              一句话描述（选填）One‑sentence description
            </label>
            <input
              type="text"
              value={oneSentenceDesc}
              onChange={(e) => setOneSentenceDesc(e.target.value)}
              placeholder="例如：做一档长期访谈节目，记录 AI 时代的创作者"
              className="w-full px-3 py-2 rounded-lg text-sm bg-[#02040a] border border-teal-500/40 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/60"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="mt-3 w-full px-4 py-2.5 rounded-lg bg-teal-500 text-gray-900 text-sm font-semibold hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Creating project…' : 'Create project and continue'}
          </button>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-teal-500/30 bg-teal-500/5 p-4">
              <p className="text-sm text-teal-200/90 font-medium">推荐标签（可选/可改）</p>
              <p className="mt-1 text-xs text-gray-400">
                这些标签会显示在你的卡片上，后续在编辑页也可以手动 Change，但不会自动重新生成。
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(suggestedTags.length > 0 ? suggestedTags : ['creator', 'producer', 'designer', 'developer']).map((tag) => {
                  const selected = selectedTags.includes(tag)
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleSelected(tag)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                        selected ? 'bg-teal-500 text-gray-900 border-teal-400' : 'bg-[#02040a] text-gray-200 border-white/10 hover:border-teal-500/60'
                      }`}
                    >
                      {tag}
                    </button>
                  )
                })}
              </div>

              {suggestedTags.length === 0 && (
                <div className="mt-2 text-xs text-amber-200/80">
                  当前内容较少或生成失败，先用默认标签占位。你也可以先继续进项目页，之后再手动 Change。
                </div>
              )}

              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag() } }}
                  placeholder="自定义标签，例如：纪录片 / podcast / AI 产品"
                  className="flex-1 px-3 py-2 rounded-lg text-sm bg-[#02040a] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500/60"
                />
                <button
                  type="button"
                  onClick={addCustomTag}
                  className="px-4 py-2 rounded-lg bg-white/10 border border-white/10 text-sm font-semibold hover:bg-white/15"
                >
                  添加
                </button>
              </div>

              <div className="mt-3 text-xs text-gray-400">
                已选 <span className="text-teal-200 font-semibold">{selectedTags.length}</span> 个
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setStep('form')}
                className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-sm font-semibold hover:bg-white/10 transition-colors"
              >
                返回修改
              </button>
              <button
                type="button"
                disabled={saving || generatingTags}
                onClick={handleContinueToProject}
                className="flex-1 px-4 py-2.5 rounded-lg bg-teal-500 text-gray-900 text-sm font-semibold hover:bg-teal-400 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? 'Creating…' : generatingTags ? 'Generating…' : 'Continue'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
