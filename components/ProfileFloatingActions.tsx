'use client'

import { Tag, Lightbulb, MessageSquare, HeartHandshake } from 'lucide-react'

type Props = {
  hasTags: boolean
  hasInsights: boolean
  hasMessages: boolean
  hasPotentialConnections: boolean
  onOpenTags: () => void
  onOpenInsights: () => void
  onOpenMessages: () => void
  onOpenPotentialConnections: () => void
}

export function ProfileFloatingActions({
  hasTags,
  hasInsights,
  hasMessages,
  hasPotentialConnections,
  onOpenTags,
  onOpenInsights,
  onOpenMessages,
  onOpenPotentialConnections,
}: Props) {
  return (
    <div className="fixed top-20 right-4 z-40 flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => hasTags && onOpenTags()}
        disabled={!hasTags}
        title="Tags"
        className="w-9 h-9 rounded-full bg-white/95 shadow-md border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-teal-50 hover:text-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Tag className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => hasInsights && onOpenInsights()}
        disabled={!hasInsights}
        title="Insights"
        className="w-9 h-9 rounded-full bg-white/95 shadow-md border border-gray-200 flex items-center justify-center text-amber-600 hover:bg-amber-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <Lightbulb className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => hasMessages && onOpenMessages()}
        title="Messages"
        disabled={!hasMessages}
        className="w-9 h-9 rounded-full bg-white/95 shadow-md border border-gray-200 flex items-center justify-center text-sky-600 hover:bg-sky-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <MessageSquare className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => hasPotentialConnections && onOpenPotentialConnections()}
        title="Potential connections"
        disabled={!hasPotentialConnections}
        className="w-9 h-9 rounded-full bg-white/95 shadow-md border border-gray-200 flex items-center justify-center text-violet-500 hover:bg-violet-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <HeartHandshake className="w-4 h-4" />
      </button>
    </div>
  )
}

