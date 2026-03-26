'use client'

import Link from 'next/link'
import { X } from 'lucide-react'

type ProjectItem = { text: string; stage?: string; createdAt?: number; showOnPlaza?: boolean; visibility?: string }

type Props = {
  isOpen: boolean
  onClose: () => void
  projectsList: ProjectItem[]
  userId?: string | null
}

export function ProfileProjectsModal({ isOpen, onClose, projectsList, userId }: Props) {
  if (!isOpen) return null
  const visibleProjects = projectsList.filter((p) => p.showOnPlaza && p.visibility !== 'hidden')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 shrink-0">
          <h3 className="font-semibold text-gray-900">Project</h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-gray-500 hover:bg-gray-100" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="px-4 py-2 text-xs text-gray-500 border-b border-gray-100">已发布到 Plaza 的项目</p>
        <div className="flex-1 overflow-y-auto p-4">
          {visibleProjects.length === 0 ? (
            <p className="text-sm text-gray-500">暂无已发布项目。在 Activity 中将项目设为 Plaza 即可发布。</p>
          ) : (
            <ul className="space-y-2">
              {visibleProjects.map((proj, i) => (
                <li key={proj.createdAt ?? i}>
                  <Link
                    href={userId ? `/u/${userId}/project/${proj.createdAt ?? ''}` : '#'}
                    className="block p-3 rounded-lg border border-gray-200 hover:border-teal-300 hover:bg-teal-50/50 transition-colors"
                    onClick={onClose}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{proj.text}</span>
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-teal-100 text-teal-700 border border-teal-200">
                        {(proj.stage ?? '').trim() || 'Idea'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">点击查看项目详情</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
