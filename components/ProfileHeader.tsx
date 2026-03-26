'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MoreVertical, Tag, Lightbulb, LayoutGrid, LogOut } from 'lucide-react'

type Props = {
  tagsCount: number
  insightsCount: number
  onOpenTags: () => void
  onOpenInsights: () => void
  onLogout: () => void
}

export function ProfileHeader({
  tagsCount,
  insightsCount,
  onOpenTags,
  onOpenInsights,
  onLogout,
}: Props) {
  const router = useRouter()
  const [showTopLeftMenu, setShowTopLeftMenu] = useState(false)
  const topLeftMenuRef = useRef<HTMLDivElement | null>(null)

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

  const handleOpenTags = () => {
    setShowTopLeftMenu(false)
    if (tagsCount > 0) onOpenTags()
  }

  const handleOpenInsights = () => {
    setShowTopLeftMenu(false)
    if (insightsCount > 0) onOpenInsights()
  }

  return (
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
                  onClick={handleOpenTags}
                  disabled={tagsCount === 0}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <Tag className="w-4 h-4 text-teal-500 shrink-0" />
                  <span>{tagsCount > 0 ? `Tags (${tagsCount})` : 'Tags (none)'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenInsights}
                  disabled={insightsCount === 0}
                  className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>{insightsCount > 0 ? `Insights (${insightsCount})` : 'Insights (none)'}</span>
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
            type="button"
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
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 text-red-600 hover:text-red-700 transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span>Switch account</span>
        </button>
      </div>
    </div>
  )
}

