'use client'

import { ArrowLeft, Search, ChevronRight, X } from 'lucide-react'
import { ALL_SOCIAL_PLATFORMS } from '@/lib/socialPlatforms'
type Props = {
  isOpen: boolean
  onClose: () => void
  socialSearch: string
  setSocialSearch: (v: string) => void
  onSelectPlatform: (key: string) => void
}

export function ProfileAddSocialIconModal({ isOpen, onClose, socialSearch, setSocialSearch, onSelectPlatform }: Props) {
  if (!isOpen) return null

  const handleClose = () => {
    onClose()
    setSocialSearch('')
  }

  const q = socialSearch.trim().toLowerCase()
  const list = q ? ALL_SOCIAL_PLATFORMS.filter((p) => p.label.toLowerCase().includes(q)) : ALL_SOCIAL_PLATFORMS

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={handleClose}>
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center px-4 py-3 border-b border-gray-100">
          <button type="button" onClick={handleClose} className="p-2 -ml-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="flex-1 text-center text-lg font-semibold text-gray-900 -ml-10">Add social icon</h2>
          <button type="button" onClick={handleClose} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-100 rounded-xl">
            <Search className="w-4 h-4 text-gray-500 shrink-0" />
            <input
              type="text"
              placeholder="Search"
              value={socialSearch}
              onChange={(e) => setSocialSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-500 outline-none min-w-0"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0">
          {list.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-gray-500">No matching platforms</div>
          ) : (
            <ul>
              {list.map(({ key, label, Icon, iconImage }) => (
                <li key={key}>
                  <button
                    type="button"
                    onClick={() => onSelectPlatform(key)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0"
                  >
                    {iconImage ? (
                      <img src={iconImage} alt={label} className="w-8 h-8 object-contain shrink-0 rounded" />
                    ) : (
                      <span className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-gray-600" />
                      </span>
                    )}
                    <span className="flex-1 text-sm font-medium text-gray-900">{label}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}
