'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { signIn, useSession } from 'next-auth/react'
import { ArrowRight, Loader2, Check, ExternalLink, LayoutGrid } from 'lucide-react'
import { CardData } from '@/components/ProjectCard'
import ShareToAccess from '@/components/ShareToAccess'

function parseCardDraft(): CardData | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem('cardDraft')
    if (!raw) return null
    return JSON.parse(raw) as CardData
  } catch {
    return null
  }
}

export default function ProjectNewPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const [cardData, setCardData] = useState<CardData | null>(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [showShareVerify, setShowShareVerify] = useState(false)
  const hasRedirectedRef = { current: false }

  const needShare = searchParams.get('needShare') === '1'

  useEffect(() => {
    const data = parseCardDraft()
    if (!data) {
      // 无卡片数据，引导去 /card
      return
    }
    setCardData(data)
    
    // 如果从 card 页面带有 needShare 参数且用户已登录，显示分享验证
    if (needShare && status === 'authenticated') {
      setShowShareVerify(true)
    }
  }, [needShare, status])

  const handleGoogleSignIn = async () => {
    setError('')
    const cb = encodeURIComponent('/project-new' + (needShare ? '?needShare=1' : ''))
    await signIn('google', { callbackUrl: cb })
  }

  const handleCreateProject = async () => {
    if (!cardData) return
    setCreating(true)
    setError('')
    try {
      const res = await fetch('/api/project/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cardData.hook,
          detail: [cardData.who, cardData.collaborators, cardData.value, cardData.stage, cardData.needs, cardData.blocker, cardData.special]
            .filter(Boolean)
            .join('\n\n'),
          oneSentenceDesc: cardData.who,
          initiatorRole: 'initiator',
          attachments: cardData.attachmentUrl
            ? cardData.attachmentUrl
                .split('\n')
                .filter(Boolean)
                .map((url: string, i: number) => {
                  const hrefLine = (cardData.attachmentLinkHref || '').split('\n')[i]?.trim()
                  return {
                    url: hrefLine || url,
                    name: (cardData.attachmentCaption || '').split('\n')[i] || '',
                  }
                })
            : [],
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.createdAt) {
        setError(data?.error || '创建失败，请重试')
        return
      }
      sessionStorage.removeItem('cardDraft')
      router.push(`/u/${encodeURIComponent(data.userId)}/project/${data.createdAt}`)
    } catch {
      setError('网络错误，请重试')
    } finally {
      setCreating(false)
    }
  }

  const handleShareVerified = () => {
    setShowShareVerify(false)
    // 验证通过后直接创建项目
    void handleCreateProject()
  }

  // 加载中
  if (!cardData) {
    return (
      <div className="min-h-screen bg-[#0a0f14] text-white flex flex-col items-center justify-center gap-6">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        <div className="text-center">
          <p className="text-gray-300 font-medium mb-1">No card data found</p>
          <p className="text-sm text-gray-500 mb-4">Please create your card first.</p>
          <Link
            href="/card"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl text-sm transition-colors"
          >
            Go to Card Builder
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    )
  }

  const fields: { label: string; value?: string }[] = [
    { label: "I'm building", value: cardData.hook },
    { label: 'Name', value: cardData.who },
    { label: 'Collaborators', value: cardData.collaborators },
    { label: 'Value', value: cardData.value },
    { label: 'Stage', value: cardData.stage },
    { label: 'Need most', value: cardData.needs },
    { label: 'Blocker', value: cardData.blocker },
    { label: 'Standout', value: cardData.special },
  ]

  return (
    <div className="min-h-screen bg-[#0a0f14] text-white">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-white/10 bg-[#0a0f14]/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo-nexus.jpeg" alt="Nexus" className="h-9 sm:h-10 w-auto max-w-[200px] object-contain object-left" />
            </Link>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Link href="/profile" className="hover:text-white transition-colors">Portal</Link>
              <span>/</span>
              <span className="text-teal-400 font-medium">Project</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl font-bold text-white mb-2">Create Your Project</h1>
        <p className="text-gray-400 mb-8 text-sm">Review your card info and create your full project page.</p>

        {/* Card data preview */}
        <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden mb-8">
          <div className="px-5 py-4 border-b border-white/5 flex items-center gap-2">
            <Check className="w-4 h-4 text-teal-400 shrink-0" />
            <span className="text-sm font-semibold text-teal-300">From your card</span>
          </div>
          <div className="divide-y divide-white/5">
            {fields.map(({ label, value }) =>
              value ? (
                <div key={label} className="px-5 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1">{label}</p>
                  <p className="text-sm text-gray-200 leading-relaxed">{value}</p>
                </div>
              ) : null
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {status === 'loading' ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-teal-400" />
          </div>
        ) : status === 'authenticated' && session ? (
          <button
            type="button"
            onClick={() => void handleCreateProject()}
            disabled={creating}
            className="w-full py-4 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:opacity-60 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 text-base"
          >
            {creating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating project…
              </>
            ) : (
              <>
                <ExternalLink className="w-5 h-5" />
                创建正式项目
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-400 text-center">
              Sign in with Google to create your project page
            </p>
            <button
              type="button"
              onClick={() => void handleGoogleSignIn()}
              className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl shadow-sm bg-white hover:bg-gray-100 text-gray-800 border border-gray-300 font-semibold transition-colors"
            >
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-white/10">
          <Link href="/card" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors">
            <LayoutGrid className="w-4 h-4" />
            Back to card builder
          </Link>
        </div>
      </main>

      {/* Share Verification Modal */}
      {cardData && (
        <ShareToAccess
          isOpen={showShareVerify}
          onClose={() => setShowShareVerify(false)}
          onVerified={handleShareVerified}
          projectSentence={cardData.hook || ''}
          cardData={cardData}
        />
      )}
    </div>
  )
}
