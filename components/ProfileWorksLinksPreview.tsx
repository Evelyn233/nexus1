'use client'

import { Trash2 } from 'lucide-react'
import { resolveImageUrl } from '@/lib/resolveImageUrl'

type WorkIntro = {
  id: string
  cover?: string
  name: string
  description?: string
  url?: string
  isPersonalWebsite?: boolean
}

type CustomLink = {
  title?: string
  url: string
}

type Props = {
  showLinksInPreview: boolean
  workIntroductions: WorkIntro[]
  customLinks: CustomLink[]
  onEditWork: (w: WorkIntro) => void
  onRemoveWork: (id: string) => void
  onRemoveCustomLink: (index: number) => void
}

export function ProfileWorksLinksPreview({
  showLinksInPreview,
  workIntroductions,
  customLinks,
  onEditWork,
  onRemoveWork,
  onRemoveCustomLink,
}: Props) {
  if (!showLinksInPreview) return null

  const hasWorks = workIntroductions.length > 0
  const hasLinks = customLinks.length > 0

  return (
    <div className="flex flex-col items-center w-full px-4 pt-2 pb-2 shrink-0 border-t border-white/50">
      <p className="text-xs text-gray-500 mb-1.5">Works · Links</p>
      {hasWorks && (
        <div className="w-full space-y-2 max-h-32 overflow-y-auto mb-2">
          {workIntroductions.map((w) => (
            <div
              key={w.id}
              role="button"
              tabIndex={0}
              onClick={() => onEditWork(w)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onEditWork(w)
                }
              }}
              className="flex gap-2 p-2 rounded-lg bg-white/90 border border-white/80 group relative cursor-pointer hover:bg-white/95 transition-colors"
            >
              {w.cover ? (
                <img src={resolveImageUrl(w.cover)} alt="" className="w-12 h-12 rounded object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded bg-gray-200 shrink-0 flex items-center justify-center text-gray-400 text-[10px]">
                  No cover
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-medium text-gray-800 truncate">{w.name}</p>
                {w.description && (
                  <p className="text-[10px] text-gray-600 line-clamp-2">{w.description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onRemoveWork(w.id)
                }}
                className="absolute top-1 right-1 p-0.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                aria-label="删除"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {hasLinks && (
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
                onClick={() => onRemoveCustomLink(i)}
                className="shrink-0 p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                aria-label="删除"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      {!hasWorks && !hasLinks && (
        <p className="text-[10px] text-gray-400 italic mt-1">
          右上角三点 → Links，输入链接自动抓取
        </p>
      )}
    </div>
  )
}

