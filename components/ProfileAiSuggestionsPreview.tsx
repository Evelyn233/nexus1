'use client'

import { Sparkles } from 'lucide-react'

type Props = {
  suggestions: string[]
  loading: boolean
}

export function ProfileAiSuggestionsPreview({ suggestions, loading }: Props) {
  if (!loading && suggestions.length === 0) {
    return null
  }

  return (
    <div className="flex flex-col w-full px-4 pt-2 pb-2 shrink-0 border-t border-amber-200/60 bg-amber-50/50">
      <p className="text-[11px] font-semibold text-amber-800 mb-1 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 shrink-0" />
        AI 提示：建议补充
      </p>
      {loading ? (
        <p className="text-[11px] text-amber-700">正在分析…</p>
      ) : (
        <ul className="text-[11px] text-amber-800 space-y-0.5 list-disc list-inside">
          {suggestions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

