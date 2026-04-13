'use client'

import { useState } from 'react'
import { Linkedin, MapPin, Building2, GraduationCap, Sparkles, X, Check, ExternalLink, Loader2 } from 'lucide-react'
import type { LinkedInProfileData } from '@/hooks/useProfileBasics'

type Props = {
  linkedinData: LinkedInProfileData | null
  linkedinImported: boolean
  onRefresh?: () => void
  onClear?: () => void
  onOpenImport?: () => void
}

export function LinkedInImportBanner({
  linkedinData,
  linkedinImported,
  onRefresh,
  onClear,
  onOpenImport,
}: Props) {
  const [isRefreshing, setIsRefreshing] = useState(false)

  if (!linkedinImported && !linkedinData) {
    return (
      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center shrink-0">
            <Linkedin className="w-6 h-6 text-cyan-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-1">Import from LinkedIn</h3>
            <p className="text-gray-600 text-sm mb-4">
              Automatically import your professional profile, skills, and experience from LinkedIn.
            </p>
            <button
              onClick={onOpenImport}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Import LinkedIn Profile
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (linkedinImported && linkedinData) {
    return (
      <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-2xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 bg-teal-100 rounded-xl flex items-center justify-center shrink-0 overflow-hidden">
            {linkedinData.photoUrl ? (
              <img
                src={linkedinData.photoUrl}
                alt={linkedinData.name || 'LinkedIn'}
                className="w-full h-full object-cover rounded-xl"
              />
            ) : (
              <Linkedin className="w-8 h-8 text-teal-600" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900">
                {linkedinData.name || 'LinkedIn Profile'}
              </h3>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full text-xs">
                <Check className="w-3 h-3" />
                Imported
              </span>
            </div>
            {linkedinData.headline && (
              <p className="text-gray-600 text-sm mb-2">{linkedinData.headline}</p>
            )}
            <div className="flex flex-wrap gap-3 text-sm text-gray-500">
              {linkedinData.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {linkedinData.location}
                </span>
              )}
              {linkedinData.company && (
                <span className="flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5" />
                  {linkedinData.company}
                </span>
              )}
              {linkedinData.education && (
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5" />
                  {linkedinData.education}
                </span>
              )}
              {linkedinData.linkedinUrl && (
                <a
                  href={linkedinData.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-cyan-600 hover:text-cyan-700"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View on LinkedIn
                </a>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={async () => {
                if (!onRefresh) return
                setIsRefreshing(true)
                try {
                  await onRefresh()
                } finally {
                  setIsRefreshing(false)
                }
              }}
              disabled={isRefreshing}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Refresh from LinkedIn"
            >
              {isRefreshing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onClear}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Remove LinkedIn data"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Skills */}
        {linkedinData.skills && linkedinData.skills.length > 0 && (
          <div className="mt-4 pt-4 border-t border-teal-200">
            <p className="text-xs text-gray-500 mb-2">Skills from LinkedIn:</p>
            <div className="flex flex-wrap gap-2">
              {linkedinData.skills.map((skill, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-white border border-teal-200 text-teal-700 rounded-full text-xs font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bio */}
        {linkedinData.bio && (
          <div className="mt-4 pt-4 border-t border-teal-200">
            <p className="text-xs text-gray-500 mb-1">Bio:</p>
            <p className="text-sm text-gray-700">{linkedinData.bio}</p>
          </div>
        )}
      </div>
    )
  }

  return null
}
