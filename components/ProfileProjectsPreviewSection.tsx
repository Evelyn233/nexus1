'use client'

import Link from 'next/link'
import { LayoutGrid, UserPlus } from 'lucide-react'

type Props = {
  userInfo: any
  projectsList: any[]
  getSharePath: (...args: any[]) => string
  stageDisplayLabel: (stage: any) => string
  handleCreateProjectAndGo: () => void
  creatingProjectFromProfile: boolean
}

export function ProfileProjectsPreviewSection({
  userInfo,
  projectsList,
  getSharePath,
  stageDisplayLabel,
  handleCreateProjectAndGo,
  creatingProjectFromProfile,
}: Props) {
  return (
    <div className="flex flex-col w-full px-4 pt-2 pb-2 shrink-0 border-t border-white/50">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs text-gray-500">Projects (and who you&apos;re looking for)</p>
        <button
          type="button"
          onClick={handleCreateProjectAndGo}
          disabled={creatingProjectFromProfile || !userInfo?.id}
          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-teal-600 text-white text-[11px] font-medium hover:bg-teal-700 disabled:opacity-60 disabled:cursor-not-allowed"
          title="Create a new project and go to the project editor"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          {creatingProjectFromProfile ? '创建中…' : '创建项目'}
        </button>
      </div>

      {projectsList.length === 0 ? (
        <div className="rounded-lg border border-white/80 bg-white/90 p-3 text-[11px] text-gray-600">
          暂无项目。点击右上角「创建项目」去 Project 页面编辑。
        </div>
      ) : (
        <ul className="space-y-2">
          {projectsList.map((proj, i) => {
            const lookingForTags = Array.isArray(proj?.peopleNeeded)
              ? proj.peopleNeeded
                  .map((p: any) => (typeof p?.contentTag === 'string' && p.contentTag.trim() ? p.contentTag.trim() : (typeof p?.text === 'string' ? p.text.trim() : '')))
                  .filter(Boolean)
              : []
            const uniqueLookingForTags: string[] = Array.from(new Set(lookingForTags)).slice(0, 3) as string[]
            const typeTags: string[] = Array.isArray(proj?.projectTypeTags)
              ? proj.projectTypeTags.filter((t: unknown): boolean => typeof t === 'string' && !!t.trim()).map((t: string) => t.trim())
              : (typeof proj?.projectTypeTag === 'string' && proj.projectTypeTag.trim() ? [proj.projectTypeTag.trim()] : [])

            return (
              <li key={proj?.createdAt ?? i}>
                <Link
                  href={`/u/${getSharePath(userInfo?.profileSlug, userInfo?.name, userInfo?.id ?? '')}/project/${proj?.createdAt ?? ''}`}
                  className="flex items-start justify-between gap-2 rounded-lg border border-white/80 bg-white/90 px-3 py-2 hover:bg-white transition-colors"
                  title="Go to project editor"
                >
                  <div className="min-w-0 flex-1">
                    <span className="truncate block text-[11px] font-medium text-gray-800">
                      {(proj?.text ?? 'Untitled').toString()}
                    </span>
                    {typeTags.length > 0 ? (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {typeTags.slice(0, 3).map((t, idx) => (
                          <span key={`tt-${t}-${idx}`} className="inline-flex items-center px-1.5 py-0.5 rounded-full border border-violet-200 bg-violet-50 text-violet-700 text-[9px] font-medium">
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {uniqueLookingForTags.length > 0 ? (
                      <div className="mt-2 pt-1.5 border-t border-dashed border-amber-200/80">
                        <p className="flex items-center gap-1 text-[9px] font-semibold text-amber-900 mb-1">
                          <UserPlus className="w-3 h-3 shrink-0 text-amber-600" aria-hidden />
                          <span>在招人 · Looking for</span>
                        </p>
                        <div className="flex flex-wrap gap-1">
                          {uniqueLookingForTags.map((t, idx) => (
                            <span
                              key={`lf-${t}-${idx}`}
                              className="inline-flex items-center px-1.5 py-0.5 rounded-full border border-amber-300 bg-amber-50 text-amber-900 text-[9px] font-medium"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-teal-500 bg-teal-500 text-white text-[9px] font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/95" />
                    {stageDisplayLabel(proj?.stage)}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

